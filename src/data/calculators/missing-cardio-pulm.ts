import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const missingCardioPulmCalcs: Calculator[] = [
  {
    id: 'rcri',
    name: 'Revised Cardiac Risk Index (RCRI)',
    shortName: 'RCRI',
    description: 'Predicts major cardiac complications after noncardiac surgery (Lee criteria, 6 factors).',
    category: 'cardiology',
    tags: ['perioperative', 'cardiac risk', 'preop', 'lee'],
    whenToUse: 'Adults undergoing noncardiac surgery for preoperative cardiac risk stratification.',
    whyUse: 'Simple, validated 6-factor index used widely in perioperative medicine and guidelines.',
    inputs: [
      yesNo('highRiskSx', 'High-risk surgery (intraperitoneal, intrathoracic, or suprainguinal vascular)', 1),
      yesNo('ihd', 'History of ischemic heart disease', 1, 'MI, positive stress test, current angina, nitrate use, or Q waves'),
      yesNo('hf', 'History of heart failure', 1),
      yesNo('cvd', 'History of cerebrovascular disease (stroke or TIA)', 1),
      yesNo('dmInsulin', 'Diabetes mellitus treated with insulin', 1),
      yesNo('cr', 'Preoperative creatinine > 2.0 mg/dL (177 µmol/L)', 1),
    ],
    calculate(values) {
      const keys = ['highRiskSx', 'ihd', 'hf', 'cvd', 'dmInsulin', 'cr'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      // Lee et al. original major cardiac event rates (MI, pulmonary edema, VF, complete heart block, cardiac death)
      const rates = ['0.4%', '0.9%', '6.6%', '11%', '11%', '11%', '11%'];
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Class I (0 factors)',
          interpretation: `RCRI 0: major cardiac event risk ~${rates[0]} in original derivation. Low perioperative cardiac risk.`,
        },
        {
          max: 1,
          level: 'low',
          label: 'Class II (1 factor)',
          interpretation: `RCRI 1: major cardiac event risk ~${rates[1]}. Still relatively low risk; optimize medical therapy.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Class III (2 factors)',
          interpretation: `RCRI 2: major cardiac event risk ~${rates[2]}. Intermediate risk; consider further evaluation based on functional status and surgery urgency.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'Class IV (≥3 factors)',
          interpretation: `RCRI ${score}: major cardiac event risk ~${rates[Math.min(score, 6)]}. Elevated risk; multidisciplinary planning and risk reduction advised.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Approx. major cardiac event risk (Lee)', value: rates[Math.min(score, 6)] },
          { label: 'Max score', value: '6' },
        ],
        recommendations:
          score >= 2
            ? ['Assess functional capacity (METs)', 'Continue beta-blocker if chronically used', 'Consider cardiology input for elevated risk / poor functional status']
            : ['Proceed with routine perioperative care', 'Continue indicated cardioprotective meds'],
      };
    },
    evidence: {
      summary: 'RCRI (Lee 1999) uses 6 independent predictors of major cardiac complications after elective noncardiac surgery.',
      formula: 'High-risk surgery + IHD + HF + CVD + insulin DM + Cr>2.0 (1 each) = 0–6',
      validation: 'Derived in 4315 patients; widely validated though absolute event rates vary by era and definition of MI.',
      references: [
        { title: 'Derivation and prospective validation of a simple index for prediction of cardiac risk of major noncardiac surgery', citation: 'Lee TH et al. Circulation. 1999', year: 1999, pmid: '10525402',
          doi: '10.1006/jmbi.1999.3111', },
      ],
    },
    nextSteps: [
      { condition: 'RCRI 0–1', actions: ['Low predicted risk', 'Focus on guideline-directed medical therapy and surgical recovery'] },
      { condition: 'RCRI ≥2', actions: ['Review urgency of surgery', 'Optimize volume status, anemia, BP', 'Consider additional testing only if it will change management'] },
    ],
    pearls: [
      'RCRI does not include emergency surgery or age as separate factors.',
      'Troponin-defined MI rates in modern cohorts are higher than original Lee event rates.',
    ],
  },
  {
    id: 'crb65',
    name: 'CRB-65 Score',
    shortName: 'CRB-65',
    description: 'Pneumonia severity score using Confusion, Respiratory rate, Blood pressure, and age ≥65 (no lab urea).',
    category: 'pulmonary',
    tags: ['pneumonia', 'cap', 'severity', 'crb'],
    whenToUse: 'Adults with community-acquired pneumonia when BUN/urea is unavailable (e.g., clinic or prehospital).',
    whyUse: 'Bedside alternative to CURB-65 for site-of-care decisions without blood tests.',
    inputs: [
      yesNo('confusion', 'Confusion (new disorientation to person/place/time)', 1),
      yesNo('rr', 'Respiratory rate ≥ 30/min', 1),
      yesNo('bp', 'SBP < 90 mmHg or DBP ≤ 60 mmHg', 1),
      yesNo('age', 'Age ≥ 65 years', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.confusion) ? 1 : 0) +
        (bool(values.rr) ? 1 : 0) +
        (bool(values.bp) ? 1 : 0) +
        (bool(values.age) ? 1 : 0);
      const mort = ['0.9%', '5.2%', '12%', '31%', '31%'];
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Low severity (0)',
          interpretation: `CRB-65 0: 30-day mortality ~${mort[0]}. Often suitable for home treatment if social support adequate.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Moderate severity (1–2)',
          interpretation: `CRB-65 ${score}: mortality ~${mort[score]}. Consider hospital assessment/admission.`,
        },
        {
          max: 4,
          level: 'high',
          label: 'High severity (3–4)',
          interpretation: `CRB-65 ${score}: mortality ~${mort[Math.min(score, 4)]}. Urgent hospital care; assess for critical care.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Approx. 30-day mortality', value: mort[Math.min(score, 4)] },
          { label: 'Max score', value: '4' },
        ],
      };
    },
    evidence: {
      summary: 'CRB-65 omits urea from CURB-65 and remains useful for community and ED severity triage.',
      formula: 'Confusion + RR≥30 + low BP + Age≥65 (1 each)',
      validation: 'Validated in CAP cohorts; slightly less precise than CURB-65 when urea is available.',
      references: [
        { title: 'Defining community acquired pneumonia severity on presentation to hospital', citation: 'Lim WS et al. Thorax. 2003', year: 2003, pmid: '12728155',
          doi: '10.1136/thorax.58.5.377', },
      ],
    },
    nextSteps: [
      { condition: 'Score 0', actions: ['Consider outpatient oral antibiotics', 'Safety-net advice and follow-up'] },
      { condition: 'Score 1–2', actions: ['Hospital assessment', 'Consider short-stay or inpatient care'] },
      { condition: 'Score 3–4', actions: ['Urgent admission', 'IV antibiotics', 'Evaluate for ICU (shock, ventilatory failure)'] },
    ],
    pearls: ['Add urea (CURB-65) when labs are available for refined risk.'],
  },
  {
    id: 'lights-criteria',
    name: "Light's Criteria (Pleural Effusion)",
    shortName: "Light's",
    description: 'Classifies pleural fluid as exudate vs transudate using protein and LDH ratios.',
    category: 'pulmonary',
    tags: ['pleural effusion', 'exudate', 'transudate', 'thoracentesis'],
    whenToUse: 'After diagnostic thoracentesis when distinguishing exudative from transudative effusion.',
    whyUse: 'Gold-standard first step; highly sensitive for exudates.',
    inputs: [
      numberInput('pleuralProtein', 'Pleural fluid protein', { unit: 'g/dL', min: 0, max: 15, step: 0.1, defaultValue: 3.0 }),
      numberInput('serumProtein', 'Serum protein', { unit: 'g/dL', min: 0, max: 15, step: 0.1, defaultValue: 7.0 }),
      numberInput('pleuralLdh', 'Pleural fluid LDH', { unit: 'U/L', min: 0, max: 5000, step: 1, defaultValue: 200 }),
      numberInput('serumLdh', 'Serum LDH', { unit: 'U/L', min: 0, max: 5000, step: 1, defaultValue: 200 }),
      numberInput('ldhUln', 'Serum LDH upper limit of normal', {
        unit: 'U/L',
        min: 100,
        max: 500,
        step: 1,
        defaultValue: 200,
        helpText: 'Lab-specific ULN for serum LDH',
      }),
    ],
    calculate(values) {
      const pProt = num(values.pleuralProtein, 3);
      const sProt = num(values.serumProtein, 7);
      const pLdh = num(values.pleuralLdh, 200);
      const sLdh = num(values.serumLdh, 200);
      const uln = num(values.ldhUln, 200);
      const protRatio = sProt > 0 ? pProt / sProt : 0;
      const ldhRatio = sLdh > 0 ? pLdh / sLdh : 0;
      const ldhUlnCut = (2 / 3) * uln;
      const crit1 = protRatio > 0.5;
      const crit2 = ldhRatio > 0.6;
      const crit3 = pLdh > ldhUlnCut;
      const met = (crit1 ? 1 : 0) + (crit2 ? 1 : 0) + (crit3 ? 1 : 0);
      const isExudate = met >= 1;
      return {
        score: met,
        label: isExudate ? 'Exudate' : 'Transudate',
        interpretation: isExudate
          ? `Meets ${met}/3 Light's criteria → exudative effusion. Pursue etiology (infection, malignancy, PE, etc.).`
          : `Meets 0/3 Light's criteria → transudative effusion. Consider heart failure, cirrhosis, nephrosis.`,
        riskLevel: isExudate ? 'moderate' : 'low',
        details: [
          { label: 'Protein ratio (PF/serum)', value: `${round(protRatio, 2)} ${crit1 ? '(>0.5 ✓)' : '(≤0.5)'}` },
          { label: 'LDH ratio (PF/serum)', value: `${round(ldhRatio, 2)} ${crit2 ? '(>0.6 ✓)' : '(≤0.6)'}` },
          { label: 'Pleural LDH vs 2/3 ULN', value: `${round(pLdh, 0)} vs ${round(ldhUlnCut, 0)} ${crit3 ? '(✓)' : ''}` },
        ],
        recommendations: isExudate
          ? ['Send fluid for cell count, Gram stain/culture, cytology as indicated', 'Consider pleural cholesterol / NT-proBNP if discordant clinical picture']
          : ['Treat underlying cause of transudate', 'If clinically looks exudative, consider misclassification (diuretics) and Heffner criteria'],
      };
    },
    evidence: {
      summary: "Light's criteria define an exudate if any one of three protein/LDH thresholds is met; very sensitive but can misclassify some diuresed transudates.",
      formula: 'Exudate if PF/serum protein >0.5 OR PF/serum LDH >0.6 OR PF LDH >2/3 serum LDH ULN',
      validation: 'Classic rule with high sensitivity for exudates; specificity lower in patients on diuretics.',
      references: [
        { title: 'Pleural effusions: the diagnostic separation of transudates and exudates', citation: 'Light RW et al. Ann Intern Med. 1972', year: 1972, pmid: '4642731',
          doi: '10.7326/0003-4819-77-4-507', },
      ],
    },
    nextSteps: [
      { condition: 'Exudate', actions: ['Broad workup based on clinical context', 'Rule out infection and malignancy when appropriate'] },
      { condition: 'Transudate', actions: ['Evaluate HF, cirrhosis, nephrotic syndrome', 'Treat underlying disease'] },
    ],
    pearls: ['Diuretics can make HF effusions meet Light’s exudate criteria; serum–pleural protein gradient >3.1 g/dL suggests transudate.'],
  },
  {
    id: 'smart-cop',
    name: 'SMART-COP Score',
    shortName: 'SMART-COP',
    description: 'Predicts need for intensive respiratory or vasopressor support in community-acquired pneumonia.',
    category: 'pulmonary',
    tags: ['pneumonia', 'cap', 'icu', 'smart-cop'],
    whenToUse: 'Adults with CAP to estimate risk of needing IRVS (ICU-level support).',
    whyUse: 'Better identifies ICU need than CURB-65 alone in some cohorts.',
    inputs: [
      yesNo('sbp', 'Systolic BP < 90 mmHg', 2),
      yesNo('multilobar', 'Multilobar chest radiograph involvement', 1),
      yesNo('albumin', 'Albumin < 3.5 g/dL (35 g/L)', 1),
      yesNo('rr', 'Respiratory rate elevated (age-adjusted)', 1, 'Age ≤50: RR ≥25; age >50: RR ≥30'),
      yesNo('hr', 'Heart rate ≥ 125 bpm', 1),
      yesNo('confusion', 'New onset confusion', 1),
      yesNo('oxygen', 'Low oxygenation (age-adjusted)', 2, 'Age ≤50: PaO₂ <70, SpO₂ ≤93%, or PaO₂/FiO₂ <333; age >50: PaO₂ <60, SpO₂ ≤90%, or PaO₂/FiO₂ <250'),
      yesNo('ph', 'Arterial pH < 7.35', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.sbp) ? 2 : 0) +
        (bool(values.multilobar) ? 1 : 0) +
        (bool(values.albumin) ? 1 : 0) +
        (bool(values.rr) ? 1 : 0) +
        (bool(values.hr) ? 1 : 0) +
        (bool(values.confusion) ? 1 : 0) +
        (bool(values.oxygen) ? 2 : 0) +
        (bool(values.ph) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Very low risk (0)',
          interpretation: 'SMART-COP 0: very low risk of needing intensive respiratory or vasopressor support (IRVS).',
        },
        {
          max: 2,
          level: 'low',
          label: 'Low risk (1–2)',
          interpretation: `SMART-COP ${score}: low risk of IRVS (~1–8% range in original strata). Ward care often appropriate if otherwise stable.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate risk (3–4)',
          interpretation: `SMART-COP ${score}: moderate risk of IRVS (~10–20%). Close monitoring; consider step-up care.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High risk (5–6)',
          interpretation: `SMART-COP ${score}: high risk of IRVS (~30–40%). Strongly consider ICU / higher-acuity care.`,
        },
        {
          max: 11,
          level: 'critical',
          label: 'Very high risk (≥7)',
          interpretation: `SMART-COP ${score}: very high risk of IRVS (>50%). ICU-level care recommended.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Max score', value: '11' },
          { label: 'Endpoint', value: 'Need for IRVS (invasive/noninvasive vent or vasopressors)' },
        ],
      };
    },
    evidence: {
      summary: 'SMART-COP identifies CAP patients likely to need intensive respiratory or vasopressor support; points favor SBP, oxygenation, and acidosis.',
      formula: 'SBP<90 (2) + Multilobar (1) + Albumin<3.5 (1) + RR↑ (1) + HR≥125 (1) + Confusion (1) + low O₂ (2) + pH<7.35 (2)',
      validation: 'Derived and validated in Australian CAP cohorts (Charles et al.).',
      references: [
        { title: 'SMART-COP: a tool for predicting the need for intensive respiratory or vasopressor support in CAP', citation: 'Charles PG et al. Clin Infect Dis. 2008', year: 2008, pmid: '18558884',
          doi: '10.1086/589754', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤2', actions: ['Usual ward or outpatient pathway as otherwise indicated'] },
      { condition: 'Score 3–4', actions: ['Frequent vitals', 'Early senior review', 'Have escalation plan'] },
      { condition: 'Score ≥5', actions: ['ICU consult', 'Prepare for ventilatory/hemodynamic support', 'Source control and timely antibiotics'] },
    ],
    pearls: ['Age-adjusted RR and oxygen thresholds matter—do not use a single cutoff for all ages.'],
  },
  {
    id: 'mmrc-dyspnea',
    name: 'mMRC Dyspnea Scale',
    shortName: 'mMRC',
    description: 'Modified Medical Research Council scale grading breathlessness disability (0–4).',
    category: 'pulmonary',
    tags: ['copd', 'dyspnea', 'mmrc', 'functional'],
    whenToUse: 'COPD and chronic respiratory disease to grade dyspnea-related disability.',
    whyUse: 'Simple patient-reported grade used in GOLD ABE assessment and symptom burden.',
    inputs: [
      selectInput('grade', 'mMRC grade', [
        { label: '0 — Dyspnea only with strenuous exercise', value: 0 },
        { label: '1 — Dyspnea when hurrying or walking up a slight hill', value: 1 },
        { label: '2 — Walks slower than people of same age because of dyspnea, or stops for breath when walking at own pace on level', value: 2 },
        { label: '3 — Stops for breath after walking ~100 m or after a few minutes on level ground', value: 3 },
        { label: '4 — Too dyspneic to leave house, or dyspnea when dressing/undressing', value: 4 },
      ]),
    ],
    calculate(values) {
      const score = num(values.grade);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Grade 0 — minimal',
          interpretation: 'Breathless only with strenuous activity. Low symptom burden by mMRC.',
        },
        {
          max: 1,
          level: 'low',
          label: 'Grade 1 — mild',
          interpretation: 'Dyspnea when hurrying or on slight incline. GOLD often groups mMRC 0–1 as less symptomatic.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Grade 2 — moderate',
          interpretation: 'Walks slower than peers or stops on level ground. Considered more symptomatic (GOLD).',
        },
        {
          max: 3,
          level: 'high',
          label: 'Grade 3 — severe',
          interpretation: 'Stops after ~100 m or a few minutes. Significant disability; optimize therapy and pulmonary rehab.',
        },
        {
          max: 4,
          level: 'critical',
          label: 'Grade 4 — very severe',
          interpretation: 'Housebound or dyspneic with dressing. Very severe symptom burden; comprehensive COPD care.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Scale range', value: '0–4' }],
      };
    },
    evidence: {
      summary: 'mMRC grades functional impact of dyspnea; used with exacerbation history in GOLD group classification.',
      formula: 'Ordinal grade 0–4 based on activity limitation from breathlessness',
      validation: 'Widely used in COPD trials and guidelines; correlates with health status but is not a full QoL instrument.',
      references: [
        { title: 'Global Strategy for Prevention, Diagnosis and Management of COPD (GOLD)', citation: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD) Report', year: 2024, url: 'https://goldcopd.org/2024-gold-report/' },
      ],
    },
    nextSteps: [
      { condition: 'mMRC ≥2', actions: ['Review inhaler technique and adherence', 'Consider LABA/LAMA ± ICS per phenotype', 'Refer to pulmonary rehabilitation'] },
      { condition: 'Any grade', actions: ['Combine with exacerbation history for GOLD ABE grouping', 'Address comorbidities (HF, deconditioning, anemia)'] },
    ],
  },
  {
    id: 'sf-ratio',
    name: 'SpO₂/FiO₂ Ratio (S/F)',
    shortName: 'S/F Ratio',
    description: 'Noninvasive oxygenation index using pulse oximetry SpO₂ and FiO₂.',
    category: 'critical-care',
    tags: ['ards', 'oxygenation', 'spo2', 'sf'],
    whenToUse: 'Hypoxemic respiratory failure when arterial blood gas is unavailable or for serial noninvasive monitoring.',
    whyUse: 'S/F correlates with P/F; useful triage and ARDS screening without ABG.',
    inputs: [
      numberInput('spo2', 'SpO₂', { unit: '%', min: 50, max: 100, step: 1, defaultValue: 94, helpText: 'Prefer SpO₂ ≤97% for better correlation with PaO₂' }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', min: 0.21, max: 1, step: 0.01, defaultValue: 0.4 }),
    ],
    calculate(values) {
      const spo2 = num(values.spo2, 94);
      const fio2 = num(values.fio2, 0.4);
      if (fio2 <= 0) {
        return {
          score: 0,
          label: 'Invalid FiO₂',
          interpretation: 'FiO₂ must be > 0 (enter as fraction 0.21–1.0).',
          riskLevel: 'info',
        };
      }
      const sf = round(spo2 / fio2, 0);
      // Approximate mappings: S/F ~315 ≈ P/F 300; ~235 ≈ P/F 200; ~150 ≈ P/F 100 (Rice et al. and related work)
      const r = riskFromThresholds(sf, [
        {
          max: 150,
          level: 'critical',
          label: 'Severe hypoxemia range',
          interpretation: `S/F ${sf}: roughly correlates with severe ARDS-range P/F (≤100). Urgent escalation; obtain ABG if feasible.`,
        },
        {
          max: 235,
          level: 'high',
          label: 'Moderate hypoxemia range',
          interpretation: `S/F ${sf}: roughly correlates with moderate ARDS-range P/F (≤200). Higher-acuity monitoring warranted.`,
        },
        {
          max: 315,
          level: 'moderate',
          label: 'Mild hypoxemia range',
          interpretation: `S/F ${sf}: roughly correlates with mild ARDS-range P/F (≤300) if other ARDS criteria apply.`,
        },
        {
          max: 500,
          level: 'low',
          label: 'Above typical ARDS S/F thresholds',
          interpretation: `S/F ${sf}: generally above thresholds used to approximate P/F ≤300. Interpret with clinical context.`,
        },
      ]);
      return {
        score: sf,
        unit: '% / fraction',
        ...r,
        details: [
          { label: 'SpO₂', value: `${spo2}%` },
          { label: 'FiO₂', value: String(fio2) },
          { label: 'Approx. P/F mapping', value: 'S/F≈315→P/F300; ≈235→200; ≈150→100' },
        ],
        recommendations: spo2 > 97 ? ['SpO₂ >97% flattens the O₂-Hb curve—correlation with PaO₂ worsens; consider lowering FiO₂ slightly or obtaining ABG'] : undefined,
      };
    },
    evidence: {
      summary: 'SpO₂/FiO₂ ratio approximates PaO₂/FiO₂ for ARDS severity when SpO₂ is on the steep portion of the dissociation curve.',
      formula: 'S/F = SpO₂ (%) ÷ FiO₂ (fraction)',
      validation: 'Correlated with P/F in ARDSNet and other cohorts; thresholds approximate, not identical to Berlin P/F cuts.',
      references: [
        { title: 'Comparison of the SpO₂/FiO₂ ratio and the PaO₂/FiO₂ ratio in patients with ALI or ARDS', citation: 'Rice TW et al. Chest. 2007', year: 2007, pmid: '17573487',
          doi: '10.1378/chest.07-0617', },
      ],
    },
    nextSteps: [
      { condition: 'S/F ≤315 with bilateral opacities', actions: ['Consider ARDS workup', 'Lung-protective ventilation if intubated', 'Treat underlying cause'] },
      { condition: 'Severe range', actions: ['ABG for formal P/F', 'Escalate respiratory support', 'ICU care'] },
    ],
    pearls: ['Enter FiO₂ as a fraction (e.g., 0.40 not 40%).', 'Correlation is best when SpO₂ ≤97%.'],
  },
  {
    id: 'edacs',
    name: 'EDACS (Emergency Department Assessment of Chest Pain Score)',
    shortName: 'EDACS',
    description: 'Chest pain risk score using age, sex, risk factors, and symptom features for early discharge pathways.',
    category: 'emergency',
    tags: ['chest pain', 'acs', 'edacs', 'troponin'],
    whenToUse: 'ED patients with possible cardiac chest pain in accelerated diagnostic protocols.',
    whyUse: 'Identifies low-risk patients (with negative ECG/troponins) safe for early discharge.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 55 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 0 },
        { label: 'Male (+6)', value: 6 },
      ]),
      yesNo('riskCad', 'Known CAD or ≥3 risk factors', 4, 'Risk factors: family history, dyslipidemia, diabetes, hypertension, current smoker'),
      yesNo('diaphoresis', 'Diaphoresis', 3),
      yesNo('radiates', 'Pain radiates to arm or shoulder', 5),
      yesNo('pleuritic', 'Pain occurred or worsened with inspiration', -4),
      yesNo('reproduced', 'Pain reproduced by palpation', -6),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      let agePts = 2;
      if (age >= 86) agePts = 20;
      else if (age >= 81) agePts = 18;
      else if (age >= 76) agePts = 16;
      else if (age >= 71) agePts = 14;
      else if (age >= 66) agePts = 12;
      else if (age >= 61) agePts = 10;
      else if (age >= 56) agePts = 8;
      else if (age >= 51) agePts = 6;
      else if (age >= 46) agePts = 4;
      else agePts = 2; // 18–45

      const score =
        agePts +
        num(values.sex) +
        (bool(values.riskCad) ? 4 : 0) +
        (bool(values.diaphoresis) ? 3 : 0) +
        (bool(values.radiates) ? 5 : 0) +
        (bool(values.pleuritic) ? -4 : 0) +
        (bool(values.reproduced) ? -6 : 0);

      const lowRiskCutoff = 16;
      if (score < lowRiskCutoff) {
        return {
          score,
          label: 'Low-risk EDACS (<16)',
          interpretation: `EDACS ${score}: low-risk category IF ECG has no new ischemia AND 0- and 2-hour troponins are negative (EDACS-ADP). Early discharge may be appropriate.`,
          riskLevel: 'low',
          details: [
            { label: 'Age points', value: String(agePts) },
            { label: 'Low-risk threshold', value: '< 16 (+ neg ECG/troponins)' },
          ],
          recommendations: [
            'Confirm no new ischemic ECG changes',
            'Use protocol-specified high-sensitivity troponin timing',
            'Provide return precautions and follow-up',
          ],
        };
      }
      return {
        score,
        label: 'Not low-risk (EDACS ≥16)',
        interpretation: `EDACS ${score}: does not meet low-risk EDACS threshold. Further observation, serial troponins, and risk-appropriate testing indicated.`,
        riskLevel: score >= 20 ? 'high' : 'moderate',
        details: [
          { label: 'Age points', value: String(agePts) },
          { label: 'Low-risk threshold', value: '< 16 (+ neg ECG/troponins)' },
        ],
        recommendations: ['Do not use early-discharge ADP alone', 'Serial ECG/troponin and further ischemia evaluation as indicated'],
      };
    },
    evidence: {
      summary: 'EDACS plus ECG and 0/2h troponins (EDACS-ADP) safely identifies low-risk chest pain for early discharge.',
      formula: 'Age points (2–20) + male (6) + known CAD/≥3 RF (4) + diaphoresis (3) + radiation (5) − pleuritic (4) − reproduced (6)',
      validation: 'Derived and validated in Australasian ED cohorts; implemented in accelerated diagnostic protocols.',
      references: [
        { title: 'Development and validation of the EDACS', citation: 'Than M et al. Emerg Med Australas. 2014', year: 2014, pmid: '24428678',
          doi: '10.1111/1742-6723.12164', },
      ],
    },
    nextSteps: [
      { condition: 'EDACS <16 + neg ECG + neg troponins', actions: ['Consider early discharge', 'Outpatient follow-up', 'Lifestyle and risk-factor counseling'] },
      { condition: 'EDACS ≥16 or positive workup', actions: ['Prolonged observation / admit', 'Cardiology pathway as indicated'] },
    ],
    pearls: ['EDACS alone is not enough—must combine with ECG and timed troponins for ADP safety.'],
  },
  {
    id: 'atria-bleed',
    name: 'ATRIA Bleeding Risk Score',
    shortName: 'ATRIA Bleed',
    description: 'Estimates major bleeding risk in patients with atrial fibrillation on warfarin.',
    category: 'cardiology',
    tags: ['bleeding', 'afib', 'anticoagulation', 'atria'],
    whenToUse: 'Patients with AF on or considering warfarin to stratify major hemorrhage risk.',
    whyUse: 'Simple score from a large ATRIA cohort; complements stroke risk assessment.',
    inputs: [
      yesNo('anemia', 'Anemia (hemoglobin <13 g/dL men or <12 g/dL women)', 3),
      yesNo('renal', 'Severe renal disease (eGFR <30 mL/min or dialysis)', 3),
      yesNo('age75', 'Age ≥ 75 years', 2),
      yesNo('priorBleed', 'Any prior hemorrhage diagnosis', 1),
      yesNo('htn', 'Diagnosed hypertension', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.anemia) ? 3 : 0) +
        (bool(values.renal) ? 3 : 0) +
        (bool(values.age75) ? 2 : 0) +
        (bool(values.priorBleed) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low bleeding risk (0–3)',
          interpretation: `ATRIA ${score}: low major bleeding risk (~0.8%/year in original warfarin cohort strata).`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate risk (4)',
          interpretation: `ATRIA ${score}: intermediate major bleeding risk (~2.6%/year in original strata).`,
        },
        {
          max: 10,
          level: 'high',
          label: 'High bleeding risk (5–10)',
          interpretation: `ATRIA ${score}: high major bleeding risk (~5.8%/year in original strata). Address modifiable factors; balance against stroke risk.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Max score', value: '10' },
          { label: 'Cohort context', value: 'Warfarin-treated AF (ATRIA)' },
        ],
        recommendations:
          score >= 5
            ? ['Correct anemia and BP when possible', 'Review concomitant antiplatelets/NSAIDs', 'Prefer DOAC if eligible; do not withhold OAC solely for high bleed score if stroke risk high']
            : ['Routine bleeding counseling', 'Reassess if new risk factors appear'],
      };
    },
    evidence: {
      summary: 'ATRIA bleeding score weights anemia and severe renal disease heavily for major hemorrhage prediction on warfarin.',
      formula: 'Anemia (3) + severe renal disease (3) + age≥75 (2) + prior bleed (1) + HTN (1)',
      validation: 'Derived in ATRIA cohort; compared with other bleed scores in subsequent studies.',
      references: [
        { title: 'A new risk scheme to predict warfarin-associated hemorrhage (ATRIA)', citation: 'Fang MC et al. J Am Coll Cardiol. 2011', year: 2011, pmid: '21757117',
          doi: '10.1016/j.jacc.2011.03.031', },
      ],
    },
    nextSteps: [
      { condition: 'Low (0–3)', actions: ['Proceed with indicated anticoagulation', 'Periodic lab monitoring'] },
      { condition: 'High (≥5)', actions: ['Mitigate modifiable bleed risks', 'Shared decision-making with CHA₂DS₂-VASc', 'Consider DOAC and closer follow-up'] },
    ],
  },
  {
    id: 'same-tt2r2',
    name: 'SAMe-TT₂R₂ Score',
    shortName: 'SAMe-TT₂R₂',
    description: 'Predicts poor anticoagulation control (low TTR) on vitamin K antagonists in AF.',
    category: 'cardiology',
    tags: ['warfarin', 'ttr', 'afib', 'same-tt2r2'],
    whenToUse: 'Patients with AF being considered for warfarin vs DOAC when TTR quality is a concern.',
    whyUse: 'Identifies who is less likely to achieve good INR control on VKA—favor DOAC if eligible.',
    inputs: [
      yesNo('female', 'Sex: female', 1),
      yesNo('age60', 'Age < 60 years', 1),
      yesNo('medHx', 'Medical history: ≥2 of HTN, DM, CAD/MI, PAD, CHF, prior stroke, pulmonary disease, hepatic or renal disease', 1),
      yesNo('treatment', 'Treatment: interacting drugs (e.g., amiodarone)', 1),
      yesNo('tobacco', 'Tobacco use within past 2 years', 2),
      yesNo('race', 'Race: non-white', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.female) ? 1 : 0) +
        (bool(values.age60) ? 1 : 0) +
        (bool(values.medHx) ? 1 : 0) +
        (bool(values.treatment) ? 1 : 0) +
        (bool(values.tobacco) ? 2 : 0) +
        (bool(values.race) ? 2 : 0);
      if (score <= 2) {
        return {
          score,
          label: 'Likely adequate TTR (0–2)',
          interpretation: `SAMe-TT₂R₂ ${score}: more likely to achieve good time in therapeutic range on warfarin if VKA is chosen.`,
          riskLevel: 'low',
          details: [{ label: 'Max score', value: '8' }],
          recommendations: ['Warfarin may be reasonable if preferred/indicated', 'Still educate on adherence, diet, drug interactions'],
        };
      }
      return {
        score,
        label: 'Risk of poor TTR (>2)',
        interpretation: `SAMe-TT₂R₂ ${score}: higher likelihood of labile INR / low TTR on VKA. Prefer a DOAC if eligible and no contraindication.`,
        riskLevel: 'high',
        details: [{ label: 'Max score', value: '8' }],
        recommendations: ['Prefer DOAC over warfarin when appropriate', 'If warfarin required, intensive INR monitoring and education'],
      };
    },
    evidence: {
      summary: 'SAMe-TT₂R₂ helps predict quality of VKA control; score >2 associated with lower TTR and more adverse events on warfarin.',
      formula: 'Sex female (1) + Age<60 (1) + Medical history ≥2 comorbidities (1) + Treatment interacting drugs (1) + Tobacco (2) + Race non-white (2)',
      validation: 'Validated in multiple AF cohorts for TTR prediction.',
      references: [
        { title: 'The SAMe-TT2R2 score predicts poor anticoagulation control in AF patients on VKA', citation: 'Apostolakis S et al. Chest. 2013', year: 2013, pmid: '23669885',
          doi: '10.1378/chest.13-0054', },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–2', actions: ['VKA acceptable if chosen', 'Target TTR >70%'] },
      { condition: 'Score >2', actions: ['Choose DOAC if eligible', 'If VKA mandatory, frequent INR checks and adherence support'] },
    ],
    pearls: ['Does not replace CHA₂DS₂-VASc for stroke risk or HAS-BLED/ATRIA for bleeding risk.'],
  },
  {
    id: 'sgarbossa',
    name: 'Sgarbossa Criteria (MI in LBBB)',
    shortName: 'Sgarbossa',
    description: 'ECG point score for acute MI in the presence of left bundle branch block (original; modified noted).',
    category: 'cardiology',
    tags: ['mi', 'lbbb', 'ecg', 'sgarbossa', 'stemi'],
    whenToUse: 'Suspected ACS with LBBB (or ventricular paced rhythm in adapted use) when STEMI diagnosis is uncertain.',
    whyUse: 'Highly specific criteria for occlusion MI when concordant changes are present.',
    inputs: [
      yesNo('concordantSte', 'Concordant ST elevation ≥1 mm in any lead with positive QRS', 5),
      yesNo('concordantStd', 'Concordant ST depression ≥1 mm in V1–V3', 3),
      yesNo('discordantSte5', 'Excessively discordant ST elevation ≥5 mm (original criterion)', 2),
      yesNo('smithModified', 'Modified Smith criterion positive (ST/S ratio ≤ −0.25) if ≥5 mm not used', 0, 'Optional: replaces 5 mm rule with proportional discordance; does not add original points automatically'),
    ],
    calculate(values) {
      const score =
        (bool(values.concordantSte) ? 5 : 0) +
        (bool(values.concordantStd) ? 3 : 0) +
        (bool(values.discordantSte5) ? 2 : 0);
      const modifiedPositive = bool(values.smithModified);
      if (score >= 3) {
        return {
          score,
          label: 'Positive Sgarbossa (≥3)',
          interpretation: `Sgarbossa ${score}: meets original threshold (≥3) with high specificity for acute MI in LBBB. Activate emergent reperfusion pathway.`,
          riskLevel: 'critical',
          details: [
            { label: 'Original positive threshold', value: '≥ 3 points' },
            { label: 'Modified Smith note', value: modifiedPositive ? 'Also marked positive by ST/S ≤ −0.25' : 'Not marked / N/A' },
          ],
          recommendations: ['STEMI-equivalent pathway', 'Urgent cardiology / cath lab activation per protocol', 'Anti-ischemic therapy as indicated'],
        };
      }
      if (modifiedPositive) {
        return {
          score,
          label: 'Original <3 but modified positive',
          interpretation: `Original Sgarbossa ${score} (<3) but modified (Smith) criterion positive: proportional discordant STE (ST/S ≤ −0.25) improves sensitivity. Treat as highly concerning for occlusion MI.`,
          riskLevel: 'high',
          details: [
            { label: 'Original score', value: String(score) },
            { label: 'Modified Smith', value: 'Positive (ST/S ≤ −0.25)' },
          ],
          recommendations: ['Strong consideration for emergent reperfusion', 'Compare with prior ECGs', 'Serial ECGs and emergent cardiology input'],
        };
      }
      return {
        score,
        label: 'Negative / indeterminate (original <3)',
        interpretation: `Sgarbossa ${score}: does not meet original ≥3 cutoff. Does not rule out MI—sensitivity is limited. Use clinical judgment, serial ECGs, modified criteria, and troponin.`,
        riskLevel: 'moderate',
        details: [
          { label: 'Original positive threshold', value: '≥ 3 points' },
          { label: 'Max original score', value: '10' },
        ],
        recommendations: ['Do not exclude occlusion MI on Sgarbossa alone', 'Consider Smith-modified proportional discordance', 'Serial ECGs, troponin, echo as indicated'],
      };
    },
    evidence: {
      summary: 'Original Sgarbossa: concordant STE ≥1 mm (5), concordant STD ≥1 mm in V1–V3 (3), discordant STE ≥5 mm (2). Score ≥3 highly specific. Smith modification uses ST/S ≤ −0.25 for better sensitivity.',
      formula: 'Concordant STE≥1mm (5) + concordant STD V1–V3 ≥1mm (3) + discordant STE≥5mm (2); modified replaces 5mm with ST/S ≤ −0.25',
      validation: 'Derived from GUSTO-1; Smith-modified rule validated with improved sensitivity.',
      references: [
        { title: 'Electrocardiographic diagnosis of evolving MI in LBBB (Sgarbossa)', citation: 'Sgarbossa EB et al. N Engl J Med. 1996', year: 1996, pmid: '8598860' },
        { title: 'Diagnosis of MI with LBBB using ST-segment/S-wave ratio', citation: 'Smith SW et al. Ann Emerg Med. 2012', year: 2012, pmid: '22939607',
          doi: '10.1016/j.annemergmed.2012.07.119', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3 or modified positive', actions: ['Activate emergent reperfusion pathway', 'Treat as STEMI equivalent'] },
      { condition: 'Score <3', actions: ['Continue ACS workup', 'Serial ECG/troponin', 'Reassess with modified criteria'] },
    ],
    pearls: [
      'Concordant changes are the most specific.',
      'Original ≥5 mm discordant rule is insensitive; prefer proportional (Smith) assessment when available.',
    ],
  },
  {
    id: 'duke-treadmill',
    name: 'Duke Treadmill Score',
    shortName: 'Duke Treadmill',
    description: 'Prognostic score from exercise treadmill testing using time, ST deviation, and angina.',
    category: 'cardiology',
    tags: ['stress test', 'exercise', 'prognosis', 'cad'],
    whenToUse: 'Patients undergoing Bruce-protocol exercise ECG for suspected CAD prognosis.',
    whyUse: 'Stratifies annual cardiovascular mortality; guides need for angiography.',
    inputs: [
      numberInput('exerciseTime', 'Exercise duration (Bruce protocol)', {
        unit: 'min',
        min: 0,
        max: 21,
        step: 0.1,
        defaultValue: 8,
        helpText: 'Minutes on standard Bruce protocol',
      }),
      numberInput('stDev', 'Max net ST-segment deviation', {
        unit: 'mm',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        helpText: 'Largest ST depression/elevation during or after exercise (absolute mm)',
      }),
      selectInput('angina', 'Exercise angina index', [
        { label: '0 — No angina', value: 0 },
        { label: '1 — Non-limiting angina', value: 1 },
        { label: '2 — Limiting angina (reason for stopping)', value: 2 },
      ]),
    ],
    calculate(values) {
      const time = num(values.exerciseTime, 8);
      const st = num(values.stDev, 1);
      const angina = num(values.angina, 0);
      const score = round(time - 5 * st - 4 * angina, 1);
      const r = riskFromThresholds(score, [
        // Note: riskFromThresholds uses score <= max, so order from lowest scores (worst) first
        {
          max: -11,
          level: 'high',
          label: 'High risk (≤ −11)',
          interpretation: `Duke treadmill score ${score}: high risk. Annual CV mortality often ≥5% in classic strata; consider angiography.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate risk (−10 to +4)',
          interpretation: `Duke treadmill score ${score}: intermediate risk. Further risk stratification (imaging, CTA, cath) based on symptoms and clinical context.`,
        },
        {
          max: 50,
          level: 'low',
          label: 'Low risk (≥ +5)',
          interpretation: `Duke treadmill score ${score}: low risk. Annual CV mortality typically <1% in classic strata; medical management often appropriate.`,
        },
      ]);
      // Fix ordering issue: riskFromThresholds iterates low max first which works if high-risk has lowest max
      // For DTS, higher is better. score <= -11 high; else <=4 moderate; else low. Good.
      return {
        score,
        ...r,
        details: [
          { label: 'Formula', value: 'Time − 5×ST(mm) − 4×angina index' },
          { label: 'Exercise time', value: `${time} min` },
          { label: 'ST deviation', value: `${st} mm` },
          { label: 'Angina index', value: String(angina) },
        ],
      };
    },
    evidence: {
      summary: 'Duke treadmill score = exercise time (Bruce min) − 5×ST deviation (mm) − 4×angina index (0–2). Prognostic for CV mortality.',
      formula: 'DTS = exercise time − (5 × ST deviation) − (4 × angina index)',
      validation: 'Derived at Duke University; widely validated for prognosis after exercise ECG.',
      references: [
        { title: 'Prognostic value of a treadmill exercise score in outpatients with suspected CAD', citation: 'Mark DB et al. N Engl J Med. 1991', year: 1991, pmid: '1864370',
          doi: '10.1016/0014-5793(91)80975-9', },
      ],
    },
    nextSteps: [
      { condition: 'Low risk (≥5)', actions: ['Medical therapy and risk-factor modification', 'Routine follow-up'] },
      { condition: 'Intermediate', actions: ['Consider stress imaging or coronary CTA', 'Intensify GDMT'] },
      { condition: 'High risk (≤−11)', actions: ['Referral for coronary angiography', 'Optimize anti-ischemic therapy'] },
    ],
    pearls: ['Assumes standard Bruce protocol times; convert carefully if other protocols used.', 'Uninterpretable ST (digoxin, baseline ST-T changes, LBBB) limits ECG-only scoring.'],
  },
  {
    id: 'berlin-ards',
    name: 'Berlin ARDS Definition Helper',
    shortName: 'Berlin ARDS',
    description: 'Applies Berlin definition elements (timing, imaging, origin, oxygenation) to classify ARDS severity.',
    category: 'critical-care',
    tags: ['ards', 'berlin', 'icu', 'pf ratio'],
    whenToUse: 'Acute hypoxemic respiratory failure evaluation for ARDS diagnosis and severity.',
    whyUse: 'Standard international definition guiding lung-protective strategies and trial eligibility.',
    inputs: [
      yesNo('timing', 'Timing: within 1 week of known clinical insult or new/worsening respiratory symptoms', 1),
      yesNo('imaging', 'Imaging: bilateral opacities not fully explained by effusions, lobar/lung collapse, or nodules', 1),
      yesNo('origin', 'Origin: respiratory failure not fully explained by cardiac failure or fluid overload', 1, 'Need objective assessment (e.g., echo) if no risk factor present'),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 80 }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', min: 0.21, max: 1, step: 0.01, defaultValue: 0.5 }),
      yesNo('peep', 'PEEP or CPAP ≥ 5 cmH₂O', 1),
    ],
    calculate(values) {
      const timing = bool(values.timing);
      const imaging = bool(values.imaging);
      const origin = bool(values.origin);
      const peep = bool(values.peep);
      const pao2 = num(values.pao2, 80);
      const fio2 = num(values.fio2, 0.5);
      const pf = fio2 > 0 ? round(pao2 / fio2, 0) : 0;

      const criteriaMet = timing && imaging && origin && peep && pf <= 300;
      let severity = 'Does not meet ARDS';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'info';
      let interpretation = '';

      if (!timing || !imaging || !origin) {
        interpretation = 'Missing one or more non-oxygenation Berlin criteria (timing, bilateral imaging, non-cardiogenic origin). ARDS not defined.';
        riskLevel = 'info';
      } else if (!peep) {
        interpretation = `P/F ${pf} but PEEP/CPAP ≥5 cmH₂O not met. Berlin ARDS requires PEEP/CPAP ≥5.`;
        riskLevel = 'moderate';
      } else if (pf > 300) {
        interpretation = `Criteria for timing/imaging/origin/PEEP met but P/F ${pf} >300. Does not meet hypoxemia threshold for ARDS.`;
        riskLevel = 'low';
      } else if (pf > 200) {
        severity = 'Mild ARDS';
        riskLevel = 'moderate';
        interpretation = `Meets Berlin ARDS: mild (P/F ${pf}, 200–300) with PEEP≥5.`;
      } else if (pf > 100) {
        severity = 'Moderate ARDS';
        riskLevel = 'high';
        interpretation = `Meets Berlin ARDS: moderate (P/F ${pf}, 100–200) with PEEP≥5.`;
      } else {
        severity = 'Severe ARDS';
        riskLevel = 'critical';
        interpretation = `Meets Berlin ARDS: severe (P/F ${pf} ≤100) with PEEP≥5.`;
      }

      return {
        score: pf,
        unit: 'P/F mmHg',
        label: criteriaMet ? severity : 'ARDS criteria not fully met',
        interpretation,
        riskLevel,
        details: [
          { label: 'Timing', value: timing ? 'Yes' : 'No' },
          { label: 'Bilateral opacities', value: imaging ? 'Yes' : 'No' },
          { label: 'Not pure cardiogenic', value: origin ? 'Yes' : 'No' },
          { label: 'PEEP/CPAP ≥5', value: peep ? 'Yes' : 'No' },
          { label: 'P/F ratio', value: String(pf) },
        ],
        recommendations: criteriaMet
          ? [
              'Lung-protective ventilation (≤6 mL/kg PBW, plateau ≤30 cmH₂O)',
              'Adequate PEEP',
              pf <= 100 ? 'Consider prone positioning, neuromuscular blockade, ECMO consult' : 'Treat underlying cause; conservative fluid strategy',
            ]
          : ['Reassess diagnosis', 'Obtain echo if cardiogenic edema possible', 'Optimize oxygen delivery and treat precipitant'],
      };
    },
    evidence: {
      summary: 'Berlin definition: acute (≤1 week), bilateral opacities, not fully cardiogenic, and P/F ≤300 on PEEP/CPAP ≥5. Severity: mild 200–300, moderate 100–200, severe ≤100.',
      formula: 'ARDS if timing + imaging + origin + PEEP≥5 + P/F≤300; severity by P/F tiers',
      validation: 'International consensus (2012); standard for clinical care and research.',
      references: [
        { title: 'Acute Respiratory Distress Syndrome: The Berlin Definition', citation: 'ARDS Definition Task Force. JAMA. 2012', year: 2012, pmid: '22797452',
          doi: '10.1001/jama.2012.5669', },
      ],
    },
    nextSteps: [
      { condition: 'Mild–moderate ARDS', actions: ['Low TV ventilation', 'PEEP titration', 'Treat sepsis/pneumonia/aspiration as applicable'] },
      { condition: 'Severe ARDS', actions: ['Early prone positioning', 'Consider NMB', 'Specialty center / ECMO evaluation if refractory'] },
    ],
  },
  {
    id: 'heffner-criteria',
    name: 'Heffner Criteria (Pleural Effusion)',
    shortName: 'Heffner',
    description: 'Simplified rule for exudative pleural effusion using pleural protein, cholesterol, and LDH only.',
    category: 'pulmonary',
    tags: ['pleural effusion', 'exudate', 'heffner'],
    whenToUse: 'When serum protein/LDH simultaneous values are unavailable, or as a simplified adjunct to Light’s.',
    whyUse: 'Uses pleural fluid values alone; practical when paired serum labs are missing.',
    inputs: [
      numberInput('pleuralProtein', 'Pleural fluid protein', { unit: 'g/dL', min: 0, max: 15, step: 0.1, defaultValue: 3.0 }),
      numberInput('pleuralChol', 'Pleural fluid cholesterol', { unit: 'mg/dL', min: 0, max: 300, step: 1, defaultValue: 50 }),
      numberInput('pleuralLdh', 'Pleural fluid LDH', { unit: 'U/L', min: 0, max: 5000, step: 1, defaultValue: 200 }),
      numberInput('ldhUln', 'Serum LDH upper limit of normal', {
        unit: 'U/L',
        min: 100,
        max: 500,
        step: 1,
        defaultValue: 200,
        helpText: 'Used for 0.45 × ULN cutoff',
      }),
    ],
    calculate(values) {
      const protein = num(values.pleuralProtein, 3);
      const chol = num(values.pleuralChol, 50);
      const ldh = num(values.pleuralLdh, 200);
      const uln = num(values.ldhUln, 200);
      const ldhCut = 0.45 * uln;
      const crit1 = protein > 2.9;
      const crit2 = chol > 45;
      const crit3 = ldh > ldhCut;
      const met = (crit1 ? 1 : 0) + (crit2 ? 1 : 0) + (crit3 ? 1 : 0);
      const isExudate = met >= 1;
      return {
        score: met,
        label: isExudate ? 'Exudate (Heffner)' : 'Transudate (Heffner)',
        interpretation: isExudate
          ? `Meets ${met}/3 Heffner criteria → classify as exudate. Investigate infectious, malignant, and other exudative causes.`
          : 'Meets 0/3 Heffner criteria → favors transudate. Consider HF, cirrhosis, nephrosis.',
        riskLevel: isExudate ? 'moderate' : 'low',
        details: [
          { label: 'Pleural protein >2.9 g/dL', value: `${protein} ${crit1 ? '✓' : ''}` },
          { label: 'Pleural cholesterol >45 mg/dL', value: `${chol} ${crit2 ? '✓' : ''}` },
          { label: `Pleural LDH >0.45×ULN (${round(ldhCut, 0)})`, value: `${ldh} ${crit3 ? '✓' : ''}` },
        ],
      };
    },
    evidence: {
      summary: 'Heffner meta-analysis cutoffs: pleural protein >2.9 g/dL, cholesterol >45 mg/dL, or LDH >0.45× serum LDH ULN indicate exudate.',
      formula: 'Exudate if protein >2.9 OR cholesterol >45 OR LDH >0.45× ULN',
      validation: 'Meta-analysis-derived simplified criteria; slightly less sensitive than full Light’s in some comparisons.',
      references: [
        { title: 'Pleural fluid chemical analysis in parapneumonic effusions: a meta-analysis', citation: 'Heffner JE et al. Am J Respir Crit Care Med. 1995 / related cut-point work', year: 1995, pmid: '7882838',
          doi: '10.2337/diacare.17.12.1551', },
      ],
    },
    nextSteps: [
      { condition: 'Exudate', actions: ['Cell count, culture, cytology as indicated', 'Correlate with Light’s when serum labs available'] },
      { condition: 'Transudate', actions: ['Treat underlying systemic cause'] },
    ],
    pearls: ['When both available, Light’s remains the most sensitive first-line rule.'],
  },
  {
    id: 'cardiac-power',
    name: 'Cardiac Power Output',
    shortName: 'CPO',
    description: 'Cardiac power output from mean arterial pressure and cardiac output (Watts).',
    category: 'cardiology',
    tags: ['shock', 'hemodynamics', 'cpo', 'cardiogenic'],
    whenToUse: 'Cardiogenic shock or advanced HF with measured/estimated CO and MAP available.',
    whyUse: 'Strong hemodynamic correlate of prognosis in cardiogenic shock (e.g., SHOCK trial analyses).',
    inputs: [
      numberInput('map', 'Mean arterial pressure (MAP)', { unit: 'mmHg', min: 20, max: 200, defaultValue: 70 }),
      numberInput('co', 'Cardiac output (CO)', { unit: 'L/min', min: 0.5, max: 15, step: 0.1, defaultValue: 4.0 }),
    ],
    calculate(values) {
      const map = num(values.map, 70);
      const co = num(values.co, 4);
      const cpo = round((map * co) / 451, 2);
      const r = riskFromThresholds(cpo, [
        {
          max: 0.53,
          level: 'critical',
          label: 'Very low CPO (≤0.53 W)',
          interpretation: `CPO ${cpo} W: critically low cardiac power. Associated with high mortality in cardiogenic shock; urgent support.`,
        },
        {
          max: 0.6,
          level: 'high',
          label: 'Low CPO (≤0.6 W)',
          interpretation: `CPO ${cpo} W: low cardiac power. Concerning in shock; escalate monitoring and support.`,
        },
        {
          max: 1.0,
          level: 'moderate',
          label: 'Below typical resting normal',
          interpretation: `CPO ${cpo} W: below ~1 W resting normal adult values. Interpret with clinical context.`,
        },
        {
          max: 5,
          level: 'low',
          label: 'Near-normal / higher CPO',
          interpretation: `CPO ${cpo} W: near or above typical resting cardiac power (~1 W).`,
        },
      ]);
      return {
        score: cpo,
        unit: 'W',
        ...r,
        details: [
          { label: 'MAP', value: `${map} mmHg` },
          { label: 'CO', value: `${co} L/min` },
          { label: 'Formula', value: 'MAP × CO / 451' },
        ],
        recommendations:
          cpo <= 0.6
            ? ['Consider shock team / advanced therapies', 'Reassess volume, inotropes, mechanical support']
            : ['Integrate with lactate, ScvO₂, urine output', 'Serial trends more useful than single value'],
      };
    },
    evidence: {
      summary: 'Cardiac power output (W) = MAP × CO / 451. Resting normal ~1 W; CPO ≤0.53 W strongly associated with mortality in cardiogenic shock.',
      formula: 'CPO (W) = MAP (mmHg) × CO (L/min) / 451',
      validation: 'Hemodynamic analyses from SHOCK registry and related studies.',
      references: [
        { title: 'Cardiac power is the strongest hemodynamic correlate of mortality in cardiogenic shock', citation: 'Fincke R et al. J Am Coll Cardiol. 2004', year: 2004, pmid: '15261929',
          doi: '10.1016/j.jacc.2004.03.060', },
      ],
    },
    nextSteps: [
      { condition: 'CPO ≤0.6 W in shock', actions: ['Urgent stabilization', 'Inotropes/vasopressors as indicated', 'Evaluate mechanical circulatory support'] },
    ],
    pearls: ['MAP can be calculated as DBP + (SBP−DBP)/3 if not measured directly.'],
  },
  {
    id: 'shock-index-age',
    name: 'Age-Adjusted Shock Index',
    shortName: 'ASI',
    description: 'Age-adjusted shock index = (HR/SBP) × age; also reports classic shock index and rate-pressure product.',
    category: 'emergency',
    tags: ['shock', 'trauma', 'triage', 'asi'],
    whenToUse: 'Trauma, sepsis, or hemorrhage triage when occult shock is a concern, especially in older adults.',
    whyUse: 'Age adjustment improves prediction of mortality/transfusion need vs raw shock index in some studies.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 20, max: 250, defaultValue: 100 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 250, defaultValue: 110 }),
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 110, defaultValue: 65 }),
    ],
    calculate(values) {
      const hr = num(values.hr, 100);
      const sbp = num(values.sbp, 110);
      const age = num(values.age, 65);
      if (sbp <= 0) {
        return {
          score: 0,
          label: 'Invalid SBP',
          interpretation: 'SBP must be > 0.',
          riskLevel: 'info',
        };
      }
      const si = hr / sbp;
      const asi = round(si * age, 1);
      const rpp = Math.round(hr * sbp);
      const r = riskFromThresholds(asi, [
        {
          max: 49.9,
          level: 'low',
          label: 'Lower ASI (<50)',
          interpretation: `Age-adjusted shock index ${asi}: below commonly cited threshold (~50). Still interpret with clinical exam; occult shock possible.`,
        },
        {
          max: 69.9,
          level: 'moderate',
          label: 'Elevated ASI (50–70)',
          interpretation: `Age-adjusted shock index ${asi}: elevated. Associated with higher risk of critical illness/transfusion in trauma cohorts—close monitoring.`,
        },
        {
          max: 500,
          level: 'high',
          label: 'High ASI (≥70)',
          interpretation: `Age-adjusted shock index ${asi}: high. Strong concern for hemodynamic compromise; aggressive evaluation and resuscitation.`,
        },
      ]);
      return {
        score: asi,
        ...r,
        details: [
          { label: 'Shock index (HR/SBP)', value: round(si, 2).toString() },
          { label: 'Age-adjusted SI', value: String(asi) },
          { label: 'Rate-pressure product (HR×SBP)', value: String(rpp) },
          { label: 'Classic SI normal ~', value: '0.5–0.7' },
        ],
        recommendations:
          asi >= 50
            ? ['Reassess volume status and bleeding', 'Early lactate / base deficit', 'Do not be falsely reassured by “normal” SBP in elderly']
            : ['Continue standard triage', 'Serial vitals'],
      };
    },
    evidence: {
      summary: 'Shock index = HR/SBP; age-adjusted SI multiplies by age. Thresholds near ASI ≥50 often used for trauma mortality/transfusion prediction. Rate-pressure product (HR×SBP) indexes myocardial oxygen demand.',
      formula: 'SI = HR/SBP; ASI = SI × age; RPP = HR × SBP',
      validation: 'Multiple trauma and ED studies support SI/ASI for occult shock detection; exact cutoffs vary by population.',
      references: [
        { title: 'Age-adjusted shock index in trauma risk stratification', citation: 'Zarzaur BL et al. related trauma literature; various ED validations', year: 2008, pmid: '17955559',
          doi: '10.1002/chem.200701160', },
      ],
    },
    nextSteps: [
      { condition: 'ASI ≥50 or SI ≥0.9', actions: ['Urgent workup for shock/hemorrhage', 'IV access, labs, imaging as indicated'] },
      { condition: 'Any elevation', actions: ['Serial vitals', 'Treat underlying cause'] },
    ],
    pearls: ['Beta-blockers and pacemakers blunt HR response—SI/ASI may be falsely low.'],
  },
  {
    id: 'prevent-cvd',
    name: 'Framingham-Style 10-Year Hard CHD Risk (Educational)',
    shortName: 'Framingham 10y (Edu)',
    description:
      'Educational approximation of 10-year hard CHD risk using age, sex, lipids, BP, smoking, treated HTN, and diabetes. Not the official PREVENT or Framingham calculator.',
    category: 'cardiology',
    tags: ['prevention', 'framingham', 'ascvd', 'risk', 'educational'],
    whenToUse: 'Adult primary-prevention teaching / rough risk orientation when a full official calculator is unavailable.',
    whyUse: 'Illustrates how traditional risk factors combine; for clinical decisions use validated ACC/AHA PREVENT or PCE tools.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 30, max: 79, defaultValue: 55 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 100, max: 400, step: 1, defaultValue: 200 }),
      numberInput('hdl', 'HDL cholesterol', { unit: 'mg/dL', min: 20, max: 120, step: 1, defaultValue: 50 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 80, max: 220, defaultValue: 130 }),
      yesNo('treatedHtn', 'On antihypertensive treatment', 1),
      yesNo('smoker', 'Current smoker', 1),
      yesNo('diabetes', 'Diabetes mellitus', 1),
    ],
    calculate(values) {
      // Educational simplification inspired by Wilson Framingham hard CHD point logic (not identical official tables).
      const age = num(values.age, 55);
      const sex = String(values.sex ?? 'M');
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const sbp = num(values.sbp, 130);
      const treated = bool(values.treatedHtn);
      const smoker = bool(values.smoker);
      const dm = bool(values.diabetes);

      let points = 0;

      // Age points (compressed educational scale)
      if (sex === 'M') {
        if (age < 35) points += -1;
        else if (age < 40) points += 0;
        else if (age < 45) points += 1;
        else if (age < 50) points += 2;
        else if (age < 55) points += 3;
        else if (age < 60) points += 4;
        else if (age < 65) points += 5;
        else if (age < 70) points += 6;
        else points += 7;
      } else {
        if (age < 35) points += -9;
        else if (age < 40) points += -4;
        else if (age < 45) points += 0;
        else if (age < 50) points += 3;
        else if (age < 55) points += 6;
        else if (age < 60) points += 7;
        else if (age < 65) points += 8;
        else if (age < 70) points += 8;
        else points += 8;
      }

      // Total cholesterol
      if (tc < 160) points += sex === 'M' ? -3 : -2;
      else if (tc < 200) points += 0;
      else if (tc < 240) points += sex === 'M' ? 1 : 1;
      else if (tc < 280) points += sex === 'M' ? 2 : 2;
      else points += sex === 'M' ? 3 : 3;

      // HDL
      if (hdl >= 60) points += -2;
      else if (hdl >= 50) points += -1;
      else if (hdl >= 40) points += 0;
      else points += 1;

      // SBP treated vs untreated (educational)
      if (!treated) {
        if (sbp < 120) points += sex === 'M' ? 0 : -3;
        else if (sbp < 130) points += 0;
        else if (sbp < 140) points += 1;
        else if (sbp < 160) points += 2;
        else points += 3;
      } else {
        if (sbp < 120) points += 0;
        else if (sbp < 130) points += 1;
        else if (sbp < 140) points += 2;
        else if (sbp < 160) points += 3;
        else points += 4;
      }

      if (smoker) points += sex === 'M' ? 4 : 3;
      if (dm) points += sex === 'M' ? 3 : 4;

      // Map points to approximate 10-year hard CHD % (very rough educational table)
      const riskPct = (() => {
        const p = points;
        if (sex === 'M') {
          if (p <= -1) return 1;
          if (p <= 1) return 2;
          if (p <= 3) return 3;
          if (p <= 4) return 5;
          if (p <= 5) return 7;
          if (p <= 6) return 8;
          if (p <= 7) return 10;
          if (p <= 8) return 13;
          if (p <= 9) return 16;
          if (p <= 10) return 20;
          if (p <= 11) return 25;
          if (p <= 12) return 30;
          return 35;
        }
        // Female
        if (p <= 1) return 1;
        if (p <= 4) return 2;
        if (p <= 6) return 3;
        if (p <= 7) return 4;
        if (p <= 8) return 5;
        if (p <= 9) return 6;
        if (p <= 10) return 8;
        if (p <= 11) return 11;
        if (p <= 12) return 14;
        if (p <= 13) return 17;
        if (p <= 14) return 22;
        return 27;
      })();

      const r = riskFromThresholds(riskPct, [
        {
          max: 5,
          level: 'low',
          label: 'Lower estimated risk',
          interpretation: `Educational estimate ~${riskPct}% 10-year hard CHD risk (points ${points}). Emphasize lifestyle; formal PREVENT/PCE recommended for decisions.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Borderline–intermediate',
          interpretation: `Educational estimate ~${riskPct}% 10-year hard CHD risk (points ${points}). Consider risk enhancers and formal calculator; discuss preventive therapies.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Elevated estimated risk',
          interpretation: `Educational estimate ~${riskPct}% 10-year hard CHD risk (points ${points}). Likely benefits from intensive risk-factor control; use official tool before statin/therapy decisions.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high estimated risk',
          interpretation: `Educational estimate ~${riskPct}% 10-year hard CHD risk (points ${points}). High-risk profile—aggressive prevention; confirm with validated calculator.`,
        },
      ]);

      return {
        score: riskPct,
        unit: '% / 10y (approx.)',
        ...r,
        details: [
          { label: 'Educational point total', value: String(points) },
          { label: 'Approx. 10-year hard CHD risk', value: `~${riskPct}%` },
          { label: 'Disclaimer', value: 'Not official Framingham or AHA PREVENT output' },
        ],
        recommendations: [
          'Use ACC/AHA PREVENT or published Framingham/PCE tools for clinical decisions',
          'Lifestyle: diet, activity, smoking cessation, BP and lipid control',
          dm ? 'Optimize glycemic and comprehensive CV risk care' : 'Screen/reassess diabetes risk factors',
        ],
      };
    },
    evidence: {
      summary:
        'Educational point-style approximation inspired by Framingham hard CHD risk factor weighting (age, sex, TC, HDL, SBP ± treatment, smoking, diabetes). Absolute percentages are rough teaching estimates only—not calibrated PREVENT equations.',
      formula: 'Points from age/sex/lipids/BP/smoking/DM → mapped approximate 10-year hard CHD %',
      validation: 'NOT validated as a clinical calculator. For care decisions use official AHA PREVENT (2023) or PCE/Framingham tools.',
      references: [
        { title: 'Prediction of coronary heart disease using risk factor categories (Framingham)', citation: 'Wilson PW et al. Circulation. 1998', year: 1998, pmid: '9864381',
          doi: '10.3892/ijmm.3.1.21', },
        { title: 'AHA PREVENT equations for CV risk', citation: 'Khan SS et al. Circulation. 2023', year: 2023, pmid: '37947094',
          doi: '10.1161/CIR.0000000000001191', },
      ],
    },
    nextSteps: [
      {
        condition: 'Any elevated estimate',
        actions: [
          'Confirm with official risk calculator',
          'Address smoking, BP, lipids, weight, activity',
          'Shared decision-making on statin/antihypertensive therapy per guidelines',
        ],
      },
    ],
    pearls: [
      'Hard CHD typically means MI and coronary death (not all ASCVD).',
      'This tool is labeled educational intentionally—do not chart as formal 10-year risk.',
    ],
  },
];
