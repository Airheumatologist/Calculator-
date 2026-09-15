# Clinical & Software Audit: Psych, Neuro, Sleep, Cognitive, and Screening Calculators

**Date:** September 15, 2026  
**Auditor:** Clinical & Software Audit Team  
**Scope:** Investigation of incomplete "score interpreter" calculators across the codebase, focusing on psychiatry, neurology, sleep medicine, cognitive assessment, and clinical screening tools.  
**Target Files Inspected:**
1. `src/data/calculators/wave6-psych-sleep.ts`
2. `src/data/calculators/wave5-tox-psych.ts`
3. `src/data/calculators/wave4-neuro-psych.ts`
4. `src/data/calculators/wave2-neuro-psych.ts`
5. `src/data/calculators/gi-neuro-psych.ts`
6. `src/data/calculators/missing-neuro-psych.ts`

---

## 1. Executive Summary & Audit Context

### 1.1 The "Oswestry Precedent"
In earlier iterations of this codebase, several complex patient-reported outcome measures (PROMs) and clinical scoring batteries were scaffolded merely as **"score interpreters"**—tools accepting only a single `numberInput` for a precomputed score or percentage (e.g., the Oswestry Disability Index previously accepting only a single `ODI disability %` without the 10 constituent functional questions). 

While a score interpreter is useful when a clinician already holds a pre-calculated number from an EHR or paper sheet, it fails the core value proposition of a point-of-care clinical calculator like MDCalc: **allowing clinicians and patients to complete the assessment directly at the bedside or in clinic, automatically compute the score, and obtain instant risk stratification.**

Following the successful remediation of the Oswestry Disability Index (which restored all 10 clinical sections, standard 0–5 options, and Fairbank omission-handling logic in `wave6-scores-residual.ts`), this audit systematically inspects the neurology, psychiatry, sleep, and cognitive calculator files to detect all similar gaps.

### 1.2 Summary of Findings Across 6 Files
Out of **112 calculators** contained in the 6 target files, **38 calculators** were identified as functioning either wholly or predominantly as score interpreters or truncated helpers.

These 38 calculators fall into three distinct legal and clinical categories:

| Category / Tier | Count | Definition | Examples | Strategy |
|---|:---:|---|---|---|
| **Tier 1: High Priority (Open, 5–20 Items)** | **17** | Validated, public-domain or open-access instruments with 5–20 questions. Widely provided on MDCalc/MedCalc. | `mchat-r`, `barthel-index`, `pcl5`, `madrs`, `ham-a`, `ham-d`, `ymrs`, `yale-brown-ocd`, `cudit-r`, `isi-insomnia`, `cornell-dementia`, `pain-detect`, `nose-scale`, `phq-a`, `slums`, `aspects`, `psqi` | **Remediate Immediately**: Expand into full interactive questionnaires with dual-entry capability (full itemized calculation + direct score entry override). |
| **Tier 2: Medium Priority (Complex Matrices, 16–48 Items)** | **10** | Open-access instruments requiring either longer surveys (20–30 items) or multi-dimensional scoring matrices (e.g., Fear + Avoidance). | `lsas-social`, `eat-26`, `sds-zung`, `sas-zung-anxiety`, `snot-22`, `scat5-symptom`, `iqcode`, `zarit-burden`, `vanderbilt-adhd`, `bpi-interference` | **Remediate in Wave 2**: Implement with collapsible sections, responsive rating groups, or dedicated table layouts. |
| **Tier 3: Low Priority / Intentional Interpreters** | **11** | Strictly proprietary tools with aggressive copyright enforcement, or hands-on clinical interviews/examinations requiring paper stimuli or physical exam maneuvers. | Proprietary: `bai`, `bdi-ii`, `mmse`, `moca`.<br>Clinician Battery: `ace-iii-total`, `panss-simp`, `updrs-simp`, `ciwa-b`, `clock-draw`, `hoehn-yahr`, `edss-simp` | **Preserve as Score Interpreters**: Do NOT add copyrighted verbatim text to avoid immediate infringement (Pearson, PAR, MoCA). Maintain current subscale/total interpreter design, adding educational guidance and directing clinicians to open alternatives (e.g., PHQ-9 instead of BDI-II; SLUMS/Mini-Cog instead of MMSE). |

---

## 2. Master Triage Table of Candidates

| Calculator ID | Name | File | Current Inputs | Standard Tool Scope | MDCalc Practice | Copyright / Legal Status | Recommendation & Priority |
|---|---|---|---|---|---|---|---|
| `panic-pdss` | Panic Disorder Severity Scale | `wave6-psych-sleep.ts` | 1 (`score`) | 7 items (0–4 each) | Standard 7-item scale | Shear / Pittsburgh (Open clinical) | **HIGH**: Expand to 7 items (0–28) |
| `lsas-social` | Liebowitz Social Anxiety Scale | `wave6-psych-sleep.ts` | 1 (`score`) | 24 situations × 2 (48 ratings) | Full 24-item dual matrix | Liebowitz (Open clinical) | **MEDIUM**: Add dual fear/avoidance table |
| `eat-26` | Eating Attitudes Test-26 | `wave6-psych-sleep.ts` | 3 (`score`, `behaviors`, `bmi`) | 26 items + 5 behavioral flags | Full 26 questions + 5 flags | Garner / River Centre (Free license) | **HIGH**: Expand to 26 items + 5 flags |
| `mchat-r` | M-CHAT-R Autism Toddler Screen | `wave6-psych-sleep.ts` | 1 (`score`) | 20 Yes/No items (reverse 2, 5, 12) | Verbatim 20-item questionnaire | Robins / Fein (Open access) | **HIGH**: Expand to 20 Yes/No items |
| `cudit-r` | Cannabis Use Disorders Ident. Test | `wave6-psych-sleep.ts` | 1 (`score`) | 8 multiple-choice items | Full 8 items | Adamson / WHO adapted (Open) | **HIGH**: Expand to 8 items (0–32) |
| `pain-detect` | painDETECT Screening Questionnaire | `wave6-psych-sleep.ts` | 1 (`score`) | 7 sensory + 1 pattern + 1 radiation | Full 9 items | Freynhagen / Pfizer (Open clinical) | **HIGH**: Expand to 9 items (−1 to 38) |
| `barthel-index` | Barthel ADL Index | `wave6-psych-sleep.ts` | 1 (`score`) | 10 ADL domains (0–100) | Full 10 ADL pickers | Mahoney & Barthel (Public Domain) | **HIGH**: Expand to 10 ADL pickers |
| `snot-22` | SNOT-22 Sinonasal Outcome Test | `wave6-psych-sleep.ts` | 1 (`score`) | 22 symptoms (0–5 each) | Full 22 items | WashU (Clinical allowed) | **MEDIUM**: Expand to 22 items |
| `nose-scale` | NOSE Scale (Nasal Obstruction) | `wave6-psych-sleep.ts` | 1 (`raw`) | 5 items (0–4 each) × 5 | Full 5 items | AAO-HNSF (Open clinical) | **HIGH**: Expand to 5 items (0–100) |
| `isi-insomnia` | Insomnia Severity Index | `wave2-neuro-psych.ts` | 1 (`score`) | 7 items (0–4 each) | Full 7 items | Morin (Open clinical) | **HIGH**: Expand to 7 items (0–28) |
| `pcl5` | PCL-5 PTSD Checklist | `wave2-neuro-psych.ts` | 1 (`score`) | 20 items across 4 DSM clusters | Full 20 items + cluster logic | VA / NCPTSD (**Public Domain**) | **HIGH**: Expand to 20 items + clusters |
| `madrs` | MADRS Depression Score | `wave2-neuro-psych.ts` | 1 (`score`) | 10 clinician items (0–6 each) | Full 10 items with anchors | Montgomery & Åsberg (Open clinical) | **HIGH**: Expand to 10 items (0–60) |
| `ham-a` | HAM-A Anxiety Score | `wave2-neuro-psych.ts` | 1 (`score`) | 14 clinician items (0–4 each) | Full 14 items with descriptors | Hamilton 1959 (**Public Domain**) | **HIGH**: Expand to 14 items (0–56) |
| `ham-d` | HAM-D Depression Score | `wave2-neuro-psych.ts` | 2 (`score`, `version`) | 17 clinician items (HAM-D 17) | Full 17 items with anchors | Hamilton 1960 (**Public Domain**) | **HIGH**: Expand to 17 items (0–52) |
| `bai` | Beck Anxiety Inventory | `wave2-neuro-psych.ts` | 1 (`score`) | 21 symptoms (0–3 each) | **Omitted on MDCalc** | **PROPRIETARY (Pearson Clinical)** | **LOW / DO NOT EXPAND**: Keep interpreter |
| `bdi-ii` | Beck Depression Inventory-II | `wave2-neuro-psych.ts` | 1 (`score`) | 21 items (0–3 each) | **Omitted on MDCalc** | **PROPRIETARY (Pearson Clinical)** | **LOW / DO NOT EXPAND**: Keep interpreter |
| `ymrs` | Young Mania Rating Scale | `wave2-neuro-psych.ts` | 1 (`score`) | 11 items (4 double-weighted) | Full 11 items with anchors | Young 1978 (Open clinical) | **HIGH**: Expand to 11 items (0–60) |
| `cornell-dementia` | Cornell Scale for Depression in Dementia | `wave4-neuro-psych.ts` | 1 (`score`) | 19 items across 5 domains (0–2) | Full 19 items | Alexopoulos 1988 (Open clinical) | **HIGH**: Expand to 19 items (0–38) |
| `psqi` | Pittsburgh Sleep Quality Index | `wave4-neuro-psych.ts` | 1 (`global`) | 7 components / 19 questions | 7 components or 19 questions | Buysse / Pittsburgh (Open clinical) | **HIGH**: Add 7 component pickers |
| `restless-irlssg` | IRLS Restless Legs Severity | `wave4-neuro-psych.ts` | 1 (`score`) | 10 items (0–4 each) | Full 10 items | IRLSSG (Open clinical) | **HIGH**: Expand to 10 items (0–40) |
| `phq-a` | PHQ-A Adolescent Depression Screen | `wave5-tox-psych.ts` | 2 (`score`, `item9`) | 9 items (0–3 each) | Full 9 items | Pfizer / Spitzer (**Public Domain**) | **HIGH**: Expand to 9 items (0–27) |
| `sds-zung` | Zung Self-Rating Depression Scale | `wave5-tox-psych.ts` | 1 (`score`) | 20 items (10 reverse-scored) | Full 20 items | Zung 1965 (Classic open) | **MEDIUM**: Expand to 20 items (20–80) |
| `sas-zung-anxiety` | Zung Self-Rating Anxiety Scale | `wave5-tox-psych.ts` | 1 (`score`) | 20 items (5 reverse-scored) | Full 20 items | Zung 1971 (Classic open) | **MEDIUM**: Expand to 20 items (20–80) |
| `yale-brown-ocd` | Yale–Brown Obsessive Compulsive Scale | `wave5-tox-psych.ts` | 3 (`score`, `obs`, `comp`) | 10 items (5 obsessions, 5 compulsions) | Full 10 items with anchors | Goodman 1989 (Open clinical) | **HIGH**: Expand to 10 items (0–40) |
| `mmse` | Mini-Mental State Examination | `gi-neuro-psych.ts` | 1 (`score`) | 30 questions / points | **Score entry only (Omitted)** | **HIGHLY PROPRIETARY (PAR, Inc.)** | **LOW / DO NOT EXPAND**: Keep score entry |
| `moca` | Montreal Cognitive Assessment | `gi-neuro-psych.ts` | 2 (`score`, `edu`) | 30 points (paper stimulus) | Score entry only | **PROPRIETARY / CERTIFIED** | **LOW / DO NOT EXPAND**: Keep score entry |
| `slums` | SLUMS Cognitive Exam | `wave2-neuro-psych.ts` | 2 (`score`, `education`) | 11 items / 30 points | Full 11 items with education bands | St. Louis Univ / VA (**Free open**) | **HIGH**: Expand to 11 items (MMSE alt) |
| `panss-simp` | PANSS Schizophrenia Rating Scale | `wave2-neuro-psych.ts` | 4 (`total`, `pos`, `neg`, `gen`) | 30 items (45-min interview) | Subscale / total entry | MHS (Proprietary interview) | **LOW**: Keep subscales |
| `updrs-simp` | MDS-UPDRS Part III Motor Exam | `wave2-neuro-psych.ts` | 2 (`part3`, `state`) | 33 physical exam ratings | Full 33 items or subscales | MDS (Clinical license) | **LOW/MEDIUM**: Keep motor total |
| `ace-iii-total` | ACE-III Cognitive Examination | `wave4-neuro-psych.ts` | 6 (`total`, 5 domains) | 100 points (paper battery) | Domain subtotals | Hodges / Sydney (Clinical allowed) | **LOW**: Keep domain subtotals |
| `iqcode` | IQCODE Cognitive Decline in Elderly | `wave4-neuro-psych.ts` | 2 (`average`, `form`) | 16 items (Short Form) | Full 16 items | Jorm / ANU (Free clinical) | **HIGH/MEDIUM**: Expand to 16 items |
| `zarit-burden` | Zarit Caregiver Burden Interview | `wave4-neuro-psych.ts` | 2 (`form`, `score`) | 12 items (Short Form, 0–4) | Full 12 items | Zarit / Mapi (Clinical standard) | **HIGH**: Expand to 12 items (0–48) |
| `ciwa-b` | CIWA-B Benzodiazepine Withdrawal | `wave4-neuro-psych.ts` | 4 (`score`, 3 flags) | 22 items | Not hosted (CIWA-Ar preferred) | Busto / CAMH | **LOW**: Keep simplified |
| `scat5-symptom` | SCAT Concussion Symptom Severity | `wave4-neuro-psych.ts` | 2 (`numSymptoms`, `severity`) | 22 symptoms (0–6 each) | Full 22-item checklist | CISG / BJSM (Open clinical) | **MEDIUM**: Expand to 22 items |
| `vanderbilt-adhd` | Vanderbilt ADHD Rating Scale | `wave6-psych-sleep.ts` | 4 (counts of inatt/hyper/perf) | 18 core DSM ADHD items | Full 18 items | NICHQ / AAP (Free open) | **HIGH/MEDIUM**: Expand to 18 items |
| `bpi-interference` | BPI Pain Interference Average | `wave6-psych-sleep.ts` | 2 (`avg`, `worst`) | 7 items (0–10 each) | Full 7 items | Cleeland / MD Anderson (Free clinical) | **HIGH**: Expand to 7 items |
| `aspects` | ASPECTS Early Ischemic Change (CT) | `missing-neuro-psych.ts` | 3 (`mode`, `score`, `regions`) | 10 anatomical MCA regions | 10 anatomical checkboxes | Barber / Lancet (Open standard) | **HIGH**: Add 10 anatomical toggles |
| `clock-draw` | Clock Drawing Score (0–5) | `wave2-neuro-psych.ts` | 1 (`score` select 0–5) | Shulman 0–5 qualitative rating | Binary in Mini-Cog | Shulman (Open) | **COMPLETE AS-IS** (Add 3-pt alt) |

