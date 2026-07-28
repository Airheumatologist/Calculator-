# Clinical text audit — When to use / Why use / Next steps

**Completed:** 2026-07-28T14:24:07.159Z

## Scope

- Fields: `whenToUse`, `whyUse`, `nextSteps`
- Policy: fix **inaccuracies only**; keep text **slim**; no new points unless required for correctness
- Method: 40 parallel agent batches, web-searched per score against guidelines/literature

## Totals

| Metric | Count |
|--------|------:|
| Batches | 40 |
| Calculators audited | 905 |
| Fixed | 98 |
| OK (no edit) | 812 |
| Uncertain | 0 |

## All fixes (98)

### `cha2ds2-vasc` (batch 1)
- **Issue:** whyUse listed ESC as still recommending CHA₂DS₂-VASc; ESC 2024 endorses sex-neutral CHA₂DS₂-VA instead
- **Issue:** nextSteps 'Score 0–1' omitted sex-specific intermediate band (consider OAC for men=1 / women=2) and incorrectly bundled women score 1 with individualized OAC
- **Change:** whyUse: 'guideline-recommended (AHA/ACC/HRS, ESC)...' → 'AHA/ACC guideline-recommended... (ESC 2024 prefers CHA₂DS₂-VA)'
- **Change:** nextSteps: replaced single 'Score 0–1' band with 'Score 1 (men) or 2 (women)' (consider OAC) and 'Score 0 (men) or 1 (women)' (generally no OAC); kept ≥2 men / ≥3 women start DOAC

### `spesi` (batch 1)
- **Issue:** whenToUse said 'acute PE' without specifying confirmed PE; sPESI is for severity/disposition after PE diagnosis, not diagnostic workup
- **Change:** whenToUse: 'Rapid risk stratification of acute PE.' → 'Rapid risk stratification of confirmed acute PE.'

### `map` (batch 1)
- **Issue:** nextSteps listed unqualified 'Source control' for all MAP <65 shock; source control applies to septic/infectious shock, not all shock phenotypes
- **Change:** nextSteps action 'Source control' → 'Treat underlying cause'

### `ascvd-risk` (batch 1)
- **Issue:** whyUse framed tool for 'statin and aspirin discussions'; 2019 ACC/AHA primary prevention guidelines de-emphasize routine aspirin; PCE mainly guides statin/lifestyle intensity
- **Change:** whyUse: 'statin and aspirin discussions' → 'statin and lifestyle primary-prevention discussions'

### `qsofa` (batch 2)
- **Issue:** whyUse framed qSOFA as a simple sepsis screen; SSC 2021 strongly recommends against qSOFA as a single screening tool vs SIRS/NEWS/MEWS (low sensitivity).
- **Change:** {"field":"whyUse","from":"Simple screen for organ dysfunction risk; not a diagnostic criteria for sepsis alone.","to":"Bedside mortality/organ-dysfunction risk prompt; not a sole sepsis screen (SSC 2021) or diagnostic criterion alone."}

### `news2` (batch 2)
- **Issue:** nextSteps incorrectly grouped aggregate score ≥7 with single parameter = 3 as equivalent escalation; RCP/NICE assign different responses.
- **Change:** {"field":"nextSteps","from":"[{ condition: 'Score ≥7 or single param 3', actions: ['Urgent senior review', 'Consider critical care outreach'] }, { condition: 'Score 5–6', actions: ['Increase observations', 'Prompt medical review'] }]","to":"[{ condition: 'Score ≥7', actions: ['Emergency critical care assessment', 'Continuous monitoring / higher-level care'] }, { condition: 'Score 5–6', actions: ['Urgent ward-based review', 'Increase observation frequency'] }, { condition: 'Single param = 3', actions: ['Urgent ward doctor review', 'Adjust monitoring / consider escalation'] }]"}

### `rts` (batch 2)
- **Issue:** whenToUse said field triage, but calculator implements weighted RTS (TRISS/prognosis); field triage typically uses unweighted T-RTS (sum 0–12).
- **Change:** {"field":"whenToUse","from":"Field or ED trauma triage and prognosis.","to":"Trauma severity/prognosis (weighted RTS in TRISS); field triage often uses unweighted T-RTS."}

### `ottawa-ankle` (batch 3)
- **Issue:** whenToUse age phrasing '≥2–18+ years (validated adults)' was confusing and misstated the validated population
- **Change:** whenToUse → 'Acute ankle or midfoot injury (<10 days) in patients ≥2 years (adults and children).'

### `westley-croup` (batch 3)
- **Issue:** Moderate–severe nextSteps omitted dexamethasone; steroids indicated for all croup severities
- **Change:** nextSteps Moderate–severe actions: added 'Dexamethasone' before nebulized epinephrine

### `pecarn-head` (batch 3)
- **Issue:** nextSteps collapsed intermediate and high risk into 'Higher risk → CT', omitting observation option for intermediate risk
- **Change:** nextSteps: added Intermediate condition with 'Observation vs CT (shared decision-making)'; retained Higher risk → CT

### `nyha` (batch 4)
- **Issue:** whenToUse said 'Staging' functional limitation; NYHA is functional classification, not ACC/AHA stages A–D
- **Change:** whenToUse: 'Staging functional limitation in known HF.' → 'Classifying functional limitation in known HF.'

### `glasgow-blatchford` (batch 4)
- **Issue:** whyUse limited outpatient band to score 0 only; ACG 2021 and many pathways use GBS 0–1
- **Issue:** nextSteps 'GBS ≥1 Admit' incorrectly forces admission for GBS 1 (very-low-risk band)
- **Change:** whyUse: 'Score 0 identifies…' → 'Score 0–1 identifies very low-risk patients often safe for outpatient management.'
- **Change:** nextSteps condition 'GBS 0' → 'GBS ≤1'; 'GBS ≥1' → 'GBS ≥2'

