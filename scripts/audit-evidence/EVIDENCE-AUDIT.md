# Evidence reference audit — authoritative report

<!-- GENERATED FILE. Do not edit by hand. Regenerate with: npm run audit:evidence -->

Generated: 2026-09-10T23:54:37.184Z
Source: `src/data/calculators/*.ts` (48 files, sha256 `c4f0585a02e4f255…`)

This file and `refs-inventory.json` are the only authoritative evidence-audit
outputs in this repository. Both come from the same parser
(`scripts/lib/reference-parser.mjs`), so the counts here always match what
`npm run validate:pmids` and `npm run audit:relevance` report.

## Coverage

| Metric | Count |
|--------|------:|
| Calculator source files | 48 |
| Calculators with references | 1003 |
| Total references | 1091 |
| With PMID | 947 (86.8%) |
| Unique PMIDs | 822 |
| With DOI | 865 (79.3%) |
| Unique DOIs | 754 |
| With direct URL | 154 |
| URL only (no PMID, no DOI) | 141 |
| Without a PMID | 144 |
| PMID without DOI | 85 |
| With at least one identifier or link | 1091 (100%) |
| Without any identifier or link | 0 |

## References per source file

| File | References |
|------|-----------:|
| `cardiology.ts` | 21 |
| `critical-care.ts` | 13 |
| `emergency-misc.ts` | 23 |
| `extra.ts` | 10 |
| `gi-neuro-psych.ts` | 16 |
| `missing-cardio-pulm.ts` | 18 |
| `missing-emergency.ts` | 15 |
| `missing-gi-liver.ts` | 16 |
| `missing-heme-id-nephro.ts` | 20 |
| `missing-neuro-psych.ts` | 18 |
| `missing-peds-ob-tox.ts` | 21 |
| `nephrology-endo.ts` | 23 |
| `wave2-cardiology.ts` | 23 |
| `wave2-general-lab.ts` | 24 |
| `wave2-neuro-psych.ts` | 25 |
| `wave2-oncology.ts` | 20 |
| `wave2-ortho-trauma.ts` | 21 |
| `wave2-pulm-id.ts` | 20 |
| `wave3-cardio-vasc.ts` | 23 |
| `wave3-em-surgery.ts` | 22 |
| `wave3-gi-hep.ts` | 26 |
| `wave3-nephro-icu.ts` | 23 |
| `wave3-peds-ob.ts` | 36 |
| `wave3-tox-endo-heme.ts` | 24 |
| `wave4-em-id.ts` | 28 |
| `wave4-formulas.ts` | 25 |
| `wave4-heme-onc.ts` | 24 |
| `wave4-icu-vent.ts` | 26 |
| `wave4-neuro-psych.ts` | 25 |
| `wave4-primary-endo.ts` | 28 |
| `wave5-cardio.ts` | 26 |
| `wave5-general-misc.ts` | 27 |
| `wave5-nephro-gi.ts` | 26 |
| `wave5-peds-id.ts` | 31 |
| `wave5-surg-uro-ent.ts` | 31 |
| `wave5-tox-psych.ts` | 25 |
| `wave6-clinical-residual.ts` | 29 |
| `wave6-em-peds.ts` | 30 |
| `wave6-formulas-misc.ts` | 25 |
| `wave6-heme-onc.ts` | 26 |
| `wave6-psych-sleep.ts` | 26 |
| `wave6-scores-residual.ts` | 25 |
| `wave7-bedside.ts` | 17 |
| `wave7-fillins.ts` | 14 |
| `wave7-highuse.ts` | 17 |
| `wave7-prevention.ts` | 11 |
| `wave7-rheum-activity.ts` | 27 |
| `wave7-rheum-class.ts` | 21 |

## Notes

- Reference *resolution* (does each PMID exist in PubMed) is checked by
  `npm run validate:pmids`, which needs network access and is not part of
  the build.
- Reference *relevance* (does each PMID match the calculator) is checked by
  `npm run audit:relevance`. That check is a heuristic title-token overlap
  score: citations such as EDACS and sPESI score as mismatches because the
  stored title uses the acronym while PubMed stores the expanded phrase.
  Those are known false positives, not citation errors.
- The last curated relevance pass (archived under `archive/`) resolved every
  confirmed mismatch; it ended at 0 confirmed mismatches and 1 soft suspect.
