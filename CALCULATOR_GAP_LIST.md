# MedCalc Live — missing / upgrade backlog

**Repo:** Airheumatologist/Calculator-  
**Inventory date:** 2026-09-10  
**Current registry:** 1003 unique calculator IDs across 48 data modules  

**Implementation (2026-09-10):** Wave A–E from this list are now in the registry (`wave7-*.ts` plus in-place upgrades). See status below. Remaining items are licensed models (official FRAX probabilities, Tyrer-Cuzick/CanRisk, commercial EuroSCORE) and any SCORE2-HF/QRISK3 coefficients that stay labeled educational pending a license.

Method: clone + parse `id`/`name` pairs from `src/data/calculators/*`, then compare against (1) 2024–2026 guideline-mandated tools, (2) MDCalc trending/new list, (3) high-use bedside scores, (4) rheumatology specialty depth.

> Several existing tools were labeled **Educational / Simplified**. Those listed under P0b were upgraded in place (same IDs).

---

## Implementation status (2026-09-10)

### Done — P0 new
| ID | Notes |
|---|---|
| `prevent-cvd` | Replaced Framingham educational stub with official AHA PREVENT 10y/30y CVD/ASCVD/HF (Khan Circulation 2024 coefficients) |
| `cha2ds2-va` | ESC 2024 sexless score; CHA₂DS₂-VASc kept |
| `score2-europe` | Full SCORE2 + 4 European risk regions (was simplified educational) |
| `score2-op` | Age ≥70 |
| `score2-diabetes` | T2DM |
| `score2-hf` | Incident HF |
| `score2-ckd-addon` | SCORE2 × CKD add-on |
| `smart2` | Recurrent vascular events |
| `ckid-u25` | Pediatric/young-adult eGFR |
| `duke-iscvid-2023` | 2023 Duke-ISCVID; modified Duke kept |
| `body-roundness-index` | BRI |
| `rox-index` | NIV/HFNC failure |
| `h2fpef` / `hfa-peff` | HFpEF diagnosis |

### Done — P0b upgrades (same IDs)
| ID | Upgrade |
|---|---|
| `prevent-cvd` | Official PREVENT |
| `score2-europe` | Official SCORE2 + region recalibration |
| `frax-simp` | Clinical-risk-factor checklist + official FRAX link (licensed probabilities not reverse-engineered) |
| `meld-3-edu` | Labeled MELD 3.0 (UNOS/OPTN); Kim 2021 formula |
| `euroscore-ii-simp` | Full logistic EuroSCORE II |
| `saps-ii-simp` / `saps-iii-simp` | Official SAPS II bands + SAPS 3 boxes; also new `saps-3` |
| `kfre-8` | 8-variable KFRE added (4-variable `kidney-failure-risk` kept) |

### Done — P1
QRISK3 educational (`qrisk3`), Seattle HF, MAGGIC, T-MACS, 2HELPS2B (`helps2b`), PECARN CSI, HACOR, NUTRIC, GLIM, PRISM III/IV, PRAM, WIfI, FAST / Agile 3+ / Agile 4, MASLD helper, HITS, CARG, PREDICT breast educational, Leibovich 2018, ACEF II, SYNTAX helper + SYNTAX II, ISTH-SSC BAT (`isth-ssc-bat`).

Tyrer-Cuzick / CanRisk **not implemented** (license).

### Done — P2 rheumatology
**Classification:** 2010 RA, 2019 SLE, 2016 Sjögren, 2013 SSc, 2012 PMR, 2022 GPA/MPA/EGPA/GCA/TAK, CASPAR, ASAS axial + peripheral, Yamaguchi + Fautrel AOSD, 2017 IIM, 2023 APS + Sydney APS, ICBD + ISG Behçet.

**Activity/damage:** Boolean remission, RAPID3, SLICC SDI, BILAG-2004, SLE-DAS, LLDAS, DORIS, BVAS v3, VDI, FFS 2011, ESSDAI, ESSPRI, mRSS, ILD-GAP, PASDAS, MDA/VLDA, BASFI-10, BASMI, SPARCC.

### Done — P3
Age-adjusted D-dimer, 4PEPS (`peps-4`), AIN risk, MAPS, GDS-15 (existing upgraded), IMPROVE-DD, IMPROVE bleed (existing upgraded), rBaux, ABSI (existing), Ranson.

---

## P0 — Integrate first (guideline-critical or trending and missing)

These change day-to-day decisions in 2025–2026 guidelines or are on MDCalc’s current trending/new list.

