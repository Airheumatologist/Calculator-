# Clinical & Software Audit: Wave 5 & Wave 6 Orthopedics, Functional, Pulmonary, Allergy/ENT, and Residual Calculators

**Date:** September 15, 2026  
**Auditor:** Clinical & Software Audit Team  
**Corpus / Project:** Airheumatologist/Calculator- (`mdcalc`)  
**Context:** Following the remediation of the Oswestry Disability Index (`oswestry` in `wave6-scores-residual.ts`—which previously contained only a single `numberInput` for `ODI disability %` without any of its 10 constituent sections), this audit systematically identifies all remaining calculators that operate merely as "interpreters" of precomputed totals, scores, or percentages instead of providing point-of-care interactive questionnaires.

---

## 1. Executive Summary & Audit Methodology

### 1.1 The "Oswestry Precedent"
A clinical calculator provides little bedside utility when it requires the clinician to manually calculate a complex weighted index on paper or in a separate tool before typing the resulting number into a single input box. 

The standard of care for modern medical calculators (e.g., MDCalc, MedCalc, OrthoToolbox) requires:
1. **Interactive item-by-item completion**: Clinicians or patients can select options directly.
2. **Automatic mathematical computation**: Sums, non-linear weightings, and omission/normalization rules are computed dynamically by the engine.
3. **Risk stratification and actionable clinical guidance**: Immediate mapping to clinical guidelines, MCID (minimal clinically important difference) references, and next steps.
4. **Dual/Hybrid Entry Mode (where appropriate)**: For lengthy instruments (>20 items), supporting both direct entry of a known score and full interactive questionnaire expansion.

### 1.2 Scope of Files Inspected
We performed a deep inspection of all five targeted Wave 5 and Wave 6 calculator files:
1. `src/data/calculators/wave6-scores-residual.ts` (25 calculators)
2. `src/data/calculators/wave5-general-misc.ts` (25 calculators)
3. `src/data/calculators/wave6-clinical-residual.ts` (25 calculators)
4. `src/data/calculators/wave6-formulas-misc.ts` (25 calculators)
5. `src/data/calculators/wave5-surg-uro-ent.ts` (25 calculators)

Additionally, we scanned related cross-wave files containing Orthopedic, Functional, Allergy/ENT, and Dermatology instruments (`wave6-psych-sleep.ts`, `wave5-nephro-gi.ts`, `wave4-heme-onc.ts`, and `wave7-rheum-activity.ts`).

### 1.3 Key Findings Overview

| Category / File | Total Calculators | Pure Score Interpreters | Full Interactive / Math Formula |
|---|:---:|:---:|:---:|
| `wave6-scores-residual.ts` | 25 | **12** | 13 |
| `wave5-general-misc.ts` | 25 | **5** | 20 |
| `wave6-clinical-residual.ts` | 25 | **0** | 25 |
| `wave6-formulas-misc.ts` | 25 | **0** | 25 |
| `wave5-surg-uro-ent.ts` | 25 | **0** | 25 |
| **Primary Target Total** | **125** | **17** | **108** |
| *Related Extended Files (`wave6-psych-sleep`, `wave4-heme-onc`, `wave5-nephro-gi`)* | — | **7** | — |
| **Grand Total Candidates** | — | **24** | — |

All **17 specific calculators** highlighted by the clinical auditor were confirmed to be operating purely as precomputed score interpreters. Furthermore, **7 additional clinical questionnaires** in related files exhibit identical deficiencies.

---

## 2. Master Triage & Priority Matrix

The 24 candidates are triaged into three priority tiers based on clinical impact, standard item count, and implementation complexity:

