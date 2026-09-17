import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const criticalCareCalcs: Calculator[] = [
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale (GCS)',
    shortName: 'GCS',
    description: 'Standardized assessment of consciousness via eye, verbal, and motor responses.',
    category: 'critical-care',
    tags: ['neuro', 'trauma', 'coma'],
    whenToUse: 'Altered mental status, trauma, ICU sedation assessment.',
    whyUse: 'Universal language for neurologic status and triage.',
    inputs: [
      selectInput(
        'eye',
        'Eye opening',
        [
          { label: '4 — Spontaneous', value: 4, description: 'Opens eyes without stimulation' },
          { label: '3 — To sound', value: 3, description: 'Opens to voice or other sound (Teasdale 2014; formerly “to speech”)' },
          { label: '2 — To pressure', value: 2, description: 'Opens to fingertip pressure, trapezius pinch, or supraorbital notch (not sternal rub as first-line)' },
          { label: '1 — None', value: 1, description: 'No eye opening. If lids are swollen shut, record C / NT — do not assign 1 for the swelling' },
        ],
        4,
        'Teasdale 2014 sequence: spontaneous → sound → pressure. If eyes are closed by swelling or bandage, record C (or NT) beside the total; do not silently score 1.',
      ),
      selectInput(
        'verbal',
        'Verbal response',
        [
          { label: '5 — Oriented', value: 5, description: 'Oriented to person, place, and time (typically month/year, not just name)' },
          { label: '4 — Confused', value: 4, description: 'Converses in sentences but is disoriented or confused' },
          { label: '3 — Inappropriate words', value: 3, description: 'Intelligible words that are not organized into sentences (exclamation or random words)' },
          { label: '2 — Incomprehensible sounds', value: 2, description: 'Moans or groans only — no words' },
          { label: '1 — None', value: 1, description: 'No verbal response. If intubated or tracheostomy, record VT / T — do not silently assign 1 for the tube' },
        ],
        5,
        'Oriented = person, place, and month/year. If an endotracheal tube or tracheostomy prevents speech, record VT (or T) and do not assign 1 solely because of the tube.',
      ),
      selectInput(
        'motor',
        'Motor response',
        [
          { label: '6 — Obeys commands', value: 6, description: 'Performs a two-part command (e.g. “take my hand, then let go”)' },
          { label: '5 — Localizes pain', value: 5, description: 'Hand crosses midline / reaches above the clavicle toward the stimulus (trapezius or supraorbital)' },
          { label: '4 — Withdraws from pain', value: 4, description: 'Normal flexion / withdrawal at the elbow away from a fingernail-bed stimulus' },
          { label: '3 — Abnormal flexion (decorticate)', value: 3, description: 'Slow, stereotyped flexion at the elbow with shoulder adduction (decorticate)' },
          { label: '2 — Abnormal extension (decerebrate)', value: 2, description: 'Extension at the elbow (decerebrate)' },
          { label: '1 — None', value: 1, description: 'No motor response in the best arm' },
        ],
        6,
        'Score the best arm. Two-part command for 6. Use trapezius pinch or supraorbital notch to test localization (hand above clavicle). Use fingernail-bed pressure to distinguish normal flexion from abnormal flexion vs extension. Do not use sternal rub as the first-line stimulus.',
      ),
    ],
    calculate(values) {
      const e = num(values.eye, 4);
      const v = num(values.verbal, 5);
      const m = num(values.motor, 6);
      const score = e + v + m;
      const r = riskFromThresholds(score, [
        { max: 8, level: 'critical', label: 'Severe (≤8)', interpretation: 'Severe brain injury range. Consider airway protection (often intubate ≤8).' },
        { max: 12, level: 'high', label: 'Moderate (9–12)', interpretation: 'Moderate impairment. Close monitoring and urgent workup.' },
        { max: 15, level: 'low', label: 'Mild (13–15)', interpretation: 'Mild impairment or normal. Serial exams still important after trauma.' },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'E / V / M', value: `${e} / ${v} / ${m}` },
          { label: 'Range', value: '3–15' },
        ],
      };
    },
    evidence: {
      summary: 'Teasdale & Jennett GCS remains the global standard for consciousness assessment.',
      formula: 'Eye (1–4) + Verbal (1–5) + Motor (1–6)',
      validation: 'Decades of trauma and critical care use; report component scores, not only total.',
      references: [{ title: 'Assessment of coma and impaired consciousness', citation: 'Teasdale G, Jennett B. Lancet. 1974', year: 1974, pmid: '4136544',
          doi: '10.1016/s0140-6736(74)91639-0', }],
    },
    nextSteps: [
      { condition: 'GCS ≤ 8', actions: ['Airway assessment / RSI as indicated', 'Urgent CT head if trauma/unknown cause', 'Treat reversible causes (glucose, opioids, etc.)'] },
      { condition: 'Any drop ≥2 points', actions: ['Urgent reassessment', 'Repeat imaging as indicated'] },
    ],
    pearls: [
      'Always report E/V/M components, not only the total.',
      'Intubated verbal = VT (do not silently score 1). Eyes closed by swelling = C / NT (do not silently score 1).',
      'Localization requires the hand to reach above the clavicle. Use trapezius/supraorbital for that test; fingernail-bed for flexion vs extension.',
    ],
  },
  {
    id: 'qsofa',
    name: 'qSOFA Score',
    shortName: 'qSOFA',
    description: 'Bedside prompt for patients with suspected infection at risk of poor outcomes.',
    category: 'critical-care',
    tags: ['sepsis', 'infection', 'sofa'],
    whenToUse: 'Outside ICU, patients with suspected infection.',
    whyUse: 'Bedside mortality/organ-dysfunction risk prompt; not a sole sepsis screen (SSC 2021) or diagnostic criterion alone.',
    inputs: [
      yesNo('rr', 'Respiratory rate ≥ 22/min', 1, 'Respiratory rate 22/min or faster at the bedside; scores 1 point, whether or not the patient is on oxygen.'),
      yesNo('ams', 'Altered mentation (GCS <15)', 1, 'Sepsis-3 qSOFA mentation is GCS <15 (any drop from 15) or new disorientation/confusion. If baseline dementia, score only an acute change.'),
      yesNo('sbp', 'SBP ≤ 100 mmHg', 1, 'Systolic BP 100 mmHg or lower at assessment; scores 1 point. Use the lowest reading taken with the vitals set used for the score.'),
    ],
    calculate(values) {
      const score = (bool(values.rr) ? 1 : 0) + (bool(values.ams) ? 1 : 0) + (bool(values.sbp) ? 1 : 0);
      if (score >= 2) {
        return {
          score,
          label: 'Positive qSOFA (≥2)',
          interpretation: 'Higher risk of poor outcomes. Assess for sepsis, obtain lactate, cultures, and escalate care.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Negative qSOFA (<2)',
        interpretation: 'Lower risk by qSOFA, but do not exclude sepsis. Use clinical judgment and SOFA if in ICU.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'qSOFA introduced in Sepsis-3 as a bedside tool associated with increased mortality in infected patients.',
      formula: 'RR≥22 + Altered mentation + SBP≤100 (1 each)',
      validation: 'Predicts mortality better than SIRS in some non-ICU cohorts; limited sensitivity.',
      references: [{ title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)', citation: 'Singer M et al. JAMA. 2016', year: 2016, pmid: '26903338',
          doi: '10.1001/jama.2016.0287', }],
    },
    nextSteps: [
      { condition: 'qSOFA ≥2', actions: ['Measure lactate', 'Blood cultures before antibiotics if no delay', 'Broad-spectrum antibiotics for suspected sepsis', 'Fluid resuscitation and source control'] },
    ],
  },
  {
    id: 'sofa',
    name: 'SOFA Score',
    shortName: 'SOFA',
    description: 'Sequential Organ Failure Assessment across 6 organ systems.',
    category: 'critical-care',
    tags: ['sepsis', 'icu', 'organ failure'],
    whenToUse: 'ICU patients, especially suspected sepsis, to track organ dysfunction.',
    whyUse: 'Sepsis-3 defines organ dysfunction as acute change in SOFA ≥2.',
    inputs: [
      selectInput('resp', 'Respiration (PaO₂/FiO₂)', [
        { label: '≥ 400 (0)', value: 0, description: 'PaO₂/FiO₂ ≥400 mmHg' },
        { label: '< 400 (1)', value: 1, description: 'PaO₂/FiO₂ 300–399 mmHg' },
        { label: '< 300 (2)', value: 2, description: 'PaO₂/FiO₂ 200–299, or <200 without mechanical ventilation' },
        { label: '< 200 + ventilated (3)', value: 3, description: 'PaO₂/FiO₂ <200 mmHg AND mechanically ventilated' },
        { label: '< 100 + ventilated (4)', value: 4, description: 'PaO₂/FiO₂ <100 mmHg AND mechanically ventilated' },
      ], 0, 'PaO₂/FiO₂ in mmHg (PaO₂ mmHg ÷ FiO₂ as a fraction). Pick the worst matching band. Scores 3 and 4 require mechanical ventilation; P/F <200 without a ventilator stays 2.'),
      selectInput('coag', 'Coagulation (Platelets ×10³/µL)', [
        { label: '≥ 150 (0)', value: 0, description: 'Platelets ≥150 ×10³/µL (×10⁹/L)' },
        { label: '< 150 (1)', value: 1, description: 'Platelets 100–149 ×10³/µL' },
        { label: '< 100 (2)', value: 2, description: 'Platelets 50–99 ×10³/µL' },
        { label: '< 50 (3)', value: 3, description: 'Platelets 20–49 ×10³/µL' },
        { label: '< 20 (4)', value: 4, description: 'Platelets <20 ×10³/µL' },
      ], 0, 'Use the lowest platelet count in the scoring period. Nested labels: pick the worst (lowest) band that applies.'),
      selectInput('liver', 'Liver (Bilirubin mg/dL)', [
        { label: '< 1.2 (0)', value: 0, description: '<1.2 mg/dL (≈ <20 µmol/L)' },
        { label: '1.2–1.9 (1)', value: 1, description: '1.2–1.9 mg/dL (≈ 20–32 µmol/L)' },
        { label: '2.0–5.9 (2)', value: 2, description: '2.0–5.9 mg/dL (≈ 33–101 µmol/L)' },
        { label: '6.0–11.9 (3)', value: 3, description: '6.0–11.9 mg/dL (≈ 102–204 µmol/L)' },
        { label: '≥ 12.0 (4)', value: 4, description: '≥12.0 mg/dL (≈ ≥204 µmol/L)' },
      ], 0, 'Total bilirubin. 1.2 mg/dL ≈ 20 µmol/L; 2.0 ≈ 34; 6.0 ≈ 102; 12.0 ≈ 204.'),
      selectInput('cv', 'Cardiovascular', [
        { label: 'MAP ≥ 70 (0)', value: 0, description: 'MAP ≥70 mmHg without vasopressors' },
        { label: 'MAP < 70 (1)', value: 1, description: 'MAP <70 mmHg, no pressors' },
        { label: 'Dopamine ≤5 or dobutamine (2)', value: 2, description: 'Dopamine ≤5 µg/kg/min or any dobutamine (µg/kg/min)' },
        { label: 'Dopamine >5 or epi/norepi ≤0.1 (3)', value: 3, description: 'Dopamine >5 or epinephrine/norepinephrine ≤0.1 µg/kg/min' },
        { label: 'Dopamine >15 or epi/norepi >0.1 (4)', value: 4, description: 'Dopamine >15 or epinephrine/norepinephrine >0.1 µg/kg/min' },
      ], 0, 'Pressor doses are µg/kg/min. Score the highest applicable band. MAP in mmHg.'),
      selectInput('cns', 'CNS (GCS)', [
        { label: '15 (0)', value: 0, description: 'Total GCS 15 (E+V+M)' },
        { label: '13–14 (1)', value: 1, description: 'Total GCS 13 or 14' },
        { label: '10–12 (2)', value: 2, description: 'Total GCS 10–12' },
        { label: '6–9 (3)', value: 3, description: 'Total GCS 6–9' },
        { label: '< 6 (4)', value: 4, description: 'Total GCS 3–5' },
      ], 0, 'Use total GCS (E+V+M). If intubated, document VT rather than silently scoring verbal as 1, then apply the resulting total to this table.'),
      selectInput('renal', 'Renal (Creatinine or UOP)', [
        { label: 'Cr < 1.2 (0)', value: 0, description: 'Creatinine <1.2 mg/dL' },
        { label: 'Cr 1.2–1.9 (1)', value: 1, description: 'Creatinine 1.2–1.9 mg/dL' },
        { label: 'Cr 2.0–3.4 (2)', value: 2, description: 'Creatinine 2.0–3.4 mg/dL' },
        { label: 'Cr 3.5–4.9 or UOP <500 (3)', value: 3, description: 'Cr 3.5–4.9 mg/dL or urine output <500 mL/24 h (not mL/h)' },
        { label: 'Cr ≥ 5.0 or UOP <200 (4)', value: 4, description: 'Cr ≥5.0 mg/dL or urine output <200 mL/24 h' },
      ], 0, 'Creatinine in mg/dL. UOP is mL per 24 hours — do not read <500 as mL/h.'),
    ],
    calculate(values) {
      const score =
        num(values.resp) + num(values.coag) + num(values.liver) + num(values.cv) + num(values.cns) + num(values.renal);
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Minimal dysfunction', interpretation: 'SOFA 0–1. Low organ failure burden.' },
        { max: 5, level: 'moderate', label: 'Moderate', interpretation: 'Rising mortality risk as SOFA increases; serial scores useful.' },
        { max: 11, level: 'high', label: 'High', interpretation: 'Significant multi-organ dysfunction; high mortality risk.' },
        { max: 24, level: 'critical', label: 'Very high', interpretation: 'Severe multi-organ failure; mortality often >50–80% depending on trajectory.' },
      ]);
      return { score, ...r, details: [{ label: 'Max score', value: '24' }] };
    },
    evidence: {
      summary: 'SOFA quantifies organ dysfunction; ΔSOFA ≥2 used in Sepsis-3 definition with suspected infection.',
      validation: 'Validated for ICU mortality prediction across diagnoses.',
      references: [
        { title: 'The SOFA score to describe organ dysfunction/failure', citation: 'Vincent JL et al. Intensive Care Med. 1996', year: 1996, pmid: '8844239',
          doi: '10.1007/BF01709751', },
        { title: 'Sepsis-3 definitions', citation: 'Singer M et al. JAMA. 2016', year: 2016, pmid: '26903338',
          doi: '10.1001/jama.2016.0287', },
      ],
    },
    nextSteps: [
      { condition: 'Acute increase ≥2 with infection', actions: ['Treat as sepsis', 'Hour-1 bundle elements', 'ICU-level care as needed'] },
    ],
  },
  {
    id: 'sirs',
    name: 'SIRS Criteria',
    shortName: 'SIRS',
    description: 'Systemic Inflammatory Response Syndrome criteria (historical sepsis screen).',
    category: 'critical-care',
    tags: ['sepsis', 'sirs'],
    whenToUse: 'Educational/historical; still used in some pathways as infection screen.',
    whyUse: 'Sensitive but non-specific; replaced by SOFA for sepsis definition.',
    inputs: [
      yesNo('temp', 'Temp >38°C or <36°C', 1, 'Core temperature >38.0°C or <36.0°C.'),
      yesNo('hr', 'HR > 90', 1, 'Heart rate >90 bpm.'),
      yesNo('rr', 'RR > 20 or PaCO₂ < 32 mmHg', 1, 'Respiratory rate >20/min or PaCO₂ <32 mmHg.'),
      yesNo('wbc', 'WBC >12k, <4k, or >10% bands', 1, 'WBC >12×10⁹/L, <4×10⁹/L, or >10% band neutrophils.'),
    ],
    calculate(values) {
      const score = ['temp', 'hr', 'rr', 'wbc'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 2) {
        return {
          score,
          label: 'SIRS positive',
          interpretation: '≥2 criteria: SIRS present. With infection this was formerly “sepsis”; use clinical judgment and SOFA.',
          riskLevel: 'moderate',
        };
      }
      return { score, label: 'SIRS negative', interpretation: 'Fewer than 2 criteria.', riskLevel: 'low' };
    },
    evidence: {
      summary: 'SIRS defined in 1991/2001 sepsis consensus; highly sensitive, poorly specific.',
      validation: 'Superseded by Sepsis-3 for defining sepsis but still appears in research.',
      references: [{ title: 'SCCM/ESICM/ACCP/ATS/SIS sepsis definitions', citation: 'Levy MM et al. Crit Care Med. 2003', year: 2003, pmid: '12682500',
          doi: '10.1097/01.CCM.0000050454.01978.3B', }],
    },
    nextSteps: [
      { condition: 'SIRS + suspected infection', actions: ['Evaluate for sepsis with lactate, cultures', 'Prefer SOFA/qSOFA for risk stratification'] },
    ],
  },
  {
    id: 'news2',
    name: 'NEWS2 Score',
    shortName: 'NEWS2',
    description: 'National Early Warning Score 2 for detecting acute deterioration.',
    category: 'critical-care',
    tags: ['early warning', 'deterioration', 'triage'],
    whenToUse: 'Hospitalized adults for routine observation and escalation.',
    whyUse: 'Standardized track-and-trigger system (NHS).',
    inputs: [
      selectInput('rr', 'Respiratory rate (/min)', [
        { label: '≤8 (3)', value: 'rr_le_8' },
        { label: '9–11 (1)', value: 'rr_9_11' },
        { label: '12–20 (0)', value: 'rr_12_20' },
        { label: '21–24 (2)', value: 'rr_21_24' },
        { label: '≥25 (3)', value: 'rr_ge_25' },
      ], undefined, 'Breaths per minute. A single parameter scoring 3 is itself an urgent-review trigger in NEWS2.'),
      selectInput('spo2', 'SpO₂ Scale 1 (%)', [
        { label: '≥96 (0)', value: 0 },
        { label: '94–95 (1)', value: 1 },
        { label: '92–93 (2)', value: 2 },
        { label: '≤91 (3)', value: 3 },
      ], 0, 'Scale 1 target 94–98%. For confirmed hypercapnic respiratory failure with a prescribed 88–92% target, RCP Scale 2 applies — not implemented in this tool (do not use these bins for Scale 2 patients).'),
      yesNo('o2air', 'On supplemental oxygen', 2, 'Yes if any supplemental O₂ (nasal cannula, mask, HFNC, or ventilator). Room air = No. NEWS2 adds +2 for oxygen.'),
      selectInput('temp', 'Temperature °C', [
        { label: '≤35.0 (3)', value: 'temp_le_35' },
        { label: '35.1–36.0 (1)', value: 'temp_35_1_36' },
        { label: '36.1–38.0 (0)', value: 'temp_36_1_38' },
        { label: '38.1–39.0 (1)', value: 'temp_38_1_39' },
        { label: '≥39.1 (2)', value: 'temp_ge_39_1' },
      ], undefined, 'Core temperature in °C: ≤35.0 scores 3; 35.1–36.0 scores 1; 36.1–38.0 scores 0; 38.1–39.0 scores 1; ≥39.1 scores 2.'),
      selectInput('sbp', 'Systolic BP (mmHg)', [
        { label: '≤90 (3)', value: 'sbp_le_90' },
        { label: '91–100 (2)', value: 'sbp_91_100' },
        { label: '101–110 (1)', value: 'sbp_101_110' },
        { label: '111–219 (0)', value: 'sbp_111_219' },
        { label: '≥220 (3)', value: 'sbp_ge_220' },
      ], undefined, 'Systolic BP in mmHg: ≤90 scores 3; 91–100 scores 2; 101–110 scores 1; 111–219 scores 0; ≥220 scores 3.'),
      selectInput('hr', 'Heart rate (bpm)', [
        { label: '≤40 (3)', value: 'hr_le_40' },
        { label: '41–50 (1)', value: 'hr_41_50' },
        { label: '51–90 (0)', value: 'hr_51_90' },
        { label: '91–110 (1)', value: 'hr_91_110' },
        { label: '111–130 (2)', value: 'hr_111_130' },
        { label: '≥131 (3)', value: 'hr_ge_131' },
      ], undefined, 'Heart rate in beats/min: ≤40 scores 3; 41–50 scores 1; 51–90 scores 0; 91–110 scores 1; 111–130 scores 2; ≥131 scores 3.'),
      selectInput('conscious', 'Consciousness (ACVPU)', [
        { label: 'Alert (A) (0)', value: 0, description: 'Alert — eyes open, interacting' },
        { label: 'New confusion (C) or Voice (V) / Pain (P) / Unresponsive (U) (3)', value: 3, description: 'C = new disorientation/delirium (scores 3 even if still “alert” by old AVPU); V = response to speech; P = pain only; U = none' },
      ], 0, 'NEWS2 uses ACVPU. New confusion (C) scores 3 even if the patient still appears “alert” by old AVPU. V = any response to spoken voice; P = pain only (trapezius/nail-bed); U = none.'),
    ],
    calculate(values) {
      const rrPoints: Record<string, number> = {
        rr_le_8: 3,
        rr_9_11: 1,
        rr_12_20: 0,
        rr_21_24: 2,
        rr_ge_25: 3,
      };
      const tempPoints: Record<string, number> = {
        temp_le_35: 3,
        temp_35_1_36: 1,
        temp_36_1_38: 0,
        temp_38_1_39: 1,
        temp_ge_39_1: 2,
      };
      const sbpPoints: Record<string, number> = {
        sbp_le_90: 3,
        sbp_91_100: 2,
        sbp_101_110: 1,
        sbp_111_219: 0,
        sbp_ge_220: 3,
      };
      const hrPoints: Record<string, number> = {
        hr_le_40: 3,
        hr_41_50: 1,
        hr_51_90: 0,
        hr_91_110: 1,
        hr_111_130: 2,
        hr_ge_131: 3,
      };
      const rr = rrPoints[String(values.rr)] ?? num(values.rr);
      const temp = tempPoints[String(values.temp)] ?? num(values.temp);
      const sbp = sbpPoints[String(values.sbp)] ?? num(values.sbp);
      const hr = hrPoints[String(values.hr)] ?? num(values.hr);
      const spo2 = num(values.spo2);
      const conscious = num(values.conscious);
      const score =
        rr +
        spo2 +
        (bool(values.o2air) ? 2 : 0) +
        temp +
        sbp +
        hr +
        conscious;
      let r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Low (0–4)', interpretation: 'Continue routine monitoring (unless single parameter = 3).' },
        { max: 6, level: 'moderate', label: 'Low–medium (5–6)', interpretation: 'Urgent ward-based response; increase monitoring frequency.' },
        { max: 20, level: 'high', label: 'High (≥7)', interpretation: 'Emergency response / critical care review.' },
      ]);
      const singleThree = [rr, spo2, temp, sbp, hr, conscious].some(v => v === 3);
      if (singleThree && score <= 4) {
        r = { ...r, riskLevel: 'moderate', label: 'Low–medium (single parameter = 3)', interpretation: 'NEWS2: any single parameter scoring 3 is an urgent-review trigger even when the total is 0–4.' };
      }
      return { score, ...r };
    },
    evidence: {
      summary: 'NEWS2 is the UK standard early warning score including SpO₂ scales for hypercapnic respiratory failure.',
      validation: 'NHS England endorsed; predicts ICU transfer and mortality.',
      references: [{ title: 'National Early Warning Score (NEWS) 2', citation: 'Royal College of Physicians. NEWS2: Standardising the assessment of acute-illness severity in the NHS. 2017', year: 2017, url: 'https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/' }],
    },
    nextSteps: [
      { condition: 'Score ≥7', actions: ['Emergency critical care assessment', 'Continuous monitoring / higher-level care'] },
      { condition: 'Score 5–6', actions: ['Urgent ward-based review', 'Increase observation frequency'] },
      { condition: 'Single param = 3', actions: ['Urgent ward doctor review', 'Adjust monitoring / consider escalation'] },
    ],
  },
  {
    id: 'mews',
    name: 'MEWS (Modified Early Warning Score)',
    shortName: 'MEWS',
    description: 'Simple early warning score using vital signs and AVPU.',
    category: 'critical-care',
    tags: ['early warning', 'mews'],
    whenToUse: 'Ward patients to detect clinical deterioration.',
    whyUse: 'Predecessor/alternative to NEWS used in many hospitals.',
    inputs: [
      selectInput('sbp', 'SBP (mmHg)', [
        { label: '≤70 (3)', value: 'sbp_le_70' },
        { label: '71–80 (2)', value: 'sbp_71_80' },
        { label: '81–100 (1)', value: 'sbp_81_100' },
        { label: '101–199 (0)', value: 'sbp_101_199' },
        { label: '≥200 (2)', value: 'sbp_ge_200' },
      ], undefined, 'Systolic BP in mmHg (Subbe MEWS).'),
      selectInput('hr', 'Heart rate (bpm)', [
        { label: '≤40 (2)', value: 'hr_le_40' },
        { label: '41–50 (1)', value: 'hr_41_50' },
        { label: '51–100 (0)', value: 'hr_51_100' },
        { label: '101–110 (1)', value: 'hr_101_110' },
        { label: '111–129 (2)', value: 'hr_111_129' },
        { label: '≥130 (3)', value: 'hr_ge_130' },
      ], undefined, 'Heart rate in beats/min.'),
      selectInput('rr', 'Respiratory rate (/min)', [
        { label: '<9 (2)', value: 'rr_lt_9' },
        { label: '9–14 (0)', value: 'rr_9_14' },
        { label: '15–20 (1)', value: 'rr_15_20' },
        { label: '21–29 (2)', value: 'rr_21_29' },
        { label: '≥30 (3)', value: 'rr_ge_30' },
      ], undefined, 'Breaths per minute.'),
      selectInput('temp', 'Temperature (°C)', [
        { label: '<35 (2)', value: 'temp_lt_35' },
        { label: '35–38.4 (0)', value: 'temp_35_38_4' },
        { label: '≥38.5 (2)', value: 'temp_ge_38_5' },
      ], undefined, 'Core temperature in °C, not °F.'),
      selectInput('avpu', 'AVPU', [
        { label: 'Alert (0)', value: 0, description: 'Eyes open, interacting' },
        { label: 'Voice (1)', value: 1, description: 'Any response to spoken/shouted voice' },
        { label: 'Pain (2)', value: 2, description: 'Response only to pain (trapezius or nail-bed)' },
        { label: 'Unresponsive (3)', value: 3, description: 'No response to voice or pain' },
      ], 0, 'A = alert; V = voice; P = pain only; U = unresponsive.'),
    ],
    calculate(values) {
      const sbpPoints: Record<string, number> = {
        sbp_le_70: 3,
        sbp_71_80: 2,
        sbp_81_100: 1,
        sbp_101_199: 0,
        sbp_ge_200: 2,
      };
      const hrPoints: Record<string, number> = {
        hr_le_40: 2,
        hr_41_50: 1,
        hr_51_100: 0,
        hr_101_110: 1,
        hr_111_129: 2,
        hr_ge_130: 3,
      };
      const rrPoints: Record<string, number> = {
        rr_lt_9: 2,
        rr_9_14: 0,
        rr_15_20: 1,
        rr_21_29: 2,
        rr_ge_30: 3,
      };
      const tempPoints: Record<string, number> = {
        temp_lt_35: 2,
        temp_35_38_4: 0,
        temp_ge_38_5: 2,
      };
      const sbp = sbpPoints[String(values.sbp)] ?? num(values.sbp);
      const hr = hrPoints[String(values.hr)] ?? num(values.hr);
      const rr = rrPoints[String(values.rr)] ?? num(values.rr);
      const temp = tempPoints[String(values.temp)] ?? num(values.temp);
      const score = sbp + hr + rr + temp + num(values.avpu);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low', interpretation: 'Continue routine monitoring.' },
        { max: 4, level: 'moderate', label: 'Intermediate', interpretation: 'Increase frequency of observations; notify nurse in charge.' },
        { max: 20, level: 'high', label: 'High (≥5)', interpretation: 'Urgent medical review; consider higher level of care.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MEWS aggregates physiologic parameters to trigger rapid response.',
      validation: 'Multiple institutional validations for predicting ICU transfer/cardiac arrest.',
      references: [{ title: 'Validation of a modified Early Warning Score', citation: 'Subbe CP et al. QJM. 2001', year: 2001, pmid: '11588210',
          doi: '10.1093/qjmed/94.10.521', }],
    },
    nextSteps: [{ condition: 'MEWS ≥5', actions: ['Rapid response / medical emergency team', 'ABC assessment'] }],
  },
  {
    id: 'curb65',
    name: 'CURB-65 Score',
    shortName: 'CURB-65',
    description: 'Severity assessment for community-acquired pneumonia.',
    category: 'pulmonary',
    tags: ['pneumonia', 'cap', 'curb'],
    whenToUse: 'Adults with community-acquired pneumonia for site-of-care decisions.',
    whyUse: 'Simple 5-variable score endorsed by BTS guidelines.',
    inputs: [
      yesNo('confusion', 'Confusion (new): AMTS ≤8 or new disorientation to person/place/time', 1, 'Lim/BTS: new disorientation in person, place, or time, or Abbreviated Mental Test Score ≤8. Do not reprint a copyrighted AMTS card here — use the official BTS/AMTS instrument if scoring AMTS.'),
      yesNo('urea', 'Urea > 7 mmol/L (BUN > 19 mg/dL)', 1, 'Blood urea above 7 mmol/L (BUN above 19 mg/dL) on admission; scores 1 point. BUN in mg/dL = urea mmol/L × 2.8.'),
      yesNo('rr', 'Respiratory rate ≥ 30/min', 1, 'Respiratory rate 30/min or faster; scores 1 point.'),
      yesNo('bp', 'SBP < 90 or DBP ≤ 60', 1, 'Systolic BP below 90 mmHg or diastolic BP 60 mmHg or lower; scores 1 point (one point for either).'),
      yesNo('age', 'Age ≥ 65', 1, 'Age 65 years or older; scores 1 point, with no partial credit for younger ages.'),
    ],
    calculate(values) {
      const score = ['confusion', 'urea', 'rr', 'bp', 'age'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const mort = ['0.6%', '2.7%', '6.8%', '14%', '27.8%', '27.8%'];
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Low severity (0–1)', interpretation: `Mortality ~${mort[score]}. Often suitable for outpatient treatment if social circumstances allow.` },
        { max: 2, level: 'moderate', label: 'Moderate (2)', interpretation: `Mortality ~${mort[score]}. Consider short-stay / inpatient care.` },
        { max: 5, level: 'high', label: 'High (3–5)', interpretation: `Mortality ~${mort[score]}. Hospitalize; consider ICU if ≥3 with organ failure.` },
      ]);
      return { score, ...r, details: [{ label: 'Approx. 30-day mortality', value: mort[score] }] };
    },
    evidence: {
      summary: 'CURB-65 from BTS CAP studies predicts mortality and guides disposition.',
      formula: 'Confusion + Urea + RR + BP + Age≥65 (1 each)',
      validation: 'Validated internationally; PSI is more granular alternative.',
      references: [{ title: 'Defining community acquired pneumonia severity on presentation to hospital', citation: 'Lim WS et al. Thorax. 2003', year: 2003, pmid: '12728155',
          doi: '10.1136/thorax.58.5.377', }],
    },
    nextSteps: [
      { condition: '0–1', actions: ['Oral antibiotics outpatient', 'Safety-net advice'] },
      { condition: '≥3', actions: ['Inpatient IV antibiotics', 'Assess for ICU (ventilatory failure, shock)'] },
    ],
  },
  {
    id: 'psi-port',
    name: 'PSI / PORT Score (Pneumonia)',
    shortName: 'PSI/PORT',
    description: 'Two-step Pneumonia Severity Index for CAP mortality and site-of-care (Fine 1997).',
    category: 'pulmonary',
    tags: ['pneumonia', 'psi', 'port'],
    whenToUse: 'Adult CAP risk stratification when more detail than CURB-65 is desired.',
    whyUse: 'Highly validated two-step rule: Class I is assigned before points; Classes II–V use the point total.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, helpText: 'Age in completed years. PORT points equal age for men and age minus 10 for women — the sex field carries that −10.' }),
      selectInput('sex', 'Sex', [
        { label: 'Female (−10)', value: -10 },
        { label: 'Male (0)', value: 0 },
      ], undefined, 'Female subtracts 10 points from the PORT total; male subtracts 0. Score it once per calculation.'),
      yesNo('nh', 'Nursing home resident', 10, 'Residing in a nursing home or long-term care facility at presentation (Fine 1997).'),
      yesNo('neoplasm', 'Neoplastic disease', 30, 'Any cancer except basal/squamous skin cancer; active or diagnosed within 1 year (Fine 1997).'),
      yesNo('liver', 'Liver disease', 20, 'Cirrhosis or other chronic liver disease (Fine 1997).'),
      yesNo('chf', 'CHF', 10, 'History of congestive heart failure (systolic or diastolic), not an isolated exam finding today.'),
      yesNo('cerebro', 'Cerebrovascular disease', 10, 'Stroke, TIA, or known cerebrovascular disease.'),
      yesNo('renal', 'Renal disease', 10, 'Chronic renal disease or documented insufficiency — not the BUN ≥30 item alone.'),
      yesNo('ams', 'Altered mental status', 20, 'Disorientation to person, place, or time, stupor, or coma (Fine 1997).'),
      yesNo('rr30', 'RR ≥ 30', 20, 'Respiratory rate ≥30 breaths/min.'),
      yesNo('sbp90', 'SBP < 90', 20, 'Systolic BP <90 mmHg.'),
      yesNo('temp35', 'Temp <35 or ≥40°C', 15, 'Core temperature <35.0°C or ≥40.0°C.'),
      yesNo('hr125', 'Pulse ≥ 125', 10, 'Heart rate ≥125 bpm.'),
      yesNo('ph735', 'Arterial pH < 7.35', 30, 'Arterial pH below 7.35 on the ABG used for scoring; adds 30 points, the largest single PORT item. Venous pH is not a substitute.'),
      yesNo('bun30', 'BUN ≥ 30 mg/dL', 20, 'BUN 30 mg/dL or higher (urea ≥10.7 mmol/L); adds 20 points.'),
      yesNo('na130', 'Sodium < 130 mEq/L', 20, 'Serum sodium below 130 mEq/L (mmol/L); adds 20 points.'),
      yesNo('glu250', 'Glucose ≥ 250 mg/dL', 10, 'Glucose 250 mg/dL or higher (≈13.9 mmol/L); adds 10 points, diabetes or not.'),
      yesNo('hct30', 'Hematocrit < 30%', 10, 'Hematocrit below 30%; adds 10 points.'),
      yesNo('pao260', 'PaO₂ < 60 or SpO₂ < 90%', 10, 'PaO₂ below 60 mmHg on room air or SpO₂ below 90%; adds 10 points. Do not score both — they share the one item.'),
      yesNo('pleural', 'Pleural effusion', 10, 'Pleural effusion on chest radiograph (any size; Fine 1997).'),
    ],
    calculate(values) {
      const age = num(values.age);
      const classI =
        age <= 50 &&
        !bool(values.neoplasm) &&
        !bool(values.liver) &&
        !bool(values.chf) &&
        !bool(values.cerebro) &&
        !bool(values.renal) &&
        !bool(values.ams) &&
        !bool(values.hr125) &&
        !bool(values.rr30) &&
        !bool(values.sbp90) &&
        !bool(values.temp35);

      let score = age + num(values.sex);
      const pts: [string, number][] = [
        ['nh', 10], ['neoplasm', 30], ['liver', 20], ['chf', 10], ['cerebro', 10], ['renal', 10],
        ['ams', 20], ['rr30', 20], ['sbp90', 20], ['temp35', 15], ['hr125', 10],
        ['ph735', 30], ['bun30', 20], ['na130', 20], ['glu250', 10], ['hct30', 10], ['pao260', 10], ['pleural', 10],
      ];
      pts.forEach(([k, p]) => {
        if (bool(values[k])) score += p;
      });

      if (classI) {
        return {
          score,
          label: 'PSI Class I',
          interpretation:
            'Step 1 Class I (age ≤50, no neoplastic/liver/CHF/cerebrovascular/renal disease, normal mental status, pulse <125, RR <30, SBP ≥90, temperature ≥35°C and <40°C). Approx. mortality 0.1%. Often an outpatient candidate if clinically appropriate. Class I is assigned before the point score.',
          riskLevel: 'low',
          details: [
            { label: 'Algorithm stage', value: 'Step 1 — Class I (points not used for class assignment)' },
            { label: 'Point total (reference only)', value: String(score) },
            { label: 'Approx. mortality', value: '0.1%' },
          ],
        };
      }

      let cls = 'II';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let mort = '0.6%';
      if (score <= 70) {
        cls = 'II';
        mort = '0.6%';
        riskLevel = 'low';
      } else if (score <= 90) {
        cls = 'III';
        mort = '0.9–2.8%';
        riskLevel = 'moderate';
      } else if (score <= 130) {
        cls = 'IV';
        mort = '8.2–9.3%';
        riskLevel = 'high';
      } else {
        cls = 'V';
        mort = '27–29%';
        riskLevel = 'critical';
      }
      return {
        score,
        label: `PSI Class ${cls}`,
        interpretation: `Step 2 point class ${cls} (did not meet Step 1 Class I). Approx. mortality ${mort}. Class II often outpatient; III observation; IV–V inpatient/ICU consideration.`,
        riskLevel,
        details: [
          { label: 'Algorithm stage', value: 'Step 2 — point scoring (Classes II–V)' },
          { label: 'Approx. mortality', value: mort },
        ],
      };
    },
    evidence: {
      summary: 'PORT/PSI is a two-step rule: Class I is assigned before points using age, five comorbidities, mental status, and vital signs; remaining patients are scored into Classes II–V.',
      formula:
        'Step 1 Class I if age ≤50 AND no neoplastic, liver, CHF, cerebrovascular, or renal disease AND normal mental status AND pulse <125 AND RR <30 AND SBP ≥90 AND temperature ≥35°C and <40°C. Otherwise points: Class II ≤70, III 71–90, IV 91–130, V >130.',
      validation: 'One of the most validated pneumonia severity tools (Fine 1997; IDSA CAP two-step algorithm).',
      references: [{ title: 'A prediction rule to identify low-risk patients with community-acquired pneumonia', citation: 'Fine MJ et al. N Engl J Med. 1997', year: 1997, pmid: '8995086',
          doi: '10.1056/NEJM199701233360402', }],
    },
    nextSteps: [
      { condition: 'Class I', actions: ['Often outpatient oral antibiotics if reliable follow-up'] },
      { condition: 'Class II', actions: ['Often outpatient candidate if clinically appropriate'] },
      { condition: 'Class III', actions: ['Consider observation or short inpatient stay'] },
      { condition: 'Class IV–V', actions: ['Admit', 'Consider ICU for respiratory failure/shock'] },
    ],
  },
  {
    id: 'apache2-simp',
    name: 'APACHE II (Simplified Educational)',
    shortName: 'APACHE II≈',
    description: 'Simplified educational estimate of ICU severity of illness.',
    category: 'critical-care',
    tags: ['icu', 'apache', 'severity'],
    whenToUse: 'Educational approximation of ICU mortality risk.',
    whyUse: 'Classic ICU severity score; full APACHE II needs 12 physiologic variables.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, exampleValue: 60, helpText: 'Age in completed years; APACHE II age points are 0 for 44 or younger, 2 for 45–54, 3 for 55–64, 5 for 65–74, and 6 for 75 or older. (The physiology bands use the worst value in the first 24 ICU hours.)' }),
      // APACHE II neurologic points = 15 − GCS (not SOFA-style buckets)
      numberInput('gcs', 'GCS', { min: 3, max: 15, exampleValue: 15, helpText: 'Points = 15 − GCS. Enter total GCS 3–15; if intubated document VT rather than guessing verbal.' }),
      selectInput('map', 'MAP category (mmHg)', [
        { label: '70–109 (0)', value: 0 },
        { label: '50–69 or 110–129 (2)', value: 2 },
        { label: '130–159 (3)', value: 3 },
        { label: '≤49 or ≥160 (4)', value: 4 },
      ], 0, 'Mean arterial pressure in mmHg. Worst value in the first 24 h of ICU.'),
      selectInput('hr', 'HR category (bpm)', [
        { label: '70–109 (0)', value: 0 },
        { label: '55–69 or 110–139 (2)', value: 2 },
        { label: '40–54 or 140–179 (3)', value: 3 },
        { label: '≤39 or ≥180 (4)', value: 4 },
      ], 0, 'Heart rate in beats/min. Worst value in the first 24 h.'),
      selectInput('rr', 'RR category (/min)', [
        { label: '12–24 (0)', value: 0 },
        { label: '10–11 or 25–34 (1)', value: 1 },
        { label: '6–9 (2)', value: 2 },
        { label: '35–49 (3)', value: 3 },
        { label: '≤5 or ≥50 (4)', value: 4 },
      ], 0, 'Respiratory rate in breaths/min (or ventilator rate). Worst in first 24 h. (6–9 = 2 pts; 35–49 = 3 pts).'),
      selectInput('na', 'Sodium (mEq/L)', [
        { label: '130–149 (0)', value: 0 },
        { label: '150–154 (1)', value: 1 },
        { label: '120–129 or 155–159 (2)', value: 2 },
        { label: '111–119 or 160–179 (3)', value: 3 },
        { label: '≤110 or ≥180 (4)', value: 4 },
      ], 0, 'Serum sodium in mEq/L (mmol/L). Worst in first 24 h.'),
      selectInput('k', 'Potassium (mEq/L)', [
        { label: '3.5–5.4 (0)', value: 0 },
        { label: '3.0–3.4 or 5.5–5.9 (1)', value: 1 },
        { label: '2.5–2.9 (2)', value: 2 },
        { label: '<2.5 or ≥7 (4)', value: 4 },
        { label: '6.0–6.9 (3)', value: 3 },
      ], 0, 'Serum potassium in mEq/L. Worst in first 24 h. Pick the matching band (6.0–6.9 is 3 points; ≥7 is 4).'),
      selectInput('cr', 'Creatinine (acute)', [
        { label: '0.6–1.4 (0)', value: 'cr_0_6_1_4' },
        { label: '1.5–1.9 (2)', value: 'cr_1_5_1_9' },
        { label: '2.0–3.4 (3)', value: 'cr_2_0_3_4' },
        { label: '≥3.5 (4)', value: 'cr_ge_3_5' },
        { label: '<0.6 (2)', value: 'cr_lt_0_6' },
      ], 'cr_0_6_1_4', 'Worst creatinine in the first 24 h (mg/dL). Official APACHE II doubles these points when acute renal failure is present; this educational tool does not double.'),
      selectInput('hct', 'Hematocrit (%)', [
        { label: '30–45.9 (0)', value: 0 },
        { label: '46–49.9 (1)', value: 1 },
        { label: '20–29.9 or 50–59.9 (2)', value: 2 },
        { label: '<20 or ≥60 (4)', value: 4 },
      ], 0, 'Hematocrit in percent. Worst in first 24 h. (50–59.9% = 2 pts; <20% or ≥60% = 4 pts).'),
      selectInput('wbc', 'WBC (×10³/µL)', [
        { label: '3–14.9 (0)', value: 0 },
        { label: '15–19.9 (1)', value: 1 },
        { label: '1–2.9 or 20–39.9 (2)', value: 2 },
        { label: '<1 or ≥40 (4)', value: 4 },
      ], 0, 'WBC ×10³/µL (×10⁹/L). Worst in first 24 h.'),
      yesNo('chronic', 'Severe chronic organ insufficiency or immunocompromise', 0, 'Must predate this admission (Knaus). Liver: cirrhosis + portal HTN, prior variceal bleed, or encephalopathy. CV: NYHA IV. Respiratory: cannot climb stairs or chronic hypoxia/hypercapnia/secondary polycythemia/mPAP >40/ventilator-dependent. Renal: chronic dialysis. Immune: chemo/radiation/immunosuppression/high-dose steroids, or leukemia/lymphoma/AIDS. Ordinary CHF/COPD do not all count.'),
      selectInput('admitType', 'Admission type (chronic-health points only if chronic disease present)', [
        { label: 'No chronic disease / none applicable (0)', value: 0 },
        { label: 'Elective postoperative (+2 if chronic)', value: 2 },
        { label: 'Non-operative or emergency postoperative (+5 if chronic)', value: 5 },
      ], 0, 'These points are added only if the chronic-disease item is Yes. Elective postop = +2; non-operative or emergency postop = +5. If chronic disease is No, this field contributes 0.'),
    ],
    calculate(values) {
      let agePts = 0;
      const age = num(values.age, 60);
      if (age >= 75) agePts = 6;
      else if (age >= 65) agePts = 5;
      else if (age >= 55) agePts = 3;
      else if (age >= 45) agePts = 2;
      const gcs = Math.min(15, Math.max(3, num(values.gcs, 15)));
      const gcsPts = 15 - gcs;
      const crPoints: Record<string, number> = {
        cr_0_6_1_4: 0,
        cr_1_5_1_9: 2,
        cr_2_0_3_4: 3,
        cr_ge_3_5: 4,
        cr_lt_0_6: 2,
      };
      // Chronic health: 0 if no chronic disease; else +2 elective postop or +5 non-op/emergency (not both)
      const chronicPts = bool(values.chronic) ? num(values.admitType, 5) : 0;
      const score =
        agePts +
        gcsPts +
        num(values.map) +
        num(values.hr) +
        num(values.rr) +
        num(values.na) +
        num(values.k) +
        (crPoints[String(values.cr)] ?? num(values.cr)) +
        num(values.hct) +
        num(values.wbc) +
        chronicPts;
      // Rough mortality bands
      const r = riskFromThresholds(score, [
        { max: 9, level: 'low', label: 'Lower severity', interpretation: 'Approximate lower ICU mortality band. Educational estimate only.' },
        { max: 19, level: 'moderate', label: 'Moderate severity', interpretation: 'Intermediate predicted mortality.' },
        { max: 29, level: 'high', label: 'High severity', interpretation: 'High predicted mortality; full APACHE recommended for research/benchmarking.' },
        { max: 71, level: 'critical', label: 'Very high severity', interpretation: 'Very high predicted mortality.' },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'GCS points', value: `${gcsPts} (15 − ${gcs})` },
          { label: 'Chronic health points', value: String(chronicPts) },
          { label: 'Note', value: 'Simplified — not full APACHE II (missing A-a gradient, pH, FiO₂, etc.)' },
        ],
      };
    },
    evidence: {
      summary: 'APACHE II (Knaus 1985): age + acute physiology (incl. GCS points = 15−GCS) + chronic health (0, or +2 elective / +5 non-op or emergency postop if severe chronic disease). This tool omits some APS variables.',
      validation: 'Extensively used for ICU case-mix adjustment; APACHE III/IV superseded for benchmarking.',
      references: [{ title: 'APACHE II: a severity of disease classification system', citation: 'Knaus WA et al. Crit Care Med. 1985', year: 1985, pmid: '3928249' }],
    },
    nextSteps: [{ condition: 'High score', actions: ['Ensure goals of care discussions', 'Aggressive organ support as appropriate'] }],
  },
  {
    id: 'rts',
    name: 'Revised Trauma Score (RTS)',
    shortName: 'RTS',
    description: 'Physiologic trauma severity using GCS, SBP, and RR.',
    category: 'emergency',
    tags: ['trauma', 'triage'],
    whenToUse: 'Trauma severity/prognosis (weighted RTS in TRISS); field triage often uses unweighted T-RTS.',
    whyUse: 'Component of TRISS; correlates with survival.',
    inputs: [
      selectInput('gcs', 'GCS coded', [
        { label: '13–15 (4)', value: 4 },
        { label: '9–12 (3)', value: 3 },
        { label: '6–8 (2)', value: 2 },
        { label: '4–5 (1)', value: 1 },
        { label: '3 (0)', value: 0 },
      ], 4, 'Enter the coded GCS band (not the raw 3–15 total). Weighted RTS = 0.9368·GCSc + 0.7326·SBPc + 0.2908·RRc.'),
      selectInput('sbp', 'SBP coded (mmHg)', [
        { label: '>89 (4)', value: 4 },
        { label: '76–89 (3)', value: 3 },
        { label: '50–75 (2)', value: 2 },
        { label: '1–49 (1)', value: 1 },
        { label: '0 (0)', value: 0 },
      ], 4, 'Systolic BP in mmHg, then pick the coded band (not the raw SBP).'),
      selectInput('rr', 'RR coded (/min)', [
        { label: '10–29 (4)', value: 4 },
        { label: '>29 (3)', value: 3 },
        { label: '6–9 (2)', value: 2 },
        { label: '1–5 (1)', value: 1 },
        { label: '0 (0)', value: 0 },
      ], 4, 'Respiratory rate in breaths/min, then pick the coded band.'),
    ],
    calculate(values) {
      const g = num(values.gcs);
      const s = num(values.sbp);
      const r = num(values.rr);
      const rts = round(0.9368 * g + 0.7326 * s + 0.2908 * r, 2);
      const riskLevel = rts < 4 ? 'critical' : rts < 6 ? 'high' : rts < 7 ? 'moderate' : 'low';
      return {
        score: rts,
        label: `RTS ${rts}`,
        interpretation: 'Higher RTS indicates better physiology. RTS <4 often associated with high mortality.',
        riskLevel: riskLevel as 'low' | 'moderate' | 'high' | 'critical',
        details: [{ label: 'Coded GCS/SBP/RR', value: `${g}/${s}/${r}` }],
      };
    },
    evidence: {
      summary: 'RTS weights coded GCS, SBP, and RR for trauma survival prediction.',
      formula: 'RTS = 0.9368·GCSc + 0.7326·SBPc + 0.2908·RRc',
      validation: 'Used with ISS in TRISS methodology.',
      references: [{ title: 'A revision of the Trauma Score', citation: 'Champion HR et al. J Trauma. 1989', year: 1989, pmid: '2657085',
          doi: '10.1097/00005373-198905000-00017', }],
    },
    nextSteps: [{ condition: 'Low RTS', actions: ['Trauma team activation', 'ABCs and hemorrhage control', 'Damage control resuscitation'] }],
  },
  {
    id: 'aa-gradient',
    name: 'A–a Oxygen Gradient',
    shortName: 'A–a Gradient',
    description: 'Alveolar–arterial oxygen gradient to evaluate hypoxemia.',
    category: 'pulmonary',
    tags: ['abg', 'hypoxemia', 'respiratory'],
    whenToUse: 'ABG interpretation for hypoxemia differential.',
    whyUse: 'Distinguishes V/Q mismatch, shunt, diffusion vs hypoventilation/low FiO₂.',
    inputs: [
      numberInput('fio2', 'FiO₂', { unit: 'fraction', unitKind: 'fio2', min: 0.21, max: 1, step: 0.01, exampleValue: 0.21, helpText: 'FiO₂ as a fraction (0.21–1.00), or as a percentage if you switch the selector — the engine converts the value for you, so enter the figure the blood gas report shows.' }),
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 100, exampleValue: 40, helpText: 'Arterial PaCO₂ in mmHg from the same ABG as the PaO₂; it drives the alveolar gas equation term PaCO₂ ÷ 0.8.' }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, exampleValue: 90, helpText: 'Arterial PaO₂ in mmHg from the same ABG as the PaCO₂; the gradient is PAO₂ − PaO₂.' }),
      numberInput('age', 'Age (for expected)', { unit: 'years', min: 0, max: 110, exampleValue: 40, helpText: 'Expected A–a ≈ age/4 + 4 mmHg. This tool flags elevated if measured A–a exceeds expected by more than 5 mmHg.' }),
      numberInput('patm', 'Atmospheric pressure', { unit: 'mmHg', min: 500, max: 800, exampleValue: 760, helpText: 'Barometric pressure in mmHg: 760 at sea level. At altitude, subtract roughly 1 mmHg per 10 m of elevation.' }),
    ],
    calculate(values) {
      const fio2 = num(values.fio2, 0.21);
      const paco2 = num(values.paco2, 40);
      const pao2 = num(values.pao2, 90);
      const age = num(values.age, 40);
      const patm = num(values.patm, 760);
      const ph2o = 47;
      const pao2Alv = fio2 * (patm - ph2o) - paco2 / 0.8;
      const aa = round(pao2Alv - pao2, 1);
      const expected = round(age / 4 + 4, 1);
      const elevated = aa > expected + 5;
      return {
        score: aa,
        unit: 'mmHg',
        label: elevated ? 'Elevated A–a gradient' : 'Normal A–a gradient',
        interpretation: elevated
          ? 'Elevated gradient suggests V/Q mismatch, shunt, or diffusion limitation (PE, pneumonia, edema, fibrosis, etc.).'
          : 'Normal gradient; hypoxemia if present more consistent with hypoventilation or low inspired O₂.',
        riskLevel: elevated ? 'moderate' : 'normal',
        details: [
          { label: 'PAO₂ (alveolar)', value: `${round(pao2Alv, 1)} mmHg` },
          { label: 'Expected A–a (approx.)', value: `${expected} mmHg` },
        ],
      };
    },
    evidence: {
      summary: 'PAO₂ = FiO₂(Patm−47) − PaCO₂/R; A–a = PAO₂ − PaO₂. Expected rises with age.',
      formula: 'A–a = [FiO₂(P atm−47) − PaCO₂/0.8] − PaO₂',
      validation: 'Standard respiratory physiology teaching.',
      references: [{ title: 'Ideal alveolar air and the analysis of ventilation-perfusion relationships in the lungs', citation: 'Riley RL, Cournand A. J Appl Physiol. 1949;1:825-847', year: 1949, pmid: '18145478' }],
    },
    nextSteps: [
      { condition: 'Elevated A–a + hypoxemia', actions: ['CXR/CT as indicated', 'Consider PE, pneumonia, edema, ILD', 'Supplemental O₂ / ventilatory support'] },
    ],
  },
  {
    id: 'pf-ratio',
    name: 'PaO₂/FiO₂ Ratio (P/F)',
    shortName: 'P/F Ratio',
    description: 'Oxygenation index used in ARDS severity classification.',
    category: 'critical-care',
    tags: ['ards', 'oxygenation', 'icu'],
    whenToUse: 'Hypoxemic respiratory failure / ARDS assessment.',
    whyUse: 'Berlin definition severity tiers based on P/F with PEEP ≥5.',
    inputs: [
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, exampleValue: 80, helpText: 'Arterial PaO₂ in mmHg from the ABG drawn at the same FiO₂ and PEEP; Berlin severity tiers assume PEEP ≥5 cmH₂O.' }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', unitKind: 'fio2', min: 0.21, max: 1, step: 0.01, exampleValue: 0.5, helpText: 'Berlin ARDS P/F tiers assume PEEP ≥5 cmH₂O plus radiographic/timing criteria.' }),
    ],
    calculate(values) {
      const pao2 = num(values.pao2, 80);
      const fio2 = num(values.fio2, 0.5);
      if (fio2 <= 0) {
        return {
          score: '—',
          unit: 'mmHg',
          label: 'Invalid FiO₂',
          interpretation: 'FiO₂ must be greater than 0 (enter a fraction such as 0.50) to calculate the P/F ratio.',
          riskLevel: 'info',
        };
      }
      const pf = round(pao2 / fio2, 0);
      const r = riskFromThresholds(pf, [
        { max: 100, level: 'critical', label: 'Severe ARDS range (≤100)', interpretation: 'If ARDS criteria met: severe. Consider prone positioning, NM blockade, ECMO evaluation.' },
        { max: 200, level: 'high', label: 'Moderate ARDS range (≤200)', interpretation: 'Moderate ARDS range if other criteria met.' },
        { max: 300, level: 'moderate', label: 'Mild ARDS range (≤300)', interpretation: 'Mild ARDS range if acute onset, bilateral opacities, not pure cardiogenic.' },
        { max: 600, level: 'low', label: 'Above ARDS threshold', interpretation: 'P/F >300; does not meet Berlin hypoxemia threshold for ARDS.' },
      ]);
      return { score: pf, unit: 'mmHg', ...r };
    },
    evidence: {
      summary: 'Berlin ARDS definition uses P/F ≤300 with PEEP≥5 cmH₂O plus radiographic and timing criteria.',
      validation: 'Standard ICU oxygenation metric.',
      references: [{ title: 'Acute Respiratory Distress Syndrome: The Berlin Definition', citation: 'ARDS Definition Task Force. JAMA. 2012', year: 2012, pmid: '22797452',
          doi: '10.1001/jama.2012.5669', }],
    },
    nextSteps: [
      { condition: 'P/F ≤300 with ARDS', actions: ['Lung-protective ventilation (6 mL/kg PBW)', 'Adequate PEEP', 'Treat underlying cause'] },
    ],
  },
];
