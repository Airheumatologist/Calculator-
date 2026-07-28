import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave4EmIdCalcs: Calculator[] = [
  {
    id: 'dash-score-vte',
    name: 'DASH Score (Recurrent VTE)',
    shortName: 'DASH',
    description:
      'Predicts risk of recurrent venous thromboembolism after unprovoked VTE to inform anticoagulation duration.',
    category: 'hematology',
    tags: ['vte', 'dash', 'recurrence', 'anticoagulation', 'd-dimer'],
    whenToUse:
      'After completing short-term anticoagulation for unprovoked VTE when considering extended therapy vs stop.',
    whyUse:
      'Integrates D-dimer, age, sex, and hormone-associated VTE into a simple recurrence risk score (Tosetto et al.).',
    inputs: [
      yesNo('ddimerPos', 'Abnormal D-dimer after stopping anticoagulation (~3–5 weeks off therapy)', 2),
      yesNo('age50orLess', 'Age ≤50 years', 1),
      yesNo('male', 'Male sex', 1),
      yesNo('hormone', 'Hormone use at the time of initial VTE (women only; −2)', -2,
        'Estrogen-containing contraception or HRT associated with index VTE'),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.ddimerPos)) score += 2;
      if (bool(values.age50orLess)) score += 1;
      if (bool(values.male)) score += 1;
      if (bool(values.hormone)) score -= 2;

      if (score <= 1) {
        return {
          score,
          label: 'Low recurrence risk (DASH ≤1)',
          interpretation: `DASH ${score}: annual recurrent VTE risk roughly ~3–4% in derivation cohorts. Discontinuation after short-term therapy may be reasonable with shared decision-making if no other indication to continue.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Points', value: 'D-dimer +2, age ≤50 +1, male +1, hormone −2' },
            { label: 'Typical cut', value: '≤1 lower risk; ≥2 higher risk' },
          ],
          recommendations: [
            'Discuss stopping anticoagulation if bleed risk / preference favors stop',
            'Counsel on VTE warning symptoms and future risk situations',
            'Reassess if cancer, antiphospholipid syndrome, or other strong risk factors emerge',
          ],
        };
      }
      return {
        score,
        label: 'Higher recurrence risk (DASH ≥2)',
        interpretation: `DASH ${score}: higher estimated annual recurrence (often ~6–10%+ depending on score). Extended anticoagulation generally preferred if bleeding risk acceptable.`,
        riskLevel: score >= 4 ? ('high' as const) : ('moderate' as const),
        details: [
          { label: 'Points', value: 'D-dimer +2, age ≤50 +1, male +1, hormone −2' },
          { label: 'Range', value: 'Approximately −2 to +4' },
        ],
        recommendations: [
          'Favor extended anticoagulation if low–moderate bleed risk',
          'Prefer DOAC when no contraindication',
          'Periodic re-evaluation of net clinical benefit',
        ],
      };
    },
    evidence: {
      summary:
        'DASH: abnormal post-treatment D-dimer (+2), age ≤50 (+1), male sex (+1), hormone therapy at VTE (−2). Scores ≤1 associate with lower recurrence after unprovoked VTE.',
      formula: 'Sum of weighted items (−2 to +4); low risk typically ≤1',
      validation:
        'Derived from patient-level meta-analysis (Tosetto et al.); external performance varies — use with clinical context and bleed risk.',
      references: [
        {
          title: 'Predicting disease recurrence in patients with previous unprovoked venous thromboembolism: a proposed prediction score (DASH)',
          citation: 'Tosetto A et al. J Thromb Haemost. 2012;10:1019-1025',
          year: 2012,
          pmid: '22489957',
          doi: '10.1111/j.1538-7836.2012.04735.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'DASH ≤1', actions: ['Shared decision to stop vs continue', 'Return precautions'] },
      { condition: 'DASH ≥2', actions: ['Lean toward extended therapy', 'Mitigate bleed risk'] },
    ],
    pearls: [
      'D-dimer should be measured off anticoagulation (assay and timing matter).',
      'Hormone-associated VTE in women contributes negative points (lower recurrence after stopping hormones).',
      'Not a substitute for full thrombophilia/cancer workup when indicated.',
    ],
  },

  {
    id: 'vienna-prediction',
    name: 'Vienna Prediction Model (Simplified VTE Recurrence)',
    shortName: 'Vienna VTE',
    description:
      'Educational simplified helper based on the Vienna Prediction Model predictors for recurrent VTE after unprovoked events.',
    category: 'hematology',
    tags: ['vte', 'vienna', 'recurrence', 'd-dimer', 'unprovoked'],
    whenToUse:
      'Educational risk discussion after unprovoked VTE when weighing extended anticoagulation (not a full nomogram substitute).',
    whyUse:
      'Highlights the three core Vienna predictors — sex, VTE location, and D-dimer — used in the continuous model.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      selectInput('location', 'Index VTE location', [
        { label: 'Distal DVT only', value: 'distal' },
        { label: 'Proximal DVT', value: 'proximal' },
        { label: 'Pulmonary embolism (± DVT)', value: 'pe' },
      ]),
      selectInput('ddimer', 'D-dimer after anticoagulation (qualitative helper)', [
        { label: 'Low / negative', value: 'low' },
        { label: 'Intermediate', value: 'mid' },
        { label: 'High / positive', value: 'high' },
      ]),
      numberInput('age', 'Age (optional context)', { unit: 'years', min: 18, max: 100, step: 1, defaultValue: 55 }),
    ],
    calculate(values) {
      const sex = String(values.sex ?? 'F');
      const loc = String(values.location ?? 'proximal');
      const dd = String(values.ddimer ?? 'mid');
      // Educational ordinal score approximating relative risk direction of Vienna model
      let score = 0;
      if (sex === 'M') score += 2;
      if (loc === 'proximal') score += 1;
      if (loc === 'pe') score += 2;
      if (dd === 'mid') score += 1;
      if (dd === 'high') score += 2;

      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Lower relative recurrence stratum',
          interpretation: `Educational Vienna-style profile score ${score}: combination of female sex and/or distal DVT with lower D-dimer generally maps to lower recurrence in Vienna model literature. Confirm with full nomogram/calculator for numeric % risk.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate relative recurrence stratum',
          interpretation: `Educational score ${score}: mixed predictors. Full Vienna continuous model (Eichinger et al.) needed for precise cumulative recurrence estimates over 12–60 months.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Higher relative recurrence stratum',
          interpretation: `Educational score ${score}: male sex, PE/proximal DVT, and higher D-dimer push recurrence risk upward in Vienna model cohorts — favors extended anticoagulation if bleed risk allows.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Sex', value: sex === 'M' ? 'Male (+2)' : 'Female (0)' },
          {
            label: 'Location',
            value: loc === 'distal' ? 'Distal DVT (0)' : loc === 'proximal' ? 'Proximal DVT (+1)' : 'PE (+2)',
          },
          {
            label: 'D-dimer band',
            value: dd === 'low' ? 'Low (0)' : dd === 'mid' ? 'Intermediate (+1)' : 'High (+2)',
          },
          { label: 'Age (context only)', value: String(num(values.age, 55)) },
        ],
        recommendations:
          score >= 4
            ? ['Prefer extended anticoagulation if appropriate', 'Use full Vienna nomogram for counseling']
            : ['Shared decision on duration', 'Consider full Vienna model / DASH / HERDOO2 as applicable'],
      };
    },
    evidence: {
      summary:
        'Vienna Prediction Model uses sex, location of index VTE, and quantitative D-dimer (and originally age in related work) as continuous predictors of recurrence after unprovoked VTE.',
      formula: 'Educational ordinal proxy of Vienna predictors — not the published nomogram equation',
      validation:
        'Original model validated for cumulative recurrence; this entry is a teaching helper only and does not reproduce exact risk percentages.',
      references: [
        {
          title: 'Risk assessment of recurrence in patients with unprovoked deep vein thrombosis or pulmonary embolism: the Vienna prediction model',
          citation: 'Eichinger S et al. Circulation. 2010;121:1630-1636',
          year: 2010,
          pmid: '20351233',
          doi: '10.1161/CIRCULATIONAHA.109.925214',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower stratum', actions: ['Discuss finite therapy', 'Serial clinical follow-up'] },
      { condition: 'Higher stratum', actions: ['Extended therapy discussion', 'Bleed-risk assessment'] },
    ],
    pearls: [
      'Use a validated full Vienna calculator when a numeric % risk is required for counseling.',
      'Applies to unprovoked VTE after initial anticoagulation — not cancer-associated thrombosis.',
    ],
  },

  {
    id: 'vte-bleed',
    name: 'VTE-BLEED Score',
    shortName: 'VTE-BLEED',
    description:
      'Estimates risk of major bleeding on anticoagulation after VTE to support duration and intensity discussions.',
    category: 'hematology',
    tags: ['vte', 'bleeding', 'vte-bleed', 'anticoagulation', 'safety'],
    whenToUse:
      'Patients with VTE on stable anticoagulation when assessing major bleed risk (e.g., extended-therapy decisions).',
    whyUse: 'Simple 6-factor score validated for major bleeding during stable anticoagulation after VTE.',
    inputs: [
      yesNo('cancer', 'Active cancer', 2),
      yesNo('maleHtn', 'Male with uncontrolled hypertension', 1),
      yesNo('anemia', 'Anemia', 1.5, 'Hb <13 g/dL men or <12 g/dL women (derivation definition)'),
      yesNo('priorBleed', 'History of bleeding', 1.5),
      yesNo('age60', 'Age ≥60 years', 1.5),
      yesNo('renal', 'Renal dysfunction (CrCl 30–60 mL/min)', 1.5),
    ],
    calculate(values) {
      const score = round(
        (bool(values.cancer) ? 2 : 0) +
          (bool(values.maleHtn) ? 1 : 0) +
          (bool(values.anemia) ? 1.5 : 0) +
          (bool(values.priorBleed) ? 1.5 : 0) +
          (bool(values.age60) ? 1.5 : 0) +
          (bool(values.renal) ? 1.5 : 0),
        1
      );

      if (score < 2) {
        return {
          score,
          label: 'Low bleed risk (VTE-BLEED <2)',
          interpretation: `VTE-BLEED ${score}: low major bleeding risk stratum during anticoagulation after VTE in validation cohorts. Still individualize — score does not capture all procedural/trauma risk.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Threshold', value: '<2 low; ≥2 high' },
            { label: 'Max theoretical', value: '9.5 points' },
          ],
          recommendations: [
            'Standard anticoagulant dosing and follow-up',
            'Reassess if new cancer, CKD, or anemia develops',
          ],
        };
      }
      return {
        score,
        label: 'High bleed risk (VTE-BLEED ≥2)',
        interpretation: `VTE-BLEED ${score}: higher major bleeding risk on anticoagulation. Optimize modifiable factors (BP, anemia workup, drug interactions), consider closer monitoring, and weigh duration carefully.`,
        riskLevel: score >= 4 ? ('high' as const) : ('moderate' as const),
        details: [
          { label: 'Threshold', value: '<2 low; ≥2 high' },
          {
            label: 'Points',
            value: 'Cancer 2; male+HTN 1; anemia 1.5; prior bleed 1.5; age≥60 1.5; CrCl 30–60 1.5',
          },
        ],
        recommendations: [
          'Review antiplatelets/NSAIDs and BP control',
          'Correct reversible anemia contributors',
          'Shared decision on extended anticoagulation duration',
          'Consider specialist input if recurrent bleed',
        ],
      };
    },
    evidence: {
      summary:
        'VTE-BLEED: active cancer (2), male with uncontrolled HTN (1), anemia (1.5), history of bleeding (1.5), age ≥60 (1.5), CrCl 30–60 mL/min (1.5). High risk if ≥2.',
      formula: 'Sum of points; dichotomize at 2',
      validation: 'Derived and validated in VTE anticoagulation cohorts (Klok / VTE-BLEED investigators).',
      references: [
        {
          title: 'Prediction of bleeding events in patients with venous thromboembolism on stable anticoagulation treatment',
          citation: 'Klok FA et al. Eur Respir J. 2016',
          year: 2016,
          pmid: '27471209',
          doi: '10.1183/13993003.00280-2016',
        },
      ],
    },
    nextSteps: [
      { condition: '<2', actions: ['Usual monitoring', 'Patient education on bleed signs'] },
      { condition: '≥2', actions: ['Mitigate modifiable risks', 'Revisit net benefit of extended therapy'] },
    ],
    pearls: [
      'Designed for the stable anticoagulation phase after VTE — not the acute hospital bleed score.',
      'Uncontrolled hypertension criterion applies to men in the original model.',
    ],
  },

  {
    id: 'riete-vte',
    name: 'RIETE Simplified Score (Acute PE Prognosis)',
    shortName: 'RIETE PE',
    description:
      'Simplified RIETE prognostic score for short-term mortality risk after acute pulmonary embolism.',
    category: 'hematology',
    tags: ['pe', 'riete', 'vte', 'prognosis', 'mortality'],
    whenToUse: 'Confirmed acute PE for rapid prognostic stratification (adjunct to sPESI/PESI).',
    whyUse:
      'sPESI-like binary items (age, cancer, chronic HF, chronic lung disease, tachycardia, hypotension, hypoxia) band short-term PE mortality risk (RIETE-era literature).',
    inputs: [
      yesNo('age80', 'Age >80 years', 1),
      yesNo('cancer', 'Active cancer', 1),
      yesNo('chf', 'Chronic heart failure', 1),
      yesNo('cld', 'Chronic lung disease', 1),
      yesNo('hr110', 'Pulse ≥110 bpm', 1),
      yesNo('sbp100', 'Systolic BP <100 mmHg', 1),
      yesNo('sat90', 'Arterial O₂ saturation <90%', 1),
    ],
    calculate(values) {
      const keys = ['age80', 'cancer', 'chf', 'cld', 'hr110', 'sbp100', 'sat90'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score === 0) {
        return {
          score,
          label: 'Low risk (RIETE simplified 0)',
          interpretation: `RIETE simplified ${score}: low short-term mortality risk stratum in registry analyses. May support outpatient/early discharge pathways when Hestia/clinical criteria also favorable.`,
          riskLevel: 'low' as const,
          details: [{ label: 'Items positive', value: '0 / 7' }],
          recommendations: [
            'Consider outpatient PE pathway if Hestia/local criteria met',
            'Ensure reliable follow-up and anticoagulation access',
          ],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Intermediate risk (1–2)',
          interpretation: `RIETE simplified ${score}: intermediate mortality risk. Admit; risk-stratify further with RV strain, biomarkers, and sPESI/PESI as appropriate.`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'Items positive', value: `${score} / 7` }],
          recommendations: ['Inpatient monitoring', 'Assess RV function / troponin-BNP per protocol'],
        };
      }
      return {
        score,
        label: 'High risk (≥3)',
        interpretation: `RIETE simplified ${score}: high short-term mortality risk. Aggressive monitoring, consider intermediate-high/high-risk PE pathways (ICU, reperfusion discussion if unstable).`,
        riskLevel: score >= 5 ? ('critical' as const) : ('high' as const),
        details: [{ label: 'Items positive', value: `${score} / 7` }],
        recommendations: [
          'Higher-level care / continuous monitoring',
          'Urgent PE severity assessment (echo, lactate, shock index)',
          'Reperfusion options if hypotensive/obstructive shock',
        ],
      };
    },
    evidence: {
      summary:
        'Simplified RIETE PE score assigns 1 point each for age >80, cancer, chronic HF, chronic lung disease, HR ≥110, SBP <100, O₂ sat <90%.',
      formula: 'Sum 0–7; 0 low, 1–2 intermediate, ≥3 higher risk (educational banding)',
      validation: 'Derived from RIETE registry PE cohorts; use alongside clinical judgment and other scores (sPESI, Bova).',
      references: [
        {
          title: 'Simplification of the pulmonary embolism severity index for prognostication in patients with acute symptomatic PE (related RIETE / sPESI literature)',
          citation: 'Jiménez D et al. Arch Intern Med. 2010;170:1383-1389',
          year: 2010,
          pmid: '20696966',
          doi: '10.1001/archinternmed.2010.199',
        },
        {
          title: 'Clinical predictors for fatal pulmonary embolism in 15,520 patients with VTE (RIETE Registry)',
          citation: 'Laporte S et al. Circulation. 2008 (RIETE Investigators)',
          year: 2008,
          pmid: '18347212',
          doi: '10.1161/CIRCULATIONAHA.107.726232',
        },
      ],
    },
    nextSteps: [
      { condition: '0', actions: ['Outpatient eligibility review (Hestia)', 'DOAC education'] },
      { condition: '≥1', actions: ['Hospital management', 'Severity workup'] },
    ],
    pearls: [
      'Overlaps conceptually with sPESI (sPESI merges chronic cardiopulmonary disease).',
      'Hypotension alone may define high-risk PE regardless of score.',
    ],
  },

  {
    id: 'nec-fasc-lr',
    name: 'Necrotizing Fasciitis Clinical Likelihood Helper',
    shortName: 'Nec Fasc LR',
    description:
      'Clinical red-flag and likelihood checklist for necrotizing soft tissue infection beyond LRINEC labs alone.',
    category: 'emergency',
    tags: ['nsti', 'necrotizing fasciitis', 'soft tissue', 'surgical emergency'],
    whenToUse: 'Suspected cellulitis vs necrotizing soft tissue infection (NSTI) — clinical suspicion pathway.',
    whyUse:
      'LRINEC is insensitive; pain out of proportion, rapid spread, and hard signs drive surgical exploration decisions.',
    inputs: [
      yesNo('painPop', 'Pain out of proportion to skin findings', 2),
      yesNo('rapidSpread', 'Rapid progression of erythema/edema', 2),
      yesNo('tenseEdema', 'Tense or woody edema beyond visible erythema', 2),
      yesNo('crepitus', 'Crepitus or gas on exam/imaging', 3),
      yesNo('bullae', 'Bullae, ecchymosis, or skin necrosis', 2),
      yesNo('sensory', 'Sensory changes / anesthesia of overlying skin', 2),
      yesNo('systemic', 'Systemic toxicity (fever, tachycardia, shock, altered mentation)', 2),
      yesNo('riskFactor', 'High-risk host (diabetes, cirrhosis, IVDU, immunocompromise, trauma/surgery)', 1),
      yesNo('failureAbx', 'Failure to improve on appropriate antibiotics', 1),
    ],
    calculate(values) {
      const hard =
        (bool(values.crepitus) ? 1 : 0) +
        (bool(values.bullae) ? 1 : 0) +
        (bool(values.sensory) ? 1 : 0);
      const score =
        (bool(values.painPop) ? 2 : 0) +
        (bool(values.rapidSpread) ? 2 : 0) +
        (bool(values.tenseEdema) ? 2 : 0) +
        (bool(values.crepitus) ? 3 : 0) +
        (bool(values.bullae) ? 2 : 0) +
        (bool(values.sensory) ? 2 : 0) +
        (bool(values.systemic) ? 2 : 0) +
        (bool(values.riskFactor) ? 1 : 0) +
        (bool(values.failureAbx) ? 1 : 0);

      if (hard >= 1 || score >= 6) {
        return {
          score,
          label: 'High clinical concern for NSTI',
          interpretation: `Clinical concern score ${score}${hard ? ' with hard sign(s)' : ''}. Treat as surgical emergency — do not delay for LRINEC, advanced imaging, or cultures if suspicion is high.`,
          riskLevel: 'critical' as const,
          details: [
            { label: 'Hard signs count', value: String(hard) },
            { label: 'Weighted concern score', value: String(score) },
          ],
          recommendations: [
            'Emergent surgical consultation / exploration',
            'Resuscitation and broad-spectrum IV antibiotics (include toxin suppression)',
            'Avoid waiting for “confirmatory” imaging if unstable or hard signs present',
          ],
        };
      }
      if (score >= 3) {
        return {
          score,
          label: 'Intermediate concern',
          interpretation: `Score ${score}: intermediate concern. Serial exams, early surgical input, labs (LRINEC adjunct), and low threshold for exploration if trajectory worsens.`,
          riskLevel: 'high' as const,
          details: [{ label: 'Weighted concern score', value: String(score) }],
          recommendations: [
            'Urgent surgical evaluation',
            'IV antibiotics and close observation',
            'Reassess frequently — NSTI evolves rapidly',
          ],
        };
      }
      return {
        score,
        label: 'Lower clinical concern (not excluded)',
        interpretation: `Score ${score}: fewer classic NSTI flags. Compatible with uncomplicated SSTI if exam is soft and host low-risk — but early NSTI can be subtle.`,
        riskLevel: 'moderate' as const,
        details: [{ label: 'Weighted concern score', value: String(score) }],
        recommendations: [
          'Treat cellulitis pathway with close follow-up',
          'Return precautions for rapid spread or severe pain',
          'Escalate if systemic toxicity develops',
        ],
      };
    },
    evidence: {
      summary:
        'Clinical diagnosis of NSTI relies on pain out of proportion, tense edema, crepitus/gas, bullae/necrosis, anesthesia of skin, rapid spread, and toxicity — hard signs mandate exploration.',
      formula: 'Educational weighted red-flag checklist (not a validated numeric LR table)',
      validation:
        'Aligned with surgical/ID teaching and NSTI guidelines; imaging and LRINEC are adjuncts only.',
      references: [
        {
          title: 'Practice guidelines for the diagnosis and management of skin and soft tissue infections',
          citation: 'IDSA SSTI guidelines — Stevens DL et al. Clin Infect Dis. 2014',
          year: 2014,
          pmid: '24973422',
          doi: '10.1093/cid/ciu444',
        },
        {
          title: 'The LRINEC score (lab adjunct; imperfect sensitivity)',
          citation: 'Wong CH et al. Crit Care Med. 2004',
          year: 2004,
          pmid: '15241098',
          doi: '10.1097/01.ccm.0000129486.35458.7d',
        },
      ],
    },
    nextSteps: [
      { condition: 'High concern / hard signs', actions: ['OR exploration', 'Broad abx', 'ICU support'] },
      { condition: 'Lower concern', actions: ['Cellulitis care', 'Strict return precautions'] },
    ],
    pearls: [
      'Never use a low LRINEC to talk yourself out of the OR when the exam is bad.',
      'Finger test / operative exploration remains the definitive diagnostic step.',
    ],
  },

  {
    id: 'feverpain-score',
    name: 'FeverPAIN Score (Full)',
    shortName: 'FeverPAIN',
    description:
      'Full FeverPAIN pharyngitis score with NICE-aligned antibiotic stewardship interpretation.',
    category: 'infectious-disease',
    tags: ['pharyngitis', 'strep', 'feverpain', 'sore throat', 'antibiotics'],
    whenToUse: 'Acute sore throat in primary care / ED for bacterial probability and antibiotic strategy.',
    whyUse: 'Predicts group A strep likelihood; supports no / delayed / immediate antibiotic strategies (UK NICE).',
    inputs: [
      yesNo('fever', 'Fever in past 24 hours', 1),
      yesNo('purulence', 'Purulence (pus on tonsils)', 1),
      yesNo('attend3', 'Attend rapidly (illness ≤3 days)', 1),
      yesNo('inflamed', 'Severely inflamed tonsils', 1),
      yesNo('noCough', 'No cough or coryza', 1),
    ],
    calculate(values) {
      const score = (['fever', 'purulence', 'attend3', 'inflamed', 'noCough'] as const).reduce(
        (s, k) => s + (bool(values[k]) ? 1 : 0),
        0
      );
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'FeverPAIN 0–1 (low)',
          interpretation: `Score ${score}: ~13–18% strep isolation in derivation. Usually no antibiotic; symptomatic care and safety-net advice.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'FeverPAIN 2–3 (intermediate)',
          interpretation: `Score ${score}: ~34–40% strep. Consider delayed (backup) antibiotic prescription, or test-and-treat per local policy.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'FeverPAIN 4–5 (high)',
          interpretation: `Score ${score}: ~62–65% strep. Consider immediate antibiotic or rapid antigen/PCR testing plus treat if positive.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Components', value: 'Fever, Purulence, Attend ≤3d, Inflamed tonsils, No cough/coryza' },
          { label: 'Score range', value: '0–5' },
        ],
        recommendations:
          score >= 4
            ? ['Immediate Abx or RADT/PCR per local pathway', 'Assess for PTA / epiglottitis red flags']
            : score >= 2
              ? ['Delayed script or test-based strategy', 'Analgesia, fluids, return precautions']
              : ['Symptom control only', 'No routine antibiotics'],
      };
    },
    evidence: {
      summary:
        'FeverPAIN: Fever in 24h, Purulence, Attend rapidly (≤3 days), severely Inflamed tonsils, No cough/coryza — 1 point each.',
      formula: 'Sum 0–5',
      validation: 'PRISM/FeverPAIN trials; referenced by NICE sore throat antimicrobial guidance.',
      references: [
        {
          title: 'Clinical score and rapid antigen detection test to guide antibiotic use for sore throat',
          citation: 'Little P et al. BMJ. 2013;347:f5806',
          year: 2013,
          pmid: '24114306',
          doi: '10.1136/bmj.f5806',
        },
      ],
    },
    nextSteps: [
      { condition: '0–1', actions: ['Supportive care', 'No routine Abx', 'Safety netting'] },
      { condition: '2–3', actions: ['No Abx or delayed (backup) Abx'] },
      { condition: '4–5', actions: ['Immediate or delayed (backup) Abx'] },
    ],
    pearls: [
      'Distinct from Centor/McIsaac — different items and cutoffs.',
      'Always screen for airway compromise and peritonsillar abscess features.',
    ],
  },

  {
    id: 'peritonsillar-abscess',
    name: 'Peritonsillar Abscess Clinical Likelihood',
    shortName: 'PTA Checklist',
    description:
      'Clinical checklist estimating likelihood of peritonsillar abscess (quinsy) versus uncomplicated tonsillitis.',
    category: 'infectious-disease',
    tags: ['pta', 'peritonsillar abscess', 'quinsy', 'tonsillitis', 'ent'],
    whenToUse: 'Severe sore throat with possible PTA — triage for ENT drainage vs medical therapy.',
    whyUse: 'Trismus, uvular deviation, and unilateral swelling best discriminate PTA clinically.',
    inputs: [
      yesNo('unilateral', 'Unilateral tonsillar swelling / fullness', 2),
      yesNo('uvula', 'Uvular deviation away from the lesion', 2),
      yesNo('trismus', 'Trismus (limited mouth opening)', 2),
      yesNo('hotPotato', 'Hot-potato / muffled voice', 1),
      yesNo('drooling', 'Drooling or inability to swallow secretions', 2),
      yesNo('earPain', 'Referred otalgia', 1),
      yesNo('feverTox', 'Fever or systemic toxicity', 1),
      yesNo('fluctuant', 'Palpable fluctuance of soft palate (if examined)', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.unilateral) ? 2 : 0) +
        (bool(values.uvula) ? 2 : 0) +
        (bool(values.trismus) ? 2 : 0) +
        (bool(values.hotPotato) ? 1 : 0) +
        (bool(values.drooling) ? 2 : 0) +
        (bool(values.earPain) ? 1 : 0) +
        (bool(values.feverTox) ? 1 : 0) +
        (bool(values.fluctuant) ? 2 : 0);

      const classic = bool(values.unilateral) && (bool(values.uvula) || bool(values.trismus));

      if (classic || score >= 6) {
        return {
          score,
          label: 'High likelihood of PTA',
          interpretation: `Checklist score ${score}${classic ? ' with classic unilateral + deviation/trismus pattern' : ''}. Strongly consider needle aspiration/I&D, imaging if atypical, and airway assessment.`,
          riskLevel: 'high' as const,
          details: [{ label: 'Classic pattern', value: classic ? 'Yes' : 'No' }],
          recommendations: [
            'ENT consultation for drainage',
            'IV/oral antibiotics covering oral flora + strep',
            'Steroids/analgesia per local practice',
            'Airway precautions if drooling or severe trismus',
          ],
        };
      }
      if (score >= 3) {
        return {
          score,
          label: 'Possible PTA / severe tonsillitis',
          interpretation: `Score ${score}: intermediate concern. Close exam (or ENT review); consider CT if exam limited or complications suspected.`,
          riskLevel: 'moderate' as const,
          recommendations: ['Trial of therapy vs early ENT review', 'Ensure hydration and follow-up within 24h'],
        };
      }
      return {
        score,
        label: 'Lower likelihood of PTA',
        interpretation: `Score ${score}: features more consistent with uncomplicated pharyngotonsillitis, but early PTA can be subtle.`,
        riskLevel: 'low' as const,
        recommendations: ['Pharyngitis pathway (FeverPAIN/Centor)', 'Return if trismus, voice change, or worsening unilateral pain'],
      };
    },
    evidence: {
      summary:
        'PTA classically presents with severe sore throat, fever, trismus, hot-potato voice, unilateral peritonsillar swelling, and contralateral uvular deviation.',
      formula: 'Educational weighted clinical checklist',
      validation: 'Clinical teaching aid — imaging/ENT evaluation when exam is equivocal or airway threatened.',
      references: [
        {
          title: 'Peritonsillar abscess clinical review',
          citation: 'Galioto NJ. Am Fam Physician. 2017;95:501-506',
          year: 2017,
          pmid: '28409615',
        },
      ],
    },
    nextSteps: [
      { condition: 'High likelihood', actions: ['Drainage', 'Antibiotics', 'Airway assessment'] },
      { condition: 'Lower likelihood', actions: ['Medical pharyngitis care', 'Safety netting'] },
    ],
    pearls: [
      'Trismus is one of the most useful bedside discriminators.',
      'Bilateral “kissing tonsils” with airway symptoms is a different emergency (consider imaging/ENT).',
    ],
  },

  {
    id: 'epiglottitis-warning',
    name: 'Epiglottitis Red Flags',
    shortName: 'Epiglottitis',
    description:
      'Red-flag checklist for acute epiglottitis / supraglottitis — airway-first educational helper.',
    category: 'emergency',
    tags: ['epiglottitis', 'supraglottitis', 'airway', 'sore throat', 'stridor'],
    whenToUse: 'Severe sore throat, odynophagia out of proportion, or stridor — especially if pharynx looks benign.',
    whyUse: 'Missed epiglottitis risks abrupt airway obstruction; exam and imaging choices must protect the airway.',
    inputs: [
      yesNo('severeOdynophagia', 'Severe odynophagia / inability to swallow secretions', 2),
      yesNo('voiceChange', 'Muffled / hot-potato voice', 1),
      yesNo('tripod', 'Tripod / sniffing position', 2),
      yesNo('stridor', 'Stridor or noisy breathing', 3),
      yesNo('drooling', 'Drooling', 2),
      yesNo('benignPharynx', 'Pharynx relatively benign vs symptom severity', 1),
      yesNo('feverTox', 'Fever / toxicity', 1),
      yesNo('adultRisk', 'Adult risk factors (smoking, diabetes, immunocompromise) or unimmunized child', 1),
    ],
    calculate(values) {
      const airway =
        bool(values.stridor) || bool(values.tripod) || bool(values.drooling);
      const score =
        (bool(values.severeOdynophagia) ? 2 : 0) +
        (bool(values.voiceChange) ? 1 : 0) +
        (bool(values.tripod) ? 2 : 0) +
        (bool(values.stridor) ? 3 : 0) +
        (bool(values.drooling) ? 2 : 0) +
        (bool(values.benignPharynx) ? 1 : 0) +
        (bool(values.feverTox) ? 1 : 0) +
        (bool(values.adultRisk) ? 1 : 0);

      if (airway || score >= 6) {
        return {
          score,
          label: 'High concern — protect airway',
          interpretation: `Red-flag score ${score}${airway ? ' with airway-threatening features' : ''}. Do not agitate; minimize pharyngeal exam; urgent airway-capable team (anesthesia/ENT) before throat inspection or supine CT in unstable patients.`,
          riskLevel: 'critical' as const,
          details: [{ label: 'Airway red flags', value: airway ? 'Present' : 'Absent' }],
          recommendations: [
            'NPO; keep patient upright and calm',
            'Call anesthesia/ENT early for controlled airway',
            'IV antibiotics covering typical pathogens after airway secured/stable plan',
            'Avoid blindly forcing tongue blade exam in unstable patients',
          ],
        };
      }
      if (score >= 3) {
        return {
          score,
          label: 'Possible supraglottitis — urgent evaluation',
          interpretation: `Score ${score}: concerning for epiglottitis/supraglottitis. Flexible nasopharyngoscopy by airway-ready team when stable; low threshold for imaging only if safe.`,
          riskLevel: 'high' as const,
          recommendations: ['Urgent ENT evaluation', 'IV abx and monitoring', 'Prepare difficult airway equipment'],
        };
      }
      return {
        score,
        label: 'Lower concern for epiglottitis',
        interpretation: `Score ${score}: fewer classic red flags. Continue standard pharyngitis workup but reassess if odynophagia worsens out of proportion to exam.`,
        riskLevel: 'low' as const,
        recommendations: ['Pharyngitis pathway', 'Return precautions for drooling, stridor, or inability to swallow'],
      };
    },
    evidence: {
      summary:
        'Epiglottitis/supraglottitis: odynophagia out of proportion, muffled voice, drooling, stridor, tripod posture; oropharynx may look deceptively normal.',
      formula: 'Educational red-flag checklist — any airway sign overrides score',
      validation: 'Clinical airway teaching; adult epiglottitis now more common than classic pediatric H. influenzae cases in immunized regions.',
      references: [
        {
          title: 'Supraglottitis in the era following widespread immunization against Haemophilus influenzae type B',
          citation: 'Guardiani E et al. Laryngoscope. 2010',
          year: 2010,
          pmid: '20925091',
          doi: '10.1002/lary.21083',
        },
      ],
    },
    nextSteps: [
      { condition: 'Airway features', actions: ['Airway team', 'OR/controlled setting if needed', 'Avoid agitation'] },
      { condition: 'Lower concern', actions: ['Usual ENT/ID pathway', 'Safety net'] },
    ],
    pearls: [
      'Adults may present more indolently than classic pediatric teaching suggests.',
      'Lateral neck radiograph “thumb sign” is neither sensitive nor always safe to obtain.',
    ],
  },

  {
    id: 'retropharyngeal',
    name: 'Retropharyngeal Abscess Red Flags (Pediatric)',
    shortName: 'RPA Flags',
    description:
      'Pediatric neck deep-space infection red-flag checklist for retropharyngeal abscess (RPA) concern.',
    category: 'pediatrics',
    tags: ['retropharyngeal', 'abscess', 'pediatric', 'neck', 'airway'],
    whenToUse: 'Febrile child with neck stiffness, limited extension, drooling, or ill appearance after URI.',
    whyUse: 'Early RPA can mimic meningitis or simple pharyngitis; delayed diagnosis risks airway and mediastinitis.',
    inputs: [
      yesNo('ageYoung', 'Age typically <5 years (classic demography)', 1),
      yesNo('fever', 'Fever', 1),
      yesNo('neckStiff', 'Neck stiffness or limited neck extension', 2),
      yesNo('torticollis', 'Torticollis / preferential head position', 2),
      yesNo('drooling', 'Drooling or dysphagia', 2),
      yesNo('stridor', 'Stridor, stertor, or respiratory distress', 3),
      yesNo('bulge', 'Posterior pharyngeal wall bulge (if safely visualized)', 2),
      yesNo('toxicity', 'Toxic appearance / sepsis physiology', 2),
      yesNo('recentUri', 'Recent URI, trauma, or foreign body history', 1),
    ],
    calculate(values) {
      const airway = bool(values.stridor);
      const score =
        (bool(values.ageYoung) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.neckStiff) ? 2 : 0) +
        (bool(values.torticollis) ? 2 : 0) +
        (bool(values.drooling) ? 2 : 0) +
        (bool(values.stridor) ? 3 : 0) +
        (bool(values.bulge) ? 2 : 0) +
        (bool(values.toxicity) ? 2 : 0) +
        (bool(values.recentUri) ? 1 : 0);

      if (airway || score >= 7) {
        return {
          score,
          label: 'High concern for deep neck infection',
          interpretation: `Score ${score}${airway ? ' with airway compromise' : ''}. Prioritize airway, NPO, IV antibiotics, and urgent ENT/imaging (contrast CT when stable) for RPA/other deep-space infection.`,
          riskLevel: 'critical' as const,
          recommendations: [
            'Airway-ready environment',
            'IV broad-spectrum antibiotics',
            'Urgent ENT consultation',
            'Contrast CT neck when safe; OR drainage if abscess confirmed/unstable',
          ],
        };
      }
      if (score >= 4) {
        return {
          score,
          label: 'Possible RPA — urgent workup',
          interpretation: `Score ${score}: concerning features for retropharyngeal or other deep neck infection. Do not force neck flexion if unstable; differentiate from meningitis carefully.`,
          riskLevel: 'high' as const,
          recommendations: ['IV access, labs, abx', 'ENT involvement', 'Imaging when airway secure'],
        };
      }
      return {
        score,
        label: 'Lower concern (not excluded)',
        interpretation: `Score ${score}: fewer classic RPA flags. Consider viral pharyngitis/lymphadenitis; reassess if neck motion worsens or drooling develops.`,
        riskLevel: 'low' as const,
        recommendations: ['Supportive care or alternative diagnoses', 'Strict return precautions'],
      };
    },
    evidence: {
      summary:
        'Pediatric RPA: fever, neck pain/stiffness (limited extension), torticollis, drooling, bulging posterior pharynx, and possible airway symptoms — often after URI in young children.',
      formula: 'Educational red-flag checklist',
      validation: 'Pediatric ENT/EM teaching aid; CT with contrast is common confirmatory test when safe.',
      references: [
        {
          title: 'Retropharyngeal and parapharyngeal infections in children',
          citation: 'Craig FW, Schunk JE. Pediatrics. 2003 / contemporary pediatric ID reviews',
          year: 2003,
          pmid: '12671125',
          doi: '10.1542/peds.111.4.864',
        },
      ],
    },
    nextSteps: [
      { condition: 'High concern', actions: ['Airway', 'IV abx', 'ENT + CT'] },
      { condition: 'Lower concern', actions: ['Observation pathway', 'Safety net'] },
    ],
    pearls: [
      'Limited neck extension is more specific teaching point than flexion alone.',
      'Always keep meningitis and epiglottitis on the differential.',
    ],
  },

  {
    id: 'meningitis-bacterial',
    name: 'Bacterial Meningitis Score (Nigrovic)',
    shortName: 'BMS / Nigrovic',
    description:
      'Pediatric Bacterial Meningitis Score to identify children with CSF pleocytosis at very low risk of bacterial meningitis.',
    category: 'pediatrics',
    tags: ['meningitis', 'nigrovic', 'csf', 'pediatric', 'bacterial'],
    whenToUse:
      'Children with CSF pleocytosis when deciding bacterial vs aseptic meningitis risk (after LP, not neonates).',
    whyUse: 'Score of 0 identifies a very low-risk group that may avoid prolonged antibiotics in validated settings.',
    inputs: [
      yesNo('gramStain', 'Positive CSF Gram stain', 1),
      yesNo('csfAnc', 'CSF absolute neutrophil count ≥1000 cells/µL', 1),
      yesNo('csfProtein', 'CSF protein ≥80 mg/dL', 1),
      yesNo('periphAnc', 'Peripheral blood ANC ≥10,000 cells/µL', 1),
      yesNo('seizure', 'Seizure at or before presentation', 1),
    ],
    calculate(values) {
      const keys = ['gramStain', 'csfAnc', 'csfProtein', 'periphAnc', 'seizure'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (bool(values.gramStain)) {
        return {
          score,
          label: 'Not low risk — Gram stain positive',
          interpretation: `Bacterial Meningitis Score ${score} with positive Gram stain. Treat as bacterial meningitis: urgent antibiotics (already ideally given), steroids per protocol, and admission.`,
          riskLevel: 'critical' as const,
          details: [{ label: 'BMS components positive', value: String(score) }],
          recommendations: [
            'Continue empiric bacterial meningitis therapy',
            'Isolate as indicated',
            'Do not use BMS to de-escalate while Gram stain positive',
          ],
        };
      }

      if (score === 0) {
        return {
          score: 0,
          label: 'Very low risk (BMS = 0)',
          interpretation:
            'BMS 0: very low risk of bacterial meningitis in derivation/validation cohorts of non-neonatal children with CSF pleocytosis (when inclusion criteria met). Consider aseptic pathway with careful follow-up — clinical judgment still required.',
          riskLevel: 'low' as const,
          details: [{ label: 'Rule', value: '0 = very low risk; ≥1 not low risk' }],
          recommendations: [
            'If otherwise well and criteria applicable, consider limited antibiotics / observation per local protocol',
            'Ensure reliable follow-up and no antibiotic pretreatment caveats unaddressed',
          ],
        };
      }

      return {
        score,
        label: 'Not low risk (BMS ≥1)',
        interpretation: `BMS ${score}: not in the very-low-risk group. Maintain coverage for bacterial meningitis until cultures finalize or alternative diagnosis is clear.`,
        riskLevel: score >= 3 ? ('critical' as const) : ('high' as const),
        details: [{ label: 'BMS components positive', value: String(score) }],
        recommendations: [
          'Empiric IV antibiotics ± adjunctive dexamethasone per guidelines',
          'Admit; droplet precautions as indicated',
          'Reassess with culture and clinical course',
        ],
      };
    },
    evidence: {
      summary:
        'Bacterial Meningitis Score (Nigrovic): +1 each for positive CSF Gram stain, CSF ANC ≥1000, CSF protein ≥80 mg/dL, peripheral ANC ≥10,000, seizure at/before presentation. Score 0 = very low risk.',
      formula: 'Sum 0–5; low-risk only if 0 and applicability criteria met',
      validation:
        'Multicenter derivation/validation in children with CSF pleocytosis; exclude neonates, critical illness, purpura, pretreated selected cases per original methods.',
      references: [
        {
          title: 'Clinical prediction rule for identifying children with CSF pleocytosis at very low risk of bacterial meningitis',
          citation: 'Nigrovic LE et al. JAMA. 2007;297:52-60',
          year: 2007,
          pmid: '17200475',
          doi: '10.1001/jama.297.1.52',
        },
      ],
    },
    nextSteps: [
      { condition: 'BMS 0', actions: ['Consider aseptic pathway if eligible', 'Close follow-up'] },
      { condition: 'BMS ≥1 or Gram+', actions: ['Full bacterial meningitis treatment'] },
    ],
    pearls: [
      'Do not apply to neonates or toxic/petechial children who need full treatment regardless.',
      'Antibiotic pretreatment can blunt Gram stain/culture — interpret cautiously.',
    ],
  },

  {
    id: 'pyelo-admission',
    name: 'Pyelonephritis Admission Criteria Helper',
    shortName: 'Pyelo Admit',
    description:
      'Checklist of common admission criteria for acute pyelonephritis (outpatient vs inpatient disposition).',
    category: 'infectious-disease',
    tags: ['pyelonephritis', 'uti', 'admission', 'disposition', 'sepsis'],
    whenToUse: 'Adults (and older adolescents) with acute pyelonephritis when deciding ED discharge vs admit.',
    whyUse: 'Structures IDSA-aligned reasons that usually favor hospitalization and IV therapy.',
    inputs: [
      yesNo('sepsis', 'Sepsis / septic shock physiology', 3),
      yesNo('unstable', 'Hemodynamic instability or high fever with instability risk', 2),
      yesNo('persistentVomiting', 'Intractable vomiting / unable to tolerate oral meds', 2),
      yesNo('obstruction', 'Known or suspected urinary obstruction / stone with infection', 3),
      yesNo('complicated', 'Complicated host (pregnancy, transplant, severe CKD, poorly controlled diabetes, immunosuppression)', 2),
      yesNo('maleAnatomic', 'Male sex with concern for complicated UTI / prostatitis requiring IV course', 1),
      yesNo('failedOutpt', 'Failed outpatient therapy', 2),
      yesNo('social', 'Unreliable follow-up / social barriers to oral therapy', 1),
      yesNo('imagingConcern', 'Imaging concern for abscess / emphysematous / gas-forming infection', 3),
    ],
    calculate(values) {
      const critical =
        bool(values.sepsis) || bool(values.obstruction) || bool(values.imagingConcern);
      const score =
        (bool(values.sepsis) ? 3 : 0) +
        (bool(values.unstable) ? 2 : 0) +
        (bool(values.persistentVomiting) ? 2 : 0) +
        (bool(values.obstruction) ? 3 : 0) +
        (bool(values.complicated) ? 2 : 0) +
        (bool(values.maleAnatomic) ? 1 : 0) +
        (bool(values.failedOutpt) ? 2 : 0) +
        (bool(values.social) ? 1 : 0) +
        (bool(values.imagingConcern) ? 3 : 0);

      if (critical || score >= 4) {
        return {
          score,
          label: 'Admission recommended',
          interpretation: `Admission flags score ${score}${critical ? ' with critical indication(s)' : ''}. Inpatient IV antibiotics, source control (obstruction), and monitoring are generally indicated.`,
          riskLevel: critical ? ('critical' as const) : ('high' as const),
          details: [{ label: 'Critical flags', value: critical ? 'Yes' : 'No' }],
          recommendations: [
            'IV antibiotics per local resistance patterns',
            'Urgent decompression if obstructed infected kidney',
            'Cultures before abx when feasible',
            'Pregnancy: always treat as complicated — obstetric coordination',
          ],
        };
      }
      if (score >= 2) {
        return {
          score,
          label: 'Consider observation / short stay',
          interpretation: `Score ${score}: borderline features. Observation unit, first IV dose + oral step-down, or admit based on trajectory and support at home.`,
          riskLevel: 'moderate' as const,
          recommendations: ['Shared decision', 'Ensure oral tolerance before discharge', '24–48h follow-up'],
        };
      }
      return {
        score,
        label: 'Outpatient management often reasonable',
        interpretation: `Score ${score}: no major admission flags selected. Healthy non-pregnant patients who tolerate oral therapy may be treated as outpatients with close follow-up.`,
        riskLevel: 'low' as const,
        recommendations: [
          'Oral fluoroquinolone or other guideline-appropriate agent by susceptibilities',
          'Return precautions for vomiting, worsening pain, or fever persistence',
          'Culture-guided adjustment',
        ],
      };
    },
    evidence: {
      summary:
        'Hospitalize pyelonephritis for sepsis, inability to take oral therapy, obstruction, pregnancy/complicated hosts, failed outpatient care, or imaging complications.',
      formula: 'Educational admission checklist aligned with IDSA UTI guidance themes',
      validation: 'Disposition aid — not a prospective derivation score; local resistance and pregnancy pathways apply.',
      references: [
        {
          title: 'International clinical practice guidelines for acute uncomplicated cystitis and pyelonephritis in women',
          citation: 'Gupta K et al. Clin Infect Dis. 2011;52:e103-e120',
          year: 2011,
          pmid: '21292654',
          doi: '10.1093/cid/ciq257',
        },
      ],
    },
    nextSteps: [
      { condition: 'Admit flags', actions: ['IV abx', 'Source control', 'Monitor'] },
      { condition: 'Outpatient eligible', actions: ['Oral abx', 'Close follow-up'] },
    ],
    pearls: [
      'Obstructed pyelonephritis is a urologic emergency (stent/nephrostomy).',
      'Pregnancy is complicated UTI — low threshold for admission.',
    ],
  },

  {
    id: 'zar-score',
    name: 'Zar Score (C. difficile Severity)',
    shortName: 'Zar CDI',
    description: 'Zar score for severity stratification of Clostridioides difficile infection.',
    category: 'infectious-disease',
    tags: ['cdi', 'c diff', 'zar', 'severity', 'colitis'],
    whenToUse: 'Adults with confirmed CDI when classifying mild vs severe disease for therapy intensity.',
    whyUse: 'Simple bedside/lab score; ≥2 points defines severe CDI in the original Zar study.',
    inputs: [
      yesNo('age60', 'Age >60 years', 1),
      yesNo('temp', 'Temperature >38.3°C (100.9°F)', 1),
      yesNo('albumin', 'Albumin <2.5 g/dL', 1),
      yesNo('wbc', 'WBC >15,000 cells/µL', 1),
      yesNo('icuOrPmc', 'ICU care for CDI OR endoscopic pseudomembranous colitis', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.age60) ? 1 : 0) +
        (bool(values.temp) ? 1 : 0) +
        (bool(values.albumin) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.icuOrPmc) ? 2 : 0);

      if (score >= 2) {
        return {
          score,
          label: 'Severe CDI (Zar ≥2)',
          interpretation: `Zar ${score}: severe C. difficile infection by original criteria. Use severe-disease therapy pathways (e.g., vancomycin or fidaxomicin per current IDSA/SHEA — not metronidazole monotherapy for severe disease).`,
          riskLevel: score >= 4 ? ('high' as const) : ('moderate' as const),
          details: [{ label: 'Threshold', value: '≥2 = severe' }],
          recommendations: [
            'Stop unnecessary antibiotics / PPIs when possible',
            'Guideline-directed anti-CDI therapy for severe disease',
            'Surgical/ID consult if megacolon, perforation, or shock',
          ],
        };
      }
      return {
        score,
        label: 'Non-severe CDI (Zar 0–1)',
        interpretation: `Zar ${score}: non-severe stratum in original study. Still treat CDI; choose agent per current guidelines and recurrence risk (fidaxomicin/vancomycin preferred over metro in many updates).`,
        riskLevel: 'low' as const,
        details: [{ label: 'Threshold', value: '≥2 = severe' }],
        recommendations: [
          'Initiate appropriate anti-CDI therapy',
          'Infection control / contact precautions',
          'Reassess if WBC, creatinine, or shock evolve (fulminant pathway)',
        ],
      };
    },
    evidence: {
      summary:
        'Zar score: age >60 (1), temp >38.3°C (1), albumin <2.5 g/dL (1), WBC >15k (1), endoscopic PMC or ICU treatment (2). Severe if ≥2.',
      formula: 'Sum 0–6; severe ≥2',
      validation: 'Zar et al. prospective severity score; modern IDSA also uses WBC and creatinine cutoffs — complementary frameworks.',
      references: [
        {
          title: 'A comparison of vancomycin and metronidazole for the treatment of Clostridium difficile–associated diarrhea, stratified by disease severity',
          citation: 'Zar FA et al. Clin Infect Dis. 2007;45:302-307',
          year: 2007,
          pmid: '17599306',
          doi: '10.1086/519265',
        },
      ],
    },
    nextSteps: [
      { condition: '≥2 severe', actions: ['Severe CDI regimen', 'Monitor for fulminant disease'] },
      { condition: '0–1', actions: ['Non-severe regimen per guidelines', 'Stewardship'] },
    ],
    pearls: [
      'Fulminant CDI (shock, megacolon, ileus) supersedes Zar mild/severe labels.',
      'ATLAS is an alternative multi-variable CDI severity/prognosis score.',
    ],
  },

  {
    id: 'atlas-cdi',
    name: 'ATLAS Score (C. difficile)',
    shortName: 'ATLAS CDI',
    description:
      'ATLAS score for C. difficile infection severity/prognosis using Age, Treatment with systemic antibiotics, Leukocyte count, Albumin, and Serum creatinine.',
    category: 'infectious-disease',
    tags: ['cdi', 'atlas', 'c diff', 'severity', 'prognosis'],
    whenToUse: 'Hospitalized adults with CDI for severity and outcome risk stratification.',
    whyUse: 'Multivariable 0–10 score correlating with cure rates and prognosis in CDI trials/cohorts.',
    inputs: [
      selectInput('agePts', 'Age', [
        { label: '<60 years (0)', value: 0 },
        { label: '60–79 years (1)', value: 1 },
        { label: '≥80 years (2)', value: 2 },
      ]),
      yesNo('systemicAbx', 'Systemic antibiotics during CDI therapy (not anti-CDI agent)', 2),
      selectInput('wbcPts', 'Leukocyte count (×10³/µL)', [
        { label: '<16 (0)', value: 0 },
        { label: '16–25 (1)', value: 1 },
        { label: '>25 (2)', value: 2 },
      ]),
      selectInput('albPts', 'Albumin (g/dL)', [
        { label: '>3.5 (0)', value: 0 },
        { label: '2.6–3.5 (1)', value: 1 },
        { label: '≤2.5 (2)', value: 2 },
      ]),
      selectInput('crPts', 'Serum creatinine (mg/dL)', [
        { label: '≤1.3 (0)', value: 0 },
        { label: '>1.3 (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.agePts) +
        (bool(values.systemicAbx) ? 2 : 0) +
        num(values.wbcPts) +
        num(values.albPts) +
        num(values.crPts);

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower ATLAS (0–3)',
          interpretation: `ATLAS ${score}: lower severity/prognostic band — higher expected clinical cure rates in published ATLAS analyses.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Intermediate ATLAS (4–6)',
          interpretation: `ATLAS ${score}: intermediate severity. Optimize therapy, stop nonessential systemic antibiotics, monitor renal function and volume status.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'High ATLAS (7–10)',
          interpretation: `ATLAS ${score}: high severity/poorer prognosis band. Aggressive supportive care, guideline severe/fulminant pathways, early specialty input.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Components', value: 'Age + systemic Abx + WBC + albumin + creatinine' },
          { label: 'Range', value: '0–10' },
        ],
        recommendations:
          score >= 7
            ? ['Severe/fulminant CDI pathway as indicated', 'ID ± surgical consult', 'Minimize systemic antibiotics']
            : ['Guideline anti-CDI therapy', 'Stewardship of concurrent antibiotics', 'Serial labs'],
      };
    },
    evidence: {
      summary:
        'ATLAS: Age (<60/60–79/≥80 → 0/1/2), Treatment with systemic antibiotics (2), Leukocytes (<16/16–25/>25 → 0/1/2), Albumin (>3.5/2.6–3.5/≤2.5 → 0/1/2), Serum creatinine (≤1.3/>1.3 → 0/2).',
      formula: 'Sum 0–10',
      validation: 'Miller et al. ATLAS score; used in CDI literature for severity and outcome correlation.',
      references: [
        {
          title: 'Comparison of the ATLAS score vs other severity criteria for CDI',
          citation: 'Miller MA et al. BMC Infect Dis. 2013 / related ATLAS publications',
          year: 2013,
          pmid: '23452819',
          doi: '10.1016/j.ciresp.2013.01.001',
        },
      ],
    },
    nextSteps: [
      { condition: '0–3', actions: ['Standard CDI care', 'Stewardship'] },
      { condition: '≥7', actions: ['Escalate monitoring', 'Specialty involvement'] },
    ],
    pearls: [
      'Systemic antibiotic points refer to non-CDI antibiotics continued during treatment.',
      'Complement — do not ignore clinical fulminant features (shock, megacolon, ileus).',
    ],
  },

  {
    id: 'lyme-pretest',
    name: 'Lyme Disease Pretest Probability Helper',
    shortName: 'Lyme Pretest',
    description:
      'Educational pretest probability helper combining endemic exposure and clinical findings for Lyme disease.',
    category: 'infectious-disease',
    tags: ['lyme', 'borrelia', 'erythema migrans', 'tick', 'pretest'],
    whenToUse:
      'Patients with possible Lyme (rash, monoarthritis, facial palsy, etc.) when deciding empiric therapy vs testing.',
    whyUse:
      'Serology predictive value depends heavily on pretest probability; EM in endemic areas is often a clinical diagnosis.',
    inputs: [
      selectInput('endemic', 'Endemic exposure risk', [
        { label: 'Non-endemic / no exposure', value: 0 },
        { label: 'Possible exposure / travel', value: 1 },
        { label: 'Highly endemic area + outdoor exposure', value: 2 },
      ]),
      yesNo('emRash', 'Classic erythema migrans rash (≥5 cm expanding)', 3),
      yesNo('tickBite', 'Documented Ixodes tick bite in endemic area', 1),
      yesNo('summer', 'Season consistent with local transmission', 1),
      yesNo('facialPalsy', 'Acute facial nerve palsy', 2),
      yesNo('oligoarthritis', 'Oligoarthritis (esp. knee) with compatible course', 2),
      yesNo('carditis', 'AV block / Lyme carditis features', 2),
      yesNo('fluLike', 'Summer flu-like illness without alternate source', 1),
      yesNo('altDx', 'Convincing alternate diagnosis more likely', -3),
    ],
    calculate(values) {
      let score =
        num(values.endemic) +
        (bool(values.emRash) ? 3 : 0) +
        (bool(values.tickBite) ? 1 : 0) +
        (bool(values.summer) ? 1 : 0) +
        (bool(values.facialPalsy) ? 2 : 0) +
        (bool(values.oligoarthritis) ? 2 : 0) +
        (bool(values.carditis) ? 2 : 0) +
        (bool(values.fluLike) ? 1 : 0);
      if (bool(values.altDx)) score -= 3;

      if (bool(values.emRash) && num(values.endemic) >= 1) {
        return {
          score,
          label: 'High pretest — clinical EM pathway',
          interpretation: `Helper score ${score}: classic EM in an exposed patient is usually a clinical diagnosis — serology often negative early; start appropriate antibiotics without waiting for labs.`,
          riskLevel: 'high' as const,
          recommendations: [
            'Empiric doxycycline (or alternative if contraindicated) per guidelines',
            'Do not delay therapy for serology in classic EM',
            'Counsel on Jarisch–Herxheimer-type reactions and tick prevention',
          ],
        };
      }

      if (score >= 5) {
        return {
          score,
          label: 'Moderate–high pretest probability',
          interpretation: `Helper score ${score}: substantial compatible features. Two-tier serology (or modified two-tier) is reasonable; treat empirically when syndromes are highly specific (e.g., endemic facial palsy with exposure) per local practice.`,
          riskLevel: 'moderate' as const,
          recommendations: [
            'Order appropriate Lyme serology',
            'Consider empiric therapy for high-yield syndromes',
            'ECG if carditis symptoms/syncope',
          ],
        };
      }

      if (score >= 2) {
        return {
          score,
          label: 'Low–moderate pretest',
          interpretation: `Helper score ${score}: limited features. Testing may yield false positives in low-prevalence settings — target testing to objective findings and true exposure.`,
          riskLevel: 'low' as const,
          recommendations: [
            'Avoid shotgun serology without exposure/findings',
            'Symptomatic care; reassess if EM appears',
            'Tick-bite prophylaxis only if strict criteria met',
          ],
        };
      }

      return {
        score,
        label: 'Low pretest probability',
        interpretation: `Helper score ${score}: low pretest. Routine Lyme testing not recommended; positive serology more likely false positive.`,
        riskLevel: 'info' as const,
        recommendations: ['Pursue alternate diagnoses', 'Prevention counseling if exposure risk rises'],
      };
    },
    evidence: {
      summary:
        'Lyme pretest probability is driven by geography/exposure plus objective syndromes (EM, facial palsy, AV block, oligoarthritis). EM is clinical in endemic settings.',
      formula: 'Educational weighted pretest helper — not a validated numeric score',
      validation: 'Aligned with IDSA/AAN/ACR Lyme guideline principles on testing and EM diagnosis.',
      references: [
        {
          title: 'Clinical practice guidelines by IDSA/AAN/ACR for Lyme disease',
          citation: 'Lantos PM et al. Clin Infect Dis. 2021',
          year: 2021,
          pmid: '33417672',
          doi: '10.1093/cid/ciaa1215',
        },
      ],
    },
    nextSteps: [
      { condition: 'Classic EM + exposure', actions: ['Treat without delaying for serology'] },
      { condition: 'Low pretest', actions: ['Avoid low-value testing'] },
    ],
    pearls: [
      'Early EM serology is often negative — treat the rash.',
      'Single-tier IgM misuse is a common false-positive trap.',
    ],
  },

  {
    id: 'age-adjust-ddimer',
    name: 'Age-Adjusted D-Dimer Threshold',
    shortName: 'Age D-dimer',
    description:
      'Computes age-adjusted D-dimer cutoff for PE/VTE exclusion in patients >50 years (FEU scale).',
    category: 'emergency',
    tags: ['d-dimer', 'pe', 'vte', 'age-adjusted', 'years'],
    whenToUse:
      'Outpatients with non-high pretest PE/DVT probability when using D-dimer to exclude VTE.',
    whyUse:
      'Age × 10 µg/L FEU (age × 0.01 mg/L) after age 50 improves specificity without major sensitivity loss (ADJUST-PE).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, step: 1, defaultValue: 65 }),
      numberInput('ddimer', 'Measured D-dimer', {
        unit: 'µg/L FEU',
        min: 0,
        max: 50000,
        step: 10,
        defaultValue: 600,
        helpText: 'Use fibrinogen-equivalent units (FEU). If your lab reports ng/mL FEU, values are numerically equal to µg/L FEU.',
      }),
      selectInput('pretest', 'Pretest probability context', [
        { label: 'Low / PE unlikely (Wells/PERC pathway eligible)', value: 'low' },
        { label: 'Intermediate / PE unlikely YEARS-style', value: 'inter' },
        { label: 'High pretest (do not use D-dimer to exclude)', value: 'high' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const dd = num(values.ddimer, 0);
      const pretest = String(values.pretest ?? 'low');
      const conventional = 500;
      const threshold = age > 50 ? age * 10 : conventional;
      const belowAge = dd < threshold;
      const belowConv = dd < conventional;

      if (pretest === 'high') {
        return {
          score: round(threshold, 0),
          unit: 'µg/L FEU cutoff',
          label: 'High pretest — image, do not exclude with D-dimer',
          interpretation: `Age-adjusted cutoff would be ${threshold} µg/L FEU, but high pretest probability requires definitive imaging regardless of D-dimer (${dd} µg/L).`,
          riskLevel: 'high' as const,
          details: [
            { label: 'Measured D-dimer', value: `${dd} µg/L FEU` },
            { label: 'Conventional cutoff', value: `${conventional}` },
            { label: 'Age-adjusted cutoff', value: String(threshold) },
          ],
          recommendations: ['Proceed to CTPA/V-Q or duplex as indicated'],
        };
      }

      if (belowAge) {
        return {
          score: round(threshold, 0),
          unit: 'µg/L FEU cutoff',
          label: 'Below age-adjusted threshold',
          interpretation: `D-dimer ${dd} < age-adjusted cutoff ${threshold} µg/L FEU (age ${age}). In non-high pretest outpatients, PE/DVT may be excluded without imaging when rule applicability criteria are met (ADJUST-PE).`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Conventional 500 cutoff', value: belowConv ? 'Also negative' : 'Would be positive' },
            { label: 'Age-adjusted cutoff', value: `${threshold} µg/L FEU` },
            { label: 'Difference vs 500', value: `${threshold - conventional} µg/L` },
          ],
          recommendations: [
            'No further VTE imaging if pretest non-high and pathway followed',
            'Seek alternate diagnoses for symptoms',
          ],
        };
      }

      return {
        score: round(threshold, 0),
        unit: 'µg/L FEU cutoff',
        label: 'Above age-adjusted threshold',
        interpretation: `D-dimer ${dd} ≥ age-adjusted cutoff ${threshold} µg/L FEU. Cannot exclude VTE — proceed to imaging guided by pretest pathway.`,
        riskLevel: 'moderate' as const,
        details: [
          { label: 'Measured D-dimer', value: `${dd} µg/L FEU` },
          { label: 'Age-adjusted cutoff', value: String(threshold) },
        ],
        recommendations: ['CTPA / duplex / YEARS pathway imaging as appropriate'],
      };
    },
    evidence: {
      summary:
        'Age-adjusted D-dimer (FEU): cutoff = age × 10 µg/L for age >50; use 500 µg/L if age ≤50. Validated to exclude PE in non-high probability outpatients.',
      formula: 'Cutoff (µg/L FEU) = age > 50 ? age × 10 : 500',
      validation: 'ADJUST-PE and multiple meta-analyses; confirm units (FEU vs DDU — DDU thresholds differ).',
      references: [
        {
          title: 'Age-adjusted D-dimer cutoff levels to rule out pulmonary embolism: the ADJUST-PE study',
          citation: 'Righini M et al. JAMA. 2014;311:1117-1124',
          year: 2014,
          pmid: '24643601',
          doi: '10.1001/jama.2014.2135',
        },
      ],
    },
    nextSteps: [
      { condition: 'Below cutoff + non-high pretest', actions: ['Exclude VTE', 'Alternate workup'] },
      { condition: 'Above cutoff or high pretest', actions: ['Imaging'] },
    ],
    pearls: [
      'If your lab uses D-dimer units (DDU), age-adjusted cutoff is often age × 5 µg/L — confirm local reporting.',
      'Not validated to exclude VTE in high pretest probability or many inpatient populations.',
    ],
  },

  {
    id: 'primary-care-rule-dvt',
    name: 'Primary Care Rule for DVT (Oudega)',
    shortName: 'Primary Care DVT',
    description:
      'Primary care clinical decision rule for lower-extremity DVT incorporating D-dimer (Oudega rule).',
    category: 'hematology',
    tags: ['dvt', 'primary care', 'oudega', 'wells', 'd-dimer'],
    whenToUse: 'Primary care / outpatient suspected lower-extremity DVT when ultrasound access is gated by risk.',
    whyUse: 'Score ≤3 safely withholds ultrasound in validation studies; integrates D-dimer into the rule.',
    inputs: [
      yesNo('male', 'Male sex', 1),
      yesNo('ocp', 'Oral contraceptive use', 1),
      yesNo('cancer', 'Presence of active malignancy (within 6 months)', 1),
      yesNo('surgery', 'Surgery in previous month', 1),
      yesNo('noTrauma', 'Absence of trauma explaining symptoms', 1),
      yesNo('veinDistension', 'Vein distension', 1),
      yesNo('calf3', 'Calf circumference difference ≥3 cm', 2),
      yesNo('ddimerPos', 'Abnormal D-dimer', 6),
    ],
    calculate(values) {
      const score =
        (bool(values.male) ? 1 : 0) +
        (bool(values.ocp) ? 1 : 0) +
        (bool(values.cancer) ? 1 : 0) +
        (bool(values.surgery) ? 1 : 0) +
        (bool(values.noTrauma) ? 1 : 0) +
        (bool(values.veinDistension) ? 1 : 0) +
        (bool(values.calf3) ? 2 : 0) +
        (bool(values.ddimerPos) ? 6 : 0);

      if (score <= 3) {
        return {
          score,
          label: 'DVT unlikely (≤3) — ultrasound not required',
          interpretation: `Primary care rule ${score}: DVT unlikely. In derivation/validation, ultrasound could be withheld; very low miss rate when rule applied correctly.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Threshold', value: '≤3 no US; ≥4 perform US' },
            { label: 'Note', value: 'D-dimer abnormal alone contributes +6 → always ≥4' },
          ],
          recommendations: [
            'No duplex needed if rule fully applied',
            'Reassess if symptoms progress',
            'Consider alternate diagnoses (Baker cyst, cellulitis, muscle strain)',
          ],
        };
      }
      return {
        score,
        label: 'DVT possible (≥4) — obtain ultrasound',
        interpretation: `Primary care rule ${score}: not low risk — arrange compression ultrasound. Abnormal D-dimer alone forces score ≥6.`,
        riskLevel: 'moderate' as const,
        details: [{ label: 'Threshold', value: '≤3 no US; ≥4 perform US' }],
        recommendations: [
          'Lower-extremity duplex ultrasound',
          'Empiric anticoagulation only if delay + high concern + low bleed risk',
        ],
      };
    },
    evidence: {
      summary:
        'Oudega primary care rule: male +1, OCP +1, malignancy +1, recent surgery +1, no trauma +1, vein distension +1, calf difference ≥3 cm +2, abnormal D-dimer +6. ≤3 excludes DVT without US.',
      formula: 'Sum 0–14; ≤3 ultrasound not indicated',
      validation: 'Derived and validated in primary care populations (Oudega / Toll et al.).',
      references: [
        {
          title: 'Safely ruling out deep venous thrombosis in primary care',
          citation: 'Oudega R et al. Ann Intern Med. 2005;143:100-107',
          year: 2005,
          pmid: '16027451',
          doi: '10.7326/0003-4819-143-2-200507190-00008',
        },
      ],
    },
    nextSteps: [
      { condition: '≤3', actions: ['No US', 'Safety net'] },
      { condition: '≥4', actions: ['Ultrasound'] },
    ],
    pearls: [
      'Different from Wells DVT — designed for primary care prevalence and workflow.',
      'Positive D-dimer always pushes the score into the ultrasound group.',
    ],
  },

  {
    id: 'ottawa-sah-rule',
    name: 'Ottawa SAH Rule',
    shortName: 'Ottawa SAH',
    description:
      'Ottawa Subarachnoid Hemorrhage Rule for which alert headache patients need investigation for SAH.',
    category: 'emergency',
    tags: ['sah', 'subarachnoid', 'headache', 'ottawa', 'ct'],
    whenToUse:
      'Alert patients ≥15 years with new severe nontraumatic headache peaking within 1 hour — SAH not already confirmed.',
    whyUse: 'High sensitivity rule: any criterion positive → investigate; all negative → SAH extremely unlikely.',
    inputs: [
      yesNo('age40', 'Age ≥40 years'),
      yesNo('neckPain', 'Neck pain or stiffness'),
      yesNo('loc', 'Witnessed loss of consciousness'),
      yesNo('exertion', 'Onset during exertion'),
      yesNo('thunderclap', 'Thunderclap headache (instantly peaking pain)'),
      yesNo('limitedFlexion', 'Limited neck flexion on examination'),
    ],
    calculate(values) {
      const keys = ['age40', 'neckPain', 'loc', 'exertion', 'thunderclap', 'limitedFlexion'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score >= 1) {
        return {
          score,
          label: 'Ottawa SAH positive — investigate',
          interpretation: `${score} criterion(ia) present. Rule is positive: pursue noncontrast CT head (ideally ≤6h from onset with expert read) ± LP per pathway. Rule does not diagnose SAH — it flags who needs workup.`,
          riskLevel: 'high' as const,
          details: [{ label: 'Positive criteria', value: String(score) }],
          recommendations: [
            'Noncontrast CT head',
            'If CT negative and suspicion remains, LP (xanthochromia/RBC) per timing guidelines',
            'Neurosurgery if SAH confirmed',
          ],
        };
      }
      return {
        score: 0,
        label: 'Ottawa SAH negative',
        interpretation:
          'No Ottawa SAH criteria. In inclusion-eligible cohorts, SAH is extremely unlikely — workup for SAH generally not required by the rule. Still use judgment for atypical high-risk features outside the rule.',
        riskLevel: 'low' as const,
        recommendations: [
          'Consider other headache diagnoses',
          'Return precautions for recurrent thunderclap or neurologic change',
        ],
      };
    },
    evidence: {
      summary:
        'Ottawa SAH Rule investigates if any of: age ≥40, neck pain/stiffness, witnessed LOC, onset during exertion, thunderclap (instant peak), limited neck flexion on exam.',
      formula: 'Any positive → investigate; all negative → rule out SAH (if eligibility met)',
      validation:
        'Perry et al. derivation/validation; apply only to alert neurologically intact patients with acute peaking headache as specified.',
      references: [
        {
          title: 'Clinical decision rules to rule out subarachnoid hemorrhage for acute headache',
          citation: 'Perry JJ et al. JAMA. 2013;310:1248-1255',
          year: 2013,
          pmid: '24065011',
          doi: '10.1001/jama.2013.278018',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['CT ± LP pathway'] },
      { condition: 'Negative', actions: ['No SAH workup if eligibility met', 'Alternate Dx'] },
    ],
    pearls: [
      'Not for trauma, transfer-in known SAH, or patients with new neurologic deficits.',
      'Thunderclap means instantaneous peak — not merely “worst headache of life” over minutes.',
    ],
  },

  {
    id: 'egsys',
    name: 'EGSYS Syncope Score',
    shortName: 'EGSYS',
    description:
      'Evaluation of Guidelines in Syncope Study (EGSYS) score to identify cardiac causes of syncope.',
    category: 'emergency',
    tags: ['syncope', 'egsys', 'cardiac', 'risk'],
    whenToUse: 'Adults with syncope when estimating likelihood of cardiac etiology.',
    whyUse: 'Point score from history distinguishing cardiac vs non-cardiac syncope (EGSYS).',
    inputs: [
      yesNo('palpitations', 'Palpitations preceding syncope (+4)', 4),
      yesNo('heartOrEcg', 'Heart disease and/or abnormal ECG (+3)', 3),
      yesNo('effort', 'Syncope during effort (+3)', 3),
      yesNo('supine', 'Syncope while supine (+2)', 2),
      yesNo('autonomic', 'Autonomic prodromes (nausea/warmth) (−1)', -1),
      yesNo('precipitating', 'Precipitating or predisposing factors (−1)', -1,
        'e.g., warm crowded place, prolonged standing, fear/pain/emotion'),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.palpitations)) score += 4;
      if (bool(values.heartOrEcg)) score += 3;
      if (bool(values.effort)) score += 3;
      if (bool(values.supine)) score += 2;
      if (bool(values.autonomic)) score -= 1;
      if (bool(values.precipitating)) score -= 1;

      if (score >= 3) {
        return {
          score,
          label: 'Cardiac syncope more likely (EGSYS ≥3)',
          interpretation: `EGSYS ${score}: higher likelihood of cardiac syncope. Prioritize ECG review, monitoring, cardiology evaluation, and usually admission if cause not already clear.`,
          riskLevel: 'high' as const,
          details: [{ label: 'Typical cutpoint', value: '≥3 suggests cardiac etiology' }],
          recommendations: [
            'Telemetry / admission as appropriate',
            'Evaluate structural heart disease and arrhythmia',
            'Compare with SF Syncope / CSRS for disposition',
          ],
        };
      }
      return {
        score,
        label: 'Cardiac syncope less likely (EGSYS <3)',
        interpretation: `EGSYS ${score}: lower likelihood of cardiac syncope — features more compatible with reflex/orthostatic mechanisms. Still exclude dangerous causes with ECG and clinical judgment.`,
        riskLevel: score <= 0 ? ('low' as const) : ('moderate' as const),
        details: [{ label: 'Typical cutpoint', value: '≥3 suggests cardiac etiology' }],
        recommendations: [
          'Orthostatic vitals',
          'Medication review',
          'Outpatient follow-up if SF/CSRS also low risk',
        ],
      };
    },
    evidence: {
      summary:
        'EGSYS: palpitations preceding syncope +4; heart disease/abnormal ECG +3; effort syncope +3; supine syncope +2; autonomic prodromes −1; precipitating factors −1. Score ≥3 predicts cardiac syncope.',
      formula: 'Algebraic sum of weighted items (range typically −2 to +12)',
      validation: 'Del Rosso et al. EGSYS; useful adjunct, not sole disposition tool.',
      references: [
        {
          title: 'Clinical predictors of cardiac syncope (EGSYS score)',
          citation: 'Del Rosso A et al. Heart. 2008;94:1620-1626',
          year: 2008,
          pmid: '18519550',
          doi: '10.1136/hrt.2008.143123',
        },
      ],
    },
    nextSteps: [
      { condition: '≥3', actions: ['Cardiac workup intensity high', 'Monitoring'] },
      { condition: '<3', actions: ['Reflex/orthostatic pathway', 'Risk tools for disposition'] },
    ],
    pearls: [
      'Abnormal ECG definitions should follow local EGSYS application (any cardiac abnormality of relevance).',
      'Use with San Francisco / Canadian syncope scores for ED disposition.',
    ],
  },

  {
    id: 'oesil-score',
    name: 'OESIL Syncope Risk Score',
    shortName: 'OESIL',
    description:
      'OESIL score for mortality risk stratification after syncope in the emergency setting.',
    category: 'emergency',
    tags: ['syncope', 'oesil', 'mortality', 'risk'],
    whenToUse: 'Adult ED syncope patients for simple mortality risk banding.',
    whyUse: 'Four binary items; scores ≥2 associate with higher 12-month mortality in derivation.',
    inputs: [
      yesNo('age65', 'Age >65 years', 1),
      yesNo('cvHistory', 'History of cardiovascular disease', 1),
      yesNo('noProdrome', 'Syncope without prodrome', 1),
      yesNo('abnormalEcg', 'Abnormal ECG', 1),
    ],
    calculate(values) {
      const score = (['age65', 'cvHistory', 'noProdrome', 'abnormalEcg'] as const).reduce(
        (s, k) => s + (bool(values[k]) ? 1 : 0),
        0
      );

      if (score >= 2) {
        return {
          score,
          label: 'Higher risk (OESIL ≥2)',
          interpretation: `OESIL ${score}: higher mortality risk stratum (original study showed substantially increased 12-month mortality for ≥2). Favor admission/monitoring and cardiac evaluation.`,
          riskLevel: score >= 3 ? ('high' as const) : ('moderate' as const),
          details: [{ label: 'Range', value: '0–4' }],
          recommendations: [
            'Consider admission / observation',
            'Telemetry and medication review',
            'Cross-check with CSRS / SF Syncope',
          ],
        };
      }
      return {
        score,
        label: 'Lower risk (OESIL 0–1)',
        interpretation: `OESIL ${score}: lower mortality risk band in derivation. Outpatient management may be reasonable if workup reassuring and other rules agree.`,
        riskLevel: 'low' as const,
        details: [{ label: 'Range', value: '0–4' }],
        recommendations: ['Discharge if evaluation complete', 'Primary care / cardiology follow-up as needed'],
      };
    },
    evidence: {
      summary:
        'OESIL: 1 point each for age >65, cardiovascular disease history, syncope without prodrome, abnormal ECG. Higher risk if ≥2.',
      formula: 'Sum 0–4',
      validation: 'Colivicchi et al. OESIL; older score with mortality endpoint — complement modern ED tools.',
      references: [
        {
          title: 'Development and prospective validation of a risk stratification system for patients with syncope in the emergency department: the OESIL risk score',
          citation: 'Colivicchi F et al. Eur Heart J. 2003;24:811-819',
          year: 2003,
          pmid: '12727148',
          doi: '10.1016/s0195-668x(02)00827-8',
        },
      ],
    },
    nextSteps: [
      { condition: '0–1', actions: ['Often discharge-capable'] },
      { condition: '≥2', actions: ['Admit / further cardiac eval'] },
    ],
    pearls: [
      'Simple but less nuanced than Canadian Syncope Risk Score.',
      'Abnormal ECG remains one of the most actionable items.',
    ],
  },

  {
    id: 'rose-rule',
    name: 'ROSE Rule (Syncope)',
    shortName: 'ROSE',
    description:
      'ROSE (Risk stratification Of Syncope in the Emergency department) rule for 1-month serious outcome risk.',
    category: 'emergency',
    tags: ['syncope', 'rose', 'bnpp', 'risk', 'braces'],
    whenToUse: 'Adult ED patients with syncope for short-term serious outcome risk (BRACES mnemonic).',
    whyUse: 'Any positive ROSE criterion classifies higher risk; includes BNP which other rules omit.',
    inputs: [
      yesNo('bnp', 'BNP ≥300 pg/mL (B)', 1),
      yesNo('brady', 'Bradycardia ≤50 bpm in ED (R — rate)', 1),
      yesNo('fobt', 'Rectal exam fecal occult blood positive (A — anemia workup cue)', 1),
      yesNo('anemia', 'Anemia with hemoglobin ≤90 g/L (9 g/dL) (A)', 1),
      yesNo('chestPain', 'Chest pain associated with syncope (C)', 1),
      yesNo('qWave', 'ECG Q wave (not in lead III) (E)', 1),
      yesNo('sat', 'Oxygen saturation ≤94% on room air (S)', 1),
    ],
    calculate(values) {
      const keys = ['bnp', 'brady', 'fobt', 'anemia', 'chestPain', 'qWave', 'sat'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score >= 1) {
        return {
          score,
          label: 'ROSE positive (high risk)',
          interpretation: `${score} BRACES criterion(ia) present. Higher risk of serious outcome within 1 month in derivation — consider admission and targeted evaluation (ACS, arrhythmia, bleed, PE/cardiopulmonary).`,
          riskLevel: 'high' as const,
          details: [{ label: 'Mnemonic', value: 'BNP, Bradycardia, FOBT, Anemia, Chest pain, ECG Q waves, Saturation' }],
          recommendations: [
            'Admit / observe with monitoring as appropriate',
            'Investigate positive domains (troponin, CBC, ECG, BNP context)',
          ],
        };
      }
      return {
        score: 0,
        label: 'ROSE negative (lower risk)',
        interpretation:
          'No ROSE criteria. Lower short-term serious outcome risk in derivation cohorts; still combine with clinical judgment and other syncope tools.',
        riskLevel: 'low' as const,
        recommendations: ['Consider discharge if workup complete', 'Return precautions'],
      };
    },
    evidence: {
      summary:
        'ROSE (BRACES): BNP ≥300 pg/mL, bradycardia ≤50, rectal FOBT+, Hb ≤90 g/L, chest pain with syncope, Q waves (not III), SpO₂ ≤94% RA. Any → high risk.',
      formula: 'Any criterion positive = ROSE positive',
      validation: 'Reed et al. derivation/validation for 1-month serious outcomes.',
      references: [
        {
          title: 'The ROSE (Risk stratification Of Syncope in the Emergency department) study',
          citation: 'Reed MJ et al. J Am Coll Cardiol. 2010;55:713-721',
          year: 2010,
          pmid: '20170806',
          doi: '10.1016/j.jacc.2009.09.049',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Higher-level care', 'Domain-specific workup'] },
      { condition: 'Negative', actions: ['Discharge consideration'] },
    ],
    pearls: [
      'BNP is not always available in ED — ROSE cannot be fully applied without it.',
      'FOBT item is often least practical; anemia criterion still captures bleeding risk.',
    ],
  },

  {
    id: 'boston-syncope',
    name: 'Boston Syncope Rule (Simplified)',
    shortName: 'Boston Syncope',
    description:
      'Simplified Boston Syncope Rule: any high-risk predictor positive suggests need for admission.',
    category: 'emergency',
    tags: ['syncope', 'boston', 'admission', 'risk'],
    whenToUse: 'ED syncope disposition when applying Boston rule risk categories.',
    whyUse: 'High-sensitivity admission rule based on signs of cardiac/ischemic/conduction/volume/family risk.',
    inputs: [
      yesNo('acsSigns', 'Signs/symptoms of acute coronary syndrome', 1),
      yesNo('conduction', 'Worrisome cardiac conduction disease (e.g., severe bradycardia, bundle blocks of concern)', 1),
      yesNo('historyCad', 'History of CAD or structural heart disease / risk factors constellation per rule', 1),
      yesNo('valvular', 'History of valvular heart disease (e.g., AS concern)', 1),
      yesNo('familyHx', 'Family history of sudden death', 1),
      yesNo('persistentAbnVitals', 'Persistent abnormal vital signs in ED', 1),
      yesNo('volume', 'Volume depletion / bleeding / profound anemia concern', 1),
      yesNo('primaryCns', 'Primary CNS event as cause (stroke/SAH etc.)', 1),
    ],
    calculate(values) {
      const keys = [
        'acsSigns',
        'conduction',
        'historyCad',
        'valvular',
        'familyHx',
        'persistentAbnVitals',
        'volume',
        'primaryCns',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score >= 1) {
        return {
          score,
          label: 'Boston rule positive — admit',
          interpretation: `${score} high-risk category(ies) present. Boston Syncope Rule recommends admission for further evaluation; high sensitivity for adverse outcomes in original work with limited specificity.`,
          riskLevel: 'high' as const,
          details: [{ label: 'Categories positive', value: `${score} / 8` }],
          recommendations: [
            'Admission / observation',
            'Telemetry and cause-specific testing',
            'Consider more specific tools (CSRS) to refine intermediate cases',
          ],
        };
      }
      return {
        score: 0,
        label: 'Boston rule negative — lower risk',
        interpretation:
          'No Boston high-risk categories selected. Lower likelihood of serious outcome; discharge may be considered if evaluation complete — specificity tradeoffs mean clinical judgment remains essential.',
        riskLevel: 'low' as const,
        recommendations: ['Outpatient follow-up', 'Return precautions', 'Ensure ECG documented'],
      };
    },
    evidence: {
      summary:
        'Boston Syncope Rule: admit if any of several predictor groups (ACS signs, conduction disease, CAD/heart disease, valvular disease, family sudden death, abnormal vitals, volume depletion, primary CNS event).',
      formula: 'Any positive category → admit recommendation',
      validation:
        'Grossman et al.; sensitive but not specific — educational simplified checklist of original categories.',
      references: [
        {
          title: 'The yield of head CT in syncope: a pilot study / Boston syncope criteria literature',
          citation: 'Grossman SA et al. related Boston Syncope Rule publications (J Emerg Med / Ann Emerg Med)',
          year: 2007,
          pmid: '17499690',
          doi: '10.1016/j.jemermed.2006.08.015',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Admit', 'Targeted workup'] },
      { condition: 'Negative', actions: ['Discharge if safe', 'Follow-up'] },
    ],
    pearls: [
      'Low specificity — many patients rule-in; pair with CSRS for nuanced risk.',
      'This is a simplified educational implementation of category-based Boston criteria.',
    ],
  },

  {
    id: 'delta-troponin',
    name: 'Delta Troponin Interpreter (Educational)',
    shortName: 'Δ Troponin',
    description:
      'Educational helper for interpreting absolute and relative troponin rise between two measurements.',
    category: 'cardiology',
    tags: ['troponin', 'delta', 'acs', 'mi', 'hs-tn'],
    whenToUse:
      'Chest pain pathways with serial troponins when assessing rise/fall consistent with acute myocardial injury.',
    whyUse:
      'Absolute deltas matter more than relative % at low hs-Tn levels; thresholds are assay-specific — this tool teaches the concepts.',
    inputs: [
      numberInput('t0', 'Troponin T0', {
        unit: 'ng/L',
        min: 0,
        max: 100000,
        step: 0.1,
        defaultValue: 8,
        helpText: 'Use same assay units for both values (ng/L common for hs-Tn)',
      }),
      numberInput('t1', 'Troponin T1 (later)', {
        unit: 'ng/L',
        min: 0,
        max: 100000,
        step: 0.1,
        defaultValue: 20,
      }),
      numberInput('hours', 'Interval between draws', {
        unit: 'hours',
        min: 0.5,
        max: 24,
        step: 0.5,
        defaultValue: 3,
      }),
      selectInput('sexUrl', 'Sex-specific URL context (optional)', [
        { label: 'Not specified', value: 'na' },
        { label: 'Male URL higher', value: 'M' },
        { label: 'Female URL lower', value: 'F' },
      ]),
      numberInput('absCutoff', 'Assay absolute delta threshold (educational)', {
        unit: 'ng/L',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 5,
        helpText: 'Example only — use your assay’s validated 0/1h or 0/3h absolute delta',
      }),
    ],
    calculate(values) {
      const t0 = num(values.t0, 0);
      const t1 = num(values.t1, 0);
      const hours = num(values.hours, 3);
      const absCut = num(values.absCutoff, 5);
      const absDelta = round(t1 - t0, 2);
      const absDeltaAbs = Math.abs(absDelta);
      const rel = t0 > 0 ? round((absDelta / t0) * 100, 1) : absDelta > 0 ? Infinity : 0;
      const relStr = !Number.isFinite(rel) ? '∞ (from 0)' : `${rel}%`;

      const significantAbs = absDeltaAbs >= absCut;
      // Common teaching: ≥20% relative change when values are clearly elevated
      const significantRel = t0 > 0 && Math.abs(rel) >= 20;

      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';

      if (significantAbs && absDelta > 0) {
        label = 'Significant rise (absolute delta)';
        interpretation = `Absolute rise ${absDelta} ng/L over ${hours} h meets/exceeds educational absolute threshold ${absCut} ng/L. Compatible with acute myocardial injury when clinical ACS context present — follow pathway (HEART/EDACS/hs-Tn algorithm). Relative change ${relStr}.`;
        riskLevel = 'high';
      } else if (significantAbs && absDelta < 0) {
        label = 'Significant fall (absolute delta)';
        interpretation = `Absolute fall ${absDelta} ng/L over ${hours} h. Fall patterns also support acute injury timing (not chronic stable elevation). Correlate clinically.`;
        riskLevel = 'moderate';
      } else if (significantRel && !significantAbs) {
        label = 'Relative change ≥20% but absolute delta small';
        interpretation = `Relative change ${relStr} with absolute Δ ${absDelta} ng/L (< ${absCut}). At low hs-Tn concentrations, small absolute noise can create large % changes — prefer assay-specific absolute deltas near the URL.`;
        riskLevel = 'moderate';
      } else {
        label = 'No significant delta by selected thresholds';
        interpretation = `Absolute Δ ${absDelta} ng/L over ${hours} h; relative ${relStr}. Does not meet educational absolute threshold ${absCut} ng/L. Chronic myocardial injury or non-cardiac chest pain still possible — use full pathway timing (0/1/2/3h) and clinical risk.`;
        riskLevel = 'low';
      }

      return {
        score: absDelta,
        unit: 'ng/L Δ',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'T0 → T1', value: `${t0} → ${t1} ng/L` },
          { label: 'Absolute delta', value: `${absDelta} ng/L` },
          { label: 'Relative delta', value: relStr },
          { label: 'Interval', value: `${hours} h` },
          { label: 'Educational abs threshold', value: `${absCut} ng/L` },
        ],
        recommendations: [
          'Apply your laboratory’s validated hs-Tn algorithm (not this educational cutoff alone)',
          'Integrate ECG and clinical probability',
          'Repeat testing if early presenters or ongoing symptoms',
        ],
      };
    },
    evidence: {
      summary:
        'hs-cTn pathways use assay-specific absolute concentration changes over fixed intervals; relative ≥20% is a traditional concept more relevant when values are elevated.',
      formula: 'Δ = T1 − T0; %Δ = (T1 − T0)/T0 × 100',
      validation:
        'Educational only — ESC 0/1h algorithms and manufacturer cutoffs supersede generic thresholds.',
      references: [
        {
          title: 'Fourth universal definition of myocardial infarction',
          citation: 'Thygesen K et al. Circulation. 2018',
          year: 2018,
          pmid: '30571511',
          doi: '10.1161/CIR.0000000000000617',
        },
        {
          title: 'ESC guidelines for NSTE-ACS / hs-cTn algorithms',
          citation: 'Collet JP et al. Eur Heart J. 2021',
          year: 2021,
          pmid: '34447986',
          doi: '10.1093/ehjci/jeab156',
        },
      ],
    },
    nextSteps: [
      { condition: 'Significant rise + ACS context', actions: ['ACS pathway', 'Cardiology as indicated'] },
      { condition: 'No delta', actions: ['Continue risk stratification', 'Consider non-ACS causes'] },
    ],
    pearls: [
      'Never mix assays or units between T0 and T1.',
      'Absolute deltas dominate decision-making at low hs-Tn values.',
    ],
  },

  {
    id: 'de-winter',
    name: 'de Winter T-Wave Pattern Helper',
    shortName: 'de Winter',
    description:
      'Educational ECG checklist for the de Winter T-wave STEMI equivalent (proximal LAD occlusion pattern).',
    category: 'cardiology',
    tags: ['de winter', 'stemi equivalent', 'lad', 'ecg', 'omi'],
    whenToUse: 'Anterior ischemic symptoms with upsloping ST depression and tall peaked precordial T waves.',
    whyUse: 'de Winter pattern is an occlusion MI equivalent — activate reperfusion without waiting for classic STEMI.',
    inputs: [
      yesNo('symptoms', 'Symptoms of acute coronary occlusion (chest pain / equivalent)', 1),
      yesNo('upslopeStd', '1–3 mm upsloping ST depression at J point in precordials (V1–V6)', 2),
      yesNo('tallT', 'Tall, peaked, symmetric T waves in the same precordial leads', 2),
      yesNo('slightSteavr', 'Slight ST elevation in aVR (0.5–1 mm) often present', 1),
      yesNo('noOvertSte', 'No frank STEMI criteria in precordial leads', 1),
      yesNo('dynamic', 'Pattern recognized in ACS time window (acute presentation)', 1),
    ],
    calculate(values) {
      const core = bool(values.upslopeStd) && bool(values.tallT);
      const support =
        (bool(values.symptoms) ? 1 : 0) +
        (bool(values.slightSteavr) ? 1 : 0) +
        (bool(values.noOvertSte) ? 1 : 0) +
        (bool(values.dynamic) ? 1 : 0);
      const score = (core ? 4 : 0) + support;

      if (core && bool(values.symptoms)) {
        return {
          score,
          label: 'de Winter pattern likely — STEMI equivalent',
          interpretation: `Core ECG features present with ischemic symptoms (support ${support}/4). Treat as anterior OMI / proximal LAD occlusion equivalent — emergent reperfusion pathway.`,
          riskLevel: 'critical' as const,
          details: [
            { label: 'Core ECG (upslope STD + tall T)', value: 'Yes' },
            { label: 'Supportive features', value: `${support}/4` },
          ],
          recommendations: [
            'Activate cath lab / STEMI-equivalent pathway',
            'Anti-ischemic medical therapy',
            'Do not wait for evolution to frank ST elevation',
          ],
        };
      }
      if (core) {
        return {
          score,
          label: 'ECG pattern concerning — correlate clinically',
          interpretation: 'Upsloping precordial STD + tall T waves without clear symptom flag selected. Still high concern if any ischemic context — urgent ECG comparison and cardiology review.',
          riskLevel: 'high' as const,
          recommendations: ['Urgent cardiology', 'Serial ECGs', 'Treat as OMI if clinical ACS'],
        };
      }
      return {
        score,
        label: 'de Winter criteria not met',
        interpretation: 'Core combination of upsloping precordial ST depression plus tall peaked T waves not selected. Continue standard ACS/ECG evaluation; other STEMI equivalents may still apply.',
        riskLevel: 'moderate' as const,
        recommendations: ['Standard ACS pathway', 'Review for Wellens, posterior MI, Sgarbossa, etc.'],
      };
    },
    evidence: {
      summary:
        'de Winter pattern: 1–3 mm upsloping ST depression at J point in precordials with tall peaked T waves ± slight aVR elevation — associated with proximal LAD occlusion.',
      formula: 'Educational ECG checklist (core = upsloping STD + tall T)',
      validation: 'Described by de Winter et al.; recognized STEMI-equivalent / OMI pattern in ECG literature.',
      references: [
        {
          title: 'A new ECG sign of proximal LAD occlusion',
          citation: 'de Winter RJ et al. N Engl J Med. 2008;359:2071-2073',
          year: 2008,
          pmid: '18987380',
          doi: '10.1056/NEJMc0804737',
        },
      ],
    },
    nextSteps: [
      { condition: 'Pattern likely', actions: ['Emergent reperfusion', 'ACS meds'] },
      { condition: 'Not met', actions: ['Usual ECG differential'] },
    ],
    pearls: [
      'May persist or evolve to frank anterior STEMI — either way, do not delay.',
      'Not the same as hyperacute T waves alone without upsloping STD.',
    ],
  },

  {
    id: 'stemi-equivalent',
    name: 'STEMI Equivalent Patterns Checklist',
    shortName: 'STEMI Equiv',
    description:
      'Checklist of major STEMI-equivalent / occlusion MI ECG patterns that warrant emergent reperfusion consideration.',
    category: 'cardiology',
    tags: ['stemi equivalent', 'omi', 'ecg', 'reperfusion', 'mi'],
    whenToUse: 'Suspected acute coronary occlusion when classic STEMI mm criteria are absent or subtle.',
    whyUse: 'Bundles high-yield OMI patterns so none are missed while waiting for biomarker evolution.',
    inputs: [
      yesNo('posterior', 'Isolated posterior MI (anterior STD + tall R / posterior leads STE)', 1),
      yesNo('deWinter', 'de Winter T-wave pattern', 1),
      yesNo('wellens', 'Wellens syndrome (pain-free biphasic/deep inverted precordial T)', 1),
      yesNo('sgarbossa', 'Sgarbossa / Smith-modified positive in LBBB or paced rhythm', 1),
      yesNo('lmain', 'Diffuse STD with STE in aVR (possible LM/3VD ischemia pattern)', 1),
      yesNo('hyperacute', 'Hyperacute T waves with reciprocal change / clear OMI context', 1),
      yesNo('rvMi', 'Right ventricular MI pattern with inferior occlusion (V4R STE)', 1),
      yesNo('newLbbb', 'New LBBB with compatible symptoms (context-dependent; not solely diagnostic)', 1),
      yesNo('refractory', 'Refractory ischemic symptoms ± hemodynamic instability with subtle ECG', 1),
    ],
    calculate(values) {
      const keys = [
        'posterior',
        'deWinter',
        'wellens',
        'sgarbossa',
        'lmain',
        'hyperacute',
        'rvMi',
        'newLbbb',
        'refractory',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const hardOmi =
        bool(values.posterior) ||
        bool(values.deWinter) ||
        bool(values.sgarbossa) ||
        bool(values.rvMi) ||
        bool(values.hyperacute);

      if (hardOmi || bool(values.refractory) || score >= 2) {
        return {
          score,
          label: 'STEMI-equivalent / OMI pathway indicated',
          interpretation: `${score} pattern flag(s) selected${hardOmi ? ' including high-specificity OMI ECG pattern(s)' : ''}. Treat as emergent reperfusion candidate — do not require classic STE thresholds.`,
          riskLevel: 'critical' as const,
          details: [{ label: 'Flags positive', value: `${score} / 9` }],
          recommendations: [
            'Activate cath lab / transfer for PCI per protocol',
            'Full posterior/right-sided leads if not already done',
            'Medical ACS therapy; avoid delaying for serial troponin if ECG diagnostic',
          ],
        };
      }
      if (score === 1) {
        return {
          score,
          label: 'Single concerning pattern — urgent review',
          interpretation:
            'One selected flag (e.g., Wellens or aVR pattern) needs immediate expert ECG review and pathway decision; Wellens often urgent angio rather than “code STEMI” but still not a stress-test candidate.',
          riskLevel: 'high' as const,
          recommendations: ['Cardiology now', 'Serial ECGs', 'Medical management of ACS'],
        };
      }
      return {
        score: 0,
        label: 'No STEMI-equivalent flags selected',
        interpretation:
          'Checklist clear. Continue standard ACS evaluation (serial ECG/troponin, risk scores). Absence of these patterns does not exclude OMI.',
        riskLevel: 'moderate' as const,
        recommendations: ['HEART/EDACS + hs-Tn pathway', 'Repeat ECGs if pain continues'],
      };
    },
    evidence: {
      summary:
        'STEMI equivalents commonly include posterior MI, de Winter, Sgarbossa/modified Sgarbossa, hyperacute T/OMI patterns, RV infarction with inferior OMI, and selected left main/3VD patterns; Wellens is a critical LAD warning.',
      formula: 'Educational multi-pattern checklist',
      validation:
        'Composite of established ECG OMI literature and reperfusion guidelines — not a single derivation score.',
      references: [
        {
          title: 'Fourth universal definition of MI / ECG diagnosis principles',
          citation: 'Thygesen K et al. Circulation. 2018',
          year: 2018,
          pmid: '30571511',
          doi: '10.1161/CIR.0000000000000617',
        },
        {
          title: 'de Winter ECG pattern',
          citation: 'de Winter RJ et al. N Engl J Med. 2008',
          year: 2008,
          pmid: '18987380',
          doi: '10.1056/NEJMc0804737',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any hard OMI pattern', actions: ['Emergent reperfusion pathway'] },
      { condition: 'None', actions: ['Serial testing', 'Risk stratification'] },
    ],
    pearls: [
      'Record V7–V9 for suspected posterior MI and V4R for inferior OMI.',
      'aVR STE with diffuse STD is ischemia pattern — not automatically “left main STEMI” but warrants urgent evaluation.',
    ],
  },
];