| Calculator ID | Name | File | Specialty | Current Inputs | Standard Questionnaire Items | Priority |
|---|---|---|---|:---:|:---:|:---:|
| `ndi-neck` | Neck Disability Index | `wave6-scores-residual.ts` | Ortho / Spine | 1 (`pct`) | 10 sections (0–5 each, raw 0–50) | **HIGH** |
| `cat-copd` | COPD Assessment Test | `wave6-scores-residual.ts` | Pulmonary | 1 (`total`) | 8 semantic differential items (0–5 each, 0–40) | **HIGH** |
| `act-asthma` | Asthma Control Test | `wave6-scores-residual.ts` | Pulmonary / Allergy | 1 (`total`) | 5 items (1–5 each, 5–25) | **HIGH** |
| `acq-asthma` | Asthma Control Questionnaire | `wave6-scores-residual.ts` | Pulmonary | 2 (`total`, `version`) | 5, 6, or 7 items (0–6 Likert each, mean 0–6) | **HIGH** |
| `mna-sf` | Mini Nutritional Assessment Short Form | `wave6-scores-residual.ts` | Geriatrics / Nutrition | 1 (`total`) | 6 items (A–F, max 14 points) | **HIGH** |
| `quickdash` | QuickDASH Upper Extremity | `wave6-scores-residual.ts` | Ortho / Hand / Shoulder | 1 (`total`) | 11 items (1–5 Likert, 0–100 scale) | **HIGH** |
| `kujala-score` | Kujala Patellofemoral Score | `wave5-general-misc.ts` | Ortho / Knee | 1 (`total`) | 13 weighted items (0–100 scale) | **HIGH** |
| `lysholm-knee` | Lysholm Knee Scoring Scale | `wave5-general-misc.ts` | Ortho / Sports Knee | 1 (`total`) | 8 weighted items (0–100 scale) | **HIGH** |
| `basfi` | Bath AS Functional Index | `wave5-general-misc.ts` | Rheumatology | 1 (`total`) | 10 visual analog / NRS items (0–10 mean) | **HIGH** |
| `mases` | MASES Enthesitis Score | `wave5-general-misc.ts` | Rheumatology | 1 (`total`) | 13 anatomical tender sites (0–13 count) | **HIGH** |
| `easi-eczema` | Eczema Area & Severity Index | `wave6-scores-residual.ts` | Dermatology / Allergy | 1 (`total`) | 4 body regions × (4 signs + area) (0–72) | **HIGH** |
| `scorad-eczema` | SCORAD (Atopic Dermatitis) | `wave6-scores-residual.ts` | Dermatology / Allergy | 1 (`total`) | BSA (A) + 6 signs (B) + 2 VAS (C) (0–103) | **HIGH** |
| `vhi-10` | Voice Handicap Index-10 | `wave6-scores-residual.ts` | Otolaryngology / ENT | 1 (`total`) | 10 items (0–4 Likert, 0–40 total) | **HIGH** |
| `nose-scale` | NOSE Scale (Nasal Obstruction) | `wave6-psych-sleep.ts` | Otolaryngology / ENT | 1 (`raw`) | 5 items (0–4 Likert, raw 0–20 × 5 = 0–100) | **HIGH** |
| `barthel-index` | Barthel ADL Index | `wave6-psych-sleep.ts` | Neurology / Rehab | 1 (`score`) | 10 ADL domains (5-pt step weights, 0–100) | **HIGH** |
| `pain-detect` | painDETECT Questionnaire | `wave6-psych-sleep.ts` | Neurology / Pain | 1 (`score`) | 7 sensory items + pattern + radiation (−9–38) | **HIGH** |
| `pasi` | Psoriasis Area & Severity Index | `wave4-heme-onc.ts` | Dermatology | 1 (`total`) | 4 body regions × (3 signs + area) (0–72) | **HIGH** |
| `dash-upper-limb` | DASH (Full 30-item) | `wave6-scores-residual.ts` | Ortho / Upper Extremity | 1 (`total`) | 30 items (1–5 Likert, 0–100 scale) | **MEDIUM** |
| `womac` | WOMAC Osteoarthritis Index | `wave6-scores-residual.ts` | Ortho / Rheum | 3 (`total`, `pain`, `fn`) | 24 items: 5 pain + 2 stiffness + 17 function | **MEDIUM** |
| `ikdc` | IKDC Subjective Knee Form | `wave6-scores-residual.ts` | Ortho / Sports Knee | 1 (`total`) | 18 items across symptoms, sports, function | **MEDIUM** |
| `haq-di` | HAQ Disability Index | `wave5-general-misc.ts` | Rheumatology | 1 (`total`) | 20 items in 8 categories + aids/devices rules | **MEDIUM** |
| `snot-22` | SNOT-22 Sinonasal Test | `wave6-psych-sleep.ts` | Otolaryngology / ENT | 1 (`score`) | 22 symptoms across 5 domains (0–110) | **MEDIUM** |
| `ses-cd` | Simple Endoscopic Score for CD | `wave5-nephro-gi.ts` | Gastroenterology | 1 (`total`) | 5 intestinal segments × 4 endoscopic signs (0–56) | **MEDIUM** |
| `sle-dai` | SLEDAI-2K Lupus Activity | `wave4-heme-onc.ts` | Rheumatology | 1 (`total`) | 24 weighted organ descriptors (0–105) | **MEDIUM** |

---

## 3. Deep Clinical & Technical Audit of Targeted Instruments

### 3.1 Orthopedic & Spine Disability Measures

#### 3.1.1 `ndi-neck` — Neck Disability Index (NDI)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** A single `numberInput('pct', 'NDI disability %', { min: 0, max: 100, step: 1, defaultValue: 28 })`.
- **Standard Clinical Questionnaire:**
  - Originally developed by Vernon & Mior (1991), modeled directly after Fairbank's Oswestry Low Back Pain Questionnaire.
  - Consists of **10 sections**, each scored 0 to 5 (0 = No disability / pain, 5 = Complete disability):
    1. *Section 1: Pain Intensity* (0 = No pain, 5 = Worst pain imaginable)
    2. *Section 2: Personal Care (Washing, Dressing)* (0 = Normal without extra pain, 5 = Do not get dressed, stay in bed)
    3. *Section 3: Lifting* (0 = Heavy weights without extra pain, 5 = Cannot lift or carry anything at all)
    4. *Section 4: Reading* (0 = Read as much as I want without pain, 5 = Cannot read at all)
    5. *Section 5: Headaches* (0 = No headaches at all, 5 = Headaches almost all the time)
    6. *Section 6: Concentration* (0 = Can concentrate fully without difficulty, 5 = Cannot concentrate at all)
    7. *Section 7: Work* (0 = Can do as much work as I want, 5 = Cannot do any work at all)
    8. *Section 8: Driving* (0 = Can drive without neck pain, 5 = Cannot drive at all; *optional / NA allowed for non-drivers*)
    9. *Section 9: Sleeping* (0 = Sleep never disturbed, 5 = Cannot sleep at all)
    10. *Section 10: Recreation* (0 = Engage in all recreation without pain, 5 = Cannot engage in any recreation)
  - Scoring Formula: `NDI % = [Raw Sum / (5 × Number of Answered Sections)] × 100%`.
