# MedCalc Live — missing / upgrade backlog

**Repo:** Airheumatologist/Calculator-  
**Inventory date:** 2026-09-10  
**Current registry:** 910 unique calculator IDs across 42 data modules  

Method: clone + parse `id`/`name` pairs from `src/data/calculators/*`, then compare against (1) 2024–2026 guideline-mandated tools, (2) MDCalc trending/new list, (3) high-use bedside scores, (4) rheumatology specialty depth.

> Several existing tools are labeled **Educational / Simplified**. Treat those as *upgrade* items, not as full official implementations.

---

## P0 — Integrate first (guideline-critical or trending and missing)

These change day-to-day decisions in 2025–2026 guidelines or are on MDCalc’s current trending/new list.

| Priority | Calculator | Why it matters | Suggested module | Notes |
|---|---|---|---|---|
| P0 | **AHA PREVENT** (10-y and 30-y CVD / ASCVD / HF) | 2025 AHA/ACC HTN + 2026 dyslipidemia + 2026 CKM guidelines replace PCE with PREVENT | new `wave7-prevention.ts` | Repo `prevent-cvd` is **Framingham-style educational**, not PREVENT. Needs eGFR, BMI, optional UACR/HbA1c/SDI. |
| P0 | **CHA₂DS₂-VA** (sexless, ESC 2024) | ESC AF 2024 dropped the sex (“Sc”) point; anticoagulation threshold is ≥2 (consider at 1) | `cardiology.ts` / wave7 | You have CHA₂DS₂-VASc only. Keep both; label which guideline. |
| P0 | **SCORE2-OP** | ESC prevention for age ≥70 | wave7-prevention | You have `score2-europe` marked *Simplified Educational*. |
| P0 | **SCORE2-Diabetes** | ESC prevention in T2DM | wave7-prevention | |
| P0 | **SCORE2-HF** | Incident HF risk (ESC) | wave7-prevention | |
| P0 | **SCORE2 + CKD Add-On** | 2026 ESC CVD+CKD guideline | wave7-prevention | |
| P0 | **SMART2** (secondary prevention) | Recurrent vascular events after established ASCVD | wave7-prevention | |
| P0 | **CKiD U25 eGFR** | MDCalc trending; peds/young-adult GFR 1–25 y | `missing-peds-ob-tox.ts` | Schwartz exists; U25 is the current preferred pediatric equation. |
| P0 | **2023 Duke-ISCVID IE criteria** | Replaces modified Duke for infective endocarditis | `wave3-cardio-vasc.ts` | You have `duke-criteria` (modified Duke helper) only. |
| P0 | **Body Roundness Index (BRI)** | MDCalc trending; 2024 JAMA Netw Open mortality data | `wave2-general-lab.ts` | Simple closed-form (height + waist). |
| P0 | **ROX index** | NIV / HFNC failure prediction; everyday ICU/ED | `wave4-icu-vent.ts` | Not present (name collisions only). |
| P0 | **H2FPEF** and **HFA-PEFF** | HFpEF diagnosis (AHA/ESC) | wave5-cardio | High cardiology demand; neither present. |

---

## P0b — Upgrade existing “educational / simplified” tools

Do **not** add a second copy. Replace or promote these to full published equations + official cut-points.

| ID now | Display name now | Upgrade to |
|---|---|---|
| `prevent-cvd` | Framingham-Style 10-Year Hard CHD Risk (Educational) | Official AHA PREVENT base + optional add-ons |
| `score2-europe` | SCORE2 (Simplified Educational) | Full SCORE2 with risk-region charts (low/mod/high/very-high) |
| `frax-simp` | FRAX-Style Major Risk Factor Checklist (Educational) | Document limitation or link out; full FRAX is licensed. Offer a **clinical-risk-factor checklist + “use official FRAX”** UX, or licensed calc if you obtain permission. |
| `meld-3-edu` | MELD 3.0 (Educational) | Full UNOS/OPTN MELD 3.0 (sex, albumin, Na, Cr/dialysis) |
| `euroscore-ii-simp` | EuroSCORE II (Simplified Educational) | Full EuroSCORE II logistic model (many inputs — consider wizard UI) |
| `saps-ii-simp` / `saps-iii-simp` | SAPS II/III simplified | Full SAPS 3 if you want ICU-grade |
| `kfre` / `kidney-failure-risk` | KFRE 4-variable | Add **8-variable KFRE** (age, sex, eGFR, ACR, Ca, P, albumin, HCO3) |

