import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave6ClinicalResidualCalcs: Calculator[] = [
  // ─── 1. Expanded Baveno VI ─────────────────────────────────────────────────
  {
    id: 'expanded-baveno',
    name: 'Expanded Baveno VI Criteria',
    shortName: 'Exp. Baveno VI',
    description:
      'Liver stiffness (transient elastography) + platelet count to identify patients with compensated advanced chronic liver disease who can safely avoid screening endoscopy for varices.',
    category: 'gastroenterology',
    tags: ['baveno', 'varices', 'fibroscan', 'cirrhosis', 'elastography', 'platelets'],
    whenToUse:
      'Compensated advanced chronic liver disease (cACLD) when deciding whether screening EGD for clinically significant varices can be deferred.',
    whyUse:
      'Expanded Baveno VI (LSM <25 kPa and platelets >110×10⁹/L) spares endoscopy with very low risk of missing varices needing treatment.',
    inputs: [
      numberInput('lsm', 'Liver stiffness (transient elastography)', {
        unit: 'kPa',
        min: 1,
        max: 75,
        step: 0.1,
        defaultValue: 18,
        helpText: 'Valid FibroScan/TE reading',
      }),
      numberInput('plt', 'Platelet count', {
        unit: '×10⁹/L',
        min: 10,
        max: 800,
        step: 1,
        defaultValue: 130,
      }),
      yesNo('compensated', 'Compensated (no prior decompensation: ascites, variceal bleed, HE)', 1),
    ],
    calculate(values) {
      const lsm = num(values.lsm, 18);
      const plt = num(values.plt, 130);
      const compensated = bool(values.compensated);
      const classicBaveno = lsm < 20 && plt > 150;
      const expandedBaveno = lsm < 25 && plt > 110;
      if (!compensated) {
        return {
          score: 'N/A',
          label: 'Not applicable — decompensated',
          interpretation:
            'Baveno criteria apply to compensated advanced chronic liver disease. Prior decompensation warrants endoscopy / specialist pathways per guidelines, not Baveno sparing rules.',
          riskLevel: 'high' as const,
          details: [
            { label: 'LSM', value: `${lsm} kPa` },
            { label: 'Platelets', value: `${plt} ×10⁹/L` },
          ],
        };
      }
      if (expandedBaveno) {
        return {
          score: classicBaveno ? 'Classic + Expanded met' : 'Expanded met',
          label: classicBaveno ? 'Meets classic & expanded Baveno' : 'Meets expanded Baveno VI',
          interpretation: classicBaveno
            ? `LSM ${lsm} kPa and platelets ${plt}×10⁹/L meet classic Baveno VI (LSM <20 and Plt >150) and expanded criteria. Very low risk of varices needing treatment — screening endoscopy can usually be avoided; reassess if LSM/Plt worsen.`
            : `LSM ${lsm} kPa and platelets ${plt}×10⁹/L meet expanded Baveno VI (LSM <25 kPa and Plt >110×10⁹/L). Screening endoscopy can usually be spared in cACLD; serial TE/CBC and clinical follow-up still required.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Classic Baveno VI (LSM <20 + Plt >150)', value: classicBaveno ? 'Met' : 'Not met' },
            { label: 'Expanded Baveno VI (LSM <25 + Plt >110)', value: 'Met' },
            { label: 'LSM', value: `${lsm} kPa` },
            { label: 'Platelets', value: `${plt} ×10⁹/L` },
          ],
          recommendations: ['Repeat TE + platelets periodically', 'Endoscope if decompensation or criteria no longer met'],
        };
      }
      return {
        score: 'Not met',
        label: 'Does not meet expanded Baveno',
        interpretation: `LSM ${lsm} kPa and/or platelets ${plt}×10⁹/L outside expanded Baveno VI. Screening endoscopy for varices is generally recommended (or use other risk tools / center protocol).`,
        riskLevel: 'moderate' as const,
        details: [
          { label: 'Classic Baveno VI', value: classicBaveno ? 'Met' : 'Not met' },
          { label: 'Expanded Baveno VI', value: 'Not met' },
          { label: 'LSM', value: `${lsm} kPa` },
          { label: 'Platelets', value: `${plt} ×10⁹/L` },
        ],
        recommendations: ['Arrange variceal screening EGD', 'NSBB if medium/large varices or red signs per guidance'],
      };
    },
    evidence: {
      summary:
        'Baveno VI: LSM <20 kPa + platelets >150×10⁹/L. Expanded Baveno VI: LSM <25 kPa + platelets >110×10⁹/L — both identify cACLD patients at very low risk of varices needing treatment who can avoid screening endoscopy.',
      formula: 'Expanded: LSM <25 kPa AND platelets >110×10⁹/L (compensated only)',
      validation:
        'Expanded criteria validated to spare more endoscopies while keeping missed varices-needing-treatment rate low (~<5% in cohorts).',
      references: [
        {
          title: 'Expanding consensus in portal hypertension (Baveno VI)',
          citation: 'de Franchis R et al. J Hepatol. 2015',
          year: 2015,
          pmid: '26047908',
          doi: '10.1016/j.jhep.2015.05.022',
        },
        {
          title: 'Expanded Baveno VI criteria',
          citation: 'Augustin S et al. Hepatology. 2017 / subsequent validations',
          year: 2017,
          pmid: '28696510',
          doi: '10.1002/hep.29363',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Criteria met',
        actions: ['Defer screening EGD', 'Surveillance LSM + CBC', 'Lifestyle/etiology treatment'],
      },
      {
        condition: 'Criteria not met or decompensated',
        actions: ['Variceal screening/management EGD', 'Hepatology follow-up'],
      },
    ],
    pearls: [
      'Invalid or unreliable TE (obesity, ascites, operator limits) voids the rule — endoscope or use alternative risk assessment.',
      'Baveno does not replace clinical judgment after decompensation.',
    ],
  },

  // ─── 2. Ascites grade ──────────────────────────────────────────────────────
  {
    id: 'ascites-grade',
    name: 'Clinical Ascites Grade (1–3)',
    shortName: 'Ascites Grade',
    description: 'International Ascites Club clinical grading of ascites severity (grades 1–3).',
    category: 'gastroenterology',
    tags: ['ascites', 'cirrhosis', 'portal hypertension', 'grading'],
    whenToUse: 'Document ascites severity and guide intensity of diuretic / paracentesis strategy in cirrhosis.',
    whyUse: 'Standard grades link description to treatment pathways (observation vs diuretics vs LVP).',
    inputs: [
      selectInput('grade', 'Clinical ascites grade', [
        {
          label: 'Grade 1 — Mild (only detectable by ultrasound)',
          value: 1,
          description: 'No clinical distension',
        },
        {
          label: 'Grade 2 — Moderate (symmetrical abdominal distension)',
          value: 2,
          description: 'Clinically evident',
        },
        {
          label: 'Grade 3 — Large / tense (marked distension)',
          value: 3,
          description: 'Gross ascites',
        },
      ]),
      yesNo('refractory', 'Refractory to maximal diuretics / early recurrence after LVP', 0),
      yesNo('infected', 'Suspected or confirmed SBP / infected ascites', 0),
    ],
    calculate(values) {
      const grade = num(values.grade, 1);
      const refractory = bool(values.refractory);
      const infected = bool(values.infected);
      const labels: Record<number, string> = {
        1: 'Grade 1 — mild',
        2: 'Grade 2 — moderate',
        3: 'Grade 3 — large/tense',
      };
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (grade === 1) {
        riskLevel = 'low';
        interpretation =
          'Grade 1 ascites: usually no specific treatment beyond salt restriction and etiology care; diuretics often not required. Ultrasound confirms when exam is subtle.';
      } else if (grade === 2) {
        riskLevel = 'moderate';
        interpretation =
          'Grade 2 ascites: start/optimize salt restriction and diuretics (typically spironolactone ± loop diuretic) with electrolyte/renal monitoring; diagnostic paracentesis if new or hospitalised.';
      } else {
        riskLevel = 'high';
        interpretation =
          'Grade 3 ascites: large-volume paracentesis with albumin as indicated, plus diuretics when appropriate; diagnostic tap for SBP if admitted or symptomatic.';
      }
      if (infected) {
        riskLevel = 'critical';
        interpretation +=
          ' Suspected/confirmed infection: urgent diagnostic paracentesis, empiric antibiotics per protocol, albumin in SBP as indicated.';
      }
      if (refractory) {
        if (riskLevel !== 'critical') riskLevel = 'high';
        interpretation +=
          ' Refractory ascites: consider serial LVP, TIPS candidacy, transplant evaluation, midodrine/other adjuncts per specialist care.';
      }
      return {
        score: grade,
        unit: 'grade',
        label: labels[grade] ?? `Grade ${grade}`,
        interpretation,
        riskLevel,
        details: [
          { label: 'IAC grade', value: String(grade) },
          { label: 'Refractory', value: refractory ? 'Yes' : 'No' },
          { label: 'Infection concern', value: infected ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'International Ascites Club: Grade 1 mild (US only), Grade 2 moderate symmetrical distension, Grade 3 large/gross tense ascites. Guides salt restriction, diuretics, and LVP.',
      validation: 'Widely used descriptive grading in AASLD/EASL ascites guidance.',
      references: [
        {
          title: 'EASL clinical practice guidelines on decompensated cirrhosis / ascites',
          citation: 'European Association for the Study of the Liver. J Hepatol. (ascites guidance updates)',
          year: 2018,
          pmid: '29653741',
          doi: '10.1016/j.jhep.2018.03.024',
        },
      ],
    },
    nextSteps: [
      { condition: 'New ascites', actions: ['Diagnostic paracentesis (SAAG, cell count, culture)', 'Salt restriction', 'Review EtOH/NSAIDs'] },
      { condition: 'Grade 3 or tense', actions: ['LVP + albumin as indicated', 'Diuretic optimization', 'SBP prophylaxis if prior SBP/high-risk'] },
      { condition: 'Refractory', actions: ['Hepatology', 'TIPS/transplant discussion', 'Serial LVP plan'] },
    ],
    pearls: [
      'Always exclude SBP with cell count when hospitalized or symptomatic.',
      'SAAG ≥1.1 suggests portal hypertension–related ascites.',
    ],
  },

  // ─── 3. Variceal bleed risk helper ─────────────────────────────────────────
  {
    id: 'variceal-bleed-risk',
    name: 'Variceal Bleed Risk Helper (Child–Pugh + Context)',
    shortName: 'Variceal Risk',
    description:
      'Educational helper combining Child–Pugh class with variceal and bleed features to frame rebleeding / mortality risk after variceal hemorrhage context.',
    category: 'gastroenterology',
    tags: ['varices', 'gi bleed', 'child-pugh', 'cirrhosis', 'portal hypertension'],
    whenToUse: 'Cirrhosis with known/suspected varices or recent variceal bleed for risk framing and care intensity.',
    whyUse: 'Child–Pugh class strongly stratifies short-term mortality after variceal bleeding; red signs and size add primary-prevention context.',
    inputs: [
      selectInput('child', 'Child–Pugh class', [
        { label: 'Class A', value: 'A' },
        { label: 'Class B', value: 'B' },
        { label: 'Class C', value: 'C' },
      ]),
      selectInput('context', 'Clinical context', [
        { label: 'Primary prevention (never bled)', value: 'primary' },
        { label: 'Active / recent variceal bleed', value: 'active' },
        { label: 'Secondary prevention (prior bleed, not active)', value: 'secondary' },
      ]),
      selectInput('varices', 'Largest varices (if known)', [
        { label: 'None / eradicated', value: 'none' },
        { label: 'Small', value: 'small' },
        { label: 'Medium / large', value: 'large' },
        { label: 'Unknown', value: 'unknown' },
      ]),
      yesNo('redWale', 'Red wale marks / high-risk stigmata', 1),
      yesNo('activeBleed', 'Hematemesis / ongoing hemodynamic instability from bleed', 1),
    ],
    calculate(values) {
      const child = str(values.child, 'A');
      const context = str(values.context, 'primary');
      const varices = str(values.varices, 'unknown');
      const red = bool(values.redWale);
      const active = bool(values.activeBleed) || context === 'active';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';
      if (active) {
        if (child === 'C') {
          riskLevel = 'critical';
          label = 'Active bleed · Child–Pugh C';
          interpretation =
            'Active variceal hemorrhage in Child–C cirrhosis: highest short-term mortality. Resuscitation, restrictive transfusion targets, vasoactive drug (octreotide/terlipressin), antibiotics, urgent endoscopy, early TIPS consideration if high-risk (e.g., Child C or B with active bleed).';
        } else if (child === 'B') {
          riskLevel = 'critical';
          label = 'Active bleed · Child–Pugh B';
          interpretation =
            'Active variceal bleed in Child–B: high risk. Standard variceal bleed bundle; consider early TIPS if criteria met (Child B + active bleeding at endoscopy, or Child C ≤13 in classic early-TIPS trials — follow local protocol).';
        } else {
          riskLevel = 'high';
          label = 'Active bleed · Child–Pugh A';
          interpretation =
            'Active variceal bleed even in Child–A needs full acute bundle (airway/hemodynamics, vasoactive agent, antibiotics, urgent EGD banding). Lower baseline mortality than B/C but still life-threatening.';
        }
      } else if (context === 'secondary') {
        riskLevel = child === 'C' ? 'high' : 'moderate';
        label = `Secondary prevention · Child–Pugh ${child}`;
        interpretation = `Prior variceal bleed — secondary prophylaxis with NSBB + endoscopic band ligation until eradication is standard. Child–Pugh ${child} modulates prognosis and transplant urgency.`;
      } else {
        // primary prevention
        if (varices === 'large' || red) {
          riskLevel = child === 'A' ? 'moderate' : 'high';
          label = `Primary prevention · high-risk varices · Child ${child}`;
          interpretation =
            'Medium/large varices and/or red signs warrant primary prophylaxis (NSBB or EBL per preference/contraindications). Higher Child–Pugh class increases bleed and decompensation risk.';
        } else if (varices === 'small') {
          riskLevel = 'low';
          label = `Primary prevention · small varices · Child ${child}`;
          interpretation =
            'Small varices: consider NSBB in decompensated cirrhosis or progressive risk; surveillance endoscopy intervals per guidelines if not on NSBB.';
        } else {
          riskLevel = 'low';
          label = `Primary prevention · Child–Pugh ${child}`;
          interpretation = `No high-risk variceal features entered. Screen/surveil per Baveno/endoscopy pathways; Child–Pugh ${child} frames overall hepatic reserve.`;
        }
      }
      return {
        score: `${child}${active ? '-bleed' : ''}`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Child–Pugh', value: child },
          { label: 'Context', value: context },
          { label: 'Varices', value: varices },
          { label: 'Red wale / stigmata', value: red ? 'Yes' : 'No' },
          { label: 'Active bleed context', value: active ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'After variceal hemorrhage, Child–Pugh class is a major mortality determinant. Acute care: vasoactive drugs, antibiotics, timely endoscopy; early TIPS for selected high-risk patients. Primary prevention targets medium/large varices or red signs.',
      validation: 'Aligned with Baveno and AASLD portal hypertension guidance frameworks (educational risk helper, not a validated numeric score).',
      references: [
        {
          title: 'Portal hypertensive bleeding in cirrhosis (AASLD guidance)',
          citation: 'Garcia-Tsao G et al. Hepatology. 2017',
          year: 2017,
          pmid: '27786365',
          doi: '10.1002/hep.28906',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Active bleed',
        actions: ['ABC / ICU as needed', 'Octreotide or terlipressin', 'IV antibiotics', 'Urgent EGD', 'Consider early TIPS if high-risk'],
      },
      {
        condition: 'Primary prevention high-risk varices',
        actions: ['Start NSBB or schedule EBL', 'Counsel on EtOH cessation', 'Optimize liver disease'],
      },
    ],
    pearls: [
      'Antibiotics reduce infection and rebleeding in acute variceal hemorrhage.',
      'Avoid over-transfusion (typical Hb target ~7–8 g/dL) unless exsanguinating or comorbid exception.',
    ],
  },

  // ─── 4. Ranson full ────────────────────────────────────────────────────────
  {
    id: 'ranson-full',
    name: "Ranson's Criteria (Full Admission + 48 h)",
    shortName: 'Ranson Full',
    description: 'Complete Ranson criteria: 5 admission + 6 at 48 hours for acute pancreatitis severity.',
    category: 'gastroenterology',
    tags: ['ranson', 'pancreatitis', 'severity', 'prognosis'],
    whenToUse: 'Acute pancreatitis when full Ranson data (admission and 48-hour labs/fluids) are available.',
    whyUse: 'Classic full score; ≥3 criteria associated with higher mortality. BISAP/APACHE often more practical early.',
    inputs: [
      // Admission (gallstone vs non-gallstone thresholds simplified to common non-biliary teaching cutoffs;
      // tool notes dual thresholds in help)
      yesNo('age', 'Age >55 years (non-biliary; >70 biliary)', 1),
      yesNo('wbc', 'WBC >16,000/µL (admission; >18k biliary)', 1),
      yesNo('glu', 'Glucose >200 mg/dL (admission; >220 biliary)', 1),
      yesNo('ldh', 'LDH >350 U/L (admission; >400 biliary)', 1),
      yesNo('ast', 'AST >250 U/L (admission)', 1),
      // 48 h
      yesNo('hct', 'Hct fall >10% (48 h)', 1),
      yesNo('bun', 'BUN rise >5 mg/dL (48 h)', 1),
      yesNo('ca', 'Serum Ca <8 mg/dL (48 h)', 1),
      yesNo('pao2', 'PaO₂ <60 mmHg (48 h)', 1),
      yesNo('bd', 'Base deficit >4 mEq/L (48 h)', 1),
      yesNo('fluid', 'Fluid sequestration >6 L (48 h)', 1),
    ],
    calculate(values) {
      const admKeys = ['age', 'wbc', 'glu', 'ldh', 'ast'] as const;
      const h48Keys = ['hct', 'bun', 'ca', 'pao2', 'bd', 'fluid'] as const;
      const adm = admKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const h48 = h48Keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const score = adm + h48;
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Milder predicted course (0–2)',
          interpretation: `Ranson ${score}/11 (admission ${adm}/5 + 48 h ${h48}/6). Scores <3 historically associate with lower mortality (~0–2%); still use clinical trajectory and organ failure definitions.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Increased severity (3–4)',
          interpretation: `Ranson ${score}/11. Intermediate mortality risk historically (~15%); closer monitoring, goal-directed fluids, early nutrition, and organ-support readiness.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'Severe (5–6)',
          interpretation: `Ranson ${score}/11. High predicted mortality (~40% historically); ICU-capable care, watch for necrosis/infection, avoid early unnecessary intervention.`,
        },
        {
          max: 11,
          level: 'critical',
          label: 'Very severe (≥7)',
          interpretation: `Ranson ${score}/11. Very high historical mortality; aggressive supportive care, multidisciplinary management of complications.`,
        },
      ]);
      return {
        score,
        unit: 'criteria',
        ...r,
        details: [
          { label: 'Admission criteria', value: `${adm}/5` },
          { label: '48-hour criteria', value: `${h48}/6` },
          { label: 'Total', value: `${score}/11` },
        ],
      };
    },
    evidence: {
      summary:
        'Ranson: 5 admission (age, WBC, glucose, LDH, AST) + 6 at 48 h (Hct drop, BUN rise, calcium, PaO₂, base deficit, fluid sequestration). Cutoffs differ slightly for biliary vs non-biliary pancreatitis.',
      formula: 'Total = sum of positive admission criteria + positive 48 h criteria (max 11)',
      validation: 'Historical standard; requires 48 h. Revised Atlanta uses organ failure for severity; BISAP is simpler early.',
      references: [
        {
          title: 'Prognostic signs and nonoperative peritoneal lavage in acute pancreatitis',
          citation: 'Ranson JH et al. Surg Gynecol Obstet. 1974',
          year: 1974,
          pmid: '4834279',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any acute pancreatitis',
        actions: ['Goal-directed early fluids', 'Early oral feeding as tolerated', 'ERCP if cholangitis/persistent obstruction', 'Cross-sectional imaging if no improvement'],
      },
      {
        condition: 'Ranson ≥3 or organ failure',
        actions: ['Higher-acuity monitoring', 'Nutrition support', 'Avoid early necrosectomy'],
      },
    ],
    pearls: [
      'Biliary pancreatitis uses slightly higher age/WBC/glucose/LDH cutoffs — adjust mentally if gallstone etiology.',
      'Full score is not available at presentation; use BISAP/SIRS early.',
    ],
  },

  // ─── 5. MELD 3.0 educational ───────────────────────────────────────────────
  {
    id: 'meld-3-edu',
    name: 'MELD 3.0 (Educational)',
    shortName: 'MELD 3.0',
    description:
      'Educational MELD 3.0 estimate incorporating sex and albumin (plus bilirubin, INR, creatinine, sodium). Not an allocation API.',
    category: 'gastroenterology',
    tags: ['meld', 'meld 3.0', 'transplant', 'cirrhosis', 'prognosis', 'albumin'],
    whenToUse: 'Adult chronic liver disease prognosis education when labs for MELD 3.0 components are available.',
    whyUse: 'MELD 3.0 improves mortality prediction vs MELD-Na and addresses sex disparity with a female coefficient and albumin.',
    inputs: [
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 2.0 }),
      numberInput('inr', 'INR', { min: 0.8, max: 20, step: 0.1, defaultValue: 1.5 }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.1, defaultValue: 1.0 }),
      numberInput('na', 'Serum sodium', { unit: 'mmol/L', min: 110, max: 160, step: 1, defaultValue: 135 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 3.0 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      yesNo('dialysis', 'Dialysis ≥2× in past week (or continuous RRT)', 8),
    ],
    calculate(values) {
      let bili = Math.max(num(values.bili, 2), 1);
      let inr = Math.max(num(values.inr, 1.5), 1);
      let cr = Math.max(num(values.creat, 1), 1);
      if (bool(values.dialysis) || cr > 3) cr = 3;
      // Na bounded 125–137; albumin 1.5–3.5 per MELD 3.0
      let na = num(values.na, 135);
      na = Math.min(137, Math.max(125, na));
      let alb = num(values.albumin, 3);
      alb = Math.min(3.5, Math.max(1.5, alb));
      const female = str(values.sex, 'F') === 'F' ? 1 : 0;
      // Kim WR et al. Gastroenterology 2021 MELD 3.0
      const raw =
        1.33 * female +
        4.56 * Math.log(bili) +
        0.82 * (137 - na) -
        0.24 * (137 - na) * Math.log(bili) +
        9.09 * Math.log(inr) +
        11.14 * Math.log(cr) +
        1.85 * (3.5 - alb) -
        1.83 * (3.5 - alb) * Math.log(cr) +
        6;
      const score = Math.max(6, Math.min(40, round(raw, 0)));
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Lower MELD 3.0 band',
          interpretation: `MELD 3.0 ≈ ${score}. Lower short-term waitlist mortality band historically — still manage complications and etiology.`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Intermediate',
          interpretation: `MELD 3.0 ≈ ${score}. Intermediate risk — specialist care; consider transplant evaluation trajectory if progressive.`,
        },
        {
          max: 29,
          level: 'high',
          label: 'High',
          interpretation: `MELD 3.0 ≈ ${score}. High short-term mortality risk without advanced therapies/transplant pathways.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very high',
          interpretation: `MELD 3.0 ≈ ${score}. Very high risk band — urgent transplant-center management if candidate.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Sex coefficient', value: female ? 'Female (+1.33)' : 'Male (0)' },
          { label: 'Bilirubin used', value: `${round(bili, 1)} mg/dL (floor 1)` },
          { label: 'INR used', value: `${round(inr, 1)} (floor 1)` },
          { label: 'Creatinine used', value: `${round(cr, 1)} mg/dL (floor 1, cap 3)` },
          { label: 'Na used', value: `${round(na, 0)} (bound 125–137)` },
          { label: 'Albumin used', value: `${round(alb, 1)} g/dL (bound 1.5–3.5)` },
        ],
        recommendations: [
          'Educational estimate — confirm with official OPTN/center calculators for listing',
          'Labs in mg/dL and g/dL; convert SI units first',
        ],
      };
    },
    evidence: {
      summary:
        'MELD 3.0 = 1.33(if ♀) + 4.56 ln(bili) + 0.82(137−Na) − 0.24(137−Na)ln(bili) + 9.09 ln(INR) + 11.14 ln(Cr) + 1.85(3.5−alb) − 1.83(3.5−alb)ln(Cr) + 6; bounds on labs; score scaled ~6–40.',
      formula:
        'MELD3.0 = 1.33♀ + 4.56ln(Bili) + 0.82(137−Na) − 0.24(137−Na)ln(Bili) + 9.09ln(INR) + 11.14ln(Cr) + 1.85(3.5−Alb) − 1.83(3.5−Alb)ln(Cr) + 6',
      validation: 'Kim et al. Gastroenterology 2021; adopted in US allocation updates. This tool is educational only.',
      references: [
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
      { condition: 'Elevated MELD 3.0', actions: ['Hepatology/transplant referral if candidate', 'Manage decompensation', 'Avoid nephrotoxins'] },
      { condition: 'Female patients', actions: ['MELD 3.0 better accounts for sex than classic MELD — still use official listing tools'] },
    ],
    pearls: [
      'Creatinine cap is 3.0 in MELD 3.0 (not 4.0 as in older MELD).',
      'Albumin and female sex are the major structural additions vs MELD-Na.',
    ],
  },

  // ─── 6. MDRD original educational ─────────────────────────────────────────
  {
    id: 'mdrd-original',
    name: 'MDRD eGFR (Original 4-Variable, Historical)',
    shortName: 'MDRD Original',
    description:
      'Historical 4-variable MDRD study equation including the legacy race coefficient — educational/legacy comparison only. Prefer race-free CKD-EPI 2021.',
    category: 'nephrology',
    tags: ['mdrd', 'egfr', 'gfr', 'historical', 'ckd', 'race'],
    whenToUse: 'Interpreting older lab reports that used MDRD, or teaching why race-based eGFR was abandoned.',
    whyUse: 'Shows the classic 175 equation and documents that the Black race multiplier is no longer recommended for clinical care.',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      selectInput('raceLegacy', 'Legacy race coefficient (historical only)', [
        { label: 'Do not apply race coefficient (recommended display)', value: 'none' },
        { label: 'Historical “Black” multiplier ×1.212 (obsolete)', value: 'black' },
      ]),
    ],
    calculate(values) {
      const scr = Math.max(num(values.scr, 1), 0.1);
      const age = Math.max(num(values.age, 50), 1);
      const female = str(values.sex, 'M') === 'F';
      const applyBlack = str(values.raceLegacy, 'none') === 'black';
      const sexF = female ? 0.742 : 1;
      const raceF = applyBlack ? 1.212 : 1;
      const egfr = round(175 * scr ** -1.154 * age ** -0.203 * sexF * raceF, 0);
      const egfrNoRace = round(175 * scr ** -1.154 * age ** -0.203 * sexF, 0);
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
        label: `MDRD eGFR ${egfr} · ${stage} (historical)`,
        interpretation: applyBlack
          ? `Historical MDRD with obsolete race coefficient ≈ ${egfr} mL/min/1.73 m² (without race factor would be ≈ ${egfrNoRace}). Race-based eGFR is no longer recommended (NKF-ASN). Prefer CKD-EPI 2021 creatinine (race-free) ± cystatin C for clinical decisions.`
          : `MDRD (no race coefficient) ≈ ${egfr} mL/min/1.73 m² (${stage}). Still a legacy equation — prefer 2021 CKD-EPI without race for staging and drug dosing discussions.`,
        riskLevel,
        details: [
          { label: 'Equation', value: '175 × Scr^−1.154 × Age^−0.203 × (0.742 if ♀) × (1.212 if legacy Black)' },
          { label: 'Race coefficient applied', value: applyBlack ? 'Yes ×1.212 (obsolete)' : 'No' },
          { label: 'Value without race factor', value: `${egfrNoRace} mL/min/1.73 m²` },
          { label: 'KDIGO G (from this eGFR)', value: stage },
        ],
        recommendations: [
          'Do not use race-based eGFR for new clinical reports',
          'Compare with CKD-EPI 2021 when management hinges on GFR',
        ],
      };
    },
    evidence: {
      summary:
        'IDMS-traceable 4-variable MDRD: eGFR = 175 × Scr^−1.154 × Age^−0.203 × 0.742 if female × 1.212 if Black (legacy). Less accurate than CKD-EPI at higher GFR; race coefficient abandoned.',
      formula: 'eGFR = 175 × Scr^{−1.154} × Age^{−0.203} × [0.742 if female] × [1.212 if legacy Black]',
      validation: 'Levey et al. Ann Intern Med 1999 / 2006 IDMS re-expression. NKF-ASN 2021 recommends race-free equations.',
      references: [
        {
          title: 'A more accurate method to estimate glomerular filtration rate from serum creatinine',
          citation: 'Levey AS et al. Ann Intern Med. 1999',
          year: 1999,
          pmid: '10075613',
          doi: '10.7326/0003-4819-130-6-199903160-00002',
        },
        {
          title: 'A Unifying Approach for GFR Estimation: Recommendations of the NKF-ASN Task Force',
          citation: 'Delgado C et al. Am J Kidney Dis. 2021',
          year: 2021,
          pmid: '34563581',
          doi: '10.1053/j.ajkd.2021.08.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any clinical use', actions: ['Prefer CKD-EPI 2021 race-free eGFR', 'Add ACR for CGA staging', 'Do not reintroduce race multipliers'] },
    ],
    pearls: [
      'Original 186 equation used non-IDMS creatinine; modern form is 175.',
      'This calculator exists for education and legacy report interpretation, not new care pathways.',
    ],
  },

  // ─── 7. AKI cause checklist ────────────────────────────────────────────────
  {
    id: 'aki-cause',
    name: 'AKI Cause Likelihood (Pre-renal vs ATN Checklist)',
    shortName: 'AKI Cause',
    description:
      'Educational checklist contrasting features favoring pre-renal azotemia versus acute tubular necrosis (ATN).',
    category: 'nephrology',
    tags: ['aki', 'pre-renal', 'atn', 'fena', 'differential'],
    whenToUse: 'Oliguric or rising-creatinine AKI when sorting volume-responsive pre-renal physiology from intrinsic ATN.',
    whyUse: 'Structures history, exam, urine indices, and sediment; does not replace clinical judgment or FeUrea on diuretics.',
    inputs: [
      yesNo('hypovol', 'Clear hypovolemia / low effective arterial blood volume history', 1),
      yesNo('response', 'Creatinine improving after fluids or improved perfusion', 1),
      yesNo('dryMucosa', 'Dry mucosa / orthostasis / low JVP (volume down)', 1),
      yesNo('fenaLow', 'FENa <1% (or FeUrea <35% if on diuretics)', 1),
      yesNo('unaLow', 'Urine Na <20 mEq/L', 1),
      yesNo('highSpGrav', 'High urine specific gravity / osmolality (concentrated)', 1),
      yesNo('blandSed', 'Bland urine sediment', 1),
      yesNo('shockIschemia', 'Prolonged shock, sepsis, or nephrotoxin exposure', 0),
      yesNo('fenaHigh', 'FENa >2% (not on diuretics)', 0),
      yesNo('muddy', 'Muddy brown casts / renal tubular epithelial cells', 0),
      yesNo('noFluidResponse', 'No improvement after adequate volume/perfusion rescue', 0),
      yesNo('ckRise', 'CK markedly elevated / pigment nephropathy context', 0),
    ],
    calculate(values) {
      const preKeys = ['hypovol', 'response', 'dryMucosa', 'fenaLow', 'unaLow', 'highSpGrav', 'blandSed'] as const;
      const atnKeys = ['shockIschemia', 'fenaHigh', 'muddy', 'noFluidResponse', 'ckRise'] as const;
      const pre = preKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const atn = atnKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const delta = pre - atn;
      let label = 'Indeterminate / mixed';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      let interpretation = '';
      if (pre >= atn + 2 && pre >= 3) {
        label = 'Features favor pre-renal';
        riskLevel = 'low';
        interpretation = `Pre-renal features ${pre}/7 vs ATN ${atn}/5. Pattern favors pre-renal azotemia — restore volume/perfusion, stop nephrotoxins/ACE-ARB/NSAIDs as appropriate, reassess UOP and creatinine. Still exclude obstruction and glomerulonephritis when atypical.`;
      } else if (atn >= pre + 2 && atn >= 2) {
        label = 'Features favor ATN / intrinsic';
        riskLevel = 'high';
        interpretation = `ATN-leaning features ${atn}/5 vs pre-renal ${pre}/7. Pattern favors acute tubular injury — supportive care, avoid further ischemic/toxic insults, dose-adjust renally cleared drugs, monitor for complications (hyperK, volume overload, acidosis).`;
      } else {
        label = 'Mixed or indeterminate';
        riskLevel = 'moderate';
        interpretation = `Pre-renal ${pre}/7, ATN ${atn}/5 — overlapping or incomplete data. Integrate timeline, hemodynamics, sediment, ultrasound, and response to therapy. Diuretics invalidate FENa (use FeUrea). Consider other intrarenal causes (AIN, AGN, vascular).`;
      }
      return {
        score: `${pre}:${atn}`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Pre-renal feature count', value: `${pre}/7` },
          { label: 'ATN / intrinsic feature count', value: `${atn}/5` },
          { label: 'Pre − ATN delta', value: String(delta) },
        ],
      };
    },
    evidence: {
      summary:
        'Classic teaching: pre-renal → low FENa/UNa, concentrated urine, bland sediment, volume-responsive; ATN → higher FENa, muddy brown casts, ischemic/toxic context, poor fluid response. Overlap is common.',
      validation: 'Educational heuristic only; urine indices have imperfect sensitivity/specificity especially with CKD, diuretics, contrast, and sepsis.',
      references: [
        {
          title: 'Acute kidney injury',
          citation: 'Bellomo R et al. Lancet. 2012; KDIGO AKI guideline',
          year: 2012,
          url: 'https://kdigo.org/guidelines/acute-kidney-injury/',
          pmid: '22617274',
          doi: '10.1016/S0140-6736(11)61454-2',
        },
      ],
    },
    nextSteps: [
      { condition: 'Pre-renal favored', actions: ['Isotonic fluids or perfusion optimization', 'Hold nephrotoxins', 'Treat underlying cause'] },
      { condition: 'ATN favored', actions: ['Supportive care', 'Renal dosing', 'Dialysis if indications', 'Nephrology if severe'] },
      { condition: 'Unclear', actions: ['Bladder scan/US', 'Urine microscopy', 'FeUrea if on diuretics', 'Serologies if active sediment'] },
    ],
    pearls: [
      'Post-ischemic ATN often follows a pre-renal phase — timing matters.',
      'Cardiorenal and hepatorenal can look “pre-renal” with low FENa yet need disease-specific therapy.',
    ],
  },
  // ─── 8. FENa contrast timing helper ────────────────────────────────────────
  {
    id: 'fena-contrast',
    name: 'FENa after Contrast (Timing Helper)',
    shortName: 'FENa Contrast',
    description:
      'Educational helper on interpreting FENa (and creatinine trajectory) after iodinated contrast exposure.',
    category: 'nephrology',
    tags: ['fena', 'contrast', 'cin', 'aki', 'ca-aki'],
    whenToUse: 'AKI or rising creatinine after iodinated contrast when FENa is considered.',
    whyUse: 'Contrast-associated AKI can show low FENa early; timing and alternatives matter more than a single cut-off.',
    inputs: [
      numberInput('hours', 'Hours since contrast exposure', { unit: 'h', min: 0, max: 168, defaultValue: 24 }),
      numberInput('fena', 'Measured FENa (if available)', { unit: '%', min: 0, max: 20, step: 0.1, defaultValue: 0.8 }),
      yesNo('fenaKnown', 'FENa value entered / available', 0),
      yesNo('creatinineUp', 'Creatinine rise ≥0.3 mg/dL or ≥1.5× baseline after contrast', 0),
      yesNo('otherCause', 'Strong alternate AKI cause (hypotension, sepsis, obstruction, meds)', 0),
      yesNo('onDiuretic', 'On diuretics (FENa unreliable)', 0),
    ],
    calculate(values) {
      const hours = num(values.hours, 24);
      const fena = num(values.fena, 0.8);
      const known = bool(values.fenaKnown);
      const crUp = bool(values.creatinineUp);
      const other = bool(values.otherCause);
      const diuretic = bool(values.onDiuretic);
      let label = '';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      let interpretation = '';
      if (!crUp) {
        label = 'No CA-AKI creatinine threshold met';
        riskLevel = 'low';
        interpretation =
          'Without a qualifying creatinine rise, contrast-associated AKI is not established. Continue usual post-contrast observation if high-risk patient; ensure volume status.';
      } else if (other) {
        label = 'AKI after contrast — alternate cause likely/possible';
        riskLevel = 'high';
        interpretation =
          'Creatinine rise after contrast with competing insults. Labeling as pure “CIN” is often incorrect — treat the dominant cause (shock, sepsis, drugs, obstruction) and support kidneys.';
      } else if (diuretic) {
        label = 'FENa confounded by diuretics';
        riskLevel = 'moderate';
        interpretation = `At ${hours} h post-contrast with creatinine rise: FENa is unreliable on diuretics. Prefer clinical course, FeUrea, sediment, and hemodynamics. Contrast nephropathy historically may show low FENa even with intrinsic injury.`;
      } else if (known && fena < 1) {
        label = 'Low FENa after contrast';
        riskLevel = 'moderate';
        interpretation = `FENa ${fena}% at ~${hours} h. Low FENa can occur in contrast-associated AKI (and pre-renal states) — does not prove volume depletion alone. Correlate with exam, hemodynamics, and whether creatinine continues to rise (typical CA-AKI peaks 48–72 h).`;
      } else if (known && fena >= 2) {
        label = 'Higher FENa — broader ATN differential';
        riskLevel = 'moderate';
        interpretation = `FENa ${fena}% suggests less avid Na retention — compatible with ATN from any cause, not specific for contrast. Reassess other nephrotoxins, ischemia, and obstruction.`;
      } else {
        label = 'Post-contrast AKI — FENa optional';
        riskLevel = 'moderate';
        interpretation = `~${hours} h after contrast with creatinine rise. Educational note: FENa may be low in contrast-associated injury; diagnosis is clinical after excluding alternatives. Prevention focus is volume status and avoiding unnecessary contrast in high-risk CKD.`;
      }
      const window =
        hours < 24
          ? 'Early (<24 h): creatinine may still be rising; recheck 24–72 h if concern'
          : hours <= 72
            ? 'Typical CA-AKI window (24–72 h peak)'
            : 'Beyond 72 h: ongoing rise suggests ongoing insult or alternate diagnosis';
      return {
        score: known ? fena : hours,
        unit: known ? '%' : 'h',
        label,
        interpretation: `${interpretation} Timing: ${window}.`,
        riskLevel,
        details: [
          { label: 'Hours post-contrast', value: `${hours} h` },
          { label: 'FENa', value: known ? `${fena}%` : 'Not entered' },
          { label: 'Creatinine threshold met', value: crUp ? 'Yes' : 'No' },
          { label: 'Competing cause', value: other ? 'Yes' : 'No' },
          { label: 'On diuretics (FENa unreliable)', value: diuretic ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Contrast-associated AKI is a rise in creatinine after intravascular iodinated contrast after excluding other causes. FENa may be <1% and is neither sensitive nor specific. Peak injury often 48–72 h.',
      validation: 'Educational timing/interpretation aid; modern epidemiology questions historical “CIN” rates with contemporary low-osmolar agents and confounders.',
      references: [
        {
          title: 'ACR–NKF consensus on contrast and kidney',
          citation: 'Davenport MS et al. Radiology / Kidney Med. 2020',
          year: 2020,
          pmid: '33015613',
          doi: '10.1016/j.xkme.2020.01.001',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rising Cr post-contrast', actions: ['Stop nephrotoxins', 'Volume assess', 'Rule out obstruction/other AKI', 'Supportive care'] },
      { condition: 'High-risk future contrast', actions: ['Minimize volume/frequency', 'Periprocedural volume optimization per protocol', 'Consider alternate imaging'] },
    ],
    pearls: [
      'Intra-arterial large-volume contrast + shock/atheroemboli confound attribution.',
      'Prophylactic N-acetylcysteine is not routinely recommended in modern guidance.',
    ],
  },

  // ─── 9. Desmopressin challenge ─────────────────────────────────────────────
  {
    id: 'desmopressin-challenge',
    name: 'Desmopressin Challenge (Educational Interpretation)',
    shortName: 'DDAVP Challenge',
    description:
      'Educational interpretation of water-deprivation test followed by desmopressin for polyuria workup (central DI vs nephrogenic DI vs primary polydipsia).',
    category: 'endocrinology',
    tags: ['diabetes insipidus', 'desmopressin', 'ddavp', 'polyuria', 'water deprivation'],
    whenToUse: 'After water deprivation when diagnosing DI subtype with post-desmopressin urine osmolality response.',
    whyUse: 'Percent rise in Uosm after DDAVP separates central from nephrogenic DI in classic teaching algorithms.',
    inputs: [
      numberInput('uosm_pre', 'Urine osmolality at end of deprivation (pre-DDAVP)', {
        unit: 'mOsm/kg',
        min: 50,
        max: 1200,
        defaultValue: 200,
      }),
      numberInput('uosm_post', 'Urine osmolality after desmopressin', {
        unit: 'mOsm/kg',
        min: 50,
        max: 1200,
        defaultValue: 400,
      }),
      selectInput('depriveOutcome', 'End-of-deprivation pattern (before DDAVP)', [
        { label: 'Uosm remained low (<300) — DI pattern', value: 'di' },
        { label: 'Uosm concentrated (>600) — primary polydipsia / normal', value: 'pp' },
        { label: 'Partial / intermediate (300–600)', value: 'partial' },
      ]),
    ],
    calculate(values) {
      const pre = num(values.uosm_pre, 200);
      const post = num(values.uosm_post, 400);
      const pattern = str(values.depriveOutcome, 'di');
      const rise = pre > 0 ? round(((post - pre) / pre) * 100, 0) : 0;
      const absRise = round(post - pre, 0);
      if (pattern === 'pp') {
        return {
          score: rise,
          unit: '% rise',
          label: 'Concentrated without needing DDAVP',
          interpretation: `End-deprivation Uosm ${pre} already concentrated. Pattern favors primary polydipsia (or normal concentrating ability). Desmopressin response is less diagnostic; address water intake and psychogenic/dipsogenic causes.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Pre-DDAVP Uosm', value: `${pre} mOsm/kg` },
            { label: 'Post-DDAVP Uosm', value: `${post} mOsm/kg` },
            { label: 'Relative rise', value: `${rise}%` },
          ],
        };
      }
      // Classic teaching: ≥50% rise → central DI; <50% → nephrogenic
      let label = '';
      let riskLevel: 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (rise >= 50) {
        label = 'Response suggests central DI';
        riskLevel = 'high';
        interpretation = `Uosm rose ${rise}% (${pre} → ${post} mOsm/kg) after desmopressin. Classic teaching: ≥50% increase favors central DI (ADH deficiency). Confirm with clinical context, MRI pituitary when indicated, and copeptin-based protocols where available.`;
      } else if (rise >= 10 && pattern === 'partial') {
        label = 'Partial response — partial central DI possible';
        riskLevel = 'moderate';
        interpretation = `Partial Uosm rise ${rise}% in an intermediate deprivation result. May represent partial central DI or overlap syndromes — specialist interpretation, hypertonic saline/copeptin algorithms preferred in modern practice.`;
      } else {
        label = 'Minimal response — suggests nephrogenic DI';
        riskLevel = 'moderate';
        interpretation = `Uosm rose only ${rise}% (${absRise} mOsm/kg absolute). Classic teaching: <50% rise after DDAVP favors nephrogenic DI (renal ADH resistance). Review lithium, hypercalcemia, hypokalemia, congenital causes; thiazide/amiloride/low-solute strategies as appropriate.`;
      }
      return {
        score: rise,
        unit: '% rise',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Pre-DDAVP Uosm', value: `${pre} mOsm/kg` },
          { label: 'Post-DDAVP Uosm', value: `${post} mOsm/kg` },
          { label: 'Relative rise', value: `${rise}%` },
          { label: 'Absolute rise', value: `${absRise} mOsm/kg` },
        ],
      };
    },
    evidence: {
      summary:
        'After water deprivation, desmopressin challenge: ≥50% rise in urine osmolality classically indicates central DI; little rise indicates nephrogenic DI. Primary polydipsia concentrates during deprivation alone.',
      formula: '% rise = 100 × (Uosm_post − Uosm_pre) / Uosm_pre',
      validation:
        'Classic Miller-style criteria; copeptin and hypertonic saline protocols improve accuracy and are preferred in many centers (educational tool).',
      references: [
        {
          title: 'Recognition of partial defects in antidiuretic hormone secretion',
          citation: 'Miller M et al. Ann Intern Med. 1970',
          year: 1970,
          pmid: '5476203',
          doi: '10.7326/0003-4819-73-5-721',
        },
        {
          title: 'Copeptin-based diagnosis of diabetes insipidus',
          citation: 'Fenske W / Christ-Crain M et al. related literature',
          year: 2018,
          pmid: '30380393',
          doi: '10.1056/NEJMc1811694',
        },
      ],
    },
    nextSteps: [
      { condition: 'Central DI pattern', actions: ['Desmopressin therapy trial', 'MRI sella if new', 'Endocrine referral'] },
      { condition: 'Nephrogenic pattern', actions: ['Stop lithium if possible', 'Correct K/Ca', 'Thiazide/NSAID/amiloride strategies per cause'] },
    ],
    pearls: [
      'Supervise water deprivation — risk of severe hypernatremia.',
      'Partial DI and primary polydipsia overlap; do not rely on a single percent cut-off alone.',
    ],
  },

  // ─── 10. Water deprivation test ────────────────────────────────────────────
  {
    id: 'water-deprivation',
    name: 'Water Deprivation Test Interpretation (Educational)',
    shortName: 'Water Deprive',
    description: 'Educational select-based interpretation of the water deprivation test for polyuria–polydipsia syndrome.',
    category: 'endocrinology',
    tags: ['water deprivation', 'diabetes insipidus', 'polyuria', 'osmolality'],
    whenToUse: 'Structured polyuria workup when interpreting supervised water deprivation results.',
    whyUse: 'Maps end-test plasma/urine osmolality patterns to primary polydipsia vs DI before desmopressin step.',
    inputs: [
      numberInput('posm', 'Plasma osmolality at end of test', { unit: 'mOsm/kg', min: 250, max: 350, defaultValue: 300 }),
      numberInput('uosm', 'Urine osmolality at end of test', { unit: 'mOsm/kg', min: 50, max: 1200, defaultValue: 250 }),
      numberInput('vol', '24-h urine volume (context)', { unit: 'L/day', min: 1, max: 20, step: 0.1, defaultValue: 5 }),
      selectInput('stoppedFor', 'Test endpoint', [
        { label: 'Completed protocol / weight loss limit', value: 'complete' },
        { label: 'Stopped for hypernatremia / hemodynamic concern', value: 'safety' },
        { label: 'Early stop — incomplete', value: 'incomplete' },
      ]),
    ],
    calculate(values) {
      const posm = num(values.posm, 300);
      const uosm = num(values.uosm, 250);
      const vol = num(values.vol, 5);
      const stopped = str(values.stoppedFor, 'complete');
      if (stopped === 'incomplete') {
        return {
          score: uosm,
          unit: 'mOsm/kg Uosm',
          label: 'Incomplete test',
          interpretation: 'Incomplete deprivation — do not over-interpret. Repeat under supervision or use copeptin/hypertonic saline protocol per endocrine practice.',
          riskLevel: 'info' as const,
        };
      }
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (uosm > 600) {
        label = 'Adequate concentration — primary polydipsia / normal';
        riskLevel = 'low';
        interpretation = `Uosm ${uosm} with Posm ${posm}: kidneys concentrated urine — argues against complete DI. Pattern fits primary polydipsia or resolved stimulus. 24-h volume context ${vol} L.`;
      } else if (uosm < 300 && posm >= 295) {
        label = 'Failed concentration — DI pattern';
        riskLevel = 'high';
        interpretation = `Uosm ${uosm} despite Posm ${posm} (≥295): classic DI pattern (central or nephrogenic). Proceed to desmopressin challenge (or interpret concurrent copeptin). Safety stop: ${stopped}.`;
      } else if (uosm >= 300 && uosm <= 600) {
        label = 'Partial / indeterminate concentration';
        riskLevel = 'moderate';
        interpretation = `Intermediate Uosm ${uosm} (Posm ${posm}). Partial DI, primary polydipsia overlap, or incomplete stimulus. Needs desmopressin step, copeptin, or specialist algorithm.`;
      } else {
        label = 'Atypical pairing — review validity';
        riskLevel = 'moderate';
        interpretation = `Uosm ${uosm}, Posm ${posm}: atypical or insufficient hyperosmolar stimulus. Confirm labs, surreptitious water intake, and test conditions.`;
      }
      return {
        score: uosm,
        unit: 'mOsm/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Plasma osmolality', value: `${posm} mOsm/kg` },
          { label: 'Urine osmolality', value: `${uosm} mOsm/kg` },
          { label: '24-h urine volume', value: `${vol} L` },
          { label: 'Endpoint', value: stopped },
        ],
      };
    },
    evidence: {
      summary:
        'Water deprivation: if Uosm rises >~600, concentrating ability intact (primary polydipsia/normal). If Uosm stays <300 despite Posm >~295–300, DI is likely — then desmopressin subtypes central vs nephrogenic.',
      validation: 'Classic teaching thresholds vary slightly by protocol; copeptin-based tests reduce need for prolonged deprivation.',
      references: [
        {
          title: 'Diabetes insipidus: diagnosis and management',
          citation: 'Garrahy A / Christ-Crain M et al. reviews; Miller et al. classic protocol',
          year: 2019,
          pmid: '30269342',
          doi: '10.1111/cen.13866',
        },
      ],
    },
    nextSteps: [
      { condition: 'DI pattern', actions: ['Desmopressin challenge', 'Endocrine referral', 'Electrolyte monitoring'] },
      { condition: 'Primary polydipsia pattern', actions: ['Behavioral water restriction plan', 'Psych/med review', 'Avoid hyponatremia from over-correction'] },
    ],
    pearls: [
      'Document weight loss % and supervised conditions — cheating water intake confounds results.',
      'Severe hypernatremia is a reason to abort and treat, not push the protocol.',
    ],
  },

  // ─── 11. SIADH criteria ────────────────────────────────────────────────────
  {
    id: 'siadh-criteria',
    name: 'SIADH Diagnostic Criteria Checklist',
    shortName: 'SIADH Criteria',
    description: 'Clinical checklist of classic diagnostic criteria for the syndrome of inappropriate antidiuresis (SIADH).',
    category: 'nephrology',
    tags: ['siadh', 'hyponatremia', 'siad', 'osmolality', 'sodium'],
    whenToUse: 'Euvolemic hyponatremia when evaluating for SIADH after excluding hypothyroidism and glucocorticoid deficiency.',
    whyUse: 'Forces explicit documentation of Posm, Uosm, UNa, volume status, and normal adrenal/thyroid function.',
    inputs: [
      yesNo('hypoNa', 'Hyponatremia (typically Na <135 mmol/L)', 1),
      yesNo('lowPosm', 'Low plasma osmolality (<275 mOsm/kg)', 1),
      yesNo('inapUosm', 'Inappropriately high urine osmolality (>100 mOsm/kg) with low Posm', 1),
      yesNo('euvolemia', 'Clinical euvolemia', 1),
      yesNo('highUna', 'Urine Na >30–40 mmol/L on normal salt intake', 1),
      yesNo('normalAdrenalThyroid', 'Normal thyroid and adrenal (glucocorticoid) function', 1),
      yesNo('noDiuretics', 'Not on recent diuretics (or interpreted cautiously)', 1),
      yesNo('normalRenal', 'No advanced renal failure explaining findings', 1),
    ],
    calculate(values) {
      const keys = [
        'hypoNa',
        'lowPosm',
        'inapUosm',
        'euvolemia',
        'highUna',
        'normalAdrenalThyroid',
        'noDiuretics',
        'normalRenal',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const core =
        bool(values.hypoNa) &&
        bool(values.lowPosm) &&
        bool(values.inapUosm) &&
        bool(values.euvolemia) &&
        bool(values.highUna) &&
        bool(values.normalAdrenalThyroid);
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (core && score >= 7) {
        label = 'Criteria compatible with SIADH';
        riskLevel = 'moderate';
        interpretation = `Checklist ${score}/8 with core SIADH features met. Findings support SIADH/SIAD — identify cause (CNS, pulmonary, drugs, malignancy, pain/nausea) and treat per severity (fluid restriction, urea/vaptans/hypertonic saline as indicated).`;
      } else if (score >= 5) {
        label = 'Possible SIADH — incomplete criteria';
        riskLevel = 'moderate';
        interpretation = `Checklist ${score}/8. Partial features — reassess volume status, thyroid/adrenal testing, diuretic timing, and alternative diagnoses (low solute, reset osmostat, CSWS in neurosurgical settings).`;
      } else {
        label = 'Does not meet SIADH checklist';
        riskLevel = 'low';
        interpretation = `Checklist ${score}/8. SIADH unlikely on entered features — prioritize hypovolemic/hypervolemic hyponatremia workup, hyperglycemia, and lab artifact (high protein/lipid if using certain assays).`;
      }
      return {
        score,
        unit: '/8',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Core criteria cluster', value: core ? 'Met' : 'Not fully met' },
          { label: 'Items positive', value: `${score}/8` },
        ],
      };
    },
    evidence: {
      summary:
        'Classic SIADH: hypo-osmolar hyponatremia, urine osmolality >100, clinical euvolemia, urine Na typically >30–40, normal thyroid/adrenal/renal function, and exclusion of diuretics.',
      validation: 'Bartter–Schwartz criteria lineage; European and US hyponatremia guidelines operationalize similar checklists.',
      references: [
        {
          title: 'Clinical practice guideline on diagnosis and treatment of hyponatraemia',
          citation: 'Spasovski G et al. Eur J Endocrinol. 2014',
          year: 2014,
          pmid: '24569125',
          doi: '10.1530/EJE-13-1020',
        },
      ],
    },
    nextSteps: [
      { condition: 'SIADH likely', actions: ['Medication review (SSRIs, carbamazepine, etc.)', 'CXR/CNS imaging as indicated', 'Fluid restriction if mild–moderate', '3% saline if severe symptoms'] },
      { condition: 'Uncertain volume', actions: ['Trial cautious fluids if hypovolemia possible', 'Uric acid/FENa adjuncts', 'Specialist input'] },
    ],
    pearls: [
      'Never ignore cortisol deficiency — can mimic SIADH exactly.',
      'Cerebral salt wasting is a competing diagnosis in subarachnoid hemorrhage (usually volume depleted).',
    ],
  },

  // ─── 12. DI vs primary polydipsia ──────────────────────────────────────────
  {
    id: 'di-diagnosis',
    name: 'Diabetes Insipidus vs Primary Polydipsia Helper',
    shortName: 'DI vs PP',
    description: 'Educational helper distinguishing central/nephrogenic DI from primary polydipsia using basic labs and history.',
    category: 'endocrinology',
    tags: ['diabetes insipidus', 'polydipsia', 'polyuria', 'sodium', 'osmolality'],
    whenToUse: 'Polyuria–polydipsia syndrome initial differentiation before or alongside formal testing.',
    whyUse: 'Baseline Na, plasma osmolality, and urine concentration provide quick Bayesian framing.',
    inputs: [
      numberInput('na', 'Serum sodium', { unit: 'mmol/L', min: 120, max: 170, defaultValue: 142 }),
      numberInput('posm', 'Plasma osmolality (measured or calculated)', { unit: 'mOsm/kg', min: 250, max: 360, defaultValue: 295 }),
      numberInput('uosm', 'Spot urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1200, defaultValue: 150 }),
      numberInput('uvol', 'Approximate urine output', { unit: 'L/day', min: 1, max: 20, step: 0.5, defaultValue: 6 }),
      yesNo('prefersCold', 'Prefers ice-cold water (classic DI anecdote)', 1),
      yesNo('nocturia', 'Prominent nocturia / night water drinking', 1),
      yesNo('lithium', 'Lithium or known nephrogenic risk drugs', 1),
      yesNo('psych', 'Primary psychiatric polydipsia context', 1),
    ],
    calculate(values) {
      const na = num(values.na, 142);
      const posm = num(values.posm, 295);
      const uosm = num(values.uosm, 150);
      const uvol = num(values.uvol, 6);
      let diScore = 0;
      let ppScore = 0;
      if (na >= 143) diScore += 2;
      if (na <= 137) ppScore += 2;
      if (posm >= 295) diScore += 2;
      if (posm < 280) ppScore += 2;
      if (uosm < 200 && uvol > 3.5) diScore += 2;
      if (uosm > 400) ppScore += 1;
      if (bool(values.prefersCold)) diScore += 1;
      if (bool(values.nocturia)) diScore += 1;
      if (bool(values.lithium)) diScore += 2;
      if (bool(values.psych)) ppScore += 2;
      if (uvol > 3) {
        /* polyuria present */
      } else {
        return {
          score: '—',
          label: 'Polyuria not clearly present',
          interpretation: `Reported urine volume ${uvol} L/day is not clearly in the pathologic polyuria range (>3–3.5 L/day commonly used). Confirm 24-h collection before intensive DI testing.`,
          riskLevel: 'info' as const,
        };
      }
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (diScore >= ppScore + 2 && diScore >= 3) {
        label = bool(values.lithium) ? 'Favors nephrogenic DI risk pattern' : 'Favors diabetes insipidus pattern';
        riskLevel = 'high';
        interpretation = `DI-leaning points ${diScore} vs primary polydipsia ${ppScore}. High-normal/high Na and Posm with dilute urine and large volume support DI. Proceed with formal testing (copeptin, water deprivation/desmopressin) and treat hypernatremia carefully.`;
      } else if (ppScore >= diScore + 2 && ppScore >= 3) {
        label = 'Favors primary polydipsia pattern';
        riskLevel = 'moderate';
        interpretation = `Primary polydipsia–leaning points ${ppScore} vs DI ${diScore}. Low/low-normal Na–Posm with high intake history fits primary polydipsia — avoid abrupt severe water restriction without monitoring; address psychiatric/medications causes.`;
      } else {
        label = 'Overlap — formal testing needed';
        riskLevel = 'moderate';
        interpretation = `DI points ${diScore}, primary polydipsia ${ppScore}. Overlapping outpatient labs are common. Use supervised diagnostic testing rather than spot values alone.`;
      }
      return {
        score: `${diScore}:${ppScore}`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'DI-leaning points', value: String(diScore) },
          { label: 'Primary polydipsia points', value: String(ppScore) },
          { label: 'Na / Posm / Uosm', value: `${na} / ${posm} / ${uosm}` },
          { label: 'Urine volume', value: `${uvol} L/day` },
        ],
      };
    },
    evidence: {
      summary:
        'DI tends toward high-normal/high plasma Na and osmolality with inappropriately dilute urine; primary polydipsia often shows low/low-normal Na and ability to concentrate when water is restricted.',
      validation: 'Educational Bayesian helper; not a validated score. Confirm with dynamic endocrine testing.',
      references: [
        {
          title: 'Diagnosis of diabetes insipidus',
          citation: 'Christ-Crain M et al. Nat Rev Endocrinol / related reviews',
          year: 2019,
          pmid: '31303316',
          doi: '10.1016/S0140-6736(19)31255-3',
        },
      ],
    },
    nextSteps: [
      { condition: 'DI favored', actions: ['Endocrine referral', 'Copeptin or deprivation protocol', 'MRI if central DI confirmed'] },
      { condition: 'Primary polydipsia favored', actions: ['Gradual intake reduction', 'Psych liaison if appropriate', 'Watch for hyponatremia'] },
    ],
    pearls: [
      'Osmotic diuresis (glucose, urea, mannitol) must be excluded before DI testing.',
      'Lithium is a classic reversible/partial nephrogenic DI cause.',
    ],
  },

  // ─── 13. Graves CAS ────────────────────────────────────────────────────────
  {
    id: 'graves-cas',
    name: 'Clinical Activity Score (Graves Orbitopathy)',
    shortName: 'CAS',
    description: 'Mourits/EUGOGO Clinical Activity Score for activity of Graves orbitopathy (thyroid eye disease).',
    category: 'endocrinology',
    tags: ['graves', 'orbitopathy', 'cas', 'thyroid eye disease', 'eugogo'],
    whenToUse: 'Graves disease with suspected active thyroid eye disease to decide anti-inflammatory therapy need.',
    whyUse: 'CAS ≥3/7 indicates active orbitopathy in the basic 7-item score and supports immunosuppressive consideration.',
    inputs: [
      yesNo('spontPain', 'Spontaneous orbital pain', 1),
      yesNo('gazePain', 'Pain with attempted upward/side gaze', 1),
      yesNo('redLid', 'Redness of eyelids', 1),
      yesNo('redConj', 'Redness of conjunctiva', 1),
      yesNo('swellLid', 'Swelling of eyelids', 1),
      yesNo('caruncle', 'Swelling of caruncle / plica', 1),
      yesNo('chemosis', 'Chemosis (conjunctival edema)', 1),
    ],
    calculate(values) {
      const keys = ['spontPain', 'gazePain', 'redLid', 'redConj', 'swellLid', 'caruncle', 'chemosis'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Inactive / mild activity (CAS <3)',
          interpretation: `CAS ${score}/7. Below usual activity threshold (<3). Manage as inactive/mild disease: supportive care (lubricants, elevate head of bed, selenium if mild per practice), control thyroid status; still assess severity (diplopia, proptosis, optic nerve).`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Active orbitopathy (CAS ≥3)',
          interpretation: `CAS ${score}/7. Active thyroid eye disease by 7-item CAS. Refer ophthalmology/thyroid eye clinic; consider anti-inflammatory therapy based on severity and EUGOGO pathways; avoid smoking; stabilize thyroid function.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'Highly active orbitopathy',
          interpretation: `CAS ${score}/7. Highly active inflammatory orbitopathy. Urgent specialist care; evaluate for sight-threatening disease (DON, corneal breakdown) needing pulse steroids / decompression pathways.`,
        },
      ]);
      return {
        score,
        unit: '/7',
        ...r,
        details: [{ label: 'Activity threshold', value: 'CAS ≥3/7 = active (basic score)' }],
      };
    },
    evidence: {
      summary:
        '7-item CAS: spontaneous pain, gaze-evoked pain, eyelid erythema, conjunctival redness, eyelid swelling, caruncle/plica swelling, chemosis. ≥3 indicates active disease. Extended 10-item score adds 1–3 month change items.',
      formula: 'CAS = sum of 7 binary inflammatory items',
      validation: 'Mourits et al.; used in EUGOGO guidance for activity assessment.',
      references: [
        {
          title: 'Clinical activity score as a guide in the management of Graves’ ophthalmopathy',
          citation: 'Mourits MP et al. Clin Endocrinol (Oxf). 1997',
          year: 1997,
          pmid: '9302365',
          doi: '10.1046/j.1365-2265.1997.2331047.x',
        },
        {
          title: 'EUGOGO clinical practice guidelines for Graves orbitopathy',
          citation: 'Bartalena L et al. Eur J Endocrinol. 2021',
          year: 2021,
          pmid: '34297684',
          doi: '10.1530/EJE-21-0479',
        },
      ],
    },
    nextSteps: [
      { condition: 'CAS ≥3', actions: ['Ophthalmology / TED clinic', 'Smoking cessation', 'Euthyroid state', 'Consider IV steroids if moderate–severe active'] },
      { condition: 'Vision change / color desaturation', actions: ['Emergency assessment for dysthyroid optic neuropathy'] },
    ],
    pearls: [
      'Activity (CAS) ≠ severity (NOSPECS/EUGOGO severity).',
      'Radioiodine can worsen orbitopathy — steroid cover in at-risk patients.',
    ],
  },

  // ─── 14. ATA nodule pattern ────────────────────────────────────────────────
  {
    id: 'ata-nodule',
    name: 'ATA Thyroid Nodule Sonographic Pattern',
    shortName: 'ATA Pattern',
    description: 'ATA 2015 sonographic pattern–based malignancy risk and FNA size thresholds (educational).',
    category: 'endocrinology',
    tags: ['thyroid', 'nodule', 'ata', 'ultrasound', 'fna'],
    whenToUse: 'Thyroid nodules with ultrasound description to estimate ATA pattern risk and biopsy size cutoffs.',
    whyUse: 'Pattern-based approach (benign → high suspicion) drives FNA thresholds complementary to TIRADS systems.',
    inputs: [
      selectInput('pattern', 'ATA sonographic pattern', [
        { label: 'Benign (pure cyst, spongiform)', value: 'benign' },
        { label: 'Very low suspicion', value: 'very_low' },
        { label: 'Low suspicion', value: 'low' },
        { label: 'Intermediate suspicion', value: 'intermediate' },
        { label: 'High suspicion', value: 'high' },
      ]),
      numberInput('size', 'Largest nodule diameter', { unit: 'cm', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 }),
    ],
    calculate(values) {
      const pattern = str(values.pattern, 'low');
      const size = num(values.size, 1.5);
      const map: Record<
        string,
        { risk: string; fna: number | null; riskLevel: 'low' | 'moderate' | 'high' | 'info'; label: string; malig: string }
      > = {
        benign: {
          risk: '<1%',
          fna: null,
          riskLevel: 'low',
          label: 'Benign pattern',
          malig: '<1%',
        },
        very_low: {
          risk: '<3%',
          fna: 2,
          riskLevel: 'low',
          label: 'Very low suspicion',
          malig: '<3%',
        },
        low: {
          risk: '5–10%',
          fna: 1.5,
          riskLevel: 'low',
          label: 'Low suspicion',
          malig: '5–10%',
        },
        intermediate: {
          risk: '10–20%',
          fna: 1,
          riskLevel: 'moderate',
          label: 'Intermediate suspicion',
          malig: '10–20%',
        },
        high: {
          risk: '>70–90%',
          fna: 1,
          riskLevel: 'high',
          label: 'High suspicion',
          malig: '>70–90%',
        },
      };
      const m = map[pattern] ?? map.low;
      let fnaRec = '';
      if (m.fna === null) {
        fnaRec = 'FNA not routinely indicated for purely cystic/spongiform benign pattern (unless symptomatic/cosmetic).';
      } else if (size >= m.fna) {
        fnaRec = `Size ${size} cm meets ATA FNA threshold (≥${m.fna} cm) for this pattern — FNA generally recommended (consider patient factors).`;
      } else {
        fnaRec = `Size ${size} cm is below the usual FNA threshold (≥${m.fna} cm) for this pattern — ultrasound surveillance often appropriate.`;
      }
      return {
        score: m.malig,
        label: `${m.label} · est. malignancy ${m.malig}`,
        interpretation: `ATA pattern: ${m.label} (estimated malignancy risk ${m.risk}). ${fnaRec} Correlate with cervical lymph nodes and clinical risk factors.`,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Pattern', value: m.label },
          { label: 'Est. malignancy risk', value: m.malig },
          { label: 'Typical FNA size cutoff', value: m.fna === null ? 'Not routine' : `≥${m.fna} cm` },
          { label: 'Nodule size', value: `${size} cm` },
        ],
      };
    },
    evidence: {
      summary:
        'ATA 2015 patterns: high suspicion (solid hypoechoic + suspicious features) risk >70–90%, FNA ≥1 cm; intermediate 10–20%, FNA ≥1 cm; low 5–10%, FNA ≥1.5 cm; very low <3%, FNA ≥2 cm; benign <1%, no routine FNA.',
      validation: 'Haugen et al. ATA guidelines 2015; local practice may use ACR TIRADS instead or in parallel.',
      references: [
        {
          title: '2015 American Thyroid Association management guidelines for thyroid nodules',
          citation: 'Haugen BR et al. Thyroid. 2016',
          year: 2016,
          pmid: '26462967',
          doi: '10.1089/thy.2015.0020',
        },
      ],
    },
    nextSteps: [
      { condition: 'Meets FNA size threshold', actions: ['Ultrasound-guided FNA', 'Include lymph node survey'] },
      { condition: 'Below threshold', actions: ['Sonographic follow-up interval per pattern', 'Reassess if growth/new features'] },
    ],
    pearls: [
      'Microcalcifications, irregular margins, taller-than-wide, extrathyroidal extension drive high suspicion.',
      'Spongiform and pure cysts are classic benign patterns.',
    ],
  },

  // ─── 15. Somogyi vs dawn ───────────────────────────────────────────────────
  {
    id: 'somogyi-dawn',
    name: 'Somogyi vs Dawn Phenomenon Helper',
    shortName: 'Somogyi/Dawn',
    description: 'Educational pattern helper for fasting hyperglycemia: dawn phenomenon vs Somogyi (rebound) hypothesis.',
    category: 'endocrinology',
    tags: ['diabetes', 'dawn', 'somogyi', 'hypoglycemia', 'insulin', 'fasting glucose'],
    whenToUse: 'Patients with high morning glucose on insulin when deciding whether overnight hypo vs dawn physiology is likely.',
    whyUse: '3 a.m. glucose (or CGM) distinguishes nocturnal hypoglycemia with rebound from dawn-related rise without hypo.',
    inputs: [
      numberInput('glu_bed', 'Bedtime glucose', { unit: 'mg/dL', min: 40, max: 500, defaultValue: 140 }),
      numberInput('glu_3am', 'Glucose ~3 a.m. (or overnight nadir)', { unit: 'mg/dL', min: 40, max: 500, defaultValue: 110 }),
      numberInput('glu_am', 'Pre-breakfast / fasting glucose', { unit: 'mg/dL', min: 40, max: 500, defaultValue: 200 }),
      yesNo('nightSweats', 'Night sweats / nightmares / symptoms of nocturnal hypo', 0),
      yesNo('cgmHypo', 'CGM confirms nocturnal hypoglycemia', 0),
    ],
    calculate(values) {
      const bed = num(values.glu_bed, 140);
      const am3 = num(values.glu_3am, 110);
      const am = num(values.glu_am, 200);
      const sym = bool(values.nightSweats);
      const cgm = bool(values.cgmHypo);
      const overnightDrop = bed - am3;
      const morningRise = am - am3;
      let label = '';
      let riskLevel: 'info' | 'moderate' | 'high' | 'low' = 'info';
      let interpretation = '';
      if (cgm || am3 < 70 || (sym && overnightDrop > 30 && am3 < 90)) {
        label = 'Pattern suggests nocturnal hypoglycemia (± Somogyi debate)';
        riskLevel = 'high';
        interpretation = `3 a.m./nadir ${am3} mg/dL with fasting ${am} mg/dL. Evidence of overnight hypoglycemia — reduce overnight insulin / evening NPH or basal as appropriate. Note: true Somogyi rebound is controversial; treat documented nocturnal hypo regardless of the eponym.`;
      } else if (am3 >= 100 && morningRise >= 30 && am >= 140) {
        label = 'Pattern suggests dawn phenomenon';
        riskLevel = 'moderate';
        interpretation = `Overnight glucose stayed adequate (3 a.m. ${am3}) then rose to fasting ${am} mg/dL without hypo — consistent with dawn phenomenon (GH/cortisol-driven insulin resistance). Consider adjusting basal timing/dose or dinner bolus patterns; review bedtime snack.`;
      } else if (am3 >= am - 10 && am > 150) {
        label = 'Sustained overnight hyperglycemia';
        riskLevel = 'moderate';
        interpretation = `Glucose high overnight (${am3} → ${am}) without a clear dawn surge only. Suggests overall basal insufficiency or high bedtime starting point (bedtime ${bed}). Titrate basal carefully.`;
      } else {
        label = 'Indeterminate — more data needed';
        riskLevel = 'info';
        interpretation = `Bedtime ${bed}, 3 a.m. ${am3}, fasting ${am}. Pattern not classic for pure dawn or nocturnal hypo. Use multi-night CGM or several 3 a.m. checks before major insulin changes.`;
      }
      return {
        score: am,
        unit: 'mg/dL fasting',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Bedtime → 3 a.m. change', value: `${round(am3 - bed, 0)} mg/dL` },
          { label: '3 a.m. → fasting change', value: `${round(morningRise, 0)} mg/dL` },
          { label: 'Night sweats / nocturnal hypo symptoms', value: sym ? 'Yes' : 'No' },
          { label: 'CGM nocturnal hypo', value: cgm ? 'Yes' : 'No' },
          { label: 'Nocturnal hypo evidence', value: cgm || am3 < 70 ? 'Yes' : sym ? 'Symptoms only' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Dawn phenomenon: early-morning rise in glucose without preceding hypoglycemia. Somogyi: rebound hyperglycemia after nocturnal hypo — existence as a dominant mechanism is debated; treat verified nocturnal hypoglycemia first.',
      validation: 'Educational pattern aid; CGM is preferred for adjudication.',
      references: [
        {
          title: 'Dawn phenomenon and Somogyi effect in diabetes',
          citation: 'Classic endocrine teaching; clinical diabetes reviews of dawn vs Somogyi phenomena',
          year: 2011,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK279114/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Nocturnal hypo pattern', actions: ['Reduce basal/NPH', 'Check timing of long-acting insulin', 'Consider CGM'] },
      { condition: 'Dawn pattern', actions: ['Basal titration or timing change', 'Avoid excess bedtime carbs if mismatched', 'Endocrine follow-up if brittle'] },
    ],
    pearls: [
      'Do not increase evening insulin for high fasting glucose until nocturnal hypo is excluded.',
      'CGM often overturns assumed Somogyi.',
    ],
  },

  // ─── 16. DKA resolution ────────────────────────────────────────────────────
  {
    id: 'dka-resolution',
    name: 'DKA Resolution Criteria Checklist',
    shortName: 'DKA Resolution',
    description: 'Checklist of standard biochemical criteria for resolution of diabetic ketoacidosis before stopping IV insulin.',
    category: 'endocrinology',
    tags: ['dka', 'diabetes', 'ketoacidosis', 'insulin', 'resolution'],
    whenToUse: 'During DKA treatment to decide when ketoacidosis resolution criteria are met for transition to SQ insulin.',
    whyUse: 'Prevents premature stop of insulin infusion before ketoacidosis clears; glucose normalizes before ketosis often.',
    inputs: [
      numberInput('glu', 'Glucose', { unit: 'mg/dL', min: 40, max: 1000, defaultValue: 180 }),
      numberInput('bicarb', 'Serum bicarbonate', { unit: 'mEq/L', min: 1, max: 40, step: 0.1, defaultValue: 16 }),
      numberInput('ph', 'Venous or arterial pH', { min: 6.6, max: 7.6, step: 0.01, defaultValue: 7.32 }),
      numberInput('ag', 'Anion gap', { unit: 'mEq/L', min: 4, max: 40, step: 0.1, defaultValue: 11 }),
      yesNo('ableEat', 'Able to eat / transition plan ready', 1),
      yesNo('sqOverlap', 'SQ basal insulin overlapped ≥1–2 h before stopping IV', 1),
    ],
    calculate(values) {
      const glu = num(values.glu, 180);
      const bicarb = num(values.bicarb, 16);
      const ph = num(values.ph, 7.32);
      const ag = num(values.ag, 11);
      // ADA-style teaching: glucose <200 AND two of: bicarb ≥15, pH >7.3, AG ≤12
      const gluOk = glu < 200;
      const bicarbOk = bicarb >= 15;
      const phOk = ph > 7.3;
      const agOk = ag <= 12;
      const twoOfThree = [bicarbOk, phOk, agOk].filter(Boolean).length >= 2;
      const resolved = gluOk && twoOfThree;
      const score = [gluOk, bicarbOk, phOk, agOk].filter(Boolean).length;
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (resolved) {
        label = 'Biochemical resolution criteria met';
        riskLevel = 'low';
        interpretation = `Glucose ${glu}, HCO₃ ${bicarb}, pH ${ph}, AG ${ag}. Meets common teaching criteria (glucose <200 and ≥2 of: HCO₃ ≥15, pH >7.3, AG ≤12). Transition to SQ insulin with IV overlap; do not stop insulin solely because glucose normalized earlier.`;
      } else if (gluOk && !twoOfThree) {
        label = 'Glucose improved — ketoacidosis not cleared';
        riskLevel = 'high';
        interpretation = `Glucose ${glu} is <200 but acid–base/gap not resolved (HCO₃ ${bicarb}, pH ${ph}, AG ${ag}). Continue IV insulin with dextrose-containing fluids until criteria met.`;
      } else {
        label = 'DKA not yet resolved';
        riskLevel = 'high';
        interpretation = `Criteria incomplete (${score}/4 component flags). Continue protocolized fluids, insulin, electrolyte repletion; add D5 when glucose ~200–250 while insulin continues.`;
      }
      if (resolved && !bool(values.sqOverlap)) {
        interpretation += ' Ensure basal SQ insulin overlap before discontinuing IV infusion.';
        riskLevel = 'moderate';
      }
      return {
        score: resolved ? 'Resolved' : 'Not resolved',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Glucose <200', value: gluOk ? 'Yes' : `No (${glu})` },
          { label: 'HCO₃ ≥15', value: bicarbOk ? 'Yes' : `No (${bicarb})` },
          { label: 'pH >7.3', value: phOk ? 'Yes' : `No (${ph})` },
          { label: 'AG ≤12', value: agOk ? 'Yes' : `No (${ag})` },
          { label: 'Able to eat', value: bool(values.ableEat) ? 'Yes' : 'No' },
          { label: 'SQ overlap', value: bool(values.sqOverlap) ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Common ADA adult DKA resolution teaching: glucose <200 mg/dL and two of bicarbonate ≥15 mEq/L, venous pH >7.3, anion gap ≤12. Then transition with SQ basal overlap.',
      validation: 'Guideline-based criteria; some centers use β-hydroxybutyrate clearance targets.',
      references: [
        {
          title: 'Hyperglycemic crises in adult patients with diabetes',
          citation: 'Kitabchi AE et al. Diabetes Care. 2009; ADA updates',
          year: 2009,
          pmid: '19564476',
          doi: '10.2337/dc09-9032',
        },
      ],
    },
    nextSteps: [
      { condition: 'Not resolved', actions: ['Continue IV insulin + D5 when glucose falls', 'Replete K', 'Find precipitant'] },
      { condition: 'Resolved', actions: ['Overlap basal SQ insulin', 'Stop IV insulin after overlap', 'Diabetes education'] },
    ],
    pearls: [
      'Closing the gap matters more than a single normal glucose.',
      'Watch potassium carefully as insulin drives K intracellularly.',
    ],
  },

  // ─── 17. HHS diagnosis ─────────────────────────────────────────────────────
  {
    id: 'hhs-diagnosis',
    name: 'HHS Diagnostic Criteria Helper',
    shortName: 'HHS Dx',
    description: 'Helper for hyperosmolar hyperglycemic state diagnostic thresholds vs DKA overlap.',
    category: 'endocrinology',
    tags: ['hhs', 'hhnk', 'hyperosmolar', 'diabetes', 'emergency'],
    whenToUse: 'Severe hyperglycemia with mental status change when distinguishing HHS from DKA or mixed presentations.',
    whyUse: 'HHS uses extreme glucose/osmolality with minimal ketoacidosis; fluid deficits are massive.',
    inputs: [
      numberInput('glu', 'Glucose', { unit: 'mg/dL', min: 100, max: 2000, defaultValue: 700 }),
      numberInput('osm', 'Effective / calculated serum osmolality', {
        unit: 'mOsm/kg',
        min: 250,
        max: 450,
        defaultValue: 330,
        helpText: 'Often 2Na + glucose/18 (+ BUN/2.8 if total osm)',
      }),
      numberInput('ph', 'pH', { min: 6.6, max: 7.6, step: 0.01, defaultValue: 7.35 }),
      numberInput('bicarb', 'Bicarbonate', { unit: 'mEq/L', min: 1, max: 40, defaultValue: 20 }),
      selectInput('ketones', 'Ketones', [
        { label: 'None / small / trace', value: 'small' },
        { label: 'Moderate–large (mixed DKA possible)', value: 'large' },
      ]),
      yesNo('ams', 'Altered mental status / stupor / coma', 0),
    ],
    calculate(values) {
      const glu = num(values.glu, 700);
      const osm = num(values.osm, 330);
      const ph = num(values.ph, 7.35);
      const bicarb = num(values.bicarb, 20);
      const ket = str(values.ketones, 'small');
      const ams = bool(values.ams);
      const gluOk = glu >= 600;
      const osmOk = osm >= 320;
      const acidMinimal = ph > 7.3 && bicarb >= 15; // some use ≥18
      const bicarbStrict = bicarb >= 18;
      const hhsCore = gluOk && osmOk && acidMinimal && ket === 'small';
      const mixed = gluOk && osmOk && (ket === 'large' || ph <= 7.3 || bicarb < 15);
      let label = '';
      let riskLevel: 'moderate' | 'high' | 'critical' | 'low' | 'info' = 'info';
      let interpretation = '';
      if (hhsCore) {
        label = 'Compatible with HHS';
        riskLevel = ams ? 'critical' : 'high';
        interpretation = `Glucose ${glu}, osm ${osm}, pH ${ph}, HCO₃ ${bicarb}, minimal ketones — meets common HHS teaching criteria (glucose ≥600, osm ≥320, pH >7.3, bicarb typically ≥18, negligible ketosis). ${ams ? 'AMS present — critical care fluids/electrolytes.' : 'Assess neurology closely.'} Fluid resuscitation is the cornerstone; insulin after some volume restoration per protocol.`;
      } else if (mixed) {
        label = 'Mixed HHS–DKA features';
        riskLevel = 'critical';
        interpretation = `Severe hyperosmolar hyperglycemia with significant acidosis/ketosis — treat as mixed hyperglycemic crisis: careful fluids, insulin, electrolyte repletion, ICU.`;
      } else if (glu >= 600 && !osmOk) {
        label = 'Severe hyperglycemia — confirm osmolality';
        riskLevel = 'high';
        interpretation = `Glucose ≥600 but osmolality ${osm} <320. Recalculate effective osm; may still be evolving HHS or other states.`;
      } else {
        label = 'Does not meet full HHS criteria';
        riskLevel = 'moderate';
        interpretation = `Entered labs do not fulfill classic HHS cluster. Consider isolated hyperglycemia, DKA, or early crisis — treat ABC, fluids, and precipitant.`;
      }
      if (!bicarbStrict && hhsCore) {
        interpretation += ' Note: bicarb 15–17 is borderline vs stricter ≥18 cutoffs used in some definitions.';
      }
      return {
        score: osm,
        unit: 'mOsm/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Glucose ≥600', value: gluOk ? 'Yes' : `No (${glu})` },
          { label: 'Osm ≥320', value: osmOk ? 'Yes' : `No (${osm})` },
          { label: 'pH >7.3', value: ph > 7.3 ? 'Yes' : `No (${ph})` },
          { label: 'Bicarb', value: `${bicarb} (many defs ≥18)` },
          { label: 'Ketones', value: ket },
          { label: 'AMS', value: ams ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'HHS: glucose typically ≥600 mg/dL, effective osmolality ≥320 mOsm/kg, pH >7.3, bicarbonate ≥15–18, small ketones, frequent profound dehydration and AMS.',
      validation: 'ADA hyperglycemic crisis criteria; mixed DKA/HHS is common.',
      references: [
        {
          title: 'Hyperglycemic crises in adult patients with diabetes',
          citation: 'Kitabchi AE et al. Diabetes Care. 2009',
          year: 2009,
          pmid: '19564476',
          doi: '10.2337/dc09-9032',
        },
      ],
    },
    nextSteps: [
      { condition: 'HHS likely', actions: ['Aggressive controlled fluids', 'Electrolytes q frequent', 'Insulin per protocol after initial fluids', 'Find infection/MI/stroke precipitant', 'ICU'] },
    ],
    pearls: [
      'Fluid deficits often 8–12 L — correct gradually to avoid cerebral edema especially in younger patients.',
      'Thrombosis risk is high in HHS.',
    ],
  },

  // ─── 18. ABG stepwise ──────────────────────────────────────────────────────
  {
    id: 'abg-stepwise',
    name: 'Stepwise ABG Interpretation Helper',
    shortName: 'ABG Steps',
    description: 'Multi-select stepwise acid–base interpretation helper (pH process, primary disorder, compensation glance).',
    category: 'critical-care',
    tags: ['abg', 'vbg', 'acid-base', 'metabolic', 'respiratory'],
    whenToUse: 'Structured first-pass arterial (or venous) blood gas interpretation in acute care.',
    whyUse: 'Encodes a repeatable sequence: pH → primary process → compensation → anion gap → hidden disorders.',
    inputs: [
      numberInput('ph', 'pH', { min: 6.5, max: 7.8, step: 0.01, defaultValue: 7.28 }),
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 120, defaultValue: 40 }),
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 2, max: 60, step: 0.1, defaultValue: 18 }),
      numberInput('na', 'Na (for AG)', { unit: 'mEq/L', min: 110, max: 170, defaultValue: 140 }),
      numberInput('cl', 'Cl (for AG)', { unit: 'mEq/L', min: 70, max: 140, defaultValue: 104 }),
      numberInput('albumin', 'Albumin (optional AG adjust)', { unit: 'g/dL', min: 1, max: 5.5, step: 0.1, defaultValue: 4 }),
      yesNo('checkGap', 'Compute anion gap', 0),
    ],
    calculate(values) {
      const ph = num(values.ph, 7.28);
      const paco2 = num(values.paco2, 40);
      const hco3 = num(values.hco3, 18);
      const steps: string[] = [];
      let acidemia = ph < 7.4;
      let alkalemia = ph > 7.4;
      if (ph < 7.35) {
        steps.push('Step 1: Acidemia (pH <7.35)');
        acidemia = true;
      } else if (ph > 7.45) {
        steps.push('Step 1: Alkalemia (pH >7.45)');
        alkalemia = true;
      } else {
        steps.push('Step 1: pH normal-range (7.35–7.45) — may still hide mixed disorders');
      }
      // Primary process guess
      let primary = 'Indeterminate';
      if (acidemia || ph < 7.4) {
        if (paco2 > 45 && hco3 <= 24) primary = 'Respiratory acidosis (or mixed)';
        if (hco3 < 22 && paco2 <= 40) primary = 'Metabolic acidosis (or mixed)';
        if (paco2 > 45 && hco3 < 22) primary = 'Mixed metabolic + respiratory acidosis';
        if (hco3 < 22 && paco2 > 40) {
          // could be compensated met acidosis
          primary = 'Metabolic acidosis with respiratory compensation (evaluate expected CO₂)';
        }
      }
      if (alkalemia || ph > 7.4) {
        if (paco2 < 35 && hco3 >= 24) primary = 'Respiratory alkalosis (or mixed)';
        if (hco3 > 26 && paco2 >= 40) primary = 'Metabolic alkalosis (or mixed)';
        if (paco2 < 35 && hco3 > 26) primary = 'Mixed metabolic + respiratory alkalosis';
      }
      // refine with dominant deviation
      const co2Dev = paco2 - 40;
      const hco3Dev = hco3 - 24;
      if (ph < 7.4) {
        if (Math.abs(hco3Dev) >= Math.abs(co2Dev / 2) && hco3 < 24) primary = 'Metabolic acidosis primary likely';
        if (co2Dev > 0 && co2Dev >= Math.abs(hco3Dev) && paco2 > 40) primary = 'Respiratory acidosis primary likely';
      } else if (ph > 7.4) {
        if (hco3 > 24 && hco3Dev >= Math.abs(co2Dev / 2)) primary = 'Metabolic alkalosis primary likely';
        if (paco2 < 40 && Math.abs(co2Dev) >= hco3Dev) primary = 'Respiratory alkalosis primary likely';
      }
      steps.push(`Step 2: Primary process estimate — ${primary}`);
      // Winter's for met acidosis
      if (hco3 < 22) {
        const expectedCo2 = round(1.5 * hco3 + 8, 0);
        const lo = expectedCo2 - 2;
        const hi = expectedCo2 + 2;
        steps.push(`Step 3: Winter’s expected PaCO₂ ≈ ${expectedCo2} (range ${lo}–${hi}); actual ${paco2}`);
        if (paco2 < lo) steps.push('→ Additional respiratory alkalosis');
        else if (paco2 > hi) steps.push('→ Additional respiratory acidosis / inadequate compensation');
        else steps.push('→ Respiratory compensation roughly appropriate');
      } else if (hco3 > 26) {
        // metabolic alkalosis expected CO2 rise ~0.7 per 1 HCO3
        const expectedCo2 = round(40 + 0.7 * (hco3 - 24), 0);
        steps.push(`Step 3: Expected PaCO₂ for met. alk. ≈ ${expectedCo2}; actual ${paco2}`);
      } else if (paco2 > 45) {
        // acute vs chronic resp acidosis rules of thumb
        const acuteHco3 = round(24 + (paco2 - 40) / 10, 1);
        const chronicHco3 = round(24 + 4 * ((paco2 - 40) / 10), 1);
        steps.push(`Step 3: Resp acidosis — acute expected HCO₃≈${acuteHco3}, chronic≈${chronicHco3}; actual ${hco3}`);
      } else if (paco2 < 35) {
        const acuteHco3 = round(24 - 2 * ((40 - paco2) / 10), 1);
        const chronicHco3 = round(24 - 5 * ((40 - paco2) / 10), 1);
        steps.push(`Step 3: Resp alkalosis — acute expected HCO₃≈${acuteHco3}, chronic≈${chronicHco3}; actual ${hco3}`);
      } else {
        steps.push('Step 3: Compensation — no major primary HCO₃/CO₂ offset flagged');
      }
      let ag = 0;
      if (bool(values.checkGap)) {
        const na = num(values.na, 140);
        const cl = num(values.cl, 104);
        const alb = num(values.albumin, 4);
        ag = round(na - (cl + hco3), 1);
        const agCorr = round(ag + 2.5 * (4 - alb), 1);
        steps.push(`Step 4: Anion gap ${ag} (albumin-corrected ≈ ${agCorr})`);
        if (agCorr > 12) steps.push('→ Elevated gap — consider MUDPILES/GOLDMARK; check delta-delta for mixed met. disorders');
        else steps.push('→ Gap not elevated on entered electrolytes');
      } else {
        steps.push('Step 4: Anion gap not computed (enable to assess HAGMA)');
      }
      const riskLevel = ph < 7.2 || ph > 7.55 ? 'critical' : ph < 7.3 || ph > 7.5 ? 'high' : 'moderate';
      return {
        score: ph,
        unit: 'pH',
        label: primary,
        interpretation: steps.join(' '),
        riskLevel: riskLevel as 'critical' | 'high' | 'moderate',
        details: [
          { label: 'pH', value: String(ph) },
          { label: 'PaCO₂', value: `${paco2} mmHg` },
          { label: 'HCO₃', value: `${hco3} mEq/L` },
          { label: 'Primary estimate', value: primary },
          ...(bool(values.checkGap) ? [{ label: 'Anion gap', value: String(ag) }] : []),
        ],
        recommendations: ['Always integrate clinical context and lactate/ketones', 'Use dedicated Winter’s / delta-delta tools for precision'],
      };
    },
    evidence: {
      summary:
        'Stepwise ABG: (1) pH acid/alkaline (2) primary metabolic vs respiratory (3) expected compensation (Winter’s for met. acidosis) (4) anion gap and mixed disorders.',
      formula: 'Winter’s: expected PaCO₂ = 1.5×[HCO₃] + 8 ±2',
      validation: 'Standard teaching algorithm; rules of thumb approximate acute vs chronic respiratory disorders.',
      references: [
        {
          title: 'Acid-base disorders',
          citation: 'Berend K et al. N Engl J Med. 2014',
          year: 2014,
          pmid: '25295502',
          doi: '10.1056/NEJMra1003327',
        },
      ],
    },
    nextSteps: [
      { condition: 'Metabolic acidosis', actions: ['Lactate, ketones, toxic alcohols as indicated', 'Calculate AG and delta-delta', 'Treat cause'] },
      { condition: 'Respiratory failure pattern', actions: ['Airway/ventilation assessment', 'Repeat gas after therapy'] },
    ],
    pearls: [
      'Normal pH does not exclude mixed acidosis + alkalosis.',
      'Venous blood gas approximates pH/HCO₃ but not PaO₂.',
    ],
  },

  // ─── 19. Mixed disorder detector ───────────────────────────────────────────
  {
    id: 'mixed-disorder',
    name: 'Mixed Acid–Base Disorder Detector',
    shortName: 'Mixed AB',
    description: 'Compares actual PaCO₂ or HCO₃ with expected compensation to flag additional mixed acid–base disorders.',
    category: 'critical-care',
    tags: ['acid-base', 'mixed disorder', 'winters', 'compensation'],
    whenToUse: 'Known or suspected primary metabolic/respiratory disorder when checking whether compensation is appropriate.',
    whyUse: 'Inappropriate compensation implies a second primary process requiring separate treatment.',
    inputs: [
      selectInput('primary', 'Assumed primary disorder', [
        { label: 'Metabolic acidosis', value: 'met_acid' },
        { label: 'Metabolic alkalosis', value: 'met_alk' },
        { label: 'Respiratory acidosis (acute)', value: 'resp_acid_acute' },
        { label: 'Respiratory acidosis (chronic)', value: 'resp_acid_chronic' },
        { label: 'Respiratory alkalosis (acute)', value: 'resp_alk_acute' },
        { label: 'Respiratory alkalosis (chronic)', value: 'resp_alk_chronic' },
      ]),
      numberInput('hco3', 'Measured HCO₃⁻', { unit: 'mEq/L', min: 2, max: 60, step: 0.1, defaultValue: 12 }),
      numberInput('paco2', 'Measured PaCO₂', { unit: 'mmHg', min: 10, max: 120, defaultValue: 28 }),
      numberInput('ph', 'pH (context)', { min: 6.5, max: 7.8, step: 0.01, defaultValue: 7.28 }),
    ],
    calculate(values) {
      const primary = str(values.primary, 'met_acid');
      const hco3 = num(values.hco3, 12);
      const paco2 = num(values.paco2, 28);
      const ph = num(values.ph, 7.28);
      let expected = 40;
      let band = 2;
      let compare: 'co2' | 'hco3' = 'co2';
      let formula = '';
      if (primary === 'met_acid') {
        expected = 1.5 * hco3 + 8;
        band = 2;
        compare = 'co2';
        formula = 'Winter’s: 1.5×HCO₃+8 ±2';
      } else if (primary === 'met_alk') {
        expected = 40 + 0.7 * (hco3 - 24);
        band = 5;
        compare = 'co2';
        formula = 'Expected PaCO₂ ≈ 40 + 0.7×ΔHCO₃ (±5)';
      } else if (primary === 'resp_acid_acute') {
        expected = 24 + (paco2 - 40) / 10;
        band = 2;
        compare = 'hco3';
        formula = 'Acute: ΔHCO₃ ≈ +1 per +10 mmHg PaCO₂';
      } else if (primary === 'resp_acid_chronic') {
        expected = 24 + 4 * ((paco2 - 40) / 10);
        band = 2;
        compare = 'hco3';
        formula = 'Chronic: ΔHCO₃ ≈ +4 per +10 mmHg PaCO₂';
      } else if (primary === 'resp_alk_acute') {
        expected = 24 - 2 * ((40 - paco2) / 10);
        band = 2;
        compare = 'hco3';
        formula = 'Acute: ΔHCO₃ ≈ −2 per −10 mmHg PaCO₂';
      } else {
        expected = 24 - 5 * ((40 - paco2) / 10);
        band = 2;
        compare = 'hco3';
        formula = 'Chronic: ΔHCO₃ ≈ −5 per −10 mmHg PaCO₂';
      }
      expected = round(expected, 1);
      const actual = compare === 'co2' ? paco2 : hco3;
      const delta = round(actual - expected, 1);
      let label = 'Compensation appropriate';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation = '';
      if (Math.abs(delta) <= band) {
        interpretation = `Actual ${compare === 'co2' ? 'PaCO₂' : 'HCO₃'} ${actual} is within ~${band} of expected ${expected}. Compensation appears appropriate for the assumed primary disorder — still verify clinically.`;
      } else if (compare === 'co2') {
        if (delta > band) {
          label = 'Additional respiratory acidosis / under-compensation';
          riskLevel = 'high';
          interpretation = `PaCO₂ ${paco2} is higher than expected ${expected} (Δ +${delta}). Suggests concurrent respiratory acidosis or failing respiratory compensation.`;
        } else {
          label = 'Additional respiratory alkalosis / over-compensation';
          riskLevel = 'high';
          interpretation = `PaCO₂ ${paco2} is lower than expected ${expected} (Δ ${delta}). Suggests concurrent primary respiratory alkalosis.`;
        }
      } else {
        // comparing HCO3 for primary respiratory disorders
        if (primary.includes('acid')) {
          if (delta > band) {
            label = 'Additional metabolic alkalosis';
            riskLevel = 'high';
            interpretation = `HCO₃ ${hco3} higher than expected ${expected} for respiratory acidosis — additional metabolic alkalosis.`;
          } else {
            label = 'Additional metabolic acidosis';
            riskLevel = 'high';
            interpretation = `HCO₃ ${hco3} lower than expected ${expected} for respiratory acidosis — additional metabolic acidosis.`;
          }
        } else {
          if (delta > band) {
            label = 'Additional metabolic alkalosis / incomplete renal compensation';
            riskLevel = 'moderate';
            interpretation = `HCO₃ ${hco3} vs expected ${expected} for respiratory alkalosis — consider mixed metabolic alkalosis or timing (renal compensation evolves over days).`;
          } else {
            label = 'Additional metabolic acidosis';
            riskLevel = 'high';
            interpretation = `HCO₃ ${hco3} lower than expected ${expected} for respiratory alkalosis — additional metabolic acidosis.`;
          }
        }
      }
      return {
        score: delta,
        unit: compare === 'co2' ? 'mmHg vs expected' : 'mEq/L vs expected',
        label,
        interpretation: `${interpretation} pH context ${ph}. Rule: ${formula}.`,
        riskLevel,
        details: [
          { label: 'Assumed primary', value: primary },
          { label: 'Expected', value: String(expected) },
          { label: 'Actual', value: String(actual) },
          { label: 'Delta (actual − expected)', value: String(delta) },
          { label: 'Tolerance band', value: `±${band}` },
        ],
      };
    },
    evidence: {
      summary:
        'Expected compensation formulas (Winter’s for metabolic acidosis; rules of thumb for metabolic alkalosis and acute/chronic respiratory disorders) detect mixed disorders when measured values fall outside the expected band.',
      formula: 'Winter’s PaCO₂ = 1.5×[HCO₃]+8 ±2; other rules as selected',
      validation: 'Teaching approximations; wide confidence bands in real patients — clinical correlation required.',
      references: [
        {
          title: 'Simple and mixed acid-base disorders',
          citation: 'Berend K et al. N Engl J Med. 2014',
          year: 2014,
          pmid: '25295502',
          doi: '10.1056/NEJMra1003327',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mixed disorder flagged', actions: ['Identify second process (lactate, sepsis hypervent, COPD, vomiting, diuretics)', 'Treat each primary cause'] },
      { condition: 'Appropriate compensation', actions: ['Treat primary disorder', 'Serial gases'] },
    ],
    pearls: [
      'Compensation never fully normalizes pH in a single simple disorder.',
      'Always compute anion gap in metabolic acidosis.',
    ],
  },

  // ─── 20. Shunt estimate ────────────────────────────────────────────────────
  {
    id: 'shunt-estimate',
    name: 'Estimated Physiologic Shunt Fraction (Qs/Qt)',
    shortName: 'Shunt Est.',
    description: 'Educational estimated shunt fraction using classic content-based simplified inputs (or iso-shunt style PaO₂/FiO₂ approximation).',
    category: 'pulmonary',
    tags: ['shunt', 'qs/qt', 'hypoxemia', 'icu', 'oxygen'],
    whenToUse: 'Severe hypoxemia workup when estimating shunt fraction educationally from ABG and assumed contents.',
    whyUse: 'Qs/Qt helps frame true shunt vs V/Q mismatch (shunt responds poorly to FiO₂ alone).',
    inputs: [
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 60 }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', min: 0.21, max: 1, step: 0.01, defaultValue: 1.0 }),
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 100, defaultValue: 40 }),
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 5, max: 20, step: 0.1, defaultValue: 12 }),
      numberInput('pvO2', 'Mixed venous PO₂ (assume if unknown)', { unit: 'mmHg', min: 20, max: 50, defaultValue: 40 }),
      selectInput('mode', 'Method', [
        { label: 'Simplified content shunt (educational)', value: 'content' },
        { label: 'Rough iso-shunt from P/F only', value: 'pf' },
      ]),
    ],
    calculate(values) {
      const pao2 = num(values.pao2, 60);
      const fio2 = num(values.fio2, 1);
      const paco2 = num(values.paco2, 40);
      const hb = num(values.hb, 12);
      const pvo2 = num(values.pvO2, 40);
      const mode = str(values.mode, 'content');
      // Ideal alveolar PO2
      const pao2A = fio2 * (760 - 47) - paco2 / 0.8;
      const cao2 = (hb * 1.34 * (pao2 / (pao2 + 27)) + 0.003 * pao2); // crude sat approx
      // End-pulmonary capillary: assume sat ~1.0 if PAO2 high
      const pcO2 = Math.max(pao2A, pao2);
      const ccO2 = hb * 1.34 * Math.min(1, pcO2 / (pcO2 + 27) + 0.001) + 0.003 * pcO2;
      const cvO2 = hb * 1.34 * (pvo2 / (pvo2 + 27)) + 0.003 * pvo2;
      let qs = 0;
      if (mode === 'pf') {
        // Very rough: classic teaching iso-shunt estimates — not precise
        const pf = pao2 / Math.max(fio2, 0.21);
        if (pf >= 400) qs = 5;
        else if (pf >= 300) qs = 10;
        else if (pf >= 200) qs = 15;
        else if (pf >= 150) qs = 20;
        else if (pf >= 100) qs = 25;
        else qs = 35;
      } else {
        const denom = ccO2 - cvO2;
        qs = denom > 0 ? round(((ccO2 - cao2) / denom) * 100, 1) : 0;
        qs = clamp01to100(qs);
      }
      const qsR = round(qs, 1);
      const r = riskFromThresholds(qsR, [
        {
          max: 10,
          level: 'low',
          label: 'Near-normal / low shunt estimate',
          interpretation: `Estimated Qs/Qt ≈ ${qsR}%. Normal physiologic shunt is ~2–5%. Values ≤10% often compatible with mild V/Q issues; treat cause of hypoxemia.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Moderate shunt estimate',
          interpretation: `Estimated Qs/Qt ≈ ${qsR}%. Moderate shunt-range estimate — consider atelectasis, pneumonia, edema; PEEP/recruitment strategies may help more than FiO₂ alone.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High shunt estimate',
          interpretation: `Estimated Qs/Qt ≈ ${qsR}%. High shunt — severe lung pathology or cardiac shunt. Escalate ventilatory strategy and evaluate for anatomic shunt if discordant.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high shunt estimate',
          interpretation: `Estimated Qs/Qt ≈ ${qsR}%. Very high estimated shunt fraction — critical hypoxemia physiology; advanced supports as indicated.`,
        },
      ]);
      return {
        score: qsR,
        unit: '%',
        ...r,
        details: [
          { label: 'PAO₂ (ideal alveolar)', value: `${round(pao2A, 0)} mmHg` },
          { label: 'Method', value: mode === 'pf' ? 'Rough P/F iso-shunt' : 'Simplified content' },
          { label: 'Assumed PvO₂', value: `${pvo2} mmHg` },
        ],
        recommendations: ['Requires accurate mixed venous sampling for true Qs/Qt', 'Educational estimate only'],
      };
    },
    evidence: {
      summary:
        'Classic shunt equation: Qs/Qt = (CcO₂ − CaO₂)/(CcO₂ − CvO₂). This tool uses simplified saturations from PO₂ and assumed PvO₂ — not a substitute for formal calculated shunt with measured gases/contents.',
      formula: 'Qs/Qt = (CcO₂ − CaO₂)/(CcO₂ − CvO₂)',
      validation: 'Educational physiology aid; iso-shunt charts historically related PaO₂/FiO₂ to shunt under assumptions.',
      references: [
        {
          title: 'Pulmonary physiology of shunt and V/Q mismatch',
          citation: 'Classic respiratory physiology references; West JB; StatPearls Hypoxia and Hypoxemia',
          year: 2012,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482316/',
        },
      ],
    },
    nextSteps: [
      { condition: 'High estimated shunt', actions: ['Optimize PEEP/positioning', 'Treat collapse/edema/pneumonia', 'Consider echo for intracardiac shunt if unexplained'] },
    ],
    pearls: [
      '100% O₂ shunt study distinguishes true shunt from low V/Q.',
      'Anemia lowers oxygen content and confounds simplified models.',
    ],
  },

  // ─── 21. Rule of 150 ───────────────────────────────────────────────────────
  {
    id: 'rule-of-150',
    name: 'Rule of 150 (PaO₂ Estimate)',
    shortName: 'Rule of 150',
    description: 'Rough room-air PaO₂ estimate: PaO₂ + PaCO₂ ≈ 150 mmHg at sea level (educational).',
    category: 'pulmonary',
    tags: ['pao2', 'rule of 150', 'abg', 'hypoxemia'],
    whenToUse: 'Quick sanity check of room-air ABG values at sea level or rough expected PaO₂ from PaCO₂.',
    whyUse: 'On room air, PaO₂ ≈ 150 − PaCO₂ (simplified alveolar gas). Large shortfalls suggest A–a gradient elevation.',
    inputs: [
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 100, defaultValue: 40 }),
      numberInput('pao2', 'Measured PaO₂ (optional)', {
        unit: 'mmHg',
        min: 0,
        max: 600,
        defaultValue: 95,
        helpText: 'Enter 0 if unknown — only expected value shown',
      }),
      selectInput('fio2', 'FiO₂ context', [
        { label: 'Room air (0.21) — rule applies', value: 'ra' },
        { label: 'Supplemental O₂ — rule invalid', value: 'o2' },
      ]),
    ],
    calculate(values) {
      const paco2 = num(values.paco2, 40);
      const pao2 = num(values.pao2, 95);
      const ra = str(values.fio2, 'ra') === 'ra';
      const expected = round(150 - paco2, 0);
      // slightly more precise: 150 - 1.25*PaCO2 sometimes taught
      const expectedAlt = round(150 - 1.25 * paco2, 0);
      if (!ra) {
        return {
          score: expected,
          unit: 'mmHg',
          label: 'Rule of 150 not valid on supplemental O₂',
          interpretation: 'The PaO₂ + PaCO₂ ≈ 150 rule assumes room air at sea level. On supplemental oxygen use A–a gradient with actual FiO₂ instead.',
          riskLevel: 'info' as const,
          details: [{ label: 'Rough RA expected if off O₂', value: `≈${expected} mmHg` }],
        };
      }
      const measured = pao2 > 0;
      const sum = measured ? round(pao2 + paco2, 0) : null;
      const deficit = measured ? round(expected - pao2, 0) : null;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = `Expected PaO₂ ≈ ${expected} mmHg`;
      let interpretation = `Rule of 150: expected room-air PaO₂ ≈ 150 − PaCO₂ = ${expected} mmHg (alternate teaching 150 − 1.25×PaCO₂ ≈ ${expectedAlt}).`;
      if (measured && deficit !== null && sum !== null) {
        interpretation += ` Measured PaO₂ ${pao2}; sum PaO₂+PaCO₂=${sum} (≈150 if normal A–a on RA).`;
        if (deficit <= 10) {
          riskLevel = 'normal';
          label = 'Near expected for rule of 150';
          interpretation += ' Values roughly consistent with normal A–a on room air.';
        } else if (deficit <= 30) {
          riskLevel = 'moderate';
          label = 'PaO₂ below rule-of-150 expectation';
          interpretation += ` Deficit ~${deficit} mmHg suggests elevated A–a gradient (V/Q, shunt, diffusion, or measurement issues).`;
        } else {
          riskLevel = 'high';
          label = 'Large shortfall vs rule of 150';
          interpretation += ` Large deficit ~${deficit} mmHg — significant gas exchange abnormality likely.`;
        }
      }
      return {
        score: expected,
        unit: 'mmHg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Expected PaO₂ (150 − PaCO₂)', value: `${expected} mmHg` },
          { label: 'Alternate (150 − 1.25×PaCO₂)', value: `${expectedAlt} mmHg` },
          { label: 'Measured PaO₂', value: measured ? `${pao2} mmHg` : 'Not provided' },
          { label: 'PaO₂ + PaCO₂', value: sum !== null ? String(sum) : '—' },
        ],
      };
    },
    evidence: {
      summary:
        'Simplified alveolar gas on room air at sea level: PIO₂≈150 mmHg; PAO₂≈150−PaCO₂/RQ. Bedside “rule of 150”: PaO₂ + PaCO₂ ≈ 150 if A–a is normal.',
      formula: 'Expected PaO₂ ≈ 150 − PaCO₂ (room air, sea level)',
      validation: 'Rough teaching rule only; age-related A–a increase and non-sea-level barometric pressure limit accuracy.',
      references: [
        {
          title: 'The alveolar gas equation',
          citation: 'Classic respiratory physiology teaching; StatPearls Alveolar Gas Equation',
          year: 2012,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482268/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Large deficit', actions: ['Compute formal A–a gradient', 'CXR/US', 'Assess for PE/pneumonia/edema/shunt'] },
    ],
    pearls: [
      'Does not apply on supplemental oxygen or at altitude without adjustment.',
      'Elderly patients have higher normal A–a gradients.',
    ],
  },

  // ─── 22. Altitude PaO2 ─────────────────────────────────────────────────────
  {
    id: 'altitude-pao2',
    name: 'Expected PaO₂ at Altitude (Educational)',
    shortName: 'Altitude PaO₂',
    description: 'Estimates inspired and alveolar PO₂ from altitude (barometric pressure) with optional PaCO₂ for expected PaO₂ band.',
    category: 'pulmonary',
    tags: ['altitude', 'pao2', 'hypoxia', 'barometric pressure', 'travel'],
    whenToUse: 'Travel/medicine or interpreting hypoxemia at elevation; teaching alveolar gas equation at low PB.',
    whyUse: 'Barometric pressure falls with altitude, lowering PIO₂ and expected PaO₂ even in healthy lungs.',
    inputs: [
      numberInput('altitude', 'Altitude', { unit: 'm', min: 0, max: 9000, defaultValue: 2500 }),
      numberInput('paco2', 'PaCO₂ (assume lower at altitude if hyperventilating)', {
        unit: 'mmHg',
        min: 10,
        max: 50,
        defaultValue: 32,
      }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', min: 0.21, max: 1, step: 0.01, defaultValue: 0.21 }),
      numberInput('aa', 'Assumed A–a gradient', { unit: 'mmHg', min: 0, max: 60, defaultValue: 10 }),
    ],
    calculate(values) {
      const alt = num(values.altitude, 2500);
      const paco2 = num(values.paco2, 32);
      const fio2 = num(values.fio2, 0.21);
      const aa = num(values.aa, 10);
      // Approximate barometric pressure (mmHg) vs altitude (m): PB ≈ 760 * exp(-alt/8500) simplified
      const pb = round(760 * Math.exp(-alt / 8500), 0);
      const pio2 = round(fio2 * (pb - 47), 0);
      const pao2Alv = round(pio2 - paco2 / 0.8, 0);
      const expectedPao2 = round(pao2Alv - aa, 0);
      const r = riskFromThresholds(expectedPao2, [
        {
          max: 49,
          level: 'critical',
          label: 'Very low expected PaO₂',
          interpretation: `At ${alt} m (PB≈${pb} mmHg), expected PaO₂ ≈ ${expectedPao2} mmHg. Extreme hypoxia risk — supplemental O₂ / descent considerations for vulnerable patients.`,
        },
        {
          max: 59,
          level: 'high',
          label: 'Low expected PaO₂',
          interpretation: `Expected PaO₂ ≈ ${expectedPao2} mmHg at ${alt} m. Significant ambient hypoxia; caution for lung disease, PH, CAD; consider O₂ for air travel/altitude illness protocols.`,
        },
        {
          max: 79,
          level: 'moderate',
          label: 'Reduced expected PaO₂',
          interpretation: `Expected PaO₂ ≈ ${expectedPao2} mmHg at ${alt} m. Mild–moderate ambient reduction; healthy acclimatization often OK, cardiopulmonary disease may need evaluation.`,
        },
        {
          max: 120,
          level: 'low',
          label: 'Near sea-level expected range',
          interpretation: `Expected PaO₂ ≈ ${expectedPao2} mmHg at ${alt} m (PB≈${pb}). Relatively modest reduction from sea level.`,
        },
      ]);
      return {
        score: expectedPao2,
        unit: 'mmHg',
        ...r,
        details: [
          { label: 'Approx. barometric pressure', value: `${pb} mmHg` },
          { label: 'PIO₂', value: `${pio2} mmHg` },
          { label: 'Ideal PAO₂', value: `${pao2Alv} mmHg` },
          { label: 'Assumed A–a', value: `${aa} mmHg` },
          { label: 'PaCO₂ used', value: `${paco2} mmHg` },
        ],
      };
    },
    evidence: {
      summary:
        'PB falls with altitude; PIO₂ = FiO₂×(PB−47); PAO₂ ≈ PIO₂ − PaCO₂/RQ. Expected PaO₂ = PAO₂ − A–a. Acclimatization lowers PaCO₂ via hyperventilation, partially defending PAO₂.',
      formula: 'PB≈760·e^(−alt/8500); PAO₂=FiO₂(PB−47)−PaCO₂/0.8; PaO₂≈PAO₂−(A–a)',
      validation: 'Educational approximation of barometric pressure; actual PB varies with weather and exact location.',
      references: [
        {
          title: 'Altitude physiology and hypoxemia',
          citation: 'West JB. High-altitude medicine physiology texts; StatPearls High-Altitude Oxygenation',
          year: 2012,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK539701/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Cardiopulmonary disease + altitude travel', actions: ['Pre-travel SpO₂/ABG', 'Consider HAST for air travel', 'Portable O₂ planning'] },
      { condition: 'Altitude illness symptoms', actions: ['Descent', 'O₂', 'Acetazolamide/dexamethasone per syndrome'] },
    ],
    pearls: [
      'Cabin pressure in commercial aircraft ≈ 1500–2500 m equivalent.',
      'Hyperventilation (low PaCO₂) is the normal acclimatization response.',
    ],
  },

  // ─── 23. Smoke inhalation ──────────────────────────────────────────────────
  {
    id: 'smoke-inhalation',
    name: 'Smoke Inhalation Severity Checklist',
    shortName: 'Smoke Inhalation',
    description: 'Checklist of clinical features suggesting significant smoke inhalation injury and need for airway vigilance.',
    category: 'emergency',
    tags: ['smoke', 'inhalation', 'burn', 'airway', 'co', 'cyanide'],
    whenToUse: 'Fire/smoke exposure patients in ED or burn triage for inhalation injury risk.',
    whyUse: 'Inhalation injury drives mortality in burns; early airway protection decisions are critical.',
    inputs: [
      yesNo('closedSpace', 'Closed-space fire exposure', 1),
      yesNo('facialBurns', 'Facial burns', 1),
      yesNo('singed', 'Singed nasal hair / carbonaceous sputum', 1),
      yesNo('hoarse', 'Hoarseness / stridor / voice change', 1),
      yesNo('wheeze', 'Wheeze / dyspnea / hypoxia', 1),
      yesNo('ams', 'Altered mental status', 1),
      yesNo('highCo', 'Known elevated COHb or cyanide concern (industrial/plastic fire)', 1),
      yesNo('largeTbsa', 'Large TBSA burns', 1),
    ],
    calculate(values) {
      const keys = ['closedSpace', 'facialBurns', 'singed', 'hoarse', 'wheeze', 'ams', 'highCo', 'largeTbsa'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const airwayThreat = bool(values.hoarse) || bool(values.ams) || (bool(values.facialBurns) && bool(values.singed));
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Lower likelihood features',
          interpretation: `Checklist ${score}/8. Fewer classic features — still observe if closed-space history; check COHb when indicated; serial airway exams.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Possible inhalation injury',
          interpretation: `Checklist ${score}/8. Intermediate concern — ABG/VBG, COHb, chest imaging as indicated, fiberoptic evaluation per burn center practice, early burn center contact.`,
        },
        {
          max: 8,
          level: 'critical',
          label: 'High concern for inhalation injury',
          interpretation: `Checklist ${score}/8. High concern — prepare for definitive airway, 100% O₂, cyanide consideration in severe lactic acidosis/soot industrial fires, burn center transfer.`,
        },
      ]);
      return {
        score,
        unit: '/8',
        label: airwayThreat ? `${r.label} · airway threat flags` : r.label,
        interpretation: airwayThreat
          ? `${r.interpretation} Airway threat features present (voice change/stridor/AMS/combined facial soot signs) — low threshold for early intubation by experienced operator.`
          : r.interpretation,
        riskLevel: airwayThreat && score >= 2 ? 'critical' : r.riskLevel,
        details: [
          { label: 'Features positive', value: `${score}/8` },
          { label: 'Airway threat flags', value: airwayThreat ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Risk features for inhalation injury: closed space, facial burns, soot, singed hairs, carbonaceous sputum, voice change/stridor, hypoxia, high COHb. Airway edema can progress rapidly.',
      validation: 'Clinical consensus / burn society teaching; bronchoscopy is diagnostic gold standard in many centers.',
      references: [
        {
          title: 'Inhalation injury and burn care',
          citation: 'ABA / burn critical care reviews',
          year: 2017,
          pmid: '35118322',
          doi: '10.21037/med-21-7',
        },
      ],
    },
    nextSteps: [
      { condition: 'Airway threat', actions: ['Early controlled intubation', '100% O₂', 'Burn center transfer', 'COHb ± cyanide pathway'] },
      { condition: 'Moderate risk', actions: ['Serial exams', 'COHb', 'Bronchoscopy per protocol', 'Fluid resuscitation if cutaneous burns'] },
    ],
    pearls: [
      'A “normal” early airway exam can worsen with fluids and progressive edema.',
      'Assume CO exposure in enclosed fires until levels return.',
    ],
  },

  // ─── 24. Carboxyhemoglobin half-life ───────────────────────────────────────
  {
    id: 'carboxy-half-life',
    name: 'Carboxyhemoglobin Half-Life (O₂ Context)',
    shortName: 'CO Half-Life',
    description: 'Educational half-life of carboxyhemoglobin on room air vs 100% oxygen vs hyperbaric oxygen.',
    category: 'toxicology',
    tags: ['carbon monoxide', 'cohb', 'half-life', 'hyperbaric', 'oxygen'],
    whenToUse: 'CO poisoning management counseling on expected COHb clearance with oxygen therapy.',
    whyUse: 'Illustrates why 100% NRB oxygen is mandatory and when HBO is considered to accelerate clearance.',
    inputs: [
      numberInput('cohb', 'Current COHb', { unit: '%', min: 0, max: 70, step: 0.1, defaultValue: 25 }),
      selectInput('therapy', 'Oxygen therapy', [
        { label: 'Room air', value: 'ra' },
        { label: '100% NRB / high-flow O₂', value: 'nrb' },
        { label: 'Hyperbaric oxygen (HBO)', value: 'hbo' },
      ]),
      numberInput('hours', 'Hours on selected therapy (estimate remaining)', {
        unit: 'h',
        min: 0,
        max: 24,
        step: 0.5,
        defaultValue: 1.5,
      }),
    ],
    calculate(values) {
      const cohb = num(values.cohb, 25);
      const therapy = str(values.therapy, 'nrb');
      const hours = num(values.hours, 1.5);
      // Classic half-lives: RA ~4–6 h (use 5), 100% O2 ~60–90 min (use 1.25 h), HBO ~20–30 min (use 0.4 h)
      const tHalf = therapy === 'ra' ? 5 : therapy === 'nrb' ? 1.25 : 0.4;
      const therapyLabel = therapy === 'ra' ? 'room air' : therapy === 'nrb' ? '100% oxygen' : 'HBO';
      const remaining = round(cohb * Math.pow(0.5, hours / tHalf), 1);
      const toTen = cohb > 10 ? round(tHalf * Math.log(cohb / 10) / Math.log(2), 1) : 0;
      const r = riskFromThresholds(cohb, [
        {
          max: 10,
          level: 'low',
          label: 'Lower COHb range',
          interpretation: `COHb ${cohb}%. Smokers may baseline 5–10%. Continue O₂ until asymptomatic and levels fall per protocol.`,
        },
        {
          max: 25,
          level: 'high',
          label: 'Clinically important COHb',
          interpretation: `COHb ${cohb}%. Significant exposure — 100% oxygen immediately; evaluate neuro status and cardiac ischemia.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Severe COHb',
          interpretation: `COHb ${cohb}%. Severe poisoning range — 100% O₂, consider HBO criteria (syncope, coma, focal neuro, pregnancy, cardiac ischemia, very high levels per local protocol).`,
        },
      ]);
      return {
        score: remaining,
        unit: '% est. after therapy time',
        label: `${r.label} · t½ ≈ ${tHalf} h on ${therapyLabel}`,
        interpretation: `${r.interpretation} Classic half-life on ${therapyLabel} ≈ ${tHalf} h (RA ~4–6 h, NRB ~60–90 min, HBO ~20–30 min). After ${hours} h estimated COHb ≈ ${remaining}%. Time to ~10% on this therapy ≈ ${toTen} h (monoexponential educational model).`,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Starting COHb', value: `${cohb}%` },
          { label: 'Therapy t½ used', value: `${tHalf} h (${therapyLabel})` },
          { label: `Estimated COHb after ${hours} h`, value: `${remaining}%` },
          { label: 'Est. hours to 10% COHb', value: `${toTen} h` },
        ],
      };
    },
    evidence: {
      summary:
        'COHb elimination half-life: ~4–6 h on room air, ~60–90 min on 100% oxygen at 1 atm, ~20–30 min with hyperbaric oxygen — approximate values used for teaching.',
      formula: 'C(t) = C₀ × 0.5^(t / t½)',
      validation: 'Widely cited toxicology half-lives; individual clearance varies with ventilation and CO exposure ongoing.',
      references: [
        {
          title: 'Carbon monoxide poisoning',
          citation: 'Weaver LK. N Engl J Med. 2009',
          year: 2009,
          pmid: '19297574',
          doi: '10.1056/NEJMcp0808891',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any symptomatic CO poisoning', actions: ['100% oxygen until COHb low and symptoms improve', 'ECG/troponin if indicated', 'Consider HBO per criteria', 'Source removal'] },
    ],
    pearls: [
      'Pulse oximetry cannot distinguish COHb — use co-oximetry.',
      'Fetal hemoglobin binds CO more avidly — lower threshold for HBO in pregnancy in many protocols.',
    ],
  },

  // ─── 25. Beta-blocker toxicity ─────────────────────────────────────────────
  {
    id: 'beta-blocker-tox',
    name: 'Beta-Blocker Toxicity Checklist',
    shortName: 'BB Tox',
    description: 'Severity feature checklist for beta-blocker overdose with educational glucagon / high-dose insulin notes.',
    category: 'toxicology',
    tags: ['beta blocker', 'overdose', 'glucagon', 'bradycardia', 'toxicology'],
    whenToUse: 'Suspected or known beta-blocker overdose with cardiovascular toxicity.',
    whyUse: 'Structures red-flag features and first-line antidotal considerations (glucagon, vasopressors, HIET).',
    inputs: [
      yesNo('bradycardia', 'Symptomatic bradycardia', 1),
      yesNo('hypotension', 'Hypotension / shock', 1),
      yesNo('ams', 'Altered mental status / seizure (esp. propranolol)', 1),
      yesNo('hypoglycemia', 'Hypoglycemia', 1),
      yesNo('qrsWide', 'QRS widening (membrane-stabilizing agents, e.g. propranolol)', 1),
      yesNo('bronchospasm', 'Bronchospasm', 1),
      yesNo('refractory', 'Refractory to fluids + atropine + standard pressors', 1),
      selectInput('agent', 'Agent class (if known)', [
        { label: 'Unknown / mixed', value: 'unknown' },
        { label: 'Propranolol / lipophilic + membrane stabilizing', value: 'propranolol' },
        { label: 'Sotalol (Class III) — QT/torsades risk', value: 'sotalol' },
        { label: 'Other selective β1', value: 'selective' },
      ]),
    ],
    calculate(values) {
      const keys = ['bradycardia', 'hypotension', 'ams', 'hypoglycemia', 'qrsWide', 'bronchospasm', 'refractory'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const agent = str(values.agent, 'unknown');
      const severe = bool(values.hypotension) || bool(values.refractory) || (bool(values.bradycardia) && bool(values.ams));
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';
      if (score === 0) {
        label = 'No severity features entered';
        riskLevel = 'low';
        interpretation =
          'No toxicity features selected. Observe based on agent kinetics/dose; asymptomatic patients may still need monitoring for delayed effects (extended-release).';
      } else if (!severe && score <= 2) {
        label = 'Mild–moderate toxicity features';
        riskLevel = 'moderate';
        interpretation = `Features ${score}/7. Supportive care, atropine for bradycardia, fluids, glucose for hypo. Prepare glucagon if CV toxicity progresses.`;
      } else {
        label = 'Severe beta-blocker toxicity pattern';
        riskLevel = 'critical';
        interpretation = `Features ${score}/7 with unstable pattern. Critical care: glucagon bolus + infusion (educational first-line antidote for BB shock/bradycardia), epinephrine, consider high-dose insulin euglycemia therapy (HIET), IV lipid for lipophilic agents, sodium bicarb if wide QRS (propranolol). Contact poison control.`;
      }
      if (agent === 'propranolol') {
        interpretation += ' Propranolol: seizures, QRS widening, lipid emulsion consideration.';
      } else if (agent === 'sotalol') {
        interpretation += ' Sotalol: monitor QT, treat torsades (Mg, pacing/isoproterenol strategies).';
      }
      if (bool(values.refractory)) {
        interpretation += ' Refractory cases: HIET, mechanical support pathways per toxicology.';
      }
      return {
        score,
        unit: 'features',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Severity features', value: `${score}/7` },
          { label: 'Agent frame', value: agent },
          { label: 'Glucagon note', value: 'Bolus then infusion if response — educational; follow local tox dosing' },
        ],
        recommendations: [
          'Poison control consultation',
          'Do not rely on atropine alone in severe BB OD',
          'HIET requires concentrated insulin + glucose/K monitoring',
        ],
      };
    },
    evidence: {
      summary:
        'Beta-blocker OD: bradycardia, hypotension, hypoglycemia, bronchospasm; propranolol adds sodium-channel blockade and seizures. Glucagon increases cAMP independent of β-receptors; HIET and catecholamines used in severe shock.',
      validation: 'Toxicology consensus / expert guidance; dosing is institution- and poison-center-specific.',
      references: [
        {
          title: 'Beta-blocker and calcium channel blocker toxicity',
          citation: 'Graudins A et al. Br J Clin Pharmacol. 2016',
          year: 2016,
          pmid: '26344579',
          doi: '10.1111/bcp.12763',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Unstable BB overdose',
        actions: ['ABCs / pacing readiness', 'Glucagon', 'Vasopressors', 'Consider HIET', 'Poison control', 'Bicarb if wide QRS'],
      },
      {
        condition: 'Mild',
        actions: ['Monitor', 'Glucose checks', 'Decontamination if early and appropriate'],
      },
    ],
    pearls: [
      'Glucagon may cause vomiting — protect airway.',
      'Differentiate from CCB OD (more hyperglycemia, less hypoglycemia classically).',
    ],
  },
];

/** Clamp helper local to educational shunt math */
function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}
