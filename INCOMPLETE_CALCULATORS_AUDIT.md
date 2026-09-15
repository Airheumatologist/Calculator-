# Clinical & Software Audit: Incomplete & Stub Calculators Across the Codebase

**Date:** September 15, 2026  
**Auditor:** Clinical & Software Audit Agent  
**Scope:** Comprehensive investigation across all 1,014 calculators in 48 data files in `src/data/calculators/`  
**Prior Remediation Context:** Remediation of Oswestry Disability Index (ODI), which previously accepted only a single `numberInput('pct', 'ODI disability %')` without the 10 validated clinical questions required to compute it.

---

## Executive Summary

A comprehensive automated and clinical manual audit was executed across all calculator modules in the codebase. Every calculator definition was inspected for input definitions, parameter names, helper text, calculation logic, and clinical validity.

### Key Metrics
- **Total Calculators Audited:** 1,014
- **Tier 1 — Critical Incomplete Instruments (Questionnaires/Scores reduced to a single precomputed total/subscore):** **49 calculators**
- **Tier 2 — Pre-Tallied Organ/Domain Aggregates (Requiring clinicians to calculate complex weighted subscores per organ system):** **5 calculators**
- **Tier 3 — Chained Calculator Dependencies (Calculators requiring precalculated composite outputs from other tools):** **4 calculators**
- **Tier 4 — Redundant / Deprecated Stubs (Stubs coexisting with full implementations elsewhere in the codebase):** **1 calculator**
- **Tier 5 — Validated Single-Item Ordinal Scales (Legitimate clinician-rated single-choice scales, confirmed not to be broken instruments):** **44 calculators**

---

## 1. Deep Dive: Specifically Requested Calculators

### 1.1 `ses-cd` — Simple Endoscopic Score for Crohn Disease
- **Location:** `src/data/calculators/wave5-nephro-gi.ts` (lines 2048–2085)
- **Current Inputs:** Single `numberInput('total', 'Total SES-CD', { min: 0, max: 56 })`
- **Current Help Text:** *"Sum 5 segments (ileum, right colon, transverse, left colon, rectum) × 4 items (each 0–3)... Enter the precomputed total (max 56)."*
- **Clinical Reality:** The Simple Endoscopic Score for Crohn's Disease (SES-CD, Daperno et al. *Gastrointest Endosc* 2004) is universally structured as a **5 × 4 matrix (20 items total)**:
  - **5 Anatomical Segments:** (1) Ileum (terminal ileum), (2) Right colon, (3) Transverse colon, (4) Left colon, (5) Rectum.
  - **4 Endoscopic Variables per Segment (each scored 0–3):**
    1. *Size of ulcers:* 0 = None; 1 = Aphthous (0.1–0.5 cm); 2 = Large (0.5–2.0 cm); 3 = Very large (>2.0 cm).
    2. *Ulcerated surface:* 0 = None; 1 = <10%; 2 = 10%–30%; 3 = >30%.
    3. *Affected surface:* 0 = Unaffected; 1 = <50%; 2 = 50%–75%; 3 = >75%.
    4. *Narrowings / Stenosis:* 0 = None; 1 = Single passable; 2 = Multiple passable; 3 = Cannot be passed.
- **Audit Finding:** **HIGH-PRIORITY INCOMPLETE STUB.** Exactly like ODI, this calculator forces the gastroenterologist or endoscopist to manually score 20 cells in their head or on paper, sum them, and enter the total into a text box.
- **Remediation Recommendation:** Replace `total` with an interactive 5-segment accordion or grid table scoring each of the 4 variables (0–3), automatically summing to the 0–56 total and mapping to remission (0–2), mild (3–6), moderate (7–15), and severe (≥16).

---

### 1.2 `mayo-score-uc` — Mayo Endoscopic Score vs. Full Mayo Score
- **Location:** `src/data/calculators/wave5-nephro-gi.ts` (lines 1582–1650)
- **Current Inputs:** Single `selectInput('endo', 'Endoscopic findings (Mayo endoscopic subscore)', [0, 1, 2, 3])`
- **Related Calculator:** `partial-mayo` (lines 1669–1730), taking 3 inputs: stool frequency (0–3), rectal bleeding (0–3), and physician global assessment (0–3).
- **Clinical Reality:** 
  - The classic Schroeder Mayo Score for Ulcerative Colitis (*N Engl J Med* 1987) is a **12-point composite instrument** comprising **4 distinct components (0–3 each)**:
    1. Stool frequency (0–3)
    2. Rectal bleeding (0–3)
    3. Endoscopic mucosal appearance (0–3)
    4. Physician's global assessment (0–3)