---

## 3. Detailed Audit of Specific Candidates

Below is the comprehensive clinical, technical, and licensing audit for each investigated candidate.

---

### 3.1 Panic Disorder Severity Scale (`panic-pdss`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "PDSS total (0–28)", min: 0, max: 28, defaultValue: 10).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by M. Katherine Shear et al. (1997, *Am J Psychiatry*).
  - 7 interviewer- or self-rated items on a 0–4 scale:
    1. *Panic frequency*: How many panic and limited symptom attacks had in past week? (0=None, 1=1 full or up to 3 limited, 2=2–3 full or up to 2 limited/day, 3=4–9 full, 4=10+ attacks).
    2. *Distress during panic*: How distressing were the attacks? (0=None, 1=Mild, 2=Moderate, 3=Severe, 4=Extreme/incapacitating).
    3. *Anticipatory anxiety*: How much worry about when next attack will occur? (0=None to 4=Disabling/constant).
    4. *Agoraphobic fear/avoidance*: Avoidance of situations due to fear of attack? (0=None to 4=Housebound/pervasive).
    5. *Interoceptive fear/avoidance*: Avoidance of physical sensations (exercise, coffee)? (0=None to 4=Severe/pervasive).
    6. *Work impairment*: Impairment in work/responsibilities? (0=None to 4=Inability to work).
    7. *Social impairment*: Impairment in social life? (0=None to 4=Inability to engage socially).
  - Total score: 0–28. Remission ≤3; Mild 4–7; Moderate 8–10; Severe 11–13; Extreme ≥14.
- **MDCalc Practice:** Standard clinical calculators display all 7 items with standard 0–4 selectors.
- **Licensing & Copyright:** Shear / University of Pittsburgh. Freely available for non-commercial clinical and research use.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 7 items. Straightforward conversion to 7 `selectInput` elements.

---

### 3.2 Liebowitz Social Anxiety Scale (`lsas-social`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "LSAS total (0–144)", min: 0, max: 144, defaultValue: 55).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Michael R. Liebowitz (1987).
  - Evaluates 24 social situations (13 performance situations and 11 social interaction situations):
    - Examples: Telephoning in public, participating in small groups, eating in public, drinking with others, talking to people in authority, acting/performing/speaking in front of audience, going to a party, working while being observed, writing while being observed, calling someone you don't know well, talking with people you don't know well, meeting strangers, urinating in a public bathroom, entering a room when others are already seated, being the center of attention, speaking up at a meeting, taking a test, expressing disagreement to people you don't know well, looking at people you don't know in the eyes, giving a report to a group, trying to pick up someone, returning goods to a store, giving a party, resisting a high-pressure salesperson.
  - For **each** situation, the patient rates TWO separate subscales:
    1. *Fear or Anxiety*: 0 = None, 1 = Mild, 2 = Moderate, 3 = Severe.
    2. *Avoidance*: 0 = Never (0%), 1 = Occasionally (1–33%), 2 = Often (33–67%), 3 = Usually (67–100%).
  - Total score: Fear subtotal (0–72) + Avoidance subtotal (0–72) = 0–144.
  - Cutoffs: 55–64 moderate social phobia; 65–80 marked; 81–95 severe; ≥96 very severe.
- **MDCalc Practice:** MDCalc features the 24 situations with a dual-column layout (Fear and Avoidance selectors side by side).
- **Licensing & Copyright:** Michael R. Liebowitz. Open for clinical research and healthcare use (LSAS-SR).
- **Recommendation & Priority:** **MEDIUM Priority**. High clinical utility, but requires 48 input values. Best implemented either as 24 paired sub-components or a dual-column questionnaire with an optional "Direct Total Entry" toggle.

---

### 3.3 Eating Attitudes Test-26 (`eat-26`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 3 inputs (`score` numberInput 0–78, `behaviors` yesNo, `bmi` numberInput).
  - Status: **Score Interpreter with Behavioral & BMI Flags**.
