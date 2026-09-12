import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const missingEmergencyCalcs: Calculator[] = [
  {
    id: 'canadian-ct-head',
    name: 'Canadian CT Head Rule',
    shortName: 'Canadian CT Head',
    description:
      'Decision rule for CT imaging after minor head injury (GCS 13–15) to identify clinically important brain injury.',
    category: 'emergency',
    tags: ['head trauma', 'ct', 'imaging', 'gcs', 'neurology'],
    whenToUse:
      'Adults with minor head injury: witnessed LOC, amnesia, or disorientation; GCS 13–15. Not for age <16, blood thinners, or seizure after injury.',
    whyUse:
      'High sensitivity for neurosurgical lesions and clinically important brain injury while reducing unnecessary CT.',
    inputs: [
      selectInput(
        'gcs',
        'GCS at assessment',
        [
          {
            label: '15',
            value: 15,
            description: 'E4 V5 M6 — eyes open spontaneously, oriented to person/place/time, obeys commands. Fully alert.',
          },
          {
            label: '14',
            value: 14,
            description: 'One-point deficit, most often confused/disoriented (V4) while still conversing, or delayed eye opening. Still “minor” head injury if inclusion criteria are met.',
          },
          {
            label: '13',
            value: 13,
            description: 'Two-point deficit (e.g. eyes to speech E3, inappropriate words V3, or localizes only M5). Lower bound of CCHR inclusion — GCS <13 is outside the rule (image).',
          },
        ],
        15,
        'Total GCS now (eye + verbal + motor). CCHR applies only to GCS 13–15 after minor head injury (witnessed LOC, amnesia, or disorientation). GCS <15 at 2 hours after injury is a separate high-risk item below — do not double-count the arrival GCS here.',
      ),
      yesNo('gcsLow2h', 'GCS <15 at 2 hours after injury', 2, 'High-risk CCHR item: any GCS below 15 when reassessed 2 hours after the injury (not the arrival GCS if it has recovered to 15).'),
      yesNo('openDepressed', 'Suspected open or depressed skull fracture', 2, 'Palpable depression, open laceration over a fracture, or penetrating injury. Clinical suspicion counts — do not wait for CT to score this item.'),
      yesNo('basalSkull', 'Any sign of basal skull fracture (hemotympanum, raccoon eyes, CSF leak, Battle sign)', 2),
      yesNo('vomit2', 'Vomiting ≥2 episodes', 2, 'Two or more separate episodes of vomiting after the injury (not a single gag or one emesis).'),
      yesNo('age65', 'Age ≥65 years', 2),
      yesNo('amnesia30', 'Amnesia before impact ≥30 minutes', 1, 'Retrograde amnesia: cannot recall events from ≥30 minutes before impact. Anterograde/post-traumatic amnesia alone does not score this medium-risk item.'),
      yesNo('dangerousMech', 'Dangerous mechanism (pedestrian struck, ejection, fall from ≥3 ft / 5 stairs)', 1, 'Pedestrian or cyclist struck by a motor vehicle; occupant ejected; fall from ≥3 feet or ≥5 stairs. Other mechanisms are not “dangerous” for this rule.'),
    ],
    calculate(values) {
      const high =
        bool(values.gcsLow2h) ||
        bool(values.openDepressed) ||
        bool(values.basalSkull) ||
        bool(values.vomit2) ||
        bool(values.age65);
      const medium = bool(values.amnesia30) || bool(values.dangerousMech);
      const gcs = num(values.gcs, 15);

      if (high) {
        return {
          score: 2,
          label: 'High risk — CT indicated',
          interpretation: `≥1 high-risk criterion. CT head recommended to evaluate for neurosurgical lesion. (GCS ${gcs}; rule applies to GCS 13–15 only.)`,
          riskLevel: 'high' as const,
          details: [
            { label: 'Risk tier', value: 'High' },
            { label: 'GCS', value: String(gcs) },
          ],
          recommendations: ['Obtain non-contrast CT head', 'Neurosurgical consult if positive findings', 'Observe pending imaging as indicated'],
        };
      }
      if (medium) {
        return {
          score: 1,
          label: 'Medium risk — CT indicated',
          interpretation: `≥1 medium-risk criterion. CT head recommended for clinically important brain injury. (GCS ${gcs}.)`,
          riskLevel: 'moderate' as const,
          details: [
            { label: 'Risk tier', value: 'Medium' },
            { label: 'GCS', value: String(gcs) },
          ],
          recommendations: ['Obtain non-contrast CT head', 'Discharge only if CT negative and clinically stable'],
        };
      }
      if (gcs < 15) {
        return {
          score: '—',
          label: 'CCHR not yet negative — GCS <15 at assessment',
          interpretation: `Current GCS is ${gcs} (13–14). The high-risk CCHR item is GCS <15 at 2 hours after injury, not the arrival GCS. Observe until 2 hours and rescore, or obtain CT. Do not discharge as rule-negative.`,
          riskLevel: 'moderate' as const,
          details: [
            { label: 'Risk tier', value: 'Indeterminate' },
            { label: 'GCS', value: String(gcs) },
          ],
          recommendations: [
            'Observe until 2 hours post-injury and rescore CCHR',
            'Obtain CT if observation to 2 hours is not feasible or GCS does not recover to 15',
            'Do not discharge as CCHR-negative while GCS remains <15',
          ],
        };
      }
      return {
        score: 0,
        label: 'Rule negative — CT not required by CCHR',
        interpretation: `No high- or medium-risk criteria. CT not required by Canadian CT Head Rule if reliable exam and inclusion criteria met. (GCS ${gcs}.)`,
        riskLevel: 'low' as const,
        details: [
          { label: 'Risk tier', value: 'None' },
          { label: 'GCS', value: String(gcs) },
        ],
        recommendations: ['Clinical observation / discharge counseling', 'Return precautions for delayed deterioration'],
      };
    },
    evidence: {
      summary:
        'Canadian CT Head Rule: high-risk criteria predict need for neurologic intervention; medium-risk predict clinically important brain injury on CT.',
      formula:
        'High: GCS<15 at 2h, open/depressed skull fx, basilar skull signs, ≥2 vomits, age≥65. Medium: amnesia ≥30 min, dangerous mechanism.',
      validation: 'Derived and validated by Stiell et al.; very high sensitivity for clinically important injury in eligible patients.',
      references: [
        {
          title: 'The Canadian CT Head Rule for patients with minor head injury',
          citation: 'Stiell IG et al. Lancet. 2001;357:1391-1396',
          year: 2001,
          pmid: '11356436',
          doi: '10.1016/s0140-6736(00)04561-x',
        },
      ],
    },
    nextSteps: [
      { condition: 'High or medium risk', actions: ['CT head', 'Manage ABCs', 'Neurosurgery if mass lesion/bleed'] },
      { condition: 'Rule negative', actions: ['Consider observation or discharge with precautions if no other concern'] },
    ],
    pearls: [
      'Rule does not apply to age <16, warfarin/DOAC/known coagulopathy, or post-traumatic seizure — image those patients.',
      'GCS must be 13–15 with minor head injury mechanism meeting inclusion criteria.',
    ],
  },

  {
    id: 'new-orleans-ct-head',
    name: 'New Orleans / Charter CT Head Criteria',
    shortName: 'New Orleans CT',
    description: 'CT decision criteria after minor head trauma for patients with GCS 15.',
    category: 'emergency',
    tags: ['head trauma', 'ct', 'imaging', 'gcs'],
    whenToUse: 'Adults with minor head injury, GCS 15, and loss of consciousness (normal neuro exam).',
    whyUse: 'Very sensitive for intracranial injury; more liberal (less specific) than Canadian CT Head Rule.',
    inputs: [
      yesNo('headache', 'Headache', 1, 'Any headache after the injury (not a remote chronic headache unchanged from baseline).'),
      yesNo('vomiting', 'Vomiting', 1, 'Any vomiting after the injury (New Orleans uses ≥1 episode; Canadian CT Head Rule uses ≥2).'),
      yesNo('age60', 'Age >60 years'),
      yesNo('intox', 'Drug or alcohol intoxication', 1, 'Clinical intoxication impairing a reliable exam (alcohol or drugs). Same operational idea as NEXUS: not a remote history of use.'),
      yesNo('amnesia', 'Persistent anterograde amnesia (short-term memory deficit)', 1, 'Cannot retain new information (e.g. 3-item recall) after the injury — not merely a brief daze that has cleared.'),
      yesNo('traumaClavicle', 'Visible trauma above the clavicle', 1, 'Contusion, abrasion, laceration, or deformity of the face, scalp, or neck (above the clavicles).'),
      yesNo('seizure', 'Seizure', 1, 'Post-traumatic seizure, including a reported seizure before arrival.'),
    ],
    calculate(values) {
      const keys = ['headache', 'vomiting', 'age60', 'intox', 'amnesia', 'traumaClavicle', 'seizure'] as const;
      const positives = keys.filter((k) => bool(values[k]));
      const score = positives.length;
      if (score >= 1) {
        return {
          score,
          label: 'CT indicated',
          interpretation: `${score} New Orleans criterion(ia) present. CT head recommended (rule derived for GCS 15).`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'Positive criteria', value: String(score) }],
          recommendations: ['Non-contrast CT head', 'Observe if intoxicated until sober reassessment'],
        };
      }
      return {
        score: 0,
        label: 'CT not required by New Orleans criteria',
        interpretation: 'All criteria negative in a GCS 15 patient — clinically important injury unlikely by this rule.',
        riskLevel: 'low' as const,
        recommendations: ['Discharge counseling and return precautions if otherwise appropriate'],
      };
    },
    evidence: {
      summary:
        'New Orleans Criteria: any of 7 findings after minor head trauma with GCS 15 warrants CT (headache, vomiting, age>60, intoxication, amnesia, trauma above clavicle, seizure).',
      formula: 'CT if ≥1 criterion present (GCS 15 population).',
      validation: 'Haydel et al. reported 100% sensitivity for intracranial injury in derivation/validation; lower specificity than CCHR.',
      references: [
        {
          title: 'Indications for computed tomography in patients with minor head injury',
          citation: 'Haydel MJ et al. N Engl J Med. 2000;343:100-105',
          year: 2000,
          pmid: '10891517',
          doi: '10.1056/NEJM200007133430204',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any criterion positive', actions: ['CT head'] },
      { condition: 'All negative', actions: ['Clinical clearance if GCS remains 15 and reliable'] },
    ],
    pearls: [
      'Applies to GCS 15 only — do not use alone for GCS 13–14.',
      'More sensitive but less specific than Canadian CT Head Rule; expect more CTs.',
    ],
  },

  {
    id: 'years-algorithm',
    name: 'YEARS Algorithm for PE',
    shortName: 'YEARS',
    description: 'Pulmonary embolism workup using three clinical items and an adjusted D-dimer threshold.',
    category: 'emergency',
    tags: ['pe', 'vte', 'd-dimer', 'pulmonary'],
    whenToUse: 'Hemodynamically stable patients with suspected PE in whom D-dimer-based exclusion is appropriate.',
    whyUse: 'Raises D-dimer threshold to 1000 ng/mL when no YEARS items present, reducing imaging without major miss rate.',
    inputs: [
      yesNo('dvtSigns', 'Clinical signs of DVT', 1, 'Unilateral calf swelling, pitting edema, or tenderness along the deep venous system (not isolated Homan sign).'),
      yesNo('hemoptysis', 'Hemoptysis', 1, 'Coughing up blood or blood-streaked sputum attributed to this presentation (not chronic bronchitis streaking alone).'),
      yesNo('peLikely', 'PE is the most likely diagnosis', 1, 'Clinician gestalt: PE is more likely than the next competing diagnosis (same idea as Wells “PE more likely than alternative”).'),
      numberInput('ddimer', 'D-dimer', {
        unit: 'ng/mL (FEU)',
        min: 0,
        max: 20000,
        step: 10,
        defaultValue: 500,
        helpText: 'Use same units as local assay; thresholds assume FEU ng/mL.',
      }),
    ],
    calculate(values) {
      const items =
        (bool(values.dvtSigns) ? 1 : 0) + (bool(values.hemoptysis) ? 1 : 0) + (bool(values.peLikely) ? 1 : 0);
      const ddimer = num(values.ddimer, 0);
      const threshold = items === 0 ? 1000 : 500;
      const excluded = ddimer < threshold;

      if (excluded) {
        return {
          score: items,
          label: 'PE excluded by YEARS',
          interpretation: `${items} YEARS item(s); D-dimer ${ddimer} ng/mL is below threshold ${threshold} ng/mL. PE considered excluded — no imaging required by algorithm.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'YEARS items', value: String(items) },
            { label: 'D-dimer threshold', value: `${threshold} ng/mL` },
            { label: 'D-dimer', value: `${ddimer} ng/mL` },
          ],
          recommendations: ['Consider alternate diagnoses', 'No CTPA/V-Q solely for PE if algorithm applies'],
        };
      }
      return {
        score: items,
        label: 'Imaging indicated',
        interpretation: `${items} YEARS item(s); D-dimer ${ddimer} ng/mL is at/above threshold ${threshold} ng/mL. Proceed to definitive PE imaging.`,
        riskLevel: items >= 2 ? 'high' : 'moderate',
        details: [
          { label: 'YEARS items', value: String(items) },
          { label: 'D-dimer threshold', value: `${threshold} ng/mL` },
          { label: 'D-dimer', value: `${ddimer} ng/mL` },
        ],
        recommendations: ['CT pulmonary angiogram (or V-Q if CT contraindicated)', 'Risk-stratify if PE confirmed'],
      };
    },
    evidence: {
      summary:
        'YEARS: items = DVT signs, hemoptysis, PE most likely. D-dimer cutoff 1000 ng/mL if 0 items, else 500 ng/mL.',
      formula: 'Exclude PE if D-dimer <1000 (0 items) or <500 (≥1 item).',
      validation: 'YEARS study (van der Hulle et al.) and subsequent validations; pregnancy adaptation (ARTEMIS) uses different rules.',
      references: [
        {
          title: 'Simplified diagnostic management of suspected pulmonary embolism (YEARS study)',
          citation: 'van der Hulle T et al. Lancet. 2017;390:289-297',
          year: 2017,
          pmid: '28549662',
          doi: '10.1016/S0140-6736(17)30885-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Below threshold', actions: ['PE excluded', 'Seek alternate diagnosis'] },
      { condition: 'At/above threshold', actions: ['CTPA or V-Q', 'Treat if high pretest and delay to imaging in selected cases'] },
    ],
    pearls: [
      'Confirm local D-dimer units (FEU vs DDU); thresholds here assume FEU ng/mL.',
      'Not a substitute for clinical judgment in unstable patients or when PE is overwhelmingly likely.',
    ],
  },

  {
    id: 'sf-syncope',
    name: 'San Francisco Syncope Rule (CHESS)',
    shortName: 'SF Syncope / CHESS',
    description: 'Identifies syncope patients at risk for short-term serious outcomes using CHESS criteria.',
    category: 'emergency',
    tags: ['syncope', 'risk', 'chess', 'disposition'],
    whenToUse: 'Adult ED patients with syncope or near-syncope for short-term serious outcome risk.',
    whyUse: 'Simple CHESS screen; any positive criterion = higher short-term risk (external sensitivity varies).',
    inputs: [
      yesNo('chf', 'History of congestive heart failure', 1, 'Any prior clinical diagnosis of HF (reduced or preserved EF), not merely a remote murmur.'),
      yesNo('hct', 'Hematocrit <30%'),
      yesNo('ecg', 'Abnormal ECG (new changes or non-sinus rhythm)', 1, 'Positive if any new changes vs a prior tracing, or any non-sinus rhythm on any ECG or monitor strip including EMS. Old unchanged abnormalities (e.g. old LBBB/LVH) do not count.'),
      yesNo('sob', 'Shortness of breath', 1, 'Dyspnea as a symptom of this syncope presentation (patient-reported or observed), not a remote COPD history alone.'),
      yesNo('sbp90', 'Triage systolic BP <90 mmHg'),
    ],
    calculate(values) {
      const keys = ['chf', 'hct', 'ecg', 'sob', 'sbp90'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 1) {
        return {
          score,
          label: 'High risk (CHESS positive)',
          interpretation: `${score} CHESS criterion(ia) present. Higher risk of serious outcome (≈10–20% range in derivation); consider admission/further workup.`,
          riskLevel: 'high' as const,
          details: [{ label: 'CHESS positives', value: String(score) }],
          recommendations: ['Telemetry / admission as appropriate', 'Evaluate for ACS, arrhythmia, hemorrhage, PE', 'Repeat ECG and labs as indicated'],
        };
      }
      return {
        score: 0,
        label: 'Low risk (CHESS negative)',
        interpretation: 'No CHESS criteria. Lower short-term serious outcome risk, but not zero — clinical judgment still required.',
        riskLevel: 'low' as const,
        recommendations: ['Consider outpatient follow-up if history suggests benign cause', 'Return precautions'],
      };
    },
    evidence: {
      summary: 'CHESS: CHF history, Hematocrit <30%, abnormal ECG, Shortness of breath, SBP <90 at triage.',
      formula: 'Any criterion positive = high risk.',
      validation: 'Quinn et al. derivation/validation; external validations show variable specificity; use with clinical context.',
      references: [
        {
          title: 'Derivation of the San Francisco Syncope Rule',
          citation: 'Quinn JV et al. Ann Emerg Med. 2004;43:224-232',
          year: 2004,
          pmid: '14747812',
          doi: '10.1016/s0196-0644(03)00823-0',
        },
      ],
    },
    nextSteps: [
      { condition: 'CHESS positive', actions: ['Consider admission', 'Cardiac monitoring', 'Targeted workup'] },
      { condition: 'CHESS negative', actions: ['Risk-benefit of discharge', 'Outpatient follow-up'] },
    ],
    pearls: [
      'Abnormal ECG definitions vary — new changes, non-sinus rhythms, conduction blocks commonly count.',
      'Does not replace Canadian Syncope Risk Score or full clinical assessment.',
    ],
  },

  {
    id: 'canadian-syncope',
    name: 'Canadian Syncope Risk Score',
    shortName: 'CSRS',
    description: 'Point score estimating 30-day serious outcome risk after ED syncope.',
    category: 'emergency',
    tags: ['syncope', 'risk', 'csrs', 'disposition'],
    whenToUse: 'Adult ED patients with syncope once a serious cause is not already evident on index evaluation.',
    whyUse: 'Stratifies 30-day risk of arrhythmia, MI, structural issues, and death better than CHESS alone in validations.',
    inputs: [
      yesNo('vasovagalPredis', 'Predisposition to vasovagal symptoms (−1)', -1, 'Triggered by a warm crowded place, prolonged standing, fear, emotion, or pain (prodrome of the index event or a prior typical pattern).'),
      yesNo('heartDisease', 'History of heart disease (+1)', 1, 'CAD, AF/flutter, HF, valvular disease, cardiomyopathy, or non-sinus rhythm / device history.'),
      yesNo('sbpExtreme', 'Any ED SBP <90 or >180 mmHg (+2)', 2),
      yesNo('troponinElev', 'Elevated troponin (+2)', 2, 'Any value above the local 99th-percentile upper reference limit (assay-specific).'),
      yesNo('abnQrsAxis', 'Abnormal QRS axis (< −30° or > 100°) (+1)', 1, 'QRS axis < −30° or > 100° on the index ECG (not merely “outside −30 to 100” wording).'),
      yesNo('qrsWide', 'QRS duration >130 ms (+1)', 1),
      yesNo('qtcLong', 'Corrected QT interval >480 ms (+2)', 2),
      selectInput('edDx', 'ED diagnosis', [
        { label: 'Neither / other', value: 'other', points: 0, description: 'No clear vasovagal or cardiac diagnosis after the index ED evaluation.' },
        { label: 'Vasovagal syncope (−2)', value: 'vasovagal', points: -2, description: 'ED clinician diagnosis of reflex/vasovagal syncope (prodrome + trigger; no competing cardiac explanation).' },
        { label: 'Cardiac syncope (+2)', value: 'cardiac', points: 2, description: 'ED clinician diagnosis of cardiac syncope (arrhythmia, structural, ischemic) — not merely “unexplained.”' },
      ], undefined, 'The treating ED diagnosis after history, exam, ECG, and (when done) troponin — not a later inpatient label.'),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.vasovagalPredis)) score -= 1;
      if (bool(values.heartDisease)) score += 1;
      if (bool(values.sbpExtreme)) score += 2;
      if (bool(values.troponinElev)) score += 2;
      if (bool(values.abnQrsAxis)) score += 1;
      if (bool(values.qrsWide)) score += 1;
      if (bool(values.qtcLong)) score += 2;
      const dx = String(values.edDx ?? 'other');
      if (dx === 'vasovagal') score -= 2;
      if (dx === 'cardiac') score += 2;

      // Approximate published risk bands (educational)
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';
      if (score <= -2) {
        riskLevel = 'low';
        label = 'Very low risk';
        interpretation = `CSRS ${score}: very low estimated 30-day serious outcome risk. Outpatient management often appropriate if evaluation complete.`;
      } else if (score <= 0) {
        riskLevel = 'low';
        label = 'Low risk';
        interpretation = `CSRS ${score}: low estimated 30-day serious outcome risk. Consider discharge with follow-up when safe.`;
      } else if (score <= 3) {
        riskLevel = 'moderate';
        label = 'Medium risk';
        interpretation = `CSRS ${score}: medium risk. Shared decision-making; many benefit from brief observation or expedited workup.`;
      } else if (score <= 5) {
        riskLevel = 'high';
        label = 'High risk';
        interpretation = `CSRS ${score}: high risk of serious outcome within 30 days. Admission / monitoring strongly considered.`;
      } else {
        riskLevel = 'critical';
        label = 'Very high risk';
        interpretation = `CSRS ${score}: very high risk. Admit with cardiac monitoring and urgent evaluation for arrhythmic/structural causes.`;
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'CSRS points', value: String(score) }],
        recommendations:
          score >= 4
            ? ['Admit / observe with telemetry', 'Cardiology involvement as indicated']
            : score >= 1
              ? ['Consider observation unit', 'Ensure ECG, troponin, orthostatics addressed']
              : ['Outpatient follow-up', 'Return precautions'],
      };
    },
    evidence: {
      summary:
        'CSRS points: vasovagal predisposition −1; heart disease +1; SBP <90 or >180 +2; ↑troponin +2; abnormal QRS axis +1; QRS >130 +1; QTc >480 +2; ED vasovagal −2; ED cardiac +2.',
      formula: 'Sum of weighted clinical and ECG variables (−3 to +11 range typically).',
      validation: 'Thiruganasambandamoorthy et al.; multiphase derivation and validation for 30-day serious outcomes.',
      references: [
        {
          title: 'Development of the Canadian Syncope Risk Score',
          citation: 'Thiruganasambandamoorthy V et al. CMAJ. 2016;188:E289-E298',
          year: 2016,
          pmid: '27378464',
          doi: '10.1503/cmaj.151469',
        },
      ],
    },
    nextSteps: [
      { condition: 'Very low / low (≤0)', actions: ['Discharge if workup reassuring', 'Primary care / cardiology follow-up as needed'] },
      { condition: 'Medium (1–3)', actions: ['Shared decision for observation vs discharge', 'Close follow-up'] },
      { condition: 'High / very high (≥4)', actions: ['Admission and monitoring', 'Arrhythmia evaluation'] },
    ],
    pearls: [
      'Apply after excluding obvious serious causes already requiring admission.',
      'Risk percentages are population estimates — individualize disposition.',
    ],
  },

  {
    id: 'hestia-pe',
    name: 'Hestia Criteria (Outpatient PE)',
    shortName: 'Hestia',
    description: 'Checklist to identify patients with acute PE who may be eligible for outpatient treatment.',
    category: 'emergency',
    tags: ['pe', 'vte', 'outpatient', 'disposition'],
    whenToUse: 'Confirmed acute PE when considering home treatment vs admission.',
    whyUse: 'If all answers are “no,” outpatient management is often safe in validated cohorts (with clinical judgment).',
    inputs: [
      yesNo('unstable', 'Hemodynamically unstable (e.g., SBP <100, needing pressors/inotropes, or high-risk PE features)', 1, 'SBP <100 mmHg with HR >100, ICU/inotropes, or other high-risk PE features (e.g. RV strain with shock physiology).'),
      yesNo('lysis', 'Thrombolysis or embolectomy needed', 1, 'Systemic thrombolysis, catheter-directed therapy, or surgical embolectomy indicated (high-risk PE / shock).'),
      yesNo('bleed', 'Active bleeding or high risk of bleeding', 1, 'E.g. GI bleed <14 d, stroke <4 wk, surgery <2 wk, platelets <75×10⁹/L, SBP >180 or DBP >110, or known bleeding diathesis.'),
      yesNo('o2', 'Need for oxygen >24 h to maintain SpO₂ >90%', 1, 'Cannot maintain SpO₂ >90% on room air without supplemental O₂ expected to last >24 h.'),
      yesNo('onAnticoag', 'PE diagnosed while on therapeutic anticoagulation', 1, 'Breakthrough PE despite therapeutic-intensity anticoagulation (not prophylactic dose).'),
      yesNo('ivPain', 'Severe pain needing IV analgesia >24 h', 1, 'Pain requiring parenteral opioids/analgesia expected to last >24 h — a Hestia exclusion, not a PE-severity score.'),
      yesNo('medicalSocial', 'Medical or social reason for hospital stay >24 h', 1, 'Any medical comorbidity or social barrier (no support, cannot inject/take oral AC, unreliable follow-up) requiring >24 h in hospital.'),
      yesNo('crcl30', 'Creatinine clearance <30 mL/min'),
      yesNo('liver', 'Severe liver impairment', 1, 'Cirrhosis or clinician-judged severe hepatic impairment.'),
      yesNo('pregnant', 'Pregnant'),
      yesNo('hit', 'Documented history of HIT'),
    ],
    calculate(values) {
      const keys = [
        'unstable',
        'lysis',
        'bleed',
        'o2',
        'onAnticoag',
        'ivPain',
        'medicalSocial',
        'crcl30',
        'liver',
        'pregnant',
        'hit',
      ] as const;
      const failed = keys.filter((k) => bool(values[k]));
      const score = failed.length;

      if (score === 0) {
        return {
          score: 0,
          label: 'Eligible for outpatient PE therapy',
          interpretation:
            'All Hestia criteria negative. Patient may be candidate for outpatient anticoagulation if reliable follow-up and shared decision-making support discharge.',
          riskLevel: 'low' as const,
          recommendations: [
            'Start/continue appropriate anticoagulation',
            'Ensure follow-up within 24–72 hours',
            'Patient education on bleeding and recurrence symptoms',
          ],
        };
      }
      return {
        score,
        label: 'Not Hestia-eligible for outpatient care',
        interpretation: `${score} Hestia criterion(ia) positive. Inpatient (or observation) management recommended until barriers resolve.`,
        riskLevel: score >= 3 ? 'high' : 'moderate',
        details: [{ label: 'Positive criteria', value: String(score) }],
        recommendations: ['Admit or observe', 'Treat PE per severity', 'Address reversible exclusion reasons'],
      };
    },
    evidence: {
      summary:
        'Hestia: outpatient PE if none of 11 pragmatic exclusion criteria (instability, need for advanced therapy, bleed risk, O₂, breakthrough PE, IV pain, social/medical needs, CrCl<30, severe liver disease, pregnancy, HIT).',
      formula: 'Eligible only if every criterion is absent (all “no”).',
      validation: 'Zondag et al. and subsequent outpatient PE trials/cohorts support safety when criteria met.',
      references: [
        {
          title: 'Outpatient treatment in patients with acute pulmonary embolism: the Hestia Study',
          citation: 'Zondag W et al. J Thromb Haemost. 2011;9:1500-1507',
          year: 2011,
          pmid: '21645235',
          doi: '10.1111/j.1538-7836.2011.04388.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'All criteria no', actions: ['Discharge on anticoagulation', 'Early follow-up', 'Return precautions'] },
      { condition: 'Any criterion yes', actions: ['Hospitalize or observe', 'Risk-stratify (PESI/sPESI, RV strain)'] },
    ],
    pearls: [
      'Hestia complements — does not replace — RV assessment and sPESI/PESI in many pathways.',
      'Local protocols may add RV dysfunction or elevated biomarkers as admission criteria.',
    ],
  },

  {
    id: 'ottawa-foot',
    name: 'Ottawa Foot Rules',
    shortName: 'Ottawa Foot',
    description: 'Determines need for midfoot radiographs after acute blunt injury.',
    category: 'orthopedics',
    tags: ['foot', 'xray', 'ottawa', 'trauma'],
    whenToUse: 'Acute midfoot injury; reliable exam (typically within 10 days of injury).',
    whyUse: 'High sensitivity for clinically significant midfoot fractures; reduces unnecessary films.',
    inputs: [
      yesNo('midfootPain', 'Pain in the midfoot zone', 0, 'Midfoot zone = dorsal aspect of the foot including navicular, cuboid, cuneiforms, and metatarsal bases (not the malleolar/ankle zone). Use Ottawa Ankle Rules if pain is over the malleoli.'),
      yesNo('navicular', 'Bone tenderness at the navicular', 0, 'Palpate the navicular on the medial midfoot (prominence distal to the talar head). Bony point tenderness, not soft-tissue pain alone.'),
      yesNo('base5', 'Bone tenderness at the base of the 5th metatarsal', 0, 'Palpate the styloid/base of the 5th metatarsal on the lateral midfoot (insertion of peroneus brevis).'),
      yesNo('walk', 'Unable to bear weight 4 steps both immediately AND in the ED', 0, 'Cannot take 4 steps (2 on each foot, limping allowed) both at the scene/immediately after injury AND in the ED. Able to walk in either setting = negative for this item.'),
    ],
    calculate(values) {
      const midfootPain = bool(values.midfootPain);
      const navicular = bool(values.navicular);
      const base5 = bool(values.base5);
      const walk = bool(values.walk);
      const xray = midfootPain && (navicular || base5 || walk);

      const details = [
        { label: 'Midfoot zone pain', value: midfootPain ? 'Yes' : 'No' },
        { label: 'Navicular tenderness', value: navicular ? 'Yes' : 'No' },
        { label: 'Base of 5th metatarsal tenderness', value: base5 ? 'Yes' : 'No' },
        { label: 'Unable to walk 4 steps (immediate + ED)', value: walk ? 'Yes' : 'No' },
      ];

      if (xray) {
        return {
          score: 1,
          label: 'Foot X-ray indicated',
          interpretation:
            'Ottawa Foot Rules positive (midfoot pain plus tenderness at navicular or 5th MT base, or inability to bear weight). Obtain foot radiographs.',
          riskLevel: 'moderate' as const,
          details,
          recommendations: ['Foot X-ray series', 'Immobilize pending results if high suspicion'],
        };
      }
      if (!midfootPain) {
        return {
          score: 0,
          label: 'Rules not applicable / negative',
          interpretation:
            'No midfoot-zone pain — Ottawa Foot Rules target midfoot injuries. Assess ankle rules separately if malleolar-zone pain.',
          riskLevel: 'info' as const,
          details,
        };
      }
      return {
        score: 0,
        label: 'Foot X-ray not required',
        interpretation:
          'Midfoot pain present but no navicular/5th MT tenderness and able to bear weight — radiograph not required if exam reliable.',
        riskLevel: 'low' as const,
        details,
        recommendations: ['RICE', 'Weight bearing as tolerated', 'Follow-up if not improving'],
      };
    },
    evidence: {
      summary:
        'Ottawa Foot Rules: midfoot pain AND (navicular tenderness OR base of 5th metatarsal tenderness OR inability to bear weight 4 steps immediately and in ED).',
      validation: 'Validated with Ottawa Ankle Rules; near-complete sensitivity for clinically important midfoot fractures.',
      references: [
        {
          title: 'Decision rules for use of radiography in acute ankle injuries',
          citation: 'Stiell IG et al. JAMA. 1993;269:1127-1132',
          year: 1993, pmid: '8433468',
          doi: '10.1001/jama.269.9.1127', },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Foot radiographs', 'Ortho referral if fracture'] },
      { condition: 'Negative', actions: ['Conservative care', 'Reassess if persistent pain'] },
    ],
    pearls: [
      'Use Ottawa Ankle Rules for malleolar-zone injuries; foot rules for midfoot zone.',
      'Intoxication, altered mental status, or distracting injury reduces reliability.',
    ],
  },

  {
    id: 'mallampati',
    name: 'Modified Mallampati Classification',
    shortName: 'Mallampati',
    description: 'Oropharyngeal visibility class (I–IV) used in difficult airway prediction.',
    category: 'emergency',
    tags: ['airway', 'intubation', 'mallampati', 'anesthesia'],
    whenToUse: 'Pre-intubation or pre-sedation airway assessment (patient sitting, mouth open, tongue out, no phonation).',
    whyUse: 'Quick component of multivariable difficult-airway assessment (e.g., LEMON); alone has limited predictive value.',
    inputs: [
      selectInput(
        'class',
        'Modified Mallampati class',
        [
          { label: 'Class I — Soft palate, fauces, uvula, pillars', value: 1, description: 'Full view: uvula, fauces, anterior and posterior pillars, and soft palate all visible.' },
          { label: 'Class II — Soft palate, fauces, uvula', value: 2, description: 'Uvula (including the tip) and fauces visible; pillars hidden by the tongue.' },
          { label: 'Class III — Soft palate and base of uvula only', value: 3, description: 'Only the base of the uvula and the soft palate seen; uvula tip and fauces hidden.' },
          { label: 'Class IV — Hard palate only', value: 4, description: 'Soft palate not visible at all — hard palate only.' },
        ],
        1,
        'Patient sitting, mouth fully open, tongue protruded, no phonation (“ahh” falsely improves the view). Score the resting view.',
      ),
    ],
    calculate(values) {
      const cls = num(values.class, 1);
      if (cls <= 2) {
        return {
          score: cls,
          label: `Mallampati class ${cls} — lower concern`,
          interpretation:
            cls === 1
              ? 'Full oropharyngeal structures visible. Lower likelihood of difficult glottic view alone; still perform full airway exam.'
              : 'Uvula visible but pillars may be obscured. Intermediate anatomy; combine with thyromental distance, neck mobility, and obstruction assessment.',
          riskLevel: 'low' as const,
          details: [{ label: 'Class', value: String(cls) }],
        };
      }
      if (cls === 3) {
        return {
          score: 3,
          label: 'Mallampati class III — elevated concern',
          interpretation:
            'Only soft palate and base of uvula seen. Associated with higher rates of difficult laryngoscopy; prepare difficult-airway plan.',
          riskLevel: 'moderate' as const,
          details: [{ label: 'Class', value: '3' }],
          recommendations: ['Video laryngoscopy available', 'Backup airway devices ready', 'Experienced operator'],
        };
      }
      return {
        score: 4,
        label: 'Mallampati class IV — high concern',
        interpretation:
          'Hard palate only. Highest Mallampati class; increased difficult airway risk. Plan primary and rescue strategies before induction.',
        riskLevel: 'high' as const,
        details: [{ label: 'Class', value: '4' }],
        recommendations: [
          'Difficult airway cart',
          'Strongly consider awake approach if other predictors present',
          'Double setup / surgical airway readiness as indicated',
        ],
      };
    },
    evidence: {
      summary: 'Modified Mallampati (Samsoon & Young): class I–IV based on visible oropharyngeal structures with tongue protruded.',
      formula: 'I: pillars+uvula+soft palate; II: uvula+soft palate; III: soft palate/base of uvula; IV: hard palate only.',
      validation: 'Modest sensitivity/specificity alone; best used within multivariable scores (LEMON, MACOCHA, etc.).',
      references: [
        {
          title: 'Difficult tracheal intubation: a retrospective study (modified Mallampati)',
          citation: 'Samsoon GL, Young JR. Anaesthesia. 1987;42:487-490',
          year: 1987, pmid: '3592174',
          doi: '10.1111/j.1365-2044.1987.tb04039.x', },
      ],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Standard airway prep', 'Still assess full LEMON features'] },
      { condition: 'Class III–IV', actions: ['Difficult airway preparation', 'Consider VL first-pass'] },
    ],
    pearls: [
      'Phonation falsely improves the view — assess without saying “ahh”.',
      'Supine ED patients may not match classic sitting classification.',
    ],
  },

  {
    id: 'shock-index',
    name: 'Shock Index',
    shortName: 'SI',
    description: 'Heart rate divided by systolic blood pressure; marker of occult shock and illness severity.',
    category: 'emergency',
    tags: ['shock', 'trauma', 'hemodynamics', 'triage'],
    whenToUse: 'Trauma, hemorrhage risk, sepsis, or any undifferentiated illness when occult hypoperfusion is a concern.',
    whyUse: 'May rise before frank hypotension; correlates with transfusion need, lactate, and mortality in several cohorts.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 20, max: 300, step: 1, defaultValue: 90, helpText: 'SI = HR / SBP. Normal often ~0.5–0.7; ≥0.9 is a common occult-shock concern threshold.' }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 300, step: 1, defaultValue: 120, helpText: 'Use the same-time SBP as the HR (not a later treated pressure).' }),
    ],
    calculate(values) {
      const hr = num(values.hr, 0);
      const sbp = num(values.sbp, 0);
      if (sbp <= 0 || hr <= 0) {
        return {
          score: 0,
          label: 'Invalid inputs',
          interpretation: 'Enter positive HR and SBP to calculate shock index.',
          riskLevel: 'info' as const,
        };
      }
      const si = round(hr / sbp, 2);
      const band = riskFromThresholds(si, [
        {
          max: 0.6,
          level: 'low',
          label: 'Low / normal SI',
          interpretation: `SI ${si} (HR ${hr} / SBP ${sbp}). Generally reassuring, but does not exclude shock in beta-blocked or athletic patients.`,
        },
        {
          max: 0.9,
          level: 'normal',
          label: 'Normal to intermediate SI',
          interpretation: `SI ${si}. Common resting range ~0.5–0.7; upper end warrants clinical correlation and serial vitals.`,
        },
        {
          max: 1.2,
          level: 'moderate',
          label: 'Elevated SI — occult shock concern',
          interpretation: `SI ${si}. Associated with increased need for intervention/transfusion in trauma and higher illness severity. Investigate hypoperfusion.`,
        },
        {
          max: 99,
          level: 'high',
          label: 'High SI — significant shock risk',
          interpretation: `SI ${si}. High likelihood of critical illness or hemorrhage. Resuscitate, identify source, and escalate monitoring.`,
        },
      ]);
      return {
        score: si,
        unit: 'HR/SBP',
        ...band,
        details: [
          { label: 'HR', value: `${hr} bpm` },
          { label: 'SBP', value: `${sbp} mmHg` },
          { label: 'SI', value: String(si) },
        ],
        recommendations:
          si >= 0.9
            ? ['Serial vitals and lactate as indicated', 'IV access / volume assessment', 'Search for bleeding or distributive shock']
            : ['Trend SI with clinical status'],
      };
    },
    evidence: {
      summary: 'Shock Index = HR / SBP. Normal often cited ~0.5–0.7; ≥0.9 frequently used as a threshold for concern.',
      formula: 'SI = heart rate (bpm) ÷ systolic BP (mmHg)',
      validation: 'Studied in trauma, postpartum hemorrhage, sepsis, and ED triage; thresholds vary by population.',
      references: [
        {
          title: 'Shock-index',
          citation: 'Allgöwer M, Burri C. Ger Med Mon. 1968;13:14-19',
          year: 1968, pmid: '5656857' },
        {
          title: 'Utility of the shock index in predicting mortality in traumatically injured patients',
          citation: 'Cannon CM et al. J Trauma. 2009;67:1426-1430',
          year: 2009,
          pmid: '20009697',
          doi: '10.1097/TA.0b013e3181bbf728',
        },
      ],
    },
    nextSteps: [
      { condition: 'SI ≥ 0.9', actions: ['Evaluate for occult shock', 'Resuscitation and source control pathway'] },
      { condition: 'SI < 0.9', actions: ['Continue standard evaluation', 'Recheck if clinical change'] },
    ],
    pearls: [
      'Age-adjusted and diastolic-based variants (SIA, SId) exist; this tool uses classic SI only.',
      'Pain, anxiety, and medications (stimulants, beta-blockers) alter HR and limit interpretation.',
    ],
  },

  {
    id: 'start-triage',
    name: 'START Triage Helper',
    shortName: 'START',
    description: 'Simple Triage and Rapid Treatment category helper for mass-casualty incidents.',
    category: 'emergency',
    tags: ['triage', 'mci', 'disaster', 'start'],
    whenToUse: 'Multi-casualty / disaster scenes using START adult triage logic.',
    whyUse: 'Rapid categorization into Minor, Delayed, Immediate, or Expectant/Deceased to prioritize resources.',
    inputs: [
      yesNo('canWalk', 'Able to walk (ambulatory / “walking wounded”)', -1, 'If the patient can walk to you (or is directed to walk) → START Minor (Green) and stop. Do not score breathing/perfusion/mental on walkers in classic START.'),
      selectInput(
        'breathing',
        'Spontaneous breathing',
        [
          { label: 'Breathing', value: 'yes', description: 'Spontaneous respirations present without an airway maneuver.' },
          { label: 'Apneic — starts breathing after airway opened', value: 'after_airway', description: 'No breathing until head-tilt/chin-lift or jaw thrust; then breaths resume → Immediate (Red).' },
          { label: 'Apneic — still not breathing after airway opened', value: 'no', description: 'Still apneic after an airway maneuver → Expectant/Deceased (Black) in classic START.' },
        ],
        undefined,
        'If not walking: look/listen/feel. If apneic, open the airway once. Then use RPM: respirations, perfusion, mental status.',
      ),
      selectInput('rr', 'Respiratory rate', [
        { label: '≤30 / min', value: 'normal', description: 'RR 1–30. Continue to perfusion (not Immediate on RR alone).' },
        { label: '>30 / min', value: 'high', description: 'RR >30 → Immediate (Red) under START. Count for ~10 s × 6 if needed.' },
        { label: 'Not assessed / not breathing', value: 'na', description: 'Use only if the breathing item already classified the patient, or RR not yet counted.' },
      ]),
      selectInput('perfusion', 'Perfusion', [
        { label: 'Radial pulse present (or CRT <2 s)', value: 'ok', description: 'Palpable radial pulse, or capillary refill <2 seconds.' },
        { label: 'Radial pulse absent (or CRT >2 s)', value: 'poor', description: 'No radial pulse or capillary refill >2 s → Immediate (Red). Control hemorrhage.' },
        { label: 'Not assessed', value: 'na', description: 'Skip only if already triaged on walking, apnea, or RR >30.' },
      ]),
      selectInput('mental', 'Mental status', [
        { label: 'Obeys commands', value: 'obeys', description: 'Follows a simple command (e.g. “squeeze my hand”). Delayed (Yellow) if RR and perfusion were also adequate.' },
        { label: 'Does not obey commands', value: 'not_obey', description: 'Unresponsive, only withdraws/moans, or cannot follow a simple command → Immediate (Red).' },
        { label: 'Not assessed', value: 'na', description: 'Skip only if already triaged on an earlier START branch.' },
      ]),
    ],
    calculate(values) {
      if (bool(values.canWalk)) {
        return {
          score: 0,
          label: 'Minor (Green)',
          interpretation: 'Ambulatory patient → START Minor. Direct to secondary triage area; reassess as resources allow.',
          riskLevel: 'low' as const,
          details: [{ label: 'START category', value: 'Minor / Green' }],
          recommendations: ['Walking wounded assembly area', 'Secondary survey when possible'],
        };
      }

      const breathing = String(values.breathing ?? 'yes');
      if (breathing === 'no') {
        return {
          score: 3,
          label: 'Expectant / Deceased (Black)',
          interpretation:
            'Not breathing after airway opened → Expectant/Deceased in classic START. Focus resources on salvageable patients; revisit if resources allow.',
          riskLevel: 'critical' as const,
          details: [{ label: 'START category', value: 'Black' }],
          recommendations: ['Mark expectant/deceased per local MCI protocol', 'Do not consume limited rescue airway resources'],
        };
      }
      if (breathing === 'after_airway') {
        return {
          score: 2,
          label: 'Immediate (Red)',
          interpretation: 'Apnea corrected by positioning/airway → Immediate. Needs urgent airway support and treatment.',
          riskLevel: 'critical' as const,
          details: [{ label: 'START category', value: 'Immediate / Red' }],
          recommendations: ['Maintain airway', 'Priority treatment/transport'],
        };
      }

      if (String(values.rr) === 'high') {
        return {
          score: 2,
          label: 'Immediate (Red)',
          interpretation: 'RR >30 → Immediate under START.',
          riskLevel: 'high' as const,
          details: [{ label: 'START category', value: 'Immediate / Red' }],
          recommendations: ['Urgent assessment of breathing/circulation', 'Priority transport'],
        };
      }
      if (String(values.perfusion) === 'poor') {
        return {
          score: 2,
          label: 'Immediate (Red)',
          interpretation: 'Poor perfusion (no radial pulse / delayed CRT) → Immediate. Control hemorrhage if present.',
          riskLevel: 'high' as const,
          details: [{ label: 'START category', value: 'Immediate / Red' }],
          recommendations: ['Hemorrhage control', 'Shock care', 'Priority transport'],
        };
      }
      if (String(values.mental) === 'not_obey') {
        return {
          score: 2,
          label: 'Immediate (Red)',
          interpretation: 'Does not obey commands → Immediate under START mental-status branch.',
          riskLevel: 'high' as const,
          details: [{ label: 'START category', value: 'Immediate / Red' }],
        };
      }

      return {
        score: 1,
        label: 'Delayed (Yellow)',
        interpretation:
          'Non-ambulatory but breathing with RR ≤30, adequate perfusion, and obeys commands → Delayed. Serious injuries possible; needs care after immediates.',
        riskLevel: 'moderate' as const,
        details: [{ label: 'START category', value: 'Delayed / Yellow' }],
        recommendations: ['Secondary triage', 'Monitor for deterioration to Immediate'],
      };
    },
    evidence: {
      summary:
        'START: Walk → Minor; apnea after airway → Dead/Expectant; RR>30 or poor perfusion or fails commands → Immediate; else Delayed.',
      formula: 'RPM: Respirations, Perfusion, Mental status after mobility filter.',
      validation: 'Widely taught MCI system (Newport Beach FD / Hoag); JumpSTART used for pediatrics; local variants exist (SALT).',
      references: [
        {
          title: 'Disaster triage: START, then SAVE—a new method of dynamic triage for victims of a catastrophic earthquake',
          citation: 'Benson M, Koenig KL, Schultz CH. Prehosp Disaster Med. 1996;11:117-124',
          year: 1996,
          pmid: '10159733',
          doi: '10.1017/s1049023x0004276x',
        },
        {
          title: 'START Adult Triage Algorithm',
          citation: 'Radiation Emergency Medical Management (REMM), U.S. Department of Health and Human Services',
          year: 1983,
          url: 'https://remm.hhs.gov/startadult.htm',
        },
      ],
    },
    nextSteps: [
      { condition: 'Red / Immediate', actions: ['Life-saving interventions', 'Priority transport'] },
      { condition: 'Yellow / Delayed', actions: ['Urgent but not first-wave care', 'Re-triage periodically'] },
      { condition: 'Green / Minor', actions: ['Secondary area', 'Reassess'] },
      { condition: 'Black', actions: ['Expectant care per protocol', 'Re-evaluate if resource surge'] },
    ],
    pearls: [
      'Educational helper — follow local MCI / SALT / regional protocol when it differs.',
      'Massive hemorrhage control may be performed before full START sorting in modern systems.',
    ],
  },

  {
    id: 'nexus-chest',
    name: 'NEXUS Chest Decision Rule',
    shortName: 'NEXUS Chest',
    description: 'Identifies blunt trauma patients at very low risk of thoracic injury who may forgo chest imaging.',
    category: 'emergency',
    tags: ['chest', 'trauma', 'cxr', 'nexus'],
    whenToUse: 'Blunt trauma patients ≥15 years being considered for chest X-ray or chest CT.',
    whyUse: 'If all criteria absent, very low risk of clinically significant thoracic injury; imaging may be avoided.',
    inputs: [
      yesNo('age60', 'Age >60 years'),
      yesNo('rapidDecel', 'Rapid deceleration mechanism (e.g., fall >20 ft, MVC >40 mph)'),
      yesNo('chestPain', 'Chest pain', 1, 'Any chest pain attributed to this blunt trauma (not a remote chronic pain unchanged from baseline).'),
      yesNo('intox', 'Intoxication', 1, 'Alcohol or drugs impairing alertness (same operational idea as NEXUS C-spine).'),
      yesNo('ams', 'Abnormal alertness / mental status', 1, 'GCS <15, disoriented, or delayed/inappropriate response.'),
      yesNo('distracting', 'Distracting painful injury', 1, 'Clinically significant extra-thoracic injury that impairs a reliable chest exam (long-bone fracture, visceral injury, large laceration, crush, degloving, severe burn).'),
      yesNo('tenderness', 'Tenderness to chest wall palpation', 1, 'Bony or chest-wall tenderness on palpation of the sternum, ribs, or thoracic spine — not isolated abdominal or cervical tenderness.'),
    ],
    calculate(values) {
      const keys = ['age60', 'rapidDecel', 'chestPain', 'intox', 'ams', 'distracting', 'tenderness'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score === 0) {
        return {
          score: 0,
          label: 'NEXUS Chest negative — imaging not required',
          interpretation:
            'No NEXUS Chest criteria. Very low risk of thoracic injury; chest radiograph not required by the rule if clinical context matches validation setting.',
          riskLevel: 'low' as const,
          recommendations: ['Forgo routine CXR if no other indication', 'Document rule application'],
        };
      }
      return {
        score,
        label: 'NEXUS Chest positive — consider imaging',
        interpretation: `${score} criterion(ia) present. Cannot classify as very low risk; obtain chest imaging per clinical judgment (CXR ± CT).`,
        riskLevel: score >= 3 ? 'high' : 'moderate',
        details: [{ label: 'Positive criteria', value: String(score) }],
        recommendations: ['Chest radiograph at minimum', 'CT chest if high mechanism or abnormal CXR/exam'],
      };
    },
    evidence: {
      summary:
        'NEXUS Chest: age>60, rapid deceleration, chest pain, intoxication, abnormal mentation, distracting injury, chest wall tenderness. All absent → very low risk.',
      formula: 'Image if any criterion present.',
      validation: 'Rodriguez et al. NEXUS Chest studies; high sensitivity for clinically major thoracic injury.',
      references: [
        {
          title: 'NEXUS chest imaging decision instrument',
          citation: 'Rodriguez RM et al. PLoS Med / JAMA Surg validations (NEXUS Chest)',
          year: 2013, pmid: '23925583',
          doi: '10.1001/jamasurg.2013.2757', },
      ],
    },
    nextSteps: [
      { condition: 'All criteria absent', actions: ['Omit routine chest imaging if appropriate'] },
      { condition: 'Any criterion present', actions: ['CXR or CT based on severity', 'Treat injuries found'] },
    ],
    pearls: [
      'Rule addresses thoracic injury risk, not abdominal or other systems.',
      'High-energy mechanisms often warrant CT regardless of screening CXR.',
    ],
  },

  {
    id: 'lrinec',
    name: 'LRINEC Score',
    shortName: 'LRINEC',
    description: 'Laboratory Risk Indicator for Necrotizing Fasciitis — lab-based risk score for NSTI.',
    category: 'emergency',
    tags: ['nsti', 'necrotizing fasciitis', 'infection', 'lrinec'],
    whenToUse: 'Suspected necrotizing soft tissue infection when labs are available; adjunct only.',
    whyUse: 'Helps risk-stratify; low score does not rule out NSTI if clinical suspicion is high.',
    inputs: [
      numberInput('crp', 'CRP', { unit: 'mg/L', min: 0, max: 600, step: 1, defaultValue: 50, helpText: 'Use mg/L (not mg/dL). ≥150 mg/L scores +4.' }),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0, max: 100, step: 0.1, defaultValue: 12, helpText: '15–25: +1; >25: +2' }),
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, defaultValue: 13, helpText: '11–13.5: +1; <11: +2' }),
      numberInput('na', 'Sodium', { unit: 'mmol/L', min: 100, max: 180, step: 1, defaultValue: 138, helpText: '<135 mmol/L scores +2' }),
      numberInput('cr', 'Creatinine', {
        unit: 'mg/dL',
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: 1.0,
        helpText: 'Score uses >1.6 mg/dL (≈141 µmol/L).',
      }),
      numberInput('glucose', 'Glucose', {
        unit: 'mg/dL',
        min: 20,
        max: 1000,
        step: 1,
        defaultValue: 110,
        helpText: 'Score uses >180 mg/dL (≈10 mmol/L).',
      }),
    ],
    calculate(values) {
      const crp = num(values.crp, 0);
      const wbc = num(values.wbc, 0);
      const hb = num(values.hb, 0);
      const na = num(values.na, 0);
      const cr = num(values.cr, 0);
      const glucose = num(values.glucose, 0);

      let score = 0;
      if (crp >= 150) score += 4;

      if (wbc > 25) score += 2;
      else if (wbc >= 15) score += 1;

      if (hb < 11) score += 2;
      else if (hb <= 13.5) score += 1;

      if (na < 135) score += 2;
      if (cr > 1.6) score += 2;
      if (glucose > 180) score += 1;

      const band = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low risk (LRINEC ≤5)',
          interpretation: `LRINEC ${score}. Lower likelihood of necrotizing infection in derivation cohorts, but do not exclude NSTI if pain out of proportion, crepitus, rapid spread, or systemic toxicity.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate risk (LRINEC 6–7)',
          interpretation: `LRINEC ${score}. Intermediate probability. Maintain high suspicion; early surgical exploration if clinical signs of NSTI.`,
        },
        {
          max: 99,
          level: 'high',
          label: 'High risk (LRINEC ≥8)',
          interpretation: `LRINEC ${score}. High risk of necrotizing soft tissue infection. Urgent surgical consultation and broad-spectrum antibiotics.`,
        },
      ]);

      return {
        score,
        ...band,
        details: [
          { label: 'CRP points', value: crp >= 150 ? '4' : '0' },
          { label: 'WBC points', value: wbc > 25 ? '2' : wbc >= 15 ? '1' : '0' },
          { label: 'Hb points', value: hb < 11 ? '2' : hb <= 13.5 ? '1' : '0' },
          { label: 'Na / Cr / Glu points', value: `${na < 135 ? 2 : 0} / ${cr > 1.6 ? 2 : 0} / ${glucose > 180 ? 1 : 0}` },
        ],
        recommendations:
          score >= 6
            ? ['Emergent surgical consult', 'Broad-spectrum abx including toxin suppression', 'Resuscitation / ICU as needed']
            : ['Reassess clinically', 'Image or explore if suspicion remains'],
      };
    },
    evidence: {
      summary:
        'LRINEC: CRP≥150 (+4); WBC 15–25 (+1) or >25 (+2); Hb 11–13.5 (+1) or <11 (+2); Na<135 (+2); Cr>1.6 mg/dL (+2); glucose>180 mg/dL (+1).',
      formula: 'Sum 0–13; ≤5 low, 6–7 intermediate, ≥8 high (classic cutoffs).',
      validation: 'Wong et al. 2004; external performance variable — clinical judgment supersedes score.',
      references: [
        {
          title: 'The LRINEC (Laboratory Risk Indicator for Necrotizing Fasciitis) score',
          citation: 'Wong CH et al. Crit Care Med. 2004;32:1535-1541',
          year: 2004,
          pmid: '15241098',
          doi: '10.1097/01.ccm.0000129486.35458.7d',
        },
      ],
    },
    nextSteps: [
      { condition: '≥6 or high clinical suspicion', actions: ['Urgent surgical consult / OR exploration', 'Antibiotics', 'Supportive care'] },
      { condition: '≤5 with low suspicion', actions: ['Treat cellulitis pathway', 'Close follow-up / observation'] },
    ],
    pearls: [
      'A low LRINEC never rules out necrotizing infection.',
      'CRP units must be mg/L (not mg/dL).',
    ],
  },

  {
    id: 'baux-score',
    name: 'Baux Score (Burn Mortality)',
    shortName: 'Baux',
    description: 'Age + %TBSA (± inhalation) estimate of burn mortality risk (original and revised).',
    category: 'emergency',
    tags: ['burn', 'baux', 'mortality', 'tbsa'],
    whenToUse: 'Major burns for rapid prognostic estimate and burn-center communication.',
    whyUse: 'Simple mortality correlate; revised Baux adds inhalation injury weight.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 40 }),
      numberInput('tbsa', 'TBSA burned', { unit: '%', min: 0, max: 100, step: 1, defaultValue: 20, helpText: 'Partial- + full-thickness (2nd/3rd degree) only; exclude isolated first-degree/superficial erythema. Estimate with Lund-Browder (preferred) or Rule of Nines; patient palm ≈ 1%.' }),
      yesNo('inhalation', 'Inhalation injury (+17 on revised Baux)', 17, 'Clinically diagnosed inhalation injury (closed-space fire, carbonaceous sputum, facial burns/singed hairs plus airway signs) or bronchoscopy-confirmed.'),
    ],
    calculate(values) {
      const age = num(values.age, 0);
      const tbsa = num(values.tbsa, 0);
      const original = round(age + tbsa, 1);
      const revised = round(original + (bool(values.inhalation) ? 17 : 0), 1);

      // Rough modern interpretation bands on revised Baux (educational)
      const band = riskFromThresholds(revised, [
        {
          max: 60,
          level: 'low',
          label: 'Lower predicted mortality',
          interpretation: `Original Baux ${original}; revised Baux ${revised}. Relatively favorable in modern burn care, but individual factors dominate.`,
        },
        {
          max: 100,
          level: 'moderate',
          label: 'Intermediate predicted mortality',
          interpretation: `Original Baux ${original}; revised Baux ${revised}. Meaningful mortality risk — aggressive resuscitation and burn-center care.`,
        },
        {
          max: 140,
          level: 'high',
          label: 'High predicted mortality',
          interpretation: `Original Baux ${original}; revised Baux ${revised}. High mortality historically; modern care improves outcomes but prognosis remains guarded.`,
        },
        {
          max: 999,
          level: 'critical',
          label: 'Very high predicted mortality',
          interpretation: `Original Baux ${original}; revised Baux ${revised}. Extremely high risk. Goals-of-care discussion alongside maximal therapy when appropriate.`,
        },
      ]);

      return {
        score: revised,
        unit: 'revised Baux',
        ...band,
        details: [
          { label: 'Original Baux (age + TBSA)', value: String(original) },
          { label: 'Revised Baux (+17 if inhalation)', value: String(revised) },
          { label: 'Inhalation', value: bool(values.inhalation) ? 'Yes' : 'No' },
        ],
        recommendations: ['ABA burn-center transfer criteria', 'Airway assessment if inhalation', 'Parkland/titrate fluids'],
      };
    },
    evidence: {
      summary: 'Original Baux = age + %TBSA. Revised (Osler) Baux = age + %TBSA + 17 if inhalation injury.',
      formula: 'Revised Baux = age + TBSA + (17 if inhalation)',
      validation: 'Classic prognostic index; absolute mortality for a given score has fallen with modern burn care.',
      references: [
        {
          title: 'Revised Baux Score',
          citation: 'Osler T et al. J Trauma. 2010;68:690-694; Baux S. historical thesis',
          year: 2010, pmid: '20038856',
          doi: '10.1097/TA.0b013e3181c453b3', },
      ],
    },
    nextSteps: [
      { condition: 'Major burn / high Baux', actions: ['Burn center transfer', 'Airway & fluid resuscitation', 'Tetanus, analgesia'] },
    ],
    pearls: [
      'Scores are educational estimates — not definitive survival predictions.',
      'Comorbidities, depth, and delays to care are not included.',
    ],
  },

  {
    id: 'absi-burn',
    name: 'Abbreviated Burn Severity Index (ABSI)',
    shortName: 'ABSI',
    description: 'Composite burn severity score from sex, age, inhalation, full-thickness burn, and TBSA.',
    category: 'emergency',
    tags: ['burn', 'absi', 'severity', 'mortality'],
    whenToUse: 'Acute burn evaluation for severity stratification and prognosis communication.',
    whyUse: 'Incorporates depth and inhalation beyond simple Baux; maps to rough survival bands.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male (0)', value: 0 },
        { label: 'Female (+1)', value: 1 },
      ]),
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 40 }),
      yesNo('inhalation', 'Inhalation injury (+1)', 1, 'Clinically diagnosed inhalation injury (closed-space fire, carbonaceous sputum, facial burns/singed hairs plus airway signs) or bronchoscopy-confirmed.'),
      yesNo('fullThickness', 'Full-thickness burn present (+1)', 1, 'Any full-thickness (3rd degree) area adds +1 in addition to TBSA-category points.'),
      numberInput('tbsa', 'TBSA burned', { unit: '%', min: 0, max: 100, step: 1, defaultValue: 20, helpText: 'Partial- + full-thickness (2nd/3rd degree) only; exclude isolated first-degree/superficial erythema. Estimate with Lund-Browder (preferred) or Rule of Nines; patient palm ≈ 1%. Full-thickness presence is scored separately (+1).' }),
    ],
    calculate(values) {
      const sexPts = num(values.sex, 0) === 1 ? 1 : 0;
      const age = num(values.age, 0);
      let agePts = 1;
      if (age >= 81) agePts = 5;
      else if (age >= 61) agePts = 4;
      else if (age >= 41) agePts = 3;
      else if (age >= 21) agePts = 2;
      else agePts = 1;

      const inhPts = bool(values.inhalation) ? 1 : 0;
      const ftPts = bool(values.fullThickness) ? 1 : 0;
      const tbsa = num(values.tbsa, 0);
      let tbsaPts = 1;
      if (tbsa >= 91) tbsaPts = 10;
      else if (tbsa >= 81) tbsaPts = 9;
      else if (tbsa >= 71) tbsaPts = 8;
      else if (tbsa >= 61) tbsaPts = 7;
      else if (tbsa >= 51) tbsaPts = 6;
      else if (tbsa >= 41) tbsaPts = 5;
      else if (tbsa >= 31) tbsaPts = 4;
      else if (tbsa >= 21) tbsaPts = 3;
      else if (tbsa >= 11) tbsaPts = 2;
      else tbsaPts = 1;

      const score = sexPts + agePts + inhPts + ftPts + tbsaPts;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';
      if (score <= 3) {
        riskLevel = 'low';
        label = 'Very low threat to life';
        interpretation = `ABSI ${score}: very low predicted mortality (survival often ≥99% in classic tables).`;
      } else if (score <= 5) {
        riskLevel = 'low';
        label = 'Low / moderate threat';
        interpretation = `ABSI ${score}: moderate severity; high expected survival with standard burn care.`;
      } else if (score <= 7) {
        riskLevel = 'moderate';
        label = 'Moderately severe';
        interpretation = `ABSI ${score}: moderately severe; survival historically ~80–90%. Burn-center care advised.`;
      } else if (score <= 9) {
        riskLevel = 'high';
        label = 'Serious threat to life';
        interpretation = `ABSI ${score}: serious; survival historically ~50–70%. Aggressive multidisciplinary care.`;
      } else if (score <= 11) {
        riskLevel = 'high';
        label = 'Severe threat to life';
        interpretation = `ABSI ${score}: severe; survival historically ~20–40%.`;
      } else {
        riskLevel = 'critical';
        label = 'Maximum threat to life';
        interpretation = `ABSI ${score}: maximum severity band; survival historically ≤10%. Align care with goals and burn-center expertise.`;
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Sex points', value: String(sexPts) },
          { label: 'Age points', value: String(agePts) },
          { label: 'Inhalation points', value: String(inhPts) },
          { label: 'Full-thickness points', value: String(ftPts) },
          { label: 'TBSA points', value: String(tbsaPts) },
        ],
        recommendations: ['Burn center referral per ABA criteria', 'Airway management if inhalation', 'Fluid resuscitation and wound care'],
      };
    },
    evidence: {
      summary:
        'ABSI: female +1; age bands 1–5; inhalation +1; full-thickness +1; TBSA deciles 1–10 points.',
      formula: 'ABSI = sex + age category + inhalation + full-thickness + TBSA category',
      validation: 'Tobiasen et al.; classic survival tables — modern outcomes may be better than historical percentages.',
      references: [
        {
          title: 'The abbreviated burn severity index',
          citation: 'Tobiasen J et al. Ann Emerg Med. 1982;11:260-262',
          year: 1982, pmid: '7073049',
          doi: '10.1016/s0196-0644(82)80096-6', },
      ],
    },
    nextSteps: [
      { condition: 'ABSI ≥6', actions: ['Burn center transfer', 'ICU-level monitoring as needed'] },
      { condition: 'ABSI ≤5', actions: ['Standard burn care', 'Transfer if other ABA criteria met'] },
    ],
    pearls: [
      'Survival percentages are historical educational estimates, not precise modern predictions.',
      'Partial-thickness-only burns still accrue TBSA points; full-thickness adds one extra point if any FT present.',
    ],
  },

  {
    id: 'lemon-airway',
    name: 'LEMON Difficult Airway Assessment',
    shortName: 'LEMON',
    description: 'Counts LEMON criteria predicting difficult laryngoscopy / intubation.',
    category: 'emergency',
    tags: ['airway', 'intubation', 'lemon', 'difficult airway'],
    whenToUse: 'Before RSI or elective intubation to anticipate difficult airway.',
    whyUse: 'Structured mnemonic prompts preparation of equipment, personnel, and backup plans.',
    inputs: [
      yesNo('look', 'L — Look externally (trauma, large incisors, beard, large tongue, etc.)', 1, 'Any concerning external feature: facial trauma, beard, large tongue, protruding incisors, small mandible, or short/thick neck.'),
      yesNo('evaluate', 'E — Evaluate 3-3-2 rule unsatisfactory (mouth opening, hyomental, thyrohyoid)', 1, 'Patient’s own fingerbreadths: 3 between incisors (mouth opening); 3 mentum to hyoid; 2 hyoid to thyroid notch. Unsatisfactory if any interval is less.'),
      yesNo('mallampati', 'M — Mallampati class ≥3', 1, 'Modified Mallampati III (soft palate and uvula base only) or IV (hard palate only). Sitting, tongue out, no phonation.'),
      yesNo('obstruction', 'O — Obstruction (epiglottitis, abscess, trauma, tumor, angioedema)'),
      yesNo('neck', 'N — Neck mobility limited', 1, 'Limited cervical extension or inability to assume sniffing position (collar, ankylosis, arthritis, prior fusion).'),
    ],
    calculate(values) {
      const keys = ['look', 'evaluate', 'mallampati', 'obstruction', 'neck'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score === 0) {
        return {
          score: 0,
          label: 'No LEMON criteria — lower predicted difficulty',
          interpretation:
            'No listed predictors. Difficulty still possible — always prepare for failure of first attempt.',
          riskLevel: 'low' as const,
          recommendations: ['Standard RSI preparation', 'EtCO₂ and suction ready'],
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Some difficult-airway predictors',
          interpretation: `${score}/5 LEMON criteria. Increased chance of difficult view or intubation. Optimize position, consider video laryngoscopy, and stage backups.`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'LEMON positives', value: `${score} / 5` }],
          recommendations: ['Video laryngoscopy available', 'Bougie / extraglottic device ready', 'Call for help early'],
        };
      }
      return {
        score,
        label: 'Multiple difficult-airway predictors',
        interpretation: `${score}/5 LEMON criteria. High anticipated difficulty. Strongly consider awake technique when feasible, double setup, and surgical airway readiness.`,
        riskLevel: 'high' as const,
        details: [{ label: 'LEMON positives', value: `${score} / 5` }],
        recommendations: [
          'Difficult airway cart at bedside',
          'Most experienced operator',
          'Define fail points before induction',
          'Ready for front-of-neck access',
        ],
      };
    },
    evidence: {
      summary: 'LEMON: Look externally, Evaluate 3-3-2, Mallampati, Obstruction, Neck mobility. More positives → higher difficulty risk.',
      formula: 'Count of positive domains (0–5).',
      validation: 'Taught in ATLS/airway courses; predictive performance modest — preparation is the main benefit.',
      references: [
        {
          title: 'Can an airway assessment score predict difficulty at intubation in the emergency department?',
          citation: 'Reed MJ et al. Emerg Med J. 2005;22:99-102; ATLS difficult airway teaching',
          year: 2005, pmid: '15662057',
          doi: '10.1136/emj.2003.008771', },
      ],
    },
    nextSteps: [
      { condition: '0 criteria', actions: ['Standard difficult-airway precautions still apply'] },
      { condition: '≥1 criterion', actions: ['Plan A/B/C', 'VL and rescue devices', 'Help at bedside if high score'] },
    ],
    pearls: [
      '3-3-2: 3 fingers mouth opening, 3 hyomental, 2 thyrohyoid (approximate).',
      'Obstruction and neck pathology often matter more than Mallampati alone.',
    ],
  },
];
