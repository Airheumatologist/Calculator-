import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave3NephroIcuCalcs: Calculator[] = [
  // 1. CKD-EPI 2021 creatinine (race-free)
  {
    id: 'ckd-epi-2021',
    name: 'CKD-EPI 2021 Creatinine eGFR (Race-Free)',
    shortName: 'CKD-EPI 2021',
    description: 'Full 2021 race-free CKD-EPI creatinine equation for estimated GFR.',
    category: 'nephrology',
    tags: ['gfr', 'ckd', 'egfr', 'ckd-epi', 'creatinine'],
    whenToUse: 'Adult CKD detection, staging, and monitoring using serum creatinine.',
    whyUse: 'NKF-ASN preferred race-free creatinine equation (Inker 2021).',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const scr = num(values.scr, 1);
      const age = num(values.age, 50);
      const female = str(values.sex, 'F') === 'F';
      const kappa = female ? 0.7 : 0.9;
      const alpha = female ? -0.241 : -0.302;
      const ratio = scr / kappa;
      let egfr = 142 * Math.min(ratio, 1) ** alpha * Math.max(ratio, 1) ** -1.2 * 0.9938 ** age;
      if (female) egfr *= 1.012;
      egfr = round(egfr, 0);
      let stage = 'G1';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      if (egfr >= 90) {
        stage = 'G1';
        riskLevel = 'normal';
      } else if (egfr >= 60) {
        stage = 'G2';
        riskLevel = 'low';
      } else if (egfr >= 45) {
        stage = 'G3a';
        riskLevel = 'moderate';
      } else if (egfr >= 30) {
        stage = 'G3b';
        riskLevel = 'moderate';
      } else if (egfr >= 15) {
        stage = 'G4';
        riskLevel = 'high';
      } else {
        stage = 'G5';
        riskLevel = 'critical';
      }
      return {
        score: egfr,
        unit: 'mL/min/1.73 m²',
        label: `eGFR ${egfr} · stage ${stage}`,
        interpretation: `CKD-EPI 2021 eGFR ${egfr} mL/min/1.73 m² (G${stage.slice(1)}). Confirm chronicity and add albuminuria (A category) for full CGA staging.`,
        riskLevel,
        details: [
          { label: 'Equation', value: '2021 creatinine, race-free' },
          { label: 'KDIGO G stage', value: stage },
        ],
      };
    },
    evidence: {
      summary: '2021 CKD-EPI creatinine equation estimates GFR without a race coefficient.',
      formula: '142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^Age × (1.012 if female); κ=0.7/0.9, α=−0.241/−0.302 (F/M)',
      validation: 'Developed and validated in diverse cohorts; endorsed by NKF-ASN task force.',
      references: [
        {
          title: 'New Creatinine- and Cystatin C–Based Equations to Estimate GFR without Race',
          citation: 'Inker LA et al. N Engl J Med. 2021',
          year: 2021,
          pmid: '34554658',
          doi: '10.1056/NEJMoa2102953',
        },
      ],
    },
    nextSteps: [
      { condition: 'eGFR <60', actions: ['Confirm chronicity (≥3 months)', 'Urine ACR', 'Medication review', 'BP / glucose optimization'] },
      { condition: 'eGFR <30', actions: ['Nephrology referral', 'RRT education if progressive', 'Avoid nephrotoxins'] },
    ],
    pearls: [
      'Not validated for acute GFR changes; use with clinical context in AKI.',
      'Cystatin C or combined equations may improve accuracy at extremes of muscle mass.',
    ],
  },

  // 2. CKD-EPI cystatin C
  {
    id: 'ckd-epi-cys',
    name: 'CKD-EPI Cystatin C eGFR',
    shortName: 'CKD-EPI CysC',
    description: 'Cystatin C–based eGFR (CKD-EPI 2012/2021 cystatin-only, race-free).',
    category: 'nephrology',
    tags: ['gfr', 'cystatin', 'ckd', 'egfr'],
    whenToUse: 'When creatinine is unreliable (low muscle mass, amputation, extremes of diet) or to confirm eGFR.',
    whyUse: 'Cystatin C less dependent on muscle mass; useful confirmatory or alternative equation.',
    inputs: [
      numberInput('scys', 'Serum cystatin C', { unit: 'mg/L', min: 0.2, max: 10, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const scys = num(values.scys, 1);
      const age = num(values.age, 50);
      const female = str(values.sex, 'F') === 'F';
      // CKD-EPI 2012/2021 cystatin C only (no race term)
      const ratio = scys / 0.8;
      let egfr =
        133 *
        Math.min(ratio, 1) ** -0.499 *
        Math.max(ratio, 1) ** -1.328 *
        0.996 ** age;
      if (female) egfr *= 0.932;
      egfr = round(egfr, 0);
      const r = riskFromThresholds(egfr, [
        { max: 14, level: 'critical', label: 'G5 range', interpretation: `CysC eGFR ${egfr}: kidney failure range if chronic.` },
        { max: 29, level: 'high', label: 'G4 range', interpretation: `CysC eGFR ${egfr}: severely decreased GFR range.` },
        { max: 59, level: 'moderate', label: 'G3 range', interpretation: `CysC eGFR ${egfr}: moderately decreased GFR range.` },
        { max: 89, level: 'low', label: 'G2 range', interpretation: `CysC eGFR ${egfr}: mildly decreased GFR range.` },
        { max: 200, level: 'normal', label: 'G1 range', interpretation: `CysC eGFR ${egfr}: normal or high GFR range.` },
      ]);
      return {
        score: egfr,
        unit: 'mL/min/1.73 m²',
        ...r,
        details: [{ label: 'Equation', value: 'CKD-EPI cystatin C only (race-free)' }],
      };
    },
    evidence: {
      summary: 'Cystatin C eGFR equation without race; useful when creatinine is biased by body composition.',
      formula: '133 × min(Scys/0.8,1)^−0.499 × max(Scys/0.8,1)^−1.328 × 0.996^Age × (0.932 if female)',
      validation: 'CKD-EPI 2012 cystatin equation; 2021 race-free creatinine-cystatin models available for combined use.',
      references: [
        {
          title: 'Estimating GFR from serum creatinine and cystatin C',
          citation: 'Inker LA et al. N Engl J Med. 2012',
          year: 2012,
          pmid: '22762315',
          doi: '10.1056/NEJMoa1114248',
        },
        {
          title: 'New Creatinine- and Cystatin C–Based Equations without Race',
          citation: 'Inker LA et al. N Engl J Med. 2021',
          year: 2021,
          pmid: '34554658',
          doi: '10.1056/NEJMoa2102953',
        },
      ],
    },
    nextSteps: [
      { condition: 'Discordant Cr vs CysC eGFR', actions: ['Review muscle mass, diet, steroids, thyroid disease', 'Consider measured GFR if decisions hinge on value'] },
    ],
    pearls: ['Inflammation, steroids, and thyroid disease can alter cystatin C independent of GFR.'],
  },

  // 3. eGFR → KDIGO G stage
  {
    id: 'egfr-stage',
    name: 'KDIGO eGFR G Stage',
    shortName: 'eGFR Stage',
    description: 'Maps measured or estimated GFR to KDIGO G1–G5 categories.',
    category: 'nephrology',
    tags: ['ckd', 'kdigo', 'staging', 'egfr'],
    whenToUse: 'Convert any eGFR/GFR value into KDIGO G category for documentation and risk framing.',
    whyUse: 'Standard CKD GFR categories used with albuminuria for prognosis.',
    inputs: [
      numberInput('egfr', 'eGFR or measured GFR', {
        unit: 'mL/min/1.73 m²',
        min: 1,
        max: 200,
        defaultValue: 55,
      }),
    ],
    calculate(values) {
      const egfr = num(values.egfr, 55);
      let stage = 'G1';
      let label = 'G1 — Normal or high';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = '';
      if (egfr >= 90) {
        stage = 'G1';
        label = 'G1 — Normal or high';
        riskLevel = 'normal';
        interpretation = 'GFR ≥90. CKD requires markers of kidney damage (e.g., albuminuria) if G1–G2.';
      } else if (egfr >= 60) {
        stage = 'G2';
        label = 'G2 — Mildly decreased';
        riskLevel = 'low';
        interpretation = 'GFR 60–89. Mild decrease; CKD if damage markers present.';
      } else if (egfr >= 45) {
        stage = 'G3a';
        label = 'G3a — Mild–moderate decrease';
        riskLevel = 'moderate';
        interpretation = 'GFR 45–59. Moderate CKD range — evaluate cause, ACR, complications.';
      } else if (egfr >= 30) {
        stage = 'G3b';
        label = 'G3b — Moderate–severe decrease';
        riskLevel = 'moderate';
        interpretation = 'GFR 30–44. Higher complication risk; tighten CV/CKD risk management.';
      } else if (egfr >= 15) {
        stage = 'G4';
        label = 'G4 — Severely decreased';
        riskLevel = 'high';
        interpretation = 'GFR 15–29. Prepare for kidney replacement therapy education; nephrology co-management.';
      } else {
        stage = 'G5';
        label = 'G5 — Kidney failure';
        riskLevel = 'critical';
        interpretation = 'GFR <15. Kidney failure range — urgent nephrology; plan RRT/conservative care.';
      }
      return {
        score: stage,
        label,
        interpretation: `eGFR ${egfr}: ${interpretation}`,
        riskLevel,
        details: [
          { label: 'eGFR entered', value: `${egfr} mL/min/1.73 m²` },
          { label: 'KDIGO G', value: stage },
        ],
      };
    },
    evidence: {
      summary: 'KDIGO GFR categories G1–G5 define CKD severity by GFR strata.',
      formula: 'G1≥90; G2 60–89; G3a 45–59; G3b 30–44; G4 15–29; G5 <15',
      validation: 'KDIGO CKD guideline standard.',
      references: [
        {
          title: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
          citation: 'KDIGO CKD Work Group. Kidney Int. 2024;105(4S):S117-S314',
          year: 2024,
          pmid: '38490803',
          doi: '10.1016/j.kint.2023.10.018',
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
        },
      ],
    },
    nextSteps: [
      { condition: 'G3–G5', actions: ['Urine ACR (A category)', 'Medication dose review', 'BP and metabolic bone/anemia screening as indicated'] },
    ],
  },

  // 4. KDIGO heat map
  {
    id: 'kdigo-ckd-heat',
    name: 'KDIGO CKD Heat Map (G × A Risk)',
    shortName: 'KDIGO Heat Map',
    description: 'Prognosis risk category from KDIGO G (GFR) stage and A (albuminuria) category.',
    category: 'nephrology',
    tags: ['ckd', 'kdigo', 'albuminuria', 'risk'],
    whenToUse: 'CKD risk stratification for monitoring frequency and referral urgency.',
    whyUse: 'Combined G and A categories predict progression and CV outcomes better than GFR alone.',
    inputs: [
      selectInput(
        'g',
        'GFR category (G)',
        [
          { label: 'G1 (≥90)', value: 'G1', description: 'eGFR ≥90 mL/min/1.73 m² — normal or high' },
          { label: 'G2 (60–89)', value: 'G2', description: 'eGFR 60–89 — mildly decreased' },
          { label: 'G3a (45–59)', value: 'G3a', description: 'eGFR 45–59 — mildly to moderately decreased' },
          { label: 'G3b (30–44)', value: 'G3b', description: 'eGFR 30–44 — moderately to severely decreased' },
          { label: 'G4 (15–29)', value: 'G4', description: 'eGFR 15–29 — severely decreased' },
          { label: 'G5 (<15)', value: 'G5', description: 'eGFR <15 — kidney failure' },
        ],
        undefined,
        'eGFR in mL/min/1.73 m² (CKD-EPI or equivalent). Confirm chronicity (≥3 months) before labeling CKD.',
      ),
      selectInput(
        'a',
        'Albuminuria category (A)',
        [
          { label: 'A1 — ACR <30 mg/g (normal–mildly increased)', value: 'A1', description: 'ACR <30 mg/g (≈ <3 mg/mmol)' },
          { label: 'A2 — ACR 30–300 mg/g (moderately increased)', value: 'A2', description: 'ACR 30–300 mg/g (≈ 3–30 mg/mmol)' },
          { label: 'A3 — ACR >300 mg/g (severely increased)', value: 'A3', description: 'ACR >300 mg/g (≈ >30 mg/mmol)' },
        ],
        undefined,
        'Urine albumin-to-creatinine ratio (ACR). 30 mg/g ≈ 3 mg/mmol; 300 mg/g ≈ 30 mg/mmol. Prefer first-morning or confirmed repeat if borderline.',
      ),
    ],
    calculate(values) {
      const g = str(values.g, 'G3a');
      const a = str(values.a, 'A1');
      // Risk matrix: 1=low(green), 2=moderately increased(yellow), 3=high(orange), 4=very high(red)
      const matrix: Record<string, Record<string, number>> = {
        G1: { A1: 1, A2: 2, A3: 3 },
        G2: { A1: 1, A2: 2, A3: 3 },
        G3a: { A1: 2, A2: 3, A3: 4 },
        G3b: { A1: 3, A2: 4, A3: 4 },
        G4: { A1: 4, A2: 4, A3: 4 },
        G5: { A1: 4, A2: 4, A3: 4 },
      };
      const risk = matrix[g]?.[a] ?? 2;
      const labels: Record<number, { label: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; interpretation: string }> = {
        1: {
          label: 'Low risk',
          riskLevel: 'low',
          interpretation: 'Green zone: low CKD progression risk. Screen periodically; optimize CV risk factors.',
        },
        2: {
          label: 'Moderately increased risk',
          riskLevel: 'moderate',
          interpretation: 'Yellow zone: moderately increased risk. Closer lab follow-up; treat albuminuria/BP.',
        },
        3: {
          label: 'High risk',
          riskLevel: 'high',
          interpretation: 'Orange zone: high risk of progression and events. Nephrology input often appropriate.',
        },
        4: {
          label: 'Very high risk',
          riskLevel: 'critical',
          interpretation: 'Red zone: very high risk. Multidisciplinary CKD care; prepare for complications/RRT as needed.',
        },
      };
      const info = labels[risk];
      return {
        score: `${g}-${a}`,
        label: info.label,
        interpretation: `${g} + ${a}: ${info.interpretation}`,
        riskLevel: info.riskLevel,
        details: [
          { label: 'G category', value: g },
          { label: 'A category', value: a },
          { label: 'Heat-map risk', value: info.label },
        ],
        recommendations: [
          'Confirm ACR on morning sample if borderline',
          'ACE-I/ARB when albuminuria and appropriate',
          'SGLT2i / other guideline-directed therapies as indicated',
        ],
      };
    },
    evidence: {
      summary: 'KDIGO “heat map” combines GFR (G1–G5) and albuminuria (A1–A3) into low → very high risk bands.',
      formula: 'Look-up: G1–2/A1 low; risk rises with lower G and higher A; G4–5 any A and G3b/A2–3 very high',
      validation: 'Derived from large CKD prognosis consortia; embedded in KDIGO guidelines.',
      references: [
        {
          title: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
          citation: 'KDIGO CKD Work Group. Kidney Int. 2024;105(4S):S117-S314',
          year: 2024,
          pmid: '38490803',
          doi: '10.1016/j.kint.2023.10.018',
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
        },
      ],
    },
    nextSteps: [
      { condition: 'High / very high', actions: ['Nephrology co-management', 'Aggressive risk-factor control', 'Sick-day medication plan'] },
    ],
  },

  // 5. RIFLE AKI
  {
    id: 'rifle-aki',
    name: 'RIFLE AKI Criteria',
    shortName: 'RIFLE',
    description: 'RIFLE classification of acute kidney injury (Risk, Injury, Failure, Loss, ESKD).',
    category: 'nephrology',
    tags: ['aki', 'rifle', 'creatinine', 'urine output'],
    whenToUse: 'Staging AKI by creatinine/GFR change and/or urine output criteria.',
    whyUse: 'Foundational consensus AKI criteria preceding AKIN and KDIGO.',
    inputs: [
      selectInput(
        'crCriterion',
        'Creatinine / GFR criterion (worst)',
        [
          { label: 'None / below Risk', value: 0, description: 'Creatinine/GFR change below Risk thresholds' },
          { label: 'Risk — Cr ×1.5 or GFR ↓ >25%', value: 1, description: 'Cr increased to 1.5× baseline, or GFR decreased >25% (within 7 days)' },
          { label: 'Injury — Cr ×2 or GFR ↓ >50%', value: 2, description: 'Cr 2× baseline, or GFR decreased >50%' },
          { label: 'Failure — Cr ×3 or ≥4 mg/dL with acute rise ≥0.5 or GFR ↓ >75%', value: 3, description: 'Cr 3× baseline, or Cr ≥4.0 mg/dL with acute rise ≥0.5 mg/dL, or GFR decreased >75%' },
          { label: 'Loss — complete loss of function >4 weeks', value: 4, description: 'Complete loss of kidney function persisting >4 weeks' },
          { label: 'ESKD — >3 months', value: 5, description: 'End-stage kidney disease — complete loss >3 months' },
        ],
        undefined,
        'RIFLE allows up to 7 days for the Cr/GFR change (unlike AKIN 48 h). Failure Cr ≥4.0 mg/dL requires an acute rise ≥0.5 mg/dL. Use the worse of Cr vs UO.',
      ),
      selectInput(
        'uoCriterion',
        'Urine output criterion (worst)',
        [
          { label: 'None / adequate UO', value: 0, description: 'Urine output above Risk thresholds' },
          { label: 'Risk — UO <0.5 mL/kg/h × 6 h', value: 1, description: '<0.5 mL/kg/h for 6 consecutive hours' },
          { label: 'Injury — UO <0.5 mL/kg/h × 12 h', value: 2, description: '<0.5 mL/kg/h for 12 consecutive hours' },
          { label: 'Failure — UO <0.3 mL/kg/h × 24 h or anuria × 12 h', value: 3, description: '<0.3 mL/kg/h for 24 h, or anuria for 12 h' },
        ],
        undefined,
        'Consecutive hours, preferably Foley; mL/kg/h using current weight.',
      ),
    ],
    calculate(values) {
      const cr = num(values.crCriterion, 0);
      const uo = num(values.uoCriterion, 0);
      const stage = Math.max(cr, uo);
      const names = ['No AKI by RIFLE', 'Risk (R)', 'Injury (I)', 'Failure (F)', 'Loss (L)', 'ESKD (E)'];
      const levels: Array<'normal' | 'low' | 'moderate' | 'high' | 'critical'> = [
        'normal',
        'low',
        'moderate',
        'high',
        'critical',
        'critical',
      ];
      const interps = [
        'Does not meet RIFLE creatinine or UO thresholds.',
        'RIFLE Risk: early AKI — optimize volume/perfusion; stop nephrotoxins.',
        'RIFLE Injury: established AKI — close monitoring, treat cause.',
        'RIFLE Failure: severe AKI — consider RRT indications, ICU support.',
        'RIFLE Loss: persistent kidney failure >4 weeks.',
        'RIFLE ESKD: dialysis-dependent >3 months.',
      ];
      return {
        score: names[stage],
        label: names[stage],
        interpretation: interps[stage],
        riskLevel: levels[stage],
        details: [
          { label: 'Cr/GFR class', value: names[cr] },
          { label: 'UO class', value: names[Math.min(uo, 3)] },
          { label: 'Final (worst of Cr/UO)', value: names[stage] },
        ],
      };
    },
    evidence: {
      summary: 'RIFLE (ADQI 2004) stages AKI by fold-change in Cr/GFR and oliguria duration.',
      formula: 'R: Cr×1.5 or UO<0.5×6h; I: Cr×2 or UO<0.5×12h; F: Cr×3/≥4+0.5 or UO<0.3×24h/anuria 12h; L>4wk; E>3mo',
      validation: 'Widely validated; largely superseded operationally by KDIGO but still used in literature.',
      references: [
        {
          title: 'Acute renal failure – definition, outcome measures, animal models, fluid therapy and information technology needs: ADQI',
          citation: 'Bellomo R et al. Crit Care. 2004',
          year: 2004,
          pmid: '15312219',
          doi: '10.1186/cc2872',
        },
      ],
    },
    nextSteps: [
      { condition: 'R / I / F', actions: ['Hemodynamic optimization', 'Review nephrotoxins', 'Serial Cr and UO', 'Renal ultrasound if obstruction possible'] },
    ],
  },

  // 6. AKIN
  {
    id: 'akin-aki',
    name: 'AKIN AKI Staging',
    shortName: 'AKIN',
    description: 'Acute Kidney Injury Network stages 1–3 using creatinine and urine output.',
    category: 'nephrology',
    tags: ['aki', 'akin', 'creatinine'],
    whenToUse: 'Staging AKI with AKIN criteria (Cr rise within 48 h and/or urine output).',
    whyUse: 'Refined RIFLE; bridge to current KDIGO staging.',
    inputs: [
      selectInput(
        'crStage',
        'Creatinine criterion',
        [
          { label: 'None', value: 0, description: 'No AKIN creatinine change within 48 h' },
          { label: 'Stage 1 — ↑≥0.3 mg/dL or ×1.5–1.9 from baseline', value: 1, description: 'Absolute ↑ ≥0.3 mg/dL or 1.5–1.9× baseline within 48 h (lowest recent Cr)' },
          { label: 'Stage 2 — Cr ×2.0–2.9', value: 2, description: 'Creatinine 2.0–2.9× baseline within 48 h' },
          { label: 'Stage 3 — Cr ×≥3 or ≥4.0 mg/dL with acute ↑≥0.5 or RRT', value: 3, description: '×≥3 baseline, or Cr ≥4.0 mg/dL with acute rise ≥0.5 mg/dL, or RRT' },
        ],
        undefined,
        'AKIN requires the creatinine increase within 48 h (optimize volume; exclude obstruction). Stage 1 = absolute ↑ ≥0.3 mg/dL or ×1.5–1.9 vs baseline (lowest recent Cr). Stage 3 = ×≥3, or Cr ≥4.0 mg/dL with acute rise ≥0.5 mg/dL, or RRT.',
      ),
      selectInput(
        'uoStage',
        'Urine output criterion',
        [
          { label: 'None / adequate', value: 0, description: 'Urine output above Stage 1 thresholds' },
          { label: 'Stage 1 — UO <0.5 mL/kg/h × 6 h', value: 1, description: '<0.5 mL/kg/h for 6 consecutive hours' },
          { label: 'Stage 2 — UO <0.5 mL/kg/h × 12 h', value: 2, description: '<0.5 mL/kg/h for 12 consecutive hours' },
          { label: 'Stage 3 — UO <0.3 mL/kg/h × 24 h or anuria × 12 h', value: 3, description: '<0.3 mL/kg/h for 24 h, or anuria for 12 h' },
        ],
        undefined,
        'Consecutive hours, preferably Foley; mL/kg/h using current weight.',
      ),
      yesNo('rrt', 'Receiving RRT for AKI', 3, 'Any RRT initiated for this AKI episode forces AKIN stage 3.'),
    ],
    calculate(values) {
      let stage = Math.max(num(values.crStage, 0), num(values.uoStage, 0));
      if (bool(values.rrt)) stage = 3;
      if (stage === 0) {
        return {
          score: 0,
          label: 'No AKIN AKI',
          interpretation: 'Does not meet AKIN creatinine or urine output criteria.',
          riskLevel: 'normal',
        };
      }
      const r = riskFromThresholds(stage, [
        {
          max: 1,
          level: 'low',
          label: 'AKIN stage 1',
          interpretation: 'Stage 1 AKI: early injury — reverse reversible causes; monitor closely.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'AKIN stage 2',
          interpretation: 'Stage 2 AKI: significant injury — higher risk of progression and need for RRT.',
        },
        {
          max: 3,
          level: 'high',
          label: 'AKIN stage 3',
          interpretation: 'Stage 3 AKI (or on RRT): severe — evaluate RRT indications and ICU-level support.',
        },
      ]);
      return {
        score: stage,
        ...r,
        details: [
          { label: 'Cr-based stage', value: String(num(values.crStage, 0)) },
          { label: 'UO-based stage', value: String(num(values.uoStage, 0)) },
          { label: 'RRT', value: bool(values.rrt) ? 'Yes → stage 3' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'AKIN (2007) stages AKI 1–3 within 48 h; includes absolute Cr rise ≥0.3 mg/dL for stage 1.',
      formula: 'Stage 1: Cr +0.3 or ×1.5–2; Stage 2: ×2–3; Stage 3: ×≥3 or ≥4+0.5 or RRT; plus UO criteria',
      validation: 'Validated predictor of mortality; largely aligned with later KDIGO stages.',
      references: [
        {
          title: 'Acute Kidney Injury Network: report of an initiative to improve outcomes in AKI',
          citation: 'Mehta RL et al. Crit Care. 2007',
          year: 2007,
          pmid: '17331245',
          doi: '10.1186/cc5713',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage ≥2', actions: ['Nephrology consult', 'Strict I/O and daily weights', 'Avoid further nephrotoxins'] },
    ],
  },

  // 7. Renal angina index (simplified)
  {
    id: 'renal-angina',
    name: 'Renal Angina Index (Simplified)',
    shortName: 'RAI',
    description: 'Simplified renal angina index: risk tier × injury tier to flag early AKI risk.',
    category: 'nephrology',
    tags: ['aki', 'renal angina', 'rai', 'icu'],
    whenToUse: 'Early risk stratification for AKI in at-risk hospitalized/ICU patients (educational adult adaptation).',
    whyUse: 'Concept of “renal angina” combines predisposition risk with early signs of injury (Cr change, fluid overload).',
    inputs: [
      selectInput(
        'risk',
        'Risk tier (predisposition)',
        [
          {
            label: '1 — Moderate (e.g., ICU admission / general risk)',
            value: 1,
            description: 'ICU admission without transplant or vent+vasoactives (Basu risk = 1)',
          },
          {
            label: '3 — High (e.g., solid-organ transplant / diabetes + sepsis context)',
            value: 3,
            description:
              'Solid-organ or stem-cell transplant, or adult analog of multiple comorbidities (e.g. diabetes + sepsis)',
          },
          {
            label: '5 — Very high (ventilation + vasoactives / septic shock)',
            value: 5,
            description: 'Mechanical ventilation AND inotrope/vasopressor, or septic shock (Basu risk = 5)',
          },
        ],
        undefined,
        'Original pediatric RAI (Basu): 1=ICU admission; 3=solid-organ or stem-cell transplant; 5=mechanical ventilation AND inotrope/vasopressor. This adult educational map: 5 if vent+vasoactives/septic shock; 3 if transplant or multiple comorbidities (e.g. DM+sepsis); 1=ICU/general risk. Score at ~8–12 h of ICU admission.',
      ),
      selectInput(
        'injury',
        'Injury tier (early change)',
        [
          {
            label: '1 — No Cr change; FO <5%',
            value: 1,
            description: 'Creatinine unchanged from baseline AND fluid overload <5%',
          },
          {
            label: '2 — Cr increase <50% or FO 5–10%',
            value: 2,
            description: 'Creatinine up but <1.5× baseline, OR FO 5–10% (use the worse of Cr vs FO)',
          },
          {
            label: '4 — Cr ×1.5–1.99 or FO 10–15%',
            value: 4,
            description: 'Creatinine 1.5–1.99× baseline, OR FO 10–15%',
          },
          {
            label: '8 — Cr ×≥2 or FO ≥15%',
            value: 8,
            description: 'Creatinine ≥2× baseline, OR FO ≥15%',
          },
        ],
        undefined,
        'Use the worse of Cr change vs FO. FO% = [(fluid in L − fluid out L) / ICU admission weight kg] × 100. Cr bins vs baseline already on labels.',
      ),
    ],
    calculate(values) {
      const risk = num(values.risk, 1);
      const injury = num(values.injury, 1);
      const rai = risk * injury;
      const positive = rai >= 8;
      return {
        score: rai,
        label: positive ? 'Renal angina positive (RAI ≥8)' : 'Renal angina negative (RAI <8)',
        interpretation: positive
          ? `RAI ${rai} (≥8): fulfills simplified renal angina — heightened risk of severe/persistent AKI; consider early nephroprotective care and biomarkers if available.`
          : `RAI ${rai} (<8): below typical positive threshold; continue standard monitoring — score does not exclude evolving AKI.`,
        riskLevel: rai >= 40 ? 'critical' : rai >= 8 ? 'high' : rai >= 4 ? 'moderate' : 'low',
        details: [
          { label: 'Risk tier', value: String(risk) },
          { label: 'Injury tier', value: String(injury) },
          { label: 'RAI = risk × injury', value: String(rai) },
          { label: 'Positive threshold', value: '≥8' },
        ],
      };
    },
    evidence: {
      summary: 'Renal angina index (originally pediatric ICU) multiplies risk strata by early creatinine/fluid-overload injury strata; RAI ≥8 predicts severe AKI.',
      formula: 'RAI = Risk (1/3/5) × Injury (1/2/4/8); positive if ≥8',
      validation: 'Best validated in critically ill children; adult use is conceptual/educational — integrate clinical judgment.',
      references: [
        {
          title: 'Renal angina: an emerging paradigm to identify children at risk for AKI',
          citation: 'Basu RK et al. Pediatr Nephrol. 2012 / related validation studies',
          year: 2012,
          pmid: '22012033',
          doi: '10.1007/s00467-011-2024-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'RAI ≥8', actions: ['Optimize hemodynamics', 'Minimize nephrotoxins', 'Serial Cr and FO tracking', 'Consider nephrology early'] },
    ],
    pearls: ['Original RAI is pediatric; this is a simplified educational adaptation for adults.'],
  },

  // 8. Furosemide stress test
  {
    id: 'furosemide-stress',
    name: 'Furosemide Stress Test (FST)',
    shortName: 'FST',
    description: 'Interprets 2-hour urine output after a standardized furosemide challenge in early AKI.',
    category: 'nephrology',
    tags: ['aki', 'furosemide', 'fst', 'urine output'],
    whenToUse: 'Oliguric early AKI to assess tubular responsiveness and risk of progression (after euvolemia ensured).',
    whyUse: 'UO response after 1–1.5 mg/kg IV furosemide predicts progression and need for RRT better than many static markers.',
    inputs: [
      numberInput('dose', 'Furosemide IV dose given', {
        unit: 'mg',
        min: 10,
        max: 400,
        defaultValue: 80,
        helpText: 'Under-dosing invalidates a non-responder call. Naïve ~1.0 mg/kg IV bolus; exposed ~1.5 mg/kg; single bolus not infusion.',
      }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 200, defaultValue: 70 }),
      numberInput('uop2h', 'Urine output in 2 hours after dose', {
        unit: 'mL',
        min: 0,
        max: 3000,
        defaultValue: 250,
        helpText:
          'Empty bladder/Foley at time 0; collect all urine for 2 h from the bolus; responder ≥200 mL; do not run if hypovolemic; replace UOP mL-for-mL ~6 h if not intentionally diuresing.',
      }),
      selectInput(
        'priorLoop',
        'Prior loop diuretic exposure',
        [
          { label: 'Naïve (use ~1 mg/kg)', value: 'naive', description: 'No loop within previous 7 days → 1.0 mg/kg IV bolus' },
          { label: 'Exposed (use ~1.5 mg/kg)', value: 'exposed', description: 'Loop within previous 7 days (Chawla) → 1.5 mg/kg IV bolus' },
        ],
        undefined,
        'Exposed = loop within previous 7 days (Chawla) → 1.5 mg/kg IV; naïve → 1.0 mg/kg; single bolus not infusion.',
      ),
    ],
    calculate(values) {
      const dose = num(values.dose, 80);
      const wt = num(values.weight, 70);
      const uop = num(values.uop2h, 250);
      const exposed = str(values.priorLoop, 'naive') === 'exposed';
      const targetDose = round((exposed ? 1.5 : 1.0) * wt, 0);
      const responsive = uop >= 200;
      const doseOk = dose >= targetDose * 0.8;
      return {
        score: uop,
        unit: 'mL / 2 h',
        label: responsive ? 'FST responder (UOP ≥200 mL/2 h)' : 'FST non-responder (UOP <200 mL/2 h)',
        interpretation: responsive
          ? `2-h UOP ${uop} mL ≥200: tubular response present — lower likelihood of progressive AKI / early RRT in original studies. Still treat cause and reassess volume.`
          : `2-h UOP ${uop} mL <200: non-response — higher risk of AKI progression and RRT; avoid repeated high-dose diuretics if still volume overloaded without response — consider RRT trajectory.`,
        riskLevel: responsive ? 'low' : 'high',
        details: [
          { label: 'Suggested test dose', value: `~${targetDose} mg IV (${exposed ? '1.5' : '1'} mg/kg)` },
          { label: 'Dose administered', value: `${dose} mg${doseOk ? '' : ' (below typical test dose)'}` },
          { label: 'Response threshold', value: '≥200 mL in 2 hours' },
        ],
        recommendations: [
          'Ensure euvolemia before testing — FST is not a treatment for hypovolemia',
          'Replace urine losses if volume depleted after response',
        ],
      };
    },
    evidence: {
      summary: 'Chawla et al.: 1.0–1.5 mg/kg IV furosemide; UOP <200 mL over 2 h predicts progression to AKIN III.',
      formula: 'Responder if UOP ≥200 mL in 2 h after standardized IV furosemide',
      validation: 'Prospective ICU cohorts; performance declines if already on high-dose loops or not standardized.',
      references: [
        {
          title: 'Development and standardization of a furosemide stress test to predict the severity of AKI',
          citation: 'Chawla LS et al. Crit Care. 2013',
          year: 2013,
          pmid: '24053972',
          doi: '10.1186/cc13015',
        },
      ],
    },
    nextSteps: [
      { condition: 'Non-responder', actions: ['Reassess for RRT indications', 'Avoid repeated futile loop dosing', 'Nephrology involvement'] },
      { condition: 'Responder', actions: ['Continue supportive AKI care', 'Match UOP with intake if needed'] },
    ],
  },

  // 9. FENa on diuretics + FEUrea
  {
    id: 'fena-diuretic',
    name: 'FENa on Diuretics + FeUrea',
    shortName: 'FENa/FeUrea',
    description: 'Calculates FENa and FeUrea with interpretation when loop diuretics confound FENa.',
    category: 'nephrology',
    tags: ['aki', 'fena', 'feurea', 'diuretics'],
    whenToUse: 'Oliguric AKI differential when patient has received diuretics.',
    whyUse: 'FENa rises after loops even if prerenal; FeUrea is preferred in that setting.',
    inputs: [
      numberInput('pna', 'Plasma Na', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 40 }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 2.0 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
      numberInput('purea', 'Plasma urea (BUN)', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 40 }),
      numberInput('uurea', 'Urine urea nitrogen', { unit: 'mg/dL', min: 1, max: 2000, defaultValue: 200 }),
      yesNo(
        'onDiuretic',
        'Recent loop/thiazide diuretic',
        9.9,
        'Yes if loop or thiazide during this AKI episode — typically within ~6–24 h for loops (natriuresis still active), not a remote home dose from days ago. When yes, interpret FeUrea primarily (prerenal <35%, ATN >50%).',
      ),
    ],
    calculate(values) {
      const pna = num(values.pna, 140);
      const una = num(values.una, 40);
      const pcr = num(values.pcr, 2);
      const ucr = num(values.ucr, 100);
      const purea = num(values.purea, 40);
      const uurea = num(values.uurea, 200);
      const onDiuretic = bool(values.onDiuretic);
      const fena = pna > 0 && ucr > 0 ? round(((una * pcr) / (pna * ucr)) * 100, 2) : 0;
      const feurea = purea > 0 && ucr > 0 ? round(((uurea * pcr) / (purea * ucr)) * 100, 1) : 0;

      let feureaLabel = 'Indeterminate FeUrea';
      let feureaNote = 'FeUrea 35–50%: indeterminate.';
      if (feurea < 35) {
        feureaLabel = 'FeUrea suggests prerenal';
        feureaNote = 'FeUrea <35% favors prerenal physiology.';
      } else if (feurea > 50) {
        feureaLabel = 'FeUrea suggests ATN / intrinsic';
        feureaNote = 'FeUrea >50% favors ATN or intrinsic injury.';
      }

      let fenaNote =
        fena < 1 ? 'FENa <1% classically prerenal' : fena > 2 ? 'FENa >2% classically ATN' : 'FENa 1–2% indeterminate';
      if (onDiuretic) {
        fenaNote += ' — but diuretics invalidate FENa (natriuresis expected). Prefer FeUrea.';
      }

      const preferFeurea = onDiuretic || fena >= 1;
      const riskLevel: 'low' | 'moderate' | 'info' =
        feurea < 35 ? 'low' : feurea > 50 ? 'moderate' : 'info';

      return {
        score: onDiuretic ? feurea : fena,
        unit: '%',
        label: onDiuretic ? feureaLabel : `FENa ${fena}% · ${feureaLabel}`,
        interpretation: onDiuretic
          ? `On diuretics: trust FeUrea (${feurea}%) over FENa (${fena}%). ${feureaNote} ${fenaNote}`
          : `FENa ${fena}% (${fenaNote}). FeUrea ${feurea}% — ${feureaNote}${preferFeurea ? ' FeUrea remains useful adjunct.' : ''}`,
        riskLevel,
        details: [
          { label: 'FENa', value: `${fena}%` },
          { label: 'FeUrea', value: `${feurea}%` },
          { label: 'Diuretic caveat', value: onDiuretic ? 'FENa unreliable — prefer FeUrea' : 'No diuretic reported' },
        ],
        recommendations: onDiuretic
          ? ['Interpret FeUrea primarily', 'Correlate with volume exam and hemodynamics']
          : ['Either index usable; still many exceptions (contrast, rhabdo, CKD)'],
      };
    },
    evidence: {
      summary: 'FENa confounded by diuretics; FeUrea better discriminates prerenal vs ATN after loops.',
      formula: 'FENa=(UNa×PCr)/(PNa×UCr)×100; FeUrea=(Uurea×PCr)/(Purea×UCr)×100',
      validation: 'Classic teaching with supportive cohorts; neither test is definitive alone.',
      references: [
        {
          title: 'Fractional excretion of urea for diagnosis of prerenal failure',
          citation: 'Carvounis CP et al. Kidney Int. 2002',
          year: 2002,
          pmid: '12427149',
          doi: '10.1046/j.1523-1755.2002.00683.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Prerenal pattern', actions: ['Volume resuscitation if hypovolemic', 'Hold ACEi/NSAID/SGLT2i as appropriate'] },
      { condition: 'ATN pattern', actions: ['Supportive care', 'Avoid overload', 'Monitor K, acid-base'] },
    ],
  },

  // 10. Electrolyte-free water clearance
  {
    id: 'electrolyte-free-water',
    name: 'Electrolyte-Free Water Clearance (cEFWC)',
    shortName: 'cEFWC',
    description: 'Approximate electrolyte-free water clearance: V × (1 − (UNa+UK)/PNa).',
    category: 'nephrology',
    tags: ['sodium', 'free water', 'hyponatremia', 'clearance'],
    whenToUse: 'Hyponatremia / free-water balance assessment using urine electrolytes and volume.',
    whyUse: 'Estimates whether kidneys are excreting or retaining electrolyte-free water.',
    inputs: [
      numberInput('v', 'Urine volume rate', { unit: 'L/day (or L per period)', min: 0.1, max: 20, step: 0.1, defaultValue: 1.5 }),
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 0, max: 300, defaultValue: 40 }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 0, max: 200, defaultValue: 30 }),
      numberInput('pna', 'Plasma Na', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 130 }),
    ],
    calculate(values) {
      const v = num(values.v, 1.5);
      const una = num(values.una, 40);
      const uk = num(values.uk, 30);
      const pna = num(values.pna, 130);
      if (pna <= 0) {
        return {
          score: '—',
          label: 'Invalid plasma Na',
          interpretation: 'Plasma Na must be >0.',
          riskLevel: 'info',
        };
      }
      const ratio = (una + uk) / pna;
      const cefwc = round(v * (1 - ratio), 2);
      let label = 'Near-zero free water clearance';
      let interpretation = '';
      let riskLevel: 'info' | 'moderate' | 'low' = 'info';
      if (cefwc > 0.2) {
        label = 'Positive cEFWC (losing free water)';
        interpretation = `cEFWC ${cefwc} L: kidneys excreting electrolyte-free water — tends to raise plasma Na if intake limited.`;
        riskLevel = 'low';
      } else if (cefwc < -0.2) {
        label = 'Negative cEFWC (retaining free water)';
        interpretation = `cEFWC ${cefwc} L: electrolyte-free water retention (UNa+UK > PNa) — tends to lower or maintain low plasma Na (SIADH-like or low solute).`;
        riskLevel = 'moderate';
      } else {
        interpretation = `cEFWC ${cefwc} L: near zero — little net electrolyte-free water clearance this period.`;
      }
      return {
        score: cefwc,
        unit: 'L (same period as V)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: '(UNa + UK) / PNa', value: round(ratio, 2).toString() },
          { label: 'Formula', value: 'V × (1 − (UNa+UK)/PNa)' },
        ],
      };
    },
    evidence: {
      summary: 'Electrolyte-free water clearance approximates free water handling better than osmolar clearance for dysnatremias.',
      formula: 'cEFWC = V × (1 − (UNa + UK) / PNa)',
      validation: 'Standard nephrology teaching for hyponatremia water balance.',
      references: [
        {
          title: 'New approach to disturbances in the plasma sodium concentration',
          citation: 'Rose BD. Am J Med. 1986;81:1033-1040',
          year: 1986,
          pmid: '3799631',
          doi: '10.1016/0002-9343(86)90401-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Negative cEFWC + hyponatremia', actions: ['Fluid restriction or treat SIADH cause', 'Ensure adequate solute intake'] },
    ],
  },

  // 11. Infusate sodium table (Adrogué)
  {
    id: 'infusate-sodium-table',
    name: 'Infusate ΔNa (Adrogué Table)',
    shortName: 'Infusate ΔNa',
    description: 'Expected change in serum Na per liter of common infusates (Adrogué-Madias).',
    category: 'nephrology',
    tags: ['sodium', 'fluids', 'adrogue', 'hyponatremia', 'hypernatremia'],
    whenToUse: 'Planning IV fluid Na content effect for dysnatremia correction.',
    whyUse: 'Estimates ΔNa per 1 L of D5W, 0.45% NaCl, 0.9% NaCl, or 3% NaCl.',
    inputs: [
      numberInput('sna', 'Current serum Na', { unit: 'mEq/L', min: 100, max: 190, defaultValue: 125 }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      selectInput('tbwFrac', 'TBW fraction', [
        { label: 'Young men (0.6)', value: 0.6 },
        { label: 'Women / elderly men (0.5)', value: 0.5 },
        { label: 'Elderly women (0.45)', value: 0.45 },
      ]),
      selectInput('infusate', 'Infusate', [
        { label: 'D5W (Na 0 mEq/L)', value: 0 },
        { label: '0.45% NaCl (Na 77)', value: 77 },
        { label: '0.9% NaCl (Na 154)', value: 154 },
        { label: '3% NaCl (Na 513)', value: 513 },
      ]),
    ],
    calculate(values) {
      const sna = num(values.sna, 125);
      const wt = num(values.weight, 70);
      const frac = num(values.tbwFrac, 0.5);
      const infNa = num(values.infusate, 154);
      const tbw = frac * wt;
      const delta = round((infNa - sna) / (tbw + 1), 2);
      const names: Record<number, string> = {
        0: 'D5W',
        77: '0.45% NaCl',
        154: '0.9% NaCl',
        513: '3% NaCl',
      };
      const fluid = names[infNa] ?? `Infusate Na ${infNa}`;
      // Full table for all four
      const table = [0, 77, 154, 513].map((n) => {
        const d = round((n - sna) / (tbw + 1), 2);
        return { label: names[n], value: `${d > 0 ? '+' : ''}${d} mEq/L per L` };
      });
      return {
        score: delta,
        unit: 'mEq/L per L infusate',
        label: `${fluid}: ΔNa ≈ ${delta > 0 ? '+' : ''}${delta} per liter`,
        interpretation: `Adrogué-Madias: each liter of ${fluid} changes serum Na by ~${delta} mEq/L (TBW ${round(tbw, 1)} L). Account for ongoing losses and do not correct chronic hyponatremia >8–10 mEq/L/day (lower limits if high risk ODS).`,
        riskLevel: 'info',
        details: [{ label: 'TBW', value: `${round(tbw, 1)} L` }, ...table],
        recommendations: [
          'Recheck Na frequently during active correction',
          'Include K in urine cation balance when relevant',
        ],
      };
    },
    evidence: {
      summary: 'Adrogué-Madias formula estimates change in serum Na after 1 L of infusate.',
      formula: 'ΔNa = (Na_infusate − Na_serum) / (TBW + 1); D5W=0, ½NS=77, NS=154, 3%=513 mEq/L',
      validation: 'Widely used teaching estimate; actual change varies with urine losses and intake.',
      references: [
        {
          title: 'Hypernatremia',
          citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000;342:1493-1499',
          year: 2000,
          pmid: '10816188',
          doi: '10.1056/NEJM200005183422006',
        },
      ],
    },
    nextSteps: [
      { condition: 'Active correction', actions: ['Serial Na q2–4h if using 3%', 'DDAVP clamp strategy in selected high-risk hyponatremia'] },
    ],
  },

  // 12. Potassium deficit
  {
    id: 'potassium-deficit',
    name: 'Estimated Potassium Deficit',
    shortName: 'K Deficit',
    description: 'Educational estimate of total-body potassium deficit from serum K and weight.',
    category: 'nephrology',
    tags: ['potassium', 'hypokalemia', 'electrolytes'],
    whenToUse: 'Rough planning for K repletion in hypokalemia (not exact total-body K).',
    whyUse: 'Provides order-of-magnitude deficit; actual needs vary with ongoing losses and pH.',
    inputs: [
      numberInput('k', 'Current serum K', { unit: 'mEq/L', min: 1.0, max: 5.5, step: 0.1, defaultValue: 2.8 }),
      numberInput('goal', 'Goal serum K', { unit: 'mEq/L', min: 3.0, max: 5.0, step: 0.1, defaultValue: 4.0 }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      selectInput('method', 'Estimate method', [
        { label: 'Rule of thumb: ~100 mEq per 0.4 mEq/L deficit (Gennari-style)', value: 'rule' },
        { label: 'ECF-only Vd: (goal−K)×0.4×wt', value: 'vd' },
      ], 'rule'),
    ],
    calculate(values) {
      const k = num(values.k, 2.8);
      const goal = num(values.goal, 4);
      const wt = num(values.weight, 70);
      const method = str(values.method, 'rule');
      if (k >= goal) {
        return {
          score: 0,
          unit: 'mEq',
          label: 'No deficit vs goal',
          interpretation: 'Current K is at or above goal — no replacement deficit by this estimate.',
          riskLevel: 'normal',
        };
      }
      const delta = goal - k;
      let deficit = 0;
      if (method === 'rule') {
        // ~100 mEq total body K per ~0.4 mEq/L serum fall (classic rough teaching)
        deficit = round((delta / 0.4) * 100, 0);
      } else {
        deficit = round(delta * 0.4 * wt, 0);
      }
      const severe = k < 2.5;
      return {
        score: deficit,
        unit: 'mEq',
        label: `Estimated deficit ~${deficit} mEq`,
        interpretation: `Rough total-body K deficit ≈ ${deficit} mEq to move serum from ${k} → ${goal}. Replace gradually with serial K checks; add Mg if low. ${severe ? 'Severe hypokalemia — continuous monitoring / careful IV repletion.' : 'Prefer oral route when possible.'}`,
        riskLevel: severe ? 'high' : k < 3.0 ? 'moderate' : 'info',
        details: [
          { label: 'ΔK', value: `${round(delta, 1)} mEq/L` },
          { label: 'Method', value: method === 'rule' ? '~100 mEq per 0.4 mEq/L' : 'ECF-only (goal−K)×0.4×wt' },
        ],
        recommendations: [
          'Correct concurrent hypomagnesemia',
          'Account for ongoing GI/renal losses',
          'Educational estimate only — not a dosing protocol',
        ],
      };
    },
    evidence: {
      summary: 'Serum K poorly reflects total-body stores; teaching estimates use Vd≈0.4 L/kg or ~100 mEq per 0.4 mEq/L fall.',
      formula: 'Deficit ≈ (ΔK/0.4)×100 mEq (default)  OR  ECF-only (K_goal − K)×0.4×weight',
      validation: 'Educational approximation only; wide individual variation (acid-base, insulin, catecholamines).',
      references: [
        {
          title: 'Hypokalemia',
          citation: 'Gennari FJ. N Engl J Med. 1998;339:451-458',
          year: 1998,
          pmid: '9700180',
          doi: '10.1056/NEJM199808133390707',
        },
      ],
    },
    nextSteps: [
      { condition: 'K <2.5 or ECG changes', actions: ['Monitored setting', 'IV K per institutional max rates', 'Recheck frequently'] },
    ],
    pearls: ['Alkalosis and insulin shift K intracellularly — serum may fall without large total-body deficit.'],
  },

  // 13. Chloride deficit
  {
    id: 'chloride-deficit',
    name: 'Chloride Deficit (Metabolic Alkalosis)',
    shortName: 'Cl Deficit',
    description: 'Estimates chloride deficit to guide saline-responsive metabolic alkalosis repair.',
    category: 'nephrology',
    tags: ['chloride', 'metabolic alkalosis', 'fluids'],
    whenToUse: 'Chloride-depletion (saline-responsive) metabolic alkalosis volume/Cl repletion planning.',
    whyUse: 'Rough Cl deficit helps estimate NS volume needed when alkalosis is Cl-responsive.',
    inputs: [
      numberInput('cl', 'Current serum Cl', { unit: 'mEq/L', min: 50, max: 120, defaultValue: 90 }),
      numberInput('goalCl', 'Goal serum Cl', { unit: 'mEq/L', min: 90, max: 110, defaultValue: 100 }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      selectInput('vd', 'Apparent Vd factor', [
        { label: '0.2 × weight (common teaching)', value: 0.2 },
        { label: '0.3 × weight (alternate)', value: 0.3 },
      ]),
    ],
    calculate(values) {
      const cl = num(values.cl, 90);
      const goal = num(values.goalCl, 100);
      const wt = num(values.weight, 70);
      const f = num(values.vd, 0.2);
      if (cl >= goal) {
        return {
          score: 0,
          unit: 'mEq',
          label: 'No Cl deficit vs goal',
          interpretation: 'Chloride is at/above goal — deficit estimate not applicable; consider other causes of alkalosis (mineralocorticoid excess, etc.).',
          riskLevel: 'info',
        };
      }
      const deficit = round(f * wt * (goal - cl), 0);
      const nsLiters = round(deficit / 154, 1);
      return {
        score: deficit,
        unit: 'mEq',
        label: `Cl deficit ~${deficit} mEq`,
        interpretation: `Estimated Cl deficit ${deficit} mEq ≈ ${nsLiters} L of 0.9% NaCl (154 mEq/L) if purely Cl repletion — usually give more carefully with volume status and K. Useful mainly for gastric losses / diuretic Cl-depletion alkalosis.`,
        riskLevel: 'info',
        details: [
          { label: 'Formula', value: `${f} × wt × (goal Cl − Cl)` },
          { label: 'Approx NS volume', value: `${nsLiters} L` },
        ],
      };
    },
    evidence: {
      summary: 'Chloride deficit estimates for saline-responsive metabolic alkalosis use a fraction of body weight times Cl gap.',
      formula: 'Cl deficit ≈ 0.2 × weight(kg) × (Cl_desired − Cl_measured)',
      validation: 'Teaching estimate; treat volume and K concurrently; not for saline-unresponsive alkalosis.',
      references: [
        {
          title: 'Metabolic alkalosis',
          citation: 'Galla JH. JASN / classic fluid-electrolyte texts',
          year: 2000,
          pmid: '10665945',
          doi: '10.1681/ASN.V112369',
        },
      ],
    },
    nextSteps: [
      { condition: 'Cl-responsive alkalosis', actions: ['Isotonic saline if hypovolemic', 'Replete K/Mg', 'Stop or reduce loop/thiazide if possible'] },
    ],
  },

  // 14. Potassium IV rate safety
  {
    id: 'potassium-iv-rate',
    name: 'IV Potassium Rate Safety Check',
    shortName: 'K IV Rate',
    description: 'Educational check of IV KCl infusion rate against common peripheral/central limits.',
    category: 'critical-care',
    tags: ['potassium', 'infusion', 'safety', 'icu'],
    whenToUse: 'Before/while ordering IV KCl to compare planned rate with usual safety ceilings.',
    whyUse: 'Rapid IV K risks arrhythmia; institutions set max rates and concentrations.',
    inputs: [
      numberInput('meq', 'KCl amount to infuse', { unit: 'mEq', min: 1, max: 80, defaultValue: 10 }),
      numberInput('hours', 'Infusion duration', {
        unit: 'hours',
        min: 0.25,
        max: 24,
        step: 0.25,
        defaultValue: 1,
        helpText: 'Rate = mEq / hours. Peripheral usually ≥1 h per 10 mEq.',
      }),
      selectInput(
        'access',
        'Access',
        [
          { label: 'Peripheral IV', value: 'peripheral', description: 'Typical ceiling ≤10 mEq/h; never IV push' },
          { label: 'Central line', value: 'central', description: 'Typical ceiling ≤20 mEq/h (up to ~40 mEq/h only with continuous monitoring in emergencies)' },
        ],
        undefined,
        'Typical educational ceilings: peripheral ≤10 mEq/h; central ≤20 mEq/h (up to ~40 mEq/h only with continuous monitoring in emergencies). Never IV push.',
      ),
      yesNo('monitor', 'Continuous cardiac monitoring', 0),
      yesNo('icu', 'ICU / high-acuity setting', 0),
    ],
    calculate(values) {
      const meq = num(values.meq, 10);
      const hours = num(values.hours, 1);
      const rate = hours > 0 ? round(meq / hours, 1) : 999;
      const access = str(values.access, 'peripheral');
      const monitor = bool(values.monitor);
      const icu = bool(values.icu);
      const maxUsual = access === 'peripheral' ? 10 : monitor || icu ? 20 : 10;
      // Some protocols allow up to 40 mEq/h centrally with continuous monitoring in emergencies
      const maxEmergencyCentral = 40;
      let label = 'Within common limits';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = `Rate ${rate} mEq/h via ${access}.`;
      if (access === 'peripheral' && rate > 10) {
        label = 'Exceeds typical peripheral max (10 mEq/h)';
        riskLevel = 'high';
        interpretation += ' Typical peripheral ceiling ~10 mEq/h (concentration limits also apply). Prefer central access or slow infusion.';
      } else if (access === 'central' && rate > maxEmergencyCentral) {
        label = 'Exceeds emergency central max (~40 mEq/h)';
        riskLevel = 'critical';
        interpretation += ' Rates >40 mEq/h are rarely justified and highly dangerous.';
      } else if (access === 'central' && rate > 20) {
        label = 'High central rate — monitoring required';
        riskLevel = monitor ? 'moderate' : 'high';
        interpretation += monitor
          ? ' 20–40 mEq/h only in monitored emergencies per local policy.'
          : ' Continuous cardiac monitoring required for rates >10–20 mEq/h.';
      } else if (access === 'central' && rate > 10 && !monitor) {
        label = 'Central rate >10 mEq/h without monitoring flagged';
        riskLevel = 'moderate';
        interpretation += ' Strongly recommend continuous telemetry.';
      } else {
        interpretation += ` Within common ${access} guidance (≤${maxUsual} mEq/h typical). Follow institutional policy.`;
      }
      return {
        score: rate,
        unit: 'mEq/h',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Planned', value: `${meq} mEq over ${hours} h` },
          { label: 'Access', value: access === 'central' ? 'Central line' : 'Peripheral IV' },
          { label: 'Continuous cardiac monitoring', value: monitor ? 'Yes' : 'No' },
          { label: 'ICU / high-acuity setting', value: icu ? 'Yes' : 'No' },
          { label: 'Suggested max for context', value: `${maxUsual} mEq/h` },
          { label: 'Typical peripheral max', value: '10 mEq/h' },
          { label: 'Typical central max', value: '20 mEq/h (up to ~40 monitored emergency)' },
        ],
        recommendations: [
          'Never give IV K as push/bolus',
          'Recheck K after each 10–20 mEq in severe hypokalemia',
          'Correct Mg concurrently',
        ],
      };
    },
    evidence: {
      summary: 'Common safety limits: peripheral ≤10 mEq/h; central ≤20 mEq/h (higher only with continuous monitoring in critical hypokalemia).',
      formula: 'Rate (mEq/h) = dose (mEq) / duration (h)',
      validation: 'Institution-specific policies vary; this is an educational safety check, not a protocol.',
      references: [
        {
          title: 'Rapid correction of hypokalemia using concentrated intravenous potassium chloride infusions',
          citation: 'Kruse JA, Carlson RW. Arch Intern Med. 1990;150:613-617',
          year: 1990,
          pmid: '2310280',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rate above limits', actions: ['Reduce rate or use central access', 'Ensure telemetry', 'Pharmacy/protocol review'] },
    ],
  },

  // 15. Ionized Ca pH correction
  {
    id: 'ionized-ca-ph',
    name: 'Ionized Calcium pH Correction',
    shortName: 'iCa–pH',
    description: 'Approximate pH adjustment of ionized calcium toward pH 7.40.',
    category: 'nephrology',
    tags: ['calcium', 'ionized', 'ph', 'abg'],
    whenToUse: 'When iCa is measured at a non-physiologic pH and you want an approximate 7.40-normalized value.',
    whyUse: 'Acidemia increases iCa; alkalemia decreases iCa — correction aids interpretation.',
    inputs: [
      numberInput('ica', 'Measured ionized Ca', {
        unit: 'mmol/L',
        min: 0.4,
        max: 2.5,
        step: 0.01,
        defaultValue: 1.05,
        helpText: 'Usual iCa ~1.1–1.3 mmol/L. This tool approximates +0.05 mmol/L iCa per 0.1 pH below the reference (inverse if alkalemic).',
      }),
      numberInput('ph', 'pH at measurement', {
        unit: '',
        min: 6.8,
        max: 7.8,
        step: 0.01,
        defaultValue: 7.25,
        helpText: 'pH of the sample when iCa was measured (ABG/VBG).',
      }),
      numberInput('targetPh', 'Reference pH', { unit: '', min: 7.3, max: 7.5, step: 0.01, defaultValue: 7.4 }),
    ],
    calculate(values) {
      const ica = num(values.ica, 1.05);
      const ph = num(values.ph, 7.25);
      const target = num(values.targetPh, 7.4);
      // ≈0.05 mmol/L change in iCa per 0.1 pH unit (inverse relationship)
      const deltaPh = ph - target;
      const corrected = round(ica + 0.5 * deltaPh, 2); // 0.05 per 0.1 = 0.5 per 1.0 pH
      // Alternative factor sometimes cited ~0.04–0.05 mmol/L per 0.1 pH
      const r = riskFromThresholds(corrected, [
        {
          max: 0.99,
          level: 'high',
          label: 'Low corrected iCa',
          interpretation: `Corrected iCa ${corrected} mmol/L (from ${ica} at pH ${ph}) — hypocalcemic range at pH ${target}.`,
        },
        {
          max: 1.3,
          level: 'normal',
          label: 'Normal corrected iCa range',
          interpretation: `Corrected iCa ${corrected} mmol/L at pH ${target} (measured ${ica} at pH ${ph}). Lab reference bands vary.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'High corrected iCa',
          interpretation: `Corrected iCa ${corrected} mmol/L — elevated vs usual ~1.1–1.3 mmol/L band.`,
        },
      ]);
      return {
        score: corrected,
        unit: 'mmol/L',
        ...r,
        details: [
          { label: 'Measured iCa', value: `${ica} mmol/L` },
          { label: 'ΔpH (meas − ref)', value: round(deltaPh, 2).toString() },
          { label: 'Rule used', value: '≈0.05 mmol/L per 0.1 pH (inverse)' },
        ],
      };
    },
    evidence: {
      summary: 'Ionized Ca rises as pH falls (~0.05 mmol/L per 0.1 pH). Correction to 7.40 is approximate.',
      formula: 'iCa_corr ≈ iCa_meas + 0.5 × (pH_meas − 7.40)  [= +0.05 mmol/L per +0.1 pH]',
      validation: 'Physiologic approximation; report measured iCa with actual pH for clinical decisions.',
      references: [
        {
          title: 'pH effects on measurements of ionized calcium and ionized magnesium in blood',
          citation: 'Wang S et al. Arch Pathol Lab Med. 2002;126:947-950',
          year: 2002,
          pmid: '12171493',
          doi: '10.5858/2002-126-0947-PEOMOI',
        },
      ],
    },
    nextSteps: [
      { condition: 'True hypocalcemia', actions: ['Check Mg, PTH, vitamin D', 'Replace Ca if symptomatic or severe'] },
    ],
    pearls: ['Treat the patient using measured iCa and clinical context; pH correction is interpretive only.'],
  },

  // 16. Phosphate replacement
  {
    id: 'phos-replacement',
    name: 'Phosphate Replacement Estimate',
    shortName: 'Phos Dose',
    description: 'Educational IV/oral phosphate dose range by severity and weight.',
    category: 'nephrology',
    tags: ['phosphate', 'hypophosphatemia', 'electrolytes', 'icu'],
    whenToUse: 'Planning repletion for hypophosphatemia (weight-based mmol estimates).',
    whyUse: 'Severity-stratified mmol/kg guidance commonly used in ICU protocols.',
    inputs: [
      numberInput('phos', 'Serum phosphate', {
        unit: 'mg/dL',
        min: 0.3,
        max: 5,
        step: 0.1,
        defaultValue: 1.5,
        helpText: 'Enter the lab value in the unit selected below. 1 mmol/L ≈ 3.1 mg/dL. Repletion typically considered below ~2.5 mg/dL.',
      }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 30, max: 200, defaultValue: 70 }),
      selectInput('units', 'Phosphate unit entered', [
        { label: 'mg/dL', value: 'mg', description: 'Conventional US units (tool default)' },
        { label: 'mmol/L (will treat as mmol/L)', value: 'mmol', description: 'SI units; converted ×3.1 to mg/dL for severity bands' },
      ]),
    ],
    calculate(values) {
      let phos = num(values.phos, 1.5);
      const wt = num(values.weight, 70);
      const units = str(values.units, 'mg');
      // Convert mmol/L → approx mg/dL (1 mmol/L ≈ 3.1 mg/dL)
      const phosMg = units === 'mmol' ? phos * 3.1 : phos;
      let severity = 'mild';
      let low = 0.08;
      let high = 0.16;
      let riskLevel: 'info' | 'moderate' | 'high' | 'critical' = 'info';
      if (phosMg < 1.0) {
        severity = 'severe';
        low = 0.32;
        high = 0.64;
        riskLevel = 'high';
      } else if (phosMg < 2.0) {
        severity = 'moderate';
        low = 0.16;
        high = 0.32;
        riskLevel = 'moderate';
      } else if (phosMg < 2.5) {
        severity = 'mild';
        low = 0.08;
        high = 0.16;
        riskLevel = 'info';
      } else {
        return {
          score: 0,
          unit: 'mmol',
          label: 'No routine repletion',
          interpretation: `Phosphate ${round(phosMg, 1)} mg/dL is at/above typical repletion threshold (~2.5 mg/dL). Treat only if ongoing losses or refeeding risk.`,
          riskLevel: 'normal',
        };
      }
      const doseLow = round(low * wt, 1);
      const doseHigh = round(high * wt, 1);
      // KPhos ~3 mmol Phos and 4.4 mEq K per mL in some products — note only
      return {
        score: `${doseLow}–${doseHigh}`,
        unit: 'mmol',
        label: `${severity} hypophosphatemia — ${doseLow}–${doseHigh} mmol`,
        interpretation: `Estimated replacement ${doseLow}–${doseHigh} mmol phosphate (${low}–${high} mmol/kg × ${wt} kg) for ${severity} hypophosphatemia (≈${round(phosMg, 1)} mg/dL). Infuse IV slowly; reduce dose in kidney failure; monitor K/Ca if using K-Phos/Na-Phos.`,
        riskLevel,
        details: [
          { label: 'Severity', value: severity },
          { label: 'Dose range', value: `${low}–${high} mmol/kg` },
          { label: 'Approx mg elemental P', value: `${round(doseLow * 31, 0)}–${round(doseHigh * 31, 0)} mg` },
        ],
        recommendations: [
          'Recheck phosphate after repletion',
          'Use caution if eGFR low — prefer lower end / oral if possible',
          'Watch for hypocalcemia with aggressive IV phosphate',
        ],
      };
    },
    evidence: {
      summary: 'Weight-based phosphate repletion: mild ~0.08–0.16, moderate ~0.16–0.32, severe ~0.32–0.64 mmol/kg.',
      formula: 'Dose (mmol) = factor × weight; factors by serum PO₄ severity',
      validation: 'Common ICU protocol ranges; product concentrations vary — verify local formulation.',
      references: [
        {
          title: 'Treatment of hypophosphatemia in patients receiving specialized nutrition support using a graduated dosing scheme',
          citation: 'Clark CL et al. Crit Care Med. 1995;23:1504-1511',
          year: 1995,
          pmid: '7664552',
          doi: '10.1097/00003246-199509000-00010',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severe (<1.0 mg/dL)', actions: ['IV repletion in monitored setting', 'Evaluate refeeding, vitamin D, hyperparathyroidism'] },
    ],
  },

  // 17. VExUS
  {
    id: 'vexus',
    name: 'VExUS Score (Venous Congestion)',
    shortName: 'VExUS',
    description: 'Venous Excess Ultrasound score from hepatic, portal, and intrarenal Doppler grades.',
    category: 'critical-care',
    tags: ['vexus', 'ultrasound', 'congestion', 'fluid', 'right heart'],
    whenToUse: 'Bedside assessment of systemic venous congestion (heart failure, AKI, fluid intolerance).',
    whyUse: 'Integrates IVC size with hepatic, portal, and intrarenal venous Doppler into a congestion grade.',
    inputs: [
      selectInput(
        'ivc',
        'IVC (qualifying)',
        [
          {
            label: 'IVC <2 cm diameter (VExUS 0 pathway)',
            value: 0,
            description: 'Largest AP diameter <2 cm; VExUS 0 — do not use organ Doppler to upgrade',
          },
          {
            label: 'IVC ≥2 cm (proceed to vein grades)',
            value: 1,
            description: 'Gateway for VExUS 1–3; grade organ veins next',
          },
        ],
        undefined,
        'Max AP diameter ~1–2 cm from RA–IVC junction (or just distal to HV inflow), long + short axis, largest quiet-breathing diameter (typically end-expiration). <2 cm = VExUS 0 without organ Doppler.',
      ),
      selectInput(
        'hepatic',
        'Hepatic vein Doppler',
        [
          { label: '0 — Normal (S > D)', value: 0, description: 'Systolic (S) antegrade > diastolic (D) antegrade' },
          {
            label: '1 — S < D but still antegrade S',
            value: 1,
            description: 'Mild: S still toward the heart but smaller than D',
          },
          {
            label: '2 — S reversal (systolic flow reversal)',
            value: 2,
            description: 'Severe: S wave reversed (retrograde in systole)',
          },
        ],
        undefined,
        'Pulsed-wave Doppler of the middle hepatic vein. S = systolic antegrade (toward heart), D = diastolic antegrade. 0 = S>D; 1 = S<D still antegrade; 2 = S reversal.',
      ),
      selectInput(
        'portal',
        'Portal vein Doppler',
        [
          {
            label: '0 — Continuous / pulsatility <30%',
            value: 0,
            description: 'PF = (Vmax−Vmin)/Vmax × 100 <30%',
          },
          { label: '1 — Pulsatility 30–49%', value: 1, description: 'Mild: pulsatility fraction 30–49%' },
          { label: '2 — Pulsatility ≥50%', value: 2, description: 'Severe: PF ≥50% (often to-and-fro)' },
        ],
        undefined,
        'Right portal vein, mid-axillary window. Pulsatility fraction PF = (Vmax − Vmin)/Vmax × 100.',
      ),
      selectInput(
        'intrarenal',
        'Intrarenal venous Doppler',
        [
          {
            label: '0 — Continuous',
            value: 0,
            description: 'Continuous venous flow at interlobar corticomedullary junction',
          },
          {
            label: '1 — Discontinuous biphasic',
            value: 1,
            description: 'Mild: separate S and D waves (interrupted but both present)',
          },
          {
            label: '2 — Discontinuous monophasic',
            value: 2,
            description: 'Severe: monophasic D-only (S absent)',
          },
        ],
        undefined,
        'Interlobar vein at corticomedullary junction. 0 = continuous; 1 = discontinuous biphasic (separate S and D); 2 = monophasic D-only.',
      ),
    ],
    calculate(values) {
      const ivc = num(values.ivc, 1);
      const h = num(values.hepatic, 0);
      const p = num(values.portal, 0);
      const r = num(values.intrarenal, 0);
      if (ivc === 0) {
        return {
          score: 0,
          label: 'VExUS grade 0',
          interpretation: 'IVC not dilated (<2 cm): VExUS 0 — no significant ultrasound venous congestion by protocol.',
          riskLevel: 'low',
          details: [{ label: 'IVC', value: '<2 cm' }],
        };
      }
      const severeCount = [h, p, r].filter((g) => g === 2).length;
      const anyAbnormal = [h, p, r].some((g) => g >= 1);
      let grade = 0;
      if (!anyAbnormal) grade = 0;
      else if (severeCount === 0) grade = 1; // only mild abnormalities
      else if (severeCount === 1) grade = 2;
      else grade = 3; // ≥2 severe patterns
      // Note: original VExUS: grade 1 = any mild; 2 = one severe; 3 = ≥2 severe (with dilated IVC)
      const labels = [
        'VExUS 0 — no congestion',
        'VExUS 1 — mild congestion',
        'VExUS 2 — moderate congestion',
        'VExUS 3 — severe congestion',
      ];
      const levels: Array<'low' | 'moderate' | 'high' | 'critical'> = ['low', 'moderate', 'high', 'critical'];
      const interps = [
        'Dilated IVC but normal organ vein Dopplers — no VExUS congestion.',
        'Mild venous congestion pattern — interpret with volume exam and right heart function.',
        'Moderate congestion — fluid removal / decongestion strategies often considered if clinically overloaded.',
        'Severe multi-organ venous congestion — associated with AKI and worse outcomes; prioritize decongestion when appropriate.',
      ];
      return {
        score: grade,
        label: labels[grade],
        interpretation: interps[grade],
        riskLevel: levels[grade],
        details: [
          { label: 'Hepatic grade', value: String(h) },
          { label: 'Portal grade', value: String(p) },
          { label: 'Intrarenal grade', value: String(r) },
          { label: 'Severe patterns (grade 2)', value: String(severeCount) },
        ],
      };
    },
    evidence: {
      summary: 'VExUS grades venous congestion using IVC plus hepatic, portal, and intrarenal venous Doppler patterns.',
      formula: 'If IVC ≥2 cm: Grade 1 = only mild Doppler changes; 2 = one severe; 3 = ≥2 severe organ patterns',
      validation: 'Linked to AKI and congestion phenotypes in cardiac surgery / critical care cohorts; operator dependent.',
      references: [
        {
          title: 'The Venous Excess Ultrasound (VExUS) score',
          citation: 'Beaubien-Souligny et al. Ultrasound J / related critical care literature',
          year: 2020,
          pmid: '32270297',
          doi: '10.1186/s13089-020-00163-w',
        },
      ],
    },
    nextSteps: [
      { condition: 'VExUS 2–3 + overload', actions: ['Diuresis or ultrafiltration as appropriate', 'Reassess organ perfusion', 'Treat right heart / TR causes'] },
    ],
    pearls: [
      'Grade 1 = only mild organ patterns; 2 = one severe (grade-2) pattern; 3 = ≥2 severe patterns — all require dilated IVC ≥2 cm.',
    ],
  },

  // 18. IVC collapsibility
  {
    id: 'ivc-collapsibility',
    name: 'IVC Collapsibility Index',
    shortName: 'IVC CI',
    description: 'IVC collapsibility/distensibility index for fluid responsiveness estimation.',
    category: 'critical-care',
    tags: ['ivc', 'ultrasound', 'fluid responsiveness', 'volume'],
    whenToUse: 'Bedside ultrasound volume assessment (spontaneous breathing or controlled ventilation).',
    whyUse: 'CI% estimates RAP / fluid responsiveness when used with correct respiratory context.',
    inputs: [
      numberInput('dmax', 'IVC Dmax (diameter max)', {
        unit: 'cm',
        min: 0.5,
        max: 4,
        step: 0.1,
        defaultValue: 2.0,
        helpText:
          'AP diameter ~1–2 cm caudal to RA–IVC junction (or just distal to HV inflow), subcostal long-axis, M-mode over several quiet breaths — not a sniff. Dmax = largest diameter.',
      }),
      numberInput('dmin', 'IVC Dmin (diameter min)', {
        unit: 'cm',
        min: 0.3,
        max: 4,
        step: 0.1,
        defaultValue: 1.2,
        helpText: 'Smallest AP diameter in the same clip/window as Dmax. Spontaneous: Dmin usually inspiration; controlled PPV: Dmax usually inspiration.',
      }),
      selectInput(
        'vent',
        'Breathing context',
        [
          {
            label: 'Spontaneous breathing (collapsibility)',
            value: 'sb',
            description:
              'Patient breathing spontaneously or triggering; Dmax typically end-expiration, Dmin inspiration. CI ≥50% suggests low RAP if hypoperfused.',
          },
          {
            label: 'Controlled positive-pressure ventilation (distensibility)',
            value: 'ppv',
            description:
              'Fully passive (no triggering), TV ≥8 mL/kg predicted body weight; Dmax typically on inspiration. Gray zone ~12–18%. Invalid if spontaneous efforts, low TV, IAH, or RV failure.',
          },
        ],
        undefined,
        'Spontaneous: Dmax usually end-expiration, Dmin inspiration; CI ≥50% suggests low RAP if hypoperfused. Controlled PPV: Dmax usually inspiration; meaningful only if fully passive, TV ≥8 mL/kg PBW, no triggering. This tool always uses (Dmax−Dmin)/Dmax × 100.',
      ),
    ],
    calculate(values) {
      const dmax = num(values.dmax, 2);
      const dmin = num(values.dmin, 1.2);
      const vent = str(values.vent, 'sb');
      if (dmax <= 0) {
        return { score: '—', label: 'Invalid diameters', interpretation: 'Dmax must be >0.', riskLevel: 'info' };
      }
      // Standard collapsibility: (Dmax−Dmin)/Dmax×100
      const ci = round(((dmax - dmin) / dmax) * 100, 0);
      // Distensibility sometimes (Dmax−Dmin)/Dmin — we report collapsibility form and interpret by context
      if (vent === 'sb') {
        // Spontaneous: CI >50% with small IVC suggests low RAP / possible fluid responsive
        const r = riskFromThresholds(ci, [
          {
            max: 20,
            level: 'moderate',
            label: 'Low collapsibility',
            interpretation: `IVC CI ${ci}%: low collapsibility — higher RAP / less likely fluid responsive (if spontaneously breathing). Consider congestion.`,
          },
          {
            max: 49,
            level: 'info',
            label: 'Intermediate collapsibility',
            interpretation: `IVC CI ${ci}%: intermediate — gray zone; use PLR, history, and other dynamic tests.`,
          },
          {
            max: 100,
            level: 'low',
            label: 'High collapsibility',
            interpretation: `IVC CI ${ci}% ≥50%: high collapsibility on spontaneous breathing — suggests low RAP; may respond to fluid if hypoperfused.`,
          },
        ]);
        return {
          score: ci,
          unit: '%',
          ...r,
          details: [
            { label: 'Formula', value: '(Dmax − Dmin) / Dmax × 100' },
            { label: 'Dmax / Dmin', value: `${dmax} / ${dmin} cm` },
          ],
        };
      }
      // PPV controlled: higher distensibility suggests fluid responsiveness (often dIVC >12–18%)
      const r = riskFromThresholds(ci, [
        {
          max: 11,
          level: 'moderate',
          label: 'Low variation',
          interpretation: `Index ${ci}%: low IVC variation on controlled ventilation — less likely fluid responsive (best if fully passive, TV≥8 mL/kg, no efforts).`,
        },
        {
          max: 17,
          level: 'info',
          label: 'Gray zone',
          interpretation: `Index ${ci}%: gray zone for ventilated distensibility thresholds (~12–18%).`,
        },
        {
          max: 100,
          level: 'low',
          label: 'High variation',
          interpretation: `Index ${ci}%: high IVC respiratory variation — favors fluid responsiveness if validity conditions met.`,
        },
      ]);
      return {
        score: ci,
        unit: '%',
        ...r,
        details: [
          { label: 'Formula used', value: '(Dmax − Dmin) / Dmax × 100' },
          { label: 'Note', value: 'Some protocols use /Dmin for distensibility' },
        ],
      };
    },
    evidence: {
      summary: 'IVC collapsibility (spontaneous) and distensibility (passive PPV) are dynamic ultrasound estimates of fluid responsiveness with important caveats.',
      formula: 'CI% = (Dmax − Dmin) / Dmax × 100',
      validation: 'Moderate accuracy; limited by spontaneous efforts, low TV, abdominal hypertension, RV failure.',
      references: [
        {
          title: 'Respiratory changes in inferior vena cava diameter are helpful in predicting fluid responsiveness in ventilated septic patients',
          citation: 'Barbier C et al. Intensive Care Med. 2004;30:1740-1746',
          year: 2004,
          pmid: '15034650',
          doi: '10.1007/s00134-004-2259-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'High CI + hypoperfusion', actions: ['Fluid challenge or PLR confirmation', 'Reassess perfusion'] },
      { condition: 'Low CI + overload', actions: ['Avoid fluids', 'Consider decongestion'] },
    ],
  },

  // 19. Passive leg raise
  {
    id: 'passive-leg-raise',
    name: 'Passive Leg Raise (PLR) Interpretation',
    shortName: 'PLR',
    description: 'Interprets stroke volume / CO change with passive leg raise for fluid responsiveness.',
    category: 'critical-care',
    tags: ['plr', 'fluid responsiveness', 'hemodynamics', 'icu'],
    whenToUse: 'Predict fluid responsiveness without committing to a fluid bolus.',
    whyUse: 'PLR reversibly mobilizes ~300 mL venous blood; SV/CO increase ≥10–15% predicts responders.',
    inputs: [
      numberInput('svBase', 'Baseline SV or CO (or VTI)', {
        unit: 'any unit',
        min: 0.1,
        max: 300,
        step: 0.1,
        defaultValue: 50,
        helpText:
          'Measure at semi-recumbent 30–45° (start position) using SV, CO, or LVOT VTI — not cuff BP. Then, using the bed, drop the trunk to horizontal and raise the legs to 45° (do not lift the feet off the mattress). Invalid if severe IAH, bilateral amputation, pain, or IABP.',
      }),
      numberInput('svPlr', 'SV/CO/VTI during PLR', {
        unit: 'same unit',
        min: 0.1,
        max: 300,
        step: 0.1,
        defaultValue: 58,
        helpText:
          'Peak effect 30–90 s after the PLR maneuver; then return to semi-recumbent to confirm the value falls. Responder if Δ ≥10% (some protocols use ≥15%).',
      }),
      selectInput('metric', 'Metric used', [
        { label: 'Stroke volume', value: 'sv', description: 'Stroke volume from arterial waveform, echo, or calibrated monitor' },
        { label: 'Cardiac output / index', value: 'co', description: 'CO or CI; percent change is equivalent to SV if HR is stable' },
        { label: 'LVOT VTI', value: 'vti', description: 'LVOT velocity-time integral (echo); a surrogate for SV' },
      ]),
    ],
    calculate(values) {
      const base = num(values.svBase, 50);
      const plr = num(values.svPlr, 58);
      if (base <= 0) {
        return { score: '—', label: 'Invalid baseline', interpretation: 'Baseline must be >0.', riskLevel: 'info' };
      }
      const pct = round(((plr - base) / base) * 100, 1);
      const responder = pct >= 10;
      const metricKey = str(values.metric, 'sv');
      const metricLabel =
        metricKey === 'co' ? 'Cardiac output / index' : metricKey === 'vti' ? 'LVOT VTI' : 'Stroke volume';
      return {
        score: pct,
        unit: '% change',
        label: responder ? 'Likely fluid responsive (Δ ≥10%)' : 'Likely non-responsive (Δ <10%)',
        interpretation: responder
          ? `PLR increased ${metricLabel} by ${pct}% (≥10–15% threshold). Patient likely to increase CO with fluids if still hypoperfused — give challenge and reassess.`
          : `PLR change in ${metricLabel}: ${pct}% (<10%). Unlikely fluid responsive; avoid unnecessary volume — pursue vasopressors/inotropes or other causes of shock.`,
        riskLevel: responder ? 'low' : 'moderate',
        details: [
          { label: 'Metric used', value: metricLabel },
          { label: 'Baseline', value: String(base) },
          { label: 'During PLR', value: String(plr) },
          { label: 'Percent change', value: `${pct}%` },
          { label: 'Common threshold', value: '≥10% (some use ≥15%)' },
        ],
        recommendations: [
          'Start from semi-recumbent position; raise legs to 45°',
          'Measure with real-time SV/VTI — not BP alone',
          'Invalid if severe pain, amputation, IABP, or intra-abdominal hypertension extremes',
        ],
      };
    },
    evidence: {
      summary: 'PLR is a reversible endogenous fluid challenge; ΔSV/CO ≥10–15% predicts fluid responsiveness.',
      formula: '% change = (value_PLR − value_baseline) / value_baseline × 100',
      validation: 'Strong evidence among dynamic tests when SV/CO measured accurately.',
      references: [
        {
          title: 'Passive leg raising for predicting fluid responsiveness: a systematic review and meta-analysis',
          citation: 'Monnet X, Marik P, Teboul JL. Intensive Care Med. 2016;42:1935-1947',
          year: 2016,
          pmid: '26825952',
          doi: '10.1007/s00134-015-4134-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Responder + hypoperfusion', actions: ['Fluid bolus', 'Reassess lactate/perfusion', 'Stop fluids when PLR negative'] },
    ],
  },

  // 20. Pulse pressure variation
  {
    id: 'pulse-pressure-variation',
    name: 'Pulse Pressure Variation (PPV)',
    shortName: 'PPV',
    description: 'Arterial pulse pressure variation: (PPmax − PPmin) / mean PP × 100.',
    category: 'critical-care',
    tags: ['ppv', 'fluid responsiveness', 'arterial line', 'ventilation'],
    whenToUse: 'Fully adapted patients on controlled ventilation to predict fluid responsiveness.',
    whyUse: 'Dynamic arterial waveform index; PPV >12–13% often predicts responders under valid conditions.',
    inputs: [
      numberInput('ppmax', 'PPmax — largest pulse pressure this mechanical breath', {
        unit: 'mmHg',
        min: 1,
        max: 150,
        defaultValue: 50,
        helpText:
          'From the arterial line over one mechanical breath: PPmax = largest (SBP−DBP) in the cycle — not SPmax minus a different beat\'s DP.',
      }),
      numberInput('ppmin', 'PPmin — smallest pulse pressure this mechanical breath', {
        unit: 'mmHg',
        min: 1,
        max: 150,
        defaultValue: 40,
        helpText: 'PPmin = smallest (SBP−DBP) in the same mechanical breath as PPmax.',
      }),
      yesNo(
        'valid',
        'Validity conditions met (controlled MV, TV≥8 mL/kg, no efforts, sinus, closed chest)',
        0,
        'TV ≥8 mL/kg predicted body weight, fully adapted (no triggering), sinus, closed chest; unreliable in RV failure, very low compliance, high PEEP, arrhythmia, or spontaneous breathing.',
      ),
    ],
    calculate(values) {
      const ppmax = num(values.ppmax, 50);
      const ppmin = num(values.ppmin, 40);
      const mean = (ppmax + ppmin) / 2;
      if (mean <= 0) {
        return { score: '—', label: 'Invalid PP values', interpretation: 'PP values must be positive.', riskLevel: 'info' };
      }
      const ppv = round(((ppmax - ppmin) / mean) * 100, 1);
      const valid = bool(values.valid);
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'info' | 'high' = 'info';
      if (ppv > 13) {
        label = 'High PPV — suggests fluid responsive';
        interpretation = `PPV ${ppv}% (>13%): favors fluid responsiveness if validity conditions hold.`;
        riskLevel = 'low';
      } else if (ppv >= 9) {
        label = 'Gray-zone PPV';
        interpretation = `PPV ${ppv}%: gray zone (≈9–13%) — consider PLR or mini-fluid challenge.`;
        riskLevel = 'info';
      } else {
        label = 'Low PPV — less likely fluid responsive';
        interpretation = `PPV ${ppv}% (<9–13%): less likely to increase CO with fluids.`;
        riskLevel = 'moderate';
      }
      if (!valid) {
        interpretation +=
          ' WARNING: validity conditions not met (spontaneous breathing, low TV, arrhythmias, open chest, etc.) — PPV unreliable.';
        riskLevel = 'high';
        label += ' (invalid conditions)';
      }
      return {
        score: ppv,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Formula', value: '(PPmax − PPmin) / [(PPmax+PPmin)/2] × 100' },
          { label: 'Threshold', value: 'Typically >12–13%' },
        ],
      };
    },
    evidence: {
      summary: 'PPV predicts fluid responsiveness on volume-controlled ventilation with adequate tidal volume and no spontaneous efforts.',
      formula: 'PPV% = (PPmax − PPmin) / mean PP × 100',
      validation: 'Well validated under strict conditions; many ICU patients fall outside validity criteria.',
      references: [
        {
          title: 'Relation between respiratory changes in arterial pulse pressure and fluid responsiveness in septic patients with acute circulatory failure',
          citation: 'Michard F et al. Am J Respir Crit Care Med. 2000;162:134-138',
          year: 2000,
          pmid: '10903232',
          doi: '10.1164/ajrccm.162.1.9903035',
        },
      ],
    },
    nextSteps: [
      { condition: 'High valid PPV + hypoperfusion', actions: ['Fluid challenge', 'Reassess PPV after each bolus'] },
    ],
  },

  // 21. Cerebral perfusion pressure
  {
    id: 'cerebral-perfusion',
    name: 'Cerebral Perfusion Pressure (CPP)',
    shortName: 'CPP',
    description: 'CPP = MAP − ICP (or CVP if higher than ICP).',
    category: 'critical-care',
    tags: ['cpp', 'icp', 'neurocritical', 'map'],
    whenToUse: 'Neurocritical care when ICP (or surrogate) and MAP are available.',
    whyUse: 'Estimates net pressure driving cerebral blood flow; common targets 60–70 mmHg.',
    inputs: [
      numberInput('map', 'MAP', {
        unit: 'mmHg',
        min: 30,
        max: 200,
        defaultValue: 80,
        helpText: 'Mean arterial pressure (not SBP). Level the arterial transducer at the same reference as ICP.',
      }),
      numberInput('icp', 'ICP', {
        unit: 'mmHg',
        min: 0,
        max: 80,
        defaultValue: 15,
        helpText: 'Intracranial pressure from EVD or bolt. Common CPP target ≥60 mmHg (individualize).',
      }),
      numberInput('cvp', 'CVP (optional; used if > ICP)', {
        unit: 'mmHg',
        min: 0,
        max: 40,
        defaultValue: 0,
        required: false,
        helpText: 'If entered and higher than ICP, used as the downstream pressure (CPP = MAP − max(ICP, CVP)). Leave blank if unknown.',
      }),
    ],
    calculate(values) {
      const map = num(values.map, 80);
      const icp = num(values.icp, 15);
      const cvpMissing = isMissingValue(values.cvp, true);
      const cvp = cvpMissing ? 0 : num(values.cvp, 0);
      const downstream = Math.max(icp, cvp);
      const cpp = round(map - downstream, 0);
      const r = riskFromThresholds(cpp, [
        {
          max: 49,
          level: 'critical',
          label: 'CPP critically low',
          interpretation: `CPP ${cpp} mmHg: critically low — high risk of ischemia. Raise MAP and/or lower ICP urgently.`,
        },
        {
          max: 59,
          level: 'high',
          label: 'CPP below common target',
          interpretation: `CPP ${cpp} mmHg: below common ≥60 mmHg target (individualize per protocol / PbtO₂).`,
        },
        {
          max: 80,
          level: 'normal',
          label: 'CPP in common target band',
          interpretation: `CPP ${cpp} mmHg: within commonly targeted range (~60–70+); avoid excessive hypertension.`,
        },
        {
          max: 200,
          level: 'moderate',
          label: 'High CPP',
          interpretation: `CPP ${cpp} mmHg: high — ensure ICP reading valid; avoid over-vasopressors if not needed.`,
        },
      ]);
      const interpretation = cvpMissing
        ? `${r.interpretation} CVP was not entered — CPP computed from ICP alone.`
        : r.interpretation;
      return {
        score: cpp,
        unit: 'mmHg',
        label: r.label,
        interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'MAP', value: `${map} mmHg` },
          {
            label: 'Downstream pressure',
            value: cvpMissing
              ? `${downstream} mmHg (ICP ${icp} — CVP not entered)`
              : `${downstream} mmHg (max of ICP ${icp}, CVP ${cvp})`,
          },
          { label: 'Formula', value: cvpMissing ? 'CPP = MAP − ICP (CVP not entered)' : 'CPP = MAP − max(ICP, CVP)' },
        ],
      };
    },
    evidence: {
      summary: 'CPP = MAP − ICP is the standard neurocritical estimate of cerebral perfusion driving pressure.',
      formula: 'CPP = MAP − ICP (use CVP if CVP > ICP)',
      validation: 'BTF and neuroICU protocols commonly target CPP ≥60 mmHg with individualized care.',
      references: [
        {
          title: 'Guidelines for the Management of Severe Traumatic Brain Injury, Fourth Edition',
          citation: 'Carney N et al. Neurosurgery. 2017;80:6-15',
          year: 2017,
          pmid: '27654000',
          doi: '10.1227/NEU.0000000000001432',
          url: 'https://braintrauma.org/coma/guidelines',
        },
      ],
    },
    nextSteps: [
      { condition: 'CPP <60', actions: ['Treat raised ICP', 'Optimize MAP with fluids/vasopressors per protocol', 'Ensure transducer leveling'] },
    ],
  },

  // 22. Oxygen delivery
  {
    id: 'oxygen-delivery',
    name: 'Oxygen Delivery (DO₂)',
    shortName: 'DO₂',
    description: 'Systemic oxygen delivery: DO₂ = CO × CaO₂ × 10; CaO₂ from Hb, SaO₂, PaO₂.',
    category: 'critical-care',
    tags: ['do2', 'oxygen', 'cardiac output', 'shock', 'icu'],
    whenToUse: 'Shock / high-risk perioperative care when CO and ABG/oximetry available.',
    whyUse: 'Quantifies bulk O₂ transport; low DO₂ may contribute to tissue hypoxia.',
    inputs: [
      numberInput('co', 'Cardiac output', { unit: 'L/min', min: 0.5, max: 20, step: 0.1, defaultValue: 5.0 }),
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, defaultValue: 10 }),
      numberInput('sao2', 'SaO₂ (or SpO₂)', { unit: '%', min: 40, max: 100, defaultValue: 98 }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 90 }),
    ],
    calculate(values) {
      const co = num(values.co, 5);
      const hb = num(values.hb, 10);
      const sao2Frac = num(values.sao2, 98) / 100;
      const pao2 = num(values.pao2, 90);
      const cao2 = round(1.34 * hb * sao2Frac + 0.003 * pao2, 2);
      const do2 = round(co * cao2 * 10, 0);
      // Normal DO2 ~900–1100 mL/min; DO2I ~500–600 mL/min/m²
      const r = riskFromThresholds(do2, [
        {
          max: 399,
          level: 'critical',
          label: 'Very low DO₂',
          interpretation: `DO₂ ${do2} mL/min with CaO₂ ${cao2} mL O₂/dL — critically reduced oxygen delivery. Address CO, Hb, and saturation.`,
        },
        {
          max: 599,
          level: 'high',
          label: 'Low DO₂',
          interpretation: `DO₂ ${do2} mL/min — below typical resting adult values (~800–1200). Optimize shock bundle elements.`,
        },
        {
          max: 1200,
          level: 'normal',
          label: 'DO₂ in typical range',
          interpretation: `DO₂ ${do2} mL/min (CaO₂ ${cao2} mL/dL) — roughly typical for resting adults; still correlate with VO₂ and lactate.`,
        },
        {
          max: 5000,
          level: 'info',
          label: 'High DO₂',
          interpretation: `DO₂ ${do2} mL/min — high delivery (high CO or Hb). Supranormal targeting not routinely beneficial.`,
        },
      ]);
      return {
        score: do2,
        unit: 'mL O₂/min',
        ...r,
        details: [
          { label: 'CaO₂', value: `${cao2} mL O₂/dL` },
          { label: 'CO', value: `${co} L/min` },
          { label: 'Formula', value: 'DO₂ = CO × CaO₂ × 10; CaO₂ = (1.34×Hb×SaO₂)+(0.003×PaO₂)' },
        ],
      };
    },
    evidence: {
      summary: 'DO₂ is the product of cardiac output and arterial oxygen content.',
      formula: 'CaO₂ = (1.34 × Hb × SaO₂) + (0.003 × PaO₂); DO₂ = CO × CaO₂ × 10',
      validation: 'Core physiology; absolute targets less useful than trends and clinical perfusion markers.',
      references: [
        {
          title: 'Oxygen transport-1. Basic principles',
          citation: 'Treacher DF, Leach RM. BMJ. 1998;317:1302-1306',
          year: 1998,
          pmid: '9804723',
          doi: '10.1136/bmj.317.7168.1302',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low DO₂ + shock', actions: ['Restore CO (fluids/inotropes as indicated)', 'Correct hypoxemia', 'Consider transfusion only per restrictive thresholds'] },
    ],
    pearls: [
      'Dissolved O₂ (0.003×PaO₂) is usually tiny unless hyperbaric / extreme PaO₂.',
      'Index to BSA (DO₂I) when comparing across body sizes.',
    ],
  },
];