- **MDCalc Practice:** MDCalc presents all 10 interactive sections with radio buttons. Clinicians and physical therapists expect to check off patient answers directly.
- **Feasibility & Recommendation:** **High Feasibility.** Identical architecture to the updated `oswestry` calculator in `wave6-scores-residual.ts`. Replace the single input with 10 `selectInput` dropdowns. Include an `Omit / Not applicable` (-1) option for Section 8 (Driving) with Fairbank denominator reduction.
- **Priority:** **HIGH** (Direct ODI twin).

---

#### 3.1.2 `quickdash` — QuickDASH (Disabilities of the Arm, Shoulder and Hand - Short Form)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'QuickDASH score', { min: 0, max: 100, step: 0.1, defaultValue: 32 })`.
- **Standard Clinical Questionnaire:**
  - Developed by Beaton et al. (2005) under the Institute for Work & Health (IWH) / AAOS.
  - Consists of **11 items**, each scored on a 5-point Likert scale (1 = No difficulty / No symptom, 5 = Unable to do / Extreme):
    1. *Open a tight or new jar* (1–5)
    2. *Do heavy household chores (e.g., wash walls, wash floors)* (1–5)
    3. *Carry a shopping bag or briefcase* (1–5)
    4. *Wash your back* (1–5)
    5. *Use a knife to cut food* (1–5)
    6. *Recreational activities requiring force or impact through arm, shoulder, or hand* (1–5)
    7. *Extremity problem interfered with normal social activities with family/friends* (1–5)
    8. *Limitation in work or other regular daily activities* (1–5)
    9. *Arm, shoulder, or hand pain severity* (1–5)
    10. *Tingling (pins and needles) in arm, shoulder, or hand* (1–5)
    11. *Difficulty sleeping because of pain in arm, shoulder, or hand* (1–5)
  - Scoring Formula: Requires at least 10 of 11 items answered. `QuickDASH = [((Sum of answered items / n) − 1) × 25]`. Range: 0–100.
- **MDCalc Practice:** On MDCalc and OrthoToolbox, QuickDASH is completely interactive. Clinicians use QuickDASH specifically because it takes less than 60 seconds to complete bedside or in clinic.
- **Feasibility & Recommendation:** **High Feasibility.** 11 items is the sweet spot for interactive clinical web tools. Add 11 `selectInput` controls with standard Likert options.
- **Priority:** **HIGH**.

---

#### 3.1.3 `dash-upper-limb` — DASH (Disabilities of the Arm, Shoulder and Hand - Full Form)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'DASH disability/symptom score', { min: 0, max: 100, defaultValue: 35 })`.
- **Standard Clinical Questionnaire:**
  - 30 items: 21 functional tasks, 5 symptoms (pain, pain with activity, tingling, weakness, stiffness), 4 social/psychological/sleep items.
  - Scored 1 to 5; requires ≥27 answered items: `DASH = [((Sum / n) − 1) × 25]`. Range 0–100.
- **MDCalc Practice:** Full DASH is often completed by patients on a tablet or paper form. MDCalc prioritizes QuickDASH, but clinical systems offering full DASH use collapsible sections (Functional, Symptoms, Impact) or hybrid entry.
- **Feasibility & Recommendation:** **Medium Feasibility.** 30 individual dropdowns creates a tall page. Recommended approach: **Hybrid mode**—provide an entry switch: `Mode: "Enter precomputed total (0–100)"` vs `"Complete 30-item questionnaire"`.
- **Priority:** **MEDIUM**.

---

#### 3.1.4 `womac` — Western Ontario and McMaster Universities Osteoarthritis Index
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** `numberInput('total', 'WOMAC total (0–96 Likert)')` plus optional `numberInput('pain')` and `numberInput('function')`.
- **Standard Clinical Questionnaire:**
  - Bellamy et al. (1988); endorsed by OMERACT.
  - **24 items** across **3 subscales** (5-point Likert: 0 = None, 1 = Mild, 2 = Moderate, 3 = Severe, 4 = Extreme):
    - *Pain Subscale (5 items, 0–20)*: Walking on flat floor, going up/down stairs, at night in bed, sitting or lying, standing upright.
    - *Stiffness Subscale (2 items, 0–8)*: Morning stiffness upon waking, stiffness occurring later in the day after resting.
    - *Physical Function Subscale (17 items, 0–68)*: Descending stairs, ascending stairs, rising from sitting, standing, bending to floor, walking on flat ground, getting in/out of car, shopping, putting on socks, rising from bed, taking off socks, lying in bed, getting in/out of bath, sitting, getting on/off toilet, heavy domestic duties, light domestic duties.
  - Total Score: Likert sum 0–96 (higher = worse symptoms).
- **MDCalc Practice:** MDCalc groups WOMAC into three distinct tabs or collapsible cards (Pain, Stiffness, Function), computing both subscale totals and the grand total.
- **Feasibility & Recommendation:** **Medium/High Feasibility.** Provide 3 domain sections (5 + 2 + 17 items) or a dual toggle (enter subscale totals vs answer individual questions).
- **Priority:** **MEDIUM** (24 items, standard hip/knee OA trial endpoint).

---

