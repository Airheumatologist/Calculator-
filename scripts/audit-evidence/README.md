# Evidence audit outputs

## Authoritative files

| File | What it is |
|------|------------|
| `EVIDENCE-AUDIT.md` | The one authoritative evidence report. Human-readable coverage counts for every calculator reference. |
| `refs-inventory.json` | The machine-readable inventory every other audit tool consumes: one record per reference with `calcId`, `calcName`, `file`, `line`, `title`, `citation`, `pmid`, `doi`, `url`, `year`. |

Both are generated together by:

```
npm run audit:evidence
```

Do not hand-edit either file. `EVIDENCE-AUDIT.md` carries the generation
timestamp and a sha256 of the calculator sources it was built from.

## One parser, one inventory

`scripts/lib/reference-parser.mjs` is the single source of truth for parsing
`src/data/calculators/*.ts`. It is a string-aware scanner, so it handles
single-quoted, double-quoted and template-literal reference fields alike.

Everything else reads the inventory rather than re-parsing TypeScript:

- `npm run audit:evidence` — writes the inventory and the report (offline).
- `npm run validate:pmids` — resolves every PMID against NCBI PubMed
  (needs network; `--offline` reports counts only). Fails with exit code 2 and
  a message telling you to run `npm run audit:evidence` if the inventory is
  missing or is older than the current sources.
- `npm run audit:relevance` — heuristic PMID/DOI relevance scoring (needs
  network). Same inventory, same failure mode.
- `scripts/fix-pmid-mismatches.py` — one-shot repair tool that patches wrong
  PMIDs; reads `pmid-relevance-problems.json` from a relevance run.

Because all three share the inventory, their reference and PMID counts are
always identical. Divergent counts mean the inventory is stale — re-run
`npm run audit:evidence`.

## Relevance mismatches are heuristic

`audit-pmid-relevance.py` scores token overlap between the stored citation
title and the PubMed title. It writes scratch files (`pmid-relevance-*.json`,
`PMID-RELEVANCE-SUMMARY.md`) that are triage input, not audit conclusions, and
they are intentionally not checked in.

Its "mismatch" verdicts include known false positives wherever the stored title
uses an acronym and PubMed stores the expanded phrase. Confirmed examples:

- **EDACS** — stored "Development and validation of the EDACS" vs PubMed
  "Development and validation of the Emergency Department Assessment of Chest
  pain Score…" — same paper.
- **sPESI** — stored "Simplified PESI" vs PubMed "Simplification of the
  pulmonary embolism severity index…" — same paper.
- **PERC**, **Canadian CT Head Rule**, **Sgarbossa**, **child-pugh** and other
  eponym/acronym citations behave the same way.

These are weak-title-token artefacts, not citation errors. The curated pass
recorded in `archive/` resolved every genuinely wrong PMID.

## archive/

Historical, non-authoritative snapshots from the 2026-07 repair campaign. See
`archive/README.md`. Nothing there should be cited for current counts.
