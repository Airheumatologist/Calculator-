import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave5PedsIdCalcs: Calculator[] = [
  // ─── 1. Full PEWS (multi-domain) ───────────────────────────────────────────
  {
    id: 'peews-full',
    name: 'Full Pediatric Early Warning Score (Multi-domain)',
    shortName: 'Full PEWS',
    description:
      'Expanded PEWS-style early-warning total with behavior, cardiovascular, respiratory, oxygen, and temperature domains (educational; institutional charts vary).',
    category: 'pediatrics',
    tags: ['pews', 'early warning', 'deterioration', 'pediatric', 'track and trigger'],
    whenToUse: 'Hospitalized children when a fuller multi-domain PEWS-style assessment is preferred over a 3-item simplification.',
    whyUse:
      'Captures more physiologic domains than simplified PEWS variants; still subordinate to local PEWS charts and clinical concern.',
    inputs: [
      selectInput('behavior', 'Behavior / consciousness', [
        { label: 'Playing / appropriate (0)', value: 0 },
        { label: 'Sleeping (1)', value: 1 },
        { label: 'Irritable (2)', value: 2 },
        { label: 'Lethargic / confused / reduced pain response (3)', value: 3 },
      ]),
      selectInput('cv', 'Cardiovascular (color / CRT / HR)', [
        { label: 'Pink, CRT 1–2 s, HR normal (0)', value: 0 },
        { label: 'Pale or CRT 3 s (1)', value: 1 },
        { label: 'Grey or CRT 4 s or HR +20 above normal (2)', value: 2 },
        { label: 'Mottled, CRT ≥5 s, HR +30, or bradycardia (3)', value: 3 },
      ]),
      selectInput('resp', 'Respiratory rate / effort', [
        { label: 'RR normal, no recession (0)', value: 0 },
        { label: 'RR mildly ↑ or mild accessory use (1)', value: 1 },
        { label: 'RR moderately ↑, recession, or grunting (2)', value: 2 },
        { label: 'Severe distress, apnea risk, or RR markedly low with distress (3)', value: 3 },
      ]),
      selectInput('oxygen', 'Oxygen requirement', [
        { label: 'Room air (0)', value: 0 },
        { label: 'Any low-flow O₂ / ≤30% (1)', value: 1 },
        { label: 'Higher O₂ / ~40% or high-flow (2)', value: 2 },
        { label: '≥50% / NIV / invasive ventilation (3)', value: 3 },
      ]),
      selectInput('spo2', 'SpO₂ (on current support)', [
        { label: '≥94% or at known baseline (0)', value: 0 },
        { label: '91–93% (1)', value: 1 },
        { label: '≤90% (2)', value: 2 },
      ]),
      selectInput('temp', 'Temperature', [
        { label: '36.1–38.0 °C (0)', value: 0 },
        { label: '35.1–36.0 or 38.1–39.0 (1)', value: 1 },
        { label: '≤35.0 or >39.0 (2)', value: 2 },
      ]),
      yesNo('nurseConcern', 'Staff / caregiver concern (local bonus +1)', 1),
    ],
    calculate(values) {
      const score =
        num(values.behavior) +
        num(values.cv) +
        num(values.resp) +
        num(values.oxygen) +
        num(values.spo2) +
        num(values.temp) +
        (bool(values.nurseConcern) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low (0–2)',
          interpretation: `Full PEWS-style total ${score}. Routine observations; reassess sooner if parental concern or single extreme vital.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Increased (3–4)',
          interpretation: `Score ${score}: increased monitoring and prompt clinician review per local track-and-trigger pathway.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High (5–6)',
          interpretation: `Score ${score}: high concern — urgent bedside assessment; consider continuous monitoring and senior review.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Critical (≥7)',
          interpretation: `Score ${score}: critical band — activate rapid response / ICU review. Any single domain at maximum also warrants urgent evaluation in many systems.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Behavior', value: String(num(values.behavior)) },
          { label: 'Cardiovascular', value: String(num(values.cv)) },
          { label: 'Respiratory', value: String(num(values.resp)) },
          { label: 'Oxygen', value: String(num(values.oxygen)) },
          { label: 'SpO₂', value: String(num(values.spo2)) },
          { label: 'Temperature', value: String(num(values.temp)) },
          { label: 'Concern bonus', value: bool(values.nurseConcern) ? '1' : '0' },
        ],
        recommendations: [
          'Use institutional PEWS age-vital tables when available',
          'Escalation thresholds are hospital-specific',
          'Clinical gestalt overrides numeric score',
        ],
      };
    },
    evidence: {
      summary:
        'Multi-domain PEWS aggregates behavior, CV, respiratory, oxygen, saturation, and temperature. This educational tool is broader than 3-domain simplifications; exact points and cutoffs vary by institution.',
      formula: 'Behavior + CV + Resp + O₂ + SpO₂ + Temp + optional concern (approx 0–17)',
      validation:
        'PEWS systems associate higher scores with unplanned ICU transfer; performance depends on response algorithms and local vital-sign norms.',
      references: [
        {
          title: 'Evaluating the Pediatric Early Warning Score (PEWS) system for emergency department triage',
          citation: 'Monaghan A. Paediatr Nurs. 2005 / subsequent PEWS validations',
          year: 2005,
          pmid: '25377402',
          doi: '10.1111/acem.12514',
        },
        {
          title: 'Effect of a PEWS on all-cause mortality in hospitalized children',
          citation: 'Parshuram CS et al. JAMA. 2018 (EPOCH trial context)',
          year: 2018,
          pmid: '29486493',
          doi: '10.1001/jama.2018.0948',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5 or any domain 3', actions: ['Urgent review', 'Increase monitoring', 'Prepare escalation'] },
      { condition: 'Score 0–2 stable', actions: ['Routine PEWS observations'] },
    ],
    pearls: [
      'Distinct from simplified 3-domain PEWS and Bedside PEWS implementations.',
      'Trend and single extreme vitals matter as much as the total.',
    ],
  },

  // ─── 2. PALS normal HR ─────────────────────────────────────────────────────
  {
    id: 'pals-hr',
    name: 'PALS Normal Heart Rate by Age',
    shortName: 'PALS HR',
    description: 'Age-band normal awake resting heart-rate ranges used in PALS-style pediatric vital-sign teaching.',
    category: 'pediatrics',
    tags: ['pals', 'heart rate', 'vitals', 'pediatric', 'reference'],
    whenToUse: 'Quick reference for whether measured HR is within expected age band during resuscitation teaching or triage.',
    whyUse: 'Normal pediatric HR ranges change dramatically with age; adult norms misclassify infants and toddlers.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: 'Neonate (0–28 days)', value: 'neonate' },
        { label: 'Infant (1–12 months)', value: 'infant' },
        { label: 'Toddler (1–2 years)', value: 'toddler' },
        { label: 'Preschool (3–5 years)', value: 'preschool' },
        { label: 'School age (6–11 years)', value: 'school' },
        { label: 'Adolescent (12–15 years)', value: 'teen' },
      ]),
      numberInput('hr', 'Measured heart rate', { unit: 'bpm', min: 30, max: 280, defaultValue: 120 }),
      selectInput('state', 'Patient state', [
        { label: 'Awake / resting', value: 'awake' },
        { label: 'Sleeping (lower end expected)', value: 'sleep' },
      ]),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'infant');
      const hr = num(values.hr, 120);
      const sleep = String(values.state ?? 'awake') === 'sleep';
      // Approximate PALS / AHA pediatric vital teaching ranges (awake)
      const ranges: Record<string, { lo: number; hi: number; label: string }> = {
        neonate: { lo: 100, hi: 205, label: 'Neonate' },
        infant: { lo: 100, hi: 180, label: 'Infant' },
        toddler: { lo: 98, hi: 140, label: 'Toddler' },
        preschool: { lo: 80, hi: 120, label: 'Preschool' },
        school: { lo: 75, hi: 118, label: 'School age' },
        teen: { lo: 60, hi: 100, label: 'Adolescent' },
      };
      const r = ranges[band] ?? ranges.infant;
      // Sleeping HR often ~10–20% lower (educational)
      const lo = sleep ? Math.round(r.lo * 0.85) : r.lo;
      const hi = sleep ? Math.round(r.hi * 0.9) : r.hi;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let label = 'Within expected range';
      if (hr < lo) {
        riskLevel = hr < lo - 20 ? 'high' : 'moderate';
        label = 'Below expected range (relative bradycardia for age)';
      } else if (hr > hi) {
        riskLevel = hr > hi + 30 ? 'high' : 'moderate';
        label = 'Above expected range (tachycardia for age)';
      }
      return {
        score: hr,
        unit: 'bpm',
        label,
        interpretation: `${r.label}: expected ${sleep ? 'sleeping' : 'awake'} HR roughly ${lo}–${hi} bpm. Measured ${hr} bpm is ${label.toLowerCase()}. Fever, pain, anxiety, and illness shift expected rates — interpret in context.`,
        riskLevel,
        details: [
          { label: 'Age band', value: r.label },
          { label: 'Expected range', value: `${lo}–${hi} bpm` },
          { label: 'Measured HR', value: `${hr} bpm` },
        ],
        recommendations: [
          'Treat the patient, not the number alone',
          'Bradycardia with poor perfusion is a pre-arrest sign in children',
          'Sinus tachycardia is common with fever/dehydration',
        ],
      };
    },
    evidence: {
      summary: 'PALS/AHA materials publish age-based normal HR ranges that differ substantially from adult norms.',
      formula: 'Compare measured HR to age-band low–high awake (or adjusted sleep) range',
      validation: 'Teaching ranges from AHA PALS provider materials; institutional vital tables may differ slightly.',
      references: [
        {
          title: 'Pediatric Advanced Life Support (PALS) Provider Manual',
          citation: 'American Heart Association',
          year: 2020,
          url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric',
        },
      ],
    },
    nextSteps: [
      { condition: 'Bradycardia + poor perfusion', actions: ['ABCs', 'Oxygen', 'Support ventilation', 'Prepare epinephrine/CPR per PALS'] },
      { condition: 'Isolated mild tachycardia', actions: ['Assess fever, pain, volume status'] },
    ],
    pearls: [
      'Infant resting HR often 120–160; “normal adult HR” is bradycardic for a neonate.',
      'Persistent tachycardia after fever control warrants further workup.',
    ],
  },

  // ─── 3. PALS normal RR ─────────────────────────────────────────────────────
  {
    id: 'pals-rr',
    name: 'PALS Normal Respiratory Rate by Age',
    shortName: 'PALS RR',
    description: 'Age-band normal respiratory-rate ranges used in PALS-style pediatric vital-sign teaching.',
    category: 'pediatrics',
    tags: ['pals', 'respiratory rate', 'vitals', 'pediatric', 'reference'],
    whenToUse: 'Interpreting measured respiratory rate against age-expected norms in ill or injured children.',
    whyUse: 'RR is one of the most age-dependent vitals; tachypnea is an early sign of illness or compensation.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: 'Neonate (0–28 days)', value: 'neonate' },
        { label: 'Infant (1–12 months)', value: 'infant' },
        { label: 'Toddler (1–2 years)', value: 'toddler' },
        { label: 'Preschool (3–5 years)', value: 'preschool' },
        { label: 'School age (6–11 years)', value: 'school' },
        { label: 'Adolescent (12–15 years)', value: 'teen' },
      ]),
      numberInput('rr', 'Measured respiratory rate', { unit: '/min', min: 5, max: 120, defaultValue: 30 }),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'infant');
      const rr = num(values.rr, 30);
      const ranges: Record<string, { lo: number; hi: number; label: string }> = {
        neonate: { lo: 30, hi: 60, label: 'Neonate' },
        infant: { lo: 30, hi: 53, label: 'Infant' },
        toddler: { lo: 22, hi: 37, label: 'Toddler' },
        preschool: { lo: 20, hi: 28, label: 'Preschool' },
        school: { lo: 18, hi: 25, label: 'School age' },
        teen: { lo: 12, hi: 20, label: 'Adolescent' },
      };
      const r = ranges[band] ?? ranges.infant;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let label = 'Within expected range';
      if (rr < r.lo) {
        riskLevel = rr < r.lo - 8 ? 'high' : 'moderate';
        label = 'Below expected range (relative bradypnea)';
      } else if (rr > r.hi) {
        riskLevel = rr > r.hi + 15 ? 'high' : 'moderate';
        label = 'Above expected range (tachypnea for age)';
      }
      return {
        score: rr,
        unit: '/min',
        label,
        interpretation: `${r.label}: expected RR roughly ${r.lo}–${r.hi}/min. Measured ${rr}/min is ${label.toLowerCase()}. Count for a full minute in infants; effort and SpO₂ complete the assessment.`,
        riskLevel,
        details: [
          { label: 'Age band', value: r.label },
          { label: 'Expected range', value: `${r.lo}–${r.hi}/min` },
          { label: 'Measured RR', value: `${rr}/min` },
        ],
        recommendations: [
          'Assess work of breathing and oxygenation together with rate',
          'Quiet tachypnea may indicate metabolic acidosis or compensation',
          'Impending failure may present with fatigue and falling RR',
        ],
      };
    },
    evidence: {
      summary: 'PALS/AHA age-based RR norms guide recognition of tachypnea and hypoventilation in children.',
      formula: 'Compare measured RR to age-band low–high range',
      validation: 'Teaching ranges from AHA PALS materials; slight table differences exist across textbooks.',
      references: [
        {
          title: 'Pediatric Advanced Life Support (PALS) Provider Manual',
          citation: 'American Heart Association',
          year: 2020,
          url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric',
        },
      ],
    },
    nextSteps: [
      { condition: 'Tachypnea + distress', actions: ['Oxygen as needed', 'Position of comfort', 'Evaluate cause'] },
      { condition: 'Bradypnea / irregular', actions: ['Support airway/ventilation', 'Check glucose and CNS causes'] },
    ],
    pearls: [
      'Infants normally breathe much faster than adults.',
      'A “normal” RR for an adult is often too low for a toddler.',
    ],
  },

  // ─── 4. PALS minimum SBP ───────────────────────────────────────────────────
  {
    id: 'pals-sbp',
    name: 'PALS Minimum Systolic BP by Age',
    shortName: 'PALS SBP',
    description:
      'Minimum acceptable systolic blood pressure by age using PALS-style hypotension thresholds (including 70 + 2×age formula for 1–10 years).',
    category: 'pediatrics',
    tags: ['pals', 'blood pressure', 'hypotension', 'shock', 'pediatric'],
    whenToUse: 'Rapid lookup of age-based minimum SBP when assessing shock or interpreting pediatric BP.',
    whyUse: 'Hypotension is a late finding in pediatric shock; knowing the age cutoff avoids false reassurance.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: 'Term neonate (0–28 days)', value: 'neonate' },
        { label: 'Infant (1–12 months)', value: 'infant' },
        { label: '1–10 years (formula: 70 + 2×age)', value: 'child' },
        { label: '>10 years', value: 'teen' },
      ]),
      numberInput('ageYears', 'Age in years (if 1–10)', { min: 1, max: 10, step: 0.5, defaultValue: 4 }),
      numberInput('sbp', 'Measured SBP (optional compare)', {
        unit: 'mmHg',
        min: 30,
        max: 220,
        defaultValue: 90,
        helpText: 'Leave meaningful value to compare against minimum',
        required: false,
      }),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'child');
      const ageY = num(values.ageYears, 4);
      const sbpProvided = !isMissingValue(values.sbp, true);
      const sbp = num(values.sbp, 0);
      let minSbp = 90;
      let bandLabel = '>10 years';
      if (band === 'neonate') {
        minSbp = 60;
        bandLabel = 'Term neonate';
      } else if (band === 'infant') {
        minSbp = 70;
        bandLabel = 'Infant';
      } else if (band === 'child') {
        minSbp = Math.round(70 + 2 * ageY);
        bandLabel = `${ageY} years`;
      } else {
        minSbp = 90;
        bandLabel = 'Adolescent / >10 y';
      }
      const delta = sbp - minSbp;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'info';
      let label = `Minimum SBP ≈ ${minSbp} mmHg`;
      if (!sbpProvided) {
        riskLevel = 'info';
        label = `Minimum SBP ≈ ${minSbp} mmHg`;
      } else if (sbp < minSbp - 10) {
        riskLevel = 'critical';
        label = 'Hypotension (well below threshold)';
      } else if (sbp < minSbp) {
        riskLevel = 'high';
        label = 'At/below hypotension threshold';
      } else if (sbp < minSbp + 10) {
        riskLevel = 'moderate';
        label = 'Near threshold — monitor closely';
      } else {
        riskLevel = 'low';
        label = 'Above minimum SBP for age';
      }
      return {
        score: minSbp,
        unit: 'mmHg',
        label,
        interpretation: `PALS-style minimum SBP for ${bandLabel} is ≈ ${minSbp} mmHg. ${
          sbpProvided
            ? `Measured SBP ${sbp} mmHg (${delta >= 0 ? '+' : ''}${delta} from threshold).`
            : 'No measured SBP entered, so no comparison against the threshold was made.'
        } Compensated shock may still have “normal” BP — assess perfusion, lactate, and mental status.`,
        riskLevel,
        details: [
          { label: 'Age band', value: bandLabel },
          { label: 'Minimum SBP', value: `${minSbp} mmHg` },
          { label: 'Measured SBP', value: sbpProvided ? `${sbp} mmHg` : 'Not entered' },
          {
            label: 'Formula note',
            value: band === 'child' ? '70 + 2×age (years)' : 'Fixed band cutoff',
          },
        ],
        recommendations: [
          'Hypotension = decompensated shock until proven otherwise',
          'Treat poor perfusion even if SBP is above threshold',
          'Use correct cuff size for accurate measurement',
        ],
      };
    },
    evidence: {
      summary:
        'PALS hypotension cutoffs: neonate <60, infant <70, 1–10 y <70+2×age, >10 y <90 mmHg systolic (approximate teaching values).',
      formula: 'Neonate 60; infant 70; 1–10 y: 70+2×age; >10 y: 90',
      validation: 'AHA PALS teaching thresholds; local charts may refine percentiles (e.g., 5th percentile SBP).',
      references: [
        {
          title: 'Pediatric Advanced Life Support (PALS) Provider Manual',
          citation: 'American Heart Association',
          year: 2020,
          url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric',
        },
      ],
    },
    nextSteps: [
      { condition: 'SBP below minimum + shock signs', actions: ['Fluid bolus per PALS', 'Reassess', 'Vasopressors if fluid-refractory', 'Treat cause'] },
      { condition: 'SBP above min but poor perfusion', actions: ['Still treat as shock', 'Do not wait for hypotension'] },
    ],
    pearls: [
      'Children maintain BP longer than adults via tachycardia and vasoconstriction.',
      'Related calculator pediatric-bp-threshold also interprets measured vs cutoff.',
    ],
  },

  // ─── 5. ETT depth ──────────────────────────────────────────────────────────
  {
    id: 'ett-depth',
    name: 'Pediatric ETT Insertion Depth',
    shortName: 'ETT Depth',
    description: 'Estimates oral endotracheal tube depth at the lips: age(years)/2 + 12 cm (classic teaching formula).',
    category: 'pediatrics',
    tags: ['airway', 'ett', 'intubation', 'depth', 'pediatric'],
    whenToUse: 'After selecting ETT size, estimate initial oral insertion depth in children (not neonates).',
    whyUse: 'Provides a starting lip-mark depth; must be confirmed with auscultation, ETCO₂, and imaging when available.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0.5, max: 16, step: 0.5, defaultValue: 4 }),
      numberInput('weight', 'Weight (optional neonatal/alt formula)', {
        unit: 'kg',
        min: 2,
        max: 80,
        step: 0.1,
        defaultValue: 16,
        helpText: 'Weight-based depth ≈ weight(kg)/2 + 6 sometimes used in infants',
        required: false,
      }),
      selectInput('route', 'Route', [
        { label: 'Oral', value: 'oral' },
        { label: 'Nasal (≈ oral + 2–3 cm educational)', value: 'nasal' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 4);
      const wtProvided = !isMissingValue(values.weight, true);
      const wt = num(values.weight, 0);
      const route = String(values.route ?? 'oral');
      const oralAge = round(age / 2 + 12, 1);
      const oralWt = wtProvided ? round(wt / 2 + 6, 1) : null;
      const oral = oralAge;
      const depth = route === 'nasal' ? round(oral + 2.5, 1) : oral;
      return {
        score: depth,
        unit: 'cm',
        label: `${route === 'nasal' ? 'Nasal' : 'Oral'} depth ≈ ${depth} cm`,
        interpretation: `Age-based oral depth ≈ age/2 + 12 = ${oralAge} cm at lips. ${
          oralWt != null ? `Weight-based alternative ≈ wt/2 + 6 = ${oralWt} cm. ` : 'Weight not entered, so the weight-based alternative was not calculated. '
        }${
          route === 'nasal' ? `Nasal estimate ≈ ${depth} cm (oral + ~2.5). ` : ''
        }Confirm bilateral breath sounds, ETCO₂, and chest rise; adjust for mainstem intubation risk.`,
        riskLevel: 'info',
        details: [
          { label: 'Age formula', value: `${oralAge} cm` },
          { label: 'Weight formula', value: oralWt != null ? `${oralWt} cm` : 'Not calculated — weight not entered' },
          { label: 'Reported', value: `${depth} cm (${route})` },
        ],
        recommendations: [
          'Have tubes ready 0.5 mm larger/smaller',
          'Secure at confirmed depth after clinical/ETCO₂ check',
          'Neonates often use weight-based or NTL methods — not this formula alone',
        ],
      };
    },
    evidence: {
      summary: 'Classic oral ETT depth (cm) ≈ age(years)/2 + 12. Alternate weight-based teaching: kg/2 + 6.',
      formula: 'Oral depth ≈ age/2 + 12 cm (lips)',
      validation: 'Teaching estimate only; anatomy varies — always confirm placement clinically and with ETCO₂.',
      references: [
        {
          title: 'Pediatric Advanced Life Support (PALS) airway teaching',
          citation: 'American Heart Association PALS provider materials',
          year: 2020,
          url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric',
        },
      ],
    },
    nextSteps: [
      { condition: 'After intubation', actions: ['ETCO₂', 'Bilateral BS', 'Secure tube', 'CXR when feasible'] },
    ],
    pearls: [
      'Too deep → right mainstem; too shallow → accidental extubation risk.',
      'Size formula is separate (age/4+4 uncuffed).',
    ],
  },

  // ─── 6. Defibrillation dose ────────────────────────────────────────────────
  {
    id: 'defib-dose-peds',
    name: 'Pediatric Defibrillation Energy Dose',
    shortName: 'Peds Defib',
    description: 'Estimates biphasic defibrillation energy for pediatric VF/pVT: first shock 2 J/kg, subsequent 4 J/kg (PALS).',
    category: 'pediatrics',
    tags: ['pals', 'defibrillation', 'vf', 'arrest', 'joules', 'pediatric'],
    whenToUse: 'Cardiac arrest with shockable rhythm (VF/pVT) in children when preparing defibrillator energy.',
    whyUse: 'Weight-based joules differ from adult fixed doses; under-/overdosing is common without quick math.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 2, max: 100, step: 0.1, defaultValue: 15 }),
      selectInput('shock', 'Shock number', [
        { label: 'First shock (2 J/kg)', value: 'first' },
        { label: 'Subsequent shocks (4 J/kg)', value: 'next' },
        { label: 'Show both', value: 'both' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 15);
      const mode = String(values.shock ?? 'both');
      const first = round(2 * w, 0);
      const next = round(4 * w, 0);
      // Adult ceiling often considered ~200–360 J depending on device; educational cap note
      const firstCapped = Math.min(first, 200);
      const nextCapped = Math.min(next, 360);
      let score = mode === 'next' ? next : first;
      let label = mode === 'next' ? `Subsequent ≈ ${next} J` : `First ≈ ${first} J`;
      if (mode === 'both') {
        score = first;
        label = `First ${first} J · Next ${next} J`;
      }
      return {
        score,
        unit: 'J',
        label,
        interpretation: `For ${w} kg: first defibrillation ≈ 2 J/kg = ${first} J; subsequent ≈ 4 J/kg = ${next} J (PALS). Device max and pad size matter; adolescents approaching adult size may use adult doses. Approximate device-limited values: first ≤~${firstCapped} J teaching note, subsequent ≤~${nextCapped} J.`,
        riskLevel: 'critical',
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'First (2 J/kg)', value: `${first} J` },
          { label: 'Subsequent (4 J/kg)', value: `${next} J` },
        ],
        recommendations: [
          'Minimize interruptions in CPR',
          'Use pediatric pads/attenuator per manufacturer when indicated',
          'Resume CPR immediately after shock',
        ],
      };
    },
    evidence: {
      summary: 'PALS recommends initial defibrillation 2 J/kg; subsequent shocks 4 J/kg for pediatric VF/pVT.',
      formula: 'First = 2 × kg; subsequent = 4 × kg',
      validation: 'AHA PALS guidelines; exact maximums depend on defibrillator model.',
      references: [
        {
          title: '2020 AHA Guidelines for CPR and ECC — Pediatric Basic and Advanced Life Support',
          citation: 'Topjian AA et al. Circulation. 2020',
          year: 2020,
          pmid: '33081526',
          doi: '10.1161/CIR.0000000000000901',
        },
      ],
    },
    nextSteps: [
      { condition: 'Shockable arrest', actions: ['CPR 2 min cycles', 'Epinephrine timing per PALS', 'Treat reversible causes'] },
    ],
    pearls: [
      'Manual mode preferred when available for precise dosing.',
      'Do not delay shock for prolonged weight estimation — use Broselow if needed.',
    ],
  },

  // ─── 7. Epinephrine arrest dose ────────────────────────────────────────────
  {
    id: 'epi-dose-peds',
    name: 'Pediatric Epinephrine Dose (Cardiac Arrest)',
    shortName: 'Peds Epi',
    description:
      'Calculates standard cardiac-arrest epinephrine dose: 0.01 mg/kg (0.1 mL/kg of 1:10,000) IV/IO every 3–5 minutes (PALS).',
    category: 'pediatrics',
    tags: ['pals', 'epinephrine', 'arrest', 'dose', 'pediatric'],
    whenToUse: 'Pediatric cardiac arrest when preparing IV/IO epinephrine.',
    whyUse: 'Converts weight to mg and mL of 1:10,000 concentration to reduce dosing errors.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 100, step: 0.1, defaultValue: 15 }),
      selectInput('route', 'Route / concentration context', [
        { label: 'IV/IO — 1:10,000 (0.1 mg/mL) standard arrest', value: 'iv' },
        { label: 'ET tube — higher volume teaching note (less preferred)', value: 'et' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 15);
      const route = String(values.route ?? 'iv');
      // IV/IO: 0.01 mg/kg = 0.1 mL/kg of 1:10,000; max single dose often 1 mg
      const mg = round(Math.min(0.01 * w, 1), 3);
      const ml101000 = round(Math.min(0.1 * w, 10), 2);
      // ET historical teaching ~0.1 mg/kg (10×) — educational only, IV/IO preferred
      const etMg = round(0.1 * w, 2);
      const score = route === 'et' ? etMg : mg;
      return {
        score,
        unit: 'mg',
        label: route === 'et' ? `ET teaching ≈ ${etMg} mg` : `IV/IO ${mg} mg`,
        interpretation:
          route === 'et'
            ? `Endotracheal epinephrine is less reliable. Historical teaching ~0.1 mg/kg ≈ ${etMg} mg (diluted); prefer IV/IO 0.01 mg/kg = ${mg} mg (${ml101000} mL of 1:10,000) every 3–5 min. Adult max single IV dose typically 1 mg.`
            : `IV/IO epinephrine 0.01 mg/kg = ${mg} mg = ${ml101000} mL of 1:10,000 (0.1 mg/mL), every 3–5 minutes during arrest. Single-dose cap educationally ~1 mg (10 mL of 1:10,000).`,
        riskLevel: 'critical',
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'IV/IO dose', value: `${mg} mg` },
          { label: 'Volume 1:10,000', value: `${ml101000} mL` },
          { label: 'Concentration', value: '1:10,000 = 0.1 mg/mL' },
        ],
        recommendations: [
          'Prefer IV/IO over ET route',
          'Do not confuse 1:1,000 (IM anaphylaxis) with 1:10,000 (IV arrest)',
          'Flush after each dose',
        ],
      };
    },
    evidence: {
      summary: 'PALS cardiac arrest epinephrine: 0.01 mg/kg IV/IO (0.1 mL/kg of 1:10,000) q3–5 min; max 1 mg/dose typical.',
      formula: 'mg = 0.01 × kg; mL (1:10,000) = 0.1 × kg',
      validation: 'AHA PALS 2020 pediatric advanced life support recommendations.',
      references: [
        {
          title: '2020 AHA Guidelines for CPR and ECC — Pediatric Basic and Advanced Life Support',
          citation: 'Topjian AA et al. Circulation. 2020',
          year: 2020,
          pmid: '33081526',
          doi: '10.1161/CIR.0000000000000901',
        },
      ],
    },
    nextSteps: [
      { condition: 'During arrest', actions: ['High-quality CPR', 'Epinephrine q3–5 min', 'Identify H’s and T’s'] },
    ],
    pearls: [
      'Anaphylaxis IM epinephrine is a different concentration and dose.',
      'Push-dose pressors are a separate ICU technique — not this calculator.',
    ],
  },

  // ─── 8. Fluid bolus ───────────────────────────────────────────────────────
  {
    id: 'fluid-bolus-peds',
    name: 'Pediatric Fluid Bolus Volume',
    shortName: 'Peds Bolus',
    description: 'Calculates crystalloid bolus volume at 10 or 20 mL/kg for pediatric shock/resuscitation teaching.',
    category: 'pediatrics',
    tags: ['fluids', 'bolus', 'shock', 'pals', 'pediatric', 'resuscitation'],
    whenToUse: 'Hypovolemic or distributive shock in children when ordering an isotonic crystalloid bolus.',
    whyUse: 'Rapid mL/kg math for 10 vs 20 mL/kg strategies (cardiac/renal caution often uses 10 mL/kg).',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 100, step: 0.1, defaultValue: 15 }),
      selectInput('dose', 'Bolus size', [
        { label: '20 mL/kg (typical initial, non-cardiac)', value: 20 },
        { label: '10 mL/kg (cardiac / carefully titrated)', value: 10 },
        { label: 'Both 10 and 20', value: 0 },
      ]),
      selectInput('fluid', 'Fluid type (label only)', [
        { label: 'Isotonic crystalloid (NS / LR)', value: 'crystalloid' },
        { label: 'Blood products (separate indication)', value: 'blood' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 15);
      const dose = num(values.dose, 20);
      const vol10 = round(10 * w, 0);
      const vol20 = round(20 * w, 0);
      const score = dose === 10 ? vol10 : dose === 20 ? vol20 : vol20;
      const label =
        dose === 0 ? `10 mL/kg = ${vol10} mL · 20 mL/kg = ${vol20} mL` : `${dose} mL/kg = ${score} mL`;
      return {
        score,
        unit: 'mL',
        label,
        interpretation: `For ${w} kg: 10 mL/kg = ${vol10} mL; 20 mL/kg = ${vol20} mL of isotonic crystalloid. Reassess perfusion after each bolus. Use smaller/titratable boluses in cardiogenic shock, severe anemia, or fluid overload risk. DKA and some neurosurgical contexts follow specific protocols.`,
        riskLevel: 'info',
        details: [
          { label: '10 mL/kg', value: `${vol10} mL` },
          { label: '20 mL/kg', value: `${vol20} mL` },
          { label: 'Fluid', value: String(values.fluid ?? 'crystalloid') },
        ],
        recommendations: [
          'Reassess HR, pulses, CRT, mentation, urine after each bolus',
          'Consider blood early in hemorrhagic shock',
          'Inotrope/vasoactive support if fluid-refractory',
        ],
      };
    },
    evidence: {
      summary: 'PALS shock teaching commonly uses 20 mL/kg isotonic crystalloid boluses, with 10 mL/kg preferred when myocardial dysfunction is suspected.',
      formula: 'Volume (mL) = mL/kg × weight (kg)',
      validation: 'AHA PALS fluid resuscitation teaching; sepsis bundles may refine timing and volume.',
      references: [
        {
          title: '2020 AHA Guidelines — Pediatric Basic and Advanced Life Support',
          citation: 'Topjian AA et al. Circulation. 2020',
          year: 2020,
          pmid: '33081526',
          doi: '10.1161/CIR.0000000000000901',
        },
      ],
    },
    nextSteps: [
      { condition: 'Improved perfusion', actions: ['Maintenance fluids', 'Treat underlying cause'] },
      { condition: 'Fluid-refractory shock', actions: ['Vasoactive agents', 'ICU care', 'Source control'] },
    ],
    pearls: [
      'Warm fluids when large volumes are given.',
      'Maintenance fluids (Holliday–Segar) are separate from resuscitation boluses.',
    ],
  },

  // ─── 9. kcal needs ─────────────────────────────────────────────────────────
  {
    id: 'kcal-needs-peds',
    name: 'Pediatric Estimated Caloric Needs',
    shortName: 'Peds kcal',
    description: 'Rough estimated daily energy needs (kcal/kg/day) by age band for educational nutrition planning.',
    category: 'pediatrics',
    tags: ['nutrition', 'calories', 'kcal', 'growth', 'pediatric'],
    whenToUse: 'Estimate baseline caloric targets for healthy or recovering children when a simple age-based rule of thumb is acceptable.',
    whyUse: 'Age-based kcal/kg estimates provide a starting point before dietitian-guided or measured energy expenditure.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: 'Preterm / high needs neonate (~110–130+ kcal/kg)', value: 'preterm' },
        { label: 'Term neonate / young infant (0–6 mo) ~100–120', value: 'youngInfant' },
        { label: 'Older infant (6–12 mo) ~90–100', value: 'olderInfant' },
        { label: '1–3 years ~80–100', value: 'toddler' },
        { label: '4–6 years ~70–90', value: 'preschool' },
        { label: '7–10 years ~60–80', value: 'school' },
        { label: '11–14 years ~50–70', value: 'earlyTeen' },
        { label: '15–18 years ~40–60', value: 'lateTeen' },
      ]),
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 120, step: 0.1, defaultValue: 12 }),
      selectInput('stress', 'Illness / activity multiplier', [
        { label: 'Baseline / healthy (×1.0)', value: 1 },
        { label: 'Mild stress / catch-up (×1.2)', value: 1.2 },
        { label: 'Moderate illness (×1.4)', value: 1.4 },
        { label: 'Severe stress / burn / major surgery (×1.6)', value: 1.6 },
      ]),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'toddler');
      const w = num(values.weight, 12);
      const mult = num(values.stress, 1);
      const mid: Record<string, { kcalKg: number; range: string; label: string }> = {
        preterm: { kcalKg: 120, range: '110–130+', label: 'Preterm/high-needs neonate' },
        youngInfant: { kcalKg: 110, range: '100–120', label: '0–6 months' },
        olderInfant: { kcalKg: 95, range: '90–100', label: '6–12 months' },
        toddler: { kcalKg: 90, range: '80–100', label: '1–3 years' },
        preschool: { kcalKg: 80, range: '70–90', label: '4–6 years' },
        school: { kcalKg: 70, range: '60–80', label: '7–10 years' },
        earlyTeen: { kcalKg: 60, range: '50–70', label: '11–14 years' },
        lateTeen: { kcalKg: 50, range: '40–60', label: '15–18 years' },
      };
      const m = mid[band] ?? mid.toddler;
      const base = round(m.kcalKg * w, 0);
      const total = round(base * mult, 0);
      return {
        score: total,
        unit: 'kcal/day',
        label: `≈ ${total} kcal/day`,
        interpretation: `${m.label}: midpoint ~${m.kcalKg} kcal/kg/day (typical teaching range ${m.range}). For ${w} kg → baseline ≈ ${base} kcal/day; with multiplier ${mult} → ≈ ${total} kcal/day. Not a substitute for RDA tables, indirect calorimetry, or dietitian assessment — especially in obesity, failure to thrive, or critical illness.`,
        riskLevel: 'info',
        details: [
          { label: 'kcal/kg midpoint', value: `${m.kcalKg}` },
          { label: 'Baseline', value: `${base} kcal/day` },
          { label: 'Multiplier', value: String(mult) },
          { label: 'Estimated total', value: `${total} kcal/day` },
        ],
        recommendations: [
          'Adjust for growth chart trajectory and clinical status',
          'Critical illness may need lower early targets then titration',
          'Consult pediatric nutrition for complex needs',
        ],
      };
    },
    evidence: {
      summary:
        'Pediatric energy needs are often taught as declining kcal/kg with age (infants ~100–120 kcal/kg; adolescents lower). Stress factors increase requirements.',
      formula: 'kcal/day ≈ (kcal/kg for age) × weight × stress factor',
      validation: 'Educational rule of thumb; DRIs/RDA and disease-specific equations supersede for formal planning.',
      references: [
        {
          title: 'Dietary Reference Intakes for Energy',
          citation: 'National Academies / IOM DRI reports (energy)',
          year: 2005,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK545442/',
        },
      ],
    },
    nextSteps: [
      { condition: 'FTT or obesity', actions: ['Full growth assessment', 'Specialist nutrition input'] },
      { condition: 'ICU', actions: ['Avoid overfeeding early', 'Reassess frequently'] },
    ],
    pearls: [
      'Catch-up growth may need higher kcal/kg for a period.',
      'Fluid-restricted cardiac patients need concentrated feeds — not just higher volume.',
    ],
  },

  // ─── 10. Failure to thrive ─────────────────────────────────────────────────
  {
    id: 'failure-to-thrive',
    name: 'Failure to Thrive Helper (Weight-for-Age Z)',
    shortName: 'FTT Helper',
    description:
      'Interprets entered weight-for-age z-score bands and weight-gain concerns into educational FTT risk categories.',
    category: 'pediatrics',
    tags: ['failure to thrive', 'growth', 'z-score', 'malnutrition', 'pediatric'],
    whenToUse: 'Children with poor weight gain when z-scores or percentile concerns are already known from growth charts.',
    whyUse: 'Structures common WHO/CDC-style z-score thresholds and clinical red flags into a simple risk band.',
    inputs: [
      selectInput('waz', 'Weight-for-age z-score band', [
        { label: 'z > −1 (normal band)', value: 0 },
        { label: 'z −1 to −2 (mild concern)', value: 1 },
        { label: 'z −2 to −3 (moderate underweight)', value: 2 },
        { label: 'z < −3 (severe underweight)', value: 3 },
      ]),
      yesNo('crossing', 'Crossed ≥2 major percentile lines downward', 1),
      yesNo('weightLtLength', 'Weight-for-length / BMI z < −2', 1),
      yesNo('poorGain', 'Documented poor weight velocity / gain', 1),
      yesNo('redFlags', 'Red flags (vomiting, diarrhea, neglect concern, chronic disease signs)', 2),
      numberInput('ageMonths', 'Age', { unit: 'months', min: 0, max: 216, defaultValue: 12 }),
    ],
    calculate(values) {
      const score =
        num(values.waz) +
        (bool(values.crossing) ? 1 : 0) +
        (bool(values.weightLtLength) ? 1 : 0) +
        (bool(values.poorGain) ? 1 : 0) +
        (bool(values.redFlags) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Low concern for FTT',
          interpretation: `Helper score ${score}: weight-for-age in acceptable band without additional growth-velocity red flags. Continue routine growth monitoring.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Possible FTT / growth faltering',
          interpretation: `Helper score ${score}: features suggest growth faltering. Confirm plotting on WHO (0–2 y) or CDC charts, dietary history, and medical evaluation for inadequate intake vs increased losses/needs.`,
        },
        {
          max: 4,
          level: 'high',
          label: 'Likely FTT — full evaluation',
          interpretation: `Helper score ${score}: multiple criteria consistent with failure to thrive / undernutrition. Needs structured workup, feeding plan, and close follow-up; consider hospitalization if severe or unsafe.`,
        },
        {
          max: 20,
          level: 'critical',
          label: 'Severe / high-risk FTT',
          interpretation: `Helper score ${score}: severe z-band and/or red flags. Urgent comprehensive assessment including medical, nutritional, and psychosocial domains.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Age', value: `${num(values.ageMonths, 12)} months` },
          { label: 'WFA z band points', value: String(num(values.waz)) },
        ],
        recommendations: [
          'Plot weight, length/height, and HC on appropriate charts',
          'Detailed feeding/intake history and observed feed when possible',
          'Screen for organic disease based on history and exam',
        ],
      };
    },
    evidence: {
      summary:
        'FTT definitions vary; common approaches use weight-for-age or weight-for-length z < −2, downward percentile crossing, or inadequate weight velocity.',
      formula: 'Educational sum of z-band severity + velocity/percentile + red-flag weights',
      validation: 'Not a formal validated score — organizes WHO-style z thresholds and clinical practice concepts.',
      references: [
        {
          title: 'WHO child growth standards',
          citation: 'WHO Multicentre Growth Reference Study',
          year: 2006,
          url: 'https://www.who.int/tools/child-growth-standards',
        },
        {
          title: 'Failure to thrive: current clinical concepts',
          citation: 'Jaffe AC. Pediatr Rev. 2011',
          year: 2011,
          pmid: '21364013',
          doi: '10.1542/pir.32-3-100',
        },
      ],
    },
    nextSteps: [
      { condition: 'Moderate concern', actions: ['Diet diary', 'Close weight checks', 'Primary care / nutrition'] },
      { condition: 'Severe / red flags', actions: ['Urgent evaluation', 'Consider admit', 'Multidisciplinary care'] },
    ],
    pearls: [
      'Enter z-scores from a proper growth chart calculator — this tool does not compute z from raw weight.',
      'Length/height errors commonly misclassify growth.',
    ],
  },

  // ─── 11. Jaundice / Bhutani ────────────────────────────────────────────────
  {
    id: 'jaundice-nomogram',
    name: 'Bhutani-Style Jaundice Risk Zone (Educational)',
    shortName: 'Bhutani Zone',
    description:
      'Educational hour-specific TSB risk-zone helper approximating Bhutani nomogram bands for term/near-term newborns ≥35 weeks.',
    category: 'pediatrics',
    tags: ['jaundice', 'bilirubin', 'bhutani', 'neonate', 'hyperbilirubinemia'],
    whenToUse: '≥35-week newborns with measured TSB when estimating approximate Bhutani risk zone (not a full nomogram plot).',
    whyUse: 'Hour of age matters as much as absolute TSB; risk zones stratify later significant hyperbilirubinemia and guide follow-up intensity (phototherapy uses separate AAP thresholds).',
    inputs: [
      numberInput('ageHours', 'Age', { unit: 'hours', min: 12, max: 144, defaultValue: 48 }),
      numberInput('tsb', 'Total serum bilirubin', { unit: 'mg/dL', min: 1, max: 30, step: 0.1, defaultValue: 10 }),
      selectInput('ga', 'Gestational age context', [
        { label: '≥38 weeks, well', value: 'lowRiskPop' },
        { label: '35–37+6 weeks or other risk factors present', value: 'higherRiskPop' },
      ]),
    ],
    calculate(values) {
      const hours = num(values.ageHours, 48);
      const tsb = num(values.tsb, 10);
      // Approximate Bhutani high-intermediate / high thresholds (educational piecewise)
      // Rough linear-ish anchors (mg/dL) for high-risk zone lower boundary
      const highRiskFloor = (h: number) => {
        if (h <= 24) return 5 + (h / 24) * 3; // ~5→8
        if (h <= 48) return 8 + ((h - 24) / 24) * 5; // ~8→13
        if (h <= 72) return 13 + ((h - 48) / 24) * 2.5; // ~13→15.5
        if (h <= 96) return 15.5 + ((h - 72) / 24) * 1.5;
        return 17;
      };
      const highIntFloor = (h: number) => highRiskFloor(h) - 2.5;
      const lowIntFloor = (h: number) => highRiskFloor(h) - 5;
      const hr = highRiskFloor(hours);
      const hi = highIntFloor(hours);
      const li = lowIntFloor(hours);
      let zone = 'Low risk zone';
      let zonePts = 0;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (tsb >= hr) {
        zone = 'High risk zone';
        zonePts = 3;
        riskLevel = 'critical';
      } else if (tsb >= hi) {
        zone = 'High-intermediate risk zone';
        zonePts = 2;
        riskLevel = 'high';
      } else if (tsb >= li) {
        zone = 'Low-intermediate risk zone';
        zonePts = 1;
        riskLevel = 'moderate';
      }
      const pop = String(values.ga ?? 'lowRiskPop');
      if (pop === 'higherRiskPop' && riskLevel === 'low') riskLevel = 'moderate';
      return {
        score: zonePts,
        label: zone,
        interpretation: `At ${hours} h, TSB ${tsb} mg/dL maps educationally to Bhutani-style “${zone}” (approx high-risk floor ~${round(hr, 1)}, high-int ~${round(hi, 1)}, low-int ~${round(li, 1)} mg/dL). ${
          pop === 'higherRiskPop' ? 'Higher-risk population (late preterm / risk factors) — interpret more cautiously. ' : ''
        }Use official AAP/Bhutani tools for clinical decisions; this is a simplified approximation.`,
        riskLevel,
        details: [
          { label: 'Age', value: `${hours} h` },
          { label: 'TSB', value: `${tsb} mg/dL` },
          { label: 'Approx high-risk floor', value: `${round(hr, 1)} mg/dL` },
        ],
        recommendations: [
          'Plot on official nomogram / AAP tool',
          'Assess neurotoxicity risk factors',
          'Arrange timed repeat TSB based on zone and risk',
        ],
      };
    },
    evidence: {
      summary:
        'Bhutani nomogram assigns hour-specific TSB into low, low-intermediate, high-intermediate, and high risk zones for subsequent significant hyperbilirubinemia in ≥35-week newborns.',
      formula: 'Educational zone from age (hours) + TSB vs approximate zone boundaries',
      validation: 'Approximates published nomogram; not identical to graphical Bhutani curves — use validated clinical tools.',
      references: [
        {
          title: 'Predictive ability of a predischarge hour-specific serum bilirubin for subsequent hyperbilirubinemia',
          citation: 'Bhutani VK et al. Pediatrics. 1999',
          year: 1999,
          pmid: '9917432',
          doi: '10.1542/peds.103.1.6',
        },
      ],
    },
    nextSteps: [
      { condition: 'High or high-intermediate zone', actions: ['Earlier follow-up TSB', 'Evaluate phototherapy need', 'Lactation support'] },
      { condition: 'Low zone, well infant', actions: ['Routine newborn follow-up timing'] },
    ],
    pearls: [
      'Always use postnatal age in hours, not days alone.',
      'Direct bilirubin and cholestasis evaluation if prolonged jaundice.',
    ],
  },

  // ─── 12. Phototherapy threshold ────────────────────────────────────────────
  {
    id: 'phototherapy-threshold',
    name: 'AAP-Style Phototherapy Threshold (Approximate)',
    shortName: 'Photo Threshold',
    description:
      'Approximate phototherapy TSB threshold helper by age in hours and neurotoxicity risk for ≥35-week newborns (educational).',
    category: 'pediatrics',
    tags: ['phototherapy', 'bilirubin', 'jaundice', 'aap', 'neonate'],
    whenToUse: 'Estimating whether TSB is near phototherapy range in term/late-preterm infants (confirm with official AAP tool).',
    whyUse: 'Phototherapy thresholds rise with age in hours and fall with neurotoxicity risk factors.',
    inputs: [
      numberInput('ageHours', 'Age', { unit: 'hours', min: 12, max: 168, defaultValue: 48 }),
      numberInput('tsb', 'Total serum bilirubin', { unit: 'mg/dL', min: 1, max: 35, step: 0.1, defaultValue: 14 }),
      selectInput('risk', 'Neurotoxicity risk', [
        { label: 'Lower risk (≥38 wks, well, no risk factors)', value: 'low' },
        { label: 'Medium risk (35–37+6 well, or ≥38 with risk factors)', value: 'med' },
        { label: 'Higher risk (35–37+6 with risk factors)', value: 'high' },
      ]),
    ],
    calculate(values) {
      const h = num(values.ageHours, 48);
      const tsb = num(values.tsb, 14);
      const risk = String(values.risk ?? 'low');
      // Highly simplified thresholds inspired by AAP 2022 style curves (mg/dL)
      const baseAt = (hours: number, low48: number, low96: number) => {
        if (hours <= 24) return low48 - 4 + (hours / 24) * 2;
        if (hours <= 48) return low48 - 2 + ((hours - 24) / 24) * 2;
        if (hours <= 96) return low48 + ((hours - 48) / 48) * (low96 - low48);
        return low96 + Math.min(2, (hours - 96) / 48);
      };
      let thr: number;
      if (risk === 'high') thr = baseAt(h, 13, 17);
      else if (risk === 'med') thr = baseAt(h, 15, 19);
      else thr = baseAt(h, 17, 21);
      thr = round(thr, 1);
      const delta = round(tsb - thr, 1);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Below approximate phototherapy threshold';
      if (tsb >= thr + 3) {
        riskLevel = 'critical';
        label = 'Well above threshold — phototherapy indicated (approx)';
      } else if (tsb >= thr) {
        riskLevel = 'high';
        label = 'At/above approximate phototherapy threshold';
      } else if (tsb >= thr - 2) {
        riskLevel = 'moderate';
        label = 'Approaching threshold — close follow-up';
      }
      return {
        score: thr,
        unit: 'mg/dL',
        label,
        interpretation: `Approximate phototherapy threshold ≈ ${thr} mg/dL at ${h} h (${risk} neurotoxicity risk band). Measured TSB ${tsb} mg/dL (${delta >= 0 ? '+' : ''}${delta} vs threshold). Educational approximation of AAP hyperbilirubinemia guidance — use official AAP quantitative tools for treatment decisions.`,
        riskLevel,
        details: [
          { label: 'Approx threshold', value: `${thr} mg/dL` },
          { label: 'TSB', value: `${tsb} mg/dL` },
          { label: 'Risk band', value: risk },
        ],
        recommendations: [
          'Confirm with AAP 2022 phototherapy tool / institutional pathway',
          'Optimize hydration and lactation support',
          'Check blood type, Coombs, CBC as indicated',
        ],
      };
    },
    evidence: {
      summary:
        'AAP clinical practice guideline (2022) provides hour-specific phototherapy thresholds stratified by gestational age and neurotoxicity risk factors.',
      formula: 'Compare TSB to approximate age- and risk-stratified threshold',
      validation: 'Simplified curves for education only — not identical to official AAP tables.',
      references: [
        {
          title: 'Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation',
          citation: 'Kemper AR et al. Pediatrics. 2022',
          year: 2022,
          pmid: '35927462',
          doi: '10.1542/peds.2022-058859',
        },
      ],
    },
    nextSteps: [
      { condition: 'At/above threshold', actions: ['Start phototherapy', 'Monitor TSB trajectory', 'Escalate if rising fast'] },
      { condition: 'Near threshold', actions: ['Repeat TSB sooner', 'Address feeding'] },
    ],
    pearls: [
      'Rate of rise and risk factors matter as much as a single value.',
      'Intensive phototherapy technique affects efficacy.',
    ],
  },

  // ─── 13. Exchange transfusion threshold ────────────────────────────────────
  {
    id: 'exchange-transfusion-threshold',
    name: 'Exchange Transfusion Threshold (Approximate)',
    shortName: 'Exchange TSB',
    description:
      'Approximate TSB threshold helper for exchange transfusion consideration in ≥35-week newborns (educational; confirm with AAP tools).',
    category: 'pediatrics',
    tags: ['exchange transfusion', 'bilirubin', 'jaundice', 'neonate', 'kernicterus'],
    whenToUse: 'Severe hyperbilirubinemia when estimating proximity to exchange thresholds alongside neurotoxicity signs.',
    whyUse: 'Exchange thresholds are higher than phototherapy thresholds and lower when acute bilirubin encephalopathy signs exist.',
    inputs: [
      numberInput('ageHours', 'Age', { unit: 'hours', min: 12, max: 168, defaultValue: 48 }),
      numberInput('tsb', 'Total serum bilirubin', { unit: 'mg/dL', min: 1, max: 45, step: 0.1, defaultValue: 22 }),
      selectInput('risk', 'Neurotoxicity risk band', [
        { label: 'Lower risk', value: 'low' },
        { label: 'Medium risk', value: 'med' },
        { label: 'Higher risk', value: 'high' },
      ]),
      yesNo('abeSigns', 'Signs of acute bilirubin encephalopathy (ABE)', -4,
        'Tone changes, retrocollis/opisthotonos, poor suck, abnormal cry, fever, altered alertness'),
    ],
    calculate(values) {
      const h = num(values.ageHours, 48);
      const tsb = num(values.tsb, 22);
      const risk = String(values.risk ?? 'low');
      const abe = bool(values.abeSigns);
      // Educational exchange floors (higher than photo); simplified
      let thr: number;
      if (risk === 'high') thr = h < 48 ? 18 : h < 72 ? 20 : 22;
      else if (risk === 'med') thr = h < 48 ? 20 : h < 72 ? 22.5 : 24;
      else thr = h < 48 ? 22 : h < 72 ? 25 : 27;
      if (abe) thr = Math.min(thr, risk === 'high' ? 15 : 18); // much lower urgency with ABE
      thr = round(thr, 1);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      let label = 'Below approximate exchange threshold';
      if (abe) {
        riskLevel = 'critical';
        label = 'ABE signs — urgent expert management';
      } else if (tsb >= thr) {
        riskLevel = 'critical';
        label = 'At/above approximate exchange range';
      } else if (tsb >= thr - 3) {
        riskLevel = 'high';
        label = 'Approaching exchange range — intensive photo ± prepare';
      } else if (tsb >= thr - 6) {
        riskLevel = 'moderate';
        label = 'Elevated — intensive phototherapy focus';
      } else {
        riskLevel = 'low';
      }
      return {
        score: thr,
        unit: 'mg/dL',
        label,
        interpretation: `Approximate exchange threshold ≈ ${thr} mg/dL at ${h} h (${risk} risk${abe ? ', with ABE signs' : ''}). TSB ${tsb} mg/dL. With ABE or TSB near/above threshold, initiate intensive phototherapy immediately, involve neonatology, and prepare for possible exchange per AAP pathway. This is educational only.`,
        riskLevel,
        details: [
          { label: 'Approx exchange thr', value: `${thr} mg/dL` },
          { label: 'TSB', value: `${tsb} mg/dL` },
          { label: 'ABE signs', value: abe ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Intensive phototherapy while arranging higher level care',
          'IVIG if isoimmune hemolytic disease per guidelines',
          'Do not delay treatment for transfer logistics when ABE present',
        ],
      };
    },
    evidence: {
      summary:
        'AAP guidance provides exchange transfusion thresholds above phototherapy levels; treatment is accelerated when signs of intermediate/advanced ABE are present.',
      formula: 'Compare TSB to approximate age/risk exchange threshold; ABE lowers action threshold',
      validation: 'Educational approximation of AAP 2022 guidance — use official tools and neonatology consultation.',
      references: [
        {
          title: 'Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation',
          citation: 'Kemper AR et al. Pediatrics. 2022',
          year: 2022,
          pmid: '35927462',
          doi: '10.1542/peds.2022-058859',
        },
      ],
    },
    nextSteps: [
      { condition: 'Near/above threshold or ABE', actions: ['Intensive phototherapy', 'NICU/neonatology', 'Prepare exchange resources'] },
    ],
    pearls: [
      'Exchange is rare when phototherapy is started promptly.',
      'Measure bilirubin urgently if jaundice in first 24 hours.',
    ],
  },

  // ─── 14. Croup dex dose ────────────────────────────────────────────────────
  {
    id: 'croup-dex-dose',
    name: 'Croup Dexamethasone Dose',
    shortName: 'Croup Dex',
    description: 'Calculates dexamethasone dosing for croup across common ranges (0.15–0.6 mg/kg), typically single dose.',
    category: 'pediatrics',
    tags: ['croup', 'dexamethasone', 'steroid', 'dose', 'pediatric'],
    whenToUse: 'Children with croup (laryngotracheitis) when ordering dexamethasone.',
    whyUse: 'Common practice uses 0.15–0.6 mg/kg once (max often 10–16 mg); calculates absolute mg and mL if concentration known.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 3, max: 80, step: 0.1, defaultValue: 12 }),
      selectInput('regimen', 'Dose regimen', [
        { label: '0.15 mg/kg (evidence-supported lower dose)', value: 0.15 },
        { label: '0.3 mg/kg', value: 0.3 },
        { label: '0.6 mg/kg (classic teaching dose)', value: 0.6 },
      ]),
      numberInput('maxDose', 'Maximum single dose cap', {
        unit: 'mg',
        min: 5,
        max: 20,
        defaultValue: 10,
        helpText: 'Many centers cap at 10 mg; some allow up to 16 mg',
      }),
      numberInput('conc', 'Oral concentration (optional)', {
        unit: 'mg/mL',
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        helpText: 'For volume estimate of oral liquid',
        required: false,
      }),
    ],
    calculate(values) {
      const w = num(values.weight, 12);
      const reg = num(values.regimen, 0.6);
      const maxD = num(values.maxDose, 10);
      const conc = num(values.conc, 0);
      const raw = reg * w;
      const dose = round(Math.min(raw, maxD), 2);
      const capped = raw > maxD;
      const vol = conc > 0 ? round(dose / conc, 2) : null;
      return {
        score: dose,
        unit: 'mg',
        label: `Dexamethasone ${dose} mg once`,
        interpretation: `${reg} mg/kg × ${w} kg = ${round(raw, 2)} mg${capped ? ` → capped at ${maxD} mg` : ''}. Single-dose dexamethasone is standard for croup; onset of clinical benefit often within hours. Severe croup may also need nebulized epinephrine.`,
        riskLevel: 'info',
        details: [
          { label: 'Regimen', value: `${reg} mg/kg` },
          { label: 'Calculated', value: `${round(raw, 2)} mg` },
          { label: 'Given dose', value: `${dose} mg` },
          ...(vol != null ? [{ label: 'Volume @ conc', value: `${vol} mL` }] : []),
        ],
        recommendations: [
          'Usually single dose; reassess severity (e.g., Westley)',
          'Add nebulized epinephrine for moderate–severe distress',
          'Observe for rebound after epinephrine',
        ],
      };
    },
    evidence: {
      summary:
        'Dexamethasone 0.15–0.6 mg/kg PO/IM (often max 10 mg) improves croup symptoms; lower doses (0.15 mg/kg) can be effective.',
      formula: 'Dose = min(regimen mg/kg × weight, max cap)',
      validation: 'Supported by RCTs and meta-analyses of glucocorticoids in croup.',
      references: [
        {
          title: 'Glucocorticoids for croup',
          citation: 'Gates A et al. Cochrane Database Syst Rev. 2018',
          year: 2018,
          pmid: '30133690',
          doi: '10.1002/14651858.CD001955.pub4',
        },
        {
          title: 'A randomized trial of a single dose of oral dexamethasone for mild croup',
          citation: 'Bjornson CL et al. N Engl J Med. 2004',
          year: 2004,
          pmid: '15385657',
          doi: '10.1056/NEJMoa033534',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mild croup', actions: ['Dex', 'Supportive care', 'Home if well after observation'] },
      { condition: 'Moderate–severe', actions: ['Dex + nebulized epinephrine', 'Longer observation / admit if needed'] },
    ],
    pearls: [
      'Oral route is preferred when tolerated.',
      'Westley croup score helps track severity separately.',
    ],
  },

  // ─── 15. Pulmonary score ───────────────────────────────────────────────────
  {
    id: 'pulmonary-score',
    name: 'Pediatric Asthma Pulmonary Score',
    shortName: 'Pulmonary Score',
    description:
      'Bedside pediatric asthma severity score using respiratory rate, wheezing, and accessory muscle use (0–9 style pulmonary score).',
    category: 'pediatrics',
    tags: ['asthma', 'pulmonary score', 'wheeze', 'pediatric', 'exacerbation'],
    whenToUse: 'Children with asthma exacerbation to grade severity and response to therapy at the bedside.',
    whyUse: 'Simple three-domain score used in many pediatric ED pathways to standardize mild/moderate/severe labeling.',
    inputs: [
      selectInput('ageBand', 'Age for RR scoring', [
        { label: '<6 years', value: 'young' },
        { label: '≥6 years', value: 'older' },
      ]),
      selectInput('rr', 'Respiratory rate points', [
        { label: 'Normal for age (0)', value: 0 },
        { label: 'Mildly elevated (1)', value: 1 },
        { label: 'Moderately elevated (2)', value: 2 },
        { label: 'Severely elevated (3)', value: 3 },
      ]),
      selectInput('wheeze', 'Wheezing', [
        { label: 'None / end-expiratory only (0)', value: 0 },
        { label: 'Expiratory (1)', value: 1 },
        { label: 'Inspiratory + expiratory (2)', value: 2 },
        { label: 'Diminished breath sounds / quiet chest (3)', value: 3 },
      ]),
      selectInput('accessory', 'Accessory muscle use', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (2)', value: 2 },
        { label: 'Severe (3)', value: 3 },
      ]),
      numberInput('spo2', 'SpO₂ on room air (optional context)', {
        unit: '%',
        min: 50,
        max: 100,
        defaultValue: 96,
        required: false,
      }),
    ],
    calculate(values) {
      const score = num(values.rr) + num(values.wheeze) + num(values.accessory);
      const spo2Provided = !isMissingValue(values.spo2, true);
      const spo2 = num(values.spo2, 0);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild (0–3)',
          interpretation: `Pulmonary score ${score}: mild exacerbation range in many pathways. Continue bronchodilators as needed; consider steroids based on history.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate (4–6)',
          interpretation: `Pulmonary score ${score}: moderate severity. Systemic corticosteroids and frequent bronchodilators typical; reassess score after therapy.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Severe (7–9)',
          interpretation: `Pulmonary score ${score}: severe range. Continuous/nebulized bronchodilators, steroids, adjuncts (MgSO₄ etc.) per pathway; consider escalation of care. Quiet chest can be ominous.`,
        },
      ]);
      let riskLevel = r.riskLevel;
      if (spo2Provided && spo2 < 90 && riskLevel !== 'high') riskLevel = 'high';
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: `${r.interpretation} ${spo2Provided ? `SpO₂ ${spo2}% on RA (context).` : 'SpO₂ not entered.'} Age band for RR norms: ${String(values.ageBand ?? 'young')}.`,
        riskLevel,
        details: [
          { label: 'RR points', value: String(num(values.rr)) },
          { label: 'Wheeze points', value: String(num(values.wheeze)) },
          { label: 'Accessory points', value: String(num(values.accessory)) },
          { label: 'SpO₂', value: spo2Provided ? `${spo2}%` : 'Not entered' },
        ],
        recommendations: [
          'Repeat score after each therapy cycle',
          'Do not undertreat a quiet chest',
          'Follow local asthma pathway / PAS alternatives as used by your site',
        ],
      };
    },
    evidence: {
      summary:
        'The pulmonary score (RR + wheeze + accessory muscles, each 0–3) is a simple bedside asthma severity tool used in pediatric acute care pathways.',
      formula: 'Total = RR (0–3) + wheeze (0–3) + accessory use (0–3)',
      validation: 'Used in clinical pathways and research as a pragmatic severity metric; institutional cutoffs may vary slightly.',
      references: [
        {
          title: 'The pulmonary score: an asthma severity score for children',
          citation: 'Smith SR et al. Acad Emerg Med. 2002',
          year: 2002,
          pmid: '11825832',
          doi: '10.1111/j.1553-2712.2002.tb00223.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['SABA', 'Consider steroids if indicated', 'Discharge planning'] },
      { condition: 'Moderate–severe', actions: ['SABA/ipratropium', 'Systemic steroids', 'Reassess for admit/ICU'] },
    ],
    pearls: [
      'Different from Pediatric Asthma Score (PAS) and PRAM — know your local tool.',
      'Hypoxia upgrades clinical severity regardless of score.',
    ],
  },

  // ─── 16. Scarlet fever helper ──────────────────────────────────────────────
  {
    id: 'scarlet-fever',
    name: 'Scarlet Fever Diagnostic Helper',
    shortName: 'Scarlet Fever',
    description:
      'Checklist-style helper for clinical features of scarlet fever (group A strep with toxin-mediated rash) in children.',
    category: 'infectious-disease',
    tags: ['scarlet fever', 'strep', 'rash', 'group A strep', 'pediatric'],
    whenToUse: 'Pharyngitis with sandpaper rash or suspected scarlet fever.',
    whyUse: 'Organizes classic clinical criteria to support testing and treatment decisions (not a formal validated score).',
    inputs: [
      yesNo('pharyngitis', 'Acute pharyngitis / tonsillitis', 1),
      yesNo('fever', 'Fever', 1),
      yesNo('sandpaper', 'Diffuse sandpaper-like erythematous rash', 2),
      yesNo('pastia', 'Pastia lines (linear petechiae in creases)', 1),
      yesNo('strawberry', 'Strawberry tongue / flushed face with perioral pallor', 1),
      yesNo('desquamation', 'Peeling (often later, hands/feet)', 1),
      yesNo('exposure', 'Known strep exposure or positive RADT/culture', 2),
      yesNo('viralFeatures', 'Prominent viral features (cough, rhinorrhea, conjunctivitis) arguing against strep', -2),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.pharyngitis)) score += 1;
      if (bool(values.fever)) score += 1;
      if (bool(values.sandpaper)) score += 2;
      if (bool(values.pastia)) score += 1;
      if (bool(values.strawberry)) score += 1;
      if (bool(values.desquamation)) score += 1;
      if (bool(values.exposure)) score += 2;
      if (bool(values.viralFeatures)) score -= 2;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low clinical likelihood',
          interpretation: `Helper score ${score}: few classic scarlet fever features. Consider other exanthems; test for strep if pharyngitis criteria met.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Possible scarlet fever',
          interpretation: `Helper score ${score}: intermediate features. Perform RADT/culture; treat if positive or if high clinical concern per guidelines.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High clinical suspicion',
          interpretation: `Helper score ${score}: constellation suggestive of scarlet fever. Confirm GAS when feasible and treat with appropriate antibiotics; counsel on contagion and return precautions (rheumatic fever prevention).`,
        },
      ]);
      return {
        score,
        ...r,
        recommendations: [
          'Throat swab RADT ± culture',
          'First-line penicillin/amoxicillin unless allergic',
          'Consider differential: Kawasaki, viral exanthem, drug rash, TSS',
        ],
      };
    },
    evidence: {
      summary:
        'Scarlet fever is toxin-mediated GAS disease with pharyngitis plus characteristic rash. Diagnosis is clinical ± microbiologic confirmation of GAS.',
      formula: 'Weighted clinical feature checklist (educational)',
      validation: 'Not a validated prediction rule — supports structured clinical reasoning.',
      references: [
        {
          title: 'IDSA guideline for group A streptococcal pharyngitis',
          citation: 'Shulman ST et al. Clin Infect Dis. 2012',
          year: 2012,
          pmid: '23091044',
          doi: '10.1093/cid/cis847',
        },
      ],
    },
    nextSteps: [
      { condition: 'High suspicion or GAS+', actions: ['Antibiotics', 'School return guidance', 'Household counseling'] },
      { condition: 'Low suspicion', actions: ['Broader rash differential', 'Supportive care'] },
    ],
    pearls: [
      'Sandpaper texture and Pastia lines are useful discriminators.',
      'Desquamation may appear during convalescence.',
    ],
  },

  // ─── 17. PIMS / MIS-C ──────────────────────────────────────────────────────
  {
    id: 'pims-ts',
    name: 'PIMS-TS / MIS-C Criteria Helper',
    shortName: 'PIMS-TS',
    description:
      'Simplified educational checklist based on WHO/CDC-style MIS-C (PIMS-TS) criteria: fever, multi-system involvement, inflammation, and SARS-CoV-2 link.',
    category: 'pediatrics',
    tags: ['mis-c', 'pims-ts', 'covid', 'kawasaki', 'pediatric', 'inflammatory'],
    whenToUse: 'Children with prolonged fever and multi-system inflammation when MIS-C / PIMS-TS is in the differential.',
    whyUse: 'Structures key case-definition domains; does not replace formal CDC/WHO definitions or specialist diagnosis.',
    inputs: [
      yesNo('ageOk', 'Age <21 years (CDC) / child-adolescent', 1),
      yesNo('fever', 'Fever ≥3 days (or ≥24 h if in shock — follow local def.)', 1),
      yesNo('inflammation', 'Laboratory inflammation (↑CRP/ESR, neutrophilia, lymphopenia, etc.)', 1),
      yesNo('multiSystem', '≥2 organ systems involved (cardio, mucocutaneous, GI, renal, neuro, heme, resp)', 2),
      yesNo('noAlt', 'No plausible alternative diagnosis fully explaining illness', 1),
      yesNo('covidLink', 'Evidence of SARS-CoV-2 (PCR/Ag/serology) or close exposure', 2),
      yesNo('shockKd', 'Shock, myocardial dysfunction, or Kawasaki-like features', 1),
      yesNo('severe', 'ICU-level illness / vasoactive need / severe organ injury', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.ageOk) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.inflammation) ? 1 : 0) +
        (bool(values.multiSystem) ? 2 : 0) +
        (bool(values.noAlt) ? 1 : 0) +
        (bool(values.covidLink) ? 2 : 0) +
        (bool(values.shockKd) ? 1 : 0) +
        (bool(values.severe) ? 1 : 0);
      const core =
        bool(values.ageOk) &&
        bool(values.fever) &&
        bool(values.inflammation) &&
        bool(values.multiSystem) &&
        bool(values.noAlt) &&
        bool(values.covidLink);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Does not meet simplified helper threshold';
      if (core && (bool(values.shockKd) || bool(values.severe))) {
        riskLevel = 'critical';
        label = 'Meets simplified severe MIS-C / PIMS-TS pattern';
      } else if (core) {
        riskLevel = 'high';
        label = 'Meets simplified MIS-C / PIMS-TS pattern';
      } else if (score >= 4) {
        riskLevel = 'moderate';
        label = 'Partial features — keep MIS-C on differential';
      }
      return {
        score,
        label,
        interpretation: `Educational helper score ${score}. ${
          core
            ? 'Core domains (age, fever, inflammation, multi-system, no alternate, COVID link) are present.'
            : 'Core domains incomplete — MIS-C less likely but not excluded if early or atypical.'
        } Overlaps Kawasaki disease, bacterial sepsis, and other hyperinflammatory states — involve ID/rheumatology/cardiology early.`,
        riskLevel,
        details: [
          { label: 'Core pattern met', value: core ? 'Yes' : 'No' },
          { label: 'Shock/KD features', value: bool(values.shockKd) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'ECG/echo, troponin/BNP, broad labs including inflammatory markers',
          'Empiric sepsis coverage until cultures clarify',
          'Transfer/consult centers experienced with MIS-C therapy (IVIG, steroids, etc.)',
        ],
      };
    },
    evidence: {
      summary:
        'MIS-C (US CDC) / PIMS-TS (UK) are hyperinflammatory syndromes after SARS-CoV-2 with fever, multi-organ involvement, inflammation, and exclusion of other causes.',
      formula: 'Checklist against simplified case-definition domains',
      validation: 'Educational alignment with public health case definitions; formal diagnosis requires clinical judgment and published criteria.',
      references: [
        {
          title: 'CDC MIS-C case definition resources',
          citation: 'US CDC MIS-C',
          year: 2023,
          url: 'https://www.cdc.gov/mis/index.html',
        },
        {
          title: 'WHO preliminary case definition for MIS-C',
          citation: 'World Health Organization',
          year: 2020,
          url: 'https://www.who.int/publications/i/item/multisystem-inflammatory-syndrome-in-children-and-adolescents-with-covid-19',
        },
      ],
    },
    nextSteps: [
      { condition: 'High suspicion', actions: ['Hospitalize', 'Echo/ECG', 'Specialist consults', 'Supportive + immunomodulatory therapy per protocol'] },
      { condition: 'Partial features', actions: ['Close follow-up labs', 'Reassess differential'] },
    ],
    pearls: [
      'GI symptoms and shock are common presentations.',
      'Not all children have positive PCR at illness time — serology/exposure may establish link.',
    ],
  },

  // ─── 18. Orbital cellulitis red flags ──────────────────────────────────────
  {
    id: 'orbital-cellulitis',
    name: 'Orbital Cellulitis Red Flags Checklist',
    shortName: 'Orbital Cellulitis',
    description:
      'Red-flag checklist distinguishing concerning orbital (post-septal) features from preseptal cellulitis patterns in children.',
    category: 'infectious-disease',
    tags: ['orbital cellulitis', 'preseptal', 'eye', 'pediatric', 'ent', 'red flags'],
    whenToUse: 'Periorbital erythema/swelling in a child when differentiating preseptal vs orbital infection risk.',
    whyUse: 'Pain with EOM, proptosis, ophthalmoplegia, and vision change mandate urgent imaging and specialty care.',
    inputs: [
      yesNo('painEom', 'Pain with eye movements', 2),
      yesNo('ophthalmoplegia', 'Limited extraocular movements / diplopia', 2),
      yesNo('proptosis', 'Proptosis', 2),
      yesNo('vision', 'Vision change / relative afferent pupillary defect concern', 2),
      yesNo('chemosis', 'Chemosis / severe conjunctival swelling', 1),
      yesNo('feverToxic', 'Fever or toxic appearance', 1),
      yesNo('sinus', 'Recent/concurrent sinusitis', 1),
      yesNo('bilateral', 'Bilateral findings (consider cavernous sinus thrombosis)', 1),
      yesNo('neuro', 'Headache, vomiting, altered mentation, meningism', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.painEom) ? 2 : 0) +
        (bool(values.ophthalmoplegia) ? 2 : 0) +
        (bool(values.proptosis) ? 2 : 0) +
        (bool(values.vision) ? 2 : 0) +
        (bool(values.chemosis) ? 1 : 0) +
        (bool(values.feverToxic) ? 1 : 0) +
        (bool(values.sinus) ? 1 : 0) +
        (bool(values.bilateral) ? 1 : 0) +
        (bool(values.neuro) ? 2 : 0);
      const hard =
        bool(values.painEom) ||
        bool(values.ophthalmoplegia) ||
        bool(values.proptosis) ||
        bool(values.vision) ||
        bool(values.neuro);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low orbital-feature burden',
          interpretation: `Score ${score}: few orbital red flags. May fit preseptal cellulitis pattern if exam is otherwise reassuring — still use clinical judgment and follow-up.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate concern',
          interpretation: `Score ${score}: mixed features. Low threshold for imaging and ENT/ophthalmology input, especially with fever or sinus disease.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High concern for orbital involvement',
          interpretation: `Score ${score}: multiple red flags for post-septal/orbital disease or complication. Urgent contrast CT (or MRI) orbits/sinuses, IV antibiotics, and specialty consultation are typical.`,
        },
      ]);
      return {
        score,
        label: hard ? 'Orbital red flags present' : r.label,
        interpretation: hard
          ? `Hard orbital/neuro red flags present (score ${score}). Treat as potential orbital cellulitis/complication until imaging and specialists clarify.`
          : r.interpretation,
        riskLevel: hard ? 'critical' : r.riskLevel,
        recommendations: [
          'Do not rely on oral antibiotics alone if orbital signs present',
          'Assess visual acuity and pupils',
          'Consider intracranial complications if neuro signs',
        ],
      };
    },
    evidence: {
      summary:
        'Orbital cellulitis is suggested by pain with EOM, ophthalmoplegia, proptosis, and visual impairment; preseptal disease lacks these globe/orbit signs.',
      formula: 'Weighted red-flag checklist',
      validation: 'Educational checklist based on classic clinical teaching and pediatric ENT/ophthalmology practice.',
      references: [
        {
          title: 'Pediatric orbital cellulitis review / management principles',
          citation: 'Hauser A, Fogarasi S. Pediatr Rev. 2010',
          year: 2010,
          pmid: '20516236',
          doi: '10.1542/pir.31-6-242',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any hard red flag', actions: ['Urgent imaging', 'IV abx', 'Ophtho + ENT', 'Admit'] },
      { condition: 'Likely preseptal, well child', actions: ['Close follow-up', 'Outpatient therapy if appropriate'] },
    ],
    pearls: [
      'Young children can be difficult to examine — err toward imaging if unsure.',
      'Cavernous sinus thrombosis is a rare bilateral/neuro emergency.',
    ],
  },

  // ─── 19. GMSPS ─────────────────────────────────────────────────────────────
  {
    id: 'glasgow-meningococcal',
    name: 'Glasgow Meningococcal Septicemia Prognostic Score (GMSPS)',
    shortName: 'GMSPS',
    description:
      'Prognostic score for meningococcal disease severity using BP, skin/temp difference, coma scale, deterioration, and meningism absence.',
    category: 'infectious-disease',
    tags: ['meningococcal', 'gmsps', 'sepsis', 'purpura', 'pediatric', 'prognosis'],
    whenToUse: 'Children/adolescents with suspected meningococcal septicemia for severity stratification (historical prognostic tool).',
    whyUse: 'GMSPS correlates with mortality risk in classic meningococcal cohorts and highlights ominous exam findings.',
    inputs: [
      yesNo('hypotension', 'BP <75 mmHg systolic if <4 y, or <85 if ≥4 y', 3),
      yesNo('skinTemp', 'Skin–rectal temperature difference >3 °C', 3),
      yesNo('coma', 'Modified coma scale <8 / deeply impaired consciousness', 3),
      yesNo('deterioration', 'Deterioration in the hour before scoring', 2),
      yesNo('absenceMeningism', 'Absence of meningism', 2),
      yesNo('extendingRash', 'Extending purpuric rash (or widespread)', 1),
      yesNo('baseDeficit', 'Base deficit >8 mmol/L (if known)', 1),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.hypotension)) score += 3;
      if (bool(values.skinTemp)) score += 3;
      if (bool(values.coma)) score += 3;
      if (bool(values.deterioration)) score += 2;
      if (bool(values.absenceMeningism)) score += 2;
      if (bool(values.extendingRash)) score += 1;
      if (bool(values.baseDeficit)) score += 1;
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'moderate',
          label: 'Lower GMSPS band (≤5)',
          interpretation: `GMSPS ${score}: lower historic mortality band, but meningococcal disease can progress rapidly — treat aggressively if clinical suspicion is high.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'Intermediate–high (6–8)',
          interpretation: `GMSPS ${score}: substantial severity. Expect ICU-level care needs; early antibiotics, fluids, and organ support.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Very high GMSPS (≥9)',
          interpretation: `GMSPS ${score}: historically associated with very high mortality risk. Maximal resuscitation, senior help, and ICU care immediately.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        recommendations: [
          'Immediate IV/IO antibiotics if meningococcal disease suspected',
          'Do not delay care for full scoring',
          'Public health notification / prophylaxis for contacts as indicated',
        ],
      };
    },
    evidence: {
      summary:
        'GMSPS assigns points for hypotension, skin–core temperature gap, low coma score, rapid deterioration, absent meningism, extending rash, and metabolic acidosis.',
      formula:
        'Hypotension 3 + ΔT>3°C 3 + coma<8 3 + deterioration 2 + no meningism 2 + extending rash 1 + BD>8 1 (max 15)',
      validation: 'Derived/validated in meningococcal septicemia cohorts; modern critical care has improved outcomes but score remains educationally useful.',
      references: [
        {
          title: 'The Glasgow Meningococcal Septicemia Prognostic Score',
          citation: 'Sinclair JF et al. Lancet. 1987; subsequent validations',
          year: 1987,
          pmid: '1898875',
          doi: '10.1097/00003246-199101000-00010',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any suspected meningococcal sepsis', actions: ['Antibiotics now', 'Fluid resuscitation', 'ICU', 'Source investigations'] },
    ],
    pearls: [
      'Absent meningism is common in pure septicemic forms and is a bad actor in the score.',
      'Early antibiotics save lives — score is prognostic, not a gate to treatment.',
    ],
  },

  // ─── 20. Petechiae risk (NICE-style) ───────────────────────────────────────
  {
    id: 'petechiae-risk',
    name: 'Fever with Petechiae Risk (NICE-style Traffic Light)',
    shortName: 'Petechiae Fever',
    description:
      'Simplified NICE-inspired traffic-light helper for children with fever and non-blanching rash / petechiae.',
    category: 'pediatrics',
    tags: ['petechiae', 'purpura', 'fever', 'meningococcal', 'nice', 'pediatric'],
    whenToUse: 'Febrile children with petechiae or purpura when triaging urgency for invasive bacterial disease.',
    whyUse: 'Highlights red features that mandate immediate management versus amber features needing careful evaluation.',
    inputs: [
      yesNo('purpura', 'Purpura / non-blanching rash spreading or large purpuric lesions', 3),
      yesNo('ill', 'Appears ill / toxic / lethargic', 2),
      yesNo('capRefill', 'Capillary refill ≥3 s or cold extremities / shock signs', 3),
      yesNo('neckStiff', 'Neck stiffness, bulging fontanelle, or photophobia', 2),
      yesNo('seizure', 'Seizure or focal neuro signs', 2),
      yesNo('resp', 'Grunting, severe tachypnea, or SpO₂ low', 2),
      yesNo('ageYoung', 'Age <3 months with fever', 2),
      yesNo('localized', 'Petechiae only above nipple line after coughing/vomiting (mechanical)', -1),
      yesNo('wellAppearing', 'Well-appearing, playful, normal vitals', -1),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.purpura)) score += 3;
      if (bool(values.ill)) score += 2;
      if (bool(values.capRefill)) score += 3;
      if (bool(values.neckStiff)) score += 2;
      if (bool(values.seizure)) score += 2;
      if (bool(values.resp)) score += 2;
      if (bool(values.ageYoung)) score += 2;
      if (bool(values.localized)) score -= 1;
      if (bool(values.wellAppearing)) score -= 1;
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Green-leaning (lower immediate concern)',
          interpretation: `Helper score ${score}: fewer red features; mechanical petechiae pattern may apply if well-appearing. Still use local protocols — some systems investigate all fever + non-blanching rash.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Amber — urgent evaluation',
          interpretation: `Helper score ${score}: amber-range concern. Prompt senior review, bloodwork, and low threshold for antibiotics/admission per NICE-style pathways.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Red — treat as emergency',
          interpretation: `Helper score ${score}: red features for possible meningococcal or other invasive disease. Immediate ABC support, senior help, and urgent antibiotics if septic/meningitic picture.`,
        },
      ]);
      return {
        score,
        ...r,
        recommendations: [
          'Any ill child with non-blanching rash: treat as emergency',
          'Do not delay antibiotics for CT/LP when bacterial meningitis/sepsis likely',
          'Document blanching test and rash evolution',
        ],
      };
    },
    evidence: {
      summary:
        'NICE fever-in-under-5s guidance uses traffic-light features; non-blanching rash is a red flag especially with ill appearance or purpura.',
      formula: 'Educational weighted red/amber/green feature sum',
      validation: 'Structured after NICE-style safety-netting concepts; not an official NICE calculator.',
      references: [
        {
          title: 'Fever in under 5s: assessment and initial management (NICE NG143)',
          citation: 'NICE guideline NG143',
          year: 2019,
          url: 'https://www.nice.org.uk/guidance/ng143',
        },
      ],
    },
    nextSteps: [
      { condition: 'Red features', actions: ['Resuscitation bay', 'Antibiotics', 'Cultures', 'ICU/senior'] },
      { condition: 'Amber', actions: ['Urgent labs/observation', 'Shared decision on empiric therapy'] },
    ],
    pearls: [
      'Cough/vomit facial petechiae in a well child are often mechanical — still examine thoroughly.',
      'Rash can evolve over hours; early re-check matters.',
    ],
  },

  // ─── 21. UTI peds ──────────────────────────────────────────────────────────
  {
    id: 'uti-peds',
    name: 'Pediatric UTI Likelihood Checklist',
    shortName: 'Peds UTI',
    description:
      'AAP/NICE-inspired checklist of factors that raise or lower likelihood of UTI in young children with fever or urinary symptoms.',
    category: 'pediatrics',
    tags: ['uti', 'pyelonephritis', 'pediatric', 'fever', 'aap', 'nice'],
    whenToUse: 'Febrile infants/young children or verbal children with urinary symptoms when deciding on urine testing.',
    whyUse: 'Combines age, sex/circumcision, fever pattern, and urinary signs used in pediatric UTI guidelines.',
    inputs: [
      selectInput('age', 'Age group', [
        { label: '≤2 months', value: 'neonate' },
        { label: '2–24 months', value: 'infant' },
        { label: '>24 months', value: 'child' },
      ]),
      selectInput('sexCirc', 'Sex / circumcision', [
        { label: 'Female', value: 'F' },
        { label: 'Male uncircumcised', value: 'Mu' },
        { label: 'Male circumcised', value: 'Mc' },
      ]),
      yesNo('fever', 'Fever (especially ≥39 °C or ≥24–48 h)', 1),
      yesNo('noSource', 'No alternative fever source', 1),
      yesNo('historyUti', 'Prior UTI or known urinary tract anomaly', 2),
      yesNo('urinarySx', 'Dysuria, frequency, urgency, new incontinence (if verbal)', 2),
      yesNo('abdFlank', 'Abdominal or flank pain / suprapubic tenderness', 1),
      yesNo('malodorous', 'Malodorous urine (weak alone)', 1),
      yesNo('ill', 'Ill appearance / vomiting / poor feeding', 1),
    ],
    calculate(values) {
      let score = 0;
      const age = String(values.age ?? 'infant');
      const sex = String(values.sexCirc ?? 'F');
      if (age === 'neonate') score += 3;
      else if (age === 'infant') score += 1;
      if (sex === 'F') score += 1;
      if (sex === 'Mu') score += 2;
      if (bool(values.fever)) score += 1;
      if (bool(values.noSource)) score += 1;
      if (bool(values.historyUti)) score += 2;
      if (bool(values.urinarySx)) score += 2;
      if (bool(values.abdFlank)) score += 1;
      if (bool(values.malodorous)) score += 1;
      if (bool(values.ill)) score += 1;
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower UTI likelihood',
          interpretation: `Helper score ${score}: fewer risk features. Urine testing may still be indicated by age-based protocols (especially young infants).`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate likelihood — test urine',
          interpretation: `Helper score ${score}: intermediate concern. Obtain proper specimen (catheter/SPA in non-toilet-trained; clean-catch when appropriate) for UA + culture.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Higher UTI likelihood',
          interpretation: `Helper score ${score}: multiple features favor UTI. Test and consider empiric therapy after specimen in ill or high-risk infants per guidelines.`,
        },
      ]);
      return {
        score,
        ...r,
        recommendations: [
          'Bag-quality specimen before antibiotics when possible',
          'UA screens; culture confirms in young children',
          'Follow local imaging pathways after febrile UTI',
        ],
      };
    },
    evidence: {
      summary:
        'AAP (2–24 months) and NICE guidance emphasize selective urine testing based on age, sex/circumcision, fever without source, and urinary symptoms.',
      formula: 'Educational risk-feature sum',
      validation: 'Organizes guideline risk concepts; not a single published numeric rule replacing clinical pathways.',
      references: [
        {
          title: 'Urinary Tract Infection: Clinical Practice Guideline for 2–24 month olds',
          citation: 'AAP Subcommittee on UTI. Pediatrics. 2011',
          year: 2011,
          pmid: '21873693',
          doi: '10.1542/peds.2011-1330',
        },
        {
          title: 'NICE NG111 Urinary tract infection in under 16s',
          citation: 'NICE guideline',
          year: 2018,
          url: 'https://www.nice.org.uk/guidance/ng111',
        },
      ],
    },
    nextSteps: [
      { condition: 'Young infant / ill', actions: ['Urgent urine + sepsis evaluation as indicated'] },
      { condition: 'UA suggestive', actions: ['Culture', 'Empiric abx per local resistance'] },
    ],
    pearls: [
      'Bag specimens prevent false positives from bags.',
      'Circumcised boys have lower UTI risk than uncircumcised boys.',
    ],
  },

  // ─── 22. Pneumonia peds severity ───────────────────────────────────────────
  {
    id: 'pneumonia-peds',
    name: 'Pediatric Pneumonia Severity (Modified)',
    shortName: 'Peds PNA Severity',
    description:
      'Educational severity helper for pediatric community-acquired pneumonia using respiratory distress, hypoxia, intake, and systemic features.',
    category: 'pediatrics',
    tags: ['pneumonia', 'severity', 'cap', 'pediatric', 'respiratory'],
    whenToUse: 'Children with clinical/radiographic pneumonia when deciding outpatient vs inpatient vs higher acuity care.',
    whyUse: 'Bundles commonly used severity markers from pediatric CAP guidance (BTS/IDSA-style concepts).',
    inputs: [
      yesNo('hypoxia', 'SpO₂ <92% (or local threshold) on air', 2),
      yesNo('distress', 'Moderate–severe work of breathing / grunting / head bobbing', 2),
      yesNo('rrHigh', 'RR substantially above age normal', 1),
      yesNo('poorIntake', 'Not feeding / dehydrated / unable to take orals', 2),
      yesNo('toxic', 'Toxic appearance, altered mentation, or apnea', 3),
      yesNo('effusion', 'Significant effusion / empyema suspicion', 2),
      yesNo('infant', 'Age <3–6 months (higher risk band)', 1),
      yesNo('comorbid', 'Significant comorbidity (cardiac, chronic lung, immuno)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.hypoxia) ? 2 : 0) +
        (bool(values.distress) ? 2 : 0) +
        (bool(values.rrHigh) ? 1 : 0) +
        (bool(values.poorIntake) ? 2 : 0) +
        (bool(values.toxic) ? 3 : 0) +
        (bool(values.effusion) ? 2 : 0) +
        (bool(values.infant) ? 1 : 0) +
        (bool(values.comorbid) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Mild — often outpatient',
          interpretation: `Severity helper ${score}: mild features. Outpatient care may be suitable if reliable follow-up, tolerating orals, and no hypoxia.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate — consider admission',
          interpretation: `Severity helper ${score}: moderate severity. Hospital admission for oxygen, fluids, observation, or IV therapy often appropriate.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Severe — higher acuity',
          interpretation: `Severity helper ${score}: severe markers present. Continuous monitoring, oxygen, senior review; ICU if fatigue, apnea, refractory hypoxia, or shock.`,
        },
      ]);
      return {
        score,
        ...r,
        recommendations: [
          'Oxygen to target saturations per local guideline',
          'Antibiotics when bacterial CAP likely',
          'Reassess hydration and work of breathing frequently',
        ],
      };
    },
    evidence: {
      summary:
        'Pediatric CAP severity assessments emphasize hypoxia, work of breathing, feeding/hydration, age, and complications rather than adult PSI/CURB alone.',
      formula: 'Weighted clinical severity features (educational)',
      validation: 'Synthesizes BTS/IDSA pediatric CAP severity concepts; cutoffs are pathway-dependent.',
      references: [
        {
          title: 'IDSA/PIDS guidelines for CAP in infants and children',
          citation: 'Bradley JS et al. Clin Infect Dis. 2011',
          year: 2011,
          pmid: '21880587',
          doi: '10.1093/cid/cir531',
        },
        {
          title: 'BTS guidelines for the management of community acquired pneumonia in children',
          citation: 'Harris M et al. Thorax. 2011',
          year: 2011,
          pmid: '21903691',
          doi: '10.1136/thoraxjnl-2011-200598',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['Oral abx if indicated', 'Safety-net advice'] },
      { condition: 'Moderate–severe', actions: ['Admit', 'O₂', 'IV therapy as needed', 'Image if complicated'] },
    ],
    pearls: [
      'Viral pneumonia is common; antibiotics are not automatic.',
      'WHO classification is a related public-health tool — see who-pneumonia.',
    ],
  },

  // ─── 23. WHO pneumonia ─────────────────────────────────────────────────────
  {
    id: 'who-pneumonia',
    name: 'WHO Pediatric Pneumonia Classification',
    shortName: 'WHO Pneumonia',
    description:
      'WHO IMCI-style classification of cough/difficulty breathing into no pneumonia, pneumonia, or severe pneumonia using age-based fast breathing and danger signs.',
    category: 'pediatrics',
    tags: ['who', 'imci', 'pneumonia', 'fast breathing', 'pediatric', 'global health'],
    whenToUse: 'Children 2–59 months with cough or difficult breathing in resource-variable settings using WHO IMCI logic.',
    whyUse: 'Standard global classification driving antibiotic and referral decisions in IMCI programs.',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '2–11 months', value: 'infant' },
        { label: '12–59 months', value: 'child' },
      ]),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 10, max: 120, defaultValue: 50 }),
      yesNo('chestIndrawing', 'Chest indrawing', 1),
      yesNo('danger', 'General danger sign (not able to drink, persistent vomiting, convulsions, lethargy/unconscious, stridor in calm child)', 2),
      yesNo('spo2Low', 'SpO₂ <90% (if pulse oximetry available)', 2),
      yesNo('malnutrition', 'Severe acute malnutrition (context)', 2),
    ],
    calculate(values) {
      const age = String(values.ageBand ?? 'infant');
      const rr = num(values.rr, 50);
      const fast = age === 'infant' ? rr >= 50 : rr >= 40;
      const indraw = bool(values.chestIndrawing);
      const danger =
        bool(values.danger) || bool(values.spo2Low) || bool(values.malnutrition);
      let label = 'Cough/cold (no pneumonia)';
      let score = 0;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (danger || (indraw && danger)) {
        // WHO: general danger signs or oxygen need → severe
        label = 'Severe pneumonia (or very severe disease)';
        score = 2;
        riskLevel = 'critical';
      } else if (indraw || (fast && indraw)) {
        // With 2014 updates, chest indrawing pneumonia may be treated as pneumonia (non-severe) in some algorithms when no danger signs
        label = indraw && !danger ? 'Pneumonia (chest indrawing, no danger signs)' : 'Pneumonia';
        score = 1;
        riskLevel = 'moderate';
        if (fast && indraw) {
          label = 'Pneumonia (fast breathing + indrawing)';
        }
      } else if (fast) {
        label = 'Pneumonia (fast breathing)';
        score = 1;
        riskLevel = 'moderate';
      }
      if (danger) {
        label = 'Severe pneumonia / possible serious bacterial infection';
        score = 2;
        riskLevel = 'critical';
      }
      return {
        score,
        label,
        interpretation: `WHO-style class: ${label}. Age band ${age === 'infant' ? '2–11 mo (fast breathing ≥50)' : '12–59 mo (fast breathing ≥40)'}; RR ${rr}/min (${fast ? 'fast' : 'not fast'}). Chest indrawing: ${indraw ? 'yes' : 'no'}. Danger/O₂/SAM flags: ${danger ? 'yes' : 'no'}. Follow current WHO/IMCI antibiotic and referral charts for your country.`,
        riskLevel,
        details: [
          { label: 'Fast breathing', value: fast ? 'Yes' : 'No' },
          { label: 'Indrawing', value: indraw ? 'Yes' : 'No' },
          { label: 'Danger/O₂/SAM', value: danger ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Severe: urgent referral + pre-referral antibiotics per IMCI',
          'Pneumonia: oral amoxicillin per WHO dosing if no danger signs',
          'Counsel return precautions and hydration',
        ],
      };
    },
    evidence: {
      summary:
        'WHO IMCI classifies childhood pneumonia using age-specific fast-breathing cutoffs, chest indrawing, and general danger signs (with SpO₂ where available).',
      formula: 'Fast breathing (≥50 if 2–11 mo; ≥40 if 12–59 mo) ± indrawing ± danger signs',
      validation: 'Cornerstone of global child-health programs; updates refined management of chest-indrawing pneumonia.',
      references: [
        {
          title: 'Revised WHO classification and treatment of childhood pneumonia at health facilities',
          citation: 'World Health Organization',
          year: 2014,
          url: 'https://www.who.int/publications/i/item/9789241507813',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severe', actions: ['Oxygen if available', 'Referral', 'Pre-referral abx'] },
      { condition: 'Pneumonia', actions: ['Oral amoxicillin', 'Follow-up 3 days'] },
      { condition: 'No pneumonia', actions: ['Supportive care', 'Safety net'] },
    ],
    pearls: [
      'Count RR for a full minute in a calm child.',
      'Stridor in a calm child is a danger sign (not routine viral croup at rest necessarily — assess carefully).',
    ],
  },

  // ─── 24. Malaria severity ──────────────────────────────────────────────────
  {
    id: 'malaria-severity',
    name: 'Severe Malaria Criteria Count (WHO)',
    shortName: 'Severe Malaria',
    description:
      'Counts WHO clinical/laboratory features of severe Plasmodium falciparum malaria for educational severity assessment.',
    category: 'infectious-disease',
    tags: ['malaria', 'severe malaria', 'who', 'falciparum', 'pediatric', 'tropical'],
    whenToUse: 'Confirmed or highly suspected malaria when assessing for severe disease requiring parenteral therapy and intensive support.',
    whyUse: 'Any single WHO severe feature generally defines severe malaria and changes management intensity.',
    inputs: [
      yesNo('impairedConscious', 'Impaired consciousness / coma', 1),
      yesNo('prostration', 'Prostration (unable to sit/stand/walk unassisted)', 1),
      yesNo('multipleSeizure', 'Multiple convulsions (>2 in 24 h)', 1),
      yesNo('acidosis', 'Acidosis / acidotic breathing', 1),
      yesNo('hypoglycemia', 'Hypoglycemia (glucose <40–45 mg/dL / <2.2–2.5 mmol/L)', 1),
      yesNo('anemia', 'Severe anemia (e.g., Hb <5–7 g/dL context-dependent)', 1),
      yesNo('renal', 'Acute kidney injury / oliguria', 1),
      yesNo('jaundice', 'Jaundice with parasite density criteria / significant jaundice', 1),
      yesNo('pulmonary', 'Pulmonary edema / ARDS', 1),
      yesNo('bleeding', 'Significant bleeding / DIC', 1),
      yesNo('shock', 'Shock (compensated or hypotensive)', 1),
      yesNo('hyperparasitemia', 'Hyperparasitemia (threshold by epidemiology/WHO context)', 1),
    ],
    calculate(values) {
      const keys = [
        'impairedConscious',
        'prostration',
        'multipleSeizure',
        'acidosis',
        'hypoglycemia',
        'anemia',
        'renal',
        'jaundice',
        'pulmonary',
        'bleeding',
        'shock',
        'hyperparasitemia',
      ] as const;
      let score = 0;
      for (const k of keys) if (bool(values[k])) score += 1;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'No WHO severe features selected';
      if (score === 0) {
        riskLevel = 'moderate';
        label = 'Uncomplicated pattern (if malaria confirmed without severity features)';
      } else if (score === 1) {
        riskLevel = 'critical';
        label = 'Severe malaria (≥1 WHO feature)';
      } else {
        riskLevel = 'critical';
        label = `Severe malaria — ${score} WHO features`;
      }
      return {
        score,
        unit: 'features',
        label,
        interpretation: `WHO severe malaria feature count = ${score}. ${
          score >= 1
            ? 'Presence of any defining feature indicates severe malaria — parenteral antimalarials (e.g., artesunate), glucose monitoring, and higher-level care.'
            : 'If parasitologically confirmed without these features, manage as uncomplicated malaria with oral therapy per local resistance patterns — reassess frequently for deterioration.'
        }`,
        riskLevel,
        details: [{ label: 'Features positive', value: `${score} / 12` }],
        recommendations: [
          'Confirm species with microscopy/RDT',
          'IV artesunate for severe disease (WHO)',
          'Monitor glucose, fluids, Hb, renal function, consciousness',
        ],
      };
    },
    evidence: {
      summary:
        'WHO defines severe falciparum malaria by clinical and laboratory criteria (coma, prostration, seizures, acidosis, hypoglycemia, severe anemia, renal failure, pulmonary edema, bleeding, shock, hyperparasitemia, etc.).',
      formula: 'Count of present WHO severe features (any one usually suffices)',
      validation: 'WHO severe malaria definitions guide global treatment standards.',
      references: [
        {
          title: 'WHO Guidelines for malaria',
          citation: 'World Health Organization',
          year: 2023,
          url: 'https://www.who.int/publications/i/item/guidelines-for-malaria',
        },
      ],
    },
    nextSteps: [
      { condition: '≥1 severe feature', actions: ['Parenteral artesunate', 'Supportive ICU-capable care', 'Full oral ACT after ≥24 h parenteral when able'] },
      { condition: 'Uncomplicated', actions: ['ACT oral regimen', 'Adherence and return precautions'] },
    ],
    pearls: [
      'Children may present with prostration without deep coma.',
      'Hypoglycemia is common — check glucose early and often.',
    ],
  },

  // ─── 25. Dengue warning signs ──────────────────────────────────────────────
  {
    id: 'dengue-warning',
    name: 'Dengue Warning Signs Checklist',
    shortName: 'Dengue Warning',
    description:
      'WHO dengue warning-sign checklist plus severity markers to stratify outpatient vs hospital observation vs severe dengue pathways.',
    category: 'infectious-disease',
    tags: ['dengue', 'warning signs', 'who', 'arbovirus', 'pediatric', 'tropical'],
    whenToUse: 'Suspected or confirmed dengue during the critical phase when screening for warning signs of progression.',
    whyUse: 'Warning signs identify patients needing medical observation and careful fluid management before shock develops.',
    inputs: [
      yesNo('abdPain', 'Abdominal pain or tenderness', 1),
      yesNo('persistentVomiting', 'Persistent vomiting', 1),
      yesNo('fluidAccum', 'Clinical fluid accumulation (ascites/effusion/edema)', 1),
      yesNo('mucosalBleed', 'Mucosal bleeding', 1),
      yesNo('lethargy', 'Lethargy / restlessness', 1),
      yesNo('liver', 'Liver enlargement >2 cm', 1),
      yesNo('hctRising', 'Lab: rising hematocrit with rapid platelet fall', 1),
      yesNo('shock', 'Shock / narrow pulse pressure / cold clammy skin', 3),
      yesNo('severeBleed', 'Severe bleeding', 3),
      yesNo('organ', 'Severe organ impairment (AST/ALT massive, impaired consciousness, myocarditis, etc.)', 3),
    ],
    calculate(values) {
      const warnings = [
        'abdPain',
        'persistentVomiting',
        'fluidAccum',
        'mucosalBleed',
        'lethargy',
        'liver',
        'hctRising',
      ] as const;
      let warnCount = 0;
      for (const k of warnings) if (bool(values[k])) warnCount += 1;
      const severe =
        (bool(values.shock) ? 1 : 0) +
        (bool(values.severeBleed) ? 1 : 0) +
        (bool(values.organ) ? 1 : 0);
      const score = warnCount + severe * 3;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Dengue without warning signs (group A-style)';
      if (severe >= 1) {
        riskLevel = 'critical';
        label = 'Severe dengue features';
      } else if (warnCount >= 1) {
        riskLevel = warnCount >= 3 ? 'high' : 'moderate';
        label = `Dengue with warning signs (${warnCount})`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation: `WHO-style assessment: ${warnCount} warning sign(s); severe domains positive: ${severe}. ${
          severe >= 1
            ? 'Manage as severe dengue with emergency fluids/organ support per WHO.'
            : warnCount >= 1
              ? 'Hospital observation and monitored crystalloid therapy typically indicated (group B).'
              : 'If diagnosis likely and patient tolerating orals with good urine output, outpatient care with daily review may be possible (group A) — local protocols apply.'
        }`,
        riskLevel,
        details: [
          { label: 'Warning signs', value: String(warnCount) },
          { label: 'Severe domains', value: String(severe) },
        ],
        recommendations: [
          'Avoid NSAIDs; use acetaminophen carefully',
          'Serial HCT/platelets in critical phase',
          'Cautious IV fluids — watch for fluid overload',
        ],
      };
    },
    evidence: {
      summary:
        'WHO dengue guidance classifies dengue ± warning signs and severe dengue (shock, severe bleeding, organ failure). Warning signs include abdominal pain, persistent vomiting, fluid accumulation, mucosal bleed, lethargy, hepatomegaly, and HCT rise with falling platelets.',
      formula: 'Count warning signs; flag severe domains separately',
      validation: 'Aligned with WHO dengue handbook case classification used worldwide.',
      references: [
        {
          title: 'Dengue: guidelines for diagnosis, treatment, prevention and control',
          citation: 'World Health Organization',
          year: 2009,
          url: 'https://www.who.int/publications/i/item/9789241547871',
        },
      ],
    },
    nextSteps: [
      { condition: 'Warning signs', actions: ['Admit/observe', 'Monitored fluids', 'Labs q interval'] },
      { condition: 'Severe dengue', actions: ['Emergency resuscitation per WHO', 'ICU', 'Blood products if indicated'] },
      { condition: 'No warning signs, well', actions: ['Home care advice', 'Daily follow-up in critical window'] },
    ],
    pearls: [
      'Critical phase often around defervescence — do not be falsely reassured by fever resolving.',
      'Over-resuscitation causes pulmonary edema.',
    ],
  },
];
