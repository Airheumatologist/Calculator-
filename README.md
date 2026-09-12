# MedCalc Live

MDCalc-style clinical calculator web application with **1000+ medical calculators**, **live scores** as you interact with inputs, plus **evidence** and **next steps** for every tool.

```
  __  __          _  ____      _         _     _
 |  \/  | ___  __| |/ ___|__ _| | ___   | |   (_)_   _____
 | |\/| |/ _ \/ _` | |   / _` | |/ __|  | |   | \ \ / / _ \
 | |  | |  __/ (_| | |__| (_| | | (__   | |___| |\ V /  __/
 |_|  |_|\___|\__,_|\____\__,_|_|\___|  |_____|_| \_/ \___|
```

> **Educational use only.** Not a medical device. Not a substitute for clinical judgment, institutional protocols, or primary literature.

---

## Features

| Feature | Description |
|--------|-------------|
| **1000+ calculators** | Cardiology, critical care, pulmonary, nephrology, GI, neurology, psychiatry, EM, pediatrics, OB, hematology, ID, toxicology, endocrinology, oncology, rheumatology, dermatology, surgery, urology, ENT, ophthalmology, geriatrics, general |
| **Live scoring** | Results update immediately as you click selectors or change numbers — no submit button |
| **Evidence panel** | Summary, formula, validation notes, and literature references with **PMID / DOI / URL** links |
| **Next steps** | Condition-based clinical actions (MDCalc-style guidance) |
| **Search & filter** | Full-text search plus specialty category chips |

---

## Quick start

```bash
# Requires Node.js 20.19+ or 22.12+ (Vite 8 engine range)
npm install
npm run dev
```

Open **http://localhost:5173**

```bash
npm run build     # typecheck + production bundle → dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router 7 |
| Styling | Pure CSS (`src/index.css`) — no UI framework |
| Data | In-memory calculator registry (no backend / DB) |

---

## Implementation architecture

### High-level system

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (SPA)                                  │
│                                                                          │
│   ┌────────────┐    ┌─────────────────────────────────────────────────┐  │
│   │  index.html│───▶│  main.tsx  →  App.tsx  →  React Router          │  │
│   └────────────┘    └──────────────────┬──────────────────────────────┘  │
│                                        │                                 │
│                    ┌───────────────────┴───────────────────┐             │
│                    │                                       │             │
│                    ▼                                       ▼             │
│           ┌────────────────┐                    ┌────────────────────┐   │
│           │   HomePage     │                    │  CalculatorPage    │   │
│           │  /  ?q=  ?cat= │                    │  /calc/:id         │   │
│           └───────┬────────┘                    └─────────┬──────────┘   │
│                   │                                       │              │
│                   │              shared shell             │              │
│                   └──────────────┬────────────────────────┘              │
│                                  ▼                                       │
│                         ┌────────────────┐                               │
│                         │  Layout.tsx    │  header search + outlet       │
│                         └────────────────┘                               │
│                                  │                                       │
│          ┌───────────────────────┼───────────────────────┐               │
│          ▼                       ▼                       ▼               │
│   ┌─────────────┐       ┌───────────────┐       ┌──────────────┐         │
│   │ Calculator  │       │  LiveResult   │       │ Evidence /   │         │
│   │ Form        │       │  (score UI)   │       │ NextSteps    │         │
│   └──────┬──────┘       └───────▲───────┘       └──────────────┘         │
│          │                      │                                        │
│          │    onChange values   │  calc.calculate(values)                │
│          └──────────────────────┘                                        │
│                                  │                                       │
│                                  ▼                                       │
│                    ┌──────────────────────────┐                          │
│                    │  Calculator Registry     │                          │
│                    │  src/data/calculators/   │                          │
│                    │  (918 Calculator defs)   │                          │
│                    └──────────────────────────┘                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
         No server · No API · Fully client-side · Static deployable
```

### Directory layout

```
mdcalc/
├── index.html                 # SPA entry shell
├── package.json
├── vite.config.ts
├── public/
│   └── favicon.svg
├── dist/                      # production build output
└── src/
    ├── main.tsx               # React root mount
    ├── App.tsx                # Router + routes
    ├── index.css              # Global design system
    ├── types/
    │   └── calculator.ts      # Calculator, CalcInput, CalcResult, CATEGORIES
    ├── utils/
    │   └── helpers.ts         # num/bool, riskFromThresholds, input factories
    ├── data/
    │   └── calculators/
    │       ├── index.ts       # aggregates registry + search helpers
    │       ├── cardiology.ts
    │       ├── critical-care.ts
    │       ├── nephrology-endo.ts
    │       ├── gi-neuro-psych.ts
    │       ├── emergency-misc.ts
    │       ├── extra.ts
    │       ├── missing-emergency.ts
    │       ├── missing-cardio-pulm.ts
    │       ├── missing-gi-liver.ts
    │       ├── missing-neuro-psych.ts
    │       ├── missing-heme-id-nephro.ts
    │       ├── missing-peds-ob-tox.ts
    │       └── wave2-*.ts … wave6-*.ts   # 30 further modules (42 data modules total)
    ├── components/
    │   ├── Layout.tsx         # sticky header, search, footer
    │   ├── CalculatorCard.tsx # home grid card
    │   ├── CalculatorForm.tsx # live inputs (number / select / boolean)
    │   ├── LiveResult.tsx     # sticky score + risk badge
    │   ├── EvidencePanel.tsx
    │   └── NextStepsPanel.tsx
    └── pages/
        ├── HomePage.tsx       # browse / search / filter
        └── CalculatorPage.tsx # detail: inputs + live score + tabs
```

