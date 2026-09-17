# Production audit — 2026-09-17

Scope: all 1,004 calculators in `src/data/calculators/` (48 modules), engine (`src/utils/`), UI, CI/deploy. Calculator-module coverage is now **complete** (two passes — see Coverage). Prior passes live in `CALCULATOR_AUDIT.md`.

## Gates verified green (this session)

- `npm test` — 54 files / 435 tests pass
- `tsc -b` — clean; `oxlint --deny-warnings` — 0 findings
- `npm run check:citations` — 1,200 references, 0 structural problems
- Mechanical sweep (temp harness, since removed): brute-forced every calculator over all categorical option combos + numeric min/mid/max within allowed ranges — **0 throws, 0 NaN/Infinity leaks, 0 undeclared `values.*` reads, 0 min>max, 0 malformed pmid/doi/url**. String scores (`'—'`, `'Not applicable'`) verified as intentional edge-state convention, not defects.
- Reference `url` domains all reputable (WHO, CDC, KDIGO, NICE, DailyMed, ACR, ESC, etc.).

## Findings

### Major

| ID | File | Issue | Fix |
|---|---|---|---|
| `csdd` (Cornell Scale for Depression in Dementia) | wave4-neuro-psych.ts:2428–2437 | Band labeled "Definite/severe depression" fires at score ≥12 with "active pharmacotherapy required"; published cutoffs are >10 probable major depression, >18 definite. Scores 12–18 are over-labeled. | Reband (e.g., ≤5 none / 6–10 borderline / 11–18 probable / >18 definite) or relabel the ≥12 tier and soften the recommendation. |

### Minor (helpText/copy states a different coefficient or threshold than the — correct — compute path)

| ID | File:line | Issue | Fix |
|---|---|---|---|
| `hasford` | wave4-heme-onc.ts:461 | helpText claims age term is `0.666 × (age − 43) over 50`; actual is a 0.6666 indicator at ≥50 | Fix helpText |
| `hasford` | wave4-heme-onc.ts:463 | helpText says `0.042 × blasts`; published coefficient is 0.0584 (0.042 is the spleen coefficient) | Fix helpText |
| `hasford` | wave4-heme-onc.ts:464 | helpText says `0.058 × eosinophils`; published is 0.0413 | Fix helpText |
| `hasford` | wave4-heme-onc.ts:466 | helpText claims platelet term is "negative below 1500"; it is 0 below, +1.0956 at ≥1500 | Fix helpText |
| `sokal` | wave4-heme-onc.ts:373 | helpText says age term is `(age/10)²`; actual is 0.0116×(age−43.4) | Fix helpText |
| `sokal` | wave4-heme-onc.ts:383 | helpText says blast term `(blasts/5)²`; actual is 0.0887×(blasts−2.10) | Fix helpText |
| `dipss` (IWG-MRT symptoms) | wave4-heme-onc.ts:201 | helpText says weight loss >10% "in the past year"; definition uses last 6 months | Fix helpText |
| `iqcode` | wave4-neuro-psych.ts:2041 | nextSteps condition "≥3.38" mismatches computed screen-positive band (>3.3); scores 3.31–3.37 label positive but never match the card | Align condition to >3.3 |
| `riete` | wave4-em-id.ts:391 | Band labeled "1.5–4" but score 1.0 is reachable and lands in it | Relabel "1–4" |
| `grace` | cardiology.ts:345 | Age helpText cites GRACE 2.0 regression coefficient (0.2×age); calculator uses the point table | Reword to point bands |
| `padua` | emergency-misc.ts:903 | helpText calls the 2-pt trauma item "the largest single Padua item"; four items score 3 | Remove claim |
| `westley-croup` | emergency-misc.ts:690–693 | No "impending respiratory failure" tier; published schemes flag ≥12 | Add critical band ≥12 |
| `phenytoin-corrected` | emergency-misc.ts:1358 | helpText garbled: "0.1 binding term drops to 0.1 or less" — should say coefficient drops 0.2→0.1 in ESRD | Reword |
| `hamwi` | extra.ts:530 | Female helpText says "+2.2 kg per inch"; Hamwi is 100 lb + 5 lb/in ≈ 2.3 kg/in | Change to 2.3 |
| `ottawa-knee` | emergency-misc.ts:119 | `whenToUse` is only "Acute knee injury." (18 chars) | Expand copy |

### Registry/structural

| ID(s) | Issue | Fix |
|---|---|---|
| `age-adjust-ddimer` (wave4-em-id.ts:1390) vs `age-adjusted-ddimer` (wave7-bedside.ts:1651) | **True duplicate** — same instrument (age×10 FEU cutoff) registered twice under different ids and categories | Keep one (wave7 version is richer), delete the other, redirect inbound references |
| 174 calculators | Have no `exampleValue` on any input — the always-rendered "Load example" button fills nothing (dead button) | Either hide the button when no examples exist, or backfill exampleValue (list in sweep output; biggest groups: qsofa, sirs, curb65, psi-port, canadian-ct-head, PECARN-*, ortho classifications, tox nomograms) |
| 10 shortname collisions | Distinct tools sharing an abbreviation: MELD 3.0 ×2, FeverPAIN ×2, Expected PaO₂ ×2, ABSI ×2, ISS ×2, BAI ×2, SCORE2 ×2, Reynolds ×2, PAS ×2, DASH ×2 — search results are ambiguous | Disambiguate shortNames (e.g., "ISS (trauma)" vs "ISS (myeloma)") — adjudication of each pair pending (consistency agent did not finish) |

