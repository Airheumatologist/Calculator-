import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave2OrthoTraumaCalcs: Calculator[] = [
  {
    id: 'pittsburgh-knee',
    name: 'Pittsburgh Knee Rules',
    shortName: 'Pittsburgh Knee',
    description: 'Determines need for knee radiograph after blunt trauma or fall.',
    category: 'orthopedics',
    tags: ['knee', 'xray', 'trauma', 'pittsburgh'],
    whenToUse: 'Acute knee injury from blunt trauma or fall (not twisting-only without fall).',
    whyUse: 'High sensitivity alternative/adjunct to Ottawa Knee Rules; mechanism-focused.',
    inputs: [
      yesNo('mechanism', 'Blunt trauma or fall mechanism', 0),
      yesNo('ageExtreme', 'Age <12 or >50 years', 0),
      yesNo(
        'walk',
        'Unable to walk 4 weight-bearing steps in the ED',
        0,
        'Each of 4 steps must be full weight-bearing (limping allowed). Both feet take a step. Tested in the ED, not only at the scene.',
      ),
    ],
    calculate(values) {
      const mechanism = bool(values.mechanism);
      const ageExtreme = bool(values.ageExtreme);
      const walk = bool(values.walk);
      const pos = ageExtreme || walk;
      const details = [
        { label: 'Blunt trauma or fall mechanism', value: mechanism ? 'Yes' : 'No' },
        { label: 'Age <12 or >50 years', value: ageExtreme ? 'Yes' : 'No' },
        { label: 'Unable to walk 4 steps in ED', value: walk ? 'Yes' : 'No' },
      ];

      if (!mechanism) {
        return {
          score: 0,
          label: 'Rules not applicable',
          interpretation:
            'Pittsburgh rules apply to blunt trauma or fall. Use clinical judgment or Ottawa Knee Rules for other mechanisms.',
          riskLevel: 'info' as const,
          details,
        };
      }
      if (pos) {
        return {
          score: 1,
          label: 'X-ray indicated',
          interpretation:
            'Mechanism + (age <12 or >50, or inability to walk 4 steps in ED) — obtain knee radiographs.',
          riskLevel: 'moderate' as const,
          details,
        };
      }
      return {
        score: 0,
        label: 'X-ray not required by rules',
        interpretation:
          'Pittsburgh rules negative — clinically significant fracture unlikely if exam reliable.',
        riskLevel: 'low' as const,
        details,
      };
    },
    evidence: {
      summary:
        'Pittsburgh Knee Rules: after blunt trauma/fall, radiograph if age <12 or >50, or inability to walk four weight-bearing steps in the ED.',
      formula: 'X-ray if mechanism AND (age <12 OR age >50 OR unable 4 steps in ED)',
      validation: 'High sensitivity for knee fracture in derivation/validation cohorts; compare with Ottawa Knee Rules.',
      references: [
        {
          title: 'Clinical decision rule for knee radiographs',
          citation: 'Seaberg DC, Jackson R. Am J Emerg Med. 1994;12:541-543',
          year: 1994, pmid: '8060409',
          doi: '10.1016/0735-6757(94)90274-7', },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Knee X-ray series', 'Ortho follow-up if fracture or locked knee'] },
      { condition: 'Negative', actions: ['Conservative care', 'Reassess if not improving or inability to bear weight develops'] },
    ],
    pearls: ['Requires blunt trauma or fall — not validated for simple twisting injuries without fall.'],
  },

  {
    id: 'ottawa-hip',
    name: 'Ottawa Hip Rules',
    shortName: 'Ottawa Hip',
    description: 'Decision aid for hip radiography after trauma with hip/groin pain.',
    category: 'orthopedics',
    tags: ['hip', 'xray', 'trauma', 'ottawa', 'fracture'],
    whenToUse: 'Adults with acute hip or groin pain after fall or blunt trauma.',
    whyUse: 'Structures common high-yield cues for hip radiographs after trauma; occult fracture still possible if nonambulatory.',
    inputs: [
      yesNo('traumaPain', 'Acute hip/groin pain after fall or blunt trauma', 0),
      yesNo('age65', 'Age ≥65 years', 0),
      yesNo(
        'walk',
        'Unable to bear weight 4 steps both immediately AND in ED',
        0,
        'Same 4-step rule as Ottawa ankle/knee: unable BOTH immediately after injury AND in the ED. Limping is allowed if each step is weight-bearing.',
      ),
      yesNo(
        'limitedRom',
        'Painful limited active hip ROM (or inability to flex hip)',
        0,
        'Pain that limits active hip range, or inability to flex the hip (typically to 90°).',
      ),
    ],
    calculate(values) {
      const traumaPain = bool(values.traumaPain);
      const age65 = bool(values.age65);
      const walk = bool(values.walk);
      const limitedRom = bool(values.limitedRom);
      const pos = age65 || walk || limitedRom;
      const details = [
        { label: 'Acute post-traumatic hip/groin pain', value: traumaPain ? 'Yes' : 'No' },
        { label: 'Age ≥65 years', value: age65 ? 'Yes' : 'No' },
        { label: 'Unable to walk 4 steps (immediate + ED)', value: walk ? 'Yes' : 'No' },
        { label: 'Painful limited active hip ROM', value: limitedRom ? 'Yes' : 'No' },
      ];

      if (!traumaPain) {
        return {
          score: 0,
          label: 'Rules not applicable',
          interpretation: 'Ottawa hip pathway assumes acute post-traumatic hip/groin pain.',
          riskLevel: 'info' as const,
          details,
        };
      }
      if (pos) {
        return {
          score: 1,
          label: 'X-ray indicated',
          interpretation:
            '≥1 criterion present — obtain AP pelvis and lateral hip radiographs (consider full pelvis views).',
          riskLevel: 'moderate' as const,
          details,
        };
      }
      return {
        score: 0,
        label: 'Lower likelihood by rules',
        interpretation:
          'No high-yield criteria. Occult fracture still possible in high-risk patients (elderly, osteoporosis); clinical judgment applies.',
        riskLevel: 'low' as const,
        details,
      };
    },
    evidence: {
      summary:
        'Post-traumatic hip pain with age ≥65, inability to weight-bear 4 steps (immediately and ED), or painful limited ROM supports imaging.',
      formula: 'Image if trauma + hip pain AND (age≥65 OR no 4 steps OR limited painful ROM)',
      validation:
        'Derived from Ottawa methodology literature for selective hip radiography; sensitivity high but occult fracture remains a concern in elderly.',
      references: [
        {
          title: 'Derivation of a decision rule for the use of radiography in acute knee injuries',
          citation: 'Stiell IG, Greenberg GH, Wells GA, et al. Ann Emerg Med. 1995;26:405-413. Educational analog of Ottawa selective-radiography rules; no independently derived Ottawa Hip Rule',
          year: 1995,
          pmid: '7574120',
          doi: '10.1016/S0196-0644(95)70106-0',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive or high suspicion',
        actions: ['Hip/pelvis radiographs', 'If films negative but cannot walk: MRI or CT for occult fracture', 'Ortho consult'],
      },
      { condition: 'Negative and ambulatory', actions: ['Analgesia', 'Early mobilization', 'Close follow-up'] },
    ],
    pearls: ['Elderly patients who cannot walk after a fall warrant advanced imaging even if plain films are negative.'],
  },

  {
    id: 'kocher-criteria',
    name: 'Kocher Criteria (Pediatric Septic Hip)',
    shortName: 'Kocher',
    description: 'Predicts probability of septic arthritis in a child with irritable hip.',
    category: 'pediatrics',
    tags: ['septic arthritis', 'hip', 'pediatric', 'kocher', 'ortho'],
    whenToUse: 'Child with acute nontraumatic hip pain / limp / irritable hip evaluating septic arthritis vs transient synovitis.',
    whyUse: 'Stratifies urgency for urgent aspiration/OR vs observation.',
    inputs: [
      yesNo(
        'nwb',
        'Non–weight-bearing on affected side',
        1,
        'Child refuses or is unable to bear weight on the affected limb (not merely a limp).',
      ),
      yesNo('esr40', 'ESR ≥40 mm/hr', 1),
      yesNo('fever', 'Fever >38.5 °C', 1),
      yesNo('wbc12', 'WBC >12,000 cells/mm³', 1),
      yesNo('crp', 'CRP ≥2.0 mg/dL (Caird addition, optional)', 0),
    ],
    calculate(values) {
      const classic =
        (bool(values.nwb) ? 1 : 0) +
        (bool(values.esr40) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.wbc12) ? 1 : 0);
      const withCrp = classic + (bool(values.crp) ? 1 : 0);
      const probs: Record<number, string> = {
        0: '<0.2%',
        1: '~3%',
        2: '~40%',
        3: '~93%',
        4: '~99%',
      };
      const approx = probs[classic] ?? '~99%';
      const r = riskFromThresholds(classic, [
        {
          max: 0,
          level: 'low',
          label: '0 criteria — very low',
          interpretation: `Classic Kocher 0/4 (~${approx} septic). Transient synovitis more likely if well-appearing; still reassess.`,
        },
        {
          max: 1,
          level: 'low',
          label: '1 criterion — low',
          interpretation: `Classic Kocher 1/4 (~${approx}). Close follow-up; low threshold for labs/imaging if worsening.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: '2 criteria — intermediate',
          interpretation: `Classic Kocher 2/4 (~${approx}). Strongly consider ultrasound-guided aspiration and urgent ortho evaluation.`,
        },
        {
          max: 3,
          level: 'high',
          label: '3 criteria — high',
          interpretation: `Classic Kocher 3/4 (~${approx}). Treat as septic arthritis until proven otherwise — urgent aspiration/OR.`,
        },
        {
          max: 4,
          level: 'critical',
          label: '4 criteria — very high',
          interpretation: `Classic Kocher 4/4 (~${approx}). Emergent surgical drainage pathway with IV antibiotics after cultures.`,
        },
      ]);
      return {
        score: classic,
        ...r,
        details: [
          { label: 'Classic Kocher (0–4)', value: String(classic) },
          { label: 'With CRP (0–5)', value: String(withCrp) },
          { label: 'Approx. septic probability (classic)', value: approx },
        ],
      };
    },
    evidence: {
      summary:
        'Kocher: non-weight-bearing, ESR ≥40, fever >38.5 °C, WBC >12k. Probabilities rise sharply with each criterion. Caird added CRP ≥2.0 mg/dL.',
      formula: 'Sum of 4 (or 5 with CRP) binary predictors',
      validation:
        'Kocher et al. Children’s Hospital Boston; external validation shows variable probabilities — clinical judgment and aspiration remain key.',
      references: [
        {
          title: 'Differentiating between septic arthritis and transient synovitis of the hip in children',
          citation: 'Kocher MS et al. J Bone Joint Surg Am. 1999',
          year: 1999, pmid: '10608376',
          doi: '10.2106/00004623-199912000-00002', },
        {
          title: 'Factors distinguishing septic arthritis from transient synovitis (CRP)',
          citation: 'Caird MS et al. J Bone Joint Surg Am. 2006',
          year: 2006, pmid: '16757758',
          doi: '10.2106/JBJS.E.00216', },
      ],
    },
    nextSteps: [
      {
        condition: '≥2–3 criteria or toxic child',
        actions: [
          'Urgent ortho consult',
          'Hip ultrasound ± aspiration',
          'Blood culture, CRP/ESR/WBC',
          'IV antibiotics after synovial fluid obtained if stable',
        ],
      },
      { condition: '0–1 and well', actions: ['Close observation', 'Reassess ambulation and fever', 'Safety-net return precautions'] },
    ],
    pearls: [
      'Never delay intervention in a toxic child for “score alone.”',
      'Kocher is for the irritable hip differential — not a substitute for synovial fluid analysis.',
    ],
  },

  {
    id: 'thompson-test',
    name: 'Thompson Test (Achilles Rupture)',
    shortName: 'Thompson Test',
    description: 'Bedside clinical helper for suspected Achilles tendon rupture.',
    category: 'orthopedics',
    tags: ['achilles', 'thompson', 'tendon', 'sports'],
    whenToUse: 'Sudden calf/heel pain, “pop,” or weakness with push-off after sport or trauma.',
    whyUse: 'Positive Thompson is highly suggestive of complete Achilles rupture.',
    inputs: [
      yesNo('pop', 'Sudden pop or feeling of being kicked in the calf'),
      yesNo('gap', 'Palpable gap in Achilles tendon'),
      yesNo('weakPush', 'Weak or absent plantar flexion / push-off'),
      yesNo(
        'thompsonPos',
        'Thompson (calf squeeze): NO plantar flexion of foot',
        1,
        'Prone, feet free. Squeeze the mid-calf (gastrocnemius) firmly; positive = no plantar flexion of that foot. Always compare the other calf. Intact plantaris/partial tear may still flex.',
      ),
      yesNo(
        'matles',
        'Matles: increased resting dorsiflexion of injured foot (prone)',
        1,
        'Prone, both knees flexed to 90°. Positive = injured ankle hangs more dorsiflexed than the other.',
      ),
    ],
    calculate(values) {
      const findings =
        (bool(values.pop) ? 1 : 0) +
        (bool(values.gap) ? 1 : 0) +
        (bool(values.weakPush) ? 1 : 0) +
        (bool(values.thompsonPos) ? 1 : 0) +
        (bool(values.matles) ? 1 : 0);
      if (bool(values.thompsonPos)) {
        return {
          score: findings,
          label: 'Thompson positive — rupture likely',
          interpretation:
            'Absent plantar flexion with calf squeeze is strongly associated with complete Achilles rupture. Ortho referral for exam ± ultrasound/MRI as needed.',
          riskLevel: 'high',
          details: [{ label: 'Positive findings count', value: `${findings}/5` }],
        };
      }
      if (findings >= 2) {
        return {
          score: findings,
          label: 'Suspicious — further evaluation',
          interpretation:
            'Thompson negative but other supportive findings present. Partial tear or false-negative possible; consider ultrasound and specialist exam.',
          riskLevel: 'moderate',
          details: [{ label: 'Positive findings count', value: `${findings}/5` }],
        };
      }
      if (findings === 1) {
        return {
          score: findings,
          label: 'Low–intermediate suspicion',
          interpretation: 'Limited supportive findings. Re-examine, compare sides, and image if clinical concern persists.',
          riskLevel: 'low',
          details: [{ label: 'Positive findings count', value: `${findings}/5` }],
        };
      }
      return {
        score: 0,
        label: 'Findings not suggestive',
        interpretation:
          'No classic rupture findings entered. Consider alternative diagnoses (calf strain, plantaris, DVT, etc.) based on exam.',
        riskLevel: 'low',
        details: [{ label: 'Positive findings count', value: '0/5' }],
      };
    },
    evidence: {
      summary:
        'Thompson (Simmonds) test: prone patient, squeeze calf; absent foot plantar flexion suggests Achilles rupture. Matles sign compares resting ankle posture.',
      formula: 'Clinical constellation; Thompson + gap + history most predictive',
      validation: 'Thompson test sensitivity often cited ~0.96 and specificity ~0.93 for complete rupture in specialty series.',
      references: [
        {
          title: 'A test for rupture of the tendo Achillis',
          citation: 'Thompson TC, Doherty JH. Acta Orthop Scand. 1962',
          year: 1962, pmid: '13981206',
          doi: '10.3109/17453676208989608', },
      ],
    },
    nextSteps: [
      {
        condition: 'Suspected rupture',
        actions: [
          'Non-weight-bearing / functional brace in plantar flexion per protocol',
          'Urgent ortho / sports medicine referral',
          'Discuss operative vs nonoperative pathways',
        ],
      },
    ],
    pearls: ['Partial ruptures may have a false-negative Thompson test.', 'Compare with the contralateral calf squeeze.'],
  },

  {
    id: 'salter-harris',
    name: 'Salter-Harris Classification',
    shortName: 'Salter-Harris',
    description: 'Physeal (growth plate) fracture classification types I–V.',
    category: 'orthopedics',
    tags: ['pediatric', 'fracture', 'physis', 'salter-harris'],
    whenToUse: 'Pediatric fractures involving or near the growth plate.',
    whyUse: 'Guides prognosis for growth disturbance and treatment urgency.',
    inputs: [
      selectInput(
        'type',
        'Salter-Harris type',
        [
          {
            label: 'I — Through physis only',
            value: 1,
            description: 'Transverse through the physis; x-ray often normal except possible widening — clinical diagnosis if tender over the physis',
          },
          {
            label: 'II — Physis + metaphysis (Thurston-Holland fragment)',
            value: 2,
            description: 'Through physis then out metaphysis, leaving a Thurston-Holland metaphyseal triangle (most common)',
          },
          {
            label: 'III — Physis + epiphysis (intra-articular)',
            value: 3,
            description: 'Through physis then out epiphysis (intra-articular); anatomic reduction often required',
          },
          {
            label: 'IV — Metaphysis + physis + epiphysis',
            value: 4,
            description: 'Vertical fracture across metaphysis, physis, and epiphysis; unstable growth prognosis',
          },
          {
            label: 'V — Crush injury to physis',
            value: 5,
            description: 'Compression/crush of the physis; often occult initially and diagnosed when growth arrest appears',
          },
        ],
        undefined,
        'Classify the fracture path relative to the growth plate on x-ray (and exam for type I/V). Higher types (III–V) carry more growth-disturbance risk.',
      ),
    ],
    calculate(values) {
      const t = num(values.type, 2);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'Salter-Harris I',
          interpretation:
            'Fracture through physis. X-rays may be normal — treat for tenderness over physis. Generally good prognosis if reduced/stable.',
          riskLevel: 'moderate',
        },
        2: {
          label: 'Salter-Harris II',
          interpretation:
            'Most common. Physis + metaphyseal fragment (Thurston-Holland). Usually good prognosis after appropriate reduction/immobilization.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Salter-Harris III',
          interpretation:
            'Physis + epiphysis (intra-articular). Anatomic reduction often required; higher risk of growth disturbance and joint incongruity.',
          riskLevel: 'high',
        },
        4: {
          label: 'Salter-Harris IV',
          interpretation:
            'Vertical fracture across metaphysis, physis, and epiphysis. Unstable growth prognosis; usually needs anatomic reduction ± fixation.',
          riskLevel: 'high',
        },
        5: {
          label: 'Salter-Harris V',
          interpretation:
            'Crush injury to physis. Often diagnosed retrospectively when growth arrest appears. Highest risk of physeal bar / limb deformity.',
          riskLevel: 'critical',
        },
      };
      const m = map[t] ?? map[2];
      return {
        score: t,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'Mnemonic (SALTR)', value: 'S-I, A-II, L-III, T-IV, R-V (cRush)' }],
      };
    },
    evidence: {
      summary: 'Salter-Harris I–V describes physeal injury pattern and correlates with growth disturbance risk (higher in III–V).',
      formula: 'Type I physis; II + metaphysis; III + epiphysis; IV all three; V crush',
      validation: 'Standard pediatric orthopedics classification (Salter & Harris, 1963).',
      references: [
        {
          title: 'Injuries involving the epiphyseal plate',
          citation: 'Salter RB, Harris WR. J Bone Joint Surg Am. 1963;45:587-622',
          year: 1963,
          doi: '10.2106/00004623-196345030-00019',
        },
      ],
    },
    nextSteps: [
      { condition: 'Type I–II stable', actions: ['Closed reduction if displaced', 'Cast/splint', 'Ortho follow-up for growth monitoring'] },
      { condition: 'Type III–IV', actions: ['Urgent ortho', 'Anatomic reduction', 'Often operative fixation', 'Long-term growth surveillance'] },
      { condition: 'Type V / growth arrest concern', actions: ['Serial radiographs', 'Consider MRI', 'Pediatric ortho referral'] },
    ],
  },

  {
    id: 'gustilo-anderson',
    name: 'Gustilo-Anderson Open Fracture Classification',
    shortName: 'Gustilo',
    description: 'Classifies open fractures by wound size and soft-tissue injury severity.',
    category: 'orthopedics',
    tags: ['open fracture', 'gustilo', 'trauma', 'infection'],
    whenToUse: 'Any open fracture for communication, antibiotics, and surgical planning.',
    whyUse: 'Correlates with infection risk, soft-tissue coverage needs, and outcomes.',
    inputs: [
      selectInput(
        'type',
        'Gustilo-Anderson type',
        [
          {
            label: 'I — Clean wound <1 cm',
            value: 1,
            description: 'Low-energy, clean puncture <1 cm; no periosteal stripping or crush',
          },
          {
            label: 'II — >1 cm, moderate soft-tissue damage, no flap needed',
            value: 2,
            description: 'Wound >1 cm without extensive crush, contamination, or flap need',
          },
          {
            label: 'IIIA — Extensive soft tissue, adequate coverage still possible',
            value: 3,
            description: 'High-energy/extensive; bone still coverable with local soft tissue after debridement',
          },
          {
            label: 'IIIB — Extensive periosteal stripping; soft-tissue coverage procedure needed',
            value: 4,
            description: 'Extensive periosteal stripping/contamination; needs rotational or free flap coverage',
          },
          {
            label: 'IIIC — Arterial injury requiring repair for limb salvage',
            value: 5,
            description: 'Named arterial injury requiring repair for salvage (not merely a pulse deficit)',
          },
        ],
        undefined,
        'Assign after debridement when possible. Any high-energy mechanism, farm/soil contamination, shotgun, segmental fracture, or inadequate coverage starts at type III even if the skin wound is small.',
      ),
    ],
    calculate(values) {
      const t = num(values.type, 1);
      const map: Record<
        number,
        { score: string; label: string; interpretation: string; riskLevel: 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          score: 'I',
          label: 'Type I',
          interpretation:
            'Low-energy, clean wound <1 cm. Still requires antibiotics, tetanus, urgent debridement per protocol; infection risk relatively lower.',
          riskLevel: 'moderate',
        },
        2: {
          score: 'II',
          label: 'Type II',
          interpretation:
            'Wound >1 cm without extensive soft-tissue crush/flap need. IV antibiotics, formal irrigation & debridement, fracture stabilization.',
          riskLevel: 'moderate',
        },
        3: {
          score: 'IIIA',
          label: 'Type IIIA',
          interpretation:
            'High-energy with extensive soft-tissue injury but adequate soft-tissue coverage of bone after debridement. Higher infection risk.',
          riskLevel: 'high',
        },
        4: {
          score: 'IIIB',
          label: 'Type IIIB',
          interpretation:
            'Extensive soft-tissue loss / periosteal stripping requiring rotational or free flap coverage. High infection and nonunion risk.',
          riskLevel: 'critical',
        },
        5: {
          score: 'IIIC',
          label: 'Type IIIC',
          interpretation:
            'Arterial injury requiring repair. Limb-threatening — vascular and ortho co-management; amputation decision if not salvageable.',
          riskLevel: 'critical',
        },
      };
      const m = map[t] ?? map[1];
      return {
        score: m.score,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
      };
    },
    evidence: {
      summary:
        'Gustilo-Anderson types I, II, IIIA/B/C grade open fractures by contamination, soft-tissue damage, and vascular injury.',
      formula: 'I <1 cm clean; II >1 cm moderate; III extensive (A coverable, B needs flap, C arterial repair)',
      validation: 'Widely used despite interobserver variability; still standard communication tool in trauma orthopedics.',
      references: [
        {
          title: 'Prevention of infection in the treatment of 1025 open fractures of long bones',
          citation: 'Gustilo RB, Anderson JT. J Bone Joint Surg Am. 1976',
          year: 1976, pmid: '773941' },
      ],
    },
    nextSteps: [
      {
        condition: 'All open fractures',
        actions: [
          'ABCs / hemorrhage control',
          'Early IV antibiotics (type- and contamination-guided)',
          'Tetanus status',
          'Sterile dressing, reduce/align, splint',
          'Urgent surgical I&D and stabilization',
        ],
      },
      { condition: 'IIIB/C', actions: ['Plastic/vascular surgery involvement early', 'Limb salvage vs amputation discussion'] },
    ],
    pearls: ['Final Gustilo grade is often assigned in the OR after debridement, not solely from ED wound size.'],
  },

  {
    id: 'mirels-score',
    name: 'Mirels Score (Pathologic Fracture Risk)',
    shortName: 'Mirels',
    description: 'Estimates impending pathologic fracture risk in long-bone metastases.',
    category: 'orthopedics',
    tags: ['pathologic fracture', 'metastasis', 'mirels', 'oncology'],
    whenToUse: 'Prophylactic fixation decisions for metastatic lesions in long bones.',
    whyUse: 'Standardized site/pain/lesion/size scoring for fracture risk counseling.',
    inputs: [
      selectInput('site', 'Site', [
        { label: 'Upper limb (1)', value: 1, description: 'Humerus, radius, or ulna' },
        { label: 'Lower limb (2)', value: 2, description: 'Femur (not pertrochanteric) or tibia' },
        { label: 'Peritrochanteric (3)', value: 3, description: 'Inter-/sub-/pertrochanteric femur — highest site risk' },
      ]),
      selectInput('pain', 'Pain', [
        { label: 'Mild (1)', value: 1, description: 'Mild pain, not activity-limiting' },
        { label: 'Moderate (2)', value: 2, description: 'More constant pain, not clearly mechanical' },
        {
          label: 'Functional / mechanical (3)',
          value: 3,
          description: 'Pain aggravated by loading/use of the limb (mechanical insufficiency)',
        },
      ]),
      selectInput('lesion', 'Lesion type', [
        { label: 'Blastic (1)', value: 1, description: 'Purely sclerotic / osteoblastic on x-ray' },
        { label: 'Mixed (2)', value: 2, description: 'Mixed lytic and blastic' },
        { label: 'Lytic (3)', value: 3, description: 'Purely osteolytic' },
      ]),
      selectInput(
        'size',
        'Size (cortical involvement)',
        [
          { label: '<1/3 (1)', value: 1, description: '<1/3 of bone diameter' },
          { label: '1/3–2/3 (2)', value: 2, description: '1/3 to 2/3 of bone diameter' },
          { label: '>2/3 (3)', value: 3, description: '>2/3 of cortical involvement of bone diameter' },
        ],
        undefined,
        'Greatest cortical involvement as a fraction of bone diameter on AP/lateral x-ray (not craniocaudal lesion length).',
      ),
    ],
    calculate(values) {
      const score = num(values.site, 1) + num(values.pain, 1) + num(values.lesion, 1) + num(values.size, 1);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: '≤7 — low fracture risk',
          interpretation:
            'Score ≤7: historically ~5% fracture risk. Nonoperative management often appropriate (radiotherapy, protected weight-bearing) unless other factors.',
        },
        {
          max: 8,
          level: 'moderate',
          label: '8 — intermediate',
          interpretation:
            'Score 8: intermediate (~15%) risk. Consider prophylactic fixation based on life expectancy, activity, and lesion biology.',
        },
        {
          max: 12,
          level: 'high',
          label: '≥9 — high fracture risk',
          interpretation:
            'Score ≥9: high risk (~33%+). Prophylactic stabilization generally recommended if prognosis and medical status allow.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Range', value: '4–12' },
          {
            label: 'Components',
            value: `Site ${num(values.site)} / Pain ${num(values.pain)} / Lesion ${num(values.lesion)} / Size ${num(values.size)}`,
          },
        ],
      };
    },
    evidence: {
      summary: 'Mirels: site + pain + lesion type + size (each 1–3). ≤7 low, 8 intermediate, ≥9 high impending fracture risk.',
      formula: 'Score = site + pain + lesion + size (4–12)',
      validation: 'Mirels 1989; widely used educational/clinical aid with acknowledged limitations (e.g., upper extremity).',
      references: [
        {
          title: 'Metastatic disease in long bones: a proposed scoring system for diagnosing impending pathologic fractures',
          citation: 'Mirels H. Clin Orthop Relat Res. 1989',
          year: 1989, pmid: '2684463' },
      ],
    },
    nextSteps: [
      { condition: '≥9 or functional pain', actions: ['Ortho-oncology consult', 'Discuss prophylactic fixation', 'Staging / primary workup as indicated'] },
      { condition: '≤7', actions: ['Protected weight-bearing', 'Radiotherapy / systemic therapy per oncology', 'Reassess if pain worsens'] },
    ],
  },

  {
    id: 'garden-classification',
    name: 'Garden Classification (Femoral Neck)',
    shortName: 'Garden',
    description: 'Classifies femoral neck fractures by displacement on AP radiograph (I–IV).',
    category: 'orthopedics',
    tags: ['femoral neck', 'hip fracture', 'garden', 'geriatric'],
    whenToUse: 'Adult femoral neck fracture characterization and surgical planning.',
    whyUse: 'Communicates displacement; guides ORIF vs arthroplasty decisions with age/comorbidity.',
    inputs: [
      selectInput(
        'garden',
        'Garden type',
        [
          {
            label: 'I — Incomplete / valgus impacted',
            value: 1,
            description:
              'Incomplete neck fracture, typically valgus-impacted; inferior cortex often intact; trabeculae of head in valgus relative to neck',
          },
          {
            label: 'II — Complete, nondisplaced',
            value: 2,
            description: 'Complete fracture line through the neck but no displacement; medial trabeculae of head and neck aligned',
          },
          {
            label: 'III — Complete, partially displaced',
            value: 3,
            description:
              'Complete fracture with partial displacement; trabeculae of head no longer aligned with the neck/acetabulum',
          },
          {
            label: 'IV — Complete, fully displaced',
            value: 4,
            description:
              'Complete, fully displaced; fragments lose contact; trabeculae of the head often parallel to the acetabulum (rotated independently)',
          },
        ],
        undefined,
        'Based on AP radiograph displacement and trabecular alignment, not fragment count. I–II = nondisplaced (including valgus impacted); III–IV = displaced.',
      ),
    ],
    calculate(values) {
      const g = num(values.garden, 1);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'Garden I',
          interpretation:
            'Incomplete/valgus-impacted. Often stable pattern; internal fixation common in appropriate candidates. Still risk of AVN/nonunion.',
          riskLevel: 'moderate',
        },
        2: {
          label: 'Garden II',
          interpretation:
            'Complete but nondisplaced. Typically treated with internal fixation; monitor for displacement and osteonecrosis.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Garden III',
          interpretation:
            'Partial displacement with disruption of trabecular alignment. Higher AVN/nonunion risk; fixation vs arthroplasty by age/function.',
          riskLevel: 'high',
        },
        4: {
          label: 'Garden IV',
          interpretation:
            'Full displacement; fragments discontinuous. Highest osteonecrosis risk. Arthroplasty often preferred in elderly; fixation in selected young patients with urgent reduction.',
          riskLevel: 'critical',
        },
      };
      const m = map[g] ?? map[1];
      return {
        score: g,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'Practical grouping', value: g <= 2 ? 'Nondisplaced (I–II)' : 'Displaced (III–IV)' }],
      };
    },
    evidence: {
      summary: 'Garden I–IV based on displacement of femoral neck fracture on AP pelvis/hip radiographs.',
      formula: 'I incomplete/valgus; II complete nondisplaced; III partial displace; IV complete displace',
      validation: 'Classic hip fracture taxonomy; interobserver agreement better for nondisplaced vs displaced grouping.',
      references: [
        {
          title: 'Low-angle fixation in fractures of the femoral neck',
          citation: 'Garden RS. J Bone Joint Surg Br. 1961;43-B:647-663',
          year: 1961,
          doi: '10.1302/0301-620X.43B4.647',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any femoral neck fracture',
        actions: [
          'Medical optimization',
          'Early ortho surgical planning',
          'VTE prophylaxis pathway',
          'Multimodal analgesia',
          'Time-to-OR goals per institutional hip-fracture protocol',
        ],
      },
      { condition: 'Young displaced', actions: ['Urgent reduction and fixation to protect blood supply'] },
    ],
  },

  {
    id: 'neer-classification',
    name: 'Neer Classification (Proximal Humerus)',
    shortName: 'Neer',
    description: 'Simplified Neer parts classification for proximal humerus fractures.',
    category: 'orthopedics',
    tags: ['proximal humerus', 'neer', 'shoulder', 'fracture'],
    whenToUse: 'Proximal humerus fracture description using displaced “parts.”',
    whyUse: 'Standard language for displacement pattern and treatment discussion.',
    inputs: [
      selectInput(
        'parts',
        'Number of displaced parts',
        [
          {
            label: '1-part — no segment displaced (≥1 cm or 45°)',
            value: 1,
            description: 'None of the four parts meets ≥1 cm displacement or ≥45° angulation',
          },
          {
            label: '2-part — one segment displaced',
            value: 2,
            description: 'One of head / GT / LT / shaft is displaced ≥1 cm or ≥45°',
          },
          {
            label: '3-part — two segments displaced',
            value: 3,
            description: 'Two displaced segments (typically surgical neck + one tuberosity)',
          },
          {
            label: '4-part — three segments displaced (head + both tuberosities + shaft pattern)',
            value: 4,
            description: 'Three displaced segments (typically head + both tuberosities relative to shaft)',
          },
        ],
        undefined,
        'Four potential parts: articular head, greater tuberosity, lesser tuberosity, shaft. Count a part only if displaced ≥1 cm or angulated ≥45°. 1-part = none of the four meet that; 2-part = one displaced segment; 3-part = two; 4-part = three. Head-split and dislocation are separate modifiers already on the form.',
      ),
      yesNo('headSplit', 'Head-splitting or articular surface involvement', 0),
      yesNo('dislocation', 'Associated glenohumeral dislocation', 0),
    ],
    calculate(values) {
      const parts = num(values.parts, 1);
      const modifiers = (bool(values.headSplit) ? 1 : 0) + (bool(values.dislocation) ? 1 : 0);
      const r = riskFromThresholds(parts, [
        {
          max: 1,
          level: 'low',
          label: '1-part (minimally displaced)',
          interpretation:
            'No part meets displacement criteria (≥1 cm or ≥45°). Usually nonoperative: sling, early pendulum/PT as pain allows.',
        },
        {
          max: 2,
          level: 'moderate',
          label: '2-part',
          interpretation:
            'One displaced part (surgical neck, greater or lesser tuberosity, etc.). Treatment individualized — nonop vs ORIF vs arthroplasty.',
        },
        {
          max: 3,
          level: 'high',
          label: '3-part',
          interpretation:
            'Two parts displaced. Higher risk of dysfunction; often surgical in active patients (ORIF/reverse arthroplasty depending on age/bone).',
        },
        {
          max: 4,
          level: 'high',
          label: '4-part',
          interpretation:
            'Three or more displaced parts. High AVN risk for head; arthroplasty frequently considered in elderly; reconstruct in selected younger patients.',
        },
      ]);
      let interpretation = r.interpretation;
      if (bool(values.headSplit)) interpretation += ' Head-split pattern noted — specialty fixation/arthroplasty planning.';
      if (bool(values.dislocation)) interpretation += ' Fracture-dislocation — urgent reduction and neurovascular exam (axillary nerve).';
      return {
        score: parts,
        label: r.label,
        interpretation,
        riskLevel: modifiers > 0 && parts >= 2 ? 'high' : r.riskLevel,
        details: [
          { label: 'Displaced parts', value: String(parts) },
          { label: 'Parts concept', value: 'Head, greater tuberosity, lesser tuberosity, shaft' },
        ],
      };
    },
    evidence: {
      summary:
        'Neer: a “part” is displaced if ≥1 cm or angulated ≥45°. Classification by number of displaced parts (1–4), not merely fracture lines.',
      formula: 'Count displaced segments among head / GT / LT / shaft',
      validation: 'Neer 1970 system remains common despite moderate interobserver reliability.',
      references: [
        {
          title: 'Displaced proximal humeral fractures. I. Classification and evaluation',
          citation: 'Neer CS 2nd. J Bone Joint Surg Am. 1970;52:1077-1089',
          year: 1970, pmid: '5455339' },
      ],
    },
    nextSteps: [
      { condition: '1-part', actions: ['Sling', 'Early rehab', 'Ortho follow-up radiographs'] },
      { condition: 'Multi-part / head-split / dislocation', actions: ['Ortho consult', 'CT for surgical planning', 'Document axillary nerve function'] },
    ],
  },

  {
    id: 'weber-ankle',
    name: 'Weber Ankle Fracture Classification',
    shortName: 'Weber',
    description: 'Danis-Weber classification of lateral malleolus fractures relative to the syndesmosis (A/B/C).',
    category: 'orthopedics',
    tags: ['ankle', 'weber', 'fracture', 'syndesmosis'],
    whenToUse: 'Lateral malleolar / fibular fractures about the ankle.',
    whyUse: 'Quick communication of syndesmotic level and stability concerns.',
    inputs: [
      selectInput(
        'weber',
        'Weber type',
        [
          {
            label: 'A — Infrasyndesmotic (below syndesmosis)',
            value: 'A',
            description: 'Fibular fracture distal to the tibial plafond / syndesmosis; syndesmosis typically intact',
          },
          {
            label: 'B — Transsyndesmotic (at syndesmosis level)',
            value: 'B',
            description:
              'Fibular fracture at the level of the syndesmosis (often spiral starting at the plafond); stability depends on the medial side / mortise',
          },
          {
            label: 'C — Suprasyndesmotic (above syndesmosis)',
            value: 'C',
            description:
              'Fibular fracture proximal to the syndesmosis (includes high fibula / Maisonneuve); syndesmotic injury likely',
          },
        ],
        undefined,
        'Classify by the level of the fibular fracture relative to the tibial plafond/syndesmosis on mortise and lateral views. Stability is not the letter alone — check deltoid and mortise.',
      ),
      yesNo(
        'medial',
        'Medial malleolus fracture or deltoid incompetence (bimalleolar equivalent)',
        0,
        'Medial malleolus fracture, medial tenderness with medial clear-space widening, or clinical deltoid incompetence.',
      ),
      yesNo(
        'unstable',
        'Talar shift / mortise widening / positive stress test',
        0,
        'Talar shift, medial clear space >4–5 mm, or positive gravity / external-rotation stress test.',
      ),
    ],
    calculate(values) {
      const w = String(values.weber ?? 'B');
      const unstable = bool(values.medial) || bool(values.unstable);
      const base: Record<string, { score: number; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' }> = {
        A: {
          score: 1,
          label: 'Weber A',
          interpretation:
            'Fibular fracture below syndesmosis. Usually stable if isolated; often nonoperative if mortise intact and no medial injury.',
          riskLevel: 'low',
        },
        B: {
          score: 2,
          label: 'Weber B',
          interpretation:
            'Fracture at syndesmosis. Stability variable — assess medial clear space / gravity or external-rotation stress views.',
          riskLevel: 'moderate',
        },
        C: {
          score: 3,
          label: 'Weber C',
          interpretation:
            'Fracture above syndesmosis. Syndesmotic injury likely; usually unstable and often operative (Maisonneuve pattern if high fibula).',
          riskLevel: 'high',
        },
      };
      const b = base[w] ?? base.B;
      let interpretation = b.interpretation;
      let riskLevel = b.riskLevel;
      if (unstable) {
        interpretation +=
          ' Medial injury or mortise instability present — treat as unstable ankle fracture; surgical fixation commonly indicated.';
        riskLevel = 'high';
      }
      return {
        score: b.score,
        label: unstable ? `${b.label} (unstable features)` : b.label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Weber', value: w },
          { label: 'Stability flags', value: unstable ? 'Unstable features present' : 'No medial/mortise flags entered' },
        ],
      };
    },
    evidence: {
      summary: 'Danis-Weber: A below, B at, C above the syndesmosis. Stability depends on mortise integrity and medial structures, not letter alone.',
      formula: 'Classify fibular fracture height vs syndesmosis; assess deltoid/mortise',
      validation: 'Standard trauma classification; often combined with Lauge-Hansen mechanism language.',
      references: [
        {
          title: 'Die Verletzungen des oberen Sprunggelenkes',
          citation: 'Weber BG. 2nd ed. Bern: Verlag Hans Huber; 1972 (Danis-Weber classification)',
          year: 1972,
        },
      ],
    },
    nextSteps: [
      { condition: 'Stable Weber A/B', actions: ['Splint/cast', 'NWB or WBAT per protocol', 'Ortho follow-up'] },
      {
        condition: 'Weber C or unstable B',
        actions: ['Posterior splint, NWB', 'Ortho consult for ORIF ± syndesmotic fixation', 'Examine full fibula / Maisonneuve'],
      },
    ],
  },

  {
    id: 'pecarn-cervical',
    name: 'PECARN Pediatric C-Spine Risk Helper',
    shortName: 'PECARN C-Spine',
    description: 'Simplified educational helper using PECARN pediatric cervical spine injury risk factors.',
    category: 'pediatrics',
    tags: ['c-spine', 'pediatric', 'pecarn', 'trauma', 'imaging'],
    whenToUse: 'Children after blunt trauma when considering cervical spine imaging.',
    whyUse: 'Highlights factors associated with CSI to support imaging decisions (not a standalone clearance rule).',
    inputs: [
      yesNo(
        'ams',
        'Altered mental status',
        1,
        'GCS <15, AVPU not A, intoxication, or other altered awareness — not merely a bit sleepy.',
      ),
      yesNo(
        'focal',
        'Focal neurologic findings',
        1,
        'Paresthesia, numbness, weakness, or other focal deficit (includes isolated paresthesia).',
      ),
      yesNo(
        'neckPain',
        'Neck pain or midline tenderness / torticollis',
        1,
        'Patient-reported neck pain OR midline cervical tenderness OR torticollis.',
      ),
      yesNo(
        'torso',
        'Substantial torso injury',
        1,
        'Thoracic, abdominal, or pelvic injury warranting admission or intervention.',
      ),
      yesNo(
        'predispose',
        'Predisposing condition (e.g., Down syndrome, cervical anomaly)',
        1,
        'e.g. Down syndrome, cervical stenosis, os odontoideum, EDS, RA, prior cervical surgery.',
      ),
      yesNo(
        'highRiskMvc',
        'High-risk MVC (e.g., rollover, ejection, death in vehicle)',
        1,
        'Rollover, ejection, death of another occupant, or similar high-risk crash features.',
      ),
      yesNo(
        'diving',
        'Diving or axial load mechanism',
        1,
        'Diving injury or other axial load to the head (e.g. struck on the vertex).',
      ),
      yesNo(
        'otherHigh',
        'Other high-risk mechanism (hanging, clothesline, etc.)',
        1,
        'Hanging, clothesline, or similar high-risk mechanism not already listed.',
      ),
    ],
    calculate(values) {
      const keys = ['ams', 'focal', 'neckPain', 'torso', 'predispose', 'highRiskMvc', 'diving', 'otherHigh'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const redFlag = bool(values.ams) || bool(values.focal);
      if (redFlag) {
        return {
          score,
          label: 'High concern — image / immobilize',
          interpretation:
            'Altered mentation or focal neuro findings: cannot clear clinically. Maintain C-spine precautions and obtain age-appropriate imaging (often CT/MRI pathway per local protocol).',
          riskLevel: 'high',
          details: [{ label: 'Risk factors present', value: `${score}/8` }],
        };
      }
      if (score >= 1) {
        return {
          score,
          label: 'Risk factor(s) present',
          interpretation:
            '≥1 PECARN-associated factor. Imaging decisions individualized — consider plain films or CT based on age, exam, and institutional pathway; maintain immobilization until cleared.',
          riskLevel: 'moderate',
          details: [{ label: 'Risk factors present', value: `${score}/8` }],
        };
      }
      return {
        score: 0,
        label: 'No listed high-risk factors',
        interpretation:
          'No entered PECARN high-risk factors. In a cooperative child with normal exam, clinical clearance may be considered per protocol — this helper is educational, not a validated “zero imaging” rule alone.',
        riskLevel: 'low',
        details: [{ label: 'Risk factors present', value: '0/8' }],
      };
    },
    evidence: {
      summary:
        'PECARN identified factors associated with pediatric CSI (AMS, focal deficits, neck pain/torticollis, substantial torso injury, predisposing conditions, high-risk mechanisms).',
      formula: 'Count presence of key risk factors; red flags = AMS or focal deficit',
      validation:
        'Derived from large PECARN cohort of children with blunt trauma. Use with full clinical assessment and local imaging guidelines.',
      references: [
        {
          title: 'Factors associated with cervical spine injury in children after blunt trauma',
          citation: 'Leonard JC, Kuppermann N, Olsen C, et al. (PECARN). Ann Emerg Med. 2011;58:145-155',
          year: 2011, pmid: '21035905',
          doi: '10.1016/j.annemergmed.2010.08.038', },
      ],
    },
    nextSteps: [
      { condition: 'AMS / focal deficit / multiple factors', actions: ['Maintain collar', 'Trauma evaluation', 'Age-appropriate C-spine imaging'] },
      { condition: 'No factors, normal exam', actions: ['Consider clinical clearance if age-appropriate and cooperative', 'Document exam'] },
    ],
    pearls: ['Pediatric CSI is uncommon but high-stakes; when in doubt, immobilize and image or observe with specialty input.'],
  },

  {
    id: 'iss-score',
    name: 'Injury Severity Score (ISS)',
    shortName: 'ISS',
    description: 'Anatomic trauma severity: sum of squares of the three highest AIS region scores.',
    category: 'emergency',
    tags: ['trauma', 'iss', 'ais', 'severity'],
    whenToUse: 'Trauma registries, research, and severity stratification after AIS coding.',
    whyUse: 'Standard anatomic injury burden metric (major trauma often ISS >15).',
    inputs: [
      numberInput('head', 'Head & neck AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1=minor, 2=moderate, 3=serious, 4=severe, 5=critical, 6=maximal/currently untreatable. Highest AIS in this ISS region (0 if none). AIS 6 assigns ISS 75.',
      }),
      numberInput('face', 'Face AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1–6 as above; highest in the face region (0 if none).',
      }),
      numberInput('chest', 'Chest AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1–6 as above; highest in the chest region (0 if none).',
      }),
      numberInput('abdomen', 'Abdomen AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1–6 as above; highest in the abdomen region (0 if none).',
      }),
      numberInput('extremity', 'Extremities / pelvic girdle AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1–6 as above; highest in extremities/pelvic girdle (0 if none).',
      }),
      numberInput('external', 'External AIS (highest)', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1–6 as above; highest external/skin (0 if none).',
      }),
    ],
    calculate(values) {
      const regions = [
        num(values.head, 0),
        num(values.face, 0),
        num(values.chest, 0),
        num(values.abdomen, 0),
        num(values.extremity, 0),
        num(values.external, 0),
      ].map((v) => Math.min(6, Math.max(0, Math.round(v))));

      if (regions.some((a) => a === 6)) {
        return {
          score: 75,
          label: 'ISS 75 (AIS 6 — currently untreatable / maximal)',
          interpretation:
            'Any AIS 6 assigns ISS = 75 by definition (maximal injury). Aligns with unsurvivable or currently untreatable injury coding.',
          riskLevel: 'critical',
          details: [{ label: 'Region AIS', value: regions.join(', ') }],
        };
      }

      const top3 = [...regions].sort((a, b) => b - a).slice(0, 3);
      const iss = top3[0] ** 2 + top3[1] ** 2 + top3[2] ** 2;
      const r = riskFromThresholds(iss, [
        {
          max: 8,
          level: 'low',
          label: 'ISS ≤8 — minor/moderate',
          interpretation: 'Lower anatomic injury burden. Still treat individual injuries appropriately.',
        },
        {
          max: 15,
          level: 'moderate',
          label: 'ISS 9–15',
          interpretation: 'Moderate injury severity. Monitor for missed injuries and complications.',
        },
        {
          max: 24,
          level: 'high',
          label: 'ISS 16–24 — major trauma range',
          interpretation: 'ISS >15 commonly defines major trauma. Trauma center resources often indicated.',
        },
        {
          max: 75,
          level: 'critical',
          label: 'ISS ≥25 — severe',
          interpretation: 'Severe polytrauma burden with substantially increased mortality risk.',
        },
      ]);
      return {
        score: iss,
        ...r,
        details: [
          { label: 'Top 3 AIS (squared)', value: `${top3[0]}² + ${top3[1]}² + ${top3[2]}²` },
          { label: 'All region AIS', value: regions.join(', ') },
          { label: 'Range', value: '0–75' },
        ],
      };
    },
    evidence: {
      summary: 'ISS = sum of squares of the highest AIS scores in the three most severely injured ISS body regions (max 75). AIS 6 → ISS 75.',
      formula: 'ISS = A² + B² + C² (top 3 region maxima)',
      validation: 'Baker et al.; cornerstone of trauma severity scoring and TRISS input.',
      references: [
        {
          title: 'The Injury Severity Score: a method for describing patients with multiple injuries and evaluating emergency care',
          citation: 'Baker SP et al. J Trauma. 1974',
          year: 1974, pmid: '4814394' },
      ],
    },
    nextSteps: [
      { condition: 'ISS >15', actions: ['Trauma center care', 'Systematic secondary/tertiary survey', 'ICU-level monitoring as indicated'] },
      { condition: 'Any AIS ≥3', actions: ['Specialty consultation for that region', 'Reassess for occult injuries'] },
    ],
  },

  {
    id: 'niss-score',
    name: 'New Injury Severity Score (NISS)',
    shortName: 'NISS',
    description: 'Sum of squares of the three highest AIS injuries regardless of body region.',
    category: 'emergency',
    tags: ['trauma', 'niss', 'ais', 'severity'],
    whenToUse: 'When multiple severe injuries share one body region (ISS may undercall severity).',
    whyUse: 'Often outperforms ISS for mortality prediction when several injuries cluster in one region.',
    inputs: [
      numberInput('ais1', 'Highest AIS injury', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'AIS 1=minor, 2=moderate, 3=serious, 4=severe, 5=critical, 6=maximal/currently untreatable. NISS uses the three highest AIS injuries regardless of body region. AIS 6 assigns NISS 75.',
      }),
      numberInput('ais2', 'Second highest AIS injury', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'Second-highest AIS (any region). 0 if fewer than two injuries.',
      }),
      numberInput('ais3', 'Third highest AIS injury', {
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 0,
        helpText: 'Third-highest AIS (any region). 0 if fewer than three injuries.',
      }),
    ],
    calculate(values) {
      const a = [num(values.ais1, 0), num(values.ais2, 0), num(values.ais3, 0)].map((v) =>
        Math.min(6, Math.max(0, Math.round(v)))
      );
      if (a.some((x) => x === 6)) {
        return {
          score: 75,
          label: 'NISS 75 (AIS 6 present)',
          interpretation: 'AIS 6 injury present — maximal score 75 by analogy to ISS coding conventions.',
          riskLevel: 'critical',
        };
      }
      const sorted = [...a].sort((x, y) => y - x);
      const niss = sorted[0] ** 2 + sorted[1] ** 2 + sorted[2] ** 2;
      const r = riskFromThresholds(niss, [
        {
          max: 8,
          level: 'low',
          label: 'NISS ≤8',
          interpretation: 'Lower multi-injury burden by NISS.',
        },
        {
          max: 15,
          level: 'moderate',
          label: 'NISS 9–15',
          interpretation: 'Moderate severity. Compare with ISS when injuries share a region.',
        },
        {
          max: 24,
          level: 'high',
          label: 'NISS 16–24',
          interpretation: 'Major injury burden range. Trauma system resources often appropriate.',
        },
        {
          max: 75,
          level: 'critical',
          label: 'NISS ≥25',
          interpretation: 'Severe polytrauma by NISS. High risk of poor outcomes.',
        },
      ]);
      return {
        score: niss,
        ...r,
        details: [
          { label: 'Calculation', value: `${sorted[0]}² + ${sorted[1]}² + ${sorted[2]}²` },
          { label: 'Note', value: 'Uses three worst injuries overall, not one per ISS region' },
        ],
      };
    },
    evidence: {
      summary: 'NISS squares and sums the three most severe AIS injuries irrespective of body region, improving discrimination when multiple injuries share a region.',
      formula: 'NISS = A² + B² + C² (three highest AIS injuries)',
      validation: 'Osler et al.; frequently compared favorably with ISS in trauma outcomes research.',
      references: [
        {
          title: 'A modification of the Injury Severity Score that both improves accuracy and simplifies scoring',
          citation: 'Osler T et al. J Trauma. 1997',
          year: 1997, pmid: '9420106',
          doi: '10.1097/00005373-199712000-00009', },
      ],
    },
    nextSteps: [
      { condition: 'High NISS', actions: ['Multidisciplinary trauma care', 'Prioritize life-threatening injuries (ATLS)'] },
    ],
  },

  {
    id: 'triss',
    name: 'TRISS Survival Probability',
    shortName: 'TRISS',
    description: 'Educational Trauma Score–Injury Severity Score probability of survival from RTS, ISS, age, and mechanism.',
    category: 'emergency',
    tags: ['trauma', 'triss', 'rts', 'iss', 'prognosis'],
    whenToUse: 'Trauma audit, research, and educational survival probability estimates.',
    whyUse: 'Combines physiology (RTS), anatomy (ISS), age, and blunt vs penetrating mechanism.',
    inputs: [
      selectInput('mechanism', 'Mechanism', [
        { label: 'Blunt', value: 'blunt' },
        { label: 'Penetrating', value: 'penetrating' },
      ]),
      numberInput('rts', 'Revised Trauma Score (RTS)', {
        min: 0,
        max: 8,
        step: 0.01,
        defaultValue: 7.84,
        helpText: 'RTS = 0.9368·GCSc + 0.7326·SBPc + 0.2908·RRc',
      }),
      numberInput('iss', 'ISS', { min: 0, max: 75, step: 1, defaultValue: 9 }),
      yesNo('age55', 'Age ≥55 years', -28.9),
    ],
    calculate(values) {
      const rts = num(values.rts, 7.84);
      const iss = num(values.iss, 9);
      // TRISS age index = 1 if age ≥55
      const ageIndex = bool(values.age55) ? 1 : 0;
      const penetrating = values.mechanism === 'penetrating';

      // Standard adult TRISS coefficients (Champion/Boyd methodology)
      const b0 = penetrating ? -2.5355 : -0.4499;
      const b1 = penetrating ? 0.9934 : 0.8085;
      const b2 = penetrating ? -0.0651 : -0.0835;
      const b3 = penetrating ? -1.1360 : -1.7430;

      const b = b0 + b1 * rts + b2 * iss + b3 * ageIndex;
      const ps = 1 / (1 + Math.exp(-b));
      const pct = round(ps * 100, 1);

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (pct < 25) riskLevel = 'critical';
      else if (pct < 50) riskLevel = 'high';
      else if (pct < 75) riskLevel = 'moderate';

      return {
        score: pct,
        unit: '%',
        label: `Ps ≈ ${pct}%`,
        interpretation: `Estimated probability of survival ≈ ${pct}% (${penetrating ? 'penetrating' : 'blunt'} coefficients). Educational/audit tool — not an individual goals-of-care determinant.`,
        riskLevel,
        details: [
          { label: 'b (logit)', value: String(round(b, 4)) },
          { label: 'RTS', value: String(rts) },
          { label: 'ISS', value: String(iss) },
          { label: 'Age index', value: ageIndex ? '1 (>55)' : '0 (≤55)' },
          { label: 'Mechanism', value: penetrating ? 'Penetrating' : 'Blunt' },
        ],
      };
    },
    evidence: {
      summary:
        'TRISS: Ps = 1/(1+e^(−b)); b = b0 + b1·RTS + b2·ISS + b3·AgeIndex. Separate coefficients for blunt and penetrating trauma.',
      formula: 'Ps = 1/(1+exp(−(b0 + b1·RTS + b2·ISS + b3·Age>55)))',
      validation: 'Boyd/Champion MTOS methodology; used for trauma center performance benchmarking (W-score, etc.).',
      references: [
        {
          title: 'Evaluating trauma care: the TRISS method',
          citation: 'Boyd CR, Tolson MA, Copes WS. J Trauma. 1987',
          year: 1987, pmid: '3106646' },
      ],
    },
    nextSteps: [
      {
        condition: 'Any major trauma',
        actions: [
          'ATLS priorities supersede score',
          'Use for audit/QI, not sole clinical decision-making',
          'Document RTS components and AIS/ISS coding carefully',
        ],
      },
    ],
    pearls: ['Coefficients vary slightly by dataset version; this uses classic adult blunt/penetrating values for education.'],
  },

  {
    id: 'asia-impairment',
    name: 'ASIA Impairment Scale (AIS A–E)',
    shortName: 'ASIA IS',
    description: 'ISNCSCI / ASIA Impairment Scale grades spinal cord injury completeness (A–E).',
    category: 'neurology',
    tags: ['spinal cord', 'asia', 'isncsci', 'neuro'],
    whenToUse: 'Traumatic or nontraumatic spinal cord injury grading after ISNCSCI exam.',
    whyUse: 'Standard international language for completeness and prognosis framing.',
    inputs: [
      selectInput(
        'grade',
        'ASIA Impairment Scale grade',
        [
          {
            label: 'A — Complete',
            value: 'A',
            description: 'No sensory or motor function in S4–5',
          },
          {
            label: 'B — Sensory incomplete',
            value: 'B',
            description: 'Sensory but not motor function preserved below NLI and includes S4–5',
          },
          {
            label: 'C — Motor incomplete (weak)',
            value: 'C',
            description: 'Motor incomplete; more than half of key muscles below NLI have grade <3',
          },
          {
            label: 'D — Motor incomplete (stronger)',
            value: 'D',
            description: 'Motor incomplete; at least half of key muscles below NLI have grade ≥3',
          },
          {
            label: 'E — Normal',
            value: 'E',
            description: 'Normal sensory and motor function (in a patient with prior deficits)',
          },
        ],
        undefined,
        'Complete vs incomplete = sacral sparing. Sensory sparing = LT and PP at S4–5 mucocutaneous junction and/or deep anal pressure (DAP). Motor incomplete = voluntary anal contraction (VAC) OR motor function more than three levels below the motor level on a given side. C: more than half of key muscles below NLI grade <3; D: at least half ≥3. If a key muscle is NT, do not invent a grade — document NT. Use the official ASIA worksheet for the full exam; this control only maps the AIS letter.',
      ),
    ],
    calculate(values) {
      const g = String(values.grade ?? 'A');
      const map: Record<
        string,
        { score: number; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' }
      > = {
        A: {
          score: 1,
          label: 'ASIA A — Complete',
          interpretation:
            'No sacral sparing (no S4–5 sensory or motor). Poorest spontaneous recovery profile; still provide acute SCI care, MAP goals, and early rehab planning.',
          riskLevel: 'critical',
        },
        B: {
          score: 2,
          label: 'ASIA B — Sensory incomplete',
          interpretation:
            'Sensory incomplete with sacral sparing but no motor below neurological level. Better conversion potential than A; serial exams essential.',
          riskLevel: 'high',
        },
        C: {
          score: 3,
          label: 'ASIA C — Motor incomplete (majority <3)',
          interpretation:
            'Motor incomplete; >50% of key muscles below NLI grade <3. Meaningful recovery possible with intensive rehab.',
          riskLevel: 'high',
        },
        D: {
          score: 4,
          label: 'ASIA D — Motor incomplete (majority ≥3)',
          interpretation:
            'Motor incomplete with ≥50% key muscles below NLI grade ≥3. Often ambulatory potential with assistive devices; falls risk remains high.',
          riskLevel: 'moderate',
        },
        E: {
          score: 5,
          label: 'ASIA E — Normal',
          interpretation:
            'Sensory and motor function graded normal. Used when prior deficits have fully resolved on ISNCSCI testing.',
          riskLevel: 'normal',
        },
      };
      const m = map[g] ?? map.A;
      return {
        score: m.score,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'Grade', value: g }],
      };
    },
    evidence: {
      summary:
        'ASIA Impairment Scale A–E from ISNCSCI: completeness defined by sacral sparing (S4–5). Motor incomplete grades C vs D by key muscle strength distribution.',
      formula: 'A complete; B sensory incomplete; C/D motor incomplete; E normal',
      validation: 'International Standards for Neurological Classification of SCI (ASIA/ISCoS).',
      references: [
        {
          title: 'International standards for neurological classification of spinal cord injury (revised 2011)',
          citation: 'Kirshblum SC, Burns SP, Biering-Sorensen F, et al. J Spinal Cord Med. 2011;34:535-546',
          year: 2011,
          pmid: '22330108',
          doi: '10.1179/204577211X13207446293695',
        },
        {
          title: 'International Standards for Neurological Classification of Spinal Cord Injury: Revised 2019',
          citation: 'Rupp R, Biering-Sørensen F, Burns SP, et al. Top Spinal Cord Inj Rehabil. 2021;27:1-22',
          year: 2021,
          pmid: '34108832',
          doi: '10.46292/sci2702-1',
          url: 'https://asia-spinalinjury.org/international-standards-neurological-classification-sci-isncsci-worksheet/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Acute SCI',
        actions: [
          'Immobilize / protect cord',
          'Maintain perfusion (MAP goals per protocol)',
          'Urgent imaging and spine consult',
          'DVT prophylaxis and skin care',
          'Formal ISNCSCI exam when examinable',
        ],
      },
    ],
  },

  {
    id: 'frankel-grade',
    name: 'Frankel Grade (Spinal Cord)',
    shortName: 'Frankel',
    description: 'Classic Frankel A–E grading of spinal cord injury motor/sensory function.',
    category: 'neurology',
    tags: ['spinal cord', 'frankel', 'trauma', 'neuro'],
    whenToUse: 'Historical/educational SCI severity grading or literature comparison with ASIA.',
    whyUse: 'Simple five-grade scale preceding modern ASIA Impairment Scale.',
    inputs: [
      selectInput(
        'grade',
        'Frankel grade',
        [
          {
            label: 'A — Complete: no motor or sensory function below level',
            value: 'A',
            description: 'Complete motor and sensory loss below the injury level',
          },
          {
            label: 'B — Sensory only: some sensation, no motor below level',
            value: 'B',
            description: 'Some sensation preserved below the level (including sacral); no motor',
          },
          {
            label: 'C — Motor useless: some motor, nonfunctional for ambulation',
            value: 'C',
            description: 'Motor preserved but not useful for walking (cannot ambulate even with aids)',
          },
          {
            label: 'D — Motor useful: motor preserved, useful function (may walk with/without aids)',
            value: 'D',
            description: 'Motor useful — can walk with or without aids',
          },
          {
            label: 'E — Normal: no neurological deficit',
            value: 'E',
            description: 'Normal motor and sensory function (reflexes may still be abnormal)',
          },
        ],
        undefined,
        'Frankel C vs D is whether residual motor is useful for practical ambulation — not the ASIA C/D muscle-majority (≥ half of key muscles grade ≥3) rule. Prefer ASIA/ISNCSCI for contemporary documentation.',
      ),
    ],
    calculate(values) {
      const g = String(values.grade ?? 'A');
      const map: Record<
        string,
        { score: number; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' }
      > = {
        A: {
          score: 1,
          label: 'Frankel A',
          interpretation: 'Complete injury below the lesion. Correlate with ASIA A; urgent SCI pathway.',
          riskLevel: 'critical',
        },
        B: {
          score: 2,
          label: 'Frankel B',
          interpretation: 'Sensory preservation without useful motor function below level. Similar concept to ASIA B.',
          riskLevel: 'high',
        },
        C: {
          score: 3,
          label: 'Frankel C',
          interpretation: 'Some motor power present but not useful for practical ambulation/function.',
          riskLevel: 'high',
        },
        D: {
          score: 4,
          label: 'Frankel D',
          interpretation: 'Useful motor function preserved below level; patient may ambulate with or without assistance.',
          riskLevel: 'moderate',
        },
        E: {
          score: 5,
          label: 'Frankel E',
          interpretation: 'Neurologically normal exam on this scale.',
          riskLevel: 'normal',
        },
      };
      const m = map[g] ?? map.A;
      return {
        score: m.score,
        label: m.label,
        interpretation: m.interpretation + ' Prefer ASIA/ISNCSCI for contemporary documentation.',
        riskLevel: m.riskLevel,
      };
    },
    evidence: {
      summary: 'Frankel grades A–E (1969) classify SCI from complete (A) to normal (E). Superseded in detail by ASIA Impairment Scale but still referenced.',
      formula: 'A complete → E normal (motor useful = D)',
      validation: 'Historical standard; maps roughly onto ASIA grades with less granular sacral-sparing rules.',
      references: [
        {
          title: 'The value of postural reduction in the initial management of closed injuries of the spine with paraplegia and tetraplegia',
          citation: 'Frankel HL, Hancock DO, Hyslop G, et al. Paraplegia. 1969;7:179-192',
          year: 1969,
          pmid: '5360915',
          doi: '10.1038/sc.1969.30', },
      ],
    },
    nextSteps: [
      { condition: 'Frankel A–C acute', actions: ['Full SCI trauma evaluation', 'Spine surgery consult', 'Rehab early involvement'] },
      { condition: 'Documentation', actions: ['Record ASIA IS + NLI when possible for modern standards'] },
    ],
  },
  {
    id: 'glasgow-outcome',
    name: 'Glasgow Outcome Scale (GOS)',
    shortName: 'GOS',
    description: 'Five-point global outcome scale after brain injury (1–5).',
    category: 'neurology',
    tags: ['brain injury', 'gos', 'outcome', 'neuro'],
    whenToUse: 'Outcome assessment after traumatic brain injury or other severe brain insults.',
    whyUse: 'Simple, widely used endpoint in TBI research and follow-up clinics.',
    inputs: [
      selectInput(
        'gos',
        'GOS category',
        [
          { label: '1 — Death', value: 1, description: 'Dead' },
          {
            label: '2 — Vegetative state (unresponsive wakefulness)',
            value: 2,
            description:
              'Eyes-open unresponsive wakefulness: no awareness; does not follow commands or speak. Sleep–wake cycles and reflex responses may be present.',
          },
          {
            label: '3 — Severe disability (conscious but dependent)',
            value: 3,
            description:
              'Conscious but needs another person for daily support (dressing, feeding, toileting, or cannot be left alone). Includes those who follow commands but cannot live independently.',
          },
          {
            label: '4 — Moderate disability (independent but disabled)',
            value: 4,
            description:
              'Independent at home (manages ADLs; can shop and travel locally) but disabled — cannot resume previous work, study, or social life at former capacity.',
          },
          {
            label: '5 — Good recovery (resumes normal life; may have minor deficits)',
            value: 5,
            description:
              'Resumes normal life; minor residual neurologic or psychological deficits allowed if they do not prevent independent living.',
          },
        ],
        undefined,
        'Rate current vs pre-injury (Jennett/Bond or Wilson interview); overall = worst domain. Severe vs moderate hinges on independence at home (needs daily help vs independent but not back to prior work/social life). Prefer GOS-E when lower/upper splits (8 h alone, shop/travel, work) are needed.',
      ),
    ],
    calculate(values) {
      const g = num(values.gos, 5);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }
      > = {
        1: {
          label: 'GOS 1 — Death',
          interpretation: 'Fatal outcome.',
          riskLevel: 'critical',
        },
        2: {
          label: 'GOS 2 — Vegetative / unresponsive wakefulness',
          interpretation:
            'Awake but unaware; no meaningful interaction. Requires full supportive care and goals-of-care discussions.',
          riskLevel: 'critical',
        },
        3: {
          label: 'GOS 3 — Severe disability',
          interpretation:
            'Conscious but dependent for daily support (physical and/or cognitive). Intensive rehab and caregiver planning needed.',
          riskLevel: 'high',
        },
        4: {
          label: 'GOS 4 — Moderate disability',
          interpretation:
            'Independent in daily life but with disability (work/school/social limitations). Outpatient rehab and vocational support.',
          riskLevel: 'moderate',
        },
        5: {
          label: 'GOS 5 — Good recovery',
          interpretation:
            'Return to independent life; minor residual symptoms possible. Still counsel on post-concussive issues and safety.',
          riskLevel: 'low',
        },
      };
      const m = map[g] ?? map[5];
      return { score: g, label: m.label, interpretation: m.interpretation, riskLevel: m.riskLevel };
    },
    evidence: {
      summary: 'Jennett & Bond GOS: 1 death, 2 vegetative, 3 severe disability, 4 moderate disability, 5 good recovery.',
      formula: 'Ordinal 1–5 global outcome',
      validation: 'Foundational TBI outcome measure; GOS-E provides finer granularity.',
      references: [
        {
          title: 'Assessment of outcome after severe brain damage',
          citation: 'Jennett B, Bond M. Lancet. 1975',
          year: 1975, pmid: '46957',
          doi: '10.1016/s0140-6736(75)92830-5', },
      ],
    },
    nextSteps: [
      { condition: 'GOS 2–3', actions: ['Rehab medicine', 'Neuropsychology', 'Caregiver support', 'Goals of care'] },
      { condition: 'GOS 4–5', actions: ['Outpatient neuro follow-up', 'Return-to-work/drive guidance', 'Symptom management'] },
    ],
  },

  {
    id: 'goese',
    name: 'Glasgow Outcome Scale–Extended (GOS-E)',
    shortName: 'GOS-E',
    description: 'Eight-point extended global outcome scale after brain injury.',
    category: 'neurology',
    tags: ['brain injury', 'gos-e', 'outcome', 'tbi'],
    whenToUse: 'More granular functional outcome after TBI than classic 5-point GOS.',
    whyUse: 'Standard secondary endpoint in modern TBI trials and clinics.',
    inputs: [
      selectInput(
        'gose',
        'GOS-E category',
        [
          { label: '1 — Death', value: 1, description: 'Dead' },
          {
            label: '2 — Vegetative state',
            value: 2,
            description: 'Not obeying commands and not saying words (unresponsive wakefulness)',
          },
          {
            label: '3 — Lower severe disability',
            value: 3,
            description: 'Dependent for daily support; cannot be left alone for 8 h',
          },
          {
            label: '4 — Upper severe disability',
            value: 4,
            description: 'Dependent but can be left ≥8 h; cannot shop OR travel locally without assistance',
          },
          {
            label: '5 — Lower moderate disability',
            value: 5,
            description:
              'Independent at home and can shop/travel but cannot work/study, or major social/leisure restriction',
          },
          {
            label: '6 — Upper moderate disability',
            value: 6,
            description: 'Reduced work capacity and/or social/leisure less than half as often as before injury',
          },
          {
            label: '7 — Lower good recovery',
            value: 7,
            description: 'Residual symptoms still affecting daily life',
          },
          {
            label: '8 — Upper good recovery',
            value: 8,
            description: 'Full return; residuals none or not affecting daily life',
          },
        ],
        undefined,
        'Rate current vs pre-injury with the Wilson structured interview; overall = worst domain. Lower vs upper severe = cannot vs can be left alone 8 h. Lower vs upper moderate = cannot work vs reduced work/social. Lower vs upper good = residuals affecting vs not affecting daily life.',
      ),
    ],
    calculate(values) {
      const g = num(values.gose, 8);
      const labels: Record<number, string> = {
        1: 'Death',
        2: 'Vegetative state',
        3: 'Lower severe disability (dependent; cannot be left alone >8h)',
        4: 'Upper severe disability (dependent but can be left alone >8h)',
        5: 'Lower moderate disability (independent at home; sheltered work / major social limitation)',
        6: 'Upper moderate disability (independent; reduced work capacity / some social limitation)',
        7: 'Lower good recovery (minor sequelae affecting daily life)',
        8: 'Upper good recovery (full return; residual symptoms negligible or none)',
      };
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'info';
      if (g <= 2) riskLevel = 'critical';
      else if (g <= 4) riskLevel = 'high';
      else if (g <= 6) riskLevel = 'moderate';
      else riskLevel = 'low';

      return {
        score: g,
        label: `GOS-E ${g}`,
        interpretation: labels[g] ?? 'Select a category.',
        riskLevel,
        details: [
          { label: 'Maps to classic GOS', value: g === 1 ? '1' : g === 2 ? '2' : g <= 4 ? '3' : g <= 6 ? '4' : '5' },
        ],
      };
    },
    evidence: {
      summary:
        'GOS-E expands GOS into 8 categories by splitting severe, moderate, and good recovery into lower/upper strata for better sensitivity to change.',
      formula: 'Ordinal 1–8 structured interview scale',
      validation: 'Wilson et al.; recommended outcome instrument in many TBI studies.',
      references: [
        {
          title: 'Structured interviews for the Glasgow Outcome Scale and the extended GOS',
          citation: 'Wilson JT, Pettigrew LE, Teasdale GM. J Neurotrauma. 1998',
          year: 1998, pmid: '9726257',
          doi: '10.1089/neu.1998.15.573', },
      ],
    },
    nextSteps: [
      { condition: 'GOS-E 2–4', actions: ['Comprehensive rehab', 'Social work / caregiver resources', 'Long-term care planning'] },
      { condition: 'GOS-E 5–8', actions: ['Targeted cognitive/vocational rehab', 'Community reintegration'] },
    ],
  },

  {
    id: 'fagan-nomogram',
    name: 'Fagan Nomogram (Post-test Probability)',
    shortName: 'Fagan',
    description: 'Converts pre-test probability and likelihood ratio into post-test probability.',
    category: 'general',
    tags: ['bayes', 'likelihood ratio', 'probability', 'ebm', 'fagan'],
    whenToUse: 'Educational bedside Bayes: how much a test result changes disease probability.',
    whyUse: 'Makes LR+ / LR− actionable as updated probabilities.',
    inputs: [
      numberInput('prior', 'Pre-test probability', {
        unit: '%',
        min: 0.1,
        max: 99.9,
        step: 0.1,
        defaultValue: 20,
      }),
      numberInput('lr', 'Likelihood ratio (LR+ or LR−)', {
        min: 0.001,
        max: 1000,
        step: 0.01,
        defaultValue: 10,
        helpText: 'Use LR+ for positive test, LR− for negative test',
      }),
    ],
    calculate(values) {
      const priorPct = Math.min(99.9, Math.max(0.1, num(values.prior, 20)));
      const lr = Math.max(0.001, num(values.lr, 10));
      const prior = priorPct / 100;
      const preOdds = prior / (1 - prior);
      const postOdds = preOdds * lr;
      const post = postOdds / (1 + postOdds);
      const postPct = round(post * 100, 1);
      const delta = round(postPct - priorPct, 1);

      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      if (postPct >= 70) riskLevel = 'high';
      else if (postPct >= 30) riskLevel = 'moderate';
      else riskLevel = 'low';

      return {
        score: postPct,
        unit: '%',
        label: `Post-test probability ${postPct}%`,
        interpretation: `Prior ${priorPct}% × LR ${lr} → post-test ≈ ${postPct}% (change ${delta >= 0 ? '+' : ''}${delta} points). Educational Bayes only.`,
        riskLevel,
        details: [
          { label: 'Pre-test odds', value: String(round(preOdds, 4)) },
          { label: 'Post-test odds', value: String(round(postOdds, 4)) },
          { label: 'LR used', value: String(lr) },
        ],
      };
    },
    evidence: {
      summary: 'Fagan nomogram implements odds form of Bayes: post-test odds = pre-test odds × LR; probability = odds/(1+odds).',
      formula: 'odds_pre = p/(1−p); odds_post = odds_pre × LR; p_post = odds_post/(1+odds_post)',
      validation: 'Standard evidence-based medicine teaching tool (Fagan TJ, 1975).',
      references: [
        {
          title: 'Nomogram for Bayes theorem',
          citation: 'Fagan TJ. N Engl J Med. 1975',
          year: 1975, pmid: '1143310',
          doi: '10.1056/NEJM197507312930513', },
      ],
    },
    nextSteps: [
      {
        condition: 'High post-test probability',
        actions: ['Consider treating / confirming with definitive test', 'Avoid unnecessary repeat low-yield tests'],
      },
      {
        condition: 'Low post-test probability',
        actions: ['Consider ruling out pathway', 'Reconsider diagnosis if clinical suspicion remains high (bad prior or imperfect LR)'],
      },
    ],
    pearls: ['Garbage in, garbage out: LRs depend on study quality and population similarity.'],
  },

  {
    id: 'likelihood-ratio',
    name: 'Likelihood Ratios from Sens/Spec',
    shortName: 'LR+/LR−',
    description: 'Converts sensitivity and specificity into positive and negative likelihood ratios.',
    category: 'general',
    tags: ['ebm', 'sensitivity', 'specificity', 'likelihood ratio', 'diagnostics'],
    whenToUse: 'When a paper reports sens/spec and you need LR+ and LR− for Bayes updating.',
    whyUse: 'LRs transfer more cleanly across prevalence than PPV/NPV.',
    inputs: [
      numberInput('sens', 'Sensitivity', { unit: '%', min: 0.1, max: 100, step: 0.1, defaultValue: 90 }),
      numberInput('spec', 'Specificity', { unit: '%', min: 0.1, max: 100, step: 0.1, defaultValue: 80 }),
    ],
    calculate(values) {
      const sensPct = Math.min(100, Math.max(0.1, num(values.sens, 90)));
      const specPct = Math.min(100, Math.max(0.1, num(values.spec, 80)));
      const sens = sensPct / 100;
      const spec = specPct / 100;
      const lrPos = round(sens / Math.max(1e-6, 1 - spec), 2);
      const lrNeg = round(Math.max(1e-6, 1 - sens) / Math.max(1e-6, spec), 3);

      let posNote = 'LR+ modest';
      if (lrPos >= 10) posNote = 'LR+ large (often useful to rule in)';
      else if (lrPos >= 5) posNote = 'LR+ moderate';
      else if (lrPos >= 2) posNote = 'lr+ small';

      let negNote = 'LR− modest';
      if (lrNeg <= 0.1) negNote = 'LR− very small (often useful to rule out)';
      else if (lrNeg <= 0.2) negNote = 'LR− small–moderate rule-out power';
      else if (lrNeg <= 0.5) negNote = 'LR− small';

      return {
        score: lrPos,
        label: `LR+ ${lrPos} · LR− ${lrNeg}`,
        interpretation: `Sensitivity ${sensPct}%, specificity ${specPct}%. ${posNote}. ${negNote}. Pair with Fagan nomogram and pre-test probability.`,
        riskLevel: 'info',
        details: [
          { label: 'LR+', value: String(lrPos) },
          { label: 'LR−', value: String(lrNeg) },
          { label: 'Formula', value: 'LR+ = sens/(1−spec); LR− = (1−sens)/spec' },
        ],
        recommendations: [
          'Use LR+ with a positive result and LR− with a negative result in the Fagan calculator',
          'Rough guide: LR+ >10 strong rule-in; LR− <0.1 strong rule-out',
        ],
      };
    },
    evidence: {
      summary: 'LR+ = sensitivity / (1 − specificity); LR− = (1 − sensitivity) / specificity.',
      formula: 'LR+ = sens/(1−spec); LR− = (1−sens)/spec',
      validation: 'Core diagnostic EBM identity relating operating characteristics to Bayes factors.',
      references: [
        {
          title: 'Users\' guides to the medical literature. III. How to use an article about a diagnostic test. B. What are the results and will they help me in caring for my patients?',
          citation: 'Jaeschke R, Guyatt GH, Sackett DL. JAMA. 1994;271:703-707',
          year: 1994,
          pmid: '8309035',
          doi: '10.1001/jama.1994.03510330081039',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'After computing LRs',
        actions: ['Apply Fagan nomogram with clinical pre-test probability', 'Avoid using PPV alone without prevalence context'],
      },
    ],
  },
];