- **Standard Clinical Instrument:**
  - Developed by David M. Garner et al. (1982, *Psychol Med*).
  - **Part A:** 26 attitude statements evaluated on a 6-point scale:
    - *Always* (3 pts), *Usually* (2 pts), *Often* (1 pt), *Sometimes* (0 pts), *Rarely* (0 pts), *Never* (0 pts).
    - **Item 26 Reverse Scored:** "Enjoy trying new rich foods" is reversed: *Never* (3 pts), *Rarely* (2 pts), *Sometimes* (1 pt), *Often/Usually/Always* (0 pts).
    - Three subscale factors:
      1. *Dieting* (items 1, 6, 7, 10, 11, 12, 14, 16, 17, 22, 23, 24, 25)
      2. *Bulimia & Food Preoccupation* (items 3, 4, 9, 18, 21, 26)
      3. *Oral Control* (items 2, 5, 8, 13, 15, 19, 20)
  - **Part B:** 5 Behavioral symptom frequency items over past 6 months:
    1. Binge eating episodes (eating uncontrollably).
    2. Purging / self-induced vomiting.
    3. Laxative, diet pill, or diuretic abuse.
    4. Excessive exercise (>60 minutes/day strictly to burn calories/lose weight).
    5. Lost 20 pounds or more in past 6 months.
  - Referral Criteria: Total score ≥20, OR any Part B behavioral symptom positive, OR significantly low BMI.
- **MDCalc Practice:** Fully implemented on MDCalc with the 26 statements, 6 radio options, and 5 behavioral questions.
- **Licensing & Copyright:** David M. Garner / River Centre Clinic. Garner explicitly grants free permission for clinical, non-profit, and research use without charge on `eat-26.com`.
- **Recommendation & Priority:** **HIGH Priority**. 26 items + 5 behavioral items. Gold standard eating disorder screen.

---

### 3.4 Modified Checklist for Autism in Toddlers - Revised (`mchat-r`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "M-CHAT-R total failed items (0–20)", min: 0, max: 20, defaultValue: 3).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Diana L. Robins, Deborah Fein, & Marianne Barton (2009, *Pediatrics*).
  - 20 Yes/No parent-completed questions for toddlers aged 16–30 months.
  - **Critical Reverse Scoring Rules:**
    - For 17 items, **"No"** indicates developmental risk (1 point):
      Q1 (look at what you point to), Q3 (pretend play), Q4 (climbing), Q6 (pointing with index finger), Q7 (interest in other children), Q8 (showing objects), Q9 (bring objects to show), Q10 (respond to name), Q11 (smile back), Q13 (walking), Q14 (look in eyes), Q15 (imitate actions), Q16 (turn head to look at what you see), Q17 (get you to look at something), Q18 (understand verbal request), Q19 (look at your face when something new happens), Q20 (enjoy movement activities).
    - For **3 items (Q2, Q5, Q12)**, **"Yes"** indicates developmental risk (1 point):
      - *Q2*: Have you ever wondered if your child might be deaf? (**Yes = 1 point**)
      - *Q5*: Does your child make unusual finger movements near their eyes? (**Yes = 1 point**)
      - *Q12*: Does your child get upset by everyday noises (vacuum, blender)? (**Yes = 1 point**)
  - Risk Stratification:
    - *0–2 points (Low Risk)*: Rescreen at 24 months if <2 years old.
    - *3–7 points (Medium Risk)*: Follow-Up Interview (M-CHAT-R/F) required for failed items; if score remains ≥2, refer for evaluation.
    - *8–20 points (High Risk)*: Immediate referral for diagnostic evaluation and early intervention services.
- **MDCalc Practice:** MDCalc features the exact 20 Yes/No questions verbatim with automatic scoring and reverse-scoring logic.
- **Licensing & Copyright:** Robins, Fein, & Barton. The authors have explicitly dedicated M-CHAT-R to free clinical and research use (`mchatscreen.com`).
- **Recommendation & Priority:** **HIGH Priority**. Exactly 20 Yes/No questions. A flagship pediatric calculator.

---

### 3.5 Cannabis Use Disorders Identification Test - Revised (`cudit-r`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "CUDIT-R total (0–32)", min: 0, max: 32, defaultValue: 8).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by S. J. Adamson et al. (2010, *Drug Alcohol Depend*).
  - 8 multiple-choice items adapted from WHO AUDIT:
    1. *Frequency of cannabis use*: Never (0), Monthly or less (1), 2–4 times/month (2), 2–3 times/week (3), 4+ times/week (4).
    2. *Hours spent "stoned" on a typical day*: <1 hr (0), 1–2 hrs (1), 3–4 hrs (2), 5–6 hrs (3), 7+ hrs (4).
    3. *Frequency unable to stop using*: Never (0) to Daily/almost daily (4).
    4. *Frequency failed to do what was normally expected*: Never (0) to Daily/almost daily (4).
    5. *Frequency devoted large amount of time to getting/using/recovering*: Never (0) to Daily/almost daily (4).
    6. *Frequency problem with memory or concentration*: Never (0) to Daily/almost daily (4).
    7. *Frequency used in situations physically hazardous (e.g. driving)*: Never (0) to Daily/almost daily (4).
    8. *Friend/relative/doctor suggested you cut down*: No (0), Yes, but not in the past year (2), Yes, during the past year (4).
  - Total score: 0–32.
  - Cutoffs: ≥8 indicates hazardous cannabis use; ≥13 indicates possible cannabis use disorder (DSM-5).
- **MDCalc Practice:** Standard clinical calculators display all 8 questions.
- **Licensing & Copyright:** Publicly funded addiction research instrument; free for clinical and research use.
- **Recommendation & Priority:** **HIGH Priority**. Only 8 items with 0–4 options.

---

### 3.6 painDETECT Screening Questionnaire (`pain-detect`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "painDETECT total (−9 to 38)", min: -9, max: 38, defaultValue: 14).
  - Note: Current min of −9 is clinically incorrect; standard painDETECT ranges from −1 to 38.
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by R. Freynhagen et al. (2006, *Curr Med Res Opin*).
  - 9 scored components:
    - **7 sensory symptom items** rated 0 (never) to 5 (very strongly):
      1. Burning sensation
      2. Tingling or prickling (pins and needles)
      3. Pain triggered by light touch (clothing, bedding)
      4. Electric shock-like sudden pain attacks
      5. Pain triggered by cold or heat
      6. Numbness in the painful area
      7. Pain triggered by slight pressure (finger touch)
      *Sensory Subtotal: 0–35 points.*
    - **1 pain course pattern item** (4 illustrated choices):
      - Persistent pain with slight fluctuations: **−1 pt**
      - Persistent pain with pain attacks: **0 pts**
      - Pain attacks without pain in between: **−1 pt**
      - Pain attacks with pain in between: **+1 pt**
    - **1 radiating pain item**:
      - Does the pain radiate to other parts of the body? (Yes = **+2 pts**, No = **0 pts**).
  - Total score: Sensory subtotal (0–35) + Pattern (−1 to +1) + Radiating (0 to +2) = **−1 to 38**.
  - Risk Classification:
    - ≤12: Neuropathic pain component unlikely (<15% probability).
    - 13–18: Ambiguous result; neuropathic component may be present.
    - ≥19: Neuropathic pain component likely (>90% probability).
- **MDCalc Practice:** MDCalc implements all 7 sensory questions, the pattern dropdown, and the radiation toggle.
- **Licensing & Copyright:** Freynhagen et al. / Pfizer funded. Validated and open for routine clinical use.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 9 items. Also fixes the erroneous negative minimum (−9 -> −1).

---

### 3.7 Barthel ADL Index (`barthel-index`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "Barthel Index total (0–100)", min: 0, max: 100, defaultValue: 65).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Florence I. Mahoney & Dorothea W. Barthel (1965, *Maryland State Med J*).
  - 10 functional activities of daily living:
    1. *Feeding*: 0 = Unable, 5 = Needs help, 10 = Independent.
    2. *Bathing*: 0 = Dependent, 5 = Independent.
    3. *Grooming*: 0 = Needs help, 5 = Independent (washes face, combs hair, cleans teeth).
    4. *Dressing*: 0 = Dependent, 5 = Needs help, 10 = Independent (ties shoes, fasteners).
    5. *Bowels*: 0 = Incontinent, 5 = Occasional accident (1/wk), 10 = Continent.
    6. *Bladder*: 0 = Incontinent/catheterized, 5 = Occasional accident (1/24h), 10 = Continent.
    7. *Toilet use*: 0 = Dependent, 5 = Needs some help, 10 = Independent (wiping, clothes).
    8. *Transfers (bed to chair)*: 0 = Unable, 5 = Major help (physical), 10 = Minor help (verbal/physical), 15 = Independent.
    9. *Mobility (on level surfaces)*: 0 = Immobile, 5 = Wheelchair independent, 10 = Walks with help of 1 person, 15 = Independent (may use stick/crutches >50 yards).
    10. *Stairs*: 0 = Unable, 5 = Needs help (verbal, physical, cane), 10 = Independent.
  - Total score: 0–100 (in 5-point increments).
  - Severity: 0–20 Total dependence; 21–60 Severe dependence; 61–90 Moderate dependence; 91–99 Slight dependence; 100 Independence.
- **MDCalc Practice:** MDCalc has all 10 standard items with their exact point values.
- **Licensing & Copyright:** **PUBLIC DOMAIN**. Published in 1965; zero copyright or licensing restrictions.
- **Recommendation & Priority:** **HIGH Priority**. 10 items, standard rehabilitation score, completely open.

---

### 3.8 Sino-Nasal Outcome Test-22 (`snot-22`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "SNOT-22 total (0–110)", min: 0, max: 110, defaultValue: 25).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Claire Hopkins et al. (2009, *Clin Otolaryngol*), adapted from Piccirillo SNOT-20.
  - 22 items evaluated on a 0–5 scale (0 = No problem, 1 = Very mild, 2 = Mild/slight, 3 = Moderate, 4 = Severe, 5 = Problem as bad as it can be):
    1. Need to blow nose
    2. Sneezing
    3. Runny nose
    4. Nasal blockage
    5. Loss of smell/taste
    6. Cough
    7. Post-nasal discharge
    8. Thick nasal discharge
    9. Ear fullness
    10. Dizziness
    11. Ear pain
    12. Facial pain/pressure
    13. Difficulty falling asleep
    14. Waking up at night
    15. Lack of a good night's sleep
    16. Waking up tired
    17. Fatigue
    18. Reduced productivity
    19. Reduced concentration
    20. Frustrated/restless/irritable
    21. Sad
    22. Embarrassed
  - Total score: 0–110. Minimally Clinically Important Difference (MCID): 8.9 points.
