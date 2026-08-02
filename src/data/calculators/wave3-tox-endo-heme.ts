import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave3ToxEndoHemeCalcs: Calculator[] = [
  // ─── 1. Osmolar gap (tox interpretation) ───────────────────────────────────
  {
    id: 'osmolar-gap-tox',
    name: 'Toxic Alcohol Osmolar Gap Helper',
    shortName: 'Osm Gap Tox',
    description:
      'Interprets measured vs calculated serum osmolality and educational alcohol contributions (ethanol, methanol, ethylene glycol).',
    category: 'toxicology',
    tags: ['osmolar gap', 'toxic alcohol', 'methanol', 'ethylene glycol', 'ethanol', 'osmolality'],
    whenToUse: 'Suspected toxic alcohol ingestion with measured and calculated osmolality ± known ethanol level.',
    whyUse: 'Elevated osmolar gap suggests unmeasured osmotically active solutes (alcohols, acetone, severe hyperlipidemia/proteins, mannitol).',
    inputs: [
      numberInput('measured', 'Measured serum osmolality', { unit: 'mOsm/kg', min: 200, max: 500, defaultValue: 320 }),
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('glucose', 'Glucose', { unit: 'mg/dL', min: 20, max: 1000, defaultValue: 100 }),
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 14 }),
      numberInput('ethanol', 'Ethanol (if known)', { unit: 'mg/dL', min: 0, max: 600, defaultValue: 0, helpText: 'Leave 0 if not measured' }),
      numberInput('methanol', 'Methanol level (if known)', { unit: 'mg/dL', min: 0, max: 500, defaultValue: 0 }),
      numberInput('eg', 'Ethylene glycol level (if known)', { unit: 'mg/dL', min: 0, max: 500, defaultValue: 0 }),
    ],
    calculate(values) {
      const measured = num(values.measured, 320);
      const na = num(values.na, 140);
      const glucose = num(values.glucose, 100);
      const bun = num(values.bun, 14);
      const ethanol = num(values.ethanol, 0);
      const methanol = num(values.methanol, 0);
      const eg = num(values.eg, 0);

      // 2×Na + glu/18 + BUN/2.8 (common US units calculated osm)
      const calcBase = 2 * na + glucose / 18 + bun / 2.8;
      const ethContrib = ethanol / 4.6;
      const meohContrib = methanol / 3.2;
      const egContrib = eg / 6.2;
      const calcWithEtOH = calcBase + ethContrib;
      const gapRaw = measured - calcBase;
      const gapAfterEtOH = measured - calcWithEtOH;
      const explained = ethContrib + meohContrib + egContrib;
      const residual = measured - (calcBase + explained);

      let label = 'Gap not elevated';
      let interpretation =
        'Osmolar gap (measured − calculated without alcohols) is within common normal range (~−10 to +10 mOsm). Does not exclude early or late toxic alcohol (gap falls as parent alcohol metabolizes to acids).';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' | 'info' = 'normal';

      if (gapRaw > 25) {
        label = 'Markedly elevated osmolar gap';
        interpretation =
          'Gap >25 mOsm strongly suggests unmeasured osmole(s). Consider methanol, ethylene glycol, isopropanol, severe ethanol, mannitol, or lab artifact. Send toxic alcohol levels and assess anion gap / pH.';
        riskLevel = 'critical';
      } else if (gapRaw > 10) {
        label = 'Elevated osmolar gap';
        interpretation =
          'Gap >10 mOsm is elevated in many labs. Evaluate ethanol and toxic alcohols, clinical toxidrome, and anion-gap metabolic acidosis. Normal gap does not rule out toxic alcohol later in course.';
        riskLevel = gapAfterEtOH > 10 ? 'high' : 'moderate';
      } else if (gapRaw < -10) {
        label = 'Negative gap (lab/formula)',
        interpretation = 'Large negative gap often reflects formula choice, lab variation, or pseudohyponatremia context — interpret carefully.';
        riskLevel = 'info';
      }

      if (ethanol > 0 && gapAfterEtOH <= 10 && gapRaw > 10) {
        interpretation += ` Ethanol (~${round(ethContrib, 1)} mOsm) largely explains the gap.`;
      } else if (ethanol > 0 && gapAfterEtOH > 10) {
        interpretation += ` Residual gap after ethanol (~${round(gapAfterEtOH, 1)} mOsm) may indicate co-ingestants (MeOH/EG) or other osmoles.`;
        if (riskLevel === 'moderate') riskLevel = 'high';
      }

      return {
        score: round(gapRaw, 1),
        unit: 'mOsm/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Calculated osm (no alcohols)', value: `${round(calcBase, 1)} mOsm/kg` },
          { label: 'Gap (meas − calc)', value: `${round(gapRaw, 1)}` },
          { label: 'Ethanol contribution', value: `${round(ethContrib, 1)} mOsm (EtOH/4.6)` },
          { label: 'Gap after ethanol', value: `${round(gapAfterEtOH, 1)}` },
          { label: 'MeOH contribution (if known)', value: `${round(meohContrib, 1)} mOsm (MeOH/3.2)` },
          { label: 'EG contribution (if known)', value: `${round(egContrib, 1)} mOsm (EG/6.2)` },
          { label: 'Residual after all entered alcohols', value: `${round(residual, 1)}` },
        ],
        recommendations: [
          'Correlate with anion gap, lactate (may be falsely elevated with some EG assays), pH, and clinical status',
          'Do not delay fomepizole if high suspicion — levels often send-out',
          'Isopropanol raises osm gap without anion-gap acidosis (ketosis without acidosis classically)',
        ],
      };
    },
    evidence: {
      summary:
        'Osmolar gap ≈ measured − calculated osm. Ethanol contributes ≈ level(mg/dL)/4.6; methanol ≈/3.2; ethylene glycol ≈/6.2. Normal gap typically <10 mOsm (lab-dependent).',
      formula: 'Calc osm ≈ 2·Na + glu/18 + BUN/2.8; Gap = measured − calc; alcohol mOsm ≈ concentration/MW factor',
      validation: 'Educational bedside approximation; formulas and normal ranges vary by institution and units.',
      references: [
        {
          title: 'Serum osmolality and the osmolar gap',
          citation: 'Purssell RA et al. / toxic alcohol reviews',
          year: 2001,
          pmid: '18442409',
          doi: '10.1186/1471-227X-8-5',
        },
        {
          title: 'Toxic alcohol ingestions',
          citation: 'Kraut JA, Kurtz I. Clin J Am Soc Nephrol. 2008',
          year: 2008,
          pmid: '18045860',
          doi: '10.2215/CJN.03220807',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Elevated gap ± acidosis / visual symptoms / oxalate crystals',
        actions: ['Fomepizole', 'Toxic alcohol levels', 'Nephrology for HD criteria', 'ABG, electrolytes, lactate, ethanol'],
      },
      {
        condition: 'Gap explained by ethanol only',
        actions: ['Supportive care for intoxication', 'Reassess if anion gap rises later'],
      },
    ],
    pearls: [
      'Late toxic alcohol: osm gap may normalize while anion gap rises (acids formed).',
      'Pseudohyponatremia and lab osm methods affect gap; use concurrent samples.',
    ],
  },

  // ─── 2. Methanol from osm gap ──────────────────────────────────────────────
  {
    id: 'methanol-osmol',
    name: 'Estimated Methanol from Osmolar Gap',
    shortName: 'MeOH Osmol',
    description: 'Educational estimate of methanol concentration from residual osmolar gap (gap × 3.2).',
    category: 'toxicology',
    tags: ['methanol', 'osmolar gap', 'toxic alcohol'],
    whenToUse: 'When methanol level is pending and residual osm gap is attributed to methanol.',
    whyUse: 'Rapid ballpark for severity while awaiting quantitative methanol.',
    inputs: [
      numberInput('gap', 'Osmolar gap attributable to methanol', {
        unit: 'mOsm/kg',
        min: 0,
        max: 200,
        defaultValue: 30,
        helpText: 'Prefer gap after subtracting ethanol contribution',
      }),
    ],
    calculate(values) {
      const gap = num(values.gap, 30);
      const meoh = round(gap * 3.2, 0);
      // Rough severity: toxic often discussed ≥20 mg/dL; severe much higher
      const r = riskFromThresholds(meoh, [
        {
          max: 19,
          level: 'moderate',
          label: 'Low estimated MeOH',
          interpretation: `≈${meoh} mg/dL. Still treat if clinical suspicion high — estimates are imprecise and thresholds for treatment are lower with acidosis/symptoms.`,
        },
        {
          max: 49,
          level: 'high',
          label: 'Moderate estimated MeOH',
          interpretation: `≈${meoh} mg/dL. Levels ≥20 mg/dL often considered for antidote; correlate with pH, formate, visual symptoms, and time since ingestion.`,
        },
        {
          max: 2000,
          level: 'critical',
          label: 'High estimated MeOH',
          interpretation: `≈${meoh} mg/dL. High estimated burden — urgent fomepizole, consider hemodialysis criteria (severe acidosis, visual toxicity, very high level, renal failure).`,
        },
      ]);
      return {
        score: meoh,
        unit: 'mg/dL (est.)',
        ...r,
        details: [
          { label: 'Gap used', value: `${gap} mOsm/kg` },
          { label: 'Factor', value: 'MeOH (mg/dL) ≈ gap × 3.2' },
        ],
      };
    },
    evidence: {
      summary: 'Methanol (mg/dL) ≈ osmolar gap × (MW/10) ≈ gap × 3.2 when gap is solely from methanol.',
      formula: 'Estimated methanol (mg/dL) = osmolar gap × 3.2',
      validation: 'Rough conversion from osmole contribution; inaccurate if other alcohols, ketoacids, or lab error present.',
      references: [
        {
          title: 'Toxic alcohol calculations',
          citation: 'Kraut JA, Mullins ME. N Engl J Med. 2018',
          year: 2018,
          pmid: '29342392',
          doi: '10.1056/NEJMra1615295',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any suspected methanol', actions: ['Fomepizole', 'Confirm level', 'Ophthalmology if visual symptoms', 'HD if indicated'] },
    ],
    pearls: ['Isopropanol and ethanol also raise gap — subtract known ethanol first.', 'Do not withhold treatment waiting for this estimate.'],
  },

  // ─── 3. Ethylene glycol from osm gap ───────────────────────────────────────
  {
    id: 'ethylene-glycol-osmol',
    name: 'Estimated Ethylene Glycol from Osmolar Gap',
    shortName: 'EG Osmol',
    description: 'Educational estimate of ethylene glycol concentration from residual osmolar gap (gap × 6.2).',
    category: 'toxicology',
    tags: ['ethylene glycol', 'osmolar gap', 'toxic alcohol', 'antifreeze'],
    whenToUse: 'Suspected EG ingestion with residual osm gap while quantitative level pending.',
    whyUse: 'Provides bedside estimate of parent alcohol burden to support antidote/HD decisions with full clinical picture.',
    inputs: [
      numberInput('gap', 'Osmolar gap attributable to EG', {
        unit: 'mOsm/kg',
        min: 0,
        max: 200,
        defaultValue: 30,
        helpText: 'Prefer gap after subtracting ethanol contribution',
      }),
    ],
    calculate(values) {
      const gap = num(values.gap, 30);
      const eg = round(gap * 6.2, 0);
      const r = riskFromThresholds(eg, [
        {
          max: 19,
          level: 'moderate',
          label: 'Low estimated EG',
          interpretation: `≈${eg} mg/dL. Treatment decisions depend on suspicion, timing, pH, renal function, and oxalate injury — not estimate alone.`,
        },
        {
          max: 49,
          level: 'high',
          label: 'Moderate estimated EG',
          interpretation: `≈${eg} mg/dL. Often in range discussed for antidotal therapy; evaluate acidosis, renal injury, hypocalcemia, fluorescence urine (unreliable), and crystalluria.`,
        },
        {
          max: 2000,
          level: 'critical',
          label: 'High estimated EG',
          interpretation: `≈${eg} mg/dL. High estimated burden — urgent fomepizole and nephrology for HD criteria.`,
        },
      ]);
      return {
        score: eg,
        unit: 'mg/dL (est.)',
        ...r,
        details: [
          { label: 'Gap used', value: `${gap} mOsm/kg` },
          { label: 'Factor', value: 'EG (mg/dL) ≈ gap × 6.2' },
        ],
      };
    },
    evidence: {
      summary: 'Ethylene glycol (mg/dL) ≈ osmolar gap × 6.2 when the gap is attributed solely to EG.',
      formula: 'Estimated EG (mg/dL) = osmolar gap × 6.2',
      validation: 'Bedside approximation only; co-ingestants and metabolism invalidate the estimate.',
      references: [
        {
          title: 'Toxic alcohol ingestions',
          citation: 'Kraut JA, Kurtz I. Clin J Am Soc Nephrol. 2008',
          year: 2008,
          pmid: '18045860',
          doi: '10.2215/CJN.03220807',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Suspected EG',
        actions: ['Fomepizole', 'EG level', 'Calcium, renal function, ABG', 'HD if severe acidosis/AKI/high level'],
      },
    ],
    pearls: ['Late EG: gap falls as glycolate rises — anion gap becomes the clue.', 'Some point-of-care lactate assays read glycolate as lactate.'],
  },

  // ─── 4. NAC IV dosing ──────────────────────────────────────────────────────
  {
    id: 'nac-dosing',
    name: 'N-Acetylcysteine IV Dosing (21-hour)',
    shortName: 'NAC Dosing',
    description: 'Adult-style 21-hour IV NAC regimen: 150 / 50 / 100 mg/kg bags with gram totals.',
    category: 'toxicology',
    tags: ['acetaminophen', 'nac', 'n-acetylcysteine', 'overdose', 'paracetamol'],
    whenToUse: 'Acetaminophen overdose when IV NAC is indicated (nomogram, unknown time, fulminant pathway, etc.).',
    whyUse: 'Standard three-bag protocol doses are weight-based; errors in bag preparation are common.',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 3, max: 200, step: 0.1, defaultValue: 70 }),
      selectInput('cap150', 'Cap weight at 100 kg for dosing? (common practice)', [
        { label: 'Yes — use max 100 kg for dose calc', value: 'cap' },
        { label: 'No — use actual weight', value: 'actual' },
      ]),
    ],
    calculate(values) {
      const rawW = num(values.weight, 70);
      const cap = String(values.cap150 ?? 'cap') === 'cap';
      const w = cap ? Math.min(rawW, 100) : rawW;
      const bag1 = round((150 * w) / 1000, 2); // grams
      const bag2 = round((50 * w) / 1000, 2);
      const bag3 = round((100 * w) / 1000, 2);
      const totalMg = 300 * w;
      const totalG = round(totalMg / 1000, 2);

      return {
        score: totalG,
        unit: 'g total',
        label: '21-hour IV NAC plan',
        interpretation: `Weight used ${round(w, 1)} kg${cap && rawW > 100 ? ' (capped from ' + rawW + ' kg)' : ''}. Bag 1: ${bag1} g (150 mg/kg) over 1 h; Bag 2: ${bag2} g (50 mg/kg) over 4 h; Bag 3: ${bag3} g (100 mg/kg) over 16 h. Total 300 mg/kg = ${totalG} g. Follow local dilution/volume protocol and monitoring.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Weight entered', value: `${round(rawW, 1)} kg` },
          { label: '100 kg dose cap', value: cap ? 'Yes' : 'No' },
          { label: 'Weight used', value: `${round(w, 1)} kg` },
          { label: 'Bag 1 (150 mg/kg, 1 h)', value: `${bag1} g (${round(150 * w, 0)} mg)` },
          { label: 'Bag 2 (50 mg/kg, 4 h)', value: `${bag2} g (${round(50 * w, 0)} mg)` },
          { label: 'Bag 3 (100 mg/kg, 16 h)', value: `${bag3} g (${round(100 * w, 0)} mg)` },
          { label: 'Total', value: `${totalG} g (300 mg/kg)` },
        ],
        recommendations: [
          'Confirm indication (Rumack-Matthew, repeated supratherapeutic, altered LFTs, etc.)',
          'Watch for anaphylactoid reactions (especially bag 1) — slow infusion / antihistamine per protocol',
          'Two-bag / SNAP regimens exist regionally — this tool is classic 21-h three-bag',
        ],
      };
    },
    evidence: {
      summary: 'FDA-labeled IV NAC 21-hour regimen: 150 mg/kg over 1 h, 50 mg/kg over 4 h, 100 mg/kg over 16 h (total 300 mg/kg).',
      formula: 'Bag1=0.15·wt g; Bag2=0.05·wt g; Bag3=0.10·wt g (wt in kg)',
      validation: 'Standard APAP antidote dosing; institutional caps (often 100 kg) and diluent volumes vary.',
      references: [
        {
          title: 'Acetaminophen poisoning and NAC',
          citation: 'Prescott LF / Smilkstein MJ et al.; product labeling',
          year: 1988,
          pmid: '3059186',
          doi: '10.1056/NEJM198812153192401',
        },
      ],
    },
    nextSteps: [
      { condition: 'NAC indicated', actions: ['Start without delay if criteria met', 'Serial APAP, AST/ALT, INR, creatinine', 'Poison center consultation'] },
      { condition: 'Massive overdose / late presentation', actions: ['Consider extended NAC, HD discussion if very high levels/acidosis'] },
    ],
    pearls: [
      'Oral NAC regimen differs (140 mg/kg load then 70 mg/kg q4h × 17).',
      'Pediatric diluent volumes must avoid excessive free water/hyponatremia.',
    ],
  },

  // ─── 5. Digoxin immune Fab ─────────────────────────────────────────────────
  {
    id: 'digoxin-fab',
    name: 'Digoxin Immune Fab Vial Estimate',
    shortName: 'DigiFab',
    description: 'Estimates digoxin-specific antibody fragment vials from serum level, known amount ingested, or empiric scenario.',
    category: 'toxicology',
    tags: ['digoxin', 'fab', 'digibind', 'digifab', 'overdose', 'arrhythmia'],
    whenToUse: 'Life-threatening digoxin toxicity or planning Fab dosing with known level or ingested amount.',
    whyUse: 'Vial estimates guide pharmacy preparation; underdosing leaves free digoxin activity.',
    inputs: [
      selectInput('method', 'Estimation method', [
        { label: 'From steady-state serum level', value: 'level' },
        { label: 'From known amount ingested (mg)', value: 'amount' },
        { label: 'Empiric acute overdose', value: 'empiric-acute' },
        { label: 'Empiric chronic toxicity', value: 'empiric-chronic' },
      ]),
      numberInput('level', 'Serum digoxin', {
        unit: 'ng/mL',
        min: 0,
        max: 50,
        step: 0.1,
        defaultValue: 4,
        helpText: 'Post-distribution level preferred',
      }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 3, max: 200, defaultValue: 70 }),
      numberInput('amountMg', 'Amount ingested (digoxin)', { unit: 'mg', min: 0, max: 50, step: 0.25, defaultValue: 5 }),
    ],
    calculate(values) {
      const method = String(values.method ?? 'level');
      const level = num(values.level, 4);
      const weight = num(values.weight, 70);
      const amountMg = num(values.amountMg, 5);

      let vials = 0;
      let formula = '';
      let label = 'Estimated vials';
      let interpretation = '';
      let riskLevel: 'info' | 'high' | 'critical' = 'info';

      if (method === 'level') {
        vials = Math.ceil((level * weight) / 100);
        formula = 'vials = (level ng/mL × weight kg) / 100 (round up)';
        interpretation = `From level ${level} ng/mL and weight ${weight} kg → ${vials} vial(s). Each vial binds ≈0.5 mg digoxin. Use post-distribution levels when possible; total body load estimates assume Vd ≈5–7 L/kg.`;
        riskLevel = level >= 10 || vials >= 10 ? 'critical' : level >= 2.5 ? 'high' : 'info';
      } else if (method === 'amount') {
        vials = Math.ceil(amountMg / 0.5);
        formula = 'vials = total digoxin body load (mg) / 0.5';
        interpretation = `Known/estimated load ${amountMg} mg → ${vials} vial(s) (1 vial neutralizes ~0.5 mg digoxin). For bioavailability, acute tablet ingestions sometimes use amount × 0.8 as body load — adjust clinically.`;
        riskLevel = vials >= 10 ? 'critical' : 'high';
      } else if (method === 'empiric-acute') {
        vials = 10;
        formula = 'Empiric acute: often 10 vials (range 10–20 if life-threatening)';
        interpretation =
          'Empiric acute overdose starting estimate: 10 vials IV (some protocols 20 if cardiac arrest/severe instability). Reassess after response; more may be needed for massive ingestion.';
        riskLevel = 'critical';
      } else {
        vials = 6;
        formula = 'Empiric chronic: often 3–6 vials';
        interpretation =
          'Empiric chronic toxicity estimate: 6 vials (many start with 3–6). Chronic toxicity often needs less than acute massive OD; treat clinical toxicity, not the number alone.';
        riskLevel = 'high';
      }

      return {
        score: vials,
        unit: 'vials',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Method', value: method },
          { label: 'Formula / rule', value: formula },
          { label: 'Binding capacity', value: '~0.5 mg digoxin per vial' },
        ],
        recommendations: [
          'Indications: life-threatening arrhythmia, K+ ≥5 (acute), digoxin level with severe toxicity, digoxin + hemodynamic instability',
          'After Fab, free digoxin falls; total digoxin assays are unreliable',
          'Watch hypokalemia as Na/K-ATPase recovers; hold further digoxin',
        ],
      };
    },
    evidence: {
      summary:
        'Vials ≈ (serum digoxin [ng/mL] × weight [kg]) / 100, or body load (mg) / 0.5. Empiric: acute ~10–20 vials; chronic ~3–6 vials.',
      formula: 'vials = (C × wt)/100 or amount_mg/0.5',
      validation: 'Product labeling and toxicology references; round up partial vials.',
      references: [
        {
          title: 'Digoxin-specific Fab fragments',
          citation: 'Antman EM et al. Circulation. 1990 / product inserts',
          year: 1990,
          pmid: '2188752',
          doi: '10.1161/01.cir.81.6.1744',
        },
      ],
    },
    nextSteps: [
      { condition: 'Unstable dig toxicity', actions: ['Fab urgently', 'Correct electrolytes carefully', 'Avoid calcium as “stone heart” dogma is debated — follow local tox guidance', 'Poison center'] },
      { condition: 'After Fab', actions: ['Telemetry', 'Expect total digoxin assay elevation', 'Renal clearance of Fab-digoxin complex delayed in CKD'] },
    ],
    pearls: [
      'Redrawn digoxin soon after dose distribution is incomplete → falsely high.',
      'Plant cardiac glycosides may require different Fab dosing strategies.',
    ],
  },

  // ─── 6. Salicylate level severity ──────────────────────────────────────────
  {
    id: 'salicylate-level',
    name: 'Salicylate Toxicity Severity Helper',
    shortName: 'Salicylate',
    description: 'Educational severity framing from salicylate concentration and acute vs chronic context.',
    category: 'toxicology',
    tags: ['salicylate', 'aspirin', 'overdose', 'asa'],
    whenToUse: 'Known or suspected salicylate poisoning with a quantitative level.',
    whyUse: 'Levels guide urgency, but chronic toxicity is severe at lower concentrations than acute.',
    inputs: [
      numberInput('level', 'Serum salicylate', { unit: 'mg/dL', min: 0, max: 200, step: 0.1, defaultValue: 45 }),
      selectInput('chronicity', 'Context', [
        { label: 'Acute single ingestion', value: 'acute' },
        { label: 'Chronic / repeated supratherapeutic', value: 'chronic' },
      ]),
      yesNo('altered', 'Altered mental status / severe symptoms', 0),
      yesNo('acidemia', 'Acidemia (low pH / falling HCO₃)', 0),
    ],
    calculate(values) {
      const level = num(values.level, 45);
      const chronic = String(values.chronicity ?? 'acute') === 'chronic';
      const altered = bool(values.altered);
      const acidemia = bool(values.acidemia);

      // Therapeutic ~10–30 mg/dL; toxic often >40–50 acute; dialysis considerations higher or clinical
      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' | 'info';

      if (level < 30 && !chronic) {
        label = 'Therapeutic / low range (acute frame)';
        interpretation = `Level ${level} mg/dL is in or near therapeutic range for acute framing. Still correlate with time since ingestion (levels may rise) and clinical status.`;
        riskLevel = 'normal';
      } else if (!chronic && level < 50) {
        label = 'Mild toxicity range (acute)';
        interpretation = `Acute level ${level} mg/dL — often mild if asymptomatic, but repeat levels until clearly falling. Alkalinization considerations depend on symptoms and trajectory.`;
        riskLevel = 'moderate';
      } else if (!chronic && level < 70) {
        label = 'Moderate toxicity range (acute)';
        interpretation = `Acute level ${level} mg/dL — moderate toxicity range. Consider IV sodium bicarbonate for enhanced elimination if indicated; ICU monitoring; serial levels and ABG.`;
        riskLevel = 'high';
      } else if (!chronic) {
        label = 'Severe range (acute)';
        interpretation = `Acute level ${level} mg/dL — severe. Urgent critical care, bicarb therapy, early nephrology for HD (levels ≥90–100 mg/dL often cited, or lower with severe clinical features).`;
        riskLevel = 'critical';
      } else if (level < 40) {
        label = 'Chronic context — caution';
        interpretation = `Chronic toxicity can be life-threatening at levels that look “moderate” acutely. Level ${level} mg/dL with elderly/chronic use warrants aggressive evaluation.`;
        riskLevel = 'high';
      } else {
        label = 'Chronic toxicity — high concern';
        interpretation = `Chronic context with level ${level} mg/dL is high risk for CNS toxicity and death. Low threshold for ICU and hemodialysis.`;
        riskLevel = 'critical';
      }

      if (altered || acidemia) {
        riskLevel = 'critical';
        interpretation +=
          ' Clinical severity (AMS and/or acidemia) overrides numeric band — treat as severe; consider HD.';
        label += ' + severe clinical features';
      }

      return {
        score: level,
        unit: 'mg/dL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Chronicity', value: chronic ? 'Chronic' : 'Acute' },
          { label: 'Altered MS', value: altered ? 'Yes' : 'No' },
          { label: 'Acidemia', value: acidemia ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Therapeutic salicylate ~10–30 mg/dL. Acute toxicity severity rises with levels (often concerning >40–50; HD often considered ≥90–100 mg/dL or severe clinical features). Chronic toxicity is severe at lower levels.',
      formula: 'Interpret level + chronicity + pH/mental status (not level alone)',
      validation: 'EXTRIP and toxicology guidance emphasize clinical context; unit confusion (mg/dL vs mg/L) is a common error.',
      references: [
        {
          title: 'Extracorporeal treatment for salicylate poisoning (EXTRIP)',
          citation: 'Juurlink DN et al. Ann Emerg Med. 2015',
          year: 2015,
          pmid: '25986310',
          doi: '10.1016/j.annemergmed.2015.03.031',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Significant toxicity',
        actions: [
          'ABG, electrolytes, glucose',
          'IV bicarb if indicated',
          'Avoid intubation if possible; if intubating, prevent hypoventilation',
          'Nephrology early',
        ],
      },
      { condition: 'Rising levels', actions: ['Repeat q2–3h until peak passed', 'GI decontamination if appropriate timing'] },
    ],
    pearls: [
      'Confirm units: 100 mg/dL = 1000 mg/L.',
      'Fever, tinnitus, tachypnea, mixed acid-base disorder are classic.',
    ],
  },

  // ─── 7. Fomepizole dose ────────────────────────────────────────────────────
  {
    id: 'fomepizole-dose',
    name: 'Fomepizole Dosing',
    shortName: 'Fomepizole',
    description: 'Fomepizole loading dose 15 mg/kg and maintenance schedule (10→15 mg/kg) with gram amounts.',
    category: 'toxicology',
    tags: ['fomepizole', '4-mp', 'methanol', 'ethylene glycol', 'antidote'],
    whenToUse: 'Confirmed or highly suspected methanol or ethylene glycol poisoning.',
    whyUse: 'ADH inhibition is time-critical; weight-based dosing and redosing with HD differ from standard q12h.',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 3, max: 200, step: 0.1, defaultValue: 70 }),
      selectInput('phase', 'Dose to calculate', [
        { label: 'Loading dose (15 mg/kg)', value: 'load' },
        { label: 'Early maintenance (10 mg/kg) — doses 2–5', value: 'maint10' },
        { label: 'Later maintenance (15 mg/kg) — dose ≥6', value: 'maint15' },
      ]),
      yesNo('onHd', 'Currently on hemodialysis (dosing interval shortens)', 0, 'On HD, give q4h typically; redose more often'),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const phase = String(values.phase ?? 'load');
      const onHd = bool(values.onHd);
      const mgPerKg = phase === 'maint10' ? 10 : 15;
      const mg = round(mgPerKg * w, 0);
      const grams = round(mg / 1000, 2);
      const phaseLabel =
        phase === 'load' ? 'Loading (15 mg/kg)' : phase === 'maint10' ? 'Maintenance 10 mg/kg' : 'Maintenance 15 mg/kg';
      const interval = onHd
        ? 'On HD: typically every 4 hours (follow institutional / poison center protocol; also dose at start/end of HD per labeling)'
        : phase === 'load'
          ? 'Give ASAP IV; then maintenance q12h'
          : 'Every 12 hours (increase to 15 mg/kg after 4 maintenance doses at 10 mg/kg if still needed)';

      return {
        score: grams,
        unit: 'g',
        label: phaseLabel,
        interpretation: `${phaseLabel}: ${mg} mg (${grams} g) for ${w} kg. ${interval}. Continue until toxic alcohol cleared and acidosis resolved per criteria — do not stop solely on a clock.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Dose', value: `${mg} mg (${mgPerKg} mg/kg)` },
          { label: 'Interval note', value: interval },
          { label: 'HD adjustment', value: onHd ? 'Yes — intensified schedule' : 'No' },
        ],
        recommendations: [
          'Indications include documented toxic alcohol, osm gap with high suspicion, or severe metabolic acidosis of unclear source with compatible story',
          'Ethanol infusion is alternative if fomepizole unavailable',
          'Coordinate HD criteria with nephrology',
        ],
      };
    },
    evidence: {
      summary:
        'Fomepizole load 15 mg/kg IV, then 10 mg/kg q12h × 4 doses, then 15 mg/kg q12h. During HD, dosing frequency increases (commonly q4h).',
      formula: 'Load = 15 mg/kg; maint = 10 mg/kg then 15 mg/kg',
      validation: 'Product labeling and AACT/toxicology guidelines for toxic alcohols.',
      references: [
        {
          title: 'Fomepizole for ethylene glycol and methanol poisoning',
          citation: 'Brent J et al. N Engl J Med. 1999/2001',
          year: 2001,
          pmid: '11762672',
          doi: '10.1081/clt-100108496',
        },
      ],
    },
    nextSteps: [
      { condition: 'Starting fomepizole', actions: ['Confirm IV access', 'Send levels, ABG, chemistries', 'Poison center', 'Plan HD if indicated'] },
    ],
    pearls: ['Induces own metabolism — later maintenance dose increases to 15 mg/kg.', 'Isopropanol does not require fomepizole for toxic acid metabolites (supportive).'],
  },

  // ─── 8. Naloxone infusion ──────────────────────────────────────────────────
  {
    id: 'naloxone-infusion',
    name: 'Naloxone Infusion Rate (Rule of Thumb)',
    shortName: 'Naloxone Drip',
    description: 'Estimates naloxone continuous infusion as ~2/3 of the effective bolus dose per hour.',
    category: 'toxicology',
    tags: ['naloxone', 'opioid', 'overdose', 'infusion'],
    whenToUse: 'Recurrent opioid respiratory depression after bolus naloxone, especially long-acting opioids.',
    whyUse: 'Provides a practical starting infusion when boluses must be repeated frequently.',
    inputs: [
      numberInput('bolus', 'Effective bolus dose that restored ventilation', {
        unit: 'mg',
        min: 0.04,
        max: 10,
        step: 0.02,
        defaultValue: 0.4,
      }),
      numberInput('weight', 'Weight (optional, for µg/kg/h display)', {
        unit: 'kg',
        min: 3,
        max: 200,
        defaultValue: 70,
      }),
    ],
    calculate(values) {
      const bolus = num(values.bolus, 0.4);
      const weight = num(values.weight, 70);
      const rateMgH = round((2 / 3) * bolus, 3);
      const rateMcgKgH = weight > 0 ? round((rateMgH * 1000) / weight, 1) : 0;

      return {
        score: rateMgH,
        unit: 'mg/h',
        label: 'Suggested starting infusion',
        interpretation: `Rule of thumb: infusion ≈ (2/3) × effective bolus per hour → ${rateMgH} mg/h (≈${rateMcgKgH} µg/kg/h at ${weight} kg). Give half the effective bolus as a re-bolus when starting the drip if renarcotization is present. Titrate to respiratory status — not a fixed protocol.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Effective bolus', value: `${bolus} mg` },
          { label: 'Infusion start', value: `${rateMgH} mg/h` },
          { label: 'Approx µg/kg/h', value: `${rateMcgKgH}` },
        ],
        recommendations: [
          'Monitor SpO₂/ETCO₂ and level of consciousness',
          'Precipitated withdrawal risk in opioid-dependent patients — use lowest effective dose',
          'Long-acting / high-potency opioids (methadone, fentanyl patches, buprenorphine complexities) may need prolonged observation',
        ],
      };
    },
    evidence: {
      summary: 'Common teaching: naloxone infusion rate (mg/h) ≈ two-thirds of the naloxone bolus (mg) that restored adequate ventilation.',
      formula: 'Infusion (mg/h) ≈ 0.67 × effective bolus (mg)',
      validation: 'Bedside rule of thumb from toxicology practice; not a substitute for titration and airway management.',
      references: [
        {
          title: 'Global Strategy for Prevention, Diagnosis and Management of COPD (GOLD)',
          citation: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD) Report',
          year: 2024,
          pmid: '28128970',
          doi: '10.1164/rccm.201701-0218PP', url: 'https://goldcopd.org/2024-gold-report/' },
      ],
    },
    nextSteps: [
      { condition: 'Recurrent hypoventilation', actions: ['Airway support first', 'Re-bolus then start drip', 'Observe longer for long-acting agents'] },
    ],
    pearls: ['If >1–2 mg bolus required in opioid-naïve patient, consider non-opioid causes or ultra-potent opioids.', 'Buprenorphine may need higher naloxone doses and has complex receptor kinetics.'],
  },

  // ─── 9. Serotonin syndrome (Hunter) ────────────────────────────────────────
  {
    id: 'serotonin-syndrome',
    name: 'Hunter Serotonin Toxicity Criteria',
    shortName: 'Hunter SS',
    description: 'Hunter Criteria decision helper for serotonin toxicity in the presence of a serotonergic agent.',
    category: 'toxicology',
    tags: ['serotonin syndrome', 'hunter', 'ssri', 'toxicity', 'hyperthermia'],
    whenToUse: 'Possible serotonin toxicity after serotonergic drugs (SSRI/SNRI, MAOI, tramadol, linezolid, MDMA, etc.).',
    whyUse: 'Hunter criteria are more sensitive/specific than older Sternbach criteria in validation cohorts.',
    inputs: [
      yesNo('serotonergic', 'Taken a serotonergic agent (required)'),
      yesNo('spontaneousClonus', 'Spontaneous clonus'),
      yesNo('inducibleClonus', 'Inducible clonus'),
      yesNo('ocularClonus', 'Ocular clonus'),
      yesNo('agitation', 'Agitation'),
      yesNo('diaphoresis', 'Diaphoresis'),
      yesNo('tremor', 'Tremor'),
      yesNo('hyperreflexia', 'Hyperreflexia'),
      yesNo('hypertonia', 'Hypertonia'),
      yesNo('temp38', 'Temperature >38 °C'),
    ],
    calculate(values) {
      if (!bool(values.serotonergic)) {
        return {
          score: 'N/A',
          label: 'No serotonergic agent',
          interpretation: 'Hunter criteria require a serotonergic agent in the preceding context. Consider NMS, anticholinergic toxidrome, sympathomimetic toxicity, infection.',
          riskLevel: 'info',
        };
      }
      const spont = bool(values.spontaneousClonus);
      const induc = bool(values.inducibleClonus);
      const ocular = bool(values.ocularClonus);
      const agitation = bool(values.agitation);
      const diaph = bool(values.diaphoresis);
      const tremor = bool(values.tremor);
      const hyperref = bool(values.hyperreflexia);
      const hypertonia = bool(values.hypertonia);
      const temp = bool(values.temp38);

      // Hunter positive if ANY:
      // spontaneous clonus
      // inducible clonus + agitation or diaphoresis
      // ocular clonus + agitation or diaphoresis
      // tremor + hyperreflexia
      // hypertonia + temperature >38 + ocular or inducible clonus
      const positive =
        spont ||
        (induc && (agitation || diaph)) ||
        (ocular && (agitation || diaph)) ||
        (tremor && hyperref) ||
        (hypertonia && temp && (ocular || induc));

      return {
        score: positive ? 'Positive' : 'Negative',
        label: positive ? 'Meets Hunter Criteria' : 'Does not meet Hunter Criteria',
        interpretation: positive
          ? 'Serotonin toxicity criteria met. Discontinue serotonergic agents, supportive care, benzodiazepines for agitation; cyproheptadine considered in moderate cases; rapid cooling and paralysis/ICU for severe hyperthermia.'
          : 'Hunter criteria not met on selected features. Serotonin toxicity not excluded if early or atypical — reassess and differential includes NMS, sepsis, heat stroke, sympathomimetic OD.',
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'Spontaneous clonus', value: spont ? 'Yes' : 'No' },
          { label: 'Inducible clonus', value: induc ? 'Yes' : 'No' },
          { label: 'Ocular clonus', value: ocular ? 'Yes' : 'No' },
          { label: 'Agitation', value: agitation ? 'Yes' : 'No' },
          { label: 'Diaphoresis', value: diaph ? 'Yes' : 'No' },
          { label: 'Inducible/ocular clonus + agitation/diaphoresis', value: (induc || ocular) && (agitation || diaph) ? 'Yes' : 'No' },
          { label: 'Tremor + hyperreflexia', value: tremor && hyperref ? 'Yes' : 'No' },
          { label: 'Hypertonia + fever + clonus', value: hypertonia && temp && (ocular || induc) ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Hunter Criteria: serotonin toxicity if serotonergic agent AND (spontaneous clonus) OR (inducible/ocular clonus + agitation/diaphoresis) OR (tremor + hyperreflexia) OR (hypertonia + T>38 + ocular/inducible clonus).',
      formula: 'Boolean decision tree (Dunkley et al.)',
      validation: 'Derived from toxicology admissions; improved performance vs Sternbach criteria.',
      references: [
        {
          title: 'The Hunter Serotonin Toxicity Criteria',
          citation: 'Dunkley EJC et al. QJM. 2003',
          year: 2003,
          pmid: '12925718',
          doi: '10.1093/qjmed/hcg109',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive / severe', actions: ['Stop offenders', 'Benzodiazepines', 'Active cooling if hyperthermic', 'ICU for rigidity/hyperthermia', 'Avoid pure dopamine antagonists if SS likely'] },
    ],
    pearls: [
      'Clonus (especially inducible/ocular) is a key discriminator from NMS (lead-pipe rigidity, bradyreflexia).',
      'Onset of SS is usually hours; NMS often days.',
    ],
  },

  // ─── 10. NMS criteria ──────────────────────────────────────────────────────
  {
    id: 'nms-criteria',
    name: 'NMS Diagnostic Criteria Helper',
    shortName: 'NMS',
    description: 'Simplified neuroleptic malignant syndrome feature checklist (exposure + cardinal features).',
    category: 'toxicology',
    tags: ['nms', 'neuroleptic malignant', 'antipsychotic', 'rigidity', 'hyperthermia'],
    whenToUse: 'Fever and rigidity in a patient on antipsychotics or after abrupt dopamine agonist withdrawal.',
    whyUse: 'Structures cardinal features (exposure, rigidity, hyperthermia, autonomic instability, CK/mental status).',
    inputs: [
      yesNo('exposure', 'Dopamine antagonist exposure OR withdrawal of dopamine agonist'),
      yesNo('hyperthermia', 'Hyperthermia (typically ≥38 °C, often higher)'),
      yesNo('rigidity', 'Severe muscle rigidity (“lead-pipe”)'),
      yesNo('ck', 'Elevated CK / rhabdomyolysis evidence'),
      yesNo('ams', 'Altered mental status'),
      yesNo('autonomic', 'Autonomic instability (labile BP, tachycardia, diaphoresis, incontinence)'),
      yesNo('bradyreflexia', 'Bradyreflexia / normal reflexes (vs hyperreflexia of SS)'),
      yesNo('otherExcluded', 'Infectious / other causes judged less likely or excluded'),
    ],
    calculate(values) {
      const exposure = bool(values.exposure);
      const hyperthermia = bool(values.hyperthermia);
      const rigidity = bool(values.rigidity);
      const features = [
        hyperthermia,
        rigidity,
        bool(values.ck),
        bool(values.ams),
        bool(values.autonomic),
        bool(values.bradyreflexia),
        bool(values.otherExcluded),
      ].filter(Boolean).length;

      // Educational: classic tetrad-ish = exposure + hyperthermia + rigidity + other supportive
      const classic = exposure && hyperthermia && rigidity && features >= 4;
      const possible = exposure && (hyperthermia || rigidity) && features >= 3;

      let label = 'Unlikely NMS on checklist';
      let interpretation =
        'Few cardinal features selected. Continue broad differential (sepsis, heat stroke, serotonin syndrome, malignant hyperthermia, catatonia).';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';

      if (classic) {
        label = 'Compatible with NMS (high concern)';
        interpretation =
          'Exposure plus hyperthermia, rigidity, and multiple supportive features — treat as NMS until proven otherwise: stop antipsychotics, supportive care, cooling, volume/CK management; consider bromocriptine/amantadine or dantrolene per severity and consult.';
        riskLevel = 'high';
      } else if (possible) {
        label = 'Possible NMS';
        interpretation =
          'Some features of NMS present. Hospital evaluation, stop offending agents, rule out infection, compare with serotonin syndrome (clonus/hyperreflexia favors SS).';
        riskLevel = 'moderate';
      } else if (!exposure) {
        label = 'No classic exposure';
        interpretation = 'Without dopamine antagonist exposure or dopamine agonist withdrawal, NMS is unlikely — reconsider alternative diagnoses.';
        riskLevel = 'low';
      }

      return {
        score: features + (exposure ? 1 : 0),
        unit: 'features',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Exposure criterion', value: exposure ? 'Yes' : 'No' },
          { label: 'Hyperthermia', value: hyperthermia ? 'Yes' : 'No' },
          { label: 'Rigidity', value: rigidity ? 'Yes' : 'No' },
          { label: 'Supportive features tallied', value: String(features) },
        ],
      };
    },
    evidence: {
      summary:
        'NMS: idiosyncratic reaction to dopamine blockade (or agonist withdrawal) with rigidity, hyperthermia, autonomic instability, and altered mentation; CK often elevated. Expert/DSM-style criteria vary.',
      formula: 'Clinical syndrome checklist (educational, not a single validated point score)',
      validation: 'Multiple diagnostic criteria sets (Levenson, DSM-5, international consensus); this tool is a simplified bedside helper.',
      references: [
        {
          title: 'Neuroleptic malignant syndrome',
          citation: 'Gurrera RJ et al. / Caroff SN reviews',
          year: 2011,
          pmid: '21733489',
          doi: '10.4088/JCP.10m06438',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High concern NMS',
        actions: [
          'Stop dopamine antagonists (neuroleptics/antiemetics)',
          'Restart dopamine agonists if recently withdrawn',
          'ICU for severe cases',
          'IV fluids, cooling',
          'CK, renal function',
          'Psychiatry / neurology / toxicology',
        ],
      },
    ],
    pearls: [
      'Onset usually days (not minutes–hours like SS or MH under anesthesia).',
      'Restarting antipsychotics later requires extreme caution and delay.',
    ],
  },

  // ─── 11. Anticholinergic toxidrome ─────────────────────────────────────────
  {
    id: 'anticholinergic-tox',
    name: 'Anticholinergic Toxidrome Checklist',
    shortName: 'Anticholinergic',
    description: 'Counts classic anticholinergic features (“mad as a hatter…” mnemonic features).',
    category: 'toxicology',
    tags: ['anticholinergic', 'toxidrome', 'diphenhydramine', 'tca', 'atropine'],
    whenToUse: 'Altered patient with possible anticholinergic overdose (antihistamines, TCAs, atropine, plants).',
    whyUse: 'Rapid toxidrome pattern recognition guides physostigmine consideration and differential.',
    inputs: [
      yesNo('ams', 'Delirium / altered mental status (“mad as a hatter”)'),
      yesNo('flushed', 'Flushed skin (“red as a beet”)'),
      yesNo('dry', 'Dry skin/mucosa (“dry as a bone”)'),
      yesNo('mydriasis', 'Mydriasis (“blind as a bat”)'),
      yesNo('fever', 'Hyperthermia (“hot as a hare”)'),
      yesNo('urinary', 'Urinary retention (“full as a flask”)'),
      yesNo('tachy', 'Sinus tachycardia'),
      yesNo('decreasedBS', 'Decreased bowel sounds'),
    ],
    calculate(values) {
      const keys = ['ams', 'flushed', 'dry', 'mydriasis', 'fever', 'urinary', 'tachy', 'decreasedBS'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Few features (0–2)',
          interpretation: 'Limited anticholinergic features — toxidrome less likely; keep broad differential.',
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Suggestive (3–4)',
          interpretation: 'Several anticholinergic features — consider anticholinergic toxicity; ECG for TCA-like effects, supportive care, benzos for agitation.',
        },
        {
          max: 8,
          level: 'high',
          label: 'Classic toxidrome (≥5)',
          interpretation: 'Many classic features present — anticholinergic toxidrome likely. Avoid pure antipsychotics for delirium when possible; consider physostigmine only with appropriate expertise/monitoring and without TCA conduction toxicity.',
        },
      ]);
      return { score, unit: 'features', ...r };
    },
    evidence: {
      summary: 'Anticholinergic toxidrome: delirium, dry flushed skin, mydriasis, hyperthermia, urinary retention, tachycardia, decreased bowel sounds.',
      formula: 'Feature count (educational checklist)',
      validation: 'Classic toxicology teaching mnemonic; not a validated numeric risk score.',
      references: [
        {
          title: 'Toxicologic emergencies textbooks / review articles',
          citation: 'Toxicologic emergencies textbooks / review articles',
          year: 2015, url: 'https://www.ncbi.nlm.nih.gov/books/NBK537087/' },
      ],
    },
    nextSteps: [
      { condition: 'Likely anticholinergic OD', actions: ['ECG (QRS/QTc)', 'Benzodiazepines for agitation', 'Cooling if hot', 'Urinary catheter if retention', 'Poison center before physostigmine'] },
    ],
    pearls: ['Sympathomimetic toxidrome has diaphoretic skin; anticholinergic is dry.', 'TCA overdose may need sodium bicarb for wide QRS — not physostigmine.'],
  },

  // ─── 12. Cholinergic toxidrome ─────────────────────────────────────────────
  {
    id: 'cholinergic-tox',
    name: 'Cholinergic Toxidrome (SLUDGE / DUMBBELS)',
    shortName: 'Cholinergic',
    description: 'Checklist of muscarinic/nicotinic cholinergic features for organophosphate/carbamate-type toxicity.',
    category: 'toxicology',
    tags: ['cholinergic', 'organophosphate', 'nerve agent', 'sludge', 'dumbbels'],
    whenToUse: 'Suspected organophosphate, carbamate, nerve agent, or nicotine excess with secretory toxidrome.',
    whyUse: 'Early recognition drives atropine, pralidoxime (for OP), decontamination, and airway support.',
    inputs: [
      yesNo('salivation', 'Salivation / secretions'),
      yesNo('lacrimation', 'Lacrimation'),
      yesNo('urination', 'Urination'),
      yesNo('diarrhea', 'Diarrhea / defecation'),
      yesNo('gi', 'GI upset / emesis'),
      yesNo('emesis', 'Emesis (if separate)'),
      yesNo('bronchorrhea', 'Bronchorrhea / bronchospasm'),
      yesNo('bradycardia', 'Bradycardia (muscarinic)'),
      yesNo('miosis', 'Miosis'),
      yesNo('muscle', 'Muscle weakness / fasciculations (nicotinic)'),
      yesNo('ams', 'Altered mental status / seizures'),
    ],
    calculate(values) {
      const keys = [
        'salivation',
        'lacrimation',
        'urination',
        'diarrhea',
        'gi',
        'emesis',
        'bronchorrhea',
        'bradycardia',
        'miosis',
        'muscle',
        'ams',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const wetAirway = bool(values.bronchorrhea) || bool(values.salivation);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Few features',
          interpretation: 'Limited cholinergic features on checklist.',
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Suggestive cholinergic pattern',
          interpretation: 'Multiple SLUDGE/DUMBBELS features — consider cholinergic toxicity; prepare atropine and airway equipment.',
        },
        {
          max: 15,
          level: 'critical',
          label: 'Strong cholinergic toxidrome',
          interpretation: 'Many cholinergic features — treat aggressively: decontaminate, atropine titrated to drying of secretions, pralidoxime for OP, benzos for seizures, critical care.',
        },
      ]);
      return {
        score,
        unit: 'features',
        ...r,
        riskLevel: wetAirway && score >= 3 ? 'critical' : r.riskLevel,
        details: [{ label: 'Life-threat airway secretions/bronchospasm', value: wetAirway ? 'Present' : 'Not selected' }],
      };
    },
    evidence: {
      summary: 'Cholinergic (muscarinic) toxidrome: SLUDGE/DUMBBELS — secretions, urination, diarrhea, bronchorrhea/bradycardia/bronchospasm, emesis, lacrimation, salivation, miosis; nicotinic: fasciculations/weakness.',
      formula: 'Feature checklist',
      validation: 'Standard toxicology recognition tool; treatment titration is clinical (dry secretions), not score-based.',
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
        condition: 'Likely OP/carbamate',
        actions: ['PPE / decontamination', 'Atropine', 'Pralidoxime for OP', 'Benzodiazepines', 'Airway management'],
      },
    ],
    pearls: ['Atropine endpoint is drying of secretions, not heart rate normalization alone.', 'Nicotinic effects may cause initial tachycardia.'],
  },

  // ─── 13. Opioid toxidrome ──────────────────────────────────────────────────
  {
    id: 'opioid-toxidrome',
    name: 'Opioid Toxidrome Checklist',
    shortName: 'Opioid Toxidrome',
    description: 'Classic opioid toxidrome feature count (coma, miosis, respiratory depression).',
    category: 'toxicology',
    tags: ['opioid', 'toxidrome', 'heroin', 'fentanyl', 'overdose'],
    whenToUse: 'Suspected opioid intoxication with CNS and respiratory depression.',
    whyUse: 'The classic triad plus supporting features supports naloxone trial and monitoring plan.',
    inputs: [
      yesNo('respDepression', 'Respiratory depression / hypoventilation'),
      yesNo('cns', 'CNS depression / coma'),
      yesNo('miosis', 'Miosis'),
      yesNo('track', 'Track marks / known opioid use context'),
      yesNo('decreasedBS', 'Decreased bowel sounds'),
      yesNo('hypothermia', 'Mild hypothermia'),
      yesNo('responseNaloxone', 'Clear response to naloxone (if given)'),
    ],
    calculate(values) {
      const triad =
        (bool(values.respDepression) ? 1 : 0) + (bool(values.cns) ? 1 : 0) + (bool(values.miosis) ? 1 : 0);
      const keys = ['respDepression', 'cns', 'miosis', 'track', 'decreasedBS', 'hypothermia', 'responseNaloxone'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const classic = triad === 3 || (bool(values.respDepression) && bool(values.cns));

      let label = 'Few opioid features';
      let interpretation = 'Limited features of opioid toxidrome.';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';

      if (bool(values.respDepression)) {
        riskLevel = 'critical';
        label = 'Respiratory depression present';
        interpretation =
          'Airway/ventilation is priority. Naloxone titrated to breathing (not full arousal) if opioid suspected. Classic triad is supportive but miosis may be absent (meperidine, co-ingestants, extreme hypoxia).';
      } else if (classic || score >= 4) {
        label = 'Compatible with opioid toxidrome';
        interpretation = 'Multiple opioid features — consider naloxone, observation for renarcotization, screen for co-ingestants.';
        riskLevel = 'high';
      } else if (score >= 2) {
        label = 'Possible opioid effect';
        interpretation = 'Some features present — integrate history, scene, and response to therapy.';
        riskLevel = 'moderate';
      }

      if (bool(values.responseNaloxone)) {
        interpretation += ' Clear naloxone response strongly supports opioid contribution.';
      }

      return {
        score,
        unit: 'features',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Classic triad count', value: `${triad}/3` },
          { label: 'Total features', value: String(score) },
        ],
      };
    },
    evidence: {
      summary: 'Opioid toxidrome: CNS depression, respiratory depression, miosis (± decreased bowel sounds, mild hypothermia).',
      formula: 'Clinical checklist',
      validation: 'Classic toxicology teaching; treatment is clinical airway + naloxone titration.',
      references: [
        {
          title: 'CDC / clinical toxicology reviews',
          citation: 'CDC / clinical toxicology reviews',
          year: 2015, url: 'https://www.cdc.gov/' },
      ],
    },
    nextSteps: [
      { condition: 'Hypoventilation', actions: ['Support ventilation', 'Naloxone', 'Monitor for recurrence', 'Avoid large boluses in dependent patients when possible'] },
    ],
    pearls: ['Fentanyl and analogs may require repeated naloxone doses.', 'Clonidine can mimic opioid toxidrome with miosis and bradycardia.'],
  },

  // ─── 14. Pack-years ────────────────────────────────────────────────────────
  {
    id: 'pack-year',
    name: 'Pack-Years Smoking',
    shortName: 'Pack-Years',
    description: 'Calculates smoking pack-years = packs per day × years smoked.',
    category: 'general',
    tags: ['smoking', 'pack years', 'copd', 'lung cancer', 'tobacco'],
    whenToUse: 'Quantifying cumulative tobacco exposure for screening and risk discussion.',
    whyUse: 'Pack-years inform lung cancer screening eligibility and COPD risk framing.',
    inputs: [
      numberInput('ppd', 'Packs per day', {
        unit: 'packs/day',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        helpText: '20 cigarettes = 1 pack; e.g. 10 cig/day = 0.5',
      }),
      numberInput('years', 'Years smoked', { unit: 'years', min: 0, max: 80, step: 0.5, defaultValue: 30 }),
      numberInput('cpd', 'Or cigarettes per day (optional override)', {
        unit: 'cig/day',
        min: 0,
        max: 100,
        defaultValue: 0,
        helpText: 'If >0, packs/day is computed as cig/day ÷ 20',
      }),
    ],
    calculate(values) {
      const cpd = num(values.cpd, 0);
      const ppd = cpd > 0 ? cpd / 20 : num(values.ppd, 1);
      const years = num(values.years, 30);
      const packYears = round(ppd * years, 1);
      const r = riskFromThresholds(packYears, [
        {
          max: 0,
          level: 'normal',
          label: 'No cumulative pack-years',
          interpretation: 'No smoking exposure entered.',
        },
        {
          max: 19,
          level: 'moderate',
          label: '<20 pack-years',
          interpretation: `${packYears} pack-years. Still confers risk; USPSTF lung cancer LDCT criteria use ≥20 pack-years with age and quit-time rules (verify current guideline).`,
        },
        {
          max: 39,
          level: 'high',
          label: '20–39 pack-years',
          interpretation: `${packYears} pack-years. Significant cumulative exposure — assess lung cancer screening eligibility, CVD risk, and cessation support.`,
        },
        {
          max: 500,
          level: 'high',
          label: '≥40 pack-years',
          interpretation: `${packYears} pack-years. Heavy cumulative exposure — high priority for cessation, screening per guidelines, and comorbidity assessment.`,
        },
      ]);
      return {
        score: packYears,
        unit: 'pack-years',
        ...r,
        details: [
          { label: 'Packs per day used', value: String(round(ppd, 2)) },
          { label: 'Years', value: String(years) },
        ],
      };
    },
    evidence: {
      summary: 'Pack-years = (packs per day) × (years smoked). 1 pack = 20 cigarettes.',
      formula: 'pack-years = PPD × years = (cigarettes/day ÷ 20) × years',
      validation: 'Standard exposure metric in pulmonary and oncology guidelines.',
      references: [
        {
          title: 'USPSTF / NCCN smoking exposure definitions',
          citation: 'USPSTF / NCCN smoking exposure definitions',
          year: 2021, url: 'https://www.uspreventiveservicestaskforce.org/' },
      ],
    },
    nextSteps: [
      { condition: 'Any ongoing smoking', actions: ['Cessation counseling', 'Pharmacotherapy (NRT, varenicline, bupropion)', 'Screening eligibility check'] },
    ],
    pearls: ['Variable intensity over time: approximate average PPD × total years.', 'Pack-years do not capture marijuana/vaping dose well.'],
  },

  // ─── 15. Fagerström nicotine dependence ────────────────────────────────────
  {
    id: 'nicotine-dependence',
    name: 'Fagerström Test for Nicotine Dependence',
    shortName: 'FTND',
    description: 'Six-item Fagerström Test for Nicotine Dependence (FTND) total score 0–10.',
    category: 'general',
    tags: ['nicotine', 'fagerstrom', 'smoking', 'dependence', 'ftnd'],
    whenToUse: 'Assessing physical nicotine dependence to guide cessation intensity.',
    whyUse: 'Higher scores predict withdrawal severity and benefit from more intensive pharmacotherapy.',
    inputs: [
      selectInput('firstCig', 'Time to first cigarette after waking', [
        { label: 'Within 5 minutes (3)', value: 3 },
        { label: '6–30 minutes (2)', value: 2 },
        { label: '31–60 minutes (1)', value: 1 },
        { label: 'After 60 minutes (0)', value: 0 },
      ]),
      selectInput('forbidden', 'Difficult to refrain in no-smoking places', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('hateGiveUp', 'Which cigarette would you hate to give up?', [
        { label: 'The first one in the morning (1)', value: 1 },
        { label: 'All others (0)', value: 0 },
      ]),
      selectInput('cpd', 'Cigarettes per day', [
        { label: '10 or fewer (0)', value: 0 },
        { label: '11–20 (1)', value: 1 },
        { label: '21–30 (2)', value: 2 },
        { label: '31 or more (3)', value: 3 },
      ]),
      selectInput('morningMore', 'Smoke more frequently during first hours after waking?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('illSmoke', 'Smoke when ill enough to be in bed most of the day?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.firstCig, 0) +
        num(values.forbidden, 0) +
        num(values.hateGiveUp, 0) +
        num(values.cpd, 0) +
        num(values.morningMore, 0) +
        num(values.illSmoke, 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low dependence (0–2)',
          interpretation: 'Low nicotine dependence on FTND. Behavioral support ± short NRT may suffice; individualize.',
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Low–moderate (3–4)',
          interpretation: 'Low-to-moderate dependence. Consider NRT or other pharmacotherapy plus counseling.',
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate (5–6)',
          interpretation: 'Moderate dependence. Combination NRT or prescription pharmacotherapy often appropriate.',
        },
        {
          max: 10,
          level: 'high',
          label: 'High dependence (7–10)',
          interpretation: 'High nicotine dependence. Prefer combination therapy (e.g., patch + short-acting NRT, or varenicline) and close follow-up.',
        },
      ]);
      return { score, unit: 'points', ...r };
    },
    evidence: {
      summary: 'FTND six items scored to 0–10; higher scores indicate greater physical dependence on nicotine.',
      formula: 'Sum of 6 item scores (max 10)',
      validation: 'Widely used research and clinical instrument (Heatherton et al. revision of Fagerström Tolerance Questionnaire).',
      references: [
        {
          title: 'The Fagerström Test for Nicotine Dependence',
          citation: 'Heatherton TF et al. Br J Addict. 1991',
          year: 1991,
          pmid: '1932883',
          doi: '10.1111/j.1360-0443.1991.tb01879.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5–6', actions: ['Offer combination pharmacotherapy', 'Set quit date', 'Behavioral counseling', 'Follow-up'] },
    ],
    pearls: ['Time to first cigarette is one of the strongest single dependence items.', 'E-cigarette dependence tools differ from FTND.'],
  },

  // ─── 16. Alcohol units / standard drinks ───────────────────────────────────
  {
    id: 'alcohol-unit',
    name: 'Alcohol Content & Standard Drinks',
    shortName: 'Alcohol Units',
    description: 'Estimates grams of pure alcohol and US standard drinks from volume and ABV.',
    category: 'general',
    tags: ['alcohol', 'standard drink', 'abv', 'ethanol', 'units'],
    whenToUse: 'Counseling on intake, documenting exposure, or estimating ethanol load.',
    whyUse: 'Volume × ABV is more accurate than “number of drinks” when pour sizes vary.',
    inputs: [
      numberInput('volume', 'Drink volume', { unit: 'mL', min: 1, max: 5000, defaultValue: 355 }),
      numberInput('abv', 'Alcohol by volume (ABV)', { unit: '%', min: 0.1, max: 95, step: 0.1, defaultValue: 5 }),
      numberInput('count', 'Number of such drinks', { unit: 'drinks', min: 1, max: 30, defaultValue: 1 }),
      selectInput('standardDef', 'Standard drink definition', [
        { label: 'US (14 g alcohol)', value: 'us' },
        { label: 'UK unit (8 g alcohol)', value: 'uk' },
        { label: 'WHO / many EU (10 g)', value: 'who' },
      ]),
    ],
    calculate(values) {
      const volume = num(values.volume, 355);
      const abv = num(values.abv, 5);
      const count = num(values.count, 1);
      const def = String(values.standardDef ?? 'us');
      const gramsPerStd = def === 'uk' ? 8 : def === 'who' ? 10 : 14;
      // mass ethanol (g) = volume_mL × (ABV/100) × density 0.789 g/mL
      const gramsOne = volume * (abv / 100) * 0.789;
      const grams = round(gramsOne * count, 1);
      const stdDrinks = round(grams / gramsPerStd, 1);
      // rough peak BAC educational only — not full Widmark (sex/weight not entered fully)
      const r = riskFromThresholds(stdDrinks, [
        {
          max: 1,
          level: 'low',
          label: 'About 1 standard drink or less',
          interpretation: `${grams} g ethanol ≈ ${stdDrinks} standard drinks (${gramsPerStd} g each). Within many low-risk single-occasion limits for some adults (not for pregnancy/driving).`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Moderate occasion amount',
          interpretation: `${grams} g ≈ ${stdDrinks} standard drinks. May impair driving; binge thresholds often ≥4 (women) or ≥5 (men) US drinks/occasion.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'Heavy single-occasion intake',
          interpretation: `${grams} g ≈ ${stdDrinks} standard drinks — heavy episodic drinking range for many definitions; risk of acute harm rises.`,
        },
        {
          max: 1000,
          level: 'critical',
          label: 'Very high ethanol load',
          interpretation: `${grams} g ≈ ${stdDrinks} standard drinks — potentially dangerous acute load depending on tolerance, time, and co-ingestants.`,
        },
      ]);
      return {
        score: stdDrinks,
        unit: 'std drinks',
        ...r,
        details: [
          { label: 'Total pure alcohol', value: `${grams} g` },
          { label: 'Per drink', value: `${round(gramsOne, 1)} g` },
          { label: 'Standard definition', value: `${gramsPerStd} g/drink` },
          { label: 'Volume × count', value: `${volume * count} mL at ${abv}% ABV` },
        ],
      };
    },
    evidence: {
      summary: 'Grams alcohol = volume(mL) × ABV% × 0.789 / 100. US standard drink = 14 g; UK unit = 8 g; many countries use 10 g.',
      formula: 'g = mL × (ABV/100) × 0.789; drinks = g / standard_g',
      validation: 'Standard public-health conversion; density of ethanol ≈0.789 g/mL.',
      references: [
        {
          title: 'What is a standard drink?',
          citation: 'NIAAA / WHO alcohol unit definitions',
          year: 2023, url: 'https://www.niaaa.nih.gov/alcohols-effects-health/overview-alcohol-consumption/what-standard-drink' },
      ],
    },
    nextSteps: [
      { condition: 'Unhealthy use', actions: ['AUDIT-C screening', 'Brief intervention', 'Withdrawal risk assessment if dependent'] },
    ],
    pearls: ['Craft beer and free-poured wine often exceed “one drink.”', 'This does not compute BAC without weight, sex, and time.'],
  },

  // ─── 17. US Navy body fat ──────────────────────────────────────────────────
  {
    id: 'body-fat-navy',
    name: 'US Navy Body Fat Estimate',
    shortName: 'Navy BF%',
    description: 'Estimates body fat percentage using US Navy circumference method (height, neck, waist, hip).',
    category: 'general',
    tags: ['body fat', 'navy', 'composition', 'obesity', 'anthropometry'],
    whenToUse: 'Quick anthropometric body-fat estimate when DEXA/BIA unavailable.',
    whyUse: 'Simple field method used by US military standards; better than BMI alone for composition.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
      numberInput('height', 'Height', { unit: 'in', min: 48, max: 90, step: 0.1, defaultValue: 70 }),
      numberInput('neck', 'Neck circumference', { unit: 'in', min: 8, max: 30, step: 0.1, defaultValue: 15 }),
      numberInput('waist', 'Abdomen / waist circumference', {
        unit: 'in',
        min: 15,
        max: 70,
        step: 0.1,
        defaultValue: 34,
        helpText: 'Male: abdomen at navel; female: waist at narrowest',
      }),
      numberInput('hip', 'Hip circumference (female)', {
        unit: 'in',
        min: 20,
        max: 80,
        step: 0.1,
        defaultValue: 38,
        helpText: 'Required for female equation',
      }),
    ],
    calculate(values) {
      const sex = String(values.sex ?? 'male');
      const height = num(values.height, 70);
      const neck = num(values.neck, 15);
      const waist = num(values.waist, 34);
      const hip = num(values.hip, 38);

      let bf: number;
      if (sex === 'female') {
        const diff = waist + hip - neck;
        if (diff <= 0 || height <= 0) {
          return {
            score: '—',
            label: 'Invalid measurements',
            interpretation: 'Waist + hip must exceed neck; height must be >0.',
            riskLevel: 'info',
          };
        }
        bf = 163.205 * Math.log10(diff) - 97.684 * Math.log10(height) - 78.387;
      } else {
        const diff = waist - neck;
        if (diff <= 0 || height <= 0) {
          return {
            score: '—',
            label: 'Invalid measurements',
            interpretation: 'Abdomen must exceed neck circumference; height must be >0.',
            riskLevel: 'info',
          };
        }
        bf = 86.01 * Math.log10(diff) - 70.041 * Math.log10(height) + 36.76;
      }
      bf = round(bf, 1);
      if (bf < 2 || bf > 75) {
        return {
          score: bf,
          unit: '%',
          label: 'Out of expected range',
          interpretation: 'Result outside physiologic range — check units (inches) and measurement sites.',
          riskLevel: 'info',
        };
      }

      // ACSM-ish rough bands by sex
      const r =
        sex === 'female'
          ? riskFromThresholds(bf, [
              { max: 20, level: 'normal', label: 'Athletic / lower BF', interpretation: `Body fat ≈ ${bf}%. Lower range for women — interpret with sport/health context.` },
              { max: 24, level: 'normal', label: 'Fitness range', interpretation: `Body fat ≈ ${bf}% — generally healthy fitness range for many women.` },
              { max: 31, level: 'moderate', label: 'Average', interpretation: `Body fat ≈ ${bf}% — average range; lifestyle counseling as appropriate.` },
              { max: 100, level: 'high', label: 'Higher BF', interpretation: `Body fat ≈ ${bf}% — elevated; assess metabolic risk beyond BMI.` },
            ])
          : riskFromThresholds(bf, [
              { max: 13, level: 'normal', label: 'Athletic / lower BF', interpretation: `Body fat ≈ ${bf}%. Lower range for men — interpret with sport/health context.` },
              { max: 17, level: 'normal', label: 'Fitness range', interpretation: `Body fat ≈ ${bf}% — generally healthy fitness range for many men.` },
              { max: 24, level: 'moderate', label: 'Average', interpretation: `Body fat ≈ ${bf}% — average range; lifestyle counseling as appropriate.` },
              { max: 100, level: 'high', label: 'Higher BF', interpretation: `Body fat ≈ ${bf}% — elevated; assess metabolic risk beyond BMI.` },
            ]);

      return {
        score: bf,
        unit: '%',
        ...r,
        details: [
          { label: 'Sex', value: sex },
          { label: 'Method', value: 'US Navy circumference (log10 equations, inches)' },
        ],
      };
    },
    evidence: {
      summary:
        'Male %BF = 86.010·log10(abdomen−neck) − 70.041·log10(height) + 36.76. Female %BF = 163.205·log10(waist+hip−neck) − 97.684·log10(height) − 78.387 (inches).',
      formula: 'US Navy Hodgdon equations (log10 circumferences)',
      validation: 'Military population method; error vs DEXA can be several percentage points.',
      references: [
        {
          title: 'US Navy body composition equations',
          citation: 'Hodgdon JA, Beckett MB. Naval Health Research Center',
          year: 1984, url: 'https://www.usna.edu/PEDept/documents/navypep/Hodgdon_Beckett_1996.pdf' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated BF or metabolic risk', actions: ['Lifestyle intervention', 'Waist circumference / WHR', 'Cardiometabolic labs as indicated'] },
    ],
    pearls: ['Measurements must be in inches for these constants (convert cm ÷ 2.54).', 'Tape tension and site consistency matter.'],
  },

  // ─── 18. Waist-hip ratio ───────────────────────────────────────────────────
  {
    id: 'waist-hip-ratio',
    name: 'Waist–Hip Ratio (WHR)',
    shortName: 'WHR',
    description: 'Waist ÷ hip circumference with WHO-style central obesity risk bands by sex.',
    category: 'general',
    tags: ['whr', 'waist', 'obesity', 'metabolic', 'cardiometabolic'],
    whenToUse: 'Assessing central adiposity and cardiometabolic risk beyond BMI.',
    whyUse: 'WHR captures fat distribution associated with CVD and metabolic disease risk.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ]),
      numberInput('waist', 'Waist circumference', { unit: 'cm', min: 40, max: 200, defaultValue: 90 }),
      numberInput('hip', 'Hip circumference', { unit: 'cm', min: 50, max: 200, defaultValue: 100 }),
    ],
    calculate(values) {
      const sex = String(values.sex ?? 'female');
      const waist = num(values.waist, 90);
      const hip = num(values.hip, 100);
      if (hip <= 0) {
        return { score: '—', label: 'Invalid hip', interpretation: 'Hip circumference must be >0.', riskLevel: 'info' };
      }
      const whr = round(waist / hip, 2);
      // WHO: substantially increased risk often cited WHR ≥0.85 women, ≥0.90 men
      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'moderate' | 'high';

      if (sex === 'male') {
        if (whr < 0.9) {
          label = 'Lower central obesity risk (male)';
          interpretation = `WHR ${whr} is below common male central obesity threshold (0.90). Still integrate waist circumference and metabolic profile.`;
          riskLevel = 'normal';
        } else if (whr < 1.0) {
          label = 'Elevated WHR (male)';
          interpretation = `WHR ${whr} ≥0.90 — associated with increased cardiometabolic risk (WHO substantially increased risk band for men).`;
          riskLevel = 'high';
        } else {
          label = 'Markedly elevated WHR (male)';
          interpretation = `WHR ${whr} is high — strong central adiposity pattern; prioritize lifestyle and risk-factor management.`;
          riskLevel = 'high';
        }
      } else {
        if (whr < 0.8) {
          label = 'Lower central obesity risk (female)';
          interpretation = `WHR ${whr} is in a lower-risk band for women on many charts (<0.80).`;
          riskLevel = 'normal';
        } else if (whr < 0.85) {
          label = 'Intermediate WHR (female)';
          interpretation = `WHR ${whr} is intermediate; WHO substantially increased risk often cited at ≥0.85 for women.`;
          riskLevel = 'moderate';
        } else {
          label = 'Elevated WHR (female)';
          interpretation = `WHR ${whr} ≥0.85 — associated with increased cardiometabolic risk.`;
          riskLevel = 'high';
        }
      }

      return {
        score: whr,
        unit: 'ratio',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Waist', value: `${waist} cm` },
          { label: 'Hip', value: `${hip} cm` },
          { label: 'Common high-risk cut-point', value: sex === 'male' ? '≥0.90' : '≥0.85' },
        ],
      };
    },
    evidence: {
      summary: 'WHR = waist / hip. WHO substantially increased risk often: ≥0.90 men, ≥0.85 women (cut-points vary by guideline).',
      formula: 'WHR = waist ÷ hip (same units)',
      validation: 'Anthropometric risk marker validated epidemiologically for CVD and metabolic outcomes.',
      references: [
        {
          title: 'Waist circumference and waist–hip ratio (WHO)',
          citation: 'WHO Expert Consultation',
          year: 2008, url: 'https://www.who.int/publications/i/item/9241208945' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated WHR', actions: ['Lifestyle intervention', 'BP, lipids, A1c as indicated', 'Consider waist-alone thresholds too'] },
    ],
    pearls: ['Measure waist at midpoint between lower rib and iliac crest (protocol-dependent).', 'Ethnic-specific waist cutoffs differ more than WHR in some guidelines.'],
  },

  // ─── 19. TI-RADS simplified ────────────────────────────────────────────────
  {
    id: 'tirads',
    name: 'ACR TI-RADS (Simplified Points)',
    shortName: 'TI-RADS',
    description: 'Simplified ACR Thyroid Imaging Reporting and Data System point assignment and TR level.',
    category: 'endocrinology',
    tags: ['tirads', 'thyroid', 'nodule', 'ultrasound', 'acr'],
    whenToUse: 'Risk-stratifying thyroid nodules on ultrasound for FNA decisions.',
    whyUse: 'Standardizes lexicon and biopsy thresholds by TR level and size.',
    inputs: [
      selectInput('composition', 'Composition', [
        { label: 'Cystic / completely cystic (0)', value: 0 },
        { label: 'Spongiform (0)', value: 0 },
        { label: 'Mixed cystic/solid (1)', value: 1 },
        { label: 'Solid / almost completely solid (2)', value: 2 },
      ]),
      selectInput('echogenicity', 'Echogenicity', [
        { label: 'Anechoic (0)', value: 0 },
        { label: 'Hyperechoic or isoechoic (1)', value: 1 },
        { label: 'Hypoechoic (2)', value: 2 },
        { label: 'Very hypoechoic (3)', value: 3 },
      ]),
      selectInput('shape', 'Shape', [
        { label: 'Wider-than-tall (0)', value: 0 },
        { label: 'Taller-than-wide (3)', value: 3 },
      ]),
      selectInput('margin', 'Margin', [
        { label: 'Smooth (0)', value: 0 },
        { label: 'Ill-defined (0)', value: 0 },
        { label: 'Lobulated / irregular (2)', value: 2 },
        { label: 'Extra-thyroidal extension (3)', value: 3 },
      ]),
      selectInput('foci', 'Echogenic foci (choose highest / sum per ACR if multiple types)', [
        { label: 'None or large comet-tail (0)', value: 0 },
        { label: 'Macrocalcifications (1)', value: 1 },
        { label: 'Peripheral / rim calcifications (2)', value: 2 },
        { label: 'Punctate echogenic foci (3)', value: 3 },
      ]),
      numberInput('size', 'Largest diameter', { unit: 'cm', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 }),
    ],
    calculate(values) {
      const points =
        num(values.composition, 0) +
        num(values.echogenicity, 0) +
        num(values.shape, 0) +
        num(values.margin, 0) +
        num(values.foci, 0);
      const size = num(values.size, 1.5);

      let tr: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high';
      if (points === 0) {
        tr = 'TR1';
        riskLevel = 'normal';
      } else if (points === 2) {
        // ACR: 2 points = TR2; 1 point not used (min after 0 is 2 for TR2)
        tr = 'TR2';
        riskLevel = 'low';
      } else if (points === 1) {
        tr = 'TR2'; // treat 1 as benign-leaning category educationally
        riskLevel = 'low';
      } else if (points <= 3) {
        tr = 'TR3';
        riskLevel = 'low';
      } else if (points <= 6) {
        tr = 'TR4';
        riskLevel = 'moderate';
      } else {
        tr = 'TR5';
        riskLevel = 'high';
      }

      // FNA thresholds (ACR 2017): TR3 ≥2.5 cm FNA; TR4 ≥1.5; TR5 ≥1.0; follow thresholds lower
      let fna = 'No routine FNA from TR1/TR2';
      if (tr === 'TR3') {
        fna = size >= 2.5 ? 'FNA recommended (≥2.5 cm)' : size >= 1.5 ? 'Follow-up (≥1.5 cm)' : 'Usually no follow-up if <1.5 cm (per ACR size thresholds)';
      } else if (tr === 'TR4') {
        fna = size >= 1.5 ? 'FNA recommended (≥1.5 cm)' : size >= 1.0 ? 'Follow-up (≥1.0 cm)' : 'Below follow-up size threshold';
      } else if (tr === 'TR5') {
        fna = size >= 1.0 ? 'FNA recommended (≥1.0 cm)' : size >= 0.5 ? 'Follow-up (≥0.5 cm)' : 'Below follow-up size threshold';
      }

      return {
        score: points,
        unit: 'points',
        label: `${tr} (${points} pts)`,
        interpretation: `ACR TI-RADS ${tr} with ${points} points; nodule ${size} cm. ${fna}. Confirm with full ACR chart (multiple echogenic foci sum points; spongiform TR1).`,
        riskLevel,
        details: [
          { label: 'TR level', value: tr },
          { label: 'Size', value: `${size} cm` },
          { label: 'FNA / follow guidance', value: fna },
        ],
      };
    },
    evidence: {
      summary:
        'ACR TI-RADS sums points from composition, echogenicity, shape, margin, and echogenic foci → TR1–TR5 with size-based FNA thresholds.',
      formula: 'Points sum → TR level; FNA if TR3≥2.5 cm, TR4≥1.5 cm, TR5≥1.0 cm',
      validation: 'ACR 2017 white paper; widely adopted in radiology practice.',
      references: [
        {
          title: 'ACR Thyroid Imaging, Reporting and Data System (TI-RADS)',
          citation: 'Tessler FN et al. J Am Coll Radiol. 2017',
          year: 2017,
          pmid: '28372962',
          doi: '10.1016/j.jacr.2017.01.046',
        },
      ],
    },
    nextSteps: [
      { condition: 'FNA threshold met', actions: ['Ultrasound-guided FNA', 'Bethesda cytology interpretation', 'TSH if not done'] },
      { condition: 'Follow-up size', actions: ['Serial US per ACR intervals', 'Earlier if growth/suspicious change'] },
    ],
    pearls: [
      'Spongiform and pure cystic nodules are TR1 (benign) regardless of size for FNA purposes.',
      'This simplified tool may not sum multiple distinct echogenic-foci types — use full ACR rules when complex.',
    ],
  },

  // ─── 20. Bethesda thyroid ──────────────────────────────────────────────────
  {
    id: 'bethesda-thyroid',
    name: 'Bethesda Thyroid Cytology Interpreter',
    shortName: 'Bethesda',
    description: 'Maps Bethesda System for Reporting Thyroid Cytopathology category to risk and usual management.',
    category: 'endocrinology',
    tags: ['bethesda', 'thyroid', 'cytology', 'fna', 'nodule'],
    whenToUse: 'After thyroid FNA when a Bethesda category is reported.',
    whyUse: 'Standardizes implied malignancy risk and next-step framework (with 2017/2023 updates).',
    inputs: [
      selectInput('category', 'Bethesda category', [
        { label: 'I — Nondiagnostic / unsatisfactory', value: 1 },
        { label: 'II — Benign', value: 2 },
        { label: 'III — AUS / FLUS', value: 3 },
        { label: 'IV — Follicular neoplasm / suspicious for FN', value: 4 },
        { label: 'V — Suspicious for malignancy', value: 5 },
        { label: 'VI — Malignant', value: 6 },
      ]),
    ],
    calculate(values) {
      const cat = num(values.category, 2);
      const map: Record<
        number,
        { label: string; risk: string; interpretation: string; riskLevel: 'info' | 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'Bethesda I — Nondiagnostic',
          risk: '~5–10% (varies)',
          interpretation: 'Unsatisfactory sample. Repeat FNA with ultrasound guidance (often after ≥3 months unless high suspicion). Correlate with TI-RADS.',
          riskLevel: 'info',
        },
        2: {
          label: 'Bethesda II — Benign',
          risk: '~0–3%',
          interpretation: 'Benign cytology. Clinical/sonographic follow-up per guidelines; surgery not routinely indicated for cytology alone.',
          riskLevel: 'low',
        },
        3: {
          label: 'Bethesda III — AUS/FLUS',
          risk: '~10–30% (wide range)',
          interpretation: 'Atypia of undetermined significance. Options: repeat FNA, molecular testing, or diagnostic lobectomy based on clinical/sonographic risk and patient preference.',
          riskLevel: 'moderate',
        },
        4: {
          label: 'Bethesda IV — Follicular neoplasm',
          risk: '~25–40%',
          interpretation: 'Follicular neoplasm / suspicious for follicular neoplasm. Molecular testing or diagnostic surgery (often lobectomy) commonly considered.',
          riskLevel: 'moderate',
        },
        5: {
          label: 'Bethesda V — Suspicious for malignancy',
          risk: '~50–75%',
          interpretation: 'Suspicious for malignancy. Surgical management typically recommended (extent individualized).',
          riskLevel: 'high',
        },
        6: {
          label: 'Bethesda VI — Malignant',
          risk: '~97–99%',
          interpretation: 'Malignant cytology. Oncologic surgical planning (and often preoperative staging labs/imaging as indicated).',
          riskLevel: 'critical',
        },
      };
      const m = map[cat] ?? map[2];
      return {
        score: cat,
        unit: 'category',
        label: m.label,
        interpretation: `${m.interpretation} Approximate ROM: ${m.risk}. Institutional ROM and Bethesda 2023 refinements may differ.`,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Category', value: String(cat) },
          { label: 'Approx. risk of malignancy', value: m.risk },
        ],
      };
    },
    evidence: {
      summary:
        'Bethesda System categories I–VI with implied risks of malignancy and usual management (surveillance, molecular testing, or surgery).',
      formula: 'Category → risk band + management framework',
      validation: 'TBSRTC widely adopted; risk ranges updated in 2017 and 2023 editions.',
      references: [
        {
          title: 'The Bethesda System for Reporting Thyroid Cytopathology',
          citation: 'Cibas ES, Ali SZ. Thyroid. 2017 (and 2023 update)',
          year: 2017,
          pmid: '29091573',
          doi: '10.1089/thy.2017.0500',
        },
      ],
    },
    nextSteps: [
      { condition: 'III–IV', actions: ['Molecular testing discussion', 'Endocrine / surgery referral', 'Review sonographic risk'] },
      { condition: 'V–VI', actions: ['Surgical consultation', 'Pre-op TSH, vocal cord assessment as indicated', 'Staging workup if aggressive features'] },
    ],
    pearls: ['ROM varies by institution — use local data when available.', 'NIFTP reclassification lowered ROM for some historic categories.'],
  },

  // ─── 21. Burch-Wartofsky thyroid storm ─────────────────────────────────────
  {
    id: 'thyroid-storm-burch',
    name: 'Burch–Wartofsky Point Scale (Thyroid Storm)',
    shortName: 'BWPS',
    description: 'Burch-Wartofsky Point Scale for likelihood of thyroid storm.',
    category: 'endocrinology',
    tags: ['thyroid storm', 'burch', 'wartofsky', 'thyrotoxicosis', 'hyperthyroid'],
    whenToUse: 'Severe thyrotoxicosis when distinguishing uncomplicated thyrotoxicosis from thyroid storm.',
    whyUse: 'Points-based likelihood guides ICU-level multimodality therapy urgency.',
    inputs: [
      selectInput('temp', 'Thermoregulatory dysfunction (°C)', [
        // Mapped from classic BWPS °F bands: 99–99.9, 100–100.9, 101–101.9, 102–102.9, 103–103.9, ≥104
        { label: '<37.2 (0)', value: 0 },
        { label: '37.2–37.7 (5)', value: 5 },
        { label: '37.8–38.2 (10)', value: 10 },
        { label: '38.3–38.8 (15)', value: 15 },
        { label: '38.9–39.2 (20)', value: 20 },
        { label: '39.3–39.9 (25)', value: 25 },
        { label: '≥40 (30)', value: 30 },
      ]),
      selectInput('cns', 'CNS effects', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Mild (agitation) (10)', value: 10 },
        { label: 'Moderate (delirium/psychosis/extreme lethargy) (20)', value: 20 },
        { label: 'Severe (seizure/coma) (30)', value: 30 },
      ]),
      selectInput('gi', 'GI-hepatic dysfunction', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Moderate (diarrhea/N/V/abdominal pain) (10)', value: 10 },
        { label: 'Severe (unexplained jaundice) (20)', value: 20 },
      ]),
      selectInput('hr', 'Cardiovascular — tachycardia (bpm)', [
        { label: '<90 (0)', value: 0 },
        { label: '90–109 (5)', value: 5 },
        { label: '110–119 (10)', value: 10 },
        { label: '120–129 (15)', value: 15 },
        { label: '130–139 (20)', value: 20 },
        { label: '≥140 (25)', value: 25 },
      ]),
      selectInput('chf', 'Congestive heart failure', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Mild (pedal edema) (5)', value: 5 },
        { label: 'Moderate (bibasilar rales) (10)', value: 10 },
        { label: 'Severe (pulmonary edema) (15)', value: 15 },
      ]),
      selectInput('afib', 'Atrial fibrillation', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (10)', value: 10 },
      ]),
      selectInput('precipitant', 'Precipitant history', [
        { label: 'Negative (0)', value: 0 },
        { label: 'Positive (10)', value: 10 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.temp, 0) +
        num(values.cns, 0) +
        num(values.gi, 0) +
        num(values.hr, 0) +
        num(values.chf, 0) +
        num(values.afib, 0) +
        num(values.precipitant, 0);
      const r = riskFromThresholds(score, [
        {
          max: 24,
          level: 'low',
          label: 'Storm unlikely (≤24)',
          interpretation: 'BWPS ≤24: thyroid storm unlikely. Still treat significant thyrotoxicosis and monitor for decompensation.',
        },
        {
          max: 44,
          level: 'moderate',
          label: 'Impending storm (25–44)',
          interpretation: 'BWPS 25–44: impending thyroid storm. Aggressive therapy and close monitoring; many treat as storm if highly concerning clinically.',
        },
        {
          max: 200,
          level: 'critical',
          label: 'Storm likely (≥45)',
          interpretation: 'BWPS ≥45: thyroid storm highly likely. ICU care: synthetic free T4/T3, thionamide, iodine (after thionamide), steroids, beta-blockade, supportive care; treat precipitant.',
        },
      ]);
      return { score, unit: 'points', ...r };
    },
    evidence: {
      summary: 'Burch-Wartofsky Point Scale sums fever, CNS, GI-hepatic, tachycardia, CHF, AF, and precipitant points. ≥45 storm likely; 25–44 impending; <25 unlikely.',
      formula: 'Sum of category points (max theoretical high 140)',
      validation: 'Classic clinical scale (1993); used alongside Japan Thyroid Association criteria.',
      references: [
        {
          title: 'Life-threatening thyrotoxicosis: thyroid storm',
          citation: 'Burch HB, Wartofsky L. Endocrinol Metab Clin North Am. 1993',
          year: 1993,
          pmid: '8325286',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'BWPS ≥45 or clinical storm',
        actions: ['ICU', 'PTU or methimazole', 'Iodine ≥1 h after thionamide', 'Hydrocortisone', 'Propranolol (or alternative)', 'Identify precipitant'],
      },
    ],
    pearls: ['Do not give iodine before thionamide (risk of fueling hormone synthesis).', 'Avoid aspirin — may increase free T4.'],
  },

  // ─── 22. Myxedema coma score ───────────────────────────────────────────────
  {
    id: 'myxedema',
    name: 'Myxedema Coma Diagnostic Score (Simplified)',
    shortName: 'Myxedema',
    description: 'Simplified Popoveniuc-style myxedema coma scoring features for diagnostic likelihood.',
    category: 'endocrinology',
    tags: ['myxedema', 'hypothyroid', 'coma', 'thyroid', 'critical care'],
    whenToUse: 'Suspected decompensated hypothyroidism / myxedema coma in a critically ill patient.',
    whyUse: 'Structures thermoregulatory, CNS, cardiovascular, GI, and metabolic features while labs pending.',
    inputs: [
      selectInput('temp', 'Temperature (°C)', [
        { label: '>35 (0)', value: 0 },
        { label: '32–35 (10)', value: 10 },
        { label: '<32 (20)', value: 20 },
      ]),
      selectInput('cns', 'CNS / mentation', [
        { label: 'Normal / mild lethargy (0)', value: 0 },
        { label: 'Obtunded / somnolent (10)', value: 10 },
        { label: 'Stupor / coma / seizures (20)', value: 20 },
      ]),
      selectInput('hr', 'Heart rate', [
        { label: '≥60 (0)', value: 0 },
        { label: '50–59 (10)', value: 10 },
        { label: '<50 (20)', value: 20 },
      ]),
      selectInput('ecg', 'ECG / cardiovascular', [
        { label: 'Normal / nonspecific (0)', value: 0 },
        { label: 'Low voltage / long QT / bundle / heart block / pericardial effusion signs (10)', value: 10 },
      ]),
      selectInput('precipitant', 'Precipitating event (infection, cold, drugs, MI, etc.)', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (10)', value: 10 },
      ]),
      selectInput('gi', 'GI findings (anorexia, abdominal pain, constipation, ileus, megacolon)', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (10)', value: 10 },
      ]),
      selectInput('metabolic', 'Metabolic (hyponatremia, hypoglycemia, hypoxemia, hypercarbia, ↓GFR, anemia)', [
        { label: 'None (0)', value: 0 },
        { label: 'One abnormality (10)', value: 10 },
        { label: '≥2 abnormalities (20)', value: 20 },
      ]),
      yesNo('knownHypo', 'Known history of hypothyroidism / thyroidectomy / RAI', 10),
    ],
    calculate(values) {
      let score =
        num(values.temp, 0) +
        num(values.cns, 0) +
        num(values.hr, 0) +
        num(values.ecg, 0) +
        num(values.precipitant, 0) +
        num(values.gi, 0) +
        num(values.metabolic, 0);
      if (bool(values.knownHypo)) score += 10;

      // Original Popoveniuc: ≥60 highly suggestive / diagnostic; 25–59 supportive; <25 unlikely
      // Our simplified max is lower (~120) — use analogous bands scaled educationally
      const r = riskFromThresholds(score, [
        {
          max: 24,
          level: 'low',
          label: 'Unlikely myxedema coma (≤24)',
          interpretation: 'Score ≤24 on this simplified tool: myxedema coma unlikely, but treat overt hypothyroidism and search for other causes of illness.',
        },
        {
          max: 59,
          level: 'moderate',
          label: 'Possible / supportive (25–59)',
          interpretation: 'Intermediate score — compatible features present. Check TSH/free T4 urgently; if high clinical suspicion treat empirically while evaluating infection and other precipitants.',
        },
        {
          max: 200,
          level: 'critical',
          label: 'Highly suggestive (≥60)',
          interpretation: 'Score ≥60: highly suggestive of myxedema coma on simplified Popoveniuc-style framing. Empiric IV thyroid hormone per protocol, glucocorticoids until adrenal insufficiency excluded, passive rewarming, supportive ICU care, treat precipitant.',
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Known hypothyroidism bonus', value: bool(values.knownHypo) ? '+10' : '0' },
          { label: 'Note', value: 'Simplified educational adaptation — original full score has more granular items' },
        ],
      };
    },
    evidence: {
      summary:
        'Myxedema coma diagnostic scores (e.g., Popoveniuc et al.) assign points for hypothermia, CNS depression, cardiovascular findings, precipitants, GI and metabolic abnormalities; higher totals support diagnosis.',
      formula: 'Sum of simplified category points (educational adaptation)',
      validation: 'Based on published diagnostic scoring concepts; this implementation is simplified for bedside teaching — not a full reproduction of every original item.',
      references: [
        {
          title: 'A diagnostic scoring system for myxedema coma',
          citation: 'Popoveniuc G et al. Endocr Pract. 2014',
          year: 2014,
          pmid: '24518183',
          doi: '10.4158/EP13460.OR',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High suspicion',
        actions: [
          'ICU monitoring',
          'IV levothyroxine ± liothyronine per expert protocol',
          'Stress-dose steroids until AI excluded',
          'Cultures / treat infection',
          'Gentle rewarming',
          'Avoid sedatives',
        ],
      },
    ],
    pearls: [
      'Mortality remains high — treat on clinical grounds; do not wait for free T4 alone if unstable.',
      'Hyponatremia and hypoventilation are common metabolic features.',
    ],
  },
];
