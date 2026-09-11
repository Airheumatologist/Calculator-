import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave4PrimaryEndoCalcs: Calculator[] = [
  // ─── 1. ADA Diabetes Risk Test ─────────────────────────────────────────────
  {
    id: 'ada-diabetes-risk',
    name: 'ADA Type 2 Diabetes Risk Test',
    shortName: 'ADA Risk',
    description:
      'American Diabetes Association type 2 diabetes risk test (points-based screen for undiagnosed diabetes risk).',
    category: 'endocrinology',
    tags: ['diabetes', 'ada', 'screening', 'risk', 'type 2'],
    whenToUse: 'Adults in primary care or community settings to identify who may need glucose testing.',
    whyUse: 'Simple validated point score; higher scores warrant diagnostic testing (A1c, FPG, or OGTT).',
    inputs: [
      selectInput('age', 'Age group', [
        { label: '<40 years (0)', value: 0 },
        { label: '40–49 years (1)', value: 1 },
        { label: '50–59 years (2)', value: 2 },
        { label: '≥60 years (3)', value: 3 },
      ]),
      selectInput('sex', 'Sex', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (1)', value: 1 },
      ]),
      yesNo('gdm', 'History of gestational diabetes (women)', 1, 'Score yes only if GDM in a prior pregnancy. Men and never-pregnant patients score no.'),
      selectInput('family', 'Mother, father, sister, or brother with diabetes', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('htn', 'Diagnosed with high blood pressure or on BP meds', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('activity', 'Physically active', [
        { label: 'Yes (0)', value: 0 },
        { label: 'No (1)', value: 1 },
      ], undefined, 'ADA wording: physically active — typically regular activity most days; “No” scores +1.'),
      selectInput('weight', 'Weight category (relative to height chart / BMI bands)', [
        { label: 'Normal weight band (0)', value: 0, description: 'BMI <25, or not overweight on the official ADA height-specific lb chart' },
        { label: 'Overweight band (1)', value: 1, description: 'BMI 25–29.9 (CDC/digital ADA mapping of the paper chart)' },
        { label: 'Obese band (2)', value: 2, description: 'BMI 30–39.9' },
        { label: 'Very obese / higher band (3)', value: 3, description: 'BMI ≥40' },
      ], 1, 'Official ADA uses a height-specific lb chart (diabetes.org/diabetes/risk-test). If no chart, approximate BMI: <25 = 0; 25–29.9 = 1; 30–39.9 = 2; ≥40 = 3 (CDC/digital ADA). Do not add a separate height field.'),
    ],
    calculate(values) {
      const score =
        num(values.age, 0) +
        num(values.sex, 0) +
        (bool(values.gdm) ? 1 : 0) +
        num(values.family, 0) +
        num(values.htn, 0) +
        num(values.activity, 0) +
        num(values.weight, 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Lower risk (0–4)',
          interpretation: `Score ${score}. Lower risk on ADA test. Maintain healthy weight, activity, and periodic screening per age/risk factors.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Increased risk (≥5)',
          interpretation: `Score ${score}. Score ≥5 indicates increased risk of type 2 diabetes — recommend diagnostic testing (A1c, fasting plasma glucose, or OGTT) and lifestyle counseling.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [{ label: 'Threshold', value: '≥5 = increased risk (test for diabetes)' }],
        recommendations:
          score >= 5
            ? ['Order A1c and/or FPG (± OGTT)', 'Lifestyle: weight, diet, activity', 'Repeat testing per guidelines if negative']
            : ['Lifestyle prevention', 'Rescreen per age and risk factors'],
      };
    },
    evidence: {
      summary:
        'ADA Type 2 Diabetes Risk Test assigns points for age, sex, GDM, family history, hypertension, inactivity, and weight category. Score ≥5 suggests increased risk.',
      formula: 'Sum of item points (age 0–3, sex 0–1, GDM 0–1, family 0–1, HTN 0–1, inactive 0–1, weight 0–3)',
      validation: 'Public ADA screening tool adapted from validated risk models for community use.',
      references: [
        {
          title: 'ADA Type 2 Diabetes Risk Test',
          citation: 'American Diabetes Association. diabetes.org public screening tool',
          year: 2024,
          url: 'https://diabetes.org/diabetes/risk-test',
        },
        {
          title: 'Development and validation of a patient self-assessment score for diabetes risk',
          citation: 'Bang H et al. Ann Intern Med. 2009',
          year: 2009,
          pmid: '19949143',
          doi: '10.7326/0003-4819-151-11-200912010-00005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['Diagnostic glucose testing', 'Lifestyle intervention', 'Assess for metabolic syndrome'] },
      { condition: 'Score <5', actions: ['Preventive counseling', 'Age-appropriate rescreening'] },
    ],
    pearls: [
      'Weight points should follow the official ADA height/weight chart when available.',
      'A low score does not rule out diabetes if symptoms or other high-risk features present.',
    ],
  },

  // ─── 2. FINDRISC ───────────────────────────────────────────────────────────
  {
    id: 'findrisc',
    name: 'FINDRISC Diabetes Risk Score',
    shortName: 'FINDRISC',
    description:
      'Finnish Diabetes Risk Score (FINDRISC) estimates 10-year risk of developing type 2 diabetes.',
    category: 'endocrinology',
    tags: ['diabetes', 'findrisc', 'screening', 'risk', 'prevention'],
    whenToUse: 'Adults for opportunistic type 2 diabetes risk stratification and prevention counseling.',
    whyUse: 'Widely validated non-invasive score; high scores prompt OGTT/A1c and lifestyle programs.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<45 years (0)', value: 0 },
        { label: '45–54 years (2)', value: 2 },
        { label: '55–64 years (3)', value: 3 },
        { label: '≥65 years (4)', value: 4 },
      ]),
      selectInput('bmi', 'BMI category', [
        { label: '<25 kg/m² (0)', value: 0 },
        { label: '25–30 kg/m² (1)', value: 1 },
        { label: '>30 kg/m² (3)', value: 3 },
      ]),
      selectInput('waist', 'Waist circumference', [
        { label: 'Men <94 / Women <80 cm (0)', value: 0 },
        { label: 'Men 94–102 / Women 80–88 cm (3)', value: 3 },
        { label: 'Men >102 / Women >88 cm (4)', value: 4 },
      ], undefined, 'Measure midway between the lowest rib and iliac crest. Use sex-specific cm cutoffs as labeled.'),
      selectInput('activity', 'Daily physical activity ≥30 min', [
        { label: 'Yes (0)', value: 0, description: '≥30 min/day of physical activity, including work activity (official FINDRISC wording).' },
        { label: 'No (2)', value: 2, description: 'Less than 30 min/day of activity including work — scores +2.' },
      ], undefined, 'FINDRISC: at least 30 minutes of physical activity daily, at work or during leisure. “No” scores +2.'),
      selectInput('veg', 'Daily vegetables, fruit, or berries', [
        { label: 'Every day (0)', value: 0 },
        { label: 'Not every day (1)', value: 1 },
      ]),
      selectInput('bpMeds', 'Ever taken medication for high blood pressure', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (2)', value: 2 },
      ]),
      selectInput('highGlu', 'Ever found to have high blood glucose', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (5)', value: 5 },
      ], undefined, 'Official FINDRISC: ever found to have high blood glucose at a health examination, during an illness, or during pregnancy (includes GDM / stress hyperglycemia).'),
      selectInput('family', 'Family history of diabetes', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes — grandparent, aunt, uncle, or first cousin only (3)', value: 3 },
        { label: 'Yes — parent, brother, sister, or child (5)', value: 5 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.age, 0) +
        num(values.bmi, 0) +
        num(values.waist, 0) +
        num(values.activity, 0) +
        num(values.veg, 0) +
        num(values.bpMeds, 0) +
        num(values.highGlu, 0) +
        num(values.family, 0);
      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'low',
          label: 'Low risk (0–6)',
          interpretation: `FINDRISC ${score}. Estimated 10-year diabetes risk roughly ~1%. Reinforce healthy lifestyle.`,
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Slightly elevated (7–11)',
          interpretation: `FINDRISC ${score}. Slightly elevated risk (~4% over 10 years). Lifestyle advice; consider glucose testing if other risk factors.`,
        },
        {
          max: 14,
          level: 'moderate',
          label: 'Moderate (12–14)',
          interpretation: `FINDRISC ${score}. Moderate risk (~17%). Recommend diagnostic testing and structured lifestyle intervention.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High (15–20)',
          interpretation: `FINDRISC ${score}. High risk (~33%). Test for diabetes/prediabetes; intensive lifestyle ± prevention programs.`,
        },
        {
          max: 26,
          level: 'critical',
          label: 'Very high (21–26)',
          interpretation: `FINDRISC ${score}. Very high risk (~50%). Urgent glucose testing; intensive prevention or treat if diabetes diagnosed.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [{ label: 'Max score', value: '26' }],
      };
    },
    evidence: {
      summary:
        'FINDRISC sums age, BMI, waist, activity, diet, antihypertensive use, prior high glucose, and family history (0–26) to estimate 10-year type 2 diabetes risk.',
      formula: 'Sum of category points (max 26)',
      validation: 'Derived in Finnish cohorts; validated internationally as a non-invasive diabetes risk tool.',
      references: [
        {
          title: 'The diabetes risk score: a practical tool to predict type 2 diabetes risk',
          citation: 'Lindström J, Tuomilehto J. Diabetes Care. 2003',
          year: 2003,
          pmid: '12610029',
          doi: '10.2337/diacare.26.3.725',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥12', actions: ['A1c/FPG/OGTT', 'Weight and activity program', 'Address BP/lipids'] },
      { condition: 'Score ≥15', actions: ['Intensive lifestyle', 'Consider diabetes prevention program referral'] },
    ],
    pearls: ['Prior hyperglycemia carries the largest single weight (+5).', 'Risk % bands are approximate from original Finnish data.'],
  },

  // ─── 3. A1c / FPG / OGTT diagnostic interpreter ────────────────────────────
  {
    id: 'a1c-diagnosis',
    name: 'Diabetes Diagnostic Category (A1c/FPG/OGTT)',
    shortName: 'A1c Dx',
    description:
      'Interprets A1c, fasting plasma glucose, and/or 2-hour OGTT into normal, prediabetes, or diabetes categories (ADA).',
    category: 'endocrinology',
    tags: ['a1c', 'diabetes', 'diagnosis', 'fpg', 'ogtt', 'prediabetes'],
    whenToUse: 'When classifying glycemic status from one or more diagnostic tests.',
    whyUse: 'Aligns results with ADA diagnostic cutoffs; flags discordant tests needing confirmation.',
    inputs: [
      numberInput('a1c', 'Hemoglobin A1c (optional)', {
        unit: '%',
        min: 3,
        max: 20,
        step: 0.1,
        defaultValue: 5.7,
        helpText: 'ADA: <5.7% normal; 5.7–6.4% prediabetes; ≥6.5% diabetes. Unreliable in anemia, hemoglobinopathy, pregnancy, or recent transfusion. Leave unused tests off via the include toggle.',
        required: false,
      }),
      selectInput('useA1c', 'Include A1c in interpretation', [
        { label: 'Yes', value: 1 },
        { label: 'No', value: 0 },
      ]),
      numberInput('fpg', 'Fasting plasma glucose (optional)', {
        unit: 'mg/dL',
        min: 40,
        max: 600,
        defaultValue: 100,
        required: false,
        helpText: 'True fasting ≥8 h. ADA: <100 normal; 100–125 prediabetes; ≥126 diabetes (confirm if asymptomatic).',
      }),
      selectInput('useFpg', 'Include FPG', [
        { label: 'Yes', value: 1 },
        { label: 'No', value: 0 },
      ]),
      numberInput('ogtt', '2-hour OGTT plasma glucose (optional)', {
        unit: 'mg/dL',
        min: 40,
        max: 600,
        defaultValue: 140,
        required: false,
        helpText: '75 g oral glucose, plasma glucose at 2 h. ADA: <140 normal; 140–199 prediabetes; ≥200 diabetes.',
      }),
      selectInput('useOgtt', 'Include 2-h OGTT', [
        { label: 'Yes', value: 1 },
        { label: 'No', value: 0 },
      ]),
      yesNo('symptoms', 'Classic hyperglycemic symptoms + random glucose ≥200 mg/dL', 1, 'Classic symptoms: polyuria, polydipsia, unexplained weight loss. Random (not fasting) plasma glucose ≥200 mg/dL plus these symptoms diagnoses diabetes without a confirmatory second test.'),
    ],
    calculate(values) {
      const useA1c = num(values.useA1c, 1) === 1;
      const useFpg = num(values.useFpg, 1) === 1;
      const useOgtt = num(values.useOgtt, 1) === 1;
      const a1cProvided = !isMissingValue(values.a1c, true);
      const fpgProvided = !isMissingValue(values.fpg, true);
      const ogttProvided = !isMissingValue(values.ogtt, true);
      const a1c = num(values.a1c, 0);
      const fpg = num(values.fpg, 0);
      const ogtt = num(values.ogtt, 0);
      const symptoms = bool(values.symptoms);

      type Cat = 'normal' | 'prediabetes' | 'diabetes';
      const cats: Cat[] = [];
      const details: { label: string; value: string }[] = [];

      const catA1c = (x: number): Cat => (x >= 6.5 ? 'diabetes' : x >= 5.7 ? 'prediabetes' : 'normal');
      const catFpg = (x: number): Cat => (x >= 126 ? 'diabetes' : x >= 100 ? 'prediabetes' : 'normal');
      const catOgtt = (x: number): Cat => (x >= 200 ? 'diabetes' : x >= 140 ? 'prediabetes' : 'normal');

      if (useA1c && a1cProvided) {
        const c = catA1c(a1c);
        cats.push(c);
        details.push({ label: 'A1c', value: `${a1c}% → ${c}` });
      } else if (useA1c) {
        details.push({ label: 'A1c', value: 'Not entered — excluded from interpretation' });
      }
      if (useFpg && fpgProvided) {
        const c = catFpg(fpg);
        cats.push(c);
        details.push({ label: 'FPG', value: `${fpg} mg/dL → ${c}` });
      } else if (useFpg) {
        details.push({ label: 'FPG', value: 'Not entered — excluded from interpretation' });
      }
      if (useOgtt && ogttProvided) {
        const c = catOgtt(ogtt);
        cats.push(c);
        details.push({ label: '2-h OGTT', value: `${ogtt} mg/dL → ${c}` });
      } else if (useOgtt) {
        details.push({ label: '2-h OGTT', value: 'Not entered — excluded from interpretation' });
      }
      if (symptoms) {
        cats.push('diabetes');
        details.push({ label: 'Symptomatic hyperglycemia', value: 'Meets clinical diabetes criterion' });
      }

      const blankEnabled = [
        useA1c && !a1cProvided ? 'A1c' : null,
        useFpg && !fpgProvided ? 'FPG' : null,
        useOgtt && !ogttProvided ? '2-h OGTT' : null,
      ].filter(Boolean) as string[];

      if (cats.length === 0) {
        return {
          score: '—',
          label: blankEnabled.length ? 'No usable test values entered' : 'No tests selected',
          interpretation: blankEnabled.length
            ? `No glycemic category assigned: ${blankEnabled.join(', ')} ${blankEnabled.length === 1 ? 'is' : 'are'} enabled but left blank. Enter a value for at least one of A1c, FPG, or OGTT (or mark the symptomatic criterion).`
            : 'Enable at least one of A1c, FPG, or OGTT (or symptomatic criterion).',
          riskLevel: 'info',
          details,
        };
      }

      const rank = (c: Cat) => (c === 'diabetes' ? 2 : c === 'prediabetes' ? 1 : 0);
      const worst = cats.reduce((a, b) => (rank(b) > rank(a) ? b : a), 'normal' as Cat);
      const allSame = cats.every((c) => c === cats[0]);
      const anyDiabetes = cats.includes('diabetes');
      const anyPre = cats.includes('prediabetes');

      let label = 'Normal glycemic category';
      let interpretation = 'All selected tests in normal range by ADA cutoffs.';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'info' = 'normal';

      if (worst === 'diabetes') {
        label = anyDiabetes && !allSame ? 'Diabetes range (discordant tests)' : 'Diabetes range';
        interpretation = allSame || symptoms
          ? 'At least one result meets ADA diabetes criteria. In asymptomatic patients, confirm on a second test unless unequivocal hyperglycemia.'
          : 'At least one test in diabetes range with discordance — confirm with repeat testing on a different day (or same day different test) per ADA.';
        riskLevel = 'high';
      } else if (worst === 'prediabetes') {
        label = 'Prediabetes range';
        interpretation =
          'Result(s) in prediabetes range (A1c 5.7–6.4%, FPG 100–125, and/or 2-h OGTT 140–199 mg/dL). Counsel lifestyle; retest periodically.';
        riskLevel = 'moderate';
      }

      if (!allSame && anyPre && !anyDiabetes) {
        interpretation += ' Mild discordance among prediabetes/normal — use clinical context.';
      }

      if (blankEnabled.length) {
        interpretation += ` ${blankEnabled.join(' and ')} ${blankEnabled.length === 1 ? 'was' : 'were'} enabled but left blank, so ${blankEnabled.length === 1 ? 'it was' : 'they were'} not used — this category rests only on the values entered.`;
      }

      return {
        score: worst,
        label,
        interpretation,
        riskLevel,
        details,
        recommendations:
          worst === 'diabetes'
            ? ['Confirm diagnosis if asymptomatic', 'Baseline complications screen', 'Lifestyle + pharmacotherapy per guidelines']
            : worst === 'prediabetes'
              ? ['Intensive lifestyle', 'Consider metformin if high risk', 'Annual retesting']
              : ['Maintain healthy lifestyle', 'Screen per risk factors'],
      };
    },
    evidence: {
      summary:
        'ADA: diabetes if A1c ≥6.5%, FPG ≥126 mg/dL, 2-h OGTT ≥200 mg/dL, or random ≥200 with classic symptoms. Prediabetes: A1c 5.7–6.4%, FPG 100–125, 2-h 140–199.',
      formula: 'Category by ADA thresholds; worst category among selected tests',
      validation: 'Thresholds from ADA Standards of Care; diagnosis should be confirmed when asymptomatic.',
      references: [
        {
          title: '2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes-2024',
          citation: 'ADA Professional Practice Committee. Diabetes Care. 2024',
          year: 2024,
          pmid: '38078589',
          doi: '10.2337/dc24-S002',
        },
      ],
    },
    nextSteps: [
      { condition: 'Diabetes range', actions: ['Confirm if needed', 'Education', 'A1c target planning', 'ASCVD risk'] },
      { condition: 'Prediabetes', actions: ['DPP-style lifestyle', 'Weight loss 5–7%', 'Repeat labs'] },
    ],
    pearls: [
      'A1c may be unreliable in anemia, hemoglobinopathy, pregnancy, or recent transfusion.',
      'FPG requires true fasting; OGTT needs proper preparation.',
    ],
  },

  // ─── 4. Hypoglycemia level (ADA) ───────────────────────────────────────────
  {
    id: 'hypoglycemia-level',
    name: 'ADA Hypoglycemia Level',
    shortName: 'Hypo Level',
    description: 'Classifies hypoglycemia into ADA Level 1, 2, or 3 based on glucose and severity.',
    category: 'endocrinology',
    tags: ['hypoglycemia', 'diabetes', 'ada', 'glucose', 'insulin'],
    whenToUse: 'Documenting or triaging hypoglycemic events in people with diabetes.',
    whyUse: 'Standardized levels guide treatment intensity, education, and regimen review.',
    inputs: [
      numberInput('glucose', 'Glucose (if measured)', {
        unit: 'mg/dL',
        min: 10,
        max: 200,
        defaultValue: 65,
        helpText: 'Capillary or plasma. ADA Level 1: <70 mg/dL and ≥54; Level 2: <54 mg/dL. Level 3 is clinical (assistance needed), not a glucose cutoff.',
        required: false,
      }),
      selectInput('measured', 'Glucose measured?', [
        { label: 'Yes', value: 1 },
        { label: 'No / not available', value: 0 },
      ]),
      yesNo('severe', 'Severe cognitive impairment requiring assistance (Level 3)', 1, 'Level 3: altered mental or physical status requiring help from another person to treat (glucagon, IV dextrose, or being given carbs). Any glucose counts as Level 3.'),
      yesNo('symptoms', 'Hypoglycemic symptoms present', 0, 'Adrenergic or neuroglycopenic symptoms (sweat, tremor, palpitations, confusion, hunger). Supportive, but Level 1–2 are defined by glucose; Level 3 by assistance.'),
    ],
    calculate(values) {
      const glucoseProvided = !isMissingValue(values.glucose, true);
      const g = num(values.glucose, 0);
      const measured = num(values.measured, 1) === 1 && glucoseProvided;
      const severe = bool(values.severe);
      const symptoms = bool(values.symptoms);

      if (severe) {
        return {
          score: 3,
          unit: 'level',
          label: 'Level 3 hypoglycemia',
          interpretation:
            'Level 3: severe event characterized by altered mental/physical status requiring assistance for treatment, regardless of glucose value. Urgent evaluation of causes and regimen.',
          riskLevel: 'critical',
          details: [
            { label: 'Glucose', value: measured ? `${g} mg/dL` : glucoseProvided ? 'Not measured' : 'Not entered' },
            { label: 'Symptoms', value: symptoms ? 'Yes' : 'No / unknown' },
          ],
          recommendations: [
            'Treat immediately (glucagon if unable to take PO; IV dextrose if available)',
            'Identify precipitant (insulin/SU dose, missed meals, exercise, illness)',
            'De-intensify therapy; prescribe glucagon; education',
          ],
        };
      }

      if (!measured) {
        const selectedMeasured = num(values.measured, 1) === 1;
        return {
          score: '—',
          label: selectedMeasured && !glucoseProvided ? 'Unclassified (glucose value blank)' : 'Unclassified (no glucose, not Level 3)',
          interpretation: selectedMeasured && !glucoseProvided
            ? 'Glucose is marked as measured but the value is blank, so no ADA level was assigned. Enter the glucose value, or mark it as not available. Treat symptomatic suspected hypoglycemia while measuring.'
            : 'Without a measured glucose and without Level 3 criteria, formal ADA level cannot be assigned. Treat symptomatic suspected hypo and measure glucose when possible.',
          riskLevel: 'info',
        };
      }

      if (g < 54) {
        return {
          score: 2,
          unit: 'level',
          label: 'Level 2 hypoglycemia',
          interpretation: `Glucose ${g} mg/dL (<54). Level 2 (clinically significant) — associated with impaired awareness risk and serious outcomes; requires prompt treatment and regimen review.`,
          riskLevel: 'high',
          details: [{ label: 'Threshold', value: '<54 mg/dL' }],
          recommendations: ['15–20 g fast carbs; recheck 15 min', 'Review insulin/secretagogue', 'Consider CGM / awareness training'],
        };
      }

      if (g < 70) {
        return {
          score: 1,
          unit: 'level',
          label: 'Level 1 hypoglycemia',
          interpretation: `Glucose ${g} mg/dL (54–69). Level 1 — glucose alert value; treat and address pattern even if mild or asymptomatic.`,
          riskLevel: 'moderate',
          details: [{ label: 'Threshold', value: '<70 mg/dL and ≥54' }],
          recommendations: ['Treat with fast-acting carbohydrate', 'Pattern review if recurrent'],
        };
      }

      return {
        score: 0,
        unit: 'level',
        label: 'Not hypoglycemia by glucose',
        interpretation: `Glucose ${g} mg/dL is ≥70 mg/dL. Not Level 1–2 by ADA glucose cutoffs. If symptoms only, consider other causes or relative drop from higher baseline.`,
        riskLevel: 'normal',
      };
    },
    evidence: {
      summary:
        'ADA: Level 1 = glucose <70 mg/dL; Level 2 = <54 mg/dL; Level 3 = severe event requiring assistance for recovery (any glucose).',
      formula: 'Level 3 if assistance needed; else Level 2 if <54; Level 1 if <70',
      validation: 'International Hypoglycaemia Study Group / ADA consensus levels used in Standards of Care.',
      references: [
        {
          title: 'Glucose Concentrations of Less Than 3.0 mmol/L (54 mg/dL)',
          citation: 'International Hypoglycaemia Study Group. Diabetes Care. 2017',
          year: 2017,
          pmid: '27872155',
          doi: '10.2337/dc16-2215',
        },
        {
          title: '6. Glycemic Goals and Hypoglycemia: Standards of Care in Diabetes-2024',
          citation: 'ADA Professional Practice Committee. Diabetes Care. 2024',
          year: 2024,
          pmid: '38078586',
          doi: '10.2337/dc24-S006',
        },
      ],
    },
    nextSteps: [
      { condition: 'Level 2–3', actions: ['Regimen de-intensification', 'Glucagon access', 'Driving safety counseling'] },
      { condition: 'Recurrent Level 1', actions: ['Pattern analysis', 'Meal timing', 'Consider CGM'] },
    ],
    pearls: ['Level 3 is defined by clinical severity, not a glucose number.', 'Treat first; classify after.'],
  },

  // ─── 5. Insulin sensitivity factor ─────────────────────────────────────────
  {
    id: 'insulin-sensitivity-factor',
    name: 'Insulin Sensitivity Factor (Rule of 1800/1500)',
    shortName: 'ISF',
    description:
      'Estimates insulin sensitivity factor (correction factor): how much 1 unit of rapid- or short-acting insulin lowers glucose.',
    category: 'endocrinology',
    tags: ['insulin', 'isf', 'correction', 'diabetes', '1800 rule'],
    whenToUse: 'Initial estimate of correction factor when designing or revising a basal–bolus plan.',
    whyUse: 'Rule-of-thumb from total daily dose; must be individualized with SMBG/CGM.',
    inputs: [
      numberInput('tdd', 'Total daily insulin dose (TDD)', {
        unit: 'units/day',
        min: 5,
        max: 300,
        defaultValue: 40,
      }),
      selectInput('rule', 'Rule', [
        { label: '1800 rule (rapid-acting analog)', value: 1800 },
        { label: '1500 rule (regular insulin)', value: 1500 },
      ]),
    ],
    calculate(values) {
      const tdd = num(values.tdd, 40);
      const rule = num(values.rule, 1800);
      if (tdd <= 0) {
        return {
          score: '—',
          label: 'Invalid TDD',
          interpretation: 'Enter a positive total daily insulin dose.',
          riskLevel: 'info',
        };
      }
      const isf = round(rule / tdd, 0);
      return {
        score: isf,
        unit: 'mg/dL per unit',
        label: `ISF ≈ ${isf} mg/dL per unit`,
        interpretation: `Using rule of ${rule}: 1 unit of ${rule === 1800 ? 'rapid-acting' : 'regular'} insulin is estimated to lower glucose by ~${isf} mg/dL. Validate and adjust with glucose data; high-risk if overestimated sensitivity.`,
        riskLevel: 'info',
        details: [
          { label: 'TDD', value: `${tdd} units/day` },
          { label: 'Rule', value: String(rule) },
          { label: 'Formula', value: `ISF = ${rule} ÷ TDD` },
        ],
        recommendations: [
          'Start conservatively if uncertain',
          'Recheck correction 2–4 h later',
          'Account for IOB / stacking',
        ],
      };
    },
    evidence: {
      summary: 'Common teaching: ISF ≈ 1800/TDD (analog) or 1500/TDD (regular), in mg/dL per unit.',
      formula: 'ISF (mg/dL per unit) = 1800 (or 1500) / TDD',
      validation: 'Clinical rule of thumb; not a substitute for supervised titration.',
      references: [
        {
          title: 'Analysis of guidelines for basal-bolus insulin dosing: basal insulin, correction factor, and carbohydrate-to-insulin ratio',
          citation: 'Davidson PC et al. Endocr Pract. 2008',
          year: 2008,
          pmid: '19158048',
          doi: '10.4158/EP.14.9.1095',
        },
      ],
    },
    nextSteps: [
      { condition: 'New ISF estimate', actions: ['Pair with ICR', 'Educate on hypo risk', 'Follow-up CGM/SMBG review'] },
    ],
    pearls: ['Renal failure, exercise, and steroids change sensitivity.', 'Never stack corrections without IOB accounting.'],
  },

  // ─── 6. Carb ratio (500 rule) ──────────────────────────────────────────────
  {
    id: 'carb-ratio',
    name: 'Insulin-to-Carb Ratio (Rule of 500)',
    shortName: 'ICR',
    description: 'Estimates insulin-to-carbohydrate ratio (ICR) from total daily insulin using the 500 rule.',
    category: 'endocrinology',
    tags: ['insulin', 'carb ratio', 'icr', '500 rule', 'bolus'],
    whenToUse: 'Estimating grams of carbohydrate covered by 1 unit of mealtime insulin.',
    whyUse: 'Starting point for carbohydrate counting regimens; refine with postprandial data.',
    inputs: [
      numberInput('tdd', 'Total daily insulin dose (TDD)', {
        unit: 'units/day',
        min: 5,
        max: 300,
        defaultValue: 40,
      }),
      selectInput('rule', 'Rule constant', [
        { label: '500 rule (common analog starting point)', value: 500 },
        { label: '450 rule (more aggressive / some regular insulin teaching)', value: 450 },
      ]),
    ],
    calculate(values) {
      const tdd = num(values.tdd, 40);
      const rule = num(values.rule, 500);
      if (tdd <= 0) {
        return {
          score: '—',
          label: 'Invalid TDD',
          interpretation: 'Enter a positive TDD.',
          riskLevel: 'info',
        };
      }
      const icr = round(rule / tdd, 1);
      return {
        score: icr,
        unit: 'g carb / unit',
        label: `ICR ≈ 1 unit per ${icr} g carb`,
        interpretation: `Rule of ${rule}: approximately 1 unit covers ${icr} g carbohydrate. Meal boluses = carbs ÷ ICR. Individualize by meal and verify with 2–3 h postprandial glucose.`,
        riskLevel: 'info',
        details: [
          { label: 'TDD', value: `${tdd} units` },
          { label: 'Formula', value: `ICR = ${rule} ÷ TDD` },
        ],
      };
    },
    evidence: {
      summary: 'ICR (g carbohydrate per unit) ≈ 500/TDD (or 450/TDD in some teaching).',
      formula: 'ICR = 500 (or 450) / TDD',
      validation: 'Educational estimate only; wide inter-individual variation.',
      references: [
        {
          title: 'Analysis of guidelines for basal-bolus insulin dosing: basal insulin, correction factor, and carbohydrate-to-insulin ratio',
          citation: 'Davidson PC et al. Endocr Pract. 2008',
          year: 2008,
          pmid: '19158048',
          doi: '10.4158/EP.14.9.1095',
        },
      ],
    },
    nextSteps: [
      { condition: 'Postprandial highs', actions: ['Lower ICR number carefully', 'Review carb counting accuracy', 'Check basal adequacy'] },
      { condition: 'Postprandial lows', actions: ['Raise ICR (fewer units per carb)', 'Review prebolus timing'] },
    ],
    pearls: ['Breakfast often needs a stronger ratio (lower g/unit).', 'High-fat/protein meals may need extended boluses.'],
  },

  // ─── 7. Correction dose insulin ────────────────────────────────────────────
  {
    id: 'correction-dose-insulin',
    name: 'Insulin Correction Dose',
    shortName: 'Correction',
    description: 'Calculates correction (sensitivity) insulin dose: (current BG − target) / ISF.',
    category: 'endocrinology',
    tags: ['insulin', 'correction', 'bolus', 'diabetes'],
    whenToUse: 'Estimating units of rapid-acting insulin to correct hyperglycemia above target.',
    whyUse: 'Standard formula for correction boluses; combine carefully with meal bolus and IOB.',
    inputs: [
      numberInput('bg', 'Current glucose', { unit: 'mg/dL', min: 40, max: 600, defaultValue: 250 }),
      numberInput('target', 'Target glucose', { unit: 'mg/dL', min: 80, max: 180, defaultValue: 120 }),
      numberInput('isf', 'Insulin sensitivity factor', {
        unit: 'mg/dL per unit',
        min: 5,
        max: 150,
        defaultValue: 40,
        helpText: 'mg/dL drop expected per 1 unit',
      }),
      numberInput('iob', 'Insulin on board (optional subtract)', {
        unit: 'units',
        min: 0,
        max: 50,
        step: 0.1,
        defaultValue: 0,
        required: false,
      }),
    ],
    calculate(values) {
      const bg = num(values.bg, 250);
      const target = num(values.target, 120);
      const isf = num(values.isf, 40);
      const iob = num(values.iob, 0);
      if (isf <= 0) {
        return { score: '—', label: 'Invalid ISF', interpretation: 'ISF must be >0.', riskLevel: 'info' };
      }
      if (bg <= target) {
        return {
          score: 0,
          unit: 'units',
          label: 'No correction needed',
          interpretation: `BG ${bg} ≤ target ${target}. Correction dose 0. Do not give correction insulin for hypoglycemia.`,
          riskLevel: bg < 70 ? 'high' : 'normal',
          recommendations: bg < 70 ? ['Treat hypoglycemia first'] : undefined,
        };
      }
      const raw = (bg - target) / isf;
      const afterIob = Math.max(0, raw - iob);
      const dose = round(afterIob, 1);
      return {
        score: dose,
        unit: 'units',
        label: `Correction ≈ ${dose} units`,
        interpretation: `Raw correction ${(raw).toFixed(1)} units = (${bg}−${target})/${isf}. After subtracting IOB ${iob} U → ${dose} U. Round to deliverable increments; avoid stacking.`,
        riskLevel: dose >= 8 ? 'high' : dose >= 4 ? 'moderate' : 'info',
        details: [
          { label: 'Raw correction', value: `${round(raw, 2)} U` },
          { label: 'IOB subtracted', value: `${iob} U` },
          { label: 'Suggested dose', value: `${dose} U` },
        ],
        recommendations: [
          'Add meal bolus separately if eating',
          'Recheck glucose; rule out ketones if BG high and unwell',
          'Seek care for persistent severe hyperglycemia / DKA symptoms',
        ],
      };
    },
    evidence: {
      summary: 'Correction dose (units) = (current glucose − target) / ISF; subtract active insulin on board when known.',
      formula: 'Dose = max(0, (BG − target)/ISF − IOB)',
      validation: 'Standard pump/MDI teaching formula; always individualize.',
      references: [
        {
          title: 'Analysis of guidelines for basal-bolus insulin dosing: basal insulin, correction factor, and carbohydrate-to-insulin ratio',
          citation: 'Davidson PC et al. Endocr Pract. 2008',
          year: 2008,
          pmid: '19158048',
          doi: '10.4158/EP.14.9.1095',
        },
      ],
    },
    nextSteps: [
      { condition: 'Large correction frequently needed', actions: ['Review basal and ICR', 'Check for illness, steroids, pump failure'] },
    ],
    pearls: ['If ketones present, follow sick-day/DKA protocols — simple correction may be inadequate.', 'Round down if uncertain.'],
  },

  // ─── 8. Total daily insulin ────────────────────────────────────────────────
  {
    id: 'total-daily-insulin',
    name: 'Weight-Based Total Daily Insulin Estimate',
    shortName: 'TDD Est',
    description: 'Estimates total daily insulin (TDD) from body weight and clinical factors (type 1 / type 2 ranges).',
    category: 'endocrinology',
    tags: ['insulin', 'tdd', 'dosing', 'diabetes', 'weight-based'],
    whenToUse: 'Rough starting TDD estimate for insulin-naive or regimen redesign (supervised).',
    whyUse: 'Weight-based ranges provide a safe starting framework before titration.',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 250, defaultValue: 70 }),
      selectInput('factor', 'Units per kg per day', [
        { label: '0.3 U/kg (insulin-sensitive / new T1D honeymoon / elderly frail)', value: 0.3 },
        { label: '0.4 U/kg (conservative type 1 start)', value: 0.4 },
        { label: '0.5 U/kg (typical type 1 estimate)', value: 0.5 },
        { label: '0.6 U/kg (somewhat resistant)', value: 0.6 },
        { label: '0.8 U/kg (insulin resistant / many type 2)', value: 0.8 },
        { label: '1.0 U/kg (high resistance)', value: 1.0 },
      ], 0.5),
      yesNo('ketosis', 'Active ketosis / high A1c marked glucotoxicity (use caution)', 0),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const factor = num(values.factor, 0.5);
      const tdd = round(wt * factor, 1);
      const basal = round(tdd * 0.5, 1);
      const bolus = round(tdd - basal, 1);
      return {
        score: tdd,
        unit: 'units/day',
        label: `Estimated TDD ≈ ${tdd} U/day`,
        interpretation: `Weight ${wt} kg × ${factor} U/kg ≈ ${tdd} U/day. Educational starting estimate only — initiate lower if hypo risk high; titrate with glucose data. ${bool(values.ketosis) ? 'Ketosis/glucotoxicity: needs supervised acute management, not outpatient estimate alone.' : ''}`,
        riskLevel: bool(values.ketosis) ? 'high' : 'info',
        details: [
          { label: 'Factor', value: `${factor} U/kg/day` },
          { label: 'Example 50/50 basal', value: `${basal} U` },
          { label: 'Example 50/50 bolus total', value: `${bolus} U` },
        ],
        recommendations: [
          'Confirm indication and type of diabetes',
          'Start basal ± bolus per protocol',
          'Educate on hypo recognition',
        ],
      };
    },
    evidence: {
      summary: 'Typical TDD estimates ~0.4–1.0 units/kg/day depending on type, age, resistance, and residual insulin.',
      formula: 'TDD ≈ weight(kg) × factor (U/kg/day)',
      validation: 'Common clinical teaching ranges; actual requirements vary widely.',
      references: [
        {
          title: 'Pharmacologic Approaches to Glycemic Treatment: Standards of Care',
          citation: 'ADA. Diabetes Care',
          year: 2024,
          pmid: '38078590',
          doi: '10.2337/dc24-S009',
        },
      ],
    },
    nextSteps: [
      { condition: 'New insulin start', actions: ['Choose regimen', 'SMBG/CGM plan', 'Follow-up titration in days'] },
    ],
    pearls: ['Puberty, steroids, infection, and obesity raise requirements.', 'CKD and low BMI lower requirements.'],
  },

  // ─── 9. Basal-bolus split ──────────────────────────────────────────────────
  {
    id: 'basal-bolus-split',
    name: 'Basal–Bolus Split from TDD',
    shortName: 'Basal/Bolus',
    description: 'Splits total daily insulin into basal and bolus portions (default 50/50) with optional custom basal fraction.',
    category: 'endocrinology',
    tags: ['insulin', 'basal', 'bolus', 'tdd', 'mdi'],
    whenToUse: 'Designing MDI or reviewing pump basal total from known TDD.',
    whyUse: 'Classic 50/50 starting split; adjustable for dawn phenomenon or high carb intake.',
    inputs: [
      numberInput('tdd', 'Total daily insulin', { unit: 'units', min: 5, max: 400, defaultValue: 40 }),
      numberInput('basalPct', 'Basal percentage', {
        unit: '%',
        min: 30,
        max: 70,
        defaultValue: 50,
        helpText: 'Typical start 40–50%',
      }),
      numberInput('meals', 'Number of meal boluses to split prandial insulin', {
        min: 1,
        max: 6,
        defaultValue: 3,
      }),
    ],
    calculate(values) {
      const tdd = num(values.tdd, 40);
      const basalPct = num(values.basalPct, 50);
      const meals = Math.max(1, num(values.meals, 3));
      const basal = round((tdd * basalPct) / 100, 1);
      const bolusTotal = round(tdd - basal, 1);
      const perMeal = round(bolusTotal / meals, 1);
      return {
        score: basal,
        unit: 'U basal',
        label: `Basal ${basal} U / Bolus ${bolusTotal} U`,
        interpretation: `From TDD ${tdd} U with ${basalPct}% basal: basal ${basal} U/day, prandial total ${bolusTotal} U (~${perMeal} U × ${meals} meals if evenly split). Prefer ICR-based meal dosing when counting carbs.`,
        riskLevel: 'info',
        details: [
          { label: 'Basal', value: `${basal} U (${basalPct}%)` },
          { label: 'Bolus total', value: `${bolusTotal} U (${100 - basalPct}%)` },
          { label: 'Even per-meal estimate', value: `${perMeal} U × ${meals}` },
        ],
      };
    },
    evidence: {
      summary: 'Many MDI starts allocate ~40–50% of TDD as basal and the remainder as prandial/correction.',
      formula: 'Basal = TDD × basal%; Bolus total = TDD − basal',
      validation: 'Educational starting framework; CGM-guided titration preferred.',
      references: [
        {
          title: '9. Pharmacologic Approaches to Glycemic Treatment: Standards of Care in Diabetes-2024',
          citation: 'ADA Professional Practice Committee. Diabetes Care. 2024',
          year: 2024,
          pmid: '38078590',
          doi: '10.2337/dc24-S009',
        },
      ],
    },
    nextSteps: [
      { condition: 'Fasting highs', actions: ['Review basal', 'Dawn phenomenon evaluation'] },
      { condition: 'Postprandial highs', actions: ['Increase prandial share or strengthen ICR'] },
    ],
    pearls: ['Pump basal % often lower than MDI.', 'Never copy estimates into pumps without clinician review.'],
  },

  // ─── 10. Steroid hyperglycemia ─────────────────────────────────────────────
  {
    id: 'steroid-hyperglycemia',
    name: 'Steroid Hyperglycemia Risk / Expected Rise Helper',
    shortName: 'Steroid BG',
    description:
      'Educational helper for glucocorticoid-associated hyperglycemia: relative potency, dose, and expected glucose impact notes.',
    category: 'endocrinology',
    tags: ['steroid', 'glucocorticoid', 'hyperglycemia', 'diabetes', 'stress dose'],
    whenToUse: 'Patients starting or escalating systemic glucocorticoids, with or without known diabetes.',
    whyUse: 'Steroids raise postprandial glucose disproportionately; anticipatory monitoring and treatment planning reduce complications.',
    inputs: [
      selectInput('steroid', 'Glucocorticoid', [
        { label: 'Prednisone / prednisolone', value: 'pred', description: 'Relative potency 1 (reference). Morning daily dose peaks afternoon/evening glucose.' },
        { label: 'Methylprednisolone', value: 'mp', description: '≈1.25× prednisone-equivalent (4 mg MP ≈ 5 mg prednisone).' },
        { label: 'Dexamethasone', value: 'dex', description: '≈6.25× prednisone-equivalent (0.75 mg dex ≈ 5 mg prednisone). Long-acting; hyperglycemia can last >24 h.' },
        { label: 'Hydrocortisone', value: 'hc', description: '≈0.25× prednisone-equivalent (20 mg HC ≈ 5 mg prednisone).' },
      ], undefined, 'Converts to prednisone-equivalent for educational glycemic-risk banding. Does not output an insulin dose.'),
      numberInput('dose', 'Daily dose', { unit: 'mg', min: 1, max: 500, defaultValue: 40, helpText: 'Total daily milligrams of the selected steroid (not prednisone-equivalent — conversion is applied).' }),
      selectInput('diabetes', 'Diabetes status', [
        { label: 'No known diabetes', value: 'none' },
        { label: 'Prediabetes', value: 'pre' },
        { label: 'Type 2 diabetes', value: 't2' },
        { label: 'Type 1 / insulin-deficient', value: 't1' },
      ]),
      selectInput('timing', 'Dosing schedule', [
        { label: 'Once daily morning', value: 'am' },
        { label: 'Divided / evening dose', value: 'div' },
        { label: 'Continuous / high-dose multi-day', value: 'cont' },
      ]),
    ],
    calculate(values) {
      const steroid = String(values.steroid ?? 'pred');
      const dose = num(values.dose, 40);
      const diabetes = String(values.diabetes ?? 'none');
      const timing = String(values.timing ?? 'am');

      // Approximate prednisone-equivalent
      const factor: Record<string, number> = { pred: 1, mp: 1.25, dex: 6.25, hc: 0.25 };
      const pe = round(dose * (factor[steroid] ?? 1), 1);

      let intensity = 'low–moderate';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      if (pe < 10) {
        intensity = 'low';
        riskLevel = 'low';
      } else if (pe < 40) {
        intensity = 'moderate';
        riskLevel = 'moderate';
      } else if (pe < 80) {
        intensity = 'high';
        riskLevel = 'high';
      } else {
        intensity = 'very high';
        riskLevel = 'critical';
      }

      if (diabetes === 't1' || diabetes === 't2') {
        if (riskLevel === 'low') riskLevel = 'moderate';
        else if (riskLevel === 'moderate') riskLevel = 'high';
        else riskLevel = 'critical';
      } else if (diabetes === 'pre' && riskLevel === 'low') {
        riskLevel = 'moderate';
      }

      const riseNote =
        pe >= 40
          ? 'Often substantial rise in postprandial glucose (commonly tens of mg/dL or more; highly variable).'
          : pe >= 10
            ? 'Mild-to-moderate postprandial rise expected; monitor closely if diabetes risk high.'
            : 'Smaller glycemic effect possible; still monitor if known diabetes.';

      const scheduleNote =
        timing === 'am'
          ? 'Morning daily steroids: peak effect often afternoon/evening — emphasize post-lunch/dinner checks.'
          : timing === 'div'
            ? 'Divided/evening dosing prolongs hyperglycemia overnight; basal insulin may need attention.'
            : 'Sustained high exposure: expect multi-day hyperglycemia; inpatient protocols often needed.';

      return {
        score: pe,
        unit: 'mg pred-eq',
        label: `${intensity} steroid glycemic risk`,
        interpretation: `≈${pe} mg prednisone-equivalent/day. ${riseNote} ${scheduleNote} Not a precise glucose predictor — individual responses vary.`,
        riskLevel,
        details: [
          { label: 'Prednisone-equivalent', value: `${pe} mg/day` },
          { label: 'Diabetes status', value: diabetes },
          { label: 'Schedule', value: timing },
        ],
        recommendations: [
          'Monitor fasting and postprandial glucose (or CGM)',
          'Prefer prandial coverage adjustments for daytime steroids',
          'Hold or reduce correction stacking; sick-day education',
          'Screen for new diabetes after prolonged courses',
        ],
      };
    },
    evidence: {
      summary:
        'Glucocorticoids increase hepatic glucose output and insulin resistance, especially postprandial. Higher prednisone-equivalent doses raise hyperglycemia risk.',
      formula: 'Pred-eq ≈ dose × relative potency; risk bands educational',
      validation: 'Qualitative clinical helper; potency conversions approximate.',
      references: [
        {
          title: 'Management of hyperglycaemia and steroid (glucocorticoid) therapy: a guideline from the Joint British Diabetes Societies (JBDS) for Inpatient Care group',
          citation: 'Roberts A et al. Diabet Med. 2018',
          year: 2018,
          pmid: '30152586',
          doi: '10.1111/dme.13675',
        },
      ],
    },
    nextSteps: [
      { condition: 'Known diabetes on steroids', actions: ['Increase monitoring', 'Adjust prandial/basal per protocol', 'Endocrine if severe'] },
      { condition: 'No diabetes, high dose', actions: ['Periodic glucose checks', 'Educate on symptoms'] },
    ],
    pearls: [
      'Dexamethasone is long-acting with prolonged hyperglycemic effect.',
      'NPH timed with morning prednisone is a classic prandial-steroid strategy in some protocols.',
    ],
  },

  // ─── 11. Thyroid function pattern ──────────────────────────────────────────
  {
    id: 'thyroid-function-pattern',
    name: 'Thyroid Function Pattern Interpreter',
    shortName: 'TFT Pattern',
    description:
      'Interprets TSH ± free T4 pattern into common categories (primary hypo/hyper, central, subclinical, sick euthyroid helper).',
    category: 'endocrinology',
    tags: ['thyroid', 'tsh', 'ft4', 'hypothyroid', 'hyperthyroid'],
    whenToUse: 'When TSH and free T4 are available and a pattern-based differential is needed.',
    whyUse: 'Rapid pattern recognition guides next labs (T3, antibodies, imaging, pituitary workup).',
    inputs: [
      numberInput('tsh', 'TSH', { unit: 'mIU/L', min: 0, max: 200, step: 0.01, defaultValue: 2.5 }),
      numberInput('ft4', 'Free T4', {
        unit: 'ng/dL',
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 1.2,
        helpText: 'Use lab-specific reference; defaults assume ~0.8–1.8 ng/dL',
      }),
      numberInput('tshLow', 'TSH lower ref limit', { unit: 'mIU/L', min: 0.01, max: 1, step: 0.01, defaultValue: 0.4 }),
      numberInput('tshHigh', 'TSH upper ref limit', { unit: 'mIU/L', min: 2, max: 10, step: 0.1, defaultValue: 4.5 }),
      numberInput('ft4Low', 'FT4 lower ref limit', { unit: 'ng/dL', min: 0.3, max: 1.2, step: 0.1, defaultValue: 0.8 }),
      numberInput('ft4High', 'FT4 upper ref limit', { unit: 'ng/dL', min: 1.2, max: 3, step: 0.1, defaultValue: 1.8 }),
      yesNo('ill', 'Acute non-thyroidal illness (sick euthyroid context)', 0),
    ],
    calculate(values) {
      const tsh = num(values.tsh, 2.5);
      const ft4 = num(values.ft4, 1.2);
      const tshL = num(values.tshLow, 0.4);
      const tshH = num(values.tshHigh, 4.5);
      const ft4L = num(values.ft4Low, 0.8);
      const ft4H = num(values.ft4High, 1.8);
      const ill = bool(values.ill);

      const tshLow = tsh < tshL;
      const tshHigh = tsh > tshH;
      const tshN = !tshLow && !tshHigh;
      const ft4Low = ft4 < ft4L;
      const ft4High = ft4 > ft4H;
      const ft4N = !ft4Low && !ft4High;

      let label = 'Euthyroid pattern';
      let interpretation = 'TSH and free T4 within entered reference ranges.';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'info' = 'normal';

      if (tshHigh && ft4Low) {
        label = 'Primary hypothyroidism';
        interpretation = 'High TSH + low FT4 suggests primary hypothyroidism. Consider TPO Abs, symptoms, and replacement.';
        riskLevel = 'high';
      } else if (tshHigh && ft4N) {
        label = 'Subclinical hypothyroidism';
        interpretation = 'High TSH + normal FT4. Confirm persistence; treat based on TSH level, antibodies, symptoms, pregnancy plans.';
        riskLevel = tsh >= 10 ? 'high' : 'moderate';
      } else if (tshLow && ft4High) {
        label = 'Primary hyperthyroidism';
        interpretation = 'Low TSH + high FT4 suggests thyrotoxicosis (Graves, toxic nodule, thyroiditis, exogenous). Add T3, Abs, uptake as indicated.';
        riskLevel = 'high';
      } else if (tshLow && ft4N) {
        label = 'Subclinical hyperthyroidism';
        interpretation = 'Low TSH + normal FT4. Confirm; assess T3, cardiac risk, bone risk, and etiology.';
        riskLevel = 'moderate';
      } else if (tshLow && ft4Low) {
        label = 'Central hypothyroidism (or non-thyroidal illness)';
        interpretation =
          'Low/normal-low TSH with low FT4 raises concern for central hypothyroidism (pituitary/hypothalamic) or severe non-thyroidal illness. Do not start T4 without evaluating cortisol if hypopituitarism possible.';
        riskLevel = 'high';
      } else if (tshN && ft4Low) {
        label = 'Central hypo vs assay/illness';
        interpretation = 'Normal TSH + low FT4 can reflect central hypothyroidism, assay issues, or illness — correlate clinically.';
        riskLevel = 'moderate';
      } else if (tshN && ft4High) {
        label = 'FT4 high, TSH normal';
        interpretation = 'Consider assay interference, thyroid hormone resistance, early autonomous function, or med effects. Repeat labs.';
        riskLevel = 'moderate';
      } else if (tshHigh && ft4High) {
        label = 'TSH resistance / TSHoma / lab error';
        interpretation = 'High TSH + high FT4 is uncommon — consider TSH-secreting adenoma, thyroid hormone resistance, or lab interference.';
        riskLevel = 'high';
      }

      if (ill && (tshLow || ft4Low || ft4High)) {
        interpretation +=
          ' Concurrent non-thyroidal illness: sick euthyroid (NTIS) patterns (low T3, variable T4/TSH) are common — avoid routine thyroid treatment based on single sick labs when possible.';
        if (riskLevel === 'normal') riskLevel = 'info';
      }

      return {
        score: `${round(tsh, 2)} / ${round(ft4, 2)}`,
        unit: 'TSH / FT4',
        label,
        interpretation: ill
          ? interpretation + (interpretation.includes('non-thyroidal illness')
            ? ''
            : ' Non-thyroidal illness context selected — interpret with caution for NTIS.')
          : interpretation,
        riskLevel,
        details: [
          { label: 'TSH', value: `${tsh} (ref ${tshL}–${tshH})` },
          { label: 'Free T4', value: `${ft4} (ref ${ft4L}–${ft4H})` },
          { label: 'Non-thyroidal illness context', value: ill ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Classic patterns: high TSH+low FT4 = primary hypo; low TSH+high FT4 = primary hyper; low TSH+low FT4 suggests central disease or illness.',
      formula: 'Pattern match vs user-entered reference limits',
      validation: 'Educational pattern helper; always use laboratory reference ranges and clinical context.',
      references: [
        {
          title: 'ATA Guidelines for Hypothyroidism in Adults',
          citation: 'Garber JR et al. Thyroid. 2012',
          year: 2012,
          pmid: '22954017',
          doi: '10.1089/thy.2012.0205',
        },
        {
          title: 'Hyperthyroidism and Other Causes of Thyrotoxicosis: ATA Guidelines',
          citation: 'Ross DS et al. Thyroid. 2016',
          year: 2016,
          pmid: '27521067',
          doi: '10.1089/thy.2016.0229',
        },
      ],
    },
    nextSteps: [
      { condition: 'Primary hypo', actions: ['TPO Abs', 'Levothyroxine if indicated', 'Dose by weight/age'] },
      { condition: 'Thyrotoxic pattern', actions: ['T3, TRAb/TSI', 'Beta-blocker if symptomatic', 'Endocrine referral'] },
      { condition: 'Central pattern', actions: ['Pituitary panel', 'MRI if indicated', 'Do not miss adrenal insufficiency'] },
    ],
    pearls: ['Biotin can interfere with some immunoassays.', 'Pregnancy reference ranges differ.'],
  },

  // ─── 12. Levothyroxine dose ────────────────────────────────────────────────
  {
    id: 'levothyroxine-dose',
    name: 'Levothyroxine Dose Estimate (Adult)',
    shortName: 'T4 Dose',
    description: 'Weight-based full replacement levothyroxine estimate for adults with primary hypothyroidism.',
    category: 'endocrinology',
    tags: ['levothyroxine', 'thyroid', 'hypothyroid', 'dosing'],
    whenToUse: 'Estimating full replacement dose in adults; use lower starts in elderly or cardiac disease.',
    whyUse: '≈1.6 µg/kg body weight is a common full-replacement starting estimate in healthy adults (often IBW in obesity).',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 30, max: 200, defaultValue: 70 }),
      selectInput('approach', 'Dosing approach', [
        { label: 'Full replacement ~1.6 µg/kg (healthy adult)', value: 1.6 },
        { label: 'Conservative ~1.0 µg/kg', value: 1.0 },
        { label: 'Partial / residual function ~0.5 µg/kg start estimate', value: 0.5 },
      ]),
      selectInput('risk', 'Cardiac / elderly caution', [
        { label: 'No — candidate for full replacement estimate', value: 'full' },
        { label: 'Yes — start low (e.g., 25–50 µg) and titrate', value: 'low' },
      ]),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const ugPerKg = num(values.approach, 1.6);
      const risk = String(values.risk ?? 'full');
      let dose = round(wt * ugPerKg, 0);
      // Round to common tablet increments (nearest 12.5)
      const rounded = Math.round(dose / 12.5) * 12.5;
      if (risk === 'low') {
        return {
          score: 25,
          unit: 'µg/day',
          label: 'Start low and titrate',
          interpretation: `Full-replacement estimate would be ~${rounded} µg/day (${ugPerKg} µg/kg × ${wt} kg). Because of age/cardiac risk, start typically 25–50 µg daily and titrate every 4–6 weeks by TSH — do not jump to full dose.`,
          riskLevel: 'moderate',
          details: [
            { label: 'Full replacement estimate', value: `${rounded} µg/day` },
            { label: 'Suggested start', value: '25–50 µg/day' },
          ],
        };
      }
      return {
        score: rounded,
        unit: 'µg/day',
        label: `≈${rounded} µg/day`,
        interpretation: `Estimated levothyroxine ${rounded} µg/day (${ugPerKg} µg/kg × ${wt} kg, rounded to 12.5 µg). Adjust to tablet strengths; recheck TSH in 6 weeks. Ideal body weight sometimes preferred in obesity.`,
        riskLevel: 'info',
        details: [
          { label: 'Unrounded', value: `${dose} µg` },
          { label: 'Factor', value: `${ugPerKg} µg/kg` },
        ],
        recommendations: ['Take on empty stomach', 'Separate from Ca/Fe/PPI timing issues', 'Titrate to TSH target'],
      };
    },
    evidence: {
      summary: 'Full replacement often approximated as 1.6 µg/kg/day in young healthy adults; start lower in elderly or CAD.',
      formula: 'Dose (µg) ≈ weight(kg) × 1.6 (or lower factor)',
      validation: 'Guideline-supported approximate range; final dose guided by TSH.',
      references: [
        {
          title: 'Clinical practice guidelines for hypothyroidism in adults',
          citation: 'Garber JR et al. Thyroid. 2012',
          year: 2012,
          pmid: '22954017',
          doi: '10.1089/thy.2012.0205',
        },
      ],
    },
    nextSteps: [
      { condition: 'New start', actions: ['Baseline TSH/FT4', 'ECG if cardiac risk', 'Follow-up labs 6 weeks'] },
    ],
    pearls: ['Pregnancy increases requirements ~20–30%.', 'TSH targets differ for thyroid cancer suppression.'],
  },

  // ─── 13. PTH interpretation ────────────────────────────────────────────────
  {
    id: 'pth-interpretation',
    name: 'PTH with Calcium Pattern Interpreter',
    shortName: 'PTH Pattern',
    description:
      'Interprets intact PTH together with albumin-corrected (or ionized) calcium pattern for hyper/hypoparathyroidism helpers.',
    category: 'endocrinology',
    tags: ['pth', 'calcium', 'parathyroid', 'hyperparathyroid', 'hypoparathyroid'],
    whenToUse: 'Abnormal calcium evaluation when PTH is available.',
    whyUse: 'PTH–calcium pairing is the core branch point for parathyroid vs non-parathyroid disorders.',
    inputs: [
      numberInput('ca', 'Serum calcium (total or corrected)', {
        unit: 'mg/dL',
        min: 4,
        max: 18,
        step: 0.1,
        defaultValue: 10.8,
        helpText: 'Prefer albumin-corrected calcium (corrected = measured + 0.8×(4 − albumin g/dL)) or ionized Ca',
      }),
      numberInput('pth', 'Intact PTH', { unit: 'pg/mL', min: 1, max: 2000, defaultValue: 90 }),
      numberInput('caLow', 'Calcium lower ref', { unit: 'mg/dL', min: 7, max: 9, step: 0.1, defaultValue: 8.5 }),
      numberInput('caHigh', 'Calcium upper ref', { unit: 'mg/dL', min: 9.5, max: 11, step: 0.1, defaultValue: 10.5 }),
      numberInput('pthLow', 'PTH lower ref', { unit: 'pg/mL', min: 5, max: 20, defaultValue: 15 }),
      numberInput('pthHigh', 'PTH upper ref', { unit: 'pg/mL', min: 40, max: 90, defaultValue: 65 }),
      yesNo('ckd', 'Known advanced CKD / ESRD', 0),
    ],
    calculate(values) {
      const ca = num(values.ca, 10.8);
      const pth = num(values.pth, 90);
      const caL = num(values.caLow, 8.5);
      const caH = num(values.caHigh, 10.5);
      const pthL = num(values.pthLow, 15);
      const pthH = num(values.pthHigh, 65);
      const ckd = bool(values.ckd);

      const caHigh = ca > caH;
      const caLow = ca < caL;
      const caN = !caHigh && !caLow;
      const pthHigh = pth > pthH;
      const pthLow = pth < pthL;
      const pthN = !pthHigh && !pthLow;
      // Inappropriately normal PTH with abnormal Ca is also meaningful
      const pthNotSuppressed = pth >= pthL;
      const pthNotElevated = pth <= pthH;

      let label = 'Non-diagnostic / euthyroid-Ca pattern';
      let interpretation = 'Calcium and PTH both within entered references.';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'info' = 'normal';

      if (caHigh && (pthHigh || (pthN && pthNotSuppressed))) {
        label = pthHigh ? 'Primary hyperparathyroidism pattern' : 'Possible primary hyperparathyroidism (inappropriately normal PTH)';
        interpretation = caHigh && pthHigh
          ? 'High calcium + high PTH: classic primary hyperparathyroidism (or tertiary). Check urine Ca, 25-OH D, creatinine; consider imaging if surgery planned.'
          : 'High calcium with non-suppressed PTH: still suspicious for primary hyperparathyroidism — PTH should suppress if hypercalcemia of malignancy/PTHrP.';
        riskLevel = 'high';
      } else if (caHigh && pthLow) {
        label = 'PTH-independent hypercalcemia';
        interpretation =
          'High calcium + suppressed PTH: consider malignancy (PTHrP, osteolytic), granulomatous disease (1,25-OH D), thyrotoxicosis, milk-alkali, vitamin A/D toxicity, immobilization.';
        riskLevel = 'high';
      } else if (caLow && pthHigh) {
        label = 'Secondary hyperparathyroidism pattern';
        interpretation = ckd
          ? 'Low/normal-low calcium + high PTH in CKD: secondary hyperparathyroidism — manage phosphate, vitamin D analogs, calcimimetics per KDIGO.'
          : 'Low calcium + high PTH: secondary hyperparathyroidism (vitamin D deficiency, malabsorption, renal loss) or hungry bone. Check 25-OH D, Mg, creatinine.';
        riskLevel = 'moderate';
      } else if (caLow && (pthLow || (pthN && pthNotElevated))) {
        label = 'Hypoparathyroidism pattern';
        interpretation =
          'Low calcium with low or inappropriately normal PTH suggests hypoparathyroidism (post-surgical, autoimmune) or severe Mg depletion. Check Mg, phosphate; treat hypocalcemia carefully.';
        riskLevel = 'high';
      } else if (caN && pthHigh) {
        label = 'Isolated PTH elevation';
        interpretation = ckd
          ? 'Normocalcemic PTH rise common in CKD secondary HPT. Correlate phosphate, vitamin D, trends.'
          : 'Normocalcemic hyperparathyroidism vs vitamin D deficiency/secondary causes — replete vitamin D, repeat Ca/PTH, urine calcium.';
        riskLevel = 'moderate';
      } else if (caN && pthLow) {
        label = 'Low PTH, normal calcium';
        interpretation = 'May be residual after treatment of hyperparathyroidism, assay variation, or early/partial hypoparathyroidism — correlate clinically.';
        riskLevel = 'info';
      }

      return {
        score: `${round(ca, 1)} / ${round(pth, 0)}`,
        unit: 'Ca / PTH',
        label,
        interpretation: ckd
          ? `${interpretation} Advanced CKD/ESRD context selected — secondary/tertiary HPT patterns and KDIGO targets apply.`
          : interpretation,
        riskLevel,
        details: [
          { label: 'Calcium', value: `${ca} mg/dL (ref ${caL}–${caH})` },
          { label: 'PTH', value: `${pth} pg/mL (ref ${pthL}–${pthH})` },
          { label: 'Advanced CKD / ESRD', value: ckd ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Prefer albumin-corrected or ionized calcium',
          'Check magnesium, phosphate, creatinine, 25-OH vitamin D',
        ],
      };
    },
    evidence: {
      summary:
        'Hypercalcemia with elevated/non-suppressed PTH → primary hyperparathyroidism spectrum; hypercalcemia with suppressed PTH → PTH-independent causes; hypocalcemia with low PTH → hypoparathyroidism.',
      formula: 'Pattern classification vs reference ranges',
      validation: 'Standard endocrine diagnostic framework.',
      references: [
        {
          title: 'Guidelines for the Management of Asymptomatic Primary Hyperparathyroidism',
          citation: 'Bilezikian JP et al. J Clin Endocrinol Metab. 2014',
          year: 2014,
          pmid: '25162665',
          doi: '10.1210/jc.2014-1413',
        },
      ],
    },
    nextSteps: [
      { condition: 'Primary HPT pattern', actions: ['24h urine Ca', 'DEXA', 'Surgical criteria review', 'Endocrine/surgery referral'] },
      { condition: 'PTH-independent hyperCa', actions: ['PTHrP', 'SPEP/UPEP', '1,25-OH D', 'Malignancy workup'] },
      { condition: 'Hypoparathyroidism pattern', actions: ['Mg', 'Ca/calcitriol therapy planning', 'ECG if severe'] },
    ],
    pearls: ['Always correct calcium for albumin or use ionized Ca.', 'Lithium and thiazides affect calcium/PTH interpretation.'],
  },

  // ─── 14. Vitamin D status ──────────────────────────────────────────────────
  {
    id: 'vitamin-d-status',
    name: 'Vitamin D Status (25-OH D)',
    shortName: 'Vit D',
    description: 'Categorizes 25-hydroxyvitamin D level into deficiency, insufficiency, sufficiency, or high bands.',
    category: 'endocrinology',
    tags: ['vitamin d', '25-oh', 'deficiency', 'bone'],
    whenToUse: 'Interpreting serum 25-OH vitamin D results.',
    whyUse: 'Common cutoffs guide repletion vs maintenance; lab units and targets vary slightly by society.',
    inputs: [
      numberInput('level', '25-OH vitamin D', {
        unit: 'ng/mL',
        min: 1,
        max: 200,
        defaultValue: 22,
        helpText: 'If nmol/L, divide by 2.5 to convert to ng/mL',
      }),
      selectInput('unit', 'Unit entered', [
        { label: 'ng/mL', value: 'ng' },
        { label: 'nmol/L (will convert ÷2.5)', value: 'nmol' },
      ]),
    ],
    calculate(values) {
      let level = num(values.level, 22);
      if (String(values.unit) === 'nmol') level = level / 2.5;
      level = round(level, 1);
      const r = riskFromThresholds(level, [
        {
          max: 11.9,
          level: 'high',
          label: 'Severe deficiency (<12 ng/mL)',
          interpretation: `${level} ng/mL: severe deficiency — high risk of osteomalacia/rickets; aggressive repletion and evaluate malabsorption if unexpected.`,
        },
        {
          max: 19.9,
          level: 'moderate',
          label: 'Deficiency (12–19 ng/mL)',
          interpretation: `${level} ng/mL: deficient by common Endocrine Society-style cutoffs — repletion dosing then maintenance.`,
        },
        {
          max: 29.9,
          level: 'low',
          label: 'Insufficiency (20–29 ng/mL)',
          interpretation: `${level} ng/mL: insufficient for many bone-health targets (some guidelines accept ≥20 as adequate for general population).`,
        },
        {
          max: 50,
          level: 'normal',
          label: 'Sufficient (30–50 ng/mL)',
          interpretation: `${level} ng/mL: generally sufficient range used in many endocrine practices.`,
        },
        {
          max: 100,
          level: 'info',
          label: 'High-normal / above usual target',
          interpretation: `${level} ng/mL: above common targets; usually ok if <100 but review dosing/supplements.`,
        },
        {
          max: 500,
          level: 'high',
          label: 'Potentially toxic range concern',
          interpretation: `${level} ng/mL: risk of toxicity rises with very high levels — stop excess supplementation; check calcium.`,
        },
      ]);
      return {
        score: level,
        unit: 'ng/mL',
        ...r,
        details: [{ label: 'Also', value: `${round(level * 2.5, 0)} nmol/L` }],
      };
    },
    evidence: {
      summary:
        'Common interpretive bands for 25-OH D (ng/mL): <12 severe deficiency, 12–19 deficiency, 20–29 insufficiency, 30–50 sufficient (targets vary by guideline).',
      formula: 'Category by 25-OH D level (ng/mL); nmol/L = ng/mL × 2.5',
      validation: 'Cutoffs differ slightly among Endocrine Society, IOM/NAM, and labs.',
      references: [
        {
          title: 'Evaluation, Treatment, and Prevention of Vitamin D Deficiency',
          citation: 'Holick MF et al. J Clin Endocrinol Metab. 2011',
          year: 2011,
          pmid: '21646368',
          doi: '10.1210/jc.2011-0385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Deficiency', actions: ['Repletion (e.g., weekly high-dose then daily maintenance)', 'Ca intake', 'Fall/bone risk'] },
      { condition: 'Very high', actions: ['Stop excess D', 'Serum calcium', 'Review sources'] },
    ],
    pearls: ['Measure 25-OH D, not 1,25-OH D, for routine status.', 'Obesity and malabsorption need higher repletion doses.'],
  },

  // ─── 15. FRAX clinical risk-factor checklist (licensing-safe) ───────────────
  {
    id: 'frax-simp',
    name: 'FRAX Clinical Risk Factor Checklist (use official FRAX for probabilities)',
    shortName: 'FRAX checklist',
    description:
      'Bedside tally of major FRAX-style clinical osteoporosis fracture risk factors. Does NOT compute 10-year fracture probabilities — use the official FRAX tool at https://frax.shef.ac.uk/FRAX/.',
    category: 'endocrinology',
    tags: ['osteoporosis', 'frax', 'fracture', 'bone', 'checklist'],
    whenToUse: 'Quick bedside tally of clinical risk factors before opening official FRAX or deciding on densitometry.',
    whyUse: 'Highlights who needs DXA, fall prevention, and treatment discussion. Official FRAX (Sheffield) is required for 10-year major osteoporotic and hip fracture probabilities.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 100, defaultValue: 65 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('bmi', 'BMI (optional risk flag if low)', { unit: 'kg/m²', min: 12, max: 50, defaultValue: 24, required: false, helpText: 'This checklist flags BMI <20 as one clinical risk (not a FRAX probability). Leave blank if unknown.' }),
      yesNo('priorFx', 'Prior osteoporotic fracture'),
      yesNo('parentHip', 'Parent fractured hip'),
      yesNo('smoker', 'Current smoking'),
      yesNo('steroid', 'Glucocorticoids (≥3 months prednisone ≥5 mg/day equivalent)'),
      yesNo('ra', 'Rheumatoid arthritis'),
      yesNo('secondary', 'Secondary osteoporosis (e.g., type 1 DM, osteogenesis imperfecta adult, hyperthyroid, hypogonadism, malnutrition, malabsorption, chronic liver disease)'),
      yesNo('alcohol', 'Alcohol ≥3 units/day'),
      yesNo('lowBmd', 'Known low BMD / T-score ≤ −2.5 (if measured)'),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const bmiMissing = isMissingValue(values.bmi, true);
      let score = 0;
      const factors: string[] = [];
      if (age >= 65) {
        score += 1;
        factors.push('Age ≥65');
      }
      if (age >= 75) {
        score += 1;
        factors.push('Age ≥75 (extra)');
      }
      if (String(values.sex) === 'F') {
        score += 1;
        factors.push('Female sex');
      }
      if (!bmiMissing && num(values.bmi, 24) < 20) {
        score += 1;
        factors.push('BMI <20');
      }
      const flags: [string, string][] = [
        ['priorFx', 'Prior fracture'],
        ['parentHip', 'Parental hip fracture'],
        ['smoker', 'Current smoking'],
        ['steroid', 'Glucocorticoids'],
        ['ra', 'Rheumatoid arthritis'],
        ['secondary', 'Secondary osteoporosis'],
        ['alcohol', 'Alcohol ≥3 U/day'],
        ['lowBmd', 'Known osteoporosis BMD'],
      ];
      for (const [id, lab] of flags) {
        if (bool(values[id])) {
          score += 1;
          factors.push(lab);
        }
      }
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Few major factors',
          interpretation: `Clinical risk-factor count ${score}. Few FRAX-style clinical risks flagged — still follow age-based screening guidelines. This is NOT a 10-year fracture probability. Open official FRAX at https://frax.shef.ac.uk/FRAX/.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Several risk factors',
          interpretation: `Clinical risk-factor count ${score}. Multiple clinical risks — obtain DXA if not done and compute official 10-year probabilities. Open official FRAX at https://frax.shef.ac.uk/FRAX/.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Many risk factors',
          interpretation: `Clinical risk-factor count ${score}. Substantial clinical risk burden — prioritize DXA, fall assessment, and treatment evaluation. Do not invent a fracture probability from this count. Open official FRAX at https://frax.shef.ac.uk/FRAX/.`,
        },
      ]);
      const interpretation = bmiMissing
        ? `${r.interpretation} BMI was not entered — the low-BMI (<20 kg/m²) risk flag was not assessed.`
        : r.interpretation;
      return {
        score,
        unit: 'factors',
        label: r.label,
        interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Factors flagged', value: factors.length ? factors.join('; ') : 'None' },
          ...(bmiMissing ? [{ label: 'BMI <20 flag', value: 'Not assessed — BMI not entered' }] : []),
          { label: 'Official FRAX', value: 'https://frax.shef.ac.uk/FRAX/' },
        ],
        recommendations: [
          'Open official FRAX at https://frax.shef.ac.uk/FRAX/ for 10-year major osteoporotic and hip fracture probabilities',
          'DXA when indicated by age/guidelines/risks',
          'Calcium, vitamin D, exercise, fall prevention',
        ],
      };
    },
    evidence: {
      summary:
        'Official FRAX estimates 10-year major osteoporotic and hip fracture probabilities from age, sex, BMI, clinical risks, and optional BMD, using licensed country-specific models. This tool only tallies clinical risk factors and never reports a fracture probability.',
      formula: 'Count of selected major clinical risk factors (not the FRAX algorithm)',
      validation: 'Checklist only — not calibrated to fracture probability. Use https://frax.shef.ac.uk/FRAX/.',
      references: [
        {
          title: 'FRAX and the assessment of fracture probability in men and women from the UK',
          citation: 'Kanis JA et al. Osteoporos Int. 2008',
          year: 2008,
          pmid: '18292978',
          doi: '10.1007/s00198-007-0543-5',
          url: 'https://frax.shef.ac.uk/FRAX/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Always', actions: ['Open official FRAX at https://frax.shef.ac.uk/FRAX/', 'Enter age, sex, BMI, clinical risks, and optional femoral-neck BMD'] },
      { condition: '≥2–3 factors or age-eligible', actions: ['Open official FRAX', 'DXA', 'Treat if osteoporosis or if official FRAX exceeds guideline thresholds'] },
    ],
    pearls: [
      'Prior fracture and high-dose steroids are among the strongest clinical risks.',
      'This checklist does not compute FRAX probabilities — the algorithm is licensed. Always open https://frax.shef.ac.uk/FRAX/.',
    ],
  },

  // ─── 16. Osteoporosis T-score ──────────────────────────────────────────────
  {
    id: 'osteoporosis-t',
    name: 'DXA T-Score Interpretation (WHO)',
    shortName: 'T-score',
    description: 'Interprets bone mineral density T-score into normal, osteopenia, or osteoporosis (WHO).',
    category: 'endocrinology',
    tags: ['osteoporosis', 't-score', 'dxa', 'bmd', 'who'],
    whenToUse: 'Interpreting central DXA T-scores in postmenopausal women and men ≥50 years.',
    whyUse: 'WHO categories drive labeling; treatment also considers fracture history and FRAX.',
    inputs: [
      numberInput('tscore', 'Lowest relevant T-score', {
        unit: 'SD',
        min: -6,
        max: 4,
        step: 0.1,
        defaultValue: -2.2,
        helpText: 'Usually lumbar spine, total hip, or femoral neck',
      }),
      yesNo('fragilityFx', 'Fragility fracture (hip/spine) regardless of T-score', 0),
      selectInput('site', 'Site', [
        { label: 'Femoral neck / total hip', value: 'hip' },
        { label: 'Lumbar spine', value: 'spine' },
        { label: 'Other / 1/3 radius', value: 'other' },
      ]),
    ],
    calculate(values) {
      const t = num(values.tscore, -2.2);
      const fx = bool(values.fragilityFx);
      let label = 'Normal BMD (T-score ≥ −1.0)';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let interpretation = `T-score ${t}: within normal WHO category (≥ −1.0).`;

      if (t <= -2.5) {
        label = 'Osteoporosis (T-score ≤ −2.5)';
        riskLevel = 'high';
        interpretation = `T-score ${t}: osteoporosis by WHO BMD criteria. Evaluate secondary causes; consider pharmacologic therapy.`;
      } else if (t < -1.0) {
        label = 'Osteopenia / low bone mass (−1.0 to −2.5)';
        riskLevel = 'moderate';
        interpretation = `T-score ${t}: low bone mass (osteopenia). Use FRAX and clinical risks to decide treatment.`;
      }

      if (fx) {
        label = 'Clinical osteoporosis (fragility fracture)';
        riskLevel = 'high';
        interpretation +=
          ' Fragility fracture of hip or spine establishes clinical osteoporosis often independent of T-score thresholds — treat as high risk.';
      }

      return {
        score: t,
        unit: 'T-score',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Site', value: String(values.site ?? 'hip') },
          { label: 'Fragility fracture', value: fx ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Fall prevention, exercise, calcium/vitamin D',
          'Pharmacologic therapy if osteoporosis or high FRAX risk',
          'Serial DXA per guidelines',
        ],
      };
    },
    evidence: {
      summary: 'WHO: normal T ≥ −1.0; osteopenia −1.0 to −2.5; osteoporosis T ≤ −2.5 (postmenopausal women / men ≥50).',
      formula: 'Category by T-score SD vs young-adult reference',
      validation: 'Standard densitometric classification; Z-scores used in premenopausal/younger adults.',
      references: [
        {
          title: 'Assessment of fracture risk and its application to screening for postmenopausal osteoporosis',
          citation: 'WHO Study Group. World Health Organ Tech Rep Ser. 1994',
          year: 1994,
          pmid: '7941614',
        },
      ],
    },
    nextSteps: [
      { condition: 'Osteoporosis or hip/spine fracture', actions: ['Treat', 'Secondary workup', 'Dental/GI clearance if needed for agents'] },
      { condition: 'Osteopenia', actions: ['FRAX', 'Lifestyle', 'Reassess interval DXA'] },
    ],
    pearls: ['Use Z-score in premenopausal women and men <50.', 'Artifactually high spine T-scores with osteoarthritis.'],
  },

  // ─── 17. WHO BMI class ─────────────────────────────────────────────────────
  {
    id: 'who-bmi-class',
    name: 'WHO BMI Classification',
    shortName: 'BMI Class',
    description: 'Interprets an entered BMI value into WHO adult weight categories.',
    category: 'endocrinology',
    tags: ['bmi', 'who', 'obesity', 'weight'],
    whenToUse: 'When BMI is already calculated and category labeling is needed.',
    whyUse: 'Standard adult WHO cutoffs for underweight through class III obesity.',
    inputs: [
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 10, max: 80, step: 0.1, defaultValue: 27 }),
      selectInput('asian', 'Asian-specific cutoffs helper', [
        { label: 'Standard WHO', value: 0, description: 'Global WHO: overweight ≥25, obesity ≥30.' },
        { label: 'Note Asian lower risk thresholds (info only)', value: 1, description: 'WHO Asian public-health action points: increased risk often from BMI ≥23; obesity from ≥25. Does not change the WHO class label — adds a note only.' },
      ], undefined, 'Does not rescore the WHO class. Select the Asian note if counseling a patient for whom lower BMI metabolic-risk thresholds are used.'),
    ],
    calculate(values) {
      const bmi = num(values.bmi, 27);
      const asian = num(values.asian, 0) === 1;
      const r = riskFromThresholds(bmi, [
        {
          max: 18.49,
          level: 'moderate',
          label: 'Underweight (<18.5)',
          interpretation: `BMI ${bmi}: underweight. Evaluate nutrition, malabsorption, hyperthyroid, eating disorder.`,
        },
        {
          max: 24.99,
          level: 'normal',
          label: 'Normal (18.5–24.9)',
          interpretation: `BMI ${bmi}: normal weight range by WHO adult standards.`,
        },
        {
          max: 29.99,
          level: 'low',
          label: 'Overweight (25–29.9)',
          interpretation: `BMI ${bmi}: overweight. Lifestyle intervention; assess waist and metabolic risks.`,
        },
        {
          max: 34.99,
          level: 'moderate',
          label: 'Obesity class I (30–34.9)',
          interpretation: `BMI ${bmi}: class I obesity. Structured weight management; screen comorbidities.`,
        },
        {
          max: 39.99,
          level: 'high',
          label: 'Obesity class II (35–39.9)',
          interpretation: `BMI ${bmi}: class II obesity. Intensive therapy; consider pharmacotherapy / surgical evaluation if comorbidities.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Obesity class III (≥40)',
          interpretation: `BMI ${bmi}: class III (severe) obesity. Comprehensive obesity care; bariatric evaluation often appropriate.`,
        },
      ]);
      if (asian && bmi >= 23 && bmi < 25) {
        r.interpretation +=
          ' Asian populations: increased metabolic risk often considered from BMI ≥23; WHO Asian public-health action points differ from global cutoffs.';
      }
      return {
        score: bmi,
        unit: 'kg/m²',
        ...r,
        details: asian
          ? [{ label: 'Asian note', value: 'Risk rises at lower BMI in many Asian groups' }]
          : undefined,
      };
    },
    evidence: {
      summary: 'WHO adult BMI: <18.5 underweight; 18.5–24.9 normal; 25–29.9 overweight; ≥30 obesity (classes I–III).',
      formula: 'Category by BMI value (kg/m²)',
      validation: 'Global WHO classification; ethnic-specific thresholds may apply.',
      references: [
        {
          title: 'Obesity: preventing and managing the global epidemic',
          citation: 'WHO Technical Report Series 894',
          year: 2000,
          pmid: '11234459',
        },
      ],
    },
    nextSteps: [
      { condition: 'BMI ≥30 or overweight + comorbidity', actions: ['Lifestyle', 'Comorbidity screen', 'Anti-obesity therapy discussion'] },
      { condition: 'Underweight', actions: ['Nutritional assessment', 'Secondary cause workup'] },
    ],
    pearls: ['BMI does not distinguish fat vs muscle.', 'Use waist circumference as adjunct.'],
  },

  // ─── 18. Child BMI percentile ──────────────────────────────────────────────
  {
    id: 'child-bmi-percentile',
    name: 'Pediatric BMI Percentile Interpretation',
    shortName: 'Child BMI %',
    description: 'Interprets an entered BMI-for-age percentile into underweight, healthy, overweight, or obesity categories (CDC).',
    category: 'pediatrics',
    tags: ['bmi', 'pediatric', 'percentile', 'obesity', 'growth'],
    whenToUse: 'When BMI percentile from growth charts/EMR is available for ages 2–19.',
    whyUse: 'Pediatric weight status uses percentiles, not adult BMI cutoffs.',
    inputs: [
      numberInput('percentile', 'BMI-for-age percentile', {
        unit: '%',
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 85,
        helpText: 'Enter the CDC BMI-for-age percentile from the growth chart/EMR — not the adult BMI number. Categories: <5th underweight; 5th–84th healthy; 85th–94th overweight; ≥95th obesity; ≥99th often treated as severe obesity.',
      }),
      numberInput('age', 'Age', { unit: 'years', min: 2, max: 19, defaultValue: 10 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const p = num(values.percentile, 85);
      const age = num(values.age, 10);
      const r = riskFromThresholds(p, [
        {
          max: 4.99,
          level: 'moderate',
          label: 'Underweight (<5th percentile)',
          interpretation: `BMI percentile ${p} at age ${age}: underweight. Assess nutrition, chronic disease, and growth trajectory.`,
        },
        {
          max: 84.99,
          level: 'normal',
          label: 'Healthy weight (5th–84th)',
          interpretation: `BMI percentile ${p}: healthy weight range by CDC BMI-for-age categories.`,
        },
        {
          max: 94.99,
          level: 'moderate',
          label: 'Overweight (85th–94th)',
          interpretation: `BMI percentile ${p}: overweight. Family-centered lifestyle counseling; track trajectory.`,
        },
        {
          max: 98.99,
          level: 'high',
          label: 'Obesity (≥95th)',
          interpretation: `BMI percentile ${p}: obesity (≥95th percentile). Comprehensive assessment; intensive behavioral treatment per guidelines.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Severe obesity (≥99th / high percentile)',
          interpretation: `BMI percentile ${p}: severe obesity range (often ≥120% of 95th percentile in extended definitions). Specialist obesity care; evaluate comorbidities.`,
        },
      ]);
      return {
        score: p,
        unit: 'percentile',
        ...r,
        details: [
          { label: 'Age', value: `${age} years` },
          { label: 'Sex', value: String(values.sex ?? '') },
        ],
      };
    },
    evidence: {
      summary:
        'CDC: underweight <5th; healthy 5th–84th; overweight 85th–94th; obesity ≥95th BMI-for-age percentile (ages 2–19).',
      formula: 'Category by BMI-for-age percentile',
      validation: 'CDC growth chart categories; WHO charts used in some settings for younger children.',
      references: [
        {
          title: 'Expert committee recommendations regarding the prevention, assessment, and treatment of child and adolescent overweight and obesity: summary report',
          citation: 'Barlow SE et al. Pediatrics. 2007',
          year: 2007,
          pmid: '18055651',
          doi: '10.1542/peds.2007-2329C',
        },
      ],
    },
    nextSteps: [
      { condition: 'Overweight/obesity', actions: ['Lifestyle counseling', 'Screen BP, lipids, glucose as indicated', 'Sleep/mental health'] },
    ],
    pearls: ['Plot trend over time — crossing percentiles matters.', 'This tool does not compute percentile from raw height/weight.'],
  },

  // ─── 19. Fatty liver index (FLI) ───────────────────────────────────────────
  {
    id: 'fatty-liver-index',
    name: 'Fatty Liver Index (FLI)',
    shortName: 'FLI',
    description:
      'Bedogni Fatty Liver Index estimates likelihood of hepatic steatosis from triglycerides, BMI, GGT, and waist circumference.',
    category: 'gastroenterology',
    tags: ['nafld', 'masld', 'fatty liver', 'fli', 'steatosis'],
    whenToUse: 'Noninvasive estimate of fatty liver probability in adults when imaging not yet done.',
    whyUse: 'FLI <30 rules out and ≥60 rules in steatosis with reasonable accuracy in validation cohorts.',
    inputs: [
      numberInput('tg', 'Triglycerides', { unit: 'mg/dL', min: 30, max: 1000, defaultValue: 150, helpText: 'Use mg/dL (mmol/L × 88.5 ≈ mg/dL). Fasting sample as in original FLI.' }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 60, step: 0.1, defaultValue: 28 }),
      numberInput('ggt', 'GGT', { unit: 'U/L', min: 5, max: 1000, defaultValue: 40 }),
      numberInput('waist', 'Waist circumference', { unit: 'cm', min: 50, max: 180, defaultValue: 96, helpText: 'Measure at the midpoint between the last rib and the iliac crest (standing).' }),
    ],
    calculate(values) {
      const tg = num(values.tg, 150);
      const bmi = num(values.bmi, 28);
      const ggt = num(values.ggt, 40);
      const waist = num(values.waist, 96);
      // FLI uses natural logs; TG in mg/dL as in original (Bedogni)
      const x =
        0.953 * Math.log(tg) +
        0.139 * bmi +
        0.718 * Math.log(ggt) +
        0.053 * waist -
        15.745;
      const fli = round((Math.exp(x) / (1 + Math.exp(x))) * 100, 1);
      const r = riskFromThresholds(fli, [
        {
          max: 29.9,
          level: 'low',
          label: 'FLI <30 — steatosis unlikely',
          interpretation: `FLI ${fli}: low likelihood of fatty liver (rule-out zone in original work).`,
        },
        {
          max: 59.9,
          level: 'moderate',
          label: 'FLI 30–59 — indeterminate',
          interpretation: `FLI ${fli}: intermediate — cannot rule in/out steatosis; consider imaging and metabolic workup.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'FLI ≥60 — steatosis likely',
          interpretation: `FLI ${fli}: high likelihood of hepatic steatosis. Assess MASLD risk, fibrosis scores (FIB-4), and lifestyle.`,
        },
      ]);
      return {
        score: fli,
        unit: 'index',
        ...r,
        details: [
          { label: 'TG', value: `${tg} mg/dL` },
          { label: 'BMI', value: `${bmi}` },
          { label: 'GGT', value: `${ggt} U/L` },
          { label: 'Waist', value: `${waist} cm` },
        ],
      };
    },
    evidence: {
      summary:
        'FLI = logistic function of ln(TG), BMI, ln(GGT), and waist. <30 low probability; ≥60 high probability of fatty liver.',
      formula:
        'x = 0.953·ln(TG) + 0.139·BMI + 0.718·ln(GGT) + 0.053·waist − 15.745; FLI = e^x/(1+e^x)×100',
      validation: 'Derived vs ultrasound steatosis in Italian population; widely used as steatosis screen.',
      references: [
        {
          title: 'The Fatty Liver Index: a simple and accurate predictor of hepatic steatosis',
          citation: 'Bedogni G et al. BMC Gastroenterol. 2006',
          year: 2006,
          pmid: '17081293',
          doi: '10.1186/1471-230X-6-33',
        },
      ],
    },
    nextSteps: [
      { condition: 'FLI ≥60', actions: ['Liver enzymes', 'FIB-4/NFS', 'Ultrasound if needed', 'Weight loss, alcohol review'] },
      { condition: 'Indeterminate', actions: ['Metabolic risk assessment', 'Consider imaging'] },
    ],
    pearls: ['Does not stage fibrosis — pair with FIB-4.', 'Alcohol use still needs separate assessment.'],
  },

  // ─── 20. Hepatic steatosis index (HSI) ─────────────────────────────────────
  {
    id: 'hepatic-steatosis-index',
    name: 'Hepatic Steatosis Index (HSI)',
    shortName: 'HSI',
    description: 'Hepatic Steatosis Index from AST/ALT ratio, BMI, sex, and diabetes status.',
    category: 'gastroenterology',
    tags: ['hsi', 'nafld', 'masld', 'steatosis', 'liver'],
    whenToUse: 'Simple lab-based screen for NAFLD/MASLD steatosis risk.',
    whyUse: 'HSI <30 rules out and >36 rules in steatosis in original Korean derivation.',
    inputs: [
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 1000, defaultValue: 45 }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 1000, defaultValue: 30 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 60, step: 0.1, defaultValue: 28 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female (+2)', value: 'F' },
      ]),
      yesNo('diabetes', 'Diabetes mellitus (+2)', 2),
    ],
    calculate(values) {
      const alt = num(values.alt, 45);
      const ast = num(values.ast, 30);
      const bmi = num(values.bmi, 28);
      const female = String(values.sex) === 'F';
      const dm = bool(values.diabetes);
      if (ast <= 0) {
        return { score: '—', label: 'Invalid AST', interpretation: 'AST must be >0.', riskLevel: 'info' };
      }
      const hsi = round(8 * (alt / ast) + bmi + (female ? 2 : 0) + (dm ? 2 : 0), 1);
      const r = riskFromThresholds(hsi, [
        {
          max: 29.9,
          level: 'low',
          label: 'HSI <30 — NAFLD unlikely',
          interpretation: `HSI ${hsi}: low likelihood of steatosis (rule-out zone in original study).`,
        },
        {
          max: 36,
          level: 'moderate',
          label: 'HSI 30–36 — intermediate',
          interpretation: `HSI ${hsi}: intermediate probability — correlate clinically and consider imaging.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'HSI >36 — NAFLD likely',
          interpretation: `HSI ${hsi}: high likelihood of hepatic steatosis. Evaluate metabolic syndrome and fibrosis risk.`,
        },
      ]);
      return {
        score: hsi,
        unit: 'index',
        ...r,
        details: [
          { label: 'ALT/AST', value: `${round(alt / ast, 2)}` },
          { label: 'BMI', value: String(bmi) },
          { label: 'Female +2', value: female ? 'Yes' : 'No' },
          { label: 'Diabetes +2', value: dm ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'HSI = 8 × (ALT/AST) + BMI + 2 (if female) + 2 (if diabetes). <30 low, >36 high probability of NAFLD.',
      formula: 'HSI = 8·(ALT/AST) + BMI + 2(if female) + 2(if DM)',
      validation: 'Derived in Korean health-check cohorts vs ultrasound.',
      references: [
        {
          title: 'Hepatic steatosis index: a simple screening tool reflecting nonalcoholic fatty liver disease',
          citation: 'Lee JH et al. Dig Liver Dis. 2010',
          year: 2010,
          pmid: '19766548',
          doi: '10.1016/j.dld.2009.08.002',
        },
      ],
    },
    nextSteps: [
      { condition: 'HSI >36', actions: ['Lifestyle', 'FIB-4', 'Consider elastography if fibrosis risk'] },
    ],
    pearls: ['Alcohol exclusion needed before labeling NAFLD/MASLD.', 'Performance varies by ethnicity and BMI extremes.'],
  },

  // ─── 21. NIDA Quick Screen ─────────────────────────────────────────────────
  {
    id: 'nida-quick',
    name: 'NIDA Quick Screen',
    shortName: 'NIDA QS',
    description:
      'NIDA Quick Screen for past-year use of alcohol (binge), tobacco, prescription drugs (nonmedical), and illegal drugs.',
    category: 'psychiatry',
    tags: ['nida', 'substance use', 'screening', 'alcohol', 'drugs', 'tobacco'],
    whenToUse: 'Primary care or general medical visits for brief substance use screening.',
    whyUse: 'Any positive domain needs follow-up; illegal or nonmedical Rx use prompts NIDA-Modified ASSIST; alcohol/tobacco use SBIRT or cessation pathways.',
    inputs: [
      selectInput('alcohol', 'Alcohol — how many times in past year had ≥5 (men) / ≥4 (women) drinks/day', [
        { label: 'Never (0)', value: 0, description: 'No binge days in the past year.' },
        { label: 'Once or twice (1)', value: 1, description: '1–2 days in the past year — still a positive Quick Screen.' },
        { label: 'Monthly (2)', value: 2, description: 'About once a month.' },
        { label: 'Weekly (3)', value: 3, description: 'About once a week.' },
        { label: 'Daily or almost daily (4)', value: 4, description: 'Most days.' },
      ], undefined, 'NIDA Quick Screen: In the PAST YEAR, how often have you had ≥5 drinks in a day (men) or ≥4 (women)? Any answer other than Never is a positive screen.'),
      selectInput('tobacco', 'Tobacco products — past year use frequency', [
        { label: 'Never (0)', value: 0 },
        { label: 'Once or twice (1)', value: 1 },
        { label: 'Monthly (2)', value: 2 },
        { label: 'Weekly (3)', value: 3 },
        { label: 'Daily or almost daily (4)', value: 4 },
      ], undefined, 'In the PAST YEAR, how often have you used tobacco products (cigarettes, cigars, chew, vaping nicotine)?'),
      selectInput('rx', 'Prescription drugs for nonmedical reasons — past year frequency', [
        { label: 'Never (0)', value: 0 },
        { label: 'Once or twice (1)', value: 1 },
        { label: 'Monthly (2)', value: 2 },
        { label: 'Weekly (3)', value: 3 },
        { label: 'Daily or almost daily (4)', value: 4 },
      ], undefined, 'In the PAST YEAR, how often have you used prescription drugs for nonmedical reasons (reasons or doses other than prescribed, or someone else’s Rx)? Includes opioid painkillers, stimulants, and sedatives/benzodiazepines.'),
      selectInput('illegal', 'Illegal drugs — past year frequency', [
        { label: 'Never (0)', value: 0 },
        { label: 'Once or twice (1)', value: 1 },
        { label: 'Monthly (2)', value: 2 },
        { label: 'Weekly (3)', value: 3 },
        { label: 'Daily or almost daily (4)', value: 4 },
      ], undefined, 'In the PAST YEAR, how often have you used illegal drugs (e.g. marijuana/cannabis, cocaine, heroin, methamphetamine, hallucinogens, MDMA/ecstasy)?'),
    ],
    calculate(values) {
      const alcohol = num(values.alcohol, 0);
      const tobacco = num(values.tobacco, 0);
      const rx = num(values.rx, 0);
      const illegal = num(values.illegal, 0);
      const anyPositive = alcohol > 0 || tobacco > 0 || rx > 0 || illegal > 0;
      const maxFreq = Math.max(alcohol, tobacco, rx, illegal);
      const substances: string[] = [];
      if (alcohol > 0) substances.push('alcohol binge');
      if (tobacco > 0) substances.push('tobacco');
      if (rx > 0) substances.push('nonmedical Rx');
      if (illegal > 0) substances.push('illegal drugs');

      if (!anyPositive) {
        return {
          score: 0,
          unit: 'screen',
          label: 'Negative NIDA Quick Screen',
          interpretation: 'No reported past-year binge alcohol, tobacco, nonmedical prescription, or illegal drug use. Rescreen periodically.',
          riskLevel: 'normal',
        };
      }

      return {
        score: maxFreq,
        unit: 'max frequency',
        label: 'Positive NIDA Quick Screen',
        interpretation: `Positive for: ${substances.join(', ')}. Any use above Never is a positive Quick Screen — proceed to NIDA-Modified ASSIST (or equivalent) for risk level and intervention intensity.`,
        riskLevel: maxFreq >= 3 ? 'high' : maxFreq >= 2 ? 'moderate' : 'low',
        details: [
          { label: 'Alcohol binge', value: String(alcohol) },
          { label: 'Tobacco', value: String(tobacco) },
          { label: 'Nonmedical Rx', value: String(rx) },
          { label: 'Illegal drugs', value: String(illegal) },
        ],
        recommendations: [
          'Full ASSIST or structured assessment',
          'Brief intervention (SBIRT)',
          'Referral for dependence treatment if high risk',
        ],
      };
    },
    evidence: {
      summary:
        'NIDA Quick Screen asks past-year frequency of binge alcohol, tobacco, nonmedical prescription drug, and illegal drug use. Any “once or twice” or more is positive.',
      formula: 'Positive if any domain frequency > Never',
      validation: 'NIDA clinical screening resource for general medical settings.',
      references: [
        {
          title: 'Screening for Drug Use in General Medical Settings: Quick Reference Guide (NIDA Quick Screen)',
          citation: 'National Institute on Drug Abuse. NIDAMED clinician screening resource',
          year: 2012,
          url: 'https://nida.nih.gov/sites/default/files/pdf/screening_qr.pdf',
        },
        {
          title: 'A single-question screening test for drug use in primary care',
          citation: 'Smith PC et al. Arch Intern Med. 2010',
          year: 2010,
          pmid: '20625025',
          doi: '10.1001/archinternmed.2010.140',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Illegal or nonmedical Rx positive',
        actions: ['NM-ASSIST', 'SBIRT brief intervention', 'Assess readiness to change'],
      },
      {
        condition: 'Alcohol or tobacco positive only',
        actions: ['Substance-specific counseling / cessation', 'SBIRT as indicated', 'Assess readiness to change'],
      },
    ],
    pearls: ['Binge thresholds: ≥5 drinks men, ≥4 women in a day.', 'Normalize questions to improve honesty.'],
  },

  // ─── 22. Readiness to quit (stages of change) ──────────────────────────────
  {
    id: 'readiness-quit',
    name: 'Tobacco Quit Readiness (Stages of Change)',
    shortName: 'Quit Stage',
    description:
      'Stages-of-change readiness assessment for tobacco cessation counseling (precontemplation → maintenance).',
    category: 'general',
    tags: ['smoking', 'cessation', 'readiness', 'stages of change', 'tobacco'],
    whenToUse: 'When counseling patients who use tobacco to match intervention to readiness.',
    whyUse: 'Tailors 5A/5R messages; avoids one-size-fit-all advice.',
    inputs: [
      selectInput('stage', 'Which best describes you?', [
        { label: 'Not thinking of quitting in next 6 months (precontemplation)', value: 0 },
        { label: 'Thinking of quitting in next 6 months (contemplation)', value: 1 },
        { label: 'Planning to quit in next 30 days (preparation)', value: 2 },
        { label: 'Quit within the past 6 months (action)', value: 3 },
        { label: 'Quit more than 6 months ago (maintenance)', value: 4 },
      ]),
      selectInput('importance', 'Importance of quitting (0–10)', [
        { label: '0–3 low', value: 1, description: 'Ask: “On a 0–10 scale, how important is quitting to you right now?” 0–3 = low.' },
        { label: '4–6 medium', value: 2, description: 'Importance 4–6: ambivalent — use motivational interviewing / 5R.' },
        { label: '7–10 high', value: 3, description: 'Importance 7–10: ready on importance; if confidence is low, focus on practical supports and combination NRT/meds.' },
      ], undefined, 'Patient self-rating 0 (not important) to 10 (extremely important).'),
      selectInput('confidence', 'Confidence in quitting (0–10)', [
        { label: '0–3 low', value: 1, description: 'Ask: “If you decided to quit now, how confident are you (0–10)?” 0–3 = low self-efficacy.' },
        { label: '4–6 medium', value: 2, description: 'Confidence 4–6: identify barriers (withdrawal, household smokers, stress).' },
        { label: '7–10 high', value: 3, description: 'Confidence 7–10: good self-efficacy — set a quit date and offer pharmacotherapy.' },
      ], undefined, 'Patient self-rating 0 (not at all confident) to 10 (extremely confident).'),
    ],
    calculate(values) {
      const stage = num(values.stage, 0);
      const importance = num(values.importance, 2);
      const confidence = num(values.confidence, 2);
      const names = ['Precontemplation', 'Contemplation', 'Preparation', 'Action', 'Maintenance'];
      const name = names[stage] ?? 'Unknown';
      const tips: Record<number, string> = {
        0: 'Build rapport; ask permission; discuss relevant risks/rewards (5R); avoid arguing. Offer help when ready.',
        1: 'Explore ambivalence; decisional balance; enhance motivation; offer pharmacotherapy info.',
        2: 'Set quit date (ideally 2 weeks); choose meds/NRT; plan triggers; arrange follow-up.',
        3: 'Reinforce success; manage withdrawal; optimize NRT/meds; relapse prevention skills.',
        4: 'Congratulate; review high-risk situations; continue support; watch weight/mood.',
      };
      return {
        score: stage,
        unit: 'stage',
        label: name,
        interpretation: `${name}. ${tips[stage]} Importance band ${importance}/3; confidence band ${confidence}/3 — if importance high but confidence low, focus on practical supports and combination therapy.`,
        riskLevel: stage >= 3 ? 'normal' : stage === 2 ? 'low' : 'moderate',
        details: [
          { label: 'Stage', value: name },
          { label: 'Importance band', value: String(importance) },
          { label: 'Confidence band', value: String(confidence) },
        ],
        recommendations: [
          'Use 5A’s: Ask, Advise, Assess, Assist, Arrange',
          'Offer NRT/varenicline/bupropion when appropriate',
          'Behavioral support + quitline',
        ],
      };
    },
    evidence: {
      summary:
        'Transtheoretical model stages (precontemplation, contemplation, preparation, action, maintenance) guide cessation counseling intensity and messaging.',
      formula: 'Stage selected by patient self-report timelines',
      validation: 'Widely used behavioral framework in tobacco treatment guidelines.',
      references: [
        {
          title: 'Treating Tobacco Use and Dependence',
          citation: 'Fiore MC et al. US PHS Clinical Practice Guideline. 2008',
          year: 2008,
          pmid: '18807274',
        },
        {
          title: 'In search of how people change: applications to addictive behaviors',
          citation: 'Prochaska JO et al. Am Psychol. 1992',
          year: 1992,
          pmid: '1329589',
          doi: '10.1037//0003-066x.47.9.1102',
        },
      ],
    },
    nextSteps: [
      { condition: 'Preparation/Action', actions: ['Quit date', 'Pharmacotherapy', 'Follow-up within 1–2 weeks'] },
      { condition: 'Precontemplation', actions: ['Personalized 5R discussion', 'Leave door open'] },
    ],
    pearls: ['Readiness can change visit-to-visit after illness.', 'Combination NRT helps many daily smokers.'],
  },

  // ─── 23. BP classification (ACC/AHA) ───────────────────────────────────────
  {
    id: 'bp-classification',
    name: 'ACC/AHA Blood Pressure Classification',
    shortName: 'BP Stage',
    description: 'Classifies office blood pressure into ACC/AHA 2017 categories (normal through stage 2 hypertension).',
    category: 'cardiology',
    tags: ['blood pressure', 'hypertension', 'acc/aha', 'stage'],
    whenToUse: 'Adults with standardized BP readings for category labeling (not a diagnosis alone).',
    whyUse: '2017 ACC/AHA thresholds guide lifestyle intensity and treatment discussions.',
    inputs: [
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 60, max: 300, defaultValue: 138, helpText: 'ACC/AHA 2017: average ≥2 readings on ≥2 occasions. Seated, back supported, cuff on bare arm after ≥5 min rest. Category uses the higher of SBP or DBP stage.' }),
      numberInput('dbp', 'Diastolic BP', { unit: 'mmHg', min: 30, max: 200, defaultValue: 88, helpText: 'Normal <80; elevated requires DBP <80 with SBP 120–129; stage 1 includes 80–89; stage 2 ≥90; crisis ≥120 with SBP ≥180.' }),
      yesNo('crisisSymptoms', 'Severe BP with end-organ symptoms (encephalopathy, chest pain, acute HF, etc.)', 0, 'New encephalopathy, stroke, ACS/chest pain, acute HF, aortic dissection, or acute kidney injury with severe BP. With BP ≥180/120 this is emergency (not urgency).'),
    ],
    calculate(values) {
      const sbp = num(values.sbp, 138);
      const dbp = num(values.dbp, 88);
      const crisis = bool(values.crisisSymptoms);

      if (crisis && (sbp >= 180 || dbp >= 120)) {
        return {
          score: `${sbp}/${dbp}`,
          unit: 'mmHg',
          label: 'Hypertensive emergency concern',
          interpretation: `BP ${sbp}/${dbp} with possible end-organ symptoms — treat as potential hypertensive emergency; urgent evaluation, not simple outpatient staging.`,
          riskLevel: 'critical',
          details: [
            { label: 'SBP', value: `${sbp}` },
            { label: 'DBP', value: `${dbp}` },
            { label: 'End-organ symptoms', value: 'Yes' },
          ],
        };
      }

      // Category by higher stage of SBP or DBP
      let label = 'Normal';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = '';

      if (sbp >= 180 || dbp >= 120) {
        label = 'Hypertensive crisis range (≥180/120)';
        riskLevel = 'critical';
        interpretation = `BP ${sbp}/${dbp}: crisis-range pressures. If no end-organ damage → urgency pathway; with damage → emergency. Confirm measurement technique.`;
      } else if (sbp >= 140 || dbp >= 90) {
        label = 'Stage 2 hypertension';
        riskLevel = 'high';
        interpretation = `BP ${sbp}/${dbp}: stage 2 HTN (≥140 or ≥90). Confirm with multiple readings/out-of-office; pharmacologic therapy typically indicated with lifestyle.`;
      } else if (sbp >= 130 || dbp >= 80) {
        label = 'Stage 1 hypertension';
        riskLevel = 'moderate';
        interpretation = `BP ${sbp}/${dbp}: stage 1 HTN (130–139 or 80–89). Lifestyle for all; meds if ASCVD or 10-y risk ≥10% (or other indications) per ACC/AHA.`;
      } else if (sbp >= 120 && dbp < 80) {
        label = 'Elevated';
        riskLevel = 'low';
        interpretation = `BP ${sbp}/${dbp}: elevated (SBP 120–129 and DBP <80). Lifestyle modification; recheck.`;
      } else if (sbp < 120 && dbp < 80) {
        label = 'Normal';
        riskLevel = 'normal';
        interpretation = `BP ${sbp}/${dbp}: normal (<120/<80). Continue healthy lifestyle.`;
      } else {
        // e.g. SBP <120 but DBP ≥80 already handled; fallback
        label = 'Stage 1 hypertension';
        riskLevel = 'moderate';
        interpretation = `BP ${sbp}/${dbp}: classified by highest category rule.`;
      }

      if (crisis && !(sbp >= 180 || dbp >= 120)) {
        interpretation += ' End-organ symptoms reported without crisis-range BP — reassess measurement and symptomatic differential urgently.';
        if (riskLevel === 'normal' || riskLevel === 'low') riskLevel = 'moderate';
      }

      return {
        score: `${sbp}/${dbp}`,
        unit: 'mmHg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'SBP', value: `${sbp}` },
          { label: 'DBP', value: `${dbp}` },
          { label: 'Pulse pressure', value: `${sbp - dbp}` },
          { label: 'End-organ symptoms', value: crisis ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'ACC/AHA 2017: Normal <120/<80; Elevated 120–129/<80; Stage 1 130–139 or 80–89; Stage 2 ≥140 or ≥90; crisis ≥180/120.',
      formula: 'Highest applicable SBP or DBP category',
      validation: 'Guideline classification; diagnosis requires repeated/proper technique and often out-of-office confirmation.',
      references: [
        {
          title: '2017 ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/ASH/ASPC/NMA/PCNA Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure',
          citation: 'Whelton PK et al. Hypertension. 2018',
          year: 2018,
          pmid: '29133356',
          doi: '10.1161/HYP.0000000000000065',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage 1–2', actions: ['Confirm BP', 'ASCVD risk', 'Lifestyle', 'Meds per risk'] },
      { condition: 'Crisis range', actions: ['Assess end-organ damage', 'ED/urgent pathway if indicated'] },
    ],
    pearls: ['Average ≥2 readings on ≥2 occasions for diagnosis.', 'White-coat and masked HTN need ABPM/HBPM.'],
  },

  // ─── 24. Pulse pressure ────────────────────────────────────────────────────
  {
    id: 'pulse-pressure',
    name: 'Pulse Pressure',
    shortName: 'PP',
    description: 'Calculates pulse pressure (SBP − DBP) and provides educational interpretation.',
    category: 'cardiology',
    tags: ['pulse pressure', 'blood pressure', 'arterial stiffness', 'hemodynamics'],
    whenToUse: 'From paired systolic and diastolic BP when assessing pulse pressure width.',
    whyUse: 'Wide PP associated with arterial stiffness and CV risk; narrow PP may reflect low stroke volume.',
    inputs: [
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 300, defaultValue: 140 }),
      numberInput('dbp', 'Diastolic BP', { unit: 'mmHg', min: 20, max: 200, defaultValue: 70 }),
    ],
    calculate(values) {
      const sbp = num(values.sbp, 140);
      const dbp = num(values.dbp, 70);
      const pp = sbp - dbp;
      if (pp < 0) {
        return {
          score: pp,
          unit: 'mmHg',
          label: 'Invalid (DBP > SBP)',
          interpretation: 'Check measurement entry — diastolic cannot exceed systolic.',
          riskLevel: 'info',
        };
      }
      const r = riskFromThresholds(pp, [
        {
          max: 24,
          level: 'moderate',
          label: 'Narrow pulse pressure (<25)',
          interpretation: `PP ${pp} mmHg is narrow. Consider low stroke volume (cardiogenic shock, severe AS, tamponade, hypovolemia) in the right clinical context — not diagnostic alone.`,
        },
        {
          max: 39,
          level: 'normal',
          label: 'Low–normal pulse pressure',
          interpretation: `PP ${pp} mmHg is relatively low-normal. Interpret with MAP and clinical status.`,
        },
        {
          max: 60,
          level: 'normal',
          label: 'Normal pulse pressure',
          interpretation: `PP ${pp} mmHg is within a common normal range (~40 mmHg typical resting).`,
        },
        {
          max: 80,
          level: 'moderate',
          label: 'Widened pulse pressure',
          interpretation: `PP ${pp} mmHg is widened. Associated with arterial stiffness, AR, hyperthyroidism, high-output states — correlate clinically.`,
        },
        {
          max: 300,
          level: 'high',
          label: 'Markedly widened pulse pressure',
          interpretation: `PP ${pp} mmHg is markedly wide. Higher CV risk association in older adults; evaluate isolated systolic HTN and aortic regurgitation when relevant.`,
        },
      ]);
      const map = round(dbp + pp / 3, 0);
      return {
        score: pp,
        unit: 'mmHg',
        ...r,
        details: [
          { label: 'SBP', value: `${sbp}` },
          { label: 'DBP', value: `${dbp}` },
          { label: 'Approx MAP', value: `${map} mmHg (DBP+PP/3)` },
        ],
      };
    },
    evidence: {
      summary: 'Pulse pressure = SBP − DBP. Widened PP often reflects reduced arterial compliance; narrow PP may accompany low stroke volume.',
      formula: 'PP = SBP − DBP',
      validation: 'Hemodynamic teaching parameter; risk associations strongest for chronically wide PP in older adults.',
      references: [
        {
          title: 'Is pulse pressure useful in predicting risk for coronary heart disease? The Framingham Heart Study',
          citation: 'Franklin SS et al. Circulation. 1999',
          year: 1999,
          pmid: '10421594',
          doi: '10.1161/01.cir.100.4.354',
        },
      ],
    },
    nextSteps: [
      { condition: 'Wide PP + HTN', actions: ['Confirm BP', 'Assess ASCVD risk', 'Treat isolated systolic HTN per guidelines'] },
      { condition: 'Narrow PP + shock', actions: ['Urgent hemodynamic assessment'] },
    ],
    pearls: ['PP usually rises with age.', 'Aortic regurgitation can produce very wide PP.'],
  },
];
