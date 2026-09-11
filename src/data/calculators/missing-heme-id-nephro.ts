import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const missingHemeIdNephroCalcs: Calculator[] = [
  {
    id: 'kdigo-aki',
    name: 'KDIGO AKI Staging',
    shortName: 'KDIGO AKI',
    description: 'Stages acute kidney injury by creatinine and/or urine output criteria (KDIGO 2012).',
    category: 'nephrology',
    tags: ['aki', 'kdigo', 'creatinine', 'urine output'],
    whenToUse: 'Hospitalized patients with rising creatinine and/or oliguria to stage AKI severity.',
    whyUse: 'Standard international staging that guides monitoring intensity, nephrotoxin avoidance, and RRT planning.',
    inputs: [
      selectInput('crStage', 'Creatinine criterion (highest applicable)', [
        { label: 'None / no Cr criteria met (0)', value: 0 },
        { label: 'Stage 1: ↑Cr ≥0.3 mg/dL in 48h or 1.5–1.9× baseline (1)', value: 1 },
        { label: 'Stage 2: Cr 2.0–2.9× baseline (2)', value: 2 },
        { label: 'Stage 3: Cr ≥3× baseline, Cr ≥4.0 mg/dL, or RRT (3)', value: 3 },
      ]),
      selectInput('uopStage', 'Urine output criterion (highest applicable)', [
        { label: 'None / UOP criteria not met (0)', value: 0 },
        { label: 'Stage 1: <0.5 mL/kg/h for 6–12 h (1)', value: 1 },
        { label: 'Stage 2: <0.5 mL/kg/h for ≥12 h (2)', value: 2 },
        { label: 'Stage 3: <0.3 mL/kg/h ≥24 h or anuria ≥12 h (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const cr = num(values.crStage, 0);
      const uop = num(values.uopStage, 0);
      const stage = Math.max(cr, uop);
      const r = riskFromThresholds(stage, [
        {
          max: 0,
          level: 'normal',
          label: 'No AKI by selected criteria',
          interpretation: 'Neither creatinine nor UOP criteria selected. Clinical AKI may still exist if data incomplete.',
        },
        {
          max: 1,
          level: 'moderate',
          label: 'KDIGO Stage 1',
          interpretation: 'Mild AKI. Review volume status, hold nephrotoxins/ACEi/ARB/NSAIDs as appropriate, monitor Cr and UOP closely.',
        },
        {
          max: 2,
          level: 'high',
          label: 'KDIGO Stage 2',
          interpretation: 'Moderate AKI. Escalate monitoring, avoid further injury, evaluate obstruction and intrinsic causes.',
        },
        {
          max: 3,
          level: 'critical',
          label: 'KDIGO Stage 3',
          interpretation: 'Severe AKI. Assess indications for RRT (acidosis, hyperK, volume overload, uremia); nephrology involvement recommended.',
        },
      ]);
      return {
        score: stage,
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Cr-based stage', value: String(cr) },
          { label: 'UOP-based stage', value: String(uop) },
          { label: 'Final stage', value: `Max(Cr, UOP) = ${stage}` },
        ],
      };
    },
    evidence: {
      summary: 'KDIGO defines AKI and stages 1–3 using the worse of creatinine or urine-output criteria.',
      formula: 'Stage = max(creatinine stage, UOP stage); Stage 3 also if RRT initiated',
      validation: 'International consensus; widely used in research and clinical pathways.',
      references: [
        { title: 'KDIGO Clinical Practice Guideline for Acute Kidney Injury', citation: 'Kidney Int Suppl. 2012 (KDIGO AKI)', year: 2012, pmid: '22890468',
          doi: '10.1159/000339789', url: 'https://kdigo.org/guidelines/acute-kidney-injury/' },
      ],
    },
    nextSteps: [
      { condition: 'Any AKI', actions: ['Stop nephrotoxins when possible', 'Optimize hemodynamics', 'Bladder scan / post-void residual if obstruction possible', 'Serial Cr, electrolytes, fluid balance'] },
      { condition: 'Stage 3', actions: ['Nephrology consult', 'Evaluate RRT indications', 'Nutrition and dosing adjustments'] },
    ],
    pearls: [
      'Baseline Cr should reflect a recent steady-state value; missing baseline complicates staging.',
      'UOP criteria require accurate weight-based hourly measurement.',
    ],
  },
  {
    id: 'schwartz-gfr',
    name: 'Bedside Schwartz Pediatric eGFR',
    shortName: 'Schwartz eGFR',
    description: 'Estimates GFR in children using the bedside Schwartz equation (IDMS creatinine).',
    category: 'pediatrics',
    tags: ['gfr', 'pediatric', 'schwartz', 'ckd'],
    whenToUse: 'Children ~1–16 years for CKD staging, drug dosing context, or renal function estimates.',
    whyUse: 'Preferred simple bedside pediatric eGFR with IDMS-traceable creatinine.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 40, max: 200, defaultValue: 120 }),
      numberInput('scr', 'Serum creatinine (IDMS)', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.01, defaultValue: 0.5 }),
    ],
    calculate(values) {
      const height = num(values.height, 120);
      const scr = num(values.scr, 0.5);
      if (scr <= 0) {
        return {
          score: '—',
          label: 'Invalid input',
          interpretation: 'Serum creatinine must be > 0.',
          riskLevel: 'info',
        };
      }
      const egfr = round((0.413 * height) / scr, 0);
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
        unit: 'mL/min/1.73m²',
        label: `Pediatric eGFR (~CKD ${stage})`,
        interpretation: `Bedside Schwartz eGFR ${egfr}. Stage ${stage} is approximate; albuminuria and clinical context needed for full staging. Not validated the same way in neonates or adults.`,
        riskLevel,
        details: [{ label: 'Formula', value: '0.413 × height(cm) / SCr' }],
      };
    },
    evidence: {
      summary: 'Bedside Schwartz (2009) uses k = 0.413 with IDMS creatinine for children.',
      formula: 'eGFR = 0.413 × height (cm) / SCr (mg/dL)',
      validation: 'Derived from CKiD cohort; improved accuracy vs original Schwartz with modern assays.',
      references: [
        { title: 'New equations to estimate GFR in children with CKD', citation: 'Schwartz GJ et al. J Am Soc Nephrol. 2009', year: 2009, pmid: '19158356',
          doi: '10.1681/ASN.2008030287', },
      ],
    },
    nextSteps: [
      { condition: 'eGFR <60', actions: ['Confirm chronicity', 'Urine protein/ACR', 'BP assessment', 'Pediatric nephrology if progressive or low eGFR'] },
    ],
    pearls: ['Use IDMS-traceable creatinine only with k = 0.413.', 'Original Schwartz k values differ by age/sex and assay era.'],
  },
  {
    id: 'plasmic',
    name: 'PLASMIC Score (TTP / ADAMTS13)',
    shortName: 'PLASMIC',
    description: 'Predicts probability of severe ADAMTS13 deficiency (<10%) in suspected TTP.',
    category: 'hematology',
    tags: ['ttp', 'adamts13', 'tma', 'plasmic'],
    whenToUse: 'Thrombotic microangiopathy when deciding urgency of plasma exchange pending ADAMTS13 activity.',
    whyUse: 'High scores support early caplacizumab/PEX pathway while low scores argue against severe TTP.',
    inputs: [
      yesNo('plt', 'Platelet count < 30 × 10⁹/L', 1),
      yesNo('hemolysis', 'Hemolysis evidence (indirect bili >2 mg/dL, retic >2.5%, or undetectable haptoglobin)', 1),
      yesNo('noCancer', 'No active cancer', 1),
      yesNo('noTransplant', 'No solid-organ or stem-cell transplant', 1),
      yesNo('mcv', 'MCV < 90 fL', 1),
      yesNo('inr', 'INR < 1.5', 1),
      yesNo('cr', 'Creatinine < 2.0 mg/dL', 1),
    ],
    calculate(values) {
      const keys = ['plt', 'hemolysis', 'noCancer', 'noTransplant', 'mcv', 'inr', 'cr'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low probability (0–4)',
          interpretation: 'Low likelihood of severe ADAMTS13 deficiency. Consider alternative TMA causes; still send ADAMTS13 if clinical concern.',
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate (5)',
          interpretation: 'Intermediate probability. Urgent hematology input; often treat as possible TTP until ADAMTS13 results if presentation fits.',
        },
        {
          max: 7,
          level: 'high',
          label: 'High probability (6–7)',
          interpretation: 'High likelihood of severe ADAMTS13 deficiency. Prioritize urgent plasma exchange / TTP pathway while awaiting activity assay.',
        },
      ]);
      return { score, ...r, details: [{ label: 'Range', value: '0–7' }] };
    },
    evidence: {
      summary: 'PLASMIC points for thrombocytopenia, hemolysis, absence of cancer/transplant, low MCV, near-normal INR, and Cr <2.',
      formula: 'Sum of 7 binary items (0–7)',
      validation: 'Validated to predict ADAMTS13 <10% in TMA cohorts; high NPV for low scores.',
      references: [
        { title: 'Derivation and external validation of the PLASMIC score for rapid assessment of TTP', citation: 'Bendapudi PK et al. Lancet Haematol. 2017', year: 2017, pmid: '28259520',
          doi: '10.1016/S2352-3026(17)30026-1', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5 or strong clinical TTP', actions: ['Urgent hematology', 'ADAMTS13 activity before PEX if possible without delay', 'Consider PEX + immunosuppression pathway'] },
      { condition: 'Score ≤4', actions: ['Broaden TMA differential (aHUS, DIC, malignant HTN, drugs)', 'Still obtain ADAMTS13 if uncertain'] },
    ],
    pearls: ['Score does not replace clinical judgment or ADAMTS13 assay.', 'Do not delay life-saving PEX when TTP is highly suspected.'],
  },
  {
    id: 'isth-dic',
    name: 'ISTH Overt DIC Score',
    shortName: 'ISTH DIC',
    description: 'International Society on Thrombosis and Haemostasis scoring for overt disseminated intravascular coagulation.',
    category: 'hematology',
    tags: ['dic', 'coagulopathy', 'isth'],
    whenToUse: 'Patients with an underlying DIC-associated condition and abnormal coagulation tests.',
    whyUse: 'Standardized criteria for overt DIC diagnosis and serial monitoring.',
    inputs: [
      selectInput('platelets', 'Platelet count (×10⁹/L)', [
        { label: '> 100 (0)', value: 0 },
        { label: '50–100 (1)', value: 1 },
        { label: '< 50 (2)', value: 2 },
      ]),
      selectInput('fibrin', 'Elevated fibrin marker (D-dimer / FDP)', [
        { label: 'No increase (0)', value: 0, description: 'Within reference (this laboratory’s ULN)' },
        { label: 'Moderate increase (2)', value: 2, description: '≈ >3× ULN (or ~0.4–4 µg/mL FEU in older cohorts)' },
        { label: 'Strong increase (3)', value: 3, description: '≈ >7× ULN (or >4 µg/mL FEU)' },
      ], undefined, 'Bins depend on this laboratory’s D-dimer/FDP ULN (ISTH SSC 2025 ≈3× / ≈7× ULN; older FEU cutoffs ~0.4–4 vs >4 µg/mL)'),
      selectInput('pt', 'Prolonged PT', [
        { label: '< 3 seconds prolonged (0)', value: 0 },
        { label: '3–6 seconds prolonged (1)', value: 1 },
        { label: '> 6 seconds prolonged (2)', value: 2 },
      ], undefined, 'Seconds above laboratory mean normal PT (not INR)'),
      selectInput('fibrinogen', 'Fibrinogen', [
        { label: '≥ 1.0 g/L (0)', value: 0 },
        { label: '< 1.0 g/L (1)', value: 1 },
      ], undefined, '1.0 g/L = 100 mg/dL'),
    ],
    calculate(values) {
      const score =
        num(values.platelets) + num(values.fibrin) + num(values.pt) + num(values.fibrinogen);
      if (score >= 5) {
        return {
          score,
          label: 'Compatible with overt DIC',
          interpretation: 'Score ≥5 is compatible with overt DIC if an underlying predisposing condition is present. Treat cause; support with products as indicated; repeat scoring.',
          riskLevel: 'high',
          details: [{ label: 'Threshold', value: '≥5 overt DIC' }],
        };
      }
      return {
        score,
        label: 'Not overt DIC by ISTH',
        interpretation: 'Score <5 does not meet overt DIC criteria. May still represent non-overt DIC or evolving coagulopathy — repeat labs if clinically indicated.',
        riskLevel: score >= 3 ? 'moderate' : 'low',
        details: [{ label: 'Threshold', value: '≥5 overt DIC' }],
      };
    },
    evidence: {
      summary: 'ISTH overt DIC: platelets + fibrin markers + PT prolongation + fibrinogen (max 8).',
      formula: 'Platelets (0–2) + fibrin (0/2/3) + PT (0–2) + fibrinogen (0–1); ≥5 = overt DIC',
      validation: 'Widely adopted consensus algorithm; requires a known associated condition.',
      references: [
        { title: 'Towards definition, clinical and laboratory criteria, and a scoring system for DIC', citation: 'Taylor FB et al. Thromb Haemost. 2001', year: 2001, pmid: '11816725' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['Treat underlying driver (sepsis, trauma, malignancy, obstetric)', 'Supportive transfusion guided by bleeding/procedure', 'Serial ISTH scores'] },
      { condition: 'Score <5 with concern', actions: ['Repeat coagulation panel', 'Consider non-overt DIC pathway'] },
    ],
  },
  {
    id: 'khorana',
    name: 'Khorana Score (Cancer-Associated VTE)',
    shortName: 'Khorana',
    description: 'Estimates VTE risk in ambulatory cancer patients starting chemotherapy.',
    category: 'oncology',
    tags: ['vte', 'cancer', 'khorana', 'thrombosis'],
    whenToUse: 'Ambulatory solid tumor / lymphoma patients before or during systemic therapy for prophylaxis decisions.',
    whyUse: 'Identifies higher-risk oncology outpatients who may benefit from thromboprophylaxis discussion.',
    inputs: [
      selectInput('site', 'Primary tumor site risk', [
        { label: 'Very high risk: stomach or pancreas (2)', value: 2 },
        { label: 'High risk: lung, lymphoma, gynecologic, bladder, testicular (1)', value: 1 },
        { label: 'Other sites (0)', value: 0 },
      ]),
      yesNo('plt', 'Pre-chemo platelet count ≥ 350 × 10⁹/L', 1),
      yesNo('hb', 'Hemoglobin < 10 g/dL and/or using ESA', 1),
      yesNo('wbc', 'Pre-chemo leukocyte count > 11 × 10⁹/L', 1),
      yesNo('bmi', 'BMI ≥ 35 kg/m²', 1),
    ],
    calculate(values) {
      const score =
        num(values.site) +
        (bool(values.plt) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.bmi) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Low risk (0)',
          interpretation: 'Low estimated VTE risk in original model. Routine outpatient pharmacologic prophylaxis generally not indicated solely by score.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Intermediate risk (1–2)',
          interpretation: 'Intermediate risk. Shared decision-making; some guidelines discuss prophylaxis at ≥2 depending on regimen/bleed risk.',
        },
        {
          max: 10,
          level: 'high',
          label: 'High risk (≥3)',
          interpretation: 'High VTE risk. Consider thromboprophylaxis (e.g., DOAC/LMWH) if bleeding risk acceptable per oncology guidance.',
        },
      ]);
      return { score, ...r, details: [{ label: 'Typical high-risk cut-off', value: '≥3 (some use ≥2)' }] };
    },
    evidence: {
      summary: 'Khorana score combines cancer site and pre-chemo CBC/BMI risk factors for ambulatory VTE risk.',
      formula: 'Site (0–2) + Plt≥350 + Hb<10/ESA + WBC>11 + BMI≥35',
      validation: 'Derived and validated in chemotherapy outpatients; absolute rates vary by era and regimens.',
      references: [
        { title: 'Development and validation of a predictive model for chemotherapy-associated thrombosis', citation: 'Khorana AA et al. Blood. 2008', year: 2008, pmid: '18216292',
          doi: '10.1182/blood-2007-10-116327', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['Discuss prophylaxis vs bleed risk', 'Patient education on VTE symptoms', 'Review drug interactions with DOACs'] },
      { condition: 'Any score', actions: ['Encourage mobility', 'Reassess if clinical status changes'] },
    ],
  },
  {
    id: 'mascc',
    name: 'MASCC Risk Index (Febrile Neutropenia)',
    shortName: 'MASCC',
    description: 'Identifies low-risk febrile neutropenia candidates for oral/outpatient therapy pathways.',
    category: 'oncology',
    tags: ['neutropenia', 'fever', 'mascc', 'oncology'],
    whenToUse: 'Adults with fever and neutropenia to risk-stratify complications.',
    whyUse: 'Score ≥21 predicts lower risk of serious medical complications and may support oral/step-down care.',
    inputs: [
      selectInput('burden', 'Burden of illness (symptoms)', [
        { label: 'No or mild symptoms (5)', value: 5 },
        { label: 'Moderate symptoms (3)', value: 3 },
        { label: 'Severe symptoms / moribund (0)', value: 0 },
      ]),
      yesNo('noHypotension', 'No hypotension (SBP > 90 mmHg)', 5),
      yesNo('noCopd', 'No COPD', 4),
      yesNo('solidOrNoFungal', 'Solid tumor OR hematologic malignancy with no prior fungal infection', 4),
      yesNo('noDehydration', 'No dehydration requiring parenteral fluids', 3),
      yesNo('outpatient', 'Outpatient status at fever onset', 3),
      yesNo('age', 'Age < 60 years', 2),
    ],
    calculate(values) {
      const score =
        num(values.burden) +
        (bool(values.noHypotension) ? 5 : 0) +
        (bool(values.noCopd) ? 4 : 0) +
        (bool(values.solidOrNoFungal) ? 4 : 0) +
        (bool(values.noDehydration) ? 3 : 0) +
        (bool(values.outpatient) ? 3 : 0) +
        (bool(values.age) ? 2 : 0);
      if (score >= 21) {
        return {
          score,
          label: 'Low risk (≥21)',
          interpretation: 'MASCC ≥21: lower risk of serious complications. May be candidate for oral antibiotics / outpatient management if social support, access to care, and local protocol allow.',
          riskLevel: 'low',
          details: [{ label: 'Maximum score', value: '26' }],
        };
      }
      return {
        score,
        label: 'High risk (<21)',
        interpretation: 'MASCC <21: higher risk of complications. Inpatient IV broad-spectrum antibiotics and close monitoring recommended.',
        riskLevel: 'high',
        details: [{ label: 'Maximum score', value: '26' }],
      };
    },
    evidence: {
      summary: 'MASCC index weights symptom burden, hypotension, COPD, tumor type/fungal history, dehydration, setting, and age.',
      formula: 'Sum weighted items (max 26); ≥21 = low risk',
      validation: 'Multinational Association for Supportive Care in Cancer validation studies.',
      references: [
        { title: 'The Multinational Association for Supportive Care in Cancer risk index', citation: 'Klastersky J et al. J Clin Oncol. 2000', year: 2000, pmid: '10944139',
          doi: '10.1200/JCO.2000.18.16.3038', },
      ],
    },
    nextSteps: [
      { condition: '≥21 low risk', actions: ['Consider oral regimen per protocol (e.g., cipro + amox-clav if no allergy/local resistance issues)', 'Ensure reliable follow-up within 24h'] },
      { condition: '<21 high risk', actions: ['Admit', 'IV antipseudomonal β-lactam', 'Cultures, source evaluation'] },
    ],
    pearls: ['CISNE score may better identify low-risk solid-tumor outpatients in some settings.', 'Clinical instability overrides a favorable MASCC score.'],
  },
  {
    id: 'mcisaac',
    name: 'McIsaac Score (Modified Centor)',
    shortName: 'McIsaac',
    description: 'Age-adjusted Centor criteria for group A streptococcal pharyngitis probability.',
    category: 'infectious-disease',
    tags: ['pharyngitis', 'strep', 'mcisaac', 'centor'],
    whenToUse: 'Acute pharyngitis to guide RADT/culture and antibiotic stewardship.',
    whyUse: 'Age adjustment improves discrimination versus classic Centor alone, especially at extremes of age.',
    inputs: [
      yesNo('fever', 'Temperature > 38°C or history of fever', 1),
      yesNo('noCough', 'Absence of cough', 1),
      yesNo('tender', 'Tender anterior cervical nodes', 1),
      yesNo('exudate', 'Tonsillar swelling or exudate', 1),
      selectInput('age', 'Age group', [
        { label: '3–14 years (+1)', value: 1 },
        { label: '15–44 years (0)', value: 0 },
        { label: '≥ 45 years (−1)', value: -1 },
      ]),
    ],
    calculate(values) {
      const raw =
        (bool(values.fever) ? 1 : 0) +
        (bool(values.noCough) ? 1 : 0) +
        (bool(values.tender) ? 1 : 0) +
        (bool(values.exudate) ? 1 : 0) +
        num(values.age);
      // McIsaac is often reported as raw total including −1; risk bands use observed range −1 to 5
      const r = riskFromThresholds(raw, [
        {
          max: 0,
          level: 'low',
          label: 'Low risk (≤0)',
          interpretation: 'GAS unlikely. Supportive care; testing/antibiotics generally unnecessary.',
        },
        {
          max: 1,
          level: 'low',
          label: 'Low risk (1)',
          interpretation: 'Low probability of GAS. Usually no antibiotic; optional testing per local practice.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate (2–3)',
          interpretation: 'Intermediate probability. Perform RADT ± culture; treat if positive.',
        },
        {
          max: 5,
          level: 'high',
          label: 'High (4–5)',
          interpretation: 'Higher GAS probability. Test and treat positives; some settings empiric Rx if follow-up limited.',
        },
      ]);
      return {
        score: raw,
        ...r,
        details: [{ label: 'Components', value: 'Fever, no cough, tender nodes, exudate, age (−1 to +1)' }],
      };
    },
    evidence: {
      summary: 'McIsaac modifies Centor with age points to estimate GAS pharyngitis probability in primary care.',
      formula: 'Fever + no cough + tender nodes + exudate + age modifier (−1/0/+1)',
      validation: 'Validated in family practice; used in stewardship guidelines.',
      references: [
        { title: 'The validity of a sore throat score in family practice', citation: 'McIsaac WJ et al. CMAJ. 2000', year: 2000, pmid: '11033707' },
        { title: 'The diagnosis of strep throat in adults in the emergency room', citation: 'Centor RM et al. Med Decis Making. 1981', year: 1981, pmid: '6763125',
          doi: '10.1177/0272989X8100100304', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤1', actions: ['Supportive care', 'Avoid routine antibiotics'] },
      { condition: 'Score ≥2', actions: ['RADT ± backup culture', 'Penicillin/amoxicillin if GAS confirmed (or per allergy)'] },
    ],
  },
  {
    id: 'kawasaki',
    name: 'Classic Kawasaki Disease Criteria',
    shortName: 'Kawasaki',
    description: 'Helper for classic Kawasaki diagnosis: prolonged fever plus ≥4 of 5 mucocutaneous criteria.',
    category: 'pediatrics',
    tags: ['kawasaki', 'vasculitis', 'fever', 'pediatrics'],
    whenToUse: 'Febrile children with possible mucocutaneous lymph node syndrome.',
    whyUse: 'Classic criteria support timely IVIG to reduce coronary artery complications.',
    inputs: [
      yesNo('fever', 'Fever lasting ≥ 5 days (or fever present and KD strongly suspected)', 0),
      yesNo('conjunctivitis', 'Bilateral bulbar conjunctival injection (nonexudative)', 1),
      yesNo('oral', 'Oral mucosal changes (strawberry tongue, red cracked lips, injected pharynx)', 1),
      yesNo('extremity', 'Extremity changes (erythema/edema of hands/feet or periungual peeling)', 1),
      yesNo('rash', 'Polymorphous rash', 1),
      yesNo('nodes', 'Cervical lymphadenopathy (≥1.5 cm, usually unilateral)', 1),
    ],
    calculate(values) {
      const fever = bool(values.fever);
      const criteria =
        (bool(values.conjunctivitis) ? 1 : 0) +
        (bool(values.oral) ? 1 : 0) +
        (bool(values.extremity) ? 1 : 0) +
        (bool(values.rash) ? 1 : 0) +
        (bool(values.nodes) ? 1 : 0);
      if (!fever) {
        return {
          score: `${criteria}/5`,
          label: 'Fever criterion not met',
          interpretation: 'Classic KD requires fever ≥5 days (with rare exceptions). Incomplete KD may still apply — use AHA algorithm with labs/echo.',
          riskLevel: 'info',
          details: [{ label: 'Principal criteria present', value: String(criteria) }],
        };
      }
      if (criteria >= 4) {
        return {
          score: `${criteria}/5`,
          label: 'Meets classic Kawasaki criteria',
          interpretation: 'Fever + ≥4 principal features supports classic KD diagnosis. Treat promptly (IVIG ± aspirin per protocol); obtain echo.',
          riskLevel: 'high',
          details: [{ label: 'Principal criteria', value: `${criteria} of 5` }],
        };
      }
      if (criteria >= 2) {
        return {
          score: `${criteria}/5`,
          label: 'Incomplete KD possible',
          interpretation: 'Fever with 2–3 criteria may represent incomplete KD. Apply AHA incomplete KD pathway (CRP/ESR, supplemental labs, echo).',
          riskLevel: 'moderate',
          details: [{ label: 'Principal criteria', value: `${criteria} of 5` }],
        };
      }
      return {
        score: `${criteria}/5`,
        label: 'Classic criteria not met',
        interpretation: 'Fewer than 2 principal features with fever — classic/incomplete KD less likely but reassess if fever persists and features evolve.',
        riskLevel: 'low',
        details: [{ label: 'Principal criteria', value: `${criteria} of 5` }],
      };
    },
    evidence: {
      summary: 'Classic KD: fever ≥5 days plus ≥4 of 5 principal clinical criteria; incomplete KD uses lab/echo supplements.',
      validation: 'AHA scientific statements guide diagnosis and treatment timing.',
      references: [
        { title: 'Diagnosis, Treatment, and Long-Term Management of Kawasaki Disease', citation: 'McCrindle BW et al. Circulation. 2017', year: 2017, pmid: '28356445',
          doi: '10.1161/CIR.0000000000000484', },
      ],
    },
    nextSteps: [
      { condition: 'Classic KD', actions: ['IVIG 2 g/kg', 'Anti-inflammatory aspirin dosing per protocol', 'Echo for coronary arteries', 'Infectious workup as needed'] },
      { condition: 'Incomplete possible', actions: ['CRP/ESR and supplemental labs', 'Early echo', 'Pediatric ID/cardiology'] },
    ],
    pearls: ['Lymphadenopathy is the least common principal criterion.', 'Do not delay treatment solely for echo if classic criteria are met.'],
  },
  {
    id: 'rochester-criteria',
    name: 'Rochester Criteria (Febrile Infant)',
    shortName: 'Rochester',
    description: 'Low-risk criteria for febrile infants to identify candidates for less intensive workup historically.',
    category: 'pediatrics',
    tags: ['fever', 'infant', 'rochester', 'sbi'],
    whenToUse: 'Well-appearing febrile infants (historically ≤60 days) when applying classic low-risk labs.',
    whyUse: 'Educational/historical low-risk tool; modern practice often prefers PECARN/Step-by-Step/AAP pathways.',
    inputs: [
      yesNo('well', 'Infant appears well (nontoxic)', 1),
      yesNo('previouslyHealthy', 'Previously healthy term infant (no antibiotics, no underlying disease, not prolonged neonatal stay)', 1),
      yesNo('noFocus', 'No ear, soft tissue, bone, or skin infection on exam', 1),
      yesNo('wbcOk', 'WBC 5,000–15,000/mm³', 1),
      yesNo('bandsOk', 'Absolute band count ≤ 1,500/mm³', 1),
      yesNo('uaOk', 'UA ≤ 10 WBC/hpf', 1),
      yesNo('stoolOk', 'If diarrhea: stool ≤ 5 WBC/hpf (or no diarrhea)', 1),
    ],
    calculate(values) {
      const items = ['well', 'previouslyHealthy', 'noFocus', 'wbcOk', 'bandsOk', 'uaOk', 'stoolOk'] as const;
      const met = items.every((k) => bool(values[k]));
      const count = items.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (met) {
        return {
          score: `${count}/7`,
          label: 'Low risk (all Rochester criteria met)',
          interpretation: 'Meets classic Rochester low-risk definition. Historically associated with very low SBI risk. Use current AAP/PECARN guidance; LP decisions are age- and protocol-specific.',
          riskLevel: 'low',
        };
      }
      return {
        score: `${count}/7`,
        label: 'Not low risk',
        interpretation: 'One or more Rochester low-risk items missing. Full evaluation and empiric management per age-based fever pathway indicated.',
        riskLevel: 'high',
        details: [{ label: 'Criteria satisfied', value: `${count} of 7` }],
      };
    },
    evidence: {
      summary: 'Rochester criteria define a low-risk febrile infant using clinical well appearance and limited laboratory thresholds.',
      validation: 'Classic derivation with high NPV for SBI in historical cohorts; superseded/refined by newer algorithms.',
      references: [
        { title: 'Identification of infants unlikely to have serious bacterial infection', citation: 'Dagan R et al. J Pediatr. 1985 / Rochester criteria literature', year: 1985, pmid: '4067741',
          doi: '10.1016/s0022-3476(85)80175-x', },
      ],
    },
    nextSteps: [
      { condition: 'Not low risk', actions: ['Age-based full sepsis workup as indicated', 'Empiric antibiotics when appropriate', 'Admission vs close observation per protocol'] },
      { condition: 'Low risk', actions: ['Confirm modern pathway eligibility (AAP 2021 etc.)', 'Reliable follow-up essential if observation strategy used'] },
    ],
    pearls: ['Not a substitute for current AAP febrile infant guidelines.', 'Ill appearance always high risk regardless of labs.'],
  },
  {
    id: 'improve-bleed',
    name: 'IMPROVE Bleeding Risk Score',
    shortName: 'IMPROVE bleed',
    description:
      'Bleeding risk in acutely ill medical inpatients (Hostler/Decousus). Score ≥7 indicates increased major-bleed risk when considering pharmacologic VTE prophylaxis. Uses published fractional points.',
    category: 'hematology',
    tags: ['bleeding', 'improve', 'prophylaxis', 'vte', 'inpatient'],
    whenToUse: 'Medical inpatients being considered for pharmacologic VTE prophylaxis, typically alongside IMPROVE/IMPROVE-DD or Padua.',
    whyUse: 'Identifies patients in whom the harm of anticoagulants may outweigh VTE benefit. Active gastroduodenal ulcer and recent bleeding dominate the score.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 70, helpText: '<40: 0; 40–84: 1.5; ≥85: 3.5' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 1 },
      ]),
      numberInput('gfr', 'GFR', { unit: 'mL/min/1.73 m²', min: 5, max: 120, defaultValue: 70, helpText: '≥60: 0; 30–59: 1; <30: 2.5' }),
      yesNo('cancer', 'Active cancer (within 6 months)', 2),
      yesNo('rheumatic', 'Rheumatic disease', 2),
      yesNo('cvc', 'Central venous catheter', 2),
      yesNo('icu', 'ICU/CCU admission', 2.5),
      yesNo('liver', 'Hepatic failure (INR >1.5)', 2.5),
      numberInput('plt', 'Platelet count', { unit: '×10⁹/L', min: 5, max: 800, defaultValue: 200, helpText: '<50: +4' }),
      yesNo('recentBleed', 'Bleeding in the 3 months before admission', 4),
      yesNo('ulcer', 'Active gastroduodenal ulcer', 4.5),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const agePts = age >= 85 ? 3.5 : age >= 40 ? 1.5 : 0;
      const gfr = num(values.gfr, 70);
      const gfrPts = gfr < 30 ? 2.5 : gfr < 60 ? 1 : 0;
      const pltPts = num(values.plt, 200) < 50 ? 4 : 0;
      const score =
        agePts +
        (str(values.sex, 'F') === 'M' ? 1 : 0) +
        gfrPts +
        (bool(values.cancer) ? 2 : 0) +
        (bool(values.rheumatic) ? 2 : 0) +
        (bool(values.cvc) ? 2 : 0) +
        (bool(values.icu) ? 2.5 : 0) +
        (bool(values.liver) ? 2.5 : 0) +
        pltPts +
        (bool(values.recentBleed) ? 4 : 0) +
        (bool(values.ulcer) ? 4.5 : 0);
      const rounded = round(score, 1);
      const high = rounded >= 7;
      return {
        score: rounded,
        unit: 'points',
        label: high ? 'Increased bleed risk (≥7)' : 'Not increased bleed risk (<7)',
        interpretation: high
          ? `IMPROVE bleed ${rounded} (≥7): increased risk of major in-hospital bleeding. Avoid pharmacologic VTE prophylaxis when possible; use mechanical methods; correct reversible risks (ulcer, thrombocytopenia, uncontrolled INR).`
          : `IMPROVE bleed ${rounded} (<7): not in the increased-bleeding band. If VTE risk warrants it (e.g., IMPROVE-DD ≥2), pharmacologic prophylaxis is generally acceptable with routine monitoring.`,
        riskLevel: rounded >= 11 ? 'critical' : high ? 'high' : rounded >= 4 ? 'moderate' : 'low',
        details: [
          { label: 'Age points', value: String(agePts) },
          { label: 'GFR points', value: String(gfrPts) },
          { label: 'Platelet <50', value: pltPts ? '+4' : '0' },
          { label: 'Threshold', value: '≥7 increased bleed risk' },
        ],
      };
    },
    evidence: {
      summary:
        'IMPROVE bleed (Decousus et al. Chest 2011): age ≥85 = 3.5, age 40–84 = 1.5, male = 1, GFR 30–59 = 1, GFR <30 = 2.5, liver failure = 2.5, platelets <50 = 4, ICU/CCU = 2.5, CVC = 2, active GU ulcer = 4.5, bleeding in prior 3 months = 4, rheumatic disease = 2, active cancer = 2. Range 0–30.5. ≥7 increased bleed risk.',
      formula: 'Sum of weighted factors (fractional points as published)',
      validation: 'Derived in the IMPROVE registry of medical inpatients; used with VTE risk scores to individualize prophylaxis (ASH 2018/2024 medical-patient guidance).',
      references: [
        {
          title: 'Factors at admission associated with bleeding risk in medical patients: findings from the IMPROVE investigators',
          citation: 'Decousus H et al. Chest. 2011',
          year: 2011,
          pmid: '21239736',
          doi: '10.1378/chest.09-3081',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score <7 and elevated VTE risk', actions: ['Pharmacologic prophylaxis', 'Monitor hemoglobin and signs of bleed'] },
      { condition: 'Score ≥7', actions: ['Prefer mechanical prophylaxis', 'Treat reversible bleed risks', 'If anticoagulation is still required, use the lowest effective intensity and close monitoring'] },
    ],
    pearls: [
      'Fractional points are intentional — do not round the score before applying the ≥7 threshold.',
      'Active ulcer (4.5) or recent bleed (4) plus almost any other factor crosses 7.',
      'Pair with IMPROVE-DD: high VTE + high bleed requires individualized judgment, not automatic anticoagulation.',
    ],
  },

  // ─── 8. Revised Baux ───────────────────────────────────────────────────────
  {
    id: 'gap-gap',
    name: 'Delta Gap / Excess Anion Gap',
    shortName: 'Δ/Δ Gap',
    description: 'Uses excess anion gap added to bicarbonate to detect mixed metabolic acid-base disorders.',
    category: 'nephrology',
    tags: ['anion gap', 'acid-base', 'delta gap', 'metabolic'],
    whenToUse: 'High anion gap metabolic acidosis to screen for coexisting NAGMA or metabolic alkalosis.',
    whyUse: 'Delta-delta (excess AG + HCO₃) reveals mixed disorders missed by AG alone.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('cl', 'Chloride', { unit: 'mEq/L', min: 70, max: 140, defaultValue: 100 }),
      numberInput('hco3', 'Bicarbonate', { unit: 'mEq/L', min: 1, max: 50, defaultValue: 12 }),
      numberInput('albumin', 'Albumin (optional)', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 4.0, required: false }),
      numberInput('normalAg', 'Assumed normal AG', { unit: 'mEq/L', min: 6, max: 16, defaultValue: 12, helpText: 'Lab-specific normal; often 10–12' }),
    ],
    calculate(values) {
      const na = num(values.na, 140);
      const cl = num(values.cl, 100);
      const hco3 = num(values.hco3, 12);
      const albMissing = isMissingValue(values.albumin, true);
      const alb = albMissing ? 4 : num(values.albumin, 4);
      const normalAg = num(values.normalAg, 12);
      const ag = round(na - (cl + hco3), 1);
      const agCorr = round(ag + 2.5 * (4 - alb), 1);
      const excessAg = round(agCorr - normalAg, 1);
      const deltaDelta = round(excessAg + hco3, 1);
      let label = 'Pure HAGMA pattern';
      let interpretation =
        'Δ/Δ roughly mid-range suggests relatively pure high-AG metabolic acidosis (lab cutoffs vary; often ~18–28).';
      let riskLevel: 'info' | 'moderate' | 'high' = 'info';
      if (excessAg <= 0) {
        label = 'No excess anion gap';
        interpretation = albMissing
          ? 'AG not above assumed normal — excess gap analysis for mixed HAGMA not applicable. If low HCO₃, consider NAGMA.'
          : 'Corrected AG not above assumed normal — excess gap analysis for mixed HAGMA not applicable. If low HCO₃, consider NAGMA.';
        riskLevel = 'info';
      } else if (deltaDelta < 18) {
        label = 'Suggests concurrent NAGMA';
        interpretation = `Δ/Δ ${deltaDelta} is low: excess AG does not fully account for the fall in HCO₃ — concurrent normal-AG metabolic acidosis likely (diarrhea, RTA, saline, etc.).`;
        riskLevel = 'moderate';
      } else if (deltaDelta > 28) {
        label = 'Suggests concurrent metabolic alkalosis';
        interpretation = `Δ/Δ ${deltaDelta} is high: HCO₃ higher than expected for the excess AG — concurrent metabolic alkalosis (or pre-existing elevated HCO₃) likely.`;
        riskLevel = 'moderate';
      }
      if (albMissing) {
        interpretation += ' Albumin was not entered — the anion gap used here is uncorrected (albumin correction ≈2.5 mEq/L per 1 g/dL below 4 was not applied).';
      }
      return {
        score: deltaDelta,
        unit: 'mEq/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Anion gap', value: `${ag} mEq/L` },
          albMissing
            ? { label: 'AG (uncorrected — albumin not entered)', value: `${agCorr} mEq/L` }
            : { label: 'Albumin-corrected AG', value: `${agCorr} mEq/L` },
          { label: 'Excess AG (Δ gap)', value: `${excessAg} mEq/L` },
          { label: 'Δ/Δ (excess AG + HCO₃)', value: `${deltaDelta}` },
        ],
      };
    },
    evidence: {
      summary: 'Excess AG = measured/corrected AG − normal AG; Δ/Δ = excess AG + HCO₃ to detect mixed metabolic disorders.',
      formula: 'Δ gap = AG_corr − normal AG; Δ/Δ = Δ gap + HCO₃',
      validation: 'Standard acid-base teaching; absolute cutoffs are approximate and lab-dependent.',
      references: [
        { title: 'Mixed acid-base disturbances and the delta gap', citation: 'Wrenn K. Ann Emerg Med. 1990 / standard nephrology texts', year: 1990, pmid: '2240729',
          doi: '10.1016/s0196-0644(05)82292-9', },
      ],
    },
    nextSteps: [
      { condition: 'Low Δ/Δ', actions: ['Evaluate NAGMA causes', 'Urine anion gap / NH4 if needed'] },
      { condition: 'High Δ/Δ', actions: ['Look for vomiting, diuretics, volume contraction, alkali'] },
      { condition: 'Any HAGMA', actions: ['Lactate, ketones, toxic alcohols, renal function as indicated'] },
    ],
  },
  {
    id: 'sodium-correction-rate',
    name: 'Sodium Change with Infusate (Adrogué-Madias)',
    shortName: 'Na Δ Infusate',
    description: 'Projects change in serum sodium per liter of infusate using the Adrogué-Madias formula.',
    category: 'nephrology',
    tags: ['sodium', 'hyponatremia', 'hypernatremia', 'fluids'],
    whenToUse: 'Planning IV fluid therapy for hypo- or hypernatremia.',
    whyUse: 'Estimates ΔNa per liter to design safer correction rates and reduce ODS risk.',
    inputs: [
      numberInput('serumNa', 'Current serum Na', { unit: 'mEq/L', min: 90, max: 190, defaultValue: 120 }),
      numberInput('infusateNa', 'Infusate Na concentration', {
        unit: 'mEq/L',
        min: 0,
        max: 513,
        defaultValue: 154,
        helpText: 'D5W ≈ 0; 0.45% NaCl ≈ 77; NS ≈ 154; 3% NaCl ≈ 513',
      }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 2, max: 300, defaultValue: 70 }),
      selectInput('tbwFactor', 'TBW fraction', [
        { label: 'Child / young man ≈ 0.6', value: 0.6 },
        { label: 'Young woman / elderly man ≈ 0.5', value: 0.5 },
        { label: 'Elderly woman ≈ 0.45', value: 0.45 },
      ]),
      numberInput('infusateK', 'Infusate K (optional, for Na+K formula)', {
        unit: 'mEq/L',
        min: 0,
        max: 100,
        defaultValue: 0,
        helpText: 'If K in fluid, effective cation = Na_inf + K_inf',
        required: false,
      }),
    ],
    calculate(values) {
      const sNa = num(values.serumNa, 120);
      const iNa = num(values.infusateNa, 154);
      const iK = num(values.infusateK, 0);
      const tbw = num(values.weight, 70) * num(values.tbwFactor, 0.5);
      const infusateCation = iNa + iK;
      const delta = round((infusateCation - sNa) / (tbw + 1), 2);
      const litersFor8 = delta !== 0 ? round(8 / Math.abs(delta), 1) : null;
      return {
        score: delta,
        unit: 'mEq/L per L',
        label: 'Predicted ΔNa per liter infusate',
        interpretation: `Each liter changes serum Na by ~${delta} mEq/L (Adrogué-Madias). For chronic hyponatremia, typical limits are often ≤8–10 mEq/L in 24h (stricter if high ODS risk). Account for ongoing losses, intake, and ADH activity — recheck Na frequently.`,
        riskLevel: 'info',
        details: [
          { label: 'TBW used', value: `${round(tbw, 1)} L` },
          { label: 'Infusate Na (+K)', value: `${infusateCation} mEq/L` },
          {
            label: 'Liters for ~8 mEq/L change',
            value: litersFor8 != null && Number.isFinite(litersFor8) ? `~${litersFor8} L (rough)` : 'N/A',
          },
        ],
      };
    },
    evidence: {
      summary: 'Adrogué-Madias: ΔNa = (infusate Na [+K] − serum Na) / (TBW + 1) per liter infused.',
      formula: 'ΔNa = (Na_inf + K_inf − Na_serum) / (TBW + 1)',
      validation: 'Widely taught clinical estimate; actual change varies with urine output and electrolyte-free water.',
      references: [
        { title: 'Hyponatremia', citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000', year: 2000, pmid: '10824078',
          doi: '10.1056/NEJM200005253422107', },
      ],
    },
    nextSteps: [
      { condition: 'Severe symptomatic hyponatremia', actions: ['3% saline bolus strategy per guidelines', 'ICU-level monitoring'] },
      { condition: 'Any active correction', actions: ['q2–4h Na initially as appropriate', 'Desmopressin rescue plans if overcorrection'] },
    ],
  },
  {
    id: 'ttkg',
    name: 'Transtubular Potassium Gradient (TTKG)',
    shortName: 'TTKG',
    description: 'Estimates potassium secretion driving force in the cortical collecting duct (historical tool).',
    category: 'nephrology',
    tags: ['potassium', 'ttkg', 'hypokalemia', 'hyperkalemia'],
    whenToUse: 'Educational evaluation of renal K handling in hypo/hyperkalemia when urine is concentrated.',
    whyUse: 'Classic teaching aid for mineralocorticoid effect; limited validity with modern understanding of urea and flow.',
    inputs: [
      numberInput('uk', 'Urine potassium', { unit: 'mEq/L', min: 1, max: 200, defaultValue: 30 }),
      numberInput('pk', 'Plasma / serum potassium', { unit: 'mEq/L', min: 1.5, max: 10, step: 0.1, defaultValue: 3.0 }),
      numberInput('uosm', 'Urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1200, defaultValue: 400 }),
      numberInput('posm', 'Plasma osmolality', { unit: 'mOsm/kg', min: 200, max: 400, defaultValue: 290 }),
    ],
    calculate(values) {
      const uk = num(values.uk, 30);
      const pk = num(values.pk, 3);
      const uosm = num(values.uosm, 400);
      const posm = num(values.posm, 290);
      if (pk <= 0 || posm <= 0 || uosm <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Potassium and osmolality values must be positive.',
          riskLevel: 'info',
        };
      }
      const ttkg = round(uk / (uosm / posm) / pk, 1);
      const valid = uosm > posm;
      let interpretation =
        'TTKG interpretation depends on whether hypokalemia or hyperkalemia is present. Tool assumes distal Na delivery and relatively intact ADH action.';
      let label = 'TTKG calculated';
      let riskLevel: 'info' | 'low' | 'moderate' = 'info';
      if (!valid) {
        label = 'Assumptions not met';
        interpretation =
          'Uosm should exceed Posm for traditional TTKG validity. Result may be misleading when urine is not concentrated.';
        riskLevel = 'moderate';
      } else if (pk < 3.5) {
        if (ttkg < 3) {
          label = 'Low TTKG in hypokalemia';
          interpretation =
            'TTKG <3 with hypokalemia suggests appropriate renal K conservation (extrarenal losses or prior depletion). Clinical context required.';
          riskLevel = 'low';
        } else {
          label = 'Inappropriately high TTKG in hypokalemia';
          interpretation =
            'Higher TTKG with hypokalemia suggests renal K wasting (mineralocorticoid excess, diuretics, etc.). Confirm with urine K/Cr and clinical data.';
          riskLevel = 'moderate';
        }
      } else if (pk > 5) {
        if (ttkg > 10) {
          label = 'High TTKG in hyperkalemia';
          interpretation =
            'TTKG >10 with hyperkalemia suggests appropriate distal K secretion (consider non-renal causes / shift / load).';
          riskLevel = 'low';
        } else {
          label = 'Low TTKG in hyperkalemia';
          interpretation =
            'Lower TTKG with hyperkalemia suggests impaired distal K secretion (aldo deficiency/resistance, drugs, low distal flow).';
          riskLevel = 'moderate';
        }
      }
      return {
        score: ttkg,
        label,
        interpretation: `${interpretation} Note: TTKG is largely historical; many experts prefer urine K/Cr and clinical assessment because urea recycling invalidates classic assumptions.`,
        riskLevel,
        details: [
          { label: 'Formula', value: '(UK / (Uosm/Posm)) / PK' },
          { label: 'Uosm > Posm?', value: valid ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'TTKG = (UK/(Uosm/Posm))/PK. Originally used to assess aldosterone effect; validity questioned due to urea.',
      formula: 'TTKG = (U_K ÷ (U_osm/P_osm)) ÷ P_K',
      validation: 'Classic physiologic construct; modern nephrology often discourages clinical reliance.',
      references: [
        { title: 'New clinical approach to evaluate disorders of potassium excretion', citation: 'West ML et al. Miner Electrolyte Metab. 1986', year: 1986, pmid: '3762510' },
        { title: 'Intrarenal urea recycling leads to a higher rate of renal excretion of potassium: an hypothesis with clinical implications', citation: 'Kamel KS, Halperin ML. Curr Opin Nephrol Hypertens. 2011', year: 2011, pmid: '21788894',
          doi: '10.1097/MNH.0b013e328349b8f9' },
      ],
    },
    nextSteps: [
      { condition: 'Any electrolyte disorder', actions: ['Med review (diuretics, RAAS inhibitors, TMP-SMX)', 'Acid-base status', 'Urine K/Cr ratio', 'Consider aldosterone/renin if indicated'] },
    ],
    pearls: ['Do not use TTKG as a sole decision tool.', 'Requires Uosm > Posm and adequate distal Na delivery in classic teaching.'],
  },
  {
    id: 'fe-magnesium',
    name: 'Fractional Excretion of Magnesium (FEMg)',
    shortName: 'FEMg',
    description: 'Distinguishes renal magnesium wasting from extrarenal (GI) losses.',
    category: 'nephrology',
    tags: ['magnesium', 'femg', 'electrolytes'],
    whenToUse: 'Hypomagnesemia workup when deciding renal vs GI losses.',
    whyUse: 'Accounts for protein-bound Mg (~30% bound → ultrafilterable fraction ~0.7).',
    inputs: [
      numberInput('umg', 'Urine magnesium', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 5 }),
      numberInput('pmg', 'Plasma / serum magnesium', { unit: 'mg/dL', min: 0.3, max: 6, step: 0.1, defaultValue: 1.2 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const umg = num(values.umg, 5);
      const pmg = num(values.pmg, 1.2);
      const ucr = num(values.ucr, 100);
      const pcr = num(values.pcr, 1);
      if (pmg <= 0 || ucr <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Plasma Mg and urine creatinine must be > 0.',
          riskLevel: 'info',
        };
      }
      // FEMg (%) = (UMg × PCr) / (0.7 × PMg × UCr) × 100
      const femg = round(((umg * pcr) / (0.7 * pmg * ucr)) * 100, 2);
      let label = 'Indeterminate FEMg';
      let interpretation = 'FEMg 2–4%: indeterminate; integrate meds, diarrhea history, and 24h urine Mg if needed.';
      let riskLevel: 'info' | 'low' | 'moderate' = 'info';
      if (femg < 2) {
        label = 'Low FEMg — extrarenal losses likely';
        interpretation =
          'FEMg <2% with hypomagnesemia suggests appropriate renal conservation (GI losses, poor intake, redistribution).';
        riskLevel = 'low';
      } else if (femg > 4) {
        label = 'High FEMg — renal Mg wasting';
        interpretation =
          'FEMg >4% suggests renal magnesium wasting (diuretics, calcineurin inhibitors, RTA, genetic wasting, recovery phase).';
        riskLevel = 'moderate';
      }
      return {
        score: femg,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Formula', value: '(UMg × PCr) / (0.7 × PMg × UCr) × 100' }],
      };
    },
    evidence: {
      summary: 'FEMg uses 0.7 × plasma Mg as ultrafilterable fraction to assess renal Mg handling.',
      formula: 'FEMg = (U_Mg × P_Cr) / (0.7 × P_Mg × U_Cr) × 100',
      validation: 'Standard nephrology teaching thresholds (~2% and ~4%) are approximate.',
      references: [
        { title: 'Hypomagnesemia', citation: 'Agus ZS. J Am Soc Nephrol. 1999', year: 1999, pmid: '10405219',
          doi: '10.1681/ASN.V1071616', },
      ],
    },
    nextSteps: [
      { condition: 'Renal wasting', actions: ['Review diuretics, alcohol, amphotericin, CNIs', 'Check K and Ca', 'Replete Mg aggressively'] },
      { condition: 'Extrarenal pattern', actions: ['Evaluate diarrhea/malabsorption/PPI use', 'Replete and address intake'] },
    ],
  },
  {
    id: 'sofa-delta',
    name: 'SOFA Delta (Sepsis-3 Organ Dysfunction)',
    shortName: 'ΔSOFA',
    description: 'Computes acute change in total SOFA score; ΔSOFA ≥2 supports Sepsis-3 organ dysfunction with infection.',
    category: 'critical-care',
    tags: ['sepsis', 'sofa', 'sepsis-3', 'organ failure'],
    whenToUse: 'Patients with suspected infection when applying Sepsis-3 clinical criteria.',
    whyUse: 'Sepsis-3 defines organ dysfunction as an acute increase in SOFA ≥2 points attributable to infection.',
    inputs: [
      numberInput('baseline', 'Baseline total SOFA (pre-illness / assumed 0 if unknown)', {
        unit: 'points',
        min: 0,
        max: 24,
        defaultValue: 0,
        helpText: 'If baseline unknown, Sepsis-3 allows assuming baseline SOFA = 0',
        required: false,
      }),
      numberInput('current', 'Current total SOFA', { unit: 'points', min: 0, max: 24, defaultValue: 2 }),
      yesNo('infection', 'Suspected or documented infection', 0),
    ],
    calculate(values) {
      const baselineMissing = isMissingValue(values.baseline, true);
      const baseline = num(values.baseline, 0);
      const current = num(values.current, 2);
      const delta = round(current - baseline, 0);
      const infection = bool(values.infection);
      const details = [
        { label: 'Baseline SOFA', value: baselineMissing ? '0 (assumed)' : String(baseline) },
        { label: 'Current SOFA', value: String(current) },
        { label: 'ΔSOFA', value: String(delta) },
        { label: 'Suspected or documented infection', value: infection ? 'Yes' : 'No' },
      ];
      if (delta >= 2 && infection) {
        return {
          score: delta,
          label: 'Meets Sepsis-3 organ dysfunction (ΔSOFA ≥2)',
          interpretation: `ΔSOFA = ${delta} with suspected infection supports sepsis definition (life-threatening organ dysfunction due to dysregulated host response). Escalate sepsis care bundles as indicated.`,
          riskLevel: 'high' as const,
          details,
        };
      }
      if (delta >= 2 && !infection) {
        return {
          score: delta,
          label: 'Organ dysfunction without infection flag',
          interpretation: `ΔSOFA = ${delta} indicates acute organ dysfunction, but infection not marked — does not fulfill sepsis definition on this form.`,
          riskLevel: 'moderate' as const,
          details,
        };
      }
      return {
        score: delta,
        label: 'ΔSOFA < 2',
        interpretation: infection
          ? `ΔSOFA = ${delta} with infection suspected. Does not meet Sepsis-3 ΔSOFA ≥2 threshold — continue monitoring; use clinical judgment, lactate, and serial exams.`
          : `ΔSOFA = ${delta}. Does not meet Sepsis-3 ΔSOFA ≥2 threshold. Infection not marked — use clinical judgment, lactate, and serial exams.`,
        riskLevel: 'low' as const,
        details,
      };
    },
    evidence: {
      summary: 'Sepsis-3: sepsis = infection + acute SOFA increase ≥2. Baseline may be assumed 0 if unknown.',
      formula: 'ΔSOFA = SOFA_current − SOFA_baseline',
      validation: 'Consensus definition (Sepsis-3) with large EHR validation cohorts.',
      references: [
        { title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)', citation: 'Singer M et al. JAMA. 2016', year: 2016, pmid: '26903338',
          doi: '10.1001/jama.2016.0287', },
      ],
    },
    nextSteps: [
      { condition: 'ΔSOFA ≥2 + infection', actions: ['Sepsis pathway / hour-1 bundle elements', 'Cultures before abx if no delay', 'Source control', 'Hemodynamic resuscitation'] },
    ],
  },
  {
    id: 'pediatric-ews',
    name: 'Pediatric Early Warning Score (PEWS, simplified)',
    shortName: 'PEWS',
    description: 'Simplified pediatric early warning score using behavior, cardiovascular, and respiratory domains.',
    category: 'pediatrics',
    tags: ['pews', 'early warning', 'pediatrics', 'deterioration'],
    whenToUse: 'Hospitalized children for track-and-trigger monitoring of clinical deterioration.',
    whyUse: 'Standardized bedside escalation tool; exact tables vary by institution — this is an educational simplification.',
    inputs: [
      selectInput('behavior', 'Behavior', [
        { label: 'Playing / appropriate (0)', value: 0 },
        { label: 'Sleeping (1)', value: 1 },
        { label: 'Irritable (2)', value: 2 },
        { label: 'Lethargic / confused or reduced pain response (3)', value: 3 },
      ]),
      selectInput('cv', 'Cardiovascular', [
        { label: 'Pink or CRT 1–2 s (0)', value: 0 },
        { label: 'Pale or CRT 3 s (1)', value: 1 },
        { label: 'Grey or CRT 4 s or tachycardia +20 from normal (2)', value: 2 },
        { label: 'Grey/mottled, CRT ≥5 s, +30 HR, or bradycardia (3)', value: 3 },
      ]),
      selectInput('resp', 'Respiratory', [
        { label: 'RR normal, no recession (0)', value: 0 },
        { label: 'RR >10 above normal, accessory muscles, or FiO₂ ~30% (1)', value: 1 },
        { label: 'RR >20 above normal, recession, or FiO₂ ~40% (2)', value: 2 },
        { label: 'RR ≥5 below normal with distress/grunting or FiO₂ ≥50% (3)', value: 3 },
      ]),
      yesNo('oxygen', 'Receiving any supplemental oxygen (+2 in many PEWS variants)', 2),
    ],
    calculate(values) {
      const score =
        num(values.behavior) + num(values.cv) + num(values.resp) + (bool(values.oxygen) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low (0–2)',
          interpretation: 'Continue routine observations per local policy. Recheck sooner if parental or nursing concern.',
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Medium (3–4)',
          interpretation: 'Increased observation frequency; prompt medical review. Single domain score of 3 also warrants urgent assessment in many systems.',
        },
        {
          max: 20,
          level: 'high',
          label: 'High (≥5)',
          interpretation: 'Urgent senior/pediatric review; consider continuous monitoring and escalation to higher acuity care.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Behavior', value: String(num(values.behavior)) },
          { label: 'Cardiovascular', value: String(num(values.cv)) },
          { label: 'Respiratory', value: String(num(values.resp)) },
          { label: 'Oxygen bonus', value: bool(values.oxygen) ? '2' : '0' },
        ],
      };
    },
    evidence: {
      summary: 'PEWS systems (e.g., Monaghan/Brighton-style) score behavior, CV, and respiratory status; institutional cutoffs differ.',
      formula: 'Behavior (0–3) + CV (0–3) + Resp (0–3) + O₂ (0 or 2)',
      validation: 'Multiple PEWS variants associate higher scores with ICU transfer; not a substitute for clinical concern.',
      references: [
        { title: 'Pediatric early warning systems literature', citation: 'Monaghan A. Paediatr Nurs. 2005 / subsequent PEWS validations', year: 2005, pmid: '28699997',
          doi: '10.1590/1518-8345.1733.2912', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5 or any domain 3', actions: ['Urgent clinician review', 'Increase monitoring', 'Prepare for escalation'] },
      { condition: 'Score 3–4', actions: ['Medical review', 'Repeat observations sooner'] },
    ],
    pearls: ['Caregiver concern is an independent escalation trigger in many hospitals.', 'Use local PEWS chart when available — thresholds are institution-specific.'],
  },
  {
    id: 'hemorr2hages',
    name: 'HEMORR₂HAGES Bleeding Risk Score',
    shortName: 'HEMORR2HAGES',
    description: 'Estimates major bleeding risk in anticoagulated patients (originally AF cohorts).',
    category: 'hematology',
    tags: ['bleeding', 'anticoagulation', 'afib', 'hemorr2hages'],
    whenToUse: 'Patients on or considered for anticoagulation when quantifying bleeding risk factors.',
    whyUse: 'Includes prior bleed double-weighting and geriatric/comorbidity factors; highlights modifiable risks.',
    inputs: [
      yesNo('hepaticRenal', 'Hepatic or renal disease', 1),
      yesNo('etoh', 'Ethanol abuse', 1),
      yesNo('malignancy', 'Malignancy', 1),
      yesNo('older', 'Older age (> 75 years)', 1),
      yesNo('reducedPlt', 'Reduced platelet count or function (including aspirin)', 1),
      yesNo('rebleeding', 'Rebleeding — prior major bleed (2 points)', 2),
      yesNo('htn', 'Hypertension (uncontrolled)', 1),
      yesNo('anemia', 'Anemia', 1),
      yesNo('genetic', 'Genetic factors (e.g., CYP2C9 variant) if known', 1),
      yesNo('falls', 'Excessive fall risk', 1),
      yesNo('stroke', 'Stroke history', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.hepaticRenal) ? 1 : 0) +
        (bool(values.etoh) ? 1 : 0) +
        (bool(values.malignancy) ? 1 : 0) +
        (bool(values.older) ? 1 : 0) +
        (bool(values.reducedPlt) ? 1 : 0) +
        (bool(values.rebleeding) ? 2 : 0) +
        (bool(values.htn) ? 1 : 0) +
        (bool(values.anemia) ? 1 : 0) +
        (bool(values.genetic) ? 1 : 0) +
        (bool(values.falls) ? 1 : 0) +
        (bool(values.stroke) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low bleeding risk (0–1)',
          interpretation: 'Lower major bleeding rates in original cohorts. Still counsel on bleeding precautions and modifiable factors.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate (2–3)',
          interpretation: 'Intermediate bleeding risk. Address hypertension, alcohol, antiplatelets, falls, and anemia when possible.',
        },
        {
          max: 20,
          level: 'high',
          label: 'High (≥4)',
          interpretation: 'Higher major bleeding risk. Optimize modifiable factors; high bleed risk alone should not automatically withhold indicated anticoagulation for high stroke risk.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Prior bleed weighting', value: 'Rebleeding = 2 points' }],
      };
    },
    evidence: {
      summary: 'HEMORR₂HAGES: Hepatic/renal, EtOH, Malignancy, Older, Reduced platelets, Rebleeding×2, HTN, Anemia, Genetic, Excessive falls, Stroke.',
      formula: 'Sum of items with prior bleed counting twice (typical max 12)',
      validation: 'Derived in National Registry of Atrial Fibrillation; compared with other bleed scores.',
      references: [
        { title: 'Clinical classification schemes for predicting hemorrhage', citation: 'Gage BF et al. Am Heart J. 2006', year: 2006, pmid: '16504638',
          doi: '10.1016/j.ahj.2005.04.017', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Modify BP, alcohol, unnecessary antiplatelets', 'Fall-risk mitigation', 'Consider DOAC and closer follow-up'] },
      { condition: 'Any score', actions: ['Balance against stroke risk (e.g., CHA₂DS₂-VASc)', 'Patient-centered shared decision'] },
    ],
  },
  {
    id: 'orbit-af',
    name: 'ORBIT Bleeding Risk Score (AF)',
    shortName: 'ORBIT',
    description: 'Predicts major bleeding in patients with atrial fibrillation on anticoagulation.',
    category: 'cardiology',
    tags: ['bleeding', 'afib', 'orbit', 'anticoagulation'],
    whenToUse: 'AF patients on oral anticoagulation for major bleeding risk estimation.',
    whyUse: 'Simple five-factor score with good calibration in ORBIT-AF; emphasizes anemia and prior bleed.',
    inputs: [
      yesNo('older', 'Older age (≥ 75 years) — 1 point', 1),
      yesNo('anemia', 'Reduced hemoglobin / anemia (or Hct <40 men / <36 women) — 2 points', 2),
      yesNo('bleed', 'Bleeding history — 2 points', 2),
      yesNo('renal', 'Insufficient kidney function (eGFR < 60 mL/min/1.73m²) — 1 point', 1),
      yesNo('antiplt', 'Treatment with antiplatelet — 1 point', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.older) ? 1 : 0) +
        (bool(values.anemia) ? 2 : 0) +
        (bool(values.bleed) ? 2 : 0) +
        (bool(values.renal) ? 1 : 0) +
        (bool(values.antiplt) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (0–2)',
          interpretation: 'Lower major bleeding risk group in ORBIT-AF. Continue standard bleeding counseling and periodic reassessment.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Medium risk (3)',
          interpretation: 'Intermediate bleeding risk. Review anemia, kidney function, and concomitant antiplatelets.',
        },
        {
          max: 10,
          level: 'high',
          label: 'High risk (≥4)',
          interpretation: 'Higher major bleeding risk. Address modifiable factors; do not automatically discontinue OAC if stroke risk is high — individualize.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Range', value: '0–7' },
          { label: 'Weights', value: 'Age 1, Anemia 2, Bleed Hx 2, eGFR<60 1, Antiplatelet 1' },
        ],
      };
    },
    evidence: {
      summary: 'ORBIT: Older age, Reduced Hb/Hct/anemia, Bleeding history, Insufficient kidney function, Treatment with antiplatelet.',
      formula: 'Age≥75 (1) + anemia (2) + prior bleed (2) + eGFR<60 (1) + antiplatelet (1)',
      validation: 'Derived and validated in ORBIT-AF; compared favorably with HAS-BLED in some analyses.',
      references: [
        { title: 'The ORBIT bleeding score: a simple bedside score to assess bleeding risk in AF', citation: 'O’Brien EC et al. Eur Heart J. 2015', year: 2015, pmid: '26424865',
          doi: '10.1093/eurheartj/ehv476', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Correct reversible anemia contributors', 'Minimize dual antithrombotic therapy duration', 'Renal dosing of DOAC', 'Fall and BP optimization'] },
      { condition: 'Any score', actions: ['Balance with CHA₂DS₂-VASc', 'Reassess when clinical status changes'] },
    ],
  },
];