- **MDCalc Practice:** MDCalc implements all 22 items with 0–5 radio buttons.
- **Licensing & Copyright:** Washington University School of Medicine (St. Louis). Academic and clinical use is standard, though commercial distribution licensing is held by WashU.
- **Recommendation & Priority:** **MEDIUM Priority**. 22 uniform items (0–5).

---

### 3.9 Nasal Obstruction Symptom Evaluation (`nose-scale`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`raw`, label: "Sum of 5 NOSE items (0–20)", min: 0, max: 20, defaultValue: 8).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Michael G. Stewart et al. (2004, *Otolaryngol Head Neck Surg*).
  - 5 questions:
    1. Nasal congestion or stuffiness
    2. Nasal blockage or obstruction
    3. Trouble breathing through my nose
    4. Trouble sleeping
    5. Unable to get enough air through my nose during exercise or exertion
  - Each scored 0 to 4:
    - 0 = Not a problem
    - 1 = Very mild problem
    - 2 = Moderate problem
    - 3 = Fairly bad problem
    - 4 = Severe problem
  - Raw score (0–20) is multiplied by 5 to calculate final score (0–100):
    - 5–25: Mild obstruction
    - 30–50: Moderate obstruction
    - 55–75: Severe obstruction
    - 80–100: Extreme obstruction
- **MDCalc Practice:** MDCalc features the 5 questions with 0–4 options and automated ×5 multiplier.
- **Licensing & Copyright:** American Academy of Otolaryngology-Head and Neck Surgery Foundation (AAO-HNSF). Standard open clinical instrument.
- **Recommendation & Priority:** **HIGH Priority**. Only 5 items. Trivial and high-value conversion.

---

### 3.10 Insomnia Severity Index (`isi-insomnia`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "ISI total (0–28)", min: 0, max: 28, defaultValue: 12).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Charles M. Morin (1993) / Bastien et al. (2001, *Sleep Med*).
  - 7 items rated 0 to 4:
    1. *Difficulty falling asleep*: None (0), Mild (1), Moderate (2), Severe (3), Very severe (4).
    2. *Difficulty staying asleep*: None (0) to Very severe (4).
    3. *Problems waking up too early*: None (0) to Very severe (4).
    4. *How satisfied/dissatisfied with current sleep pattern*: Very satisfied (0), Satisfied (1), Moderately satisfied (2), Dissatisfied (3), Very dissatisfied (4).
    5. *How noticeable to others is sleep impairment*: Not at all noticeable (0), Barely (1), Somewhat (2), Much (3), Very much noticeable (4).
    6. *How worried/distressed about current sleep problems*: Not at all (0), A little (1), Somewhat (2), Much (3), Very much (4).
    7. *Interference with daily functioning*: Not at all (0) to Very much (4).
  - Total score: 0–28.
  - Severity:
    - 0–7: No clinically significant insomnia
    - 8–14: Subthreshold insomnia
    - 15–21: Clinical insomnia (moderate severity)
    - 22–28: Clinical insomnia (severe)
- **MDCalc Practice:** MDCalc features all 7 questions with the 5 descriptive choices.
- **Licensing & Copyright:** Charles M. Morin (Université Laval). Freely available for non-commercial clinical use.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 7 items. Foundational sleep medicine screen.

---

### 3.11 PTSD Checklist for DSM-5 (`pcl5`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "PCL-5 total (0–80)", min: 0, max: 80, defaultValue: 32).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by F. W. Weathers et al. (2013, National Center for PTSD).
  - 20 items assessing DSM-5 PTSD symptoms across 4 clusters:
    - **Cluster B: Intrusion symptoms (items 1–5)**: Repeated disturbing memories; disturbing dreams; feeling/acting as if event happening again; feeling very upset when reminded; strong physical reactions to reminders.
    - **Cluster C: Avoidance symptoms (items 6–7)**: Avoiding memories, thoughts, or feelings; avoiding external reminders (people, places, conversations, objects).
    - **Cluster D: Negative alterations in cognitions and mood (items 8–14)**: Trouble remembering important parts; negative beliefs about oneself/others/world; blaming yourself or others; negative feelings (fear, horror, anger, guilt); loss of interest in activities; feeling distant/cut off; trouble feeling positive emotions.
    - **Cluster E: Alterations in arousal and reactivity (items 15–20)**: Irritable behavior / angry outbursts; taking risks / self-destructive behavior; being "superalert" (hypervigilance); feeling jumpy / easily startled; difficulty concentrating; trouble falling or staying asleep.
  - Rating: 0 = Not at all, 1 = A little bit, 2 = Moderately, 3 = Quite a bit, 4 = Extremely.
  - Scoring Outputs:
    1. *Total Severity Score (0–80)*: Cutoff score of 31–33 indicates provisional PTSD.
    2. *DSM-5 Diagnostic Algorithm*: A symptom is endorsed if rated ≥2 ("Moderately"). Requires ≥1 Cluster B, ≥1 Cluster C, ≥2 Cluster D, and ≥2 Cluster E symptoms.
- **MDCalc Practice:** MDCalc features all 20 items, providing both the continuous severity total and the categorical DSM-5 cluster fulfillment status.
- **Licensing & Copyright:** **PUBLIC DOMAIN**. Developed by the U.S. Department of Veterans Affairs (National Center for PTSD). Completely free to use, modify, and distribute.
- **Recommendation & Priority:** **HIGH Priority**. 20 items, public domain, premier trauma rating scale.

---

### 3.12 Montgomery–Åsberg Depression Rating Scale (`madrs`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "MADRS total (0–60)", min: 0, max: 60, defaultValue: 22).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Stuart A. Montgomery & Marie Åsberg (1979, *Br J Psychiatry*).
  - 10 clinician-rated items evaluated on a 0–6 scale (anchors provided for 0, 2, 4, 6):
    1. *Apparent sadness* (despondency, gloom, despair in speech/facial expression).
    2. *Reported sadness* (depressed mood, feeling hopeless).
    3. *Inner tension* (feelings of ill-defined discomfort, edginess, panic).
    4. *Reduced sleep* (reduction in duration or depth of sleep).
    5. *Reduced appetite* (loss of desire for food).
    6. *Concentration difficulties* (difficulties collecting thoughts).
    7. *Lassitude* (difficulty getting started or slowness initiating activities).
    8. *Inability to feel* (loss of interest in surroundings, loss of emotional feeling).
    9. *Pessimistic thoughts* (ideas of guilt, inferiority, self-reproach, sin).
    10. *Suicidal thoughts* (feeling that life is not worth living, plans/preparations).
  - Total score: 0–60.
  - Severity: 0–6 Normal/remission; 7–19 Mild depression; 20–34 Moderate depression; ≥35 Severe depression.
- **MDCalc Practice:** MDCalc features all 10 items with the explicit clinical anchor descriptions for each level.
- **Licensing & Copyright:** Published in 1979. Universally accepted gold standard in depression clinical trials and specialty practice.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 10 items. Standard psychiatric rating scale.

---

### 3.13 Hamilton Anxiety Rating Scale (`ham-a`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "HAM-A total (0–56)", min: 0, max: 56, defaultValue: 18).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Max Hamilton (1959, *Br J Med Psychol*).
  - 14 clinician-rated items on a 0–4 scale (0 = Not present, 1 = Mild, 2 = Moderate, 3 = Severe, 4 = Very severe):
    1. *Anxious mood* (worries, anticipation of the worst, fearful anticipation, irritability).
    2. *Tension* (feelings of tension, fatigability, startle response, moved to tears easily, trembling, restlessness).
    3. *Fears* (of dark, strangers, being left alone, animals, traffic, crowds).
    4. *Insomnia* (difficulty falling asleep, broken sleep, unrefreshing sleep, fatigue on waking, nightmares).
    5. *Intellectual (cognitive)* (difficulty in concentration, poor memory).
    6. *Depressed mood* (loss of interest, lack of pleasure in hobbies, depression, early waking, diurnal swing).
    7. *Somatic (muscular)* (pains and aches, twitching, stiffness, myoclonic jerks, grinding of teeth, unsteady voice).
    8. *Somatic (sensory)* (tinnitus, blurring of vision, hot and cold flushes, feelings of weakness, pricking sensation).
    9. *Cardiovascular symptoms* (tachycardia, palpitations, pain in chest, throbbing of vessels, fainting feelings).
    10. *Respiratory symptoms* (pressure or constriction in chest, choking feelings, sighing, dyspnea).
    11. *Gastrointestinal symptoms* (difficulty swallowing, wind, abdominal pain, burning sensations, abdominal fullness, nausea, vomiting, borborygmi, looseness of bowels, weight loss, constipation).
    12. *Genitourinary symptoms* (frequency of micturition, urgency of micturition, amenorrhea, menorrhagia, development of frigidity, premature ejaculation, loss of libido, impotence).
    13. *Autonomic symptoms* (dry mouth, flushing, pallor, tendency to sweat, giddiness, tension headache, raising of hair).
    14. *Behavior at interview* (fidgeting, restlessness, pacing, tremor of hands, furrowed brow, strained face, sighing, facial pallor, swallowing, belching, dilated pupils).
  - Scoring:
    - Psychic anxiety subscore: items 1–6 and 14 (0–28).
    - Somatic anxiety subscore: items 7–13 (0–28).
    - Total score: 0–56. (<17 Mild anxiety; 18–24 Mild to moderate; 25–30 Moderate to severe; >30 Severe).
- **MDCalc Practice:** MDCalc features all 14 items with detailed descriptive criteria.
- **Licensing & Copyright:** **PUBLIC DOMAIN**. Published in 1959. No copyright restrictions.
- **Recommendation & Priority:** **HIGH Priority**. 14 items, public domain, gold standard anxiety interview.

---