### `rcri` (batch 5)
- **Issue:** nextSteps for RCRI 0–1 emphasized 'surgical recovery' (post-op language); for a preoperative risk tool the low-risk action is proceed without further cardiac testing when capacity/symptoms allow (AHA 2024 / Lee pathway)
- **Change:** nextSteps RCRI 0–1 actions: 'Focus on guideline-directed medical therapy and surgical recovery' → 'Proceed without additional cardiac testing if functional capacity adequate and no active cardiac symptoms'

### `crb65` (batch 5)
- **Issue:** nextSteps lumped Score 1–2 as 'Hospital assessment'; NICE NG250 (2025) and primary-care use of CRB-65 treat score 1 with clinical judgment (home safety-netting vs same-day assessment), with hospital referral more clearly indicated at score ≥2
- **Change:** nextSteps: split 'Score 1–2' into 'Score 1' (home with safety-netting vs same-day assessment) and 'Score 2' (hospital assessment / short-stay)

### `smart-cop` (batch 5)
- **Issue:** nextSteps Score ≥5 listed 'Source control and timely antibiotics'; source control is not a routine CAP action (unless empyema/abscess); high SMART-COP pathways emphasize timely abx and consideration of MRSA/Pseudomonas coverage when risk factors present
- **Change:** nextSteps Score ≥5: 'Source control and timely antibiotics' → 'Timely antibiotics; broaden if MRSA/Pseudomonas risk factors'

### `new-orleans-ct-head` (batch 6)
- **Issue:** whenToUse said 'LOC or amnesia'; original Haydel/MDCalc inclusion is GCS 15 with LOC (amnesia is a criterion, not the inclusion alternative).
- **Change:** whenToUse → 'Adults with minor head injury, GCS 15, and loss of consciousness (normal neuro exam).'

### `sf-syncope` (batch 6)
- **Issue:** whyUse claimed 'high-sensitivity'; external validations often failed to reproduce original sensitivity.
- **Change:** whyUse → 'Simple CHESS screen; any positive criterion = higher short-term risk (external sensitivity varies).'

### `lrinec` (batch 6)
- **Issue:** nextSteps used ≥8 as OR threshold; classic LRINEC rule-in/moderate–high starts at ≥6 (6–7 intermediate, ≥8 high).
- **Change:** nextSteps high-risk condition → '≥6 or high clinical suspicion' with urgent surgical consult / OR exploration

### `aims65` (batch 6)
- **Issue:** nextSteps said 'PPI infusion'; continuous infusion is not mandated by AIMS65 and intermittent IV PPI is widely accepted.
- **Change:** nextSteps Score ≥2 action → 'IV PPI per protocol' (was 'PPI infusion per protocol')

### `khorana` (batch 7)
- **Issue:** nextSteps used Score ≥3 for prophylaxis discussion; ASCO (2019/2023) recommends offering/discussing ambulatory thromboprophylaxis at Khorana ≥2 (AVERT/CASSINI-aligned), while original high-risk band remains ≥3
- **Change:** nextSteps condition 'Score ≥3' → 'Score ≥2' for discuss prophylaxis vs bleed risk

### `hunt-hess` (batch 8)
- **Issue:** whenToUse included 'suspected' SAH; Hunt-Hess is a post-diagnosis clinical severity grade for confirmed SAH
- **Issue:** nextSteps under 'Any SAH grade' listed CT±LP diagnostic workup appropriate to undiagnosed headache/SAH suspicion, not graded SAH
- **Issue:** seizure precautions language risked implying routine ASM prophylaxis, which AHA/ASA 2023 recommends against except selected high-risk features
- **Change:** whenToUse: 'suspected or confirmed' → 'confirmed'
- **Change:** nextSteps (Any SAH): removed CT±LP; kept aneurysm imaging/securement, BP/coagulopathy/nimodipine; clarified seizures vs routine ASM prophylaxis

### `fisher-grade` (batch 8)
- **Issue:** Nimodipine and euvolemia listed only under Grade ≥3; nimodipine is indicated for all aSAH (unless contraindicated), not only high mFisher grades
- **Change:** Split nextSteps into 'All aSAH' (nimodipine; euvolemia / avoid prophylactic hypervolemia) and 'Grade ≥3 (thick SAH)' (DCI monitoring, TCD/perfusion threshold)

### `loading-dose` (batch 9)
- **Issue:** whenToUse limited tool to 'IV loading doses' despite bioavailability (F) options for oral routes; whyUse 'steady concentration' overstated (loading dose targets a concentration, not steady state by itself)
- **Change:** whenToUse: 'Estimating IV loading doses when Vd and target level are known' → 'Estimating loading doses when Vd and target concentration are known'
- **Change:** whyUse: 'achieving steady concentration quickly' → 'rapidly achieving a target plasma concentration'

### `serum-osmolality` (batch 10)
- **Issue:** whyUse mentioned only osmolal gap/toxic alcohols, omitting primary use of calculated osm for hyponatremia tonicity classification
- **Change:** whyUse: 'Osmolal gap screens for methanol/ethylene glycol and other osmoles.' → 'Calculated osm for hyponatremia tonicity; gap screens toxic alcohols/other osmoles.'

### `bsa` (batch 10)
- **Issue:** whenToUse listed 'burn estimates adjunct'; Mosteller absolute BSA (m²) is not used for burn %TBSA or Parkland fluid dosing (those use Rule of Nines/Lund-Browder %TBSA × weight)
- **Change:** whenToUse: 'Chemotherapy dosing, cardiac index, burn estimates adjunct.' → 'Chemotherapy dosing and cardiac index normalization.'

