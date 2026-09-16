# Calculator audit tracker

Repo: `Airheumatologist/Calculator-`  
Audit: 2026-09-16 · Remediation: 2026-09-16

Not a re-derivation of all 1004 formulas. Add new items under **Open**.

**Subagents:** Wave 0 first (1 agent, engine only). Then one ID (or listed batch) per agent. Re-check W1–W2 after W0 before per-calc patches.

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

## Open

### P0 — do next, blocks production

#### Wave 0 — fail-closed defaults (first; ~80% of P0)

Engine + schema. No per-formula rewrites here.

- [ ] Strip all patient `defaultValue` (numbers stay blank)
- [ ] No implicit `options[0]` select
- [ ] No all-No yesNo defaults
- [ ] No `num(v, clinicalFallback)` — fail closed
- [ ] Gate with `isMissingValue` / `getMissingRequiredInputs`
- [ ] Prefill only via explicit “Load example”

#### Wave 1 — rule-out / negative on empty form

Shared bug: blank inputs still emit rule-out, low-risk, Death/Within/compatible, or max score. After W0, only patch IDs that still fire.

`canadian-ct-head` `new-orleans-ct-head` `hestia-pe` `nexus-chest` `years-algorithm` `ottawa-sah-rule` `primary-care-rule-dvt` `catch-rule` `chalice-rule` `pecarn-head` `salt-triage` `jumpstart-triage` `start-triage` `news2` `mews` `wells-hit` `tmacs` (tropRatio 0) `herdoo2` `lower-gi-bleed-oakland` `strangulation-sbo` `sad-persons` `cam-icu` `four-score` `aspects` `ich-score` `fisher-grade` `c-stat` `fast-ed` `race-scale` `func-score` (11/11) `4at` `brief-confusion` `ad8` `gds-15` `finnegan` `step-by-step-fever` `rumack-matthew-time` `forrest-classification` (Ia) `air-appendicitis` `glasgow-imrie` `maddrey-df` `tokyo-cholangitis` `tokyo-cholecystitis` `varices-baveno` `delta-meld` `osmolar-gap-tox` `methanol` `ethylene-glycol-osmol` `dka-resolution` `hhs-diagnosis` `di-diagnosis`

Also (blank → sentinel, not just “low risk”): `glasgow-outcome`/`goese` blank=Death · `milan-criteria` blank=Within · `bclc-hcc` blank=A/auto-C

#### Wave 2 — dosing / crash on load

Shared bug: empty/default inputs emit a dose or throw.

`doac-renal-dose` `enoxaparin-dose` `heparin-bolus` `defib-dose-peds` `epi-dose-peds` `epinephrine-im-dose` `nac-dosing` `digoxin-fab` `fomepizole-dose` `total-daily-insulin` `correction-dose-insulin` `insulin-sensitivity-factor` `carb-ratio` `basal-bolus-split` `levothyroxine-dose` `phos-replacement` `potassium-deficit` `score2-europe` (mg/dL crash)

#### Wave 3 — units

- [ ] Selectors, not free-text: mg/dL↔mmol/L, FiO2 %↔fraction, D-dimer FEU/DDU, Cr µmol/L, weight kg/lb
- [ ] First: `score2-europe`

#### Wave 4 — formula P0s (not default-related)

| ID | Bug |
|---|---|
| `score2-op` | diabetes treated as 0 |
| `bova` | SBP&lt;90 → Stage I |
| `mdrd` | remove Black ×1.212 |
| `pyelo-admission` | remove FQ first-line |

### P1 — right after P0

One ID per agent.

| ID | Bug |
|---|---|
| `caprini` | arthroscopic/laparo 2 pts dropped |
| `edacs` | remove age-gate |
| `smart-cop` | add age |
| `dash-score-vte` | hormone gate female |
| `sle-das` | bidirectional gate |
| `hfa-peff` | add rhythm |
| `laps-score` | rename id → `lams` (LAMS) |
| `kdigo-peds-aki` | +0.5 gate |
| `pediatric-ett-size` | block &lt;2 y |
| `ctcae-neutropenia` `ctcae-thrombocytopenia` | LLN optional |
| `das28` | split ESR/CRP |
| `madrs` | direct suicide flag |
| `abg-stepwise` | 7.35 |
| `charlson-comorbidity` | CVA+hemiplegia |
| `cholinergic-tox` | GI/emesis double-count |
| `dapt-score` | require ageBand |
| `hcm-risk-scd` | block &lt;16 + 2023 disclaimer |
| `qtc-hodges` | guard |
| `svr-calc` | MAP&lt;CVP guard |
| `opioid-mme` | verify 4 / 0.1 |
| `ldl-martin` | example |
| `buprenorphine-cows` `act-asthma` `gina-control` `vanderbilt-adhd` | require inputs |

### P2 — harden before release

Engine batch:
- [ ] `bool()` case-insensitive
- [ ] select value ∈ options
- [ ] questionnaire: explicit mode (drop regex)

Per-ID:
| ID | Bug |
|---|---|
| `sds-zung` `sas-zung-anxiety` | clamp |
| `hsp-criteria` | units |
| `nrp-oxygen` | 6–9 min |
| `failure-to-thrive` | cap 8 |
| `who-pneumonia` | simplify |
| `warfarin-inr-goal` `fluid-bolus-peds` | string scores |
| `fena` | % / h flip |
| `naloxone-infusion` `ett-depth` `pulmonary-score` `westley-croup` `hyperkalemia-ecg` `expected-pco2-acute-resp` `expected-pco2-chronic-resp` `expected-pco2-metabolic-alk` | strip optional-default |
| `kdigo-aki` `kawasaki` `gold-stage` `doac-renal-dose` `vbac-success` `lrinec` | evidence refresh |

### Later

- [ ] Source-linked golden fixtures per ID (boundary, missing, zero, min/max, units)
- [ ] Require `Infinity` terminal bucket / gap checks on thresholds
- [ ] Populate review dates; stale-review CI
- [ ] Separate management `nextSteps` from formula objects
- [ ] Mark remaining superseded models `legacy`
- [ ] `prevent-cvd` live badge still uses 10-year **total CVD**, not 2026 PREVENT-ASCVD bands