| Priority | Calculator | Why it matters | Suggested module | Notes |
|---|---|---|---|---|
| P0 | **AHA PREVENT** (10-y and 30-y CVD / ASCVD / HF) | 2025 AHA/ACC HTN + 2026 dyslipidemia + 2026 CKM guidelines replace PCE with PREVENT | new `wave7-prevention.ts` | **DONE** — `prevent-cvd` is official PREVENT. |
| P0 | **CHA₂DS₂-VA** (sexless, ESC 2024) | ESC AF 2024 dropped the sex (“Sc”) point; anticoagulation threshold is ≥2 (consider at 1) | `cardiology.ts` / wave7 | **DONE** — `cha2ds2-va`. CHA₂DS₂-VASc kept. |
| P0 | **SCORE2-OP** | ESC prevention for age ≥70 | wave7-prevention | **DONE** |
| P0 | **SCORE2-Diabetes** | ESC prevention in T2DM | wave7-prevention | **DONE** |
| P0 | **SCORE2-HF** | Incident HF risk (ESC) | wave7-prevention | **DONE** |
| P0 | **SCORE2 + CKD Add-On** | 2026 ESC CVD+CKD guideline | wave7-prevention | **DONE** |
| P0 | **SMART2** (secondary prevention) | Recurrent vascular events after established ASCVD | wave7-prevention | **DONE** |
| P0 | **CKiD U25 eGFR** | MDCalc trending; peds/young-adult GFR 1–25 y | `missing-peds-ob-tox.ts` | **DONE** — `ckid-u25` |
| P0 | **2023 Duke-ISCVID IE criteria** | Replaces modified Duke for infective endocarditis | `wave3-cardio-vasc.ts` | **DONE** — `duke-iscvid-2023`; modified Duke kept |
| P0 | **Body Roundness Index (BRI)** | MDCalc trending; 2024 JAMA Netw Open mortality data | `wave2-general-lab.ts` | **DONE** |
| P0 | **ROX index** | NIV / HFNC failure prediction; everyday ICU/ED | `wave4-icu-vent.ts` | **DONE** |
| P0 | **H2FPEF** and **HFA-PEFF** | HFpEF diagnosis (AHA/ESC) | wave5-cardio | **DONE** |

---

## P0b — Upgrade existing “educational / simplified” tools

Do **not** add a second copy. Replace or promote these to full published equations + official cut-points.

| ID now | Display name now | Upgrade to |
|---|---|---|
| `prevent-cvd` | Framingham-Style 10-Year Hard CHD Risk (Educational) | **DONE** Official AHA PREVENT |
| `score2-europe` | SCORE2 (Simplified Educational) | **DONE** Full SCORE2 with risk-region charts |
| `frax-simp` | FRAX-Style Major Risk Factor Checklist (Educational) | **DONE** checklist + official FRAX link (license) |
| `meld-3-edu` | MELD 3.0 (Educational) | **DONE** labeled UNOS/OPTN MELD 3.0 |
| `euroscore-ii-simp` | EuroSCORE II (Simplified Educational) | **DONE** logistic model |
| `saps-ii-simp` / `saps-iii-simp` | SAPS II/III simplified | **DONE** fuller SAPS II / SAPS 3 |
| `kfre` / `kidney-failure-risk` | KFRE 4-variable | **DONE** added `kfre-8` |

Also confirm **ASCVD 2013 PCE** is the published pooled-cohort equation (not another educational sketch). Keep PCE for historical comparison; default new patients to PREVENT.

---

## P1 — High-use / high-visibility gaps

