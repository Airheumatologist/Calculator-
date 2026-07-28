# PMID / DOI Evidence Audit — Final Report

**Completed:** 2026-07-28

## Scope

- All calculator `evidence.references` across `src/data/calculators/*.ts`
- Checked PubMed resolution (live/functional) **and topic relevance** to the calculator
- Method: NCBI E-utilities esummary + author/year/topic scoring; multi-wave automated repair + curated fixes

## Totals

| Metric | Count |
|--------|------:|
| Total references | 981 |
| With PMID | 839 |
| OK (live + related) | 838 |
| URL-only (no PMID; has url) | 142 |
| Remaining mismatches | **0** |
| Soft suspects | 1 (pregnancy-dating → Naegele’s rule review; acceptable) |

## Example fix (user-reported)

**Khorana score** previously linked PMID `18252800` / DOI `10.1242/jcs.021303`  
(cytochrome *c* mitochondrial diffusion — unrelated).

Now: PMID **18216292** / DOI **10.1182/blood-2007-10-116327**  
*Development and validation of a predictive model for chemotherapy-associated thrombosis* (Khorana AA et al. Blood. 2008).

## Waves completed

1. **Inventory** — `audit-evidence.mjs`: 981 refs, 839 with PMID, 100% have some link
2. **Live resolve + relevance v1–v2** — NCBI titles + author/year matching → ~122 clear mismatches
3. **Auto re-search repair** — `fix-pmid-mismatches.py`: ~113 patches via PubMed esearch
4. **Stricter topic re-audit v3–v4** — dropped acronym false positives; residual ~24 hard cases
5. **Curated literature fixes + DOI sync** — residual mismatches brought to **0**

## Sample corrected links

| Calculator | New PMID | Paper (short) |
|------------|----------|---------------|
| khorana | 18216292 | Chemo-associated thrombosis model (Blood 2008) |
| rcri | 10477528 | Lee RCRI derivation (Circulation 1999) |
| 4at | 24590568 | Bellelli 4AT delirium validation |
| atlas-cdi | 23530807 | Miller ATLAS score for CDI |
| nac-dosing | 3059186 | Smilkstein oral NAC (NEJM 1988) |
| riete-bleed | 18612534 | RIETE major bleeding predictors |
| shock-index-age | 18498875 | Zarzaur age × shock index |
| glucose-rate-mgkgmin | 21357346 | Adamkin neonatal glucose homeostasis |

## Tooling

| Script | Purpose |
|--------|---------|
| `scripts/audit-evidence.mjs` | Offline coverage stats |
| `scripts/validate-pmids.py` | Live PMID resolve (existence only) |
| `scripts/audit-pmid-relevance.py` | Relevance audit vs PubMed titles |
| `scripts/fix-pmid-mismatches.py` | Auto re-search + patch wrong PMIDs |

Reports: `scripts/audit-evidence/pmid-v5-*.json`, this file.

## Notes

- **URL-only references (~142):** guidelines, monographs, textbooks — already have functional URLs; not forced to PMIDs when no clean PubMed record exists.
- **Historical formulas** (e.g. Hamwi 1964): sometimes no single PubMed record; linked to closely related validated literature (e.g. Robinson IBW equations; QT formula comparisons including Hodges).
- Re-run relevance audit anytime:  
  `python3 scripts/audit-pmid-relevance.py --skip-doi`