### Verified non-issues (checked, no change needed)

- `bohr-dead-space` reference year 1891 — legitimate historical citation (Bohr, *Über die Lungenathmung*).
- `peld-score` `minZ` min −10 — legitimate z-score bound.
- `asas-axspa` "constant result" — harness sampling artifact; all-true → "Both arms", all-false → "Not classified".
- `diagnostic-or` "undefined" flag — the word appears in legitimate copy.
- MDRD race factor, `score2-op` HDL imputation, `opioid-mme` CDC 2022 factors, `edacs` item set — per CALCULATOR_AUDIT.md pass 5/6; MDRD/edacs confirmed correct again this pass.

## Coverage

**Audited (agent-verified vs literature):**
- Pass 1: cardiology.ts, critical-care.ts, extra.ts, nephrology-endo.ts, emergency-misc.ts, wave4-heme-onc.ts, wave4-neuro-psych.ts, wave4-em-id.ts — 8 modules, ~180 calculators.
- Pass 2 (19-agent swarm + consistency agent): gi-neuro-psych.ts, missing-cardio-pulm.ts, missing-emergency.ts, missing-gi-liver.ts, missing-heme-id-nephro.ts, missing-neuro-psych.ts, missing-peds-ob-tox.ts, all six wave2-*, all six wave3-*, wave4-formulas.ts, wave4-icu-vent.ts, wave4-primary-endo.ts, all six wave5-*, all six wave6-*, all six wave7-* — 40 modules, ~850 calculators, plus the full cross-module duplicate/consistency sweep.

**All 48 calculator modules now audited (~1,004 calculators).** Remaining open item: engine/UI deep review (`helpers.ts`, `units.ts`, `App.tsx`, `pages/`) — mechanical properties already verified via sweep.

## Findings — pass 2 (40 modules)

### Major

| ID | SEVERITY | file:LINE | issue | fix |
|---|---|---|---|---|
| `same-tt2r2` | MAJOR | missing-cardio-pulm.ts:669 | "Medical history" criterion coded ≥2 comorbidities; published Apostolakis 2013 is >2 (≥3). Exactly-2 patients over-scored +1, can flip the >2 poor-TTR threshold | Change label/helpText/formula to ">2 (three or more) of …" |
| `asrs-adhd` | MAJOR | wave2-neuro-psych.ts:2764–2772 | Shaded-box rule REVERSED vs official ASRS-v1.1: code counts q1–3 positive at ≥"Often" (≥3) and q4–6 at ≥"Sometimes" (≥2); official is the opposite. Wrong rule repeated in option descriptions, helpTexts, details, evidence | Swap thresholds (q1–3 ≥2, q4–6 ≥3) and correct all copy |
| `slums` | MAJOR | wave2-neuro-psych.ts:1084–1089 | Item 4 substitutes a non-standard serial-$3 task for the official SLUMS $100 apples/tricycle calculation item (1 pt spent / 2 pts left, max 3) | Replace with official item |
| `lods` | MAJOR | wave2-pulm-id.ts:1322–1327 | Renal urea bands wrong vs LODS Table 1: official 6–9.9=1 / 10–19.9=3 / ≥20=5; app gives 6–19.9=1, 20–39.9=3, and an invented ≥40=5 tier — under-scores 10–39.9 by 2 pts | Remap option bands to published table |
| `ett-depth` | MAJOR | wave5-peds-id.ts:534 | Infant weight-based oral ETT depth uses wt/2+6 — matches no published rule, underestimates ~1.5–2 cm (Tochen "wt+6" 7-8-9 rule, or published wt/2+8) | Change to wt+6 (or wt/2+8); fix helpText :520 and evidence :565 |
| `vexus` | MAJOR | wave3-nephro-icu.ts:1529–1531 | Dilated IVC (≥2 cm) + all-normal waveforms returns "VExUS 0"; published protocol assigns Grade 1 for IVC ≥2 cm with normal/mild waveforms | severeCount 0 with dilated IVC → grade 1 |
| `bvas-v3` | MAJOR | wave7-rheum-activity.ts:1291 | "General (max 7)" wrong — official BVAS v3 general-system ceiling is 3 (new/worse); helpText item weights also wrong | Set max 3; fix helpText weights |
| `bvas-v3` | MAJOR | wave7-rheum-activity.ts:1297 | "Abdominal (max 6)" too low — official new/worse max is 9 (peritonitis 9, bloody diarrhoea 9) | Set max 9 |
| `vdi-vasculitis` | MAJOR | wave7-rheum-activity.ts:1390–1400 | Domain caps don't match official 64-item VDI counts (MSK 3 vs 5, ocular 3 vs 7, ENT 3 vs 6, pulmonary 4 vs 7, cardiac 4 vs 7, peripheral vascular 4 vs 8, GI 2 vs 4, neuropsych 4 vs 8, other 3 vs 6; renal cap 4 exceeds 3 real items) — tool max 37 vs true 64, under-scores damage | Align each cap to official item count |
| `benzo-dose-equiv` | MAJOR | wave6-psych-sleep.ts:1716 | Triazolam factor 0.125 mg ≈ 10 mg diazepam is 2–4× too potent vs Ashton/VA-DoD tables (0.25–0.5 mg); evidence text :1766 encodes same wrong factor — taper conversions overestimate diazepam equivalents up to 4× | Set factor to 0.25–0.5; fix evidence summary |
| `bedsides-pews` | MAJOR | wave3-peds-ob.ts:430–434 | O₂-therapy subscores coded 0/1/2; official Parshuram Bedside PEWS assigns 0/2/4 — under-scores every child on ≥4 L/min by 2 pts (code maxes 24 vs claimed 0–26) | Option values 0/2/4; drop the `o2Raw>=3 ? 2` clamp |
| `acr-eular-aps-2023` | MAJOR | wave7-rheum-class.ts:185 | Fabricated "High-risk thrombophilia + VTE" (4 pts) option — published D1 has only VTE+high-risk-profile=1 / VTE without=3; thrombophilia-associated VTE belongs to the high-risk profile (scores 1) | Remove option / fold into high-risk-profile description scoring 1 |
| `acr-eular-aps-2023` | MAJOR | wave7-rheum-class.ts:201 | "Placental insufficiency with severe features" scored 2; published "PEC severe OR PI severe <34 wk" = 3 — no standalone 2-pt PI item | Score 3 |
| `acr-eular-aps-2023` | MAJOR | wave7-rheum-class.ts:197–204 | "Fetal death ≥16 wk" scored 4; published fetal death 16w0d–33w6d without severe PEC/PI = 1; the real 4-pt item (severe PEC AND severe PI <34 wk ± fetal death) is missing | Re-point to 1, bound <34 wk, add combined PEC+PI = 4 option |
| `p-possum` | MAJOR | wave5-surg-uro-ent.ts:244–248 | "Number of procedures" mapped 1/2/4 operative points; Copeland POSSUM assigns 1/4/8 — under-scores OS by 2–4, underestimating P-POSSUM mortality | Change option values to 1/4/8 |
| `ado-index` | MAJOR | wave6-scores-residual.ts:2875 | Point weights match NEITHER updated ADO (Puhan 2012) NOR original: age uses 2009 table (0–5) not updated (0–7); mMRC over-weights (1-2→1, 3→2, 4→3 is correct mapping); FEV1 0–6 scale vs updated 0–4 with shifted boundaries | Re-map to published updated ADO (0–14) |
| `leibovich-2018` | MODERATE | wave7-highuse.ts:1702 | Labeled "2018" but implements an invented integer variant — real 2018 Leibovich is a 9-factor Cox model with no integer groups; its points also deviate from classic 2003 (necrosis +2 vs +1; pT3c/pT4 +6 vs +4) while borrowing the 0–2/3–5/≥6 bands validated on 2003 points — can shift risk group | Implement documented 2003 points and relabel "classic", or rename as non-source-claimed approximation |
| `anaphylaxis-criteria` | MAJOR | wave5-tox-psych.ts:1929 | Criterion 2 omits the acute-onset/"rapidly after exposure" requirement — `likely && domains>=2` can fire on non-acute symptoms | Add an acute-onset input to the c2 conjunction |
| `gestational-htn` | MAJOR | wave3-peds-ob.ts:2694–2702 | Severe-range BP + chronic HTN falls into "Chronic hypertension" at 'moderate' with no urgent-treatment message — severe-range BP needs acute treatment regardless of classification (non-chronic severe path correctly fires urgent branch) | Surface urgent-treatment message in chronic branch when severeBp |