### `adhere-hf` (batch 11)
- **Issue:** whenToUse said 'early mortality'; ADHERE tree predicts in-hospital mortality (Fonarow JAMA 2005), not a generic early-mortality endpoint.
- **Change:** whenToUse: 'early mortality risk stratification' → 'in-hospital mortality risk stratification'

### `cpc-score` (batch 11)
- **Issue:** nextSteps for CPC 3–4 implied ICU/neuroprognostication pathway as default; CPC is primarily an outcome category (often at discharge) and CPC 3 is conscious severe disability, not ICU care by definition.
- **Change:** nextSteps CPC 3–4: replaced 'Neuroprognostication timeline' and 'Supportive ICU care' with 'Supportive care and disposition planning' and 'Rehab as appropriate'

### `stroke-volume` (batch 11)
- **Issue:** nextSteps 'Consider ICD eligibility chronically' at EF <40% is inaccurate: primary-prevention ICD is generally LVEF ≤35% (with GDMT/time criteria), while HFrEF is EF ≤40%.
- **Change:** nextSteps condition EF <40% → EF ≤40%; actions now HF workup, GDMT for HFrEF when indicated, ICD evaluation if EF remains ≤35% after GDMT

### `mehran-contrast` (batch 11)
- **Issue:** whenToUse broadened population to 'PCI / contrast exposure'; original Mehran score was derived/validated for CIN after PCI, not general contrast procedures.
- **Change:** whenToUse: 'Patients undergoing PCI / contrast exposure when estimating CIN and dialysis risk.' → 'Patients undergoing PCI when estimating contrast-induced nephropathy and dialysis risk.'

### `ldl-sampson` (batch 12)
- **Issue:** whenToUse called TG up to ~800 mg/dL 'moderately elevated'; NCEP/AHA classify TG ≥500 as very high and 200–499 as high — 800 is beyond moderate.
- **Change:** whenToUse: 'moderately elevated (up to ~800 mg/dL)' → 'elevated (validated to ~800 mg/dL)'

### `calcium-phosphate-product` (batch 12)
- **Issue:** whyUse implied ongoing clinical validity of Ca×P product ('still a quick composite marker') without noting KDIGO 2017 de-emphasis of the product as a treatment guide.
- **Change:** whyUse: clarified historical Ca×P <55 construct and that KDIGO prefers individual Ca and phosphate targets over the product alone

### `creatinine-clearance-timed` (batch 12)
- **Issue:** whyUse called timed CrCl the 'gold-standard' bedside formula; true gold-standard GFR uses exogenous filtration markers (inulin/iothalamate/nuclear); timed CrCl overestimates GFR due to tubular secretion.
- **Change:** whyUse: 'Gold-standard bedside clearance formula before (or when) nuclear GFR unavailable' → 'Classic measured clearance from timed urine when eGFR is unreliable; overestimates true GFR vs exogenous-marker methods'

### `midas` (batch 13)
- **Issue:** nextSteps MOH action mentioned only simple/combo analgesics; MOH also driven by triptans, opioids, and combination acute therapies (ICHD / AHS)
- **Change:** {"field":"nextSteps","from":"Limit simple/combo analgesics to avoid MOH","to":"Limit acute med days (analgesics/triptans/opioids) to avoid MOH"}

### `cage-aid` (batch 13)
- **Issue:** nextSteps condition 'Score ≥1–2' was ambiguous (could be read as only scores 1–2, excluding 3–4) despite both ≥1 (sensitive) and ≥2 (specific) being valid positive cutoffs
- **Change:** {"field":"nextSteps.condition","from":"Score ≥1–2","to":"Score ≥1"}

### `icans-grade` (batch 14)
- **Issue:** nextSteps grade ≥2 said 'Hold driving precautions' (ambiguous/incorrect phrasing)
- **Issue:** nextSteps omitted corticosteroids at grade ≥2 despite standard CAR-T pathways and this calculator's own grade-2 interpretation commonly starting steroids
- **Change:** nextSteps grade ≥2: 'Hold driving precautions' → 'Driving restrictions'; added 'Consider corticosteroids per protocol'

### `ctcae-neutropenia` (batch 14)
- **Issue:** nextSteps condition 'Fever + ANC <0.5–1.0' is ambiguous (reads as a closed range and could exclude profound neutropenia <0.5)
- **Change:** nextSteps condition: 'Fever + ANC <0.5–1.0' → 'Fever + ANC <1.0' (CTCAE febrile neutropenia ANC <1000/µL; covers grade 3–4 and clinical FN pathways)

### `ottawa-hip` (batch 15)
- **Issue:** whyUse claimed 'high sensitivity for hip fracture' as if a validated Ottawa-style rule; PubMed has no Stiell hip radiography decision rule (cited PMID 9403421 is Ottawa Knee implementation), and next-step clinical cues remain reasonable without that claim.
- **Change:** {"field":"whyUse","from":"Supports selective imaging while retaining high sensitivity for hip fracture.","to":"Structures common high-yield cues for hip radiographs after trauma; occult fracture still possible if nonambulatory."}

### `goese` (batch 15)
- **Issue:** nextSteps condition 'GOS-E ≤4' included death (GOS-E 1) in a rehab/caregiver action pathway; parallel GOS text correctly starts at grade 2.
- **Change:** {"field":"nextSteps","from":"condition 'GOS-E ≤4'","to":"condition 'GOS-E 2–4' (vegetative through upper severe disability; excludes death)"}