### 3.14 Hamilton Rating Scale for Depression (`ham-d`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`score` numberInput, `version` selectInput for 17, 21, or 24 items).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Max Hamilton (1960, *J Neurol Neurosurg Psychiatry*).
  - The standard clinical reference is the **17-item scale (HAM-D 17)**:
    - 8 items scored 0 to 4: 1. Depressed mood, 2. Feelings of guilt, 3. Suicide, 7. Work and activities, 8. Retardation, 9. Agitation, 10. Psychic anxiety, 11. Somatic anxiety, 15. Hypochondriasis.
    - 9 items scored 0 to 2: 4. Insomnia early, 5. Insomnia middle, 6. Insomnia late, 12. Somatic symptoms (GI), 13. Somatic symptoms (general), 14. Genital symptoms, 16. Loss of weight, 17. Insight.
  - Total score: 0–52.
  - Cutoffs: 0–7 Normal/remission; 8–13 Mild depression; 14–18 Moderate depression; 19–22 Severe depression; ≥23 Very severe depression.
- **MDCalc Practice:** MDCalc features all 17 items with specific radio choices for each item.
- **Licensing & Copyright:** **PUBLIC DOMAIN**. Published in 1960. Free of any commercial licensing restrictions.
- **Recommendation & Priority:** **HIGH Priority**. 17 items, the most widely cited depression interview scale in medical history.

---

### 3.15 Beck Anxiety Inventory (`bai`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "BAI total (0–63)", min: 0, max: 63, defaultValue: 16).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Aaron T. Beck, Norman Epstein, Gary Brown, & Robert A. Steer (1988, *J Consult Clin Psychol*).
  - 21 common anxiety symptoms (numbness/tingling, feeling hot, wobbliness, unable to relax, heart pounding, terrified, nervous, feeling of choking, etc.) rated 0 to 3. Total 0–63.
- **MDCalc Practice:** **MDCalc explicitly omits BAI.** MDCalc does not host Beck scales.
- **Licensing & Copyright:** **PROPRIETARY AND AGGRESSIVELY ENFORCED**. Owned exclusively by NCS Pearson, Inc. (Pearson Assessments). Pearson routinely issues cease-and-desist notices to software platforms reproducing BAI items without per-test licensing fees.
- **Recommendation & Priority:** **LOW PRIORITY / DO NOT EXPAND AS QUESTIONNAIRE**.
  - **Maintain strictly as a score entry/interpreter tool.**
  - Add educational text highlighting GAD-7 and HAM-A as free open-access clinical alternatives.

---

### 3.16 Beck Depression Inventory-II (`bdi-ii`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "BDI-II total (0–63)", min: 0, max: 63, defaultValue: 18).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Aaron T. Beck, Robert A. Steer, & Gregory K. Brown (1996, *Psychological Corporation*).
  - 21 items with 4 graded statements (0–3 points) assessing depressive symptoms. Total 0–63.
- **MDCalc Practice:** **MDCalc deliberately omits BDI-II.** MDCalc hosts PHQ-9 as the primary open-access depression screen.
- **Licensing & Copyright:** **STRICTLY PROPRIETARY (Pearson Assessments)**. BDI-II is one of the most vigorously litigated psychometric instruments in clinical software. Unauthorized reproduction of the 21 question statements constitutes direct copyright infringement.
- **Recommendation & Priority:** **LOW PRIORITY / MUST REMAIN SCORE INTERPRETER**.
  - **Do NOT add the 21 question items.**
  - Keep the interpreter intact for clinicians inputting pre-scored forms, with clinical notes directing users to the fully interactive PHQ-9.

---

### 3.17 Young Mania Rating Scale (`ymrs`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "YMRS total (0–60)", min: 0, max: 60, defaultValue: 14).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Vincent C. Young et al. (1978, *Br J Psychiatry*).
  - 11 clinician-administered items based on patient interview and observation:
    - **7 items scored 0 to 4**: 1. Elevated mood, 2. Increased motor activity-energy, 3. Sexual interest, 4. Sleep, 7. Language-thought disorder, 10. Appearance, 11. Insight.
    - **4 items with double weight scored 0, 2, 4, 6, 8**: 5. Irritability, 6. Speech (rate and amount), 8. Content, 9. Disruptive-aggressive behavior.
  - Total score: 0–60.
  - Severity: ≤12 Remission/normal; 13–19 Minimal/mild mania; 20–25 Moderate mania; 26–60 Severe mania.
- **MDCalc Practice:** MDCalc features all 11 items with exact descriptive anchor text for each grade.
- **Licensing & Copyright:** Published in 1978. Widely accepted open standard in bipolar disorder clinical trials and practice.
- **Recommendation & Priority:** **HIGH Priority**. 11 items. Foundational mood disorder tool.

---

### 3.18 Cornell Scale for Depression in Dementia (`cornell-dementia`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "Cornell total (0–38)", min: 0, max: 38, defaultValue: 9).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by George S. Alexopoulos et al. (1988, *Biol Psychiatry*).
  - Specifically designed to assess depression in patients with dementia (Alzheimer's, vascular, Lewy body) through interview with caregiver/informant and patient.
  - 19 items organized into 5 clinical domains:
    - *A. Mood-related signs*: 1. Anxiety, 2. Sadness, 3. Lack of reactivity to pleasant events, 4. Irritability.
    - *B. Behavioral disturbance*: 5. Agitation, 6. Retardation, 7. Multiple physical complaints, 8. Loss of interest.
    - *C. Physical signs*: 9. Appetite loss, 10. Weight loss, 11. Lack of energy.
    - *D. Cyclic functions*: 12. Diurnal variation of mood, 13. Difficulty falling asleep, 14. Multiple awakenings, 15. Early morning awakening.
    - *E. Ideational disturbance*: 16. Suicide, 17. Poor self-esteem, 18. Pessimism, 19. Mood-congruent delusions.
  - Scoring for each item: 0 = Absent, 1 = Mild or intermittent, 2 = Severe (or Unable to evaluate).
  - Total score: 0–38. Score >10 indicates probable major depression; >18 indicates definite major depression.
- **MDCalc Practice:** MDCalc implements all 19 items grouped by the 5 clinical categories.
- **Licensing & Copyright:** Open clinical scale published in 1988. Free for clinical use.
- **Recommendation & Priority:** **HIGH Priority**. 19 items, uniform 0–2 scoring, gold standard in geriatric neuro-psychiatry.

---

### 3.19 Pittsburgh Sleep Quality Index (`psqi`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`global`, label: "PSQI global score (0–21)", min: 0, max: 21, defaultValue: 6).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Daniel J. Buysse et al. (1989, *Psychiatry Res*).
  - 19 individual questions generating 7 component scores (each scored 0 to 3):
    1. *Component 1: Subjective sleep quality* (Q6).
    2. *Component 2: Sleep latency* (derived from Q2 minutes to fall asleep + Q5a frequency).
    3. *Component 3: Sleep duration* (derived from Q4 actual hours of sleep).
    4. *Component 4: Habitual sleep efficiency* (hours slept / hours in bed × 100%).
    5. *Component 5: Sleep disturbances* (derived from sum of Q5b–Q5j items).
    6. *Component 6: Use of sleep medication* (Q7).
    7. *Component 7: Daytime dysfunction* (derived from Q8 + Q9).
  - Global PSQI score = Sum of the 7 component scores (0–21).
  - Score >5 indicates poor sleep quality (sensitivity 89.6%, specificity 86.5%).
- **MDCalc Practice:** Clinical calculators typically implement either:
  - Approach A: 7 component score inputs (each 0–3 with guided rules), OR
  - Approach B: Full 19-question algorithmic calculator with bed/wake time entry.
- **Licensing & Copyright:** University of Pittsburgh. Free for non-commercial clinical and educational use.
- **Recommendation & Priority:** **HIGH Priority**. Providing the 7 component score inputs (0–3 each) with inline guidance is the most robust bedside design, with an optional toggle to calculate components from raw sleep logs.

---

### 3.20 International Restless Legs Scale (`restless-irlssg`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "IRLS total (0–40)", min: 0, max: 40, defaultValue: 18).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Arthur S. Walters et al. / IRLSSG (2003, *Sleep Med*).
  - 10 items assessing RLS severity over past week:
    1. Overall discomfort in legs or arms
    2. Need to move legs or arms
    3. Relief of arm/leg discomfort from moving
    4. Sleep disturbance due to RLS
    5. Daytime tiredness or sleepiness due to RLS
    6. Overall severity of RLS symptoms
    7. Frequency of RLS symptoms
    8. Severity on a typical day when present
    9. Impact on daily activities (work, social, family)
    10. Mood disturbance due to RLS
  - Each item scored 0 (None), 1 (Mild), 2 (Moderate), 3 (Severe), 4 (Very severe).
  - Total score: 0–40.
  - Severity: 1–10 Mild; 11–20 Moderate; 21–30 Severe; 31–40 Very severe.
- **MDCalc Practice:** MDCalc features all 10 items with 0–4 selectors.
- **Licensing & Copyright:** IRLSSG. Standard open clinical trial and guideline instrument.
- **Recommendation & Priority:** **HIGH Priority**. 10 uniform 0–4 items. Essential sleep neurology tool.

---

### 3.21 PHQ-A Adolescent Depression Screen (`phq-a`)
- **File:** `src/data/calculators/wave5-tox-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`score` numberInput 0–27, `item9` yesNo for suicidal ideation).
  - Status: **Score Interpreter with Safety Flag**.
- **Standard Clinical Instrument:**
  - Adapted from PHQ-9 for adolescents by J. G. Johnson et al. (2002, *J Adolesc Health*).
  - 9 items matching DSM criteria with adolescent-adapted wording:
    1. Feeling down, depressed, irritable, or hopeless
    2. Little interest or pleasure in doing things
    3. Trouble falling or staying asleep, or sleeping too much
    4. Feeling tired or having little energy
    5. Poor appetite or overeating
    6. Feeling bad about yourself (or that you are a failure)
    7. Trouble concentrating on schoolwork, reading, or watching TV
    8. Moving or speaking slowly, or being restless/fidgety
    9. Thoughts that you would be better off dead, or of hurting yourself
  - Scored 0 (Not at all), 1 (Several days), 2 (More than half the days), 3 (Nearly every day).
  - Total score: 0–27. Positive response to Item 9 triggers immediate clinical safety protocol.
- **MDCalc Practice:** MDCalc features all 9 items. (Note: adult `phq9` in `gi-neuro-psych.ts` already has all 9 items fully implemented!).
- **Licensing & Copyright:** **PUBLIC DOMAIN** (Pfizer / Spitzer / Kroenke). No copyright barriers.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 9 items, identical architecture to `phq9`.

---

### 3.22 Zung Self-Rating Depression Scale (`sds-zung`)
- **File:** `src/data/calculators/wave5-tox-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "Zung SDS raw total (20–80)", min: 20, max: 80, defaultValue: 45).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by William W. K. Zung (1965, *Arch Gen Psychiatry*).
  - 20 items rated 1 to 4 (1 = A little of the time, 2 = Some of the time, 3 = A good part of the time, 4 = Most of the time):
    - **10 Forward-Scored (Negative Affect)**: Items 1, 3, 4, 7, 8, 9, 10, 13, 15, 19 (e.g. "I feel down-hearted and blue", "I have crying spells").
    - **10 Reverse-Scored (Positive Affect)**: Items 2, 5, 6, 11, 12, 14, 16, 17, 18, 20 (e.g. "Morning is when I feel the best", "I eat as much as I used to"). Scored: 1=4, 2=3, 3=2, 4=1.
  - Raw Score: 20–80.
  - SDS Index: (Raw Score / 80) × 100 (range 25–100).
  - Severity: <50 Normal; 50–59 Mild to moderate; 60–69 Marked to severe; ≥70 Most severe.
