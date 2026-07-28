import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

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
      const child = String(values.age_group ?? 'adult') === 'child';
      // Common teaching: adult concern ≥150 mg/kg (or ≥7.5–10 g); child often ≥150–200 mg/kg
      const concern = 150;
      const r = riskFromThresholds(mgkg, [
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
    whenToUse: 'Acute ibuprofen (or similar NSAID) overdose with estimated dose and weight.',
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
        { label: 'Acute overdose (not on lithium chronically)', value: 'acute' },
        { label: 'Chronic / therapeutic use toxicity', value: 'chronic' },
        { label: 'Acute-on-chronic', value: 'aoc' },
      ]),
      yesNo('neuro', 'Significant neurotoxicity (AMS, severe tremor, myoclonus, seizure)'),
      yesNo('renal', 'AKI / impaired lithium clearance'),
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
      yesNo('ams', 'Altered mental status / significant CNS depression'),
      yesNo('hyperNH3', 'Hyperammonemia present / suspected'),
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
      yesNo('ams', 'Significant CNS depression / coma'),
      yesNo('seizure', 'Seizure / status risk features'),
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
          title: 'Carbamazepine poisoning',
          citation: 'Spiller HA. Toxicol Rev. / standard toxicology references',
          year: 2001,
          pmid: '11444507',
          doi: '10.1097/00005344-200107000-00011',
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
      yesNo('seizure', 'Seizures'),
      yesNo('unstable', 'Hypotension / life-threatening dysrhythmia'),
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
          title: 'Theophylline toxicity',
          citation: 'Shannon M. / EXTRIP theophylline recommendations',
          year: 1999,
          pmid: '10336520',
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
      yesNo('aki', 'AKI / delayed clearance risk factors'),
      yesNo('third_space', 'Third-spacing / effusion / ascites'),
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
        actions: ['Review glucarpidase criteria', 'Critical care support', 'Do not give leucovorin immediately after glucarpidase (timing rules)'],
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
      yesNo('neuro', 'Syncope, coma, seizure, or focal neuro deficit'),
      yesNo('cardiac', 'Chest pain, ischemia, or significant dysrhythmia'),
      yesNo('pregnant', 'Pregnant'),
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
      yesNo('symptomatic', 'Symptoms (dyspnea, headache, tachycardia, AMS)'),
      yesNo('severe', 'Severe features (coma, seizure, ischemia, profound hypoxia symptoms)'),
      yesNo('g6pd', 'Known G6PD deficiency'),
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
        { label: 'House fire / smoke inhalation', value: 'smoke' },
        { label: 'Industrial / lab cyanide', value: 'industrial' },
        { label: 'Unknown / other', value: 'other' },
      ]),
      numberInput('lactate', 'Serum lactate', { unit: 'mmol/L', min: 0, max: 30, step: 0.1, defaultValue: 8 }),
      yesNo('ams', 'Altered mental status / coma / seizure'),
      yesNo('shock', 'Hypotension / cardiovascular collapse'),
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
          title: 'Cyanide poisoning and hydroxocobalamin',
          citation: 'Borron SW et al. Ann Emerg Med. 2007; smoke inhalation reviews',
          year: 2007,
          pmid: '17963990',
          doi: '10.1016/j.annemergmed.2007.05.027',
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
        { label: 'Mild (SLUDGE features, normal mentation, mild secretions)', value: 'mild' },
        { label: 'Moderate (prominent secretions, wheeze, GI, weakness)', value: 'moderate' },
        { label: 'Severe (respiratory failure, profound bronchorrhea, coma, seizures)', value: 'severe' },
      ]),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 5, max: 200, step: 0.1, defaultValue: 70 }),
      yesNo('bronchorrhea', 'Significant bronchorrhea / hypoxia from secretions'),
      yesNo('bradycardia', 'Symptomatic bradycardia / AV block'),
    ],
    calculate(values) {
      const sev = String(values.severity ?? 'moderate');
      const wt = num(values.weight, 70);
      const bronch = bool(values.bronchorrhea);
      const brady = bool(values.bradycardia);

      // Adult start often 1–3 mg IV; severe much higher/doubling; peds 0.05 mg/kg
      let startMg: number;
      let riskLevel: 'moderate' | 'high' | 'critical';
      let label: string;
      if (sev === 'mild' && !bronch) {
        startMg = Math.max(1, round(0.02 * wt, 1));
        // cap educational adult-ish start
        if (wt >= 50) startMg = 1;
        riskLevel = 'moderate';
        label = 'Mild severity — atropine PRN secretions/HR';
      } else if (sev === 'moderate' || (sev === 'mild' && bronch)) {
        startMg = wt >= 50 ? 2 : round(0.05 * wt, 2);
        riskLevel = 'high';
        label = 'Moderate severity — early IV atropine';
      } else {
        startMg = wt >= 50 ? 3 : round(0.05 * wt, 2);
        riskLevel = 'critical';
        label = 'Severe — aggressive atropine titration';
      }

      if (bronch || brady) {
        if (riskLevel === 'moderate') riskLevel = 'high';
        if (sev === 'severe') riskLevel = 'critical';
      }

      const interpretation =
        `Severity: ${sev}. Suggested educational initial atropine ≈${startMg} mg IV` +
        (wt < 50 ? ' (pediatric-style weight-based frame)' : ' (adult start often 1–3 mg)') +
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
        { label: 'None / puncture only (0)', value: 0 },
        { label: 'Mild pain/swelling local (1)', value: 1 },
        { label: 'Moderate swelling beyond local area (2)', value: 2 },
        { label: 'Severe swelling, ecchymosis, threatened limb (3)', value: 3 },
      ]),
      selectInput('pulmonary', 'Pulmonary symptoms', [
        { label: 'None (0)', value: 0 },
        { label: 'Dyspnea / mild symptoms (1)', value: 1 },
        { label: 'Respiratory failure (2)', value: 2 },
      ]),
      selectInput('cv', 'Cardiovascular', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Tachycardia / mild hypotension (1)', value: 1 },
        { label: 'Shock (2)', value: 2 },
      ]),
      selectInput('heme', 'Bleeding / coagulopathy', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild labs / oozing (1)', value: 1 },
        { label: 'Significant coagulopathy / bleeding (2)', value: 2 },
        { label: 'Severe uncontrolled bleeding (3)', value: 3 },
      ]),
      selectInput('cns', 'CNS', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Mild (dizziness, lethargy) (1)', value: 1 },
        { label: 'Severe (coma, paralysis) (2)', value: 2 },
      ]),
      selectInput('gi', 'GI', [
        { label: 'None (0)', value: 0 },
        { label: 'Nausea / pain (1)', value: 1 },
        { label: 'Repeated vomiting / severe (2)', value: 2 },
      ]),
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
        { label: 'Clean, minor wound', value: 'clean' },
        { label: 'All other wounds (dirty, puncture, burns, crush, etc.)', value: 'dirty' },
      ]),
      selectInput('history', 'Prior tetanus toxoid doses', [
        { label: 'Unknown or <3 doses', value: 'incomplete' },
        { label: '≥3 doses', value: 'complete' },
      ]),
      selectInput('last_dose_years', 'Years since last tetanus-containing vaccine (if ≥3 doses)', [
        { label: 'Not applicable / unknown incomplete series', value: 'na' },
        { label: '<5 years', value: 'lt5' },
        { label: '5–9 years', value: '5to9' },
        { label: '≥10 years', value: 'ge10' },
      ]),
    ],
    calculate(values) {
      const dirty = String(values.wound ?? 'dirty') === 'dirty';
      const incomplete = String(values.history ?? 'incomplete') === 'incomplete';
      const last = String(values.last_dose_years ?? 'na');

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
          tig = false;
          label = vaccine ? 'Booster indicated (dirty wound, ≥5 y)' : 'No booster (dirty, <5 y since last)';
          interpretation = vaccine
            ? '≥3 prior doses with dirty/other wound: give booster if ≥5 years since last dose. TIG not indicated when primary series complete.'
            : '≥3 prior doses, dirty wound, last dose <5 years: no toxoid booster and no TIG needed for tetanus prophylaxis.';
          riskLevel = vaccine ? 'moderate' : 'low';
        } else {
          // clean: booster if ≥10 years
          vaccine = last === 'ge10' || last === 'na';
          tig = false;
          label = vaccine ? 'Booster indicated (clean wound, ≥10 y)' : 'No booster (clean, <10 y)';
          interpretation = vaccine
            ? '≥3 prior doses + clean minor wound: booster if ≥10 years since last dose. Prefer Tdap if indicated (e.g., no prior Tdap adult, pregnancy).'
            : '≥3 prior doses, clean wound, last dose <10 years: no tetanus prophylaxis needed.';
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
          { label: 'Vaccine now', value: vaccine ? 'Yes' : 'No' },
          { label: 'TIG now', value: tig ? 'Yes' : 'No' },
        ],
        recommendations: plan,
      };
    },
    evidence: {
      summary:
        'CDC tetanus prophylaxis: incomplete series → vaccine ± TIG (TIG if dirty). Complete series → booster at 10 y (clean) or 5 y (dirty); TIG not needed if ≥3 doses.',
      formula: 'Wound class × immunization completeness × years since last dose',
      validation: 'Aligned with CDC Pink Book / ACIP wound management tables (educational).',
      references: [
        {
          title: 'CDC Tetanus: wound management',
          citation: 'CDC Pink Book / ACIP recommendations',
          year: 2021,
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
        condition: 'All wounds',
        actions: ['Thorough irrigation/debridement', 'Consider antibiotics if indicated for wound type'],
      },
    ],
    pearls: [
      'Tdap preferred once for adults if never received; use Td/Tdap per current ACIP.',
      'TIG and vaccine at different anatomic sites.',
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
        { label: 'Bat (any contact / possible unrecognized bite)', value: 'bat' },
        { label: 'Dog / cat / ferret (domestic)', value: 'dogcat' },
        { label: 'Raccoon / skunk / fox / other wild carnivore', value: 'wild' },
        { label: 'Livestock / horse / other', value: 'other' },
        { label: 'Rodent / rabbit (rarely indicates PEP)', value: 'rodent' },
      ]),
      selectInput('exposure', 'Exposure type', [
        { label: 'Bite / saliva into wound or mucosa', value: 'bite' },
        { label: 'Nonbite (scratch with saliva, open wound contamination)', value: 'nonbite' },
        { label: 'Bat in room with possible unrecognized contact', value: 'batroom' },
        { label: 'No contact / intact skin only', value: 'none' },
      ]),
      selectInput('prior_vax', 'Prior rabies vaccination', [
        { label: 'Not previously vaccinated', value: 'none' },
        { label: 'Previously vaccinated (pre- or post-exposure series complete)', value: 'prior' },
      ]),
      yesNo('available_observe', 'Healthy dog/cat available for 10-day observation / testing plan'),
    ],
    calculate(values) {
      const animal = String(values.animal ?? 'dogcat');
      const exposure = String(values.exposure ?? 'bite');
      const prior = String(values.prior_vax ?? 'none') === 'prior';
      const observe = bool(values.available_observe);

      if (exposure === 'none' && animal !== 'bat') {
        return {
          score: 0,
          label: 'PEP generally not indicated',
          interpretation: 'No exposure identified. PEP not indicated. Wound care if needed; tetanus as appropriate.',
          riskLevel: 'low' as const,
          details: [{ label: 'HRIG', value: 'No' }, { label: 'Vaccine', value: 'No' }],
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
          'Bat exposures: PEP frequently recommended when bite cannot be ruled out (including bats in room with unattended child, deep sleeper, intoxicated person). Start PEP unless animal tests negative.';
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
          title: 'ACIP rabies vaccine and PEP recommendations',
          citation: 'CDC/ACIP MMWR rabies guidance',
          year: 2022,
          url: 'https://www.cdc.gov/rabies/hcp/clinical-care/post-exposure-prophylaxis.html',
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
        { label: 'Percutaneous solid needle / superficial', value: 'solid' },
        { label: 'Percutaneous hollow-bore, deep, visible blood, vessel', value: 'hollow' },
        { label: 'Mucous membrane / non-intact skin splash', value: 'mucosa' },
        { label: 'Intact skin only', value: 'intact' },
      ]),
      selectInput('source_hiv', 'Source HIV status', [
        { label: 'Unknown', value: 'unknown' },
        { label: 'HIV negative', value: 'neg' },
        { label: 'HIV positive, controlled / low VL', value: 'pos_low' },
        { label: 'HIV positive, high VL / acute / untreated', value: 'pos_high' },
      ]),
      selectInput('hbv_immune', 'Exposed person HBV immunity', [
        { label: 'Immune (anti-HBs adequate)', value: 'immune' },
        { label: 'Unvaccinated / non-immune', value: 'nonimmune' },
        { label: 'Unknown', value: 'unknown' },
      ]),
      yesNo('source_hbsag', 'Source HBsAg positive / high risk HBV'),
      yesNo('within_72h', 'Within 72 hours of exposure'),
    ],
    calculate(values) {
      const exp = String(values.exposure_type ?? 'hollow');
      const hiv = String(values.source_hiv ?? 'unknown');
      const hbvImm = String(values.hbv_immune ?? 'unknown');
      const sourceHbv = bool(values.source_hbsag);
      const within72 = bool(values.within_72h);

      if (exp === 'intact') {
        return {
          score: 0,
          label: 'No BBP PEP for intact skin',
          interpretation: 'Intact skin contact generally does not warrant HIV PEP. Wash skin; baseline testing optional per occupational health.',
          riskLevel: 'low' as const,
          details: [{ label: 'HIV PEP', value: 'Not indicated' }],
        };
      }

      let hivPep = false;
      let hivLabel = 'HIV PEP not routinely indicated';
      if (hiv === 'neg') {
        hivPep = false;
        hivLabel = 'Source HIV negative — HIV PEP not indicated (confirm testing reliability)';
      } else if (hiv === 'pos_high' || (hiv === 'pos_low' && (exp === 'hollow' || exp === 'mucosa'))) {
        hivPep = within72;
        hivLabel = within72
          ? 'HIV PEP indicated — start ASAP (3-drug regimen typical)'
          : 'HIV PEP window (>72 h) — generally not started; specialist consult';
      } else if (hiv === 'unknown' && exp === 'hollow') {
        hivPep = within72;
        hivLabel = within72
          ? 'Source unknown + higher-risk percutaneous — often start HIV PEP pending source testing'
          : 'Outside usual PEP window — occupational health / ID consult';
      } else if (hiv === 'unknown' || hiv === 'pos_low') {
        hivPep = within72 && exp !== 'solid';
        hivLabel = within72
          ? 'Case-by-case HIV PEP — favor start if higher-risk features; stop if source tests negative'
          : 'Consult specialist regarding delayed presentation';
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
        riskLevel: within72 || !hivPep ? riskLevel : 'info',
        details: [
          { label: 'Exposure', value: exp },
          { label: 'Source HIV', value: hiv },
          { label: 'HIV PEP', value: hivPep ? 'Start / indicated' : 'Not indicated or window passed' },
          { label: 'HBV plan', value: hbvPlan },
          { label: 'HCV PEP', value: 'None — surveillance only' },
          { label: 'Ideal HIV PEP start', value: '<2 hours preferred; within 72 h' },
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
        'After BBP exposure: wash wound; evaluate source; HIV PEP ideally ASAP within 72 h for significant exposures; HBV prophylaxis based on immunity and source HBsAg; no HCV PEP — monitor for infection.',
      formula: 'Exposure severity × source status × timing × HBV immunity',
      validation: 'Educational synthesis of USPHS occupational PEP guidance.',
      references: [
        {
          title: 'Updated USPHS guidelines for occupational HIV PEP',
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
      yesNo('acute_onset', 'Acute onset of illness (minutes to hours)'),
      yesNo('skin_mucosa', 'Skin/mucosal involvement (hives, pruritus, flushing, swollen lips/tongue/uvula)'),
      yesNo('resp', 'Respiratory compromise (dyspnea, wheeze, stridor, hypoxemia)'),
      yesNo('hypotension_endorgan', 'Hypotension or end-organ dysfunction (collapse, syncope, incontinence)'),
      yesNo('gi_cramp', 'Persistent GI symptoms (crampy abdominal pain, vomiting) — for criterion 2'),
      yesNo('likely_allergen', 'Likely allergen exposure for this patient'),
      yesNo('known_allergen', 'Known allergen exposure for this patient'),
      yesNo('hypotension_only', 'Hypotension after known allergen (even without skin findings)'),
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
          { label: 'Criterion 1', value: c1 ? 'Met' : 'Not met' },
          { label: 'Criterion 2', value: c2 ? 'Met' : 'Not met' },
          { label: 'Criterion 3', value: c3 ? 'Met' : 'Not met' },
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
        { label: '1 mg/mL (1:1000) IM/SC — correct for anaphylaxis IM', value: '1in1000' },
        { label: 'Using autoinjector only', value: 'auto' },
      ]),
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

      return {
        score: dose,
        unit: 'mg IM',
        label: 'IM epinephrine dose (anterolateral thigh)',
        interpretation: `Give ${dose} mg IM (0.01 mg/kg, max 0.5 mg) in the mid-anterolateral thigh. May repeat q5 min if refractory. Autoinjector guidance: ${auto}. Do not use IV bolus dosing meant for cardiac arrest as first-line anaphylaxis therapy.`,
        riskLevel: 'critical',
        details: [
          { label: 'Weight', value: `${wt} kg` },
          { label: 'Calculated 0.01 mg/kg', value: `${round(raw, 2)} mg (capped at 0.5)` },
          { label: 'Volume of 1 mg/mL', value: `${vol1in1000} mL` },
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
      yesNo('partial_gt10', 'Partial-thickness burns >10% TBSA'),
      yesNo('face_hands_feet', 'Burns involving face, hands, feet, genitalia, perineum, or major joints'),
      yesNo('third_degree', 'Any third-degree (full-thickness) burns'),
      yesNo('electrical', 'Electrical burns including lightning'),
      yesNo('chemical', 'Chemical burns'),
      yesNo('inhalation', 'Inhalation injury'),
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
          citation: 'American Burn Association',
          year: 2018,
          url: 'https://ameriburn.org/public-resources/burn-center-referral-criteria/',
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
    name: 'PHQ-A (Adolescent) Total Interpretation',
    shortName: 'PHQ-A',
    description: 'Interprets PHQ-A / PHQ-9 modified for adolescents total score (0–27) for depression severity.',
    category: 'psychiatry',
    tags: ['phq-a', 'depression', 'adolescent', 'screening', 'pediatrics'],
    whenToUse: 'After administering PHQ-A / adolescent PHQ-9; enter total score for severity bands.',
    whyUse: 'Standard severity interpretation supports treatment intensity and safety assessment in teens.',
    inputs: [
      numberInput('score', 'PHQ-A total (0–27)', {
        min: 0,
        max: 27,
        defaultValue: 12,
        helpText: '9 items scored 0–3; item 9 is suicide ideation — always review',
      }),
      yesNo('item9', 'Item 9 positive (thoughts of self-harm / better off dead)'),
    ],
    calculate(values) {
      const score = num(values.score, 12);
      const item9 = bool(values.item9);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'normal',
          label: 'None–minimal depression',
          interpretation: 'PHQ-A 0–4: none to minimal depressive symptoms. Routine support; rescreen as indicated.',
        },
        {
          max: 9,
          level: 'low',
          label: 'Mild depression',
          interpretation: 'PHQ-A 5–9: mild symptoms — supportive care, therapy consideration, follow-up.',
        },
        {
          max: 14,
          level: 'moderate',
          label: 'Moderate depression',
          interpretation: 'PHQ-A 10–14: moderate depression range — active treatment planning (therapy ± medication).',
        },
        {
          max: 19,
          level: 'high',
          label: 'Moderately severe depression',
          interpretation: 'PHQ-A 15–19: moderately severe — prompt treatment; close follow-up.',
        },
        {
          max: 27,
          level: 'critical',
          label: 'Severe depression',
          interpretation: 'PHQ-A 20–27: severe symptoms — intensive treatment; evaluate safety and higher level of care needs.',
        },
      ]);
      let { riskLevel, label, interpretation } = r;
      if (item9) {
        riskLevel = 'critical';
        interpretation += ' Item 9 positive: perform full suicide risk assessment immediately (intent, plan, means, protective factors) regardless of total score.';
        label += ' + item 9 positive';
      }
      return {
        score,
        unit: '/27',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Bands', value: '0–4 min; 5–9 mild; 10–14 mod; 15–19 mod-sev; 20–27 severe' },
          { label: 'Item 9', value: item9 ? 'Positive' : 'Negative / not flagged' },
        ],
      };
    },
    evidence: {
      summary:
        'PHQ-A adapts PHQ-9 for adolescents. Totals 0–27 with same severity bands commonly used as PHQ-9. Always act on suicidal ideation items.',
      formula: 'Enter total 0–27',
      validation: 'Validated adolescent depression screening instrument family.',
      references: [
        {
          title: 'The Patient Health Questionnaire for Adolescents: validation of an instrument for the assessment of mental disorders among adolescent primary care patients',
          citation: 'Johnson JG et al. J Adolesc Health. 2002',
          year: 2002,
          pmid: '11556941',
          doi: '10.1046/j.1525-1497.2001.016009606.x',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥10 or item 9 positive',
        actions: ['Safety assessment', 'Involve caregivers as appropriate', 'Evidence-based therapy', 'Consider SSRI with close monitoring', 'Urgent care if acute risk'],
      },
    ],
    pearls: [
      'Screening score ≠ diagnosis — confirm DSM criteria and differential.',
      'Black-box monitoring for antidepressants in youth still requires close follow-up.',
    ],
  },

  // ─── 21. ASQ suicide screen ────────────────────────────────────────────────
  {
    id: 'asq-suicide',
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
      yesNo('q5', '5. Are you having thoughts of killing yourself right now? (acuity — ask if any of 1–4 yes)'),
    ],
    calculate(values) {
      const q1 = bool(values.q1);
      const q2 = bool(values.q2);
      const q3 = bool(values.q3);
      const q4 = bool(values.q4);
      const q5 = bool(values.q5);
      const coreYes = [q1, q2, q3, q4].filter(Boolean).length;
      const positive = coreYes > 0;
      const acute = positive && q5;

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'high' | 'critical' | 'normal';

      if (!positive) {
        label = 'Negative screen';
        interpretation =
          'ASQ negative (no to items 1–4). Continue routine care; remain alert to clinical cues and rescreen if status changes.';
        riskLevel = 'normal';
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
        unit: acute ? 'acute' : 'core yes',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Core items yes', value: `${coreYes}/4` },
          { label: 'Item 5 (now)', value: q5 ? 'Yes' : 'No' },
          { label: 'Screen result', value: !positive ? 'Negative' : acute ? 'Acute positive' : 'Non-acute positive' },
        ],
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
      numberInput('work', 'Work / school impairment', { min: 0, max: 10, defaultValue: 5, helpText: '0 = not at all; 10 = extremely' }),
      numberInput('social', 'Social life impairment', { min: 0, max: 10, defaultValue: 5 }),
      numberInput('family', 'Family life / home responsibilities', { min: 0, max: 10, defaultValue: 4 }),
      numberInput('days_lost', 'Days lost (optional)', { min: 0, max: 7, defaultValue: 0, helpText: 'Days unable to fulfill role in past week' }),
      numberInput('days_unprod', 'Days underproductive (optional)', { min: 0, max: 7, defaultValue: 0 }),
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
          { label: 'Days lost', value: String(num(values.days_lost, 0)) },
          { label: 'Days underproductive', value: String(num(values.days_unprod, 0)) },
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
    name: 'Zung Self-Rating Depression Scale',
    shortName: 'Zung SDS',
    description: 'Interprets Zung SDS raw total (20–80) or index for depression severity bands.',
    category: 'psychiatry',
    tags: ['zung', 'sds', 'depression', 'self-rating'],
    whenToUse: 'After patient completes Zung SDS; enter raw total score.',
    whyUse: 'Classic self-report depression scale with established severity index bands.',
    inputs: [
      numberInput('score', 'Zung SDS raw total (20–80)', {
        min: 20,
        max: 80,
        defaultValue: 50,
        helpText: '20 items scored 1–4; half reverse-scored per instrument rules',
      }),
    ],
    calculate(values) {
      const raw = num(values.score, 50);
      // Classic Zung cutoffs apply to SDS index = (raw/80)×100, not raw total
      const index = round((raw / 80) * 100, 0);
      const r = riskFromThresholds(index, [
        {
          max: 49,
          level: 'normal',
          label: 'Normal range (index)',
          interpretation: `SDS index ${index} (raw ${raw}). Within normal range on classic Zung index bands (<50). Not a standalone diagnosis.`,
        },
        {
          max: 59,
          level: 'low',
          label: 'Mild depression range',
          interpretation: `SDS index ${index} (raw ${raw}). Mild depression range (index 50–59). Clinical interview and functional assessment indicated.`,
        },
        {
          max: 69,
          level: 'moderate',
          label: 'Moderate depression range',
          interpretation: `SDS index ${index} (raw ${raw}). Moderate depression range (index 60–69). Active treatment recommended; assess safety.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Severe depression range',
          interpretation: `SDS index ${index} (raw ${raw}). Severe range (index ≥70). Intensive treatment and suicide risk assessment.`,
        },
      ]);
      return {
        score: index,
        unit: 'SDS index',
        ...r,
        details: [
          { label: 'Raw total', value: String(raw) },
          { label: 'SDS index', value: `${index} (= raw/80 × 100)` },
          { label: 'Classic index bands', value: '<50 normal; 50–59 mild; 60–69 moderate; ≥70 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'Zung SDS: 20 items (1–4), raw 20–80. SDS index = (raw/80)×100. Classic severity bands use the index: <50 normal, 50–59 mild, 60–69 moderate, ≥70 severe.',
      formula: 'Enter raw total; index = raw/80 × 100',
      validation: 'Historic self-rating scale; cutoffs vary slightly by population.',
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
        condition: 'Raw ≥50',
        actions: ['Diagnostic interview', 'Safety assessment', 'Therapy ± antidepressants', 'Follow serial scores'],
      },
    ],
    pearls: ['Ensure reverse-scored items were applied correctly before entering total.', 'Language/culture can affect norms.'],
  },

  // ─── 24. Zung Anxiety (SAS) ────────────────────────────────────────────────
  {
    id: 'sas-zung-anxiety',
    name: 'Zung Self-Rating Anxiety Scale (SAS)',
    shortName: 'Zung SAS',
    description: 'Interprets Zung SAS raw total (20–80) for anxiety severity bands.',
    category: 'psychiatry',
    tags: ['zung', 'sas', 'anxiety', 'self-rating'],
    whenToUse: 'After patient completes Zung SAS; enter raw total.',
    whyUse: 'Companion to Zung SDS for self-rated anxiety severity tracking.',
    inputs: [
      numberInput('score', 'Zung SAS raw total (20–80)', {
        min: 20,
        max: 80,
        defaultValue: 45,
        helpText: '20 items scored 1–4 with reverse scoring per form',
      }),
    ],
    calculate(values) {
      const raw = num(values.score, 45);
      const index = round((raw / 80) * 100, 0);
      const r = riskFromThresholds(raw, [
        {
          max: 44,
          level: 'normal',
          label: 'Normal anxiety range',
          interpretation: `Raw ${raw} (index ≈${index}). Within normal range on common Zung SAS bands (raw <45).`,
        },
        {
          max: 59,
          level: 'low',
          label: 'Mild–moderate anxiety range',
          interpretation: `Raw ${raw} (index ≈${index}). Mild to moderate anxiety band (raw 45–59). Consider CBT, further diagnosis (GAD, panic, PTSD, etc.).`,
        },
        {
          max: 74,
          level: 'moderate',
          label: 'Marked / severe anxiety range',
          interpretation: `Raw ${raw} (index ≈${index}). Marked to severe anxiety symptoms (raw 60–74). Active treatment indicated.`,
        },
        {
          max: 80,
          level: 'high',
          label: 'Most extreme anxiety range',
          interpretation: `Raw ${raw} (index ≈${index}). Extreme range (raw ≥75). Intensive treatment; assess for panic, impairment, and substance use.`,
        },
      ]);
      return {
        score: raw,
        unit: 'raw',
        ...r,
        details: [
          { label: 'SAS index', value: String(index) },
          { label: 'Common raw bands', value: '<45 normal; 45–59 mild–mod; 60–74 marked; ≥75 extreme' },
        ],
      };
    },
    evidence: {
      summary:
        'Zung SAS: 20 items, raw 20–80. Common interpretation: <45 normal, 45–59 mild–moderate, 60–74 marked–severe, ≥75 extreme. Index = (raw/80)×100.',
      formula: 'Enter raw total 20–80',
      validation: 'Classic self-rating anxiety scale; cutoffs educational.',
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
        actions: ['Diagnostic clarification', 'CBT / exposure-based therapy', 'Consider SSRI/SNRI', 'Rule out medical mimics'],
      },
    ],
    pearls: ['Somatic items may elevate scores in medical illness — interpret in context.'],
  },

  // ─── 25. Y-BOCS ────────────────────────────────────────────────────────────
  {
    id: 'yale-brown-ocd',
    name: 'Yale–Brown Obsessive Compulsive Scale (Y-BOCS)',
    shortName: 'Y-BOCS',
    description: 'Interprets Y-BOCS total (0–40) for OCD severity after clinician administration.',
    category: 'psychiatry',
    tags: ['ybocs', 'ocd', 'obsessive', 'compulsive', 'severity'],
    whenToUse: 'Enter total Y-BOCS (obsessions 0–20 + compulsions 0–20) for severity banding.',
    whyUse: 'Gold-standard OCD severity measure for baseline and treatment response.',
    inputs: [
      numberInput('score', 'Y-BOCS total (0–40)', {
        min: 0,
        max: 40,
        defaultValue: 20,
        helpText: '10 items (5 obsession + 5 compulsion) scored 0–4 each',
      }),
      numberInput('obsessions', 'Obsession subtotal (optional)', { min: 0, max: 20, defaultValue: 10 }),
      numberInput('compulsions', 'Compulsion subtotal (optional)', { min: 0, max: 20, defaultValue: 10 }),
    ],
    calculate(values) {
      const score = num(values.score, 20);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'Subclinical',
          interpretation: 'Y-BOCS 0–7: subclinical OCD symptoms.',
        },
        {
          max: 15,
          level: 'low',
          label: 'Mild OCD',
          interpretation: 'Y-BOCS 8–15: mild OCD — CBT with ERP first-line; consider meds if preferred/unavailable ERP.',
        },
        {
          max: 23,
          level: 'moderate',
          label: 'Moderate OCD',
          interpretation: 'Y-BOCS 16–23: moderate OCD — ERP ± SSRI at OCD doses; specialty care if available.',
        },
        {
          max: 31,
          level: 'high',
          label: 'Severe OCD',
          interpretation: 'Y-BOCS 24–31: severe OCD — combined ERP + SSRI; consider augmentation strategies if partial response.',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Extreme OCD',
          interpretation: 'Y-BOCS 32–40: extreme OCD — intensive treatment (high-intensity ERP, meds, possible higher level of care).',
        },
      ]);
      return {
        score,
        unit: '/40',
        ...r,
        details: [
          { label: 'Obsession subtotal', value: String(num(values.obsessions, 0)) },
          { label: 'Compulsion subtotal', value: String(num(values.compulsions, 0)) },
          { label: 'Common bands', value: '0–7 subclinical; 8–15 mild; 16–23 mod; 24–31 severe; 32–40 extreme' },
          { label: 'Response (trials)', value: 'Often ≥35% reduction; remission often ≤12–14' },
        ],
      };
    },
    evidence: {
      summary:
        'Y-BOCS total 0–40 (obsessions + compulsions). Severity: 0–7 subclinical, 8–15 mild, 16–23 moderate, 24–31 severe, 32–40 extreme (commonly cited bands).',
      formula: 'Enter total 0–40',
      validation: 'Gold-standard clinician-rated OCD severity scale.',
      references: [
        {
          title: 'The Yale–Brown Obsessive Compulsive Scale',
          citation: 'Goodman WK et al. Arch Gen Psychiatry. 1989',
          year: 1989,
          pmid: '2684084',
          doi: '10.1001/archpsyc.1989.01810110048007',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Y-BOCS ≥16',
        actions: ['ERP-based CBT', 'SSRI at OCD dosing (often higher than depression)', 'Assess insight, tic-related, safety'],
      },
    ],
    pearls: [
      'Y-BOCS measures severity, not symptom checklist content (use Y-BOCS symptom checklist separately).',
      'Avoid routine benzodiazepines as primary OCD therapy.',
    ],
  },
];
