import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave2PulmIdCalcs: Calculator[] = [
  {
    id: 'idsa-ats-icu',
    name: 'IDSA/ATS Severe CAP Criteria',
    shortName: 'IDSA/ATS CAP',
    description: 'Major and minor criteria for severe community-acquired pneumonia and ICU-level care.',
    category: 'pulmonary',
    tags: ['cap', 'pneumonia', 'icu', 'idsa', 'ats', 'severity'],
    whenToUse: 'Adults with CAP when deciding need for ICU or higher-level monitoring.',
    whyUse: 'IDSA/ATS 2007 defines severe CAP as ≥1 major or ≥3 minor criteria to guide ICU admission.',
    inputs: [
      yesNo('shock', 'Septic shock requiring vasopressors (major)', 1),
      yesNo('vent', 'Respiratory failure requiring mechanical ventilation (major)', 1),
      yesNo('rr', 'Respiratory rate ≥ 30/min (minor)', 1),
      yesNo('pf', 'PaO₂/FiO₂ ≤ 250 (minor)', 1),
      yesNo('multilobar', 'Multilobar infiltrates (minor)', 1),
      yesNo('confusion', 'Confusion / disorientation (minor)', 1),
      yesNo('urea', 'Uremia — BUN ≥ 20 mg/dL (minor)', 1),
      yesNo('leukopenia', 'Leukopenia — WBC < 4,000/µL (minor)', 1),
      yesNo('thrombocytopenia', 'Thrombocytopenia — platelets < 100,000/µL (minor)', 1),
      yesNo('hypothermia', 'Hypothermia — core temp < 36°C (minor)', 1),
      yesNo('hypotension', 'Hypotension requiring aggressive fluid resuscitation (minor)', 1),
    ],
    calculate(values) {
      const major =
        (bool(values.shock) ? 1 : 0) + (bool(values.vent) ? 1 : 0);
      const minorKeys = [
        'rr',
        'pf',
        'multilobar',
        'confusion',
        'urea',
        'leukopenia',
        'thrombocytopenia',
        'hypothermia',
        'hypotension',
      ];
      const minor = minorKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const severe = major >= 1 || minor >= 3;
      return {
        score: major + minor,
        label: severe ? 'Severe CAP' : 'Not severe by IDSA/ATS',
        interpretation: severe
          ? `Meets severe CAP definition (${major} major, ${minor} minor). Strongly consider ICU-level care.`
          : `${major} major and ${minor} minor criteria. Does not meet ≥1 major or ≥3 minor threshold; still use clinical judgment.`,
        riskLevel: severe ? (major >= 1 ? 'critical' : 'high') : minor >= 2 ? 'moderate' : 'low',
        details: [
          { label: 'Major criteria', value: `${major} / 2` },
          { label: 'Minor criteria', value: `${minor} / 9` },
          { label: 'Rule', value: 'Severe = ≥1 major OR ≥3 minor' },
        ],
        recommendations: severe
          ? ['ICU or step-down with continuous monitoring', 'Early appropriate antibiotics and source control', 'Assess for ARDS / shock protocols']
          : ['Ward or observation care as appropriate', 'Reassess if clinical deterioration'],
      };
    },
    evidence: {
      summary: 'IDSA/ATS CAP guidelines define severe pneumonia using major (ventilatory failure, septic shock) and minor physiologic criteria.',
      formula: 'Severe CAP = ≥1 major OR ≥3 minor criteria',
      validation: 'Widely used for ICU triage; minor criteria validated for predicting ICU need and mortality.',
      references: [
        {
          title: 'Infectious Diseases Society of America/American Thoracic Society consensus guidelines on CAP in adults',
          citation: 'Mandell LA et al. Clin Infect Dis. 2007',
          year: 2007,
          pmid: '17278083',
          doi: '10.1086/511159',
        },
      ],
    },
    nextSteps: [
      { condition: '≥1 major', actions: ['ICU admission', 'Vasopressors / mechanical ventilation per need', 'Blood cultures and timely antibiotics'] },
      { condition: '≥3 minor without major', actions: ['Strongly consider ICU or high-dependency unit', 'Serial lactate and organ-function monitoring'] },
    ],
    pearls: [
      'Minor criteria alone can define severe CAP even without shock or intubation.',
      'Do not delay ICU transfer for scoring if the patient is clearly decompensating.',
    ],
  },
  {
    id: 'scap-score',
    name: 'SCAP Score (Severe CAP)',
    shortName: 'SCAP',
    description: 'Severe Community-Acquired Pneumonia score using major/minor weighted points.',
    category: 'pulmonary',
    tags: ['cap', 'pneumonia', 'scap', 'severity', 'icu'],
    whenToUse: 'Adults with CAP to identify severe disease and ICU-level risk.',
    whyUse: 'Point-based alternative/complement to IDSA/ATS criteria with validated mortality prediction.',
    inputs: [
      yesNo('ph', 'Arterial pH < 7.30 (+13)', 13),
      yesNo('sbp', 'SBP < 90 mmHg (+11)', 11),
      yesNo('rr', 'Respiratory rate > 30/min (+9)', 9),
      yesNo('pao2', 'PaO₂ < 54 mmHg or PaO₂/FiO₂ < 250 (+6)', 6),
      yesNo('bun', 'BUN > 30 mg/dL (+5)', 5),
      yesNo('ams', 'Altered mental status (+5)', 5),
      yesNo('age80', 'Age ≥ 80 years (+5)', 5),
      yesNo('multilobar', 'Multilobar or bilateral infiltrate (+5)', 5),
    ],
    calculate(values) {
      const pts: [string, number][] = [
        ['ph', 13],
        ['sbp', 11],
        ['rr', 9],
        ['pao2', 6],
        ['bun', 5],
        ['ams', 5],
        ['age80', 5],
        ['multilobar', 5],
      ];
      const score = pts.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      const major = bool(values.ph) || bool(values.sbp);
      const severe = score >= 10 || major;
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: major ? 'high' : 'low',
          label: major ? 'Severe (major criterion)' : 'Non-severe (score <10)',
          interpretation: major
            ? `SCAP ${score} with major criterion (pH <7.30 or SBP <90). Treat as severe CAP.`
            : `SCAP ${score} (<10, no major). Lower likelihood of severe CAP; reassess clinically.`,
        },
        {
          max: 19,
          level: 'high',
          label: 'Severe CAP (10–19)',
          interpretation: `SCAP ${score}: severe CAP range. Consider ICU / high-dependency care.`,
        },
        {
          max: 59,
          level: 'critical',
          label: 'Very severe (≥20)',
          interpretation: `SCAP ${score}: very high severity. Prioritize critical care support.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Severe threshold', value: 'Score ≥10 or any major (pH/SBP)' },
          { label: 'Major present', value: major ? 'Yes' : 'No' },
          { label: 'Severe CAP', value: severe ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'SCAP (España et al.) weights acidemia, hypotension, tachypnea, hypoxemia, uremia, confusion, age, and multilobar disease.',
      formula: 'pH13 + SBP11 + RR9 + hypoxemia6 + BUN5 + AMS5 + age≥80:5 + multilobar5; severe if ≥10',
      validation: 'Derived and validated for predicting severe CAP outcomes and ICU need.',
      references: [
        {
          title: 'Development and validation of a clinical prediction rule for severe community-acquired pneumonia',
          citation: 'España PP et al. Am J Respir Crit Care Med. 2006',
          year: 2006, pmid: '16973986',
          doi: '10.1164/rccm.200602-177OC', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥10 or major criterion', actions: ['Consider ICU', 'Aggressive resuscitation', 'Early cultures and antibiotics'] },
      { condition: 'Score <10 without major', actions: ['Ward management if stable', 'Close monitoring for deterioration'] },
    ],
  },
  {
    id: 'hall-criteria',
    name: 'Hall Criteria (IV → Oral Switch, Pneumonia)',
    shortName: 'Hall Switch',
    description: 'Clinical stability criteria supporting switch from IV to oral antibiotics in pneumonia.',
    category: 'infectious-disease',
    tags: ['pneumonia', 'antibiotics', 'stewardship', 'iv to oral', 'hall'],
    whenToUse: 'Hospitalized pneumonia patients on IV antibiotics being considered for oral step-down.',
    whyUse: 'Early switch when clinically stable shortens LOS without harming outcomes when criteria are met.',
    inputs: [
      yesNo('temp', 'Temperature ≤ 37.8°C (100°F)', 1),
      yesNo('hr', 'Heart rate ≤ 100 beats/min', 1),
      yesNo('rr', 'Respiratory rate ≤ 24 breaths/min', 1),
      yesNo('sbp', 'Systolic BP ≥ 90 mmHg', 1),
      yesNo('o2', 'O₂ sat ≥ 90% on room air (or at baseline O₂ requirement)', 1),
      yesNo('mental', 'Normal mental status (or return to baseline)', 1),
      yesNo('oral', 'Able to take oral medications / functioning GI tract', 1),
      yesNo('stable24', 'Criteria sustained ~24 hours (optional clinical check)', 0),
    ],
    calculate(values) {
      const core = ['temp', 'hr', 'rr', 'sbp', 'o2', 'mental', 'oral'] as const;
      const met = core.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const allCore = met === 7;
      const stable24 = bool(values.stable24);
      if (allCore) {
        return {
          score: met + (stable24 ? 1 : 0),
          label: stable24 ? 'Switch favorable (stable ~24 h)' : 'Clinical stability met',
          interpretation: stable24
            ? 'All Hall stability criteria met and sustained ~24 h. Reasonable to switch IV → oral if oral agent covers pathogen and social factors allow.'
            : 'All core stability criteria met. Confirm sustained stability (often ~24 h) and suitable oral option before switching.',
          riskLevel: 'low',
          details: [
            { label: 'Core criteria met', value: `${met} / 7` },
            { label: '~24 h stability flagged', value: stable24 ? 'Yes' : 'No / not confirmed' },
          ],
          recommendations: [
            'Choose bioavailable oral agent with similar spectrum',
            'Ensure reliable intake and follow-up',
            'Do not switch if ongoing bacteremia, undrained source, or malabsorption',
          ],
        };
      }
      return {
        score: met,
        label: 'Not yet stable for switch',
        interpretation: `${met}/7 core Hall criteria met. Continue IV therapy and reassess; address unmet vital-sign or functional criteria.`,
        riskLevel: met >= 5 ? 'moderate' : 'high',
        details: [{ label: 'Core criteria met', value: `${met} / 7` }],
      };
    },
    evidence: {
      summary: 'Hall and related clinical stability criteria identify when CAP patients can safely transition from IV to oral antibiotics.',
      formula: 'Temp≤37.8 + HR≤100 + RR≤24 + SBP≥90 + O₂ sat≥90% (or baseline) + normal mentation + can take PO',
      validation: 'Early switch strategies using stability criteria reduce length of stay without increasing failure in selected CAP patients.',
      references: [
        {
          title: 'Antibiotic treatment strategies for community-acquired pneumonia and clinical stability criteria',
          citation: 'Halm EA et al. / related CAP switch literature; IDSA CAP guidance',
          year: 2002, pmid: '11556940',
          doi: '10.1046/j.1525-1497.2001.016009599.x', },
      ],
    },
    nextSteps: [
      { condition: 'All criteria met', actions: ['Switch to oral antibiotic', 'Plan discharge if social support adequate', 'Safety-net return precautions'] },
      { condition: 'Criteria incomplete', actions: ['Continue IV therapy', 'Reassess vitals and oxygenation', 'Investigate persistent fever or hypoxia'] },
    ],
    pearls: ['Stability ≠ microbiologic cure; finish an appropriate total course.', 'MRSA/Pseudomonas coverage needs may alter oral options.'],
  },
  {
    id: 'mulbsta',
    name: 'MuLBSTA Score (Viral Pneumonia)',
    shortName: 'MuLBSTA',
    description: 'Mortality risk score for viral pneumonia (multilobar, lymphopenia, bacterial coinfection, smoking, HTN, age).',
    category: 'pulmonary',
    tags: ['viral pneumonia', 'influenza', 'mortality', 'mulbsta'],
    whenToUse: 'Adults with confirmed or suspected viral pneumonia for early mortality risk stratification.',
    whyUse: 'Simple bedside/lab score derived for viral pneumonia outcomes including influenza.',
    inputs: [
      yesNo('multilobar', 'Multilobar infiltrate (+5)', 5),
      yesNo('lymphopenia', 'Lymphopenia ≤ 0.8 × 10⁹/L (+4)', 4),
      yesNo('bacterial', 'Bacterial coinfection (+4)', 4),
      yesNo('smoking', 'Smoking history (active or former) (+3)', 3),
      yesNo('htn', 'Hypertension (+2)', 2),
      yesNo('age60', 'Age ≥ 60 years (+2)', 2),
    ],
    calculate(values) {
      const pts: [string, number][] = [
        ['multilobar', 5],
        ['lymphopenia', 4],
        ['bacterial', 4],
        ['smoking', 3],
        ['htn', 2],
        ['age60', 2],
      ];
      const score = pts.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'low',
          label: 'Low risk (0–6)',
          interpretation: `MuLBSTA ${score}: lower 90-day mortality risk group in derivation cohorts. Standard viral pneumonia care.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Moderate risk (7–9)',
          interpretation: `MuLBSTA ${score}: intermediate mortality risk. Closer monitoring; treat coinfection if present.`,
        },
        {
          max: 11,
          level: 'high',
          label: 'High risk (10–11)',
          interpretation: `MuLBSTA ${score}: high mortality risk. Consider higher-level care and early supportive therapy.`,
        },
        {
          max: 22,
          level: 'critical',
          label: 'Very high risk (12–22)',
          interpretation: `MuLBSTA ${score}: very high mortality risk. Aggressive support; evaluate for ICU and complications.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Max score', value: '20 (5+4+4+3+2+2)' }],
      };
    },
    evidence: {
      summary: 'MuLBSTA predicts mortality in viral pneumonia using multilobar disease, lymphopenia, bacterial coinfection, smoking, hypertension, and age ≥60.',
      formula: 'Multilobar 5 + lymphopenia 4 + bacterial coinfection 4 + smoking 3 + HTN 2 + age≥60: 2',
      validation: 'Derived in viral pneumonia cohorts; used as risk adjunct (not a stand-alone disposition rule).',
      references: [
        {
          title: 'MuLBSTA score for predicting mortality in viral pneumonia',
          citation: 'Guo L et al. related viral pneumonia scoring literature',
          year: 2019, pmid: '31849894',
          doi: '10.3389/fmicb.2019.02752', },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–11', actions: ['Supportive care', 'Antivirals when indicated', 'Ward care per overall status'] },
      { condition: 'Score ≥12', actions: ['Consider step-up monitoring or ICU', 'Cover bacterial coinfection if suspected', 'Serial labs and gas exchange'] },
    ],
  },
  {
    id: 'isaric-4c',
    name: 'ISARIC 4C Mortality Score (COVID-19)',
    shortName: '4C Mortality',
    description: 'ISARIC 4C score estimating in-hospital mortality risk in COVID-19.',
    category: 'infectious-disease',
    tags: ['covid-19', 'isaric', '4c', 'mortality', 'risk'],
    whenToUse: 'Adults hospitalized with confirmed or suspected COVID-19 for in-hospital mortality risk stratification.',
    whyUse: 'Validated multivariable mortality model using age, sex, comorbidities, vitals, and labs.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '< 50 years (0)', value: 0 },
        { label: '50–59 (2)', value: 2 },
        { label: '60–69 (4)', value: 4 },
        { label: '70–79 (6)', value: 6 },
        { label: '≥ 80 (7)', value: 7 },
      ]),
      selectInput('sex', 'Sex at birth', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (1)', value: 1 },
      ]),
      selectInput('comorbid', 'Number of comorbidities', [
        { label: '0 (0)', value: 0 },
        { label: '1 (1)', value: 1 },
        { label: '≥ 2 (2)', value: 2 },
      ]),
      selectInput('rr', 'Respiratory rate (breaths/min)', [
        { label: '< 20 (0)', value: 0 },
        { label: '20–29 (1)', value: 1 },
        { label: '≥ 30 (2)', value: 2 },
      ]),
      selectInput('spo2', 'SpO₂ on room air', [
        { label: '≥ 92% (0)', value: 0 },
        { label: '< 92% (2)', value: 2 },
      ]),
      selectInput('gcs', 'GCS', [
        { label: '15 (0)', value: 0 },
        { label: '< 15 (2)', value: 2 },
      ]),
      selectInput('urea', 'Urea / BUN', [
        { label: 'Urea ≤ 7 mmol/L (BUN ≤ 19.6 mg/dL) (0)', value: 0 },
        { label: 'Urea 7–14 mmol/L (BUN ~20–39) (1)', value: 1 },
        { label: 'Urea > 14 mmol/L (BUN > 39) (3)', value: 3 },
      ]),
      selectInput('crp', 'CRP (mg/L)', [
        { label: '< 50 (0)', value: 0 },
        { label: '50–99 (1)', value: 1 },
        { label: '≥ 100 (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        num(values.sex) +
        num(values.comorbid) +
        num(values.rr) +
        num(values.spo2) +
        num(values.gcs) +
        num(values.urea) +
        num(values.crp);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low risk (0–3)',
          interpretation: `4C score ${score}: in-hospital mortality ~1% in original ISARIC cohorts.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Intermediate (4–8)',
          interpretation: `4C score ${score}: mortality roughly ~10% range. Monitor closely; consider enhanced care pathways.`,
        },
        {
          max: 14,
          level: 'high',
          label: 'High (9–14)',
          interpretation: `4C score ${score}: mortality roughly ~30% range. Escalate supportive care; specialty input as needed.`,
        },
        {
          max: 21,
          level: 'critical',
          label: 'Very high (15–21)',
          interpretation: `4C score ${score}: mortality roughly ~60% range. Critical illness risk — ICU readiness and goals-of-care discussions.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Score range', value: '0–21' },
          { label: 'Approx. mortality bands', value: '0–3 ~1%; 4–8 ~10%; 9–14 ~31%; ≥15 ~62%' },
        ],
      };
    },
    evidence: {
      summary: 'ISARIC 4C Mortality Score predicts in-hospital death in COVID-19 using 8 routinely available variables.',
      formula: 'Age + sex + comorbidities + RR + SpO₂ + GCS + urea + CRP (max 21)',
      validation: 'Large UK derivation/validation cohorts; performance varies by era, vaccination, and variant.',
      references: [
        {
          title: 'Risk stratification of patients admitted to hospital with covid-19 using the ISARIC WHO Clinical Characterisation Protocol',
          citation: 'Knight SR et al. BMJ. 2020',
          year: 2020,
          pmid: '32907855',
          doi: '10.1136/bmj.m3339',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–3', actions: ['Standard ward/outpatient pathway per local policy', 'Safety-net advice'] },
      { condition: 'Score ≥9', actions: ['Higher-level monitoring', 'Oxygen / steroids / antivirals per contemporary guidelines', 'Consider ICU outreach'] },
    ],
    pearls: ['Absolute risks decline with vaccination and better therapy; use for relative stratification.', 'SpO₂ points assume room-air measurement when feasible.'],
  },
  {
    id: 'murray-lis',
    name: 'Murray Lung Injury Score (Simplified)',
    shortName: 'Murray LIS',
    description: 'Four-component lung injury score (CXR, hypoxemia, PEEP, compliance) averaged for ARDS severity.',
    category: 'critical-care',
    tags: ['ards', 'lung injury', 'murray', 'icu', 'peep'],
    whenToUse: 'Intubated patients with acute hypoxemic respiratory failure to grade lung injury.',
    whyUse: 'Classic composite severity score; >2.5 historically associated with severe lung injury/ARDS.',
    inputs: [
      selectInput('cxr', 'Chest radiograph (alveolar consolidation)', [
        { label: 'No consolidation (0)', value: 0 },
        { label: '1 quadrant (1)', value: 1 },
        { label: '2 quadrants (2)', value: 2 },
        { label: '3 quadrants (3)', value: 3 },
        { label: '4 quadrants (4)', value: 4 },
      ]),
      selectInput('hypox', 'Hypoxemia (PaO₂/FiO₂)', [
        { label: '≥ 300 (0)', value: 0 },
        { label: '225–299 (1)', value: 1 },
        { label: '175–224 (2)', value: 2 },
        { label: '100–174 (3)', value: 3 },
        { label: '< 100 (4)', value: 4 },
      ]),
      selectInput('peep', 'PEEP (cm H₂O)', [
        { label: '≤ 5 (0)', value: 0 },
        { label: '6–8 (1)', value: 1 },
        { label: '9–11 (2)', value: 2 },
        { label: '12–14 (3)', value: 3 },
        { label: '≥ 15 (4)', value: 4 },
      ]),
      selectInput('compliance', 'Respiratory system compliance (mL/cm H₂O)', [
        { label: '≥ 80 (0)', value: 0 },
        { label: '60–79 (1)', value: 1 },
        { label: '40–59 (2)', value: 2 },
        { label: '20–39 (3)', value: 3 },
        { label: '≤ 19 (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const components = [num(values.cxr), num(values.hypox), num(values.peep), num(values.compliance)];
      const sum = components.reduce((a, b) => a + b, 0);
      const score = round(sum / 4, 2);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No lung injury (0)',
          interpretation: 'Murray LIS 0: no lung injury by this score.',
        },
        {
          max: 2.5,
          level: 'moderate',
          label: 'Mild–moderate lung injury (0.1–2.5)',
          interpretation: `Murray LIS ${score}: mild to moderate acute lung injury range.`,
        },
        {
          max: 4,
          level: 'critical',
          label: 'Severe lung injury (>2.5)',
          interpretation: `Murray LIS ${score}: severe lung injury / ARDS-range. Lung-protective ventilation and ARDS care bundle.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Component sum', value: String(sum) },
          { label: 'Components scored', value: '4 (average)' },
          { label: 'CXR / PF / PEEP / Crs', value: components.join(' / ') },
        ],
      };
    },
    evidence: {
      summary: 'Murray Lung Injury Score averages radiographic, oxygenation, PEEP, and compliance points (0–4 each).',
      formula: 'LIS = (CXR + hypoxemia + PEEP + compliance points) / 4',
      validation: 'Historical ARDS research tool; Berlin definition is preferred for ARDS diagnosis today.',
      references: [
        {
          title: 'An expanded definition of the adult respiratory distress syndrome',
          citation: 'Murray JF et al. Am Rev Respir Dis. 1988',
          year: 1988, pmid: '3202424',
          doi: '10.1164/ajrccm/138.3.720', },
      ],
    },
    nextSteps: [
      { condition: 'LIS > 2.5', actions: ['Lung-protective ventilation', 'Consider prone positioning if severe hypoxemia', 'Fluid-conservative strategy when shock resolved'] },
      { condition: 'LIS 0.1–2.5', actions: ['Optimize PEEP/FiO₂', 'Treat underlying cause', 'Serial scoring'] },
    ],
  },
  {
    id: 'oxygenation-index',
    name: 'Oxygenation Index (OI)',
    shortName: 'OI',
    description: 'OI = (FiO₂ × mean airway pressure × 100) / PaO₂ — severity of hypoxemic respiratory failure on ventilator.',
    category: 'critical-care',
    tags: ['oi', 'ards', 'ecmo', 'ventilation', 'hypoxemia'],
    whenToUse: 'Mechanically ventilated patients when grading oxygenation failure (neonatal and adult critical care).',
    whyUse: 'Integrates FiO₂ and mean airway pressure with PaO₂; used in ECMO candidacy discussions (context-specific cutoffs).',
    inputs: [
      numberInput('fio2', 'FiO₂', { unit: 'fraction 0–1', min: 0.21, max: 1, step: 0.01, defaultValue: 0.6, helpText: 'e.g. 0.60 for 60%' }),
      numberInput('map', 'Mean airway pressure (MAP)', { unit: 'cm H₂O', min: 0, max: 50, step: 0.5, defaultValue: 15 }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, step: 1, defaultValue: 60 }),
    ],
    calculate(values) {
      const fio2 = num(values.fio2, 0.6);
      const map = num(values.map, 15);
      const pao2 = num(values.pao2, 60);
      if (pao2 <= 0) {
        return {
          score: '—',
          label: 'Invalid PaO₂',
          interpretation: 'PaO₂ must be > 0 to calculate oxygenation index.',
          riskLevel: 'info',
        };
      }
      const oi = round((fio2 * map * 100) / pao2, 1);
      const r = riskFromThresholds(oi, [
        {
          max: 15,
          level: 'moderate',
          label: 'Mild–moderate impairment',
          interpretation: `OI ${oi}: lower range of ventilator oxygenation impairment. Optimize lung-protective settings.`,
        },
        {
          max: 25,
          level: 'high',
          label: 'Significant impairment',
          interpretation: `OI ${oi}: significant hypoxemic failure. Escalate ARDS therapies as indicated.`,
        },
        {
          max: 39,
          level: 'high',
          label: 'Severe impairment',
          interpretation: `OI ${oi}: severe oxygenation failure. Consider rescue therapies (prone, NM blockade, advanced PEEP strategy).`,
        },
        {
          max: 999,
          level: 'critical',
          label: 'Very severe (OI ≥40 often cited in ECMO pathways)',
          interpretation: `OI ${oi}: very severe. In many neonatal/pediatric pathways OI ≥40 prompts ECMO consideration; adult thresholds vary (e.g., EOLIA-style criteria).`,
        },
      ]);
      return {
        score: oi,
        unit: 'OI',
        ...r,
        details: [
          { label: 'Formula', value: '(FiO₂ × MAP × 100) / PaO₂' },
          { label: 'Inputs', value: `FiO₂ ${fio2}, MAP ${map}, PaO₂ ${pao2}` },
        ],
      };
    },
    evidence: {
      summary: 'Oxygenation index incorporates mean airway pressure, linking ventilator intensity to arterial oxygenation.',
      formula: 'OI = (FiO₂ × mean airway pressure × 100) / PaO₂',
      validation: 'Extensively used in neonatal respiratory failure; adult use is adjunctive to P/F ratio and clinical criteria.',
      references: [
        {
          title: 'Oxygenation index as a predictor of outcome in respiratory failure',
          citation: 'Classic neonatal/pediatric critical care literature; adult ECMO selection variants',
          year: 2000, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482278/' },
      ],
    },
    nextSteps: [
      { condition: 'Rising OI', actions: ['Reassess ventilator strategy', 'Treat reversible hypoxemia causes', 'Specialty ECMO consult per local criteria'] },
    ],
    pearls: ['Enter FiO₂ as a fraction (0.21–1.0), not percent.', 'OI and OSI (SpO₂-based) are related but not identical.'],
  },
  {
    id: 'bohr-dead-space',
    name: 'Bohr Dead Space Fraction (VD/VT)',
    shortName: 'VD/VT',
    description: 'Physiologic dead space fraction: VD/VT = (PaCO₂ − PECO₂) / PaCO₂.',
    category: 'pulmonary',
    tags: ['dead space', 'bohr', 'vd/vt', 'ventilation', 'pe'],
    whenToUse: 'When mixed-expired CO₂ (or equivalent) and arterial PCO₂ are available to estimate dead space.',
    whyUse: 'Elevated VD/VT indicates wasted ventilation (PE, COPD, low output, over-ventilation of dead space).',
    inputs: [
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 120, step: 0.1, defaultValue: 40 }),
      numberInput('peco2', 'PECO₂ (mixed expired PCO₂)', {
        unit: 'mmHg',
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 28,
        helpText: 'Mixed expired CO₂ partial pressure; not end-tidal alone unless using Enghoff assumptions carefully',
      }),
    ],
    calculate(values) {
      const paco2 = num(values.paco2, 40);
      const peco2 = num(values.peco2, 28);
      if (paco2 <= 0) {
        return {
          score: '—',
          label: 'Invalid PaCO₂',
          interpretation: 'PaCO₂ must be > 0.',
          riskLevel: 'info',
        };
      }
      const vdvt = (paco2 - peco2) / paco2;
      const pct = round(vdvt * 100, 1);
      const ratio = round(vdvt, 3);
      if (vdvt < 0) {
        return {
          score: ratio,
          label: 'Check inputs',
          interpretation: 'PECO₂ exceeds PaCO₂ — physiologically unexpected for classic Bohr; verify sample quality and units.',
          riskLevel: 'info',
        };
      }
      const r = riskFromThresholds(vdvt, [
        {
          max: 0.35,
          level: 'normal',
          label: 'Normal / near-normal',
          interpretation: `VD/VT ${ratio} (~${pct}%). Typical resting range ~0.20–0.35.`,
        },
        {
          max: 0.5,
          level: 'moderate',
          label: 'Moderately elevated',
          interpretation: `VD/VT ${ratio} (~${pct}%). Increased wasted ventilation — consider PE, COPD/emphysema, low cardiac output, or high alveolar dead space.`,
        },
        {
          max: 1,
          level: 'high',
          label: 'Markedly elevated',
          interpretation: `VD/VT ${ratio} (~${pct}%). Marked dead-space ventilation; often seen in severe PE, ARDS with high V/Q mismatch, or profound low-flow states.`,
        },
      ]);
      return {
        score: ratio,
        unit: 'fraction',
        ...r,
        details: [
          { label: 'VD/VT %', value: `${pct}%` },
          { label: 'PaCO₂ − PECO₂', value: `${round(paco2 - peco2, 1)} mmHg` },
        ],
      };
    },
    evidence: {
      summary: 'Bohr equation estimates physiologic dead space using arterial and mixed-expired CO₂.',
      formula: 'VD/VT = (PaCO₂ − PECO₂) / PaCO₂',
      validation: 'Physiologic standard; Enghoff modification substitutes PaCO₂ for ideal alveolar PCO₂ when using arterial blood gas.',
      references: [
        {
          title: 'Bohr dead space equation (historical physiology)',
          citation: 'Bohr C. classic respiratory gas exchange / dead space physiology',
          year: 1891, url: 'https://www.ncbi.nlm.nih.gov/books/NBK541021/' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated VD/VT', actions: ['Correlate with imaging (PE, emphysema)', 'Optimize hemodynamics and ventilator settings', 'Avoid excessive minute ventilation without addressing cause'] },
    ],
    pearls: ['End-tidal CO₂ is not identical to mixed-expired CO₂.', 'VD/VT rises with age and positive-pressure ventilation.'],
  },
  {
    id: 'expected-pao2',
    name: 'Age-Expected PaO₂ (Room Air)',
    shortName: 'Expected PaO₂',
    description: 'Approximate expected arterial PaO₂ on room air by age: ~100 − 0.3 × age (mmHg).',
    category: 'pulmonary',
    tags: ['pao2', 'abg', 'hypoxemia', 'age', 'room air'],
    whenToUse: 'Interpreting room-air ABG oxygenation relative to age-expected normal.',
    whyUse: 'PaO₂ declines with age; absolute cutoffs misclassify older adults without age adjustment.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, step: 1, defaultValue: 60 }),
      numberInput('pao2', 'Measured PaO₂ (optional)', {
        unit: 'mmHg',
        min: 20,
        max: 120,
        step: 1,
        defaultValue: 80,
        helpText: 'Leave interpretation comparative; room air assumed',
        required: false,
      }),
      numberInput('fio2', 'FiO₂', {
        unit: 'fraction',
        min: 0.21,
        max: 1,
        step: 0.01,
        defaultValue: 0.21,
        helpText: 'Age formula applies to room air (~0.21)',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const pao2Provided = !isMissingValue(values.pao2, true);
      const measured = num(values.pao2, 0);
      const fio2 = num(values.fio2, 0.21);
      const expected = round(100 - 0.3 * age, 1);
      const delta = round(measured - expected, 1);
      const onRoomAir = fio2 <= 0.22;
      let interpretation = pao2Provided
        ? `Age-expected PaO₂ ≈ ${expected} mmHg using 100 − 0.3×age. Measured ${measured} mmHg (${delta >= 0 ? '+' : ''}${delta} vs expected).`
        : `Age-expected PaO₂ ≈ ${expected} mmHg using 100 − 0.3×age. No measured PaO₂ entered, so no comparison was made.`;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' | 'normal' = 'normal';
      let label = 'Within expected range';
      if (!pao2Provided) {
        label = 'Age-expected PaO₂ only';
        riskLevel = 'info';
        interpretation += onRoomAir
          ? ' Enter a measured PaO₂ (room air) to judge oxygenation against this expected value.'
          : ' Note: the age formula assumes room air; on supplemental O₂ use the A–a gradient with the actual FiO₂.';
      } else if (!onRoomAir) {
        label = 'Expected value is for room air';
        riskLevel = 'info';
        interpretation += ' Note: simple age formula assumes room air; measured value on supplemental O₂ cannot be judged by this expected number alone.';
      } else if (measured < expected - 15) {
        label = 'Below age-expected';
        riskLevel = 'high';
        interpretation += ' Substantially lower than age-expected — evaluate for gas-exchange abnormality.';
      } else if (measured < expected - 5) {
        label = 'Mildly reduced vs expected';
        riskLevel = 'moderate';
        interpretation += ' Mildly below expected for age; correlate clinically.';
      } else {
        interpretation += ' Consistent with age-expected oxygenation (rule of thumb).';
      }
      return {
        score: expected,
        unit: 'mmHg expected',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Measured PaO₂', value: pao2Provided ? `${measured} mmHg` : 'Not entered' },
          { label: 'Δ (measured − expected)', value: pao2Provided ? `${delta} mmHg` : 'Not calculated' },
          { label: 'Formula', value: '100 − 0.3 × age' },
        ],
      };
    },
    evidence: {
      summary: 'Arterial PaO₂ falls roughly 0.3 mmHg per year of age; 100 − 0.3×age is a common bedside approximation on room air.',
      formula: 'Expected PaO₂ ≈ 100 − 0.3 × age (room air)',
      validation: 'Rule of thumb; alternate regressions exist (e.g., 104.2 − 0.27×age). Not a substitute for A-a gradient when precise assessment is needed.',
      references: [
        {
          title: 'Age-related decline in arterial oxygen tension (teaching approximation)',
          citation: 'Classic pulmonary physiology teaching approximations for expected PaO2 with age',
          year: 1970, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482430/' },
      ],
    },
    nextSteps: [
      { condition: 'PaO₂ much below expected on room air', actions: ['Calculate A-a gradient', 'Evaluate for V/Q mismatch, shunt, hypoventilation', 'Consider imaging and ABG full panel'] },
    ],
    pearls: ['Always specify FiO₂ when reporting PaO₂.', 'Smoking and altitude also shift expected values.'],
  },
  {
    id: 'improve-vte',
    name: 'IMPROVE VTE Risk Score',
    shortName: 'IMPROVE VTE',
    description: 'VTE risk prediction for hospitalized medical patients (IMPROVE model).',
    category: 'hematology',
    tags: ['vte', 'prophylaxis', 'improve', 'medical inpatient', 'thrombosis'],
    whenToUse: 'Acutely ill medical inpatients when assessing need for pharmacologic VTE prophylaxis.',
    whyUse: 'Validated score identifying elevated VTE risk; often paired with IMPROVE bleed for net benefit.',
    inputs: [
      yesNo('priorVte', 'Previous VTE (+3)', 3),
      yesNo('thrombophilia', 'Known thrombophilia (+2)', 2),
      yesNo('paralysis', 'Lower-limb paralysis (+2)', 2),
      yesNo('cancer', 'Active / current cancer (+2)', 2),
      yesNo('immobile', 'Immobilized ≥ 7 days (+1)', 1),
      yesNo('icu', 'ICU / CCU stay (+1)', 1),
      yesNo('age60', 'Age > 60 years (+1)', 1),
    ],
    calculate(values) {
      const pts: [string, number][] = [
        ['priorVte', 3],
        ['thrombophilia', 2],
        ['paralysis', 2],
        ['cancer', 2],
        ['immobile', 1],
        ['icu', 1],
        ['age60', 1],
      ];
      const score = pts.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low VTE risk (0–1)',
          interpretation: `IMPROVE VTE ${score}: lower predicted hospital-associated VTE risk. Consider risk of bleeding and mobility; prophylaxis individualized.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Moderate risk (2–3)',
          interpretation: `IMPROVE VTE ${score}: intermediate risk. Pharmacologic prophylaxis often favored if bleed risk acceptable.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'High risk (≥4)',
          interpretation: `IMPROVE VTE ${score}: elevated VTE risk. Strong consideration for pharmacologic prophylaxis unless contraindicated; mechanical methods if bleeding risk high.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Max score', value: '12' },
          { label: 'Common high-risk cut point', value: '≥4' },
        ],
        recommendations:
          score >= 4
            ? ['Pharmacologic VTE prophylaxis if no contraindication', 'Assess IMPROVE bleed / contraindications', 'Early mobilization']
            : ['Individualize prophylaxis', 'Reassess if clinical status changes'],
      };
    },
    evidence: {
      summary: 'IMPROVE VTE risk score uses 7 factors to estimate thrombosis risk in medical inpatients.',
      formula: 'Prior VTE 3 + thrombophilia 2 + paralysis 2 + cancer 2 + immobility≥7d 1 + ICU 1 + age>60 1',
      validation: 'Derived from IMPROVE registry; externally validated for hospital-associated VTE.',
      references: [
        {
          title: 'Predictive and associative models to identify hospitalized medical patients at risk for VTE',
          citation: 'Spyropoulos AC et al. Chest. 2011',
          year: 2011, pmid: '21436241',
          doi: '10.1378/chest.10-1944', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['LMWH/UFH prophylaxis unless bleeding risk high', 'Mechanical prophylaxis if anticoag contraindicated'] },
      { condition: 'Score 0–1', actions: ['Emphasize mobilization', 'Avoid unnecessary prophylaxis if low risk'] },
    ],
  },
  {
    id: 'original-geneva',
    name: 'Original Geneva Score (PE)',
    shortName: 'Geneva (orig.)',
    description: 'Original Geneva clinical probability score for pulmonary embolism (includes ABG and CXR items).',
    category: 'pulmonary',
    tags: ['pe', 'vte', 'geneva', 'probability', 'embolism'],
    whenToUse: 'Suspected PE when original Geneva variables (including gases/CXR) are available.',
    whyUse: 'Predecessor to revised Geneva; still educationally useful. Revised Geneva is more practical at bedside without ABG.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '< 60 (0)', value: 0 },
        { label: '60–79 (+1)', value: 1 },
        { label: '≥ 80 (+2)', value: 2 },
      ]),
      yesNo('priorVte', 'Previous DVT or PE (+2)', 2),
      yesNo('surgery', 'Recent surgery (within 4 weeks) (+3)', 3),
      yesNo('hr', 'Heart rate > 100 (+1)', 1),
      selectInput('paco2', 'PaCO₂ (mmHg)', [
        { label: '≥ 39 (0)', value: 0 },
        { label: '36–38.9 (+1)', value: 1 },
        { label: '< 36 (+2)', value: 2 },
      ]),
      selectInput('pao2', 'PaO₂ (mmHg)', [
        { label: '≥ 82 (0)', value: 0 },
        { label: '72–81.9 (+1)', value: 1 },
        { label: '60–71.9 (+2)', value: 2 },
        { label: '49–59.9 (+3)', value: 3 },
        { label: '< 49 (+4)', value: 4 },
      ]),
      yesNo('atelectasis', 'Plate-like atelectasis on CXR (+1)', 1),
      yesNo('diaphragm', 'Elevation of hemidiaphragm on CXR (+1)', 1),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        (bool(values.priorVte) ? 2 : 0) +
        (bool(values.surgery) ? 3 : 0) +
        (bool(values.hr) ? 1 : 0) +
        num(values.paco2) +
        num(values.pao2) +
        (bool(values.atelectasis) ? 1 : 0) +
        (bool(values.diaphragm) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low probability (0–4)',
          interpretation: `Original Geneva ${score}: low clinical probability of PE. Consider D-dimer pathway if appropriate.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Intermediate (5–8)',
          interpretation: `Original Geneva ${score}: intermediate probability. Usually proceed to imaging (or D-dimer per local algorithm).`,
        },
        {
          max: 16,
          level: 'high',
          label: 'High probability (≥9)',
          interpretation: `Original Geneva ${score}: high clinical probability of PE. Proceed to definitive imaging; consider empiric therapy if delay and low bleed risk.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Probability bands', value: 'Low 0–4; intermediate 5–8; high ≥9' }],
      };
    },
    evidence: {
      summary: 'Original Geneva score combines demographics, history, vital signs, ABG, and CXR findings for PE probability.',
      formula: 'Age + prior VTE + surgery + HR>100 + PaCO₂ + PaO₂ + atelectasis + hemidiaphragm elevation',
      validation: 'Validated historically; largely superseded in practice by revised Geneva and Wells scores.',
      references: [
        {
          title: 'Prediction of pulmonary embolism in the emergency department: the original Geneva score',
          citation: 'Wicki J et al. Ann Intern Med. 2001',
          year: 2001, pmid: '11146703',
          doi: '10.1001/archinte.161.1.92', },
      ],
    },
    nextSteps: [
      { condition: 'Low probability', actions: ['High-sensitivity D-dimer', 'If negative, PE unlikely'] },
      { condition: 'High probability', actions: ['CTPA or V/Q as appropriate', 'Do not rely on D-dimer alone'] },
    ],
    pearls: ['Revised Geneva removes ABG/CXR dependency for easier ED use.', 'Always integrate pre-test probability with diagnostic test choice.'],
  },
  {
    id: 'charlson-comorbidity',
    name: 'Charlson Comorbidity Index (CCI)',
    shortName: 'Charlson',
    description: 'Weighted comorbidity index predicting long-term mortality; optional age adjustment.',
    category: 'geriatrics',
    tags: ['comorbidity', 'charlson', 'prognosis', 'mortality'],
    whenToUse: 'Risk adjustment, prognosis discussions, research, and frailty/comorbidity burden estimates.',
    whyUse: 'Most widely used comorbidity index; correlates with survival and resource use.',
    inputs: [
      numberInput('age', 'Age (for age-adjusted CCI)', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 65 }),
      yesNo('mi', 'Myocardial infarction (+1)', 1),
      yesNo('chf', 'Congestive heart failure (+1)', 1),
      yesNo('pvd', 'Peripheral vascular disease (+1)', 1),
      yesNo('cva', 'CVA or TIA (+1)', 1),
      yesNo('dementia', 'Dementia (+1)', 1),
      yesNo('copd', 'Chronic pulmonary disease (+1)', 1),
      yesNo('ctd', 'Connective tissue disease (+1)', 1),
      yesNo('pud', 'Peptic ulcer disease (+1)', 1),
      yesNo('liverMild', 'Mild liver disease (+1)', 1),
      yesNo('dm', 'Diabetes without end-organ damage (+1)', 1),
      yesNo('dmEnd', 'Diabetes with end-organ damage (+2)', 2),
      yesNo('hemiplegia', 'Hemiplegia (+2)', 2),
      yesNo('ckd', 'Moderate–severe CKD (+2)', 2),
      yesNo('tumor', 'Solid tumor (localized) (+2)', 2),
      yesNo('leukemia', 'Leukemia (+2)', 2),
      yesNo('lymphoma', 'Lymphoma (+2)', 2),
      yesNo('liverSevere', 'Moderate–severe liver disease (+3)', 3),
      yesNo('mets', 'Metastatic solid tumor (+6)', 6),
      yesNo('aids', 'AIDS (+6)', 6),
    ],
    calculate(values) {
      // Mutually exclusive pairs: use higher weight only
      const dmPts = bool(values.dmEnd) ? 2 : bool(values.dm) ? 1 : 0;
      const liverPts = bool(values.liverSevere) ? 3 : bool(values.liverMild) ? 1 : 0;
      const cancerPts = bool(values.mets) ? 6 : bool(values.tumor) ? 2 : 0;

      const single: [string, number][] = [
        ['mi', 1],
        ['chf', 1],
        ['pvd', 1],
        ['cva', 1],
        ['dementia', 1],
        ['copd', 1],
        ['ctd', 1],
        ['pud', 1],
        ['hemiplegia', 2],
        ['ckd', 2],
        ['leukemia', 2],
        ['lymphoma', 2],
        ['aids', 6],
      ];
      let base = single.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      base += dmPts + liverPts + cancerPts;

      const age = num(values.age, 65);
      let agePts = 0;
      if (age >= 50) agePts = Math.min(4, Math.floor((age - 40) / 10));
      // Age bands: 50–59:1, 60–69:2, 70–79:3, ≥80:4
      const ageAdjusted = base + agePts;

      const r = riskFromThresholds(ageAdjusted, [
        {
          max: 1,
          level: 'low',
          label: 'Low comorbidity burden',
          interpretation: `Unadjusted CCI ${base}; age-adjusted ${ageAdjusted}. Lower predicted long-term mortality burden.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Moderate comorbidity',
          interpretation: `Unadjusted CCI ${base}; age-adjusted ${ageAdjusted}. Intermediate comorbidity-associated mortality risk.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'High comorbidity',
          interpretation: `Unadjusted CCI ${base}; age-adjusted ${ageAdjusted}. Substantial comorbidity burden; impacts prognosis and treatment tolerance.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very high comorbidity',
          interpretation: `Unadjusted CCI ${base}; age-adjusted ${ageAdjusted}. Very high weighted comorbidity — markedly reduced long-term survival in classic cohorts.`,
        },
      ]);
      return {
        score: ageAdjusted,
        ...r,
        details: [
          { label: 'Unadjusted CCI', value: String(base) },
          { label: 'Age points', value: String(agePts) },
          { label: 'Age-adjusted CCI', value: String(ageAdjusted) },
        ],
      };
    },
    evidence: {
      summary: 'Charlson index weights 17 comorbidity categories; age adjustment adds 1 point per decade after 40 starting at 50.',
      formula: 'Sum of weighted conditions (+ age points for age-adjusted CCI)',
      validation: 'Extensively validated for mortality prediction across populations; coding adaptations (ICD) vary.',
      references: [
        {
          title: 'A new method of classifying prognostic comorbidity in longitudinal studies: development and validation',
          citation: 'Charlson ME et al. J Chronic Dis. 1987',
          year: 1987, pmid: '3558716',
          doi: '10.1016/0021-9681(87)90171-8', },
      ],
    },
    nextSteps: [
      { condition: 'High CCI', actions: ['Incorporate into goals-of-care discussions', 'Adjust treatment intensity expectations', 'Optimize reversible comorbidities'] },
    ],
    pearls: [
      'Diabetes and liver disease: score only the highest applicable tier.',
      'Metastatic solid tumor supersedes localized tumor points.',
    ],
  },
  {
    id: 'saps-ii-simp',
    name: 'SAPS II (Simplified Educational)',
    shortName: 'SAPS II≈',
    description: 'Educational simplification of SAPS II major components for ICU severity estimation.',
    category: 'critical-care',
    tags: ['saps', 'icu', 'severity', 'mortality', 'educational'],
    whenToUse: 'Teaching/approximate ICU severity when full SAPS II calculator is unavailable.',
    whyUse: 'SAPS II is a classic admission severity score; this version captures major drivers only.',
    inputs: [
      selectInput('age', 'Age points', [
        { label: '< 40 (0)', value: 0 },
        { label: '40–59 (7)', value: 7 },
        { label: '60–69 (12)', value: 12 },
        { label: '70–74 (15)', value: 15 },
        { label: '75–79 (16)', value: 16 },
        { label: '≥ 80 (18)', value: 18 },
      ]),
      selectInput('hr', 'Heart rate', [
        { label: '70–119 (0)', value: 0 },
        { label: '40–69 or 120–159 (2–4 ≈3)', value: 3 },
        { label: '≥ 160 or < 40 (4–11 ≈7)', value: 7 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '100–199 (0)', value: 0 },
        { label: '≥ 200 (2)', value: 2 },
        { label: '70–99 (5)', value: 5 },
        { label: '< 70 (13)', value: 13 },
      ]),
      selectInput('temp', 'Temperature', [
        { label: '< 39°C (0)', value: 0 },
        { label: '≥ 39°C (3)', value: 3 },
      ]),
      selectInput('gcs', 'GCS points (SAPS weighting)', [
        { label: '14–15 (0)', value: 0 },
        { label: '11–13 (5)', value: 5 },
        { label: '9–10 (7)', value: 7 },
        { label: '6–8 (13)', value: 13 },
        { label: '< 6 (26)', value: 26 },
      ]),
      selectInput('pao2fio2', 'PaO₂/FiO₂ if ventilated', [
        { label: 'Not ventilated (0)', value: 0 },
        { label: '≥ 200 (6)', value: 6 },
        { label: '100–199 (9)', value: 9 },
        { label: '< 100 (11)', value: 11 },
      ]),
      selectInput('bun', 'BUN / urea', [
        { label: 'BUN < 28 mg/dL (0)', value: 0 },
        { label: 'BUN 28–83 (6)', value: 6 },
        { label: 'BUN ≥ 84 (10)', value: 10 },
      ]),
      selectInput('wbc', 'WBC', [
        { label: '1–19.9 ×10³ (0)', value: 0 },
        { label: '≥ 20 (3)', value: 3 },
        { label: '< 1 (12)', value: 12 },
      ]),
      selectInput('k', 'Potassium', [
        { label: '3.0–4.9 (0)', value: 0 },
        { label: '± mild derangement (≈3)', value: 3 },
        { label: '< 3.0 or ≥ 5.0 severe band (≈3–5)', value: 5 },
      ]),
      selectInput('na', 'Sodium', [
        { label: '125–144 (0)', value: 0 },
        { label: '≥ 145 (1)', value: 1 },
        { label: '< 125 (5)', value: 5 },
      ]),
      selectInput('hco3', 'HCO₃', [
        { label: '≥ 20 (0)', value: 0 },
        { label: '15–19 (3)', value: 3 },
        { label: '< 15 (6)', value: 6 },
      ]),
      selectInput('bili', 'Bilirubin', [
        { label: '< 4.0 mg/dL (0)', value: 0 },
        { label: '4.0–5.9 (4)', value: 4 },
        { label: '≥ 6.0 (9)', value: 9 },
      ]),
      selectInput('chronic', 'Chronic disease', [
        { label: 'None (0)', value: 0 },
        { label: 'Metastatic cancer (9)', value: 9 },
        { label: 'Hematologic malignancy (10)', value: 10 },
        { label: 'AIDS (17)', value: 17 },
      ]),
      selectInput('admit', 'Type of admission', [
        { label: 'Scheduled surgical (0)', value: 0 },
        { label: 'Medical (6)', value: 6 },
        { label: 'Unscheduled surgical (8)', value: 8 },
      ]),
    ],
    calculate(values) {
      const keys = [
        'age',
        'hr',
        'sbp',
        'temp',
        'gcs',
        'pao2fio2',
        'bun',
        'wbc',
        'k',
        'na',
        'hco3',
        'bili',
        'chronic',
        'admit',
      ];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      // Educational logit approximation only — not full published equation precision
      const logit = -7.7631 + 0.0737 * score + 0.9971 * Math.log(score + 1);
      const prob = round((Math.exp(logit) / (1 + Math.exp(logit))) * 100, 1);
      const r = riskFromThresholds(score, [
        {
          max: 29,
          level: 'low',
          label: 'Lower severity',
          interpretation: `Educational SAPS II≈ ${score}. Approximate hospital mortality ~${prob}% (rough logit estimate — not for formal benchmarking).`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Moderate severity',
          interpretation: `Educational SAPS II≈ ${score}. Approximate mortality ~${prob}%. Full SAPS II preferred for research/benchmarking.`,
        },
        {
          max: 52,
          level: 'high',
          label: 'High severity',
          interpretation: `Educational SAPS II≈ ${score}. Approximate mortality ~${prob}%. High illness burden.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high severity',
          interpretation: `Educational SAPS II≈ ${score}. Approximate mortality ~${prob}%. Critical illness; confirm with full SAPS II if needed.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Approx. mortality (educational)', value: `${prob}%` },
          { label: 'Note', value: 'Simplified inputs — not a full SAPS II implementation' },
        ],
      };
    },
    evidence: {
      summary: 'SAPS II predicts hospital mortality from ICU admission physiology, age, chronic disease, and admission type.',
      formula: 'Weighted points → logistic equation (educational approximation here)',
      validation: 'Original SAPS II widely validated; this app version uses coarse bands for teaching only.',
      references: [
        {
          title: 'A new Simplified Acute Physiology Score (SAPS II) based on a European/North American multicenter study',
          citation: 'Le Gall JR et al. JAMA. 1993',
          year: 1993,
          pmid: '8254858',
          doi: '10.1001/jama.270.24.2957',
        },
      ],
    },
    nextSteps: [
      { condition: 'High score', actions: ['ICU-level care', 'Use formal SAPS II/APACHE software for benchmarking', 'Reassess goals of care'] },
    ],
    pearls: ['Do not use this simplified tool for official quality reporting.', 'Worst values in first 24 h are used in full SAPS II.'],
  },
  {
    id: 'lods',
    name: 'LODS Score (Simplified)',
    shortName: 'LODS',
    description: 'Logistic Organ Dysfunction System — simplified multi-organ points for ICU organ failure.',
    category: 'critical-care',
    tags: ['lods', 'organ failure', 'icu', 'severity'],
    whenToUse: 'ICU patients for educational multi-organ dysfunction scoring.',
    whyUse: 'LODS estimates mortality from neurologic, CV, renal, pulmonary, hematologic, and hepatic dysfunction.',
    inputs: [
      selectInput('neuro', 'Neurologic (GCS)', [
        { label: '14–15 (0)', value: 0 },
        { label: '9–13 (1)', value: 1 },
        { label: '6–8 (3)', value: 3 },
        { label: '3–5 (5)', value: 5 },
      ]),
      selectInput('cv', 'Cardiovascular (HR and SBP bands)', [
        { label: 'Normal range (0)', value: 0 },
        { label: 'Mild derangement (1)', value: 1 },
        { label: 'Moderate (3)', value: 3 },
        { label: 'Severe shock-range (5)', value: 5 },
      ]),
      selectInput('renal', 'Renal (urea/Cr/UOP composite)', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (3)', value: 3 },
        { label: 'Severe (5)', value: 5 },
      ]),
      selectInput('pulm', 'Pulmonary (PaO₂/FiO₂ or ventilation)', [
        { label: 'No significant dysfunction (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (3)', value: 3 },
        { label: 'Severe (5)', value: 5 },
      ]),
      selectInput('heme', 'Hematologic (WBC / platelets)', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (3)', value: 3 },
        { label: 'Severe (5)', value: 5 },
      ]),
      selectInput('hepatic', 'Hepatic (bilirubin / PT)', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (3)', value: 3 },
        { label: 'Severe (5)', value: 5 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.neuro) +
        num(values.cv) +
        num(values.renal) +
        num(values.pulm) +
        num(values.heme) +
        num(values.hepatic);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Minimal organ dysfunction',
          interpretation: `LODS≈ ${score}: minimal logistic organ dysfunction burden.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate dysfunction',
          interpretation: `LODS≈ ${score}: moderate multi-organ dysfunction; rising mortality risk.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'High dysfunction',
          interpretation: `LODS≈ ${score}: substantial organ failure burden.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Very high dysfunction',
          interpretation: `LODS≈ ${score}: severe multi-organ dysfunction; high predicted mortality in original LODS models.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Systems', value: 'Neuro, CV, renal, pulmonary, heme, hepatic' },
          { label: 'Note', value: 'Simplified bands — full LODS uses detailed variable cut-points' },
        ],
      };
    },
    evidence: {
      summary: 'LODS assigns points for six organ systems and converts the total to a mortality probability via logistic equation.',
      formula: 'Sum of organ system points (simplified categorical inputs here)',
      validation: 'Original LODS validated in ICU populations; use full variable definitions for research.',
      references: [
        {
          title: 'The Logistic Organ Dysfunction system',
          citation: 'Le Gall JR et al. JAMA. 1996',
          year: 1996, pmid: '8769590',
          doi: '10.1001/jama.276.10.802', },
      ],
    },
    nextSteps: [
      { condition: 'Rising LODS', actions: ['Support failing organs', 'Source control / treat underlying disease', 'Serial scoring'] },
    ],
  },
  {
    id: 'mod-score',
    name: 'Multiple Organ Dysfunction Score (Marshall)',
    shortName: 'MODS',
    description: 'Marshall MODS: six organ systems scored 0–4 (respiratory, renal, hepatic, CV, hematologic, neurologic).',
    category: 'critical-care',
    tags: ['mods', 'marshall', 'organ failure', 'icu'],
    whenToUse: 'ICU patients to quantify multi-organ dysfunction severity over time.',
    whyUse: 'Simple daily score correlating with ICU mortality; useful for serial tracking.',
    inputs: [
      selectInput('resp', 'Respiratory (PaO₂/FiO₂)', [
        { label: '> 300 (0)', value: 0 },
        { label: '226–300 (1)', value: 1 },
        { label: '151–225 (2)', value: 2 },
        { label: '76–150 (3)', value: 3 },
        { label: '≤ 75 (4)', value: 4 },
      ]),
      selectInput('renal', 'Renal (creatinine mg/dL)', [
        { label: '≤ 1.1 (0)', value: 0 },
        { label: '1.2–2.2 (1)', value: 1 },
        { label: '2.3–3.9 (2)', value: 2 },
        { label: '4.0–5.6 (3)', value: 3 },
        { label: '≥ 5.7 (4)', value: 4 },
      ]),
      selectInput('hepatic', 'Hepatic (bilirubin mg/dL)', [
        { label: '≤ 1.2 (0)', value: 0 },
        { label: '1.3–3.5 (1)', value: 1 },
        { label: '3.6–7.0 (2)', value: 2 },
        { label: '7.1–14.0 (3)', value: 3 },
        { label: '> 14.0 (4)', value: 4 },
      ]),
      selectInput('cv', 'Cardiovascular (pressure-adjusted HR approx.)', [
        { label: 'PAR ≤ 10 / stable (0)', value: 0 },
        { label: 'PAR 10.1–15 (1)', value: 1 },
        { label: 'PAR 15.1–20 (2)', value: 2 },
        { label: 'PAR 20.1–30 (3)', value: 3 },
        { label: 'PAR > 30 / high-dose pressors (4)', value: 4 },
      ], undefined, 'PAR = HR × CVP / MAP; if CVP unknown, approximate by shock severity / vasopressor need'),
      selectInput('heme', 'Hematologic (platelets ×10³/µL)', [
        { label: '> 120 (0)', value: 0 },
        { label: '81–120 (1)', value: 1 },
        { label: '51–80 (2)', value: 2 },
        { label: '21–50 (3)', value: 3 },
        { label: '≤ 20 (4)', value: 4 },
      ]),
      selectInput('neuro', 'Neurologic (GCS)', [
        { label: '15 (0)', value: 0 },
        { label: '13–14 (1)', value: 1 },
        { label: '10–12 (2)', value: 2 },
        { label: '7–9 (3)', value: 3 },
        { label: '≤ 6 (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.resp) +
        num(values.renal) +
        num(values.hepatic) +
        num(values.cv) +
        num(values.heme) +
        num(values.neuro);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low MODS (0–4)',
          interpretation: `MODS ${score}: lower multi-organ dysfunction; ICU mortality relatively lower in original descriptions.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Moderate (5–8)',
          interpretation: `MODS ${score}: moderate organ dysfunction burden.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'High (9–12)',
          interpretation: `MODS ${score}: high organ failure burden with substantially increased mortality risk.`,
        },
        {
          max: 24,
          level: 'critical',
          label: 'Very high (13–24)',
          interpretation: `MODS ${score}: very severe multi-organ dysfunction; mortality often very high.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Max score', value: '24 (6 systems × 4)' }],
      };
    },
    evidence: {
      summary: 'Marshall Multiple Organ Dysfunction Score grades six systems 0–4; total correlates with ICU mortality.',
      formula: 'Respiratory + renal + hepatic + CV + hematologic + neurologic (each 0–4)',
      validation: 'Widely used serial ICU score; cardiovascular component uses pressure-adjusted heart rate.',
      references: [
        {
          title: 'Multiple organ dysfunction score: a reliable descriptor of a complex clinical outcome',
          citation: 'Marshall JC et al. Crit Care Med. 1995',
          year: 1995, pmid: '7587228',
          doi: '10.1097/00003246-199510000-00007', },
      ],
    },
    nextSteps: [
      { condition: 'MODS rising', actions: ['Identify and reverse drivers of organ failure', 'Supportive ICU care', 'Track daily MODS trajectory'] },
    ],
  },
  {
    id: 'cdi-severity',
    name: 'C. difficile Infection Severity (IDSA-style)',
    shortName: 'CDI Severity',
    description: 'Classifies CDI as non-severe, severe, or fulminant using WBC, creatinine, and clinical instability.',
    category: 'infectious-disease',
    tags: ['cdi', 'c diff', 'clostridioides', 'severity', 'idsa'],
    whenToUse: 'Adults with confirmed or probable C. difficile infection to guide therapy intensity.',
    whyUse: 'Severity drives antibiotic choice and need for surgical/ICU consultation.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 70 }),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0, max: 100, step: 0.1, defaultValue: 12 }),
      numberInput('cr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      yesNo('hypotension', 'Hypotension or shock', 2),
      yesNo('ileus', 'Ileus', 2),
      yesNo('megacolon', 'Toxic megacolon', 2),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const wbc = num(values.wbc, 12);
      const cr = num(values.cr, 1);
      const fulminant =
        bool(values.hypotension) || bool(values.ileus) || bool(values.megacolon);
      const severeLab = wbc >= 15 || cr > 1.5;

      if (fulminant) {
        return {
          score: 3,
          label: 'Fulminant CDI',
          interpretation: 'Hypotension/shock, ileus, or megacolon present. Fulminant CDI — urgent aggressive therapy and surgical consultation.',
          riskLevel: 'critical',
          details: [
            { label: 'WBC', value: `${wbc} ×10³/µL` },
            { label: 'Creatinine', value: `${cr} mg/dL` },
            { label: 'Age', value: `${age} y` },
          ],
          recommendations: [
            'Vancomycin PO + IV metronidazole (per IDSA fulminant guidance)',
            'Rectal vancomycin if ileus',
            'Early surgery consult',
            'ICU care for shock',
          ],
        };
      }
      if (severeLab) {
        return {
          score: 2,
          label: 'Severe CDI',
          interpretation: `WBC ${wbc} and/or Cr ${cr} meet severe thresholds (WBC ≥15,000 and/or Cr >1.5). Use severe-disease therapy.`,
          riskLevel: 'high',
          details: [
            { label: 'WBC ≥15', value: wbc >= 15 ? 'Yes' : 'No' },
            { label: 'Cr >1.5', value: cr > 1.5 ? 'Yes' : 'No' },
            { label: 'Age (context)', value: `${age} y — older age increases risk but is not the IDSA severity definer` },
          ],
          recommendations: ['Fidaxomicin or vancomycin PO per guidelines', 'Stop inciting antibiotics if possible', 'Avoid anti-motility agents'],
        };
      }
      return {
        score: 1,
        label: 'Non-severe CDI',
        interpretation: `WBC ${wbc} (<15) and Cr ${cr} (≤1.5) without fulminant features. Non-severe CDI by IDSA lab criteria.`,
        riskLevel: 'moderate',
        details: [
          { label: 'WBC', value: `${wbc} ×10³/µL` },
          { label: 'Creatinine', value: `${cr} mg/dL` },
        ],
        recommendations: ['Fidaxomicin or vancomycin (metronidazole alternative in limited settings)', 'Infection control precautions', 'Review PPI and antibiotics'],
      };
    },
    evidence: {
      summary: 'IDSA/SHEA severity: non-severe (WBC ≤15k and Cr <1.5), severe (WBC ≥15k or Cr >1.5), fulminant (shock, ileus, megacolon).',
      formula: 'Fulminant if shock/ileus/megacolon; else severe if WBC≥15 or Cr>1.5; else non-severe',
      validation: 'Guideline standard for therapy selection; age and albumin used in some alternate severity scores (e.g., ATLAS).',
      references: [
        {
          title: 'Clinical Practice Guidelines for Clostridium difficile Infection in Adults and Children',
          citation: 'McDonald LC et al. Clin Infect Dis. 2018',
          year: 2018, pmid: '29462280', doi: '10.1093/cid/cix1085' },
      ],
    },
    nextSteps: [
      { condition: 'Fulminant', actions: ['ICU', 'PO vanco + IV metro', 'Surgery consult'] },
      { condition: 'Severe', actions: ['PO vancomycin or fidaxomicin', 'Close monitoring for progression'] },
      { condition: 'Non-severe', actions: ['Fidaxomicin or PO vancomycin', 'Stewardship of concurrent antibiotics'] },
    ],
  },
  {
    id: 'sepsis-3-shock',
    name: 'Sepsis-3 Septic Shock Helper',
    shortName: 'Septic Shock',
    description: 'Checks Sepsis-3 septic shock definition: infection + vasopressors for MAP ≥65 + lactate >2 after fluids.',
    category: 'critical-care',
    tags: ['sepsis', 'septic shock', 'sepsis-3', 'lactate', 'vasopressors'],
    whenToUse: 'Patients with suspected infection and circulatory failure to apply Sepsis-3 septic shock criteria.',
    whyUse: 'Standardizes recognition of septic shock with substantially higher mortality than sepsis alone.',
    inputs: [
      yesNo('infection', 'Suspected or documented infection', 0),
      yesNo('fluids', 'Adequate fluid resuscitation given', 0),
      yesNo('vasopressors', 'Vasopressors required to maintain MAP ≥ 65 mmHg', 0),
      numberInput('lactate', 'Lactate', { unit: 'mmol/L', min: 0, max: 30, step: 0.1, defaultValue: 1.5 }),
      numberInput('map', 'Current MAP (optional context)', { unit: 'mmHg', min: 0, max: 150, step: 1, defaultValue: 65, required: false }),
    ],
    calculate(values) {
      const infection = bool(values.infection);
      const fluids = bool(values.fluids);
      const vasopressors = bool(values.vasopressors);
      const lactate = num(values.lactate, 1.5);
      const mapProvided = !isMissingValue(values.map, true);
      const map = num(values.map, 0);
      const lactateHigh = lactate > 2;

      if (!infection) {
        return {
          score: 0,
          label: 'Infection not identified',
          interpretation: 'Sepsis/septic shock definitions require suspected or documented infection. Reassess source and cultures.',
          riskLevel: 'info',
        };
      }

      const septicShock = infection && vasopressors && lactateHigh && fluids;
      if (septicShock) {
        return {
          score: 1,
          label: 'Meets Sepsis-3 septic shock',
          interpretation: `Infection + vasopressors for MAP≥65 + lactate ${lactate} (>2) after fluids. Septic shock criteria met — high mortality risk; continue hour-1 bundle elements and source control.`,
          riskLevel: 'critical',
          details: [
            { label: 'Lactate', value: `${lactate} mmol/L` },
            { label: 'MAP (context)', value: mapProvided ? `${map} mmHg` : 'Not entered' },
            { label: 'Fluids completed', value: fluids ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Continue vasopressors (norepinephrine first-line typically)',
            'Reassess volume status; consider further hemodynamics',
            'Broad antibiotics if not yet given',
            'Urgent source control',
          ],
        };
      }

      // Partial patterns
      if (vasopressors && lactateHigh && !fluids) {
        return {
          score: 0,
          label: 'Possible septic shock — confirm fluids',
          interpretation: 'Vasopressors and lactate >2 present, but adequate fluid resuscitation not confirmed. Complete resuscitation assessment before labeling septic shock.',
          riskLevel: 'high',
        };
      }
      if (vasopressors && !lactateHigh) {
        return {
          score: 0,
          label: 'Vasopressor-dependent — lactate ≤2',
          interpretation: `On vasopressors but lactate ${lactate} (≤2). Does not meet full Sepsis-3 septic shock definition; still critically ill — treat underlying shock phenotype.`,
          riskLevel: 'high',
        };
      }
      if (!vasopressors && lactateHigh) {
        return {
          score: 0,
          label: 'Hyperlactatemia without vasopressors',
          interpretation: `Lactate ${lactate} >2 without vasopressor requirement for MAP. May represent sepsis with hypoperfusion — reassess fluids, occult shock, and organ dysfunction (SOFA).`,
          riskLevel: 'moderate',
        };
      }
      return {
        score: 0,
        label: 'Septic shock criteria not met',
        interpretation: 'Infection present but does not meet vasopressor + lactate >2 after fluids. Evaluate for sepsis (SOFA Δ≥2) and monitor closely.',
        riskLevel: 'moderate',
        details: [
          { label: 'Vasopressors for MAP≥65', value: vasopressors ? 'Yes' : 'No' },
          { label: 'Lactate >2', value: lactateHigh ? 'Yes' : 'No' },
          { label: 'Fluids', value: fluids ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'Sepsis-3 defines septic shock as subset of sepsis with underlying circulatory/cellular-metabolic abnormalities: vasopressors for MAP≥65 and lactate >2 mmol/L despite adequate volume resuscitation.',
      formula: 'Infection + vasopressors (MAP≥65) + lactate >2 after fluids',
      validation: 'International consensus (Sepsis-3); hospital mortality substantially higher than sepsis without shock.',
      references: [
        {
          title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
          citation: 'Singer M et al. JAMA. 2016',
          year: 2016,
          pmid: '26903338',
          doi: '10.1001/jama.2016.0287',
        },
      ],
    },
    nextSteps: [
      { condition: 'Septic shock criteria met', actions: ['ICU care', 'Norepinephrine', 'Antibiotics and source control', 'Serial lactate'] },
      { condition: 'Sepsis without shock', actions: ['SOFA-based organ dysfunction assessment', 'Cultures and antibiotics', 'Fluid resuscitation as indicated'] },
    ],
    pearls: ['Lactate is not perfectly specific for sepsis.', 'Document timing of fluids, antibiotics, and pressors.'],
  },
  {
    id: 'procalcitonin-guide',
    name: 'Procalcitonin Antibiotic Guidance Bands',
    shortName: 'PCT Guide',
    description: 'PCT-based antibiotic decision bands for suspected bacterial infection (stewardship adjunct).',
    category: 'infectious-disease',
    tags: ['procalcitonin', 'pct', 'antibiotics', 'stewardship'],
    whenToUse: 'Adults with lower respiratory infection or sepsis pathways using PCT algorithms (not a stand-alone diagnosis).',
    whyUse: 'PCT algorithms can safely reduce antibiotic exposure when combined with clinical judgment.',
    inputs: [
      numberInput('pct', 'Procalcitonin', { unit: 'ng/mL', min: 0, max: 200, step: 0.01, defaultValue: 0.25 }),
      selectInput('setting', 'Clinical setting / algorithm', [
        { label: 'Outpatient / ward LRTI (0.1 / 0.25 cutoffs)', value: 'lrti' },
        { label: 'ICU / critically ill (0.5 / 1.0 cutoffs)', value: 'icu' },
      ]),
      yesNo('unstable', 'Hemodynamic instability or severe immunodeficiency (override)', 0),
      yesNo('highSuspicion', 'Very high clinical suspicion for bacterial infection (override)', 0),
    ],
    calculate(values) {
      const pct = num(values.pct, 0.25);
      const setting = String(values.setting ?? 'lrti');
      const override = bool(values.unstable) || bool(values.highSuspicion);

      if (override) {
        return {
          score: pct,
          unit: 'ng/mL',
          label: 'Clinical override — do not withhold antibiotics on PCT alone',
          interpretation: `PCT ${pct} ng/mL, but instability or high suspicion flagged. Treat clinically; PCT is an adjunct only.`,
          riskLevel: 'high',
          recommendations: ['Start/continue empiric antibiotics if indicated', 'Reassess PCT trend at 24–48 h if using discontinuation algorithms'],
        };
      }

      if (setting === 'icu') {
        if (pct < 0.5) {
          return {
            score: pct,
            unit: 'ng/mL',
            label: 'Antibiotics discouraged (ICU algorithm)',
            interpretation: `PCT ${pct} < 0.5 ng/mL in ICU-style algorithm: bacterial infection less likely — consider withholding or stopping if stable and cultures negative, per protocol.`,
            riskLevel: 'low',
          };
        }
        if (pct < 1.0) {
          return {
            score: pct,
            unit: 'ng/mL',
            label: 'Antibiotics encouraged',
            interpretation: `PCT ${pct} in 0.5–1.0 range: bacterial infection possible — antibiotics generally encouraged with clinical correlation.`,
            riskLevel: 'moderate',
          };
        }
        return {
          score: pct,
          unit: 'ng/mL',
          label: 'Antibiotics strongly encouraged',
          interpretation: `PCT ${pct} ≥ 1.0 ng/mL: higher likelihood of bacterial infection/sepsis — antibiotics strongly encouraged unless clear alternative.`,
          riskLevel: 'high',
        };
      }

      // LRTI / general ward bands
      if (pct < 0.1) {
        return {
          score: pct,
          unit: 'ng/mL',
          label: 'Antibiotics strongly discouraged',
          interpretation: `PCT ${pct} < 0.1 ng/mL: bacterial LRTI unlikely. Antibiotics strongly discouraged if clinically stable.`,
          riskLevel: 'low',
        };
      }
      if (pct < 0.25) {
        return {
          score: pct,
          unit: 'ng/mL',
          label: 'Antibiotics discouraged',
          interpretation: `PCT ${pct} (0.1–0.25): bacterial infection less likely. Antibiotics discouraged; recheck if worsening.`,
          riskLevel: 'low',
        };
      }
      if (pct < 0.5) {
        return {
          score: pct,
          unit: 'ng/mL',
          label: 'Antibiotics encouraged',
          interpretation: `PCT ${pct} (0.25–0.5): bacterial infection possible. Antibiotics encouraged with clinical judgment.`,
          riskLevel: 'moderate',
        };
      }
      return {
        score: pct,
        unit: 'ng/mL',
        label: 'Antibiotics strongly encouraged',
        interpretation: `PCT ${pct} ≥ 0.5 ng/mL: higher probability of bacterial infection. Antibiotics strongly encouraged.`,
        riskLevel: 'high',
      };
    },
    evidence: {
      summary: 'Procalcitonin-guided algorithms use cutoff bands to support antibiotic start/stop decisions, especially in LRTI and ICU stewardship trials.',
      formula: 'LRTI: <0.1 strongly off; <0.25 off; ≥0.25 on; ≥0.5 strongly on. ICU often 0.5 / 1.0',
      validation: 'Multiple RCTs (e.g., ProHOSP, SAPS) show reduced antibiotic exposure without increased mortality when protocols are followed.',
      references: [
        {
          title: 'Effect of procalcitonin-based guidelines on antibiotic use in lower respiratory tract infections',
          citation: 'Schuetz P et al. JAMA / related PCT algorithm literature',
          year: 2009, pmid: '19738090',
          doi: '10.1001/jama.2009.1297', },
      ],
    },
    nextSteps: [
      { condition: 'Low PCT + stable', actions: ['Withhold or stop antibiotics', 'Symptomatic care', 'Safety-net recheck'] },
      { condition: 'Elevated PCT or unstable', actions: ['Empiric antibiotics', 'Cultures before abx if no delay', 'Source evaluation'] },
    ],
    pearls: ['False positives: shock, surgery, trauma, malaria, some immunotherapies.', 'False negatives: early infection, localized abscess, atypical pathogens.'],
  },
  {
    id: 'tuberculosis-risk',
    name: 'TST Interpretation by Risk Group',
    shortName: 'TST Cutoffs',
    description: 'Tuberculin skin test (Mantoux) positivity cutoffs by risk group: 5 / 10 / 15 mm.',
    category: 'infectious-disease',
    tags: ['tb', 'tst', 'ppd', 'latent tb', 'mantoux'],
    whenToUse: 'Interpreting TST induration in mm according to CDC risk-stratified cut points.',
    whyUse: 'Prevents under-calling LTBI in high-risk patients and over-calling in low-risk persons.',
    inputs: [
      numberInput('induration', 'TST induration', { unit: 'mm', min: 0, max: 40, step: 1, defaultValue: 8 }),
      selectInput('riskGroup', 'Highest applicable risk group', [
        {
          label: 'High risk — use ≥5 mm cutoff (HIV, recent contact, fibrotic CXR, immunosuppressed, transplant)',
          value: 'high5',
        },
        {
          label: 'Moderate risk — use ≥10 mm cutoff (immigrants, IVDU, congregate settings, lab workers, clinical risks, children <5, etc.)',
          value: 'mod10',
        },
        {
          label: 'Low risk — use ≥15 mm cutoff (no TB risk factors)',
          value: 'low15',
        },
      ]),
      yesNo('bcg', 'Prior BCG vaccination (context)', 0),
      yesNo('igraPrefer', 'IGRA preferred / available in this context', 0),
    ],
    calculate(values) {
      const mm = num(values.induration, 8);
      const group = String(values.riskGroup ?? 'mod10');
      const cutoff = group === 'high5' ? 5 : group === 'low15' ? 15 : 10;
      const positive = mm >= cutoff;
      const bcg = bool(values.bcg);
      const igra = bool(values.igraPrefer);

      let interpretation = `Induration ${mm} mm; cutoff for selected risk group is ≥${cutoff} mm → ${positive ? 'POSITIVE' : 'NEGATIVE'} TST.`;
      if (bcg) {
        interpretation += ' Prior BCG can cause false-positive TST (especially if recent); IGRA may help in BCG-vaccinated persons.';
      }
      if (igra) {
        interpretation += ' IGRA is often preferred for BCG-vaccinated or low-likelihood patients when available.';
      }
      if (!positive && mm >= 5 && cutoff > 5) {
        interpretation += ` Note: ${mm} mm would be positive in the ≥5 mm high-risk group — ensure correct risk stratification.`;
      }

      return {
        score: mm,
        unit: 'mm',
        label: positive ? `Positive TST (≥${cutoff} mm group)` : `Negative TST (<${cutoff} mm group)`,
        interpretation,
        riskLevel: positive ? 'moderate' : 'low',
        details: [
          { label: 'Cutoff used', value: `≥ ${cutoff} mm` },
          { label: 'Risk group code', value: group },
        ],
        recommendations: positive
          ? ['Evaluate for active TB (symptom screen ± CXR)', 'Consider LTBI treatment if active TB excluded', 'Report per public health rules']
          : ['No LTBI by this TST cutoff', 'Retest if ongoing exposure or reclassification of risk'],
      };
    },
    evidence: {
      summary: 'CDC TST cut points: ≥5 mm for highest-risk, ≥10 mm for increased-risk, ≥15 mm for low-risk persons without risk factors.',
      formula: 'Positive if induration ≥ risk-group cutoff (5 / 10 / 15 mm)',
      validation: 'Long-standing public health standard for LTBI testing interpretation.',
      references: [
        {
          title: 'Targeted tuberculin testing and treatment of latent tuberculosis infection',
          citation: 'CDC / ATS guidance on LTBI testing and treatment',
          year: 2000, url: 'https://www.cdc.gov/tb/topic/testing/default.htm' },
      ],
    },
    nextSteps: [
      { condition: 'Positive TST', actions: ['Rule out active TB', 'Offer LTBI therapy if indicated', 'HIV test if status unknown'] },
      { condition: 'Negative but high ongoing risk', actions: ['Consider window-period retesting', 'IGRA if available'] },
    ],
    pearls: ['Measure induration, not erythema, at 48–72 hours.', 'Two-step testing may be needed for serial screening boosters.'],
  },
  {
    id: 'drip-score',
    name: 'DRIP Score (Drug-Resistant Pneumonia)',
    shortName: 'DRIP',
    description: 'Drug Resistance in Pneumonia score estimating risk of resistant pathogens (MRSA/Pseudomonas spectrum).',
    category: 'infectious-disease',
    tags: ['drip', 'pneumonia', 'mrsa', 'pseudomonas', 'resistance', 'hcap'],
    whenToUse: 'Adults with pneumonia when deciding need for extended-spectrum / dual MRSA-Pseudomonas coverage.',
    whyUse: 'Improves on HCAP criteria by weighting major and minor risk factors for drug-resistant pathogens.',
    inputs: [
      yesNo('abx60', 'Antibiotic use within 60 days (major +2)', 2),
      yesNo('ltc', 'Long-term care facility residence (major +2)', 2),
      yesNo('tubeFeed', 'Tube feeding (major +2)', 2),
      yesNo('priorDrp', 'Prior drug-resistant pneumonia — MRSA or Pseudomonas (major +2)', 2),
      yesNo('hosp60', 'Hospitalization within 60 days (minor +1)', 1),
      yesNo('chronicLung', 'Chronic pulmonary disease (minor +1)', 1),
      yesNo('poorFunc', 'Poor functional status (minor +1)', 1),
      yesNo('acidSuppression', 'Gastric acid suppression (minor +1)', 1),
      yesNo('woundCare', 'Wound care (minor +1)', 1),
      yesNo('mrsaCol', 'MRSA colonization (minor +1)', 1),
    ],
    calculate(values) {
      const major: [string, number][] = [
        ['abx60', 2],
        ['ltc', 2],
        ['tubeFeed', 2],
        ['priorDrp', 2],
      ];
      const minor: [string, number][] = [
        ['hosp60', 1],
        ['chronicLung', 1],
        ['poorFunc', 1],
        ['acidSuppression', 1],
        ['woundCare', 1],
        ['mrsaCol', 1],
      ];
      const majorScore = major.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      const minorScore = minor.reduce((s, [k, p]) => s + (bool(values[k]) ? p : 0), 0);
      const score = majorScore + minorScore;
      const highRisk = score >= 4;
      return {
        score,
        label: highRisk ? 'High risk for drug-resistant pathogens (≥4)' : 'Lower risk (<4)',
        interpretation: highRisk
          ? `DRIP ${score}: elevated risk of drug-resistant pathogens. Consider MRSA and/or Pseudomonas coverage based on local ecology and specific factors; obtain cultures.`
          : `DRIP ${score}: lower predicted risk of resistant pathogens. Standard CAP therapy may be appropriate if no other concerns.`,
        riskLevel: highRisk ? 'high' : score >= 2 ? 'moderate' : 'low',
        details: [
          { label: 'Major points', value: String(majorScore) },
          { label: 'Minor points', value: String(minorScore) },
          { label: 'Threshold', value: '≥4 suggests extended-spectrum consideration' },
        ],
        recommendations: highRisk
          ? ['Consider anti-MRSA and/or antipseudomonal agents per IDSA and local antibiogram', 'Blood and respiratory cultures before abx if feasible', 'De-escalate with culture results']
          : ['Standard CAP regimen often sufficient', 'Reassess if deteriorates or new risk factors'],
      };
    },
    evidence: {
      summary: 'DRIP score uses 4 major (2 pts) and 6 minor (1 pt) factors; score ≥4 predicts pneumonia due to drug-resistant pathogens better than HCAP classification in derivation work.',
      formula: 'Major×2 (abx 60d, LTCF, tube feed, prior DRP) + minor×1 (hosp 60d, chronic lung, poor function, acid suppression, wound care, MRSA colonization)',
      validation: 'Derived to reduce overtreatment versus HCAP; validate against local resistance patterns.',
      references: [
        {
          title: 'A clinical prediction rule for drug-resistant pathogens in patients with pneumonia (DRIP)',
          citation: 'Webb BJ et al. Antimicrob Agents Chemother / related DRIP literature',
          year: 2016, pmid: '26856838',
          doi: '10.1128/AAC.03071-15', },
      ],
    },
    nextSteps: [
      { condition: 'DRIP ≥4', actions: ['Risk-factor-targeted broad therapy', 'Cultures and nasal MRSA PCR if used locally', 'Early de-escalation'] },
      { condition: 'DRIP <4', actions: ['CAP-spectrum antibiotics', 'Avoid unnecessary MRSA/Pseudomonas coverage'] },
    ],
    pearls: ['DRIP is not a severity score — pair with CURB-65/PSI/IDSA-ATS for site of care.', 'Local antibiograms should guide empiric choices.'],
  },
];