### Minor (pass 2)

| ID | SEVERITY | file:LINE | issue | fix |
|---|---|---|---|---|
| `steroid-hyperglycemia` | MINOR | wave4-primary-endo.ts:946 | Dex factor 6.25 vs option description's implied 6.67 ("0.75 mg dex ≈ 5 mg pred") — internally inconsistent | Use 6.67 or fix description |
| `pth-interpretation` | MINOR | wave4-primary-endo.ts:1287 | Label "euthyroid-Ca pattern" — thyroid term on a calcium tool | "normocalcemic/eucalcemic pattern" |
| `hypoglycemia-level` | MINOR | wave4-primary-endo.ts:441 | pointsYes=1 badge; score is a categorical ADA level, nothing summed | pointsYes 0/null |
| `nida-quick` | MINOR | wave4-primary-endo.ts:2048 | Tobacco select defaults to 4 "Daily" — pre-selects a positive screen (other domains default 0) | Default 0 |
| `child-bmi-percentile` | MINOR | wave4-primary-endo.ts:1818 | "Severe obesity (≥99th)" vs CDC ≥120% of 95th pct or BMI ≥35 | Reword label or gate on % of 95th |
| `oxygen-content` | MINOR | wave4-icu-vent.ts:18 | helpText "0.003 × PaO₂"; compute uses 0.0031 | Align helpText |
| `salt-triage` | MINOR | wave4-icu-vent.ts:1535 | +1 badge on documentation-only checkbox (SALT not point-scored) | pointsYes 0/null |
| `oxygen-extraction` | MINOR | wave4-icu-vent.ts:238 | "Typical" band 15–30% but text says "~20–30%" | Adjust text or band |
| `waterlow-scale` | MINOR | wave4-icu-vent.ts:2288 | Neurological deficit collapses official 4–6 range to 5/6; mild (4) over-scored | Add a 4-pt option |
| `same-tt2r2` | MINOR | missing-cardio-pulm.ts:672 | race helpText lists "age >60" among 1-pt items; scored item is "Age <60" | Fix copy |
| `edacs` | MINOR | missing-cardio-pulm.ts:511 vs :536 | riskCad shows +4 badge; published EDACS only scores it at age 18–50 (compute correctly gates) | Disclose "(scores only at 18–50)" |
| `shock-index-age` | MINOR | missing-cardio-pulm.ts:1144 | age<18 branch unreachable (input min 18) — dead code | Remove |
| `vbac-success` | MINOR | missing-peds-ob-tox.ts:267 | helpText claims "+0.039/yr" age coefficient; implemented (correct) coefficient is −0.039 | Fix sign in copy |
| `hellp` | MINOR | missing-peds-ob-tox.ts:543 | Ref author "Sibai BM"; actual paper is Barton JR, Sibai BM (Clin Perinatol 2004) — pmid/doi correct | Fix author list |
| `hellp` | MINOR | missing-peds-ob-tox.ts:488 | Thrombocytopenia criterion `plt <= 100`; published Tennessee is <100 | Strict < or document |
| `mag-toxicity` | MINOR | missing-peds-ob-tox.ts:594–601 | Band 8.4–12 labeled "Loss of DTRs" but own text cites ~9–12 | Start band ~9 or soften label |
| `pregnancy-dating` | MINOR | missing-peds-ob-tox.ts:1311 | `new Date()` silently rolls invalid dates (Feb 31 → Mar 3) | Validate day-of-month |
| `ideal-body-weight-peds` | MINOR | missing-peds-ob-tox.ts:1365 | Height min 50 cm admits infants where Traub-Johnson isn't validated | Raise min or add in-band warning |
| `rumack-matthew-time` | MINOR | missing-peds-ob-tox.ts:762 | `t < 4` branch unreachable (min 4) — dead code | Remove |
| `sipa` | MINOR | missing-peds-ob-tox.ts:40 | Handles band '13-17' not among select options — dead code | Remove |
| `cam-icu` | MINOR | missing-neuro-psych.ts:1224–1251 | All four feature inputs show +1 badges; score is Boolean AND/OR logic, not additive | pointsYes null |
| `sad-persons` | MINOR | missing-neuro-psych.ts:1096 | Ref title paraphrase; actual "Evaluation of suicidal patients: the SAD PERSONS scale" (pmid/doi correct) | Fix title |
| `mrs` | MINOR | missing-neuro-psych.ts:524–529 | Band labeled "Independent (mRS 0–2)" only ever shows for 1–2 (0 captured by earlier band) | Relabel or keep (conventional name) |
| `slums` | MINOR | wave2-neuro-psych.ts:1104–1108 | Digits-backward uses nonstandard series (642/8537 vs official 87/649/8537); item renumbering vs official form; unscored registration step omitted | Align with official form |
| `slums` | MINOR | wave2-neuro-psych.ts:1089 | helpText says "Serial 7s from 100" but displayed values are serial 3s | Fix wording |
| `madrs` | MINOR | wave2-neuro-psych.ts:1387 | Item-5 option label has duplicated word ("or persuasion or persuasion") | Fix label |
| `madrs` | MINOR | wave2-neuro-psych.ts:1543–1547 | TJC "Standards FAQ (updated 2026)" URL ends .../000001234 — looks placeholder; unverifiable | Verify or replace citation |
| `ichd-migraine` | MINOR | wave2-neuro-psych.ts:252–253 | +1 badges on D1/D2 imply additive points; D group counted once | Reflect group contribution |
| `cdi-severity` | MINOR | wave2-pulm-id.ts:1521 | age helpText claims it changes severity tier; calculate() never uses it | Fix helpText (context-only) |
| `cdi-severity` | MINOR | wave2-pulm-id.ts:1524–1526 | hypotension/ileus/megacolon show +2 badges; score is categorical | pointsYes null |
| `original-geneva` | MINOR | wave2-pulm-id.ts:969 | PaO₂ helpText omits the +3 (49–59.9) and +4 (<49) bands that exist in options | Extend helpText |
| `hall-criteria` | MINOR | wave2-pulm-id.ts:166 | id is 'hall-criteria' but instrument is Halm (name/tags/evidence all say Halm) | Rename id to halm-criteria |
| `kocher-criteria` | MINOR | wave2-ortho-trauma.ts:238–262 | Interpretations render "(~~3%)" — double tilde (probs already contain '~') | Remove extra '~' |
| `neer-classification` | MINOR | wave2-ortho-trauma.ts:876–882 | "4-part" option described as "three segments displaced"; classic 4-part = all four displaced | Fix description |
| `euroscore-ii-simp` | MINOR | wave2-cardiology.ts:1861 | PASP "≥55" severe vs official ">55" (boundary off by 1) | Relabel bands 31–55 / >55 |
| `heart-pathway` | MINOR | wave2-cardiology.ts:24 | ST-deviation option asserts mm cutoff + confusing TIMI aside; HEART defines it without fixed mm | Reword description |
| `adhere-hf` | MINOR | wave2-cardiology.ts:172 | Interpretation "~5–6%" vs detail "~6.4%" — inconsistent | Align to ~6.4% |
| `icans-grade` | MINOR | wave2-oncology.ts:195 | helpText says deep focal motor weakness "is a grade 3 feature"; ASTCT assigns grade 4 (value correctly 4) | Fix helpText |
| `milan-criteria` | MINOR | wave2-oncology.ts:960–961 | 'vascular'/'extrahepatic' show −1 badges on exclusion gates | pointsYes null |
| `milan-criteria` | MINOR | wave2-oncology.ts:998 | 'count' ignored when pattern='single' — contradictory inputs can report "Within Milan" for multiple tumors | Treat count>1 as multi or warn |
| `okuda` | MINOR | wave2-oncology.ts:673–674 | Boundaries ≤3 albumin / ≥3 bili vs published <3 / >3 | Strict bounds or note |
| `recist` | MINOR | wave2-oncology.ts:1081–1082 | +1 badges on categorical CR/PR/SD/PD result | pointsYes null |
| `car-t-crs` | MINOR | wave2-oncology.ts:15–18 | fever +1 badge; fever is a grade floor, not additive | pointsYes null |
| `free-water-clearance` | MINOR | wave2-general-lab.ts:1276 | Garbled rhetorical question in interpretation copy | Reword |
| `hba1c-ifcc` | MINOR | wave2-general-lab.ts:541–547 | Input min 1 allows NGSP <2.15 → negative IFCC output | Raise min ~3 |
| `upper-gi-bleed-abc` | MINOR | wave3-em-surgery.ts:229 | Copy says "in-hospital mortality"; ABC predicts 30-day mortality | Reword |
| `strangulation-sbo` | MINOR | wave3-em-surgery.ts:451 | helpText contains leftover editorial note "(pick one threshold; drop the 10–12k span)" | Remove |
| `dangerous-mechanism` | MINOR | wave3-em-surgery.ts:1774–1775 | +1 badges on elderly/anticoag; their contribution is capped/non-additive | pointsYes null |
| `apfel-ponv` | MINOR | wave3-em-surgery.ts:1183 | "Consider 1–2 interventions" covers score 0 (~10% risk); guidelines give 0–1 factors little/no prophylaxis | Split band 0 vs 1 |
| `fena-diuretic` | MINOR | wave3-nephro-icu.ts:826 | Ref title paraphrase (actual: "Significance of the fractional excretion of urea…") | Fix title |
| `crusade` | MINOR | wave3-cardio-vasc.ts:344–346 | sex select shows no points; Female contributes +8 (helpText says so) | Add points 0/8 to options |
| `wellens-helper` | MINOR | wave3-cardio-vasc.ts:972–973 | patternA+patternB show +4 badges; compute adds +2 once if either | Single 3-way select |
| `digoxin-fab` | MINOR | wave3-tox-endo-heme.ts:443 | Ref title paraphrase; actual is the Antman 1990 multicenter final report (pmid/doi correct) | Use full title |
| `digoxin-fab` | MINOR | wave3-tox-endo-heme.ts:371–380 | level/weight/amountMg all required regardless of estimation method — empiric dosing forced to enter a level | required:false on non-method inputs |
| `serotonin-syndrome` | MINOR | wave3-tox-endo-heme.ts:727–736 | +1 badges on all Hunter items; Hunter is boolean decision-tree logic | pointsYes null |
| `abic-score` | MINOR | wave3-gi-hep.ts:572 | helpText says INR ×0.66; actual coefficient is 0.8 | Fix helpText |
| `harmless-ap` | MINOR | wave3-gi-hep.ts:866 | Hct ≥43/≥39.6 vs Lankisch >43/>39.6 (boundary) | Strict > |
| `asthma-exacerbation-peds` | MINOR | wave3-peds-ob.ts:1886 | SpO₂ <90% maps to "Severe"; GINA/NAEPP list <90% among life-threatening features | Include in critical gate or document |
| `npass` | MINOR | wave3-peds-ob.ts:767 | helpText instructs "+1 if <30 wk corrected" but no GA input exists to apply it | Add GA input or drop instruction |
| `incomplete-kawasaki` | MINOR | wave3-peds-ob.ts:2235–2243 | Inconsistent +1 badges on supplemental labs (some +1, some none) though all count equally | Align badges |
| `philadelphia-criteria`, `boston-criteria`, `pecarn-fever` | MINOR | wave3-peds-ob.ts:2020–2153 | +1 badges on gate items whose output is a string label | pointsYes null |
| `osmolarity-iv-fluid` | MINOR | wave6-formulas-misc.ts:1049 | K helpText implies 2 mOsm/mEq (K+anion); compute counts K once — anion only via Cl input | Clarify helpText |
| `glasgow-blatchford` | MINOR | gi-neuro-psych.ts:394–396 | Score 4–5 labeled "Higher risk" but riskLevel 'moderate' (high only ≥6) | Align label/level |
| `ciwa` | MINOR | gi-neuro-psych.ts:1184 vs :1197 | Mild band says "CIWA ≤8" while nextSteps trigger at "≥8–10" — boundary-8 contradiction | Make mild band <8 |
| `maddrey-df` | MINOR | missing-gi-liver.ts:34–39 | DF <32 returns 'moderate'; low DF is low-risk | 'low'/'info' |
| `kings-college` | MINOR | missing-gi-liver.ts:329–337 | Only 'ph' gate shows +1 badge; sibling gates suppress badges — inconsistent | null like the rest |
| `forrest-classification` | MINOR | missing-gi-liver.ts:579 | Ia rebleed "~55%" understates commonly cited ~90% for untreated spurting | Revise figure or cite range |
| `atlanta-pancreatitis` | MINOR | missing-gi-liver.ts:655–656 | Transient <48h / persistent ≥48h vs published ≤48h / >48h | Fix bounds |
| `kfre-8` | MINOR | wave7-fillins.ts:69 | Albumin coefficient −0.3444; reference implementations use −0.3441 (LP effect <0.001) | Fix constant |
| `improve-dd` | MINOR | wave7-fillins.ts:513 | Age scored ≥60; published IMPROVEDD uses >60 | Fix bound |
| `gap-gap` | MINOR | missing-heme-id-nephro.ts:717 | Stray section comment "// ─── 8. Revised Baux ───" above Delta Gap | Remove/rename comment |
| `gap-gap` | MINOR | missing-heme-id-nephro.ts:788 | Ref title paraphrase (actual: "The delta (Δ) gap: An approach to mixed acid-base disorders") | Fix title |
| `mascc` | MINOR | missing-heme-id-nephro.ts:355 | Label "fever ≥38.0 + ANC <1000" vs helpText ≥38.3/ANC <500 definitions | Harmonize |
| `absi-burn` | MINOR | missing-emergency.ts:1260 | TBSA 0 → 0 pts; published table assigns 1 pt to 1–10% (0% out of scope anyway) | Floor at 1 when tbsa ≥1, or document |
| `acetaminophen-dose-toxicity` | MINOR | wave5-tox-psych.ts:27–30 | 'child' age_group claims raised threshold but compute applies identical bands — effectively non-functional input | Apply child threshold or fix copy |
| `co-oximetry` | MINOR | wave5-tox-psych.ts:912–917 | " + high-risk features" appended to label even when no escalation fired | Conditional append |
| `anaphylaxis-criteria` | MINOR | wave5-tox-psych.ts:1902 | Tag typo 'fa an' | 'faan' |
| `valproate-level` | MINOR | wave5-tox-psych.ts:513–516 | One reference merges Sztajnkrycer + EXTRIP under Sztajnkrycer's pmid/doi | Split references |
| `theophylline-level` | MINOR | wave5-tox-psych.ts:715–719 | Same blend — Shannon 1999 + EXTRIP under one ref | Split |
| `methotrexate-toxicity` | MINOR | wave5-tox-psych.ts:838–843 | Ref title paraphrase (actual: Ramsey 2018 glucarpidase consensus); citation blends FDA labeling | Fix title/split |
| `phq-a` | MINOR | wave5-tox-psych.ts:2317 | ≥10 sens/spec attributed to Johnson 2002; figures are Richardson 2010 at cutoff ≥11 | Correct stats or cite Richardson |
| `sheehan` | MINOR | wave5-tox-psych.ts:2495–2519 | Total-score severity bands are invented (SDS has no canonical total bands) | Label as educational |
| `di-diagnosis` | MINOR | wave6-clinical-residual.ts:1213 | lithium badge 1 vs +2 actual contribution | Badge 2 |
| `di-diagnosis` | MINOR | wave6-clinical-residual.ts:1214 | psych badge 1 vs +2 actual | Badge 2 |
| `expanded-baveno` | MINOR | wave6-clinical-residual.ts:35 | 'compensated' gate shows +1 badge, never summed | pointsYes null |
| `dka-resolution` | MINOR | wave6-clinical-residual.ts:1612–1613 | ableEat/sqOverlap +1 badges; output is Resolved/Not resolved | pointsYes 0 |
| `water-deprivation` | MINOR | wave6-clinical-residual.ts:1087–1091 | Ref title mismatch — pmid/doi resolve to Garrahy/Christ-Crain "Diagnosis and management of central DI in adults"; citation blends Miller protocol | Retitle |
| `aki-cause` | MINOR | wave6-clinical-residual.ts:773–779 | One ref merges Bellomo Lancet 2012 + KDIGO guideline | Split |
| `hhs-diagnosis` | MINOR | wave6-clinical-residual.ts:1733 | Uses bicarb ≥15 for HHS; strict ADA/Kitabchi row is >18 (hedged in copy, caveat fires 15–17) | Tighten to >18 if strict adherence wanted |
| `ttn-vs-rds` | MINOR | wave6-em-peds.ts:2365–2366 | grunting/cyanosisO2 badges 0, but both-true adds −1 to diff score | Disclose conditional contribution |
| `ttn-vs-rds` | MINOR | wave6-em-peds.ts:2360–2363 | helpText implies delayed onset favors TTN; compute is onset-neutral | Soften copy |
| `nec-bell-stage` | MINOR | wave6-em-peds.ts:294–295 | +1 badges on items whose output is a Bell-stage string | pointsYes null |
| `hsp-criteria` | MINOR | wave6-em-peds.ts:2780 | 'alternate' badge 0 but calculate() subtracts 3 | Badge −3 or restructure |
| `shock-index-ob` | MINOR | wave6-em-peds.ts:1916–1918 | 'context' input echoed in details only — zero compute effect | Wire into interpretation or note |
| `platelet-threshold` | MINOR | wave6-heme-onc.ts:813–818 | ITP below-threshold copy collides with "avoid prophylactic transfusion" guidance | ITP-specific message |
| `saps-iii-simp` | MINOR | wave6-psych-sleep.ts:3036 | Comorbidities scored via Math.max; official SAPS 3 sums all applicable comorbidities (and admission reasons) | Sum points or relabel as disclosed simplification |
| `saps-iii-simp` | MINOR | wave6-psych-sleep.ts:3015 | Leukocytes labeled "(lowest)"; official Box III uses HIGHEST | Relabel input |
| `panic-pdss` | MINOR | wave6-psych-sleep.ts:181 | Invented 14–16 "Marked" / 17–28 "Severe" split; published anchor is single ≥14 band; remission pearl says ≤3 vs proposed ≤5 | Align bands/pearl |
| `vanderbilt-adhd` | MINOR | wave6-psych-sleep.ts:1331 | 'teacher' informant scored on parent-form performance items; NICHQ teacher form uses different items | Restrict to parent or add teacher items |
| `snot-22` | MINOR | wave6-psych-sleep.ts:3818 | Item-3 "Runny nose" helpText describes item 4 (nasal blockage) | Fix helpText |
| `buprenorphine-cows` | MINOR | wave6-psych-sleep.ts:2022 | >24 all labeled "Severe"; official 25–36 = moderately severe, >36 = severe (own details line states correct bands) | Split top band |
| `ikdc` | MINOR | wave6-scores-residual.ts:1385,1392,1399,1406 | q9f–q9i helpText trailing clauses rotated — each describes a different item's task | Fix 4 clauses |
| `elixhauser-simp` | MINOR | wave6-scores-residual.ts:3502 | Description "(0–31)" but implemented list maxes at 28 | Fix range |
| `ckid-u25` | MINOR | wave7-bedside.ts:97 | sex helpText claims κ 0.34 girls / 0.40 boys — matches neither U25 κ tables nor Schwartz 0.413 | Rewrite helpText |
| `hits-ipv` | MINOR | wave7-highuse.ts:1319 | Cutoff ≥10 vs Sherin 1998 cut score 10.5 (positive >10.5, i.e., ≥11) | Use ≥11 or soften citation note |
| `acr-eular-pmr-2012` | MINOR | wave7-rheum-class.ts:575–576 | US items have null badges but add +1 each on the US algorithm path | Badge 1 with "US only" hint |
| `fautrel-aosd` | MINOR | wave7-rheum-class.ts:1481–1483 | Minor items have null badges yet count toward the minor tally | Align badges |
| `acr-eular-aps-2023` | MINOR | wave7-rheum-class.ts:183 | 'provoked' description lists only transient factors; published high-risk VTE profile includes persistent factors (malignancy, thrombophilia) | Extend description |
| `esspri` | MINOR | wave7-rheum-activity.ts:1681–1684 | Band labeled "acceptable (≤5)"; published PASS cutoff is ESSPRI <5 | Change to <5 |
| `mayo-score-uc` | MINOR | wave5-nephro-gi.ts:1745–1753 | Remission additionally requires bleed=0 (stricter than stated standard); fallback label factually wrong for stool=1+bleed=1 | Relax or fix copy |
| `protein-24h` | MINOR | wave5-nephro-gi.ts:439–466 | All three inputs required regardless of mode — forces dummy values for ignored fields | required:false per mode |
| `p-possum` | MINOR | wave5-surg-uro-ent.ts:204–209 | Urea boundary: code gives 1 pt <7.5, 2 pts "7.5–10"; Copeland assigns 1 pt ≤7.5 | Relabel ≤7.5 / 7.6–10 |
| `gleason-grade-group` | MINOR | wave5-surg-uro-ent.ts:2692–2695 | Tertiary pattern 5 doesn't upgrade displayed GG on biopsy (helpText claims it does) | Upgrade per ISUP or fix helpText |
| `bmi-prime` | MINOR | wave5-general-misc.ts:722–738 | Band labels drift from WHO classes (1.2–1.4 = class I only; >1.4 lumps II+III) | Relabel bands |
| `gout-classification` | MINOR | wave5-general-misc.ts:1997 | msu 'pos' carries points:100 badge; the 100 is never added (sufficient criterion short-circuit) | Drop points or relabel "sufficient" |
| `pals-hr` | MINOR | wave5-peds-id.ts:241 | Infant awake HR coded 100–180; PALS table lists 100–190 (also wrong in helpTexts :225, :93) | hi 180→190 + fix helpTexts |
| `exchange-transfusion-threshold` | MINOR | wave5-peds-id.ts:1255 | abeSigns badge −4; never subtracted (label override) | pointsYes null |
| `glasgow-meningococcal` | MINOR | wave5-peds-id.ts:1855 | helpText calls 2-pt 'deterioration' "one of the two heaviest items"; three 3-pt items are heavier | Reword |
| `jaundice-nomogram` | MINOR | wave5-peds-id.ts:1056–1064 | ≥95th-percentile floor anchors ~1.5–2.5 mg/dL low beyond ~60 h vs published Bhutani track | Raise 72–144 h anchors |

