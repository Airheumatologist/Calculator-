import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave2OncologyCalcs: Calculator[] = [
  {
    id: 'car-t-crs',
    name: 'ASTCT CRS Grade (CAR-T)',
    shortName: 'CRS Grade',
    description: 'Simplified ASTCT consensus cytokine release syndrome grade for CAR-T and other cellular therapies.',
    category: 'oncology',
    tags: ['car-t', 'crs', 'astct', 'immunotherapy', 'cytokine'],
    whenToUse: 'Fever or suspected CRS after CAR-T, bispecifics, or other T-cell engagers to assign ASTCT CRS grade.',
    whyUse: 'Standardizes severity for tocilizumab/steroids decisions and trial reporting; grade drives escalation of care.',
    inputs: [
      yesNo('fever', 'Fever ≥ 38.0 °C attributed to CRS', 1, 'Onset fever ≥38.0 °C not solely infection. After antipyretics, tocilizumab, or steroids, fever is no longer required to grade subsequent CRS — grade remaining hypotension/hypoxia. This tool still gates on fever, so ignore “no fever = no CRS” in that treated setting.'),
      selectInput(
        'hypotension',
        'Hypotension / cardiovascular',
        [
          { label: 'None (no hypotension)', value: 0, description: 'No hypotension attributed to CRS; no fluids or vasopressors for blood pressure' },
          { label: 'Hypotension, no vasopressors', value: 2, description: 'IV-fluid–responsive; no vasopressors (ASTCT has no SBP cutoff)' },
          { label: 'One vasopressor (± vasopressin)', value: 3, description: 'One vasopressor; adding vasopressin to that single agent still counts as one (not multiple)' },
          { label: 'Multiple vasopressors (excluding vasopressin alone as second agent)', value: 4, description: '≥2 vasopressors besides vasopressin used only as a second agent with one pressor' },
        ],
        0,
        'Grade by vasopressor requirement, not an SBP cutoff. Vasopressin with a single pressor = one vasopressor (grade 3). Multiple = ≥2 pressors excluding vasopressin-as-second-agent.',
      ),
      selectInput(
        'hypoxia',
        'Hypoxia / oxygen need',
        [
          { label: 'None (no hypoxia)', value: 0, description: 'Room air; no supplemental oxygen for CRS-related hypoxia' },
          { label: 'Low-flow nasal cannula (≤6 L/min) or blow-by', value: 2, description: 'Low-flow NC ≤6 L/min or blow-by oxygen only (ASTCT grade 2 hypoxia)' },
          { label: 'High-flow NC, facemask, nonrebreather, or Venturi', value: 3, description: 'High-flow nasal cannula, simple facemask, nonrebreather, or Venturi mask (ASTCT grade 3)' },
          { label: 'Positive pressure (CPAP, BiPAP, mechanical ventilation)', value: 4, description: 'CPAP, BiPAP, or invasive mechanical ventilation (ASTCT grade 4)' },
        ],
        0,
        'Grade by the oxygen device required for CRS-related hypoxia. Low-flow NC ≤6 L/min or blow-by = grade 2; HFNC/facemask/NRB/Venturi = grade 3; positive pressure = grade 4.',
      ),
    ],
    calculate(values) {
      const fever = bool(values.fever);
      if (!fever) {
        return {
          score: 0,
          label: 'No CRS by ASTCT (no fever)',
          interpretation:
            'ASTCT CRS requires fever ≥38 °C not attributable solely to infection. Without fever, do not grade as CRS; evaluate infection, ICANS, and other causes of shock/hypoxia.',
          riskLevel: 'info',
          details: [{ label: 'Grade', value: 'N/A' }],
        };
      }
      const hypo = num(values.hypotension);
      const ox = num(values.hypoxia);
      const grade = Math.max(1, hypo, ox);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        1: {
          label: 'Grade 1 CRS',
          interpretation:
            'Fever only without hypotension or hypoxia. Supportive care, workup for infection, close monitoring; anti-IL-6 therapy per protocol if progressive symptoms or high-risk product.',
          riskLevel: 'low',
        },
        2: {
          label: 'Grade 2 CRS',
          interpretation:
            'Fever with hypotension not requiring vasopressors and/or hypoxia needing low-flow nasal cannula. Consider tocilizumab (± steroids per product/protocol); escalate monitoring.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Grade 3 CRS',
          interpretation:
            'Fever with hypotension requiring one vasopressor (± vasopressin) and/or hypoxia requiring high-flow O₂, facemask, NRB, or Venturi. ICU-level care; tocilizumab + corticosteroids commonly indicated.',
          riskLevel: 'high',
        },
        4: {
          label: 'Grade 4 CRS',
          interpretation:
            'Fever with life-threatening hypotension (multiple vasopressors) and/or hypoxia needing positive pressure ventilation. Immediate ICU management; anti-IL-6 + high-dose steroids per institutional CAR-T pathway.',
          riskLevel: 'critical',
        },
      };
      const r = map[grade] ?? map[1];
      return {
        score: grade,
        unit: 'grade',
        ...r,
        details: [
          { label: 'Fever', value: 'Yes (≥38 °C)' },
          { label: 'Hypotension tier', value: String(hypo || 0) },
          { label: 'Hypoxia tier', value: String(ox || 0) },
        ],
        recommendations:
          grade >= 3
            ? ['ICU / rapid response', 'Tocilizumab per protocol', 'Corticosteroids', 'Infectious workup', 'Hold further cellular therapy dosing if applicable']
            : grade === 2
              ? ['Close monitoring / step-up care', 'Consider tocilizumab', 'Infectious evaluation']
              : ['Supportive care', 'Serial vitals', 'Rule out infection'],
      };
    },
    evidence: {
      summary:
        'ASTCT CRS grading is driven by fever plus the worst of hypotension or hypoxia organ toxicity tiers (grades 1–4). Grade 5 is death.',
      formula: 'Grade = max(hypotension tier, hypoxia tier) with fever required; fever alone = grade 1',
      validation: 'ASTCT consensus (Lee et al. 2019) adopted widely for CAR-T and bispecific toxicity reporting.',
      references: [
        {
          title: 'ASTCT Consensus Grading for Cytokine Release Syndrome and Neurologic Toxicity Associated with Immune Effector Cells',
          citation: 'Lee DW et al. Biol Blood Marrow Transplant. 2019',
          year: 2019,
          pmid: '30592986',
          doi: '10.1016/j.bbmt.2018.12.758',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Notify cell-therapy team', 'Consider tocilizumab', 'Telemetry / frequent vitals'] },
      { condition: 'Grade ≥3', actions: ['ICU transfer', 'Vasopressors / advanced O₂ as needed', 'Add steroids per protocol'] },
    ],
    pearls: [
      'Infection can coexist with CRS — culture and cover broadly when appropriate.',
      'ICANS is graded separately; CRS and ICANS may occur together.',
    ],
  },

  {
    id: 'icans-grade',
    name: 'ASTCT ICANS Grade',
    shortName: 'ICANS',
    description: 'Simplified immune effector cell-associated neurotoxicity syndrome grade using ICE score and key neurologic features.',
    category: 'oncology',
    tags: ['car-t', 'icans', 'neurotoxicity', 'astct', 'ice'],
    whenToUse: 'Altered mental status, aphasia, seizures, or other neurotoxicity after CAR-T / immune effector cell therapy.',
    whyUse: 'Standard ICANS grade guides steroids, imaging, EEG, and ICU care independent of CRS grade.',
    inputs: [
      numberInput('ice', 'ICE score (0–10)', {
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 10,
        helpText:
          'Orientation 4 (year, month, city, hospital — 1 each) + name 3 objects e.g. clock, pen, button (3) + command e.g. “Show me 2 fingers” or “Close your eyes and stick out your tongue” (1) + write a standard sentence e.g. “Our national bird is the bald eagle” (1) + count backwards from 100 by 10 (1). If unarousable and unable to perform ICE: enter 0 and set consciousness to unarousable (grade 4 — do not treat as arousable ICE 0–2 = grade 3).',
      }),
      selectInput(
        'consciousness',
        'Depressed level of consciousness',
        [
          { label: 'Awakens spontaneously', value: 0, description: 'Opens eyes / awakens without stimulation (ASTCT 0 for this domain; ICE still grades ICANS 1–3 if impaired)' },
          { label: 'Awakens to voice', value: 2, description: 'Requires voice to awaken (ASTCT ICANS grade 2 from consciousness)' },
          { label: 'Awakens only to tactile stimulus', value: 3, description: 'Requires touch to awaken (ASTCT ICANS grade 3 from consciousness)' },
          { label: 'Unarousable or requires vigorous/repetitive stimuli; stupor/coma', value: 4, description: 'Stupor/coma — unarousable or only vigorous/repetitive stimuli. Enter ICE 0; this domain alone is ICANS grade 4' },
        ],
        0,
        'ASTCT consciousness domain. If unarousable, enter ICE 0 and select this grade-4 option — do not leave ICE 0–2 mapped as grade 3.',
      ),
      selectInput(
        'seizure',
        'Seizures',
        [
          { label: 'None', value: 0, description: 'No clinical or electrographic seizure' },
          { label: 'Any clinical seizure, rapid resolution; or non-convulsive seizure on EEG resolving with intervention', value: 3, description: 'Any clinical seizure that resolves rapidly, or NCSE/electrographic seizure that stops with intervention (ASTCT grade 3)' },
          { label: 'Life-threatening prolonged seizure (>5 min) or repetitive clinical/electrical seizures without return to baseline', value: 4, description: 'Seizure >5 min or repeated seizures without recovery to baseline (ASTCT grade 4)' },
        ],
      ),
      selectInput('motor', 'Motor findings', [
        { label: 'None', value: 0, description: 'No deep focal motor weakness' },
        { label: 'Deep focal motor weakness (e.g., hemiparesis, paraparesis)', value: 4, description: 'Deep focal weakness only — not mild weakness or isolated cranial-nerve palsy' },
      ]),
      selectInput('raisedIcp', 'Elevated ICP / cerebral edema', [
        { label: 'None', value: 0, description: 'No imaging or clinical signs of cerebral edema / raised ICP' },
        { label: 'Focal/local edema on neuroimaging', value: 3, description: 'Focal or local edema on CT/MRI without diffuse edema or herniation signs (ASTCT grade 3)' },
        {
          label: 'Diffuse cerebral edema, decerebrate/decorticate posturing, cranial nerve VI palsy, papilledema, or Cushing triad',
          value: 4,
          description: 'Diffuse edema or clinical raised-ICP signs (posturing, CN VI, papilledema, Cushing triad) — ASTCT grade 4',
        },
      ]),
    ],
    calculate(values) {
      const ice = num(values.ice, 10);
      let iceGrade = 0;
      if (ice >= 7 && ice <= 9) iceGrade = 1;
      else if (ice >= 3 && ice <= 6) iceGrade = 2;
      else if (ice >= 0 && ice <= 2) iceGrade = 3;
      // ICE 10 with no other features = grade 0 / no ICANS from ICE alone
      if (ice === 10) iceGrade = 0;

      const grade = Math.max(
        iceGrade,
        num(values.consciousness),
        num(values.seizure),
        num(values.motor),
        num(values.raisedIcp)
      );

      if (grade === 0) {
        return {
          score: 0,
          label: 'No ICANS (grade 0)',
          interpretation: 'ICE 10 without depressed consciousness, seizure, motor weakness, or cerebral edema features. Continue protocol neurologic monitoring.',
          riskLevel: 'low',
          details: [{ label: 'ICE score', value: String(ice) }],
        };
      }

      const labels: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        1: {
          label: 'Grade 1 ICANS',
          interpretation: 'Mild neurotoxicity (e.g., ICE 7–9, awakens spontaneously). Close monitoring; consider imaging/EEG if progressive. Steroids often reserved for higher grade or product-specific protocols.',
          riskLevel: 'low',
        },
        2: {
          label: 'Grade 2 ICANS',
          interpretation: 'Moderate ICANS (e.g., ICE 3–6 or awakens to voice). Neurology input, consider MRI/EEG; corticosteroids commonly started per CAR-T pathway.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Grade 3 ICANS',
          interpretation: 'Severe ICANS (ICE 0–2, awakens only to tactile stimulus, clinical seizure with rapid resolution, or focal edema). ICU consideration, steroids, seizure management, neuroimaging.',
          riskLevel: 'high',
        },
        4: {
          label: 'Grade 4 ICANS',
          interpretation: 'Critical ICANS (unarousable, prolonged/repetitive seizures, deep focal weakness, or diffuse cerebral edema/raised ICP signs). ICU, aggressive steroids, status epilepticus and ICP pathways.',
          riskLevel: 'critical',
        },
      };
      const r = labels[grade] ?? labels[1];
      return {
        score: grade,
        unit: 'grade',
        ...r,
        details: [
          { label: 'ICE score', value: String(ice) },
          { label: 'ICE-derived grade component', value: String(iceGrade) },
        ],
      };
    },
    evidence: {
      summary: 'ICANS grade is the most severe domain among ICE score bands, consciousness, seizures, motor findings, and cerebral edema/ICP features (ASTCT).',
      formula: 'Grade = max(ICE band grade, consciousness, seizure, motor, ICP/edema tiers)',
      validation: 'ASTCT 2019 consensus grading used in CAR-T trials and product labels.',
      references: [
        {
          title: 'ASTCT Consensus Grading for CRS and Neurologic Toxicity',
          citation: 'Lee DW et al. Biol Blood Marrow Transplant. 2019',
          year: 2019,
          pmid: '30592986',
          doi: '10.1016/j.bbmt.2018.12.758',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Cell-therapy / neurology consult', 'Driving restrictions', 'Consider MRI brain + EEG', 'Consider corticosteroids per protocol'] },
      { condition: 'Grade ≥3', actions: ['ICU', 'Corticosteroids per protocol', 'Seizure precautions / AEDs as indicated'] },
    ],
    pearls: [
      'ICE: Orientation year/month/city/hospital (4), name 3 objects (3), follow a command (1), write a standard sentence (1), count backwards from 100 by 10 (1).',
      'If unarousable and ICE cannot be performed, ICE is 0 and ICANS is grade 4 (set consciousness to unarousable) — not the arousable ICE 0–2 = grade 3 band.',
      'CRS grade does not determine ICANS grade — score separately.',
    ],
  },

  {
    id: 'ctcae-neutropenia',
    name: 'CTCAE Neutropenia Grade',
    shortName: 'CTCAE ANC',
    description: 'CTCAE-style neutropenia grade from absolute neutrophil count (ANC).',
    category: 'oncology',
    tags: ['ctcae', 'neutropenia', 'anc', 'chemotherapy', 'toxicity'],
    whenToUse: 'Grading chemo/immunotherapy-related neutropenia for toxicity reporting and G-CSF / delay decisions.',
    whyUse: 'Maps ANC to familiar grade 1–4 thresholds used in protocols and adverse event logs.',
    inputs: [
      numberInput('anc', 'Absolute neutrophil count (ANC)', {
        unit: '×10⁹/L or ×10³/µL',
        min: 0,
        max: 20,
        step: 0.01,
        defaultValue: 1.2,
        helpText: 'Same numeric value for ×10⁹/L and cells ×10³/µL (e.g., 0.5 = 500/µL)',
      }),
    ],
    calculate(values) {
      const anc = num(values.anc, 1.2);
      // Accept raw cells/µL (e.g. 1200) or ×10⁹/L (e.g. 1.2)
      const ancK = anc > 50 ? anc / 1000 : anc;

      let grade = 0;
      let label = 'Grade 0';
      let interpretation = 'ANC ≥1.5 ×10⁹/L — above CTCAE grade 2–4 neutropenia bands. Grade 1 applies only if count is below institutional LLN down to 1.5.';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'normal';

      if (ancK < 0.5) {
        grade = 4;
        label = 'Grade 4 neutropenia';
        interpretation =
          'ANC <0.5 ×10⁹/L (<500/µL): life-threatening infection risk. Hold myelosuppressive therapy per protocol; G-CSF/infection precautions; febrile neutropenia pathway if fever.';
        riskLevel = 'critical';
      } else if (ancK < 1.0) {
        grade = 3;
        label = 'Grade 3 neutropenia';
        interpretation =
          'ANC 0.5–<1.0 ×10⁹/L: severe neutropenia. Dose delay/reduction and growth factor per regimen; counsel on fever precautions.';
        riskLevel = 'high';
      } else if (ancK < 1.5) {
        grade = 2;
        label = 'Grade 2 neutropenia';
        interpretation =
          'ANC 1.0–<1.5 ×10⁹/L: moderate. May prompt delay or modification depending on protocol day and intent.';
        riskLevel = 'moderate';
      } else if (ancK < 2.0) {
        grade = 1;
        label = 'Grade 1 (if < institutional LLN)';
        interpretation =
          'CTCAE grade 1 is <LLN to 1.5 ×10⁹/L. ANC 1.5–<2.0 is grade 1 only when below lab LLN; otherwise grade 0.';
        riskLevel = 'low';
      }

      return {
        score: grade,
        unit: 'grade',
        label,
        interpretation: `${interpretation} Entered ANC ≈ ${round(ancK, 2)} ×10⁹/L.`,
        riskLevel,
        details: [
          { label: 'ANC (normalized)', value: `${round(ancK, 3)} ×10⁹/L` },
          { label: 'CTCAE bands', value: 'G2 1.0–<1.5; G3 0.5–<1.0; G4 <0.5' },
        ],
      };
    },
    evidence: {
      summary: 'CTCAE neutropenia: G1 <LLN–1.5; G2 1.0–<1.5; G3 0.5–<1.0; G4 <0.5 ×10⁹/L.',
      formula: 'Grade from ANC thresholds (×10⁹/L)',
      validation: 'NCI CTCAE used universally in oncology trials; confirm version in protocol.',
      references: [
        { title: 'Common Terminology Criteria for Adverse Events (CTCAE) v5.0', citation: 'National Cancer Institute CTEP. CTCAE v5.0. 2017', year: 2017, url: 'https://dctd.cancer.gov/research/ctep-trials/trial-development' },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥3', actions: ['Fever precautions education', 'Consider G-CSF per regimen', 'Hold/delay chemo per protocol'] },
      { condition: 'Fever + ANC <1.0', actions: ['Treat as febrile neutropenia', 'Urgent broad-spectrum antibiotics'] },
    ],
    pearls: ['Febrile neutropenia is a clinical emergency regardless of exact grade.', 'Duration of neutropenia matters as much as nadir depth.'],
  },

  {
    id: 'ctcae-thrombocytopenia',
    name: 'CTCAE Thrombocytopenia Grade',
    shortName: 'CTCAE Plt',
    description: 'CTCAE-style platelet toxicity grade from platelet count.',
    category: 'oncology',
    tags: ['ctcae', 'thrombocytopenia', 'platelets', 'bleeding', 'chemotherapy'],
    whenToUse: 'Grading treatment-related thrombocytopenia for hold parameters, transfusions, and AE reporting.',
    whyUse: 'Standard platelet grade thresholds used across solid tumor and heme protocols.',
    inputs: [
      numberInput('plt', 'Platelet count', {
        unit: '×10⁹/L',
        min: 0,
        max: 1000,
        step: 1,
        defaultValue: 90,
        helpText: '×10⁹/L equals ×10³/µL numerically (e.g., 50 = 50,000/µL)',
      }),
    ],
    calculate(values) {
      const plt = num(values.plt, 90);
      let grade = 0;
      let label = 'Grade 0';
      let interpretation = 'Platelets not in CTCAE thrombocytopenia grade range (typically ≥ LLN).';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'normal';

      if (plt < 25) {
        grade = 4;
        label = 'Grade 4 thrombocytopenia';
        interpretation = 'Platelets <25 ×10⁹/L: life-threatening bleeding risk. Hold myelosuppressive therapy; consider transfusion per threshold/bleeding; avoid invasive procedures.';
        riskLevel = 'critical';
      } else if (plt < 50) {
        grade = 3;
        label = 'Grade 3 thrombocytopenia';
        interpretation = 'Platelets 25–<50 ×10⁹/L: severe. Usually hold chemo; transfusion if bleeding or pre-procedure per guidelines.';
        riskLevel = 'high';
      } else if (plt < 75) {
        grade = 2;
        label = 'Grade 2 thrombocytopenia';
        interpretation = 'Platelets 50–<75 ×10⁹/L: moderate. May delay treatment depending on regimen (many cytotoxics require ≥75–100).';
        riskLevel = 'moderate';
      } else if (plt < 100) {
        grade = 1;
        label = 'Grade 1 thrombocytopenia (if < LLN)';
        interpretation =
          'CTCAE G1 is <LLN to 75 ×10⁹/L. Values 75–<100 are often still below many labs’ LLN or chemo hold lines — treat as mild thrombocytopenia educationally.';
        riskLevel = 'low';
      }

      return {
        score: grade,
        unit: 'grade',
        label,
        interpretation: `${interpretation} Entered platelets = ${round(plt, 0)} ×10⁹/L.`,
        riskLevel,
        details: [
          { label: 'Platelets', value: `${round(plt, 0)} ×10⁹/L` },
          { label: 'CTCAE G3 / G4', value: '25–<50 / <25' },
        ],
      };
    },
    evidence: {
      summary: 'CTCAE platelets: G1 <LLN–75; G2 50–<75; G3 25–<50; G4 <25 ×10⁹/L.',
      formula: 'Grade from platelet count thresholds',
      validation: 'NCI CTCAE; protocol-specific hold parameters may be stricter.',
      references: [
        { title: 'Common Terminology Criteria for Adverse Events (CTCAE) v5.0', citation: 'National Cancer Institute CTEP. CTCAE v5.0. 2017', year: 2017, url: 'https://dctd.cancer.gov/research/ctep-trials/trial-development' },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥3', actions: ['Hold anticoagulants/antiplatelets if safe', 'Bleeding assessment', 'Transfuse per threshold'] },
      { condition: 'Grade 2–3 pre-chemo', actions: ['Delay or dose-reduce per protocol', 'Rule out HIT/ITP/ consumptive causes if unexpected'] },
    ],
    pearls: ['Spontaneous bleed risk rises sharply below ~10–20 ×10⁹/L but clinical context matters.', 'Do not use this alone for transfusion decisions.'],
  },

  {
    id: 'r-chop-bsa',
    name: 'BSA Chemotherapy Dose (mg/m² × BSA)',
    shortName: 'Chemo BSA Dose',
    description: 'Calculates absolute chemotherapy dose from prescribed mg/m² intensity and body surface area.',
    category: 'oncology',
    tags: ['bsa', 'chemotherapy', 'dosing', 'r-chop', 'mg/m2'],
    whenToUse: 'Any BSA-based cytotoxic (e.g., R-CHOP components, other solid-tumor regimens) when converting mg/m² to mg.',
    whyUse: 'Reduces arithmetic error; optional Mosteller BSA from height/weight when BSA unknown.',
    inputs: [
      numberInput('mgm2', 'Dose intensity', {
        unit: 'mg/m²',
        min: 0.1,
        max: 5000,
        step: 0.1,
        defaultValue: 750,
        helpText: 'e.g., cyclophosphamide 750, doxorubicin 50, vincristine 1.4 (cap often applies)',
      }),
      numberInput('bsa', 'BSA (if known)', {
        unit: 'm²',
        min: 0,
        max: 3.5,
        step: 0.01,
        defaultValue: 0,
        helpText: 'Leave 0 to compute Mosteller BSA from height/weight',
        required: false,
      }),
      numberInput('height', 'Height', { unit: 'cm', min: 0, max: 250, step: 0.1, defaultValue: 170 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 0, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('pctDose', 'Percent of full dose', {
        unit: '%',
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 100,
        helpText: 'Use for dose reductions (e.g., 80%)',
      }),
    ],
    calculate(values) {
      const mgm2 = num(values.mgm2, 750);
      let bsa = num(values.bsa);
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      const pct = num(values.pctDose, 100) / 100;
      let bsaSource = 'entered';
      if (bsa <= 0 && h > 0 && w > 0) {
        bsa = round(Math.sqrt((h * w) / 3600), 2);
        bsaSource = 'Mosteller';
      }
      if (bsa <= 0) {
        return {
          score: 0,
          label: 'Insufficient data',
          interpretation: 'Enter BSA or both height (cm) and weight (kg).',
          riskLevel: 'info',
        };
      }
      const full = mgm2 * bsa;
      const dose = round(full * pct, 1);
      return {
        score: dose,
        unit: 'mg',
        label: 'Calculated dose',
        interpretation: `${mgm2} mg/m² × BSA ${bsa} m² × ${round(pct * 100, 0)}% = ${dose} mg. Educational only — apply drug-specific caps (e.g., vincristine), AUC rules, and pharmacy double-checks.`,
        riskLevel: 'info',
        details: [
          { label: 'BSA', value: `${bsa} m² (${bsaSource})` },
          { label: 'Full 100% dose', value: `${round(full, 1)} mg` },
          { label: 'Percent administered', value: `${round(pct * 100, 0)}%` },
        ],
        recommendations: ['Independent pharmacy verification', 'Check cumulative anthracycline / neurotoxicity caps', 'Adjust for obesity policy if applicable'],
      };
    },
    evidence: {
      summary: 'Absolute dose (mg) = prescribed mg/m² × BSA (m²) × dose fraction. Mosteller: BSA = √([ht_cm × wt_kg]/3600).',
      formula: 'Dose = mg/m² × BSA × (% dose / 100); BSA_Mosteller = sqrt(ht×wt/3600)',
      validation: 'Standard oncology pharmacy practice; always verify against protocol and institutional rounding rules.',
      references: [
        { title: 'Body surface area calculation (Mosteller)', citation: 'Mosteller RD. N Engl J Med. 1987', year: 1987, pmid: '3657876',
          doi: '10.1056/NEJM198710223171717', },
      ],
    },
    nextSteps: [
      { condition: 'Any calculated dose', actions: ['Verify drug and units', 'Apply maximum caps', 'Document BSA method and dose reduction reason'] },
    ],
    pearls: [
      'Vincristine is commonly capped (e.g., 2 mg) regardless of BSA.',
      'Carboplatin usually uses Calvert AUC dosing, not mg/m².',
    ],
  },

  {
    id: 'calvert-carboplatin',
    name: 'Calvert Carboplatin Dose',
    shortName: 'Calvert',
    description: 'Carboplatin dose from target AUC and GFR using the Calvert formula.',
    category: 'oncology',
    tags: ['carboplatin', 'calvert', 'auc', 'chemotherapy', 'gfr'],
    whenToUse: 'Planning carboplatin when target AUC and GFR/CrCl are known (use measured GFR or Cockcroft–Gault/eGFR per protocol).',
    whyUse: 'Standard AUC-based dosing balances efficacy and thrombocytopenia risk better than mg/m² alone.',
    inputs: [
      numberInput('auc', 'Target AUC', {
        unit: 'mg/mL·min',
        min: 1,
        max: 8,
        step: 0.5,
        defaultValue: 5,
        helpText: 'Common targets AUC 4–6 (regimen-specific)',
      }),
      numberInput('gfr', 'GFR or CrCl', {
        unit: 'mL/min',
        min: 5,
        max: 200,
        step: 1,
        defaultValue: 70,
        helpText: 'Many protocols cap GFR at 125 mL/min for Calvert',
      }),
      yesNo('capGfr', 'Cap GFR at 125 mL/min (FDA/common practice)', 0),
    ],
    calculate(values) {
      const auc = num(values.auc, 5);
      let gfr = num(values.gfr, 70);
      const capped = bool(values.capGfr);
      const gfrUsed = capped ? Math.min(gfr, 125) : gfr;
      const dose = round(auc * (gfrUsed + 25), 0);
      return {
        score: dose,
        unit: 'mg',
        label: 'Carboplatin dose (Calvert)',
        interpretation: `Dose = AUC ${auc} × (GFR ${gfrUsed} + 25) = ${dose} mg. Educational estimate — confirm GFR method (not always interchangeable with eGFR), obesity adjustments, and AUC target with the treating regimen.`,
        riskLevel: 'info',
        details: [
          { label: 'GFR entered', value: `${gfr} mL/min` },
          { label: 'Cap GFR at 125', value: capped ? 'Yes' : 'No' },
          { label: 'GFR used', value: `${gfrUsed} mL/min${capped && gfr > 125 ? ' (capped from ' + gfr + ')' : ''}` },
          { label: 'Target AUC', value: String(auc) },
          { label: 'Formula', value: 'AUC × (GFR + 25)' },
        ],
        recommendations: ['Pharmacy independent check', 'Review prior cycle nadir platelets', 'Do not use Cockcroft–Gault blindly in unstable creatinine'],
      };
    },
    evidence: {
      summary: 'Calvert: carboplatin dose (mg) = target AUC × (GFR[mL/min] + 25). GFR often capped at 125 mL/min.',
      formula: 'Dose = AUC × (GFR + 25)',
      validation: 'Derived to achieve target free carboplatin AUC; widely embedded in oncology protocols.',
      references: [
        {
          title: 'Carboplatin dosage: prospective evaluation of a simple formula based on renal function',
          citation: 'Calvert AH et al. J Clin Oncol. 1989',
          year: 1989,
          pmid: '2681557',
          doi: '10.1200/JCO.1989.7.11.1748',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any dose', actions: ['Confirm AUC with protocol', 'Verify GFR source and cap', 'Counsel on nausea and myelosuppression'] },
    ],
    pearls: [
      'GFR + 25 accounts for non-renal clearance.',
      'IDMS creatinine methods can overestimate GFR vs original Calvert era — follow product/protocol guidance.',
    ],
  },

  {
    id: 'okuda',
    name: 'Okuda Staging (HCC)',
    shortName: 'Okuda',
    description: 'Classic Okuda stage for hepatocellular carcinoma using tumor bulk and liver function.',
    category: 'oncology',
    tags: ['hcc', 'okuda', 'liver', 'staging', 'hepatocellular'],
    whenToUse: 'Historical/educational staging of HCC when assessing tumor extent plus hepatic reserve.',
    whyUse: 'Simple four-factor stage that combines anatomy and function; largely superseded by BCLC but still referenced.',
    inputs: [
      yesNo('tumorHalf', 'Tumor involving >50% of liver', 1),
      yesNo('ascites', 'Ascites present', 1, 'Clinically detectable ascites (including diuretic-controlled). Imaging-only trace fluid without clinical ascites is generally not counted.'),
      yesNo('albumin', 'Albumin ≤ 3 g/dL (≤30 g/L)', 1),
      yesNo('bili', 'Total bilirubin ≥ 3 mg/dL (≥51 µmol/L)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.tumorHalf) ? 1 : 0) +
        (bool(values.ascites) ? 1 : 0) +
        (bool(values.albumin) ? 1 : 0) +
        (bool(values.bili) ? 1 : 0);
      let stage = 'I';
      let interpretation =
        'Okuda stage I (0 adverse factors): relatively preserved liver function and less extensive tumor bulk historically associated with better survival.';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (score >= 3) {
        stage = 'III';
        interpretation =
          'Okuda stage III (3–4 factors): advanced disease with poor historical survival; often best supportive care or carefully selected systemic therapy only.';
        riskLevel = 'high';
      } else if (score >= 1) {
        stage = 'II';
        interpretation =
          'Okuda stage II (1–2 factors): intermediate prognosis. Modern BCLC/Child-Pugh/ALBI staging better guides resection, transplant, loco-regional, or systemic therapy.';
        riskLevel = 'moderate';
      }
      return {
        score,
        label: `Okuda stage ${stage}`,
        interpretation,
        riskLevel,
        details: [
          { label: 'Adverse factors', value: `${score} / 4` },
          { label: 'Stage map', value: 'I=0, II=1–2, III=3–4' },
        ],
      };
    },
    evidence: {
      summary: 'One point each: tumor >50% liver, ascites, albumin ≤3 g/dL, bilirubin ≥3 mg/dL. Stage I/II/III = 0 / 1–2 / 3–4.',
      formula: 'Sum of 4 binary factors → Okuda I–III',
      validation: 'Historical HCC staging system; BCLC preferred for treatment allocation today.',
      references: [
        {
          title: 'Natural history of hepatocellular carcinoma and prognosis in relation to treatment',
          citation: 'Okuda K et al. Cancer. 1985',
          year: 1985, pmid: '2990661',
          doi: '10.1002/1097-0142(19850815)56:4<918::aid-cncr2820560437>3.0.co;2-e', },
      ],
    },
    nextSteps: [
      { condition: 'Any stage', actions: ['Stage with multiphase imaging', 'Assess BCLC + Child-Pugh/MELD', 'Multidisciplinary tumor board'] },
    ],
    pearls: ['Okuda does not incorporate performance status or vascular invasion explicitly.', 'Use alongside BCLC for care planning.'],
  },

  {
    id: 'bclc-hcc',
    name: 'BCLC HCC Stage Helper',
    shortName: 'BCLC',
    description: 'Barcelona Clinic Liver Cancer stage approximation from performance status, liver function, and tumor extent.',
    category: 'oncology',
    tags: ['hcc', 'bclc', 'staging', 'liver', 'hepatocellular'],
    whenToUse: 'Treatment-oriented staging of hepatocellular carcinoma in multidisciplinary clinics.',
    whyUse: 'Links tumor burden, liver function, and PS to recommended therapy classes (ablation → transplant/resection → TACE → systemic → BSC).',
    inputs: [
      selectInput('ps', 'ECOG performance status', [
        { label: '0 — Fully active, no restriction', value: 0, description: 'Able to carry on all pre-disease performance without restriction' },
        { label: '1 — Restricted in strenuous activity; ambulatory, light/sedentary work OK', value: 1, description: 'Restricted in physically strenuous activity but ambulatory and able to do light or sedentary work' },
        { label: '2 — Ambulatory, all self-care; unable to work; up >50% of waking hours', value: 2, description: 'Capable of all self-care but unable to carry out any work activities; up and about more than 50% of waking hours' },
        { label: '≥3 — Limited self-care or worse; bed/chair >50% of waking hours', value: 3, description: 'Capable of only limited self-care, confined to bed or chair more than 50% of waking hours, or completely disabled' },
      ]),
      selectInput('liver', 'Liver function', [
        { label: 'Child-Pugh A (well compensated)', value: 'A', description: 'Child-Pugh 5–6 points' },
        { label: 'Child-Pugh B', value: 'B', description: 'Child-Pugh 7–9 points' },
        { label: 'Child-Pugh C', value: 'C', description: 'Child-Pugh 10–15 points' },
      ], undefined, 'Child-Pugh A 5–6 / B 7–9 / C 10–15 from bilirubin, albumin, INR, ascites, and encephalopathy (use the Child-Pugh calculator).'),
      selectInput(
        'tumor',
        'Tumor burden / extent',
        [
          { label: 'Single nodule <2 cm, no invasion/extrahepatic', value: 'very_early', description: 'BCLC 0 candidate: one HCC <2 cm, no vascular invasion, no extrahepatic disease' },
          { label: 'Single nodule or ≤3 nodules ≤3 cm (early), no invasion/EHD', value: 'early', description: 'BCLC A: single HCC (any size if resectable/transplantable context) or ≤3 nodules each ≤3 cm; no invasion or extrahepatic disease' },
          { label: 'Multinodular, unresectable, no invasion/EHD (intermediate)', value: 'intermediate', description: 'BCLC B: multinodular beyond early criteria, still no vascular invasion or extrahepatic spread' },
          { label: 'Portal invasion, N1, and/or M1 (advanced tumor)', value: 'advanced', description: 'BCLC C tumor: portal (or hepatic) vein invasion, nodal disease, and/or distant metastases' },
        ],
        undefined,
        'Use quality multiphase imaging. Extrahepatic disease (EHD) = nodes or distant mets. Invasion = macrovascular (portal/hepatic vein).',
      ),
    ],
    calculate(values) {
      const ps = num(values.ps);
      const liver = String(values.liver ?? 'A');
      const tumor = String(values.tumor ?? 'early');

      // Stage D: terminal — PS ≥3 or Child-Pugh C
      if (ps >= 3 || liver === 'C') {
        return {
          score: 'D',
          label: 'BCLC stage D (terminal)',
          interpretation:
            'PS >2 or Child-Pugh C: terminal stage in classic BCLC — best supportive care. Selected patients may still be transplant candidates under separate pathways.',
          riskLevel: 'critical',
          recommendations: ['Symptom-focused care', 'Palliative care referral', 'Reassess transplant eligibility if appropriate'],
        };
      }

      // Stage C: advanced tumor (vascular invasion / EHD) or cancer-related PS 1–2 with preserved liver function
      if (tumor === 'advanced' || ps === 1 || ps === 2) {
        return {
          score: 'C',
          label: 'BCLC stage C (advanced)',
          interpretation:
            'Advanced HCC: portal invasion/extrahepatic disease and/or PS 1–2 with Child-Pugh A–B. Systemic therapy (IO combinations or TKIs per guidelines) is typical backbone.',
          riskLevel: 'high',
          recommendations: ['Systemic therapy evaluation', 'Clinical trial options', 'Supportive care concurrent'],
        };
      }

      // PS 0 + Child A–B: stages 0 / A / B by tumor burden
      if (tumor === 'very_early' && liver === 'A') {
        return {
          score: '0',
          label: 'BCLC stage 0 (very early)',
          interpretation:
            'Single <2 cm, PS 0, Child-Pugh A: consider curative ablation or resection with excellent prognosis if feasible.',
          riskLevel: 'low',
          recommendations: ['Ablation or resection', 'Ensure no vascular invasion on quality imaging'],
        };
      }
      if (tumor === 'early' || tumor === 'very_early') {
        return {
          score: 'A',
          label: 'BCLC stage A (early)',
          interpretation:
            'Early HCC: single tumor or ≤3 nodules ≤3 cm, PS 0, Child-Pugh A–B. Curative options include resection, ablation, or transplant if within criteria (e.g., Milan).',
          riskLevel: 'low',
          recommendations: ['Resection / ablation / transplant evaluation', 'Bridge therapy if listed'],
        };
      }
      if (tumor === 'intermediate') {
        return {
          score: 'B',
          label: 'BCLC stage B (intermediate)',
          interpretation:
            'Multinodular HCC without invasion/EHD, PS 0, Child-Pugh A–B. Conventional pathway is loco-regional therapy (e.g., TACE); selected patients may receive systemic therapy or transplant after downstaging.',
          riskLevel: 'moderate',
          recommendations: ['TACE or other loco-regional options', 'Consider downstaging to transplant criteria'],
        };
      }

      return {
        score: '?',
        label: 'Unable to map cleanly',
        interpretation: 'Review inputs against full BCLC algorithm (updates exist for Child-Pugh B substaging and treatment expansions).',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary:
        'BCLC stages 0/A/B/C/D from PS, Child-Pugh, and tumor extent (very early → early → intermediate → advanced → terminal).',
      formula: 'PS + liver function + tumor burden → BCLC 0/A/B/C/D',
      validation: 'Widely used treatment-staging system; periodic updates refine therapy by stage.',
      references: [
        {
          title: 'BCLC strategy for prognosis prediction and treatment recommendation: The 2022 update',
          citation: 'Reig M et al. J Hepatol. 2022',
          year: 2022, pmid: '34801630', doi: '10.1016/j.jhep.2021.11.018' },
      ],
    },
    nextSteps: [
      { condition: 'Stage 0–A', actions: ['Curative-intent MDT', 'Transplant criteria check'] },
      { condition: 'Stage B–C', actions: ['Loco-regional vs systemic sequencing', 'Clinical trial screen'] },
      { condition: 'Stage D', actions: ['Palliative care', 'Symptom control'] },
    ],
    pearls: [
      'BCLC is treatment-oriented, not a pure TNM anatomic stage.',
      'Transplant exceptions and downstaging can move patients across pathways.',
    ],
  },

  {
    id: 'clip-score',
    name: 'CLIP Score (HCC)',
    shortName: 'CLIP',
    description: 'Cancer of the Liver Italian Program score for hepatocellular carcinoma prognosis.',
    category: 'oncology',
    tags: ['hcc', 'clip', 'prognosis', 'liver', 'afp'],
    whenToUse: 'Prognostic stratification of HCC using Child-Pugh, morphology, AFP, and portal thrombosis.',
    whyUse: 'Simple 0–6 score with survival gradients; complementary to BCLC/Okuda.',
    inputs: [
      selectInput('child', 'Child-Pugh class', [
        { label: 'A (0 points)', value: 0, description: 'Child-Pugh 5–6' },
        { label: 'B (1 point)', value: 1, description: 'Child-Pugh 7–9' },
        { label: 'C (2 points)', value: 2, description: 'Child-Pugh 10–15' },
      ], undefined, 'Child-Pugh A 5–6 / B 7–9 / C 10–15 from bilirubin, albumin, INR, ascites, and encephalopathy (use the Child-Pugh calculator).'),
      selectInput(
        'morphology',
        'Tumor morphology',
        [
          { label: 'Uninodular and extension ≤50% (0)', value: 0, description: 'Single nodule occupying ≤50% of the liver' },
          { label: 'Multinodular and extension ≤50% (1)', value: 1, description: 'More than one nodule, combined extent still ≤50% of the liver' },
          { label: 'Massive or extension >50% (2)', value: 2, description: 'Massive tumor or any pattern occupying >50% of the liver' },
        ],
        undefined,
        'CLIP morphology from imaging: uninodular ≤50% vs multinodular ≤50% vs massive/>50% involvement.',
      ),
      selectInput('afp', 'AFP (ng/mL)', [
        { label: '< 400 (0)', value: 0, description: 'AFP <400 ng/mL' },
        { label: '≥ 400 (1)', value: 1, description: 'AFP ≥400 ng/mL (CLIP point)' },
      ]),
      yesNo('pvt', 'Portal vein thrombosis', 1, 'Macroscopic portal vein tumor thrombosis (or bland PVT counted as in original CLIP if recorded as PVT).'),
    ],
    calculate(values) {
      const score = num(values.child) + num(values.morphology) + num(values.afp) + (bool(values.pvt) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'CLIP 0 — best prognosis',
          interpretation: 'Lowest CLIP score; historically best median survival among HCC cohorts using this model.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'CLIP 1–2 — intermediate',
          interpretation: 'Intermediate prognosis. Integrate with BCLC for therapy; consider loco-regional or systemic options based on stage.',
        },
        {
          max: 4,
          level: 'high',
          label: 'CLIP 3–4 — poorer prognosis',
          interpretation: 'Higher risk mortality. Systemic therapy or best supportive care often appropriate depending on PS and liver function.',
        },
        {
          max: 10,
          level: 'critical',
          label: 'CLIP 5–6 — worst prognosis',
          interpretation: 'Highest CLIP scores with historically very limited survival; focus on goals of care and symptom control.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Score range', value: '0–6' },
          { label: 'Components', value: 'Child-Pugh + morphology + AFP + PVT' },
        ],
      };
    },
    evidence: {
      summary: 'CLIP = Child-Pugh (0–2) + morphology (0–2) + AFP≥400 (0–1) + PVT (0–1).',
      formula: 'Sum 0–6 as above',
      validation: 'Italian multicenter program; external validations show prognostic gradient.',
      references: [
        {
          title: 'A new prognostic system for hepatocellular carcinoma: a retrospective study of 435 patients',
          citation: 'CLIP investigators. Hepatology. 1998',
          year: 1998, pmid: '9731568',
          doi: '10.1002/hep.510280322', },
      ],
    },
    nextSteps: [
      { condition: 'Any score', actions: ['Pair with BCLC for treatment', 'Optimize liver disease modifiers'] },
    ],
  },

  {
    id: 'milan-criteria',
    name: 'Milan Criteria (HCC Transplant)',
    shortName: 'Milan',
    description: 'Checks whether HCC tumor burden falls within classic Milan criteria for liver transplant.',
    category: 'oncology',
    tags: ['hcc', 'milan', 'transplant', 'liver', 'unocs'],
    whenToUse: 'Evaluating HCC patients for liver transplant candidacy by size/number limits.',
    whyUse: 'Within-Milan disease has excellent post-transplant survival; foundation of many allocation policies (with regional expansions).',
    inputs: [
      selectInput('pattern', 'Tumor pattern', [
        { label: 'Single tumor', value: 'single' },
        { label: 'Multiple tumors (2–3)', value: 'multi' },
        { label: 'More than 3 tumors', value: 'many' },
      ]),
      numberInput('largest', 'Largest tumor diameter', { unit: 'cm', min: 0.1, max: 30, step: 0.1, defaultValue: 3 }),
      numberInput('count', 'Number of tumors (if multiple)', { min: 1, max: 20, step: 1, defaultValue: 2 }),
      yesNo('vascular', 'Macrovascular invasion', -1),
      yesNo('extrahepatic', 'Extrahepatic disease', -1),
    ],
    calculate(values) {
      const pattern = String(values.pattern ?? 'single');
      const largest = num(values.largest, 3);
      const count = num(values.count, 2);
      const vascular = bool(values.vascular);
      const ehd = bool(values.extrahepatic);

      const patternLabel =
        pattern === 'single' ? 'Single tumor' : pattern === 'multi' ? 'Multiple tumors (2–3)' : 'More than 3 tumors';

      if (vascular || ehd) {
        return {
          score: 0,
          label: 'Outside Milan',
          interpretation:
            'Macrovascular invasion or extrahepatic disease excludes Milan criteria. Consider downstaging protocols, systemic therapy, or non-transplant pathways.',
          riskLevel: 'high',
          details: [
            { label: 'Tumor pattern', value: patternLabel },
            { label: 'Largest tumor', value: `${largest} cm` },
            { label: 'Tumor count entered', value: String(count) },
            { label: 'Vascular invasion', value: vascular ? 'Yes' : 'No' },
            { label: 'Extrahepatic disease', value: ehd ? 'Yes' : 'No' },
          ],
        };
      }

      // Milan: single ≤5 cm OR up to 3 lesions each ≤3 cm — pattern drives branch when count is ambiguous
      let within = false;
      let reason = '';
      if (pattern === 'many' || count > 3) {
        within = false;
        reason = pattern === 'many' || count > 3
          ? `>3 tumors (pattern: ${patternLabel}, count ${count}) exceeds Milan number limit`
          : '>3 tumors exceeds Milan number limit';
      } else if (pattern === 'single' || (pattern !== 'multi' && count === 1)) {
        within = largest <= 5;
        reason = within
          ? `Single tumor ${largest} cm ≤ 5 cm`
          : `Single tumor ${largest} cm > 5 cm`;
      } else {
        // multi (2–3)
        const n = Math.min(Math.max(count, 2), 3);
        within = n <= 3 && largest <= 3;
        reason = within
          ? `${n} tumors, largest ${largest} cm — each ≤3 cm and ≤3 nodules`
          : `${count} tumors, largest ${largest} cm — fails ≤3 nodules each ≤3 cm`;
      }

      if (within) {
        return {
          score: 1,
          label: 'Within Milan criteria',
          interpretation: `${reason}. Eligible size/number criteria for classic Milan transplant listing (center protocols and AFP/biology still apply).`,
          riskLevel: 'low',
          details: [
            { label: 'Tumor pattern', value: patternLabel },
            { label: 'Largest tumor', value: `${largest} cm` },
            { label: 'Tumor count used', value: String(count) },
            { label: 'Vascular invasion', value: 'No' },
            { label: 'Extrahepatic disease', value: 'No' },
          ],
          recommendations: ['Transplant center referral if candidate', 'Bridge therapy as indicated', 'Surveillance imaging'],
        };
      }
      return {
        score: 0,
        label: 'Outside Milan criteria',
        interpretation: `${reason}. May still qualify for expanded criteria (e.g., UCSF), downstaging, or living-donor pathways at selected centers.`,
        riskLevel: 'moderate',
        details: [
          { label: 'Tumor pattern', value: patternLabel },
          { label: 'Largest tumor', value: `${largest} cm` },
          { label: 'Tumor count used', value: String(count) },
          { label: 'Vascular invasion', value: 'No' },
          { label: 'Extrahepatic disease', value: 'No' },
        ],
        recommendations: ['Discuss expanded criteria / downstaging', 'Oncology + hepatology MDT'],
      };
    },
    evidence: {
      summary: 'Milan: 1 lesion ≤5 cm OR up to 3 lesions each ≤3 cm; no vascular invasion; no extrahepatic disease.',
      formula: 'Single ≤5 cm OR 2–3 each ≤3 cm; no VI/EHD',
      validation: 'Mazzaferro et al.; excellent post-LT survival established Milan as allocation benchmark.',
      references: [
        {
          title: 'Liver transplantation for the treatment of small hepatocellular carcinomas in patients with cirrhosis',
          citation: 'Mazzaferro V et al. N Engl J Med. 1996',
          year: 1996,
          pmid: '8594428',
          doi: '10.1056/NEJM199603143341104',
        },
      ],
    },
    nextSteps: [
      { condition: 'Within Milan', actions: ['List evaluation', 'AFP and imaging protocol', 'Bridge loco-regional therapy'] },
      { condition: 'Outside Milan', actions: ['Downstaging consideration', 'Systemic/loco-regional options'] },
    ],
  },

  {
    id: 'recist',
    name: 'RECIST 1.1 Response Category',
    shortName: 'RECIST',
    description: 'Assigns RECIST 1.1 response category from percent change in sum of target lesion diameters.',
    category: 'oncology',
    tags: ['recist', 'response', 'imaging', 'clinical trial', 'target lesions'],
    whenToUse: 'Radiologic response assessment using sum of longest diameters of target lesions (and knowledge of new lesions).',
    whyUse: 'Standard trial/clinical language for CR/PR/SD/PD; educational calculator for % change mapping.',
    inputs: [
      numberInput('pctChange', 'Percent change in sum of diameters', {
        unit: '%',
        min: -100,
        max: 500,
        step: 0.1,
        defaultValue: -25,
        helpText: 'Negative = decrease vs baseline (or nadir for PD rules). (current − baseline) / baseline × 100',
      }),
      yesNo('newLesions', 'New lesions present', 1),
      yesNo('completeDisappearance', 'All target lesions disappeared (and nodes <10 mm short axis if applicable)', 1),
      numberInput('absIncreaseMm', 'Absolute increase in sum vs nadir (if progressing)', {
        unit: 'mm',
        min: 0,
        max: 500,
        step: 0.1,
        defaultValue: 0,
        helpText: 'PD requires ≥20% increase AND ≥5 mm absolute increase vs nadir',
      }),
    ],
    calculate(values) {
      const pct = num(values.pctChange, -25);
      const newLesions = bool(values.newLesions);
      const cr = bool(values.completeDisappearance);
      const absInc = num(values.absIncreaseMm, 0);

      if (newLesions) {
        return {
          score: 'PD',
          label: 'Progressive disease (new lesions)',
          interpretation: 'Appearance of new malignant lesions constitutes PD in RECIST 1.1 regardless of target sum change.',
          riskLevel: 'high',
        };
      }
      if (cr && pct <= -100) {
        return {
          score: 'CR',
          label: 'Complete response',
          interpretation: 'Disappearance of all target lesions (nodes short axis <10 mm). Non-target lesions must also meet CR rules clinically.',
          riskLevel: 'low',
        };
      }
      if (cr) {
        return {
          score: 'CR',
          label: 'Complete response (targets)',
          interpretation: 'All target lesions reported disappeared. Confirm non-target CR/non-CR/non-PD rules and tumor marker context separately.',
          riskLevel: 'low',
        };
      }
      // PD: ≥20% increase and ≥5 mm absolute
      if (pct >= 20 && absInc >= 5) {
        return {
          score: 'PD',
          label: 'Progressive disease',
          interpretation: `Sum increased ${pct}% with absolute increase ${absInc} mm (≥20% and ≥5 mm vs nadir) → PD.`,
          riskLevel: 'high',
        };
      }
      if (pct >= 20 && absInc < 5) {
        return {
          score: 'SD*',
          label: 'Not PD by absolute mm rule',
          interpretation: `≥20% relative increase but absolute increase ${absInc} mm <5 mm — does not meet full PD criteria on targets alone. Reassess measurements and non-targets.`,
          riskLevel: 'moderate',
        };
      }
      if (pct <= -30) {
        return {
          score: 'PR',
          label: 'Partial response',
          interpretation: `≥30% decrease in sum of diameters (${pct}%) → PR, provided no new lesions and non-targets not PD.`,
          riskLevel: 'low',
        };
      }
      return {
        score: 'SD',
        label: 'Stable disease',
        interpretation: `Neither PR (≥30% decrease) nor PD (≥20% + ≥5 mm). Change = ${pct}%. Confirm non-target status.`,
        riskLevel: 'moderate',
        details: [{ label: '% change', value: `${pct}%` }],
      };
    },
    evidence: {
      summary: 'RECIST 1.1: CR disappearance; PR ≤−30%; PD ≥+20% and ≥5 mm (or new lesions); else SD.',
      formula: '% change = (current sum − reference) / reference × 100',
      validation: 'Eisenhauer et al. RECIST 1.1; standard for solid tumor trials.',
      references: [
        {
          title: 'New response evaluation criteria in solid tumours: revised RECIST guideline (version 1.1)',
          citation: 'Eisenhauer EA et al. Eur J Cancer. 2009',
          year: 2009,
          pmid: '19097774',
          doi: '10.1016/j.ejca.2008.10.026',
        },
      ],
    },
    nextSteps: [
      { condition: 'PR/CR', actions: ['Continue therapy if tolerated', 'Confirm with follow-up scan per protocol'] },
      { condition: 'PD', actions: ['Consider treatment change', 'Biopsy if mixed/atypical response (e.g., immunotherapy)'] },
    ],
    pearls: [
      'Immunotherapy may need iRECIST for pseudoprogression patterns.',
      'Always use consistent imaging modality and target lesion set.',
    ],
  },

  {
    id: 'iperformance',
    name: 'ECOG Performance Status',
    shortName: 'ECOG PS',
    description: 'Eastern Cooperative Oncology Group performance status scale (0–5).',
    category: 'oncology',
    tags: ['ecog', 'performance status', 'functional status', 'oncology'],
    whenToUse: 'Baseline and serial functional assessment for treatment eligibility, trials, and prognosis.',
    whyUse: 'Universal oncology language for fitness; many regimens require PS 0–1 or 0–2.',
    inputs: [
      selectInput(
        'ps',
        'ECOG performance status',
        [
          { label: '0 — Fully active, no restriction', value: 0, description: 'Able to carry on all pre-disease performance without restriction' },
          { label: '1 — Restricted in strenuous activity; ambulatory, light work OK', value: 1, description: 'Restricted in physically strenuous activity but ambulatory and able to do light or sedentary work' },
          { label: '2 — Ambulatory, all self-care; no work; up >50% of waking hours', value: 2, description: 'Capable of all self-care but unable to carry out any work activities; up and about more than 50% of waking hours' },
          { label: '3 — Limited self-care; confined to bed/chair >50% of waking hours', value: 3, description: 'Capable of only limited self-care; confined to bed or chair more than 50% of waking hours' },
          { label: '4 — Completely disabled; no self-care; totally confined to bed/chair', value: 4, description: 'Completely disabled; cannot carry on any self-care; totally confined to bed or chair' },
          { label: '5 — Dead', value: 5, description: 'Dead' },
        ],
        0,
        'Oken/ECOG scale. Grade current function (not a best-ever). PS 2 vs 3 hinge is whether the patient is up more than half of waking hours and can do all self-care.',
      ),
    ],
    calculate(values) {
      const ps = num(values.ps);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }> = {
        0: {
          label: 'ECOG 0',
          interpretation: 'Fully active; able to carry on all pre-disease performance without restriction. Typically eligible for most intensive therapies and trials.',
          riskLevel: 'low',
        },
        1: {
          label: 'ECOG 1',
          interpretation: 'Restricted in physically strenuous activity but ambulatory and able to do light or sedentary work. Commonly eligible for systemic therapy.',
          riskLevel: 'low',
        },
        2: {
          label: 'ECOG 2',
          interpretation: 'Ambulatory and capable of all self-care but unable to work; up and about >50% of waking hours. Borderline for many intensive regimens — individualize.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'ECOG 3',
          interpretation: 'Capable of only limited self-care; confined to bed or chair >50% of waking hours. Often unsuitable for cytotoxic chemo; consider palliative-focused approaches.',
          riskLevel: 'high',
        },
        4: {
          label: 'ECOG 4',
          interpretation: 'Completely disabled; cannot carry on any self-care; totally confined to bed or chair. Best supportive care usually appropriate.',
          riskLevel: 'critical',
        },
        5: {
          label: 'ECOG 5',
          interpretation: 'Dead.',
          riskLevel: 'info',
        },
      };
      const r = map[ps] ?? map[0];
      return { score: ps, unit: 'ECOG', ...r };
    },
    evidence: {
      summary: 'ECOG PS 0–5 describes activity and self-care capacity; cornerstone of oncology eligibility and prognosis.',
      formula: 'Ordinal scale 0–5 as defined by Oken/ECOG',
      validation: 'Universally used; correlates with survival and treatment tolerance.',
      references: [
        {
          title: 'Toxicity and response criteria of the Eastern Cooperative Oncology Group',
          citation: 'Oken MM et al. Am J Clin Oncol. 1982',
          year: 1982, pmid: '7165009', doi: '10.1097/00000421-198212000-00014' },
      ],
    },
    nextSteps: [
      { condition: 'PS 0–1', actions: ['Standard oncology pathways / trial eligibility review'] },
      { condition: 'PS ≥3', actions: ['Goals-of-care discussion', 'Limit intensive therapy', 'Palliative care'] },
    ],
    pearls: ['Convert roughly with Karnofsky: ECOG 0≈100, 1≈80–90, 2≈60–70, 3≈40–50, 4≈10–30.', 'Patient-reported and clinician PS can differ — document source.'],
  },

  {
    id: 'karnofsky',
    name: 'Karnofsky Performance Status',
    shortName: 'KPS',
    description: 'Karnofsky Performance Status scale (0–100 in 10-point increments).',
    category: 'oncology',
    tags: ['karnofsky', 'kps', 'performance status', 'functional'],
    whenToUse: 'Functional assessment when KPS is preferred (transplant, some solid tumors, palliative research).',
    whyUse: 'Finer granularity than ECOG; used in Motzer/IMDC (KPS <80) and transplant pathways.',
    inputs: [
      selectInput('kps', 'Karnofsky score', [
        { label: '100 — Normal; no complaints; no evidence of disease', value: 100 },
        { label: '90 — Normal activity; minor signs/symptoms', value: 90 },
        { label: '80 — Normal activity with effort; some signs/symptoms', value: 80 },
        { label: '70 — Cares for self; unable to carry on normal activity or work', value: 70 },
        { label: '60 — Requires occasional assistance; cares for most needs', value: 60 },
        { label: '50 — Requires considerable assistance and frequent medical care', value: 50 },
        { label: '40 — Disabled; requires special care and assistance', value: 40 },
        { label: '30 — Severely disabled; hospital admission indicated', value: 30 },
        { label: '20 — Very sick; hospital admission necessary; active supportive treatment', value: 20 },
        { label: '10 — Moribund; fatal processes progressing rapidly', value: 10 },
        { label: '0 — Dead', value: 0 },
      ]),
    ],
    calculate(values) {
      const kps = num(values.kps, 80);
      let ecogApprox = 0;
      if (kps >= 90) ecogApprox = 0;
      else if (kps >= 70) ecogApprox = 1;
      else if (kps >= 50) ecogApprox = 2;
      else if (kps >= 30) ecogApprox = 3;
      else if (kps >= 10) ecogApprox = 4;
      else ecogApprox = 5;

      const r = riskFromThresholds(100 - kps, [
        {
          max: 20,
          level: 'low',
          label: `KPS ${kps} — good function`,
          interpretation: 'Able to work/normal activity range. Generally fit for intensive therapy if disease/organs allow.',
        },
        {
          max: 40,
          level: 'moderate',
          label: `KPS ${kps} — cares for self / reduced work`,
          interpretation: 'Self-care preserved but work limited. Many systemic therapies still considered; reassess frequently.',
        },
        {
          max: 60,
          level: 'high',
          label: `KPS ${kps} — disabled / needs assistance`,
          interpretation: 'Significant care needs. Poor prognostic factor in multiple models (e.g., KPS <80 in RCC scores). Favor less intensive approaches.',
        },
        {
          max: 100,
          level: 'critical',
          label: `KPS ${kps} — moribund / very sick`,
          interpretation: 'Hospital-level support or dying process. Focus on comfort and goals of care.',
        },
      ]);
      return {
        score: kps,
        unit: 'KPS',
        ...r,
        details: [
          { label: 'Approximate ECOG', value: String(ecogApprox) },
          { label: 'IMDC/Motzer cut-off', value: kps < 80 ? 'KPS <80 (risk factor present)' : 'KPS ≥80' },
        ],
      };
    },
    evidence: {
      summary: 'KPS 0–100 (steps of 10) rates functional independence and care needs.',
      formula: 'Select matching KPS descriptor',
      validation: 'Long-standing performance scale in oncology and palliative care.',
      references: [
        {
          title: 'The clinical evaluation of chemotherapeutic agents in cancer',
          citation: 'Karnofsky DA, Burchenal JH. In: MacLeod CM, ed. Evaluation of Chemotherapeutic Agents. Columbia University Press. 1949',
          year: 1949 },
      ],
    },
    nextSteps: [
      { condition: 'KPS <80', actions: ['Note as adverse prognostic factor in relevant scores', 'Geriatric/palliative assessment if appropriate'] },
    ],
  },

  {
    id: 'gail-model-simplified',
    name: 'Gail Model (Simplified Educational)',
    shortName: 'Gail Approx',
    description: 'Educational approximation of breast cancer risk factors used in Gail-type models (not the official NCI Gail calculator).',
    category: 'oncology',
    tags: ['breast cancer', 'gail', 'risk', 'screening', 'prevention'],
    whenToUse: 'Teaching relative contribution of reproductive/family/biopsy factors to 5-year breast cancer risk discussion.',
    whyUse: 'Highlights who may warrant formal Gail/Tyrer-Cuzick calculation, genetic counseling, or preventive therapy discussion.',
    inputs: [
      numberInput('age', 'Current age', { unit: 'years', min: 20, max: 90, step: 1, defaultValue: 45 }),
      selectInput('menarche', 'Age at menarche', [
        { label: '≥14 years (lower risk)', value: 0, description: 'Menarche at age 14 or later (Gail lower-risk band)' },
        { label: '12–13 years', value: 1, description: 'Menarche at age 12 or 13' },
        { label: '<12 years (higher risk)', value: 2, description: 'Menarche before age 12 (Gail higher-risk band)' },
      ]),
      selectInput('firstBirth', 'Age at first live birth', [
        { label: 'Nulliparous', value: 2, description: 'Never had a live birth' },
        { label: '<20 years', value: 0, description: 'First live birth before age 20 (lowest band)' },
        { label: '20–24 years', value: 1, description: 'First live birth at age 20–24' },
        { label: '25–29 years', value: 2, description: 'First live birth at age 25–29 (same educational weight as nulliparous in this tally)' },
        { label: '≥30 years', value: 3, description: 'First live birth at age 30 or later' },
      ]),
      selectInput(
        'biopsies',
        'Prior breast biopsies',
        [
          { label: 'None', value: 0, description: 'No prior breast biopsies' },
          { label: '1', value: 1, description: 'One prior core or surgical breast biopsy' },
          { label: '≥2', value: 2, description: 'Two or more prior core or surgical breast biopsies' },
        ],
        undefined,
        'Count prior breast biopsies (typically core or excisional). Atypia is a separate item below — do not double-count it here.',
      ),
      yesNo('atypia', 'Atypical hyperplasia on biopsy', 2, 'Atypical ductal or lobular hyperplasia on a prior biopsy (separate from biopsy count).'),
      selectInput(
        'relatives',
        'First-degree relatives with breast cancer',
        [
          { label: '0', value: 0, description: 'No mother, sister, or daughter with breast cancer' },
          { label: '1', value: 1, description: 'Exactly one first-degree female relative (mother, sister, or daughter) with breast cancer' },
          { label: '≥2', value: 2, description: 'Two or more first-degree female relatives with breast cancer' },
        ],
        undefined,
        'Female first-degree only (mother, sisters, daughters). Do not count father or second-degree relatives (grandmothers/aunts). Strong hereditary pattern → genetic counseling / Tyrer-Cuzick, not this educational tally.',
      ),
      selectInput('race', 'Race/ethnicity (educational strata)', [
        { label: 'White / other (reference educational weight)', value: 'white' },
        { label: 'Black / African American', value: 'black' },
        { label: 'Hispanic / Latina', value: 'hispanic' },
        { label: 'Asian / Pacific Islander', value: 'asian' },
        { label: 'American Indian / Alaska Native', value: 'aian' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 45);
      let agePts = 0;
      if (age >= 50) agePts = 3;
      else if (age >= 45) agePts = 2;
      else if (age >= 40) agePts = 1;

      const race = String(values.race ?? 'white');
      const raceLabel: Record<string, string> = {
        white: 'White / other',
        black: 'Black / African American',
        hispanic: 'Hispanic / Latina',
        asian: 'Asian / Pacific Islander',
        aian: 'American Indian / Alaska Native',
      };

      const score =
        agePts +
        num(values.menarche) +
        num(values.firstBirth) +
        num(values.biopsies) +
        (bool(values.atypia) ? 2 : 0) +
        num(values.relatives) * 2;

      // Educational 5y risk bands — NOT calibrated Gail output
      let fiveYear = '<1%';
      let r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower risk factor burden',
          interpretation:
            'Few Gail-type risk factors. Average screening usually appropriate. This is NOT an official 5-year % risk — use NCI Breast Cancer Risk Assessment Tool for clinical numbers.',
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate risk factor burden',
          interpretation:
            'Several risk factors present. Run formal Gail (BCRAT) or Tyrer-Cuzick; discuss lifestyle and screening adherence. 5-year risk ≥1.67% is a common chemoprevention discussion threshold in US guidance.',
        },
        {
          max: 20,
          level: 'high',
          label: 'Higher risk factor burden',
          interpretation:
            'Multiple strong factors (family history, atypia, reproductive history). Formal model + consider genetic counseling if family history suggestive; discuss enhanced screening/prevention.',
        },
      ]);

      if (score <= 2) fiveYear = 'often near population average (model required)';
      else if (score <= 5) fiveYear = 'possibly elevated — calculate formally';
      else fiveYear = 'likely elevated — calculate formally + genetics PRN';

      return {
        score,
        ...r,
        interpretation: `${r.interpretation} Race/ethnicity selected: ${raceLabel[race] ?? race} (official Gail/BCRAT is race-specific — use NCI tool for calibrated %).`,
        details: [
          { label: 'Educational factor points', value: String(score) },
          { label: 'Approx 5-year risk', value: fiveYear },
          { label: 'Race/ethnicity', value: raceLabel[race] ?? race },
        ],
        recommendations: [
          'Use official NCI Gail / IBIS-Tyrer-Cuzick for numeric risk',
          'Genetic counseling if hereditary pattern',
          'Do not base chemoprevention solely on this educational score',
        ],
      };
    },
    evidence: {
      summary:
        'Gail model uses age, menarche, first birth, biopsies, atypical hyperplasia, first-degree family history, and race to estimate absolute risk. This tool only tallies educational weights.',
      formula: 'Educational points (not BCRAT equation)',
      validation: 'Not validated for absolute risk. For clinical use run BCRAT (Gail) or Tyrer-Cuzick.',
      references: [
        {
          title: 'Projecting individualized probabilities of developing breast cancer for white females who are being examined annually',
          citation: 'Gail MH et al. J Natl Cancer Inst. 1989',
          year: 1989, pmid: '2593165',
          doi: '10.1093/jnci/81.24.1879', },
      ],
    },
    nextSteps: [
      { condition: 'Moderate–high factor burden', actions: ['Official risk calculator', 'Discuss screening interval/modality', 'Consider prevention options if formal risk high'] },
    ],
    pearls: [
      'Gail is less accurate with strong hereditary syndromes — use genetic risk tools.',
      'Chemoprevention discussions often reference 5-year risk ≥1.67%.',
    ],
  },

  {
    id: 'nccn-distress',
    name: 'NCCN Distress Thermometer',
    shortName: 'Distress',
    description: 'NCCN distress thermometer score (0–10) with problem-list style triage guidance.',
    category: 'oncology',
    tags: ['distress', 'nccn', 'psychosocial', 'supportive care', 'screening'],
    whenToUse: 'Routine psychosocial distress screening in cancer care (visit-based or pathway-based).',
    whyUse: 'Score ≥4 commonly triggers further evaluation and supportive care resources.',
    inputs: [
      numberInput('score', 'Distress thermometer (0–10)', {
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 3,
        helpText: 'Patient self-report of distress in the past week, including today (0 = none, 10 = extreme). NCCN commonly uses ≥4 as referral cut-off. Do not reprint the official NCCN problem list — complete it on paper/EHR if screening positive.',
      }),
      yesNo('practical', 'Practical problems (housing, bills, transport, work)', 0),
      yesNo('family', 'Family problems', 0),
      yesNo('emotional', 'Emotional problems (worry, depression, nervousness)', 0),
      yesNo('spiritual', 'Spiritual / religious concerns', 0),
      yesNo('physical', 'Physical problems contributing to distress', 0),
    ],
    calculate(values) {
      const score = num(values.score, 3);
      const domains =
        (bool(values.practical) ? 1 : 0) +
        (bool(values.family) ? 1 : 0) +
        (bool(values.emotional) ? 1 : 0) +
        (bool(values.spiritual) ? 1 : 0) +
        (bool(values.physical) ? 1 : 0);

      if (score >= 7) {
        return {
          score,
          label: 'Severe distress',
          interpretation: `Thermometer ${score}/10 with ${domains} problem domain(s) flagged. High distress — prompt psychosocial oncology, social work, chaplaincy, and/or psychiatry as indicated; address urgent safety (suicidality) if present.`,
          riskLevel: 'high',
          recommendations: ['Same-visit supportive care pathway', 'Screen depression/anxiety', 'Review uncontrolled symptoms'],
        };
      }
      if (score >= 4) {
        return {
          score,
          label: 'Clinically significant distress (≥4)',
          interpretation: `Thermometer ${score}/10 meets common NCCN referral cut-off (≥4). Complete full problem list and refer to appropriate resources (counseling, social work, palliative care, financial navigation).`,
          riskLevel: 'moderate',
          details: [{ label: 'Problem domains marked', value: String(domains) }],
        };
      }
      return {
        score,
        label: 'Mild / subthreshold distress',
        interpretation: `Thermometer ${score}/10 is below the usual ≥4 action threshold. Continue routine screening; still address any checked problem-list items.`,
        riskLevel: 'low',
        details: [{ label: 'Problem domains marked', value: String(domains) }],
      };
    },
    evidence: {
      summary: 'NCCN distress thermometer 0–10 plus problem list; score ≥4 typically warrants further evaluation.',
      formula: 'Patient self-report 0–10',
      validation: 'Widely implemented screening tool in cancer centers; cut-offs may vary slightly by institution.',
      references: [
        {
          title: 'Rapid screening for psychologic distress in men with prostate carcinoma: a pilot study',
          citation: 'Roth AJ et al. Cancer. 1998',
          year: 1998,
          pmid: '9587123',
          doi: '10.1002/(sici)1097-0142(19980515)82:10<1904::aid-cncr13>3.0.co;2-x',
        },
        {
          title: 'Distress Management, Version 3.2019, NCCN Clinical Practice Guidelines in Oncology',
          citation: 'Riba MB et al. J Natl Compr Canc Netw. 2019',
          year: 2019,
          pmid: '31590149',
          doi: '10.6004/jnccn.2019.0048',
          url: 'https://www.nccn.org/guidelines/guidelines-detail?category=3&id=1431',
        },
      ],
    },
    nextSteps: [
      { condition: '≥4', actions: ['Problem-list review', 'Supportive care referral', 'Follow-up screen'] },
      { condition: '≥7 or suicidal ideation', actions: ['Urgent mental health assessment', 'Safety planning'] },
    ],
    pearls: [
      'Thermometer stem is distress in the past week including today; ≥4 commonly triggers further evaluation.',
      'The five domain flags are high-level pointers only — complete the official NCCN problem list on paper/EHR if screening positive (do not reprint the copyrighted list here).',
    ],
  },

  {
    id: 'imdc-risk',
    name: 'IMDC (Heng) Risk — Metastatic RCC',
    shortName: 'IMDC',
    description: 'International Metastatic RCC Database Consortium prognostic risk factors (Heng criteria).',
    category: 'oncology',
    tags: ['rcc', 'imdc', 'heng', 'kidney cancer', 'prognosis'],
    whenToUse: 'Treatment-naive or previously treated metastatic clear-cell RCC risk stratification for systemic therapy discussions.',
    whyUse: 'Guides prognosis and historically regimen intensity (favorable vs intermediate vs poor).',
    inputs: [
      yesNo('timeToSys', 'Time from diagnosis to systemic therapy < 1 year', 1),
      yesNo('kps', 'Karnofsky performance status < 80', 1, 'KPS <80 = unable to carry on normal activity or work (KPS ≤70). KPS 80 = normal activity with effort; some signs/symptoms.'),
      yesNo('hb', 'Hemoglobin < lower limit of normal', 1),
      yesNo('calcium', 'Corrected calcium > upper limit of normal', 1),
      yesNo('neutrophils', 'Neutrophils > upper limit of normal', 1),
      yesNo('platelets', 'Platelets > upper limit of normal', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.timeToSys) ? 1 : 0) +
        (bool(values.kps) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.calcium) ? 1 : 0) +
        (bool(values.neutrophils) ? 1 : 0) +
        (bool(values.platelets) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Favorable risk (0 factors)',
          interpretation:
            'IMDC favorable risk. Historically best survival among metastatic RCC cohorts. Contemporary IO/TKI combinations still often preferred — follow current guidelines.',
          riskLevel: 'low',
          details: [{ label: 'Factors', value: '0 / 6' }],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Intermediate risk (1–2 factors)',
          interpretation:
            'IMDC intermediate risk. Largest patient group in many series; combination immunotherapy ± TKI strategies are standard discussions.',
          riskLevel: 'moderate',
          details: [{ label: 'Factors', value: `${score} / 6` }],
        };
      }
      return {
        score,
        label: 'Poor risk (3–6 factors)',
        interpretation:
          'IMDC poor risk. Historically worst survival; needs prompt systemic therapy planning, supportive care, and clinical trial consideration.',
        riskLevel: 'high',
        details: [{ label: 'Factors', value: `${score} / 6` }],
      };
    },
    evidence: {
      summary:
        'IMDC 6 factors: Dx→systemic Rx <1y, KPS<80, Hb<LLN, cCa>ULN, neutrophils>ULN, platelets>ULN. Favorable 0 / intermediate 1–2 / poor ≥3.',
      formula: 'Sum of 6 binary risk factors',
      validation: 'Heng et al.; external validation in targeted therapy and IO eras.',
      references: [
        {
          title: 'Prognostic factors for overall survival in patients with metastatic renal cell carcinoma treated with vascular endothelial growth factor–targeted agents: results from a large, multicenter study',
          citation: 'Heng DY et al. J Clin Oncol. 2009',
          year: 2009,
          pmid: '19826129',
          doi: '10.1200/JCO.2008.21.4809',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any risk', actions: ['Confirm histology', 'CNS/bone staging as indicated', 'Guideline-based first-line therapy'] },
    ],
    pearls: ['IMDC replaced MSKCC in many IO-era discussions but Motzer remains historically important.', 'Lab ULN/LLN are institution-specific.'],
  },

  {
    id: 'mskcc-motzer',
    name: 'MSKCC Motzer Criteria — Metastatic RCC',
    shortName: 'Motzer',
    description: 'Memorial Sloan Kettering Cancer Center (Motzer) prognostic model for metastatic renal cell carcinoma.',
    category: 'oncology',
    tags: ['rcc', 'motzer', 'mskcc', 'kidney cancer', 'prognosis'],
    whenToUse: 'Classic risk stratification of metastatic RCC (cytokine and early targeted-therapy era model).',
    whyUse: 'Five-factor model still cited; compare with IMDC (which adds neutrophils/platelets, drops LDH).',
    inputs: [
      yesNo('timeToSys', 'Time from diagnosis to systemic therapy < 1 year', 1),
      yesNo('kps', 'Karnofsky performance status < 80', 1, 'KPS <80 = unable to carry on normal activity or work (KPS ≤70). KPS 80 = normal activity with effort; some signs/symptoms.'),
      yesNo('hb', 'Hemoglobin < lower limit of normal', 1),
      yesNo('ldh', 'LDH > 1.5 × upper limit of normal', 1),
      yesNo('calcium', 'Corrected calcium > upper limit of normal', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.timeToSys) ? 1 : 0) +
        (bool(values.kps) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.calcium) ? 1 : 0);

      if (score === 0) {
        return {
          score,
          label: 'Favorable risk (0 factors)',
          interpretation: 'MSKCC favorable risk. Best historical survival stratum in Motzer model.',
          riskLevel: 'low',
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Intermediate risk (1–2 factors)',
          interpretation: 'MSKCC intermediate risk. Compare with IMDC for contemporary counseling.',
          riskLevel: 'moderate',
        };
      }
      return {
        score,
        label: 'Poor risk (≥3 factors)',
        interpretation: 'MSKCC poor risk (≥3 of 5). Associated with shortest historical survival; prioritize active therapy and supportive care.',
        riskLevel: 'high',
      };
    },
    evidence: {
      summary: 'Motzer factors: Dx→Rx <1y, KPS<80, Hb<LLN, LDH>1.5×ULN, cCa>ULN. Favorable 0 / intermediate 1–2 / poor ≥3.',
      formula: 'Sum of 5 binary factors',
      validation: 'Motzer et al. MSKCC; widely used before IMDC refinement.',
      references: [
        {
          title: 'Interferon-alfa as a comparative treatment for clinical trials of new therapies against advanced renal cell carcinoma',
          citation: 'Motzer RJ et al. J Clin Oncol. 2002',
          year: 2002, pmid: '11773181',
          doi: '10.1200/JCO.2002.20.1.289', },
      ],
    },
    nextSteps: [
      { condition: 'Poor risk', actions: ['Rapid systemic therapy planning', 'Clinical trials', 'Palliative support concurrent'] },
    ],
    pearls: ['IMDC adds neutrophilia and thrombocytosis and omits LDH.', 'Category set to hematology/oncology-adjacent; use with solid-tumor RCC pathways.'],
  },

  {
    id: 'hasenclever-ips',
    name: 'Hasenclever IPS (Advanced Hodgkin)',
    shortName: 'IPS',
    description: 'International Prognostic Score for advanced-stage Hodgkin lymphoma (Hasenclever).',
    category: 'hematology',
    tags: ['hodgkin', 'ips', 'hasenclever', 'lymphoma', 'prognosis'],
    whenToUse: 'Newly diagnosed advanced classical Hodgkin lymphoma risk stratification.',
    whyUse: 'Seven clinical/lab factors predict freedom from progression; informs intensity discussions historically.',
    inputs: [
      yesNo('male', 'Male sex', 1),
      yesNo('age', 'Age ≥ 45 years', 1),
      yesNo('stageIv', 'Stage IV disease', 1),
      yesNo('albumin', 'Albumin < 4.0 g/dL', 1),
      yesNo('hb', 'Hemoglobin < 10.5 g/dL', 1),
      yesNo('wbc', 'WBC ≥ 15 × 10⁹/L', 1),
      yesNo('lymphopenia', 'Lymphocytopenia (ALC < 0.6 × 10⁹/L or <8% of WBC)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.male) ? 1 : 0) +
        (bool(values.age) ? 1 : 0) +
        (bool(values.stageIv) ? 1 : 0) +
        (bool(values.albumin) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.lymphopenia) ? 1 : 0);

      // Approximate historical 5-y FFP from original publication (educational)
      const ffpApprox = ['84%', '77%', '67%', '60%', '51%', '42%', '≈30–35%', '≈30% or less'];
      const ffp = ffpApprox[Math.min(score, 7)];

      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: `IPS ${score} — lower risk`,
          interpretation: `Fewer adverse factors. Historical 5-year FFP roughly ${ffp}. Modern PET-adapted and brentuximab/checkpoint regimens improve outcomes vs original era.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: `IPS ${score} — intermediate`,
          interpretation: `Intermediate IPS. Historical 5-year FFP roughly ${ffp}. Use with modern response-adapted algorithms rather than IPS alone for regimen choice.`,
        },
        {
          max: 10,
          level: 'high',
          label: `IPS ${score} — higher risk`,
          interpretation: `Higher IPS (≥4). Historical 5-year FFP roughly ${ffp}. Consider clinical trial and intensified/novel approaches per current guidelines.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Max score', value: '7' },
          { label: 'Historical 5-y FFP (approx)', value: ffp },
        ],
      };
    },
    evidence: {
      summary:
        'IPS: male, age≥45, stage IV, albumin<4, Hb<10.5, WBC≥15, lymphopenia (<600/µL or <8% WBC). Each 1 point (0–7).',
      formula: 'Sum of 7 binary factors',
      validation: 'Hasenclever & Diehl NEJM 1998; outcomes better in modern therapy eras.',
      references: [
        {
          title: 'A prognostic score for advanced Hodgkin\'s disease',
          citation: 'Hasenclever D, Diehl V. N Engl J Med. 1998',
          year: 1998,
          pmid: '9819449',
          doi: '10.1056/NEJM199811193392104',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any IPS', actions: ['Staging PET-CT completeness', 'Fertility counsel before chemo', 'Follow modern HL guidelines (not IPS alone)'] },
    ],
  },

  {
    id: 'flipi',
    name: 'FLIPI (Follicular Lymphoma)',
    shortName: 'FLIPI',
    description: 'Follicular Lymphoma International Prognostic Index.',
    category: 'hematology',
    tags: ['follicular lymphoma', 'flipi', 'prognosis', 'nhl'],
    whenToUse: 'Newly diagnosed follicular lymphoma risk stratification (FLIPI; consider FLIPI-2/m7-FLIPI for research).',
    whyUse: 'Five-factor score estimates overall survival risk groups and frames observation vs treatment discussions.',
    inputs: [
      yesNo('age', 'Age > 60 years', 1),
      yesNo('stage', 'Ann Arbor stage III–IV', 1),
      yesNo('hb', 'Hemoglobin < 12 g/dL', 1),
      yesNo('nodal', 'More than 4 nodal areas', 1, 'FLIPI areas = cervical, axillary, inguino-crural (count left and right separately), para-aortic/iliac, celiac/mesenteric, other ancillary. Positive if >4 involved areas (≥5). Spleen is extranodal, not a nodal area.'),
      yesNo('ldh', 'LDH > upper limit of normal', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.nodal) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0);

      if (score <= 1) {
        return {
          score,
          label: 'Low risk (0–1)',
          interpretation:
            'FLIPI low risk. Historically excellent OS. Many asymptomatic advanced-stage patients may still be observed if GELF/treatment criteria not met.',
          riskLevel: 'low',
          details: [{ label: 'Risk group', value: 'Low' }],
        };
      }
      if (score === 2) {
        return {
          score,
          label: 'Intermediate risk (2)',
          interpretation: 'FLIPI intermediate risk. Individualize therapy vs observation using symptoms, bulk, and organ threat (e.g., GELF).',
          riskLevel: 'moderate',
        };
      }
      return {
        score,
        label: 'High risk (≥3)',
        interpretation:
          'FLIPI high risk. Higher historical mortality; treatment often indicated when disease is symptomatic/bulky — not a mandate to treat asymptomatic low-burden disease alone.',
        riskLevel: 'high',
      };
    },
    evidence: {
      summary: 'FLIPI factors: age>60, stage III–IV, Hb<12, >4 nodal sites, LDH>ULN. Low 0–1 / int 2 / high ≥3.',
      formula: 'Sum of 5 binary factors',
      validation: 'Solal-Céligny et al.; FLIPI-2 and molecular indices refine prognosis in rituximab era.',
      references: [
        {
          title: 'Follicular lymphoma international prognostic index',
          citation: 'Solal-Céligny P et al. Blood. 2004',
          year: 2004,
          pmid: '15126323',
          doi: '10.1182/blood-2003-12-4434',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any FLIPI', actions: ['Grade (1–3A/3B)', 'GELF / treatment indication review', 'Discuss observation vs rituximab-based therapy'] },
    ],
  },

  {
    id: 'ipi-lymphoma',
    name: 'IPI (Aggressive NHL)',
    shortName: 'IPI',
    description: 'International Prognostic Index for aggressive non-Hodgkin lymphoma (e.g., DLBCL).',
    category: 'hematology',
    tags: ['ipi', 'dlbcl', 'lymphoma', 'nhl', 'prognosis'],
    whenToUse: 'Newly diagnosed aggressive NHL / DLBCL before or at start of immunochemotherapy.',
    whyUse: 'Classic five-factor OS model; foundation for R-IPI and CNS-IPI.',
    inputs: [
      yesNo('age', 'Age > 60 years', 1),
      yesNo('ldh', 'Serum LDH > upper limit of normal', 1),
      yesNo('ecog', 'ECOG performance status ≥ 2', 1, 'ECOG ≥2 = all self-care, unable to work, up >50% of waking hours, or worse (bed/chair >50% or disabled). PS 1 (light/sedentary work OK) does not score this point.'),
      yesNo('stage', 'Ann Arbor stage III or IV', 1),
      yesNo('extranodal', 'More than one extranodal site', 1, '>1 distinct extranodal organ/site (BM, GI, liver, lung, bone, CNS, skin). Spleen counts as extranodal in classic IPI. Contiguous extension from a nodal mass is not extra sites.'),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.ldh) ? 1 : 0) +
        (bool(values.ecog) ? 1 : 0) +
        (bool(values.stage) ? 1 : 0) +
        (bool(values.extranodal) ? 1 : 0);

      if (score <= 1) {
        return {
          score,
          label: 'Low risk (0–1)',
          interpretation: 'IPI low risk. Historically best OS with CHOP-era therapy; still favorable in R-CHOP era (see also R-IPI).',
          riskLevel: 'low',
          details: [
            { label: 'Standard IPI group', value: 'Low (0–1)' },
            { label: 'Also used for', value: 'R-IPI / CNS-IPI base factors' },
          ],
        };
      }
      if (score === 2) {
        return {
          score,
          label: 'Low-intermediate (2)',
          interpretation: 'IPI low-intermediate risk. Standard immunochemotherapy; consider clinical features for intensification/trials.',
          riskLevel: 'moderate',
        };
      }
      if (score === 3) {
        return {
          score,
          label: 'High-intermediate (3)',
          interpretation: 'IPI high-intermediate risk. Higher relapse risk; ensure optimal R-CHOP-like delivery; discuss trials.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'High risk (4–5)',
        interpretation: 'IPI high risk. Poorest classic stratum; consider clinical trials, double-hit workup, and CNS prophylaxis risk (CNS-IPI).',
        riskLevel: 'high',
      };
    },
    evidence: {
      summary: 'IPI: age>60, LDH>ULN, ECOG≥2, stage III–IV, >1 extranodal site. Low 0–1 / LI 2 / HI 3 / high 4–5.',
      formula: 'Sum of 5 binary factors (0–5)',
      validation: 'Shipp et al. NEJM 1993; still foundational with rituximab-era revisions (R-IPI).',
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
      { condition: 'Score ≥3', actions: ['Confirm COO / FISH if DLBCL', 'Calculate CNS-IPI for prophylaxis decisions', 'Trial consideration'] },
      { condition: 'Any score', actions: ['Stage with PET-CT', 'Ejection fraction before anthracycline', 'HBV screening before rituximab'] },
    ],
    pearls: ['R-IPI regroups scores into very good (0), good (1–2), poor (3–5).', 'aaIPI used for age ≤60.'],
  },
];