- **Audit Finding:** The codebase has split the Mayo system into two halves: `partial-mayo` (non-invasive 3 items, 0–9) and `mayo-score-uc` (endoscopy only, 0–3). However, there is **NO Full Mayo Score calculator (0–12)**. When clinicians look for "Mayo Score for UC" on MDCalc, they expect either the Full Mayo (all 4 items including endoscopy) or Partial Mayo.
- **Remediation Recommendation:** Rename or expand `mayo-score-uc` into `mayo-score-full` (or create a unified Mayo calculator with an optional toggle for endoscopy), integrating Stool Frequency + Rectal Bleeding + PGA + Endoscopy (0–12).

---

### 1.3 `sledai-2k` (`sle-dai`) — Systemic Lupus Erythematosus Disease Activity Index 2000
- **Location:** `src/data/calculators/wave4-heme-onc.ts` (lines 1800–1850)
- **Current Inputs:** Single `numberInput('total', 'SLEDAI-2K total score', { min: 0, max: 105 })`
- **Current Help Text:** *"Enter the total from the official SLEDAI-2K form (24 weighted descriptors over the prior 10–30 days). Do not score descriptors here."*
- **Clinical Reality:** SLEDAI-2K (Gladman et al. *J Rheumatol* 2002) is a validated **24-descriptor index** with fixed weights:
  - **Weight 8:** Seizure, Psychosis, Organic brain syndrome, Visual disturbance, Cranial nerve disorder, Lupus headache, CVA, Vasculitis.
  - **Weight 4:** Arthritis, Myositis, Urinary casts, Hematuria, Proteinuria (>0.5 g/24h), Pyuria.
  - **Weight 2:** Rash, Alopecia, Mucosal ulcers, Pleurisy, Pericarditis, Low complement (C3/C4), Increased DNA binding / anti-dsDNA.
  - **Weight 1:** Fever (>38°C), Thrombocytopenia (<100k), Leukopenia (<3k).
- **Audit Finding:** **HIGH-PRIORITY INCOMPLETE STUB.** Requiring clinicians to calculate descriptor weights elsewhere completely negates the utility of the tool. Furthermore, `lldas` and `doris-remission` in `wave7-rheum-activity.ts` also demand raw SLEDAI numbers from the user.
- **Remediation Recommendation:** Implement the full 24 interactive checklist items grouped by organ system or weight tier.

---

### 1.4 `pasi` — Psoriasis Area and Severity Index
- **Location:** `src/data/calculators/wave4-heme-onc.ts` (lines 1889–1964)
- **Current Inputs:** Single `numberInput('total', 'PASI total', { min: 0, max: 72 })`
- **Current Help Text:** *"Enter the total from the official PASI worksheet (0–72). Do not compute regional erythema/induration/scale here."*
- **Clinical Reality:** PASI (Fredriksson & Pettersson *Dermatologica* 1978) is the worldwide benchmark for plaque psoriasis severity, requiring evaluation across **4 anatomical body regions**:
  - Head & Neck (weight 0.1, 10% BSA)
  - Upper Limbs (weight 0.2, 20% BSA)
  - Trunk (weight 0.3, 30% BSA)
  - Lower Limbs (weight 0.4, 40% BSA)
  For each of the 4 regions, clinicians rate:
  1. *Area score (0–6):* 0 = 0%; 1 = <10%; 2 = 10%–29%; 3 = 30%–49%; 4 = 50%–69%; 5 = 70%–89%; 6 = 90%–100%.
  2. *Erythema (redness) (0–4)*
  3. *Induration (plaque thickness) (0–4)*
  4. *Desquamation (scaling) (0–4)*
  **Formula:** $\text{PASI} = 0.1(E_h+I_h+D_h)A_h + 0.2(E_u+I_u+D_u)A_u + 0.3(E_t+I_t+D_t)A_t + 0.4(E_l+I_l+D_l)A_l$.