| Calculator | Specialty | Why |
|---|---|---|
| **QRISK3** (UK) | Prevention | **DONE** educational `qrisk3` — use qrisk.org for decisions |
| **Seattle Heart Failure Model** | HF | **DONE** `seattle-hf` |
| **MAGGIC HF risk** | HF | **DONE** `maggic-hf` |
| **T-MACS** | EM / ACS | **DONE** `tmacs` |
| **2HELPS2B** | Neuro / ICU | **DONE** `helps2b` |
| **PECARN cervical-spine rule** | Peds EM | **DONE** `pecarn-csi` |
| **HACOR** | Pulm / ICU | **DONE** `hacor` |
| **NUTRIC** | ICU nutrition | **DONE** `nutric` |
| **GLIM** malnutrition criteria | Nutrition / geriatrics | **DONE** `glim-malnutrition` |
| **PRISM III / IV** | PICU | **DONE** |
| **PRAM** (pediatric asthma) | Peds | **DONE** `pram` |
| **WiFi / WIfI** diabetic foot | Endo / vascular / surg | **DONE** `wifi-diabetic-foot` |
| **FAST / Agile 3+ / Agile 4** | Hepatology | **DONE** |
| **MASLD diagnostic criteria helper** | Hepatology | **DONE** `masld-criteria` |
| **HITS** IPV screen | Primary care / EM | **DONE** `hits-ipv` |
| **CARG** chemo toxicity | Oncology / geriatrics | **DONE** `carg-chemo` |
| **PREDICT breast (NHS)** | Oncology | **DONE** educational `predict-breast` |
| **Tyrer-Cuzick / IBIS** or **CanRisk** | Genetics / breast | **NOT DONE** — license |
| **Leibovich 2018 RCC** | Urology / onc | **DONE** `leibovich-2018` |
| **ACEF II** | Cardiac surgery | **DONE** `acef-ii` |
| **SYNTAX / SYNTAX II** | Interventional cards | **DONE** `syntax-score`, `syntax-ii` |
| **ISTH-SSC Bleeding Assessment Tool** | Heme | **DONE** `isth-ssc-bat` (full 14-domain); original `isth-bat` kept |

---

## P2 — Rheumatology specialty pack (highest leverage for this repo)

You already have a useful core: **DAS28, CDAI, SDAI, BASDAI, ASDAS-CRP, DAPSA, PASI, SLEDAI-2K, HAQ-DI, MASES, ACR/EULAR gout, IgA vasculitis (HSP) criteria**.

Missing the classification and damage instruments clinicians actually open every clinic day:

### Classification criteria (point-based — easy to implement)

| Calculator | Year | Use |
|---|---|---|
| **2010 ACR/EULAR RA** | 2010 | **DONE** `acr-eular-ra-2010` |
| **2019 EULAR/ACR SLE** | 2019 | **DONE** `eular-acr-sle-2019` |
| **2016 ACR/EULAR primary Sjögren’s** | 2016 | **DONE** `acr-eular-sjogren-2016` |
| **2013 ACR/EULAR SSc** | 2013 | **DONE** `acr-eular-ssc-2013` |
| **2012 ACR/EULAR PMR** | 2012 | **DONE** `acr-eular-pmr-2012` |
| **2022 ACR/EULAR GPA** | 2022 | **DONE** `acr-eular-gpa-2022` |
| **2022 ACR/EULAR MPA** | 2022 | **DONE** `acr-eular-mpa-2022` |
| **2022 ACR/EULAR EGPA** | 2022 | **DONE** `acr-eular-egpa-2022` |
| **2022 ACR/EULAR GCA** | 2022 | **DONE** `acr-eular-gca-2022` |
| **2022 ACR/EULAR Takayasu** | 2022 | **DONE** `acr-eular-tak-2022` |
| **CASPAR** PsA | 2006 | **DONE** `caspar-psa` |
| **ASAS** axial and peripheral SpA | 2009/2011 | **DONE** `asas-axspa`, `asas-perispa` |
| **Yamaguchi / Fautrel** AOSD | — | **DONE** |
| **2017 EULAR/ACR myositis** | 2017 | **DONE** `eular-acr-myositis-2017` |
| **Sapporo / Sydney / 2023 ACR/EULAR APS** | 2006 / 2023 | **DONE** `sapporo-sydney-aps`, `acr-eular-aps-2023` |
| **ICBD / ISG** Behçet | 2013 / 1990 | **DONE** `icbd-behcet`, `isg-behcet` |

### Activity / damage / function

| Calculator | Use |
|---|---|
| **Boolean remission (ACR/EULAR)** | **DONE** `boolean-remission-ra` |
| **RAPID3** | **DONE** `rapid3` |
| **SLICC/ACR Damage Index (SDI)** | **DONE** `slicc-sdi` |
| **BILAG-2004** (or simplified BILAG domains) | **DONE** `bilag-2004-index` |
| **SLE-DAS** | **DONE** `sle-das` |
| **LLDAS / DORIS remission** helpers | **DONE** `lldas`, `doris-remission` |
| **BVAS v3** | **DONE** `bvas-v3` |
| **VDI** (Vasculitis Damage Index) | **DONE** `vdi-vasculitis` |
| **Five-Factor Score (revised 2011)** | **DONE** `ffs-2011` |
| **ESSDAI + ESSPRI** | **DONE** |
| **mRSS** (modified Rodnan skin score) | **DONE** `mrss` |
| **ILD-GAP / CTD-ILD GAP** | **DONE** `ild-gap` |
| **PASDAS + MDA / VLDA** | **DONE** `pasdas`, `mda-psa` |
| **BASFI + BASMI** | **DONE** `basfi-10`, `basmi` |
| **SPARCC** enthesitis | **DONE** `sparcc-enthesitis` |

