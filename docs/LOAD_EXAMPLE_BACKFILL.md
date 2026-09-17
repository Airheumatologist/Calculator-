# "Load example" backfill — handoff

## The bug

`Load example` (`CalculatorForm` → `getExampleFormValues` in `src/utils/helpers.ts`) prefills
only inputs that declare `exampleValue`. An input without one stays blank, so the page keeps
showing `Enter all required inputs` instead of a result. At the start of the backfill
**330 of 1004** calculators were complete; **685** were complete on 2026-09-17.

`exampleValue` is the only sanctioned prefill mechanism: patient-facing defaults were removed
from the schema and `validateCalculator` rejects `defaultValue`.

## Remaining work

Run this and read the printed per-file worklist (calculator id + the input ids still missing a
value):

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
npx vitest run tests/registry-example-sweep.test.ts --disable-console-intercept
```

The test holds `PENDING_EXAMPLE_BACKFILL`, the exact list of files still unfinished. It fails if
a file with gaps is not declared, or if a declared file is already finished (then delete the
entry). When the list is empty, replace the ratchet with `expect(offenders).toEqual([])`.

## How to write an example

One coherent clinical case per calculator, consistent with any `exampleValue`s already present.

- Booleans: mostly `false`, with 1–3 `true` where that makes the case realistic and
  non-degenerate (prefer a meaningful risk band over the score floor, but stay plausible).
- Selects: the option that fits the case; never "unknown"/"other" unless it is the standard
  branch; keep band options consistent with numbers elsewhere in the same calculator.
- Numbers: inside `min`/`max`, on `step`, a typical physiologic/lab value in the shown unit.
- Questionnaires: the mode input's value must select a branch whose required items all have
  values (`questionnaire.activeInputIdsByMode`).
- Change **only** `exampleValue`. No formula, label, option, range, help-text or ordering edits.

### Two traps that silently break things

1. **Argument position.** `yesNo(id, label, pointsYes, helpText?, exampleValue?, required?)` —
   exampleValue is the 5th argument. If the call already passes a help text, append the value
   directly (`yesNo('x', 'X', 1, 'help', true)`); use `undefined` for helpText only when the call
   has none. Writing `..., 'help', undefined, true)` puts `true` in `required` and leaves the
   example undefined — the button still does nothing.
   `selectInput(id, label, options, exampleValue?, helpText?, required?)` — exampleValue is the
   4th argument; replace an existing `undefined` placeholder.
2. **Literal type.** A select example must match the option value's type: `1` for
   `{ value: 1 }`, `'1'` only for `{ value: '1' }`. A mismatch fails
   `validateCalculator` with `input <id> exampleValue is not in options` and turns the whole
   registry red.

Inputs built by `.map()` over a label array (Epworth `q1–q8`, MDQ `s1–s13`, SPARCC enthesitis)
take the value inside the callback, keyed off the index.

## Verification

```bash
npx vitest run tests/registry.test.ts            # schema: types, min/max, option membership
npx vitest run tests/registry-example-sweep.test.ts   # completeness + no gate/NaN/throw
npx tsc -b
```

`registry-example-sweep.test.ts` also asserts that every complete example survives the
production pipeline (no `NaN`/`undefined`/`Infinity`/`null`, no gate rejection, no throw) and
that every still-partial example is *gated* rather than calculated from partial data.