- **Audit Finding:** **HIGH-PRIORITY INCOMPLETE STUB.** The entire complex weighted calculation is offloaded to the user.
- **Remediation Recommendation:** Provide an interactive 4-region form with inputs for Area (0–6), Erythema (0–4), Induration (0–4), and Desquamation (0–4) per region.

---

### 1.5 `isth-bat` — ISTH Bleeding Assessment Tool
- **Location:** `src/data/calculators/wave6-heme-onc.ts` (lines 359–400)
- **Current Inputs:** `cohort` ('male' | 'female' | 'child') + `total: 'ISTH-BAT total score'` (0–56)
- **Audit Finding:** **REDUNDANT DUPLICATE STUB.**
  - In `wave7-highuse.ts` (lines 2052–2263), a comprehensive, validated, 14-domain interactive implementation **already exists** as `isth-ssc-bat` (Epistaxis, Cutaneous, Minor wounds, Oral cavity, GI bleed, Hematuria, Tooth extraction, Surgery, Menorrhagia, Postpartum, Muscle hematoma, Hemarthrosis, CNS, Other).
  - The version in `wave6-heme-onc.ts` (`isth-bat`) is an unneeded legacy stub that merely checks a pre-summed number against cohort cutoffs (≥4 for men, ≥6 for women, ≥3 for children).
- **Remediation Recommendation:** Deprecate or redirect `isth-bat` to `isth-ssc-bat`, or make `isth-bat` an alias for the full 14-domain calculator in `wave7-highuse.ts`.

---

### 1.6 `gleason-grade-group` — Gleason Grade Group
- **Location:** `src/data/calculators/wave5-surg-uro-ent.ts` (lines 2498–2599)
- **Current Inputs:** Single `selectInput('gleason', 'Gleason score (primary + secondary)', ['6', '3+4', '4+3', '8', '9'])`
- **Clinical Reality:** In pathology practice (biopsy or radical prostatectomy), the pathologist determines the **Primary pattern** (most predominant architectural pattern, 3 to 5) and the **Secondary pattern** (second most predominant, 3 to 5).
  - Grade Group 1 = Gleason ≤6 (3+3)
  - Grade Group 2 = Gleason 3+4=7 (Pattern 3 predominant)
  - Grade Group 3 = Gleason 4+3=7 (Pattern 4 predominant)
  - Grade Group 4 = Gleason 8 (4+4, 3+5, 5+3)
  - Grade Group 5 = Gleason 9–10 (4+5, 5+4, 5+5)
- **Audit Finding:** The calculator currently asks the user to pick an option from a dropdown that already has the Grade Group embedded in the label description (e.g. *"Grade Group 2 — pattern 3 dominant, some pattern 4"*). It behaves like a static text dictionary rather than an interactive calculator.
- **Remediation Recommendation:** Convert to two primary inputs: `primaryPattern` (Pattern 3, 4, 5) and `secondaryPattern` (Pattern 3, 4, 5), with optional tertiary pattern or cribriform feature flagging, automatically computing the Gleason score and Grade Group.

---

### 1.7 `karnofsky` — Karnofsky Performance Status (KPS)
- **Location:** `src/data/calculators/wave2-oncology.ts` (lines 1223–1260)
- **Current Inputs:** Single `selectInput('kps', 'Karnofsky score', [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0])`
- **Clinical Reality:** Karnofsky Performance Status (Karnofsky & Burchenal 1949) is **intrinsically a single-item ordinal rating scale** (0% to 100% in 10-point steps), identical in concept to ECOG Performance Status (0 to 5). MDCalc and major clinical guidelines implement KPS as a single selection.
- **Audit Finding:** **CONFIRMED VALID SINGLE-ITEM SCALE.** It is NOT an incomplete multi-item instrument. It correctly displays all 11 definitions and maps them to ECOG equivalents. (Optional UI improvement: group options into the 3 classic functional tiers: Normal activity / Unable to work / Institutional care).

---

