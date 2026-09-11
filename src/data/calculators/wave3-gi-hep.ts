import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave3GiHepCalcs: Calculator[] = [
  {
    id: 'meld-xi',
    name: 'MELD-XI Score',
    shortName: 'MELD-XI',
    description: 'MELD excluding INR — useful when anticoagulation invalidates INR-based MELD.',
    category: 'gastroenterology',
    tags: ['meld', 'cirrhosis', 'transplant', 'anticoagulation', 'prognosis'],
    whenToUse: 'End-stage liver disease prognosis when INR is unreliable (warfarin, DOAC, DIC) or unavailable.',
    whyUse: 'Retains bilirubin and creatinine prognostic information without coagulation; educational alternative to full MELD/MELD-Na.',
    inputs: [
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 2.0 }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.1, defaultValue: 1.0 }),
      yesNo('dialysis', 'Dialysis ≥2 times in past week (or continuous RRT)', 17, 'Sets creatinine to 4.0 mg/dL (does not add a fixed point total). Same dialysis rule as OPTN MELD.'),
    ],
    calculate(values) {
      let bili = Math.max(num(values.bili, 2), 1);
      let cr = Math.max(num(values.creat, 1), 1);
      if (bool(values.dialysis) || cr > 4) cr = 4;
      // Heuman et al. / common MELD-XI form
      const raw = round(5.11 * Math.log(bili) + 11.76 * Math.log(cr) + 9.44, 0);
      const score = Math.max(6, Math.min(40, raw));
      const r = riskFromThresholds(score, [
        { max: 9, level: 'low', label: 'Lower risk band', interpretation: 'Lower MELD-XI — relatively lower short-term mortality historically, but clinical context still rules.' },
        { max: 19, level: 'moderate', label: 'Intermediate', interpretation: 'Intermediate risk — specialist involvement and complication management often needed.' },
        { max: 29, level: 'high', label: 'High', interpretation: 'High short-term mortality risk without advanced support/transplant pathways.' },
        { max: 40, level: 'critical', label: 'Very high', interpretation: 'Very high risk band — urgent hepatology/transplant center input if candidate.' },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Bilirubin used', value: `${round(bili, 1)} mg/dL (floor 1.0)` },
          { label: 'Creatinine used', value: `${round(cr, 1)} mg/dL (floor 1.0, cap 4.0)` },
        ],
      };
    },
    evidence: {
      summary: 'MELD-XI = 5.11×ln(bilirubin) + 11.76×ln(creatinine) + 9.44; labs floored at 1.0 mg/dL; Cr capped at 4 with dialysis. Capped ~6–40 like MELD for display.',
      formula: 'MELD-XI = 5.11 × ln(bili) + 11.76 × ln(Cr) + 9.44',
      validation: 'Derived for patients on anticoagulation where INR is uninterpretable; correlates with outcomes but is not the UNOS allocation score.',
      references: [
        {
          title: 'MELD-XI: a rational approach to “sickest first” liver transplantation in patients with anticoagulants',
          citation: 'Heuman DM et al. Liver Transpl. 2007',
          year: 2007,
          pmid: '17154400',
          doi: '10.1002/lt.20906',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated MELD-XI', actions: ['Manage decompensation', 'Transplant evaluation if candidate', 'Do not use alone for listing priority'] },
      { condition: 'On anticoagulants', actions: ['Prefer MELD-XI or clinical judgment over INR-driven MELD', 'Address reversible renal injury'] },
    ],
    pearls: [
      'Not interchangeable with MELD or MELD-Na for organ allocation.',
      'Bilirubin and creatinine must be in mg/dL (convert SI units first).',
    ],
  },

  {
    id: 'peld-score',
    name: 'PELD Score',
    shortName: 'PELD',
    description: 'Pediatric End-Stage Liver Disease score for children under 12 years.',
    category: 'gastroenterology',
    tags: ['peld', 'pediatric', 'transplant', 'liver', 'prognosis'],
    whenToUse: 'Children <12 years with chronic liver disease for prognosis / transplant prioritization context.',
    whyUse: 'Age-appropriate counterpart to MELD using bilirubin, INR, albumin, age <1 year, and growth failure.',
    inputs: [
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 3.0 }),
      numberInput('inr', 'INR', { min: 0.8, max: 20, step: 0.1, defaultValue: 1.5 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 3.0 }),
      yesNo('ageUnder1', 'Age < 1 year', 4),
      yesNo('growthFailure', 'Growth failure (<2 SD height or weight for age)', 7, 'Yes if height or weight is more than 2 standard deviations below the age- and sex-specific mean (CDC/WHO charts).'),
    ],
    calculate(values) {
      // OPTN-style floors: bilirubin, INR, and albumin values <1.0 are set to 1.0
      const bili = Math.max(num(values.bili, 3), 1.0);
      const inr = Math.max(num(values.inr, 1.5), 1.0);
      const alb = Math.max(num(values.albumin, 3), 1.0);
      const ageF = bool(values.ageUnder1) ? 1 : 0;
      const gf = bool(values.growthFailure) ? 1 : 0;
      // PELD = 10 × [0.480×ln(bili) + 1.857×ln(INR) − 0.687×ln(albumin) + 0.436×age<1 + 0.667×growth failure]
      const raw =
        10 *
        (0.48 * Math.log(bili) +
          1.857 * Math.log(inr) -
          0.687 * Math.log(alb) +
          0.436 * ageF +
          0.667 * gf);
      const score = round(Math.max(0, raw), 0);
      const r = riskFromThresholds(score, [
        { max: 10, level: 'low', label: 'Lower PELD', interpretation: 'Lower calculated PELD — still integrate growth, complications, and center policy.' },
        { max: 20, level: 'moderate', label: 'Intermediate PELD', interpretation: 'Intermediate priority/mortality risk band; transplant center involvement typical.' },
        { max: 30, level: 'high', label: 'High PELD', interpretation: 'High score — significant waitlist mortality risk historically.' },
        { max: 100, level: 'critical', label: 'Very high PELD', interpretation: 'Very high PELD — urgent transplant pathways and exception review as applicable.' },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Age <1 factor', value: ageF ? 'Yes (+0.436×10)' : 'No' },
          { label: 'Growth failure', value: gf ? 'Yes (+0.667×10)' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'PELD = 10×[0.480×ln(bili) + 1.857×ln(INR) − 0.687×ln(albumin) + 0.436 if age<1 + 0.667 if growth failure]. Labs in mg/dL and g/dL.',
      formula: 'PELD = 10 × (0.480 ln bili + 1.857 ln INR − 0.687 ln albumin + age/growth terms)',
      validation: 'Used in pediatric liver allocation frameworks (with policy updates and exception scores). Educational tool — confirm current OPTN/center rules.',
      references: [
        {
          title: 'Development of a pediatric end-stage liver disease score',
          citation: 'McDiarmid SV et al. Transplantation. 2002',
          year: 2002,
          pmid: '12151728',
          doi: '10.1097/00007890-200207270-00006',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated PELD or decompensation', actions: ['Pediatric transplant center referral', 'Nutrition and growth support', 'Manage portal HTN complications'] },
      { condition: 'Growth failure', actions: ['Dietitian involvement', 'Document serial anthropometrics for listing'] },
    ],
    pearls: [
      'For age ≥12 years, adult MELD/MELD-Na frameworks generally apply.',
      'Listing may use calculated PELD plus exception points — this is not an allocation API.',
    ],
  },

  {
    id: 'ukeld',
    name: 'UKELD Score',
    shortName: 'UKELD',
    description: 'United Kingdom End-Stage Liver Disease score for transplant selection and prognosis.',
    category: 'gastroenterology',
    tags: ['ukeld', 'transplant', 'cirrhosis', 'uk', 'prognosis'],
    whenToUse: 'Adult chronic liver disease when estimating transplant benefit using UK-style labs (includes sodium).',
    whyUse: 'UK listing threshold historically UKELD ≥49; incorporates INR, creatinine, bilirubin, and sodium.',
    inputs: [
      numberInput('inr', 'INR', { min: 0.8, max: 20, step: 0.1, defaultValue: 1.5 }),
      numberInput('creat', 'Creatinine', { unit: 'µmol/L', min: 20, max: 1000, step: 1, defaultValue: 90, helpText: 'SI units — mg/dL × 88.4' }),
      numberInput('bili', 'Total bilirubin', { unit: 'µmol/L', min: 1, max: 1000, step: 1, defaultValue: 50, helpText: 'SI units — mg/dL × 17.1' }),
      numberInput('na', 'Serum sodium', { unit: 'mmol/L', min: 110, max: 150, step: 1, defaultValue: 135 }),
    ],
    calculate(values) {
      const inr = Math.max(num(values.inr, 1.5), 0.8);
      const creat = Math.max(num(values.creat, 90), 1);
      const bili = Math.max(num(values.bili, 50), 1);
      const na = Math.max(num(values.na, 135), 1);
      // UKELD = 5.395×ln(INR) + 1.485×ln(creat µmol/L) + 3.13×ln(bili µmol/L) − 81.565×ln(Na) + 435
      const score = round(
        5.395 * Math.log(inr) + 1.485 * Math.log(creat) + 3.13 * Math.log(bili) - 81.565 * Math.log(na) + 435,
        1
      );
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Below typical UK listing threshold';
      let interpretation =
        'UKELD <49: historically below the minimum UK transplant listing threshold (confirm current NHSBT policy). Still manage decompensation.';
      if (score >= 60) {
        riskLevel = 'critical';
        label = 'Very high UKELD';
        interpretation = 'UKELD ≥60: very high short-term mortality risk — urgent transplant center management.';
      } else if (score >= 49) {
        riskLevel = 'high';
        label = 'Meets classic listing threshold (≥49)';
        interpretation = 'UKELD ≥49: classically meets UK minimum listing criterion if otherwise a transplant candidate; integrate contraindications and center policy.';
      } else if (score >= 45) {
        riskLevel = 'moderate';
        label = 'Approaching listing threshold';
        interpretation = 'UKELD 45–48.9: approaching historical listing cut-off — optimize reversible factors and reassess.';
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Creatinine', value: `${round(creat, 0)} µmol/L` },
          { label: 'Bilirubin', value: `${round(bili, 0)} µmol/L` },
          { label: 'Sodium', value: `${round(na, 0)} mmol/L` },
        ],
      };
    },
    evidence: {
      summary: 'UKELD uses natural logs of INR, creatinine (µmol/L), bilirubin (µmol/L), and sodium. Listing threshold historically ≥49.',
      formula: 'UKELD = 5.395 ln(INR) + 1.485 ln(Cr) + 3.13 ln(bili) − 81.565 ln(Na) + 435',
      validation: 'Developed for UK liver allocation; predicts waitlist mortality. Policy thresholds can change — educational use.',
      references: [
        {
          title: 'Elective liver transplant list mortality: development of a United Kingdom end-stage liver disease score',
          citation: 'Barber K et al. Transplantation. 2011',
          year: 2011,
          pmid: '21775931',
          doi: '10.1097/TP.0b013e318225db4d',
        },
      ],
    },
    nextSteps: [
      { condition: 'UKELD ≥49', actions: ['Transplant assessment if candidate', 'Manage ascites, encephalopathy, varices', 'Address hyponatremia carefully'] },
      { condition: 'UKELD <49', actions: ['Optimize disease-specific therapy', 'Serial UKELD if progressive disease'] },
    ],
    pearls: [
      'Use µmol/L for bili/creatinine (not mg/dL) — convert before entry.',
      'Hyponatremia strongly increases UKELD; correct lab/artifact Na carefully.',
    ],
  },

  {
    id: 'clif-c-aclf',
    name: 'CLIF-C ACLF Score (Simplified)',
    shortName: 'CLIF-C ACLF',
    description: 'Educational CLIF Consortium ACLF score from organ-failure sum, age, and WBC.',
    category: 'gastroenterology',
    tags: ['aclf', 'cirrhosis', 'clif', 'icu', 'prognosis'],
    whenToUse: 'Hospitalized cirrhosis with acute-on-chronic liver failure for mortality risk estimate.',
    whyUse: 'Prognostic score for ACLF severity; complements CLIF-OF/CLIF-SOFA organ grading.',
    inputs: [
      numberInput('clifOfs', 'CLIF organ failure score (CLIF-OFs sum)', {
        min: 6,
        max: 18,
        step: 1,
        defaultValue: 8,
        helpText: 'Sum of 6 organ scores (each typically 1–3); use CLIF-SOFA tool if needed',
      }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 55 }),
      numberInput('wbc', 'White blood cell count', { unit: '×10⁹/L', min: 0.5, max: 100, step: 0.1, defaultValue: 8 }),
    ],
    calculate(values) {
      const ofs = num(values.clifOfs, 8);
      const age = num(values.age, 55);
      const wbc = Math.max(num(values.wbc, 8), 0.1);
      // CLIF-C ACLFs = 10 × [0.33×CLIF-OFs + 0.04×Age + 0.63×ln(WBC) − 2]
      const score = round(10 * (0.33 * ofs + 0.04 * age + 0.63 * Math.log(wbc) - 2), 0);
      const r = riskFromThresholds(score, [
        {
          max: 39,
          level: 'moderate',
          label: 'Lower ACLF mortality band',
          interpretation: 'Lower CLIF-C ACLF — still high illness severity vs compensated cirrhosis; supportive care and reverse triggers.',
        },
        {
          max: 49,
          level: 'high',
          label: 'Intermediate–high risk',
          interpretation: 'Intermediate CLIF-C ACLF — substantial 28-day mortality in derivation cohorts; ICU-capable care often appropriate.',
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk',
          interpretation: 'High CLIF-C ACLF — very high short-term mortality; goals of care and transplant futility discussions as relevant.',
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'CLIF-OFs', value: String(ofs) },
          { label: 'WBC', value: `${wbc} ×10⁹/L` },
        ],
      };
    },
    evidence: {
      summary: 'CLIF-C ACLF = 10×[0.33×CLIF-OFs + 0.04×age + 0.63×ln(WBC) − 2]. Educational implementation — confirm organ grades with CLIF definitions.',
      formula: 'CLIF-C ACLFs = 10 × (0.33×CLIF-OFs + 0.04×Age + 0.63×ln(WBC) − 2)',
      validation: 'CANONIC study / EASL-CLIF consortium; predicts 28-day mortality in ACLF better than MELD in many cohorts.',
      references: [
        {
          title: 'Development and validation of a prognostic score to predict mortality in patients with acute-on-chronic liver failure',
          citation: 'Jalan R et al. J Hepatol. 2014',
          year: 2014,
          pmid: '24950482',
          doi: '10.1016/j.jhep.2014.06.012',
        },
      ],
    },
    nextSteps: [
      { condition: 'ACLF suspected', actions: ['Grade organ failures (CLIF-OF)', 'Treat precipitant (infection, bleed, alcohol, DILI)', 'ICU as needed', 'Early transplant discussion if candidate'] },
    ],
    pearls: [
      'Requires accurate CLIF-OFs first — do not plug arbitrary organ counts.',
      'WBC is a key inflammatory component of the score.',
    ],
  },

  {
    id: 'clif-sofa',
    name: 'CLIF-SOFA / CLIF-OF (Simplified Sum)',
    shortName: 'CLIF-SOFA',
    description: 'Simplified organ-score sum for ACLF grading (liver, kidney, brain, coag, circulation, respiration).',
    category: 'gastroenterology',
    tags: ['clif', 'sofa', 'aclf', 'organ failure', 'cirrhosis'],
    whenToUse: 'Bedside educational grading of organ dysfunction in decompensated cirrhosis / ACLF workup.',
    whyUse: 'Organ-failure count and severity define ACLF grades and feed CLIF-C ACLF.',
    inputs: [
      selectInput('liver', 'Liver (bilirubin)', [
        { label: 'Bili <6 mg/dL (1)', value: 1, description: '<6 mg/dL (≈ <102 µmol/L)' },
        { label: 'Bili 6–12 mg/dL (2)', value: 2, description: '6–12 mg/dL (≈ 102–204 µmol/L)' },
        { label: 'Bili >12 mg/dL (3)', value: 3, description: '>12 mg/dL (≈ >204 µmol/L) — liver failure-level in this simplified CLIF-OF' },
      ], 1, '6 mg/dL ≈ 102 µmol/L; 12 mg/dL ≈ 204 µmol/L. Use same-day total bilirubin.'),
      selectInput('kidney', 'Kidney (creatinine / RRT)', [
        { label: 'Cr <2 mg/dL (1)', value: 1, description: '<2 mg/dL (≈ <177 µmol/L), not on RRT' },
        { label: 'Cr 2–3.5 mg/dL (2)', value: 2, description: '2–3.5 mg/dL (≈ 177–309 µmol/L)' },
        { label: 'Cr >3.5 or RRT (3)', value: 3, description: '>3.5 mg/dL (≈ >309 µmol/L) or any renal replacement therapy' },
      ], 1, '2 mg/dL ≈ 177 µmol/L; 3.5 mg/dL ≈ 309 µmol/L. Any RRT scores 3 even if Cr is lower.'),
      selectInput('brain', 'Brain (HE grade, West Haven)', [
        { label: 'HE 0 (1)', value: 1, description: 'West Haven 0: no encephalopathy — normal consciousness, orientation, and behavior' },
        { label: 'HE I–II (2)', value: 2, description: 'I: trivial unawareness, euphoria/anxiety, shortened attention, impaired addition. II: lethargy/apathy, time disorientation, personality change, inappropriate behavior, asterixis' },
        { label: 'HE III–IV (3)', value: 3, description: 'III: somnolence/semistupor, responsive to voice, confusion, gross disorientation. IV: coma (unresponsive to verbal or noxious stimuli)' },
      ], 1, 'Grade with West Haven: 0 none; I trivial unawareness/euphoria/short attention/impaired addition; II lethargy, time disorientation, personality change, asterixis; III somnolence/semistupor, responsive to voice, gross disorientation; IV coma.'),
      selectInput('coag', 'Coagulation (INR)', [
        { label: 'INR <2.0 (1)', value: 1, description: 'INR <2.0' },
        { label: 'INR 2.0–2.5 (2)', value: 2, description: 'INR 2.0–2.5' },
        { label: 'INR >2.5 (3)', value: 3, description: 'INR >2.5 — coagulation failure-level in this simplified CLIF-OF' },
      ], 1, 'Use the same-day INR (not PT seconds).'),
      selectInput('circ', 'Circulation (MAP / vasopressors)', [
        { label: 'MAP ≥70, no pressors (1)', value: 1, description: 'MAP ≥70 mmHg without vasopressors or terlipressin' },
        { label: 'MAP <70 (2)', value: 2, description: 'MAP <70 mmHg, not yet on vasopressors' },
        { label: 'Vasopressors (3)', value: 3, description: 'Any vasopressor including norepinephrine, vasopressin, or terlipressin — circulatory failure-level' },
      ], 1, 'MAP = DBP + (SBP−DBP)/3 if not displayed. Any vasopressor (including terlipressin) scores 3 even if MAP is ≥70.'),
      selectInput('resp', 'Respiration (PaO₂/FiO₂ or SpO₂/FiO₂)', [
        { label: 'PaO₂/FiO₂ >300 (1)', value: 1, description: 'Or SpO₂/FiO₂ >357 when no ABG' },
        { label: 'PaO₂/FiO₂ 200–300 (2)', value: 2, description: 'Or SpO₂/FiO₂ 215–357 when no ABG' },
        { label: 'PaO₂/FiO₂ <200 or ventilated (3)', value: 3, description: 'Or SpO₂/FiO₂ ≤214 when no ABG; mechanical ventilation scores 3' },
      ], 1, 'If no ABG, use SpO₂/FiO₂: >357 (1), 215–357 (2), ≤214 (3). Mechanical ventilation scores 3.'),
    ],
    calculate(values) {
      const organs = ['liver', 'kidney', 'brain', 'coag', 'circ', 'resp'] as const;
      const scores = organs.map((k) => num(values[k], 1));
      const sum = scores.reduce((a, b) => a + b, 0);
      // Simplified organ failure = score ≥3 in that organ (CLIF-style educational)
      const failures = scores.filter((s) => s >= 3).length;
      let aclfGrade = 'No ACLF by simplified OF count';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation =
        'Fewer than 2 simplified organ failures — may still be acute decompensation; use full CLIF definitions and clinical judgment.';
      if (failures >= 3) {
        aclfGrade = 'ACLF grade 3 (simplified)';
        riskLevel = 'critical';
        interpretation = '≥3 organ failures (score ≥3 each) — ACLF-3 range with very high short-term mortality.';
      } else if (failures === 2) {
        aclfGrade = 'ACLF grade 2 (simplified)';
        riskLevel = 'high';
        interpretation = '2 organ failures — ACLF-2 range; aggressive support and precipitant control.';
      } else if (failures === 1) {
        // Single kidney failure or single non-kidney with kidney dysfunction nuances omitted for education
        aclfGrade = 'Possible ACLF grade 1 (simplified)';
        riskLevel = 'moderate';
        interpretation =
          '1 organ at failure-level score — may meet ACLF-1 depending on which organ and renal dysfunction criteria; verify full EASL-CLIF rules.';
      }
      return {
        score: sum,
        unit: 'CLIF-OFs sum',
        label: aclfGrade,
        interpretation,
        riskLevel,
        details: [
          { label: 'Organ failures (score ≥3)', value: `${failures} / 6` },
          { label: 'Use sum in CLIF-C ACLF', value: String(sum) },
        ],
        recommendations: [
          'Treat infection early (common precipitant)',
          'Avoid nephrotoxins; assess HRS-AKI pathways',
          'Consider CLIF-C ACLF score next',
        ],
      };
    },
    evidence: {
      summary: 'Simplified CLIF organ scores 1–3 per system; sum approximates CLIF-OFs. Organ failure often score 3. Full CLIF-SOFA uses finer 0–4 grades in original descriptions.',
      formula: 'CLIF-OFs ≈ sum of 6 organ scores; ACLF grade by number of failures',
      validation: 'Based on EASL-CLIF CANONIC framework (educational simplification of cut-points).',
      references: [
        {
          title: 'Acute-on-chronic liver failure is a distinct syndrome that develops in patients with acute decompensation of cirrhosis',
          citation: 'Moreau R et al. Gastroenterology. 2013',
          year: 2013,
          pmid: '23474284',
          doi: '10.1053/j.gastro.2013.02.042',
        },
      ],
    },
    nextSteps: [
      { condition: '≥2 organ failures', actions: ['ICU-level care', 'Precipitant workup', 'CLIF-C ACLF mortality estimate', 'Transplant vs futility discussion'] },
      { condition: '0–1 failure', actions: ['Close monitoring', 'Re-grade serially', 'Manage decompensation'] },
    ],
    pearls: [
      'This is a teaching simplification — formal CLIF-OF tables have additional cut-points.',
      'Single renal failure with creatinine 1.5–1.9 plus another organ can define ACLF-1 in full criteria.',
    ],
  },

  {
    id: 'abic-score',
    name: 'ABIC Score (Alcoholic Hepatitis)',
    shortName: 'ABIC',
    description: 'Age-Bilirubin-INR-Creatinine score for 90-day mortality in alcoholic hepatitis.',
    category: 'gastroenterology',
    tags: ['alcoholic hepatitis', 'abic', 'prognosis', 'liver'],
    whenToUse: 'Confirmed or probable alcoholic hepatitis for risk stratification (complements Maddrey, GAHS, MELD).',
    whyUse: 'Continuous score with low/intermediate/high 90-day mortality strata.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 50 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 10 }),
      numberInput('inr', 'INR', { min: 0.8, max: 10, step: 0.1, defaultValue: 1.8 }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const bili = num(values.bili, 10);
      const inr = num(values.inr, 1.8);
      const creat = num(values.creat, 1.0);
      // ABIC = (age×0.1) + (bilirubin×0.08) + (creatinine×0.3) + (INR×0.8)
      const score = round(age * 0.1 + bili * 0.08 + creat * 0.3 + inr * 0.8, 2);
      let label = 'Low risk';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation = 'ABIC <6.71: low risk of 90-day mortality in original strata (~0% in derivation low-risk group — still treat supportively).';
      if (score > 9.0) {
        label = 'High risk';
        riskLevel = 'high';
        interpretation = 'ABIC >9.0: high 90-day mortality risk — consider specialist care, infection screen, nutrition, and treatment pathways (steroids if eligible).';
      } else if (score >= 6.71) {
        label = 'Intermediate risk';
        riskLevel = 'moderate';
        interpretation = 'ABIC 6.71–9.0: intermediate 90-day mortality — close monitoring; integrate Maddrey/MELD/GAHS for therapy decisions.';
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Cutoffs', value: '<6.71 low · 6.71–9.0 intermediate · >9.0 high' }],
      };
    },
    evidence: {
      summary: 'ABIC = (age×0.1) + (bilirubin mg/dL ×0.08) + (creatinine mg/dL ×0.3) + (INR×0.8). Strata at 6.71 and 9.0.',
      formula: 'ABIC = 0.1×age + 0.08×bili + 0.3×Cr + 0.8×INR',
      validation: 'Dominguez et al.; predicts 90-day mortality in alcoholic hepatitis.',
      references: [
        {
          title: 'A new scoring system for prognostic stratification of patients with alcoholic hepatitis',
          citation: 'Dominguez M et al. Am J Gastroenterol. 2008',
          year: 2008,
          pmid: '18721242',
          doi: '10.1111/j.1572-0241.2008.02104.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Intermediate–high ABIC', actions: ['Rule out infection', 'Nutrition support', 'Calculate Maddrey/MELD', 'Steroid candidacy if severe'] },
      { condition: 'Low ABIC', actions: ['Supportive care', 'Alcohol cessation', 'Monitor trajectory'] },
    ],
    pearls: ['Use mg/dL for bilirubin and creatinine.', 'ABIC is prognostic — treatment decisions often still use DF ≥32 + Lille.'],
  },

  {
    id: 'arr',
    name: 'AST/ALT Ratio (De Ritis)',
    shortName: 'AST/ALT',
    description: 'De Ritis ratio — AST divided by ALT for pattern of liver injury / fibrosis clue.',
    category: 'gastroenterology',
    tags: ['ast', 'alt', 'fibrosis', 'alcohol', 'liver'],
    whenToUse: 'Interpreting aminotransferase pattern in suspected alcoholic liver disease, cirrhosis, or mixed injury.',
    whyUse: 'Ratio >1 (especially >2) supports alcohol-related injury or advanced fibrosis; <1 common in viral/NAFLD hepatitis without cirrhosis.',
    inputs: [
      numberInput('ast', 'AST', { unit: 'U/L', min: 1, max: 10000, defaultValue: 80 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 1, max: 10000, defaultValue: 40 }),
    ],
    calculate(values) {
      const ast = num(values.ast, 80);
      const alt = Math.max(num(values.alt, 40), 0.01);
      const ratio = round(ast / alt, 2);
      let label = 'ALT-predominant (ratio <1)';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation =
        'AST/ALT <1: common in viral hepatitis, NAFLD/MASLD without advanced fibrosis, and many acute hepatitides. Not diagnostic alone.';
      if (ratio >= 2) {
        label = 'Strongly AST-predominant (≥2)';
        riskLevel = 'high';
        interpretation =
          'AST/ALT ≥2: more specific for alcoholic hepatitis/ALD pattern (with clinical context). Also consider cirrhosis, ischemic hepatitis recovery phase, or muscle source of AST.';
      } else if (ratio >= 1) {
        label = 'AST-predominant (1–1.99)';
        riskLevel = 'moderate';
        interpretation =
          'AST/ALT ≥1: may suggest progressive fibrosis/cirrhosis, alcohol, or other AST sources. Correlate with platelets, elastography, and history.';
      }
      return {
        score: ratio,
        unit: 'ratio',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'AST', value: `${ast} U/L` },
          { label: 'ALT', value: `${alt} U/L` },
        ],
      };
    },
    evidence: {
      summary: 'De Ritis ratio = AST/ALT. Classic teaching: >2 favors alcoholic hepatitis; rising ratio may track fibrosis.',
      formula: 'AST/ALT ratio',
      validation: 'Pattern recognition aid with limited specificity; always integrate full clinical picture.',
      references: [
        {
          title: 'Anicteric virus hepatitis in a closed environment as shown by serum transaminase activity',
          citation: 'De Ritis F, Coltorti M, Giusti G. Bull World Health Organ. 1959',
          year: 1959, pmid: '13814987' },
      ],
    },
    nextSteps: [
      { condition: 'Ratio ≥2 + heavy alcohol', actions: ['Evaluate for alcoholic hepatitis', 'DF/MELD/ABIC as indicated', 'Nutrition and cessation support'] },
      { condition: 'Any abnormal pattern', actions: ['Exclude ischemia, rhabdo, meds', 'Fibrosis assessment if chronic disease'] },
    ],
    pearls: [
      'Ischemic hepatitis often has huge AST/ALT with LDH elevation.',
      'Muscle disease raises AST (and CK) without true hepatitis.',
    ],
  },

  {
    id: 'aasld-ascites',
    name: 'SAAG (Serum-Ascites Albumin Gradient)',
    shortName: 'SAAG',
    description: 'Classifies ascites as portal hypertensive vs non–portal hypertensive by SAAG.',
    category: 'gastroenterology',
    tags: ['ascites', 'saag', 'portal hypertension', 'paracentesis', 'aasld'],
    whenToUse: 'After diagnostic paracentesis when serum and ascites albumin are available.',
    whyUse: 'SAAG ≥1.1 g/dL indicates portal hypertension with high accuracy; guides differential and therapy.',
    inputs: [
      numberInput('serumAlb', 'Serum albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 2.8, helpText: 'Draw the same day as paracentesis' }),
      numberInput('ascitesAlb', 'Ascites albumin', { unit: 'g/dL', min: 0.1, max: 6, step: 0.1, defaultValue: 1.0 }),
      numberInput('ascitesProtein', 'Ascites total protein (optional)', {
        unit: 'g/dL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1.5,
        helpText: 'Helps cardiac vs cirrhotic high-SAAG differential',
        required: false,
      }),
    ],
    calculate(values) {
      const serum = num(values.serumAlb, 2.8);
      const asc = num(values.ascitesAlb, 1.0);
      const proteinProvided = !isMissingValue(values.ascitesProtein, true);
      const protein = num(values.ascitesProtein, 0);
      const saag = round(serum - asc, 2);
      const highSaag = saag >= 1.1;
      let subtype = '';
      if (highSaag) {
        subtype = !proteinProvided
          ? 'High SAAG: ascites total protein was not entered, so the cardiac-vs-cirrhotic split (protein ≥2.5 vs <2.5 g/dL) cannot be applied.'
          : protein >= 2.5
            ? 'High SAAG + high protein (≥2.5): consider cardiac ascites, Budd-Chiari, or mixed picture.'
            : 'High SAAG + low protein (<2.5): typical of cirrhotic portal hypertension.';
      } else {
        subtype =
          'Low SAAG: consider TB peritonitis, peritoneal carcinomatosis, pancreatic ascites, nephrotic syndrome, biliary leak, serositis.';
      }
      return {
        score: saag,
        unit: 'g/dL',
        label: highSaag ? 'High SAAG (≥1.1) — portal hypertension' : 'Low SAAG (<1.1) — non-portal HTN causes',
        interpretation: `${subtype} Draw serum albumin the same day as paracentesis for accuracy.`,
        riskLevel: highSaag ? 'moderate' : 'info',
        details: [
          { label: 'SAAG', value: `${saag} g/dL` },
          { label: 'Ascites protein', value: proteinProvided ? `${protein} g/dL` : 'Not entered' },
        ],
        recommendations: highSaag
          ? ['Salt restriction / diuretics if cirrhotic', 'Evaluate for SBP (PMN count)', 'Avoid NSAIDs/ACEI if tense/refractory']
          : ['Cytology / ADA / amylase as indicated', 'Cross-sectional imaging', 'Oncology or ID workup per context'],
      };
    },
    evidence: {
      summary: 'SAAG = serum albumin − ascites albumin. ≥1.1 g/dL ≈ portal hypertension (~97% accuracy in classic series). Protein refines cardiac vs cirrhotic ascites.',
      formula: 'SAAG = serum albumin − ascites albumin (g/dL)',
      validation: 'AASLD ascites guidance endorses SAAG as first-line classification after paracentesis.',
      references: [
        {
          title: 'The serum-ascites albumin gradient is superior to the exudate-transudate concept',
          citation: 'Runyon BA et al. Ann Intern Med. 1992',
          year: 1992,
          pmid: '1616215',
          doi: '10.7326/0003-4819-117-3-215',
        },
        {
          title: 'AASLD Practice Guidance on ascites, SBP, and hepatorenal syndrome',
          citation: 'Biggins SW et al. Hepatology. 2021',
          year: 2021,
          pmid: '33942342',
          doi: '10.1002/hep.31884',
        },
      ],
    },
    nextSteps: [
      { condition: 'High SAAG', actions: ['SBP rule-out with cell count', 'Portal HTN management', 'Echo if protein high (cardiac)'] },
      { condition: 'Low SAAG', actions: ['Expand differential', 'Targeted fluid studies'] },
    ],
    pearls: [
      'Misclassification if serum albumin not simultaneous.',
      'Mixed ascites (e.g., cirrhosis + TB) can blur SAAG interpretation.',
    ],
  },

  {
    id: 'runyon-criteria',
    name: 'Runyon Criteria (Secondary Peritonitis)',
    shortName: 'Runyon',
    description: 'Chemical criteria count suggesting secondary (surgical) vs spontaneous bacterial peritonitis.',
    category: 'gastroenterology',
    tags: ['sbp', 'peritonitis', 'ascites', 'runyon', 'surgical'],
    whenToUse: 'Ascitic infection when distinguishing SBP from secondary peritonitis needing source control.',
    whyUse: '≥2 chemical criteria raise concern for secondary peritonitis and prompt imaging/surgery.',
    inputs: [
      yesNo('protein', 'Ascites total protein > 1.0 g/dL', 1, 'Chemical criterion 1 of 3. SBP fluid is often <1 g/dL; higher protein favors secondary peritonitis.'),
      yesNo('glucose', 'Ascites glucose < 50 mg/dL', 1, 'Chemical criterion 2 of 3. Very low glucose suggests consumption by a secondary (surgical) source.'),
      yesNo('ldh', 'Ascites LDH > upper limit of normal for serum', 1, 'Chemical criterion 3 of 3. Compare ascitic LDH to the lab’s serum LDH ULN (not the patient’s serum LDH alone).'),
      yesNo('polyMicro', 'Polymicrobial Gram stain or culture (optional clue)', 0, 'Not one of the 3 chemical criteria. Polymicrobial stain/culture raises secondary-peritonitis suspicion and is counted as an extra red flag here.'),
      yesNo('noResponse', 'No clinical improvement on antibiotics (optional)', 0, 'Not one of the 3 chemical criteria. Failure to improve on appropriate SBP antibiotics is an extra red flag for a secondary source — image early.'),
    ],
    calculate(values) {
      const chemical =
        (bool(values.protein) ? 1 : 0) + (bool(values.glucose) ? 1 : 0) + (bool(values.ldh) ? 1 : 0);
      const extra = (bool(values.polyMicro) ? 1 : 0) + (bool(values.noResponse) ? 1 : 0);
      const score = chemical;
      let label = 'Does not meet Runyon chemical criteria';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation =
        '0–1 of protein >1 / glucose <50 / LDH > serum ULN — chemical pattern less suggestive of secondary peritonitis; treat as SBP if PMN ≥250 and reassess.';
      if (chemical >= 2) {
        label = 'Meets Runyon criteria (≥2)';
        riskLevel = 'critical';
        interpretation =
          '≥2 Runyon chemical criteria: highly concerning for secondary peritonitis — urgent cross-sectional imaging and surgical consultation; do not treat as routine SBP alone.';
      } else if (chemical === 1 && extra >= 1) {
        label = 'Intermediate concern';
        riskLevel = 'high';
        interpretation =
          '1 chemical criterion plus polymicrobial culture or non-response — maintain high suspicion for secondary source; image early.';
      } else if (chemical === 1) {
        label = 'One chemical criterion';
        riskLevel = 'moderate';
        interpretation = 'Single criterion is nonspecific — integrate imaging, cultures, and trajectory.';
      }
      return {
        score,
        unit: 'criteria',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Chemical criteria met', value: `${chemical} / 3` },
          { label: 'Additional red flags', value: String(extra) },
        ],
        recommendations:
          chemical >= 2
            ? ['CT abdomen/pelvis', 'Surgical consult', 'Broad-spectrum antibiotics', 'Source control']
            : ['Standard SBP antibiotics if indicated', 'Serial exams', 'Low threshold to image if not improving'],
      };
    },
    evidence: {
      summary: 'Runyon: secondary peritonitis suggested by ≥2 of ascites protein >1 g/dL, glucose <50 mg/dL, LDH > serum ULN. Polymicrobial infection and failure to improve are additional clues.',
      formula: 'Count of 3 chemical criteria (≥2 concerning)',
      validation: 'Classic ascitic fluid analysis framework; imaging remains essential.',
      references: [
        {
          title: 'Utility of an algorithm in differentiating spontaneous from secondary bacterial peritonitis',
          citation: 'Akriviadis EA, Runyon BA. Gastroenterology. 1990',
          year: 1990,
          pmid: '2293571',
          doi: '10.1016/0016-5085(90)91300-u',
        },
      ],
    },
    nextSteps: [
      { condition: '≥2 criteria', actions: ['Emergent imaging', 'Surgery/IR source control', 'Broad antibiotics'] },
      { condition: '<2 criteria + SBP', actions: ['Third-generation cephalosporin (typical)', 'Albumin if indicated', 'Repeat paracentesis if no improvement'] },
    ],
    pearls: [
      'SBP is usually monomicrobial with protein often <1 g/dL.',
      'Perforation can present with very high ascitic LDH and low glucose.',
    ],
  },

  {
    id: 'harmless-ap',
    name: 'HAPS (Harmless Acute Pancreatitis Score)',
    shortName: 'HAPS',
    description: 'Identifies “harmless” acute pancreatitis unlikely to need ICU-level care.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'haps', 'harmless', 'triage', 'severity'],
    whenToUse: 'Early evaluation of acute pancreatitis to identify patients suitable for ward care.',
    whyUse: 'Absence of peritonitis signs, hemoconcentration, and renal failure predicts mild course with high NPV.',
    inputs: [
      yesNo('peritonitis', 'Rebound tenderness or guarding (peritonitis signs)', 1, 'Involuntary guarding or rebound tenderness on abdominal exam (not voluntary tightness)'),
      yesNo('hemoconcentration', 'Abnormal hematocrit (male ≥43% or female ≥39.6%)', 1, 'Hemoconcentration threshold from original HAPS'),
      yesNo('renal', 'Creatinine ≥ 2 mg/dL (177 µmol/L)'),
    ],
    calculate(values) {
      const bad =
        (bool(values.peritonitis) ? 1 : 0) +
        (bool(values.hemoconcentration) ? 1 : 0) +
        (bool(values.renal) ? 1 : 0);
      if (bad === 0) {
        return {
          score: 0,
          label: 'Harmless (HAPS positive for mild course)',
          interpretation:
            'No peritonitis signs, no hemoconcentration, Cr <2: HAPS predicts harmless course — ICU unlikely; standard ward care with early feeding and fluid resuscitation as appropriate.',
          riskLevel: 'low',
          details: [{ label: 'Adverse criteria', value: '0 / 3' }],
          recommendations: ['Ward management', 'Oral feeding as tolerated', 'Etiology workup (gallstones, TG, alcohol)'],
        };
      }
      return {
        score: bad,
        label: 'Not harmless by HAPS',
        interpretation: `${bad} adverse criterion/criteria present — cannot classify as harmless. Use BISAP/Atlanta/clinical judgment for severity and monitoring level.`,
        riskLevel: bad >= 2 ? 'high' : 'moderate',
        details: [{ label: 'Adverse criteria', value: `${bad} / 3` }],
        recommendations: ['Closer monitoring', 'Serial labs and vitals', 'Consider higher acuity bed if unstable'],
      };
    },
    evidence: {
      summary: 'HAPS: harmless if NO rebound/guarding AND normal hematocrit AND creatinine <2 mg/dL. High negative predictive value for needing ICU or dying in original studies.',
      formula: 'Harmless = absence of all 3 adverse findings',
      validation: 'Lankisch et al.; useful early triage complement to BISAP/SIRS — not a full severity score.',
      references: [
        {
          title: 'The harmless acute pancreatitis score: a clinical algorithm for rapid initial stratification',
          citation: 'Lankisch PG et al. Clin Gastroenterol Hepatol. 2009',
          year: 2009,
          pmid: '19245846',
          doi: '10.1016/j.cgh.2009.02.020',
        },
      ],
    },
    nextSteps: [
      { condition: 'Harmless', actions: ['Ward care', 'Supportive therapy', 'Early oral nutrition'] },
      { condition: 'Not harmless', actions: ['Reassess severity (BISAP, organ failure)', 'Monitor for necrosis/infection'] },
    ],
    pearls: [
      'HAPS rules in “harmless,” not severe disease.',
      'Still evaluate for cholangitis/biliary obstruction regardless of HAPS.',
    ],
  },

  {
    id: 'pned',
    name: 'PNED Score (UGIB Mortality, Simplified)',
    shortName: 'PNED',
    description: 'Educational simplification of the Italian PNED score for upper GI bleed mortality risk.',
    category: 'gastroenterology',
    tags: ['ugib', 'pned', 'bleed', 'mortality', 'endoscopy'],
    whenToUse: 'Adults with nonvariceal upper GI bleeding for in-hospital mortality risk stratification.',
    whyUse: 'Includes clinical and post-endoscopy factors (rebleed, failed endoscopic therapy) beyond pure admission scores.',
    inputs: [
      selectInput('asa', 'ASA physical status', [
        { label: 'ASA 1–2 (0) — I healthy or II mild systemic disease', value: 0, description: 'ASA I: healthy patient. ASA II: mild systemic disease without substantive functional limitation' },
        { label: 'ASA 3 (+1) — severe systemic disease', value: 1, description: 'ASA III: severe systemic disease with functional limitation' },
        { label: 'ASA 4 (+3) — constant threat to life', value: 3, description: 'ASA IV: severe systemic disease that is a constant threat to life' },
      ], 0, 'Use pre-bleed ASA class. ASA V (moribund) is not a separate choice here — if ASA V, the ASA 4 row is the closest available (under-scores vs some PNED tables).'),
      yesNo('time8', 'Time from symptoms to admission < 8 hours', 1),
      yesNo('hb7', 'Hemoglobin ≤ 7 g/dL', 1),
      yesNo('instability', 'Hemodynamic instability at admission', 2, 'SBP <90 mmHg, MAP <65 mmHg, and/or vasopressors (educational operationalization of Marmo instability)'),
      yesNo('renal', 'Renal failure (Cr >1.5 mg/dL or known CKD severe)', 1, 'Keep Cr >1.5 mg/dL. Also score dialysis or eGFR <30 mL/min in place of poorly specified “CKD severe”'),
      yesNo('mental', 'Altered mental status', 2, 'Not oriented to person/place/time, or GCS <14'),
      yesNo('cirrhosis', 'Liver cirrhosis', 2),
      yesNo('cancer', 'Active cancer / malignancy', 2),
      yesNo('failedEndo', 'Failure of endoscopic treatment', 3, 'Persistent bleeding despite index endoscopic therapy'),
      yesNo('rebleed', 'Rebleeding', 3, 'Recurrent hematemesis or melena after hemostasis and ≥24 h of stability, with shock or Hb drop ≥2 g/dL (Marmo)'),
    ],
    calculate(values) {
      const score =
        num(values.asa) +
        (bool(values.time8) ? 1 : 0) +
        (bool(values.hb7) ? 1 : 0) +
        (bool(values.instability) ? 2 : 0) +
        (bool(values.renal) ? 1 : 0) +
        (bool(values.mental) ? 2 : 0) +
        (bool(values.cirrhosis) ? 2 : 0) +
        (bool(values.cancer) ? 2 : 0) +
        (bool(values.failedEndo) ? 3 : 0) +
        (bool(values.rebleed) ? 3 : 0);
      // Educational strata adapted from PNED risk bands
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Lower mortality risk',
          interpretation: 'Lower PNED-range score — lower predicted in-hospital mortality; still complete standard UGIB care.',
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Intermediate risk',
          interpretation: 'Intermediate risk — inpatient monitoring, optimize resuscitation and rebleed surveillance.',
        },
        {
          max: 12,
          level: 'high',
          label: 'High risk',
          interpretation: 'High risk of death — ICU consideration, repeat endoscopy/IR/surgery pathways as needed.',
        },
        {
          max: 30,
          level: 'critical',
          label: 'Very high risk',
          interpretation: 'Very high PNED-range score — multidisciplinary bleed control and critical care support.',
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [{ label: 'Note', value: 'Educational point assignment approximating PNED domains' }],
      };
    },
    evidence: {
      summary: 'PNED (Progetto Nazionale Emorragia Digestiva) predicts mortality after nonvariceal UGIB using ASA, timing, Hb, instability, organ disease, failed endoscopy, and rebleeding.',
      formula: 'Weighted sum of clinical + post-endoscopy factors (simplified educational points)',
      validation: 'Italian multicenter derivation/validation; useful complement to Rockall/AIMS65. Point weights here are educational.',
      references: [
        {
          title: 'Predicting mortality in non-variceal upper gastrointestinal bleeders: validation of the Italian PNED Score and Prospective Comparison with the Rockall Score',
          citation: 'Marmo R et al. Am J Gastroenterol. 2010',
          year: 2010,
          pmid: '20051943',
          doi: '10.1038/ajg.2009.687',
        },
      ],
    },
    nextSteps: [
      { condition: 'High score / rebleed / failed endo', actions: ['Repeat endoscopy', 'Interventional radiology', 'Surgical consult', 'ICU'] },
      { condition: 'Lower score', actions: ['Standard PPI and monitoring', 'Early diet as appropriate'] },
    ],
    pearls: [
      'Post-endoscopy factors heavily drive mortality prediction.',
      'Pair with GBS for need-for-intervention and AIMS65/Rockall for mortality.',
    ],
  },

  {
    id: 'pas',
    name: 'Pediatric Appendicitis Score (PAS)',
    shortName: 'PAS',
    description: 'Samuel PAS clinical score for probability of appendicitis in children.',
    category: 'pediatrics',
    tags: ['appendicitis', 'pediatric', 'pas', 'abdominal pain'],
    whenToUse: 'Children with suspected appendicitis to structure probability and imaging decisions.',
    whyUse: 'Pediatric-specific alternative/complement to Alvarado; includes hop tenderness and neutrophilia.',
    inputs: [
      yesNo('migration', 'Migration of pain to RLQ (starts periumbilical/epigastric, then moves to RLQ)', 1),
      yesNo('anorexia', 'Anorexia', 1, 'In children: refuses favorite foods / not eating'),
      yesNo('nausea', 'Nausea / vomiting', 1),
      yesNo('fever', 'Fever ≥ 38.0°C (100.4°F)', 1),
      yesNo('coughHop', 'Cough / percussion / hopping tenderness in RLQ', 2, 'Pain in RLQ on cough, hop on the right foot, or percussion of the abdomen'),
      yesNo('rlq', 'Tenderness over right lower quadrant', 2, 'Maximal tenderness at McBurney’s point / RLQ'),
      yesNo('wbc', 'Leukocytosis > 10,000/µL', 1),
      yesNo('neut', 'Neutrophilia > 75% neutrophils', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.migration) ? 1 : 0) +
        (bool(values.anorexia) ? 1 : 0) +
        (bool(values.nausea) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.coughHop) ? 2 : 0) +
        (bool(values.rlq) ? 2 : 0) +
        (bool(values.wbc) ? 1 : 0) +
        (bool(values.neut) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low probability',
          interpretation: 'PAS ≤3: appendicitis less likely — observation, alternative diagnoses, shared decision on imaging.',
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Intermediate probability',
          interpretation: 'PAS 4–6: indeterminate — ultrasound/MRI (or CT when necessary) commonly used.',
        },
        {
          max: 10,
          level: 'high',
          label: 'High probability',
          interpretation: 'PAS ≥7: high likelihood of appendicitis — surgical consultation; imaging per local pathway.',
        },
      ]);
      return { score, unit: 'points', ...r, details: [{ label: 'Maximum', value: '10 points' }] };
    },
    evidence: {
      summary: 'PAS (Samuel): symptoms (migration, anorexia, nausea, fever) + signs (hop/cough tenderness 2, RLQ tenderness 2) + labs (WBC, neutrophils). Range 0–10.',
      formula: 'Sum of 8 items (two items worth 2 points)',
      validation: 'Widely used in pediatric ED pathways; imaging still common in intermediate scores.',
      references: [
        {
          title: 'Pediatric appendicitis score',
          citation: 'Samuel M. J Pediatr Surg. 2002',
          year: 2002,
          pmid: '12037754',
          doi: '10.1053/jpsu.2002.32893',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low PAS', actions: ['Serial exams', 'Consider gyn/GU/mesenteric adenitis'] },
      { condition: 'Intermediate–high', actions: ['US first-line in many centers', 'Surgical consult', 'Avoid unnecessary radiation when possible'] },
    ],
    pearls: ['Hop tenderness is weighted (2 points).', 'Scores are not a substitute for clinical concern — perforated appendicitis can present atypically.'],
  },

  {
    id: 'tokyo-cholangitis',
    name: 'Tokyo Guidelines Cholangitis Severity',
    shortName: 'TG18 Cholangitis',
    description: 'Tokyo Guidelines severity grading of acute cholangitis (Grade I–III).',
    category: 'gastroenterology',
    tags: ['cholangitis', 'tokyo', 'biliary', 'ercp', 'severity'],
    whenToUse: 'Confirmed or suspected acute cholangitis after diagnosis criteria met (systemic inflammation + cholestasis + imaging).',
    whyUse: 'Grade guides urgency of biliary drainage and intensity of care.',
    inputs: [
      yesNo('dysfnCv', 'Cardiovascular dysfunction (hypotension requiring dopamine ≥5 or any norepinephrine)', 1, 'Dopamine ≥5 µg/kg/min, or any dose of norepinephrine (TG18 organ dysfunction).'),
      yesNo('dysfnNeuro', 'Neurologic dysfunction (disturbance of consciousness)', 1, 'New disturbance of consciousness: somnolence, disorientation, or unresponsiveness'),
      yesNo('dysfnResp', 'Respiratory dysfunction (PaO₂/FiO₂ <300)'),
      yesNo('dysfnRenal', 'Renal dysfunction (oliguria or Cr >2.0 mg/dL)', 1, 'Oliguria ≈ <0.5 mL/kg/h, or creatinine >2.0 mg/dL'),
      yesNo('dysfnHepatic', 'Hepatic dysfunction (INR >1.5)'),
      yesNo('dysfnHeme', 'Hematologic dysfunction (platelet <100,000/µL)'),
      yesNo('wbcAbn', 'WBC >12,000 or <4,000 /µL'),
      yesNo('feverHigh', 'Fever ≥39°C (102.2°F)'),
      yesNo('age75', 'Age ≥ 75 years'),
      yesNo('bili5', 'Total bilirubin ≥ 5 mg/dL'),
      yesNo('albuminLow', 'Hypoalbuminemia (<0.7 × lower limit of normal)', 1, 'Example: if LLN is 3.5 g/dL, albumin <2.45 g/dL meets the criterion'),
    ],
    calculate(values) {
      const organKeys = ['dysfnCv', 'dysfnNeuro', 'dysfnResp', 'dysfnRenal', 'dysfnHepatic', 'dysfnHeme'] as const;
      const organFail = organKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const modKeys = ['wbcAbn', 'feverHigh', 'age75', 'bili5', 'albuminLow'] as const;
      const mod = modKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      let grade = 'I';
      let label = 'Grade I — Mild';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation =
        'Grade I: does not meet Grade II or III criteria — antimicrobial therapy and early biliary drainage as indicated; often elective/early ERCP.';

      if (organFail >= 1) {
        grade = 'III';
        label = 'Grade III — Severe';
        riskLevel = 'critical';
        interpretation = `Grade III: ≥1 organ dysfunction (${organFail} system(s)) — urgent biliary drainage, organ support, and critical care as needed.`;
      } else if (mod >= 2) {
        grade = 'II';
        label = 'Grade II — Moderate';
        riskLevel = 'high';
        interpretation = `Grade II: ${mod} moderate predictors (≥2 of WBC abnormal, fever ≥39, age ≥75, bili ≥5, hypoalbuminemia) without organ failure — early biliary drainage recommended.`;
      }

      return {
        score: grade,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Organ dysfunctions', value: `${organFail} / 6` },
          { label: 'Moderate predictors', value: `${mod} / 5` },
        ],
        recommendations:
          grade === 'III'
            ? ['Urgent ERCP/PTBD', 'ICU support', 'Broad antibiotics', 'Resuscitation']
            : grade === 'II'
              ? ['Early biliary drainage', 'IV antibiotics', 'Monitor for deterioration to Grade III']
              : ['Antibiotics', 'Plan timely drainage', 'Reassess severity serially'],
      };
    },
    evidence: {
      summary: 'TG18: Grade III = any organ dysfunction; Grade II = ≥2 moderate predictors without organ failure; Grade I = neither.',
      formula: 'Hierarchical severity: III if organ failure else II if ≥2 moderate factors else I',
      validation: 'Tokyo Guidelines 2013/2018 international consensus for cholangitis management.',
      references: [
        {
          title: 'Tokyo Guidelines 2018: diagnostic criteria and severity grading of acute cholangitis',
          citation: 'Kiriyama S et al. J Hepatobiliary Pancreat Sci. 2018',
          year: 2018,
          pmid: '29032610',
          doi: '10.1002/jhbp.512',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade III', actions: ['Urgent decompression', 'Critical care', 'Source control'] },
      { condition: 'Grade II', actions: ['Early ERCP within appropriate window', 'IV abx'] },
      { condition: 'Grade I', actions: ['Medical therapy', 'Elective/early drainage timing per response'] },
    ],
    pearls: [
      'Severity grading assumes diagnosis of cholangitis is already established.',
      'Do not delay drainage in septic cholangitis for scoring.',
    ],
  },

  {
    id: 'tokyo-cholecystitis',
    name: 'Tokyo Guidelines Cholecystitis Severity',
    shortName: 'TG18 Cholecystitis',
    description: 'Tokyo Guidelines severity grading of acute cholecystitis (Grade I–III).',
    category: 'gastroenterology',
    tags: ['cholecystitis', 'tokyo', 'gallbladder', 'surgery', 'severity'],
    whenToUse: 'Acute cholecystitis once diagnostic criteria are met, to grade severity and plan intervention.',
    whyUse: 'Grade III organ dysfunction and Grade II local/inflammatory markers change operative risk and need for drainage.',
    inputs: [
      yesNo('dysfnCv', 'Cardiovascular dysfunction (hypotension requiring dopamine ≥5 µg/kg/min or any norepinephrine)'),
      yesNo('dysfnNeuro', 'Neurologic dysfunction (altered consciousness)', 1, 'New disturbance of consciousness: somnolence, disorientation, or unresponsiveness'),
      yesNo('dysfnResp', 'Respiratory dysfunction (PaO₂/FiO₂ <300)'),
      yesNo('dysfnRenal', 'Renal dysfunction (oliguria or Cr >2.0 mg/dL)', 1, 'Oliguria ≈ <0.5 mL/kg/h, or creatinine >2.0 mg/dL'),
      yesNo('dysfnHepatic', 'Hepatic dysfunction (INR >1.5)'),
      yesNo('dysfnHeme', 'Hematologic dysfunction (platelets <100,000/µL)'),
      yesNo('wbc18', 'WBC > 18,000/µL'),
      yesNo('palpable', 'Palpable tender RUQ mass'),
      yesNo('duration72', 'Duration of symptoms > 72 hours'),
      yesNo('markedLocal', 'Marked local inflammation (gangrene, abscess, biliary peritonitis, emphysematous GB)', 1, 'Imaging or operative findings: gangrenous cholecystitis, pericholecystic abscess, biliary peritonitis, or emphysematous gallbladder.'),
    ],
    calculate(values) {
      const organKeys = ['dysfnCv', 'dysfnNeuro', 'dysfnResp', 'dysfnRenal', 'dysfnHepatic', 'dysfnHeme'] as const;
      const organFail = organKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const modKeys = ['wbc18', 'palpable', 'duration72', 'markedLocal'] as const;
      const mod = modKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      let grade = 'I';
      let label = 'Grade I — Mild';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation =
        'Grade I: acute cholecystitis without Grade II/III features — early laparoscopic cholecystectomy often preferred if surgical candidate.';

      if (organFail >= 1) {
        grade = 'III';
        label = 'Grade III — Severe';
        riskLevel = 'critical';
        interpretation = `Grade III: organ dysfunction present (${organFail}) — organ support, antibiotics, and gallbladder drainage (e.g., percutaneous) often before delayed cholecystectomy.`;
      } else if (mod >= 1) {
        grade = 'II';
        label = 'Grade II — Moderate';
        riskLevel = 'high';
        interpretation = `Grade II: ${mod} moderate feature(s) (WBC >18k, palpable mass, >72h symptoms, or marked local inflammation) — experienced surgeon / consider drainage if severe local disease.`;
      }

      return {
        score: grade,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Organ dysfunctions', value: `${organFail} / 6` },
          { label: 'Moderate features', value: `${mod} / 4` },
        ],
        recommendations:
          grade === 'III'
            ? ['Stabilize organs', 'Antibiotics', 'Percutaneous cholecystostomy if unfit', 'Delayed cholecystectomy planning']
            : grade === 'II'
              ? ['Urgent surgical consult', 'Antibiotics', 'Early lap chole at capable center or drainage']
              : ['Early cholecystectomy if candidate', 'Antibiotics', 'Supportive care'],
      };
    },
    evidence: {
      summary: 'TG18 cholecystitis: Grade III = organ dysfunction; Grade II = any moderate local/inflammatory criterion; Grade I = mild.',
      formula: 'III if organ failure else II if any moderate feature else I',
      validation: 'Tokyo Guidelines international consensus for diagnosis and severity-based management.',
      references: [
        {
          title: 'Tokyo Guidelines 2018: diagnostic criteria and severity grading of acute cholecystitis',
          citation: 'Yokoe M et al. J Hepatobiliary Pancreat Sci. 2018',
          year: 2018,
          pmid: '29032636',
          doi: '10.1002/jhbp.515',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade III', actions: ['ICU as needed', 'GB drainage', 'Delay elective chole until recovered'] },
      { condition: 'Grade I–II', actions: ['Surgical pathway per fitness and local inflammation'] },
    ],
    pearls: [
      'Acalculous cholecystitis in ICU patients is often severe — low threshold for drainage.',
      'Grade II with >72h symptoms may be technically harder laparoscopically.',
    ],
  },

  {
    id: 'determinant-based',
    name: 'Determinant-Based Pancreatitis Severity',
    shortName: 'DB Classification',
    description: 'Determinant-based classification of acute pancreatitis severity (mild → critical).',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'severity', 'necrosis', 'organ failure', 'atlanta'],
    whenToUse: 'Acute pancreatitis when (peri)pancreatic necrosis and organ-failure duration are known or suspected.',
    whyUse: 'Separates sterile vs infected necrosis and transient vs persistent organ failure for prognosis and management intensity.',
    inputs: [
      selectInput('necrosis', '(Peri)pancreatic necrosis', [
        { label: 'No necrosis', value: 'none', description: 'Interstitial edematous pancreatitis; no pancreatic or peripancreatic necrosis on contrast CT' },
        { label: 'Sterile necrosis', value: 'sterile', description: 'Necrosis on imaging without gas or positive culture' },
        { label: 'Infected necrosis', value: 'infected', description: 'Gas in necrosis on CT/MRI, or positive Gram stain/culture from FNA or drain' },
      ], 'none', 'Infected if gas in necrosis on CT/MRI or positive Gram stain/culture from FNA or drain.'),
      selectInput('organFailure', 'Organ failure (modified Marshall ≥2 in resp/CV/renal)', [
        { label: 'No organ failure', value: 'none', description: 'All modified Marshall organ scores <2' },
        { label: 'Transient (<48 hours)', value: 'transient', description: 'Marshall ≥2 that resolves within 48 h' },
        { label: 'Persistent (>48 hours)', value: 'persistent', description: 'Marshall ≥2 lasting >48 h' },
      ], 'none', 'Failure = modified Marshall ≥2: resp PaO₂/FiO₂ ≤300; renal Cr ≥1.9 mg/dL (≥170 µmol/L); CV SBP <90 not fluid-responsive. Transient resolves within 48 h; persistent lasts >48 h.'),
    ],
    calculate(values) {
      const nec = String(values.necrosis ?? 'none');
      const of = String(values.organFailure ?? 'none');

      // Critical: persistent OF + infected necrosis
      // Severe: persistent OF
      // Moderate: sterile necrosis and/or transient OF
      // Mild: no necrosis and no OF
      let score = 1;
      let label = 'Mild';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = 'No (peri)pancreatic necrosis and no organ failure — mild acute pancreatitis; supportive care, early feeding.';

      if (of === 'persistent' && nec === 'infected') {
        score = 4;
        label = 'Critical';
        riskLevel = 'critical';
        interpretation =
          'Persistent organ failure AND infected necrosis — critical pancreatitis with highest mortality; ICU, antibiotics as indicated, step-up necrosectomy/drainage pathways.';
      } else if (of === 'persistent') {
        score = 3;
        label = 'Severe';
        riskLevel = 'high';
        interpretation =
          'Persistent organ failure (>48h) — severe disease regardless of necrosis status; ICU-level organ support and monitor for infection of necrosis.';
      } else if (nec === 'infected') {
        // Infected necrosis without persistent OF still substantial — map to severe/moderate-high per literature nuances
        score = 3;
        label = 'Severe (infected necrosis)';
        riskLevel = 'high';
        interpretation =
          'Infected necrosis is a key determinant of morbidity — even without persistent OF, needs specialist care, drainage/step-up as indicated.';
      } else if (nec === 'sterile' || of === 'transient') {
        score = 2;
        label = 'Moderate';
        riskLevel = 'moderate';
        interpretation =
          'Sterile necrosis and/or transient organ failure — moderately severe; monitor closely for secondary infection or recurrent OF.';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Necrosis', value: nec },
          { label: 'Organ failure', value: of },
          { label: 'Categories', value: '1 mild · 2 moderate · 3 severe · 4 critical' },
        ],
      };
    },
    evidence: {
      summary: 'Determinant-based classification: mild (no OF, no necrosis); moderate (sterile necrosis and/or transient OF); severe (persistent OF); critical (persistent OF + infected necrosis).',
      formula: 'Severity from two determinants: necrosis (none/sterile/infected) × organ failure (none/transient/persistent)',
      validation: 'International consensus complementary to revised Atlanta classification.',
      references: [
        {
          title: 'Determinant-based classification of acute pancreatitis severity',
          citation: 'Dellinger EP et al. Ann Surg. 2012',
          year: 2012,
          pmid: '22735715',
          doi: '10.1097/SLA.0b013e318256f778',
        },
      ],
    },
    nextSteps: [
      { condition: 'Critical / severe', actions: ['ICU', 'Organ support', 'Specialist pancreatology/surgery', 'Delay necrosectomy when possible (step-up)'] },
      { condition: 'Moderate', actions: ['Monitor for infection of necrosis', 'Nutrition', 'Avoid early unnecessary intervention'] },
      { condition: 'Mild', actions: ['Ward care', 'Early oral intake', 'Etiology treatment'] },
    ],
    pearls: [
      'Infected necrosis diagnosis often needs gas on imaging or positive culture — clinical deterioration matters.',
      'Use with revised Atlanta (interstitial vs necrotizing; local complications).',
    ],
  },

  {
    id: 'mayo-pbc',
    name: 'Mayo Natural History Model (PBC)',
    shortName: 'Mayo PBC',
    description: 'Simplified Mayo risk score for survival estimation in primary biliary cholangitis.',
    category: 'gastroenterology',
    tags: ['pbc', 'mayo', 'cholestasis', 'prognosis', 'transplant'],
    whenToUse: 'PBC prognosis discussions and transplant timing context (educational R score).',
    whyUse: 'Classic model using age, bilirubin, albumin, PT, and edema; higher R → worse survival.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 55 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 30, step: 0.1, defaultValue: 1.5 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 3.5 }),
      numberInput('pt', 'Prothrombin time', { unit: 'sec', min: 8, max: 60, step: 0.1, defaultValue: 12 }),
      selectInput('edema', 'Edema', [
        { label: 'No edema (0)', value: 0, description: 'No ankle, pretibial, or sacral edema and no diuretic therapy for edema' },
        { label: 'Edema present, no diuretics (0.5)', value: 0.5, description: 'Edema present without diuretics. Original Mayo also codes 0.5 if edema is controlled on diuretics' },
        { label: 'Edema despite diuretics (1)', value: 1, description: 'Edema that persists despite diuretic therapy' },
      ], 0, 'Mayo PBC edema factor (Dickson): none and no diuretics = 0; untreated edema OR edema controlled on diuretics = 0.5; edema despite diuretics = 1. Grade ankle/pretibial/sacral edema on exam.'),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const bili = Math.max(num(values.bili, 1.5), 0.1);
      const alb = Math.max(num(values.albumin, 3.5), 0.1);
      const pt = Math.max(num(values.pt, 12), 0.1);
      const edema = num(values.edema, 0);
      // R = 0.039×age + 0.871×ln(bili) − 2.53×ln(albumin) + 2.38×ln(PT) + 0.859×edema
      const R = round(0.039 * age + 0.871 * Math.log(bili) - 2.53 * Math.log(alb) + 2.38 * Math.log(pt) + 0.859 * edema, 3);
      const r = riskFromThresholds(R, [
        {
          max: 5.5,
          level: 'low',
          label: 'Lower Mayo R',
          interpretation: 'Lower risk score — better predicted survival historically; continue UDCA/OCA pathway as indicated and monitor response (e.g., bilirubin, ALP).',
        },
        {
          max: 6.5,
          level: 'moderate',
          label: 'Intermediate Mayo R',
          interpretation: 'Intermediate risk — optimize PBC therapy, screen for portal HTN/osteoporosis, consider transplant discussion if progressive.',
        },
        {
          max: 20,
          level: 'high',
          label: 'Higher Mayo R',
          interpretation: 'Higher risk score — historically associated with reduced survival; transplant evaluation if candidate, manage decompensation.',
        },
      ]);
      return {
        score: R,
        unit: 'R score',
        ...r,
        details: [
          { label: 'Edema factor', value: String(edema) },
          { label: 'Note', value: 'Full survival S(t) uses baseline hazard; R is comparative risk' },
        ],
      };
    },
    evidence: {
      summary: 'Mayo PBC R = 0.039×age + 0.871×ln(bili) − 2.53×ln(albumin) + 2.38×ln(PT sec) + 0.859×edema. Educational risk strata only.',
      formula: 'R = 0.039·age + 0.871·ln(bili) − 2.53·ln(alb) + 2.38·ln(PT) + 0.859·edema',
      validation: 'Mayo natural history model widely used pre-UDCA era and still referenced; modern care includes UDCA response criteria (Paris, Toronto, etc.).',
      references: [
        {
          title: 'Prognosis in primary biliary cirrhosis: model for decision making',
          citation: 'Dickson ER et al. Hepatology. 1989',
          year: 1989,
          pmid: '2737595',
          doi: '10.1002/hep.1840100102',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rising bilirubin / high R', actions: ['Hepatology/transplant referral', 'Confirm PBC therapy adherence', 'Screen varices/HCC if advanced'] },
      { condition: 'Lower R', actions: ['Continue UDCA', 'Assess biochemical response at 1 year'] },
    ],
    pearls: [
      'Bilirubin is the dominant prognostic lab in PBC.',
      'Mayo model uses PT in seconds, not INR.',
    ],
  },

  {
    id: 'barrett-prague',
    name: 'Prague C & M (Barrett Esophagus)',
    shortName: 'Prague C&M',
    description: 'Helper for Prague circumferential (C) and maximal (M) Barrett segment lengths.',
    category: 'gastroenterology',
    tags: ['barrett', 'esophagus', 'prague', 'endoscopy', 'gerd'],
    whenToUse: 'Documenting Barrett esophagus extent at endoscopy for surveillance planning.',
    whyUse: 'Standardized C&M reporting improves communication and correlates with neoplastic risk burden.',
    inputs: [
      numberInput('c', 'C — circumferential extent', { unit: 'cm', min: 0, max: 25, step: 0.5, defaultValue: 2, helpText: 'Length of circumferential Barrett from GEJ' }),
      numberInput('m', 'M — maximal extent', { unit: 'cm', min: 0, max: 25, step: 0.5, defaultValue: 4, helpText: 'Maximal tongue length from GEJ including islands/tongues' }),
      selectInput('histology', 'Worst histology (if known)', [
        { label: 'Not specified / NDBE', value: 'ndbe' },
        { label: 'Indefinite for dysplasia', value: 'indefinite' },
        { label: 'Low-grade dysplasia', value: 'lgd' },
        { label: 'High-grade dysplasia', value: 'hgd' },
        { label: 'Adenocarcinoma', value: 'ca' },
      ]),
    ],
    calculate(values) {
      const c = num(values.c, 2);
      const m = num(values.m, 4);
      const hist = String(values.histology ?? 'ndbe');
      if (m < c) {
        return {
          score: `C${c}M${m}`,
          label: 'Invalid C&M (M must be ≥ C)',
          interpretation: 'Maximal extent M cannot be shorter than circumferential extent C. Re-measure from the gastroesophageal junction.',
          riskLevel: 'info',
        };
      }
      const longSegment = m >= 3;
      let histNote = 'Nondysplastic Barrett — surveillance interval depends on segment length and guidelines.';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = longSegment ? 'moderate' : 'low';
      if (hist === 'lgd') {
        histNote = 'Low-grade dysplasia — confirm with expert GI pathologist; discuss endoscopic eradication therapy vs intensive surveillance.';
        riskLevel = 'high';
      } else if (hist === 'hgd' || hist === 'ca') {
        histNote = 'HGD or cancer — endoscopic/surgical therapy pathways; not routine surveillance alone.';
        riskLevel = 'critical';
      } else if (hist === 'indefinite') {
        histNote = 'Indefinite for dysplasia — optimize acid suppression and repeat endoscopy with biopsies.';
        riskLevel = 'moderate';
      }
      return {
        score: `C${round(c, 1)}M${round(m, 1)}`,
        label: longSegment ? 'Long-segment Barrett (M ≥ 3 cm)' : 'Short-segment Barrett (M < 3 cm)',
        interpretation: `Prague C${round(c, 1)}M${round(m, 1)}. ${histNote} Report islands separately if needed; use Seattle protocol biopsies for surveillance.`,
        riskLevel,
        details: [
          { label: 'Circumferential (C)', value: `${c} cm` },
          { label: 'Maximal (M)', value: `${m} cm` },
          { label: 'Tongue length beyond C', value: `${round(m - c, 1)} cm` },
        ],
        recommendations: [
          'High-quality white-light + virtual chromoendoscopy',
          'Seattle protocol (4-quadrant q1–2 cm) if no visible lesion',
          'Resect/ablate visible lesions first',
        ],
      };
    },
    evidence: {
      summary: 'Prague C&M: C = circumferential length of Barrett, M = maximal length including tongues, measured from GEJ in cm.',
      formula: 'Report as C#M# (cm); require M ≥ C',
      validation: 'International Working Group consensus; standard reporting language for Barrett extent.',
      references: [
        {
          title: 'The development and validation of an endoscopic grading system for Barrett’s esophagus: the Prague C & M criteria',
          citation: 'Sharma P et al. Gastroenterology. 2006',
          year: 2006,
          pmid: '17101315',
          doi: '10.1053/j.gastro.2006.08.032',
        },
      ],
    },
    nextSteps: [
      { condition: 'Dysplasia / neoplasia', actions: ['Expert pathology confirm', 'Endoscopic eradication therapy referral'] },
      { condition: 'NDBE', actions: ['PPI optimization', 'Surveillance per length and guidelines'] },
    ],
    pearls: [
      'GEJ landmarks (top of gastric folds) are critical for accurate C&M.',
      'Longer segments carry higher neoplastic risk burden.',
    ],
  },

  {
    id: 'los-angeles-esophagitis',
    name: 'Los Angeles Classification (Esophagitis)',
    shortName: 'LA Grade',
    description: 'LA classification of erosive reflux esophagitis grades A–D.',
    category: 'gastroenterology',
    tags: ['gerd', 'esophagitis', 'los angeles', 'endoscopy'],
    whenToUse: 'Endoscopic grading of erosive esophagitis severity.',
    whyUse: 'Standardized grades guide GERD severity documentation, PPI intensity, and healing expectations.',
    inputs: [
      selectInput('grade', 'Endoscopic LA grade', [
        {
          label: 'A — ≥1 mucosal break ≤5 mm, none bridging folds',
          value: 'A',
          description: 'One or more mucosal breaks, each ≤5 mm, none extending between the tops of two mucosal folds',
        },
        {
          label: 'B — ≥1 mucosal break >5 mm, none bridging folds',
          value: 'B',
          description: 'At least one mucosal break >5 mm long, still not continuous between the tops of two folds',
        },
        {
          label: 'C — ≥1 mucosal break continuous between ≥2 folds, <75% circumference',
          value: 'C',
          description: 'At least one mucosal break continuous between the tops of two or more folds, but involving <75% of the esophageal circumference',
        },
        {
          label: 'D — ≥1 mucosal break involving ≥75% esophageal circumference',
          value: 'D',
          description: 'One or more mucosal breaks involving ≥75% of the esophageal circumference',
        },
      ], undefined, 'A mucosal break is a well-demarcated area of slough or erythema with a sharp line from adjacent mucosa. Erythema without a break is not erosive esophagitis. Grade the worst lesion. Measure break length along the long axis.'),
    ],
    calculate(values) {
      const g = String(values.grade ?? 'A');
      const map: Record<string, { score: number; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        A: {
          score: 1,
          label: 'LA Grade A',
          interpretation: 'Mild erosive esophagitis — mucosal break(s) ≤5 mm not bridging folds. PPI therapy; lifestyle measures; consider endoscopy follow-up only if indicated clinically.',
          riskLevel: 'low',
        },
        B: {
          score: 2,
          label: 'LA Grade B',
          interpretation: 'Moderate erosive disease — breaks >5 mm without fold bridging. Standard dose PPI healing course; ensure adherence and timing before meals.',
          riskLevel: 'moderate',
        },
        C: {
          score: 3,
          label: 'LA Grade C',
          interpretation: 'Severe esophagitis — confluent breaks between folds but <75% circumference. Full-dose PPI; document healing; evaluate for complications (stricture, Barrett).',
          riskLevel: 'high',
        },
        D: {
          score: 4,
          label: 'LA Grade D',
          interpretation: 'Very severe — ≥75% circumferential mucosal injury. High-dose/optimized acid suppression; rule out obstruction/stricture; plan healing assessment and Barrett screening when healed.',
          riskLevel: 'critical',
        },
      };
      const row = map[g] ?? map.A;
      return {
        score: g,
        label: row.label,
        interpretation: row.interpretation,
        riskLevel: row.riskLevel,
        details: [{ label: 'Numeric rank', value: `${row.score} / 4` }],
        recommendations: ['PPI 30–60 min before meals', 'Elevate HOB / weight loss if obese', 'Avoid smoking and late meals'],
      };
    },
    evidence: {
      summary: 'LA grades A–D based on length and circumferential extent of mucosal breaks (erosions), not erythema alone.',
      formula: 'A ≤5 mm; B >5 mm; C confluent between folds <75% circ; D ≥75% circ',
      validation: 'Widely adopted international endoscopic classification for erosive reflux disease.',
      references: [
        {
          title: 'Endoscopic assessment of oesophagitis: clinical and functional correlates of the Los Angeles classification',
          citation: 'Lundell LR et al. Gut. 1999',
          year: 1999,
          pmid: '10403727',
          doi: '10.1136/gut.45.2.172',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade C–D', actions: ['Optimize PPI', 'Assess healing', 'Screen for Barrett once healed if indicated'] },
      { condition: 'Grade A–B', actions: ['PPI course', 'Step-down if asymptomatic after healing'] },
    ],
    pearls: [
      'Erythema without mucosal break is not erosive esophagitis by LA rules.',
      'Grade severity after stopping PPI may unmask true disease for diagnosis.',
    ],
  },

  {
    id: 'varices-baveno',
    name: 'Baveno VI Criteria (Varices Screening)',
    shortName: 'Baveno VI',
    description: 'Baveno VI rule to avoid screening endoscopy using liver stiffness and platelets.',
    category: 'gastroenterology',
    tags: ['varices', 'baveno', 'fibroscan', 'cirrhosis', 'screening'],
    whenToUse: 'Compensated advanced chronic liver disease (cACLD) when deciding need for screening EGD for varices needing treatment.',
    whyUse: 'LSM <20 kPa and platelets >150×10⁹/L identify patients at very low risk of varices needing treatment who can defer endoscopy.',
    inputs: [
      numberInput('lsm', 'Liver stiffness (VCTE)', { unit: 'kPa', min: 1, max: 75, step: 0.1, defaultValue: 15 }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 1, max: 600, defaultValue: 180 }),
      selectInput(
        'compensated',
        'Disease stage',
        [
          { label: 'Compensated cACLD (no prior decompensation)', value: 'yes' },
          { label: 'Prior decompensation — Baveno not applicable', value: 'no' },
        ],
        'yes',
        'Baveno VI avoidance rule applies to compensated cACLD only'
      ),
    ],
    calculate(values) {
      const lsm = num(values.lsm, 15);
      const plt = num(values.plt, 180);
      const compensated = String(values.compensated ?? 'yes') === 'yes';
      if (!compensated) {
        return {
          score: 'N/A',
          label: 'Baveno VI not applicable',
          interpretation: 'Decompensated cirrhosis requires different management; screen/treat portal HTN complications per guidelines — do not use Baveno to defer endoscopy.',
          riskLevel: 'high',
        };
      }
      const avoidEndoscopy = lsm < 20 && plt > 150;
      // Expanded Baveno VI: LSM ≤25 and plt >110 (optional educational note)
      const expandedAvoid = lsm <= 25 && plt > 110;
      if (avoidEndoscopy) {
        return {
          score: 'Avoid EGD',
          label: 'Meets Baveno VI — endoscopy can be avoided',
          interpretation:
            'LSM <20 kPa AND platelets >150×10⁹/L: very low risk of varices needing treatment. Surveillance with annual LSM + platelets; perform EGD if criteria no longer met.',
          riskLevel: 'low',
          details: [
            { label: 'LSM', value: `${lsm} kPa` },
            { label: 'Platelets', value: `${plt} ×10⁹/L` },
          ],
          recommendations: ['Defer screening EGD', 'Repeat LSM + CBC yearly', 'Lifestyle / etiology control'],
        };
      }
      return {
        score: 'EGD recommended',
        label: 'Does not meet Baveno VI avoidance criteria',
        interpretation: expandedAvoid
          ? 'Fails original Baveno VI but may meet Expanded Baveno VI (LSM ≤25 and plt >110) used in some pathways — center-dependent. Original Baveno still favors endoscopy when LSM ≥20 or plt ≤150.'
          : 'LSM ≥20 kPa or platelets ≤150×10⁹/L — proceed with screening endoscopy for varices needing treatment (or use spleen stiffness / other validated non-invasive rules if available).',
        riskLevel: 'moderate',
        details: [
          { label: 'LSM', value: `${lsm} kPa` },
          { label: 'Platelets', value: `${plt} ×10⁹/L` },
          { label: 'Expanded Baveno VI (info)', value: expandedAvoid ? 'Would meet expanded rule' : 'Would not meet expanded rule' },
        ],
        recommendations: ['Screening EGD', 'NSBB if high-risk varices', 'Reassess after etiological cure (e.g., HCV SVR)'],
      };
    },
    evidence: {
      summary: 'Baveno VI: patients with cACLD and LSM <20 kPa + platelets >150 can avoid screening endoscopy. Expanded Baveno VI: LSM ≤25 + platelets >110.',
      formula: 'Avoid EGD if LSM <20 AND plt >150 (compensated cACLD)',
      validation: 'Multiple validations; miss rate for varices needing treatment very low with original criteria.',
      references: [
        {
          title: 'Expanding consensus in portal hypertension: Report of the Baveno VI Consensus Workshop',
          citation: 'de Franchis R et al. J Hepatol. 2015',
          year: 2015,
          pmid: '26047908',
          doi: '10.1016/j.jhep.2015.05.022',
        },
      ],
    },
    nextSteps: [
      { condition: 'Meets Baveno VI', actions: ['Skip EGD for now', 'Annual non-invasive recheck'] },
      { condition: 'Fails criteria', actions: ['EGD', 'Risk-stratify varices', 'Consider NSBB / banding'] },
    ],
    pearls: [
      'Fasting, valid VCTE exam quality required.',
      'After HCV cure or alcohol abstinence, LSM may fall — reassess eligibility.',
    ],
  },

  {
    id: 'hvpg',
    name: 'HVPG Interpretation',
    shortName: 'HVPG',
    description: 'Clinical significance bands for hepatic venous pressure gradient (portal hypertension).',
    category: 'gastroenterology',
    tags: ['hvpg', 'portal hypertension', 'varices', 'cirrhosis'],
    whenToUse: 'Interpreting measured HVPG from hepatic vein catheterization.',
    whyUse: 'HVPG thresholds define CSPH, variceal bleeding risk, and treatment response targets.',
    inputs: [
      numberInput('hvpg', 'HVPG', { unit: 'mmHg', min: 0, max: 40, step: 0.5, defaultValue: 12 }),
    ],
    calculate(values) {
      const hvpg = num(values.hvpg, 12);
      const r = riskFromThresholds(hvpg, [
        {
          max: 5,
          level: 'normal',
          label: 'Normal / no portal HTN',
          interpretation: 'HVPG 1–5 mmHg: normal range — portal hypertension not present by HVPG definition.',
        },
        {
          max: 9,
          level: 'low',
          label: 'Portal HTN, not clinically significant',
          interpretation: 'HVPG 6–9 mmHg: elevated portal pressure but below CSPH threshold; lower near-term risk of varices/decompensation.',
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Clinically significant portal HTN (CSPH)',
          interpretation: 'HVPG ≥10 mmHg: CSPH — risk of varices formation and decompensation rises; consider NSBB in cACLD per guidelines and screen varices.',
        },
        {
          max: 15,
          level: 'high',
          label: 'High-risk portal HTN (≥12)',
          interpretation: 'HVPG ≥12 mmHg: threshold classically linked to variceal bleeding risk; endoscopic prophylaxis / NSBB strategies apply when varices present.',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Marked portal HTN',
          interpretation: 'HVPG well above 12–16 mmHg: high risk of decompensation and bleeding; TIPS evaluation in selected refractory ascites/bleed settings.',
        },
      ]);
      return {
        score: hvpg,
        unit: 'mmHg',
        ...r,
        details: [
          { label: 'Key cutoffs', value: '≤5 normal · ≥10 CSPH · ≥12 bleed risk' },
          { label: 'Hemodynamic response (info)', value: '↓≥20% from baseline or to <12 mmHg on NSBB is favorable' },
        ],
      };
    },
    evidence: {
      summary: 'HVPG = WHVP − FHVP. ≥10 mmHg = CSPH; ≥12 mmHg associated with variceal bleeding. NSBB hemodynamic response: HVPG <12 or ≥20% reduction.',
      formula: 'HVPG (mmHg) with clinical band interpretation',
      validation: 'Gold-standard portal pressure measurement; prognostic across cirrhosis natural history.',
      references: [
        {
          title: 'Expanding consensus in portal hypertension: Report of the Baveno VI Consensus Workshop',
          citation: 'de Franchis R et al. J Hepatol. 2015',
          year: 2015,
          pmid: '26047908',
          doi: '10.1016/j.jhep.2015.05.022',
        },
      ],
    },
    nextSteps: [
      { condition: 'HVPG ≥10', actions: ['Variceal screening strategy', 'Consider NSBB in cACLD', 'Eliminate etiology of liver disease'] },
      { condition: 'Refractory bleed/ascites', actions: ['TIPS evaluation in selected patients'] },
    ],
    pearls: [
      'Accurate zeroing and free hepatic vein pressure essential.',
      'Pre-sinusoidal portal HTN can have normal HVPG (e.g., some PVT, schisto).',
    ],
  },

  {
    id: 'ascites-pmm',
    name: 'Ascites PMN (SBP Diagnosis)',
    shortName: 'PMN / SBP',
    description: 'Polymorphonuclear cell count interpretation for spontaneous bacterial peritonitis.',
    category: 'gastroenterology',
    tags: ['sbp', 'ascites', 'pmn', 'infection', 'paracentesis'],
    whenToUse: 'Diagnostic paracentesis in ascites — especially cirrhosis with symptoms, admission, or GI bleed.',
    whyUse: 'PMN ≥250/µL diagnoses SBP and warrants prompt antibiotics without waiting for culture.',
    inputs: [
      numberInput('pmn', 'Ascites PMN (neutrophil) count', { unit: 'cells/µL', min: 0, max: 50000, defaultValue: 100 }),
      numberInput('rbc', 'Ascites RBC count (optional)', {
        unit: 'cells/µL',
        min: 0,
        max: 1e7,
        defaultValue: 0,
        helpText: 'If traumatic tap, correct PMN −1 per 250 RBC',
        required: false,
      }),
      yesNo('symptoms', 'Symptoms/signs of infection or unexplained decompensation', 0, 'Fever, abdominal pain/tenderness, unexplained encephalopathy, AKI, or GI bleed'),
    ],
    calculate(values) {
      const pmnRaw = num(values.pmn, 100);
      const rbc = num(values.rbc, 0);
      const correction = rbc > 0 ? Math.floor(rbc / 250) : 0;
      const pmn = Math.max(0, pmnRaw - correction);
      const symptomatic = bool(values.symptoms);

      if (pmn >= 250) {
        return {
          score: round(pmn, 0),
          unit: 'PMN/µL',
          label: 'SBP criteria met (PMN ≥250)',
          interpretation:
            'Corrected PMN ≥250 cells/µL: treat as SBP immediately. Start empiric antibiotics; obtain culture in blood culture bottles at bedside; give albumin if indicated (Cr >1, BUN >30, or bili >4).' +
            (symptomatic
              ? ' Clinical infection signs/decompensation noted — supports urgent treatment pathway.'
              : ' Treat on PMN criterion even if relatively asymptomatic (common teaching).'),
          riskLevel: 'high',
          details: [
            { label: 'Reported PMN', value: `${pmnRaw}` },
            { label: 'Traumatic-tap correction', value: correction ? `−${correction}` : 'None' },
            { label: 'Corrected PMN', value: `${pmn}` },
            { label: 'Symptoms / decompensation', value: symptomatic ? 'Yes' : 'No' },
          ],
          recommendations: [
            '3rd-gen cephalosporin (typical community SBP)',
            'Albumin 1.5 g/kg day 1 + 1 g/kg day 3 if renal/hepatic criteria',
            'Repeat paracentesis if no improvement (secondary peritonitis concern)',
          ],
        };
      }
      if (pmn >= 100 && symptomatic) {
        return {
          score: round(pmn, 0),
          unit: 'PMN/µL',
          label: 'Below 250 but symptomatic — clinical judgment',
          interpretation:
            'PMN <250 does not meet classic SBP cut-off. If high clinical suspicion, consider early antibiotics and culture; bacterascites (culture-positive, PMN <250) may progress.',
          riskLevel: 'moderate',
          details: [
            { label: 'Corrected PMN', value: `${pmn}` },
            { label: 'Symptoms / decompensation', value: 'Yes' },
          ],
        };
      }
      return {
        score: round(pmn, 0),
        unit: 'PMN/µL',
        label: 'SBP not diagnosed by PMN',
        interpretation: symptomatic
          ? 'Corrected PMN <250 cells/µL: does not meet diagnostic threshold for SBP despite symptoms — culture if concerned, investigate other causes of decompensation, and reassess if clinical suspicion remains high.'
          : 'Corrected PMN <250 cells/µL: does not meet diagnostic threshold for SBP. Culture if concerned; investigate other causes of decompensation.',
        riskLevel: 'low',
        details: [
          { label: 'Corrected PMN', value: `${pmn}` },
          { label: 'Threshold', value: '≥250 cells/µL' },
          { label: 'Symptoms / decompensation', value: symptomatic ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'SBP diagnostic cut-off: ascitic fluid PMN ≥250/µL. Correct traumatic taps by subtracting 1 PMN per 250 RBC.',
      formula: 'Corrected PMN = PMN − floor(RBC/250); SBP if ≥250',
      validation: 'AASLD/EASL standard; early treatment improves survival.',
      references: [
        {
          title: 'AASLD guidance: ascites, SBP, and HRS',
          citation: 'Biggins SW et al. Hepatology. 2021',
          year: 2021,
          pmid: '33942342',
          doi: '10.1002/hep.31884',
        },
      ],
    },
    nextSteps: [
      { condition: 'PMN ≥250', actions: ['Empiric abx now', 'Albumin if indicated', 'Do not wait for culture'] },
      { condition: 'PMN <250', actions: ['Hold abx unless high suspicion', 'Culture-positive bacterascites follow-up'] },
    ],
    pearls: [
      'Inoculate culture bottles at the bedside to increase yield.',
      'Secondary peritonitis if not improving — apply Runyon criteria + imaging.',
    ],
  },

  {
    id: 'delta-meld',
    name: 'Delta-MELD (ΔMELD)',
    shortName: 'ΔMELD',
    description: 'Change in MELD over time as a dynamic prognostic marker.',
    category: 'gastroenterology',
    tags: ['meld', 'delta', 'cirrhosis', 'prognosis', 'transplant'],
    whenToUse: 'Serial MELD scores in decompensated cirrhosis or waitlist monitoring.',
    whyUse: 'Rising MELD (positive ΔMELD) associates with higher mortality beyond static MELD alone.',
    inputs: [
      numberInput('meldNow', 'Current MELD (or MELD-Na)', { min: 6, max: 40, defaultValue: 20 }),
      numberInput('meldPrior', 'Prior MELD (or MELD-Na)', { min: 6, max: 40, defaultValue: 15 }),
      numberInput('days', 'Interval between scores', { unit: 'days', min: 1, max: 365, defaultValue: 30 }),
    ],
    calculate(values) {
      const now = num(values.meldNow, 20);
      const prior = num(values.meldPrior, 15);
      const days = Math.max(num(values.days, 30), 1);
      const delta = round(now - prior, 1);
      const perWeek = round((delta / days) * 7, 2);
      let label = 'Stable / decreasing MELD';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = 'ΔMELD ≤0: score stable or improved — continue disease management and address reversible factors.';
      if (delta >= 5) {
        label = 'Large rise in MELD (Δ ≥5)';
        riskLevel = 'critical';
        interpretation = `MELD rose by ${delta} over ${days} days (~${perWeek}/week). Large increases predict higher short-term mortality — urgent hepatology review and transplant reassessment.`;
      } else if (delta >= 2) {
        label = 'Rising MELD (Δ 2–4.9)';
        riskLevel = 'high';
        interpretation = `MELD rose by ${delta} over ${days} days. Dynamic worsening — search for infection, bleed, alcohol relapse, thrombosis, or drug injury.`;
      } else if (delta > 0) {
        label = 'Mild rise in MELD';
        riskLevel = 'moderate';
        interpretation = `Slight increase (Δ=${delta}). Recheck labs, ensure no lab error, and monitor trajectory.`;
      }
      return {
        score: delta,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Current MELD', value: String(now) },
          { label: 'Prior MELD', value: String(prior) },
          { label: 'Δ per week', value: String(perWeek) },
        ],
      };
    },
    evidence: {
      summary: 'ΔMELD = MELD_current − MELD_prior. Positive and larger deltas associate with waitlist mortality independent of static MELD in several studies.',
      formula: 'ΔMELD = MELDnow − MELDprior',
      validation: 'Dynamic MELD change reported as prognostic in transplant waitlist cohorts; thresholds vary by study.',
      references: [
        {
          title: 'Longitudinal assessment of mortality risk among candidates for liver transplantation',
          citation: 'Merion RM et al. Liver Transpl. 2003',
          year: 2003,
          pmid: '12514767',
          doi: '10.1053/jlts.2003.50009',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rising ΔMELD', actions: ['Infection workup', 'US Doppler for portal vein thrombus', 'Transplant center update', 'Avoid nephrotoxins'] },
      { condition: 'Falling MELD', actions: ['Continue therapy', 'Reassess listing priority per policy'] },
    ],
    pearls: [
      'Use the same score type (MELD vs MELD-Na) for both time points.',
      'Lab variability can move MELD by 1 point — interpret small changes cautiously.',
    ],
  },

  {
    id: 'fibroscan-f-stage',
    name: 'FibroScan LSM → Fibrosis Stage (Approx)',
    shortName: 'LSM F-stage',
    description: 'Approximate histologic fibrosis stage bands from VCTE liver stiffness by etiology.',
    category: 'gastroenterology',
    tags: ['fibroscan', 'vcte', 'fibrosis', 'elastography', 'cirrhosis'],
    whenToUse: 'Interpreting vibration-controlled transient elastography (FibroScan) LSM in chronic liver disease.',
    whyUse: 'Etiology-aware kPa cut-offs triage advanced fibrosis/cirrhosis risk for clinical pathways.',
    inputs: [
      numberInput('lsm', 'Liver stiffness', { unit: 'kPa', min: 1, max: 75, step: 0.1, defaultValue: 8 }),
      selectInput('etiology', 'Dominant etiology', [
        { label: 'Viral hepatitis (HBV/HCV)', value: 'viral' },
        { label: 'NAFLD / MASLD', value: 'nafld' },
        { label: 'Alcohol-related liver disease', value: 'alcohol' },
        { label: 'Cholestatic / mixed / unspecified', value: 'other' },
      ]),
      numberInput('iqrMed', 'IQR/median ratio (optional quality)', {
        unit: '%',
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 15,
        helpText: 'Prefer IQR/med ≤30% with ≥10 valid measurements',
        required: false,
      }),
    ],
    calculate(values) {
      const lsm = num(values.lsm, 8);
      const et = String(values.etiology ?? 'viral');
      const iqrProvided = !isMissingValue(values.iqrMed, true);
      const iqr = num(values.iqrMed, 0);
      // Simplified educational cutoffs (approximate common clinical bands)
      // Viral: F0-1 <7.0, F2 ~7-9.5, F3 ~9.5-12.5, F4 ≥12.5
      // NAFLD: F0-1 <8, F2 8-10, F3 10-13.6, F4 ≥13.6 (varies; EASL often uses rule-out <8 rule-in >12)
      // Alcohol: higher cutoffs often used; F4 often ≥12.5–15+
      let bands: { max: number; stage: string; level: 'low' | 'moderate' | 'high' | 'critical' }[];
      if (et === 'nafld') {
        bands = [
          { max: 7.9, stage: 'F0–F1 (unlikely advanced fibrosis)', level: 'low' },
          { max: 9.9, stage: '≥F2 possible (indeterminate–significant)', level: 'moderate' },
          { max: 13.5, stage: '≥F3 advanced fibrosis likely', level: 'high' },
          { max: 75, stage: 'F4 cirrhosis range', level: 'critical' },
        ];
      } else if (et === 'alcohol') {
        bands = [
          { max: 7.9, stage: 'F0–F1 (lower likelihood advanced fibrosis)', level: 'low' },
          { max: 11.9, stage: 'Significant fibrosis possible', level: 'moderate' },
          { max: 18.9, stage: 'Advanced fibrosis / early cirrhosis range', level: 'high' },
          { max: 75, stage: 'Cirrhosis / high CSPH risk range', level: 'critical' },
        ];
      } else if (et === 'other') {
        bands = [
          { max: 6.9, stage: 'F0–F1 approximate', level: 'low' },
          { max: 9.4, stage: 'F2 approximate', level: 'moderate' },
          { max: 12.4, stage: 'F3 approximate', level: 'high' },
          { max: 75, stage: 'F4 approximate', level: 'critical' },
        ];
      } else {
        // viral default
        bands = [
          { max: 6.9, stage: 'F0–F1 approximate', level: 'low' },
          { max: 9.4, stage: 'F2 approximate', level: 'moderate' },
          { max: 12.4, stage: 'F3 approximate', level: 'high' },
          { max: 75, stage: 'F4 cirrhosis approximate', level: 'critical' },
        ];
      }
      let stage = bands[bands.length - 1].stage;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = bands[bands.length - 1].level;
      for (const b of bands) {
        if (lsm <= b.max) {
          stage = b.stage;
          riskLevel = b.level;
          break;
        }
      }
      const quality = !iqrProvided
        ? 'IQR/median ratio not entered — exam quality/reliability not assessed here (prefer ≤30% with ≥10 valid measurements).'
        : iqr > 30
          ? 'IQR/median >30% — result less reliable; repeat exam or alternative modality.'
          : 'IQR/median acceptable (≤30%) if adequate valid shots.';
      return {
        score: lsm,
        unit: 'kPa',
        label: stage,
        interpretation: `Approximate stage for ${et} etiology at LSM ${lsm} kPa. ${quality} Cut-offs vary by device, BMI, inflammation, and cholestasis — confirm with local pathways.`,
        riskLevel,
        details: [
          { label: 'Etiology profile', value: et },
          { label: 'IQR/median', value: iqrProvided ? `${iqr}%` : 'Not entered' },
          { label: 'CSPH non-invasive hint', value: lsm >= 20 ? 'LSM ≥20 favors CSPH risk (with low platelets)' : 'CSPH less likely if LSM <20 and plt high (Baveno)' },
        ],
        recommendations:
          riskLevel === 'critical' || riskLevel === 'high'
            ? ['Hepatology follow-up', 'Varices/HCC screening if cirrhosis', 'Confirm with second non-invasive test if discordant']
            : ['Lifestyle / antiviral therapy as indicated', 'Repeat fibrosis assessment periodically'],
      };
    },
    evidence: {
      summary: 'VCTE LSM correlates with fibrosis stage but cut-offs are etiology- and context-specific. This tool uses simplified educational bands, not a universal standard.',
      formula: 'Map kPa → approximate F-stage by etiology table',
      validation: 'Meta-analyses support high NPV for ruling out advanced fibrosis at low LSM; rule-in thresholds differ by disease.',
      references: [
        {
          title: 'EASL clinical practice guidelines on non-invasive tests for evaluation of liver disease severity',
          citation: 'EASL. J Hepatol. 2021',
          year: 2021,
          pmid: '34166721',
          doi: '10.1016/j.jhep.2021.05.025',
        },
      ],
    },
    nextSteps: [
      { condition: 'High LSM', actions: ['Assume advanced disease until proven otherwise', 'Complication screening', 'Hepatology referral'] },
      { condition: 'Low LSM', actions: ['Lower likelihood advanced fibrosis', 'Manage etiology', 'Repeat if clinical change'] },
    ],
    pearls: [
      'Acute hepatitis, congestion, and food intake inflate LSM.',
      'MRE or biopsy if results conflict with clinical picture.',
    ],
  },

  {
    id: 'df-units',
    name: 'Maddrey DF Unit Helper (PT vs INR)',
    shortName: 'DF Units',
    description: 'Educational helper for Maddrey discriminant function inputs — PT prolongation vs INR caveats.',
    category: 'gastroenterology',
    tags: ['maddrey', 'df', 'pt', 'inr', 'alcoholic hepatitis', 'units'],
    whenToUse: 'When calculating Maddrey DF and labs report INR more readily than PT/control.',
    whyUse: 'Original DF uses PT in seconds vs control; INR-based shortcuts are imperfect and lab-dependent.',
    inputs: [
      numberInput('pt', 'Patient PT', { unit: 'sec', min: 8, max: 120, step: 0.1, defaultValue: 18 }),
      numberInput('control', 'Control / mean normal PT', { unit: 'sec', min: 8, max: 20, step: 0.1, defaultValue: 12 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 8 }),
      numberInput('inr', 'INR (optional, for note only)', { min: 0.8, max: 10, step: 0.1, defaultValue: 1.5, required: false }),
      selectInput('biliUnit', 'Bilirubin unit entered as', [
        { label: 'mg/dL (correct for DF)', value: 'mg' },
        { label: 'µmol/L (will convert)', value: 'umol' },
      ]),
    ],
    calculate(values) {
      const pt = num(values.pt, 18);
      const control = num(values.control, 12);
      let bili = num(values.bili, 8);
      const unit = String(values.biliUnit ?? 'mg');
      if (unit === 'umol') bili = bili / 17.1;
      const prolong = round(pt - control, 1);
      const df = round(4.6 * (pt - control) + bili, 1);
      const inrProvided = !isMissingValue(values.inr, true);
      const inr = num(values.inr, 0);
      // Rough educational INR-based variant sometimes seen: 4.6×(INR-based proxy) — NOT recommended as equivalent
      const dfInrApprox = inrProvided ? round(4.6 * (inr * control - control) + bili, 1) : null;
      const severe = df >= 32;
      return {
        score: df,
        unit: 'DF',
        label: severe ? 'Severe AH by DF (≥32)' : 'DF <32 (not severe by Maddrey)',
        interpretation: severe
          ? 'Classic DF ≥32 defines severe alcoholic hepatitis for steroid trials. Prefer true PT and lab control PT. INR-only formulas are not interchangeable across labs.'
          : 'DF <32: not severe by Maddrey threshold. Use clinical judgment with MELD/GAHS/ABIC.',
        riskLevel: severe ? 'high' : 'moderate',
        details: [
          { label: 'PT prolongation', value: `${prolong} sec` },
          { label: 'Bilirubin used', value: `${round(bili, 2)} mg/dL` },
          { label: 'INR-based crude approx (not validated equivalent)', value: dfInrApprox != null ? String(dfInrApprox) : 'Not calculated — INR not entered' },
        ],
        recommendations: [
          'Enter PT and control from the same lab',
          'Convert bilirubin µmol/L → mg/dL (÷17.1)',
          'Pair with Lille score if steroids started',
        ],
      };
    },
    evidence: {
      summary: 'Maddrey DF = 4.6 × (PT_patient − PT_control) + bilirubin (mg/dL). This helper stresses correct units and limitations of INR substitution.',
      formula: 'DF = 4.6 × (PT − control) + bili_mg/dL',
      validation: 'Original Maddrey definition uses PT seconds; many EHRs expose INR only — use caution.',
      references: [
        {
          title: 'Corticosteroid therapy of alcoholic hepatitis',
          citation: 'Maddrey WC et al. Gastroenterology. 1978',
          year: 1978,
          pmid: '352788',
          doi: '10.1016/0016-5085(78)90401-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'DF ≥32', actions: ['Infection screen', 'Steroid candidacy', 'Plan Lille at day 7'] },
      { condition: 'Unit confusion', actions: ['Confirm bili in mg/dL', 'Call lab for control PT'] },
    ],
    pearls: [
      'Do not mix µmol/L bilirubin into DF without conversion.',
      'ISI differences make INR→PT reverse engineering unreliable for DF.',
    ],
  },

  {
    id: 'gerd-q',
    name: 'GerdQ Questionnaire',
    shortName: 'GerdQ',
    description: 'Patient symptom questionnaire score for GERD diagnosis probability and treatment response.',
    category: 'gastroenterology',
    tags: ['gerd', 'gerdq', 'reflux', 'questionnaire', 'symptoms'],
    whenToUse: 'Primary care or GI clinic assessment of suspected GERD and monitoring symptom control.',
    whyUse: 'Structured 6-item score; ≥8 suggests GERD and may support empiric PPI trial in typical patients.',
    inputs: [
      selectInput('heartburn', 'Heartburn frequency (past 7 days)', [
        { label: '0 days (0)', value: 0 },
        { label: '1 day (1)', value: 1 },
        { label: '2–3 days (2)', value: 2 },
        { label: '4–7 days (3)', value: 3 },
      ], 0, 'Ask official GerdQ 7-day items (Jones 2009); this screen is score entry. Operational: burning behind the breastbone.'),
      selectInput('regurg', 'Regurgitation frequency (past 7 days)', [
        { label: '0 days (0)', value: 0 },
        { label: '1 day (1)', value: 1 },
        { label: '2–3 days (2)', value: 2 },
        { label: '4–7 days (3)', value: 3 },
      ], 0, 'Stomach contents moving upwards to the throat or mouth.'),
      selectInput('epigastric', 'Epigastric pain frequency (past 7 days)', [
        { label: '0 days (3)', value: 3 },
        { label: '1 day (2)', value: 2 },
        { label: '2–3 days (1)', value: 1 },
        { label: '4–7 days (0)', value: 0 },
      ], 3, 'Pain in the centre of the upper stomach (not heartburn). Reverse scored — more pain lowers GERD-likelihood points.'),
      selectInput('nausea', 'Nausea frequency (past 7 days)', [
        { label: '0 days (3)', value: 3 },
        { label: '1 day (2)', value: 2 },
        { label: '2–3 days (1)', value: 1 },
        { label: '4–7 days (0)', value: 0 },
      ], 3, 'Feeling sick to the stomach. Reverse scored — more nausea lowers GERD-likelihood points.'),
      selectInput('sleep', 'Sleep disturbance from heartburn/regurg (past 7 days)', [
        { label: '0 days (0)', value: 0 },
        { label: '1 day (1)', value: 1 },
        { label: '2–3 days (2)', value: 2 },
        { label: '4–7 days (3)', value: 3 },
      ], 0, 'Difficulty getting a good night’s sleep because of heartburn and/or regurgitation.'),
      selectInput('otc', 'OTC meds for heartburn/regurg (past 7 days)', [
        { label: '0 days (0)', value: 0 },
        { label: '1 day (1)', value: 1 },
        { label: '2–3 days (2)', value: 2 },
        { label: '4–7 days (3)', value: 3 },
      ], 0, 'Additional medication for heartburn/regurgitation other than physician-prescribed therapy (e.g. antacids/OTC, not prescribed PPI).'),
    ],
    calculate(values) {
      const score =
        num(values.heartburn) +
        num(values.regurg) +
        num(values.epigastric) +
        num(values.nausea) +
        num(values.sleep) +
        num(values.otc);
      // Impact on daily life subscore often sleep + OTC
      const impact = num(values.sleep) + num(values.otc);
      let label = 'GERD less likely';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let interpretation =
        'GerdQ ≤2: low likelihood of GERD — consider alternative diagnoses (functional dyspepsia, eosinophilic esophagitis, cardiac, etc.).';
      if (score >= 8) {
        label = 'GERD likely';
        riskLevel = 'high';
        interpretation = `GerdQ ≥8: GERD is likely. Empiric PPI trial often appropriate if no alarm features. Impact subscore (sleep+OTC) = ${impact} (≥3 suggests troublesome impact).`;
      } else if (score >= 3) {
        label = 'Indeterminate / possible GERD';
        riskLevel = 'moderate';
        interpretation = `GerdQ 3–7: intermediate. Clinical judgment, trial of therapy, or further testing based on alarm features and chronicity. Impact subscore = ${impact}.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Range', value: '0–18' },
          { label: 'Impact (sleep + OTC)', value: `${impact} / 6` },
          { label: 'Diagnostic cutoff', value: '≥8 suggests GERD' },
        ],
        recommendations:
          score >= 8
            ? ['PPI trial if no red flags', 'Lifestyle measures', 'Endoscopy if alarm symptoms or failed therapy']
            : ['Reconsider differential', 'Test/treat H. pylori if dyspepsia pathway', 'Endoscopy if alarms'],
      };
    },
    evidence: {
      summary: 'GerdQ: 6 items over 7 days. Heartburn, regurgitation, sleep disturbance, OTC use scored 0–3; epigastric pain and nausea reverse-scored 3–0. Total ≥8 suggests GERD.',
      formula: 'Sum of 6 scored frequency items (0–18)',
      validation: 'Validated against endoscopy/pH and specialist diagnosis; used for diagnosis probability and treatment response tracking.',
      references: [
        {
          title: 'Development of the GerdQ, a tool for the diagnosis and management of gastro-oesophageal reflux disease in primary care',
          citation: 'Jones R et al. Aliment Pharmacol Ther. 2009',
          year: 2009,
          pmid: '19737151',
          doi: '10.1111/j.1365-2036.2009.04142.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'GerdQ ≥8 without alarms', actions: ['Empiric PPI', 'Lifestyle counseling', 'Follow GerdQ on therapy'] },
      { condition: 'Alarms or refractory', actions: ['Endoscopy', 'Consider pH-impedance / manometry pathways'] },
    ],
    pearls: [
      'Alarm features (dysphagia, bleeding, weight loss, anemia) override questionnaire pathways.',
      'Epigastric pain and nausea are reverse-scored because they favor non-GERD dyspepsia.',
    ],
  },
];
