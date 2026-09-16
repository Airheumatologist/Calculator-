# Calculator audit tracker

Repo: `Airheumatologist/Calculator-`  
Audit: 2026-09-16 · Remediation: 2026-09-16

Not a re-derivation of all 1004 formulas. Add new items under **Open**.

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

- [ ] Source-linked golden fixtures for every ID (boundary, missing, zero, min/max, units)
- [ ] `num()` still falls back if `calculate()` is called with blanks
- [ ] Require `Infinity` terminal bucket / gap checks on thresholds
- [ ] Populate review dates; stale-review CI
- [ ] Separate management `nextSteps` from formula objects
- [ ] Unit selectors instead of free-text conversion
- [ ] Mark remaining superseded models `legacy`
- [ ] “Load example” control (schema `defaultValue` unused for numbers)
- [ ] `prevent-cvd` live badge still uses 10-year **total CVD**, not 2026 PREVENT-ASCVD bands