### 1.8 `coronary-calcium-asts` — Coronary Calcium Agatston Categories
- **Location:** `src/data/calculators/wave3-cardio-vasc.ts` (lines 1856–1920)
- **Current Inputs:** Single `numberInput('cac', 'Agatston CAC score', { unit: 'AU', min: 0, max: 10000 })`
- **Clinical Reality:** Agatston Coronary Artery Calcium (CAC) is an objective numeric density-area score calculated by CT scanner software. Clinicians receive this number from the radiology report.
- **Audit Finding:** **CONFIRMED VALID LAB/PARAMETRIC INTERPRETER.** Clinicians cannot "calculate" an Agatston score at the bedside without CT voxel density data. However, `coronary-calcium-asts` is adjacent to `mesa-cac` in the same file. In standard preventive cardiology practice (AHA/ACC 2018/2019), CAC interpretation requires both the absolute Agatston score and the demographic-adjusted percentile (MESA percentile) to make statin recommendations.
- **Remediation Recommendation:** Consider merging `coronary-calcium-asts` with `mesa-cac` into a unified "Coronary Artery Calcium (CAC) Comprehensive Interpreter" that evaluates both absolute Agatston bands (0, 1–10, 11–100, 101–400, >400) and age/sex/race percentiles.

---

## 2. Global Codebase Findings: Other Incomplete Calculators

Beyond the 8 requested calculators, our systematic audit identified **45 additional multi-item clinical instruments** that are currently implemented as 1-input stubs, plus several multi-organ aggregate tools and chained dependencies.

### 2.1 Critical Incomplete Questionnaires & Clinical Scales (Tier 1)

These calculators represent validated clinical questionnaires or multi-item diagnostic criteria where users currently have to enter a precomputed total:

