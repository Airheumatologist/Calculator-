import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/**
 * Wave 8 — pulmonary / critical-care bundle: ECMO prognosis scores
 * (PRESET, RESP, SAVE, HOPE), ICU/pharmacy scores (EUROMACS-RHF, MRC-ICU,
 * SCARF), COPD exacerbation scores (DECAF, BAP-65, NIVO), pneumonia scores
 * (PIRO, PRS, Shorr), pediatric asthma scores (PARS, API, Liu), and pleural
 * scores (LENT, RAPID).
 */
export const wave8PulmIcuCalcs: Calculator[] = [
  // ─── 1. EUROMACS-RHF ───────────────────────────────────────────────────────
  {
    id: 'euromacs-rhf',
    name: 'EUROMACS-RHF Score',
    shortName: 'EUROMACS-RHF',
    description:
      'Five-item score predicting early severe right-sided heart failure after continuous-flow LVAD implantation, derived and validated in the EUROMACS registry.',
    category: 'cardiology',
    tags: ['lvad', 'right heart failure', 'euromacs', 'intermacs', 'mechanical circulatory support', 'rv failure'],
    whenToUse:
      'Adults being evaluated for continuous-flow LVAD implantation, to estimate the risk of early (<30 day) severe postoperative right-sided heart failure.',
    whyUse:
      'Early severe RHF after LVAD markedly worsens survival and ICU course. EUROMACS-RHF is derived from ~3000 registry implants and supports consent, multidisciplinary planning, and decisions about biventricular or total-heart support.',
    inputs: [
      yesNo('raPcwp', 'RA/PCWP ratio >0.54', 2, 'Right atrial pressure ÷ pulmonary capillary wedge pressure on preoperative right heart catheterization. A ratio above 0.54 signals disproportionate right-sided congestion and adds 2 points.', true),
      yesNo('hgb', 'Hemoglobin ≤10 g/dL', 1, 'Preoperative hemoglobin at or below 10 g/dL adds 1 point.', false),
      yesNo('inotropes', 'Multiple intravenous inotropes', 2.5, 'Requirement for more than one IV inotropic agent preoperatively — the single largest weight (+2.5) in the score.', true),
      yesNo('intermacs', 'INTERMACS class 1–3', 2, 'INTERMACS profile 1 (critical cardiogenic shock), 2 (progressive decline on inotropes), or 3 (stable but inotrope-dependent). Profiles 4–7 score 0.', true),
      yesNo('rvDysfxn', 'Severe RV dysfunction on echocardiography', 2, 'Semiquantitative severe right-ventricular systolic dysfunction on preoperative echocardiography.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.raPcwp) ? 2 : 0) +
        (bool(values.hgb) ? 1 : 0) +
        (bool(values.inotropes) ? 2.5 : 0) +
        (bool(values.intermacs) ? 2 : 0) +
        (bool(values.rvDysfxn) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk of early severe RHF',
          interpretation: `EUROMACS-RHF score ${score} (low band, 0–2). Lower predicted risk of early (<30 day) severe right-sided heart failure after CF-LVAD implantation.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate risk of early severe RHF',
          interpretation: `EUROMACS-RHF score ${score} (intermediate band, 2.5–4). Intermediate predicted risk of early severe RHF; optimize volume status, RV performance, and hemodynamics before implantation.`,
        },
        {
          max: 9.5,
          level: 'high',
          label: 'High risk of early severe RHF',
          interpretation: `EUROMACS-RHF score ${score} (high band, 4.5–9.5). High predicted risk of early severe RHF after LVAD — consider closer postoperative hemodynamic monitoring, RV-optimizing strategies, and discussion of biventricular or total-heart support.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–9.5)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'RA/PCWP >0.54', value: bool(values.raPcwp) ? '+2' : '0' },
          { label: 'Hemoglobin ≤10 g/dL', value: bool(values.hgb) ? '+1' : '0' },
          { label: 'Multiple IV inotropes', value: bool(values.inotropes) ? '+2.5' : '0' },
          { label: 'INTERMACS 1–3', value: bool(values.intermacs) ? '+2' : '0' },
          { label: 'Severe RV dysfunction', value: bool(values.rvDysfxn) ? '+2' : '0' },
        ],
        recommendations: [
          'Incorporate into informed consent and multidisciplinary team discussion; do not use in isolation.',
          'High-risk scores may prompt aggressive diuresis, pulmonary vasodilators, planned RV mechanical support, BiVAD, or total artificial heart consideration.',
        ],
      };
    },
    evidence: {
      summary:
        'EUROMACS-RHF assigns RA/PCWP ratio >0.54 (+2), hemoglobin ≤10 g/dL (+1), multiple IV inotropes (+2.5), INTERMACS class 1–3 (+2), and severe RV dysfunction on echo (+2); total 0–9.5. Bands: 0–2 low, 2.5–4 intermediate, 4.5–9.5 high risk of early severe post-LVAD RHF.',
      formula: 'Score = 2·[RA/PCWP>0.54] + 1·[Hgb≤10] + 2.5·[multiple inotropes] + 2·[INTERMACS 1–3] + 2·[severe RV dysfunction]',
      validation:
        'Derived (n=2000) and validated (n=988) in the EUROMACS registry; RHF incidence 21.7% and higher scores associated with lower 1- and 2-year survival. An independent single-center cohort found poor external discrimination (AUC ~0.58), so recalibration may be needed locally.',
      references: [
        {
          title: 'Derivation and Validation of a Novel Right-Sided Heart Failure Model After Implantation of Continuous Flow Left Ventricular Assist Devices: The EUROMACS Right-Sided Heart Failure Risk Score',
          citation: 'Soliman OII, Akin S, Muslem R, et al. Circulation. 2018;137(9):891-906',
          year: 2018,
          pmid: '28847897',
          doi: '10.1161/CIRCULATIONAHA.117.030543',
        },
        {
          title: 'External assessment of the EUROMACS right-sided heart failure risk score',
          citation: 'Sci Rep. 2021;11:14356',
          year: 2021,
          doi: '10.1038/s41598-021-94792-3',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–2 (low)', actions: ['Proceed with standard pre-LVAD optimization and consent process', 'Routine postoperative hemodynamic monitoring'] },
      { condition: 'Score 2.5–4 (intermediate)', actions: ['Reassess volume status and RV optimization before implant', 'Plan for early postoperative RV support escalation pathway'] },
      { condition: 'Score 4.5–9.5 (high)', actions: ['Multidisciplinary review of LVAD vs BiVAD vs total heart support', 'Consider pulmonary vasodilators, aggressive diuresis, and provisional RVAD planning'] },
    ],
    pearls: [
      'The score weighs clinical instability (INTERMACS 1–3, multiple inotropes) heavily — optimize the patient before implantation when feasible.',
      'Severe RV dysfunction is a semiquantitative echocardiographic assessment; standardize reads within your program.',
      'External single-center validation showed modest discrimination — combine with program-specific experience.',
    ],
  },

  // ─── 2. PRESET ─────────────────────────────────────────────────────────────
  {
    id: 'preset-ecmo',
    name: 'PRESET Score (Prediction of Survival on ECMO Therapy)',
    shortName: 'PRESET',
    description:
      'Five-variable score predicting ICU mortality in ARDS patients considered for veno-venous ECMO, using admission pHa, MAP, lactate, platelets, and pre-ECMO hospital days.',
    category: 'critical-care',
    tags: ['ecmo', 'vv-ecmo', 'ards', 'preset', 'survival prediction', 'extracorporeal'],
    whenToUse:
      'Adults with severe ARDS being evaluated for (or just prior to initiation of) VV-ECMO, to estimate probability of ICU survival.',
    whyUse:
      'PRESET uses five routinely available admission variables and showed good discrimination in internal and external validation cohorts; it can complement (not replace) multidisciplinary ECMO candidacy decisions and goals-of-care discussions.',
    inputs: [
      numberInput('map', 'Mean arterial pressure', {
        unit: 'mmHg',
        min: 30,
        max: 160,
        exampleValue: 85,
        helpText: 'Worst/most representative MAP at evaluation. >100: 0; 91–100: +1; 81–90: +2; 71–80: +3; ≤70: +4.',
      }),
      numberInput('lactate', 'Lactate concentration', {
        unit: 'mmol/L',
        min: 0.3,
        max: 30,
        step: 0.1,
        exampleValue: 4.5,
        helpText: '≤1.50: 0; 1.51–3.00: +1; 3.01–6.00: +2; 6.01–10.00: +3; >10.00: +4.',
      }),
      numberInput('pha', 'Arterial pH (pHa)', {
        unit: 'pH units',
        min: 6.8,
        max: 7.7,
        step: 0.01,
        exampleValue: 7.22,
        helpText: '>7.300: 0; 7.201–7.300: +1; 7.101–7.200: +2; ≤7.100: +3.',
      }),
      numberInput('platelets', 'Platelet concentration', {
        unit: '×10³ cells/µL',
        min: 1,
        max: 1000,
        exampleValue: 150,
        helpText: '>200: 0; 101–200: +1; ≤100: +2 (values in thousands per µL).',
      }),
      numberInput('hospDays', 'Hospital days before ECMO', {
        unit: 'days',
        min: 0,
        max: 60,
        exampleValue: 4,
        helpText: 'Days in hospital before ECMO initiation. ≤2: 0; 3–7: +1; >7: +2.',
      }),
    ],
    calculate(values) {
      const map = num(values.map, 85);
      const lac = num(values.lactate, 4.5);
      const ph = num(values.pha, 7.22);
      const plt = num(values.platelets, 150);
      const days = num(values.hospDays, 4);
      const mapPts = map > 100 ? 0 : map > 90 ? 1 : map > 80 ? 2 : map > 70 ? 3 : 4;
      const lacPts = lac <= 1.5 ? 0 : lac <= 3 ? 1 : lac <= 6 ? 2 : lac <= 10 ? 3 : 4;
      const phPts = ph > 7.3 ? 0 : ph > 7.2 ? 1 : ph > 7.1 ? 2 : 3;
      const pltPts = plt > 200 ? 0 : plt > 100 ? 1 : 2;
      const dayPts = days <= 2 ? 0 : days <= 7 ? 1 : 2;
      const score = mapPts + lacPts + phPts + pltPts + dayPts;
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'PRESET class I',
          interpretation: `PRESET score ${score} — class I (0–5): ~26% ICU mortality (~74% survival) in the derivation/validation cohorts. Favorable predicted survival if the patient is otherwise an ECMO candidate.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'PRESET class II',
          interpretation: `PRESET score ${score} — class II (6–9): ~68% ICU mortality (~32% survival). Intermediate prognosis; weigh candidacy carefully and engage in goals-of-care discussion.`,
        },
        {
          max: 15,
          level: 'critical',
          label: 'PRESET class III',
          interpretation: `PRESET score ${score} — class III (10–15): ~93% ICU mortality. Very poor predicted survival; ECMO unlikely to confer benefit in the published cohorts — multidisciplinary review and explicit goals-of-care conversation recommended.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–15)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'MAP points', value: `+${mapPts} (MAP ${map} mmHg)` },
          { label: 'Lactate points', value: `+${lacPts} (${lac} mmol/L)` },
          { label: 'pHa points', value: `+${phPts} (pH ${ph})` },
          { label: 'Platelet points', value: `+${pltPts} (${plt} ×10³/µL)` },
          { label: 'Pre-ECMO days points', value: `+${dayPts} (${days} days)` },
        ],
        recommendations: [
          'Use alongside clinical parameters and specialist expertise — no single score should be the sole determinant of ECMO candidacy.',
          'Incorporate results into ECMO planning and goals-of-care conversations including therapy limitations and alternatives.',
        ],
      };
    },
    evidence: {
      summary:
        'PRESET combines admission pHa (0–3), MAP (0–4), lactate (0–4), platelets (0–2), and pre-ECMO hospital days (0–2) into a 0–15 score. Classes: I (0–5) ~26% ICU mortality, II (6–9) ~68%, III (10–15) ~93%.',
      formula:
        'MAP: >100→0, 91–100→1, 81–90→2, 71–80→3, ≤70→4. Lactate: ≤1.5→0, 1.51–3→1, 3.01–6→2, 6.01–10→3, >10→4. pHa: >7.3→0, 7.201–7.3→1, 7.101–7.2→2, ≤7.1→3. Platelets (×10³/µL): >200→0, 101–200→1, ≤100→2. Hospital days: ≤2→0, 3–7→1, >7→2.',
      validation:
        'Derived in 108 VV-ECMO ARDS patients (Essen, 2010–2015) with internal (n=82, AUC 0.845) and external (n=59, AUC 0.70) validation; outperformed ECMOnet, RESP, PRESERVE, and Roch scores in that dataset. Independent COVID-era comparisons favored RESP for discrimination.',
      references: [
        {
          title: 'Comparison of mortality prediction models in acute respiratory distress syndrome undergoing extracorporeal membrane oxygenation and development of a novel prediction score: the PREdiction of Survival on ECMO Therapy-Score (PRESET-Score)',
          citation: 'Hilder M, Herbstreit F, Adamzik M, et al. Crit Care. 2017;21(1):301',
          year: 2017,
          pmid: '29233160',
          doi: '10.1186/s13054-017-1888-6',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I (0–5)', actions: ['Favorable predicted survival — proceed with ECMO evaluation if otherwise a candidate', 'Standard VV-ECMO candidacy workup'] },
      { condition: 'Class II (6–9)', actions: ['Multidisciplinary candidacy discussion', 'Document goals of care and therapy limitations before cannulation'] },
      { condition: 'Class III (10–15)', actions: ['Very high predicted mortality — senior ECMO team review', 'Explicit goals-of-care discussion including palliative alternatives'] },
    ],
    pearls: [
      'All five variables are available at the bedside at the time of referral — no imaging or echo required.',
      'Longer pre-ECMO hospitalization (>7 days) independently worsens predicted survival — early referral to an ECMO center matters.',
      'PRESET was derived pre-COVID in VV-ECMO ARDS; RESP outperformed it in several external validations.',
    ],
  },

  // ─── 3. RESP ───────────────────────────────────────────────────────────────
  {
    id: 'resp-score',
    name: 'RESP Score (Respiratory ECMO Survival Prediction)',
    shortName: 'RESP',
    description:
      'ELSO-registry–derived score predicting in-hospital survival after VV-ECMO for severe acute respiratory failure, using 12 pre-ECMO variables.',
    category: 'critical-care',
    tags: ['ecmo', 'vv-ecmo', 'ards', 'resp', 'elso', 'survival prediction'],
    whenToUse:
      'Adults with severe acute respiratory failure being considered for VV-ECMO, calculated with data available before cannulation.',
    whyUse:
      'RESP stratifies expected hospital survival into five risk classes from the international ELSO registry; it outperformed most comparators in validations and can support candidacy, benchmarking, and family counseling.',
    inputs: [
      numberInput('age', 'Age', {
        unit: 'years',
        min: 18,
        max: 100,
        exampleValue: 55,
        helpText: '18–49: 0; 50–59: −2; ≥60: −3.',
      }),
      yesNo('immuno', 'Immunocompromised at time of ECMO', -2, 'Any malignancy, solid organ transplant, HIV, or cirrhosis at the time ECMO is initiated (−2).', false),
      selectInput('ventDays', 'Mechanically ventilated before ECMO', [
        { label: '>7 days', value: 'gt7', points: 0 },
        { label: '48 hours to 7 days', value: '2to7', points: 1 },
        { label: '<48 hours', value: 'lt2', points: 3 },
      ], '2to7', 'Duration of invasive mechanical ventilation before ECMO initiation; earlier cannulation scores higher.'),
      selectInput('diagnosis', 'Primary diagnosis leading to ECMO', [
        { label: 'Viral pneumonia', value: 'viral', points: 3 },
        { label: 'Bacterial pneumonia', value: 'bacterial', points: 3 },
        { label: 'Asthma', value: 'asthma', points: 11 },
        { label: 'Trauma or burn', value: 'trauma', points: 3 },
        { label: 'Aspiration pneumonitis', value: 'aspiration', points: 5 },
        { label: 'Other acute respiratory diagnosis', value: 'other_acute', points: 1 },
        { label: 'Nonrespiratory or chronic respiratory diagnosis', value: 'nonresp', points: 0 },
      ], 'viral', 'Diagnosis group most responsible for respiratory failure. Asthma carries the highest survival weight (+11); nonrespiratory/chronic diagnoses score 0.'),
      yesNo('cns', 'History of CNS dysfunction', -7, 'Neurotrauma, stroke, encephalopathy, cerebral embolism, or seizure/epilepsy — the largest negative weight (−7).', false),
      yesNo('nonpulmInf', 'Acute associated nonpulmonary infection', -3, 'Any bacterial, viral, parasitic, or fungal infection not involving the lung (−3).', false),
      yesNo('nmb', 'Neuromuscular blockade before ECMO', 1, 'Neuromuscular blocking agents used before ECMO initiation (+1).', false),
      yesNo('nitric', 'Nitric oxide (iNO) before ECMO', -1, 'Inhaled nitric oxide used before ECMO initiation (−1).', false),
      yesNo('bicarb', 'Bicarbonate infusion before ECMO', -2, 'IV bicarbonate infusion administered before ECMO (−2).', false),
      yesNo('arrest', 'Cardiac arrest before ECMO', -2, 'Cardiac arrest occurring before ECMO initiation (−2).', false),
      yesNo('paco2', 'PaCO₂ ≥75 mmHg (≥10 kPa)', -1, 'Most recent arterial PaCO₂ at or above 75 mmHg before ECMO (−1).', false),
      yesNo('pip', 'Peak inspiratory pressure ≥42 cm H₂O', -1, 'Peak inspiratory pressure at or above 42 cm H₂O (≥4.1 kPa) before ECMO (−1).', false),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const agePts = age >= 60 ? -3 : age >= 50 ? -2 : 0;
      const dxPts: Record<string, number> = {
        viral: 3, bacterial: 3, asthma: 11, trauma: 3, aspiration: 5, other_acute: 1, nonresp: 0,
      };
      const ventPts = str(values.ventDays) === 'lt2' ? 3 : str(values.ventDays) === '2to7' ? 1 : 0;
      const score =
        agePts +
        (bool(values.immuno) ? -2 : 0) +
        ventPts +
        (dxPts[str(values.diagnosis)] ?? 0) +
        (bool(values.cns) ? -7 : 0) +
        (bool(values.nonpulmInf) ? -3 : 0) +
        (bool(values.nmb) ? 1 : 0) +
        (bool(values.nitric) ? -1 : 0) +
        (bool(values.bicarb) ? -2 : 0) +
        (bool(values.arrest) ? -2 : 0) +
        (bool(values.paco2) ? -1 : 0) +
        (bool(values.pip) ? -1 : 0);
      let cls: string;
      let surv: string;
      let level: 'low' | 'moderate' | 'high' | 'critical';
      if (score >= 6) { cls = 'I'; surv = '92%'; level = 'low'; }
      else if (score >= 3) { cls = 'II'; surv = '76%'; level = 'low'; }
      else if (score >= -1) { cls = 'III'; surv = '57%'; level = 'moderate'; }
      else if (score >= -5) { cls = 'IV'; surv = '33%'; level = 'high'; }
      else { cls = 'V'; surv = '18%'; level = 'critical'; }
      return {
        score,
        unit: 'points (−22 to +15)',
        label: `Risk class ${cls}`,
        interpretation: `RESP score ${score} → class ${cls}: estimated in-hospital survival ~${surv} in the ELSO derivation cohort.`,
        riskLevel: level,
        details: [
          { label: 'Risk class', value: `${cls} (survival ~${surv})` },
          { label: 'Age points', value: `${agePts} (age ${age})` },
          { label: 'Ventilation-duration points', value: `${ventPts}` },
          { label: 'Diagnosis points', value: `${dxPts[str(values.diagnosis)] ?? 0}` },
        ],
        recommendations: [
          'Class IV–V scores warrant explicit multidisciplinary candidacy review and family discussion of expected benefit.',
          'Survival prediction is only one factor in ECMO decisions — life expectancy, quality of life, and resource availability also matter.',
        ],
      };
    },
    evidence: {
      summary:
        'RESP sums 12 pre-ECMO variables: age (0/−2/−3), immunocompromise (−2), ventilation <48 h (+3) or 48 h–7 d (+1), diagnosis (asthma +11, aspiration +5, viral/bacterial/trauma +3, other acute +1, nonrespiratory 0), CNS dysfunction (−7), nonpulmonary infection (−3), neuromuscular blockade (+1), nitric oxide (−1), bicarbonate infusion (−2), cardiac arrest (−2), PaCO₂ ≥75 (−1), PIP ≥42 (−1). Classes: I ≥6 (92% survival), II 3–5 (76%), III −1 to 2 (57%), IV −5 to −2 (33%), V ≤−6 (18%).',
      formula: 'Sum of 12 weighted pre-ECMO items (range −22 to +15)',
      validation:
        'Derived from 2,355 ELSO-registry patients (c-statistic 0.74) with excellent discrimination (c=0.92) in a 140-patient external validation; multiple independent validations (including COVID-19 cohorts) confirmed better performance than most comparators.',
      references: [
        {
          title: 'Predicting Survival after Extracorporeal Membrane Oxygenation for Severe Acute Respiratory Failure. The Respiratory Extracorporeal Membrane Oxygenation Survival Prediction (RESP) Score',
          citation: 'Schmidt M, Bailey M, Sheldrake J, et al. Am J Respir Crit Care Med. 2014;189(11):1374-1382',
          year: 2014,
          pmid: '24693864',
          doi: '10.1164/rccm.201311-2023OC',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I–III', actions: ['Reasonable predicted survival — proceed with ECMO evaluation', 'Optimize pre-cannulation physiology (avoid arrest, limit pre-ECMO ventilation duration)'] },
      { condition: 'Class IV–V', actions: ['Senior ECMO team and multidisciplinary review', 'Goals-of-care discussion; document shared decision-making'] },
    ],
    pearls: [
      'Cannulating before 48 h of ventilation (+3) and avoiding pre-ECMO arrest/bicarbonate are modifiable survival predictors — refer early.',
      'CNS dysfunction is the single largest penalty (−7); confirm the neurologic history carefully.',
      'The asthma diagnosis group (+11) reflects the historically excellent VV-ECMO outcomes in refractory asthma.',
    ],
  },

  // ─── 4. SAVE ───────────────────────────────────────────────────────────────
  {
    id: 'save-score',
    name: 'SAVE Score (Survival After Veno-Arterial ECMO)',
    shortName: 'SAVE',
    description:
      'ELSO-registry–derived score predicting in-hospital survival after VA-ECMO for refractory cardiogenic shock; total = item points minus 6.',
    category: 'critical-care',
    tags: ['ecmo', 'va-ecmo', 'cardiogenic shock', 'save', 'elso', 'ecpr'],
    whenToUse:
      'Adults with refractory cardiogenic shock being considered for VA-ECMO, using variables available before cannulation.',
    whyUse:
      'SAVE stratifies expected hospital survival into five classes from the ELSO registry and supports candidacy discussions, family counseling, and center benchmarking.',
    inputs: [
      numberInput('age', 'Age', {
        unit: 'years',
        min: 18,
        max: 100,
        exampleValue: 55,
        helpText: '18–38: +7; 39–52: +4; 53–62: +3; ≥63: 0.',
      }),
      numberInput('weight', 'Weight', {
        unit: 'kg',
        unitKind: 'weight',
        min: 30,
        max: 250,
        exampleValue: 75,
        helpText: '<65 kg: +1; 65–89 kg: +2; >89 kg: 0.',
      }),
      yesNo('myocarditis', 'Myocarditis (etiology of shock)', 3, 'Cardiogenic shock due to acute myocarditis (+3). If another etiology applies, leave No.', false),
      yesNo('vtvf', 'Refractory VT/VF (etiology of shock)', 2, 'Cardiogenic shock due to refractory ventricular tachycardia/fibrillation (+2).', false),
      yesNo('transplant', 'Post heart or lung transplantation', 3, 'Cardiogenic shock after heart or lung transplantation (+3).', false),
      yesNo('chd', 'Congenital heart disease (etiology of shock)', -3, 'Cardiogenic shock related to congenital heart disease (−3).', false),
      yesNo('arf', 'Acute renal failure', -3, 'Acute renal insufficiency (e.g., creatinine >1.5 mg/dL / 132.6 µmol/L) with or without renal replacement therapy (−3).', false),
      yesNo('crf', 'Chronic renal failure', -6, 'Kidney damage or GFR <60 mL/min/1.73 m² for ≥3 months (−6).', false),
      numberInput('hco3', 'Serum HCO₃ before ECMO (worst within 6 h)', {
        unit: 'mmol/L',
        min: 2,
        max: 45,
        step: 0.5,
        exampleValue: 18,
        helpText: 'Worst value within 6 hours before cannulation. ≤15 mmol/L scores −3.',
      }),
      selectInput('intubHrs', 'Duration of intubation before ECMO', [
        { label: '≤10 hours', value: 'le10', points: 0 },
        { label: '11–29 hours', value: '11to29', points: -2 },
        { label: '≥30 hours', value: 'ge30', points: -4 },
      ], 'le10', 'Hours of invasive mechanical ventilation before ECMO initiation.'),
      yesNo('pip20', 'Peak inspiratory pressure ≤20 cm H₂O', 3, 'Peak inspiratory pressure at or below 20 cm H₂O before ECMO (+3).', true),
      yesNo('arrest', 'Pre-ECMO cardiac arrest', -2, 'Cardiac arrest before ECMO cannulation (−2).', false),
      numberInput('dbp', 'Diastolic BP before ECMO (worst within 6 h)', {
        unit: 'mmHg',
        min: 10,
        max: 150,
        exampleValue: 45,
        helpText: 'Worst diastolic blood pressure within 6 hours before cannulation. ≥40 mmHg scores +3.',
      }),
      numberInput('pulsePressure', 'Pulse pressure before ECMO (worst within 6 h)', {
        unit: 'mmHg',
        min: 0,
        max: 120,
        exampleValue: 25,
        helpText: 'Worst pulse pressure (SBP − DBP) within 6 hours before cannulation. ≤20 mmHg scores −2.',
      }),
      yesNo('liver', 'Liver failure', -3, 'Bilirubin ≥33 µmol/L (1.9 mg/dL) or AST/ALT >70 U/L (−3).', false),
      yesNo('cns', 'CNS dysfunction', -3, 'Neurotrauma, stroke, encephalopathy, cerebral embolism, or seizure/epileptic syndromes (−3).', false),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const agePts = age <= 38 ? 7 : age <= 52 ? 4 : age <= 62 ? 3 : 0;
      const wt = num(values.weight, 75);
      const wtPts = wt < 65 ? 1 : wt <= 89 ? 2 : 0;
      const intubPts = str(values.intubHrs) === 'ge30' ? -4 : str(values.intubHrs) === '11to29' ? -2 : 0;
      const itemSum =
        agePts +
        wtPts +
        (bool(values.myocarditis) ? 3 : 0) +
        (bool(values.vtvf) ? 2 : 0) +
        (bool(values.transplant) ? 3 : 0) +
        (bool(values.chd) ? -3 : 0) +
        (bool(values.arf) ? -3 : 0) +
        (bool(values.crf) ? -6 : 0) +
        (num(values.hco3, 18) <= 15 ? -3 : 0) +
        intubPts +
        (bool(values.pip20) ? 3 : 0) +
        (bool(values.arrest) ? -2 : 0) +
        (num(values.dbp, 45) >= 40 ? 3 : 0) +
        (num(values.pulsePressure, 25) <= 20 ? -2 : 0) +
        (bool(values.liver) ? -3 : 0) +
        (bool(values.cns) ? -3 : 0);
      const score = itemSum - 6;
      let cls: string;
      let surv: string;
      let level: 'low' | 'moderate' | 'high' | 'critical';
      if (score > 5) { cls = 'I'; surv = '75%'; level = 'low'; }
      else if (score >= 1) { cls = 'II'; surv = '58%'; level = 'moderate'; }
      else if (score >= -4) { cls = 'III'; surv = '42%'; level = 'moderate'; }
      else if (score >= -9) { cls = 'IV'; surv = '30%'; level = 'high'; }
      else { cls = 'V'; surv = '18%'; level = 'critical'; }
      return {
        score,
        unit: 'points (−35 to +17)',
        label: `Risk class ${cls}`,
        interpretation: `SAVE score ${score} (items ${itemSum} − 6) → class ${cls}: estimated in-hospital survival ~${surv} in the ELSO derivation cohort.`,
        riskLevel: level,
        details: [
          { label: 'Risk class', value: `${cls} (survival ~${surv})` },
          { label: 'Age points', value: `${agePts} (age ${age})` },
          { label: 'Weight points', value: `${wtPts} (${wt} kg)` },
          { label: 'Intubation-duration points', value: `${intubPts}` },
          { label: 'Constant', value: '−6 (applied to every SAVE calculation)' },
        ],
        recommendations: [
          'Class IV–V scores warrant explicit multidisciplinary review and family discussion of expected benefit and alternatives.',
          'A SAVE score of ~0 corresponds to roughly 50% survival; use it as one input into candidacy — not a sole gatekeeper.',
        ],
      };
    },
    evidence: {
      summary:
        'SAVE = (age + weight + etiology + renal/respiratory/cardiac/organ-failure item points) − 6. Classes: I >5 (75% survival), II 1–5 (58%), III −4 to 0 (42%), IV −9 to −5 (30%), V ≤−10 (18%).',
      formula: 'Score = Σ(item points) − 6 (range −35 to +17)',
      validation:
        'Derived from 3,846 ELSO-registry VA-ECMO patients (AUROC 0.68) with excellent discrimination in an Australian external validation (AUROC 0.90); later North American single-center validations showed good but more modest performance.',
      references: [
        {
          title: 'Predicting survival after ECMO for refractory cardiogenic shock: the survival after veno-arterial-ECMO (SAVE)-score',
          citation: 'Schmidt M, Burrell A, Roberts L, et al. Eur Heart J. 2015;36(33):2246-2256',
          year: 2015,
          pmid: '26033984',
          doi: '10.1093/eurheartj/ehv194',
        },
        {
          title: 'Predicting Survival After VA-ECMO for Refractory Cardiogenic Shock: Validating the SAVE Score',
          citation: 'CJC Open. 2021;3(1):71-81',
          year: 2021,
          doi: '10.1016/j.cjco.2020.09.011',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I–III', actions: ['Reasonable predicted survival — proceed with VA-ECMO evaluation', 'Optimize pre-cannulation status (hemodynamics, acidosis) where time permits'] },
      { condition: 'Class IV–V', actions: ['Senior multidisciplinary review of candidacy vs alternatives', 'Goals-of-care discussion; document shared decision-making'] },
    ],
    pearls: [
      'Remember the −6 constant — it applies to every calculation and is easy to omit.',
      'Worst hemodynamic values (DBP, pulse pressure, HCO₃) are taken within 6 hours before cannulation.',
      'Myocarditis and post-transplant etiologies are protective; congenital heart disease, CKD, and cardiac arrest are heavily penalized.',
    ],
  },

  // ─── 5. HOPE ───────────────────────────────────────────────────────────────
  {
    id: 'hope-score',
    name: 'HOPE Score (Hypothermia Outcome Prediction after ECLS)',
    shortName: 'HOPE',
    description:
      'Logistic model estimating survival probability after ECLS rewarming of accidental-hypothermia cardiac arrest patients; a <10% predicted survival suggests ECLS is unlikely to help.',
    category: 'critical-care',
    tags: ['hypothermia', 'cardiac arrest', 'ecls', 'ecmo', 'ecpr', 'avalanche', 'hope'],
    whenToUse:
      'Patients in cardiac arrest from accidental hypothermia being considered for extracorporeal life support (ECLS) rewarming.',
    whyUse:
      'HOPE discriminates survival far better than serum potassium alone (AUROC ~0.9) and was externally validated; a <10% predicted survival had a 97% negative predictive value for nonsurvival in validation.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'M', 'Entered as male = 1, female = 0 in the published equation (male sex lowers predicted survival).'),
      yesNo('asphyxia', 'Hypothermia with asphyxia', null, 'Asphyxia-related cooling (e.g., drowning with head fully covered, or avalanche burial with likely asphyxiation). For witnessed-arrest avalanche victims buried >60 min or when asphyxia is doubtful, use the non-asphyxia scenario to avoid underestimating survival.', false),
      numberInput('age', 'Age', {
        unit: 'years',
        min: 1,
        max: 110,
        exampleValue: 45,
        helpText: 'Age in years; entered linearly in the model (coefficient −0.0191/year).',
      }),
      numberInput('potassium', 'Serum potassium', {
        unit: 'mmol/L',
        min: 1,
        max: 20,
        step: 0.1,
        exampleValue: 5.5,
        helpText: 'Admission serum potassium; the derivation truncated values at 9 mmol/L (applied here as min(K, 9)).',
      }),
      numberInput('cpr', 'CPR duration', {
        unit: 'minutes',
        min: 0,
        max: 600,
        exampleValue: 60,
        helpText: 'Time from initiation of CPR to start of ECLS; enters as log₂(duration). A 1-minute floor is applied to avoid a zero logarithm.',
      }),
      numberInput('temp', 'Core temperature', {
        unit: '°C',
        min: 5,
        max: 36,
        step: 0.1,
        exampleValue: 26,
        helpText: 'Core temperature at admission (prehospital temperature if core measurement unavailable); enters with linear and quadratic terms.',
      }),
    ],
    calculate(values) {
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const asph = bool(values.asphyxia) ? 1 : 0;
      const age = num(values.age, 45);
      const k = Math.min(num(values.potassium, 5.5), 9);
      const cpr = Math.max(num(values.cpr, 60), 1);
      const t = num(values.temp, 26);
      const x =
        2.44 -
        1.55 * male -
        1.95 * asph -
        0.0191 * age -
        2.07 * Math.log2(k) -
        0.573 * Math.log2(cpr) +
        0.937 * t -
        0.0247 * t * t;
      const p = Math.exp(x) / (1 + Math.exp(x));
      const pct = round(Math.max(0, Math.min(100, p * 100)), 1);
      const favorable = pct >= 10;
      return {
        score: pct,
        unit: '% predicted survival',
        label: favorable ? 'Predicted survival ≥10%' : 'Predicted survival <10%',
        interpretation: favorable
          ? `HOPE estimated survival ${pct}% — ECLS rewarming may confer benefit; notify an ECLS-capable center and continue high-quality CPR, warming, and transport.`
          : `HOPE estimated survival ${pct}% (<10%) — ECLS is unlikely to confer benefit in published cohorts (NPV 97% in external validation); consider withholding ECLS absent other favorable factors and discuss goals of care.`,
        riskLevel: favorable ? 'moderate' : 'critical',
        details: [
          { label: 'Linear predictor (x)', value: `${round(x, 2)}` },
          { label: 'Sex / asphyxia', value: `${male ? 'Male' : 'Female'} / ${asph ? 'Asphyxia' : 'No asphyxia'}` },
          { label: 'Potassium used', value: `${k} mmol/L (truncated at 9)` },
          { label: 'CPR duration used', value: `${cpr} min` },
          { label: 'Temperature', value: `${t} °C` },
        ],
        recommendations: favorable
          ? [
              'Alert an ECLS-capable center early and continue mechanical/manual CPR, warmed IV fluids, and insulation during transfer.',
              'Document all six variables and the clinical rationale for the decision.',
            ]
          : [
              'Consider conventional rewarming and prognostically guided resuscitation instead of ECLS.',
              'No prediction tool dictates management alone — integrate clinical judgment and consult hypothermia/ECLS guidelines.',
            ],
        alerts: pct < 10 ? ['Predicted survival <10% — published data suggest ECLS is unlikely to confer benefit; urgent goals-of-care review.'] : undefined,
      };
    },
    evidence: {
      summary:
        'HOPE is a logistic model over six admission variables: x = 2.44 − 1.55·male − 1.95·asphyxia − 0.0191·age − 2.07·log₂(K) − 0.573·log₂(CPR min) + 0.937·T − 0.0247·T²; survival = eˣ/(1+eˣ). Serum potassium is truncated at 9 mmol/L in the model.',
      formula: 'Survival% = eˣ/(1+eˣ)×100 with x = 2.44 − 1.55·(male) − 1.95·(asphyxia) − 0.0191·(age) − 2.07·log₂(K) − 0.573·log₂(CPR) + 0.937·(T°C) − 0.0247·(T°C)²',
      validation:
        'Derived in 286 hypothermic arrest patients (AUROC 0.895 vs 0.774 for potassium alone) and externally validated in 122 patients (AUROC 0.825, good calibration; NPV of a <10% cutoff = 97%). Potassium truncation at 9 mmol/L and the log₂ transforms follow the published equation; a 1-minute CPR floor is an implementation safeguard for log₂(0).',
      references: [
        {
          title: 'Hypothermia outcome prediction after extracorporeal life support for hypothermic cardiac arrest patients: The HOPE score',
          citation: 'Pasquier M, Hugli O, Paal P, et al. Resuscitation. 2018;126:58-64',
          year: 2018,
          pmid: '29481910',
          doi: '10.1016/j.resuscitation.2018.02.026',
        },
        {
          title: 'Hypothermia outcome prediction after extracorporeal life support for hypothermic cardiac arrest patients: An external validation of the HOPE score',
          citation: 'Pasquier M, Rousson V, Darocha T, et al. Resuscitation. 2019;139:45-52',
          year: 2019,
          pmid: '30940473',
          doi: '10.1016/j.resuscitation.2019.03.017',
        },
      ],
    },
    nextSteps: [
      { condition: 'Survival probability ≥10%', actions: ['Notify an ECLS-capable center', 'Continue CPR, warming, insulation during transfer', 'Activate institutional ECLS rewarming protocol'] },
      { condition: 'Survival probability <10%', actions: ['Discuss goals of care', 'Consider conventional rewarming and guided resuscitation', 'Document rationale if ECLS withheld or pursued despite score'] },
    ],
    pearls: [
      'For avalanche victims buried >60 minutes with witnessed arrest — or whenever asphyxia is in doubt — calculate with the non-asphyxia scenario to avoid underestimating survival.',
      'Potassium is truncated at 9 mmol/L in the model; extreme hyperkalemia does not further lower the estimate.',
      'HOPE outperforms potassium-only triage (AUROC ~0.9 vs ~0.77) — do not rely on a single potassium cutoff.',
    ],
  },

  // ─── 6. MRC-ICU ────────────────────────────────────────────────────────────
  {
    id: 'mrc-icu',
    name: 'MRC-ICU Score (Medication Regimen Complexity–Intensive Care Unit)',
    shortName: 'MRC-ICU',
    description:
      '38-item weighted count of medications and devices quantifying ICU medication-regimen complexity; correlates with mortality, ICU length of stay, fluid overload, and pharmacist workload.',
    category: 'critical-care',
    tags: ['pharmacy', 'medication', 'mrc-icu', 'icu', 'polypharmacy', 'clinical pharmacist'],
    whenToUse:
      'Critically ill patients, most often scored at the 24-hour mark after ICU admission, to quantify medication-regimen complexity.',
    whyUse:
      'Higher MRC-ICU scores are associated with inpatient mortality, longer ICU stay, fluid overload, and greater pharmacist workload — useful for triaging clinical pharmacy resources and supplementing severity scores.',
    inputs: [
      numberInput('aminoglycosides', 'Aminoglycosides (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Number of aminoglycoside orders (amikacin, gentamicin, tobramycin). 3 points each.' }),
      yesNo('amphotericin', 'Amphotericin B (any formulation)', 1, 'Amphotericin B or liposomal amphotericin B (+1).', false),
      numberInput('antiarrhythmics', 'Antiarrhythmics (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Amiodarone, dofetilide, sotalol. 1 point each.' }),
      numberInput('oralAnticoag', 'Oral anticoagulants (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Direct oral anticoagulants, fondaparinux. 1 point each. Heparin infusion/enoxaparin are scored separately.' }),
      numberInput('anticonvulsants', 'Anticonvulsants (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Carbamazepine, phenobarbital, phenytoin, valproic acid. 3 points each.' }),
      yesNo('argatroban', 'Argatroban', 2, 'Argatroban infusion (+2).', false),
      numberInput('azoles', 'Azole antifungals (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Posaconazole, voriconazole. 2 points each.' }),
      numberInput('bloodProducts', 'Blood factor products (count)', { min: 0, max: 10, exampleValue: 0, helpText: 'Factor products, antithrombin III. 2 points each.' }),
      numberInput('chemo', 'Chemotherapy agents (count)', { min: 0, max: 10, exampleValue: 0, helpText: 'Active inpatient chemotherapy. 3 points each.' }),
      yesNo('clozapine', 'Clozapine', 3, 'Clozapine (+3).', false),
      yesNo('digoxin', 'Digoxin', 3, 'Digoxin (+3).', false),
      numberInput('ganciclovir', 'Ganciclovir/valganciclovir (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Ganciclovir or valganciclovir. 1 point each.' }),
      numberInput('hyperosmolar', 'Hyperosmolar fluids (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Hypertonic saline (1.5%, 3%, 23.4%), mannitol. 1 point each.' }),
      numberInput('immunosupp', 'Immunosuppressants (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Cyclosporine, sirolimus, tacrolimus. 3 points each.' }),
      yesNo('lidocaine', 'Lidocaine continuous infusion', 2, 'Lidocaine given as a continuous infusion (+2).', false),
      yesNo('lithium', 'Lithium', 3, 'Lithium (+3).', false),
      numberInput('prostacyclins', 'Prostacyclins (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Epoprostenol, iloprost, treprostinil. 2 points each.' }),
      yesNo('theophylline', 'Theophylline', 3, 'Theophylline (+3).', false),
      numberInput('therapeuticHeparins', 'Therapeutic heparins (count)', { min: 0, max: 5, exampleValue: 0, helpText: 'Therapeutic-dose enoxaparin or heparin infusion. 2 points each. VTE prophylaxis is scored separately.' }),
      yesNo('vancomycin', 'Vancomycin IV', 3, 'Intravenous vancomycin (+3).', true),
      yesNo('warfarin', 'Warfarin', 3, 'Warfarin (+3).', false),
      yesNo('nmb', 'Neuromuscular blockade', 2, 'Continuous or scheduled neuromuscular blocking agents (+2).', false),
      numberInput('contInfusions', 'Other continuous infusions (count)', { min: 0, max: 15, exampleValue: 1, helpText: 'Continuous infusions not listed elsewhere (e.g., vasopressors, inotropes, insulin, fluids). 1 point each.' }),
      yesNo('tpnNonPharm', 'Parenteral nutrition — non-pharmacist managed', 1, 'TPN managed by a non-pharmacist service (+1). Choose at most one TPN option.', false),
      yesNo('tpnPharm', 'Parenteral nutrition — clinical pharmacist managed', 3, 'TPN managed by a clinical specialist pharmacist (+3). Choose at most one TPN option.', false),
      yesNo('vtePpx', 'Thromboembolic prophylaxis', 1, 'VTE prophylaxis (exclude heparin infusion and therapeutic enoxaparin, which score above).', true),
      yesNo('sup', 'Stress ulcer prophylaxis', 1, 'Stress ulcer prophylaxis; exclude pantoprazole infusion (+1).', true),
      yesNo('glycemic', 'Glycemic control — subcutaneous insulin', 1, 'Subcutaneous insulin regimen; exclude IV insulin (+1).', false),
      yesNo('bowel', 'Bowel regimen', 1, 'Scheduled bowel regimen (+1).', false),
      yesNo('chlorhexidine', 'Chlorhexidine', 1, 'Chlorhexidine oral care (+1).', false),
      numberInput('opioidsSedatives', 'Opioids/sedatives, scheduled or PRN (count)', { min: 0, max: 15, exampleValue: 1, helpText: 'Scheduled and PRN opioids and sedatives. 1 point each.' }),
      numberInput('ciSedatives', 'Continuous-infusion opioids/sedatives (count)', { min: 0, max: 8, exampleValue: 1, helpText: 'Propofol, fentanyl, dexmedetomidine, ketamine, benzodiazepine infusions. 2 points each.' }),
      numberInput('antimicrobials', 'Antimicrobials (count)', { min: 0, max: 15, exampleValue: 2, helpText: 'Antimicrobials including HIV medications, excluding agents listed elsewhere. 1 point each.' }),
      numberInput('restrictedAbx', 'Restricted antimicrobials (count)', { min: 0, max: 10, exampleValue: 1, helpText: '4th–5th-generation cephalosporins, carbapenems, linezolid, daptomycin, colistin/polymyxins. 2 points each.' }),
      yesNo('crrt', 'Dialysis / continuous renal replacement therapy', 2, 'Intermittent dialysis or CRRT (+2).', false),
      yesNo('ecmo', 'ECMO', 2, 'Extracorporeal membrane oxygenation (+2).', false),
      yesNo('iabp', 'Intra-aortic balloon pump (IABP)', 1, 'IABP in place (+1).', false),
      yesNo('lvad', 'Left ventricular assist device (LVAD)', 1, 'LVAD in place (+1).', false),
      yesNo('mechVent', 'Mechanical ventilation', 2, 'Invasive mechanical ventilation (+2).', true),
    ],
    calculate(values) {
      const score =
        num(values.aminoglycosides) * 3 +
        (bool(values.amphotericin) ? 1 : 0) +
        num(values.antiarrhythmics) * 1 +
        num(values.oralAnticoag) * 1 +
        num(values.anticonvulsants) * 3 +
        (bool(values.argatroban) ? 2 : 0) +
        num(values.azoles) * 2 +
        num(values.bloodProducts) * 2 +
        num(values.chemo) * 3 +
        (bool(values.clozapine) ? 3 : 0) +
        (bool(values.digoxin) ? 3 : 0) +
        num(values.ganciclovir) * 1 +
        num(values.hyperosmolar) * 1 +
        num(values.immunosupp) * 3 +
        (bool(values.lidocaine) ? 2 : 0) +
        (bool(values.lithium) ? 3 : 0) +
        num(values.prostacyclins) * 2 +
        (bool(values.theophylline) ? 3 : 0) +
        num(values.therapeuticHeparins) * 2 +
        (bool(values.vancomycin) ? 3 : 0) +
        (bool(values.warfarin) ? 3 : 0) +
        (bool(values.nmb) ? 2 : 0) +
        num(values.contInfusions) * 1 +
        (bool(values.tpnNonPharm) ? 1 : 0) +
        (bool(values.tpnPharm) ? 3 : 0) +
        (bool(values.vtePpx) ? 1 : 0) +
        (bool(values.sup) ? 1 : 0) +
        (bool(values.glycemic) ? 1 : 0) +
        (bool(values.bowel) ? 1 : 0) +
        (bool(values.chlorhexidine) ? 1 : 0) +
        num(values.opioidsSedatives) * 1 +
        num(values.ciSedatives) * 2 +
        num(values.antimicrobials) * 1 +
        num(values.restrictedAbx) * 2 +
        (bool(values.crrt) ? 2 : 0) +
        (bool(values.ecmo) ? 2 : 0) +
        (bool(values.iabp) ? 1 : 0) +
        (bool(values.lvad) ? 1 : 0) +
        (bool(values.mechVent) ? 2 : 0);
      const high = score >= 10;
      return {
        score,
        unit: 'points',
        label: high ? 'High medication-regimen complexity (≥10)' : 'Lower medication-regimen complexity (<10)',
        interpretation: high
          ? `MRC-ICU score ${score} ≥10 — high regimen complexity. Associated in validation studies with greater pharmacist workload, fluid overload, longer ICU stay, and higher inpatient mortality; prioritize clinical pharmacist review.`
          : `MRC-ICU score ${score} <10 — lower regimen complexity. Standard pharmacist surveillance; rescore daily as the regimen evolves.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'High-priority agents', value: 'Weighted 1–3 pts per line item' },
          { label: 'Devices', value: `${(bool(values.crrt) ? 2 : 0) + (bool(values.ecmo) ? 2 : 0) + (bool(values.iabp) ? 1 : 0) + (bool(values.lvad) ? 1 : 0) + (bool(values.mechVent) ? 2 : 0)} pts` },
          { label: 'Analgesia/sedation + antimicrobials', value: `${num(values.opioidsSedatives) + num(values.ciSedatives) * 2 + num(values.antimicrobials) + num(values.restrictedAbx) * 2} pts` },
        ],
        recommendations: [
          'Score ≥10: prioritize clinical pharmacist review, drug-interaction screening, and targeted interventions.',
          'Re-score at 24-hour intervals — MRC-ICU is a dynamic measure, and rising scores track deterioration and workload.',
          'Use alongside severity-of-illness scores (APACHE II, SOFA) for outcome prediction, not as a replacement.',
        ],
      };
    },
    evidence: {
      summary:
        'MRC-ICU sums 38 weighted line items (1–3 points each; × indicates per-medication multiplier) across high-priority medications, ICU therapies, TPN, prophylaxis, analgesia/sedation, antimicrobials, and devices.',
      formula:
        'High-priority meds 1–3 pts each (aminoglycosides 3×, anticonvulsants 3×, chemotherapy 3×, immunosuppressants 3×, vancomycin/digoxin/lithium/theophylline/warfarin/clozapine 3, azoles/blood products/prostacyclins/therapeutic heparins 2×, argatroban/lidocaine 2, amphotericin/antiarrhythmics/oral AC 1×, ganciclovir/hyperosmolar 1×) + NMB 2, other infusions 1×, TPN 1 or 3, prophylaxis 1 each, opioids/sedatives 1×, infusion sedatives 2×, antimicrobials 1×, restricted antimicrobials 2×, dialysis/ECMO/MV 2, IABP/LVAD 1.',
      validation:
        'Validated for criterion, convergent/divergent, test–retest, and inter-rater reliability; correlates with pharmacist interventions (ρ~0.5), drug–drug interactions, fluid overload, ICU LOS, and mortality. Prospective cohorts report median 24-h scores ~8 (IQR 6–13); scores ≥10 denote higher complexity.',
      references: [
        {
          title: 'Development of Machine Learning Models to Validate a Medication Regimen Complexity Scoring Tool for Critically Ill Patients',
          citation: 'Al-Mamun MA, Brothers T, Newsome AS. Ann Pharmacother. 2021;55(4):450-457',
          year: 2021,
          pmid: '32929977',
          doi: '10.1177/1060028020959042',
        },
        {
          title: 'Evaluation of medication regimen complexity as a predictor for mortality',
          citation: 'Sikora A, Devlin JW, Yu M, et al. Sci Rep. 2023;13:11142',
          year: 2023,
          pmid: '37402869',
          doi: '10.1038/s41598-023-37908-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Daily clinical-pharmacist review', 'Screen for interactions, dosing errors, and de-escalation opportunities', 'Monitor for fluid overload'] },
      { condition: 'Rising score day-over-day', actions: ['Reassess regimen necessity each ICU day', 'Coordinate with the treating team on de-escalation'] },
    ],
    pearls: [
      'The most-studied scoring time is 24 hours after ICU admission; serial daily scoring captures trajectory.',
      'Count each distinct medication in a ×-weighted class (e.g., fentanyl + midazolam = two sedative infusions = 4 points).',
      'Choose only ONE TPN row — non-pharmacist-managed (+1) or pharmacist-managed (+3), not both.',
    ],
  },

  // ─── 7. DECAF ──────────────────────────────────────────────────────────────
  {
    id: 'decaf',
    name: 'DECAF Score for Acute COPD Exacerbation',
    shortName: 'DECAF',
    description:
      'Predicts in-hospital mortality in hospitalized acute COPD exacerbation using baseline dyspnea (eMRCD), eosinopenia, consolidation, acidemia, and atrial fibrillation.',
    category: 'pulmonary',
    tags: ['copd', 'aecopd', 'decaf', 'mortality', 'emrcd', 'prognosis'],
    whenToUse:
      'Patients ≥35 years hospitalized with a primary diagnosis of acute COPD exacerbation. Do not use in outpatients, stable COPD, or when comorbidity is expected to limit survival to <12 months.',
    whyUse:
      'DECAF outperformed CURB-65 and other tools for in-hospital mortality in derivation and multicenter validation (AUROC ~0.83–0.86) and supports disposition and escalation decisions.',
    inputs: [
      selectInput('emrcd', 'Extended MRC Dyspnea Scale (eMRCD) — on a good day, last 3 months', [
        { label: 'Not too dyspneic to leave the house (eMRCD 1–4)', value: 'e1to4', points: 0 },
        { label: 'Too dyspneic to leave house but independent with washing/dressing (eMRCD 5a)', value: 'e5a', points: 1 },
        { label: 'Too dyspneic to leave house AND to wash/dress (eMRCD 5b)', value: 'e5b', points: 2 },
      ], 'e1to4', 'Assesses baseline (stable-state) breathlessness over the preceding 3 months — the strongest DECAF predictor.'),
      yesNo('eos', 'Eosinopenia (eosinophils <0.05 ×10⁹/L)', 1, 'Admission eosinophil count below 0.05 ×10⁹/L (+1).', false),
      yesNo('consolidation', 'Consolidation on chest radiograph', 1, 'New consolidation on the admission chest X-ray (+1).', false),
      yesNo('acidemia', 'Acidemia (pH <7.30)', 1, 'Arterial or arterialized pH below 7.30 on admission gases (+1).', false),
      yesNo('af', 'Atrial fibrillation', 1, 'AF on admission ECG and/or a history of paroxysmal atrial fibrillation (+1).', false),
    ],
    calculate(values) {
      const emrcdPts = str(values.emrcd) === 'e5b' ? 2 : str(values.emrcd) === 'e5a' ? 1 : 0;
      const score =
        emrcdPts +
        (bool(values.eos) ? 1 : 0) +
        (bool(values.consolidation) ? 1 : 0) +
        (bool(values.acidemia) ? 1 : 0) +
        (bool(values.af) ? 1 : 0);
      const mortTable = ['0%', '1.5%', '5.4%', '15.3%', '31%', '40.5%', '50%'];
      const mort = mortTable[Math.min(score, 6)];
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low risk (DECAF 0–1)',
          interpretation: `DECAF score ${score} — low risk; in-hospital mortality ~${mort} (validation cohort). Routine management; these patients may be candidates for early discharge.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Intermediate risk (DECAF 2)',
          interpretation: `DECAF score 2 — intermediate risk; in-hospital mortality ~5.4%. Use clinical judgment for disposition and monitoring level.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High risk (DECAF 3–6)',
          interpretation: `DECAF score ${score} — high risk; in-hospital mortality ~${mort} with shorter time to death. Consider early escalation and higher-level monitoring versus palliative care as appropriate.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–6)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'eMRCD points', value: `+${emrcdPts}` },
          { label: 'Estimated in-hospital mortality', value: `~${mort}` },
          { label: 'Risk band', value: score <= 1 ? 'Low' : score === 2 ? 'Intermediate' : 'High' },
        ],
        recommendations: [
          'Score ≥3: consider escalation of care, higher-level monitoring, or early palliative-care involvement as clinically appropriate.',
          'Score 0–1: routine ward management; early supported discharge may be reasonable.',
          'Apply only to admitted patients with a primary AECOPD diagnosis.',
        ],
      };
    },
    evidence: {
      summary:
        'DECAF = eMRCD (0/1/2) + eosinopenia + consolidation + acidemia + atrial fibrillation (each +1). In-hospital mortality by score (external validation): 0→~0%, 1→1.5%, 2→5.4%, 3→15.3%, 4→31%, 5→40.5%, 6→50%. Bands: 0–1 low, 2 intermediate, 3–6 high.',
      formula: 'eMRCD 1–4→0, 5a→1, 5b→2; eosinophils <0.05→1; consolidation→1; pH<7.30→1; AF→1',
      validation:
        'Derived in 920 consecutive hospitalized AECOPD patients (AUROC 0.86) and validated internally (n=880, AUROC 0.83) and externally (n=845, AUROC 0.82); superior to CURB-65, BAP-65, and other comparators for in-hospital and 30-day mortality.',
      references: [
        {
          title: 'The DECAF Score: predicting hospital mortality in exacerbations of chronic obstructive pulmonary disease',
          citation: 'Steer J, Gibson J, Bourke SC. Thorax. 2012;67(11):970-976',
          year: 2012,
          pmid: '22895999',
          doi: '10.1136/thoraxjnl-2012-202103',
        },
        {
          title: 'Validation of the DECAF score to predict hospital mortality in acute exacerbations of COPD',
          citation: 'Echevarria C, Steer J, Heslop-Marshall K, et al. Thorax. 2016;71(2):133-136',
          year: 2016,
          pmid: '26769015',
          doi: '10.1136/thoraxjnl-2015-207775',
        },
      ],
    },
    nextSteps: [
      { condition: 'DECAF 0–1', actions: ['Routine AECOPD management (steroids, bronchodilators, antibiotics as indicated)', 'Consider early supported discharge'] },
      { condition: 'DECAF 2', actions: ['Clinical judgment on monitoring level', 'Reassess after initial therapy'] },
      { condition: 'DECAF 3–6', actions: ['Consider escalation/higher-level monitoring', 'Early review for NIV/ICU or palliative approach as appropriate'] },
    ],
    pearls: [
      'eMRCD asks about baseline breathlessness on a good day in the last 3 months — not the acute presentation.',
      'AF counts whether on the admission ECG or as documented paroxysmal AF.',
      'DECAF was not studied to dictate treatment — pair with clinical judgment.',
    ],
  },

  // ─── 8. BAP-65 ─────────────────────────────────────────────────────────────
  {
    id: 'bap-65',
    name: 'BAP-65 Score for Acute COPD Exacerbation',
    shortName: 'BAP-65',
    description:
      'Class-stratified score (I–V) predicting in-hospital mortality and need for mechanical ventilation in acute COPD exacerbation, using BUN, altered mental status, pulse, and age.',
    category: 'pulmonary',
    tags: ['copd', 'aecopd', 'bap-65', 'mortality', 'mechanical ventilation', 'prognosis'],
    whenToUse:
      'Patients >40 years presenting to the ED with an acute COPD exacerbation; use the worst variables on the day of admission.',
    whyUse:
      'BAP-65 stratifies mortality and early mechanical-ventilation risk using four bedside variables; higher classes support decisions about ICU care and early non-invasive ventilation.',
    inputs: [
      yesNo('bun', 'BUN ≥25 mg/dL (≥8.9 mmol/L)', 1, 'Admission blood urea nitrogen at or above 25 mg/dL (+1).', false),
      yesNo('ams', 'Altered mental status', 1, 'Initial GCS <14, or disorientation, stupor, or coma as determined by the physician (+1).', false),
      yesNo('pulse', 'Pulse ≥109 beats/min', 1, 'Admission pulse at or above 109 beats/min (+1).', false),
      selectInput('age', 'Age', [
        { label: '41–64 years', value: 'lt65' },
        { label: '≥65 years', value: 'ge65' },
      ], 'lt65', 'Age is used for class assignment: age ≥65 with no physiologic risk factors → Class II instead of Class I. BAP-65 is not validated in patients ≤40.'),
    ],
    calculate(values) {
      const physScore =
        (bool(values.bun) ? 1 : 0) + (bool(values.ams) ? 1 : 0) + (bool(values.pulse) ? 1 : 0);
      const older = str(values.age) === 'ge65';
      const cls = physScore === 0 ? (older ? 2 : 1) : physScore + 2;
      const clsRoman = ['I', 'II', 'III', 'IV', 'V'][cls - 1];
      const mort = ['0.3%', '1.0%', '2.2%', '6.4%', '14.1%'][cls - 1];
      const mv = ['0.3%', '0.2%', '1.2%', '5.5%', '12.4%'][cls - 1];
      const level = cls <= 2 ? 'low' : cls === 3 ? 'moderate' : cls === 4 ? 'high' : 'critical';
      return {
        score: cls,
        unit: `class ${clsRoman}`,
        label: `BAP-65 class ${clsRoman}`,
        interpretation: `Class ${clsRoman} (${physScore} physiologic risk factor${physScore === 1 ? '' : 's'}${older ? ', age ≥65' : ', age <65'}): in-hospital mortality ~${mort}, mechanical ventilation within 48 h ~${mv} (validation cohort).`,
        riskLevel: level,
        details: [
          { label: 'Physiologic risk factors (B/A/P)', value: `${physScore} of 3` },
          { label: 'In-hospital mortality', value: `~${mort}` },
          { label: 'MV within 48 h', value: `~${mv}` },
        ],
        recommendations:
          cls >= 4
            ? ['Consider early non-invasive ventilation and/or ICU-level care.', 'Close monitoring for early mechanical ventilation need.']
            : cls === 3
              ? ['Consider closer observation; reassess need for NIV as the clinical course evolves.']
              : ['Routine AECOPD management; early discharge or observation may be appropriate.'],
      };
    },
    evidence: {
      summary:
        'BAP-65 counts three physiologic risk factors — BUN ≥25 mg/dL, altered mental status (GCS <14), pulse ≥109 — then assigns class by age: Class I = <65 y + 0 RF; II = ≥65 y + 0 RF; III = 1 RF; IV = 2 RF; V = 3 RF. Validation mortality: 0.3/1.0/2.2/6.4/14.1%; MV within 48 h: 0.3/0.2/1.2/5.5/12.4%.',
      formula: 'Physiologic score = BUN≥25 + AMS + pulse≥109 (0–3); class = score+2 when ≥1 RF, else I (<65 y) or II (≥65 y)',
      validation:
        'Derived and validated in large US administrative cohorts (>34,000 admissions; AUROC ~0.79 for mortality/MV). Note the class assignment is a stratification, not a 0–4 sum: age ≥65 only separates Class I from II — some secondary sources mis-score it as a fourth point.',
      references: [
        {
          title: 'Mortality and need for mechanical ventilation in acute exacerbations of chronic obstructive pulmonary disease: development and validation of a simple risk score',
          citation: 'Tabak YP, Sun X, Johannes RS, Gupta V, Shorr AF. Arch Intern Med. 2009;169(17):1595-1602',
          year: 2009,
          pmid: '19786679',
          doi: '10.1001/archinternmed.2009.270',
        },
        {
          title: 'Validation of a novel risk score for severity of illness in acute exacerbations of COPD',
          citation: 'Shorr AF, Sun X, Johannes RS, Yaitanes A, Tabak YP. Chest. 2011;140(5):1177-1183',
          year: 2011,
          pmid: '21527510',
          doi: '10.1378/chest.10-3035',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Routine AECOPD care', 'Observation or early discharge may be reasonable'] },
      { condition: 'Class III', actions: ['Closer observation', 'Reassess for NIV need'] },
      { condition: 'Class IV–V', actions: ['Consider ICU-level care and early NIV', 'Anticipate mechanical ventilation — monitor closely'] },
    ],
    pearls: [
      'Use the worst values on the day of admission, not the best.',
      'Age ≥65 only distinguishes Class II from I; classes III–V are driven by the three physiologic risk factors regardless of age.',
      'Altered mental status = initial GCS <14 or physician-determined disorientation/stupor/coma.',
    ],
  },

  // ─── 9. PIRO ───────────────────────────────────────────────────────────────
  {
    id: 'piro-cap',
    name: 'PIRO Score for Community-Acquired Pneumonia',
    shortName: 'PIRO',
    description:
      'Eight-item severity score for ICU patients with community-acquired pneumonia, organized by Predisposition, Insult, Response, and Organ dysfunction; predicts 28-day mortality.',
    category: 'pulmonary',
    tags: ['pneumonia', 'cap', 'piro', 'icu', 'sepsis', 'mortality'],
    whenToUse:
      'Patients with community-acquired pneumonia admitted to the ICU; score within 24 hours of ICU admission.',
    whyUse:
      'PIRO outperformed APACHE II and ATS/IDSA criteria for ICU mortality in the derivation cohort and stratifies patients for prognosis, benchmarking, and discussion of adjunctive therapy.',
    inputs: [
      yesNo('comorbid', 'Comorbidities (COPD or immunocompromised)', 1, 'Predisposition: COPD or immunocompromise (+1).', false),
      yesNo('age70', 'Age >70 years', 1, 'Predisposition: age over 70 (+1).', true),
      yesNo('bacteremia', 'Bacteremia', 1, 'Insult: positive blood cultures (+1).', false),
      yesNo('multilobar', 'Multilobar opacities on chest radiograph', 1, 'Insult: multilobar infiltrates (+1).', false),
      yesNo('shock', 'Shock', 1, 'Response: septic shock / vasopressor-requiring hypotension (+1).', false),
      yesNo('hypoxemia', 'Severe hypoxemia', 1, 'Response: severe hypoxemia (e.g., PaO₂/FiO₂ <250) (+1).', true),
      yesNo('arf', 'Acute renal failure', 1, 'Organ dysfunction: acute renal failure (+1).', false),
      yesNo('ards', 'Acute respiratory distress syndrome', 1, 'Organ dysfunction: ARDS (+1).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.comorbid) ? 1 : 0) +
        (bool(values.age70) ? 1 : 0) +
        (bool(values.bacteremia) ? 1 : 0) +
        (bool(values.multilobar) ? 1 : 0) +
        (bool(values.shock) ? 1 : 0) +
        (bool(values.hypoxemia) ? 1 : 0) +
        (bool(values.arf) ? 1 : 0) +
        (bool(values.ards) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (0–2)',
          interpretation: `PIRO score ${score} — low risk; 28-day mortality ~3.6% in the ICU derivation cohort.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Mild risk (3)',
          interpretation: 'PIRO score 3 — mild risk; 28-day mortality ~13% (HR 1.8 vs low).',
        },
        {
          max: 4,
          level: 'high',
          label: 'High risk (4)',
          interpretation: 'PIRO score 4 — high risk; 28-day mortality ~43% (HR 3.1 vs low).',
        },
        {
          max: 8,
          level: 'critical',
          label: 'Very high risk (5–8)',
          interpretation: `PIRO score ${score} — very high risk; 28-day mortality ~76% (HR 6.3 vs low).`,
        },
      ]);
      return {
        score,
        unit: 'points (0–8)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'P (predisposition)', value: `${(bool(values.comorbid) ? 1 : 0) + (bool(values.age70) ? 1 : 0)}/2` },
          { label: 'I (insult)', value: `${(bool(values.bacteremia) ? 1 : 0) + (bool(values.multilobar) ? 1 : 0)}/2` },
          { label: 'R (response)', value: `${(bool(values.shock) ? 1 : 0) + (bool(values.hypoxemia) ? 1 : 0)}/2` },
          { label: 'O (organ dysfunction)', value: `${(bool(values.arf) ? 1 : 0) + (bool(values.ards) ? 1 : 0)}/2` },
        ],
        recommendations: [
          'Higher scores correlate with mortality, longer ICU stay, and more mechanical ventilation — use for prognosis and level-of-care discussions.',
          'No specific management guideline is tied to PIRO; pair with severe-CAP care bundles and guideline therapy.',
        ],
      };
    },
    evidence: {
      summary:
        'PIRO assigns 1 point each to 8 features grouped by concept: Predisposition (COPD/immunocompromise, age >70), Insult (bacteremia, multilobar opacities), Response (shock, severe hypoxemia), Organ dysfunction (acute renal failure, ARDS). Bands: 0–2 low (~3.6% 28-day mortality), 3 mild (~13%), 4 high (~43%), 5–8 very high (~76%).',
      formula: 'Sum of 8 items (range 0–8)',
      validation:
        'Derived in ICU CAP patients; nonsurvivors scored 4.6±1.2 vs 2.3±1.4 in survivors and each higher band carried a rising hazard ratio (1.8/3.1/6.3). It outperformed APACHE II and ATS/IDSA criteria in the derivation cohort; performance was weaker in H1N1 and COVID ICU cohorts.',
      references: [
        {
          title: 'PIRO score for community-acquired pneumonia: a new prediction rule for assessment of severity in intensive care unit patients with community-acquired pneumonia',
          citation: 'Rello J, Rodriguez A, Lisboa T, et al. Crit Care Med. 2009;37(2):456-462',
          year: 2009,
          pmid: '19114916',
          doi: '10.1097/CCM.0b013e318194b021',
        },
      ],
    },
    nextSteps: [
      { condition: 'PIRO 0–2', actions: ['Standard severe-CAP management', 'Monitor for deterioration'] },
      { condition: 'PIRO ≥3', actions: ['Escalated monitoring', 'Review adjunctive therapy options and goals of care as appropriate'] },
      { condition: 'PIRO ≥5', actions: ['Highest-acuity management', 'Early family/prognosis discussion'] },
    ],
    pearls: [
      'Score within the first 24 hours of ICU admission.',
      'PIRO is a staging framework (like TNM) — the four components can also be reported individually.',
      'Derived in an ICU population; do not apply to ward or outpatient CAP.',
    ],
  },

  // ─── 10. PRS (pediatric pneumonia risk score) ──────────────────────────────
  {
    id: 'prs-pediatric',
    name: 'Novel Pneumonia Risk Score (PRS) — Pediatric',
    shortName: 'PRS',
    description:
      'Logistic model estimating the probability of radiographic pneumonia in children 3 months–18 years, mapped to a 1–6 score that guides chest X-ray and antibiotic decisions.',
    category: 'pediatrics',
    tags: ['pneumonia', 'pediatric', 'prs', 'chest x-ray', 'antibiotic stewardship', 'emergency'],
    whenToUse:
      'Children 3 months to 18 years with suspected pneumonia in whom a clinician is considering chest radiography.',
    whyUse:
      'PRS outperformed clinician judgment for predicting radiographic pneumonia (AUC 0.71 vs 0.61) and supports judicious use of chest X-ray and antibiotics.',
    inputs: [
      numberInput('age', 'Age', {
        unit: 'years',
        min: 0.25,
        max: 18,
        step: 0.5,
        exampleValue: 4,
        helpText: 'Age in years (3 months = 0.25). Enters linearly (coefficient +0.098/year).',
      }),
      yesNo('fever', 'Fever at home or in ED', null, 'Documented or reported fever >38°C (>100.4°F) at home or in the emergency department (+1.145 in the model).', true),
      numberInput('o2sat', 'First oxygen saturation obtained', {
        unit: '%',
        min: 70,
        max: 100,
        exampleValue: 96,
        helpText: 'First recorded SpO₂; each point lower raises predicted risk (coefficient −0.216/%).',
      }),
      yesNo('crackles', 'Crackles (rales) on auscultation', null, 'Focal crackles/rales on lung examination (+0.407 in the model).', false),
      yesNo('wheezing', 'Wheezing', null, 'Wheezing on auscultation lowers predicted pneumonia risk in the model (−0.907) by favoring viral/reactive disease.', false),
    ],
    calculate(values) {
      const age = num(values.age, 4);
      const fever = bool(values.fever) ? 1 : 0;
      const o2 = num(values.o2sat, 96);
      const crackles = bool(values.crackles) ? 1 : 0;
      const wheeze = bool(values.wheezing) ? 1 : 0;
      const x = 18.05624 + 0.098308 * age + 1.144985 * fever - 0.21636 * o2 + 0.407494 * crackles - 0.907087 * wheeze;
      const p = Math.exp(x) / (1 + Math.exp(x));
      const pct = round(p * 100, 1);
      const prs = pct < 5 ? 1 : pct < 11 ? 2 : pct < 21 ? 3 : pct < 51 ? 4 : pct < 75 ? 5 : 6;
      const r = riskFromThresholds(prs, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (PRS 1–2)',
          interpretation: `PRS ${prs} (${pct}% predicted probability of radiographic pneumonia) — low risk. Consider deferring chest X-ray and antibiotics; observe and reassess.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate risk (PRS 3–4)',
          interpretation: `PRS ${prs} (${pct}% predicted probability) — moderate risk. Consider chest X-ray to further evaluate for pneumonia.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High risk (PRS 5–6)',
          interpretation: `PRS ${prs} (${pct}% predicted probability) — high risk. Consider chest X-ray versus empiric antibiotics. PRS 6 had ~99.9% specificity in derivation.`,
        },
      ]);
      return {
        score: prs,
        unit: 'PRS (1–6)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Predicted probability', value: `${pct}%` },
          { label: 'PRS band', value: prs <= 2 ? 'Low' : prs <= 4 ? 'Medium' : 'High' },
          { label: 'Model inputs', value: `age ${age}y, fever ${fever ? 'yes' : 'no'}, SpO₂ ${o2}%, crackles ${crackles ? 'yes' : 'no'}, wheeze ${wheeze ? 'yes' : 'no'}` },
        ],
        recommendations: [
          'Derived in children for whom a clinician already ordered a CXR — it may overestimate risk in low-suspicion presentations.',
          'National guidelines support clinical (non-radiographic) diagnosis of pediatric pneumonia in outpatients; PRS is an adjunct.',
        ],
      };
    },
    evidence: {
      summary:
        'PRS computes probability of radiographic pneumonia as eˣ/(1+eˣ), x = 18.05624 + 0.098308·(age) + 1.144985·(fever) − 0.21636·(SpO₂) + 0.407494·(crackles) − 0.907087·(wheeze); then maps <5%→1, 5–<11%→2, 11–<21%→3, 21–<51%→4, 51–<75%→5, ≥75%→6.',
      formula: 'x = 18.05624 + 0.098308·age + 1.144985·fever − 0.21636·SpO₂ + 0.407494·crackles − 0.907087·wheeze; p = eˣ/(1+eˣ)',
      validation:
        'Derived in 1,181 children (17% radiographic pneumonia; AUC 0.71 vs 0.61 for clinician judgment) and validated in 2,132 children (AUC 0.69); external validation in a 202-child cohort reported AUC ~0.72, still below standalone-use accuracy.',
      references: [
        {
          title: 'Development of the Novel Pneumonia Risk Score to Predict Radiographic Pneumonia in Children',
          citation: 'Lipsett SC, Hirsch AW, Monuteaux MC, Bachur RG, Neuman MI. Pediatr Infect Dis J. 2022;41(1):24-30',
          year: 2022,
          pmid: '34694254',
          doi: '10.1097/INF.0000000000003361',
        },
      ],
    },
    nextSteps: [
      { condition: 'PRS 1–2', actions: ['Consider observation without CXR or antibiotics', 'Safety-net with return precautions'] },
      { condition: 'PRS 3–4', actions: ['Consider CXR to clarify', 'Treat per clinical findings'] },
      { condition: 'PRS 5–6', actions: ['CXR vs empiric antibiotics', 'Assess severity and need for admission'] },
    ],
    pearls: [
      'Wheezing lowers the modeled pneumonia risk — it points toward viral/reactive airway disease.',
      'The score was derived only in children who already had a CXR ordered; applying it to all-comers overestimates risk.',
      'PRS predicts radiographic pneumonia, not clinical pneumonia or severity.',
    ],
  },

  // ─── 11. Shorr MRSA score ──────────────────────────────────────────────────
  {
    id: 'shorr-mrsa',
    name: 'Shorr Score for MRSA Pneumonia',
    shortName: 'Shorr MRSA',
    description:
      'Eight-variable risk score identifying pneumonia patients unlikely to have MRSA; a score of 0–1 corresponded to <10% MRSA prevalence in derivation.',
    category: 'infectious-disease',
    tags: ['mrsa', 'pneumonia', 'hcap', 'antibiotic stewardship', 'shorr', 'drug-resistant pathogens'],
    whenToUse:
      'Adults presenting to hospital with pneumonia when deciding whether empiric anti-MRSA coverage is warranted.',
    whyUse:
      'The score identifies a low-risk group (<10% MRSA prevalence) in whom anti-MRSA therapy may be withheld, limiting unnecessary broad-spectrum antibiotics.',
    inputs: [
      yesNo('age', 'Age <30 or >79 years', 1, 'Age under 30 or over 79 years (+1).', false),
      yesNo('nh', 'Nursing home / SNF / LTAC exposure within 90 days', 1, 'Residence or exposure in a nursing home, skilled nursing facility, or long-term acute-care facility within the last 90 days (+1).', false),
      yesNo('ivAbx', 'Prior IV antibiotic therapy within 30 days', 1, 'Intravenous antibiotics received within the prior 30 days (+1).', false),
      yesNo('hosp', 'Hospitalization ≥2 days within 90 days', 2, 'Inpatient hospitalization of at least 2 days within the prior 90 days — 2 points in the published score.', false),
      yesNo('icu', 'ICU admission on or before index culture', 2, 'ICU admission at the time of (or before) the index culture — 2 points in the published score.', false),
      yesNo('cvd', 'Any cerebrovascular disease', 1, 'Cerebrovascular disease present before admission (+1).', false),
      yesNo('dementia', 'Dementia', 1, 'Documented dementia (+1).', false),
      yesNo('femaleDm', 'Female with diabetes mellitus', 1, 'Female patient with diabetes mellitus (+1).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.nh) ? 1 : 0) +
        (bool(values.ivAbx) ? 1 : 0) +
        (bool(values.hosp) ? 2 : 0) +
        (bool(values.icu) ? 2 : 0) +
        (bool(values.cvd) ? 1 : 0) +
        (bool(values.dementia) ? 1 : 0) +
        (bool(values.femaleDm) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low risk for MRSA (0–1)',
          interpretation: `Shorr score ${score} — low risk; MRSA prevalence <10% in derivation. Routine (non–anti-MRSA) antibiotic coverage may be reasonable.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate risk for MRSA (2–5)',
          interpretation: `Shorr score ${score} — intermediate risk; use clinical judgment, local antibiogram, and microbiology data for coverage decisions.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'High risk for MRSA (6–10)',
          interpretation: `Shorr score ${score} — high risk; MRSA prevalence >30% in derivation. Consider empiric anti-MRSA coverage pending cultures.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–10)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: '2-point items', value: `${(bool(values.hosp) ? 1 : 0) + (bool(values.icu) ? 1 : 0)} present` },
          { label: 'Risk band', value: score <= 1 ? 'Low' : score <= 5 ? 'Intermediate' : 'High' },
        ],
        recommendations: [
          'Score 0–1: anti-MRSA therapy may be withheld per the derivation (<10% MRSA prevalence).',
          'Score ≥6: cover MRSA empirically and de-escalate on cultures.',
          'Always incorporate local epidemiology, prior MRSA colonization/infection, and clinical severity.',
        ],
      };
    },
    evidence: {
      summary:
        'Published Shorr score: +2 each for recent hospitalization (≥2 days within 90 days) and ICU admission; +1 each for age <30 or >79, nursing-home/SNF/LTAC exposure within 90 days, prior IV antibiotics within 30 days, cerebrovascular disease, dementia, and female with diabetes (total 0–10). Bands: 0–1 low (<10% MRSA), 2–5 intermediate, ≥6 high (>30%).',
      formula: 'Score = 2·(recent hospitalization) + 2·(ICU) + Σ six 1-point items (range 0–10)',
      validation:
        'Derived and validated in 5,975 pneumonia admissions at 62 US hospitals (14% MRSA). Note: the published score gives 2 points to recent hospitalization — this implementation follows the primary paper, whose stated maximum is 10.',
      references: [
        {
          title: 'A risk score for identifying methicillin-resistant Staphylococcus aureus in patients presenting to the hospital with pneumonia',
          citation: 'Shorr AF, Myers DE, Huang DB, et al. BMC Infect Dis. 2013;13:268',
          year: 2013,
          pmid: '23742753',
          doi: '10.1186/1471-2334-13-268',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–1', actions: ['Routine CAP/appropriate-spectrum coverage', 'Monitor cultures'] },
      { condition: 'Score 2–5', actions: ['Clinical judgment + local antibiogram', 'Obtain cultures/MRSA PCR to guide de-escalation'] },
      { condition: 'Score ≥6', actions: ['Empiric anti-MRSA coverage', 'De-escalate when microbiology returns'] },
    ],
    pearls: [
      'The score is a rule-out tool: its best-validated use is identifying patients in whom anti-MRSA therapy can be withheld.',
      'Prior MRSA infection or colonization should prompt coverage regardless of score.',
      'MRSA prevalence varies widely by region — validate against your local antibiogram.',
    ],
  },

  // ─── 12. PARS ──────────────────────────────────────────────────────────────
  {
    id: 'pars-asthma',
    name: 'PARS (Pediatric Asthma Risk Score)',
    shortName: 'PARS',
    description:
      'Six-item score predicting development of asthma by age 7 in young children (ages ~1–3), outperforming the Asthma Predictive Index for mild-to-moderate risk.',
    category: 'pediatrics',
    tags: ['asthma', 'pediatric', 'pars', 'wheezing', 'atopy', 'prediction'],
    whenToUse:
      'Children ~1–3 years old with recurrent wheezing when estimating the likelihood of developing asthma by school age.',
    whyUse:
      'PARS improved sensitivity (0.68) and specificity (0.77) over the API in the CCAAPS birth cohort and replicated in the Isle of Wight cohort, especially for mild-to-moderate risk children.',
    inputs: [
      yesNo('parentAsthma', 'Parental asthma', 2, 'Either parent with a history of asthma (+2).', false),
      yesNo('eczema', 'Eczema before age 3 years', 2, 'Physician-diagnosed atopic dermatitis/eczema before age 3 (+2).', false),
      yesNo('wheezeNoCold', 'Wheezing apart from colds', 3, 'Wheeze occurring without an upper respiratory infection (+3).', true),
      yesNo('earlyWheeze', 'Early wheezing before age 3', 3, 'Parent-reported wheeze in the last 12 months at the age-1, -2, and/or -3-year assessment (+3).', true),
      yesNo('spt', 'Skin-prick test positive to ≥2 aero- and/or food allergens', 2, 'Allergen wheal ≥3 mm greater than saline control to 2 or more aeroallergens and/or food allergens (+2).', false),
      yesNo('race', 'African American race', 2, 'Self-reported African American race — an independent predictor in the derivation cohort (+2).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.parentAsthma) ? 2 : 0) +
        (bool(values.eczema) ? 2 : 0) +
        (bool(values.wheezeNoCold) ? 3 : 0) +
        (bool(values.earlyWheeze) ? 3 : 0) +
        (bool(values.spt) ? 2 : 0) +
        (bool(values.race) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low risk of asthma (0–4)',
          interpretation: `PARS ${score} — low risk; ~3–11% probability of asthma by age 7 in the derivation/replication cohorts.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Moderate risk of asthma (5–8)',
          interpretation: `PARS ${score} — moderate risk; ~15–32% probability of asthma by age 7.`,
        },
        {
          max: 14,
          level: 'high',
          label: 'High risk of asthma (9–14)',
          interpretation: `PARS ${score} — high risk; ~40–79% probability of asthma by age 7.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–14)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [{ label: 'Risk band', value: score <= 4 ? 'Low (3–11%)' : score <= 8 ? 'Moderate (15–32%)' : 'High (40–79%)' }],
        recommendations: [
          'Use alongside history and examination; a high score supports earlier allergy/pulmonology referral and controller discussions.',
          'Counsel on modifiable exposures (tobacco smoke, allergen reduction) regardless of score.',
        ],
      };
    },
    evidence: {
      summary:
        'PARS = parental asthma (+2) + eczema <3 y (+2) + wheeze apart from colds (+3) + early wheeze <3 y (+3) + positive SPT to ≥2 aero/food allergens (+2) + African American race (+2). Bands: 0–4 low (3–11%), 5–8 moderate (15–32%), 9–14 high (40–79%) asthma by age 7.',
      formula: 'Sum of 6 weighted items (range 0–14)',
      validation:
        'Derived in the CCAAPS birth cohort (n=762; sensitivity 0.68, specificity 0.77) and replicated in the Isle of Wight cohort (sensitivity 0.67, specificity 0.79); outperformed API particularly in mild-to-moderate risk children.',
      references: [
        {
          title: 'A Pediatric Asthma Risk Score to better predict asthma development in young children',
          citation: 'Biagini Myers JM, Schauberger E, He H, et al. J Allergy Clin Immunol. 2019;143(5):1803-1810.e2',
          year: 2019,
          pmid: '30554722',
          doi: '10.1016/j.jaci.2018.09.037',
        },
      ],
    },
    nextSteps: [
      { condition: 'PARS 9–14', actions: ['Consider allergy/pulmonology referral', 'Discuss controller-therapy trials and trigger avoidance'] },
      { condition: 'PARS 5–8', actions: ['Monitor wheeze trajectory', 'Skin testing/eosinophils may refine risk'] },
      { condition: 'PARS 0–4', actions: ['Reassure; routine follow-up', 'Reassess if wheeze pattern changes'] },
    ],
    pearls: [
      'Early wheeze = parent-reported wheeze in the prior 12 months at the 1-, 2-, or 3-year visit.',
      'SPT positivity requires wheal ≥3 mm over saline control to ≥2 allergens (aero or food).',
      'PARS was designed to detect the mild-to-moderate risk children the API misses.',
    ],
  },

  // ─── 13. API ───────────────────────────────────────────────────────────────
  {
    id: 'api-asthma',
    name: 'Asthma Predictive Index (API)',
    shortName: 'API',
    description:
      'Tucson Children’s Respiratory Study index predicting school-age asthma in children ≤3 years with wheezing; reports loose and stringent index positivity.',
    category: 'pediatrics',
    tags: ['asthma', 'pediatric', 'api', 'wheezing', 'atopy', 'tucson'],
    whenToUse:
      'Children ≤3 years old with wheezing when estimating the likelihood of active asthma at school age.',
    whyUse:
      'A positive stringent index carried ~76% probability of school-age asthma, while >95% of stringent-negative children never had active asthma at ages 6–13 — useful for counseling and early-intervention decisions.',
    inputs: [
      selectInput('wheezeFreq', 'Wheezing episodes per year (first 3 years of life)', [
        { label: '≥3 episodes/year', value: 'ge3' },
        { label: '<3 episodes/year', value: 'lt3' },
      ], 'ge3', 'Frequent wheezing (≥3 episodes/year) is required for the stringent index; any wheezing suffices for the loose index.'),
      yesNo('parentAsthma', 'Parent with asthma (major)', 1, 'Major criterion: parental history of asthma.', false),
      yesNo('eczema', 'Patient with eczema / atopic dermatitis (major)', 1, 'Major criterion: physician-diagnosed atopic dermatitis.', false),
      yesNo('rhinitis', 'Allergic rhinitis (minor)', 1, 'Minor criterion: allergic rhinitis.', false),
      yesNo('wheezeNoCold', 'Wheezing apart from colds (minor)', 1, 'Minor criterion: wheeze occurring without a cold/URI.', false),
      yesNo('eos', 'Eosinophilia ≥4% on CBC (minor)', 1, 'Minor criterion: peripheral blood eosinophils ≥4%.', false),
    ],
    calculate(values) {
      const majors = (bool(values.parentAsthma) ? 1 : 0) + (bool(values.eczema) ? 1 : 0);
      const minors =
        (bool(values.rhinitis) ? 1 : 0) + (bool(values.wheezeNoCold) ? 1 : 0) + (bool(values.eos) ? 1 : 0);
      const criteria = majors >= 1 || minors >= 2;
      const loose = criteria; // any wheezing is presumed since patient is being evaluated
      const strict = criteria && str(values.wheezeFreq) === 'ge3';
      const label = strict ? 'Stringent index POSITIVE' : loose ? 'Loose index POSITIVE' : 'Index NEGATIVE';
      const interpretation = strict
        ? `Stringent API positive (≥3 wheezing episodes/yr + ${majors} major / ${minors} minor criteria): ~76% had active asthma at school age in derivation (risk ~4.3–9.8×).`
        : loose
          ? `Loose API positive (${majors} major / ${minors} minor criteria, <3 episodes/yr): ~59% had active asthma at school age (risk ~2.6–5.5×).`
          : `API negative (${majors} major / ${minors} minor criteria): >95% of stringent-negative children never had active asthma at ages 6–13 in derivation.`;
      return {
        score: strict ? 2 : loose ? 1 : 0,
        unit: 'index',
        label,
        interpretation,
        riskLevel: strict ? 'high' : loose ? 'moderate' : 'low',
        details: [
          { label: 'Major criteria (of 2)', value: `${majors}` },
          { label: 'Minor criteria (of 3)', value: `${minors}` },
          { label: 'Loose index', value: loose ? 'Positive' : 'Negative' },
          { label: 'Stringent index', value: strict ? 'Positive' : 'Negative' },
        ],
        recommendations: strict
          ? ['High probability of school-age asthma — discuss controller therapy, trigger avoidance, and specialist referral.']
          : loose
            ? ['Intermediate probability — monitor wheeze pattern; reassess risk as atopy markers evolve.']
            : ['Reassure — a negative stringent index carries a very high negative predictive value.'],
      };
    },
    evidence: {
      summary:
        'API major criteria: parental asthma, physician-diagnosed eczema. Minor criteria: allergic rhinitis, wheezing apart from colds, eosinophilia ≥4%. Loose index = any early wheeze + (≥1 major OR ≥2 minor); stringent index = frequent wheeze (≥3 episodes/yr) + (≥1 major OR ≥2 minor).',
      formula: 'Positive if (major ≥1 OR minor ≥2); stringent additionally requires ≥3 wheezing episodes/year',
      validation:
        'Derived from the Tucson Children’s Respiratory Study: 59% of loose-positive and 76% of stringent-positive children had school-age asthma; >95% of stringent-negative children never had active asthma at ages 6–13.',
      references: [
        {
          title: 'A Clinical Index to Define Risk of Asthma in Young Children with Recurrent Wheezing',
          citation: 'Castro-Rodríguez JA, Holberg CJ, Wright AL, Martinez FD. Am J Respir Crit Care Med. 2000;162(4 Pt 1):1403-1406',
          year: 2000,
          pmid: '11029352',
          doi: '10.1164/ajrccm.162.4.9912111',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stringent positive', actions: ['Discuss inhaled-controller trial and trigger avoidance', 'Consider pediatric pulmonology/allergy referral'] },
      { condition: 'Loose positive only', actions: ['Monitor wheeze trajectory', 'Address modifiable exposures'] },
      { condition: 'Negative', actions: ['Reassure family', 'Reassess if atopic features or frequent wheeze develop'] },
    ],
    pearls: [
      'The stringent index trades sensitivity for a much higher positive predictive value — use it for counseling about likely asthma.',
      'The negative stringent index is the most useful feature: >95% never had school-age asthma.',
      'The modified API (mAPI) adds aeroallergen and food sensitization and drops allergic rhinitis — do not mix versions.',
    ],
  },

  // ─── 14. Liu Respiratory Score for Asthma ──────────────────────────────────
  {
    id: 'liu-resp-score',
    name: 'Respiratory Score for Asthma (Liu et al.)',
    shortName: 'Liu Resp Score',
    description:
      'Age-banded clinical respiratory score (respiratory rate, retractions, dyspnea, wheezing/auscultation) grading acute asthma severity in children; used by the Seattle Children’s asthma pathway.',
    category: 'pediatrics',
    tags: ['asthma', 'pediatric', 'respiratory score', 'liu', 'bronchiolitis', 'severity'],
    whenToUse:
      'Children admitted or presenting with asthma, bronchiolitis, or wheezing when a standardized severity grade and response-to-treatment tracking are needed.',
    whyUse:
      'The score showed good interobserver agreement among physicians, nurses, and respiratory therapists, supporting consistent serial assessment and pathway-based escalation.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'age',
      activeInputIdsByMode: {
        lt2mo: ['rr_lt2mo', 'retractions', 'dys_lt2y', 'wheeze'],
        '2m_1y': ['rr_2m_1y', 'retractions', 'dys_lt2y', 'wheeze'],
        '1_2y': ['rr_1_2y', 'retractions', 'dys_lt2y', 'wheeze'],
        '2_3y': ['rr_2_3y', 'retractions', 'dys_2_4y', 'wheeze'],
        '4y': ['rr_4_5y', 'retractions', 'dys_2_4y', 'wheeze'],
        '5y': ['rr_4_5y', 'retractions', 'dys_gte5y', 'wheeze'],
        '6_12y': ['rr_6_12y', 'retractions', 'dys_gte5y', 'wheeze'],
        gt12y: ['rr_gt12y', 'retractions', 'dys_gte5y', 'wheeze'],
      },
    },
    inputs: [
      selectInput('age', 'Age', [
        { label: '<2 months', value: 'lt2mo' },
        { label: '2 months to <1 year', value: '2m_1y' },
        { label: '1 to <2 years', value: '1_2y' },
        { label: '2 to 3 years', value: '2_3y' },
        { label: '4 years', value: '4y' },
        { label: '5 years', value: '5y' },
        { label: '6 to 12 years', value: '6_12y' },
        { label: '>12 years', value: 'gt12y' },
      ], '2_3y', 'Age determines which respiratory-rate thresholds and dyspnea assessment apply.'),
      selectInput('rr_lt2mo', 'Respiratory rate (<2 months)', [
        { label: '≤60 /min', value: 1, points: 1 },
        { label: '61–69 /min', value: 2, points: 2 },
        { label: '≥70 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for infants under 2 months.'),
      selectInput('rr_2m_1y', 'Respiratory rate (2 months to <1 year)', [
        { label: '≤50 /min', value: 1, points: 1 },
        { label: '51–59 /min', value: 2, points: 2 },
        { label: '≥60 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for infants 2 months to under 1 year.'),
      selectInput('rr_1_2y', 'Respiratory rate (1 to <2 years)', [
        { label: '≤40 /min', value: 1, points: 1 },
        { label: '41–44 /min', value: 2, points: 2 },
        { label: '≥45 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for toddlers 1 to under 2 years.'),
      selectInput('rr_2_3y', 'Respiratory rate (2 to 3 years)', [
        { label: '≤34 /min', value: 1, points: 1 },
        { label: '35–39 /min', value: 2, points: 2 },
        { label: '≥40 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for children 2–3 years.'),
      selectInput('rr_4_5y', 'Respiratory rate (4 to 5 years)', [
        { label: '≤30 /min', value: 1, points: 1 },
        { label: '31–35 /min', value: 2, points: 2 },
        { label: '≥36 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for children 4–5 years.'),
      selectInput('rr_6_12y', 'Respiratory rate (6 to 12 years)', [
        { label: '≤26 /min', value: 1, points: 1 },
        { label: '27–30 /min', value: 2, points: 2 },
        { label: '≥31 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for children 6–12 years.'),
      selectInput('rr_gt12y', 'Respiratory rate (>12 years)', [
        { label: '≤23 /min', value: 1, points: 1 },
        { label: '24–27 /min', value: 2, points: 2 },
        { label: '≥28 /min', value: 3, points: 3 },
      ], 1, 'Respiratory rate band for patients over 12 years.'),
      selectInput('retractions', 'Retractions', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Intercostal', value: 1, points: 1 },
        { label: 'Intercostal and substernal', value: 2, points: 2 },
        { label: 'Intercostal, substernal, and supraclavicular', value: 3, points: 3 },
      ], 0, 'Most severe retraction pattern observed.'),
      selectInput('dys_lt2y', 'Dyspnea (<2 years)', [
        { label: 'Normal feeding, vocalizations, and activity', value: 0, points: 0 },
        { label: '1 of: difficulty feeding, decreased vocalization, or agitated', value: 1, points: 1 },
        { label: '2 of: difficulty feeding, decreased vocalization, or agitated', value: 2, points: 2 },
        { label: 'Stops feeding, no vocalizations, or drowsy/confused', value: 3, points: 3 },
      ], 0, 'Dyspnea assessment for children under 2 years.'),
      selectInput('dys_2_4y', 'Dyspnea (2 to 4 years)', [
        { label: 'Normal feeding, vocalizations, and play', value: 0, points: 0 },
        { label: '1 of: decreased appetite, increased coughing after play, hyperactivity', value: 1, points: 1 },
        { label: '2 of: decreased appetite, increased coughing after play, hyperactivity', value: 2, points: 2 },
        { label: 'Stops eating/drinking, stops playing, or drowsy/confused', value: 3, points: 3 },
      ], 0, 'Dyspnea assessment for children 2–4 years.'),
      selectInput('dys_gte5y', 'Dyspnea (≥5 years)', [
        { label: 'Counts to ≥10 in one breath', value: 0, points: 0 },
        { label: 'Counts to 7–9 in one breath', value: 1, points: 1 },
        { label: 'Counts to 4–6 in one breath', value: 2, points: 2 },
        { label: 'Counts to ≤3 in one breath', value: 3, points: 3 },
      ], 0, 'Single-breath counting test for children 5 years and older.'),
      selectInput('wheeze', 'Wheezing / auscultation', [
        { label: 'Normal breathing, no wheeze', value: 0, points: 0 },
        { label: 'End-expiratory wheeze only', value: 1, points: 1 },
        { label: 'Expiratory wheeze (greater than end-expiratory)', value: 2, points: 2 },
        { label: 'Inspiratory and expiratory wheeze and/or diminished breath sounds', value: 3, points: 3 },
      ], 0, 'Auscultation grade; diminished breath sounds score the highest.'),
    ],
    calculate(values) {
      const age = str(values.age, '2_3y');
      const rrKey: Record<string, string> = {
        lt2mo: 'rr_lt2mo', '2m_1y': 'rr_2m_1y', '1_2y': 'rr_1_2y', '2_3y': 'rr_2_3y',
        '4y': 'rr_4_5y', '5y': 'rr_4_5y', '6_12y': 'rr_6_12y', gt12y: 'rr_gt12y',
      };
      const dysKey: Record<string, string> = {
        lt2mo: 'dys_lt2y', '2m_1y': 'dys_lt2y', '1_2y': 'dys_lt2y', '2_3y': 'dys_2_4y',
        '4y': 'dys_2_4y', '5y': 'dys_gte5y', '6_12y': 'dys_gte5y', gt12y: 'dys_gte5y',
      };
      const rr = num(values[rrKey[age]], 1);
      const dys = num(values[dysKey[age]], 0);
      const ret = num(values.retractions, 0);
      const whz = num(values.wheeze, 0);
      const score = rr + ret + dys + whz;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low severity (1–4)',
          interpretation: `Respiratory score ${score} — low-severity group on the Seattle Children’s asthma pathway; consider standard therapy and reassessment.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Moderate severity (5–8)',
          interpretation: `Respiratory score ${score} — moderate severity; escalate bronchodilator/steroid therapy per pathway and reassess serially.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'High severity (9–12)',
          interpretation: `Respiratory score ${score} — high severity; ~90% of children with scores 9–12 after 1 h of treatment were admitted in the Seattle Children’s ED series — consider aggressive therapy and admission.`,
        },
      ]);
      return {
        score,
        unit: 'points (1–12)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Respiratory rate component', value: `${rr}/3` },
          { label: 'Retractions component', value: `${ret}/3` },
          { label: 'Dyspnea component', value: `${dys}/3` },
          { label: 'Wheezing component', value: `${whz}/3` },
        ],
        recommendations: [
          'Reassess after each bronchodilator treatment — trajectory matters more than a single value.',
          'Scores 9–12 persisting after 1 hour of therapy predict admission; plan disposition accordingly.',
        ],
      };
    },
    evidence: {
      summary:
        'Liu respiratory clinical score = age-banded respiratory rate (1–3) + retractions (0–3) + dyspnea (0–3) + wheezing/auscultation (0–3). Seattle Children’s pathway groups: 1–4 low, 5–8 moderate, 9–12 high.',
      formula: 'RR banded by 7 age groups; dyspnea by 3 age groups (<2 y, 2–4 y, ≥5 y); retractions and wheeze graded 0–3',
      validation:
        'Developed at Seattle Children’s and tested among 165 provider pairs on 55 inpatients: 82–88% observed agreement on total score (weighted κ 0.52–0.65). Used since 2002 on the institutional asthma pathway; post-1-hour scores 9–12 predicted admission in ~90%.',
      references: [
        {
          title: 'Use of a respiratory clinical score among different providers',
          citation: 'Liu LL, Gallaher MM, Davis RL, Rutter CM, Lewis TC, Marcuse EK. Pediatr Pulmonol. 2004;37(3):243-248',
          year: 2004,
          pmid: '14966818',
          doi: '10.1002/ppul.10425',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 1–4', actions: ['Standard bronchodilator pathway', 'Routine reassessment'] },
      { condition: 'Score 5–8', actions: ['Escalate bronchodilators/systemic steroids per pathway', 'Serial rescore after treatment'] },
      { condition: 'Score 9–12', actions: ['Aggressive therapy and likely admission', 'Monitor for fatigue/diminished breath sounds (silent chest)'] },
    ],
    pearls: [
      'Minimum possible score is 1 (respiratory rate always scores ≥1).',
      'Age bands matter — the same respiratory rate can score 1, 2, or 3 points depending on age.',
      'Diminished breath sounds with inspiratory+expiratory wheeze scores 3 — beware the silent chest.',
    ],
  },

  // ─── 15. LENT ──────────────────────────────────────────────────────────────
  {
    id: 'lent',
    name: 'LENT Prognostic Score for Malignant Pleural Effusion',
    shortName: 'LENT',
    description:
      'First validated prognostic score in malignant pleural effusion, combining pleural-fluid LDH, ECOG performance status, neutrophil-to-lymphocyte ratio, and tumor type.',
    category: 'oncology',
    tags: ['malignant pleural effusion', 'lent', 'prognosis', 'ecog', 'nlr', 'mesothelioma'],
    whenToUse:
      'Adults with a confirmed malignant pleural effusion when estimating prognosis to guide management (e.g., indwelling pleural catheter vs pleurodesis vs conservative care).',
    whyUse:
      'LENT predicts survival better than ECOG PS alone at 1, 3, and 6 months and stratifies median survival from ~319 days (low) to ~44 days (high).',
    inputs: [
      selectInput('ldh', 'Pleural fluid LDH', [
        { label: '<1,500 U/L', value: 'lt1500', points: 0 },
        { label: '≥1,500 U/L', value: 'ge1500', points: 1 },
      ], 'lt1500', 'Pleural fluid lactate dehydrogenase.'),
      selectInput('ecog', 'ECOG performance status', [
        { label: '0 — asymptomatic', value: 0, points: 0 },
        { label: '1 — symptomatic but ambulatory', value: 1, points: 1 },
        { label: '2 — symptomatic, in bed <50% of day', value: 2, points: 2 },
        { label: '3–4 — in bed >50% of day or bedbound', value: 3, points: 3 },
      ], 1, 'Eastern Cooperative Oncology Group performance score.'),
      selectInput('nlr', 'Serum neutrophil-to-lymphocyte ratio', [
        { label: '<9', value: 'lt9', points: 0 },
        { label: '≥9', value: 'ge9', points: 1 },
      ], 'lt9', 'Neutrophil-to-lymphocyte ratio from a serum full blood count.'),
      selectInput('tumor', 'Tumor type', [
        { label: 'Mesothelioma or hematologic malignancy', value: 'meso_heme', points: 0 },
        { label: 'Breast, gynecologic, or renal cell carcinoma', value: 'breast_gyn_rcc', points: 1 },
        { label: 'Lung or any other cancer', value: 'lung_other', points: 2 },
      ], 'lung_other', 'Tumor-type band with the best prognosis first.'),
    ],
    calculate(values) {
      const score =
        (str(values.ldh) === 'ge1500' ? 1 : 0) +
        num(values.ecog, 1) +
        (str(values.nlr) === 'ge9' ? 1 : 0) +
        (str(values.tumor) === 'lung_other' ? 2 : str(values.tumor) === 'breast_gyn_rcc' ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low risk (LENT 0–1)',
          interpretation: `LENT score ${score} — low risk; median survival ~319 days (IQR 228–549) in validation. Longer expected survival favors definitive pleural management.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate risk (LENT 2–4)',
          interpretation: `LENT score ${score} — moderate risk; median survival ~130 days (IQR 47–467).`,
        },
        {
          max: 7,
          level: 'high',
          label: 'High risk (LENT 5–7)',
          interpretation: `LENT score ${score} — high risk; median survival ~44 days (IQR 22–77); only ~65% survived 1 month and ~3% survived 6 months in validation — favor comfort-focused, least-invasive drainage strategies.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–7)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [{ label: 'Risk band', value: score <= 1 ? 'Low' : score <= 4 ? 'Moderate' : 'High' }],
        recommendations: [
          'High LENT: prioritize least-invasive symptom control and early palliative care.',
          'Low LENT: definitive pleural strategies (IPC, pleurodesis) remain reasonable.',
          'Use with tumor-specific prognosis and treatment-response expectations.',
        ],
      };
    },
    evidence: {
      summary:
        'LENT = pleural-fluid LDH ≥1500 U/L (+1) + ECOG PS (0–3) + serum NLR ≥9 (+1) + tumor type (mesothelioma/hematologic 0, breast/gyn/RCC +1, lung/other +2). Bands: 0–1 low (median OS 319 d), 2–4 moderate (130 d), 5–7 high (44 d).',
      formula: 'Score 0–7 across four items',
      validation:
        'Developed and validated across three international MPE cohorts; outperformed ECOG PS alone at 1-, 3-, and 6-month survival prediction (AUROC 0.77/0.84/0.85 vs 0.66/0.75/0.76).',
      references: [
        {
          title: 'Predicting survival in malignant pleural effusion: development and validation of the LENT prognostic score',
          citation: 'Clive AO, Kahan BC, Hooper CE, et al. Thorax. 2014;69(12):1098-1104',
          year: 2014,
          pmid: '25100651',
          doi: '10.1136/thoraxjnl-2014-205285',
        },
      ],
    },
    nextSteps: [
      { condition: 'LENT 0–1', actions: ['Discuss definitive options (IPC vs pleurodesis)', 'Oncology review for disease-specific treatment'] },
      { condition: 'LENT 2–4', actions: ['Individualized drainage strategy', 'Early goals-of-care discussion'] },
      { condition: 'LENT 5–7', actions: ['Comfort-focused, minimally invasive management', 'Palliative care involvement'] },
    ],
    pearls: [
      'Use the PLEURAL fluid LDH, not serum LDH.',
      'NLR is computed from a routine serum full blood count (neutrophils ÷ lymphocytes).',
      'Tumor type spans the widest prognostic range — mesothelioma/hematologic best, lung/other worst.',
    ],
  },

  // ─── 16. RAPID ─────────────────────────────────────────────────────────────
  {
    id: 'rapid-pleural',
    name: 'RAPID Score for Pleural Infection',
    shortName: 'RAPID',
    description:
      'Validated 0–7 score predicting 3-month mortality in pleural infection, using renal function (urea), age, fluid purulence, infection source, and dietary factor (albumin).',
    category: 'pulmonary',
    tags: ['pleural infection', 'empyema', 'rapid', 'parapneumonic', 'prognosis', 'mist'],
    whenToUse:
      'Adults diagnosed with pleural infection (empyema/complicated parapneumonic effusion) at presentation.',
    whyUse:
      'RAPID stratifies 3-month mortality from ~1.5% (low) to ~48% (high) in validation and can support triage and early management decisions.',
    inputs: [
      numberInput('urea', 'Serum BUN (urea)', {
        unit: 'mg/dL',
        min: 1,
        max: 200,
        exampleValue: 20,
        helpText: '<14 mg/dL (<5 mmol/L): 0; 14–23 (5–8): +1; >23 (>8): +2.',
      }),
      numberInput('age', 'Age', {
        unit: 'years',
        min: 18,
        max: 110,
        exampleValue: 65,
        helpText: '<50: 0; 50–70: +1; >70: +2.',
      }),
      selectInput('purulence', 'Pleural fluid appearance', [
        { label: 'Purulent', value: 'purulent', points: 0 },
        { label: 'Non-purulent', value: 'nonpurulent', points: 1 },
      ], 'purulent', 'Counterintuitively, NON-purulent fluid is associated with worse outcome (+1).'),
      selectInput('source', 'Infection source', [
        { label: 'Community-acquired', value: 'cap', points: 0 },
        { label: 'Hospital-acquired', value: 'hap', points: 1 },
      ], 'cap', 'Hospital-acquired pleural infection scores +1.'),
      numberInput('albumin', 'Serum albumin', {
        unit: 'g/dL',
        min: 1,
        max: 6,
        step: 0.1,
        exampleValue: 3.0,
        helpText: '≥2.7 g/dL (27 g/L): 0; <2.7 g/dL: +1.',
      }),
    ],
    calculate(values) {
      const urea = num(values.urea, 20);
      const age = num(values.age, 65);
      const alb = num(values.albumin, 3.0);
      const ureaPts = urea < 14 ? 0 : urea <= 23 ? 1 : 2;
      const agePts = age < 50 ? 0 : age <= 70 ? 1 : 2;
      const score =
        ureaPts +
        agePts +
        (str(values.purulence) === 'nonpurulent' ? 1 : 0) +
        (str(values.source) === 'hap' ? 1 : 0) +
        (alb < 2.7 ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (0–2)',
          interpretation: `RAPID score ${score} — low risk; 3-month mortality ~1.5% in the validation study.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Medium risk (3–4)',
          interpretation: `RAPID score ${score} — medium risk; 3-month mortality ~17.8% in validation.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'High risk (5–7)',
          interpretation: `RAPID score ${score} — high risk; 3-month mortality ~47.8% in validation — consider early escalation, close monitoring, and timely drainage/source control.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–7)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Urea points', value: `+${ureaPts} (BUN ${urea} mg/dL)` },
          { label: 'Age points', value: `+${agePts} (age ${age})` },
          { label: 'Albumin points', value: alb < 2.7 ? '+1' : '0' },
        ],
        recommendations: [
          'High RAPID: expedite drainage/source control and higher-level monitoring; discuss surgical vs medical strategies early.',
          'Low RAPID: standard pleural-infection pathway (antibiotics + drainage).',
        ],
      };
    },
    evidence: {
      summary:
        'RAPID = urea (<5 mmol/L 0; 5–8 +1; >8 +2) + age (<50 0; 50–70 +1; >70 +2) + non-purulence (+1) + hospital-acquired source (+1) + albumin <27 g/L (+1). Bands: 0–2 low (~1.5% 3-month mortality), 3–4 medium (~17.8%), 5–7 high (~47.8%).',
      formula: 'Score 0–7 across five items (R-A-P-I-D)',
      validation:
        'Derived in MIST1 (n=411) and validated in MIST2 (n=191): high-risk vs low-risk OR 192 for 3-month mortality in derivation and OR 14.1 in validation; prospective PILOT and Danish validations confirmed stratification.',
      references: [
        {
          title: 'A clinical score (RAPID) to identify those at risk for poor outcome at presentation in patients with pleural infection',
          citation: 'Rahman NM, Kahan BC, Miller RF, Gleeson FV, Nunn AJ, Maskell NA. Chest. 2014;145(4):848-855',
          year: 2014,
          pmid: '24264558',
          doi: '10.1378/chest.13-1558',
        },
        {
          title: 'Prospective validation of the RAPID clinical risk prediction score in adult patients with pleural infection: the PILOT study',
          citation: 'ERJ Open Res. 2020',
          year: 2020,
          doi: '10.1183/13993003.00130-2020',
        },
      ],
    },
    nextSteps: [
      { condition: 'RAPID 0–2', actions: ['Standard antibiotics + drainage pathway', 'Routine monitoring'] },
      { condition: 'RAPID 3–4', actions: ['Closer monitoring', 'Reassess drainage adequacy early'] },
      { condition: 'RAPID 5–7', actions: ['Escalated care; early thoracic-surgery review', 'Goals-of-care discussion given ~48% 3-month mortality'] },
    ],
    pearls: [
      'Non-purulent fluid scores HIGHER than pus — likely because it reflects impaired host response or delayed presentation.',
      'Urea thresholds are 5 and 8 mmol/L (≈14 and 23 mg/dL BUN).',
      'Albumin cutoff is 27 g/L (2.7 g/dL) — a nutritional marker.',
    ],
  },

  // ─── 17. SCARF ─────────────────────────────────────────────────────────────
  {
    id: 'scarf',
    name: 'SCARF Score (Sequential Clinical Assessment of Respiratory Function)',
    shortName: 'SCARF',
    description:
      'Dynamic 0–4 physiologic score for critically ill rib-fracture patients predicting pneumonia, high oxygen requirement, and prolonged ICU stay; serial scores guide analgesia escalation.',
    category: 'critical-care',
    tags: ['rib fracture', 'trauma', 'scarf', 'incentive spirometry', 'analgesia', 'icu'],
    whenToUse:
      'Critically ill patients with rib fractures — assessed at admission and serially (e.g., daily) during ICU stay.',
    whyUse:
      'Admission, maximum, and rising SCARF scores predict pneumonia, high oxygen requirement, and prolonged ICU length of stay, and guide stepwise analgesia escalation.',
    inputs: [
      yesNo('is', 'Incentive spirometry <50% of predicted', 1, 'Incentive spirometry volume below 50% of predicted (+1).', true),
      yesNo('rr', 'Respiratory rate >20 breaths/min', 1, 'Respiratory rate above 20 breaths/min (+1).', false),
      yesNo('pain', 'Numeric pain score ≥5', 1, 'Pain rated ≥5 on the numeric rating scale (+1).', true),
      yesNo('cough', 'Cough inadequate to clear respiratory secretions', 1, 'Cough too weak to clear secretions (+1).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.is) ? 1 : 0) +
        (bool(values.rr) ? 1 : 0) +
        (bool(values.pain) ? 1 : 0) +
        (bool(values.cough) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Low risk (0)',
          interpretation: 'SCARF 0 — low risk of adverse pulmonary outcome; continue current analgesia and pulmonary hygiene.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Intermediate risk (1–2)',
          interpretation: `SCARF ${score} — intermediate risk; optimize analgesia (consider locoregional techniques) and reassess daily.`,
        },
        {
          max: 4,
          level: 'high',
          label: 'High risk (3–4)',
          interpretation: `SCARF ${score} — high risk of pneumonia, high oxygen requirement, and prolonged ICU stay; escalate analgesia and intensify pulmonary support.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–4)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'IS <50% predicted', value: bool(values.is) ? '+1' : '0' },
          { label: 'RR >20', value: bool(values.rr) ? '+1' : '0' },
          { label: 'Pain ≥5', value: bool(values.pain) ? '+1' : '0' },
          { label: 'Inadequate cough', value: bool(values.cough) ? '+1' : '0' },
        ],
        recommendations: [
          'Score persisting >2 after intervention: escalate analgesia level (Level 1 opioid alternatives → Level 2 nerve blocks/ESP catheters → Level 3 PCA/ketamine/lidocaine infusions).',
          'Reassess daily — rising scores predict complications better than a single value.',
        ],
      };
    },
    evidence: {
      summary:
        'SCARF assigns 1 point each for incentive spirometry <50% predicted, respiratory rate >20, numeric pain score ≥5, and inadequate cough (range 0–4). Bands: 0 low, 1–2 intermediate, 3–4 high risk of ≥1 adverse outcome.',
      formula: 'Sum of 4 bedside physiologic items',
      validation:
        'Prospective single-center cohort of 100 rib-fracture ICU patients (340 scores): maximum-score AUROC 0.86 for pneumonia, 0.76 for high oxygen requirement, 0.79 for prolonged ICU stay; rising scores tracked complications.',
      references: [
        {
          title: 'The Sequential Clinical Assessment of Respiratory Function (SCARF) score: A dynamic pulmonary physiologic score that predicts adverse outcomes in critically ill rib fracture patients',
          citation: 'Hardin KS, Leasia KN, Haenel J, Moore EE, Burlew CC, Pieracci FM. J Trauma Acute Care Surg. 2019;87(6):1260-1268',
          year: 2019,
          pmid: '31425473',
          doi: '10.1097/TA.0000000000002480',
        },
      ],
    },
    nextSteps: [
      { condition: 'SCARF 0', actions: ['Continue current analgesia/pulmonary hygiene', 'Daily reassessment'] },
      { condition: 'SCARF 1–2 or persisting >2', actions: ['Escalate analgesia one level', 'Consider locoregional techniques (nerve blocks, ESP catheter)'] },
      { condition: 'SCARF 3–4', actions: ['Maximal analgesia strategy (PCA/infusions/regional catheters)', 'Intensify pulmonary support; monitor for pneumonia'] },
    ],
    pearls: [
      'SCARF is designed for serial use — a rising score from admission to day 2 flagged higher pneumonia risk.',
      'Pain ≥5 directly worsens IS performance and cough — analgesia is the primary modifiable lever.',
      'Entirely physiologic: pair with a radiographic score (e.g., RibScore) for a complete rib-fracture assessment.',
    ],
  },

  // ─── 18. NIVO ──────────────────────────────────────────────────────────────
  {
    id: 'nivo',
    name: 'NIVO Score (Noninvasive Ventilation Outcomes)',
    shortName: 'NIVO',
    description:
      'Six-variable score predicting in-hospital and 90-day mortality in COPD exacerbations with acute hypercapnic respiratory failure treated with assisted (mainly noninvasive) ventilation.',
    category: 'pulmonary',
    tags: ['copd', 'niv', 'nivo', 'hypercapnic respiratory failure', 'aecopd', 'mortality'],
    whenToUse:
      'Patients admitted with an acute COPD exacerbation complicated by acidemic hypercapnic respiratory failure treated with assisted ventilation (principally NIV).',
    whyUse:
      'NIVO was derived and prospectively validated in multicenter UK cohorts (AUROC 0.79) and outperformed comparator scores for predicting in-hospital mortality in ventilated AECOPD patients.',
    inputs: [
      yesNo('consolidation', 'Chest radiograph consolidation', 1, 'Consolidation on admission chest X-ray (+1).', false),
      selectInput('gcs', 'Glasgow Coma Scale', [
        { label: '15', value: 'g15', points: 0 },
        { label: '≤14', value: 'le14', points: 1 },
      ], 'g15', 'GCS 15 scores 0; GCS ≤14 scores +1.'),
      yesNo('af', 'Atrial fibrillation', 1, 'Persistent, new, or paroxysmal AF — score positively even if in sinus rhythm at ventilation initiation (+1).', false),
      selectInput('ph', 'pH at initiation of ventilation', [
        { label: '≥7.25', value: 'ge725', points: 0 },
        { label: '<7.25', value: 'lt725', points: 1 },
      ], 'ge725', 'Arterial pH at the index episode of acidemia.'),
      selectInput('ttacidemia', 'Time to acidemia', [
        { label: '≤12 h', value: 'le12', points: 0 },
        { label: '>12 h', value: 'gt12', points: 2 },
      ], 'le12', 'More than 12 hours between hospital arrival and the index episode of acidemia scores +2.'),
      selectInput('emrcd', 'Extended MRC Dyspnea Scale (eMRCD) — on a good day, last 3 months', [
        { label: 'Not too dyspneic to leave house (eMRCD 1–4)', value: 'e1to4', points: 0 },
        { label: 'Too dyspneic to leave house, independent with washing/dressing (eMRCD 5a)', value: 'e5a', points: 2 },
        { label: 'Too dyspneic to leave house AND wash/dress (eMRCD 5b)', value: 'e5b', points: 3 },
      ], 'e1to4', 'Baseline (stable-state) breathlessness — the largest weight in the score.'),
    ],
    calculate(values) {
      const emrcdPts = str(values.emrcd) === 'e5b' ? 3 : str(values.emrcd) === 'e5a' ? 2 : 0;
      const score =
        (bool(values.consolidation) ? 1 : 0) +
        (str(values.gcs) === 'le14' ? 1 : 0) +
        (bool(values.af) ? 1 : 0) +
        (str(values.ph) === 'lt725' ? 1 : 0) +
        (str(values.ttacidemia) === 'gt12' ? 2 : 0) +
        emrcdPts;
      const bands: Record<string, { mort: string; mort90: string }> = {
        low: { mort: '5.0%', mort90: '15.8%' },
        medium: { mort: '16.8%', mort90: '32.5%' },
        high: { mort: '41.2%', mort90: '50.1%' },
        veryhigh: { mort: '71.4%', mort90: '80.0%' },
      };
      let band: keyof typeof bands;
      let bandLabel: string;
      let level: 'low' | 'moderate' | 'high' | 'critical';
      if (score <= 2) { band = 'low'; bandLabel = 'Low'; level = 'low'; }
      else if (score <= 4) { band = 'medium'; bandLabel = 'Medium'; level = 'moderate'; }
      else if (score <= 6) { band = 'high'; bandLabel = 'High'; level = 'high'; }
      else { band = 'veryhigh'; bandLabel = 'Very high'; level = 'critical'; }
      return {
        score,
        unit: 'points (0–9)',
        label: `${bandLabel} risk (NIVO ${score})`,
        interpretation: `NIVO score ${score} — ${bandLabel.toLowerCase()} risk band: in-hospital mortality ~${bands[band].mort}, 90-day mortality ~${bands[band].mort90} (validation cohort).`,
        riskLevel: level,
        details: [
          { label: 'eMRCD points', value: `+${emrcdPts}` },
          { label: 'In-hospital mortality', value: `~${bands[band].mort}` },
          { label: '90-day mortality', value: `~${bands[band].mort90}` },
        ],
        recommendations:
          score >= 5
            ? ['High predicted mortality — optimize NIV delivery and consider early escalation vs ceiling-of-care and goals-of-care discussion.', 'Senior review of ventilation strategy.']
            : ['Continue assisted ventilation per protocol with monitoring and reassessment.'],
      };
    },
    evidence: {
      summary:
        'NIVO = consolidation (+1) + GCS ≤14 (+1) + AF (+1) + pH <7.25 (+1) + time to acidemia >12 h (+2) + eMRCD (5a +2, 5b +3). Bands: 0–2 low (5.0% in-hospital / 15.8% 90-day mortality), 3–4 medium (16.8%/32.5%), 5–6 high (41.2%/50.1%), 7–9 very high (71.4%/80%).',
      formula: 'Sum of six categorised items (range 0–9)',
      validation:
        'Derived in 489 ventilated AECOPD patients (25.4% mortality) and prospectively validated in 733 patients across 10 UK hospitals (20.1% mortality; AUROC 0.79, good calibration); outperformed DECAF and other prespecified comparators. Developed under TRIPOD methodology.',
      references: [
        {
          title: 'The Noninvasive Ventilation Outcomes (NIVO) score: prediction of in-hospital mortality in exacerbations of COPD requiring assisted ventilation',
          citation: 'Hartley T, Lane ND, Steer J, et al. Eur Respir J. 2021;57(5):2004042',
          year: 2021,
          pmid: '33479109',
          doi: '10.1183/13993003.04042-2020',
        },
      ],
    },
    nextSteps: [
      { condition: 'NIVO 0–2', actions: ['Standard NIV protocol and monitoring', 'Wean as acidemia resolves'] },
      { condition: 'NIVO 3–4', actions: ['Closer monitoring of NIV response', 'Reassess arterial gases per protocol'] },
      { condition: 'NIVO ≥5', actions: ['Senior review of ventilation strategy', 'Discuss ceiling of care and goals of care', 'Consider ICU/HDU placement'] },
    ],
    pearls: [
      'Delayed acidemia (>12 h after arrival) is an adverse sign (+2) — it often reflects a more severe underlying trajectory.',
      'Score AF even if the patient is in sinus rhythm at ventilation initiation (persistent, new, or paroxysmal all count).',
      'Like DECAF, eMRCD reflects baseline breathlessness — not the acute presentation.',
    ],
  },
];