### `mulbsta` (batch 16)
- **Issue:** nextSteps used Score ≤6 and ≥10; derivation/validation risk bands are 0–11 low and ≥12 high (Youden cut-off 12).
- **Change:** nextSteps: Score ≤6 → Score 0–11; Score ≥10 → Score ≥12 (aligned with Guo et al. MuLBSTA cut-offs).

### `isaric-4c` (batch 16)
- **Issue:** whenToUse over-extended score to 'similar ILI pathways'; 4C Mortality is validated for hospitalized COVID-19.
- **Change:** whenToUse: limited to adults hospitalized with confirmed or suspected COVID-19 for in-hospital mortality stratification.

### `improve-vte` (batch 16)
- **Issue:** nextSteps listed prophylaxis only at Score ≥4; for inpatient pharmacologic prophylaxis need, common validated threshold is ≥2 (0–1 low; 2–3 moderate; ≥4 high).
- **Change:** nextSteps: Score ≥4 → Score ≥2 for LMWH/UFH prophylaxis unless bleed risk high; slimmed 0–1 actions.

### `cdi-severity` (batch 16)
- **Issue:** Non-severe nextSteps said 'Standard CDI therapy' (ambiguous; metro no longer preferred first-line).
- **Change:** Non-severe actions: 'Standard CDI therapy' → 'Fidaxomicin or PO vancomycin'.

### `sepsis-3-shock` (batch 16)
- **Issue:** Sepsis without shock nextSteps listed 'SOFA/qSOFA'; Sepsis-3 defines sepsis by SOFA rise; qSOFA is screening only.
- **Change:** Sepsis without shock: 'SOFA/qSOFA assessment' → 'SOFA-based organ dysfunction assessment'.

### `crusade` (batch 17)
- **Issue:** High/very high nextSteps listed 'Reassess triple therapy need'; CRUSADE is an NSTE-ACS in-hospital major-bleeding model, not a triple-therapy decision tool — primary actions are bleeding-avoidance (radial access, antithrombotic dosing).
- **Change:** {"field":"nextSteps","from":"High/very high band: Bleeding-avoidance strategies; Reassess triple therapy need; Close Hb monitoring","to":"High/very high band: Bleeding-avoidance strategies; Prefer radial access / dose-adjust anticoagulants; Close Hb monitoring"}

### `hcm-risk-scd` (batch 17)
- **Issue:** nextSteps for high marker count said 'Avoid competitive sports per guidelines'; current AHA/ACC HCM and sports participation guidance emphasize shared decision-making rather than blanket competitive-sports prohibition.
- **Change:** {"field":"nextSteps","from":"Multiple markers / syncope / MWT≥30: Specialty HCM clinic; ICD shared decision; Avoid competitive sports per guidelines","to":"Multiple markers / syncope / MWT≥30: Specialty HCM clinic; ICD shared decision; Exercise counseling with HCM expert (shared decision)"}

### `ottawa-score-vte-cancer` (batch 17)
- **Issue:** whyUse implied the score guides secondary-prevention duration; Ottawa stratifies recurrent VTE risk while on anticoagulation in cancer-associated VTE, not post-treatment duration decisions.
- **Change:** {"field":"whyUse","from":"Identifies lower vs higher recurrence risk strata that may inform secondary prevention intensity/duration discussions.","to":"Identifies lower vs higher recurrence risk while anticoagulated; informs counseling and intensity discussions (not a stop rule)."}

### `herdoo2` (batch 17)
- **Issue:** whenToUse said women with unprovoked VTE; derivation/validation apply to women with a first unprovoked VTE after 5–12 months of anticoagulation.
- **Change:** {"field":"whenToUse","from":"Women with unprovoked VTE after completing 5–12 months of anticoagulation when considering discontinuation.","to":"Women with a first unprovoked VTE after completing 5–12 months of anticoagulation when considering discontinuation."}

### `marshall-organ` (batch 18)
- **Issue:** whyUse said organ failure 'defines moderately severe/severe pancreatitis'; revised Atlanta also classifies moderately severe disease via local complications or comorbidity exacerbation without organ failure; persistent OF ≥48 h defines severe
- **Change:** {"field":"whyUse","from":"Organ failure (score ≥2 in any system) defines moderately severe/severe pancreatitis and drives ICU decisions.","to":"Organ failure (score ≥2 in any system) marks non-mild disease; persistent ≥48 h defines severe pancreatitis (revised Atlanta) and drives ICU decisions."}

### `apfel-ponv` (batch 18)
- **Issue:** nextSteps said single-agent prophylaxis is often sufficient for Apfel 0–1; Fourth Consensus Guidelines (Gan 2020) recommend multimodal (≥2 classes) for adults with ≥1 risk factor, with optional single agent mainly for score 0
- **Change:** {"field":"nextSteps","from":"[{ condition: '0–1', actions: ['Single-agent prophylaxis often sufficient', 'Rescue antiemetic available'] }, { condition: '≥2', actions: ['≥2 prophylactic classes', 'Opioid-sparing strategy', 'Consider propofol TIVA'] }]","to":"[{ condition: '0', actions: ['Optional single agent', 'Rescue antiemetic available'] }, { condition: '≥1', actions: ['≥2 prophylactic classes (multimodal)', 'Opioid-sparing strategy', 'Consider propofol TIVA if high risk'] }]"}

### `catch-rule` (batch 18)
- **Issue:** nextSteps for medium-risk framed CT as optional shared-decision vs observation; original CATCH recommends CT when any high- or medium-risk feature is present (medium-risk predicts CT brain injury)
- **Change:** {"field":"nextSteps","from":"[{ condition: 'Medium-risk only', actions: ['CT vs shared decision observation', 'Strict return precautions if observed'] }]","to":"[{ condition: 'Medium-risk only', actions: ['CT head recommended (original CATCH)', 'Observation only if local protocol / reliable shared decision', 'Strict return precautions if observed'] }]"}