| Domain | Calculator ID | Calculator Name | File Location | Current Input | Standard Clinical Structure Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Orthopedics** | `ndi-neck` | Neck Disability Index | `wave6-scores-residual.ts` | `pct: NDI disability %` | 10 sections scored 0–5 (exact twin of Oswestry ODI) |
| **Orthopedics** | `dash-upper-limb` | DASH Score | `wave6-scores-residual.ts` | `total: DASH score` | 30 questions on physical function & symptoms (1–5 Likert) |
| **Orthopedics** | `quickdash` | QuickDASH | `wave6-scores-residual.ts` | `total: QuickDASH score` | 11 validated items from DASH (1–5 Likert) |
| **Orthopedics** | `womac` | WOMAC Osteoarthritis Index | `wave6-scores-residual.ts` | `total: WOMAC total (0–96)` | 24 questions across Pain (5), Stiffness (2), Function (17) |
| **Orthopedics** | `ikdc` | IKDC Subjective Knee Form | `wave6-scores-residual.ts` | `total: IKDC total (0–100)` | 18 questions on knee symptoms, sports, and function |
| **Orthopedics** | `kujala-score` | Kujala Patellofemoral Score | `wave5-general-misc.ts` | `total: Kujala total` | 13 anterior knee pain questions with weighted options |
| **Orthopedics** | `lysholm-knee` | Lysholm Knee Score | `wave5-general-misc.ts` | `total: Lysholm total` | 8 specific knee function domains (limp, support, locking, etc.) |
| **Rheumatology** | `haq-di` | HAQ-DI Disability Index | `wave5-general-misc.ts` | `total: HAQ-DI total (0–3)` | 20 activities in 8 categories + aids/devices adjustment |
| **Rheumatology** | `basfi` | BASFI (Ankylosing Spondylitis) | `wave5-general-misc.ts` | `total: BASFI total (0–10)` | 10 visual analog scale (VAS) functional questions (0–10) |
| **Rheumatology** | `mases` | MASES Enthesitis Score | `wave5-general-misc.ts` | `total: MASES total (0–13)` | 13 specific palpation entheseal sites (0/1 each) |
| **Dermatology** | `easi-eczema` | EASI (Eczema Area & Severity) | `wave6-scores-residual.ts` | `total: EASI total (0–72)` | 4 regions (Head, Trunk, Arms, Legs) × Area & 4 severity signs |
| **Dermatology** | `scorad-eczema` | SCORAD (Atopic Dermatitis) | `wave6-scores-residual.ts` | `total: SCORAD total (0–103)` | Extent (Part A) + 6 Intensity signs (Part B) + 2 VAS (Part C) |
| **Pulmonary** | `cat-copd` | COPD Assessment Test | `wave6-scores-residual.ts` | `total: CAT total (0–40)` | 8 validated symptom questions (0–5 each) |
| **Pulmonary** | `act-asthma` | Asthma Control Test | `wave6-scores-residual.ts` | `total: ACT total (5–25)` | 5 4-week recall control questions (1–5 each) |
| **Pulmonary** | `acq-asthma` | Asthma Control Questionnaire | `wave6-scores-residual.ts` | `total: ACQ mean score` | 5–7 questions on night/morning symptoms, wheeze, rescue meds |
| **ENT** | `snot-22` | SNOT-22 Sinonasal Score | `wave6-psych-sleep.ts` | `score: SNOT-22 total (0–110)` | 22 sinonasal, sleep, and emotional symptoms (0–5 each) |
| **ENT** | `nose-scale` | NOSE Scale (Nasal Obstruction) | `wave6-psych-sleep.ts` | `raw: Sum of 5 items (0–20)` | 5 nasal congestion and breathing questions (0–4 each) |
| **ENT** | `vhi-10` | Voice Handicap Index-10 | `wave6-scores-residual.ts` | `total: VHI-10 total (0–40)` | 10 voice impairment items (0–4 each) |
| **Geriatrics/Nutrition** | `mna-sf` | Mini Nutritional Assessment SF | `wave6-scores-residual.ts` | `total: MNA-SF total (0–14)` | 6 items: Food intake, weight loss, mobility, stress, neuro, BMI |
| **Pediatrics** | `mchat-r` | M-CHAT-R Autism Toddler Screen | `wave6-psych-sleep.ts` | `score: Failed items (0–20)` | 20 yes/no behavioral screening questions for parents |
| **Neurology** | `scat5-symptom` | SCAT Concussion Symptom Score | `wave4-neuro-psych.ts` | `numSymptoms` + `severity` | 22 standard concussion symptoms rated 0–6 each |
| **Neurology** | `barthel-index` | Barthel Index of ADL | `wave6-psych-sleep.ts` | `score: Barthel total (0–100)` | 10 ADL domains (feeding, bathing, dressing, bowels, bladder, etc.) |
| **Neurology** | `pain-detect` | painDETECT Neuropathic Pain | `wave6-psych-sleep.ts` | `score: painDETECT total` | 7 sensory items (0–5) + pain course (-1 to 1) + radiation (+2) |
| **Neurology** | `psqi` | Pittsburgh Sleep Quality Index | `wave4-neuro-psych.ts` | `global: PSQI score (0–21)` | 19 questions across 7 sleep components (0–3 each) |
| **Neurology** | `restless-irlssg` | IRLS Restless Legs Severity | `wave4-neuro-psych.ts` | `score: IRLS total (0–40)` | 10 restless legs questions (0–4 each) |
| **Neurology** | `slums` | SLUMS Cognitive Exam | `wave2-neuro-psych.ts` | `score: SLUMS total (0–30)` | 11 cognitive tasks (orientation, memory, math, clock draw, shapes) |
| **Neurology** | `clock-draw` | Clock Drawing Score | `wave2-neuro-psych.ts` | `score: Clock score (0–5)` | 5-point Shulman criteria (numbers, position, hands, time) |
| **Psychiatry** | `madrs` | MADRS Depression Score | `wave2-neuro-psych.ts` | `score: MADRS total (0–60)` | 10 clinical depression items rated 0–6 each |
| **Psychiatry** | `ham-d` | HAM-D Depression Score | `wave2-neuro-psych.ts` | `score: HAM-D total` | 17 or 21 Hamilton depression items |
| **Psychiatry** | `ham-a` | HAM-A Anxiety Score | `wave2-neuro-psych.ts` | `score: HAM-A total (0–56)` | 14 somatic and psychic anxiety items (0–4 each) |
| **Psychiatry** | `bai` | Beck Anxiety Inventory | `wave2-neuro-psych.ts` | `score: BAI total (0–63)` | 21 anxiety symptoms rated 0–3 each |
| **Psychiatry** | `bdi-ii` | Beck Depression Inventory-II | `wave2-neuro-psych.ts` | `score: BDI-II total (0–63)` | 21 depression items rated 0–3 each |
| **Psychiatry** | `ymrs` | Young Mania Rating Scale | `wave2-neuro-psych.ts` | `score: YMRS total (0–60)` | 11 mania items with defined clinical anchor descriptions |
| **Psychiatry** | `isi-insomnia` | Insomnia Severity Index | `wave2-neuro-psych.ts` | `score: ISI total (0–28)` | 7 insomnia items (onset, maintenance, waking, distress; 0–4) |
| **Psychiatry** | `pcl5` | PCL-5 PTSD Checklist | `wave2-neuro-psych.ts` | `score: PCL-5 total (0–80)` | 20 DSM-5 PTSD symptoms across 4 clusters (0–4 each) |
| **Psychiatry** | `panic-pdss` | Panic Disorder Severity Scale | `wave6-psych-sleep.ts` | `score: PDSS total (0–28)` | 7 panic frequency, distress, and avoidance items (0–4 each) |
| **Psychiatry** | `lsas-social` | Liebowitz Social Anxiety Scale | `wave6-psych-sleep.ts` | `score: LSAS total (0–144)` | 24 social scenarios rated on both Fear (0–3) and Avoidance (0–3) |
| **Psychiatry** | `eat-26` | EAT-26 Eating Attitudes Test | `wave6-psych-sleep.ts` | `score: EAT-26 total (0–78)` | 26 eating attitude items (Dieting, Bulimia, Oral Control; 0–3) |
| **Psychiatry** | `cudit-r` | CUDIT-R Cannabis Use Test | `wave6-psych-sleep.ts` | `score: CUDIT-R total (0–32)` | 8 questions on cannabis consumption and problems (0–4 each) |
| **Psychiatry** | `phq-a` | PHQ-A Adolescent Depression | `wave5-tox-psych.ts` | `score: PHQ-A total (0–27)` | 9 DSM depression items modified for adolescents |
| **Psychiatry** | `sds-zung` | Zung Depression Scale | `wave5-tox-psych.ts` | `score: Zung SDS raw (20–80)` | 20 depression statements (1–4 Likert with reverse scoring) |
| **Psychiatry** | `sas-zung-anxiety`| Zung Anxiety Scale | `wave5-tox-psych.ts` | `score: Zung SAS raw (20–80)` | 20 anxiety statements (1–4 Likert with reverse scoring) |
| **Psychiatry** | `yale-brown-ocd`| Y-BOCS Obsessive Compulsive | `wave5-tox-psych.ts` | `score: Y-BOCS total (0–40)` | 10 items (5 obsession questions + 5 compulsion questions; 0–4) |
| **Psychiatry** | `cornell-dementia`| Cornell Depression in Dementia | `wave4-neuro-psych.ts` | `score: Cornell total (0–38)` | 19 depressive signs observed in dementia patients (0–2 each) |
| **Psychiatry** | `zarit-burden` | Zarit Caregiver Burden | `wave4-neuro-psych.ts` | `score: Total score` | 12 items (short form) or 22 items (full form) on caregiver stress |

