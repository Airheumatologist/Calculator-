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
        { label: '4–6 years (Acker cutoff >1.22)', value: '4-6', description: 'Acker 2015 derivation band' },
        { label: '7–12 years (Acker cutoff >1.0)', value: '7-12', description: 'Acker 2015 derivation band' },
        { label: '13–16 years (Acker cutoff >0.9)', value: '13-16', description: 'Acker 2015 derivation band (not 13–17)' },
        { label: '1–3 years (not Acker SIPA — no official cutoff)', value: '1-3', description: 'Acker derived SIPA in ages 4–16 years only; do not apply the 4–6 year cutoff' },
      ], '4-6', 'Acker 2015 SIPA: children 4–16 years. Cutoffs SI >1.22 (4–6 y), >1.0 (7–12 y), >0.9 (13–16 y). 1–3 years is not the derivation population.'),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 40, max: 250, exampleValue: 120, helpText: 'SIPA = HR ÷ SBP. Acker cutoffs: >1.22 (4–6 y), >1.0 (7–12 y), >0.9 (13–16 y).' }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 200, exampleValue: 90, helpText: 'Systolic BP in mmHg from the same trauma-bay vitals as the heart rate; SIPA = HR ÷ SBP, so cuff or age-cuff size errors propagate directly.' }),
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
      const band = String(values.ageBand ?? '4-6');
      const acker =
        band === '1-3'
          ? null
          : band === '13-16' || band === '13-17'
            ? { cutoff: 0.9, label: '13–16 years' }
            : band === '7-12'
              ? { cutoff: 1.0, label: '7–12 years' }
              : { cutoff: 1.22, label: '4–6 years' };

      if (!acker) {
        return {
          score: si,
          unit: 'HR/SBP',
          label: 'SI calculated — not Acker SIPA',
          interpretation: `SI ${si} (HR ${hr} ÷ SBP ${sbp}). Acker SIPA was derived in children 4–16 years; there is no official Acker cutoff for ages 1–3. Do not apply the 4–6 year threshold (>1.22). Interpret SI with age-normal vitals and full trauma assessment.`,
          riskLevel: 'info',
          details: [
            { label: 'Age band', value: '1–3 years (not Acker derivation)' },
            { label: 'Cutoff', value: 'None (not Acker SIPA)' },
            { label: 'HR / SBP', value: `${hr} / ${sbp}` },
          ],
        };
      }

      const elevated = si > acker.cutoff;
      return {
        score: si,
        unit: 'HR/SBP',
        label: elevated ? 'Elevated SIPA' : 'Normal SIPA',
        interpretation: elevated
          ? `SI ${si} exceeds Acker age-adjusted cutoff (>${acker.cutoff} for ${acker.label}). Associated with higher need for transfusion, surgery, and ICU in 4–16 year trauma cohorts.`
          : `SI ${si} is at or below Acker cutoff (>${acker.cutoff} for ${acker.label}). Integrate with full clinical assessment.`,
        riskLevel: elevated ? 'high' : 'low',
        details: [
          { label: 'Age band', value: acker.label },
          { label: 'Cutoff', value: `>${acker.cutoff}` },
          { label: 'HR / SBP', value: `${hr} / ${sbp}` },
        ],
      };
    },
    evidence: {
      summary: 'Acker 2015 SIPA (ages 4–16 y): SI = HR/SBP with cutoffs >1.22 (4–6 y), >1.0 (7–12 y), >0.9 (13–16 y). Not derived for 1–3 year olds. Elevated SIPA predicts trauma morbidity.',
      formula: 'SI = HR ÷ SBP; compare to Acker age-specific threshold (4–16 y only)',
      validation: 'Validated in pediatric trauma registries (ages 4–16); improves identification of severely injured children vs adult SI >0.9 alone.',
      references: [
        { title: 'Pediatric specific shock index accurately identifies severely injured children', citation: 'Acker SN et al. J Pediatr Surg. 2015', year: 2015, pmid: '25638631',
          doi: '10.1016/j.jpedsurg.2014.08.009', },
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
        { label: 'Strong / normal / content (1)', value: 1, description: 'Strong cry, or content and not crying' },
        { label: 'Whimpering / sobbing (3)', value: 3, description: 'Whimpering or sobbing cry' },
        { label: 'Weak / moaning / high-pitched (5)', value: 5, description: 'Weak, moaning, or high-pitched cry' },
      ], 1, 'Observe before undressing, otoscopy, or labs; child with caregiver. Score what you see, not history. Does not replace age-based infant fever pathways.'),
      selectInput('reaction', 'Reaction to parent stimulation', [
        { label: 'Cries briefly then content / no cry (1)', value: 1, description: 'Cries briefly then content, or does not cry when stimulated by parent' },
        { label: 'Cries off and on (3)', value: 3, description: 'Cries off and on with parent stimulation' },
        { label: 'Continual cry or little response (5)', value: 5, description: 'Continual cry, or little/no response to parent' },
      ], 1, 'Have the parent pick up/talk to the child. Score the response, not the history.'),
      selectInput('state', 'State variation', [
        { label: 'Awakens quickly / stays awake (1)', value: 1, description: 'If asleep, awakens quickly; if awake, stays awake' },
        { label: 'Eyes close briefly awake / wakes with prolonged stimulation (3)', value: 3, description: 'Eyes close briefly while awake, or needs prolonged stimulation to wake' },
        { label: 'Falls asleep / will not rouse (5)', value: 5, description: 'Falls asleep and will not rouse, or cannot be kept awake' },
      ], 1, 'If asleep, how quickly does the child awaken? If awake, does the child stay awake? Score this observation, not history.'),
      selectInput('color', 'Color', [
        { label: 'Pink (1)', value: 1, description: 'Pink, including acrocyanosis of hands/feet only if the rest of the child is pink' },
        { label: 'Pale extremities / acrocyanosis (3)', value: 3, description: 'Pale extremities or acrocyanosis beyond the usual newborn hands/feet' },
        { label: 'Pale / cyanotic / mottled / ashen (5)', value: 5, description: 'Pale, cyanotic, mottled, or ashen' },
      ], 1, 'Observe trunk and face, not just hands. Pink with only acral coolness scores 1.'),
      selectInput('hydration', 'Hydration', [
        { label: 'Skin normal / eyes normal / moist mucosa (1)', value: 1, description: 'Skin, eyes, and mucous membranes normal/moist' },
        { label: 'Skin / eyes normal, mouth slightly dry (3)', value: 3, description: 'Skin and eyes normal; mouth slightly dry' },
        { label: 'Doughy skin / dry mucosa / sunken eyes (5)', value: 5, description: 'Doughy skin, dry mucous membranes, or sunken eyes' },
      ], 1, 'Check mucous membranes, eyes, and skin turgor. Tears are not required to score 1.'),
      selectInput('social', 'Response to social overtures', [
        { label: 'Smiles / alerts (≤2 mo: alerts) (1)', value: 1, description: 'Smiles or alerts (≥2 mo: smile; ≤2 mo: alerts to social cue)' },
        { label: 'Brief smile / alerts briefly (3)', value: 3, description: 'Brief smile, or alerts only briefly' },
        { label: 'No smile / anxious / dull / no alerting (5)', value: 5, description: 'No smile, anxious face, dull, or no alerting' },
      ], 1, 'Examiner or parent talks/smiles to the child. ≤2 months: score alerting rather than smile.'),
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
      yesNo('illAppearing', 'Ill-appearing / clinical suspicion of severe infection', null, 'Ill/toxic on Pediatric Assessment Triangle (appearance, work of breathing, circulation) or clinician suspicion of invasive infection — not a well, playful infant.', false),
      numberInput('ageDays', 'Age', { unit: 'days', min: 0, max: 90, exampleValue: 40, helpText: 'Age ≤21 days automatically fails the low-risk pathway.' }),
      yesNo('leukocyturia', 'Leukocyturia (positive UA / dipstick LE or nitrite per local def.)', null, 'LE or nitrite positive on dipstick (or lab UA per local definition).', true),
      numberInput('pct', 'Procalcitonin', { unit: 'ng/mL', min: 0, max: 100, step: 0.01, exampleValue: 0.2, helpText: 'Fails low-risk if PCT ≥0.5 ng/mL (applied automatically).' }),
      numberInput('crp', 'CRP', { unit: 'mg/L', min: 0, max: 400, exampleValue: 10, helpText: 'Fails low-risk if CRP >20 mg/L (applied automatically).' }),
      numberInput('anc', 'Absolute neutrophil count', { unit: '×10³/µL', min: 0, max: 50, step: 0.1, exampleValue: 4, helpText: 'Fails low-risk if ANC >10 ×10³/µL (applied automatically).' }),
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
        { title: 'Accuracy of a sequential approach to identify young febrile infants at low risk for invasive bacterial infection', citation: 'Mintegi S et al. Emerg Med J. 2014', year: 2014, pmid: '23851127',
          doi: '10.1136/emermed-2013-202449', },
        { title: 'Validation of the "Step-by-Step" Approach in the Management of Young Febrile Infants', citation: 'Gomez B, Mintegi S et al. Pediatrics. 2016', year: 2016, pmid: '27382134',
          doi: '10.1542/peds.2015-4381', },
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
    name: 'VBAC Success (Grobman 2007 Antenatal Model)',
    shortName: 'VBAC Success',
    description: 'Predicted VBAC success from the published Grobman 2007 antenatal logistic model (NICHD MFMU).',
    category: 'obstetrics',
    tags: ['vbac', 'tolac', 'cesarean', 'grobman', 'labor'],
    whenToUse: 'Counseling candidates for trial of labor after cesarean (TOLAC) using antenatal (not admission) predictors.',
    whyUse: 'Published Grobman 2007 coefficients estimate VBAC probability from age, BMI, race/ethnicity, prior vaginal birth, prior VBAC, and recurring cesarean indication.',
    inputs: [
      numberInput('age', 'Maternal age', { unit: 'years', min: 15, max: 55, exampleValue: 30, helpText: 'Maternal age in years at counseling; Grobman 2007 carries a small positive age coefficient (+0.039 per year).' }),
      numberInput('bmi', 'Prepregnancy BMI', { unit: 'kg/m²', min: 15, max: 60, step: 0.1, exampleValue: 28, helpText: 'Use prepregnancy (not admission) BMI as in the 2007 Grobman antenatal model.' }),
      selectInput('ethnicity', 'Race / ethnicity (as in original model categories)', [
        { label: 'Neither African American nor Hispanic', value: 'other' },
        { label: 'African American', value: 'aa' },
        { label: 'Hispanic', value: 'hispanic' },
      ], 'other', 'Race/ethnicity must use the original model\'s categories: African American (−0.671) and Hispanic (−0.680) subtract from the logit, neither-or-other is the reference. Do not substitute other groupings.'),
      yesNo('priorVaginal', 'Any prior vaginal delivery', null, 'Any prior vaginal delivery, including a VBAC, adds the largest positive coefficient in the model. Nulliparous-beyond-the-cesarean patients score No.', true),
      yesNo('priorVbac', 'Prior VBAC (successful vaginal birth after a prior cesarean)', null, 'A prior successful VBAC (after a previous cesarean) adds its own positive coefficient on top of any prior vaginal delivery.', true),
      yesNo('recurringIndication', 'Recurring indication for cesarean (arrest / CPD / FTP)', null, 'Recurring cesarean indication (arrest of labor, cephalopelvic disproportion, failure to progress) subtracts from the predicted probability.', false),
    ],
    calculate(values) {
      // Grobman WA et al. Obstet Gynecol. 2007;109:806-812. PMID 17400840 (antenatal model; no induction term).
      const age = num(values.age, 30);
      const bmi = num(values.bmi, 28);
      const eth = String(values.ethnicity ?? 'other');
      const priorVaginal = bool(values.priorVaginal);
      const priorVbac = bool(values.priorVbac);
      const recurring = bool(values.recurringIndication);

      let x =
        3.766 -
        0.039 * age -
        0.06 * bmi +
        (priorVaginal ? 0.888 : 0) +
        (priorVbac ? 1.003 : 0) -
        (recurring ? 0.632 : 0);
      if (eth === 'aa') x -= 0.671;
      if (eth === 'hispanic') x -= 0.68;

      const p = 1 / (1 + Math.exp(-x));
      const pct = round(p * 100, 0);

      const r = riskFromThresholds(pct, [
        {
          max: 49,
          level: 'high',
          label: 'Lower predicted success',
          interpretation: `Grobman 2007 antenatal predicted VBAC success ≈${pct}%. Lower-range estimate — counsel carefully on risks of failed TOLAC / emergency cesarean.`,
        },
        {
          max: 69,
          level: 'moderate',
          label: 'Intermediate predicted success',
          interpretation: `Grobman 2007 antenatal predicted VBAC success ≈${pct}%. Intermediate range — individualize with obstetric history and facility resources.`,
        },
        {
          max: 100,
          level: 'low',
          label: 'Higher predicted success',
          interpretation: `Grobman 2007 antenatal predicted VBAC success ≈${pct}%. More favorable predictor profile — still requires TOLAC-capable setting and consent for uterine rupture risk.`,
        },
      ]);

      return {
        score: pct,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation + ' This is the published 2007 antenatal equation (no labor-admission variables). The 2009 admission model adds cervical exam and induction; use institutional / NICHD tools when those data are available.',
        riskLevel: r.riskLevel,
        details: [
          { label: 'Linear predictor (w)', value: String(round(x, 3)) },
          { label: 'Model', value: 'Grobman 2007 antenatal logistic (PMID 17400840)' },
        ],
      };
    },
    evidence: {
      summary:
        'Grobman 2007 antenatal VBAC model: w = 3.766 − 0.039×age − 0.060×BMI − 0.671 if African American − 0.680 if Hispanic + 0.888 if any prior vaginal delivery + 1.003 if prior VBAC − 0.632 if recurring cesarean indication; P = 1/(1+e^(−w)). Induction is not a 2007 antenatal variable (it appears in the 2009 admission model).',
      formula: 'P = 1/(1+e^(−w)); w = 3.766 − 0.039(age) − 0.060(BMI) − 0.671(AA) − 0.680(Hispanic) + 0.888(any prior VD) + 1.003(prior VBAC) − 0.632(recurring indication)',
      validation: 'Derived and internally validated in the NICHD MFMU cesarean registry; use alongside local TOLAC counseling and uterine-rupture discussion.',
      references: [
        { title: 'Development of a nomogram for prediction of vaginal birth after cesarean delivery', citation: 'Grobman WA et al. Obstet Gynecol. 2007', year: 2007, pmid: '17400840',
          doi: '10.1097/01.AOG.0000259312.36053.02', },
        { title: 'Does information available at admission for delivery improve prediction of vaginal birth after cesarean?', citation: 'Grobman WA et al. Am J Perinatol. 2009;26(10):693–701', year: 2009, pmid: '19813165',
          doi: '10.1055/s-0029-1239494', },
        { title: 'Prediction of vaginal birth after cesarean using information at admission for delivery: a calculator without race or ethnicity', citation: 'Grobman WA et al. Am J Obstet Gynecol. 2024;230(3 Suppl):S804–S806', year: 2024, pmid: '38180754',
          doi: '10.1016/j.ajog.2023.02.008', },
      ],
    },
    nextSteps: [
      { condition: 'Considering TOLAC', actions: ['Facility capable of emergency cesarean', 'Discuss uterine rupture (~0.5–1% after low transverse scar)', 'Document informed consent'] },
    ],
    pearls: [
      'Prior vaginal birth is one of the strongest favorable predictors.',
      'Arrest-of-labor indication for prior CD lowers success odds.',
      'The 2007 antenatal model carries race/ethnicity terms; the MFMU published a race-free calculator using admission-time data in 2024 — prefer it when cervical exam, induction, and gestational-age data are available.',
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
      yesNo('bp140', 'BP ≥140/90 mmHg on ≥2 occasions ≥4 h apart (after 20 weeks)', null, 'SBP ≥140 or DBP ≥90 on two occasions ≥4 hours apart after 20 weeks. Severe-range BP is a separate item.', true),
      yesNo('bp160', 'Severe-range BP ≥160/110 mmHg (confirmed)', null, 'SBP ≥160 or DBP ≥110 confirmed within ~15 minutes; do not wait 4 hours to treat.', false),
      yesNo('proteinuria', 'Proteinuria (≥300 mg/24h, PCR ≥0.3, or dipstick 2+ if others unavailable)', null, 'ACOG: ≥300 mg/24 h, protein/creatinine ratio ≥0.3, or dipstick 2+ only if quantitative methods unavailable.', true),
      yesNo('platelets', 'Platelets <100,000/µL', null, 'Severe-feature criterion: platelet count <100 ×10³/µL.', false),
      yesNo('creatinine', 'Serum creatinine >1.1 mg/dL or doubling without other renal disease', null, 'Severe-feature: Cr >1.1 mg/dL or doubling of baseline in the absence of other renal disease.', false),
      yesNo('lfts', 'LFTs ≥2× upper limit of normal', null, 'AST or ALT ≥2× this lab’s ULN (severe feature).', false),
      yesNo('pulmEdema', 'Pulmonary edema', null, 'Clinical or radiographic pulmonary edema — a severe feature.', false),
      yesNo('neuro', 'New cerebral or visual symptoms (e.g., severe headache, scotomata)', null, 'New-onset severe headache unresponsive to usual analgesics, or visual symptoms (scotomata, photopsia, blindness) — severe features.', false),
      yesNo('epigastric', 'Severe persistent RUQ / epigastric pain (not explained otherwise)', null, 'Severe persistent right-upper-quadrant or epigastric pain not accounted for by another diagnosis — severe feature even if LFTs are not yet 2× ULN.', false),
    ],
    calculate(values) {
      const htn = bool(values.bp140) || bool(values.bp160);
      const severeBp = bool(values.bp160);
      const protein = bool(values.proteinuria);
      const platelets = bool(values.platelets);
      const creatinine = bool(values.creatinine);
      const lfts = bool(values.lfts);
      const pulmEdema = bool(values.pulmEdema);
      const neuro = bool(values.neuro);
      const epigastric = bool(values.epigastric);
      const endOrgan = platelets || creatinine || lfts || pulmEdema || neuro || epigastric;
      const endOrganDetails = [
        { label: 'Platelets <100k', value: platelets ? 'Yes' : 'No' },
        { label: 'Creatinine criterion', value: creatinine ? 'Yes' : 'No' },
        { label: 'LFTs ≥2× ULN', value: lfts ? 'Yes' : 'No' },
        { label: 'Pulmonary edema', value: pulmEdema ? 'Yes' : 'No' },
        { label: 'Cerebral/visual symptoms', value: neuro ? 'Yes' : 'No' },
        { label: 'RUQ / epigastric pain', value: epigastric ? 'Yes' : 'No' },
      ];

      if (!htn) {
        return {
          score: 'Criteria not met',
          label: 'No diagnostic HTN criterion',
          interpretation: 'Preeclampsia diagnosis requires new hypertension after 20 weeks (or superimposed pattern). Continue surveillance if clinically concerned.',
          riskLevel: 'info',
          details: [
            { label: 'Proteinuria', value: protein ? 'Yes' : 'No' },
            ...endOrganDetails,
          ],
        };
      }

      const severeFeatures =
        severeBp || platelets || creatinine || lfts || pulmEdema || neuro || epigastric;
      // ACOG PB 222: gestational HTN with severe-range BPs (≥160/110) is diagnosed/managed as preeclampsia with severe features.
      const preeclampsia = protein || endOrgan || severeBp;

      if (!preeclampsia) {
        return {
          score: 'Gestational HTN pattern',
          label: 'Hypertension without protein/end-organ (yet)',
          interpretation: 'HTN after 20 weeks without proteinuria, end-organ criteria, or severe-range BP suggests gestational hypertension — monitor closely for progression to preeclampsia.',
          riskLevel: 'moderate',
          details: [
            { label: 'Severe-range BP', value: severeBp ? 'Yes' : 'No' },
            { label: 'Proteinuria', value: protein ? 'Yes' : 'No' },
            ...endOrganDetails,
          ],
        };
      }

      return {
        score: severeFeatures ? 'Preeclampsia with severe features' : 'Preeclampsia (without severe features listed)',
        label: severeFeatures ? 'Preeclampsia with severe features' : 'Preeclampsia',
        interpretation: severeFeatures
          ? severeBp && !protein && !endOrgan
            ? 'Severe-range BP (≥160/110) after 20 weeks is diagnosed and managed as preeclampsia with severe features even without proteinuria or other end-organ criteria (ACOG PB 222) — urgent antihypertensives, MgSO₄ seizure prophylaxis, delivery planning.'
            : 'Meets preeclampsia with severe features on this checklist — urgent obstetric management, antihypertensives for severe-range BP, MgSO₄ seizure prophylaxis as indicated, delivery planning.'
          : 'Meets preeclampsia criteria (HTN + proteinuria and/or end-organ). Manage per gestational age and institutional protocol; watch for severe features.',
        riskLevel: severeFeatures ? 'critical' : 'high',
        details: [
          { label: 'Proteinuria', value: protein ? 'Yes' : 'No' },
          { label: 'End-organ criteria', value: endOrgan ? 'Yes' : 'No' },
          { label: 'Severe-range BP', value: severeBp ? 'Yes' : 'No' },
          ...endOrganDetails,
        ],
      };
    },
    evidence: {
      summary: 'ACOG PB 222: preeclampsia = HTN after 20 weeks + proteinuria OR end-organ dysfunction (platelets, Cr, LFTs, pulmonary edema, neuro/visual symptoms, severe persistent RUQ/epigastric pain). Severe-range BP (≥160/110) is a severe feature; gestational HTN with severe-range BPs is diagnosed and managed as preeclampsia with severe features.',
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
      numberInput('ldh', 'LDH', { unit: 'U/L', min: 50, max: 5000, exampleValue: 400, helpText: 'Tennessee-style hemolysis often uses LDH ≥600 U/L (or bilirubin ≥1.2 mg/dL or schistocytes).' }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, exampleValue: 0.8, helpText: 'Hemolysis support if ≥1.2 mg/dL (Tennessee-style).' }),
      yesNo('schistocytes', 'Schistocytes / hemolysis on smear (if known)', undefined, 'Schistocytes, burr cells, or other hemolysis on the peripheral smear; with elevated LDH and low haptoglobin this supports the hemolysis arm of the triad.', false),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 5000, exampleValue: 40, helpText: 'Tennessee/Sibai elevated LFTs: AST or ALT ≥2× this lab’s ULN (classically ≥70 U/L when ULN ≈35).' }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 5000, exampleValue: 40, helpText: 'Same ≥2× ULN rule as AST. Either enzyme meeting the fold-change counts.' }),
      numberInput('astUln', 'AST/ALT ULN (lab)', { unit: 'U/L', min: 20, max: 80, exampleValue: 35, helpText: 'Enter this lab’s AST/ALT upper limit of normal. Tennessee uses ≥2× ULN (default ULN 35 → threshold 70 U/L, matching classic AST ≥70).' }),
      numberInput('platelets', 'Platelet count', { unit: '×10³/µL', min: 5, max: 600, exampleValue: 150, helpText: 'Tennessee thrombocytopenia: platelets ≤100 ×10⁹/L. Mississippi class: I ≤50, II >50–≤100, III >100–≤150 (if other criteria).' }),
    ],
    calculate(values) {
      const ldh = num(values.ldh, 400);
      const bili = num(values.bili, 0.8);
      const schisto = bool(values.schistocytes);
      const ast = num(values.ast, 40);
      const alt = num(values.alt, 40);
      const uln = num(values.astUln, 35);
      const plt = num(values.platelets, 150);

      const hemolysis = ldh >= 600 || bili >= 1.2 || schisto;
      const elevatedLft = ast >= 2 * uln || alt >= 2 * uln;
      const lowPlt = plt <= 100;

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
            { label: 'Platelets ≤100', value: lowPlt ? 'Yes' : 'No' },
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
            { label: 'Platelets ≤100', value: lowPlt ? 'Yes' : 'No' },
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
      summary: 'Tennessee/Sibai complete HELLP: hemolysis (LDH ≥600 U/L, bilirubin ≥1.2 mg/dL, or schistocytes), AST or ALT ≥2× lab ULN (classically ≥70 U/L), and platelets ≤100 ×10⁹/L. Mississippi classifies by platelet nadir (I ≤50, II >50–≤100, III >100–≤150).',
      validation: 'Clinical diagnosis; smear, haptoglobin, and trends aid hemolysis confirmation.',
      references: [
        { title: 'Syndrome of hemolysis, elevated liver enzymes, and low platelet count: a severe consequence of hypertension in pregnancy', citation: 'Weinstein L. Am J Obstet Gynecol. 1982', year: 1982, pmid: '7055180',
          doi: '10.1016/s0002-9378(16)32330-4', },
        { title: 'Diagnosis and management of hemolysis, elevated liver enzymes, and low platelets syndrome', citation: 'Sibai BM. Clin Perinatol. 2004 (Tennessee and Mississippi classifications)', year: 2004, pmid: '15519429',
          doi: '10.1016/j.clp.2004.06.008', },
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
      numberInput('mg', 'Serum magnesium', {
        unit: 'mg/dL',
        unitKind: 'magnesium',
        min: 1,
        max: 30,
        step: 0.1,
        exampleValue: 6,
        helpText: 'Serum magnesium in the unit your lab reports — the unit selector handles any mEq/L conversion before the comparison. Therapeutic seizure-prophylaxis range is roughly 4.8–8.4 mg/dL.',
      }),
    ],
    calculate(values) {
      const mgDisplay = round(num(values.mg, 6), 1);

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
        { title: 'Magnesium: physiology and pharmacology', citation: 'Fawcett WJ, Haxby EJ, Male DA. Br J Anaesth. 1999 (includes obstetric Mg toxicity ranges)', year: 1999, pmid: '10618948', doi: '10.1093/bja/83.2.302' },
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
      ], 'gap', 'Osmolal gap branch converts the measured gap × 4.6 and ignores the Widmark fields; the drinks branch uses weight, sex, hours, and elimination rate. Only the selected branch is applied.'),
      numberInput('osmGap', 'Osmolal gap (if gap mode)', { unit: 'mOsm/kg', min: 0, max: 200, exampleValue: 20, helpText: 'Measured osm − calculated osm. EtOH (mg/dL) ≈ gap × 4.6 if the gap is entirely ethanol. Other alcohols also raise the gap.' }),
      numberInput('drinks', 'Standard drinks absorbed (if Widmark)', { min: 0, max: 40, step: 0.5, exampleValue: 4, helpText: 'US standard drink ≈ 14 g ethanol. Educational estimate only — not forensic.' }),
      numberInput('weight', 'Body weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 250, exampleValue: 70, helpText: 'Body weight for the Widmark estimate; select lb if needed — the engine converts before the r-factor multiplication.' }),
      selectInput('sex', 'Sex (Widmark r)', [
        { label: 'Male (r ≈ 0.68)', value: 0.68 },
        { label: 'Female (r ≈ 0.55)', value: 0.55 },
      ], 0.68, 'Widmark r factor: approximately 0.68 for men and 0.55 for women, reflecting different total body water fractions.'),
      numberInput('hours', 'Hours since drinking started (metabolism)', { unit: 'h', min: 0, max: 24, step: 0.5, exampleValue: 2, helpText: 'Hours elapsed since drinking began; the estimate subtracts β × hours, so a longer interval lowers the projected level.' }),
      numberInput('beta', 'Elimination rate', { unit: 'mg/dL/h', min: 10, max: 40, exampleValue: 15, helpText: 'Assumed zero-order elimination rate, typically 15–20 mg/dL/h (range 10–40); higher values model a faster metabolizer and lower the estimate.' }),
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
      if (wt <= 0 || rFactor <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Weight and distribution factor must be > 0.',
          riskLevel: 'info' as const,
        };
      }
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
        { title: 'Die theoretischen Grundlagen und die praktische Verwendbarkeit der gerichtlich-medizinischen Alkoholbestimmung', citation: 'Widmark EMP. Berlin: Urban & Schwarzenberg; 1932', year: 1932 },
        { title: 'Prediction of blood alcohol concentrations in human subjects. Updating the Widmark Equation', citation: 'Watson PE, Watson ID, Batt RD. J Stud Alcohol. 1981', year: 1981, pmid: '7289599', doi: '10.15288/jsa.1981.42.547' },
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
      numberInput('hours', 'Time since acute ingestion', { unit: 'hours', min: 4, max: 24, step: 0.5, exampleValue: 4, helpText: 'Nomogram starts at 4 hours after a single acute ingestion. Levels before 4 h cannot be plotted.' }),
      numberInput('level', 'Acetaminophen level', { unit: 'µg/mL (mcg/mL)', min: 0, max: 500, exampleValue: 150, helpText: 'Same as mcg/mL. Treatment (150) line starts at 150 µg/mL at 4 h and halves about every 4 h.' }),
      yesNo('chronicOrUnknown', 'Chronic, staggered, or unknown time (not nomogram-eligible)', null, 'Yes for chronic, staggered, or unknown-time ingestions — the Rumack-Matthew nomogram and its 150 µg/mL treatment line do not apply. Yes switches the tool to a non-nomogram warning.', false),
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

      // Treatment line: 150 µg/mL at 4 h, halves every 4 h (150 × 0.5^((t-4)/4)).
      // The nomogram is not validated beyond 24 hours; clamp late presentations
      // and raise an explicit warning rather than extrapolating the line.
      const nomogramTime = Math.min(t, 24);
      const latePresentation = t > 24;
      const treatLine = 150 * Math.pow(0.5, (nomogramTime - 4) / 4);
      // Probable toxicity line starts ~200 at 4 h (original)
      const probableLine = 200 * Math.pow(0.5, (nomogramTime - 4) / 4);

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
          ' Educational approximation only — plot on a validated nomogram or use institutional toxicology decision tools for treatment.' +
          (latePresentation ? ` Time exceeds 24 hours; line values were clamped to ${nomogramTime} hours because the nomogram is not valid beyond 24 hours.` : ''),
        riskLevel,
        details: [
          { label: 'Approx treatment line', value: `${round(treatLine, 1)} µg/mL` },
          { label: 'Approx probable line', value: `${round(probableLine, 1)} µg/mL` },
          { label: 'Measured level', value: `${level} µg/mL` },
          { label: 'Time', value: latePresentation ? `${t} h (calculation clamped to ${nomogramTime} h)` : `${t} h` },
        ],
        recommendations:
          riskLevel === 'low'
            ? ['Confirm ingestion time', 'LFTs if late presentation']
            : ['Start IV/oral NAC protocol', 'LFTs, INR, chemistry', 'Poison control'],
        alerts: latePresentation
          ? ['Time since ingestion exceeds 24 hours. The Rumack–Matthew nomogram is not valid beyond 24 hours; use late-presentation NAC criteria, AST/ALT/INR, and poison-center guidance rather than relying on this estimate.']
          : undefined,
      };
    },
    evidence: {
      summary: 'Rumack-Matthew: treatment (150) line starts 150 µg/mL at 4 h and declines; NAC if level on/above line for acute single ingestion.',
      formula: 'Treatment line ≈ 150 × 0.5^((hours−4)/4) µg/mL',
      validation: 'Nomogram standard of care; this helper approximates the log-linear line for education.',
      references: [
        { title: 'Acetaminophen poisoning and toxicity', citation: 'Rumack BH, Matthew H. Pediatrics. 1975', year: 1975, pmid: '1134886' },
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
      numberInput('cp', 'Target concentration (Cp)', { unit: 'mg/L', min: 0.01, max: 500, step: 0.1, exampleValue: 20, helpText: 'Keep units consistent: mg/L × L/kg × kg = mg. µg/mL is numerically equal to mg/L.' }),
      numberInput('vd', 'Volume of distribution (Vd)', { unit: 'L/kg', min: 0.05, max: 20, step: 0.05, exampleValue: 0.7, helpText: 'Volume of distribution in L/kg for the specific drug (e.g. ~0.7 for many small molecules, much larger for lipophilic agents); this is the dominant driver of the dose.' }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 1, max: 300, step: 0.1, exampleValue: 70, helpText: 'Dosing weight in kg — choose TBW, IBW, or adjusted body weight per the drug\'s guidance, then select lb if your source value is imperial.' }),
      selectInput('bioavailability', 'Bioavailability (F)', [
        { label: 'IV (F = 1)', value: 1 },
        { label: 'Oral F = 0.8', value: 0.8 },
        { label: 'Oral F = 0.5', value: 0.5 },
      ], 1, 'IV sets F = 1. An oral loading dose must be divided by F (choose 0.8 or 0.5), which raises the dose when absorption is incomplete.'),
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
      references: [
        { title: 'Clinical Pharmacokinetics (first of two parts)', citation: 'Greenblatt DJ, Koch-Weser J. N Engl J Med. 1975', year: 1975, pmid: '1160938', doi: '10.1056/NEJM197510022931406' },
        { title: 'The target concentration approach to clinical drug development', citation: 'Holford NH. Clin Pharmacokinet. 1995 (loading dose = target concentration × Vd)', year: 1995, pmid: '8582116', doi: '10.2165/00003088-199529050-00001' },
      ],
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
      numberInput('dose', 'Desired dose', { unit: 'mcg/kg/min', min: 0.01, max: 200, step: 0.01, exampleValue: 5, helpText: 'Target dose in mcg/kg/min (many vasoactives use 0.01–1; up to 200 for high-dose settings). Rate (mL/h) = dose × weight × 60 ÷ bag concentration.' }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 1, max: 300, step: 0.1, exampleValue: 70, helpText: 'Patient weight in kg for the weight-based dose; select lb if the recorded weight is imperial — the engine converts first.' }),
      numberInput('concentration', 'Drug concentration', { unit: 'mcg/mL', min: 0.1, max: 100000, exampleValue: 1600, helpText: '1 mg/mL = 1000 mcg/mL — unit mismatches are a common serious error. Confirm the bag label.' }),
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
      references: [
        { title: 'Math Calculations (IV infusion rates, dimensional analysis)', citation: 'Open RN. Nursing Skills. NCBI Bookshelf. Chapter 5', year: 2021, url: 'https://www.ncbi.nlm.nih.gov/books/NBK596732/' },
        { title: 'Infusion Therapy Standards of Practice, 8th Edition', citation: 'Gorski LA et al. J Infus Nurs. 2021', year: 2021, pmid: '33394637', doi: '10.1097/NAN.0000000000000396' },
      ],
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
      numberInput('retic', 'Reticulocyte count', { unit: '%', min: 0.1, max: 30, step: 0.1, exampleValue: 2, helpText: 'Corrected retic = retic% × (Hct / normal Hct). RPI = corrected / maturation factor (1–2.5 by Hct). RPI <2 suggests hypoproliferation; ≥3 adequate response.' }),
      numberInput('hct', 'Hematocrit', { unit: '%', min: 5, max: 60, exampleValue: 30, helpText: 'Measured hematocrit in % from the same draw as the reticulocyte percentage; the correction multiplies retic % by Hct ÷ normal Hct.' }),
      numberInput('normalHct', 'Normal Hct reference', { unit: '%', min: 35, max: 50, exampleValue: 45, helpText: 'Reference (normal) hematocrit for the patient\'s sex/age, typically 45% for men and 40% for women; the RPI maturation factor also steps on the measured Hct.' }),
    ],
    calculate(values) {
      const retic = num(values.retic, 2);
      const hct = num(values.hct, 30);
      const normalHct = num(values.normalHct, 45);
      if (normalHct <= 0) {
        return {
          score: '—',
          label: 'Invalid normal Hct',
          interpretation: 'Normal Hct reference must be greater than 0% to calculate corrected reticulocyte count and RPI.',
          riskLevel: 'info' as const,
        };
      }
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
          { label: 'Formula', value: `Corrected = retic × (Hct/${normalHct}); RPI = corrected / maturation` },
        ],
      };
    },
    evidence: {
      summary: 'Corrected retic = retic% × (Hct/45). RPI = corrected / maturation (1–2.5 by Hct). RPI >3 adequate response.',
      formula: 'Corrected retic = retic × (Hct/normalHct); RPI = corrected / maturation factor',
      validation: 'Standard hematology teaching tool.',
      references: [{ title: 'Reticulocytes', citation: 'Bessman JD. In: Walker HK, Hall WD, Hurst JW, eds. Clinical Methods. 3rd ed. Boston: Butterworths; 1990. Chapter 156', year: 1990, pmid: '21250107', url: 'https://www.ncbi.nlm.nih.gov/books/NBK264/' }],
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
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 200, step: 0.1, exampleValue: 6, helpText: 'ALC = WBC × (% lymphocytes / 100). Pediatric reference ranges are age-dependent and higher in infants.' }),
      numberInput('lymphPct', 'Lymphocytes', { unit: '%', min: 0, max: 100, exampleValue: 30, helpText: 'Automated differential lymphocyte percentage (0–100), not the absolute count; ALC = WBC × % ÷ 100.' }),
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
      references: [{ title: 'How to interpret and pursue an abnormal complete blood cell count in adults', citation: 'Tefferi A, Hanson CA, Inwards DJ. Mayo Clin Proc. 2005', year: 2005, pmid: '16007898', doi: '10.4065/80.7.923' }],
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
      numberInput('weight', 'Body weight', { unit: 'kg', unitKind: 'weight', min: 20, max: 300, exampleValue: 70, helpText: 'Na deficit (mEq) = TBW × (desired − actual). Guides total replacement, not rate. Typical limit ≤8–10 mEq/L in 24 h if chronic.' }),
      numberInput('na', 'Current serum Na', { unit: 'mEq/L', min: 90, max: 140, exampleValue: 120, helpText: 'Current serum sodium in mEq/L; the deficit is zero (or negative, and not displayed) when the measured Na is already at or above the desired value.' }),
      numberInput('goalNa', 'Desired Na', { unit: 'mEq/L', min: 120, max: 140, exampleValue: 130, helpText: 'Desired serum sodium in mEq/L, commonly 130–140 depending on symptoms and chronicity; the goal sets the (goal − current) gap and therefore the whole deficit.' }),
      selectInput('tbw', 'TBW fraction', [
        { label: 'Young men (0.6)', value: 'young-men' },
        { label: 'Young women / elderly men (0.5)', value: 'young-women-elderly-men' },
        { label: 'Elderly women (0.45)', value: 'elderly-women' },
        { label: 'Children approx (0.6)', value: 'children' },
      ], 'young-men', 'Total body water fraction used to scale body weight: about 0.6 for young men, 0.5 for young women or elderly men, 0.45 for elderly women, 0.6 for children.'),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const na = num(values.na, 120);
      const goal = num(values.goalNa, 130);
      const tbwFractions: Record<string, number> = {
        'young-men': 0.6,
        'young-women-elderly-men': 0.5,
        'elderly-women': 0.45,
        children: 0.6,
      };
      const f = tbwFractions[String(values.tbw)] ?? num(values.tbw, 0.5);
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
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 26, max: 60, exampleValue: 36, helpText: 'Expected PaCO₂ ≈ 0.7 × HCO₃ + 20 (±5). Compensation rarely raises PCO₂ above ~55–60 mmHg.' }),
      numberInput('paco2', 'Measured PaCO₂', { unit: 'mmHg', min: 20, max: 100, exampleValue: 45, helpText: 'Measured arterial PaCO₂ in mmHg; expected PaCO₂ = 0.7 × HCO₃⁻ + 20 (roughly ±5), so a value below that range indicates a concurrent respiratory alkalosis.' }),
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
      numberInput('na', 'Measured sodium', { unit: 'mEq/L', min: 100, max: 180, exampleValue: 128, helpText: 'Na_corrected = Na_measured + factor × (glucose − 100)/100. Katz 1.6 is classic; Hillier 2.4 may be more accurate at very high glucose.' }),
      numberInput('glu', 'Serum glucose', { unit: 'mg/dL', min: 100, max: 2000, exampleValue: 500, helpText: 'Serum glucose in mg/dL from the same draw as the sodium; only the amount above 100 mg/dL drives the correction.' }),
      selectInput('factor', 'Correction factor per 100 mg/dL glucose >100', [
        { label: '1.6 (Katz classic)', value: 1.6 },
        { label: '2.4 (Hillier)', value: 2.4 },
      ], 2.4, 'Correction factor per 100 mg/dL of glucose above 100: 1.6 (Katz, classic) or 2.4 (Hillier, better with glucose >400). Higher glucose and the 2.4 factor give a larger corrected sodium.'),
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
        { title: 'Hyperglycemia-induced hyponatremia—calculation of expected serum sodium depression', citation: 'Katz MA. N Engl J Med. 1973', year: 1973, pmid: '4763428',
          doi: '10.1056/NEJM197310182891607', },
        { title: 'Hyponatremia: evaluating the correction factor for hyperglycemia', citation: 'Hillier TA et al. Am J Med. 1999', year: 1999, pmid: '10225241',
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
      numberInput('lmpYear', 'LMP year', { min: 2020, max: 2035, exampleValue: 2026, helpText: 'Calendar year of the first day of the last menstrual period; enter the LMP date even when the cycle was irregular — the cycle-length field adjusts the EDD.' }),
      numberInput('lmpMonth', 'LMP month', { min: 1, max: 12, exampleValue: 1, helpText: 'Calendar month (1–12) of the last menstrual period\'s first day.' }),
      numberInput('lmpDay', 'LMP day', { min: 1, max: 31, exampleValue: 15, helpText: 'Day of month of the first day of the last menstrual period (not the last day of bleeding).' }),
      numberInput('refYear', 'Reference (today) year', { min: 2020, max: 2035, exampleValue: 2026, helpText: 'Year of the date you are calculating for (today\'s date), used to report current gestational age.' }),
      numberInput('refMonth', 'Reference month', { min: 1, max: 12, exampleValue: 7, helpText: 'Month (1–12) of the reference date used for the gestational-age calculation.' }),
      numberInput('refDay', 'Reference day', { min: 1, max: 31, exampleValue: 27, helpText: 'Day of month (1–31) of the reference date; gestational age is computed from the day count between LMP and this date.' }),
      numberInput('cycleLength', 'Cycle length', { unit: 'days', min: 21, max: 45, exampleValue: 28, helpText: 'EDD shifts by (cycle − 28) days. First-trimester ultrasound is preferred if LMP is uncertain.' }),
    ],
    calculate(values) {
      const lmp = new Date(num(values.lmpYear, new Date().getFullYear()), num(values.lmpMonth) - 1, num(values.lmpDay));
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
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 200, exampleValue: 120, helpText: 'Height in centimeters (not inches). Traub-Johnson: IBW (kg) = 2.396 × e^(0.01863 × height_cm). Not for infants.' }),
      selectInput('method', 'Method', [
        { label: 'Traub-Johnson (preferred here)', value: 'tj' },
        { label: 'Simple BMI-method at BMI 50th≈18 (approx)', value: 'bmi18' },
      ], 'tj', 'Traub-Johnson is the height-based pediatric equation used here; the BMI-method option approximates IBW as height² × 18 (a 50th-percentile BMI), which diverges in toddlers.'),
      numberInput('actualWt', 'Actual weight (optional, for %IBW)', { unit: 'kg', unitKind: 'weight', min: 0, max: 200, step: 0.1, exampleValue: 0, required: false, helpText: 'Optional measured weight in kg; adding it lets the tool report percent IBW, which many pediatric formularies use to pick between TBW, IBW, and adjusted body weight.' }),
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
        { title: 'Estimating ideal body mass in children', citation: 'Traub SL, Kichen L. Am J Hosp Pharm. 1983', year: 1983, pmid: '6823980' },
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
        { label: 'None (0)', value: 0, description: 'No excessive high-pitched cry this interval' },
        { label: 'Excessive (2)', value: 2, description: 'Excessive high-pitched cry — hard to console' },
        { label: 'Continuous (3)', value: 3, description: 'Continuous high-pitched cry throughout the interval or >5 min despite consoling' },
      ], 0, 'Score ~q3–4 h after feeding; observe this scoring interval (not a single glance). Excessive = high-pitched and hard to console; continuous = throughout the interval or >5 min despite consoling.'),
      selectInput('sleep', 'Sleeps after feeding', [
        { label: 'Normal (0)', value: 0, description: 'Sleeps ≥3 h after feeding' },
        { label: '<3 h (1)', value: 1, description: 'Longest sleep after a feed is 2–3 h' },
        { label: '<2 h (2)', value: 2, description: 'Longest sleep after a feed is 1–2 h' },
        { label: '<1 h (3)', value: 3, description: 'Longest sleep after a feed is <1 h' },
      ], 0, 'Longest sleep after a feed during this scoring interval.'),
      selectInput('moro', 'Moro reflex', [
        { label: 'Normal (0)', value: 0, description: 'Symmetric Moro without jittery overflow' },
        { label: 'Hyperactive (2)', value: 2, description: 'Jittery hands/feet during Moro with some rest between beats' },
        { label: 'Markedly hyperactive (3)', value: 3, description: 'Marked jitteriness during Moro without rest' },
      ], 0, 'Elicit a Moro (head drop or startle). Hyperactive = jittery hands/feet during Moro with some rest; markedly = jitteriness without rest.'),
      selectInput('tremors', 'Tremors', [
        { label: 'None (0)', value: 0, description: 'No tremors when disturbed or at rest this interval' },
        { label: 'Mild when disturbed (1)', value: 1, description: 'Hands or feet only, when disturbed' },
        { label: 'Mod–severe when disturbed (2)', value: 2, description: 'Arms or legs when disturbed' },
        { label: 'Mild undisturbed (3)', value: 3, description: 'Hands or feet, at rest' },
        { label: 'Mod–severe undisturbed (4)', value: 4, description: 'Arms or legs, at rest' },
      ], 0, 'Mild = hands or feet only; moderate–severe = arms or legs. Disturbed = after handling; undisturbed = at rest.'),
      yesNo('increasedTone', 'Increased muscle tone', 2, 'Resistance to passive ROM and/or head lag as on the local FNAST card.', false),
      yesNo('excoriation', 'Excoriation', 1, 'Skin breakdown from rubbing (chin, nose, elbows, knees, toes) — not diaper dermatitis.', false),
      yesNo('myoclonic', 'Myoclonic jerks', 3, 'Twitching of a muscle group this interval — not a full seizure.', false),
      yesNo('convulsions', 'Convulsions', 5, 'Generalized or focal seizure activity this interval.', false),
      yesNo('sweating', 'Sweating', 1, 'Sweat on the brow or upper lip not explained by overheating.', true),
      yesNo('feverLow', 'Fever 37.2–38.3°C', 1, 'Axillary temperature 37.2–38.3°C during this interval.', false),
      yesNo('feverHigh', 'Fever >38.3°C', 2, 'Axillary temperature >38.3°C. Do not double-count with the 37.2–38.3 item.', false),
      yesNo('yawning', 'Frequent yawning (>3–4)', 1, '>3–4 yawns during this scoring interval.', true),
      yesNo('mottling', 'Mottling', 1, 'Mottled skin not explained by a cold environment.', false),
      yesNo('nasalStuff', 'Nasal stuffiness', 1, 'Nasal congestion with noisy nasal breathing this interval.', true),
      yesNo('sneezing', 'Sneezing (>3–4)', 1, '>3–4 sneezes during this scoring interval.', true),
      yesNo('nasalFlaring', 'Nasal flaring', 2, 'Alae nasi flare with inspiration this interval.', false),
      selectInput('rr', 'Respiratory rate', [
        { label: '≤60 (0)', value: 0, description: 'RR ≤60/min over a full minute' },
        { label: '>60 (1)', value: 1, description: 'RR >60/min without retractions' },
        { label: '>60 with retractions (2)', value: 2, description: 'RR >60/min AND intercostal/subcostal retractions' },
      ], 0, 'Count over a full minute during this interval. Score 2 only if RR >60 AND retractions.'),
      yesNo('excessiveSucking', 'Excessive sucking', 1, 'Frantic rooting or sucking of fists out of proportion to hunger this interval.', true),
      yesNo('poorFeeding', 'Poor feeding', 2, 'Uncoordinated suck/swallow, refuses feed, or takes a long time to feed this interval.', false),
      yesNo('regurgitation', 'Regurgitation', 2, '≥2 episodes of regurgitation this interval (not projectile).', false),
      yesNo('projectile', 'Projectile vomiting', 3, 'Vomitus projected a distance from the mouth this interval.', false),
      selectInput('stools', 'Stools', [
        { label: 'Normal (0)', value: 0, description: 'Formed or usual stool for this infant' },
        { label: 'Loose (2)', value: 2, description: 'Loose, curdy, or seedy stools (not watery)' },
        { label: 'Watery (3)', value: 3, description: 'Watery stools, explosive, or leaving a water ring' },
      ], 0, 'Score the worst stool this interval. Loose vs watery as on the local FNAST card.'),
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
        (bool(values.feverHigh) ? 2 : bool(values.feverLow) ? 1 : 0) +
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
        { title: 'Neonatal abstinence syndrome: assessment and management', citation: 'Finnegan LP et al. Addict Dis. 1975', year: 1975, pmid: '1163358' },
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
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, exampleValue: 40, helpText: 'UAG = UNa + UK − UCl. Negative suggests high NH₄⁺ (e.g. diarrhea); positive suggests low NH₄⁺ (RTA) in NAGMA.' }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 1, max: 200, exampleValue: 20, helpText: 'Spot urine potassium in mEq/L from the same specimen as the urine Na and Cl; UAG = UNa + UK − UCl.' }),
      numberInput('ucl', 'Urine Cl', { unit: 'mEq/L', min: 1, max: 300, exampleValue: 60, helpText: 'Spot urine chloride in mEq/L from the same specimen; a negative UAG flags adequate ammonium excretion (e.g. diarrhea) whereas a positive UAG suggests distal RTA.' }),
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
        { title: 'The use of the urinary anion gap in the diagnosis of hyperchloremic metabolic acidosis', citation: 'Batlle DC et al. N Engl J Med. 1988', year: 1988, pmid: '3344005',
          doi: '10.1056/NEJM198803103181002', },
      ],
    },
    nextSteps: [
      { condition: 'Positive UAG + NAGMA', actions: ['Check urine pH', 'Evaluate for RTA types', 'K, Ca, growth (peds), autoimmune workup as indicated'] },
      { condition: 'Negative UAG + NAGMA', actions: ['GI loss evaluation', 'Volume and K repletion'] },
    ],
    pearls: ['Not useful for high anion gap acidosis interpretation.', 'Volume depletion with low UNa can confound.'],
  },
];
