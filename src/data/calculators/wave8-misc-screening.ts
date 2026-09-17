import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** Plate option builder for Ishihara: correct answer earns a point chip; any other answer is an error. */
function ishiharaPlate(
  id: string,
  plateNo: number,
  correct: string,
  commonMisread: string | null,
  helpText: string
) {
  const options: { label: string; value: string; points?: number }[] = [
    { label: correct, value: 'correct', points: 1 },
  ];
  if (commonMisread) options.push({ label: commonMisread, value: 'misread', points: 0 });
  options.push({ label: 'Other number', value: 'other', points: 0 });
  options.push({ label: 'Plate cannot be read', value: 'unreadable', points: 0 });
  return selectInput(
    id,
    `Plate ${plateNo} — what number does the patient see?`,
    options,
    'correct',
    helpText
  );
}

/** Wave 8 miscellaneous screening calculators (ophthalmology, urology, derm, neuro, surgery, etc.). */
export const wave8MiscScreeningCalcs: Calculator[] = [
  // ─── 1. Ishihara Color Vision Screening ───────────────────────────────────
  {
    id: 'ishihara-color-vision',
    name: 'Color Vision Screening (Ishihara Test)',
    shortName: 'Ishihara',
    description:
      'Screens for red-green color vision deficiency using an 11-plate Ishihara-style pseudoisochromatic series. More than 2 incorrect plates indicates color vision deficiency.',
    category: 'ophthalmology',
    tags: ['ishihara', 'color vision', 'color blindness', 'eye', 'screening', 'pseudoisochromatic'],
    isQuestionnaire: true,
    whenToUse:
      'Screening adults and older children for congenital red-green color deficiency (e.g., occupational screening, before aviation/military duty, or when optic nerve or retinal disease is suspected). Test each eye independently with near correction if worn.',
    whyUse:
      'Pseudoisochromatic plates are the standard first-line screen for red-green deficiency; they are fast, need no verbal color naming, and flag patients who need formal color-vision testing (e.g., anomaloscopy, Farnsworth).',
    inputs: [
      ishiharaPlate('p1', 1, '12', null, 'Demonstration plate — essentially all subjects read "12"; failing it suggests poor effort, poor vision, or test administration error rather than color deficiency.'),
      ishiharaPlate('p2', 2, '8', '3', 'Normals read "8"; red-green deficient patients typically read "3".'),
      ishiharaPlate('p3', 3, '5', '2', 'Normals read "5"; red-green deficient patients typically read "2".'),
      ishiharaPlate('p4', 4, '29', '70', 'Normals read "29"; red-green deficient patients typically read "70".'),
      ishiharaPlate('p5', 5, '74', '21', 'Normals read "74"; red-green deficient patients typically read "21".'),
      ishiharaPlate('p6', 6, '7', null, 'Vanishing plate — clearly "7" to normals; usually illegible to red-green deficient patients.'),
      ishiharaPlate('p7', 7, '45', null, 'Vanishing plate — "45" to normals; illegible or misread in red-green deficiency.'),
      ishiharaPlate('p8', 8, '2', null, 'Normals read "2"; the figure is obscure to red-green deficient patients.'),
      ishiharaPlate('p9', 9, '16', null, 'Normals read "16"; most red-green deficient patients cannot read it.'),
      ishiharaPlate('p10', 10, '35', null, 'Normals and mild red-green deficiency read "35"; strong protans see only "5", strong deutans only "3".'),
      ishiharaPlate('p11', 11, '96', '69', 'Normals and mild red-green deficiency read "96"; strong protans see only "6", strong deutans only "9".'),
    ],
    calculate(values) {
      const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];
      let correct = 0;
      let unreadable = 0;
      for (const id of ids) {
        if (str(values[id]) === 'correct') correct += 1;
        else if (str(values[id]) === 'unreadable') unreadable += 1;
      }
      const errors = ids.length - correct;
      const deficient = errors > 2;
      const riskLevel = deficient ? 'high' : errors >= 1 ? 'moderate' : 'normal';
      const label = deficient
        ? 'Color vision deficiency likely'
        : errors >= 1
          ? 'Normal range (≤2 errors)'
          : 'Normal color vision';
      const interpretation = deficient
        ? `${correct}/11 plates read correctly (${errors} errors). More than 2 incorrect plates is consistent with red-green color vision deficiency — refer for formal ophthalmic color-vision testing before occupational decisions.`
        : `${correct}/11 plates read correctly (${errors} error${errors === 1 ? '' : 's'}). Within the pass range; no evidence of significant red-green deficiency on this screen.`;
      return {
        score: `${correct}/11`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Plates correct', value: `${correct} of 11` },
          { label: 'Errors', value: `${errors}` },
          { label: 'Unreadable plates', value: `${unreadable}` },
          { label: 'Pass criterion', value: '≤2 incorrect plates' },
        ],
        recommendations: deficient
          ? [
              'Refer to ophthalmology/optometry for formal color-vision testing (e.g., anomaloscope, Farnsworth-Munsell) before any licensing or occupational determination.',
              'Test each eye independently and repeat under standardized lighting if administration conditions were suboptimal.',
            ]
          : ['No further color-vision workup needed unless clinical suspicion remains (e.g., acquired optic nerve or retinal disease — screen each eye and compare).'],
      };
    },
    evidence: {
      summary:
        'Ishihara pseudoisochromatic plates are the most widely used screen for congenital red-green color deficiency. Shortened series (10–14 plates) are standard for screening; this implementation uses an 11-plate layout. A threshold of >2 incorrect plates is used to flag deficiency.',
      formula: 'Errors = plates answered incorrectly or unreadable; >2 errors = screen positive for color vision deficiency.',
      validation:
        'Sensitivity depends on plates used and allowed errors; published series show ~97% sensitivity for identifying anomalous trichromats at low error thresholds. The test screens only red-green defects — it does not grade severity or detect blue-yellow defects; failing patients need confirmatory testing.',
      references: [
        {
          title: 'Tests for Colour-Blindness (Ishihara plates)',
          citation: 'Ishihara S. Tokyo: Kanehara Shuppan (concise/14-plate and 24-plate editions)',
        },
        {
          title: 'Efficiency of the Ishihara test for identifying red-green colour deficiency',
          citation: 'Birch J. Ophthalmic Physiol Opt. 1997;17(5):403-408',
          year: 1997,
        },
        {
          title: 'Identification of red-green colour deficiency: sensitivity of the Ishihara and HRR pseudo-isochromatic plates',
          citation: 'Rodríguez-Carmona M et al. Ophthalmic Physiol Opt. 2010;30(5):421-429',
          year: 2010,
          doi: '10.1111/j.1475-1313.2010.00770.x',
        },
      ],
    },
    nextSteps: [
      { condition: '>2 incorrect plates', actions: ['Formal color-vision testing (ophthalmology/optometry)', 'Check each eye separately', 'Consider acquired causes: optic neuritis, glaucoma, macular disease, cataract, drugs'] },
      { condition: 'Fails demonstration plate (Plate 1)', actions: ['Verify lighting, screen brightness, viewing distance, and patient effort/comprehension', 'Check visual acuity first'] },
    ],
    pearls: [
      'Use proper lighting and a ~75 cm viewing distance; answers should be given within ~3 seconds per plate.',
      'Screens red-green deficiency only — it cannot grade severity and does not test blue-yellow axis defects.',
      'Plate 1 is a demonstration plate readable by nearly everyone; failure suggests administration or comprehension problems rather than color deficiency.',
      'Acquired (monocular, asymmetric) deficiency suggests ocular/optic nerve disease rather than congenital deficiency.',
    ],
  },

  // ─── 2. OHTS Calculator ───────────────────────────────────────────────────
  {
    id: 'ohts-poag-risk',
    name: 'Ocular Hypertension Treatment Study (OHTS) Calculator',
    shortName: 'OHTS risk',
    description:
      'Point system estimating 5-year risk of developing primary open-angle glaucoma (POAG) in ocular hypertension, derived from the pooled OHTS–EGPS model.',
    category: 'ophthalmology',
    tags: ['ohts', 'glaucoma', 'ocular hypertension', 'iop', 'poag', 'corneal thickness'],
    whenToUse:
      'Patients with ocular hypertension (elevated IOP without glaucomatous damage) to estimate 5-year POAG risk and guide observation vs treatment.',
    whyUse:
      'Pooled OHTS/EGPS validated model (c-statistic ~0.74) using age, mean IOP, central corneal thickness, vertical cup-to-disc ratio, and pattern standard deviation; the point system approximates the continuous model.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '30–44 years', value: 0, points: 0 },
        { label: '45–54 years', value: 1, points: 1 },
        { label: '55–64 years', value: 2, points: 2 },
        { label: '65–74 years', value: 3, points: 3 },
        { label: '≥75 years', value: 4, points: 4 },
      ], 2, 'Age band at baseline; older age carries more points in the pooled OHTS–EGPS model.'),
      selectInput('iop', 'Mean intraocular pressure (mean of 3 measurements per eye)', [
        { label: '<22 mmHg', value: 0, points: 0 },
        { label: '22 to <24 mmHg', value: 1, points: 1 },
        { label: '24 to <26 mmHg', value: 2, points: 2 },
        { label: '26 to <28 mmHg', value: 3, points: 3 },
        { label: '≥28 mmHg', value: 4, points: 4 },
      ], 1, 'Use Goldmann applanation tonometry as in OHTS: mean of three measurements per eye, averaged across both eyes.'),
      selectInput('cct', 'Mean central corneal thickness (µm)', [
        { label: '>600 µm', value: 0, points: 0 },
        { label: '576–600 µm', value: 1, points: 1 },
        { label: '551–575 µm', value: 2, points: 2 },
        { label: '526–550 µm', value: 3, points: 3 },
        { label: '≤525 µm', value: 4, points: 4 },
      ], 2, 'Ultrasound pachymetry, mean of three measurements per eye averaged across both eyes; thinner corneas carry more points.'),
      selectInput('cdr', 'Mean vertical cup-to-disc ratio by contour', [
        { label: '<0.3', value: 0, points: 0 },
        { label: '0.3 to <0.4', value: 1, points: 1 },
        { label: '0.4 to <0.5', value: 2, points: 2 },
        { label: '0.5 to <0.6', value: 3, points: 3 },
        { label: '≥0.6', value: 4, points: 4 },
      ], 1, 'Estimated by contour (not color), averaged across both eyes.'),
      selectInput('psd', 'Mean pattern standard deviation', [
        { label: '<1.8 dB', value: 0, points: 0 },
        { label: '1.8 to <2.0 dB', value: 1, points: 1 },
        { label: '2.0 to <2.4 dB', value: 2, points: 2 },
        { label: '2.4 to <2.8 dB', value: 3, points: 3 },
        { label: '≥2.8 dB', value: 4, points: 4 },
      ], 0, 'Humphrey full-threshold or SITA standard 30-2/24-2 pattern standard deviation (or Octopus 32-2 loss variance), 2 measurements per eye averaged across eyes.'),
    ],
    calculate(values) {
      const score =
        num(values.age) + num(values.iop) + num(values.cct) + num(values.cdr) + num(values.psd);
      let riskPct = '≤4%';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Low 5-year POAG risk (≤4%)';
      let interpretation = '';
      if (score > 12) {
        riskPct = '≥33%';
        riskLevel = 'high';
        label = 'High 5-year POAG risk (≥33%)';
        interpretation =
          `OHTS point score ${score}: estimated 5-year POAG risk ≥33%. Strongly consider initiating IOP-lowering therapy; discuss with the patient.`;
      } else if (score >= 11) {
        riskPct = '~20%';
        riskLevel = 'moderate';
        label = 'Intermediate-high risk (~20%)';
        interpretation =
          `OHTS point score ${score}: estimated 5-year POAG risk ~20%. Counsel on risks and benefits of treatment versus close observation.`;
      } else if (score >= 9) {
        riskPct = '~15%';
        riskLevel = 'moderate';
        label = 'Intermediate risk (~15%)';
        interpretation =
          `OHTS point score ${score}: estimated 5-year POAG risk ~15%. Counsel on risks and benefits of treatment versus close observation.`;
      } else if (score >= 7) {
        riskPct = '~10%';
        riskLevel = 'moderate';
        label = 'Intermediate risk (~10%)';
        interpretation =
          `OHTS point score ${score}: estimated 5-year POAG risk ~10%. Counsel on risks and benefits of treatment versus close observation.`;
      } else {
        interpretation =
          `OHTS point score ${score}: estimated 5-year POAG risk ≤4%. Observation every ~6 months is reasonable for most patients.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total points', value: `${score} (0–20)` },
          { label: 'Estimated 5-year POAG risk', value: riskPct },
          { label: 'Model', value: 'Pooled OHTS–EGPS point system' },
        ],
        recommendations:
          score > 12
            ? ['Strongly consider starting IOP-lowering therapy', 'Set target IOP and monitor visual fields + optic nerve imaging every 3–12 months']
            : score >= 7
              ? ['Counsel on treatment vs close observation (patient-specific factors: age, fellow eye, preference, adherence)', 'Monitor visual fields + optic nerve imaging']
              : ['Observation every ~6 months is reasonable', 'Reassess if IOP, disc, or fields change'],
      };
    },
    evidence: {
      summary:
        'The pooled OHTS–EGPS model identified five baseline predictors of POAG in untreated ocular hypertension: age, IOP, central corneal thickness, vertical cup-to-disc ratio, and Humphrey pattern standard deviation. The simplified point system assigns 0–4 points per variable (total 0–20) mapping to 5-year risk bands.',
      formula:
        'Score (0–20) → 5-year POAG risk: 0–6 ≤4%; 7–8 ~10%; 9–10 ~15%; 11–12 ~20%; >12 ≥33%.',
      validation:
        'OHTS model developed in the OHTS observation group and externally validated in the EGPS placebo group; pooled c-statistic 0.74 with good calibration. Applies to ocular hypertensives similar to trial participants; does not predict progression of established glaucoma.',
      references: [
        {
          title: 'A validated prediction model for the development of primary open angle glaucoma in individuals with ocular hypertension',
          citation: 'Ocular Hypertension Treatment Study Group; European Glaucoma Prevention Study Group. Ophthalmology. 2007;114(1):10-19',
          year: 2007,
          pmid: '17095090',
          doi: '10.1016/j.ophtha.2006.08.031',
        },
        {
          title: 'The Ocular Hypertension Treatment Study: a randomized trial determines that topical ocular hypotensive medication delays or prevents the onset of primary open-angle glaucoma',
          citation: 'Kass MA et al. Arch Ophthalmol. 2002;120(6):701-713',
          year: 2002,
          doi: '10.1001/archopht.120.6.701',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–6', actions: ['Observe ~every 6 months', 'Repeat fields and optic nerve assessment periodically'] },
      { condition: 'Score 7–12', actions: ['Counsel on risks/benefits of starting drops', 'Monitor every 3–12 months per findings'] },
      { condition: 'Score >12', actions: ['Initiate IOP-lowering therapy', 'Set a target IOP', 'Close surveillance of structure and function'] },
    ],
    pearls: [
      'Use Goldmann-type applanation IOP (mean of 3 per eye, both eyes averaged) and ultrasound pachymetry CCT as in the trials.',
      'Central corneal thickness is a powerful independent factor — thin corneas both under-read true IOP and confer higher risk.',
      'The point system approximates the continuous OHTS–EGPS model; the two methods give similar but not identical estimates.',
      'Diabetes was a protective factor in OHTS but is not part of the point score; interpret cautiously in diabetic patients.',
    ],
  },

  // ─── 3. CTS-6 ──────────────────────────────────────────────────────────────
  {
    id: 'cts-6',
    name: 'Carpal Tunnel Syndrome-6 (CTS-6)',
    shortName: 'CTS-6',
    description:
      'Weighted 6-item clinical score estimating the probability of carpal tunnel syndrome from history and physical examination.',
    category: 'orthopedics',
    tags: ['carpal tunnel', 'cts-6', 'median nerve', 'hand', 'neuropathy', 'phalen', 'tinel'],
    whenToUse:
      'Adults with suspected carpal tunnel syndrome to estimate diagnostic probability and decide whether electrodiagnostic testing is needed.',
    whyUse:
      'Validated weighted score; ≥12 corresponds to ~80% probability of CTS where electrodiagnostic testing adds little, while lower scores retain a meaningful chance of an alternative diagnosis.',
    inputs: [
      yesNo('medianNumbness', 'Numbness predominantly or exclusively in median nerve territory', 3.5, 'Sensory symptoms mostly in the thumb, index, middle, and/or ring fingers.', true),
      yesNo('nocturnal', 'Nocturnal numbness', 4, 'Symptoms prominent during sleep; numbness wakes the patient from sleep.', true),
      yesNo('thenar', 'Thenar atrophy and/or weakness', 5, 'Reduced thenar bulk, or manual motor testing of grade 4 or less (e.g., thumb abduction).', false),
      yesNo('phalen', 'Positive Phalen test', 5, 'Wrist flexion reproduces or worsens median-territory numbness/paresthesias.', true),
      yesNo('twoPoint', 'Loss of 2-point discrimination', 4.5, 'Failure to discriminate two points ≤5 mm apart in median-innervated digits.', false),
      yesNo('tinel', 'Positive Tinel sign', 4, 'Light tapping over the median nerve at the carpal tunnel produces radiating paresthesias into median-innervated digits (not proximally).', true),
    ],
    calculate(values) {
      const score =
        (bool(values.medianNumbness) ? 3.5 : 0) +
        (bool(values.nocturnal) ? 4 : 0) +
        (bool(values.thenar) ? 5 : 0) +
        (bool(values.phalen) ? 5 : 0) +
        (bool(values.twoPoint) ? 4.5 : 0) +
        (bool(values.tinel) ? 4 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'CTS less likely';
      let interpretation = '';
      if (score >= 18) {
        riskLevel = 'high';
        label = 'CTS very likely (≥18)';
        interpretation =
          `CTS-6 ${score}/26: ~99% specific for carpal tunnel syndrome. Electrodiagnostic testing is unlikely to change the diagnosis; proceed to treatment decisions.`;
      } else if (score >= 12) {
        riskLevel = 'moderate';
        label = 'CTS more likely (≥12)';
        interpretation =
          `CTS-6 ${score}/26: approximately 80% probability of CTS (LR+ ~4.5). Electrodiagnostic testing adds little certainty; treat clinically unless atypical features exist.`;
      } else {
        interpretation =
          `CTS-6 ${score}/26 (<12): CTS is less likely but not excluded. Consider mimics (cervical radiculopathy, proximal median or ulnar neuropathy, polyneuropathy); electrodiagnostic testing is reasonable if suspicion persists.`;
      }
      return {
        score,
        unit: 'points (of 26)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total score', value: `${score} / 26` },
          { label: 'Thresholds', value: '≥12 ≈ 80% probability; ≥18 ≈ 99% specific' },
        ],
        recommendations:
          score >= 12
            ? ['Initiate nonsurgical (splinting, steroid injection) or surgical management as appropriate', 'EDX usually unnecessary unless the picture is atypical or surgery is planned in an ambiguous case']
            : ['Consider alternative diagnoses', 'EDX testing may help if clinical suspicion remains high'],
      };
    },
    evidence: {
      summary:
        'Graham’s CTS-6 weights six clinical findings: median-territory numbness 3.5, nocturnal numbness 4, thenar atrophy/weakness 5, positive Phalen 5, loss of 2-point discrimination 4.5, and positive Tinel 4 — total 0–26.',
      formula: 'Sum of item weights; ≥12 ≈ 0.80 probability of CTS; ≥18 is ~99% specific.',
      validation:
        'Developed via expert-weighted regression and validated against electrodiagnostic criteria (Graham, JBJS 2008). Independent cohorts report ~89% sensitivity and ~80% specificity at ≥12 (LR+ 4.5, LR− 0.14); ≥18 is ~99% specific but only ~31% sensitive.',
      references: [
        {
          title: 'The value added by electrodiagnostic testing in the diagnosis of carpal tunnel syndrome',
          citation: 'Graham B. J Bone Joint Surg Am. 2008;90(12):2587-2593',
          year: 2008,
          pmid: '19047703',
          doi: '10.2106/JBJS.G.01362',
        },
        {
          title: 'Development and validation of diagnostic criteria for carpal tunnel syndrome',
          citation: 'Graham B et al. J Hand Surg Am. 2006;31(6):919-924',
          year: 2006,
          doi: '10.1016/j.jhsa.2006.03.005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥12', actions: ['Night splinting', 'Consider corticosteroid injection', 'Surgical evaluation if severe, progressive, or refractory'] },
      { condition: 'Score <12 but suspicion persists', actions: ['Nerve conduction studies/EMG', 'Evaluate mimics (C6 radiculopathy, pronator syndrome, polyneuropathy)'] },
    ],
    pearls: [
      'A useful adjunct — not a standalone diagnosis; integrate with duration, risk context (pregnancy, diabetes, hypothyroidism, repetitive use).',
      'Thenar atrophy and loss of 2-point discrimination imply more advanced median neuropathy.',
      'Common mimics: cervical radiculopathy, proximal median neuropathy, ulnar neuropathy, generalized polyneuropathy.',
    ],
  },

  // ─── 4. UAS / UAS7 ────────────────────────────────────────────────────────
  {
    id: 'uas-urticaria',
    name: 'Urticaria Activity Score (UAS / UAS7)',
    shortName: 'UAS7',
    description:
      'Daily urticaria activity score (wheals + pruritus, 0–6) and the UAS7 weekly sum (0–42) used to grade chronic spontaneous urticaria activity and treatment response.',
    category: 'dermatology',
    tags: ['urticaria', 'uas', 'uas7', 'hives', 'wheals', 'pruritus', 'csu', 'omalizumab'],
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'mode',
      activeInputIdsByMode: {
        daily: ['wheals', 'pruritus'],
        uas7: ['uas7sum'],
      },
    },
    whenToUse:
      'Chronic spontaneous urticaria (CSU) follow-up: patients document 24-hour wheal count and itch once daily; the 7-day sum (UAS7) grades weekly disease activity and response to therapy (e.g., antihistamines, omalizumab, cyclosporine).',
    whyUse:
      'The UAS7 is the guideline-recommended activity measure for CSU (EAACI/GA²LEN/EuroGuiDerm/APAAACI) and the standard endpoint in CSU trials; it standardizes disease activity assessment over time.',
    inputs: [
      selectInput('mode', 'Scoring mode', [
        { label: 'Daily UAS (single 24-hour assessment)', value: 'daily' },
        { label: 'UAS7 — sum of 7 consecutive daily UAS scores', value: 'uas7' },
      ], 'daily', 'Choose daily to score today’s wheals + itch (0–6), or UAS7 to enter the already-summed 7-day total (0–42).'),
      selectInput('wheals', 'Wheals (last 24 h)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild (<20 wheals/24 h)', value: 1, points: 1 },
        { label: 'Moderate (20–50 wheals/24 h)', value: 2, points: 2 },
        { label: 'Intense (>50 wheals/24 h or large confluent wheals)', value: 3, points: 3 },
      ], 1, 'Count hives over the past 24 hours; large confluent areas score 3 regardless of number.'),
      selectInput('pruritus', 'Pruritus (last 24 h)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild (present but not annoying or troublesome)', value: 1, points: 1 },
        { label: 'Moderate (troublesome but does not interfere with daily activity or sleep)', value: 2, points: 2 },
        { label: 'Intense (severe; interferes with daily activity or sleep)', value: 3, points: 3 },
      ], 1, 'Itch intensity over the past 24 hours judged by interference with activity and sleep.'),
      numberInput('uas7sum', 'UAS7 total (sum of 7 daily UAS scores)', {
        min: 0,
        max: 42,
        exampleValue: 12,
        helpText: 'Sum of the daily UAS (0–6 per day) over 7 consecutive days; maximum 42.',
      }),
    ],
    calculate(values) {
      const mode = str(values.mode, 'daily');
      if (mode === 'uas7') {
        const u7 = num(values.uas7sum, 0);
        let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
        let label = '';
        let interpretation = '';
        if (u7 === 0) {
          riskLevel = 'normal';
          label = 'UAS7 0 — complete response / no activity';
          interpretation = 'UAS7 = 0: hive- and itch-free week — complete disease control under current management.';
        } else if (u7 <= 6) {
          riskLevel = 'low';
          label = 'UAS7 1–6 — well-controlled activity';
          interpretation = `UAS7 ${u7}/42: well-controlled urticaria activity — the target band for ongoing therapy.`;
        } else if (u7 <= 15) {
          riskLevel = 'moderate';
          label = 'UAS7 7–15 — mild activity';
          interpretation = `UAS7 ${u7}/42: mild activity — review adherence and triggers; consider stepping up therapy if persistent.`;
        } else if (u7 <= 27) {
          riskLevel = 'high';
          label = 'UAS7 16–27 — moderate activity';
          interpretation = `UAS7 ${u7}/42: moderate activity — guideline escalation (antihistamine updosing, add-on omalizumab, or cyclosporine) may be warranted.`;
        } else {
          riskLevel = 'high';
          label = 'UAS7 28–42 — severe activity';
          interpretation = `UAS7 ${u7}/42: severe activity — escalate therapy per guideline ladder and assess for triggers/comorbidities.`;
        }
        return {
          score: u7,
          unit: 'UAS7 (0–42)',
          label,
          interpretation,
          riskLevel,
          details: [
            { label: 'UAS7', value: `${u7} / 42` },
            { label: 'Bands', value: '0 free; 1–6 well-controlled; 7–15 mild; 16–27 moderate; 28–42 severe' },
          ],
          recommendations:
            u7 <= 6
              ? ['Continue current management; recheck UAS7 periodically']
              : ['Optimize second-generation H1 antihistamine (up to 4× per guideline)', 'Consider omalizumab if refractory, then cyclosporine', 'Review triggers and comorbidities (e.g., CIndU, thyroid autoimmunity)'],
        };
      }
      const daily = num(values.wheals) + num(values.pruritus);
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      if (daily === 0) {
        label = 'No activity today';
      } else if (daily <= 2) {
        riskLevel = 'low';
        label = 'Mild daily activity';
      } else if (daily <= 4) {
        riskLevel = 'moderate';
        label = 'Moderate daily activity';
      } else {
        riskLevel = 'high';
        label = 'Severe daily activity';
      }
      return {
        score: daily,
        unit: 'UAS (0–6)',
        label,
        interpretation: `Daily UAS ${daily}/6 (wheals ${num(values.wheals)} + pruritus ${num(values.pruritus)}). Document once daily for 7 days and sum for the UAS7 used in guidelines and trials.`,
        riskLevel,
        details: [
          { label: 'Daily UAS', value: `${daily} / 6` },
          { label: 'Wheals / Pruritus', value: `${num(values.wheals)} / ${num(values.pruritus)}` },
          { label: 'UAS7', value: 'Sum of 7 consecutive daily scores (0–42)' },
        ],
        recommendations: [
          'Have the patient record the daily UAS in a diary for 7 consecutive days to compute UAS7.',
          'UAS7 ≤6 (well-controlled) or 0 (complete response) is the usual therapeutic target.',
        ],
      };
    },
    evidence: {
      summary:
        'The UAS grades wheals (0–3) and pruritus (0–3) each 24 h (daily total 0–6). The UAS7 sums seven consecutive daily scores (0–42) and is the guideline-recommended activity measure for chronic spontaneous urticaria.',
      formula: 'Daily UAS = wheals (0–3) + pruritus (0–3). UAS7 = Σ 7 daily UAS. Bands: 0 free; 1–6 well-controlled; 7–15 mild; 16–27 moderate; 28–42 severe.',
      validation:
        'UAS7 is endorsed by the international EAACI/GA²LEN/EuroGuiDerm/APAAACI urticaria guideline and is the standard primary endpoint in CSU trials (e.g., omalizumab). Once-daily and twice-daily versions produce comparable UAS7 values; a UAS7 ≤6 generally defines well-controlled disease.',
      references: [
        {
          title: 'The EAACI/GA²LEN/EDF/WAO guideline for the definition, classification, diagnosis and management of urticaria',
          citation: 'Zuberbier T et al. Allergy. 2018;73(7):1393-1414',
          year: 2018,
          doi: '10.1111/all.13397',
        },
        {
          title: 'Comparison of Urticaria Activity Score Over 7 Days (UAS7) values obtained from once-daily and twice-daily versions: results from the ASSURE-CSU study',
          citation: 'Stull D et al. Dermatol Ther (Heidelb). 2018;8(1):67-75',
          year: 2018,
          doi: '10.1007/s40257-017-0331-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'UAS7 1–6', actions: ['Maintain therapy', 'Periodic re-assessment'] },
      { condition: 'UAS7 ≥7 persistent', actions: ['Step up antihistamine dose per guideline', 'Add omalizumab if refractory after antihistamine optimization', 'Screen for inducible urticaria and comorbidities'] },
    ],
    pearls: [
      'Score once daily over the preceding 24 h; UAS7 needs 7 consecutive daily entries.',
      'A twice-daily (morning/evening) variant (UAS7TD) exists but is more cumbersome and less used.',
      'UAS7 measures activity only — pair with a control instrument (UCT) or QoL measure (DLQI) for full assessment.',
    ],
  },

  // ─── 5. Prostate Tumor Volume & Density ───────────────────────────────────
  {
    id: 'prostate-tumor-volume',
    name: 'Prostate Tumor Volume & Density',
    shortName: 'Prostate vol/PSAD',
    description:
      'Computes prostate gland volume from ellipsoid dimensions and PSA density (PSAD) to aid the BPH-versus-cancer biopsy decision.',
    category: 'urology',
    tags: ['prostate', 'psa density', 'psad', 'ellipsoid', 'prostate volume', 'bph', 'biopsy'],
    whenToUse:
      'Men with an elevated or borderline PSA in whom prostate dimensions (TRUS or MRI) are available — to compute gland volume and PSA density when weighing biopsy.',
    whyUse:
      'A larger gland produces more PSA; dividing PSA by volume (PSAD) partially corrects for BPH-driven PSA elevation and improves discrimination for clinically significant cancer, especially combined with mpMRI PI-RADS.',
    inputs: [
      numberInput('length', 'Prostate length (craniocaudal)', { unit: 'cm', min: 0.5, max: 15, step: 0.1, exampleValue: 4.5, helpText: 'Longitudinal dimension from TRUS or MRI (cm).' }),
      numberInput('width', 'Prostate width (transverse)', { unit: 'cm', min: 0.5, max: 15, step: 0.1, exampleValue: 4.2, helpText: 'Widest transverse dimension (cm).' }),
      numberInput('height', 'Prostate height (AP)', { unit: 'cm', min: 0.5, max: 15, step: 0.1, exampleValue: 3.2, helpText: 'Anteroposterior dimension (cm).' }),
      numberInput('psa', 'PSA', { unit: 'ng/mL', min: 0.01, max: 500, step: 0.01, exampleValue: 6.5, helpText: 'Serum PSA in ng/mL; use a stable value not drawn within ~6 weeks of biopsy, ejaculation, retention, or instrumentation.' }),
    ],
    calculate(values) {
      const l = num(values.length, 4.5);
      const w = num(values.width, 4.2);
      const h = num(values.height, 3.2);
      const psa = num(values.psa, 6.5);
      const volume = round(l * w * h * 0.52, 1);
      const psad = volume > 0 ? round(psa / volume, 3) : 0;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (psad > 0.2) {
        riskLevel = 'high';
        label = 'PSAD >0.20 — high suspicion';
        interpretation = `Prostate volume ≈ ${volume} cc; PSAD ${psad} ng/mL/cc exceeds 0.20 — higher suspicion for clinically significant cancer; biopsy/mpMRI correlation is typically warranted.`;
      } else if (psad > 0.15) {
        riskLevel = 'high';
        label = 'PSAD >0.15 — elevated';
        interpretation = `Prostate volume ≈ ${volume} cc; PSAD ${psad} ng/mL/cc exceeds the conventional 0.15 threshold — biopsy is often favored, ideally guided by mpMRI.`;
      } else if (psad >= 0.1) {
        riskLevel = 'moderate';
        label = 'PSAD 0.10–0.15 — intermediate';
        interpretation = `Prostate volume ≈ ${volume} cc; PSAD ${psad} ng/mL/cc is in the intermediate band — integrate with age, DRE, family history, PSA kinetics, and mpMRI if available.`;
      } else {
        riskLevel = 'low';
        label = 'PSAD <0.10 — lower suspicion';
        interpretation = `Prostate volume ≈ ${volume} cc; PSAD ${psad} ng/mL/cc is below 0.10 — most of the PSA elevation is plausibly gland-size related; continue surveillance as clinically indicated.`;
      }
      return {
        score: psad,
        unit: 'ng/mL/cc',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Prostate volume (ellipsoid)', value: `${volume} cc` },
          { label: 'PSA density', value: `${psad} ng/mL/cc` },
          { label: 'Formula', value: 'V = L × W × H × 0.52; PSAD = PSA ÷ V' },
          { label: 'Conventional threshold', value: '0.15 ng/mL/cc' },
        ],
        recommendations:
          psad > 0.15
            ? ['Correlate with mpMRI (PI-RADS) and consider biopsy', 'Ensure PSA was drawn under valid conditions (no recent instrumentation/infection)']
            : ['Continue PSA surveillance', 'Reassess if PSA rises or exam changes'],
      };
    },
    evidence: {
      summary:
        'Prostate volume is estimated by the prolate-ellipsoid formula (L × W × H × 0.52, ≈ π/6), and PSA density = serum PSA ÷ gland volume. PSAD was introduced by Benson et al. to separate BPH- from cancer-driven PSA elevation; the classic biopsy-consideration threshold is 0.15 ng/mL/cc, with modern EAU risk-adapted bands at 0.10/0.15/0.20 combined with PI-RADS.',
      formula: 'V = L × W × H × 0.52; PSAD = PSA / V.',
      validation:
        'The ellipsoid formula is the PI-RADS v2.1 convention though it underestimates planimetric volume ~17% (biasing PSAD upward). PSAD ≥0.15 detects roughly half of Gleason ≥7 cancers in large series — 0.10 offers higher sensitivity at lower specificity; always pair with mpMRI and clinical context.',
      references: [
        {
          title: 'Prostate specific antigen density: a means of distinguishing benign prostatic hypertrophy and prostate cancer',
          citation: 'Benson MC et al. J Urol. 1992;147(3 Pt 2):815-816',
          year: 1992,
          pmid: '1371554',
        },
        {
          title: 'PSA density and PI-RADS for risk-adapted biopsy decisions',
          citation: 'Schoots IG / Nordström T et al. Prostate Cancer Prostatic Dis. 2018',
          year: 2018,
        },
      ],
    },
    nextSteps: [
      { condition: 'PSAD >0.15', actions: ['mpMRI prostate if not already done', 'Urology referral for biopsy discussion'] },
      { condition: 'PSAD 0.10–0.15', actions: ['Risk-adapted decision with age, family history, DRE, PI-RADS'] },
      { condition: 'PSAD <0.10', actions: ['Interval PSA surveillance'] },
    ],
    pearls: [
      'Use the ellipsoid 0.52 coefficient — the thresholds quoted in the literature are defined on it.',
      'PSA is assay-, timing-, and activity-sensitive: avoid values drawn within weeks of ejaculation, cycling, retention, cystoscopy, or biopsy.',
      'PSAD performs best for the PSA "gray zone" (~4–10 ng/mL); at very high PSA it adds little.',
    ],
  },

  // ─── 6. PSA Doubling Time ─────────────────────────────────────────────────
  {
    id: 'psadt',
    name: 'PSA Doubling Time (PSADT)',
    shortName: 'PSADT',
    description:
      'Calculates PSA doubling time from serial PSA values by log-linear regression — a prognostic marker for biochemical recurrence and castration-resistant disease.',
    category: 'urology',
    tags: ['psa', 'psadt', 'doubling time', 'prostate cancer', 'biochemical recurrence', 'nmcrpc'],
    whenToUse:
      'Men with prostate cancer and serial rising PSA — especially biochemical recurrence after prostatectomy/radiation or non-metastatic castration-resistant disease — to gauge pace of progression.',
    whyUse:
      'PSADT is among the strongest predictors of metastasis and prostate-cancer mortality; published decision thresholds (≤9–10 months for high-risk BCR and nmCRPC) drove the SPARTAN/PROSPER/ARAMIS/EMBARK treatment trials.',
    inputs: [
      numberInput('psa1', 'PSA 1 (earliest)', { unit: 'ng/mL', min: 0.01, max: 1000, step: 0.01, exampleValue: 0.4, helpText: 'First (earliest) PSA value. Ideally all values come from the same lab/assay.' }),
      numberInput('psa2', 'PSA 2', { unit: 'ng/mL', min: 0.01, max: 1000, step: 0.01, exampleValue: 0.8, helpText: 'Second PSA value.' }),
      numberInput('days12', 'Interval between PSA 1 and PSA 2', { unit: 'days', min: 1, max: 3650, exampleValue: 180, helpText: 'Days between the first and second draws. Use values separated by ≥3 months where possible and avoid values right after a treatment change (e.g., ADT start/stop).' }),
      numberInput('psa3', 'PSA 3 (optional)', { unit: 'ng/mL', min: 0.01, max: 1000, step: 0.01, exampleValue: 1.5, required: false, helpText: 'Optional third PSA — enter with its interval below for a 3-point log-linear regression (more robust than 2 points).' }),
      numberInput('days23', 'Interval between PSA 2 and PSA 3 (optional)', { unit: 'days', min: 1, max: 3650, exampleValue: 120, required: false, helpText: 'Days between the second and third draws; required if PSA 3 is entered.' }),
    ],
    calculate(values) {
      const p1 = num(values.psa1, 0.4);
      const p2 = num(values.psa2, 0.8);
      const d12 = num(values.days12, 180);
      const p3raw = values.psa3;
      const d23raw = values.days23;
      const has3 =
        p3raw !== null && p3raw !== undefined && p3raw !== '' &&
        d23raw !== null && d23raw !== undefined && d23raw !== '';
      const pts: { t: number; y: number }[] = [
        { t: 0, y: Math.log(Math.max(p1, 0.001)) },
        { t: Math.max(d12, 1), y: Math.log(Math.max(p2, 0.001)) },
      ];
      if (has3) {
        pts.push({
          t: Math.max(d12, 1) + Math.max(num(d23raw), 1),
          y: Math.log(Math.max(num(p3raw), 0.001)),
        });
      }
      let slope: number;
      if (pts.length === 2) {
        slope = (pts[1].y - pts[0].y) / (pts[1].t - pts[0].t);
      } else {
        const tbar = pts.reduce((s, p) => s + p.t, 0) / pts.length;
        const ybar = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        let sxy = 0;
        let sxx = 0;
        for (const p of pts) {
          sxy += (p.t - tbar) * (p.y - ybar);
          sxx += (p.t - tbar) * (p.t - tbar);
        }
        slope = sxx > 0 ? sxy / sxx : 0;
      }
      const details = [
        { label: 'Points used', value: `${pts.length} (log-linear regression)` },
        { label: 'ln(PSA) slope', value: `${round(slope * 30.44, 4)} per month` },
      ];
      if (!has3 && (p3raw || d23raw)) {
        details.push({ label: 'Note', value: 'Incomplete third measurement ignored (needs PSA 3 and its interval)' });
      }
      if (slope <= 0) {
        return {
          score: 'Not doubling',
          label: 'PSA stable or declining',
          interpretation:
            'The ln(PSA)-vs-time slope is zero or negative — PSA is not currently rising exponentially, so a doubling time cannot be computed. Continue monitoring; PSADT is only meaningful while PSA is rising.',
          riskLevel: 'normal',
          details,
          recommendations: ['Continue scheduled PSA surveillance', 'Confirm castrate testosterone (<50 ng/dL) if interpreting in a CRPC context'],
        };
      }
      const months = round(Math.LN2 / slope / 30.4375, 1);
      let riskLevel: 'moderate' | 'high' | 'critical' | 'low' = 'low';
      let label = '';
      let interpretation = '';
      if (months <= 3) {
        riskLevel = 'critical';
        label = 'PSADT ≤3 months — very rapid';
        interpretation = `PSADT ≈ ${months} months — very rapid doubling; historically associated with markedly higher metastasis and prostate-cancer mortality risk. Expedited work-up and management are warranted.`;
      } else if (months <= 10) {
        riskLevel = 'high';
        label = 'PSADT ≤10 months — high risk';
        interpretation = `PSADT ≈ ${months} months — meets the ≤9–10-month high-risk thresholds used for biochemical recurrence (NCCN) and nmCRPC trial enrollment (SPARTAN/PROSPER/ARAMIS); early systemic therapy or restaging discussion is appropriate.`;
      } else if (months <= 15) {
        riskLevel = 'moderate';
        label = 'PSADT 10–15 months — intermediate';
        interpretation = `PSADT ≈ ${months} months — intermediate kinetics; individualized management balancing Gleason score, time to recurrence, comorbidity, and patient preference.`;
      } else {
        riskLevel = 'low';
        label = 'PSADT >15 months — slower kinetics';
        interpretation = `PSADT ≈ ${months} months — relatively indolent kinetics; observation with serial PSA monitoring is often reasonable in lower-risk settings.`;
      }
      return {
        score: months,
        unit: 'months',
        label,
        interpretation,
        riskLevel,
        details: [
          ...details,
          { label: 'PSADT', value: `${months} months` },
          { label: 'Formula', value: 'ln(2) ÷ slope of ln(PSA) vs time' },
        ],
        recommendations:
          months <= 10
            ? ['Restage (PSMA PET-CT where available)', 'Discuss early systemic options per NCCN (e.g., ADT ± androgen-receptor inhibitor)', 'Confirm castrate testosterone if interpreting as nmCRPC']
            : ['Serial PSA monitoring', 'Recheck if the slope changes or symptoms emerge'],
      };
    },
    evidence: {
      summary:
        'PSADT = ln(2) divided by the slope of the linear regression of ln(PSA) versus time, using all available rising-phase values (minimum two, preferably ≥3 over ≥3 months from the same assay). Short PSADT is a validated surrogate for metastasis and prostate-cancer mortality.',
      formula: 'PSADT = ln 2 / [Δln(PSA)/Δt]. Two points: ln2 × t / (ln PSA₂ − ln PSA₁); ≥3 points: least-squares slope.',
      validation:
        'PSADT <3 months predicts prostate-cancer-specific mortality (D’Amico 2005, JAMA); ≤10 months defined nmCRPC trial populations with large metastasis-free-survival benefits (SPARTAN, PROSPER, ARAMIS); ≤9 months is the NCCN high-risk BCR criterion (EMBARK).',
      references: [
        {
          title: 'Natural history of progression after PSA elevation following radical prostatectomy',
          citation: 'Pound CR et al. JAMA. 1999;281(17):1591-1597',
          year: 1999,
          pmid: '10235151',
        },
        {
          title: 'Enzalutamide or Standard of Care in Metastatic Prostate Cancer — EMBARK: Enzalutamide plus leuprolide and enzalutamide monotherapy in high-risk biochemical recurrence',
          citation: 'Freedland SJ et al. N Engl J Med. 2023;389(16):1453-1465',
          year: 2023,
          pmid: '37851874',
        },
        {
          title: 'Prostate-Specific Antigen Working Group guidelines on PSA doubling time',
          citation: 'Arlen PM et al. J Urol. 2008;179(6):2181-2185',
          year: 2008,
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2667701/',
        },
      ],
    },
    nextSteps: [
      { condition: 'PSADT ≤10 months', actions: ['Restaging imaging (PSMA PET-CT preferred where available)', 'Systemic-therapy discussion per NCCN', 'Confirm castrate testosterone in CRPC settings'] },
      { condition: 'Stable/declining PSA', actions: ['No PSADT applicable', 'Routine surveillance'] },
    ],
    pearls: [
      'Use ≥3 values over ≥3 months from the same assay for the most reliable estimate.',
      'Exclude values immediately after treatment changes (e.g., ADT initiation or withdrawal) — they distort the slope.',
      'A non-rising PSA cannot be assigned a doubling time.',
      'PSADT does not replace staging: integrate with Gleason score, absolute PSA, and imaging.',
    ],
  },

  // ─── 7. PEDIS Score ───────────────────────────────────────────────────────
  {
    id: 'pedis-diabetic-foot',
    name: 'PEDIS Score for Diabetic Foot Ulcers',
    shortName: 'PEDIS',
    description:
      'IWGDF Perfusion–Extent–Depth–Infection–Sensation grading summed to a 0–12 score predicting healing, amputation, and mortality in diabetic foot ulcers.',
    category: 'endocrinology',
    tags: ['pedis', 'diabetic foot', 'ulcer', 'iwgdf', 'amputation', 'wound', 'perfusion'],
    whenToUse:
      'Inpatient assessment of diabetic foot ulcers of any duration to grade severity and predict adverse outcomes (non-healing, amputation, death). Not for secondary diabetes or ulcers of autoimmune/malignant cause.',
    whyUse:
      'The numeric PEDIS score (Chuan et al., 2015) showed good discrimination for ulcer outcomes — comparable or better than SINBAD and Wagner — and uses the IWGDF categories clinicians already document.',
    inputs: [
      selectInput('perfusion', 'Perfusion', [
        { label: 'No peripheral arterial disease', value: 0, points: 0 },
        { label: 'Peripheral arterial disease, no critical limb ischemia', value: 1, points: 1 },
        { label: 'Critical limb ischemia', value: 2, points: 2 },
      ], 0, 'PAD without CLI = 1; critical limb-threatening ischemia (rest pain, gangrene, or hemodynamic evidence of CLI) = 2.'),
      selectInput('extent', 'Extent (surface area)', [
        { label: 'Skin intact', value: 0, points: 0 },
        { label: '<1 cm²', value: 1, points: 1 },
        { label: '1–3 cm²', value: 2, points: 2 },
        { label: '>3 cm²', value: 3, points: 3 },
      ], 2, 'Ulcer surface area in cm² (largest dimension × perpendicular width is a practical estimate).'),
      selectInput('depth', 'Depth', [
        { label: 'Skin intact', value: 0, points: 0 },
        { label: 'Superficial', value: 1, points: 1 },
        { label: 'Fascia, muscle, or tendon', value: 2, points: 2 },
        { label: 'Bone or joint', value: 3, points: 3 },
      ], 1, 'Deepest tissue involved — probe with a sterile blunt probe and correlate with imaging (probe-to-bone suggests osteomyelitis).'),
      selectInput('infection', 'Infection', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Surface', value: 1, points: 1 },
        { label: 'Abscess, fasciitis, and/or septic arthritis', value: 2, points: 2 },
        { label: 'Systemic inflammatory response syndrome (SIRS)', value: 3, points: 3 },
      ], 0, 'Grade by IWGDF infection severity: superficial/skin and subcutaneous only = 1; deeper tissue involvement = 2; systemic signs = 3.'),
      selectInput('sensation', 'Sensation', [
        { label: 'Sensation intact', value: 0, points: 0 },
        { label: 'Loss of protective sensation', value: 1, points: 1 },
      ], 1, 'Loss of protective sensation (e.g., 10 g monofilament or 128-Hz tuning fork testing).'),
    ],
    calculate(values) {
      const p = num(values.perfusion);
      const e = num(values.extent);
      const d = num(values.depth);
      const i = num(values.infection);
      const s = num(values.sensation);
      const score = p + e + d + i + s;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score >= 8) {
        riskLevel = 'high';
        label = 'High PEDIS (8–12)';
        interpretation = `PEDIS ${score}/12 — high-severity ulcer: published cohorts show markedly higher rates of non-healing, amputation, and mortality at scores ≥8. Escalate multidisciplinary management.`;
      } else if (score >= 4) {
        riskLevel = 'moderate';
        label = 'Intermediate PEDIS (4–7)';
        interpretation = `PEDIS ${score}/12 — intermediate severity; outcome risk rises with each grade. Ensure vascular assessment, offloading, debridement, and infection control.`;
      } else {
        riskLevel = 'low';
        label = 'Lower PEDIS (0–3)';
        interpretation = `PEDIS ${score}/12 — lower-severity ulcer; continue standard diabetic foot care with close follow-up.`;
      }
      return {
        score,
        unit: 'points (of 12)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Perfusion / Extent', value: `${p} / ${e}` },
          { label: 'Depth / Infection / Sensation', value: `${d} / ${i} / ${s}` },
          { label: 'Total', value: `${score} / 12` },
        ],
        recommendations:
          score >= 8
            ? ['Urgent vascular surgery + infectious disease/wound care review', 'Assess need for revascularization, drainage, or amputation', 'Optimize glycemic control and nutrition']
            : score >= 4
              ? ['Vascular assessment (ABI/TBI) if not done', 'Debridement, offloading, treat infection per IWGDF/IDSA']
              : ['Routine diabetic foot care', 'Offloading and patient education'],
      };
    },
    evidence: {
      summary:
        'The IWGDF PEDIS categories (Perfusion 0–2, Extent 0–3, Depth 0–3, Infection 0–3, Sensation 0–1) were summed into a 0–12 numeric score by Chuan et al. Outcomes worsen monotonically with each subcategory grade; scores ≥8 mark a high-risk group in validation cohorts.',
      formula: 'Score = P (0–2) + E (0–3) + D (0–3) + I (0–3) + S (0–1), total 0–12.',
      validation:
        'In the derivation cohort (n=364) every subcategory independently predicted outcome and the summed score showed good diagnostic accuracy vs SINBAD and Wagner; subsequent cohorts confirm high scores (≥8 or >7) are associated with non-healing, amputation (~50%+), and death.',
      references: [
        {
          title: 'Reliability and validity of the Perfusion, Extent, Depth, Infection and Sensation (PEDIS) classification system and score in patients with diabetic foot ulcer',
          citation: 'Chuan F et al. PLoS One. 2015;10(4):e0124739',
          year: 2015,
          doi: '10.1371/journal.pone.0124739',
        },
        {
          title: 'Diabetic foot ulcer classification system for research purposes: a progress report on criteria for including patients in research studies',
          citation: 'Schaper NC (IWGDF). Diabetes Metab Res Rev. 2004;20 Suppl 1:S90-S95',
          year: 2004,
          doi: '10.1002/dmrr.464',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any infection grade ≥2', actions: ['Deep cultures after debridement', 'Empiric antibiotics per severity', 'Surgical drainage if abscess/fasciitis'] },
      { condition: 'Perfusion grade ≥1', actions: ['Vascular studies (ABI, toe pressures, duplex)', 'Vascular surgery consult for CLI'] },
      { condition: 'Depth grade 3', actions: ['Foot radiographs ± MRI for osteomyelitis', 'Bone biopsy/culture if feasible'] },
    ],
    pearls: [
      'Do not confuse the numeric PEDIS score with WIfI (Wound-Ischemia-foot Infection) — both grade severity but weight components differently.',
      '“Skin intact” categories exist for pre-ulcer/at-risk feet; a score of 0 does not require an open ulcer.',
      'Probe-to-bone and systemic signs are the two highest-yield bedside findings driving depth and infection grades.',
    ],
  },

  // ─── 8. Wound Closure Classification ──────────────────────────────────────
  {
    id: 'wound-closure-class',
    name: 'Wound Closure Classification',
    shortName: 'Closure type',
    description:
      'Classifies a wound by contamination and tissue loss to guide primary (first intention), secondary (second intention), or tertiary (delayed primary) closure.',
    category: 'surgery',
    tags: ['wound closure', 'primary closure', 'secondary intention', 'delayed primary', 'tertiary', 'laceration', 'trauma'],
    whenToUse:
      'Open wounds — especially traumatic wounds — when deciding how the wound should be closed or allowed to heal.',
    whyUse:
      'Matching closure method to wound contamination and tissue loss balances infection risk against cosmetic/functional outcome; distinct from the CDC surgical wound class (which grades SSI risk).',
    inputs: [
      selectInput('woundType', 'Wound characteristics', [
        {
          label: 'Clean wound with minimal tissue loss (e.g., surgical wound, clean laceration)',
          value: 'clean',
          description: 'Edges approximate without tension; low contamination',
        },
        {
          label: 'Significant tissue loss precluding tension-free closure, devitalized edges, ulceration, or abscess cavity',
          value: 'tissue-loss',
          description: 'Cannot be closed primarily without excessive tension or dead space',
        },
        {
          label: 'Grossly contaminated wound, with or without significant tissue loss',
          value: 'contaminated',
          description: 'High bacterial burden (e.g., bites, dirty trauma, neglected wounds)',
        },
      ], 'clean', 'Select the description that best fits the wound after inspection and debridement.'),
    ],
    calculate(values) {
      const t = str(values.woundType, 'clean');
      const map: Record<string, { closure: string; roman: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' }> = {
        clean: {
          closure: 'Primary closure (first intention)',
          roman: 'Primary',
          interpretation:
            'Clean wound with minimal tissue loss: close primarily by reapproximating edges (suture, staple, adhesive). Ideally within ~6–8 h of trauma (up to ~24 h in highly vascular areas such as the face/scalp).',
          riskLevel: 'low',
        },
        'tissue-loss': {
          closure: 'Secondary closure (second intention)',
          roman: 'Secondary',
          interpretation:
            'Significant tissue loss, devitalized edges, ulceration, or abscess cavity: leave open to heal by granulation and contraction with regular dressing changes; consider later grafting or flap coverage if needed.',
          riskLevel: 'moderate',
        },
        contaminated: {
          closure: 'Tertiary closure (delayed primary closure)',
          roman: 'Tertiary',
          interpretation:
            'Grossly contaminated wound: explore, irrigate, and debride; leave open and observe ~3–7 days, then perform delayed primary closure (or graft) once the wound is clean.',
          riskLevel: 'high',
        },
      };
      const m = map[t] ?? map.clean;
      return {
        score: m.roman,
        label: m.closure,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Recommended closure', value: m.closure },
          { label: 'Healing mode', value: `${m.roman} intention` },
        ],
        recommendations:
          t === 'clean'
            ? ['Close primarily if within the safe time window', 'Update tetanus prophylaxis', 'Educate on infection signs']
            : t === 'tissue-loss'
              ? ['Moist wound care with dressing changes ≥ daily', 'Plan secondary healing; consider graft/flap for large defects']
              : ['Irrigate and debride thoroughly', 'Leave open; reassess in 3–7 days for delayed primary closure', 'Antibiotics for high-risk contaminated wounds'],
      };
    },
    evidence: {
      summary:
        'Wounds are managed by primary (clean, minimal tissue loss, edges approximated), secondary (left open to granulate — significant tissue loss, devitalized edges, ulcers, abscess cavities), or tertiary/delayed primary closure (grossly contaminated wounds closed after ~3–7 days of open management).',
      formula: 'Wound type → closure type: clean+minimal loss → primary; tissue loss/devitalized → secondary; gross contamination → tertiary (delayed primary).',
      validation:
        'Descriptive surgical taxonomy (Leaper/EB Medicine Calculated Decisions); evidence comparing primary vs delayed closure in contaminated abdominal and open-fracture wounds is mixed. For open fractures, ACS TQIP guidelines advise closing skin defects at initial debridement and covering Gustilo IIIB wounds within 7 days.',
      references: [
        {
          title: 'Wound Closure Techniques (primary, secondary, and tertiary intention)',
          citation: 'StatPearls. NBK470598',
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK470598/',
        },
        {
          title: 'Calculated Decisions: Wound Closure Classification',
          citation: 'EB Medicine (Emergency Trauma Care) / Leaper D',
          url: 'https://www.ebmedicine.net/media_library/files/Calculated%20Decisions%20P1017%20Wound%20Closure.pdf',
        },
        {
          title: 'ACS TQIP Best Practices Guidelines: Orthopaedic Trauma (open fracture wound management)',
          citation: 'American College of Surgeons',
          url: 'https://www.facs.org/media/mkbnhqtw/ortho_guidelines.pdf',
        },
      ],
    },
    nextSteps: [
      { condition: 'Clean wound', actions: ['Primary closure', 'Tetanus update', 'Standard wound-care instructions'] },
      { condition: 'Tissue loss / devitalized edges', actions: ['Debride non-viable tissue', 'Heal by secondary intention or plan coverage (graft/flap)'] },
      { condition: 'Gross contamination', actions: ['Irrigate + debride', 'Delayed primary closure after 3–7 days', 'Culture-directed or empiric antibiotics as indicated'] },
    ],
    pearls: [
      'Different from the CDC surgical wound classification (I–IV), which predicts surgical-site-infection risk rather than dictating closure method.',
      'Facial/scalp wounds tolerate later primary closure (~24 h) because of their blood supply.',
      'Bite and heavily contaminated wounds are classic candidates for delayed primary or secondary closure.',
    ],
  },

  // ─── 9. ESAS-r ────────────────────────────────────────────────────────────
  {
    id: 'esas-r',
    name: 'Edmonton Symptom Assessment System — Revised (ESAS-r)',
    shortName: 'ESAS-r',
    description:
      'Patient-reported 0–10 intensity ratings for nine common palliative-care symptoms (total 0–90), tracking symptom burden and treatment response over time.',
    category: 'general',
    tags: ['esas', 'esas-r', 'palliative', 'symptom assessment', 'oncology', 'hospice'],
    isQuestionnaire: true,
    whenToUse:
      'Palliative care and advanced-cancer patients at each encounter (or daily in tertiary palliative/hospice units) to profile symptom intensity and monitor change.',
    whyUse:
      'Brief, validated, patient-centered symptom screen; guides targeted symptom management and documents trajectory. Any item ≥5 deserves deeper assessment.',
    inputs: [
      numberInput('pain', 'Pain', { min: 0, max: 10, exampleValue: 4, helpText: '0 = no pain; 10 = worst possible pain — how the patient feels now.' }),
      numberInput('tiredness', 'Tiredness (lack of energy)', { min: 0, max: 10, exampleValue: 5, helpText: '0 = no tiredness; 10 = worst possible tiredness.' }),
      numberInput('drowsiness', 'Drowsiness (feeling sleepy)', { min: 0, max: 10, exampleValue: 3, helpText: '0 = no drowsiness; 10 = worst possible drowsiness.' }),
      numberInput('nausea', 'Nausea', { min: 0, max: 10, exampleValue: 2, helpText: '0 = no nausea; 10 = worst possible nausea.' }),
      numberInput('appetite', 'Lack of appetite', { min: 0, max: 10, exampleValue: 4, helpText: '0 = no lack of appetite; 10 = worst possible lack of appetite.' }),
      numberInput('dyspnea', 'Shortness of breath', { min: 0, max: 10, exampleValue: 3, helpText: '0 = no shortness of breath; 10 = worst possible shortness of breath.' }),
      numberInput('depression', 'Depression (feeling sad)', { min: 0, max: 10, exampleValue: 2, helpText: '0 = no depression; 10 = worst possible depression.' }),
      numberInput('anxiety', 'Anxiety (feeling nervous)', { min: 0, max: 10, exampleValue: 3, helpText: '0 = no anxiety; 10 = worst possible anxiety.' }),
      numberInput('wellbeing', 'Wellbeing (overall feeling)', { min: 0, max: 10, exampleValue: 4, helpText: '0 = best wellbeing; 10 = worst possible wellbeing.' }),
    ],
    calculate(values) {
      const items: { key: string; label: string }[] = [
        { key: 'pain', label: 'Pain' },
        { key: 'tiredness', label: 'Tiredness' },
        { key: 'drowsiness', label: 'Drowsiness' },
        { key: 'nausea', label: 'Nausea' },
        { key: 'appetite', label: 'Lack of appetite' },
        { key: 'dyspnea', label: 'Shortness of breath' },
        { key: 'depression', label: 'Depression' },
        { key: 'anxiety', label: 'Anxiety' },
        { key: 'wellbeing', label: 'Wellbeing' },
      ];
      let total = 0;
      const severe: string[] = [];
      const moderate: string[] = [];
      for (const it of items) {
        const v = num(values[it.key]);
        total += v;
        if (v >= 7) severe.push(`${it.label} (${v})`);
        else if (v >= 4) moderate.push(`${it.label} (${v})`);
      }
      const riskLevel =
        severe.length > 0 || total >= 50 ? 'high' : moderate.length > 0 || total >= 20 ? 'moderate' : 'low';
      const label =
        severe.length > 0 ? 'Severe symptom burden' : moderate.length > 0 ? 'Moderate symptom burden' : 'Mild symptom burden';
      const parts: string[] = [`ESAS-r total ${total}/90.`];
      if (severe.length) parts.push(`Severe (≥7): ${severe.join(', ')}.`);
      if (moderate.length) parts.push(`Moderate (4–6): ${moderate.join(', ')}.`);
      if (!severe.length && !moderate.length) parts.push('No individual symptom ≥4.');
      return {
        score: total,
        unit: 'points (of 90)',
        label,
        interpretation: parts.join(' '),
        riskLevel,
        details: items.map((it) => ({ label: it.label, value: `${num(values[it.key])}/10` })),
        recommendations:
          severe.length > 0
            ? ['Explore each severe item with a focused assessment (e.g., OPQRSTUV) and escalate symptom-directed therapy', 'Reassess daily until controlled in tertiary palliative settings']
            : moderate.length > 0
              ? ['Assess moderate items in depth', 'Adjust symptom-directed therapy and re-check']
              : ['Continue current management; repeat ESAS-r at each contact or if symptoms change'],
      };
    },
    evidence: {
      summary:
        'The ESAS-r asks the patient (or caregiver proxy) to rate nine symptoms — pain, tiredness, drowsiness, nausea, appetite, dyspnea, depression, anxiety, wellbeing — each 0–10 “right now”. The revised version adds definitions, a “now” timeframe, and improved formatting; ratings are summed or graphed over time.',
      formula: 'Total = Σ nine 0–10 symptom ratings (0–90). Items 4–6 = moderate, ≥7 = severe; items ≥5 warrant in-depth assessment.',
      validation:
        'ESAS is extensively validated in palliative populations; the ESAS-r revision (Watanabe 2011) was easier for patients to understand while preserving rating consistency (ICC 0.65–0.83 vs original).',
      references: [
        {
          title: 'A multicenter study comparing two numerical versions of the Edmonton Symptom Assessment System in palliative care patients',
          citation: 'Watanabe SM et al. J Pain Symptom Manage. 2011;41(2):456-468',
          year: 2011,
          doi: '10.1016/j.jpainsymman.2010.04.020',
        },
        {
          title: 'The Edmonton Symptom Assessment System (ESAS): a simple method for the assessment of palliative care patients',
          citation: 'Bruera E et al. J Palliat Care. 1991;7(2):6-9',
          year: 1991,
          doi: '10.1177/082585979100700202',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any item ≥7', actions: ['Focused assessment (OPQRSTUV)', 'Escalate symptom-directed treatment', 'Daily reassessment in hospice/tertiary palliative units'] },
      { condition: 'Any item 4–6', actions: ['Assess in depth', 'Adjust therapy and re-evaluate'] },
      { condition: 'All items <4', actions: ['Repeat at next contact or sooner if status changes'] },
    ],
    pearls: [
      'Rate how the patient feels NOW; ask about best/worst in the last 24 h separately if needed.',
      'A tenth “other symptom” blank exists in the paper form — capture and track it alongside if relevant.',
      'Caregiver proxy ratings are acceptable when the patient cannot complete it, but the patient’s own report is preferred.',
      'Trends matter more than single values — graph scores over time.',
    ],
  },

  // ─── 10. DELTA-P Score ────────────────────────────────────────────────────
  {
    id: 'delta-p',
    name: 'Dutch-English LEMS Tumor Association Prediction (DELTA-P) Score',
    shortName: 'DELTA-P',
    description:
      'Six-item clinical score predicting the probability of small-cell lung cancer in patients with Lambert-Eaton myasthenic syndrome.',
    category: 'neurology',
    tags: ['lems', 'delta-p', 'lambert-eaton', 'sclc', 'paraneoplastic', 'lung cancer'],
    whenToUse:
      'At or within 3 months of LEMS diagnosis to estimate the likelihood of an underlying small-cell lung carcinoma and plan tumor screening.',
    whyUse:
      'About half of LEMS cases are paraneoplastic (SCLC). The DELTA-P score stratifies SCLC probability with high discrimination (AUC ~0.94) and drives a score-based screening schedule.',
    inputs: [
      yesNo('bulbar', 'D — Bulbar weakness (dysarthria, dysphagia, chewing or neck weakness)', 1, 'Any bulbar involvement at or within 3 months of onset: dysarthria, dysphagia, chewing difficulty, or neck weakness.', false),
      selectInput('erectile', 'E — Erectile dysfunction', [
        { label: 'Female patient', value: 0, points: 0 },
        { label: 'Male — absent', value: 0, points: 0 },
        { label: 'Male — present', value: 1, points: 1 },
      ], 0, 'Erectile dysfunction in male patients at onset (autonomic feature of SCLC-LEMS); women are scored as absent.'),
      yesNo('weightLoss', 'L — Weight loss ≥5%', 1, 'Loss of ≥5% body weight at or within 3 months of onset.', true),
      yesNo('tobacco', 'T — Tobacco use at onset', 1, 'Smoking/tobacco use at the time LEMS began.', true),
      selectInput('age', 'A — Age at onset', [
        { label: '<50 years', value: 0, points: 0 },
        { label: '≥50 years', value: 1, points: 1 },
      ], 1, 'Age when LEMS symptoms began.'),
      selectInput('karnofsky', 'P — Karnofsky performance status', [
        { label: '70–100 (able to carry on normal activity)', value: 0, points: 0 },
        { label: '0–60 (requires at least occasional assistance)', value: 1, points: 1 },
      ], 0, 'Karnofsky performance status <70 scores a point.'),
    ],
    calculate(values) {
      const score =
        (bool(values.bulbar) ? 1 : 0) +
        num(values.erectile) +
        (bool(values.weightLoss) ? 1 : 0) +
        (bool(values.tobacco) ? 1 : 0) +
        num(values.age) +
        num(values.karnofsky);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      let plan = '';
      if (score >= 4) {
        riskLevel = 'high';
        label = 'High probability of SCLC';
        interpretation = `DELTA-P ${score}/6 — original cohort SCLC probability ~94% (score 4), ~97% (5), 100% (6). Intensive tumor screening is mandatory.`;
      } else if (score === 3) {
        riskLevel = 'high';
        label = 'Elevated SCLC risk (score 3)';
        interpretation = 'DELTA-P 3/6 — substantially elevated SCLC probability; intensive tumor screening is mandatory.';
      } else if (score === 2) {
        riskLevel = 'moderate';
        label = 'Intermediate SCLC risk (score 2)';
        interpretation = 'DELTA-P 2/6 — intermediate risk; periodic re-screening still recommended for at least 2 years.';
      } else {
        riskLevel = 'low';
        label = 'Low SCLC probability (score 0–1)';
        interpretation = `DELTA-P ${score}/6 — original cohort SCLC probability 0–2.6%; limited screening may suffice, with one repeat at 6 months.`;
      }
      plan =
        score >= 3
          ? 'After an initial negative screen, repeat malignancy screening at 3 months, then every 6 months for ≥2 years.'
          : score === 2
            ? 'After an initial negative screen, repeat screening every 6 months for ≥2 years.'
            : 'Repeat screening once 6 months after a negative initial screen; if also negative, further screening may stop.';
      return {
        score,
        unit: 'points (of 6)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'DELTA-P', value: `${score} / 6` },
          { label: 'Suggested screening', value: plan },
        ],
        recommendations: [
          'Initial SCLC screen: chest CT (consider FDG-PET) at LEMS diagnosis.',
          plan,
          'SOX1 antibody positivity independently raises SCLC probability — check where available.',
        ],
      };
    },
    evidence: {
      summary:
        'DELTA-P assigns 1 point each for bulbar involvement, erectile dysfunction (men), weight loss ≥5%, tobacco use at onset, age ≥50, and Karnofsky <70 — all assessed at or within 3 months of LEMS onset.',
      formula: 'Score 0–6. SCLC probability: 0–1 → 0–2.6%; 4 → ~93.5%; 5 → ~96.6%; 6 → 100%.',
      validation:
        'Derived in a 107-patient Dutch cohort and validated in a 112-patient British cohort (AUC 94.4%/94.6%). A 2020 prospective validation (n=87) confirmed stepwise risk (0→0%, 4→85.7%, 6→100%; AUC 0.825).',
      references: [
        {
          title: 'Clinical Dutch-English Lambert-Eaton myasthenic syndrome (LEMS) tumor association prediction score accurately predicts small-cell lung cancer in the LEMS',
          citation: 'Titulaer MJ et al. J Clin Oncol. 2011;29(7):902-908',
          year: 2011,
          pmid: '21245427',
          doi: '10.1200/JCO.2010.32.0440',
        },
        {
          title: 'Lung cancer prediction in Lambert-Eaton myasthenic syndrome in a prospective cohort',
          citation: 'Lipka AF et al. Sci Rep. 2020;10:14957',
          year: 2020,
          doi: '10.1038/s41598-020-67571-9',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3', actions: ['Chest CT ± FDG-PET now', 'Rescreen at 3 months then every 6 months for ≥2 years'] },
      { condition: 'Score 2', actions: ['Rescreen every 6 months for ≥2 years'] },
      { condition: 'Score 0–1', actions: ['One repeat screen at 6 months; stop if negative'] },
    ],
    pearls: [
      'Score all items at/within 3 months of LEMS onset — later features do not count.',
      'SOX1 antibodies strongly associate with SCLC-LEMS and complement the clinical score.',
      'SCLC can still emerge >2 years after onset — persistent or new symptoms warrant re-evaluation beyond the screening window.',
    ],
  },

  // ─── 11. BeAM Value ───────────────────────────────────────────────────────
  {
    id: 'beam-value',
    name: 'BeAM Value (Bedtime–AM Glucose Difference)',
    shortName: 'BeAM',
    description:
      'Difference between bedtime and pre-breakfast blood glucose in type 2 diabetes on basal insulin — a high value suggests uncontrolled postprandial glucose and the need to add prandial insulin.',
    category: 'endocrinology',
    tags: ['beam', 'diabetes', 'basal insulin', 'prandial', 'postprandial glucose', 't2dm'],
    whenToUse:
      'T2DM patients on basal insulin whose fasting glucose is at/near target but A1c remains elevated — to decide whether to stop titrating basal insulin and add prandial coverage.',
    whyUse:
      'A large bedtime-to-morning glucose gap (overbasalization signal) indicates daytime postprandial excursions rather than inadequate basal insulin; it is a simple, home-measured guide for regimen intensification.',
    inputs: [
      numberInput('bedtime', 'Bedtime blood glucose', { unit: 'mmol/L', min: 1, max: 40, step: 0.1, exampleValue: 11.5, helpText: 'Self-measured glucose at bedtime (or ~2 h post-dinner). Enter in mmol/L; multiply mg/dL by 0.0555.' }),
      numberInput('am', 'Pre-breakfast (AM) blood glucose', { unit: 'mmol/L', min: 1, max: 40, step: 0.1, exampleValue: 6.5, helpText: 'Fasting/pre-breakfast self-measured glucose the next morning, same units.' }),
    ],
    calculate(values) {
      const be = num(values.bedtime, 11.5);
      const am = num(values.am, 6.5);
      const beamMmol = round(be - am, 1);
      const beamMgdl = round(beamMmol * 18.016, 0);
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = '';
      let interpretation = '';
      if (beamMmol > 2.78) {
        riskLevel = 'high';
        label = 'High BeAM — consider prandial insulin';
        interpretation = `BeAM ${beamMmol} mmol/L (${beamMgdl} mg/dL) exceeds ~50 mg/dL (2.8 mmol/L): elevated bedtime with relatively low morning glucose suggests basal titration is complete and postprandial excursions are the problem — adding prandial insulin (or a prandial GLP-1–based option) should be considered.`;
      } else if (beamMmol >= 0) {
        riskLevel = 'moderate';
        label = 'BeAM within expected range';
        interpretation = `BeAM ${beamMmol} mmol/L (${beamMgdl} mg/dL) is within the 0–50 mg/dL band — basal insulin titration may still be ongoing; continue titration to fasting target.`;
      } else {
        riskLevel = 'info';
        label = 'Negative BeAM — caution';
        interpretation = `BeAM ${beamMmol} mmol/L (${beamMgdl} mg/dL) is negative (morning glucose higher than bedtime): prandial intensification is not supported — investigate overnight phenomena (dawn phenomenon, nocturnal hypoglycemia/Somogyi-type rebound, or insufficient basal coverage).`;
      }
      return {
        score: beamMmol,
        unit: 'mmol/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'BeAM (mmol/L)', value: `${beamMmol}` },
          { label: 'BeAM (mg/dL)', value: `${beamMgdl}` },
          { label: 'High threshold', value: '>50 mg/dL (>2.8 mmol/L)' },
        ],
        recommendations:
          beamMmol > 2.78
            ? ['Consider adding prandial insulin (e.g., glulisine) to the largest meal', 'Alternatively consider basal insulin + GLP-1 RA fixed-ratio combinations', 'Avoid further basal updosing beyond fasting target (overbasalization)']
            : beamMmol >= 0
              ? ['Continue basal titration to fasting target', 'Recheck BeAM once fasting glucose is at goal']
              : ['Check for nocturnal hypoglycemia (3 AM reading/CGM)', 'Review basal timing/dose before adding prandial insulin'],
      };
    },
    evidence: {
      summary:
        'BeAM = bedtime glucose − pre-breakfast glucose. During basal-insulin titration the BeAM value rises; a high value (>50 mg/dL, ~2.8 mmol/L; some analyses use ≥55 mg/dL) correlates with the postprandial contribution to hyperglycemia and flags patients who should switch focus to prandial therapy.',
      formula: 'BeAM = BG(bedtime) − BG(pre-breakfast). >50 mg/dL → high.',
      validation:
        'Defined and tested in pooled basal-titration trial cohorts (Zisman et al., BMJ Open DRC 2016; n≈1400): week-24 BeAM correlated with postprandial contribution to hyperglycemia (r≈0.38–0.40) and fell when prandial therapy was added. Replicated in LixiLan-L (iGlarLixi) post-hoc analyses using a 55 mg/dL cut-off.',
      references: [
        {
          title: 'BeAM value: an indicator of the need to initiate and intensify prandial therapy in patients with type 2 diabetes mellitus receiving basal insulin',
          citation: 'Zisman A et al. BMJ Open Diabetes Res Care. 2016;4(1):e000171',
          year: 2016,
          pmid: '27110368',
          doi: '10.1136/bmjdrc-2015-000171',
        },
        {
          title: 'A difference between bedtime and pre-breakfast plasma glucose levels indicates the need for prandial insulin in basal insulin-treated type 2 diabetic patients with normal fasting glucose',
          citation: 'Calvi-Gries F et al. Horm Metab Res. 2021',
          year: 2021,
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7987255/',
        },
      ],
    },
    nextSteps: [
      { condition: 'BeAM >50 mg/dL (2.8 mmol/L)', actions: ['Add prandial insulin to the main meal or switch toward basal+GLP-1 combinations', 'Reassess A1c and postprandial readings'] },
      { condition: 'BeAM 0–50 mg/dL', actions: ['Continue basal titration to fasting target'] },
      { condition: 'BeAM <0', actions: ['Evaluate dawn phenomenon/nocturnal hypoglycemia', 'Do not add prandial insulin'] },
    ],
    pearls: [
      'Requires an at-target or near-target fasting glucose to interpret correctly — the concept flags overbasalization.',
      'A negative BeAM is a signal to investigate overnight glycemia, not to add mealtime insulin.',
      'The original analysis uses >50 mg/dL; some trial post-hoc analyses use ≥55 mg/dL — the interpretation is the same.',
    ],
  },

  // ─── 12. Ho Index ─────────────────────────────────────────────────────────
  {
    id: 'ho-index',
    name: 'Ho Index (Edinburgh Score for Acute Severe Ulcerative Colitis)',
    shortName: 'Ho index',
    description:
      'Day-3 risk score predicting failure of intravenous corticosteroids in acute severe ulcerative colitis, using stool frequency, colonic dilatation, and hypoalbuminemia.',
    category: 'gastroenterology',
    tags: ['ho index', 'ulcerative colitis', 'asuc', 'steroid failure', 'colectomy', 'edinburgh'],
    whenToUse:
      'On day 3 of admission for acute severe ulcerative colitis treated with IV corticosteroids, to predict medical-therapy failure and time second-line therapy (infliximab/ciclosporin) or colectomy.',
    whyUse:
      'Graded alternative to the Travis criteria that additionally captures colonic dilatation and nutritional state; a score ≥4 predicts steroid failure with ~85% sensitivity / ~75% specificity.',
    inputs: [
      selectInput('stools', 'Mean stool frequency over first 3 days', [
        { label: '≤4 stools/24 h', value: 0, points: 0 },
        { label: '>4 to ≤6 stools/24 h', value: 1, points: 1 },
        { label: '>6 to ≤9 stools/24 h', value: 2, points: 2 },
        { label: '>9 stools/24 h', value: 4, points: 4 },
      ], 1, 'Mean daily stool frequency over the first 3 days of IV steroid therapy.'),
      yesNo('dilatation', 'Colonic dilatation on abdominal radiograph (>5.5 cm)', 4, 'Transverse colon diameter >5.5 cm on plain abdominal film during admission — scores 4 points and is itself an emergency finding.', false),
      yesNo('albumin', 'Hypoalbuminemia — albumin ≤3.0 g/dL (≤30 g/L)', 1, 'Admission albumin ≤30 g/L.', true),
    ],
    calculate(values) {
      const score =
        num(values.stools) + (bool(values.dilatation) ? 4 : 0) + (bool(values.albumin) ? 1 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score >= 4) {
        riskLevel = 'high';
        label = 'High risk (≥4) — ~85% steroid failure';
        interpretation = `Ho index ${score}/9 — in the derivation cohort, scores ≥4 had ~85% failure of IV corticosteroids (sensitivity ~85%, specificity ~75%). Plan second-line medical therapy (infliximab/ciclosporin) and surgical review now.`;
      } else if (score >= 2) {
        riskLevel = 'moderate';
        label = 'Intermediate risk (2–3) — ~43% failure';
        interpretation = `Ho index ${score}/9 — intermediate band (~43% failure in the derivation cohort); close monitoring, and low threshold to escalate if trajectory worsens.`;
      } else {
        riskLevel = 'low';
        label = 'Low risk (0–1) — ~11% failure';
        interpretation = `Ho index ${score}/9 — low-risk band (~11% failure in the derivation cohort); continue IV steroids and standard ASUC care with reassessment.`;
      }
      return {
        score,
        unit: 'points (of 9)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total', value: `${score} / 9` },
          { label: 'Bands', value: '0–1 ~11% failure; 2–3 ~43%; ≥4 ~85%' },
        ],
        recommendations:
          score >= 4
            ? ['Gastroenterology + colorectal surgery review for rescue therapy/colectomy planning', 'If dilatation present, treat as a surgical urgency (toxic megacolon precautions)', 'Daily abdominal films and exam until stabilized']
            : score >= 2
              ? ['Continue IV steroids; reassess daily', 'Prepare contingency plan for rescue therapy']
              : ['Continue IV corticosteroids', 'VTE prophylaxis, stool studies, and nutrition support per ASUC protocol'],
      };
    },
    evidence: {
      summary:
        'The Ho (Edinburgh) index scores mean day-1–3 stool frequency (0/1/2/4 points for ≤4, 5–6, 7–9, >9), colonic dilatation >5.5 cm (+4), and admission albumin ≤30 g/L (+1) — total 0–9.',
      formula: 'Stool freq ≤4:0, >4–6:1, >6–9:2, >9:4; dilatation >5.5 cm: +4; albumin ≤30 g/L: +1. Bands: 0–1 ~11% failure; 2–3 ~43%; ≥4 ~85%.',
      validation:
        'Derivation cohort (n=167, Aliment Pharmacol Ther 2004) AUC 0.88; ≥4 gave 85% sensitivity / 75% specificity for steroid non-response. A large UK IBD-audit comparison (2016) confirmed risk stratification though absolute colectomy rates were lower than originally reported.',
      references: [
        {
          title: 'Predicting the outcome of severe ulcerative colitis: development of a novel risk score to aid early selection of patients for second-line medical therapy or surgery',
          citation: 'Ho GT et al. Aliment Pharmacol Ther. 2004;19(10):1079-1087',
          year: 2004,
          pmid: '15142197',
          doi: '10.1111/j.1365-2036.2004.01945.x',
        },
        {
          title: 'Predicting outcome in acute severe ulcerative colitis: comparison of the Travis and Ho scores using UK IBD audit data',
          citation: 'Keller DS et al. Aliment Pharmacol Ther. 2016;44(2):121-130',
          year: 2016,
          doi: '10.1111/apt.13614',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Start rescue-therapy discussion (infliximab/ciclosporin)', 'Colorectal surgery consult', 'Daily imaging/exam; watch for toxic megacolon'] },
      { condition: 'Colonic dilatation present', actions: ['Surgical urgency — stop antimotility agents, decompress as indicated, frequent review'] },
      { condition: 'Score 2–3', actions: ['Continue steroids; repeat scoring', 'Early escalation if deteriorating'] },
    ],
    pearls: [
      'Apply on day 3 of IV corticosteroids, using the mean stool frequency over the first 3 days.',
      'Colonic dilatation alone can reach the high-risk band (4 points) — a dilating colon is an emergency regardless of stool count.',
      'Complements rather than replaces the Travis (Oxford) criteria: stool >8/day or 3–8/day + CRP >45 on day 3 → ~85% colectomy historically.',
      'Absolute failure/colectomy rates are lower in the modern biologic era than in the original cohorts.',
    ],
  },

  // ─── 13. RESECT-90 ────────────────────────────────────────────────────────
  {
    id: 'resect-90',
    name: 'RESECT-90 (90-Day Mortality After Lung Resection)',
    shortName: 'RESECT-90',
    description:
      'Multivariable logistic model estimating 90-day mortality after lung resection from patient, functional, and operative variables.',
    category: 'surgery',
    tags: ['resect-90', 'lung resection', 'lobectomy', 'pneumonectomy', 'thoracic surgery', '90-day mortality'],
    whenToUse:
      'Preoperative risk estimation for patients being considered for lung resection (lobectomy, segmentectomy, pneumonectomy), particularly lung cancer surgery.',
    whyUse:
      '90-day mortality (~2× the 30-day rate) better captures the true perioperative risk window; RESECT-90 was derived from a contemporary 6,600-patient UK cohort and outperforms legacy models calibrated to 30-day/in-hospital endpoints.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 70, helpText: 'Age at surgery (years).' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 0 },
        { label: 'Male', value: 1 },
      ], 1, 'Male sex carries a positive coefficient (higher risk) in the model.'),
      selectInput('ecog', 'ECOG performance status', [
        { label: '0 — Fully active', value: 0 },
        { label: '1 — Restricted in strenuous activity', value: 1 },
        { label: '2 — Ambulatory, no work activities', value: 2 },
        { label: '3 — Limited self-care', value: 3 },
        { label: '4 — Completely disabled', value: 4 },
      ], 1, 'Eastern Cooperative Oncology Group performance status 0–4.'),
      numberInput('dlco', 'Predicted DLCO', { unit: '%', min: 10, max: 150, exampleValue: 60, helpText: 'Percentage predicted diffusing capacity of the lung for carbon monoxide.' }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 10, max: 60, step: 0.1, exampleValue: 25, helpText: 'Body mass index — higher BMI is modestly protective in this model.' }),
      numberInput('creatinine', 'Serum creatinine', { unit: 'µmol/L', min: 20, max: 1200, exampleValue: 88, helpText: 'Preoperative creatinine in µmol/L (multiply mg/dL by 88.4).' }),
      yesNo('anemia', 'Preoperative anemia (WHO: Hb <120 g/L women, <130 g/L men)', 0, 'Anemia by WHO thresholds at preoperative assessment.', false),
      yesNo('arrhythmia', 'Preoperative arrhythmia (e.g., atrial fibrillation)', 0, 'Documented arrhythmia such as atrial fibrillation.', false),
      yesNo('rightSide', 'Right-sided resection', 0, 'Resection of a right lung vs left.', true),
      numberInput('segments', 'Number of resected bronchopulmonary segments', { min: 1, max: 10, exampleValue: 3, helpText: 'Segments removed: e.g., lobectomy ≈ 3–5, pneumonectomy ≈ 10, wedge/segmentectomy ≈ 1–2.' }),
      yesNo('thoracotomy', 'Surgery via thoracotomy (vs VATS/robotic)', 0, 'Open approach scores higher risk than minimally invasive.', true),
      yesNo('malignant', 'Malignant diagnosis', 0, 'Resection for malignancy vs benign disease.', true),
    ],
    calculate(values) {
      const logit =
        -6.036 +
        num(values.age, 70) * 0.041 +
        num(values.sex) * 0.493 +
        num(values.ecog) * 0.183 -
        num(values.dlco, 60) * 0.029 -
        num(values.bmi, 25) * 0.056 +
        num(values.creatinine, 88) * 0.005 +
        (bool(values.anemia) ? 0.242 : 0) +
        (bool(values.arrhythmia) ? 0.608 : 0) +
        (bool(values.rightSide) ? 0.379 : 0) +
        num(values.segments, 3) * 0.179 +
        (bool(values.thoracotomy) ? 0.634 : 0) +
        (bool(values.malignant) ? 0.769 : 0);
      const p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, logit))));
      const pct = round(p * 100, 1);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      if (pct >= 10) {
        riskLevel = 'high';
        label = 'High 90-day mortality risk';
      } else if (pct >= 3) {
        riskLevel = 'moderate';
        label = 'Intermediate 90-day mortality risk';
      } else {
        label = 'Lower 90-day mortality risk';
      }
      const interpretation = `Estimated 90-day mortality ≈ ${pct}% (cohort mean ~3.1%). Use to inform shared decision-making and optimization; do not deny surgery on the estimate alone.`;
      return {
        score: pct,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Estimated 90-day mortality', value: `${pct}%` },
          { label: 'Model', value: 'Taylor et al. 2021 logistic model (UK cohort, n=6,600)' },
          { label: 'logit', value: `${round(logit, 3)}` },
        ],
        recommendations:
          pct >= 10
            ? ['Multidisciplinary review (thoracic surgery, anesthesia, pulmonology)', 'Optimize modifiable factors (anemia, arrhythmia, nutrition, pulmonary function)', 'Discuss alternatives (sublobar/minimally invasive resection, SABR) where oncologically appropriate']
            : pct >= 3
              ? ['Standard prehabilitation and optimization', 'Verify DLCO and consider cardiopulmonary exercise testing if borderline']
              : ['Routine perioperative pathway', 'Confirm functional work-up per BTS/ERS-ESTS guidance'],
      };
    },
    evidence: {
      summary:
        'RESECT-90 is a 12-variable logistic model for 90-day mortality after lung resection: logit = −6.036 + 0.041·age + 0.493·male + 0.183·ECOG − 0.029·%DLCO − 0.056·BMI + 0.005·creatinine(µmol/L) + 0.242·anemia + 0.608·arrhythmia + 0.379·right-sided + 0.179·segments + 0.634·thoracotomy + 0.769·malignant.',
      formula: 'P(90-day mortality) = 1 / (1 + e^(−logit)), with the logit above.',
      validation:
        'Derived on 6,600 UK resections (2012–2018; 90-day mortality 3.1%) with internal bootstrap validation (AUC ~0.74, acceptable calibration). A multicentre external validation has since been published (Clin Lung Cancer 2024/25).',
      references: [
        {
          title: 'Development and internal validation of a clinical prediction model for 90-day mortality after lung resection: the RESECT-90 score',
          citation: 'Taylor M et al. Interact Cardiovasc Thorac Surg. 2021;33(6):921-927',
          year: 2021,
          doi: '10.1093/icvts/ivab200',
        },
        {
          title: 'Multicentre validation of the RESECT-90 prediction model for 90-day mortality after lung resection',
          citation: 'Clin Lung Cancer. 2025',
          year: 2025,
          pmid: '39489628',
          doi: '10.1016/j.cllc.2024.10.005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Estimated risk ≥10%', actions: ['MDT review', 'Optimize anemia/arrhythmia/nutrition', 'Discuss less-extensive resection or non-surgical options'] },
      { condition: 'Borderline fitness', actions: ['CPET', 'DLCO recheck', 'Prehabilitation'] },
    ],
    pearls: [
      '90-day mortality is ~2× the 30-day rate — models built for 30-day outcomes underestimate the real perioperative window.',
      'Creatinine enters in µmol/L: mg/dL × 88.4.',
      'Higher BMI is modestly protective in the fitted model — do not interpret as a reason to defer weight management.',
      'Segment count: lobectomy ≈ 3–5, pneumonectomy ≈ 10, wedge/segmentectomy ≈ 1–2.',
    ],
  },

  // ─── 14. Sudbury Vertigo Risk Score ───────────────────────────────────────
  {
    id: 'sudbury-vertigo',
    name: 'Sudbury Vertigo Risk Score',
    shortName: 'SVRS',
    description:
      'Seven-item ED score stratifying risk of a serious central cause (stroke, TIA, vertebral artery dissection, brain tumor) in patients with vertigo/dizziness.',
    category: 'emergency',
    tags: ['vertigo', 'dizziness', 'sudbury', 'stroke', 'bppv', 'emergency', 'cerebellar'],
    whenToUse:
      'Adults presenting to the ED with vertigo, dizziness, or imbalance to estimate risk of a serious central diagnosis and guide imaging.',
    whyUse:
      'Derived and validated in large Canadian ED cohorts (c-statistic ~0.95); a score <5 carried ~0% serious-diagnosis risk with ~100% sensitivity in derivation and validation cohorts.',
    inputs: [
      yesNo('male', 'Male sex', 1, 'Male sex scores 1 point.', false),
      yesNo('age65', 'Age >65 years', 1, 'Age over 65 scores 1 point.', true),
      yesNo('diabetes', 'Diabetes mellitus', 1, 'Diabetes scores 1 point.', false),
      yesNo('htn', 'Hypertension', 3, 'Hypertension scores 3 points.', true),
      yesNo('motorSensory', 'Motor or sensory deficit', 5, 'Any focal motor weakness or sensory loss scores 5 points.', false),
      yesNo('cerebellar', 'Cerebellar deficit (diplopia, dysarthria, dysphagia, dysmetria, or ataxia)', 6, 'Any of: diplopia, dysarthria, dysphagia, dysmetria, or ataxia — scores 6 points.', false),
      yesNo('bppv', 'BPPV diagnosis (protective, −5)', -5, 'A diagnosed benign paroxysmal positional vertigo SUBTRACTS 5 points — only apply when BPPV is confidently diagnosed (e.g., classic positional nystagmus).', true),
    ],
    calculate(values) {
      const score =
        (bool(values.male) ? 1 : 0) +
        (bool(values.age65) ? 1 : 0) +
        (bool(values.diabetes) ? 1 : 0) +
        (bool(values.htn) ? 3 : 0) +
        (bool(values.motorSensory) ? 5 : 0) +
        (bool(values.cerebellar) ? 6 : 0) +
        (bool(values.bppv) ? -5 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score > 8) {
        riskLevel = 'high';
        label = 'High risk (>8) — ~41% serious diagnosis';
        interpretation = `Sudbury score ${score}: ~41% risk of a serious central diagnosis in the derivation cohort (16.7% in validation). Expedite neuroimaging (MRI/MRA or CT/CTA) and consider admission.`;
      } else if (score >= 5) {
        riskLevel = 'moderate';
        label = 'Moderate risk (5–8) — ~2% serious diagnosis';
        interpretation = `Sudbury score ${score}: ~2% risk of a serious central diagnosis. If a peripheral cause is uncertain, obtain MRI (± vascular imaging) and tailor work-up to suspicion and comorbidity.`;
      } else {
        riskLevel = 'low';
        label = 'Low risk (<5) — ~0% serious diagnosis';
        interpretation = `Sudbury score ${score}: ~0% risk of a serious diagnosis in derivation/validation (sensitivity ~100% for the <5 rule-out band). Manage benign causes (e.g., BPPV maneuvers), provide return precautions, and arrange follow-up — provided no red flags exist.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total', value: `${score}` },
          { label: 'Bands', value: '<5 low; 5–8 moderate; >8 high' },
        ],
        recommendations:
          score > 8
            ? ['Emergent MRI/MRA or CT/CTA', 'Activate stroke pathway if acute deficit', 'Optimize vascular risk factors; consider admission']
            : score >= 5
              ? ['MRI ± vascular imaging if peripheral cause uncertain', 'Clinical follow-up plan']
              : ['Treat benign cause (e.g., Epley for BPPV)', 'Discharge with return precautions and outpatient follow-up'],
      };
    },
    evidence: {
      summary:
        'Seven weighted items: male +1, age >65 +1, diabetes +1, hypertension +3, motor/sensory deficit +5, cerebellar deficit +6, and BPPV diagnosis −5.',
      formula: 'Score <5 → ~0% serious diagnosis; 5–8 → ~2.1%; >8 → ~41% (derivation) / 16.7% (validation).',
      validation:
        'Derived in a 2,078-patient prospective multicentre ED cohort (Ann Emerg Med 2024, c-statistic 0.96; score <5: sensitivity 100%, specificity 72%) and externally validated in a 4,559-patient historical cohort (c-statistic 0.95).',
      references: [
        {
          title: 'Development of a clinical risk score to risk stratify for a serious cause of vertigo in patients presenting to the emergency department',
          citation: 'Ohle R et al. Ann Emerg Med. 2024',
          year: 2024,
          pmid: '39093245',
          doi: '10.1016/j.annemergmed.2024.06.003',
        },
        {
          title: 'Validation of the Sudbury Vertigo Risk Score to risk stratify for a serious cause of vertigo',
          citation: 'Ohle R et al. Acad Emerg Med. 2025',
          year: 2025,
          doi: '10.1111/acem.70017',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score >8 or stroke concern', actions: ['Activate stroke protocol', 'MRI/MRA or CT/CTA', 'Admit for workup'] },
      { condition: 'Score 5–8', actions: ['MRI ± vascular imaging if peripheral cause uncertain', 'Tailor work-up to suspicion'] },
      { condition: 'Score <5', actions: ['Manage peripheral causes', 'Return precautions + outpatient follow-up'] },
    ],
    pearls: [
      'The −5 BPPV credit requires a confidently diagnosed BPPV — do not apply it merely because symptoms are positional.',
      'Cerebellar deficit is a composite: diplopia, dysarthria, dysphagia, dysmetria, or ataxia.',
      'Red flags trump the score — image any patient with concerning features regardless of score.',
      'Derivation and validation cohorts were older ED populations; performance in younger/undifferentiated dizziness may differ.',
    ],
  },

  // ─── 15. Roth Score ───────────────────────────────────────────────────────
  {
    id: 'roth-score',
    name: 'Roth Score for Hypoxia Screening',
    shortName: 'Roth score',
    description:
      'Bedside/telephone single-breath counting test (maximum number reached and counting time) used as a gross screen for hypoxemia in dyspneic patients.',
    category: 'pulmonary',
    tags: ['roth score', 'hypoxia', 'dyspnea', 'telemedicine', 'counting test', 'covid', 'spo2'],
    whenToUse:
      'Remote (telephone/video) or bedside screening of dyspneic patients when pulse oximetry is unavailable — e.g., early COVID-era telephone triage.',
    whyUse:
      'A free, reproducible proxy for oxygenation: counting ability in a single breath correlates with SpO2 (r ≈ 0.6–0.7). It is a screening adjunct only — never a substitute for oximetry or in-person evaluation.',
    inputs: [
      numberInput('maxCount', 'Maximum number reached before the next breath', { min: 0, max: 30, exampleValue: 18, helpText: 'Patient takes a deep breath and counts aloud from 1 as fast as possible in one breath; record the highest number reached (cap at 30).' }),
      numberInput('seconds', 'Total seconds counted before the next breath', { unit: 'sec', min: 0, max: 60, exampleValue: 8, helpText: 'Time in seconds from starting to count until the patient must take another breath (or reaches 30).' }),
    ],
    calculate(values) {
      const c = num(values.maxCount, 0);
      const t = num(values.seconds, 0);
      // Published tier scheme (Einstein 2020): normal >10 & >7s; moderate 7–10 or 5–7s; severe <7 or <5s.
      let tier: 'severe' | 'moderate' | 'normal';
      if (c < 7 || t < 5) tier = 'severe';
      else if (c <= 10 || t <= 7) tier = 'moderate';
      else tier = 'normal';
      const riskLevel = tier === 'severe' ? 'high' : tier === 'moderate' ? 'moderate' : 'low';
      const spo2band =
        tier === 'severe' ? '<~90%' : tier === 'moderate' ? '~90–94%' : '>~95%';
      const label =
        tier === 'severe' ? 'Severely altered — possible hypoxia' : tier === 'moderate' ? 'Moderately altered — possible borderline oxygenation' : 'Counting performance in normal range';
      const extra =
        c <= 20
          ? ' Note: in the largest validation study a counting number ≤20 was the optimal hypoxemia screen cutoff (sens ~93%, spec ~78%) — this result falls below it.'
          : ' The counting number exceeds the ≤20 hypoxemia screening cutoff identified in the largest validation study.';
      return {
        score: `${c} / ${t}s`,
        label,
        interpretation:
          `Max count ${c} in ${t} seconds — ${tier === 'normal' ? 'counting performance consistent with' : 'suggestive of'} SpO2 ${spo2band}.${extra} Screening adjunct only — obtain pulse oximetry and clinical assessment.`,
        riskLevel,
        details: [
          { label: 'Maximum count', value: `${c}` },
          { label: 'Counting time', value: `${t} s` },
          { label: 'Tiers', value: 'normal >10 & >7 s; moderate 7–10 or 5–7 s; severe <7 or <5 s' },
          { label: 'Validation cutoff', value: 'count ≤20 (sens ~93%, spec ~78% for SpO2 <95%)' },
        ],
        recommendations:
          tier === 'severe'
            ? ['Prompt in-person evaluation and pulse oximetry', 'Consider urgent care/ED referral if clinically dyspneic']
            : tier === 'moderate'
              ? ['Arrange pulse oximetry and clinical assessment', 'Repeat the test to confirm (use the second attempt)']
              : ['If clinical suspicion remains, still obtain oximetry — the screen is not specific'],
      };
    },
    evidence: {
      summary:
        'The Roth score times a single-breath count from 1 to 30 and records the maximum number reached and counting duration. Published tiers: normal (count >10 and >7 s), moderately altered (7–10 and/or 5–7 s), severely altered (<7 and/or <5 s), roughly tracking SpO2 >95%, 90–94%, and <90%.',
      formula: 'Max count + counting time in one breath → severity tier; validation cutoffs: counting time ~7 s and count ~20 for SpO2 <95%.',
      validation:
        'Index study (Chorin, Clin Cardiol 2016; n=93) — max count AUC 0.83, counting time AUC 0.76 for SpO2 <95%. Dutch validation (ten Broeke 2021; n=105) — count ≤20 was the best cutoff (sens 93%, spec 78%); counting time performed worse. The tool is unvalidated for children and remains a screening adjunct, not a diagnostic test.',
      references: [
        {
          title: 'Assessment of respiratory distress by the Roth score',
          citation: 'Chorin E et al. Clin Cardiol. 2016;39(11):636-639',
          year: 2016,
          doi: '10.1002/clc.22586',
        },
        {
          title: 'The Roth score as a triage tool for detecting hypoxaemia in general practice: a diagnostic validation study in patients with possible COVID-19',
          citation: 'ten Broeke CEM et al. Prim Health Care Res Dev. 2021;22:e56',
          year: 2021,
          doi: '10.1017/S1463423621000347',
        },
        {
          title: 'Validity of the "Roth score" for hypoxemia screening',
          citation: 'Am J Emerg Med. 2023',
          year: 2023,
          doi: '10.1016/j.ajem.2023.01.034',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severely altered (<7 count or <5 s)', actions: ['Urgent oximetry and in-person evaluation'] },
      { condition: 'Moderately altered', actions: ['Same-day pulse oximetry', 'Repeat test — the second attempt is the standard valid one'] },
      { condition: 'Normal tier but symptomatic', actions: ['Do not rule out hypoxia on this test alone', 'Obtain oximetry'] },
    ],
    pearls: [
      'Instructions: deep breath, then count 1–30 aloud in native language as fast as possible until out of breath.',
      'After 3 calm breaths, repeat — the second attempt is conventionally the valid measurement.',
      'Performance varies with language, pace, effort, and counting habits — interpret cautiously.',
      'Never use it alone to decide against in-person or emergency evaluation.',
    ],
  },

  // ─── 16. Wisconsin Criteria ───────────────────────────────────────────────
  {
    id: 'wisconsin-criteria',
    name: 'Wisconsin Criteria (Maxillofacial CT in Trauma)',
    shortName: 'Wisconsin criteria',
    description:
      'Five-item clinical decision rule for obtaining maxillofacial CT after facial trauma — any positive criterion identifies a high risk of facial fracture.',
    category: 'emergency',
    tags: ['wisconsin', 'maxillofacial', 'facial trauma', 'ct', 'fracture', 'decision rule', 'trauma'],
    whenToUse:
      'Trauma patients with suspected maxillofacial injury to decide whether dedicated facial CT is indicated.',
    whyUse:
      'In the derivation cohort the presence of any of the five criteria identified 98.2% of facial fractures (NPV ~88%), potentially avoiding a subset of unnecessary facial CTs.',
    inputs: [
      yesNo('stepoff', 'Bony stepoff or instability', null, 'Palpable step deformity or mobility of facial bones on examination.', true),
      yesNo('periorbital', 'Periorbital swelling or contusion', null, 'Periorbital ecchymosis/swelling — the most sensitive single criterion in validation cohorts.', true),
      yesNo('gcs', 'Glasgow Coma Scale <14', null, 'Depressed consciousness limits reliable facial examination.', false),
      yesNo('malocclusion', 'Malocclusion', null, 'Patient reports or demonstrates abnormal dental occlusion/bite.', false),
      yesNo('toothAbsence', 'Tooth absence', null, 'Missing tooth/teeth attributable to the trauma.', false),
    ],
    calculate(values) {
      const positives = [
        bool(values.stepoff),
        bool(values.periorbital),
        bool(values.gcs),
        bool(values.malocclusion),
        bool(values.toothAbsence),
      ].filter(Boolean).length;
      const ctIndicated = positives >= 1;
      return {
        score: `${positives}/5`,
        label: ctIndicated ? 'Maxillofacial CT indicated' : 'Low risk — CT may be deferred',
        interpretation: ctIndicated
          ? `${positives} of 5 Wisconsin criteria present — the patient is in the high-risk group for facial fracture (derivation sensitivity 98.2% when ≥1 criterion present); obtain dedicated maxillofacial CT.`
          : 'No Wisconsin criteria present — low risk for facial fracture requiring surgery in the derivation cohort (NPV ~88%; no low-risk patient required surgical treatment). Clinical judgment may still justify imaging.',
        riskLevel: ctIndicated ? 'moderate' : 'low',
        details: [
          { label: 'Criteria positive', value: `${positives} / 5` },
          { label: 'Rule', value: 'Any ≥1 positive → maxillofacial CT' },
        ],
        recommendations: ctIndicated
          ? ['Obtain dedicated maxillofacial CT', 'Continue standard trauma evaluation for associated injuries']
          : ['If exam remains concerning or mechanism is high-energy, image anyway — external validation showed lower sensitivity (81%)', 'Document return precautions and dental/maxillofacial follow-up'],
      };
    },
    evidence: {
      summary:
        'Five examination criteria — bony stepoff or instability, periorbital swelling or contusion, GCS <14, malocclusion, and tooth absence. Any positive criterion flags a high risk of facial fracture warranting maxillofacial CT.',
      formula: '≥1 criterion positive → obtain facial CT.',
      validation:
        'Derivation (Sitzman, Plast Reconstr Surg 2011; n=525): sensitivity 98.2%, NPV 87.8%, and no low-risk patient required surgery; internal validation ~97% sensitivity. External validation was weaker — Harrington et al. found 81% sensitivity / 60% NPV, so institutional performance may vary.',
      references: [
        {
          title: 'Clinical criteria for obtaining maxillofacial computed tomographic scans in trauma patients',
          citation: 'Sitzman TJ et al. Plast Reconstr Surg. 2011;127(3):1270-1278',
          year: 2011,
          doi: '10.1097/PRS.0b013e3182043ad8',
        },
        {
          title: 'Validation of clinical criteria for obtaining maxillofacial computed tomography in patients with trauma',
          citation: 'Sitzman TJ et al. J Craniofac Surg. 2015;26(4):1199-1202',
          year: 2015,
          doi: '10.1097/SCS.0000000000001712',
        },
        {
          title: 'External validation of University of Wisconsin’s clinical criteria for obtaining maxillofacial computed tomography in trauma',
          citation: 'Harrington AW et al. J Craniofac Surg. 2017',
          year: 2017,
          doi: '10.1097/SCS.0000000000004240',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any criterion positive', actions: ['Maxillofacial CT', 'Assess associated injuries (C-spine, intracranial, dental)'] },
      { condition: 'All criteria negative', actions: ['Clinical follow-up', 'Image if suspicion persists — external validation sensitivity was lower than derivation'] },
    ],
    pearls: [
      'Isolated nasal-bone fractures were excluded in the studies — the rule targets fractures needing operative attention.',
      'External validation showed lower sensitivity (81%) — maintain a low imaging threshold when exam or mechanism is concerning.',
      'GCS <14 scores positive because depressed consciousness makes the facial exam unreliable.',
      'Distinct from any UTI/respiratory “Wisconsin criteria” — this rule is for facial trauma imaging.',
    ],
  },
];