- **MDCalc Practice:** Standard clinical psychology sites implement all 20 items with reverse scoring.
- **Licensing & Copyright:** Classic medical literature (1965). Free for open clinical screening.
- **Recommendation & Priority:** **MEDIUM Priority**. 20 items with 10 reverse-scored items.

---

### 3.23 Zung Self-Rating Anxiety Scale (`sas-zung-anxiety`)
- **File:** `src/data/calculators/wave5-tox-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "Zung SAS raw total (20–80)", min: 20, max: 80, defaultValue: 42).
  - Status: **Pure Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by William W. K. Zung (1971, *Psychosomatics*).
  - 20 items rated 1 to 4 (1 = None or a little of the time, 2 = Some of the time, 3 = A good part of the time, 4 = Most or all of the time):
    - **15 Forward-Scored**: Items 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 20.
    - **5 Reverse-Scored**: Items 5 ("I feel that everything is all right"), 9 ("I feel calm and can sit still easily"), 13 ("I can breathe in and out easily"), 17 ("My hands are usually warm and dry"), 19 ("I fall asleep easily and get a good night's rest").
  - Raw Score: 20–80. SAS Index: (Raw Score / 80) × 100.
  - Severity: <45 Normal; 45–59 Mild to moderate anxiety; 60–74 Marked to severe; ≥75 Extreme anxiety.
- **MDCalc Practice:** Implemented on clinical websites with 20 items and reverse scoring.
- **Licensing & Copyright:** Classic medical literature (1971). Open clinical scale.
- **Recommendation & Priority:** **MEDIUM Priority**. 20 items with 5 reverse-scored items.

---

### 3.24 Yale–Brown Obsessive Compulsive Scale (`yale-brown-ocd`)
- **File:** `src/data/calculators/wave5-tox-psych.ts`
- **Current Implementation:**
  - Inputs: 3 inputs (`score` numberInput 0–40, `obsessions` optional number, `compulsions` optional number).
  - Status: **Score Interpreter with Optional Subtotals**.
- **Standard Clinical Instrument:**
  - Developed by Wayne K. Goodman et al. (1989, *Arch Gen Psychiatry*).
  - 10 core severity items evaluated on a 0–4 scale with defined anchors:
    - **Obsessions Subscale (Items 1–5)**:
      1. *Time spent on obsessions*: None (0) to >8 hours/day (4).
      2. *Interference from obsessions*: None (0) to Incapacitating (4).
      3. *Distress from obsessions*: None (0) to Disabling (4).
      4. *Resistance against obsessions*: Always resist (0) to Completely yield (4).
      5. *Control over obsessions*: Complete control (0) to No control (4).
      *Obsessions Subtotal: 0–20 points.*
    - **Compulsions Subscale (Items 6–10)**:
      6. *Time spent performing compulsions*: None (0) to >8 hours/day (4).
      7. *Interference from compulsions*: None (0) to Incapacitating (4).
      8. *Distress from compulsions*: None (0) to Disabling (4).
      9. *Resistance against compulsions*: Always resist (0) to Completely yield (4).
      10. *Control over compulsions*: Complete control (0) to No control (4).
      *Compulsions Subtotal: 0–20 points.*
  - Total score: 0–40.
  - Severity: 0–7 Subclinical; 8–15 Mild; 16–23 Moderate; 24–31 Severe; 32–40 Extreme OCD.
- **MDCalc Practice:** MDCalc features all 10 items with explicit descriptive anchor options.
- **Licensing & Copyright:** Published in 1989. International gold standard OCD measure; free for clinical and research practice.
- **Recommendation & Priority:** **HIGH Priority**. Exactly 10 items with elegant symmetry (5 obsessions + 5 compulsions).

---

### 3.25 Mini-Mental State Examination (`mmse`)
- **File:** `src/data/calculators/gi-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `numberInput` (`score`, label: "MMSE total score", min: 0, max: 30, defaultValue: 28).
  - Name: explicitly titled `MMSE (Score Entry)`.
  - Status: **Intentional Score Entry Tool**.
- **Standard Clinical Instrument:**
  - Developed by Marshal F. Folstein, Susan E. Folstein, & Paul R. McHugh (1975, *J Psychiatr Res*).
  - 30 questions/tasks: Orientation to time (5), Orientation to place (5), Registration (3), Attention/Calculation (5), Recall (3), Naming (2), Repetition (1), 3-stage command (3), Reading (1), Writing (1), Pentagon copy (1).
- **MDCalc Practice:** **MDCalc DOES NOT host the 30 MMSE questions.** MDCalc displays an explicit legal notice and routes clinicians to MoCA, SLUMS, or Mini-Cog.
- **Licensing & Copyright:** **HIGHLY PROPRIETARY AND AGGRESSIVELY LITIGATED**. Psychological Assessment Resources (PAR, Inc.) owns the commercial copyright and strictly forbids any digital reproduction of MMSE items without paying royalties.
- **Recommendation & Priority:** **LOW PRIORITY / MUST REMAIN SCORE ENTRY ONLY**.
  - **Do NOT expand into questions.** Keeping it as `MMSE (Score Entry)` is legally compliant.
  - Promote SLUMS and Mini-Cog as free, unencumbered clinical alternatives.

---

### 3.26 Montreal Cognitive Assessment (`moca`)
- **File:** `src/data/calculators/gi-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`score` numberInput 0–30, `edu` yesNo for ≤12 years education).
  - Name: explicitly titled `MoCA (Score Entry)`.
  - Status: **Intentional Score Entry Tool**.
- **Standard Clinical Instrument:**
  - Developed by Ziad Nasreddine et al. (2005, *J Am Geriatr Soc*).
  - 30-point bedside cognitive examination requiring physical paper stimulus sheet (trail making, cube copy, clock drawing, animal naming, digit spans, letter tap vigilance, serial 7s, repetition, abstraction, 5-word delayed recall, orientation).
- **MDCalc Practice:** MDCalc provides only score entry + education adjustment, accompanied by links to official MoCA test forms.
- **Licensing & Copyright:** **PROPRIETARY / MANDATORY CLINICIAN CERTIFICATION**. Owned by Dr. Ziad Nasreddine / MoCA Test Inc. Since 2020, administering the test requires paid certification (`mocatest.org`). Digital reproduction of test stimuli is prohibited.
- **Recommendation & Priority:** **LOW PRIORITY / MUST REMAIN SCORE ENTRY ONLY**.
  - Maintain current score entry + education adjustment architecture.

---

### 3.27 Saint Louis University Mental Status (`slums`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`score` numberInput 0–30, `education` selectInput for high school education).
  - Status: **Score Interpreter with Education Stratification**.
- **Standard Clinical Instrument:**
  - Developed by S. H. Tariq et al. / Saint Louis University & VA (2006, *Am J Geriatr Psychiatry*).
  - Specifically created as an **open, public-domain alternative to the proprietary MMSE** with superior sensitivity for Mild Cognitive Impairment (MCI).
  - 11 questions/tasks (30 points total):
    1. Day of the week (1 pt)
    2. Year (1 pt)
    3. State you are in (1 pt)
    4. 5 objects to remember (5 pts registration)
    5. Money calculation ($100 - $82, etc.) (2 pts)
    6. Animal naming fluency in 1 minute (>15 animals = 3 pts, 10–14 = 2 pts, 5–9 = 1 pt, 0–4 = 0 pts)
    7. Delayed recall of the 5 objects (5 pts)
    8. Number sequence backward (2 pts)
    9. Clock drawing (circle & numbers = 2 pts, correct time hands = 2 pts; 4 pts total)
    10. Shape discrimination / select largest triangle (2 pts)
    11. Story comprehension / recall facts from paragraph (4 pts)
  - Education-Stratified Cutoffs:
    - *High School Education*: Normal 27–30; MCI 21–26; Dementia 1–20.
    - *Less than High School*: Normal 25–30; MCI 20–24; Dementia 1–19.
- **MDCalc Practice:** MDCalc features the full 11 items with automated scoring and education stratification.
- **Licensing & Copyright:** **OPEN ACCESS / FREE FOR CLINICAL USE**. Saint Louis University Division of Geriatric Medicine grants free clinical use.
- **Recommendation & Priority:** **HIGH Priority**. 11 items (30 points). The premier open-access cognitive screening replacement for MMSE.

---

### 3.28 Clock Drawing Test (`clock-draw`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 1 `selectInput` (`score`, 0–5 Shulman scale).
  - Status: **Complete Qualitative Rating Selector**.
- **Standard Clinical Instrument:**
  - Developed by Kenneth I. Shulman (1993, *Int J Geriatr Psychiatry*).
  - The Shulman scale is inherently a **single holistic qualitative 6-tier rating** assigned by the clinician inspecting the patient's drawing of a clock set to 11:10:
    - 5 = Perfect clock (circle, numbers, and hands at 11:10 correct).
    - 4 = Minor visuospatial errors (numbers slightly uneven).
    - 3 = Inaccurate representation of 11:10 (time incorrect).
    - 2 = Moderate visuospatial disorganization (numbers crowded/missing).
    - 1 = Severe disorganization (numbers missing/reversed/random).
    - 0 = No reasonable representation of a clock.
- **MDCalc Practice:** Clinical calculators either use this 0–5 qualitative selector or embed clock drawing within Mini-Cog / SLUMS.
- **Licensing & Copyright:** Medical literature (1993). Free to use.
- **Recommendation & Priority:** **COMPLETE AS-IS**.
  - Already contains the complete 6 descriptive tiers.
  - Can optionally add an alternate component checklist mode (Circle = 1, Numbers = 1, Hands = 1).

---

### 3.29 ASPECTS - Alberta Stroke Program Early CT Score (`aspects`)
- **File:** `src/data/calculators/missing-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 3 inputs (`mode` selectInput for direct entry vs count, `score` numberInput, `regionsLost` numberInput).
  - Status: **Hybrid Direct / Region Count Helper**.
