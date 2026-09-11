import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const missingGiLiverCalcs: Calculator[] = [
  {
    id: 'maddrey-df',
    name: "Maddrey Discriminant Function",
    shortName: 'Maddrey DF',
    description: 'Severity score for alcoholic hepatitis using PT prolongation and bilirubin.',
    category: 'gastroenterology',
    tags: ['alcoholic hepatitis', 'liver', 'steroids', 'maddrey'],
    whenToUse: 'Suspected or confirmed alcoholic hepatitis to assess severity and steroid candidacy.',
    whyUse: 'DF ≥32 identifies severe AH with high short-term mortality; classically used with Lille for treatment response.',
    inputs: [
      numberInput('pt', 'Patient prothrombin time', { unit: 'sec', min: 8, max: 120, step: 0.1, defaultValue: 18, helpText: 'Patient PT in seconds (not INR). Original Maddrey uses PT, not INR.' }),
      numberInput('ptControl', 'Control (lab reference) PT', { unit: 'sec', min: 8, max: 20, step: 0.1, defaultValue: 12, helpText: 'Use local lab control/mean normal PT' }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 8, helpText: 'mg/dL. If lab reports µmol/L, divide by 17.1.' }),
    ],
    calculate(values) {
      const pt = num(values.pt, 18);
      const control = num(values.ptControl, 12);
      const bili = num(values.bili, 8);
      const df = round(4.6 * (pt - control) + bili, 1);
      if (df >= 32) {
        return {
          score: df,
          label: 'Severe alcoholic hepatitis',
          interpretation:
            'DF ≥32: severe AH with high short-term mortality. Consider corticosteroids if no contraindications (infection, GI bleed, renal failure) and assess response with Lille score at day 7.',
          riskLevel: 'high',
          recommendations: ['Rule out infection before steroids', 'Nutrition support', 'Alcohol cessation counseling', 'Calculate Lille at day 7 if treated'],
        };
      }
      return {
        score: df,
        label: 'Not severe by DF',
        interpretation: 'DF <32: not classified as severe by Maddrey criteria; supportive care is mainstay. Still assess clinically for complications.',
        riskLevel: 'moderate',
      };
    },
    evidence: {
      summary: 'DF = 4.6 × (PT_patient − PT_control) + total bilirubin (mg/dL). Threshold ≥32 defines severe alcoholic hepatitis.',
      formula: 'DF = 4.6 × (PT − control PT) + bilirubin (mg/dL)',
      validation: 'Widely used severity threshold; steroids studied mainly in DF ≥32 populations. Complementary to MELD and GAHS.',
      references: [
        { title: 'Corticosteroid therapy of alcoholic hepatitis', citation: 'Maddrey WC et al. Gastroenterology. 1978', year: 1978, pmid: '352788',
          doi: '10.1016/0016-5085(78)90401-8', },
      ],
    },
    nextSteps: [
      { condition: 'DF ≥32', actions: ['Evaluate steroid candidacy', 'Screen for infection', 'Nutrition (high-calorie)', 'Plan Lille score day 7 if steroids started'] },
      { condition: 'DF <32', actions: ['Supportive care', 'Alcohol cessation', 'Monitor for deterioration'] },
    ],
    pearls: [
      'INR-based variants exist but original DF uses PT in seconds vs control.',
      'Bilirubin must be in mg/dL (μmol/L ÷ 17.1).',
    ],
  },

  {
    id: 'fib4',
    name: 'FIB-4 Index',
    shortName: 'FIB-4',
    description: 'Noninvasive estimate of advanced hepatic fibrosis from age, AST, ALT, and platelets.',
    category: 'gastroenterology',
    tags: ['fibrosis', 'nafld', 'hepatitis', 'noninvasive'],
    whenToUse: 'Outpatient risk stratification for advanced fibrosis in viral hepatitis, NAFLD/MASLD, and other chronic liver disease.',
    whyUse: 'Simple labs; dual cutoffs triage who needs elastography/biopsy vs low-risk follow-up.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 120, defaultValue: 50 }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 1, max: 2000, step: 1, defaultValue: 40 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 1, max: 2000, step: 1, defaultValue: 40 }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 1, max: 1000, step: 1, defaultValue: 200 }),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const ast = num(values.ast, 40);
      const alt = Math.max(num(values.alt, 40), 0.01);
      const plt = Math.max(num(values.plt, 200), 0.01);
      const fib4 = round((age * ast) / (plt * Math.sqrt(alt)), 2);
      const r = riskFromThresholds(fib4, [
        {
          max: 1.29,
          level: 'low',
          label: 'Low probability advanced fibrosis',
          interpretation: 'FIB-4 <1.3: advanced fibrosis unlikely in many NAFLD algorithms (age-adjusted cutoffs may apply). Routine specialty referral often deferred.',
        },
        {
          max: 2.66,
          level: 'moderate',
          label: 'Indeterminate',
          interpretation: 'Indeterminate range — consider elastography, enhanced liver fibrosis tests, or hepatology referral per pathway.',
        },
        {
          max: 1000,
          level: 'high',
          label: 'High probability advanced fibrosis',
          interpretation: 'FIB-4 ≥2.67: higher likelihood of advanced fibrosis/cirrhosis — hepatology evaluation, HCC/variceal screening if cirrhosis suspected.',
        },
      ]);
      return {
        score: fib4,
        unit: 'index',
        ...r,
        details: [
          { label: 'Classic viral cutoffs', value: '<1.45 low · 1.45–3.25 mid · >3.25 high' },
          { label: 'Common NAFLD cutoffs', value: '<1.3 low · >2.67 high' },
        ],
      };
    },
    evidence: {
      summary: 'FIB-4 = (Age × AST) / (Platelets × √ALT). Dual cutoffs reduce indeterminate zone for advanced fibrosis screening.',
      formula: 'FIB-4 = (age × AST) / (platelets × √ALT)',
      validation: 'Validated in HCV and widely adopted in NAFLD/MASLD pathways; performance varies by age and etiology.',
      references: [
        { title: 'Development of a simple noninvasive index to predict significant fibrosis in patients with HIV/HCV coinfection', citation: 'Sterling RK et al. Hepatology. 2006', year: 2006, pmid: '16729309',
          doi: '10.1002/hep.21178', },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Lifestyle measures if NAFLD', 'Repeat fibrosis assessment periodically'] },
      { condition: 'Indeterminate / high', actions: ['VCTE/elastography or ELF', 'Hepatology referral', 'Evaluate for cirrhosis complications if high'] },
    ],
    pearls: [
      'Age >65: low cutoff often raised to 2.0 to reduce false positives.',
      'Acute hepatitis inflates AST/ALT and invalidates interpretation.',
    ],
  },

  {
    id: 'apri',
    name: 'APRI Score',
    shortName: 'APRI',
    description: 'AST-to-Platelet Ratio Index for hepatic fibrosis/cirrhosis risk.',
    category: 'gastroenterology',
    tags: ['fibrosis', 'cirrhosis', 'apri', 'hepatitis'],
    whenToUse: 'Noninvasive fibrosis staging aid, especially viral hepatitis and resource-limited settings.',
    whyUse: 'Uses only AST, AST ULN, and platelets; WHO-endorsed in some HCV pathways.',
    inputs: [
      numberInput('ast', 'AST', { unit: 'U/L', min: 1, max: 2000, defaultValue: 60 }),
      numberInput('astUln', 'AST upper limit of normal', { unit: 'U/L', min: 20, max: 80, defaultValue: 40, helpText: 'Use local lab ULN' }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 1, max: 1000, defaultValue: 180 }),
    ],
    calculate(values) {
      const ast = num(values.ast, 60);
      const uln = Math.max(num(values.astUln, 40), 0.01);
      const plt = Math.max(num(values.plt, 180), 0.01);
      const apri = round((ast / uln / plt) * 100, 2);
      let label = 'Lower likelihood significant fibrosis';
      let interpretation = 'APRI <0.5: significant fibrosis less likely (does not fully exclude).';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (apri > 2) {
        label = 'Cirrhosis more likely';
        interpretation = 'APRI >2: cirrhosis more likely — evaluate for decompensation, varices, HCC screening.';
        riskLevel = 'high';
      } else if (apri >= 1.5) {
        label = 'Significant fibrosis more likely';
        interpretation = 'APRI ≥1.5: significant fibrosis more likely — confirmatory elastography/hepatology often appropriate.';
        riskLevel = 'high';
      } else if (apri >= 0.5) {
        label = 'Indeterminate';
        interpretation = 'APRI 0.5–1.5: indeterminate — use additional noninvasive tests or clinical context.';
        riskLevel = 'moderate';
      }
      return { score: apri, unit: 'index', label, interpretation, riskLevel };
    },
    evidence: {
      summary: 'APRI = [(AST / AST_ULN) / platelets (10⁹/L)] × 100. Common thresholds: <0.5 rule-out significant fibrosis; >1.5 rule-in; >2 cirrhosis.',
      formula: 'APRI = (AST/ULN) / platelets × 100',
      validation: 'Extensively studied in HCV; moderate accuracy — combine with other fibrosis tools.',
      references: [
        { title: 'A simple noninvasive index can predict both significant fibrosis and cirrhosis in patients with chronic hepatitis C', citation: 'Wai CT et al. Hepatology. 2003', year: 2003, pmid: '12883497',
          doi: '10.1053/jhep.2003.50346', },
      ],
    },
    nextSteps: [
      { condition: 'APRI ≥1.5', actions: ['Confirm with elastography if available', 'Hepatology referral', 'Cirrhosis complication screening if indicated'] },
      { condition: 'APRI <0.5', actions: ['Lower urgency for biopsy', 'Treat underlying disease', 'Repeat as clinically indicated'] },
    ],
  },

  {
    id: 'aims65',
    name: 'AIMS65 Score',
    shortName: 'AIMS65',
    description: 'In-hospital mortality risk in acute upper GI bleeding.',
    category: 'gastroenterology',
    tags: ['ugib', 'bleed', 'mortality', 'aims65'],
    whenToUse: 'Adults with acute upper GI bleeding for early mortality risk stratification.',
    whyUse: 'Five binary admission variables; easy bedside mortality estimate complementary to GBS/Rockall.',
    inputs: [
      yesNo('albumin', 'Albumin < 3.0 g/dL', 1),
      yesNo('inr', 'INR > 1.5', 1),
      yesNo('mental', 'Altered mental status (GCS <14)', 1, 'Saltzman AIMS65: GCS <14 or disorientation at presentation.'),
      yesNo('sbp', 'Systolic BP ≤ 90 mmHg', 1),
      yesNo('age', 'Age > 65 years', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.albumin) ? 1 : 0) +
        (bool(values.inr) ? 1 : 0) +
        (bool(values.mental) ? 1 : 0) +
        (bool(values.sbp) ? 1 : 0) +
        (bool(values.age) ? 1 : 0);
      const mortApprox = ['~0.3%', '~1%', '~3%', '~9%', '~15%', '~25%+'][score];
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Lower mortality risk', interpretation: `AIMS65 ${score}: lower in-hospital mortality (approx ${mortApprox} in derivation cohorts). Still use GBS for intervention need.` },        { max: 2, level: 'moderate', label: 'Intermediate', interpretation: `AIMS65 ${score}: intermediate mortality risk (approx ${mortApprox}). Inpatient care and timely endoscopy.` },
        { max: 5, level: 'high', label: 'High mortality risk', interpretation: `AIMS65 ${score}: high mortality risk (approx ${mortApprox}). Aggressive resuscitation; consider higher level of care.` },
      ]);
      return { score, ...r, details: [{ label: 'Approx mortality band', value: mortApprox }] };
    },
    evidence: {
      summary: 'AIMS65: Albumin <3, INR >1.5, Mental status change, SBP ≤90, age >65 — 1 point each (0–5).',
      formula: 'Sum of 5 binary criteria',
      validation: 'Derived from large US database; predicts mortality better than some scores; GBS better for need for intervention.',
      references: [
        { title: 'A simple risk score accurately predicts in-hospital mortality, length of stay, and cost in acute upper GI bleeding', citation: 'Saltzman JR et al. Gastrointest Endosc. 2011', year: 2011, pmid: '21907980',
          doi: '10.1016/j.gie.2011.06.024', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['Admit', 'Resuscitate (restrictive transfusion thresholds if stable)', 'Urgent endoscopy timing by severity', 'IV PPI per protocol'] },
      { condition: 'Score 0–1', actions: ['Still apply GBS for discharge safety', 'Do not use AIMS65 alone for outpatient triage'] },
    ],
    pearls: ['AIMS65 is for mortality, not need for endoscopic therapy — pair with Glasgow-Blatchford.'],
  },

  {
    id: 'lille-score',
    name: 'Lille Model (Alcoholic Hepatitis)',
    shortName: 'Lille',
    description: 'Predicts 6-month survival / steroid response in severe alcoholic hepatitis at day 7.',
    category: 'gastroenterology',
    tags: ['alcoholic hepatitis', 'steroids', 'lille', 'prognosis'],
    whenToUse: 'Day 7 of corticosteroid therapy for severe alcoholic hepatitis (usually DF ≥32 or equivalent).',
    whyUse: 'Identifies non-responders (Lille ≥0.45) who may not benefit from continued steroids.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 50 }),
      numberInput('albumin', 'Albumin day 0', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 2.5, helpText: 'Converted to g/L in formula' }),
      numberInput('bili0', 'Bilirubin day 0', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 12 }),
      numberInput('bili7', 'Bilirubin day 7', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 10 }),
      numberInput('pt', 'Prothrombin time', { unit: 'sec', min: 8, max: 120, step: 0.1, defaultValue: 20, helpText: 'PT in seconds (Louvet model), not INR. Same-day as the day-0/7 bilirubin pair as specified in the original paper (typically day 0).' }),
      yesNo('renal', 'Renal insufficiency (Cr >1.3 mg/dL or renal support at day 0)', 0.023000000000000007),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const albuminGdl = num(values.albumin, 2.5);
      const albuminGl = albuminGdl * 10; // g/L
      const bili0Mg = num(values.bili0, 12);
      const bili7Mg = num(values.bili7, 10);
      const bili0 = bili0Mg * 17.1; // μmol/L
      const bili7 = bili7Mg * 17.1;
      const deltaBili = bili0 - bili7; // day0 − day7 in μmol/L
      const pt = num(values.pt, 20);
      const renal = bool(values.renal) ? 1 : 0;

      // Louvet et al. Hepatology 2007
      const R =
        3.19 -
        0.101 * age +
        0.147 * albuminGl +
        0.0165 * deltaBili -
        0.206 * renal -
        0.0065 * bili0 -
        0.0096 * pt;
      const lille = round(Math.exp(-R) / (1 + Math.exp(-R)), 3);

      if (lille >= 0.45) {
        return {
          score: lille,
          label: 'Non-responder',
          interpretation:
            'Lille ≥0.45: predicted poor response to corticosteroids (~25% 6-month survival in original work). Consider stopping steroids; evaluate for clinical trial, early transplant pathways where available, or palliative focus.',
          riskLevel: 'high',
          details: [
            { label: 'R (linear predictor)', value: String(round(R, 3)) },
            { label: 'ΔBilirubin (day0−day7)', value: `${round(bili0Mg - bili7Mg, 1)} mg/dL` },
          ],
          recommendations: ['Discuss stopping corticosteroids', 'Infection surveillance', 'Nutrition', 'Transplant evaluation if candidate'],
        };
      }
      return {
        score: lille,
        label: 'Responder',
        interpretation:
          'Lille <0.45: predicted responder — continue corticosteroids for full course (typically 28 days) with close monitoring if no contraindications.',
        riskLevel: 'moderate',
        details: [
          { label: 'R (linear predictor)', value: String(round(R, 3)) },
          { label: 'ΔBilirubin (day0−day7)', value: `${round(bili0Mg - bili7Mg, 1)} mg/dL` },
        ],
      };
    },
    evidence: {
      summary:
        'Lille = exp(−R)/(1+exp(−R)); R = 3.19 − 0.101×age + 0.147×albumin(g/L) + 0.0165×(bili0−bili7 μmol/L) − 0.206×renal − 0.0065×bili0(μmol/L) − 0.0096×PT(sec). ≥0.45 non-response.',
      formula: 'Logistic model from age, day-0 albumin, bilirubin change, renal insufficiency, day-0 bilirubin, PT',
      validation: 'Validated predictor of 6-month survival after steroid initiation; guides early stop in non-responders.',
      references: [
        { title: 'The Lille model: a new tool for therapeutic strategy in patients with severe alcoholic hepatitis treated with steroids', citation: 'Louvet A et al. Hepatology. 2007', year: 2007, pmid: '17518367',
          doi: '10.1002/hep.21607', },
      ],
    },
    nextSteps: [
      { condition: 'Lille ≥0.45', actions: ['Stop steroids (typical practice)', 'Exclude infection', 'Consider transplant referral if eligible', 'Supportive/palliative goals as appropriate'] },
      { condition: 'Lille <0.45', actions: ['Complete steroid course', 'Alcohol rehabilitation planning', 'Monitor glucose, infection, GI bleed'] },
    ],
    pearls: [
      'Albumin enters as g/L (this tool multiplies g/dL × 10).',
      'Bilirubin entered as mg/dL is converted ×17.1 to μmol/L.',
      'Calculate on day 7 after starting prednisolone.',
    ],
  },

  {
    id: 'kings-college',
    name: "King's College Criteria (ALF)",
    shortName: "King's College",
    description: 'Transplant listing criteria for acute liver failure (acetaminophen vs non-acetaminophen).',
    category: 'gastroenterology',
    tags: ['ALF', 'transplant', 'acetaminophen', 'fulminant'],
    whenToUse: 'Acute liver failure when considering urgent liver transplant referral/listing.',
    whyUse: 'Classic high-specificity criteria for poor prognosis without transplant; still widely referenced with modern refinements.',
    inputs: [
      selectInput('etiology', 'Etiology mode', [
        { label: 'Acetaminophen (paracetamol)', value: 'apap', description: 'Uses pH <7.3 OR (INR >6.5 + Cr >3.4 + HE III–IV)' },
        { label: 'Non-acetaminophen', value: 'non', description: 'Uses INR >6.5 alone, or ≥3 of 5 accessory factors' },
      ], undefined, 'Switch APAP vs non-APAP first. APAP items: pH, HE III–IV, INR >6.5, Cr >3.4. Non-APAP extras: INR >3.5, bili >17.5, age <10/>40, unfavorable etiology, jaundice-to-HE >7 d. INR >6.5 is used in both pathways.'),      // Shared / APAP
      yesNo('ph', 'Arterial pH < 7.30 (after fluid resuscitation)', 1, 'Acetaminophen pathway only. Volume-resuscitate before interpreting pH. Ignored in non-APAP mode.'),
      yesNo('enceph34', 'Hepatic encephalopathy grade III–IV', 0, 'West Haven: III = somnolent but arousable, marked confusion, incoherent speech; IV = coma (unresponsive to verbal stimuli). Grades I–II do not count. Used in the APAP triad (with INR >6.5 and Cr >3.4).'),
      yesNo('inr65', 'INR > 6.5 (or PT > 100 sec)', 0, 'Both pathways: APAP triad item, and standalone non-APAP listing criterion.'),
      yesNo('cr34', 'Creatinine > 3.4 mg/dL (>300 μmol/L)', 0, 'Acetaminophen pathway only (APAP triad with INR >6.5 and grade III–IV HE). Not scored in non-APAP mode.'),
      yesNo('inr35', 'INR > 3.5 (or PT > 50 sec)', 0, 'Non-acetaminophen pathway only — one of five accessory poor-prognosis factors (≥3 of 5, or INR >6.5 alone).'),
      yesNo('bili175', 'Bilirubin > 17.5 mg/dL (>300 μmol/L)', 0, 'Non-acetaminophen pathway only — accessory factor.'),
      yesNo('ageExtreme', 'Age <10 or >40 years', 0, 'Non-acetaminophen pathway only — accessory factor.'),
      yesNo('unfavEtiol', 'Unfavorable etiology (idiosyncratic drug, seronegative, Wilson, Budd-Chiari, etc.)', 0, 'Non-acetaminophen pathway only — accessory factor (idiosyncratic drug, seronegative hepatitis, Wilson, Budd-Chiari; not HAV/HBV or pregnancy-related).'),
      yesNo('jaundiceEnceph7', 'Jaundice to encephalopathy interval > 7 days', 0, 'Non-acetaminophen pathway only — accessory factor: time from first jaundice to onset of HE >7 days.'),
    ],
    calculate(values) {
      const mode = String(values.etiology ?? 'apap');
      const enceph34 = bool(values.enceph34);
      const cr34 = bool(values.cr34);
      if (mode === 'apap') {
        const phMet = bool(values.ph);
        const inr65 = bool(values.inr65);
        const triad = inr65 && cr34 && enceph34;
        const meets = phMet || triad;
        return {
          score: meets ? 1 : 0,
          label: meets ? 'Criteria MET' : 'Criteria NOT met',
          interpretation: meets
            ? "King's College acetaminophen criteria met — poor prognosis without transplant; urgent transplant center contact if candidate."
            : 'Criteria not met; prognosis may still be poor — serial labs, lactate, phosphate, and clinical trajectory matter. Early referral still appropriate if deteriorating.',
          riskLevel: meets ? 'critical' : 'moderate',
          details: [
            { label: 'pH <7.3', value: phMet ? 'Yes' : 'No' },
            { label: 'INR >6.5', value: inr65 ? 'Yes' : 'No' },
            { label: 'Creatinine >3.4 mg/dL', value: cr34 ? 'Yes' : 'No' },
            { label: 'Encephalopathy grade III–IV', value: enceph34 ? 'Yes' : 'No' },
            { label: 'INR>6.5 + Cr>3.4 + grade III–IV HE', value: triad ? 'Yes' : 'No' },
          ],
          recommendations: meets
            ? ['Immediate transplant hepatology referral', 'ICU care', 'N-acetylcysteine', 'Support organ failures']
            : ['Continue NAC', 'Serial prognostic markers', 'Low threshold for transfer to transplant center'],
        };
      }

      // Non-acetaminophen
      const inr65 = bool(values.inr65);
      const ofThree =
        (bool(values.ageExtreme) ? 1 : 0) +
        (bool(values.unfavEtiol) ? 1 : 0) +
        (bool(values.jaundiceEnceph7) ? 1 : 0) +
        (bool(values.inr35) ? 1 : 0) +
        (bool(values.bili175) ? 1 : 0);
      const meets = inr65 || ofThree >= 3;
      return {
        score: meets ? 1 : 0,
        label: meets ? 'Criteria MET' : 'Criteria NOT met',
        interpretation: meets
          ? "King's College non-acetaminophen criteria met (INR >6.5 alone, or ≥3 of 5 poor-prognosis factors) — urgent transplant evaluation."
          : `Criteria not met (${ofThree}/5 accessory factors; INR>6.5: ${inr65 ? 'yes' : 'no'}). Continue aggressive supportive care and early specialist input if ALF.`,
        riskLevel: meets ? 'critical' : 'moderate',
        details: [
          { label: 'INR >6.5', value: inr65 ? 'Yes' : 'No' },
          { label: 'Accessory factors positive', value: `${ofThree} / 5` },
          { label: 'APAP triad inputs (not scored in non-APAP mode)', value: `HE III–IV: ${enceph34 ? 'yes' : 'no'}; Cr>3.4: ${cr34 ? 'yes' : 'no'}` },
        ],
      };
    },
    evidence: {
      summary:
        'APAP: pH <7.3 OR (INR>6.5 + Cr>3.4 mg/dL + grade III–IV HE). Non-APAP: INR>6.5 OR any 3 of: age <10/>40, unfavorable etiology, jaundice-to-HE >7d, INR>3.5, bili>17.5 mg/dL.',
      validation: 'High specificity, moderate sensitivity; modern scores (e.g., MELD, lactate) used adjunctively.',
      references: [
        { title: 'Early indicators of prognosis in fulminant hepatic failure', citation: 'O\'Grady JG et al. Gastroenterology. 1989', year: 1989, pmid: '2490426',
          doi: '10.1016/0016-5085(89)90081-4', },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Emergent transplant center referral', 'ICU management', 'List if candidate', 'Treat etiology (NAC for APAP)'] },
      { condition: 'Not met but ALF', actions: ['Do not delay transfer if progressive HE/coagulopathy', 'Serial exam and labs'] },
    ],
    pearls: [
      'Apply APAP vs non-APAP branch correctly — criteria differ.',
      'Hyperacute APAP failure can meet pH criterion early; volume resuscitate before interpreting pH.',
    ],
  },

  {
    id: 'glasgow-ah',
    name: 'Glasgow Alcoholic Hepatitis Score (GAHS)',
    shortName: 'GAHS',
    description: 'Day-1 (or day-7) severity score for alcoholic hepatitis mortality risk.',
    category: 'gastroenterology',
    tags: ['alcoholic hepatitis', 'gahs', 'glasgow', 'prognosis'],
    whenToUse: 'Alcoholic hepatitis severity assessment; score ≥9 associated with higher mortality.',
    whyUse: 'Uses age, WBC, urea, PT ratio/INR, and bilirubin; may outperform DF for mortality in some cohorts.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<50 years (1)', value: 1 },
        { label: '≥50 years (2)', value: 2 },
      ]),
      selectInput('wcc', 'White cell count', [
        { label: '<15 ×10⁹/L (1)', value: 1 },
        { label: '≥15 ×10⁹/L (2)', value: 2 },
      ]),
      selectInput('urea', 'Urea', [
        { label: '<5 mmol/L (<14 mg/dL BUN) (1)', value: 1 },
        { label: '≥5 mmol/L (≥14 mg/dL BUN) (2)', value: 2 },
      ], 1, 'Urea in mmol/L (not BUN); BUN mg/dL ≈ urea mmol/L × 2.8'),
      selectInput('ptRatio', 'PT ratio or INR', [
        { label: '<1.5 (1)', value: 1 },
        { label: '1.5–2.0 (2)', value: 2 },
        { label: '>2.0 (3)', value: 3 },
      ]),
      selectInput('bili', 'Bilirubin', [
        { label: '<125 μmol/L (<7.3 mg/dL) (1)', value: 1 },
        { label: '125–250 μmol/L (7.3–14.6 mg/dL) (2)', value: 2 },
        { label: '>250 μmol/L (>14.6 mg/dL) (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.age) + num(values.wcc) + num(values.urea) + num(values.ptRatio) + num(values.bili);
      if (score >= 9) {
        return {
          score,
          label: 'High risk (GAHS ≥9)',
          interpretation:
            'GAHS ≥9 on day 1 (or day 7): higher mortality; consider corticosteroids if no contraindications and use Lille for response. Aggressive supportive care.',
          riskLevel: 'high',
          details: [{ label: 'Score range', value: '5–12' }],
        };
      }
      return {
        score,
        label: 'Lower risk (GAHS <9)',
        interpretation: 'GAHS <9: lower mortality risk group in original series; supportive care and alcohol cessation remain essential. Reassess if clinically worsens.',
        riskLevel: 'moderate',
        details: [{ label: 'Score range', value: '5–12' }],
      };
    },
    evidence: {
      summary: 'GAHS sums points for age, WCC, urea, PT ratio/INR, bilirubin (range 5–12). Threshold ≥9 predicts poor outcome.',
      formula: 'Age + WCC + urea + PT ratio + bilirubin category points',
      validation: 'Derived/validated in UK alcoholic hepatitis cohorts; used alongside DF and MELD.',
      references: [
        { title: 'Analysis of factors predictive of mortality in alcoholic hepatitis and derivation and validation of the Glasgow alcoholic hepatitis score', citation: 'Forrest EH et al. Gut. 2005', year: 2005, pmid: '16009691',
          doi: '10.1136/gut.2004.050781', },
      ],
    },
    nextSteps: [
      { condition: 'GAHS ≥9', actions: ['Consider steroids if eligible', 'Infection screen', 'Nutrition', 'Lille at day 7 if treated'] },
      { condition: 'GAHS <9', actions: ['Supportive care', 'Monitor trajectory', 'Alcohol services referral'] },
    ],
  },

  {
    id: 'r-factor-dili',
    name: 'R-Factor for DILI',
    shortName: 'R-factor',
    description: 'Classifies drug-induced liver injury pattern as hepatocellular, cholestatic, or mixed.',
    category: 'gastroenterology',
    tags: ['DILI', 'drug injury', 'hepatotoxicity', 'R-factor'],
    whenToUse: 'Suspected drug-induced liver injury to characterize biochemical pattern at presentation (or peak).',
    whyUse: 'Pattern guides differential (e.g., hepatocellular vs cholestatic drugs), causality assessment, and expected course.',
    inputs: [
      numberInput('alt', 'ALT', { unit: 'U/L', min: 1, max: 10000, defaultValue: 200, helpText: 'Use the same time point as ALP (recognition or peak).' }),
      numberInput('altUln', 'ALT upper limit of normal', { unit: 'U/L', min: 10, max: 80, defaultValue: 40, helpText: 'Local lab ULN, same assay as the ALT entered.' }),
      numberInput('alp', 'Alkaline phosphatase', { unit: 'U/L', min: 1, max: 5000, defaultValue: 120, helpText: 'Same time point as ALT.' }),
      numberInput('alpUln', 'ALP upper limit of normal', { unit: 'U/L', min: 20, max: 200, defaultValue: 120, helpText: 'Local lab ULN, same assay as the ALP entered.' }),
    ],
    calculate(values) {
      const alt = num(values.alt, 200);
      const altUln = Math.max(num(values.altUln, 40), 0.01);
      const alp = num(values.alp, 120);
      const alpUln = Math.max(num(values.alpUln, 120), 0.01);
      const altRatio = alt / altUln;
      const alpRatio = alp / alpUln;
      const r = round(altRatio / Math.max(alpRatio, 0.001), 2);

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      if (r >= 5) {
        label = 'Hepatocellular';
        interpretation = 'R ≥5: hepatocellular pattern. Higher risk of severe acute injury with some agents; monitor INR, mental status, and discontinue culprit drug.';
        riskLevel = r >= 5 && altRatio > 10 ? 'high' : 'moderate';
      } else if (r <= 2) {
        label = 'Cholestatic';
        interpretation = 'R ≤2: cholestatic pattern. Often prolonged course; evaluate biliary obstruction and cholestatic drug culprits.';
        riskLevel = 'moderate';
      } else {
        label = 'Mixed';
        interpretation = 'R between 2 and 5: mixed hepatocellular–cholestatic pattern.';
        riskLevel = 'moderate';
      }
      return {
        score: r,
        unit: 'R',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ALT ×ULN', value: String(round(altRatio, 2)) },
          { label: 'ALP ×ULN', value: String(round(alpRatio, 2)) },
        ],
      };
    },
    evidence: {
      summary: 'R = (ALT/ULN_ALT) ÷ (ALP/ULN_ALP). ≥5 hepatocellular, ≤2 cholestatic, 2–5 mixed (CIOMS/RUCAM).',
      formula: 'R = (ALT/ULN) / (ALP/ULN)',
      validation: 'Standard DILI phenotype definition used in RUCAM and regulatory guidance.',
      references: [
        { title: 'Criteria of drug-induced liver disorders: report of an international consensus meeting', citation: 'Benichou C. J Hepatol. 1990 / CIOMS', year: 1990, pmid: '2254635',
          doi: '10.1016/0168-8278(90)90124-a', },
      ],
    },
    nextSteps: [
      { condition: 'Any pattern', actions: ['Stop suspected drug(s)', 'Exclude viral/autoimmune/biliary causes', 'Serial LFTs and INR', 'Report severe DILI'] },
      { condition: 'Hepatocellular + jaundice or coagulopathy', actions: ['Urgent hepatology', 'Consider Hy’s law implications'] },
    ],
    pearls: ['Use values from the same time point, ideally at DILI recognition.', 'Pattern can evolve — recheck R if course changes.'],
  },

  {
    id: 'forrest-classification',
    name: 'Forrest Classification (Ulcer Bleed)',
    shortName: 'Forrest',
    description: 'Endoscopic stigmata of peptic ulcer hemorrhage and rebleeding risk.',
    category: 'gastroenterology',
    tags: ['ulcer', 'ugib', 'endoscopy', 'forrest', 'rebleed'],
    whenToUse: 'During or after endoscopy for bleeding peptic ulcer to describe stigmata and guide therapy/disposition.',
    whyUse: 'Standardizes rebleeding risk communication and need for endoscopic hemostasis / high-dose PPI.',
    inputs: [
      selectInput(
        'grade',
        'Forrest grade',
        [
          { label: 'Ia — Spurting arterial hemorrhage', value: 'Ia', description: 'Active pulsatile/spurting arterial bleeding from the ulcer' },
          { label: 'Ib — Oozing hemorrhage', value: 'Ib', description: 'Active non-pulsatile oozing from the ulcer' },
          { label: 'IIa — Nonbleeding visible vessel', value: 'IIa', description: 'Protuberant pigmented (sentinel) vessel, not actively bleeding' },
          { label: 'IIb — Adherent clot', value: 'IIb', description: 'Adherent clot remaining after gentle washing; not easily washed off' },
          { label: 'IIc — Flat pigmented spot', value: 'IIc', description: 'Flat pigmented red or black spot in the ulcer base; not raised' },
          { label: 'III — Clean ulcer base', value: 'III', description: 'Clean ulcer base, no stigmata of recent hemorrhage' },
        ],
        undefined,
        'Grade after gentle irrigation of the ulcer. IIb = clot that remains adherent after washing; if washing reveals a vessel or active bleed, score the underlying stigma (IIa/Ia/Ib).',
      ),
    ],
    calculate(values) {
      const g = String(values.grade ?? 'III');
      const map: Record<string, { score: number; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; rebleed: string }> = {
        Ia: {
          score: 1,
          label: 'Forrest Ia — active spurting',
          interpretation: 'Highest risk active bleeding. Requires immediate endoscopic hemostasis (usually dual therapy) and high-dose acid suppression; high rebleed risk if untreated.',
          riskLevel: 'critical',
          rebleed: '~55%+ without therapy',
        },
        Ib: {
          score: 2,
          label: 'Forrest Ib — oozing',
          interpretation: 'Active oozing — endoscopic therapy indicated; significant rebleed risk without treatment.',
          riskLevel: 'high',
          rebleed: '~40–55% without therapy',
        },
        IIa: {
          score: 3,
          label: 'Forrest IIa — visible vessel',
          interpretation: 'Nonbleeding visible vessel — high rebleed risk; endoscopic therapy recommended.',
          riskLevel: 'high',
          rebleed: '~40–50% without therapy',
        },
        IIb: {
          score: 4,
          label: 'Forrest IIb — adherent clot',
          interpretation: 'Adherent clot — intermediate risk. Consider clot removal and treat underlying stigma; guidelines often support therapy ± intensive PPI.',
          riskLevel: 'moderate',
          rebleed: '~20–35%',
        },
        IIc: {
          score: 5,
          label: 'Forrest IIc — flat spot',
          interpretation: 'Flat pigmented spot — low rebleed risk; endoscopic hemostasis usually not required; oral PPI often sufficient.',
          riskLevel: 'low',
          rebleed: '~7–10%',
        },
        III: {
          score: 6,
          label: 'Forrest III — clean base',
          interpretation: 'Clean base — very low rebleed risk; early diet, oral PPI, consider early discharge if clinically stable.',
          riskLevel: 'low',
          rebleed: '~3–5%',
        },
      };
      const row = map[g] ?? map.III;
      return {
        score: row.score,
        label: row.label,
        interpretation: row.interpretation,
        riskLevel: row.riskLevel,
        details: [
          { label: 'Grade', value: g },
          { label: 'Historical rebleed (untreated approx)', value: row.rebleed },
        ],
      };
    },
    evidence: {
      summary: 'Forrest I active bleed, IIa vessel, IIb clot = higher risk needing therapy; IIc/III low risk.',
      validation: 'Endoscopic classification standard for decades; rebleed estimates predate modern PPI/endotherapy but rank-order remains valid.',
      references: [
        { title: 'Endoscopy in gastrointestinal bleeding', citation: 'Forrest JA et al. Lancet. 1974', year: 1974, pmid: '4136718',
          doi: '10.1016/s0140-6736(74)91770-x', },
      ],
    },
    nextSteps: [
      { condition: 'Ia, Ib, IIa (± IIb)', actions: ['Endoscopic hemostasis', 'High-dose PPI', 'H. pylori testing', 'Hold/reverse anticoagulants per risk'] },
      { condition: 'IIc / III', actions: ['Oral PPI', 'Early feeding if stable', 'H. pylori test and treat', 'Secondary prophylaxis'] },
    ],
  },

  {
    id: 'atlanta-pancreatitis',
    name: 'Revised Atlanta Classification Helper',
    shortName: 'Atlanta',
    description: 'Severity class for acute pancreatitis: mild, moderately severe, or severe.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'atlanta', 'severity', 'organ failure'],
    whenToUse: 'Classify acute pancreatitis severity using organ failure duration and local/systemic complications.',
    whyUse: 'Revised Atlanta (2012) is the consensus clinical severity framework guiding intensity of care.',
    inputs: [
      selectInput('organFailure', 'Organ failure (respiratory, cardiovascular, or renal per modified Marshall)', [
        { label: 'None', value: 'none', description: 'No modified Marshall ≥2 in respiratory, CV, or renal systems' },
        { label: 'Transient (<48 hours)', value: 'transient', description: 'Organ failure present but resolved within 48 h' },
        { label: 'Persistent (≥48 hours)', value: 'persistent', description: 'Organ failure lasting ≥48 h (defines severe AP)' },
      ], undefined, 'Organ failure = modified Marshall ≥2 in any system: respiratory PaO₂/FiO₂ <300; renal creatinine ≥1.9 mg/dL (≥170 µmol/L); CV SBP <90 mmHg not fluid-responsive (off inotropes). Estimate FiO₂ for non-ventilated patients; interpret creatinine against CKD baseline. Transient <48 h; persistent ≥48 h.'),
      yesNo(
        'localComp',
        'Local complications (acute peripancreatic fluid, necrosis, pseudocyst, walled-off necrosis, etc.)',
        1,
        'Revised Atlanta local complications: APFC, acute necrotic collection, pancreatic pseudocyst, or walled-off necrosis. Usually diagnosed on contrast CT ≥72 h. Does not by itself make severe AP (needs persistent organ failure).',
      ),
      yesNo(
        'systemicComp',
        'Systemic complications (exacerbation of comorbidity, e.g., CAD, COPD)',
        1,
        'Exacerbation of a pre-existing comorbidity precipitated by pancreatitis (e.g., CAD, COPD, HF) that is not organ failure by modified Marshall. Together with transient OF or local complications defines moderately severe AP.',
      ),
    ],
    calculate(values) {
      const of = String(values.organFailure ?? 'none');
      const local = bool(values.localComp);
      const systemic = bool(values.systemicComp);

      if (of === 'persistent') {
        return {
          score: 3,
          label: 'Severe acute pancreatitis',
          interpretation:
            'Persistent organ failure ≥48 h (single or multiple) = severe AP. High mortality — ICU-level care, goal-directed resuscitation, early nutrition, delayed invasive necrosis management if needed.',
          riskLevel: 'critical',
        };
      }
      if (of === 'transient' || local || systemic) {
        return {
          score: 2,
          label: 'Moderately severe acute pancreatitis',
          interpretation:
            'Transient organ failure and/or local or systemic complications without persistent organ failure. Often prolonged stay; monitor for evolving necrosis/infection.',
          riskLevel: 'high',
        };
      }
      return {
        score: 1,
        label: 'Mild acute pancreatitis',
        interpretation: 'No organ failure and no local/systemic complications. Usually self-limited; early oral feeding as tolerated and treat etiology (e.g., gallstones, alcohol, triglycerides).',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'Mild: no OF/complications. Moderately severe: transient OF (<48h) and/or local/systemic complications. Severe: persistent OF ≥48h.',
      validation: 'International consensus revision of Atlanta criteria (2012); widely adopted.',
      references: [
        { title: 'Classification of acute pancreatitis—2012: revision of the Atlanta classification and definitions by international consensus', citation: 'Banks PA et al. Gut. 2013', year: 2013, pmid: '23100216',
          doi: '10.1136/gutjnl-2012-302779', },
      ],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['Supportive care', 'Early feeding', 'Etiology workup', 'Cholecystectomy same admission if gallstone AP when suitable'] },
      { condition: 'Moderate–severe', actions: ['Close monitoring / step-up care', 'Avoid early necrosectomy', 'Nutrition', 'Cross-sectional imaging if no improvement ~72h+'] },
    ],
    pearls: ['Severity may only be finalized after 48 h when organ failure persistence is known.', 'Interstitial vs necrotizing is a morphologic descriptor, not the same as mild/severe.'],
  },

  {
    id: 'air-appendicitis',
    name: 'Appendicitis Inflammatory Response (AIR) Score',
    shortName: 'AIR',
    description: 'Clinical + lab score for probability of acute appendicitis.',
    category: 'emergency',
    tags: ['appendicitis', 'AIR', 'abdominal pain', 'surgery'],
    whenToUse: 'Suspected appendicitis to stratify low vs high probability and guide imaging/surgery.',
    whyUse: 'Incorporates graded peritonitis and CRP; often better calibrated than Alvarado in validations.',
    inputs: [
      yesNo('vomiting', 'Vomiting', 1, 'Any vomiting (not nausea alone).'),
      yesNo('rlqPain', 'Pain in right inferior fossa', 1, 'Pain localized to the right iliac fossa / RLQ (not just migration).'),
      selectInput('rebound', 'Rebound tenderness / muscular defense', [
        { label: 'None (0)', value: 0, description: 'No rebound and no guarding' },
        { label: 'Light (1)', value: 1, description: 'Grimace or localized tenderness on release; mild guarding' },
        { label: 'Medium (2)', value: 2, description: 'Obvious guarding, still examinable' },
        { label: 'Strong (3)', value: 3, description: 'Board-like or generalized defense; cannot tolerate palpation' },
      ], undefined, 'Press slowly in the right iliac fossa then release, or grade muscular defense. Light = grimace/localized; medium = obvious guarding, still examinable; strong = board-like/generalized, cannot tolerate palpation.'),
      yesNo('temp', 'Body temperature ≥38.5°C', 1),
      selectInput('pmn', 'Polymorphonuclear leukocytes', [
        { label: '<70% (0)', value: 0, description: 'Neutrophil percentage of WBC <70%' },
        { label: '70–84% (1)', value: 1, description: 'Neutrophils 70–84% of WBC' },
        { label: '≥85% (2)', value: 2, description: 'Neutrophils ≥85% of WBC' },
      ], undefined, 'Differential: % neutrophils (PMN) of the total WBC, not the absolute neutrophil count.'),
      selectInput('wbc', 'WBC count', [
        { label: '<10 ×10⁹/L (0)', value: 0, description: 'WBC <10 ×10⁹/L (10,000/µL)' },
        { label: '10–14.9 ×10⁹/L (1)', value: 1, description: 'WBC 10.0–14.9 ×10⁹/L' },
        { label: '≥15 ×10⁹/L (2)', value: 2, description: 'WBC ≥15 ×10⁹/L (15,000/µL)' },
      ]),
      selectInput('crp', 'CRP', [
        { label: '<10 mg/L (0)', value: 0, description: 'CRP <10 mg/L' },
        { label: '10–49 mg/L (1)', value: 1, description: 'CRP 10–49 mg/L' },
        { label: '≥50 mg/L (2)', value: 2, description: 'CRP ≥50 mg/L' },
      ], undefined, 'CRP in mg/L (not mg/dL). If the lab reports mg/dL, multiply by 10.'),
    ],
    calculate(values) {
      const score =
        (bool(values.vomiting) ? 1 : 0) +
        (bool(values.rlqPain) ? 1 : 0) +
        num(values.rebound) +
        (bool(values.temp) ? 1 : 0) +
        num(values.pmn) +
        num(values.wbc) +
        num(values.crp);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low probability',
          interpretation: 'AIR 0–4: low probability of appendicitis — observation, alternative diagnoses, selective imaging.',
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Indeterminate',
          interpretation: 'AIR 5–8: intermediate probability — imaging (US/CT/MRI) usually appropriate.',
        },
        {
          max: 12,
          level: 'high',
          label: 'High probability',
          interpretation: 'AIR 9–12: high probability — surgical consultation; imaging still often used depending on practice.',
        },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'AIR score (0–12): vomiting, RIF pain, graded rebound/guarding, fever ≥38.5, PMN%, WBC, CRP.',
      validation: 'Andersson et al.; multiple external validations; useful for ruling in/out.',
      references: [
        { title: 'The Appendicitis Inflammatory Response Score: a tool for the diagnosis of acute appendicitis that outperforms the Alvarado score', citation: 'Andersson M, Andersson RE. World J Surg. 2008', year: 2008, pmid: '18553045',
          doi: '10.1007/s00268-008-9649-y', },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Reassess', 'Consider gyn/GU/mesenteric adenitis', 'Safety-net advice'] },
      { condition: 'Intermediate–high', actions: ['Imaging per age/pregnancy', 'Surgical consult', 'NPO / IV fluids if operating'] },
    ],
  },

  {
    id: 'ripasa',
    name: 'RIPASA Appendicitis Score',
    shortName: 'RIPASA',
    description: 'Appendicitis probability score developed for Asian populations (also used more widely).',
    category: 'emergency',
    tags: ['appendicitis', 'RIPASA', 'surgery', 'abdominal pain'],
    whenToUse: 'Suspected acute appendicitis clinical probability estimation.',
    whyUse: 'Includes demographics, symptoms, signs, labs, and urinalysis; cutoff ≥7.5 often used for high sensitivity.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male (1.0)', value: 1 },
        { label: 'Female (0.5)', value: 0.5 },
      ]),
      selectInput('age', 'Age', [
        { label: '<40 years (1.0)', value: 1 },
        { label: '≥40 years (0.5)', value: 0.5 },
      ]),
      yesNo('rlqPain', 'RLQ pain', 0.5),
      yesNo('migration', 'Migration of pain to RLQ', 0.5),
      yesNo('anorexia', 'Anorexia', 1),
      yesNo('nausea', 'Nausea / vomiting', 1),
      selectInput('duration', 'Duration of symptoms', [
        { label: '<48 hours (1.0)', value: 1 },
        { label: '≥48 hours (0.5)', value: 0.5 },
      ]),
      yesNo('rlqTender', 'RLQ tenderness', 1, 'Tenderness on palpation of the right lower quadrant / McBurney region.'),
      yesNo('guarding', 'Guarding', 2, 'Involuntary abdominal wall muscle contraction over the RLQ (not voluntary tensing).'),
      yesNo('rebound', 'Rebound tenderness', 1, 'Pain on sudden release of RLQ palpation (Blumberg). Distinct from Rovsing (LLQ press → RLQ pain).'),
      yesNo('rovsing', "Rovsing's sign", 2, 'Press deeply in the left lower quadrant; positive if pain is referred to the right lower quadrant.'),
      yesNo('fever', 'Fever ≥37.5°C (or >37°C per local RIPASA variant)', 1, 'Original RIPASA often used a 37–39°C band. Pick the local convention (≥37.5°C is the label default; some sites score >37°C).'),
      yesNo('wbc', 'Raised WBC', 1, 'WBC >10 ×10⁹/L (10,000/µL).'),
      yesNo('negUA', 'Negative urinalysis', 1, 'No RBCs, WBCs, or bacteria/nitrites on urinalysis (helps exclude UTI/stone as the pain source).'),
      yesNo('foreign', 'Foreign national (original score context)', 1, '+1 only in the original Brunei/Singapore derivation context. Otherwise score No.'),
    ],
    calculate(values) {
      const score = round(
        num(values.sex) +
          num(values.age) +
          (bool(values.rlqPain) ? 0.5 : 0) +
          (bool(values.migration) ? 0.5 : 0) +
          (bool(values.anorexia) ? 1 : 0) +
          (bool(values.nausea) ? 1 : 0) +
          num(values.duration) +
          (bool(values.rlqTender) ? 1 : 0) +
          (bool(values.guarding) ? 2 : 0) +
          (bool(values.rebound) ? 1 : 0) +
          (bool(values.rovsing) ? 2 : 0) +
          (bool(values.fever) ? 1 : 0) +
          (bool(values.wbc) ? 1 : 0) +
          (bool(values.negUA) ? 1 : 0) +
          (bool(values.foreign) ? 1 : 0),
        1
      );
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low probability',
          interpretation: 'RIPASA <5: appendicitis unlikely — observe / alternative workup.',
        },
        {
          max: 7.4,
          level: 'moderate',
          label: 'Intermediate',
          interpretation: 'RIPASA 5–7: intermediate — imaging recommended in most settings.',
        },
        {
          max: 12,
          level: 'high',
          label: 'Probable appendicitis',
          interpretation: 'RIPASA ≥7.5: high probability (original sensitivity-focused cutoff) — surgical evaluation ± imaging.',
        },
        {
          max: 20,
          level: 'high',
          label: 'High probability',
          interpretation: 'High RIPASA — strong clinical likelihood of appendicitis; expedite surgical care.',
        },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'RIPASA sums weighted demographics, symptoms (incl. duration), signs (guarding 2, Rovsing 2), fever, WBC, negative UA (± foreign national). Cutoff ≥7.5 commonly used.',
      validation: 'Derived in Brunei; higher sensitivity than Alvarado in some Asian cohorts; validate cutoffs locally.',
      references: [
        { title: 'Development of the RIPASA score: a new appendicitis scoring system for the diagnosis of acute appendicitis', citation: 'Chong CF et al. Singapore Med J. 2010', year: 2010, pmid: '20428744' },
      ],
    },
    nextSteps: [
      { condition: '≥7.5', actions: ['Surgical consult', 'Imaging per practice', 'NPO, fluids, analgesia'] },
      { condition: '<7.5', actions: ['Serial exams', 'Consider imaging if persistent pain', 'Gynecologic evaluation when relevant'] },
    ],
    pearls: ['"Foreign national" point is contextual to original setting — optional in non-analogous populations.', 'Half-points matter — do not round until the end.'],
  },

  {
    id: 'nafld-fibrosis',
    name: 'NAFLD Fibrosis Score',
    shortName: 'NFS',
    description: 'Noninvasive score to predict advanced fibrosis in NAFLD/MASLD.',
    category: 'gastroenterology',
    tags: ['nafld', 'masld', 'fibrosis', 'NFS'],
    whenToUse: 'Patients with NAFLD/MASLD to estimate likelihood of bridging fibrosis/cirrhosis.',
    whyUse: 'Dual cutoffs identify low- and high-risk groups and reduce unnecessary biopsy.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 50 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 70, step: 0.1, defaultValue: 32 }),
      yesNo('ifg', 'Impaired fasting glucose or diabetes', 1.1300000000000001, 'Yes if known diabetes or IFG. Original Angulo NFS: fasting glucose ≥110 mg/dL (6.1 mmol/L). ADA later IFG ≥100 mg/dL — use the local definition; diabetes always Yes.'),
      numberInput('ast', 'AST', { unit: 'U/L', min: 1, max: 2000, defaultValue: 45 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 1, max: 2000, defaultValue: 50 }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 1, max: 1000, defaultValue: 220 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 4.0 }),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const bmi = num(values.bmi, 32);
      const ifg = bool(values.ifg) ? 1 : 0;
      const ast = num(values.ast, 45);
      const alt = Math.max(num(values.alt, 50), 0.01);
      const plt = num(values.plt, 220);
      const albumin = num(values.albumin, 4);
      const nfs = round(        -1.675 + 0.037 * age + 0.094 * bmi + 1.13 * ifg + 0.99 * (ast / alt) - 0.013 * plt - 0.66 * albumin,
        3
      );

      if (nfs < -1.455) {
        return {
          score: nfs,
          label: 'Low probability advanced fibrosis (F0–F2 likely)',
          interpretation: 'NFS < −1.455: high NPV for advanced fibrosis in original NAFLD cohorts — lifestyle therapy and primary-care follow-up often appropriate.',
          riskLevel: 'low',
        };
      }
      if (nfs <= 0.676) {
        return {
          score: nfs,
          label: 'Indeterminate',
          interpretation: 'NFS −1.455 to 0.676: indeterminate — pursue elastography, ELF, or hepatology referral rather than relying on NFS alone.',
          riskLevel: 'moderate',
        };
      }
      return {
        score: nfs,
        label: 'High probability advanced fibrosis (F3–F4)',
        interpretation: 'NFS > 0.676: higher likelihood of advanced fibrosis — hepatology referral, confirm with elastography, screen for cirrhosis complications if indicated.',
        riskLevel: 'high',
      };
    },
    evidence: {
      summary:
        'NFS = −1.675 + 0.037×age + 0.094×BMI + 1.13×IFG/diabetes + 0.99×(AST/ALT) − 0.013×platelets − 0.66×albumin. Cutoffs −1.455 and 0.676.',
      formula: 'NFS = −1.675 + 0.037·age + 0.094·BMI + 1.13·IFG + 0.99·AST/ALT − 0.013·Plt − 0.66·albumin',
      validation: 'Angulo et al. derivation/validation in NAFLD; widely used in guidelines with FIB-4.',
      references: [
        { title: 'The NAFLD fibrosis score: a noninvasive system that identifies liver fibrosis in patients with NAFLD', citation: 'Angulo P et al. Hepatology. 2007', year: 2007, pmid: '17393509',
          doi: '10.1002/hep.21496', },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Weight loss, Mediterranean-style diet, exercise', 'Optimize diabetes/lipids', 'Repeat fibrosis assessment over time'] },
      { condition: 'Indeterminate/high', actions: ['VCTE or other fibrosis test', 'Hepatology referral', 'Exclude other liver disease'] },
    ],
  },

  {
    id: 'mayo-psc',
    name: 'Mayo Risk Score (PSC)',
    shortName: 'Mayo PSC',
    description: 'Revised Mayo natural history model risk score for primary sclerosing cholangitis.',
    category: 'gastroenterology',
    tags: ['PSC', 'mayo', 'cholestasis', 'prognosis', 'transplant'],
    whenToUse: 'Prognostication in PSC using age, bilirubin, AST, albumin, and history of variceal bleeding.',
    whyUse: 'Estimates relative risk of death or transplant need; complements MELD for listing decisions.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 100, defaultValue: 40 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 40, step: 0.1, defaultValue: 1.5 }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 1, max: 2000, defaultValue: 80 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 3.8 }),
      yesNo('variceal', 'History of variceal bleeding', 1.24, 'Any prior esophageal or gastric variceal bleed (not just varices on imaging).'),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const bili = Math.max(num(values.bili, 1.5), 0.01);
      const ast = Math.max(num(values.ast, 80), 0.01);
      const albumin = num(values.albumin, 3.8);
      const variceal = bool(values.variceal) ? 1 : 0;
      // Revised Mayo natural history model (Kim et al.)
      const R = round(0.03 * age + 0.54 * Math.log(bili) + 0.54 * Math.log(ast) + 1.24 * variceal - 0.84 * albumin, 3);

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      let label = 'Intermediate risk score';
      let interpretation =
        'Higher Mayo R indicates higher risk of death without transplant. Interpret continuously with clinical stage, dominant strictures, and MELD; not a listing criterion alone.';
      if (R < 0) {
        riskLevel = 'low';
        label = 'Lower risk range';
        interpretation = 'Lower Mayo risk score — relatively better short-term survival historically. Continue surveillance (cancer, dominant strictures, IBD) and cholestasis care.';
      } else if (R >= 2) {
        riskLevel = 'high';
        label = 'Higher risk range';
        interpretation = 'Elevated Mayo risk score — higher predicted mortality; ensure transplant center involvement, manage complications, optimize MELD/MELD-Na assessment.';
      }
      if (R >= 3) riskLevel = 'critical';

      return {
        score: R,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Model', value: 'Revised Mayo PSC natural history (R)' },
          { label: 'Variceal bleeding', value: variceal ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'R = 0.03×age + 0.54×ln(bili mg/dL) + 0.54×ln(AST) + 1.24×variceal bleed − 0.84×albumin (g/dL). Higher R → worse survival.',
      formula: 'R = 0.03·age + 0.54·ln(bili) + 0.54·ln(AST) + 1.24·variceal − 0.84·albumin',
      validation: 'Revised Mayo Clinic PSC natural history model; used for counseling and research risk adjustment.',
      references: [
        { title: 'A revised natural history model for primary sclerosing cholangitis', citation: 'Kim WR et al. Mayo Clin Proc. 2000', year: 2000, pmid: '10907383',
          doi: '10.4065/75.7.688', },
      ],
    },
    nextSteps: [
      { condition: 'Rising risk / decompensation', actions: ['Transplant evaluation', 'Manage dominant strictures', 'Variceal screening', 'CRC surveillance if IBD'] },
      { condition: 'Lower risk', actions: ['Specialist follow-up', 'UDCA per local practice', 'Cholangiocarcinoma vigilance'] },
    ],
    pearls: ['Bilirubin and AST use natural log — values must be >0.', 'MELD remains primary for organ allocation; Mayo PSC aids disease-specific prognosis.'],
  },

  {
    id: 'glasgow-imrie',
    name: 'Glasgow-Imrie Criteria (Pancreatitis)',
    shortName: 'Glasgow-Imrie',
    description: 'Counts prognostic factors within 48 hours to predict severe acute pancreatitis.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'glasgow', 'imrie', 'severity'],
    whenToUse: 'Acute pancreatitis severity prediction during the first 48 hours of admission.',
    whyUse: 'Simple multi-parameter count; ≥3 criteria suggests predicted severe disease and higher-level monitoring.',
    inputs: [
      yesNo('age', 'Age > 55 years'),
      yesNo('wbc', 'WBC > 15 ×10⁹/L'),
      yesNo('glucose', 'Blood glucose > 10 mmol/L (>180 mg/dL) without known diabetes'),
      yesNo('urea', 'Urea > 16 mmol/L (BUN > 45 mg/dL) after rehydration'),
      yesNo('pao2', 'PaO₂ < 60 mmHg (<8 kPa)'),
      yesNo('calcium', 'Serum calcium < 2.0 mmol/L (<8 mg/dL)'),
      yesNo('albumin', 'Albumin < 32 g/L (<3.2 g/dL)'),
      yesNo('ldh', 'LDH > 600 IU/L', 1, 'Modified Glasgow-Imrie (Blamey 8-factor) uses LDH >600 IU/L. Do not score AST here. Original 9-factor Imrie listed AST >200 U/L as a separate item.'),
    ],
    calculate(values) {
      const keys = ['age', 'wbc', 'glucose', 'urea', 'pao2', 'calcium', 'albumin', 'ldh'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 3) {
        return {
          score,
          label: 'Predicted severe',
          interpretation: `Glasgow-Imrie ${score}/8 (≥3): predicted severe acute pancreatitis — closer monitoring, early specialist input, supportive ICU-capable care as needed. Correlate with Atlanta severity as course evolves.`,
          riskLevel: 'high',
          details: [{ label: 'Criteria positive', value: `${score} of 8` }],
        };
      }
      return {
        score,
        label: 'Predicted mild',
        interpretation: `Glasgow-Imrie ${score}/8 (<3): predicted mild course, but scores can lag clinical deterioration — reassess within 48 h and use clinical judgment.`,
        riskLevel: 'low',
        details: [{ label: 'Criteria positive', value: `${score} of 8` }],
      };
    },
    evidence: {
      summary: 'PANCREAS factors: PaO₂, Age, Neutrophils(WBC), Calcium, Renal(urea), Enzymes(LDH), Albumin, Sugar. ≥3 within 48h ≈ severe.',
      formula: 'Count of positive criteria (0–8); threshold ≥3',
      validation: 'Classic UK severity score for pancreatitis; superseded in part by Atlanta organ-failure definitions but still taught/used.',
      references: [
        { title: 'Prognostic factors in acute pancreatitis', citation: 'Blamey SL et al. Gut. 1984', year: 1984, pmid: '6510766',
          doi: '10.1136/gut.25.12.1340', },
        { title: 'A single-centre double-blind trial of Trasylol therapy in primary acute pancreatitis', citation: 'Imrie CW et al. Br J Surg. 1978', year: 1978, pmid: '348250',
          doi: '10.1002/bjs.1800650514', },
      ],
    },
    nextSteps: [
      { condition: '≥3 criteria', actions: ['Higher-acuity monitoring', 'Goal-directed fluids', 'Early nutrition', 'Etiology-specific care', 'Imaging if no improvement'] },
      { condition: '<3 criteria', actions: ['Ward care if stable', 'Re-score by 48 h', 'Treat cause'] },
    ],
    pearls: ['Must be interpreted over 48 hours — early false reassurance possible.', 'Not a substitute for persistent organ-failure (Atlanta) classification.'],
  },
];