#### 3.1.5 `ikdc` — IKDC Subjective Knee Form
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'IKDC subjective total', { min: 0, max: 100, defaultValue: 65 })`.
- **Standard Clinical Questionnaire:**
  - Irrgang et al. (2001); International Knee Documentation Committee.
  - **18 items** covering Symptoms (pain, stiffness, swelling, locking, giving way), Sports Activity, and Knee Function.
  - Complex item response formats:
    - Item 1 (activity without pain): 5 ordinal options (0–4)
    - Item 2 & 3 (pain frequency & severity): 0–10 scale
    - Item 4 (stiffness/swelling): 5 ordinal options (0–4)
    - Item 5, 7, 8 (highest activity level without swelling/giving way/participation): 5 ordinal options (0–4)
    - Item 6 (locking/catching): binary Yes/No
    - Item 9 (function across 9 daily activities 9a–9i): 5 options each (0–4)
    - Item 10 (function prior to injury vs now): 0–10 scale
  - Scoring: Sum of raw items transformed: `(Raw Score / Maximum Possible Raw Score) × 100`. Range: 0–100 (higher = better function).
- **MDCalc Practice:** Orthopedic calculators provide the 18 items with automated scaling. Because the response scales vary widely (0–1, 0–4, 0–10), manual scoring without software is error-prone.
- **Feasibility & Recommendation:** **Medium Feasibility.** Encode the distinct response scales for the 18 items.
- **Priority:** **MEDIUM** (18 items, sports medicine/ACL reconstruction).

---

#### 3.1.6 `kujala-score` — Kujala Patellofemoral / Anterior Knee Pain Score (AKPS)
- **File:** `src/data/calculators/wave5-general-misc.ts`
- **Current State:** Single `numberInput('total', 'Kujala total score', { min: 0, max: 100, defaultValue: 70 })`.
- **Standard Clinical Questionnaire:**
  - Kujala et al. (1993, *Arthroscopy*).
  - **13 items** with highly non-linear, arbitrary historical weights:
    1. *Limp*: None (5), Slight/periodic (3), Constant (0)
    2. *Support*: Full support without pain (5), One cane/crutch (3), Weight-bearing impossible (0)
    3. *Walking*: Unlimited (5), >5 km (3), 1–2 km (2), Unable (0)
    4. *Stairs*: No difficulty (10), Slight pain descending (8), Pain ascending/descending (5), One step at a time (2), Unable (0)
    5. *Squatting*: No difficulty (5), Repeated squatting painful (4), Painful each time (3), Possible with partial weight (2), Unable (0)
    6. *Running*: No difficulty (10), Pain after >2 km (7), Slight pain from start (5), Severe pain (2), Unable (0)
    7. *Jumping*: No difficulty (10), Slight difficulty (7), Constant pain (2), Unable (0)
    8. *Prolonged sitting with knees bent*: No difficulty (10), Pain after exercise (7), Constant pain (4), Forces leg straightening (0)
    9. *Pain*: None (10), Slight/occasional (8), Interferes with sleep (6), Occasionally severe (4), Severe/constant (0)
    10. *Swelling*: None (10), After heavy exertion (7), After daily activities (4), Constant (0)
    11. *Abnormal kneecap movements / subluxations*: None (10), Sports only (6), Daily activities (4), Dislocation at least once (0)
    12. *Atrophy of thigh*: None (5), Slight (3), Severe (0)
    13. *Flexion deficiency*: None (5), Slight (3), Severe (0)
  - Total: 0–100 (100 = asymptomatic normal knee).
- **MDCalc Practice:** On MDCalc, Kujala is ALWAYS scored by selecting the 13 options. Clinicians do not memorize the point allocations (some items are worth 10 points, others 5, with irregular steps like 8, 7, 4, 3, 2).
- **Feasibility & Recommendation:** **High Feasibility.** 13 `selectInput` dropdowns with exact Kujala point mappings. This is a quintessential clinical calculator use-case.
- **Priority:** **HIGH**.

---

#### 3.1.7 `lysholm-knee` — Lysholm Knee Scoring Scale
- **File:** `src/data/calculators/wave5-general-misc.ts`
- **Current State:** Single `numberInput('total', 'Lysholm total', { min: 0, max: 100, defaultValue: 75 })`.
- **Standard Clinical Questionnaire:**
  - Lysholm & Gillquist (1982, *Am J Sports Med*).
  - **8 items** with non-uniform point assignments:
    1. *Limp* (0, 3, 5)
    2. *Support (cane/crutches)* (0, 2, 5)
    3. *Locking sensation* (0 = locked, 2 = frequently, 6 = occasionally, 10 = catching sensation without locking, 15 = none)
    4. *Instability / Giving way* (0 = every step, 5 = frequently in ADLs, 10 = occasionally in ADLs, 15 = frequently in athletics, 20 = rarely in athletics, 25 = never)
    5. *Pain* (0 = constant/severe, 5 = on walking <2 km, 10 = on walking >2 km, 15 = marked during severe exertion, 20 = inconstant/slight during severe exertion, 25 = none)
    6. *Swelling* (0 = constant, 2 = on ordinary exertion, 6 = on severe exertion, 10 = none)
    7. *Stair climbing* (0 = impossible, 2 = one step at a time, 6 = slightly impaired, 10 = no problems)
    8. *Squatting* (0 = impossible, 2 = not beyond 90°, 4 = slightly impaired, 5 = no problems)
  - Total: 0–100 (≥95 excellent, 84–94 good, 65–83 fair, <65 poor).
- **MDCalc Practice:** MDCalc presents all 8 questions. The point values (15, 25, 25, etc.) are impossible to calculate mentally.
- **Feasibility & Recommendation:** **High Feasibility.** Exactly 8 dropdowns. Straightforward implementation.
- **Priority:** **HIGH** (Direct ODI equivalent for knee surgery).

---

### 3.2 Pulmonary & Allergy Questionnaires

#### 3.2.1 `cat-copd` — COPD Assessment Test (CAT)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'CAT total', { min: 0, max: 40, defaultValue: 15 })`.
- **Standard Clinical Questionnaire:**
  - Jones et al. (2009, *Eur Respir J*); embedded in all GOLD (Global Initiative for Chronic Obstructive Lung Disease) guidelines.
  - **8 semantic differential items** (scored 0 to 5):
    1. *Cough*: I never cough (0) → I cough all the time (5)
    2. *Phlegm*: My chest is completely clear (0) → My chest is completely full of phlegm (5)
    3. *Chest Tightness*: My chest does not feel tight at all (0) → My chest feels very tight (5)
    4. *Breathlessness*: Not breathless climbing hill/stairs (0) → Very breathless climbing hill/stairs (5)
    5. *Activity Limitation*: Not limited in any activities at home (0) → Very limited in activities at home (5)
    6. *Confidence*: Confident leaving home despite chest (0) → Not at all confident leaving home (5)
    7. *Sleep*: I sleep soundly (0) → I do not sleep soundly because of my chest (5)
    8. *Energy*: I have lots of energy (0) → I have no energy at all (5)
  - Total: 0–40. Threshold ≥10 divides low symptom impact from high symptom impact (essential for GOLD ABE group assignment).