### Registry/structural — cross-module consistency sweep (new)

Adjudication of known items + new duplicates found:

| ID(s) | SEVERITY | file:LINE | issue | fix |
|---|---|---|---|---|
| `centor` + `mcisaac` | HIGH | wave2-pulm-id.ts:306 + missing-heme-id-nephro.ts:419 | Identical McIsaac scoring (same 4 Centor items + identical age bands; only diff is centor clamps ≥0) — true duplicate | Keep `mcisaac`, mark `centor` supersededBy or merge |
| `isth-bat` + `isth-ssc-bat` | HIGH | wave6-heme-onc.ts:424 + wave7-highuse.ts:2056 | Both implement the full 14-domain ISTH-BAT; isth-ssc-bat self-describes as a compatibility registration | Remove `isth-ssc-bat` or convert to alias |
| `ranson-pancreatitis` + `ranson-full` | HIGH | wave7-fillins.ts:671 + wave6-clinical-residual.ts:389 | Identical 11-item Ranson sums; ranson-full adds biliary cutoff documentation. (Admission-only `ranson`, gi-neuro-psych.ts:516, is a legit scope variant.) | Keep ranson-full; delete/alias ranson-pancreatitis |
| `meld-na` + `meld-3-edu` | HIGH | gi-neuro-psych.ts:168 + wave6-clinical-residual.ts:487 | Identical adult MELD 3.0 equation (coefficients, caps, 6–40 bounds); resolves the "MELD 3.0 ×2" shortname collision | Keep `meld-na` (adds direct mode + adolescent path); delete/alias `meld-3-edu` |
| `score2-europe` + `score2-cvd` | HIGH | wave3-cardio-vasc.ts:1539 + wave7-prevention.ts:209 | Same published coefficients, baseline survivals, region recalibration — resolves "SCORE2 ×2" collision | Keep `score2-cvd` (adds DM/ASCVD exclusion checks); alias the other |
| `feverpain-score` + `centor-feverpain` | HIGH | wave4-em-id.ts:547 + extra.ts:216 | Same 5-item FeverPAIN sum and bands — resolves "FeverPAIN ×2" collision | Keep `feverpain-score` (adds Centor display); delete/alias `centor-feverpain` |
| `expected-pao2` + `altitude-pao2` | HIGH | wave2-pulm-id.ts:761 + wave6-clinical-residual.ts:2333 | Identical age-adjusted PaO₂ (102−0.33×age) — resolves "Expected PaO₂ ×2" collision; `altitude-pao2` id is misleading (no altitude term) | Keep `expected-pao2`; delete/alias `altitude-pao2` |
| `ibw` + `devine-ibw` | MEDIUM | nephrology-endo.ts:707 + wave6-formulas-misc.ts:11 | Identical Devine formula | Keep devine-ibw; supersede/delete ibw |
| `bsa` + `bsa-mosteller` | MEDIUM | nephrology-endo.ts:786 + wave4-heme-onc.ts:1306 | Identical Mosteller √(h×w/3600) | Keep one; supersede the other |
| `corrected-sodium` + `hypertonic-hyponatremia` | MEDIUM | nephrology-endo.ts:395 + missing-peds-ob-tox.ts:1230 | Identical corrected-Na with selectable Katz 1.6 / Hillier 2.4 factor | Consolidate |
| `sodium-correction-rate` + `free-water-sodium-change` | MEDIUM | missing-heme-id-nephro.ts:799 + emergency-misc.ts:1429 | Identical Adrogué–Madias ΔNa incl. optional infusate-K term | Consolidate |
| `4-2-1-hourly` + `maintenance-fluids` | MEDIUM | wave4-formulas.ts:541 + nephrology-endo.ts:819 | Identical 4-2-1 hourly rule + daily equivalent | Consolidate |
| `gestational-age` + `pregnancy-dating` | LOW | emergency-misc.ts:501 + missing-peds-ob-tox.ts:1293 | Same Naegele LMP+280d math; pregnancy-dating is a superset | Merge into pregnancy-dating |
| `fena` + `feurea` + `fena-diuretic` | LOW | nephrology-endo.ts:212,271 + wave3-nephro-icu.ts:740 | fena-diuretic computes both indices — superset of the two single tools | Optional cross-linking/consolidation |

