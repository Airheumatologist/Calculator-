import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave3CardioVascCalcs: Calculator[] = [
  {
    id: 'scai-shock',
    name: 'SCAI Cardiogenic Shock Stages',
    shortName: 'SCAI Shock',
    description:
      'Society for Cardiovascular Angiography and Interventions (SCAI) cardiogenic shock classification A–E for communication and care intensity.',
    category: 'cardiology',
    tags: ['cardiogenic shock', 'scai', 'shock', 'hemodynamics', 'mcs'],
    whenToUse: 'Patients with or at risk for cardiogenic shock (AMI, decompensated HF, post-arrest) to stage severity.',
    whyUse: 'Standardized language for shock trajectory; guides monitoring, vasoactives, MCS, and team activation.',
    inputs: [
      selectInput('stage', 'SCAI stage (best clinical fit)', [
        {
          label: 'A — At risk',
          value: 0,
          description: 'Hemodynamically stable; large MI, prior infarct, or acute HF without hypoperfusion',
        },
        {
          label: 'B — Beginning shock',
          value: 1,
          description: 'Relative hypotension or tachycardia without hypoperfusion',
        },
        {
          label: 'C — Classic shock',
          value: 2,
          description: 'Hypoperfusion requiring intervention beyond volume resuscitation',
        },
        {
          label: 'D — Deteriorating',
          value: 3,
          description: 'Failing to respond to initial interventions; escalating support',
        },
        {
          label: 'E — Extremis',
          value: 4,
          description: 'Circulatory collapse, actual/impending arrest, refractory shock',
        },
      ]),
      yesNo('lactateHigh', 'Lactate elevated (e.g. >2 mmol/L) or rising', 1),
      yesNo('vasoactive', 'On vasopressor and/or inotrope', 1),
      yesNo('mcs', 'Mechanical circulatory support in use or imminent', 1),
    ],
    calculate(values) {
      const stage = num(values.stage, 0);
      const labels = ['A — At risk', 'B — Beginning', 'C — Classic', 'D — Deteriorating', 'E — Extremis'];
      const levels: Array<'low' | 'moderate' | 'high' | 'critical'> = ['low', 'moderate', 'high', 'critical', 'critical'];
      const interpretations = [
        'Stage A: at risk for cardiogenic shock but currently stable without hypoperfusion. Prevent deterioration; urgent revascularization when indicated; monitor closely.',
        'Stage B: beginning shock — relative hypotension/tachycardia without hypoperfusion. Escalate monitoring; treat cause; prepare for decompensation.',
        'Stage C: classic cardiogenic shock with hypoperfusion requiring intervention beyond volume (vasoactives ± temporary MCS). Activate shock team pathways.',
        'Stage D: deteriorating — not responding to initial support; rising lactate/escalating vasoactives/MCS. Urgent advanced therapies discussion.',
        'Stage E: extremis — collapse, cardiac arrest, or refractory shock. Maximal resuscitation, MCS if appropriate, and goals-of-care parallel planning.',
      ];
      const flags = [
        bool(values.lactateHigh) ? 'Elevated/rising lactate' : null,
        bool(values.vasoactive) ? 'Vasoactive support' : null,
        bool(values.mcs) ? 'MCS' : null,
      ].filter(Boolean) as string[];

      return {
        score: stage,
        label: labels[stage] ?? labels[0],
        interpretation: interpretations[stage] ?? interpretations[0],
        riskLevel: levels[stage] ?? 'moderate',
        details: [
          { label: 'SCAI stage', value: ['A', 'B', 'C', 'D', 'E'][stage] ?? 'A' },
          { label: 'Support / perfusion flags', value: flags.length ? flags.join('; ') : 'None selected' },
        ],
        recommendations:
          stage >= 2
            ? [
                'Shock team / advanced HF–critical care involvement',
                'Address etiology (revascularization, arrhythmia, mechanical complication)',
                'Escalate vasoactives/MCS per phenotype and institutional protocol',
              ]
            : ['Close hemodynamic monitoring', 'Treat reversible drivers', 'Early recognition of progression to C'],
      };
    },
    evidence: {
      summary:
        'SCAI expert consensus defines stages A–E describing the continuum from at-risk to extremis cardiogenic shock for standardized communication and care.',
      formula: 'Clinical stage A–E based on hemodynamics, hypoperfusion, response to therapy, and collapse',
      validation: 'Widely adopted staging framework; associates with mortality gradients in AMI and HF shock cohorts.',
      references: [
        {
          title: 'SCAI clinical expert consensus statement on the classification of cardiogenic shock',
          citation: 'Baran DA et al. Catheter Cardiovasc Interv. 2019',
          year: 2019,
          pmid: '31104355',
          doi: '10.1002/ccd.28329',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage A–B', actions: ['Prevent progression', 'Monitor lactate/vitals', 'Urgent etiology-directed therapy'] },
      { condition: 'Stage C–E', actions: ['Shock team', 'Consider PAC/echo-guided therapy', 'MCS evaluation', 'ICU-level care'] },
    ],
    pearls: [
      'Stage reflects current phenotype and can change rapidly with treatment.',
      'Hypoperfusion can exist with “normal” BP (cold and wet without frank hypotension).',
    ],
  },
  {
    id: 'intermacs',
    name: 'INTERMACS Patient Profile',
    shortName: 'INTERMACS',
    description: 'INTERMACS profiles 1–7 describing advanced heart failure acuity for MCS/transplant triage communication.',
    category: 'cardiology',
    tags: ['heart failure', 'intermacs', 'lvad', 'mcs', 'transplant'],
    whenToUse: 'Advanced HF evaluation for durable MCS, transplant listing discussions, or acuity communication.',
    whyUse: 'Profiles correlate with outcomes after LVAD/transplant and standardize “how sick” language.',
    inputs: [
      selectInput('profile', 'INTERMACS profile', [
        { label: '1 — Crash and burn (critical cardiogenic shock)', value: 1 },
        { label: '2 — Progressive decline on inotropes', value: 2 },
        { label: '3 — Stable but inotrope-dependent', value: 3 },
        { label: '4 — Resting symptoms at home on oral therapy', value: 4 },
        { label: '5 — Exertion intolerant; comfortable at rest; housebound', value: 5 },
        { label: '6 — Exertion limited; can do mild activity', value: 6 },
        { label: '7 — Advanced NYHA III', value: 7 },
      ]),
      yesNo('tempModifier', 'Temporary circulatory support modifier (e.g. IABP/Impella/ECMO)', 1),
      yesNo('arrhythmiaModifier', 'Frequent ventricular arrhythmia modifier', 1),
    ],
    calculate(values) {
      const p = num(values.profile, 4);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'INTERMACS 1 — Crash and burn',
          interpretation:
            'Critical cardiogenic shock with life-threatening hypoperfusion despite escalating support. Highest acuity for salvage MCS/transplant pathways.',
          riskLevel: 'critical',
        },
        2: {
          label: 'INTERMACS 2 — Sliding on inotropes',
          interpretation:
            'Declining despite inotropes (worsening labs, congestion, perfusion). Urgent advanced therapy evaluation.',
          riskLevel: 'critical',
        },
        3: {
          label: 'INTERMACS 3 — Dependent stability',
          interpretation:
            'Stable blood pressure/organ function but continuous inotrope dependent. Plan durable MCS/transplant timing carefully.',
          riskLevel: 'high',
        },
        4: {
          label: 'INTERMACS 4 — Resting symptoms',
          interpretation:
            'Symptoms at rest on oral therapy; recurrent admissions common. Evaluate for advanced therapies before crash.',
          riskLevel: 'high',
        },
        5: {
          label: 'INTERMACS 5 — Exertion intolerant',
          interpretation: 'Comfortable at rest but housebound / ADLs limited. Optimize GDMT and assess candidacy early.',
          riskLevel: 'moderate',
        },
        6: {
          label: 'INTERMACS 6 — Exertion limited',
          interpretation: 'Fatigue after any significant activity; can perform mild activity. Risk-stratify and follow closely.',
          riskLevel: 'moderate',
        },
        7: {
          label: 'INTERMACS 7 — Advanced NYHA III',
          interpretation: 'Clinically stable advanced NYHA III without recent decompensation profile. Surveillance and optimization.',
          riskLevel: 'low',
        },
      };
      const m = map[p] ?? map[4];
      const mods: string[] = [];
      if (bool(values.tempModifier)) mods.push('Temporary MCS');
      if (bool(values.arrhythmiaModifier)) mods.push('Arrhythmia');

      return {
        score: p,
        label: m.label,
        interpretation:
          m.interpretation +
          (mods.length ? ` Modifiers noted: ${mods.join(', ')}.` : ''),
        riskLevel: m.riskLevel,
        details: [
          { label: 'Profile', value: String(p) },
          { label: 'Modifiers', value: mods.length ? mods.join('; ') : 'None' },
        ],
        recommendations:
          p <= 3
            ? ['Urgent advanced HF / MCS team', 'ICU-level support as needed', 'Evaluate temporary then durable strategies']
            : ['Refer to advanced HF if progressive', 'Optimize GDMT and comorbidities', 'Discuss goals and candidacy early'],
      };
    },
    evidence: {
      summary:
        'INTERMACS profiles classify advanced HF severity from critical shock (1) to advanced NYHA III (7) for MCS registry and clinical communication.',
      formula: 'Select profile 1–7 ± temporary support / arrhythmia modifiers',
      validation: 'INTERMACS registry; lower profiles associate with higher perioperative risk after durable LVAD.',
      references: [
        {
          title: 'INTERMACS profiles of advanced heart failure',
          citation: 'Stevenson LW et al. J Heart Lung Transplant. 2009',
          year: 2009,
          pmid: '19782281',
          doi: '10.1016/j.healun.2009.08.005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Profile 1–2', actions: ['Crash pathway', 'Temporary MCS bridge', 'Urgent transplant/LVAD evaluation'] },
      { condition: 'Profile 3–4', actions: ['Elective/urgent durable MCS planning', 'Optimize nutrition/RV/renal'] },
      { condition: 'Profile 5–7', actions: ['Close outpatient advanced HF follow-up', 'Avoid delayed referral'] },
    ],
    pearls: [
      'Profile 3 “stable on inotropes” is still high-risk — not a reason to delay referral.',
      'Modifiers (temporary support, arrhythmias) refine acuity within a profile.',
    ],
  },
  {
    id: 'cardshock',
    name: 'CardShock Risk Score',
    shortName: 'CardShock',
    description: 'CardShock risk score (0–9) for short-term mortality in cardiogenic shock.',
    category: 'cardiology',
    tags: ['cardiogenic shock', 'cardshock', 'mortality', 'risk'],
    whenToUse: 'Adults with cardiogenic shock to estimate in-hospital mortality risk strata.',
    whyUse: 'Simple 7-variable score from a prospective European CS cohort; bedside applicable.',
    inputs: [
      yesNo('age75', 'Age > 75 years', 1),
      yesNo('confusion', 'Confusion at presentation', 1),
      yesNo('priorMiCabg', 'Previous MI or CABG', 1),
      yesNo('acs', 'ACS etiology of shock', 1),
      yesNo('ef40', 'LVEF < 40%', 1),
      selectInput('lactate', 'Blood lactate', [
        { label: '< 2 mmol/L', value: 0, points: 0 },
        { label: '2–4 mmol/L', value: 1, points: 1 },
        { label: '> 4 mmol/L', value: 2, points: 2 },
      ]),
      selectInput('egfr', 'eGFR (mL/min/1.73 m²)', [
        { label: '> 60', value: 0, points: 0 },
        { label: '30–60', value: 1, points: 1 },
        { label: '< 30', value: 2, points: 2 },
      ]),
    ],
    calculate(values) {
      const score =
        (bool(values.age75) ? 1 : 0) +
        (bool(values.confusion) ? 1 : 0) +
        (bool(values.priorMiCabg) ? 1 : 0) +
        (bool(values.acs) ? 1 : 0) +
        (bool(values.ef40) ? 1 : 0) +
        num(values.lactate) +
        num(values.egfr);

      // Approximate in-hospital mortality bands from CardShock derivation
      const mort =
        score <= 3 ? '~8–15%' : score <= 5 ? '~30–40%' : score <= 7 ? '~60–70%' : '~70–90%';
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'moderate',
          label: 'Lower CardShock risk (0–3)',
          interpretation: `CardShock ${score}: lower short-term mortality band (~8–15% in derivation strata). Still requires shock-level care.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'Intermediate CardShock risk (4–5)',
          interpretation: `CardShock ${score}: intermediate mortality risk (~30–40%). Intensify support and etiology therapy.`,
        },
        {
          max: 7,
          level: 'critical',
          label: 'High CardShock risk (6–7)',
          interpretation: `CardShock ${score}: high predicted mortality (~60–70%). Escalate MCS/shock team early.`,
        },
        {
          max: 9,
          level: 'critical',
          label: 'Very high CardShock risk (8–9)',
          interpretation: `CardShock ${score}: very high predicted mortality (~70–90%). Maximal support and goals discussion.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Approx. in-hospital mortality band', value: mort },
          { label: 'Max score', value: '9' },
        ],
        recommendations:
          score >= 4
            ? ['Shock team activation', 'Revascularize ACS promptly', 'Consider MCS', 'ICU monitoring']
            : ['Treat shock etiology', 'Serial lactate and organ perfusion', 'Have escalation plan ready'],
      };
    },
    evidence: {
      summary:
        'CardShock score predicts in-hospital mortality in cardiogenic shock using age, confusion, prior MI/CABG, ACS etiology, LVEF, lactate, and eGFR.',
      formula: 'Age>75 + confusion + prior MI/CABG + ACS + LVEF<40 + lactate (0–2) + eGFR (0–2) = 0–9',
      validation: 'Derived/validated in CardShock study (European multicentre CS cohort).',
      references: [
        {
          title: 'Clinical picture and risk prediction of short-term mortality in cardiogenic shock (CardShock)',
          citation: 'Harjola VP et al. Eur J Heart Fail. 2015',
          year: 2015,
          pmid: '25820680',
          doi: '10.1002/ejhf.260',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–3', actions: ['Standard CS protocols', 'Close reassessment'] },
      { condition: 'Score ≥4', actions: ['Early advanced therapies', 'Multidisciplinary shock care'] },
    ],
    pearls: ['Lactate and renal function dominate risk.', 'Score complements — does not replace — SCAI staging.'],
  },
  {
    id: 'crusade',
    name: 'CRUSADE Bleeding Risk Score',
    shortName: 'CRUSADE',
    description:
      'CRUSADE in-hospital major bleeding risk after NSTE-ACS (simplified educational point bands from key variables).',
    category: 'cardiology',
    tags: ['bleeding', 'acs', 'crusade', 'nste-acs', 'antiplatelet'],
    whenToUse: 'NSTE-ACS patients when balancing ischemic vs bleeding risk for antithrombotic intensity.',
    whyUse: 'Widely cited bleeding risk model from the CRUSADE registry using admission variables.',
    inputs: [
      numberInput('hct', 'Baseline hematocrit', { unit: '%', min: 10, max: 60, step: 0.1, defaultValue: 40 }),
      numberInput('crcl', 'Creatinine clearance', { unit: 'mL/min', min: 5, max: 200, defaultValue: 80 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 200, defaultValue: 80 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 250, defaultValue: 130 }),
      yesNo('hf', 'Signs of heart failure at presentation', 1),
      yesNo('vascular', 'Prior vascular disease (PAD / stroke)', 1),
      yesNo('dm', 'Diabetes mellitus', 1),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
    ],
    calculate(values) {
      const hct = num(values.hct, 40);
      const crcl = num(values.crcl, 80);
      const hr = num(values.hr, 80);
      const sbp = num(values.sbp, 130);

      // CRUSADE points (Subherwal et al.)
      let pts = 0;
      if (hct < 31) pts += 9;
      else if (hct < 34) pts += 7;
      else if (hct < 37) pts += 3;
      else if (hct < 40) pts += 2;

      if (crcl <= 15) pts += 39;
      else if (crcl <= 30) pts += 35;
      else if (crcl <= 60) pts += 28;
      else if (crcl <= 90) pts += 17;
      else if (crcl <= 120) pts += 7;

      // Subherwal CRUSADE HR points
      if (hr >= 121) pts += 11;
      else if (hr >= 111) pts += 10;
      else if (hr >= 101) pts += 8;
      else if (hr >= 91) pts += 6;
      else if (hr >= 81) pts += 3;
      else if (hr >= 71) pts += 1;

      // Subherwal CRUSADE SBP points
      if (sbp <= 90) pts += 10;
      else if (sbp <= 100) pts += 8;
      else if (sbp <= 120) pts += 5;
      else if (sbp <= 180) pts += 1;
      else if (sbp <= 200) pts += 3;
      else pts += 5;

      if (bool(values.hf)) pts += 7;
      if (bool(values.vascular)) pts += 6;
      if (bool(values.dm)) pts += 6;
      if (String(values.sex) === 'female') pts += 8;

      pts = Math.max(0, round(pts, 0));

      // Official CRUSADE quintiles: ≤20 / 21–30 / 31–40 / 41–50 / >50
      const r = riskFromThresholds(pts, [
        {
          max: 20,
          level: 'low',
          label: 'Very low bleeding risk (≤20)',
          interpretation: `CRUSADE ${pts}: very low in-hospital major bleeding risk quintile.`,
        },
        {
          max: 30,
          level: 'low',
          label: 'Low bleeding risk (21–30)',
          interpretation: `CRUSADE ${pts}: low bleeding risk quintile.`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Moderate bleeding risk (31–40)',
          interpretation: `CRUSADE ${pts}: moderate bleeding risk quintile. Balance antithrombotic intensity carefully.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'High bleeding risk (41–50)',
          interpretation: `CRUSADE ${pts}: high bleeding risk. Minimize excess antithrombotic exposure; careful access-site choice.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high bleeding risk (>50)',
          interpretation: `CRUSADE ${pts}: very high bleeding risk quintile (~19%+ major bleed in original). Careful strategy and access-site choice.`,
        },
      ]);

      return {
        score: pts,
        ...r,
        details: [
          { label: 'CRUSADE points', value: String(pts) },
          { label: 'Key drivers', value: 'CrCl, Hct, HR, SBP, HF, vascular disease, DM, female sex' },
        ],
        recommendations:
          pts > 30
            ? [
                'Prefer radial access if PCI',
                'Avoid excess anticoagulation',
                'Dose-adjust renally cleared agents',
                'PPI if high GI bleed risk / dual therapy',
              ]
            : ['Standard ACS antithrombotic pathway', 'Still reassess access site and dosing'],
      };
    },
    evidence: {
      summary:
        'CRUSADE bleeding score predicts major in-hospital bleeding in NSTE-ACS using Hct, CrCl, HR, SBP, HF signs, vascular disease, diabetes, and sex.',
      formula: 'Weighted points from 8 admission variables (max theoretical high 90s)',
      validation: 'Derived from CRUSADE registry; widely used educational bleeding risk tool (era pre-universal radial/potent P2Y12).',
      references: [
        {
          title: 'Baseline risk of major bleeding in non-ST-segment-elevation MI (CRUSADE)',
          citation: 'Subherwal S et al. Circulation. 2009',
          year: 2009,
          pmid: '19332461',
          doi: '10.1161/CIRCULATIONAHA.108.828541',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower band', actions: ['Usual ACS therapy', 'Standard bleed precautions'] },
      { condition: 'High/very high band', actions: ['Bleeding-avoidance strategies', 'Prefer radial access / dose-adjust anticoagulants', 'Close Hb monitoring'] },
    ],
    pearls: [
      'Absolute rates vary with modern radial access and antithrombotic regimens.',
      'Pair with ischemic risk (GRACE) — do not withhold indicated therapy solely for intermediate CRUSADE.',
    ],
  },
  {
    id: 'dapt-score',
    name: 'DAPT Score',
    shortName: 'DAPT',
    description:
      'Dual Antiplatelet Therapy (DAPT) score to weigh ischemic vs bleeding risk for prolonged dual antiplatelet therapy after PCI.',
    category: 'cardiology',
    tags: ['dapt', 'pci', 'antiplatelet', 'stent', 'bleeding'],
    whenToUse: 'After coronary stenting when deciding whether to extend DAPT beyond 12 months (selected patients).',
    whyUse: 'Score ≥2 identifies patients more likely to benefit from prolonged DAPT; <2 favors standard duration.',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '≥ 75 years (−2)', value: -2, points: -2 },
        { label: '65–74 years (−1)', value: -1, points: -1 },
        { label: '< 65 years (0)', value: 0, points: 0 },
      ]),
      yesNo('smoker', 'Cigarette smoker (within past 2 years)', 1),
      yesNo('dm', 'Diabetes mellitus', 1),
      yesNo('miPresentation', 'MI at presentation', 1),
      yesNo('priorPciMi', 'Prior PCI or prior MI', 1),
      yesNo('stentSmall', 'Stent diameter < 3 mm', 1),
      yesNo('paclitaxel', 'Paclitaxel-eluting stent', 1),
      yesNo('chfEf', 'CHF or LVEF < 30%', 2),
      yesNo('veinGraft', 'Vein graft stent', 2),
    ],
    calculate(values) {
      const score =
        num(values.ageBand) +
        (bool(values.smoker) ? 1 : 0) +
        (bool(values.dm) ? 1 : 0) +
        (bool(values.miPresentation) ? 1 : 0) +
        (bool(values.priorPciMi) ? 1 : 0) +
        (bool(values.stentSmall) ? 1 : 0) +
        (bool(values.paclitaxel) ? 1 : 0) +
        (bool(values.chfEf) ? 2 : 0) +
        (bool(values.veinGraft) ? 2 : 0);

      if (score >= 2) {
        return {
          score,
          label: 'DAPT score ≥ 2 — favors prolonged DAPT',
          interpretation: `DAPT score ${score}: in the DAPT trial population, scores ≥2 had greater ischemic benefit vs bleeding harm from 30 vs 12 months DAPT (after event-free first year).`,
          riskLevel: 'moderate',
          details: [
            { label: 'Decision threshold', value: '≥2 favors prolongation (if no high bleed risk)' },
            { label: 'Score range', value: '−2 to 10' },
          ],
          recommendations: [
            'If free of ischemic/bleed events on DAPT and not high bleed risk, consider extended DAPT',
            'Shared decision-making; reassess periodically',
            'Continue aspirin indefinitely unless contraindicated',
          ],
        };
      }
      return {
        score,
        label: 'DAPT score < 2 — standard duration preferred',
        interpretation: `DAPT score ${score}: lower net benefit (or net harm) from prolonging DAPT beyond standard duration in trial analyses. Prefer guideline-standard duration unless other indications.`,
        riskLevel: 'low',
        details: [
          { label: 'Decision threshold', value: '<2 generally avoid routine prolongation' },
          { label: 'Score range', value: '−2 to 10' },
        ],
        recommendations: [
          'Plan standard DAPT duration per ACS/CCS indication and stent type era',
          'Address modifiable bleed risk',
          'Do not extend solely based on anxiety without ischemic indicators',
        ],
      };
    },
    evidence: {
      summary:
        'DAPT score uses age (negative points), smoking, DM, MI presentation, prior PCI/MI, small stent, PES, CHF/low EF, and vein-graft PCI to guide prolonged DAPT after 12 event-free months.',
      formula:
        'Age≥75 (−2)/65–74 (−1) + smoker + DM + MI + prior PCI/MI + stent<3mm + PES + 2×(CHF/EF<30) + 2×(vein graft)',
      validation: 'Derived from DAPT trial; external validations mixed — use as adjunct not sole rule.',
      references: [
        {
          title: 'Development and validation of a prediction rule for benefit and harm of dual antiplatelet therapy beyond 1 year after PCI',
          citation: 'Yeh RW et al. JAMA. 2016',
          year: 2016,
          pmid: '27022822',
          doi: '10.1001/jama.2016.3775',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['Discuss extended DAPT if low bleed risk', 'Confirm no PRECISE-DAPT/ARC-HBR high-risk overrides'] },
      { condition: 'Score <2', actions: ['Standard duration', 'Focus on lifestyle and LDL therapy'] },
    ],
    pearls: [
      'Apply after uneventful first year on DAPT — not at the time of PCI for initial duration.',
      'High bleeding risk features may override a high DAPT score.',
    ],
  },
  {
    id: 'precise-dapt',
    name: 'PRECISE-DAPT (Simplified Educational)',
    shortName: 'PRECISE-DAPT',
    description:
      'Simplified educational PRECISE-DAPT-style bleeding risk bands after PCI using age, CrCl, hemoglobin, WBC, and prior bleeding.',
    category: 'cardiology',
    tags: ['precise-dapt', 'bleeding', 'pci', 'dapt', 'antiplatelet'],
    whenToUse: 'Educational estimate of out-of-hospital bleeding risk to inform DAPT duration after coronary stenting.',
    whyUse: 'Highlights major PRECISE-DAPT predictors; full nomogram is preferred for precise cutoffs (e.g. ≥25).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 68 }),
      numberInput('crcl', 'Creatinine clearance', { unit: 'mL/min', min: 5, max: 200, defaultValue: 70 }),
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 5, max: 20, step: 0.1, defaultValue: 13 }),
      numberInput('wbc', 'White blood cell count', { unit: '×10⁹/L', min: 1, max: 50, step: 0.1, defaultValue: 8 }),
      yesNo('priorBleed', 'Prior bleeding', 1),
    ],
    calculate(values) {
      const age = num(values.age, 68);
      const crcl = num(values.crcl, 70);
      const hb = num(values.hb, 13);
      const wbc = num(values.wbc, 8);

      // Educational pseudo-points approximating direction of PRECISE-DAPT nomogram
      let pts = 0;
      pts += Math.max(0, age - 50) * 0.6;
      if (crcl < 30) pts += 25;
      else if (crcl < 45) pts += 18;
      else if (crcl < 60) pts += 12;
      else if (crcl < 90) pts += 5;
      if (hb < 10) pts += 18;
      else if (hb < 11) pts += 14;
      else if (hb < 12) pts += 10;
      else if (hb < 13) pts += 5;
      if (wbc >= 15) pts += 10;
      else if (wbc >= 10) pts += 5;
      else if (wbc >= 8) pts += 2;
      if (bool(values.priorBleed)) pts += 15;
      pts = round(pts, 0);

      const r = riskFromThresholds(pts, [
        {
          max: 17,
          level: 'low',
          label: 'Lower bleeding risk band (educational)',
          interpretation: `Simplified PRECISE-DAPT-style points ${pts}: lower bleeding risk band. Longer DAPT may be reasonable if ischemic risk high (confirm with full score).`,
        },
        {
          max: 24,
          level: 'moderate',
          label: 'Intermediate bleeding risk band',
          interpretation: `Simplified points ${pts}: intermediate bleeding risk. Individualize DAPT duration; avoid default prolongation.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher bleeding risk band (~PRECISE-DAPT ≥25 zone)',
          interpretation: `Simplified points ${pts}: maps toward high bleeding risk (PRECISE-DAPT ≥25 associated with more bleeding on long DAPT). Prefer shorter DAPT when ischemic risk allows.`,
        },
      ]);

      return {
        score: pts,
        ...r,
        details: [
          { label: 'Note', value: 'Educational simplification — not the official PRECISE-DAPT calculator' },
          { label: 'Official high-risk cutoff', value: 'PRECISE-DAPT ≥ 25' },
        ],
        recommendations:
          pts >= 25
            ? ['Consider shortened DAPT if acceptable ischemic risk', 'Radial access, PPI, avoid NSAIDs', 'Use full PRECISE-DAPT nomogram for decisions']
            : ['Standard or longer DAPT per ischemic risk', 'Still mitigate modifiable bleed risks'],
      };
    },
    evidence: {
      summary:
        'PRECISE-DAPT predicts out-of-hospital bleeding on DAPT using age, CrCl, hemoglobin, WBC, and prior bleeding; score ≥25 marks high bleeding risk.',
      formula: 'Educational weighted points from age, CrCl, Hb, WBC, prior bleed (not official nomogram)',
      validation: 'Original PRECISE-DAPT derived from PCI trial pooled cohorts; this app version is simplified for teaching.',
      references: [
        {
          title: 'Predicting bleeding complications in patients undergoing stent implantation and subsequent DAPT (PRECISE-DAPT)',
          citation: 'Costa F et al. Lancet. 2017',
          year: 2017,
          pmid: '28290994',
          doi: '10.1016/S0140-6736(17)30397-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower band', actions: ['Ischemic risk drives duration', 'Standard secondary prevention'] },
      { condition: 'Higher band', actions: ['Short DAPT strategies', 'HBR checklist (ARC-HBR)', 'Verify with full calculator'] },
    ],
    pearls: [
      'Not a substitute for the published PRECISE-DAPT web/nomogram calculator.',
      'Complement with DAPT score and clinical HBR criteria.',
    ],
  },
  {
    id: 'hcm-risk-scd',
    name: 'HCM Risk-SCD (Simplified Educational)',
    shortName: 'HCM Risk-SCD',
    description:
      'Educational factor checklist and risk bands for sudden cardiac death risk discussion in hypertrophic cardiomyopathy (not the full ESC calculator).',
    category: 'cardiology',
    tags: ['hcm', 'scd', 'icd', 'hypertrophic cardiomyopathy', 'risk'],
    whenToUse: 'Adults with HCM when framing SCD risk factors before using the official HCM Risk-SCD model or AHA pathway.',
    whyUse: 'Counts major ESC-model inputs and classic risk markers for structured counseling; full 5-year % needs official tool.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 90, defaultValue: 45 }),
      numberInput('mwt', 'Maximal wall thickness', { unit: 'mm', min: 5, max: 50, defaultValue: 18 }),
      numberInput('la', 'Left atrial diameter', { unit: 'mm', min: 20, max: 80, defaultValue: 42 }),
      numberInput('lvot', 'Max LVOT gradient', { unit: 'mmHg', min: 0, max: 200, defaultValue: 20 }),
      yesNo('fhScd', 'Family history of SCD in first-degree relative', 1),
      yesNo('nsvt', 'NSVT on Holter', 1),
      yesNo('syncope', 'Unexplained syncope', 1),
      yesNo('abnormalBP', 'Abnormal exercise BP response (optional classic factor)', 1),
      yesNo('massiveH', 'Massive hypertrophy ≥30 mm (classic major factor)', 1),
    ],
    calculate(values) {
      const age = num(values.age, 45);
      const mwt = num(values.mwt, 18);
      const la = num(values.la, 42);
      const lvot = num(values.lvot, 20);

      let factors = 0;
      const detailFlags: string[] = [];
      if (bool(values.fhScd)) {
        factors += 1;
        detailFlags.push('Family SCD');
      }
      if (bool(values.nsvt)) {
        factors += 1;
        detailFlags.push('NSVT');
      }
      if (bool(values.syncope)) {
        factors += 1;
        detailFlags.push('Unexplained syncope');
      }
      if (bool(values.massiveH) || mwt >= 30) {
        factors += 1;
        detailFlags.push('MWT ≥30 mm');
      }
      if (bool(values.abnormalBP)) {
        factors += 1;
        detailFlags.push('Abnormal BP response');
      }
      if (la >= 45) {
        factors += 1;
        detailFlags.push('LA enlarged');
      }
      if (lvot >= 30) detailFlags.push('LVOT gradient ≥30');
      if (age < 40) detailFlags.push('Younger age (higher model risk weight)');

      // Rough educational band — not ESC 5-year %
      const r = riskFromThresholds(factors, [
        {
          max: 0,
          level: 'low',
          label: 'Few major risk markers',
          interpretation: `No major classic markers selected (MWT ${mwt} mm, LA ${la} mm, LVOT ${lvot} mmHg). Still compute official HCM Risk-SCD 5-year risk; ICD usually not indicated for primary prevention if low calculated risk and no major factors.`,
        },
        {
          max: 1,
          level: 'moderate',
          label: 'Intermediate marker burden',
          interpretation: `About ${factors} major/educational risk marker(s): ${detailFlags.join(', ') || 'see inputs'}. Use full ESC HCM Risk-SCD calculator and shared decision-making for ICD.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Multiple risk markers',
          interpretation: `${factors} risk markers present (${detailFlags.join(', ')}). Elevated concern for SCD — complete official risk model, consider ICD primary prevention discussion, and specialty HCM care.`,
        },
      ]);

      return {
        score: factors,
        ...r,
        details: [
          { label: 'Educational factor count', value: String(factors) },
          { label: 'Markers', value: detailFlags.length ? detailFlags.join('; ') : 'None flagged' },
          { label: 'Official tool', value: 'ESC HCM Risk-SCD 5-year % required for formal estimate' },
        ],
        recommendations:
          factors >= 2 || mwt >= 30 || bool(values.syncope)
            ? ['Refer HCM center', 'Official HCM Risk-SCD calculation', 'ICD counseling if high predicted risk / major factors']
            : ['Routine HCM follow-up', 'Risk factor surveillance (Holter, imaging)', 'Lifestyle and family screening'],
      };
    },
    evidence: {
      summary:
        'ESC HCM Risk-SCD uses age, MWT, LA size, LVOT gradient, family SCD, NSVT, and unexplained syncope to estimate 5-year SCD risk; this helper counts factors educationally.',
      formula: 'Educational count of major markers; official model is a continuous survival equation',
      validation: 'ESC model validated in HCM cohorts; AHA/ACC pathways differ slightly (individual major risk factors).',
      references: [
        {
          title: 'A novel clinical risk prediction model for sudden cardiac death in HCM (HCM Risk-SCD)',
          citation: 'O’Mahony C et al. Eur Heart J. 2014',
          year: 2014,
          pmid: '24126876',
          doi: '10.1093/eurheartj/eht439',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low marker count', actions: ['Calculate official 5-year risk', 'Reassess with new syncope/NSVT/imaging'] },
      { condition: 'Multiple markers / syncope / MWT≥30', actions: ['Specialty HCM clinic', 'ICD shared decision', 'Exercise counseling with HCM expert (shared decision)'] },
    ],
    pearls: [
      'Do not use this factor count as a substitute for the published HCM Risk-SCD percentage.',
      'Secondary prevention ICD indicated after cardiac arrest or sustained VT regardless of score.',
    ],
  },
  {
    id: 'brugada-criteria',
    name: 'Brugada ECG Pattern Helper',
    shortName: 'Brugada ECG',
    description: 'Helper to classify type 1 vs type 2 Brugada ECG patterns and next diagnostic steps.',
    category: 'cardiology',
    tags: ['brugada', 'ecg', 'scd', 'channelopathy', 'syncope'],
    whenToUse: 'When ECG suggests Brugada pattern (rSR′ and STE in right precordial leads) for pattern typing.',
    whyUse: 'Type 1 is diagnostic; type 2 needs conversion/provocation context and clinical correlation.',
    inputs: [
      selectInput('pattern', 'ECG pattern', [
        {
          label: 'Type 1 — Coved STE ≥2 mm with negative T in ≥1 of V1–V2 (high leads OK)',
          value: 1,
        },
        {
          label: 'Type 2 — Saddleback STE ≥2 mm (r′), trough ≥1 mm, positive/biphasic T',
          value: 2,
        },
        { label: 'Nondiagnostic / incomplete RBBB-like only', value: 0 },
      ]),
      yesNo('highLeads', 'Recorded with V1–V2 in 2nd intercostal space', 1),
      yesNo('fever', 'Fever at time of ECG', 1),
      yesNo('syncope', 'Syncope (especially nocturnal/at rest)', 1),
      yesNo('fhScd', 'Family history of SCD / Brugada', 1),
      yesNo('drugs', 'Possible sodium-channel blocker or other Brugada-inducing drug', 1),
    ],
    calculate(values) {
      const p = num(values.pattern, 0);
      const clinical =
        (bool(values.syncope) ? 1 : 0) + (bool(values.fhScd) ? 1 : 0) + (bool(values.fever) ? 1 : 0);

      if (p === 1) {
        return {
          score: 1,
          label: 'Type 1 Brugada pattern',
          interpretation:
            'Spontaneous type 1 pattern is diagnostic of Brugada ECG pattern. Risk stratify for ICD (prior arrest, arrhythmic syncope) with electrophysiology/cardiogenetics expertise. Avoid fever and culprit drugs.',
          riskLevel: clinical >= 1 ? 'high' : 'moderate',
          details: [
            { label: 'Pattern', value: 'Type 1 (coved)' },
            { label: 'High leads used', value: bool(values.highLeads) ? 'Yes' : 'No / unknown' },
            { label: 'Clinical risk flags', value: clinical ? `${clinical} selected` : 'None' },
          ],
          recommendations: [
            'Urgent specialist referral (EP / inherited arrhythmia)',
            'Treat fever aggressively; review drug list (brugadadrugs.org)',
            'Family cascade ECG screening discussion',
          ],
        };
      }
      if (p === 2) {
        return {
          score: 2,
          label: 'Type 2 Brugada pattern (nondiagnostic alone)',
          interpretation:
            'Type 2 (saddleback) is not diagnostic of Brugada syndrome by itself. Consider high lead placement, drug challenge in expert hands if clinical suspicion, and clinical risk assessment.',
          riskLevel: clinical >= 1 ? 'moderate' : 'low',
          details: [
            { label: 'Pattern', value: 'Type 2 (saddleback)' },
            { label: 'Inducing drug concern', value: bool(values.drugs) ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Repeat ECG with V1–V2 at 2nd ICS',
            'Expert evaluation if syncope/family history',
            'Avoid unnecessary class Ic challenge outside specialty care',
          ],
        };
      }
      return {
        score: 0,
        label: 'Nondiagnostic for Brugada pattern',
        interpretation:
          'ECG does not meet type 1 or type 2 Brugada pattern criteria. Differential includes incomplete RBBB, athlete ECG, lead misplacement.',
        riskLevel: 'low',
        details: [{ label: 'Pattern', value: 'Nondiagnostic' }],
        recommendations: ['Correlate symptoms', 'Consider alternative diagnoses', 'Repeat ECG with correct lead placement if suspicion remains'],
      };
    },
    evidence: {
      summary:
        'Consensus ECG criteria: type 1 coved STE ≥2 mm with negative T in right precordial leads is the diagnostic pattern; type 2 is saddleback and requires further evaluation.',
      formula: 'Type 1 vs type 2 morphology in V1–V2 (± high leads)',
      validation: 'International expert consensus criteria for Brugada syndrome diagnosis.',
      references: [
        {
          title: 'J-Wave syndromes expert consensus conference report',
          citation: 'Antzelevitch C et al. Heart Rhythm. 2016',
          year: 2016,
          pmid: '27761155',
          doi: '10.1016/j.joa.2016.07.002',
        },
      ],
    },
    nextSteps: [
      { condition: 'Type 1', actions: ['EP/genetics referral', 'Risk stratification for ICD', 'Fever and drug avoidance'] },
      { condition: 'Type 2', actions: ['High-lead ECG', 'Expert opinion if symptomatic', 'Family history review'] },
    ],
    pearls: [
      'Fever can unmask type 1 — treat fever and repeat ECG when afebrile.',
      'ICD decisions depend on clinical risk, not ECG pattern alone in asymptomatic type 1.',
    ],
  },
  {
    id: 'wellens-helper',
    name: 'Wellens Syndrome Helper',
    shortName: 'Wellens',
    description: 'Clinical/ECG checklist for Wellens pattern (critical proximal LAD stenosis warning).',
    category: 'cardiology',
    tags: ['wellens', 'lad', 'acs', 'ecg', 'chest pain'],
    whenToUse: 'Chest pain patients with biphasic or deeply inverted precordial T waves after pain resolves.',
    whyUse: 'Recognizing Wellens pattern prompts urgent angiography rather than stress testing.',
    inputs: [
      yesNo('anginaHx', 'Recent anginal chest pain (often resolved at time of ECG)', 1),
      yesNo('patternA', 'Type A: biphasic T waves in V2–V3 (±V1–V4)', 1),
      yesNo('patternB', 'Type B: deep symmetric inverted T waves in V2–V3 (±V1–V6)', 1),
      yesNo('isoelectric', 'Isoelectric or minimally elevated ST (<1 mm) in precordials', 1),
      yesNo('noQ', 'No precordial pathologic Q waves / loss of R progression', 1),
      yesNo('tropNormal', 'Normal or only slightly elevated cardiac troponin', 1),
      yesNo('preservedR', 'Preserved R-wave progression', 1),
    ],
    calculate(values) {
      const pattern = bool(values.patternA) || bool(values.patternB);
      const keys = ['anginaHx', 'isoelectric', 'noQ', 'tropNormal', 'preservedR'] as const;
      const support = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const score = (pattern ? 2 : 0) + support;

      if (pattern && support >= 3) {
        return {
          score,
          label: 'Wellens pattern likely',
          interpretation: `ECG pattern + ${support}/5 supportive clinical features: highly concerning for Wellens syndrome (critical proximal LAD). Avoid treadmill stress testing; urgent cardiology/angiography pathway.`,
          riskLevel: 'critical',
          details: [
            { label: 'Pattern type', value: bool(values.patternB) ? 'Type B (deep inversion) ± A' : 'Type A (biphasic)' },
            { label: 'Supportive criteria', value: `${support}/5` },
          ],
          recommendations: [
            'Urgent cardiology consultation',
            'Medical ACS therapy; continuous monitoring',
            'Plan early invasive angiography',
            'Do not send for exercise stress test',
          ],
        };
      }
      if (pattern) {
        return {
          score,
          label: 'Possible Wellens — incomplete supportive features',
          interpretation: `Precordial T-wave pattern present but only ${support}/5 classic supportive features. Still high concern — compare priors, serial ECGs, and cardiology input; do not stress if suspicion remains.`,
          riskLevel: 'high',
          details: [{ label: 'Supportive criteria', value: `${support}/5` }],
          recommendations: ['Serial ECG/troponin', 'Cardiology review', 'Consider CTA or cath based on full picture'],
        };
      }
      return {
        score,
        label: 'Wellens criteria not met',
        interpretation: 'Classic biphasic/deep inverted precordial T-wave pattern not selected. Does not exclude ACS — continue standard chest pain evaluation.',
        riskLevel: 'moderate',
        details: [{ label: 'Pattern present', value: 'No' }],
        recommendations: ['Standard ACS pathway', 'Risk-stratify (HEART/EDACS etc.)'],
      };
    },
    evidence: {
      summary:
        'Wellens syndrome: history of angina, minimal ST elevation, no Q waves, biphasic (type A) or deep inverted (type B) T waves in V2–V3, often near-normal troponin — associated with critical proximal LAD stenosis.',
      formula: 'Pattern (A or B) + supportive clinical/ECG features checklist',
      validation: 'Classic ECG syndromes literature; high association with proximal LAD disease when criteria met.',
      references: [
        {
          title: 'Characteristic electrocardiographic pattern indicating a critical stenosis high in LAD',
          citation: 'de Zwaan C, Bär FW, Wellens HJ. Am Heart J. 1982',
          year: 1982,
          pmid: '6121481',
          doi: '10.1016/0002-8703(82)90480-x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Likely Wellens', actions: ['Admit/monitor', 'Urgent angiography', 'Avoid provocative testing'] },
      { condition: 'Not met', actions: ['Continue usual chest pain workup'] },
    ],
    pearls: [
      'Pattern often appears in a pain-free window — do not be falsely reassured.',
      'Type B deep inversions are more common than type A biphasic waves.',
    ],
  },
  {
    id: 'smith-modified-sgarbossa',
    name: 'Smith-Modified Sgarbossa Criteria',
    shortName: 'Modified Sgarbossa',
    description:
      'Smith-modified Sgarbossa criteria for acute coronary occlusion in LBBB/paced rhythm using proportional discordant STE (ST/S ≤ −0.25).',
    category: 'cardiology',
    tags: ['sgarbossa', 'smith', 'lbbb', 'mi', 'ecg', 'stemi'],
    whenToUse: 'Suspected occlusion MI with LBBB or ventricular paced rhythm when original Sgarbossa is negative/indeterminate.',
    whyUse: 'Proportional discordance improves sensitivity vs the fixed ≥5 mm discordant STE rule.',
    inputs: [
      yesNo('concordantSte', 'Concordant ST elevation ≥1 mm in any lead with positive QRS', 1),
      yesNo('concordantStd', 'Concordant ST depression ≥1 mm in V1–V3', 1),
      numberInput('stMm', 'Discordant ST elevation magnitude (most concerning lead)', {
        unit: 'mm',
        min: 0,
        max: 15,
        step: 0.5,
        defaultValue: 3,
        helpText: 'ST elevation measured at J point relative to PR; discordant to deep S wave',
      }),
      numberInput('sMm', 'S-wave depth (same lead, absolute value)', {
        unit: 'mm',
        min: 0.5,
        max: 50,
        step: 0.5,
        defaultValue: 20,
      }),
    ],
    calculate(values) {
      const st = num(values.stMm, 3);
      const s = Math.max(num(values.sMm, 20), 0.1);
      // ST is elevation (positive); S depth is positive magnitude of negative S.
      // Ratio ST/S is negative when ST is opposite S: use −ST/S convention → ≤ −0.25 is positive.
      const ratio = round(-st / s, 3);
      const excessive = ratio <= -0.25;
      const concordant =
        (bool(values.concordantSte) ? 1 : 0) + (bool(values.concordantStd) ? 1 : 0);
      const positive = bool(values.concordantSte) || bool(values.concordantStd) || excessive;

      if (positive) {
        return {
          score: concordant + (excessive ? 1 : 0),
          label: 'Modified Sgarbossa positive',
          interpretation: `Meets Smith-modified rule: ${
            bool(values.concordantSte) ? 'concordant STE; ' : ''
          }${bool(values.concordantStd) ? 'concordant STD V1–V3; ' : ''}${
            excessive ? `excessive discordance (ST/S = ${ratio} ≤ −0.25)` : 'concordant change only'
          }. High concern for acute coronary occlusion — emergent reperfusion pathway.`,
          riskLevel: 'critical',
          details: [
            { label: 'ST/S ratio (modified)', value: String(ratio) },
            { label: 'Excessive discordance', value: excessive ? 'Yes (≤ −0.25)' : 'No' },
            { label: 'ST elevation / S depth', value: `${st} / ${s} mm` },
          ],
          recommendations: [
            'Activate STEMI-equivalent pathway',
            'Urgent cardiology / cath lab per protocol',
            'Compare serial ECGs',
          ],
        };
      }
      return {
        score: 0,
        label: 'Modified Sgarbossa negative',
        interpretation: `No concordant STE/STD and ST/S ratio ${ratio} (threshold ≤ −0.25). Does not rule out occlusion MI — limited sensitivity; use clinical judgment, serial ECGs, ultrasound, troponin.`,
        riskLevel: 'moderate',
        details: [
          { label: 'ST/S ratio', value: String(ratio) },
          { label: 'Positive threshold', value: '≤ −0.25' },
        ],
        recommendations: [
          'Continue ACS evaluation',
          'Serial ECGs and comparison with priors',
          'Do not exclude OMI on negative modified Sgarbossa alone',
        ],
      };
    },
    evidence: {
      summary:
        'Smith modification replaces absolute ≥5 mm discordant STE with ST/S ratio ≤ −0.25 (and retains concordant STE ≥1 mm and concordant STD ≥1 mm in V1–V3).',
      formula: 'Positive if concordant STE≥1 mm OR concordant STD V1–V3 ≥1 mm OR discordant ST/S ≤ −0.25',
      validation: 'Derived/validated by Smith et al.; improved sensitivity vs original Sgarbossa with preserved specificity.',
      references: [
        {
          title: 'Diagnosis of STEMI in the presence of LBBB using the ST-segment/S-wave ratio',
          citation: 'Smith SW et al. Ann Emerg Med. 2012',
          year: 2012,
          pmid: '22939607',
          doi: '10.1016/j.annemergmed.2012.07.119',
        },
        {
          title: 'Electrocardiographic diagnosis of evolving MI in the presence of LBBB (original Sgarbossa)',
          citation: 'Sgarbossa EB et al. N Engl J Med. 1996',
          year: 1996,
          pmid: '8598860',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Emergent reperfusion pathway', 'Treat as STEMI equivalent'] },
      { condition: 'Negative', actions: ['Serial ECG', 'Troponin/echo', 'Reassess if pain persists'] },
    ],
    pearls: [
      'Measure ST at the J point; use the most abnormal discordant lead.',
      'Same principles are often applied to right-ventricular paced rhythms.',
    ],
  },
  {
    id: 'right-heart-strain',
    name: 'Right Heart Strain Flags (PE Helper)',
    shortName: 'RV Strain',
    description:
      'Counts common ECG and echo right-heart strain flags used in intermediate-risk PE assessment (educational checklist).',
    category: 'cardiology',
    tags: ['pe', 'rv strain', 'echo', 'ecg', 'pulmonary embolism'],
    whenToUse: 'Confirmed or suspected PE when cataloguing RV strain markers for severity discussion.',
    whyUse: 'Organizes ECG/echo strain findings that influence intermediate-high vs intermediate-low PE risk classification.',
    inputs: [
      yesNo('tInv', 'T-wave inversion in V1–V4 (or right precordials)', 1),
      yesNo('rbbb', 'Complete or incomplete RBBB (new)', 1),
      yesNo('s1q3t3', 'S1Q3T3 pattern', 1),
      yesNo('stRad', 'Right axis / RAD strain pattern', 1),
      yesNo('rvDilated', 'RV dilation on echo/CT', 1),
      yesNo('rvHypo', 'RV free-wall hypokinesis', 1),
      yesNo('mcconnell', 'McConnell’s sign', 1),
      yesNo('trElev', 'Elevated TR velocity / estimated RVSP', 1),
      yesNo('septumD', 'D-sign / septal flattening', 1),
      yesNo('biomarker', 'Elevated troponin and/or BNP/NT-proBNP', 1),
    ],
    calculate(values) {
      const ecgKeys = ['tInv', 'rbbb', 's1q3t3', 'stRad'] as const;
      const echoKeys = ['rvDilated', 'rvHypo', 'mcconnell', 'trElev', 'septumD'] as const;
      const ecg = ecgKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const echo = echoKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const bio = bool(values.biomarker) ? 1 : 0;
      const score = ecg + echo + bio;
      const strainPresent = echo >= 1 || ecg >= 2;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Few / no strain flags';
      let interpretation = `Total flags ${score} (ECG ${ecg}, imaging ${echo}, biomarker ${bio}). Minimal strain signature on this checklist.`;

      if (echo >= 2 || (echo >= 1 && bio)) {
        riskLevel = 'high';
        label = 'Significant RV strain signature';
        interpretation = `Imaging strain flags ${echo} with biomarker ${bio ? 'positive' : 'negative'} (ECG flags ${ecg}). Consistent with intermediate-high risk PE phenotype if PE confirmed and patient normotensive — consider monitoring, reperfusion rescue plan, specialty input.`;
      } else if (strainPresent || score >= 2) {
        riskLevel = 'moderate';
        label = 'Possible / modest strain flags';
        interpretation = `Some strain markers present (total ${score}). Integrate with vital signs, sPESI/BOVA, and imaging quality before escalating therapy.`;
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ECG flags', value: `${ecg}/4` },
          { label: 'Echo/CT flags', value: `${echo}/5` },
          { label: 'Biomarker positive', value: bio ? 'Yes' : 'No' },
        ],
        recommendations:
          riskLevel === 'high'
            ? ['Telemetry / step-down or ICU', 'Ensure PE Rx started', 'Rescue reperfusion plan if deteriorates', 'Echo-cardiology/PERT as available']
            : ['Continue risk stratification (sPESI/BOVA)', 'Anticoagulate if PE confirmed', 'Repeat vitals and labs'],
      };
    },
    evidence: {
      summary:
        'RV strain on ECG/echo and cardiac biomarkers refine PE severity among normotensive patients (ESC intermediate-low vs intermediate-high).',
      formula: 'Count of selected ECG + imaging + biomarker flags',
      validation: 'Checklist educational tool; individual signs have limited standalone sensitivity/specificity.',
      references: [
        {
          title: 'ESC guidelines for diagnosis and management of acute PE',
          citation: 'Konstantinides SV et al. Eur Heart J. 2020',
          year: 2020,
          pmid: '32458205',
          doi: '10.1007/s11739-020-02340-0',
        },
      ],
    },
    nextSteps: [
      { condition: 'Significant strain + PE', actions: ['Higher-level monitoring', 'PERT discussion', 'Avoid premature discharge'] },
      { condition: 'Few flags', actions: ['Use validated prognostic scores', 'Outpatient pathways only if Hestia/sPESI allow'] },
    ],
    pearls: [
      'Hypotension/shock defines high-risk PE regardless of strain count.',
      'McConnell’s sign is specific but uncommon; absence does not exclude RV strain.',
    ],
  },
  {
    id: 'bova',
    name: 'BOVA Score (PE Severity)',
    shortName: 'BOVA',
    description: 'BOVA score stages short-term PE-related complications in normotensive pulmonary embolism.',
    category: 'cardiology',
    tags: ['pe', 'bova', 'severity', 'vte', 'prognosis'],
    whenToUse: 'Normotensive patients with confirmed acute PE for complication risk staging.',
    whyUse: 'Simple 0–7 point score (SBP, HR, RV dysfunction, troponin) with stage I–III risk bands.',
    inputs: [
      yesNo('sbp', 'SBP 90–100 mmHg', 2, 'Do not use BOVA if SBP <90 (high-risk PE)'),
      yesNo('hr', 'Heart rate ≥ 110 bpm', 1),
      yesNo('rv', 'RV dysfunction (echo or CT)', 2),
      yesNo('trop', 'Elevated cardiac troponin', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.sbp) ? 2 : 0) +
        (bool(values.hr) ? 1 : 0) +
        (bool(values.rv) ? 2 : 0) +
        (bool(values.trop) ? 2 : 0);

      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'BOVA stage I (0–2)',
          interpretation: `BOVA ${score}: stage I — low risk of PE-related complications in derivation (~4%). Still anticoagulate and individualize disposition.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'BOVA stage II (3–4)',
          interpretation: `BOVA ${score}: stage II — intermediate complication risk (~18%). Closer monitoring; ensure robust follow-up if not admitted.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'BOVA stage III (>4)',
          interpretation: `BOVA ${score}: stage III — higher PE-related complication risk (~42%). Inpatient monitoring; prepare rescue therapy if deteriorates.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Stage bands', value: 'I: 0–2; II: 3–4; III: >4 (max 7)' },
          { label: 'Points', value: 'SBP 90–100 (2), HR≥110 (1), RV (2), troponin (2)' },
        ],
        recommendations:
          score > 4
            ? ['Inpatient monitoring', 'PERT/specialty input as available', 'Reassess for reperfusion if shock develops']
            : score >= 3
              ? ['Observation/admission typically', 'Serial vitals']
              : ['Anticoagulation', 'Disposition per Hestia/sPESI and social factors'],
      };
    },
    evidence: {
      summary:
        'BOVA score predicts PE-related complications in normotensive PE: SBP 90–100 (2), HR ≥110 (1), RV dysfunction (2), elevated troponin (2).',
      formula: 'Sum 0–7 → stage I (0–2), II (3–4), III (>4)',
      validation: 'Derived and externally validated in normotensive PE cohorts.',
      references: [
        {
          title: 'Identification of intermediate-risk patients with acute symptomatic PE (BOVA)',
          citation: 'Bova C et al. Eur Respir J. 2014',
          year: 2014,
          pmid: '24696111',
          doi: '10.1183/09031936.00006114',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage I', actions: ['Often ward or selected outpatient if other rules allow'] },
      { condition: 'Stage III', actions: ['Higher-level care', 'Early deterioration plan'] },
    ],
    pearls: [
      'Not for hypotensive/high-risk PE (SBP <90).',
      'Complements sPESI (mortality) with complication-focused staging.',
    ],
  },
  {
    id: 'lv-mass',
    name: 'LV Mass (ASE Cube Formula)',
    shortName: 'LV Mass',
    description:
      'Simplified left ventricular mass from linear echo dimensions (ASE cube formula) with optional BSA indexing.',
    category: 'cardiology',
    tags: ['echo', 'lvh', 'lv mass', 'ase', 'hypertrophy'],
    whenToUse: 'Educational estimate of LV mass from IVSd, LVIDd, and PWT linear measurements.',
    whyUse: 'Quantifies LVH beyond voltage criteria; index to BSA for sex-specific reference ranges.',
    inputs: [
      numberInput('ivsd', 'IVS thickness (diastole)', { unit: 'cm', min: 0.4, max: 3, step: 0.1, defaultValue: 1.0 }),
      numberInput('lvidd', 'LVID diastole', { unit: 'cm', min: 2, max: 8, step: 0.1, defaultValue: 5.0 }),
      numberInput('pwt', 'Posterior wall thickness (diastole)', { unit: 'cm', min: 0.4, max: 3, step: 0.1, defaultValue: 1.0 }),
      numberInput('height', 'Height (for BSA)', { unit: 'cm', min: 100, max: 230, defaultValue: 170 }),
      numberInput('weight', 'Weight (for BSA)', { unit: 'kg', min: 30, max: 250, defaultValue: 70 }),
      selectInput('sex', 'Sex (reference ranges)', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
    ],
    calculate(values) {
      const ivs = num(values.ivsd, 1);
      const lvid = num(values.lvidd, 5);
      const pwt = num(values.pwt, 1);
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      // ASE cubed formula (Devereux corrected)
      const lvMass = round(0.8 * (1.04 * ((lvid + ivs + pwt) ** 3 - lvid ** 3)) + 0.6, 1);
      const bsa = round(Math.sqrt((h * w) / 3600), 2);
      const lvmI = bsa > 0 ? round(lvMass / bsa, 1) : lvMass;
      const male = String(values.sex) !== 'female';
      // ASE linear method approximate upper limits for LVMI
      const uln = male ? 115 : 95;
      const rwt = lvid > 0 ? round((2 * pwt) / lvid, 2) : 0;

      let geometry = 'Normal geometry';
      let riskLevel: 'normal' | 'moderate' | 'high' = 'normal';
      if (lvmI > uln && rwt > 0.42) {
        geometry = 'Concentric hypertrophy';
        riskLevel = 'high';
      } else if (lvmI > uln && rwt <= 0.42) {
        geometry = 'Eccentric hypertrophy';
        riskLevel = 'high';
      } else if (lvmI <= uln && rwt > 0.42) {
        geometry = 'Concentric remodeling';
        riskLevel = 'moderate';
      }

      return {
        score: lvMass,
        unit: 'g',
        label: geometry,
        interpretation: `LV mass ${lvMass} g; LVMI ${lvmI} g/m² (BSA ${bsa} m²). Sex-specific linear ASE LVMI upper ref ~${uln} g/m². Pattern: ${geometry} (RWT ${rwt}). Educational — lab/vendor methods and 2D area-length may differ.`,
        riskLevel,
        details: [
          { label: 'LV mass', value: `${lvMass} g` },
          { label: 'LVMI', value: `${lvmI} g/m²` },
          { label: 'Relative wall thickness', value: String(rwt) },
          { label: 'BSA (Mosteller)', value: `${bsa} m²` },
        ],
        recommendations:
          lvmI > uln
            ? ['Correlate with BP and valvular disease', 'Aggressive BP control', 'Consider ECG LVH and clinical HF risk']
            : ['Normal mass index by this method', 'Still treat hypertension to target'],
      };
    },
    evidence: {
      summary:
        'ASE recommended cube formula: LV mass = 0.8 × {1.04 × [(LVIDd+PWTd+IVSd)³ − LVIDd³]} + 0.6 g; index to BSA.',
      formula: '0.8×(1.04×[(LVID+PWT+IVS)³−LVID³])+0.6; LVMI=mass/BSA; RWT=2×PWT/LVID',
      validation: 'Widely used linear method; over/underestimation possible vs 3D/CMR gold standards.',
      references: [
        {
          title: 'Recommendations for cardiac chamber quantification by echocardiography in adults (ASE/EACVI)',
          citation: 'Lang RM et al. J Am Soc Echocardiogr. 2015',
          year: 2015,
          pmid: '25559473',
          doi: '10.1016/j.echo.2014.10.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'LVH or concentric remodeling', actions: ['BP optimization', 'Evaluate athlete’s heart vs pathologic LVH if relevant', 'Follow serial echo'] },
    ],
    pearls: [
      'Enter dimensions in centimeters (not mm).',
      'RWT >0.42 with normal mass = concentric remodeling.',
    ],
  },
  {
    id: 'metabolic-syndrome',
    name: 'Metabolic Syndrome (NCEP ATP III)',
    shortName: 'MetSynd ATP III',
    description: 'NCEP ATP III metabolic syndrome diagnosis: ≥3 of 5 clinical criteria.',
    category: 'cardiology',
    tags: ['metabolic syndrome', 'ncep', 'atp iii', 'diabetes', 'prevention'],
    whenToUse: 'Adults undergoing cardiometabolic risk assessment in clinic or prevention visits.',
    whyUse: 'Simple binary diagnosis that identifies high residual ASCVD/diabetes risk clustering.',
    inputs: [
      selectInput('sex', 'Sex (waist threshold)', [
        { label: 'Male (waist > 102 cm / 40 in)', value: 'male' },
        { label: 'Female (waist > 88 cm / 35 in)', value: 'female' },
      ]),
      yesNo('waist', 'Elevated waist circumference (sex-specific ATP III threshold)', 1),
      yesNo('tg', 'Triglycerides ≥ 150 mg/dL (1.7 mmol/L) or on treatment', 1),
      yesNo('hdl', 'Low HDL-C (men <40, women <50 mg/dL) or on treatment', 1),
      yesNo('bp', 'BP ≥ 130/85 mmHg or on antihypertensive therapy', 1),
      yesNo('glucose', 'Fasting glucose ≥ 100 mg/dL (5.6 mmol/L) or on treatment', 1),
    ],
    calculate(values) {
      const keys = ['waist', 'tg', 'hdl', 'bp', 'glucose'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const met = score >= 3;
      return {
        score,
        label: met ? 'Metabolic syndrome present (≥3/5)' : 'Criteria not met',
        interpretation: met
          ? `Meets NCEP ATP III metabolic syndrome (${score}/5 criteria). Associated with higher risk of T2DM and ASCVD — intensify lifestyle therapy and risk-factor treatment.`
          : `${score}/5 ATP III criteria. Metabolic syndrome not diagnosed (needs ≥3). Address each abnormal component.`,
        riskLevel: met ? 'high' : score === 2 ? 'moderate' : 'low',
        details: [
          { label: 'Criteria met', value: `${score} / 5` },
          { label: 'Diagnosis threshold', value: '≥ 3' },
          { label: 'Sex context', value: String(values.sex) },
        ],
        recommendations: met
          ? [
              'Lifestyle: weight, diet, activity, sleep',
              'Treat BP, lipids, glucose to guideline targets',
              'Consider ASCVD risk estimator for statin intensity',
            ]
          : ['Counsel on prevention', 'Repeat labs/waist annually if ≥1 criterion'],
      };
    },
    evidence: {
      summary:
        'NCEP ATP III defines metabolic syndrome as ≥3 of: elevated waist, TG ≥150, low HDL, BP ≥130/85 (or treatment), fasting glucose ≥100 (or treatment).',
      formula: 'Count of 5 dichotomous criteria; ≥3 = metabolic syndrome',
      validation: 'Widely used clinical definition; IDF uses ethnicity-specific waist as mandatory in some versions.',
      references: [
        {
          title: 'NCEP ATP III final report',
          citation: 'Expert Panel. Circulation. 2002',
          year: 2002,
          pmid: '12485966',
        },
      ],
    },
    nextSteps: [
      { condition: '≥3 criteria', actions: ['Structured lifestyle program', 'CV risk assessment', 'Screen for diabetes'] },
      { condition: '<3 criteria', actions: ['Target individual risks', 'Reassess periodically'] },
    ],
    pearls: [
      'Treated hypertension, lipids, or hyperglycemia still count as positive criteria.',
      'Waist thresholds differ by sex and sometimes ethnicity (IDF).',
    ],
  },
  {
    id: 'score2-europe',
    name: 'SCORE2 (Simplified Educational)',
    shortName: 'SCORE2',
    description:
      'Simplified educational SCORE2-style 10-year fatal + nonfatal CVD risk bands using age, sex, smoking, SBP, and non-HDL cholesterol.',
    category: 'cardiology',
    tags: ['score2', 'prevention', 'europe', 'ascvd', 'risk'],
    whenToUse: 'Adults 40–69 without prior ASCVD for educational European primary-prevention risk discussion.',
    whyUse: 'Mirrors SCORE2 inputs; full chart/algorithm needed for precise regional percentages.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 69, defaultValue: 55 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
      yesNo('smoker', 'Current smoker', 1),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 220, defaultValue: 140 }),
      numberInput('nonhdl', 'Non-HDL cholesterol', {
        unit: 'mmol/L',
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 4,
        helpText: 'Total cholesterol − HDL; if in mg/dL divide by ~38.7',
      }),
      selectInput('region', 'European risk region (SCORE2 charts)', [
        { label: 'Low risk region', value: 'low' },
        { label: 'Moderate risk region', value: 'mod' },
        { label: 'High risk region', value: 'high' },
        { label: 'Very high risk region', value: 'vhigh' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const sbp = num(values.sbp, 140);
      const nonhdl = num(values.nonhdl, 4);
      const male = String(values.sex) === 'male';
      const smoker = bool(values.smoker);
      const region = String(values.region || 'mod');

      // Educational logit-like score (not official SCORE2 coefficients)
      let pts = (age - 40) * (male ? 0.55 : 0.5);
      pts += (sbp - 120) * 0.08;
      pts += (nonhdl - 3) * 2.2;
      pts += smoker ? (male ? 6 : 5) : 0;
      pts += male ? 3 : 0;
      const regionBoost = region === 'low' ? 0 : region === 'mod' ? 2 : region === 'high' ? 5 : 8;
      pts += regionBoost;
      pts = round(Math.max(0, pts), 1);

      // Map to educational % bands (very approximate)
      let est = Math.min(40, Math.max(1, round(pts * 0.55, 0)));
      if (region === 'vhigh') est = Math.min(45, est + 4);

      const r = riskFromThresholds(est, [
        {
          max: 2,
          level: 'low',
          label: 'Lower risk band (<2.5% educational)',
          interpretation: `Educational 10-year CVD estimate ~${est}%. Generally lower risk band for age — lifestyle focus; confirm with official SCORE2 charts for region.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate risk band',
          interpretation: `Educational estimate ~${est}% 10-year CVD. Intermediate — risk factor treatment per guidelines; official SCORE2 recommended.`,
        },
        {
          max: 14,
          level: 'high',
          label: 'High risk band',
          interpretation: `Educational estimate ~${est}%. High-risk territory — intensive lifestyle + likely lipid/BP therapy; use official SCORE2.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk band',
          interpretation: `Educational estimate ~${est}%. Very high predicted risk — aggressive multifactorial prevention; official SCORE2/SCORE2-OP if age outside range.`,
        },
      ]);

      return {
        score: est,
        unit: '% (educational)',
        ...r,
        details: [
          { label: 'Note', value: 'Not the official ESC SCORE2 calculator' },
          { label: 'Region selected', value: region },
          { label: 'Internal points', value: String(pts) },
        ],
        recommendations:
          est >= 7.5
            ? ['Official SCORE2 chart confirmation', 'Statin discussion', 'BP and smoking intervention', 'Diabetes screening']
            : ['Lifestyle optimization', 'Recalculate with official SCORE2', 'Reassess when risk factors change'],
      };
    },
    evidence: {
      summary:
        'SCORE2 estimates 10-year risk of fatal and nonfatal CVD in European populations aged 40–69 without prior CVD, calibrated by risk region.',
      formula: 'Educational combination of age, sex, smoking, SBP, non-HDL, region (not official coefficients)',
      validation: 'Official SCORE2 published by ESC; this version is teaching-only.',
      references: [
        {
          title: 'SCORE2 risk prediction algorithms',
          citation: 'SCORE2 working group and ESC Cardiovascular Risk Collaboration. Eur Heart J. 2021',
          year: 2021,
          pmid: '34120177',
          doi: '10.1093/eurheartj/ehab309',
        },
      ],
    },
    nextSteps: [
      { condition: 'Intermediate or higher', actions: ['Use official SCORE2 tool', 'Shared decision on statins', 'Treat BP to target'] },
    ],
    pearls: [
      'Diabetes, CKD, and familial hypercholesterolemia need separate high-risk pathways.',
      'Use SCORE2-OP for older persons (70+).',
    ],
  },
  {
    id: 'reynolds-risk',
    name: 'Reynolds Risk Score (Simplified Educational)',
    shortName: 'Reynolds',
    description:
      'Simplified educational Reynolds Risk-style estimate using age, BP, lipids, hsCRP, smoking, family history (± HbA1c).',
    category: 'cardiology',
    tags: ['reynolds', 'prevention', 'hscrp', 'ascvd', 'women'],
    whenToUse: 'Primary prevention adults when hsCRP and parental MI history are available (educational).',
    whyUse: 'Incorporates inflammation (hsCRP) and family history beyond traditional Framingham factors.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female (original Reynolds women model context)', value: 'female' },
        { label: 'Male', value: 'male' },
      ]),
      numberInput('age', 'Age', { unit: 'years', min: 45, max: 80, defaultValue: 55 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 220, defaultValue: 130 }),
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 100, max: 400, defaultValue: 210 }),
      numberInput('hdl', 'HDL-C', { unit: 'mg/dL', min: 15, max: 120, defaultValue: 50 }),
      numberInput('hscrp', 'hsCRP', { unit: 'mg/L', min: 0.1, max: 20, step: 0.1, defaultValue: 2 }),
      yesNo('smoker', 'Current smoker', 1),
      yesNo('parentMi', 'Parental MI before age 60', 1),
      yesNo('dm', 'Diabetes', 1),
      numberInput('hba1c', 'HbA1c if diabetes', {
        unit: '%',
        min: 4,
        max: 15,
        step: 0.1,
        defaultValue: 7,
        helpText: 'Used only if diabetes = yes (educational)',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const sbp = num(values.sbp, 130);
      const tc = num(values.tc, 210);
      const hdl = Math.max(num(values.hdl, 50), 1);
      const hscrp = num(values.hscrp, 2);
      const male = String(values.sex) === 'male';

      let pts = (age - 45) * (male ? 0.7 : 0.6);
      pts += (sbp - 120) * 0.1;
      pts += (tc - 200) * 0.04;
      pts -= (hdl - 50) * 0.08;
      pts += Math.log(Math.max(hscrp, 0.1)) * 3;
      pts += bool(values.smoker) ? 5 : 0;
      pts += bool(values.parentMi) ? 4 : 0;
      if (bool(values.dm)) {
        pts += 4 + Math.max(0, num(values.hba1c, 7) - 7) * 1.5;
      }
      pts += male ? 2 : 0;
      pts = Math.max(0, pts);
      const est = Math.min(50, Math.max(1, round(pts * 0.65, 0)));

      const r = riskFromThresholds(est, [
        {
          max: 5,
          level: 'low',
          label: 'Lower 10-year risk band',
          interpretation: `Educational Reynolds-style estimate ~${est}% 10-year CVD risk. Lifestyle emphasis; confirm with published Reynolds calculator.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Intermediate risk band',
          interpretation: `Educational estimate ~${est}%. Intermediate — risk enhancers and patient preference guide statin decisions.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High risk band',
          interpretation: `Educational estimate ~${est}%. High risk — intensive prevention; statin therapy typically indicated.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk band',
          interpretation: `Educational estimate ~${est}%. Very high predicted risk — aggressive multifactorial therapy.`,
        },
      ]);

      return {
        score: est,
        unit: '% (educational)',
        ...r,
        details: [
          { label: 'Note', value: 'Educational simplification — not official Reynolds equation output' },
          { label: 'hsCRP', value: `${hscrp} mg/L` },
          { label: 'Parental MI <60', value: bool(values.parentMi) ? 'Yes' : 'No' },
        ],
        recommendations:
          est >= 10
            ? ['Confirm with official Reynolds tool', 'Statin + lifestyle', 'BP and smoking cessation']
            : ['Lifestyle', 'Recheck lipids/CRP when appropriate', 'Official calculator if decisions hinge on %'],
      };
    },
    evidence: {
      summary:
        'Reynolds Risk Score predicts 10-year global CVD risk including hsCRP and parental history of MI; separate models for women and men.',
      formula: 'Educational points from age, SBP, TC, HDL, ln(hsCRP), smoking, parental MI, diabetes/HbA1c',
      validation: 'Original models from Women’s Health Study and similar male cohorts; use official calculator for care decisions.',
      references: [
        {
          title: 'Development and validation of improved algorithms for assessment of global cardiovascular risk in women (Reynolds)',
          citation: 'Ridker PM et al. JAMA. 2007',
          year: 2007,
          pmid: '17284792',
          doi: '10.1107/S0108270106054163',
        },
      ],
    },
    nextSteps: [
      { condition: '≥10% educational band', actions: ['Statin discussion', 'Risk factor control', 'Official score confirmation'] },
    ],
    pearls: [
      'hsCRP should not be measured during acute illness.',
      'Family history item is parental MI before age 60.',
    ],
  },
  {
    id: 'mesa-cac',
    name: 'MESA CAC Score Helper',
    shortName: 'MESA CAC',
    description:
      'Helper to interpret coronary artery calcium (Agatston) score with age/sex context (MESA-style educational bands).',
    category: 'cardiology',
    tags: ['mesa', 'cac', 'calcium score', 'prevention', 'agatston'],
    whenToUse: 'Primary prevention when a CAC Agatston score is available and age/sex known.',
    whyUse: 'Absolute CAC and rough percentile bands refine statin/aspirin discussions beyond risk estimators alone.',
    inputs: [
      numberInput('cac', 'CAC Agatston score', { unit: 'AU', min: 0, max: 5000, defaultValue: 0 }),
      numberInput('age', 'Age', { unit: 'years', min: 45, max: 85, defaultValue: 60 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
      selectInput('ethnicity', 'Race/ethnicity (MESA categories — educational)', [
        { label: 'White', value: 'white' },
        { label: 'Chinese', value: 'chinese' },
        { label: 'Black', value: 'black' },
        { label: 'Hispanic', value: 'hispanic' },
      ]),
    ],
    calculate(values) {
      const cac = num(values.cac, 0);
      const age = num(values.age, 60);
      const male = String(values.sex) === 'male';

      // Very rough expected median CAC rises with age/male — educational percentile band only
      let expected = Math.max(0, (age - 45) * (male ? 4 : 1.5));
      const eth = String(values.ethnicity);
      if (eth === 'chinese') expected *= 0.6;
      if (eth === 'black') expected *= 0.75;
      if (eth === 'hispanic') expected *= 0.85;

      let pctBand = 'Near median / indeterminate (educational)';
      if (cac === 0) pctBand = 'Often <50th percentile if middle-aged; strong negative risk marker';
      else if (cac > expected * 3 && cac >= 100) pctBand = 'Likely high percentile for age/sex (educational)';
      else if (cac > expected * 1.5) pctBand = 'Likely above average for age/sex (educational)';
      else if (cac < expected * 0.5) pctBand = 'Likely below average for age/sex (educational)';

      const r = riskFromThresholds(cac, [
        {
          max: 0,
          level: 'low',
          label: 'CAC = 0',
          interpretation: `CAC 0 at age ${age}: lowest event rates in MESA-like cohorts. Often defer statin if intermediate clinical risk and no high-risk conditions (diabetes, FH, smoking heavy, etc.).`,
        },
        {
          max: 99,
          level: 'moderate',
          label: 'CAC 1–99',
          interpretation: `CAC ${cac}: mild plaque burden. Favors statin when risk discussion uncertain; ${pctBand}.`,
        },
        {
          max: 299,
          level: 'high',
          label: 'CAC 100–299',
          interpretation: `CAC ${cac}: moderate plaque. Statin therapy generally favored; consider aspirin selectively if bleed risk low. ${pctBand}.`,
        },
        {
          max: 9999,
          level: 'critical',
          label: 'CAC ≥ 300',
          interpretation: `CAC ${cac}: extensive calcification (≥300 / ≥75th-like burden). High risk — high-intensity statin, aggressive risk-factor control; ${pctBand}.`,
        },
      ]);

      return {
        score: cac,
        unit: 'AU',
        ...r,
        details: [
          { label: 'Educational percentile comment', value: pctBand },
          { label: 'Rough age/sex reference CAC', value: String(round(expected, 0)) },
          { label: 'Official percentiles', value: 'Use MESA CAC reference tool for precise %' },
        ],
        recommendations:
          cac === 0
            ? ['Shared decision on deferring statin if intermediate risk', 'Repeat CAC in 5–10 y if risk rises', 'Still lifestyle therapy']
            : cac >= 100
              ? ['Initiate/intensify statin', 'BP/smoking/glucose optimization', 'Aspirin only if benefit > bleed risk']
              : ['Statin generally reasonable', 'Lifestyle', 'Reassess ASCVD calculator'],
      };
    },
    evidence: {
      summary:
        'MESA demonstrated graded CHD risk by CAC Agatston score and provides age-sex-race percentile references; CAC 0 is a powerful negative risk marker.',
      formula: 'Interpret absolute CAC + educational age/sex context (official MESA percentile tool online)',
      validation: 'MESA multiethnic cohort; incorporated into prevention guidelines as risk enhancer/reclassifier.',
      references: [
        {
          title: 'Coronary calcium as a predictor of coronary events in four racial or ethnic groups (MESA)',
          citation: 'Detrano R et al. N Engl J Med. 2008',
          year: 2008,
          pmid: '18779279',
          doi: '10.1093/ajcn/88.3.645',
        },
      ],
    },
    nextSteps: [
      { condition: 'CAC 0', actions: ['Consider deferring statin if otherwise intermediate risk', 'Lifestyle'] },
      { condition: 'CAC ≥100', actions: ['Statin', 'Aggressive prevention', 'Selective aspirin'] },
    ],
    pearls: [
      'This is not the official MESA percentile calculator.',
      'CAC does not detect noncalcified plaque — symptoms still need appropriate testing.',
    ],
  },
  {
    id: 'coronary-calcium-asts',
    name: 'Coronary Calcium Agatston Categories',
    shortName: 'Agatston Categories',
    description: 'Agatston coronary calcium score risk categories (absolute score bands).',
    category: 'cardiology',
    tags: ['agatston', 'cac', 'calcium', 'prevention', 'ct'],
    whenToUse: 'When an Agatston CAC score is reported and absolute category interpretation is needed.',
    whyUse: 'Standard absolute cut-points used in reports and prevention pathways.',
    inputs: [
      numberInput('cac', 'Agatston CAC score', { unit: 'AU', min: 0, max: 10000, defaultValue: 0 }),
    ],
    calculate(values) {
      const cac = num(values.cac, 0);
      const r = riskFromThresholds(cac, [
        {
          max: 0,
          level: 'low',
          label: '0 — No identifiable calcified plaque',
          interpretation: 'Agatston 0: no detectable coronary calcification. Very low short-term CHD event rate in asymptomatic patients; still not zero risk (noncalcified plaque possible).',
        },
        {
          max: 10,
          level: 'low',
          label: '1–10 — Minimal',
          interpretation: `Agatston ${cac}: minimal calcification. Mild risk elevation vs 0; lifestyle + selective preventive therapy.`,
        },
        {
          max: 100,
          level: 'moderate',
          label: '11–100 — Mild',
          interpretation: `Agatston ${cac}: mild plaque burden. Supports statin therapy in borderline/intermediate clinical risk.`,
        },
        {
          max: 400,
          level: 'high',
          label: '101–400 — Moderate',
          interpretation: `Agatston ${cac}: moderate calcification. Clinically significant plaque — guideline-directed lipid therapy strongly favored.`,
        },
        {
          max: 10000,
          level: 'critical',
          label: '>400 — Severe',
          interpretation: `Agatston ${cac}: extensive/severe calcification. High risk — high-intensity statin and aggressive risk-factor control; consider ischemia evaluation if symptoms.`,
        },
      ]);
      return {
        score: cac,
        unit: 'AU',
        ...r,
        details: [
          { label: 'Category cut-points', value: '0; 1–10; 11–100; 101–400; >400' },
        ],
        recommendations:
          cac > 400
            ? ['High-intensity statin', 'Risk-factor control', 'Evaluate symptoms for CAD testing']
            : cac > 100
              ? ['Statin therapy', 'BP/glucose/smoking optimization']
              : cac === 0
                ? ['Emphasize lifestyle', 'Shared decision if intermediate estimated risk']
                : ['Consider statin', 'Lifestyle'],
      };
    },
    evidence: {
      summary:
        'Agatston score categories (0, 1–10, 11–100, 101–400, >400) stratify calcified plaque burden and CHD risk in asymptomatic populations.',
      formula: 'Agatston units = sum of (area × density factor) over calcified lesions',
      validation: 'Foundational electron-beam/MDCT calcium literature; used in MESA and guidelines.',
      references: [
        {
          title: 'Quantification of coronary artery calcium using ultrafast computed tomography',
          citation: 'Agatston AS et al. J Am Coll Cardiol. 1990',
          year: 1990,
          pmid: '2407762',
          doi: '10.1016/0735-1097(90)90282-t',
        },
      ],
    },
    nextSteps: [
      { condition: '0', actions: ['Low near-term risk counseling', 'Lifestyle'] },
      { condition: '>100', actions: ['Preventive pharmacotherapy', 'Address all risk factors'] },
    ],
    pearls: ['Density factor: 130–199 HU ×1, 200–299 ×2, 300–399 ×3, ≥400 ×4.', 'Pair with MESA percentiles for age context.'],
  },
  {
    id: 'ankle-brachial-index',
    name: 'Ankle-Brachial Index (ABI)',
    shortName: 'ABI',
    description: 'Calculates ankle-brachial index and interprets PAD / noncompressible vessel categories.',
    category: 'cardiology',
    tags: ['abi', 'pad', 'peripheral artery disease', 'vascular'],
    whenToUse: 'Suspected PAD, atypical leg symptoms, or CV risk stratification with Doppler SBP measurements.',
    whyUse: 'First-line noninvasive test for lower-extremity PAD diagnosis and severity.',
    inputs: [
      numberInput('rightBrachial', 'Right brachial SBP', { unit: 'mmHg', min: 50, max: 300, defaultValue: 130 }),
      numberInput('leftBrachial', 'Left brachial SBP', { unit: 'mmHg', min: 50, max: 300, defaultValue: 128 }),
      numberInput('rightPtp', 'Right posterior tibial SBP', { unit: 'mmHg', min: 0, max: 300, defaultValue: 120 }),
      numberInput('rightDp', 'Right dorsalis pedis SBP', { unit: 'mmHg', min: 0, max: 300, defaultValue: 118 }),
      numberInput('leftPtp', 'Left posterior tibial SBP', { unit: 'mmHg', min: 0, max: 300, defaultValue: 122 }),
      numberInput('leftDp', 'Left dorsalis pedis SBP', { unit: 'mmHg', min: 0, max: 300, defaultValue: 120 }),
    ],
    calculate(values) {
      const rb = num(values.rightBrachial, 130);
      const lb = num(values.leftBrachial, 128);
      const higherBrachial = Math.max(rb, lb);
      const rightAnkle = Math.max(num(values.rightPtp, 120), num(values.rightDp, 118));
      const leftAnkle = Math.max(num(values.leftPtp, 122), num(values.leftDp, 120));
      const rightAbi = higherBrachial > 0 ? round(rightAnkle / higherBrachial, 2) : 0;
      const leftAbi = higherBrachial > 0 ? round(leftAnkle / higherBrachial, 2) : 0;
      const worst = Math.min(rightAbi, leftAbi);

      const interpret = (abi: number) => {
        if (abi > 1.4) return { label: 'Noncompressible', level: 'moderate' as const, text: '>1.40 noncompressible vessels (calcified) — use TBI/imaging' };
        if (abi >= 1.0) return { label: 'Normal', level: 'normal' as const, text: '1.00–1.40 normal' };
        if (abi >= 0.91) return { label: 'Borderline', level: 'moderate' as const, text: '0.91–0.99 borderline' };
        if (abi >= 0.7) return { label: 'Mild PAD', level: 'moderate' as const, text: '0.70–0.90 mild PAD range' };
        if (abi >= 0.4) return { label: 'Moderate PAD', level: 'high' as const, text: '0.40–0.69 moderate PAD' };
        return { label: 'Severe PAD', level: 'critical' as const, text: '<0.40 severe PAD / critical limb threat range' };
      };
      const w = interpret(worst);

      return {
        score: worst,
        unit: 'ratio',
        label: `Worst ABI ${worst} — ${w.label}`,
        interpretation: `Right ABI ${rightAbi}, left ABI ${leftAbi} (using higher brachial ${higherBrachial} mmHg). Worst limb: ${w.text}. ABI ≤0.90 supports PAD diagnosis in appropriate clinical context.`,
        riskLevel: w.level,
        details: [
          { label: 'Right ABI', value: String(rightAbi) },
          { label: 'Left ABI', value: String(leftAbi) },
          { label: 'Higher brachial SBP', value: `${higherBrachial} mmHg` },
        ],
        recommendations:
          worst <= 0.9
            ? [
                'Guideline-directed PAD therapy (antiplatelet, statin, walking program)',
                'Risk-factor control (smoking, DM, HTN)',
                'Vascular referral if lifestyle-limiting claudication or chronic limb-threatening ischemia signs',
              ]
            : worst > 1.4
              ? ['Obtain toe-brachial index (TBI)', 'Consider duplex/imaging if high clinical suspicion']
              : ['PAD less likely by ABI', 'Exercise ABI if exertional symptoms and normal resting ABI'],
      };
    },
    evidence: {
      summary:
        'ABI = (higher ankle SBP of PT or DP) / (higher brachial SBP). ≤0.90 diagnoses PAD; 0.91–0.99 borderline; 1.00–1.40 normal; >1.40 noncompressible.',
      formula: 'ABI_limb = max(PT, DP)_limb / max(right brachial, left brachial)',
      validation: 'AHA scientific statements; standard vascular lab practice.',
      references: [
        {
          title: 'Measurement and interpretation of the ankle-brachial index',
          citation: 'Aboyans V et al. Circulation. 2012',
          year: 2012,
          pmid: '23159553',
          doi: '10.1161/CIR.0b013e318276fbcb',
        },
      ],
    },
    nextSteps: [
      { condition: 'ABI ≤0.90', actions: ['PAD medical therapy', 'Supervised exercise', 'Vascular referral if severe symptoms/CLI'] },
      { condition: 'ABI >1.40', actions: ['TBI', 'Imaging as indicated'] },
    ],
    pearls: [
      'Use the higher of the two brachial pressures as denominator for both legs.',
      'Resting ABI can be normal in claudication — consider exercise ABI.',
    ],
  },
  {
    id: 'constans-dvt',
    name: 'Constans Score (Upper Extremity DVT)',
    shortName: 'Constans UEDVT',
    description: 'Constans clinical probability score for upper-extremity deep vein thrombosis.',
    category: 'hematology',
    tags: ['dvt', 'upper extremity', 'constans', 'vte', 'catheter'],
    whenToUse: 'Suspected upper-extremity DVT (arm swelling/pain ± catheter or pacemaker lead).',
    whyUse: 'Simple 4-item rule to stratify UEDVT pretest probability before ultrasound.',
    inputs: [
      yesNo('venousMaterial', 'Venous material (catheter or pacemaker/ICD lead) present', 1),
      yesNo('localizedPain', 'Localized pain', 1),
      yesNo('pittingEdema', 'Unilateral pitting edema of the arm', 1),
      yesNo('otherDx', 'Other diagnosis at least as plausible', -1),
    ],
    calculate(values) {
      const score =
        (bool(values.venousMaterial) ? 1 : 0) +
        (bool(values.localizedPain) ? 1 : 0) +
        (bool(values.pittingEdema) ? 1 : 0) +
        (bool(values.otherDx) ? -1 : 0);

      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Unlikely UEDVT (≤0)',
          interpretation: `Constans ${score}: UEDVT unlikely in derivation (prevalence ~9–13% range for ≤0). Still image if high clinical concern; D-dimer pathways less established than for lower extremity.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'Likely UEDVT (≥1)',
          interpretation: `Constans ${score}: UEDVT likely (prevalence ~64%+ for ≥2; intermediate for 1). Proceed to duplex ultrasound of the symptomatic arm ± central veins as protocol allows.`,
        },
      ]);

      // Fix band: score 1 is intermediate in some presentations
      let label = r.label;
      let interpretation = r.interpretation;
      let riskLevel = r.riskLevel;
      if (score === 1) {
        label = 'Intermediate probability (1)';
        interpretation = `Constans ${score}: intermediate probability — obtain duplex ultrasound; do not exclude on clinical grounds.`;
        riskLevel = 'moderate';
      } else if (score >= 2) {
        label = 'High probability (≥2)';
        interpretation = `Constans ${score}: high clinical probability of UEDVT. Urgent duplex ultrasound; consider empiric anticoagulation if delay and low bleed risk.`;
        riskLevel = 'high';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Items', value: 'Catheter/lead +1, pain +1, pitting edema +1, alt diagnosis −1' },
          { label: 'Score range', value: '−1 to 3' },
        ],
        recommendations:
          score >= 1
            ? ['Upper-extremity duplex ultrasound', 'Review catheter necessity', 'Anticoagulate if DVT confirmed']
            : ['Ultrasound if persistent concern', 'Seek alternative diagnoses (cellulitis, thrombosis superficial, lymph edema)'],
      };
    },
    evidence: {
      summary:
        'Constans score for upper-extremity DVT: venous material (+1), localized pain (+1), unilateral pitting edema (+1), alternative diagnosis at least as likely (−1).',
      formula: 'Sum −1 to 3; ≤0 unlikely, ≥1 more likely (often stratified 0 / 1 / ≥2)',
      validation: 'Derived and validated for suspected UEDVT clinical probability.',
      references: [
        {
          title: 'A clinical prediction score for upper extremity deep venous thrombosis',
          citation: 'Constans J et al. Thromb Haemost. 2008',
          year: 2008,
          pmid: '18217155',
          doi: '10.1160/TH07-08-0485',
        },
      ],
    },
    nextSteps: [
      { condition: '≤0', actions: ['Consider alternate Dx', 'Ultrasound if still worried'] },
      { condition: '≥1', actions: ['Duplex US', 'Hold catheter decisions until imaging when feasible'] },
    ],
    pearls: [
      'Most UEDVT are catheter-related — remove unnecessary lines when possible.',
      'Not the Wells lower-extremity DVT score.',
    ],
  },
  {
    id: 'ottawa-score-vte-cancer',
    name: 'Ottawa Score (Cancer-Associated VTE Recurrence)',
    shortName: 'Ottawa VTE Cancer',
    description:
      'Ottawa score for risk of recurrent VTE in patients with cancer-associated thrombosis on anticoagulation.',
    category: 'hematology',
    tags: ['cancer', 'vte', 'ottawa', 'recurrence', 'thrombosis'],
    whenToUse: 'Patients with cancer-associated VTE when estimating recurrence risk on anticoagulation.',
    whyUse: 'Identifies lower vs higher recurrence risk while anticoagulated; informs counseling and intensity discussions (not a stop rule).',
    inputs: [
      yesNo('female', 'Female sex', 1),
      yesNo('lung', 'Lung cancer', 1),
      yesNo('breast', 'Breast cancer', -1),
      yesNo('tnm1', 'TNM stage I disease', -2),
      yesNo('priorVte', 'Previous VTE before the cancer-associated event', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.female) ? 1 : 0) +
        (bool(values.lung) ? 1 : 0) +
        (bool(values.breast) ? -1 : 0) +
        (bool(values.tnm1) ? -2 : 0) +
        (bool(values.priorVte) ? 1 : 0);

      if (score <= 0) {
        return {
          score,
          label: 'Low recurrence risk (≤0)',
          interpretation: `Ottawa score ${score}: low risk of recurrent VTE while anticoagulated (~5% range in validation literature). Still usually continue cancer-associated VTE therapy while cancer active; score informs relative risk.`,
          riskLevel: 'low',
          details: [
            { label: 'Threshold', value: '≤0 low; ≥1 high' },
            { label: 'Points', value: 'Female +1, lung +1, breast −1, stage I −2, prior VTE +1' },
          ],
          recommendations: [
            'Continue anticoagulation while cancer active / on therapy per guidelines',
            'Reassess if cancer status changes',
            'Do not stop solely because score is low without oncology/hematology plan',
          ],
        };
      }
      return {
        score,
        label: 'High recurrence risk (≥1)',
        interpretation: `Ottawa score ${score}: higher risk of recurrent VTE on anticoagulation (~15%+ range). Ensure adequate dosing, adherence, and consider specialist input if breakthrough thrombosis.`,
        riskLevel: 'high',
        details: [
          { label: 'Threshold', value: '≤0 low; ≥1 high' },
          { label: 'Points', value: 'Female +1, lung +1, breast −1, stage I −2, prior VTE +1' },
        ],
        recommendations: [
          'Confirm correct anticoagulant and dose for weight/renal function',
          'Evaluate adherence and drug interactions',
          'Hematology/oncology coordination for breakthrough events',
        ],
      };
    },
    evidence: {
      summary:
        'Ottawa score predicts recurrent VTE in cancer-associated thrombosis: female (+1), lung cancer (+1), breast (−1), TNM stage I (−2), prior VTE (+1). ≤0 low risk; ≥1 high risk.',
      formula: 'Sum of weighted items; dichotomize at 0 / ≥1',
      validation: 'Derived and validated in cancer-associated VTE populations (Louzada et al.).',
      references: [
        {
          title: 'Development of a clinical prediction rule for risk stratification of recurrent VTE in patients with cancer-associated VTE',
          citation: 'Louzada ML et al. Circulation. 2012',
          year: 2012,
          pmid: '22679142',
          doi: '10.1161/CIRCULATIONAHA.111.051920',
        },
      ],
    },
    nextSteps: [
      { condition: '≤0', actions: ['Standard CAT anticoagulation pathway', 'Reassess with cancer trajectory'] },
      { condition: '≥1', actions: ['Optimize anticoagulation', 'Lower threshold for investigating breakthrough symptoms'] },
    ],
    pearls: [
      'Score predicts recurrence on treatment — not a rule to withhold anticoagulation.',
      'Breast and stage I contribute negative points (lower recurrence stratum).',
    ],
  },
  {
    id: 'herdoo2',
    name: 'HERDOO2 Rule (Women, VTE Duration)',
    shortName: 'HERDOO2',
    description:
      'HERDOO2 rule to identify women with unprovoked VTE at low risk of recurrence who may discontinue anticoagulation after short-term therapy.',
    category: 'hematology',
    tags: ['vte', 'herdoo2', 'anticoagulation', 'recurrence', 'women'],
    whenToUse:
      'Women with a first unprovoked VTE after completing 5–12 months of anticoagulation when considering discontinuation.',
    whyUse: '0–1 HERDOO2 points ≈ low recurrence risk suitable for stopping in management studies; ≥2 continue.',
    inputs: [
      yesNo('hyperpig', 'Hyperpigmentation, edema, or redness in either lower extremity', 1),
      yesNo('ddimer', 'Vidas D-dimer ≥ 250 µg/L while on anticoagulation', 1, 'Assay-specific threshold from derivation'),
      yesNo('obesity', 'BMI ≥ 30 kg/m²', 1),
      yesNo('older', 'Age ≥ 65 years', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.hyperpig) ? 1 : 0) +
        (bool(values.ddimer) ? 1 : 0) +
        (bool(values.obesity) ? 1 : 0) +
        (bool(values.older) ? 1 : 0);

      if (score <= 1) {
        return {
          score,
          label: 'Low risk (0–1) — may discontinue',
          interpretation: `HERDOO2 score ${score}: low risk of recurrent VTE in women after unprovoked VTE (~3%/year range in validation). Reasonable to discontinue anticoagulation after short-term therapy if no other indication to continue, with shared decision-making.`,
          riskLevel: 'low',
          details: [
            { label: 'Rule', value: 'HERDOO2 0–1 low risk; ≥2 high risk' },
            { label: 'Applies to', value: 'Women with unprovoked VTE only' },
          ],
          recommendations: [
            'Shared decision to stop anticoagulation if no other indication',
            'Counsel on recurrent VTE symptoms',
            'Address estrogen exposure / future risk situations',
          ],
        };
      }
      return {
        score,
        label: 'High risk (≥2) — continue anticoagulation',
        interpretation: `HERDOO2 score ${score}: higher recurrence risk — indefinite anticoagulation generally preferred after unprovoked VTE (if bleed risk acceptable).`,
        riskLevel: 'high',
        details: [
          { label: 'Rule', value: 'HERDOO2 0–1 low risk; ≥2 high risk' },
          { label: 'Points', value: 'HERDOO features 1 each (max 4)' },
        ],
        recommendations: [
          'Continue anticoagulation long-term if low bleed risk',
          'Reassess bleed risk periodically',
          'DOAC preferred for most without contraindication',
        ],
      };
    },
    evidence: {
      summary:
        'HERDOO2 (Hyperpigmentation/Edema/Redness; Vidas D-dimer ≥250 on treatment; Obesity BMI≥30; Older age≥65): women with 0–1 features after unprovoked VTE have low recurrence risk when anticoagulation is stopped.',
      formula: '1 point each for H/E/R, elevated on-treatment D-dimer, BMI≥30, age≥65; low risk if ≤1',
      validation: 'Derived and prospectively validated (REVERSE / HERDOO2 management study); not validated to stop therapy in men.',
      references: [
        {
          title: 'Validating the HERDOO2 rule to guide treatment duration for women with unprovoked VTE',
          citation: 'Rodger MA et al. BMJ. 2017',
          year: 2017,
          pmid: '28314711',
          doi: '10.1136/bmj.j1065',
        },
      ],
    },
    nextSteps: [
      { condition: '0–1 points', actions: ['Discuss stopping anticoagulation', 'Plan follow-up and return precautions'] },
      { condition: '≥2 points', actions: ['Long-term anticoagulation if appropriate', 'Bleeding risk mitigation'] },
    ],
    pearls: [
      'Do not apply HERDOO2 to men — men were high risk regardless in derivation.',
      'D-dimer threshold is assay-specific (Vidas ≥250 µg/L on anticoagulation).',
    ],
  },
];
