import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave4IcuVentCalcs: Calculator[] = [
  // 1. Arterial oxygen content (CaO₂)
  {
    id: 'oxygen-content',
    name: 'Arterial Oxygen Content (CaO₂)',
    shortName: 'CaO₂',
    description: 'Arterial oxygen content from hemoglobin, SaO₂, and PaO₂.',
    category: 'critical-care',
    tags: ['oxygen', 'cao2', 'hemoglobin', 'icu', 'shock'],
    whenToUse: 'Shock, anemia, hypoxemia workups when quantifying blood O₂ carrying capacity.',
    whyUse: 'CaO₂ is the content term in DO₂ and O₂ extraction calculations.',
    inputs: [
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, defaultValue: 12 }),
      numberInput('sao2', 'SaO₂ (or SpO₂)', { unit: '%', min: 40, max: 100, defaultValue: 98 }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 90 }),
    ],
    calculate(values) {
      const hb = num(values.hb, 12);
      const sao2 = num(values.sao2, 98) / 100;
      const pao2 = num(values.pao2, 90);
      const bound = 1.34 * hb * sao2;
      const dissolved = 0.0031 * pao2;
      const cao2 = round(bound + dissolved, 2);
      const r = riskFromThresholds(cao2, [
        {
          max: 11.9,
          level: 'critical',
          label: 'Very low CaO₂',
          interpretation: `CaO₂ ${cao2} mL O₂/dL — severely reduced content (severe anemia and/or desaturation).`,
        },
        {
          max: 15.9,
          level: 'high',
          label: 'Low CaO₂',
          interpretation: `CaO₂ ${cao2} mL O₂/dL — below typical adult arterial range (~16–22). Address Hb and oxygenation.`,
        },
        {
          max: 22,
          level: 'normal',
          label: 'Typical CaO₂ range',
          interpretation: `CaO₂ ${cao2} mL O₂/dL — roughly typical resting arterial content.`,
        },
        {
          max: 40,
          level: 'info',
          label: 'High CaO₂',
          interpretation: `CaO₂ ${cao2} mL O₂/dL — high content (polycythemia and/or high PaO₂ contribution).`,
        },
      ]);
      return {
        score: cao2,
        unit: 'mL O₂/dL',
        ...r,
        details: [
          { label: 'Hb-bound O₂', value: `${round(bound, 2)} mL/dL` },
          { label: 'Dissolved O₂', value: `${round(dissolved, 2)} mL/dL` },
          { label: 'Formula', value: 'CaO₂ = (1.34 × Hb × SaO₂) + (0.0031 × PaO₂)' },
        ],
      };
    },
    evidence: {
      summary: 'Arterial oxygen content is almost entirely hemoglobin-bound; dissolved O₂ is usually negligible at ambient PaO₂.',
      formula: 'CaO₂ (mL/dL) = (1.34 × Hb × SaO₂ fraction) + (0.0031 × PaO₂)',
      validation: 'Core respiratory physiology; Hüfner constant ~1.34–1.39 mL O₂/g Hb depending on source.',
      references: [
        {
          title: 'Oxygen content and delivery physiology',
          citation: 'Nunn / West respiratory physiology; critical care reviews',
          year: 2012,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482316/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Low CaO₂',
        actions: [
          'Correct hypoxemia (airway, FiO₂, PEEP)',
          'Treat anemia only per restrictive transfusion thresholds unless active ischemia/bleeding',
          'Combine with CO for DO₂ and with CvO₂ for extraction ratio',
        ],
      },
    ],
    pearls: [
      'Dissolved term matters mainly with very high PaO₂ (e.g., hyperbaric).',
      'Use SaO₂ from ABG when available; SpO₂ may lag or misread with poor perfusion/dyes.',
    ],
  },

  // 2. Mixed venous oxygen content (CvO₂)
  {
    id: 'cvo2-content',
    name: 'Mixed Venous Oxygen Content (CvO₂)',
    shortName: 'CvO₂',
    description: 'Mixed venous oxygen content from Hb, SvO₂, and PvO₂ (PA catheter sample).',
    category: 'critical-care',
    tags: ['oxygen', 'cvo2', 'svo2', 'icu', 'shock'],
    whenToUse: 'When mixed venous (or sometimes central venous as surrogate) gases available for O₂ balance.',
    whyUse: 'Needed for AV O₂ difference, O₂ER, and Fick-based calculations.',
    inputs: [
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, defaultValue: 12 }),
      numberInput('svo2', 'SvO₂ (mixed venous)', { unit: '%', min: 20, max: 100, defaultValue: 70 }),
      numberInput('pvo2', 'PvO₂', { unit: 'mmHg', min: 10, max: 100, defaultValue: 40 }),
    ],
    calculate(values) {
      const hb = num(values.hb, 12);
      const svo2 = num(values.svo2, 70) / 100;
      const pvo2 = num(values.pvo2, 40);
      const cvo2 = round(1.34 * hb * svo2 + 0.0031 * pvo2, 2);
      const r = riskFromThresholds(cvo2, [
        {
          max: 8.9,
          level: 'critical',
          label: 'Very low CvO₂',
          interpretation: `CvO₂ ${cvo2} mL O₂/dL — markedly reduced venous content (low SvO₂ and/or anemia). Suggests high extraction or low delivery.`,
        },
        {
          max: 11.9,
          level: 'high',
          label: 'Low CvO₂',
          interpretation: `CvO₂ ${cvo2} mL O₂/dL — below typical mixed venous content (~12–15 with normal Hb).`,
        },
        {
          max: 16,
          level: 'normal',
          label: 'Typical CvO₂ range',
          interpretation: `CvO₂ ${cvo2} mL O₂/dL — roughly typical mixed venous content for normal Hb/SvO₂.`,
        },
        {
          max: 30,
          level: 'info',
          label: 'High CvO₂',
          interpretation: `CvO₂ ${cvo2} mL O₂/dL — high venous content (high SvO₂: low extraction, shunting, or high delivery/low VO₂).`,
        },
      ]);
      return {
        score: cvo2,
        unit: 'mL O₂/dL',
        ...r,
        details: [
          { label: 'SvO₂ used', value: `${num(values.svo2, 70)}%` },
          { label: 'Formula', value: 'CvO₂ = (1.34 × Hb × SvO₂) + (0.0031 × PvO₂)' },
        ],
      };
    },
    evidence: {
      summary: 'Mixed venous content uses PA blood; ScvO₂ from central venous catheter is a related but not identical surrogate.',
      formula: 'CvO₂ = (1.34 × Hb × SvO₂ fraction) + (0.0031 × PvO₂)',
      validation: 'Standard O₂ transport arithmetic; interpret SvO₂ with CO, Hb, SaO₂, and metabolic rate.',
      references: [
        {
          title: 'Mixed venous oxygen saturation and oxygen transport',
          citation: 'Critical care physiology reviews',
          year: 2010,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482316/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Low CvO₂ / low SvO₂',
        actions: [
          'Assess shock type and cardiac output',
          'Optimize DO₂ (preload, inotropes, oxygenation, Hb per thresholds)',
          'Reduce VO₂ when appropriate (fever, work of breathing, agitation)',
        ],
      },
    ],
    pearls: [
      'True mixed venous is PA; ScvO₂ often runs ~5% higher than SvO₂ in shock (variable).',
      'High SvO₂ can reflect impaired extraction (sepsis, shunting, cyanide) or high flow.',
    ],
  },

  // 3. Oxygen extraction ratio
  {
    id: 'oxygen-extraction',
    name: 'Oxygen Extraction Ratio (O₂ER)',
    shortName: 'O₂ER',
    description: 'Tissue oxygen extraction: O₂ER = (CaO₂ − CvO₂) / CaO₂.',
    category: 'critical-care',
    tags: ['o2er', 'extraction', 'shock', 'icu', 'oxygen'],
    whenToUse: 'Shock / high-risk ICU when arterial and mixed venous contents (or saturations with shared Hb) are known.',
    whyUse: 'Summarizes balance between O₂ delivery and consumption; rises when delivery falls or demand rises.',
    inputs: [
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, defaultValue: 12 }),
      numberInput('sao2', 'SaO₂', { unit: '%', min: 40, max: 100, defaultValue: 98 }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 90 }),
      numberInput('svo2', 'SvO₂', { unit: '%', min: 20, max: 100, defaultValue: 70 }),
      numberInput('pvo2', 'PvO₂', { unit: 'mmHg', min: 10, max: 100, defaultValue: 40 }),
    ],
    calculate(values) {
      const hb = num(values.hb, 12);
      const cao2 = 1.34 * hb * (num(values.sao2, 98) / 100) + 0.0031 * num(values.pao2, 90);
      const cvo2 = 1.34 * hb * (num(values.svo2, 70) / 100) + 0.0031 * num(values.pvo2, 40);
      if (cao2 <= 0) {
        return {
          score: '—',
          label: 'Invalid CaO₂',
          interpretation: 'Arterial content must be > 0 to compute extraction ratio.',
          riskLevel: 'info',
        };
      }
      const o2er = round(((cao2 - cvo2) / cao2) * 100, 1);
      const avDiff = round(cao2 - cvo2, 2);
      const r = riskFromThresholds(o2er, [
        {
          max: 14.9,
          level: 'info',
          label: 'Low extraction',
          interpretation: `O₂ER ${o2er}% — low extraction (high flow, low VO₂, shunting, or impaired utilization).`,
        },
        {
          max: 30,
          level: 'normal',
          label: 'Typical extraction',
          interpretation: `O₂ER ${o2er}% — within common resting range (~20–30%).`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Elevated extraction',
          interpretation: `O₂ER ${o2er}% — increased extraction; delivery may be marginal relative to demand.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High extraction',
          interpretation: `O₂ER ${o2er}% — high extraction; risk of supply dependence and anaerobic metabolism. Optimize DO₂ and reduce demand.`,
        },
      ]);
      return {
        score: o2er,
        unit: '%',
        ...r,
        details: [
          { label: 'CaO₂', value: `${round(cao2, 2)} mL/dL` },
          { label: 'CvO₂', value: `${round(cvo2, 2)} mL/dL` },
          { label: 'C(a−v)O₂', value: `${avDiff} mL/dL` },
        ],
      };
    },
    evidence: {
      summary: 'O₂ER links arterial–venous content difference to arterial content; complementary to SvO₂.',
      formula: 'O₂ER = (CaO₂ − CvO₂) / CaO₂; CaO₂/CvO₂ = (1.34×Hb×S) + (0.0031×PO₂)',
      validation: 'Physiologic construct; thresholds vary with sedation, temperature, and anemia.',
      references: [
        {
          title: 'Oxygen extraction and supply dependence in critical illness',
          citation: 'Critical care oxygen transport literature',
          year: 2004,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482316/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'O₂ER high / SvO₂ low',
        actions: ['Raise DO₂ if shock', 'Control fever/shivering/work of breathing', 'Check lactate and end-organ perfusion'],
      },
      {
        condition: 'O₂ER low / SvO₂ high in shock',
        actions: ['Consider distributive shock or impaired utilization', 'Source control and sepsis care if infection'],
      },
    ],
    pearls: ['Rough shortcut: O₂ER ≈ (SaO₂ − SvO₂)/SaO₂ when dissolved O₂ ignored and Hb constant.'],
  },

  // 4. Ventilation index
  {
    id: 'ventilation-index',
    name: 'Ventilation Index (VI)',
    shortName: 'VI',
    description: 'VI = [RR × (PIP − PEEP) × PaCO₂] / 1000 — intensity of mechanical ventilation for a given PaCO₂.',
    category: 'critical-care',
    tags: ['ventilation', 'vi', 'ards', 'pediatrics', 'icu'],
    whenToUse: 'Ventilated patients (classically pediatric) when grading ventilatory support intensity.',
    whyUse: 'Integrates rate, driving pressure component (PIP−PEEP), and CO₂; higher VI = more intense support.',
    inputs: [
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 5, max: 80, defaultValue: 20 }),
      numberInput('pip', 'Peak inspiratory pressure (PIP)', { unit: 'cm H₂O', min: 5, max: 60, defaultValue: 25 }),
      numberInput('peep', 'PEEP', { unit: 'cm H₂O', min: 0, max: 30, defaultValue: 5 }),
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 15, max: 120, defaultValue: 45 }),
    ],
    calculate(values) {
      const rr = num(values.rr, 20);
      const pip = num(values.pip, 25);
      const peep = num(values.peep, 5);
      const paco2 = num(values.paco2, 45);
      const delta = pip - peep;
      const vi = round((rr * delta * paco2) / 1000, 1);
      const r = riskFromThresholds(vi, [
        {
          max: 20,
          level: 'low',
          label: 'Lower intensity',
          interpretation: `VI ${vi}: relatively lower ventilatory intensity for the observed PaCO₂.`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Moderate intensity',
          interpretation: `VI ${vi}: moderate support intensity. Reassess lung-protective targets and dead space.`,
        },
        {
          max: 70,
          level: 'high',
          label: 'High intensity',
          interpretation: `VI ${vi}: high intensity. Optimize compliance/resistance, consider permissive hypercapnia strategy if appropriate.`,
        },
        {
          max: 500,
          level: 'critical',
          label: 'Very high intensity',
          interpretation: `VI ${vi}: very high ventilatory intensity — historically associated with severe disease / ECMO discussions in some pediatric pathways.`,
        },
      ]);
      return {
        score: vi,
        unit: 'VI',
        ...r,
        details: [
          { label: 'PIP − PEEP', value: `${round(delta, 1)} cm H₂O` },
          { label: 'Formula', value: 'VI = RR × (PIP − PEEP) × PaCO₂ / 1000' },
        ],
      };
    },
    evidence: {
      summary: 'Ventilation index quantifies how much pressure-rate product is required to achieve a given PaCO₂.',
      formula: 'VI = [RR × (PIP − PEEP) × PaCO₂] / 1000',
      validation: 'Used in neonatal/pediatric respiratory failure literature; adult use is adjunctive to driving pressure and mechanical power concepts.',
      references: [
        {
          title: 'Ventilation index and outcome in children with acute respiratory distress syndrome',
          citation: 'Paret G et al. Pediatr Pulmonol. 1998',
          year: 1998,
          pmid: '9727764',
          doi: '10.1002/(sici)1099-0496(199808)26:2<125::aid-ppul9>3.0.co;2-l',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Rising VI',
        actions: [
          'Treat reversible obstruction/edema',
          'Lung-protective settings; avoid excessive PIP',
          'Consider advanced therapies per local criteria if refractory',
        ],
      },
    ],
    pearls: ['VI uses PIP not Pplat; overestimates “elastic” load when Raw is high.'],
  },

  // 5. Rapid shallow breathing index
  {
    id: 'rsbi',
    name: 'Rapid Shallow Breathing Index (RSBI)',
    shortName: 'RSBI',
    description: 'f/Vt weaning predictor: respiratory frequency divided by tidal volume in liters.',
    category: 'critical-care',
    tags: ['weaning', 'rsbi', 'extubation', 'ventilation', 'icu'],
    whenToUse: 'Spontaneous breathing trial assessment for readiness to wean/extubate.',
    whyUse: 'Simple bedside predictor; RSBI <105 breaths/min/L associated with weaning success in classic studies.',
    inputs: [
      numberInput('f', 'Respiratory frequency (f)', { unit: '/min', min: 4, max: 60, defaultValue: 24 }),
      numberInput('vt', 'Tidal volume (Vt)', {
        unit: 'mL',
        min: 50,
        max: 1200,
        defaultValue: 350,
        helpText: 'Average spontaneous Vt during SBT; converted to liters for f/Vt',
      }),
    ],
    calculate(values) {
      const f = num(values.f, 24);
      const vtMl = num(values.vt, 350);
      const vtL = vtMl / 1000;
      if (vtL <= 0) {
        return {
          score: '—',
          label: 'Invalid Vt',
          interpretation: 'Tidal volume must be > 0.',
          riskLevel: 'info',
        };
      }
      const rsbi = round(f / vtL, 0);
      const r = riskFromThresholds(rsbi, [
        {
          max: 80,
          level: 'low',
          label: 'Favorable RSBI',
          interpretation: `RSBI ${rsbi} breaths/min/L — well below classic 105 cutoff; supports weaning readiness if other criteria met.`,
        },
        {
          max: 105,
          level: 'moderate',
          label: 'Borderline–acceptable',
          interpretation: `RSBI ${rsbi} — at or under Yang-Tobin threshold (<105). Integrate with SBT tolerance, secretions, airway protection.`,
        },
        {
          max: 140,
          level: 'high',
          label: 'Elevated RSBI',
          interpretation: `RSBI ${rsbi} — above classic success threshold; higher risk of weaning failure. Reassess load/capacity.`,
        },
        {
          max: 400,
          level: 'critical',
          label: 'Very high RSBI',
          interpretation: `RSBI ${rsbi} — rapid shallow pattern; poor weaning candidate until physiology improves.`,
        },
      ]);
      return {
        score: rsbi,
        unit: 'breaths/min/L',
        ...r,
        details: [
          { label: 'f', value: `${f} /min` },
          { label: 'Vt', value: `${vtMl} mL (${round(vtL, 3)} L)` },
          { label: 'Formula', value: 'RSBI = f / Vt(L)' },
        ],
      };
    },
    evidence: {
      summary: 'Yang & Tobin described f/Vt as a weaning predictor; threshold ~105 breaths/min/L is widely cited.',
      formula: 'RSBI = frequency (breaths/min) ÷ tidal volume (L)',
      validation: 'Useful screening tool but imperfect alone; modern weaning uses SBT performance and clinical gestalt.',
      references: [
        {
          title: 'A prospective study of indexes predicting the outcome of trials of weaning from mechanical ventilation',
          citation: 'Yang KL, Tobin MJ. N Engl J Med. 1991',
          year: 1991,
          pmid: '2023603',
          doi: '10.1056/NEJM199105233242101',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'RSBI <105 + successful SBT',
        actions: ['Assess cuff leak/airway protection as indicated', 'Plan extubation with post-extubation support strategy'],
      },
      {
        condition: 'RSBI ≥105 or failed SBT',
        actions: ['Rest on prior settings', 'Address volume overload, weakness, secretions, acidosis', 'Daily readiness screens'],
      },
    ],
    pearls: [
      'Measure during spontaneous breathing on minimal/no support, not fully controlled MV.',
      'Enter Vt in mL; calculator converts to liters.',
    ],
  },

  // 6. ARDSNet predicted body weight
  {
    id: 'predicted-body-weight',
    name: 'Predicted Body Weight (ARDSNet PBW)',
    shortName: 'PBW',
    description: 'Sex- and height-based predicted body weight used for lung-protective tidal volume targets.',
    category: 'critical-care',
    tags: ['ards', 'pbw', 'ardsnet', 'ibw', 'ventilation'],
    whenToUse: 'Any adult on invasive ventilation when setting mL/kg tidal volume (especially ARDS).',
    whyUse: 'Vt is dosed by PBW, not actual weight, to avoid overdistension in obesity.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 220, defaultValue: 170 }),
    ],
    calculate(values) {
      const male = String(values.sex ?? 'M') === 'M';
      const height = num(values.height, 170);
      const pbw = round((male ? 50 : 45.5) + 0.91 * (height - 152.4), 1);
      const vt6 = round(6 * pbw, 0);
      const vt4 = round(4 * pbw, 0);
      const vt8 = round(8 * pbw, 0);
      return {
        score: pbw,
        unit: 'kg',
        label: `PBW ${pbw} kg`,
        interpretation: `ARDSNet predicted body weight ${pbw} kg (${male ? 'male' : 'female'}, height ${height} cm). 6 mL/kg ≈ ${vt6} mL (range 4–8 mL/kg: ${vt4}–${vt8} mL).`,
        riskLevel: 'info',
        details: [
          { label: '4 mL/kg', value: `${vt4} mL` },
          { label: '6 mL/kg', value: `${vt6} mL` },
          { label: '8 mL/kg', value: `${vt8} mL` },
        ],
        recommendations: ['Use PBW for Vt; use actual weight for most drug dosing unless specified'],
      };
    },
    evidence: {
      summary: 'NHLBI ARDS Network PBW equations standardize lung volume estimates by height and sex.',
      formula: 'Male: 50 + 0.91×(ht_cm − 152.4); Female: 45.5 + 0.91×(ht_cm − 152.4)',
      validation: 'Used in ARDSNet low-Vt trial and subsequent ARDS guidelines.',
      references: [
        {
          title: 'Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and ARDS',
          citation: 'ARDS Network. N Engl J Med. 2000',
          year: 2000,
          pmid: '10793162',
          doi: '10.1056/NEJM200005043421801',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'ARDS or risk of ARDS',
        actions: ['Target ~6 mL/kg PBW', 'Plateau pressure ≤30 cm H₂O', 'Titrate PEEP/FiO₂ per protocol'],
      },
    ],
    pearls: ['Measure height carefully (or ulna/arm span estimates if supine and unknown).', 'PBW ≠ ideal body weight formulas used for drugs.'],
  },

  // 7. ARDS tidal volume target
  {
    id: 'tidal-volume-ards',
    name: 'ARDS Tidal Volume Target (6 mL/kg PBW)',
    shortName: 'Vt ARDS',
    description: 'Computes lung-protective tidal volume from sex, height, and desired mL/kg PBW.',
    category: 'critical-care',
    tags: ['ards', 'tidal volume', 'lung protective', 'pbw', 'ventilation'],
    whenToUse: 'Setting or checking Vt on invasive ventilation for ARDS or prevention of VILI.',
    whyUse: 'Low tidal volume (~6 mL/kg PBW) reduces mortality in ARDS versus traditional 12 mL/kg.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 220, defaultValue: 170 }),
      numberInput('mlPerKg', 'Target mL/kg PBW', {
        unit: 'mL/kg',
        min: 4,
        max: 10,
        step: 0.5,
        defaultValue: 6,
        helpText: 'ARDSNet primary target 6; range often 4–8 to keep Pplat ≤30',
      }),
    ],
    calculate(values) {
      const male = String(values.sex ?? 'M') === 'M';
      const height = num(values.height, 170);
      const mlPerKg = num(values.mlPerKg, 6);
      const pbw = round((male ? 50 : 45.5) + 0.91 * (height - 152.4), 1);
      const vt = round(mlPerKg * pbw, 0);
      let riskLevel: 'normal' | 'moderate' | 'high' | 'info' = 'normal';
      let label = 'Lung-protective target';
      let interpretation = `Vt ${vt} mL at ${mlPerKg} mL/kg PBW (PBW ${pbw} kg).`;
      if (mlPerKg <= 6.5) {
        riskLevel = 'normal';
        label = 'Low-Vt ARDS target';
        interpretation += ' Aligns with ARDSNet low tidal volume strategy; still limit Pplat ≤30 cm H₂O.';
      } else if (mlPerKg <= 8) {
        riskLevel = 'moderate';
        label = 'Upper lung-protective range';
        interpretation += ' Within common 4–8 mL/kg band — reduce if Pplat >30 or driving pressure high.';
      } else {
        riskLevel = 'high';
        label = 'Above usual protective range';
        interpretation += ' >8 mL/kg PBW is above typical protective targets for ARDS — reconsider unless exceptional circumstances.';
      }
      return {
        score: vt,
        unit: 'mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'PBW', value: `${pbw} kg` },
          { label: 'mL/kg', value: String(mlPerKg) },
          { label: '6 mL/kg reference', value: `${round(6 * pbw, 0)} mL` },
        ],
      };
    },
    evidence: {
      summary: 'ARDSNet demonstrated mortality benefit of 6 vs 12 mL/kg PBW with Pplat limit 30 cm H₂O.',
      formula: 'Vt (mL) = (mL/kg) × PBW; PBW male/female ARDSNet equations from height',
      validation: 'Guideline-endorsed lung-protective ventilation cornerstone.',
      references: [
        {
          title: 'Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome',
          citation: 'ARDS Network. N Engl J Med. 2000',
          year: 2000,
          pmid: '10793162',
          doi: '10.1056/NEJM200005043421801',
        },
        {
          title: 'Guidelines on mechanical ventilation of patients with ARDS',
          citation: 'Fan E et al. Am J Respir Crit Care Med. 2017 (ATS/ESICM/SCCM)',
          year: 2017,
          pmid: '29016366',
          doi: '10.1097/MCC.0000000000000459',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Pplat >30 cm H₂O',
        actions: ['Reduce Vt toward 4 mL/kg PBW', 'Optimize sedation/synchrony', 'Consider prone if severe ARDS'],
      },
    ],
    pearls: ['Volume targets assume correct height; document PBW on the vent sheet.'],
  },

  // 8. Driving pressure
  {
    id: 'driving-pressure',
    name: 'Driving Pressure (ΔP)',
    shortName: 'ΔP',
    description: 'Driving pressure = plateau pressure − PEEP; elastic load related to Vt/Crs.',
    category: 'critical-care',
    tags: ['driving pressure', 'ards', 'pplat', 'peep', 'vili'],
    whenToUse: 'Volume- or pressure-controlled ventilation with measurable end-inspiratory plateau.',
    whyUse: 'ΔP is strongly associated with ARDS mortality; aim often ≤15 cm H₂O when feasible.',
    inputs: [
      numberInput('pplat', 'Plateau pressure (Pplat)', { unit: 'cm H₂O', min: 5, max: 60, step: 0.5, defaultValue: 22 }),
      numberInput('peep', 'Total PEEP', { unit: 'cm H₂O', min: 0, max: 30, step: 0.5, defaultValue: 10 }),
    ],
    calculate(values) {
      const pplat = num(values.pplat, 22);
      const peep = num(values.peep, 10);
      const dp = round(pplat - peep, 1);
      if (dp < 0) {
        return {
          score: dp,
          unit: 'cm H₂O',
          label: 'Check inputs',
          interpretation: 'Pplat is less than PEEP — verify plateau measurement (inspiratory hold) and PEEP.',
          riskLevel: 'info',
        };
      }
      const r = riskFromThresholds(dp, [
        {
          max: 14,
          level: 'low',
          label: 'ΔP in preferred range',
          interpretation: `Driving pressure ${dp} cm H₂O — at or under commonly cited ~15 cm H₂O association threshold.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'ΔP at threshold',
          interpretation: `Driving pressure ${dp} cm H₂O — at Amato threshold region; further increases associate with worse outcomes in ARDS cohorts.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Elevated ΔP',
          interpretation: `Driving pressure ${dp} cm H₂O — elevated. Reduce Vt and/or optimize PEEP/recruitment balance if safe.`,
        },
        {
          max: 50,
          level: 'critical',
          label: 'Very high ΔP',
          interpretation: `Driving pressure ${dp} cm H₂O — very high elastic load / VILI risk. Urgent vent strategy revision.`,
        },
      ]);
      return {
        score: dp,
        unit: 'cm H₂O',
        ...r,
        details: [
          { label: 'Pplat', value: `${pplat} cm H₂O` },
          { label: 'PEEP', value: `${peep} cm H₂O` },
          { label: 'Formula', value: 'ΔP = Pplat − PEEP' },
        ],
      };
    },
    evidence: {
      summary: 'In ARDS, driving pressure mediates much of the mortality association of Vt and PEEP.',
      formula: 'ΔP = Pplat − PEEP (= Vt / Crs when linear)',
      validation: 'Amato et al. mediation analysis; subsequent observational support; trials of ΔP-targeted strategies ongoing/variable.',
      references: [
        {
          title: 'Driving pressure and survival in the acute respiratory distress syndrome',
          citation: 'Amato MBP et al. N Engl J Med. 2015',
          year: 2015,
          pmid: '25693014',
          doi: '10.1056/NEJMsa1410639',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'ΔP >15',
        actions: [
          'Lower Vt if Pplat allows room on gas exchange',
          'Reassess PEEP (overdistension vs derecruitment)',
          'Prone positioning for moderate–severe ARDS',
        ],
      },
    ],
    pearls: ['Measure Pplat with 0.5 s inspiratory pause, patient passive.', 'In spontaneous breathing, Pplat/ΔP interpretation is limited.'],
  },

  // 9. Static compliance
  {
    id: 'compliance-static',
    name: 'Static Respiratory Compliance (Cstat)',
    shortName: 'Cstat',
    description: 'Static compliance of the respiratory system: Cstat = Vt / (Pplat − PEEP).',
    category: 'critical-care',
    tags: ['compliance', 'cstat', 'crs', 'ards', 'ventilation'],
    whenToUse: 'Passive ventilated patients with reliable plateau pressure.',
    whyUse: 'Tracks stiffness of lung/chest wall; falling Cstat suggests edema, fibrosis, abdominal hypertension, mainstem intubation.',
    inputs: [
      numberInput('vt', 'Tidal volume (exhaled)', { unit: 'mL', min: 50, max: 1200, defaultValue: 400 }),
      numberInput('pplat', 'Plateau pressure', { unit: 'cm H₂O', min: 5, max: 60, step: 0.5, defaultValue: 22 }),
      numberInput('peep', 'Total PEEP', { unit: 'cm H₂O', min: 0, max: 30, step: 0.5, defaultValue: 10 }),
    ],
    calculate(values) {
      const vt = num(values.vt, 400);
      const pplat = num(values.pplat, 22);
      const peep = num(values.peep, 10);
      const dp = pplat - peep;
      if (dp <= 0) {
        return {
          score: '—',
          label: 'Invalid ΔP',
          interpretation: 'Pplat must exceed PEEP to calculate compliance.',
          riskLevel: 'info',
        };
      }
      const cstat = round(vt / dp, 1);
      const r = riskFromThresholds(cstat, [
        {
          max: 19,
          level: 'critical',
          label: 'Very low compliance',
          interpretation: `Cstat ${cstat} mL/cm H₂O — severely reduced (severe ARDS, fibrosis, obesity/abdomen, or mis-set hold).`,
        },
        {
          max: 39,
          level: 'high',
          label: 'Low compliance',
          interpretation: `Cstat ${cstat} mL/cm H₂O — low (common in moderate–severe ARDS). Watch driving pressure.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Borderline–reduced',
          interpretation: `Cstat ${cstat} mL/cm H₂O — below normal (~50–80+). Correlate with disease trajectory.`,
        },
        {
          max: 100,
          level: 'normal',
          label: 'Near-normal / normal',
          interpretation: `Cstat ${cstat} mL/cm H₂O — near typical passive respiratory system compliance range.`,
        },
        {
          max: 300,
          level: 'info',
          label: 'High compliance',
          interpretation: `Cstat ${cstat} mL/cm H₂O — high (emphysema, overestimation if leak/active breathing).`,
        },
      ]);
      return {
        score: cstat,
        unit: 'mL/cm H₂O',
        ...r,
        details: [
          { label: 'Driving pressure', value: `${round(dp, 1)} cm H₂O` },
          { label: 'Formula', value: 'Cstat = Vt / (Pplat − PEEP)' },
        ],
      };
    },
    evidence: {
      summary: 'Static compliance isolates elastic properties when flow is zero at end-inspiration.',
      formula: 'Cstat (mL/cm H₂O) = Vt (mL) / (Pplat − PEEP)',
      validation: 'Standard ventilator mechanics; dynamic compliance uses PIP and is lower when Raw high.',
      references: [
        {
          title: 'Respiratory system mechanics in ventilated patients',
          citation: 'ICU mechanical ventilation textbooks / reviews',
          year: 2012,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK448186/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Falling Cstat',
        actions: [
          'CXR / ultrasound for edema, pneumothorax, mainstem tube',
          'Check abdominal pressure',
          'Reassess fluid balance and ARDS therapies',
        ],
      },
    ],
    pearls: ['Use exhaled Vt corrected for circuit compliance if your ventilator provides it.', 'Chest wall stiffness lowers Crs without primary lung disease.'],
  },

  // 10. Airway resistance
  {
    id: 'resistance-airway',
    name: 'Airway Resistance (Raw)',
    shortName: 'Raw',
    description: 'Inspiratory airway resistance: Raw = (PIP − Pplat) / flow.',
    category: 'critical-care',
    tags: ['resistance', 'raw', 'asthma', 'copd', 'ventilation'],
    whenToUse: 'Passive volume-cycled breath with constant flow and plateau hold.',
    whyUse: 'Separates resistive load (ETT, bronchospasm, secretions) from elastic load (Pplat).',
    inputs: [
      numberInput('pip', 'Peak inspiratory pressure (PIP)', { unit: 'cm H₂O', min: 5, max: 80, step: 0.5, defaultValue: 30 }),
      numberInput('pplat', 'Plateau pressure', { unit: 'cm H₂O', min: 5, max: 60, step: 0.5, defaultValue: 20 }),
      numberInput('flow', 'Inspiratory flow', {
        unit: 'L/min',
        min: 10,
        max: 120,
        defaultValue: 60,
        helpText: 'Constant-flow breath; converted to L/s for Raw units',
      }),
    ],
    calculate(values) {
      const pip = num(values.pip, 30);
      const pplat = num(values.pplat, 20);
      const flowLpm = num(values.flow, 60);
      const flowLps = flowLpm / 60;
      const drop = pip - pplat;
      if (flowLps <= 0) {
        return {
          score: '—',
          label: 'Invalid flow',
          interpretation: 'Flow must be > 0.',
          riskLevel: 'info',
        };
      }
      if (drop < 0) {
        return {
          score: round(drop, 1),
          unit: 'cm H₂O·s/L',
          label: 'Check inputs',
          interpretation: 'PIP < Pplat is non-physiologic for passive constant-flow inflation — remeasure.',
          riskLevel: 'info',
        };
      }
      const raw = round(drop / flowLps, 1);
      const r = riskFromThresholds(raw, [
        {
          max: 10,
          level: 'normal',
          label: 'Normal–acceptable Raw',
          interpretation: `Raw ${raw} cm H₂O·s/L — typical intubated range often ~5–15 depending on ETT size/flow.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Mildly elevated Raw',
          interpretation: `Raw ${raw} — mildly elevated. Check tube kinking, secretions, light bronchospasm.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Elevated Raw',
          interpretation: `Raw ${raw} — significant resistive load (asthma/COPD, small ETT, obstruction).`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high Raw',
          interpretation: `Raw ${raw} — severe obstruction or occluded airway. Emergent troubleshooting.`,
        },
      ]);
      return {
        score: raw,
        unit: 'cm H₂O·s/L',
        ...r,
        details: [
          { label: 'PIP − Pplat', value: `${round(drop, 1)} cm H₂O` },
          { label: 'Flow', value: `${flowLpm} L/min (${round(flowLps, 2)} L/s)` },
          { label: 'Formula', value: 'Raw = (PIP − Pplat) / flow(L/s)' },
        ],
      };
    },
    evidence: {
      summary: 'Under constant inspiratory flow, the PIP–Pplat difference is the resistive pressure drop.',
      formula: 'Raw = (PIP − Pplat) / V̇ (L/s); if flow in L/min, divide flow by 60',
      validation: 'Standard equation of motion simplification for passive patients.',
      references: [
        {
          title: 'Equation of motion and bedside respiratory mechanics',
          citation: 'Critical care mechanical ventilation references',
          year: 2010,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK448186/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High Raw',
        actions: [
          'Suction / check ETT position and biting',
          'Bronchodilators if obstructive disease',
          'Consider larger ETT only if indicated; avoid auto-PEEP with adequate expiratory time',
        ],
      },
    ],
    pearls: ['Invalid during pressure-control without known flow, or with active patient effort.', 'High flow rates increase measured Raw (turbulence).'],
  },

  // 11. Respiratory time constant
  {
    id: 'time-constant',
    name: 'Respiratory Time Constant (τ)',
    shortName: 'τ',
    description: 'Expiratory time constant estimate τ = Raw × Crs (seconds).',
    category: 'critical-care',
    tags: ['time constant', 'auto-peep', 'copd', 'asthma', 'ventilation'],
    whenToUse: 'When Raw and compliance are known or measured; planning expiratory time in obstruction.',
    whyUse: '~3 time constants empty ~95% of tidal volume; guides risk of air trapping.',
    inputs: [
      numberInput('raw', 'Airway resistance (Raw)', {
        unit: 'cm H₂O·s/L',
        min: 1,
        max: 80,
        step: 0.5,
        defaultValue: 15,
      }),
      numberInput('crs', 'Compliance (Crs)', {
        unit: 'mL/cm H₂O',
        min: 5,
        max: 150,
        step: 0.5,
        defaultValue: 40,
        helpText: 'Will be converted to L/cm H₂O for τ in seconds',
      }),
    ],
    calculate(values) {
      const raw = num(values.raw, 15);
      const crsMl = num(values.crs, 40);
      const crsL = crsMl / 1000;
      const tau = round(raw * crsL, 2);
      const t95 = round(3 * tau, 2);
      const r = riskFromThresholds(tau, [
        {
          max: 0.5,
          level: 'low',
          label: 'Short τ',
          interpretation: `τ ${tau} s — short time constant (stiff/low resistance). Empties quickly; 3τ ≈ ${t95} s.`,
        },
        {
          max: 0.9,
          level: 'normal',
          label: 'Typical τ',
          interpretation: `τ ${tau} s — roughly typical. Allow ≥3τ (${t95} s) expiratory time to limit trapping.`,
        },
        {
          max: 1.5,
          level: 'moderate',
          label: 'Prolonged τ',
          interpretation: `τ ${tau} s — prolonged (obstruction and/or high compliance). 3τ ≈ ${t95} s expiratory need.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Very prolonged τ',
          interpretation: `τ ${tau} s — high air-trapping risk. Lower RR, maximize Te, treat obstruction; 3τ ≈ ${t95} s.`,
        },
      ]);
      return {
        score: tau,
        unit: 's',
        ...r,
        details: [
          { label: '3 × τ (~95% empty)', value: `${t95} s` },
          { label: 'Raw', value: `${raw} cm H₂O·s/L` },
          { label: 'Crs', value: `${crsMl} mL/cm H₂O` },
          { label: 'Formula', value: 'τ = Raw × Crs (with Crs in L/cm H₂O)' },
        ],
      };
    },
    evidence: {
      summary: 'Single-compartment model: volume decays exponentially with time constant Raw×C.',
      formula: 'τ (s) = Raw (cm H₂O·s/L) × Crs (L/cm H₂O)',
      validation: 'Teaching model for auto-PEEP risk; real lungs are multi-compartmental.',
      references: [
        {
          title: 'Expiratory time constants and dynamic hyperinflation',
          citation: 'Mechanical ventilation physiology reviews',
          year: 2005,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK448186/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Long τ + auto-PEEP',
        actions: [
          'Reduce respiratory rate / I:E toward longer expiration',
          'Bronchodilation and secretion clearance',
          'Permissive hypercapnia if needed for safety',
        ],
      },
    ],
    pearls: ['Enter Crs in mL/cm H₂O as on most vents; calculator converts to liters.', '1τ≈63% empty, 2τ≈86%, 3τ≈95%.'],
  },

  // 12. Original NEWS (not NEWS2)
  {
    id: 'news-original',
    name: 'NEWS (Original National Early Warning Score)',
    shortName: 'NEWS',
    description: 'Original RCP National Early Warning Score (2012) before NEWS2 SpO₂ scale refinements.',
    category: 'critical-care',
    tags: ['news', 'early warning', 'deterioration', 'track and trigger'],
    whenToUse: 'Adult ward monitoring where original NEWS (not NEWS2) is the local standard.',
    whyUse: 'Standardized aggregate score for acute illness severity and escalation.',
    inputs: [
      selectInput('rr', 'Respiratory rate', [
        { label: '≤8 (3)', value: 3 },
        { label: '9–11 (1)', value: 1 },
        { label: '12–20 (0)', value: 0 },
        { label: '21–24 (2)', value: 2 },
        { label: '≥25 (3)', value: 3 },
      ]),
      selectInput('spo2', 'SpO₂ (%)', [
        { label: '≤91 (3)', value: 3 },
        { label: '92–93 (2)', value: 2 },
        { label: '94–95 (1)', value: 1 },
        { label: '≥96 (0)', value: 0 },
      ]),
      yesNo('o2', 'Any supplemental oxygen', 2),
      selectInput('temp', 'Temperature °C', [
        { label: '≤35.0 (3)', value: 3 },
        { label: '35.1–36.0 (1)', value: 1 },
        { label: '36.1–38.0 (0)', value: 0 },
        { label: '38.1–39.0 (1)', value: 1 },
        { label: '≥39.1 (2)', value: 2 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '≤90 (3)', value: 3 },
        { label: '91–100 (2)', value: 2 },
        { label: '101–110 (1)', value: 1 },
        { label: '111–219 (0)', value: 0 },
        { label: '≥220 (3)', value: 3 },
      ]),
      selectInput('hr', 'Heart rate', [
        { label: '≤40 (3)', value: 3 },
        { label: '41–50 (1)', value: 1 },
        { label: '51–90 (0)', value: 0 },
        { label: '91–110 (1)', value: 1 },
        { label: '111–130 (2)', value: 2 },
        { label: '≥131 (3)', value: 3 },
      ]),
      selectInput('conscious', 'Consciousness (AVPU)', [
        { label: 'Alert (0)', value: 0 },
        { label: 'V, P, or U (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const components = [
        num(values.rr),
        num(values.spo2),
        bool(values.o2) ? 2 : 0,
        num(values.temp),
        num(values.sbp),
        num(values.hr),
        num(values.conscious),
      ];
      const score = components.reduce((a, b) => a + b, 0);
      const singleThree = components.some((c) => c >= 3);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low (0–4)',
          interpretation: `NEWS ${score}: low aggregate clinical risk. ${singleThree ? 'Note: a single parameter scoring 3 still warrants urgent review per many protocols.' : 'Continue routine monitoring per policy.'}`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Medium (5–6)',
          interpretation: `NEWS ${score}: medium risk — urgent ward-based response; increase observation frequency.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High (≥7)',
          interpretation: `NEWS ${score}: high risk — emergency assessment / critical care outreach.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Single parameter ≥3', value: singleThree ? 'Yes' : 'No' },
          { label: 'Scale', value: 'Original NEWS (RCP 2012), not NEWS2' },
        ],
      };
    },
    evidence: {
      summary: 'Original NEWS aggregates RR, SpO₂, oxygen use, temperature, SBP, HR, and AVPU.',
      formula: 'Sum of weighted physiologic parameters (max typically 20)',
      validation: 'Widely validated for deterioration; NEWS2 (2017) added SpO₂ scale 2 for hypercapnic failure and new confusion.',
      references: [
        {
          title: 'National Early Warning Score (NEWS)',
          citation: 'Royal College of Physicians. 2012',
          year: 2012,
          url: 'https://www.rcp.ac.uk/',
        },
      ],
    },
    nextSteps: [
      { condition: 'NEWS ≥7', actions: ['Emergency clinical response', 'Consider ICU/HDU review', 'Treat reversible causes'] },
      { condition: 'NEWS 5–6 or single 3', actions: ['Urgent medical review', 'Hourly observations minimum per local policy'] },
    ],
    pearls: [
      'This is original NEWS — not NEWS2 (no COPD SpO₂ scale 2, no explicit “new confusion” as separate from AVPU).',
      'Scores support—not replace—clinical judgment.',
    ],
  },

  // 13. Vasoactive-Inotropic Score
  {
    id: 'vis-score',
    name: 'Vasoactive-Inotropic Score (VIS)',
    shortName: 'VIS',
    description: 'Weighted sum of vasoactive/inotropic infusions used in cardiac ICU and shock research.',
    category: 'critical-care',
    tags: ['vis', 'vasoactive', 'inotrope', 'shock', 'cardiac icu'],
    whenToUse: 'Quantifying pharmacologic cardiovascular support (pediatric cardiac ICU classic; also adult research).',
    whyUse: 'Single number comparing support intensity across dopamine, epi, norepi, milrinone, vasopressin, etc.',
    inputs: [
      numberInput('dopamine', 'Dopamine', { unit: 'µg/kg/min', min: 0, max: 30, step: 0.1, defaultValue: 0 }),
      numberInput('dobutamine', 'Dobutamine', { unit: 'µg/kg/min', min: 0, max: 30, step: 0.1, defaultValue: 0 }),
      numberInput('epinephrine', 'Epinephrine', { unit: 'µg/kg/min', min: 0, max: 2, step: 0.01, defaultValue: 0 }),
      numberInput('norepinephrine', 'Norepinephrine', { unit: 'µg/kg/min', min: 0, max: 2, step: 0.01, defaultValue: 0 }),
      numberInput('milrinone', 'Milrinone', { unit: 'µg/kg/min', min: 0, max: 1, step: 0.05, defaultValue: 0 }),
      numberInput('vasopressin', 'Vasopressin', {
        unit: 'U/kg/min',
        min: 0,
        max: 0.1,
        step: 0.0001,
        defaultValue: 0,
        helpText: 'Note units U/kg/min (not units/min). Example: 0.0003',
      }),
      numberInput('phenylephrine', 'Phenylephrine', { unit: 'µg/kg/min', min: 0, max: 10, step: 0.1, defaultValue: 0 }),
    ],
    calculate(values) {
      const dopa = num(values.dopamine);
      const dobut = num(values.dobutamine);
      const epi = num(values.epinephrine);
      const norepi = num(values.norepinephrine);
      const mil = num(values.milrinone);
      const vaso = num(values.vasopressin);
      const phen = num(values.phenylephrine);
      const vis = round(
        dopa + dobut + 100 * epi + 100 * norepi + 10 * mil + 10000 * vaso + 10 * phen,
        1
      );
      const r = riskFromThresholds(vis, [
        {
          max: 0,
          level: 'normal',
          label: 'No vasoactive support',
          interpretation: 'VIS 0 — no scored vasoactive/inotropic infusions entered.',
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Low–moderate support',
          interpretation: `VIS ${vis} — low to moderate pharmacologic support intensity.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High support',
          interpretation: `VIS ${vis} — high support; associated with higher morbidity in cardiac surgical cohorts.`,
        },
        {
          max: 500,
          level: 'critical',
          label: 'Very high support',
          interpretation: `VIS ${vis} — very high vasoactive burden. Reassess shock physiology, source control, mechanical support candidacy.`,
        },
      ]);
      return {
        score: vis,
        unit: 'VIS',
        ...r,
        details: [
          {
            label: 'Formula',
            value:
              'dopamine + dobutamine + 100×epi + 100×norepi + 10×milrinone + 10000×vasopressin + 10×phenylephrine',
          },
        ],
      };
    },
    evidence: {
      summary: 'VIS expands the older inotrope score with milrinone, vasopressin, and phenylephrine weightings.',
      formula:
        'VIS = dopamine(µg/kg/min) + dobutamine + 100×epi + 100×norepi + 10×milrinone + 10,000×vasopressin(U/kg/min) + 10×phenylephrine',
      validation: 'Common in pediatric cardiac ICU outcomes research; adult cutoffs less standardized.',
      references: [
        {
          title: 'Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after cardiopulmonary bypass',
          citation: 'Gaies MG et al. Pediatr Crit Care Med. 2010',
          year: 2010,
          pmid: '19794327',
          doi: '10.1097/PCC.0b013e3181b806fc',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Rising VIS',
        actions: [
          'Reassess volume status and cardiac function',
          'Treat reversible causes of shock',
          'Escalate monitoring / mechanical support pathways as indicated',
        ],
      },
    ],
    pearls: [
      'Vasopressin units are U/kg/min — a common source of 1000× errors.',
      'Not all centers weight agents identically; report drug doses alongside VIS.',
    ],
  },

  // 14. Lactate clearance
  {
    id: 'lactate-clearance',
    name: 'Lactate Clearance (%)',
    shortName: 'Lac Clearance',
    description: 'Percent change in lactate between two time points: (initial − delayed) / initial × 100.',
    category: 'critical-care',
    tags: ['lactate', 'sepsis', 'shock', 'clearance', 'resuscitation'],
    whenToUse: 'Serial lactate monitoring during sepsis or shock resuscitation.',
    whyUse: 'Improving lactate is associated with better outcomes; used as a resuscitation trend marker.',
    inputs: [
      numberInput('initial', 'Initial lactate', { unit: 'mmol/L', min: 0.1, max: 30, step: 0.1, defaultValue: 4.0 }),
      numberInput('delayed', 'Repeat lactate', { unit: 'mmol/L', min: 0.1, max: 30, step: 0.1, defaultValue: 3.0 }),
      numberInput('hours', 'Interval (optional)', { unit: 'hours', min: 0.5, max: 24, step: 0.5, defaultValue: 2, required: false }),
    ],
    calculate(values) {
      const initial = num(values.initial, 4);
      const delayed = num(values.delayed, 3);
      const hoursProvided = !isMissingValue(values.hours, true);
      const hours = num(values.hours, 0);
      if (initial <= 0) {
        return {
          score: '—',
          label: 'Invalid initial lactate',
          interpretation: 'Initial lactate must be > 0.',
          riskLevel: 'info',
        };
      }
      const clearance = round(((initial - delayed) / initial) * 100, 1);
      const absolute = round(initial - delayed, 2);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'moderate';
      let label = '';
      let interpretation = '';
      if (clearance >= 20) {
        riskLevel = 'low';
        label = 'Good clearance (≥20%)';
        interpretation = `Lactate clearance ${clearance}%${hoursProvided ? ` over ~${hours} h` : ' (measurement interval not entered)'} (Δ ${absolute} mmol/L). Favorable trend if clinical perfusion also improving.`;
      } else if (clearance >= 10) {
        riskLevel = 'moderate';
        label = 'Partial clearance (10–19%)';
        interpretation = `Lactate clearance ${clearance}% — partial improvement. Continue resuscitation and reassess source control.`;
      } else if (clearance >= 0) {
        riskLevel = 'high';
        label = 'Minimal clearance (<10%)';
        interpretation = `Lactate clearance only ${clearance}%. Inadequate trend — escalate shock evaluation.`;
      } else {
        riskLevel = 'critical';
        label = 'Rising lactate (negative clearance)';
        interpretation = `Lactate increased (clearance ${clearance}%). Worsening shock/hypoperfusion or clearance failure — urgent reassessment.`;
      }
      return {
        score: clearance,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Initial → repeat', value: `${initial} → ${delayed} mmol/L` },
          { label: 'Absolute change', value: `${absolute} mmol/L` },
          { label: 'Interval', value: hoursProvided ? `${hours} h` : 'Not entered' },
        ],
      };
    },
    evidence: {
      summary: 'Lactate clearance percentage is a pragmatic marker of resuscitation response in sepsis literature.',
      formula: 'Clearance % = (Lactate_initial − Lactate_delayed) / Lactate_initial × 100',
      validation: 'Associated with survival in observational and some interventional sepsis studies; not a sole endpoint.',
      references: [
        {
          title: 'Lactate clearance vs central venous oxygen saturation as goals of early sepsis therapy',
          citation: 'Jones AE et al. JAMA. 2010',
          year: 2010,
          pmid: '20179283',
          doi: '10.1001/jama.2010.158',
        },
        {
          title: 'Surviving Sepsis Campaign guidance on lactate',
          citation: 'Evans L et al. Crit Care Med. 2021 (SSC)',
          year: 2021,
          pmid: '34605781',
          doi: '10.1097/CCM.0000000000005337',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Clearance <10% or rising',
        actions: [
          'Reassess volume, cardiac output, source control',
          'Antibiotics / drainage if infection',
          'Consider occult hypoperfusion or liver failure limiting clearance',
        ],
      },
    ],
    pearls: [
      'Epinephrine and β-agonists can raise lactate without pure ischemia.',
      'Normalize units (mmol/L vs mg/dL) before calculating.',
    ],
  },

  // 15. Base deficit classification
  {
    id: 'base-deficit-class',
    name: 'Base Deficit Severity Class',
    shortName: 'Base Deficit',
    description: 'Classifies arterial base deficit/excess severity used in trauma and shock resuscitation.',
    category: 'critical-care',
    tags: ['base deficit', 'abg', 'trauma', 'shock', 'acid-base'],
    whenToUse: 'Trauma, hemorrhage, or shock when ABG/VBG base excess is available.',
    whyUse: 'Base deficit correlates with oxygen debt, transfusion need, and mortality in trauma cohorts.',
    inputs: [
      numberInput('bd', 'Base deficit (enter deficit as positive; surplus negative)', {
        unit: 'mEq/L',
        min: -15,
        max: 40,
        step: 0.1,
        defaultValue: 6,
        helpText: 'If ABG shows BE −6, enter base deficit = 6. If BE +2, enter −2.',
      }),
    ],
    calculate(values) {
      const bd = num(values.bd, 6);
      // Classify by base deficit magnitude (positive = deficit)
      let label = '';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = '';
      if (bd < 2) {
        label = 'Normal / alkalotic range';
        riskLevel = 'normal';
        interpretation =
          bd < 0
            ? `Base excess ${-bd} (deficit ${bd}): metabolic alkalosis or compensated range — not a tissue-hypoxia deficit pattern.`
            : `Base deficit ${bd}: within normal base deficit band (roughly −2 to +2 BE).`;
      } else if (bd <= 5) {
        label = 'Mild deficit (Class I-ish)';
        riskLevel = 'low';
        interpretation = `Base deficit ${bd} mEq/L — mild. Early hypoperfusion or mild metabolic acidosis possible.`;
      } else if (bd <= 9) {
        label = 'Moderate deficit (Class II-ish)';
        riskLevel = 'moderate';
        interpretation = `Base deficit ${bd} mEq/L — moderate. Associated with significant shock/trauma load; active resuscitation.`;
      } else if (bd <= 14) {
        label = 'Severe deficit (Class III-ish)';
        riskLevel = 'high';
        interpretation = `Base deficit ${bd} mEq/L — severe metabolic debt. High risk of transfusion need and organ dysfunction.`;
      } else {
        label = 'Critical deficit (Class IV-ish)';
        riskLevel = 'critical';
        interpretation = `Base deficit ${bd} mEq/L — critical. Profound shock/acidemia risk; aggressive hemorrhage control and resuscitation.`;
      }
      return {
        score: bd,
        unit: 'mEq/L deficit',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Equivalent BE', value: `${round(-bd, 1)} mEq/L` },
          { label: 'Bands used', value: '<2 normal; 2–5 mild; 6–9 moderate; 10–14 severe; ≥15 critical' },
        ],
      };
    },
    evidence: {
      summary: 'Base deficit is a validated marker of hypoperfusion severity in trauma and critical illness.',
      formula: 'Classify BD (mEq/L): normal <2; mild 2–5; moderate 6–9; severe 10–14; critical ≥15 (educational bands)',
      validation: 'Multiple trauma databases link admission BD to mortality and resource use; cutoffs vary slightly by study.',
      references: [
        {
          title: 'Base deficit as a guide to volume resuscitation',
          citation: 'Davis JW et al. J Trauma. 1988 / subsequent trauma literature',
          year: 1988,
          pmid: '3172306',
          doi: '10.1097/00005373-198810000-00010',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–critical BD',
        actions: [
          'Control hemorrhage / treat shock source',
          'Serial gases and lactate',
          'Avoid over-focusing on buffer therapy alone without perfusion restoration',
        ],
      },
    ],
    pearls: [
      'Hyperchloremic saline resuscitation can worsen base deficit without hypoperfusion.',
      'Chronic CO₂ retainers and diuretics alter BE independent of acute shock.',
    ],
  },

  // 16. SALT mass casualty triage
  {
    id: 'salt-triage',
    name: 'SALT Mass Casualty Triage',
    shortName: 'SALT',
    description: 'Educational SALT (Sort, Assess, Lifesaving interventions, Treatment/Transport) category helper.',
    category: 'emergency',
    tags: ['salt', 'triage', 'mci', 'disaster', 'mass casualty'],
    whenToUse: 'Mass casualty incidents using SALT framework (US NHTSA/CDC-endorsed model).',
    whyUse: 'Provides common language: Immediate, Delayed, Minimal, Expectant, Dead.',
    inputs: [
      selectInput('walk', 'Can the casualty walk to a designated area?', [
        { label: 'Yes → Minimal (Green) group for secondary sort', value: 'walk' },
        { label: 'No — individual assessment', value: 'no' },
      ]),
      selectInput('breathing', 'Breathing after airway opening / LSI?', [
        { label: 'Not applicable (walker)', value: 'na' },
        { label: 'Yes', value: 'yes' },
        { label: 'No — still apneic', value: 'no' },
      ]),
      yesNo('lsiDone', 'Lifesaving interventions indicated/performed as able (bleed control, airway, chest seal/needle, auto-injector)', 1),
      selectInput('obeys', 'Obeys commands or makes purposeful movements?', [
        { label: 'Yes / N/A walker', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('pulse', 'Peripheral pulse present?', [
        { label: 'Yes / N/A walker', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('distress', 'Respiratory distress or uncontrolled major hemorrhage?', [
        { label: 'No / N/A walker', value: 'no' },
        { label: 'Yes', value: 'yes' },
      ]),
      selectInput('likelySurvive', 'Likely to survive given current resources? (for expectant decision)', [
        { label: 'Yes / unknown / N/A', value: 'yes' },
        { label: 'No — expectant with current resources', value: 'no' },
      ]),
    ],
    calculate(values) {
      const walk = String(values.walk ?? 'walk');
      const breathing = String(values.breathing ?? 'na');
      const obeys = String(values.obeys ?? 'yes');
      const pulse = String(values.pulse ?? 'yes');
      const distress = String(values.distress ?? 'no');
      const likelySurvive = String(values.likelySurvive ?? 'yes');
      const lsiDone = bool(values.lsiDone);

      const details = [
        { label: 'Can walk', value: walk === 'walk' ? 'Yes' : 'No' },
        { label: 'Breathing after airway/LSI', value: breathing === 'na' ? 'N/A' : breathing === 'yes' ? 'Yes' : 'No — apneic' },
        { label: 'Lifesaving interventions', value: lsiDone ? 'Indicated/performed' : 'Not done / N/A' },
        { label: 'Obeys commands / purposeful movement', value: obeys === 'yes' ? 'Yes / N/A' : 'No' },
        { label: 'Peripheral pulse', value: pulse === 'yes' ? 'Yes / N/A' : 'No' },
        { label: 'Respiratory distress / uncontrolled hemorrhage', value: distress === 'yes' ? 'Yes' : 'No / N/A' },
        { label: 'Likely to survive given resources', value: likelySurvive === 'no' ? 'No — expectant consideration' : 'Yes / unknown / N/A' },
      ];

      // Global sort: walkers → Minimal (still re-triage)
      if (walk === 'walk') {
        return {
          score: 'Minimal',
          label: 'Minimal (Green)',
          interpretation:
            'Able to walk — SALT Minimal category for delayed individual assessment. Still re-triage if deteriorates.',
          riskLevel: 'low' as const,
          details,
        };
      }
      // Individual assessment: apneic after LSI → Dead
      if (breathing === 'no') {
        return {
          score: 'Dead',
          label: 'Dead (Black)',
          interpretation:
            'Apneic after airway opening (and age-appropriate rescue breaths in pediatric protocols if used). SALT Dead category — do not move to immediate care when resources constrained.',
          riskLevel: 'critical' as const,
          details,
        };
      }
      // Immediate physiology: does not obey OR no pulse OR distress/uncontrolled hemorrhage
      const fails = obeys === 'no' || pulse === 'no' || distress === 'yes';
      if (!fails) {
        return {
          score: 'Delayed',
          label: 'Delayed (Yellow)',
          interpretation:
            'Breathing with pulse, follows commands, no respiratory distress or uncontrolled major bleed — SALT Delayed. Serious injuries possible but can wait relative to Immediate.',
          riskLevel: 'moderate' as const,
          details,
        };
      }
      // Resource-based expectant among those meeting Immediate criteria
      if (likelySurvive === 'no') {
        return {
          score: 'Expectant',
          label: 'Expectant (Gray)',
          interpretation:
            'Meets Immediate physiologic criteria but unlikely to survive given available resources — SALT Expectant. Provide comfort care; re-triage if resources improve.',
          riskLevel: 'high' as const,
          details,
        };
      }
      return {
        score: 'Immediate',
        label: 'Immediate (Red)',
        interpretation:
          'Does not follow commands and/or no peripheral pulse and/or respiratory distress/uncontrolled hemorrhage — SALT Immediate. Prioritize lifesaving interventions and transport.',
        riskLevel: 'critical' as const,
        details,
        recommendations: ['Control major hemorrhage', 'Open airway', 'Decompress tension pneumothorax if trained', 'Auto-injector if indicated'],
      };
    },
    evidence: {
      summary: 'SALT is a CDC/NHTSA-supported mass casualty triage system emphasizing global sorting then individual assessment.',
      formula: 'Walk → Minimal; apnea after LSI → Dead; else assess commands/pulse/distress → Immediate vs Delayed; resource-based Expectant',
      validation: 'Consensus model for US MCI triage interoperability; local EMS protocols may modify.',
      references: [
        {
          title: 'SALT mass casualty triage',
          citation: 'Lerner EB et al. Disaster Med Public Health Prep. 2008',
          year: 2008,
          pmid: '18769263',
          doi: '10.1097/DMP.0b013e318182194e',
        },
      ],
    },
    nextSteps: [
      { condition: 'Immediate', actions: ['Lifesaving interventions', 'Priority transport', 'Continuous re-triage'] },
      { condition: 'Expectant', actions: ['Comfort care', 'Reassess if surge capacity increases'] },
      { condition: 'Minimal/Delayed', actions: ['Secondary survey', 'Watch for decompensation'] },
    ],
    pearls: [
      'Educational tool — follow local MCI protocol and medical direction.',
      'Expectant is resource-relative, not a fixed injury list.',
    ],
  },

  // 17. JumpSTART pediatric triage
  {
    id: 'jumpstart-triage',
    name: 'JumpSTART Pediatric MCI Triage',
    shortName: 'JumpSTART',
    description: 'Educational JumpSTART algorithm for pediatric mass casualty triage (typically ≤8 years or Brose low-point).',
    category: 'pediatrics',
    tags: ['jumpstart', 'triage', 'mci', 'pediatric', 'disaster'],
    whenToUse: 'Pediatric casualties in MCI when JumpSTART is the operational system.',
    whyUse: 'Modifies START for pediatric respiratory physiology (RR limits, airway + ventilation step).',
    inputs: [
      selectInput('ambulate', 'Able to walk?', [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('breatheSpont', 'Spontaneous breathing?', [
        { label: 'Yes / N/A walker', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('afterPosition', 'If apneic: breathing after airway position?', [
        { label: 'N/A (was breathing or walker)', value: 'na' },
        { label: 'Yes → Immediate', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('pulseIfApnea', 'If still apneic: palpable pulse?', [
        { label: 'N/A', value: 'na' },
        { label: 'No → Deceased', value: 'no' },
        { label: 'Yes — give 5 rescue breaths then reassess breathing', value: 'yes' },
      ]),
      selectInput('afterBreaths', 'After 5 rescue breaths: breathing?', [
        { label: 'N/A', value: 'na' },
        { label: 'Yes → Immediate', value: 'yes' },
        { label: 'No → Deceased', value: 'no' },
      ]),
      selectInput('rr', 'Respiratory rate (if breathing)', [
        { label: 'N/A walker', value: 'na' },
        { label: '15–45 /min', value: 'ok' },
        { label: '<15 or >45 /min', value: 'bad' },
      ]),
      selectInput('perfusion', 'Palpable peripheral pulse? (breathing child)', [
        { label: 'N/A walker', value: 'na' },
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      selectInput('mental', 'AVPU mental status', [
        { label: 'N/A walker', value: 'na' },
        { label: 'A or V (Alert / Voice)', value: 'av' },
        { label: 'P or U (Pain / Unresponsive)', value: 'pu' },
      ]),
    ],
    calculate(values) {
      const ambulate = String(values.ambulate ?? 'no');
      const breatheSpont = String(values.breatheSpont ?? 'yes');
      const afterPosition = String(values.afterPosition ?? 'na');
      const pulseIfApnea = String(values.pulseIfApnea ?? 'na');
      const afterBreaths = String(values.afterBreaths ?? 'na');
      const rr = String(values.rr ?? 'na');
      const perfusion = String(values.perfusion ?? 'na');
      const mental = String(values.mental ?? 'na');
      const branchDetails = [
        { label: 'Ambulatory', value: ambulate === 'yes' ? 'Yes' : 'No' },
        { label: 'Spontaneous breathing', value: breatheSpont === 'yes' ? 'Yes' : breatheSpont === 'no' ? 'No' : String(breatheSpont) },
        { label: 'Airway position result', value: afterPosition },
        { label: 'Pulse if apneic', value: pulseIfApnea },
        { label: 'After 5 rescue breaths', value: afterBreaths },
        {
          label: 'Respiratory rate',
          value: rr === 'ok' ? '15–45 /min' : rr === 'bad' ? '<15 or >45 /min' : rr === 'na' ? 'N/A' : rr,
        },
        {
          label: 'Peripheral pulse (perfusion)',
          value: perfusion === 'yes' ? 'Yes' : perfusion === 'no' ? 'No' : perfusion === 'na' ? 'N/A' : perfusion,
        },
        {
          label: 'Mental status (AVPU)',
          value: mental === 'av' ? 'A/V' : mental === 'pu' ? 'P/U' : mental === 'na' ? 'N/A' : mental,
        },
      ];

      if (ambulate === 'yes') {
        return {
          score: 'Minor',
          label: 'Minor (Green)',
          interpretation: 'Ambulatory pediatric casualty — JumpSTART Minor. Secondary triage still required.',
          riskLevel: 'low',
          details: branchDetails,
        };
      }
      if (breatheSpont === 'no') {
        if (afterPosition === 'yes') {
          return {
            score: 'Immediate',
            label: 'Immediate (Red)',
            interpretation: 'Breathing only after airway positioning — JumpSTART Immediate.',
            riskLevel: 'critical',
            details: branchDetails,
          };
        }
        if (pulseIfApnea === 'no') {
          return {
            score: 'Deceased',
            label: 'Deceased (Black)',
            interpretation: 'Apneic without pulse — JumpSTART Deceased.',
            riskLevel: 'critical',
            details: branchDetails,
          };
        }
        if (afterBreaths === 'yes') {
          return {
            score: 'Immediate',
            label: 'Immediate (Red)',
            interpretation: 'Breathing restored after 5 rescue breaths — JumpSTART Immediate.',
            riskLevel: 'critical',
            details: branchDetails,
          };
        }
        if (afterBreaths === 'no') {
          return {
            score: 'Deceased',
            label: 'Deceased (Black)',
            interpretation: 'Still apneic after rescue breaths — JumpSTART Deceased.',
            riskLevel: 'critical',
            details: branchDetails,
          };
        }
        return {
          score: '—',
          label: 'Complete apnea branch',
          interpretation: 'Apneic non-walker: enter airway position, pulse, and rescue-breath outcomes.',
          riskLevel: 'info',
          details: branchDetails,
        };
      }
      if (rr === 'bad') {
        return {
          score: 'Immediate',
          label: 'Immediate (Red)',
          interpretation: 'RR <15 or >45 — JumpSTART Immediate.',
          riskLevel: 'critical',
          details: branchDetails,
        };
      }
      if (perfusion === 'no') {
        return {
          score: 'Immediate',
          label: 'Immediate (Red)',
          interpretation: 'No peripheral pulse — JumpSTART Immediate.',
          riskLevel: 'critical',
          details: branchDetails,
        };
      }
      if (mental === 'pu') {
        return {
          score: 'Immediate',
          label: 'Immediate (Red)',
          interpretation: 'Postures to pain or unresponsive (P/U) — JumpSTART Immediate.',
          riskLevel: 'critical',
          details: branchDetails,
        };
      }
      if (rr === 'ok' && perfusion === 'yes' && mental === 'av') {
        return {
          score: 'Delayed',
          label: 'Delayed (Yellow)',
          interpretation: 'Non-ambulatory but RR 15–45, pulse present, A/V mentation — JumpSTART Delayed.',
          riskLevel: 'moderate',
          details: branchDetails,
        };
      }
      return {
        score: '—',
        label: 'Incomplete inputs',
        interpretation: 'Select RR, pulse, and AVPU for breathing non-walkers to assign Delayed vs Immediate.',
        riskLevel: 'info',
        details: branchDetails,
      };
    },
    evidence: {
      summary: 'JumpSTART adapts START for children with pediatric RR cutoffs and a rescue-breath step.',
      formula: 'Walk→Green; apnea pathway with position ±5 breaths; RR 15–45, pulse, AVPU→Yellow vs Red',
      validation: 'Widely taught EMS pediatric MCI tool; local protocols may use SALT or other systems.',
      references: [
        {
          title: 'JumpSTART pediatric multiple casualty incident triage tool',
          citation: 'Romig LE. JEMS. 2002',
          year: 2002,
          pmid: '12141119',
        },
      ],
    },
    nextSteps: [
      { condition: 'Immediate', actions: ['Lifesaving care', 'Priority evacuation', 'Re-triage frequently'] },
      { condition: 'Delayed/Minor', actions: ['Secondary assessment', 'Monitor for decompensation'] },
    ],
    pearls: [
      'Age cutoff often ≤8 years; older children may use START.',
      'Educational aid — follow incident command medical protocols.',
    ],
  },

  // 18. Nu-DESC nursing delirium
  {
    id: 'nursing-delirium',
    name: 'Nursing Delirium Screening Scale (Nu-DESC)',
    shortName: 'Nu-DESC',
    description: 'Five-item nurse-rated delirium screen (0–2 each; total 0–10).',
    category: 'critical-care',
    tags: ['delirium', 'nu-desc', 'icu', 'nursing', 'screening'],
    whenToUse: 'Ward or ICU nursing screening for delirium each shift.',
    whyUse: 'Brief observational tool; score ≥2 suggests possible delirium needing further assessment.',
    inputs: [
      selectInput(
        'disorientation',
        'Disorientation',
        [
          { label: '0 — Absent', value: 0, description: 'Absent this shift' },
          { label: '1 — Mild', value: 1, description: 'Present, mild: verbal or behavioral lack of orientation to time or place, or misperceiving persons' },
          { label: '2 — Pronounced', value: 2, description: 'Pronounced: verbal or behavioral lack of orientation to time or place, or misperceiving persons' },
        ],
        0,
        'Score the current nursing shift. 0 = absent, 1 = present mild, 2 = pronounced. Disorientation = verbal/behavioral lack of orientation to time or place or misperceiving persons.',
      ),
      selectInput(
        'behavior',
        'Inappropriate behavior',
        [
          { label: '0 — Absent', value: 0, description: 'Absent this shift' },
          { label: '1 — Mild', value: 1, description: 'Present, mild: pulling tubes/dressings or getting out of bed when contraindicated' },
          { label: '2 — Pronounced', value: 2, description: 'Pronounced: pulling tubes/dressings or getting out of bed when contraindicated' },
        ],
        0,
        'Score the current nursing shift. 0 = absent, 1 = present mild, 2 = pronounced. Behavior = pulling tubes/dressings or getting out of bed when contraindicated.',
      ),
      selectInput(
        'communication',
        'Inappropriate communication',
        [
          { label: '0 — Absent', value: 0, description: 'Absent this shift' },
          { label: '1 — Mild', value: 1, description: 'Present, mild: incoherence, non-communicativeness, or nonsensical/unintelligible speech' },
          { label: '2 — Pronounced', value: 2, description: 'Pronounced: incoherence, non-communicativeness, or nonsensical/unintelligible speech' },
        ],
        0,
        'Score the current nursing shift. 0 = absent, 1 = present mild, 2 = pronounced. Communication = incoherence, non-communicativeness, nonsensical/unintelligible speech.',
      ),
      selectInput(
        'illusion',
        'Illusion / hallucination',
        [
          { label: '0 — Absent', value: 0, description: 'Absent this shift' },
          { label: '1 — Mild', value: 1, description: 'Present, mild: seeing or hearing things not there, or visual distortions' },
          { label: '2 — Pronounced', value: 2, description: 'Pronounced: seeing or hearing things not there, or visual distortions' },
        ],
        0,
        'Score the current nursing shift. 0 = absent, 1 = present mild, 2 = pronounced. Illusion = seeing or hearing things not there / visual distortions.',
      ),
      selectInput(
        'psychomotor',
        'Psychomotor retardation',
        [
          { label: '0 — Absent', value: 0, description: 'Absent this shift' },
          { label: '1 — Mild', value: 1, description: 'Present, mild: delayed responsiveness, few spontaneous actions/words, deferred reaction when prodded' },
          { label: '2 — Pronounced', value: 2, description: 'Pronounced: delayed responsiveness, few spontaneous actions/words, deferred reaction when prodded, or unarousable' },
        ],
        0,
        'Score the current nursing shift. 0 = absent, 1 = present mild, 2 = pronounced. Psychomotor retardation = delayed responsiveness, few spontaneous actions/words, deferred reaction when prodded or unarousable.',
      ),
    ],
    calculate(values) {
      const score =
        num(values.disorientation) +
        num(values.behavior) +
        num(values.communication) +
        num(values.illusion) +
        num(values.psychomotor);
      if (score >= 2) {
        return {
          score,
          label: 'Screen positive (≥2)',
          interpretation: `Nu-DESC ${score}/10 — positive screen for delirium. Confirm with CAM-ICU/ICDSC or psychiatric assessment; treat causes.`,
          riskLevel: 'high',
          details: [{ label: 'Cutoff', value: '≥2 suggests delirium' }],
        };
      }
      return {
        score,
        label: 'Screen negative (<2)',
        interpretation: `Nu-DESC ${score}/10 — below screening cutoff. Continue prevention bundle and serial screening.`,
        riskLevel: 'low',
        details: [{ label: 'Range', value: '0–10' }],
      };
    },
    evidence: {
      summary: 'Nu-DESC rates five features observed by nursing staff; validated as a rapid delirium screen.',
      formula: 'Sum of 5 items (0–2 each); positive if total ≥2',
      validation: 'Reasonable sensitivity/specificity in medical/surgical populations; ICU performance varies vs CAM-ICU.',
      references: [
        {
          title: 'Validation of the Nursing Delirium Screening Scale (Nu-DESC)',
          citation: 'Gaudreau JD et al. J Pain Symptom Manage. 2005',
          year: 2005,
          pmid: '15857740',
          doi: '10.1016/j.jpainsymman.2004.07.009',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Nu-DESC ≥2',
        actions: [
          'Formal delirium assessment (CAM-ICU / ICDSC)',
          'Review meds (benzos, anticholinergics)',
          'Orient, mobilize, fix hypoxia/infection/pain/withdrawal',
        ],
      },
    ],
    pearls: [
      'Score the current nursing shift (Gaudreau), not a single snapshot.',
      'Each item is 0 absent / 1 present mild / 2 pronounced.',
      'Hypoactive delirium may score mainly on retardation/disorientation.',
      'Screen is not a severity scale alone.',
    ],
  },

  // 19. Riker SAS
  {
    id: 'sas-sedation',
    name: 'Riker Sedation-Agitation Scale (SAS)',
    shortName: 'SAS',
    description: 'Seven-level sedation-agitation scale from unarousable (1) to dangerous agitation (7).',
    category: 'critical-care',
    tags: ['sas', 'sedation', 'agitation', 'riker', 'icu'],
    whenToUse: 'ICU sedation/agitation charting when SAS is the unit standard (alternative to RASS).',
    whyUse: 'Simple ordinal scale to titrate sedatives toward calm, arousable targets (often SAS 3–4).',
    inputs: [
      selectInput('sas', 'SAS level', [
        { label: '1 — Unarousable (minimal/no response to noxious stimuli)', value: 1 },
        { label: '2 — Very sedated (arouses to physical stimuli only)', value: 2 },
        { label: '3 — Sedated (difficult to arouse; follows simple commands)', value: 3 },
        { label: '4 — Calm and cooperative', value: 4 },
        { label: '5 — Agitated (anxious or mildly agitated)', value: 5 },
        { label: '6 — Very agitated (requires restraints / frequent airway protection)', value: 6 },
        { label: '7 — Dangerous agitation (pulling lines, thrashing, combative)', value: 7 },
      ]),
    ],
    calculate(values) {
      const sas = num(values.sas, 4);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'normal';
      let label = '';
      let interpretation = '';
      if (sas <= 2) {
        riskLevel = 'high';
        label = 'Oversedated';
        interpretation = `SAS ${sas}: deep sedation. Risk of prolonged ventilation, delirium, immobility — lighten if no indication for deep sedation.`;
      } else if (sas === 3) {
        riskLevel = 'low';
        label = 'Sedated (often acceptable)';
        interpretation = `SAS 3: sedated but arousable to commands — common target range with SAS 4 depending on goals.`;
      } else if (sas === 4) {
        riskLevel = 'normal';
        label = 'Calm and cooperative (target)';
        interpretation = 'SAS 4: calm, cooperative — typical default target for most ICU patients.';
      } else if (sas === 5) {
        riskLevel = 'moderate';
        label = 'Agitated';
        interpretation = 'SAS 5: mild agitation/anxiety — nonpharmacologic measures, analgesia first, then careful anxiolysis.';
      } else if (sas === 6) {
        riskLevel = 'high';
        label = 'Very agitated';
        interpretation = 'SAS 6: very agitated — safety risk; treat pain/delirium/withdrawal; may need acute sedation.';
      } else {
        riskLevel = 'critical';
        label = 'Dangerous agitation';
        interpretation = 'SAS 7: dangerous agitation — immediate safety interventions and rapid pharmacologic control.';
      }
      return {
        score: sas,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Usual target', value: 'SAS 3–4 for most patients' }],
      };
    },
    evidence: {
      summary: 'Riker SAS is a validated ICU sedation-agitation scale used for titration and research outcomes.',
      formula: 'Ordinal score 1 (unarousable) to 7 (dangerous agitation)',
      validation: 'Reliable inter-rater performance; RASS is more common in many modern ICUs but SAS remains valid.',
      references: [
        {
          title: 'Prospective evaluation of the Sedation-Agitation Scale',
          citation: 'Riker RR et al. Crit Care Med. 1999',
          year: 1999,
          pmid: '10470756',
          doi: '10.1097/00003246-199908000-00016',
        },
      ],
    },
    nextSteps: [
      { condition: 'SAS 1–2', actions: ['Hold/wean sedatives if safe', 'Assess for coma vs oversedation', 'SAT/SBT when eligible'] },
      { condition: 'SAS 5–7', actions: ['Rule out pain, hypoxia, full bladder, delirium', 'Reorientation and safety', 'Targeted meds per PADIS'] },
    ],
    pearls: ['Document indication for deep sedation (e.g., ARDS paralysis, status epilepticus).', 'Pair with delirium screening when SAS ≥3.'],
  },

  // 20. ICDSC delirium checklist
  {
    id: 'delirium-icdsc',
    name: 'Intensive Care Delirium Screening Checklist (ICDSC)',
    shortName: 'ICDSC',
    description: 'Eight-item ICU delirium checklist; score 0–8 with ≥4 suggesting delirium.',
    category: 'critical-care',
    tags: ['delirium', 'icdsc', 'icu', 'cam', 'screening'],
    whenToUse: 'ICU patients when ICDSC is the preferred delirium tool (alternative to CAM-ICU).',
    whyUse: 'Captures fluctuating symptoms over the nursing shift; continuous score allows trend tracking.',
    inputs: [
      yesNo('ams', 'Altered level of consciousness (not alert/calm; or RASS/SAS not 0/4)', 1),
      yesNo('inattention', 'Inattention', 1),
      yesNo('disorientation', 'Disorientation', 1),
      yesNo('hallucination', 'Hallucination / delusion / psychosis', 1),
      yesNo('psychomotor', 'Psychomotor agitation or retardation', 1),
      yesNo('speech', 'Inappropriate speech or mood', 1),
      yesNo('sleep', 'Sleep–wake cycle disturbance', 1),
      yesNo('fluctuation', 'Symptom fluctuation', 1),
    ],
    calculate(values) {
      const keys = ['ams', 'inattention', 'disorientation', 'hallucination', 'psychomotor', 'speech', 'sleep', 'fluctuation'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No features (0)',
          interpretation: 'ICDSC 0 — no checklist features this assessment window.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Subsyndromal range (1–3)',
          interpretation: `ICDSC ${score}: below delirium cutoff but not feature-free. Optimize prevention; rescreen often.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'Delirium suggested (≥4)',
          interpretation: `ICDSC ${score}/8 — meets screening threshold for delirium. Evaluate causes and start multicomponent treatment.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Range', value: '0–8' },
          { label: 'Positive cutoff', value: '≥4' },
        ],
      };
    },
    evidence: {
      summary: 'ICDSC scores eight delirium domains over a shift; ≥4 correlates with psychiatric diagnosis of delirium.',
      formula: '1 point each for 8 items; delirium screen positive if ≥4',
      validation: 'Validated in mixed ICUs; complementary to CAM-ICU (binary algorithm).',
      references: [
        {
          title: 'Intensive Care Delirium Screening Checklist: evaluation of a new screening tool',
          citation: 'Bergeron N et al. Intensive Care Med. 2001',
          year: 2001,
          pmid: '11430542',
          doi: '10.1007/s001340100909',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'ICDSC ≥4',
        actions: [
          'Identify reversible causes (infection, hypoxia, metabolic, drugs, withdrawal)',
          'Nonpharmacologic bundle (orientation, glasses/hearing, sleep, mobility)',
          'Avoid benzodiazepines unless alcohol/benzo withdrawal',
        ],
      },
      {
        condition: 'ICDSC 1–3',
        actions: ['Prevention bundle', 'Medication review', 'Repeat screening each shift'],
      },
    ],
    pearls: [
      'Comatose patients (no response) are typically scored “unable to assess” for some items — follow local rules.',
      'ICDSC can track severity trends better than binary screens.',
    ],
  },

  // 21. Braden scale
  {
    id: 'braden-scale',
    name: 'Braden Scale for Predicting Pressure Sore Risk',
    shortName: 'Braden',
    description: 'Six-subscale pressure injury risk score (total 6–23; lower = higher risk).',
    category: 'geriatrics',
    tags: ['braden', 'pressure injury', 'nursing', 'icu', 'skin'],
    whenToUse: 'Hospitalized adults for pressure injury risk stratification and care planning.',
    whyUse: 'Most widely used validated pressure ulcer risk tool in North America.',
    inputs: [
      selectInput(
        'sensory',
        'Sensory perception',
        [
          { label: '1 — Completely limited', value: 1 },
          { label: '2 — Very limited', value: 2 },
          { label: '3 — Slightly limited', value: 3 },
          { label: '4 — No impairment', value: 4 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4.',
      ),
      selectInput(
        'moisture',
        'Moisture',
        [
          { label: '1 — Constantly moist', value: 1 },
          { label: '2 — Often moist', value: 2 },
          { label: '3 — Occasionally moist', value: 3 },
          { label: '4 — Rarely moist', value: 4 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4. Non-verbatim reminder only: moisture ≈ linen-change frequency.',
      ),
      selectInput(
        'activity',
        'Activity',
        [
          { label: '1 — Bedfast', value: 1 },
          { label: '2 — Chairfast', value: 2 },
          { label: '3 — Walks occasionally', value: 3 },
          { label: '4 — Walks frequently', value: 4 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4.',
      ),
      selectInput(
        'mobility',
        'Mobility',
        [
          { label: '1 — Completely immobile', value: 1 },
          { label: '2 — Very limited', value: 2 },
          { label: '3 — Slightly limited', value: 3 },
          { label: '4 — No limitation', value: 4 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4.',
      ),
      selectInput(
        'nutrition',
        'Nutrition',
        [
          { label: '1 — Very poor', value: 1 },
          { label: '2 — Probably inadequate', value: 2 },
          { label: '3 — Adequate', value: 3 },
          { label: '4 — Excellent', value: 4 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3 vs 4. Non-verbatim reminder only: NPO >5 days counts toward very poor nutrition.',
      ),
      selectInput(
        'friction',
        'Friction & shear',
        [
          { label: '1 — Problem', value: 1 },
          { label: '2 — Potential problem', value: 2 },
          { label: '3 — No apparent problem', value: 3 },
        ],
        1,
        'Score from the official Braden card (Prevention Plus). Titles here are not sufficient to distinguish 1 vs 2 vs 3. Friction & shear is 1–3 (not 1–4).',
      ),
    ],
    calculate(values) {
      const score =
        num(values.sensory, 4) +
        num(values.moisture, 4) +
        num(values.activity, 4) +
        num(values.mobility, 4) +
        num(values.nutrition, 4) +
        num(values.friction, 3);
      // Lower score = higher risk
      let riskLevel: 'critical' | 'high' | 'moderate' | 'low' | 'normal' = 'normal';
      let label = '';
      let interpretation = '';
      if (score <= 9) {
        riskLevel = 'critical';
        label = 'Very high risk (≤9)';
        interpretation = `Braden ${score}: very high pressure injury risk. Aggressive prevention (surface, turn q1–2h, nutrition, moisture).`;
      } else if (score <= 12) {
        riskLevel = 'high';
        label = 'High risk (10–12)';
        interpretation = `Braden ${score}: high risk — intensive prevention bundle.`;
      } else if (score <= 14) {
        riskLevel = 'moderate';
        label = 'Moderate risk (13–14)';
        interpretation = `Braden ${score}: moderate risk — structured prevention and frequent skin checks.`;
      } else if (score <= 18) {
        riskLevel = 'low';
        label = 'Mild risk (15–18)';
        interpretation = `Braden ${score}: mild risk — standard prevention; reassess on status change.`;
      } else {
        riskLevel = 'normal';
        label = 'Generally not at risk (19–23)';
        interpretation = `Braden ${score}: low risk band — continue routine skin care; rescreen if condition changes.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Range', value: '6–23 (lower = higher risk)' }],
      };
    },
    evidence: {
      summary: 'Braden Scale sums sensory perception, moisture, activity, mobility, nutrition, and friction/shear.',
      formula: 'Total = 6 subscales (friction 1–3; others 1–4); risk rises as total falls',
      validation: 'Extensively validated; cutoffs may be adjusted for ICU (sometimes ≤16 or ≤18).',
      references: [
        {
          title: 'Clinical utility of the Braden Scale for Predicting Pressure Sore Risk',
          citation: 'Bergstrom N et al. Nurs Clin North Am. 1987 / subsequent validations',
          year: 1987,
          pmid: '3554150',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Braden ≤18 (or unit ICU cutoff)',
        actions: [
          'Pressure-redistributing surface',
          'Repositioning schedule',
          'Manage moisture and nutrition',
          'Offload heels; inspect skin each shift',
        ],
      },
    ],
    pearls: [
      'Braden Scale is copyrighted (Prevention Plus). Do not score from titles alone — use the official card to distinguish 1 vs 2 vs 3 vs 4 (friction 1–3).',
      'ICU patients may warrant prevention even at higher Braden scores.',
      'Lower score = worse risk (opposite of many severity scores).',
    ],
  },

  // 22. Waterlow scale
  {
    id: 'waterlow-scale',
    name: 'Waterlow Pressure Ulcer Risk Score',
    shortName: 'Waterlow',
    description: 'Waterlow score for pressure sore risk (higher = higher risk); common in UK practice.',
    category: 'geriatrics',
    tags: ['waterlow', 'pressure ulcer', 'nursing', 'skin', 'risk'],
    whenToUse: 'Adults when Waterlow is the institutional pressure injury risk tool.',
    whyUse: 'Includes build, skin type, sex/age, continence, mobility, nutrition, and special risk factors.',
    inputs: [
      selectInput(
        'build',
        'Build / weight for height',
        [
          { label: 'Average — BMI 20–24.9 (0)', value: 0, description: 'Official build: BMI 20–24.9' },
          { label: 'Above average — BMI 25–29.9 (1)', value: 1, description: 'Official build: BMI 25–29.9' },
          { label: 'Obese — BMI ≥30 (2)', value: 2, description: 'Official build: BMI ≥30' },
          { label: 'Below average — BMI <20 (3)', value: 3, description: 'Official build: BMI <20' },
        ],
        0,
        'Official Waterlow build/weight-for-height uses BMI: 20–24.9 average (0), 25–29.9 above average (1), ≥30 obese (2), <20 below average (3).',
      ),
      selectInput(
        'skin',
        'Skin type / visual risk areas',
        [
          { label: 'Healthy (0)', value: 0, description: 'No visual skin-risk finding' },
          { label: 'Tissue paper / dry (1)', value: 1, description: 'Tissue-paper or dry skin. Official card may stack several skin items; this tool is highest-one-only' },
          { label: 'Edematous / clammy (1)', value: 1, description: 'Edematous or clammy. Official card may stack; this tool is highest-one-only' },
          { label: 'Discolored grade 1 (2)', value: 2, description: 'Discoloured / grade 1. Highest listed finding only in this tool' },
          { label: 'Broken spots grade 2+ (3)', value: 3, description: 'Broken spots / grade 2+. Highest listed finding only in this tool' },
        ],
        0,
        'Official Waterlow skin type may add multiple visual descriptors; this tool is highest-one-only (pick the single highest listed finding).',
      ),
      selectInput(
        'sexAge',
        'Sex and age (combined)',
        [
          { label: 'Do not use — male sex only, age not added (1)', value: 1, description: 'Official sex Male = 1 only. Prefer an age-banded combined option when age is known' },
          { label: 'Female, age not added / Male 14–49 combined (2)', value: 2, description: 'Official sex Female = 2, or combined Male 14–49 = 1+1 = 2' },
          { label: 'Do not use — age 14–49 only, sex not added (1)', value: 1, description: 'Official combined Male 14–49 = 2, Female 14–49 = 3. This option’s value is 1 (not a full combined total)' },
          { label: 'Male 50–64 or Female 14–49 (3)', value: 3, description: 'Official: Male 50–64 = 1+2 = 3; Female 14–49 = 2+1 = 3' },
          { label: 'Male 65–74 or Female 50–64 (4)', value: 4, description: 'Official: Male 65–74 = 1+3 = 4; Female 50–64 = 2+2 = 4' },
          { label: 'Male 75–80 or Female 65–74 (5)', value: 5, description: 'Official: Male 75–80 = 1+4 = 5; Female 65–74 = 2+3 = 5' },
          { label: 'Male 81+ or Female 75–80 (6)', value: 6, description: 'Official: Male 81+ = 1+5 = 6; Female 75–80 = 2+4 = 6. Female 81+ official = 7 — this tool has no value 7' },
        ],
        1,
        'Official Waterlow adds sex (Male 1 / Female 2) plus age (14–49: 1, 50–64: 2, 65–74: 3, 75–80: 4, 81+: 5). Combined: Male 14–49 = 2, Female 14–49 = 3, Male 50–64 = 3, Female 50–64 = 4, Male 65–74 = 4, Female 65–74 = 5, Male 75–80 = 5, Female 75–80 = 6, Male 81+ = 6, Female 81+ = 7. Pick the option whose points match sex+age. This selector is not split; there is no value 7 (Female 81+ closest is 6).',
      ),
      selectInput('continence', 'Continence', [
        { label: 'Complete / catheterized (0)', value: 0 },
        { label: 'Occasional incontinence (1)', value: 1 },
        { label: 'Catheterized + incontinent of feces (2)', value: 2 },
        { label: 'Doubly incontinent (3)', value: 3 },
      ]),
      selectInput('mobility', 'Mobility', [
        { label: 'Fully (0)', value: 0 },
        { label: 'Restless / fidgety (1)', value: 1 },
        { label: 'Apathetic (2)', value: 2 },
        { label: 'Restricted (3)', value: 3 },
        { label: 'Inert / traction (4)', value: 4 },
        { label: 'Chairbound (5)', value: 5 },
      ]),
      selectInput('appetite', 'Appetite / nutrition', [
        { label: 'Average (0)', value: 0 },
        { label: 'Poor (1)', value: 1 },
        { label: 'NG / fluids only (2)', value: 2 },
        { label: 'NBM / anorexic (3)', value: 3 },
      ]),
      selectInput('tissue', 'Tissue malnutrition special risks (highest applicable)', [
        { label: 'None (0)', value: 0 },
        { label: 'Terminal cachexia (8)', value: 8 },
        { label: 'Multiple organ failure (8)', value: 8 },
        { label: 'Single organ failure heart/kidney/liver (5)', value: 5 },
        { label: 'Peripheral vascular disease (5)', value: 5 },
        { label: 'Anemia Hb <8 (2)', value: 2 },
        { label: 'Smoking (1)', value: 1 },
      ]),
      selectInput(
        'neuro',
        'Neurological deficit (highest)',
        [
          { label: 'None (0)', value: 0, description: 'No neurological deficit' },
          { label: 'Diabetes / MS / CVA / motor-sensory — moderate (5)', value: 5, description: 'Official neuro is 4–6 by severity (4 mild / 5 moderate / 6 complete). This control has no 4; use 5 for typical diabetes/MS/CVA/motor-sensory' },
          { label: 'Paraplegia — complete (6)', value: 6, description: 'Official paraplegia 5–6. This option is 6 (complete); use 5 if moderate rather than complete' },
        ],
        0,
        'Official Waterlow neurological deficit is 4–6 for diabetes/MS/CVA/motor-sensory/paraplegia — pick 4 mild / 5 moderate / 6 complete. This control only offers 5 or 6.',
      ),
      selectInput('surgery', 'Major surgery / trauma', [
        { label: 'None (0)', value: 0 },
        { label: 'Orthopedic / spinal (below waist / spinal) (5)', value: 5 },
        { label: 'On table >2 h (5)', value: 5 },
        { label: 'On table >6 h (8)', value: 8 },
      ]),
      selectInput('meds', 'Medications (steroids, cytotoxics, anti-inflammatory high dose)', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.build) +
        num(values.skin) +
        num(values.sexAge) +
        num(values.continence) +
        num(values.mobility) +
        num(values.appetite) +
        num(values.tissue) +
        num(values.neuro) +
        num(values.surgery) +
        num(values.meds);
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Not at risk (≤9)',
          interpretation: `Waterlow ${score}: below “at risk” threshold. Standard care; rescreen when condition changes.`,
        },
        {
          max: 14,
          level: 'moderate',
          label: 'At risk (10–14)',
          interpretation: `Waterlow ${score}: at risk — implement prevention care plan.`,
        },
        {
          max: 19,
          level: 'high',
          label: 'High risk (15–19)',
          interpretation: `Waterlow ${score}: high risk — intensive prevention and specialist surface as indicated.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk (≥20)',
          interpretation: `Waterlow ${score}: very high risk — maximum prevention bundle and frequent skin inspection.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Thresholds', value: '10+ at risk; 15+ high; 20+ very high' },
          { label: 'Note', value: 'Sex/age combined selector is simplified for bedside use' },
        ],
      };
    },
    evidence: {
      summary: 'Waterlow scores multiple intrinsic and extrinsic pressure ulcer risk factors; higher totals mean higher risk.',
      formula: 'Sum of build, skin, sex/age, continence, mobility, appetite, tissue, neuro, surgery, meds points',
      validation: 'Widely used in UK; sensitivity/specificity vary; education required for consistent scoring.',
      references: [
        {
          title: 'Pressure sores: a risk assessment card',
          citation: 'Waterlow J. Nurs Times. 1985',
          year: 1985,
          pmid: '3853163',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥10',
        actions: [
          'Document care plan',
          'Repositioning and support surface',
          'Nutrition referral if indicated',
          'Manage continence and skin moisture',
        ],
      },
    ],
    pearls: [
      'Unlike Braden, higher Waterlow = higher risk.',
      'Official sex (M 1 / F 2) plus age (14–49: 1 … 81+: 5) are combined in one selector; Female 81+ official = 7 is not offered.',
      'Skin findings on the printed card may stack; this tool scores the single highest skin option only.',
      'Waterlow card copyright Judy Waterlow — verify audit-critical scoring against the printed card.',
    ],
  },

  // 23. Norton scale
  {
    id: 'norton-scale',
    name: 'Norton Pressure Sore Risk Scale',
    shortName: 'Norton',
    description: 'Five-domain pressure injury risk scale (total 5–20; lower = higher risk).',
    category: 'geriatrics',
    tags: ['norton', 'pressure ulcer', 'nursing', 'skin'],
    whenToUse: 'Adults when Norton is used for pressure injury risk (historical and some current settings).',
    whyUse: 'Simple 5-item scale; ≤14 commonly indicates increased risk.',
    inputs: [
      selectInput('physical', 'Physical condition', [
        { label: '4 — Good', value: 4 },
        { label: '3 — Fair', value: 3 },
        { label: '2 — Poor', value: 2 },
        { label: '1 — Very bad', value: 1 },
      ]),
      selectInput('mental', 'Mental condition', [
        { label: '4 — Alert', value: 4 },
        { label: '3 — Apathetic', value: 3 },
        { label: '2 — Confused', value: 2 },
        { label: '1 — Stuporous', value: 1 },
      ]),
      selectInput('activity', 'Activity', [
        { label: '4 — Ambulant', value: 4 },
        { label: '3 — Walks with help', value: 3 },
        { label: '2 — Chairbound', value: 2 },
        { label: '1 — Bedbound', value: 1 },
      ]),
      selectInput('mobility', 'Mobility', [
        { label: '4 — Full', value: 4 },
        { label: '3 — Slightly limited', value: 3 },
        { label: '2 — Very limited', value: 2 },
        { label: '1 — Immobile', value: 1 },
      ]),
      selectInput('incontinence', 'Incontinence', [
        { label: '4 — None', value: 4 },
        { label: '3 — Occasional', value: 3 },
        { label: '2 — Usually urinary', value: 2 },
        { label: '1 — Urinary and fecal', value: 1 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.physical, 4) +
        num(values.mental, 4) +
        num(values.activity, 4) +
        num(values.mobility, 4) +
        num(values.incontinence, 4);
      let riskLevel: 'critical' | 'high' | 'moderate' | 'low' | 'normal' = 'normal';
      let label = '';
      let interpretation = '';
      if (score <= 10) {
        riskLevel = 'critical';
        label = 'Very high risk (≤10)';
        interpretation = `Norton ${score}/20: very high pressure injury risk. Maximum prevention measures.`;
      } else if (score <= 14) {
        riskLevel = 'high';
        label = 'At risk (≤14)';
        interpretation = `Norton ${score}/20: at increased risk (classic cutoff ≤14). Implement prevention plan.`;
      } else if (score <= 16) {
        riskLevel = 'moderate';
        label = 'Borderline (15–16)';
        interpretation = `Norton ${score}/20: some use ≤15–16 as risk cutoffs — apply prevention if clinically vulnerable (ICU, elderly).`;
      } else {
        riskLevel = 'low';
        label = 'Generally low risk (≥17)';
        interpretation = `Norton ${score}/20: lower risk band. Continue routine skin care and rescreen on change.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Classic risk cutoff', value: '≤14 at risk (lower score = higher risk)' }],
      };
    },
    evidence: {
      summary: 'Norton scale (1962) is an early pressure ulcer risk tool still used in some health systems.',
      formula: 'Physical + Mental + Activity + Mobility + Incontinence (each 1–4)',
      validation: 'Historical validation; Braden often preferred for operating characteristics today.',
      references: [
        {
          title: 'An investigation of geriatric nursing problems in hospital',
          citation: 'Norton D, McLaren R, Exton-Smith AN. 1962',
          year: 1962,
          pmid: '14480428',
          url: 'https://www.nice.org.uk/guidance/cg179',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Norton ≤14',
        actions: ['Pressure relief schedule', 'Support surface', 'Continence and nutrition optimization', 'Skin inspection'],
      },
    ],
    pearls: ['Lower Norton = higher risk (same direction as Braden).', 'Does not include explicit nutrition/friction domains like Braden.'],
  },

  // 24. MUST malnutrition screening
  {
    id: 'must-score',
    name: 'MUST Malnutrition Universal Screening Tool',
    shortName: 'MUST',
    description: 'BAPEN MUST score: BMI + weight loss + acute disease effect (0–6 educational range).',
    category: 'general',
    tags: ['must', 'malnutrition', 'nutrition', 'screening', 'bapen'],
    whenToUse: 'Adults in hospital or community for malnutrition risk screening.',
    whyUse: 'Rapid validated screen that triggers care pathways (food-first, dietitian, monitoring).',
    inputs: [
      selectInput('bmi', 'BMI score', [
        { label: 'BMI >20 (0) (>30 obese still scores 0 for MUST BMI step)', value: 0 },
        { label: 'BMI 18.5–20 (1)', value: 1 },
        { label: 'BMI <18.5 (2)', value: 2 },
        { label: 'BMI unknown — use alternative measures per BAPEN', value: 0 },
      ]),
      selectInput('wtLoss', 'Unplanned weight loss in past 3–6 months', [
        { label: '<5% (0)', value: 0 },
        { label: '5–10% (1)', value: 1 },
        { label: '>10% (2)', value: 2 },
      ]),
      selectInput('acute', 'Acute disease effect', [
        {
          label: 'No — patient not acutely ill and no likelihood of no intake >5 days (0)',
          value: 0,
        },
        {
          label: 'Yes — acutely ill AND likely no nutritional intake for >5 days (2)',
          value: 2,
        },
      ]),
    ],
    calculate(values) {
      const score = num(values.bmi) + num(values.wtLoss) + num(values.acute);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score === 0) {
        riskLevel = 'low';
        label = 'Low risk (0)';
        interpretation = 'MUST 0: low malnutrition risk. Routine clinical care; repeat screening weekly in hospital (or monthly in care homes / annually community per policy).';
      } else if (score === 1) {
        riskLevel = 'moderate';
        label = 'Medium risk (1)';
        interpretation =
          'MUST 1: medium risk. Document dietary intake for 3 days; if improved, rescreen; if little/no improvement, escalate to care plan / dietitian per local pathway.';
      } else {
        riskLevel = 'high';
        label = 'High risk (≥2)';
        interpretation = `MUST ${score}: high risk. Treat — refer dietitian, set care goals, increase energy/protein, monitor; consider underlying disease.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Components', value: 'BMI + weight loss + acute disease' },
          { label: 'Categories', value: '0 low; 1 medium; ≥2 high' },
        ],
      };
    },
    evidence: {
      summary: 'MUST is a BAPEN five-step tool widely used across UK healthcare for malnutrition risk.',
      formula: 'BMI points + unplanned weight-loss points + acute disease effect (0 or 2)',
      validation: 'Validated against other nutrition screens; linked to length of stay and complications.',
      references: [
        {
          title: 'Malnutrition Universal Screening Tool (MUST)',
          citation: 'BAPEN / Elia M. The MUST report. 2003',
          year: 2003,
          url: 'https://www.bapen.org.uk/screening-and-must/must',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'MUST 0',
        actions: ['Routine care', 'Repeat screening per setting schedule'],
      },
      {
        condition: 'MUST 1',
        actions: ['Monitor intake 3 days', 'Food fortification', 'Escalate if no improvement'],
      },
      {
        condition: 'MUST ≥2',
        actions: ['Dietitian referral', 'Nutrition care plan', 'Treat underlying disease', 'Weekly review in hospital'],
      },
    ],
    pearls: [
      'Obesity does not exclude malnutrition risk — weight loss and acute disease still score.',
      'If height/weight impossible, use mid-upper arm circumference alternatives per BAPEN guidance.',
    ],
  },
];