- **MDCalc Practice:** MDCalc has an interactive 8-item interface with clear anchors. Clinicians calculate this routinely at every routine COPD clinic visit.
- **Feasibility & Recommendation:** **High Feasibility.** 8 items with 0–5 options. Uncomplicated and fast to implement.
- **Priority:** **HIGH**.

---

#### 3.2.2 `act-asthma` — Asthma Control Test (ACT)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'ACT total', { min: 5, max: 25, defaultValue: 18 })`.
- **Standard Clinical Questionnaire:**
  - Nathan et al. (2004, *JACI*); recommended by GINA and NAEPP/EPR-4.
  - **5 questions** assessing asthma control over the past 4 weeks (each scored 1 to 5):
    1. *Work/School/Home Limitation*: All of the time (1), Most (2), Some (3), A little (4), None of the time (5)
    2. *Shortness of Breath*: More than once a day (1), Once a day (2), 3–6 times/wk (3), 1–2 times/wk (4), Not at all (5)
    3. *Nighttime Awakenings*: 4 or more nights/wk (1), 2–3 nights/wk (2), Once a week (3), Once or twice (4), Not at all (5)
    4. *Rescue Inhaler Use*: 3 or more times/day (1), 1–2 times/day (2), 2–3 times/wk (3), Once a week or less (4), Not at all (5)
    5. *Self-Rated Control*: Not controlled at all (1), Poorly controlled (2), Somewhat controlled (3), Well controlled (4), Completely controlled (5)
  - Total: 5–25 (≤19 indicates uncontrolled asthma; 20–24 well-controlled; 25 totally controlled).
- **MDCalc Practice:** MDCalc provides all 5 questions with radio buttons. Clinicians hand the phone/tablet to the patient or read the 5 questions aloud.
- **Feasibility & Recommendation:** **High Feasibility.** Only 5 items. Trivial and high-impact.
- **Priority:** **HIGH**.

---

#### 3.2.3 `acq-asthma` — Asthma Control Questionnaire (Juniper ACQ)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** `numberInput('total', 'ACQ mean score', { min: 0, max: 6, step: 0.01 })` + informational version dropdown.
- **Standard Clinical Questionnaire:**
  - Elizabeth Juniper et al. (1999, *Eur Respir J*).
  - Three validated variants:
    - *ACQ-5*: 5 symptom items (night waking, morning symptoms, activity limitation, shortness of breath, wheezing).
    - *ACQ-6*: ACQ-5 + 1 item on daily rescue bronchodilator use (puffs/day).
    - *ACQ-7*: ACQ-6 + 1 item on pre-bronchodilator FEV1% predicted.
  - All items scored on a 7-point scale (0 = Totally controlled / No impairment, 6 = Severely uncontrolled).
  - Final Score = Arithmetic mean of answered items (0.00 to 6.00). Cutoffs: ≤0.75 well-controlled; ≥1.50 uncontrolled; MCID = 0.5.
- **MDCalc Practice:** Clinical calculators allow selecting the version (ACQ-5, 6, or 7) and checking the 7-point Likert items, computing the decimal mean.
- **Feasibility & Recommendation:** **High Feasibility.** Support version selection and 5–7 items, with fallback to direct mean entry.
- **Priority:** **HIGH**.

---

### 3.3 Otolaryngology & ENT Instruments

