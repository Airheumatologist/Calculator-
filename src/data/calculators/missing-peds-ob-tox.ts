import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const missingPedsObToxCalcs: Calculator[] = [
  {
    id: 'sipa',
    name: 'Shock Index, Pediatric Adjusted (SIPA)',
    shortName: 'SIPA',
    description: 'Heart rate ÷ systolic BP with age-adjusted abnormal cutoffs for pediatric trauma triage.',
    category: 'pediatrics',
    tags: ['shock', 'trauma', 'pediatric', 'sipa', 'hemodynamics'],
    whenToUse: 'Injured children to identify need for transfusion, operative intervention, or ICU care.',
    whyUse: 'Age-adjusted SI outperforms adult SI cutoffs and vital signs alone in pediatric trauma.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: '1–6 years (cutoff >1.22)', value: '1-6' },
        { label: '7–12 years (cutoff >1.0)', value: '7-12' },
        { label: '13–17 years (cutoff >0.9)', value: '13-17' },
      ]),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 40, max: 250, defaultValue: 120 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 200, defaultValue: 90 }),
    ],
    calculate(values) {
      const hr = num(values.hr, 120);
      const sbp = num(values.sbp, 90);
      if (sbp <= 0) {
        return {
          score: '—',
          label: 'Invalid BP',
          interpretation: 'SBP must be >0 to calculate shock index.',
          riskLevel: 'info',
        };
      }
      const si = round(hr / sbp, 2);
      const band = String(values.ageBand ?? '1-6');
      const cutoff = band === '13-17' ? 0.9 : band === '7-12' ? 1.0 : 1.22;
      const elevated = si > cutoff;
      return {
        score: si,
        unit: 'HR/SBP',
        label: elevated ? 'Elevated SIPA' : 'Normal SIPA',
        interpretation: elevated
          ? `SI ${si} exceeds age-adjusted cutoff (${cutoff}). Associated with higher need for transfusion, surgery, and ICU in trauma cohorts.`
          : `SI ${si} is at or below age-adjusted cutoff (${cutoff}). Integrate with full clinical assessment.`,
        riskLevel: elevated ? 'high' : 'low',
        details: [
          { label: 'Age band', value: band },
          { label: 'Cutoff', value: `>${cutoff}` },
          { label: 'HR / SBP', value: `${hr} / ${sbp}` },
        ],
      };
    },
    evidence: {
      summary: 'SIPA = HR/SBP with cutoffs ≈1.22 (1–6 y), 1.0 (7–12 y), 0.9 (13–17 y). Elevated SIPA predicts trauma morbidity.',
      formula: 'SI = HR ÷ SBP; compare to age-specific threshold',
      validation: 'Validated in pediatric trauma registries; improves identification of severely injured children vs adult SI >0.9 alone.',
      references: [
        { title: 'Shock index pediatric adjusted (SIPA) in blunt trauma', citation: 'Acker SN et al. J Pediatr Surg. 2015', year: 2015, pmid: '25783300',
          doi: '10.1016/j.jpedsurg.2014.11.031', },
      ],
    },
    nextSteps: [
      { condition: 'Elevated SIPA', actions: ['Trauma team activation per protocol', 'Prepare for hemorrhage control / transfusion', 'Serial vitals and lactate'] },
      { condition: 'Normal SIPA', actions: ['Continue standard trauma evaluation — normal SIPA does not exclude injury'] },
    ],
    pearls: [
      'Age adjustment is essential — toddlers normally have higher HR/SBP ratios.',
      'Pain, anxiety, and fever also raise SI; interpret in clinical context.',
    ],
  },

  {
    id: 'yale-observation',
    name: 'Yale Observation Scale (Febrile Child)',
    shortName: 'Yale OS',
    description: 'Six-item observational scale for serious illness risk in febrile children.',
    category: 'pediatrics',
    tags: ['fever', 'pediatric', 'yale', 'observation', 'sepsis'],
    whenToUse: 'Febrile children (classically 3–36 months) when assessing overall toxic appearance.',
    whyUse: 'Structures the “ill vs well” gestalt into reproducible observational domains.',
    inputs: [
      selectInput('cry', 'Quality of cry', [
        { label: 'Strong / normal / content (1)', value: 1 },
        { label: 'Whimpering / sobbing (3)', value: 3 },
        { label: 'Weak / moaning / high-pitched (5)', value: 5 },
      ]),
      selectInput('reaction', 'Reaction to parent stimulation', [
        { label: 'Cries briefly then content / no cry (1)', value: 1 },
        { label: 'Cries off and on (3)', value: 3 },
        { label: 'Continual cry or little response (5)', value: 5 },
      ]),
      selectInput('state', 'State variation', [
        { label: 'Awakens quickly / stays awake (1)', value: 1 },
        { label: 'Eyes close briefly awake / wakes with prolonged stimulation (3)', value: 3 },
        { label: 'Falls asleep / will not rouse (5)', value: 5 },
      ]),
      selectInput('color', 'Color', [
        { label: 'Pink (1)', value: 1 },
        { label: 'Pale extremities / acrocyanosis (3)', value: 3 },
        { label: 'Pale / cyanotic / mottled / ashen (5)', value: 5 },
      ]),
      selectInput('hydration', 'Hydration', [
        { label: 'Skin normal / eyes normal / moist mucosa (1)', value: 1 },
        { label: 'Skin / eyes normal, mouth slightly dry (3)', value: 3 },
        { label: 'Doughy skin / dry mucosa / sunken eyes (5)', value: 5 },
      ]),
      selectInput('social', 'Response to social overtures', [
        { label: 'Smiles / alerts (≤2 mo: alerts) (1)', value: 1 },
        { label: 'Brief smile / alerts briefly (3)', value: 3 },
        { label: 'No smile / anxious / dull / no alerting (5)', value: 5 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.cry, 1) +
        num(values.reaction, 1) +
        num(values.state, 1) +
        num(values.color, 1) +
        num(values.hydration, 1) +
        num(values.social, 1);
      const r = riskFromThresholds(score, [
        {
          max: 10,
          level: 'low',
          label: 'Low risk (≤10)',
          interpretation: 'Score ≤10: lower likelihood of serious illness in original cohorts; still examine carefully and use age-specific fever pathways.',
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Intermediate (11–15)',
          interpretation: 'Intermediate risk — close observation, low threshold for labs/imaging per clinical context.',
        },
        {
          max: 30,
          level: 'high',
          label: 'High risk (≥16)',
          interpretation: 'Score ≥16: substantially higher risk of serious illness — urgent full evaluation and treatment as indicated.',
        },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Six observational items scored 1/3/5 each (total 6–30). ≤10 lower risk; ≥16 higher risk of serious illness.',
      formula: 'Sum of cry + parent reaction + state + color + hydration + social response',
      validation: 'McCarthy et al.; widely taught observational scale. Not a standalone rule-out for SBI/IBI.',
      references: [
        { title: 'Observation scales to identify serious illness in febrile children', citation: 'McCarthy PL et al. Pediatrics. 1982', year: 1982, pmid: '7133831' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥16 or toxic appearance', actions: ['Full septic workup as age-indicated', 'Early antibiotics if unstable', 'Admit / critical care as needed'] },
      { condition: 'Score ≤10 and well-appearing', actions: ['Follow age-based fever guidelines', 'Reliable follow-up'] },
    ],
    pearls: ['Scale does not replace age-based infant fever pathways (e.g., ≤60–90 days).'],
  },

  {
    id: 'step-by-step-fever',
    name: 'Step-by-Step (Febrile Young Infant)',
    shortName: 'Step-by-Step',
    description: 'Sequential low-risk pathway for febrile infants ≤90 days (Mintegi/European approach).',
    category: 'pediatrics',
    tags: ['fever', 'neonate', 'infant', 'sbi', 'ibi', 'pct'],
    whenToUse: 'Well-appearing febrile infants 0–90 days when applying Step-by-Step risk stratification.',
    whyUse: 'Identifies infants at low risk of invasive bacterial infection who may avoid LP/admission in validated pathways.',
    inputs: [
      yesNo('illAppearing', 'Ill-appearing / clinical suspicion of severe infection'),
      numberInput('ageDays', 'Age', { unit: 'days', min: 0, max: 90, defaultValue: 40 }),
      yesNo('leukocyturia', 'Leukocyturia (positive UA / dipstick LE or nitrite per local def.)'),
      numberInput('pct', 'Procalcitonin', { unit: 'ng/mL', min: 0, max: 100, step: 0.01, defaultValue: 0.2 }),
      numberInput('crp', 'CRP', { unit: 'mg/L', min: 0, max: 400, defaultValue: 10 }),
      numberInput('anc', 'Absolute neutrophil count', { unit: '×10³/µL', min: 0, max: 50, step: 0.1, defaultValue: 4 }),
    ],
    calculate(values) {
      const ill = bool(values.illAppearing);
      const age = num(values.ageDays, 40);
      const ua = bool(values.leukocyturia);
      const pct = num(values.pct, 0.2);
      const crp = num(values.crp, 10);
      const anc = num(values.anc, 4);
      const reasons: string[] = [];

      if (ill) reasons.push('Ill-appearing');
      if (age <= 21) reasons.push('Age ≤21 days');
      if (ua) reasons.push('Leukocyturia');
      if (pct >= 0.5) reasons.push('PCT ≥0.5 ng/mL');
      if (crp > 20) reasons.push('CRP >20 mg/L');
      if (anc > 10) reasons.push('ANC >10 ×10³/µL');

      const highRisk = reasons.length > 0;
      return {
        score: highRisk ? 'Not low risk' : 'Low risk',
        label: highRisk ? 'High / not low-risk pathway' : 'Low-risk pathway',
        interpretation: highRisk
          ? `Fails Step-by-Step low-risk criteria: ${reasons.join('; ')}. Full evaluation and management per institutional infant fever protocol.`
          : 'Meets sequential low-risk criteria (well-appearing, >21 days, no leukocyturia, PCT <0.5, CRP ≤20, ANC ≤10). Local protocols may still require observation or limited workup.',
        riskLevel: highRisk ? 'high' : 'low',
        details: [
          { label: 'Age', value: `${age} days` },
          { label: 'PCT', value: `${pct} ng/mL` },
          { label: 'CRP', value: `${crp} mg/L` },
          { label: 'ANC', value: `${anc} ×10³/µL` },
          { label: 'Failed steps', value: reasons.length ? reasons.join(', ') : 'None' },
        ],
        recommendations: highRisk
          ? ['Do not use outpatient low-risk discharge solely on this tool', 'Consider blood culture, UA/culture, ± LP by age/protocol', 'Empiric antibiotics if indicated']
          : ['Confirm reliable follow-up', 'Shared decision-making per local pathway', 'Return precautions for fever/illness'],
      };
    },
    evidence: {
      summary:
        'Step-by-Step: not low risk if ill-appearing OR age ≤21 d OR leukocyturia OR PCT ≥0.5 OR (CRP >20 or ANC >10k). Otherwise low risk for IBI in derivation/validation cohorts.',
      formula: 'Sequential exclusion gates → low risk only if all gates passed',
      validation: 'Mintegi et al. / European multicentre validation; apply only within intended age and clinical setting.',
      references: [
        { title: 'Step-by-step approach to febrile infants', citation: 'Mintegi S et al. Pediatrics / Arch Dis Child validations', year: 2014, pmid: '23851127',
          doi: '10.1136/emermed-2013-202449', },
      ],
    },
    nextSteps: [
      { condition: 'Not low risk', actions: ['Hospital evaluation', 'Cultures ± LP per age', 'Antibiotics when indicated'] },
      { condition: 'Low risk', actions: ['Pathway-directed observation or discharge with follow-up'] },
    ],
    pearls: [
      'Designed for previously healthy febrile infants without focal infection.',
      'Viral testing and local epidemiology still matter; tool is decision support only.',
    ],
  },

  {
    id: 'vbac-success',
    name: 'VBAC Success (Grobman Educational Model)',
    shortName: 'VBAC Success',
    description: 'Educational estimate of VBAC success using major Grobman nomogram predictors (simplified logistic).',
    category: 'obstetrics',
    tags: ['vbac', 'tolac', 'cesarean', 'grobman', 'labor'],
    whenToUse: 'Counseling candidates for trial of labor after cesarean (TOLAC).',
    whyUse: 'Major predictors of VBAC success help shared decision-making; not a guarantee of outcome.',
    inputs: [
      numberInput('age', 'Maternal age', { unit: 'years', min: 15, max: 55, defaultValue: 30 }),
      numberInput('bmi', 'Prepregnancy BMI', { unit: 'kg/m²', min: 15, max: 60, step: 0.1, defaultValue: 28 }),
      selectInput('ethnicity', 'Race / ethnicity (as in original model categories)', [
        { label: 'Neither African American nor Hispanic', value: 'other' },
        { label: 'African American', value: 'aa' },
        { label: 'Hispanic', value: 'hispanic' },
      ]),
      yesNo('priorVaginal', 'Any prior vaginal delivery'),
      yesNo('priorVbac', 'Prior VBAC (successful)'),
      yesNo('recurringIndication', 'Recurring indication for cesarean (arrest / CPD / FTP)'),
      yesNo('induction', 'Induction of labor (vs spontaneous)'),
    ],
    calculate(values) {
      // Educational simplification inspired by Grobman logistic predictors (not the full NICHD calculator).
      // Coefficients are approximate for teaching — label as educational estimate.
      const age = num(values.age, 30);
      const bmi = num(values.bmi, 28);
      const eth = String(values.ethnicity ?? 'other');
      const priorVaginal = bool(values.priorVaginal);
      const priorVbac = bool(values.priorVbac);
      const recurring = bool(values.recurringIndication);
      const induction = bool(values.induction);

      let x =
        3.766 -
        0.039 * age -
        0.06 * bmi +
        (priorVaginal ? 0.888 : 0) +
        (priorVbac ? 0.58 : 0) -
        (recurring ? 0.632 : 0) -
        (induction ? 0.4 : 0);
      if (eth === 'aa') x -= 0.671;
      if (eth === 'hispanic') x -= 0.68;

      const p = 1 / (1 + Math.exp(-x));
      const pct = round(p * 100, 0);

      const r = riskFromThresholds(pct, [
        {
          max: 49,
          level: 'high',
          label: 'Lower predicted success',
          interpretation: `Educational estimate ≈${pct}% VBAC success. Lower-range estimate — counsel carefully on risks of failed TOLAC / emergency cesarean.`,
        },
        {
          max: 69,
          level: 'moderate',
          label: 'Intermediate predicted success',
          interpretation: `Educational estimate ≈${pct}% VBAC success. Intermediate range — individualize with obstetric history and facility resources.`,
        },
        {
          max: 100,
          level: 'low',
          label: 'Higher predicted success',
          interpretation: `Educational estimate ≈${pct}% VBAC success. More favorable predictor profile — still requires TOLAC-capable setting and consent for uterine rupture risk.`,
        },
      ]);

      return {
        score: pct,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation + ' This is a simplified educational model, not the official NICHD Grobman calculator.',
        riskLevel: r.riskLevel,
        details: [
          { label: 'Linear predictor (x)', value: String(round(x, 3)) },
          { label: 'Model note', value: 'Simplified logistic using major Grobman factors' },
        ],
      };
    },
    evidence: {
      summary:
        'Grobman et al. developed a logistic model for predicted VBAC success from admission/antenatal factors. This app uses a simplified educational approximation of major predictors.',
      formula: 'P = 1/(1+e^(−x)); x ≈ f(age, BMI, ethnicity, prior VD/VBAC, recurring indication, induction)',
      validation: 'Original nomogram widely validated; use institutional / NICHD tools for formal counseling when available.',
      references: [
        { title: 'Development of a nomogram for prediction of VBAC', citation: 'Grobman WA et al. Obstet Gynecol. 2007', year: 2007, pmid: '17400840',
          doi: '10.1097/01.AOG.0000259312.36053.02', },
      ],
    },
    nextSteps: [
      { condition: 'Considering TOLAC', actions: ['Facility capable of emergency cesarean', 'Discuss uterine rupture (~0.5–1% after low transverse scar)', 'Document informed consent'] },
    ],
    pearls: [
      'Prior vaginal birth is one of the strongest favorable predictors.',
      'Arrest-of-labor indication for prior CD lowers success odds.',
    ],
  },

  {
    id: 'preeclampsia-criteria',
    name: 'Preeclampsia Diagnostic Criteria Helper',
    shortName: 'Preeclampsia',
    description: 'ACOG-style checklist: hypertension after 20 weeks plus proteinuria or end-organ criteria.',
    category: 'obstetrics',
    tags: ['preeclampsia', 'hypertension', 'pregnancy', 'proteinuria'],
    whenToUse: 'Suspected preeclampsia after 20 weeks gestation (or postpartum).',
    whyUse: 'Structures diagnostic criteria including atypical presentations without proteinuria.',
    inputs: [
      yesNo('bp140', 'BP ≥140/90 mmHg on ≥2 occasions ≥4 h apart (after 20 weeks)'),
      yesNo('bp160', 'Severe-range BP ≥160/110 mmHg (confirmed)'),
      yesNo('proteinuria', 'Proteinuria (≥300 mg/24h, PCR ≥0.3, or dipstick 2+ if others unavailable)'),
      yesNo('platelets', 'Platelets <100,000/µL'),
      yesNo('creatinine', 'Serum creatinine >1.1 mg/dL or doubling without other renal disease'),
      yesNo('lfts', 'LFTs ≥2× upper limit of normal'),
      yesNo('pulmEdema', 'Pulmonary edema'),
      yesNo('neuro', 'New cerebral or visual symptoms (e.g., severe headache, scotomata)'),
      yesNo('epigastric', 'Severe persistent RUQ / epigastric pain (not explained otherwise)'),
    ],
    calculate(values) {
      const htn = bool(values.bp140) || bool(values.bp160);
      const severeBp = bool(values.bp160);
      const protein = bool(values.proteinuria);
      const endOrgan =
        bool(values.platelets) ||
        bool(values.creatinine) ||
        bool(values.lfts) ||
        bool(values.pulmEdema) ||
        bool(values.neuro) ||
        bool(values.epigastric);

      if (!htn) {
        return {
          score: 'Criteria not met',
          label: 'No diagnostic HTN criterion',
          interpretation: 'Preeclampsia diagnosis requires new hypertension after 20 weeks (or superimposed pattern). Continue surveillance if clinically concerned.',
          riskLevel: 'info',
        };
      }

      const preeclampsia = protein || endOrgan;
      const severeFeatures =
        severeBp ||
        bool(values.platelets) ||
        bool(values.creatinine) ||
        bool(values.lfts) ||
        bool(values.pulmEdema) ||
        bool(values.neuro) ||
        bool(values.epigastric);

      if (!preeclampsia) {
        return {
          score: 'Gestational HTN pattern',
          label: 'Hypertension without protein/end-organ (yet)',
          interpretation: 'HTN after 20 weeks without proteinuria or end-organ criteria suggests gestational hypertension — monitor closely for progression to preeclampsia.',
          riskLevel: 'moderate',
          details: [{ label: 'Severe-range BP', value: severeBp ? 'Yes' : 'No' }],
        };
      }

      return {
        score: severeFeatures ? 'Preeclampsia with severe features' : 'Preeclampsia (without severe features listed)',
        label: severeFeatures ? 'Preeclampsia with severe features' : 'Preeclampsia',
        interpretation: severeFeatures
          ? 'Meets preeclampsia with severe features on this checklist — urgent obstetric management, MgSO₄ seizure prophylaxis as indicated, delivery planning.'
          : 'Meets preeclampsia criteria (HTN + proteinuria and/or end-organ). Manage per gestational age and institutional protocol; watch for severe features.',
        riskLevel: severeFeatures ? 'critical' : 'high',
        details: [
          { label: 'Proteinuria', value: protein ? 'Yes' : 'No' },
          { label: 'End-organ criteria', value: endOrgan ? 'Yes' : 'No' },
          { label: 'Severe-range BP', value: severeBp ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'ACOG: preeclampsia = HTN after 20 weeks + proteinuria OR end-organ dysfunction (platelets, Cr, LFTs, pulmonary edema, neuro/visual symptoms).',
      validation: 'Standard obstetric diagnostic framework; delivery timing depends on GA and severity.',
      references: [
        { title: 'Gestational Hypertension and Preeclampsia: ACOG Practice Bulletin No. 222', citation: 'ACOG. Obstet Gynecol. 2020', year: 2020, pmid: '32443079', doi: '10.1097/AOG.0000000000003891' },
      ],
    },
    nextSteps: [
      { condition: 'Preeclampsia with severe features', actions: ['Admit', 'MgSO₄ for seizure prophylaxis', 'BP control (IV agents if severe-range)', 'Delivery planning'] },
      { condition: 'Without severe features', actions: ['Labs, fetal monitoring', 'Outpatient vs inpatient per GA/protocol'] },
    ],
  },

  {
    id: 'hellp',
    name: 'HELLP Syndrome Lab Pattern Helper',
    shortName: 'HELLP',
    description: 'Checks hemolysis, elevated liver enzymes, and low platelets pattern (Tennessee-style).',
    category: 'obstetrics',
    tags: ['hellp', 'preeclampsia', 'pregnancy', 'ldh', 'ast', 'platelets'],
    whenToUse: 'Suspected HELLP in pregnant/postpartum patients with preeclampsia features or RUQ pain.',
    whyUse: 'Organizes classic lab triad; incomplete HELLP still warrants aggressive management.',
    inputs: [
      numberInput('ldh', 'LDH', { unit: 'U/L', min: 50, max: 5000, defaultValue: 400 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 0.8 }),
      yesNo('schistocytes', 'Schistocytes / hemolysis on smear (if known)'),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 5000, defaultValue: 40 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 5000, defaultValue: 40 }),
      numberInput('astUln', 'AST ULN (lab)', { unit: 'U/L', min: 20, max: 80, defaultValue: 40 }),
      numberInput('platelets', 'Platelet count', { unit: '×10³/µL', min: 5, max: 600, defaultValue: 150 }),
    ],
    calculate(values) {
      const ldh = num(values.ldh, 400);
      const bili = num(values.bili, 0.8);
      const schisto = bool(values.schistocytes);
      const ast = num(values.ast, 40);
      const alt = num(values.alt, 40);
      const uln = num(values.astUln, 40);
      const plt = num(values.platelets, 150);

      const hemolysis = ldh >= 600 || bili >= 1.2 || schisto;
      const elevatedLft = ast >= 2 * uln || alt >= 2 * uln;
      const lowPlt = plt < 100;

      const count = (hemolysis ? 1 : 0) + (elevatedLft ? 1 : 0) + (lowPlt ? 1 : 0);

      let mississippi = 'N/A';
      if (plt <= 50) mississippi = 'Class I (plt ≤50)';
      else if (plt <= 100) mississippi = 'Class II (plt 50–100)';
      else if (plt <= 150) mississippi = 'Class III (plt 100–150) — if other criteria';

      if (count === 3) {
        return {
          score: 'Complete HELLP pattern',
          label: 'Complete HELLP lab triad',
          interpretation: 'Hemolysis + elevated liver enzymes + thrombocytopenia pattern present. Treat as obstetric emergency; delivery is definitive therapy after stabilization.',
          riskLevel: 'critical',
          details: [
            { label: 'Hemolysis', value: hemolysis ? 'Yes' : 'No' },
            { label: 'Elevated LFTs', value: elevatedLft ? 'Yes' : 'No' },
            { label: 'Platelets <100', value: lowPlt ? 'Yes' : 'No' },
            { label: 'Mississippi class (by plt)', value: mississippi },
          ],
        };
      }
      if (count >= 1) {
        return {
          score: `Partial HELLP (${count}/3)`,
          label: 'Incomplete / partial HELLP pattern',
          interpretation: `${count} of 3 triad elements. Incomplete HELLP can progress — manage aggressively like severe preeclampsia/HELLP pending full workup.`,
          riskLevel: 'high',
          details: [
            { label: 'Hemolysis', value: hemolysis ? 'Yes' : 'No' },
            { label: 'Elevated LFTs', value: elevatedLft ? 'Yes' : 'No' },
            { label: 'Platelets <100', value: lowPlt ? 'Yes' : 'No' },
            { label: 'Mississippi class (by plt)', value: mississippi },
          ],
        };
      }
      return {
        score: 'Triad not met',
        label: 'HELLP triad not present',
        interpretation: 'Classic HELLP lab triad not met on entered values. Does not exclude evolving disease or other hepatic pathology.',
        riskLevel: 'low',
        details: [
          { label: 'LDH', value: `${ldh} U/L` },
          { label: 'AST/ALT', value: `${ast}/${alt}` },
          { label: 'Platelets', value: `${plt} ×10³/µL` },
        ],
      };
    },
    evidence: {
      summary: 'Tennessee criteria often use LDH ≥600, AST ≥70 (or ≥2× ULN), platelets ≤100k. Mississippi classifies by platelet nadir.',
      validation: 'Clinical diagnosis; smear, haptoglobin, and trends aid hemolysis confirmation.',
      references: [
        { title: 'HELLP syndrome', citation: 'Sibai BM. Obstet Gynecol. / Tennessee & Mississippi classifications', year: 2004, pmid: '16449123',
          doi: '10.1097/01.AOG.0000195356.90589.c5', },
      ],
    },
    nextSteps: [
      { condition: 'Complete or partial HELLP', actions: ['Stabilize BP', 'MgSO₄', 'CBC/LDH/LFTs/coags serial', 'OB/MFM, delivery planning', 'Watch for DIC, rupture, eclampsia'] },
    ],
  },

  {
    id: 'mag-toxicity',
    name: 'Magnesium Toxicity Levels Helper',
    shortName: 'Mg Toxicity',
    description: 'Maps serum Mg concentration to expected clinical effects during MgSO₄ therapy.',
    category: 'obstetrics',
    tags: ['magnesium', 'toxicity', 'preeclampsia', 'obstetrics'],
    whenToUse: 'Patients on MgSO₄ for preeclampsia/eclampsia or to interpret a Mg level.',
    whyUse: 'Links level ranges to loss of reflexes, respiratory depression, and cardiac risk.',
    inputs: [
      numberInput('mg', 'Serum magnesium', { unit: 'mg/dL', min: 1, max: 30, step: 0.1, defaultValue: 6 }),
      selectInput('unitNote', 'Entered unit', [
        { label: 'mg/dL (common US)', value: 'mgdl' },
        { label: 'mEq/L (≈ mg/dL ÷ 1.2)', value: 'meq' },
      ]),
    ],
    calculate(values) {
      let mg = num(values.mg, 6);
      if (values.unitNote === 'meq') {
        mg = round(mg * 1.2, 1); // convert mEq/L → approximate mg/dL
      }
      const mgDisplay = mg;

      // Ranges in mg/dL (educational)
      if (mgDisplay < 4.8) {
        return {
          score: mgDisplay,
          unit: 'mg/dL',
          label: 'Below typical therapeutic range',
          interpretation: 'Often subtherapeutic for seizure prophylaxis targets (roughly 4.8–8.4 mg/dL). Correlate with clinical status and protocol.',
          riskLevel: 'moderate',
        };
      }
      if (mgDisplay <= 8.4) {
        return {
          score: mgDisplay,
          unit: 'mg/dL',
          label: 'Therapeutic range (typical)',
          interpretation: 'Approximately therapeutic for eclampsia prophylaxis. Monitor urine output, respirations, and DTRs.',
          riskLevel: 'normal',
        };
      }
      if (mgDisplay <= 12) {
        return {
          score: mgDisplay,
          unit: 'mg/dL',
          label: 'Loss of deep tendon reflexes expected',
          interpretation: '≈9–12 mg/dL: loss of DTRs often appears. Stop infusion, assess ventilation, consider calcium gluconate if symptomatic.',
          riskLevel: 'high',
        };
      }
      if (mgDisplay <= 18) {
        return {
          score: mgDisplay,
          unit: 'mg/dL',
          label: 'Respiratory depression range',
          interpretation: '≈12–18 mg/dL: respiratory depression / paralysis risk. Stop Mg, support airway, give IV calcium, involve critical care.',
          riskLevel: 'critical',
        };
      }
      return {
        score: mgDisplay,
        unit: 'mg/dL',
        label: 'Cardiac arrest range',
        interpretation: '>18 mg/dL: risk of cardiac conduction block/arrest. Emergency resuscitation, calcium, dialysis in refractory cases.',
        riskLevel: 'critical',
      };
    },
    evidence: {
      summary: 'Therapeutic Mg ≈4.8–8.4 mg/dL; loss of DTRs ~9–12; respiratory depression ~12–18; cardiac arrest >18 mg/dL (approximate).',
      formula: 'mEq/L × 1.2 ≈ mg/dL (approximate conversion)',
      validation: 'Classic obstetric teaching; clinical signs and renal function matter more than a single number.',
      references: [
        { title: 'Magnesium sulfate use in obstetrics (ACOG Committee Opinion context)', citation: 'ACOG Committee Opinion No. 652 / related obstetric anesthesia teaching on Mg toxicity', year: 2016, url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2016/01/magnesium-sulfate-use-in-obstetrics' },
      ],
    },
    nextSteps: [
      { condition: 'Loss of DTRs or respiratory depression', actions: ['Stop MgSO₄', 'Airway support', 'Calcium gluconate 1 g IV', 'Check level, Cr, urine output'] },
      { condition: 'Therapeutic', actions: ['q1h nursing checks: RR, SpO2, DTRs, UOP'] },
    ],
    pearls: ['Renal insufficiency markedly increases toxicity risk.', 'Antidote: calcium gluconate (or chloride via central line).'],
  },

  {
    id: 'ethanol-level-estimate',
    name: 'Ethanol Level Estimate',
    shortName: 'EtOH Estimate',
    description: 'Estimates ethanol concentration from drinks (Widmark-style) or from osmolal gap (×4.6).',
    category: 'toxicology',
    tags: ['ethanol', 'alcohol', 'widmark', 'osm gap', 'toxicology'],
    whenToUse: 'Rough educational estimate of ethanol level when formal level delayed, or to relate osm gap to EtOH.',
    whyUse: 'Widmark and osm-gap conversions are common bedside approximations — not forensic measurements.',
    inputs: [
      selectInput('mode', 'Estimation mode', [
        { label: 'Osmolal gap → ethanol', value: 'gap' },
        { label: 'Drinks / Widmark approximate', value: 'widmark' },
      ]),
      numberInput('osmGap', 'Osmolal gap (if gap mode)', { unit: 'mOsm/kg', min: 0, max: 200, defaultValue: 20 }),
      numberInput('drinks', 'Standard drinks absorbed (if Widmark)', { min: 0, max: 40, step: 0.5, defaultValue: 4 }),
      numberInput('weight', 'Body weight', { unit: 'kg', min: 30, max: 250, defaultValue: 70 }),
      selectInput('sex', 'Sex (Widmark r)', [
        { label: 'Male (r ≈ 0.68)', value: 0.68 },
        { label: 'Female (r ≈ 0.55)', value: 0.55 },
      ]),
      numberInput('hours', 'Hours since drinking started (metabolism)', { unit: 'h', min: 0, max: 24, step: 0.5, defaultValue: 2 }),
      numberInput('beta', 'Elimination rate', { unit: 'mg/dL/h', min: 10, max: 40, defaultValue: 15 }),
    ],
    calculate(values) {
      const mode = String(values.mode ?? 'gap');
      if (mode === 'gap') {
        const gap = num(values.osmGap, 20);
        const etoh = round(gap * 4.6, 0);
        const r = riskFromThresholds(etoh, [
          { max: 50, level: 'low', label: 'Low / social range', interpretation: `Gap-based EtOH ≈ ${etoh} mg/dL. Mild impairment possible.` },
          { max: 150, level: 'moderate', label: 'Intoxication range', interpretation: `Gap-based EtOH ≈ ${etoh} mg/dL. Significant intoxication; still consider co-ingestants if gap higher than EtOH explains.` },
          { max: 300, level: 'high', label: 'High level', interpretation: `Gap-based EtOH ≈ ${etoh} mg/dL. Risk of respiratory depression; protect airway.` },
          { max: 1000, level: 'critical', label: 'Potentially life-threatening', interpretation: `Gap-based EtOH ≈ ${etoh} mg/dL. Life-threatening range — critical care.` },
        ]);
        return {
          score: etoh,
          unit: 'mg/dL',
          label: r.label,
          interpretation: r.interpretation + ' Formula: EtOH (mg/dL) ≈ osm gap × 4.6 (assumes gap entirely from ethanol).',
          riskLevel: r.riskLevel,
          details: [{ label: 'Osmolal gap', value: String(gap) }],
        };
      }

      // Widmark: BAC (g/dL) ≈ A/(rW) − βt; A in grams alcohol. Standard drink ≈14 g.
      const drinks = num(values.drinks, 4);
      const wt = num(values.weight, 70);
      const rFactor = num(values.sex, 0.68);
      const hours = num(values.hours, 2);
      const beta = num(values.beta, 15); // mg/dL/h
      const alcoholGrams = drinks * 14;
      // concentration g/L = A/(r*W); mg/dL = (A/(r*W))*100
      const peak = (alcoholGrams / (rFactor * wt)) * 100;
      const etoh = round(Math.max(0, peak - beta * hours), 0);
      const r = riskFromThresholds(etoh, [
        { max: 50, level: 'low', label: 'Low estimate', interpretation: `Widmark estimate ≈ ${etoh} mg/dL.` },
        { max: 150, level: 'moderate', label: 'Intoxication estimate', interpretation: `Widmark estimate ≈ ${etoh} mg/dL.` },
        { max: 300, level: 'high', label: 'High estimate', interpretation: `Widmark estimate ≈ ${etoh} mg/dL. Airway risk.` },
        { max: 1000, level: 'critical', label: 'Very high estimate', interpretation: `Widmark estimate ≈ ${etoh} mg/dL.` },
      ]);
      return {
        score: etoh,
        unit: 'mg/dL',
        label: r.label,
        interpretation:
          r.interpretation +
          ' Educational Widmark approximation (14 g/drink). Absorption/distribution assumptions limit accuracy — obtain serum EtOH when decisions depend on level.',
        riskLevel: r.riskLevel,
        details: [
          { label: 'Alcohol dose', value: `${alcoholGrams} g` },
          { label: 'Peak before elimination', value: `${round(peak, 0)} mg/dL` },
          { label: 'Elimination', value: `${beta} mg/dL/h × ${hours} h` },
        ],
      };
    },
    evidence: {
      summary: 'EtOH mg/dL ≈ osm gap × 4.6. Widmark: concentration from dose/(r×weight) minus elimination over time.',
      formula: 'Gap mode: EtOH ≈ gap × 4.6; Widmark: (A/(rW))×100 − βt',
      validation: 'Bedside approximations only; measured ethanol and full toxic alcohol workup when indicated.',
      references: [
        { title: 'Widmark formula and ethanol kinetics (clinical/forensic teaching)', citation: 'Classic Widmark ethanol distribution teaching; clinical toxicology reviews', year: 1981, url: 'https://www.ncbi.nlm.nih.gov/books/NBK537009/' },
      ],
    },
    nextSteps: [
      { condition: 'High estimated level', actions: ['Airway monitoring', 'Serum EtOH, glucose', 'Consider other alcohols if gap unexplained'] },
    ],
  },

  {
    id: 'rumack-matthew-time',
    name: 'Rumack-Matthew Time/Level Helper',
    shortName: 'Rumack-Matthew',
    description: 'Educational acetaminophen risk tier from time since ingestion and level (cannot plot full nomogram).',
    category: 'toxicology',
    tags: ['acetaminophen', 'apap', 'rumack', 'overdose', 'nac'],
    whenToUse: 'Single acute acetaminophen ingestion ≥4 hours post-ingestion with a timed level.',
    whyUse: 'Approximates whether level is above the 150 treatment line for NAC decisions (educational).',
    inputs: [
      numberInput('hours', 'Time since acute ingestion', { unit: 'hours', min: 4, max: 24, step: 0.5, defaultValue: 4 }),
      numberInput('level', 'Acetaminophen level', { unit: 'µg/mL (mcg/mL)', min: 0, max: 500, defaultValue: 150 }),
      yesNo('chronicOrUnknown', 'Chronic, staggered, or unknown time (not nomogram-eligible)'),
    ],
    calculate(values) {
      if (bool(values.chronicOrUnknown)) {
        return {
          score: 'Nomogram not applicable',
          label: 'Use NAC criteria for non-acute patterns',
          interpretation:
            'Rumack-Matthew nomogram is for single acute ingestion with known time. For staggered/chronic/unknown timing, treat based on level, LFTs, and toxicology guidance (often NAC if level detectable or LFTs rising).',
          riskLevel: 'high',
          recommendations: ['Check AST/ALT, INR', 'Start NAC if indicated by guidelines', 'Poison center consultation'],
        };
      }

      const t = num(values.hours, 4);
      const level = num(values.level, 150);

      if (t < 4) {
        return {
          score: level,
          unit: 'µg/mL',
          label: 'Too early for nomogram',
          interpretation: 'Levels before 4 hours cannot use the Rumack-Matthew line — repeat level at ≥4 hours post-ingestion (unless massive ingestion / other NAC criteria).',
          riskLevel: 'info',
        };
      }

      // Treatment line: 150 µg/mL at 4 h, halves every 4 h (150 × 0.5^((t-4)/4))
      const treatLine = 150 * Math.pow(0.5, (t - 4) / 4);
      // Probable toxicity line starts ~200 at 4 h (original)
      const probableLine = 200 * Math.pow(0.5, (t - 4) / 4);

      const ratio = level / treatLine;
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical';

      if (level >= probableLine) {
        label = 'Above probable toxicity line';
        interpretation = `Level ${level} µg/mL at ${t} h is above the approximate probable-toxicity line (~${round(probableLine, 1)}). NAC indicated.`;
        riskLevel = 'critical';
      } else if (level >= treatLine) {
        label = 'Above 150 treatment line';
        interpretation = `Level ${level} µg/mL at ${t} h is at/above the approximate “possible toxicity / treatment” line (~${round(treatLine, 1)} µg/mL). Start NAC.`;
        riskLevel = 'high';
      } else if (level >= treatLine * 0.8) {
        label = 'Near treatment line';
        interpretation = `Level ${level} near treatment line (~${round(treatLine, 1)}). Recheck timing accuracy; low threshold for NAC / poison center.`;
        riskLevel = 'moderate';
      } else {
        label = 'Below treatment line';
        interpretation = `Level ${level} µg/mL at ${t} h is below approximate treatment line (~${round(treatLine, 1)} µg/mL) for a single acute ingestion — NAC often not needed if time is certain and no other risk factors.`;
        riskLevel = 'low';
      }

      return {
        score: round(ratio, 2),
        unit: '× treatment line',
        label,
        interpretation:
          interpretation +
          ' Educational approximation only — plot on a validated nomogram or use institutional toxicology decision tools for treatment.',
        riskLevel,
        details: [
          { label: 'Approx treatment line', value: `${round(treatLine, 1)} µg/mL` },
          { label: 'Approx probable line', value: `${round(probableLine, 1)} µg/mL` },
          { label: 'Measured level', value: `${level} µg/mL` },
          { label: 'Time', value: `${t} h` },
        ],
        recommendations:
          riskLevel === 'low'
            ? ['Confirm ingestion time', 'LFTs if late presentation']
            : ['Start IV/oral NAC protocol', 'LFTs, INR, chemistry', 'Poison control'],
      };
    },
    evidence: {
      summary: 'Rumack-Matthew: treatment (150) line starts 150 µg/mL at 4 h and declines; NAC if level on/above line for acute single ingestion.',
      formula: 'Treatment line ≈ 150 × 0.5^((hours−4)/4) µg/mL',
      validation: 'Nomogram standard of care; this helper approximates the log-linear line for education.',
      references: [
        { title: 'Acetaminophen poisoning and the Rumack-Matthew nomogram', citation: 'Rumack BH, Matthew H. Pediatrics. 1975', year: 1975, pmid: '1134886' },
      ],
    },
    nextSteps: [
      { condition: 'On/above treatment line', actions: ['N-acetylcysteine immediately', 'Serial LFTs/INR', 'Poison center'] },
      { condition: 'Below line, time certain', actions: ['May observe without NAC', 'Return precautions'] },
    ],
    pearls: ['Massive ingestions and altered metabolism may warrant NAC even if nomogram-negative.', 'Never wait for 4-hour level to start NAC if presentation is late with high suspicion and delayed labs.'],
  },

  {
    id: 'loading-dose',
    name: 'Loading Dose Calculator',
    shortName: 'Loading Dose',
    description: 'Loading dose = target concentration × volume of distribution × weight.',
    category: 'general',
    tags: ['pharmacokinetics', 'loading dose', 'vd', 'dosing'],
    whenToUse: 'Estimating loading doses when Vd and target concentration are known (e.g., teaching PK).',
    whyUse: 'Core pharmacokinetic relationship for rapidly achieving a target plasma concentration.',
    inputs: [
      numberInput('cp', 'Target concentration (Cp)', { unit: 'mg/L', min: 0.01, max: 500, step: 0.1, defaultValue: 20 }),
      numberInput('vd', 'Volume of distribution (Vd)', { unit: 'L/kg', min: 0.05, max: 20, step: 0.05, defaultValue: 0.7 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 300, step: 0.1, defaultValue: 70 }),
      selectInput('bioavailability', 'Bioavailability (F)', [
        { label: 'IV (F = 1)', value: 1 },
        { label: 'Oral F = 0.8', value: 0.8 },
        { label: 'Oral F = 0.5', value: 0.5 },
      ]),
    ],
    calculate(values) {
      const cp = num(values.cp, 20);
      const vd = num(values.vd, 0.7);
      const wt = num(values.weight, 70);
      const f = num(values.bioavailability, 1);
      const dose = round((cp * vd * wt) / (f || 1), 1);
      return {
        score: dose,
        unit: 'mg',
        label: 'Estimated loading dose',
        interpretation: `LD ≈ ${dose} mg. Verify drug-specific targets, units (mg/L vs µg/mL), IBW vs TBW, and max dose limits before ordering.`,
        riskLevel: 'info',
        details: [
          { label: 'Formula', value: 'LD = (Cp × Vd × wt) / F' },
          { label: 'Cp', value: `${cp} mg/L` },
          { label: 'Vd', value: `${vd} L/kg` },
          { label: 'F', value: String(f) },
        ],
      };
    },
    evidence: {
      summary: 'Loading dose = Cp × Vd × weight / F. Units must be consistent (mg/L × L/kg × kg = mg).',
      formula: 'LD = Cp × Vd × weight / F',
      validation: 'Fundamental PK identity; drug monographs override teaching estimates.',
      references: [{ title: 'Clinical pharmacokinetics basics (loading dose concepts)', citation: 'Standard clinical pharmacokinetics teaching (Vd × target concentration)', year: 2012, url: 'https://www.ncbi.nlm.nih.gov/books/NBK557794/' }],
    },
    nextSteps: [
      { condition: 'After loading', actions: ['Start maintenance regimen', 'Therapeutic drug monitoring when indicated'] },
    ],
  },

  {
    id: 'infusion-rate',
    name: 'Infusion Rate (mcg/kg/min → mL/hr)',
    shortName: 'Infusion Rate',
    description: 'Converts weight-based infusion dose to mL/hr given bag concentration.',
    category: 'critical-care',
    tags: ['infusion', 'drip', 'mcg/kg/min', 'icu', 'dosing'],
    whenToUse: 'Titrating vasoactive or other continuous infusions with known concentration.',
    whyUse: 'Prevents unit errors when programming pumps.',
    inputs: [
      numberInput('dose', 'Desired dose', { unit: 'mcg/kg/min', min: 0.01, max: 200, step: 0.01, defaultValue: 5 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('concentration', 'Drug concentration', { unit: 'mcg/mL', min: 0.1, max: 100000, defaultValue: 1600 }),
    ],
    calculate(values) {
      const dose = num(values.dose, 5);
      const wt = num(values.weight, 70);
      const conc = num(values.concentration, 1600);
      if (conc <= 0) {
        return { score: '—', label: 'Invalid concentration', interpretation: 'Concentration must be >0.', riskLevel: 'info' };
      }
      // mL/hr = dose(mcg/kg/min) × wt(kg) × 60 min/h / conc(mcg/mL)
      const rate = round((dose * wt * 60) / conc, 2);
      const mcgPerMin = round(dose * wt, 2);
      return {
        score: rate,
        unit: 'mL/hr',
        label: 'Pump rate',
        interpretation: `Infuse at ${rate} mL/hr to deliver ${dose} mcg/kg/min (${mcgPerMin} mcg/min) at ${conc} mcg/mL.`,
        riskLevel: 'info',
        details: [
          { label: 'Formula', value: 'mL/hr = dose × weight × 60 / concentration' },
          { label: 'mcg/min', value: String(mcgPerMin) },
        ],
      };
    },
    evidence: {
      summary: 'mL/hr = (mcg/kg/min × kg × 60) / (mcg/mL). Confirm bag labeling (mg/mL vs mcg/mL).',
      formula: 'rate = dose × weight × 60 / concentration',
      validation: 'Standard ICU drip calculation.',
      references: [{ title: 'Continuous infusion rate calculations', citation: 'Critical care nursing / pharmacy standards for IV infusion math', year: 2015, url: 'https://www.ismp.org/resources/guidelines-safe-preparation-compounded-sterile-preparations' }],
    },
    nextSteps: [
      { condition: 'Any drip', actions: ['Independent double-check', 'Smart-pump drug library', 'Titrate to clinical endpoint'] },
    ],
    pearls: ['1 mg/mL = 1000 mcg/mL — unit mismatches are a common serious error.'],
  },

  {
    id: 'corrected-retic',
    name: 'Corrected Reticulocyte Count & RPI',
    shortName: 'Retic / RPI',
    description: 'Corrects reticulocyte percentage for anemia and estimates reticulocyte production index.',
    category: 'hematology',
    tags: ['reticulocyte', 'rpi', 'anemia', 'hematology'],
    whenToUse: 'Anemia workup to distinguish hypo- vs hyperproliferative response.',
    whyUse: 'Raw retic % overestimates production when Hct is low; RPI accounts for shift/maturation.',
    inputs: [
      numberInput('retic', 'Reticulocyte count', { unit: '%', min: 0.1, max: 30, step: 0.1, defaultValue: 2 }),
      numberInput('hct', 'Hematocrit', { unit: '%', min: 5, max: 60, defaultValue: 30 }),
      numberInput('normalHct', 'Normal Hct reference', { unit: '%', min: 35, max: 50, defaultValue: 45 }),
    ],
    calculate(values) {
      const retic = num(values.retic, 2);
      const hct = num(values.hct, 30);
      const normalHct = num(values.normalHct, 45);
      const corrected = round(retic * (hct / normalHct), 2);

      let maturation = 1.0;
      if (hct < 20) maturation = 2.5;
      else if (hct < 25) maturation = 2.0;
      else if (hct < 35) maturation = 1.5;
      else maturation = 1.0;

      const rpi = round(corrected / maturation, 2);

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'info' | 'normal';

      if (rpi >= 3) {
        label = 'Appropriate / increased production';
        interpretation = `RPI ${rpi} suggests adequate marrow response (hemolysis or blood loss pattern). Pursue extrinsic causes.`;
        riskLevel = 'normal';
      } else if (rpi >= 2) {
        label = 'Borderline response';
        interpretation = `RPI ${rpi} is borderline; correlate with acuity of anemia and clinical context.`;
        riskLevel = 'moderate';
      } else {
        label = 'Hypoproliferative pattern';
        interpretation = `RPI ${rpi} <2 suggests inadequate marrow response (deficiency, bone marrow disorder, anemia of chronic disease, etc.).`;
        riskLevel = 'low';
      }

      return {
        score: rpi,
        unit: 'RPI',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Corrected retic %', value: String(corrected) },
          { label: 'Maturation factor', value: String(maturation) },
          { label: 'Formula', value: 'Corrected = retic × (Hct/45); RPI = corrected / maturation' },
        ],
      };
    },
    evidence: {
      summary: 'Corrected retic = retic% × (Hct/45). RPI = corrected / maturation (1–2.5 by Hct). RPI >3 adequate response.',
      formula: 'Corrected retic = retic × (Hct/normalHct); RPI = corrected / maturation factor',
      validation: 'Standard hematology teaching tool.',
      references: [{ title: 'Reticulocyte production index (standard hematology)', citation: 'Classic hematology references for corrected reticulocyte count / RPI', year: 2000, url: 'https://www.ncbi.nlm.nih.gov/books/NBK431092/' }],
    },
    nextSteps: [
      { condition: 'Low RPI', actions: ['Iron/B12/folate studies', 'EPO/renal function', 'Review meds', 'Consider marrow evaluation'] },
      { condition: 'High RPI', actions: ['Hemolysis labs', 'Bleed search', 'Smear'] },
    ],
  },

  {
    id: 'absolute-lymphocyte',
    name: 'Absolute Lymphocyte Count (ALC)',
    shortName: 'ALC',
    description: 'ALC = WBC × (percent lymphocytes / 100).',
    category: 'hematology',
    tags: ['alc', 'lymphocyte', 'wbc', 'immunology', 'chemo'],
    whenToUse: 'Infection risk, viral illness, immunodeficiency screens, chemo recovery.',
    whyUse: 'Absolute counts are more informative than percentages alone.',
    inputs: [
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 200, step: 0.1, defaultValue: 6 }),
      numberInput('lymphPct', 'Lymphocytes', { unit: '%', min: 0, max: 100, defaultValue: 30 }),
    ],
    calculate(values) {
      const wbc = num(values.wbc, 6);
      const pct = num(values.lymphPct, 30);
      const alc = round(wbc * (pct / 100), 2);

      // Adult-oriented educational bands (×10³/µL)
      const r = riskFromThresholds(alc, [
        {
          max: 0.5,
          level: 'critical',
          label: 'Severe lymphopenia',
          interpretation: `ALC ${alc} ×10³/µL — severe lymphopenia; consider immunodeficiency, HIV, steroids/chemo, sepsis, COVID severity contexts.`,
        },
        {
          max: 1.0,
          level: 'high',
          label: 'Lymphopenia',
          interpretation: `ALC ${alc} ×10³/µL — lymphopenia. Investigate meds, infection, autoimmune, malnutrition.`,
        },
        {
          max: 4.0,
          level: 'normal',
          label: 'Within common adult reference',
          interpretation: `ALC ${alc} ×10³/µL — commonly within adult reference (~1.0–4.0 ×10³/µL; lab-specific).`,
        },
        {
          max: 100,
          level: 'moderate',
          label: 'Lymphocytosis',
          interpretation: `ALC ${alc} ×10³/µL — lymphocytosis. Consider viral illness, CLL/LPD in older adults, smoking, stress.`,
        },
      ]);

      return {
        score: alc,
        unit: '×10³/µL',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Formula', value: 'ALC = WBC × (% lymph / 100)' },
          { label: 'WBC', value: String(wbc) },
          { label: 'Lymph %', value: String(pct) },
        ],
      };
    },
    evidence: {
      summary: 'ALC = WBC × lymphocyte fraction. Pediatric reference ranges are age-dependent and higher in infants.',
      formula: 'ALC = WBC × (% lymphocytes / 100)',
      validation: 'Universal CBC-derived absolute count.',
      references: [{ title: 'CBC absolute lymphocyte/neutrophil counts', citation: 'Standard laboratory hematology definitions', year: 2010, url: 'https://www.ncbi.nlm.nih.gov/books/NBK557422/' }],
    },
    nextSteps: [
      { condition: 'Severe lymphopenia', actions: ['HIV test if appropriate', 'Medication review', 'Immunology referral if persistent'] },
      { condition: 'Marked lymphocytosis', actions: ['Peripheral smear', 'Flow cytometry if persistent in adults'] },
    ],
  },

  {
    id: 'sodium-deficit',
    name: 'Sodium Deficit',
    shortName: 'Na Deficit',
    description: 'Estimated sodium deficit = TBW × (desired Na − actual Na).',
    category: 'nephrology',
    tags: ['sodium', 'hyponatremia', 'deficit', 'electrolytes'],
    whenToUse: 'Planning sodium replacement in symptomatic or severe hyponatremia (adjunct).',
    whyUse: 'Provides a rough total deficit estimate; correction rate limits are critical.',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      numberInput('na', 'Current serum Na', { unit: 'mEq/L', min: 90, max: 140, defaultValue: 120 }),
      numberInput('goalNa', 'Desired Na', { unit: 'mEq/L', min: 120, max: 140, defaultValue: 130 }),
      selectInput('tbw', 'TBW fraction', [
        { label: 'Young men (0.6)', value: 0.6 },
        { label: 'Young women / elderly men (0.5)', value: 0.5 },
        { label: 'Elderly women (0.45)', value: 0.45 },
        { label: 'Children approx (0.6)', value: 0.6 },
      ]),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const na = num(values.na, 120);
      const goal = num(values.goalNa, 130);
      const f = num(values.tbw, 0.5);
      const deficit = round(f * wt * (goal - na), 0);

      if (goal <= na) {
        return {
          score: 0,
          unit: 'mEq',
          label: 'No deficit to goal',
          interpretation: 'Desired Na is not higher than current Na — deficit formula not applicable for lowering Na.',
          riskLevel: 'info',
        };
      }

      return {
        score: deficit,
        unit: 'mEq',
        label: 'Estimated sodium deficit',
        interpretation: `≈${deficit} mEq Na to raise serum Na from ${na} to ${goal}. Do NOT replace all at once. Typical limits: ~4–6 mEq/L in first 1–2 h if severe symptoms, then careful controlled rise (often ≤8–10 mEq/L in 24 h; stricter if chronic/high risk of ODS).`,
        riskLevel: 'info',
        details: [
          { label: 'TBW', value: `${round(f * wt, 1)} L` },
          { label: 'Formula', value: 'Deficit = TBW × (goal − actual)' },
        ],
      };
    },
    evidence: {
      summary: 'Na deficit ≈ TBW × (desired − actual). Guides total replacement, not rate.',
      formula: 'Na deficit (mEq) = TBW × (Nadesired − Naactual)',
      validation: 'Standard nephrology teaching; serial Na monitoring essential.',
      references: [
        { title: 'Hyponatremia', citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000', year: 2000, pmid: '10824078',
          doi: '10.1056/NEJM200005253422107', },
      ],
    },
    nextSteps: [
      { condition: 'Severe symptoms', actions: ['100 mL 3% saline boluses per guidelines', 'ICU monitoring', 'Recheck Na frequently'] },
      { condition: 'Chronic hyponatremia', actions: ['Slow correction', 'Identify cause (SIADH, hypovolemia, etc.)'] },
    ],
  },

  {
    id: 'expected-pco2-metabolic-alk',
    name: 'Expected PCO₂ (Metabolic Alkalosis)',
    shortName: 'PCO₂ (Met Alk)',
    description: 'Expected compensatory PaCO₂ in metabolic alkalosis ≈ 0.7 × HCO₃ + 20.',
    category: 'nephrology',
    tags: ['acid-base', 'metabolic alkalosis', 'pco2', 'compensation'],
    whenToUse: 'Metabolic alkalosis to detect concurrent respiratory disorders.',
    whyUse: 'Compensation is hypoventilation; if PCO₂ differs from expected, mixed disorder likely.',
    inputs: [
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 26, max: 60, defaultValue: 36 }),
      numberInput('paco2', 'Measured PaCO₂', { unit: 'mmHg', min: 20, max: 100, defaultValue: 45 }),
    ],
    calculate(values) {
      const hco3 = num(values.hco3, 36);
      const measured = num(values.paco2, 45);
      const expected = round(0.7 * hco3 + 20, 1);
      // Alternative check: ~0.5–0.7 mmHg rise per 1 mEq/L HCO3 above 24
      const alt = round(40 + 0.6 * (hco3 - 24), 1);
      const low = expected - 5;
      const high = expected + 5;

      let label = 'Appropriate respiratory compensation';
      let interpretation = `Expected PaCO₂ ≈ ${expected} mmHg (±5). Measured ${measured} is consistent with compensation for metabolic alkalosis.`;
      let riskLevel: 'normal' | 'moderate' | 'high' = 'normal';

      if (measured > high) {
        label = 'Additional respiratory acidosis';
        interpretation = `PaCO₂ ${measured} above expected (~${expected}). Concurrent respiratory acidosis or over-compensation (e.g., COPD, hypoventilation).`;
        riskLevel = 'high';
      } else if (measured < low) {
        label = 'Additional respiratory alkalosis';
        interpretation = `PaCO₂ ${measured} below expected (~${expected}). Concurrent respiratory alkalosis (or incomplete compensation).`;
        riskLevel = 'moderate';
      }

      return {
        score: expected,
        unit: 'mmHg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Expected range (±5)', value: `${low}–${high}` },
          { label: 'Alternate estimate', value: `${alt} (40 + 0.6×ΔHCO₃)` },
          { label: 'Measured PaCO₂', value: String(measured) },
        ],
      };
    },
    evidence: {
      summary: 'In metabolic alkalosis, expected PCO₂ ≈ 0.7×[HCO₃] + 20 (or ~0.5–0.7 mmHg per 1 mEq/L rise in HCO₃).',
      formula: 'Expected PCO₂ = 0.7 × HCO₃ + 20',
      validation: 'Standard acid-base teaching; compensation rarely raises PCO₂ above ~55–60 mmHg.',
      references: [{ title: 'Simple and mixed acid-base disorders: a practical approach', citation: 'Narins RG, Emmett M. Medicine (Baltimore). 1980', year: 1980, pmid: '6774200',
          doi: '10.1097/00005792-198005000-00001', }],
    },
    nextSteps: [
      { condition: 'Metabolic alkalosis', actions: ['Volume/Cl status', 'Diuretic/vomiting history', 'K repletion', 'ABG correlation'] },
      { condition: 'Mixed disorder', actions: ['Evaluate ventilation and second process'] },
    ],
  },

  {
    id: 'hypertonic-hyponatremia',
    name: 'Hypertonic Hyponatremia (Glucose Correction)',
    shortName: 'Na / Hyperglycemia',
    description: 'Corrects measured sodium for hyperglycemia (Katz 1.6 or Hillier 2.4 factor).',
    category: 'endocrinology',
    tags: ['sodium', 'glucose', 'hypertonic', 'hyponatremia', 'dka', 'hhs'],
    whenToUse: 'Hyponatremia with marked hyperglycemia (DKA/HHS) to estimate effective water balance.',
    whyUse: 'Translocational hyponatremia from glucose; corrected Na guides free-water status.',
    inputs: [
      numberInput('na', 'Measured sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 128 }),
      numberInput('glu', 'Serum glucose', { unit: 'mg/dL', min: 100, max: 2000, defaultValue: 500 }),
      selectInput('factor', 'Correction factor per 100 mg/dL glucose >100', [
        { label: '1.6 (Katz classic)', value: 1.6 },
        { label: '2.4 (Hillier)', value: 2.4 },
      ]),
    ],
    calculate(values) {
      const na = num(values.na, 128);
      const glu = num(values.glu, 500);
      const factor = num(values.factor, 1.6);
      const corr = round(na + factor * ((glu - 100) / 100), 1);

      let waterStatus = 'near eunatremic water balance (translocational effect)';
      let riskLevel: 'info' | 'moderate' | 'high' = 'info';
      if (corr < 135) {
        waterStatus = 'true hypotonic hyponatremia component likely (corrected Na still low)';
        riskLevel = 'moderate';
      } else if (corr > 145) {
        waterStatus = 'free-water deficit likely (corrected Na high — common in HHS)';
        riskLevel = 'high';
      }

      return {
        score: corr,
        unit: 'mEq/L',
        label: 'Corrected sodium',
        interpretation: `Corrected Na ≈ ${corr} mEq/L using factor ${factor}. Suggests ${waterStatus}. As glucose falls, measured Na typically rises.`,
        riskLevel,
        details: [
          { label: 'Measured Na', value: `${na} mEq/L` },
          { label: 'Glucose', value: `${glu} mg/dL` },
          { label: 'Factor', value: String(factor) },
          { label: 'Formula', value: `Na_corr = Na_meas + ${factor} × (glu−100)/100` },
        ],
      };
    },
    evidence: {
      summary: 'Hyperglycemia lowers measured Na. Katz +1.6 and Hillier +2.4 mEq/L per 100 mg/dL glucose over 100 are commonly used.',
      formula: 'Na_corrected = Na_measured + factor × (glucose − 100)/100',
      validation: 'Standard endocrine/electrolyte practice; Hillier may be more accurate at very high glucose.',
      references: [
        { title: 'Hyperglycemia-induced hyponatremia', citation: 'Katz MA. N Engl J Med. 1973', year: 1973, pmid: '4763428',
          doi: '10.1056/NEJM197310182891607', },
        { title: 'Correction factor for hyperglycemia', citation: 'Hillier TA et al. Am J Med. 1999', year: 1999, pmid: '10225241',
          doi: '10.1016/s0002-9343(99)00055-8', },
      ],
    },
    nextSteps: [
      { condition: 'DKA/HHS', actions: ['Use corrected Na for fluid planning', 'Monitor Na as glucose corrects', 'Follow ADA protocols'] },
    ],
  },

  {
    id: 'pregnancy-dating',
    name: "Naegele's Rule (EDD from LMP)",
    shortName: "Naegele's EDD",
    description: 'Estimated due date and gestational age from last menstrual period.',
    category: 'obstetrics',
    tags: ['pregnancy', 'edd', 'lmp', 'naegele', 'dating'],
    whenToUse: 'Dating pregnancy when LMP is known (confirm with ultrasound when possible).',
    whyUse: "Naegele's rule is the classic EDD estimate: LMP + 280 days.",
    inputs: [
      numberInput('lmpYear', 'LMP year', { min: 2020, max: 2035, defaultValue: 2026 }),
      numberInput('lmpMonth', 'LMP month', { min: 1, max: 12, defaultValue: 1 }),
      numberInput('lmpDay', 'LMP day', { min: 1, max: 31, defaultValue: 15 }),
      numberInput('refYear', 'Reference (today) year', { min: 2020, max: 2035, defaultValue: 2026 }),
      numberInput('refMonth', 'Reference month', { min: 1, max: 12, defaultValue: 7 }),
      numberInput('refDay', 'Reference day', { min: 1, max: 31, defaultValue: 27 }),
      numberInput('cycleLength', 'Cycle length', { unit: 'days', min: 21, max: 45, defaultValue: 28 }),
    ],
    calculate(values) {
      const lmp = new Date(num(values.lmpYear), num(values.lmpMonth) - 1, num(values.lmpDay));
      const ref = new Date(num(values.refYear), num(values.refMonth) - 1, num(values.refDay));
      const cycle = num(values.cycleLength, 28);
      const days = Math.round((ref.getTime() - lmp.getTime()) / 86400000);
      const weeks = Math.floor(days / 7);
      const rem = days % 7;

      // Classic Naegele: +1 year −3 months +7 days; adjust for cycle ≠ 28 by (cycle−28)
      const edd = new Date(lmp);
      edd.setDate(edd.getDate() + 280 + (cycle - 28));
      const eddStr = `${edd.getFullYear()}-${String(edd.getMonth() + 1).padStart(2, '0')}-${String(edd.getDate()).padStart(2, '0')}`;

      if (days < 0) {
        return {
          score: '—',
          label: 'Invalid dates',
          interpretation: 'Reference date is before LMP.',
          riskLevel: 'info',
        };
      }

      return {
        score: `${weeks}+${rem}`,
        label: 'Gestational age (LMP)',
        interpretation: `≈${weeks} weeks + ${rem} days by LMP. EDD (Naegele, cycle-adjusted): ${eddStr}. First-trimester ultrasound is more accurate if LMP uncertain or cycles irregular.`,
        riskLevel: 'info',
        details: [
          { label: 'Days since LMP', value: String(days) },
          { label: 'EDD', value: eddStr },
          { label: 'Cycle length used', value: `${cycle} days` },
        ],
      };
    },
    evidence: {
      summary: "Naegele: EDD = LMP + 280 days (+1 y −3 mo +7 d). Adjust by (cycle length − 28) for non-28-day cycles.",
      formula: 'EDD = LMP + 280 + (cycle − 28) days; GA = days since LMP',
      validation: 'Standard obstetric dating; ACOG prefers early US when available.',
      references: [{ title: "Naegele's rule and the length of pregnancy — a review", citation: "Lawson GW. Aust N Z J Obstet Gynaecol. 2021", year: 2021, pmid: '33079400', doi: '10.1111/ajo.13253' }],
    },
    nextSteps: [
      { condition: 'Dating', actions: ['Offer dating US if uncertain LMP', 'Initiate prenatal care schedule'] },
    ],
  },

  {
    id: 'ideal-body-weight-peds',
    name: 'Pediatric Ideal Body Weight',
    shortName: 'Peds IBW',
    description: 'Pediatric IBW estimate using Traub-Johnson equation (height-based).',
    category: 'pediatrics',
    tags: ['ibw', 'pediatric', 'dosing', 'traub-johnson', 'weight'],
    whenToUse: 'Weight-based dosing or nutrition estimates in children when IBW is preferred over total body weight.',
    whyUse: 'Traub-Johnson provides a simple height-based IBW used in pediatric pharmacy contexts.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 200, defaultValue: 120 }),
      selectInput('method', 'Method', [
        { label: 'Traub-Johnson (preferred here)', value: 'tj' },
        { label: 'Simple BMI-method at BMI 50th≈18 (approx)', value: 'bmi18' },
      ]),
      numberInput('actualWt', 'Actual weight (optional, for %IBW)', { unit: 'kg', min: 0, max: 200, step: 0.1, defaultValue: 0 }),
    ],
    calculate(values) {
      const ht = num(values.height, 120);
      const method = String(values.method ?? 'tj');
      let ibw: number;
      let formula: string;

      if (method === 'bmi18') {
        // weight = BMI × height(m)^2 using BMI 18 as rough “ideal”
        const hm = ht / 100;
        ibw = round(18 * hm * hm, 1);
        formula = 'IBW ≈ 18 × height(m)²';
      } else {
        // Traub-Johnson: IBW(kg) = 2.396 × e^(0.01863 × height_cm)
        ibw = round(2.396 * Math.exp(0.01863 * ht), 1);
        formula = 'IBW = 2.396 × e^(0.01863 × height_cm)';
      }

      const actual = num(values.actualWt, 0);
      const details = [
        { label: 'Method', value: method === 'bmi18' ? 'BMI≈18 estimate' : 'Traub-Johnson' },
        { label: 'Formula', value: formula },
        { label: 'Height', value: `${ht} cm` },
      ];

      if (actual > 0 && ibw > 0) {
        const pct = round((actual / ibw) * 100, 0);
        details.push({ label: '% of IBW', value: `${pct}%` });
      }

      return {
        score: ibw,
        unit: 'kg',
        label: 'Estimated pediatric IBW',
        interpretation: `IBW ≈ ${ibw} kg. Use drug-specific guidance for dosing weight (TBW vs IBW vs adjusted). Not for infants where specialized methods apply.`,
        riskLevel: 'info',
        details,
      };
    },
    evidence: {
      summary: 'Traub-Johnson: IBW (kg) = 2.396 × exp(0.01863 × height in cm). One of several pediatric IBW methods (McLaren, Moore, BMI-based).',
      formula: 'IBW = 2.396 × e^(0.01863 × ht_cm)',
      validation: 'Used in pediatric dosing literature; validate against local pharmacy standards.',
      references: [
        { title: 'Traub-Johnson pediatric IBW', citation: 'Traub SL, Johnson CE. Am J Hosp Pharm. 1980', year: 1980, pmid: '7369179',
          doi: '10.1093/ajcp/73.4.552', },
      ],
    },
    nextSteps: [
      { condition: 'Dosing', actions: ['Check drug-specific weight basis', 'Consider adjusted body weight if obese per protocol'] },
    ],
  },

  {
    id: 'finnegan',
    name: 'Finnegan NAS Score (Simplified)',
    shortName: 'Finnegan',
    description: 'Simplified neonatal abstinence symptom sum for educational scoring.',
    category: 'pediatrics',
    tags: ['nas', 'neonatal abstinence', 'finnegan', 'withdrawal', 'opioid'],
    whenToUse: 'Infants at risk for neonatal opioid withdrawal when Finnegan-style serial scoring is used.',
    whyUse: 'Structures CNS, metabolic/vasomotor, and GI withdrawal signs; thresholds guide treatment.',
    inputs: [
      selectInput('cry', 'High-pitched cry', [
        { label: 'None (0)', value: 0 },
        { label: 'Excessive (2)', value: 2 },
        { label: 'Continuous (3)', value: 3 },
      ]),
      selectInput('sleep', 'Sleeps after feeding', [
        { label: 'Normal (0)', value: 0 },
        { label: '<3 h (1)', value: 1 },
        { label: '<2 h (2)', value: 2 },
        { label: '<1 h (3)', value: 3 },
      ]),
      selectInput('moro', 'Moro reflex', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Hyperactive (2)', value: 2 },
        { label: 'Markedly hyperactive (3)', value: 3 },
      ]),
      selectInput('tremors', 'Tremors', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild when disturbed (1)', value: 1 },
        { label: 'Mod–severe when disturbed (2)', value: 2 },
        { label: 'Mild undisturbed (3)', value: 3 },
        { label: 'Mod–severe undisturbed (4)', value: 4 },
      ]),
      yesNo('increasedTone', 'Increased muscle tone', 2),
      yesNo('excoriation', 'Excoriation', 1),
      yesNo('myoclonic', 'Myoclonic jerks', 3),
      yesNo('convulsions', 'Convulsions', 5),
      yesNo('sweating', 'Sweating', 1),
      yesNo('feverLow', 'Fever 37.2–38.3°C', 1),
      yesNo('feverHigh', 'Fever >38.3°C', 2),
      yesNo('yawning', 'Frequent yawning (>3–4)', 1),
      yesNo('mottling', 'Mottling', 1),
      yesNo('nasalStuff', 'Nasal stuffiness', 1),
      yesNo('sneezing', 'Sneezing (>3–4)', 1),
      yesNo('nasalFlaring', 'Nasal flaring', 2),
      selectInput('rr', 'Respiratory rate', [
        { label: '≤60 (0)', value: 0 },
        { label: '>60 (1)', value: 1 },
        { label: '>60 with retractions (2)', value: 2 },
      ]),
      yesNo('excessiveSucking', 'Excessive sucking', 1),
      yesNo('poorFeeding', 'Poor feeding', 2),
      yesNo('regurgitation', 'Regurgitation', 2),
      yesNo('projectile', 'Projectile vomiting', 3),
      selectInput('stools', 'Stools', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Loose (2)', value: 2 },
        { label: 'Watery (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.cry) +
        num(values.sleep) +
        num(values.moro) +
        num(values.tremors) +
        (bool(values.increasedTone) ? 2 : 0) +
        (bool(values.excoriation) ? 1 : 0) +
        (bool(values.myoclonic) ? 3 : 0) +
        (bool(values.convulsions) ? 5 : 0) +
        (bool(values.sweating) ? 1 : 0) +
        (bool(values.feverLow) ? 1 : 0) +
        (bool(values.feverHigh) ? 2 : 0) +
        (bool(values.yawning) ? 1 : 0) +
        (bool(values.mottling) ? 1 : 0) +
        (bool(values.nasalStuff) ? 1 : 0) +
        (bool(values.sneezing) ? 1 : 0) +
        (bool(values.nasalFlaring) ? 2 : 0) +
        num(values.rr) +
        (bool(values.excessiveSucking) ? 1 : 0) +
        (bool(values.poorFeeding) ? 2 : 0) +
        (bool(values.regurgitation) ? 2 : 0) +
        (bool(values.projectile) ? 3 : 0) +
        num(values.stools);

      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Below common treat threshold',
          interpretation: 'Score <8: often continue non-pharmacologic care and q3–4h scoring (protocol-dependent).',
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Approaching / at treatment range',
          interpretation: 'Scores ≥8 on 3 consecutive (or ≥12 once) commonly trigger pharmacologic therapy in classic Finnegan protocols — follow local NAS pathway.',
        },
        {
          max: 60,
          level: 'high',
          label: 'Elevated NAS score',
          interpretation: 'Elevated score — escalate care, consider opioid treatment protocol, monitor for seizures/dehydration.',
        },
      ]);

      return {
        score,
        ...r,
        interpretation:
          r.interpretation +
          ' This is a simplified educational subset of Finnegan items; use your institution’s full Finnegan or Eat-Sleep-Console protocol for clinical decisions.',
      };
    },
    evidence: {
      summary: 'Finnegan Neonatal Abstinence Scoring System sums CNS, metabolic/vasomotor, and GI signs. Treatment thresholds often ≥8 ×3 or ≥12 once.',
      validation: 'Classic NAS tool; many centers now use Eat-Sleep-Console approaches.',
      references: [
        { title: 'Neonatal abstinence syndrome scoring', citation: 'Finnegan LP et al. Addict Dis. 1975', year: 1975, pmid: '1163358' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated scores', actions: ['Non-pharm first: swaddle, low stimulation, feeding support', 'Morphine/methadone protocol if thresholds met', 'Social work / discharge planning'] },
    ],
    pearls: ['Score q3–4h after feeds for consistency.', 'Eat-Sleep-Console may reduce morphine exposure vs Finnegan-driven protocols.'],
  },

  {
    id: 'urine-anion-gap',
    name: 'Urine Anion Gap',
    shortName: 'UAG',
    description: 'Urine anion gap = UNa + UK − UCl; surrogate for urinary ammonium in metabolic acidosis.',
    category: 'nephrology',
    tags: ['urine anion gap', 'rta', 'acidosis', 'ammonium', 'electrolytes'],
    whenToUse: 'Normal anion gap metabolic acidosis to help distinguish GI bicarb loss vs RTA.',
    whyUse: 'Negative UAG suggests appropriate NH₄⁺ excretion (e.g., diarrhea); positive suggests impaired renal acidification (RTA).',
    inputs: [
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 40 }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 1, max: 200, defaultValue: 20 }),
      numberInput('ucl', 'Urine Cl', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 60 }),
    ],
    calculate(values) {
      const una = num(values.una, 40);
      const uk = num(values.uk, 20);
      const ucl = num(values.ucl, 60);
      const uag = round(una + uk - ucl, 0);

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'info';

      if (uag < 0) {
        label = 'Negative UAG';
        interpretation = `UAG ${uag}: suggests increased urinary NH₄⁺ (appropriate renal response) — favors extrarenal HCO₃ loss (e.g., diarrhea) in NAGMA.`;
        riskLevel = 'low';
      } else if (uag <= 10) {
        label = 'Near-zero UAG';
        interpretation = `UAG ${uag}: indeterminate zone — integrate clinical context, urine pH, and ammonium when available.`;
        riskLevel = 'info';
      } else {
        label = 'Positive UAG';
        interpretation = `UAG ${uag}: suggests low urinary NH₄⁺ — favors renal tubular acidosis (impaired acidification) in the setting of NAGMA.`;
        riskLevel = 'moderate';
      }

      return {
        score: uag,
        unit: 'mEq/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Formula', value: 'UAG = UNa + UK − UCl' },
          { label: 'UNa + UK', value: String(una + uk) },
          { label: 'UCl', value: String(ucl) },
        ],
      };
    },
    evidence: {
      summary: 'UAG = Na + K − Cl in urine. Negative → high NH₄ (diarrhea); positive → low NH₄ (RTA) in hyperchloremic metabolic acidosis.',
      formula: 'UAG = UNa + UK − UCl',
      validation: 'Classic teaching; unreliable with toluene, ketoanions, or large urinary unmeasured anions; direct NH₄ preferred when available.',
      references: [
        { title: 'The urine anion gap', citation: 'Batlle DC et al. N Engl J Med. 1988', year: 1988, pmid: '2835676',
          doi: '10.1016/0165-1218(88)90032-8', },
      ],
    },
    nextSteps: [
      { condition: 'Positive UAG + NAGMA', actions: ['Check urine pH', 'Evaluate for RTA types', 'K, Ca, growth (peds), autoimmune workup as indicated'] },
      { condition: 'Negative UAG + NAGMA', actions: ['GI loss evaluation', 'Volume and K repletion'] },
    ],
    pearls: ['Not useful for high anion gap acidosis interpretation.', 'Volume depletion with low UNa can confound.'],
  },
];
