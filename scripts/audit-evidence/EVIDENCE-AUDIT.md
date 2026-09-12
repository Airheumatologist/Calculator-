# Evidence reference audit — authoritative report

<!-- GENERATED FILE. Do not edit by hand. Regenerate with: npm run audit:evidence -->

Generated: 2026-09-12T16:06:05.217Z
Source: `src/data/calculators/*.ts` (48 files, sha256 `3d46ccd8f9cf4e8e…`)

This file and `refs-inventory.json` are the only authoritative evidence-audit
outputs in this repository. Both come from the same parser
(`scripts/lib/reference-parser.mjs`), so the counts here always match what
`npm run validate:pmids` and `npm run audit:relevance` report.

## Coverage

| Metric | Count |
|--------|------:|
| Calculator source files | 48 |
| Calculators with references | 1003 |
| Total references | 1148 |
| With PMID | 1060 (92.3%) |
| Unique PMIDs | 921 |
| With DOI | 984 (85.7%) |
| Unique DOIs | 859 |
| With direct URL | 82 |
| URL only (no PMID, no DOI) | 60 |
| Without a PMID | 88 |
| PMID without DOI | 90 |
| With at least one identifier or link | 1134 (98.8%) |
| Without any identifier or link | 14 |

## References per source file

| File | References |
|------|-----------:|
| `cardiology.ts` | 22 |
| `critical-care.ts` | 13 |
| `emergency-misc.ts` | 24 |
| `extra.ts` | 11 |
| `gi-neuro-psych.ts` | 16 |
| `missing-cardio-pulm.ts` | 19 |
| `missing-emergency.ts` | 17 |
| `missing-gi-liver.ts` | 16 |
| `missing-heme-id-nephro.ts` | 21 |
| `missing-neuro-psych.ts` | 18 |
| `missing-peds-ob-tox.ts` | 26 |
| `nephrology-endo.ts` | 23 |
| `wave2-cardiology.ts` | 23 |
| `wave2-general-lab.ts` | 29 |
| `wave2-neuro-psych.ts` | 26 |
| `wave2-oncology.ts` | 21 |
| `wave2-ortho-trauma.ts` | 23 |
| `wave2-pulm-id.ts` | 24 |
| `wave3-cardio-vasc.ts` | 23 |
| `wave3-em-surgery.ts` | 22 |
| `wave3-gi-hep.ts` | 26 |
| `wave3-nephro-icu.ts` | 23 |
| `wave3-peds-ob.ts` | 36 |
| `wave3-tox-endo-heme.ts` | 24 |
| `wave4-em-id.ts` | 28 |
| `wave4-formulas.ts` | 28 |
| `wave4-heme-onc.ts` | 24 |
| `wave4-icu-vent.ts` | 35 |
| `wave4-neuro-psych.ts` | 27 |
| `wave4-primary-endo.ts` | 29 |
| `wave5-cardio.ts` | 26 |
| `wave5-general-misc.ts` | 32 |
| `wave5-nephro-gi.ts` | 26 |
| `wave5-peds-id.ts` | 33 |
| `wave5-surg-uro-ent.ts` | 31 |
| `wave5-tox-psych.ts` | 26 |
| `wave6-clinical-residual.ts` | 31 |
| `wave6-em-peds.ts` | 30 |
| `wave6-formulas-misc.ts` | 28 |
| `wave6-heme-onc.ts` | 28 |
| `wave6-psych-sleep.ts` | 28 |
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