### `akin-aki` (batch 20)
- **Issue:** whenToUse mentioned only the 48-hour creatinine window and omitted urine-output staging, though AKIN (and this calculator) stages by Cr and/or UO
- **Change:** whenToUse: 'Staging AKI with AKIN criteria (48-hour window for creatinine rise).' → 'Staging AKI with AKIN criteria (Cr rise within 48 h and/or urine output).'

### `vexus` (batch 20)
- **Issue:** whyUse listed only hepatic/portal/intrarenal Doppler and omitted IVC size, which is required to grade VExUS (IVC <2 cm → grade 0)
- **Change:** whyUse: 'Integrates hepatic vein, portal vein, and intrarenal venous Doppler…' → 'Integrates IVC size with hepatic, portal, and intrarenal venous Doppler into a congestion grade.'

### `cerebral-perfusion` (batch 20)
- **Issue:** whyUse said 'Maintains estimate' (wrong verb) and 'common goals ≥60 mmHg'; BTF targets CPP 60–70 mmHg and cautions against aggressive CPP >70
- **Change:** whyUse: 'Maintains estimate of net pressure driving cerebral blood flow; common goals ≥60 mmHg.' → 'Estimates net pressure driving cerebral blood flow; common targets 60–70 mmHg.'

### `nips` (batch 21)
- **Issue:** nextSteps condition 'Score ≥3–4' was ambiguous (reads as a closed range) and conflicted with common practice that pain intervention starts at scores >3 / ≥3.
- **Change:** nextSteps condition: 'Score ≥3–4' → 'Score ≥3' (aligns with evidence note that scores >3 often treated as pain and with calc mild–moderate band starting at 3).

### `philadelphia-criteria` (batch 21)
- **Issue:** whenToUse said classically 29–60 days; original Baker Philadelphia cohort was 29–56 days of age.
- **Change:** whenToUse: '29–60 days' → '29–56 days' (Baker et al. NEJM 1993 enrollment age).

### `pecarn-fever` (batch 21)
- **Issue:** whenToUse/whyUse framed primary outcome as 'invasive bacterial infection' only; Kuppermann PECARN 2019 primary outcome is serious bacterial infection (SBI: UTI, bacteremia, bacterial meningitis). Age affects disposition more than lab cutoffs.
- **Change:** whenToUse: 'invasive bacterial infection risk' → 'serious bacterial infection (SBI) risk'.
- **Change:** whyUse: 'with age stratification' → 'age band guides disposition' (labs UA/ANC/PCT; disposition differs by ≤28 vs 29–60 d).

### `salicylate-level` (batch 22)
- **Issue:** nextSteps action 'Avoid intubation delays/hypoventilation' is ambiguous and can be read as urging early intubation; salicylate teaching is to avoid intubation when possible and, if required, prevent peri-intubation hypoventilation.
- **Change:** nextSteps Significant toxicity: rewrote intubation action to 'Avoid intubation if possible; if intubating, prevent hypoventilation'

### `nms-criteria` (batch 22)
- **Issue:** whenToUse includes abrupt dopamine agonist withdrawal, but nextSteps only said 'Stop neuroleptics', which is incomplete/wrong for withdrawal-precipitated NMS (restart agonists).
- **Change:** nextSteps High concern NMS: replaced single 'Stop neuroleptics' with 'Stop dopamine antagonists (neuroleptics/antiemetics)' and 'Restart dopamine agonists if recently withdrawn'

### `vte-bleed` (batch 23)
- **Issue:** whenToUse said on (or starting) anticoagulation; VTE-BLEED was derived/validated for major bleeding during the stable anticoagulation phase after VTE, not the acute initiation period.
- **Change:** {"field":"whenToUse","from":"Patients with VTE on (or starting) anticoagulation when assessing major bleed risk.","to":"Patients with VTE on stable anticoagulation when assessing major bleed risk (e.g., extended-therapy decisions)."}

### `riete-vte` (batch 23)
- **Issue:** whyUse claimed 'Seven binary RIETE items'; published RIETE PE prognosis tools differ, and the implemented items are sPESI-like (age, cancer, chronic HF, chronic lung disease, HR, SBP, O₂ sat) with cardiopulmonary disease split.
- **Change:** {"field":"whyUse","from":"Seven binary RIETE items map low vs higher mortality risk strata from the RIETE registry.","to":"sPESI-like binary items (age, cancer, chronic HF, chronic lung disease, tachycardia, hypotension, hypoxia) band short-term PE mortality risk (RIETE-era literature)."}

### `feverpain-score` (batch 23)
- **Issue:** nextSteps for 2–3 and 4–5 did not match NICE NG84 (no Abx or delayed for 2–3; immediate or delayed for 4–5) and over-emphasized testing.
- **Change:** {"field":"nextSteps","from":"[{ condition: '0–1', actions: ['Supportive care', 'Safety netting'] }, { condition: '2–3', actions: ['Delayed Abx or testing'] }, { condition: '4–5', actions: ['Immediate Abx or confirm with test'] }]","to":"[{ condition: '0–1', actions: ['Supportive care', 'No routine Abx', 'Safety netting'] }, { condition: '2–3', actions: ['No Abx or delayed (backup) Abx'] }, { condition: '4–5', actions: ['Immediate or delayed (backup) Abx'] }]"}

### `odds-to-risk` (batch 24)
- **Issue:** whenToUse incorrectly said 'odds ratios' — this tool converts odds ↔ probability, not odds ratios
- **Change:** {"field":"whenToUse","from":"Moving between odds ratios / pre-test odds and natural frequencies.","to":"Converting between odds and probability (e.g., pre-test odds for Bayesian reasoning)."}

