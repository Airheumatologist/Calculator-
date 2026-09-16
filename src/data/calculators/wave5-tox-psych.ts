import type { Calculator } from '../../types/calculator';
import { num, bool, round, clamp, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

const questionnaireMetadata = { questionnaire: true as const };

export const wave5ToxPsychCalcs: Calculator[] = [
  // ─── 1. Acetaminophen acute toxic dose ─────────────────────────────────────
  {
    id: 'acetaminophen-dose-toxicity',
    name: 'Acetaminophen Acute Toxic Dose',
    shortName: 'APAP mg/kg',
    description:
      'Estimates acute single-ingestion acetaminophen dose in mg/kg and educational toxicity risk thresholds.',
    category: 'toxicology',
    tags: ['acetaminophen', 'paracetamol', 'apap', 'overdose', 'toxic dose'],
    whenToUse: 'Known or estimated acute single APAP ingestion when weight is available; before or alongside Rumack–Matthew timing.',
    whyUse: 'Rapid triage of whether reported dose may warrant levels, NAC consideration, and toxicology referral.',
    inputs: [
      numberInput('dose_mg', 'Ingested dose (total)', {
        unit: 'mg',
        min: 0,
        max: 100000,
        defaultValue: 10000,
        helpText: 'Sum all APAP sources; convert g→mg (1 g = 1000 mg)',
      }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 3, max: 250, step: 0.1, defaultValue: 70 }),
      selectInput('age_group', 'Age group (threshold frame)', [
        { label: 'Adult / adolescent', value: 'adult' },
        { label: 'Child (<6 y often higher mg/kg tolerance classically)', value: 'child' },
      ]),
    ],
    calculate(values) {
      const dose = num(values.dose_mg, 10000);
      const wt = Math.max(num(values.weight, 70), 0.1);
      const mgkg = round(dose / wt, 1);
      const grams = round(dose / 1000, 2);
      const child = String(values.age_group ?? 'adult') === 'child';
      // Common teaching: adult concern ≥150 mg/kg (or ≥7.5–10 g); child often ≥150–200 mg/kg
      const concern = 150;
      let r = riskFromThresholds(mgkg, [
        {
          max: 99,
          level: 'low',
          label: 'Below common toxic threshold',
          interpretation: `≈${mgkg} mg/kg. Below classic acute toxic dose (~150 mg/kg). Still obtain history of staggered dosing, co-ingestants, and consider level if timing uncertain or unreliable history.`,
        },
        {
          max: 149,
          level: 'moderate',
          label: 'Near toxic threshold',
          interpretation: `≈${mgkg} mg/kg. Approaching educational toxic dose (~150 mg/kg acute single ingestion). Plot 4-hour (or later) level on Rumack–Matthew; low threshold for NAC if level delayed/unavailable and dose concerning.`,
        },
        {
          max: 199,
          level: 'high',
          label: 'Likely toxic dose range',
          interpretation: `≈${mgkg} mg/kg. In or above common acute toxic dose band (≥150 mg/kg; many use ≥7.5–10 g absolute in adults). Check APAP level at ≥4 h post-ingestion; start NAC if level above treatment line or if level not timely available with high suspicion.`,
        },
        {
          max: 10000,
          level: 'critical',
          label: 'High / massive ingestion risk',
          interpretation: `≈${mgkg} mg/kg. High-risk acute ingestion. Urgent APAP level, LFTs, coagulation; early NAC; discuss massive OD pathways (higher NAC, HD criteria) with poison control.`,
        },
      ]);
      if (!child && wt >= 50 && grams >= 10 && r.riskLevel === 'low') {
        r = {
          riskLevel: 'moderate',
          label: 'Adult absolute-dose concern (≥10 g)',
          interpretation: `≈${mgkg} mg/kg (${grams} g total). Adult acute ingestions ≥10 g warrant NAC consideration and Rumack–Matthew plotting regardless of mg/kg. Obtain timed APAP level; start NAC if the level is above the treatment line or delayed/unavailable.`,
        };
      }
      return {
        score: mgkg,
        unit: 'mg/kg',
        ...r,
        details: [
          { label: 'Total dose', value: `${dose} mg (${round(dose / 1000, 2)} g)` },
          { label: 'Weight', value: `${wt} kg` },
          { label: 'Common acute toxic threshold', value: `≥${concern} mg/kg (single ingestion teaching)` },
          { label: 'Adult absolute concern (often)', value: '≥7.5–10 g total' },
          { label: 'Age frame', value: child ? 'Child' : 'Adult/adolescent' },
        ],
        recommendations: [
          'Time of ingestion critical for Rumack–Matthew',
          'Contact poison control for complex / staggered / unknown time',
          'NAC is highly effective when started early',
        ],
      };
    },
    evidence: {
      summary:
        'Acute single-ingestion acetaminophen toxicity is often taught at ≥150 mg/kg (or ≥7.5–10 g in adults). Treatment decisions use timed serum APAP on the Rumack–Matthew nomogram plus clinical/lab context.',
      formula: 'mg/kg = total APAP (mg) ÷ weight (kg)',
      validation: 'Educational threshold only; staggered and repeated supratherapeutic ingestions need different pathways (e.g., NAC if above treatment thresholds or abnormal LFTs).',
      references: [
        {
          title: 'Acetaminophen poisoning and the Rumack–Matthew nomogram',
          citation: 'Rumack BH, Matthew H. Pediatrics. 1975; subsequent APAP guideline updates',
          year: 1975,
          pmid: '1134886',
        },
      ],
    },
    nextSteps: [
      {
        condition: '≥150 mg/kg or ≥7.5–10 g adult / uncertain history',
        actions: ['Serum APAP at ≥4 h (or on arrival if later)', 'LFTs, INR, chemistry', 'Start NAC if indicated', 'Poison control'],
      },
      {
        condition: 'Staggered / unknown time',
        actions: ['Do not rely on single mg/kg alone', 'Check level + LFTs', 'Low threshold for NAC'],
      },
    ],
    pearls: [
      'Combination products (opioids, cold meds) hide APAP — add all sources.',
      'Below-threshold history with rising LFTs still needs full workup.',
    ],
  },

  // ─── 2. Ibuprofen toxicity bands ───────────────────────────────────────────
  {
    id: 'ibuprofen-toxicity',
    name: 'Ibuprofen Toxicity Dose Bands',
    shortName: 'Ibuprofen Tox',
    description: 'Educational acute ibuprofen mg/kg dose bands for GI/CNS/metabolic toxicity risk.',
    category: 'toxicology',
    tags: ['ibuprofen', 'nsaid', 'overdose', 'toxic dose'],
    whenToUse: 'Acute ibuprofen overdose with estimated dose and weight (bands are ibuprofen-specific, not all NSAIDs).',
    whyUse: 'Most single acute ibuprofen ODs are mild; bands help disposition and need for labs/observation.',
    inputs: [
      numberInput('dose_mg', 'Ingested ibuprofen dose', { unit: 'mg', min: 0, max: 100000, defaultValue: 6000 }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 5, max: 250, step: 0.1, defaultValue: 70 }),
    ],
    calculate(values) {
      const dose = num(values.dose_mg, 6000);
      const wt = Math.max(num(values.weight, 70), 0.1);
      const mgkg = round(dose / wt, 1);
      // Teaching: <100 mg/kg usually asymptomatic; 100–300 mild–mod; >400 more severe risk
      const r = riskFromThresholds(mgkg, [
        {
          max: 99,
          level: 'low',
          label: 'Usually asymptomatic range',
          interpretation: `≈${mgkg} mg/kg. Acute doses <100 mg/kg are usually asymptomatic. Supportive care; home observation may be appropriate if reliable and asymptomatic after short ED observation per local protocol.`,
        },
        {
          max: 199,
          level: 'moderate',
          label: 'Mild toxicity risk',
          interpretation: `≈${mgkg} mg/kg. Mild toxicity possible (nausea, abdominal pain, mild drowsiness). Observe; symptomatic care; consider labs if symptomatic or large absolute dose.`,
        },
        {
          max: 399,
          level: 'high',
          label: 'Moderate toxicity risk',
          interpretation: `≈${mgkg} mg/kg. Moderate toxicity range — GI symptoms, drowsiness, possible metabolic acidosis, renal injury. Longer observation, chemistry, ABG/VBG if ill-appearing.`,
        },
        {
          max: 10000,
          level: 'critical',
          label: 'Severe toxicity risk',
          interpretation: `≈${mgkg} mg/kg (≥400 mg/kg classically associated with more severe effects). Risk of coma, seizures, severe acidosis, multi-organ injury — ICU-capable monitoring; aggressive supportive care; poison control.`,
        },
      ]);
      return {
        score: mgkg,
        unit: 'mg/kg',
        ...r,
        details: [
          { label: 'Total dose', value: `${dose} mg` },
          { label: 'Weight', value: `${wt} kg` },
          { label: 'Common bands', value: '<100 mild; 100–400 increasing; ≥400 severe risk' },
        ],
      };
    },
    evidence: {
      summary:
        'Acute ibuprofen toxicity risk rises with mg/kg dose. <100 mg/kg usually asymptomatic; severe toxicity more often discussed ≥400 mg/kg. No specific antidote — supportive care.',
      formula: 'mg/kg = dose (mg) ÷ weight (kg)',
      validation: 'Educational bands from toxicology references; individual response varies (co-ingestants, renal disease).',
      references: [
        {
          title: 'Ibuprofen overdose',
          citation: 'Hall AH et al. / poison center reviews; standard toxicology texts',
          year: 1986,
          pmid: '3777588',
          doi: '10.1016/s0196-0644(86)80617-5',
        },
      ],
    },
    nextSteps: [
      { condition: '≥200–400 mg/kg or symptomatic', actions: ['Chemistry, VBG if ill', 'Observation', 'Antiemetics', 'Poison control'] },
      { condition: 'Seizure / severe acidosis / coma', actions: ['Airway', 'ICU', 'Supportive care', 'Consider other co-ingestants'] },
    ],
    pearls: [
      'Unlike APAP, no nomogram — clinical + dose estimate guide care.',
      'Chronic NSAID toxicity (GI bleed, AKI) is a different pathway.',
    ],
  },

  // ─── 3. Iron toxicity elemental dose ───────────────────────────────────────
  {
    id: 'iron-toxicity',
    name: 'Elemental Iron Toxic Dose',
    shortName: 'Iron Tox',
    description: 'Converts iron salt dose to elemental iron mg/kg and educational toxicity bands.',
    category: 'toxicology',
    tags: ['iron', 'elemental iron', 'overdose', 'deferoxamine'],
    whenToUse: 'Acute iron tablet/ingestion overdose when salt type and dose are known or estimated.',
    whyUse: 'Toxicity tracks elemental iron (mg/kg), not tablet strength alone; guides labs and antidote consideration.',
    inputs: [
      numberInput('dose_mg', 'Amount of iron salt ingested', {
        unit: 'mg',
        min: 0,
        max: 50000,
        defaultValue: 3000,
        helpText: 'Total mg of the salt product (not already elemental unless selected)',
      }),
      selectInput('salt', 'Iron preparation (% elemental)', [
        { label: 'Ferrous fumarate (~33% elemental)', value: 0.33 },
        { label: 'Ferrous sulfate (~20% elemental)', value: 0.2 },
        { label: 'Ferrous gluconate (~12% elemental)', value: 0.12 },
        { label: 'Already elemental iron / carbonyl / known elemental mg', value: 1 },
      ]),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 5, max: 200, step: 0.1, defaultValue: 20 }),
    ],
    calculate(values) {
      const saltMg = num(values.dose_mg, 3000);
      const frac = num(values.salt, 0.2);
      const wt = Math.max(num(values.weight, 20), 0.1);
      const elemental = round(saltMg * frac, 0);
      const mgkg = round(elemental / wt, 1);
      const r = riskFromThresholds(mgkg, [
        {
          max: 19,
          level: 'low',
          label: 'Minimal toxicity expected',
          interpretation: `≈${mgkg} mg/kg elemental iron (total elemental ≈${elemental} mg). <20 mg/kg usually well tolerated. Confirm product and count; observe if uncertain history.`,
        },
        {
          max: 39,
          level: 'moderate',
          label: 'Mild–moderate risk',
          interpretation: `≈${mgkg} mg/kg elemental. 20–40 mg/kg may cause GI symptoms. Observe; consider serum iron level (peak often 2–6 h); supportive care.`,
        },
        {
          max: 59,
          level: 'high',
          label: 'Serious toxicity risk',
          interpretation: `≈${mgkg} mg/kg elemental. ≥40–60 mg/kg associated with systemic toxicity risk. Serial exams, iron level, chemistries, ABG; early poison control; prepare for chelation if severe.`,
        },
        {
          max: 10000,
          level: 'critical',
          label: 'Potentially lethal range',
          interpretation: `≈${mgkg} mg/kg elemental (≥60 mg/kg classically high risk; ≥120 mg/kg often cited as potentially lethal). Aggressive management; consider deferoxamine for severe systemic toxicity / shock / peak iron often >500 µg/dL context.`,
        },
      ]);
      return {
        score: mgkg,
        unit: 'mg/kg elemental',
        ...r,
        details: [
          { label: 'Salt dose', value: `${saltMg} mg` },
          { label: 'Elemental fraction', value: `${round(frac * 100, 0)}%` },
          { label: 'Elemental total', value: `${elemental} mg` },
          { label: 'Weight', value: `${wt} kg` },
        ],
      };
    },
    evidence: {
      summary:
        'Toxicity relates to elemental iron: often <20 mg/kg minimal; ≥40–60 mg/kg serious; very high doses potentially lethal. Ferrous sulfate ~20%, fumarate ~33%, gluconate ~12% elemental.',
      formula: 'Elemental mg = salt mg × fraction; mg/kg = elemental ÷ weight',
      validation: 'Educational conversion; children’s multivitamins with iron may still cause significant OD.',
      references: [
        {
          title: 'Iron poisoning: a literature-based review of epidemiology, diagnosis, and management',
          citation: 'Chang TP, Rangan C. Pediatr Emerg Care. 2011',
          year: 2011,
          pmid: '21975503',
          doi: '10.1097/PEC.0b013e3182302604',
        },
      ],
    },
    nextSteps: [
      {
        condition: '≥40 mg/kg elemental or symptomatic',
        actions: ['Serum iron (timed)', 'ABG, lactate, glucose, chem', 'Abdominal XR if tablets radio-opaque', 'Poison control', 'Consider deferoxamine if severe'],
      },
    ],
    pearls: [
      'Phases of iron OD: GI → latent → shock/acidosis → hepatic → late strictures.',
      'Vin-rose urine with deferoxamine is classic but not required to treat.',
    ],
  },

  // ─── 4. Lithium level interpretation ───────────────────────────────────────
  {
    id: 'lithium-level',
    name: 'Lithium Level Interpretation',
    shortName: 'Lithium',
    description: 'Interprets serum lithium with acute vs chronic (or acute-on-chronic) context and clinical severity modifiers.',
    category: 'toxicology',
    tags: ['lithium', 'level', 'toxicity', 'psychiatry', 'overdose'],
    whenToUse: 'Known lithium concentration with suspected toxicity or therapeutic drug monitoring concern.',
    whyUse: 'Chronic toxicity is severe at lower levels than acute overdose; clinical neurotoxicity drives dialysis decisions.',
    inputs: [
      numberInput('level', 'Serum lithium', { unit: 'mEq/L', min: 0, max: 10, step: 0.1, defaultValue: 1.8 }),
      selectInput('context', 'Context', [
        { label: 'Acute overdose (not on lithium chronically)', value: 'acute', description: 'Single acute ingestion in a patient not taking lithium chronically' },
        { label: 'Chronic / therapeutic use toxicity', value: 'chronic', description: 'On maintenance lithium; toxicity from accumulation, dehydration, or interacting drugs' },
        { label: 'Acute-on-chronic', value: 'aoc', description: 'Acute extra ingestion on top of chronic lithium use' },
      ], undefined, 'Chronic and acute-on-chronic toxicity are more dangerous at a given level than naive acute OD. Draw a trough for TDM; OD needs serial levels.'),
      yesNo('neuro', 'Significant neurotoxicity (AMS, severe tremor, myoclonus, seizure)', 0),
      yesNo('renal', 'AKI / impaired lithium clearance', 0),
    ],
    calculate(values) {
      const level = num(values.level, 1.8);
      const ctx = String(values.context ?? 'chronic');
      const neuro = bool(values.neuro);
      const renal = bool(values.renal);

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' | 'info';

      if (level < 0.6) {
        label = 'Below usual therapeutic range';
        interpretation = `Level ${level} mEq/L is below common maintenance targets (~0.6–1.2 mEq/L for bipolar maintenance; acute mania sometimes higher). Assess adherence, timing of draw (trough), and clinical status.`;
        riskLevel = 'info';
      } else if (level <= 1.2) {
        label = 'Therapeutic range (typical maintenance)';
        interpretation = `Level ${level} mEq/L is within common therapeutic trough range. Toxicity can still occur (especially elderly, dehydration, AKI, drug interactions) — treat the patient, not only the number.`;
        riskLevel = 'normal';
      } else if (level <= 1.5) {
        label = 'Upper therapeutic / mild toxicity band';
        interpretation = `Level ${level} mEq/L — often mild toxicity range. Look for tremor, nausea, diarrhea, ataxia. Hold lithium; fluids; check renal function and interacting drugs (NSAIDs, ACEi/ARB, thiazides).`;
        riskLevel = 'moderate';
      } else if (level <= 2.5) {
        label = 'Moderate toxicity range';
        interpretation = `Level ${level} mEq/L — moderate toxicity band. Serial levels, volume resuscitation if appropriate, neurology exam, chemistry. Consider nephrology early if neurotoxicity or rising level.`;
        riskLevel = 'high';
      } else {
        label = 'Severe level range';
        interpretation = `Level ${level} mEq/L — severe concentration range. High likelihood of need for extracorporeal removal especially with neurotoxicity or chronic/acute-on-chronic context.`;
        riskLevel = 'critical';
      }

      if (ctx === 'chronic' || ctx === 'aoc') {
        if (level >= 1.5) {
          riskLevel = level >= 2.5 || neuro ? 'critical' : 'high';
          interpretation +=
            ' Chronic/acute-on-chronic toxicity: intracellular CNS lithium elevated — clinical toxicity often worse than acute OD at the same level; lower threshold for hemodialysis.';
          label += ' (chronic context)';
        } else if (neuro) {
          riskLevel = 'high';
          interpretation += ' Neurotoxicity with chronic use warrants aggressive care even near “therapeutic” levels.';
        }
      } else if (ctx === 'acute' && level < 4 && !neuro) {
        interpretation +=
          ' Acute OD: GI symptoms early; levels may be high with relatively less neurotoxicity initially — still serial levels until clearly falling.';
      }

      if (neuro) {
        riskLevel = 'critical';
        interpretation += ' Significant neurotoxicity elevates urgency — discuss HD (EXTRIP: severe neurotoxicity, levels often ≥4 acute or ≥2.5 chronic, or rising despite care).';
        label += ' + neurotoxicity';
      }
      if (renal) {
        if (riskLevel === 'moderate' || riskLevel === 'normal') riskLevel = 'high';
        interpretation += ' Impaired clearance prolongs toxicity — nephrology involvement.';
      }

      return {
        score: level,
        unit: 'mEq/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Context', value: ctx === 'aoc' ? 'Acute-on-chronic' : ctx === 'acute' ? 'Acute OD' : 'Chronic' },
          { label: 'Neurotoxicity', value: neuro ? 'Yes' : 'No' },
          { label: 'AKI / low clearance', value: renal ? 'Yes' : 'No' },
          { label: 'Typical trough target', value: '~0.6–1.2 mEq/L (indication-dependent)' },
        ],
      };
    },
    evidence: {
      summary:
        'Therapeutic lithium often 0.6–1.2 mEq/L. Toxicity risk rises >1.5; severe often >2.5. Chronic toxicity is more dangerous at a given level than acute overdose. HD decisions integrate level, trend, renal function, and neurotoxicity (EXTRIP).',
      formula: 'Interpret level + chronicity + neuro/renal status',
      validation: 'Clinical toxicology consensus; draw timing (12-h trough) matters for TDM but OD needs serial levels.',
      references: [
        {
          title: 'Extracorporeal treatment for lithium poisoning (EXTRIP)',
          citation: 'Decker BS et al. Clin J Am Soc Nephrol. 2015',
          year: 2015,
          pmid: '25583292',
          doi: '10.2215/CJN.10021014',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Toxicity suspected',
        actions: ['Hold lithium', 'IV fluids as appropriate', 'Serial levels', 'ECG, chem, TSH context', 'Stop interacting meds', 'Nephrology if severe'],
      },
      {
        condition: 'Severe neurotoxicity or very high/rising levels',
        actions: ['HD per EXTRIP/local protocol', 'ICU monitoring', 'Poison control'],
      },
    ],
    pearls: [
      'Whole-blood vs serum and units (mEq/L = mmol/L) — confirm lab.',
      'SILENT (syndrome of irreversible lithium-effectuated neurotoxicity) is a feared chronic complication.',
    ],
  },

  // ─── 5. Valproate level ────────────────────────────────────────────────────
  {
    id: 'valproate-level',
    name: 'Valproate (VPA) Level Bands',
    shortName: 'VPA Level',
    description: 'Educational interpretation of total valproic acid level for therapeutic monitoring and overdose.',
    category: 'toxicology',
    tags: ['valproate', 'valproic acid', 'vpa', 'level', 'overdose'],
    whenToUse: 'Therapeutic drug monitoring or suspected valproate toxicity/overdose.',
    whyUse: 'Levels frame toxicity risk; hyperammonemia and clinical status may be severe even when total VPA is not extreme.',
    inputs: [
      numberInput('level', 'Total serum VPA', { unit: 'µg/mL', min: 0, max: 1000, step: 1, defaultValue: 120 }),
      selectInput('context', 'Context', [
        { label: 'Therapeutic monitoring', value: 'tdm' },
        { label: 'Overdose / toxicity evaluation', value: 'od' },
      ]),
      yesNo('ams', 'Altered mental status / significant CNS depression', 0),
      yesNo('hyperNH3', 'Hyperammonemia present / suspected', 0),
    ],
    calculate(values) {
      const level = num(values.level, 120);
      const od = String(values.context ?? 'tdm') === 'od';
      const ams = bool(values.ams);
      const nh3 = bool(values.hyperNH3);

      const r = riskFromThresholds(level, [
        {
          max: 49,
          level: 'info',
          label: 'Below usual therapeutic range',
          interpretation: `VPA ${level} µg/mL is below common total therapeutic range (~50–100 µg/mL). Assess adherence, timing, free fraction issues (hypoalbuminemia), and seizure control — not dose-change by number alone.`,
        },
        {
          max: 100,
          level: 'normal',
          label: 'Therapeutic range (typical)',
          interpretation: `VPA ${level} µg/mL is within common total level target (~50–100 µg/mL). Toxicity still possible (ammonia, liver, CNS) — correlate clinically.`,
        },
        {
          max: 150,
          level: 'moderate',
          label: 'Supratherapeutic / mild toxicity band',
          interpretation: `VPA ${level} µg/mL — above usual therapeutic range. Mild toxicity (sedation, tremor, GI) possible. Hold/adjust dose; check ammonia, LFTs, CBC as indicated.`,
        },
        {
          max: 350,
          level: 'high',
          label: 'Toxic range',
          interpretation: `VPA ${level} µg/mL — toxic range commonly associated with CNS depression. Supportive care; ammonia; consider L-carnitine especially if hyperammonemia/encephalopathy; multi-dose charcoal if appropriate.`,
        },
        {
          max: 5000,
          level: 'critical',
          label: 'Severe / massive level',
          interpretation: `VPA ${level} µg/mL — severe/massive. High risk of coma, metabolic issues; discuss enhanced elimination (e.g., HD for very high levels/severe clinical features per guidance).`,
        },
      ]);

      let { riskLevel, label, interpretation } = r;
      if (ams || nh3) {
        if (riskLevel === 'normal' || riskLevel === 'info' || riskLevel === 'moderate') riskLevel = 'high';
        if (ams && (level > 150 || nh3)) riskLevel = 'critical';
        interpretation += ams ? ' AMS increases urgency regardless of modest levels.' : '';
        interpretation += nh3 ? ' Hyperammonemic encephalopathy can occur even near therapeutic total VPA — consider L-carnitine and hold VPA.' : '';
        label += ams || nh3 ? ' + clinical toxicity' : '';
      }
      if (od && level > 100 && riskLevel === 'normal') {
        riskLevel = 'moderate';
      }

      return {
        score: level,
        unit: 'µg/mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Context', value: od ? 'OD / toxicity' : 'TDM' },
          { label: 'Typical total therapeutic', value: '~50–100 µg/mL' },
          { label: 'AMS', value: ams ? 'Yes' : 'No' },
          { label: 'Hyperammonemia', value: nh3 ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Common total VPA therapeutic range ~50–100 µg/mL. Toxicity risk rises as levels exceed this; severe OD may need enhanced elimination. Hyperammonemia can cause encephalopathy independent of extreme total levels.',
      formula: 'Interpret total VPA + clinical/ammonia context',
      validation: 'Free VPA rises with hypoalbuminemia; lab units µg/mL = mg/L.',
      references: [
        {
          title: 'Valproic acid toxicity',
          citation: 'Sztajnkrycer MD. J Toxicol Clin Toxicol. 2002; EXTRIP VPA reviews',
          year: 2002,
          pmid: '12475192',
          doi: '10.1081/clt-120014645',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Toxicity / OD',
        actions: ['ABCs', 'Ammonia, LFTs, lipase, chem, CBC', 'L-carnitine if encephalopathic/hyperammonemia', 'Poison control', 'Consider HD if severe'],
      },
    ],
    pearls: [
      'Levels may continue to rise with delayed absorption (enteric-coated, bezoar).',
      'Cerebral edema is a feared severe complication of massive VPA OD.',
    ],
  },

  // ─── 6. Carbamazepine level ────────────────────────────────────────────────
  {
    id: 'carbamazepine-level',
    name: 'Carbamazepine Level Interpretation',
    shortName: 'CBZ Level',
    description: 'Educational bands for total carbamazepine concentration in TDM and overdose.',
    category: 'toxicology',
    tags: ['carbamazepine', 'tegretol', 'level', 'overdose', 'anticonvulsant'],
    whenToUse: 'Carbamazepine therapeutic monitoring or suspected toxicity/overdose.',
    whyUse: 'Levels correlate roughly with toxicity (nystagmus, ataxia, coma, seizures, Na channel effects).',
    inputs: [
      numberInput('level', 'Serum carbamazepine', { unit: 'µg/mL', min: 0, max: 100, step: 0.1, defaultValue: 14 }),
      yesNo('ams', 'Significant CNS depression / coma', 0),
      yesNo('seizure', 'Seizure / status risk features', 0),
    ],
    calculate(values) {
      const level = num(values.level, 14);
      const ams = bool(values.ams);
      const seizure = bool(values.seizure);
      const r = riskFromThresholds(level, [
        {
          max: 3.9,
          level: 'info',
          label: 'Below usual therapeutic range',
          interpretation: `CBZ ${level} µg/mL is below common total therapeutic range (~4–12 µg/mL). Correlate with seizure control, adherence, autoinduction, and interacting drugs.`,
        },
        {
          max: 12,
          level: 'normal',
          label: 'Therapeutic range (typical)',
          interpretation: `CBZ ${level} µg/mL is within common therapeutic range (~4–12 µg/mL). Mild adverse effects still possible; check sodium (SIADH risk) as indicated.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Mild–moderate toxicity band',
          interpretation: `CBZ ${level} µg/mL — often associated with nystagmus, ataxia, drowsiness. Hold drug; supportive care; serial levels (delayed absorption common).`,
        },
        {
          max: 40,
          level: 'high',
          label: 'Serious toxicity range',
          interpretation: `CBZ ${level} µg/mL — serious toxicity range (coma, seizures, anticholinergic features, cardiac Na-channel effects possible). ICU monitoring; ECG; consider multi-dose activated charcoal / enhanced elimination discussion.`,
        },
        {
          max: 500,
          level: 'critical',
          label: 'Life-threatening range',
          interpretation: `CBZ ${level} µg/mL — very high. High risk of deep coma, seizures, cardiovascular toxicity. Aggressive supportive care; poison control; consider extracorporeal removal in severe refractory cases per guidance.`,
        },
      ]);
      let { riskLevel, label, interpretation } = r;
      if (ams || seizure) {
        riskLevel = level >= 20 || ams ? 'critical' : 'high';
        interpretation += ' Clinical severity (AMS/seizures) escalates management beyond level alone.';
        label += ' + severe clinical features';
      }
      return {
        score: level,
        unit: 'µg/mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Typical therapeutic', value: '~4–12 µg/mL total' },
          { label: 'AMS', value: ams ? 'Yes' : 'No' },
          { label: 'Seizure features', value: seizure ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Therapeutic total CBZ often ~4–12 µg/mL. Toxicity increases above this; severe toxicity more common at substantially elevated levels. Active metabolite (CBZ-epoxide) may contribute.',
      formula: 'Interpret CBZ level + CNS/cardiac status',
      validation: 'Educational; free levels rarely used; ER formulations delay peak.',
      references: [
        {
          title: 'Management of carbamazepine overdose',
          citation: 'Spiller HA. Pediatr Emerg Care. 2001',
          year: 2001,
          pmid: '11753195',
          doi: '10.1097/00006565-200112000-00015',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Toxic level or symptomatic',
        actions: ['ECG, chem, serial CBZ levels', 'Benzodiazepines for seizures', 'Supportive airway care', 'Poison control', 'Consider MDAC'],
      },
    ],
    pearls: [
      'Bezoars / extended-release can cause late rising levels — observe longer.',
      'Hyponatremia is a common chronic adverse effect, not only OD.',
    ],
  },

  // ─── 7. Theophylline level ─────────────────────────────────────────────────
  {
    id: 'theophylline-level',
    name: 'Theophylline Level Interpretation',
    shortName: 'Theophylline',
    description: 'Interprets serum theophylline for therapeutic range and acute vs chronic toxicity severity.',
    category: 'toxicology',
    tags: ['theophylline', 'methylxanthine', 'level', 'overdose'],
    whenToUse: 'Patients on theophylline/aminophylline with levels, or methylxanthine overdose.',
    whyUse: 'Narrow therapeutic index; chronic toxicity is dangerous at lower levels than acute OD.',
    inputs: [
      numberInput('level', 'Serum theophylline', { unit: 'µg/mL', min: 0, max: 200, step: 0.1, defaultValue: 28 }),
      selectInput('context', 'Context', [
        { label: 'Acute overdose', value: 'acute' },
        { label: 'Chronic / repeated supratherapeutic', value: 'chronic' },
      ]),
      yesNo('seizure', 'Seizures', 0),
      yesNo('unstable', 'Hypotension / life-threatening dysrhythmia', 0),
    ],
    calculate(values) {
      const level = num(values.level, 28);
      const chronic = String(values.context ?? 'chronic') === 'chronic';
      const seizure = bool(values.seizure);
      const unstable = bool(values.unstable);

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' | 'info';

      if (level < 10) {
        label = 'Below usual therapeutic range';
        interpretation = `Level ${level} µg/mL is below common therapeutic range (~10–20 µg/mL). Assess indication and adherence if used for asthma/COPD (rarely first-line now).`;
        riskLevel = 'info';
      } else if (level <= 20) {
        label = 'Therapeutic range (typical)';
        interpretation = `Level ${level} µg/mL is within classic therapeutic range (~10–20 µg/mL). Mild adverse effects (nausea, tremor, tachycardia) can occur even here.`;
        riskLevel = 'normal';
      } else if (level <= 30) {
        label = 'Mild–moderate toxicity band';
        interpretation = `Level ${level} µg/mL — toxicity risk (GI, tachycardia, CNS stimulation). Hold drug; supportive care; ECG; potassium/glucose.`;
        riskLevel = 'moderate';
      } else if (level <= 60) {
        label = 'Serious toxicity range';
        interpretation = `Level ${level} µg/mL — serious toxicity risk including seizures and arrhythmias. ICU monitoring; multi-dose charcoal if appropriate; early discussion of enhanced elimination.`;
        riskLevel = 'high';
      } else {
        label = 'Life-threatening level range';
        interpretation = `Level ${level} µg/mL — life-threatening range. High risk of refractory seizures and cardiovascular collapse.`;
        riskLevel = 'critical';
      }

      if (chronic && level > 20) {
        if (level >= 40 || seizure || unstable) riskLevel = 'critical';
        else if (riskLevel === 'moderate') riskLevel = 'high';
        interpretation +=
          ' Chronic toxicity: severe effects (seizures) can occur at lower levels than acute OD — lower threshold for aggressive care/HD discussion.';
        label += ' (chronic)';
      }

      if (seizure || unstable) {
        riskLevel = 'critical';
        interpretation += ' Seizures or hemodynamic/electrical instability override numeric bands — aggressive supportive care; consider hemodialysis.';
        label += ' + severe features';
      }

      return {
        score: level,
        unit: 'µg/mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Context', value: chronic ? 'Chronic' : 'Acute' },
          { label: 'Typical therapeutic', value: '~10–20 µg/mL' },
          { label: 'Seizure', value: seizure ? 'Yes' : 'No' },
          { label: 'Unstable CV', value: unstable ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Theophylline therapeutic range classically ~10–20 µg/mL. Toxicity rises above 20; chronic toxicity can cause seizures at lower levels than acute overdose. HD effective for severe toxicity.',
      formula: 'Level + acute vs chronic + seizures/CV instability',
      validation: 'Narrow therapeutic index drug; interactions (CYP1A2) common.',
      references: [
        {
          title: 'Life-threatening events after theophylline overdose: a 10-year prospective analysis',
          citation: 'Shannon M. / EXTRIP theophylline recommendations',
          year: 1999,
          pmid: '10326941',
          doi: '10.1001/archinte.159.9.989',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Toxic level or symptomatic',
        actions: ['ECG continuous', 'Electrolytes (K+), glucose', 'Benzodiazepines for seizures', 'Antiemetics', 'Poison control', 'HD if severe'],
      },
    ],
    pearls: [
      'Hypokalemia and hyperglycemia are common metabolic findings.',
      'Beta-blockers sometimes used carefully for tachyarrhythmias in methylxanthine tox (specialist guidance).',
    ],
  },

  // ─── 8. Methotrexate toxicity (level/time educational) ─────────────────────
  {
    id: 'methotrexate-toxicity',
    name: 'Methotrexate Level–Time Helper',
    shortName: 'MTX Level',
    description:
      'Educational framing of methotrexate plasma levels at common post-dose time points (high-dose MTX rescue context).',
    category: 'toxicology',
    tags: ['methotrexate', 'mtx', 'leucovorin', 'oncology', 'toxicity'],
    whenToUse: 'High-dose methotrexate protocols with timed levels (e.g., 24/48/72 h) or delayed clearance concern.',
    whyUse: 'Elevated timed levels guide leucovorin rescue intensity and glucarpidase consideration — protocol-specific.',
    inputs: [
      numberInput('level', 'Plasma MTX level', {
        unit: 'µmol/L',
        min: 0,
        max: 1000,
        step: 0.01,
        defaultValue: 10,
        helpText: 'Confirm units with lab (µmol/L vs µmol/mL errors are catastrophic)',
      }),
      selectInput('timepoint', 'Time after start of MTX infusion', [
        { label: '24 hours', value: 24 },
        { label: '48 hours', value: 48 },
        { label: '72 hours', value: 72 },
        { label: 'Other / not standard time', value: 0 },
      ]),
      yesNo('aki', 'AKI / delayed clearance risk factors', 0),
      yesNo('third_space', 'Third-spacing / effusion / ascites', 0),
    ],
    calculate(values) {
      const level = num(values.level, 10);
      const t = num(values.timepoint, 24);
      const aki = bool(values.aki);
      const third = bool(values.third_space);

      // Common educational cutoffs (protocol-dependent): 24h >10, 48h >1, 72h >0.1 µmol/L often "high"
      let expectedCutoff = 0;
      let timeLabel = 'Nonstandard time';
      if (t === 24) {
        expectedCutoff = 10;
        timeLabel = '24 h';
      } else if (t === 48) {
        expectedCutoff = 1;
        timeLabel = '48 h';
      } else if (t === 72) {
        expectedCutoff = 0.1;
        timeLabel = '72 h';
      }

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' | 'info';

      if (t === 0) {
        label = 'Level entered — use institutional nomogram';
        interpretation = `MTX ${level} µmol/L at a nonstandard time. Compare to your oncology protocol nomogram for leucovorin titration. Ensure adequate hydration, urinary alkalinization, and hold interacting drugs (e.g., NSAIDs, PPIs in some protocols).`;
        riskLevel = 'info';
      } else if (level <= expectedCutoff) {
        label = 'At or below common high-risk cutoff (educational)';
        interpretation = `MTX ${level} µmol/L at ${timeLabel}: at/below commonly cited high level (~${expectedCutoff} µmol/L). Continue protocol leucovorin/hydration per oncology regimen; still monitor until clearance criteria met.`;
        riskLevel = 'moderate';
      } else if (level <= expectedCutoff * 10) {
        label = 'Elevated for time point';
        interpretation = `MTX ${level} µmol/L at ${timeLabel} exceeds common educational cutoff (~${expectedCutoff} µmol/L). Increased toxicity risk — escalate leucovorin per protocol, ensure alkalinization/hydration, serial levels, consider glucarpidase if criteria met (very high levels / delayed clearance / AKI).`;
        riskLevel = 'high';
      } else {
        label = 'Markedly elevated for time point';
        interpretation = `MTX ${level} µmol/L at ${timeLabel} is markedly above ~${expectedCutoff} µmol/L teaching cutoff. High risk of severe mucositis, myelosuppression, nephrotoxicity — urgent oncology/tox collaboration; glucarpidase eligibility review.`;
        riskLevel = 'critical';
      }

      if (aki || third) {
        if (riskLevel === 'moderate' || riskLevel === 'info') riskLevel = 'high';
        interpretation +=
          ' Delayed clearance risk (AKI and/or third-space fluid) — expect prolonged elevated levels and extended rescue.';
      }

      return {
        score: level,
        unit: 'µmol/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Time point', value: timeLabel },
          { label: 'Common high cutoff (teaching)', value: t === 0 ? 'Protocol-specific' : `~${expectedCutoff} µmol/L at ${timeLabel}` },
          { label: 'AKI risk', value: aki ? 'Yes' : 'No' },
          { label: 'Third-spacing', value: third ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Always follow the treating protocol nomogram — cutoffs vary',
          'Verify lab units meticulously',
          'Leucovorin is rescue, not optional in HD-MTX',
        ],
      };
    },
    evidence: {
      summary:
        'After high-dose MTX, plasma levels at 24/48/72 h guide leucovorin rescue. Educational high-risk examples often include 24 h >10, 48 h >1, 72 h >0.1 µmol/L — protocols differ. Glucarpidase for toxic levels with delayed clearance.',
      formula: 'Compare timed MTX level to protocol thresholds',
      validation: 'Educational only — institutional HD-MTX protocols supersede this helper.',
      references: [
        {
          title: 'High-dose methotrexate and glucarpidase',
          citation: 'Ramsey LB et al. / FDA glucarpidase labeling; oncology supportive care guidelines',
          year: 2018,
          pmid: '29079637',
          doi: '10.1634/theoncologist.2017-0243',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Elevated timed level',
        actions: ['Escalate leucovorin per protocol', 'IV fluids + urine alkalinization', 'Serial MTX + creatinine', 'Hold interacting drugs', 'Oncology/pharmacy'],
      },
      {
        condition: 'Toxic level + delayed clearance / AKI',
        actions: ['Review glucarpidase criteria', 'Critical care support', 'Hold leucovorin ~2 h before and after glucarpidase'],
      },
    ],
    pearls: [
      'Intrathecal MTX overdose is a different emergency (CSF drainage, glucarpidase, etc.).',
      'Low-dose weekly RA MTX OD is usually managed differently than HD-MTX.',
    ],
  },

  // ─── 9. CO-oximetry / COHb ─────────────────────────────────────────────────
  {
    id: 'co-oximetry',
    name: 'Carboxyhemoglobin Severity (COHb)',
    shortName: 'COHb',
    description: 'Interprets carboxyhemoglobin percentage with smoking status and clinical severity modifiers.',
    category: 'toxicology',
    tags: ['carbon monoxide', 'cohb', 'co-oximetry', 'smoke inhalation'],
    whenToUse: 'Known or suspected CO exposure with co-oximetry COHb result.',
    whyUse: 'COHb frames exposure magnitude; treatment (O₂ ± HBO) depends heavily on symptoms, pregnancy, and source.',
    inputs: [
      numberInput('cohb', 'Carboxyhemoglobin', { unit: '%', min: 0, max: 80, step: 0.1, defaultValue: 15 }),
      selectInput('smoker', 'Baseline smoking status', [
        { label: 'Nonsmoker', value: 'no' },
        { label: 'Smoker (higher baseline COHb)', value: 'yes' },
      ]),
      yesNo('neuro', 'Syncope, coma, seizure, or focal neuro deficit', 0),
      yesNo('cardiac', 'Chest pain, ischemia, or significant dysrhythmia', 0),
      yesNo('pregnant', 'Pregnant', 0),
    ],
    calculate(values) {
      const cohb = num(values.cohb, 15);
      const smoker = String(values.smoker ?? 'no') === 'yes';
      const neuro = bool(values.neuro);
      const cardiac = bool(values.cardiac);
      const pregnant = bool(values.pregnant);

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' | 'info';

      const mildMax = smoker ? 10 : 5;
      if (cohb <= mildMax) {
        label = smoker ? 'Near smoker baseline range' : 'Near nonsmoker baseline / low';
        interpretation = `COHb ${cohb}%. Nonsmokers often <2–3%; smokers may be 5–10%. Still treat clinically if recent exposure and symptoms — COHb falls with time/O₂.`;
        riskLevel = 'low';
      } else if (cohb < 20) {
        label = 'Mild–moderate elevation';
        interpretation = `COHb ${cohb}%. Mild–moderate elevation — headache, nausea, dizziness common. 100% oxygen; evaluate source exposure; consider ECG/troponin in at-risk patients.`;
        riskLevel = 'moderate';
      } else if (cohb < 40) {
        label = 'Significant elevation';
        interpretation = `COHb ${cohb}%. Significant exposure range. High-flow/100% O₂; hospital observation; evaluate for HBO criteria (neuro, cardiac, pregnancy, very high levels).`;
        riskLevel = 'high';
      } else {
        label = 'Life-threatening range';
        interpretation = `COHb ${cohb}%. Life-threatening range — high risk of coma and death. Immediate 100% O₂, critical care, urgent HBO discussion.`;
        riskLevel = 'critical';
      }

      if (neuro || cardiac || pregnant) {
        if (cohb >= 10 || neuro || cardiac) riskLevel = riskLevel === 'low' ? 'high' : 'critical';
        if (pregnant && cohb >= 15) riskLevel = 'critical';
        interpretation +=
          ' Clinical criteria (neuro/cardiac) or pregnancy lower the threshold for hyperbaric oxygen consideration per local toxicology/HBO protocols.';
        label += ' + high-risk features';
      }

      return {
        score: cohb,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Smoker baseline frame', value: smoker ? 'Yes' : 'No' },
          { label: 'Neuro severe features', value: neuro ? 'Yes' : 'No' },
          { label: 'Cardiac features', value: cardiac ? 'Yes' : 'No' },
          { label: 'Pregnant', value: pregnant ? 'Yes' : 'No' },
          { label: 'Half-life (approx)', value: 'Room air ~4–6 h; 100% O₂ ~1 h; HBO much shorter' },
        ],
      };
    },
    evidence: {
      summary:
        'COHb elevated in CO poisoning. Symptoms correlate imperfectly with level. 100% O₂ is first-line; HBO considered for severe neuro/cardiac toxicity, pregnancy, and selected high levels.',
      formula: 'Interpret COHb % + symptoms + pregnancy + exposure context',
      validation: 'Standard pulse oximetry cannot detect COHb — needs co-oximetry.',
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
      {
        condition: 'Any significant exposure',
        actions: ['100% O₂ via NRB', 'ECG ± troponin', 'COHb co-oximetry', 'Source investigation', 'Consider cyanide if smoke inhalation + high lactate'],
      },
      {
        condition: 'Severe features / pregnancy / very high COHb',
        actions: ['Contact HBO center / poison control', 'Do not delay O₂ for transport decisions'],
      },
    ],
    pearls: [
      'Fetal Hb binds CO more avidly — lower threshold to treat pregnancy.',
      'Delayed neuropsychiatric sequelae can occur after apparent recovery.',
    ],
  },

  // ─── 10. Methemoglobin level ───────────────────────────────────────────────
  {
    id: 'methemoglobin-level',
    name: 'Methemoglobin Severity',
    shortName: 'MetHb',
    description: 'Interprets methemoglobin percentage with symptom modifiers for methylene blue consideration.',
    category: 'toxicology',
    tags: ['methemoglobin', 'methb', 'methylene blue', 'cyanosis'],
    whenToUse: 'Suspected methemoglobinemia (cyanosis refractory to O₂, chocolate blood, drug exposures) with co-oximetry MetHb.',
    whyUse: 'Severity bands guide urgency of methylene blue and ICU care.',
    inputs: [
      numberInput('methb', 'Methemoglobin', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 25 }),
      yesNo('symptomatic', 'Symptoms (dyspnea, headache, tachycardia, AMS)', 0),
      yesNo('severe', 'Severe features (coma, seizure, ischemia, profound hypoxia symptoms)', 0),
      yesNo('g6pd', 'Known G6PD deficiency', 0),
    ],
    calculate(values) {
      const methb = num(values.methb, 25);
      const symptomatic = bool(values.symptomatic);
      const severe = bool(values.severe);
      const g6pd = bool(values.g6pd);

      const r = riskFromThresholds(methb, [
        {
          max: 2.9,
          level: 'normal',
          label: 'Normal / physiologic range',
          interpretation: `MetHb ${methb}%. Normal is usually <1–2%. If cyanosis persists, reconsider other causes (cardiac, pulmonary, sulfhemoglobin).`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Mild elevation',
          interpretation: `MetHb ${methb}%. Mild elevation — may be asymptomatic or mild symptoms (cyanosis, headache). Remove offending agent; O₂; treat if symptomatic or rising.`,
        },
        {
          max: 29,
          level: 'high',
          label: 'Moderate elevation — treat if symptomatic',
          interpretation: `MetHb ${methb}%. Often symptomatic in this range. Methylene blue typically considered for symptomatic patients (common teaching ≥20–30% or symptoms).`,
        },
        {
          max: 49,
          level: 'critical',
          label: 'Severe elevation',
          interpretation: `MetHb ${methb}%. Severe — high risk of significant tissue hypoxia. Urgent methylene blue (if not contraindicated), ICU, remove toxin source.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Life-threatening elevation',
          interpretation: `MetHb ${methb}%. Life-threatening. Immediate antidote therapy and critical care; levels >50–70% associated with high mortality if untreated.`,
        },
      ]);

      let { riskLevel, label, interpretation } = r;
      if (severe || (symptomatic && methb >= 20)) {
        riskLevel = 'critical';
        interpretation += ' Symptomatic / severe clinical features warrant methylene blue regardless of modest laboratory delay.';
        label += ' + symptomatic';
      }
      if (g6pd) {
        interpretation +=
          ' G6PD deficiency: methylene blue may be ineffective or cause hemolysis — use specialist guidance (ascorbic acid, exchange transfusion in extremes).';
        label += ' (G6PD caution)';
      }

      return {
        score: methb,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Symptoms present', value: symptomatic ? 'Yes' : 'No' },
          { label: 'Severe features', value: severe ? 'Yes' : 'No' },
          { label: 'Common MB trigger', value: 'Symptoms or MetHb often ≥20–30%' },
          { label: 'Typical MB dose (teaching)', value: '1–2 mg/kg IV over 5 min; may repeat' },
          { label: 'G6PD', value: g6pd ? 'Known / suspected' : 'Not flagged' },
        ],
      };
    },
    evidence: {
      summary:
        'Methemoglobinemia presents with cyanosis and low SpO₂ often refractory to O₂; co-oximetry quantifies MetHb. Methylene blue is first-line for significant symptomatic MetHb; caution in G6PD deficiency and SSRI co-use (serotonin risk).',
      formula: 'Interpret MetHb % + symptoms',
      validation: 'Standard pulse ox unreliable; chocolate-brown blood is classic.',
      references: [
        {
          title: 'Acquired methemoglobinemia',
          citation: 'Ash-Bernal R et al. Medicine (Baltimore). 2004',
          year: 2004,
          pmid: '15342970',
          doi: '10.1097/01.md.0000141096.00377.3f',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'MetHb elevated + symptoms or ≥20–30%',
        actions: ['Methylene blue if not contraindicated', 'Stop offending agent (nitrites, dapsone, local anesthetics, etc.)', 'ICU if severe', 'Poison control'],
      },
    ],
    pearls: [
      'Benzocaine sprays and dapsone are classic precipitants.',
      'SpO₂ often plateaus near ~85% regardless of severity.',
    ],
  },

  // ─── 11. Cyanide toxicity helper ───────────────────────────────────────────
  {
    id: 'cyanide-toxicity',
    name: 'Cyanide Toxicity Suspicion Helper',
    shortName: 'Cyanide',
    description: 'Educational suspicion helper for cyanide toxicity using exposure context, lactate, and clinical severity.',
    category: 'toxicology',
    tags: ['cyanide', 'smoke inhalation', 'lactate', 'hydroxocobalamin'],
    whenToUse: 'Smoke inhalation, industrial cyanide exposure, or unexplained lactic acidosis with shock/AMS after fire.',
    whyUse: 'Cyanide levels are rarely timely — treat on clinical suspicion; lactate supports pretest concern.',
    inputs: [
      selectInput('exposure', 'Exposure context', [
        { label: 'House fire / smoke inhalation', value: 'smoke', description: 'Closed-space fire or smoke inhalation (CO + cyanide risk)' },
        { label: 'Industrial / lab cyanide', value: 'industrial', description: 'Known or suspected cyanide salt, gas, or laboratory exposure' },
        { label: 'Unknown / other', value: 'other', description: 'No clear fire or industrial cyanide source' },
      ]),
      numberInput('lactate', 'Serum lactate', { unit: 'mmol/L', min: 0, max: 30, step: 0.1, defaultValue: 8, helpText: 'Smoke/CN teaching: lactate ≥8–10 mmol/L raises suspicion, especially with AMS or shock. Do not wait for a cyanide level.' }),
      yesNo('ams', 'Altered mental status / coma / seizure', 2),
      yesNo('shock', 'Hypotension / cardiovascular collapse', 2),
      yesNo('soot', 'Soot in airway / severe smoke exposure signs'),
    ],
    calculate(values) {
      const lactate = num(values.lactate, 8);
      const ams = bool(values.ams);
      const shock = bool(values.shock);
      const soot = bool(values.soot);
      const exposure = String(values.exposure ?? 'smoke');

      let score = 0;
      if (exposure === 'smoke' || exposure === 'industrial') score += 1;
      if (soot) score += 1;
      if (lactate >= 10) score += 3;
      else if (lactate >= 8) score += 2;
      else if (lactate >= 5) score += 1;
      if (ams) score += 2;
      if (shock) score += 2;

      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower suspicion cluster',
          interpretation: `Suspicion score ${score}. Lower aggregate concern, but do not exclude cyanide in early/evolving fire victims. Continue CO evaluation and supportive care.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate suspicion',
          interpretation: `Suspicion score ${score}. Intermediate concern for cyanide contribution (especially smoke + lactate + CNS findings). Prepare antidote; treat if clinical trajectory worsening.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High suspicion',
          interpretation: `Suspicion score ${score}. High clinical suspicion — do not wait for cyanide level. Give hydroxocobalamin (preferred in smoke inhalation) per protocol; critical care support.`,
        },
        {
          max: 20,
          level: 'critical',
          label: 'Very high suspicion / treat now',
          interpretation: `Suspicion score ${score}. Very high suspicion cluster (shock/AMS + high lactate ± smoke). Immediate antidote therapy and resuscitation.`,
        },
      ]);

      return {
        score,
        unit: 'suspicion pts',
        ...r,
        details: [
          { label: 'Lactate', value: `${lactate} mmol/L` },
          { label: 'Exposure', value: exposure },
          { label: 'AMS', value: ams ? 'Yes' : 'No' },
          { label: 'Shock', value: shock ? 'Yes' : 'No' },
          { label: 'Preferred antidote (smoke)', value: 'Hydroxocobalamin 5 g IV adult (typical)' },
        ],
      };
    },
    evidence: {
      summary:
        'Cyanide poisoning from smoke or industrial exposure causes rapid CNS and CV collapse with often markedly elevated lactate. Empiric hydroxocobalamin is preferred in smoke inhalation when cyanide is suspected.',
      formula: 'Clinical suspicion score (exposure + lactate bands + AMS/shock)',
      validation: 'Educational composite — not a validated formal score; local EMS/ED protocols vary.',
      references: [
        {
          title: 'Prospective study of hydroxocobalamin for acute cyanide poisoning in smoke inhalation',
          citation: 'Borron SW et al. Ann Emerg Med. 2007',
          year: 2007,
          pmid: '17481777',
          doi: '10.1016/j.annemergmed.2007.01.026',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High suspicion',
        actions: ['Hydroxocobalamin', '100% O₂', 'ABCs / critical care', 'COHb co-oximetry', 'Do not delay antidote for labs'],
      },
    ],
    pearls: [
      'Venous hyperoxia / bright red venous blood is classic but unreliable.',
      'Sodium thiosulfate may be adjunct; avoid nitrite kit in CO co-poisoning when possible.',
    ],
  },

  // ─── 12. Organophosphate severity / atropine start ─────────────────────────
  {
    id: 'organophosphate',
    name: 'Organophosphate Severity & Atropine Start',
    shortName: 'OP / Atropine',
    description: 'Educational cholinergic severity framing and initial atropine dosing guidance for organophosphate poisoning.',
    category: 'toxicology',
    tags: ['organophosphate', 'cholinergic', 'atropine', 'pesticide', 'nerve agent'],
    whenToUse: 'Suspected organophosphate / nerve agent poisoning with cholinergic features.',
    whyUse: 'Early aggressive atropine and oxime (when indicated) reduce secretions and bronchorrhea mortality.',
    inputs: [
      selectInput('severity', 'Clinical severity', [
        { label: 'Mild (SLUDGE features, normal mentation, mild secretions)', value: 'mild', description: 'Alert; mild salivation/lacrimation/GI symptoms; no hypoxia or weakness requiring support' },
        { label: 'Moderate (prominent secretions, wheeze, GI, weakness)', value: 'moderate', description: 'Copious secretions, wheeze/bronchorrhea, vomiting/diarrhea, or muscle weakness without respiratory failure' },
        { label: 'Severe (respiratory failure, profound bronchorrhea, coma, seizures)', value: 'severe', description: 'Need for intubation/ventilatory support, coma, seizures, or life-threatening bronchorrhea' },
      ], undefined, 'SLUDGE = salivation, lacrimation, urination, defecation, GI upset, emesis. Also DUMBBELS (diarrhea, urination, miosis, bronchorrhea/bradycardia/bronchospasm, emesis, lacrimation, salivation). Titrate atropine to dry secretions, not HR alone.'),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 5, max: 200, step: 0.1, defaultValue: 70 }),
      yesNo('bronchorrhea', 'Significant bronchorrhea / hypoxia from secretions', null),
      yesNo('bradycardia', 'Symptomatic bradycardia / AV block', 0),
    ],
    calculate(values) {
      const sev = String(values.severity ?? 'moderate');
      const wt = num(values.weight, 70);
      const bronch = bool(values.bronchorrhea);
      const brady = bool(values.bradycardia);

      const mildNoBronch = sev === 'mild' && !bronch;
      let startMg: number;
      let riskLevel: 'moderate' | 'high' | 'critical';
      let label: string;
      if (wt < 50) {
        const k = mildNoBronch ? 0.02 : 0.05;
        startMg = clamp(round(k * wt, 2), 0.1, 2);
      } else if (mildNoBronch) {
        startMg = 1;
      } else if (sev === 'moderate' || (sev === 'mild' && bronch)) {
        startMg = 2;
      } else {
        startMg = 3;
      }

      if (mildNoBronch) {
        riskLevel = 'moderate';
        label = 'Mild severity — atropine PRN secretions/HR';
      } else if (sev === 'moderate' || (sev === 'mild' && bronch)) {
        riskLevel = 'high';
        label = 'Moderate severity — early IV atropine';
      } else {
        riskLevel = 'critical';
        label = 'Severe — aggressive atropine titration';
      }

      if (bronch || brady) {
        if (riskLevel === 'moderate') riskLevel = 'high';
        if (sev === 'severe') riskLevel = 'critical';
      }

      const interpretation =
        `Severity: ${sev}. Suggested educational initial atropine ≈${startMg} mg IV` +
        (wt < 50 ? ' (pediatric weight-based 0.02–0.05 mg/kg, min 0.1 mg)' : ' (adult start often 1–3 mg)') +
        '. Double dose q3–5 min until secretions dry and ventilation improves (endpoint is drying secretions, not HR alone). Add pralidoxime/oxime per protocol for OP; benzos for seizures. Decontaminate and protect staff.';

      return {
        score: startMg,
        unit: 'mg atropine (start)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Severity', value: sev },
          { label: 'Weight', value: `${wt} kg` },
          { label: 'Bronchorrhea', value: bronch ? 'Yes' : 'No' },
          { label: 'Bradycardia', value: brady ? 'Yes' : 'No' },
          { label: 'Titration note', value: 'May require very large cumulative doses in severe OP' },
        ],
        recommendations: [
          'PPE / dermal-gastric decontamination',
          'Airway early if secretions uncontrolled',
          'Pralidoxime (2-PAM) for most OP — protocol dependent',
        ],
      };
    },
    evidence: {
      summary:
        'Organophosphate toxicity causes cholinergic crisis (DUMBBELS/SLUDGE). Atropine is titrated to drying of secretions; oximes regenerate AChE for many OPs. Doses may be massive in severe poisoning.',
      formula: 'Severity → initial atropine estimate; double q few minutes to effect',
      validation: 'Educational dosing — follow poison control / local chemical casualty protocols.',
      references: [
        {
          title: 'Management of acute organophosphorus pesticide poisoning',
          citation: 'Eddleston M et al. Lancet. 2008',
          year: 2008,
          pmid: '17706760',
          doi: '10.1016/S0140-6736(07)61202-1',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any significant OP exposure',
        actions: ['PPE', 'Atropine titration', 'Oxime per protocol', 'Benzodiazepines for seizures', 'ICU', 'Poison control'],
      },
    ],
    pearls: [
      'Succinylcholine is prolonged in OP — prefer nondepolarizing agents with caution.',
      'Intermediate syndrome (weakness days later) can cause delayed respiratory failure.',
    ],
  },

  // ─── 13. Snakebite severity (simplified) ───────────────────────────────────
  {
    id: 'snakebite-severity',
    name: 'Snakebite Severity Score (Simplified)',
    shortName: 'Snakebite SSS',
    description: 'Simplified snakebite severity domains (local, systemic, hematologic, CNS, GI) for antivenom urgency framing.',
    category: 'toxicology',
    tags: ['snakebite', 'envenomation', 'antivenom', 'crotalid'],
    whenToUse: 'Pit viper / venomous snakebite evaluation when serial grading of severity is needed.',
    whyUse: 'Progressive local and systemic findings guide antivenom initiation and redosing.',
    inputs: [
      selectInput('local', 'Local wound / limb findings', [
        { label: 'None / puncture only (0)', value: 0, description: 'Fang marks only; no swelling, pain, or ecchymosis' },
        { label: 'Mild pain/swelling local (1)', value: 1, description: 'Pain or swelling confined near fang marks; leading edge typically ≤7.5 cm' },
        { label: 'Moderate swelling beyond local area (2)', value: 2, description: 'Swelling typically 7.5–15 cm from fang marks or past the nearest joint, not the entire limb' },
        { label: 'Severe swelling, ecchymosis, threatened limb (3)', value: 3, description: 'Swelling typically >15 cm, entire limb, bullae/ecchymosis, cyanosis, or threatened compartment' },
      ], undefined, 'Mark the leading edge of swelling in cm from fang marks and remeasure serially. Do not add points beyond the listed 0–3 maximum.'),
      selectInput('pulmonary', 'Pulmonary symptoms', [
        { label: 'None (0)', value: 0, description: 'No dyspnea; RR typically <20' },
        { label: 'Dyspnea / mild symptoms (1)', value: 1, description: 'Subjective dyspnea or chest tightness; RR typically 20–25 without accessory-muscle use or failure' },
        { label: 'Respiratory failure (2)', value: 2, description: 'Cyanosis, accessory-muscle use, hypoxemic/hypercapnic failure, or need for ventilatory support' },
      ], undefined, 'Score the worst respiratory finding. This simplified scale caps at 2 (do not add a 3rd pulmonary point).'),
      selectInput('cv', 'Cardiovascular', [
        { label: 'Normal (0)', value: 0, description: 'HR <100 bpm and SBP ≥100 mmHg without hypoperfusion' },
        { label: 'Tachycardia / mild hypotension (1)', value: 1, description: 'HR 100–125 bpm or SBP 90–100 mmHg, without shock' },
        { label: 'Shock (2)', value: 2, description: 'HR >125 bpm, SBP <90 mmHg, or signs of hypoperfusion (cool/clammy, oliguria, altered mentation)' },
      ], undefined, 'Use simultaneous HR and SBP. This simplified scale caps at 2.'),
      selectInput('heme', 'Bleeding / coagulopathy', [
        { label: 'None (0)', value: 0, description: 'Normal PT/PTT, platelets, and fibrinogen; no oozing' },
        { label: 'Mild labs / oozing (1)', value: 1, description: 'PT mildly prolonged (typically <20 s) or PTT mildly up; platelets 100–150×10³/µL; fibrinogen 100–150 mg/dL; or puncture-site oozing' },
        { label: 'Significant coagulopathy / bleeding (2)', value: 2, description: 'PT typically 20–50 s, PTT 50–75 s, platelets 50–100×10³/µL, fibrinogen 50–100 mg/dL, or frank bleeding' },
        { label: 'Severe uncontrolled bleeding (3)', value: 3, description: 'PT typically >50 s, platelets <50×10³/µL, fibrinogen <50 mg/dL, or uncontrolled hemorrhage' },
      ], undefined, 'Use the worst of PT/PTT, platelet count, fibrinogen, or clinical bleeding. Do not add points beyond the listed 0–3 maximum.'),
      selectInput('cns', 'CNS', [
        { label: 'Normal (0)', value: 0, description: 'Alert, oriented, no fasciculations or weakness' },
        { label: 'Mild (dizziness, lethargy) (1)', value: 1, description: 'Dizziness, headache, fasciculations, lethargy, or mild weakness' },
        { label: 'Severe (coma, paralysis) (2)', value: 2, description: 'Coma, seizures, or paralysis' },
      ], undefined, 'Score the worst neurologic finding. This simplified scale caps at 2.'),
      selectInput('gi', 'GI', [
        { label: 'None (0)', value: 0, description: 'No nausea, pain, or vomiting' },
        { label: 'Nausea / pain (1)', value: 1, description: 'Nausea or abdominal pain without repeated vomiting' },
        { label: 'Repeated vomiting / severe (2)', value: 2, description: 'Repeated vomiting, diarrhea, or hematemesis' },
      ], undefined, 'Score the worst GI finding. This simplified scale caps at 2.'),
    ],
    calculate(values) {
      const score =
        num(values.local) +
        num(values.pulmonary) +
        num(values.cv) +
        num(values.heme) +
        num(values.cns) +
        num(values.gi);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Minimal severity band',
          interpretation: `Simplified severity ${score}. Minimal findings — may represent dry bite or very early envenomation. Observe serially (swelling march, labs); do not use tourniquets; immobilize limb.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Mild–moderate envenomation',
          interpretation: `Simplified severity ${score}. Mild–moderate envenomation likely. Labs (CBC, PT/INR, fibrinogen, CK, chem); mark leading edge; antivenom if progression or coagulopathy per regional protocol (e.g., CroFab/ANav).`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Significant envenomation',
          interpretation: `Simplified severity ${score}. Significant envenomation — antivenom indicated in most crotalid algorithms with progression/systemic/heme findings; ICU if unstable.`,
        },
        {
          max: 20,
          level: 'critical',
          label: 'Severe envenomation',
          interpretation: `Simplified severity ${score}. Severe envenomation — urgent antivenom, critical care, reverse coagulopathy supportively, surgical consult only for true compartment syndrome (rare).`,
        },
      ]);
      return {
        score,
        unit: 'pts (simplified)',
        ...r,
        details: [
          { label: 'Local', value: String(num(values.local)) },
          { label: 'Pulmonary', value: String(num(values.pulmonary)) },
          { label: 'CV', value: String(num(values.cv)) },
          { label: 'Heme', value: String(num(values.heme)) },
          { label: 'CNS', value: String(num(values.cns)) },
          { label: 'GI', value: String(num(values.gi)) },
        ],
      };
    },
    evidence: {
      summary:
        'Snakebite Severity Score domains grade local and systemic toxicity. This is a simplified educational version inspired by published SSS tools — use regional antivenom protocols for treatment thresholds.',
      formula: 'Sum of simplified domain points',
      validation: 'Educational simplification of Dart et al. SSS concept; not identical to validated instrument item weights.',
      references: [
        {
          title: 'Validation of a severity score for the assessment of crotalid snakebite',
          citation: 'Dart RC et al. Ann Emerg Med. 1996',
          year: 1996,
          pmid: '8599491',
          doi: '10.1016/s0196-0644(96)70267-6',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Progressive swelling, systemic, or coagulopathy',
        actions: ['Antivenom per protocol', 'Serial limb circumference / photos', 'Labs q few hours initially', 'Tetanus update', 'Poison control'],
      },
    ],
    pearls: [
      'Do not ice, cut, suck, or apply arterial tourniquets.',
      'Initial dry bite can evolve — observe adequately.',
    ],
  },

  // ─── 14. Tetanus prophylaxis ───────────────────────────────────────────────
  {
    id: 'tetanus-prophylaxis',
    name: 'Tetanus Prophylaxis Guide',
    shortName: 'Tetanus PEP',
    description: 'CDC-style tetanus toxoid ± TIG recommendations based on wound class and immunization history.',
    category: 'infectious-disease',
    tags: ['tetanus', 'tdap', 'tig', 'wound', 'prophylaxis'],
    whenToUse: 'Any wound care decision about tetanus booster and/or tetanus immune globulin.',
    whyUse: 'Prevents tetanus with correct vaccine ± TIG selection for clean vs dirty wounds and unknown history.',
    inputs: [
      selectInput('wound', 'Wound classification', [
        { label: 'Clean, minor wound', value: 'clean', description: 'Clean lacerations or abrasions — not contaminated, not punctures, not burns/frostbite/crush/missiles/avulsions' },
        { label: 'All other wounds (dirty, puncture, burns, crush, etc.)', value: 'dirty', description: 'Contaminated with dirt, feces, soil, or saliva; or puncture, avulsion, missile, crush, burn, or frostbite' },
      ], undefined, 'Dirty/tetanus-prone = contaminated, puncture, crush, burn, frostbite, missile, or avulsion. Clean minor = superficial laceration/abrasion only.'),
      selectInput('history', 'Prior tetanus toxoid doses', [
        { label: 'Unknown or <3 doses', value: 'incomplete', description: 'Never vaccinated, incomplete primary series, or records unavailable' },
        { label: '≥3 doses', value: 'complete', description: 'Completed a primary tetanus toxoid series (≥3 doses)' },
      ]),
      selectInput('last_dose_years', 'Years since last tetanus-containing vaccine (if ≥3 doses)', [
        { label: 'Not applicable / unknown incomplete series', value: 'na' },
        { label: '<5 years', value: 'lt5' },
        { label: '5–9 years', value: '5to9' },
        { label: '≥10 years', value: 'ge10' },
      ]),
      yesNo('immunocompromised', 'HIV or severe immunodeficiency', null, 'CDC: people with HIV or severe immunodeficiency who have dirty/major wounds should receive TIG even after a complete toxoid series. TIG is never indicated for clean minor wounds.'),
    ],
    calculate(values) {
      const dirty = String(values.wound ?? 'dirty') === 'dirty';
      const incomplete = String(values.history ?? 'incomplete') === 'incomplete';
      const last = String(values.last_dose_years ?? 'na');
      const immuno = bool(values.immunocompromised);

      let vaccine = false;
      let tig = false;
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';

      if (incomplete) {
        vaccine = true;
        tig = dirty;
        label = dirty ? 'Give vaccine + TIG' : 'Give vaccine (TIG not routine for clean minor)';
        interpretation = dirty
          ? 'Unknown or <3 prior doses + non-clean wound: give tetanus toxoid-containing vaccine AND tetanus immune globulin (TIG) at separate sites. Start/complete catch-up immunization.'
          : 'Unknown or <3 prior doses + clean minor wound: give tetanus toxoid-containing vaccine; TIG generally not indicated. Complete primary series.';
        riskLevel = dirty ? 'high' : 'moderate';
      } else {
        // ≥3 doses
        if (dirty) {
          vaccine = last === 'ge10' || last === '5to9' || last === 'na';
          // dirty: booster if ≥5 years
          if (last === 'lt5') vaccine = false;
          else vaccine = true;
          tig = immuno;
          if (tig && vaccine) {
            label = 'Give booster + TIG (dirty wound, immunocompromised)';
            interpretation =
              '≥3 prior doses with dirty/other wound and HIV/severe immunodeficiency: give TIG (250 IU IM typical) even after a complete toxoid series, plus a booster if ≥5 years since last dose.';
          } else if (tig && !vaccine) {
            label = 'Give TIG (dirty wound, immunocompromised; booster not due)';
            interpretation =
              '≥3 prior doses, dirty wound, last dose <5 years: no toxoid booster, but CDC still indicates TIG for HIV or severe immunodeficiency with dirty/major wounds.';
          } else if (vaccine) {
            label = 'Booster indicated (dirty wound, ≥5 y)';
            interpretation =
              '≥3 prior doses with dirty/other wound: give booster if ≥5 years since last dose. TIG is not indicated when the primary series is complete and the patient is not HIV/severely immunocompromised.';
          } else {
            label = 'No booster (dirty, <5 y since last)';
            interpretation =
              '≥3 prior doses, dirty wound, last dose <5 years, not immunocompromised: no toxoid booster and no TIG needed for tetanus prophylaxis.';
          }
          riskLevel = tig ? 'high' : vaccine ? 'moderate' : 'low';
        } else {
          // clean: booster if ≥10 years; TIG never for clean minor wounds
          vaccine = last === 'ge10' || last === 'na';
          tig = false;
          label = vaccine ? 'Booster indicated (clean wound, ≥10 y)' : 'No booster (clean, <10 y)';
          interpretation = vaccine
            ? '≥3 prior doses + clean minor wound: booster if ≥10 years since last dose. Prefer Tdap if indicated (e.g., no prior Tdap adult, pregnancy). TIG is not indicated for clean minor wounds.'
            : '≥3 prior doses, clean wound, last dose <10 years: no tetanus prophylaxis needed. TIG is not indicated for clean minor wounds.';
          riskLevel = vaccine ? 'moderate' : 'low';
        }
      }

      const plan = [
        vaccine ? 'Tetanus toxoid vaccine (Td or Tdap as age/indication)' : 'No toxoid booster required for tetanus',
        tig ? 'TIG 250 units IM (typical adult) separate site from vaccine' : 'TIG not indicated',
      ];

      return {
        score: (vaccine ? 1 : 0) + (tig ? 2 : 0),
        unit: 'plan code',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Wound', value: dirty ? 'Dirty / other' : 'Clean minor' },
          { label: 'Immunization history', value: incomplete ? 'Unknown or <3 doses' : '≥3 doses' },
          { label: 'HIV / severe immunodeficiency', value: immuno ? 'Yes' : 'No' },
          { label: 'Vaccine now', value: vaccine ? 'Yes' : 'No' },
          { label: 'TIG now', value: tig ? 'Yes' : 'No' },
        ],
        recommendations: plan,
      };
    },
    evidence: {
      summary:
        'CDC tetanus prophylaxis: incomplete series → vaccine ± TIG (TIG if dirty). Complete series → booster at 10 y (clean) or 5 y (dirty). TIG is also indicated for dirty/major wounds in people with HIV or severe immunodeficiency even after ≥3 toxoid doses. TIG is never indicated for clean minor wounds.',
      formula: 'Wound class × immunization completeness × years since last dose',
      validation: 'Aligned with CDC Pink Book / ACIP wound management tables (educational).',
      references: [
        {
          title: 'Clinical Guidance for Wound Management to Prevent Tetanus',
          citation: 'CDC. Tetanus wound management and prophylaxis (ACIP-aligned)',
          year: 2024,
          url: 'https://www.cdc.gov/tetanus/hcp/clinical-guidance/index.html',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Incomplete immunization',
        actions: ['Vaccine now', 'TIG if dirty wound', 'Schedule catch-up series', 'Wound cleaning'],
      },
      {
        condition: 'HIV / severe immunodeficiency + dirty wound',
        actions: ['Give TIG 250 IU IM even if ≥3 prior toxoid doses', 'Toxoid booster if due (≥5 y for dirty wounds)', 'Separate anatomic sites from vaccine'],
      },
      {
        condition: 'All wounds',
        actions: ['Thorough irrigation/debridement', 'Consider antibiotics if indicated for wound type'],
      },
    ],
    pearls: [
      'Tdap preferred once for adults if never received; use Td/Tdap per current ACIP.',
      'TIG and vaccine at different anatomic sites.',
      'HIV or severe immunodeficiency + dirty/major wound: give TIG regardless of prior dose count.',
    ],
  },

  // ─── 15. Rabies PEP ────────────────────────────────────────────────────────
  {
    id: 'rabies-pep',
    name: 'Rabies Post-Exposure Prophylaxis Helper',
    shortName: 'Rabies PEP',
    description: 'Educational decision helper for rabies PEP (HRIG + vaccine schedule) by exposure type and prior vaccination.',
    category: 'infectious-disease',
    tags: ['rabies', 'pep', 'hrig', 'vaccine', 'bite'],
    whenToUse: 'Mammal bite, bat exposure, or other potential rabies exposure risk assessment.',
    whyUse: 'Rabies is nearly always fatal once clinical — correct PEP is time-critical when indicated.',
    inputs: [
      selectInput('animal', 'Animal / exposure', [
        { label: 'Bat', value: 'bat', description: 'Bat as the species. PEP depends on exposure type: known bite/mucosa, or bat-in-room when a bite cannot be excluded. Intact-skin/no contact is not an exposure.' },
        { label: 'Dog / cat / ferret (domestic)', value: 'dogcat', description: 'Domestic dog, cat, or ferret — 10-day observation possible if healthy and available' },
        { label: 'Raccoon / skunk / fox / other wild carnivore', value: 'wild', description: 'High-risk wild carnivore; regard as rabid unless brain tests negative' },
        { label: 'Livestock / horse / other', value: 'other', description: 'Livestock or uncommon species — case-by-case with public health' },
        { label: 'Rodent / rabbit (rarely indicates PEP)', value: 'rodent', description: 'Small rodents and lagomorphs rarely transmit rabies in the US' },
      ]),
      selectInput('exposure', 'Exposure type', [
        { label: 'Bite / saliva into wound or mucosa', value: 'bite', description: 'Percutaneous bite, or saliva into an open wound or mucous membrane (category III)' },
        { label: 'Nonbite (scratch with saliva, open wound contamination)', value: 'nonbite', description: 'Scratch, abrasion, or open-wound contamination with saliva without a clear bite' },
        { label: 'Bat in room with possible unrecognized contact', value: 'batroom', description: 'Bat found in a room with an unattended child, deep sleeper, or intoxicated person — bite cannot be excluded' },
        { label: 'No contact / intact skin only', value: 'none', description: 'Petting, intact-skin contact, or no exposure' },
      ], undefined, 'ACIP: bites and saliva-to-mucosa/open-wound are exposures. Intact skin is not. Bat-in-room with possible unrecognized bite is treated as an exposure.'),
      selectInput('prior_vax', 'Prior rabies vaccination', [
        { label: 'Not previously vaccinated', value: 'none', description: 'No complete pre- or post-exposure rabies vaccine series — give HRIG + 4-dose vaccine' },
        { label: 'Previously vaccinated (pre- or post-exposure series complete)', value: 'prior', description: 'Prior complete cell-culture series — vaccine days 0 and 3 only; no HRIG' },
      ]),
      yesNo('available_observe', 'Healthy dog/cat available for 10-day observation / testing plan', 0, 'Yes only for a currently healthy dog, cat, or ferret that can be confined and observed 10 days (or tested).'),
    ],
    calculate(values) {
      const animal = String(values.animal ?? 'dogcat');
      const exposure = String(values.exposure ?? 'bite');
      const prior = String(values.prior_vax ?? 'none') === 'prior';
      const observe = bool(values.available_observe);

      if (exposure === 'none') {
        return {
          score: 0,
          label: 'PEP generally not indicated',
          interpretation:
            animal === 'bat'
              ? 'No contact / intact skin only is not a rabies exposure, including with bats. CDC does not indicate PEP when a bite, scratch, or mucous-membrane exposure can be confidently excluded. Use “Bat in room with possible unrecognized contact” when a bite cannot be ruled out (sleeping child, intoxicated person).'
              : 'No exposure identified. PEP not indicated. Wound care if needed; tetanus as appropriate.',
          riskLevel: 'low' as const,
          details: [
            { label: 'HRIG', value: 'No' },
            { label: 'Vaccine', value: 'No' },
            { label: 'Dog/cat available for 10-day observation', value: observe ? 'Yes' : 'No' },
          ],
        };
      }

      let indicated = false;
      let delay_ok = false;
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info';

      if (animal === 'rodent' && exposure !== 'batroom') {
        indicated = false;
        label = 'PEP rarely indicated (rodent/rabbit)';
        interpretation =
          'Small rodents and lagomorphs rarely transmit rabies in the US. Consult public health if unusual circumstances; otherwise PEP usually not given.';
        riskLevel = 'low';
      } else if (animal === 'bat' || exposure === 'batroom') {
        indicated = true;
        label = 'PEP often indicated (bat exposure framework)';
        interpretation =
          exposure === 'batroom'
            ? 'Bat in the room when a bite cannot be excluded (unattended child, deep sleeper, intoxicated person): treat as an exposure. Start PEP unless the animal tests negative.'
            : 'Bat bite, scratch, or saliva-to-mucosa/open-wound: PEP is indicated. Start PEP unless the animal tests negative.';
        riskLevel = 'high';
      } else if (animal === 'wild') {
        indicated = true;
        label = 'PEP indicated (high-risk wild carnivore)';
        interpretation =
          'Raccoons, skunks, foxes, and most wild carnivores are high risk. Regard as rabid unless brain testing negative. Begin PEP for bite/mucosal exposures.';
        riskLevel = 'critical';
      } else if (animal === 'dogcat') {
        if (observe && (exposure === 'bite' || exposure === 'nonbite')) {
          indicated = false;
          delay_ok = true;
          label = 'May observe animal 10 days (hold PEP if healthy)';
          interpretation =
            'Healthy dog/cat/ferret can often be observed 10 days. If animal remains healthy, PEP not needed. Start PEP immediately if animal rabid/unavailable/suspect or if delays unsafe per public health.';
          riskLevel = 'moderate';
        } else {
          indicated = true;
          label = 'PEP often indicated (animal unavailable / suspect)';
          interpretation =
            'Dog/cat exposure with animal unavailable for observation/testing or suspect for rabies — coordinate public health; PEP frequently indicated for bite/saliva exposures.';
          riskLevel = 'high';
        }
      } else {
        indicated = exposure === 'bite' || exposure === 'nonbite';
        label = indicated ? 'Consult public health — possible PEP' : 'Unclear — public health consult';
        interpretation = 'Livestock and uncommon species: case-by-case with public health. Do not delay consultation for high-risk bites.';
        riskLevel = 'moderate';
      }

      let schedule: string;
      let hrig: string;
      if (!indicated && !delay_ok) {
        schedule = 'None';
        hrig = 'No';
      } else if (delay_ok) {
        schedule = 'Defer while observing animal (start ASAP if indication appears)';
        hrig = 'Defer';
      } else if (prior) {
        schedule = 'Vaccine days 0 and 3 only (no HRIG)';
        hrig = 'No (previously vaccinated)';
      } else {
        schedule = 'Vaccine days 0, 3, 7, 14 (immunocompromised: add day 28)';
        hrig = 'Yes — HRIG 20 IU/kg infiltrate wound, remainder IM distant from vaccine';
      }

      if (indicated && exposure !== 'none') {
        interpretation += ` Plan: ${hrig}. Vaccine schedule: ${schedule}. Thorough wound washing with soap/iodine is essential.`;
      }

      return {
        score: indicated ? (prior ? 2 : 4) : delay_ok ? 1 : 0,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'PEP indicated now', value: indicated ? 'Yes / start' : delay_ok ? 'Possibly deferred' : 'No' },
          { label: 'HRIG', value: hrig },
          { label: 'Vaccine schedule', value: schedule },
          { label: 'Prior vaccination', value: prior ? 'Yes' : 'No' },
          { label: 'Dog/cat available for 10-day observation', value: observe ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Rabies PEP: wound cleansing + HRIG (if not previously vaccinated) + cell-culture vaccine schedule. Bat and wild carnivore exposures are high risk; healthy dogs/cats may be observed 10 days.',
      formula: 'Animal risk × exposure type × prior vaccination → HRIG + schedule',
      validation: 'Educational summary of ACIP/CDC rabies PEP principles; local epidemiology matters.',
      references: [
        {
          title: 'Rabies Post-exposure Prophylaxis Guidance',
          citation: 'CDC. Rabies PEP clinical care (wound care, HRIG, vaccine schedule)',
          year: 2025,
          url: 'https://www.cdc.gov/rabies/hcp/clinical-care/post-exposure-prophylaxis.html',
        },
        {
          title: 'Use of a reduced (4-dose) vaccine schedule for postexposure prophylaxis to prevent human rabies',
          citation: 'Rupprecht CE et al. MMWR Recomm Rep. 2010 (ACIP)',
          year: 2010,
          pmid: '20300058',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'PEP indicated',
        actions: ['Wash wound thoroughly', 'HRIG if not previously vaccinated', 'Vaccine series', 'Tetanus update', 'Report to public health'],
      },
      {
        condition: 'Dog/cat available',
        actions: ['10-day observation or testing per public health', 'Do not euthanize without testing plan'],
      },
    ],
    pearls: [
      'Never give HRIG in the same syringe/site as vaccine.',
      'If HRIG not given on day 0, can give through day 7 of series.',
    ],
  },

  // ─── 16. Needle-stick PEP ──────────────────────────────────────────────────
  {
    id: 'needle-stick-pep',
    name: 'Occupational Needle-Stick PEP Helper',
    shortName: 'Needle-stick PEP',
    description: 'Educational framing for HIV / HBV / HCV risk and PEP urgency after percutaneous exposure.',
    category: 'infectious-disease',
    tags: ['needle stick', 'pep', 'hiv', 'hbv', 'hcv', 'occupational'],
    whenToUse: 'Healthcare or other percutaneous / mucosal blood-borne pathogen exposure.',
    whyUse: 'HIV PEP is time-sensitive (ideally <2 h, not after 72 h routinely); HBV depends on immunity; HCV has no PEP but needs follow-up.',
    inputs: [
      selectInput('exposure_type', 'Exposure type', [
        { label: 'Percutaneous solid needle / superficial', value: 'solid', description: 'Suture or other solid needle, or a superficial scratch — no hollow lumen, not deep into a vessel' },
        { label: 'Percutaneous hollow-bore, deep, visible blood, vessel', value: 'hollow', description: 'Hollow-bore needle, deep puncture, visible blood on the device, or into an artery/vein — highest percutaneous HIV risk' },
        { label: 'Mucous membrane / non-intact skin splash', value: 'mucosa', description: 'Splash to eyes, mouth, or non-intact skin (chapped, abraded, or dermatitis)' },
        { label: 'Intact skin only', value: 'intact', description: 'Blood/body-fluid contact with intact skin only — generally not a blood-borne pathogen exposure' },
      ], undefined, 'Highest percutaneous risk = hollow-bore, deep, visible blood, or vessel. Mucosal/non-intact skin is intermediate. Intact skin does not warrant HIV PEP.'),
      selectInput('source_hiv', 'Source HIV status', [
        { label: 'Unknown', value: 'unknown', description: 'Source not tested or result pending — obtain rapid HIV; do not delay PEP if the exposure is high-risk' },
        { label: 'HIV negative', value: 'neg', description: 'Documented negative HIV Ag/Ab (ideally a recent/rapid test); confirm test reliability' },
        { label: 'HIV positive, controlled / low VL', value: 'pos_low', description: 'Known HIV on ART with suppressed or low viral load (typically undetectable or <1,000 copies/mL)' },
        { label: 'HIV positive, high VL / acute / untreated', value: 'pos_high', description: 'Untreated HIV, acute/primary infection, or known high viral load (typically ≥1,000 copies/mL or AIDS-defining illness)' },
      ], undefined, 'High VL / acute / untreated = higher transmission risk than suppressed VL on ART. Prefer source rapid HIV testing; do not delay PEP if clearly indicated.'),
      selectInput('hbv_immune', 'Exposed person HBV immunity', [
        { label: 'Immune (anti-HBs adequate)', value: 'immune', description: 'Completed HBV vaccine series and anti-HBs ≥10 mIU/mL' },
        { label: 'Unvaccinated / non-immune', value: 'nonimmune', description: 'Never vaccinated, incomplete series, or anti-HBs <10 mIU/mL' },
        { label: 'Unknown', value: 'unknown', description: 'Titer not available — obtain anti-HBs and treat as unknown pending result' },
      ], undefined, 'Immune = completed HBV series and anti-HBs ≥10 mIU/mL. If titer unknown, choose Unknown and obtain anti-HBs.'),
      yesNo('source_hbsag', 'Source HBsAg positive / high risk HBV', 0, 'Yes if source HBsAg+ or unknown source with high HBV risk (IDU, MSM, endemic region, known HBsAg+ household). Obtain source HBsAg when possible.'),
      selectInput('within_72h', 'Within 72 hours of exposure', [
        { label: 'Not specified', value: 'unspecified', description: 'Do not treat an unanswered 72-hour item as an expired window' },
        { label: 'Yes — still within 72 hours', value: 'yes', description: 'Exposure time is still inside the usual HIV PEP window' },
        { label: 'No — more than 72 hours ago', value: 'no', description: 'Only an explicit No means the usual 72-hour window has passed' },
      ], 'unspecified', 'USPHS: start HIV PEP ASAP (ideally within 2 h) for indicated exposures; generally within 72 h. Unanswered timing is unknown — not “window expired.”'),
    ],
    calculate(values) {
      const exp = String(values.exposure_type ?? 'hollow');
      const hiv = String(values.source_hiv ?? 'unknown');
      const hbvImm = String(values.hbv_immune ?? 'unknown');
      const sourceHbv = bool(values.source_hbsag);
      const timingRaw = values.within_72h;
      const timingStr = String(timingRaw ?? '').toLowerCase();
      const windowExpired = timingRaw === false || timingStr === 'no' || timingStr === 'false';
      const within72 =
        timingRaw === true || timingStr === 'yes' || timingStr === 'true';
      const timingUnknown = !windowExpired && !within72;
      const timingLabel = windowExpired ? 'No' : within72 ? 'Yes' : 'Not specified';

      if (exp === 'intact') {
        return {
          score: 0,
          label: 'No BBP PEP for intact skin',
          interpretation: 'Intact skin contact generally does not warrant HIV PEP. Wash skin; baseline testing optional per occupational health.',
          riskLevel: 'low' as const,
          details: [
            { label: 'HIV PEP', value: 'Not indicated' },
            { label: 'Source HBsAg / high-risk HBV', value: sourceHbv ? 'Yes' : 'No' },
            { label: 'Within 72 h', value: timingLabel },
          ],
        };
      }

      const pepIfInWindow = (inWindowLabel: string, expiredLabel: string, unknownLabel: string) => {
        if (windowExpired) return { pep: false, label: expiredLabel };
        if (timingUnknown) return { pep: true, label: unknownLabel };
        return { pep: true, label: inWindowLabel };
      };

      let hivPep = false;
      let hivLabel = 'HIV PEP not routinely indicated';
      if (hiv === 'neg') {
        hivPep = false;
        hivLabel = 'Source HIV negative — HIV PEP not indicated (confirm testing reliability)';
      } else if (hiv === 'pos_high' || hiv === 'pos_low') {
        const r = pepIfInWindow(
          'HIV PEP indicated — start ASAP (3-drug regimen typical)',
          'HIV PEP window (>72 h) — generally not started; specialist consult',
          'HIV PEP indicated if still within 72 h — timing not specified; start ASAP and do not assume the window expired'
        );
        hivPep = r.pep;
        hivLabel = r.label;
      } else if (hiv === 'unknown' && exp === 'hollow') {
        const r = pepIfInWindow(
          'Source unknown + higher-risk percutaneous — often start HIV PEP pending source testing',
          'Outside usual PEP window — occupational health / ID consult',
          'Source unknown + higher-risk percutaneous — PEP timing unknown; often start pending source testing if still within 72 h (do not assume expired)'
        );
        hivPep = r.pep;
        hivLabel = r.label;
      } else if (hiv === 'unknown') {
        if (exp === 'solid') {
          hivPep = false;
          hivLabel = timingUnknown
            ? 'Case-by-case HIV PEP for solid-needle / lower-risk percutaneous — timing not specified; occupational health / ID'
            : windowExpired
              ? 'Consult specialist regarding delayed presentation'
              : 'Case-by-case HIV PEP — favor start if higher-risk features; stop if source tests negative';
        } else {
          const r = pepIfInWindow(
            'Case-by-case HIV PEP — favor start if higher-risk features; stop if source tests negative',
            'Consult specialist regarding delayed presentation',
            'Case-by-case HIV PEP — timing not specified; do not report the 72-hour window as expired'
          );
          hivPep = r.pep;
          hivLabel = r.label;
        }
      }

      let hbvPlan = 'HBV: no additional action if immune';
      if (hbvImm === 'immune') {
        hbvPlan = 'HBV: immune — no HBIG/vaccine needed';
      } else if (sourceHbv || hbvImm !== 'immune') {
        if (hbvImm === 'nonimmune' && sourceHbv) {
          hbvPlan = 'HBV: HBIG + vaccine series (non-immune + HBsAg+ source)';
        } else if (hbvImm === 'nonimmune') {
          hbvPlan = 'HBV: start vaccine series; HBIG if source HBsAg+ or high risk per protocol';
        } else {
          hbvPlan = 'HBV: check anti-HBs; vaccinate/HBIG per immunity and source status';
        }
      }

      const riskLevel = hivPep ? 'high' : sourceHbv && hbvImm !== 'immune' ? 'moderate' : 'moderate';
      const interpretation = `${hivLabel}. ${hbvPlan}. HCV: no recommended PEP — baseline and follow-up RNA/Ab testing. Report to occupational health immediately; baseline labs (HIV, HBV, HCV, pregnancy if applicable).`;

      return {
        score: hivPep ? 3 : 1,
        label: hivPep ? 'Start exposure management + likely HIV PEP' : 'Exposure lab follow-up ± HBV actions',
        interpretation,
        riskLevel: windowExpired && !hivPep ? 'info' : riskLevel,
        details: [
          { label: 'Exposure', value: exp },
          { label: 'Source HIV', value: hiv },
          { label: 'HIV PEP', value: hivPep ? 'Start / indicated' : windowExpired ? 'Not indicated or window passed' : 'Not routinely indicated' },
          { label: 'Source HBsAg / high-risk HBV', value: sourceHbv ? 'Yes' : 'No' },
          { label: 'HBV plan', value: hbvPlan },
          { label: 'Within 72 h', value: timingLabel },
          { label: 'HCV PEP', value: 'None — surveillance only' },
          { label: 'Ideal HIV PEP start', value: '<2 hours preferred; generally within 72 h (USPHS)' },
        ],
        recommendations: [
          'Wash wound with soap/water; flush mucous membranes',
          'Occupational health / ID pathways',
          '28-day HIV PEP if started; adherence counseling',
        ],
      };
    },
    evidence: {
      summary:
        'After BBP exposure: wash wound; evaluate source; HIV PEP ideally ASAP (generally within 72 h) for indicated exposures (USPHS Kuhar). Unanswered 72-hour timing is unknown — not treated as an expired window. HBV prophylaxis based on immunity and source HBsAg; no HCV PEP — monitor for infection.',
      formula: 'Exposure severity × source status × timing × HBV immunity',
      validation: 'Educational synthesis of USPHS occupational PEP guidance.',
      references: [
        {
          title: 'Updated US Public Health Service guidelines for the management of occupational exposures to human immunodeficiency virus and recommendations for postexposure prophylaxis',
          citation: 'Kuhar DT et al. Infect Control Hosp Epidemiol. 2013',
          year: 2013,
          pmid: '23917901',
          doi: '10.1086/672271',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Significant exposure',
        actions: ['Immediate wash', 'Occupational health', 'Source rapid HIV/HBV/HCV testing', 'Start HIV PEP if indicated', 'Baseline labs', 'Schedule follow-up testing'],
      },
    ],
    pearls: [
      'Do not delay first PEP dose for specialist callback if clearly indicated.',
      'Expert consultation: PEPline (US) is a useful resource.',
    ],
  },

  // ─── 17. Anaphylaxis criteria (NIAID/FAAN) ─────────────────────────────────
  {
    id: 'anaphylaxis-criteria',
    name: 'Anaphylaxis Criteria (NIAID/FAAN)',
    shortName: 'Anaphylaxis',
    description: 'Applies NIAID/FAAN clinical criteria for likely anaphylaxis to support epinephrine decisions.',
    category: 'emergency',
    tags: ['anaphylaxis', 'allergy', 'epinephrine', 'niaid', 'fa an'],
    whenToUse: 'Acute allergic reaction when deciding if anaphylaxis criteria are met.',
    whyUse: 'Anaphylaxis is clinical — early IM epinephrine when criteria met saves lives.',
    inputs: [
      yesNo('acute_onset', 'Acute onset of illness (minutes to hours)', 0, 'Typical allergic time course: minutes to a few hours after exposure (not days).'),
      yesNo('skin_mucosa', 'Skin/mucosal involvement (hives, pruritus, flushing, swollen lips/tongue/uvula)', 0),
      yesNo('resp', 'Respiratory compromise (dyspnea, wheeze, stridor, hypoxemia)', 0, 'Dyspnea, wheeze, stridor, or hypoxemia (SpO2 <92% or cyanosis).'),
      yesNo('hypotension_endorgan', 'Hypotension or end-organ dysfunction (collapse, syncope, incontinence)', 0, 'Adults: SBP <90 mmHg or >30% fall from baseline. Children: 1 mo–1 y SBP <70; 1–10 y <70+(2×age in years); 11–17 y <90; or >30% fall. End-organ = collapse, syncope, or incontinence.'),
      yesNo('gi_cramp', 'Persistent GI symptoms (crampy abdominal pain, vomiting) — for criterion 2', 0, 'Persistent (not a single emesis) crampy abdominal pain or vomiting.'),
      yesNo('likely_allergen', 'Likely allergen exposure for this patient', 0, 'Criterion 2: suspected culprit this episode (food, drug, insect, etc.), even if not previously confirmed.'),
      yesNo('known_allergen', 'Known allergen exposure for this patient', 0, 'Criterion 3: previously identified allergen (prior reaction or documented allergy).'),
      yesNo('hypotension_only', 'Hypotension after known allergen (even without skin findings)', 0, 'Adults: SBP <90 mmHg or >30% fall from baseline. Children: 1 mo–1 y SBP <70; 1–10 y <70+(2×age); 11–17 y <90; or >30% fall. Known = previously identified allergen.'),
    ],
    calculate(values) {
      const acute = bool(values.acute_onset);
      const skin = bool(values.skin_mucosa);
      const resp = bool(values.resp);
      const hypoEnd = bool(values.hypotension_endorgan);
      const gi = bool(values.gi_cramp);
      const likely = bool(values.likely_allergen);
      const known = bool(values.known_allergen);
      const hypoOnly = bool(values.hypotension_only);

      // Criterion 1: acute onset skin/mucosa + (resp OR hypo/end-organ)
      const c1 = acute && skin && (resp || hypoEnd);
      // Criterion 2: two or more after likely allergen: skin, resp, hypo/end-organ, GI
      const domains = [skin, resp, hypoEnd, gi].filter(Boolean).length;
      const c2 = likely && domains >= 2;
      // Criterion 3: reduced BP after known allergen
      const c3 = known && (hypoOnly || hypoEnd);

      const met = c1 || c2 || c3;
      const which = [c1 && '1 (skin + resp/CV)', c2 && '2 (≥2 systems after likely allergen)', c3 && '3 (hypotension after known allergen)']
        .filter(Boolean)
        .join('; ');

      return {
        score: met ? 1 : 0,
        label: met ? 'Anaphylaxis criteria MET' : 'Criteria not met on entered items',
        interpretation: met
          ? `NIAID/FAAN criteria met (${which || 'see details'}). Give IM epinephrine immediately (anterolateral thigh), position supine with legs elevated if tolerated, ABCs, IV access, oxygen, fluid bolus for hypotension. Observe for biphasic reaction.`
          : 'Entered features do not meet classic NIAID/FAAN anaphylaxis criteria. Still treat severe symptoms appropriately; isolated mild urticaria may not need epi. When in doubt with progressive multi-system allergy, do not withhold epinephrine.',
        riskLevel: met ? 'critical' : 'low',
        details: [
          { label: 'Criterion 1 (acute skin + resp/CV)', value: c1 ? 'Met' : 'Not met' },
          { label: 'Criterion 2 (≥2 systems after likely allergen)', value: c2 ? 'Met' : 'Not met' },
          { label: 'Criterion 3 (hypotension after known allergen)', value: c3 ? 'Met' : 'Not met' },
          { label: 'Acute onset', value: acute ? 'Yes' : 'No' },
          { label: 'Skin/mucosa', value: skin ? 'Yes' : 'No' },
          { label: 'Respiratory compromise', value: resp ? 'Yes' : 'No' },
          { label: 'Hypotension / end-organ', value: hypoEnd ? 'Yes' : 'No' },
          { label: 'Persistent GI symptoms', value: gi ? 'Yes' : 'No' },
          { label: 'Likely allergen exposure', value: likely ? 'Yes' : 'No' },
          { label: 'Known allergen exposure', value: known ? 'Yes' : 'No' },
          { label: 'Hypotension after known allergen (criterion 3 path)', value: hypoOnly ? 'Yes' : 'No' },
          { label: 'System domains positive', value: String(domains) },
        ],
        recommendations: met
          ? ['IM epinephrine now', 'Remove allergen trigger', 'Antihistamine/steroid adjunct only (not first-line)', 'Observation / admission if severe']
          : ['Supportive allergy care', 'Reassess if progresses'],
      };
    },
    evidence: {
      summary:
        'NIAID/FAAN 2006 criteria: (1) acute skin/mucosa + respiratory or CV compromise; (2) ≥2 of skin, resp, CV, persistent GI after likely allergen; (3) hypotension after known allergen.',
      formula: 'Boolean evaluation of three clinical pathways',
      validation: 'Widely adopted clinical criteria for anaphylaxis diagnosis.',
      references: [
        {
          title: 'Second symposium on the definition and management of anaphylaxis (NIAID/FAAN)',
          citation: 'Sampson HA et al. J Allergy Clin Immunol. 2006',
          year: 2006,
          pmid: '16461139',
          doi: '10.1016/j.jaci.2005.12.1303',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Criteria met',
        actions: ['Epinephrine IM 0.3–0.5 mg adult (0.01 mg/kg peds)', 'Airway support', 'IV fluids if hypotensive', 'Consider glucagon if on beta-blockers', 'Prescription for epinephrine autoinjector at discharge'],
      },
    ],
    pearls: [
      'Skin findings absent in ~10–20% of anaphylaxis — criterion 3 exists for a reason.',
      'Steroids do not treat acute anaphylaxis.',
    ],
  },

  // ─── 18. Epinephrine IM dose ───────────────────────────────────────────────
  {
    id: 'epinephrine-im-dose',
    name: 'Epinephrine IM Dose (Anaphylaxis)',
    shortName: 'Epi IM',
    description: 'Weight-based IM epinephrine dosing for anaphylaxis with autoinjector size guidance.',
    category: 'emergency',
    tags: ['epinephrine', 'anaphylaxis', 'im dose', 'autoinjector'],
    whenToUse: 'Anaphylaxis treatment dosing for IM epinephrine by weight.',
    whyUse: 'Correct dose and thigh IM route are critical; delay increases mortality.',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 3, max: 200, step: 0.1, defaultValue: 70 }),
      selectInput('concentration', 'Concentration available', [
        { label: '1 mg/mL (1:1000) IM/SC — correct for anaphylaxis IM', value: '1in1000', description: 'Draw 0.01 mg/kg (max 0.5 mg) IM in the mid-anterolateral thigh. Do not use 1:10,000 (0.1 mg/mL) for IM anaphylaxis.' },
        { label: 'Using autoinjector only', value: 'auto', description: '0.15 mg junior typically 15–30 kg; 0.3 mg adult ≥30 kg; 0.1 mg infant autoinjector if available <15 kg' },
      ], undefined, 'Anaphylaxis IM is 1 mg/mL (1:1000). 0.1 mg/mL (1:10,000) is the cardiac-arrest IV concentration — not first-line IM anaphylaxis.'),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const raw = 0.01 * wt; // mg
      const dose = round(Math.min(raw, 0.5), 2);
      // Autoinjector guidance
      let auto: string;
      if (wt < 7.5) {
        auto = 'Below typical autoinjector range — draw weight-based dose if possible; urgent care';
      } else if (wt < 15) {
        auto = 'Often 0.1 mg infant autoinjector if available; else draw 0.01 mg/kg';
      } else if (wt < 30) {
        auto = '0.15 mg junior autoinjector commonly used (~15–30 kg)';
      } else {
        auto = '0.3 mg adult autoinjector (≥30 kg); some protocols allow 0.5 mg in large adults';
      }

      const vol1in1000 = round(dose, 2); // mL of 1 mg/mL

      const conc = String(values.concentration ?? '1in1000');
      const concLabel =
        conc === 'auto'
          ? 'Autoinjector only'
          : '1 mg/mL (1:1000) IM — correct for anaphylaxis';

      return {
        score: dose,
        unit: 'mg IM',
        label: 'IM epinephrine dose (anterolateral thigh)',
        interpretation: `Give ${dose} mg IM (0.01 mg/kg, max 0.5 mg) in the mid-anterolateral thigh. May repeat q5 min if refractory. Concentration context: ${concLabel}. Autoinjector guidance: ${auto}. Do not use IV bolus dosing meant for cardiac arrest as first-line anaphylaxis therapy.`,
        riskLevel: 'critical',
        details: [
          { label: 'Weight', value: `${wt} kg` },
          { label: 'Concentration available', value: concLabel },
          { label: 'Calculated 0.01 mg/kg', value: `${round(raw, 2)} mg (capped at 0.5)` },
          { label: 'Volume of 1 mg/mL', value: conc === 'auto' ? 'N/A (autoinjector)' : `${vol1in1000} mL` },
          { label: 'Autoinjector', value: auto },
          { label: 'Route', value: 'IM thigh preferred over deltoid/SC' },
        ],
        recommendations: [
          'Supine position if tolerated',
          'IV epinephrine infusion only for refractory shock in monitored setting',
          'Second dose if not improving in 5 minutes',
        ],
      };
    },
    evidence: {
      summary:
        'Anaphylaxis epinephrine: 0.01 mg/kg IM of 1 mg/mL (1:1000), max usually 0.3–0.5 mg adults; repeat q5 min PRN. Autoinjectors: 0.15 mg (~15–30 kg), 0.3 mg (≥30 kg).',
      formula: 'Dose (mg) = min(0.01 × kg, 0.5)',
      validation: 'Standard AHA/allergy society anaphylaxis dosing.',
      references: [
        {
          title: 'Anaphylaxis practice parameter / NIAID guidance',
          citation: 'Sampson HA et al. JACI 2006; subsequent allergy practice parameters',
          year: 2006,
          pmid: '16461139',
          doi: '10.1016/j.jaci.2005.12.1303',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Anaphylaxis',
        actions: ['Epi IM now', 'Oxygen/airway', 'IV fluids if hypotensive', 'Remove trigger', 'Observe for biphasic reaction'],
      },
    ],
    pearls: [
      '1:10,000 (0.1 mg/mL) is for IV cardiac arrest — not IM anaphylaxis first-line.',
      'Beta-blocked patients may need glucagon if refractory.',
    ],
  },

  // ─── 19. ABA burn transfer criteria ────────────────────────────────────────
  {
    id: 'burn-transfer-aba',
    name: 'ABA Burn Center Transfer Criteria',
    shortName: 'ABA Transfer',
    description: 'American Burn Association burn center referral criteria checklist (educational).',
    category: 'emergency',
    tags: ['burn', 'aba', 'transfer', 'trauma', 'tbsa'],
    whenToUse: 'Triage of burn injuries for possible burn center referral/transfer.',
    whyUse: 'ABA criteria identify injuries that benefit from specialized burn care.',
    inputs: [
      yesNo('partial_gt10', 'Partial-thickness burns >10% TBSA', 1, 'Partial-thickness only; do not count isolated first-degree erythema. Rule of Nines (adult) or Lund–Browder (children); palmar surface including fingers ≈ 1% TBSA.'),
      yesNo('face_hands_feet', 'Burns involving face, hands, feet, genitalia, perineum, or major joints'),
      yesNo('third_degree', 'Any third-degree (full-thickness) burns', 1, 'Full-thickness: white, leathery, or charred skin that is insensate. Any amount meets ABA referral.'),
      yesNo('electrical', 'Electrical burns including lightning'),
      yesNo('chemical', 'Chemical burns'),
      yesNo('inhalation', 'Inhalation injury', 1, 'Closed-space fire, singed nasal hair, carbonaceous sputum, voice change, or stridor.'),
      yesNo('comorbid', 'Burn injury in patients with preexisting medical disorders that could complicate management'),
      yesNo('concomitant_trauma', 'Burns with concomitant trauma where burn poses greatest risk (coordinate trauma/burn)'),
      yesNo('children_no_peds', 'Burned children in hospitals without qualified personnel/equipment for pediatric burn care'),
      yesNo('special_social', 'Burn injury in patients who will require special social, emotional, or rehabilitative intervention'),
    ],
    calculate(values) {
      const flags = [
        ['Partial-thickness >10% TBSA', bool(values.partial_gt10)],
        ['Face/hands/feet/genitalia/joints', bool(values.face_hands_feet)],
        ['Third-degree burns', bool(values.third_degree)],
        ['Electrical / lightning', bool(values.electrical)],
        ['Chemical burns', bool(values.chemical)],
        ['Inhalation injury', bool(values.inhalation)],
        ['Complicating comorbidities', bool(values.comorbid)],
        ['Concomitant trauma + burn priority', bool(values.concomitant_trauma)],
        ['Pediatric without peds burn capability', bool(values.children_no_peds)],
        ['Special social/rehab needs', bool(values.special_social)],
      ] as const;
      const n = flags.filter(([, v]) => v).length;
      const met = n > 0;
      return {
        score: n,
        unit: 'criteria met',
        label: met ? 'Burn center referral criteria met' : 'No listed ABA referral criterion selected',
        interpretation: met
          ? `${n} ABA burn center referral criterion/criteria met. Strongly consider transfer/referral to a verified burn center after ABCs, cooling (brief), fluid resuscitation if large TBSA, analgesia, and wound cover. Coordinate with receiving center.`
          : 'None of the entered ABA referral criteria are positive. Manage locally with appropriate wound care and follow-up; re-evaluate if TBSA or depth underestimated.',
        riskLevel: met ? (n >= 3 || bool(values.inhalation) || bool(values.electrical) ? 'critical' : 'high') : 'low',
        details: flags.map(([label, v]) => ({ label, value: v ? 'Yes' : 'No' })),
      };
    },
    evidence: {
      summary:
        'ABA burn center referral criteria include large partial-thickness burns, full-thickness burns, critical areas, electrical/chemical, inhalation injury, comorbidities, concomitant trauma, pediatric capability gaps, and special rehab/social needs.',
      formula: 'Count of positive ABA criteria',
      validation: 'Based on American Burn Association referral criteria (educational checklist).',
      references: [
        {
          title: 'ABA Burn Center Referral Criteria',
          citation:
            'Bettencourt AP, Romanowski KS, Joe V, et al. Updating the Burn Center Referral Criteria: Results From the 2018 eDelphi Consensus Study. J Burn Care Res. 2020;41(5):1052-1062 (American Burn Association)',
          year: 2020,
          pmid: '32123911',
          doi: '10.1093/jbcr/iraa038',
          url: 'https://www.ameriburn.org/burn-care-team/resources/guidelines-for-burn-patient-referral',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Criteria met',
        actions: ['ABCs / intubation if inhalation', 'Parkland or local fluid protocol if large TBSA', 'Dry clean sheets', 'Avoid wet dressings for long transport', 'Early burn center contact'],
      },
    ],
    pearls: [
      'Rule of nines / Lund–Browder for TBSA — do not count simple erythema (1st degree) in Parkland TBSA.',
      'CO and cyanide risk with closed-space fires.',
    ],
  },

  // ─── 20. PHQ-A ─────────────────────────────────────────────────────────────
  {
    id: 'phq-a',
    ...questionnaireMetadata,
    name: 'PHQ-A (Adolescent Depression Screen)',
    shortName: 'PHQ-A',
    description:
      'Patient Health Questionnaire Modified for Adolescents (PHQ-A): 9 DSM-based depressive symptom items (0–27) with auto-summing and suicide safety alert, or direct total.',
    category: 'psychiatry',
    tags: ['phq-a', 'depression', 'adolescent', 'screening', 'pediatrics'],
    whenToUse: 'Depression screening and treatment monitoring in adolescents aged 11–17 in pediatric or adolescent clinics.',
    whyUse: 'Validated adolescent adaptation of the PHQ-9 (incorporating irritability); established severity bands guide clinical interventions.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 9-item PHQ-A questionnaire', value: 'survey' },
        { label: 'Direct total score override', value: 'direct' },
      ]),
      numberInput('score', 'PHQ-A total (0–27, direct mode)', {
        min: 0,
        max: 27,
        defaultValue: 12,
        helpText: 'Used only if direct override is selected.',
      }),
      yesNo('item9', 'Item 9 positive (thoughts of self-harm / better off dead — direct mode)', 0),
      selectInput('phqa1', '1. Feeling down, depressed, irritable, or hopeless?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa2', '2. Little interest or pleasure in doing things?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa3', '3. Trouble falling asleep, staying asleep, or sleeping too much?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa4', '4. Feeling tired, or having little energy?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa5', '5. Poor appetite, weight loss, or overeating?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa6', '6. Feeling bad about yourself — or that you are a failure or have let yourself or your family down?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa7', '7. Trouble concentrating on things like school work, reading, or watching TV?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa8', '8. Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
      selectInput('phqa9', '9. Thoughts that you would be better off dead, or of hurting yourself in some way?', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — Several days', value: 1 },
        { label: '2 — More than half the days', value: 2 },
        { label: '3 — Nearly every day', value: 3 },
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score = 0;
      let i9Val = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.phqa1 === undefined)) {
        score = num(values.score, 12);
        if (bool(values.item9)) i9Val = 1;
      } else {
        for (let i = 1; i <= 9; i++) {
          const v = num(values[`phqa${i}`], 0);
          score += v;
          if (i === 9) i9Val = v;
        }
      }

      const item9Flag = i9Val > 0;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'normal',
          label: 'None–minimal depression (0–4)',
          interpretation: 'PHQ-A 0–4: none to minimal depressive symptoms. Routine emotional wellness support; re-screen annually or as indicated.',
        },
        {
          max: 9,
          level: 'low',
          label: 'Mild depression (5–9)',
          interpretation: 'PHQ-A 5–9: mild depressive symptoms. Psychoeducation, supportive counseling, sleep/exercise hygiene, and watchful waiting with re-assessment in 4–6 weeks.',
        },
        {
          max: 14,
          level: 'moderate',
          label: 'Moderate depression (10–14)',
          interpretation: 'PHQ-A 10–14: moderate depression range. Initiate evidence-based psychotherapy (CBT, IPT-A); assess psychosocial stressors and discuss pharmacotherapy (e.g. fluoxetine) if symptoms persist.',
        },
        {
          max: 19,
          level: 'high',
          label: 'Moderately severe depression (15–19)',
          interpretation: 'PHQ-A 15–19: moderately severe depression. Combined psychotherapy and antidepressant medication consultation; close interval follow-up (weekly to biweekly).',
        },
        {
          max: 27,
          level: 'critical',
          label: 'Severe depression (20–27)',
          interpretation: 'PHQ-A 20–27: severe depression. Immediate mental health specialist referral, safety planning, close caregiver supervision, and evaluation for intensive outpatient or inpatient stabilization.',
        },
      ]);

      let { riskLevel, label, interpretation } = r;
      if (item9Flag) {
        riskLevel = 'critical';
        label += ' + Self-Harm / Suicide Alert';
        interpretation += ' CRITICAL SAFETY ALERT: Item 9 is positive (score ' + i9Val + '/3). Perform an immediate youth suicide risk assessment (intent, plan, access to lethal means) and enact a safety plan before discharge.';
      }

      return {
        score,
        unit: '/27',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total score', value: `${score} / 27` },
          { label: 'Item 9 (Suicide/Self-harm)', value: item9Flag ? `Positive (${i9Val}/3)` : 'Negative (0/3)' },
          { label: 'Severity bands', value: '0–4 Minimal · 5–9 Mild · 10–14 Moderate · 15–19 Mod-Severe · 20–27 Severe' },
          { label: 'Entry mode', value: mode === 'survey' ? '9-item questionnaire' : 'Direct override' },
        ],
        alerts: item9Flag ? [
          'Item 9 endorsed: Active thoughts of suicide or self-harm. Immediate clinician safety assessment required.'
        ] : undefined,
      };
    },
    evidence: {
      summary:
        'PHQ-A (Patient Health Questionnaire Modified for Adolescents): 9 items scored 0–3 based on DSM criteria for major depressive disorder over the past 2 weeks (total 0–27). Score ≥10 has 89.5% sensitivity and 77.5% specificity for adolescent MDD.',
      formula: 'Sum of 9 items (each 0–3, total 0–27)',
      validation: 'Johnson JG et al. Validated in adolescent primary care and mental health clinics; endorsed by AAP Guidelines for Adolescent Depression in Primary Care (GLAD-PC).',
      references: [
        {
          title: 'The Patient Health Questionnaire for Adolescents: validation of an instrument for the assessment of mental disorders among adolescent primary care patients',
          citation: 'Johnson JG et al. J Adolesc Health. 2002',
          year: 2002,
          pmid: '11869927',
          doi: '10.1016/s1054-139x(01)00333-0',
        },
        {
          title: 'Guidelines for Adolescent Depression in Primary Care (GLAD-PC): Part I. Practice Preparation, Identification, Assessment, and Initial Management',
          citation: 'Zuckerbrot RA et al. Pediatrics. 2018',
          year: 2018,
          pmid: '29483200',
          doi: '10.1542/peds.2017-4081',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Item 9 positive or score ≥15',
        actions: [
          'Immediate comprehensive suicide risk assessment (ASQ or C-SSRS)',
          'Safety plan involving parents/caregivers; secure all firearms, medications, and sharps',
          'Urgent referral to child & adolescent psychiatry or crisis services if acute danger',
        ],
      },
      {
        condition: 'PHQ-A score 10–14',
        actions: [
          'First-line evidence-based youth psychotherapy (CBT or Interpersonal Psychotherapy for Adolescents)',
          'Engage family in supportive environment and healthy lifestyle routines',
          'Consider FDA-approved adolescent antidepressant (e.g. fluoxetine) if therapy unavailable or refractory',
        ],
      },
    ],
    pearls: [
      'In adolescents, depression often presents as irritability, academic decline, or social withdrawal rather than overt sadness.',
      'Black-box warning: monitor closely for emergence of agitation or suicidal thoughts during antidepressant initiation.',
    ],
  },

  // ─── 21. ASQ suicide screen ────────────────────────────────────────────────
  {
    id: 'asq-suicide',
    ...questionnaireMetadata,
    name: 'ASQ Suicide Risk Screen',
    shortName: 'ASQ',
    description: 'Ask Suicide-Screening Questions (ASQ) — 4 core items + acuity question for youth suicide risk screening.',
    category: 'psychiatry',
    tags: ['asq', 'suicide', 'screening', 'nimh', 'pediatric'],
    whenToUse: 'Universal or targeted suicide risk screening in medical settings (commonly youth; also used more broadly).',
    whyUse: 'Brief validated screen; any “yes” to items 1–4 is a positive screen requiring further assessment.',
    inputs: [
      yesNo('q1', '1. In the past few weeks, have you wished you were dead?'),
      yesNo('q2', '2. In the past few weeks, have you felt that you or your family would be better off if you were dead?'),
      yesNo('q3', '3. In the past week, have you been having thoughts about killing yourself?'),
      yesNo('q4', '4. Have you ever tried to kill yourself?'),
      {
        ...selectInput('q5', '5. Are you having thoughts of killing yourself right now? (acuity — ask if any of 1–4 yes)', [
          { label: 'Not answered / not asked', value: 'unanswered' },
          { label: 'No', value: 'no' },
          { label: 'Yes', value: 'yes' },
        ], 'unanswered', 'Ask item 5 only if any of items 1–4 is yes. A yes here is an acute positive screen — stay with the patient. Do not assume “No” when item 5 has not been answered.'),
        required: false,
      },
    ],
    calculate(values) {
      const q1 = bool(values.q1);
      const q2 = bool(values.q2);
      const q3 = bool(values.q3);
      const q4 = bool(values.q4);
      const q5Raw = values.q5;
      const q5Answered = q5Raw !== undefined && q5Raw !== null && q5Raw !== '' && String(q5Raw).toLowerCase() !== 'unanswered';
      const q5 = q5Answered && bool(q5Raw);
      const coreYes = [q1, q2, q3, q4].filter(Boolean).length;
      const positive = coreYes > 0;
      const acute = positive && q5;
      const acuityPending = positive && !q5Answered;

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'high' | 'critical' | 'normal';

      if (!positive) {
        label = 'Negative screen';
        interpretation =
          'ASQ negative (no to items 1–4). Continue routine care; remain alert to clinical cues and rescreen if status changes.';
        riskLevel = 'normal';
      } else if (acuityPending) {
        label = 'Positive screen — acuity not assessed';
        interpretation = `ASQ positive (${coreYes}/4 core items), but item 5 has not been answered. Ask the acuity question now; do not assume a non-acute result or disposition until current suicidal thoughts are assessed.`;
        riskLevel = 'high';
      } else if (acute) {
        label = 'Positive screen — ACUTE positive (item 5 yes)';
        interpretation = `ASQ positive (${coreYes}/4 core items) with current suicidal thoughts (item 5). This is an acute positive screen — stay with patient, urgent full safety evaluation, remove means, psychiatric emergency pathway.`;
        riskLevel = 'critical';
      } else {
        label = 'Positive screen — non-acute (item 5 no)';
        interpretation = `ASQ positive (${coreYes}/4 core items) but denies current thoughts of killing self (item 5 no). Still requires brief suicide safety assessment (BSSA) / further evaluation before disposition; do not discharge without appropriate assessment and safety plan as indicated.`;
        riskLevel = 'high';
      }

      return {
        score: acute ? 5 : coreYes,
        unit: acute ? 'acute' : acuityPending ? 'core yes; acuity pending' : 'core yes',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Core items yes', value: `${coreYes}/4` },
          { label: 'Item 5 (now)', value: !q5Answered ? 'Not answered' : q5 ? 'Yes' : 'No' },
          { label: 'Screen result', value: !positive ? 'Negative' : acuityPending ? 'Positive; acuity pending' : acute ? 'Acute positive' : 'Non-acute positive' },
        ],
        alerts: acuityPending ? [
          'ASQ core screen is positive, but item 5 (current suicidal thoughts/acuity) is unanswered. Ask item 5 now; do not default to non-acute.',
        ] : acute ? [
          'ASQ item 5 is positive for current suicidal thoughts. Keep the patient safe and obtain urgent/full suicide risk evaluation.',
        ] : positive ? [
          'ASQ core screen is positive. Complete the brief suicide safety assessment before disposition.',
        ] : undefined,
      };
    },
    evidence: {
      summary:
        'ASQ: 4 yes/no screening questions; any yes = positive screen. Question 5 assesses acuity (current thoughts). Developed by NIMH for medical setting screening.',
      formula: 'Any of Q1–Q4 yes → positive; Q5 yes → acute positive',
      validation: 'Validated in pediatric ED and other medical settings; used widely in US hospitals.',
      references: [
        {
          title: 'Ask Suicide-Screening Questions (ASQ)',
          citation: 'Horowitz LM et al. Arch Pediatr Adolesc Med. 2012',
          year: 2012,
          pmid: '23027429',
          doi: '10.1001/archpediatrics.2012.1276',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Acute positive (Q5 yes)',
        actions: ['1:1 safety', 'Urgent psych evaluation', 'Means restriction', 'Do not leave alone'],
      },
      {
        condition: 'Non-acute positive',
        actions: ['Brief suicide safety assessment', 'Safety plan', 'Follow-up', 'Parent/caregiver involvement as appropriate'],
      },
    ],
    pearls: [
      'Positive screen ≠ certain imminent attempt — it mandates further assessment.',
      'Asking about suicide does not plant the idea; it identifies risk.',
    ],
  },

  // ─── 22. Sheehan Disability Scale ──────────────────────────────────────────
  {
    id: 'sheehan',
    name: 'Sheehan Disability Scale (SDS)',
    shortName: 'Sheehan SDS',
    description: 'Interprets Sheehan Disability Scale domain ratings (work/school, social, family; 0–10 each).',
    category: 'psychiatry',
    tags: ['sheehan', 'disability', 'function', 'sds', 'severity'],
    whenToUse: 'Quantify functional impairment from psychiatric symptoms across three life domains.',
    whyUse: 'Simple 0–10 ratings; total and per-domain scores track treatment response and disability.',
    inputs: [
      numberInput('work', 'Work / school impairment', { min: 0, max: 10, defaultValue: 5, helpText: 'Past week: how much have symptoms disrupted this domain? 0 = not at all; 1–3 mild; 4–6 moderate; 7–9 marked; 10 = extreme. Domain ≥5 often = significant impairment.' }),
      numberInput('social', 'Social life impairment', { min: 0, max: 10, defaultValue: 5, helpText: 'Past week: how much have symptoms disrupted this domain? 0 = not at all; 1–3 mild; 4–6 moderate; 7–9 marked; 10 = extreme. Domain ≥5 often = significant impairment.' }),
      numberInput('family', 'Family life / home responsibilities', { min: 0, max: 10, defaultValue: 4, helpText: 'Past week: how much have symptoms disrupted this domain? 0 = not at all; 1–3 mild; 4–6 moderate; 7–9 marked; 10 = extreme. Domain ≥5 often = significant impairment.' }),
      numberInput('days_lost', 'Days lost (optional)', { min: 0, max: 7, defaultValue: 0, helpText: 'Days unable to fulfill role in past week', required: false }),
      numberInput('days_unprod', 'Days underproductive (optional)', { min: 0, max: 7, defaultValue: 0, helpText: 'Days underproductive but present in the past week (0–7)', required: false }),
    ],
    calculate(values) {
      const work = num(values.work, 5);
      const social = num(values.social, 5);
      const family = num(values.family, 4);
      const total = round(work + social + family, 0);
      const r = riskFromThresholds(total, [
        {
          max: 5,
          level: 'low',
          label: 'Mild global impairment',
          interpretation: `SDS total ${total}/30. Relatively mild global disability. Still review any single domain ≥5 as meaningful impairment.`,
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Moderate impairment',
          interpretation: `SDS total ${total}/30. Moderate functional impairment — treatment should target both symptoms and role function.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Marked impairment',
          interpretation: `SDS total ${total}/30. Marked disability across domains — intensify treatment; consider higher level of care if safety or self-care compromised.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Severe / extreme impairment',
          interpretation: `SDS total ${total}/30. Severe functional disability — comprehensive treatment plan and close follow-up.`,
        },
      ]);
      const markedDomains = [
        work >= 5 ? 'work/school' : null,
        social >= 5 ? 'social' : null,
        family >= 5 ? 'family' : null,
      ].filter(Boolean);
      return {
        score: total,
        unit: '/30',
        ...r,
        details: [
          { label: 'Work/school', value: `${work}/10` },
          { label: 'Social', value: `${social}/10` },
          { label: 'Family', value: `${family}/10` },
          { label: 'Domains ≥5 (often “marked”)', value: markedDomains.length ? markedDomains.join(', ') : 'None' },
          { label: 'Days lost', value: isMissingValue(values.days_lost, true) ? 'Not entered' : String(num(values.days_lost, 0)) },
          { label: 'Days underproductive', value: isMissingValue(values.days_unprod, true) ? 'Not entered' : String(num(values.days_unprod, 0)) },
        ],
      };
    },
    evidence: {
      summary:
        'Sheehan Disability Scale rates work/school, social life, and family life 0–10 each (total 0–30). Domain scores ≥5 often indicate significant impairment. Optional days lost/underproductive items track role disruption.',
      formula: 'Total = work + social + family (0–30)',
      validation: 'Widely used in anxiety/depression clinical trials as a functional outcome.',
      references: [
        {
          title: 'Assessing psychiatric impairment in primary care with the Sheehan Disability Scale',
          citation: 'Leon AC, Olfson M, Portera L, Farber L, Sheehan DV. Int J Psychiatry Med. 1997;27:93-105',
          year: 1997,
          pmid: '9565717',
          doi: '10.2190/T8EM-C8YH-373N-1UWD',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Total ≥12 or any domain ≥5',
        actions: ['Optimize treatment', 'Psychotherapy focused on function', 'Workplace/school accommodations as needed'],
      },
    ],
    pearls: ['Function can lag symptom improvement — track both.', 'Not a diagnostic test.'],
  },

  // ─── 23. Zung SDS ──────────────────────────────────────────────────────────
  {
    id: 'sds-zung',
    ...questionnaireMetadata,
    name: 'Zung Self-Rating Depression Scale (SDS)',
    shortName: 'Zung SDS',
    description: 'Zung Self-Rating Depression Scale: 20 items (10 forward, 10 reverse scored; raw 20–80, SDS index 25–100), or direct raw score.',
    category: 'psychiatry',
    tags: ['zung', 'sds', 'depression', 'self-rating'],
    whenToUse: 'Quantitative self-report screening and tracking of depressive symptoms in adults.',
    whyUse: 'Historic, widely published 20-item instrument covering affective, physiological, and psychological aspects of depression.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 20-item SDS questionnaire', value: 'survey' },
        { label: 'Direct raw score override', value: 'direct' },
      ]),
      numberInput('score', 'Zung SDS raw total (20–80, direct mode)', {
        min: 20,
        max: 80,
        defaultValue: 38,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('sds1', '1. I feel down-hearted and blue', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds2', '2. Morning is when I feel the best (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds3', '3. I have crying spells or feel like it', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds4', '4. I have trouble sleeping at night', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds5', '5. I eat as much as I used to (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds6', '6. I still enjoy sex / intimacy (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds7', '7. I notice that I am losing weight', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds8', '8. I have trouble with constipation', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds9', '9. My heart beats faster than usual', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds10', '10. I get tired for no reason', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds11', '11. My mind is as clear as it used to be (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds12', '12. I find it easy to do the things I used to (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds13', '13. I am restless and cannot keep still', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds14', '14. I feel hopeful about the future (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds15', '15. I am more irritable than usual', [
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds16', '16. I find it easy to make decisions (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds17', '17. I feel that I am useful and needed (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds18', '18. My life is pretty full (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sds19', '19. I feel that others would be better off if I were dead', [
        { label: 'Not answered', value: '' },
        { label: 'A little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sds20', '20. I still enjoy the things I used to do (reversed)', [
        { label: 'A little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let raw = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.sds1 === undefined)) {
        raw = Math.max(20, Math.min(80, num(values.score, 38)));
      } else {
        for (let i = 1; i <= 20; i++) {
          raw += Math.max(1, Math.min(4, num(values[`sds${i}`], i === 19 ? 0 : 2)));
        }
      }

      // Classic Zung SDS index = (raw / 80) * 100
      const index = round((raw / 80) * 100, 0);
      const r = riskFromThresholds(index, [
        {
          max: 49,
          level: 'normal',
          label: 'Normal / Non-depressed (Index <50)',
          interpretation: `SDS index ${index} (raw ${raw}/80). Within normal mood range on standard Zung index thresholds (<50).`,
        },
        {
          max: 59,
          level: 'low',
          label: 'Mild to moderate depression (Index 50–59)',
          interpretation: `SDS index ${index} (raw ${raw}/80). Mild to moderate depression range (index 50–59). Clinical diagnostic interview and supportive interventions indicated.`,
        },
        {
          max: 69,
          level: 'moderate',
          label: 'Moderate to marked depression (Index 60–69)',
          interpretation: `SDS index ${index} (raw ${raw}/80). Moderate to marked depression (index 60–69). Active evidence-based psychotherapy and/or antidepressant pharmacotherapy indicated.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Severe / extreme depression (Index ≥70)',
          interpretation: `SDS index ${index} (raw ${raw}/80). Severe depression range (index ≥70). Urgent psychiatric evaluation, safety and suicide risk assessment, and close monitoring.`,
        },
      ]);

      const item19Answered = mode === 'survey' && !isMissingValue(values.sds19) && String(values.sds19).toLowerCase() !== 'unanswered';
      const item19Val = item19Answered ? Math.max(1, Math.min(4, num(values.sds19, 1))) : undefined;
      const deathThoughts = item19Val !== undefined && item19Val >= 1;

      return {
        score: index,
        unit: 'SDS index',
        ...r,
        details: [
          { label: 'SDS Index', value: `${index} (= raw / 80 × 100)` },
          { label: 'Raw Total', value: `${raw} / 80` },
          { label: 'Item 19 (death-related endorsement)', value: item19Val !== undefined ? `${item19Val}/4 — endorsed; assess suicide risk independently` : mode === 'survey' ? 'Not answered' : 'Unavailable from direct total' },
          { label: 'Index bands', value: '<50 Normal · 50–59 Mild · 60–69 Moderate · ≥70 Severe' },
          { label: 'Entry mode', value: mode === 'survey' ? '20-item questionnaire' : 'Direct override' },
        ],
        alerts: deathThoughts ? [
          'Item 19 endorsed (thoughts that others would be better off if dead): Full suicide risk assessment recommended.'
        ] : undefined,
      };
    },
    evidence: {
      summary:
        'Zung Self-Rating Depression Scale (SDS): 20 questions scored 1–4 across 4 response categories (a little, some, good part, most/all of the time). Half the items are positively phrased and reverse-scored. Raw score ranges 20–80; the SDS index is (raw / 80) × 100.',
      formula: 'Raw sum of 20 items (20–80); SDS Index = (Raw / 80) × 100',
      validation: 'Zung WWK. Extensively validated historical depression rating instrument across medical and psychiatric populations.',
      references: [
        {
          title: 'A self-rating depression scale',
          citation: 'Zung WWK. Arch Gen Psychiatry. 1965',
          year: 1965,
          pmid: '14221692',
          doi: '10.1001/archpsyc.1965.01720310065008',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'SDS Index ≥50',
        actions: [
          'Clinical diagnostic interview for Major Depressive Disorder',
          'Evaluate for co-occurring anxiety, substance use, or medical comorbidities',
          'Screen suicide risk and create safety contingency plan',
          'Initiate evidence-based CBT or pharmacotherapy',
        ],
      },
    ],
    pearls: [
      'Contains 8 somatic/physiological items; scores can be artificially inflated in medically ill or geriatric populations.',
      'Always verify reverse-scored items are answered correctly.',
    ],
  },

  // ─── 24. Zung Anxiety (SAS) ────────────────────────────────────────────────
  {
    id: 'sas-zung-anxiety',
    ...questionnaireMetadata,
    name: 'Zung Self-Rating Anxiety Scale (SAS)',
    shortName: 'Zung SAS',
    description: 'Zung Self-Rating Anxiety Scale: 20 items (15 forward, 5 reverse scored; raw 20–80, SAS index 25–100), or direct raw total.',
    category: 'psychiatry',
    tags: ['zung', 'sas', 'anxiety', 'self-rating'],
    whenToUse: 'Self-administered screening and severity assessment of clinical anxiety symptoms.',
    whyUse: 'Captures both psychic and prominent autonomic/somatic manifestations of anxiety (palpitations, trembling, hyperventilation).',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 20-item SAS questionnaire', value: 'survey' },
        { label: 'Direct raw total override', value: 'direct' },
      ]),
      numberInput('score', 'Zung SAS raw total (20–80, direct mode)', {
        min: 20,
        max: 80,
        defaultValue: 35,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('sas1', '1. I feel more nervous and anxious than usual', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas2', '2. I feel afraid for no reason at all', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas3', '3. I get upset easily or feel panicky', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas4', '4. I feel like I am falling apart and going to pieces', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas5', '5. I feel that everything is all right and nothing bad will happen (reversed)', [
        { label: 'None or a little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sas6', '6. My arms and legs shake and tremble', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas7', '7. I am bothered by headaches, neck and back pains', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas8', '8. I feel weak and get tired easily', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas9', '9. I feel calm and can sit still easily (reversed)', [
        { label: 'None or a little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sas10', '10. I can feel my heart beating fast', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas11', '11. I am bothered by dizzy spells', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas12', '12. I have fainting spells or feel like it', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas13', '13. I can breathe in and out easily (reversed)', [
        { label: 'None or a little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sas14', '14. I get feelings of numbness and tingling in my fingers/toes', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas15', '15. I am bothered by stomachaches or indigestion', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas16', '16. I have to empty my bladder often', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas17', '17. My hands are usually warm and dry (reversed)', [
        { label: 'None or a little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sas18', '18. My face gets hot and blushes', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
      selectInput('sas19', '19. I fall asleep easily and get a good night’s rest (reversed)', [
        { label: 'None or a little of the time (4 pts - reversed)', value: 4 },
        { label: 'Some of the time (3 pts - reversed)', value: 3 },
        { label: 'Good part of the time (2 pts - reversed)', value: 2 },
        { label: 'Most or all of the time (1 pt - reversed)', value: 1 },
      ]),
      selectInput('sas20', '20. I have nightmares', [
        { label: 'None or a little of the time (1 pt)', value: 1 },
        { label: 'Some of the time (2 pts)', value: 2 },
        { label: 'Good part of the time (3 pts)', value: 3 },
        { label: 'Most or all of the time (4 pts)', value: 4 },
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let raw = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.sas1 === undefined)) {
        raw = num(values.score, 35);
      } else {
        for (let i = 1; i <= 20; i++) {
          raw += num(values[`sas${i}`], 1);
        }
      }

      const index = round((raw / 80) * 100, 0);
      const r = riskFromThresholds(raw, [
        {
          max: 44,
          level: 'normal',
          label: 'Normal / Below anxiety cutoff (Raw <45)',
          interpretation: `Raw ${raw}/80 (SAS index ≈${index}). Within normal anxiety range on standard Zung SAS bands (raw <45, index <56).`,
        },
        {
          max: 59,
          level: 'low',
          label: 'Mild to moderate anxiety (Raw 45–59)',
          interpretation: `Raw ${raw}/80 (SAS index ≈${index}). Mild to moderate anxiety level. Consider cognitive-behavioral therapy, relaxation training, and lifestyle evaluation.`,
        },
        {
          max: 74,
          level: 'moderate',
          label: 'Marked to severe anxiety (Raw 60–74)',
          interpretation: `Raw ${raw}/80 (SAS index ≈${index}). Marked to severe anxiety symptoms. Diagnostic clarification (GAD, panic disorder, agoraphobia) and active pharmacotherapy/psychotherapy indicated.`,
        },
        {
          max: 80,
          level: 'critical',
          label: 'Extreme anxiety level (Raw ≥75)',
          interpretation: `Raw ${raw}/80 (SAS index ≈${index}). Extreme anxiety state. Comprehensive psychiatric care, crisis stabilization, and rule out panic disorder or acute distress.`,
        },
      ]);
      return {
        score: raw,
        unit: 'raw',
        ...r,
        details: [
          { label: 'Raw Total', value: `${raw} / 80` },
          { label: 'SAS Index', value: `${index} (= raw / 80 × 100)` },
          { label: 'Raw severity bands', value: '<45 Normal · 45–59 Mild–Mod · 60–74 Marked–Sev · ≥75 Extreme' },
          { label: 'Entry mode', value: mode === 'survey' ? '20-item questionnaire' : 'Direct override' },
        ],
      };
    },
    evidence: {
      summary:
        'Zung Self-Rating Anxiety Scale (SAS): 20 items assessing affective and somatic symptoms of anxiety (each 1–4; 5 items reverse-scored). Raw score 20–80; SAS Index = (Raw / 80) × 100. Raw cutoff <45 reflects normal, 45–59 mild–moderate, 60–74 marked–severe, and ≥75 extreme.',
      formula: 'Sum of 20 items (raw 20–80); SAS Index = (Raw / 80) × 100',
      validation: 'Zung WWK. Widely employed in psychopharmacology and clinical trials for quantifying subjective anxiety severity.',
      references: [
        {
          title: 'A rating instrument for anxiety disorders',
          citation: 'Zung WWK. Psychosomatics. 1971',
          year: 1971,
          pmid: '5172928',
          doi: '10.1016/S0033-3182(71)71479-0',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Raw ≥45',
        actions: [
          'Diagnostic evaluation for Generalized Anxiety Disorder, Panic Disorder, or Phobias',
          'Rule out medical precipitants (hyperthyroidism, arrhythmia, caffeine/stimulants, withdrawal)',
          'First-line CBT (exposure, cognitive restructuring) ± SSRI/SNRI pharmacotherapy',
        ],
      },
    ],
    pearls: [
      'Heavily weights autonomic and somatic symptoms of anxiety; differentiate from primary cardiopulmonary or endocrine disease.',
    ],
  },

  // ─── 25. Y-BOCS ────────────────────────────────────────────────────────────
  {
    id: 'yale-brown-ocd',
    ...questionnaireMetadata,
    name: 'Yale–Brown Obsessive Compulsive Scale (Y-BOCS)',
    shortName: 'Y-BOCS',
    description: 'Yale–Brown Obsessive Compulsive Scale: 10 clinician-rated items (5 obsessions + 5 compulsions, 0–40), auto-calculating subscores, or direct total.',
    category: 'psychiatry',
    tags: ['ybocs', 'ocd', 'obsessive', 'compulsive', 'severity'],
    whenToUse: 'Gold-standard assessment of obsessive-compulsive disorder symptom severity and treatment response in adults.',
    whyUse: 'Assesses core dimensions (time, interference, distress, resistance, control) separately for obsessions (0–20) and compulsions (0–20); treatment response defined as ≥35% score reduction.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 10-item Y-BOCS interview', value: 'survey' },
        { label: 'Direct total score override', value: 'direct' },
      ]),
      numberInput('score', 'Y-BOCS total (0–40, direct mode)', {
        min: 0,
        max: 40,
        defaultValue: 20,
        helpText: 'Used only if direct override is selected.',
      }),
      numberInput('obsessions', 'Obsession subtotal (0–20, optional direct)', { min: 0, max: 20, required: false }),
      numberInput('compulsions', 'Compulsion subtotal (0–20, optional direct)', { min: 0, max: 20, required: false }),
      selectInput('ybocs1', '1. Time occupied by obsessive thoughts', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (<1 hr/day or occasional intrusion)', value: 1 },
        { label: '2 — Moderate (1–3 hrs/day or frequent intrusion)', value: 2 },
        { label: '3 — Severe (3–8 hrs/day or very frequent intrusion)', value: 3 },
        { label: '4 — Extreme (>8 hrs/day or near constant intrusion)', value: 4 }
      ]),
      selectInput('ybocs2', '2. Interference due to obsessive thoughts', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (slight interference with activities)', value: 1 },
        { label: '2 — Moderate (definite impairment of performance)', value: 2 },
        { label: '3 — Severe (substantial impairment of activities)', value: 3 },
        { label: '4 — Extreme (incapacitating)', value: 4 }
      ]),
      selectInput('ybocs3', '3. Distress associated with obsessive thoughts', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (infrequent and not disturbing)', value: 1 },
        { label: '2 — Moderate (frequent and disturbing, but manageable)', value: 2 },
        { label: '3 — Severe (very frequent and very disturbing)', value: 3 },
        { label: '4 — Extreme (near constant and disabling distress)', value: 4 }
      ]),
      selectInput('ybocs4', '4. Resistance against obsessions', [
        { label: '0 — Always makes an effort to resist (or minimal obsessions)', value: 0 },
        { label: '1 — Tries to resist most of the time', value: 1 },
        { label: '2 — Makes some effort to resist', value: 2 },
        { label: '3 — Yields to all obsessions with reluctance', value: 3 },
        { label: '4 — Completely and willingly yields to all obsessions', value: 4 }
      ]),
      selectInput('ybocs5', '5. Degree of control over obsessive thoughts', [
        { label: '0 — Complete control', value: 0 },
        { label: '1 — Much control (usually able to stop or divert)', value: 1 },
        { label: '2 — Moderate control (sometimes able to stop or divert)', value: 2 },
        { label: '3 — Little control (rarely successful in stopping)', value: 3 },
        { label: '4 — No control (completely involuntary)', value: 4 }
      ]),
      selectInput('ybocs6', '6. Time spent performing compulsive behaviors', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (<1 hr/day or occasional compulsions)', value: 1 },
        { label: '2 — Moderate (1–3 hrs/day or frequent compulsions)', value: 2 },
        { label: '3 — Severe (3–8 hrs/day or very frequent compulsions)', value: 3 },
        { label: '4 — Extreme (>8 hrs/day or near constant compulsions)', value: 4 }
      ]),
      selectInput('ybocs7', '7. Interference due to compulsive behaviors', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (slight interference with activities)', value: 1 },
        { label: '2 — Moderate (definite impairment of performance)', value: 2 },
        { label: '3 — Severe (substantial impairment of activities)', value: 3 },
        { label: '4 — Extreme (incapacitating)', value: 4 }
      ]),
      selectInput('ybocs8', '8. Distress associated with compulsive behaviors / if prevented', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild (slight anxiety if compulsions prevented)', value: 1 },
        { label: '2 — Moderate (manageable anxiety if compulsions prevented)', value: 2 },
        { label: '3 — Severe (prominent and very disturbing anxiety)', value: 3 },
        { label: '4 — Extreme (incapacitating anxiety if compulsions prevented)', value: 4 }
      ]),
      selectInput('ybocs9', '9. Resistance against compulsions', [
        { label: '0 — Always makes an effort to resist (or minimal compulsions)', value: 0 },
        { label: '1 — Tries to resist most of the time', value: 1 },
        { label: '2 — Makes some effort to resist', value: 2 },
        { label: '3 — Yields to almost all compulsions with reluctance', value: 3 },
        { label: '4 — Completely and willingly yields to all compulsions', value: 4 }
      ]),
      selectInput('ybocs10', '10. Degree of control over compulsive behavior', [
        { label: '0 — Complete control', value: 0 },
        { label: '1 — Much control (experienced pressure but able to control)', value: 1 },
        { label: '2 — Moderate control (can control only with difficulty)', value: 2 },
        { label: '3 — Little control (must be carried to completion)', value: 3 },
        { label: '4 — No control (completely involuntary and overpowering)', value: 4 }
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score = 0;
      let obs: number | undefined;
      let comp: number | undefined;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.ybocs1 === undefined)) {
        score = Math.max(0, Math.min(40, num(values.score, 20)));
        obs = isMissingValue(values.obsessions, true) ? undefined : Math.max(0, Math.min(20, num(values.obsessions, 0)));
        comp = isMissingValue(values.compulsions, true) ? undefined : Math.max(0, Math.min(20, num(values.compulsions, 0)));
      } else {
        obs = 0;
        comp = 0;
        for (let i = 1; i <= 5; i++) {
          obs += Math.max(0, Math.min(4, num(values[`ybocs${i}`], 2)));
        }
        for (let i = 6; i <= 10; i++) {
          comp += Math.max(0, Math.min(4, num(values[`ybocs${i}`], 2)));
        }
        score = obs + comp;
      }

      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'Subclinical OCD (0–7)',
          interpretation: 'Y-BOCS 0–7: subclinical symptoms or remission range. Clinical monitoring; continue relapse prevention strategies if previously treated.',
        },
        {
          max: 15,
          level: 'low',
          label: 'Mild OCD (8–15)',
          interpretation: 'Y-BOCS 8–15: mild OCD symptoms. Exposure and Response Prevention (ERP) is first-line psychotherapy; consider SSRI if ERP unavailable or per patient preference.',
        },
        {
          max: 23,
          level: 'moderate',
          label: 'Moderate OCD (16–23)',
          interpretation: 'Y-BOCS 16–23: moderate OCD. Structured ERP psychotherapy ± high-dose SSRI pharmacotherapy (e.g. fluoxetine 60–80 mg, sertraline 200 mg) recommended.',
        },
        {
          max: 31,
          level: 'high',
          label: 'Severe OCD (24–31)',
          interpretation: 'Y-BOCS 24–31: severe OCD. Combined high-intensity ERP plus high-dose SSRI; assess insight and screen for comorbid depression or suicidal ideation; consider augmentation strategies (aripiprazole, risperidone).',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Extreme OCD (32–40)',
          interpretation: 'Y-BOCS 32–40: extreme/disabling OCD. Specialized intensive outpatient or residential OCD program; multidisciplinary consultation and caregiver support.',
        },
      ]);

      const details = [
        { label: 'Y-BOCS Total', value: `${score} / 40` },
        { label: 'Obsession subtotal (items 1–5)', value: obs !== undefined ? `${obs} / 20` : 'Unavailable from direct total' },
        { label: 'Compulsion subtotal (items 6–10)', value: comp !== undefined ? `${comp} / 20` : 'Unavailable from direct total' },
        { label: 'Clinical bands', value: '0–7 Subclinical · 8–15 Mild · 16–23 Mod · 24–31 Severe · 32–40 Extreme' },
        { label: 'Treatment response', value: '≥35% score reduction is standard trial response criterion' },
        { label: 'Entry mode', value: mode === 'survey' ? '10-item clinician rating' : 'Direct override' },
      ];

      return {
        score,
        unit: '/40',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'Yale–Brown Obsessive Compulsive Scale (Y-BOCS): 10-item clinician-rated instrument assessing time spent, interference, distress, resistance, and degree of control for obsessions (items 1–5, 0–20) and compulsions (items 6–10, 0–20). Total score 0–40.',
      formula: 'Obsession Subtotal (0–20) + Compulsion Subtotal (0–20) = Total (0–40)',
      validation: 'Goodman WK et al. Recognized internationally as the definitive outcome measure for clinical trials and treatment monitoring in OCD.',
      references: [
        {
          title: 'The Yale–Brown Obsessive Compulsive Scale. I. Development, use, and reliability',
          citation: 'Goodman WK et al. Arch Gen Psychiatry. 1989',
          year: 1989,
          pmid: '2684084',
          doi: '10.1001/archpsyc.1989.01810110048007',
        },
        {
          title: 'The Yale–Brown Obsessive Compulsive Scale. II. Validity',
          citation: 'Goodman WK et al. Arch Gen Psychiatry. 1989',
          year: 1989,
          pmid: '2510699',
          doi: '10.1001/archpsyc.1989.01810110054008',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Y-BOCS ≥16',
        actions: [
          'First-line Exposure and Response Prevention (ERP) with qualified CBT therapist',
          'Optimize SSRI dosing (OCD therapeutic doses often higher than MDD doses: e.g. sertraline up to 200mg, fluoxetine up to 80mg)',
          'Allow adequate trial duration: 8–12 weeks at maximum tolerated dose before deeming trial ineffective',
          'Assess degree of insight (overvalued ideas) and tic-related comorbidities',
        ],
      },
    ],
    pearls: [
      'Focuses on severity rather than specific symptom content (use Y-BOCS Symptom Checklist to survey specific obsessions/compulsions).',
      'Benzodiazepines are generally not effective for core OCD obsessions and should be avoided as primary therapy.',
    ],
  },
];