Also confirm **ASCVD 2013 PCE** is the published pooled-cohort equation (not another educational sketch). Keep PCE for historical comparison; default new patients to PREVENT.

---

## P1 — High-use / high-visibility gaps

| Calculator | Specialty | Why |
|---|---|---|
| **QRISK3** (UK) | Prevention | NICE primary-prevention workhorse outside US/EU SCORE2/PREVENT |
| **Seattle Heart Failure Model** | HF | Still a top cardiology MDCalc tool |
| **MAGGIC HF risk** | HF | Common alternative to GWTG-HF (you already have GWTG-HF) |
| **T-MACS** | EM / ACS | Contemporary ACS decision aid alongside HEART / EDACS |
| **2HELPS2B** | Neuro / ICU | Seizure risk on cEEG; on MDCalc all-tools list |
| **PECARN cervical-spine rule** | Peds EM | On MDCalc trending (you have PECARN head) |
| **HACOR** | Pulm / ICU | NIV failure in hypoxemic respiratory failure |
| **NUTRIC** | ICU nutrition | High-use ICU screen (you have MUST) |
| **GLIM** malnutrition criteria | Nutrition / geriatrics | Current consensus definition |
| **PRISM III / IV** | PICU | You have pSOFA simplified only |
| **PRAM** (pediatric asthma) | Peds | Common ED asthma score |
| **WiFi / WIfI** diabetic foot | Endo / vascular / surg | Threatened-limb staging |
| **FAST / Agile 3+ / Agile 4** | Hepatology | Current MASLD fibrosis risk (beyond FIB-4/APRI/NFS) |
| **MASLD diagnostic criteria helper** | Hepatology | Nomenclature replaced NAFLD |
| **HITS** IPV screen | Primary care / EM | On MDCalc tool list |
| **CARG** chemo toxicity | Oncology / geriatrics | Older-adult chemo risk |
| **PREDICT breast (NHS)** | Oncology | Widely used prognostic model |
| **Tyrer-Cuzick / IBIS** or **CanRisk** | Genetics / breast | High-demand; license may apply |
| **Leibovich 2018 RCC** | Urology / onc | On MDCalc all-tools list |
| **ACEF II** | Cardiac surgery | You have ACEF; ACEF II is the update |
| **SYNTAX / SYNTAX II** | Interventional cards | Anatomy + clinical PCI vs CABG |
| **ISTH-SSC Bleeding Assessment Tool** | Heme | Confirm `isth-bat` is the full ISTH-BAT, not a stub |

---

## P2 — Rheumatology specialty pack (highest leverage for this repo)

You already have a useful core: **DAS28, CDAI, SDAI, BASDAI, ASDAS-CRP, DAPSA, PASI, SLEDAI-2K, HAQ-DI, MASES, ACR/EULAR gout, IgA vasculitis (HSP) criteria**.

Missing the classification and damage instruments clinicians actually open every clinic day:

### Classification criteria (point-based — easy to implement)