### `r-ipi` (batch 25)
- **Issue:** whenToUse over-extended population to 'aggressive B-NHL'; R-IPI was derived/validated in rituximab-era DLBCL (Sehn et al.), not all aggressive B-NHL.
- **Change:** whenToUse: 'Newly diagnosed DLBCL / aggressive B-NHL treated in the rituximab era...' → 'Newly diagnosed DLBCL treated in the rituximab era for OS risk groups.'

### `cisne` (batch 25)
- **Issue:** whenToUse said 'solid-tumor (and selected)' — CISNE validation is solid-tumor, clinically stable FN; not for unstable patients or most hematologic malignancies
- **Issue:** nextSteps condition 'Score ≥1–2' was malformed and omitted high-risk (≥3) management (admit; not outpatient pathway)
- **Change:** whenToUse: limited to adult solid-tumor clinically stable FN; note exclusion of unstable patients / most hematologic malignancies
- **Change:** nextSteps: 'Score ≥1–2' → separate 'Score 1–2' (low threshold to admit) and 'Score ≥3' (inpatient IV antibiotics; not outpatient FN pathway)

### `wfns-sah` (batch 27)
- **Issue:** whenToUse included 'highly suspected' SAH; WFNS is a post-diagnosis clinical severity grade for confirmed aSAH (parallel to Hunt-Hess audit)
- **Change:** whenToUse: 'Confirmed or highly suspected aneurysmal SAH...' → 'Confirmed aneurysmal SAH for standardized clinical severity grading.'

### `scat5-symptom` (batch 27)
- **Issue:** whyUse implied SCAT symptom totals drive 'return-to-play decisions'; SCAT symptom severity supports multimodal assessment and recovery tracking, not standalone RTP clearance
- **Change:** whyUse: removed 'return-to-play decisions' → 'baseline comparison and serial recovery tracking within multimodal concussion assessment'

### `ace-iii-total` (batch 27)
- **Issue:** whyUse claimed total cutoffs aid 'dementia vs MCI triage'; published 82/88 cutoffs are dementia-screening thresholds (sens/spec trade-off), not validated dementia-vs-MCI discriminators
- **Change:** whyUse: 'total cutoffs aid dementia vs MCI triage (education-dependent)' → 'total cutoffs (often 82/88) aid dementia screening (education-dependent)'

### `restless-irlssg` (batch 27)
- **Issue:** nextSteps ferritin phrasing '<50–75 µg/L' was ambiguous and mixed older ~50 thresholds with current guidance; modern RLS algorithms replete around ferritin ≤75 µg/L and incorporate TSAT
- **Change:** nextSteps action: 'Serum ferritin (often treat if <50–75 µg/L per guidelines/context)' → 'Serum ferritin/iron studies (often replete if ferritin ≤75 µg/L; check TSAT)'

### `levothyroxine-dose` (batch 28)
- **Issue:** whyUse said 'ideal/actual weight' as if interchangeable for the 1.6 µg/kg estimate; ATA full-replacement teaching uses body weight (~1.6 µg/kg) in healthy adults, with IBW often preferred in obesity and lower starts in elderly/cardiac disease
- **Change:** {"field":"whyUse","from":"≈1.6 µg/kg ideal/actual weight is a common full-replacement starting estimate in healthy adults.","to":"≈1.6 µg/kg body weight is a common full-replacement starting estimate in healthy adults (often IBW in obesity)."}

### `nida-quick` (batch 28)
- **Issue:** whyUse/nextSteps implied any positive Quick Screen proceeds to full NM-ASSIST; NIDA algorithm sends illegal drug or nonmedical Rx positives to NM-ASSIST, while alcohol and tobacco alone use substance-specific / SBIRT or cessation pathways
- **Change:** {"field":"whyUse","from":"Positive screen prompts full NIDA-Modified ASSIST and brief intervention.","to":"Any positive domain needs follow-up; illegal or nonmedical Rx use prompts NIDA-Modified ASSIST; alcohol/tobacco use SBIRT or cessation pathways."}
- **Change:** {"field":"nextSteps","from":"[{ condition: 'Positive screen', actions: ['NM-ASSIST', 'SBIRT brief intervention', 'Assess readiness to change'] }]","to":"[{ condition: 'Illegal or nonmedical Rx positive', actions: ['NM-ASSIST', 'SBIRT brief intervention', 'Assess readiness to change'] }, { condition: 'Alcohol or tobacco positive only', actions: ['Substance-specific counseling / cessation', 'SBIRT as indicated', 'Assess readiness to change'] }]"}

### `acc-aha-hf-stage` (batch 29)
- **Issue:** nextSteps Stage A–B said 'Screen for structural disease when indicated'; Stage B already implies structural disease, abnormal function, or elevated NP (2022 pre-HF), so screening language misstates Stage B management.
- **Change:** nextSteps Stage A–B → 'Risk-factor control and prevention' + 'Stage B: preventive GDMT and surveillance for symptoms'.

### `glasgow-aneurysm` (batch 29)
- **Issue:** whenToUse said risk communication uses 'age and comorbidity points' only; GAS also adds large points for shock (+17), which is not a comorbidity.
- **Change:** whenToUse: 'age and comorbidity points' → 'age, shock, and comorbidity points'.

### `preop-bnp-threshold` (batch 29)
- **Issue:** nextSteps for elevated NP led with 'Optimize HF' and omitted the key CCS action for elevated preop NP (postoperative troponin surveillance if surgery proceeds); further testing is selective only if management changes.
- **Change:** nextSteps Elevated NP → HF/volume assessment and optimization; further testing only if it changes the plan; postop troponin surveillance if surgery proceeds.