*(Note: MMSE and MoCA in `gi-neuro-psych.ts` also take single total scores. While they are 30-point instruments, full administration text is often omitted due to copyright/licensing restrictions by PAR and MoCA Test Inc.)*

---

### 2.2 Pre-Tallied Organ/Domain Aggregates (Tier 2)

These tools represent multi-organ systemic calculators where the codebase asks clinicians to enter pre-tallied point totals or counts for each organ system rather than itemizing the criteria:

1. **`bvas-v3` — Birmingham Vasculitis Activity Score v3** (`wave7-rheum-activity.ts`):
   - Takes 9 integer inputs representing pre-weighted subtotals: `general` (max 7), `cutaneous` (max 6), `mucousEyes` (max 6), `ent` (max 6), `chest` (max 6), `cardiac` (max 6), `abdominal` (max 6), `renal` (max 12), `nervous` (max 9).
   - Clinical Reality: BVAS v3 contains 56 specific symptoms/findings (e.g. gangrene, episcleritis, alveolar hemorrhage, foot drop). Asking clinicians to compute weighted system sums manually creates high friction and calculation errors.
2. **`slicc-sdi` — SLICC/ACR Damage Index** (`wave7-rheum-activity.ts`):
   - Takes 12 integer inputs asking clinicians to count damage items: `ocular` (0–2), `neuro` (0–6), `renal` (0–3), `pulmonary` (0–5), `cv` (0–6), `pvd` (0–5), `gi` (0–6), `msk` (0–7), `skin` (0–3), `gonadal` (0–1), `diabetes` (0–1), `malignancy` (0–2).
   - Clinical Reality: The SDI contains 41 specific irreversible complications (e.g., avascular necrosis, cataract, chronic ESRD). Clinicians must count them mentally.
