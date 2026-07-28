import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave6HemeOncCalcs: Calculator[] = [
  // ─── 1. HEP score (HIT) ────────────────────────────────────────────────────
  {
    id: 'hep-score',
    name: 'HEP Score (HIT Expert Probability)',
    shortName: 'HEP',
    description:
      'Expert-derived pretest probability score for heparin-induced thrombocytopenia (alternative/complement to 4Ts).',
    category: 'hematology',
    tags: ['hep', 'hit', 'heparin', 'thrombocytopenia', '4ts'],
    whenToUse: 'Suspected HIT when stratifying pretest probability before immunoassay / SRA and anticoagulation decisions.',
    whyUse: 'Broader expert-weighted model than 4Ts; cutoffs ~2 (high sensitivity) and ~5 (higher specificity) used in literature.',
    inputs: [
      selectInput('onsetType', 'HIT onset pattern suspected', [
        { label: 'Typical onset (no recent heparin / classic timing)', value: 'typical' },
        { label: 'Rapid onset (heparin within prior 100 days)', value: 'rapid' },
      ]),
      selectInput('pltFall', 'Magnitude of platelet fall (peak → nadir since heparin)', [
        { label: '<30%', value: -1, points: -1 },
        { label: '30–50%', value: 1, points: 1 },
        { label: '>50%', value: 3, points: 3 },
      ]),
      selectInput('timingTypical', 'Timing of fall — typical-onset pathway', [
        { label: 'N/A (using rapid-onset pathway)', value: 0, points: 0 },
        { label: '<4 days after heparin', value: -2, points: -2 },
        { label: 'Day 4 after heparin', value: 2, points: 2 },
        { label: 'Days 5–10 after heparin', value: 3, points: 3 },
        { label: 'Days 11–14 after heparin', value: 2, points: 2 },
        { label: '>14 days after heparin', value: -1, points: -1 },
      ], 0, 'Use when typical onset selected'),
      selectInput('timingRapid', 'Timing of fall — rapid-onset pathway', [
        { label: 'N/A (using typical-onset pathway)', value: 0, points: 0 },
        { label: 'Fall <48 h after re-exposure', value: 2, points: 2 },
        { label: 'Fall ≥48 h after re-exposure', value: -1, points: -1 },
      ], 0, 'Use when rapid onset selected'),
      selectInput('nadir', 'Nadir platelet count', [
        { label: '≤20 ×10⁹/L', value: -2, points: -2 },
        { label: '>20 ×10⁹/L', value: 2, points: 2 },
      ], 2),
      selectInput('thrombosis', 'Thrombosis related to heparin course', [
        { label: 'None', value: 0, points: 0 },
        { label: 'New venous/arterial thrombosis (≥ day 4 typical context)', value: 3, points: 3 },
        { label: 'Progression of thrombosis while on heparin', value: 2, points: 2 },
      ]),
      yesNo('skinNecrosis', 'Skin necrosis at SC heparin injection site(s)', 3),
      yesNo('systemicRxn', 'Acute systemic reaction after IV heparin bolus', 2),
      yesNo('bleeding', 'Bleeding, petechiae, or extensive bruising', -1),
      yesNo('chronicTCP', 'Chronic thrombocytopenic disorder present', -1),
      yesNo('newDrug', 'Newly started non-heparin drug known to cause thrombocytopenia', -1),
      yesNo('severeInfection', 'Severe infection', -2),
      yesNo('dic', 'Severe DIC (e.g., fibrinogen <100 mg/dL and D-dimer >5 µg/mL)', -2),
      yesNo('arterialDevice', 'Indwelling arterial device (IABP, VAD, ECMO)', -2),
      yesNo('cpb', 'Cardiopulmonary bypass within prior 96 hours', -1),
      yesNo('noOtherCause', 'No other apparent cause of thrombocytopenia', 3),
    ],
    calculate(values) {
      const onset = String(values.onsetType ?? 'typical');
      const pltFall = num(values.pltFall, 3);
      const timing =
        onset === 'rapid' ? num(values.timingRapid, 0) : num(values.timingTypical, 3);
      const nadir = num(values.nadir, 2);
      const thrombosis = num(values.thrombosis, 0);
      const skin = bool(values.skinNecrosis) ? 3 : 0;
      const systemic = bool(values.systemicRxn) ? 2 : 0;
      const bleeding = bool(values.bleeding) ? -1 : 0;
      const chronic = bool(values.chronicTCP) ? -1 : 0;
      const newDrug = bool(values.newDrug) ? -1 : 0;
      const infection = bool(values.severeInfection) ? -2 : 0;
      const dic = bool(values.dic) ? -2 : 0;
      const device = bool(values.arterialDevice) ? -2 : 0;
      const cpb = bool(values.cpb) ? -1 : 0;
      const otherNeg =
        (bool(values.chronicTCP) ? 1 : 0) +
        (bool(values.newDrug) ? 1 : 0) +
        (bool(values.severeInfection) ? 1 : 0) +
        (bool(values.dic) ? 1 : 0) +
        (bool(values.arterialDevice) ? 1 : 0) +
        (bool(values.cpb) ? 1 : 0);
      const noOther = bool(values.noOtherCause) && otherNeg === 0 ? 3 : 0;

      const score =
        pltFall +
        timing +
        nadir +
        thrombosis +
        skin +
        systemic +
        bleeding +
        chronic +
        newDrug +
        infection +
        dic +
        device +
        cpb +
        noOther;

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info';

      if (score < 2) {
        label = 'Lower HEP pretest probability (<2)';
        interpretation = `HEP score ${score}. Below common high-sensitivity cutoff of 2 — HIT less likely; still correlate with 4Ts, trends, and clinical judgment before stopping essential anticoagulation.`;
        riskLevel = 'low';
      } else if (score < 5) {
        label = 'Intermediate HEP (2–4)';
        interpretation = `HEP score ${score}. At/above sensitive cutoff (≥2) but below higher-specificity region (~5). Send HIT immunoassay; consider non-heparin anticoagulation if suspicion meaningful; avoid platelet transfusions for HIT unless bleeding.`;
        riskLevel = 'moderate';
      } else {
        label = 'Higher HEP pretest probability (≥5)';
        interpretation = `HEP score ${score}. Higher pretest probability range (historically improved specificity near ≥5). Stop heparin products, start non-heparin anticoagulant per protocol, obtain immunoassay ± functional assay.`;
        riskLevel = 'high';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Onset pathway', value: onset },
          { label: 'Platelet fall points', value: String(pltFall) },
          { label: 'Timing points', value: String(timing) },
          { label: 'Nadir points', value: String(nadir) },
          { label: 'No-other-cause points', value: String(noOther) },
        ],
        recommendations:
          score >= 2
            ? ['Hold heparin/LMWH/heparin flushes if safe', 'HIT Ab (ELISA/CLIA)', 'Non-heparin AC if intermediate–high suspicion', 'Avoid warfarin alone in acute HIT']
            : ['Reassess platelet trend and differentials', 'Compare with 4Ts score'],
      };
    },
    evidence: {
      summary:
        'HEP assigns expert-weighted points for magnitude/timing of thrombocytopenia, nadir, thrombosis, skin necrosis, systemic reaction, bleeding (negative), and competing causes. Literature cutoffs often 2 (sensitive) and 5 (more specific).',
      formula: 'Sum of weighted clinical items (can be negative); typical vs rapid timing pathways',
      validation: 'Cuker et al. JTH 2010; compared with 4Ts in subsequent cohorts (variable performance).',
      references: [
        {
          title: 'The HIT Expert Probability (HEP) Score: a novel pre-test probability model for heparin-induced thrombocytopenia based on broad expert opinion',
          citation: 'Cuker A et al. J Thromb Haemost. 2010',
          year: 2010,
          pmid: '20854372',
          doi: '10.1111/j.1538-7836.2010.04059.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'HEP ≥2', actions: ['HIT immunoassay', 'Consider non-heparin anticoagulant', 'Document heparin exposure history'] },
      { condition: 'HEP ≥5 or high 4Ts', actions: ['Treat as probable HIT pending labs', 'Hematology input', 'Functional assay if Ab positive/equivocal'] },
    ],
    pearls: [
      'Do not award “no other cause” (+3) if competing explanations are present.',
      'HEP is more complex than 4Ts; many centers still lead with 4Ts.',
    ],
  },

  // ─── 2. JAAM DIC ──────────────────────────────────────────────────────────
  {
    id: 'jaam-dic',
    name: 'JAAM DIC Criteria (Revised)',
    shortName: 'JAAM DIC',
    description:
      'Japanese Association for Acute Medicine disseminated intravascular coagulation score (revised, without fibrinogen).',
    category: 'hematology',
    tags: ['jaam', 'dic', 'coagulopathy', 'sepsis', 'critical care'],
    whenToUse: 'Critically ill patients (often sepsis) when diagnosing DIC earlier than ISTH overt-DIC thresholds.',
    whyUse: 'More sensitive early DIC screen in Japanese critical care cohorts; score ≥4 indicates JAAM DIC.',
    inputs: [
      selectInput('sirs', 'SIRS criteria met', [
        { label: '0–2 criteria (0 pts)', value: 0, points: 0 },
        { label: '≥3 criteria (1 pt)', value: 1, points: 1 },
      ]),
      selectInput('platelets', 'Platelet count', [
        { label: '≥120 ×10⁹/L (0 pts)', value: 0, points: 0 },
        { label: '80–<120 ×10⁹/L or >30% fall in 24 h (1 pt)', value: 1, points: 1 },
        { label: '<80 ×10⁹/L or >50% fall in 24 h (3 pts)', value: 3, points: 3 },
      ]),
      selectInput('ptRatio', 'Prothrombin time ratio (patient/normal)', [
        { label: '<1.2 (0 pts)', value: 0, points: 0 },
        { label: '≥1.2 (1 pt)', value: 1, points: 1 },
      ]),
      selectInput('fdp', 'FDP (or equivalent fibrin-related marker)', [
        { label: '<10 µg/mL (0 pts)', value: 0, points: 0 },
        { label: '10–<25 µg/mL (1 pt)', value: 1, points: 1 },
        { label: '≥25 µg/mL (3 pts)', value: 3, points: 3 },
      ], 0, 'Use lab’s FDP units; D-dimer cutoffs are not identical'),
    ],
    calculate(values) {
      const score =
        num(values.sirs) + num(values.platelets) + num(values.ptRatio) + num(values.fdp);
      if (score >= 4) {
        return {
          score,
          label: 'JAAM DIC positive (≥4)',
          interpretation: `JAAM DIC score ${score}/8. Meets revised JAAM DIC criteria. Manage underlying driver (often sepsis), support organs, consider transfusion for active bleed/procedures, and reassess coagulopathy serially. Compare with SIC and ISTH overt-DIC.`,
          riskLevel: 'high',
          details: [
            { label: 'JAAM total', value: `${score} / 8` },
            { label: 'Threshold', value: '≥4 = DIC' },
          ],
        };
      }
      return {
        score,
        label: 'JAAM DIC negative (<4)',
        interpretation: `JAAM DIC score ${score}/8. Does not meet revised JAAM DIC threshold. Repeat labs if clinical suspicion persists; consider SIC for early septic coagulopathy.`,
        riskLevel: 'low',
        details: [
          { label: 'JAAM total', value: `${score} / 8` },
          { label: 'Threshold', value: '≥4 = DIC' },
        ],
      };
    },
    evidence: {
      summary:
        'Revised JAAM DIC: SIRS (≥3 =1) + platelets (0/1/3) + PT ratio ≥1.2 (1) + FDP bands (0/1/3). Fibrinogen removed in revision. DIC if total ≥4.',
      formula: 'Sum of SIRS + platelets + PT ratio + FDP points (max 8)',
      validation: 'Gando et al. Crit Care Med 2006 and subsequent JAAM validations; widely used in Japan for early DIC.',
      references: [
        {
          title: 'A multicenter, prospective validation of disseminated intravascular coagulation diagnostic criteria for critically ill patients: comparing current criteria',
          citation: 'Gando S et al. Crit Care Med. 2006',
          year: 2006,
          pmid: '16521260',
          doi: '10.1097/01.ccm.0000202209.42491.38',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Treat cause (source control/antibiotics)', 'Serial coags/FDP/platelets', 'ISTH overt-DIC score', 'Bleed/thrombosis surveillance'] },
      { condition: 'Score <4 with sepsis', actions: ['Calculate SIC score', 'Repeat in 12–24 h if worsening'] },
    ],
    pearls: [
      'Original JAAM included fibrinogen and used ≥5; revised score drops fibrinogen and uses ≥4.',
      'FDP cutoffs differ from D-dimer—use the marker your lab reports with JAAM-validated bands when possible.',
    ],
  },

  // ─── 3. SIC score ─────────────────────────────────────────────────────────
  {
    id: 'sic-score',
    name: 'SIC Score (Sepsis-Induced Coagulopathy)',
    shortName: 'SIC',
    description: 'ISTH sepsis-induced coagulopathy score for early septic coagulopathy before overt DIC.',
    category: 'hematology',
    tags: ['sic', 'sepsis', 'dic', 'coagulopathy', 'isth'],
    whenToUse: 'Patients with sepsis/infection plus organ dysfunction when screening for sepsis-induced coagulopathy.',
    whyUse: 'Simpler early detector than ISTH overt DIC; SIC ≥4 supports diagnosis when platelet+INR points exceed 2 (i.e. ≥3).',
    inputs: [
      selectInput('inr', 'INR (or PT-INR)', [
        { label: '≤1.2 (0 pts)', value: 0, points: 0 },
        { label: '>1.2 to ≤1.4 (1 pt)', value: 1, points: 1 },
        { label: '>1.4 (2 pts)', value: 2, points: 2 },
      ]),
      selectInput('platelets', 'Platelet count (×10⁹/L)', [
        { label: '≥150 (0 pts)', value: 0, points: 0 },
        { label: '100 to <150 (1 pt)', value: 1, points: 1 },
        { label: '<100 (2 pts)', value: 2, points: 2 },
      ]),
      selectInput('sofa', 'Total SOFA (respiratory + CV + hepatic + renal only)', [
        { label: '0 (0 pts)', value: 0, points: 0 },
        { label: '1 (1 pt)', value: 1, points: 1 },
        { label: '≥2 (2 pts)', value: 2, points: 2 },
      ], 0, 'Sum of four SOFA domains only (not full 6-organ SOFA)'),
    ],
    calculate(values) {
      const inr = num(values.inr);
      const plt = num(values.platelets);
      const sofa = num(values.sofa);
      const coagSub = inr + plt;
      const score = coagSub + sofa;
      // Iba 2017: total ≥4 AND PT+platelet points exceeding 2 (i.e. ≥3)
      const positive = score >= 4 && coagSub > 2;

      if (positive) {
        return {
          score,
          label: 'SIC positive',
          interpretation: `SIC score ${score}/6 with platelet+INR subscore ${coagSub}. Meets sepsis-induced coagulopathy criteria. Treat sepsis aggressively; monitor for progression to overt DIC; anticoagulation strategies remain protocol/trial-dependent.`,
          riskLevel: 'high',
          details: [
            { label: 'SIC total', value: `${score} / 6` },
            { label: 'Platelet + INR points', value: String(coagSub) },
            { label: 'SOFA points (4 domains)', value: String(sofa) },
          ],
        };
      }
      if (score >= 4 && coagSub <= 2) {
        return {
          score,
          label: 'Not SIC (total ≥4 but coag subscore ≤2)',
          interpretation: `Total ${score} but platelet+INR subscore is ${coagSub} (must exceed 2). SIC diagnosis requires total ≥4 and coag subscore ≥3. Reassess coags and sepsis course.`,
          riskLevel: 'moderate',
          details: [
            { label: 'SIC total', value: `${score} / 6` },
            { label: 'Platelet + INR points', value: String(coagSub) },
          ],
        };
      }
      return {
        score,
        label: 'SIC negative',
        interpretation: `SIC score ${score}/6 (coag subscore ${coagSub}). Does not meet SIC. Continue sepsis care; repeat if platelets fall or INR rises.`,
        riskLevel: 'low',
        details: [
          { label: 'SIC total', value: `${score} / 6` },
          { label: 'Platelet + INR points', value: String(coagSub) },
        ],
      };
    },
    evidence: {
      summary:
        'SIC: INR ≤1.2/>1.2/>1.4 → 0/1/2; platelets ≥150/<150/<100 → 0/1/2; 4-item SOFA 0/1/≥2 → 0/1/2. Positive if total ≥4 and (INR+platelet points) exceed 2 (≥3).',
      formula: 'Score = INR pts + platelet pts + SOFA₄ pts (max 6); SIC if ≥4 and coag subscore >2',
      validation: 'Iba et al. BMJ Open 2017 / ISTH SSC; designed to capture earlier septic coagulopathy than overt DIC.',
      references: [
        {
          title: 'Diagnosis and management of sepsis-induced coagulopathy and disseminated intravascular coagulation',
          citation: 'Iba T et al. J Thromb Haemost. 2019',
          year: 2019,
          pmid: '31410983',
          doi: '10.1111/jth.14578',
        },
      ],
    },
    nextSteps: [
      { condition: 'SIC positive', actions: ['Source control + antibiotics', 'Serial coags/CBC', 'Calculate ISTH overt-DIC', 'Bleed/clot monitoring'] },
      { condition: 'Borderline', actions: ['Repeat labs 12–24 h', 'Review hepatopathy confounders of INR'] },
    ],
    pearls: [
      'SOFA here is only 4 organs (resp, CV, liver, kidney)—not CNS or coagulation SOFA.',
      'SIC is not automatically an indication for therapeutic heparin outside protocols/guidelines.',
    ],
  },

  // ─── 4. ISTH BAT ──────────────────────────────────────────────────────────
  {
    id: 'isth-bat',
    name: 'ISTH-BAT Total Interpretation',
    shortName: 'ISTH-BAT',
    description:
      'Interprets a completed ISTH Bleeding Assessment Tool total score by sex/age normal cutoffs (does not re-score each domain).',
    category: 'hematology',
    tags: ['isth-bat', 'bleeding score', 'vwd', 'mucocutaneous', 'hemostasis'],
    whenToUse: 'After completing ISTH-BAT questionnaire when deciding if the bleeding history is abnormal.',
    whyUse: 'Standardized abnormal cutoffs: adult men ≥4, adult women ≥6, children ≥3.',
    inputs: [
      selectInput('cohort', 'Patient cohort', [
        { label: 'Adult male', value: 'male' },
        { label: 'Adult female', value: 'female' },
        { label: 'Child (<18 years)', value: 'child' },
      ]),
      numberInput('total', 'ISTH-BAT total score', {
        min: 0,
        max: 56,
        step: 1,
        defaultValue: 2,
        helpText: 'Sum of domain scores (each 0–4; max 56)',
      }),
    ],
    calculate(values) {
      const cohort = String(values.cohort ?? 'male');
      const total = num(values.total, 0);
      const cut =
        cohort === 'female' ? 6 : cohort === 'child' ? 3 : 4;
      const normalMax = cut - 1;
      const abnormal = total >= cut;

      if (abnormal) {
        return {
          score: total,
          label: 'Abnormal bleeding score',
          interpretation: `ISTH-BAT total ${total} is ≥ ${cut} for this cohort (normal range 0–${normalMax}). Increased likelihood of an underlying mild bleeding disorder (e.g., VWD, platelet function disorder)—pursue directed hemostasis labs per specialist pathways. Score alone is not a diagnosis.`,
          riskLevel: 'high',
          details: [
            { label: 'Cohort', value: cohort },
            { label: 'Abnormal cutoff', value: `≥${cut}` },
            { label: 'Reported normal range', value: `0–${normalMax}` },
          ],
          recommendations: [
            'CBC, smear, PT/aPTT, fibrinogen',
            'VWF antigen/activity ± multimer if indicated',
            'Consider PFA/platelet aggregation with hematology',
            'Detailed procedure/family bleeding history',
          ],
        };
      }
      return {
        score: total,
        label: 'Within reported normal range',
        interpretation: `ISTH-BAT total ${total} is within the reported normal range (0–${normalMax}) for this cohort. A low score makes a clinically significant inherited bleeding disorder less likely but does not exclude it if history is concerning or before major hemostatic challenge.`,
        riskLevel: 'low',
        details: [
          { label: 'Cohort', value: cohort },
          { label: 'Abnormal cutoff', value: `≥${cut}` },
        ],
      };
    },
    evidence: {
      summary:
        'ISTH-BAT sums 0–4 points across mucocutaneous/surgical bleeding domains (max 56). Abnormal: adult males ≥4, adult females ≥6, children ≥3 (Elbatarny et al.).',
      formula: 'Interpret user-entered total vs sex/age cutoff',
      validation: 'ISTH-SSC BAT; normal ranges from international reference cohorts.',
      references: [
        {
          title: 'Normal range of bleeding scores for the ISTH-BAT: adult and pediatric data',
          citation: 'Elbatarny M et al. J Thromb Haemost. 2014',
          year: 2014,
          pmid: '25196510',
          doi: '10.1111/hae.12503',
        },
      ],
    },
    nextSteps: [
      { condition: 'Abnormal score', actions: ['Hematology referral', 'Baseline hemostasis panel', 'Avoid empiric invasive procedures without plan'] },
      { condition: 'Normal score but high concern', actions: ['Still test if family history strong', 'Re-score after new challenges'] },
    ],
    pearls: [
      'Women’s higher normal ceiling reflects menstrual bleeding scoring.',
      'This tool interprets totals only—domain scoring still requires the official BAT worksheet.',
    ],
  },

  // ─── 5. RIETE bleed ───────────────────────────────────────────────────────
  {
    id: 'riete-bleed',
    name: 'RIETE Bleeding Score',
    shortName: 'RIETE',
    description: 'Predicts major bleeding risk during early anticoagulation for acute VTE/PE (RIETE registry).',
    category: 'hematology',
    tags: ['riete', 'bleeding', 'vte', 'pe', 'anticoagulation'],
    whenToUse: 'Acute PE/VTE when estimating 3-month major bleeding risk on anticoagulation.',
    whyUse: 'Simple bedside score with low/intermediate/high major-bleed strata used alongside VTE-BLEED and clinical judgment.',
    inputs: [
      yesNo('recentBleed', 'Recent major bleeding', 2),
      yesNo('creatinine', 'Creatinine >1.2 mg/dL (>106 µmol/L)', 1.5),
      yesNo('anemia', 'Anemia (Hb <13 g/dL men, <12 g/dL women)', 1.5),
      yesNo('malignancy', 'Active cancer / malignancy history (per RIETE definition)', 1),
      yesNo('overtPE', 'Clinically overt pulmonary embolism', 1),
      yesNo('age75', 'Age >75 years', 1),
    ],
    calculate(values) {
      const score = round(
        (bool(values.recentBleed) ? 2 : 0) +
          (bool(values.creatinine) ? 1.5 : 0) +
          (bool(values.anemia) ? 1.5 : 0) +
          (bool(values.malignancy) ? 1 : 0) +
          (bool(values.overtPE) ? 1 : 0) +
          (bool(values.age75) ? 1 : 0),
        1
      );

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      let approx: string;

      if (score === 0) {
        label = 'Low bleeding risk (0)';
        interpretation = `RIETE ${score}. Low major-bleeding risk stratum in original registry (~0.1–0.3% early major bleed historically for lowest scores). Still individualize dose, fall risk, and drug interactions.`;
        riskLevel = 'low';
        approx = '~0.1% (score 0 historical)';
      } else if (score <= 4) {
        label = 'Intermediate bleeding risk (1–4)';
        interpretation = `RIETE ${score}. Intermediate major-bleeding risk. Balance VTE severity vs bleed risk; prefer regimen with favorable safety profile and close follow-up.`;
        riskLevel = 'moderate';
        approx = 'roughly ~1–4% range depending on exact score (historical)';
      } else {
        label = 'High bleeding risk (>4)';
        interpretation = `RIETE ${score}. High major-bleeding risk stratum (historically up to ~5–20% at the highest scores). Reassess anticoagulant intensity, reverse risk factors when possible, and arrange close monitoring.`;
        riskLevel = 'high';
        approx = 'elevated; highest scores historically ~5–20%';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'RIETE points', value: String(score) },
          { label: 'Historical major bleed (approx)', value: approx },
        ],
      };
    },
    evidence: {
      summary:
        'RIETE: recent major bleed 2; Cr >1.2 mg/dL 1.5; anemia 1.5; cancer 1; clinically overt PE 1; age >75 1. Low 0, intermediate 1–4, high >4 (common reporting).',
      formula: 'Weighted sum of 6 clinical factors (max 8)',
      validation: 'Derived from RIETE registry patients with acute VTE on anticoagulation.',
      references: [
        {
          title: 'Predicting major bleeding risk in patients with PE / RIETE bleeding score literature',
          citation: 'Ruíz-Giménez N et al. / RIETE investigators. Thromb Haemost. 2008',
          year: 2008,
          pmid: '18612534',
          doi: '10.1160/TH08-03-0193',
        },
      ],
    },
    nextSteps: [
      { condition: 'High RIETE', actions: ['Review reversible bleed risks', 'Careful AC selection/dosing', 'Early follow-up labs', 'Patient education on bleed signs'] },
      { condition: 'Any PE with high bleed risk', actions: ['Avoid unnecessary thrombolysis', 'IVC filter only per strict indications'] },
    ],
    pearls: [
      'Derived largely in heparin/VKA era—apply cautiously to DOACs.',
      'Overt PE item reflects presentation PE vs DVT-only cohorts in derivation.',
    ],
  },

  // ─── 6. Platelet transfusion thresholds ───────────────────────────────────
  {
    id: 'platelet-threshold',
    name: 'Platelet Transfusion Thresholds',
    shortName: 'Plt threshold',
    description: 'Educational platelet transfusion thresholds by clinical indication (AABB/ASH-style adult guidance).',
    category: 'hematology',
    tags: ['platelets', 'transfusion', 'threshold', 'bleeding', 'procedure'],
    whenToUse: 'When deciding prophylactic or pre-procedure platelet transfusion targets in adults.',
    whyUse: 'Standardizes common indication-based cutoffs; always individualize for active bleeding and comorbidities.',
    inputs: [
      selectInput('indication', 'Clinical indication', [
        { label: 'Prophylaxis — stable hypoproliferative thrombocytopenia', value: 'prophylaxis' },
        { label: 'Central line placement (compressible site)', value: 'line' },
        { label: 'Lumbar puncture', value: 'lp' },
        { label: 'Major non-neuraxial surgery', value: 'major_sx' },
        { label: 'Neurosurgery / intracranial procedure', value: 'neuro' },
        { label: 'Active major bleeding', value: 'bleed' },
        { label: 'Immune thrombocytopenia (ITP) without major bleed', value: 'itp' },
      ]),
      numberInput('plt', 'Current platelet count', {
        unit: '×10⁹/L',
        min: 0,
        max: 1000,
        defaultValue: 15,
      }),
    ],
    calculate(values) {
      const ind = String(values.indication ?? 'prophylaxis');
      const plt = num(values.plt, 15);
      const map: Record<
        string,
        { threshold: number; label: string; note: string; riskLevel: 'low' | 'moderate' | 'high' | 'info' }
      > = {
        prophylaxis: {
          threshold: 10,
          label: 'Prophylactic threshold ~10 ×10⁹/L',
          note: 'Many centers transfuse stable afebrile patients at <10; some use <10–20 if fever, sepsis, or minor bleeding.',
          riskLevel: 'info',
        },
        line: {
          threshold: 20,
          label: 'CVC threshold often ~20 ×10⁹/L',
          note: 'AABB suggests considering transfusion if <20 for CVC at compressible site; ultrasound guidance preferred.',
          riskLevel: 'info',
        },
        lp: {
          threshold: 50,
          label: 'LP threshold commonly ~50 ×10⁹/L',
          note: 'Many hematology pathways accept lower counts in experienced hands; follow local neuro/heme policy.',
          riskLevel: 'moderate',
        },
        major_sx: {
          threshold: 50,
          label: 'Major surgery target often ≥50 ×10⁹/L',
          note: 'Higher targets may be needed for ongoing oozing or complex surgery.',
          riskLevel: 'moderate',
        },
        neuro: {
          threshold: 100,
          label: 'Neuroaxial/neurosurgical target often ≥100 ×10⁹/L',
          note: 'Institutional neurosurgery policies vary; coordinate with proceduralist.',
          riskLevel: 'high',
        },
        bleed: {
          threshold: 50,
          label: 'Active major bleed — often keep ≥50 (higher if CNS/eye)',
          note: 'For intracranial or intraocular bleeding, targets of 100 are commonly used. Treat cause and reverse anticoagulants.',
          riskLevel: 'high',
        },
        itp: {
          threshold: 10,
          label: 'ITP — avoid prophylactic transfusion unless severe bleed',
          note: 'Transfused platelets are rapidly consumed; use for critical bleeding or pre-urgent procedures with adjuncts (IVIG, steroids, TPO-RA).',
          riskLevel: 'info',
        },
      };
      const m = map[ind] ?? map.prophylaxis;
      const below = plt < m.threshold;
      return {
        score: m.threshold,
        unit: '×10⁹/L target',
        label: below ? `Below typical target (${m.label})` : `At/above typical target (${m.label})`,
        interpretation: `Current platelets ${plt} ×10⁹/L. ${m.note} ${
          below
            ? 'Count is below the listed educational threshold—consider transfusion if benefits outweigh risks and diagnosis supports response.'
            : 'Count meets/exceeds the listed educational threshold for this indication; transfusion usually not required for the count alone.'
        }`,
        riskLevel: below ? (ind === 'bleed' || ind === 'neuro' ? 'high' : 'moderate') : 'low',
        details: [
          { label: 'Current count', value: `${plt} ×10⁹/L` },
          { label: 'Educational threshold', value: `${m.threshold} ×10⁹/L` },
          { label: 'Indication', value: ind },
        ],
      };
    },
    evidence: {
      summary:
        'Educational adult thresholds adapted from AABB/ASH-style guidance: prophylaxis ~10, CVC ~20, LP/major surgery ~50, neurosurgery/CNS bleed ~100; ITP generally not prophylactically transfused.',
      formula: 'Compare measured count to indication-specific threshold',
      validation: 'Guideline-based teaching aid—not a substitute for institutional transfusion policy.',
      references: [
        {
          title: 'Platelet transfusion: a clinical practice guideline from the AABB',
          citation: 'Kaufman RM et al. Ann Intern Med. 2015',
          year: 2015,
          pmid: '25383671',
          doi: '10.7326/M14-1589',
        },
      ],
    },
    nextSteps: [
      { condition: 'Below threshold + procedure', actions: ['Order platelets timed to procedure', 'Confirm ABO/Rh issues', 'Recheck count after transfusion'] },
      { condition: 'Refractory count rise', actions: ['Evaluate alloimmunization/consumptive process', 'HLA-matched products if indicated'] },
    ],
    pearls: [
      'One adult dose typically raises count ~20–40 ×10⁹/L if not consumptive.',
      'Never use these cutoffs alone in DIC, HIT, TTP, or ITP without diagnosis-specific logic.',
    ],
  },

  // ─── 7. RBC restrictive transfusion thresholds ────────────────────────────
  {
    id: 'rbc-transfuse-threshold',
    name: 'Restrictive RBC Transfusion Thresholds',
    shortName: 'RBC threshold',
    description: 'Educational restrictive hemoglobin transfusion thresholds by clinical context (TRICC/TRISS/FOCUS-style).',
    category: 'hematology',
    tags: ['transfusion', 'hemoglobin', 'restrictive', 'rbc', 'anemia'],
    whenToUse: 'Hospitalized adults when applying restrictive vs liberal RBC transfusion strategies.',
    whyUse: 'Restrictive thresholds (often Hb 7–8 g/dL) are non-inferior in many stable populations and reduce exposure.',
    inputs: [
      selectInput('context', 'Clinical context', [
        { label: 'Stable critically ill (general ICU)', value: 'icu' },
        { label: 'Septic shock (stable after resuscitation)', value: 'sepsis' },
        { label: 'GI bleed (stable, no massive exsanguination)', value: 'gi' },
        { label: 'Postoperative / orthopedic (stable CAD possible)', value: 'postop' },
        { label: 'Acute coronary syndrome / ongoing ischemia', value: 'acs' },
        { label: 'Symptomatic anemia (chest pain, severe dyspnea, hypotension)', value: 'symptomatic' },
      ]),
      numberInput('hb', 'Current hemoglobin', { unit: 'g/dL', min: 3, max: 18, step: 0.1, defaultValue: 7.5 }),
    ],
    calculate(values) {
      const ctx = String(values.context ?? 'icu');
      const hb = num(values.hb, 7.5);
      const map: Record<string, { thr: number; label: string; note: string }> = {
        icu: {
          thr: 7,
          label: 'Restrictive ICU threshold ~7 g/dL',
          note: 'TRICC-style restrictive strategy for euvolemic ICU patients without active ACS.',
        },
        sepsis: {
          thr: 7,
          label: 'Septic shock restrictive ~7 g/dL',
          note: 'TRISS supported restrictive transfusion in septic shock after initial resuscitation.',
        },
        gi: {
          thr: 7,
          label: 'UGIB restrictive ~7 g/dL (selected patients)',
          note: 'Villanueva et al. restrictive strategy; do not delay transfusion in massive/exsanguinating bleed or shock.',
        },
        postop: {
          thr: 8,
          label: 'Post-op / CVD often ~8 g/dL',
          note: 'FOCUS and related trials support restrictive ~8 g/dL with symptoms in stable CVD.',
        },
        acs: {
          thr: 8,
          label: 'ACS — often individualized; many aim ≥8 g/dL',
          note: 'Evidence mixed; liberal strategies sometimes considered with ongoing ischemia—follow cardiology/local policy.',
        },
        symptomatic: {
          thr: 8,
          label: 'Symptomatic anemia — transfuse for symptoms regardless of exact cut',
          note: 'Symptoms and perfusion trump a fixed number; reassess after single-unit transfusion.',
        },
      };
      const m = map[ctx] ?? map.icu;
      const below = hb < m.thr;
      return {
        score: m.thr,
        unit: 'g/dL Hb target',
        label: below ? `Below restrictive threshold (${m.label})` : `At/above restrictive threshold (${m.label})`,
        interpretation: `Hb ${hb} g/dL. ${m.note} ${
          below
            ? 'Consider 1 unit RBC, then recheck Hb and symptoms (single-unit policy when stable).'
            : 'Restrictive strategy usually withholds transfusion unless symptoms, active ischemia, or rapid bleeding.'
        }`,
        riskLevel: below ? 'moderate' : 'low',
        details: [
          { label: 'Current Hb', value: `${hb} g/dL` },
          { label: 'Educational threshold', value: `${m.thr} g/dL` },
          { label: 'Context', value: ctx },
        ],
        recommendations: below
          ? ['Transfuse 1 unit if appropriate', 'Recheck Hb', 'Investigate anemia cause']
          : ['Observe', 'Iron/B12/folate workup as indicated', 'Address bleeding source'],
      };
    },
    evidence: {
      summary:
        'Restrictive Hb thresholds commonly 7 g/dL (ICU/sepsis/selected GI bleed) and ~8 g/dL (post-op/CVD/symptoms). Always override for massive hemorrhage or severe symptoms.',
      formula: 'Compare Hb to context-specific restrictive cutoff',
      validation: 'TRICC, TRISS, FOCUS, Villanueva UGIB trial and AABB guidance.',
      references: [
        {
          title: 'Red blood cell transfusion: 2023 AABB international guidelines',
          citation: 'Carson JL et al. JAMA. 2023',
          year: 2023,
          pmid: '37824153',
          doi: '10.1001/jama.2023.12914',
        },
      ],
    },
    nextSteps: [
      { condition: 'Transfusing', actions: ['Single-unit strategy if stable', 'Consent/risks', 'Evaluate cause of anemia'] },
      { condition: 'ACS context', actions: ['Cardiology input', 'Avoid both under- and over-transfusion'] },
    ],
    pearls: [
      'Massive transfusion / hemorrhagic shock is not a restrictive-threshold scenario.',
      'One unit typically raises Hb ~1 g/dL in adults without ongoing loss.',
    ],
  },

  // ─── 8. Absolute monocyte count ───────────────────────────────────────────
  {
    id: 'amc-count',
    name: 'Absolute Monocyte Count (AMC)',
    shortName: 'AMC',
    description: 'Calculates absolute monocyte count from WBC and monocyte percentage with educational reference bands.',
    category: 'hematology',
    tags: ['monocyte', 'amc', 'wbc', 'differential', 'leukocytosis'],
    whenToUse: 'Interpreting differential counts, chronic myelomonocytic leukemia screens, recovery, or infection patterns.',
    whyUse: 'Absolute counts are more meaningful than percentages alone; monocytosis may flag CMML, recovery, or inflammation.',
    inputs: [
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 200, step: 0.1, defaultValue: 8 }),
      numberInput('monoPct', 'Monocytes', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 8 }),
    ],
    calculate(values) {
      const wbc = num(values.wbc, 8);
      const pct = num(values.monoPct, 8);
      const amc = round(wbc * (pct / 100), 2);
      const r = riskFromThresholds(amc, [
        {
          max: 0.19,
          level: 'moderate',
          label: 'Monocytopenia pattern',
          interpretation: `AMC ${amc} ×10³/µL. Low absolute monocytes — consider aplastic states, hairy cell leukemia, glucocorticoids, or lab error; correlate clinically.`,
        },
        {
          max: 0.8,
          level: 'normal',
          label: 'Within common adult reference (~0.2–0.8)',
          interpretation: `AMC ${amc} ×10³/µL is within a common adult reference range (~0.2–0.8 ×10³/µL; lab-specific).`,
        },
        {
          max: 1.0,
          level: 'moderate',
          label: 'Mild monocytosis',
          interpretation: `AMC ${amc} ×10³/µL. Mild monocytosis — infection recovery, inflammation, smoking, or early MDS/MPN; repeat and correlate.`,
        },
        {
          max: 1000,
          level: 'high',
          label: 'Monocytosis (≥1.0 ×10³/µL educational)',
          interpretation: `AMC ${amc} ×10³/µL. Absolute monocytosis ≥1.0 ×10³/µL is a WHO CMML criterion component when persistent—evaluate duration, dysplasia, and molecular studies if unexplained.`,
        },
      ]);
      return {
        score: amc,
        unit: '×10³/µL',
        ...r,
        details: [
          { label: 'WBC', value: `${wbc} ×10³/µL` },
          { label: 'Monocyte %', value: `${pct}%` },
          { label: 'AMC', value: `${amc} ×10³/µL` },
        ],
      };
    },
    evidence: {
      summary: 'AMC = WBC × (monocyte% / 100). Adult reference often ~0.2–0.8 ×10³/µL; persistent ≥1.0 ×10³/µL is a CMML criterion element.',
      formula: 'AMC = WBC × mono% / 100',
      validation: 'Standard laboratory hematology calculation.',
      references: [
        {
          title: 'WHO classification criteria for CMML (monocytosis definitions in clinical use)',
          citation: 'Arber DA et al. / WHO myeloid neoplasm criteria discussions',
          year: 2016,
          pmid: '27069254',
          doi: '10.1182/blood-2016-03-643544',
        },
      ],
    },
    nextSteps: [
      { condition: 'Persistent monocytosis ≥1.0 (or ≥0.5 if CMML concern)', actions: ['Repeat CBC', 'Peripheral smear', 'Consider heme referral / NGS if chronic'] },
      { condition: 'Monocytopenia', actions: ['Review meds and marrow failure signs', 'Correlate with other cytopenias'] },
    ],
    pearls: [
      'Relative monocytosis with leukopenia may still yield a normal AMC.',
      'Automated differentials can misclassify; confirm unusual values on smear.',
    ],
  },

  // ─── 9. Absolute eosinophil count ─────────────────────────────────────────
  {
    id: 'aec-count',
    name: 'Absolute Eosinophil Count (AEC)',
    shortName: 'AEC',
    description: 'Calculates absolute eosinophil count and severity band (mild/moderate/severe eosinophilia).',
    category: 'hematology',
    tags: ['eosinophil', 'aec', 'allergy', 'parasite', 'hypereosinophilia'],
    whenToUse: 'Allergy, parasite, drug reaction, asthma, or hypereosinophilic syndrome workups.',
    whyUse: 'Severity bands guide urgency of organ evaluation (heart, lung, neuro) for hypereosinophilia.',
    inputs: [
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 200, step: 0.1, defaultValue: 8 }),
      numberInput('eosPct', 'Eosinophils', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 3 }),
    ],
    calculate(values) {
      const wbc = num(values.wbc, 8);
      const pct = num(values.eosPct, 3);
      const aec = round(wbc * (pct / 100), 2);
      // ×10³/µL equals ×10⁹/L numerically
      const r = riskFromThresholds(aec, [
        {
          max: 0.5,
          level: 'normal',
          label: 'Normal / not eosinophilic (≤0.5)',
          interpretation: `AEC ${aec} ×10³/µL. Within common normal adult range (typically <0.5 ×10³/µL).`,
        },
        {
          max: 1.5,
          level: 'low',
          label: 'Mild eosinophilia (0.5–1.5)',
          interpretation: `AEC ${aec} ×10³/µL. Mild eosinophilia — consider atopy, meds, parasites, adrenal insufficiency; usually less organ-threat than higher bands.`,
        },
        {
          max: 5.0,
          level: 'moderate',
          label: 'Moderate eosinophilia (1.5–5.0)',
          interpretation: `AEC ${aec} ×10³/µL. Moderate eosinophilia — broaden workup; assess for end-organ involvement if persistent.`,
        },
        {
          max: 1000,
          level: 'high',
          label: 'Severe eosinophilia / hypereosinophilia (>5.0)',
          interpretation: `AEC ${aec} ×10³/µL. Severe eosinophilia (hypereosinophilia if ≥1.5 sustained in formal defs; severe band often >5). Urgent evaluation for cardiac/neurologic/pulmonary injury and HES workup.`,
          // note: hypereosinophilia formal is AEC ≥1.5 ×10⁹/L; severe banding still useful clinically
        },
      ]);
      // Fix formal hypereosinophilia messaging for 1.5-5 range
      let interpretation = r.interpretation;
      if (aec >= 1.5) {
        interpretation += ' Formal hypereosinophilia is often defined as AEC ≥1.5 ×10⁹/L on two occasions.';
      }
      return {
        score: aec,
        unit: '×10³/µL',
        label: r.label,
        interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'WBC', value: `${wbc} ×10³/µL` },
          { label: 'Eosinophil %', value: `${pct}%` },
          { label: 'AEC', value: `${aec} ×10³/µL` },
        ],
      };
    },
    evidence: {
      summary:
        'AEC = WBC × eos%/100. Mild 0.5–1.5, moderate 1.5–5, severe >5 ×10³/µL (common teaching bands). Hypereosinophilia ≥1.5 ×10⁹/L.',
      formula: 'AEC = WBC × eosinophil% / 100',
      validation: 'Standard laboratory calculation; severity bands used in allergy/hematology teaching.',
      references: [
        {
          title: 'Contemporary consensus on hypereosinophilic syndromes',
          citation: 'Valent P et al. / World Allergy Organization eosinophilia discussions',
          year: 2012,
          pmid: '22460074',
          doi: '10.1016/j.jaci.2012.02.019',
        },
      ],
    },
    nextSteps: [
      { condition: 'AEC ≥1.5', actions: ['Medication review', 'Parasite/travel history', 'Troponin/ECG if symptoms', 'Smear'] },
      { condition: 'AEC >5 or organ injury', actions: ['Urgent specialty input', 'Consider steroids after diagnostics planned'] },
    ],
    pearls: [
      'Steroids rapidly lower AEC—draw diagnostic labs first when possible.',
      'Aspergillus, drug DRESS, and strongyloides are high-yield considerations before immunosuppression.',
    ],
  },

  // ─── 10. Haptoglobin hemolysis checklist ──────────────────────────────────
  {
    id: 'haptoglobin-hemolysis',
    name: 'Hemolysis Lab Pattern Checklist',
    shortName: 'Hemolysis labs',
    description:
      'Educational checklist combining haptoglobin, LDH, bilirubin, reticulocytes, and smear flags for hemolysis pattern.',
    category: 'hematology',
    tags: ['hemolysis', 'haptoglobin', 'ldh', 'bilirubin', 'reticulocyte'],
    whenToUse: 'Anemia with possible hemolysis to structure lab pattern interpretation.',
    whyUse: 'No single test is perfect; concordant markers increase confidence in intravascular/extravascular hemolysis.',
    inputs: [
      selectInput('haptoglobin', 'Haptoglobin', [
        { label: 'Normal / high', value: 0, points: 0 },
        { label: 'Low / undetectable', value: 2, points: 2 },
      ]),
      selectInput('ldh', 'LDH', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Elevated', value: 1, points: 1 },
      ]),
      selectInput('bili', 'Indirect / total bilirubin', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Elevated (unconjugated predominant)', value: 1, points: 1 },
      ]),
      selectInput('retic', 'Reticulocyte response', [
        { label: 'Not increased', value: 0, points: 0 },
        { label: 'Increased', value: 1, points: 1 },
      ]),
      yesNo('schistocytes', 'Schistocytes / fragments on smear', 2),
      yesNo('spherocytes', 'Spherocytes prominent', 1),
      yesNo('hemoglobinuria', 'Hemoglobinuria / dark urine with positive blood, few RBCs', 2),
      yesNo('dat', 'Direct antiglobulin test (DAT) positive', 1),
    ],
    calculate(values) {
      const score =
        num(values.haptoglobin) +
        num(values.ldh) +
        num(values.bili) +
        num(values.retic) +
        (bool(values.schistocytes) ? 2 : 0) +
        (bool(values.spherocytes) ? 1 : 0) +
        (bool(values.hemoglobinuria) ? 2 : 0) +
        (bool(values.dat) ? 1 : 0);

      const lowHapto = num(values.haptoglobin) >= 2;
      const intravascularHints =
        (bool(values.hemoglobinuria) ? 1 : 0) + (bool(values.schistocytes) ? 1 : 0) + (lowHapto ? 1 : 0);

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info';

      if (score <= 1) {
        label = 'Low support for active hemolysis';
        interpretation = `Pattern score ${score}. Few classic hemolysis markers. Consider non-hemolytic anemia, timing of labs, or acute blood loss. Repeat if clinical suspicion high.`;
        riskLevel = 'low';
      } else if (score <= 3) {
        label = 'Possible hemolysis — incomplete pattern';
        interpretation = `Pattern score ${score}. Suggestive but incomplete. Add smear, retic, DAT, and trends. Low haptoglobin is more specific when acute phase reaction is absent.`;
        riskLevel = 'moderate';
      } else {
        label = 'Pattern supports hemolysis';
        interpretation = `Pattern score ${score}. Concordant markers support hemolysis. ${
          intravascularHints >= 2
            ? 'Features favor intravascular component (low haptoglobin, hemoglobinuria, fragments)—consider mechanical valves, PNH, MAHA, transfusion reaction, clostridial sepsis.'
            : bool(values.dat)
              ? 'DAT positivity supports immune hemolysis (AIHA)—classify warm vs cold.'
              : 'Consider extravascular immune or intrinsic RBC defects; still exclude MAHA if schistocytes present.'
        }`;
        riskLevel = 'high';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Pattern points', value: String(score) },
          { label: 'Low haptoglobin', value: lowHapto ? 'Yes' : 'No' },
          { label: 'DAT positive', value: bool(values.dat) ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Classic hemolysis panel: ↑LDH, ↑indirect bili, ↑retic, ↓haptoglobin ± smear findings. Low haptoglobin supports intravascular hemolysis but falls in liver disease less specifically.',
      formula: 'Weighted educational checklist (not a validated numeric score)',
      validation: 'Teaching composite of standard hematology hemolysis evaluation.',
      references: [
        {
          title: 'Hemolytic anemia evaluation (standard clinical hematology)',
          citation: 'Brodsky RA. / ASH educational materials on hemolysis workup',
          year: 2019,
          pmid: '31693820',
          doi: '10.1056/NEJMc1912352',
        },
      ],
    },
    nextSteps: [
      { condition: 'Supports hemolysis', actions: ['Peripheral smear', 'DAT', 'CBC trends', 'Consider MAHA labs (PT/aPTT, fibrinogen, ADAMTS13 if TTP concern)'] },
      { condition: 'DAT+', actions: ['Warm vs cold workup', 'Drug history', 'Treat underlying AIHA pathway'] },
    ],
    pearls: [
      'Haptoglobin is an acute-phase reactant—can be normal despite hemolysis in inflammation.',
      'Transfused blood and hematoma resorption can mimic lab hemolysis patterns.',
    ],
  },

  // ─── 11. INR from PT ──────────────────────────────────────────────────────
  {
    id: 'inr-calc',
    name: 'INR from PT (ISI / MNPT)',
    shortName: 'INR',
    description: 'Calculates International Normalized Ratio from patient PT, mean normal PT, and thromboplastin ISI.',
    category: 'hematology',
    tags: ['inr', 'pt', 'warfarin', 'isi', 'coagulation'],
    whenToUse: 'When raw PT, MNPT, and reagent ISI are known and INR needs verification or teaching calculation.',
    whyUse: 'INR standardizes PT across reagents: INR = (PTpatient / MNPT)^ISI.',
    inputs: [
      numberInput('pt', 'Patient PT', { unit: 'sec', min: 5, max: 120, step: 0.1, defaultValue: 22 }),
      numberInput('mnpt', 'Mean normal PT (MNPT)', { unit: 'sec', min: 8, max: 20, step: 0.1, defaultValue: 12 }),
      numberInput('isi', 'Reagent ISI', { min: 0.8, max: 2.5, step: 0.01, defaultValue: 1.0, helpText: 'International Sensitivity Index of thromboplastin' }),
    ],
    calculate(values) {
      const pt = num(values.pt, 22);
      const mnpt = num(values.mnpt, 12);
      const isi = num(values.isi, 1);
      if (mnpt <= 0 || pt <= 0 || isi <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'PT, MNPT, and ISI must be positive.',
          riskLevel: 'info',
        };
      }
      const inr = round(Math.pow(pt / mnpt, isi), 2);
      const r = riskFromThresholds(inr, [
        {
          max: 1.2,
          level: 'normal',
          label: 'Near-normal INR',
          interpretation: `INR ${inr}. Near normal for most assays—usually not anticoagulated range.`,
        },
        {
          max: 2.99,
          level: 'moderate',
          label: 'Sub- / low-therapeutic depending on goal',
          interpretation: `INR ${inr}. For mechanical mitral valves goals differ; typical AF/VTE goal is often 2–3. Interpret vs indication.`,
        },
        {
          max: 3.99,
          level: 'high',
          label: 'Typical therapeutic to high-therapeutic',
          interpretation: `INR ${inr}. May be therapeutic for some indications or high for others—match to target range and bleeding risk.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Supratherapeutic INR',
          interpretation: `INR ${inr}. Supratherapeutic—assess bleeding, hold VKA, consider vitamin K / PCC per guideline if bleeding or very high INR.`,
        },
      ]);
      return {
        score: inr,
        unit: 'INR',
        ...r,
        details: [
          { label: 'PT', value: `${pt} s` },
          { label: 'MNPT', value: `${mnpt} s` },
          { label: 'ISI', value: String(isi) },
          { label: 'PT ratio', value: String(round(pt / mnpt, 2)) },
        ],
      };
    },
    evidence: {
      summary: 'INR = (PTpatient ÷ MNPT)^ISI. Standard WHO transformation for oral VKA monitoring.',
      formula: 'INR = (PT / MNPT) ^ ISI',
      validation: 'Universal laboratory definition of INR.',
      references: [
        {
          title: 'WHO guidelines for thromboplastins and plasma used to control oral anticoagulant therapy',
          citation: 'WHO Expert Committee on Biological Standardization / INR methodology',
          year: 1999,
          pmid: '10853384',
        },
      ],
    },
    nextSteps: [
      { condition: 'INR above goal', actions: ['Hold/reduce warfarin', 'Assess bleed', 'Vitamin K/PCC if indicated'] },
      { condition: 'INR below goal', actions: ['Adherence/diet/drug interaction review', 'Bridge only if high thrombotic risk'] },
    ],
    pearls: [
      'Point-of-care INR devices use their own calibration—do not mix ISI from a different reagent.',
      'Liver failure prolongs PT/INR without vitamin K antagonist therapy.',
    ],
  },

  // ─── 12. aPTT ratio ───────────────────────────────────────────────────────
  {
    id: 'aptt-ratio',
    name: 'aPTT Ratio',
    shortName: 'aPTT ratio',
    description: 'Patient aPTT divided by laboratory mean normal / control aPTT with heparin monitoring context.',
    category: 'hematology',
    tags: ['aptt', 'heparin', 'ptt', 'coagulation', 'ratio'],
    whenToUse: 'Unfractionated heparin monitoring teaching, lupus anticoagulant screens, or factor deficiency workups.',
    whyUse: 'Normalizes raw aPTT seconds to the local control; heparin therapeutic ranges are reagent-specific (anti-Xa preferred).',
    inputs: [
      numberInput('aptt', 'Patient aPTT', { unit: 'sec', min: 10, max: 300, step: 0.1, defaultValue: 60 }),
      numberInput('control', 'Control / mean normal aPTT', { unit: 'sec', min: 15, max: 50, step: 0.1, defaultValue: 30 }),
    ],
    calculate(values) {
      const aptt = num(values.aptt, 60);
      const control = num(values.control, 30);
      if (control <= 0) {
        return {
          score: '—',
          label: 'Invalid control',
          interpretation: 'Control aPTT must be positive.',
          riskLevel: 'info',
        };
      }
      const ratio = round(aptt / control, 2);
      const r = riskFromThresholds(ratio, [
        {
          max: 1.2,
          level: 'normal',
          label: 'Near-normal ratio',
          interpretation: `aPTT ratio ${ratio}. Near normal—usually not consistent with significant factor deficiency or therapeutic UFH (assay-dependent).`,
        },
        {
          max: 2.5,
          level: 'moderate',
          label: 'Prolonged ratio',
          interpretation: `aPTT ratio ${ratio}. Prolonged. For UFH, therapeutic anti-Xa-correlated aPTT ratios are reagent-specific (often roughly 1.5–2.5 historically—verify local nomogram).`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Markedly prolonged ratio',
          interpretation: `aPTT ratio ${ratio}. Markedly prolonged—consider over-anticoagulation, inhibitor, severe factor deficiency, or preanalytical error (heparin contamination).`,
        },
      ]);
      return {
        score: ratio,
        unit: 'ratio',
        ...r,
        details: [
          { label: 'Patient aPTT', value: `${aptt} s` },
          { label: 'Control', value: `${control} s` },
        ],
      };
    },
    evidence: {
      summary: 'aPTT ratio = patient aPTT / mean normal aPTT. UFH monitoring should use lab-specific therapeutic ranges or anti-Xa levels.',
      formula: 'Ratio = aPTT_patient / aPTT_control',
      validation: 'Standard coagulation laboratory reporting practice.',
      references: [
        {
          title: 'Parenteral anticoagulants: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed',
          citation: 'Garcia DA et al. Chest. 2012',
          year: 2012,
          pmid: '22315264',
          doi: '10.1378/chest.11-2291',
        },
      ],
    },
    nextSteps: [
      { condition: 'UFH therapy', actions: ['Use institutional nomogram or anti-Xa', 'Do not use a universal 1.5–2.5 rule without local correlation'] },
      { condition: 'Unexpected prolongation', actions: ['Mixing study', 'Exclude contamination', 'Review anticoagulants'] },
    ],
    pearls: [
      'Lupus anticoagulant can prolong aPTT without bleeding risk.',
      'Anti-Xa is preferred for UFH when available, especially with lupus inhibitor or altered baseline aPTT.',
    ],
  },

  // ─── 13. Anti-Xa interpret ────────────────────────────────────────────────
  {
    id: 'anti-xa-interpret',
    name: 'Anti-Xa Level Interpretation',
    shortName: 'Anti-Xa',
    description: 'Educational anti-Xa activity bands by anticoagulant indication (UFH, LMWH prophylactic/therapeutic).',
    category: 'hematology',
    tags: ['anti-xa', 'heparin', 'lmwh', 'enoxaparin', 'monitoring'],
    whenToUse: 'When an anti-Xa level is reported and needs context by drug and dosing intent.',
    whyUse: 'Target bands differ for UFH vs prophylactic vs therapeutic LMWH; timing of draw is critical.',
    inputs: [
      selectInput('regimen', 'Regimen / intent', [
        { label: 'Unfractionated heparin (UFH) infusion', value: 'ufh' },
        { label: 'LMWH — therapeutic (e.g., enoxaparin 1 mg/kg q12h)', value: 'lmwh_tx' },
        { label: 'LMWH — once-daily therapeutic', value: 'lmwh_daily' },
        { label: 'LMWH — prophylactic', value: 'lmwh_ppx' },
      ]),
      numberInput('level', 'Anti-Xa level', {
        unit: 'IU/mL',
        min: 0,
        max: 5,
        step: 0.01,
        defaultValue: 0.5,
        helpText: 'Peak LMWH usually ~4 h after dose; UFH often random on steady infusion',
      }),
    ],
    calculate(values) {
      const regimen = String(values.regimen ?? 'ufh');
      const level = num(values.level, 0.5);
      const bands: Record<string, { low: number; high: number; name: string; note: string }> = {
        ufh: {
          low: 0.3,
          high: 0.7,
          name: 'UFH common target ~0.3–0.7 IU/mL',
          note: 'Typical chromogenic anti-Xa therapeutic window for UFH; confirm local protocol.',
        },
        lmwh_tx: {
          low: 0.6,
          high: 1.0,
          name: 'Therapeutic LMWH q12h peak often ~0.6–1.0 IU/mL',
          note: 'Draw ~4 hours after dose once steady state. Ranges vary by product and lab.',
        },
        lmwh_daily: {
          low: 1.0,
          high: 2.0,
          name: 'Once-daily therapeutic LMWH peak often ~1.0–2.0 IU/mL',
          note: 'Higher peaks expected than q12h dosing; product-specific.',
        },
        lmwh_ppx: {
          low: 0.2,
          high: 0.5,
          name: 'Prophylactic LMWH peaks often ~0.2–0.5 IU/mL',
          note: 'Routine monitoring not required for most patients; consider in renal failure, extremes of weight, pregnancy.',
        },
      };
      const b = bands[regimen] ?? bands.ufh;
      let label: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info';
      if (level < b.low) {
        label = 'Below typical band';
        riskLevel = 'moderate';
      } else if (level <= b.high) {
        label = 'Within typical band';
        riskLevel = 'low';
      } else {
        label = 'Above typical band';
        riskLevel = 'high';
      }
      return {
        score: level,
        unit: 'IU/mL',
        label: `${label} — ${b.name}`,
        interpretation: `Anti-Xa ${level} IU/mL. ${b.note} ${
          level < b.low
            ? 'Below usual target—verify timing, missed dose, underdosing, or assay issues before increasing dose.'
            : level > b.high
              ? 'Above usual target—assess bleeding, renal function, timing (peak vs trough), and consider dose reduction.'
              : 'Within commonly cited educational range for this regimen.'
        }`,
        riskLevel,
        details: [
          { label: 'Regimen', value: regimen },
          { label: 'Typical band', value: `${b.low}–${b.high} IU/mL` },
        ],
      };
    },
    evidence: {
      summary:
        'Educational anti-Xa targets: UFH ~0.3–0.7; LMWH therapeutic q12h peak ~0.6–1.0; once-daily therapeutic peaks higher; prophylaxis lower. Always use lab/product protocols.',
      formula: 'Compare measured anti-Xa to regimen-specific band',
      validation: 'Chest/ISTH and product monograph ranges—lab-specific correlation required.',
      references: [
        {
          title: 'Parenteral anticoagulants: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed',
          citation: 'Garcia DA et al. Chest. 2012',
          year: 2012,
          pmid: '22315264',
          doi: '10.1378/chest.11-2291',
        },
      ],
    },
    nextSteps: [
      { condition: 'Out of range', actions: ['Confirm draw timing', 'Review CrCl/weight', 'Adjust per protocol', 'Assess bleeding/clotting'] },
    ],
    pearls: [
      'Do not interpret a trough LMWH as if it were a peak.',
      'Direct oral anticoagulants require drug-specific calibrated anti-Xa assays—not heparin calibrators.',
    ],
  },

  // ─── 14. Febrile neutropenia pathway helper ────────────────────────────────
  {
    id: 'fn-pathway',
    name: 'Febrile Neutropenia Pathway Helper',
    shortName: 'FN pathway',
    description:
      'Combines MASCC/CISNE-style risk features into an outpatient vs inpatient febrile neutropenia pathway helper.',
    category: 'oncology',
    tags: ['febrile neutropenia', 'mascc', 'cisne', 'neutropenia', 'fever'],
    whenToUse: 'Adult cancer patient with fever and neutropenia when triaging home oral therapy vs admission.',
    whyUse: 'Structures red-flag features that usually mandate inpatient IV antibiotics even if MASCC falls in the low-risk band (≥21).',
    inputs: [
      yesNo('fever', 'Fever ≥38.3 °C once or ≥38.0 °C sustained ≥1 h', 1),
      numberInput('anc', 'ANC', { unit: '/µL', min: 0, max: 2000, defaultValue: 400 }),
      yesNo('hypotension', 'Hypotension / shock / needing pressors', 3),
      yesNo('hypoxia', 'Respiratory distress or O₂ sat <90–92% on RA', 3),
      yesNo('altered', 'Altered mental status', 2),
      yesNo('severeMucositis', 'Severe mucositis or inability to take PO', 2),
      yesNo('uncontrolledCancer', 'Uncontrolled / progressive cancer', 1),
      yesNo('allogeneic', 'Allogeneic transplant or profound expected prolonged neutropenia', 3),
      yesNo('inpatientAtFever', 'Already inpatient when fever developed', 2),
      yesNo('comorbid', 'Significant comorbidity (COPD, HF, renal/hepatic failure)', 1),
      yesNo('highRiskChemo', 'High-risk regimen (AML induction, etc.)', 2),
      selectInput('burden', 'Symptom burden / clinical stability', [
        { label: 'Mild symptoms, stable', value: 0, points: 0 },
        { label: 'Moderate symptoms', value: 1, points: 1 },
        { label: 'Severe symptoms / clinical concern', value: 2, points: 2 },
      ]),
    ],
    calculate(values) {
      if (!bool(values.fever)) {
        return {
          score: 0,
          label: 'Fever criterion not met',
          interpretation:
            'Standard FN definitions require fever plus neutropenia. Without fever, evaluate afebrile neutropenia pathways and occult infection risk separately.',
          riskLevel: 'info',
        };
      }
      const anc = num(values.anc, 400);
      if (anc >= 1000) {
        return {
          score: anc,
          label: 'ANC not in classic severe neutropenia range',
          interpretation: `ANC ${anc}/µL. Classic febrile neutropenia uses ANC <500 (or <1000 with expected fall). Still treat fever seriously in cancer patients on chemo.`,
          riskLevel: 'moderate',
        };
      }
      const riskPts =
        (bool(values.hypotension) ? 3 : 0) +
        (bool(values.hypoxia) ? 3 : 0) +
        (bool(values.altered) ? 2 : 0) +
        (bool(values.severeMucositis) ? 2 : 0) +
        (bool(values.uncontrolledCancer) ? 1 : 0) +
        (bool(values.allogeneic) ? 3 : 0) +
        (bool(values.inpatientAtFever) ? 2 : 0) +
        (bool(values.comorbid) ? 1 : 0) +
        (bool(values.highRiskChemo) ? 2 : 0) +
        num(values.burden) +
        (anc < 100 ? 1 : 0);

      if (riskPts >= 3) {
        return {
          score: riskPts,
          label: 'High-risk FN — inpatient pathway',
          interpretation: `Risk feature points ${riskPts}. Features favor inpatient IV antipseudomonal β-lactam (± MRSA/fungal coverage per risk), cultures, and continuous monitoring. Do not plan initial outpatient oral therapy.`,
          riskLevel: 'high',
          details: [
            { label: 'ANC', value: `${anc} /µL` },
            { label: 'Risk points', value: String(riskPts) },
          ],
          recommendations: [
            'Blood cultures ×2 before abx if no delay',
            'IV antipseudomonal β-lactam promptly',
            'CBC, chem, lactate',
            'Source exam (line, skin, perianal, lung)',
          ],
        };
      }
      return {
        score: riskPts,
        label: 'Lower-risk features — consider formal MASCC/CISNE',
        interpretation: `Risk feature points ${riskPts}. No automatic high-risk red flags selected. Eligible patients may be considered for outpatient oral therapy only after formal MASCC (≥21) and/or CISNE, reliable follow-up, and no social barriers—still give first dose promptly.`,
        riskLevel: 'moderate',
        details: [
          { label: 'ANC', value: `${anc} /µL` },
          { label: 'Risk points', value: String(riskPts) },
        ],
        recommendations: [
          'Calculate MASCC and CISNE',
          'Ensure 24h access and caregiver',
          'Empiric oral fluoroquinolone + amox-clav if appropriate and local resistance allows',
        ],
      };
    },
    evidence: {
      summary:
        'Pathway helper emphasizing IDSA/NCCN high-risk FN features (hemodynamic instability, organ failure, allo-HCT, profound neutropenia, inability to take PO). Outpatient care requires validated scores (MASCC/CISNE) plus logistics.',
      formula: 'Weighted red-flag checklist (educational; not a replacement for MASCC/CISNE)',
      validation: 'Aligned with IDSA febrile neutropenia and MASCC/CISNE risk literature.',
      references: [
        {
          title: 'Clinical Practice Guideline for the Use of Antimicrobial Agents in Neutropenic Patients with Cancer',
          citation: 'Freifeld AG et al. Clin Infect Dis. 2011',
          year: 2011,
          pmid: '21258094',
          doi: '10.1093/cid/cir073',
        },
      ],
    },
    nextSteps: [
      { condition: 'High-risk', actions: ['Admit', 'IV abx within 60 min ideal', 'ID/oncology collaboration'] },
      { condition: 'Possible low-risk', actions: ['MASCC/CISNE', 'Social stability check', 'Close follow-up plan'] },
    ],
    pearls: [
      'Door-to-antibiotic time matters more than perfect score math.',
      'CISNE is for seemingly stable solid-tumor outpatients—not for hematologic instability.',
    ],
  },

  // ─── 15. CAT score (simplified educational) ───────────────────────────────
  {
    id: 'cat-score',
    name: 'CAT Score (Cancer-Associated Thrombosis, Simplified)',
    shortName: 'CAT score',
    description:
      'Educational simplified cancer-associated VTE risk helper using Khorana-style factors plus optional elevated D-dimer (Vienna CATS–inspired).',
    category: 'oncology',
    tags: ['cat', 'vte', 'cancer', 'khorana', 'vienna cats', 'thrombosis'],
    whenToUse: 'Ambulatory solid-tumor patients starting systemic therapy when considering primary VTE prophylaxis discussions.',
    whyUse: 'Extends simple cancer-VTE thinking beyond site alone; educational only—pair with full Khorana and guidelines.',
    inputs: [
      selectInput('cancerSite', 'Cancer site risk (Khorana-style)', [
        { label: 'Very high (stomach, pancreas) — 2 pts', value: 2, points: 2 },
        { label: 'High (lung, lymphoma, gyn, bladder, testicular) — 1 pt', value: 1, points: 1 },
        { label: 'Other solid tumors — 0 pts', value: 0, points: 0 },
      ]),
      yesNo('bmi35', 'BMI ≥35 kg/m²', 1),
      yesNo('hb', 'Hemoglobin <10 g/dL or using ESA', 1),
      yesNo('wbc', 'WBC >11 ×10⁹/L', 1),
      yesNo('plt', 'Platelets ≥350 ×10⁹/L', 1),
      yesNo('ddimer', 'D-dimer elevated (Vienna CATS–style biomarker)', 1, 'Optional; cutoffs study-specific'),
      yesNo('priorVte', 'Prior VTE', 1),
    ],
    calculate(values) {
      const score =
        num(values.cancerSite) +
        (bool(values.bmi35) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.plt) ? 1 : 0) +
        (bool(values.ddimer) ? 1 : 0) +
        (bool(values.priorVte) ? 1 : 0);

      const khoranaCore =
        num(values.cancerSite) +
        (bool(values.bmi35) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.plt) ? 1 : 0);

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';

      if (score <= 1) {
        label = 'Lower educational CAT risk';
        interpretation = `Simplified CAT points ${score} (Khorana core ${khoranaCore}). Lower risk band educationally—routine primary prophylaxis not automatic; still counsel on VTE symptoms.`;
        riskLevel = 'low';
      } else if (score <= 3) {
        label = 'Intermediate educational CAT risk';
        interpretation = `Simplified CAT points ${score} (Khorana core ${khoranaCore}). Intermediate risk—discuss prophylaxis per ASCO/guidelines if Khorana ≥2, bleeding risk acceptable, and patient values align.`;
        riskLevel = 'moderate';
      } else {
        label = 'Higher educational CAT risk';
        interpretation = `Simplified CAT points ${score} (Khorana core ${khoranaCore}). Higher risk features. Stronger consideration of primary thromboprophylaxis (e.g., DOAC or LMWH) if low bleed risk—shared decision.`;
        riskLevel = 'high';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Simplified CAT points', value: String(score) },
          { label: 'Khorana-style core', value: String(khoranaCore) },
          { label: 'D-dimer flag', value: bool(values.ddimer) ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Educational composite: Khorana items (site, BMI, Hb/ESA, WBC, platelets) ± elevated D-dimer (Vienna CATS inspiration) ± prior VTE. Not a validated standalone productized score.',
      formula: 'Sum of Khorana-style points + optional D-dimer + prior VTE',
      validation: 'Teaching bridge between Khorana and Vienna CATS biomarker enrichment; use formal scores for decisions.',
      references: [
        {
          title: 'Development and validation of a predictive model for chemotherapy-associated thrombosis',
          citation: 'Khorana AA et al. Blood. 2008',
          year: 2008,
          pmid: '18216292',
          doi: '10.1182/blood-2007-10-116327',
        },
        {
          title: 'Prediction of venous thromboembolism in cancer patients (Vienna CATS biomarkers)',
          citation: 'Ay C et al. Blood. 2010',
          year: 2010,
          pmid: '20829374',
          doi: '10.1182/blood-2010-02-270116',
        },
      ],
    },
    nextSteps: [
      { condition: 'Khorana core ≥2', actions: ['Bleed risk assessment', 'Discuss primary prophylaxis', 'Patient education on VTE signs'] },
      { condition: 'Prior VTE', actions: ['Secondary prevention plan', 'Oncology–heme collaboration'] },
    ],
    pearls: [
      'sP-selectin from original Vienna CATS is rarely available clinically—this simplified version uses D-dimer only.',
      'Myeloma and brain tumors need disease-specific VTE tools.',
    ],
  },

  // ─── 16. Cairo-Bishop laboratory TLS ──────────────────────────────────────
  {
    id: 'tls-cairo',
    name: 'Cairo-Bishop Laboratory TLS',
    shortName: 'Lab TLS',
    description: 'Cairo-Bishop laboratory tumor lysis syndrome criteria using absolute thresholds and/or 25% change.',
    category: 'oncology',
    tags: ['tls', 'tumor lysis', 'cairo-bishop', 'uric acid', 'electrolytes'],
    whenToUse: 'Patients with high-burden hematologic malignancy or rapidly proliferating tumors around cytotoxic therapy.',
    whyUse: 'Defines laboratory TLS when ≥2 metabolic abnormalities occur in the same 24-hour window (day −3 to +7 of treatment).',
    inputs: [
      yesNo('uric', 'Uric acid ≥8 mg/dL or ≥25% increase from baseline', 1),
      yesNo('k', 'Potassium ≥6.0 mEq/L or ≥25% increase', 1),
      yesNo('phos', 'Phosphorus ≥4.5 mg/dL (adult) or ≥25% increase', 1, 'Pediatric absolute often ≥6.5 mg/dL'),
      yesNo('ca', 'Calcium ≤7.0 mg/dL or ≥25% decrease', 1),
    ],
    calculate(values) {
      const n =
        (bool(values.uric) ? 1 : 0) +
        (bool(values.k) ? 1 : 0) +
        (bool(values.phos) ? 1 : 0) +
        (bool(values.ca) ? 1 : 0);

      if (n >= 2) {
        return {
          score: n,
          label: 'Laboratory TLS (Cairo-Bishop)',
          interpretation: `${n} of 4 laboratory criteria met. Meets Cairo-Bishop laboratory TLS. Aggressive IV fluids (if renal function allows), treat hyperkalemia/hyperphosphatemia/hypocalcemia carefully, continue/escalate urate control (allopurinol/rasburicase), monitor q4–8h, and assess for clinical TLS.`,
          riskLevel: 'high',
          details: [{ label: 'Criteria met', value: `${n} / 4` }],
          recommendations: [
            'Cardiac monitoring if K high',
            'Nephrology early if AKI/oliguria',
            'Avoid calcium unless symptomatic hypocalcemia',
            'Recheck labs frequently',
          ],
        };
      }
      if (n === 1) {
        return {
          score: n,
          label: 'Single TLS lab abnormality',
          interpretation: 'Only 1 Cairo-Bishop lab criterion present. Not laboratory TLS yet—optimize prevention, hydrate, and recheck frequently during high-risk window.',
          riskLevel: 'moderate',
          details: [{ label: 'Criteria met', value: '1 / 4' }],
        };
      }
      return {
        score: 0,
        label: 'No laboratory TLS criteria',
        interpretation: 'No Cairo-Bishop laboratory TLS criteria selected. Continue risk-adapted prophylaxis and monitoring.',
        riskLevel: 'low',
        details: [{ label: 'Criteria met', value: '0 / 4' }],
      };
    },
    evidence: {
      summary:
        'Lab TLS: ≥2 of uric acid ≥8 mg/dL, K ≥6, phos ≥4.5 (adult), Ca ≤7 (or 25% change from baseline) within 24 h, from 3 days before to 7 days after therapy.',
      formula: 'Count of positive metabolic criteria (need ≥2)',
      validation: 'Cairo MS, Bishop M. Br J Haematol. 2004 definition widely used (Howard modification removes 25% change in some centers).',
      references: [
        {
          title: 'Tumour lysis syndrome: new therapeutic strategies and classification',
          citation: 'Cairo MS, Bishop M. Br J Haematol. 2004',
          year: 2004,
          pmid: '15384972',
          doi: '10.1111/j.1365-2141.2004.05094.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lab TLS', actions: ['Telemetry if hyperK', 'IV fluids', 'Rasburicase if high uric acid/high risk', 'Check clinical TLS criteria'] },
      { condition: 'High-risk malignancy without TLS', actions: ['Prophylaxis tier by risk', 'Baseline and serial TLS labs'] },
    ],
    pearls: [
      'Rasburicase invalidates uric acid assays if sample not handled on ice promptly.',
      'Spurious hyperkalemia from in vitro lysis can occur with extreme leukocytosis—verify with blood gas K.',
    ],
  },

  // ─── 17. Clinical TLS ─────────────────────────────────────────────────────
  {
    id: 'tumor-lysis-clinical',
    name: 'Clinical Tumor Lysis Syndrome',
    shortName: 'Clinical TLS',
    description: 'Cairo-Bishop clinical TLS: laboratory TLS plus renal, cardiac, or neurologic clinical complications.',
    category: 'oncology',
    tags: ['tls', 'clinical tls', 'aki', 'arrhythmia', 'oncology emergency'],
    whenToUse: 'When laboratory TLS is present or suspected and organ complications are being assessed.',
    whyUse: 'Clinical TLS upgrades severity and urgency—drives ICU-level monitoring and renal replacement readiness.',
    inputs: [
      yesNo('labTls', 'Laboratory TLS criteria met (≥2 metabolic abnormalities)', 1),
      yesNo('aki', 'Creatinine ≥1.5× ULN or AKI / oliguria attributed to TLS', 1),
      yesNo('cardiac', 'Cardiac arrhythmia, sudden death, or symptomatic cardiac involvement', 1),
      yesNo('seizure', 'Seizure, tetany, or symptomatic hypocalcemia (neuromuscular)', 1),
    ],
    calculate(values) {
      const lab = bool(values.labTls);
      const clinicalEvents =
        (bool(values.aki) ? 1 : 0) + (bool(values.cardiac) ? 1 : 0) + (bool(values.seizure) ? 1 : 0);

      if (lab && clinicalEvents >= 1) {
        return {
          score: clinicalEvents,
          label: 'Clinical TLS',
          interpretation: `Laboratory TLS plus ${clinicalEvents} clinical complication domain(s). Meets Cairo-Bishop clinical TLS. Escalate to higher-acuity care, continuous monitoring, aggressive metabolic control, and early nephrology/ICU collaboration.`,
          riskLevel: 'critical',
          details: [
            { label: 'Lab TLS', value: 'Yes' },
            { label: 'Clinical domains', value: String(clinicalEvents) },
          ],
          recommendations: [
            'ICU / step-down continuous monitoring',
            'Manage hyperkalemia emergently',
            'Prepare for RRT if refractory',
            'Hold further lytic therapy only per oncology plan',
          ],
        };
      }
      if (!lab && clinicalEvents >= 1) {
        return {
          score: clinicalEvents,
          label: 'Clinical complications without documented lab TLS',
          interpretation:
            'Organ complications selected without laboratory TLS checked. Re-evaluate labs—clinical TLS definition requires laboratory TLS plus complication. Still treat emergencies (arrhythmia, AKI) immediately.',
          riskLevel: 'high',
        };
      }
      if (lab) {
        return {
          score: 0,
          label: 'Laboratory TLS only (not clinical TLS)',
          interpretation:
            'Laboratory TLS without listed clinical complications. Monitor closely—clinical TLS can evolve rapidly.',
          riskLevel: 'high',
        };
      }
      return {
        score: 0,
        label: 'No clinical TLS',
        interpretation: 'Neither laboratory TLS nor clinical complication domains selected.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary:
        'Clinical TLS = laboratory TLS + ≥1 of: creatinine ≥1.5× ULN, cardiac arrhythmia/sudden death, or seizure. Cairo-Bishop 2004.',
      formula: 'Lab TLS AND (≥1 clinical domain)',
      validation: 'Standard oncology emergency definition paired with laboratory TLS criteria.',
      references: [
        {
          title: 'Tumour lysis syndrome: new therapeutic strategies and classification',
          citation: 'Cairo MS, Bishop M. Br J Haematol. 2004',
          year: 2004,
          pmid: '15384972',
          doi: '10.1111/j.1365-2141.2004.05094.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Clinical TLS', actions: ['Higher acuity bed', 'Serial labs q2–4h initially', 'Nephrology/ICU', 'ECG monitoring'] },
    ],
    pearls: [
      'Symptomatic hypocalcemia treatment can worsen calcium-phosphate deposition—treat carefully.',
      'Howard criteria refine lab cutoffs; clinical urgency still drives care.',
    ],
  },

  // ─── 18. Hypercalcemia of malignancy ──────────────────────────────────────
  {
    id: 'hypercalcemia-of-malignancy',
    name: 'Hypercalcemia of Malignancy Helper',
    shortName: 'HCM',
    description: 'Corrected calcium calculation with severity bands for hypercalcemia of malignancy.',
    category: 'oncology',
    tags: ['hypercalcemia', 'malignancy', 'calcium', 'corrected calcium', 'bisphosphonate'],
    whenToUse: 'Cancer patients with elevated calcium or symptoms (polyuria, confusion, constipation, dehydration).',
    whyUse: 'Severity bands guide fluids, bisphosphonates/denosumab, calcitonin, and urgency of care.',
    inputs: [
      numberInput('calcium', 'Serum total calcium', { unit: 'mg/dL', min: 5, max: 20, step: 0.1, defaultValue: 11.5 }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 1, max: 5.5, step: 0.1, defaultValue: 3.0 }),
      yesNo('symptoms', 'Symptoms of hypercalcemia present', 1),
      yesNo('neuro', 'Significant neuropsychiatric symptoms / stupor', 1),
    ],
    calculate(values) {
      const ca = num(values.calcium, 11.5);
      const alb = num(values.albumin, 3);
      const corrected = round(ca + 0.8 * (4 - alb), 2);
      const severeClinical = bool(values.neuro) || (bool(values.symptoms) && corrected >= 12);

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical';

      if (corrected < 10.5) {
        label = 'Not hypercalcemic (corrected)';
        interpretation = `Corrected Ca ${corrected} mg/dL. Not in hypercalcemia range by common cutoffs. Use ionized Ca if albumin unreliable (e.g., paraprotein).`;
        riskLevel = 'normal';
      } else if (corrected < 12) {
        label = 'Mild hypercalcemia (10.5–11.9)';
        interpretation = `Corrected Ca ${corrected} mg/dL. Mild HCM band. Hydration, hold calcium/vit D, investigate PTH vs PTHrP/osteolytic causes; treat cancer driver.`;
        riskLevel = 'moderate';
      } else if (corrected < 14) {
        label = 'Moderate hypercalcemia (12–13.9)';
        interpretation = `Corrected Ca ${corrected} mg/dL. Moderate HCM. IV saline (if OK), typically bone antiresorptive therapy (zoledronic acid/denosumab), consider calcitonin for faster drop if symptomatic.`;
        riskLevel = 'high';
      } else {
        label = 'Severe hypercalcemia (≥14)';
        interpretation = `Corrected Ca ${corrected} mg/dL. Severe HCM — oncologic emergency. Aggressive IV fluids, calcitonin + IV bisphosphonate or denosumab, telemetry, ICU as needed.`;
        riskLevel = 'critical';
      }

      if (severeClinical && corrected >= 10.5 && riskLevel !== 'critical') {
        interpretation += ' Significant symptoms upgrade clinical urgency despite numeric band.';
        if (riskLevel === 'moderate') riskLevel = 'high';
      }

      return {
        score: corrected,
        unit: 'mg/dL corrected',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Measured Ca', value: `${ca} mg/dL` },
          { label: 'Albumin', value: `${alb} g/dL` },
          { label: 'Corrected Ca', value: `${corrected} mg/dL` },
        ],
      };
    },
    evidence: {
      summary:
        'Corrected Ca (mg/dL) ≈ measured Ca + 0.8×(4 − albumin). Mild <12, moderate 12–14, severe ≥14 mg/dL commonly used for HCM urgency.',
      formula: 'Corrected Ca = Ca + 0.8 × (4 − albumin)',
      validation: 'Standard teaching correction; ionized calcium preferred when available.',
      references: [
        {
          title: 'Hypercalcemia of malignancy: an update on pathogenesis and management',
          citation: 'Zagzag J et al. / classic HCM management reviews; ASCO educational materials',
          year: 2018,
          pmid: '30240520',
          doi: '10.3322/caac.21489',
        },
      ],
    },
    nextSteps: [
      { condition: 'Corrected ≥12 or symptomatic', actions: ['IV NS', 'Antiresorptive therapy', 'Hold thiazides/calcium', 'PTHrP/PTH/SPEP as indicated'] },
      { condition: '≥14 or neuro symptoms', actions: ['Higher acuity care', 'Calcitonin bridge', 'Urgent oncology'] },
    ],
    pearls: [
      'Zoledronic acid needs renal adjustment; denosumab if CrCl low.',
      'Milk-alkali and granulomatous disease are non-malignant mimics.',
    ],
  },

  // ─── 19. MSCC red flags ───────────────────────────────────────────────────
  {
    id: 'spinal-cord-compression',
    name: 'MSCC Clinical Red Flags Checklist',
    shortName: 'MSCC flags',
    description: 'Malignant spinal cord compression clinical red-flag checklist for urgent imaging triage.',
    category: 'oncology',
    tags: ['mscc', 'spinal cord', 'metastasis', 'back pain', 'oncologic emergency'],
    whenToUse: 'Cancer patients with new/worsening back pain, radiculopathy, or neurologic deficits.',
    whyUse: 'Delays in MRI and steroids/RT/surgery worsen permanent paralysis risk—checklist prioritizes urgency.',
    inputs: [
      yesNo('cancerHistory', 'Known cancer or strong suspicion of malignancy', 1),
      yesNo('backPain', 'New or progressive back/neck pain', 1),
      yesNo('nightPain', 'Nocturnal or recumbency pain', 1),
      yesNo('radicular', 'Radicular pain / band-like torso pain', 1),
      yesNo('weakness', 'Limb weakness', 3),
      yesNo('sensory', 'Sensory level or progressive sensory loss', 2),
      yesNo('bowelBladder', 'Bowel/bladder dysfunction or saddle anesthesia', 3),
      yesNo('ataxia', 'Ataxia / proprioceptive loss', 2),
      yesNo('escalatingOpioids', 'Rapidly escalating analgesic needs for spine pain', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.cancerHistory) ? 1 : 0) +
        (bool(values.backPain) ? 1 : 0) +
        (bool(values.nightPain) ? 1 : 0) +
        (bool(values.radicular) ? 1 : 0) +
        (bool(values.weakness) ? 3 : 0) +
        (bool(values.sensory) ? 2 : 0) +
        (bool(values.bowelBladder) ? 3 : 0) +
        (bool(values.ataxia) ? 2 : 0) +
        (bool(values.escalatingOpioids) ? 1 : 0);

      const neuroDeficit =
        bool(values.weakness) || bool(values.sensory) || bool(values.bowelBladder) || bool(values.ataxia);

      if (neuroDeficit) {
        return {
          score,
          label: 'Neurologic deficit — emergency MSCC pathway',
          interpretation: `Red-flag points ${score}. Neurologic deficits with cancer-associated spine symptoms require emergency whole-spine MRI (unless contraindicated), dexamethasone per protocol (after glucose considerations), and immediate spine/radiation oncology consultation. Do not wait for daytime elective imaging.`,
          riskLevel: 'critical',
          recommendations: [
            'Urgent MRI whole spine',
            'Dexamethasone per institutional MSCC protocol',
            'Spine surgery + radiation oncology consult',
            'Logroll / spinal precautions as indicated',
          ],
        };
      }
      if (bool(values.cancerHistory) && (bool(values.backPain) || score >= 2)) {
        return {
          score,
          label: 'High clinical concern — urgent imaging',
          interpretation: `Red-flag points ${score}. Cancer + progressive spine pain features warrant urgent MRI (often within 24 h, sooner if evolving). Examine carefully for early deficit; low threshold for steroids if imaging delayed and suspicion high.`,
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Lower checklist concern',
        interpretation: `Red-flag points ${score}. Fewer classic MSCC features—still image if pain atypical or progressive. Mechanical back pain remains common, but cancer patients need a lower imaging threshold.`,
        riskLevel: score >= 1 ? 'moderate' : 'low',
      };
    },
    evidence: {
      summary:
        'MSCC red flags: cancer history, progressive/night pain, radicular pain, motor/sensory changes, sphincter dysfunction. MRI is gold standard; steroids + RT ± surgery are time-critical.',
      formula: 'Weighted educational red-flag checklist',
      validation: 'NICE/NCCN-style MSCC pathways and oncology emergency literature.',
      references: [
        {
          title: 'Metastatic spinal cord compression in adults (NICE guidance concepts)',
          citation: 'NICE NG / Loblaw DA et al. clinical MSCC reviews',
          year: 2005,
          pmid: '22420969',
          doi: '10.1016/j.ijrobp.2012.01.014',
        },
      ],
    },
    nextSteps: [
      { condition: 'Deficit present', actions: ['Stat MRI', 'Steroids', 'Urgent multi-D consult'] },
      { condition: 'Pain only + cancer', actions: ['Urgent outpatient/inpatient MRI', 'Safety-net for new weakness'] },
    ],
    pearls: [
      'Thoracic cord is the most common MSCC level.',
      'Normal plain films do not exclude MSCC.',
    ],
  },

  // ─── 20. SVCO syndrome ────────────────────────────────────────────────────
  {
    id: 'svco-syndrome',
    name: 'SVCO / SVC Syndrome Severity Helper',
    shortName: 'SVCO',
    description: 'Superior vena cava obstruction clinical severity helper with airway/brain urgency flags.',
    category: 'oncology',
    tags: ['svc', 'svco', 'mediastinal', 'lung cancer', 'oncologic emergency'],
    whenToUse: 'Suspected SVC syndrome (facial swelling, collaterals, dyspnea) in malignancy or catheter-related thrombosis.',
    whyUse: 'Stratifies need for airway management, steroids/RT/stent, and tissue diagnosis sequencing.',
    inputs: [
      yesNo('facialSwelling', 'Facial / neck swelling or plethora', 1),
      yesNo('armSwelling', 'Upper extremity edema', 1),
      yesNo('collaterals', 'Visible chest wall collaterals', 1),
      yesNo('dyspnea', 'Dyspnea or orthopnea', 2),
      yesNo('stridor', 'Stridor or critical airway compromise', 4),
      yesNo('laryngeal', 'Hoarseness / laryngeal edema concern', 2),
      yesNo('cerebral', 'Headache, confusion, or cerebral edema signs', 3),
      yesNo('syncope', 'Syncope or hemodynamic instability', 3),
      yesNo('knownMass', 'Known mediastinal mass / lung cancer / lymphoma', 1),
      yesNo('centralLine', 'Indwelling central venous catheter', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.facialSwelling) ? 1 : 0) +
        (bool(values.armSwelling) ? 1 : 0) +
        (bool(values.collaterals) ? 1 : 0) +
        (bool(values.dyspnea) ? 2 : 0) +
        (bool(values.stridor) ? 4 : 0) +
        (bool(values.laryngeal) ? 2 : 0) +
        (bool(values.cerebral) ? 3 : 0) +
        (bool(values.syncope) ? 3 : 0) +
        (bool(values.knownMass) ? 1 : 0) +
        (bool(values.centralLine) ? 1 : 0);

      if (bool(values.stridor) || bool(values.syncope) || bool(values.cerebral)) {
        return {
          score,
          label: 'Life-threatening SVCO features',
          interpretation: `Severity points ${score}. Airway, cerebral, or hemodynamic features = oncologic/vascular emergency. Elevate head of bed, oxygen, urgent CT with contrast (if safe), secure airway early if needed, and multidisciplinary plan (stent vs RT/chemo; steroids for steroid-responsive tumors).`,
          riskLevel: 'critical',
          recommendations: [
            'Airway assessment',
            'Urgent contrast CT chest',
            'Oncology + interventional radiology / vascular',
            'Avoid upper extremity IVs if possible',
          ],
        };
      }
      if (score >= 4) {
        return {
          score,
          label: 'Symptomatic SVCO — urgent evaluation',
          interpretation: `Severity points ${score}. Clinically significant SVC syndrome likely. Urgent imaging and cancer-directed plan; endovascular stent often provides fastest relief for severe symptoms while arranging histology if unknown primary.`,
          riskLevel: 'high',
        };
      }
      if (score >= 2) {
        return {
          score,
          label: 'Possible mild SVCO',
          interpretation: `Severity points ${score}. Features may represent early SVC obstruction—image and evaluate thrombosis vs mass. Outpatient pace only if very mild and reliable follow-up.`,
          riskLevel: 'moderate',
        };
      }
      return {
        score,
        label: 'Few SVCO features',
        interpretation: `Severity points ${score}. Limited classic findings—consider alternate causes of facial swelling.`,
        riskLevel: 'low',
      };
    },
    evidence: {
      summary:
        'SVC syndrome severity driven by airway compromise, cerebral edema, and hemodynamic effects. Imaging + etiology (malignant vs catheter thrombus) guides stent, anticoagulation, RT, or chemo.',
      formula: 'Weighted clinical severity checklist',
      validation: 'Oncologic emergency teaching frameworks for SVCO management.',
      references: [
        {
          title: 'Superior vena cava syndrome with malignant causes',
          citation: 'Wilson LD et al. N Engl J Med. 2007',
          year: 2007,
          pmid: '17476012',
          doi: '10.1056/NEJMcp067190',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severe', actions: ['ABC support', 'CT venogram/chest', 'IR stent consideration', 'Tissue diagnosis strategy'] },
      { condition: 'Catheter-related', actions: ['Anticoagulation if no contraindication', 'Line management plan'] },
    ],
    pearls: [
      'Obtain biopsy before steroids when lymphoma is possible if patient is stable.',
      'Collateral veins imply subacute course—still can decompensate.',
    ],
  },

  // ─── 21. Neutropenic colitis ──────────────────────────────────────────────
  {
    id: 'neutropenic-colitis',
    name: 'Neutropenic Colitis (Typhlitis) Risk Features',
    shortName: 'Typhlitis',
    description: 'Clinical risk-feature checklist for neutropenic enterocolitis / typhlitis.',
    category: 'oncology',
    tags: ['typhlitis', 'neutropenic colitis', 'enterocolitis', 'anc', 'abdomen'],
    whenToUse: 'Profound neutropenia with abdominal pain, fever, or diarrhea after intensive chemotherapy.',
    whyUse: 'Highlights when to obtain CT, start broad antibiotics, and involve surgery without delaying resuscitation.',
    inputs: [
      numberInput('anc', 'ANC', { unit: '/µL', min: 0, max: 2000, defaultValue: 100 }),
      yesNo('fever', 'Fever', 1),
      yesNo('rLQPain', 'Right lower quadrant or diffuse abdominal pain', 2),
      yesNo('diarrhea', 'Diarrhea (sometimes bloody)', 1),
      yesNo('distension', 'Abdominal distension / peritonitis signs', 3),
      yesNo('mucositis', 'Concurrent severe mucositis', 1),
      yesNo('hypotension', 'Sepsis / hypotension', 3),
      yesNo('ctSuggestive', 'CT with bowel wall thickening (esp. ileocecal)', 3),
      yesNo('cDiff', 'C. difficile testing pending/positive (alternate/coexist)', 1),
    ],
    calculate(values) {
      const anc = num(values.anc, 100);
      const score =
        (anc < 500 ? 2 : anc < 1000 ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.rLQPain) ? 2 : 0) +
        (bool(values.diarrhea) ? 1 : 0) +
        (bool(values.distension) ? 3 : 0) +
        (bool(values.mucositis) ? 1 : 0) +
        (bool(values.hypotension) ? 3 : 0) +
        (bool(values.ctSuggestive) ? 3 : 0);

      if (bool(values.ctSuggestive) && anc < 500 && (bool(values.fever) || bool(values.rLQPain))) {
        return {
          score,
          label: 'Features highly consistent with neutropenic colitis',
          interpretation: `Checklist points ${score}. Neutropenic enterocolitis likely. NPO, IV fluids, broad IV antibiotics including anaerobic coverage, G-CSF per oncology, serial exams; surgery for perforation/necrosis/uncontrolled bleed/unrelenting peritonitis.`,
          riskLevel: 'critical',
          recommendations: [
            'CT abdomen/pelvis if not done',
            'Blood cultures + C. diff testing',
            'Bowel rest',
            'Surgical consult for peritonitis/perforation signs',
          ],
        };
      }
      if (score >= 5 && anc < 1000) {
        return {
          score,
          label: 'High concern for typhlitis — urgent CT',
          interpretation: `Checklist points ${score} with neutropenia. Urgent abdominal imaging and empiric FN + intra-abdominal infection coverage while evaluating C. diff and other acute abdomen causes.`,
          riskLevel: 'high',
        };
      }
      if (score >= 3) {
        return {
          score,
          label: 'Intermediate concern',
          interpretation: `Checklist points ${score}. Maintain high suspicion; low threshold for CT and early antibiotics in neutropenia with abdominal symptoms.`,
          riskLevel: 'moderate',
        };
      }
      return {
        score,
        label: 'Lower checklist concern',
        interpretation: `Checklist points ${score}. Continue standard FN pathways; reassess if pain or diarrhea evolves.`,
        riskLevel: 'low',
      };
    },
    evidence: {
      summary:
        'Neutropenic colitis: fever + abdominal pain in profound neutropenia; CT shows bowel wall thickening (often ileocecal). Management is usually medical unless complications.',
      formula: 'Educational risk-feature checklist',
      validation: 'Oncology supportive care literature on typhlitis diagnosis and management.',
      references: [
        {
          title: 'Neutropenic enterocolitis',
          citation: 'Nesher L, Rolston KV. Clin Infect Dis. / classic typhlitis reviews',
          year: 2013,
          pmid: '23196957',
          doi: '10.1093/cid/cis998',
        },
      ],
    },
    nextSteps: [
      { condition: 'High concern', actions: ['CT A/P with contrast if safe', 'Broad IV abx', 'NPO', 'Surgery if complication'] },
    ],
    pearls: [
      'Avoid barium enema and endoscopy early—perforation risk.',
      'C. difficile can coexist—always test.',
    ],
  },

  // ─── 22. WHO oral mucositis ───────────────────────────────────────────────
  {
    id: 'mucositis-who',
    name: 'WHO Oral Mucositis Grade',
    shortName: 'WHO mucositis',
    description: 'World Health Organization oral mucositis grading (0–4) based on symptoms and feeding ability.',
    category: 'oncology',
    tags: ['mucositis', 'who', 'stomatitis', 'chemo', 'radiation'],
    whenToUse: 'Patients receiving stomatotoxic chemotherapy or head-and-neck radiotherapy.',
    whyUse: 'Simple functional grade guides analgesia, nutrition support, and infection precautions.',
    inputs: [
      selectInput('grade', 'Select the highest applicable description', [
        { label: 'Grade 0 — None', value: 0 },
        { label: 'Grade 1 — Soreness ± erythema', value: 1 },
        { label: 'Grade 2 — Erythema, ulcers; patient can swallow solid food', value: 2 },
        { label: 'Grade 3 — Ulcers; requires liquid diet only', value: 3 },
        { label: 'Grade 4 — Alimentation not possible (oral intake impossible)', value: 4 },
      ]),
    ],
    calculate(values) {
      const g = num(values.grade, 0);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' }> = {
        0: {
          label: 'Grade 0 — No mucositis',
          interpretation: 'No oral mucositis. Continue oral hygiene prophylaxis (soft brush, bland rinses).',
          riskLevel: 'normal',
        },
        1: {
          label: 'Grade 1 — Mild',
          interpretation: 'Soreness ± erythema without ulcers limiting solids. Topical measures, analgesia prn, reinforce hygiene; watch for progression around nadir.',
          riskLevel: 'low',
        },
        2: {
          label: 'Grade 2 — Moderate',
          interpretation: 'Ulcers present but solid diet possible. Scheduled analgesia, avoid alcohol/spice, assess thrush/HSV if atypical, maintain hydration.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Grade 3 — Severe',
          interpretation: 'Liquid diet only. Escalate opioids, consider IV fluids/nutrition support, infection surveillance; holds of therapy may be needed per oncology.',
          riskLevel: 'high',
        },
        4: {
          label: 'Grade 4 — Life-impacting',
          interpretation: 'Oral alimentation impossible. High risk for dehydration and airway issues; urgent supportive care, likely admission, parenteral nutrition consideration.',
          riskLevel: 'critical',
        },
      };
      const r = map[g] ?? map[0];
      return {
        score: g,
        unit: 'WHO grade',
        ...r,
        details: [{ label: 'WHO grade', value: String(g) }],
      };
    },
    evidence: {
      summary:
        'WHO oral mucositis: 0 none; 1 soreness±erythema; 2 ulcers, can eat solids; 3 ulcers, liquid diet; 4 alimentation impossible.',
      formula: 'Ordinal grade 0–4 from clinical descriptors',
      validation: 'WHO handbook grading used widely alongside NCI CTCAE mucositis scales.',
      references: [
        {
          title: 'WHO handbook for reporting results of cancer treatment (mucositis grading)',
          citation: 'World Health Organization. 1979 / supportive care applications',
          year: 1979,
          url: 'https://apps.who.int/iris/handle/10665/37200',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥3', actions: ['Pain service/opioids', 'Nutrition consult', 'Rule out secondary infection', 'Oncology notification'] },
      { condition: 'Any grade', actions: ['Oral care protocol', 'Avoid trauma', 'Magic mouthwash per local formulary'] },
    ],
    pearls: [
      'Neutropenic patients with mucositis have higher bacteremia risk from oral flora.',
      'CTCAE uses different wording—do not mix grade numbers across systems carelessly.',
    ],
  },

  // ─── 23. BI-RADS ──────────────────────────────────────────────────────────
  {
    id: 'breast-birads',
    name: 'BI-RADS Category Interpretation',
    shortName: 'BI-RADS',
    description: 'American College of Radiology BI-RADS assessment categories for breast imaging reports.',
    category: 'oncology',
    tags: ['birads', 'breast', 'mammography', 'ultrasound', 'mri'],
    whenToUse: 'Interpreting a BI-RADS assessment on mammogram, breast US, or MRI reports.',
    whyUse: 'Standardizes next steps from routine screening to tissue diagnosis.',
    inputs: [
      selectInput('category', 'BI-RADS category', [
        { label: '0 — Incomplete', value: 0 },
        { label: '1 — Negative', value: 1 },
        { label: '2 — Benign', value: 2 },
        { label: '3 — Probably benign', value: 3 },
        { label: '4 — Suspicious (4A/4B/4C optional detail)', value: 4 },
        { label: '5 — Highly suggestive of malignancy', value: 5 },
        { label: '6 — Known biopsy-proven malignancy', value: 6 },
      ]),
    ],
    calculate(values) {
      const c = num(values.category, 1);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'info' | 'low' | 'moderate' | 'high' | 'critical' }> = {
        0: {
          label: 'BI-RADS 0 — Incomplete',
          interpretation: 'Additional imaging or comparison to prior studies needed before final assessment. Do not assign cancer risk until complete.',
          riskLevel: 'info',
        },
        1: {
          label: 'BI-RADS 1 — Negative',
          interpretation: 'Nothing to comment on. Routine screening interval (often annual/biennial per guidelines/age/risk).',
          riskLevel: 'low',
        },
        2: {
          label: 'BI-RADS 2 — Benign',
          interpretation: 'Benign finding (e.g., cyst, known stable fibroadenoma, benign calcifications). Routine screening follow-up.',
          riskLevel: 'low',
        },
        3: {
          label: 'BI-RADS 3 — Probably benign',
          interpretation: '≤2% likelihood of malignancy. Short-interval follow-up imaging (typically 6 months) rather than immediate biopsy in appropriate cases.',
          riskLevel: 'moderate',
        },
        4: {
          label: 'BI-RADS 4 — Suspicious',
          interpretation: 'Suspicious abnormality (2–95% malignancy range across 4A–4C). Tissue diagnosis usually recommended (core biopsy).',
          riskLevel: 'high',
        },
        5: {
          label: 'BI-RADS 5 — Highly suggestive of malignancy',
          interpretation: '≥95% chance of malignancy. Biopsy required; coordinate oncology/surgery even while awaiting pathology.',
          riskLevel: 'critical',
        },
        6: {
          label: 'BI-RADS 6 — Known malignancy',
          interpretation: 'Biopsy-proven cancer on imaging for staging, treatment planning, or monitoring. Not a screening assessment.',
          riskLevel: 'high',
        },
      };
      const r = map[c] ?? map[1];
      return {
        score: c,
        unit: 'BI-RADS',
        ...r,
        details: [{ label: 'Category', value: String(c) }],
      };
    },
    evidence: {
      summary:
        'ACR BI-RADS 0–6: incomplete, negative, benign, probably benign (≤2%), suspicious, highly suggestive (≥95%), known malignancy.',
      formula: 'Category-based interpretation table',
      validation: 'ACR BI-RADS atlas standard for breast imaging communication.',
      references: [
        {
          title: 'ACR BI-RADS Atlas',
          citation: 'American College of Radiology BI-RADS',
          year: 2013,
          url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads',
        },
      ],
    },
    nextSteps: [
      { condition: '0', actions: ['Complete workup imaging', 'Obtain priors'] },
      { condition: '3', actions: ['Schedule short-interval follow-up', 'Educate on return precautions'] },
      { condition: '4–5', actions: ['Image-guided biopsy', 'Breast clinic referral'] },
    ],
    pearls: [
      'BI-RADS 4 subcategories (A/B/C) refine PPV but all usually need tissue.',
      'Clinical breast findings can override a reassuring imaging category.',
    ],
  },

  // ─── 24. Lung-RADS ────────────────────────────────────────────────────────
  {
    id: 'lung-rads',
    name: 'Lung-RADS Category Interpretation',
    shortName: 'Lung-RADS',
    description: 'ACR Lung-RADS categories for low-dose CT lung cancer screening follow-up.',
    category: 'oncology',
    tags: ['lung-rads', 'ldct', 'lung cancer screening', 'nodule'],
    whenToUse: 'Interpreting LDCT lung cancer screening reports coded with Lung-RADS.',
    whyUse: 'Links nodule category to recommended follow-up interval and management.',
    inputs: [
      selectInput('category', 'Lung-RADS category', [
        { label: '0 — Incomplete', value: 0 },
        { label: '1 — Negative', value: 1 },
        { label: '2 — Benign appearance / behavior', value: 2 },
        { label: '3 — Probably benign', value: 3 },
        { label: '4A — Suspicious', value: '4A' },
        { label: '4B — Very suspicious', value: '4B' },
        { label: '4X — Additional findings increase suspicion', value: '4X' },
        { label: 'S — Significant other finding', value: 'S' },
      ]),
    ],
    calculate(values) {
      const c = String(values.category ?? '1');
      const map: Record<string, { score: string; label: string; interpretation: string; riskLevel: 'info' | 'low' | 'moderate' | 'high' }> = {
        '0': {
          score: '0',
          label: 'Lung-RADS 0 — Incomplete',
          interpretation: 'Prior comparison needed or part of lungs not evaluated. Complete before assigning risk.',
          riskLevel: 'info',
        },
        '1': {
          score: '1',
          label: 'Lung-RADS 1 — Negative',
          interpretation: 'No nodules or definitely benign. Continue annual LDCT screening if still eligible.',
          riskLevel: 'low',
        },
        '2': {
          score: '2',
          label: 'Lung-RADS 2 — Benign appearance',
          interpretation: 'Nodules meeting benign size/behavior criteria. Estimated cancer risk <1%. Annual screening LDCT.',
          riskLevel: 'low',
        },
        '3': {
          score: '3',
          label: 'Lung-RADS 3 — Probably benign',
          interpretation: 'Probably benign (risk ~1–2%). Typically 6-month LDCT follow-up.',
          riskLevel: 'moderate',
        },
        '4A': {
          score: '4A',
          label: 'Lung-RADS 4A — Suspicious',
          interpretation: 'Suspicious (risk ~5–15%). Often 3-month LDCT; PET/CT may be considered depending on size/features per ACR table.',
          riskLevel: 'high',
        },
        '4B': {
          score: '4B',
          label: 'Lung-RADS 4B — Very suspicious',
          interpretation: 'Very suspicious (higher risk). Chest CT ± PET and/or tissue sampling depending on quantitation and multidisciplinary review.',
          riskLevel: 'high',
        },
        '4X': {
          score: '4X',
          label: 'Lung-RADS 4X — Upgrade by additional features',
          interpretation: 'Category 3 or 4 nodules upgraded by concerning imaging features (e.g., spiculation). Manage as highly suspicious with specialty input.',
          riskLevel: 'high',
        },
        S: {
          score: 'S',
          label: 'Lung-RADS S — Clinically significant other finding',
          interpretation: 'Modifier for significant non-lung-cancer findings (e.g., large AAA, mass elsewhere). Address the other finding while continuing nodule plan.',
          riskLevel: 'moderate',
        },
      };
      const r = map[c] ?? map['1'];
      return {
        score: r.score,
        unit: 'Lung-RADS',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [{ label: 'Category', value: c }],
      };
    },
    evidence: {
      summary:
        'Lung-RADS structures LDCT screening: 1–2 annual f/u, 3 ≈6-month f/u, 4A/4B/4X escalating suspicion with shorter f/u or PET/biopsy pathways.',
      formula: 'Category lookup per ACR Lung-RADS',
      validation: 'ACR Lung-RADS; used in US lung cancer screening programs.',
      references: [
        {
          title: 'Lung-RADS Version guidance (American College of Radiology)',
          citation: 'American College of Radiology Lung-RADS',
          year: 2022,
          url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Lung-Rads',
        },
      ],
    },
    nextSteps: [
      { condition: '3', actions: ['Schedule ~6-month LDCT', 'Smoking cessation'] },
      { condition: '4A/4B/4X', actions: ['Pulmonary/nodule clinic', 'Consider PET or biopsy per size/features'] },
    ],
    pearls: [
      'Growth on comparison is more concerning than a single measurement.',
      'Lung-RADS applies to screening LDCT—not identical to Fleischner incidental nodule guidelines.',
    ],
  },

  // ─── 25. LI-RADS ──────────────────────────────────────────────────────────
  {
    id: 'li-rads',
    name: 'LI-RADS Category Interpretation',
    shortName: 'LI-RADS',
    description: 'CT/MRI LI-RADS observation categories for hepatocellular carcinoma risk in at-risk patients.',
    category: 'oncology',
    tags: ['li-rads', 'hcc', 'cirrhosis', 'liver', 'imaging'],
    whenToUse: 'Patients at risk for HCC (cirrhosis, chronic HBV, etc.) with multiphase liver CT/MRI LI-RADS categories.',
    whyUse: 'Standardizes probability of HCC and next management steps without always needing biopsy.',
    inputs: [
      selectInput('category', 'LI-RADS category', [
        { label: 'LR-1 — Definitely benign', value: 'LR-1' },
        { label: 'LR-2 — Probably benign', value: 'LR-2' },
        { label: 'LR-3 — Intermediate probability', value: 'LR-3' },
        { label: 'LR-4 — Probably HCC', value: 'LR-4' },
        { label: 'LR-5 — Definitely HCC', value: 'LR-5' },
        { label: 'LR-M — Probably or definitely malignant, not specific for HCC', value: 'LR-M' },
        { label: 'LR-TIV — Tumor in vein', value: 'LR-TIV' },
        { label: 'LR-NC — Non-categorizable', value: 'LR-NC' },
        { label: 'LR-TR categories (treated observation)', value: 'LR-TR' },
      ]),
    ],
    calculate(values) {
      const c = String(values.category ?? 'LR-3');
      const map: Record<string, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }> = {
        'LR-1': {
          label: 'LR-1 — Definitely benign',
          interpretation: 'Definitely benign observation. Continue routine surveillance per risk (often US ± AFP every 6 months).',
          riskLevel: 'low',
        },
        'LR-2': {
          label: 'LR-2 — Probably benign',
          interpretation: 'Probably benign. Usually return to routine surveillance; optional short-term follow-up in selected cases.',
          riskLevel: 'low',
        },
        'LR-3': {
          label: 'LR-3 — Intermediate probability',
          interpretation: 'Intermediate probability of HCC. Multidisciplinary discussion; often short-interval follow-up imaging rather than immediate treatment.',
          riskLevel: 'moderate',
        },
        'LR-4': {
          label: 'LR-4 — Probably HCC',
          interpretation: 'Probably HCC. Multidisciplinary liver tumor board; may proceed to treatment or biopsy depending on size, AFP, transplant status, and certainty needs.',
          riskLevel: 'high',
        },
        'LR-5': {
          label: 'LR-5 — Definitely HCC',
          interpretation: 'Imaging-definite HCC in at-risk patient—biopsy often unnecessary for diagnosis. Stage and treat via tumor board (resection, ablation, transplant, embolization, systemic).',
          riskLevel: 'high',
        },
        'LR-M': {
          label: 'LR-M — Malignant, not HCC-specific',
          interpretation: 'Malignant features not specific for HCC (e.g., consider ICC, metastasis). Usually needs biopsy or alternative workup before HCC-directed therapy.',
          riskLevel: 'high',
        },
        'LR-TIV': {
          label: 'LR-TIV — Tumor in vein',
          interpretation: 'Macrovascular invasion pattern. Advanced disease pathway; confirm etiology (HCC vs non-HCC) and systemic/locoregional options via tumor board.',
          riskLevel: 'critical',
        },
        'LR-NC': {
          label: 'LR-NC — Non-categorizable',
          interpretation: 'Technical limitations prevent categorization. Repeat adequate multiphase exam.',
          riskLevel: 'info',
        },
        'LR-TR': {
          label: 'LR-TR — Treated observation',
          interpretation: 'Use LI-RADS Treatment Response algorithm (viable vs nonviable). Compare to pretreatment and assess enhancement nodularity.',
          riskLevel: 'info',
        },
      };
      const r = map[c] ?? map['LR-3'];
      return {
        score: c,
        unit: 'LI-RADS',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [{ label: 'Category', value: c }],
      };
    },
    evidence: {
      summary:
        'LI-RADS CT/MRI: LR-1/2 benign, LR-3 intermediate, LR-4 probably HCC, LR-5 definite HCC, LR-M other malignancy, LR-TIV tumor in vein. Applies to high-risk populations only.',
      formula: 'Category interpretation table',
      validation: 'ACR LI-RADS; widely used in HCC diagnostic algorithms (AASLD).',
      references: [
        {
          title: 'LI-RADS CT/MRI Manual (American College of Radiology)',
          citation: 'American College of Radiology LI-RADS',
          year: 2018,
          url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS',
        },
      ],
    },
    nextSteps: [
      { condition: 'LR-3', actions: ['Short-interval multiphase imaging', 'Hepatology follow-up'] },
      { condition: 'LR-4/5', actions: ['Liver tumor board', 'AFP / staging chest imaging', 'Transplant evaluation if candidate'] },
      { condition: 'LR-M', actions: ['Consider biopsy', 'Broader malignancy workup'] },
    ],
    pearls: [
      'LI-RADS is for high-risk livers—not for average-risk incidental liver lesions.',
      'LR-5 allows noninvasive HCC diagnosis only in the proper risk population with adequate technique.',
    ],
  },
];