- **Standard Clinical Instrument:**
  - Developed by P. A. Barber et al. (2000, *Lancet*).
  - 10 defined anatomical regions in the middle cerebral artery (MCA) territory evaluated on non-contrast CT:
    - **Subcortical structures (3 points)**:
      1. Caudate (C)
      2. Lentiform nucleus (L)
      3. Internal capsule (IC)
    - **MCA cortical territory (7 points)**:
      4. Insular ribbon (I)
      5. M1: anterior MCA cortex
      6. M2: MCA cortex lateral to insular ribbon
      7. M3: posterior MCA cortex
      8. M4: anterior MCA territory superior to M1
      9. M5: lateral MCA territory superior to M2
      10. M6: posterior MCA territory superior to M3
  - Scoring: Initial score = 10. Subtract 1 point for each region with early ischemic change (hypoattenuation or loss of gray-white differentiation). Total score 0–10. (ASPECTS ≤7 indicates extensive early infarction and higher hemorrhage risk with thrombectomy).
- **MDCalc Practice:** MDCalc features 10 toggle buttons/checkboxes for the 10 anatomical regions, allowing the clinician/radiologist to tap affected regions.
- **Licensing & Copyright:** Standard clinical radiological scoring system; open access.
- **Recommendation & Priority:** **HIGH Priority**. Add 10 anatomical toggles (C, L, IC, I, M1–M6) alongside the existing direct total override.

---

### 3.30 Brief Pain Inventory - Pain Interference (`bpi-interference`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`avg` numberInput 0–10, `worst` numberInput 0–10).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Charles S. Cleeland & K. M. Ryan (1994, *Ann Acad Med Singap*).
  - 7 pain interference domains rated 0 (Does not interfere) to 10 (Completely interferes):
    1. General activity
    2. Mood
    3. Walking ability
    4. Normal work (both outside home and housework)
    5. Relations with other people
    6. Sleep
    7. Enjoyment of life
  - Score is the mean of the 7 items (0–10).
- **MDCalc Practice:** Clinical calculators display all 7 interference sliders/selectors.
- **Licensing & Copyright:** Charles S. Cleeland / MD Anderson Cancer Center. Free for clinical care and academic research.
- **Recommendation & Priority:** **HIGH Priority**. 7 items (0–10).

---

### 3.31 Zarit Burden Interview - 12-Item Short Form (`zarit-burden`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`form` selectInput 12 vs 22 items, `score` numberInput).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Steven H. Zarit (1980) / Short form by M. Bédard et al. (2001, *Gerontologist*).
  - 12 items rated 0 (Never), 1 (Rarely), 2 (Sometimes), 3 (Quite frequently), 4 (Nearly always):
    1. Feel you don't have enough time for yourself?
    2. Feel stressed between caring and other responsibilities?
    3. Feel angry when you are around your relative?
    4. Feel that your relative currently affects your relationship with other family members?
    5. Feel strained when you are around your relative?
    6. Feel your health has suffered?
    7. Feel that you don't have as much privacy as you would like?
    8. Feel your social life has suffered?
    9. Feel you have lost control of your life?
    10. Feel uncertain about what to do about your relative?
    11. Feel you should be doing more?
    12. Overall, how burdened do you feel?
  - Total score: 0–48. (0–10 No/mild burden; 11–20 Mild to moderate; >20 High burden).
- **MDCalc Practice:** MDCalc implements the 12-item short form.
- **Licensing & Copyright:** Standard clinical geriatric measure.
- **Recommendation & Priority:** **HIGH Priority**. 12 items (0–4 scale).

---

### 3.32 Informant Questionnaire on Cognitive Decline (`iqcode`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`average` numberInput 1.0–5.0, `form` selectInput 16 vs 26 items).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Anthony F. Jorm (1994, 2004, *Int Psychogeriatr*).
  - 16-item Short Form compares patient's cognitive functioning now compared to 10 years ago:
    - Rated 1 (Much improved), 2 (A bit improved), 3 (Not much change), 4 (A bit worse), 5 (Much worse).
    - Items assess: remembering things about family/friends, remembering things that happened recently, recalling conversations a few days later, remembering his/her address/phone, remembering what day/month it is, remembering where things are kept, remembering where to find things in unfamiliar places, knowing how to work everyday machines, learning new gadgets, learning new things in general, following a story in a book or TV, making decisions in everyday life, handling money for shopping, handling financial affairs (banking/pension), handling everyday arithmetic, intelligence to understand what is going on.
  - Final score: Sum of items / 16 (range 1.0 to 5.0). Score ≥3.31–3.38 indicates cognitive decline.
- **MDCalc Practice:** MDCalc features the 16 items.
- **Licensing & Copyright:** Anthony Jorm (Australian National University). Free for clinical and non-profit research use.
- **Recommendation & Priority:** **HIGH/MEDIUM Priority**. 16 items on 1–5 scale.

---

### 3.33 SCAT Concussion Symptom Evaluation (`scat5-symptom`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`numSymptoms` numberInput 0–22, `severity` numberInput 0–132).
  - Status: **Score Interpreter**.
- **Standard Clinical Instrument:**
  - SCAT5 / SCAT6 (Concussion in Sport Group, 2017 / 2023, *Br J Sports Med*).
  - 22 concussion symptoms rated 0 (None) to 6 (Severe):
    - Headache, "Pressure in head", Neck pain, Nausea or vomiting, Dizziness, Blurred vision, Balance problems, Sensitivity to light, Sensitivity to noise, Feeling slowed down, Feeling like "in a fog", "Don't feel right", Difficulty concentrating, Difficulty remembering, Fatigue or low energy, Confusion, Drowsiness, More emotional, Irritability, Sadness, Nervous or anxious, Trouble falling asleep.
  - Outputs: Total number of symptoms endorsed (0–22) and Symptom severity score (0–132).
- **MDCalc Practice:** MDCalc features the 22-symptom checklist with 0–6 rating options.
- **Licensing & Copyright:** Concussion in Sport Group / BMJ. Freely available for clinical sport concussion evaluation.
- **Recommendation & Priority:** **MEDIUM Priority**. 22 symptoms with 0–6 rating options.

---

### 3.34 NICHQ Vanderbilt ADHD Rating Scale (`vanderbilt-adhd`)
- **File:** `src/data/calculators/wave6-psych-sleep.ts`
- **Current Implementation:**
  - Inputs: 4 inputs (`inatt` numberInput count of 9, `hyper` numberInput count of 9, `perf` numberInput count of 8, `informant` selectInput).
  - Status: **Symptom Count Helper**.
- **Standard Clinical Instrument:**
  - Developed by Mark L. Wolraich et al. / NICHQ & AAP (2003, *J Pediatr Psychol*).
  - 18 core DSM ADHD symptom items rated 0 (Never), 1 (Occasionally), 2 (Often), 3 (Very often):
    - 9 Inattentive symptoms (items 1–9): careless mistakes, sustaining attention, listening, following instructions, organizing tasks, avoiding sustained effort, losing things, easily distracted, forgetful.
    - 9 Hyperactive/Impulsive symptoms (items 10–18): fidgeting, leaving seat, running/climbing, quiet play, on the go, talking excessively, blurting answers, awaiting turn, interrupting.
  - Performance section (items 48–55): reading, writing, mathematics, relationship with parents/peers/siblings.
  - Scoring: Item endorsed if rated 2 or 3 ("Often" or "Very often"). Requires ≥6 inattentive items and/or ≥6 hyperactive items, plus impairment in ≥1 performance area.
- **MDCalc Practice:** MDCalc features the 18 core ADHD symptom questions.
- **Licensing & Copyright:** NICHQ and American Academy of Pediatrics. Publicly available for clinical pediatric practice.
- **Recommendation & Priority:** **HIGH/MEDIUM Priority**. Replace the manual counts with the 18 core DSM questions.

---

