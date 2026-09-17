import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** CIWA-Ar select: official Sullivan 1989 anchors on 0/1/4/7 (orientation 0–4). Unlabeled ranks stay interpolations. */
function ciwaSelect(
  id: string,
  label: string,
  helpText: string,
  anchors: Partial<Record<number, string>>,
  max = 7,
) {
  return selectInput(
    id,
    label,
    Array.from({ length: max + 1 }, (_, i) => ({
      label: anchors[i] ? `${i} — ${anchors[i]}` : String(i),
      value: i,
      description: anchors[i]
        ?? 'Interpolate between the official 0 / 1 / 4 / 7 anchors (Sullivan 1989 leaves this rank unlabeled).',
    })),
    0,
    helpText,
  );
}

export const giNeuroPsychCalcs: Calculator[] = [
  {
    id: 'child-pugh',
    name: 'Child-Pugh Score',
    shortName: 'Child-Pugh',
    description: 'Chronic liver disease severity classification.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'liver', 'prognosis'],
    whenToUse: 'Cirrhosis severity, surgical risk, prognosis discussions.',
    whyUse: 'Classic liver disease staging; complements MELD for transplant.',
    inputs: [
      selectInput(
        'bili',
        'Total bilirubin (mg/dL)',
        [
          { label: '<2 (1)', value: 1, description: '<2 mg/dL (≈ <34 µmol/L)' },
          { label: '2–3 (2)', value: 2, description: '2–3 mg/dL (≈ 34–51 µmol/L)' },
          { label: '>3 (3)', value: 3, description: '>3 mg/dL (≈ >51 µmol/L)' },
        ],
        1,
        '2 mg/dL ≈ 34 µmol/L; 3 mg/dL ≈ 51 µmol/L.',
      ),
      selectInput('albumin', 'Albumin (g/dL)', [
        { label: '>3.5 (1)', value: 1, description: '>3.5 g/dL (≈ >35 g/L)' },
        { label: '2.8–3.5 (2)', value: 2, description: '2.8–3.5 g/dL (≈ 28–35 g/L)' },
        { label: '<2.8 (3)', value: 3, description: '<2.8 g/dL (≈ <28 g/L)' },
      ], 1, '3.5 g/dL ≈ 35 g/L; 2.8 g/dL ≈ 28 g/L. Use the same-day lab.'),
      selectInput('inr', 'INR', [
        { label: '<1.7 (1)', value: 1, description: 'INR <1.7 (original Pugh used PT prolongation <4 s)' },
        { label: '1.7–2.3 (2)', value: 2, description: 'INR 1.7–2.3 (PT prolongation 4–6 s)' },
        { label: '>2.3 (3)', value: 3, description: 'INR >2.3 (PT prolongation >6 s)' },
      ], 1, 'INR is the usual modern substitute for Pugh’s PT-prolongation cutoffs (<4 / 4–6 / >6 seconds).'),
      selectInput(
        'ascites',
        'Ascites',
        [
          { label: 'None (1)', value: 1, description: 'No ascites' },
          { label: 'Mild (2)', value: 2, description: 'Slight ascites, or medically controlled with diuretics' },
          { label: 'Moderate–severe (3)', value: 3, description: 'Moderate–severe ascites; poorly controlled or tense despite diuretics' },
        ],
        1,
        'Grade by exam or imaging plus diuretic response: none = 1; slight / diuretic-controlled = 2; poorly controlled or tense despite diuretics = 3.',
      ),
      selectInput(
        'enceph',
        'Encephalopathy (West Haven)',
        [
          {
            label: 'None (1)',
            value: 1,
            description: 'West Haven 0: no change in personality or behavior; no asterixis',
          },
          {
            label: 'Grade 1–2 (2)',
            value: 2,
            description:
              'WH 1: trivial lack of awareness, euphoria or anxiety, shortened attention, sleep–wake reversal, impaired addition/subtraction. WH 2: lethargy or apathy, disorientation to time, obvious personality change, inappropriate behavior, asterixis. Still arousable.',
          },
          {
            label: 'Grade 3–4 (3)',
            value: 3,
            description:
              'WH 3: somnolence to semistupor, responsive to verbal stimuli, confusion, gross disorientation. WH 4: coma (unresponsive to verbal or noxious stimuli).',
          },
        ],
        1,
        'Use AASLD/EASL West Haven hepatic encephalopathy grades (Ferenci). Child-Pugh maps none = 1 point, grades 1–2 = 2 points, grades 3–4 = 3 points. Asterixis is typical of grade 2. Grade 3–4 are not fully arousable. Score the worst grade in the current assessment, including HE controlled on lactulose/rifaximin if signs persist.',
      ),
    ],
    calculate(values) {
      const score = num(values.bili) + num(values.albumin) + num(values.inr) + num(values.ascites) + num(values.enceph);
      let cls = 'A';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation = 'Child-Pugh A: well-compensated; 1-year survival ~100% historically.';
      if (score >= 10) {
        cls = 'C';
        riskLevel = 'high';
        interpretation = 'Child-Pugh C: decompensated; high surgical mortality; transplant evaluation if candidate.';
      } else if (score >= 7) {
        cls = 'B';
        riskLevel = 'moderate';
        interpretation = 'Child-Pugh B: significant functional compromise; careful procedural risk assessment.';
      }
      return { score, label: `Class ${cls}`, interpretation, riskLevel, details: [{ label: 'Class ranges', value: 'A 5–6, B 7–9, C 10–15' }] };
    },
    evidence: {
      summary: 'Child-Turcotte-Pugh uses bili, albumin, INR, ascites, encephalopathy.',
      validation: 'Longstanding surgical risk and cirrhosis severity tool.',
      references: [{ title: 'Transection of the oesophagus for bleeding oesophageal varices', citation: 'Pugh RNH et al. Br J Surg. 1973 (Child-Pugh modification)', year: 1973, pmid: '4541913',
          doi: '10.1002/bjs.1800600817', }],
    },
    nextSteps: [
      { condition: 'Class B–C', actions: ['Manage decompensation', 'Screen HCC/varices', 'Consider transplant referral'] },
    ],
    pearls: [
      'Encephalopathy is West Haven (AASLD/EASL): 0 none; 1 trivial unawareness / sleep reversal / poor attention; 2 lethargy, time disorientation, asterixis; 3 somnolent but arousable to voice, gross disorientation; 4 coma. Child-Pugh collapses 1–2 and 3–4.',
      'Ascites: none = 1; slight or diuretic-controlled = 2; poorly controlled or tense despite diuretics = 3.',
      'Some centers use higher bilirubin cutoffs in PBC/PSC (<4 / 4–10 / >10 mg/dL). This tool uses the standard Pugh <2 / 2–3 / >3 mg/dL bands.',
    ],
  },
  {
    id: 'meld',
    name: 'Original MELD Score (Historical)',
    shortName: 'Original MELD',
    description: 'Historical four-variable Model for End-Stage Liver Disease score for legacy literature and comparison; it is not the current OPTN allocation formula.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'transplant', 'meld'],
    whenToUse: 'When reproducing the original MELD model in historical studies or comparing legacy prognostic scores; use MELD 3.0 for current OPTN allocation.',
    whyUse: 'The original MELD model is the historical foundation for later MELD-Na and MELD 3.0 models, but its four-variable formula should not be treated as current allocation policy.',
    inputs: [
      numberInput('bili', 'Bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, exampleValue: 2.0, helpText: 'Total bilirubin in mg/dL; this historical implementation floors values below 1.0.' }),
      numberInput('inr', 'INR', { min: 0.8, max: 20, step: 0.1, exampleValue: 1.5, helpText: 'This historical implementation floors INR below 1.0.' }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.1, max: 15, step: 0.1, exampleValue: 1.0, helpText: 'Historical MELD handling: floor at 1.0, cap at 4.0; dialysis ≥2× in the past week (or 24 h CVVHD) sets Cr to 4.0.' }),
      yesNo('dialysis', 'Dialysis ≥2 times in past week (or 24h CVVHD)', null, 'Historical MELD handling sets creatinine to 4.0 mg/dL; this is not the current MELD 3.0 creatinine rule.', false),
    ],
    calculate(values) {
      let bili = Math.max(num(values.bili, 2), 1);
      let inr = Math.max(num(values.inr, 1.5), 1);
      let cr = Math.max(num(values.creat, 1), 1);
      // Dialysis ≥2× in past week (or continuous RRT) → creatinine fixed at 4.0; also cap Cr at 4.0
      if (bool(values.dialysis) || cr > 4) cr = 4;
      const meld = round(10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.12 * Math.log(inr) + 0.643), 0);
      const score = Math.max(6, Math.min(40, meld));
      const r = riskFromThresholds(score, [
        { max: 9, level: 'low', label: 'Lower risk', interpretation: '3-month mortality relatively low historically.' },
        { max: 19, level: 'moderate', label: 'Intermediate', interpretation: 'Rising mortality; specialist/transplant center involvement often needed.' },
        { max: 29, level: 'high', label: 'High', interpretation: 'High short-term mortality without transplant/support.' },
        { max: 40, level: 'critical', label: 'Very high', interpretation: 'Very high 3-month mortality; urgent transplant evaluation.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Original four-variable MELD = 10×[0.957×ln(Cr)+0.378×ln(bili)+1.12×ln(INR)+0.643], capped 6–40.',
      validation: 'Historical prognostic model; not the current OPTN allocation formula, which is MELD 3.0.',
      references: [{ title: 'A model to predict survival in patients with end-stage liver disease', citation: 'Kamath PS et al. Hepatology. 2001', year: 2001, pmid: '11172350',
          doi: '10.1053/jhep.2001.22172', }],
    },
    nextSteps: [
      { condition: 'Historical MELD ≥15', actions: ['Use the current MELD 3.0 calculator for allocation assessment', 'Manage complications of cirrhosis'] },
    ],
  },
  {
    id: 'meld-na',
    name: 'MELD 3.0 (OPTN)',
    shortName: 'MELD 3.0',
    description: 'Current OPTN MELD 3.0 allocation score (bilirubin, sodium, INR, albumin, creatinine, age at registration, sex, dialysis). The route id meld-na is historical: this is not the 2016 MELD-Na formula.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'transplant', 'sodium', 'meld', 'meld-3.0', 'hepatology', 'liver failure'],
    whenToUse: 'Candidates age 12 years or older being assessed with the current OPTN liver-allocation model; use age at waitlist registration to select the adult versus adolescent formula.',
    whyUse: 'Current OPTN allocation model, implemented July 13, 2023, incorporating sex, albumin, sodium, bilirubin, INR, and creatinine interactions to estimate medical urgency.',
    isQuestionnaire: true,
    questionnaire: {
      directInputIds: ['directMeld'],
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      activeInputIdsByMode: {
        labs: ['age', 'sex', 'bili', 'inr', 'albumin', 'creat', 'na', 'dialysis'],
        direct: ['directMeld'],
      },
    },
    inputs: [
      selectInput('entryMode', 'Input mode', [
        { label: 'Primary OPTN laboratory values', value: 'labs' },
        { label: 'Enter precomputed MELD 3.0 score', value: 'direct' },
      ], 'labs', 'Primary values runs the OPTN MELD 3.0 equation from labs, age, sex, and dialysis; the precomputed branch accepts an existing MELD 3.0 score and skips the formula.'),
      numberInput('age', 'Age at waitlist registration', { unit: 'years', min: 12, max: 120, step: 1, exampleValue: 55, helpText: 'Use age at registration: adult formula at ≥18 years; adolescent formula at 12–17 years.' }),
      selectInput('sex', 'Sex for MELD 3.0 calculation', [
        { label: 'Male', value: 'male' },
        { label: 'Female (+1.33 adult points)', value: 'female' },
      ], 'male', 'Adult female: +1.33. Adolescent (12–17) constant is 7.33, which already includes the 1.33 for both sexes; do not add 1.33 again.'),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, exampleValue: 1.5, helpText: 'Values below 1.0 mg/dL are set to 1.0 per OPTN policy.' }),
      numberInput('inr', 'INR', { min: 0.8, max: 15, step: 0.01, exampleValue: 1.2, helpText: 'Values below 1.0 are set to 1.0 per OPTN policy.' }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 0.1, max: 6, step: 0.1, exampleValue: 3.0, helpText: 'Bounded to 1.5–3.5 g/dL per OPTN policy.' }),
      numberInput('creat', 'Serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.1, max: 20, step: 0.1, exampleValue: 1.2, helpText: 'Values below 1.0 are set to 1.0; values above 3.0 are set to 3.0. Dialysis also sets creatinine to 3.0.' }),
      numberInput('na', 'Serum sodium', { unit: 'mEq/L', min: 100, max: 160, step: 1, exampleValue: 135, helpText: 'Bounded to 125–137 mEq/L per OPTN policy.' }),
      yesNo('dialysis', 'Dialysis ≥2 times or ≥24h CVVHD within prior 7 days', 0, 'If yes, serum creatinine is set to 3.0 mg/dL. OPTN policy specifies dialysis twice or 24 hours of CVVHD; CVVH/SLED are not interchangeable terms here.', false),
      numberInput('directMeld', 'Precomputed MELD 3.0 score (6–40)', { min: 6, max: 40, exampleValue: 15, helpText: 'Only used when "Enter precomputed MELD 3.0 score" is selected; do not apply a second sodium adjustment.' }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'labs');
      const age = Math.max(12, Math.min(120, Math.round(num(values.age, 55))));
      const sex = String(values.sex ?? 'male');
      const adult = age >= 18;
      let meld = 15;
      let rawMeld = 15;
      let serumNa = 135;
      let effCr = 1.0;
      let effBili = 1.0;
      let effInr = 1.0;
      let effAlbumin = 3.5;
      const dial = bool(values.dialysis);

      if (mode === 'labs') {
        effBili = Math.max(1.0, num(values.bili, 1.0));
        effInr = Math.max(1.0, num(values.inr, 1.0));
        effCr = dial ? 3.0 : Math.min(3.0, Math.max(1.0, num(values.creat, 1.0)));
        serumNa = Math.max(125, Math.min(137, num(values.na, 135)));
        effAlbumin = Math.max(1.5, Math.min(3.5, num(values.albumin, 3.5)));

        const sexAdjustment = adult && sex === 'female' ? 1.33 : 0;
        const ageConstant = adult ? 6 : 7.33;
        rawMeld = sexAdjustment +
          4.56 * Math.log(effBili) +
          0.82 * (137 - serumNa) -
          0.24 * (137 - serumNa) * Math.log(effBili) +
          9.09 * Math.log(effInr) +
          11.14 * Math.log(effCr) +
          1.85 * (3.5 - effAlbumin) -
          1.83 * (3.5 - effAlbumin) * Math.log(effCr) +
          ageConstant;
        meld = Math.max(6, Math.min(40, Math.round(rawMeld)));
      } else {
        meld = Math.max(6, Math.min(40, Math.round(num(values.directMeld, 15))));
        rawMeld = meld;
      }

      const r = riskFromThresholds(meld, [
        { max: 14, level: 'low', label: 'Lower allocation score (6–14)', interpretation: `MELD 3.0 ${meld}: lower position on the current OPTN 6–40 allocation scale; this educational band is not a standalone mortality estimate.` },
        { max: 19, level: 'moderate', label: 'Intermediate allocation score (15–19)', interpretation: `MELD 3.0 ${meld}: intermediate position on the current OPTN allocation scale; review transplant-center candidacy and complications.` },
        { max: 24, level: 'high', label: 'High allocation score (20–24)', interpretation: `MELD 3.0 ${meld}: high medical-urgency score on the current OPTN allocation scale; coordinate hepatology/transplant care.` },
        { max: 34, level: 'critical', label: 'Very high allocation score (25–34)', interpretation: `MELD 3.0 ${meld}: very high medical-urgency score; urgent transplant-center management is appropriate when clinically eligible.` },
        { max: 40, level: 'critical', label: 'Highest allocation score (35–40)', interpretation: `MELD 3.0 ${meld}: at the upper end of the current OPTN allocation scale; urgent transplant-center and critical-care assessment are appropriate when indicated.` },
      ]);

      const details = [
        { label: 'MELD 3.0 Score', value: `${meld}` },
        { label: 'Age band', value: adult ? 'Adult (≥18 years at registration)' : 'Adolescent (12–17 years at registration)' },
        { label: 'Sex term', value: adult ? (sex === 'female' ? '+1.33 points' : 'Not applied') : 'Not a separate term; included in adolescent constant 7.33' },
        { label: 'Calculation Mode', value: mode === 'labs' ? 'Primary OPTN Laboratory Values' : 'Precomputed MELD 3.0 Override' },
      ];

      if (mode === 'labs') {
        details.push(
          { label: 'Effective Sodium', value: `${serumNa} mEq/L` },
          { label: 'Effective Albumin', value: `${effAlbumin} g/dL` },
          { label: 'Effective Creatinine', value: `${effCr} mg/dL ${dial ? '(dialysis rule applied)' : ''}` },
          { label: 'Effective Bilirubin', value: `${effBili} mg/dL` },
          { label: 'Effective INR', value: `${effInr}` },
          { label: 'Unrounded formula result', value: `${round(rawMeld, 2)}` },
        );
      }

      return {
        score: meld,
        unit: 'points (6–40)',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'Current OPTN MELD 3.0 for adults (≥18 at registration) = 1.33 if female + 4.56×ln(bilirubin) + 0.82×(137−sodium) − 0.24×(137−sodium)×ln(bilirubin) + 9.09×ln(INR) + 11.14×ln(creatinine) + 1.85×(3.5−albumin) − 1.83×(3.5−albumin)×ln(creatinine) + 6. For ages 12–17, use the laboratory terms plus constant 7.33 only (7.33 = 6 + 1.33 already includes the 1.33 for both sexes; do not add 1.33 again). Values are bounded per OPTN policy, then rounded to the nearest whole number and capped at 6–40.',
      formula: 'MELD 3.0 = sex term + 4.56×ln(Bili) + 0.82×(137−Na) − 0.24×(137−Na)×ln(Bili) + 9.09×ln(INR) + 11.14×ln(Cr) + 1.85×(3.5−Alb) − 1.83×(3.5−Alb)×ln(Cr) + age-band constant',
      validation: 'Current OPTN Policy 9.1.D; implemented July 13, 2023. This calculator is an educational aid and does not replace the official OPTN system.',
      references: [
        {
          title: 'OPTN Policies — Policy 9.1.D MELD Score',
          citation: 'Organ Procurement and Transplantation Network; Policy 9.1.D (MELD 3.0, implemented July 13, 2023)',
          year: 2025,
          url: 'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn-policies.pdf',
        },
        {
          title: 'MELD 3.0: The Model for End-Stage Liver Disease Updated for the Modern Era',
          citation: 'Kim WR et al. Gastroenterology. 2021',
          year: 2021,
          pmid: '34481845',
          doi: '10.1053/j.gastro.2021.08.050',
        },
      ],
    },
    nextSteps: [
      { condition: 'MELD 3.0 ≥15', actions: ['Referral to liver transplant center when appropriate', 'Screen for varices and HCC', 'Manage complications of cirrhosis'] },
      { condition: 'MELD 3.0 ≥25', actions: ['Urgent transplant-center review', 'ICU / hepatology admission if acute decompensation', 'Infection / SBP screen'] },
    ],
    pearls: [
      'The URL/id meld-na is historical (pre-2023 MELD-Na route). The formula here is OPTN Policy 9.1.D MELD 3.0, not MELD-Na (Kim/UNOS 2016: MELD + 1.32×(137−Na) − 0.033×MELD×(137−Na) when MELD >11).',
      'Do not apply the old MELD-Na sodium adjustment on top of a MELD 3.0 score.',
      'OPTN policy floors bilirubin, INR, and creatinine at 1.0; caps creatinine at 3.0 (or sets it to 3.0 for the specified dialysis criteria), bounds sodium to 125–137, and bounds albumin to 1.5–3.5.',
    ],
  },
  {
    id: 'glasgow-blatchford',
    name: 'Glasgow-Blatchford Score (GBS)',
    shortName: 'Glasgow-Blatchford',
    description: 'Risk stratifies upper GI bleed for outpatient vs inpatient care.',
    category: 'gastroenterology',
    tags: ['ugib', 'bleed', 'gi'],
    whenToUse: 'Adults with suspected upper GI bleeding.',
    whyUse: 'Score 0–1 identifies very low-risk patients often safe for outpatient management.',
    inputs: [
      selectInput(
        'bun',
        'BUN (mg/dL)',
        [
          { label: '<18.2 (0)', value: 0, description: 'BUN <18.2 mg/dL (urea <6.5 mmol/L)' },
          { label: '18.2–22.3 (2)', value: 2, description: 'BUN ≥18.2 and <22.4 mg/dL (urea ≥6.5 and <8.0 mmol/L)' },
          { label: '22.4–27.9 (3)', value: 3, description: 'BUN ≥22.4 and <28.0 mg/dL (urea ≥8.0 and <10.0 mmol/L)' },
          { label: '28.0–69.9 (4)', value: 4, description: 'BUN ≥28.0 and <70.0 mg/dL (urea ≥10.0 and <25.0 mmol/L). BUN 28.0 = 4 points.' },
          { label: '≥70 (6)', value: 6, description: 'BUN ≥70.0 mg/dL (urea ≥25.0 mmol/L). BUN 70.0 = 6 points.' },
        ],
        0,
        'Blood urea nitrogen in mg/dL. Urea mmol/L ≈ BUN ÷ 2.8 (original Blatchford used urea).',
      ),
      selectInput(
        'hbMale',
        'Hemoglobin (g/dL) — sex-specific bands',
        [
          { label: 'Male ≥13 or female ≥12 (0)', value: 0, description: 'At or above the sex-specific normal floor' },
          {
            label: 'Female 10–11.9 or male 12–12.9 (1)',
            value: 1,
            description: 'Women with Hb 10–11.9 belong here (1 point), not in the male-only 3-point band',
          },
          {
            label: 'Male 10–11.9 only (3)',
            value: 3,
            description: 'Men only. Women with Hb 10–11.9 use the 1-point option unless Hb <10',
          },
          { label: '<10 either sex (6)', value: 6, description: 'Hb <10 g/dL in men or women' },
        ],
        0,
        'Use the band that matches this patient’s sex. A woman with Hb 10–11.9 scores 1, not 3.',
      ),
      selectInput('sbp', 'Systolic BP (mmHg)', [
        { label: '≥110 (0)', value: 0 },
        { label: '100–109 (1)', value: 1 },
        { label: '90–99 (2)', value: 2 },
        { label: '<90 (3)', value: 3 },
      ], 0, 'Systolic BP in mmHg at this presentation.'),
      yesNo('hr100', 'Heart rate ≥100 bpm', 1, 'Pulse ≥100 beats/min at this presentation.', true),
      yesNo('melena', 'Melena', 1, 'Black tarry stool attributed to the current bleed (not just dark stool from iron/bismuth).', true),
      yesNo('syncope', 'Syncope', 2, 'Transient loss of consciousness with the current bleed presentation.', false),
      yesNo(
        'liver',
        'Hepatic disease',
        2,
        'Known history or clinical/laboratory evidence of chronic or acute liver disease (Blatchford 2000).',
        false,
      ),
      yesNo(
        'heart',
        'Cardiac failure',
        2,
        'Known history or clinical/radiographic evidence of heart failure.',
        false,
      ),
    ],
    calculate(values) {
      const score =
        num(values.bun) +
        num(values.hbMale) +
        num(values.sbp) +
        (bool(values.hr100) ? 1 : 0) +
        (bool(values.melena) ? 1 : 0) +
        (bool(values.syncope) ? 2 : 0) +
        (bool(values.liver) ? 2 : 0) +
        (bool(values.heart) ? 2 : 0);
      // ACG 2021: GBS 0–1 very low risk for outpatient discharge
      if (score <= 1) {
        return {
          score,
          label: 'Very low risk',
          interpretation: `GBS ${score}: very low risk of needing hospital-based intervention; outpatient management often safe (ACG suggests discharge with outpatient follow-up for GBS 0–1).`,
          riskLevel: 'low',
        };
      }
      return {
        score,
        label: score <= 3 ? 'Low–moderate risk' : score <= 5 ? 'Moderate risk' : 'Higher risk',
        interpretation: `GBS ${score}: higher likelihood of needing transfusion/endoscopy/surgery — typically admit.`,
        riskLevel: score >= 6 ? 'high' : 'moderate',
      };
    },
    evidence: {
      summary: 'GBS predicts need for hospital-based intervention in UGIB better than Rockall for this purpose. GBS 0–1 is the modern very-low-risk band for outpatient pathways.',
      validation: 'Multiple ED validations; ACG 2021 supports GBS 0–1 for early discharge consideration.',
      references: [{ title: 'A risk score to predict need for treatment for upper GI haemorrhage', citation: 'Blatchford O et al. Lancet. 2000', year: 2000, pmid: '11073021',
          doi: '10.1016/S0140-6736(00)02816-6', }],
    },
    nextSteps: [
      { condition: 'GBS ≤1', actions: ['Consider discharge with early GI follow-up', 'PPI as indicated', 'Return precautions'] },
      { condition: 'GBS ≥2', actions: ['Admit', 'Resuscitation', 'Urgent endoscopy timing per severity'] },
    ],
  },
  {
    id: 'rockall',
    name: 'Rockall Score (Pre-endoscopy)',
    shortName: 'Rockall',
    description: 'Mortality risk in UGIB using clinical variables (pre-endoscopy version).',
    category: 'gastroenterology',
    tags: ['ugib', 'mortality'],
    whenToUse: 'Upper GI bleed mortality risk stratification.',
    whyUse: 'Complements GBS; full Rockall includes endoscopic findings.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<60 (0)', value: 0 },
        { label: '60–79 (1)', value: 1 },
        { label: '≥80 (2)', value: 2 },
      ], 1, 'Age band for the pre-endoscopy Rockall score.'),
      selectInput('shock', 'Shock', [
        { label: 'No shock HR≤100 SBP≥100 (0)', value: 0, description: 'HR ≤100 bpm and SBP ≥100 mmHg' },
        { label: 'Tachycardia HR>100 SBP≥100 (1)', value: 1, description: 'HR >100 bpm with SBP still ≥100 mmHg' },
        { label: 'Hypotension SBP<100 (2)', value: 2, description: 'SBP <100 mmHg (regardless of HR)' },
      ], 0, 'Use presentation HR (bpm) and SBP (mmHg). Hypotension outranks tachycardia.'),
      selectInput(
        'comorbid',
        'Comorbidity',
        [
          { label: 'None (0)', value: 0, description: 'No major comorbidity' },
          {
            label: 'Heart failure, IHD, other major (2)',
            value: 2,
            description:
              'Cardiac failure, ischemic heart disease, or any other major comorbidity of similar severity (e.g. COPD on home O₂, CVA with residual deficit)',
          },
          {
            label: 'Renal/liver failure or metastatic cancer (3)',
            value: 3,
            description: 'Renal failure, liver failure, or disseminated malignancy',
          },
        ],
        0,
        'Score 2 for HF, IHD, or any comparably major comorbidity. Score 3 only for renal failure, liver failure, or disseminated malignancy — not for stable chronic disease of lesser severity.',
      ),
    ],
    calculate(values) {
      const score = num(values.age) + num(values.shock) + num(values.comorbid);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Lower mortality risk', interpretation: 'Pre-endoscopy Rockall low; still complete full score after endoscopy when available.' },
        { max: 4, level: 'moderate', label: 'Intermediate', interpretation: 'Intermediate risk — inpatient care and timely endoscopy.' },
        { max: 7, level: 'high', label: 'High', interpretation: 'High mortality risk — aggressive resuscitation and urgent endoscopy.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Rockall score predicts mortality after UGIB; complete score adds diagnosis and stigmata of bleeding.',
      validation: 'National UK audit derivation/validation.',
      references: [{ title: 'Risk assessment after acute upper gastrointestinal haemorrhage', citation: 'Rockall TA et al. Gut. 1996', year: 1996, pmid: '8675081',
          doi: '10.1136/gut.38.3.316', }],
    },
    nextSteps: [{ condition: 'High score', actions: ['Resuscitate', 'Urgent endoscopy', 'ICU if unstable'] }],
  },
  {
    id: 'alvarado',
    name: 'Alvarado Score (Appendicitis)',
    shortName: 'Alvarado',
    description: 'Clinical probability of acute appendicitis.',
    category: 'emergency',
    tags: ['appendicitis', 'abdominal pain'],
    whenToUse: 'Suspected appendicitis to guide imaging/surgery decisions.',
    whyUse: 'Structured clinical probability; imaging still common.',
    inputs: [
      yesNo('migration', 'Migration of pain to RLQ', 1, 'Yes if pain began elsewhere (typically periumbilical or epigastric) and later moved to the right lower quadrant.', true),
      yesNo('anorexia', 'Anorexia', 1, 'Loss of appetite with this illness.', true),
      yesNo('nausea', 'Nausea / vomiting', 1, 'Either nausea or vomiting counts (Alvarado MANTRELS).', true),
      yesNo('rlq', 'RLQ tenderness', 2, 'Tenderness maximal in the right lower quadrant (typically McBurney’s point).', true),
      yesNo('rebound', 'Rebound tenderness', 1, 'Pain on sudden release of RLQ pressure (Blumberg), not only on pressing.', false),
      yesNo('fever', 'Temperature ≥37.3°C', 1, 'Alvarado fever cutoff is ≥37.3°C (99.1°F) — lower than a 38.0°C “fever” rule.', true),
      yesNo('leukocytosis', 'Leukocytosis >10,000/µL', 2, 'WBC >10,000/µL (10 × 10⁹/L).', true),
      yesNo('leftshift', 'Left shift (neutrophilia)', 1, 'Yes if neutrophil left shift / neutrophilia (Alvarado: typically PMNs ≥75%).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.migration) ? 1 : 0) +
        (bool(values.anorexia) ? 1 : 0) +
        (bool(values.nausea) ? 1 : 0) +
        (bool(values.rlq) ? 2 : 0) +
        (bool(values.rebound) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.leukocytosis) ? 2 : 0) +
        (bool(values.leftshift) ? 1 : 0);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Low probability', interpretation: 'Appendicitis less likely; consider alternatives / observation.' },
        { max: 6, level: 'moderate', label: 'Intermediate', interpretation: 'Possible appendicitis — imaging often warranted.' },
        { max: 10, level: 'high', label: 'High probability', interpretation: 'High likelihood — surgical consultation; imaging per practice.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MANTRELS mnemonic: Migration, Anorexia, Nausea, Tenderness RLQ, Rebound, Elevated temp, Leukocytosis, Shift.',
      validation: 'Multiple validations; variable performance — imaging remains important.',
      references: [{ title: 'A practical score for the early diagnosis of acute appendicitis', citation: 'Alvarado A. Ann Emerg Med. 1986', year: 1986, pmid: '3963537',
          doi: '10.1016/s0196-0644(86)80993-3', }],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Reassess', 'Consider gyn/GU alternatives'] },
      { condition: 'Intermediate–high', actions: ['CT/US/MRI per age/pregnancy', 'Surgical consult'] },
    ],
  },
  {
    id: 'ranson',
    name: "Ranson's Criteria (Admission)",
    shortName: "Ranson's",
    description: 'Pancreatitis severity using admission criteria (complete score needs 48h labs).',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'severity'],
    whenToUse: 'Acute pancreatitis severity (admission portion shown).',
    whyUse: 'Classic criteria; BISAP/APACHE often more practical early.',
    inputs: [
      yesNo('age', 'Age > 55 years', 1, 'Admission (not 48-hour) criteria. Complete Ranson also needs 48 h Hct drop, BUN rise, Ca, PaO₂, base deficit, and fluid sequestration — not in this tool.', true),
      yesNo('wbc', 'WBC > 16,000/µL', 1, 'Admission WBC >16,000/µL (16 × 10⁹/L).', true),
      yesNo('glu', 'Glucose > 200 mg/dL', 1, 'Admission glucose >200 mg/dL (≈ 11.1 mmol/L).', false),
      yesNo('ldh', 'LDH > 350 U/L', 1, 'Admission LDH >350 U/L.', true),
      yesNo('ast', 'AST > 250 U/L', 1, 'Admission AST (SGOT) >250 U/L.', false),
    ],
    calculate(values) {
      const score = ['age', 'wbc', 'glu', 'ldh', 'ast'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      return {
        score,
        label: `Admission criteria met: ${score}/5`,
        interpretation: 'Add 48-hour criteria (Hct drop, BUN rise, Ca, PaO₂, base deficit, fluid sequestration) for full Ranson. ≥3 total suggests severe disease.',
        riskLevel: score >= 3 ? 'high' : score >= 1 ? 'moderate' : 'low',
      };
    },
    evidence: {
      summary: 'Ranson criteria: 5 at admission + 6 at 48 hours predict pancreatitis mortality.',
      validation: 'Historical standard; requires 48h for completion.',
      references: [{ title: 'Prognostic signs and the role of operative management in acute pancreatitis', citation: 'Ranson JH et al. Surg Gynecol Obstet. 1974', year: 1974, pmid: '4834279' }],
    },
    nextSteps: [
      { condition: 'Any acute pancreatitis', actions: ['Aggressive early fluids (goal-directed)', 'Early feeding as tolerated', 'ERCP if cholangitis/obstruction'] },
    ],
  },
  {
    id: 'bisap',
    name: 'BISAP Score',
    shortName: 'BISAP',
    description: 'Bedside Index for Severity in Acute Pancreatitis.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'severity'],
    whenToUse: 'Early severity assessment in acute pancreatitis (first 24h).',
    whyUse: 'Simple, uses data available early; predicts mortality.',
    inputs: [
      yesNo('bun', 'BUN > 25 mg/dL', 1, 'Use findings from the first 24 hours of presentation (Wu 2008). BUN >25 mg/dL (urea ≈ 8.9 mmol/L).', true),
      yesNo(
        'ams',
        'Impaired mental status',
        1,
        'Yes if GCS <15, or disorientation, lethargy, or coma (Wu 2008).',
        false,
      ),
      yesNo(
        'sirs',
        'SIRS (≥2 criteria)',
        1,
        'Yes if ≥2 of: temperature <36 or >38°C; HR >90; RR >20; WBC <4 or >12 ×10⁹/L or >10% bands.',
        true,
      ),
      yesNo('age', 'Age > 60 years', 1, 'Age above 60 years scores 1 point (61 or older). BISAP totals of 3 or more mark higher mortality and organ-failure risk in the first 24 hours.', true),
      yesNo('pleural', 'Pleural effusion', 1, 'Yes if pleural effusion on CXR, CT, or ultrasound (any side).', false),
    ],
    calculate(values) {
      const score = ['bun', 'ams', 'sirs', 'age', 'pleural'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Lower mortality risk', interpretation: 'BISAP ≤2: lower risk of mortality and organ failure.' },
        { max: 5, level: 'high', label: 'Higher mortality risk', interpretation: 'BISAP ≥3: higher risk — closer monitoring, possible ICU.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'BISAP: BUN, mental status, SIRS, age, pleural effusion.',
      validation: 'Validated for mortality prediction comparable to more complex scores.',
      references: [{ title: 'The early prediction of mortality in acute pancreatitis: a large population-based study', citation: 'Wu BU et al. Gut. 2008', year: 2008, pmid: '18519429',
          doi: '10.1136/gut.2008.152702', }],
    },
    nextSteps: [{ condition: 'BISAP ≥3', actions: ['Monitor organ failure', 'ICU consideration', 'Supportive care optimization'] }],
  },
  {
    id: 'abcd2',
    name: 'ABCD² Score',
    shortName: 'ABCD²',
    description: 'Stroke risk after TIA (2-day risk stratification).',
    category: 'neurology',
    tags: ['tia', 'stroke', 'secondary prevention'],
    whenToUse: 'Patients with recent TIA symptoms.',
    whyUse: 'Guides urgency of workup (though urgent workup increasingly universal).',
    inputs: [
      yesNo('age', 'Age ≥ 60', 1, 'Age at the TIA presentation.', true),
      yesNo('bp', 'BP ≥140/90 at presentation', 1, 'Yes if SBP ≥140 mmHg or DBP ≥90 mmHg at this presentation (either counts — both are not required).', true),
      selectInput('clinical', 'Clinical features', [
        { label: 'Other symptoms (0)', value: 0, description: 'Sensory, visual, vertigo, or other TIA symptoms without speech disturbance or unilateral weakness' },
        { label: 'Speech disturbance without weakness (1)', value: 1, description: 'Dysarthria or aphasia without focal motor weakness' },
        { label: 'Unilateral weakness (2)', value: 2, description: 'Focal motor weakness of face, arm, and/or leg on one side (highest weight; do not also add the speech item)' },
      ], 0, 'Score the single highest-weight feature of the TIA. Unilateral weakness outranks speech disturbance.'),
      selectInput('duration', 'Duration of symptoms', [
        { label: '<10 min (0)', value: 0 },
        { label: '10–59 min (1)', value: 1 },
        { label: '≥60 min (2)', value: 2 },
      ], 0, 'Duration of the longest TIA spell being scored (minutes until symptoms fully resolved).'),
      yesNo('dm', 'Diabetes', 1, 'Known diagnosis of diabetes mellitus (treated or documented).', false),
    ],
    calculate(values) {
      const score = (bool(values.age) ? 1 : 0) + (bool(values.bp) ? 1 : 0) + num(values.clinical) + num(values.duration) + (bool(values.dm) ? 1 : 0);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'low', label: 'Low risk (0–3)', interpretation: 'Lower short-term stroke risk historically (~1% at 2 days) — still needs timely workup.' },
        { max: 5, level: 'moderate', label: 'Moderate (4–5)', interpretation: 'Moderate 2-day stroke risk (~4%).' },
        { max: 7, level: 'high', label: 'High (6–7)', interpretation: 'High short-term stroke risk (~8% at 2 days). Urgent evaluation.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'ABCD² predicts short-term stroke after TIA using Age, BP, Clinical features, Duration, Diabetes.',
      validation: 'Widely studied; dual antiplatelet and urgent secondary prevention now standard regardless of score for many TIAs.',
      references: [{ title: 'Validation and refinement of scores to predict very early stroke risk after TIA', citation: 'Johnston SC et al. Lancet. 2007', year: 2007, pmid: '17258668',
          doi: '10.1016/S0140-6736(07)60150-0', }],
    },
    nextSteps: [
      { condition: 'All TIA', actions: ['Urgent vascular imaging', 'ECG/AF screen', 'Antiplatelet therapy', 'Statin and risk-factor control'] },
    ],
  },
  {
    id: 'nihss',
    name: 'NIH Stroke Scale (NIHSS)',
    shortName: 'NIHSS',
    description: 'Stroke severity scale — enter each domain score for live composite (0–42).',
    category: 'neurology',
    tags: ['stroke', 'nihss'],
    whenToUse: 'Acute ischemic stroke severity and communication.',
    whyUse: 'Standard for tPA/thrombectomy trials and serial exams.',
    inputs: [
      selectInput(
        'loc',
        '1a. Level of consciousness (0–3)',
        [
          { label: '0 — Alert', value: 0, points: 0, description: 'Keenly responsive' },
          { label: '1 — Not alert, arousable', value: 1, points: 1, description: 'Arousable by minor stimulation to obey, answer, or respond' },
          { label: '2 — Not alert, obtunded', value: 2, points: 2, description: 'Requires repeated or strong/painful stimulation for non-stereotyped movements' },
          { label: '3 — Unresponsive / reflex only', value: 3, points: 3, description: 'Reflex motor or autonomic responses only, or flaccid and areflexic' },
        ],
        0,
        'Must pick a score even if ET tube, language barrier, or bandages. Score 3 only if no movement other than reflex posturing to noxious stimulation.',
      ),
      selectInput(
        'locQ',
        '1b. Ask month and age (0–2)',
        [
          { label: '0 — Both questions right', value: 0, points: 0, description: 'Month and age both correct on first attempt' },
          { label: '1 — One question right (or intubated / dysarthria / language barrier)', value: 1, points: 1, description: 'One correct, or untestable due to ET tube, severe dysarthria, trauma, or language barrier' },
          { label: '2 — Neither correct (or aphasic)', value: 2, points: 2, description: 'Neither correct, or aphasic / stuporous with no comprehension' },
        ],
        0,
        'Ask: “What month is it?” and “How old are you?” Grade the first answer. Do not coach. Not date, place, or president.',
      ),
      selectInput(
        'locC',
        "1c. 'Open/close eyes' and 'grip/release' (0–2)",
        [
          { label: '0 — Performs both tasks', value: 0, points: 0, description: 'Both one-step commands performed' },
          { label: '1 — Performs 1 task', value: 1, points: 1, description: 'One command performed (credit an unequivocal attempt limited by weakness)' },
          { label: '2 — Performs 0 tasks', value: 2, points: 2, description: 'Neither command performed' },
        ],
        0,
        'Commands: (1) open and close the eyes; (2) grip and release the non-paretic hand. Pantomime if there is a communication barrier. Substitute another one-step command if the hand is unusable. Do not coach.',
      ),
      selectInput(
        'gaze',
        '2. Horizontal extraocular movements (0–2)',
        [
          { label: '0 — Normal', value: 0, points: 0, description: 'Voluntary or oculocephalic gaze intact' },
          { label: '1 — Partial gaze palsy (can be overcome)', value: 1, points: 1, description: 'Abnormal gaze in one or both eyes, but not forced deviation or total paresis; includes isolated III/IV/VI and gaze that corrects with oculocephalic reflex' },
          { label: '2 — Forced deviation (not overcome by oculocephalic)', value: 2, points: 2, description: 'Forced deviation or total gaze paresis not overcome by oculocephalic maneuver' },
        ],
        0,
        'Only assess horizontal gaze. Test voluntary or oculocephalic (doll’s-eye) gaze. Do not use calorics. Isolated cranial-nerve palsy (e.g. III, IV, VI) scores 1.',
      ),
      selectInput(
        'visual',
        '3. Visual fields (0–3)',
        [
          { label: '0 — No loss', value: 0, points: 0, description: 'No visual loss by confrontation' },
          { label: '1 — Partial hemianopia', value: 1, points: 1, description: 'Partial (quadrantanopia or clear asymmetry, including extinction)' },
          { label: '2 — Complete hemianopia', value: 2, points: 2, description: 'Dense visual loss in an entire hemifield' },
          { label: '3 — Bilateral / blind', value: 3, points: 3, description: 'Bilateral hemianopia, including cortical blindness; any-cause blindness scores 3' },
        ],
        0,
        'Confrontation visual fields, upper and lower quadrants. If unilaterally blind, test the remaining eye. Patients who are blind from any cause score 3.',
      ),
      selectInput(
        'facial',
        '4. Facial palsy — show teeth / raise brows / close eyes (0–3)',
        [
          { label: '0 — Normal', value: 0, description: 'Symmetrical movement' },
          { label: '1 — Minor', value: 1, description: 'Flattened nasolabial fold or asymmetrical smile' },
          { label: '2 — Partial', value: 2, description: 'Total or near-total paralysis of the lower face' },
          { label: '3 — Complete', value: 3, description: 'Absent movement in upper and lower face (one or both sides)' },
        ],
        0,
        'Ask the patient to show teeth or raise eyebrows and close eyes. If stuporous, score grimace to noxious stimulation.',
      ),
      selectInput(
        'armL',
        '5a. Left arm hold 90°/45° × 10 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 90° sitting or 45° supine for full 10 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 10 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 90°/45°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Palms down, 90° sitting or 45° supine × 10 s; test the non-paretic arm first. Amputation or shoulder fusion = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'armR',
        '5b. Right arm hold 90°/45° × 10 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 90° sitting or 45° supine for full 10 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 10 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 90°/45°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Palms down, 90° sitting or 45° supine × 10 s; test the non-paretic arm first. Amputation or shoulder fusion = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'legL',
        '6a. Left leg hold 30° × 5 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 30° supine for full 5 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 5 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 30°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Supine, raise to 30° × 5 s; test the non-paretic leg first. Hip fusion or amputation = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'legR',
        '6b. Right leg hold 30° × 5 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 30° supine for full 5 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 5 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 30°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Supine, raise to 30° × 5 s; test the non-paretic leg first. Hip fusion or amputation = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'ataxia',
        '7. Finger-nose and heel-shin ataxia (0–2)',
        [
          { label: '0 — Absent', value: 0, description: 'No ataxia, or paralyzed / does not understand (score 0, not UN)' },
          { label: '1 — One limb', value: 1, description: 'Ataxia in one limb, out of proportion to weakness' },
          { label: '2 — Two limbs', value: 2, description: 'Ataxia in two limbs, out of proportion to weakness' },
        ],
        0,
        'Finger-nose-finger and heel-shin. Score only if out of proportion to weakness. Paralyzed or does not understand → 0. Amputation or joint fusion = UN off-form.',
      ),
      selectInput(
        'sensory',
        '8. Pinprick sensory (0–2)',
        [
          { label: '0 — Normal', value: 0, description: 'No sensory loss to pinprick' },
          { label: '1 — Mild–moderate loss', value: 1, description: 'Aware of being touched, but pinprick is less sharp or dull on the affected side' },
          { label: '2 — Severe / total loss', value: 2, description: 'Unaware of being touched on face, arm, and leg' },
        ],
        0,
        'Pinprick (or noxious stimulus if consciousness is impaired). Test face, arm, and leg. Stuporous / aphasic: grimace or withdrawal counts as awareness.',
      ),
      selectInput(
        'language',
        '9. Best language — picture, naming, reading (0–3)',
        [
          { label: '0 — No aphasia', value: 0, description: 'Normal comprehension and expression' },
          { label: '1 — Mild–moderate', value: 1, description: 'Loss of fluency or comprehension, but examiner can still identify picture or naming-card content from the response' },
          { label: '2 — Severe', value: 2, description: 'Fragmentary expression; listener carries the burden; cannot identify materials from the response' },
          { label: '3 — Mute / global', value: 3, description: 'No usable speech or auditory comprehension; also score 3 if item 1a is 3' },
        ],
        0,
        'Use the NIHSS cookie-theft picture, naming card, and sentence reading. If 1a LOC = 3, language scores 3. Coma / unresponsive = 3.',
      ),
      selectInput(
        'dysarthria',
        '10. Dysarthria — read/repeat word list (0–2)',
        [
          { label: '0 — Normal', value: 0, description: 'Clear articulation' },
          { label: '1 — Mild–moderate', value: 1, description: 'Slurs at least some words; understood with some difficulty' },
          { label: '2 — Severe / anarthric', value: 2, description: 'Unintelligible, mute, or anarthric (out of proportion to any aphasia)' },
        ],
        0,
        'Ask the patient to read or repeat: Mama, tip-top, fifty-fifty, thanks, huckleberry, baseball player, hula hoop. Intubated or other physical barrier = UN off-form (do not enter 0 or 2).',
      ),
      selectInput(
        'extinction',
        '11. Extinction / inattention (double simultaneous) (0–2)',
        [
          { label: '0 — No abnormality', value: 0, description: 'No inattention; aphasia attending to both sides scores 0' },
          { label: '1 — Mild (one modality)', value: 1, description: 'Inattention or extinction to bilateral simultaneous stimulation in one modality (visual, tactile, auditory, spatial, or personal)' },
          { label: '2 — Profound (more than one)', value: 2, description: 'Profound hemi-inattention in more than one modality, does not recognize own hand, or orients to only one side of space' },
        ],
        0,
        'Visual and tactile double simultaneous stimulation. This item is never UN. If the patient has a severe visual loss and the cutaneous stimuli are normal, score as 0.',
      ),
    ],
    calculate(values) {
      const keys = ['loc', 'locQ', 'locC', 'gaze', 'visual', 'facial', 'armL', 'armR', 'legL', 'legR', 'ataxia', 'sensory', 'language', 'dysarthria', 'extinction'];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Mild stroke', interpretation: 'NIHSS ≤4 often mild; still consider reperfusion if disabling deficit.' },
        { max: 15, level: 'moderate', label: 'Moderate', interpretation: 'Moderate stroke severity.' },
        { max: 20, level: 'high', label: 'Moderate–severe', interpretation: 'Moderate to severe stroke.' },
        { max: 42, level: 'critical', label: 'Severe', interpretation: 'Severe stroke — high risk of complications; aggressive supportive care.' },
      ]);
      return { score, ...r, details: [{ label: 'Max score', value: '42 (15 items; amputated/untestable limbs scored per NIH protocol)' }] };
    },
    evidence: {
      summary: 'NIHSS is the standard acute stroke neurologic deficit scale (0–42) with separate motor scores for each arm and leg.',
      validation: 'Excellent interrater reliability with trained examiners; predicts outcomes.',
      references: [{ title: 'Measurements of acute cerebral infarction: a clinical examination scale', citation: 'Brott T et al. Stroke. 1989', year: 1989, pmid: '2749846',
          doi: '10.1161/01.str.20.7.864', }],
    },
    nextSteps: [
      { condition: 'Acute ischemic stroke', actions: ['Door-to-CT/needle pathways', 'Consider thrombolysis/thrombectomy eligibility', 'Stroke unit care'] },
    ],
    pearls: [
      'UN (amputation, joint fusion, intubated dysarthria) is recorded off-scale — do not enter 4 or 2 as a substitute.',
      '1b questions are month and age only — not place or president. Aphasic patients score 2; intubated/language barrier score 1.',
      'Item 11 (extinction) is never UN. If 1a = 3, language is 3.',
    ],
  },
  {
    id: 'phq9',
    name: 'PHQ-9 Depression Screen',
    shortName: 'PHQ-9',
    description: 'Patient Health Questionnaire-9 for depression severity.',
    category: 'psychiatry',
    tags: ['depression', 'screening', 'phq'],
    whenToUse: 'Screening and monitoring major depression in primary care and specialty settings.',
    whyUse: 'Validated, brief, and widely integrated into workflows.',
    inputs: [
      ...[
        'Little interest or pleasure in doing things',
        'Feeling down, depressed, or hopeless',
        'Trouble falling or staying asleep, or sleeping too much',
        'Feeling tired or having little energy',
        'Poor appetite or overeating',
        'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        'Trouble concentrating on things, such as reading the newspaper or watching television',
        'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
        'Thoughts that you would be better off dead, or of hurting yourself in some way',
      ].map((label, i) =>
        selectInput(
          `q${i + 1}`,
          `${i + 1}. ${label}`,
          [
            { label: 'Not at all (0)', value: 0 },
            { label: 'Several days (1)', value: 1 },
            { label: 'More than half the days (2)', value: 2 },
            { label: 'Nearly every day (3)', value: 3 },
          ],
          0,
          'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        ),
      ),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 9; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'None–minimal', interpretation: 'None to minimal depression symptoms.' },
        { max: 9, level: 'low', label: 'Mild', interpretation: 'Mild depression — watchful waiting, lifestyle, reassess.' },
        { max: 14, level: 'moderate', label: 'Moderate', interpretation: 'Moderate depression — consider therapy ± pharmacotherapy.' },
        { max: 19, level: 'high', label: 'Moderately severe', interpretation: 'Moderately severe — active treatment indicated.' },
        { max: 27, level: 'critical', label: 'Severe', interpretation: 'Severe depression — intensive treatment; ensure safety planning.' },
      ]);
      const si = num(values.q9) > 0;
      return {
        score,
        ...r,
        recommendations: si ? ['Item 9 positive: assess suicide risk immediately', 'Safety plan / urgent psych if needed'] : ['Recheck periodically'],
        alerts: si ? ['Item 9 positive: thoughts of death or self-harm endorsed. Immediate clinical safety evaluation required.'] : undefined,
      };
    },
    evidence: {
      summary: 'PHQ-9 scores 0–27; ≥10 often used as depression treatment threshold.',
      validation: 'Extensive primary care validation (Kroenke et al.).',
      references: [{ title: 'The PHQ-9: validity of a brief depression severity measure', citation: 'Kroenke K et al. J Gen Intern Med. 2001', year: 2001, pmid: '11556941',
          doi: '10.1046/j.1525-1497.2001.016009606.x', }],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Clinical interview for MDD', 'Offer psychotherapy and/or antidepressant', 'Follow-up'] },
      { condition: 'Item 9 >0', actions: ['Immediate suicide risk assessment'] },
    ],
    pearls: [
      'PHQ-9 © Pfizer; free clinical use from phqscreeners.com — retain copyright notice.',
      'Item 9 (death/self-harm thoughts) is a safety screen regardless of total score.',
    ],
  },
  {
    id: 'gad7',
    name: 'GAD-7 Anxiety Screen',
    shortName: 'GAD-7',
    description: 'Generalized Anxiety Disorder 7-item scale.',
    category: 'psychiatry',
    tags: ['anxiety', 'gad', 'screening'],
    whenToUse: 'Screening and severity monitoring for generalized anxiety.',
    whyUse: 'Brief, validated anxiety measure.',
    inputs: [
      ...[
        'Feeling nervous, anxious, or on edge',
        'Not being able to stop or control worrying',
        'Worrying too much about different things',
        'Trouble relaxing',
        'Being so restless that it is hard to sit still',
        'Becoming easily annoyed or irritable',
        'Feeling afraid as if something awful might happen',
      ].map((label, i) =>
        selectInput(
          `q${i + 1}`,
          `${i + 1}. ${label}`,
          [
            { label: 'Not at all (0)', value: 0 },
            { label: 'Several days (1)', value: 1 },
            { label: 'More than half the days (2)', value: 2 },
            { label: 'Nearly every day (3)', value: 3 },
          ],
          0,
          'Over the last 2 weeks, how often have you been bothered by the following problems?',
        ),
      ),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 7; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Minimal', interpretation: 'Minimal anxiety symptoms.' },
        { max: 9, level: 'low', label: 'Mild', interpretation: 'Mild anxiety — monitor and supportive care.' },
        { max: 14, level: 'moderate', label: 'Moderate', interpretation: 'Moderate anxiety — consider therapy ± meds.' },
        { max: 21, level: 'high', label: 'Severe', interpretation: 'Severe anxiety — active treatment recommended.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'GAD-7 score ≥10 suggests possible GAD; also screens other anxiety disorders.',
      validation: 'Validated in primary care populations.',
      references: [{ title: 'A brief measure for assessing generalized anxiety disorder: the GAD-7', citation: 'Spitzer RL et al. Arch Intern Med. 2006', year: 2006, pmid: '16717171',
          doi: '10.1001/archinte.166.10.1092', }],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Diagnostic assessment', 'CBT / SSRI-SNRI as appropriate'] },
    ],
    pearls: [
      'GAD-7 © Pfizer; free clinical use from phqscreeners.com — retain copyright notice.',
    ],
  },
  {
    id: 'cage',
    name: 'CAGE Questionnaire',
    shortName: 'CAGE',
    description: 'Brief screen for alcohol use disorder.',
    category: 'psychiatry',
    tags: ['alcohol', 'substance', 'screening'],
    whenToUse: 'Primary care / ED screening for problem drinking.',
    whyUse: 'Very brief four-question screen.',
    inputs: [
      yesNo(
        'c',
        'Have you ever felt you should Cut down on your drinking?',
        1,
        'Lifetime (“ever”) question — not limited to the past year.',
        true,
      ),
      yesNo(
        'a',
        'Have people Annoyed you by criticizing your drinking?',
        1,
        'Lifetime (“ever”) question — not limited to the past year.',
        true,
      ),
      yesNo(
        'g',
        'Have you ever felt bad or Guilty about your drinking?',
        1,
        'Lifetime (“ever”) question — not limited to the past year.',
        false,
      ),
      yesNo(
        'e',
        'Have you ever had a drink first thing in the morning to steady your nerves or to get rid of a hangover (Eye-opener)?',
        1,
        'Lifetime (“ever”) question — not limited to the past year.',
        false,
      ),
    ],
    calculate(values) {
      const score = ['c', 'a', 'g', 'e'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 2) {
        return {
          score,
          label: 'Positive screen',
          interpretation: '≥2 positive: suggestive of alcohol use problems — further assessment (AUDIT) and counseling.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Negative / low',
        interpretation: 'Score <2: lower likelihood, but not exclusionary if clinical concern high.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'CAGE ≥2 has reasonable sensitivity/specificity for alcohol dependence in many settings.',
      validation: 'Classic primary care screen; AUDIT is more comprehensive.',
      references: [{ title: 'Detecting alcoholism: the CAGE questionnaire', citation: 'Ewing JA. JAMA. 1984', year: 1984, pmid: '6471323',
          doi: '10.1001/jama.252.14.1905', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Full substance history', 'Labs if indicated', 'Brief intervention / referral to treatment'] },
    ],
  },
  {
    id: 'ciwa',
    name: 'CIWA-Ar (Alcohol Withdrawal)',
    shortName: 'CIWA-Ar',
    description: 'Clinical Institute Withdrawal Assessment for Alcohol — revised.',
    category: 'psychiatry',
    tags: ['alcohol', 'withdrawal', 'ciwa'],
    whenToUse: 'Symptom-triggered benzodiazepine protocols for alcohol withdrawal.',
    whyUse: 'Standard severity score guiding benzo dosing.',
    inputs: [
      ciwaSelect(
        'nausea',
        'Nausea/vomiting (0–7)',
        "Ask: “Do you feel sick to your stomach? Have you vomited?” Observe.",
        {
          0: 'No nausea and no vomiting',
          1: 'Mild nausea with no vomiting',
          4: 'Intermittent nausea with dry heaves',
          7: 'Constant nausea, frequent dry heaves and vomiting',
        },
      ),
      ciwaSelect(
        'tremor',
        'Tremor (0–7)',
        'Arms extended, fingers spread. Observe and feel fingertip-to-fingertip.',
        {
          0: 'No tremor',
          1: 'Not visible, but can be felt fingertip to fingertip',
          4: 'Moderate, with patient’s arms extended',
          7: 'Severe, even with arms not extended',
        },
      ),
      ciwaSelect(
        'sweats',
        'Paroxysmal sweats (0–7)',
        'Observe palms and forehead. Do not ask the patient to rate sweating.',
        {
          0: 'No sweat visible',
          1: 'Barely perceptible sweating, palms moist',
          4: 'Beads of sweat obvious on forehead',
          7: 'Drenching sweats',
        },
      ),
      ciwaSelect(
        'anxiety',
        'Anxiety (0–7)',
        'Ask: “Do you feel nervous?” Observe.',
        {
          0: 'No anxiety, at ease',
          1: 'Mildly anxious',
          4: 'Moderately anxious, or guarded so that anxiety is inferred',
          7: 'Equivalent to acute panic states as seen in severe delirium or acute schizophrenic reactions',
        },
      ),
      ciwaSelect(
        'agitation',
        'Agitation (0–7)',
        'Observe activity during the interview.',
        {
          0: 'Normal activity',
          1: 'Somewhat more than normal activity',
          4: 'Moderately fidgety and restless',
          7: 'Paces back and forth during most of the interview, or constantly thrashes about',
        },
      ),
      ciwaSelect(
        'tactile',
        'Tactile disturbances (0–7)',
        'Ask: “Have you any itching, pins and needles sensations, any burning, any numbness, or do you feel bugs crawling on or under your skin?”',
        {
          0: 'None',
          1: 'Very mild itching, pins and needles, burning or numbness',
          2: 'Mild itching, pins and needles, burning or numbness',
          3: 'Moderate itching, pins and needles, burning or numbness',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'auditory',
        'Auditory disturbances (0–7)',
        'Ask: “Are you more aware of sounds around you? Are they harsh? Do they frighten you? Are you hearing anything that is disturbing to you? Are you hearing things you know are not there?”',
        {
          0: 'Not present',
          1: 'Very mild harshness or ability to frighten',
          2: 'Mild harshness or ability to frighten',
          3: 'Moderate harshness or ability to frighten',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'visual',
        'Visual disturbances (0–7)',
        'Ask: “Does the light appear to be too bright? Is its color different? Does it hurt your eyes? Are you seeing anything that is disturbing to you? Are you seeing things you know are not there?”',
        {
          0: 'Not present',
          1: 'Very mild sensitivity',
          2: 'Mild sensitivity',
          3: 'Moderate sensitivity',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'headache',
        'Headache (0–7)',
        'Ask: “Does your head feel different? Does it feel like there is a band around your head?” Do not rate dizziness or lightheadedness.',
        {
          0: 'Not present',
          1: 'Very mild',
          2: 'Mild',
          3: 'Moderate',
          4: 'Moderately severe',
          5: 'Severe',
          6: 'Very severe',
          7: 'Extremely severe',
        },
      ),
      ciwaSelect(
        'orientation',
        'Orientation/clouding (0–4)',
        'Ask: “What day is this? Where are you? Who am I?”',
        {
          0: 'Oriented and can do serial additions',
          1: 'Cannot do serial additions or is uncertain about date',
          2: 'Disoriented for date by no more than 2 calendar days',
          3: 'Disoriented for date by more than 2 calendar days',
          4: 'Disoriented for place or person',
        },
        4,
      ),
    ],
    calculate(values) {
      const keys = ['nausea', 'tremor', 'sweats', 'anxiety', 'agitation', 'tactile', 'auditory', 'visual', 'headache', 'orientation'];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      const r = riskFromThresholds(score, [
        { max: 7, level: 'low', label: 'Mild withdrawal', interpretation: 'CIWA <8: mild — may not need benzos if protocol allows observation.' },
        { max: 15, level: 'moderate', label: 'Moderate', interpretation: 'CIWA 8–15: moderate — typically give symptom-triggered benzodiazepine.' },
        { max: 67, level: 'critical', label: 'Severe', interpretation: 'CIWA >15: severe — benzos, close monitoring, rule out DTs risk.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'CIWA-Ar ranges 0–67 across 10 domains for alcohol withdrawal severity.',
      validation: 'Standard for symptom-triggered therapy trials.',
      references: [{ title: 'Assessment of alcohol withdrawal: the revised CIWA-Ar', citation: 'Sullivan JT et al. Br J Addict. 1989', year: 1989, pmid: '2597811',
          doi: '10.1111/j.1360-0443.1989.tb00737.x', }],
    },
    nextSteps: [
      { condition: 'CIWA ≥8–10', actions: ['Diazepam/lorazepam per protocol', 'Thiamine, folate, multivitamin', 'Monitor for seizures/DTs'] },
    ],
    pearls: [
      'Official Sullivan 1989 key labels 0, 1, 4, and 7 (and every orientation rank). Ranks 2, 3, 5, 6 are interpolations.',
      'Do not rate dizziness on the headache item. Observe tremor and sweats rather than asking the patient to self-grade them.',
    ],
  },
  {
    id: 'mmse',
    name: 'MMSE (Score Entry)',
    shortName: 'MMSE',
    description: 'Mini-Mental State Examination total score interpreter.',
    category: 'neurology',
    tags: ['dementia', 'cognition', 'mmse'],
    whenToUse: 'Cognitive screening interpretation when MMSE already administered.',
    whyUse: 'Widely known cognitive screen (copyrighted instrument — enter total only).',
    inputs: [numberInput('score', 'MMSE total score', { min: 0, max: 30, exampleValue: 28, helpText: 'Enter the total from the official copyrighted MMSE form; do not administer items from this screen.' })],
    calculate(values) {
      const score = num(values.score, 28);
      const r = riskFromThresholds(score, [
        { max: 9, level: 'critical', label: 'Severe cognitive impairment', interpretation: 'MMSE 0–9: severe impairment range.' },
        { max: 20, level: 'high', label: 'Moderate impairment', interpretation: 'MMSE 10–20: moderate impairment range.' },
        { max: 24, level: 'moderate', label: 'Mild impairment', interpretation: 'MMSE 21–24: mild impairment; correlate with education and function.' },
        { max: 30, level: 'normal', label: 'Normal / near normal', interpretation: 'MMSE 25–30: generally normal; not excluded early dementia or MCI.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MMSE (Folstein) scores 0–30; cutoffs education-dependent.',
      validation: 'Classic screen; MoCA more sensitive for MCI.',
      references: [{ title: 'Mini-mental state', citation: 'Folstein MF et al. J Psychiatr Res. 1975', year: 1975, pmid: '1202204',
          doi: '10.1016/0022-3956(75)90026-6', }],
    },
    nextSteps: [
      { condition: 'Score ≤24', actions: ['Full cognitive workup', 'Labs (B12, TSH)', 'Imaging as indicated', 'Consider MoCA'] },
    ],
  },
  {
    id: 'moca',
    name: 'MoCA (Score Entry)',
    shortName: 'MoCA',
    description: 'Montreal Cognitive Assessment total score interpreter.',
    category: 'neurology',
    tags: ['dementia', 'mci', 'cognition'],
    whenToUse: 'Interpretation of administered MoCA total.',
    whyUse: 'More sensitive than MMSE for mild cognitive impairment.',
    inputs: [
      numberInput('score', 'MoCA total (before education adjust)', {
        min: 0,
        max: 30,
        exampleValue: 26,
        helpText: 'Enter the total from the official MoCA form (mocatest.org); do not administer items from this screen.',
      }),
      yesNo('edu', '≤12 years education (+1 if applicable)', 1, 'Add 1 point if ≤12 years of education, only if the raw total is <30 (cannot exceed 30).', true),
    ],
    calculate(values) {
      let score = num(values.score, 26);
      if (bool(values.edu) && score < 30) score += 1;
      const r = riskFromThresholds(score, [
        { max: 17, level: 'high', label: 'Possible dementia range', interpretation: 'Lower MoCA — further dementia evaluation.' },
        { max: 25, level: 'moderate', label: 'Possible MCI range', interpretation: 'MoCA <26 often used as impairment cutoff (context-dependent).' },
        { max: 30, level: 'normal', label: 'Normal range', interpretation: 'MoCA ≥26 often considered normal.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MoCA max 30; +1 if ≤12 years education. Cutoff <26 commonly used.',
      validation: 'Superior sensitivity for MCI vs MMSE in many studies.',
      references: [{ title: 'The Montreal Cognitive Assessment (MoCA)', citation: 'Nasreddine ZS et al. J Am Geriatr Soc. 2005', year: 2005, pmid: '15817019',
          doi: '10.1111/j.1532-5415.2005.53221.x', }],
    },
    nextSteps: [{ condition: 'Score <26', actions: ['Neuropsychological testing as needed', 'Reversible cause workup'] }],
  },
];