3. **`vdi-vasculitis` — Vasculitis Damage Index** (`wave7-rheum-activity.ts`):
   - Takes 11 integer inputs: `msk` (0–3), `skin` (0–3), `ocular` (0–3), `ent` (0–3), `pulmonary` (0–4), `cardiac` (0–4), `vascular` (0–4), `gi` (0–2), `renal` (0–4), `neuro` (0–4), `other` (0–3).
   - Clinical Reality: 64 specific damage items defined by the European Vasculitis Study Group.
4. **`ace-iii-total` — Addenbrooke's Cognitive Examination III** (`wave4-neuro-psych.ts`):
   - Takes direct inputs for `total (0–100)` or 5 domain subtotals (`attention 0–18`, `memory 0–26`, `fluency 0–14`, `language 0–26`, `visuospatial 0–16`).
5. **`panss-simp` — Positive and Negative Syndrome Scale** (`wave2-neuro-psych.ts`):
   - Takes `total (30–210)` and optional subscales (`positive 7–49`, `negative 7–49`, `general 16–112`) rather than scoring the 30 items.

---

### 2.3 Chained Subscore & Upstream Dependencies (Tier 3)

In several critical calculators, the tool requires the user to input a composite score that was calculated by *another* calculator, instead of accepting the native clinical parameters:

1. **`meld-na` — MELD-Na Score** (`gi-neuro-psych.ts`):
   - Current inputs: `meld: 'MELD score'` (6–40) + `na: 'Serum sodium'` (120–150).
   - Problem: The user cannot calculate MELD-Na directly from lab values (Bilirubin, INR, Creatinine, Sodium, Dialysis). They must visit the separate `meld` calculator first, copy the result, and paste it into `meld-na`. Standard MDCalc and OPTN calculators calculate both MELD and MELD-Na from the primary labs in one view.
2. **`clif-c-aclf` — CLIF-C ACLF Score** (`wave3-gi-hep.ts`):
   - Current inputs: `clifOfs: 'CLIF organ failure score (CLIF-OFs sum)'` (6–18) + `age` + `wbc`.
   - Problem: Forces clinicians to calculate `clif-sofa` elsewhere and enter the integer sum.
3. **`sic-score` — Sepsis-Induced Coagulopathy** (`wave6-heme-onc.ts`):
   - Current inputs: `inr`, `platelets`, and `sofa: 'Total SOFA (respiratory + CV + hepatic + renal only)'`.
   - Problem: The user must manually compute a 4-domain SOFA subscore (reading a massive helpText block on PaO2/FiO2, MAP/pressors, bilirubin, and creatinine) and categorize it as 0, 1, or ≥2.
4. **`lldas` & `doris-remission` — Lupus Treat-to-Target Definitions** (`wave7-rheum-activity.ts`):
   - Current inputs: Demand `sledai` (0–105) and `cSledai` as precomputed numbers alongside steroids and PGA.

---

## 3. Validated Single-Item Ordinal Scales (Tier 5 — Not Defective)

The following 44 calculators were verified to be **legitimate single-choice clinician rating scales or staging classifications**. In clinical practice and on reference platforms (MDCalc), these are standardly administered as a single categorical selection rather than a multi-question instrument:

- **Performance & Functional Status:** `iperformance` (ECOG 0–5), `karnofsky` (KPS 0–100%), `nyha` (NYHA Class I–IV), `cpc-score` (Cerebral Performance Category 1–5), `frailty-clinical` (Rockwood CFS 1–9), `mrs` (Modified Rankin Scale 0–6).
- **Sedation & Coma:** `rass` (Richmond Agitation-Sedation Scale -5 to +4), `sas-sedation` (Riker SAS 1–7), `avpu` (AVPU: Alert, Voice, Pain, Unresponsive), `hunt-hess` (Hunt and Hess Grade I–V), `glasgow-outcome` (GOS 1–5), `goese` (GOS-E 1–8).
- **Airway & Respiratory:** `mallampati` (Mallampati Class I–IV), `cormack-lehane` (Cormack-Lehane Grade I–IV), `mmrc-dyspnea` (mMRC Dyspnea Grade 0–4).
- **Cardiac & Vascular:** `killip` (Killip Class I–IV), `ehra-score` (EHRA AF Symptom Score I–IV), `ccs-angina` (CCS Angina Class I–IV).
- **Gastrointestinal:** `forrest-classification` (Forrest Grade Ia–III), `los-angeles-esophagitis` (LA Grade A–D), `bristol-stool` (Bristol Stool Type 1–7), `parkland-grading` (Parkland Cholecystitis Grade 1–5), `hinchey` / `modified-hinchey` (Diverticulitis Staging).
- **Surgical & Orthopedic:** `clavien-dindo` (Surgical Complication Grade I–V), `wound-class` (CDC Surgical Wound Class I–IV), `salter-harris` (Physeal Fracture Type I–V), `gustilo-anderson` (Open Fracture Type I–IIIc), `garden-classification` (Femoral Neck Fracture Type I–IV), `asia-impairment` (ASIA Grade A–E), `frankel-grade` (Frankel Grade A–E).
- **Oncology & Hematology Staging:** `cll-rai` (Rai Stage 0–IV), `cll-binet` (Binet Stage A–C), `mucositis-who` (WHO Oral Mucositis Grade 0–4), `breast-birads` (BI-RADS 0–6), `lung-rads` (Lung-RADS 1–4X), `li-rads` (LI-RADS LR-1 to LR-5).
- **Neurology & Pain:** `hoehn-yahr` (Parkinson Stage 1–5), `house-brackmann` (Facial Nerve Grade I–VI), `wong-baker` (FACES Pain Scale 0–10).

---

## 4. Recommended Prioritization for Future Remediation

When approved to implement fixes across the codebase, remediation should be tackled in phased waves ordered by clinical impact:

### Phase 1: High-Impact Gastroenterology & Dermatology/Rheumatology (Core Target List)
1. **`ses-cd`:** Implement the 5 segments × 4 variables (20 inputs) with auto-summing and severity bands.
2. **`pasi`:** Implement the 4 anatomical regions × (Area + Erythema + Induration + Desquamation).
3. **`sle-dai` (`sledai-2k`):** Implement the 24 weighted descriptors grouped by organ/points.
4. **`mayo-score-uc`:** Build the unified 4-component Full Mayo Score (0–12).
5. **`isth-bat`:** Replace/alias with the existing full 14-domain `isth-ssc-bat`.
6. **`gleason-grade-group`:** Refactor to take Primary (3–5) and Secondary (3–5) patterns.

### Phase 2: High-Volume Physical Medicine & Orthopedic Instruments
1. **`ndi-neck`:** Implement the 10 standard 0–5 questions (matching the completed Oswestry implementation).
2. **`dash-upper-limb` & `quickdash`:** Implement the 11-item QuickDASH and 30-item full DASH.
3. **`womac` & `ikdc`:** Implement interactive multi-item knee osteoarthritis and ligament evaluation forms.
4. **`haq-di` & `basfi`:** Implement interactive daily activity questionnaires with aids/devices logic.
5. **`mases`:** Implement the 13 anatomical enthesitis palpation sites (parallel to SPARCC).

### Phase 3: Pulmonary, ENT & General Medicine
1. **`cat-copd` & `act-asthma`:** Implement the 8 CAT questions and 5 ACT questions.
2. **`snot-22` & `nose-scale`:** Implement the 22 SNOT questions and 5 NOSE questions.
3. **`mchat-r` & `mna-sf`:** Implement the 20 autism screening questions and 6 MNA nutrition questions.
4. **`meld-na` & `clif-c-aclf`:** Accept primary laboratory/clinical variables directly rather than upstream composite scores.

### Phase 4: Psychiatry & Neuropsychology Questionnaires
1. Public domain psychiatric screening instruments: `phq-a`, `isi-insomnia`, `pcl5`, `cows` (already done), `mdq` (already done), `gds-15` (already done), `epworth` (already done).
2. For copyrighted/proprietary scales (`bai`, `bdi-ii`, `madrs`, `ham-d`, `mmse`, `moca`), maintain clear attribution and provide itemized self-assessment checklists where permissible under fair-use educational guidance or clearly disclose that they are score interpreters.

---
*End of Audit Report.*