| Calculator | Year | Use |
|---|---|---|
| **2010 ACR/EULAR RA** | 2010 | Still the RA classification standard |
| **2019 EULAR/ACR SLE** | 2019 | Replaced 1997 ACR / 2012 SLICC for classification |
| **2016 ACR/EULAR primary Sjögren’s** | 2016 | MDCalc specialty list |
| **2013 ACR/EULAR SSc** | 2013 | Systemic sclerosis classification |
| **2012 ACR/EULAR PMR** | 2012 | PMR classification |
| **2022 ACR/EULAR GPA** | 2022 | Weighted points, threshold ≥5 |
| **2022 ACR/EULAR MPA** | 2022 | Weighted points, threshold ≥5 |
| **2022 ACR/EULAR EGPA** | 2022 | Weighted points |
| **2022 ACR/EULAR GCA** | 2022 | Age ≥50 entry + points ≥6 |
| **2022 ACR/EULAR Takayasu** | 2022 | Companion large-vessel set |
| **CASPAR** PsA | 2006 | Still used daily |
| **ASAS** axial and peripheral SpA | 2009/2011 | Pair with ASDAS/BASDAI |
| **Yamaguchi / Fautrel** AOSD | — | Adult-onset Still’s |
| **2017 EULAR/ACR myositis** | 2017 | IIM classification |
| **Sapporo / Sydney / 2023 ACR/EULAR APS** | 2006 / 2023 | APS classification (2023 is the current weighted set) |
| **ICBD / ISG** Behçet | 2013 / 1990 | Behçet classification |

### Activity / damage / function

| Calculator | Use |
|---|---|
| **Boolean remission (ACR/EULAR)** | RA treat-to-target |
| **RAPID3** | Room-side RA activity without joint count |
| **SLICC/ACR Damage Index (SDI)** | SLE damage; pair with SLEDAI-2K |
| **BILAG-2004** (or simplified BILAG domains) | SLE activity by organ |
| **SLE-DAS** | Newer continuous SLE activity |
| **LLDAS / DORIS remission** helpers | SLE treat-to-target |
| **BVAS v3** | ANCA vasculitis activity |
| **VDI** (Vasculitis Damage Index) | AAV damage |
| **Five-Factor Score (revised 2011)** | AAV / PAN prognosis |
| **ESSDAI + ESSPRI** | Sjögren activity / patient index |
| **mRSS** (modified Rodnan skin score) | SSc skin |
| **ILD-GAP / CTD-ILD GAP** | CTD-ILD survival |
| **PASDAS + MDA / VLDA** | PsA activity / target |
| **BASFI + BASMI** | axSpA function / metrology |
| **SPARCC** enthesitis | Alongside MASES |

Suggested new file: `src/data/calculators/wave7-rheumatology.ts` and register it in `index.ts`.

---

## P3 — Fill-ins (do after P0–P2)

- SCORE2 risk-region selector UI (Europe low / moderate / high / very high)
- PREVENT 30-year + HF-specific output tabs
- Age-adjusted D-dimer helper (if not already first-class)
- 4PEPS PE probability
- Acute interstitial nephritis (AIN) risk calculator (MDCalc “New”)
- Mayo Alliance Prognostic System (MAPS) — MDCalc trending
- Geriatric Depression Scale GDS-15 — MDCalc trending
- Caprini already present; add **IMPROVE-DD / IMPROVE bleed** if missing as full scores
- Parkland present; **rBaux / ABSI** if missing
- Ranson (classic pancreatitis; you have BISAP / Atlanta / HAPS)

---

## Recommended integration order

1. **Wave A (prevention, 1 module):** official PREVENT + SCORE2 family (OP, Diabetes, HF, CKD add-on) + SMART2 + CHA₂DS₂-VA. Relabel/retire educational stubs.
2. **Wave B (rheum classification, 1 module):** 2010 RA, 2019 SLE, 2016 Sjögren, 2013 SSc, 2012 PMR, 2022 AAV/GCA/TAK, CASPAR, ASAS, 2023 APS.
3. **Wave C (rheum activity/damage):** Boolean, RAPID3, SLICC SDI, BILAG or SLE-DAS, BVAS, VDI, FFS, ESSDAI/ESSPRI, mRSS, ILD-GAP, PASDAS/MDA, BASFI.
4. **Wave D (bedside trending):** CKiD U25, BRI, ROX, HACOR, Duke-ISCVID 2023, H2FPEF/HFA-PEFF, PECARN CSI, 2HELPS2B, NUTRIC, FAST/Agile.
5. **Wave E (upgrade pass):** MELD 3.0, KFRE-8, EuroSCORE II, FRAX licensing decision, ASCVD PCE audit vs published coefficients.

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
