# Scoring-clarity catalog

Machine-readable companion to [`SCORING_CLARITY_AUDIT.md`](../../SCORING_CLARITY_AUDIT.md).

**Do not treat this as a license to change `calculate()` or option `value`s.** Those are already verified. This catalog is bedside **wording**: `label`, `helpText`, `option.description`, `pearls`.

## Files

| File | What |
|---|---|
| `../../SCORING_CLARITY_AUDIT.md` | Contract, NIHSS gold example, waves, P0 long-form, P1/P2 index, PR checklist |
| `SCORING_CLARITY_FINDINGS.json` | All 405 findings + clear + skipped, with full `suggested_change` text |

## JSON shape

```json
{
  "calculators_reviewed": 1003,
  "priority_counts": { "P0": 67, "P1": 286, "P2": 52 },
  "findings": [
    {
      "id": "nihss",
      "file": "gi-neuro-psych.ts",
      "priority": "P0",
      "pattern": "exam-protocol-missing",
      "inputs": ["locQ", "locC"],
      "current": "...",
      "problem": "...",
      "suggested_change": "...",
      "research": "...",
      "do_not_change": "option values, calculate() 15-item sum, max 42"
    }
  ],
  "clear": [{ "id": "...", "reason": "..." }],
  "skipped_formula": [{ "id": "...", "reason": "..." }],
  "waves": { "A_neuro_exam": ["nihss", "c-stat", "..."] }
}
```

## Implementer loop

1. Read §0–§6 of the markdown.
2. Start with `waves.A_neuro_exam` (NIHSS class).
3. For each `id`, open `src/data/calculators/{file}`, confirm `suggested_change` against `research`, edit schema fields only.
4. `npx vitest run`.

Generated 2026-09-11. No calculator source was changed for this audit.
