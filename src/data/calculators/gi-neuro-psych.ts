import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** CIWA-Ar select: official Sullivan 1989 anchors on 0/1/4/7 (orientation 0–4). Unlabeled ranks stay interpolations. */
function ciwaSelect(
  id: string,
  label: string,
  helpText: string,
  anchors: Partial<Record<number, string>>,
  max = 7,
) {
  return selectInput(
    id,
    label,
    Array.from({ length: max + 1 }, (_, i) => ({
      label: anchors[i] ? `${i} — ${anchors[i]}` : String(i),
      value: i,
      description: anchors[i]
        ?? 'Interpolate between the official 0 / 1 / 4 / 7 anchors (Sullivan 1989 leaves this rank unlabeled).',
    })),
    0,
    helpText,
  );
}

export const giNeuroPsychCalcs: Calculator[] = [
  {
    id: 'child-pugh',
    name: 'Child-Pugh Score',
    shortName: 'Child-Pugh',
    description: 'Chronic liver disease severity classification.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'liver', 'prognosis'],
    whenToUse: 'Cirrhosis severity, surgical risk, prognosis discussions.',
    whyUse: 'Classic liver disease staging; complements MELD for transplant.',
    inputs: [
      selectInput('bili', 'Total bilirubin (mg/dL)', [
        { label: '<2 (1)', value: 1 },
        { label: '2–3 (2)', value: 2 },
        { label: '>3 (3)', value: 3 },
      ]),
      selectInput('albumin', 'Albumin (g/dL)', [
        { label: '>3.5 (1)', value: 1 },
        { label: '2.8–3.5 (2)', value: 2 },
        { label: '<2.8 (3)', value: 3 },
      ]),
      selectInput('inr', 'INR', [
        { label: '<1.7 (1)', value: 1 },
        { label: '1.7–2.3 (2)', value: 2 },
        { label: '>2.3 (3)', value: 3 },
      ]),
      selectInput('ascites', 'Ascites', [
        { label: 'None (1)', value: 1 },
        { label: 'Mild (2)', value: 2 },
        { label: 'Moderate–severe (3)', value: 3 },
      ]),
      selectInput('enceph', 'Encephalopathy', [
        { label: 'None (1)', value: 1 },
        { label: 'Grade 1–2 (2)', value: 2 },
        { label: 'Grade 3–4 (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.bili) + num(values.albumin) + num(values.inr) + num(values.ascites) + num(values.enceph);
      let cls = 'A';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation = 'Child-Pugh A: well-compensated; 1-year survival ~100% historically.';
      if (score >= 10) {
        cls = 'C';
        riskLevel = 'high';
        interpretation = 'Child-Pugh C: decompensated; high surgical mortality; transplant evaluation if candidate.';
      } else if (score >= 7) {
        cls = 'B';
        riskLevel = 'moderate';
        interpretation = 'Child-Pugh B: significant functional compromise; careful procedural risk assessment.';
      }
      return { score, label: `Class ${cls}`, interpretation, riskLevel, details: [{ label: 'Class ranges', value: 'A 5–6, B 7–9, C 10–15' }] };
    },
    evidence: {
      summary: 'Child-Turcotte-Pugh uses bili, albumin, INR, ascites, encephalopathy.',
      validation: 'Longstanding surgical risk and cirrhosis severity tool.',
      references: [{ title: 'Surgery and portal hypertension', citation: 'Child CG, Turcotte JG. 1964; Pugh modification 1973', year: 1973, pmid: '4950264',
          doi: '10.1002/bjs.1800600817', }],
    },
    nextSteps: [
      { condition: 'Class B–C', actions: ['Manage decompensation', 'Screen HCC/varices', 'Consider transplant referral'] },
    ],
  },
  {
    id: 'meld',
    name: 'MELD Score',
    shortName: 'MELD',
    description: 'Model for End-Stage Liver Disease — 3-month mortality risk.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'transplant', 'meld'],
    whenToUse: 'Liver transplant prioritization and cirrhosis prognosis.',
    whyUse: 'Objective lab-based score used by transplant systems (often MELD-Na).',
    inputs: [
      numberInput('bili', 'Bilirubin', { unit: 'mg/dL', min: 0.1, max: 50, step: 0.1, defaultValue: 2.0 }),
      numberInput('inr', 'INR', { min: 0.8, max: 20, step: 0.1, defaultValue: 1.5 }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.1, defaultValue: 1.0 }),
      yesNo('dialysis', 'Dialysis ≥2 times in past week (or 24h CVVHD)', null, 'Sets creatinine to 4.0 mg/dL per OPTN MELD rules (does not add a fixed point total)'),
    ],
    calculate(values) {
      let bili = Math.max(num(values.bili, 2), 1);
      let inr = Math.max(num(values.inr, 1.5), 1);
      let cr = Math.max(num(values.creat, 1), 1);
      // Dialysis ≥2× in past week (or continuous RRT) → creatinine fixed at 4.0; also cap Cr at 4.0
      if (bool(values.dialysis) || cr > 4) cr = 4;
      const meld = round(10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.12 * Math.log(inr) + 0.643), 0);
      const score = Math.max(6, Math.min(40, meld));
      const r = riskFromThresholds(score, [
        { max: 9, level: 'low', label: 'Lower risk', interpretation: '3-month mortality relatively low historically.' },
        { max: 19, level: 'moderate', label: 'Intermediate', interpretation: 'Rising mortality; specialist/transplant center involvement often needed.' },
        { max: 29, level: 'high', label: 'High', interpretation: 'High short-term mortality without transplant/support.' },
        { max: 40, level: 'critical', label: 'Very high', interpretation: 'Very high 3-month mortality; urgent transplant evaluation.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MELD = 10×[0.957×ln(Cr)+0.378×ln(bili)+1.12×ln(INR)+0.643], capped 6–40.',
      validation: 'Predicts waitlist mortality; foundation of allocation systems.',
      references: [{ title: 'A model to predict survival in patients with end-stage liver disease', citation: 'Kamath PS et al. Hepatology. 2001', year: 2001, pmid: '11172350',
          doi: '10.1053/jhep.2001.22172', }],
    },
    nextSteps: [
      { condition: 'MELD ≥15', actions: ['Transplant center referral if candidate', 'Manage complications of cirrhosis'] },
    ],
  },
  {
    id: 'meld-na',
    name: 'MELD-Na Score',
    shortName: 'MELD-Na',
    description: 'MELD incorporating sodium for improved waitlist mortality prediction.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'transplant', 'sodium'],
    whenToUse: 'Liver allocation / prognosis with hyponatremia.',
    whyUse: 'Hyponatremia adds prognostic information beyond MELD.',
    inputs: [
      numberInput('meld', 'MELD score', { min: 6, max: 40, defaultValue: 15 }),
      numberInput('na', 'Serum sodium', { unit: 'mEq/L', min: 120, max: 150, defaultValue: 135, helpText: 'OPTN bounds Na to 125–137 for the adjustment' }),
    ],
    calculate(values) {
      let meld = num(values.meld, 15);
      let na = num(values.na, 135);
      // OPTN MELD-Na: Na bounded 125–137 (not 140) with reference Na 137
      na = Math.max(125, Math.min(137, na));
      let meldNa = meld;
      if (meld > 11) {
        meldNa = round(meld + 1.32 * (137 - na) - 0.033 * meld * (137 - na), 0);
      }
      meldNa = Math.max(6, Math.min(40, meldNa));
      return {
        score: meldNa,
        label: 'MELD-Na',
        interpretation: 'OPTN-style MELD-Na (Na capped 125–137). Higher score → higher waitlist priority/mortality risk.',
        riskLevel: meldNa >= 30 ? 'critical' : meldNa >= 20 ? 'high' : meldNa >= 15 ? 'moderate' : 'low',
      };
    },
    evidence: {
      summary: 'OPTN MELD-Na = MELD + 1.32×(137−Na) − 0.033×MELD×(137−Na) when MELD >11; Na bounded 125–137.',
      validation: 'Improved waitlist mortality prediction vs MELD alone; used in US liver allocation.',
      references: [{ title: 'Hyponatremia and mortality among patients on the liver-transplant waiting list', citation: 'Kim WR et al. N Engl J Med. 2008', year: 2008, pmid: '18768945',
          doi: '10.1056/NEJMoa0801209', }],
    },
    nextSteps: [{ condition: 'Elevated', actions: ['Transplant evaluation', 'Careful sodium correction'] }],
  },
  {
    id: 'glasgow-blatchford',
    name: 'Glasgow-Blatchford Score (GBS)',
    shortName: 'Glasgow-Blatchford',
    description: 'Risk stratifies upper GI bleed for outpatient vs inpatient care.',
    category: 'gastroenterology',
    tags: ['ugib', 'bleed', 'gi'],
    whenToUse: 'Adults with suspected upper GI bleeding.',
    whyUse: 'Score 0–1 identifies very low-risk patients often safe for outpatient management.',
    inputs: [
      selectInput('bun', 'BUN (mg/dL)', [
        { label: '<18.2 (0)', value: 0 },
        { label: '18.2–22.3 (2)', value: 2 },
        { label: '22.4–28.0 (3)', value: 3 },
        { label: '28.1–70.0 (4)', value: 4 },
        { label: '≥70 (6)', value: 6 },
      ]),
      selectInput('hbMale', 'Hemoglobin (use sex-specific)', [
        { label: 'Male ≥13 / Female ≥12 (0)', value: 0 },
        { label: 'Male 12–12.9 / Female 10–11.9 (1)', value: 1 },
        { label: 'Male 10–11.9 (3)', value: 3 },
        { label: '<10 either sex (6)', value: 6 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '≥110 (0)', value: 0 },
        { label: '100–109 (1)', value: 1 },
        { label: '90–99 (2)', value: 2 },
        { label: '<90 (3)', value: 3 },
      ]),
      yesNo('hr100', 'Heart rate ≥ 100', 1),
      yesNo('melena', 'Melena', 1),
      yesNo('syncope', 'Syncope', 2),
      yesNo('liver', 'Hepatic disease', 2),
      yesNo('heart', 'Cardiac failure', 2),
    ],
    calculate(values) {
      const score =
        num(values.bun) +
        num(values.hbMale) +
        num(values.sbp) +
        (bool(values.hr100) ? 1 : 0) +
        (bool(values.melena) ? 1 : 0) +
        (bool(values.syncope) ? 2 : 0) +
        (bool(values.liver) ? 2 : 0) +
        (bool(values.heart) ? 2 : 0);
      // ACG 2021: GBS 0–1 very low risk for outpatient discharge
      if (score <= 1) {
        return {
          score,
          label: 'Very low risk',
          interpretation: `GBS ${score}: very low risk of needing hospital-based intervention; outpatient management often safe (ACG suggests discharge with outpatient follow-up for GBS 0–1).`,
          riskLevel: 'low',
        };
      }
      return {
        score,
        label: score <= 3 ? 'Low–moderate risk' : 'Higher risk',
        interpretation: `GBS ${score}: higher likelihood of needing transfusion/endoscopy/surgery — typically admit.`,
        riskLevel: score >= 6 ? 'high' : 'moderate',
      };
    },
    evidence: {
      summary: 'GBS predicts need for hospital-based intervention in UGIB better than Rockall for this purpose. GBS 0–1 is the modern very-low-risk band for outpatient pathways.',
      validation: 'Multiple ED validations; ACG 2021 supports GBS 0–1 for early discharge consideration.',
      references: [{ title: 'A risk score to predict need for treatment for upper GI haemorrhage', citation: 'Blatchford O et al. Lancet. 2000', year: 2000, pmid: '11073021',
          doi: '10.1016/S0140-6736(00)02816-6', }],
    },
    nextSteps: [
      { condition: 'GBS ≤1', actions: ['Consider discharge with early GI follow-up', 'PPI as indicated', 'Return precautions'] },
      { condition: 'GBS ≥2', actions: ['Admit', 'Resuscitation', 'Urgent endoscopy timing per severity'] },
    ],
  },
  {
    id: 'rockall',
    name: 'Rockall Score (Pre-endoscopy)',
    shortName: 'Rockall',
    description: 'Mortality risk in UGIB using clinical variables (pre-endoscopy version).',
    category: 'gastroenterology',
    tags: ['ugib', 'mortality'],
    whenToUse: 'Upper GI bleed mortality risk stratification.',
    whyUse: 'Complements GBS; full Rockall includes endoscopic findings.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<60 (0)', value: 0 },
        { label: '60–79 (1)', value: 1 },
        { label: '≥80 (2)', value: 2 },
      ]),
      selectInput('shock', 'Shock', [
        { label: 'No shock HR≤100 SBP≥100 (0)', value: 0 },
        { label: 'Tachycardia HR>100 SBP≥100 (1)', value: 1 },
        { label: 'Hypotension SBP<100 (2)', value: 2 },
      ]),
      selectInput('comorbid', 'Comorbidity', [
        { label: 'None (0)', value: 0 },
        { label: 'Heart failure, IHD, other major (2)', value: 2 },
        { label: 'Renal/liver failure or metastatic cancer (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.age) + num(values.shock) + num(values.comorbid);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Lower mortality risk', interpretation: 'Pre-endoscopy Rockall low; still complete full score after endoscopy when available.' },
        { max: 4, level: 'moderate', label: 'Intermediate', interpretation: 'Intermediate risk — inpatient care and timely endoscopy.' },
        { max: 7, level: 'high', label: 'High', interpretation: 'High mortality risk — aggressive resuscitation and urgent endoscopy.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Rockall score predicts mortality after UGIB; complete score adds diagnosis and stigmata of bleeding.',
      validation: 'National UK audit derivation/validation.',
      references: [{ title: 'Risk assessment after acute upper gastrointestinal haemorrhage', citation: 'Rockall TA et al. Gut. 1996', year: 1996, pmid: '8675081',
          doi: '10.1136/gut.38.3.316', }],
    },
    nextSteps: [{ condition: 'High score', actions: ['Resuscitate', 'Urgent endoscopy', 'ICU if unstable'] }],
  },
  {
    id: 'alvarado',
    name: 'Alvarado Score (Appendicitis)',
    shortName: 'Alvarado',
    description: 'Clinical probability of acute appendicitis.',
    category: 'emergency',
    tags: ['appendicitis', 'abdominal pain'],
    whenToUse: 'Suspected appendicitis to guide imaging/surgery decisions.',
    whyUse: 'Structured clinical probability; imaging still common.',
    inputs: [
      yesNo('migration', 'Migration of pain to RLQ', 1),
      yesNo('anorexia', 'Anorexia', 1),
      yesNo('nausea', 'Nausea / vomiting', 1),
      yesNo('rlq', 'RLQ tenderness', 2),
      yesNo('rebound', 'Rebound tenderness', 1),
      yesNo('fever', 'Temperature ≥37.3°C', 1),
      yesNo('leukocytosis', 'Leukocytosis >10,000', 2),
      yesNo('leftshift', 'Left shift (neutrophilia)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.migration) ? 1 : 0) +
        (bool(values.anorexia) ? 1 : 0) +
        (bool(values.nausea) ? 1 : 0) +
        (bool(values.rlq) ? 2 : 0) +
        (bool(values.rebound) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.leukocytosis) ? 2 : 0) +
        (bool(values.leftshift) ? 1 : 0);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Low probability', interpretation: 'Appendicitis less likely; consider alternatives / observation.' },
        { max: 6, level: 'moderate', label: 'Intermediate', interpretation: 'Possible appendicitis — imaging often warranted.' },
        { max: 10, level: 'high', label: 'High probability', interpretation: 'High likelihood — surgical consultation; imaging per practice.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MANTRELS mnemonic: Migration, Anorexia, Nausea, Tenderness RLQ, Rebound, Elevated temp, Leukocytosis, Shift.',
      validation: 'Multiple validations; variable performance — imaging remains important.',
      references: [{ title: 'A practical score for the early diagnosis of acute appendicitis', citation: 'Alvarado A. Ann Emerg Med. 1986', year: 1986, pmid: '3963537',
          doi: '10.1016/s0196-0644(86)80993-3', }],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Reassess', 'Consider gyn/GU alternatives'] },
      { condition: 'Intermediate–high', actions: ['CT/US/MRI per age/pregnancy', 'Surgical consult'] },
    ],
  },
  {
    id: 'ranson',
    name: "Ranson's Criteria (Admission)",
    shortName: "Ranson's",
    description: 'Pancreatitis severity using admission criteria (complete score needs 48h labs).',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'severity'],
    whenToUse: 'Acute pancreatitis severity (admission portion shown).',
    whyUse: 'Classic criteria; BISAP/APACHE often more practical early.',
    inputs: [
      yesNo('age', 'Age > 55 years', 1),
      yesNo('wbc', 'WBC > 16,000', 1),
      yesNo('glu', 'Glucose > 200 mg/dL', 1),
      yesNo('ldh', 'LDH > 350 U/L', 1),
      yesNo('ast', 'AST > 250 U/L', 1),
    ],
    calculate(values) {
      const score = ['age', 'wbc', 'glu', 'ldh', 'ast'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      return {
        score,
        label: `Admission criteria met: ${score}/5`,
        interpretation: 'Add 48-hour criteria (Hct drop, BUN rise, Ca, PaO₂, base deficit, fluid sequestration) for full Ranson. ≥3 total suggests severe disease.',
        riskLevel: score >= 3 ? 'high' : score >= 1 ? 'moderate' : 'low',
      };
    },
    evidence: {
      summary: 'Ranson criteria: 5 at admission + 6 at 48 hours predict pancreatitis mortality.',
      validation: 'Historical standard; requires 48h for completion.',
      references: [{ title: 'Prognostic signs and nonoperative peritoneal lavage in acute pancreatitis', citation: 'Ranson JH et al. Surg Gynecol Obstet. 1974', year: 1974, pmid: '4834279' }],
    },
    nextSteps: [
      { condition: 'Any acute pancreatitis', actions: ['Aggressive early fluids (goal-directed)', 'Early feeding as tolerated', 'ERCP if cholangitis/obstruction'] },
    ],
  },
  {
    id: 'bisap',
    name: 'BISAP Score',
    shortName: 'BISAP',
    description: 'Bedside Index for Severity in Acute Pancreatitis.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'severity'],
    whenToUse: 'Early severity assessment in acute pancreatitis (first 24h).',
    whyUse: 'Simple, uses data available early; predicts mortality.',
    inputs: [
      yesNo('bun', 'BUN > 25 mg/dL', 1),
      yesNo('ams', 'Impaired mental status', 1),
      yesNo('sirs', 'SIRS (≥2 criteria)', 1),
      yesNo('age', 'Age > 60 years', 1),
      yesNo('pleural', 'Pleural effusion', 1),
    ],
    calculate(values) {
      const score = ['bun', 'ams', 'sirs', 'age', 'pleural'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Lower mortality risk', interpretation: 'BISAP ≤2: lower risk of mortality and organ failure.' },
        { max: 5, level: 'high', label: 'Higher mortality risk', interpretation: 'BISAP ≥3: higher risk — closer monitoring, possible ICU.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'BISAP: BUN, mental status, SIRS, age, pleural effusion.',
      validation: 'Validated for mortality prediction comparable to more complex scores.',
      references: [{ title: 'The early prediction of mortality in acute pancreatitis: a large population-based study', citation: 'Wu BU et al. Gut. 2008', year: 2008, pmid: '18519429',
          doi: '10.1136/gut.2008.152702', }],
    },
    nextSteps: [{ condition: 'BISAP ≥3', actions: ['Monitor organ failure', 'ICU consideration', 'Supportive care optimization'] }],
  },
  {
    id: 'abcd2',
    name: 'ABCD² Score',
    shortName: 'ABCD²',
    description: 'Stroke risk after TIA (2-day risk stratification).',
    category: 'neurology',
    tags: ['tia', 'stroke', 'secondary prevention'],
    whenToUse: 'Patients with recent TIA symptoms.',
    whyUse: 'Guides urgency of workup (though urgent workup increasingly universal).',
    inputs: [
      yesNo('age', 'Age ≥ 60', 1),
      yesNo('bp', 'BP ≥140/90 at presentation', 1),
      selectInput('clinical', 'Clinical features', [
        { label: 'Other symptoms (0)', value: 0 },
        { label: 'Speech disturbance without weakness (1)', value: 1 },
        { label: 'Unilateral weakness (2)', value: 2 },
      ]),
      selectInput('duration', 'Duration of symptoms', [
        { label: '<10 min (0)', value: 0 },
        { label: '10–59 min (1)', value: 1 },
        { label: '≥60 min (2)', value: 2 },
      ]),
      yesNo('dm', 'Diabetes', 1),
    ],
    calculate(values) {
      const score = (bool(values.age) ? 1 : 0) + (bool(values.bp) ? 1 : 0) + num(values.clinical) + num(values.duration) + (bool(values.dm) ? 1 : 0);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'low', label: 'Low risk (0–3)', interpretation: 'Lower short-term stroke risk historically (~1% at 2 days) — still needs timely workup.' },
        { max: 5, level: 'moderate', label: 'Moderate (4–5)', interpretation: 'Moderate 2-day stroke risk (~4%).' },
        { max: 7, level: 'high', label: 'High (6–7)', interpretation: 'High short-term stroke risk (~8% at 2 days). Urgent evaluation.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'ABCD² predicts short-term stroke after TIA using Age, BP, Clinical features, Duration, Diabetes.',
      validation: 'Widely studied; dual antiplatelet and urgent secondary prevention now standard regardless of score for many TIAs.',
      references: [{ title: 'Validation and refinement of scores to predict very early stroke risk after TIA', citation: 'Johnston SC et al. Lancet. 2007', year: 2007, pmid: '17258668',
          doi: '10.1016/S0140-6736(07)60150-0', }],
    },
    nextSteps: [
      { condition: 'All TIA', actions: ['Urgent vascular imaging', 'ECG/AF screen', 'Antiplatelet therapy', 'Statin and risk-factor control'] },
    ],
  },
  {
    id: 'nihss',
    name: 'NIH Stroke Scale (NIHSS)',
    shortName: 'NIHSS',
    description: 'Stroke severity scale — enter each domain score for live composite (0–42).',
    category: 'neurology',
    tags: ['stroke', 'nihss'],
    whenToUse: 'Acute ischemic stroke severity and communication.',
    whyUse: 'Standard for tPA/thrombectomy trials and serial exams.',
    inputs: [
      selectInput(
        'loc',
        '1a. Level of consciousness (0–3)',
        [
          { label: '0 — Alert', value: 0, points: 0, description: 'Keenly responsive' },
          { label: '1 — Not alert, arousable', value: 1, points: 1, description: 'Arousable by minor stimulation to obey, answer, or respond' },
          { label: '2 — Not alert, obtunded', value: 2, points: 2, description: 'Requires repeated or strong/painful stimulation for non-stereotyped movements' },
          { label: '3 — Unresponsive / reflex only', value: 3, points: 3, description: 'Reflex motor or autonomic responses only, or flaccid and areflexic' },
        ],
        0,
        'Must pick a score even if ET tube, language barrier, or bandages. Score 3 only if no movement other than reflex posturing to noxious stimulation.',
      ),
      selectInput(
        'locQ',
        '1b. Ask month and age (0–2)',
        [
          { label: '0 — Both questions right', value: 0, points: 0, description: 'Month and age both correct on first attempt' },
          { label: '1 — One question right (or intubated / dysarthria / language barrier)', value: 1, points: 1, description: 'One correct, or untestable due to ET tube, severe dysarthria, trauma, or language barrier' },
          { label: '2 — Neither correct (or aphasic)', value: 2, points: 2, description: 'Neither correct, or aphasic / stuporous with no comprehension' },
        ],
        0,
        'Ask: “What month is it?” and “How old are you?” Grade the first answer. Do not coach. Not date, place, or president.',
      ),
      selectInput(
        'locC',
        "1c. 'Open/close eyes' and 'grip/release' (0–2)",
        [
          { label: '0 — Performs both tasks', value: 0, points: 0, description: 'Both one-step commands performed' },
          { label: '1 — Performs 1 task', value: 1, points: 1, description: 'One command performed (credit an unequivocal attempt limited by weakness)' },
          { label: '2 — Performs 0 tasks', value: 2, points: 2, description: 'Neither command performed' },
        ],
        0,
        'Commands: (1) open and close the eyes; (2) grip and release the non-paretic hand. Pantomime if there is a communication barrier. Substitute another one-step command if the hand is unusable. Do not coach.',
      ),
      selectInput(
        'gaze',
        '2. Horizontal extraocular movements (0–2)',
        [
          { label: '0 — Normal', value: 0, points: 0, description: 'Voluntary or oculocephalic gaze intact' },
          { label: '1 — Partial gaze palsy (can be overcome)', value: 1, points: 1, description: 'Abnormal gaze in one or both eyes, but not forced deviation or total paresis; includes isolated III/IV/VI and gaze that corrects with oculocephalic reflex' },
          { label: '2 — Forced deviation (not overcome by oculocephalic)', value: 2, points: 2, description: 'Forced deviation or total gaze paresis not overcome by oculocephalic maneuver' },
        ],
        0,
        'Only assess horizontal gaze. Test voluntary or oculocephalic (doll’s-eye) gaze. Do not use calorics. Isolated cranial-nerve palsy (e.g. III, IV, VI) scores 1.',
      ),
      selectInput(
        'visual',
        '3. Visual fields (0–3)',
        [
          { label: '0 — No loss', value: 0, points: 0, description: 'No visual loss by confrontation' },
          { label: '1 — Partial hemianopia', value: 1, points: 1, description: 'Partial (quadrantanopia or clear asymmetry, including extinction)' },
          { label: '2 — Complete hemianopia', value: 2, points: 2, description: 'Dense visual loss in an entire hemifield' },
          { label: '3 — Bilateral / blind', value: 3, points: 3, description: 'Bilateral hemianopia, including cortical blindness; any-cause blindness scores 3' },
        ],
        0,
        'Confrontation visual fields, upper and lower quadrants. If unilaterally blind, test the remaining eye. Patients who are blind from any cause score 3.',
      ),
      selectInput(
        'facial',
        '4. Facial palsy — show teeth / raise brows / close eyes (0–3)',
        [
          { label: '0 — Normal', value: 0, description: 'Symmetrical movement' },
          { label: '1 — Minor', value: 1, description: 'Flattened nasolabial fold or asymmetrical smile' },
          { label: '2 — Partial', value: 2, description: 'Total or near-total paralysis of the lower face' },
          { label: '3 — Complete', value: 3, description: 'Absent movement in upper and lower face (one or both sides)' },
        ],
        0,
        'Ask the patient to show teeth or raise eyebrows and close eyes. If stuporous, score grimace to noxious stimulation.',
      ),
      selectInput(
        'armL',
        '5a. Left arm hold 90°/45° × 10 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 90° sitting or 45° supine for full 10 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 10 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 90°/45°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Palms down, 90° sitting or 45° supine × 10 s; test the non-paretic arm first. Amputation or shoulder fusion = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'armR',
        '5b. Right arm hold 90°/45° × 10 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 90° sitting or 45° supine for full 10 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 10 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 90°/45°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Palms down, 90° sitting or 45° supine × 10 s; test the non-paretic arm first. Amputation or shoulder fusion = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'legL',
        '6a. Left leg hold 30° × 5 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 30° supine for full 5 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 5 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 30°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Supine, raise to 30° × 5 s; test the non-paretic leg first. Hip fusion or amputation = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'legR',
        '6b. Right leg hold 30° × 5 s (0–4)',
        [
          { label: '0 — No drift', value: 0, description: 'Holds 30° supine for full 5 s' },
          { label: '1 — Drift', value: 1, description: 'Falls before 5 s but does not hit the bed' },
          { label: '2 — Some effort vs gravity', value: 2, description: 'Some effort against gravity; cannot get to or maintain 30°; drifts to bed' },
          { label: '3 — No effort vs gravity', value: 3, description: 'Limb falls; no effort against gravity' },
          { label: '4 — No movement', value: 4, description: 'No movement' },
        ],
        0,
        'Supine, raise to 30° × 5 s; test the non-paretic leg first. Hip fusion or amputation = UN off-form (do not enter 0 or 4).',
      ),
      selectInput(
        'ataxia',
        '7. Finger-nose and heel-shin ataxia (0–2)',
        [
          { label: '0 — Absent', value: 0, description: 'No ataxia, or paralyzed / does not understand (score 0, not UN)' },
          { label: '1 — One limb', value: 1, description: 'Ataxia in one limb, out of proportion to weakness' },
          { label: '2 — Two limbs', value: 2, description: 'Ataxia in two limbs, out of proportion to weakness' },
        ],
        0,
        'Finger-nose-finger and heel-shin. Score only if out of proportion to weakness. Paralyzed or does not understand → 0. Amputation or joint fusion = UN off-form.',
      ),
      selectInput(
        'sensory',
        '8. Pinprick sensory (0–2)',
        [
          { label: '0 — Normal', value: 0, description: 'No sensory loss to pinprick' },
          { label: '1 — Mild–moderate loss', value: 1, description: 'Aware of being touched, but pinprick is less sharp or dull on the affected side' },
          { label: '2 — Severe / total loss', value: 2, description: 'Unaware of being touched on face, arm, and leg' },
        ],
        0,
        'Pinprick (or noxious stimulus if consciousness is impaired). Test face, arm, and leg. Stuporous / aphasic: grimace or withdrawal counts as awareness.',
      ),
      selectInput(
        'language',
        '9. Best language — picture, naming, reading (0–3)',
        [
          { label: '0 — No aphasia', value: 0, description: 'Normal comprehension and expression' },
          { label: '1 — Mild–moderate', value: 1, description: 'Loss of fluency or comprehension, but examiner can still identify picture or naming-card content from the response' },
          { label: '2 — Severe', value: 2, description: 'Fragmentary expression; listener carries the burden; cannot identify materials from the response' },
          { label: '3 — Mute / global', value: 3, description: 'No usable speech or auditory comprehension; also score 3 if item 1a is 3' },
        ],
        0,
        'Use the NIHSS cookie-theft picture, naming card, and sentence reading. If 1a LOC = 3, language scores 3. Coma / unresponsive = 3.',
      ),
      selectInput(
        'dysarthria',
        '10. Dysarthria — read/repeat word list (0–2)',
        [
          { label: '0 — Normal', value: 0, description: 'Clear articulation' },
          { label: '1 — Mild–moderate', value: 1, description: 'Slurs at least some words; understood with some difficulty' },
          { label: '2 — Severe / anarthric', value: 2, description: 'Unintelligible, mute, or anarthric (out of proportion to any aphasia)' },
        ],
        0,
        'Ask the patient to read or repeat: Mama, tip-top, fifty-fifty, thanks, huckleberry, baseball player, hula hoop. Intubated or other physical barrier = UN off-form (do not enter 0 or 2).',
      ),
      selectInput(
        'extinction',
        '11. Extinction / inattention (double simultaneous) (0–2)',
        [
          { label: '0 — No abnormality', value: 0, description: 'No inattention; aphasia attending to both sides scores 0' },
          { label: '1 — Mild (one modality)', value: 1, description: 'Inattention or extinction to bilateral simultaneous stimulation in one modality (visual, tactile, auditory, spatial, or personal)' },
          { label: '2 — Profound (more than one)', value: 2, description: 'Profound hemi-inattention in more than one modality, does not recognize own hand, or orients to only one side of space' },
        ],
        0,
        'Visual and tactile double simultaneous stimulation. This item is never UN. If the patient has a severe visual loss and the cutaneous stimuli are normal, score as 0.',
      ),
    ],
    calculate(values) {
      const keys = ['loc', 'locQ', 'locC', 'gaze', 'visual', 'facial', 'armL', 'armR', 'legL', 'legR', 'ataxia', 'sensory', 'language', 'dysarthria', 'extinction'];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Mild stroke', interpretation: 'NIHSS ≤4 often mild; still consider reperfusion if disabling deficit.' },
        { max: 15, level: 'moderate', label: 'Moderate', interpretation: 'Moderate stroke severity.' },
        { max: 20, level: 'high', label: 'Moderate–severe', interpretation: 'Moderate to severe stroke.' },
        { max: 42, level: 'critical', label: 'Severe', interpretation: 'Severe stroke — high risk of complications; aggressive supportive care.' },
      ]);
      return { score, ...r, details: [{ label: 'Max score', value: '42 (15 items; amputated/untestable limbs scored per NIH protocol)' }] };
    },
    evidence: {
      summary: 'NIHSS is the standard acute stroke neurologic deficit scale (0–42) with separate motor scores for each arm and leg.',
      validation: 'Excellent interrater reliability with trained examiners; predicts outcomes.',
      references: [{ title: 'Measurements of acute cerebral infarction: a clinical examination scale', citation: 'Brott T et al. Stroke. 1989', year: 1989, pmid: '2749846',
          doi: '10.1161/01.str.20.7.864', }],
    },
    nextSteps: [
      { condition: 'Acute ischemic stroke', actions: ['Door-to-CT/needle pathways', 'Consider thrombolysis/thrombectomy eligibility', 'Stroke unit care'] },
    ],
    pearls: [
      'UN (amputation, joint fusion, intubated dysarthria) is recorded off-scale — do not enter 4 or 2 as a substitute.',
      '1b questions are month and age only — not place or president. Aphasic patients score 2; intubated/language barrier score 1.',
      'Item 11 (extinction) is never UN. If 1a = 3, language is 3.',
    ],
  },
  {
    id: 'phq9',
    name: 'PHQ-9 Depression Screen',
    shortName: 'PHQ-9',
    description: 'Patient Health Questionnaire-9 for depression severity.',
    category: 'psychiatry',
    tags: ['depression', 'screening', 'phq'],
    whenToUse: 'Screening and monitoring major depression in primary care and specialty settings.',
    whyUse: 'Validated, brief, and widely integrated into workflows.',
    inputs: [
      ...['Interest/pleasure little', 'Feeling down/hopeless', 'Sleep problems', 'Fatigue', 'Appetite change', 'Feeling bad about self', 'Concentration trouble', 'Moving slow/fidgety', 'Thoughts of self-harm'].map((label, i) =>
        selectInput(`q${i + 1}`, `${i + 1}. ${label}`, [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 },
        ])
      ),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 9; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'None–minimal', interpretation: 'None to minimal depression symptoms.' },
        { max: 9, level: 'low', label: 'Mild', interpretation: 'Mild depression — watchful waiting, lifestyle, reassess.' },
        { max: 14, level: 'moderate', label: 'Moderate', interpretation: 'Moderate depression — consider therapy ± pharmacotherapy.' },
        { max: 19, level: 'high', label: 'Moderately severe', interpretation: 'Moderately severe — active treatment indicated.' },
        { max: 27, level: 'critical', label: 'Severe', interpretation: 'Severe depression — intensive treatment; ensure safety planning.' },
      ]);
      const si = num(values.q9) > 0;
      return {
        score,
        ...r,
        recommendations: si ? ['Item 9 positive: assess suicide risk immediately', 'Safety plan / urgent psych if needed'] : ['Recheck periodically'],
      };
    },
    evidence: {
      summary: 'PHQ-9 scores 0–27; ≥10 often used as depression treatment threshold.',
      validation: 'Extensive primary care validation (Kroenke et al.).',
      references: [{ title: 'The PHQ-9: validity of a brief depression severity measure', citation: 'Kroenke K et al. J Gen Intern Med. 2001', year: 2001, pmid: '11556941',
          doi: '10.1046/j.1525-1497.2001.016009606.x', }],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Clinical interview for MDD', 'Offer psychotherapy and/or antidepressant', 'Follow-up'] },
      { condition: 'Item 9 >0', actions: ['Immediate suicide risk assessment'] },
    ],
  },
  {
    id: 'gad7',
    name: 'GAD-7 Anxiety Screen',
    shortName: 'GAD-7',
    description: 'Generalized Anxiety Disorder 7-item scale.',
    category: 'psychiatry',
    tags: ['anxiety', 'gad', 'screening'],
    whenToUse: 'Screening and severity monitoring for generalized anxiety.',
    whyUse: 'Brief, validated anxiety measure.',
    inputs: [
      ...['Feeling nervous/anxious/on edge', 'Not able to stop/control worrying', 'Worrying too much', 'Trouble relaxing', 'Restless', 'Easily annoyed/irritable', 'Afraid something awful might happen'].map((label, i) =>
        selectInput(`q${i + 1}`, `${i + 1}. ${label}`, [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 },
        ])
      ),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 7; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Minimal', interpretation: 'Minimal anxiety symptoms.' },
        { max: 9, level: 'low', label: 'Mild', interpretation: 'Mild anxiety — monitor and supportive care.' },
        { max: 14, level: 'moderate', label: 'Moderate', interpretation: 'Moderate anxiety — consider therapy ± meds.' },
        { max: 21, level: 'high', label: 'Severe', interpretation: 'Severe anxiety — active treatment recommended.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'GAD-7 score ≥10 suggests possible GAD; also screens other anxiety disorders.',
      validation: 'Validated in primary care populations.',
      references: [{ title: 'A brief measure for assessing generalized anxiety disorder: the GAD-7', citation: 'Spitzer RL et al. Arch Intern Med. 2006', year: 2006, pmid: '16717171',
          doi: '10.1001/archinte.166.10.1092', }],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Diagnostic assessment', 'CBT / SSRI-SNRI as appropriate'] },
    ],
  },
  {
    id: 'cage',
    name: 'CAGE Questionnaire',
    shortName: 'CAGE',
    description: 'Brief screen for alcohol use disorder.',
    category: 'psychiatry',
    tags: ['alcohol', 'substance', 'screening'],
    whenToUse: 'Primary care / ED screening for problem drinking.',
    whyUse: 'Very brief four-question screen.',
    inputs: [
      yesNo('c', 'Cut down: felt you should cut down on drinking?', 1),
      yesNo('a', 'Annoyed: people annoyed you by criticizing drinking?', 1),
      yesNo('g', 'Guilty: felt guilty about drinking?', 1),
      yesNo('e', 'Eye-opener: drink first thing in the morning?', 1),
    ],
    calculate(values) {
      const score = ['c', 'a', 'g', 'e'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 2) {
        return {
          score,
          label: 'Positive screen',
          interpretation: '≥2 positive: suggestive of alcohol use problems — further assessment (AUDIT) and counseling.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Negative / low',
        interpretation: 'Score <2: lower likelihood, but not exclusionary if clinical concern high.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'CAGE ≥2 has reasonable sensitivity/specificity for alcohol dependence in many settings.',
      validation: 'Classic primary care screen; AUDIT is more comprehensive.',
      references: [{ title: 'Detecting alcoholism: the CAGE questionnaire', citation: 'Ewing JA. JAMA. 1984', year: 1984, pmid: '6471323',
          doi: '10.1001/jama.252.14.1905', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Full substance history', 'Labs if indicated', 'Brief intervention / referral to treatment'] },
    ],
  },
  {
    id: 'ciwa',
    name: 'CIWA-Ar (Alcohol Withdrawal)',
    shortName: 'CIWA-Ar',
    description: 'Clinical Institute Withdrawal Assessment for Alcohol — revised.',
    category: 'psychiatry',
    tags: ['alcohol', 'withdrawal', 'ciwa'],
    whenToUse: 'Symptom-triggered benzodiazepine protocols for alcohol withdrawal.',
    whyUse: 'Standard severity score guiding benzo dosing.',
    inputs: [
      ciwaSelect(
        'nausea',
        'Nausea/vomiting (0–7)',
        "Ask: “Do you feel sick to your stomach? Have you vomited?” Observe.",
        {
          0: 'No nausea and no vomiting',
          1: 'Mild nausea with no vomiting',
          4: 'Intermittent nausea with dry heaves',
          7: 'Constant nausea, frequent dry heaves and vomiting',
        },
      ),
      ciwaSelect(
        'tremor',
        'Tremor (0–7)',
        'Arms extended, fingers spread. Observe and feel fingertip-to-fingertip.',
        {
          0: 'No tremor',
          1: 'Not visible, but can be felt fingertip to fingertip',
          4: 'Moderate, with patient’s arms extended',
          7: 'Severe, even with arms not extended',
        },
      ),
      ciwaSelect(
        'sweats',
        'Paroxysmal sweats (0–7)',
        'Observe palms and forehead. Do not ask the patient to rate sweating.',
        {
          0: 'No sweat visible',
          1: 'Barely perceptible sweating, palms moist',
          4: 'Beads of sweat obvious on forehead',
          7: 'Drenching sweats',
        },
      ),
      ciwaSelect(
        'anxiety',
        'Anxiety (0–7)',
        'Ask: “Do you feel nervous?” Observe.',
        {
          0: 'No anxiety, at ease',
          1: 'Mildly anxious',
          4: 'Moderately anxious, or guarded so that anxiety is inferred',
          7: 'Equivalent to acute panic states as seen in severe delirium or acute schizophrenic reactions',
        },
      ),
      ciwaSelect(
        'agitation',
        'Agitation (0–7)',
        'Observe activity during the interview.',
        {
          0: 'Normal activity',
          1: 'Somewhat more than normal activity',
          4: 'Moderately fidgety and restless',
          7: 'Paces back and forth during most of the interview, or constantly thrashes about',
        },
      ),
      ciwaSelect(
        'tactile',
        'Tactile disturbances (0–7)',
        'Ask: “Have you any itching, pins and needles sensations, any burning, any numbness, or do you feel bugs crawling on or under your skin?”',
        {
          0: 'None',
          1: 'Very mild itching, pins and needles, burning or numbness',
          2: 'Mild itching, pins and needles, burning or numbness',
          3: 'Moderate itching, pins and needles, burning or numbness',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'auditory',
        'Auditory disturbances (0–7)',
        'Ask: “Are you more aware of sounds around you? Are they harsh? Do they frighten you? Are you hearing anything that is disturbing to you? Are you hearing things you know are not there?”',
        {
          0: 'Not present',
          1: 'Very mild harshness or ability to frighten',
          2: 'Mild harshness or ability to frighten',
          3: 'Moderate harshness or ability to frighten',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'visual',
        'Visual disturbances (0–7)',
        'Ask: “Does the light appear to be too bright? Is its color different? Does it hurt your eyes? Are you seeing anything that is disturbing to you? Are you seeing things you know are not there?”',
        {
          0: 'Not present',
          1: 'Very mild sensitivity',
          2: 'Mild sensitivity',
          3: 'Moderate sensitivity',
          4: 'Moderately severe hallucinations',
          5: 'Severe hallucinations',
          6: 'Extremely severe hallucinations',
          7: 'Continuous hallucinations',
        },
      ),
      ciwaSelect(
        'headache',
        'Headache (0–7)',
        'Ask: “Does your head feel different? Does it feel like there is a band around your head?” Do not rate dizziness or lightheadedness.',
        {
          0: 'Not present',
          1: 'Very mild',
          2: 'Mild',
          3: 'Moderate',
          4: 'Moderately severe',
          5: 'Severe',
          6: 'Very severe',
          7: 'Extremely severe',
        },
      ),
      ciwaSelect(
        'orientation',
        'Orientation/clouding (0–4)',
        'Ask: “What day is this? Where are you? Who am I?”',
        {
          0: 'Oriented and can do serial additions',
          1: 'Cannot do serial additions or is uncertain about date',
          2: 'Disoriented for date by no more than 2 calendar days',
          3: 'Disoriented for date by more than 2 calendar days',
          4: 'Disoriented for place or person',
        },
        4,
      ),
    ],
    calculate(values) {
      const keys = ['nausea', 'tremor', 'sweats', 'anxiety', 'agitation', 'tactile', 'auditory', 'visual', 'headache', 'orientation'];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      const r = riskFromThresholds(score, [
        { max: 8, level: 'low', label: 'Mild withdrawal', interpretation: 'CIWA ≤8: mild — may not need benzos if protocol allows observation.' },
        { max: 15, level: 'moderate', label: 'Moderate', interpretation: 'CIWA 9–15: moderate — typically give symptom-triggered benzodiazepine.' },
        { max: 67, level: 'critical', label: 'Severe', interpretation: 'CIWA >15: severe — benzos, close monitoring, rule out DTs risk.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'CIWA-Ar ranges 0–67 across 10 domains for alcohol withdrawal severity.',
      validation: 'Standard for symptom-triggered therapy trials.',
      references: [{ title: 'Assessment of alcohol withdrawal: the revised CIWA-Ar', citation: 'Sullivan JT et al. Br J Addict. 1989', year: 1989, pmid: '2597811',
          doi: '10.1111/j.1360-0443.1989.tb00737.x', }],
    },
    nextSteps: [
      { condition: 'CIWA ≥8–10', actions: ['Diazepam/lorazepam per protocol', 'Thiamine, folate, multivitamin', 'Monitor for seizures/DTs'] },
    ],
    pearls: [
      'Official Sullivan 1989 key labels 0, 1, 4, and 7 (and every orientation rank). Ranks 2, 3, 5, 6 are interpolations.',
      'Do not rate dizziness on the headache item. Observe tremor and sweats rather than asking the patient to self-grade them.',
    ],
  },
  {
    id: 'mmse',
    name: 'MMSE (Score Entry)',
    shortName: 'MMSE',
    description: 'Mini-Mental State Examination total score interpreter.',
    category: 'neurology',
    tags: ['dementia', 'cognition', 'mmse'],
    whenToUse: 'Cognitive screening interpretation when MMSE already administered.',
    whyUse: 'Widely known cognitive screen (copyrighted instrument — enter total only).',
    inputs: [numberInput('score', 'MMSE total score', { min: 0, max: 30, defaultValue: 28 })],
    calculate(values) {
      const score = num(values.score, 28);
      const r = riskFromThresholds(score, [
        { max: 9, level: 'critical', label: 'Severe cognitive impairment', interpretation: 'MMSE 0–9: severe impairment range.' },
        { max: 20, level: 'high', label: 'Moderate impairment', interpretation: 'MMSE 10–20: moderate impairment range.' },
        { max: 24, level: 'moderate', label: 'Mild impairment', interpretation: 'MMSE 21–24: mild impairment; correlate with education and function.' },
        { max: 30, level: 'normal', label: 'Normal / near normal', interpretation: 'MMSE 25–30: generally normal; not excluded early dementia or MCI.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MMSE (Folstein) scores 0–30; cutoffs education-dependent.',
      validation: 'Classic screen; MoCA more sensitive for MCI.',
      references: [{ title: 'Mini-mental state', citation: 'Folstein MF et al. J Psychiatr Res. 1975', year: 1975, pmid: '1202204',
          doi: '10.1016/0022-3956(75)90026-6', }],
    },
    nextSteps: [
      { condition: 'Score ≤24', actions: ['Full cognitive workup', 'Labs (B12, TSH)', 'Imaging as indicated', 'Consider MoCA'] },
    ],
  },
  {
    id: 'moca',
    name: 'MoCA (Score Entry)',
    shortName: 'MoCA',
    description: 'Montreal Cognitive Assessment total score interpreter.',
    category: 'neurology',
    tags: ['dementia', 'mci', 'cognition'],
    whenToUse: 'Interpretation of administered MoCA total.',
    whyUse: 'More sensitive than MMSE for mild cognitive impairment.',
    inputs: [
      numberInput('score', 'MoCA total (before education adjust)', { min: 0, max: 30, defaultValue: 26 }),
      yesNo('edu', '≤12 years education (+1 if applicable)'),
    ],
    calculate(values) {
      let score = num(values.score, 26);
      if (bool(values.edu) && score < 30) score += 1;
      const r = riskFromThresholds(score, [
        { max: 17, level: 'high', label: 'Possible dementia range', interpretation: 'Lower MoCA — further dementia evaluation.' },
        { max: 25, level: 'moderate', label: 'Possible MCI range', interpretation: 'MoCA <26 often used as impairment cutoff (context-dependent).' },
        { max: 30, level: 'normal', label: 'Normal range', interpretation: 'MoCA ≥26 often considered normal.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MoCA max 30; +1 if ≤12 years education. Cutoff <26 commonly used.',
      validation: 'Superior sensitivity for MCI vs MMSE in many studies.',
      references: [{ title: 'The Montreal Cognitive Assessment (MoCA)', citation: 'Nasreddine ZS et al. J Am Geriatr Soc. 2005', year: 2005, pmid: '15817019',
          doi: '10.1111/j.1532-5415.2005.53221.x', }],
    },
    nextSteps: [{ condition: 'Score <26', actions: ['Neuropsychological testing as needed', 'Reversible cause workup'] }],
  },
];