### `schwartz-lqts` (batch 29)
- **Issue:** nextSteps high probability said 'Urgent EP referral if symptomatic'; high clinical probability LQTS warrants specialty evaluation, QT-drug avoidance, and cascade screening even when currently asymptomatic (SCD risk).
- **Change:** nextSteps High probability → EP/inherited-arrhythmia referral; avoid QT-prolonging drugs and discuss β-blocker; family screening.

### `lean-body-weight-james` (batch 30)
- **Issue:** whyUse framed James as generally suitable classic LBW without noting non-physiologic values / underperformance at high BMI where LBW dosing is most needed
- **Change:** {"field":"whyUse","from":"Classic sex-specific LBW formulas widely cited in clinical pharmacology.","to":"Classic sex-specific LBW formulas; can fail at high BMI (prefer Janmahasatian)."}

### `mases` (batch 30)
- **Issue:** whyUse said 'tracks peripheral entheseal tenderness'; MASES was developed for AS/axSpA and is primarily axial sites plus selected peripheral (e.g. Achilles), not a peripheral-only index
- **Change:** {"field":"whyUse","from":"Simple 0–13 site count endorsed in SpA research; tracks peripheral entheseal tenderness.","to":"Simple 0–13 site count endorsed in SpA research; mainly axial plus selected peripheral sites (e.g., Achilles)."}

### `kidney-failure-risk` (batch 31)
- **Issue:** Referral threshold stated as 5-year ≥5–10%; KDIGO/NICE-aligned practice points use 5-year ≥3–5%.
- **Issue:** RRT modality/access planning tied to 5-year ≥20% or eGFR <30; practice points use 2-year risk >40% (plus eGFR-based KRT prep criteria).
- **Change:** nextSteps: '5-year risk ≥5–10% (local policy)' → '5-year risk ≥3–5% (local policy)'
- **Change:** nextSteps: '5-year risk ≥20% or eGFR <30' → '2-year risk >40% or eGFR-based KRT prep criteria'

### `hyperkalemia-ecg` (batch 31)
- **Issue:** Next-step binder list led with Kayexalate (SPS); modern practice prefers patiromer or SZC given SPS GI toxicity concerns.
- **Change:** nextSteps action: 'Kayexalate/patiromer/SZC per setting' → 'Patiromer or SZC preferred (SPS if used locally)'

### `bicarb-ckd` (batch 31)
- **Issue:** whyUse overstated progression benefit; RCTs mixed and KDIGO 2024 downgraded prior <22 treatment recommendation.
- **Issue:** nextSteps used sole HCO₃ <22 threshold (2012-style); KDIGO 2024 practice point example is treat to avoid clinically important acidosis (e.g., HCO₃ <18).
- **Change:** whyUse: progression/bone-muscle benefit claim → frames alkali consideration; uncertain hard outcomes; prioritize more severe acidosis and avoid over-correction
- **Change:** nextSteps condition: 'HCO₃ <22 in CKD ND' → 'HCO₃ <18 (or persistently low) in CKD ND'; actions updated for individualization and over-correction monitoring

### `jaundice-nomogram` (batch 32)
- **Issue:** whenToUse said 'term and late-preterm' (late-preterm includes 34 wks outside original Bhutani/≥35-week use); whyUse implied zones guide phototherapy decisions — Bhutani zones predict subsequent significant hyperbilirubinemia and guide follow-up; phototherapy uses separate AAP thresholds
- **Change:** whenToUse: 'Term and late-preterm newborns…' → '≥35-week newborns…'
- **Change:** whyUse: clarified risk zones stratify later significant hyperbilirubinemia and guide follow-up intensity; phototherapy uses separate AAP thresholds

### `malaria-severity` (batch 32)
- **Issue:** nextSteps 'Step down to oral when able' omitted WHO minimum ≥24 h parenteral antimalarial before switching to a full oral ACT course
- **Change:** nextSteps action 'Step down to oral when able' → 'Full oral ACT after ≥24 h parenteral when able'

### `gupta-mica` (batch 33)
- **Issue:** whyUse incorrectly stated endpoint as inpatient MI/cardiac arrest; Gupta/NSQIP endpoint is intraoperative/postoperative MI or cardiac arrest through 30 days
- **Change:** whyUse: 'inpatient MI or cardiac arrest' → '30-day MI or cardiac arrest'

### `rogers-score` (batch 33)
- **Issue:** whenToUse included thoracic surgery; Rogers derivation/validation was general and vascular surgery (Patient Safety in Surgery Study)
- **Change:** whenToUse: 'major general, vascular, or thoracic surgery' → 'major general or vascular surgery'

### `ipss-prostate` (batch 33)
- **Issue:** whyUse claimed IPSS is identical to AUA Symptom Index; the seven symptom items match AUA-SI, but IPSS also includes a separate QoL item
- **Change:** whyUse: 'identical to AUA Symptom Index' → 'AUA Symptom Index plus QoL item'

### `free-psa-ratio` (batch 33)
- **Issue:** nextSteps for high % free said 'Treat BPH' without symptomatic caveat (medical therapy only indicated if LUTS bother)
- **Change:** nextSteps High % free: 'Treat BPH' → 'Treat BPH if symptomatic'

### `stone-score` (batch 33)
- **Issue:** whenToUse omitted derivation population constraints (non-febrile / uncomplicated ureterolithiasis; not for infection or toxic presentation)
- **Change:** whenToUse: 'ED patients with flank pain / suspected ureterolithiasis...' → 'Non-febrile ED patients with flank pain / suspected uncomplicated ureterolithiasis...'

