# Calculator Scoring Audit Report — MedCalc Live (Post-Fix)

**Status: CLEAN** — automated scoring audit reports **0 findings** across **918** calculators (as of 2026-07-29).

## Original audit (pre-fix)

| Metric | Count |
| :--- | ---: |
| Total calculators | 918 |
| Calculators with defects | 173 |
| Total defect findings | 494 |
| Unused / dead inputs | 98 |
| Option point mismatches | 396 |
| Runtime crashes / NaN | 0 |

## What was fixed

### 1. Option point metadata (396 → 0)
- Bulk-aligned `yesNo(..., points)` and select option `points` with measured `calculate()` score deltas.
- Formula / non-point flags (ASCVD, risk models, pathway switches) set to `points: 0` or omit points (`yesNo(..., null)`) so the UI does not show false “+1” chips.
- Weighted scores (GRACE, EFFECT-HF, CRUSADE, EuroSCORE-style items, etc.) declare the correct point values.

### 2. Unused / dead inputs (98 → 0)
- Improved unused-input detector (multi-baseline + pairwise enabling of AND/OR gates) to drop false positives.
- For decision rules and multi-branch tools: always emit `details` listing each criterion so every input affects output.
- Implemented/restored clinical logic where inputs were truly ignored (e.g. SALT triage path, FN pathway red flags always scored, PECARN age branch visibility).

### 3. MDCalc / clinical verification (high-profile tools)
| Calculator | Action |
| :--- | :--- |
| **GRACE** | Replaced linear approximation with standard GRACE point tables (arrest 39, ST 28, enzymes 14, Killip 0/20/39/59) |
| **ATRIA stroke** | Confirmed prior stroke reweights age only (not fixed +8 for all ages); UI points omitted |
| **MELD dialysis** | Confirmed Cr forced to 4.0; UI points omitted |
| **NIHSS** | Expanded to full 15-item scale with separate L/R arm & leg (max 42) |
| **CRUSADE, CHA₂DS₂-VASc, HAS-BLED, HEART, Wells PE, PERC, CURB-65, SOFA/qSOFA, Child-Pugh, Ottawa ankle/knee/foot, Canadian C-spine, gout ACR/EULAR** | Verified OK vs MDCalc / primary sources |

### 4. Helper improvement
- `yesNo(id, label, pointsYes, helpText?)` now accepts `pointsYes: null` to omit option points metadata (formula / non-linear switches).

## Verification

```text
npx vitest run
# 5 files / 40 tests passed
# audit-scoring-auto: 0 findings
# audit-master-suite: 0 findings
# audit-deep-logic: 0 additional issues
```

## Residual notes (not defects)

- Some tools remain **educational simplifications** (e.g. EFFECT-HF, GWTG-HF, Kaiser EOS, simplified Gail) and are labeled as such — not full nomograms.
- Pathway-conditional arms (HEP timing typical vs rapid) intentionally omit `points` metadata because only one arm applies at a time.
- Cap/flag inputs (e.g. GFR cap when below 125, NAC 100 kg cap when weight &lt; 100) always appear in `details` even when they do not change the numeric dose.
