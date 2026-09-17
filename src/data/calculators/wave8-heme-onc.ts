import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/**
 * Wave 8 — Hematology / Oncology prognostic tools.
 * Each calculator was checked against the primary literature and independent
 * sources; discrepancies are documented in evidence.validation.
 */
export const wave8HemeOncCalcs: Calculator[] = [
  // ─── 1. BALL Score for Relapsed/Refractory CLL ────────────────────────────
  {
    id: 'ball-score-cll',
    name: 'BALL Score for Relapsed/Refractory CLL',
    shortName: 'BALL',
    description:
      'Four-factor prognostic model (β2-microglobulin, anemia, LDH, last-therapy interval) predicting overall survival in relapsed/refractory CLL treated with targeted agents.',
    category: 'hematology',
    tags: ['cll', 'ball', 'relapsed', 'refractory', 'leukemia', 'ibrutinib', 'venetoclax', 'prognosis'],
    whenToUse:
      'Patients with relapsed or refractory CLL who are starting or receiving targeted therapy (BTK inhibitor, PI3K inhibitor, or BCL-2 inhibitor) and for whom an overall-survival estimate would inform treatment choice or goals-of-care discussion.',
    whyUse:
      'The BALL score is the only prognostic model specifically derived and externally validated for overall survival in R/R-CLL on targeted therapies; it identifies a small high-risk subgroup unlikely to do well on available agents.',
    inputs: [
      yesNo('b2mHigh', 'β2-microglobulin ≥5 mg/L', 1, 'Serum β2-microglobulin at or above 5 mg/L (the published cutoff; a value below 5 mg/L scores 0).', false),
      yesNo('anemia', 'Anemia (Hgb <12 g/dL men, <11 g/dL women)', 1, 'Hemoglobin below 12 g/dL (120 g/L) in men or below 11 g/dL (110 g/L) in women.', false),
      yesNo('ldhHigh', 'LDH above upper limit of normal', 1, 'Serum lactate dehydrogenase above the institutional upper limit of normal.', false),
      yesNo('recentTherapy', 'Last therapy initiated <24 months ago', 1, 'Time from initiation of the most recent prior therapy to now is less than 24 months — a marker of rapidly relapsing disease.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.b2mHigh) ? 1 : 0) +
        (bool(values.anemia) ? 1 : 0) +
        (bool(values.ldhHigh) ? 1 : 0) +
        (bool(values.recentTherapy) ? 1 : 0);
      const band = riskFromThresholds(score, [
        { max: 1, level: 'low' as const, label: 'Low risk', interpretation: 'BALL 0–1: low risk. Relatively favorable expected overall survival on targeted therapy in the derivation and validation cohorts.' },
        { max: 3, level: 'moderate' as const, label: 'Intermediate risk', interpretation: 'BALL 2–3: intermediate risk of death on targeted therapy.' },
        { max: 4, level: 'high' as const, label: 'High risk', interpretation: 'BALL 4: high risk — the group least likely to achieve durable benefit from currently available targeted agents; discuss clinical trials, transplant evaluation where appropriate, and goals of care.' },
      ]);
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: band.interpretation,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Score', value: `${score}/4` },
          { label: 'Factors present', value: `${score} of 4 (β2M ≥5, anemia, LDH >ULN, last therapy <24 mo)` },
        ],
        recommendations: [
          'Score 4 (high risk): counsel on guarded prognosis; preferentially refer for clinical trials and evaluate transplant/CAR-T options as appropriate.',
          'Scores ≤2: targeted therapy remains a reasonable option in the context of other available therapies.',
          'Reassess at progression — the model applies at the time a new targeted therapy is being considered.',
        ],
      };
    },
    evidence: {
      summary:
        'Four baseline factors, one point each: β2-microglobulin ≥5 mg/L, anemia (Hgb <12 g/dL men, <11 g/dL women), LDH >ULN, and <24 months since initiation of last therapy. Groups: low 0–1, intermediate 2–3, high 4.',
      formula: 'Score = Σ(β2M ≥5, anemia, LDH >ULN, last therapy <24 mo); 0–1 low / 2–3 intermediate / 4 high',
      validation:
        'Derived in a pooled training set of ibrutinib/chemoimmunotherapy trials and externally validated in idelalisib, venetoclax, and Mayo Clinic cohorts (Soumerai 2019, Lancet Haematol; C-statistics ~0.74–0.79). The β2-microglobulin cutoff is ≥5 mg/L per the primary paper; some secondary sources incorrectly use >3.5.',
      references: [
        {
          title: 'Prognostic risk score for patients with relapsed or refractory chronic lymphocytic leukaemia treated with targeted therapies or chemoimmunotherapy',
          citation: 'Soumerai JD et al. Lancet Haematol. 2019;6(7):e366-e374',
          year: 2019,
          pmid: '31109827',
          doi: '10.1016/S2352-3026(19)30085-7',
        },
      ],
    },
    nextSteps: [
      { condition: 'BALL 4 (high risk)', actions: ['Goals-of-care discussion', 'Clinical trial referral', 'Evaluate allogeneic HCT or cellular therapy where appropriate'] },
      { condition: 'BALL 2–3 (intermediate)', actions: ['Continue/sequence targeted therapy', 'Monitor closely for progression'] },
      { condition: 'BALL 0–1 (low)', actions: ['Standard targeted-therapy sequencing', 'Routine surveillance'] },
    ],
    pearls: [
      'Apply the model when a new targeted therapy is being considered — not at initial CLL diagnosis.',
      'Anemia thresholds are sex-specific: <12 g/dL in men, <11 g/dL in women.',
      'The score was derived in patients with ECOG 0–1 who met iwCLL 2008 treatment criteria.',
    ],
  },

  // ─── 2. IPS-E ─────────────────────────────────────────────────────────────
  {
    id: 'ips-e-cll',
    name: 'International Prognostic Score for Asymptomatic Early-stage CLL (IPS-E)',
    shortName: 'IPS-E',
    description:
      'Three-variable score (unmutated IGHV, absolute lymphocyte count >15 ×10⁹/L, palpable lymph nodes) predicting time to first treatment in early-stage CLL managed with active surveillance.',
    category: 'hematology',
    tags: ['cll', 'ips-e', 'early stage', 'watch and wait', 'ighv', 'lymphocytosis', 'ttft', 'prognosis'],
    whenToUse:
      'Patients with asymptomatic early-stage CLL (Binet A / Rai 0–II) who are managed with active surveillance and want an estimate of their likelihood of needing treatment.',
    whyUse:
      'IPS-E gives an individualized estimate of time to first treatment in early-stage CLL, improving counseling and enabling more rational surveillance intervals and early-intervention trial selection.',
    inputs: [
      yesNo('ighvUnmutated', 'Unmutated IGHV', 1, 'Immunoglobulin heavy-chain variable gene without somatic hypermutation (typically ≤98% germline homology).', false),
      yesNo('alcHigh', 'Absolute lymphocyte count >15 ×10⁹/L', 1, 'Absolute lymphocyte count above 15 ×10⁹/L (15,000/µL) at assessment.', false),
      yesNo('palpableNodes', 'Palpable lymph nodes', 1, 'Any palpable lymphadenopathy on examination (per the IPS-E definition).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.ighvUnmutated) ? 1 : 0) +
        (bool(values.alcHigh) ? 1 : 0) +
        (bool(values.palpableNodes) ? 1 : 0);
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let ttft = '';
      if (score === 0) {
        label = 'Low risk';
        riskLevel = 'low';
        ttft = '~8.4% cumulative risk of treatment by 5 years';
        interpretation =
          'IPS-E 0: low risk. Cumulative risk of first treatment ≈0.1% at 1 year and ≈8.4% at 5 years; routine surveillance intervals are appropriate.';
      } else if (score === 1) {
        label = 'Intermediate risk';
        riskLevel = 'moderate';
        ttft = '~28.4% cumulative risk of treatment by 5 years';
        interpretation =
          'IPS-E 1: intermediate risk. Cumulative risk of first treatment ≈3.1% at 1 year and ≈28.4% at 5 years.';
      } else {
        label = 'High risk';
        riskLevel = 'high';
        ttft = '~61.2% cumulative risk of treatment by 5 years';
        interpretation =
          'IPS-E 2–3: high risk. Cumulative risk of first treatment ≈14.1% at 1 year and ≈61.2% at 5 years; closer surveillance is reasonable.';
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Score', value: `${score}/3` },
          { label: 'Estimated 5-year treatment need', value: ttft },
        ],
        recommendations: [
          'High risk (2–3): consider closer follow-up intervals and early-intervention trial evaluation.',
          'Low/intermediate risk: standard active-surveillance schedules; treat only when iwCLL criteria are met.',
          'The score predicts time to first treatment, not survival — avoid overtreatment of asymptomatic disease.',
        ],
      };
    },
    evidence: {
      summary:
        'Sum of three covariates (1 point each): unmutated IGHV, absolute lymphocyte count >15 ×10⁹/L, and palpable lymph nodes. Groups: low 0, intermediate 1, high 2–3.',
      formula: 'IPS-E = IGHV unmutated + ALC >15 ×10⁹/L + palpable nodes; 0 low / 1 intermediate / 2–3 high',
      validation:
        'Developed and validated on individual patient data from 11 international cohorts (n=4,933) of early-stage CLL on active surveillance (Condoluci 2020, Blood). C-index 0.74 training, 0.70 aggregate validation; 5-year cumulative treatment risk 8.4% / 28.4% / 61.2%.',
      references: [
        {
          title: 'International prognostic score for asymptomatic early-stage chronic lymphocytic leukemia',
          citation: 'Condoluci A et al. Blood. 2020;136(9):1040-1049',
          year: 2020,
          pmid: '32267500',
          doi: '10.1182/blood.2019003453',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk (2–3)', actions: ['Shorter surveillance intervals', 'Consider early-intervention clinical trial', 'Recheck IGHV/FISH/TP53 status as indicated'] },
      { condition: 'Low/intermediate risk', actions: ['Routine watch-and-wait follow-up', 'Educate on symptoms warranting early review'] },
    ],
    pearls: [
      'Applies only to asymptomatic early-stage disease on active surveillance.',
      'Roughly equal weighting of the three factors was supported by similar hazard ratios in the model.',
      'The endpoint is time to first treatment — a high score does not itself mandate therapy.',
    ],
  },

  // ─── 3. GELF Criteria ─────────────────────────────────────────────────────
  {
    id: 'gelf-criteria',
    name: 'Groupe d’Etude des Lymphomes Folliculaires (GELF) Criteria',
    shortName: 'GELF',
    description:
      'High-tumor-burden criteria for follicular lymphoma; meeting any single criterion supports initiation of therapy rather than watchful waiting.',
    category: 'hematology',
    tags: ['gelf', 'follicular lymphoma', 'tumor burden', 'treatment indication', 'lymphoma'],
    whenToUse:
      'Patients with follicular lymphoma when deciding between watchful waiting and starting therapy — a positive criterion indicates high tumor burden.',
    whyUse:
      'GELF criteria are the internationally accepted operational definition of high tumor burden in follicular lymphoma and are still used as enrollment criteria in FL trials.',
    inputs: [
      yesNo('mass7', 'Any nodal or extranodal mass >7 cm', 1, 'A single nodal or extranodal tumor mass exceeding 7 cm in diameter.', false),
      yesNo('threeSites', '≥3 nodal sites each >3 cm', 1, 'Involvement of at least three nodal sites, each measuring more than 3 cm in diameter.', false),
      yesNo('bSymptoms', 'Systemic / B symptoms', 1, 'Fever, drenching night sweats, or unintentional weight loss >10% of body weight.', false),
      yesNo('splenomegaly', 'Splenomegaly below the umbilical line', 1, 'Splenic enlargement whose inferior margin extends below the umbilical line.', false),
      yesNo('compression', 'Compression syndrome', 1, 'Ureteral, orbital, gastrointestinal, or other organ compression by tumor.', false),
      yesNo('effusion', 'Pleural or peritoneal serous effusion', 1, 'Pleural or peritoneal effusion, irrespective of cell content.', false),
      yesNo('leukemic', 'Leukemic phase >5.0 ×10⁹/L', 1, 'More than 5.0 ×10⁹/L circulating malignant cells.', false),
      yesNo('cytopenia', 'Cytopenia (granulocytes <1.0 and/or platelets <100 ×10⁹/L)', 1, 'Granulocyte count below 1.0 ×10⁹/L and/or platelet count below 100 ×10⁹/L.', false),
    ],
    calculate(values) {
      const ids = ['mass7', 'threeSites', 'bSymptoms', 'splenomegaly', 'compression', 'effusion', 'leukemic', 'cytopenia'];
      const count = ids.filter((i) => bool(values[i])).length;
      const positive = count >= 1;
      return {
        score: count,
        unit: 'criteria met',
        label: positive ? 'GELF positive — high tumor burden' : 'GELF negative — low tumor burden',
        interpretation: positive
          ? `${count} GELF ${count === 1 ? 'criterion' : 'criteria'} met: the patient has high tumor burden; initiating therapy (rather than observation) is supported by the GELF framework.`
          : 'No GELF criteria met: low tumor burden; asymptomatic patients may be appropriate for watchful waiting with close follow-up.',
        riskLevel: positive ? 'moderate' : 'low',
        details: [
          { label: 'Criteria met', value: `${count} of 8` },
          { label: 'Treatment indication', value: positive ? 'High tumor burden — therapy generally indicated' : 'Low tumor burden — observation may be appropriate' },
        ],
        recommendations: [
          'Any positive criterion supports starting therapy; the final decision should still weigh symptoms, comorbidity, patient preference, and goals of care.',
          'Low-burden asymptomatic patients: watchful waiting is reasonable — early treatment has not improved survival in this group.',
          'Use FLIPI/FLIPI-2 and Lugano staging for prognostic stratification; GELF is a treatment-trigger tool, not a prognostic score.',
        ],
      };
    },
    evidence: {
      summary:
        'Eight binary criteria defining high tumor burden in follicular lymphoma: mass >7 cm; ≥3 nodal sites each >3 cm; B symptoms; splenomegaly below the umbilical line; compression syndrome; pleural/peritoneal effusion; leukemic phase >5 ×10⁹/L; cytopenia (granulocytes <1.0 and/or platelets <100 ×10⁹/L). Any one criterion = high tumor burden.',
      formula: 'High tumor burden if ≥1 of 8 criteria is present',
      validation:
        'Criteria originate from the GELF randomized studies of low-tumor-burden follicular lymphoma (Brice 1997, JCO) and remain embedded, with minor variations, in contemporary FL trials and guidelines. They are an indication-for-treatment framework, not a validated prognostic index.',
      references: [
        {
          title: 'Comparison in low-tumor-burden follicular lymphomas between an initial no-treatment policy, prednimustine, or interferon alfa: a randomized study from the Groupe d’Etude des Lymphomes Folliculaires',
          citation: 'Brice P et al. J Clin Oncol. 1997;15(3):1110-1117',
          year: 1997,
          pmid: '9060552',
          doi: '10.1200/JCO.1997.15.3.1110',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any criterion met (high tumor burden)', actions: ['Discuss systemic therapy', 'Complete staging and prognostic work-up (FLIPI, PET/CT as appropriate)', 'Consider clinical trial eligibility'] },
      { condition: 'No criteria met (low tumor burden)', actions: ['Watchful waiting with scheduled follow-up', 'Educate on symptoms that should trigger reassessment'] },
    ],
    pearls: [
      'A single positive criterion classifies the patient as high tumor burden.',
      'GELF answers "treat now vs observe" — it does not quantify survival.',
      'Original criteria include the leukemic-phase and cytopenia items; some trial protocols substitute elevated LDH/β2-microglobulin.',
    ],
  },

  // ─── 4. MARS (advanced systemic mastocytosis) ─────────────────────────────
  {
    id: 'mars-advsm',
    name: 'Mutation-Adjusted Risk Score (MARS) for Advanced Systemic Mastocytosis',
    shortName: 'MARS',
    description:
      'Five-parameter WHO-independent prognostic score (age, anemia, thrombocytopenia, and 1 or ≥2 high-molecular-risk mutations) for advanced systemic mastocytosis.',
    category: 'hematology',
    tags: ['mars', 'systemic mastocytosis', 'advsm', 'srsf2', 'asxl1', 'runx1', 'mastocytosis', 'prognosis'],
    whenToUse:
      'Adults with advanced systemic mastocytosis (aggressive SM, SM with associated hematologic neoplasm, or mast cell leukemia) at diagnosis or treatment planning.',
    whyUse:
      'MARS integrates mutation data with clinical parameters to define three validated risk groups independent of WHO variant, aiding up-front treatment stratification in this rare disease.',
    inputs: [
      yesNo('age60', 'Age >60 years', 1, 'Age greater than 60 years at evaluation.', false),
      yesNo('hgbLow', 'Hemoglobin <10 g/dL', 1, 'Anemia with hemoglobin below 10 g/dL (100 g/L).', false),
      yesNo('pltLow', 'Platelets <100 ×10⁹/L', 1, 'Thrombocytopenia with platelet count below 100 ×10⁹/L.', false),
      selectInput('hmr', 'High-molecular-risk mutations (SRSF2, ASXL1, RUNX1)', [
        { label: 'None', value: 'none', points: 0 },
        { label: 'One mutation', value: 'one', points: 1 },
        { label: 'Two or more mutations', value: 'two', points: 2 },
      ], 'none', 'Count of mutations present in SRSF2, ASXL1, and/or RUNX1 (the MARS high-molecular-risk gene set).'),
    ],
    calculate(values) {
      const hmrPts = str(values.hmr, 'none') === 'one' ? 1 : str(values.hmr, 'none') === 'two' ? 2 : 0;
      const score = (bool(values.age60) ? 1 : 0) + (bool(values.hgbLow) ? 1 : 0) + (bool(values.pltLow) ? 1 : 0) + hmrPts;
      const band = riskFromThresholds(score, [
        { max: 1, level: 'low' as const, label: 'Low risk', interpretation: 'MARS 0–1: low risk; median overall survival not reached in the derivation cohort.' },
        { max: 2, level: 'moderate' as const, label: 'Intermediate risk', interpretation: 'MARS 2: intermediate risk; median overall survival ≈3.9 years (95% CI 2.1–5.7).' },
        { max: 5, level: 'high' as const, label: 'High risk', interpretation: 'MARS 3–5: high risk; median overall survival ≈1.9 years (95% CI 1.3–2.6). Also predictive of leukemia-free survival.' },
      ]);
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: band.interpretation,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Score', value: `${score}/5` },
          { label: 'HMR mutation points', value: `${hmrPts}` },
        ],
        recommendations: [
          'High risk: prioritize aggressive management and early discussion of allogeneic HCT where eligible.',
          'Interpret alongside the specific WHO variant, C-findings, mast-cell burden, and organ dysfunction.',
          'MARS is also predictive of leukemic transformation — monitor for progression to MCL/secondary AML.',
        ],
      };
    },
    evidence: {
      summary:
        'Age >60 (+1), hemoglobin <10 g/dL (+1), platelets <100 ×10⁹/L (+1), one HMR mutation in SRSF2/ASXL1/RUNX1 (+1), ≥2 HMR mutations (+2). Groups: low 0–1 (median OS not reached), intermediate 2 (3.9 y), high 3–5 (1.9 y).',
      formula: 'MARS = age>60 + Hgb<10 + plt<100 + (1 HMR→1, ≥2 HMR→2); 0–1 low / 2 intermediate / 3–5 high',
      validation:
        'Developed in the German Registry on Disorders of Eosinophils and Mast Cells (n=231) and confirmed in an independent European/US validation set (n=152) within the European Competence Network on Mastocytosis (Jawhar 2019, JCO). Independent of WHO classification; also predicted leukemia-free survival.',
      references: [
        {
          title: 'MARS: Mutation-Adjusted Risk Score for Advanced Systemic Mastocytosis',
          citation: 'Jawhar M et al. J Clin Oncol. 2019;37(32):2846-2856',
          year: 2019,
          pmid: '31509472',
          doi: '10.1200/JCO.19.00640',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk (3–5)', actions: ['Specialist referral', 'Discuss cytoreductive therapy and allo-HCT evaluation', 'Monitor for leukemic transformation'] },
      { condition: 'Intermediate risk (2)', actions: ['Active treatment per variant and C-findings', 'Serial reassessment'] },
      { condition: 'Low risk (0–1)', actions: ['Symptom-directed and variant-appropriate therapy', 'Routine monitoring'] },
    ],
    pearls: [
      'This is the mastocytosis MARS (Jawhar 2019) — not an AML score.',
      'Only SRSF2, ASXL1, and RUNX1 count as HMR mutations in this score.',
      'WHO variant does not enter the score — it was intentionally WHO-independent.',
    ],
  },

  // ─── 5. GIPSS ─────────────────────────────────────────────────────────────
  {
    id: 'gipss-pmf',
    name: 'Genetically Inspired Prognostic Scoring System (GIPSS) for Primary Myelofibrosis',
    shortName: 'GIPSS',
    description:
      'Genetics-only prognostic model for primary myelofibrosis using karyotype, CALR type 1/like status, and ASXL1/SRSF2/U2AF1Q157 mutations.',
    category: 'hematology',
    tags: ['gipss', 'myelofibrosis', 'pmf', 'karyotype', 'calr', 'asxl1', 'srsf2', 'u2af1', 'prognosis'],
    whenToUse:
      'Patients with primary myelofibrosis when cytogenetic and molecular results are available — particularly for transplant-age risk stratification without clinical variables.',
    whyUse:
      'GIPSS provides a genetics-only four-tier prognostic model with accuracy comparable to MIPSS70-plus, useful when clinical variables are unavailable or when a purely genomic assessment is desired.',
    inputs: [
      selectInput('karyotype', 'Karyotype classification', [
        { label: 'Favorable (includes normal, sole −Y, sole del(20q), sole del(13q), sole +9, sole chromosome 1 translocation/duplication)', value: 'fav', points: 0 },
        { label: 'Unfavorable (other abnormalities not meeting favorable or VHR criteria)', value: 'unfav', points: 1 },
        { label: 'Very high risk (VHR: single/multiple −7, inv(3)/3q21, i(17q), −5/5q−, 12p−/12p11.2, 11q−/11q23, +8 or autosomal trisomy other than +9)', value: 'vhr', points: 2 },
      ], 'fav', 'Karyotype category per the GIPSS definitions: favorable = 0, unfavorable = +1, very high risk = +2.'),
      yesNo('calrAbsent', 'Absence of type 1/like CALR mutation', 1, 'Scores 1 if a type 1/type 1-like CALR mutation is absent (includes CALR-negative and type 2/like CALR-mutated cases).', false),
      yesNo('asxl1', 'ASXL1 mutation', 1, 'Presence of an ASXL1 mutation on molecular profiling.', false),
      yesNo('srsf2', 'SRSF2 mutation', 1, 'Presence of an SRSF2 mutation on molecular profiling.', false),
      yesNo('u2af1', 'U2AF1 Q157 mutation', 1, 'Presence of the U2AF1 Q157 mutation specifically (other U2AF1 variants do not score).', false),
    ],
    calculate(values) {
      const karyo = str(values.karyotype, 'fav');
      const score =
        (karyo === 'unfav' ? 1 : karyo === 'vhr' ? 2 : 0) +
        (bool(values.calrAbsent) ? 1 : 0) +
        (bool(values.asxl1) ? 1 : 0) +
        (bool(values.srsf2) ? 1 : 0) +
        (bool(values.u2af1) ? 1 : 0);
      const band = riskFromThresholds(score, [
        { max: 0, level: 'low' as const, label: 'Low risk', interpretation: 'GIPSS 0: low risk; median survival ≈26.4 years (5-year survival ≈94%).' },
        { max: 1, level: 'moderate' as const, label: 'Intermediate-1 risk', interpretation: 'GIPSS 1: intermediate-1 risk; median survival ≈8.0 years (5-year survival ≈73%).' },
        { max: 2, level: 'high' as const, label: 'Intermediate-2 risk', interpretation: 'GIPSS 2: intermediate-2 risk; median survival ≈4.2 years (5-year survival ≈40%).' },
        { max: 6, level: 'critical' as const, label: 'High risk', interpretation: 'GIPSS ≥3: high risk; median survival ≈2 years (5-year survival ≈14%).' },
      ]);
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: band.interpretation,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Score', value: `${score}/6` },
          { label: 'Karyotype points', value: karyo === 'unfav' ? '1 (unfavorable)' : karyo === 'vhr' ? '2 (very high risk)' : '0 (favorable)' },
        ],
        recommendations: [
          'High risk (≥3): evaluate for allogeneic HCT, especially in younger/fit patients.',
          'Intermediate groups: combine with MIPSS70-v2 or DIPSS for a fuller picture.',
          'Low risk: conservative management is reasonable in the absence of treatment indications.',
        ],
      };
    },
    evidence: {
      summary:
        'HR-weighted genetic risk points: VHR karyotype +2; unfavorable karyotype +1; absent type 1/like CALR +1; ASXL1, SRSF2, or U2AF1 Q157 mutation +1 each. Tiers: low 0 (26.4 y), int-1 1 (8.0 y), int-2 2 (4.2 y), high ≥3 (2 y).',
      formula: 'GIPSS = karyotype(0/1/2) + absent CALR1/like + ASXL1 + SRSF2 + U2AF1Q157; 0 low / 1 int-1 / 2 int-2 / ≥3 high',
      validation:
        'Multivariable analysis of 641 cytogenetically annotated PMF patients (Tefferi 2018, Leukemia); internally validated by bootstrapping with accuracy comparable to MIPSS70-plus. CALR type 1/like absence scores 1 point (not 2) per the published HR-weighted assignment.',
      references: [
        {
          title: 'GIPSS: genetically inspired prognostic scoring system for primary myelofibrosis',
          citation: 'Tefferi A et al. Leukemia. 2018;32(7):1631-1642',
          year: 2018,
          pmid: '29654267',
          doi: '10.1038/s41375-018-0107-z',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk (≥3)', actions: ['Allo-HCT evaluation', 'MPN specialist referral', 'Mutation panel to document HMR mutations'] },
      { condition: 'Intermediate-1/2', actions: ['Risk-adapted treatment', 'Consider transplant work-up if age/fitness permits', 'Monitor for progression'] },
      { condition: 'Low risk', actions: ['Observation or symptom-directed therapy', 'Periodic clinical and molecular review'] },
    ],
    pearls: [
      'Only U2AF1 Q157 scores — other U2AF1 mutations are not counted.',
      'CALR type 2/like counts as "absent type 1/like" (adverse).',
      'GIPSS is genetics-only; combine with clinical models (DIPSS/MIPSS) for comprehensive assessment.',
    ],
  },

  // ─── 6. MYSEC-PM ──────────────────────────────────────────────────────────
  {
    id: 'mysec-pm',
    name: 'MYSEC-PM (Myelofibrosis Secondary to PV and ET Prognostic Model)',
    shortName: 'MYSEC-PM',
    description:
      'Clinical-molecular model predicting survival in post-polycythemia vera and post-essential thrombocythemia (secondary) myelofibrosis.',
    category: 'hematology',
    tags: ['mysec-pm', 'secondary myelofibrosis', 'post-pv', 'post-et', 'mpn', 'calr', 'prognosis'],
    whenToUse:
      'Patients with secondary myelofibrosis evolving from polycythemia vera or essential thrombocythemia, at SMF diagnosis, for survival stratification.',
    whyUse:
      'MYSEC-PM is the first integrated clinical-molecular model specifically validated for secondary (post-PV/post-ET) myelofibrosis, where PMF scores are not directly applicable.',
    inputs: [
      numberInput('age', 'Age at SMF diagnosis', { unit: 'years', min: 18, max: 100, exampleValue: 64, helpText: 'Age in years at diagnosis of secondary myelofibrosis; contributes ~0.15 points per year to the score.' }),
      yesNo('hgbLow', 'Hemoglobin <11 g/dL', 2, 'Hemoglobin below 11 g/dL (110 g/L) at SMF diagnosis scores 2 points.', false),
      yesNo('pltLow', 'Platelets <150 ×10⁹/L', 1, 'Platelet count below 150 ×10⁹/L at SMF diagnosis scores 1 point.', false),
      yesNo('blasts', 'Circulating blasts ≥3%', 2, 'Peripheral-blood blast percentage of 3% or higher scores 2 points.', false),
      yesNo('calrUnmutated', 'CALR-unmutated genotype', 2, 'Absence of a CALR mutation scores 2 points (CALR-mutated patients score 0 here).', false),
      yesNo('constSx', 'Constitutional symptoms', 1, 'Fever, night sweats, or weight loss (>10% in 6 months) per MYSEC-PM criteria scores 1 point.', false),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const agePts = round(age * 0.15, 1);
      const other =
        (bool(values.hgbLow) ? 2 : 0) +
        (bool(values.pltLow) ? 1 : 0) +
        (bool(values.blasts) ? 2 : 0) +
        (bool(values.calrUnmutated) ? 2 : 0) +
        (bool(values.constSx) ? 1 : 0);
      const score = round(agePts + other, 1);
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score < 11) {
        label = 'Low risk';
        riskLevel = 'low';
        interpretation = 'MYSEC-PM <11: low risk; median survival not reached in the derivation cohort.';
      } else if (score < 14) {
        label = 'Intermediate-1 risk';
        riskLevel = 'moderate';
        interpretation = 'MYSEC-PM 11–<14: intermediate-1 risk; median survival ≈9.3 years.';
      } else if (score < 16) {
        label = 'Intermediate-2 risk';
        riskLevel = 'high';
        interpretation = 'MYSEC-PM 14–<16: intermediate-2 risk; median survival ≈4.4 years.';
      } else {
        label = 'High risk';
        riskLevel = 'critical';
        interpretation = 'MYSEC-PM ≥16: high risk; median survival ≈2.0 years — consider allogeneic HCT evaluation, particularly in younger/fit patients.';
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age component', value: `${age} y × 0.15 = ${agePts} points` },
          { label: 'Non-age points', value: `${other}` },
        ],
        recommendations: [
          'Intermediate-2/high risk, especially younger and fit patients: evaluate for allogeneic stem cell transplantation.',
          'Low risk: conservative management and observation are reasonable.',
          'Combine with symptom assessment (MPN-SAF) for treatment decisions.',
        ],
      };
    },
    evidence: {
      summary:
        'Score = 0.15 × age (years) + Hgb <11 g/dL (2) + platelets <150 ×10⁹/L (1) + circulating blasts ≥3% (2) + CALR-unmutated (2) + constitutional symptoms (1). Groups: <11 low, 11–<14 intermediate-1, 14–<16 intermediate-2, ≥16 high.',
      formula: 'MYSEC-PM = 0.15×age + 2(Hgb<11) + 1(plt<150) + 2(blasts≥3%) + 2(CALR-unmutated) + 1(constitutional sx)',
      validation:
        'Developed in the MYSEC project cohort of post-PV/post-ET myelofibrosis (Passamonti 2017, Leukemia). The official MYSEC calculator uses ~0.15 points per year of age; some secondary implementations mistakenly use the unrounded Cox coefficient (≈0.23). Median survival: low NR, int-1 9.3 y, int-2 ~4.4 y, high 2.0 y.',
      references: [
        {
          title: 'A clinical-molecular prognostic model to predict survival in patients with post polycythemia vera and post essential thrombocythemia myelofibrosis',
          citation: 'Passamonti F et al. Leukemia. 2017;31(12):2726-2731',
          year: 2017,
          pmid: '28561069',
          doi: '10.1038/leu.2017.169',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk (≥16)', actions: ['Allo-HCT evaluation', 'MPN center referral', 'Symptom-directed therapy'] },
      { condition: 'Intermediate-2 (14–<16)', actions: ['Discuss transplant candidacy', 'Risk-adapted cytoreduction', 'Close monitoring'] },
      { condition: 'Low / intermediate-1', actions: ['Observation or symptom-directed therapy', 'Periodic reassessment'] },
    ],
    pearls: [
      'Designed for secondary MF — do not apply to primary myelofibrosis (use MIPSS/DIPSS there).',
      'Age enters as a continuous term (~0.15 points/year) rather than a threshold.',
      'Only the CALR genotype is used; JAK2/MPL status does not score.',
    ],
  },

  // ─── 7. Duval/CIBMTR Score ────────────────────────────────────────────────
  {
    id: 'duval-cibmtr-aml',
    name: 'Duval/CIBMTR Score for AML Survival',
    shortName: 'Duval/CIBMTR',
    description:
      'Pre-transplant score predicting 3-year overall survival in patients with relapsed or refractory AML undergoing allogeneic hematopoietic cell transplantation.',
    category: 'hematology',
    tags: ['duval', 'cibmtr', 'aml', 'transplant', 'hsct', 'relapsed', 'refractory', 'prognosis'],
    whenToUse:
      'Patients with relapsed or refractory active AML for whom allogeneic HCT is being considered. Do not use for CML in blast crisis.',
    whyUse:
      'The CIBMTR score stratifies expected 3-year survival after transplant in active-disease AML, supporting the decision between transplant and alternative relapse-mitigation strategies.',
    inputs: [
      selectInput('disease', 'Disease course', [
        { label: 'Primary induction failure OR first CR duration >6 months', value: 'pifOrLongCr', points: 0 },
        { label: 'First complete remission duration <6 months', value: 'shortCr', points: 1 },
      ], 'pifOrLongCr', 'Relapse within 6 months of first complete remission scores +1; primary induction failure or CR1 >6 months scores 0.'),
      yesNo('poorCyto', 'Poor-risk cytogenetics', 1, 'Poor-risk cytogenetic abnormalities present prior to HSCT (per the study definition).', false),
      selectInput('donor', 'Donor type', [
        { label: 'HLA-identical sibling OR well-/partially-matched unrelated donor', value: 'matched', points: 0 },
        { label: 'Mismatched unrelated donor', value: 'mmUrd', points: 1 },
        { label: 'Related donor other than HLA-identical sibling', value: 'otherRel', points: 2 },
      ], 'matched', 'Donor/HLA category: mismatched unrelated +1; related donor other than HLA-identical sibling +2.'),
      yesNo('blasts', 'Circulating blasts at transplant', 1, 'Presence of circulating blasts at the time of transplant.', false),
      yesNo('kpsLow', 'Karnofsky/Lansky score <90', 1, 'Karnofsky (adult) or Lansky (pediatric) performance score below 90.', false),
    ],
    calculate(values) {
      const donor = str(values.donor, 'matched');
      const score =
        (str(values.disease, 'pifOrLongCr') === 'shortCr' ? 1 : 0) +
        (bool(values.poorCyto) ? 1 : 0) +
        (donor === 'mmUrd' ? 1 : donor === 'otherRel' ? 2 : 0) +
        (bool(values.blasts) ? 1 : 0) +
        (bool(values.kpsLow) ? 1 : 0);
      let os = '';
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score === 0) { os = '~42%'; label = 'Lowest risk (score 0)'; riskLevel = 'low'; }
      else if (score === 1) { os = '~28%'; label = 'Low-intermediate risk (score 1)'; riskLevel = 'moderate'; }
      else if (score === 2) { os = '~15%'; label = 'Intermediate-high risk (score 2)'; riskLevel = 'high'; }
      else { os = '~6%'; label = 'High risk (score ≥3)'; riskLevel = 'critical'; }
      return {
        score,
        unit: 'points',
        label,
        interpretation: `Estimated 3-year overall survival after allogeneic HCT ≈${os} in the derivation cohort.${score >= 3 ? ' Very high-risk patients should be counseled and preferentially referred for relapse-mitigation clinical trials.' : ''}`,
        riskLevel,
        details: [
          { label: 'Score', value: `${score}/6` },
          { label: 'Predicted 3-year OS', value: os },
        ],
        recommendations: [
          'Score ≥3: counsel about ~6% 3-year OS; prefer referral for relapse-mitigation trials before/alongside transplant.',
          'Score ≤2: HSCT remains reasonable (predicted OS 15–42%) in the context of other available therapies.',
          'Interpret with disease biology (molecular risk), donor availability, and MRD status.',
        ],
      };
    },
    evidence: {
      summary:
        'Five pre-transplant variables: CR1 duration <6 months (+1; primary induction failure or CR1 >6 months = 0), poor-risk cytogenetics (+1), mismatched unrelated donor (+1) or related donor other than HLA-identical sibling (+2), circulating blasts (+1), Karnofsky/Lansky <90 (+1). 3-year OS: 0→42%, 1→28%, 2→15%, ≥3→6%.',
      formula: 'Score = CR1<6mo + poor cytogenetics + donor(0/1/2) + circulating blasts + KPS<90',
      validation:
        'Derived from 1,673 AML patients transplanted with active disease reported to the CIBMTR (Duval 2010, JCO); externally validated in a 523-patient Italian GITMO cohort including reduced-intensity conditioning and cord-blood grafts.',
      references: [
        {
          title: 'Hematopoietic stem-cell transplantation for acute leukemia in relapse or primary induction failure',
          citation: 'Duval M et al. J Clin Oncol. 2010;28(23):3730-3738',
          year: 2010,
          pmid: '20625136',
          doi: '10.1200/JCO.2010.28.8852',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3 (predicted OS ~6%)', actions: ['Goals-of-care counseling', 'Relapse-mitigation clinical trial referral', 'Discuss alternative/bridging strategies'] },
      { condition: 'Score ≤2', actions: ['Proceed with transplant evaluation', 'Optimize remission quality (MRD) pre-HCT'] },
    ],
    pearls: [
      'Applies to active-disease AML at transplant, not to patients in remission.',
      'The donor factor distinguishes mismatched unrelated (+1) from related donors other than HLA-identical siblings (+2).',
      'Developed in the myeloablative era; validation cohorts included reduced-intensity conditioning.',
    ],
  },

  // ─── 8. HCT-CI ────────────────────────────────────────────────────────────
  {
    id: 'hct-ci',
    name: 'Hematopoietic Cell Transplantation-specific Comorbidity Index (HCT-CI)',
    shortName: 'HCT-CI',
    description:
      'Weighted comorbidity index predicting non-relapse mortality after hematopoietic cell transplantation, with optional age adjustment.',
    category: 'hematology',
    tags: ['hct-ci', 'transplant', 'comorbidity', 'sorror', 'nrm', 'allo-hct', 'hsct'],
    whenToUse:
      'Patients being evaluated for hematopoietic cell transplantation (allogeneic or autologous) to quantify comorbidity burden and estimate non-relapse mortality risk.',
    whyUse:
      'HCT-CI is the standard transplant-specific comorbidity measure; it predicts 2-year non-relapse mortality and helps compare patients for regimen-intensity decisions and clinical trials.',
    inputs: [
      selectInput('transplantType', 'Type of transplant', [
        { label: 'Allogeneic HCT', value: 'allo' },
        { label: 'Autologous SCT', value: 'auto' },
      ], 'allo', 'Informational — HCT-CI was derived in allogeneic recipients; the comorbidity weights are the same. Does not change the score.'),
      numberInput('age', 'Age (optional — for age-adjusted HCT-CI)', { unit: 'years', min: 1, max: 100, exampleValue: 58, required: false, helpText: 'Leave blank for the standard HCT-CI. If entered, adds +1 point per decade starting at 40 (40–49:+1, 50–59:+2, 60–69:+3, 70–79:+4, ≥80:+5) per the age-adjusted index.' }),
      yesNo('arrhythmia', 'Arrhythmia', 1, 'Atrial fibrillation/flutter, sick sinus syndrome, or ventricular arrhythmias (+1).', false),
      yesNo('cardiac', 'Cardiac disease', 1, 'Coronary artery disease (≥1-vessel stenosis requiring treatment/stent/CABG), CHF, MI, or EF ≤50% (+1).', false),
      yesNo('valve', 'Heart valve disease', 3, 'Valvular heart disease except mitral prolapse (+3).', false),
      yesNo('ibd', 'Inflammatory bowel disease', 1, 'Crohn disease or ulcerative colitis (+1).', false),
      yesNo('diabetes', 'Diabetes requiring treatment', 1, 'Diabetes treated with insulin or oral hypoglycemics (diet-controlled does not count) (+1).', false),
      yesNo('cva', 'Cerebrovascular disease', 1, 'Stroke (CVA) or transient ischemic attack (+1).', false),
      yesNo('psych', 'Psychiatric disturbance', 1, 'Depression or anxiety requiring psychiatric consult or continued treatment (+1).', false),
      selectInput('hepatic', 'Hepatic dysfunction', [
        { label: 'None', value: 'none', points: 0 },
        { label: 'Mild (chronic hepatitis; bilirubin >ULN–1.5×ULN, or AST/ALT >ULN–2.5×ULN)', value: 'mild', points: 1 },
        { label: 'Severe / cirrhosis (bilirubin >1.5×ULN, or AST/ALT >2.5×ULN)', value: 'severe', points: 3 },
      ], 'none', 'Two severity tiers: mild hepatic +1; cirrhosis/severe +3.'),
      yesNo('obese', 'Obesity (BMI ≥35 kg/m²)', 1, 'Body mass index ≥35 kg/m² (+1).', false),
      yesNo('infection', 'Infection requiring antibiotics after day 0', 1, 'Documented infection requiring continuation of antimicrobial treatment after day 0 (+1).', false),
      yesNo('rheum', 'Rheumatologic disease', 2, 'SLE, rheumatoid arthritis, polymyositis, mixed connective tissue disorder, or polymyalgia rheumatica (+2).', false),
      yesNo('pud', 'Peptic ulcer requiring treatment', 2, 'Peptic ulcer disease requiring treatment (+2).', false),
      yesNo('renal', 'Renal dysfunction', 2, 'Serum creatinine >2 mg/dL (177 µmol/L), dialysis, or prior renal transplant (+2).', false),
      selectInput('pulmonary', 'Pulmonary dysfunction', [
        { label: 'None or mild', value: 'none', points: 0 },
        { label: 'Moderate (DLco and/or FEV1 66–80%, or dyspnea on slight activity)', value: 'mod', points: 2 },
        { label: 'Severe (DLco and/or FEV1 ≤65%, or dyspnea at rest/requiring oxygen)', value: 'severe', points: 3 },
      ], 'none', 'Two severity tiers: moderate pulmonary +2; severe +3.'),
      yesNo('tumor', 'Prior solid tumor', 3, 'Solid tumor treated at any point in the patient’s history (nonmelanoma skin cancer excluded) (+3).', false),
    ],
    calculate(values) {
      const comorbid =
        (bool(values.arrhythmia) ? 1 : 0) +
        (bool(values.cardiac) ? 1 : 0) +
        (bool(values.valve) ? 3 : 0) +
        (bool(values.ibd) ? 1 : 0) +
        (bool(values.diabetes) ? 1 : 0) +
        (bool(values.cva) ? 1 : 0) +
        (bool(values.psych) ? 1 : 0) +
        (str(values.hepatic, 'none') === 'mild' ? 1 : str(values.hepatic, 'none') === 'severe' ? 3 : 0) +
        (bool(values.obese) ? 1 : 0) +
        (bool(values.infection) ? 1 : 0) +
        (bool(values.rheum) ? 2 : 0) +
        (bool(values.pud) ? 2 : 0) +
        (bool(values.renal) ? 2 : 0) +
        (str(values.pulmonary, 'none') === 'mod' ? 2 : str(values.pulmonary, 'none') === 'severe' ? 3 : 0) +
        (bool(values.tumor) ? 3 : 0);
      const rawAge = values.age;
      const hasAge = rawAge !== null && rawAge !== undefined && rawAge !== '' && Number.isFinite(num(rawAge, NaN));
      const age = num(rawAge, 0);
      const agePts = hasAge && age >= 40 ? Math.min(5, Math.floor(age / 10) - 3) : 0;
      const score = comorbid + agePts;
      const band = riskFromThresholds(score, [
        { max: 0, level: 'low' as const, label: 'Low risk (score 0)', interpretation: 'HCT-CI 0: low risk; ~14% 2-year non-relapse mortality in the derivation cohort.' },
        { max: 2, level: 'moderate' as const, label: 'Intermediate risk (score 1–2)', interpretation: 'HCT-CI 1–2: intermediate risk; ~21% 2-year non-relapse mortality.' },
        { max: 99, level: 'high' as const, label: 'High risk (score ≥3)', interpretation: 'HCT-CI ≥3: high risk; ~41% 2-year non-relapse mortality.' },
      ]);
      return {
        score,
        unit: 'points',
        label: band.label + (hasAge ? ' (age-adjusted)' : ''),
        interpretation: band.interpretation + (hasAge ? ` Age-adjusted score includes +${agePts} age point${agePts === 1 ? '' : 's'}.` : ''),
        riskLevel: band.riskLevel,
        details: [
          { label: 'Comorbidity score', value: `${comorbid}` },
          { label: 'Age points', value: hasAge ? `${agePts} (age ${age})` : 'Not entered (standard HCT-CI)' },
          { label: 'Transplant type', value: str(values.transplantType, 'allo') === 'auto' ? 'Autologous SCT' : 'Allogeneic HCT' },
        ],
        recommendations: [
          'Score ≥3: higher non-relapse mortality — discuss regimen intensity, timing, and alternatives in shared decision-making.',
          'Use with (not instead of) disease risk and performance status when deciding transplant candidacy.',
          'The original HCT-CI (without age) remains the standard; the age-adjusted version is an optional refinement.',
        ],
      };
    },
    evidence: {
      summary:
        'Seventeen comorbidity categories weighted 1–3 points by severity (arrhythmia, cardiac, valve, IBD, diabetes, cerebrovascular, psychiatric, hepatic mild/severe, obesity, infection, rheumatologic, peptic ulcer, renal, pulmonary moderate/severe, prior solid tumor). Optional age adjustment adds +1 per decade ≥40. Bands: 0 low (~14% NRM), 1–2 intermediate (~21%), ≥3 high (~41%).',
      formula: 'HCT-CI = Σ weighted comorbidities (+ optional age points: +1/decade ≥40)',
      validation:
        'Derived in 1,055 allogeneic recipients at FHCRC/SCCA (Sorror 2005, Blood) and validated internationally. An optional age adjustment exists per the combined HCT-CI/age index (Sorror 2014, JCO); the original score without age remains standard.',
      references: [
        {
          title: 'Hematopoietic cell transplantation (HCT)-specific comorbidity index: a new tool for risk assessment before allogeneic HCT',
          citation: 'Sorror ML et al. Blood. 2005;106(8):2912-2919',
          year: 2005,
          pmid: '15994282',
          doi: '10.1182/blood-2005-05-2008',
        },
        {
          title: 'Comorbidity and disease status–based risk stratification of outcomes among patients with acute myeloid leukemia or myelodysplasia receiving allogeneic hematopoietic cell transplantation',
          citation: 'Sorror ML et al. J Clin Oncol. 2014;32(28):3249-3256',
          year: 2014,
          doi: '10.1200/JCO.2014.55.3865',
        },
      ],
    },
    nextSteps: [
      { condition: 'HCT-CI ≥3', actions: ['Consider reduced-intensity conditioning', 'Optimize comorbidities pre-transplant', 'Discuss higher NRM in consent process'] },
      { condition: 'HCT-CI 0–2', actions: ['Standard transplant work-up', 'Address modifiable comorbidities'] },
    ],
    pearls: [
      'Hepatic and pulmonary categories each have two severity tiers — score the applicable one.',
      'Nonmelanoma skin cancer does not count as prior solid tumor.',
      'The standard score omits age; enter age only if the age-adjusted index is desired.',
    ],
  },

  // ─── 9. 2018 Leibovich Model ──────────────────────────────────────────────
  {
    id: 'leibovich-2018-rcc',
    name: '2018 Leibovich Model for Renal Cell Carcinoma',
    shortName: 'Leibovich 2018',
    description:
      'Histology-specific post-nephrectomy prognostic models for nonmetastatic RCC — dual progression-free and cancer-specific survival scores for clear cell, and risk groups for papillary and chromophobe RCC.',
    category: 'oncology',
    tags: ['leibovich', 'rcc', 'renal cell carcinoma', 'ccrcc', 'papillary', 'chromophobe', 'nephrectomy', 'pfs', 'css', 'recurrence'],
    whenToUse:
      'Patients with nonmetastatic renal cell carcinoma after radical or partial nephrectomy, using the histology-specific model matching the surgical specimen.',
    whyUse:
      'The 2018 Leibovich update provides histology-specific models (ccRCC, papRCC, chrRCC) that predict progression-free and cancer-specific survival better than a single all-histology tool, informing surveillance intensity and adjuvant-trial selection.',
    inputs: [
      selectInput('rccType', 'Type of RCC', [
        { label: 'Clear cell RCC (ccRCC)', value: 'cc' },
        { label: 'Papillary RCC (papRCC)', value: 'pap' },
        { label: 'Chromophobe RCC (chrRCC)', value: 'chr' },
      ], 'cc', 'Select the histology matching the surgical specimen — each subtype uses its own published model.'),
      // ccRCC-only inputs
      yesNo('age60', 'Age at surgery ≥60 years', null, 'ccRCC only. Contributes to the cancer-specific survival score (+1); not part of the PFS score.', false),
      yesNo('ecog1', 'ECOG status ≥1', null, 'ccRCC only. ECOG performance status ≥1 scores +2 on both the PFS and CSS scores.', false),
      yesNo('constSx', 'Constitutional symptoms', null, 'ccRCC only. Presence of constitutional symptoms scores +1 on both scores.', false),
      yesNo('adrenal', 'Adrenalectomy performed', null, 'ccRCC only. Ipsilateral adrenalectomy scores +1 on the CSS score only.', false),
      yesNo('margins', 'Positive surgical margins', null, 'ccRCC only. Positive surgical margins score +1 on the CSS score only.', false),
      selectInput('grade', 'Tumor (nuclear) grade', [
        { label: 'Grade 1', value: 1 },
        { label: 'Grade 2', value: 2 },
        { label: 'Grade 3', value: 3 },
        { label: 'Grade 4', value: 4 },
      ], 2, 'ccRCC: grade 1/2/3/4 scores 0/2/3/3 on PFS and 0/2/3/4 on CSS. papRCC: grade defines the risk group (1–2→group 1, 3→group 2, 4→group 3). Not used for chrRCC.'),
      yesNo('necrosis', 'Coagulative necrosis', null, 'ccRCC only. Presence of coagulative tumor necrosis scores +2 on both scores.', false),
      yesNo('sarc', 'Sarcomatoid differentiation', null, 'ccRCC: +2 PFS / +3 CSS. chrRCC: presence places the patient in risk group 3. Not used for papRCC.', false),
      selectInput('size', 'Tumor size, cm', [
        { label: '≤4', value: 's4' },
        { label: '>4 to ≤7', value: 's7' },
        { label: '>7 to ≤10', value: 's10' },
        { label: '>10', value: 'sg10' },
      ], 's4', 'ccRCC only: ≤4→0/0, >4–7→+3/+4, >7–10→+4/+4, >10→+4/+5 (PFS/CSS).'),
      yesNo('fat', 'Perinephric/renal sinus fat invasion', null, 'ccRCC: +1 PFS / +2 CSS. papRCC: presence → risk group 3. chrRCC: presence alone → risk group 2.', false),
      selectInput('thrombus', 'Tumor thrombus (Neves–Zincke level)', [
        { label: 'None', value: 'none' },
        { label: 'Level 0', value: 'lv0' },
        { label: 'Level 1–4', value: 'lv14' },
      ], 'none', 'ccRCC: none→0/0, level 0→+1/0, level 1–4→+2/+1 (PFS/CSS). papRCC: any thrombus → risk group 3. Not used for chrRCC.'),
      yesNo('beyondKidney', 'Extension beyond kidney', null, 'ccRCC only. Tumor extension beyond the kidney scores +2 on the PFS score (not part of CSS).', false),
      selectInput('nodal', 'Nodal involvement', [
        { label: 'No nodal dissection', value: 'nx' },
        { label: 'No nodal involvement', value: 'n0' },
        { label: 'Nodal involvement present', value: 'n1' },
      ], 'nx', 'ccRCC: nodal involvement +2 on both scores (no dissection and negative both score 0). chrRCC: nodal involvement → risk group 3. Not used for papRCC.'),
    ],
    questionnaire: {
      modeInputId: 'rccType',
      activeInputIdsByMode: {
        cc: ['rccType', 'age60', 'ecog1', 'constSx', 'adrenal', 'margins', 'grade', 'necrosis', 'sarc', 'size', 'fat', 'thrombus', 'beyondKidney', 'nodal'],
        pap: ['rccType', 'grade', 'fat', 'thrombus'],
        chr: ['rccType', 'sarc', 'fat', 'nodal'],
      },
    },
    calculate(values) {
      const type = str(values.rccType, 'cc');
      if (type === 'pap') {
        const g = num(values.grade, 2);
        const fat = bool(values.fat);
        const throm = str(values.thrombus, 'none') !== 'none';
        let group = 1;
        if (fat || throm || g === 4) group = 3;
        else if (g === 3) group = 2;
        const pfs = group === 1 ? '97% / 97% / 96%' : group === 2 ? '89% / 86% / 84%' : '60% / 52% / 46%';
        const css = group === 1 ? '99% / 98% / 98%' : group === 2 ? '95% / 91% / 90%' : '74% / 60% / 56%';
        return {
          score: group,
          unit: 'risk group',
          label: `papRCC Risk Group ${group}`,
          interpretation: `2018 Leibovich papillary model — Risk Group ${group}. Estimated PFS at 5/10/15 years: ${pfs}; CSS: ${css}.`,
          riskLevel: group === 1 ? 'low' : group === 2 ? 'moderate' : 'high',
          details: [
            { label: 'Features', value: `Grade ${g}; fat invasion ${fat ? 'yes' : 'no'}; thrombus ${throm ? 'yes' : 'no'}` },
            { label: '5/10/15-yr PFS', value: pfs },
            { label: '5/10/15-yr CSS', value: css },
          ],
          recommendations: [
            'Group 3: closer surveillance; discuss adjuvant therapy and trial options.',
            'Risk estimates guide surveillance intensity and counseling — integrate with clinical judgment.',
          ],
        };
      }
      if (type === 'chr') {
        const fat = bool(values.fat);
        const sarc = bool(values.sarc);
        const nodal = str(values.nodal, 'nx') === 'n1';
        let group = 1;
        if (sarc || nodal) group = 3;
        else if (fat) group = 2;
        const pfs = group === 1 ? '94% / 91% / 89%' : group === 2 ? '71% / 59% / 51%' : '13% / 4% / 2%';
        const css = group === 1 ? '96% / 95% / 94%' : group === 2 ? '85% / 79% / 76%' : '49% / 34% / 30%';
        return {
          score: group,
          unit: 'risk group',
          label: `chrRCC Risk Group ${group}`,
          interpretation: `2018 Leibovich chromophobe model — Risk Group ${group}. Estimated PFS at 5/10/15 years: ${pfs}; CSS: ${css}.`,
          riskLevel: group === 1 ? 'low' : group === 2 ? 'moderate' : 'high',
          details: [
            { label: 'Features', value: `Fat invasion ${fat ? 'yes' : 'no'}; sarcomatoid ${sarc ? 'yes' : 'no'}; nodal ${nodal ? 'yes' : 'no'}` },
            { label: '5/10/15-yr PFS', value: pfs },
            { label: '5/10/15-yr CSS', value: css },
          ],
          recommendations: [
            'Group 3: closer surveillance; discuss adjuvant therapy and trial options.',
            'Risk estimates guide surveillance intensity and counseling — integrate with clinical judgment.',
          ],
        };
      }
      // ccRCC — compute both PFS and CSS scores
      const g = num(values.grade, 1);
      const sizeKey = str(values.size, 's4');
      const throm = str(values.thrombus, 'none');
      const nodal = str(values.nodal, 'nx') === 'n1';
      const pfs =
        (bool(values.ecog1) ? 2 : 0) +
        (bool(values.constSx) ? 1 : 0) +
        (g === 2 ? 2 : g === 3 ? 3 : g === 4 ? 3 : 0) +
        (bool(values.necrosis) ? 2 : 0) +
        (bool(values.sarc) ? 2 : 0) +
        (sizeKey === 's7' ? 3 : sizeKey === 's10' ? 4 : sizeKey === 'sg10' ? 4 : 0) +
        (bool(values.fat) ? 1 : 0) +
        (throm === 'lv0' ? 1 : throm === 'lv14' ? 2 : 0) +
        (bool(values.beyondKidney) ? 2 : 0) +
        (nodal ? 2 : 0);
      const css =
        (bool(values.age60) ? 1 : 0) +
        (bool(values.ecog1) ? 2 : 0) +
        (bool(values.constSx) ? 1 : 0) +
        (bool(values.adrenal) ? 1 : 0) +
        (bool(values.margins) ? 1 : 0) +
        (g === 2 ? 2 : g === 3 ? 3 : g === 4 ? 4 : 0) +
        (bool(values.necrosis) ? 2 : 0) +
        (bool(values.sarc) ? 3 : 0) +
        (sizeKey === 's7' ? 4 : sizeKey === 's10' ? 4 : sizeKey === 'sg10' ? 5 : 0) +
        (bool(values.fat) ? 2 : 0) +
        (throm === 'lv0' ? 0 : throm === 'lv14' ? 1 : 0) +
        (nodal ? 2 : 0);
      const pfsEst = pfs <= 2 ? '~95–98%' : pfs <= 5 ? '~87–93%' : pfs <= 8 ? '~66–82%' : pfs <= 11 ? '~31–56%' : pfs <= 14 ? '~3–19%' : '~1%';
      const cssEst = css <= 2 ? '~99%' : css <= 5 ? '~96–98%' : css <= 8 ? '~90–95%' : css <= 11 ? '~77–87%' : css <= 14 ? '~52–70%' : css <= 17 ? '~19–41%' : '~10%';
      return {
        score: pfs,
        unit: 'points (PFS score)',
        label: pfs <= 5 ? 'ccRCC — lower PFS risk score' : pfs <= 10 ? 'ccRCC — intermediate PFS risk score' : 'ccRCC — high PFS risk score',
        interpretation: `2018 Leibovich clear-cell model. PFS score ${pfs} (estimated 5-year PFS ${pfsEst}); CSS score ${css} (estimated 5-year CSS ${cssEst}). Higher scores indicate greater risk of progression and cancer-specific death.`,
        riskLevel: pfs <= 5 ? 'low' : pfs <= 10 ? 'moderate' : 'high',
        details: [
          { label: 'PFS score', value: `${pfs} (5-yr PFS ${pfsEst})` },
          { label: 'CSS score', value: `${css} (5-yr CSS ${cssEst})` },
        ],
        recommendations: [
          'Higher scores: closer surveillance and consideration of adjuvant therapy/clinical trials.',
          'The model predicts both progression-free and cancer-specific survival — review both scores.',
          'Apply only to nonmetastatic clear cell RCC after nephrectomy.',
        ],
      };
    },
    evidence: {
      summary:
        'Histology-specific models from Leibovich 2018. ccRCC computes two point scores (PFS 0–≥15 and CSS 0–≥18) from up to 12 features with subtype-specific weights (ECOG, constitutional symptoms, grade, necrosis, sarcomatoid, size, fat invasion, thrombus, extension beyond kidney, nodal; CSS adds age, adrenalectomy, margins). papRCC uses 3 risk groups defined by grade, fat invasion, and thrombus; chrRCC uses 3 groups defined by fat invasion, sarcomatoid, and nodal involvement.',
      formula:
        'ccRCC: separate PFS/CSS point sums per the published feature table. papRCC: G1–2 & no fat & no thrombus→G1; G3 & no fat & no thrombus→G2; G4 or fat or thrombus→G3. chrRCC: no fat & no sarc & no nodal→G1; fat only→G2; sarc or nodal→G3.',
      validation:
        'Models developed in 3,633 Mayo Clinic patients (2,726 ccRCC, 607 papRCC, 222 chrRCC); c-indices ~0.83/0.86 (ccRCC PFS/CSS), 0.77 (papRCC), 0.78 (chrRCC). External validation (Schmeusser 2024, Cancer) confirmed strongest performance in ccRCC. Simplified 5-factor point variants circulating online are not the published full model implemented here.',
      references: [
        {
          title: 'Predicting Oncologic Outcomes in Renal Cell Carcinoma After Surgery',
          citation: 'Leibovich BC et al. Eur Urol. 2018;73(5):772-780',
          year: 2018,
          pmid: '29398265',
          doi: '10.1016/j.eururo.2018.01.005',
        },
        {
          title: '2018 Leibovich prognostic model for renal cell carcinoma: performance in a large population with special consideration of Black race',
          citation: 'Schmeusser BN et al. Cancer. 2024;130(3):453-466',
          year: 2024,
          pmid: '37803521',
        },
      ],
    },
    nextSteps: [
      { condition: 'High score / risk group 3', actions: ['Closer surveillance schedule', 'Discuss adjuvant pembrolizumab or trials', 'Genitourinary oncology referral'] },
      { condition: 'Low score / risk group 1', actions: ['Standard surveillance', 'Reassure with quantitative risk estimate'] },
    ],
    pearls: [
      'Always select the model matching the surgical histology — the three subtypes score differently.',
      'For ccRCC the model outputs two scores (PFS and CSS) with different weights.',
      'Tumor thrombus uses the Neves–Zincke level classification.',
    ],
  },

  // ─── 10. ASSURE RCC Prognosis ─────────────────────────────────────────────
  {
    id: 'assure-rcc',
    name: 'Assure Renal Cell Carcinoma (RCC) Prognosis',
    shortName: 'ASSURE RCC',
    description:
      'ASSURE (E2805) trial–derived model predicting disease-free and overall survival after resection of intermediate/high-risk localized RCC.',
    category: 'oncology',
    tags: ['assure', 'rcc', 'renal cell carcinoma', 'dfs', 'os', 'recurrence', 'nephrectomy', 'adjuvant'],
    whenToUse:
      'Patients with intermediate- or high-risk localized RCC after surgical resection (the ASSURE eligibility population: pT1b grade 3–4, pT2–T4, or N1 disease) when estimating recurrence and survival.',
    whyUse:
      'The ASSURE model is derived from prospectively collected adjuvant-trial data with central pathology review, giving more reliable recurrence/survival estimates for the high-risk post-nephrectomy population than legacy retrospective scores.',
    inputs: [
      numberInput('age', 'Age at RCC diagnosis', { unit: 'years', min: 18, max: 100, exampleValue: 58, helpText: 'Age in years at RCC diagnosis. Used only in the OS model: ≤51→0, >51–60→+1, >60→+2.' }),
      numberInput('size', 'Tumor size', { unit: 'cm', min: 0.1, max: 40, step: 0.1, exampleValue: 8.5, helpText: 'Maximum tumor diameter in cm. DFS: ≤7→0, >7–10→+1.5, >10→+2.5; OS: ≤7→0, >7–10→+1.5, >10→+2.' }),
      selectInput('histology', 'Renal histology', [
        { label: 'Chromophobe or papillary type I', value: 'fav' },
        { label: 'Clear cell, papillary type II/mixed, or variant >25% clear cell', value: 'cc' },
        { label: 'Unclassified or variant <25% clear cell', value: 'unfav' },
      ], 'cc', 'Histology category: favorable (chromophobe/papillary I) → 0; clear cell/papillary II-mixed/variant >25% cc → +4.5 DFS / +4.0 OS; unclassified or <25% cc → +5.5 DFS / +4.5 OS.'),
      selectInput('grade', 'Fuhrman grade', [
        { label: 'Grade I–III', value: 'g123' },
        { label: 'Grade IV', value: 'g4' },
      ], 'g123', 'Grade IV adds +2 to both DFS and OS scores; grades I–III score 0.'),
      yesNo('necrosis', 'Coagulative necrosis', null, 'Presence of coagulative tumor necrosis adds +1.5 to both scores.', false),
      yesNo('nodes', 'Regional lymph node involvement (pN1/2 vs pN0/X)', null, 'Pathologic nodal involvement adds +3.0 to DFS and +2.5 to OS.', false),
      yesNo('vascular', 'Vascular invasion', null, 'Any vascular invasion (segmental vein/arteriole, renal vein, or caval invasion) adds +1.0 to the DFS score only.', false),
      yesNo('sarc', 'Sarcomatoid features', null, 'Sarcomatoid features — used by the early-disease-progression (EDP) model; does not enter the DFS or OS point scores.', false),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const size = num(values.size, 8);
      const hist = str(values.histology, 'cc');
      const g4 = str(values.grade, 'g123') === 'g4';
      const dfs =
        (size > 10 ? 2.5 : size > 7 ? 1.5 : 0) +
        (hist === 'unfav' ? 5.5 : hist === 'cc' ? 4.5 : 0) +
        (g4 ? 2 : 0) +
        (bool(values.necrosis) ? 1.5 : 0) +
        (bool(values.nodes) ? 3 : 0) +
        (bool(values.vascular) ? 1 : 0);
      const os =
        (age > 60 ? 2 : age > 51 ? 1 : 0) +
        (size > 10 ? 2 : size > 7 ? 1.5 : 0) +
        (hist === 'unfav' ? 4.5 : hist === 'cc' ? 4 : 0) +
        (g4 ? 2 : 0) +
        (bool(values.necrosis) ? 1.5 : 0) +
        (bool(values.nodes) ? 2.5 : 0);
      const dfsGroup = dfs >= 8.5 ? 'High risk' : dfs >= 6 ? 'Intermediate risk' : 'Low risk';
      const osGroup = os >= 7.5 ? 'High risk' : os >= 5 ? 'Intermediate risk' : 'Low risk';
      return {
        score: round(dfs, 1),
        unit: 'points (DFS score)',
        label: `DFS ${dfsGroup}; OS ${osGroup}`,
        interpretation: `ASSURE model: DFS score ${round(dfs, 1)} → ${dfsGroup}; OS score ${round(os, 1)} → ${osGroup}. Developed for intermediate/high-risk localized RCC after resection (ASSURE E2805 population).`,
        riskLevel: dfs >= 8.5 || os >= 7.5 ? 'high' : dfs >= 6 || os >= 5 ? 'moderate' : 'low',
        details: [
          { label: 'DFS score', value: `${round(dfs, 1)} → ${dfsGroup} (0–5.5 low / 6–8 intermediate / ≥8.5 high)` },
          { label: 'OS score', value: `${round(os, 1)} → ${osGroup} (0–4.5 low / 5–7 intermediate / ≥7.5 high)` },
        ],
        recommendations: [
          'High risk: discuss adjuvant therapy options, closer surveillance imaging, and clinical trial eligibility.',
          'Use alongside the full clinical picture and specialist input — do not let the score alone dictate goals-of-care decisions.',
          'Sarcomatoid features feed the separate EDP model — flag for heightened early-progression concern.',
        ],
      };
    },
    evidence: {
      summary:
        'Point-weighted scores from the ASSURE (E2805) model: DFS uses size (0/1.5/2.5), histology (0/4.5/5.5), Fuhrman IV (+2), necrosis (+1.5), nodes (+3), vascular invasion (+1); OS uses age (0/1/2), size (0/1.5/2), histology (0/4/4.5), Fuhrman IV (+2), necrosis (+1.5), nodes (+2.5). Groups: DFS 0–5.5 low / 6–8 intermediate / ≥8.5 high; OS 0–4.5 low / 5–7 intermediate / ≥7.5 high.',
      formula: 'DFS and OS point sums per the published ASSURE nomogram weights; a separate logistic EDP model (with sarcomatoid) is not implemented.',
      validation:
        'Built on prospectively collected, centrally reviewed data from the ECOG-ACRIN E2805 ASSURE adjuvant trial (Correa 2021, Eur Urol); externally validated in the UroCCR-88 RESCUE cohort. The published tool also defines an early-disease-progression logistic model; this implementation reports the DFS and OS risk scores exactly as published.',
      references: [
        {
          title: 'Predicting Disease Recurrence, Early Progression, and Overall Survival Following Surgical Resection for High-risk Localized and Locally Advanced Renal Cell Carcinoma',
          citation: 'Correa AF et al. Eur Urol. 2021;80(1):20-31',
          year: 2021,
          pmid: '33707112',
        },
      ],
    },
    nextSteps: [
      { condition: 'High-risk DFS or OS group', actions: ['GU oncology referral', 'Discuss adjuvant therapy and trials', 'Closer imaging surveillance'] },
      { condition: 'Intermediate/low risk', actions: ['Standard post-nephrectomy surveillance', 'Address comorbidities'] },
    ],
    pearls: [
      'Validated only in the ASSURE intermediate/high-risk population (pT1b G3–4, pT2–T4, or N1) — not for small low-grade tumors.',
      'Vascular invasion feeds the DFS model; age feeds the OS model; sarcomatoid feeds the EDP model.',
      'Exact nomogram survival probabilities require the graphical nomogram; the risk groups shown are the published categories.',
    ],
  },

  // ─── 11. SSIGN ────────────────────────────────────────────────────────────
  {
    id: 'ssign-rcc',
    name: 'SSIGN Score for Renal Cell Carcinoma',
    shortName: 'SSIGN',
    description:
      'Mayo Stage-Size-Grade-Necrosis score predicting progression of clear cell RCC after radical nephrectomy.',
    category: 'oncology',
    tags: ['ssign', 'rcc', 'clear cell', 'nephrectomy', 'progression', 'mayo', 'tnm', 'grade', 'necrosis'],
    whenToUse:
      'Patients with clear cell RCC after radical nephrectomy for estimation of progression/metastasis risk and stratification in adjuvant trials.',
    whyUse:
      'SSIGN was the best-performing recurrence model in prospective ASSURE-trial validation and is widely used for adjuvant trial eligibility and surveillance planning.',
    inputs: [
      selectInput('pt', 'Pathologic T category (2002 TNM)', [
        { label: 'pT1', value: 't1', points: 0 },
        { label: 'pT2', value: 't2', points: 1 },
        { label: 'pT3a–c', value: 't3', points: 2 },
        { label: 'pT4', value: 't4', points: 4 },
      ], 't1', 'Pathologic T stage per 2002 TNM: pT1→0, pT2→+1, pT3a–c→+2, pT4→+4.'),
      selectInput('pn', 'Regional lymph node status', [
        { label: 'pNx or pN0', value: 'n0', points: 0 },
        { label: 'pN1 or pN2', value: 'n12', points: 2 },
      ], 'n0', 'pNx/pN0 score 0; pN1 or pN2 score +2.'),
      selectInput('m', 'Metastasis category', [
        { label: 'M0', value: 'm0', points: 0 },
        { label: 'M1', value: 'm1', points: 4 },
      ], 'm0', 'Distant metastasis (M1) scores +4.'),
      yesNo('size5', 'Tumor size ≥5 cm', 2, 'Maximum tumor diameter of 5 cm or greater scores +2.', false),
      selectInput('grade', 'Tumor (nuclear) grade', [
        { label: 'Grade 1 or 2', value: 'g12', points: 0 },
        { label: 'Grade 3', value: 'g3', points: 1 },
        { label: 'Grade 4', value: 'g4', points: 3 },
      ], 'g12', 'Nuclear grade: 1–2→0, 3→+1, 4→+3.'),
      yesNo('necrosis', 'Tumor necrosis present', 2, 'Histologic tumor necrosis scores +2.', false),
    ],
    calculate(values) {
      const score =
        (str(values.pt, 't1') === 't2' ? 1 : str(values.pt, 't1') === 't3' ? 2 : str(values.pt, 't1') === 't4' ? 4 : 0) +
        (str(values.pn, 'n0') === 'n12' ? 2 : 0) +
        (str(values.m, 'm0') === 'm1' ? 4 : 0) +
        (bool(values.size5) ? 2 : 0) +
        (str(values.grade, 'g12') === 'g3' ? 1 : str(values.grade, 'g12') === 'g4' ? 3 : 0) +
        (bool(values.necrosis) ? 2 : 0);
      let surv = '';
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score <= 2) { surv = '~97%'; label = 'Low risk'; riskLevel = 'low'; }
      else if (score <= 4) { surv = '~90%'; label = 'Intermediate-low risk'; riskLevel = 'moderate'; }
      else if (score <= 6) { surv = '~65%'; label = 'Intermediate-high risk'; riskLevel = 'high'; }
      else if (score <= 9) { surv = '~39%'; label = 'High risk'; riskLevel = 'high'; }
      else { surv = '~19%'; label = 'Very high risk'; riskLevel = 'critical'; }
      return {
        score,
        unit: 'points',
        label,
        interpretation: `SSIGN ${score}: estimated 5-year metastasis-free (progression-free) survival ≈${surv} in the derivation cohort. Applies to clear cell RCC after radical nephrectomy.`,
        riskLevel,
        details: [
          { label: 'Score', value: `${score}` },
          { label: 'Estimated 5-yr metastasis-free survival', value: surv },
        ],
        recommendations: [
          'Higher scores: closer surveillance and adjuvant-trial consideration.',
          'Some experts advise against using SSIGN alone for non-clear-cell histologies.',
          'Apply only to surgically resected clear cell RCC.',
        ],
      };
    },
    evidence: {
      summary:
        'Points: pT2 +1, pT3a–c +2, pT4 +4; pN1/2 +2; M1 +4; size ≥5 cm +2; grade 3 +1 / grade 4 +3; necrosis +2. 5-year metastasis-free survival: ≤2→97%, 3–4→90%, 5–6→65%, 7–9→39%, ≥10→19%.',
      formula: 'SSIGN = T(0/1/2/4) + N(0/2) + M(0/4) + size≥5(2) + grade(0/1/3) + necrosis(2)',
      validation:
        'Developed in 1,801 clear-cell RCC patients after radical nephrectomy (Frank 2002, J Urol). In prospective ASSURE-trial validation of eight RCC models, SSIGN performed best (C-index 0.688).',
      references: [
        {
          title: 'An outcome prediction model for patients with clear cell renal cell carcinoma treated with radical nephrectomy based on tumor stage, size, grade and necrosis: the SSIGN score',
          citation: 'Frank I et al. J Urol. 2002;168(6):2395-2400',
          year: 2002,
          pmid: '12441925',
          doi: '10.1016/S0022-5347(05)64153-5',
        },
        {
          title: 'Predicting Renal Cancer Recurrence: Defining Limitations of Existing Prognostic Models With Prospective Trial-Based Validation',
          citation: 'Correa AF et al. J Clin Oncol. 2019;37(23):2062-2071',
          year: 2019,
          doi: '10.1200/JCO.19.00107',
        },
      ],
    },
    nextSteps: [
      { condition: 'SSIGN ≥7', actions: ['High-intensity surveillance', 'Adjuvant therapy/trial discussion', 'GU oncology referral'] },
      { condition: 'SSIGN ≤4', actions: ['Standard surveillance', 'Reassurance counseling'] },
    ],
    pearls: [
      'For clear cell RCC only — the model was derived exclusively in ccRCC.',
      'Stage/size thresholds follow the 2002 (6th edition) TNM.',
      'Necrosis and grade carry substantial weight — ensure central/expert pathology review.',
    ],
  },

  // ─── 12. UISS ─────────────────────────────────────────────────────────────
  {
    id: 'uiss-rcc',
    name: 'UCLA Integrated Staging System (UISS) for RCC',
    shortName: 'UISS',
    description:
      'Integrated TNM stage + Fuhrman grade + ECOG performance status system stratifying localized and metastatic RCC into risk groups.',
    category: 'oncology',
    tags: ['uiss', 'ucla', 'rcc', 'zisman', 'fuhrman', 'ecog', 'staging', 'prognosis'],
    whenToUse:
      'Patients with RCC after nephrectomy — localized (N0M0) or metastatic (N+/M1) — for risk stratification into low/intermediate/high survival groups.',
    whyUse:
      'UISS was among the first validated systems to combine stage, grade, and performance status; it stratifies survival for both localized and metastatic RCC and is still used for trial stratification.',
    inputs: [
      selectInput('t', 'Pathologic T stage (1997 TNM)', [
        { label: 'T1', value: 't1' },
        { label: 'T2', value: 't2' },
        { label: 'T3', value: 't3' },
        { label: 'T4', value: 't4' },
      ], 't1', 'Primary tumor category per the 1997 TNM used by the UISS.'),
      selectInput('n', 'Regional lymph nodes', [
        { label: 'N0 or Nx', value: 'n0' },
        { label: 'N1', value: 'n1' },
        { label: 'N2 or N3', value: 'n23' },
      ], 'n0', 'N1 disease (without distant metastasis) is classified in the UISS metastatic arm as low risk; N2/N3 behaves like M1.'),
      selectInput('m', 'Distant metastasis', [
        { label: 'M0', value: 'm0' },
        { label: 'M1', value: 'm1' },
      ], 'm0', 'Distant metastasis places the patient in the metastatic arm of the UISS.'),
      selectInput('grade', 'Fuhrman nuclear grade', [
        { label: 'Grade 1', value: 1 },
        { label: 'Grade 2', value: 2 },
        { label: 'Grade 3', value: 3 },
        { label: 'Grade 4', value: 4 },
      ], 2, 'Fuhrman grade 1–4 (grades 1–2 vs 3–4 and grade 4 specifically drive the group assignment).'),
      selectInput('ecog', 'ECOG performance status', [
        { label: 'ECOG 0', value: 'e0' },
        { label: 'ECOG ≥1', value: 'e1' },
      ], 'e0', 'ECOG 0 vs ≥1 is the UISS performance-status dichotomy.'),
    ],
    calculate(values) {
      const t = str(values.t, 't1');
      const n = str(values.n, 'n0');
      const m = str(values.m, 'm0');
      const g = num(values.grade, 2);
      const ecog1 = str(values.ecog, 'e0') === 'e1';
      const metastatic = n !== 'n0' || m === 'm1';
      if (metastatic) {
        let label = '';
        let surv = '';
        let riskLevel: 'low' | 'moderate' | 'high' = 'low';
        if (n === 'n1' && m === 'm0') {
          label = 'Metastatic low risk (N1M0)';
          surv = '~32% 5-year disease-specific survival';
          riskLevel = 'low';
        } else if (g === 4 && ecog1) {
          label = 'Metastatic high risk';
          surv = '~0% 5-year disease-specific survival';
          riskLevel = 'high';
        } else if ((g <= 2 && !ecog1) && !(g === 4 && ecog1)) {
          label = 'Metastatic low risk';
          surv = '~32% 5-year disease-specific survival';
          riskLevel = 'low';
        } else {
          label = 'Metastatic intermediate risk';
          surv = '~19.5% 5-year disease-specific survival';
          riskLevel = 'moderate';
        }
        return {
          score: label.startsWith('Metastatic high') ? 3 : label.startsWith('Metastatic intermediate') ? 2 : 1,
          unit: 'risk group',
          label,
          interpretation: `UISS metastatic arm — ${label.replace('Metastatic ', '')}: ${surv}. Metastatic RCC is heterogeneous; validate against contemporary systemic-therapy outcomes (e.g., IMDC).`,
          riskLevel,
          details: [{ label: 'Estimated 5-yr DSS', value: surv }],
          recommendations: [
            'Metastatic RCC: also apply the IMDC (Heng) model for contemporary systemic-therapy stratification.',
            'UISS was validated largely in the immunotherapy era — interpret survival estimates cautiously.',
          ],
        };
      }
      // localized N0M0
      let label = '';
      let surv = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let groupNum = 1;
      const high = (t === 't3' && g >= 2 && ecog1) || t === 't4';
      const low = t === 't1' && g <= 2 && !ecog1;
      if (high) {
        label = 'Localized high risk';
        surv = '~55% 5-year disease-specific survival';
        riskLevel = 'high';
        groupNum = 3;
      } else if (low) {
        label = 'Localized low risk';
        surv = '~91% 5-year disease-specific survival';
        riskLevel = 'low';
        groupNum = 1;
      } else {
        label = 'Localized intermediate risk';
        surv = '~80% 5-year disease-specific survival';
        riskLevel = 'moderate';
        groupNum = 2;
      }
      return {
        score: groupNum,
        unit: 'risk group',
        label,
        interpretation: `UISS localized arm — ${label.replace('Localized ', '')}: ${surv}.`,
        riskLevel,
        details: [{ label: 'Estimated 5-yr DSS', value: surv }],
        recommendations: [
          'High risk: closer post-nephrectomy surveillance and adjuvant-trial discussion.',
          'Intermediate/low risk: standard surveillance schedules.',
        ],
      };
    },
    evidence: {
      summary:
        'Localized (N0M0): low = T1 & grade 1–2 & ECOG 0 (5-yr DSS ~91%); high = T3 & grade 2–4 & ECOG ≥1, or any T4 (~55%); intermediate = all other N0M0 combinations (~80%). Metastatic (N+ or M1): low = N1M0 any features, or N2M0/M1 with grade 1–2 & ECOG 0 (~32%); high = N2M0/M1 grade 4 & ECOG ≥1 (~0%); intermediate = remainder (~19.5%).',
      formula: 'UISS groups from T category, Fuhrman grade, and ECOG status per the Zisman/ESMO table',
      validation:
        'Developed in 661 UCLA nephrectomy patients (Zisman 2001, JCO) and validated internationally in 4,202 patients (Patard 2004, JCO: localized 5-yr survival 92/67/44%, metastatic 3-yr 37/23/12% for low/int/high).',
      references: [
        {
          title: 'Improved prognostication of renal cell carcinoma using an integrated staging system',
          citation: 'Zisman A et al. J Clin Oncol. 2001;19(6):1649-1657',
          year: 2001,
          pmid: '11250993',
          doi: '10.1200/JCO.2001.19.6.1649',
        },
        {
          title: 'Use of the University of California Los Angeles Integrated Staging System to predict survival in renal cell carcinoma: an international multicenter study',
          citation: 'Patard JJ et al. J Clin Oncol. 2004;22(16):3316-3322',
          year: 2004,
          pmid: '15310775',
          doi: '10.1200/JCO.2004.09.104',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk', actions: ['Closer surveillance', 'Adjuvant/clinical trial discussion', 'For metastatic: apply IMDC and systemic-therapy planning'] },
      { condition: 'Low/intermediate', actions: ['Standard follow-up', 'Reassessment at progression'] },
    ],
    pearls: [
      'Nodal disease without distant metastasis (N1M0) is handled in the metastatic arm, not the localized arm.',
      'The original publication described five groups; the validated three-group version shown here is the commonly applied form.',
      'Metastatic survival estimates predate modern targeted/immuno therapies — use IMDC for contemporary counseling.',
    ],
  },

  // ─── 13. Fuhrman Nuclear Grade ────────────────────────────────────────────
  {
    id: 'fuhrman-grade',
    name: 'Fuhrman Nuclear Grade for Clear Cell Renal Carcinoma',
    shortName: 'Fuhrman grade',
    description:
      'Four-tier prognostic grading of RCC tumor cells by nuclear diameter, outline, nucleolar prominence, and bizarre/spindle morphology.',
    category: 'oncology',
    tags: ['fuhrman', 'nuclear grade', 'rcc', 'pathology', 'histology', 'grading'],
    whenToUse:
      'Histologic grading of renal cell carcinoma specimens — the grade feeds many RCC prognostic scores (SSIGN, UISS, Leibovich, ASSURE).',
    whyUse:
      'Fuhrman grade is an independent predictor of RCC survival and a required input for several validated prognostic models.',
    inputs: [
      selectInput('diameter', 'Nuclear diameter', [
        { label: 'Small (~10 µm)', value: 1 },
        { label: 'Larger (~15 µm)', value: 2 },
        { label: 'Even larger (~20 µm)', value: 3 },
      ], 1, 'Approximate mean nuclear diameter: ~10 µm (grade 1), ~15 µm (grade 2), ~20 µm (grade 3–4).'),
      selectInput('shape', 'Nuclear shape', [
        { label: 'Round, uniform', value: 1 },
        { label: 'Irregularities in outline', value: 2 },
        { label: 'Obvious irregular outline', value: 3 },
      ], 1, 'Contour: round/uniform (grade 1), irregularities (grade 2), obviously irregular (grade 3–4).'),
      selectInput('nucleoli', 'Nucleoli', [
        { label: 'Absent / inconspicuous', value: 1 },
        { label: 'Visible at ×400', value: 2 },
        { label: 'Prominent at ×100', value: 3 },
      ], 1, 'Nucleolar prominence: inconspicuous (grade 1), visible at 400× (grade 2), prominent at 100× (grade 3).'),
      yesNo('bizarre', 'Bizarre often multilobed nuclei and/or spindle cells', null, 'Bizarre multilobed nuclei with heavy chromatin clumps and/or spindle-cell morphology defines grade 4.', false),
    ],
    calculate(values) {
      if (bool(values.bizarre)) {
        return {
          score: 4,
          unit: 'grade',
          label: 'Fuhrman grade 4',
          interpretation: 'Grade 4: bizarre, often multilobed nuclei (≥20 µm) with heavy chromatin clumps ± spindle cells — poorest prognosis among the four grades.',
          riskLevel: 'high',
          details: [{ label: 'Assigned grade', value: '4 (bizarre/spindle morphology present)' }],
          recommendations: ['Grade 4 tumors warrant aggressive surveillance and input into RCC prognostic models.'],
        };
      }
      const grade = Math.max(num(values.diameter, 1), num(values.shape, 1), num(values.nucleoli, 1));
      const desc =
        grade === 1 ? 'Round uniform nuclei ~10 µm with inconspicuous nucleoli — most favorable grade.' :
        grade === 2 ? 'Nuclei ~15 µm with irregular outline and nucleoli visible at ×400.' :
        'Nuclei ~20 µm with obviously irregular outline and nucleoli prominent at ×100.';
      return {
        score: grade,
        unit: 'grade',
        label: `Fuhrman grade ${grade}`,
        interpretation: `Grade ${grade}: ${desc} Grade is assigned by the worst (highest) feature present.`,
        riskLevel: grade === 1 ? 'low' : grade === 2 ? 'moderate' : 'high',
        details: [{ label: 'Assigned grade', value: `${grade} (worst feature governs)` }],
        recommendations: ['Feed the grade into SSIGN, UISS, Leibovich, or ASSURE models as needed.'],
      };
    },
    evidence: {
      summary:
        'Four-tier system: grade 1 round uniform ~10 µm nuclei, inconspicuous nucleoli; grade 2 ~15 µm irregular nuclei, nucleoli at ×400; grade 3 ~20 µm obviously irregular nuclei, prominent nucleoli at ×100; grade 4 bizarre multilobed nuclei ≥20 µm with chromatin clumps ± spindle cells. Grade is assigned by the worst feature.',
      formula: 'Grade = worst of (size, outline, nucleolar prominence); bizarre/spindle → 4',
      validation:
        'Fuhrman 1982 (Am J Surg Pathol) demonstrated independent prognostic significance across 105 RCCs; grade correlates with stage and survival. WHO/ISUP grading has largely superseded it in modern practice but Fuhrman remains embedded in legacy models.',
      references: [
        {
          title: 'Prognostic significance of morphologic parameters in renal cell carcinoma',
          citation: 'Fuhrman SA, Lasky LC, Limas C. Am J Surg Pathol. 1982;6(7):655-663',
          year: 1982,
          pmid: '7180965',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade 3–4', actions: ['Input into composite prognostic models', 'Consider closer surveillance'] },
      { condition: 'Grade 1–2', actions: ['Standard pathology reporting', 'Feed into staging/prognostic tools as needed'] },
    ],
    pearls: [
      'The highest-grade feature governs — a single grade-4 area classifies the tumor as grade 4.',
      'Interobserver reproducibility is imperfect; WHO/ISUP grading is preferred in current WHO classification.',
      'Fuhrman grade is still required by legacy models (SSIGN, UISS, original Leibovich, ASSURE).',
    ],
  },

  // ─── 14. Mekhail Extension of Motzer ──────────────────────────────────────
  {
    id: 'mekhail-motzer',
    name: 'Mekhail Extension of the Motzer Score',
    shortName: 'Mekhail',
    description:
      'Extension of the MSKCC/Motzer prognostic model for previously untreated metastatic RCC adding prior radiotherapy and number of metastatic sites.',
    category: 'oncology',
    tags: ['mekhail', 'motzer', 'mskcc', 'mrcc', 'metastatic', 'renal', 'prognosis'],
    whenToUse:
      'Patients with previously untreated metastatic RCC being evaluated before first-line systemic therapy for prognostic grouping.',
    whyUse:
      'The Mekhail extension validated the Motzer model and added prior radiotherapy and metastatic-site count, improving separation of favorable, intermediate, and poor survival groups.',
    inputs: [
      yesNo('kps', 'Karnofsky performance score <80', 1, 'KPS below 80 (original Motzer factor).', false),
      yesNo('ldh', 'LDH >1.5× upper limit of normal', 1, 'Serum LDH above 1.5 times the institutional upper limit of normal.', false),
      yesNo('hgb', 'Hemoglobin below lower limit of normal', 1, 'Anemia below the institutional lower limit of normal.', false),
      yesNo('calcium', 'Corrected calcium >10 mg/dL', 1, 'Albumin-corrected serum calcium above 10 mg/dL (2.5 mmol/L).', false),
      yesNo('timeToTx', 'Diagnosis to systemic treatment <1 year', 1, 'Interval from initial diagnosis to start of systemic therapy under one year.', false),
      yesNo('priorRt', 'Prior radiation therapy', 1, 'Prior radiotherapy at any site — one of the two Mekhail extension factors.', false),
      yesNo('metSites', '≥2 sites of metastasis', 1, 'Two or more metastatic organ sites (the extension used "two or three sites" vs none/one).', false),
    ],
    calculate(values) {
      const ids = ['kps', 'ldh', 'hgb', 'calcium', 'timeToTx', 'priorRt', 'metSites'];
      const score = ids.filter((i) => bool(values[i])).length;
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (score <= 1) {
        label = 'Favorable risk';
        riskLevel = 'low';
        interpretation = 'Mekhail expanded criteria — 0–1 poor prognostic factors: favorable risk; median overall survival ≈26.0 months in the validation cohort.';
      } else if (score === 2) {
        label = 'Intermediate risk';
        riskLevel = 'moderate';
        interpretation = 'Mekhail expanded criteria — 2 poor prognostic factors: intermediate risk; median overall survival ≈14.4 months.';
      } else {
        label = 'Poor risk';
        riskLevel = 'high';
        interpretation = 'Mekhail expanded criteria — >2 poor prognostic factors: poor risk; median overall survival ≈7.3 months.';
      }
      return {
        score,
        unit: 'factors',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Adverse factors', value: `${score} of 7` }],
        recommendations: [
          'Poor risk: counsel on limited historical survival and consider aggressive/novel strategies and trials.',
          'Apply to previously untreated metastatic RCC — the model was derived in clinical-trial patients.',
          'For contemporary targeted/immuno-therapy decisions, also apply the IMDC (Heng) model.',
        ],
      };
    },
    evidence: {
      summary:
        'The expanded model retains the five Motzer factors (KPS <80, LDH >1.5×ULN, hemoglobin <LLN, corrected calcium >10 mg/dL, diagnosis-to-treatment <1 year) and adds prior radiotherapy and ≥2 metastatic sites — 7 binary factors. Groups: favorable 0–1 (median OS 26.0 mo), intermediate 2 (14.4 mo), poor >2 (7.3 mo).',
      formula: 'Factors = 5 Motzer + prior RT + ≥2 metastatic sites; 0–1 favorable / 2 intermediate / >2 poor',
      validation:
        'Validated in 353 previously untreated metastatic RCC trial patients (Mekhail 2005, JCO). Some presentations use a 6-item variant omitting KPS; the published expanded model retains all five Motzer factors plus the two additions, which is implemented here.',
      references: [
        {
          title: 'Validation and extension of the Memorial Sloan-Kettering prognostic factors model for survival in patients with previously untreated metastatic renal cell carcinoma',
          citation: 'Mekhail TM et al. J Clin Oncol. 2005;23(4):832-841',
          year: 2005,
          pmid: '15681528',
          doi: '10.1200/JCO.2005.05.179',
        },
      ],
    },
    nextSteps: [
      { condition: 'Poor risk (>2 factors)', actions: ['Medical oncology referral', 'Discuss realistic outcomes and trial options', 'Consider IMDC for contemporary stratification'] },
      { condition: 'Favorable/intermediate', actions: ['Standard first-line planning', 'Reassess at progression'] },
    ],
    pearls: [
      'Derived in the interferon/immunotherapy era — absolute survival figures are historical.',
      'The two added factors (prior RT, ≥2 metastatic sites) expanded the favorable-risk group from 19% to 37% of patients.',
      'Do not confuse with the 5-factor Motzer model or the 6-factor IMDC/Heng criteria.',
    ],
  },

  // ─── 15. Brain Metastasis Velocity ────────────────────────────────────────
  {
    id: 'brain-metastasis-velocity',
    name: 'Brain Metastasis Velocity (BMV) Model',
    shortName: 'BMV',
    description:
      'Rate of distant brain failure (new brain metastases per year) after upfront stereotactic radiosurgery, predicting survival and need for whole-brain RT.',
    category: 'oncology',
    tags: ['bmv', 'brain metastasis', 'srs', 'radiosurgery', 'distant brain failure', 'velocity'],
    whenToUse:
      'Patients who develop new brain metastases after initial stereotactic radiosurgery — to quantify the velocity of distant brain failure and guide the choice between repeat local therapy and whole-brain radiation.',
    whyUse:
      'BMV is a simple validated metric predicting overall survival and freedom from whole-brain radiation after distant brain failure following upfront SRS.',
    inputs: [
      numberInput('newMets', 'Number of new brain metastases', { unit: 'metastases', min: 0, max: 50, exampleValue: 3, helpText: 'Whole-number count of new brain metastases appearing since the initial SRS.' }),
      numberInput('years', 'Time from initial SRS to new metastases', { unit: 'years', min: 0.08, max: 20, step: 0.1, exampleValue: 1, helpText: 'Interval between the initial SRS and appearance of the new metastases, in years (e.g., 18 months → 1.5).' }),
    ],
    calculate(values) {
      const mets = num(values.newMets, 0);
      const yrs = Math.max(num(values.years, 1), 0.01);
      const bmv = round(mets / yrs, 2);
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (bmv < 4) {
        label = 'Low BMV (<4/yr)';
        riskLevel = 'low';
        interpretation = 'BMV <4 new metastases/year: low-risk class (median OS ≈12.4 months after distant brain failure). Repeat localized therapy such as SRS may be most appropriate.';
      } else if (bmv <= 13) {
        label = 'Intermediate BMV (4–13/yr)';
        riskLevel = 'moderate';
        interpretation = 'BMV 4–13 new metastases/year: intermediate-risk class (median OS ≈8.2 months).';
      } else {
        label = 'High BMV (>13/yr)';
        riskLevel = 'high';
        interpretation = 'BMV >13 new metastases/year: high-risk class (median OS ≈4.3 months). Counsel about the increased likelihood of needing additional therapies (e.g., WBRT) if a localized approach is pursued.';
      }
      return {
        score: bmv,
        unit: 'new mets/year',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'BMV', value: `${bmv} metastases/year` },
          { label: 'Inputs', value: `${mets} new mets over ${yrs} year(s)` },
        ],
        recommendations: [
          'Low BMV (<4): localized retreatment (repeat SRS) is often reasonable.',
          'High BMV (>13): discuss WBRT, systemic options, and goals of care before further local therapy.',
        ],
      };
    },
    evidence: {
      summary:
        'BMV = number of new brain metastases ÷ years from initial SRS to their appearance. Classes: low <4 (median OS ~12.4 mo), intermediate 4–13 (~8.2 mo), high >13 (~4.3 mo).',
      formula: 'BMV = new brain metastases / years since initial SRS',
      validation:
        'Developed and validated by Farris et al in patients managed with upfront SRS alone who experienced distant brain failure (Int J Radiat Oncol Biol Phys 2017); BMV also predicted freedom from WBRT.',
      references: [
        {
          title: 'Brain Metastasis Velocity: A Novel Prognostic Metric Predictive of Overall Survival and Freedom From Whole-Brain Radiation Therapy After Distant Brain Failure Following Upfront Radiosurgery Alone',
          citation: 'Farris M et al. Int J Radiat Oncol Biol Phys. 2017;98(1):131-141',
          year: 2017,
          pmid: '28586952',
          doi: '10.1016/j.ijrobp.2017.01.013',
        },
      ],
    },
    nextSteps: [
      { condition: 'BMV >13', actions: ['Radiation oncology / neuro-oncology discussion', 'Consider WBRT vs systemic therapy', 'Goals-of-care counseling'] },
      { condition: 'BMV ≤13', actions: ['Evaluate for repeat SRS/local therapy', 'Continue surveillance MRI'] },
    ],
    pearls: [
      'Applies specifically to distant brain failure after upfront SRS alone.',
      'Enter the interval in years (18 months = 1.5).',
      'BMV complements rather than replaces GPA indices.',
    ],
  },

  // ─── 16. GI-GPA ───────────────────────────────────────────────────────────
  {
    id: 'gi-gpa',
    name: 'Graded Prognostic Assessment for Gastrointestinal Cancer (GI-GPA)',
    shortName: 'GI-GPA',
    description:
      'Diagnosis-specific GPA index estimating survival in patients with GI cancers and newly diagnosed brain metastases.',
    category: 'oncology',
    tags: ['gi-gpa', 'gpa', 'brain metastases', 'gastrointestinal', 'sperduto', 'kps', 'prognosis'],
    whenToUse:
      'Patients with gastrointestinal primary cancers and newly diagnosed brain metastases when estimating survival to inform treatment selection and goals-of-care discussions.',
    whyUse:
      'The updated GI-GPA is a validated diagnosis-specific index for GI-cancer brain metastases, useful for therapy selection, end-of-life planning, and trial stratification.',
    inputs: [
      selectInput('kps', 'Karnofsky Performance Score', [
        { label: 'KPS <80', value: 'lt80', points: 0 },
        { label: 'KPS 80', value: 'k80', points: 1 },
        { label: 'KPS 90–100', value: 'k90', points: 2 },
      ], 'k80', 'KPS tiers: <80→0, 80→+1, 90–100→+2.'),
      yesNo('ageLt60', 'Age <60 years', 0.5, 'Age below 60 years scores +0.5.', false),
      yesNo('noEcm', 'No extracranial metastases', 0.5, 'Absence of extracranial metastases scores +0.5.', false),
      selectInput('bmCount', 'Number of brain metastases', [
        { label: '>3', value: 'gt3', points: 0 },
        { label: '2–3', value: 'n23', points: 0.5 },
        { label: '1', value: 'n1', points: 1 },
      ], 'n23', 'Number of brain metastases: >3→0, 2–3→+0.5, 1→+1.'),
    ],
    calculate(values) {
      const score =
        (str(values.kps, 'lt80') === 'k80' ? 1 : str(values.kps, 'lt80') === 'k90' ? 2 : 0) +
        (bool(values.ageLt60) ? 0.5 : 0) +
        (bool(values.noEcm) ? 0.5 : 0) +
        (str(values.bmCount, 'gt3') === 'n23' ? 0.5 : str(values.bmCount, 'gt3') === 'n1' ? 1 : 0);
      let ms = '';
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score >= 3.5) { ms = '~17 months'; label = 'GI-GPA 3.5–4.0'; riskLevel = 'low'; }
      else if (score >= 2.5) { ms = '~11 months'; label = 'GI-GPA 2.5–3.0'; riskLevel = 'moderate'; }
      else if (score >= 1.5) { ms = '~7 months'; label = 'GI-GPA 1.5–2.0'; riskLevel = 'high'; }
      else { ms = '~3 months'; label = 'GI-GPA 0–1.0'; riskLevel = 'critical'; }
      return {
        score,
        unit: 'points',
        label,
        interpretation: `Updated GI-GPA ${score}: estimated median survival ≈${ms} from first treatment for brain metastases. Overall cohort median survival ≈8 months.`,
        riskLevel,
        details: [
          { label: 'Score', value: `${score}/4` },
          { label: 'Estimated median survival', value: ms },
        ],
        recommendations: [
          'GPA 3.5–4.0: aggressive local therapy (SRS ± resection) is often appropriate.',
          'GPA 0–1.0: weigh palliative approaches, goals-of-care discussion, and best supportive care.',
          'Discuss results with the patient/family in the context of systemic disease control and treatment options.',
        ],
      };
    },
    evidence: {
      summary:
        'Updated GI-GPA factors: KPS (<80=0, 80=+1, 90–100=+2), age <60 (+0.5), no extracranial metastases (+0.5), number of brain metastases (1=+1, 2–3=+0.5, >3=0). Median survival by GPA: 0–1→3 mo, 1.5–2→7 mo, 2.5–3→11 mo, 3.5–4→17 mo.',
      formula: 'GI-GPA = KPS(0/1/2) + age<60(0.5) + no ECM(0.5) + #BM(0/0.5/1)',
      validation:
        'Updated in a 792-patient multinational cohort of GI cancers with brain metastases diagnosed 2006–2017 (Sperduto 2019, Clin Transl Radiat Oncol); median survival overall 8 months with clear separation between GPA groups.',
      references: [
        {
          title: 'Estimating survival in patients with gastrointestinal cancers and brain metastases: an update of the graded prognostic assessment for gastrointestinal cancers (GI-GPA)',
          citation: 'Sperduto PW et al. Clin Transl Radiat Oncol. 2019;18:39-45',
          year: 2019,
          pmid: '31341974',
          doi: '10.1016/j.ctro.2019.06.007',
        },
      ],
    },
    nextSteps: [
      { condition: 'GPA 3.5–4.0', actions: ['Evaluate for SRS/resection', 'Coordinate with medical oncology for systemic control'] },
      { condition: 'GPA 0–1.0', actions: ['Goals-of-care discussion', 'Consider palliative WBRT vs supportive care'] },
    ],
    pearls: [
      'Use the updated (2019) GI-GPA — earlier versions used different weights.',
      'KPS uses three tiers: <80, 80, and 90–100.',
      'The score estimates group-level survival, not an individual expiration date.',
    ],
  },

  // ─── 17. WPSS ─────────────────────────────────────────────────────────────
  {
    id: 'wpss-mds',
    name: 'WPSS (WHO Classification–based Prognostic Scoring System) for MDS',
    shortName: 'WPSS',
    description:
      'Time-dependent prognostic score for myelodysplastic syndromes using WHO category, karyotype, and transfusion requirement.',
    category: 'hematology',
    tags: ['wpss', 'mds', 'myelodysplastic', 'who', 'karyotype', 'transfusion', 'malcovati', 'prognosis'],
    whenToUse:
      'Patients with myelodysplastic syndromes at diagnosis or during follow-up (WPSS is time-dependent and can be applied repeatedly) for survival and AML-progression stratification.',
    whyUse:
      'WPSS provides dynamic survival and AML-evolution estimates and complements IPSS/IPSS-R for MDS management and transplant-timing decisions.',
    inputs: [
      selectInput('who', 'WHO category', [
        { label: 'RA, RARS, or MDS with isolated del(5q)', value: 'low', points: 0 },
        { label: 'RCMD or RCMD-RS', value: 'rcmd', points: 1 },
        { label: 'RAEB-1 (2–4% blasts)', value: 'raeb1', points: 2 },
        { label: 'RAEB-2 (5–19% blasts)', value: 'raeb2', points: 3 },
      ], 'low', 'WHO morphologic category: RA/RARS/del(5q)→0, RCMD/RCMD-RS→+1, RAEB-1→+2, RAEB-2→+3.'),
      selectInput('karyotype', 'Karyotype', [
        { label: 'Good (normal, −Y, del(5q), del(20q))', value: 'good', points: 0 },
        { label: 'Intermediate (all other abnormalities)', value: 'int', points: 1 },
        { label: 'Poor (complex ≥3 abnormalities or chromosome 7 anomalies)', value: 'poor', points: 2 },
      ], 'good', 'Karyotype per WPSS definitions: good→0, intermediate→+1, poor→+2.'),
      yesNo('transfusion', 'Regular RBC transfusion requirement', 1, 'At least one RBC transfusion every 8 weeks over a 4-month period scores +1.', false),
    ],
    calculate(values) {
      const who = str(values.who, 'low');
      const karyo = str(values.karyotype, 'good');
      const score =
        (who === 'rcmd' ? 1 : who === 'raeb1' ? 2 : who === 'raeb2' ? 3 : 0) +
        (karyo === 'int' ? 1 : karyo === 'poor' ? 2 : 0) +
        (bool(values.transfusion) ? 1 : 0);
      let label = '';
      let os = '';
      let aml = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score === 0) { label = 'Very low risk'; os = '~141 months'; aml = '~2% at 2 yr'; riskLevel = 'low'; }
      else if (score === 1) { label = 'Low risk'; os = '~66 months'; aml = '~8% at 2 yr'; riskLevel = 'low'; }
      else if (score === 2) { label = 'Intermediate risk'; os = '~48 months'; aml = '~19% at 2 yr'; riskLevel = 'moderate'; }
      else if (score <= 4) { label = 'High risk'; os = '~26 months'; aml = '~42% at 2 yr'; riskLevel = 'high'; }
      else { label = 'Very high risk'; os = '~9 months'; aml = '~84% at 2 yr'; riskLevel = 'critical'; }
      return {
        score,
        unit: 'points',
        label,
        interpretation: `WPSS ${score}: ${label}. Estimated median survival ${os}; 2-year AML progression risk ${aml}.`,
        riskLevel,
        details: [
          { label: 'Score', value: `${score}/6` },
          { label: 'Median survival', value: os },
          { label: 'AML progression (2 yr)', value: aml },
        ],
        recommendations: [
          'High/very-high risk: evaluate for disease-modifying therapy and allo-HCT candidacy.',
          'Low/very-low risk: supportive care and low-intensity options as indicated.',
          'WPSS is time-dependent — rescore when clinical status or transfusions change.',
        ],
      };
    },
    evidence: {
      summary:
        'Points: WHO category (RA/RARS/del5q→0, RCMD/RCMD-RS→+1, RAEB-1→+2, RAEB-2→+3); karyotype (good→0, intermediate→+1, poor→+2); regular transfusion need→+1. Groups: very low 0, low 1, intermediate 2, high 3–4, very high 5–6.',
      formula: 'WPSS = WHO(0–3) + karyotype(0–2) + transfusion(0–1)',
      validation:
        'Developed and validated in a multinational MDS cohort (Malcovati 2007, JCO) as a time-dependent score applicable throughout the disease course; median survival 141/66/48/26/9 months and 2-yr AML risk 2/8/19/42/84% across the five groups.',
      references: [
        {
          title: 'Time-dependent prognostic scoring system for predicting survival and leukemic evolution in myelodysplastic syndromes',
          citation: 'Malcovati L et al. J Clin Oncol. 2007;25(23):3503-3510',
          year: 2007,
          pmid: '17687155',
          doi: '10.1200/JCO.2007.12.5696',
        },
      ],
    },
    nextSteps: [
      { condition: 'High / very high risk', actions: ['Hematology referral', 'Hypomethylating-agent discussion', 'Allo-HCT evaluation'] },
      { condition: 'Lower risk', actions: ['Supportive care', 'Growth factors/luspatercept/lenalidomide as indicated', 'Rescore over time'] },
    ],
    pearls: [
      'Transfusion dependence is defined as ≥1 RBC transfusion every 8 weeks over 4 months.',
      'WPSS uses the WHO-2001 morphologic categories — map carefully to WHO-2016/ICC terminology.',
      'Unlike static IPSS, WPSS can be recalculated at any disease time point.',
    ],
  },

  // ─── 18. REMA Score ───────────────────────────────────────────────────────
  {
    id: 'rema-score',
    name: 'Spanish Network on Mastocytosis (REMA) Score',
    shortName: 'REMA',
    description:
      'Predicts mast cell clonality / systemic mastocytosis on bone marrow biopsy in patients with systemic mast cell activation symptoms without skin lesions.',
    category: 'hematology',
    tags: ['rema', 'mastocytosis', 'mast cell', 'tryptase', 'anaphylaxis', 'syncope', 'urticaria', 'clonal'],
    whenToUse:
      'Patients with systemic mast cell activation symptoms (e.g., unexplained anaphylaxis or syncope) without mastocytosis in the skin, when deciding whether bone marrow examination for clonal mast cell disease is warranted.',
    whyUse:
      'The REMA score efficiently selects patients for bone marrow biopsy — a score ≥2 indicates high probability of clonal mast cell disease/systemic mastocytosis.',
    inputs: [
      selectInput('sex', 'Gender', [
        { label: 'Female', value: 'f', points: -1 },
        { label: 'Male', value: 'm', points: 1 },
      ], 'm', 'Male +1; female −1.'),
      selectInput('urticaria', 'Urticaria and/or angioedema', [
        { label: 'Present', value: 'yes', points: -2 },
        { label: 'Absent', value: 'no', points: 1 },
      ], 'no', 'Presence of urticaria and/or angioedema scores −2; absence scores +1.'),
      selectInput('syncope', 'Presyncope and/or syncope', [
        { label: 'No', value: 'no', points: 0 },
        { label: 'Yes', value: 'yes', points: 3 },
      ], 'no', 'Presyncope or syncope as a mast cell activation symptom scores +3.'),
      selectInput('tryptase', 'Baseline serum tryptase', [
        { label: '<15 ng/mL', value: 'lt15', points: -1 },
        { label: '15–25 ng/mL', value: 'mid', points: 0 },
        { label: '>25 ng/mL', value: 'gt25', points: 2 },
      ], 'mid', 'Baseline serum tryptase: <15→−1, 15–25→0, >25→+2.'),
    ],
    calculate(values) {
      const score =
        (str(values.sex, 'f') === 'm' ? 1 : -1) +
        (str(values.urticaria, 'yes') === 'no' ? 1 : -2) +
        (str(values.syncope, 'no') === 'yes' ? 3 : 0) +
        (str(values.tryptase, 'mid') === 'lt15' ? -1 : str(values.tryptase, 'mid') === 'gt25' ? 2 : 0);
      const positive = score >= 2;
      return {
        score,
        unit: 'points',
        label: positive ? 'REMA ≥2 — high probability of clonal mast cell disease' : 'REMA <2 — low probability',
        interpretation: positive
          ? `REMA score ${score} ≥2: high probability of clonal mast cells in the bone marrow or systemic mastocytosis — bone marrow biopsy is warranted.`
          : `REMA score ${score} <2: low probability of clonal mast cell disease (high negative predictive value). Consider adjunctive tests (KIT D816V in blood, hereditary alpha-tryptasemia genotyping) if suspicion persists.`,
        riskLevel: positive ? 'moderate' : 'low',
        details: [
          { label: 'Score', value: `${score}` },
          { label: 'Cutoff', value: '≥2 → biopsy indicated' },
        ],
        recommendations: [
          'Score ≥2: proceed to bone marrow biopsy with immunophenotyping and KIT mutational analysis.',
          'Score <2: consider KIT D816V analysis in blood and hereditary alpha-tryptasemia genotyping rather than biopsy first.',
          'Do not use the score as the sole criterion for biopsy — integrate clinical judgment.',
        ],
      };
    },
    evidence: {
      summary:
        'Points: male +1 / female −1; urticaria-angioedema present −2 / absent +1; presyncope-syncope +3; baseline tryptase <15 →−1, 15–25→0, >25→+2. Score ≥2 predicts clonal mast cell disease (sensitivity ~84–92%, specificity ~70–81% in validation).',
      formula: 'REMA = sex(±1) + urticaria(−2/+1) + syncope(0/+3) + tryptase(−1/0/+2); ≥2 positive',
      validation:
        'Prospectively validated in 158 patients with systemic mast cell activation symptoms without skin involvement (Álvarez-Twose 2012, Int Arch Allergy Immunol): sensitivity ~84% and specificity ~74% for clonality, ~87%/~73% for SM — outperforming tryptase alone. A 2025 revisited analysis confirmed high sensitivity (87–90%).',
      references: [
        {
          title: 'Validation of the REMA score for predicting mast cell clonality and systemic mastocytosis in patients with systemic mast cell activation symptoms',
          citation: 'Álvarez-Twose I et al. Int Arch Allergy Immunol. 2012;157(3):275-280',
          year: 2012,
          pmid: '22042301',
          doi: '10.1159/000329856',
        },
      ],
    },
    nextSteps: [
      { condition: 'REMA ≥2', actions: ['Bone marrow biopsy with tryptase/CD25 immunophenotyping', 'KIT D816V mutational analysis', 'Allergology/mastocytosis referral'] },
      { condition: 'REMA <2', actions: ['KIT mutation analysis in blood', 'Hereditary alpha-tryptasemia genotyping', 'Clinical follow-up for recurrent episodes'] },
    ],
    pearls: [
      'Applies to patients WITHOUT mastocytosis in the skin (urticaria pigmentosa changes the work-up).',
      'Typical high-score phenotype: male with presyncope/syncope and tryptase >25 ng/mL.',
      'The score predicts clonality — a positive score still requires WHO/ICC criteria for an SM diagnosis.',
    ],
  },

  // ─── 19. SCORMA Index ─────────────────────────────────────────────────────
  {
    id: 'scorma-index',
    name: 'Scoring Mastocytosis (SCORMA) Index',
    shortName: 'SCORMA',
    description:
      'Semiquantitative severity index for cutaneous mastocytosis combining extent (BSA), lesion intensity, and subjective symptoms.',
    category: 'hematology',
    tags: ['scorma', 'mastocytosis', 'cutaneous', 'darier', 'severity', 'urticaria pigmentosa'],
    whenToUse:
      'Children and adults with cutaneous mastocytosis for structured severity assessment and serial monitoring of disease course and treatment response.',
    whyUse:
      'SCORMA provides a reproducible, validated numeric measure of cutaneous mastocytosis severity that correlates with serum tryptase and tracks change over time.',
    inputs: [
      numberInput('bsa', 'Extent — % BSA involved', { unit: '%', min: 0, max: 100, exampleValue: 20, helpText: 'Estimated percentage of body surface area involved (use a consistent tool each evaluation — Rule of Nines, Lund–Browder, or the SCORMA graphic). Diffuse cutaneous mastocytosis = 100%.' }),
      selectInput('pigment', 'Pigmentation / erythema', [
        { label: 'Absent', value: 0 },
        { label: 'Mild', value: 1 },
        { label: 'Moderate', value: 2 },
        { label: 'Severe', value: 3 },
      ], 0, 'Score the chosen representative lesion 0–3.'),
      selectInput('vesic', 'Vesiculation', [
        { label: 'Absent', value: 0 },
        { label: 'Mild', value: 1 },
        { label: 'Moderate', value: 2 },
        { label: 'Severe', value: 3 },
      ], 0, 'Blistering/swelling of the lesion, spontaneous or induced (0–3).'),
      selectInput('elevation', 'Elevation', [
        { label: 'Absent', value: 0 },
        { label: 'Mild', value: 1 },
        { label: 'Moderate', value: 2 },
        { label: 'Severe', value: 3 },
      ], 0, 'Palpable elevation of the lesion (0–3).'),
      selectInput('darier', 'Positive Darier’s sign', [
        { label: 'Absent', value: 0 },
        { label: 'Mild', value: 1 },
        { label: 'Moderate', value: 2 },
        { label: 'Severe', value: 3 },
      ], 0, 'Wheal-and-flare response to rubbing the lesion, graded 0–3.'),
      numberInput('provoking', 'Provoking factors (VAS 0–10)', { unit: 'VAS', min: 0, max: 10, exampleValue: 2, helpText: 'Subjective burden of symptom-provoking factors on a 0–10 visual analog scale (caregiver input if child <5 years).' }),
      numberInput('flushing', 'Flushing (VAS 0–10)', { unit: 'VAS', min: 0, max: 10, exampleValue: 3, helpText: 'Flushing severity on a 0–10 visual analog scale.' }),
      numberInput('diarrhea', 'Diarrhea (VAS 0–10)', { unit: 'VAS', min: 0, max: 10, exampleValue: 1, helpText: 'Diarrhea severity on a 0–10 visual analog scale.' }),
      numberInput('pruritus', 'Pruritus (VAS 0–10)', { unit: 'VAS', min: 0, max: 10, exampleValue: 5, helpText: 'Itch severity on a 0–10 visual analog scale.' }),
      numberInput('bonePain', 'Localized bone pain (VAS 0–10)', { unit: 'VAS', min: 0, max: 10, exampleValue: 0, helpText: 'Localized bone pain on a 0–10 visual analog scale.' }),
    ],
    calculate(values) {
      const a = num(values.bsa, 0);
      const b = num(values.pigment, 0) + num(values.vesic, 0) + num(values.elevation, 0) + num(values.darier, 0);
      const c =
        num(values.provoking, 0) +
        num(values.flushing, 0) +
        num(values.diarrhea, 0) +
        num(values.pruritus, 0) +
        num(values.bonePain, 0);
      const scorma = round(a + b + c, 1);
      return {
        score: scorma,
        unit: 'SCORMA points',
        label: `SCORMA Index ${scorma}`,
        interpretation:
          `SCORMA = extent (${a}% BSA) + intensity (${b}/12) + subjective symptoms (${c}/50) = ${scorma}. No validated severity cutoffs exist — use for within-patient monitoring of disease course and treatment response.`,
        riskLevel: 'info',
        details: [
          { label: 'A — Extent (% BSA)', value: `${a}` },
          { label: 'B — Intensity (0–12)', value: `${b}` },
          { label: 'C — Subjective symptoms (0–50)', value: `${c}` },
        ],
        recommendations: [
          'Rescore at regular intervals using the same BSA-estimation method for consistency.',
          'Correlate with serum tryptase and systemic symptoms when evaluating for systemic involvement.',
          'No validated cutoffs guide treatment — interpret in clinical context.',
        ],
      };
    },
    evidence: {
      summary:
        'SCORMA = A + B + C, where A = % BSA involved (0–100), B = intensity (pigmentation/erythema, vesiculation, elevation, Darier’s sign; each 0–3 → 0–12), C = subjective symptoms (provoking factors, flushing, diarrhea, pruritus, bone pain; each 0–10 VAS → 0–50). Maximum ≈162.',
      formula: 'SCORMA = %BSA + Σ(4 intensity items 0–3) + Σ(5 VAS items 0–10)',
      validation:
        'Developed by Heide et al (Acta Derm Venereol 2001) and correlated positively with serum tryptase in a 64-patient pediatric/adult cohort (Heide 2009, Clin Exp Dermatol). Designed for monitoring, not threshold-based decision-making.',
      references: [
        {
          title: 'Clinical scoring of cutaneous mastocytosis',
          citation: 'Heide R, Middelkamp Hup MA, Mulder PG, Oranje AP. Acta Derm Venereol. 2001;81(4):273-276',
          year: 2001,
          pmid: '11720175',
          doi: '10.1080/00015550152572912',
        },
        {
          title: 'Serum tryptase and SCORMA (SCORing MAstocytosis) Index as disease severity parameters in childhood and adult cutaneous mastocytosis',
          citation: 'Heide R et al. Clin Exp Dermatol. 2009;34(4):462-468',
          year: 2009,
          doi: '10.1111/j.1365-2230.2008.03005.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rising SCORMA or systemic symptoms', actions: ['Check serum tryptase', 'Evaluate for systemic mastocytosis (REMA/WHO criteria)', 'Review trigger-avoidance and mediator therapy'] },
      { condition: 'Stable/low SCORMA', actions: ['Periodic rescoring', 'Continue symptom-directed care'] },
    ],
    pearls: [
      'There are no validated cutoffs — the value is in serial, same-method measurement.',
      'Part B scores a representative lesion, not the average of all lesions.',
      'Diffuse cutaneous mastocytosis scores 100% for the extent component.',
    ],
  },
];