**Shortname-collision adjudication (resolves the 10 known pairs):** FeverPAIN, Expected PaO₂, SCORE2, MELD 3.0 → true duplicates above. Legit variants needing renames: `a-body-shape`/`absi-burn` ('ABSI-body'/'ABSI-burn'), `body-adiposity`/`beck-anxiety` ('BAI-adiposity'), `reynolds`/`reynolds-pentad` ('Reynolds-5'), `pas-appendicitis`/`pas-asthma` ('PAS-appendix'/'PAS-asthma'), `dash-vte`/`dash`/`quickdash` ('DASH-VTE'/'DASH-30'/QuickDASH). `injury-severity`/`niss` (ISS) — legitimately different instruments, no action.

### Verified non-issues (pass 2 spot checks)

- `meld-na` adolescent constant 7.33 — real OPTN policy rule, not a bug.
- `saps-3` "+16" baseline and negative admission-reason points — genuine published quirks.
- `improve-bleed` fractional weights, `canadian-syncope` −1/−2 weights, `atria-stroke` non-monotonic age weights, `rogers-score` +1 clean/contaminated wound class, PNED "<8 h admission" +1 — all match the published tables.
- `prescott` NAC citation "N-acetylcystine" — PubMed's actual indexed spelling.
- `shock-index` "Ger Med Mon 1968" citation — legitimate English translation of Allgöwer 1967 DMW.
- PMID reuse across calculators — all high-frequency repeats are coherent (same instrument family/method paper); no confirmed wrong-evidence reuse.
- Legacy entries all have valid `supersededBy` targets.
- `lund-browder` chart values verified arithmetically (all six age columns sum to 100%).
- `centor` can return −1 while bands clamp at 0 — label remains consistent.
- `pecarn-cervical` merges PECARN neck-pain/torticollis items — disclosed simplification.
- AAP 2022 bilirubin knot tables — cross-checked against PediTools API, exact.
- `oasis-score`, `predict-breast`, `syntax-*`, `prism-iv`, `mesa-cac`, `ain-risk`, `maps-mayo` — educational approximations, but all explicitly disclaimed and direct users to official tools.

## Resume plan

All 48 modules audited. Next steps: fix the 16 Major findings first (compute-path correctness), then batch the Minor copy/badge fixes, then adjudicate the duplicate consolidations. After fixes land, re-run gates: `npm test`, `npx tsc -b`, `npm run lint`, `npm run check:citations`, `npm run build`. Still open: engine/UI deep review (`src/utils/`, `src/pages/`, `src/components/`).