Suggested new file: `src/data/calculators/wave7-rheumatology.ts` and register it in `index.ts`. **Shipped as** `wave7-rheum-class.ts` + `wave7-rheum-activity.ts`.

---

## P3 — Fill-ins (do after P0–P2)

- SCORE2 risk-region selector UI (Europe low / moderate / high / very high) — **DONE** on `score2-europe`
- PREVENT 30-year + HF-specific output tabs — **DONE** in PREVENT details
- Age-adjusted D-dimer helper (if not already first-class) — **DONE** `age-adjusted-ddimer`
- 4PEPS PE probability — **DONE** `peps-4`
- Acute interstitial nephritis (AIN) risk calculator (MDCalc “New”) — **DONE** `ain-risk`
- Mayo Alliance Prognostic System (MAPS) — **DONE** `maps-mayo`
- Geriatric Depression Scale GDS-15 — **DONE** existing `gds-15` upgraded
- Caprini already present; add **IMPROVE-DD / IMPROVE bleed** if missing as full scores — **DONE**
- Parkland present; **rBaux / ABSI** if missing — **DONE** `rbaux`; `absi-burn` existed
- Ranson (classic pancreatitis; you have BISAP / Atlanta / HAPS) — **DONE** `ranson-pancreatitis`

---

## Recommended integration order

1. **Wave A (prevention, 1 module):** official PREVENT + SCORE2 family (OP, Diabetes, HF, CKD add-on) + SMART2 + CHA₂DS₂-VA. Relabel/retire educational stubs. **DONE**
2. **Wave B (rheum classification, 1 module):** 2010 RA, 2019 SLE, 2016 Sjögren, 2013 SSc, 2012 PMR, 2022 AAV/GCA/TAK, CASPAR, ASAS, 2023 APS. **DONE**
3. **Wave C (rheum activity/damage):** Boolean, RAPID3, SLICC SDI, BILAG or SLE-DAS, BVAS, VDI, FFS, ESSDAI/ESSPRI, mRSS, ILD-GAP, PASDAS/MDA, BASFI. **DONE**
4. **Wave D (bedside trending):** CKiD U25, BRI, ROX, HACOR, Duke-ISCVID 2023, H2FPEF/HFA-PEFF, PECARN CSI, 2HELPS2B, NUTRIC, FAST/Agile. **DONE**
5. **Wave E (upgrade pass):** MELD 3.0, KFRE-8, EuroSCORE II, FRAX licensing decision, ASCVD PCE audit vs published coefficients. **DONE** except PCE coefficient audit (left as follow-up)

---

## Implementation notes (match existing architecture)

- Follow `Calculator` in `src/types/calculator.ts`: `id`, `name`, `inputs[]`, `calculate()`, `evidence.references[]` with PMID/DOI, `nextSteps[]`.
- Use helpers in `src/utils/helpers.ts` (`yesNo`, `selectInput`, `numberInput`, `riskFromThresholds`).
- Export array from the new module and spread it in `src/data/calculators/index.ts`.
- Keep IDs kebab-case and unique (`cha2ds2-va`, `prevent-ascvd-10y`, `acr-eular-ra-2010`, `acr-eular-gpa-2022`, …).
- For licensed models (FRAX, some genetics, full EuroSCORE commercial use), ship a transparent educational subset **or** an external official-tool link rather than a look-alike equation.
- Educational disclaimer already in README must stay on PREVENT / SCORE2 / classification criteria (classification ≠ diagnosis).

---

## What you already cover well (do not rebuild)

CHA₂DS₂-VASc, HAS-BLED, HEART + HEART Pathway, TIMI, GRACE, Wells PE/DVT, PERC, YEARS, PESI, Hestia, GCS, NIHSS, SOFA, qSOFA, NEWS2, CURB-65, PSI/PORT, Child-Pugh, MELD, FIB-4, CKD-EPI 2021 Cr / Cys / combined, KFRE-4, MAP, S/F ratio, levothyroxine adult dose, Cockcroft-Gault, PHQ-9, GAD-7, DAS28/CDAI/SDAI, ASDAS, DAPSA, PASI, SLEDAI-2K, Caprini, 4Ts, PLASMIC, SCAI shock, GWTG-HF, Smith-modified Sgarbossa, Clinical Frailty Scale, STOP-BANG, Epworth.