#### 3.3.1 `vhi-10` — Voice Handicap Index-10
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'VHI-10 total', { min: 0, max: 40, defaultValue: 12 })`.
- **Standard Clinical Questionnaire:**
  - Rosen et al. (2004, *Laryngoscope*); validated short form of Jacobson's 30-item VHI.
  - **10 questions** assessing physical, functional, and emotional impact of voice disorders (each scored 0–4: 0 = Never, 1 = Almost never, 2 = Sometimes, 3 = Almost always, 4 = Always):
    1. *My voice makes it difficult for people to hear me.*
    2. *People have difficulty understanding me in a noisy room.*
    3. *My family has difficulty hearing me when I call them throughout the house.*
    4. *I use the phone less often than I would like.*
    5. *I'm tense when talking to others because of my voice.*
    6. *I tend to avoid groups of people because of my voice.*
    7. *People seem irritated with my voice.*
    8. *I find other people don't understand my voice problem.*
    9. *My voice problem upsets me.*
    10. *People ask, "What's wrong with your voice?"*
  - Total: 0–40 (score >11 is abnormal in general populations).
- **MDCalc Practice:** Used extensively in ENT, laryngology, and speech pathology clinics as an interactive 10-item questionnaire.
- **Feasibility & Recommendation:** **High Feasibility.** 10 standard `selectInput` questions.
- **Priority:** **HIGH**.

---

#### 3.3.2 `nose-scale` — Nasal Obstruction Symptom Evaluation (NOSE)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current State:** Single `numberInput('raw', 'Sum of 5 NOSE items (0–20)')`.
- **Standard Clinical Questionnaire:**
  - Stewart et al. (2004, *Otolaryngol Head Neck Surg*); official AAO-HNSF instrument.
  - **5 items** (each scored 0–4: 0 = Not a problem, 1 = Very mild, 2 = Moderate, 3 = Fairly bad, 4 = Severe problem):
    1. *Nasal congestion or stuffiness*
    2. *Nasal blockage or obstruction*
    3. *Trouble breathing through my nose*
    4. *Trouble sleeping*
    5. *Unable to get enough air through my nose during exercise or exertion*
  - Scoring: `Scaled Score = (Sum of 5 items) × 5`. Range: 0–100.
- **MDCalc Practice:** Interactive 5-question form.
- **Feasibility & Recommendation:** **High Feasibility.** Only 5 items. Trivial and high-yield.
- **Priority:** **HIGH**.

---

#### 3.3.3 `snot-22` — Sino-Nasal Outcome Test-22
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current State:** Single `numberInput('score', 'SNOT-22 total (0–110)')`.
- **Standard Clinical Questionnaire:**
  - Hopkins et al. (2009); 22 sinonasal and quality-of-life items scored 0 to 5 (total 0–110).
- **MDCalc Practice:** MDCalc and Rhinology tools provide the 22 items grouped by subdomains (Nasal, Extranasal, Ear/Facial, Sleep, Psychological).
- **Feasibility & Recommendation:** **Medium Feasibility.** 22 items. Recommend hybrid mode (enter 22 items or enter total).
- **Priority:** **MEDIUM**.

---

### 3.4 Rheumatology Functional & Activity Measures

#### 3.4.1 `haq-di` — Health Assessment Questionnaire Disability Index
- **File:** `src/data/calculators/wave5-general-misc.ts`
- **Current State:** Single `numberInput('total', 'HAQ-DI total', { min: 0, max: 3, step: 0.125, defaultValue: 1 })`.
- **Standard Clinical Questionnaire:**
  - Fries et al. (1980, *Arthritis Rheum*).
  - **20 activities** grouped into **8 functional categories**:
    1. *Dressing & Grooming* (dress oneself, shampoo hair)
    2. *Arising* (stand up from straight chair, get in/out of bed)
    3. *Eating* (cut meat, lift full glass, open milk carton)
    4. *Walking* (walk outdoors on flat ground, climb 5 steps)
    5. *Hygiene* (wash/dry body, take tub bath, get on/off toilet)
    6. *Reach* (reach down 5-lb object from overhead, bend to pick up clothing)
    7. *Grip* (open car door, open jars, turn faucets)
    8. *Activities* (run errands/shop, get in/out of car, vacuuming/yardwork)
  - Scoring: Each category is scored 0–3 based on highest difficulty item. If devices/aids are used or human help is required, category score is raised to minimum 2. Final HAQ-DI = average of the 8 category scores (0.0 to 3.0).
- **MDCalc Practice:** Calculating the device-adjustment and category maximums manually is notoriously frustrating for rheumatologists. Software that automates the 8 category maxes and device adjustments provides immense clinical value.
- **Feasibility & Recommendation:** **Medium Feasibility.** Can implement as 8 category score pickers (with companion device checkboxes) or full 20 items.
- **Priority:** **MEDIUM**.

---

#### 3.4.2 `basfi` — Bath Ankylosing Spondylitis Functional Index
- **File:** `src/data/calculators/wave5-general-misc.ts` *(Cross-reference: `wave7-rheum-activity.ts`)*
- **Current State:** In `wave5-general-misc.ts`, it has only a single `numberInput('total', 'BASFI total (mean of 10 items)', { min: 0, max: 10, defaultValue: 4 })`.
- **Codebase Anomaly Detected:** In `src/data/calculators/wave7-rheum-activity.ts`, an alternate implementation `id: 'basfi-10'` already exists with all 10 items mapped! However, the calculator in `wave5-general-misc.ts` (`id: 'basfi'`) remains a truncated 1-input interpreter.
- **Standard Clinical Questionnaire:**
  - Calin et al. (1994); 10 functional daily tasks scored on a 0–10 numeric rating scale (0 = easy, 10 = impossible).
  - Final score = arithmetic mean of 10 items.
- **Feasibility & Recommendation:** **High Feasibility.** Harmonize the codebase: update `wave5-general-misc.ts` to use the 10 items or alias it to the Wave 7 implementation.
- **Priority:** **HIGH**.

---

#### 3.4.3 `mases` — Maastricht Ankylosing Spondylitis Enthesitis Score
- **File:** `src/data/calculators/wave5-general-misc.ts`
- **Current State:** Single `numberInput('total', 'MASES total (tender sites)', { min: 0, max: 13, defaultValue: 2 })`.
- **Standard Clinical Questionnaire:**
  - Heuft-Dorenbosch et al. (2003, *Ann Rheum Dis*).
  - **13 anatomical sites** examined for tenderness (binary 0 = Absent, 1 = Tender):
    1. 1st Costochondral joint, Right
    2. 1st Costochondral joint, Left
    3. 7th Costochondral joint, Right
    4. 7th Costochondral joint, Left
    5. Posterior Superior Iliac Spine (PSIS), Right
    6. Posterior Superior Iliac Spine (PSIS), Left
    7. Anterior Superior Iliac Spine (ASIS), Right
    8. Anterior Superior Iliac Spine (ASIS), Left
    9. Iliac Crest, Right
    10. Iliac Crest, Left
    11. 5th Lumbar spinous process
    12. Achilles tendon insertion, Right
    13. Achilles tendon insertion, Left
  - Total: 0–13 count of tender sites.
- **MDCalc Practice:** MDCalc presents the 13 anatomical sites as interactive checkboxes. Clinicians tap each tender site during physical examination.
- **Feasibility & Recommendation:** **High Feasibility.** 13 `yesNo` or checkbox items.
- **Priority:** **HIGH**.

---

### 3.5 Dermatology Composite Severity Scores

#### 3.5.1 `easi-eczema` — EASI (Eczema Area and Severity Index)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'EASI total', { min: 0, max: 72, defaultValue: 16 })`.
- **Standard Clinical Questionnaire:**
  - Hanifin et al. (2001, *Exp Dermatol*); primary endpoint in atopic dermatitis RCTs and treat-to-target clinics.
  - **4 body regions**: Head & neck (multiplier 0.1), Upper limbs (0.2), Trunk (0.3), Lower limbs (0.4).
  - For each region, the clinician scores:
    - *Area score* (0 = 0%, 1 = 1–9%, 2 = 10–29%, 3 = 30–49%, 4 = 50–69%, 5 = 70–89%, 6 = 90–100%)
    - *4 clinical signs* (0 = None, 1 = Mild, 2 = Moderate, 3 = Severe):
      1. Erythema
      2. Induration / Papulation / Edema
      3. Excoriation
      4. Lichenification
  - Formula: `EASI = Σ [ (Erythema + Induration + Excoriation + Lichenification) × Area Score × Multiplier ]`. Total: 0.0 to 72.0.