### Data model

```
Calculator
├── id, name, shortName, description
├── category, tags
├── whenToUse, whyUse
├── inputs[] ──────────▶ CalcInput
│                         ├── id, label, type (number|select|boolean|segmented)
│                         ├── unit, min, max, step, defaultValue
│                         └── options[] (label, value, points?)
├── calculate(values) ──▶ CalcResult
│                         ├── score, unit?, label
│                         ├── interpretation
│                         ├── riskLevel  (low|moderate|high|critical|info|normal)
│                         ├── details[]?
│                         └── recommendations[]?
├── evidence
│   ├── summary, formula?, validation
│   └── references[]  (title, citation, year?, pmid?)
├── nextSteps[]  (condition → actions[])
└── pearls[]?
```

### Live scoring data flow

```
  User clicks option / types number
              │
              ▼
  CalculatorForm.onChange(id, value)
              │
              ▼
  CalculatorPage.setValues({ ...prev, [id]: value })
              │
              ▼
  useMemo(() => calc.calculate(values), [calc, values])
              │
              ▼
  ┌─────────────────────────────────────┐
  │  Pure function in calculator def    │
  │  • sum points / apply equation      │
  │  • map score → risk band            │
  │  • return CalcResult                │
  └─────────────────────────────────────┘
              │
              ▼
  LiveResult re-renders (score, badge, interpretation)
              │
              ▼  (no network)
         Instant UI update
```

### Routing map

```
  HashRouter
       │
       ├── /                    → HomePage
       │     query: ?q=heart      search
       │     query: ?cat=cardiology  specialty filter
       │
       └── /calc/:id            → CalculatorPage
             e.g. #/calc/cha2ds2-vasc
             e.g. #/calc/heart-score
             e.g. #/calc/gcs
```

### Calculator registry composition

```
                    index.ts  (export calculators[])
                         │
     ┌───────────┬───────┼───────┬───────────┬──────────┐
     ▼           ▼       ▼       ▼           ▼          ▼
 cardiology  critical  nephro/  gi-neuro/  emergency  extra
    .ts       care.ts   endo.ts  psych.ts   misc.ts    .ts
     │           │         │        │          │         │
     └───────────┴─────────┴────────┴──────────┴─────────┘
     + missing-emergency | cardio-pulm | gi-liver
     + missing-neuro-psych | heme-id-nephro | peds-ob-tox
     + wave2-* … wave7-* (36 modules)
                         │
                         ▼
              calculators: Calculator[]   (1003 tools)
                         │
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
  getCalculator(id)  searchCalculators  getByCategory
```

### UI composition (calculator detail)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER  [MedCalc Live]  [======== search ========]  900+   │
├─────────────────────────────────────────────────────────────┤
│  breadcrumb · title · description                           │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ When to use         │  │ Why use             │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                             │
│  ┌──────────────────────────────┐  ┌─────────────────────┐  │
│  │ INPUTS                       │  │ RESULT        LIVE● │  │
│  │  ○ option A                  │  │                     │  │
│  │  ● option B   ◄── click      │  │      7              │  │
│  │  ○ option C                  │  │   High risk         │  │
│  │                              │  │  interpretation…    │  │
│  │  [ number  ] unit            │  │  details / recs     │  │
│  │  [ Reset ]                   │  │                     │  │
│  └──────────────────────────────┘  └─────────────────────┘  │
│           │                                  ▲              │
│           └──────── calculate(values) ───────┘              │
│                                                             │
│  [ Next steps ]  [ Evidence ]                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ condition-based actions  /  formula + refs          │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Footer · educational disclaimer                            │
└─────────────────────────────────────────────────────────────┘
```

### Build & deploy pipeline

```
  source (src/)
       │
       │  npm run build
       ▼
  ┌────────────┐     ┌────────────┐     ┌─────────────┐
  │ tsc -b     │────▶│ vite build │────▶│ dist/       │
  │ typecheck  │     │ bundle     │     │ static SPA  │
  └────────────┘     └────────────┘     └──────┬──────┘
                                               │
                     any static host ◄─────────┘
                     (nginx, S3, Netlify, GH Pages, …)
