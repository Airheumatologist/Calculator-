# Archive — historical, not authoritative

These files are frozen records of the 2026-07 multi-wave PMID/DOI repair
campaign. They are kept only as provenance for *how* the reference set reached
its current state. **Their counts are stale by design; do not cite them.**

The authoritative report is `../EVIDENCE-AUDIT.md`, regenerated with
`npm run audit:evidence`.

| File | Pass that produced it | Why kept |
|------|----------------------|----------|
| `PMID-AUDIT-FINAL.md` | Narrative wrap-up of waves 1–5 (curated v5) | Only written record of the repair method and the wave-by-wave outcome. |
| `pmid-v5-summary.json` | Curated relevance pass v5 | The evidence behind "0 confirmed mismatches, 1 soft suspect". |
| `pmid-v5-problems.json` | Curated relevance pass v5 | The single remaining soft suspect, in full. |
| `pmid-v5-applied.json` | Curated fix pass v5 | The list of PMID/DOI substitutions actually written into `src/data/calculators`. |
| `curated-search-dump.json` | Curated PubMed searches for v5 | Shows which candidate papers were considered for each replaced PMID. |

Deleted rather than archived: the v2/v3/v4 full dumps, problem queues and
summaries, `pmid-v5-full.json`, `pmid-fix-results.json`, and the
`pmid-relevance-*` / `PMID-RELEVANCE-SUMMARY.md` heuristic outputs. Those were
intermediate triage queues, superseded by later passes or regenerable from
`npm run audit:relevance`.

## Known caveat in `pmid-v5-problems.json`

The one "soft suspect" it records (`pregnancy-dating`, PMID 33079400) has an
empty `title` and `citation`. That is a parser artefact, not a data problem:
the pass that produced it used a single-quote-only regex and could not read
that reference's double-quoted fields, so the relevance scorer had almost no
tokens to match. The current parser reads it correctly.