- **MDCalc Practice:** On MDCalc and DermNet, EASI is ALWAYS interactive. Calculating the regional multipliers (0.1, 0.2, 0.3, 0.4) and multiplying by area scores in one's head is completely impractical.
- **Feasibility & Recommendation:** **High Feasibility.** 4 region sections with area + 4 signs.
- **Priority:** **HIGH**.

---

#### 3.5.2 `scorad-eczema` — SCORAD (Severity Scoring of Atopic Dermatitis)
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'SCORAD total', { min: 0, max: 103, defaultValue: 35 })`.
- **Standard Clinical Questionnaire:**
  - Consensus Report of the European Task Force on Atopic Dermatitis (1993, *Dermatology*).
  - Formula: `SCORAD = A / 5 + 7B / 2 + C` (Total: 0–103):
    - *Part A (Extent)*: % BSA affected (0–100% using rule of nines).
    - *Part B (Intensity)*: Sum of 6 representative signs scored 0–3 (Erythema, Edema/Papulation, Oozing/Crusting, Excoriation, Lichenification, Dryness) (max 18).
    - *Part C (Subjective Symptoms)*: Pruritus VAS (0–10) + Sleeplessness VAS (0–10) over past 3 days (max 20).
  - Also outputs *Objective SCORAD* (`A/5 + 7B/2`, max 83).
- **MDCalc Practice:** Full interactive calculator with inputs for % BSA, 6 intensity signs, and 2 visual analog scales.
- **Feasibility & Recommendation:** **High Feasibility.** Only 9 total inputs.
- **Priority:** **HIGH**.

---

### 3.6 Geriatric & Functional Assessment

#### 3.6.1 `mna-sf` — Mini Nutritional Assessment – Short Form
- **File:** `src/data/calculators/wave6-scores-residual.ts`
- **Current State:** Single `numberInput('total', 'MNA-SF total', { min: 0, max: 14, defaultValue: 10 })`.
- **Standard Clinical Questionnaire:**
  - Rubenstein et al. (2001); Nestlé Nutrition Institute.
  - **6 questions (A through F)**:
    - *Item A*: Has food intake declined over past 3 months due to loss of appetite, digestion, chewing/swallowing? (0 = severe, 1 = moderate, 2 = no decrease)
    - *Item B*: Weight loss during past 3 months? (0 = >3 kg [6.6 lbs], 1 = does not know, 2 = 1–3 kg [2.2–6.6 lbs], 3 = no weight loss)
    - *Item C*: Mobility? (0 = bed or chair bound, 1 = able to get out of bed/chair but does not go out, 2 = goes out)
    - *Item D*: Suffered psychological stress or acute disease in past 3 months? (0 = yes, 2 = no)
    - *Item E*: Neuropsychological problems? (0 = severe dementia or depression, 1 = mild dementia, 2 = no psychological problems)
    - *Item F*: BMI (0 = <19, 1 = 19–<21, 2 = 21–<23, 3 = ≥23) OR Calf Circumference (CC: 0 = <31 cm, 3 = ≥31 cm, if BMI unavailable)
  - Total: 0–14 (12–14 normal, 8–11 at risk, 0–7 malnourished).
- **MDCalc Practice:** Full interactive 6-question questionnaire with toggle for BMI vs Calf Circumference.
- **Feasibility & Recommendation:** **High Feasibility.** 6 standardized items.
- **Priority:** **HIGH**.

---

#### 3.6.2 `barthel-index` — Barthel ADL Index
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current State:** Single `numberInput('score', 'Barthel Index total (0–100)')`.
- **Codebase Anomaly Detected:** In `wave6-psych-sleep.ts`, the developer literally typed out the full clinical rubric and point values for all 10 ADLs inside the `helpText` string (over 800 characters) because the interactive inputs were missing!
- **Standard Clinical Questionnaire:**
  - Mahoney & Barthel (1965, *Md State Med J*). **Public Domain.**
  - **10 ADL domains**: Feeding (0/5/10), Bathing (0/5), Grooming (0/5), Dressing (0/5/10), Bowels (0/5/10), Bladder (0/5/10), Toilet use (0/5/10), Transfers (0/5/10/15), Mobility (0/5/10/15), Stairs (0/5/10). Total 0–100.
- **MDCalc Practice:** Always interactive 10 ADL pickers.
- **Feasibility & Recommendation:** **High Feasibility.** Public domain instrument. Implement 10 categorical `selectInput` dropdowns.
- **Priority:** **HIGH**.

---

## 4. Architectural & Implementation Strategy

### 4.1 UI & Component Architecture
To ensure seamless user experience without cluttering the interface:

1. **Short Questionnaires (≤12 items)**:
   - *Candidates:* `ndi-neck`, `cat-copd`, `act-asthma`, `acq-asthma`, `mna-sf`, `quickdash`, `kujala-score`, `lysholm-knee`, `basfi`, `mases`, `vhi-10`, `nose-scale`, `barthel-index`.
   - *Design:* Direct full questionnaire expansion using standard `selectInput` and `yesNo` controls.

2. **Multi-Region / Matrix Instruments**:
   - *Candidates:* `easi-eczema`, `scorad-eczema`, `pasi`.
   - *Design:* Dedicated regional group cards (Head, Upper Limbs, Trunk, Lower Limbs) with clean sliders or segmented controls for area (0–6) and signs (0–3).

3. **Lengthy PROMs (>15 items) — The "Dual-Entry" Pattern**:
   - *Candidates:* `dash-upper-limb` (30 items), `womac` (24 items), `ikdc` (18 items), `haq-di` (20 items), `snot-22` (22 items).
   - *Design:* Add a top-level mode selector:
     ```ts
     selectInput('entryMode', 'Data Entry Mode', [
       { label: 'Calculate from interactive questionnaire', value: 'survey' },
       { label: 'Enter precomputed score / total', value: 'direct' }
     ], 'survey')
     ```
     When `direct` is selected, display the single `numberInput` for total. When `survey` is selected, expand the structured question groups.

### 4.2 Copyright & Licensing Guidelines
- **Public Domain / Open Access Instruments**: Instruments such as NDI (Vernon & Mior), QuickDASH (IWH/AAOS open clinical version), Barthel Index (Mahoney & Barthel, 1965), ACT (Nathan/GSK clinical version), CAT (GOLD/Jones), MNA-SF (Nestlé open clinical screening form), and Kujala/Lysholm are standard open medical instruments widely published in peer-reviewed medical literature. Standard clinical phrasing and established Likert anchors can be safely implemented.
- **Proprietary Trademarks**: Preserve standard attribution, citations, and disclaimer notes in the `evidence` and `pearls` sections of each calculator object.

---

## 5. Summary & Action Plan

1. **Immediate Wave 1 Remediation (12 High-Priority Instruments)**:
   - `ndi-neck` (10 sections)
   - `cat-copd` (8 items)
   - `act-asthma` (5 items)
   - `acq-asthma` (5–7 items)
   - `mna-sf` (6 items)
   - `quickdash` (11 items)
   - `kujala-score` (13 items)
   - `lysholm-knee` (8 items)
   - `mases` (13 sites)
   - `easi-eczema` (4 regions)
   - `scorad-eczema` (9 components)
   - `vhi-10` (10 items)

2. **Wave 2 Remediation (Medium-Priority & Complex Matrices)**:
   - `dash-upper-limb` (30 items with dual-entry)
   - `womac` (24 items across 3 subscales)
   - `ikdc` (18 items)
   - `haq-di` (8 categories with aids/device rules)
   - `nose-scale` & `snot-22` in ENT
   - `barthel-index` in Neurology/Rehab

3. **Codebase Harmonization**:
   - Resolve the duplicate BASFI calculators between `wave5-general-misc.ts` (`basfi`, truncated) and `wave7-rheum-activity.ts` (`basfi-10`, full 10 items).

---
*End of Clinical & Software Audit Report.*
