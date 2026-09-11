import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

function saps3Age(a: number): number {
  if (a < 40) return 0;
  if (a < 60) return 5;
  if (a < 70) return 9;
  if (a < 75) return 13;
  if (a < 80) return 15;
  return 18;
}

function saps3Mortality(score: number): number {
  const s = Math.max(0, score);
  const logit = -32.6659 + Math.log(s + 20.5958) * 7.3068;
  const p = Math.exp(logit) / (1 + Math.exp(logit));
  return round(Math.max(0, Math.min(100, p * 100)), 1);
}

/** Wave 7 P3 fill-ins plus KFRE-8 and other upgrades shipped as new IDs. */
export const wave7FillinsCalcs: Calculator[] = [
  // ─── 1. KFRE 8-variable ────────────────────────────────────────────────────
  {
    id: 'kfre-8',
    name: 'Kidney Failure Risk Equation (KFRE 8-Variable)',
    shortName: 'KFRE-8',
    description:
      'Tangri 8-variable kidney failure risk (age, sex, eGFR, ACR, albumin, phosphorus, bicarbonate, calcium) — educational 2- and 5-year estimates using North America–style baseline survival.',
    category: 'nephrology',
    tags: ['kfre', 'ckd', 'prognosis', 'esrd', 'tangri', 'albuminuria', '8-variable'],
    whenToUse: 'Adults with CKD (typically eGFR <60) when calcium, phosphorus, bicarbonate, and albumin are available in addition to the 4-variable KFRE inputs.',
    whyUse:
      'The 8-variable model modestly improves discrimination over 4-variable KFRE by incorporating CKD-MBD and nutritional labs. Guides referral urgency and kidney-replacement planning.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 65 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 90, defaultValue: 45 }),
      numberInput('acr', 'Urine ACR', {
        unit: 'mg/g',
        min: 0.1,
        max: 10000,
        step: 0.1,
        defaultValue: 30,
        helpText: 'Albumin/creatinine ratio; convert mg/mmol × 8.84 ≈ mg/g',
      }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 4.0, helpText: 'Use g/dL (g/L ÷ 10). Lower albumin raises predicted kidney-failure risk in the 8-variable model.' }),
      numberInput('phosphorus', 'Serum phosphorus', { unit: 'mg/dL', min: 1, max: 12, step: 0.1, defaultValue: 3.9, helpText: 'Use mg/dL (mmol/L × 3.1 ≈ mg/dL). Higher phosphorus raises predicted risk.' }),
      numberInput('bicarbonate', 'Serum bicarbonate', { unit: 'mEq/L', min: 8, max: 40, step: 0.1, defaultValue: 25, helpText: 'Lower bicarbonate (acidosis) raises predicted kidney-failure risk.' }),
      numberInput('calcium', 'Serum calcium', { unit: 'mg/dL', min: 5, max: 15, step: 0.1, defaultValue: 9.4, helpText: 'Use mg/dL (mmol/L × 4 ≈ mg/dL). Lower calcium raises predicted risk.' }),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const egfr = Math.max(num(values.egfr, 45), 1);
      const acr = Math.max(num(values.acr, 30), 0.1);
      const alb = num(values.albumin, 4);
      const phos = num(values.phosphorus, 3.9);
      const hco3 = num(values.bicarbonate, 25);
      const ca = num(values.calcium, 9.4);
      // Tangri 2011 8-variable coefficients, development-cohort centering (JAMA 2011 / 2016)
      const lp =
        -0.1992 * (age / 10 - 7.036) +
        0.1602 * (male - 0.5642) +
        -0.4919 * (egfr / 5 - 7.222) +
        0.3364 * (Math.log(acr) - 5.137) +
        -0.3444 * (alb - 3.997) +
        0.2604 * (phos - 3.916) +
        -0.0494 * (hco3 - 25.57) +
        -0.1474 * (ca - 9.355);
      const expLp = Math.exp(Math.max(-20, Math.min(20, lp)));
      const risk2 = round((1 - Math.pow(0.975, expLp)) * 100, 1);
      const risk5 = round((1 - Math.pow(0.9365, expLp)) * 100, 1);
      const primary = risk5;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Lower 5-year kidney failure risk';
      let interpretation = '';
      if (primary >= 50) {
        riskLevel = 'critical';
        label = 'Very high 5-year risk';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk of treated kidney failure (educational NA-style 8-variable KFRE). Urgent nephrology planning, RRT education, and access pathway as appropriate.`;
      } else if (primary >= 20) {
        riskLevel = 'high';
        label = 'High 5-year risk (≥20%)';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Many systems use ≥3–5% 5-year (or ≥10–20% bands) to prioritize specialty care — confirm local referral thresholds.`;
      } else if (primary >= 5) {
        riskLevel = 'moderate';
        label = 'Intermediate 5-year risk';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Optimize BP, RASi/SGLT2i as indicated, ACR control, CKD-MBD, acidosis, and nephrology co-management.`;
      } else {
        riskLevel = 'low';
        label = 'Lower 5-year risk (<5%)';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Continue CKD care, risk-factor control, and periodic re-estimation as labs change.`;
      }
      return {
        score: primary,
        unit: '% (5-year)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: '2-year risk (est.)', value: `${risk2}%` },
          { label: '5-year risk (est.)', value: `${risk5}%` },
          { label: 'eGFR', value: `${egfr} mL/min/1.73 m²` },
          { label: 'ACR', value: `${acr} mg/g` },
          { label: 'Albumin / phosphorus', value: `${alb} g/dL / ${phos} mg/dL` },
          { label: 'Bicarbonate / calcium', value: `${hco3} mEq/L / ${ca} mg/dL` },
          { label: 'Model', value: '8-variable Tangri (educational NA baseline S₀ 2y 0.975, 5y 0.9365)' },
        ],
        recommendations: [
          'Regional KFRE calibrations (North America vs non-NA) differ — use local/official tool when available for counseling.',
          'Not for AKI or rapidly changing labs.',
        ],
      };
    },
    evidence: {
      summary:
        '8-variable KFRE adds serum albumin, phosphorus, bicarbonate, and calcium to age, sex, eGFR, and ln(ACR). Coefficients from Tangri 2011; variables centered on the development-cohort means. Educational NA-style baseline survivals 2-year 0.975 and 5-year 0.9365 (same S₀ family as the 4-variable tool in this app).',
      formula:
        'LP = −0.1992(age/10−7.036)+0.1602(male−0.5642)−0.4919(eGFR/5−7.222)+0.3364(ln ACR−5.137)−0.3444(alb−3.997)+0.2604(phos−3.916)−0.0494(HCO₃−25.57)−0.1474(Ca−9.355); Risk = 1 − S₀^exp(LP)',
      validation:
        'Tangri et al. JAMA 2011 (development) and JAMA 2016 (multinational). 8-variable improvement over 4-variable is modest; 4-variable is more widely implemented. Educational — prefer official regional calculator for formal counseling.',
      references: [
        {
          title: 'A predictive model for progression of chronic kidney disease to kidney failure',
          citation: 'Tangri N et al. JAMA. 2011',
          year: 2011,
          pmid: '21482743',
          doi: '10.1001/jama.2011.451',
        },
        {
          title: 'Multinational assessment of accuracy of equations for predicting risk of kidney failure',
          citation: 'Tangri N et al. JAMA. 2016',
          year: 2016,
          pmid: '26757465',
          doi: '10.1001/jama.2015.18202',
        },
      ],
    },
    nextSteps: [
      { condition: '5-year risk ≥3–5% (local policy)', actions: ['Nephrology referral', 'CKD education', 'CVD risk reduction', 'Treat acidosis/CKD-MBD'] },
      { condition: '2-year risk >40% or eGFR-based KRT prep criteria', actions: ['RRT modality education', 'Anemia/CKD-MBD/acidosis management', 'Access planning if appropriate'] },
    ],
    pearls: [
      'ACR must be in mg/g (or convert carefully from mg/mmol). Calcium/phosphorus in mg/dL; bicarbonate in mEq/L; albumin in g/dL.',
      'Low albumin, high phosphorus, low bicarbonate, and low calcium each raise predicted kidney-failure risk.',
      '4-variable KFRE is sufficient when mineral labs are missing.',
    ],
  },

  // ─── 3. 4PEPS ──────────────────────────────────────────────────────────────
  {
    id: 'peps-4',
    name: '4-Level Pulmonary Embolism Probability Score (4PEPS)',
    shortName: '4PEPS',
    description:
      'Roy 2021 four-level pretest probability score for suspected PE. Very low (<0) may rule out PE without testing; higher bands guide D-dimer vs imaging.',
    category: 'pulmonary',
    tags: ['pe', '4peps', 'vte', 'pretest probability', 'd-dimer', 'roy'],
    whenToUse: 'Adults with suspected pulmonary embolism in the ED or clinic when choosing D-dimer vs imaging.',
    whyUse:
      '4PEPS defines four pretest bands (very low / low / moderate / high) and can reduce imaging versus dichotomous Wells/Geneva strategies when applied as published.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 55, helpText: '<50: −2; 50–64: −1; ≥65: 0' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 2 },
      ]),
      yesNo('crd', 'Chronic respiratory disease', -1, 'COPD, asthma, ILD, or other chronic lung disease. Scored −1 because it offers an alternate explanation for dyspnea — not a PE risk factor.'),
      yesNo('hr80', 'Heart rate <80 /min', -1, 'HR <80 at assessment (protective / −1). Use the pulse you would record for pretest probability, not a later treated rate.'),
      yesNo('chestDyspnea', 'Chest pain AND acute dyspnea', 1, 'Both chest pain and acute dyspnea must be present. Isolated chest pain or isolated dyspnea does not score.'),
      yesNo('hormone', 'Hormonal estrogenic treatment', 2, 'Estrogen-containing OCP, HRT, or other estrogenic therapy at the time of assessment.'),
      yesNo('priorVte', 'Personal history of VTE', 2),
      yesNo('syncope', 'Syncope', 2, 'Transient loss of consciousness with spontaneous recovery attributed to this presentation (not a remote faint).'),
      yesNo('immobility', 'Immobility within the last 4 weeks (surgery, lower-limb plaster, or bedridden >3 days)', 2),
      yesNo('spo2', 'Pulse oxygen saturation <95%', 3),
      yesNo('calf', 'Calf pain and/or unilateral lower-limb edema', 3, 'Calf pain and/or asymmetric swelling/edema of one lower limb (4PEPS DVT-sign item).'),
      yesNo('peLikely', 'PE is the most likely diagnosis', 5, 'Clinician gestalt: PE is more likely than the next competing diagnosis.'),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const agePts = age < 50 ? -2 : age < 65 ? -1 : 0;
      const score =
        agePts +
        (str(values.sex, 'F') === 'M' ? 2 : 0) +
        (bool(values.crd) ? -1 : 0) +
        (bool(values.hr80) ? -1 : 0) +
        (bool(values.chestDyspnea) ? 1 : 0) +
        (bool(values.hormone) ? 2 : 0) +
        (bool(values.priorVte) ? 2 : 0) +
        (bool(values.syncope) ? 2 : 0) +
        (bool(values.immobility) ? 2 : 0) +
        (bool(values.spo2) ? 3 : 0) +
        (bool(values.calf) ? 3 : 0) +
        (bool(values.peLikely) ? 5 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';
      if (score < 0) {
        riskLevel = 'low';
        label = 'Very low pretest probability (<0)';
        interpretation = `4PEPS ${score}: very low clinical probability (<2% in derivation). PE can be ruled out without D-dimer or imaging in the published strategy — still use clinical judgment.`;
      } else if (score <= 5) {
        riskLevel = 'low';
        label = 'Low pretest probability (0–5)';
        interpretation = `4PEPS ${score}: low probability (≈2–20%). PE may be ruled out if D-dimer <1.0 µg/mL (FEU); otherwise image.`;
      } else if (score <= 12) {
        riskLevel = 'moderate';
        label = 'Moderate pretest probability (6–12)';
        interpretation = `4PEPS ${score}: moderate probability (≈20–65%). PE may be ruled out if D-dimer is below 0.5 µg/mL or the age-adjusted cutoff (age × 0.01 µg/mL if age >50); otherwise image.`;
      } else {
        riskLevel = 'high';
        label = 'High pretest probability (≥13)';
        interpretation = `4PEPS ${score}: high probability (>65%). Proceed to imaging without using D-dimer to rule out PE.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age points', value: `${agePts} (age ${age})` },
          { label: 'Band', value: score < 0 ? 'Very low' : score <= 5 ? 'Low' : score <= 12 ? 'Moderate' : 'High' },
        ],
        recommendations: [
          'Apply locally agreed PE diagnostic pathways (YEARS, AGE-adjusted D-dimer, PERC) as complementary, not mixed ad hoc',
          'Hemodynamically unstable suspected PE → resuscitation and imaging/therapy per ESC, not 4PEPS delay',
        ],
      };
    },
    evidence: {
      summary:
        '4PEPS (Roy et al. JAMA Cardiol 2021): age <50 −2, age 50–64 −1, chronic respiratory disease −1, HR <80 −1, chest pain AND acute dyspnea +1, male +2, estrogen +2, prior VTE +2, syncope +2, immobility 4 wk +2, SpO₂ <95% +3, calf pain/edema +3, PE most likely +5. Bands: <0 very low, 0–5 low, 6–12 moderate, ≥13 high.',
      formula: 'Sum of 13 weighted items (range typically −6 to ~25)',
      validation: 'Derived in 5588 patients and validated in two external cohorts; reduced imaging versus other strategies in retrospective application. Prospective outcome studies ongoing.',
      references: [
        {
          title: 'Derivation and Validation of a 4-Level Clinical Pretest Probability Score for Suspected Pulmonary Embolism to Safely Decrease Imaging Testing',
          citation: 'Roy PM et al. JAMA Cardiol. 2021',
          year: 2021,
          pmid: '33656522',
          doi: '10.1001/jamacardio.2021.0064',
        },
      ],
    },
    nextSteps: [
      { condition: '4PEPS <0', actions: ['Consider ruling out PE without testing if the published very-low strategy is accepted locally', 'Seek alternate diagnosis'] },
      { condition: '4PEPS 0–5', actions: ['D-dimer; if <1.0 µg/mL FEU, PE ruled out in the 4PEPS strategy', 'Image if D-dimer elevated'] },
      { condition: '4PEPS 6–12', actions: ['D-dimer with age-adjusted cutoff', 'CTPA/VQ if above cutoff'] },
      { condition: '4PEPS ≥13', actions: ['Diagnostic imaging without D-dimer rule-out', 'Risk-stratify confirmed PE (sPESI/ESC)'] },
    ],
    pearls: [
      'Chronic respiratory disease is −1 (protective against PE as the explanation), not a positive PE risk item.',
      'Chest pain scores only when paired with acute dyspnea.',
      'Very-low band is unique to 4PEPS versus three-level Wells/Geneva.',
    ],
  },

  // ─── 4. AIN risk (educational) ─────────────────────────────────────────────
  {
    id: 'ain-risk',
    name: 'Acute Interstitial Nephritis Clinical Likelihood (Educational)',
    shortName: 'AIN risk',
    description:
      'Educational bedside likelihood score for drug-induced acute interstitial nephritis versus other AKI. Biopsy remains the gold standard; urine eosinophils are not reliable.',
    category: 'nephrology',
    tags: ['ain', 'atin', 'aki', 'ppi', 'nsaid', 'pyuria', 'moledina'],
    whenToUse: 'AKI of unclear cause when drug-induced AIN is in the differential (PPI, antibiotics, NSAIDs, checkpoint inhibitors).',
    whyUse:
      'Classic triad (fever, rash, eosinophilia) is insensitive. Culprit drugs, sterile pyuria, and WBC casts raise likelihood and help decide about biopsy versus watchful withdrawal.',
    inputs: [
      yesNo('ppi', 'Current PPI', 2, 'Currently taking a proton-pump inhibitor (omeprazole, pantoprazole, etc.) — a leading contemporary AIN culprit.'),
      yesNo('abx', 'Culprit antibiotic (e.g., beta-lactam, fluoroquinolone, sulfa)', 2),
      yesNo('nsaid', 'NSAID exposure', 2),
      yesNo('pyuria', 'Sterile pyuria (WBCs on microscopy, no infection)', 2, 'WBCs on urine microscopy with negative culture (or no clinical UTI).'),
      yesNo('wbcCasts', 'WBC casts', 3, 'White-cell casts on microscopy (not hyaline casts).'),
      yesNo('rash', 'Drug rash', 1, 'Morbilliform or hypersensitivity rash attributed to the culprit drug (classic triad item — insensitive).'),
      yesNo('fever', 'Fever attributed to drug hypersensitivity', 1, 'Fever not explained by the original infection once it is treated, attributed to drug hypersensitivity.'),
      yesNo('eos', 'Peripheral eosinophilia (AEC ≥500/µL or ≥5%)', 1),
      numberInput('duration', 'Duration of culprit-drug exposure', {
        unit: 'days',
        min: 0,
        max: 180,
        defaultValue: 14,
        helpText: '<3 d: 0; 3–7 d: +1; ≥8 d: +2 (latency is typical for AIN)',
      }),
    ],
    calculate(values) {
      const duration = num(values.duration, 14);
      const durPts = duration < 3 ? 0 : duration < 8 ? 1 : 2;
      const score =
        (bool(values.ppi) ? 2 : 0) +
        (bool(values.abx) ? 2 : 0) +
        (bool(values.nsaid) ? 2 : 0) +
        (bool(values.pyuria) ? 2 : 0) +
        (bool(values.wbcCasts) ? 3 : 0) +
        (bool(values.rash) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.eos) ? 1 : 0) +
        durPts;
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower AIN likelihood',
          interpretation: `Educational AIN score ${score}. Fewer classic or drug/urine clues — still consider AIN if a culprit drug is present, but ATN/prerenal/other diagnoses remain more likely. Do not use urine eosinophils to rule out AIN.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate AIN likelihood',
          interpretation: `Educational AIN score ${score}. Intermediate likelihood. Stop culprit drugs (PPI/abx/NSAID) if feasible, monitor recovery, and discuss nephrology/biopsy if AKI persists.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Higher AIN likelihood',
          interpretation: `Educational AIN score ${score}. Higher clinical likelihood of AIN. Withdraw offenders, involve nephrology early, and consider kidney biopsy — histology is the reference standard. Corticosteroids are individualized after diagnosis.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Culprit drugs', value: `PPI ${bool(values.ppi) ? 'Y' : 'N'}; abx ${bool(values.abx) ? 'Y' : 'N'}; NSAID ${bool(values.nsaid) ? 'Y' : 'N'}` },
          { label: 'Urine', value: `Pyuria ${bool(values.pyuria) ? 'Y' : 'N'}; WBC casts ${bool(values.wbcCasts) ? 'Y' : 'N'}` },
          { label: 'Exposure duration points', value: `${durPts} (${duration} d)` },
        ],
        recommendations: [
          'Urine eosinophils are neither sensitive nor specific — do not use them to decide biopsy',
          'Checkpoint-inhibitor AIN may present later and without the classic triad',
        ],
      };
    },
    evidence: {
      summary:
        'Educational weighted checklist inspired by drug-induced AIN epidemiology and Moledina diagnostic-model work: PPI/antibiotic/NSAID each +2, sterile pyuria +2, WBC casts +3, rash/fever/eosinophilia +1 each, exposure duration bands +0/1/2. Not the EHR logistic model (creatinine, BUN/Cr, dipstick).',
      formula: 'Sum of weighted clinical items (educational)',
      validation:
        'Classic triad is present in a minority of biopsy-proven AIN. Moledina et al. developed an EHR model (NDT 2022) with different variables; this bedside score is educational only. Biopsy is gold standard.',
      references: [
        {
          title: 'Development and external validation of a diagnostic model for biopsy-proven acute interstitial nephritis using electronic health record data',
          citation: 'Moledina DG et al. Nephrol Dial Transplant. 2022;37(11):2214-2222',
          year: 2022,
          pmid: '34865148',
          doi: '10.1093/ndt/gfab346',
        },
        {
          title: 'Drug-induced acute interstitial nephritis',
          citation: 'Moledina DG, Perazella MA. Clin J Am Soc Nephrol. 2017',
          year: 2017,
          pmid: '28893923',
          doi: '10.2215/CJN.07630717',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any suspected AIN', actions: ['Stop culprit drugs', 'Avoid further nephrotoxins', 'Nephrology input'] },
      { condition: 'Intermediate–high score or non-recovering AKI', actions: ['Discuss kidney biopsy', 'Do not rely on urine eosinophils', 'Consider steroids only after diagnosis/specialist advice'] },
    ],
    pearls: [
      'Biopsy is the gold standard; urine eosinophils are not reliable.',
      'PPIs are a leading contemporary cause and may lack fever/rash.',
      'WBC casts and sterile pyuria are more useful than the hypersensitivity triad.',
    ],
  },

  // ─── 5. MAPS (educational HCM prognostic) ──────────────────────────────────
  {
    id: 'maps-mayo',
    name: 'HCM Prognostic Risk (Educational MAPS-style)',
    shortName: 'MAPS-HCM',
    description:
      'Educational 5-year sudden-death / HCM-death estimate using Mayo-style clinical markers (age, NYHA, syncope, family SCD, LVH, NSVT, EF, LA size, obstruction, AF, LGE). Not the official Mayo HCM or ESC HCM Risk-SCD calculator.',
    category: 'cardiology',
    tags: ['hcm', 'scd', 'icd', 'mayo', 'maps', 'prognosis', 'educational'],
    whenToUse: 'Adults with hypertrophic cardiomyopathy when counseling about SCD modifiers before using an official risk tool.',
    whyUse:
      'Lists the major SCD and mortality markers used in Mayo/AHA pathways and ESC HCM Risk-SCD. Official calculators (ESC HCM Risk-SCD; Mayo HCM SCD strategy) should drive ICD decisions.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 90, defaultValue: 50 }),
      selectInput('nyha', 'NYHA class', [
        { label: 'I', value: 1, description: 'No limitation of ordinary physical activity' },
        { label: 'II', value: 2, description: 'Slight limitation of ordinary activity (dyspnea/fatigue with ordinary exertion)' },
        { label: 'III', value: 3, description: 'Marked limitation; comfortable only at rest' },
        { label: 'IV', value: 4, description: 'Symptoms at rest; any activity increases discomfort' },
      ]),
      yesNo('syncope', 'Unexplained syncope', null, 'Unexplained TLOC judged not neurally mediated (not vasovagal). ESC treats recent syncope (often ≤6 months) as the high-impact marker.'),
      yesNo('famScd', 'Family history of SCD attributed to HCM', null, 'SCD in ≥1 first-degree relative <40 years, or SCD at any age in a first-degree relative with documented HCM.'),
      numberInput('lvh', 'Maximal LV wall thickness', { unit: 'mm', min: 13, max: 40, defaultValue: 20, helpText: 'Massive LVH typically ≥30 mm' }),
      yesNo('nsvt', 'NSVT on ambulatory ECG', null, '≥3 consecutive ventricular beats at ≥120 bpm lasting <30 s (ESC HCM Risk-SCD definition).'),
      numberInput('ef', 'LVEF', { unit: '%', min: 15, max: 80, defaultValue: 65, helpText: 'EF <50% is an AHA major SCD risk modifier (HCM end-stage phenotype) even when numeric risk estimates are modest.' }),
      numberInput('la', 'Left atrial diameter (or equivalent LA size)', { unit: 'mm', min: 25, max: 70, defaultValue: 40 }),
      numberInput('gradient', 'Resting LVOT gradient', { unit: 'mmHg', min: 0, max: 150, defaultValue: 0 }),
      yesNo('af', 'Atrial fibrillation (any)', null, 'Any history of AF (paroxysmal, persistent, or permanent), not only AF on this ECG.'),
      yesNo('lge', 'Extensive late gadolinium enhancement', null, 'CMR; extensive/≥15% of LV mass is the usual high-risk descriptor'),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const nyha = num(values.nyha, 1);
      const lvh = num(values.lvh, 20);
      const ef = num(values.ef, 65);
      const la = num(values.la, 40);
      const gradient = Math.max(0, num(values.gradient, 0));
      // Educational Cox-like predictor combining ESC HCM Risk-SCD-style terms with extra Mayo/AHA markers
      let lp = 0;
      lp += -0.018 * age;
      lp += nyha >= 4 ? 0.7 : nyha >= 3 ? 0.45 : nyha >= 2 ? 0.15 : 0;
      if (bool(values.syncope)) lp += 0.72;
      if (bool(values.famScd)) lp += 0.46;
      lp += 0.159 * lvh - 0.00294 * lvh * lvh;
      if (bool(values.nsvt)) lp += 0.83;
      if (ef < 50) lp += 0.9;
      else if (ef < 55) lp += 0.3;
      lp += 0.026 * la;
      lp += 0.0045 * gradient;
      if (bool(values.af)) lp += 0.35;
      if (bool(values.lge)) lp += 0.4;
      const lpTypical = -0.018 * 50 + 0.159 * 18 - 0.00294 * 18 * 18 + 0.026 * 40;
      const expRel = Math.exp(Math.max(-8, Math.min(8, lp - lpTypical)));
      const risk = round((1 - Math.pow(0.992, expRel)) * 100, 1);
      const r = riskFromThresholds(risk, [
        {
          max: 3.9,
          level: 'low',
          label: 'Lower educational 5-year risk',
          interpretation: `Educational 5-year SCD/HCM-death estimate ~${risk}%. Generally corresponds to a lower-risk counseling band — still use official ESC HCM Risk-SCD and AHA/Mayo ICD algorithms; do not implant or withhold an ICD from this educational number.`,
        },
        {
          max: 5.9,
          level: 'moderate',
          label: 'Intermediate educational 5-year risk',
          interpretation: `Educational 5-year estimate ~${risk}%. Intermediate band in many HCM pathways (shared ICD decision). Compute official ESC HCM Risk-SCD and apply AHA major-risk-factor strategy.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher educational 5-year risk',
          interpretation: `Educational 5-year estimate ~${risk}%. Multiple high-impact markers (syncope, family SCD, massive LVH, NSVT, low EF, extensive LGE). Refer to an HCM center; official calculators + SCD secondary-prevention rules take precedence.`,
        },
      ]);
      return {
        score: risk,
        unit: '% (5-year, educational)',
        ...r,
        details: [
          { label: 'Wall thickness', value: `${lvh} mm` },
          { label: 'LVEF / LA / gradient', value: `${ef}% / ${la} mm / ${gradient} mmHg` },
          { label: 'Model', value: 'Educational Cox-style — NOT official Mayo MAPS or ESC HCM Risk-SCD' },
        ],
        recommendations: [
          'Use the official ESC HCM Risk-SCD calculator and 2024 AHA/ACC HCM SCD algorithm for ICD decisions',
          'Extensive LGE, EF <50%, and LV aneurysm are AHA major risk modifiers even when ESC estimates are modest',
        ],
      };
    },
    evidence: {
      summary:
        'Educational combination of ESC HCM Risk-SCD-style terms (age, wall thickness quadratic, LA, LVOT gradient, family SCD, NSVT, syncope) plus Mayo/AHA markers (NYHA, EF, AF, LGE). Output is an educational 5-year %. Official Mayo HCM SCD tools and ESC HCM Risk-SCD are separately licensed/published and should be used for decisions.',
      formula: 'Educational LP from HCM risk markers; 5-year % = 1 − 0.992^exp(LP − LP_typical)',
      validation: 'Not a validated MAPS implementation. ESC HCM Risk-SCD (O’Mahony 2014) and AHA/ACC 2024 HCM guideline are the decision standards.',
      references: [
        {
          title: 'A novel clinical risk prediction model for sudden cardiac death in hypertrophic cardiomyopathy (HCM Risk-SCD)',
          citation: "O'Mahony C et al. Eur Heart J. 2014",
          year: 2014,
          pmid: '24126876',
          doi: '10.1093/eurheartj/eht439',
        },
        {
          title: '2024 AHA/ACC/AMSSM/HRS/PACES/SCMR Guideline for the Management of Hypertrophic Cardiomyopathy',
          citation: 'Ommen SR et al. Circulation. 2024',
          year: 2024,
          pmid: '38718139',
          doi: '10.1161/CIR.0000000000001250',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any HCM SCD counseling', actions: ['Open official ESC HCM Risk-SCD', 'Apply 2024 AHA/ACC major-risk-factor ICD algorithm', 'HCM-center referral if high risk or diagnostic uncertainty'] },
      { condition: 'EF <50%, apical aneurysm, or extensive LGE', actions: ['Treat as higher risk even if numeric estimates are modest', 'GDMT / transplant pathway if HFrEF phenotype'] },
    ],
    pearls: [
      'This is educational and is not the official Mayo HCM SCD calculator or ESC HCM Risk-SCD.',
      'Massive LVH (≥30 mm), unexplained syncope, and family SCD are among the strongest ICD discussion triggers.',
      'Younger age increases SCD risk in HCM models — opposite of many atherosclerotic scores.',
    ],
  },

  // ─── 6. IMPROVE-DD ─────────────────────────────────────────────────────────
  {
    id: 'improve-dd',
    name: 'IMPROVE-DD VTE Risk Score',
    shortName: 'IMPROVE-DD',
    description:
      'IMPROVE medical-inpatient VTE risk plus D-dimer ≥2× ULN (+2). Used for pharmacologic prophylaxis decisions in acutely ill medical patients.',
    category: 'hematology',
    tags: ['vte', 'prophylaxis', 'improve', 'd-dimer', 'inpatient'],
    whenToUse: 'Acutely ill hospitalized medical patients when deciding inpatient or extended VTE prophylaxis.',
    whyUse: 'Adds D-dimer to the IMPROVE VTE score and improves discrimination. Score ≥4 is commonly treated as high risk (extended prophylaxis discussions); ≥2 often prompts inpatient prophylaxis.',
    inputs: [
      yesNo('priorVte', 'Prior VTE', 3),
      yesNo('thrombophilia', 'Known thrombophilia', 2, 'Congenital or acquired: e.g. factor V Leiden, prothrombin G20210A, protein C/S or antithrombin deficiency, antiphospholipid syndrome / lupus anticoagulant.'),
      yesNo('paralysis', 'Current lower-limb paralysis', 2),
      yesNo('cancer', 'Current cancer', 2, 'Currently active cancer (not remote treated-and-cured). Most IMPROVE implementations exclude non-melanoma skin cancer.'),
      yesNo('immobility', 'Immobilization ≥7 days', 1, 'Confined to bed or chair with or without bathroom privileges for ≥7 days (not merely admitted but walking).'),
      yesNo('icu', 'ICU/CCU stay', 1),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 70, helpText: '≥60 years: +1' }),
      yesNo('ddimer', 'D-dimer ≥2× ULN', 2),
    ],
    calculate(values) {
      const agePts = num(values.age, 70) >= 60 ? 1 : 0;
      const score =
        (bool(values.priorVte) ? 3 : 0) +
        (bool(values.thrombophilia) ? 2 : 0) +
        (bool(values.paralysis) ? 2 : 0) +
        (bool(values.cancer) ? 2 : 0) +
        (bool(values.immobility) ? 1 : 0) +
        (bool(values.icu) ? 1 : 0) +
        agePts +
        (bool(values.ddimer) ? 2 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low VTE risk (0–1)',
          interpretation: `IMPROVE-DD ${score}: low predicted VTE risk. Pharmacologic prophylaxis is often not warranted; early ambulation ± mechanical prophylaxis if bleeding risk is a concern.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Increased VTE risk (2–3)',
          interpretation: `IMPROVE-DD ${score}: increased risk. Inpatient pharmacologic prophylaxis is typically indicated if bleeding risk is acceptable (pair with IMPROVE bleed).`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High VTE risk (≥4)',
          interpretation: `IMPROVE-DD ${score}: high risk. Inpatient prophylaxis plus consideration of extended post-discharge prophylaxis in selected patients (e.g., MAGELLAN/MARINER-type criteria), balanced against bleed risk.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Age ≥60', value: agePts ? '+1' : '0' },
          { label: 'D-dimer ≥2× ULN', value: bool(values.ddimer) ? '+2' : '0' },
        ],
      };
    },
    evidence: {
      summary:
        'IMPROVE VTE: prior VTE 3, thrombophilia 2, lower-limb paralysis 2, current cancer 2, immobilization ≥7 d 1, ICU/CCU 1, age ≥60 1. IMPROVE-DD adds D-dimer ≥2× ULN (+2). Score ≥2 increased risk; ≥4 high risk for extended-prophylaxis discussions.',
      formula: 'Sum of IMPROVE items + 2 if D-dimer ≥2× ULN',
      validation: 'Spyropoulos / IMPROVE registry; Gibson et al. incorporated D-dimer (IMPROVEDD). Validated in medical inpatients including some COVID-19 cohorts.',
      references: [
        {
          title: 'The IMPROVEDD VTE Risk Score: Incorporation of D-Dimer into the IMPROVE Score to Improve Venous Thromboembolism Risk Stratification',
          citation: 'Gibson CM et al. TH Open. 2017;1(1):e56-e65',
          year: 2017,
          pmid: '31249911',
          doi: '10.1055/s-0037-1603929',
        },
        {
          title: 'Predictive and associative models to identify hospitalized medical patients at risk for VTE',
          citation: 'Spyropoulos AC et al. Chest. 2011',
          year: 2011,
          pmid: '21436241',
          doi: '10.1378/chest.10-1944',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['Pharmacologic prophylaxis unless high bleed risk', 'Reassess daily'] },
      { condition: 'Score ≥4', actions: ['High-risk counseling', 'Consider extended prophylaxis in selected patients', 'Compute IMPROVE bleed'] },
      { condition: 'Score <2', actions: ['Early ambulation', 'Mechanical prophylaxis if immobilized with bleed risk'] },
    ],
    pearls: [
      'Always pair with a bleed score (IMPROVE bleed ≥7 favors mechanical rather than pharmacologic prophylaxis).',
      'D-dimer ≥2× ULN is the IMPROVE-DD increment (+2), not a diagnostic PE cutoff.',
    ],
  },

  // ─── 8. Revised Baux ───────────────────────────────────────────────────────
  {
    id: 'rbaux',
    name: 'Revised Baux Score (rBaux)',
    shortName: 'rBaux',
    description: 'Burn mortality index: age + percent TBSA burned + 17 if inhalation injury (Osler 2010).',
    category: 'emergency',
    tags: ['burn', 'baux', 'rbaux', 'inhalation', 'mortality', 'tbsa'],
    whenToUse: 'Acute thermal injury for early mortality risk communication and transfer decisions.',
    whyUse: 'Simple, well-known revision of the classic Baux index that accounts for inhalation injury. Complements ABSI and modern burn-unit models.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, defaultValue: 40 }),
      numberInput('tbsa', 'TBSA burned', { unit: '%', min: 0, max: 100, defaultValue: 20, helpText: 'Partial- + full-thickness (2nd/3rd degree) only; exclude isolated first-degree/superficial erythema. Estimate with Lund-Browder (preferred) or Rule of Nines; patient palm ≈ 1%.' }),
      yesNo('inhalation', 'Inhalation injury', 17, 'Clinically diagnosed inhalation injury (closed-space fire, carbonaceous sputum, facial burns/singed hairs plus airway signs) or bronchoscopy-confirmed.'),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const tbsa = num(values.tbsa, 20);
      const inh = bool(values.inhalation);
      const score = round(age + tbsa + (inh ? 17 : 0), 1);
      const r = riskFromThresholds(score, [
        {
          max: 60,
          level: 'low',
          label: 'Lower rBaux band',
          interpretation: `rBaux ${score}: lower historic mortality band. Standard burn care; consider burn-center criteria by TBSA/location/age even if rBaux is modest.`,
        },
        {
          max: 90,
          level: 'moderate',
          label: 'Intermediate rBaux',
          interpretation: `rBaux ${score}: intermediate severity. Burn-center care; support airway if inhalation injury is present.`,
        },
        {
          max: 110,
          level: 'high',
          label: 'High rBaux',
          interpretation: `rBaux ${score}: high predicted mortality in original cohorts — aggressive critical-care burn management and goals-of-care discussion as appropriate.`,
        },
        {
          max: 250,
          level: 'critical',
          label: 'Very high rBaux',
          interpretation: `rBaux ${score}: very high historic mortality. Modern burn care has improved survival, so interpret as severity, not futility.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Age + TBSA', value: `${round(age + tbsa, 1)}` },
          { label: 'Inhalation', value: inh ? '+17' : '0' },
        ],
      };
    },
    evidence: {
      summary: 'Revised Baux = age (years) + %TBSA + 17 if inhalation injury. Osler et al. 2010, derived to update the original Baux index for contemporary burn care.',
      formula: 'rBaux = age + %TBSA + 17×(inhalation)',
      validation: 'Widely used; overestimates mortality versus current high-volume burn units but remains a simple comparator and research covariate.',
      references: [
        {
          title: 'Simplified estimates of the probability of death after burn injuries: extending and updating the Baux score',
          citation: 'Osler T, Glance LG, Hosmer DW. J Trauma. 2010',
          year: 2010,
          pmid: '20038856',
          doi: '10.1097/TA.0b013e3181c453b3',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any significant burn', actions: ['ABA burn-center referral criteria (TBSA, site, inhalation, comorbidity)', 'Airway assessment if inhalation', 'Fluid resuscitation (e.g., modified Parkland) and temperature control'] },
    ],
    pearls: [
      'Inhalation adds a flat 17 points — equivalent to 17 extra years of age or 17% extra TBSA.',
      'rBaux is not a substitute for burn-unit prognostic models that include comorbidities and delayed presentation.',
    ],
  },

  // ─── 10. Full Ranson ───────────────────────────────────────────────────────
  {
    id: 'ranson-pancreatitis',
    name: "Ranson Criteria (Admission + 48-Hour)",
    shortName: 'Ranson',
    description:
      'Full 11-item Ranson score for acute pancreatitis severity: 5 admission + 6 forty-eight-hour criteria. Score 0–11.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'ranson', 'severity', 'icu'],
    whenToUse: 'Acute pancreatitis when both admission and 48-hour labs are available (or to tally admission items early).',
    whyUse: 'Classic severity score. BISAP/SIRS are more practical at presentation because Ranson is incomplete until 48 hours.',
    inputs: [
      yesNo('age', 'Age >55 years', 1, 'These are the original (non-biliary) Ranson 1974 cutoffs. Gallstone pancreatitis uses slightly different age/WBC/glucose/LDH thresholds (Ranson 1982); this tool does not switch.'),
      yesNo('wbc', 'WBC >16,000/µL', 1, 'Original non-biliary cutoff. Biliary variant uses >18,000/µL — this tool does not switch.'),
      yesNo('glu', 'Glucose >200 mg/dL', 1, 'Original non-biliary cutoff. Biliary variant uses >220 mg/dL — this tool does not switch.'),
      yesNo('ldh', 'LDH >350 U/L', 1, 'Original non-biliary cutoff. Biliary variant uses >400 U/L — this tool does not switch.'),
      yesNo('ast', 'AST >250 U/L', 1),
      yesNo('hct', 'Hematocrit drop >10% (48 h)', 1),
      yesNo('bun', 'BUN rise >5 mg/dL (48 h)', 1),
      yesNo('ca', 'Calcium <8 mg/dL (48 h)', 1),
      yesNo('pao2', 'PaO₂ <60 mmHg (48 h)', 1),
      yesNo('base', 'Base deficit >4 mEq/L (48 h)', 1),
      yesNo('fluid', 'Fluid sequestration >6 L (48 h)', 1, 'Net fluid balance over 48 h (total intake − total output) >6 L — not gestalt “looks third-spaced.”'),
    ],
    calculate(values) {
      const adm = ['age', 'wbc', 'glu', 'ldh', 'ast'] as const;
      const late = ['hct', 'bun', 'ca', 'pao2', 'base', 'fluid'] as const;
      const admScore = adm.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const lateScore = late.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const score = admScore + lateScore;
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low severity (0–2)',
          interpretation: `Ranson ${score}/11 (admission ${admScore}, 48 h ${lateScore}): low predicted mortality (~0–2% in original series). Ward care if no organ failure.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate (3–4)',
          interpretation: `Ranson ${score}/11: moderate severity (~15% mortality historically). Close monitoring; ICU if organ failure.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High (5–6)',
          interpretation: `Ranson ${score}/11: high severity (~40% historical mortality). ICU-level care, nutrition support, avoid early necrosectomy.`,
        },
        {
          max: 11,
          level: 'critical',
          label: 'Critical (≥7)',
          interpretation: `Ranson ${score}/11: critical band (~100% mortality in original untreated series — modern care is far better). Full ICU support and specialist teams.`,
        },
      ]);
      return {
        score,
        unit: '/11',
        ...r,
        details: [
          { label: 'Admission (0–5)', value: String(admScore) },
          { label: '48-hour (0–6)', value: String(lateScore) },
        ],
      };
    },
    evidence: {
      summary:
        'Ranson 1974: admission — age >55, WBC >16k, glucose >200 mg/dL, LDH >350, AST >250; 48 h — Hct drop >10%, BUN rise >5 mg/dL, Ca <8, PaO₂ <60, base deficit >4, fluid sequestration >6 L. Each 1 point. 0–2 low, 3–4 moderate, 5–6 high, ≥7 critical. Gallstone pancreatitis uses slightly different cutoffs.',
      formula: 'Sum of 11 binary criteria',
      validation: 'Historical standard; requires 48 hours so it cannot guide very early triage. BISAP, SIRS, and APACHE are preferred at presentation.',
      references: [
        {
          title: 'Prognostic signs and the role of operative management in acute pancreatitis',
          citation: 'Ranson JH et al. Surg Gynecol Obstet. 1974',
          year: 1974,
          pmid: '4834279',
        },
        {
          title: 'Etiological and prognostic factors in human acute pancreatitis: a review',
          citation: 'Ranson JH. Am J Gastroenterol. 1982;77(9):633-638',
          year: 1982,
          pmid: '7051819',
        },
      ],
    },
    nextSteps: [
      { condition: 'Admission items only so far', actions: ['Do not wait 48 h to resuscitate', 'Use BISAP/SIRS now', 'Goal-directed fluids and early feeding'] },
      { condition: 'Ranson ≥3 or organ failure', actions: ['Higher-acuity monitoring', 'Nutrition support', 'Avoid early necrosectomy'] },
    ],
    pearls: [
      'Biliary pancreatitis uses slightly higher age/WBC/glucose/LDH cutoffs — this tool uses the original (non-biliary) thresholds.',
      'Full score is not available at presentation.',
    ],
  },

  // ─── 11. SAPS 3 (fuller new ID) ────────────────────────────────────────────
  {
    id: 'saps-3',
    name: 'SAPS 3 (Admission Score)',
    shortName: 'SAPS 3',
    description:
      'Simplified Acute Physiology Score 3 (Metnitz/Moreno 2005): Box I patient characteristics, Box II admission circumstances, Box III physiology within 1 hour, plus 16-point offset. Educational predicted hospital mortality from the global equation.',
    category: 'critical-care',
    tags: ['saps3', 'saps 3', 'icu', 'mortality', 'severity'],
    whenToUse: 'ICU admission severity scoring using data from 1 hour before to 1 hour after admission.',
    whyUse: 'Admission-window physiology (unlike APACHE worst-in-24h). Global logistic equation estimates hospital mortality; custom equations exist by region.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 120, defaultValue: 65, helpText: 'SAPS 3 age points: <40 = 0; 40–59 = 5; 60–69 = 9; 70–74 = 13; 75–79 = 15; ≥80 = 18' }),
      selectInput('comorbid', 'Highest comorbidity', [
        { label: 'None', value: 'none', description: 'None of the listed SAPS 3 comorbidities.' },
        { label: 'Cancer therapy (chemo/radio/steroids)', value: 'therapy', description: 'Chemotherapy, radiotherapy, or chronic high-dose steroids for cancer (not a short burst for COPD).' },
        { label: 'Hematologic cancer', value: 'heme', description: 'Leukemia, lymphoma, or multiple myeloma — not a remote treated solid tumor.' },
        { label: 'Chronic HF NYHA IV', value: 'hf', description: 'NYHA IV: HF symptoms at rest. Do not score NYHA I–III here.' },
        { label: 'Cirrhosis', value: 'cirrhosis', description: 'Documented cirrhosis (biopsy, imaging, or decompensation). Not isolated transaminitis.' },
        { label: 'AIDS', value: 'aids', description: 'CDC AIDS (opportunistic infection or CD4 <200), not asymptomatic HIV alone.' },
        { label: 'Metastatic cancer', value: 'meta', description: 'Distant metastases of solid cancer. Highest-weighted comorbidity — use this instead of “cancer therapy” if both apply.' },
      ], undefined, 'Use the single highest-weighted condition only (do not add multiple). NYHA IV = symptoms at rest.'),
      numberInput('losBefore', 'Hospital LOS before ICU', { unit: 'days', min: 0, max: 90, defaultValue: 1, helpText: 'Days in this hospital before ICU admission. SAPS 3: 0 if <14 d; +6 if 14–27 d; +7 if ≥28 d.' }),
      selectInput('location', 'Intra-hospital location before ICU', [
        { label: 'Operating room', value: 'or', description: 'Came from OR/PACU (including planned postoperative ICU).' },
        { label: 'Emergency room', value: 'ed', description: 'Admitted to ICU from the ED.' },
        { label: 'Other ICU', value: 'icu', description: 'Transfer from another ICU (this or another hospital).' },
        { label: 'Ward / other', value: 'ward', description: 'Ward, step-down, or other in-hospital location (highest location points).' },
      ]),
      yesNo('vasoactive', 'Vasoactive drugs before ICU', null, 'Vasoactive drugs already running before ICU admission (not started after arrival).'),
      selectInput('planned', 'ICU admission planned?', [
        { label: 'Planned', value: 'planned', description: 'ICU stay was scheduled (typically elective postoperative).' },
        { label: 'Unplanned', value: 'unplanned', description: 'Unscheduled ICU admission (emergency surgery or medical). +3.' },
      ]),
      selectInput(
        'reason',
        'Primary reason for ICU admission',
        [
          { label: 'Other / not listed', value: 'other', description: 'None of the listed SAPS 3 reasons is the main ICU indication.' },
          { label: 'Rhythm disturbance (−5)', value: 'rhythm', description: 'ICU primarily for arrhythmia (unstable tachy/brady) without another listed shock/neuro reason.' },
          { label: 'Seizures (−4)', value: 'seizure', description: 'ICU primarily for seizures / status epilepticus that is not a coma/mass-effect presentation.' },
          { label: 'Hypovolemic shock (+3)', value: 'hypovolemia', description: 'Hemorrhagic or non-hemorrhagic hypovolemic shock as the primary ICU reason.' },
          { label: 'Acute abdomen / other digestive (+3)', value: 'abdomen', description: 'Acute abdomen or other digestive indication (not severe pancreatitis, which is scored separately).' },
          { label: 'Coma / stupor / delirium (+4)', value: 'coma', description: 'Coma, stupor, or hyperactive/hypoactive delirium as the primary ICU reason (not a focal deficit or mass effect).' },
          { label: 'Septic / anaphylactic / mixed shock (+5)', value: 'shock', description: 'Distributive shock (septic, anaphylactic, or mixed) — not pure hypovolemic or cardiogenic.' },
          { label: 'Liver failure (+6)', value: 'liver', description: 'Acute or acute-on-chronic liver failure as the primary ICU reason (encephalopathy, shock liver, or transplant-path).' },
          { label: 'Focal neurologic deficit (+7)', value: 'focal', description: 'Acute focal deficit (stroke, hemiparesis) without intracranial mass effect as the main reason.' },
          {
            label: 'Severe pancreatitis (+9)',
            value: 'pancreatitis',
            description:
              'ICU admission primarily for acute pancreatitis with organ failure, necrosis, or SIRS requiring ICU (Atlanta moderately-severe/severe). Do not score mild edematous pancreatitis, chronic pancreatitis pain, or incidental lipase elevation.',
          },
          { label: 'Intracranial mass effect (+10)', value: 'mass', description: 'Intracranial mass effect (herniation, compressed cisterns, space-occupying bleed/tumor) as the primary ICU reason.' },
        ],
        undefined,
        'Pick the single primary ICU admission reason (SAPS 3 Box II). Severe pancreatitis is Atlanta organ-failure/necrosis pancreatitis requiring ICU — not mild pancreatitis on the ward.',
      ),
      selectInput('surgical', 'Surgical status at ICU admission', [
        { label: 'Scheduled surgery', value: 'scheduled', description: 'Elective/scheduled operation before this ICU stay.' },
        { label: 'No surgery', value: 'none', description: 'Medical ICU admission — no operation this episode. +5.' },
        { label: 'Emergency surgery', value: 'emergency', description: 'Unscheduled operation. +6.' },
      ]),
      selectInput('anatSite', 'Anatomical site of surgery (if any)', [
        { label: 'No surgery / other', value: 'other', description: 'No surgery, or a surgical site not listed (0 extra site points).' },
        { label: 'Transplant (−11)', value: 'transplant', description: 'Solid-organ transplant operation this episode.' },
        { label: 'Trauma (−8)', value: 'trauma', description: 'Trauma surgery as the ICU operation.' },
        { label: 'CABG without valve (−6)', value: 'cabg', description: 'Isolated CABG (no valve). Combined CABG+valve is not this item.' },
        { label: 'Neurosurgery for CVA (+5)', value: 'cva', description: 'Neurosurgical procedure for cerebrovascular accident (e.g. hematoma evacuation, aneurysm).' },
      ]),
      selectInput('infection', 'Acute infection at ICU admission', [
        { label: 'None', value: 'none', description: 'No acute infection at ICU admission.' },
        { label: 'Nosocomial (not respiratory)', value: 'noso', description: 'Hospital-acquired infection that is not pneumonia (UTI, wound, line, intra-abdominal, etc.). +4.' },
        { label: 'Respiratory', value: 'resp', description: 'Community-acquired pneumonia / respiratory infection. +5.' },
        { label: 'Nosocomial respiratory', value: 'both', description: 'Hospital-acquired pneumonia or ventilator-associated pneumonia. +9 (do not also add nosocomial or respiratory).' },
      ]),
      numberInput('gcs', 'Lowest GCS (admission window)', { min: 3, max: 15, defaultValue: 15, helpText: 'Lowest estimated GCS from 1 h before to 1 h after ICU admission. If sedated/paralyzed, use pre-sedation GCS. If intubated, verbal is untestable (VT = 1) or estimate pre-intubation speech — do not guess a normal verbal 5.' }),
      numberInput('bili', 'Highest total bilirubin', { unit: 'mg/dL', min: 0, max: 40, step: 0.1, defaultValue: 0.8, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('temp', 'Highest temperature', { unit: '°C', min: 30, max: 43, step: 0.1, defaultValue: 37, helpText: '±1 hour admission window only (not worst in 24 h). Points if temperature <35 °C.' }),
      numberInput('creat', 'Highest creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('hr', 'Highest heart rate', { unit: '/min', min: 30, max: 250, defaultValue: 90, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('wbc', 'Highest leukocytes (admission window)', { unit: '×10³/µL', min: 0, max: 100, step: 0.1, defaultValue: 10, helpText: 'Highest leukocytes in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('ph', 'Lowest pH', { min: 6.6, max: 7.7, step: 0.01, defaultValue: 7.38, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('plt', 'Lowest platelets', { unit: '×10³/µL', min: 5, max: 800, defaultValue: 220, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      numberInput('sbp', 'Lowest systolic BP', { unit: 'mmHg', min: 30, max: 250, defaultValue: 120, helpText: 'Worst value in the ±1 hour admission window only (not worst in 24 h).' }),
      selectInput('ox', 'Oxygenation (admission window)', [
        { label: 'PaO₂ ≥60 and not ventilated', value: 'room', description: 'Not intubated/ventilated, PaO₂ ≥60 mmHg (includes supplemental O₂ if not ventilated).' },
        { label: 'PaO₂ <60, not ventilated', value: 'hypox', description: 'Not ventilated, PaO₂ <60 mmHg. +5.' },
        { label: 'Ventilated, PaO₂/FiO₂ ≥100', value: 'ventOk', description: 'Invasive ventilation with P/F ≥100. +7.' },
        { label: 'Ventilated, PaO₂/FiO₂ <100', value: 'ventLow', description: 'Invasive ventilation with P/F <100 (severe hypoxemia). +11.' },
      ], undefined, 'Use the worst oxygenation in the ±1 hour admission window only (not worst in 24 h).'),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const comorbidMap: Record<string, number> = {
        none: 0,
        therapy: 3,
        heme: 6,
        hf: 6,
        cirrhosis: 8,
        aids: 8,
        meta: 11,
      };
      const comorbidPts = comorbidMap[str(values.comorbid, 'none')] ?? 0;
      const los = num(values.losBefore, 1);
      const losPts = los >= 28 ? 7 : los >= 14 ? 6 : 0;
      const locMap: Record<string, number> = { or: 0, ed: 5, icu: 7, ward: 8 };
      const locPts = locMap[str(values.location, 'or')] ?? 0;
      const vasoPts = bool(values.vasoactive) ? 3 : 0;
      const box1 = saps3Age(age) + comorbidPts + losPts + locPts + vasoPts;

      const plannedPts = str(values.planned, 'planned') === 'unplanned' ? 3 : 0;
      const reasonMap: Record<string, number> = {
        other: 0,
        rhythm: -5,
        seizure: -4,
        hypovolemia: 3,
        abdomen: 3,
        coma: 4,
        shock: 5,
        liver: 6,
        focal: 7,
        pancreatitis: 9,
        mass: 10,
      };
      const reasonPts = reasonMap[str(values.reason, 'other')] ?? 0;
      const surgMap: Record<string, number> = { scheduled: 0, none: 5, emergency: 6 };
      const surgPts = surgMap[str(values.surgical, 'scheduled')] ?? 0;
      const siteMap: Record<string, number> = { other: 0, transplant: -11, trauma: -8, cabg: -6, cva: 5 };
      const sitePts = siteMap[str(values.anatSite, 'other')] ?? 0;
      const infMap: Record<string, number> = { none: 0, noso: 4, resp: 5, both: 9 };
      const infPts = infMap[str(values.infection, 'none')] ?? 0;
      const box2 = plannedPts + reasonPts + surgPts + sitePts + infPts;

      const gcs = num(values.gcs, 15);
      const gcsPts = gcs <= 4 ? 15 : gcs === 5 ? 10 : gcs === 6 ? 7 : gcs < 13 ? 2 : 0;
      const bili = num(values.bili, 0.8);
      const biliPts = bili >= 6 ? 5 : bili >= 2 ? 4 : 0;
      const tempPts = num(values.temp, 37) < 35 ? 7 : 0;
      const cr = num(values.creat, 1);
      const crPts = cr >= 3.5 ? 8 : cr >= 2 ? 7 : cr >= 1.2 ? 2 : 0;
      const hr = num(values.hr, 90);
      const hrPts = hr >= 160 ? 7 : hr >= 120 ? 5 : 0;
      const wbcPts = num(values.wbc, 10) >= 15 ? 2 : 0;
      const phPts = num(values.ph, 7.38) <= 7.25 ? 3 : 0;
      const plt = num(values.plt, 220);
      const pltPts = plt < 20 ? 13 : plt < 50 ? 8 : plt < 100 ? 5 : 0;
      const sbp = num(values.sbp, 120);
      const sbpPts = sbp < 40 ? 11 : sbp < 70 ? 8 : sbp < 120 ? 3 : 0;
      const oxMap: Record<string, number> = { room: 0, hypox: 5, ventOk: 7, ventLow: 11 };
      const oxPts = oxMap[str(values.ox, 'room')] ?? 0;
      const box3 = gcsPts + biliPts + tempPts + crPts + hrPts + wbcPts + phPts + pltPts + sbpPts + oxPts;

      const score = 16 + box1 + box2 + box3;
      const mort = saps3Mortality(score);
      const r = riskFromThresholds(mort, [
        {
          max: 10,
          level: 'low',
          label: 'Lower predicted hospital mortality',
          interpretation: `SAPS 3 points ${score}; global-equation hospital mortality ≈ ${mort}%. Educational estimate — use official SAPS 3 software/custom equations for benchmarking.`,
        },
        {
          max: 25,
          level: 'moderate',
          label: 'Moderate predicted mortality',
          interpretation: `SAPS 3 points ${score}; predicted mortality ≈ ${mort}%. Intermediate severity.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'High predicted mortality',
          interpretation: `SAPS 3 points ${score}; predicted mortality ≈ ${mort}%. High illness burden at ICU admission.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high predicted mortality',
          interpretation: `SAPS 3 points ${score}; predicted mortality ≈ ${mort}%. Do not use a single score for futility decisions.`,
        },
      ]);
      return {
        score: mort,
        unit: '% hospital mortality',
        ...r,
        details: [
          { label: 'SAPS 3 points', value: `${score} (16 + Box I ${box1} + Box II ${box2} + Box III ${box3})` },
          { label: 'Global logit mortality', value: `${mort}%` },
        ],
      };
    },
    evidence: {
      summary:
        'SAPS 3 admission score = 16 (offset) + Box I (age, comorbidity, LOS, location, vasoactives) + Box II (planned/unplanned, reason, surgical status, anatomic site, infection) + Box III (GCS, bilirubin, temperature, creatinine, HR, WBC, pH, platelets, SBP, oxygenation). Global equation: logit = −32.6659 + ln(score+20.5958)×7.3068.',
      formula: 'Mortality = exp(logit)/(1+exp(logit)); logit = −32.6659 + ln(SAPS3+20.5958)×7.3068',
      validation:
        'Metnitz/Moreno 2005 multinational cohort. Custom geographic equations improve calibration. This implementation is educational and omits some rare reason/site combinations.',
      references: [
        {
          title: 'SAPS 3—From evaluation of the patient to evaluation of the intensive care unit. Part 1',
          citation: 'Metnitz PG et al. Intensive Care Med. 2005',
          year: 2005,
          pmid: '16132893',
          doi: '10.1007/s00134-005-2762-6',
        },
        {
          title: 'SAPS 3—From evaluation of the patient to evaluation of the intensive care unit. Part 2: Development of a prognostic model',
          citation: 'Moreno RP et al. Intensive Care Med. 2005',
          year: 2005,
          pmid: '16132892',
          doi: '10.1007/s00134-005-2763-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated predicted mortality', actions: ['ICU-level organ support', 'Do not use SAPS 3 alone for futility', 'Prefer official software if benchmarking'] },
    ],
    pearls: [
      'Every patient starts at 16 points so totals stay non-negative.',
      'Physiology is the first hour, not the worst value in 24 hours (unlike APACHE/SAPS II).',
      'Comorbidity uses the single highest-weighted condition.',
    ],
  },
];
