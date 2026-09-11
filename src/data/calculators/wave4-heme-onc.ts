import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave4HemeOncCalcs: Calculator[] = [
  // ─── 1. Revised IPI ────────────────────────────────────────────────────────
  {
    id: 'r-ipi',
    name: 'Revised IPI (R-IPI, DLBCL)',
    shortName: 'R-IPI',
    description: 'Rituximab-era regrouping of standard IPI factors for diffuse large B-cell lymphoma outcomes.',
    category: 'hematology',
    tags: ['r-ipi', 'ipi', 'dlbcl', 'lymphoma', 'prognosis', 'nhl'],
    whenToUse: 'Newly diagnosed DLBCL treated in the rituximab era for OS risk groups.',
    whyUse: 'Reclassifies classic IPI into three clinically useful strata (very good / good / poor) better aligned with R-CHOP outcomes.',
    inputs: [
      yesNo('age', 'Age > 60 years', 1),
      yesNo('ldh', 'Serum LDH > upper limit of normal', 1),
      yesNo('ecog', 'ECOG performance status ≥ 2', 1, 'ECOG 2 = ambulatory, all self-care, unable to work, up and about >50% of waking hours. 0 = fully active; 1 = strenuous activity limited but light work OK; 3 = limited self-care, in bed/chair >50% of waking hours; 4 = completely disabled.'),
      yesNo('stage', 'Ann Arbor stage III or IV', 1),
      yesNo('extranodal', 'More than one extranodal site', 1, 'Count distinct extranodal organs/sites (each organ/site once).'),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.ecog) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0) +
        (bool(values.extranodal) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Very good (0 factors)',
          interpretation:
            'R-IPI very good. Historically excellent OS with R-CHOP-like therapy. Still stage and risk-adapt CNS prophylaxis separately (CNS-IPI).',
          riskLevel: 'low',
          details: [
            { label: 'IPI factors present', value: '0 / 5' },
            { label: 'R-IPI group', value: 'Very good' },
          ],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Good (1–2 factors)',
          interpretation:
            'R-IPI good. Majority of patients; standard immunochemotherapy typically appropriate. Integrate cell-of-origin, double-hit, and comorbidities.',
          riskLevel: 'moderate',
          details: [
            { label: 'IPI factors present', value: `${score} / 5` },
            { label: 'R-IPI group', value: 'Good' },
          ],
        };
      }
      return {
        score,
        label: 'Poor (3–5 factors)',
        interpretation:
          'R-IPI poor. Higher risk of treatment failure/relapse historically. Consider clinical trials, ensure full staging and molecular workup, and calculate CNS-IPI.',
        riskLevel: 'high',
        details: [
          { label: 'IPI factors present', value: `${score} / 5` },
          { label: 'R-IPI group', value: 'Poor' },
        ],
      };
    },
    evidence: {
      summary:
        'R-IPI uses the same five IPI factors but regroups: 0 = very good, 1–2 = good, 3–5 = poor (Sehn et al., rituximab era).',
      formula: 'Score = count of IPI factors (0–5); groups 0 / 1–2 / 3–5',
      validation: 'Derived in R-CHOP–treated DLBCL; widely used alongside NCCN-IPI and molecular markers.',
      references: [
        {
          title: 'The revised International Prognostic Index (R-IPI) is a better predictor of outcome than the standard IPI for patients with DLBCL treated with R-CHOP',
          citation: 'Sehn LH et al. Blood. 2007',
          year: 2007,
          pmid: '17105812',
          doi: '10.1182/blood-2006-08-038257',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any R-IPI', actions: ['Complete PET-CT staging', 'HBV screen before anti-CD20', 'Calculate CNS-IPI'] },
      { condition: 'Poor (3–5)', actions: ['Trial consideration', 'FISH for MYC/BCL2/BCL6 if indicated', 'Discuss prognosis candidly'] },
    ],
    pearls: [
      'R-IPI does not replace need for CNS prophylaxis risk assessment.',
      'NCCN-IPI further refines age and LDH cut-points in some practices.',
    ],
  },

  // ─── 2. CNS-IPI ────────────────────────────────────────────────────────────
  {
    id: 'cns-ipi',
    name: 'CNS-IPI (DLBCL CNS Relapse Risk)',
    shortName: 'CNS-IPI',
    description: 'Estimates risk of secondary CNS involvement in DLBCL using IPI factors plus kidney/adrenal involvement.',
    category: 'hematology',
    tags: ['cns-ipi', 'dlbcl', 'cns prophylaxis', 'lymphoma', 'prognosis'],
    whenToUse: 'Newly diagnosed DLBCL when deciding CNS staging intensity and prophylaxis strategies.',
    whyUse: 'Stratifies 2-year CNS relapse risk into low / intermediate / high groups to support prophylaxis discussions.',
    inputs: [
      yesNo('age', 'Age > 60 years', 1),
      yesNo('ldh', 'Serum LDH > upper limit of normal', 1),
      yesNo('ecog', 'ECOG performance status ≥ 2', 1, 'ECOG 2 = ambulatory, all self-care, unable to work, up and about >50% of waking hours. 0 = fully active; 1 = strenuous activity limited but light work OK; 3 = limited self-care, in bed/chair >50% of waking hours; 4 = completely disabled.'),
      yesNo('stage', 'Ann Arbor stage III or IV', 1),
      yesNo('extranodal', 'More than one extranodal site', 1, 'Count distinct extranodal organs/sites (each organ/site once).'),
      yesNo('kidneyAdrenal', 'Kidney and/or adrenal involvement', 1, 'Also counted in the extranodal-site factor if >1 extranodal site overall.'),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.ecog) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0) +
        (bool(values.extranodal) ? 1 : 0) +
        (bool(values.kidneyAdrenal) ? 1 : 0);

      if (score <= 1) {
        return {
          score,
          label: 'Low risk (0–1)',
          interpretation:
            'CNS-IPI low. Historical 2-year CNS relapse ~0.6%. Routine intensive CNS prophylaxis often not required based on score alone; clinical judgment still applies (e.g., testicular, breast, epidural primaries).',
          riskLevel: 'low',
          details: [
            { label: 'CNS-IPI', value: `${score} / 6` },
            { label: 'Approx. 2-y CNS risk (historical)', value: '~0.6%' },
          ],
        };
      }
      if (score <= 3) {
        return {
          score,
          label: 'Intermediate risk (2–3)',
          interpretation:
            'CNS-IPI intermediate. Historical 2-year CNS relapse ~3–4%. Individualize prophylaxis and CSF evaluation using additional high-risk sites and institutional pathways.',
          riskLevel: 'moderate',
          details: [
            { label: 'CNS-IPI', value: `${score} / 6` },
            { label: 'Approx. 2-y CNS risk (historical)', value: '~3.4%' },
          ],
        };
      }
      return {
        score,
        label: 'High risk (4–6)',
        interpretation:
          'CNS-IPI high. Historical 2-year CNS relapse ~10%. Stronger consideration for CNS-directed evaluation/prophylaxis per guidelines and local protocol; discuss limitations of IT MTX alone.',
        riskLevel: 'high',
        details: [
          { label: 'CNS-IPI', value: `${score} / 6` },
          { label: 'Approx. 2-y CNS risk (historical)', value: '~10.2%' },
        ],
      };
    },
    evidence: {
      summary:
        'CNS-IPI = five IPI factors + kidney/adrenal involvement (0–6). Low 0–1, intermediate 2–3, high 4–6 with rising CNS relapse risk.',
      formula: 'Sum of 6 binary factors',
      validation: 'Schmitz et al. JCO 2016 (German High-Grade Lymphoma Study Group / British Columbia validation).',
      references: [
        {
          title: 'CNS International Prognostic Index: A Risk Model for CNS Relapse in Patients With Diffuse Large B-Cell Lymphoma Treated With R-CHOP',
          citation: 'Schmitz N et al. J Clin Oncol. 2016',
          year: 2016,
          pmid: '27382100',
          doi: '10.1200/JCO.2015.65.6520',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Intermediate or high',
        actions: ['Review additional high-risk sites (testis, breast, epidural)', 'Consider LP / MRI if neurologic symptoms', 'Prophylaxis per institutional standard'],
      },
      { condition: 'High (4–6)', actions: ['Multidisciplinary lymphoma discussion', 'Document prophylaxis plan'] },
    ],
    pearls: [
      'Testicular lymphoma often warrants CNS prophylaxis even if CNS-IPI is not high.',
      'CNS-IPI estimates relapse risk; it does not prove benefit of a specific prophylaxis regimen.',
    ],
  },

  // ─── 3. DIPSS ──────────────────────────────────────────────────────────────
  {
    id: 'dipss',
    name: 'DIPSS (Primary Myelofibrosis)',
    shortName: 'DIPSS',
    description: 'Dynamic International Prognostic Scoring System for primary myelofibrosis (usable at any time in the disease course).',
    category: 'hematology',
    tags: ['dipss', 'myelofibrosis', 'mpn', 'prognosis'],
    whenToUse: 'Primary myelofibrosis for risk stratification at diagnosis or later (dynamic).',
    whyUse: 'Hb-weighted model predicts survival and frames transplant / JAK inhibitor discussions.',
    inputs: [
      yesNo('age', 'Age > 65 years', 1),
      yesNo('wbc', 'WBC > 25 × 10⁹/L', 1),
      yesNo('hb', 'Hemoglobin < 10 g/dL', 2, 'Worth 2 points in DIPSS'),
      yesNo('blasts', 'Circulating blasts ≥ 1%', 1),
      yesNo('symptoms', 'Constitutional symptoms (IWG-MRT)', 1, 'Weight loss >10% of baseline in the past year, and/or unexplained fever, and/or excessive (drenching) sweats, persisting >1 month. Fatigue, pruritus, or bone pain alone do not count.'),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.hb) ? 2 : 0) +
        (bool(values.blasts) ? 1 : 0) +
        (bool(values.symptoms) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Low risk (0)',
          interpretation:
            'DIPSS low. Historically longest median survival. Observation or symptom-directed care may be appropriate; still assess transplant candidacy longitudinally.',
          riskLevel: 'low',
          details: [{ label: 'DIPSS points', value: `${score} / 6` }],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Intermediate-1 (1–2)',
          interpretation:
            'DIPSS int-1. Intermediate prognosis. Consider clinical trial, symptom control (including JAK inhibition when indicated), and early transplant discussion if eligible and progressive.',
          riskLevel: 'moderate',
          details: [{ label: 'DIPSS points', value: `${score} / 6` }],
        };
      }
      if (score <= 4) {
        return {
          score,
          label: 'Intermediate-2 (3–4)',
          interpretation:
            'DIPSS int-2. Higher-risk disease. Allogeneic transplant evaluation is often appropriate in fit patients; JAK inhibitors for spleen/symptoms per guidelines.',
          riskLevel: 'high',
          details: [{ label: 'DIPSS points', value: `${score} / 6` }],
        };
      }
      return {
        score,
        label: 'High risk (5–6)',
        interpretation:
          'DIPSS high. Poorest historical survival stratum. Prioritize transplant evaluation if eligible and disease-modifying strategies; supportive care for cytopenias and symptoms.',
        riskLevel: 'critical',
        details: [{ label: 'DIPSS points', value: `${score} / 6` }],
      };
    },
    evidence: {
      summary:
        'DIPSS: age>65 (1), WBC>25 (1), Hb<10 (2), blasts≥1% (1), constitutional symptoms (1). Low 0 / int-1 1–2 / int-2 3–4 / high 5–6.',
      formula: 'Weighted sum (Hb contributes 2 points); range 0–6',
      validation: 'Passamonti et al. Blood 2010; widely used; DIPSS-plus and MIPSS70 refine further.',
      references: [
        {
          title: 'A dynamic prognostic model to predict survival in primary myelofibrosis: a study by the IWG-MRT (DIPSS)',
          citation: 'Passamonti F et al. Blood. 2010',
          year: 2010,
          pmid: '20008785',
          doi: '10.1182/blood-2009-09-245837',
        },
      ],
    },
    nextSteps: [
      { condition: 'Int-2 or high', actions: ['Transplant referral if candidate', 'Molecular risk (ASXL1, SRSF2, etc.)', 'JAK inhibitor eligibility'] },
      { condition: 'Any risk', actions: ['Driver mutation status (JAK2/CALR/MPL)', 'Symptom burden assessment', 'Consider DIPSS-plus if karyotype known'] },
    ],
    pearls: [
      'Unlike IPSS, DIPSS can be applied after diagnosis (dynamic).',
      'Hb <10 is double-weighted — anemia drives risk strongly.',
    ],
  },

  // ─── 4. DIPSS-plus ─────────────────────────────────────────────────────────
  {
    id: 'dipss-plus',
    name: 'DIPSS-plus (Myelofibrosis)',
    shortName: 'DIPSS+',
    description: 'DIPSS refined with unfavorable karyotype, thrombocytopenia, and RBC transfusion need.',
    category: 'hematology',
    tags: ['dipss-plus', 'myelofibrosis', 'mpn', 'karyotype', 'prognosis'],
    whenToUse: 'Primary myelofibrosis when karyotype, platelet count, and transfusion status are known.',
    whyUse: 'Improves discrimination over DIPSS alone and better identifies highest-risk patients.',
    inputs: [
      selectInput('dipssCategory', 'Current DIPSS risk category', [
        { label: 'Low (0 DIPSS points) → 0', value: 0 },
        { label: 'Intermediate-1 (1–2 DIPSS points) → 1', value: 1 },
        { label: 'Intermediate-2 (3–4 DIPSS points) → 2', value: 2 },
        { label: 'High (5–6 DIPSS points) → 3', value: 3 },
      ], undefined, 'Map the current DIPSS integer (age>65, WBC>25, Hb<10 worth 2, blasts≥1%, IWG-MRT symptoms) onto these bands, then add the three plus factors.'),
      yesNo('unfavorableKaryotype', 'Unfavorable karyotype', 1, 'Complex karyotype or sole/two abnormalities including +8, −7/7q−, i(17q), inv(3), −5/5q−, 12p−, or 11q23 rearrangement'),
      yesNo('platelets', 'Platelets < 100 × 10⁹/L', 1),
      yesNo('transfusion', 'RBC transfusion need', 1, 'Tick if the patient currently requires RBC transfusions (typically started for Hb <10 g/dL). Do not tick a remote one-off that has resolved.'),
    ],
    calculate(values) {
      const score =
        num(values.dipssCategory) +
        (bool(values.unfavorableKaryotype) ? 1 : 0) +
        (bool(values.platelets) ? 1 : 0) +
        (bool(values.transfusion) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Low risk (0)',
          interpretation: 'DIPSS-plus low. Favorable stratum; observe or treat symptoms; reassess if cytogenetics or transfusion needs change.',
          riskLevel: 'low',
          details: [{ label: 'DIPSS-plus points', value: `${score} / 6` }],
        };
      }
      if (score === 1) {
        return {
          score,
          label: 'Intermediate-1 (1)',
          interpretation: 'DIPSS-plus int-1. Intermediate risk — individualize therapy and transplant timing.',
          riskLevel: 'moderate',
          details: [{ label: 'DIPSS-plus points', value: `${score} / 6` }],
        };
      }
      if (score <= 3) {
        return {
          score,
          label: 'Intermediate-2 (2–3)',
          interpretation: 'DIPSS-plus int-2. Higher risk — transplant evaluation often appropriate in eligible patients.',
          riskLevel: 'high',
          details: [{ label: 'DIPSS-plus points', value: `${score} / 6` }],
        };
      }
      return {
        score,
        label: 'High risk (4–6)',
        interpretation: 'DIPSS-plus high. Highest risk group — prioritize allo-HCT evaluation if fit and supportive/disease-directed therapy.',
        riskLevel: 'critical',
        details: [{ label: 'DIPSS-plus points', value: `${score} / 6` }],
      };
    },
    evidence: {
      summary:
        'DIPSS-plus maps DIPSS low/int-1/int-2/high to 0/1/2/3 points, then +1 each for unfavorable karyotype, Plt<100, and transfusion dependence (0–6).',
      formula: 'DIPSS-category points (0–3) + karyotype + platelets + transfusion',
      validation: 'Gangat et al. JCO 2011; complementary to MIPSS70 / GIPSS molecular models.',
      references: [
        {
          title: 'DIPSS plus: a refined Dynamic International Prognostic Scoring System for primary myelofibrosis that incorporates prognostic information from karyotype, platelet count, and transfusion status',
          citation: 'Gangat N et al. J Clin Oncol. 2011',
          year: 2011,
          pmid: '21149668',
          doi: '10.1200/JCO.2010.32.2446',
        },
      ],
    },
    nextSteps: [
      { condition: 'Int-2 or high', actions: ['Allo-HCT consult if candidate', 'NGS risk mutations', 'Spleen/symptom-directed therapy'] },
    ],
    pearls: [
      'Compute DIPSS first, then add the three plus factors.',
      'Molecular scores (MIPSS70+) may supersede cytogenetic-only models when NGS is available.',
    ],
  },

  // ─── 5. Sokal CML ──────────────────────────────────────────────────────────
  {
    id: 'sokal-score',
    name: 'Sokal Score (CML)',
    shortName: 'Sokal',
    description: 'Classic prognostic score for chronic-phase chronic myeloid leukemia at diagnosis.',
    category: 'hematology',
    tags: ['sokal', 'cml', 'bcr-abl', 'prognosis', 'tyrosine kinase'],
    whenToUse: 'Newly diagnosed chronic-phase CML before or at TKI start (historical risk grouping).',
    whyUse: 'Still reported in trials and labels; frames baseline risk though ELTS is preferred for TKI-era long-term survival.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 120, defaultValue: 50 }),
      numberInput('spleen', 'Spleen size below costal margin', {
        unit: 'cm',
        min: 0,
        max: 40,
        step: 0.5,
        defaultValue: 0,
        helpText: 'Clinical exam, cm below left costal margin in the midclavicular line; 0 if not palpable',
      }),
      numberInput('platelets', 'Platelet count', { unit: '×10⁹/L', min: 10, max: 3000, defaultValue: 300 }),
      numberInput('blasts', 'Peripheral blood blasts', { unit: '%', min: 0, max: 30, step: 0.1, defaultValue: 1 }),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const spleen = num(values.spleen, 0);
      const platelets = num(values.platelets, 300);
      const blasts = num(values.blasts, 1);
      const index = Math.exp(
        0.0116 * (age - 43.4) +
          0.0345 * (spleen - 7.51) +
          0.188 * ((platelets / 700) ** 2 - 0.563) +
          0.0887 * (blasts - 2.1)
      );
      const score = round(index, 3);
      const r = riskFromThresholds(score, [
        {
          max: 0.799,
          level: 'low',
          label: 'Low risk (<0.8)',
          interpretation: `Sokal index ${score}. Low-risk chronic-phase CML historically. Modern TKI choice still individualized (comorbidities, goals, ELTS).`,
        },
        {
          max: 1.2,
          level: 'moderate',
          label: 'Intermediate risk (0.8–1.2)',
          interpretation: `Sokal index ${score}. Intermediate risk. Ensure optimal TKI adherence and molecular monitoring milestones.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High risk (>1.2)',
          interpretation: `Sokal index ${score}. High-risk Sokal. May favor second-generation TKI strategies per guidelines/trials; close milestone monitoring.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age', value: `${age} y` },
          { label: 'Spleen', value: `${spleen} cm BCM` },
          { label: 'Platelets', value: `${platelets} ×10⁹/L` },
          { label: 'Blasts', value: `${blasts}%` },
        ],
      };
    },
    evidence: {
      summary:
        'Sokal = exp[0.0116(age−43.4) + 0.0345(spleen−7.51) + 0.188((Plt/700)²−0.563) + 0.0887(blasts−2.10)]. Low <0.8, int 0.8–1.2, high >1.2.',
      formula: 'Exponential combination of age, spleen cm, platelets, blast %',
      validation: 'Sokal et al. 1984 (hydroxyurea/busulfan era); still used descriptively in TKI era.',
      references: [
        {
          title: 'Prognostic discrimination in "good-risk" chronic granulocytic leukemia',
          citation: 'Sokal JE et al. Blood. 1984',
          year: 1984,
          pmid: '6584184',
          doi: '10.1182/blood.V63.4.789.789',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any score', actions: ['Confirm CP vs AP/BP criteria', 'Baseline BCR::ABL1 IS', 'Choose TKI and monitoring schedule'] },
      { condition: 'High Sokal', actions: ['Consider 2G-TKI if appropriate', 'Strict molecular milestone follow-up'] },
    ],
    pearls: ['ELTS better predicts TKI-era long-term survival than Sokal/Hasford.', 'Spleen measured in cm below costal margin on clinical exam.'],
  },

  // ─── 6. Hasford CML ────────────────────────────────────────────────────────
  {
    id: 'hasford-score',
    name: 'Hasford Score (Euro / CML)',
    shortName: 'Hasford',
    description: 'Euro score for chronic-phase CML prognosis using age, spleen, blasts, eosinophils, basophils, and platelets.',
    category: 'hematology',
    tags: ['hasford', 'euro score', 'cml', 'prognosis'],
    whenToUse: 'Newly diagnosed chronic-phase CML risk stratification (historical Euro score).',
    whyUse: 'Complementary to Sokal; developed in interferon era and still cited alongside Sokal/EUTOS/ELTS.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 120, defaultValue: 50 }),
      numberInput('spleen', 'Spleen size below costal margin', { unit: 'cm', min: 0, max: 40, step: 0.5, defaultValue: 0, helpText: 'Clinical exam, cm below left costal margin in the midclavicular line; 0 if not palpable' }),
      numberInput('blasts', 'Peripheral blood blasts', { unit: '%', min: 0, max: 30, step: 0.1, defaultValue: 1 }),
      numberInput('eosinophils', 'Peripheral eosinophils', { unit: '%', min: 0, max: 50, step: 0.1, defaultValue: 2 }),
      numberInput('basophils', 'Peripheral basophils', { unit: '%', min: 0, max: 30, step: 0.1, defaultValue: 1 }),
      numberInput('platelets', 'Platelet count', { unit: '×10⁹/L', min: 10, max: 3000, defaultValue: 300 }),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const spleen = num(values.spleen, 0);
      const blasts = num(values.blasts, 1);
      const eos = num(values.eosinophils, 2);
      const baso = num(values.basophils, 1);
      const plt = num(values.platelets, 300);

      const scoreRaw =
        (age >= 50 ? 0.6666 : 0) +
        0.042 * spleen +
        0.0584 * blasts +
        0.0413 * eos +
        (baso >= 3 ? 0.2039 : 0) +
        (plt >= 1500 ? 1.0956 : 0);
      const score = round(scoreRaw, 3);

      // Hasford (Euro) cutoffs — NOT Sokal's 0.8/1.2: low ≤0.78, int 0.781–1.48, high >1.48
      const r = riskFromThresholds(score, [
        {
          max: 0.78,
          level: 'low',
          label: 'Low risk (≤0.78)',
          interpretation: `Hasford ${score}. Low-risk Euro score. Modern care centers on TKI selection and molecular response, not score alone.`,
        },
        {
          max: 1.48,
          level: 'moderate',
          label: 'Intermediate (0.781–1.48)',
          interpretation: `Hasford ${score}. Intermediate risk. Optimize TKI therapy and monitoring milestones.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High risk (>1.48)',
          interpretation: `Hasford ${score}. High-risk Euro score. Consider more potent TKI strategies and vigilant milestone assessment.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age ≥50 component', value: age >= 50 ? '0.6666' : '0' },
          { label: 'Basophils ≥3%', value: baso >= 3 ? 'Yes (+0.2039)' : 'No' },
          { label: 'Platelets ≥1500', value: plt >= 1500 ? 'Yes (+1.0956)' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Hasford = (0.6666 if age≥50) + 0.042×spleen_cm + 0.0584×blasts% + 0.0413×eos% + (0.2039 if baso≥3%) + (1.0956 if Plt≥1500). Low ≤0.78, intermediate ≤1.48, high >1.48 (distinct from Sokal 0.8/1.2 cutoffs).',
      formula: 'Linear sum of weighted clinical/lab terms (not exponentiated)',
      validation: 'Hasford et al. JNCI 1998 (interferon-based cohorts).',
      references: [
        {
          title: 'A new prognostic score for survival of patients with chronic myeloid leukemia treated with interferon alfa',
          citation: 'Hasford J et al. J Natl Cancer Inst. 1998',
          year: 1998,
          pmid: '9625174',
          doi: '10.1093/jnci/90.11.850',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any score', actions: ['Compare with Sokal/EUTOS/ELTS', 'Initiate TKI per guidelines', 'Serial BCR::ABL1 IS'] },
    ],
    pearls: ['Platelet threshold is very high (≥1500 ×10⁹/L).', 'Prefer ELTS for long-term OS prediction on TKIs.'],
  },

  // ─── 7. EUTOS CML ──────────────────────────────────────────────────────────
  {
    id: 'eutos',
    name: 'EUTOS Score (CML)',
    shortName: 'EUTOS',
    description: 'Simple two-variable EUTOS score for complete cytogenetic response prediction in CML on imatinib.',
    category: 'hematology',
    tags: ['eutos', 'cml', 'prognosis', 'imatinib'],
    whenToUse: 'Chronic-phase CML at diagnosis when a simple spleen + basophil score is desired.',
    whyUse: 'Minimal inputs; originally validated for CCyR probability on imatinib (not identical to ELTS long-term survival model).',
    inputs: [
      numberInput('spleen', 'Spleen size below costal margin', { unit: 'cm', min: 0, max: 40, step: 0.5, defaultValue: 0, helpText: 'Clinical exam, cm below left costal margin in the midclavicular line; 0 if not palpable' }),
      numberInput('basophils', 'Peripheral basophils', { unit: '%', min: 0, max: 30, step: 0.1, defaultValue: 1 }),
    ],
    calculate(values) {
      const spleen = num(values.spleen, 0);
      const basophils = num(values.basophils, 1);
      const score = round(spleen * 4 + basophils * 7, 1);
      if (score <= 87) {
        return {
          score,
          label: 'Low risk (≤87)',
          interpretation: `EUTOS ${score}. Low risk for not achieving CCyR on imatinib in original model. Still use molecular milestones and consider ELTS for OS.`,
          riskLevel: 'low',
          details: [
            { label: '4 × spleen (cm)', value: String(round(4 * spleen, 1)) },
            { label: '7 × basophils (%)', value: String(round(7 * basophils, 1)) },
          ],
        };
      }
      return {
        score,
        label: 'High risk (>87)',
        interpretation: `EUTOS ${score}. High risk of failing CCyR on imatinib historically. Modern practice may use 2G-TKI and close monitoring regardless.`,
        riskLevel: 'high',
        details: [
          { label: '4 × spleen (cm)', value: String(round(4 * spleen, 1)) },
          { label: '7 × basophils (%)', value: String(round(7 * basophils, 1)) },
        ],
      };
    },
    evidence: {
      summary: 'EUTOS score = (spleen cm × 4) + (basophils % × 7). Low ≤87, high >87 for CCyR prediction on imatinib.',
      formula: 'Score = 4×spleen_cm + 7×basophil_%',
      validation: 'Hasford et al. Blood 2011 (European Treatment and Outcome Study).',
      references: [
        {
          title: 'Predicting complete cytogenetic response and subsequent progression-free survival in 2060 patients with CML on imatinib: the EUTOS score',
          citation: 'Hasford J et al. Blood. 2011',
          year: 2011,
          pmid: '21536864',
          doi: '10.1182/blood-2010-12-319038',
        },
      ],
    },
    nextSteps: [
      { condition: 'High EUTOS', actions: ['Discuss TKI potency options', 'Ensure adherence and drug interactions review'] },
      { condition: 'Any', actions: ['Also compute ELTS if long-term OS risk needed', 'Molecular monitoring plan'] },
    ],
    pearls: [
      'EUTOS is binary (low/high) and endpoint was CCyR, not OS.',
      'ELTS uses age, spleen, blasts, and platelets for TKI-era survival.',
    ],
  },

  // ─── 8. ISS myeloma ────────────────────────────────────────────────────────
  {
    id: 'iss-myeloma',
    name: 'ISS (Multiple Myeloma)',
    shortName: 'ISS',
    description: 'International Staging System for multiple myeloma using β2-microglobulin and albumin.',
    category: 'hematology',
    tags: ['iss', 'myeloma', 'staging', 'beta-2 microglobulin', 'albumin'],
    whenToUse: 'Newly diagnosed multiple myeloma staging (pair with R-ISS when cytogenetics/LDH available).',
    whyUse: 'Simple, widely validated three-stage system that correlates with overall survival.',
    inputs: [
      numberInput('b2m', 'Serum β₂-microglobulin', { unit: 'mg/L', min: 0.5, max: 50, step: 0.1, defaultValue: 3.0, helpText: 'ISS I if <3.5 mg/L (with albumin ≥3.5 g/dL); ISS III if ≥5.5 mg/L regardless of albumin.' }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 3.8, helpText: 'ISS I requires albumin ≥3.5 g/dL together with β2M <3.5 mg/L.' }),
    ],
    calculate(values) {
      const b2m = num(values.b2m, 3);
      const alb = num(values.albumin, 3.8);
      let stage = 2;
      let label = 'ISS Stage II';
      let interpretation =
        'ISS II: neither stage I nor III criteria. Intermediate prognosis historically; refine with R-ISS (LDH + high-risk FISH).';
      let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';

      if (b2m < 3.5 && alb >= 3.5) {
        stage = 1;
        label = 'ISS Stage I';
        interpretation =
          'ISS I (β2M <3.5 mg/L and albumin ≥3.5 g/dL). Best classical ISS stratum. Still obtain FISH and LDH for R-ISS.';
        riskLevel = 'low';
      } else if (b2m >= 5.5) {
        stage = 3;
        label = 'ISS Stage III';
        interpretation =
          'ISS III (β2M ≥5.5 mg/L). Highest classical ISS risk. Evaluate renal function contribution to β2M and complete R-ISS.';
        riskLevel = 'high';
      }

      return {
        score: stage,
        unit: 'stage',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'β₂-microglobulin', value: `${b2m} mg/L` },
          { label: 'Albumin', value: `${alb} g/dL` },
        ],
      };
    },
    evidence: {
      summary: 'ISS I: β2M <3.5 and albumin ≥3.5; III: β2M ≥5.5; II: all others (Greipp et al.).',
      formula: 'Stage from β2-microglobulin (mg/L) and albumin (g/dL) thresholds',
      validation: 'International Myeloma Working Group; foundation for R-ISS.',
      references: [
        {
          title: 'International staging system for multiple myeloma',
          citation: 'Greipp PR et al. J Clin Oncol. 2005',
          year: 2005,
          pmid: '15809451',
          doi: '10.1200/JCO.2005.04.242',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any ISS', actions: ['FISH panel (incl. del17p, t(4;14), t(14;16))', 'LDH for R-ISS', 'CRAB/SLiM assessment'] },
    ],
    pearls: ['β2M rises with renal failure — interpret with creatinine.', 'R-ISS is preferred when LDH and cytogenetics known.'],
  },

  // ─── 9. R-ISS myeloma ──────────────────────────────────────────────────────
  {
    id: 'r-iss-myeloma',
    name: 'R-ISS (Revised Myeloma Staging)',
    shortName: 'R-ISS',
    description: 'Revised International Staging System combining ISS with LDH and high-risk chromosomal abnormalities.',
    category: 'hematology',
    tags: ['r-iss', 'myeloma', 'staging', 'fish', 'ldh'],
    whenToUse: 'Newly diagnosed multiple myeloma when ISS stage, LDH, and FISH results are available.',
    whyUse: 'Improves prognostic separation versus ISS alone in the novel-agent era.',
    inputs: [
      selectInput('iss', 'ISS stage', [
        { label: 'ISS I', value: 1, description: 'β₂-microglobulin <3.5 mg/L AND albumin ≥3.5 g/dL' },
        { label: 'ISS II', value: 2, description: 'Neither ISS I nor ISS III' },
        { label: 'ISS III', value: 3, description: 'β₂-microglobulin ≥5.5 mg/L (albumin any)' },
      ], undefined, 'Use the ISS (Greipp) calculator in this app if needed. High-risk CA = del(17p) and/or t(4;14) and/or t(14;16) by iFISH.'),
      yesNo('highLdh', 'LDH > upper limit of normal', 1),
      yesNo('highRiskCa', 'High-risk CA by iFISH', 1, 'del(17p) and/or t(4;14) and/or t(14;16)'),
    ],
    calculate(values) {
      const iss = num(values.iss, 1);
      const highLdh = bool(values.highLdh);
      const highCa = bool(values.highRiskCa);
      const adverse = highLdh || highCa;

      // R-ISS I: ISS I AND normal LDH AND no high-risk CA
      // R-ISS III: ISS III AND (high LDH OR high-risk CA)
      // R-ISS II: all others
      let stage = 2;
      let label = 'R-ISS Stage II';
      let interpretation =
        'R-ISS II (neither pure I nor III). Intermediate revised stage — standard risk-adapted induction/transplant pathways apply.';
      let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';

      if (iss === 1 && !highLdh && !highCa) {
        stage = 1;
        label = 'R-ISS Stage I';
        interpretation =
          'R-ISS I: ISS I without elevated LDH or high-risk FISH. Most favorable revised stratum.';
        riskLevel = 'low';
      } else if (iss === 3 && adverse) {
        stage = 3;
        label = 'R-ISS Stage III';
        interpretation =
          'R-ISS III: ISS III plus elevated LDH and/or high-risk CA. Highest risk — consider intensive/novel strategies and trials.';
        riskLevel = 'high';
      }

      return {
        score: stage,
        unit: 'stage',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ISS input', value: String(iss) },
          { label: 'LDH > ULN', value: highLdh ? 'Yes' : 'No' },
          { label: 'High-risk CA', value: highCa ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'R-ISS I = ISS I + normal LDH + no high-risk CA; R-ISS III = ISS III + (high LDH or high-risk CA); else R-ISS II. High-risk CA: del(17p), t(4;14), t(14;16).',
      formula: 'Logical combination of ISS + LDH + iFISH high-risk features',
      validation: 'Palumbo et al. JCO 2015 (IMWG).',
      references: [
        {
          title: 'Revised International Staging System for Multiple Myeloma: A Report From International Myeloma Working Group',
          citation: 'Palumbo A et al. J Clin Oncol. 2015',
          year: 2015,
          pmid: '26240224',
          doi: '10.1200/JCO.2015.61.2267',
        },
      ],
    },
    nextSteps: [
      { condition: 'R-ISS III', actions: ['Clinical trial consideration', 'Doublet/triplet/quad per era and fitness', 'Maintenance planning'] },
      { condition: 'Any', actions: ['Confirm CA by iFISH on plasma cells', 'Assess transplant eligibility'] },
    ],
    pearls: ['R2-ISS further refines intermediate groups with 1q and other features.', 'High-risk CA definition is IMWG R-ISS panel — not all adverse lesions.'],
  },

  // ─── 10. Durie-Salmon simplified ───────────────────────────────────────────
  {
    id: 'durie-salmon',
    name: 'Durie-Salmon Stage (Simplified)',
    shortName: 'Durie-Salmon',
    description: 'Educational simplified Durie-Salmon multiple myeloma stage from clinical/lab burden features.',
    category: 'hematology',
    tags: ['durie-salmon', 'myeloma', 'staging'],
    whenToUse: 'Historical staging context or when comparing older literature; ISS/R-ISS preferred for modern prognosis.',
    whyUse: 'Captures tumor burden concept (anemia, calcium, bone disease, M-protein) plus creatinine substage A/B.',
    inputs: [
      selectInput('stageFeatures', 'Highest applicable burden category', [
        {
          label: 'Stage I: ALL of Hb >10 g/dL, Ca normal (≤12 mg/dL), bone x-ray normal or solitary plasmacytoma, low M-protein',
          value: 1,
          description: 'Low M-protein = IgG <5 g/dL, IgA <3 g/dL, or urine light chain <4 g/24 h (Durie & Salmon 1975)',
        },
        { label: 'Stage II: intermediate (neither I nor III)', value: 2, description: 'Does not meet all Stage I criteria and has no Stage III feature' },
        {
          label: 'Stage III: ONE or more of Hb <8.5 g/dL, Ca >12 mg/dL, advanced lytic lesions, or high M-protein',
          value: 3,
          description: 'High M-protein = IgG >7 g/dL, IgA >5 g/dL, or urine light chain >12 g/24 h. Advanced lytic lesions = multiple punched-out osteolytic lesions (not a solitary plasmacytoma).',
        },
      ], undefined, 'Pick the highest burden category that applies. Stage I requires ALL low-burden features; Stage III needs only ONE high-burden feature; Stage II is everything in between.'),
      selectInput('creatinine', 'Creatinine substage', [
        { label: 'A — Creatinine < 2.0 mg/dL (<177 µmol/L)', value: 'A' },
        { label: 'B — Creatinine ≥ 2.0 mg/dL (≥177 µmol/L)', value: 'B' },
      ]),
    ],
    calculate(values) {
      const stage = num(values.stageFeatures, 2);
      const cr = String(values.creatinine ?? 'A');
      const label = `Durie-Salmon Stage ${stage}${cr}`;
      const r = riskFromThresholds(stage, [
        {
          max: 1,
          level: 'low',
          label,
          interpretation: `Stage I${cr}: low tumor burden pattern. Modern systems (ISS/R-ISS) better for prognosis; treat based on active myeloma criteria, not DS alone.`,
        },
        {
          max: 2,
          level: 'moderate',
          label,
          interpretation: `Stage II${cr}: intermediate burden. Use IMWG response criteria and ISS/R-ISS for contemporary risk.`,
        },
        {
          max: 3,
          level: 'high',
          label,
          interpretation: `Stage III${cr}: high tumor burden pattern. Substage B indicates significant renal impairment — prioritize reversible causes and myeloma kidney management.`,
        },
      ]);
      return {
        score: `${stage}${cr}`,
        ...r,
        details: [
          { label: 'Tumor burden stage', value: String(stage) },
          { label: 'Creatinine substage', value: cr },
        ],
      };
    },
    evidence: {
      summary:
        'Durie-Salmon I vs III by anemia, calcium, skeletal disease, and M-protein burden; A/B by creatinine <2 vs ≥2 mg/dL. Simplified educational entry.',
      formula: 'Stage I/II/III by burden features; A/B by creatinine',
      validation: 'Historical standard (Durie & Salmon 1975); largely replaced by ISS/R-ISS for survival prediction.',
      references: [
        {
          title: 'A clinical staging system for multiple myeloma',
          citation: 'Durie BG, Salmon SE. Cancer. 1975',
          year: 1975,
          pmid: '1182674',
          doi: '10.1002/1097-0142(197509)36:3<842::aid-cncr2820360303>3.0.co;2-u',
        },
      ],
    },
    nextSteps: [
      { condition: 'Substage B', actions: ['Nephrology co-management', 'Light-chain cast nephropathy workup', 'Hydration / avoid nephrotoxins'] },
      { condition: 'Any', actions: ['Prefer ISS + R-ISS for prognosis', 'IMWG diagnosis of active myeloma'] },
    ],
    pearls: ['DS reflects tumor mass more than modern molecular risk.', 'Exact M-protein cutoffs differ by isotype in the original system.'],
  },

  // ─── 11. Rai CLL ───────────────────────────────────────────────────────────
  {
    id: 'cll-rai',
    name: 'Rai Staging (CLL)',
    shortName: 'Rai',
    description: 'Rai clinical staging system for chronic lymphocytic leukemia.',
    category: 'hematology',
    tags: ['cll', 'rai', 'staging', 'leukemia'],
    whenToUse: 'Staging newly diagnosed or progressing CLL in systems that use Rai (common in North America).',
    whyUse: 'Simple exam/lab stages correlate with survival and are used with CLL-IPI for treatment timing discussions.',
    inputs: [
      selectInput('rai', 'Highest applicable Rai stage', [
        { label: '0 — Lymphocytosis only in blood/marrow', value: 0, description: 'Absolute lymphocytosis without adenopathy, organomegaly, anemia, or thrombocytopenia' },
        { label: 'I — Lymphocytosis + lymphadenopathy', value: 1, description: 'Enlarged nodes (any site) without spleen/liver enlargement or cytopenias below the III–IV cuts' },
        { label: 'II — Lymphocytosis + spleen and/or liver enlargement (± nodes)', value: 2, description: 'Palpable splenomegaly and/or hepatomegaly; nodes may also be present' },
        { label: 'III — Lymphocytosis + anemia (Hb < 11 g/dL)', value: 3, description: 'Hb <11 g/dL from CLL (exclude hemolysis/other causes when assigning stage). Outranks nodes/organomegaly.' },
        { label: 'IV — Lymphocytosis + thrombocytopenia (Plt < 100 × 10⁹/L)', value: 4, description: 'Platelets <100 × 10⁹/L from CLL (exclude ITP when assigning stage). Highest Rai stage if present.' },
      ], undefined, 'Select the highest applicable stage. Anemia (III, Hb <11) or thrombocytopenia (IV, Plt <100) outranks lymphadenopathy or organomegaly even if those are also present. Lymphocytosis is required at every stage.'),
    ],
    calculate(values) {
      const stage = num(values.rai, 0);
      if (stage === 0) {
        return {
          score: stage,
          label: 'Rai 0 — Low risk',
          interpretation: 'Rai low risk. Many patients observe (watch and wait) until IWCLL treatment indications.',
          riskLevel: 'low',
          details: [{ label: 'Modified risk group', value: 'Low (0)' }],
        };
      }
      if (stage <= 2) {
        return {
          score: stage,
          label: `Rai ${stage} — Intermediate risk`,
          interpretation: `Rai ${stage} (intermediate). Treatment still driven by IWCLL indications (symptoms, threatened end-organ, progressive cytopenias, rapid doubling), not stage alone.`,
          riskLevel: 'moderate',
          details: [{ label: 'Modified risk group', value: 'Intermediate (I–II)' }],
        };
      }
      return {
        score: stage,
        label: `Rai ${stage} — High risk`,
        interpretation: `Rai ${stage} (high). Anemia (III) or thrombocytopenia (IV) often meets treatment criteria once immune cytopenias and other causes excluded — integrate CLL-IPI and fitness.`,
        riskLevel: 'high',
        details: [{ label: 'Modified risk group', value: 'High (III–IV)' }],
      };
    },
    evidence: {
      summary: 'Rai 0 lymphocytosis; I +nodes; II +hepato/splenomegaly; III anemia Hb<11; IV Plt<100. Modified groups: low 0, int I–II, high III–IV.',
      formula: 'Ordinal clinical stage 0–IV',
      validation: 'Rai et al. Blood 1975; still standard bedside staging.',
      references: [
        {
          title: 'Clinical staging of chronic lymphocytic leukemia',
          citation: 'Rai KR et al. Blood. 1975',
          year: 1975,
          pmid: '1139039',
          doi: '10.1182/blood.V46.2.219.219',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rai III–IV', actions: ['Evaluate hemolysis/ITP vs marrow failure', 'IGHV, FISH/TP53', 'Treatment vs trial discussion'] },
      { condition: 'Rai 0–II asymptomatic', actions: ['Active surveillance', 'Vaccinations', 'CLL-IPI if prognostic counseling needed'] },
    ],
    pearls: ['Stage is not an automatic trigger to treat asymptomatic early CLL.', 'Binet is preferred in many European centers.'],
  },

  // ─── 12. Binet CLL ─────────────────────────────────────────────────────────
  {
    id: 'cll-binet',
    name: 'Binet Staging (CLL)',
    shortName: 'Binet',
    description: 'Binet clinical staging for chronic lymphocytic leukemia based on lymphoid areas and cytopenias.',
    category: 'hematology',
    tags: ['cll', 'binet', 'staging', 'leukemia'],
    whenToUse: 'CLL staging using lymphoid area count and hemoglobin/platelet thresholds (common in Europe).',
    whyUse: 'Three-group system that is quick at the bedside and used in CLL-IPI stage component definitions.',
    inputs: [
      selectInput('binet', 'Binet stage', [
        {
          label: 'A — < 3 lymphoid areas involved; Hb ≥10 and Plt ≥100',
          value: 'A',
        },
        {
          label: 'B — ≥ 3 lymphoid areas involved; Hb ≥10 and Plt ≥100',
          value: 'B',
        },
        {
          label: 'C — Hb < 10 g/dL and/or platelets < 100 × 10⁹/L (any area count)',
          value: 'C',
        },
      ], undefined, 'Five lymphoid areas: cervical, axillary, inguinal, spleen, liver. Involvement of both sides of one region counts as ONE area (max 5). Palpable enlargement.'),
    ],
    calculate(values) {
      const stage = String(values.binet ?? 'A');
      // Lymphoid areas: cervical, axillary, inguinal, spleen, liver (each counts once bilaterally as one area)
      if (stage === 'A') {
        return {
          score: 'A',
          label: 'Binet A',
          interpretation:
            'Binet A: fewer than 3 lymphoid areas without severe cytopenias. Often observed until IWCLL indications for therapy.',
          riskLevel: 'low',
          details: [{ label: 'Lymphoid areas concept', value: 'Cervical, axillary, inguinal, spleen, liver (max 5)' }],
        };
      }
      if (stage === 'B') {
        return {
          score: 'B',
          label: 'Binet B',
          interpretation:
            'Binet B: ≥3 lymphoid areas without Hb<10 or Plt<100. Intermediate clinical stage — treat when symptomatic/progressive per IWCLL.',
          riskLevel: 'moderate',
          details: [{ label: 'Areas involved', value: '≥ 3' }],
        };
      }
      return {
        score: 'C',
        label: 'Binet C',
        interpretation:
          'Binet C: anemia (Hb <10) and/or thrombocytopenia (Plt <100). High-stage disease; evaluate causes and typically consider therapy.',
        riskLevel: 'high',
        details: [{ label: 'Defining feature', value: 'Cytopenia thresholds' }],
      };
    },
    evidence: {
      summary:
        'Binet A <3 areas; B ≥3 areas; C Hb<10 or Plt<100. Five areas: cervical, axillary, inguinal nodes, spleen, liver.',
      formula: 'Area count + cytopenia rules',
      validation: 'Binet et al. Cancer 1981; standard in many cooperative groups.',
      references: [
        {
          title: 'A new prognostic classification of chronic lymphocytic leukemia derived from a multivariate survival analysis',
          citation: 'Binet JL et al. Cancer. 1981',
          year: 1981,
          pmid: '7237385',
          doi: '10.1002/1097-0142(19810701)48:1<198::aid-cncr2820480131>3.0.co;2-v',
        },
      ],
    },
    nextSteps: [
      { condition: 'Binet C', actions: ['Exclude AIHA/ITP', 'TP53/IGHV testing', 'Therapy planning'] },
      { condition: 'Binet A/B', actions: ['Watchful waiting if asymptomatic', 'CLL-IPI optional'] },
    ],
    pearls: ['Bilateral cervical nodes count as one area, not two.', 'Rai III–IV roughly align with Binet C cytopenias but cutoffs differ (Hb 11 vs 10).'],
  },

  // ─── 13. CLL-IPI ───────────────────────────────────────────────────────────
  {
    id: 'cll-ipi',
    name: 'CLL-IPI',
    shortName: 'CLL-IPI',
    description: 'CLL International Prognostic Index combining clinical stage, age, β2M, IGHV, and TP53/del(17p).',
    category: 'hematology',
    tags: ['cll-ipi', 'cll', 'prognosis', 'ighv', 'tp53'],
    whenToUse: 'CLL prognostic counseling when molecular/FISH and β2-microglobulin results are available.',
    whyUse: 'Integrates genetics with clinical factors for four OS risk groups in the chemoimmunotherapy era (still used with BTKi/BCL2 contexts).',
    inputs: [
      yesNo('age', 'Age > 65 years', 1),
      yesNo('stage', 'Advanced stage (Rai I–IV or Binet B–C)', 1),
      yesNo('b2m', 'β₂-microglobulin > upper limit of normal', 2),
      yesNo('ighv', 'IGHV unmutated (≥98% identity to germline)', 2, 'Unmutated = ≥98% identity to germline (CLL-IPI / ERIC). Mutated = <98%. 97.0–97.9% is mutated on the 98% convention; use the report’s stated cutoff if the lab uses 97%.'),
      yesNo('tp53', 'del(17p) and/or TP53 mutation', 4),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0) +
        (bool(values.b2m) ? 2 : 0) +
        (bool(values.ighv) ? 2 : 0) +
        (bool(values.tp53) ? 4 : 0);

      if (score <= 1) {
        return {
          score,
          label: 'Low risk (0–1)',
          interpretation: 'CLL-IPI low. Favorable OS historically. Many remain on observation if no IWCLL treatment indication.',
          riskLevel: 'low',
          details: [{ label: 'Points', value: `${score} / 10` }],
        };
      }
      if (score <= 3) {
        return {
          score,
          label: 'Intermediate risk (2–3)',
          interpretation: 'CLL-IPI intermediate. Individualize surveillance intensity and pre-treatment molecular reassessment.',
          riskLevel: 'moderate',
          details: [{ label: 'Points', value: `${score} / 10` }],
        };
      }
      if (score <= 6) {
        return {
          score,
          label: 'High risk (4–6)',
          interpretation: 'CLL-IPI high. Higher mortality risk historically — ensure TP53/IGHV known before chemoimmunotherapy; targeted agents preferred in many high-risk settings.',
          riskLevel: 'high',
          details: [{ label: 'Points', value: `${score} / 10` }],
        };
      }
      return {
        score,
        label: 'Very high risk (7–10)',
        interpretation: 'CLL-IPI very high (typically includes TP53 aberration). Avoid FCR-like chemoimmunotherapy; use pathway inhibitors / trials per current guidelines.',
        riskLevel: 'critical',
        details: [{ label: 'Points', value: `${score} / 10` }],
      };
    },
    evidence: {
      summary:
        'CLL-IPI: age>65 (1), advanced stage (1), β2M>ULN (2), unmutated IGHV (2), del(17p)/TP53mut (4). Low 0–1, int 2–3, high 4–6, very high 7–10.',
      formula: 'Weighted sum 0–10',
      validation: 'International CLL-IPI working group (Lancet Oncol 2016).',
      references: [
        {
          title: 'An international prognostic index for patients with chronic lymphocytic leukaemia (CLL-IPI)',
          citation: 'International CLL-IPI working group. Lancet Oncol. 2016',
          year: 2016,
          pmid: '27185642',
          doi: '10.1016/S1470-2045(16)30029-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'TP53 / very high', actions: ['BTK or BCL2-based therapy preferred over CIT', 'Clinical trial', 'Infection prophylaxis planning'] },
      { condition: 'Any', actions: ['Confirm IWCLL treatment indication before starting therapy'] },
    ],
    pearls: ['Score predicts prognosis; treatment initiation still follows IWCLL criteria.', 'Retest TP53 at progression before next line.'],
  },

  // ─── 14. PIT PTCL ──────────────────────────────────────────────────────────
  {
    id: 'pit-tcell',
    name: 'PIT (Peripheral T-cell Lymphoma)',
    shortName: 'PIT',
    description: 'Prognostic Index for Peripheral T-cell lymphoma, unspecified (PTCL-NOS).',
    category: 'hematology',
    tags: ['pit', 'ptcl', 't-cell lymphoma', 'prognosis', 'nhl'],
    whenToUse: 'Newly diagnosed PTCL (especially PTCL-NOS) risk stratification.',
    whyUse: 'Four-factor model tailored to PTCL; simpler alternative to IPI in T-cell lymphoma literature.',
    inputs: [
      yesNo('age', 'Age > 60 years', 1),
      yesNo('ecog', 'ECOG performance status ≥ 2', 1, 'ECOG 2 = ambulatory, all self-care, unable to work, up and about >50% of waking hours. 0 = fully active; 1 = strenuous activity limited but light work OK; 3 = limited self-care, in bed/chair >50% of waking hours; 4 = completely disabled.'),
      yesNo('ldh', 'LDH > upper limit of normal', 1),
      yesNo('marrow', 'Bone marrow involvement', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.ecog) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.marrow) ? 1 : 0);

      const groups = [
        {
          max: 0,
          level: 'low' as const,
          label: 'Group 1 (0 factors)',
          interpretation: 'PIT group 1. Most favorable historical OS in PTCL-NOS series. Still requires full T-cell lymphoma workup and often intensive therapy.',
        },
        {
          max: 1,
          level: 'moderate' as const,
          label: 'Group 2 (1 factor)',
          interpretation: 'PIT group 2. Intermediate prognosis. Consider clinical trials and consolidative strategies per subtype/guidelines.',
        },
        {
          max: 2,
          level: 'high' as const,
          label: 'Group 3 (2 factors)',
          interpretation: 'PIT group 3. Higher risk. Multidisciplinary planning; transplant-eligible patients may need early consolidative discussion.',
        },
        {
          max: 4,
          level: 'critical' as const,
          label: 'Group 4 (3–4 factors)',
          interpretation: 'PIT group 4. Poorest historical stratum. Prioritize trials and aggressive/novel approaches when feasible.',
        },
      ];
      const r = riskFromThresholds(score, groups);
      return {
        score,
        ...r,
        details: [{ label: 'PIT factors', value: `${score} / 4` }],
      };
    },
    evidence: {
      summary: 'PIT: age>60, PS≥2, LDH>ULN, bone marrow involvement (each 1). Groups by 0 / 1 / 2 / 3–4 factors.',
      formula: 'Sum of 4 binary factors',
      validation: 'Gallamini et al. Blood 2004 (Intergruppo Italiano Linfomi).',
      references: [
        {
          title: 'Peripheral T-cell lymphoma unspecified (PTCL-U): a new prognostic model from a retrospective multicentric clinical study',
          citation: 'Gallamini A et al. Blood. 2004',
          year: 2004,
          pmid: '14645001',
          doi: '10.1182/blood-2003-09-3080',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any PIT', actions: ['Confirm subtype (PTCL-NOS vs AITL vs ALCL, etc.)', 'CD30, ALK, TFH markers as relevant', 'Trial referral if high-risk'] },
    ],
    pearls: ['IPI is also used in PTCL; PIT includes marrow explicitly.', 'ALCL ALK+ has distinct prognosis not fully captured by PIT.'],
  },

  // ─── 15. aaIPI ─────────────────────────────────────────────────────────────
  {
    id: 'aaipi',
    name: 'Age-Adjusted IPI (aaIPI)',
    shortName: 'aaIPI',
    description: 'Age-adjusted International Prognostic Index for aggressive NHL in patients ≤60 years.',
    category: 'hematology',
    tags: ['aaipi', 'ipi', 'dlbcl', 'lymphoma', 'prognosis'],
    whenToUse: 'Aggressive NHL / DLBCL in patients age ≤60 for risk grouping without the age factor.',
    whyUse: 'Focuses on LDH, performance status, and stage — the dominant factors in younger adults.',
    inputs: [
      yesNo('ldh', 'Serum LDH > upper limit of normal', 1, 'Original aaIPI is for age ≤60; if >60 use full IPI/R-IPI.'),
      yesNo('ecog', 'ECOG performance status ≥ 2', 1, 'ECOG 2 = ambulatory, all self-care, unable to work, up and about >50% of waking hours. 0 = fully active; 1 = strenuous activity limited but light work OK; 3 = limited self-care, in bed/chair >50% of waking hours; 4 = completely disabled.'),
      yesNo('stage', 'Ann Arbor stage III or IV', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.ecog) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Low risk (0)',
          interpretation: 'aaIPI low. Favorable risk in younger patients. Standard immunochemotherapy typically appropriate.',
          riskLevel: 'low',
          details: [{ label: 'aaIPI', value: '0 / 3' }],
        };
      }
      if (score === 1) {
        return {
          score,
          label: 'Low-intermediate (1)',
          interpretation: 'aaIPI low-intermediate. Good outcomes with R-CHOP-like therapy for many; integrate biology (DHL, COO).',
          riskLevel: 'moderate',
          details: [{ label: 'aaIPI', value: '1 / 3' }],
        };
      }
      if (score === 2) {
        return {
          score,
          label: 'High-intermediate (2)',
          interpretation: 'aaIPI high-intermediate. Higher relapse risk — consider trials and CNS risk assessment.',
          riskLevel: 'high',
          details: [{ label: 'aaIPI', value: '2 / 3' }],
        };
      }
      return {
        score,
        label: 'High risk (3)',
        interpretation: 'aaIPI high. All three adverse factors — poorest younger-adult stratum; trials and meticulous supportive care.',
        riskLevel: 'high',
        details: [{ label: 'aaIPI', value: '3 / 3' }],
      };
    },
    evidence: {
      summary: 'aaIPI (age ≤60): LDH>ULN, ECOG≥2, stage III–IV. Low 0 / LI 1 / HI 2 / high 3.',
      formula: 'Sum of 3 binary factors',
      validation: 'Derived with original IPI project for younger cohort stratification.',
      references: [
        {
          title: 'A predictive model for aggressive non-Hodgkin\'s lymphoma',
          citation: 'The International Non-Hodgkin\'s Lymphoma Prognostic Factors Project. N Engl J Med. 1993',
          year: 1993,
          pmid: '8141877',
          doi: '10.1056/NEJM199309303291402',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['CNS-IPI', 'Molecular/FISH workup', 'Trial consideration'] },
    ],
    pearls: ['Do not use aaIPI in patients >60 — use full IPI/R-IPI.', 'Age cut is ≤60 by original definition.'],
  },

  // ─── 16. MIPI mantle ───────────────────────────────────────────────────────
  {
    id: 'mipi-mantle',
    name: 'MIPI (Mantle Cell Lymphoma)',
    shortName: 'MIPI',
    description: 'Mantle Cell Lymphoma International Prognostic Index using simplified point tables (age, ECOG, LDH ratio, WBC).',
    category: 'hematology',
    tags: ['mipi', 'mantle cell', 'lymphoma', 'prognosis'],
    whenToUse: 'Newly diagnosed mantle cell lymphoma risk stratification.',
    whyUse: 'MCL-specific index superior to IPI for this disease; guides intensity discussions with MIPI-c (Ki-67) when available.',
    inputs: [
      selectInput('agePts', 'Age', [
        { label: '< 50 years (0)', value: 0 },
        { label: '50–59 years (1)', value: 1 },
        { label: '60–69 years (2)', value: 2 },
        { label: '≥ 70 years (3)', value: 3 },
      ]),
      selectInput('ecogPts', 'ECOG performance status', [
        { label: '0–1 (0)', value: 0, description: '0 = fully active; 1 = strenuous activity limited but light work OK' },
        { label: '2–4 (2)', value: 2, description: '2 = ambulatory, all self-care, unable to work, up >50% of waking hours; 3 = limited self-care, in bed/chair >50%; 4 = completely disabled' },
      ], undefined, 'Oken/Zubrod scale. MIPI awards 0 points for ECOG 0–1 and 2 points for ECOG 2–4.'),
      selectInput('ldhPts', 'LDH / ULN ratio', [
        { label: '< 0.67 (0)', value: 0 },
        { label: '0.67–0.99 (1)', value: 1 },
        { label: '1.00–1.49 (2)', value: 2 },
        { label: '≥ 1.50 (3)', value: 3 },
      ], undefined, 'Ratio = this patient’s LDH ÷ that lab’s ULN (not raw U/L).'),
      selectInput('wbcPts', 'WBC (×10⁹/L)', [
        { label: '< 6.7 (0)', value: 0 },
        { label: '6.7–9.9 (1)', value: 1 },
        { label: '10.0–14.9 (2)', value: 2 },
        { label: '≥ 15.0 (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.agePts) + num(values.ecogPts) + num(values.ldhPts) + num(values.wbcPts);
      if (score <= 3) {
        return {
          score,
          label: 'Low risk (0–3)',
          interpretation:
            'MIPI low. More favorable MCL stratum. Therapy still often indicated for conventional MCL; consider indolent MCL variants carefully.',
          riskLevel: 'low',
          details: [{ label: 'Simplified MIPI points', value: `${score} / 11` }],
        };
      }
      if (score <= 5) {
        return {
          score,
          label: 'Intermediate risk (4–5)',
          interpretation: 'MIPI intermediate. Standard MCL pathways; combine with Ki-67 (MIPI-c) when available.',
          riskLevel: 'moderate',
          details: [{ label: 'Simplified MIPI points', value: `${score} / 11` }],
        };
      }
      return {
        score,
        label: 'High risk (6–11)',
        interpretation: 'MIPI high. Poorer historical OS — consider intensive / novel BTK-based strategies and trials per fitness and TP53 status.',
        riskLevel: 'high',
        details: [{ label: 'Simplified MIPI points', value: `${score} / 11` }],
      };
    },
    evidence: {
      summary:
        'Simplified MIPI points: age 0–3, ECOG 0/2, LDH/ULN 0–3, WBC 0–3. Low 0–3, intermediate 4–5, high ≥6. Continuous MIPI formula also exists.',
      formula: 'Sum of categorical points (0–11)',
      validation: 'Hoster et al. Blood 2008; MIPI-c adds Ki-67.',
      references: [
        {
          title: 'A new prognostic index (MIPI) for patients with advanced-stage mantle cell lymphoma',
          citation: 'Hoster E et al. Blood. 2008',
          year: 2008,
          pmid: '17962512',
          doi: '10.1182/blood-2007-06-095331',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any MIPI', actions: ['Ki-67 / MIPI-c', 'TP53 assessment', 'Discuss BTKi-based vs chemoimmunotherapy era options'] },
    ],
    pearls: ['This is the simplified point MIPI, not the continuous logarithmic formula.', 'Leukemic non-nodal MCL may behave more indolently.'],
  },

  // ─── 17. Mosteller BSA ─────────────────────────────────────────────────────
  {
    id: 'bsa-mosteller',
    name: 'BSA (Mosteller Formula)',
    shortName: 'Mosteller BSA',
    description: 'Body surface area by the Mosteller formula for chemotherapy and physiologic indexing.',
    category: 'general',
    tags: ['bsa', 'mosteller', 'chemotherapy', 'dosing'],
    whenToUse: 'When BSA is needed for mg/m² dosing, cardiac index, or other indexed parameters.',
    whyUse: 'Simple square-root formula widely accepted and easy to verify at the bedside.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 250, step: 0.1, defaultValue: 170 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 10, max: 400, step: 0.1, defaultValue: 70 }),
    ],
    calculate(values) {
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      if (h <= 0 || w <= 0) {
        return {
          score: '—',
          label: 'Invalid input',
          interpretation: 'Height and weight must be positive.',
          riskLevel: 'info',
        };
      }
      const bsa = round(Math.sqrt((h * w) / 3600), 2);
      return {
        score: bsa,
        unit: 'm²',
        label: 'Mosteller BSA',
        interpretation: `BSA ${bsa} m². Average adult ≈1.6–1.9 m². Apply regimen-specific caps and obesity dosing policies separately.`,
        riskLevel: 'info',
        details: [
          { label: 'Height', value: `${h} cm` },
          { label: 'Weight', value: `${w} kg` },
          { label: 'Formula', value: '√([Ht×Wt]/3600)' },
        ],
        recommendations: ['Pharmacy independent double-check for chemo', 'Document formula used'],
      };
    },
    evidence: {
      summary: 'Mosteller BSA (m²) = √([height_cm × weight_kg] / 3600).',
      formula: 'BSA = sqrt(ht_cm × wt_kg / 3600)',
      validation: 'Mosteller NEJM 1987; correlates closely with DuBois with simpler arithmetic.',
      references: [
        {
          title: 'Simplified calculation of body-surface area',
          citation: 'Mosteller RD. N Engl J Med. 1987',
          year: 1987,
          pmid: '3657876',
          doi: '10.1056/NEJM198710223171717',
        },
      ],
    },
    nextSteps: [
      { condition: 'Chemo dosing', actions: ['Multiply mg/m² × BSA', 'Apply drug caps (e.g., vincristine)', 'Use Calvert for carboplatin AUC'] },
    ],
    pearls: ['Carboplatin is usually AUC-based (Calvert), not mg/m².', 'Institutional policies may cap BSA in obesity.'],
  },

  // ─── 18. CISNE ─────────────────────────────────────────────────────────────
  {
    id: 'cisne',
    name: 'CISNE (Febrile Neutropenia)',
    shortName: 'CISNE',
    description: 'Clinical Index of Stable Febrile Neutropenia for risk of serious complications in seemingly stable patients.',
    category: 'oncology',
    tags: ['cisne', 'febrile neutropenia', 'mascc', 'outpatient', 'oncology'],
    whenToUse: 'Adult solid-tumor patients with febrile neutropenia who appear clinically stable at presentation (not for unstable patients or most hematologic malignancies).',
    whyUse: 'Helps identify who remains high-risk for complications despite apparent stability; complements MASCC.',
    inputs: [
      yesNo('ecog', 'ECOG performance status ≥ 2', 2, 'ECOG 2 = ambulatory, all self-care, unable to work, up and about >50% of waking hours. 0 = fully active; 1 = strenuous activity limited but light work OK; 3 = limited self-care, in bed/chair >50% of waking hours; 4 = completely disabled.'),
      yesNo('copd', 'COPD', 1, 'COPD on chronic treatment — not remote childhood asthma.'),
      yesNo('cvd', 'Chronic cardiovascular disease', 1, 'Documented CHF, ischemic heart disease, or arrhythmia. Hypertension alone does not count.'),
      yesNo('mucositis', 'Mucositis NCI grade ≥ 2', 1, 'CTCAE/NCI-CTC grade 2 = moderate pain, modified diet, oral intake preserved. Grade 3+ = severe pain interfering with oral intake. Tick if ≥2.'),
      yesNo('monocytes', 'Monocytes < 200/µL (< 0.2 × 10⁹/L)', 1),
      yesNo('hyperglycemia', 'Stress-induced hyperglycemia', 2, 'e.g., glucose ≥121 mg/dL without prior diabetes in validation context'),
    ],
    calculate(values) {
      const score =
        (bool(values.ecog) ? 2 : 0) +
        (bool(values.copd) ? 1 : 0) +
        (bool(values.cvd) ? 1 : 0) +
        (bool(values.mucositis) ? 1 : 0) +
        (bool(values.monocytes) ? 1 : 0) +
        (bool(values.hyperglycemia) ? 2 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Low risk (0)',
          interpretation:
            'CISNE low. Lower risk of serious complications among stable FN patients. Outpatient/oral pathways only if MASCC, social support, and local protocol also support.',
          riskLevel: 'low',
          details: [{ label: 'CISNE', value: `${score} (max 8)` }],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Intermediate risk (1–2)',
          interpretation:
            'CISNE intermediate. Elevated complication risk versus score 0 — favor closer observation; many centers avoid early outpatient management.',
          riskLevel: 'moderate',
          details: [{ label: 'CISNE', value: `${score} (max 8)` }],
        };
      }
      return {
        score,
        label: 'High risk (≥3)',
        interpretation:
          'CISNE high. Substantial risk of serious complications despite seeming stability. Inpatient management and IV antibiotics recommended.',
        riskLevel: 'high',
        details: [{ label: 'CISNE', value: `${score} (max 8)` }],
      };
    },
    evidence: {
      summary:
        'CISNE weights: ECOG≥2 (2), COPD (1), chronic CVD (1), mucositis≥2 (1), monocytes<200 (1), stress hyperglycemia (2). Low 0 / int 1–2 / high ≥3.',
      formula: 'Weighted sum (0–8)',
      validation: 'Carmona-Bayonas et al.; useful adjunct to MASCC in solid-tumor outpatient FN pathways.',
      references: [
        {
          title: 'Prediction of serious complications in patients with seemingly stable febrile neutropenia: validation of the Clinical Index of Stable Febrile Neutropenia in a prospective cohort of patients from the FINITE study',
          citation: 'Carmona-Bayonas A et al. J Clin Oncol. 2015',
          year: 2015,
          pmid: '25559804',
          doi: '10.1200/JCO.2014.57.2347',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0 + MASCC low-risk', actions: ['Consider oral outpatient pathway if protocol allows', '24-h contact plan'] },
      { condition: 'Score 1–2', actions: ['Low threshold to admit', 'IV antipseudomonal coverage until stability clear'] },
      { condition: 'Score ≥3', actions: ['Inpatient IV antibiotics', 'Not for outpatient FN pathway'] },
    ],
    pearls: [
      'Do not use CISNE if patient is already unstable (hypotension, organ failure).',
      'MASCC and CISNE answer related but not identical questions — many pathways use both.',
    ],
  },

  // ─── 19. DAS28 ─────────────────────────────────────────────────────────────
  {
    id: 'das28',
    name: 'DAS28 (RA Disease Activity)',
    shortName: 'DAS28',
    description: 'Disease Activity Score using 28 joints with ESR or CRP and patient global assessment.',
    category: 'rheumatology',
    tags: ['das28', 'rheumatoid arthritis', 'disease activity', 'rheumatology'],
    whenToUse: 'Rheumatoid arthritis treat-to-target monitoring with tender/swollen joint counts and acute-phase reactant.',
    whyUse: 'Standard composite endpoint for remission/LDA/MDA/HDA classification in RA trials and clinics.',
    inputs: [
      selectInput('variant', 'DAS28 variant', [
        { label: 'DAS28-ESR', value: 'esr' },
        { label: 'DAS28-CRP', value: 'crp' },
      ]),
      numberInput('tjc', 'Tender joint count (28)', { min: 0, max: 28, defaultValue: 4, helpText: '28 joints = bilateral shoulders, elbows, wrists, MCP1–5, PIP1–5, knees (not hips, ankles, or feet). Tender = pain on pressure/motion.' }),
      numberInput('sjc', 'Swollen joint count (28)', { min: 0, max: 28, defaultValue: 2, helpText: 'Same 28-joint set. Swollen = synovitis, not bony enlargement.' }),
      numberInput('apr', 'ESR (mm/h) or CRP (mg/L)', {
        min: 0,
        max: 200,
        step: 0.1,
        defaultValue: 20,
        helpText: 'Enter ESR if DAS28-ESR; CRP in mg/L if DAS28-CRP',
      }),
      numberInput('pga', 'Patient global assessment', {
        unit: '0–100 mm',
        min: 0,
        max: 100,
        defaultValue: 30,
        helpText: 'How active has your arthritis been during the last week? 0 = not active, 100 = extremely active (VAS 0–100 mm).',
      }),
    ],
    calculate(values) {
      const variant = String(values.variant ?? 'esr');
      const tjc = Math.max(0, num(values.tjc, 0));
      const sjc = Math.max(0, num(values.sjc, 0));
      const apr = Math.max(variant === 'crp' ? 0 : 1, num(values.apr, 20)); // ESR ln needs >0
      const pga = num(values.pga, 30);

      let das: number;
      if (variant === 'crp') {
        // DAS28-CRP = 0.56√TJC + 0.28√SJC + 0.36·ln(CRP+1) + 0.014·PGA + 0.96
        das = 0.56 * Math.sqrt(tjc) + 0.28 * Math.sqrt(sjc) + 0.36 * Math.log(apr + 1) + 0.014 * pga + 0.96;
      } else {
        // DAS28-ESR = 0.56√TJC + 0.28√SJC + 0.70·ln(ESR) + 0.014·PGA
        das = 0.56 * Math.sqrt(tjc) + 0.28 * Math.sqrt(sjc) + 0.7 * Math.log(apr) + 0.014 * pga;
      }
      const score = round(das, 2);

      const r = riskFromThresholds(score, [
        {
          max: 2.59,
          level: 'normal',
          label: 'Remission (<2.6)',
          interpretation: `DAS28 ${score}: remission range by common cutoffs. Confirm with clinical judgment and Boolean/SDAI remission criteria when relevant.`,
        },
        {
          max: 3.2,
          level: 'low',
          label: 'Low disease activity (≤3.2)',
          interpretation: `DAS28 ${score}: low disease activity. Often treat-to-target acceptable range; continue monitoring.`,
        },
        {
          max: 5.1,
          level: 'moderate',
          label: 'Moderate disease activity (≤5.1)',
          interpretation: `DAS28 ${score}: moderate activity. Consider treatment escalation per ACR/EULAR treat-to-target.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High disease activity (>5.1)',
          interpretation: `DAS28 ${score}: high disease activity. Escalate DMARD/biologic strategy; assess adherence and comorbidities.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Variant', value: variant === 'crp' ? 'DAS28-CRP' : 'DAS28-ESR' },
          { label: 'TJC28 / SJC28', value: `${tjc} / ${sjc}` },
          { label: 'APR entered', value: String(apr) },
          { label: 'PGA', value: `${pga} mm` },
        ],
      };
    },
    evidence: {
      summary:
        'DAS28-ESR = 0.56√TJC + 0.28√SJC + 0.70 ln(ESR) + 0.014·PGA. DAS28-CRP adds +0.96 and uses 0.36 ln(CRP+1). Remission <2.6; LDA ≤3.2; MDA ≤5.1; HDA >5.1.',
      formula: 'Composite of joint counts, APR, and patient global (0–100)',
      validation: 'Widely validated; DAS28-CRP and DAS28-ESR are not interchangeable at the same numeric cutoffs perfectly.',
      references: [
        {
          title: 'Modified disease activity scores that include twenty-eight-joint counts. Development and validation in a prospective longitudinal study of patients with rheumatoid arthritis',
          citation: 'Prevoo ML et al. Arthritis Rheum. 1995;38:44-48',
          year: 1995,
          pmid: '7818570',
          doi: '10.1002/art.1780380107',
        },
      ],
    },
    nextSteps: [
      { condition: 'DAS28 >3.2', actions: ['Review DMARD/biologic regimen', 'Assess steroids and bridging', 'Infection screen before escalation'] },
      { condition: 'Remission / LDA', actions: ['Maintain therapy', 'Taper glucocorticoids if used', 'Scheduled re-score'] },
    ],
    pearls: ['28-joint count omits feet — clinical foot disease may be under-represented.', 'CRP units must be mg/L for the standard formula.'],
  },

  // ─── 20. CDAI RA ───────────────────────────────────────────────────────────
  {
    id: 'cdai-ra',
    name: 'CDAI (RA)',
    shortName: 'CDAI',
    description: 'Clinical Disease Activity Index for rheumatoid arthritis (no acute-phase reactant required).',
    category: 'rheumatology',
    tags: ['cdai', 'rheumatoid arthritis', 'disease activity'],
    whenToUse: 'RA disease activity assessment when labs are unavailable or a purely clinical composite is preferred.',
    whyUse: 'Simple sum of joint counts and global assessments; same-day scoring without ESR/CRP.',
    inputs: [
      numberInput('tjc', 'Tender joint count (28)', { min: 0, max: 28, defaultValue: 4, helpText: '28 joints = bilateral shoulders, elbows, wrists, MCP1–5, PIP1–5, knees (not hips, ankles, or feet). Tender = pain on pressure/motion.' }),
      numberInput('sjc', 'Swollen joint count (28)', { min: 0, max: 28, defaultValue: 2, helpText: 'Same 28-joint set. Swollen = synovitis, not bony enlargement.' }),
      numberInput('pga', 'Patient global assessment', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 3, helpText: 'Considering all the ways your arthritis affects you, how have you been? 0 = best, 10 = worst (not 0–100).' }),
      numberInput('ega', 'Evaluator global assessment', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 3, helpText: 'Evaluator/physician global of current RA activity, 0 = none to 10 = worst imaginable.' }),
    ],
    calculate(values) {
      const tjc = num(values.tjc, 0);
      const sjc = num(values.sjc, 0);
      const pga = num(values.pga, 0);
      const ega = num(values.ega, 0);
      const score = round(tjc + sjc + pga + ega, 1);
      const r = riskFromThresholds(score, [
        {
          max: 2.8,
          level: 'normal',
          label: 'Remission (≤2.8)',
          interpretation: `CDAI ${score}: remission. Align with ACR/EULAR Boolean criteria when documenting deep remission.`,
        },
        {
          max: 10,
          level: 'low',
          label: 'Low disease activity (≤10)',
          interpretation: `CDAI ${score}: low disease activity. Often acceptable treat-to-target range.`,
        },
        {
          max: 22,
          level: 'moderate',
          label: 'Moderate disease activity (≤22)',
          interpretation: `CDAI ${score}: moderate activity — consider treatment adjustment.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High disease activity (>22)',
          interpretation: `CDAI ${score}: high disease activity — escalate therapy per guidelines.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'TJC + SJC', value: `${tjc} + ${sjc}` },
          { label: 'PGA + EGA', value: `${pga} + ${ega}` },
        ],
      };
    },
    evidence: {
      summary: 'CDAI = TJC28 + SJC28 + PGA(0–10) + EGA(0–10). Remission ≤2.8; LDA ≤10; MDA ≤22; HDA >22.',
      formula: 'Simple sum (range 0–76)',
      validation: 'Aletaha & Smolen; correlates with DAS28 without needing acute-phase reactants.',
      references: [
        {
          title: 'Acute phase reactants add little to composite disease activity indices for rheumatoid arthritis: validation of a clinical activity score',
          citation: 'Aletaha D et al. Arthritis Res Ther. 2005;7:R796-R806',
          year: 2005,
          pmid: '15987481',
          doi: '10.1186/ar1740',
        },
      ],
    },
    nextSteps: [
      { condition: 'CDAI >10', actions: ['Therapy escalation discussion', 'Steroid bridging if appropriate', 'Reassess in 1–3 months'] },
    ],
    pearls: ['Globals must be on 0–10 scale (not 0–100).', 'SDAI adds CRP (mg/dL) to this sum.'],
  },

  // ─── 21. SDAI RA ───────────────────────────────────────────────────────────
  {
    id: 'sdai-ra',
    name: 'SDAI (RA)',
    shortName: 'SDAI',
    description: 'Simplified Disease Activity Index for rheumatoid arthritis including CRP.',
    category: 'rheumatology',
    tags: ['sdai', 'rheumatoid arthritis', 'disease activity', 'crp'],
    whenToUse: 'RA monitoring when tender/swollen counts, dual globals, and CRP are available.',
    whyUse: 'ACR/EULAR-endorsed composite; remission cutoff commonly used in trials and practice.',
    inputs: [
      numberInput('tjc', 'Tender joint count (28)', { min: 0, max: 28, defaultValue: 4, helpText: '28 joints = bilateral shoulders, elbows, wrists, MCP1–5, PIP1–5, knees (not hips, ankles, or feet). Tender = pain on pressure/motion.' }),
      numberInput('sjc', 'Swollen joint count (28)', { min: 0, max: 28, defaultValue: 2, helpText: 'Same 28-joint set. Swollen = synovitis, not bony enlargement.' }),
      numberInput('pga', 'Patient global assessment', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 3, helpText: 'Considering all the ways your arthritis affects you, how have you been? 0 = best, 10 = worst (not 0–100).' }),
      numberInput('ega', 'Evaluator global assessment', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 3, helpText: 'Evaluator/physician global of current RA activity, 0 = none to 10 = worst imaginable.' }),
      numberInput('crp', 'CRP', { unit: 'mg/dL', min: 0, max: 30, step: 0.1, defaultValue: 0.5, helpText: 'Note mg/dL (not mg/L)' }),
    ],
    calculate(values) {
      const tjc = num(values.tjc, 0);
      const sjc = num(values.sjc, 0);
      const pga = num(values.pga, 0);
      const ega = num(values.ega, 0);
      const crp = num(values.crp, 0);
      const score = round(tjc + sjc + pga + ega + crp, 1);
      const r = riskFromThresholds(score, [
        {
          max: 3.3,
          level: 'normal',
          label: 'Remission (≤3.3)',
          interpretation: `SDAI ${score}: remission. Useful for treat-to-target documentation.`,
        },
        {
          max: 11,
          level: 'low',
          label: 'Low disease activity (≤11)',
          interpretation: `SDAI ${score}: low disease activity.`,
        },
        {
          max: 26,
          level: 'moderate',
          label: 'Moderate disease activity (≤26)',
          interpretation: `SDAI ${score}: moderate activity — consider regimen optimization.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High disease activity (>26)',
          interpretation: `SDAI ${score}: high disease activity — escalate DMARD/biologic therapy as appropriate.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Clinical sum (CDAI without CRP)', value: String(round(tjc + sjc + pga + ega, 1)) },
          { label: 'CRP', value: `${crp} mg/dL` },
        ],
      };
    },
    evidence: {
      summary: 'SDAI = TJC28 + SJC28 + PGA(0–10) + EGA(0–10) + CRP(mg/dL). Remission ≤3.3; LDA ≤11; MDA ≤26; HDA >26.',
      formula: 'CDAI + CRP (mg/dL)',
      validation: 'Aletaha & Smolen; ACR/EULAR remission definitions reference SDAI ≤3.3.',
      references: [
        {
          title: 'A simplified disease activity index for rheumatoid arthritis for use in clinical practice',
          citation: 'Smolen JS et al. Rheumatology (Oxford). 2003',
          year: 2003,
          pmid: '12595618',
          doi: '10.1093/rheumatology/keg072',
        },
      ],
    },
    nextSteps: [
      { condition: 'SDAI >11', actions: ['Adjust DMARD/biologic', 'Address steroid use', 'Infection screen before biologic change'] },
    ],
    pearls: ['CRP must be mg/dL (divide mg/L by 10).', 'SDAI remission ≤3.3 is slightly different from CDAI ≤2.8.'],
  },

  // ─── 22. BASDAI ────────────────────────────────────────────────────────────
  {
    id: 'basdai',
    name: 'BASDAI (Ankylosing Spondylitis)',
    shortName: 'BASDAI',
    description: 'Bath Ankylosing Spondylitis Disease Activity Index from six patient-reported items (0–10).',
    category: 'rheumatology',
    tags: ['basdai', 'ankylosing spondylitis', 'axspa', 'disease activity'],
    whenToUse: 'Axial spondyloarthritis / AS disease activity monitoring and biologic eligibility discussions.',
    whyUse: 'Standard PRO composite; BASDAI ≥4 often denotes active disease in pathways and trials.',
    inputs: [
      numberInput('q1', 'Q1 Overall level of fatigue / tiredness', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 4, helpText: 'Past week. 0 = none, 10 = very severe. Score from the official BASDAI sheet if available.' }),
      numberInput('q2', 'Q2 Overall AS neck, back, or hip pain', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 5, helpText: 'Past week. Neck, back, or hip pain from AS — not generic spinal pain.' }),
      numberInput('q3', 'Q3 Pain/swelling in joints other than neck, back, or hips', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 2, helpText: 'Past week. Peripheral joints OTHER THAN neck, back, or hips.' }),
      numberInput('q4', 'Q4 Discomfort from areas tender to touch or pressure', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 3, helpText: 'Past week. Tender-to-touch/pressure discomfort (entheseal), not the word “enthesitis” alone.' }),
      numberInput('q5', 'Q5 Level of morning stiffness from waking', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 4, helpText: 'Past week. Severity/LEVEL of morning stiffness on waking (0 none – 10 very severe).' }),
      numberInput('q6', 'Q6 Duration of morning stiffness', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3,
        helpText: 'Past week. 0 = 0 h, 10 = 2 h or more (standard 0–10 mapping of duration)',
      }),
    ],
    calculate(values) {
      const q1 = num(values.q1, 0);
      const q2 = num(values.q2, 0);
      const q3 = num(values.q3, 0);
      const q4 = num(values.q4, 0);
      const q5 = num(values.q5, 0);
      const q6 = num(values.q6, 0);
      const stiffness = (q5 + q6) / 2;
      const score = round(0.2 * (q1 + q2 + q3 + q4 + stiffness), 2);
      const r = riskFromThresholds(score, [
        {
          max: 3.99,
          level: 'low',
          label: 'Lower activity (<4)',
          interpretation: `BASDAI ${score}. Below common active-disease threshold of 4. Continue non-biologic measures and reassess; interpret with CRP and ASDAS when available.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Active disease (≥4)',
          interpretation: `BASDAI ${score}. Meets common “active disease” threshold used in many biologic pathways — correlate with ASDAS, CRP, imaging, and function (BASFI).`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Mean stiffness (Q5+Q6)/2', value: String(round(stiffness, 2)) },
          { label: 'Components', value: '0.2 × (Q1+Q2+Q3+Q4+stiffness mean)' },
        ],
      };
    },
    evidence: {
      summary: 'BASDAI = 0.2 × [Q1+Q2+Q3+Q4+(Q5+Q6)/2] with each item 0–10. Score ≥4 often indicates active disease.',
      formula: 'Average of fatigue, spinal pain, peripheral pain, enthesitis, and mean of two stiffness items',
      validation: 'Garrett et al. 1994; widely used in axSpA trials and access criteria.',
      references: [
        {
          title: 'A new approach to defining disease status in ankylosing spondylitis: the Bath Ankylosing Spondylitis Disease Activity Index',
          citation: 'Garrett S et al. J Rheumatol. 1994',
          year: 1994,
          pmid: '7699630',
        },
      ],
    },
    nextSteps: [
      { condition: 'BASDAI ≥4', actions: ['Check CRP / ASDAS', 'NSAID optimization trial documentation', 'Biologic eligibility review'] },
      { condition: 'BASDAI <4', actions: ['Physiotherapy', 'Continue monitoring', 'Reassess if symptoms flare'] },
    ],
    pearls: ['ASDAS includes CRP/ESR and may better track inflammatory activity.', 'Morning stiffness duration is mapped onto 0–10, not raw hours in the sum.'],
  },

  // ─── 23. SLEDAI-2K total interpretation ────────────────────────────────────
  {
    id: 'sle-dai',
    name: 'SLEDAI-2K (Total Interpretation)',
    shortName: 'SLEDAI-2K',
    description: 'Interprets a precomputed SLEDAI-2K total score into common disease-activity bands.',
    category: 'rheumatology',
    tags: ['sledai', 'sle', 'lupus', 'disease activity'],
    whenToUse: 'When SLEDAI-2K has been scored from the 24 descriptors and a total needs band interpretation.',
    whyUse: 'Standard lupus activity index used in trials and clinics; this helper maps totals to severity strata.',
    inputs: [
      numberInput('total', 'SLEDAI-2K total score', {
        min: 0,
        max: 105,
        defaultValue: 6,
        helpText: 'Enter the total from the official SLEDAI-2K form (24 weighted descriptors over the prior 10–30 days). Do not score descriptors here.',
      }),
    ],
    calculate(values) {
      const score = num(values.total, 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'No activity (0)',
          interpretation: 'SLEDAI-2K 0: no scored activity. Clinical surveillance and damage indices (SDI) may still be relevant.',
        },
        {
          max: 5,
          level: 'low',
          label: 'Mild activity (1–5)',
          interpretation: `SLEDAI-2K ${score}: mild activity band (common educational cut). Adjust background therapy and monitor organ-specific signs.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate activity (6–10)',
          interpretation: `SLEDAI-2K ${score}: moderate activity. Consider treatment intensification and close laboratory follow-up.`,
        },
        {
          max: 19,
          level: 'high',
          label: 'High activity (11–19)',
          interpretation: `SLEDAI-2K ${score}: high activity. Often warrants substantial therapy change; evaluate major organ involvement carefully.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high activity (≥20)',
          interpretation: `SLEDAI-2K ${score}: very high activity. Urgent rheumatology/inpatient pathways as indicated by organ systems.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Note', value: 'Bands are widely used educationally; trial definitions may differ' },
          { label: 'Max theoretical', value: '105' },
        ],
        recommendations: [
          'Rescore only active descriptors present in the prior 10–30 days per instrument rules',
          'Pair with PGA and organ-specific tools (e.g., renal)',
        ],
      };
    },
    evidence: {
      summary:
        'SLEDAI-2K sums weighted clinical/lab descriptors. Common bands: 0 none; 1–5 mild; 6–10 moderate; 11–19 high; ≥20 very high (educational).',
      formula: 'User-entered total of weighted SLEDAI-2K items',
      validation: 'Gladman et al. updates to SLEDAI; widely used in SLE RCTs.',
      references: [
        {
          title: 'Systemic lupus erythematosus disease activity index 2000',
          citation: 'Gladman DD et al. J Rheumatol. 2002',
          year: 2002,
          pmid: '11838846',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥6', actions: ['Review serologies and complements', 'Medication adherence', 'Organ-specific workup'] },
      { condition: 'Score ≥11', actions: ['Urgent specialty review', 'Consider hospitalization if major organs'] },
    ],
    pearls: [
      'SLEDAI does not score severity within a descriptor — only presence.',
      'CLASI, renal activity indices, and PGA complement SLEDAI.',
    ],
  },

  // ─── 24. PASI total interpretation ─────────────────────────────────────────
  {
    id: 'pasi',
    name: 'PASI (Total Interpretation)',
    shortName: 'PASI',
    description: 'Interprets a precomputed Psoriasis Area and Severity Index total into mild/moderate/severe bands.',
    category: 'dermatology',
    tags: ['pasi', 'psoriasis', 'dermatology', 'severity'],
    whenToUse: 'When PASI has been calculated from region scores and a severity band is needed for documentation or systemic therapy discussions.',
    whyUse: 'PASI is the standard psoriasis severity composite in trials (PASI-75/90 responses).',
    inputs: [
      numberInput('total', 'PASI total', {
        min: 0,
        max: 72,
        step: 0.1,
        defaultValue: 8,
        helpText: 'Enter the total from the official PASI worksheet (0–72). Do not compute regional erythema/induration/scale here.',
      }),
    ],
    calculate(values) {
      const score = round(num(values.total, 0), 1);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'Clear (0)',
          interpretation: 'PASI 0: clear. Continue maintenance plan if on systemic therapy.',
        },
        {
          max: 4.9,
          level: 'low',
          label: 'Mild (<5)',
          interpretation: `PASI ${score}: mild range for many classifications. Topicals often first-line; consider BSA, DLQI, special sites (face/genitals/palms).`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate (5–10)',
          interpretation: `PASI ${score}: moderate severity band. Phototherapy or systemic/biologic therapy may be appropriate with impact on quality of life.`,
        },
        {
          max: 72,
          level: 'high',
          label: 'Severe (>10)',
          interpretation: `PASI ${score}: severe range commonly used in pathways/trials. Systemic or biologic therapy frequently indicated; screen for PsA.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Theoretical maximum', value: '72' },
          { label: 'Response metrics', value: 'PASI-75 / PASI-90 used in trials' },
        ],
      };
    },
    evidence: {
      summary:
        'PASI combines erythema, induration, and desquamation with area weighting across four body regions (0–72). Educational bands often mild <5, moderate 5–10, severe >10.',
      formula: 'User-entered PASI total (0–72)',
      validation: 'Fredriksson & Pettersson 1978; gold-standard trial endpoint.',
      references: [
        {
          title: 'Severe psoriasis—oral therapy with a new retinoid',
          citation: 'Fredriksson T, Pettersson U. Dermatologica. 1978',
          year: 1978,
          pmid: '357213',
          doi: '10.1159/000250839',
        },
      ],
    },
    nextSteps: [
      { condition: 'PASI >10 or high DLQI', actions: ['Systemic/biologic eligibility', 'TB/hepatitis screen before biologics', 'Assess psoriatic arthritis'] },
      { condition: 'Mild PASI', actions: ['Optimize topicals', 'Trigger counseling', 'DLQI if treatment decisions borderline'] },
    ],
    pearls: [
      'Absolute PASI and BSA/DLQI together guide real-world decisions better than PASI alone.',
      'This tool interprets a total — it does not compute regional PASI components.',
    ],
  },
];