```

**Chunking.** The registry is ~2.9 MB minified and is consumed synchronously (`export const calculators`),
so it cannot be lazy-loaded without breaking the test suite. `vite.config.ts` therefore uses
`build.rollupOptions.output.manualChunks` to emit one chunk per data family (`calc-base`,
`calc-missing-a/b`, `calc-wave2-a/b` … `calc-wave6-a/b`) plus a `vendor-react` chunk. Total transfer for a
cold first load is unchanged, but the chunks download in parallel and a change to one data family
invalidates only that chunk instead of the whole bundle. Every chunk stays under Vite's 500 kB warning
threshold, so `chunkSizeWarningLimit` is left at its default.

---

## Specialty coverage (examples)

| Specialty | Examples |
|-----------|----------|
| Cardiology | CHA₂DS₂-VASc, HAS-BLED, HEART, TIMI, GRACE, RCRI, EDACS, Sgarbossa, Duke treadmill |
| Critical care | GCS, qSOFA, SOFA, SIRS, NEWS2, MEWS, RASS, CAM-ICU, FOUR, shock index |
| Pulmonary | CURB-65, CRB-65, PSI/PORT, SMART-COP, Light’s, Berlin ARDS, S/F ratio |
| Nephrology | CKD-EPI, FENa, KDIGO AKI, Adrogué-Madias, TTKG, FEMg, Schwartz eGFR |
| GI / liver | Child-Pugh, MELD, Maddrey DF, FIB-4, APRI, AIMS65, Lille, King’s College |
| Neurology | NIHSS, ABCD²/ABCD3-I, ICH score, Hunt-Hess, ASPECTS, mRS |
| Psychiatry | PHQ-9/2, GAD-7, AUDIT-C, COWS, SAD PERSONS, C-SSRS, MDQ |
| Emergency | Ottawa rules, Canadian CT Head, YEARS, Hestia, LRINEC, START, LEMON |
| Pediatrics / OB | PECARN, PEWS, SIPA, VBAC, preeclampsia/HELLP, Finnegan NAS |
| Hematology | 4Ts HIT, PLASMIC, ISTH DIC, Khorana, MASCC, Caprini |

---

## Evidence references (PMID / DOI / URL)

Every calculator includes an `evidence.references[]` list. The UI (`EvidencePanel`) renders clickable links when identifiers are present:

| Field | Link target |
|-------|-------------|
| `pmid` | `https://pubmed.ncbi.nlm.nih.gov/{pmid}/` |
| `doi` | `https://doi.org/{doi}` (with or without `https://doi.org/` prefix) |
| `url` | Direct source (guidelines, textbooks, agency pages) |

```ts
references: [
  {
    title: '…',
    citation: 'Author et al. Journal. Year',
    year: 2010,
    pmid: '20299623',
    doi: '10.1378/chest.09-1584', // optional
    url: 'https://…',             // optional (guidelines / non-PubMed)
  },
]
```

---

## Adding a new calculator

1. Open (or create) a module under `src/data/calculators/`.
2. Push a `Calculator` object with `inputs`, `calculate`, `evidence`, and `nextSteps`.
3. Export it from that module’s array and ensure it is spread in `src/data/calculators/index.ts`.
4. Use helpers from `src/utils/helpers.ts` (`yesNo`, `selectInput`, `numberInput`, `riskFromThresholds`).

```ts
// sketch
{
  id: 'my-score',
  name: 'My Score',
  shortName: 'MyScore',
  description: '…',
  category: 'cardiology',
  tags: ['…'],
  whenToUse: '…',
  whyUse: '…',
  inputs: [ yesNo('flag', 'Some criterion', 1) ],
  calculate(values) {
    const score = bool(values.flag) ? 1 : 0;
    return {
      score,
      label: score ? 'Positive' : 'Negative',
      interpretation: '…',
      riskLevel: score ? 'high' : 'low',
    };
  },
  evidence: {
    summary: '…',
    validation: '…',
    references: [{ title: '…', citation: '…', year: 2020 }],
  },
  nextSteps: [
    { condition: 'Positive', actions: ['…'] },
  ],
}
```

No backend, migrations, or API changes required — the registry is the source of truth.

---

## Design notes

- **Data-driven UI** — one form + one result component render any calculator from its schema.
- **Pure `calculate` functions** — easy to unit test; no side effects.
- **Sticky live panel** — score stays visible while scrolling inputs on desktop.
- **Risk colors** — `low` / `normal` (green), `moderate` / `info` (amber), `high` (orange), `critical` (red).
- **Search** — matches name, short name, description, category, and tags.

---

## Disclaimer

MedCalc Live is for **education and decision-support learning** only.

- Not FDA/CE cleared as a medical device  
- Some scores use simplified educational approximations (called out in-app)  
- Always verify formulas, cutoffs, and next steps against current guidelines and local policy before patient care  

---

## License

Private project — add a license if you intend to distribute.
