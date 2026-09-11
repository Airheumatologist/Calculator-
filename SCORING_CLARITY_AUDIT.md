# Scoring Clarity Audit — MedCalc Live

**Repo:** [Airheumatologist/Calculator-](https://github.com/Airheumatologist/Calculator-)  
**Date:** 2026-09-11  
**Scope:** all **1003** calculators in `src/data/calculators/*.ts`  
**Code changes in this commit:** none (audit only)  
**Companion catalog:** [`scripts/audit-clarity/SCORING_CLARITY_FINDINGS.json`](scripts/audit-clarity/SCORING_CLARITY_FINDINGS.json)

---

## 0. Read this first if you are the implementing agent

This is **not** a scoring-logic audit. Point values, `calculate()` branches, risk bands, and option `value`s are already verified. Do **not** “fix” math.

The product gap is **bedside scoring clarity**: a clinician should be able to **administer and score the item from the calculator UI** without a pocket card, MDCalc, or remembered protocol.

**User example (do this first):** NIH Stroke Scale LOC items currently say `0 — Both correct / 1 — One correct / 2 — Neither correct` and never state the questions (`month`, `age`) or commands (`open and close the eyes`, `grip and release the non-paretic hand`). Same class of failure appears in GCS, RACE, C-STAT, CIWA (options are literally `"0"`…`"7"`), Mini-Cog, PECARN, Braden, Barthel, and ~60 other P0 calculators.

Your job:

1. Open the official source listed under **Research** for that calculator.
2. Add **exam prompts, operational anchors, untestable rules, and cutoffs** using only existing schema fields.
3. Leave `calculate()`, option `value`s, `points` chips that match the math, and interpretation bands untouched.
4. Run the existing test suites. They must still pass with **zero new scoring findings**.

Machine-readable rows for every finding (including full `suggested_change` text) live in the JSON companion. This markdown is the contract + work plan + P0/P1/P2 index.

---

## 1. Method

- 25 parallel reviewers, non-overlapping module batches, shared contract.
- Coverage: **1003 / 1003** calculators (union of findings + already-clear + skipped formulas).
- Test applied: “Can I score a real patient using only `label` + `helpText` + `option.label` + `option.description` on screen?”
- Logic / PMID / missing-calculator issues were out of scope.

| Bucket | Count | Meaning |
|---|---:|---|
| **P0** | **67** | Cannot administer or distinguish grades without an external protocol card |
| **P1** | **286** | Scorable with effort, but a cutoff, time window, stem, or ordinal is too terse |
| **P2** | **52** | Polish (one-line helpText) |
| Already clear | 295 | Self-explanatory yes/no or already-anchored options |
| Skipped formulas | 303 | Lab math / conversions; no exam to clarify |
| **Findings total** | **405** | Unique calculator IDs |

### Patterns

| Pattern | n | Typical fix |
|---|---:|---|
| `exam-protocol-missing` | 98 | `helpText` = how to perform the item; `option.description` = official anchors |
| `undefined-yesno-cutoff` | 99 | Put the published threshold on the yes/no `label` or `helpText` |
| `abbreviated-stem` | 61 | Expand the question to the official wording (or copyright-safe paraphrase) |
| `vague-ordinal` | 49 | Replace Mild/Moderate/Severe with operational findings |
| `missing-time-window` | 28 | Add “in the last N hours/days/weeks” on the input |
| `numbered-scale-no-anchors` | 19 | Stop using `"0"`…`"7"`; put Sullivan/Braden/Collin anchors on each option |
| `other` | 44 | See the row |
| `missing-untestable` | 6 | Document UN/NT/intubated rules in helpText; **do not add a new scored value** unless the published scale already encodes one |
| `laterality` | 1 | State which side / which limb |

---

## 2. Gold example — NIHSS (do this calculator first)

**File:** [`src/data/calculators/gi-neuro-psych.ts`](src/data/calculators/gi-neuro-psych.ts) · id `nihss`

### Current (cannot score from the UI)

```ts
selectInput('locQ', '1b. LOC questions (0–2)', [
  { label: '0 — Both correct', value: 0 },
  { label: '1 — One correct', value: 1 },
  { label: '2 — Neither correct', value: 2 },
]),
selectInput('locC', '1c. LOC commands (0–2)', [
  { label: '0 — Both correct', value: 0 },
  { label: '1 — One correct', value: 1 },
  { label: '2 — Neither correct', value: 2 },
]),
```

A user still has to remember that 1b is **month + age** (not “where are you / who is the president”) and 1c is **open/close eyes + grip/release non-paretic hand**. Motor items omit the 10 s / 90° and 5 s / 30° holds. Untestable rules (intubated 1b = 1, aphasic 1b = 2, amputation = UN not 4) are invisible.

### Target (same values, scorable on-screen)

`selectInput` already accepts `helpText` (5th argument) and `option.description`. `CalculatorForm` already renders both.

```ts
selectInput(
  'locQ',
  '1b. LOC questions (0–2)',
  [
    { label: '0 — Both correct', value: 0, description: 'Month and age both correct on first attempt' },
    { label: '1 — One correct', value: 1, description: 'One correct, or intubated / severe dysarthria / language barrier' },
    { label: '2 — Neither correct', value: 2, description: 'Neither correct, or aphasic / stuporous with no comprehension' },
  ],
  0,
  'Ask: “What month is it?” and “How old are you?” Grade the first answer. Do not coach. Not date, place, or president.',
),
selectInput(
  'locC',
  '1c. LOC commands (0–2)',
  [
    { label: '0 — Both correct', value: 0, description: 'Both one-step commands performed' },
    { label: '1 — One correct', value: 1, description: 'One command performed (credit an unequivocal attempt limited by weakness)' },
    { label: '2 — Neither correct', value: 2, description: 'Neither command performed' },
  ],
  0,
  'Commands: (1) open and close the eyes; (2) grip and release the non-paretic hand. Substitute another one-step command if the hand is unusable. Do not coach.',
),
```

Repeat the same treatment for items 1a and 2–11 (full suggested wording is in the JSON row for `nihss` and in §9). **Do not add a numeric UN option** — NIH protocol records UN off-scale; adding a 4 for amputation would change the max and break tests.

**Research:** NINDS NIH Stroke Scale English instructions (current 508 PDF); Brott T et al. Stroke 1989 PMID 2749846.

**Sister P0s in the same failure class:** `c-stat`, `race-scale`, `gcs`, `pgcs`, `ciwa`.

---

## 3. Schema contract (only these fields)

Defined in [`src/types/calculator.ts`](src/types/calculator.ts), helpers in [`src/utils/helpers.ts`](src/utils/helpers.ts), rendered in [`src/components/CalculatorForm.tsx`](src/components/CalculatorForm.tsx).

| Field | Where it shows | How to set |
|---|---|---|
| `input.label` | Bold field title | 2nd arg of `yesNo` / `selectInput` / `numberInput` |
| `input.helpText` | `<small>` under the title | 4th arg of `yesNo`; 5th of `selectInput`; `opts.helpText` of `numberInput` |
| `option.label` | Bold option text | `{ label, value }` |
| `option.description` | `<small>` under the option | `{ label, value, description }` on **select** options only |
| `option.points` | `+N` chip | Leave alone unless it currently contradicts `calculate()` (out of scope) |
| `pearls?: string[]` | Calculator pearls panel | Short global reminders (untestable rules, copyright) |

**Do not** add new input types, modals, images, or scored options. **Do not** split one select into many if `calculate()` keys would change — unless the catalog row explicitly says a public-domain instrument is currently total-only and should become itemized **without changing the total** (`barthel-index` is the example; still keep 0–100).

Boolean `yesNo` options are only `Yes` / `No`. Put the definition on the **input label or helpText**, not on a new third option.

### In-repo examples to copy

| Calculator | Why it is already clearer |
|---|---|
| `cam-icu` | Feature 2 helpText names ASE letters `SAVEAHAART` and the >2-error rule |
| `apgar` | Options are operational (`Blue/pale`, `Acrocyanosis`, `Pink`) not `Mild/Moderate` |
| `gcs` (partial) | Labels exist (`Localizes pain`) — still P0 because stimulus method and VT/NT are missing |

---

## 4. Hard rules

1. **No math.** Do not change `calculate()`, risk thresholds, `value`s, or default values.
2. **No new scored inputs** unless a row explicitly says the published instrument is public-domain and currently total-only (`barthel-index`). Even then, the **total and bands stay identical**.
3. **Untestable ≠ a new number.** Document UN/NT/C/T in `helpText`. Do not encode amputation as 4 on NIHSS motor.
4. **Copyright.** MMSE, MoCA, Braden, BILAG-2004, SLEDAI-2K, PASI, and similar licensed instruments: **do not paste the official card** if that would reprint a copyrighted instrument. For those:
   - If already total-only (MMSE, MoCA): leave total-only; optional pearls “use the official form, enter the total.”
   - If already itemized with abbreviated stems (PHQ-9 / GAD-7): Pfizer allows free clinical use with citation — expand stems.
   - Braden / BILAG: add helpText “score from the official card” rather than inventing competing anchors. The JSON row says which path to take.
5. **Public-domain / free clinical use** (NIHSS, GCS, CIWA-Ar, Mini-Cog, SLUMS, PCL-5, Barthel, RACE, C-STAT, PECARN): **do** put the official prompts on screen.
6. **One calculator per commit is fine; one module per PR is better.** Do not drive-by refactors.
7. **Keep labels unique and short; put the protocol in `helpText` / `description`.** Option labels can stay `0 — Alert` if the description carries the NINDS sentence.

---

## 5. Implementation recipe (every calculator)

```text
for each finding row in scripts/audit-clarity/SCORING_CLARITY_FINDINGS.json:
  1. Open src/data/calculators/{file} and find id: '{id}'
  2. Open the Research source (PMID / official PDF / society page)
  3. Confirm suggested_change against the source. If the suggestion
     conflicts with the source, follow the source and note it in the PR.
  4. Edit only label / helpText / option.description / pearls.
  5. Do not touch calculate() or option.value.
  6. Mentally rescore a sample patient from the UI alone.
  7. npx vitest run — audit-scoring-auto and clinical-oracles must stay green.
```

**Acceptance test for a finished calculator:** a resident who has never memorized the scale can complete every item from the screen, including what to ask, how to examine, and what to do if the item is untestable.

---

## 6. Verification (required after edits)

```bash
npx vitest run
```

Must remain green:

- `tests/audit-scoring-auto.test.ts`
- `tests/audit-master-suite.test.ts`
- `tests/audit-deep-logic.test.ts`
- `tests/clinical-oracles.test.ts` (NIHSS oracles exist — totals must not move)
- `tests/form-validation.test.ts`

If you itemize a previously total-only public-domain score (`barthel-index`), add oracles that the **same total** is produced from item picks, and keep the old total-entry path only if the catalog says to.

Do **not** add UI snapshots as a substitute for reading the labels.

---

## 7. Work plan (recommended waves)

Do **Wave A** first — it is the user-requested NIHSS class.

### Wave A — Stroke / coma / bedside neuro exam (implement first)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `nihss` | NIH Stroke Scale (NIHSS) | `gi-neuro-psych.ts` | `loc`, `locQ`, `locC`, `gaze`, `visual`, `facial`, `armL`, `armR` | Clinician cannot administer NIHSS from the UI. Must recall month+age questions (not where/president), eyes+grip commands, 10 s/90° arm and 5 s/30° leg holds, NIHSS picture/word ca… | NINDS NIH Stroke Scale English instructions (NIH-Stroke-Scale_updatedFeb2024_508.pdf); Brott T et al. Stroke 1989 PMID … | option values, calculate() 15-item sum, max 42 |
| `c-stat` | C-STAT (Cincinnati Stroke Triage Assessment Tool) | `wave4-neuro-psych.ts` | `loc` | NIHSS 1b/1c-class failure: cannot score LOC without the two questions (age, month) and two commands (close eyes; open and close the hand / make a fist). Gaze lacks the cannot-cros… | Katz BS et al. Stroke. 2015 (CPSSS/C-STAT); AHA ASLS C-STAT checklist (age, month, close eyes, open/close hands) | 2+1+1 weights, ≥2 cutoff, keep coded OR (not AND) for the LOC item |
| `race-scale` | RACE Scale (Prehospital LVO) | `wave4-neuro-psych.ts` | `face`, `arm`, `leg`, `gaze`, `agnosia` | Cannot administer RACE from the UI. Official scoring needs smile/show teeth; arm 90° sitting or 45° supine scored by hold >10 s; each leg 30° supine scored by hold >5 s; gaze pres… | Pérez de la Ossa N et al. Stroke. 2014; racescale.org table; NJ/SC EMS RACE scoring cards | option values, cortical-branch logic by hemiparesis side, sum 0–9, cutoff ≥5 |
| `gcs` | Glasgow Coma Scale (GCS) | `critical-care.ts` | `eye`, `verbal`, `motor` | Cannot administer GCS from the UI: pain-stimulus method (fingernail-bed vs trapezius/supraorbital; localization = hand above clavicle), what oriented means, two-step motor command… | Teasdale & Jennett Lancet 1974; GCS 2014 relaunch (glasgowcomascale.org) stimulus method and NT/C/T coding | option values, calculate() E+V+M sum, max 15, risk bands ≤8 / 9–12 / 13–15 |
| `pgcs` | Pediatric GCS | `emergency-misc.ts` | `eye`, `verbal`, `motor` | Cannot administer pGCS from the UI: which column by age; pain-stimulus method; what oriented/obeys mean; infant motor 5 is withdraws-to-touch not localization; intubated VT; eyes … | Reilly PL et al. Childs Nerv Syst 1988 paediatric GCS; James/PALS-ATLS infant vs child table; Teasdale 2014 glasgowcoma… | option values 1–4 / 1–5 / 1–6, calculate() E+V+M sum, bands ≤8 / 9–12 / 13–15 |
| `ciwa` | CIWA-Ar (Alcohol Withdrawal) | `gi-neuro-psych.ts` | `nausea`, `tremor`, `sweats`, `anxiety`, `agitation`, `tactile`, `auditory`, `visual` | Cannot score without Sullivan 1989 or a pocket card. Official 0/1/4/7 (and all orientation ranks) have mandatory operational anchors and several items have required questions. Int… | Sullivan JT et al. Br J Addict 1989 PMID 2597811 (CIWA-Ar Appendix A); MDCalc CIWA-Ar | option values 0–7 (orientation 0–4), calculate() sum, max 67 |
| `mini-cog` | Mini-Cog | `missing-neuro-psych.ts` | `recall`, `clock` | Cannot administer Mini-Cog from the Inputs panel. Missing 3-word list, uncued recall after clock distractor, and required clock time. 'Poor spacing' as abnormal can over-call offi… | Borson S et al. J Am Geriatr Soc 2003 PMID 14511167; Mini-Cog.com (Soo Borson) instructions | option values 0–3 and 0/2, calculate() cutoff ≤2 positive, max 5 |
| `clock-draw` | Clock Drawing Score (0–5) | `wave2-neuro-psych.ts` | `score` | User cannot administer the test: Shulman CDT requires the command to put numbers in and set hands to 10 past 11. Score 3 is wrong 11:10 with preserved layout, not generic moderate… | Shulman KI Int J Geriatr Psychiatry 1993/2000 0–5 clock-drawing scoring; administration '10 past 11' | option values 0–5, calculate() bands (≤3 abnormal), max 5 |
| `brief-confusion` | bCAM Simplified (Brief Confusion Assessment) | `wave4-neuro-psych.ts` | `f1`, `f2`, `f3`, `f4` | Cannot administer bCAM from the UI. Official F2 is months backwards December to July (>1 error or cannot complete). F4 is four yes/no questions plus a two-step finger command (≥2 … | Han JH et al. Ann Emerg Med. 2013; Vanderbilt bCAM Training Manual / flowsheet 2015 (copyright Vanderbilt/HELP — keep t… | four yes/no keys, positive = F1 AND F2 AND (F3 OR F4) |
| `slums` | SLUMS Cognitive Score | `wave2-neuro-psych.ts` | `score` | SLUMS is free for clinical use (SLU/VA), not an MMSE/MoCA copyright wall. User still needs the protocol card (orientation, $100 story, 1-minute animals, 5-object recall, reverse d… | Tariq SH et al. Am J Geriatr Psychiatry 2006; official SLUMS examination PDF (Saint Louis University / VA) | 0–30 total, education-adjusted bands (HS+ 27–30 / 21–26 / ≤20; <HS 25–30 / 20–2… |
| `hoehn-yahr` | Hoehn and Yahr Stage | `wave2-neuro-psych.ts` | `stage` | Modified H&Y 2 vs 2.5 vs 3 is an exam maneuver (retropulsion/pull test). Without stance, warning, force of pull, step count, and catching a fall, a non-movement-disorder clinician… | Hoehn MM, Yahr MD. Neurology 1967; modified H&Y; MDS-UPDRS postural-instability pull-test method | stage values 0 / 1 / 1.5 / 2 / 2.5 / 3 / 4 / 5, calculate() bands |

### Wave B — Numbered / titled scales with no anchors

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `barthel-index` | Barthel ADL Index Total | `wave6-psych-sleep.ts` | `score` | Public-domain bedside ADL exam cannot be scored from the UI; clinician still needs the Mahoney/Collin card for feeding/bathing/grooming/dressing/bowels/bladder/toilet/transfers (0… | Mahoney FI, Barthel DW. Md State Med J. 1965 PMID 14258950; Collin C et al. Int Disabil Stud. 1988 (0–100 version) | Item weights, 0–100 range, interpretation bands 0–20 / 21–60 / 61–90 / 91–99 / … |
| `braden-scale` | Braden Scale for Predicting Pressure Sore Risk | `wave4-icu-vent.ts` | `sensory`, `moisture`, `activity`, `mobility`, `nutrition`, `friction` | Cannot assign 1 vs 2 vs 3 vs 4 without the official Braden card. Hidden anchors: sensory (unresponsive vs pain-only vs verbal but cannot always report discomfort); moisture (linen… | Bergstrom N, Braden BJ et al. 1987; official Braden Scale (Prevention Plus). Complete copyright permission if reprintin… | subscale values 1–4 (friction 1–3), total 6–23, risk bands ≤9 / 10–12 / 13–14 /… |
| `nursing-delirium` | Nursing Delirium Screening Scale (Nu-DESC) | `wave4-icu-vent.ts` | `disorientation`, `behavior`, `communication`, `illusion`, `psychomotor` | Cannot distinguish mild vs severe or what counts as a positive item without the Gaudreau card. Missing item stems (time/place/person; pulling tubes; incoherent speech; seeing/hear… | Gaudreau JD et al. J Pain Symptom Manage. 2005;29:368-375 Nu-DESC items | option values 0–2, five-item sum 0–10, positive cutoff ≥2 |
| `ham-a` | HAM-A Anxiety Score | `wave2-neuro-psych.ts` | `score` | HAM-A items are 0–4 on 14 named symptom clusters (anxious mood, tension, fears, insomnia, somatic muscular/sensory, CV, respiratory, GI, GU, autonomic, behavior at interview). A t… | Hamilton M. Br J Med Psychol 1959; standard HAM-A 14-item anchor reprints | 0–4 per item, 0–56 total, bands ≤17 / 18–24 / 25–30 / >30 |
| `ham-d` | HAM-D Depression Score | `wave2-neuro-psych.ts` | `score` | Original HAM-D (1960) is a clinician-rated anchored interview, not a Pearson form like MMSE. A total box cannot be scored at the bedside: items mix 0–4 and 0–2 with specific probe… | Hamilton M. J Neurol Neurosurg Psychiatry 1960; APA Handbook 17-item HDRS anchors. Confirm no third-party structured-in… | 17-item interpretation bands (≤7 / 8–13 / 14–18 / 19–22 / ≥23), version field a… |
| `ymrs` | Young Mania Rating Scale (YMRS) | `wave2-neuro-psych.ts` | `score` | YMRS cannot be scored from a total. Four items are 0–8 (irritability, speech, thought content, disruptive-aggressive) and seven are 0–4, each with operational anchors. User needs … | Young RC et al. Br J Psychiatry 1978 YMRS item anchors | 0–60 total, double-weight items, pragmatic bands ≤12 / 13–19 / 20–25 / ≥26 |
| `pcl5` | PCL-5 PTSD Checklist | `wave2-neuro-psych.ts` | `score` | PCL-5 is public domain (National Center for PTSD) — not a copyright-total-only exception. The 20 DSM-5 symptom stems and 0–4 labels are missing, so the patient cannot be scored fr… | NCPTSD PCL-5 (Blevins 2015; https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp). Public domain. | 0–4 item values, 0–80 total, provisional cutoff band ~31–33 |
| `isth-ssc-bat` | ISTH-SSC Bleeding Assessment Tool (14 domains) | `wave7-highuse.ts` | `epistaxis`, `cutaneous`, `minorWounds`, `oralCavity`, `gi`, `hematuria`, `toothExtraction`, `surgery` | Cannot administer ISTH-SSC BAT from the UI. Missing official frequency/duration, consultation-only, packing vs transfusion, dental/surgery % of procedures, menorrhagia pad/PBAC ru… | Rodeghiero F et al. JTH 2010 ISTH/SSC BAT (PMID 20626619); Elbatarny M et al. Haemophilia 2014 (PMID 25196510); ISTH SS… | option values 0–4, 14-domain sum, adult cutoffs ≥4 men / ≥6 women |
| `bode` | BODE Index (COPD) | `emergency-misc.ts` | `dyspnea` | Cannot assign mMRC 2 vs 3 vs 4 without the MRC grade card. '0–1' also hides that grades 0 and 1 are different questions collapsed only for BODE points. | Celli BR et al. NEJM 2004 BODE table; Fletcher/MRC dyspnea scale; GOLD mMRC wording | BMI/FEV1/6MWD cutoffs, dyspnea values 0–3, sum 0–10, quartile bands 0–2 / 3–4 /… |
| `bclc-hcc` | BCLC HCC Stage Helper | `wave2-oncology.ts` | `ps`, `liver` | PS 0 vs 1 vs 2 is the fork to BCLC 0/A/B vs C. Cannot assign ECOG from numbers alone (CIWA-style). Child-Pugh A/B/C is a 5-item score not shown. | Oken MM et al. Am J Clin Oncol. 1982 ECOG PS; Reig M et al. J Hepatol. 2022 BCLC update; Pugh Child-Turcotte-Pugh varia… | PS 0/1/2/3 values; Child A/B/C keys; tumor very_early/early/intermediate/advanc… |
| `essdai` | ESSDAI (Sjögren Activity) | `wave7-rheum-activity.ts` | `constitutional`, `lymphadenopathy`, `glandular`, `articular`, `cutaneous`, `pulmonary`, `renal`, `muscular` | Cannot assign low vs moderate vs high without Seror Table 3 (fever °C, node cm, 28-joint synovitis, CK×ULN, cytopenia bins, IgG, DLCO/FVC, proteinuria). CIWA-style ordinals. | Seror R et al. Ann Rheum Dis. 2010;69:1103 Table 3; Seror 2015 ESSDAI/ESSPRI user guide | domain weights, maxLevel 2 vs 3, level×weight sum 0–123, bands <5 / 5–13 / ≥14;… |
| `frailty-clinical` | Clinical Frailty Scale (CFS) | `wave6-scores-residual.ts` | `cfs` | Cannot distinguish CFS 5/6/7/8/9 from titles alone (IADL help vs bathing/house vs complete dependence vs approaching death vs terminal <6 months without severe frailty). Two-week … | Rockwood CFS v2.0 (Rockwood & Theou Can Geriatr J 2020); Dalhousie GMR CFS card and Guidance on the Clinical Frailty Sc… | option values 1–9; calculate() score passthrough; CFS ≥5 frail note |
| `goese` | Glasgow Outcome Scale–Extended (GOS-E) | `wave2-ortho-trauma.ts` | `gose` | Cannot distinguish GOS-E 3 vs 4, 5 vs 6, or 7 vs 8 from the selector. Those splits are why the scale exists. Same pattern as CFS: descriptors appear only after scoring. | Wilson JT, Pettigrew LE, Teasdale GM. J Neurotrauma. 1998 PMID 9726257 structured GOS/GOS-E interview; TBI-IMSOP GOS-E … | option values 1–8, mapping to classic GOS in details, risk bands ≤2 / 3–4 / 5–6… |
| `waterlow-scale` | Waterlow Pressure Ulcer Risk Score | `wave4-icu-vent.ts` | `sexAge`, `build`, `neuro`, `skin` | Official Waterlow adds sex (M 1 / F 2) plus age (14–49:1 … 81+:5). A 70-year-old woman is 2+3=5; UI offers typical 3–4 as a single 4. Male/Female options omit age. Build lacks BMI… | Waterlow J. Nurs Times. 1985; official Waterlow score card (sex+age additive; BMI build; neuro 4–6) | ten-field sum, thresholds 10 / 15 / 20; do not split sex and age into new input… |
| `isth-dic` | ISTH Overt DIC Score | `missing-heme-id-nephro.ts` | `fibrin`, `pt` | Cannot choose moderate vs strong fibrin markers without a multiplier or example D-dimer. PT is seconds above mean normal, not INR. | Taylor FB et al. Thromb Haemost 2001; Toh/Hoots ISTH SSC 2007 overview; ISTH SSC 2025 D-dimer ×3 / ×7 ULN proposal | fibrin points 0/2/3 (not 0/1/2), platelet/PT/fibrinogen cutoffs, ≥5 overt thres… |

### Wave C — Pediatrics / OB exam tables

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `pecarn-head` | PECARN Head Injury (Simplified) | `emergency-misc.ts` | `gcs14`, `palpable`, `loc`, `nonfrontal`, `notActing` | Cannot apply PECARN from the UI. AMS, basilar signs, and severe mechanism are undefined; 'etc.' is a protocol-card tell. Age-specific predictors are OR-bundled so <2y and ≥2y list… | Kuppermann N et al. Lancet 2009;374:1160–1170 PECARN ciTBI rule (AMS and severe-mechanism footnotes) | keys, yes/no values, high-risk = gcs14 OR palpable → 2, age-specific intermedia… |
| `pediatric-ews` | Pediatric Early Warning Score (PEWS, simplified) | `missing-heme-id-nephro.ts` | `cv`, `resp`, `behavior` | Cannot apply +20/+30 from normal or RR vs normal without age-band vital tables. CRT method unstated. Sleeping=1 is a Monaghan rule people will skip. | Monaghan A. Paediatr Nurs 2005 Brighton PEWS; institutional Brighton age-band vital tables (do not invent a new PEWS) | 0–3 domain points, +2 oxygen item, calculate() sum, 0–2 / 3–4 / ≥5 bands |
| `new-ballard` | New Ballard Score (Gestational Age) | `wave3-peds-ob.ts` | `posture`, `squareWindow`, `armRecoil`, `popliteal`, `scarf`, `heelToEar`, `genitals`, `eyeEar` | A bedside examiner cannot administer the neuromuscular items or score genitals from the UI. Official New Ballard is pictorial and sex-specific: male scores use scrotum/testes/ruga… | Ballard JL et al. J Pediatr 1991; New Ballard Score sheet and neuromuscular monograph at ballardscore.com (scoresheet P… | calculate() domain sum, total-score mode, weeks interpolation table, option poi… |
| `pulmonary-score` | Pediatric Asthma Pulmonary Score | `wave5-peds-id.ts` | `ageBand`, `rr`, `accessory` | Cannot score RR without Smith 2002 age-specific table. Accessory mild/moderate/severe has no muscle or exam cue (official is SCM activity). | Smith SR et al. Acad Emerg Med 2002 The pulmonary score (PMID 11825832); Children's Mercy EBP table of Smith RR/wheeze/… | values 0–3, three-domain sum, mild 0–3 / moderate 4–6 / severe 7–9 |
| `biophysical-profile` | Biophysical Profile (BPP) | `wave6-em-peds.ts` | `nst`, `movement`, `afv` | Cannot call reactive vs nonreactive without Manning/ACOG acceleration rules (15×15 or 10×10). Movement observation window omitted. Adequate AFI is undefined. | Manning FA et al. AJOG 1980; ACOG antenatal testing (15×15 / 10×10 NST); standard BPP MVP >2 cm tables | 0/2 component points, NST −1 skip, /10 vs /8 logic, oligohydramnios override |
| `bedsides-pews` | Bedside PEWS (Pediatric Early Warning) | `wave3-peds-ob.ts` | `hr`, `rr`, `sbp`, `respEffort` | Bedside PEWS cannot be scored without the Parshuram age-band vital tables. 'Mildly/moderately/severely abnormal' has no operational cutoff; a 2-month-old HR of 160 is not the same… | Parshuram CS et al. Bedside PEWS appendix (Pediatr Child Health 2011 Appendix B; PMC3077313); original item table PMC27… | option values 0–3, calculate() sum, escalation bands 0–2 / 3–4 / 5–6 / ≥7 |
| `pas-asthma` | Pediatric Asthma Score (PAS) | `wave3-peds-ob.ts` | `rr` | Published PAS pathways score RR with age-specific breaths/min, not 'mildly/markedly elevated'. A bedside user cannot choose 1 vs 2 vs 3 without an external age table (common 2–3 y… | Kelly CS et al. Ann Allergy Asthma Immunol 2000; Children's Mercy PAS table; FPNotebook Pediatric Asthma Score | 1–3 item values, 5–15 total, mild ≤7 / moderate 8–11 / severe 12–15 bands |
| `exchange-transfusion-threshold` | Exchange Transfusion Threshold (Approximate) | `wave5-peds-id.ts` | `risk` | User cannot choose the band that drives the threshold without AAP 2022 neurotoxicity-risk factors and GA mapping. Phototherapy in the same file at least embeds GA in labels. | Kemper AR et al. Pediatrics 2022 AAP hyperbilirubinemia CPG (PMID 35927462) Table 2 and exchange figures 5–6 | threshold math, ABE lowering logic, option values low/med/high |

### Wave D — Remaining P0 (criteria worksheets, ultrasound lexicons, ICU tables)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `framingham-hf` | Framingham Heart Failure Criteria | `extra.ts` | `pnd`, `orthopnea`, `rales`, `cardiomegaly`, `edemaPulm`, `s3`, `jvd`, `weightLoss` | Cannot map a real exam to published Framingham items. PND is an unexplained abbreviation. Two checkboxes fuse distinct findings so the user cannot tell whether to tick for either … | McKee PA et al. N Engl J Med. 1971 PMID 5122894; Ho KK Framingham HF operational definitions (cardiomegaly on CXR, CVP … | the 8 major / 7 minor keys; meets = 2 major OR 1 major + 2 minor; option values |
| `basdai` | BASDAI (Ankylosing Spondylitis) | `wave4-heme-onc.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6` | BASDAI is a patient questionnaire. Cannot administer from 'Q1 Fatigue'. Missing last-week window; Q2 is neck/back/hip pain not generic spinal; Q3 is joints other than neck/back/hi… | Garrett S et al. J Rheumatol. 1994 PMID 7699630; NASS/RheumInfo BASDAI form (THE PAST WEEK) | 0–10 ranges, stiffness mean (Q5+Q6)/2, 0.2 weighting, ≥4 active-disease band |
| `saps-iii-simp` | SAPS 3 | `wave6-psych-sleep.ts` | `reason`, `infection`, `gcs`, `wbc`, `vent` | Box II cannot be scored without the official SAPS 3 sheet. Coma/delirium hides coma, stupor, obtunded, vigilance disturbance, confusion, agitation, delirium. Focal deficit not spe… | SAPS 3 Admission Score Sheet (saps3.org); Moreno RP et al. Intensive Care Med. 2005 PMID 16132893; Metnitz PG et al. PM… | Point values, 16-point offset, global logit, comorbidity max-of rule |
| `wells-dvt` | Wells Criteria for DVT | `cardiology.ts` | `calf`, `cancer`, `tenderness`, `bedridden` | The calf item is a tape-measure exam: official rule is ≥3 cm difference 10 cm below the tibial tuberosity. Active cancer in Wells is treatment ongoing, within 6 months, or palliat… | Wells PS et al. Lancet 1997; NEJM 2003 revised Wells DVT model (12-week anesthesia wording; 10 cm landmark) | +1 items, −2 alternative diagnosis, two-tier ≤0 vs ≥1 logic |
| `duke-criteria` | Modified Duke Criteria (IE Helper) | `extra.ts` | `bloodCx`, `echo`, `predisposing`, `vascular`, `immuno`, `microMinor` | Cannot apply modified Duke from the UI. Missing typical-organism list, persistently positive-culture timing, Coxiella/antiphase I IgG >1:800 as major, echo definitions (oscillatin… | Li JS et al. Clin Infect Dis. 2000 PMID 10770721 definitions of terms; AHA endocarditis modified-Duke table; MDCalc Mod… | yes/no values; major/minor counts; definite = 2 major OR 1 major+3 minor OR 5 m… |
| `jones-criteria` | Jones Criteria (Acute Rheumatic Fever) | `extra.ts` | `strep`, `carditis`, `arthritis`, `chorea`, `erythema`, `nodules`, `arthralgia`, `fever` | Jones 2015 cannot be administered from this checklist. Missing population-risk stratum (changes joint findings and fever/ESR cutoffs), subclinical echo carditis, moderate/high-ris… | Gewitz MH et al. Circulation. 2015 PMID 25908771 — confirm fever 38.5 vs 38.0 and ESR 60 vs 30 from the Circulation tab… | yes/no values; GAS gate in calculate(); initial-ARF rule 2 major or 1 major + 2… |
| `atlanta-pancreatitis` | Revised Atlanta Classification Helper | `missing-gi-liver.ts` | `organFailure` | Cannot decide whether organ failure is present without the modified Marshall card. Thresholds (PaO2/FiO2 <300, creatinine ≥1.9 mg/dL, SBP <90 not fluid-responsive) are not on scre… | Banks PA et al. Gut 2013 revised Atlanta; modified Marshall table in that paper; MDCalc Atlanta | option values; calculate() mapping persistent→severe, transient or local/system… |
| `euroscore-ii-simp` | EuroSCORE II | `wave2-cardiology.ts` | `critical`, `extracardiac`, `copd`, `endocarditis`, `poorMobility`, `nyha`, `ccs4`, `urgency` | Official EuroSCORE II variable definitions are not on the form. User cannot decide critical preoperative state, arteriopathy, COPD, urgency, or NYHA/CCS class without Nashef Table… | Nashef et al. Eur J Cardiothorac Surg 2012 EuroSCORE II definitions; euroscore.org / MDCalc EuroSCORE II footnotes | Logistic intercept and β values, age Xi coding, dialysis vs CrCl bands, VSD ori… |
| `icans-grade` | ASTCT ICANS Grade | `wave2-oncology.ts` | `ice` | Cannot administer ICE from the UI. Missing year/month/city/hospital orientation, 3-object naming, command examples, standard sentence, serial 7-equivalent (100 by 10). Untestable … | Lee DW et al. Biol Blood Marrow Transplant. 2019 ASTCT ICE tool and ICANS table (ICE 0 unarousable = grade 4) | ICE 10→0 / 7–9→1 / 3–6→2 / 0–2→3 banding; max() across domains; consciousness/s… |
| `clif-sofa` | CLIF-SOFA / CLIF-OF (Simplified Sum) | `wave3-gi-hep.ts` | `brain`, `resp` | Cannot assign West Haven grade from the UI (exam findings missing). SpO2/FiO2 CLIF-C OF equivalents are unnamed when no ABG. | EASL-CLIF CANONIC / Jalan CLIF-C OF table; West Haven criteria (AASLD/EASL HE); Moreau 2013 Gastroenterology | option values 1–3, failure if score ≥3, ACLF grade logic, liver/kidney/coag/cir… |
| `determinant-based` | Determinant-Based Pancreatitis Severity | `wave3-gi-hep.ts` | `organFailure`, `necrosis` | Cannot decide Marshall ≥2 without PaO2/FiO2, Cr, and SBP/fluid-responsiveness cutoffs. Infected necrosis is gas on imaging or positive FNA/drain culture. | Dellinger EP et al. Ann Surg 2012; Banks PA et al. Gut 2013 revised Atlanta modified Marshall table | mild/moderate/severe/critical mapping, 48-hour split, calculate() branches |
| `vexus` | VExUS Score (Venous Congestion) | `wave3-nephro-icu.ts` | `ivc`, `hepatic`, `portal`, `intrarenal` | Cannot acquire or grade VExUS from the UI: IVC site/phase, hepatic S vs D vs S reversal, portal pulsatility fraction (Vmax−Vmin)/Vmax, interlobar biphasic vs D-only monophasic. Gr… | Beaubien-Souligny W et al. Ultrasound J. 2020 PMID 32270297 IVC ≥2 cm gateway and organ-pattern table; Kidney Medicine … | IVC 0/1 gateway, hepatic/portal/intrarenal values 0–2, grade 0 if IVC<2 else 1/… |
| `serotonin-syndrome` | Hunter Serotonin Toxicity Criteria | `wave3-tox-endo-heme.ts` | `spontaneousClonus`, `inducibleClonus`, `ocularClonus`, `hyperreflexia`, `hypertonia`, `serotonergic` | Cannot administer Hunter from the UI. Inducible clonus needs brisk sustained ankle dorsiflexion; ocular clonus is slow continuous horizontal oscillations; hyperreflexia/clonus are… | Dunkley EJC et al. QJM 2003 Hunter criteria; Boyer/Shannon and UpToDate exam (ocular clonus; inducible ankle clonus tec… | yes/no keys, Hunter boolean tree, serotonergic-required gate, Positive/Negative… |
| `tirads` | ACR TI-RADS (Simplified Points) | `wave3-tox-endo-heme.ts` | `composition`, `echogenicity`, `shape`, `margin`, `foci` | Cannot assign TR points from ultrasound without the ACR lexicon. Missing: spongiform >50% tiny cysts; very hypoechoic = darker than strap muscle; taller-than-wide = AP>transverse … | Tessler FN et al. J Am Coll Radiol. 2017 ACR TI-RADS white paper lexicon and chart | point values, TR1–TR5 mapping, FNA/follow size cutoffs TR3≥2.5 / TR4≥1.5 / TR5≥… |
| `boston-syncope` | Boston Syncope Rule (Simplified) | `wave4-em-id.ts` | `acsSigns`, `conduction`, `historyCad`, `persistentAbnVitals`, `volume`, `familyHx` | Cannot score several Boston categories without the Grossman paper. Vital signs have no HR/SBP/RR thresholds; conduction and ACS items are unanchored; family sudden death has no fi… | Grossman SA et al. Boston Syncope Criteria (J Emerg Med / Ann Emerg Med 2007); MDCalc Boston Syncope Rule item notes | Any-positive admission logic, 8-category structure, calculate() sum |
| `stemi-equivalent` | STEMI Equivalent Patterns Checklist | `wave4-em-id.ts` | `sgarbossa`, `wellens`, `deWinter`, `posterior`, `hyperacute`, `lmain`, `rvMi` | User cannot decide positivity from the ECG without a criteria card. Worst is Sgarbossa/Smith-modified (concordant STE, concordant STD V1–V3, ST/S ratio). Wellens needs Type A/B, l… | Sgarbossa 1996 / Smith-modified Sgarbossa; de Winter NEJM 2008; Wellens T-wave criteria; AHA/ESC posterior-lead recomme… | Yes/no flags, hard-OMI grouping in calculate(), 9-item checklist |
| `delirium-icdsc` | Intensive Care Delirium Screening Checklist (ICDSC) | `wave4-icu-vent.ts` | `ams`, `inattention`, `disorientation`, `hallucination`, `psychomotor`, `speech`, `sleep`, `fluctuation` | Cannot administer ICDSC from the UI. Missing Bergeron A–E consciousness (coma/RASS −4/−5 = stop, do not score 1), inattention cues, sleep <4 h / frequent nocturnal waking / sleepi… | Bergeron N et al. Intensive Care Med. 2001;27:859-864; ICU ICDSC cards (LHSC/Skrobik) for A–E LOC and UTA | eight 0/1 keys, sum 0–8, positive ≥4, 1–3 subsyndromal band |
| `arvc-taskforce` | ARVC Task Force Criteria (Simplified Count) | `wave5-cardio.ts` | `imaging`, `tissue`, `repolarization`, `depolarization`, `arrhythmia`, `family` | User cannot decide minor vs major without the 2010 revised TFC worksheet (echo/CMR cutoffs, epsilon vs TAD, VT axis, >500 PVCs/24 h, which relative counts). Same protocol-card fai… | Marcus FI et al. Eur Heart J 2010 PMID 20172912 (2010 revised Task Force Criteria tables) | option values 0/1/2, definite/borderline/possible combination rules |
| `mases` | MASES (Enthesitis Score) | `wave5-general-misc.ts` | `total` | Clinician cannot administer MASES from the UI. The 13 named sites and 0/1 tenderness rule are not on the input; user still needs a protocol card. This is a bedside exam, not a cop… | Heuft-Dorenbosch L et al. Ann Rheum Dis. 2003 PMID 12525383; ASAS MASES site diagram; MDCalc MASES | 0–13 range, calculate() clamp, interpretation bands |
| `ses-cd` | SES-CD (Simple Endoscopic Score for Crohn Disease) | `wave5-nephro-gi.ts` | `total` | Cannot produce the total from the endoscopy without an external SES-CD card. Missing ulcer size in cm, % surface bands, and whether stenosis is passable. | Daperno M et al. Gastrointest Endosc 2004 PMID 15472670; MDCalc SES-CD item table | calculate() total interpretation bands 0–2 / 3–6 / 7–15 / ≥16, max 56 |
| `aap-score` | Adult Appendicitis Score (AAS) | `wave5-surg-uro-ent.ts` | `crp`, `guarding`, `rlqPain` | CRP cannot be scored from the UI. Official AAS uses different mg/L cutoffs for symptoms <24 h vs >24 h, including a high-CRP point drop. Guarding mild vs moderate-severe has no ex… | Sammalkorpi HE et al. BMC Gastroenterol. 2014;14:114 Table 2; BMJ Best Practice AAS criteria | interpretation cutoffs ≤10 / 11–15 / ≥16; do not 'fix' simplified sex/age −3 or… |
| `p-possum` | P-POSSUM Mortality (Simplified Educational) | `wave5-surg-uro-ent.ts` | `opMagnitude`, `cardiac`, `resp` | Cannot assign operative magnitude without the POSSUM procedure table. Cardiac 'Edema / warfarin' omits peripheral edema and cardiomegaly. Respiratory 'limiting dyspnea' omits the … | Copeland GP et al. Br J Surg 1991 POSSUM; Whiteley MS et al. Br J Surg 1996 P-POSSUM; JAMA Surgery POSSUM magnitude tab… | option values 1/2/4/8, partial-score logit, educational disclaimer |
| `ata-nodule` | ATA Thyroid Nodule Sonographic Pattern | `wave6-clinical-residual.ts` | `pattern` | Cannot assign ATA 2015 pattern from the UI: high vs intermediate vs low is defined by echogenicity plus suspicious features (irregular margins, microcalcifications, taller-than-wi… | Haugen BR et al. 2015 ATA thyroid nodule guidelines, Thyroid 2016, Table 6 / Recommendation 8 | option values benign…high, size cutoffs in calculate(), malignancy percent stri… |
| `jaam-dic` | JAAM DIC Criteria (Revised) | `wave6-heme-onc.ts` | `sirs` | JAAM awards 1 point for ≥3 of 4 SIRS criteria. The four items and cutoffs are not on the UI, so the user still needs a SIRS card. | Gando S et al. Crit Care Med 2006 (PMID 16521260); Bone 1992 SIRS consensus | platelet 0/1/3, PT ratio ≥1.2 = 1, FDP 0/1/3, DIC if total ≥4, fibrinogen omitt… |
| `sic-score` | SIC Score (Sepsis-Induced Coagulopathy) | `wave6-heme-onc.ts` | `sofa` | User cannot produce 0/1/≥2 without a SOFA card. Each allowed domain is a 0–4 table (PaO2/FiO2±vent, MAP/pressors, bilirubin, Cr or UO). CNS and coagulation are correctly excluded … | Iba T et al. JTH 2019 SIC (PMID 31410983); Vincent 1996 / Singer Sepsis-3 SOFA table | INR 0/1/2 and platelet 0/1/2 bands; positive if total ≥4 AND coag subscore >2; … |
| `fried-frailty` | Fried Frailty Phenotype | `wave6-scores-residual.ts` | `exhaustion`, `weakness`, `slowness`, `lowActivity` | Cannot apply CHS phenotype without the two CES-D stems and 3–4 day cut, sex/BMI grip-kg table, sex/height 15-ft walk times, and sex-specific weekly kcal cuts. | Fried LP et al. J Gerontol A Biol Sci Med Sci. 2001;56:M146 (CHS phenotype + appendix). MDCalc Fried Frailty item help. | five binary criteria; robust 0 / pre-frail 1–2 / frail ≥3; weight-loss label cu… |
| `duke-iscvid-2023` | 2023 Duke-ISCVID Infective Endocarditis Criteria | `wave7-bedside.ts` | `microMajor`, `imagingMajor`, `microMinor`, `surgicalMajor`, `pathologic` | User cannot classify major vs minor microbiology without the 2023 typical-organism list and 2-set vs 3-set rule. Typical native: S. aureus, S. lugdunensis, E. faecalis, all strept… | Fowler VG et al. Clin Infect Dis 2023, 2023 Duke-ISCVID criteria tables (typical organisms, imaging footnotes) | yes/no values; definite/possible/rejected logic (2 major, 1+3, 5 minor, 1+1, 3 … |
| `basmi` | BASMI (2-step) | `wave7-rheum-activity.ts` | `tragus`, `schober`, `cervical`, `sideFlex`, `imd` | Bins are scorable; the exam is not. User still needs an ASAS/Jenkinson card to produce tragus-to-wall, modified Schober, side flexion, cervical rotation, and intermalleolar distan… | Jenkinson TR et al. J Rheumatol. 1994 BASMI; ASAS/ASIF BASMI measurement SOP | 2-step 0/1/2 bins, five-item sum 0–10, bands 0–2 / 3–5 / 6–10; do not switch to… |
| `lods` | LODS Score (Simplified) | `wave2-pulm-id.ts` | `cv`, `renal`, `pulm`, `heme`, `hepatic` | Cannot assign 1 vs 3 vs 5 without Le Gall Table 1 (HR/SBP, urea/Cr/UOP, vent+PF, WBC/platelets, bilirubin/PT). Empty educational bins are not scorable. | Le Gall JR et al. JAMA. 1996;276:802-810 Table 1; SFAR LODS variable definitions | 0/1/3/5 option values, six-domain sum, interpretation bands as coded. Do not ad… |
| `psofa-simp` | Pediatric SOFA (pSOFA) Simplified Educational | `wave6-em-peds.ts` | `resp`, `cv`, `cns`, `renal` | Cannot assign 1 vs 2 vs 3 vs 4 without the Matics table. Missing PaO2/FiO2 and SpO2/FiO2 cutoffs, age-specific MAP, age-specific creatinine, GCS bands, vasoactive µg/kg/min. Adult… | Matics TJ, Sanchez-Pinto LN. JAMA Pediatr. 2017;171(10):e172352 Table 1 | option values 0–4, six-domain sum 0–24, interpretation thresholds 3 / 7 / 11 / … |
| `phoenix-sepsis-simp` | Phoenix Sepsis Criteria (Simplified Educational) | `wave6-em-peds.ts` | `resp`, `cv`, `coag`, `neuro` | UI invokes official Phoenix thresholds then withholds them (platelets, INR, D-dimer, fibrinogen, PF/SF, IMV, lactate 5 and 11, age-MAP, GCS ≤10, fixed pupils). Educational 0–2 bin… | Schlapbach LJ et al. JAMA 2024 Phoenix consensus table; Sanchez-Pinto LN et al. JAMA 2024 Table 2 | 0–2 domain values, organ sum, sepsis = infection AND organ ≥2, shock = sepsis A… |
| `heart-score` | HEART Score for Major Cardiac Events | `cardiology.ts` | `history`, `ecg`, `risk` | History has no typical vs nonspecific elements, so 0 vs 1 vs 2 is gestalt and needs a HEART card. ECG 1-point officially includes LBBB, paced rhythm, LVH strain, and digoxin effec… | Six AJ et al. Neth Heart J 2008; Backus HEART flyer (heartscore.nl) risk-factor list (BMI >30, FHx); original ECG categ… | 0–2 per domain, 0–10 total, MACE bands 0–3 / 4–6 / 7–10, troponin ×ULN bins |
| `bilag-2004-index` | BILAG-2004 (Domain Grades) | `wave7-rheum-activity.ts` | `constitutional`, `mucocutaneous`, `neuro`, `msk`, `cardiorespiratory`, `gi`, `ophthalmic`, `renal` | A–C are mild/moderate/severe with no organ rules. Cannot grade a domain without the copyrighted 97-item BILAG-2004 glossary. D vs E is the only operational pair. UI looks administ… | Isenberg DA et al. Rheumatology 2005 BILAG-2004; official BILAG-2004 glossary (University of Birmingham, copyright — po… | nine domains, A–E values, any-A / any-B / C-only / D–E classification; do not a… |

### Wave E — All P1 (cutoffs, stems, time windows)

See §10. Batch by module using §12.

### Wave F — P2 polish

See §11. Do these last, or while touching a file for a P0/P1.

---

## 8. Copyright / total-only (do not expand these into pirated items)

These were classified **clear** or called out in the finding as copyright-total-only. Do not reprint item stems:

- Cognitive: `mmse`, `moca` (and similar licensed screens already total-only)
- Function / PRO: ODI, NDI, DASH, CAT, ACT, ACQ, MNA-SF, SNOT-22, LSAS, CUDIT-R, painDETECT, BPI, M-CHAT-R, PDSS, RAPID3/MDHAQ, SLEDAI-2K, PASI (precomputed total)
- Pressure / activity worksheets that the finding marks copyrighted: Braden (P0 — use “official card” path, do not pirate Prevention Plus text), BILAG-2004 (P0 — same)

PHQ-9 / GAD-7 / NIHSS / GCS / CIWA-Ar / Mini-Cog / PCL-5 / Barthel / SLUMS are **not** in that bucket.

---

## 9. P0 catalog — cannot score from the UI (67)

Full `suggested_change` text for every row is in the JSON. Index table first, then long-form write-ups.

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `pecarn-head` | PECARN Head Injury (Simplified) | `emergency-misc.ts` | `gcs14`, `palpable`, `loc`, `nonfrontal`, `notActing` | Cannot apply PECARN from the UI. AMS, basilar signs, and severe mechanism are undefined; 'etc.' is a protocol-card tell. Age-specific predictors are OR-bundled so <2y and ≥2y list… | Kuppermann N et al. Lancet 2009;374:1160–1170 PECARN ciTBI rule (AMS and severe-mechanism footnotes) | keys, yes/no values, high-risk = gcs14 OR palpable → 2, age-specific intermedia… |
| `framingham-hf` | Framingham Heart Failure Criteria | `extra.ts` | `pnd`, `orthopnea`, `rales`, `cardiomegaly`, `edemaPulm`, `s3`, `jvd`, `weightLoss` | Cannot map a real exam to published Framingham items. PND is an unexplained abbreviation. Two checkboxes fuse distinct findings so the user cannot tell whether to tick for either … | McKee PA et al. N Engl J Med. 1971 PMID 5122894; Ho KK Framingham HF operational definitions (cardiomegaly on CXR, CVP … | the 8 major / 7 minor keys; meets = 2 major OR 1 major + 2 minor; option values |
| `basdai` | BASDAI (Ankylosing Spondylitis) | `wave4-heme-onc.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6` | BASDAI is a patient questionnaire. Cannot administer from 'Q1 Fatigue'. Missing last-week window; Q2 is neck/back/hip pain not generic spinal; Q3 is joints other than neck/back/hi… | Garrett S et al. J Rheumatol. 1994 PMID 7699630; NASS/RheumInfo BASDAI form (THE PAST WEEK) | 0–10 ranges, stiffness mean (Q5+Q6)/2, 0.2 weighting, ≥4 active-disease band |
| `saps-iii-simp` | SAPS 3 | `wave6-psych-sleep.ts` | `reason`, `infection`, `gcs`, `wbc`, `vent` | Box II cannot be scored without the official SAPS 3 sheet. Coma/delirium hides coma, stupor, obtunded, vigilance disturbance, confusion, agitation, delirium. Focal deficit not spe… | SAPS 3 Admission Score Sheet (saps3.org); Moreno RP et al. Intensive Care Med. 2005 PMID 16132893; Metnitz PG et al. PM… | Point values, 16-point offset, global logit, comorbidity max-of rule |
| `wells-dvt` | Wells Criteria for DVT | `cardiology.ts` | `calf`, `cancer`, `tenderness`, `bedridden` | The calf item is a tape-measure exam: official rule is ≥3 cm difference 10 cm below the tibial tuberosity. Active cancer in Wells is treatment ongoing, within 6 months, or palliat… | Wells PS et al. Lancet 1997; NEJM 2003 revised Wells DVT model (12-week anesthesia wording; 10 cm landmark) | +1 items, −2 alternative diagnosis, two-tier ≤0 vs ≥1 logic |
| `gcs` | Glasgow Coma Scale (GCS) | `critical-care.ts` | `eye`, `verbal`, `motor` | Cannot administer GCS from the UI: pain-stimulus method (fingernail-bed vs trapezius/supraorbital; localization = hand above clavicle), what oriented means, two-step motor command… | Teasdale & Jennett Lancet 1974; GCS 2014 relaunch (glasgowcomascale.org) stimulus method and NT/C/T coding | option values, calculate() E+V+M sum, max 15, risk bands ≤8 / 9–12 / 13–15 |
| `pgcs` | Pediatric GCS | `emergency-misc.ts` | `eye`, `verbal`, `motor` | Cannot administer pGCS from the UI: which column by age; pain-stimulus method; what oriented/obeys mean; infant motor 5 is withdraws-to-touch not localization; intubated VT; eyes … | Reilly PL et al. Childs Nerv Syst 1988 paediatric GCS; James/PALS-ATLS infant vs child table; Teasdale 2014 glasgowcoma… | option values 1–4 / 1–5 / 1–6, calculate() E+V+M sum, bands ≤8 / 9–12 / 13–15 |
| `duke-criteria` | Modified Duke Criteria (IE Helper) | `extra.ts` | `bloodCx`, `echo`, `predisposing`, `vascular`, `immuno`, `microMinor` | Cannot apply modified Duke from the UI. Missing typical-organism list, persistently positive-culture timing, Coxiella/antiphase I IgG >1:800 as major, echo definitions (oscillatin… | Li JS et al. Clin Infect Dis. 2000 PMID 10770721 definitions of terms; AHA endocarditis modified-Duke table; MDCalc Mod… | yes/no values; major/minor counts; definite = 2 major OR 1 major+3 minor OR 5 m… |
| `jones-criteria` | Jones Criteria (Acute Rheumatic Fever) | `extra.ts` | `strep`, `carditis`, `arthritis`, `chorea`, `erythema`, `nodules`, `arthralgia`, `fever` | Jones 2015 cannot be administered from this checklist. Missing population-risk stratum (changes joint findings and fever/ESR cutoffs), subclinical echo carditis, moderate/high-ris… | Gewitz MH et al. Circulation. 2015 PMID 25908771 — confirm fever 38.5 vs 38.0 and ESR 60 vs 30 from the Circulation tab… | yes/no values; GAS gate in calculate(); initial-ARF rule 2 major or 1 major + 2… |
| `nihss` | NIH Stroke Scale (NIHSS) | `gi-neuro-psych.ts` | `loc`, `locQ`, `locC`, `gaze`, `visual`, `facial`, `armL`, `armR` | Clinician cannot administer NIHSS from the UI. Must recall month+age questions (not where/president), eyes+grip commands, 10 s/90° arm and 5 s/30° leg holds, NIHSS picture/word ca… | NINDS NIH Stroke Scale English instructions (NIH-Stroke-Scale_updatedFeb2024_508.pdf); Brott T et al. Stroke 1989 PMID … | option values, calculate() 15-item sum, max 42 |
| `atlanta-pancreatitis` | Revised Atlanta Classification Helper | `missing-gi-liver.ts` | `organFailure` | Cannot decide whether organ failure is present without the modified Marshall card. Thresholds (PaO2/FiO2 <300, creatinine ≥1.9 mg/dL, SBP <90 not fluid-responsive) are not on scre… | Banks PA et al. Gut 2013 revised Atlanta; modified Marshall table in that paper; MDCalc Atlanta | option values; calculate() mapping persistent→severe, transient or local/system… |
| `pediatric-ews` | Pediatric Early Warning Score (PEWS, simplified) | `missing-heme-id-nephro.ts` | `cv`, `resp`, `behavior` | Cannot apply +20/+30 from normal or RR vs normal without age-band vital tables. CRT method unstated. Sleeping=1 is a Monaghan rule people will skip. | Monaghan A. Paediatr Nurs 2005 Brighton PEWS; institutional Brighton age-band vital tables (do not invent a new PEWS) | 0–3 domain points, +2 oxygen item, calculate() sum, 0–2 / 3–4 / ≥5 bands |
| `mini-cog` | Mini-Cog | `missing-neuro-psych.ts` | `recall`, `clock` | Cannot administer Mini-Cog from the Inputs panel. Missing 3-word list, uncued recall after clock distractor, and required clock time. 'Poor spacing' as abnormal can over-call offi… | Borson S et al. J Am Geriatr Soc 2003 PMID 14511167; Mini-Cog.com (Soo Borson) instructions | option values 0–3 and 0/2, calculate() cutoff ≤2 positive, max 5 |
| `euroscore-ii-simp` | EuroSCORE II | `wave2-cardiology.ts` | `critical`, `extracardiac`, `copd`, `endocarditis`, `poorMobility`, `nyha`, `ccs4`, `urgency` | Official EuroSCORE II variable definitions are not on the form. User cannot decide critical preoperative state, arteriopathy, COPD, urgency, or NYHA/CCS class without Nashef Table… | Nashef et al. Eur J Cardiothorac Surg 2012 EuroSCORE II definitions; euroscore.org / MDCalc EuroSCORE II footnotes | Logistic intercept and β values, age Xi coding, dialysis vs CrCl bands, VSD ori… |
| `clock-draw` | Clock Drawing Score (0–5) | `wave2-neuro-psych.ts` | `score` | User cannot administer the test: Shulman CDT requires the command to put numbers in and set hands to 10 past 11. Score 3 is wrong 11:10 with preserved layout, not generic moderate… | Shulman KI Int J Geriatr Psychiatry 1993/2000 0–5 clock-drawing scoring; administration '10 past 11' | option values 0–5, calculate() bands (≤3 abnormal), max 5 |
| `hoehn-yahr` | Hoehn and Yahr Stage | `wave2-neuro-psych.ts` | `stage` | Modified H&Y 2 vs 2.5 vs 3 is an exam maneuver (retropulsion/pull test). Without stance, warning, force of pull, step count, and catching a fall, a non-movement-disorder clinician… | Hoehn MM, Yahr MD. Neurology 1967; modified H&Y; MDS-UPDRS postural-instability pull-test method | stage values 0 / 1 / 1.5 / 2 / 2.5 / 3 / 4 / 5, calculate() bands |
| `pcl5` | PCL-5 PTSD Checklist | `wave2-neuro-psych.ts` | `score` | PCL-5 is public domain (National Center for PTSD) — not a copyright-total-only exception. The 20 DSM-5 symptom stems and 0–4 labels are missing, so the patient cannot be scored fr… | NCPTSD PCL-5 (Blevins 2015; https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp). Public domain. | 0–4 item values, 0–80 total, provisional cutoff band ~31–33 |
| `slums` | SLUMS Cognitive Score | `wave2-neuro-psych.ts` | `score` | SLUMS is free for clinical use (SLU/VA), not an MMSE/MoCA copyright wall. User still needs the protocol card (orientation, $100 story, 1-minute animals, 5-object recall, reverse d… | Tariq SH et al. Am J Geriatr Psychiatry 2006; official SLUMS examination PDF (Saint Louis University / VA) | 0–30 total, education-adjusted bands (HS+ 27–30 / 21–26 / ≤20; <HS 25–30 / 20–2… |
| `icans-grade` | ASTCT ICANS Grade | `wave2-oncology.ts` | `ice` | Cannot administer ICE from the UI. Missing year/month/city/hospital orientation, 3-object naming, command examples, standard sentence, serial 7-equivalent (100 by 10). Untestable … | Lee DW et al. Biol Blood Marrow Transplant. 2019 ASTCT ICE tool and ICANS table (ICE 0 unarousable = grade 4) | ICE 10→0 / 7–9→1 / 3–6→2 / 0–2→3 banding; max() across domains; consciousness/s… |
| `clif-sofa` | CLIF-SOFA / CLIF-OF (Simplified Sum) | `wave3-gi-hep.ts` | `brain`, `resp` | Cannot assign West Haven grade from the UI (exam findings missing). SpO2/FiO2 CLIF-C OF equivalents are unnamed when no ABG. | EASL-CLIF CANONIC / Jalan CLIF-C OF table; West Haven criteria (AASLD/EASL HE); Moreau 2013 Gastroenterology | option values 1–3, failure if score ≥3, ACLF grade logic, liver/kidney/coag/cir… |
| `determinant-based` | Determinant-Based Pancreatitis Severity | `wave3-gi-hep.ts` | `organFailure`, `necrosis` | Cannot decide Marshall ≥2 without PaO2/FiO2, Cr, and SBP/fluid-responsiveness cutoffs. Infected necrosis is gas on imaging or positive FNA/drain culture. | Dellinger EP et al. Ann Surg 2012; Banks PA et al. Gut 2013 revised Atlanta modified Marshall table | mild/moderate/severe/critical mapping, 48-hour split, calculate() branches |
| `vexus` | VExUS Score (Venous Congestion) | `wave3-nephro-icu.ts` | `ivc`, `hepatic`, `portal`, `intrarenal` | Cannot acquire or grade VExUS from the UI: IVC site/phase, hepatic S vs D vs S reversal, portal pulsatility fraction (Vmax−Vmin)/Vmax, interlobar biphasic vs D-only monophasic. Gr… | Beaubien-Souligny W et al. Ultrasound J. 2020 PMID 32270297 IVC ≥2 cm gateway and organ-pattern table; Kidney Medicine … | IVC 0/1 gateway, hepatic/portal/intrarenal values 0–2, grade 0 if IVC<2 else 1/… |
| `new-ballard` | New Ballard Score (Gestational Age) | `wave3-peds-ob.ts` | `posture`, `squareWindow`, `armRecoil`, `popliteal`, `scarf`, `heelToEar`, `genitals`, `eyeEar` | A bedside examiner cannot administer the neuromuscular items or score genitals from the UI. Official New Ballard is pictorial and sex-specific: male scores use scrotum/testes/ruga… | Ballard JL et al. J Pediatr 1991; New Ballard Score sheet and neuromuscular monograph at ballardscore.com (scoresheet P… | calculate() domain sum, total-score mode, weeks interpolation table, option poi… |
| `serotonin-syndrome` | Hunter Serotonin Toxicity Criteria | `wave3-tox-endo-heme.ts` | `spontaneousClonus`, `inducibleClonus`, `ocularClonus`, `hyperreflexia`, `hypertonia`, `serotonergic` | Cannot administer Hunter from the UI. Inducible clonus needs brisk sustained ankle dorsiflexion; ocular clonus is slow continuous horizontal oscillations; hyperreflexia/clonus are… | Dunkley EJC et al. QJM 2003 Hunter criteria; Boyer/Shannon and UpToDate exam (ocular clonus; inducible ankle clonus tec… | yes/no keys, Hunter boolean tree, serotonergic-required gate, Positive/Negative… |
| `tirads` | ACR TI-RADS (Simplified Points) | `wave3-tox-endo-heme.ts` | `composition`, `echogenicity`, `shape`, `margin`, `foci` | Cannot assign TR points from ultrasound without the ACR lexicon. Missing: spongiform >50% tiny cysts; very hypoechoic = darker than strap muscle; taller-than-wide = AP>transverse … | Tessler FN et al. J Am Coll Radiol. 2017 ACR TI-RADS white paper lexicon and chart | point values, TR1–TR5 mapping, FNA/follow size cutoffs TR3≥2.5 / TR4≥1.5 / TR5≥… |
| `boston-syncope` | Boston Syncope Rule (Simplified) | `wave4-em-id.ts` | `acsSigns`, `conduction`, `historyCad`, `persistentAbnVitals`, `volume`, `familyHx` | Cannot score several Boston categories without the Grossman paper. Vital signs have no HR/SBP/RR thresholds; conduction and ACS items are unanchored; family sudden death has no fi… | Grossman SA et al. Boston Syncope Criteria (J Emerg Med / Ann Emerg Med 2007); MDCalc Boston Syncope Rule item notes | Any-positive admission logic, 8-category structure, calculate() sum |
| `stemi-equivalent` | STEMI Equivalent Patterns Checklist | `wave4-em-id.ts` | `sgarbossa`, `wellens`, `deWinter`, `posterior`, `hyperacute`, `lmain`, `rvMi` | User cannot decide positivity from the ECG without a criteria card. Worst is Sgarbossa/Smith-modified (concordant STE, concordant STD V1–V3, ST/S ratio). Wellens needs Type A/B, l… | Sgarbossa 1996 / Smith-modified Sgarbossa; de Winter NEJM 2008; Wellens T-wave criteria; AHA/ESC posterior-lead recomme… | Yes/no flags, hard-OMI grouping in calculate(), 9-item checklist |
| `delirium-icdsc` | Intensive Care Delirium Screening Checklist (ICDSC) | `wave4-icu-vent.ts` | `ams`, `inattention`, `disorientation`, `hallucination`, `psychomotor`, `speech`, `sleep`, `fluctuation` | Cannot administer ICDSC from the UI. Missing Bergeron A–E consciousness (coma/RASS −4/−5 = stop, do not score 1), inattention cues, sleep <4 h / frequent nocturnal waking / sleepi… | Bergeron N et al. Intensive Care Med. 2001;27:859-864; ICU ICDSC cards (LHSC/Skrobik) for A–E LOC and UTA | eight 0/1 keys, sum 0–8, positive ≥4, 1–3 subsyndromal band |
| `brief-confusion` | bCAM Simplified (Brief Confusion Assessment) | `wave4-neuro-psych.ts` | `f1`, `f2`, `f3`, `f4` | Cannot administer bCAM from the UI. Official F2 is months backwards December to July (>1 error or cannot complete). F4 is four yes/no questions plus a two-step finger command (≥2 … | Han JH et al. Ann Emerg Med. 2013; Vanderbilt bCAM Training Manual / flowsheet 2015 (copyright Vanderbilt/HELP — keep t… | four yes/no keys, positive = F1 AND F2 AND (F3 OR F4) |
| `c-stat` | C-STAT (Cincinnati Stroke Triage Assessment Tool) | `wave4-neuro-psych.ts` | `loc` | NIHSS 1b/1c-class failure: cannot score LOC without the two questions (age, month) and two commands (close eyes; open and close the hand / make a fist). Gaze lacks the cannot-cros… | Katz BS et al. Stroke. 2015 (CPSSS/C-STAT); AHA ASLS C-STAT checklist (age, month, close eyes, open/close hands) | 2+1+1 weights, ≥2 cutoff, keep coded OR (not AND) for the LOC item |
| `race-scale` | RACE Scale (Prehospital LVO) | `wave4-neuro-psych.ts` | `face`, `arm`, `leg`, `gaze`, `agnosia` | Cannot administer RACE from the UI. Official scoring needs smile/show teeth; arm 90° sitting or 45° supine scored by hold >10 s; each leg 30° supine scored by hold >5 s; gaze pres… | Pérez de la Ossa N et al. Stroke. 2014; racescale.org table; NJ/SC EMS RACE scoring cards | option values, cortical-branch logic by hemiparesis side, sum 0–9, cutoff ≥5 |
| `arvc-taskforce` | ARVC Task Force Criteria (Simplified Count) | `wave5-cardio.ts` | `imaging`, `tissue`, `repolarization`, `depolarization`, `arrhythmia`, `family` | User cannot decide minor vs major without the 2010 revised TFC worksheet (echo/CMR cutoffs, epsilon vs TAD, VT axis, >500 PVCs/24 h, which relative counts). Same protocol-card fai… | Marcus FI et al. Eur Heart J 2010 PMID 20172912 (2010 revised Task Force Criteria tables) | option values 0/1/2, definite/borderline/possible combination rules |
| `mases` | MASES (Enthesitis Score) | `wave5-general-misc.ts` | `total` | Clinician cannot administer MASES from the UI. The 13 named sites and 0/1 tenderness rule are not on the input; user still needs a protocol card. This is a bedside exam, not a cop… | Heuft-Dorenbosch L et al. Ann Rheum Dis. 2003 PMID 12525383; ASAS MASES site diagram; MDCalc MASES | 0–13 range, calculate() clamp, interpretation bands |
| `ses-cd` | SES-CD (Simple Endoscopic Score for Crohn Disease) | `wave5-nephro-gi.ts` | `total` | Cannot produce the total from the endoscopy without an external SES-CD card. Missing ulcer size in cm, % surface bands, and whether stenosis is passable. | Daperno M et al. Gastrointest Endosc 2004 PMID 15472670; MDCalc SES-CD item table | calculate() total interpretation bands 0–2 / 3–6 / 7–15 / ≥16, max 56 |
| `pulmonary-score` | Pediatric Asthma Pulmonary Score | `wave5-peds-id.ts` | `ageBand`, `rr`, `accessory` | Cannot score RR without Smith 2002 age-specific table. Accessory mild/moderate/severe has no muscle or exam cue (official is SCM activity). | Smith SR et al. Acad Emerg Med 2002 The pulmonary score (PMID 11825832); Children's Mercy EBP table of Smith RR/wheeze/… | values 0–3, three-domain sum, mild 0–3 / moderate 4–6 / severe 7–9 |
| `aap-score` | Adult Appendicitis Score (AAS) | `wave5-surg-uro-ent.ts` | `crp`, `guarding`, `rlqPain` | CRP cannot be scored from the UI. Official AAS uses different mg/L cutoffs for symptoms <24 h vs >24 h, including a high-CRP point drop. Guarding mild vs moderate-severe has no ex… | Sammalkorpi HE et al. BMC Gastroenterol. 2014;14:114 Table 2; BMJ Best Practice AAS criteria | interpretation cutoffs ≤10 / 11–15 / ≥16; do not 'fix' simplified sex/age −3 or… |
| `p-possum` | P-POSSUM Mortality (Simplified Educational) | `wave5-surg-uro-ent.ts` | `opMagnitude`, `cardiac`, `resp` | Cannot assign operative magnitude without the POSSUM procedure table. Cardiac 'Edema / warfarin' omits peripheral edema and cardiomegaly. Respiratory 'limiting dyspnea' omits the … | Copeland GP et al. Br J Surg 1991 POSSUM; Whiteley MS et al. Br J Surg 1996 P-POSSUM; JAMA Surgery POSSUM magnitude tab… | option values 1/2/4/8, partial-score logit, educational disclaimer |
| `ata-nodule` | ATA Thyroid Nodule Sonographic Pattern | `wave6-clinical-residual.ts` | `pattern` | Cannot assign ATA 2015 pattern from the UI: high vs intermediate vs low is defined by echogenicity plus suspicious features (irregular margins, microcalcifications, taller-than-wi… | Haugen BR et al. 2015 ATA thyroid nodule guidelines, Thyroid 2016, Table 6 / Recommendation 8 | option values benign…high, size cutoffs in calculate(), malignancy percent stri… |
| `biophysical-profile` | Biophysical Profile (BPP) | `wave6-em-peds.ts` | `nst`, `movement`, `afv` | Cannot call reactive vs nonreactive without Manning/ACOG acceleration rules (15×15 or 10×10). Movement observation window omitted. Adequate AFI is undefined. | Manning FA et al. AJOG 1980; ACOG antenatal testing (15×15 / 10×10 NST); standard BPP MVP >2 cm tables | 0/2 component points, NST −1 skip, /10 vs /8 logic, oligohydramnios override |
| `jaam-dic` | JAAM DIC Criteria (Revised) | `wave6-heme-onc.ts` | `sirs` | JAAM awards 1 point for ≥3 of 4 SIRS criteria. The four items and cutoffs are not on the UI, so the user still needs a SIRS card. | Gando S et al. Crit Care Med 2006 (PMID 16521260); Bone 1992 SIRS consensus | platelet 0/1/3, PT ratio ≥1.2 = 1, FDP 0/1/3, DIC if total ≥4, fibrinogen omitt… |
| `sic-score` | SIC Score (Sepsis-Induced Coagulopathy) | `wave6-heme-onc.ts` | `sofa` | User cannot produce 0/1/≥2 without a SOFA card. Each allowed domain is a 0–4 table (PaO2/FiO2±vent, MAP/pressors, bilirubin, Cr or UO). CNS and coagulation are correctly excluded … | Iba T et al. JTH 2019 SIC (PMID 31410983); Vincent 1996 / Singer Sepsis-3 SOFA table | INR 0/1/2 and platelet 0/1/2 bands; positive if total ≥4 AND coag subscore >2; … |
| `fried-frailty` | Fried Frailty Phenotype | `wave6-scores-residual.ts` | `exhaustion`, `weakness`, `slowness`, `lowActivity` | Cannot apply CHS phenotype without the two CES-D stems and 3–4 day cut, sex/BMI grip-kg table, sex/height 15-ft walk times, and sex-specific weekly kcal cuts. | Fried LP et al. J Gerontol A Biol Sci Med Sci. 2001;56:M146 (CHS phenotype + appendix). MDCalc Fried Frailty item help. | five binary criteria; robust 0 / pre-frail 1–2 / frail ≥3; weight-loss label cu… |
| `duke-iscvid-2023` | 2023 Duke-ISCVID Infective Endocarditis Criteria | `wave7-bedside.ts` | `microMajor`, `imagingMajor`, `microMinor`, `surgicalMajor`, `pathologic` | User cannot classify major vs minor microbiology without the 2023 typical-organism list and 2-set vs 3-set rule. Typical native: S. aureus, S. lugdunensis, E. faecalis, all strept… | Fowler VG et al. Clin Infect Dis 2023, 2023 Duke-ISCVID criteria tables (typical organisms, imaging footnotes) | yes/no values; definite/possible/rejected logic (2 major, 1+3, 5 minor, 1+1, 3 … |
| `basmi` | BASMI (2-step) | `wave7-rheum-activity.ts` | `tragus`, `schober`, `cervical`, `sideFlex`, `imd` | Bins are scorable; the exam is not. User still needs an ASAS/Jenkinson card to produce tragus-to-wall, modified Schober, side flexion, cervical rotation, and intermalleolar distan… | Jenkinson TR et al. J Rheumatol. 1994 BASMI; ASAS/ASIF BASMI measurement SOP | 2-step 0/1/2 bins, five-item sum 0–10, bands 0–2 / 3–5 / 6–10; do not switch to… |
| `bode` | BODE Index (COPD) | `emergency-misc.ts` | `dyspnea` | Cannot assign mMRC 2 vs 3 vs 4 without the MRC grade card. '0–1' also hides that grades 0 and 1 are different questions collapsed only for BODE points. | Celli BR et al. NEJM 2004 BODE table; Fletcher/MRC dyspnea scale; GOLD mMRC wording | BMI/FEV1/6MWD cutoffs, dyspnea values 0–3, sum 0–10, quartile bands 0–2 / 3–4 /… |
| `ciwa` | CIWA-Ar (Alcohol Withdrawal) | `gi-neuro-psych.ts` | `nausea`, `tremor`, `sweats`, `anxiety`, `agitation`, `tactile`, `auditory`, `visual` | Cannot score without Sullivan 1989 or a pocket card. Official 0/1/4/7 (and all orientation ranks) have mandatory operational anchors and several items have required questions. Int… | Sullivan JT et al. Br J Addict 1989 PMID 2597811 (CIWA-Ar Appendix A); MDCalc CIWA-Ar | option values 0–7 (orientation 0–4), calculate() sum, max 67 |
| `isth-dic` | ISTH Overt DIC Score | `missing-heme-id-nephro.ts` | `fibrin`, `pt` | Cannot choose moderate vs strong fibrin markers without a multiplier or example D-dimer. PT is seconds above mean normal, not INR. | Taylor FB et al. Thromb Haemost 2001; Toh/Hoots ISTH SSC 2007 overview; ISTH SSC 2025 D-dimer ×3 / ×7 ULN proposal | fibrin points 0/2/3 (not 0/1/2), platelet/PT/fibrinogen cutoffs, ≥5 overt thres… |
| `ham-a` | HAM-A Anxiety Score | `wave2-neuro-psych.ts` | `score` | HAM-A items are 0–4 on 14 named symptom clusters (anxious mood, tension, fears, insomnia, somatic muscular/sensory, CV, respiratory, GI, GU, autonomic, behavior at interview). A t… | Hamilton M. Br J Med Psychol 1959; standard HAM-A 14-item anchor reprints | 0–4 per item, 0–56 total, bands ≤17 / 18–24 / 25–30 / >30 |
| `ham-d` | HAM-D Depression Score | `wave2-neuro-psych.ts` | `score` | Original HAM-D (1960) is a clinician-rated anchored interview, not a Pearson form like MMSE. A total box cannot be scored at the bedside: items mix 0–4 and 0–2 with specific probe… | Hamilton M. J Neurol Neurosurg Psychiatry 1960; APA Handbook 17-item HDRS anchors. Confirm no third-party structured-in… | 17-item interpretation bands (≤7 / 8–13 / 14–18 / 19–22 / ≥23), version field a… |
| `ymrs` | Young Mania Rating Scale (YMRS) | `wave2-neuro-psych.ts` | `score` | YMRS cannot be scored from a total. Four items are 0–8 (irritability, speech, thought content, disruptive-aggressive) and seven are 0–4, each with operational anchors. User needs … | Young RC et al. Br J Psychiatry 1978 YMRS item anchors | 0–60 total, double-weight items, pragmatic bands ≤12 / 13–19 / 20–25 / ≥26 |
| `bclc-hcc` | BCLC HCC Stage Helper | `wave2-oncology.ts` | `ps`, `liver` | PS 0 vs 1 vs 2 is the fork to BCLC 0/A/B vs C. Cannot assign ECOG from numbers alone (CIWA-style). Child-Pugh A/B/C is a 5-item score not shown. | Oken MM et al. Am J Clin Oncol. 1982 ECOG PS; Reig M et al. J Hepatol. 2022 BCLC update; Pugh Child-Turcotte-Pugh varia… | PS 0/1/2/3 values; Child A/B/C keys; tumor very_early/early/intermediate/advanc… |
| `goese` | Glasgow Outcome Scale–Extended (GOS-E) | `wave2-ortho-trauma.ts` | `gose` | Cannot distinguish GOS-E 3 vs 4, 5 vs 6, or 7 vs 8 from the selector. Those splits are why the scale exists. Same pattern as CFS: descriptors appear only after scoring. | Wilson JT, Pettigrew LE, Teasdale GM. J Neurotrauma. 1998 PMID 9726257 structured GOS/GOS-E interview; TBI-IMSOP GOS-E … | option values 1–8, mapping to classic GOS in details, risk bands ≤2 / 3–4 / 5–6… |
| `lods` | LODS Score (Simplified) | `wave2-pulm-id.ts` | `cv`, `renal`, `pulm`, `heme`, `hepatic` | Cannot assign 1 vs 3 vs 5 without Le Gall Table 1 (HR/SBP, urea/Cr/UOP, vent+PF, WBC/platelets, bilirubin/PT). Empty educational bins are not scorable. | Le Gall JR et al. JAMA. 1996;276:802-810 Table 1; SFAR LODS variable definitions | 0/1/3/5 option values, six-domain sum, interpretation bands as coded. Do not ad… |
| `braden-scale` | Braden Scale for Predicting Pressure Sore Risk | `wave4-icu-vent.ts` | `sensory`, `moisture`, `activity`, `mobility`, `nutrition`, `friction` | Cannot assign 1 vs 2 vs 3 vs 4 without the official Braden card. Hidden anchors: sensory (unresponsive vs pain-only vs verbal but cannot always report discomfort); moisture (linen… | Bergstrom N, Braden BJ et al. 1987; official Braden Scale (Prevention Plus). Complete copyright permission if reprintin… | subscale values 1–4 (friction 1–3), total 6–23, risk bands ≤9 / 10–12 / 13–14 /… |
| `nursing-delirium` | Nursing Delirium Screening Scale (Nu-DESC) | `wave4-icu-vent.ts` | `disorientation`, `behavior`, `communication`, `illusion`, `psychomotor` | Cannot distinguish mild vs severe or what counts as a positive item without the Gaudreau card. Missing item stems (time/place/person; pulling tubes; incoherent speech; seeing/hear… | Gaudreau JD et al. J Pain Symptom Manage. 2005;29:368-375 Nu-DESC items | option values 0–2, five-item sum 0–10, positive cutoff ≥2 |
| `psofa-simp` | Pediatric SOFA (pSOFA) Simplified Educational | `wave6-em-peds.ts` | `resp`, `cv`, `cns`, `renal` | Cannot assign 1 vs 2 vs 3 vs 4 without the Matics table. Missing PaO2/FiO2 and SpO2/FiO2 cutoffs, age-specific MAP, age-specific creatinine, GCS bands, vasoactive µg/kg/min. Adult… | Matics TJ, Sanchez-Pinto LN. JAMA Pediatr. 2017;171(10):e172352 Table 1 | option values 0–4, six-domain sum 0–24, interpretation thresholds 3 / 7 / 11 / … |
| `barthel-index` | Barthel ADL Index Total | `wave6-psych-sleep.ts` | `score` | Public-domain bedside ADL exam cannot be scored from the UI; clinician still needs the Mahoney/Collin card for feeding/bathing/grooming/dressing/bowels/bladder/toilet/transfers (0… | Mahoney FI, Barthel DW. Md State Med J. 1965 PMID 14258950; Collin C et al. Int Disabil Stud. 1988 (0–100 version) | Item weights, 0–100 range, interpretation bands 0–20 / 21–60 / 61–90 / 91–99 / … |
| `frailty-clinical` | Clinical Frailty Scale (CFS) | `wave6-scores-residual.ts` | `cfs` | Cannot distinguish CFS 5/6/7/8/9 from titles alone (IADL help vs bathing/house vs complete dependence vs approaching death vs terminal <6 months without severe frailty). Two-week … | Rockwood CFS v2.0 (Rockwood & Theou Can Geriatr J 2020); Dalhousie GMR CFS card and Guidance on the Clinical Frailty Sc… | option values 1–9; calculate() score passthrough; CFS ≥5 frail note |
| `isth-ssc-bat` | ISTH-SSC Bleeding Assessment Tool (14 domains) | `wave7-highuse.ts` | `epistaxis`, `cutaneous`, `minorWounds`, `oralCavity`, `gi`, `hematuria`, `toothExtraction`, `surgery` | Cannot administer ISTH-SSC BAT from the UI. Missing official frequency/duration, consultation-only, packing vs transfusion, dental/surgery % of procedures, menorrhagia pad/PBAC ru… | Rodeghiero F et al. JTH 2010 ISTH/SSC BAT (PMID 20626619); Elbatarny M et al. Haemophilia 2014 (PMID 25196510); ISTH SS… | option values 0–4, 14-domain sum, adult cutoffs ≥4 men / ≥6 women |
| `essdai` | ESSDAI (Sjögren Activity) | `wave7-rheum-activity.ts` | `constitutional`, `lymphadenopathy`, `glandular`, `articular`, `cutaneous`, `pulmonary`, `renal`, `muscular` | Cannot assign low vs moderate vs high without Seror Table 3 (fever °C, node cm, 28-joint synovitis, CK×ULN, cytopenia bins, IgG, DLCO/FVC, proteinuria). CIWA-style ordinals. | Seror R et al. Ann Rheum Dis. 2010;69:1103 Table 3; Seror 2015 ESSDAI/ESSPRI user guide | domain weights, maxLevel 2 vs 3, level×weight sum 0–123, bands <5 / 5–13 / ≥14;… |
| `waterlow-scale` | Waterlow Pressure Ulcer Risk Score | `wave4-icu-vent.ts` | `sexAge`, `build`, `neuro`, `skin` | Official Waterlow adds sex (M 1 / F 2) plus age (14–49:1 … 81+:5). A 70-year-old woman is 2+3=5; UI offers typical 3–4 as a single 4. Male/Female options omit age. Build lacks BMI… | Waterlow J. Nurs Times. 1985; official Waterlow score card (sex+age additive; BMI build; neuro 4–6) | ten-field sum, thresholds 10 / 15 / 20; do not split sex and age into new input… |
| `phoenix-sepsis-simp` | Phoenix Sepsis Criteria (Simplified Educational) | `wave6-em-peds.ts` | `resp`, `cv`, `coag`, `neuro` | UI invokes official Phoenix thresholds then withholds them (platelets, INR, D-dimer, fibrinogen, PF/SF, IMV, lactate 5 and 11, age-MAP, GCS ≤10, fixed pupils). Educational 0–2 bin… | Schlapbach LJ et al. JAMA 2024 Phoenix consensus table; Sanchez-Pinto LN et al. JAMA 2024 Table 2 | 0–2 domain values, organ sum, sepsis = infection AND organ ≥2, shock = sepsis A… |
| `heart-score` | HEART Score for Major Cardiac Events | `cardiology.ts` | `history`, `ecg`, `risk` | History has no typical vs nonspecific elements, so 0 vs 1 vs 2 is gestalt and needs a HEART card. ECG 1-point officially includes LBBB, paced rhythm, LVH strain, and digoxin effec… | Six AJ et al. Neth Heart J 2008; Backus HEART flyer (heartscore.nl) risk-factor list (BMI >30, FHx); original ECG categ… | 0–2 per domain, 0–10 total, MACE bands 0–3 / 4–6 / 7–10, troponin ×ULN bins |
| `bedsides-pews` | Bedside PEWS (Pediatric Early Warning) | `wave3-peds-ob.ts` | `hr`, `rr`, `sbp`, `respEffort` | Bedside PEWS cannot be scored without the Parshuram age-band vital tables. 'Mildly/moderately/severely abnormal' has no operational cutoff; a 2-month-old HR of 160 is not the same… | Parshuram CS et al. Bedside PEWS appendix (Pediatr Child Health 2011 Appendix B; PMC3077313); original item table PMC27… | option values 0–3, calculate() sum, escalation bands 0–2 / 3–4 / 5–6 / ≥7 |
| `pas-asthma` | Pediatric Asthma Score (PAS) | `wave3-peds-ob.ts` | `rr` | Published PAS pathways score RR with age-specific breaths/min, not 'mildly/markedly elevated'. A bedside user cannot choose 1 vs 2 vs 3 without an external age table (common 2–3 y… | Kelly CS et al. Ann Allergy Asthma Immunol 2000; Children's Mercy PAS table; FPNotebook Pediatric Asthma Score | 1–3 item values, 5–15 total, mild ≤7 / moderate 8–11 / severe 12–15 bands |
| `exchange-transfusion-threshold` | Exchange Transfusion Threshold (Approximate) | `wave5-peds-id.ts` | `risk` | User cannot choose the band that drives the threshold without AAP 2022 neurotoxicity-risk factors and GA mapping. Phototherapy in the same file at least embeds GA in labels. | Kemper AR et al. Pediatrics 2022 AAP hyperbilirubinemia CPG (PMID 35927462) Table 2 and exchange figures 5–6 | threshold math, ABE lowering logic, option values low/med/high |
| `bilag-2004-index` | BILAG-2004 (Domain Grades) | `wave7-rheum-activity.ts` | `constitutional`, `mucocutaneous`, `neuro`, `msk`, `cardiorespiratory`, `gi`, `ophthalmic`, `renal` | A–C are mild/moderate/severe with no organ rules. Cannot grade a domain without the copyrighted 97-item BILAG-2004 glossary. D vs E is the only operational pair. UI looks administ… | Isenberg DA et al. Rheumatology 2005 BILAG-2004; official BILAG-2004 glossary (University of Birmingham, copyright — po… | nine domains, A–E values, any-A / any-B / C-only / D–E classification; do not a… |

### Wave A long-form (NIHSS class)

### `gcs` — Glasgow Coma Scale (GCS)

| | |
|---|---|
| File | [`src/data/calculators/critical-care.ts`](src/data/calculators/critical-care.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `eye`, `verbal`, `motor` |
| Do not change | option values, calculate() E+V+M sum, max 15, risk bands ≤8 / 9–12 / 13–15 |
| Research | Teasdale & Jennett Lancet 1974; GCS 2014 relaunch (glasgowcomascale.org) stimulus method and NT/C/T coding |

**Current UI:** Labels only (Spontaneous / To speech / To pain; Oriented / Confused; Localizes / Withdraws). No helpText, no option.description, no untestable path.

**Why the user cannot score from the calculator:** Cannot administer GCS from the UI: pain-stimulus method (fingernail-bed vs trapezius/supraorbital; localization = hand above clavicle), what oriented means, two-step motor command, intubated verbal (VT / NT — do not silently assign 1), eyes untestable from swelling (C). 2014 wording is to sound / to pressure.

**Implement (schema only — helpText / option.description / label text):** Keep values 1–4 / 1–5 / 1–6. Add helpText + option.description with Teasdale 2014 prompts. Do not add a new numeric VT value. Verbal 1 description: record VT if intubated. Eye 1: record C/NT if lids swollen. Motor helpText: two-part command; trapezius/supraorbital for localization; fingernail-bed for flexion vs extension; best arm.

### `pgcs` — Pediatric GCS

| | |
|---|---|
| File | [`src/data/calculators/emergency-misc.ts`](src/data/calculators/emergency-misc.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `eye`, `verbal`, `motor` |
| Do not change | option values 1–4 / 1–5 / 1–6, calculate() E+V+M sum, bands ≤8 / 9–12 / 13–15 |
| Research | Reilly PL et al. Childs Nerv Syst 1988 paediatric GCS; James/PALS-ATLS infant vs child table; Teasdale 2014 glasgowcomascale.org stimulus and NT/C/T |

**Current UI:** Eye 4 Spontaneous / 3 To speech / 2 To pain / 1 None. Verbal mixes infant+child ('5 — Coos/babbles / oriented'). Motor mixes '6 — Normal spontaneous / obeys' and '5 — Withdraws to touch / localizes'. No helpText, no option.description, no untestable path.

**Why the user cannot score from the calculator:** Cannot administer pGCS from the UI: which column by age; pain-stimulus method; what oriented/obeys mean; infant motor 5 is withdraws-to-touch not localization; intubated VT; eyes untestable from swelling (C). Same gap as adult GCS, worse because two developmental scales are collapsed.

**Implement (schema only — helpText / option.description / label text):** Keep values 4/3/2/1, 5–1, 6–1. Do not add a numeric VT. Verbal helpText: infant descriptors if preverbal/<2 y; child if talking; oriented = name, place, month; ETT/tracheostomy = record VT, do not assign 1 for the tube. Verbal descriptions: 5 coos/babbles or oriented; 4 irritable cry or confused sentences; 3 cries to pain / inappropriate words; 2 moans to pain / incomprehensible; 1 none (exclude tube). Motor helpText: infant 6 = normal spontaneous, 5 = withdraws to touch; child 6 = two-part command, 5 = localizes (hand above clavicle); trapezius/supraorbital for localization; fingernail-bed for flexion vs extension; best arm. Eye: Teasdale 2014 spontaneous → sound → pressure; C/NT if lids swollen, not 1.

### `nihss` — NIH Stroke Scale (NIHSS)

| | |
|---|---|
| File | [`src/data/calculators/gi-neuro-psych.ts`](src/data/calculators/gi-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `loc`, `locQ`, `locC`, `gaze`, `visual`, `facial`, `armL`, `armR`, `legL`, `legR`, `ataxia`, `sensory`, `language`, `dysarthria`, `extinction` |
| Do not change | option values, calculate() 15-item sum, max 42 |
| Research | NINDS NIH Stroke Scale English instructions (NIH-Stroke-Scale_updatedFeb2024_508.pdf); Brott T et al. Stroke 1989 PMID 2749846; MDCalc NIHSS item help |

**Current UI:** All 15 items are terse ordinals only (1b/1c both/one/neither correct; motor Drift/Some effort vs gravity; language Mild–moderate/Severe). No helpText, no option.description, no maneuvers, no UN rules.

**Why the user cannot score from the calculator:** Clinician cannot administer NIHSS from the UI. Must recall month+age questions (not where/president), eyes+grip commands, 10 s/90° arm and 5 s/30° leg holds, NIHSS picture/word cards, and exceptions (intubated 1b=1, aphasic 1b=2, amputation=UN not 4, ataxia 0 if paralyzed, dysarthria UN if intubated, item 11 never UN).

**Implement (schema only — helpText / option.description / label text):** Keep values 0–4 and 15-item sum (max 42). Do not add a scored UN option. Add helpText + option.description per item. 1a loc helpText: must pick a score if ET tube/language barrier/bandages; 3 only if no movement other than reflex posturing to noxious stimulation. Descriptions: 0 Alert keenly responsive; 1 arousable by minor stimulation to obey/answer/respond; 2 repeated or strong/painful stimulation for non-stereotyped movement; 3 reflex only or flaccid areflexic. 1b locQ helpText: ask month and age; grade first answer only; intubated/severe dysarthria/language barrier → 1; aphasic/stuporous no comprehension → 2. 1c locC helpText: open and close eyes, then grip and release the non-paretic hand; substitute another one-step command if hand unusable; credit unequivocal attempt limited by weakness. 2 gaze helpText: voluntary or oculocephalic, not calorics. 1 Partial gaze palsy not forced deviation; 2 forced deviation or total paresis not overcome by oculocephalic. 3 visual helpText: confrontation upper+lower quadrants; remaining eye if unilateral blindness; any-cause blindness → 3. 4 facial helpText: show teeth or raise eyebrows and close eyes; grimace to pain if stuporous. 1 flattened nasolabial fold/asymmetric smile; 2 near-total lower-face paralysis; 3 absent upper and lower face movement. 5a/5b arm helpText: palms down 90° sitting or 45° supine × 10 s, non-paretic first; drift = falls before 10 s but does not hit bed; amputation/shoulder fusion = UN off-form (do not enter 0 or 4). 6a/6b leg: 30° × 5 s; hip fusion/amputation = UN. 7 ataxia helpText: FNF + heel-shin; score only if out of proportion to weakness; paralyzed or does not understand → 0; amputation = UN. 8 sensory helpText: pinprick (noxious if impaired consciousness); face+arm+leg; 1 aware of touch but dull; 2 unaware of touch. 9 language helpText: cookie-theft picture, naming card, sentence reading; 1a=3 → language 3. 10 dysarthria helpText: repeat Mama, tip-top, fifty-fifty, thanks, huckleberry, baseball player, hula hoop; intubated = UN off-form. 11 extinction helpText: visual+tactile DSS; never UN; aphasia attending both sides → 0. Descriptions: 1 inattention in one modality; 2 profound in more than one modality or does not recognize own hand.

### `mini-cog` — Mini-Cog

| | |
|---|---|
| File | [`src/data/calculators/missing-neuro-psych.ts`](src/data/calculators/missing-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `recall`, `clock` |
| Do not change | option values 0–3 and 0/2, calculate() cutoff ≤2 positive, max 5 |
| Research | Borson S et al. J Am Geriatr Soc 2003 PMID 14511167; Mini-Cog.com (Soo Borson) instructions |

**Current UI:** Recall 0–3 words spontaneously; clock Abnormal 0 vs Normal 2 with brief descriptions. Word list, 11:10, and register→clock→recall sequence only in pearls.

**Why the user cannot score from the calculator:** Cannot administer Mini-Cog from the Inputs panel. Missing 3-word list, uncued recall after clock distractor, and required clock time. 'Poor spacing' as abnormal can over-call official Mini-Cog pass clocks.

**Implement (schema only — helpText / option.description / label text):** helpText on recall: say 3 unrelated words (banana, sunrise, chair — or apple, watch, penny); patient repeats; then clock; then uncued recall; 1 point per word. helpText on clock: draw a clock, all numbers, hands at 10 past 11 (11:10). Normal (2)= numbers in correct sequence and approx. correct position (12/3/6/9 in place) AND hands show 11:10; refusal or any other clock = 0; no partial credit; hand-length difference not required.

### `clock-draw` — Clock Drawing Score (0–5)

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `score` |
| Do not change | option values 0–5, calculate() bands (≤3 abnormal), max 5 |
| Research | Shulman KI Int J Geriatr Psychiatry 1993/2000 0–5 clock-drawing scoring; administration '10 past 11' |

**Current UI:** Options: 5 perfect; 4 minor visuospatial errors; 3 inaccurate time / moderate errors; 2 moderate number disorganization; 1 severe disorganization; 0 no reasonable clock. helpText only notes other scales. 11:10 is in pearls, not on the form.

**Why the user cannot score from the calculator:** User cannot administer the test: Shulman CDT requires the command to put numbers in and set hands to 10 past 11. Score 3 is wrong 11:10 with preserved layout, not generic moderate errors. Score 4 is unanchored.

**Implement (schema only — helpText / option.description / label text):** helpText: Give a blank page (or pre-drawn circle). Say: 'Draw a clock. Put in all the numbers. Set the hands to 10 minutes past 11 (11:10).' option.description: 5 circle+numbers+hands at 11:10 with longer minute hand; 4 11:10 correct with minor spacing errors; 3 layout OK but 11:10 wrong; 2 numbers crowded/missing/reversed so 11:10 impossible; 1 numbers not in recognizable sequence; 0 no reasonable clock. Do not change 0–5 values.

### `hoehn-yahr` — Hoehn and Yahr Stage

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `stage` |
| Do not change | stage values 0 / 1 / 1.5 / 2 / 2.5 / 3 / 4 / 5, calculate() bands |
| Research | Hoehn MM, Yahr MD. Neurology 1967; modified H&Y; MDS-UPDRS postural-instability pull-test method |

**Current UI:** Stage labels name unilateral/bilateral/pull-test recovery/wheelchair. Pearl says pull test defines stage 3 but the form does not say how to do it or how many steps count as recovery vs failure.

**Why the user cannot score from the calculator:** Modified H&Y 2 vs 2.5 vs 3 is an exam maneuver (retropulsion/pull test). Without stance, warning, force of pull, step count, and catching a fall, a non-movement-disorder clinician cannot stage from the UI.

**Implement (schema only — helpText / option.description / label text):** helpText on stage: Pull test (retropulsion): patient stands, feet comfortably apart, eyes open. Warn that you will pull the shoulders backward and they may take steps. Stand behind, ready to catch. After a gentle demonstration pull, deliver one brisk pull. 0–2 steps = recovers (stage ≤2 if otherwise bilateral); ≥3 steps but recovers unassisted = modified 2.5; would fall if not caught = stage 3. Stage 1.5 = unilateral plus axial (neck/trunk) involvement. Optional option.description repeating the step-count rule on 2 / 2.5 / 3.

### `slums` — SLUMS Cognitive Score

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `score` |
| Do not change | 0–30 total, education-adjusted bands (HS+ 27–30 / 21–26 / ≤20; <HS 25–30 / 20–24 / ≤19) |
| Research | Tariq SH et al. Am J Geriatr Psychiatry 2006; official SLUMS examination PDF (Saint Louis University / VA) |

**Current UI:** Number entry SLUMS total 0–30 plus education select. Described as interpreter of an already-administered total.

**Why the user cannot score from the calculator:** SLUMS is free for clinical use (SLU/VA), not an MMSE/MoCA copyright wall. User still needs the protocol card (orientation, $100 story, 1-minute animals, 5-object recall, reverse digits, clock at ten to eleven, figures, Jill/Jack paragraph). Cannot administer from the UI.

**Implement (schema only — helpText / option.description / label text):** Replace total-only with official 11 SLUMS items as selectInput/numberInput using published point bands (animals 0–4/5–9/10–14/≥15; clock hour markers vs time; story questions). Keep education select for cutoff bands. helpText on delayed recall: the five objects named at registration. RESEARCH official SLU/VA PDF item wording and points; reprint only per SLU permission note.

### `brief-confusion` — bCAM Simplified (Brief Confusion Assessment)

| | |
|---|---|
| File | [`src/data/calculators/wave4-neuro-psych.ts`](src/data/calculators/wave4-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `f1`, `f2`, `f3`, `f4` |
| Do not change | four yes/no keys, positive = F1 AND F2 AND (F3 OR F4) |
| Research | Han JH et al. Ann Emerg Med. 2013; Vanderbilt bCAM Training Manual / flowsheet 2015 (copyright Vanderbilt/HELP — keep to published bedside prompts) |

**Current UI:** Four yes/no features. F2 mentions e.g. months backwards / digit span errors but not the task or error rule. F4 is illogical answers / unclear flow with no questions or command. F1 has no time window. In-app cam-icu already prints the exam; bCAM does not.

**Why the user cannot score from the calculator:** Cannot administer bCAM from the UI. Official F2 is months backwards December to July (>1 error or cannot complete). F4 is four yes/no questions plus a two-step finger command (≥2 errors). F1 is acute change or fluctuation over the prior 24 h from baseline.

**Implement (schema only — helpText / option.description / label text):** Keep four booleans and F1+F2 and (F3 or F4) logic. F1 helpText: acute change from baseline or fluctuating course over the past 24 h (nurse/family/chart). F2: ‘Name the months backwards from December to July’; inattention = any error, >15 s pause/perseveration, or cannot start. F3 optional: any RASS other than 0; if unarousable do not diagnose this round. F4 Set A: Will a stone float on water? Are there fish in the sea? Does 1 lb weigh more than 2 lb? Can you use a hammer to pound a nail? Then ‘Hold up this many fingers’ (show 2); ‘Now the same with the other hand’ (do not demonstrate). Disorganized = ≥2 errors. Do not reprint a copyrighted CAM worksheet beyond published bCAM prompts.

### `c-stat` — C-STAT (Cincinnati Stroke Triage Assessment Tool)

| | |
|---|---|
| File | [`src/data/calculators/wave4-neuro-psych.ts`](src/data/calculators/wave4-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `loc` |
| Do not change | 2+1+1 weights, ≥2 cutoff, keep coded OR (not AND) for the LOC item |
| Research | Katz BS et al. Stroke. 2015 (CPSSS/C-STAT); AHA ASLS C-STAT checklist (age, month, close eyes, open/close hands) |

**Current UI:** LOC label is ‘incorrect on ≥1 of 2 orientation questions OR fails ≥1 of 2 commands’ with no questions or commands. Gaze is preference/conjugate deviation present. Arm already says cannot hold against gravity for 10 s.

**Why the user cannot score from the calculator:** NIHSS 1b/1c-class failure: cannot score LOC without the two questions (age, month) and two commands (close eyes; open and close the hand / make a fist). Gaze lacks the cannot-cross-midline rule.

**Implement (schema only — helpText / option.description / label text):** Keep yes/no and weights (gaze 2, arm 1, loc 1). loc helpText: Questions — What is your age? What month is it? Commands — Close your eyes. Make a fist / open and close your hand. Score Yes if ≥1 question wrong OR ≥1 command failed (this tool’s coded rule). Do not silently switch to AND wording used on some EMS cards. Gaze helpText: present if conjugate deviation; cannot shift gaze past midline.

### `race-scale` — RACE Scale (Prehospital LVO)

| | |
|---|---|
| File | [`src/data/calculators/wave4-neuro-psych.ts`](src/data/calculators/wave4-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `face`, `arm`, `leg`, `gaze`, `agnosia` |
| Do not change | option values, cortical-branch logic by hemiparesis side, sum 0–9, cutoff ≥5 |
| Research | Pérez de la Ossa N et al. Stroke. 2014; racescale.org table; NJ/SC EMS RACE scoring cards |

**Current UI:** Face/arm/leg are Absent–Mild–Moderate/severe or Normal-to-mild–Moderate–Severe with no maneuver or hold times. Gaze Absent/Present. Agnosia ‘recognizes arm and impairment’ without prompts. Aphasia already names close eyes + make a fist.

**Why the user cannot score from the calculator:** Cannot administer RACE from the UI. Official scoring needs smile/show teeth; arm 90° sitting or 45° supine scored by hold >10 s; each leg 30° supine scored by hold >5 s; gaze present if cannot shift past midline; agnosia prompts ‘Whose arm is this?’ and ‘Can you move your arm?’. Mild vs moderate/severe is otherwise guesswork — same class of failure as NIHSS 1b/1c.

**Implement (schema only — helpText / option.description / label text):** Keep values 0–2 / 0–1. Face helpText: ask to show teeth or smile; 0 symmetrical, 1 slightly asymmetrical, 2 completely asymmetrical. Arm: extend 90° sitting or 45° supine, palms up, weaker arm; 0 upholds >10 s, 1 <10 s, 2 cannot raise / drops immediately. Leg: supine raise 30°; 0 upholds >5 s, 1 <5 s, 2 cannot raise. Gaze: if forced to one side, ask to look the other way; present = cannot shift past midline. Agnosia (left hemiparesis): show paretic arm ‘Whose arm is this?’ then ‘Can you move your arm?’; 0 recognizes arm AND weakness, 1 asomatognosia OR anosognosia, 2 both.

### `ciwa` — CIWA-Ar (Alcohol Withdrawal)

| | |
|---|---|
| File | [`src/data/calculators/gi-neuro-psych.ts`](src/data/calculators/gi-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `nausea`, `tremor`, `sweats`, `anxiety`, `agitation`, `tactile`, `auditory`, `visual`, `headache`, `orientation` |
| Do not change | option values 0–7 (orientation 0–4), calculate() sum, max 67 |
| Research | Sullivan JT et al. Br J Addict 1989 PMID 2597811 (CIWA-Ar Appendix A); MDCalc CIWA-Ar |

**Current UI:** Ten selects with options literally "0"…"7" (orientation "0"…"4"). No prompts, observation instructions, or anchors.

**Why the user cannot score from the calculator:** Cannot score without Sullivan 1989 or a pocket card. Official 0/1/4/7 (and all orientation ranks) have mandatory operational anchors and several items have required questions. Intermediates 2/3/5/6 are blank in the official key (interpolation) and can stay unlabeled.

**Implement (schema only — helpText / option.description / label text):** Keep values 0–7 / orientation 0–4 and 10-item sum (max 67). Add helpText (prompt + observe) and option.description with Sullivan wording. Nausea helpText: Ask 'Do you feel sick to your stomach? Have you vomited?' 0 no nausea and no vomiting; 1 mild nausea no vomiting; 4 intermittent nausea with dry heaves; 7 constant nausea, frequent dry heaves and vomiting. Tremor helpText: arms extended fingers spread. 0 no tremor; 1 not visible but felt fingertip to fingertip; 4 moderate with arms extended; 7 severe even with arms not extended. Sweats: 0 no sweat visible; 1 barely perceptible, palms moist; 4 beads of sweat on forehead; 7 drenching sweats. Anxiety helpText: Ask 'Do you feel nervous?' 0 at ease; 1 mildly anxious; 4 moderately anxious or guarded so anxiety inferred; 7 acute panic as in severe delirium. Agitation: 0 normal activity; 1 somewhat more than normal; 4 moderately fidgety and restless; 7 paces during most of interview or constantly thrashes. Tactile helpText: Ask itching/pins and needles/burning/numbness/bugs crawling. 0 none; 1–3 very mild/mild/moderate itching or paresthesia; 4–6 moderately severe/severe/extremely severe hallucinations; 7 continuous hallucinations. Auditory helpText: Ask about harsh/frightening sounds or hearing things not there. 0 not present; 1–3 harshness/ability to frighten; 4–7 hallucinations as tactile. Visual helpText: Ask if light too bright/color different/hurt eyes/seeing things not there. 0 not present; 1–3 sensitivity; 4–7 hallucinations. Headache helpText: Ask 'Does your head feel different? Band around your head?' Do not rate dizziness. 0 not present through 7 extremely severe. Orientation helpText: Ask 'What day is this? Where are you? Who am I?' 0 oriented and can do serial additions; 1 cannot do serial additions or uncertain about date; 2 disoriented for date by ≤2 calendar days; 3 disoriented for date by >2 calendar days; 4 disoriented for place and/or person.

### Remaining P0 long-form

These are equally unscorable from the UI. Implement after checking the Research source.

### `pecarn-head` — PECARN Head Injury (Simplified)

| | |
|---|---|
| File | [`src/data/calculators/emergency-misc.ts`](src/data/calculators/emergency-misc.ts) |
| Priority | **P0** |
| Pattern | `abbreviated-stem` |
| Inputs | `gcs14`, `palpable`, `loc`, `nonfrontal`, `notActing` |
| Do not change | keys, yes/no values, high-risk = gcs14 OR palpable → 2, age-specific intermediate OR logic, very-low-risk = 0. Do not add new scored inputs |
| Research | Kuppermann N et al. Lancet 2009;374:1160–1170 PECARN ciTBI rule (AMS and severe-mechanism footnotes) |

**Current UI:** Age <2 vs ≥2. High-risk: 'GCS = 14 or other signs of AMS'; 'Palpable skull fracture (or basilar signs if ≥2y)'. Intermediate mashed: 'LOC ≥5 sec (<2y) or any LOC/vomiting/severe HA/severe mechanism (≥2y)' and 'Non-frontal hematoma (<2y) or history of vomiting/severe HA etc.'

**Why the user cannot score from the calculator:** Cannot apply PECARN from the UI. AMS, basilar signs, and severe mechanism are undefined; 'etc.' is a protocol-card tell. Age-specific predictors are OR-bundled so <2y and ≥2y lists bleed (vomiting/HA on both loc and nonfrontal).

**Implement (schema only — helpText / option.description / label text):** Keep five yes/no keys and 0/1/2 branching. gcs14 helpText: PECARN AMS = GCS 14 or agitation, somnolence, repetitive questioning, slow response to verbal communication. palpable: <2y palpable skull fracture; ≥2y hemotympanum, raccoon eyes, Battle sign, CSF oto/rhinorrhea. loc: Yes if <2y LOC ≥5 s, ≥2y any LOC, OR severe mechanism — MVC ejection/death of passenger/rollover; unhelmeted pedestrian/bicyclist struck by motor vehicle; fall >3 ft (<2y) or >5 ft (≥2y); head struck by high-impact object. nonfrontal: drop 'etc.'; label 'Non-frontal hematoma (<2y) or vomiting / severe headache (≥2y)'. notActing helpText: <2y only. Age helpText: blunt trauma, GCS 14–15, within 24 h; exclude trivial injury and GCS ≤13.

### `framingham-hf` — Framingham Heart Failure Criteria

| | |
|---|---|
| File | [`src/data/calculators/extra.ts`](src/data/calculators/extra.ts) |
| Priority | **P0** |
| Pattern | `abbreviated-stem` |
| Inputs | `pnd`, `orthopnea`, `rales`, `cardiomegaly`, `edemaPulm`, `s3`, `jvd`, `weightLoss`, `ankleEdema`, `nightCough`, `doe`, `hepato`, `pleural`, `hr120`, `vc` |
| Do not change | the 8 major / 7 minor keys; meets = 2 major OR 1 major + 2 minor; option values |
| Research | McKee PA et al. N Engl J Med. 1971 PMID 5122894; Ho KK Framingham HF operational definitions (cardiomegaly on CXR, CVP >16 cm H2O, weight loss with treatment); MDCalc Framingham Heart Failure Criteria |

**Current UI:** pnd = 'Major: PND' only. orthopnea = 'Major: Orthopnea (sometimes minor in variants) / neck vein distention' (fused + confusing variant note). jvd = 'Major: Increased venous pressure / hepatojugular reflux' (two majors fused). cardiomegaly/rales/ankleEdema/vc have no operational anchors. No helpText.

**Why the user cannot score from the calculator:** Cannot map a real exam to published Framingham items. PND is an unexplained abbreviation. Two checkboxes fuse distinct findings so the user cannot tell whether to tick for either or both. Official McKee list treats PND or orthopnea as one major and neck-vein distention, CVP >16 cm H2O, and HJR as separate majors — labels do not disclose this helper's grouping. Cardiomegaly is radiographic; ankle edema is bilateral; VC drop is from recorded maximum. Minors should not count if due to another disease.

**Implement (schema only — helpText / option.description / label text):** Do not split/merge inputs (would change calculate() sums). Expand labels + helpText: pnd = 'Major: Paroxysmal nocturnal dyspnea (PND)' with night-time orthopneic awakening; orthopnea = 'Major: Orthopnea OR neck-vein distention' tick once if either; jvd = 'Major: Increased venous pressure (>16 cm H2O) OR hepatojugular reflux' tick once; rales = pulmonary rales/crackles; cardiomegaly = radiographic (CXR CTR >0.5); edemaPulm = acute pulmonary edema; weightLoss already has >4.5 kg in 5 days — add 'in response to HF treatment'; ankleEdema = bilateral; doe = dyspnea on ordinary exertion; vc = vital capacity decreased by 1/3 from maximum recorded; hr120 = tachycardia HR >120. Pearl: count minors only if not explained by another condition; official McKee grouping differs from these fused boxes — do not retune calculate() in this pass.

### `basdai` — BASDAI (Ankylosing Spondylitis)

| | |
|---|---|
| File | [`src/data/calculators/wave4-heme-onc.ts`](src/data/calculators/wave4-heme-onc.ts) |
| Priority | **P0** |
| Pattern | `abbreviated-stem` |
| Inputs | `q1`, `q2`, `q3`, `q4`, `q5`, `q6` |
| Do not change | 0–10 ranges, stiffness mean (Q5+Q6)/2, 0.2 weighting, ≥4 active-disease band |
| Research | Garrett S et al. J Rheumatol. 1994 PMID 7699630; NASS/RheumInfo BASDAI form (THE PAST WEEK) |

**Current UI:** Six 0–10 inputs labeled Q1 Fatigue / Q2 Spinal pain / Q3 Peripheral joint pain/swelling / Q4 Enthesitis / Q5 Severity of morning stiffness / Q6 Duration of morning stiffness. Only Q6 has 0=0 h, 10=2 h helpText. No past-week window.

**Why the user cannot score from the calculator:** BASDAI is a patient questionnaire. Cannot administer from 'Q1 Fatigue'. Missing last-week window; Q2 is neck/back/hip pain not generic spinal; Q3 is joints other than neck/back/hips; Q4 is tender-to-touch discomfort not the word enthesitis. Same class of defect as NIHSS 1b.

**Implement (schema only — helpText / option.description / label text):** Keep 0–10 values and 0.2×(Q1+Q2+Q3+Q4+(Q5+Q6)/2). Shared helpText: all 6 items = PAST WEEK, 0 none to 10 very severe except Q6. Labels: Q1 overall fatigue/tiredness; Q2 overall AS neck, back, or hip pain; Q3 pain/swelling in joints OTHER THAN neck, back, or hips; Q4 discomfort from areas tender to touch or pressure; Q5 LEVEL of morning stiffness from waking; Q6 keep 0=0 h / 10=2 h or more. If copyright review of Bath indices forbids reprint, keep numeric entry and point to the official sheet.

### `saps-iii-simp` — SAPS 3

| | |
|---|---|
| File | [`src/data/calculators/wave6-psych-sleep.ts`](src/data/calculators/wave6-psych-sleep.ts) |
| Priority | **P0** |
| Pattern | `abbreviated-stem` |
| Inputs | `reason`, `infection`, `gcs`, `wbc`, `vent` |
| Do not change | Point values, 16-point offset, global logit, comorbidity max-of rule |
| Research | SAPS 3 Admission Score Sheet (saps3.org); Moreno RP et al. Intensive Care Med. 2005 PMID 16132893; Metnitz PG et al. PMID 16132892 |

**Current UI:** Reason options terse (Focal deficit, Coma/delirium, Intracranial mass effect). Infection None/Nosocomial/Respiratory/Nosocomial respiratory. GCS 'Lowest GCS (admission hour)'. Leukocytes unlabeled highest vs lowest. Vent 'informational if oxygenation set'.

**Why the user cannot score from the calculator:** Box II cannot be scored without the official SAPS 3 sheet. Coma/delirium hides coma, stupor, obtunded, vigilance disturbance, confusion, agitation, delirium. Focal deficit not specified as neurologic. Intracranial mass effect has no data-dictionary definition. Infection is additive (4+5=9) with no helpText. GCS should be estimated lowest if sedated/intubated. Leukocytes official sheet says lowest.

**Implement (schema only — helpText / option.description / label text):** Expand option.label + option.description from Moreno/Metnitz score sheet (do not add missing reasons/surgery-site — formula completeness out of scope). Infection helpText: nosocomial and respiratory additive (both=9). GCS helpText: lowest estimated GCS in admission hour; estimate verbal if intubated/sedated. Leukocytes helpText: per official sheet (lowest; ≥15 ×10³/µL = 2). Vent helpText: Yes with default oxygenation assigns ventilated PaO2/FiO2 ≥100 points.

### `wells-dvt` — Wells Criteria for DVT

| | |
|---|---|
| File | [`src/data/calculators/cardiology.ts`](src/data/calculators/cardiology.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `calf`, `cancer`, `tenderness`, `bedridden` |
| Do not change | +1 items, −2 alternative diagnosis, two-tier ≤0 vs ≥1 logic |
| Research | Wells PS et al. Lancet 1997; NEJM 2003 revised Wells DVT model (12-week anesthesia wording; 10 cm landmark) |

**Current UI:** Calf swelling ≥3 cm vs asymptomatic leg with no measurement site. Active cancer has no time/palliative rule. Localized tenderness along deep venous system does not say which veins. Recently bedridden ≥3 days or major surgery within 12 weeks omits anesthesia.

**Why the user cannot score from the calculator:** The calf item is a tape-measure exam: official rule is ≥3 cm difference 10 cm below the tibial tuberosity. Active cancer in Wells is treatment ongoing, within 6 months, or palliative. Tenderness is along femoral/popliteal/posterior tibial distribution. Major surgery is surgery requiring general or regional anesthesia.

**Implement (schema only — helpText / option.description / label text):** helpText on calf: Measure both calves 10 cm below the tibial tuberosity; Yes if symptomatic side is ≥3 cm larger. If both legs symptomatic, use the more symptomatic side. cancer: Treatment ongoing, treated in the past 6 months, or palliative. tenderness: Palpate along the deep veins (femoral canal groin-to-mid-thigh, popliteal fossa, posterior calf) — not superficial or varicose-vein pain. bedridden: Bedridden ≥3 days, or major surgery within 12 weeks requiring general or regional anesthesia. Boolean fields: use helpText (option.description is not rendered on yesNo).

### `duke-criteria` — Modified Duke Criteria (IE Helper)

| | |
|---|---|
| File | [`src/data/calculators/extra.ts`](src/data/calculators/extra.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `bloodCx`, `echo`, `predisposing`, `vascular`, `immuno`, `microMinor` |
| Do not change | yes/no values; major/minor counts; definite = 2 major OR 1 major+3 minor OR 5 minor; possible = 1 major+1 minor OR 3 minor; fever cutoff already on label |
| Research | Li JS et al. Clin Infect Dis. 2000 PMID 10770721 definitions of terms; AHA endocarditis modified-Duke table; MDCalc Modified Duke |

**Current UI:** Seven yes/no flags. Major micro = 'Typical organism from 2 separate blood cultures (or equivalent major micro)'. Echo = 'Evidence of endocardial involvement (echo/new regurg)'. Vascular = 'emboli, Janeway, etc.'. Immuno = 'Osler, Roth, GN, RF'. Micro-minor = 'Microbiologic evidence not meeting major'. Only fever ≥38°C is operational. No helpText.

**Why the user cannot score from the calculator:** Cannot apply modified Duke from the UI. Missing typical-organism list, persistently positive-culture timing, Coxiella/antiphase I IgG >1:800 as major, echo definitions (oscillating mass/abscess/new prosthetic dehiscence/new regurgitation; changing preexisting murmur is not sufficient), predisposing heart conditions, full vascular list, that RF = rheumatoid factor not rheumatic fever, and what micro-not-meeting-major means.

**Implement (schema only — helpText / option.description / label text):** Keep yes/no and current definite/possible logic. Add helpText on each item with Li 2000 wording: bloodCx typical organisms (viridans strep, S. gallolyticus/bovis, S. aureus, HACEK, community-acquired enterococci without primary focus) plus persistently positive cultures (≥2 ≥12 h apart, or 3/majority of ≥4 with first–last ≥1 h) and Coxiella single culture or antiphase I IgG >1:800; echo oscillating mass/abscess/new partial prosthetic dehiscence/new regurgitation (changing murmur not sufficient); predisposing = prior IE/prosthetic/unrepaired cyanotic CHD/significant native-valve disease or IDU; vascular = major arterial emboli, septic pulmonary infarcts, mycotic aneurysm, ICH, conjunctival hemorrhages, Janeway; immuno = GN, Osler, Roth, rheumatoid factor; microMinor = positive culture not meeting major or serology consistent with IE. Pearl: clinical Li 2000 only, not 2023 ISCVID.

### `jones-criteria` — Jones Criteria (Acute Rheumatic Fever)

| | |
|---|---|
| File | [`src/data/calculators/extra.ts`](src/data/calculators/extra.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `strep`, `carditis`, `arthritis`, `chorea`, `erythema`, `nodules`, `arthralgia`, `fever`, `elevatedAPR`, `prolongedPR` |
| Do not change | yes/no values; GAS gate in calculate(); initial-ARF rule 2 major or 1 major + 2 minor; do not add population-risk or recurrence inputs |
| Research | Gewitz MH et al. Circulation. 2015 PMID 25908771 — confirm fever 38.5 vs 38.0 and ESR 60 vs 30 from the Circulation table (some CDC/WHO secondary tables list 38.5°C for both). MDCalc Jones Criteria. |

**Current UI:** Ten yes/no items. Carditis/chorea/erythema/nodules/arthralgia/fever are bare names. Arthritis adds only '(migratory polyarthritis)'. APR = 'Elevated ESR/CRP' with no numbers. Fever has no °C cutoff. No 2015 low- vs moderate/high-risk stratum. No helpText.

**Why the user cannot score from the calculator:** Jones 2015 cannot be administered from this checklist. Missing population-risk stratum (changes joint findings and fever/ESR cutoffs), subclinical echo carditis, moderate/high-risk monoarthritis, fever ≥38.5°C vs ≥38.0°C, ESR ≥60 vs ≥30 and CRP ≥3.0 mg/dL, double-counting rules (arthralgia vs arthritis; PR vs carditis), erythema-marginatum and nodule exam descriptions, and that isolated chorea/indolent carditis may not need GAS (UI still gates on strep — do not change calculate()).

**Implement (schema only — helpText / option.description / label text):** Keep 10 yes/no flags and 2-major / 1-major+2-minor initial-ARF logic; do not add a risk-stratum input. helpText: strep remains culture/rapid/ASO/anti-DNase B plus note chorea/indolent carditis exceptions are clinical; carditis = clinical valvulitis and/or subclinical echo carditis; arthritis = low-risk migratory polyarthritis only, moderate/high-risk mono- or polyarthritis; chorea = Sydenham; erythema = evanescent non-pruritic serpiginous truncal rash sparing face; nodules = firm painless over extensor/bony prominences; arthralgia = do not count if arthritis is major; fever = ≥38.5°C low-risk / ≥38.0°C moderate-high-risk; APR = ESR ≥60 or CRP ≥3.0 low-risk, ESR ≥30 moderate-high-risk; prolongedPR = for age, not if carditis is major. Pearl: low-risk = ARF <2/100,000 school-age or RHD ≤1/1000; recurrent ARF 3-minor path not implemented.

### `atlanta-pancreatitis` — Revised Atlanta Classification Helper

| | |
|---|---|
| File | [`src/data/calculators/missing-gi-liver.ts`](src/data/calculators/missing-gi-liver.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `organFailure` |
| Do not change | option values; calculate() mapping persistent→severe, transient or local/systemic→moderately severe, none→mild |
| Research | Banks PA et al. Gut 2013 revised Atlanta; modified Marshall table in that paper; MDCalc Atlanta |

**Current UI:** Select labeled 'Organ failure (respiratory, cardiovascular, or renal per modified Marshall)' with None / Transient (<48 hours) / Persistent (≥48 hours). Local and systemic complication items already list examples.

**Why the user cannot score from the calculator:** Cannot decide whether organ failure is present without the modified Marshall card. Thresholds (PaO2/FiO2 <300, creatinine ≥1.9 mg/dL, SBP <90 not fluid-responsive) are not on screen. Time windows for transient vs persistent are shown; the exam/lab definition is not.

**Implement (schema only — helpText / option.description / label text):** Keep values none/transient/persistent. Add helpText: organ failure = modified Marshall ≥2 in any system — respiratory PaO2/FiO2 <300; renal Cr ≥1.9 mg/dL (≥170 µmol/L); CV SBP <90 mmHg not fluid-responsive (off inotropes). Note FiO2 estimate for non-ventilated patients and CKD baseline caveat. Transient = <48 h; persistent = ≥48 h.

### `pediatric-ews` — Pediatric Early Warning Score (PEWS, simplified)

| | |
|---|---|
| File | [`src/data/calculators/missing-heme-id-nephro.ts`](src/data/calculators/missing-heme-id-nephro.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `cv`, `resp`, `behavior` |
| Do not change | 0–3 domain points, +2 oxygen item, calculate() sum, 0–2 / 3–4 / ≥5 bands |
| Research | Monaghan A. Paediatr Nurs 2005 Brighton PEWS; institutional Brighton age-band vital tables (do not invent a new PEWS) |

**Current UI:** CV: tachycardia +20 from normal / +30 HR or bradycardia, CRT seconds. Resp: RR normal / >10 / >20 above normal / ≥5 below normal and FiO2 ~30/40/50%. No age-normal HR/RR. Behavior Sleeping (1) vs Playing (0) with no sleep-vs-well cue.

**Why the user cannot score from the calculator:** Cannot apply +20/+30 from normal or RR vs normal without age-band vital tables. CRT method unstated. Sleeping=1 is a Monaghan rule people will skip.

**Implement (schema only — helpText / option.description / label text):** helpText cv/resp with compact age-normal HR/RR (Monaghan/Brighton-style): HR neonate 110–160, infant 100–160, 1–3y 90–150, 4–6y 80–140, 7–12y 70–120, ≥13y 60–100; RR neonate 30–60, infant 30–50, toddler 25–35, preschool 20–30, school-age 18–25, adolescent 12–20. CRT: press 5 s on sternum or finger. behavior helpText: sleeping scores 1 even if otherwise well; 3 = lethargic/confused or reduced pain response.

### `euroscore-ii-simp` — EuroSCORE II

| | |
|---|---|
| File | [`src/data/calculators/wave2-cardiology.ts`](src/data/calculators/wave2-cardiology.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `critical`, `extracardiac`, `copd`, `endocarditis`, `poorMobility`, `nyha`, `ccs4`, `urgency`, `procedure`, `prevCardiacSx` |
| Do not change | Logistic intercept and β values, age Xi coding, dialysis vs CrCl bands, VSD original-coefficient handling, calculate() math |
| Research | Nashef et al. Eur J Cardiothorac Surg 2012 EuroSCORE II definitions; euroscore.org / MDCalc EuroSCORE II footnotes |

**Current UI:** Bare yes/no or class labels for critical state, extracardiac arteriopathy, COPD, active endocarditis, poor mobility, NYHA I–IV, CCS 4, urgency, and procedure weight. Age/CrCl/LVEF/recent MI already have helpText.

**Why the user cannot score from the calculator:** Official EuroSCORE II variable definitions are not on the form. User cannot decide critical preoperative state, arteriopathy, COPD, urgency, or NYHA/CCS class without Nashef Table 2 / euroscore.org.

**Implement (schema only — helpText / option.description / label text):** Add helpText and option.description with official wording. critical: VT/VF or aborted SCD, cardiac massage, ventilation, inotropes, IABP/VAD, anuria/oliguria <10 mL/h this admission. extracardiac: claudication, carotid occlusion or >50% stenosis, amputation for arterial disease, previous/planned intervention on aorta/limb/carotids. copd: long-term bronchodilators or steroids. endocarditis: still on antibiotics at surgery. poorMobility: severe impairment. prevCardiacSx: prior operation opening pericardium. NYHA I–IV activity descriptions. ccs4: angina at rest or any activity. Urgency: elective routine admission; urgent cannot go home this admission; emergency before next working day; salvage CPR en route/before induction. Procedure: count of major procedures (CABG+valve = 2). Do not change β coefficients.

### `pcl5` — PCL-5 PTSD Checklist

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `score` |
| Do not change | 0–4 item values, 0–80 total, provisional cutoff band ~31–33 |
| Research | NCPTSD PCL-5 (Blevins 2015; https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp). Public domain. |

**Current UI:** Number entry PCL-5 total (0–80) with helpText '20 items scored 0–4 (Not at all → Extremely).'

**Why the user cannot score from the calculator:** PCL-5 is public domain (National Center for PTSD) — not a copyright-total-only exception. The 20 DSM-5 symptom stems and 0–4 labels are missing, so the patient cannot be scored from the UI. Cluster rule is only in evidence text.

**Implement (schema only — helpText / option.description / label text):** Add 20 selectInputs with NCPTSD PCL-5 stems and options Not at all (0) / A little bit (1) / Moderately (2) / Quite a bit (3) / Extremely (4). helpText: Past month. Rate how much you have been bothered. Optional details line for cluster counts. Official stems are free to reproduce.

### `icans-grade` — ASTCT ICANS Grade

| | |
|---|---|
| File | [`src/data/calculators/wave2-oncology.ts`](src/data/calculators/wave2-oncology.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `ice` |
| Do not change | ICE 10→0 / 7–9→1 / 3–6→2 / 0–2→3 banding; max() across domains; consciousness/seizure/motor/ICP option values |
| Research | Lee DW et al. Biol Blood Marrow Transplant. 2019 ASTCT ICE tool and ICANS table (ICE 0 unarousable = grade 4) |

**Current UI:** ICE is a 0–10 number. helpText only 'Orientation 4 + naming 3 + following commands 1 + writing 1 + attention 1'. No prompts. Consciousness/seizure/motor/ICP labels already match ASTCT.

**Why the user cannot score from the calculator:** Cannot administer ICE from the UI. Missing year/month/city/hospital orientation, 3-object naming, command examples, standard sentence, serial 7-equivalent (100 by 10). Untestable rule omitted: ICE 0 because unarousable = grade 4, not the arousable ICE 0–2 band (grade 3). Entering ice=0 alone yields ICE-component 3.

**Implement (schema only — helpText / option.description / label text):** Keep one 0–10 numberInput. Expand helpText with ASTCT ICE card: Orientation year/month/city/hospital (1 each, 4); name 3 objects e.g. clock, pen, button (3); 'Show me 2 fingers' or 'Close your eyes and stick out your tongue' (1); write a standard sentence e.g. 'Our national bird is the bald eagle' (1); count backwards from 100 by 10 (1). If unarousable and unable to perform ICE: enter 0 and set consciousness to unarousable (grade 4). Optional motor description: deep focal weakness only, not mild weakness or isolated CN palsy.

### `clif-sofa` — CLIF-SOFA / CLIF-OF (Simplified Sum)

| | |
|---|---|
| File | [`src/data/calculators/wave3-gi-hep.ts`](src/data/calculators/wave3-gi-hep.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `brain`, `resp` |
| Do not change | option values 1–3, failure if score ≥3, ACLF grade logic, liver/kidney/coag/circ cutoffs |
| Research | EASL-CLIF CANONIC / Jalan CLIF-C OF table; West Haven criteria (AASLD/EASL HE); Moreau 2013 Gastroenterology |

**Current UI:** Brain options are HE 0 / HE I–II / HE III–IV with West Haven named but no grade findings. Resp label mentions PaO2/FiO2 or SpO2/FiO2; options list only PaO2/FiO2 >300 / 200–300 / <200 or ventilated.

**Why the user cannot score from the calculator:** Cannot assign West Haven grade from the UI (exam findings missing). SpO2/FiO2 CLIF-C OF equivalents are unnamed when no ABG.

**Implement (schema only — helpText / option.description / label text):** option.description on brain with West Haven: 0 none; I trivial unawareness/euphoria/short attention/impaired addition; II lethargy, time disorientation, personality change, asterixis; III somnolence/semistupor, responsive to voice, gross disorientation; IV coma. helpText on resp with SpO2/FiO2 >357 (1), 215–357 (2), ≤214 (3). Do not change values 1/2/3.

### `determinant-based` — Determinant-Based Pancreatitis Severity

| | |
|---|---|
| File | [`src/data/calculators/wave3-gi-hep.ts`](src/data/calculators/wave3-gi-hep.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `organFailure`, `necrosis` |
| Do not change | mild/moderate/severe/critical mapping, 48-hour split, calculate() branches |
| Research | Dellinger EP et al. Ann Surg 2012; Banks PA et al. Gut 2013 revised Atlanta modified Marshall table |

**Current UI:** Organ failure = none / transient <48 h / persistent >48 h with 'modified Marshall ≥2' named but no table. Necrosis = none / sterile / infected with no infection rule.

**Why the user cannot score from the calculator:** Cannot decide Marshall ≥2 without PaO2/FiO2, Cr, and SBP/fluid-responsiveness cutoffs. Infected necrosis is gas on imaging or positive FNA/drain culture.

**Implement (schema only — helpText / option.description / label text):** helpText organFailure: failure = modified Marshall ≥2: resp PaO2/FiO2 ≤300; renal Cr ≥1.9 mg/dL (≥170 µmol/L); CV SBP <90 not fluid-responsive. Transient resolves within 48 h; persistent lasts >48 h. helpText necrosis: infected if gas in necrosis on CT/MRI or positive Gram stain/culture from FNA or drain.

### `vexus` — VExUS Score (Venous Congestion)

| | |
|---|---|
| File | [`src/data/calculators/wave3-nephro-icu.ts`](src/data/calculators/wave3-nephro-icu.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `ivc`, `hepatic`, `portal`, `intrarenal` |
| Do not change | IVC 0/1 gateway, hepatic/portal/intrarenal values 0–2, grade 0 if IVC<2 else 1/2/3 by severeCount, interpretation bands |
| Research | Beaubien-Souligny W et al. Ultrasound J. 2020 PMID 32270297 IVC ≥2 cm gateway and organ-pattern table; Kidney Medicine 2022 VExUS pearls (hepatic S/D, portal PF, monophasic intrarenal) |

**Current UI:** IVC only <2 vs ≥2 cm. Hepatic S>D / S<D antegrade / S reversal. Portal pulsatility <30 / 30–49 / ≥50%. Intrarenal continuous / biphasic / monophasic. No helpText, no option.description, no probe site, no PF formula.

**Why the user cannot score from the calculator:** Cannot acquire or grade VExUS from the UI: IVC site/phase, hepatic S vs D vs S reversal, portal pulsatility fraction (Vmax−Vmin)/Vmax, interlobar biphasic vs D-only monophasic. Grade 2 vs 3 (one vs ≥2 severe patterns) is only in calculate().

**Implement (schema only — helpText / option.description / label text):** Keep IVC 0/1 and vein grades 0/1/2. helpText + option.description: IVC max AP ~1–2 cm from RA–IVC junction (or just distal to HV inflow), long+short axis, largest quiet-breathing diameter (typically end-expiration); <2 cm = VExUS 0 without organ Doppler. Hepatic PW (middle HV): S=systolic antegrade, D=diastolic antegrade; 0=S>D; 1=S<D still antegrade; 2=S reversal. Portal right PV mid-axillary, PF=(Vmax−Vmin)/Vmax×100 for the 30/50% bins. Intrarenal interlobar corticomedullary: 0=continuous; 1=discontinuous biphasic (separate S and D); 2=monophasic D-only. Optional pearl: grade 1=only mild; 2=one severe; 3=≥2 severe with dilated IVC.

### `new-ballard` — New Ballard Score (Gestational Age)

| | |
|---|---|
| File | [`src/data/calculators/wave3-peds-ob.ts`](src/data/calculators/wave3-peds-ob.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `posture`, `squareWindow`, `armRecoil`, `popliteal`, `scarf`, `heelToEar`, `genitals`, `eyeEar` |
| Do not change | calculate() domain sum, total-score mode, weeks interpolation table, option point magnitudes except adding the missing official −2 lids option |
| Research | Ballard JL et al. J Pediatr 1991; New Ballard Score sheet and neuromuscular monograph at ballardscore.com (scoresheet PDF; Genitals-Male/Female articles) |

**Current UI:** Neuromuscular items give angles or terse posture phrases with no exam maneuver. Heel-to-ear includes 'Moderate resistance (1)'. Genitals are 'Very premature / Early / Developing / Maturing / Near term / Term'. Eye/ear fuses 'Lids fused loosely (−1) / tightly (−2)' into one option valued −1.

**Why the user cannot score from the calculator:** A bedside examiner cannot administer the neuromuscular items or score genitals from the UI. Official New Ballard is pictorial and sex-specific: male scores use scrotum/testes/rugae; female scores use clitoris vs labia minora/majora. Combined 'very premature…term' labels require recalling the chart. Maneuvers (supine rest posture; wrist square-window pressure; 5-second flex then release for arm recoil; thigh-to-abdomen popliteal; scarf draw; heel-to-ear without forcing) are unstated. Arm recoil '<110° (3)' and '<90° (4)' overlap. Tightly fused lids (−2) cannot be selected.

**Implement (schema only — helpText / option.description / label text):** Keep existing numeric values. Add helpText with official maneuvers (BallardScore.com monograph): posture — infant supine, wait for preferred rest posture; square window — straighten fingers, gentle dorsum pressure, angle palm-to-forearm; arm recoil — supine, flex then briefly fully extend and release, measure elbow recoil; popliteal — thigh beside abdomen, extend until resistance, angle behind knee; scarf — draw arm across chest, note elbow vs midline/nipple/axilla; heel to ear — draw foot toward ipsilateral ear without forcing. Replace genitals option labels/descriptions with official paired M/F findings per point: −1 scrotum flat smooth / clitoris prominent labia flat; 0 scrotum empty faint rugae / prominent clitoris small minora; 1 testes upper canal rare rugae / prominent clitoris enlarging minora; 2 testes descending few rugae / majora and minora equally prominent; 3 testes down good rugae / majora large minora small; 4 testes pendulous deep rugae / majora cover clitoris and minora. Split eye/ear lids into official tightly fused (−2) vs loosely fused (−1) options. Replace overlapping arm-recoil bins with exclusive official ranges (180 / 140–180 / 110–140 / 90–110 / <90). Expand heel-to-ear 'Moderate resistance' to positional official language.

### `serotonin-syndrome` — Hunter Serotonin Toxicity Criteria

| | |
|---|---|
| File | [`src/data/calculators/wave3-tox-endo-heme.ts`](src/data/calculators/wave3-tox-endo-heme.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `spontaneousClonus`, `inducibleClonus`, `ocularClonus`, `hyperreflexia`, `hypertonia`, `serotonergic` |
| Do not change | yes/no keys, Hunter boolean tree, serotonergic-required gate, Positive/Negative output |
| Research | Dunkley EJC et al. QJM 2003 Hunter criteria; Boyer/Shannon and UpToDate exam (ocular clonus; inducible ankle clonus technique) |

**Current UI:** Bare Yes/No: Spontaneous/Inducible/Ocular clonus, Hyperreflexia, Hypertonia. Temp already >38 °C. No helpText; no elicitation method; serotonergic agent has no examples.

**Why the user cannot score from the calculator:** Cannot administer Hunter from the UI. Inducible clonus needs brisk sustained ankle dorsiflexion; ocular clonus is slow continuous horizontal oscillations; hyperreflexia/clonus are lower-limb predominant; spontaneous clonus is unprovoked (typically ankles). Serotonergic culprits unnamed.

**Implement (schema only — helpText / option.description / label text):** Keep yes/no keys and Hunter tree. helpText: serotonergic examples (SSRI/SNRI, MAOI, tramadol, linezolid, MDMA, triptans, fentanyl, combinations). inducibleClonus: support leg, knee slightly flexed, rapidly dorsiflex foot and hold — rhythmic beats while pressure maintained. ocularClonus: slow continuous horizontal oscillating movements, not ordinary end-gaze nystagmus. spontaneousClonus: unprovoked rhythmic ankle jerking. hyperreflexia/hypertonia: greater in legs; contrast NMS lead-pipe/bradyreflexia.

### `tirads` — ACR TI-RADS (Simplified Points)

| | |
|---|---|
| File | [`src/data/calculators/wave3-tox-endo-heme.ts`](src/data/calculators/wave3-tox-endo-heme.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `composition`, `echogenicity`, `shape`, `margin`, `foci` |
| Do not change | point values, TR1–TR5 mapping, FNA/follow size cutoffs TR3≥2.5 / TR4≥1.5 / TR5≥1.0 cm |
| Research | Tessler FN et al. J Am Coll Radiol. 2017 ACR TI-RADS white paper lexicon and chart |

**Current UI:** Short official words only (Spongiform, Very hypoechoic, Taller-than-wide, Lobulated/irregular, large comet-tail vs punctate). Foci label mentions summing types but does not define them. Size already in cm.

**Why the user cannot score from the calculator:** Cannot assign TR points from ultrasound without the ACR lexicon. Missing: spongiform >50% tiny cysts; very hypoechoic = darker than strap muscle; taller-than-wide = AP>transverse on transverse image; punctate vs large comet-tail; composition/echogenicity cannot-determine defaults.

**Implement (schema only — helpText / option.description / label text):** Keep 0–3 values. option.description/helpText from ACR 2017: spongiform = >50% tiny cystic spaces (then do not add other categories); hypo vs parenchyma, very hypo vs strap muscle; if echogenicity undetermined assign 1, if composition undetermined because of calcium assign 2. Shape: AP > transverse on axial image, beam-parallel height. Foci: large comet-tail ≥1 mm V-shaped in cysts (0); macrocalcification with shadow (1); rim (2); punctate <1 mm no large comet-tail (3); sum multiple types.

### `boston-syncope` — Boston Syncope Rule (Simplified)

| | |
|---|---|
| File | [`src/data/calculators/wave4-em-id.ts`](src/data/calculators/wave4-em-id.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `acsSigns`, `conduction`, `historyCad`, `persistentAbnVitals`, `volume`, `familyHx` |
| Do not change | Any-positive admission logic, 8-category structure, calculate() sum |
| Research | Grossman SA et al. Boston Syncope Criteria (J Emerg Med / Ann Emerg Med 2007); MDCalc Boston Syncope Rule item notes |

**Current UI:** Yes/No labels such as 'risk factors constellation per rule', 'worrisome conduction disease', 'persistent abnormal vital signs', 'volume depletion / profound anemia concern' — no cutoffs or original category lists

**Why the user cannot score from the calculator:** Cannot score several Boston categories without the Grossman paper. Vital signs have no HR/SBP/RR thresholds; conduction and ACS items are unanchored; family sudden death has no first-degree qualifier.

**Implement (schema only — helpText / option.description / label text):** Add helpText with published category contents. persistentAbnVitals: SBP <90, HR <50 or >100, RR >24 (persistent in ED). conduction: VT/VF, pacemaker/ICD, pause ≥2 s, 2nd/3rd-degree AVB, or HR <50. volume: GI bleed, dehydration, or Hct ≤30%. historyCad: prior CAD, CHF, VT, or cardiomyopathy — not a general risk-factor count. familyHx: first-degree sudden death. acsSigns: chest pain, ischemic ECG, or unexplained ischemic dyspnea. Do not change any-positive admit logic.

### `stemi-equivalent` — STEMI Equivalent Patterns Checklist

| | |
|---|---|
| File | [`src/data/calculators/wave4-em-id.ts`](src/data/calculators/wave4-em-id.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `sgarbossa`, `wellens`, `deWinter`, `posterior`, `hyperacute`, `lmain`, `rvMi` |
| Do not change | Yes/no flags, hard-OMI grouping in calculate(), 9-item checklist |
| Research | Sgarbossa 1996 / Smith-modified Sgarbossa; de Winter NEJM 2008; Wellens T-wave criteria; AHA/ESC posterior-lead recommendations; Fourth Universal Definition of MI |

**Current UI:** Named-pattern yes/no. Wellens and posterior have one-liners; Sgarbossa/Smith-modified, de Winter, hyperacute T, and aVR/LM have no millimetre or lead rules.

**Why the user cannot score from the calculator:** User cannot decide positivity from the ECG without a criteria card. Worst is Sgarbossa/Smith-modified (concordant STE, concordant STD V1–V3, ST/S ratio). Wellens needs Type A/B, leads, isoelectric ST. Posterior needs V7–V9 ≥0.5 mm.

**Implement (schema only — helpText / option.description / label text):** Keep checklist; add helpText with operational ECG rules. sgarbossa: Smith-modified concordant STE ≥1 mm, concordant STD ≥1 mm V1–V3, or ST/S ≤ −0.25. wellens: pain-free biphasic (A) or deep inverted (B) T in V2–V3, STE <1 mm, preserved R waves. deWinter: 1–3 mm upsloping J-point STD V1–V6 into tall peaked T ± aVR 0.5–1 mm. posterior: V1–V3 STD ± tall R; confirm V7–V9 STE ≥0.5 mm. hyperacute: broad bulky T often taller than QRS with reciprocal change. lmain: aVR STE with widespread STD. rvMi: inferior OMI plus V4R STE ≥1 mm.

### `delirium-icdsc` — Intensive Care Delirium Screening Checklist (ICDSC)

| | |
|---|---|
| File | [`src/data/calculators/wave4-icu-vent.ts`](src/data/calculators/wave4-icu-vent.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `ams`, `inattention`, `disorientation`, `hallucination`, `psychomotor`, `speech`, `sleep`, `fluctuation` |
| Do not change | eight 0/1 keys, sum 0–8, positive ≥4, 1–3 subsyndromal band |
| Research | Bergeron N et al. Intensive Care Med. 2001;27:859-864; ICU ICDSC cards (LHSC/Skrobik) for A–E LOC and UTA |

**Current UI:** Eight yes/no stems. LOC says RASS/SAS not 0/4. Inattention, sleep, fluctuation have no how-to. Pearls mention coma UTA but the input still scores it.

**Why the user cannot score from the calculator:** Cannot administer ICDSC from the UI. Missing Bergeron A–E consciousness (coma/RASS −4/−5 = stop, do not score 1), inattention cues, sleep <4 h / frequent nocturnal waking / sleeping most of the day, and 24 h fluctuation. Current LOC yes/no marks unarousable patients as altered and keeps scoring.

**Implement (schema only — helpText / option.description / label text):** Keep eight binaries. helpText: ams — 0 if RASS 0/SAS 4; 1 if drowsy (RASS −1 to −3/SAS 3) or agitated (RASS +1 to +4/SAS 5–7); if no response or only to intense pain (RASS −4/−5, SAS 1–2) record UTA and do not complete other items. inattention — difficulty following conversation/instructions, easily distracted, difficulty shifting focus. disorientation — any obvious mistake in person/place/time. hallucination — unequivocal hallucination/delusion/psychosis. psychomotor — hyperactivity requiring extra sedation or hypoactivity. speech — inappropriate/disorganized/incoherent speech or inappropriate mood. sleep — <4 h at night, frequent nocturnal waking (exclude staff/noise), or sleeping most of the day. fluctuation — any item 1–7 over 24 h (shift to shift).

### `arvc-taskforce` — ARVC Task Force Criteria (Simplified Count)

| | |
|---|---|
| File | [`src/data/calculators/wave5-cardio.ts`](src/data/calculators/wave5-cardio.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `imaging`, `tissue`, `repolarization`, `depolarization`, `arrhythmia`, `family` |
| Do not change | option values 0/1/2, definite/borderline/possible combination rules |
| Research | Marcus FI et al. Eur Heart J 2010 PMID 20172912 (2010 revised Task Force Criteria tables) |

**Current UI:** Each of six domains is None / Minor / Major with no measurements, ECG patterns, PVC counts, or family-history rules.

**Why the user cannot score from the calculator:** User cannot decide minor vs major without the 2010 revised TFC worksheet (echo/CMR cutoffs, epsilon vs TAD, VT axis, >500 PVCs/24 h, which relative counts). Same protocol-card failure as NIHSS.

**Implement (schema only — helpText / option.description / label text):** Keep None=0 / Minor=1 / Major=2 and combination logic. helpText: one major OR minor per category; do not double-count. option.description abbreviated 2010 TFC: Imaging major = RV akinesia/dyskinesia/aneurysm PLUS echo PLAX RVOT ≥32 mm (≥19 mm/m²) or PSAX ≥36 mm (≥21) or FAC ≤33%, OR CMR + RVEDV ≥110/100 mL/m² or RVEF ≤40%. Imaging minor = same wall motion with milder cutoffs (PLAX ≥29, PSAX ≥32, FAC ≤40%, RVEDV ≥100/90, RVEF ≤45%). Tissue major = residual myocytes <60% with fibrous replacement of RV free wall. Repolarization major = inverted T V1–V3 or beyond, age >14, no complete RBBB. Depolarization major = epsilon wave V1–V3; minor = SAECG late potentials or TAD ≥55 ms. Arrhythmia major = NSVT/VT LBBB superior axis; minor = RVOT VT (LBBB inferior axis) or >500 PVCs/24 h. Family major = first-degree meeting TFC, autopsy-confirmed, or pathogenic mutation; minor = unconfirmed first-degree, SCD <35 suspected ARVC, or second-degree confirmed.

### `mases` — MASES (Enthesitis Score)

| | |
|---|---|
| File | [`src/data/calculators/wave5-general-misc.ts`](src/data/calculators/wave5-general-misc.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `total` |
| Do not change | 0–13 range, calculate() clamp, interpretation bands |
| Research | Heuft-Dorenbosch L et al. Ann Rheum Dis. 2003 PMID 12525383; ASAS MASES site diagram; MDCalc MASES |

**Current UI:** Single number 'MASES total (tender sites)' with helpText 'Number of tender entheses out of 13 defined sites'. Result details list a partial site set ending in 'etc.'

**Why the user cannot score from the calculator:** Clinician cannot administer MASES from the UI. The 13 named sites and 0/1 tenderness rule are not on the input; user still needs a protocol card. This is a bedside exam, not a copyrighted questionnaire total.

**Implement (schema only — helpText / option.description / label text):** Expand helpText on total (keep 0–13 number entry): 'Press each site; score 1 if tender. 13 sites: R+L 1st costochondral, R+L 7th costochondral, R+L ASIS, R+L PSIS, R+L iliac crests, L5 spinous process, R+L Achilles insertions. Do not count other entheses (SPARCC uses different sites).'

### `ses-cd` — SES-CD (Simple Endoscopic Score for Crohn Disease)

| | |
|---|---|
| File | [`src/data/calculators/wave5-nephro-gi.ts`](src/data/calculators/wave5-nephro-gi.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `total` |
| Do not change | calculate() total interpretation bands 0–2 / 3–6 / 7–15 / ≥16, max 56 |
| Research | Daperno M et al. Gastrointest Endosc 2004 PMID 15472670; MDCalc SES-CD item table |

**Current UI:** Single total 0–56; helpText lists domains (ulcers, ulcerated surface, affected surface, stenosis each 0–3) but not cutoffs. Pearl says tool does not score segments.

**Why the user cannot score from the calculator:** Cannot produce the total from the endoscopy without an external SES-CD card. Missing ulcer size in cm, % surface bands, and whether stenosis is passable.

**Implement (schema only — helpText / option.description / label text):** Expand helpText/pearls with official 0–3 table (do not add 20 segment inputs). Ulcers: 0 none; 1 aphthous 0.1–0.5 cm; 2 large 0.5–2 cm; 3 very large >2 cm. Ulcerated surface: 0 none; 1 <10%; 2 10–30%; 3 >30%. Affected surface: 0 none; 1 <50%; 2 50–75%; 3 >75%. Stenosis: 0 none; 1 single passable; 2 multiple passable; 3 cannot pass. Segments: ileum, right, transverse, left, rectum.

### `pulmonary-score` — Pediatric Asthma Pulmonary Score

| | |
|---|---|
| File | [`src/data/calculators/wave5-peds-id.ts`](src/data/calculators/wave5-peds-id.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `ageBand`, `rr`, `accessory` |
| Do not change | values 0–3, three-domain sum, mild 0–3 / moderate 4–6 / severe 7–9 |
| Research | Smith SR et al. Acad Emerg Med 2002 The pulmonary score (PMID 11825832); Children's Mercy EBP table of Smith RR/wheeze/SCM |

**Current UI:** Age band collected but unused. RR is Normal/Mildly/Moderately/Severely elevated with no bpm. Accessory is None/Mild/Moderate/Severe.

**Why the user cannot score from the calculator:** Cannot score RR without Smith 2002 age-specific table. Accessory mild/moderate/severe has no muscle or exam cue (official is SCM activity).

**Implement (schema only — helpText / option.description / label text):** RR option descriptions with Smith bpm: <6 y 0 ≤30, 1 31–45, 2 46–60, 3 >60; ≥6 y 0 ≤20, 1 21–35, 2 36–50, 3 >50. helpText: use selected age band; count 1 full minute at rest. Accessory labels: no apparent SCM increase / mild SCM / increased SCM / maximal SCM. Wheeze: RESEARCH align to Smith (terminal expiration with stethoscope; entire expiration; inspiratory+expiratory without stethoscope) without changing 0–3 values.

### `aap-score` — Adult Appendicitis Score (AAS)

| | |
|---|---|
| File | [`src/data/calculators/wave5-surg-uro-ent.ts`](src/data/calculators/wave5-surg-uro-ent.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `crp`, `guarding`, `rlqPain` |
| Do not change | interpretation cutoffs ≤10 / 11–15 / ≥16; do not 'fix' simplified sex/age −3 or WBC/neutrophil bands (formula audit) |
| Research | Sammalkorpi HE et al. BMC Gastroenterol. 2014;14:114 Table 2; BMJ Best Practice AAS criteria |

**Current UI:** CRP is 'low for duration (0)' / 'Intermediate CRP band (1–2)' / 'High CRP for duration (3–4)' with helpText that admits duration-specific tables. Guarding None/Mild/Moderate-severe. RLQ pain Mild (2)/Moderate-severe (3) with no none.

**Why the user cannot score from the calculator:** CRP cannot be scored from the UI. Official AAS uses different mg/L cutoffs for symptoms <24 h vs >24 h, including a high-CRP point drop. Guarding mild vs moderate-severe has no exam cue.

**Implement (schema only — helpText / option.description / label text):** Replace CRP options with duration-specific bands (add duration select if needed). Official: symptoms <24 h — ≥4 and <11 = 2; ≥11 and <25 = 3; ≥25 and <83 = 5; ≥83 = 1. Symptoms >24 h — ≥12 and <53 = 2; ≥53 and <152 = 2; ≥152 = 1. Guarding helpText: mild = voluntary guarding; moderate/severe = involuntary muscular defense/rigidity.

### `p-possum` — P-POSSUM Mortality (Simplified Educational)

| | |
|---|---|
| File | [`src/data/calculators/wave5-surg-uro-ent.ts`](src/data/calculators/wave5-surg-uro-ent.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `opMagnitude`, `cardiac`, `resp` |
| Do not change | option values 1/2/4/8, partial-score logit, educational disclaimer |
| Research | Copeland GP et al. Br J Surg 1991 POSSUM; Whiteley MS et al. Br J Surg 1996 P-POSSUM; JAMA Surgery POSSUM magnitude tables |

**Current UI:** Operation magnitude is only Minor/Moderate/Major/Major+ with no procedure examples. Cardiac is No failure / Diuretic-digoxin-antianginal / Edema-warfarin / Raised JVP. Respiratory is No dyspnea / DOE-mild COPD / Limiting dyspnea-moderate COPD / Dyspnea at rest.

**Why the user cannot score from the calculator:** Cannot assign operative magnitude without the POSSUM procedure table. Cardiac 'Edema / warfarin' omits peripheral edema and cardiomegaly. Respiratory 'limiting dyspnea' omits the one-flight-of-stairs anchor.

**Implement (schema only — helpText / option.description / label text):** Add option.description with Copeland examples (Minor: hernia, varicose veins, minor perianal/scrotal; Moderate: appendectomy, cholecystectomy, mastectomy, TURP; Major: laparotomy, bowel resection, CBD exploration, major amputation; Major+: aortic, APR, Whipple, liver resection, esophagectomy). Cardiac helpText: 2=diuretic/digoxin/antianginal/antihypertensive; 4=peripheral edema, warfarin, or borderline cardiomegaly; 8=raised JVP and/or cardiomegaly. Respiratory: 4=limiting dyspnea (one flight of stairs) or moderate COPD; 8=dyspnea at rest, fibrosis, or consolidation.

### `ata-nodule` — ATA Thyroid Nodule Sonographic Pattern

| | |
|---|---|
| File | [`src/data/calculators/wave6-clinical-residual.ts`](src/data/calculators/wave6-clinical-residual.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `pattern` |
| Do not change | option values benign…high, size cutoffs in calculate(), malignancy percent strings |
| Research | Haugen BR et al. 2015 ATA thyroid nodule guidelines, Thyroid 2016, Table 6 / Recommendation 8 |

**Current UI:** Five pattern names only (Benign includes 'pure cyst, spongiform'; Very low / Low / Intermediate / High suspicion). Option descriptions empty.

**Why the user cannot score from the calculator:** Cannot assign ATA 2015 pattern from the UI: high vs intermediate vs low is defined by echogenicity plus suspicious features (irregular margins, microcalcifications, taller-than-wide, ETE, rim calcifications with extrusive soft tissue). Benign label incorrectly lumps spongiform with purely cystic, so a spongiform nodule is scored as no-FNA instead of very-low (FNA ≥2 cm / observation).

**Implement (schema only — helpText / option.description / label text):** Keep values. Put official feature lists in option.description. Relabel benign to purely cystic (no solid component); move spongiform into very-low description. High: solid hypoechoic ± mixed solid hypoechoic component PLUS ≥1 of irregular/infiltrative/microlobulated margins, microcalcifications, taller-than-wide, rim calcifications with extrusive soft tissue, ETE. Intermediate: solid hypoechoic, smooth margins, without those features. Low: iso/hyperechoic solid or partially cystic with eccentric solid areas without those features. helpText: assign from Table 6 features, not gestalt; taller-than-wide is transverse.

### `biophysical-profile` — Biophysical Profile (BPP)

| | |
|---|---|
| File | [`src/data/calculators/wave6-em-peds.ts`](src/data/calculators/wave6-em-peds.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `nst`, `movement`, `afv` |
| Do not change | 0/2 component points, NST −1 skip, /10 vs /8 logic, oligohydramnios override |
| Research | Manning FA et al. AJOG 1980; ACOG antenatal testing (15×15 / 10×10 NST); standard BPP MVP >2 cm tables |

**Current UI:** NST is only Reactive (2) / Nonreactive (0). Movement ≥3 discrete movements without a 30-min window. AFV 'MVP >2 cm (or adequate AFI)' with no AFI number. Breathing already says ≥30 s in 30 min.

**Why the user cannot score from the calculator:** Cannot call reactive vs nonreactive without Manning/ACOG acceleration rules (15×15 or 10×10). Movement observation window omitted. Adequate AFI is undefined.

**Implement (schema only — helpText / option.description / label text):** Keep 2/0/−1 values. NST helpText/labels: Reactive = ≥2 accelerations in 20 min, ≥15 bpm × ≥15 s if GA ≥32 wks, ≥10 × 10 s if <32 wks; extend to 40 min before nonreactive. Movement: ≥3 discrete body/limb movements in 30 min. AFV: MVP >2 cm or AFI >5 cm vs MVP ≤2 or AFI ≤5. Optional tone: extension→flexion of limb/spine or hand open-close in 30 min.

### `jaam-dic` — JAAM DIC Criteria (Revised)

| | |
|---|---|
| File | [`src/data/calculators/wave6-heme-onc.ts`](src/data/calculators/wave6-heme-onc.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `sirs` |
| Do not change | platelet 0/1/3, PT ratio ≥1.2 = 1, FDP 0/1/3, DIC if total ≥4, fibrinogen omitted |
| Research | Gando S et al. Crit Care Med 2006 (PMID 16521260); Bone 1992 SIRS consensus |

**Current UI:** SIRS criteria met: 0–2 criteria (0 pts) vs ≥3 criteria (1 pt); no list of the 4 SIRS items

**Why the user cannot score from the calculator:** JAAM awards 1 point for ≥3 of 4 SIRS criteria. The four items and cutoffs are not on the UI, so the user still needs a SIRS card.

**Implement (schema only — helpText / option.description / label text):** Keep 0 vs 1 values. helpText: JAAM SIRS count how many of (1) T >38 or <36 °C; (2) HR >90; (3) RR >20 or PaCO2 <32 mmHg (<4.3 kPa); (4) WBC >12 or <4 ×10^9/L or >10% bands. ≥3 criteria → 1 pt.

### `sic-score` — SIC Score (Sepsis-Induced Coagulopathy)

| | |
|---|---|
| File | [`src/data/calculators/wave6-heme-onc.ts`](src/data/calculators/wave6-heme-onc.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `sofa` |
| Do not change | INR 0/1/2 and platelet 0/1/2 bands; positive if total ≥4 AND coag subscore >2; max 6 |
| Research | Iba T et al. JTH 2019 SIC (PMID 31410983); Vincent 1996 / Singer Sepsis-3 SOFA table |

**Current UI:** Total SOFA (respiratory + CV + hepatic + renal only) options 0 / 1 / ≥2; helpText only says sum four domains, not the 0–4 tables

**Why the user cannot score from the calculator:** User cannot produce 0/1/≥2 without a SOFA card. Each allowed domain is a 0–4 table (PaO2/FiO2±vent, MAP/pressors, bilirubin, Cr or UO). CNS and coagulation are correctly excluded but the remaining tables are off-screen.

**Implement (schema only — helpText / option.description / label text):** Keep 0/1/≥2 values. Expand helpText with condensed 4-domain SOFA crib (resp PaO2/FiO2 ≥400/<400/<300/<200+vent/<100+vent; CV MAP≥70 / MAP<70 / dopa≤5 or any dobutamine / dopa>5 or epi/norepi≤0.1 / dopa>15 or epi/norepi>0.1; bili <1.2 / 1.2–1.9 / 2.0–5.9 / 6.0–11.9 / >12; renal Cr <1.2 / 1.2–1.9 / 2.0–3.4 / 3.5–4.9 or UO<500 mL/d / Cr>5 or UO<200). Optional option.description: 0 = all four domains 0; 1 = sum 1; ≥2 = four-domain sum ≥2 (SIC caps at 2).

### `fried-frailty` — Fried Frailty Phenotype

| | |
|---|---|
| File | [`src/data/calculators/wave6-scores-residual.ts`](src/data/calculators/wave6-scores-residual.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `exhaustion`, `weakness`, `slowness`, `lowActivity` |
| Do not change | five binary criteria; robust 0 / pre-frail 1–2 / frail ≥3; weight-loss label cutoff |
| Research | Fried LP et al. J Gerontol A Biol Sci Med Sci. 2001;56:M146 (CHS phenotype + appendix). MDCalc Fried Frailty item help. |

**Current UI:** Five yes/no. Weight loss has ≥10 lb/≥4.5 kg in past year. Exhaustion/weakness/slowness/low activity name CES-D, grip, 15-ft walk, and kcal cutoffs but do not state questions, maneuvers, or numbers.

**Why the user cannot score from the calculator:** Cannot apply CHS phenotype without the two CES-D stems and 3–4 day cut, sex/BMI grip-kg table, sex/height 15-ft walk times, and sex-specific weekly kcal cuts.

**Implement (schema only — helpText / option.description / label text):** Add helpText only (keep yes/no). Exhaustion: CES-D ‘everything I did was an effort’ and ‘I could not get going’; positive if either is moderate amount of the time (3–4 days) or most of the time in the last week. Weakness: RESEARCH exact Jamar kg table from Fried 2001 appendix (men ≤29/30/30/32 kg by BMI; women ≤17/17.3/18/21 kg). Slowness: timed 15-ft usual-pace walk; men ≤173 cm ≥7 s (taller ≥6 s); women ≤159 cm ≥7 s (taller ≥6 s). Activity: <383 kcal/week men, <270 women (Minnesota LTPA).

### `duke-iscvid-2023` — 2023 Duke-ISCVID Infective Endocarditis Criteria

| | |
|---|---|
| File | [`src/data/calculators/wave7-bedside.ts`](src/data/calculators/wave7-bedside.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `microMajor`, `imagingMajor`, `microMinor`, `surgicalMajor`, `pathologic` |
| Do not change | yes/no values; definite/possible/rejected logic (2 major, 1+3, 5 minor, 1+1, 3 minor); pathologic independently definite |
| Research | Fowler VG et al. Clin Infect Dis 2023, 2023 Duke-ISCVID criteria tables (typical organisms, imaging footnotes) |

**Current UI:** Packed yes/no stems: major micro is 'typical IE organisms from ≥2 sets OR Coxiella/Bartonella/T. whipplei serology or PCR meeting major definitions'; minor micro is anything not meeting major; imaging lists findings but omits PET timing and that worsening of known regurgitation is not major.

**Why the user cannot score from the calculator:** User cannot classify major vs minor microbiology without the 2023 typical-organism list and 2-set vs 3-set rule. Typical native: S. aureus, S. lugdunensis, E. faecalis, all streptococci except S. pneumoniae and S. pyogenes, Granulicatella/Abiotrophia/Gemella, HACEK; additional organisms are typical only with prosthetic material. Nontypical organisms need ≥3 separate sets. Coxiella phase I IgG >1:800 / Bartonella IgG ≥1:800. PET/CT major generally ≥3 months after prosthetic implant (pearl only).

**Implement (schema only — helpText / option.description / label text):** Do not add inputs. helpText on microMajor with typical/nontypical lists and titer/set rules; microMinor: use only if major not met; imagingMajor: new regurgitation vs prior imaging (worsening preexisting is not major); PET/CT ≥3 months post-implant; surgicalMajor: vegetation, destruction, abscess, fistula, or infectious prosthetic dehiscence on inspection.

### `basmi` — BASMI (2-step)

| | |
|---|---|
| File | [`src/data/calculators/wave7-rheum-activity.ts`](src/data/calculators/wave7-rheum-activity.ts) |
| Priority | **P0** |
| Pattern | `exam-protocol-missing` |
| Inputs | `tragus`, `schober`, `cervical`, `sideFlex`, `imd` |
| Do not change | 2-step 0/1/2 bins, five-item sum 0–10, bands 0–2 / 3–5 / 6–10; do not switch to linear BASMI-10 |
| Research | Jenkinson TR et al. J Rheumatol. 1994 BASMI; ASAS/ASIF BASMI measurement SOP |

**Current UI:** Five numeric fields; 2-step conversion cutoffs already in helpText. No manoeuvre, landmarks, or L/R averaging method.

**Why the user cannot score from the calculator:** Bins are scorable; the exam is not. User still needs an ASAS/Jenkinson card to produce tragus-to-wall, modified Schober, side flexion, cervical rotation, and intermalleolar distance.

**Implement (schema only — helpText / option.description / label text):** Keep 0/1/2 cutoffs. Expand helpText: tragus — heels/buttocks/scapulae against wall, feet ~30 cm, chin tucked, rigid ruler, mean L/R. schober — mark lumbosacral junction (dimples of Venus) and 10 cm above (classic also 5 cm below); flex fully; score the increase. cervical — supine goniometer on forehead, mean L/R. sideFlex — fingertip-to-floor or skin-distraction difference, mean L/R, no trunk rotation. imd — supine, knees extended, abduct; medial malleoli distance.

### `bode` — BODE Index (COPD)

| | |
|---|---|
| File | [`src/data/calculators/emergency-misc.ts`](src/data/calculators/emergency-misc.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `dyspnea` |
| Do not change | BMI/FEV1/6MWD cutoffs, dyspnea values 0–3, sum 0–10, quartile bands 0–2 / 3–4 / 5–6 / 7–10 |
| Research | Celli BR et al. NEJM 2004 BODE table; Fletcher/MRC dyspnea scale; GOLD mMRC wording |

**Current UI:** mMRC options are only '0–1 (0)', '2 (1)', '3 (2)', '4 (3)'. BMI, FEV1 %, and 6-minute-walk already have numeric bins.

**Why the user cannot score from the calculator:** Cannot assign mMRC 2 vs 3 vs 4 without the MRC grade card. '0–1' also hides that grades 0 and 1 are different questions collapsed only for BODE points.

**Implement (schema only — helpText / option.description / label text):** Keep values 0–3. option.description (or expanded labels): 0–1 (0) = grade 0 breathless only with strenuous exercise, grade 1 short of breath hurrying on the level or walking up a slight hill; 2 (1) = walks slower than same-age peers on the level or stops at own pace; 3 (2) = stops after ~100 m or a few minutes on the level; 4 (3) = too breathless to leave the house or breathless dressing/undressing. helpText: modified MRC; pick worst applicable grade, then the BODE point bin.

### `isth-dic` — ISTH Overt DIC Score

| | |
|---|---|
| File | [`src/data/calculators/missing-heme-id-nephro.ts`](src/data/calculators/missing-heme-id-nephro.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `fibrin`, `pt` |
| Do not change | fibrin points 0/2/3 (not 0/1/2), platelet/PT/fibrinogen cutoffs, ≥5 overt threshold |
| Research | Taylor FB et al. Thromb Haemost 2001; Toh/Hoots ISTH SSC 2007 overview; ISTH SSC 2025 D-dimer ×3 / ×7 ULN proposal |

**Current UI:** Fibrin: No increase (0) / Moderate (2) / Strong (3) with only 'use lab-specific cutoffs'. PT: <3 / 3–6 / >6 seconds prolonged without vs-what.

**Why the user cannot score from the calculator:** Cannot choose moderate vs strong fibrin markers without a multiplier or example D-dimer. PT is seconds above mean normal, not INR.

**Implement (schema only — helpText / option.description / label text):** option.description on fibrin: no increase = within reference; moderate ≈ >3× ULN (or ~0.4–4 µg/mL FEU in older cohorts); strong ≈ >7× ULN (or >4 µg/mL FEU); note lab ULN. helpText pt: seconds above laboratory mean normal PT (not INR). Optional fibrinogen helpText: 1.0 g/L = 100 mg/dL.

### `ham-a` — HAM-A Anxiety Score

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `score` |
| Do not change | 0–4 per item, 0–56 total, bands ≤17 / 18–24 / 25–30 / >30 |
| Research | Hamilton M. Br J Med Psychol 1959; standard HAM-A 14-item anchor reprints |

**Current UI:** Number entry HAM-A total (0–56) with helpText '14 items scored 0–4.'

**Why the user cannot score from the calculator:** HAM-A items are 0–4 on 14 named symptom clusters (anxious mood, tension, fears, insomnia, somatic muscular/sensory, CV, respiratory, GI, GU, autonomic, behavior at interview). A total box requires the protocol card. Original 1959 scale is not a Pearson instrument.

**Implement (schema only — helpText / option.description / label text):** Add 14 selectInputs with Hamilton 0–4 anchors and official item titles. helpText: Rate the past few days; behavior at interview is observed, not reported. Same copyright fallback as HAM-D: if reprint not allowed, keep total-only with a pointer to the official form.

### `ham-d` — HAM-D Depression Score

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `score` |
| Do not change | 17-item interpretation bands (≤7 / 8–13 / 14–18 / 19–22 / ≥23), version field as context only |
| Research | Hamilton M. J Neurol Neurosurg Psychiatry 1960; APA Handbook 17-item HDRS anchors. Confirm no third-party structured-interview copyright before reprinting. |

**Current UI:** Number entry HAM-D total 0–52 with helpText 'Usually 17-item total.' Version select is context only.

**Why the user cannot score from the calculator:** Original HAM-D (1960) is a clinician-rated anchored interview, not a Pearson form like MMSE. A total box cannot be scored at the bedside: items mix 0–4 and 0–2 with specific probes. User needs an external HAM-D card.

**Implement (schema only — helpText / option.description / label text):** Replace total-only with 17 selectInputs using official Hamilton anchors (do not invent 0–4 wording). helpText: 17-item HDRS; suicide item is clinical, not just a point. If a later copyright review of a structured interview (SIGH-D) forbids reprint, keep total-only and point to the official instrument (then treat as copyright-total-only).

### `ymrs` — Young Mania Rating Scale (YMRS)

| | |
|---|---|
| File | [`src/data/calculators/wave2-neuro-psych.ts`](src/data/calculators/wave2-neuro-psych.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `score` |
| Do not change | 0–60 total, double-weight items, pragmatic bands ≤12 / 13–19 / 20–25 / ≥26 |
| Research | Young RC et al. Br J Psychiatry 1978 YMRS item anchors |

**Current UI:** Number entry YMRS total (0–60) with helpText '11 items; some double-weighted (0–8).'

**Why the user cannot score from the calculator:** YMRS cannot be scored from a total. Four items are 0–8 (irritability, speech, thought content, disruptive-aggressive) and seven are 0–4, each with operational anchors. User needs the YMRS card.

**Implement (schema only — helpText / option.description / label text):** Replace with 11 selectInputs using Young 1978 anchors; keep 0–4 vs 0–8 weighting on the official double-weighted items. helpText: Based on interview + observation over the past 48 hours unless the form specifies otherwise. RESEARCH copyright (BJP/Royal College); if reprint is not allowed, keep total-only and point to the official instrument.

### `bclc-hcc` — BCLC HCC Stage Helper

| | |
|---|---|
| File | [`src/data/calculators/wave2-oncology.ts`](src/data/calculators/wave2-oncology.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `ps`, `liver` |
| Do not change | PS 0/1/2/3 values; Child A/B/C keys; tumor very_early/early/intermediate/advanced mapping; D if PS≥3 or Child C; C if advanced or PS 1–2 |
| Research | Oken MM et al. Am J Clin Oncol. 1982 ECOG PS; Reig M et al. J Hepatol. 2022 BCLC update; Pugh Child-Turcotte-Pugh variables |

**Current UI:** ECOG options are literally 0 / 1 / 2 / ≥3. Child-Pugh A/B/C titles only. Tumor burden options already name size/number/invasion. Same file iperformance has full ECOG labels.

**Why the user cannot score from the calculator:** PS 0 vs 1 vs 2 is the fork to BCLC 0/A/B vs C. Cannot assign ECOG from numbers alone (CIWA-style). Child-Pugh A/B/C is a 5-item score not shown.

**Implement (schema only — helpText / option.description / label text):** Expand PS labels, values stay 0/1/2/3: '0 — Fully active, no restriction'; '1 — Restricted in strenuous activity; ambulatory, light/sedentary work OK'; '2 — Ambulatory, all self-care; unable to work; up >50% of waking hours'; '≥3 — Limited self-care or worse; bed/chair >50% of waking hours'. liver helpText: Child-Pugh A 5–6 / B 7–9 / C 10–15 from bilirubin, albumin, INR, ascites, encephalopathy (use Child-Pugh calculator).

### `goese` — Glasgow Outcome Scale–Extended (GOS-E)

| | |
|---|---|
| File | [`src/data/calculators/wave2-ortho-trauma.ts`](src/data/calculators/wave2-ortho-trauma.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `gose` |
| Do not change | option values 1–8, mapping to classic GOS in details, risk bands ≤2 / 3–4 / 5–6 / 7–8 |
| Research | Wilson JT, Pettigrew LE, Teasdale GM. J Neurotrauma. 1998 PMID 9726257 structured GOS/GOS-E interview; TBI-IMSOP GOS-E manual |

**Current UI:** Eight options titles only (1 Death … 3 Lower severe disability … 8 Upper good recovery). No helpText or option.description. 8-hour / shop-travel / work splits live only in calculate() after a grade is chosen.

**Why the user cannot score from the calculator:** Cannot distinguish GOS-E 3 vs 4, 5 vs 6, or 7 vs 8 from the selector. Those splits are why the scale exists. Same pattern as CFS: descriptors appear only after scoring.

**Implement (schema only — helpText / option.description / label text):** Keep values 1–8. helpText: rate current vs pre-injury with Wilson interview; overall = worst domain. option.description: 2 = not obeying commands and not saying words; 3 Lower SD = dependent, cannot be left alone 8 h; 4 Upper SD = dependent but can be left ≥8 h, cannot shop OR travel locally without assistance; 5 Lower MD = independent at home and can shop/travel but cannot work/study or major social/leisure restriction; 6 Upper MD = reduced work capacity and/or social/leisure less than half as often; 7 Lower GR = residual symptoms still affecting daily life; 8 Upper GR = full return, residuals none or not affecting daily life.

### `lods` — LODS Score (Simplified)

| | |
|---|---|
| File | [`src/data/calculators/wave2-pulm-id.ts`](src/data/calculators/wave2-pulm-id.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `cv`, `renal`, `pulm`, `heme`, `hepatic` |
| Do not change | 0/1/3/5 option values, six-domain sum, interpretation bands as coded. Do not add the official logistic mortality equation unless separately specified |
| Research | Le Gall JR et al. JAMA. 1996;276:802-810 Table 1; SFAR LODS variable definitions |

**Current UI:** CV/renal/pulm/heme/hepatic are Normal (0) / Mild (1) / Moderate (3) / Severe (5). Neuro already has GCS bands. Details admit full LODS uses detailed cut-points.

**Why the user cannot score from the calculator:** Cannot assign 1 vs 3 vs 5 without Le Gall Table 1 (HR/SBP, urea/Cr/UOP, vent+PF, WBC/platelets, bilirubin/PT). Empty educational bins are not scorable.

**Implement (schema only — helpText / option.description / label text):** Keep values 0/1/3/5. Expand labels/option.description: CV 0 = HR 30–139 and SBP 90–239; 1 = HR ≥140 or SBP 70–89 or 240–269; 3 = SBP 40–69 or ≥270; 5 = HR <30 or SBP <40 (worst of HR or SBP). Pulm 0 = not MV/CPAP; 1 = MV/CPAP and PF ≥150; 3 = MV/CPAP and PF <150 (official pulm max is 3 — if the 5 option is kept, map/describe as unused). Heme 0 = WBC 2.5–49.9 and platelets ≥50; 1 = WBC 1.0–2.4 or ≥50 or platelets <50; 3 = WBC <1.0. Hepatic 0 = bili <2.0 mg/dL and PT <3 s above control; 1 = bili ≥2.0 or PT ≥3 s (official hepatic max is 1). Neuro helpText: worst GCS; if sedated, estimated pre-sedation GCS. Renal: RESEARCH exact urea mmol/L, creatinine, UOP L/24 h from Le Gall 1996 Table 1.

### `braden-scale` — Braden Scale for Predicting Pressure Sore Risk

| | |
|---|---|
| File | [`src/data/calculators/wave4-icu-vent.ts`](src/data/calculators/wave4-icu-vent.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `sensory`, `moisture`, `activity`, `mobility`, `nutrition`, `friction` |
| Do not change | subscale values 1–4 (friction 1–3), total 6–23, risk bands ≤9 / 10–12 / 13–14 / 15–18 / 19–23 |
| Research | Bergstrom N, Braden BJ et al. 1987; official Braden Scale (Prevention Plus). Complete copyright permission if reprinting official wording. |

**Current UI:** Category titles only (Completely/Very/Slightly limited; Constantly/Often/Occasionally/Rarely moist; Very poor/Probably inadequate/Adequate/Excellent; friction Problem/Potential problem). No helpText or option.description.

**Why the user cannot score from the calculator:** Cannot assign 1 vs 2 vs 3 vs 4 without the official Braden card. Hidden anchors: sensory (unresponsive vs pain-only vs verbal but cannot always report discomfort); moisture (linen change every turn vs ≥1×/shift vs ~1×/day); activity (walks outside room ≥twice/day and inside every 2 h vs short distances); mobility (no independent position change vs occasional slight vs frequent slight); nutrition (NPO/clears >5 d or ≤⅓ meals vs ~½ meals vs >½ vs most of every meal); friction (max assist + frequent sliding vs min assist + occasional slide).

**Implement (schema only — helpText / option.description / label text):** Keep values (friction 1–3; others 1–4). Braden Scale is copyrighted (Prevention Plus). If license allows, put official descriptors in option.description. If not, do not reprint the card; helpText on each subscale: score from the official Braden card; titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4. Optional non-verbatim reminders: moisture ≈ linen-change frequency; NPO >5 days counts as very poor nutrition.

### `nursing-delirium` — Nursing Delirium Screening Scale (Nu-DESC)

| | |
|---|---|
| File | [`src/data/calculators/wave4-icu-vent.ts`](src/data/calculators/wave4-icu-vent.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `disorientation`, `behavior`, `communication`, `illusion`, `psychomotor` |
| Do not change | option values 0–2, five-item sum 0–10, positive cutoff ≥2 |
| Research | Gaudreau JD et al. J Pain Symptom Manage. 2005;29:368-375 Nu-DESC items |

**Current UI:** Each item is 0 — Absent / 1 — Mild / 2 — Severe. No helpText or option.description.

**Why the user cannot score from the calculator:** Cannot distinguish mild vs severe or what counts as a positive item without the Gaudreau card. Missing item stems (time/place/person; pulling tubes; incoherent speech; seeing/hearing what is not there; delayed response when prodded) and the shift observation window.

**Implement (schema only — helpText / option.description / label text):** Keep values 0/1/2. helpText: score the current nursing shift; 0 = absent, 1 = present mild, 2 = pronounced. option.description with Gaudreau stems: Disorientation = verbal/behavioral lack of orientation to time or place or misperceiving persons; Behavior = pulling tubes/dressings or getting out of bed when contraindicated; Communication = incoherence, non-communicativeness, nonsensical/unintelligible speech; Illusion = seeing or hearing things not there / visual distortions; Psychomotor retardation = delayed responsiveness, few spontaneous actions/words, deferred reaction when prodded or unarousable.

### `psofa-simp` — Pediatric SOFA (pSOFA) Simplified Educational

| | |
|---|---|
| File | [`src/data/calculators/wave6-em-peds.ts`](src/data/calculators/wave6-em-peds.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `resp`, `cv`, `cns`, `renal` |
| Do not change | option values 0–4, six-domain sum 0–24, interpretation thresholds 3 / 7 / 11 / ≥12 |
| Research | Matics TJ, Sanchez-Pinto LN. JAMA Pediatr. 2017;171(10):e172352 Table 1 |

**Current UI:** Resp/CV/CNS/renal are Normal/mild/moderate/severe/very severe ordinals. Coag and liver already quote platelet and bilirubin bins.

**Why the user cannot score from the calculator:** Cannot assign 1 vs 2 vs 3 vs 4 without the Matics table. Missing PaO2/FiO2 and SpO2/FiO2 cutoffs, age-specific MAP, age-specific creatinine, GCS bands, vasoactive µg/kg/min. Adult sofa in the same app already prints those numbers.

**Implement (schema only — helpText / option.description / label text):** Expand labels (values stay 0–4). Resp: PF ≥400 or SF ≥292 (0); 300–399 / SF 264–291 (1); 200–299 / SF 221–263 (2); 100–199 + support / SF 148–220 + support (3); <100 + support / SF <148 + support (4). helpText: SF only if SpO2 ≤97%. CNS: GCS 15 / 13–14 / 10–12 / 6–9 / <6. CV and renal: helpText with Matics age-MAP and age-creatinine tables plus dopamine/dobutamine/epi/norepi µg/kg/min for scores 2–4.

### `barthel-index` — Barthel ADL Index Total

| | |
|---|---|
| File | [`src/data/calculators/wave6-psych-sleep.ts`](src/data/calculators/wave6-psych-sleep.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `score` |
| Do not change | Item weights, 0–100 range, interpretation bands 0–20 / 21–60 / 61–90 / 91–99 / 100 |
| Research | Mahoney FI, Barthel DW. Md State Med J. 1965 PMID 14258950; Collin C et al. Int Disabil Stud. 1988 (0–100 version) |

**Current UI:** Single number 'Barthel Index total (0–100)' with helpText listing 10 ADL domains but no 0/5/10/15 independence rules

**Why the user cannot score from the calculator:** Public-domain bedside ADL exam cannot be scored from the UI; clinician still needs the Mahoney/Collin card for feeding/bathing/grooming/dressing/bowels/bladder/toilet/transfers (0–15)/mobility (0–15)/stairs. Not a copyright barrier (unlike MMSE/MoCA).

**Implement (schema only — helpText / option.description / label text):** Prefer 10 selectInputs with official Collin 0–100 labels/option.description (feeding 0 unable / 5 needs help / 10 independent; transfers 0/5/10/15; etc.); calculate() still sums 0–100. If keeping one total, put the 10-item scoring table in helpText/pearls.

### `frailty-clinical` — Clinical Frailty Scale (CFS)

| | |
|---|---|
| File | [`src/data/calculators/wave6-scores-residual.ts`](src/data/calculators/wave6-scores-residual.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `cfs` |
| Do not change | option values 1–9; calculate() score passthrough; CFS ≥5 frail note |
| Research | Rockwood CFS v2.0 (Rockwood & Theou Can Geriatr J 2020); Dalhousie GMR CFS card and Guidance on the Clinical Frailty Scale; CMAJ 2005. Complete Dalhousie Permission for Use if commercially reprinting official wording/pictographs. |

**Current UI:** Nine options are titles only (1 Very fit … 9 Terminally ill); no helpText or option.description. Operational descriptors appear only in calculate() after a grade is chosen.

**Why the user cannot score from the calculator:** Cannot distinguish CFS 5/6/7/8/9 from titles alone (IADL help vs bathing/house vs complete dependence vs approaching death vs terminal <6 months without severe frailty). Two-week pre-illness baseline rule is only in pearls.

**Implement (schema only — helpText / option.description / label text):** Keep values 1–9. helpText: score usual function ~2 weeks before this acute illness (CFS 9 is the exception). Put CFS v2.0 descriptors in option.description (Robust/exercises regularly; Fit/seasonal activity; Managing well/walks only; Very mild/slowed up not dependent; Mild/needs high-order IADLs; Moderate/help all outside activities + bathing; Severe/complete personal-care dependence but stable ~6 months; Very severe/could not recover from minor illness; Terminally ill/<6 months and not otherwise severely frail).

### `isth-ssc-bat` — ISTH-SSC Bleeding Assessment Tool (14 domains)

| | |
|---|---|
| File | [`src/data/calculators/wave7-highuse.ts`](src/data/calculators/wave7-highuse.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `epistaxis`, `cutaneous`, `minorWounds`, `oralCavity`, `gi`, `hematuria`, `toothExtraction`, `surgery`, `menorrhagia`, `postpartum`, `muscle`, `joint`, `cns`, `other`, `sex` |
| Do not change | option values 0–4, 14-domain sum, adult cutoffs ≥4 men / ≥6 women |
| Research | Rodeghiero F et al. JTH 2010 ISTH/SSC BAT (PMID 20626619); Elbatarny M et al. Haemophilia 2014 (PMID 25196510); ISTH SSC BAT worksheet; MDCalc ISTH-SCC BAT |

**Current UI:** Most domains labeled only 0–4; epistaxis labels only 0 and 4; tooth/surgery label only 0. No pediatric cutoff.

**Why the user cannot score from the calculator:** Cannot administer ISTH-SSC BAT from the UI. Missing official frequency/duration, consultation-only, packing vs transfusion, dental/surgery % of procedures, menorrhagia pad/PBAC rules, CNS 0/3/4-only, and child ≥3 cutoff.

**Implement (schema only — helpText / option.description / label text):** Keep values 0–4. Put official ISTH descriptors in option.label or option.description; helpText: score worst lifetime episode before diagnosis; 0 if never challenged; consultation only = sought evaluation/specialist/labs. Epistaxis 0 none/trivial, 1 >5/year or >10 min, 2 consultation, 3 packing/cautery/antifibrinolytic, 4 transfusion/replacement/DDAVP. Cutaneous 1 = ≥5 bruises >1 cm in exposed areas. Tooth/surgery 1 ≤25% of procedures no intervention, 2 >25%. Menorrhagia: pads q2h / PBAC>100 / combined hormones+antifibrinolytic / acute D&C-hysterectomy. CNS helpText official 0/3/4 only (3 subdural, 4 intracerebral). Other helpText: umbilical stump, cephalohematoma, conjunctival, venipuncture/circumcision bleeding. Add sex option Child <18 y (positive ≥3).

### `essdai` — ESSDAI (Sjögren Activity)

| | |
|---|---|
| File | [`src/data/calculators/wave7-rheum-activity.ts`](src/data/calculators/wave7-rheum-activity.ts) |
| Priority | **P0** |
| Pattern | `numbered-scale-no-anchors` |
| Inputs | `constitutional`, `lymphadenopathy`, `glandular`, `articular`, `cutaneous`, `pulmonary`, `renal`, `muscular`, `pns`, `cns`, `haematological`, `biological` |
| Do not change | domain weights, maxLevel 2 vs 3, level×weight sum 0–123, bands <5 / 5–13 / ≥14; do not drop CNS level-1 from the select |
| Research | Seror R et al. Ann Rheum Dis. 2010;69:1103 Table 3; Seror 2015 ESSDAI/ESSPRI user guide |

**Current UI:** Each domain is No activity / Low / Moderate / High with level × weight chips. No helpText or option.description. Biological correctly maxes at 2; CNS still offers unused Low.

**Why the user cannot score from the calculator:** Cannot assign low vs moderate vs high without Seror Table 3 (fever °C, node cm, 28-joint synovitis, CK×ULN, cytopenia bins, IgG, DLCO/FVC, proteinuria). CIWA-style ordinals.

**Implement (schema only — helpText / option.description / label text):** Keep 0–2/0–3 values and level×weight. helpText: score current Sjögren activity not damage/infection. option.description from Seror Table 3: Constitutional Low = fever 37.5–38.5°C and/or night sweats and/or involuntary 5–10% weight loss; Moderate = fever >38.5 or loss >10%. Lymph Low = nodes ≥1 cm (≥2 cm inguinal); Moderate = ≥2 cm (≥3 cm inguinal) ± splenomegaly; High = current B-cell malignancy. Glandular Low = parotid ≤3 cm; Moderate = >3 cm. Articular Low = peripheral arthralgia + AM stiffness >30 min; Moderate = 1–5/28 synovitis; High = ≥6/28. Cutaneous Low = EM; Moderate = limited vasculitis/purpura feet-ankles or SCLE; High = diffuse vasculitis/ulcers. Pulmonary Low = cough or ILD without dyspnoea/normal PFT; Moderate = NYHA II or DLCO 40–69% or FVC 60–79%; High = NYHA III–IV or DLCO <40% or FVC <60%. Haematological Low = neutrophils 1000–1500 and/or Hb 10–12 and/or Plt 100–150 or lymph 500–1000 (autoimmune only). Biological Low = clone or IgG 16–20 g/L; Moderate = cryo or IgG >20 or recent hypocomplement/IgG fall. RESEARCH renal/muscular/PNS/CNS full Table 3; CNS official has no level 1 (describe Low as not used).

### `waterlow-scale` — Waterlow Pressure Ulcer Risk Score

| | |
|---|---|
| File | [`src/data/calculators/wave4-icu-vent.ts`](src/data/calculators/wave4-icu-vent.ts) |
| Priority | **P0** |
| Pattern | `other` |
| Inputs | `sexAge`, `build`, `neuro`, `skin` |
| Do not change | ten-field sum, thresholds 10 / 15 / 20; do not split sex and age into new inputs unless a later scoring-logic change is approved |
| Research | Waterlow J. Nurs Times. 1985; official Waterlow score card (sex+age additive; BMI build; neuro 4–6) |

**Current UI:** Combined sexAge: Male (1), Female (2), then 14–49 (+1 already includes sex), 50–64 combined value 3, 65–74 typical 3–4 value 4, etc. Build Average/Above average/Obese/Below average with no BMI. Neuro Diabetes/MS/CVA — use 5 vs Paraplegia 5–6. Skin single-select.

**Why the user cannot score from the calculator:** Official Waterlow adds sex (M 1 / F 2) plus age (14–49:1 … 81+:5). A 70-year-old woman is 2+3=5; UI offers typical 3–4 as a single 4. Male/Female options omit age. Build lacks BMI 20–24.9 / 25–29.9 / ≥30 / <20. Neuro official is 4–6 by severity. Skin findings on the printed card can stack.

**Implement (schema only — helpText / option.description / label text):** Do not change calculate() sum. Expand sexAge labels to explicit combined points (Male 14–49=2, Female 14–49=3, Male 50–64=3, Female 50–64=4, … Male 81+=6, Female 81+=7). build labels: BMI 20–24.9 (0) / 25–29.9 (1) / ≥30 (2) / <20 (3). neuro helpText: official 4–6 for diabetes/MS/CVA/motor-sensory/paraplegia — pick 4 mild / 5 moderate / 6 complete; this control only offers 5 or 6. skin helpText: official card may add multiple descriptors; this tool is highest-one-only. Waterlow card copyright Judy Waterlow.

### `phoenix-sepsis-simp` — Phoenix Sepsis Criteria (Simplified Educational)

| | |
|---|---|
| File | [`src/data/calculators/wave6-em-peds.ts`](src/data/calculators/wave6-em-peds.ts) |
| Priority | **P0** |
| Pattern | `undefined-yesno-cutoff` |
| Inputs | `resp`, `cv`, `coag`, `neuro` |
| Do not change | 0–2 domain values, organ sum, sepsis = infection AND organ ≥2, shock = sepsis AND cv ≥1 |
| Research | Schlapbach LJ et al. JAMA 2024 Phoenix consensus table; Sanchez-Pinto LN et al. JAMA 2024 Table 2 |

**Current UI:** Coag option is 'Thrombocytopenia / coagulopathy meeting Phoenix-style thresholds (1)' with no numbers. Resp/CV/neuro are mild–moderate/severe, vasoactive or significant lactate/hypotension, GCS reduction, coma.

**Why the user cannot score from the calculator:** UI invokes official Phoenix thresholds then withholds them (platelets, INR, D-dimer, fibrinogen, PF/SF, IMV, lactate 5 and 11, age-MAP, GCS ≤10, fixed pupils). Educational 0–2 bins are fine; empty bins are not.

**Implement (schema only — helpText / option.description / label text):** Keep values 0/1/2 (do not expand to official resp 0–3 / CV 0–6). helpText + option.description mapping: Resp 0 = PF ≥400 or SF ≥292; 1 = PF <400 or SF <292 on any support; 2 = IMV and PF ≤200 or SF ≤220. CV 0 = no vasoactive, lactate <5, MAP above age floor; 1 = 1 vasoactive or lactate 5–10.9 or age-hypotension; 2 = ≥2 vasoactives or lactate ≥11. MAP 0-point floors mmHg: <1 mo >30; 1–11 mo >38; 1–<2 y >43; 2–<5 y >44; 5–<12 y >48; 12–17 y >51. Coag 0 = platelets ≥100k, INR ≤1.3, D-dimer ≤2 mg/L FEU, fibrinogen ≥100; 1 = any one abnormal; 2 = ≥2 abnormal. Neuro 0 = GCS >10 and reactive pupils; 1 = GCS ≤10; 2 = bilateral fixed pupils.

### `heart-score` — HEART Score for Major Cardiac Events

| | |
|---|---|
| File | [`src/data/calculators/cardiology.ts`](src/data/calculators/cardiology.ts) |
| Priority | **P0** |
| Pattern | `vague-ordinal` |
| Inputs | `history`, `ecg`, `risk` |
| Do not change | 0–2 per domain, 0–10 total, MACE bands 0–3 / 4–6 / 7–10, troponin ×ULN bins |
| Research | Six AJ et al. Neth Heart J 2008; Backus HEART flyer (heartscore.nl) risk-factor list (BMI >30, FHx); original ECG categories including LBBB/PM |

**Current UI:** History is only Slightly / Moderately / Highly suspicious. ECG is Normal / Non-specific repolarization disturbance / Significant ST deviation. Risk-factor helpText lists HTN, HLD, DM, obesity, smoking, positive family history without BMI or FHx age.

**Why the user cannot score from the calculator:** History has no typical vs nonspecific elements, so 0 vs 1 vs 2 is gestalt and needs a HEART card. ECG 1-point officially includes LBBB, paced rhythm, LVH strain, and digoxin effect — not named. Significant ST deviation has no mm criterion. Obesity and family history have published cutoffs (BMI >30; parent/sibling CVD before 65) that are hidden.

**Implement (schema only — helpText / option.description / label text):** Keep 0/1/2 values. option.description on history: 0 nonspecific features predominate (pleuritic, positional, well-localized sharp, reproducible); 1 mix of typical and nonspecific; 2 mostly typical ACS (retrosternal pressure, exertion, radiation to arm/jaw, diaphoresis, nausea, NTG relief). ECG: 0 normal; 1 LBBB, RV paced, LVH with strain, digoxin, or nonspecific ST-T without significant ST deviation; 2 significant ST depression or elevation (typically ≥1 mm). Expand risk helpText: HTN; hypercholesterolemia; DM; obesity (BMI >30); current or recent smoking; FHx = parent or sibling with CVD before age 65. Known CAD / MI / PCI-CABG / CVA / PAD = 2 points even if <3 risk factors.

### `bedsides-pews` — Bedside PEWS (Pediatric Early Warning)

| | |
|---|---|
| File | [`src/data/calculators/wave3-peds-ob.ts`](src/data/calculators/wave3-peds-ob.ts) |
| Priority | **P0** |
| Pattern | `vague-ordinal` |
| Inputs | `hr`, `rr`, `sbp`, `respEffort` |
| Do not change | option values 0–3, calculate() sum, escalation bands 0–2 / 3–4 / 5–6 / ≥7 |
| Research | Parshuram CS et al. Bedside PEWS appendix (Pediatr Child Health 2011 Appendix B; PMC3077313); original item table PMC2750193 |

**Current UI:** HR, RR, SBP options are 'Normal for age (0) / Mildly abnormal (1) / Moderately abnormal (2) / Severely abnormal (3)' with no bpm or mmHg. Respiratory effort is 'Normal / Mild / Moderate / Severe / impending failure'.

**Why the user cannot score from the calculator:** Bedside PEWS cannot be scored without the Parshuram age-band vital tables. 'Mildly/moderately/severely abnormal' has no operational cutoff; a 2-month-old HR of 160 is not the same band as a 10-year-old. User must recall or open an external PEWS card (exactly the NIHSS/CIWA failure mode). Pearls already admit 'Apply age-band vital norms from your hospital PEWS chart.'

**Implement (schema only — helpText / option.description / label text):** Do not change 0/1/2/3 values (official Bedside PEWS uses 0/1/2/4 — leave that mapping). Add helpText (and/or option.description) with Parshuram age-band cutoffs for HR, RR, and SBP, e.g. HR <3 mo: 110–149 = 0; ≥150 or ≤110 = 1; ≥180 or ≤90 = 2; ≥190 or ≤80 = 3 (educational). Repeat for 3–12 mo, 1–4 y, 5–12 y, ≥12 y from the published table. RR and SBP same source. For respEffort, use official anchors: Normal; Mild increase; Moderate increase; Severe increase or any apnea. Optional: one-line helpText 'Cap refill scored at the bedside; use institutional age table if it differs.'

### `pas-asthma` — Pediatric Asthma Score (PAS)

| | |
|---|---|
| File | [`src/data/calculators/wave3-peds-ob.ts`](src/data/calculators/wave3-peds-ob.ts) |
| Priority | **P0** |
| Pattern | `vague-ordinal` |
| Inputs | `rr` |
| Do not change | 1–3 item values, 5–15 total, mild ≤7 / moderate 8–11 / severe 12–15 bands |
| Research | Kelly CS et al. Ann Allergy Asthma Immunol 2000; Children's Mercy PAS table; FPNotebook Pediatric Asthma Score |

**Current UI:** Respiratory rate options: 'Normal for age (1) / Mildly elevated (2) / Markedly elevated (3)'. Other PAS items have operational findings (SpO2 numbers, wheeze location, retraction sites, speech).

**Why the user cannot score from the calculator:** Published PAS pathways score RR with age-specific breaths/min, not 'mildly/markedly elevated'. A bedside user cannot choose 1 vs 2 vs 3 without an external age table (common 2–3 y ≤34/35–39/≥40; 4–5 y ≤30/31–35/≥36; 6–12 y ≤26/27–30/≥31; >12 y ≤23/24–27/≥28).

**Implement (schema only — helpText / option.description / label text):** Keep values 1/2/3. Add helpText listing age-band RR cutoffs used by common PAS pathways (quote a single published table, e.g. Kelly/Children's Mercy / FPNotebook). Example: '2–3 y: ≤34 = 1, 35–39 = 2, ≥40 = 3; 4–5 y: ≤30 / 31–35 / ≥36; 6–12 y: ≤26 / 27–30 / ≥31; >12 y: ≤23 / 24–27 / ≥28. Use hospital PAS chart if it differs.'

### `exchange-transfusion-threshold` — Exchange Transfusion Threshold (Approximate)

| | |
|---|---|
| File | [`src/data/calculators/wave5-peds-id.ts`](src/data/calculators/wave5-peds-id.ts) |
| Priority | **P0** |
| Pattern | `vague-ordinal` |
| Inputs | `risk` |
| Do not change | threshold math, ABE lowering logic, option values low/med/high |
| Research | Kemper AR et al. Pediatrics 2022 AAP hyperbilirubinemia CPG (PMID 35927462) Table 2 and exchange figures 5–6 |

**Current UI:** Neurotoxicity risk band is only Lower / Medium / Higher risk. ABE helpText is already good.

**Why the user cannot score from the calculator:** User cannot choose the band that drives the threshold without AAP 2022 neurotoxicity-risk factors and GA mapping. Phototherapy in the same file at least embeds GA in labels.

**Implement (schema only — helpText / option.description / label text):** Mirror phototherapy labels: Lower risk (≥38 wks, well, no neurotoxicity risk factors); Medium (35–37+6 well, or ≥38 with any neurotoxicity risk factor); Higher (35–37+6 with any neurotoxicity risk factor). helpText AAP Table 2: albumin <3.0 g/dL; isoimmune hemolytic disease (DAT+), G6PD, or other hemolysis; sepsis; significant clinical instability in previous 24 h.

### `bilag-2004-index` — BILAG-2004 (Domain Grades)

| | |
|---|---|
| File | [`src/data/calculators/wave7-rheum-activity.ts`](src/data/calculators/wave7-rheum-activity.ts) |
| Priority | **P0** |
| Pattern | `vague-ordinal` |
| Inputs | `constitutional`, `mucocutaneous`, `neuro`, `msk`, `cardiorespiratory`, `gi`, `ophthalmic`, `renal`, `hematologic` |
| Do not change | nine domains, A–E values, any-A / any-B / C-only / D–E classification; do not add A=12 numeric conversion |
| Research | Isenberg DA et al. Rheumatology 2005 BILAG-2004; official BILAG-2004 glossary (University of Birmingham, copyright — point to the form) |

**Current UI:** A–E letters: Never / Inactive prior / Mild / Moderate / Severe. No helpText. Pearls admit the glossary is required.

**Why the user cannot score from the calculator:** A–C are mild/moderate/severe with no organ rules. Cannot grade a domain without the copyrighted 97-item BILAG-2004 glossary. D vs E is the only operational pair. UI looks administrable and is not.

**Implement (schema only — helpText / option.description / label text):** Keep A–E values. Do not reprint the glossary. helpText: assign letters only from a completed official BILAG-2004 worksheet — do not grade from mild/moderate/severe intuition. option.description: A = would typically start high-dose steroids/IS for that organ; B = moderate therapy change; C = mild stable; D = previous involvement now inactive; E = never involved.

---

## 10. P1 catalog — terse but partly scorable (286)

Same schema fix. Do not change math. Grouped by pattern. Full suggested wording is in JSON.

### P1 — Hidden numeric cutoffs on Yes/No items (`undefined-yesno-cutoff`, n=97)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `has-bled` | HAS-BLED Score | `cardiology.ts` | `bleed` | Predisposition is the hidden criterion (anemia, bleeding diathesis, prior major bleed). Two clinicians will disagree on remote epistaxis vs hospitalization for GI bleed. This item… | Pisters R et al. Chest 2010 HAS-BLED (B = bleeding history or predisposition) | 9 binary points, drugs and alcohol as separate points, ≥3 high-risk threshold |
| `pesi` | PESI (Pulmonary Embolism Severity Index) | `cardiology.ts` | `ams`, `o2` | AMS is the largest single PESI add-on. Official definition is disorientation, lethargy, stupor, or coma — not anxiety. Oxygen is <90% with or without supplemental O2. Mis-scoring … | Aujesky D et al. Am J Respir Crit Care Med 2005 PESI derivation (AMS and hypoxemia definitions) | age + sex 10 + item weights, class I–V cut points (≤65 / 66–85 / 86–105 / 106–1… |
| `revised-geneva` | Revised Geneva Score (PE) | `cardiology.ts` | `surgery`, `cancer`, `painPalp` | Official surgery/fracture is surgery under general anesthesia or lower-limb fracture within 1 month — not any fracture. Active malignancy is solid/hematologic tumor currently acti… | Le Gal G et al. Ann Intern Med 2006 revised Geneva score | item weights (age 1, prior VTE 3, HR 0/3/5, palpation+edema 4, etc.), 0–3 / 4–1… |
| `apache2-simp` | APACHE II (Simplified Educational) | `critical-care.ts` | `chronic` | Chronic-health points require pre-admission Knaus-defined insufficiency (NYHA IV, dialysis, portal HTN, etc.). Ordinary CHF/COPD do not all count. | Knaus WA et al. Crit Care Med. 1985 APACHE II chronic-health footnote | age-point bands, 15−GCS, APS select values, chronic + admitType 0/2/5 logic. Do… |
| `qsofa` | qSOFA Score | `critical-care.ts` | `ams` | Sepsis-3 qSOFA mentation is GCS <15 (any drop from 15), not free-form altered. | Singer M et al. JAMA 2016 Sepsis-3 qSOFA bedside criteria | three binary points, positive ≥2 |
| `caprini` | Caprini Score (VTE Risk) | `emergency-misc.ts` | `minorSurg`, `majorSurg`, `bedrest`, `familyVte`, `pregnancy` | Cannot score minor vs major without the 45-min split. Full Caprini bed rest >72 h is 2 points; this 1-point item needs a duration. Family history is first-degree. Postpartum windo… | Caprini JA Dis Mon 2005 RAM; subsequent surgical Caprini checklists | listed item weights, age 1/2/3, interpretation bands. Do not add omitted Caprin… |
| `nexus` | NEXUS C-Spine Criteria | `emergency-misc.ts` | `midline`, `intox`, `ams`, `focal`, `distracting` | Hoffman's methods sheet defines each criterion. Without it, altered alertness, intoxication, and especially distracting injury are not reproducible. | Hoffman JR et al. Ann Emerg Med 1998 NEXUS physician instruction sheet; Hoffman JR et al. NEJM 2000 | five OR → image vs clinically clear |
| `padua` | Padua Prediction Score (VTE Risk) | `emergency-misc.ts` | `cancer`, `reducedMob`, `thrombophilia`, `hormone` | Barbar definitions hidden: active cancer = metastases and/or chemo/radiotherapy in 6 months; reduced mobility = anticipated bed rest with bathroom privileges ≥3 days; thrombophili… | Barbar S et al. J Thromb Haemost 2010 Padua model definitions | point weights (3/3/3/3/2/1…), high risk ≥4 |
| `parkland` | Parkland Burn Formula | `emergency-misc.ts` | `tbsa` | Parkland %TBSA is partial- plus full-thickness only. Superficial/first-degree erythema is commonly included and inflates volume. | Baxter/Parkland formula teaching; ABA burn-size convention (partial + full thickness) | 4 × kg × %TBSA, half in first 8 h from injury, LR note |
| `wells-hit` | 4Ts Score for HIT | `emergency-misc.ts` | `other`, `thrombosis` | Other causes is the hard 4T and has zero anchors. Acute systemic reaction is specifically an IV UFH bolus reaction, not any fever. | Lo GK et al. J Thromb Haemost 2006 4Ts; Cuker A et al. 4Ts teaching tables | 0–2 per domain, sum 0–8, bands 0–3 / 4–5 / 6–8 |
| `glasgow-blatchford` | Glasgow-Blatchford Score (GBS) | `gi-neuro-psych.ts` | `hbMale`, `liver`, `heart` | Original GBS defines hepatic disease and cardiac failure as known history or clinical/lab (or radiographic) evidence. A woman with Hb 10–11.9 belongs in the 1-point band but can e… | Blatchford O et al. Lancet 2000 PMID 11073021 | point values 0/1/2/3/4/6, yes/no points, GBS 0–1 very-low-risk band |
| `rockall` | Rockall Score (Pre-endoscopy) | `gi-neuro-psych.ts` | `comorbid` | 'Other major' is undefined, so users may under- or over-score vs the original audit (any major comorbidity comparable to HF/IHD = 2; only renal failure, liver failure, or dissemin… | Rockall TA et al. Gut 1996 PMID 8675081 | option values 0/1/2/3, pre-endoscopy 3-item sum |
| `hestia-pe` | Hestia Criteria (Outpatient PE) | `missing-emergency.ts` | `bleed`, `liver`, `unstable` | Official high bleed-risk examples are time-windowed (GI bleed 14 d, stroke 4 wk, surgery 2 wk, platelets <75, HTN >180/110). Severe liver impairment is gestalt/cirrhosis — not sta… | Zondag W et al. J Thromb Haemost. 2011;9:1500-1507 Hestia criterion table | all-no = eligible logic; 11-item set |
| `nexus-chest` | NEXUS Chest Decision Rule | `missing-emergency.ts` | `intox`, `ams`, `distracting` | Same NEXUS operational gaps as C-spine: intoxication affecting alertness, AMS (GCS <15/disoriented), distracting injury that impairs chest exam. | Rodriguez RM et al. NEXUS Chest validations; NEXUS C-spine distracting-injury language adapted to chest | any-criterion-positive = image; age and mechanism cutoffs |
| `sf-syncope` | San Francisco Syncope Rule (CHESS) | `missing-emergency.ts` | `ecg` | Quinn’s criterion is any new change on any ECG from any source, or any non-sinus rhythm on ECG or monitoring (including prehospital). 'Abnormal ECG' otherwise includes old LBBB/LV… | Quinn JV et al. Ann Emerg Med. 2004;43:224-232; Quinn 2011 ECG criterion clarification | any-positive = high risk logic; other CHESS items |
| `aims65` | AIMS65 Score | `missing-gi-liver.ts` | `mental` | Original AIMS65 operationalizes AMS as GCS <14. Without that, scoring is inconsistent. | Saltzman JR et al. Gastrointest Endosc. 2011; validations listing GCS <14 | 1-point weighting, other four cutoffs, calculate() sum 0–5 |
| `nafld-fibrosis` | NAFLD Fibrosis Score | `missing-gi-liver.ts` | `ifg` | IFG is not a self-explanatory clinical fact — original NFS used a fasting-glucose cutoff (and/or known diabetes). | Angulo P et al. Hepatology 2007 NFS methods (IFG/diabetes) | NFS coefficients, cutoffs −1.455 / 0.676, calculate() |
| `ripasa` | RIPASA Appendicitis Score | `missing-gi-liver.ts` | `wbc`, `rovsing`, `negUA`, `fever`, `foreign` | Leukocytosis cutoff hidden (commonly >10 ×10⁹/L). Rovsing maneuver not stated. Negative UA undefined. Fever lists two cutoffs. Foreign-national point easy to misuse outside deriva… | Chong CF et al. Singapore Med J. 2010; AAFP RIPASA table (WBC >10,000/µL); standard Rovsing description | half-point weights (sex/age/duration/RLQ pain/migration), guarding 2 / Rovsing … |
| `hemorr2hages` | HEMORR₂HAGES Bleeding Risk Score | `missing-heme-id-nephro.ts` | `hepaticRenal`, `etoh`, `reducedPlt`, `htn`, `anemia`, `falls`, `genetic`, `rebleeding` | Gage definitions are numeric/operational (anemia without Hb is the contract example). Users guess Cr/AST/Hb/SBP cutoffs. | Gage BF et al. Am Heart J 2006 HEMORR2HAGES factor definitions | 1-point items, rebleeding = 2, calculate() sum, 0–1 / 2–3 / ≥4 bands |
| `rochester-criteria` | Rochester Criteria (Febrile Infant) | `missing-heme-id-nephro.ts` | `previouslyHealthy`, `well` | Rochester previously-healthy is a checklist, not a single vague phrase. Age ≤60 days and T ≥38°C are eligibility. | Dagan R et al. J Pediatr 1985 Rochester criteria; AAP 2021 febrile infant guideline for the historical-tool caveat | 7-item all-true logic, WBC 5–15k, ABC ≤1500, UA ≤10 WBC/hpf, stool ≤5 WBC/hpf |
| `step-by-step-fever` | Step-by-Step (Febrile Young Infant) | `missing-peds-ob-tox.ts` | `illAppearing`, `ageDays`, `leukocyturia` | Step 1 gestalt gate is not administrable. Age ≤21 d is a hard fail the age field does not announce. | Mintegi S et al. / Gomez B et al. Step-by-Step Pediatrics / Arch Dis Child validations | sequential fail logic (ill OR ≤21 d OR UA OR PCT≥0.5 OR CRP>20 OR ANC>10) |
| `atria-stroke` | ATRIA Stroke Risk Score | `wave2-cardiology.ts` | `proteinuria` | ATRIA derived proteinuria from urine dipstick (positive vs none/trace), not an unspecified clinical impression. ACR vs dipstick 1+ will be scored inconsistently. | Singer et al. J Am Heart Assoc 2013 ATRIA methods (urine dipstick proteinuria) | Age-by-prior-stroke point table; +1 non-age factors; 0–5 / 6 / ≥7 categories |
| `ichd-migraine` | ICHD Migraine Without Aura Helper | `wave2-neuro-psych.ts` | `unilateral`, `pulsating`, `moderateSevere`, `aggravation`, `photoPhono` | Hidden C/D sub-cutoffs mean users may think every C feature is required. D2 is AND (both light and sound), not either. ICHD C4 operationalizes routine physical activity as walking… | ICHD-3 (Cephalalgia 2018) 1.1 Migraine without aura criteria A–E | C≥2 and D≥1 logic, A ≥5 attacks, B 4–72 h, E not-other-diagnosis |
| `pecarn-cervical` | PECARN Pediatric C-Spine Risk Helper | `wave2-ortho-trauma.ts` | `ams`, `torso`, `predispose`, `focal`, `highRiskMvc` | 2011 PECARN CSI factors are not administrable: AMS is not a bit sleepy; substantial torso injury has a severity bar; predisposing conditions are a short list; focal findings inclu… | Leonard JC et al. Ann Emerg Med. 2011 PMID 21035905 (this helper’s factor list). Do not replace with Leonard 2024 Lance… | eight binary keys, redFlag = AMS or focal, count-based moderate branch |
| `charlson-comorbidity` | Charlson Comorbidity Index (CCI) | `wave2-pulm-id.ts` | `ckd`, `liverMild`, `liverSevere`, `dm`, `dmEnd`, `tumor`, `aids`, `chf` | Users will tick ordinary CKD, HIV without AIDS, diet-only diabetes, remote skin cancer, or any CHF history. Charlson 1987: CKD = Cr >3 mg/dL or dialysis/transplant/uremia; mild li… | Charlson ME et al. J Chronic Dis. 1987;40:373-383 methods definitions (Cr >3 mg/dL; 5-year tumor window) | weights, mutually exclusive dm/liver/cancer logic, age points 50–59:1 … ≥80:4 |
| `improve-vte` | IMPROVE VTE Risk Score | `wave2-pulm-id.ts` | `thrombophilia`, `cancer`, `immobile` | Which thrombophilias count, what active cancer is, and that immobilized means bed/chair confinement (including days before admission) are hidden. | Spyropoulos AC et al. Chest. 2011;140:706-714 IMPROVE VTE model | weights 3/2/2/2/1/1/1, bands 0–1 / 2–3 / ≥4 |
| `mulbsta` | MuLBSTA Score (Viral Pneumonia) | `wave2-pulm-id.ts` | `bacterial` | Coinfection is not any suspected bacteria. Derivation used positive respiratory/blood culture or a typical clinical + laboratory bacterial picture. | Guo L et al. MuLBSTA viral pneumonia mortality score — coinfection definition in derivation methods | weights 5/4/4/3/2/2, bands 0–6 / 7–9 / 10–11 / 12–22 |
| `sepsis-3-shock` | Sepsis-3 Septic Shock Helper | `wave2-pulm-id.ts` | `fluids` | Adequate is the hidden cutoff. Sepsis-3 leaves volume unspecified; SSC operationalizes ~30 mL/kg crystalloid (or clinically adequate preload) before the shock label. | Singer M et al. JAMA 2016 Sepsis-3; Evans L et al. Crit Care Med. 2021 SSC hour-1 30 mL/kg | infection AND vasopressors AND lactate >2 AND fluids logic; lactate threshold >2 |
| `bova` | BOVA Score (PE Severity) | `wave3-cardio-vasc.ts` | `rv`, `trop` | Bova RV dysfunction is operational (RV EDD >30 mm, RV>LV / RV:LV ≥0.9–1.0, free-wall hypokinesis, TR velocity ≥2.6 m/s). Troponin is any value above local URL. | Bova C et al. Eur Respir J. 2014 methods (RV dysfunction on TTE/CT; elevated cardiac troponin) | 2/1/2/2 weights, 0–7 total, stage I–III bands |
| `hcm-risk-scd` | HCM Risk-SCD (Simplified Educational) | `wave3-cardio-vasc.ts` | `fhScd`, `nsvt`, `syncope`, `abnormalBP` | Hidden official definitions: family SCD age/HCM qualifier; NSVT ≥3 beats ≥120 bpm <30 s; unexplained syncope not vasovagal/LVOTO, especially ≤6 months; abnormal exercise BP failur… | O’Mahony C et al. Eur Heart J. 2014 HCM Risk-SCD; ESC 2014 HCM footnotes; AHA/ACC 2020 HCM SCD table for BP item | educational factor-count logic, MWT/LA/LVOT numeric handling, not-a-substitute-… |
| `precise-dapt` | PRECISE-DAPT (Simplified Educational) | `wave3-cardio-vasc.ts` | `priorBleed` | Official variable is previous spontaneous bleeding, not access-site oozing, trivial epistaxis, or traumatic bleed. | Costa F et al. Lancet 2017 PRECISE-DAPT (previous spontaneous bleeding) | educational point weights, ≥25 high-band messaging, not-official-nomogram note |
| `boey-score` | Boey Score (Perforated Peptic Ulcer) | `wave3-em-surgery.ts` | `medicalIllness` | Boey’s first factor is a defined comorbidity cluster, not any outpatient diagnosis. Users will over-call well-controlled HTN/DM or under-call severe organ disease. | Boey J et al. Ann Surg. 1987;205:22-32 risk-factor definitions | three binary points, 0–3 bands, historical mortality text |
| `heaven-airway` | HEAVEN Difficult Airway Criteria | `wave3-em-surgery.ts` | `extremes`, `exsanguination` | 'Pediatric' is not ≤8 years; a 12-year-old or BMI 32 vs 40 will be scored inconsistently. Exsanguination in the validation papers is suspected anemia that would accelerate apneic … | Davis DP et al. Air Med J 2017 derivation; Nausheen/Kuzmack HEAVEN validation (age ≤8 or clinical obesity; SpO2 ≤93% at… | six equal yes/no criteria, 0 / 1–2 / ≥3 interpretation |
| `manheim-peritonitis` | Mannheim Peritonitis Index (Simplified) | `wave3-em-surgery.ts` | `organFailure`, `diffuse` | Organ failure is worth 7 points and is unscorable without Linder’s kidney/lung/shock/ileus table. Diffuse vs localized is >2 quadrants intraoperatively — not stated. | Linder MM et al. Chirurg 1987 MPI; subsequent validation tables reproducing organ-failure footnotes | weights (age 5, female 5, OF 7, malignancy 4, duration 4, non-colonic 4, diffus… |
| `strangulation-sbo` | SBO Strangulation Risk Features | `wave3-em-surgery.ts` | `lactate`, `sirs`, `leukocytosis` | Cannot tick lactate, SIRS, or leukocytosis without a cutoff. Educational feature-count still needs the numbers a junior would look up (lactate mmol/L, SIRS 4-item list, a single W… | Bone SIRS 1992; Jancelewicz / classic SBO ischemia series; surgical teaching reviews of strangulation signs | eight binary keys, 0–8 count, 0–1 / 2–3 / ≥4 interpretation bands |
| `upper-gi-bleed-abc` | ABC Score (Upper GI Bleed) | `wave3-em-surgery.ts` | `ams`, `asa`, `urea`, `albumin`, `creatinine` | Cannot apply AMS or ASA class from the UI. Laursen ABC comorbidity points depend on mental status and ASA; users still need an AMS operational definition and ASA I–V examples. US … | Laursen SB et al. Gut 2021 ABC score methods; ASA PS definitions; Saltzman AIMS65 GCS <14 as the usual UGIB AMS anchor | option values (age 0/1/2, urea 0/2/4, albumin 0/2/5, Cr 0/1/2, AMS +2, cirrhosi… |
| `pned` | PNED Score (UGIB Mortality, Simplified) | `wave3-gi-hep.ts` | `asa`, `instability`, `mental`, `renal`, `rebleed`, `failedEndo` | ASA class meaning, instability, mental status, 'severe CKD', and Marmo rebleed definition are not on screen. | Marmo R et al. Am J Gastroenterol 2010 PNED; ASA Physical Status classification | point weights, calculate() sum, educational-simplification scope (do not add mi… |
| `tokyo-cholangitis` | Tokyo Guidelines Cholangitis Severity | `wave3-gi-hep.ts` | `dysfnRenal`, `dysfnNeuro`, `albuminLow` | Oliguria is a hidden numeric criterion. Consciousness item is official TG18 wording but untestable without a gloss. Albumin needs a worked LLN example. | Kiriyama S et al. Tokyo Guidelines 2018 cholangitis severity | Grade III = any organ dysfunction, Grade II = ≥2 moderate predictors, CV dopami… |
| `tokyo-cholecystitis` | Tokyo Guidelines Cholecystitis Severity | `wave3-gi-hep.ts` | `dysfnCv`, `dysfnRenal` | TG18 Grade III CV failure is dopamine ≥5 µg/kg/min or any norepinephrine, not any pressor. Oliguria has no cutoff. | Yokoe M et al. Tokyo Guidelines 2018 cholecystitis severity | Grade III = any organ dysfunction; Grade II = any of WBC >18k / palpable mass /… |
| `incomplete-kawasaki` | Incomplete Kawasaki Disease Lab Helper | `wave3-peds-ob.ts` | `clinicalFeatures`, `anemia`, `echoPos` | AHA principal features are specific: nonexudative bulbar conjunctival injection; cracked lips/strawberry tongue/injected pharynx; rash (not vesicular); extremity erythema/edema or… | McCrindle BW et al. Circulation 2017 AHA KD statement (incomplete algorithm + echo definition) | inflam gate, ≥3/6 supplemental labs, fever <5 and ≥4-feature branches |
| `pecarn-fever` | PECARN Febrile Infant Rule (Simplified Age Bands) | `wave3-peds-ob.ts` | `uaPos` | User cannot mark UA positive without the PECARN definition. Kuppermann 2019: any leukocyte esterase, any nitrite, or >5 WBC/HPF (trace LE counts). | Kuppermann N et al. JAMA Pediatr 2019; ALIEM/PECARN UA definition (LE, nitrite, >5 WBC/HPF) | ANC 4090 and PCT 1.71 logic, age-band split, ill-appearing gate |
| `philadelphia-criteria` | Philadelphia Criteria (Febrile Infant) | `wave3-peds-ob.ts` | `bands` | Users confuse I:T (immature:total neutrophils) with band percentage/100. Entering 12% bands as 0.12 is not the Philadelphia BNR. Age eligibility (classically 29–56 days) is only i… | Baker MD et al. N Engl J Med 1993 Philadelphia criteria (WBC 5–15k, BNR <0.2, UA <10, CSF <8) | low-risk gate cutoffs in calculate() (WBC 5–15, BNR 0.2, UA 10, CSF 8) |
| `myxedema` | Myxedema Coma Diagnostic Score (Simplified) | `wave3-tox-endo-heme.ts` | `metabolic`, `cns`, `gi` | Cannot decide whether Na/glucose/PaO2/PCO2/GFR count. CNS obtunded vs somnolent vs mild lethargy has no exam anchors. Educational bins are fine; empty lab bins are not. | Popoveniuc G et al. Endocr Pract. 2014 Table 1 | simplified category values, +10 known-hypothyroidism, ≤24 / 25–59 / ≥60 bands |
| `nms-criteria` | NMS Diagnostic Criteria Helper | `wave3-tox-endo-heme.ts` | `ck`, `hyperthermia`, `ams`, `rigidity` | CK has no multiple of ULN; AMS is free-form; lead-pipe vs SS clonus named but not how to exam. Cannot decide elevated CK vs mild postoperative rise. | Gurrera RJ et al. 2011 international NMS consensus; DSM-5 NMS features; Caroff/Levenson reviews | exposure + feature-count logic, classic vs possible thresholds, educational not… |
| `egsys` | EGSYS Syncope Score | `wave4-em-id.ts` | `heartOrEcg`, `autonomic` | Abnormal ECG and heart disease have published lists. Without them scoring of trivial ECG variants will vary. Autonomic prodrome originally includes sweating. | Del Rosso et al. Heart 2008 (EGSYS); MDCalc EGSYS footnotes | Weights +4/+3/+3/+2/−1/−1; cutpoint ≥3 |
| `oesil-score` | OESIL Syncope Risk Score | `wave4-em-id.ts` | `cvHistory`, `abnormalEcg` | Same ECG/CVD look-up problem as EGSYS. 'Any heart history' and 'any ECG not perfectly normal' will mis-score. | Colivicchi et al. Eur Heart J 2003 (OESIL) | Four binary +1 items; ≥2 higher-risk cut |
| `vte-bleed` | VTE-BLEED Score | `wave4-em-id.ts` | `cancer`, `maleHtn`, `priorBleed` | Original definitions missing: cancer timing/treatment/skin-cancer exclusion; uncontrolled HTN is SBP ≥140 at baseline in men; bleeding includes prior major or CRNMB, rectal bleedi… | Klok et al. Eur Respir J 2016; VTE-BLEED variable footnotes in Br J Haematol / RPTH tables | Point weights 2 / 1 / 1.5 / 1.5 / 1.5 / 1.5; <2 vs ≥2 split |
| `cll-ipi` | CLL-IPI | `wave4-heme-onc.ts` | `ighv` | Reports often give % germline identity. Hidden cutoff: unmutated = ≥98% identity to germline (CLL-IPI / ERIC). 97.0–97.9% is mutated on the 98% convention. | International CLL-IPI working group. Lancet Oncol. 2016 PMID 27185642; ERIC IGHV recommendations | weights 1/1/2/2/4, bands 0–1 / 2–3 / 4–6 / 7–10 |
| `dipss` | DIPSS (Primary Myelofibrosis) | `wave4-heme-onc.ts` | `symptoms` | IWG-MRT/DIPSS constitutional symptoms are not any weight loss or a single fever spike. Hidden cutoffs: weight loss >10% of baseline in the preceding year and/or unexplained fever … | Passamonti F et al. Blood. 2010 PMID 20008785; Cervantes IPSS / Tefferi How I treat myelofibrosis Blood 2011 constituti… | weights (Hb = 2), low 0 / int-1 1–2 / int-2 3–4 / high 5–6 |
| `dipss-plus` | DIPSS-plus (Myelofibrosis) | `wave4-heme-onc.ts` | `transfusion`, `dipssCategory` | Cannot tell whether a remote 1-unit transfusion, current need, or WHO transfusion dependence ticks the box. Category labels omit DIPSS point bands so raw DIPSS points can be mis-m… | Gangat N et al. J Clin Oncol. 2011 PMID 21149668 | DIPSS-category 0–3 plus three +1 factors, groups 0 / 1 / 2–3 / 4–6 |
| `durie-salmon` | Durie-Salmon Stage (Simplified) | `wave4-heme-onc.ts` | `stageFeatures` | Hb numbers present; calcium 12 mg/dL, isotype M-protein grams, urine light-chain 24 h amounts, and limited vs advanced lytic bone scale are not. A patient with IgG 6 g/dL cannot b… | Durie BG, Salmon SE. Cancer. 1975 PMID 1182674; IMF Durie-Salmon table | I/II/III select values, A/B creatinine 2.0 mg/dL logic |
| `spot-sign` | CTA Spot Sign Helper (ICH Expansion) | `wave4-neuro-psych.ts` | `spotSign`, `bpUncontrolled`, `anticoag` | Common operational rules (≥120 HU, discontinuous from outside vessels, any morphology, no matching NCCT calcium) are missing so mimics get scored. Markedly elevated SBP and coagul… | Demchuk AM et al. Lancet Neurol. 2012 PREDICT; common ≥120 HU + discontinuous-from-vessel definitions; AHA ICH BP targe… | spot = 2 points, clinical tally, CTA-absent branch |
| `glasgow-aneurysm` | Glasgow Aneurysm Score | `wave5-cardio.ts` | `shock` | Original GAS shock is SBP <90 mmHg. 'Hemodynamic instability' invites scoring vasoplegia or relative hypotension the derivation did not count. | Samy AK et al. Eur J Vasc Endovasc Surg 1994 PMID 8049922 | point weights (age + 17/7/10/14), calculate() sum |
| `schwartz-lqts` | Schwartz LQTS Diagnostic Score | `wave5-cardio.ts` | `lowHr` | Official criterion is resting HR below the 2nd percentile for age (Schwartz 2011), not a gestalt 'low.' | Schwartz PJ et al. Circulation 1993 PMID 8339437; Schwartz & Crotti 2011 score update (2nd-percentile HR) | point weights, TdP/syncope mutual-exclusion rule, ≥3.5 / 1.5 cutoffs |
| `warfarin-inr-goal` | Warfarin INR Goal by Indication | `wave5-cardio.ts` | `indication` | User cannot choose avr_low vs avr_high without the ACC/AHA TE-risk list on the option. | 2020 ACC/AHA Valvular Heart Disease Guideline, Otto CM et al. Circulation 2021 PMID 33332150 | indication keys, INR numeric bounds returned by calculate() |
| `dengue-warning` | Dengue Warning Signs Checklist | `wave5-peds-id.ts` | `shock` | WHO compensated shock is pulse pressure ≤20 mmHg (or hypotension with poor perfusion). | WHO Dengue guidelines 2009 and later handbook case classification / shock definitions | warning-sign count, severe-domain ×3, group A/B/severe logic |
| `failure-to-thrive` | Failure to Thrive Helper (Weight-for-Age Z) | `wave5-peds-id.ts` | `poorGain` | Poor gain duplicates percentile crossing unless a velocity cutoff is stated. | WHO child growth standards / weight-velocity tables; Jaffe AC. Pediatr Rev 2011 FTT (PMID 21364013) | z-band values 0–3, item weights, helper thresholds |
| `malaria-severity` | Severe Malaria Criteria Count (WHO) | `wave5-peds-id.ts` | `impairedConscious`, `acidosis`, `anemia`, `renal`, `jaundice`, `pulmonary`, `shock`, `hyperparasitemia` | Any one feature defines severe malaria; hidden cutoffs change the count. | WHO Guidelines for malaria 2022/2023 severe falciparum criteria; WHO severe malaria practical handbook | 12-feature count, any-one-feature = severe logic |
| `petechiae-risk` | Fever with Petechiae Risk (NICE-style Traffic Light) | `wave5-peds-id.ts` | `resp` | NICE NG143 red oxygen is SpO2 <92% in air. Low is a hidden cutoff. | NICE NG143 Fever in under 5s | feature weights, green/amber/red helper bands |
| `phototherapy-threshold` | AAP-Style Phototherapy Threshold (Approximate) | `wave5-peds-id.ts` | `risk` | Medium vs higher risk requires the AAP 2022 neurotoxicity-risk list. | Kemper AR et al. Pediatrics 2022 (PMID 35927462) Table 2; AAP phototherapy figures 2–3 | option values low/med/high, approximate threshold function |
| `pims-ts` | PIMS-TS / MIS-C Criteria Helper | `wave5-peds-id.ts` | `inflammation` | CDC/WHO case definitions use numeric inflammatory cutoffs; elevated CRP is not operational. | CDC MIS-C case definition; WHO 2020 MIS-C preliminary case definition | yes/no weights, core-pattern boolean logic |
| `pneumonia-peds` | Pediatric Pneumonia Severity (Modified) | `wave5-peds-id.ts` | `rrHigh`, `infant` | BTS/IDSA severe-CAP RR cutoffs are numeric; user cannot tick rrHigh without an age table. | Bradley JS et al. IDSA/PIDS CAP 2011 (PMID 21880587); Harris M et al. BTS pediatric CAP 2011 (PMID 21903691) | feature weights, threshold bands 0–1 / 2–4 / ≥5 |
| `gupta-mica` | Gupta MICA Perioperative Risk (Simplified) | `wave5-surg-uro-ent.ts` | `functional` | NSQIP functional status is human assistance for ADLs (devices still = independent). Otherwise guessed as mobility or IADLs. | ACS-NSQIP functional status definitions; Gupta PK et al. Circulation. 2011;124:381-387 | simplified logit coefficients or procedure grouping values |
| `nnis-ssi` | NNIS Surgical Site Infection Risk Index | `wave5-surg-uro-ent.ts` | `longDuration` | T is procedure-specific; 'often 2–3 h' is not enough to score cholecystectomy vs colon vs CABG. | Culver DH / CDC NNIS; current NHSN procedure-specific duration cut points (T times) | 0–3 index (ASA≥3 + contaminated/dirty + duration>T) |
| `wses` | WSES Sepsis Severity Score (Surgical) | `wave5-surg-uro-ent.ts` | `healthcare`, `immunosuppression`, `acuteRenal`, `ards`, `cardiovasc`, `hepatic`, `neuro`, `coag` | WISS defined these items. HCAI, immunosuppression (steroids/chemo/HIV), and organ failures (Cr, bilirubin, platelets/INR, pressors, GCS, PaO2/FiO2) cannot be applied from labels. | Sartelli M et al. World J Emerg Surg. 2015;10:22 WISS appendix | point weights; simplified omission of origin-of-IAI items (formula/simplificati… |
| `anaphylaxis-criteria` | Anaphylaxis Criteria (NIAID/FAAN) | `wave5-tox-psych.ts` | `hypotension_endorgan`, `hypotension_only` | Criterion 3 and the CV limb hide published BP cutoffs (adults SBP <90 or >30% drop; pediatric age-specific). Likely vs known allergen (criterion 2 vs 3) has no helpText. | Sampson HA et al. JACI 2006 NIAID/FAAN Table 1 pediatric SBP footnote | yes/no values; calculate() Boolean pathways for criteria 1/2/3 |
| `needle-stick-pep` | Occupational Needle-Stick PEP Helper | `wave5-tox-psych.ts` | `hbv_immune` | Adequate anti-HBs is a defined USPHS cutoff (≥10 mIU/mL). Unknown vs immune is unanswerable without that number. | Kuhar DT et al. USPHS occupational HIV PEP 2013; CDC HBV postexposure (anti-HBs ≥10 mIU/mL) | exposure_type values, 72 h flag logic, calculate() PEP branching |
| `aki-cause` | AKI Cause Likelihood (Pre-renal vs ATN Checklist) | `wave6-clinical-residual.ts` | `highSpGrav`, `ckRise` | Concentrated urine and 'markedly elevated CK' still require a card. Teaching: SG ≥1.020 or Uosm ≥500 favors pre-renal concentrating ability; rhabdomyolysis-range CK typically >5,0… | Standard AKI urine-index teaching; KDIGO AKI; rhabdomyolysis/pigment nephropathy reviews | 7 vs 5 feature counts and delta rule for favor pre-renal / ATN / mixed |
| `ascites-grade` | Clinical Ascites Grade (1–3) | `wave6-clinical-residual.ts` | `refractory` | IAC/EASL refractory ascites is unresponsive to salt restriction plus spironolactone 400 mg/day and furosemide 160 mg/day, or diuretic-intractable, or reaccumulation requiring LVP … | EASL decompensated-cirrhosis/ascites CPG; International Ascites Club refractory-ascites definition | grade 1/2/3 values; refractory yes/no does not enter the grade number |
| `beta-blocker-tox` | Beta-Blocker Toxicity Checklist | `wave6-clinical-residual.ts` | `qrsWide`, `hypoglycemia`, `bradycardia` | Membrane-stabilizing BB toxicity is scored on QRS ≥120 ms. Hypoglycemia should be <70 mg/dL or symptomatic. Symptomatic bradycardia is clinical but a numeric floor (HR <50–60 with… | Graudins et al. Br J Clin Pharmacol 2016; poison-center BB/CCB guidance | 7-feature count, agent select values, severe-pattern branching |
| `ranson-full` | Ranson's Criteria (Full Admission + 48 h) | `wave6-clinical-residual.ts` | `age`, `wbc`, `glu`, `ldh`, `bun`, `bd`, `fluid` | Gallstone pancreatitis uses different 48 h cutoffs (BUN rise >2 mg/dL, BD >5, fluid >4 L) plus age >70 / WBC >18k / glucose >220 / LDH >400. File comment claims dual thresholds ar… | Ranson JH et al. Surg Gynecol Obstet 1974; standard alcoholic vs biliary Ranson tables (MDCalc Ranson) | 11 yes/no values, 5+6 split, total /11, risk bands 0–2 / 3–4 / 5–6 / ≥7 |
| `smoke-inhalation` | Smoke Inhalation Severity Checklist | `wave6-clinical-residual.ts` | `largeTbsa`, `highCo` | 'Large' is not a burn-center number (ABA-style ≥20% TBSA adults, ≥10% children). Elevated COHb is not a smoker 5–10% baseline; many pathways flag COHb >10% plus cyanide concern in… | ABA burn-center referral criteria; inhalation-injury reviews (soot/voice change + COHb) | 8-item count; airway-threat logic (hoarse OR AMS OR facial+singed) |
| `hsp-criteria` | IgA Vasculitis (HSP) EULAR/PRINTO/PRES Criteria | `wave6-em-peds.ts` | `renal` | Ankara/EULAR renal criterion is quantitative: proteinuria >0.3 g/24 h or morning ACR ≥30 mmol/mg, hematuria >5 RBC/HPF or ≥2+ dipstick or RBC casts — not any protein/blood. | Ozen S et al. Ann Rheum Dis. 2010 EULAR/PRINTO/PRES HSP criteria | purpura mandatory + ≥1 extra domain, alternate-diagnosis override |
| `neonatal-los-checklist` | Neonatal Late-Onset Sepsis Clinical Checklist | `wave6-em-peds.ts` | `tempInstab`, `perfusion`, `glucose`, `prematurity`, `priorAbx` | Hidden cutoffs: hypo/hyperthermia °C, CRT seconds, glucose mg/dL, VPT/EPT/VLBW definitions, what recent means. | Shane AL et al. Lancet 2017 LOS review; WHO/AAP preterm and VLBW definitions | yes/no keys, weights (perfusion/neuro/apneaBrady = 2), threshold bands |
| `pph-class` | Postpartum Hemorrhage Blood Loss Classification | `wave6-em-peds.ts` | `tachycardia`, `hypotension` | No HR or SBP/pulse-pressure numbers. ACOG PPH includes signs of hypovolemia; staged bundles use explicit vital triggers. | ACOG Practice Bulletin 183 (2017) PPH definition; CMQCC/NPMS obstetric hemorrhage stages | 500 vs 1000 mL route logic, stage helper thresholds, hypovolemia-override |
| `cat-score` | CAT Score (Cancer-Associated Thrombosis, Simplified) | `wave6-heme-onc.ts` | `ddimer` | Elevated is not a score. Vienna CATS used a study-specific D-dimer threshold, not any value above local ULN. | Ay C et al. Blood 2010 Vienna CATS (PMID 20829374); Khorana Blood 2008 site list already on the select | Khorana core weights; optional D-dimer and prior-VTE +1; educational banding |
| `hep-score` | HEP Score (HIT Expert Probability) | `wave6-heme-onc.ts` | `systemicRxn`, `severeInfection`, `newDrug`, `onsetType` | Acute systemic reaction is a specific HIT entity (not any side effect). Severe infection has no operational gloss. Culprit non-heparin drugs unnamed. Typical vs rapid onset is eas… | Cuker A et al. JTH 2010 HEP (PMID 20854372); Warkentin acute systemic reaction after IV heparin | point weights including negatives; typical vs rapid timing values; no-other-cau… |
| `neutropenic-colitis` | Neutropenic Colitis (Typhlitis) Risk Features | `wave6-heme-onc.ts` | `fever`, `mucositis` | Two calculators in this file disagree on fever. Severe without WHO grade is the P1 ordinal pattern. | Nesher/Rolston typhlitis reviews; IDSA FN fever definition; WHO mucositis grades already in mucositis-who | ANC <500 / <1000 point logic; CT + pain/fever highly-consistent branch; C. diff… |
| `chokai-score` | CHOKAI Score (Ureterolithiasis) | `wave6-psych-sleep.ts` | `hematuria` | Original CHOKAI O is occult blood in urine (dipstick), not unspecified hematuria. Dipstick vs microscopy vs gross changes who clicks Yes. | Fukuhara H et al. Am J Emerg Med. 2017 PMID 28633903; CHOKAI acronym occult blood | Point weights (hydro 4, hematuria 3, CRP 2, others 1); cutoff ≥6 |
| `oasis-score` | OASIS ICU Score (Simplified Educational) | `wave6-psych-sleep.ts` | `cancer`, `hr`, `rr`, `gcs` | Prolonged has no hours/days cutoff (official OASIS uses continuous pre-ICU LOS, no cancer item). Entering highest HR/RR misses bradycardia/bradypnea points the educational map sti… | Johnson AE et al. Crit Care Med. 2013 PMID 23660729; MIMIC OASIS table (worst HR/RR/temp including low extremes) | Educational point map; disclaimer that this is not the official OASIS logit |
| `berlin-sleep` | Berlin Questionnaire (Sleep Apnea Screen) | `wave6-scores-residual.ts` | `bmi` | Bedside user entering BMI cannot see that BMI >30 kg/m² (as coded) makes Category 3 positive. Category 1/2/3 grouping is not on the form. | Netzer NC et al. Ann Intern Med. 1999;131:485-491. Berlin Questionnaire scoring (categories 1–3). | item 0/1 values; cat1/cat2 ≥2 and cat3 ≥1 rules; high risk if ≥2 categories; bm… |
| `elixhauser-simp` | Elixhauser Comorbidity Count (Simplified) | `wave6-scores-residual.ts` | `obesity`, `weightLoss` | Elixhauser obesity maps to ICD obesity / adult BMI ≥30 (Z68.30+). Weight loss maps to coded malnutrition/abnormal weight loss, not voluntary diet. Hidden cutoffs on those two item… | Elixhauser A et al. Med Care. 1998. AHRQ Elixhauser Comorbidity Software ICD-10 obesity (E66, Z68.30+) and weight-loss … | 28 binary flags; unweighted sum; collapsed HTN/DM as in pearls |
| `hendrich-fall` | Hendrich II Fall Risk Model | `wave6-scores-residual.ts` | `elimination`, `depression`, `getup` | Elimination is incontinence/nocturia/frequency/urgency/diarrhea/cathartics/toileting deficit; a quiet Foley does not count. Controlled depression should not score. Get-up is rise-… | Hendrich AL et al. Appl Nurs Res. 2003. Hendrich II / AHI of Indiana instructions (LOINC 104028-6 panel: altered elimin… | weights 4/2/1/1/1/2/1 and get-up 0/1/3/4; high-risk cutoff ≥5 |
| `masld-criteria` | MASLD / MetALD Diagnostic Helper | `wave7-bedside.ts` | `glucoseMet`, `waistMet` | 2023 adult glucose criterion is FPG ≥100 mg/dL or 2-h OGTT ≥140 or HbA1c ≥5.7% or T2D/treatment (HOMA-IR ≥2.5 is the IR add-on). Isolated FPG 110 with HbA1c 5.5 may be scored No. … | Rinella ME et al. Hepatology 2023 MASLD Delphi, adult cardiometabolic criteria table | classification rules (steatosis + ≥1 metabolic + alcohol bands), sex-specific 2… |
| `ain-risk` | Acute Interstitial Nephritis Clinical Likelihood (Educational) | `wave7-fillins.ts` | `eos` | Eosinophilia is a hidden lab cutoff (commonly AEC ≥500/µL or ≥5%). | Moledina DG, Perazella MA. CJASN 2017 (PMID 28877926); Moledina NDT 2021 (this helper is educational, not the EHR logis… | weighted points; duration <3 / 3–7 / ≥8 bands; educational thresholds |
| `improve-dd` | IMPROVE-DD VTE Risk Score | `wave7-fillins.ts` | `thrombophilia`, `immobility`, `cancer` | IMPROVE operationalizes thrombophilia with examples, immobilization as confined to bed or chair ± bathroom privileges, and cancer as currently active. Bare labels over-call immobi… | Spyropoulos AC et al. Chest 2011 IMPROVE (PMID 21436241); Gibson IMPROVEDD footnotes on thrombophilia and immobilization | weights 3/2/2/2/1/1/1/+2 D-dimer; bands 0–1 / 2–3 / ≥4 |
| `ranson-pancreatitis` | Ranson Criteria (Admission + 48-Hour) | `wave7-fillins.ts` | `fluid`, `age`, `wbc`, `glu`, `ldh` | Fluid sequestration is net positive fluid balance (intake − output) over 48 hours, not looks third-spaced. Gallstone pancreatitis uses different age/WBC/glucose/LDH thresholds; a … | Ranson JH et al. Surg Gynecol Obstet 1974 (PMID 4834279); Ranson 1982 biliary variant cutoffs | 11 binary items; 0–2 / 3–4 / 5–6 / ≥7 bands; 48 h vs admission split in calcula… |
| `tmacs` | T-MACS (Troponin-only Manchester ACS) | `wave7-highuse.ts` | `ecgIschemia` | Original T-MACS ECG ischemia is a defined ECG finding, not gestalt looks ischemic. | Body R et al. Emerg Med J 2017 T-MACS (PMID 27164947) | logistic coefficients, 2% / 5% / 95% bands, trop-ratio scaling |
| `qrisk3` | QRISK3-style 10-year CVD risk (educational) | `wave7-prevention.ts` | `fhCad`, `smi`, `steroids`, `treatedHtn`, `antipsychotic` | Formula tool but labels hide QRISK3 Box 1 definitions. Premature CAD is often AHA 55/65, not QRISK3 1st-degree relative <60 with angina or MI. SMI includes schizophrenia, bipolar,… | Hippisley-Cox et al. BMJ 2017 PMID 28536104 Box 1; qrisk.org question list | Educational LP; not-licensed / use qrisk.org disclaimer |
| `ffs-2011` | Five-Factor Score (revised 2011) | `wave7-rheum-activity.ts` | `cardiac`, `gi` | GI in FVSG is bleeding, perforation, infarction, or pancreatitis — not mild pain. Cardiac is vasculitis-related cardiomyopathy/insufficiency, not incidental CAD. | Guillevin L et al. Medicine (Baltimore). 2011;90:19–27; 1996 FFS GI footnote | five binary +1 items, ENT-absence always live, 0 / 1 / ≥2 mortality bands |
| `lldas` | Lupus Low Disease Activity State (LLDAS) | `wave7-rheum-activity.ts` | `majorOrgan`, `intoleranceIS` | Franklyn also excludes haemolytic anaemia and GI activity; etc. hides them. Criterion 5 is well-tolerated standard maintenance therapy — patients on no IS can still meet LLDAS. | Franklyn K et al. Ann Rheum Dis. 2016;75:1615–1621 LLDAS | AND of six criteria, SLEDAI ≤4, PGA ≤1, prednisone ≤7.5 mg/d |
| `sle-das` | SLE-DAS (Jesus 2019) | `wave7-rheum-activity.ts` | `arthritis`, `mucocutVasc`, `alopecia`, `ulcers`, `neuropsych`, `systemicVasc`, `cardioPulm`, `myositis` | Heavily weighted items (NPSLE, vasculitis, cardiopulmonary, myositis, serositis, haemolysis) have no definitions. Haemolysis is Coombs+LDH+low haptoglobin, not any anaemia. Arthri… | Jesus D et al. Ann Rheum Dis. 2019;78:365–371 and supplementary Tables S1–S2 | 17-item weights, ln(Prot/Plat/WBC) only when flags are Yes, cutoffs ≤2.08 / ≤7.… |
| `acr-eular-aps-2023` | 2023 ACR/EULAR Antiphospholipid Syndrome Classification | `wave7-rheum-class.ts` | `vte`, `arterial`, `microvascular`, `lac`, `aclIgg`, `b2Igg` | Cannot choose moderate vs high without unit cutoffs; cannot mark provoked VTE or high-risk CVD without the paper’s risk-factor lists; cannot separate suspected vs established micr… | Barbhaiya M et al. Arthritis Rheumatol. 2023 definitions/supplement | clinical ≥3 AND lab ≥3; do not collapse solid-phase isotypes unless a scoring-l… |
| `acr-eular-ra-2010` | 2010 ACR/EULAR Rheumatoid Arthritis Classification | `wave7-rheum-class.ts` | `joints`, `serology` | Cannot score the 0–5 joint domain without the small/large lists and DIP/1st CMC/1st MTP exclusions. Cannot split low vs high serology without the 3× ULN rule on the input. | Aletaha D et al. Ann Rheum Dis / Arthritis Rheum. 2010 Table 3 footnotes | domain points 0–5 / 0–3 / 0–1 / 0–1, ≥6 + swollen-joint entry + no better alter… |
| `acr-eular-ssc-2013` | 2013 ACR/EULAR Systemic Sclerosis Classification | `wave7-rheum-class.ts` | `pahIld`, `raynaud`, `nailfold` | 2013 definitions: PAH by RHC (or equivalent echo) and ILD by HRCT or PFTs — not a clinical impression. Raynaud is biphasic/triphasic color change; nailfold is dilated loops/dropou… | van den Hoogen F et al. Ann Rheum Dis. 2013 item definitions | mutually exclusive skin + fingertip points, other weights, ≥9 |
| `asas-axspa` | ASAS Axial Spondyloarthritis Classification (2009) | `wave7-rheum-class.ts` | `ibp`, `sacroiliitis`, `nsaidResponse`, `familySpA`, `crp` | Inflammatory back pain, MRI/x-ray sacroiliitis, NSAID response, family history, and elevated CRP each have published operational rules. A yes on IBP or sacroiliitis without those … | Rudwaleit M et al. Ann Rheum Dis. 2009 parts I–II; ASAS MRI sacroiliitis definition | imaging arm = sacro + ≥1 feature; clinical arm = HLA-B27 + ≥2 other; entry requ… |
| `eular-acr-sle-2019` | 2019 EULAR/ACR SLE Classification | `wave7-rheum-class.ts` | `constitutional`, `hematologic`, `msk`, `apl` | Hidden cutoffs: fever >38.3°C; WBC <4.0×10⁹/L; platelets <100×10⁹/L; joints = synovitis ≥2 joints or tenderness ≥2 + ≥30 min stiffness; aPL = medium/high aCL or anti-β2GPI or LAC.… | Aringer M et al. Ann Rheum Dis / Arthritis Rheumatol. 2019 definitions table | ANA entry, domain weights, classify if ANA + total ≥10 + ≥1 clinical domain |

### P1 — Abbreviated questionnaire / criteria stems (`abbreviated-stem`, n=51)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `curb65` | CURB-65 Score | `critical-care.ts` | `confusion` | Lim/BTS define confusion as AMTS ≤8 or new disorientation in person, place, or time. Stem is not administrable. | Lim WS et al. Thorax 2003; BTS CAP guidelines; Qureshi/Hodkinson AMTS | five binary points, 0–1 / 2 / 3–5 bands |
| `news2` | NEWS2 Score | `critical-care.ts` | `spo2`, `conscious` | Hypercapnic patients with prescribed 88–92% target must use RCP Scale 2; Scale 1 falsely inflates NEWS2. ACVPU letters (Voice/Pain/Unresponsive) and new confusion are unexplained. | Royal College of Physicians NEWS2 2017 chart (Scale 1/Scale 2 and ACVPU) | Scale 1 SpO2 values, O2 +2, other vital bins, total, 0–4 / 5–6 / ≥7 bands. Do n… |
| `psi-port` | PSI / PORT Score (Pneumonia) | `critical-care.ts` | `ams`, `neoplasm`, `liver`, `cerebro`, `renal` | Fine 1997 AMS is disorientation, stupor, or coma. Neoplasm excludes basal/squamous skin and is active or diagnosed within 1 year. Liver = cirrhosis or chronic liver disease. Those… | Fine MJ et al. NEJM 1997 PORT/PSI methods appendix | age + sex −10, comorbidity/physical/lab point weights, class I–V cutoffs |
| `canadian-cspine` | Canadian C-Spine Rule | `emergency-misc.ts` | `highRisk`, `lowRisk`, `rotate` | Dangerous mechanism is the pocket-card list (fall ≥3 ft/5 stairs, axial load/diving, MVC >100 km/h, rollover, ejection, motorized recreational vehicle, bicycle collision). Simple … | Stiell IG et al. JAMA 2001 Canadian C-Spine Rule figure footnotes | high-risk → image; else no low-risk → image; else unable 45° → image; else clea… |
| `stop-bang` | STOP-BANG Sleep Apnea Screen | `emergency-misc.ts` | `snore`, `tired`, `observed`, `pressure` | Official STOP questions have operational examples (heard through a closed door / partner elbows you; falling asleep while driving or talking; choking/gasping; have or treated for … | Chung F et al. Anesthesiology 2008 STOP; Chung F et al. BJA 2012 STOP-Bang | eight binary points, 0–2 / 3–4 / ≥5 bands. Do not switch neck to sex-specific 1… |
| `centor-feverpain` | FeverPAIN Score | `extra.ts` | `fever`, `purulence`, `attend3`, `inflamed`, `noCough` | Stems are close to NICE/FeverPAIN but too terse. Purulence does not say pus on tonsils (could be nasal discharge). Severely inflamed tonsils has no operational finding. 'No cough … | Little P et al. BMJ 2013 PRISM PMID 24114306; NICE NG84 FeverPAIN items; SE London ICS FeverPAIN card (purulence = pus … | five binary items; thresholds 0–1 / 2–3 / 4–5 and published strep probabilities… |
| `nyha` | NYHA Functional Classification | `extra.ts` | `class` | II vs III both say comfortable at rest without the ordinary vs less-than-ordinary activity distinction, so class cannot be assigned from the UI. Slight/marked are undefined. Sympt… | NYHA Criteria Committee Nomenclature and Criteria for Diagnosis 9th ed. 1994; AHA Classes of Heart Failure; 2022 AHA/AC… | values 1–4; interpretation risk bands |
| `gad7` | GAD-7 Anxiety Screen | `gi-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7` | Cannot administer as published. Restless omits 'so restless that it is hard to sit still'; Worrying too much omits 'about different things.' GAD-7 is Pfizer-copyrighted but freely… | Spitzer RL et al. Arch Intern Med 2006 PMID 16717171; phqscreeners.com | option values 0–3, 7-item sum 0–21 |
| `phq9` | PHQ-9 Depression Screen | `gi-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8` | PHQ-9 is a 2-week instrument; several stems drop clinically important clauses (item 6 failure/family, item 8 observed psychomotor change, item 9 passive death wish). Cannot admini… | Kroenke K et al. J Gen Intern Med 2001 PMID 11556941; https://www.phqscreeners.com | option values 0–3, 9-item sum 0–27, item-9 safety branch |
| `edacs` | EDACS (Emergency Department Assessment of Chest Pain Score) | `missing-cardio-pulm.ts` | `riskCad` | Known CAD is undefined (prior MI / revasc / stenosis). Family history omits premature/first-degree wording used in EDACS derivations. | Than M et al. Emerg Med Australas. 2014 PMID 24428678 and paper/appendix risk-factor definitions | age-point table, male +6, CAD/RF +4, diaphoresis +3, radiation +5, pleuritic -4… |
| `smart-cop` | SMART-COP Score | `missing-cardio-pulm.ts` | `confusion` | No bedside operational definition (unlike CRB-65 in the same file: new disorientation to person/place/time). Chronic cognitive impairment may be over-called; AMT≤8 not mentioned. | Charles PG et al. Clin Infect Dis. 2008 PMID 18558884; Lim WS CURB-65 confusion definition Thorax 2003 | point weights (SBP/O2/pH = 2), age-adjusted RR and O2 cutoffs already in helpTe… |
| `canadian-syncope` | Canadian Syncope Risk Score | `missing-emergency.ts` | `vasovagalPredis`, `heartDisease`, `abnQrsAxis`, `troponinElev` | Official vasovagal predisposition is warm crowded place, prolonged standing, fear, emotion, or pain. Heart disease is CAD, AF/flutter, HF, valvular, cardiomyopathy, arrhythmia/dev… | Thiruganasambandamoorthy V et al. CMAJ. 2016;188:E289-E298; MDCalc CSRS item help | point weights or risk bands |
| `cssrs-screen` | C-SSRS Screener (Simplified) | `missing-neuro-psych.ts` | `wishDead`, `siNonSpecific`, `siMethod`, `siIntent`, `siPlanIntent`, `behavior` | C-SSRS is copyrighted. These stems are not the official questions, and ideation time frame (typically past month on the screener) is omitted. Do not treat paraphrases as equivalen… | Posner K et al. Am J Psychiatry 2011 PMID 22193671; cssrs.columbia.edu screener (do not paste item text) | yes/no structure, ideation ladder 1–5, behavior high-risk flag, calculate() ris… |
| `mdq` | MDQ (Mood Disorder Questionnaire) | `missing-neuro-psych.ts` | `s1`, `s2`, `s3`, `s4`, `s5`, `s6`, `s7`, `s8` | Without the not-your-usual-self / ever stem, items (self-confident, more energy, more social) can be scored as baseline personality rather than an episode. | Hirschfeld RMA et al. Am J Psychiatry 2000 PMID 11058490. MDQ is copyrighted; adding the official lead-in is consistent… | 13 yes/no items, positive rule (≥7 AND same period AND moderate/serious), impai… |
| `cholesterol-goals` | LDL / Non-HDL Goal Helper (ASCVD Risk Tier) | `wave2-general-lab.ts` | `riskTier` | Cannot assign the tier from the UI. AHA/ACC low/borderline/intermediate/high are PCE <5 / 5–<7.5 / 7.5–<20 / ≥20. Clinical ASCVD is a specific event list. Very high-risk is multip… | Grundy SM et al. Circulation 2019 / JACC 2018 cholesterol guideline Table 4 very high-risk; 10-year PCE risk categories… | option values low/intermediate/high/ascvd/very_high; goal pairs 100/130, 70/100… |
| `hit-6` | HIT-6 Headache Impact Test | `wave2-neuro-psych.ts` | `q2` | Dropping the activity list changes what patients count as limited. If the license does not allow reprint, these stems should not be on the form at all (total-only + pointer), anal… | Kosinski M et al. Qual Life Res 2003; HIT-6™ © QualityMetric / GSK; ePROVIDE HIT-6 page | Likert values 6/8/10/11/13, 36–78 range, impact bands ≤49 / 50–55 / 56–59 / ≥60 |
| `midas` | MIDAS Migraine Disability Assessment | `wave2-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5` | Official MIDAS is five questions over the last 3 months. Omitting the window on Q2–Q5 invites 1-month or usual-month×3 guesses. Household work officially includes housework, home … | Stewart WF / Lipton RB MIDAS questionnaire (Cephalalgia 1999; Neurology 2001). Generally free for clinical use. | sum of Q1–Q5 only, Grade I–IV cutoffs, items A/B excluded from the sum |
| `gail-model-simplified` | Gail Model (Simplified Educational) | `wave2-oncology.ts` | `relatives`, `biopsies` | Official BCRAT/Gail counts mother, sisters, and daughters only — not father, not second-degree. Including grandmothers/aunts over-scores. Biopsy count is prior breast biopsies (ty… | Gail MH et al. JNCI 1989; NCI Breast Cancer Risk Assessment Tool (BCRAT) first-degree relative definition | Educational point weights (relatives ×2, atypia +2); age-band points; unused ra… |
| `ipi-lymphoma` | IPI (Aggressive NHL) | `wave2-oncology.ts` | `extranodal`, `ecog` | Classic IPI extranodal count treats spleen as extranodal and counts distinct organs (BM, GI, liver, lung, bone, CNS, skin) — not extra nodes. ECOG ≥2 has a cutoff but no Oken defi… | International Non-Hodgkin's Lymphoma Prognostic Factors Project. N Engl J Med. 1993 (Shipp IPI); Oken ECOG PS 1982 | Five binary points; low 0–1 / LI 2 / HI 3 / high 4–5 |
| `gustilo-anderson` | Gustilo-Anderson Open Fracture Classification | `wave2-ortho-trauma.ts` | `type` | Wound size alone does not assign type III. High-energy, farmyard/soil, shotgun, segmental long-bone, extensive periosteal stripping, or delay often upgrade to III regardless of sk… | Gustilo RB, Anderson JT. JBJS Am. 1976 PMID 773941; Gustilo 1984 IIIA/B/C refinement | five option values 1–5 mapping I/II/IIIA/B/C |
| `isaric-4c` | ISARIC 4C Mortality Score (COVID-19) | `wave2-pulm-id.ts` | `comorbid`, `spo2` | Knight/ISARIC count a modified Charlson set: chronic cardiac; chronic respiratory excluding asthma; chronic renal (eGFR ≤30); liver; dementia; chronic neurological; connective tis… | Knight SR et al. BMJ. 2020;370:m3339 comorbidity footnote and SpO2 on room air | age/sex/RR/SpO2/GCS/urea/CRP values, max 21, mortality bands 0–3 / 4–8 / 9–14 /… |
| `scap-score` | SCAP Score (Severe CAP) | `wave2-pulm-id.ts` | `ams` | España AMS is new disorientation/confusion (person, place, or time) or equivalent, not chronic baseline dementia without acute change. | España PP et al. Am J Respir Crit Care Med. 2006;174:1249-1256 | point weights 13/11/9/6/5, severe if ≥10 or major pH/SBP |
| `cardshock` | CardShock Risk Score | `wave3-cardio-vasc.ts` | `confusion` | CardShock confusion is hypoperfusion AMS; stem does not say new disorientation vs chronic dementia vs any GCS drop. | Harjola VP et al. Eur J Heart Fail. 2015 CardShock methods (confusion at presentation) | 7-variable 0–9 sum, lactate 0/1/2 and eGFR 0/1/2 bins, risk bands 0–3 / 4–5 / 6… |
| `wellens-helper` | Wellens Syndrome Helper | `wave3-cardio-vasc.ts` | `noQ`, `tropNormal`, `patternA`, `patternB` | noQ can be read as no Q waves OR loss of R progression (opposite of Wellens). Classic criteria: no Q waves AND preserved R (e.g. V3 ≥3 mm). Slightly elevated troponin undefined. T… | de Zwaan C, Bär FW, Wellens HJ. Am Heart J. 1982; standard Wellens teaching criteria | pattern-or + 5-supportive-feature logic, 2/1 weights, avoid-stress-test recomme… |
| `acs-nsqip-simp` | Surgical Risk Helper (ACS-NSQIP style educational) | `wave3-em-surgery.ts` | `asa`, `functional` | Cannot assign ASA without I–V meaning. NSQIP functional status is assistance from another person for ADLs, not 'a bit frail.' | ACS NSQIP User Guide functional-status definitions; ASA PS classification; Bilimoria KY et al. JACS 2013 | agePts 0/1/2/3, ASA numeric add, emergency +2, functional 0–2, procedure 0–3, e… |
| `gerd-q` | GerdQ Questionnaire | `wave3-gi-hep.ts` | `heartburn`, `regurg`, `epigastric`, `nausea`, `sleep`, `otc` | Published GerdQ uses specific 7-day patient stems; abbreviated labels especially blur epigastric vs heartburn and OTC vs prescribed PPI. | Jones R et al. Aliment Pharmacol Ther 2009 GerdQ; confirm AstraZeneca/instrument copyright before reprinting | 0–3 and reverse 3–0 values, 7-day window, ≥8 cutoff, impact = sleep+OTC |
| `pas` | Pediatric Appendicitis Score (PAS) | `wave3-gi-hep.ts` | `migration`, `coughHop`, `anorexia` | Migration is meant periumbilical/epigastric → RLQ. Hop item is 2 points and needs a one-line how-to. Pediatric anorexia is often refuses favorite food. | Samuel M. J Pediatr Surg 2002; MDCalc PAS stems | 1 vs 2 point weights, 0–10 total, fever/WBC/neutrophil cutoffs |
| `nips` | Neonatal Infant Pain Scale (NIPS) | `wave3-peds-ob.ts` | `facial`, `cry`, `breathing`, `arms`, `legs`, `state` | Official NIPS operational findings are missing, so items are easy to mis-score. 'Flexed/extended' looks like any flexion scores 1; official 1 is tense/rigid/rapid flexion-extensio… | Lawrence J et al. Neonatal Netw 1993; NIPS tool reprints (Mosby/CHEO descriptors) | 0–7 sum, item point maxima (cry 0–2, others 0–1) |
| `pecarn-abd` | PECARN Blunt Abdominal Trauma (Simplified) | `wave3-peds-ob.ts` | `abdominalWall`, `vomiting`, `gcsLow` | Holmes 2013 treats abdominal wall trauma/seat-belt sign and abdominal tenderness as separate predictors; fusing them makes isolated tenderness easy to miss. Vomiting in the rule i… | Holmes JF et al. Ann Emerg Med 2013 PECARN blunt abdominal injury rule (7 history/exam predictors) | very-low-risk = no listed predictors logic, point chips |
| `thyroid-storm-burch` | Burch–Wartofsky Point Scale (Thyroid Storm) | `wave3-tox-endo-heme.ts` | `precipitant` | Only BWPS item not scorable from the UI is what counts as a precipitant. Typical list missing. | Burch HB, Wartofsky L. Endocrinol Metab Clin North Am. 1993 BWPS table and precipitant discussion | point values (temp 0–30, CNS 0–30, GI 0/10/20, HR 0–25, CHF 0–15, AF 0/10, prec… |
| `aaipi` | Age-Adjusted IPI (aaIPI) | `wave4-heme-onc.ts` | `ecog` | ECOG 1 vs 2 not operational. Minor: user >60 can still score an age-adjusted index. | Oken 1982; International NHL Prognostic Factors Project. NEJM 1993 PMID 8141877 | three binary factors, 0 / 1 / 2 / 3 groups |
| `cns-ipi` | CNS-IPI (DLBCL CNS Relapse Risk) | `wave4-heme-onc.ts` | `ecog` | Identical ECOG 1 vs 2 gap as R-IPI. Kidney/adrenal, stage, LDH, extranodal count are scorable. | Oken 1982 ECOG; Schmitz N et al. J Clin Oncol. 2016 PMID 27382100 | six binary factors, low 0–1 / int 2–3 / high 4–6 |
| `mipi-mantle` | MIPI (Mantle Cell Lymphoma) | `wave4-heme-onc.ts` | `ecogPts`, `ldhPts` | Cannot assign 0 vs 2 ECOG points without Oken 2 = unable to work, up >50% of day. LDH ratio can be mis-entered as raw IU/L. | Oken 1982; Hoster E et al. Blood. 2008 PMID 18077791 simplified MIPI point table | age 0–3, ECOG 0/2, LDH 0–3, WBC 0–3 values, low 0–3 / int 4–5 / high ≥6. Do not… |
| `pit-tcell` | PIT (Peripheral T-cell Lymphoma) | `wave4-heme-onc.ts` | `ecog` | Same ECOG 1 vs 2 gap as IPI family. | Oken 1982; Gallamini A et al. Blood. 2004 PMID 14645001 | four binary factors, groups 0 / 1 / 2 / 3–4 |
| `r-ipi` | Revised IPI (R-IPI, DLBCL) | `wave4-heme-onc.ts` | `ecog` | Cutoff ≥2 is stated but ECOG 1 vs 2 is work-capable vs not, up >50% of waking hours. Rater still needs the Oken card. | Oken MM et al. Am J Clin Oncol. 1982 (ECOG/Zubrod; public domain with citation). Sehn LH et al. Blood. 2007 R-IPI | five binary IPI factors, groups 0 / 1–2 / 3–5 |
| `findrisc` | FINDRISC Diabetes Risk Score | `wave4-primary-endo.ts` | `family`, `highGlu` | First- vs second-degree relatives are not listed. High-glucose omits official examples (health exam, illness, pregnancy), so GDM/stress hyperglycaemia may be missed. | Lindström J, Tuomilehto J. Diabetes Care. 2003; official FINDRISC questionnaire (THL) | point weights (waist 0/3/4, activity +2, veg +1, BP meds +2, glucose +5, family… |
| `nida-quick` | NIDA Quick Screen | `wave4-primary-endo.ts` | `rx`, `illegal` | Nonmedical prescription and illegal-drug items are not administrable without NIDA examples (opioids/stimulants/sedatives; marijuana/cocaine/heroin/meth/hallucinogens/MDMA). | NIDA Quick Screen V1.0 / NM-ASSIST clinician resource (nida.nih.gov) | 0–4 frequency codes, any-domain > Never = positive, max-frequency display |
| `asdas-crp` | ASDAS-CRP (Axial SpA) | `wave5-general-misc.ts` | `backPain`, `morningStiff`, `ptGlobal`, `peripheral` | Cannot administer the four patient domains without the BASDAI/ASDAS stems. Morning-stiffness 0–10 mapping to hours (10 = ≥2 h) and the past-week time frame are missing. | ASAS ASDAS and BASDAI official forms; Lukas C et al. Ann Rheum Dis. 2009; Machado P et al. 2011 cut-offs | formula coefficients, ln(CRP+1), CRP unit mg/L, cutoffs 1.3/2.1/3.5 |
| `gout-classification` | ACR/EULAR Gout Classification (Simplified) | `wave5-general-misc.ts` | `tophus`, `imaging`, `pattern` | Tophus typical locations and gouty-erosion morphology (and US double-contour vs DECT) are not on screen; DIP OA erosions could be counted. Pattern hierarchy if both 1st MTP and an… | Neogi T et al. 2015 ACR/EULAR gout classification PMID 26359487 | entry gate, MSU-sufficient shortcut, domain point values, threshold ≥8, imaging… |
| `ipss-prostate` | IPSS — International Prostate Symptom Score | `wave5-surg-uro-ent.ts` | `incomplete`, `frequency`, `intermittency`, `urgency`, `weakStream`, `straining`, `nocturia`, `qol` | Cannot administer the AUA Symptom Index from the screen. Official stems are full questions. Same class of problem as PHQ-9 abbreviated stems. | Barry MJ et al. J Urol. 1992;148:1549-1557 AUA-SI; standard IPSS/ICS QoL wording | 0–5 item values, 0–35 total, QoL 0–6 separate, mild/moderate/severe 0–7 / 8–19 … |
| `tumor-lysis-clinical` | Clinical Tumor Lysis Syndrome | `wave6-heme-onc.ts` | `labTls` | Used standalone, the user cannot know which two metabolic abnormalities constitute laboratory TLS. Companion tls-cairo is a different ID. | Cairo-Bishop 2004 clinical TLS = laboratory TLS + ≥1 of Cr ≥1.5× ULN, arrhythmia/sudden death, or seizure | requires labTls AND ≥1 clinical domain; AKI/cardiac/seizure values |
| `hfa-peff` | HFA-PEFF Diagnostic Score | `wave7-bedside.ts` | `functional`, `morphological`, `biomarker` | Those 'e.g.' minors are the entire official minor list; scorers may invent extras or miss that septal/lateral e′ and TR >2.8 m/s are major-only. Missing units invite mixing e′ wit… | Pieske B et al. Eur Heart J 2019 HFA-PEFF major/minor tables | values 0/1/2 per domain, sum 0–6, interpretation ≤1 / 2–4 / ≥5 |
| `basfi-10` | BASFI (10-item) | `wave7-rheum-activity.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8` | This is the item administrator (a total-only BASFI exists elsewhere). Calin stems and 0 = easy / 10 = impossible are missing; several without-aids / from-lying / one-foot-per-step… | Calin A et al. J Rheumatol. 1994 BASFI | 10-item mean 0–10, bands <4 / 4–7 / ≥7 |
| `doris-remission` | DORIS SLE Remission | `wave7-rheum-activity.ts` | `cSledai` | Clinical SLEDAI = SLEDAI-2K minus only low complement and increased DNA binding. Users may subtract rash/arthritis or forget to drop serology. | van Vollenhoven RF et al. Lupus Sci Med. 2021;8:e000538 DORIS 2021 | cSLEDAI === 0, PGA < 0.5, complete pred = 0 vs on-tx ≤5, serology not in the AND |
| `slicc-sdi` | SLICC/ACR Damage Index (SDI) | `wave7-rheum-activity.ts` | `ocular`, `neuro`, `renal`, `pulmonary`, `cv`, `pvd`, `gi`, `msk` | User is asked to count items but missing ≥6-month/irreversible rule on inputs, which items may be scored twice (CVA, MI, AVN), ESRD as exclusive 3 for the renal domain, and gonada… | Gladman D et al. Arthritis Rheum. 1996;39:363–369 SLICC/ACR Damage Index | domain maxima 2/6/3/5/6/5/6/7/3/1/1/2, sum 0–47, bands 0 / 1–2 / ≥3 |
| `acr-eular-sjogren-2016` | 2016 ACR/EULAR Primary Sjögren Classification | `wave7-rheum-class.ts` | `entrySicca` | Official entry is a positive answer to ≥1 AECG dryness question (or ESSDAI ≥1), not undifferentiated sicca. Without the five questions, entry is over-called. Exclusion list is eas… | Shiboski CH et al. Ann Rheum Dis. 2016; AECG sicca questions | weights 3/3/1/1/1/1, ≥4 + sicca entry |
| `acr-eular-tak-2022` | 2022 ACR/EULAR Takayasu Arteritis Classification | `wave7-rheum-class.ts` | `territories`, `pairedArteries` | Territories are a closed 9-vessel set. Paired involvement is vasculitis of both members of a paired branch set. Without the list, 1 vs ≥3 is not scorable. | Grayson PC et al. Ann Rheum Dis / Arthritis Rheumatol. 2022 (nine-territory composite; paired branch arteries) | sex/clinical/imaging weights, age ≤60 AND LVV imaging AND ≥5 |
| `caspar-psa` | CASPAR Psoriatic Arthritis Classification (2006) | `wave7-rheum-class.ts` | `nail`, `juxtaBone`, `entryInflammatory` | Nail dystrophy is onycholysis, pitting, or hyperkeratosis. Juxta-articular new bone is ill-defined ossification near joint margins of hands or feet (not osteophytes). Inflammatory… | Taylor W et al. Arthritis Rheum. 2006 CASPAR | psoriasis 2/1/1/0 mutually exclusive bins, other +1, ≥3 + entry |
| `eular-acr-myositis-2017` | 2017 EULAR/ACR Idiopathic Inflammatory Myopathy Classification | `wave7-rheum-class.ts` | `skin` | Papules vs sign vs heliotrope change the weight (e.g. ~2.1 vs 3.3 vs 3.1 without biopsy). A user who cannot picture the rashes will pick the wrong highest lesion. | Lundberg IE et al. Ann Rheum Dis. 2017 Table 2 / glossary | path-specific weights, highest-skin-only behavior, thresholds 5.5 / 6.7 (probab… |
| `icbd-behcet` | ICBD 2013 Behçet Disease Classification | `wave7-rheum-class.ts` | `ocular`, `oral`, `genital`, `skin`, `neuro`, `vascular`, `pathergy` | Ocular/skin/neuro/vascular are not any lesion. Pathergy is a specific 24–48 h needle test. Oral/genital aphthosis should be recurrent ulcers, not a single sore. | International Team for the Revision of ICBD. J Eur Acad Dermatol Venereol. 2014 | 2/2/2/1/1/1/1 weights, ≥4 |
| `sapporo-sydney-aps` | Sydney (2006) APS Classification | `wave7-rheum-class.ts` | `obstetric`, `thrombosis`, `acl`, `b2gpi` | The three obstetric clauses, exclusion of superficial vein thrombosis, and titer floors are the actual criteria. A yes on obstetric morbidity is not Sydney-scorable. | Miyakis S et al. J Thromb Haemost. 2006 | ≥1 clinical AND ≥1 lab AND persistent ≥12 weeks |

### P1 — Exam or worksheet steps incomplete (not quite P0) (`exam-protocol-missing`, n=50)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `wells-pe` | Wells Criteria for PE | `cardiology.ts` | `dvt`, `immob` | Official Wells PE DVT item is not any leg complaint: minimum of leg swelling AND pain with palpation of the deep veins. Surgery is typically surgery under general anesthesia in th… | Wells PS et al. Thromb Haemost 2000 PE model | 3 / 3 / 1.5 / 1.5 / 1.5 / 1 / 1 weights, three-tier and two-tier (≤4) interpret… |
| `ottawa-ankle` | Ottawa Ankle Rules | `emergency-misc.ts` | `postLat`, `postMed`, `walk`, `malleolarPain`, `midfootPain` | Official palpation is posterior edge or tip of distal 6 cm, not the anterior ankle. 4 steps = transfer weight twice onto each foot; limping still counts as able. Malleolar vs midf… | Stiell IG et al. JAMA 1993/1994 Ottawa Ankle Rules (posterior edge or tip; 4-step definition) | zone select, AND logic (zone pain + tenderness or walk), ankle vs foot x-ray sp… |
| `ottawa-knee` | Ottawa Knee Rules | `emergency-misc.ts` | `walk`, `patella`, `fibula` | Same undefined 4-step test as Ottawa Ankle. Isolated patellar tenderness means no other bony tenderness of the knee. Fibular-head tenderness is not required to be isolated — paire… | Stiell IG et al. JAMA 1997 Ottawa Knee Rule | five binary OR → x-ray yes/no |
| `bisap` | BISAP Score | `gi-neuro-psych.ts` | `ams`, `sirs` | Cannot score SIRS without the four criteria. AMS has no operational definition (GCS vs orientation). | Wu BU et al. Gut 2008 PMID 18519429; Bone SIRS criteria 1992 | five binary points, ≥3 high-risk cutoff |
| `duke-treadmill` | Duke Treadmill Score | `missing-cardio-pulm.ts` | `stDev` | No measurement rule (J+60–80 ms, net vs resting baseline, any lead). Uninterpretable ECG (LBBB, paced, digoxin, resting ST-T) is only in pearls, not on the ST field. | Mark DB et al. NEJM 1991 Duke treadmill score; standard exercise-ECG ST measurement (J+60–80 ms) | DTS = time − 5×ST − 4×angina, angina 0/1/2, risk cuts ≤-11 / -10 to +4 / ≥+5 |
| `sgarbossa` | Sgarbossa Criteria (MI in LBBB) | `missing-cardio-pulm.ts` | `concordantSte`, `concordantStd`, `discordantSte5`, `smithModified` | Cannot apply ECG rules without recalling concordant = ST same direction as major QRS, ST at J-point, and Smith STE/S ≤ -0.25 (STE ≥25% of S-wave) in a discordant lead. | Sgarbossa EB et al. NEJM 1996 PMID 8559200; Smith SW et al. Ann Emerg Med 2012 PMID 22939607 | original weights 5/3/2, threshold ≥3, Smith as non-additive flag (points 0) |
| `absi-burn` | Abbreviated Burn Severity Index (ABSI) | `missing-emergency.ts` | `tbsa`, `inhalation` | Same TBSA/depth and inhalation-definition gaps as Baux. Full-thickness is already a separate +1, so TBSA still must include partial-thickness area. | Tobiasen J et al. Ann Emerg Med. 1982;11:260-262; same TBSA conventions as Baux | sex +1 female; age bands 1–5; TBSA decile points 1–10; inhalation +1; full-thic… |
| `baux-score` | Baux Score (Burn Mortality) | `missing-emergency.ts` | `tbsa`, `inhalation` | Need Rule of Nines/Lund-Browder and whether first-degree is excluded. Revised Baux uses partial- + full-thickness %TBSA. Inhalation is clinical/bronchoscopic. | Osler T et al. J Trauma. 2010;68:690-694 revised Baux; ABA TBSA estimation conventions | original = age + TBSA; revised = +17 if inhalation |
| `lemon-airway` | LEMON Difficult Airway Assessment | `missing-emergency.ts` | `evaluate`, `neck` | Cannot perform 3-3-2 from the field: whose fingers, which landmarks, what unsatisfactory means. Neck mobility has no maneuver. | Reed MJ et al. Emerg Med J. 2005;22:99-102; Walls Manual / ATLS LEMON 3-3-2 teaching | 0–5 count or interpretation bands |
| `ottawa-foot` | Ottawa Foot Rules | `missing-emergency.ts` | `midfootPain` | Midfoot zone vs malleolar zone is the rule. Without landmarks users mix ankle and foot rules. | Stiell IG et al. JAMA. 1993;269:1127-1132; standard Ottawa foot-zone diagram | positive logic: midfoot pain AND (navicular OR base of 5th OR unable 4 steps) |
| `kings-college` | King's College Criteria (ALF) | `missing-gi-liver.ts` | `enceph34`, `ph`, `inr65`, `cr34`, `inr35`, `bili175`, `ageExtreme`, `unfavEtiol` | Grade III–IV cannot be assigned without West Haven. User cannot tell which yes/no items apply to the selected etiology. | O'Grady JG et al. Gastroenterology 1989; West Haven HE grades (Conn/Ferenci) | etiology branch logic, cutoffs, Boolean calculate() |
| `aspects` | ASPECTS (Early Ischemic Change) | `missing-neuro-psych.ts` | `regionsLost`, `score` | Cannot identify the 10 MCA regions from the form. Abbreviations need ganglionic vs supraganglionic definitions. Isolated swelling vs hypoattenuation is a common scoring dispute no… | Barber PA et al. Lancet 2000 PMID 10905241; ASPECTS methods papers / MDCalc region map | calculate() 10 − count, 0–10 range, interpretation bands |
| `cows` | COWS (Clinical Opiate Withdrawal Scale) | `missing-neuro-psych.ts` | `pulse`, `sweating`, `aches`, `gi` | Anchors are scorable. Missing official administration rules: pulse after 1 min sitting/lying; sweating and GI over last ½ hour; aches score only additional withdrawal component if… | Wesson DR, Ling W. J Psychoactive Drugs 2003 PMID 12924748; NIDA Clinical Opiate Withdrawal Scale PDF | option values (including non-contiguous 0/1/3/5), calculate() bands 0–4 / 5–12 … |
| `four-score` | FOUR Score (Full Outline of UnResponsiveness) | `missing-neuro-psych.ts` | `eye`, `motor`, `brainstem`, `respiration` | Better than GCS (commands on the label; intubation handled by R). Still cannot apply E0–E1/M0–M3 without the stimulus, or B without corneal/cough method. 'One pupil wide and fixed… | Wijdicks EFM et al. Ann Neurol 2005 PMID 16178024; Mayo FOUR Score instruction sheet | option values 0–4 per subscale, calculate() sum 0–16 |
| `rass` | Richmond Agitation-Sedation Scale (RASS) | `missing-neuro-psych.ts` | `rass` | Ordinal anchors are present (unlike CIWA). Rater still cannot apply RASS without the stepwise procedure; risk of scoring −4/−5 without trying voice first or using an unspecified p… | Sessler CN et al. Am J Respir Crit Care Med 2002 PMID 12421743; Vanderbilt/ICU Delirium RASS procedure card | option values −5 to +4, calculate() interpretation bands |
| `finnegan` | Finnegan NAS Score (Simplified) | `missing-peds-ob-tox.ts` | `cry`, `moro`, `tremors`, `yawning`, `sneezing`, `excoriation`, `increasedTone` | Cannot administer Finnegan from the UI: scoring interval (q3–4 h after feeds), cry duration, Moro/tremor exam anchors, yawning/sneezing count per interval, excoriation from rubbin… | Finnegan LP et al. Addict Dis 1975; FNAST instruction sheet (Academy of Neonatal Nursing); MOTHER NAS tremor/Moro opera… | item point weights, sum, <8 / ≥8 bands, simplified-educational disclaimer in in… |
| `dn4` | DN4 Neuropathic Pain Score | `wave2-neuro-psych.ts` | `q4`, `q5`, `q6`, `q7`, `q8`, `q9`, `q10` | Official interview Q2 is associated symptoms in the same area as the pain. Exam is cotton/soft-brush touch vs control; pinprick vs control; light moving brush (not pressure) for a… | Bouhassira D et al. Pain 2005 DN4; HAS/French DN4 form (interview vs examination blocks) | 10 binary items, cutoff ≥4, 7+3 interview/exam split |
| `flipi` | FLIPI (Follicular Lymphoma) | `wave2-oncology.ts` | `nodal` | FLIPI nodal areas are a specific mannikin, not Ann Arbor stage or PET stations. Without the list, >4 vs ≤4 cannot be scored. | Solal-Céligny P et al. Blood. 2004;104:1258 methods + Figure 1 mannikin | Five binary points; low 0–1 / intermediate 2 / high ≥3 |
| `neer-classification` | Neer Classification (Proximal Humerus) | `wave2-ortho-trauma.ts` | `parts` | Users count fracture lines instead of displaced segments. Need the four parts (head/articular, greater tuberosity, lesser tuberosity, shaft) and that a part counts only if displac… | Neer CS 2nd. JBJS Am. 1970 PMID 5455340 | parts values 1–4, headSplit/dislocation yes/no modifiers |
| `thompson-test` | Thompson Test (Achilles Rupture) | `wave2-ortho-trauma.ts` | `thompsonPos`, `matles` | Maneuver details needed to avoid a false squeeze: prone, feet off end (or knees 90°), squeeze mid-calf gastrocnemius, watch the foot not toes, compare contralateral. Matles needs … | Thompson TC, Doherty JH. Acta Orthop Scand. 1962 PMID 13981206; Matles AL. Clin Orthop 1975 (knee-flexed resting postur… | yes/no keys, Thompson-positive high-risk branch, findings count 0–5 |
| `right-heart-strain` | Right Heart Strain Flags (PE Helper) | `wave3-cardio-vasc.ts` | `s1q3t3`, `mcconnell`, `rvDilated`, `trElev`, `biomarker`, `stRad` | S1Q3T3, McConnell, RV/LV ratio, TR velocity/RVSP numbers, and biomarker URL omitted — cannot tick flags without a definition card. | ESC 2019 PE RV-strain definitions; McConnell MV 1996; Bova/ESC intermediate-risk PE imaging criteria | 10-flag count, ECG vs echo vs biomarker tallies, high-signature rule (echo≥2 or… |
| `catch-rule` | CATCH Rule (Pediatric Head CT) | `wave3-em-surgery.ts` | `boggy`, `irritability` | Basal skull is a medium-risk CATCH item that this app’s Canadian CT Head lists (hemotympanum, raccoon, CSF leak, Battle) and CATCH omits. Irritability is inconsolable/persistent o… | Osmond MH et al. CMAJ 2010 CATCH (and CATCH2 basal-skull footnote) | high vs medium grouping, any-high → CT, medium → consider CT, calculate() counts |
| `chalice-rule` | CHALICE Rule (Pediatric Head Injury) | `wave3-em-surgery.ts` | `basalSigns`, `focalNeuro`, `drowsiness`, `dangerousMech` | Cannot examine for CHALICE basal-skull or focal-neuro items from the UI. Drowsiness will over-call post-injury sleepiness. High-speed RTC without the Dunning definition is guessed. | Dunning J et al. Arch Dis Child. 2006 CHALICE definitions; NICE NG232 evolved wording (do not replace CHALICE items wit… | any-positive → CT logic, 12 keys, interpretation |
| `macocha` | MACOCHA Score (ICU Intubation Difficulty) | `wave3-em-surgery.ts` | `mallampati`, `coma`, `hypoxemia` | Mallampati is 5 of 12 points and cannot be administered from the UI (what is visible; sitting, tongue out, no phonation). De Jong coma is GCS ≤8; severe hypoxemia is SpO2 <80% — u… | De Jong A et al. Am J Respir Crit Care Med. 2013;187:832-839 Table 1; Samsoon/Young Mallampati | weights (Mallampati 5, OSA 2, others 1), 0–12 sum, <3 / ≥3 threshold |
| `furosemide-stress` | Furosemide Stress Test (FST) | `wave3-nephro-icu.ts` | `priorLoop`, `uop2h`, `dose` | Cannot administer the Chawla FST from the form. Exposed is a published 7-day window. 2-h collection needs Foley (or complete void) from the IV bolus. Invalid if still hypovolemic. | Chawla LS et al. Crit Care. 2013 PMID 24053972 — 1.0 vs 1.5 mg/kg by 7-day loop exposure; 2-h UOP <200 mL; volume repla… | responder if uop >= 200, targetDose 1.0 vs 1.5 × weight, doseOk 80% flag |
| `ivc-collapsibility` | IVC Collapsibility Index | `wave3-nephro-icu.ts` | `dmax`, `dmin`, `vent` | Dmax vs Dmin reverse between spontaneous (collapse on inspiration) and PPV (distention on inspiration). Site is ~2 cm from RA–IVC junction, long-axis, quiet breathing — sniff is f… | Barbier/Feissel ventilated dIVC; spontaneous CI reviews (1.5–3 cm from RA junction); critical care ultrasound IVC cavea… | CI formula /Dmax for both modes, spontaneous 20/50% bands, ventilated 11/18% ba… |
| `passive-leg-raise` | Passive Leg Raise (PLR) Interpretation | `wave3-nephro-icu.ts` | `svBase`, `svPlr`, `metric` | Cannot perform a valid PLR from the form. Starting supine and lifting the feet misses splanchnic volume. Cuff BP is not an acceptable substitute. Peak effect is 30–90 s, then retu… | Monnet X, Teboul JL Intensive Care Med / Crit Care PLR rules (start semi-recumbent, automatic bed motion, real-time CO,… | % change formula, responder pct >= 10, metric labels |
| `renal-angina` | Renal Angina Index (Simplified) | `wave3-nephro-icu.ts` | `risk`, `injury` | Cannot compute the FO injury arm without FO% = [(intake − output L) / ICU admission weight kg] × 100. Adult 'diabetes + sepsis' is not Basu (ICU=1; transplant=3; vent AND inotrope… | Basu RK et al. Pediatr Nephrol 2012 / Kidney Int 2014 RAI derivation (risk 1/3/5 × injury 1/2/4/8, FO% formula, 12 h ti… | risk × injury product, positive threshold ≥8, option values |
| `de-winter` | de Winter T-Wave Pattern Helper | `wave4-em-id.ts` | `tallT`, `noOvertSte` | Tall vs hyperkalemic or nonspecific peaked T is not operational. Frank STEMI criteria is an external-memory item (sex/age/lead cutoffs). | de Winter RJ et al. NEJM 2008; Fourth Universal Definition of MI STE thresholds | Core = upslope STD AND tall T; support scoring; reperfusion interpretation |
| `ottawa-sah-rule` | Ottawa SAH Rule | `wave4-em-id.ts` | `limitedFlexion` | Perry defined limited flexion as inability to touch chin to chest, or if supine inability to raise the head 8 cm off the bed. Without that, stiff-neck history gets double-counted … | Perry et al. JAMA 2013 methods (chin-to-chest / 8 cm head raise); Ottawa SAH inclusion/exclusion box | Any-positive investigate logic; six criteria |
| `primary-care-rule-dvt` | Primary Care Rule for DVT (Oudega) | `wave4-em-id.ts` | `veinDistension`, `calf3`, `ddimerPos` | Calf difference is not scorable without where to measure (10 cm below tibial tuberosity vs contralateral). Vein distension is easily confused with varicose veins; original is coll… | Oudega et al. Ann Intern Med 2005; Toll primary-care validation; AAFP Wells vs Dutch primary-care rule table | Point weights (calf +2, D-dimer +6, others +1); ≤3 vs ≥4 threshold; surgery tim… |
| `lund-browder` | Lund–Browder TBSA (Simplified) | `wave4-formulas.ts` | `head`, `antTrunk`, `postTrunk`, `armR`, `armL`, `legR`, `legL`, `perineum` | TBSA for Brooke/Parkland is 2nd-degree and deeper; first-degree erythema is excluded. Users can enter %TBSA instead of % of region. Collapsed whole-arm/whole-leg vs classic chart … | Lund CC, Browder NC. Surg Gynecol Obstet. 1944; ABA TBSA = partial+full thickness; JTS Adult Lund–Browder form (1st° no… | lundBrowderPercents() age bands; region weights (trunk 13/13, arm 7, perineum 1… |
| `cdai-ra` | CDAI (RA) | `wave4-heme-onc.ts` | `tjc`, `sjc`, `pga`, `ega` | Same missing 28-joint list. Patient and evaluator globals have no operational question, so 0–10 vs 0–100 mix-ups persist and the construct is undefined. | Aletaha D, Smolen JS CDAI methods; ACR/EULAR 28-joint count | sum TJC+SJC+PGA+EGA, ≤2.8 / ≤10 / ≤22 / >22 bands |
| `cll-binet` | Binet Staging (CLL) | `wave4-heme-onc.ts` | `binet` | Cannot count ≥3 lymphoid areas without the Binet map. Residents double-count bilateral cervical nodes. | Binet JL et al. Cancer. 1981 PMID 7237385 | A/B/C values, cytopenia thresholds already on labels |
| `das28` | DAS28 (RA Disease Activity) | `wave4-heme-onc.ts` | `tjc`, `sjc`, `pga` | Cannot count 28 joints from the UI (which joints, laterality, tender vs swollen). PGA has no stem or time window. | Prevoo ML et al. Arthritis Rheum. 1995 PMID 7818570; EULAR DAS28 documentation (28-joint set and PGA 0–100 mm) | DAS28-ESR vs CRP formulas, 0.56√TJC + 0.28√SJC coefficients, remission <2.6 / L… |
| `sdai-ra` | SDAI (RA) | `wave4-heme-onc.ts` | `tjc`, `sjc`, `pga`, `ega` | Identical 28-joint and global-stem gap. CRP unit is already scorable. | Smolen JS et al. Rheumatology. 2003 PMID 12595618; ACR/EULAR SDAI remission ≤3.3 | CDAI+CRP sum, ≤3.3 / ≤11 / ≤26 / >26, CRP in mg/dL |
| `4at` | 4AT Delirium Screen | `wave4-neuro-psych.ts` | `alertness`, `attention`, `acute` | Cannot finish the exam from the UI. Missing what clearly abnormal looks like; the months-backwards script (start at December, one prompt); Item 4’s 2-week / last-24-h rule (withou… | Bellelli G et al. Age Ageing. 2014; www.the4at.com user guide / printable form (free to reproduce with attribution) | item values, sum 0–12, bands 0 / 1–3 / ≥4 |
| `laps-score` | LAMS (Los Angeles Motor Scale) | `wave4-neuro-psych.ts` | `face`, `arm`, `grip` | LAMS is the LAPSS motor exam. Without smile/show teeth, palms-up 10 s drift, and grip as a handshake, drifts down vs falls rapidly is not standardized. | Nazliel B et al. Stroke. 2008; LAPSS motor items / LAMS EMS cards | 0–5 sum, common cutoff ≥4 |
| `dapsa` | DAPSA (Psoriatic Arthritis) | `wave5-general-misc.ts` | `tjc`, `sjc`, `pain`, `ptGlobal` | No 68/66 joint map (hips tender-only explains 68 vs 66). Pain vs patient-global stems and time window omitted, so the two VAS boxes are easy to swap. | Schoels/Aletaha DAPSA; GRAPPA/OMERACT 66/68 joint-count homunculus | simple sum, CRP in mg/dL, cutoffs 4/14/28 |
| `scorten` | SCORTEN (SJS/TEN Severity) | `wave5-general-misc.ts` | `bsa` | Word 'compromised' invites counting macular erythema. No %BSA method (Lund-Browder / rule of nines) and no day-1 / day-3 reminder on the input. | Bastuji-Garin S et al. J Invest Dermatol. 2000 PMID 10951229; TEN BSA (detached epidermis) diagrams | seven binary 1-point criteria, lab/age/HR cutoffs, mortality bands |
| `glasgow-meningococcal` | Glasgow Meningococcal Septicemia Prognostic Score (GMSPS) | `wave5-peds-id.ts` | `coma` | GMSPS needs pediatric-modified GCS <8. Item does not list E/V/M or infant verbal and the synonym deeply impaired is not the published rule. | Sinclair JF et al. Lancet 1987 GMSPS; Crit Care Med 1991 validation (PMID 1898875); pediatric GCS / James modification | item weights 3/3/3/2/2/1/1, max 15, band cutoffs |
| `rogers-score` | Rogers Postoperative VTE Risk Score | `wave5-surg-uro-ent.ts` | `opType`, `workRvu`, `preopSepsis` | Bedside users do not know work RVU for the principal CPT and cannot map most cases onto the four opType rows. | Rogers SO Jr et al. J Am Coll Surg. 2007;204:1211-1221; ACS-NSQIP CPT/RVU and sepsis variables | simplified point weights or low/medium/high band note |
| `graves-cas` | Clinical Activity Score (Graves Orbitopathy) | `wave6-clinical-residual.ts` | `spontPain`, `gazePain`, `redLid`, `redConj`, `swellLid`, `caruncle`, `chemosis` | EUGOGO/Mourits CAS needs: pain over last 4 weeks; gaze pain on up, side, or down; conjunctival redness = diffuse ≥1 quadrant at 1 m, not corneal staining; chemosis vs conjunctivoc… | Mourits 1997 CAS; EUGOGO 2021 Table 2; EUGOGO colour atlas for redness/chemosis | 7 binary items, sum, active threshold ≥3/7, no 10-item follow-up scoring |
| `twist-score` | TWIST Score (Testicular Torsion) | `wave6-psych-sleep.ts` | `hard`, `cremaster`, `high`, `swelling` | Cremasteric maneuver not stated (stroke ipsilateral inner thigh; watch for testis elevation; compare contralateral; warm room). Hard = firm vs contralateral. High-riding = elevate… | Barbosa JA et al. J Urol. 2013 TWIST; AAFP POCG testicular torsion (cremasteric how-to) | Point weights 2/2/1/1/1; bands 0–2 / 3–4 / 5–7 |
| `morse-fall` | Morse Fall Scale | `wave6-scores-residual.ts` | `gait`, `mental` | Weak vs impaired is an observed transfer/gait exam (head position, shuffle, chair-rise, need to grasp support). Mental status is not person/place orientation; it is whether the pa… | Morse JM et al. Soc Sci Med. 1989;28:81-86. Morse Fall Scale administration guides (gait and mental-status operational … | item points 0/25, 0/15, 0/15/30, 0/20, 0/10/20, 0/15; low 0–24 / moderate 25–44… |
| `helps2b` | 2HELPS2B Seizure Risk (cEEG) | `wave7-bedside.ts` | `birds`, `freqGt2`, `epileptiform`, `lpdLrdaBipd`, `plusFeatures`, `priorSeizure` | Scoring GPDs/GRDA as the LPD/LRDA/BIPD point, plus features on GPDs, or any brief rhythm as BIRDs inflates seizure risk and cEEG duration. Official: BIRDs >4 Hz for ≥0.5–<10 s; fr… | Struck AF et al. JAMA Neurol 2017; ACNS 2021 critical-care EEG terminology (BIRDs, plus); QxMD/MDCalc 2HELPS2B notes | point weights (BIRDs 2, others 1), max 7, risk percent table, 1h/12h/24h guidan… |
| `pram` | Pediatric Respiratory Assessment Measure | `wave7-highuse.ts` | `scalene`, `retractions`, `airEntry`, `wheeze`, `spo2` | Official PRAM scalene is palpated not seen (lateral neck floor on inspiration). Air-entry official wording is decreased at apex and bases. Asymmetry scoring rules omitted. | Ducharme FM et al. J Pediatr 2008 (PMID 19047225); CHU Sainte-Justine / childhealthbc.ca PRAM table | point values (0/2 scalene and suprasternal; 0–3 air entry and wheeze; 0–2 SpO2)… |
| `bvas-v3` | BVAS v3 (Organ Point Totals) | `wave7-rheum-activity.ts` | `general`, `cutaneous`, `mucousEyes`, `ent`, `chest`, `cardiac`, `abdominal`, `renal` | Empty organ buckets. New vs persistent items score differently on the official form. Cannot produce a system total without the BVAS v3 worksheet; inputs do not say they are transc… | Mukhtyar C et al. Ann Rheum Dis. 2009 BVAS v3; official BVAS v3 form (Oxford/Luqmani, typically licensed) | nine system maxima, sum of entered subtotals, educational 0 / 1–7 / 8–15 / ≥16 … |
| `vdi-vasculitis` | Vasculitis Damage Index (VDI) | `wave7-rheum-activity.ts` | `msk`, `skin`, `ocular`, `ent`, `pulmonary`, `cardiac`, `vascular`, `gi` | Full VDI is 64 dichotomous items. Empty counts are not administrable. Pearls name hearing loss, nasal-bridge collapse, GFR decline but those are not on the matching fields. | Exley AR et al. Arthritis Rheum. 1997 Vasculitis Damage Index (64-item glossary) | organ maxima as coded, sum, bands 0 / 1–2 / ≥3 |
| `acr-eular-gca-2022` | 2022 ACR/EULAR Giant Cell Arteritis Classification | `wave7-rheum-class.ts` | `abnormalTA`, `tabHalo`, `axillary` | Cannot mark abnormal TA without pulse/tenderness/cord. Halo sign is homogeneous hypoechoic wall edema on TA US, not any US abnormality. Axillary item is bilateral wall thickening/… | Ponte C et al. Arthritis Rheumatol. 2022 | item weights, age ≥50 AND ≥6 |

### P1 — Mild / moderate / severe without an operational definition (`vague-ordinal`, n=40)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `killip` | Killip Classification | `cardiology.ts` | `class` | Class II is well anchored. III and IV are official names without the exam: III is rales throughout / frank alveolar edema. IV is hypotension plus hypoperfusion (oliguria, cool/cla… | Killip T, Kimball JT. Am J Cardiol 1967 | class 1–4 mapping, interpretation text bands |
| `westley-croup` | Westley Croup Score | `emergency-misc.ts` | `retract`, `airEntry`, `consciousness` | Mild vs moderate vs severe retractions have no exam anchors. Westley LOC is disoriented (5) vs normal including sleep (0) — 'Altered' can wrongly score a sleeping child 5. | Westley CR et al. Am J Dis Child 1978; Merck/EBMcalc Westley LOC wording (normal including sleep vs disoriented) | domain values (cyanosis 0/4/5, stridor 0/1/2), sum 0–17, coded mild ≤2 / modera… |
| `child-pugh` | Child-Pugh Score | `gi-neuro-psych.ts` | `ascites`, `enceph` | Ascites mild vs moderate–severe has no operational definition (diuretic-controlled vs tense/refractory). Encephalopathy assumes unstated West Haven grades, so 1–2 vs 3–4 cannot be… | Pugh 1973 modification of Child-Turcotte; West Haven HE criteria (Ferenci / AASLD-EASL HE guidance) | option values 1–3, 5-item sum, class cutoffs A 5–6 / B 7–9 / C 10–15 |
| `air-appendicitis` | Appendicitis Inflammatory Response (AIR) Score | `missing-gi-liver.ts` | `rebound` | Light vs medium vs strong is not operational (how to elicit rebound; what board-like defense is). | Andersson M, Andersson RE. World J Surg. 2008 AIR table; MDCalc AIR | point values 0/1/2/3, other items, calculate() 0–12 bands |
| `mascc` | MASCC Risk Index (Febrile Neutropenia) | `missing-heme-id-nephro.ts` | `burden` | Burden of illness is the largest point swing and is global appearance of this febrile episode, not cancer extent; mild/moderate/severe is unspecified. | Klastersky J et al. J Clin Oncol 2000 MASCC risk index | 5/3/0 burden points, other item weights, ≥21 low-risk cutoff, inverted No-hypot… |
| `abc-bleed` | ABC Bleeding Score (Simplified Educational) | `wave2-cardiology.ts` | `hb`, `hstn`, `gdf` | Anemia bands are undefined. GDF-15 is research-only and has no ng/L anchors. | Hijazi et al. ABC-bleed Lancet 2016; WHO anemia grades if ABC knots unavailable | Educational domain points; do not withhold-OAC messaging in recommendations |
| `abc-stroke` | ABC Stroke Score (Simplified Educational) | `wave2-cardiology.ts` | `ntprobnp`, `hstn` | No ng/L or pg/mL anchors. Two clinicians will split moderate vs marked differently. Age and prior-stroke items are fine. | Hijazi et al. Eur Heart J 2016 ABC-stroke; official ABC calculator biomarker axes | Educational point scheme; do not implement unpublished continuous coefficients |
| `heart-pathway` | HEART Pathway | `wave2-cardiology.ts` | `history`, `ecg`, `risk` | Slightly vs highly suspicious is mild/moderate/severe without operational anchors. Significant ST deviation has no millivolt cutoff. Risk-factor counting will vary. | Six et al. HEART score Neth Heart J 2008; Mahler HEART Pathway; MDCalc HEART item notes | 0–2 point values, HEART sum, pathway logic (HEART ≤3 + negative serial trop + i… |
| `edss-simp` | EDSS (Simplified Select) | `wave2-neuro-psych.ts` | `edss` | Formal EDSS 0–3.5 is Neurostatus Functional Systems (pyramidal, cerebellar, brainstem, sensory, bowel/bladder, visual, cerebral), not a gestalt mild disability. A user cannot assi… | Kurtzke JF. Neurology 1983 EDSS; Neurostatus EDSS training materials | step values 0–10 including half-steps, interpretation bands |
| `mirels-score` | Mirels Score (Pathologic Fracture Risk) | `wave2-ortho-trauma.ts` | `pain`, `size` | Mirels’ key pain split is non-functional (mild/moderate) vs pain aggravated by limb function (all such patients fractured in the derivation). Functional/mechanical is jargon. Size… | Mirels H. Clin Orthop Relat Res. 1989 PMID 2684463 (pain aggravated by function) | four domains 1–3, sum 4–12, ≤7 / 8 / ≥9 bands |
| `intermacs` | INTERMACS Patient Profile | `wave3-cardio-vasc.ts` | `profile` | Profile 2 vs 3 (declining vs stable on inotropes) and 4–7 (resting symptoms vs housebound vs walking wounded vs advanced NYHA III) are not operational without Stevenson text. | Stevenson LW et al. J Heart Lung Transplant. 2009 INTERMACS profiles table | profile 1–7 values, modifier yes/no keys, interpretation bands |
| `scai-shock` | SCAI Cardiogenic Shock Stages | `wave3-cardio-vasc.ts` | `stage` | Cannot separate B vs C vs D without 2022 SCAI SBP/MAP/HR/UOP/exam/lactate anchors. Relative hypotension and hypoperfusion are undefined. | Naidu SS et al. JSCAI 2022 SCAI SHOCK classification update tables | stage values 0–4, free-pick staging, unused-for-score lactate/vasoactive/MCS fl… |
| `asa-physical` | ASA Physical Status Classification | `wave3-em-surgery.ts` | `asa` | II vs III vs IV cannot be assigned reliably from titles. That is the known ASA inter-rater problem the official example list was written to fix. Examples after scoring do not help… | ASA House of Delegates Statement on ASA Physical Status Classification (examples list, asahq.org) | values 1–6, E modifier logic (asa <6), interpretation bands |
| `posum-simp` | POSSUM Surgical Risk (Simplified Educational) | `wave3-em-surgery.ts` | `opMagnitude`, `resp` | Cannot assign 1 vs 2 vs 4 vs 8 surgical points without the Copeland magnitude table (same gap as p-possum in this app). Limiting dyspnea is one flight of stairs in POSSUM. | Copeland GP et al. Br J Surg 1991 POSSUM; Whiteley P-POSSUM; JAMA Surgery POSSUM magnitude tables | option values 1/2/4/8, emergency handling in calculate(), educational (not logi… |
| `asthma-exacerbation-peds` | Pediatric Asthma Exacerbation Severity | `wave3-peds-ob.ts` | `wob`, `hr` | NAEPP/GINA-style grading needs accessory-muscle detail and age-specific HR. 'Moderate' WOB and 'moderately elevated' HR cannot be scored from the UI. Speech/wheeze/SpO2 are alread… | NHLBI EPR-3 acute asthma severity; GINA report acute exacerbation table | item values, life-threatening override (altered / speech 3 / silent chest / WOB… |
| `bronchiolitis-severity` | Bronchiolitis Clinical Severity Bands | `wave3-peds-ob.ts` | `rr` | No age-specific breaths/min, so 'moderately elevated' cannot be chosen reliably for a 6-week-old vs an 18-month-old. AAP bronchiolitis severity is clinical, but this calculator st… | Ralston SL et al. AAP bronchiolitis CPG Pediatrics 2014; PALS/AAP age-normal RR tables | 0–2 domain values, apnea override, sum bands |
| `downs-score` | Downes' Score (Neonatal Respiratory Distress) | `wave3-peds-ob.ts` | `airEntry`, `retractions` | Air entry and retractions use mild/marked without auscultation or visual anchors. Official Downes air entry is 'clear / delayed or decreased / barely audible'. Retractions 'mild v… | Downes JJ et al. Clin Pediatr 1970 (RDS score); common Downes teaching tables | 0–2 item values, 0–10 total, mild ≤3 / 4–5 / ≥6 bands |
| `feverpain-score` | FeverPAIN Score (Full) | `wave4-em-id.ts` | `inflamed` | Severely is an unanchored ordinal. Disagreement on moderate vs severe erythema/swelling flips the 2–3 vs 4–5 antibiotic band. | Little et al. BMJ 2013 FeverPAIN/PRISM; NICE sore-throat antimicrobial guidance item wording | Five binary +1 items; 0–1 / 2–3 / 4–5 interpretation bands |
| `vienna-prediction` | Vienna Prediction Model (Simplified VTE Recurrence) | `wave4-em-id.ts` | `ddimer` | Vienna uses quantitative D-dimer. Intermediate vs high cannot be assigned from the UI. Educational disclaimer does not make the ordinal scorable. | Eichinger et al. Circulation 2010 Vienna nomogram (quantitative D-dimer); MDCalc Vienna Prediction Model | Educational ordinal weights for sex/location/D-dimer; do not replace with the f… |
| `cisne` | CISNE (Febrile Neutropenia) | `wave4-heme-onc.ts` | `ecog`, `mucositis`, `copd`, `cvd` | Cannot assign NCI mucositis ≥2 (grade 2 = moderate pain/modified diet, oral intake preserved; grade 3 = intake compromised). ECOG 1 vs 2 same gap. Some CISNE operationalizations r… | Carmona-Bayonas A et al. J Clin Oncol. 2015 PMID 25559804 and 2011 derivation; NCI CTCAE oral mucositis; Oken ECOG | weights, low 0 / int 1–2 / high ≥3, do not add MASCC items |
| `norton-scale` | Norton Pressure Sore Risk Scale | `wave4-icu-vent.ts` | `physical`, `mobility` | Physical good/fair/poor/very bad has no operational meaning. Mobility slightly vs very limited lacks the independent position-change rule. | Norton D, McLaren R, Exton-Smith AN 1962; NICE CG179 Norton table reproductions | five 1–4 domains, total 5–20, classic cutoff ≤14 |
| `fast-ed` | FAST-ED Scale | `wave4-neuro-psych.ts` | `face`, `speech`, `eye` | Mild vs moderate/severe face and mild vs severe speech are NIHSS mappings, not bedside findings. Cannot distinguish partial vs forced gaze without a pursuit exam. Denial names ext… | Lima FO et al. Stroke. 2016 Table 1 (NIHSS mapping); EMS FAST-ED cards | five-item 0–2 values as coded, sum, ≥4 cutoff. Do not collapse face to the orig… |
| `ada-diabetes-risk` | ADA Type 2 Diabetes Risk Test | `wave4-primary-endo.ts` | `weight` | Cannot choose overweight vs obese vs very obese without the official chart or BMI equivalents. | ADA Diabetes Risk Test (diabetes.org); Bang H et al. Ann Intern Med. 2009; CDC how-your-test-is-scored BMI mapping | age/sex/GDM/family/HTN/activity points, weight 0–3, ≥5 increased-risk threshold |
| `ehra-score` | EHRA AF Symptom Score | `wave5-cardio.ts` | `class` | Official modified EHRA (ESC) distinguishes IIa vs IIb by whether the patient is troubled while daily activity is still not affected. 'Daily activity affected' is class III; 'disco… | 2020 ESC AF Guidelines Hindricks G et al. Eur Heart J 2021 PMID 32860505, modified EHRA table | option values 1–5, calculate() class mapping |
| `harvey-bradshaw` | Harvey–Bradshaw Index (Crohn Disease) | `wave5-nephro-gi.ts` | `pain` | Pain intensity has no operational definition. Original HBI has none either — add a one-line reminder, do not invent cutoffs. | Harvey RF, Bradshaw JM. Lancet 1980 PMID 6102236 | option values 0–3, liquid-stool numeric scoring, complication +1 each, remissio… |
| `partial-mayo` | Partial Mayo Score (Ulcerative Colitis) | `wave5-nephro-gi.ts` | `pga`, `stool` | PGA cannot be scored without recalling it must incorporate the other Mayo items plus abdominal discomfort, well-being, physical findings, and performance status. Normal stool freq… | Schroeder KW et al. N Engl J Med 1987 PMID 3317057; Mayo score PGA instructions as used in UC trials | option values 0–3, calculate() 0–9 bands |
| `peews-full` | Full Pediatric Early Warning Score (Multi-domain) | `wave5-peds-id.ts` | `cv`, `resp` | Monaghan PEWS scores HR/RR against age-normal parameters. Without those numbers, +20 above normal and mildly elevated RR cannot be applied. | Monaghan A. Paediatr Nurs 2005 PEWS; Nationwide Children's Monaghan PEWS table; AHA PALS vital-sign ranges | domain points 0–3, concern +1, total bands 0–2 / 3–4 / 5–6 / ≥7 |
| `bladder-cancer-eortc` | EORTC NMIBC Risk Points (Simplified) | `wave5-surg-uro-ent.ts` | `grade` | Modern reports are WHO 2004/2016 low vs high grade. User cannot map G1/G2/G3 from a current pathology report. | Sylvester RJ et al. Eur Urol. 2006;49:466-477; EAU NMIBC guidelines WHO 1973 vs 2004/2016 grade | recurrence vs progression point logic or band labels |
| `nela-risk` | NELA Emergency Laparotomy Risk (Simplified Educational) | `wave5-surg-uro-ent.ts` | `wbc` | 'Abnormal mild' has no numeric band; user must guess 12–20 or 2–4. | Eugene N et al. Br J Anaesth. 2018 NELA risk model physiology bands; data.nela.org.uk variable notes | educational domain tally, age 70/80 increments, not-a-percentage disclaimer |
| `sort-score` | SORT — Surgical Outcome Risk Tool (Simplified) | `wave5-surg-uro-ent.ts` | `asa`, `urgency`, `severity` | Cannot distinguish NCEPOD time-to-theatre classes or AXA-PPP minor vs intermediate vs major/complex from labels alone. | Protopapa KL et al. Br J Surg. 2014;101:1774-1783; NCEPOD Classification of Intervention; SORT supplementary variable d… | logistic coefficients, age handling, high-risk specialty list |
| `snakebite-severity` | Snakebite Severity Score (Simplified) | `wave5-tox-psych.ts` | `local`, `pulmonary`, `cv`, `heme`, `cns`, `gi` | Simplified Dart-style domains lack operational anchors. Local extent (cm from bite / fraction of limb), RR, HR/SBP, and PT/PTT/platelets/fibrinogen are required to score reliably.… | Dart RC et al. Ann Emerg Med. 1996 SSS table; Medscape/AENJ SSS reproductions. Fit anchors to existing 0–3/0–2 values o… | option values (local 0–3, pulmonary 0–2, cv 0–2, heme 0–3, cns 0–2, gi 0–2), ca… |
| `variceal-bleed-risk` | Variceal Bleed Risk Helper (Child–Pugh + Context) | `wave6-clinical-residual.ts` | `varices` | Baveno/AASLD primary prophylaxis uses small <5 mm vs medium/large ≥5 mm (or occupying >1/3 of lumen). Size cannot be scored from endoscopy prose that omits millimetres. | AASLD 2017 portal hypertensive bleeding guidance; Baveno VI/VII variceal size convention | option values none/small/large/unknown, Child–Pugh class entry, context branchi… |
| `bmr-katch-mcardle` | Katch–McArdle BMR | `wave6-formulas-misc.ts` | `activity` | Optional TDEE multiplier uses undefined ordinals; Light vs Moderate has no operational rule. | Same PAL/activity-factor table as TDEE Harris | BMR equation; activity numeric values |
| `tdee-harris` | TDEE (Harris–Benedict × Activity) | `wave6-formulas-misc.ts` | `activity` | Lifestyle bands are unlabeled ordinals. Two users will pick different multipliers for the same patient (desk job + 2 gym days vs laborer). | Standard Harris–Benedict / FAO-style PAL bands as used with revised HB (Roza–Shizgal 1984); TDEE activity-factor tables… | multiplier values 1.2–1.9; revised HB BMR coefficients |
| `fn-pathway` | Febrile Neutropenia Pathway Helper | `wave6-heme-onc.ts` | `burden`, `severeMucositis`, `allogeneic` | Mild/moderate/severe without operational definition is the listed P1 pattern. IDSA/NCCN high-risk FN uses WHO mucositis ≥3 and anticipated ANC ≤100/µL for ≥7 days. | Freifeld AG et al. CID 2011 IDSA FN (PMID 21258094); MASCC burden-of-illness; NCCN FN high-risk list | red-flag point weights; ANC <100 extra point; fever/ANC gates; educational (not… |
| `maps-mayo` | HCM Prognostic Risk (Educational MAPS-style) | `wave7-fillins.ts` | `nyha`, `nsvt`, `famScd`, `syncope` | These are the major SCD markers. Without NYHA stems, NSVT ≥3 beats ≥120 bpm <30 s, family-SCD (1st-degree <40 y or 1st-degree with HCM any age), and syncope not neurally mediated … | O'Mahony C et al. Eur Heart J 2014 HCM Risk-SCD (PMID 24126876); 2024 AHA/ACC HCM guideline (PMID 38718139) | educational Cox formula; 5-year % output; disclaimer not official Mayo MAPS or … |
| `maggic-hf` | MAGGIC Heart Failure Risk Score | `wave7-highuse.ts` | `nyha` | Integer NYHA points cannot be assigned without functional class definitions. | Pocock SJ et al. Eur Heart J 2013 (PMID 23095984); NYHA/AHA class definitions; heartfailurerisk.org | NYHA points 0/2/6/8, other item weights, 1y/3y mapping |
| `seattle-hf` | Seattle Heart Failure Model (Educational) | `wave7-highuse.ts` | `nyha` | NYHA class enters the linear predictor; cannot assign I–IV from labels alone. | NYHA/AHA functional classification; Levy WC et al. Circulation 2006 SHFM (PMID 16585412) | NYHA values 1–4, educational K coefficients, survival formula |
| `syntax-score` | Anatomical SYNTAX Helper (Simplified) | `wave7-highuse.ts` | `bifurcation`, `calcium`, `tortuosity`, `cto` | Medina, heavy calcium, severe tortuosity, and CTO duration are published operational terms; a non-interventional user cannot tick them from the labels. | Sianos G et al. EuroIntervention 2005 SYNTAX score (PMID 19758907); SYNTAX score primer definitions | helper weights, tertile-style bands, educational disclaimer |
| `mrss` | Modified Rodnan Skin Score (mRSS) | `wave7-rheum-activity.ts` | `face`, `chest`, `abdomen`, `rFingers`, `lFingers`, `rHands`, `lHands`, `rForearms` | 1 vs 2 vs 3 needs the Khanna pinch/fold technique. Hidebound on 3 confuses tethering with thickness (Khanna 2017 scores thickness, not tethering). | Khanna D et al. J Scleroderma Relat Disord. 2017 mRSS standardization; Clements 1993; SCTC Rodnan training | 17 sites, 0–3 each, sum 0–51, bands 0–9 / 10–19 / 20–31 / ≥32 |

### P1 — Missing official time window (`missing-time-window`, n=28)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `timi-stemi` | TIMI Risk Score (STEMI) | `cardiology.ts` | `killip2`, `time4` | Killip is an exam (rales/S3/JVD vs pulmonary edema vs shock). Time to treatment >4 h in TIMI STEMI is symptom onset to reperfusion (lytic or balloon), not door-to-needle or last m… | Morrow DA et al. Circulation 2000 TIMI STEMI (InTIME II); Killip & Kimball 1967 | age 2 vs 3 mutual logic, other weights, 30-day mortality table |
| `cage` | CAGE Questionnaire | `gi-neuro-psych.ts` | `c`, `a`, `g`, `e` | CAGE is a lifetime screen. Without 'ever,' patients may answer about current drinking only. Eye-opener is incomplete vs Ewing 1984. | Ewing JA. JAMA 1984 PMID 6471323 | four binary points, ≥2 positive threshold |
| `kdigo-aki` | KDIGO AKI Staging | `missing-heme-id-nephro.ts` | `crStage`, `uopStage` | KDIGO 1.5×/2×/3× is within 7 days (known or presumed). Omitting 7 days mis-applies old baselines. UOP is weight-based. | KDIGO 2012 AKI Clinical Practice Guideline | max(Cr, UOP) staging, values 0–3, UOP hour cutoffs 6–12 / ≥12 / 24 h / anuria ≥… |
| `audit-c` | AUDIT-C Alcohol Screen | `missing-neuro-psych.ts` | `q1`, `q2`, `q3` | AUDIT-C is past-year consumption. Without a standard-drink definition, Q2/Q3 (including 6 or more drinks) are not administrable. | Bush K et al. Arch Intern Med 1998 PMID 9738608; WHO AUDIT interview booklet; NIAAA standard drink | option values 0–4, sex cutoffs ≥4 men / ≥3 women, max 12 |
| `phq2` | PHQ-2 Depression Screen | `missing-neuro-psych.ts` | `q1`, `q2` | Without the stem, items may be scored as current mood rather than the last 2 weeks. | Kroenke K et al. Med Care 2003 PMID 14583691; phqscreeners.com | option values 0–3, cutoff ≥3, max 6 |
| `asrs-adhd` | ASRS-v1.1 Adult ADHD Screen (Part A) | `wave2-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6` | Official ASRS-v1.1 Part A is how you have felt and conducted yourself over the past 6 months. Missing window changes screening. Stems drop How often do you / When you have a task.… | Kessler RC et al. Psychol Med 2005; WHO/Harvard ASRS-v1.1 6-question screener PDF (6-month instruction; shaded boxes) | shaded-positive logic (Q1–3 ≥3; Q4–6 ≥2), cutoff ≥4/6, raw 0–24 as details only |
| `audit-full` | AUDIT (Full 10-Item) | `wave2-neuro-psych.ts` | `q2`, `q5`, `q6`, `q7`, `q8` | Official WHO AUDIT Q4–Q8 are during the last year. Dropping that on Q5–Q8 mixes lifetime vs 12-month reporting. Standard drink is 10 g ethanol WHO vs ~14 g US — patients under/ove… | Babor TF et al. WHO AUDIT 2nd ed. 2001 (WHO-MSD-MSB-01.6a) | 0–4 item values, Q9–Q10 0/2/4, 0–40 total, WHO zones 0–7 / 8–15 / 16–19 / ≥20 |
| `cage-aid` | CAGE-AID Questionnaire | `wave2-neuro-psych.ts` | `c`, `a`, `g`, `e` | CAGE-AID is a lifetime (ever) screen. Without ever, some users score only the current week and under-detect. | Brown RL, Rounds LA. Wis Med J 1995 CAGE-AID; Ewing JA CAGE 1984 | 4 binary items, ≥1 vs ≥2 cutoff discussion in interpretation |
| `dast-10` | DAST-10 Drug Abuse Screening | `wave2-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8` | DAST-10 is a 12-month screen (alcohol excluded). Lifetime reading inflates the score. Item 10 officially exemplifies memory loss, hepatitis, convulsions, bleeding. Item 3 rewrite … | Skinner HA. Addict Behav 1982 DAST; DAST-10 12-month instructions (Yudko reviews / CAMH form) | 10 binary items, Yes=1 including item 3 as currently oriented, bands 0 / 1–2 / … |
| `nccn-distress` | NCCN Distress Thermometer | `wave2-oncology.ts` | `score` | Official NCCN stem is distress in the past week including today. Without that window, scores mix today-only vs chronic. Full problem list is copyrighted and correctly not reprinte… | NCCN Guidelines: Distress Management (thermometer stem 'past week including today'; ≥4 threshold). Copyright: NCCN Dist… | 0–10 passthrough; ≥4 / ≥7 bands; five domain booleans (they do not change the n… |
| `drip-score` | DRIP Score (Drug-Resistant Pneumonia) | `wave2-pulm-id.ts` | `priorDrp`, `poorFunc`, `acidSuppression`, `woundCare`, `mrsaCol` | Webb: prior DRP within 1 year; MRSA colonization within 1 year; poor function = Karnofsky <70 or nonambulatory; acid suppression = PPI or H2RA; wound care = skilled wound care. Wi… | Webb BJ et al. Antimicrob Agents Chemother. 2016;60:2652-2663 (prior DRP 1 yr; Karnofsky <70 or nonambulatory; H2/PPI) | major +2 / minor +1, threshold ≥4 |
| `akin-aki` | AKIN AKI Staging | `wave3-nephro-icu.ts` | `crStage` | AKIN’s defining addition vs RIFLE is an abrupt Cr rise within 48 hours after volume optimization, obstruction excluded. A slow CKD rise can be staged as 1 from the labels. Stage 3… | Mehta RL et al. Crit Care. 2007 PMID 17331245 AKIN 48-hour window and stage table | option values 0–3, Math.max(cr, uo), RRT forces stage 3 |
| `fena-diuretic` | FENa on Diuretics + FeUrea | `wave3-nephro-icu.ts` | `onDiuretic` | 'Recent' hides the time window. Loops confound FENa while natriuresis is active (typically ~6–24 h). User cannot decide whether to check the box; calculate() then prefers FeUrea. | Carvounis CP et al. Kidney Int. 2002 PMID 12427149 FeUrea after diuretics; standard FENa teaching that loops raise UNa/… | FENa and FeUrea formulas, <1/>2 and <35/>50 cutoffs, onDiuretic display switch |
| `gestational-htn` | Gestational Hypertension Diagnostic Helper | `wave3-peds-ob.ts` | `after20`, `severeBp` | ACOG diagnosis requires two occasions at least 4 hours apart for non-severe HTN. Severe-range BP is confirmed over a short interval (about 15 minutes), not 4 hours — waiting 4 h d… | ACOG Practice Bulletin 222 (2020) gestational HTN / preeclampsia diagnostic timing | classification branches (chronic vs gestational vs preeclampsia) |
| `kdigo-peds-aki` | Pediatric KDIGO AKI Stage (Creatinine) | `wave3-peds-ob.ts` | `baselineCr`, `currentCr` | KDIGO Stage 1 absolute criterion is ≥0.3 mg/dL within 48 hours; the 1.5× criterion is within 7 days. A 0.3 rise over weeks is not AKI. The UI will stage AKI whenever current − bas… | KDIGO AKI 2012 creatinine staging (48 h / 7 d windows) | fold-change thresholds 1.5 / 2 / 3, Cr ≥4, RRT, eGFR <35 logic |
| `snappe-ii` | SNAPPE-II (Simplified Educational) | `wave3-peds-ob.ts` | `map`, `temp`, `po2fio2`, `ph`, `seizures`, `uop` | Official SNAPPE-II uses the worst physiology in the first 12 hours of life. Without that window, users may enter later NICU nadirs. Seizures wording is circular; official item is … | Richardson DK et al. J Pediatr 2001 SNAP-II / SNAPPE-II (first 12 h worst values) | educational point bands in calculate(), input units |
| `lyme-pretest` | Lyme Disease Pretest Probability Helper | `wave4-em-id.ts` | `endemic`, `summer`, `emRash` | Educational helper still asks the user to know CDC endemicity and local season without stating them. | IDSA/AAN/ACR 2020 Lyme guideline (Lantos et al.); CDC Lyme surveillance maps/seasonality | Educational weights; EM+exposure short-circuit to treat-without-serology |
| `ad8` | AD8 Dementia Screening Interview | `wave4-neuro-psych.ts` | `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8` | AD8 scores change over several years, not lifelong traits. Without that stem, a lifelong poor memory or always-homebody hobby pattern is over-scored. | Galvin JE et al. Neurology. 2005; Washington University AD8 (clinical use with attribution) | eight yes = 1, cutoff ≥2 |
| `pc-ptsd` | PC-PTSD-5 Screen | `wave4-neuro-psych.ts` | `trauma`, `q1`, `q2`, `q3`, `q4`, `q5` | Symptoms are a past-month screen after a defined DSM-5 trauma gate. Lifetime nightmares/avoidance without the window over-calls; trauma exposure criterion is not administrable. | Prins A et al. J Gen Intern Med. 2016; VA National Center for PTSD PC-PTSD-5 (public) | trauma gate must be true before counting 0–5, cutoff ≥3 |
| `pfapa` | PFAPA Criteria Helper | `wave6-em-peds.ts` | `recurrentFever`, `episodeDays`, `intervalWeeks` | Regularly timed is not operational. The windows that earn points are invisible on the inputs (Marshall/Thomas clockwork 3–7 d every ~3–8 wk). | Marshall GS et al. J Pediatr 1987; Thomas KT et al. J Pediatr 1999 PFAPA criteria variants | point weights, cardinal ≥1 + wellBetween + excludeOther classic logic |
| `riete-bleed` | RIETE Bleeding Score | `wave6-heme-onc.ts` | `recentBleed`, `malignancy` | Recent and per RIETE definition force a protocol-card lookup. Remote GI bleed or treated-in-remission cancer will be scored inconsistently. | Ruíz-Giménez N et al. Thromb Haemost 2008 (PMID 18612534) variable definitions; later RIETE active-cancer / recent-blee… | weights 2 / 1.5 / 1.5 / 1 / 1 / 1; strata 0 / 1–4 / >4 |
| `tls-cairo` | Cairo-Bishop Laboratory TLS | `wave6-heme-onc.ts` | `uric`, `k`, `phos`, `ca` | Laboratory TLS is ≥2 abnormalities in the same 24 hours from 3 days before through 7 days after therapy. Without that on the fields, users mix labs from different days or chronic … | Cairo MS, Bishop M. Br J Haematol 2004 (PMID 15384972) | four binary criteria; need ≥2; adult P ≥4.5 / Ca ≤7 / K ≥6 / uric ≥8 |
| `eat-26` | EAT-26 Eating Attitudes Total | `wave6-psych-sleep.ts` | `behaviors` | Official EAT-26 behavioral questions are time-bounded and operational. Extreme exercise and high concern are not the instrument. Any one positive item should flag independent of t… | Garner DM et al. Psychol Med. 1982 PMID 6961471; eat-26.com behavioral questions | Total 0–78 interpretation; ≥20 cutoff; BMI overlay. Do not reprint copyrighted … |
| `peg-pain` | PEG-3 Pain Average | `wave6-psych-sleep.ts` | `pain`, `enjoyment`, `activity` | Official PEG is three 0–10 items over the past week. Interference items use 0 = does not interfere, 10 = completely interferes (not intensity anchors). Without the window and E/G … | Krebs EE et al. J Gen Intern Med. 2009 PMID 19418100; BPI interference anchors (Cleeland) | Average of three items; 0–10 range; ~1-point MCID note |
| `gina-control` | GINA Symptom Control (Checklist) | `wave6-scores-residual.ts` | `daySx`, `night`, `reliever`, `activity` | GINA Box 2-2 is a past-4-week checklist. Without the window, night waking or activity limitation can be scored as lifetime. Reliever should count SABA for symptoms, exclude pre-ex… | GINA strategy Box 2-2 / Table 2 (2024–2026): In the past 4 weeks, four items; SABA-reliever footnote. | 0 well / 1–2 partly / 3–4 uncontrolled logic; yes = 1 each |
| `esspri` | ESSPRI (Sjögren Patient Index) | `wave7-rheum-activity.ts` | `dryness`, `fatigue`, `pain` | Official ESSPRI is last 2 weeks; 0 = no symptom, 10 = worst imaginable. Without the window patients mix today vs chronic sicca. | Seror R et al. Ann Rheum Dis. 2011 ESSPRI; 2015 ESSDAI/ESSPRI user guide | mean of three 0–10 scores, PASS ≤5 |
| `asas-perispa` | ASAS Peripheral Spondyloarthritis Classification (2011) | `wave7-rheum-class.ts` | `infection`, `ibp`, `enthesitis` | Category-A preceding infection is the reactive-arthritis window (urethritis/cervicitis or diarrhea within ~1 month). IBP needs the ASAS 4/5 rule. Enthesitis here is any enthesis, … | Rudwaleit M et al. Ann Rheum Dis. 2011 peripheral SpA criteria | entry AND (≥1 cat A OR ≥2 cat B) |
| `isg-behcet` | ISG 1990 Behçet Disease Classification | `wave7-rheum-class.ts` | `oral`, `pathergy` | ISG oral item is at least three episodes in 12 months. Pathergy technique omitted (same as ICBD). | International Study Group for Behçet’s Disease. Lancet. 1990 | oral mandatory + ≥2 of genital/eye/skin/pathergy |

### P1 — Other (`other`, n=11)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `sofa` | SOFA Score | `critical-care.ts` | `cv`, `renal` | Pressor doses are µg/kg/min; UOP is mL/24 h. <500 can be misread as mL/h. | Vincent JL et al. Intensive Care Med. 1996 SOFA table | 0–4 domain values, sum 0–24, ΔSOFA messaging |
| `opioid-mme` | Morphine Milligram Equivalents (MME) | `emergency-misc.ts` | `dose`, `freq`, `opioid` | CDC 2.4 already converts patch mcg/h → MME/day. Users will enter 25 'mg' × 3 doses × 2.4 or 25 × 24 h. Methadone factor is not a single 4. | Dowell D et al. MMWR 2022 CDC opioid guideline conversion table | listed factors, daily × factor, 50 / 90 MME bands |
| `rule-of-nines` | Rule of Nines (Adult TBSA) | `emergency-misc.ts` | `head`, `antTrunk`, `postTrunk`, `armR`, `armL`, `legR`, `legL`, `perineum` | Checking Yes assigns the entire region. Partial burns cannot be entered, and first-degree is not excluded. Palm/fraction reminder appears only after a (often wrong) total. | Wallace AB Lancet 1951 rule of nines; ABA TBSA 2nd/3rd only | 9/18/9/18/1 weights and sum |
| `rcri` | Revised Cardiac Risk Index (RCRI) | `missing-cardio-pulm.ts` | `hf` | Lee 1999 HF is broader than a chart diagnosis: pulmonary edema, PND, bilateral rales, S3, or CXR pulmonary vascular redistribution also count. Those patients would be under-scored. | Lee TH et al. Circulation 1999 PMID 10477528; MDCalc RCRI criterion notes | six 0/1 factors, class I–IV, original event-rate table |
| `glasgow-imrie` | Glasgow-Imrie Criteria (Pancreatitis) | `missing-gi-liver.ts` | `ldh` | Parenthetical invites scoring AST as a substitute. Modified 8-factor Glasgow-Imrie uses LDH >600 only; original Imrie had AST >200 as a separate 9th factor. | Blamey SL et al. Gut 1984; Imrie CW et al. Br J Surg. 1978 (8- vs 9-factor) | 8-item count, ≥3 threshold, other seven labels/cutoffs |
| `qt-prolongation-risk` | Tisdale QTc Prolongation Risk Score | `wave2-cardiology.ts` | `oneQtDrug`, `twoQtDrugs` | Scoring 3 vs 6 points requires a drug list the UI does not provide. Users omit conditional-risk agents or double-count loop diuretic as both a loop and a QT drug. | Tisdale et al. Circ Cardiovasc Qual Outcomes 2013; CredibleMeds / AZCERT | Weights including +6 total for ≥2 drugs; 0–6 / 7–10 / ≥11 bands |
| `mod-score` | Multiple Organ Dysfunction Score (Marshall) | `wave2-pulm-id.ts` | `cv` | Cannot compute PAR without CVP/RAP. Approximate by shock severity is not a Marshall rule; high-dose pressors as score 4 is an unofficial surrogate. | Marshall JC et al. Crit Care Med. 1995;23:1638-1652 (PAR = HR × RAP/MAP) | 0–4 per domain, PF/Cr/bili/plt/GCS bins, total 0–24 |
| `must-score` | MUST Malnutrition Universal Screening Tool | `wave4-icu-vent.ts` | `bmi` | Unobtainable height/weight forces 0 points while telling the user to use BAPEN alternatives, without ulna-length or MUAC mapping. Thin unweighed patients will be under-scored. | Elia M / BAPEN MUST Explanatory Booklet (ulna length; MUAC <23.5 cm ≈ BMI <20; >32 cm ≈ BMI >30) | BMI 0/1/2 + weight-loss 0/1/2 + acute 0/2, categories 0 / 1 / ≥2 |
| `ort` | Opioid Risk Tool (ORT) | `wave4-neuro-psych.ts` | `fhAlcohol`, `fhIllegal`, `sexualAbuse` | Point chips contradict the sex-specific math. Bedside user cannot tell which items change by sex. | Webster LR, Webster RM. Pain Med. 2005 ORT table | sex-specific sum, bands 0–3 / 4–7 / ≥8 |
| `acr-eular-egpa-2022` | 2022 ACR/EULAR Eosinophilic Granulomatosis with Polyangiitis Classification | `wave7-rheum-class.ts` | `hematuria` | 2022 EGPA is applied only after a clinical vasculitis diagnosis. Without an entry gate, asthma + eosinophilia (8 points) classifies EGPA in patients who never had vasculitis. Hema… | Grayson PC et al. Ann Rheum Dis. 2022 (entry: small/medium-vessel vasculitis) | signed weights, ≥6 threshold |
| `acr-eular-pmr-2012` | 2012 ACR/EULAR Polymyalgia Rheumatica Classification | `wave7-rheum-class.ts` | `usShoulderHip`, `usBothShoulders` | User can classify PMR without the mandatory clinical setting. Abnormal US is a specific list (subdeltoid bursitis / biceps tenosynovitis / GH synovitis; hip synovitis / trochanter… | Dasgupta B et al. Arthritis Rheum. 2012 | item weights, clinical ≥4 vs US ≥5 logic. Adding non-scoring entry checkboxes d… |

### P1 — Untestable / exception rule not stated (`missing-untestable`, n=5)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `car-t-crs` | ASTCT CRS Grade (CAR-T) | `wave2-oncology.ts` | `fever`, `hypoxia` | ASTCT: after antipyretics/tocilizumab/steroids, fever is no longer required to grade subsequent CRS. Tool returns 'No CRS' without fever and will under-grade treated patients. Gra… | Lee DW et al. Biol Blood Marrow Transplant. 2019 ASTCT CRS table footnotes (fever after anticytokine therapy; low-flow … | Fever required in calculate(); hypotension 0/2/3/4; hypoxia 0/2/3/4; grade = ma… |
| `asia-impairment` | ASIA Impairment Scale (AIS A–E) | `wave2-ortho-trauma.ts` | `grade` | A vs B hinges on sacral sparing a rater cannot confirm from the UI: LT and PP at S4–5 mucocutaneous junction and/or DAP; motor incomplete also requires VAC or motor sparing >3 lev… | ASIA/ISCoS ISNCSCI 2019 revision worksheet and impairment-scale definitions | A–E option values, interpretation risk mapping |
| `marshall-organ` | Modified Marshall Organ Failure (Pancreatitis) | `wave3-em-surgery.ts` | `renal`, `resp`, `cv` | Revised Atlanta scores acute change: a dialysis patient with baseline Cr 3.0 must not be labeled renal failure 2 on the absolute bin. Non-ventilated patients cannot compute PaO2/F… | Banks PA et al. Gut 2013 revised Atlanta modified Marshall table and CKD footnote; MDCalc Marshall (pancreatitis) | 0–4 domain values, failure = any organ ≥2, 48 h persistent-failure messaging in… |
| `npass` | N-PASS (Pain / Agitation / Sedation) Simplified | `wave3-peds-ob.ts` | `crying`, `behavior`, `facial`, `extremities`, `vitals` | Official N-PASS crying includes silent-continuous cry if intubated (+2) and intermittent silent cry (+1). Without that, ventilated neonates are under-scored. Hummel implementation… | Hummel P et al. N-PASS (J Perinatol 2008); N-PASS visual tool (Hummel & Puchalski) scoring criteria | −2 to +2 domain values, pain vs sedation subtotal logic in calculate() |
| `saps-3` | SAPS 3 (Admission Score) | `wave7-fillins.ts` | `gcs`, `bili`, `temp`, `creat`, `hr`, `wbc`, `ph`, `plt` | Official SAPS 3 uses estimated lowest GCS in the ±1 h window and pre-sedation GCS if sedated/paralyzed; intubated verbal is untestable. A raw GCS with no exception rule is the GCS… | Metnitz/Moreno Intensive Care Med 2005 SAPS 3 Parts 1–2 (PMID 16132892, 16132893); SAPS 3 admission score sheet (estima… | 16-point offset; comorbidity single-highest map; Box II reason/site maps; globa… |

### P1 — Thin numeric anchors (`numbered-scale-no-anchors`, n=3)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `ibs-sss` | IBS Symptom Severity Score (IBS-SSS) | `wave5-nephro-gi.ts` | `painSev`, `distension`, `bowelSat`, `interfere`, `painDays` | Francis items are 100 mm VAS over the last 10 days. Without 0/100 meaning, raters invert satisfaction vs severity and mix current vs 10-day recall. | Francis CY et al. Aliment Pharmacol Ther 1997 PMID 9146781 | formula pain + days×10 + distension + dissatisfaction + interference, 0–500 ban… |
| `sheehan` | Sheehan Disability Scale (SDS) | `wave5-tox-psych.ts` | `work`, `social`, `family` | SDS is three 0–10 disruption ratings with standard verbal anchors and a time frame. Two domains are unlabeled scales; marked (≥5) used in the result is not shown at input. | Sheehan DV SDS; Leon AC et al. Int J Psychiatry Med. 1997. Confirm official time window (past week vs past month) from … | 0–10 range, total = work+social+family, optional days fields, interpretation ba… |
| `nose-scale` | NOSE Scale (Nasal Obstruction) | `wave6-psych-sleep.ts` | `raw` | Cannot administer from the UI. Official NOSE is past 1 month, each item 0–4: Not a problem / Very mild / Moderate / Fairly bad / Severe. Same file itemizes PEG-3; NOSE is only fiv… | Stewart MG et al. Otolaryngol Head Neck Surg. 2004 PMID 14990910 | Raw 0–20 × 5 → 0–100; bands 0–25 / 26–50 / 51–75 / 76–100 |

### P1 — Laterality / side unspecified (`laterality`, n=1)

| ID | Name | File | Inputs | Problem | Research | Do not change |
|---|---|---|---|---|---|---|
| `ariscat` | ARISCAT Postoperative Pulmonary Risk | `wave5-surg-uro-ent.ts` | `incision`, `respInfection` | Lower abdominal/pelvic/laparoscopic/extremity cases are not mapped; official ARISCAT scores lower abdominal as peripheral (0). Respiratory infection originally means treated upper… | Canet J et al. Anesthesiology. 2010;113:1338-1350 ARISCAT incision coding | point values 0/15/24, infection 17, anemia 11, duration bands, emergency 8, str… |

---

## 11. P2 catalog — polish (52)

| ID | Name | File | Pattern | Problem |
|---|---|---|---|---|
| `bishop` | Bishop Score | `emergency-misc.ts` | `vague-ordinal` | Original Bishop station is relative to ischial spines (not the −5 to +5 ACOG scale). Firm/medium/soft and cervical position have no one-lin… |
| `epworth` | Epworth Sleepiness Scale | `emergency-misc.ts` | `abbreviated-stem` | Official ESS parentheticals missing. ESS is copyrighted (M.W. Johns) — do not invent fuller wording if unlicensed. |
| `gestational-age` | Gestational Age & Naegele Due Date | `emergency-misc.ts` | `other` | Using last day of flow systematically shortens GA / EDD. |
| `mallampati` | Modified Mallampati Classification | `missing-emergency.ts` | `exam-protocol-missing` | Without field-level helpText, ED users grade a supine phonating patient and inflate the class. |
| `years-algorithm` | YEARS Algorithm for PE | `missing-emergency.ts` | `other` | Official item wording is already used, but a one-line reminder of which signs count would reduce under-calling. |
| `forrest-classification` | Forrest Classification (Ulcer Bleed) | `missing-gi-liver.ts` | `other` | Empty descriptions on IIa–III are polish. One-line visual cues would match Ia/Ib and reduce clot vs flat-spot vs clean-base mix-ups. |
| `cam-icu` | CAM-ICU Delirium Screen | `missing-neuro-psych.ts` | `exam-protocol-missing` | Feature 4 still requires the worksheet for the four questions and two-finger command. UTA rule is not on the form. Do not treat whole CAM-I… |
| `pregnancy-dating` | Naegele's Rule (EDD from LMP) | `missing-peds-ob-tox.ts` | `other` | Same first-day pitfall as gestational-age. |
| `yale-observation` | Yale Observation Scale (Febrile Child) | `missing-peds-ob-tox.ts` | `exam-protocol-missing` | Original scale is scored by watching the child before undressing or invasive exam, usually in a parent's arms. Without that, testers score … |
| `osmolar-clearance` | Osmolar Clearance (Cosm) | `wave2-general-lab.ts` | `other` | Bedside collections are almost always 24-h mL, not mL/min. Same field/unit as CH2O, missing the one-line reminder that already exists next … |
| `urine-osmolal-gap` | Urine Osmolal Gap (UOG) | `wave2-general-lab.ts` | `other` | 'Convert appropriately' is not operational. Labs report UUN mg/dL, urea mmol/L, or urea mg/dL; mixing them by ~2× silently inflates/deflate… |
| `saps-ii-simp` | SAPS II | `wave2-pulm-id.ts` | `other` | Le Gall: scheduled surgical = operation planned ≥24 h in advance; unscheduled = emergency. GCS if sedated = estimated pre-sedation (worst 2… |
| `tuberculosis-risk` | TST Interpretation by Risk Group | `wave2-pulm-id.ts` | `other` | The administering rule (palpate induration, not erythema; read 48–72 h) is not on the input the user fills. |
| `metabolic-syndrome` | Metabolic Syndrome (NCEP ATP III) | `wave3-cardio-vasc.ts` | `other` | Easy to miss the cutoff if the user does not re-read Sex. helpText unused on waist. |
| `pulse-pressure-variation` | Pulse Pressure Variation (PPV) | `wave3-nephro-icu.ts` | `other` | SPmax and DPmax may not be the same beat; PPV uses pulse-pressure extrema over one mechanical breath. Validity checkbox is good; the measur… |
| `avpu` | AVPU Responsiveness Scale | `wave3-peds-ob.ts` | `exam-protocol-missing` | How to apply voice vs pain, and what counts as Alert in an infant, are not on the options. Pain stimulus (trapezius squeeze or nail-bed) is… |
| `dehydration-who` | WHO Dehydration Classification | `wave3-peds-ob.ts` | `exam-protocol-missing` | Result bins are official, but the maneuver (where and how to pinch) is unstated. Malnutrition false-positives are only in pearls. |
| `estimated-fetal-weight` | Estimated Fetal Weight (Hadlock Simplified) | `wave3-peds-ob.ts` | `other` | Entering 85 mm as 85 cm blows up EFW. Unit mix-up is the main bedside ambiguity on an otherwise pure formula. |
| `body-fat-navy` | US Navy Body Fat Estimate | `wave3-tox-endo-heme.ts` | `exam-protocol-missing` | Hodgdon protocol needs neck just inferior to the larynx (tape perpendicular) and hip at maximal buttocks protrusion. Without landmarks the … |
| `nicotine-dependence` | Fagerström Test for Nicotine Dependence | `wave3-tox-endo-heme.ts` | `abbreviated-stem` | Official item 2 examples (church, library, cinema / forbidden places) omitted. Not copyright-locked like MMSE. |
| `waist-hip-ratio` | Waist–Hip Ratio (WHR) | `wave3-tox-endo-heme.ts` | `other` | Waist protocol varies (umbilicus vs WHO midpoint vs iliac crest). helpText unused. |
| `meningitis-bacterial` | Bacterial Meningitis Score (Nigrovic) | `wave4-em-id.ts` | `other` | A user can enter BMS = 0 on a neonate or pretreated child and read very low risk. Items themselves are scorable; this is unused helpText po… |
| `rose-rule` | ROSE Rule (Syncope) | `wave4-em-id.ts` | `other` | Isolated Q in III is excluded, but pathologic Q morphology (duration/depth) is not stated, so minor septal Qs get over-called. |
| `brooke-formula` | Brooke Burn Fluid Formula (Modified) | `wave4-formulas.ts` | `other` | Modified Brooke and Parkland use 2nd-degree and deeper %TBSA. First-degree erythema inflates 24 h volume. |
| `eutos` | EUTOS Score (CML) | `wave4-heme-onc.ts` | `other` | Same missing 0 if not palpable / MCL exam reminder. |
| `hasford-score` | Hasford Score (Euro / CML) | `wave4-heme-onc.ts` | `other` | Palpable vs imaging spleen, and midclavicular-line exam, are easy to mis-enter. One-line reminder already used next door. |
| `sas-sedation` | Riker Sedation-Agitation Scale (SAS) | `wave4-icu-vent.ts` | `abbreviated-stem` | 5 vs 6 and 2 vs 3 are the usual mis-scores. Official Riker: 5 calms to verbal limits; 6 does not calm despite frequent verbal reminding. 3 … |
| `concussion-return` | Graduated Return-to-Play (Concussion) | `wave4-neuro-psych.ts` | `other` | Stage 2 vs 3 vs 4 (no resistance vs running vs progressive resistance, still no contact) is the decision. A one-line option.description wou… |
| `vasospasm-risk` | SAH Vasospasm / DCI Risk Window | `wave4-neuro-psych.ts` | `vague-ordinal` | Thin vs thick is the whole grade. Juniors still need the Frontera rule of thumb. |
| `acc-aha-hf-stage` | ACC/AHA Heart Failure Stages | `wave5-cardio.ts` | `vague-ordinal` | Optional, but if shown it is the classic terse class scale. CCS angina in this same file already demonstrates label + description with oper… |
| `who-pneumonia` | WHO Pediatric Pneumonia Classification | `wave5-peds-id.ts` | `other` | IMCI chest indrawing is inward movement of the lower chest wall on inspiration in a calm child. RR counted in a crying child misclassifies … |
| `clavien-dindo` | Clavien–Dindo Complication Grade | `wave5-surg-uro-ent.ts` | `other` | Scorable for most users, but IIIa/IIIb/IV lose the official therapy examples that I/II already show. |
| `burn-transfer-aba` | ABA Burn Center Transfer Criteria | `wave5-tox-psych.ts` | `other` | The >10% TBSA item requires a bedside measurement method; pearls are easy to miss while ticking boxes. |
| `organophosphate` | Organophosphate Severity & Atropine Start | `wave5-tox-psych.ts` | `abbreviated-stem` | Scorable for toxicologists; a generalist may not recall SLUDGE/DUMBBELS from the acronym alone. |
| `modified-bishop` | Modified Bishop Score | `wave6-em-peds.ts` | `vague-ordinal` | Consistency and position are the published words but juniors still need exam anchors. Station is relative to ischial spines (not listed). |
| `a-body-shape` | A Body Shape Index (ABSI) | `wave6-formulas-misc.ts` | `other` | Same measurement-site ambiguity as WHtR; Krakauer ABSI is sensitive to WC. |
| `conicity-index` | Conicity Index | `wave6-formulas-misc.ts` | `other` | Same as WHtR/ABSI — pearl is easy to miss; field has no helpText. |
| `target-spo2-copd` | Target SpO₂ (COPD vs Normal) | `wave6-formulas-misc.ts` | `other` | User may pick General acutely ill for OHS, NMD, kyphoscoliosis, or CF and get 94–98% instead of 88–92%. helpText unused on the select. |
| `waist-height-ratio` | Waist-to-Height Ratio (WHtR) | `wave6-formulas-misc.ts` | `other` | Waist site (WHO midpoint vs iliac crest vs umbilicus) changes WHtR and can move 0.5/0.6 bands. helpText unused. |
| `haptoglobin-hemolysis` | Hemolysis Lab Pattern Checklist | `wave6-heme-onc.ts` | `undefined-yesno-cutoff` | Polish: a one-line cutoff would stop retic 1.8% and rare fragment arguments. Not P1 — educational lab pattern flags, not a validated score … |
| `hypercalcemia-of-malignancy` | Hypercalcemia of Malignancy Helper | `wave6-heme-onc.ts` | `abbreviated-stem` | helpText unused on a yes/no that upgrades urgency. Classic symptoms are one line. |
| `house-brackmann` | House–Brackmann Facial Nerve Grade | `wave6-psych-sleep.ts` | `exam-protocol-missing` | Official table also grades forehead (II moderate–good, III slight–moderate, IV none) and rest vs motion. III vs IV is mostly complete vs in… |
| `vanderbilt-adhd` | Vanderbilt ADHD Positive Criteria Helper | `wave6-psych-sleep.ts` | `abbreviated-stem` | Intended as a count helper. Users without the form still need rating anchors: symptoms Never / Occasionally / Often / Very often; performan… |
| `ado-index` | ADO Index (COPD Prognosis) | `wave6-scores-residual.ts` | `other` | User can pick the correct mMRC grade from the wording, but the chip implies 4 ADO points when updated ADO credits 3. |
| `body-roundness-index` | Body Roundness Index (BRI) | `wave7-bedside.ts` | `other` | WHO midpoint vs NIH iliac-crest protocols change WC by several cm and therefore BRI. |
| `hacor` | HACOR NIV Failure Score | `wave7-bedside.ts` | `other` | Users may enter pre-NIV gases (wrong time window). HACOR is for NIV, not already-intubated patients. |
| `nutric` | NUTRIC Score (ICU nutrition risk) | `wave7-bedside.ts` | `other` | Inconsistent with H2FPEF in the same file. Heyland used a simple chronic-condition count (not a published Charlson list); raters diverge un… |
| `pecarn-csi` | PECARN Cervical Spine Injury Rule | `wave7-bedside.ts` | `other` | Mostly scorable. Reliability drops on abnormal ABC and substantial injuries (paper: observation or surgery — skull fracture, pneumothorax, … |
| `rbaux` | Revised Baux Score (rBaux) | `wave7-fillins.ts` | `exam-protocol-missing` | Polish: Rule of Nines / Lund-Browder reminder and a one-line inhalation definition would help. Age + %TBSA arithmetic is otherwise scorable. |
| `prism-iv` | PRISM IV (Educational PICU Mortality) | `wave7-highuse.ts` | `missing-untestable` | Fixed pupils in PRISM are dilated (>3 mm) and not reactive; drops/trauma invalidate the item. |
| `wifi-diabetic-foot` | SVS WIfI Threatened Limb Classification | `wave7-highuse.ts` | `other` | Official WIfI ischemia also uses ankle systolic pressure and TcPO2 (same numeric bands as toe pressure). Users with only TcPO2 cannot map a… |
| `pasdas` | PASDAS (PsA Disease Activity Score) | `wave7-rheum-activity.ts` | `other` | Leeds Enthesitis Index sites are unnamed, so a user without a precomputed LEI cannot fill the box. |

---

## 12. Per-module work list

Use this to open one file and finish it.

| Module | P0 | P1 | P2 | IDs (P0 first) |
|---|---:|---:|---:|---|
| `cardiology.ts` | 2 | 6 | 0 | `heart-score` `wells-dvt` `has-bled` `timi-stemi` `wells-pe` `killip` `revised-geneva` `pesi` |
| `critical-care.ts` | 1 | 6 | 0 | `gcs` `qsofa` `sofa` `news2` `curb65` `psi-port` `apache2-simp` |
| `emergency-misc.ts` | 3 | 12 | 3 | `pecarn-head` `pgcs` `bode` `ottawa-ankle` `ottawa-knee` `nexus` `canadian-cspine` `parkland` `rule-of-nines` `westley-croup` `wells-hit` … +4 P1 |
| `extra.ts` | 3 | 2 | 0 | `duke-criteria` `jones-criteria` `framingham-hf` `centor-feverpain` `nyha` |
| `gi-neuro-psych.ts` | 2 | 7 | 0 | `nihss` `ciwa` `child-pugh` `glasgow-blatchford` `rockall` `bisap` `phq9` `gad7` `cage` |
| `missing-cardio-pulm.ts` | 0 | 5 | 0 | `rcri` `smart-cop` `edacs` `sgarbossa` `duke-treadmill` |
| `missing-emergency.ts` | 0 | 8 | 2 | `sf-syncope` `canadian-syncope` `hestia-pe` `ottawa-foot` `nexus-chest` `lemon-airway` `baux-score` `absi-burn` |
| `missing-gi-liver.ts` | 1 | 6 | 1 | `atlanta-pancreatitis` `aims65` `kings-college` `air-appendicitis` `ripasa` `nafld-fibrosis` `glasgow-imrie` |
| `missing-heme-id-nephro.ts` | 2 | 4 | 0 | `isth-dic` `pediatric-ews` `kdigo-aki` `mascc` `rochester-criteria` `hemorr2hages` |
| `missing-neuro-psych.ts` | 1 | 8 | 1 | `mini-cog` `rass` `cows` `four-score` `phq2` `audit-c` `cssrs-screen` `mdq` `aspects` |
| `missing-peds-ob-tox.ts` | 0 | 2 | 2 | `finnegan` `step-by-step-fever` |
| `wave2-cardiology.ts` | 1 | 5 | 0 | `euroscore-ii-simp` `heart-pathway` `abc-stroke` `abc-bleed` `qt-prolongation-risk` `atria-stroke` |
| `wave2-general-lab.ts` | 0 | 1 | 2 | `cholesterol-goals` |
| `wave2-neuro-psych.ts` | 7 | 9 | 0 | `clock-draw` `slums` `ham-d` `ham-a` `ymrs` `pcl5` `hoehn-yahr` `hit-6` `midas` `ichd-migraine` `edss-simp` `dn4` `audit-full` `dast-10` `cage-aid` … +1 P1 |
| `wave2-oncology.ts` | 2 | 5 | 0 | `icans-grade` `bclc-hcc` `car-t-crs` `flipi` `ipi-lymphoma` `nccn-distress` `gail-model-simplified` |
| `wave2-ortho-trauma.ts` | 1 | 6 | 0 | `goese` `thompson-test` `gustilo-anderson` `mirels-score` `neer-classification` `pecarn-cervical` `asia-impairment` |
| `wave2-pulm-id.ts` | 1 | 8 | 2 | `lods` `scap-score` `mulbsta` `isaric-4c` `improve-vte` `charlson-comorbidity` `mod-score` `sepsis-3-shock` `drip-score` |
| `wave3-cardio-vasc.ts` | 0 | 8 | 1 | `scai-shock` `intermacs` `cardshock` `precise-dapt` `hcm-risk-scd` `wellens-helper` `right-heart-strain` `bova` |
| `wave3-em-surgery.ts` | 0 | 12 | 0 | `upper-gi-bleed-abc` `strangulation-sbo` `marshall-organ` `manheim-peritonitis` `boey-score` `posum-simp` `acs-nsqip-simp` `asa-physical` … +4 P1 |
| `wave3-gi-hep.ts` | 2 | 5 | 0 | `clif-sofa` `determinant-based` `pned` `pas` `tokyo-cholangitis` `tokyo-cholecystitis` `gerd-q` |
| `wave3-nephro-icu.ts` | 1 | 6 | 1 | `vexus` `akin-aki` `renal-angina` `furosemide-stress` `fena-diuretic` `ivc-collapsibility` `passive-leg-raise` |
| `wave3-peds-ob.ts` | 3 | 12 | 3 | `new-ballard` `bedsides-pews` `pas-asthma` `nips` `npass` `downs-score` `bronchiolitis-severity` `asthma-exacerbation-peds` `snappe-ii` `kdigo-peds-aki` `pecarn-abd` … +4 P1 |
| `wave3-tox-endo-heme.ts` | 2 | 3 | 3 | `serotonin-syndrome` `tirads` `nms-criteria` `thyroid-storm-burch` `myxedema` |
| `wave4-em-id.ts` | 2 | 9 | 2 | `boston-syncope` `stemi-equivalent` `primary-care-rule-dvt` `vte-bleed` `egsys` `oesil-score` `vienna-prediction` `feverpain-score` `ottawa-sah-rule` `de-winter` … +1 P1 |
| `wave4-formulas.ts` | 0 | 1 | 1 | `lund-browder` |
| `wave4-heme-onc.ts` | 1 | 14 | 2 | `basdai` `r-ipi` `cns-ipi` `dipss` `dipss-plus` `durie-salmon` `cll-binet` `cll-ipi` `pit-tcell` … +6 P1 |
| `wave4-icu-vent.ts` | 4 | 2 | 1 | `nursing-delirium` `delirium-icdsc` `braden-scale` `waterlow-scale` `norton-scale` `must-score` |
| `wave4-neuro-psych.ts` | 3 | 7 | 2 | `race-scale` `c-stat` `brief-confusion` `laps-score` `fast-ed` `spot-sign` `4at` `ad8` `pc-ptsd` `ort` |
| `wave4-primary-endo.ts` | 0 | 3 | 0 | `ada-diabetes-risk` `findrisc` `nida-quick` |
| `wave5-cardio.ts` | 1 | 4 | 1 | `arvc-taskforce` `ehra-score` `schwartz-lqts` `glasgow-aneurysm` `warfarin-inr-goal` |
| `wave5-general-misc.ts` | 1 | 4 | 0 | `mases` `asdas-crp` `dapsa` `gout-classification` `scorten` |
| `wave5-nephro-gi.ts` | 1 | 3 | 0 | `ses-cd` `partial-mayo` `harvey-bradshaw` `ibs-sss` |
| `wave5-peds-id.ts` | 2 | 9 | 1 | `pulmonary-score` `exchange-transfusion-threshold` `peews-full` `phototherapy-threshold` `malaria-severity` `pims-ts` `pneumonia-peds` `glasgow-meningococcal` `petechiae-risk` `failure-to-thrive` … +1 P1 |
| `wave5-surg-uro-ent.ts` | 2 | 9 | 1 | `p-possum` `aap-score` `sort-score` `nela-risk` `gupta-mica` `ariscat` `rogers-score` `nnis-ssi` `wses` `ipss-prostate` … +1 P1 |
| `wave5-tox-psych.ts` | 0 | 4 | 2 | `snakebite-severity` `anaphylaxis-criteria` `sheehan` `needle-stick-pep` |
| `wave6-clinical-residual.ts` | 1 | 7 | 0 | `ata-nodule` `graves-cas` `ranson-full` `ascites-grade` `variceal-bleed-risk` `aki-cause` `smoke-inhalation` `beta-blocker-tox` |
| `wave6-em-peds.ts` | 3 | 4 | 1 | `psofa-simp` `phoenix-sepsis-simp` `biophysical-profile` `neonatal-los-checklist` `pph-class` `pfapa` `hsp-criteria` |
| `wave6-formulas-misc.ts` | 0 | 2 | 4 | `tdee-harris` `bmr-katch-mcardle` |
| `wave6-heme-onc.ts` | 2 | 7 | 2 | `sic-score` `jaam-dic` `hep-score` `riete-bleed` `fn-pathway` `cat-score` `tls-cairo` `tumor-lysis-clinical` `neutropenic-colitis` |
| `wave6-psych-sleep.ts` | 2 | 6 | 2 | `barthel-index` `saps-iii-simp` `oasis-score` `peg-pain` `nose-scale` `eat-26` `twist-score` `chokai-score` |
| `wave6-scores-residual.ts` | 2 | 5 | 1 | `frailty-clinical` `fried-frailty` `berlin-sleep` `gina-control` `elixhauser-simp` `morse-fall` `hendrich-fall` |
| `wave7-bedside.ts` | 1 | 3 | 4 | `duke-iscvid-2023` `hfa-peff` `helps2b` `masld-criteria` |
| `wave7-fillins.ts` | 0 | 5 | 1 | `ain-risk` `maps-mayo` `improve-dd` `ranson-pancreatitis` `saps-3` |
| `wave7-highuse.ts` | 1 | 5 | 2 | `isth-ssc-bat` `pram` `seattle-hf` `maggic-hf` `tmacs` `syntax-score` |
| `wave7-prevention.ts` | 0 | 1 | 0 | `qrisk3` |
| `wave7-rheum-activity.ts` | 3 | 10 | 1 | `essdai` `bilag-2004-index` `basmi` `slicc-sdi` `sle-das` `lldas` `doris-remission` `bvas-v3` `vdi-vasculitis` `ffs-2011` `mrss` … +2 P1 |
| `wave7-rheum-class.ts` | 0 | 16 | 0 | `acr-eular-ra-2010` `eular-acr-sle-2019` `acr-eular-sjogren-2016` `acr-eular-ssc-2013` `acr-eular-pmr-2012` `acr-eular-egpa-2022` `acr-eular-gca-2022` `acr-eular-tak-2022` … +8 P1 |

---

## 13. Already clear (no change) and skipped formulas

**295 clear** — self-explanatory cutoffs, already-anchored options, or correctly total-only copyrighted instruments. IDs in JSON `clear`.

**303 skipped** — pure formulas (eGFR, anion gap, conversions, vent math). IDs in JSON `skipped_formula`.

Do not spend implementation time here unless you notice a genuinely ambiguous unit or label while in the file.

---

## 14. PR checklist for the implementing agent

- [ ] Official source opened (PMID / society PDF) and wording checked against `suggested_change`
- [ ] Only `label` / `helpText` / `option.description` / `pearls` edited
- [ ] `calculate()`, option `value`s, defaults, risk bands untouched
- [ ] No new scored UN/NT option
- [ ] Copyrighted instruments not reprinted
- [ ] A naive user can administer the item from the UI
- [ ] `npx vitest run` green, including NIHSS oracles if `nihss` was touched
- [ ] PR description lists calculator IDs and sources

---

## 15. What this audit is not

- Not a claim that current **scores are wrong**.
- Not a request to add missing calculators (see `CALCULATOR_GAP_LIST.md`).
- Not a request to restyle the form chrome.
- Not a PMID / evidence-link audit (see `scripts/audit-evidence/`).

---

*Generated 2026-09-11 from 25-agent scoring-clarity review of `main`. Raw batch notes are not checked in; this file + the JSON companion are the source of truth.*
