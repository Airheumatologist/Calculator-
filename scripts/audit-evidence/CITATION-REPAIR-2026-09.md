# Citation repair — 2026-09-11

Full-library evidence audit of every calculator reference (15 parallel reviewers,
all 48 `src/data/calculators/*.ts` modules).

The trigger was `expected-pao2` (Age-Expected PaO₂): the stored citation claimed
a 1970 pulmonary-physiology teaching paper but linked to
`https://www.ncbi.nlm.nih.gov/books/NBK482430/`, which is StatPearls
*Respiratory Acidosis*. That pattern — named historic papers / guidelines
pointing at the wrong StatPearls chapter, a PubMed *search* URL, a society
homepage, or a nearby PMID — was systematic.

## What changed

- ~422 of 1,091 existing references were corrected (titles, years, PMIDs, DOIs, URLs).
- Additional primary papers were added where a calculator had only a placeholder.
- NCBI Books / StatPearls URLs that did not match the named work were replaced
  with the derivation paper or official guideline.
- `pubmed.ncbi.nlm.nih.gov/?term=...` search URLs were resolved to a specific PMID
  or an honest non-PMID historic citation.
- Scoring formulas (`calculate()`) were not changed.

## User-reported example (now fixed)

`expected-pao2` now cites:

1. Mellemgaard K. Acta Physiol Scand. 1966. PMID 5963295.
   DOI 10.1111/j.1748-1716.1966.tb03281.x (PaO₂ ≈ 104.2 − 0.27×age;
   100 − 0.3×age is a bedside rounding).
2. Sorbini CA et al. Respiration. 1968. PMID 5644025.
   DOI 10.1159/000192549.

## Coverage (after repair)

| Metric | Before | After |
|--------|-------:|------:|
| Total references | 1091 | 1147 |
| With PMID | 947 (86.8%) | 1060 (92.4%) |
| Unique PMIDs | 822 | 921 |
| With DOI | 865 | 985 |
| Direct URL | 154 | 81 |
| No identifier (historic books/abstracts with no PMID) | 0* | 14 |

\*Previously every ref had *some* URL, including wrong StatPearls IDs. The 14
remaining unlinked items are genuine pre-PMID sources (Bazett 1920, Widmark 1932,
Karnofsky 1949, Lund–Browder 1944, Rohrer 1921, James 1976 HMSO, etc.).

Authoritative generated inventory: `EVIDENCE-AUDIT.md` + `refs-inventory.json`.