### 3.35 Positive and Negative Syndrome Scale (`panss-simp`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 4 inputs (`total` numberInput 30–210, `positive` numberInput 7–49, `negative` numberInput 7–49, `general` numberInput 16–112).
  - Status: **Subscale & Total Score Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Stanley R. Kay, Abraham Fiszbein, & Lewis A. Opler (1987, *Schizophr Bull*).
  - 30 items evaluated via a 45–50 minute comprehensive semi-structured psychiatric clinical interview:
    - 7 Positive Scale items (P1 Delusions, P2 Conceptual disorganization, P3 Hallucinatory behavior, P4 Excitement, P5 Grandiosity, P6 Suspiciousness/persecution, P7 Hostility).
    - 7 Negative Scale items (N1 Blunted affect, N2 Emotional withdrawal, N3 Poor rapport, N4 Passive/apathetic social withdrawal, N5 Difficulty in abstract thinking, N6 Lack of spontaneity, N7 Stereotyped thinking).
    - 16 General Psychopathology items (G1 Somatic concern to G16 Active social avoidance).
  - Scored 1 (Absent) to 7 (Extreme). Total 30–210.
- **MDCalc Practice:** Clinical calculators rarely host the full 30-item interview manual; subscale entry is the standard digital format.
- **Licensing & Copyright:** Multi-Health Systems (MHS) holds formal copyright on the PANSS manual and test sheets.
- **Recommendation & Priority:** **LOW Priority for full interview expansion**. Current subscale entry design is clinically and legally appropriate.

---

### 3.36 MDS-UPDRS Part III Motor Examination (`updrs-simp`)
- **File:** `src/data/calculators/wave2-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 2 inputs (`part3` numberInput 0–132, `state` selectInput for medication state).
  - Status: **Motor Subtotal Interpreter**.
- **Standard Clinical Instrument:**
  - Movement Disorder Society Unified Parkinson's Disease Rating Scale (Goetz et al., 2008).
  - Part III (Motor Examination) has 18 sections containing 33 individual physical examination ratings (speech, facial expression, neck/extremity rigidity, finger tapping, hand movements, pronation-supination, toe tapping, leg agility, chair rise, gait, freezing, postural stability, posture, spontaneity, rest/postural/kinetic tremors). Each rated 0–4. Total 0–132.
- **MDCalc Practice:** Full 33-item motor examination forms exist, but clinicians frequently calculate the Part III sum on paper/EMR and utilize digital tools for staging and change tracking.
- **Licensing & Copyright:** International Parkinson and Movement Disorder Society (MDS).
- **Recommendation & Priority:** **LOW/MEDIUM Priority**. Subtotal entry is appropriate; full 33-item motor exam could be offered as an optional collapsible section.

---

### 3.37 Addenbrooke's Cognitive Examination III (`ace-iii-total`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 6 inputs (`total` numberInput 0–100, plus 5 optional domain numberInputs: attention 0–18, memory 0–26, fluency 0–14, language 0–26, visuospatial 0–16).
  - Status: **Domain Subtotal & Total Interpreter**.
- **Standard Clinical Instrument:**
  - Developed by Fiona Hsieh et al. / John R. Hodges (2013, *Dement Geriatr Cogn Disord*).
  - 15–20 minute examiner-administered neuropsychological battery requiring physical stimulus sheets, reading cards, pencil-and-paper clock/cube drawing, and word generation.
- **MDCalc Practice:** Digital calculators act as domain score calculators and cutoff interpreters.
- **Licensing & Copyright:** Sydney Brain and Mind Centre. Free for clinical use, but requires physical stimulus booklets.
- **Recommendation & Priority:** **LOW Priority for full battery**. Current domain-based subscore architecture is the correct implementation for a web calculator.

---

### 3.38 CIWA-B Benzodiazepine Withdrawal (`ciwa-b`)
- **File:** `src/data/calculators/wave4-neuro-psych.ts`
- **Current Implementation:**
  - Inputs: 4 inputs (`score` numberInput 0–80, plus 3 clinical risk flags: seizure history, high dose, concurrent alcohol).
  - Status: **Score Interpreter with Risk Stratification**.
- **Standard Clinical Instrument:**
  - Developed by U. Busto et al. (1989, *Clin Pharmacol Ther*).
  - 22 items assessing benzodiazepine withdrawal symptoms.
- **MDCalc Practice:** Rarely used compared to CIWA-Ar for alcohol. MDCalc does not host CIWA-B.
- **Licensing & Copyright:** CAMH / Addiction Research Foundation.
- **Recommendation & Priority:** **LOW Priority**. Current simplified interpreter with high-risk clinical flags is sufficient.

---

## 4. Architectural Recommendations for Implementation

When the team proceeds to execute enhancements, the following software patterns should be adopted:

### 4.1 Reusable Likert Question Group Pattern
Instead of repeating boilerplate `selectInput` declarations across 10–20 items, leverage concise array definitions with shared response options:

```typescript
// Example: Standard 0–4 Frequency Scale Generator
function likert0to4(idPrefix: string, questions: string[], labels: string[]) {
  return questions.map((q, idx) =>
    selectInput(`${idPrefix}_${idx + 1}`, `${idx + 1}. ${q}`, [
      { label: labels[0] || 'Not at all (0)', value: 0, points: 0 },
      { label: labels[1] || 'Several days (1)', value: 1, points: 1 },
      { label: labels[2] || 'More than half the days (2)', value: 2, points: 2 },
      { label: labels[3] || 'Nearly every day (3)', value: 3, points: 3 },
    ], 0)
  );
}
```

### 4.2 Dual-Entry Mode Pattern (Full Survey vs Precomputed Score)
For calculators where busy clinicians frequently already have a pre-calculated total from a paper form or EHR note (e.g., `aspects`, `barthel-index`, `pcl5`), offer a toggle:
- `entryMode: 'full'` (Default: display the full questions for bedside screening).
- `entryMode: 'direct'` (Display a single `numberInput` for instant interpretation of an existing score).

### 4.3 Strict Intellectual Property Guardrails
- **NEVER** add the question text for Pearson-owned tools (`bai`, `bdi-ii`) or PAR-owned tools (`mmse`).
- Always verify copyright status before transcribing psychometric items. Tools developed by US federal agencies (VA, NIMH, CDC) such as `pcl5` and `asq-suicide`, or classic tools published before 1978 without renewed copyright (e.g. `barthel-index`, `ham-a`, `ham-d`), are unencumbered.
- Tools requiring mandatory clinician training and credentialing (e.g., `moca`) should remain score interpreters with links to official portals.

---

## 5. Summary Implementation Queue

```
================================================================================
PHASE 1: HIGH PRIORITY (Open, High Clinical Impact, 5–20 Items)
================================================================================
[ ] mchat-r           (20 Yes/No items, reverse score 2, 5, 12)       [Pediatrics]
[ ] barthel-index     (10 ADL pickers, 0–100, public domain)         [Geriatrics/Neuro]
[ ] pcl5              (20 items, 0–80, DSM clusters, public domain)  [Psychiatry/Trauma]
[ ] isi-insomnia      (7 items, 0–28, insomnia severity)             [Sleep]
[ ] madrs             (10 items, 0–60, depression interview)         [Psychiatry]
[ ] ham-a             (14 items, 0–56, anxiety interview)            [Psychiatry]
[ ] ham-d             (17 items, 0–52, depression interview)         [Psychiatry]
[ ] ymrs              (11 items, 0–60, mania rating)                 [Psychiatry]
[ ] yale-brown-ocd    (10 items, 5 obsessions + 5 compulsions)       [Psychiatry]
[ ] cudit-r           (8 items, 0–32, cannabis screen)               [Addiction]
[ ] pain-detect       (9 items, -1 to 38, neuropathic pain)          [Pain/Neuro]
[ ] nose-scale        (5 items, 0–100, nasal obstruction)            [ENT]
[ ] cornell-dementia  (19 items, 0–38, depression in dementia)       [Geriatrics/Psych]
[ ] phq-a             (9 items, 0–27, adolescent depression)         [Pediatrics/Psych]
[ ] slums             (11 items, 0–30, open MMSE replacement)        [Cognitive/Geriatrics]
[ ] aspects           (10 anatomical CT region checkboxes)           [Stroke/Neuro]
[ ] psqi              (7 component selectors, 0–21)                  [Sleep]

================================================================================
PHASE 2: MEDIUM PRIORITY (Larger Questionnaires & Dual Matrices)
================================================================================
[ ] lsas-social       (24 items x 2 dual fear/avoidance matrix)      [Psychiatry]
[ ] eat-26            (26 attitude items + 5 behavioral flags)       [Psychiatry/ED]
[ ] sds-zung          (20 items, 10 reverse scored)                  [Psychiatry]
[ ] sas-zung-anxiety  (20 items, 5 reverse scored)                   [Psychiatry]
[ ] snot-22           (22 items, 0–110 sinonasal outcome)            [ENT]
[ ] scat5-symptom     (22 concussion symptoms, 0–6 rating)           [Sports/Neuro]
[ ] zarit-burden      (12 items, caregiver burden short form)        [Geriatrics]
[ ] iqcode            (16 items, informant cognitive decline)        [Geriatrics]
[ ] vanderbilt-adhd   (18 core DSM ADHD questions)                   [Pediatrics]
[ ] bpi-interference  (7 pain interference items, 0–10)              [Pain]

================================================================================
PRESERVE AS INTERPRETERS (Proprietary / Complex Hands-on Battery)
================================================================================
[-] bdi-ii            Proprietary (Pearson Clinical) - DO NOT EXPAND
[-] bai               Proprietary (Pearson Clinical) - DO NOT EXPAND
[-] mmse              Proprietary (PAR, Inc.) - DO NOT EXPAND
[-] moca              Certified examiner required (MoCA Test Inc.)
[-] ace-iii-total     Examiner paper stimulus battery
[-] panss-simp        45-minute clinical interview
[-] updrs-simp        Neurologist physical motor examination
[-] ciwa-b            Hospital bedside assessment
[-] clock-draw        Qualitative clinical rating (Complete as-is)
```