### `ibuprofen-toxicity` (batch 34)
- **Issue:** whenToUse said 'ibuprofen (or similar NSAID)' but mg/kg bands are ibuprofen-specific; other NSAIDs (e.g. mefenamic acid) have different toxicity profiles/thresholds
- **Change:** whenToUse: removed 'or similar NSAID'; clarified bands are ibuprofen-specific

### `methotrexate-toxicity` (batch 34)
- **Issue:** nextSteps said only 'do not give leucovorin immediately after glucarpidase'; consensus guidance holds leucovorin ~2 h before and after glucarpidase (substrate interaction)
- **Change:** nextSteps (glucarpidase path): 'Do not give leucovorin immediately after…' → 'Hold leucovorin ~2 h before and after glucarpidase'

### `sds-zung` (batch 34)
- **Issue:** nextSteps used 'Raw ≥50' while the calculator (and classic Zung severity bands) interpret by SDS index; mild starts at index ≥50 (raw ≥40). Raw ≥50 is a later clinical-significance proposal (Dunstan) but mismatched the tool's own bands
- **Change:** nextSteps condition: 'Raw ≥50' → 'Index ≥50 (raw ≥40 classic)'

### `dka-resolution` (batch 35)
- **Issue:** whenToUse framed resolution primarily as 'anion gap closure'; 2024 ADA/ESPE/ISPAD hyperglycemic crises consensus defines DKA resolution by ketones <0.6 mmol/L plus pH ≥7.3 or HCO₃ ≥18 and discourages AG as a resolution criterion (hyperchloremia after saline)
- **Change:** {"field":"whenToUse","from":"During DKA treatment to decide when anion gap closure / resolution criteria are met for transition to SQ insulin.","to":"During DKA treatment to decide when ketoacidosis resolution criteria are met for transition to SQ insulin."}

### `biophysical-profile` (batch 36)
- **Issue:** nextSteps treated BPP 8–10 as uniformly continue-surveillance; standard interpretation is 8/10 or 10/10 reassuring only with normal amniotic fluid — 8/10 with oligohydramnios is not fully reassuring and needs further evaluation/management.
- **Change:** nextSteps condition 'BPP 8–10' → 'BPP 8–10 with normal fluid'

### `arrest-labor` (batch 36)
- **Issue:** nextSteps 'Counsel CS vs OVD' for any arrest incorrectly implies operative vaginal delivery is an option in first-stage arrest; OVD requires complete dilation and is second-stage only.
- **Change:** nextSteps 'Arrest met' action 'Counsel CS vs OVD' → 'Counsel CS (1st stage) or OVD/CS if 2nd stage prerequisites met'

### `rohrer-index` (batch 37)
- **Issue:** whyUse said 'used historically in pediatrics', which understates ongoing clinical use of ponderal/Rohrer index for neonatal body proportionality and IUGR symmetry assessment
- **Change:** whyUse: 'used historically in pediatrics and body-composition research' → 'used in pediatrics (esp. neonatal proportionality/IUGR) and body-composition research'

### `sic-score` (batch 38)
- **Issue:** whyUse stated platelet+INR subscore ≥2; original Iba 2017 SIC definition requires total ≥4 and that platelet+PT-INR points exceed 2 (i.e. ≥3).
- **Change:** whyUse: 'platelet+INR subscore ≥2' → 'platelet+INR points exceed 2 (i.e. ≥3)'

### `amc-count` (batch 38)
- **Issue:** nextSteps used monocytosis ≥1.0 only; WHO/ICC 2022 CMML monocytosis threshold is ≥0.5 ×10⁹/L (with other criteria), while ≥1.0 remains classic absolute monocytosis.
- **Change:** nextSteps condition: 'Persistent monocytosis ≥1.0' → 'Persistent monocytosis ≥1.0 (or ≥0.5 if CMML concern)'

### `fn-pathway` (batch 38)
- **Issue:** whyUse said 'even if a formal MASCC is high' without clarifying that MASCC ≥21 is the low-risk band (high score = low risk), which is easy to misread as high-risk MASCC.
- **Change:** whyUse: rewrote to 'even if MASCC falls in the low-risk band (≥21)'

### `mchat-r` (batch 39)
- **Issue:** nextSteps low-risk rescreen said '24–30 months if not done'; official M-CHAT-R algorithm is rescreen after second birthday when child is younger than 24 months.
- **Change:** nextSteps (score 0–2): 'Rescreen at 24–30 months if not done' → 'If younger than 24 months, rescreen after second birthday'.

### `benzo-dose-equiv` (batch 39)
- **Issue:** nextSteps taper pace '5–10% every 1–4 weeks' allows weekly steps faster than current joint ASAM/clinical guidance initial pace of 5–10% every 2–4 weeks.
- **Change:** nextSteps (taper planning): 'every 1–4 weeks' → 'every 2–4 weeks' (aligned with ASAM 2025 BZD tapering CPG).


## Out-of-scope notes (formula / calculate bugs discovered, not fixed)

These were found during the clinical-text audit but are outside `whenToUse` / `whyUse` / `nextSteps`:

| ID | Issue |
|----|--------|
| `egsys` | Palpitations scored as −1 in calculate; original EGSYS awards +4 for palpitations preceding syncope |
| `sic-score` | whyUse fixed to coag points **exceed 2**; calculate still uses `coagSub >= 2` |
| `glasgow-blatchford` | nextSteps fixed to GBS ≤1 discharge path; calculate interpretation may still say admit for ≥1 |
| `tisdale` / `qt-prolongation-risk` | Possible undercount when ≥2 QT-prolonging drugs (should often be +6) |

## Files changed

39 calculator source modules under `src/data/calculators/` (174 insertions, 119 deletions).

Detailed per-batch JSON: `scripts/audit-clinical/findings/batch-NN-findings.json`
