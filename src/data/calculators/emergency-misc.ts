import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const emergencyMiscCalcs: Calculator[] = [
  {
    id: 'ottawa-ankle',
    name: 'Ottawa Ankle Rules',
    shortName: 'Ottawa Ankle',
    description: 'Determines need for ankle/foot radiographs after acute injury.',
    category: 'orthopedics',
    tags: ['ankle', 'xray', 'trauma'],
    whenToUse: 'Acute ankle or midfoot injury (<10 days) in patients ≥2 years (adults and children).',
    whyUse: 'Safely reduces unnecessary radiographs.',
    inputs: [
      yesNo('malleolarPain', 'Pain in malleolar zone', 0,
        'Malleolar zone = distal 6 cm of tibia/fibula and talus. Prerequisite for the ankle series; does not suppress the foot rule.', true),
      yesNo('midfootPain', 'Pain in midfoot zone', 0,
        'Midfoot zone = navicular, cuboid, cuneiforms, metatarsal bases. Prerequisite for the foot series; does not suppress the ankle rule.', false),
      yesNo('postLat', 'Bone tenderness posterior distal 6 cm lateral malleolus', 0,
        'Palpate bone along the posterior edge or tip of the distal 6 cm of the fibula — not ATFL or the anterior joint line.', true),
      yesNo('postMed', 'Bone tenderness posterior distal 6 cm medial malleolus', 0,
        'Palpate bone along the posterior edge or tip of the distal 6 cm of the tibia — not the deltoid ligament or anterior joint.', false),
      yesNo('navicular', 'Bone tenderness navicular', 0,
        'Palpate bone, not soft tissue, at the navicular.', false),
      yesNo('base5', 'Bone tenderness base of 5th metatarsal', 0,
        'Palpate bone at the base of the 5th metatarsal, not the peroneal tendons.', false),
      yesNo('walk', 'Unable to bear weight 4 steps both immediately AND in ED', 0,
        'Unable to take 4 steps both immediately AND in the ED (4 steps = 2 complete transfers onto each foot; limping allowed). If 4 steps in either setting, score No. Counts toward each series only when that zone has pain.', true),
    ],
    calculate(values) {
      const malleolarPain = bool(values.malleolarPain);
      const midfootPain = bool(values.midfootPain);
      const postLat = bool(values.postLat);
      const postMed = bool(values.postMed);
      const navicular = bool(values.navicular);
      const base5 = bool(values.base5);
      const walk = bool(values.walk);

      // Independent series (Stiell JAMA 1993): a positive contralateral rule is never suppressed.
      const ankleXray = malleolarPain && (postLat || postMed || walk);
      const footXray = midfootPain && (navicular || base5 || walk);

      const details = [
        { label: 'Malleolar zone pain', value: malleolarPain ? 'Yes' : 'No' },
        { label: 'Midfoot zone pain', value: midfootPain ? 'Yes' : 'No' },
        { label: 'Posterior lateral malleolus tenderness', value: postLat ? 'Yes' : 'No' },
        { label: 'Posterior medial malleolus tenderness', value: postMed ? 'Yes' : 'No' },
        { label: 'Navicular tenderness', value: navicular ? 'Yes' : 'No' },
        { label: 'Base of 5th metatarsal tenderness', value: base5 ? 'Yes' : 'No' },
        { label: 'Unable to walk 4 steps (immediate + ED)', value: walk ? 'Yes' : 'No' },
        { label: 'Ankle series', value: ankleXray ? 'Indicated' : 'Not indicated' },
        { label: 'Foot series', value: footXray ? 'Indicated' : 'Not indicated' },
      ];

      if (ankleXray && footXray) {
        return {
          score: 2,
          label: 'Ankle and foot x-rays indicated',
          interpretation: 'Ottawa Ankle and Foot Rules both positive — obtain ankle series AND foot series.',
          riskLevel: 'moderate' as const,
          details,
          recommendations: ['Ankle series radiographs', 'Foot series radiographs'],
        };
      }
      if (ankleXray) {
        return {
          score: 1,
          label: 'Ankle x-ray indicated',
          interpretation: 'Ottawa Ankle Rules positive — obtain ankle radiographs. Foot series not indicated unless midfoot-zone criteria are also met.',
          riskLevel: 'moderate' as const,
          details,
          recommendations: ['Ankle series radiographs'],
        };
      }
      if (footXray) {
        return {
          score: 1,
          label: 'Foot x-ray indicated',
          interpretation: 'Ottawa Foot Rules positive — obtain foot radiographs. Ankle series not indicated unless malleolar-zone criteria are also met.',
          riskLevel: 'moderate' as const,
          details,
          recommendations: ['Foot series radiographs'],
        };
      }
      return {
        score: 0,
        label: 'X-ray not required',
        interpretation: 'Neither ankle nor foot series criteria met — clinically significant malleolar and midfoot fracture unlikely; radiograph not required if exam reliable.',
        riskLevel: 'low' as const,
        details,
        recommendations: ['RICE', 'Weight bearing as tolerated', 'Follow-up if not improving'],
      };
    },
    evidence: {
      summary: 'Ottawa Ankle and Foot Rules are independent, highly sensitive instruments for clinically significant malleolar and midfoot fractures.',
      formula: 'Ankle series if malleolar-zone pain AND (posterior edge/tip of lateral or medial malleolus OR inability to bear weight 4 steps immediately and in ED). Foot series if midfoot-zone pain AND (navicular or base of 5th metatarsal tenderness OR inability to bear weight 4 steps). Combined injuries can indicate both; “X-ray not required” only if neither series is indicated.',
      validation: 'Multiple prospective validations; near 100% sensitivity for malleolar/midfoot fractures.',
      references: [{ title: 'Decision rules for use of radiography in acute ankle injuries', citation: 'Stiell IG et al. JAMA. 1993', year: 1993, pmid: '8433468',
          doi: '10.1001/jama.269.9.1127', }],
    },
    nextSteps: [
      { condition: 'Ankle series positive', actions: ['Ankle radiographs'] },
      { condition: 'Foot series positive', actions: ['Foot radiographs'] },
      { condition: 'Both positive', actions: ['Ankle series and foot series'] },
      { condition: 'Neither indicated', actions: ['RICE', 'Early weight bearing as tolerated', 'Follow-up if not improving'] },
    ],
    pearls: [
      'Ankle and foot series are scored independently — do not skip a positive midfoot rule because the ankle is the “main” injury (or vice versa).',
      'Inability to take 4 steps counts toward a series only when that zone has pain.',
    ],
  },
  {
    id: 'ottawa-knee',
    name: 'Ottawa Knee Rules',
    shortName: 'Ottawa Knee',
    description: 'Determines need for knee radiograph after acute injury.',
    category: 'orthopedics',
    tags: ['knee', 'xray', 'trauma'],
    whenToUse: 'Adults with acute knee injury (twist, fall, or direct blow) to decide whether radiographs are needed; any single positive criterion warrants a knee X-ray series.',
    whyUse: 'Reduces unnecessary knee films with high sensitivity.',
    inputs: [
      yesNo('age55', 'Age ≥ 55 years', 1,
        'Patient age ≥55 years at the time of injury.', true),
      yesNo('fibula', 'Tenderness of fibular head', 1,
        'Tenderness of the fibular head (need not be the sole site of bony tenderness).', false),
      yesNo('patella', 'Isolated tenderness of patella', 1,
        'Patellar tenderness only if there is no other bony tenderness of the knee.', true),
      yesNo('flex90', 'Inability to flex knee to 90°', 1,
        'Cannot actively flex the injured knee to 90°. Measure from full extension.', false),
      yesNo('walk', 'Unable to bear weight 4 steps both immediately AND in ED', 1,
        'Unable to take 4 steps both immediately AND in the ED (4 steps = 2 complete transfers onto each foot; limping allowed). If 4 steps in either setting, score No.', true),
    ],
    calculate(values) {
      const pos = ['age55', 'fibula', 'patella', 'flex90', 'walk'].some((k) => bool(values[k]));
      if (pos) {
        return { score: 1, label: 'X-ray indicated', interpretation: '≥1 criterion: obtain knee radiographs.', riskLevel: 'moderate' };
      }
      return { score: 0, label: 'X-ray not required', interpretation: 'All criteria negative — radiograph not required.', riskLevel: 'low' };
    },
    evidence: {
      summary: 'Ottawa Knee Rules: age≥55, fibular head tenderness, patellar tenderness, flex <90, inability to bear weight.',
      validation: 'High sensitivity for knee fractures.',
      references: [{ title: 'Prospective validation of a decision rule for the use of radiography in acute knee injuries', citation: 'Stiell IG et al. JAMA. 1996', year: 1996, pmid: '8594242' }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Knee X-ray series'] },
      { condition: 'Negative', actions: ['Conservative care', 'Reassess if not improving'] },
    ],
  },
  {
    id: 'nexus',
    name: 'NEXUS C-Spine Criteria',
    shortName: 'NEXUS',
    description: 'Clinically clears cervical spine without imaging when all low-risk criteria met.',
    category: 'emergency',
    tags: ['c-spine', 'trauma', 'imaging'],
    whenToUse: 'Blunt trauma patients for C-spine clearance.',
    whyUse: 'Avoids unnecessary C-spine imaging.',
    inputs: [
      yesNo('midline', 'Midline posterior cervical tenderness', 1,
        'Pain on palpation of the posterior midline from the nuchal ridge to T1, or any cervical spinous process (lateral/paraspinal tenderness does not count).', true),
      yesNo('intox', 'Evidence of intoxication', 1,
        'Recent ingestion, exam evidence (odor of alcohol, slurred speech, ataxia), or tests showing alcohol/drugs affecting alertness (e.g. BAL >0.08%).', false),
      yesNo('ams', 'Altered level of alertness', 1,
        'GCS ≤14; disoriented to person/place/time/events; cannot remember 3 objects at 5 min; or delayed/inappropriate response to external stimuli.', false),
      yesNo('focal', 'Focal neurologic deficit', 1,
        'Any new motor or sensory deficit (including numbness, weakness, or abnormal reflexes).', false),
      yesNo('distracting', 'Painful distracting injury', 1,
        'Long-bone fracture; visceral injury needing surgical consult; large laceration/degloving/crush; large burns; or any injury causing acute functional impairment judged able to mask neck pain.', false),
    ],
    calculate(values) {
      const pos = ['midline', 'intox', 'ams', 'focal', 'distracting'].some((k) => bool(values[k]));
      if (!pos) {
        return {
          score: 0,
          label: 'NEXUS negative — clinically clear',
          interpretation: 'All low-risk criteria absent. C-spine imaging not required for clearance.',
          riskLevel: 'low',
        };
      }
      return {
        score: 1,
        label: 'NEXUS positive — image',
        interpretation: '≥1 criterion present. Cannot clear clinically; obtain C-spine imaging.',
        riskLevel: 'moderate',
      };
    },
    evidence: {
      summary: 'NEXUS: no midline tenderness, no focal deficit, normal alertness, no intoxication, no distracting injury.',
      validation: 'NEXUS validation study >34,000 patients; high sensitivity.',
      references: [{ title: 'NEXUS low-risk criteria for cervical spine radiography', citation: 'Hoffman JR et al. N Engl J Med. 2000', year: 2000, pmid: '10891516',
          doi: '10.1056/NEJM200007133430203', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['CT C-spine preferred in adults', 'Maintain collar until cleared'] },
      { condition: 'Negative', actions: ['Remove collar', 'Document clearance'] },
    ],
  },
  {
    id: 'canadian-cspine',
    name: 'Canadian C-Spine Rule',
    shortName: 'Canadian C-Spine',
    description: 'Decision rule for C-spine imaging after blunt trauma.',
    category: 'emergency',
    tags: ['c-spine', 'trauma'],
    whenToUse: 'Alert (GCS 15) stable adults with blunt trauma.',
    whyUse: 'Slightly more sensitive/specific than NEXUS in some comparisons.',
    inputs: [
      yesNo('age65', 'Age ≥65 years', 0,
        'Independent high-risk factor. Any one high-risk item → radiography (do not proceed to low-risk/ROM).', false),
      yesNo('dangerousMechanism', 'Dangerous mechanism', 0,
        'Fall ≥3 ft/1 m or 5 stairs; axial load (e.g. diving); MVC >100 km/h (~62 mph), rollover, or ejection; motorized recreational vehicle; bicycle collision.', false),
      yesNo('paresthesias', 'Paresthesias in the extremities', 0,
        'Any extremity paresthesias after the injury. Independent high-risk factor — image if Yes even if age <65 and mechanism is not “dangerous.”', false),
      yesNo('lowRisk', 'Any low-risk factor allowing assessment: simple rear-end MVC, sitting in ED, ambulatory, delayed neck pain, or absence of midline tenderness', -1,
        'Any of: simple rear-end (exclude pushed into oncoming traffic, hit by bus/large truck, rollover, or high-speed impact); sitting in the ED; ambulatory at any time; delayed (not immediate) neck pain; absence of midline C-spine tenderness. Do not test ROM unless a low-risk factor is present. Skip this branch if any high-risk factor is Yes.', true),
      yesNo('rotate', 'Unable to actively rotate neck 45° left AND right', 0,
        'Patient actively rotates 45° left and 45° right. Yes (unable) if either side fails. Do not test if high-risk or no low-risk factor.', false),
    ],
    calculate(values) {
      const age65 = bool(values.age65);
      const dangerousMechanism = bool(values.dangerousMechanism);
      const paresthesias = bool(values.paresthesias);
      const highRisk = age65 || dangerousMechanism || paresthesias;
      const lowRisk = bool(values.lowRisk);
      const rotate = bool(values.rotate);
      const details = [
        { label: 'Age ≥65', value: age65 ? 'Yes' : 'No' },
        { label: 'Dangerous mechanism', value: dangerousMechanism ? 'Yes' : 'No' },
        { label: 'Paresthesias in extremities', value: paresthesias ? 'Yes' : 'No' },
        { label: 'Any high-risk factor', value: highRisk ? 'Yes — imaging' : 'No' },
        { label: 'Low-risk factor allowing ROM assessment', value: lowRisk ? 'Yes' : 'No' },
        { label: 'Unable to rotate neck 45° left AND right', value: rotate ? 'Yes' : 'No' },
      ];

      if (highRisk) {
        return {
          score: 1,
          label: 'Imaging required',
          interpretation: 'High-risk factor present — radiography/CT indicated.',
          riskLevel: 'high' as const,
          details,
        };
      }
      if (!lowRisk) {
        return {
          score: 1,
          label: 'Imaging required',
          interpretation: 'No low-risk factor — imaging indicated.',
          riskLevel: 'moderate' as const,
          details,
        };
      }
      if (rotate) {
        return {
          score: 1,
          label: 'Imaging required',
          interpretation: 'Cannot rotate 45° bilaterally — imaging indicated.',
          riskLevel: 'moderate' as const,
          details,
        };
      }
      return {
        score: 0,
        label: 'No imaging needed',
        interpretation: 'Rule negative — C-spine imaging not required.',
        riskLevel: 'low' as const,
        details,
      };
    },
    evidence: {
      summary: 'Canadian C-Spine Rule: image if ANY high-risk factor (age ≥65, dangerous mechanism, or extremity paresthesias); else if no low-risk factor → image; else if cannot rotate 45° both ways → image; else clear.',
      formula: 'High-risk (any of age ≥65 / dangerous mechanism / paresthesias) → radiography. Else no low-risk factor → radiography. Else unable to rotate 45° left and right → radiography. Else no imaging.',
      validation: 'Derived/validated by Stiell et al.; high sensitivity for clinically important C-spine injury.',
      references: [{ title: 'The Canadian C-Spine Rule for radiography', citation: 'Stiell IG et al. JAMA. 2001', year: 2001, pmid: '11597285',
          doi: '10.1001/jama.286.15.1841', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['CT C-spine', 'Maintain immobilization'] },
      { condition: 'Negative', actions: ['Clear C-spine clinically'] },
    ],
    pearls: [
      'The three high-risk factors are independent — a single Yes is enough for imaging before low-risk/ROM steps.',
    ],
  },
  {
    id: 'parkland',
    name: 'Parkland Burn Formula',
    shortName: 'Parkland',
    description: 'Fluid resuscitation volume for major burns (first 24 hours).',
    category: 'emergency',
    tags: ['burn', 'fluids', 'trauma'],
    whenToUse: 'Adults/children with major burns needing formal resuscitation.',
    whyUse: 'Classic crystalloid estimate; give half in first 8 hours from injury time.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 5, max: 200, exampleValue: 70, helpText: 'Body weight in kg for the 4 mL/kg/%TBSA estimate; select lb if needed — the engine converts. Obese patients often need adjusted weight per local protocol.' }),
      numberInput('tbsa', 'TBSA burned (2nd + 3rd degree)', { unit: '%', min: 1, max: 100, exampleValue: 20, helpText: 'Exclude first-degree/superficial burns. Use Rule of Nines, Lund-Browder, or palm ≈1% of the patient’s palm including fingers.' }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const tbsa = num(values.tbsa, 20);
      const total = round(4 * w * tbsa, 0);
      const first8 = round(total / 2, 0);
      const next16 = total - first8;
      return {
        score: total,
        unit: 'mL / 24h',
        label: 'Parkland 24h volume',
        interpretation: `Give ½ (${first8} mL) in first 8 hours from burn, remainder (${next16} mL) over next 16 hours. Titrate to UOP (adults ~0.5 mL/kg/hr). LR preferred.`,
        riskLevel: tbsa >= 20 ? 'high' : 'moderate',
        details: [
          { label: 'First 8 hours', value: `${first8} mL` },
          { label: 'Next 16 hours', value: `${next16} mL` },
        ],
      };
    },
    evidence: {
      summary: 'Parkland: 4 mL × kg × %TBSA LR in 24h (half in 8h).',
      validation: 'Foundational burn resuscitation formula; modern practice titrates to endpoints.',
      references: [{ title: 'Fluid volume and electrolyte changes of the early postburn period', citation: 'Baxter CR. Clin Plast Surg. 1974', year: 1974, pmid: '4609676' }],
    },
    nextSteps: [
      { condition: 'Major burn', actions: ['ABCs, airway if inhalation', 'Transfer to burn center per ABA criteria', 'Tetanus, analgesia', 'Titrate fluids to UOP'] },
    ],
  },
  {
    id: 'rule-of-nines',
    name: 'Rule of Nines (Adult TBSA)',
    shortName: 'Rule of Nines',
    description: 'Estimates adult burn surface area percentage.',
    category: 'emergency',
    tags: ['burn', 'tbsa'],
    whenToUse: 'Adult burn TBSA estimation for Parkland and transfer criteria.',
    whyUse: 'Rapid field estimate; Lund-Browder better for children.',
    inputs: [
      yesNo('head', 'Head & neck (9%) — entire region', 9,
        'Adult Wallace nines. Check Yes only if the entire region is partial- or full-thickness burn; for partial regions leave No and add a mental fraction of the listed % (patient palm including fingers ≈1%). Exclude first-degree. Children use Lund-Browder.', true),
      yesNo('antTrunk', 'Anterior trunk (18%) — entire region', 18,
        'Check Yes only if the entire anterior trunk is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 18%.', true),
      yesNo('postTrunk', 'Posterior trunk (18%) — entire region', 18,
        'Check Yes only if the entire posterior trunk is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 18%.', false),
      yesNo('armR', 'Right arm (9%) — entire region', 9,
        'Check Yes only if the entire right arm (including hand) is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 9%.', true),
      yesNo('armL', 'Left arm (9%) — entire region', 9,
        'Check Yes only if the entire left arm (including hand) is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 9%.', false),
      yesNo('legR', 'Right leg (18%) — entire region', 18,
        'Check Yes only if the entire right leg (including foot) is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 18%.', false),
      yesNo('legL', 'Left leg (18%) — entire region', 18,
        'Check Yes only if the entire left leg (including foot) is 2nd/3rd-degree; otherwise leave No and estimate a fraction of 18%.', false),
      yesNo('perineum', 'Perineum (1%) — entire region', 1,
        'Adult perineum/genitalia ≈1%.', false),
    ],
    calculate(values) {
      let tbsa = 0;
      if (bool(values.head)) tbsa += 9;
      if (bool(values.antTrunk)) tbsa += 18;
      if (bool(values.postTrunk)) tbsa += 18;
      if (bool(values.armR)) tbsa += 9;
      if (bool(values.armL)) tbsa += 9;
      if (bool(values.legR)) tbsa += 18;
      if (bool(values.legL)) tbsa += 18;
      if (bool(values.perineum)) tbsa += 1;
      return {
        score: tbsa,
        unit: '% TBSA',
        label: 'Estimated TBSA',
        interpretation: 'Adult rule of nines. Partial areas: use palm≈1% or estimate fractions. Pediatric proportions differ.',
        riskLevel: tbsa >= 20 ? 'high' : tbsa >= 10 ? 'moderate' : 'low',
      };
    },
    evidence: {
      summary: 'Wallace rule of nines divides adult body into 9% regions.',
      validation: 'Standard prehospital/ED estimate.',
      references: [{ title: 'The exposure treatment of burns (historical rule-of-nines teaching)', citation: 'Wallace AB. Lancet. 1951; related classic burn surface-area teaching', year: 1951, pmid: '14805109',
          doi: '10.1016/s0140-6736(51)91975-7', }],
    },
    nextSteps: [{ condition: 'TBSA estimated', actions: ['Apply Parkland if indicated', 'Burn center criteria'] }],
  },
  {
    id: 'apgar',
    name: 'APGAR Score',
    shortName: 'APGAR',
    description: 'Newborn status at 1 and 5 minutes of life.',
    category: 'obstetrics',
    tags: ['newborn', 'delivery', 'apgar'],
    whenToUse: 'Immediately after birth at 1 and 5 minutes (and q5 min if <7).',
    whyUse: 'Standard communication of newborn transition; not used alone to guide resuscitation start.',
    inputs: [
      selectInput('appearance', 'Appearance (color)', [
        { label: 'Blue/pale (0)', value: 0, description: 'Entire body blue or pale' },
        { label: 'Acrocyanosis (1)', value: 1, description: 'Pink body, blue extremities' },
        { label: 'Pink (2)', value: 2, description: 'Completely pink' },
      ], 1, 'Color: fully pink 2, acrocyanosis (blue extremities, pink trunk) 1, central cyanosis or pallor 0. Score at 1 and 5 minutes.'),
      selectInput('pulse', 'Pulse', [
        { label: 'Absent (0)', value: 0, description: 'No heart rate' },
        { label: '<100 (1)', value: 1, description: 'Heart rate <100 bpm' },
        { label: '≥100 (2)', value: 2, description: 'Heart rate ≥100 bpm' },
      ], 2, 'Heart rate: absent 0, under 100/min 1, 100/min or above 2. Auscultate or palpate the cord/base of the cord.'),
      selectInput('grimace', 'Grimace (reflex)', [
        { label: 'None (0)', value: 0, description: 'No response to suction of the nares or sole tap' },
        { label: 'Grimace (1)', value: 1, description: 'Grimace only to suction/stimulation' },
        { label: 'Cry/cough/sneeze (2)', value: 2, description: 'Cry, cough, or sneeze to stimulation' },
      ], 2, 'Reflex irritability: response to suction of the nares (or a tap on the sole). Score at 1 and 5 minutes; repeat q5 min if <7.'),
      selectInput('activity', 'Activity (tone)', [
        { label: 'Limp (0)', value: 0, description: 'Flaccid; no muscle tone' },
        { label: 'Some flexion (1)', value: 1, description: 'Some flexion of extremities' },
        { label: 'Active motion (2)', value: 2, description: 'Active motion; well-flexed, resisting extension' },
      ], 1, 'Muscle tone: limp 0, some flexion of the limbs 1, active motion 2.'),
      selectInput('respiration', 'Respiration', [
        { label: 'Absent (0)', value: 0, description: 'No respiratory effort' },
        { label: 'Slow/irregular (1)', value: 1, description: 'Weak, slow, or irregular effort; weak cry' },
        { label: 'Good cry (2)', value: 2, description: 'Good, strong cry; regular effort' },
      ], 2, 'Respiratory effort: absent 0, slow or irregular/weak cry 1, good strong cry 2.'),
    ],
    calculate(values) {
      const score = num(values.appearance) + num(values.pulse) + num(values.grimace) + num(values.activity) + num(values.respiration);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'critical', label: 'Critically low', interpretation: '0–3: severely depressed newborn condition. This documents status and response; it does not determine whether to start resuscitation or which NRP steps to use. Continue/adjust resuscitation according to the NRP physiologic algorithm (heart rate, respirations, oxygenation), not the Apgar total. Resuscitation begins before the 1-minute score and should not wait for Apgar.' },
        { max: 6, level: 'high', label: 'Moderately abnormal', interpretation: '4–6: moderately abnormal transition. Document and reassess; do not use the total to dictate resuscitative steps. Continue/adjust care according to the NRP physiologic algorithm (heart rate, respirations, oxygenation).' },
        { max: 10, level: 'low', label: 'Reassuring', interpretation: '7–10: reassuring transition. Continue routine care if the infant is otherwise stable. Apgar still does not replace physiologic assessment.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'APGAR: Appearance, Pulse, Grimace, Activity, Respiration (0–2 each). Appropriate for documenting neonatal condition and response to resuscitation — not for deciding whether to initiate or how to conduct NRP.',
      validation: 'Virginia Apgar 1953; AAP/ACOG 2015 statement: do not use Apgar to dictate resuscitation; repeat every 5 minutes to 20 minutes if the 5-minute score is <7.',
      references: [
        { title: 'A proposal for a new method of evaluation of the newborn infant', citation: 'Apgar V. Curr Res Anesth Analg. 1953', year: 1953, pmid: '13083014' },
        { title: 'The Apgar Score', citation: 'AAP Committee on Fetus and Newborn / ACOG Committee on Obstetric Practice. Pediatrics. 2015;136:819-822', year: 2015, pmid: '26416932', doi: '10.1542/peds.2015-2651' },
      ],
    },
    nextSteps: [
      { condition: 'Any score', actions: ['Continue/adjust resuscitation according to the NRP physiologic algorithm (heart rate, respirations, oxygenation), not the Apgar total', 'Do not delay or stop resuscitation to assign the 1-minute score'] },
      { condition: 'Score <7 at 5 min', actions: ['Repeat Apgar every 5 minutes through 20 minutes', 'Investigate etiology of delayed transition'] },
    ],
    pearls: [
      'Resuscitation begins before the 1-minute Apgar and is guided by heart rate, respirations, and oxygenation — not the total score.',
      'A 5-minute score <7 is a reason to repeat scoring at 5-minute intervals to 20 minutes, not a trigger that determines NRP steps.',
    ],
  },
  {
    id: 'bishop',
    name: 'Bishop Score',
    shortName: 'Bishop',
    description: 'Cervical favorability for induction of labor.',
    category: 'obstetrics',
    tags: ['labor', 'induction', 'cervix'],
    whenToUse: 'Before labor induction to predict success.',
    whyUse: 'Low score may benefit from cervical ripening.',
    inputs: [
      selectInput('dilation', 'Dilation (cm)', [
        { label: 'Closed (0)', value: 0, description: 'Os closed on digital exam' },
        { label: '1–2 (1)', value: 1, description: 'Cervical dilation 1–2 cm' },
        { label: '3–4 (2)', value: 2, description: 'Cervical dilation 3–4 cm' },
        { label: '≥5 (3)', value: 3, description: 'Cervical dilation ≥5 cm' },
      ], 2, 'Digital exam of the internal os, in centimetres.'),
      selectInput('effacement', 'Effacement %', [
        { label: '0–30 (0)', value: 0, description: 'Cervix uneffaced or ≤30% shortened' },
        { label: '40–50 (1)', value: 1, description: 'Approximately 40–50% effaced' },
        { label: '60–70 (2)', value: 2, description: 'Approximately 60–70% effaced' },
        { label: '≥80 (3)', value: 3, description: '≥80% effaced (paper-thin cervix)' },
      ], 3, 'Effacement = percent shortening of cervical length vs uneffaced (~3–4 cm).'),
      selectInput('station', 'Station', [
        { label: '−3 (0)', value: 0 },
        { label: '−2 (1)', value: 1 },
        { label: '−1 / 0 (2)', value: 2 },
        { label: '+1 / +2 (3)', value: 3 },
      ], 2, 'Station = cm relative to the ischial spines (original Bishop, not the modified −5…+5 ACOG scale).'),
      selectInput('consistency', 'Consistency', [
        { label: 'Firm (0)', value: 0, description: 'Cervix ≈ nasal tip' },
        { label: 'Medium (1)', value: 1, description: 'Cervix ≈ chin' },
        { label: 'Soft (2)', value: 2, description: 'Cervix ≈ lips' },
      ], 2, 'Firm ≈ nasal tip, medium ≈ chin, soft ≈ lips.'),
      selectInput('position', 'Position', [
        { label: 'Posterior (0)', value: 0, description: 'Cervical os posterior in the vagina' },
        { label: 'Mid (1)', value: 1, description: 'Cervical os mid-position' },
        { label: 'Anterior (2)', value: 2, description: 'Cervical os anterior' },
      ], 2, 'Position of the cervical os in the vagina — posterior / mid-position / anterior.'),
    ],
    calculate(values) {
      const score = num(values.dilation) + num(values.effacement) + num(values.station) + num(values.consistency) + num(values.position);
      const r = riskFromThresholds(score, [
        { max: 6, level: 'moderate', label: 'Unfavorable cervix', interpretation: 'Bishop ≤6: unfavorable — consider cervical ripening before oxytocin induction.' },
        { max: 8, level: 'moderate', label: 'Intermediate cervix', interpretation: 'Bishop 7–8: intermediate favorability — assess the induction plan and need for ripening per protocol.' },
        { max: 13, level: 'low', label: 'Favorable cervix', interpretation: 'Bishop >8: favorable and comparable to a spontaneous-labor cervix for induction success.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Bishop score 0–13 from dilation, effacement, station, consistency, position.',
      validation: 'Classic obstetric tool for induction success prediction.',
      references: [{ title: 'Pelvic scoring for elective induction', citation: 'Bishop EH. Obstet Gynecol. 1964', year: 1964, pmid: '14199536' }],
    },
    nextSteps: [
      { condition: 'Unfavorable', actions: ['Mechanical or prostaglandin ripening per protocol'] },
      { condition: 'Intermediate', actions: ['Assess cervical favorability', 'Consider ripening or induction plan per protocol'] },
      { condition: 'Favorable', actions: ['Oxytocin induction as indicated'] },
    ],
  },
  {
    id: 'gestational-age',
    name: 'Gestational Age & Naegele Due Date',
    shortName: 'Due Date',
    description: 'Estimates gestational age and EDD from LMP.',
    category: 'obstetrics',
    tags: ['pregnancy', 'edd', 'lmp'],
    status: 'superseded',
    supersededBy: 'pregnancy-dating',
    whenToUse: 'Dating pregnancy when LMP is known and reliable. First-trimester ultrasound is preferred when LMP is uncertain or cycles are irregular.',
    whyUse: 'Naegele’s rule standard LMP-based estimate, assuming a reliable LMP and an approximately 28-day cycle.',
    inputs: [
      numberInput('lmpYear', 'LMP year', { min: 2020, max: 2030, exampleValue: 2026, helpText: 'Calendar year of the first day of the last menstrual period; the calculation assumes a reliably recalled LMP.' }),
      numberInput('lmpMonth', 'LMP month', { min: 1, max: 12, exampleValue: 1, helpText: 'Calendar month (1–12) of the first day of the LMP.' }),
      numberInput('lmpDay', 'LMP day', { min: 1, max: 31, exampleValue: 1, helpText: 'First day of the last menstrual period (not last day of bleeding).' }),
      numberInput('refYear', 'Reference year (today)', { min: 2020, max: 2030, exampleValue: 2026, helpText: 'Year of the reference date (today) used to derive the current gestational age.' }),
      numberInput('refMonth', 'Reference month', { min: 1, max: 12, exampleValue: 7, helpText: 'Month (1–12) of the reference date used for gestational age.' }),
      numberInput('refDay', 'Reference day', { min: 1, max: 31, exampleValue: 23, helpText: 'Day of month (1–31) of the reference date; the day count from LMP sets weeks plus days.' }),
    ],
    calculate(values) {
      const ly = num(values.lmpYear);
      const lm = num(values.lmpMonth);
      const ld = num(values.lmpDay);
      const ry = num(values.refYear);
      const rm = num(values.refMonth);
      const rd = num(values.refDay);

      const lmp = new Date(ly, lm - 1, ld);
      const ref = new Date(ry, rm - 1, rd);

      const validLmp = lmp.getFullYear() === ly && lmp.getMonth() === lm - 1 && lmp.getDate() === ld;
      const validRef = ref.getFullYear() === ry && ref.getMonth() === rm - 1 && ref.getDate() === rd;

      if (!validLmp || !validRef) {
        return {
          score: '—',
          label: 'Invalid date entered',
          interpretation: 'Please check the entered dates (day of month is invalid for the specified month/year).',
          riskLevel: 'info' as const,
        };
      }

      const days = Math.round((ref.getTime() - lmp.getTime()) / 86400000);
      if (days < 0) {
        return {
          score: '—',
          label: 'Reference date precedes LMP',
          interpretation: 'Reference date cannot be earlier than the first day of the last menstrual period (LMP).',
          riskLevel: 'info' as const,
        };
      }
      const weeks = Math.floor(days / 7);
      const rem = days % 7;
      const edd = new Date(lmp);
      edd.setDate(edd.getDate() + 280);
      const y = edd.getFullYear();
      const m = String(edd.getMonth() + 1).padStart(2, '0');
      const d = String(edd.getDate()).padStart(2, '0');
      const eddStr = `${y}-${m}-${d}`;
      return {
        score: `${weeks}+${rem}`,
        label: 'Gestational age',
        interpretation: `Approximately ${weeks} weeks + ${rem} days. EDD (Naegele): ${eddStr}. Assumes a reliable LMP and ~28-day cycles; a different cycle length shifts the LMP-based estimate. Confirm with first-trimester ultrasound when dating is uncertain.`,
        riskLevel: 'info',
        details: [
          { label: 'Days since LMP', value: String(days) },
          { label: 'EDD', value: eddStr },
        ],
      };
    },
    evidence: {
      summary: 'EDD = LMP + 280 days (Naegele: +1 year −3 months +7 days). Usual assumptions: reliable LMP and an approximately regular 28-day cycle. Cycle length different from 28 days shifts the LMP-based estimate. First-trimester ultrasound is more accurate if LMP is uncertain.',
      validation: 'Standard obstetric dating; first-trimester US more accurate if LMP uncertain or cycles irregular.',
      references: [{ title: 'Naegele\'s rule and the length of pregnancy - A review', citation: 'Lawson GW. Aust N Z J Obstet Gynaecol. 2021 (review of Naegele\'s rule)', year: 2021, pmid: '33079400',
          doi: '10.1111/ajo.13253', }],
    },
    nextSteps: [{ condition: 'Dating', actions: ['Offer dating ultrasound if uncertain LMP', 'Prenatal care schedule'] }],
    pearls: [
      'Naegele dating assumes a reliable LMP and approximately 28-day cycles.',
      'Prioritize first-trimester ultrasound when LMP is uncertain or cycles are irregular.',
    ],
  },
  {
    id: 'pgcs',
    name: 'Pediatric GCS',
    shortName: 'Pediatric GCS',
    description: 'Glasgow Coma Scale adapted for pre-verbal children.',
    category: 'pediatrics',
    tags: ['gcs', 'pediatric', 'trauma'],
    whenToUse: 'Altered consciousness in infants/young children.',
    whyUse: 'Verbal component modified for developmental stage.',
    inputs: [
      selectInput(
        'eye',
        'Eye opening',
        [
          { label: '4 — Spontaneous', value: 4, description: 'Opens eyes without stimulation (infant or child)' },
          { label: '3 — To sound', value: 3, description: 'Opens to voice or other sound (Teasdale 2014; formerly “to speech”)' },
          { label: '2 — To pressure', value: 2, description: 'Opens to fingertip pressure, trapezius pinch, or supraorbital notch' },
          { label: '1 — None', value: 1, description: 'No eye opening. If lids are swollen shut, record C / NT — do not assign 1 for the swelling' },
        ],
        4,
        'Same sequence as adult GCS 2014: spontaneous → sound → pressure. If eyes are closed by swelling, record C (or NT); do not silently score 1.',
      ),
      selectInput(
        'verbal',
        'Verbal (pediatric)',
        [
          { label: '5 — Coos/babbles / oriented', value: 5, description: 'Infant (preverbal / <2 y): coos or babbles. Child: oriented to name, place, and month' },
          { label: '4 — Irritable cry / confused', value: 4, description: 'Infant: irritable / consolable cry. Child: confused conversation or sentences' },
          { label: '3 — Cries to pain / inappropriate', value: 3, description: 'Infant: cries to pain. Child: inappropriate words' },
          { label: '2 — Moans to pain / incomprehensible', value: 2, description: 'Infant: moans to pain. Child: incomprehensible sounds' },
          { label: '1 — None', value: 1, description: 'No verbal response. If intubated, record VT — do not assign 1 solely for the tube' },
        ],
        5,
        'Use infant descriptors if preverbal / <2 years; use child descriptors once the child talks. Oriented = name, place, month. Endotracheal tube or tracheostomy = record VT; do not assign 1 for the tube.',
      ),
      selectInput(
        'motor',
        'Motor',
        [
          { label: '6 — Normal spontaneous / obeys', value: 6, description: 'Infant: normal spontaneous movements. Child: obeys a two-part command' },
          { label: '5 — Withdraws to touch / localizes', value: 5, description: 'Infant: withdraws to touch (not localization). Child: localizes — hand above the clavicle toward trapezius / supraorbital stimulus' },
          { label: '4 — Withdraws to pain', value: 4, description: 'Normal flexion / withdrawal at the elbow away from a fingernail-bed stimulus' },
          { label: '3 — Flexion to pain', value: 3, description: 'Abnormal / stereotyped flexion (decorticate)' },
          { label: '2 — Extension to pain', value: 2, description: 'Extension at the elbow (decerebrate)' },
          { label: '1 — None', value: 1, description: 'No motor response in the best arm' },
        ],
        6,
        'Infant motor 6 = normal spontaneous movement; infant 5 = withdraws to touch (not localization). Child 6 = two-part command; child 5 = localizes (hand above clavicle). Trapezius / supraorbital for localization; fingernail-bed for flexion vs extension. Score the best arm.',
      ),
    ],
    calculate(values) {
      const score = num(values.eye) + num(values.verbal) + num(values.motor);
      const r = riskFromThresholds(score, [
        { max: 8, level: 'critical', label: 'Severe', interpretation: '≤8: severe — airway protection and urgent workup.' },
        { max: 12, level: 'high', label: 'Moderate', interpretation: '9–12: moderate impairment.' },
        { max: 15, level: 'low', label: 'Mild', interpretation: '13–15: mild or normal.' },
      ]);
      return { score, ...r, details: [{ label: 'E/V/M', value: `${values.eye}/${values.verbal}/${values.motor}` }] };
    },
    evidence: {
      summary: 'Pediatric GCS modifies verbal responses for infants while retaining E+V+M structure.',
      validation: 'Used in pediatric trauma systems.',
      references: [{ title: 'Assessing the conscious level in infants and young children: a paediatric version of the GCS', citation: 'Reilly PL et al. Childs Nerv Syst. 1988', year: 1988, pmid: '3135935',
          doi: '10.1007/BF00274080', }],
    },
    nextSteps: [{ condition: 'Low GCS', actions: ['NRP/PALS as indicated', 'CT if trauma/concern for ICH'] }],
    pearls: [
      'Pick the infant column if preverbal / <2 y and the child column once the child talks.',
      'Infant motor 5 is withdraws-to-touch, not localization. Child 5 is hand above the clavicle.',
      'Intubated verbal = VT. Eyes closed by swelling = C / NT. Do not silently assign 1.',
    ],
  },
  {
    id: 'westley-croup',
    name: 'Westley Croup Score',
    shortName: 'Westley Croup',
    description: 'Severity of croup based on clinical signs.',
    category: 'pediatrics',
    tags: ['croup', 'stridor', 'pediatrics'],
    whenToUse: 'Children with croup to guide treatment intensity.',
    whyUse: 'Standard severity tool in croup studies (dexamethasone/epinephrine).',
    inputs: [
      selectInput('stridor', 'Stridor', [
        { label: 'None (0)', value: 0, description: 'No audible inspiratory stridor at rest or with agitation' },
        { label: 'With agitation (1)', value: 1, description: 'Inspiratory stridor only when crying or agitated; none when calm' },
        { label: 'At rest (2)', value: 2, description: 'Audible inspiratory stridor while the child is calm' },
      ], 1, 'Listen without a stethoscope. Agitation = crying or being examined; rest = calm, including sleep.'),
      selectInput('retract', 'Retractions', [
        { label: 'None (0)', value: 0, description: 'No retractions' },
        { label: 'Mild (1)', value: 1, description: 'Slight intercostal retractions' },
        { label: 'Moderate (2)', value: 2, description: 'Intercostal + subcostal ± tracheal tug' },
        { label: 'Severe (3)', value: 3, description: 'Accessory muscles, nasal flaring, or abdominal paradox' },
      ], 1, 'Chest-wall retractions: none 0, mild 1, moderate 2, severe 3 points — the heaviest weighted sign in the score.'),
      selectInput('airEntry', 'Air entry', [
        { label: 'Normal (0)', value: 0, description: 'Normal breath sounds' },
        { label: 'Decreased (1)', value: 1, description: 'Reduced but audible air entry' },
        { label: 'Markedly decreased (2)', value: 2, description: 'Barely audible / silent chest' },
      ], 1, 'Air entry on auscultation: normal 0, decreased 1, markedly decreased 2 points.'),
      selectInput('cyanosis', 'Cyanosis', [
        { label: 'None (0)', value: 0, description: 'No central cyanosis; lips and tongue pink at rest and with agitation' },
        { label: 'With agitation (4)', value: 4, description: 'Central cyanosis (lips/tongue) only when crying or agitated' },
        { label: 'At rest (5)', value: 5, description: 'Central cyanosis while the child is calm' },
      ], 0, 'Central cyanosis of lips/tongue — not isolated acrocyanosis. Agitation vs rest as for stridor.'),
      selectInput('consciousness', 'Level of consciousness', [
        { label: 'Normal, including sleep (0)', value: 0, description: 'Asleep but rousable is 0' },
        { label: 'Disoriented (5)', value: 5, description: 'Westley LOC is disoriented, not merely sleepy' },
      ], 0, 'Asleep but rousable is scored 0. Do not score a sleeping child 5.'),
    ],
    calculate(values) {
      const score = num(values.stridor) + num(values.retract) + num(values.airEntry) + num(values.cyanosis) + num(values.consciousness);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Mild', interpretation: 'Mild croup — outpatient dexamethasone often sufficient.' },
        { max: 5, level: 'moderate', label: 'Moderate', interpretation: 'Moderate — dexamethasone; observe; consider nebulized epinephrine.' },
        { max: 11, level: 'high', label: 'Severe', interpretation: 'Severe — nebulized epinephrine, dexamethasone, close airway monitoring.' },
        { max: 17, level: 'critical', label: 'Impending respiratory failure', interpretation: 'Score ≥12 flags impending respiratory failure — immediate senior/airway help, nebulized epinephrine, dexamethasone, and ICU-level monitoring.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Westley score 0–17 used in croup research and clinical severity grading.',
      validation: 'Standard in pediatric emergency literature.',
      references: [{ title: 'Nebulized racemic epinephrine by IPPB for the treatment of croup: a double-blind study', citation: 'Westley CR et al. Am J Dis Child. 1978', year: 1978, pmid: '347921',
          doi: '10.1001/archpedi.1978.02120300044008', }],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['Dexamethasone 0.15–0.6 mg/kg', 'Supportive care'] },
      { condition: 'Moderate–severe', actions: ['Dexamethasone', 'Nebulized epinephrine', 'Observe for rebound', 'Airway preparedness'] },
      { condition: 'Impending respiratory failure (≥12)', actions: ['Escalate to senior/airway team immediately', 'Nebulized epinephrine + dexamethasone', 'Prepare for definitive airway / ICU admission'] },
    ],
  },
  {
    id: 'pecarn-head',
    name: 'PECARN Head Injury',
    shortName: 'PECARN',
    description: 'Age-specific PECARN rule for CT after pediatric blunt head trauma.',
    category: 'pediatrics',
    tags: ['head injury', 'ct', 'pecarn'],
    whenToUse: 'Children with blunt head trauma. Very-low-risk derivation enrolled GCS 14–15 within 24 h (excluding trivial injury). GCS ≤13 is outside that clearance path and must not be labeled very low risk.',
    whyUse: 'Identifies children at very low risk for clinically important TBI who may avoid CT; GCS ≤13 or AMS is never very-low-risk.',
    inputs: [
      selectInput('ageGroup', 'Age group', [
        { label: '<2 years', value: 'young' },
        { label: '≥2 years', value: 'old' },
      ], 'old', 'Use the <2 y or ≥2 y predictor set. Exclude trivial injury (ground-level fall or running into a stationary object with no signs besides a scalp abrasion/laceration).'),
      selectInput('gcs', 'GCS', [
        { label: '15', value: '15' },
        { label: '14', value: '14', points: 2 },
        { label: '≤13', value: 'le13', points: 2 },
      ], '15', 'PECARN AMS includes GCS <15. Derivation was GCS 14–15; GCS ≤13 is high risk (CT recommended) and never very low risk.'),
      yesNo('ams', 'Other signs of altered mental status', 2,
        'Agitation, somnolence, repetitive questioning, or slow response to verbal communication (independent of the GCS band).', false),
      yesNo('palpable', 'Age-appropriate skull-fracture signs', 2,
        '<2 y: palpable skull fracture. ≥2 y: signs of basilar skull fracture — hemotympanum, raccoon eyes, Battle sign, CSF oto/rhinorrhea.', false),
      yesNo('severeMechanism', 'Severe mechanism of injury', 1,
        'Applies to BOTH age groups: MVC with ejection, rollover, or death of another passenger; pedestrian or bicyclist without helmet struck by a motor vehicle; fall >3 ft (<2 y) or >5 ft (≥2 y); head struck by a high-impact object.', false),
      yesNo('loc', 'Loss of consciousness (age-specific)', 1,
        '<2 y: LOC ≥5 seconds. ≥2 y: any LOC. Do not use this box for isolated severe mechanism.', false),
      yesNo('hematoma', 'Non-frontal scalp hematoma (<2 y)', 1,
        '<2 y only: occipital, parietal, or temporal scalp hematoma (not isolated frontal). Not a ≥2 y PECARN predictor.', false),
      yesNo('notActing', 'Not acting normally per parent (<2 y)', 1,
        '<2 y only: caregiver reports the child is not acting normally. Not a ≥2 y PECARN predictor.', false),
      yesNo('vomiting', 'History of vomiting (≥2 y)', 1,
        '≥2 y only. Not an independent <2 y PECARN predictor.', true),
      yesNo('severeHA', 'Severe headache (≥2 y)', 1,
        '≥2 y only. Not an independent <2 y PECARN predictor.', false),
    ],
    calculate(values) {
      const ageGroup = String(values.ageGroup ?? 'young');
      const young = ageGroup === 'young';
      const ageLabel = young ? '<2 years' : '≥2 years';
      const gcsVal = String(values.gcs ?? '15');
      const gcs15 = gcsVal === '15';
      const gcsLe13 = gcsVal === 'le13' || gcsVal === '<=13' || gcsVal === '13';
      const gcsLabel = gcsLe13 ? '≤13' : gcsVal === '14' ? '14' : '15';
      const ams = bool(values.ams);
      const fracture = bool(values.palpable);
      const severeMechanism = bool(values.severeMechanism);
      const loc = bool(values.loc);
      const hematoma = bool(values.hematoma);
      const notActing = bool(values.notActing);
      const vomiting = bool(values.vomiting);
      const severeHA = bool(values.severeHA);

      const abnormalMentation = !gcs15 || ams;
      const highRisk = abnormalMentation || fracture;
      const intermediate = young
        ? severeMechanism || loc || hematoma || notActing
        : severeMechanism || loc || vomiting || severeHA;

      const details = [
        { label: 'Age group', value: ageLabel },
        { label: 'GCS', value: gcsLabel },
        { label: 'Other AMS', value: ams ? 'Yes' : 'No' },
        { label: young ? 'Palpable skull fracture' : 'Basilar skull-fracture signs', value: fracture ? 'Yes' : 'No' },
        { label: 'Severe mechanism', value: severeMechanism ? 'Yes' : 'No' },
        { label: young ? 'LOC ≥5 s' : 'Any LOC', value: loc ? 'Yes' : 'No' },
        { label: 'Non-frontal hematoma (<2 y)', value: hematoma ? (young ? 'Yes' : 'Yes (not a ≥2 y predictor)') : 'No' },
        { label: 'Not acting normally per parent (<2 y)', value: notActing ? (young ? 'Yes' : 'Yes (not a ≥2 y predictor)') : 'No' },
        { label: 'Vomiting (≥2 y)', value: vomiting ? (young ? 'Yes (not a <2 y predictor)' : 'Yes') : 'No' },
        { label: 'Severe headache (≥2 y)', value: severeHA ? (young ? 'Yes (not a <2 y predictor)' : 'Yes') : 'No' },
      ];

      if (highRisk) {
        return {
          score: 2,
          label: 'Higher risk — CT recommended',
          interpretation: gcsLe13
            ? `${ageLabel}: GCS ≤13 is outside the PECARN very-low-risk derivation (GCS 14–15) and is treated as high risk — CT recommended.`
            : `${ageLabel}: GCS <15, other AMS, or age-appropriate fracture signs — CT generally recommended per PECARN high-risk branch.`,
          riskLevel: 'high',
          details,
          recommendations: ['CT head', 'Neurosurgery if positive'],
          alerts: gcsLe13
            ? ['GCS ≤13 is not a PECARN very-low-risk clearance path; do not defer CT solely on other negative boxes.']
            : undefined,
        };
      }
      if (intermediate) {
        return {
          score: 1,
          label: 'Intermediate — observation vs CT',
          interpretation: `${ageLabel}: Intermediate PECARN predictor(s) present (including severe mechanism when selected) — observation vs CT with shared decision-making.`,
          riskLevel: 'moderate',
          details,
          recommendations: ['Observation vs CT (shared decision-making)', 'Return precautions if observed without CT'],
        };
      }
      return {
        score: 0,
        label: 'Very low risk — CT not routinely recommended',
        interpretation: `${ageLabel}: GCS 15, no AMS, no fracture signs, and no age-specific intermediate predictors — ciTBI risk very low; CT not routinely recommended.`,
        riskLevel: 'low',
        details,
        recommendations: ['No routine CT', 'Return precautions'],
      };
    },
    evidence: {
      summary: 'PECARN rules for children <2 and ≥2 years identify very low risk of clinically important TBI (ciTBI) only when GCS is 15, AMS is absent, and no age-specific predictors are present. NPV is very high in that group.',
      formula: 'High risk (CT recommended): GCS ≤13, GCS 14, other AMS, or age-appropriate fracture signs (palpable skull fracture if <2 y; basilar signs if ≥2 y). Intermediate (observation vs CT): remaining age-specific predictors — both ages: severe mechanism; <2 y: LOC ≥5 s, non-frontal hematoma, not acting normally per parent; ≥2 y: any LOC, vomiting, severe headache. Very low risk only if GCS 15 AND no AMS AND no predictors. GCS ≤13 never very low risk.',
      validation: 'Large multicenter PECARN cohort (Kuppermann Lancet 2009); widely adopted in pediatric EM. Derivation/validation enrolled GCS 14–15.',
      references: [{ title: 'Identification of children at very low risk of ciTBI', citation: 'Kuppermann N et al. Lancet. 2009', year: 2009, pmid: '19758692',
          doi: '10.1016/S0140-6736(09)61558-0', }],
    },
    nextSteps: [
      { condition: 'Very low risk', actions: ['No routine CT', 'Return precautions'] },
      { condition: 'Intermediate', actions: ['Observation vs CT (shared decision-making)'] },
      { condition: 'Higher risk', actions: ['CT head', 'Neurosurgery if positive'] },
    ],
    pearls: [
      'AMS in PECARN includes GCS <15 plus agitation, somnolence, repetitive questioning, or slow response.',
      'Severe mechanism is an intermediate predictor in both age groups — isolated fall >3 ft in <2 y is not very low risk.',
      'Do not apply infant-only predictors (non-frontal hematoma, not acting normally) to ≥2 y, or vomiting/severe headache to <2 y.',
    ],
  },
  {
    id: 'wells-hit',
    name: '4Ts Score for HIT (not Wells)',
    shortName: '4Ts HIT',
    description: '4Ts pretest probability of heparin-induced thrombocytopenia (Thrombocytopenia, Timing, Thrombosis, oTher causes). This is the Lo 4Ts instrument, not a Wells PE/DVT score.',
    category: 'hematology',
    tags: ['hit', 'heparin', 'thrombocytopenia'],
    whenToUse: 'Thrombocytopenia in patients receiving heparin.',
    whyUse: 'Guides whether to order HIT antibody testing and stop heparin.',
    inputs: [
      selectInput('thrombocytopenia', 'Thrombocytopenia', [
        { label: 'Platelet fall >50% and nadir ≥20 (2)', value: 2, description: 'Platelets fell >50% from the post-heparin peak and nadir is still ≥20 ×10⁹/L' },
        { label: 'Fall 30–50% or nadir 10–19 (1)', value: 1, description: 'Fall 30–50% from peak, or nadir 10–19 ×10⁹/L' },
        { label: 'Fall <30% or nadir <10 (0)', value: 0, description: 'Fall <30% from peak, or nadir <10 ×10⁹/L (typical of other causes)' },
      ], 2, 'Percent fall = (post-heparin peak − nadir) / peak. Nadir is the lowest platelet count. Score the worse of % fall vs nadir band.'),
      selectInput('timing', 'Timing of platelet fall', [
        { label: 'Clear day 5–10 or ≤1 day with prior heparin ≤30d (2)', value: 2, description: 'Clear onset between days 5–10, or fall ≤1 day if heparin exposure within the prior 30 days' },
        { label: 'Consistent but not clear / >10d / ≤1d with heparin 30–100d (1)', value: 1, description: 'Timing consistent with HIT but not clear (e.g. missing counts), onset after day 10, or ≤1 day with heparin 30–100 days prior' },
        { label: 'Fall ≤4d without recent heparin (0)', value: 0, description: 'Fall on days 0–4 with no heparin in the prior 100 days' },
      ], 2, 'Day 0 = the day heparin was started.'),
      selectInput('thrombosis', 'Thrombosis or other sequelae', [
        { label: 'New thrombosis / skin necrosis / acute systemic reaction (2)', value: 2, description: 'New confirmed thrombosis, skin necrosis, or acute systemic reaction after IV UFH bolus (fever, chills, HTN, tachycardia, dyspnea)' },
        { label: 'Progressive/recurrent thrombosis / suspected (1)', value: 1, description: 'Progressive or recurrent thrombosis, non-necrotizing skin lesions, or suspected unproven thrombosis' },
        { label: 'None (0)', value: 0, description: 'No new or progressive thrombosis, no skin necrosis, no acute systemic reaction after IV heparin bolus' },
      ], 0, '2 = new confirmed thrombosis, skin necrosis, or acute systemic reaction after IV UFH bolus (not any fever). 1 = progressive/recurrent thrombosis, non-necrotizing skin lesions, or suspected unproven thrombosis.'),
      selectInput('other', 'Other causes of thrombocytopenia', [
        { label: 'None apparent (2)', value: 2, description: 'No alternative explanation for the platelet fall' },
        { label: 'Possible (1)', value: 1, description: 'Competing cause plausible but not definite' },
        { label: 'Definite (0)', value: 0, description: 'e.g. surgery/IABP/CVVH within 72 h, confirmed bacteremia/DIC, chemotherapy, or another drug known to drop platelets' },
      ], 1, 'Definite (0): surgery/IABP/CVVH within 72 h, confirmed bacteremia/DIC, chemotherapy, or another drug known to drop platelets. Possible (1): competing cause plausible. None apparent (2): no alternative.'),
    ],
    calculate(values) {
      const score = num(values.thrombocytopenia) + num(values.timing) + num(values.thrombosis) + num(values.other);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'low', label: 'Low probability (0–3)', interpretation: 'HIT unlikely. Continue heparin if indicated; testing often not needed.' },
        { max: 5, level: 'moderate', label: 'Intermediate (4–5)', interpretation: 'Intermediate probability — stop heparin, start alternative anticoagulant, send HIT assays.' },
        { max: 8, level: 'high', label: 'High (6–8)', interpretation: 'High probability — stop all heparin, non-heparin anticoagulant, send immunoassay ± SRA.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: '4Ts: Thrombocytopenia, Timing, Thrombosis, oTher causes (0–2 each).',
      validation: 'High NPV for low scores; intermediate/high need laboratory evaluation.',
      references: [{ title: 'Evaluation of pretest clinical score (4 T\'s) for the diagnosis of heparin-induced thrombocytopenia in two clinical settings', citation: 'Lo GK et al. J Thromb Haemost. 2006', year: 2006, pmid: '16634744',
          doi: '10.1111/j.1538-7836.2006.01787.x', }],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Discontinue heparin/LMWH', 'Start argatroban/bivalirudin/fondaparinux per setting', 'HIT Ab ELISA ± functional assay'] },
    ],
    pearls: [
      'The URL/id slug wells-hit is historical only; the live instrument is the 4Ts score (Lo et al.), not Wells PE or DVT.',
    ],
  },
  {
    id: 'padua',
    name: 'Padua Prediction Score (VTE Risk)',
    shortName: 'Padua',
    description: 'Medical inpatient VTE risk to guide prophylaxis.',
    category: 'hematology',
    tags: ['vte', 'prophylaxis', 'dvt'],
    whenToUse: 'Hospitalized medical patients for VTE prophylaxis decisions.',
    whyUse: 'Identifies high-risk medical inpatients (≥4).',
    inputs: [
      yesNo('cancer', 'Active cancer', 3,
        'Local or distant metastases and/or chemotherapy or radiotherapy in the previous 6 months.', false),
      yesNo('priorVte', 'Previous VTE (excluding superficial)', 3,
        'Prior DVT or PE, not superficial thrombophlebitis.', false),
      yesNo('reducedMob', 'Reduced mobility', 3,
        'Anticipated bed rest with bathroom privileges (limitation or order) for at least 3 days.', true),
      yesNo('thrombophilia', 'Known thrombophilic condition', 3,
        'Antithrombin, protein C or S deficiency, factor V Leiden, prothrombin G20210A, or antiphospholipid syndrome.', false),
      yesNo('recentTrauma', 'Recent trauma and/or surgery (≤1 month)', 2, 'Recent trauma and/or surgery within 1 month scores 2 points.', false),
      yesNo('age70', 'Age ≥ 70', 1, 'Age 70 years or older scores 1 point. Total ≥4 marks high VTE risk and usually warrants prophylaxis.', true),
      yesNo('heartLung', 'Heart and/or respiratory failure', 1,
        'Acute or decompensated heart failure and/or respiratory failure this admission.', true),
      yesNo('acuteMiStroke', 'Acute MI or ischemic stroke', 1,
        'This admission: acute myocardial infarction or ischemic stroke.', false),
      yesNo('infectionRheum', 'Acute infection and/or rheumatologic disorder', 1,
        'Acute infection (any site) and/or active rheumatologic disease this admission.', true),
      yesNo('obesity', 'Obesity (BMI ≥30)', 1, 'BMI 30 kg/m² or higher scores 1 point.', false),
      yesNo('hormone', 'Ongoing hormonal treatment', 1,
        'Ongoing estrogen (OCP, HRT) or similar hormonal therapy.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.cancer) ? 3 : 0) +
        (bool(values.priorVte) ? 3 : 0) +
        (bool(values.reducedMob) ? 3 : 0) +
        (bool(values.thrombophilia) ? 3 : 0) +
        (bool(values.recentTrauma) ? 2 : 0) +
        (bool(values.age70) ? 1 : 0) +
        (bool(values.heartLung) ? 1 : 0) +
        (bool(values.acuteMiStroke) ? 1 : 0) +
        (bool(values.infectionRheum) ? 1 : 0) +
        (bool(values.obesity) ? 1 : 0) +
        (bool(values.hormone) ? 1 : 0);
      if (score >= 4) {
        return {
          score,
          label: 'High VTE risk',
          interpretation: 'Padua ≥4: high risk — pharmacologic prophylaxis recommended unless high bleed risk.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Low VTE risk',
        interpretation: 'Padua <4: low risk — pharmacologic prophylaxis generally not required; early mobility.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'Padua score ≥4 identifies medical inpatients who benefit from prophylaxis.',
      validation: 'Prospective validation in medical wards.',
      references: [{ title: 'A risk assessment model for identification of hospitalized medical patients at risk for VTE', citation: 'Barbar S et al. J Thromb Haemost. 2010', year: 2010, pmid: '20738765',
          doi: '10.1111/j.1538-7836.2010.04044.x', }],
    },
    nextSteps: [
      { condition: '≥4', actions: ['LMWH/heparin prophylaxis if bleed risk acceptable', 'Mechanical prophylaxis if bleeding'] },
    ],
  },
  {
    id: 'caprini',
    name: 'Caprini Score (VTE Risk)',
    shortName: 'Caprini',
    description: 'Caprini RAM for perioperative VTE risk and prophylaxis intensity.',
    category: 'hematology',
    tags: ['vte', 'surgery', 'prophylaxis'],
    sourceVersion: 'Caprini 2005 RAM',
    whenToUse: 'Perioperative VTE risk assessment (surgical and overlapping medical risk factors on the Caprini RAM).',
    whyUse: 'Widely used in surgical pathways for prophylaxis intensity; total is the sum of published weighted items.',
    inputs: [
      yesNo('age41', 'Age 41–60 (1)', 1, 'Age 41–60 years scores 1 point. The age bands are mutually exclusive: use the highest band that applies to the patient.', false),
      yesNo('age61', 'Age 61–74 (2)', 2, 'Age 61–74 years scores 2 points (replaces the 1-point band).', true),
      yesNo('age75', 'Age ≥75 (3)', 3, 'Age 75 years or older scores 3 points (replaces the lower age bands).', false),
      yesNo('minorSurg', 'Minor surgery (1)', 1,
        'Surgery <45 min. For one operation, select only the single applicable surgery category (minor, major open >45 min, arthroscopic, or laparoscopic >45 min); do not stack categories for the same case.', false),
      yesNo('majorSurg', 'Major open surgery >45 min (2)', 2,
        'For one operation, select only the single applicable surgery category; do not also select minor, arthroscopic, or laparoscopic surgery for the same case.', true),
      yesNo('arthroscopic', 'Arthroscopic surgery (2)', 2,
        'The 2005 Caprini RAM assigns arthroscopic surgery 2 points. For one operation, select only this surgery category, not another surgery-duration/type category.', false),
      yesNo('laparoscopic', 'Laparoscopic surgery >45 min (2)', 2,
        'The 2005 Caprini RAM assigns laparoscopic surgery lasting >45 minutes 2 points. For one operation, select only this surgery category, not another surgery-duration/type category.', false),
      yesNo('bmi25', 'BMI ≥25 (1)', 1, 'BMI 25 kg/m² or higher scores 1 point — the Caprini threshold is 25, not the 30 used by some other VTE RAMs.', true),
      yesNo('swollenLegs', 'Swollen legs (1)', 1, 'Current leg swelling scores 1 point; a chronic venous or lymphedema baseline still counts as present.', false),
      yesNo('varicose', 'Varicose veins (1)', 1, 'Varicose veins score 1 point, whether or not they are symptomatic.', false),
      yesNo('pregnancy', 'Pregnancy/postpartum (1)', 1,
        'Currently pregnant or postpartum <1 month.', false),
      yesNo('recurrentSab', 'Unexplained stillbirth / recurrent spontaneous abortion (1)', 1,
        'History of unexplained stillborn infant, recurrent SAB (≥3), or premature birth with toxemia or growth-restricted infant.', false),
      yesNo('ocpHrt', 'Oral contraceptives or HRT (1)', 1, 'Current oral contraceptive or hormone replacement therapy scores 1 point; include combined and progestin-only products per local policy.', false),
      yesNo('historyIbd', 'History of IBD (1)', 1, 'History of inflammatory bowel disease scores 1 point.', false),
      yesNo('sepsis', 'Sepsis <1 month (1)', 1, 'Sepsis within the past month scores 1 point.', false),
      yesNo('pneumonia', 'Serious lung disease including pneumonia <1 month (1)', 1, 'Serious lung disease or pneumonia within the past month scores 1 point; chronic COPD is a separate 1-point item on the full RAM.', false),
      yesNo('abnormalPft', 'Abnormal pulmonary function (1)', 1,
        'COPD or other abnormal PFTs as on the Caprini form (distinct from acute pneumonia/serious lung disease).', false),
      yesNo('acuteMi', 'Acute myocardial infarction (1)', 1, 'Acute myocardial infarction scores 1 point.', false),
      yesNo('chf', 'CHF <1 month (1)', 1, 'Congestive heart failure within the past month scores 1 point; chronic compensated HF is a separate 1-point item on the full RAM.', false),
      yesNo('bedrest', 'Medical patient currently at bed rest (1)', 1,
        '1-point medical-patient bed rest. Distinct from confined to bed >72 h (2 points).', true),
      yesNo('bedrest72', 'Confined to bed >72 hours (2)', 2,
        '2-point immobilization on the Caprini RAM — distinct from 1-point medical bed rest.', false),
      yesNo('plasterCast', 'Immobilizing plaster cast (2)', 2,
        'Immobilizing plaster cast <1 month.', false),
      yesNo('cvc', 'Central venous access (2)', 2, 'Central venous access (including a PICC placed before the assessment) scores 2 points.', true),
      yesNo('cancer', 'Malignancy (2)', 2,
        'Present or previous malignancy as on the Caprini form.', true),
      yesNo('priorVte', 'History of VTE (3)', 3, 'History of VTE scores 3 points; enter it once even if the patient has had multiple events.', false),
      yesNo('familyVte', 'Family history of VTE (3)', 3,
        'First-degree relative with VTE.', false),
      yesNo('thrombophilia', 'Positive Factor V Leiden / prothrombin / high homocysteine etc. (3)', 3,
        'Known thrombophilia: Factor V Leiden, prothrombin G20210A, antiphospholipid, antithrombin/protein C/S deficiency, or high homocysteine as on the Caprini form. HIT is a separate 3-point item.', false),
      yesNo('hit', 'History of HIT (3)', 3,
        'Heparin-induced thrombocytopenia (3 points on Caprini forms).', false),
      yesNo('hip', 'Elective major lower extremity arthroplasty (5)', 5, 'Elective major lower-extremity arthroplasty (hip or knee) scores 5 points, the highest weight class.', false),
      yesNo('hipFracture', 'Hip, pelvis, or leg fracture (5)', 5, 'Hip, pelvic, or leg fracture scores 5 points.', false),
      yesNo('stroke', 'Acute spinal cord injury / stroke <1 mo (5)', 5, 'Acute spinal cord injury or stroke within the past month — paralysis or paresis — scores 5 points.', false),
      yesNo('multipleTrauma', 'Multiple trauma <1 month (5)', 5, 'Multiple trauma within the past month scores 5 points.', false),
    ],
    calculate(values) {
      // Age bands are mutually exclusive (highest applicable). The 2005 Caprini
      // form lists four surgery categories, but one operation must contribute
      // only its highest applicable surgery tier (minor = 1; the other three = 2).
      const agePoints = bool(values.age75) ? 3 : bool(values.age61) ? 2 : bool(values.age41) ? 1 : 0;
      const surgeryPoints = Math.max(
        bool(values.minorSurg) ? 1 : 0,
        bool(values.majorSurg) || bool(values.arthroscopic) || bool(values.laparoscopic) ? 2 : 0,
      );
      let score = agePoints + surgeryPoints;
      const items: [string, number][] = [
        ['bmi25', 1], ['swollenLegs', 1], ['varicose', 1], ['pregnancy', 1], ['recurrentSab', 1],
        ['ocpHrt', 1], ['historyIbd', 1], ['sepsis', 1], ['pneumonia', 1], ['abnormalPft', 1],
        ['acuteMi', 1], ['chf', 1], ['bedrest', 1], ['bedrest72', 2], ['plasterCast', 2], ['cvc', 2],
        ['cancer', 2], ['priorVte', 3], ['familyVte', 3], ['thrombophilia', 3], ['hit', 3],
        ['hip', 5], ['hipFracture', 5], ['stroke', 5], ['multipleTrauma', 5],
      ];
      items.forEach(([k, p]) => {
        if (bool(values[k])) score += p;
      });
      const r = riskFromThresholds(score, [
        { max: 0, level: 'low', label: 'Very low (0)', interpretation: 'ACCP-style Caprini 0: early ambulation; pharmacologic prophylaxis generally not required.' },
        { max: 2, level: 'low', label: 'Low (1–2)', interpretation: 'ACCP-style Caprini 1–2: mechanical prophylaxis; pharmacologic per procedure and bleed risk.' },
        { max: 4, level: 'moderate', label: 'Moderate (3–4)', interpretation: 'ACCP-style Caprini 3–4: pharmacologic prophylaxis typically indicated unless bleeding risk high (or mechanical if bleeding).' },
        { max: 50, level: 'high', label: 'High (≥5)', interpretation: 'ACCP-style Caprini ≥5: pharmacologic + mechanical prophylaxis often recommended when bleed risk allows.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'The 2005 Caprini RAM assigns weighted points to VTE risk factors. This form includes the published 1-, 2-, 3-, and 5-point items used to generate a numeric total and ACCP-style prophylaxis bands.',
      formula: 'Sum of selected items. Age bands use the highest applicable band only (41–60 = 1, 61–74 = 2, ≥75 = 3). For one operation, surgery categories are mutually exclusive and only the highest applicable tier is scored: minor surgery = 1; arthroscopic surgery, major open surgery >45 min, or laparoscopic surgery >45 min = 2. Other 1 pt: BMI ≥25, swollen legs, varicose veins, pregnancy/postpartum, unexplained stillbirth/recurrent SAB, OCP/HRT, IBD, sepsis <1 mo, pneumonia/serious lung disease <1 mo, abnormal PFTs, acute MI, CHF <1 mo, medical bed rest. Other 2 pt: malignancy, confined to bed >72 h, immobilizing plaster cast, central venous access. 3 pt: prior VTE, family VTE, thrombophilia, HIT. 5 pt: elective major LE arthroplasty; hip/pelvis/leg fracture; stroke or acute SCI <1 mo; multiple trauma <1 mo.',
      validation: 'Validated across surgical specialties (including Bahl 2010); prophylaxis thresholds remain protocol-dependent (ACCP 2012 Caprini bands shown).',
      references: [
        { title: 'Thrombosis risk assessment as a guide to quality patient care', citation: 'Caprini JA. Dis Mon. 2005', year: 2005, pmid: '15900257',
          doi: '10.1016/j.disamonth.2005.02.003', },
        { title: 'A validation study of a retrospective venous thromboembolism risk scoring method', citation: 'Bahl V et al. Ann Surg. 2010', year: 2010, pmid: '19779324',
          doi: '10.1097/SLA.0b013e3181b7fca6', },
      ],
    },
    nextSteps: [
      { condition: 'Score 0', actions: ['Early ambulation'] },
      { condition: 'Score 1–2', actions: ['Mechanical prophylaxis', 'Pharmacologic per procedure'] },
      { condition: 'Score 3–4', actions: ['LMWH/heparin unless high bleed risk', 'Mechanical if bleeding'] },
      { condition: 'Score ≥5', actions: ['LMWH/heparin + SCDs often', 'Extended prophylaxis after some orthopedic cases'] },
    ],
    pearls: [
      'Age bands are mutually exclusive (use the highest applicable). Medical bed rest (1) and confinement >72 h (2) are distinct published items.',
      'For one operation, surgery categories are mutually exclusive: score only the highest applicable tier (minor = 1; major open >45 min, arthroscopic, or laparoscopic >45 min = 2). Do not double-count categories for the same case.',
      'HIT is 3 points on Caprini forms and is scored separately from other thrombophilias.',
    ],
  },
  {
    id: 'stop-bang',
    name: 'STOP-BANG Sleep Apnea Screen',
    shortName: 'STOP-BANG',
    description: 'Screens for obstructive sleep apnea risk.',
    category: 'pulmonary',
    tags: ['osa', 'sleep', 'preop'],
    whenToUse: 'Preoperative or primary care OSA screening.',
    whyUse: 'Simple high-sensitivity screen.',
    inputs: [
      yesNo('snore', 'Snore loudly (heard through closed doors, or partner elbows you)?', 1, 'Loud snoring (heard through a closed door, or bed partner reporting elbows) scores 1 point.', true),
      yesNo('tired', 'Often tired, fatigued, or sleepy in the daytime (e.g. falling asleep while driving or talking)?', 1, 'Daytime tiredness or sleepiness, e.g. falling asleep while driving or talking, scores 1 point.', true),
      yesNo('observed', 'Anyone observed you stop breathing, or choke/gasp during sleep?', 1, 'Witnessed apnea, choking, or gasping during sleep scores 1 point.', true),
      yesNo('pressure', 'High blood pressure (have, or being treated)?', 1, 'Hypertension present or under treatment scores 1 point.', true),
      yesNo('bmi', 'BMI > 35', 1, 'BMI above 35 kg/m² scores 1 point.', true),
      yesNo('age', 'Age > 50', 1, 'Age above 50 years scores 1 point.', true),
      yesNo('neck', 'Neck circumference large (>40 cm / 16 in)', 1, 'Neck circumference above 40 cm (16 in) scores 1 point, measured at the laryngeal prominence.', false),
      yesNo('gender', 'Gender male', 1, 'Male sex scores 1 point. Totals: 0–2 low, 3–4 intermediate, ≥5 high risk for moderate–severe OSA.', true),
    ],
    calculate(values) {
      const score = ['snore', 'tired', 'observed', 'pressure', 'bmi', 'age', 'neck', 'gender'].reduce(
        (s, k) => s + (bool(values[k]) ? 1 : 0),
        0
      );
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low OSA risk', interpretation: 'STOP-BANG 0–2: low risk for moderate–severe OSA.' },
        { max: 4, level: 'moderate', label: 'Intermediate risk', interpretation: 'Score 3–4: intermediate risk.' },
        { max: 8, level: 'high', label: 'High OSA risk', interpretation: 'Score ≥5: high risk — consider sleep study / periop precautions.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'STOP-BANG: Snore, Tired, Observed, Pressure, BMI, Age, Neck, Gender.',
      validation: 'Validated preoperative screen with high sensitivity.',
      references: [
        { title: 'STOP questionnaire: a tool to screen patients for obstructive sleep apnea', citation: 'Chung F et al. Anesthesiology. 2008', year: 2008, pmid: '18431116',
          doi: '10.1097/ALN.0b013e31816d83e4', },
        { title: 'High STOP-Bang score indicates a high probability of obstructive sleep apnoea', citation: 'Chung F et al. Br J Anaesth. 2012', year: 2012, pmid: '22401881',
          doi: '10.1093/bja/aes022', },
      ],
    },
    nextSteps: [
      { condition: 'High risk', actions: ['Polysomnography or HSAT', 'CPAP if diagnosed', 'Periop airway caution'] },
    ],
  },
  {
    id: 'epworth',
    name: 'Epworth Sleepiness Scale',
    shortName: 'Epworth',
    description: 'Measures daytime sleepiness likelihood in common situations.',
    category: 'pulmonary',
    tags: ['sleep', 'osa', 'sleepiness'],
    whenToUse: 'Evaluation of excessive daytime sleepiness.',
    whyUse: 'Common patient-reported sleepiness measure.',
    inputs: [
      ...[
        'Sitting and reading',
        'Watching TV',
        'Sitting inactive in a public place (e.g. a theatre or a meeting)',
        'As a passenger in a car for an hour without a break',
        'Lying down to rest in the afternoon when circumstances permit',
        'Sitting and talking to someone',
        'Sitting quietly after a lunch without alcohol',
        'In a car, while stopped for a few minutes in the traffic',
      ].map((label, i) =>
        selectInput(`q${i + 1}`, label, [
          { label: 'Would never doze (0)', value: 0, description: 'Would never doze or fall asleep' },
          { label: 'Slight chance of dozing (1)', value: 1, description: 'Slight chance of dozing' },
          { label: 'Moderate chance of dozing (2)', value: 2, description: 'Moderate chance of dozing' },
          { label: 'High chance of dozing (3)', value: 3, description: 'High chance of dozing' },
        ], [2, 2, 1, 1, 3, 0, 2, 1][i], i === 0 ? 'Official ESS © M.W. Johns — use a licensed form for diagnosis; this is an educational total. How likely are you to doze off or fall asleep, in contrast to feeling just tired? Usual way of life in recent times; if you have not done some of these recently, estimate how they would have affected you.' : 'Chance of dozing (not merely feeling tired) in this situation. Educational ESS total; official form is copyrighted.'),
      ),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 8; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        { max: 10, level: 'normal', label: 'Normal range', interpretation: 'ESS ≤10: normal daytime sleepiness range for many populations.' },
        { max: 12, level: 'moderate', label: 'Mild excessive', interpretation: 'Mild excessive daytime sleepiness.' },
        { max: 15, level: 'moderate', label: 'Moderate', interpretation: 'Moderate excessive sleepiness — evaluate sleep disorders.' },
        { max: 24, level: 'high', label: 'Severe', interpretation: 'Severe sleepiness — urgent evaluation; driving safety counseling.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'ESS scores 0–24 across 8 situations.',
      validation: 'Widely used; correlates imperfectly with OSA severity.',
      references: [{ title: 'A new method for measuring daytime sleepiness: the Epworth sleepiness scale', citation: 'Johns MW. Sleep. 1991', year: 1991, pmid: '1798888',
          doi: '10.1093/sleep/14.6.540', }],
    },
    nextSteps: [
      { condition: 'ESS >10', actions: ['Sleep history', 'Consider sleep study', 'Counsel on drowsy driving'] },
    ],
  },
  {
    id: 'bode',
    name: 'BODE Index (COPD)',
    shortName: 'BODE',
    description: 'Multidimensional COPD prognosis index.',
    category: 'pulmonary',
    tags: ['copd', 'prognosis'],
    whenToUse: 'COPD prognostication and transplant referral discussions.',
    whyUse: 'Predicts mortality better than FEV1 alone.',
    inputs: [
      selectInput('bmi', 'BMI', [
        { label: '>21 (0)', value: 0 },
        { label: '≤21 (1)', value: 1 },
      ], 0, 'BMI 21 kg/m² or lower scores 1 point; above 21 scores 0.'),
      selectInput('obstruction', 'FEV1 % predicted', [
        { label: '≥65% (0)', value: 0 },
        { label: '50–64% (1)', value: 1 },
        { label: '36–49% (2)', value: 2 },
        { label: '≤35% (3)', value: 3 },
      ], 2, 'Post-bronchodilator FEV₁ % predicted: ≥65% 0, 50–64% 1, 36–49% 2, ≤35% 3 points.'),
      selectInput('dyspnea', 'mMRC dyspnea', [
        { label: '0–1 (0)', value: 0, description: 'Grade 0: breathless only with strenuous exercise. Grade 1: short of breath hurrying on the level or walking up a slight hill. Both map to 0 BODE points.' },
        { label: '2 (1)', value: 1, description: 'Walks slower than same-age peers on the level or stops for breath at own pace on the level' },
        { label: '3 (2)', value: 2, description: 'Stops for breath after ~100 m or after a few minutes on the level' },
        { label: '4 (3)', value: 3, description: 'Too breathless to leave the house, or breathless dressing/undressing' },
      ], 1, 'Modified MRC dyspnea scale. Pick the worst applicable grade, then the BODE point bin (grades 0 and 1 both score 0 BODE points).'),
      selectInput('exercise', '6-minute walk distance', [
        { label: '≥350 m (0)', value: 0 },
        { label: '250–349 m (1)', value: 1 },
        { label: '150–249 m (2)', value: 2 },
        { label: '≤149 m (3)', value: 3 },
      ], 2, 'Six-minute walk distance: ≥350 m 0, 250–349 m 1, 150–249 m 2, ≤149 m 3 points. Use the best of two walks if repeated.'),
    ],
    calculate(values) {
      const score = num(values.bmi) + num(values.obstruction) + num(values.dyspnea) + num(values.exercise);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Quartile 1 (0–2)', interpretation: 'Lower mortality risk among COPD cohorts.' },
        { max: 4, level: 'moderate', label: 'Quartile 2 (3–4)', interpretation: 'Intermediate risk.' },
        { max: 6, level: 'high', label: 'Quartile 3 (5–6)', interpretation: 'Higher mortality risk.' },
        { max: 10, level: 'critical', label: 'Quartile 4 (7–10)', interpretation: 'Highest risk — consider advanced therapies / palliative discussions.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'BODE: BMI, airflow Obstruction, Dyspnea, Exercise capacity (0–10).',
      validation: 'Predicts COPD mortality better than FEV1 alone (Celli et al.).',
      references: [{ title: 'The body-mass index, airflow obstruction, dyspnea, and exercise capacity index in COPD', citation: 'Celli BR et al. N Engl J Med. 2004', year: 2004, pmid: '14999112',
          doi: '10.1056/NEJMoa021322', }],
    },
    nextSteps: [
      { condition: 'High BODE', actions: ['Optimize inhalers/pulm rehab', 'Consider transplant/LVRS evaluation', 'Advance care planning'] },
    ],
  },
  {
    id: 'steroid-conversion',
    name: 'Corticosteroid Conversion',
    shortName: 'Steroid Conversion',
    description: 'Equipotent glucocorticoid dose conversion (approximate).',
    category: 'endocrinology',
    tags: ['steroid', 'conversion', 'glucocorticoid'],
    whenToUse: 'Switching between systemic corticosteroids.',
    whyUse: 'Approximate anti-inflammatory equivalences.',
    inputs: [
      numberInput('dose', 'Current dose', { unit: 'mg', min: 0.1, max: 1000, step: 0.5, exampleValue: 20, helpText: 'Current daily dose in mg of the \'from\' steroid. Enter the total daily amount, not a per-dose figure, when converting scheduled therapy.' }),
      // Relative glucocorticoid potency vs hydrocortisone = 1.
      // From classic equivalents: HC 20 = cortisone 25 = pred 5 = methylpred/triamcinolone 4 = dex/beta 0.75 mg.
      // potency = 20 / equivalent_dose_mg  →  dex/beta = 20/0.75 ≈ 26.667 (not the rounded "25" used in some tables).
      selectInput('from', 'From steroid', [
        { label: 'Hydrocortisone', value: 'hydrocortisone' },
        { label: 'Cortisone', value: 'cortisone' },
        { label: 'Prednisone / Prednisolone', value: 'prednisone' },
        { label: 'Methylprednisolone', value: 'methylprednisolone' },
        { label: 'Triamcinolone', value: 'triamcinolone' },
        { label: 'Dexamethasone', value: 'dexamethasone' },
        { label: 'Betamethasone', value: 'betamethasone' },
      ], 'prednisone', 'Select the steroid you are converting from; equivalences are approximate (e.g. hydrocortisone 20 mg ≈ prednisone 5 mg ≈ dexamethasone 0.75 mg).'),
      selectInput('to', 'To steroid', [
        { label: 'Hydrocortisone', value: 'hydrocortisone' },
        { label: 'Cortisone', value: 'cortisone' },
        { label: 'Prednisone / Prednisolone', value: 'prednisone' },
        { label: 'Methylprednisolone', value: 'methylprednisolone' },
        { label: 'Triamcinolone', value: 'triamcinolone' },
        { label: 'Dexamethasone', value: 'dexamethasone' },
        { label: 'Betamethasone', value: 'betamethasone' },
      ], 'methylprednisolone', 'Select the target steroid. Mineralocorticoid activity is not equivalent (hydrocortisone has more than dexamethasone), and longer-acting agents may need a taper.'),
    ],
    calculate(values) {
      const dose = num(values.dose, 20);
      const potency: Record<string, number> = {
        hydrocortisone: 1,
        cortisone: 0.8,
        prednisone: 4,
        methylprednisolone: 5,
        triamcinolone: 5,
        dexamethasone: 20 / 0.75,
        betamethasone: 20 / 0.75,
      };
      const from = potency[String(values.from)] ?? num(values.from, 4);
      const to = potency[String(values.to)] ?? num(values.to, 1);
      // dose_to = dose_from * (potency_from / potency_to)
      const converted = round(dose * (from / to), 1);
      return {
        score: converted,
        unit: 'mg',
        label: 'Equivalent dose',
        interpretation: `Approximate equivalent: ${converted} mg of target steroid. Mineralocorticoid activity differs (esp. hydrocortisone vs dex). Taper appropriately.`,
        riskLevel: 'info',
        details: [{ label: 'Hydrocortisone-equivalent', value: `${round(dose * from, 1)} mg` }],
      };
    },
    evidence: {
      summary: 'Approximate equivalences: HC 20 = Pred 5 = Methylpred 4 = Dex/Betamethasone 0.75 mg (relative potency 20/0.75 ≈ 26.7 vs HC). Some tables round dex/beta potency to 25 (0.8 mg equiv); this calc uses the 0.75 mg standard.',
      validation: 'Standard pharmacology tables; individual response varies. Equivalences are approximate.',
      references: [{ title: 'A practical guide to monitoring and management of systemic corticosteroid complications', citation: 'Liu D et al. Allergy Asthma Clin Immunol. 2013', year: 2013, pmid: '23947590', doi: '10.1186/1710-1492-9-30' }],
    },
    nextSteps: [{ condition: 'Conversion', actions: ['Account for half-life differences', 'Stress-dose if adrenal suppression risk'] }],
  },
  {
    id: 'opioid-mme',
    name: 'Morphine Milligram Equivalents (MME)',
    shortName: 'MME',
    description: 'Daily opioid morphine milligram equivalents (CDC conversion factors).',
    category: 'general',
    tags: ['opioid', 'mme', 'pain'],
    sourceVersion: 'CDC Clinical Practice Guideline 2022 MME table',
    whenToUse: 'Assessing opioid dose intensity and overdose risk.',
    whyUse: 'CDC thresholds (e.g., ≥50 MME/day) flag higher risk.',
    inputs: [
      numberInput('dose', 'Dose per administration', { unit: 'mg', min: 0, max: 1000, step: 0.5, exampleValue: 10, helpText: 'Oral mg per dose for tablets/liquids. For fentanyl patch enter patch strength in mcg/h and set doses/day = 1 (CDC MME/day = mcg/h × 2.4). Do not use this tool to switch opioids.' }),
      numberInput('freq', 'Doses per day', { min: 1, max: 24, exampleValue: 3, helpText: 'For fentanyl patch, set to 1 (the 2.4 factor already converts mcg/h → MME/day).' }),
      selectInput('opioid', 'Opioid', [
        { label: 'Morphine', value: 'morphine' },
        { label: 'Hydrocodone', value: 'hydrocodone' },
        { label: 'Oxycodone', value: 'oxycodone' },
        { label: 'Oxymorphone', value: 'oxymorphone' },
        { label: 'Hydromorphone', value: 'hydromorphone' },
        { label: 'Codeine', value: 'codeine' },
        { label: 'Tramadol', value: 'tramadol' },
        { label: 'Tapentadol', value: 'tapentadol' },
        { label: 'Fentanyl patch (mcg/hr → special)', value: 'fentanyl_patch', description: 'Enter patch mcg/h as the dose and set doses/day = 1. CDC MME/day = mcg/h × 2.4.' },
        { label: 'Methadone (CDC 2022 ×4.7)', value: 'methadone', description: 'Apply the CDC 2022 flat conversion factor of 4.7 to total daily oral methadone mg. Not for converting between opioids.' },
      ], 'oxycodone', 'Pick the agent from the CDC 2022 factor table. Methadone uses the flat ×4.7 factor, and fentanyl patches are entered as mcg/h with doses/day = 1 (×2.4).'),
    ],
    calculate(values) {
      const daily = num(values.dose, 10) * num(values.freq, 3);
      const conversionFactors: Record<string, number> = {
        morphine: 1,
        hydrocodone: 1,
        oxycodone: 1.5,
        oxymorphone: 3,
        hydromorphone: 5,
        codeine: 0.15,
        tramadol: 0.2,
        tapentadol: 0.4,
        fentanyl_patch: 2.4,
        methadone: 4.7,
      };
      const opioid = String(values.opioid);
      const factor = conversionFactors[opioid] ?? num(values.opioid, 1);
      const mmeRaw = daily * factor;
      const mme = round(mmeRaw, 1);
      const r = riskFromThresholds(mmeRaw, [
        { max: 49.99, level: 'low', label: '<50 MME/day — lower-dose band', interpretation: 'Lower-dose opioid therapy still carries overdose risk; use the lowest effective dose and consider naloxone when clinically appropriate.' },
        { max: 89.99, level: 'moderate', label: '50–89.99 MME/day — moderate risk band', interpretation: 'Increased overdose risk per CDC — justify benefit, offer naloxone, avoid concurrent benzodiazepines.' },
        { max: 10000, level: 'critical', label: '≥90 MME/day — high-dose band', interpretation: 'High-dose opioid therapy — reassess necessity; specialist involvement often warranted.' },
      ]);
      return {
        score: mme,
        unit: 'MME/day',
        ...r,
        details: [
          { label: 'Daily opioid amount', value: `${round(daily, 1)} ${opioid === 'fentanyl_patch' ? 'mcg/h (×1)' : 'mg/day'}` },
          { label: 'CDC 2022 conversion factor', value: String(factor) },
          { label: 'Methadone rule', value: opioid === 'methadone' ? 'CDC 2022 flat factor ×4.7' : 'n/a' },
        ],
      };
    },
    evidence: {
      summary: 'MME uses the CDC Clinical Practice Guideline for Prescribing Opioids — United States, 2022 Table of conversion factors (hydromorphone ×5.0; tramadol ×0.2), including a flat methadone factor of ×4.7.',
      formula: 'MME/day = total daily opioid dose × the CDC 2022 Table conversion factor. Doses are mg/day except transdermal fentanyl (mcg/hr ×2.4). Do not use calculated MME to select a replacement opioid dose.',
      validation: 'Public health tool for communicating opioid dose intensity and overdose risk; MME is not exact equianalgesia and must not be used for opioid rotation or other dose-conversion decisions (use product labeling and clinical judgment).',
      references: [{ title: 'CDC Clinical Practice Guideline for Prescribing Opioids — United States, 2022 (MME table)', citation: 'Dowell D et al. MMWR Recomm Rep. 2022;71(RR-3):1–95', year: 2022, pmid: '36327391',
          doi: '10.15585/mmwr.rr7103a1', url: 'https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm' }],
    },
    nextSteps: [
      { condition: '≥50 MME', actions: ['Offer naloxone', 'Avoid benzodiazepines', 'Reassess pain plan', 'Consider taper if harm outweighs benefit'] },
    ],
    pearls: [
      'CDC 2022 MME factors are dose-intensity estimates for risk communication, not equianalgesic doses. Never use this result to rotate or switch opioids.',
    ],
  },
  {
    id: 'corrected-phenytoin',
    name: 'Corrected Phenytoin (Albumin)',
    shortName: 'Corr. Phenytoin',
    description: 'Corrects total phenytoin for hypoalbuminemia (Sheiner-Tozer).',
    category: 'neurology',
    tags: ['phenytoin', 'level', 'epilepsy'],
    whenToUse: 'Total phenytoin levels with low albumin (or CrCl <20 with adjusted formula).',
    whyUse: 'Free phenytoin preferred; correction approximates when free level unavailable.',
    inputs: [
      numberInput('total', 'Total phenytoin', { unit: 'µg/mL', min: 0, max: 50, step: 0.1, exampleValue: 10, helpText: 'Total phenytoin in µg/mL (mcg/mL) from the same draw as the albumin; the Sheiner-Tozer correction raises the level when albumin is low.' }),
      numberInput('alb', 'Albumin', { unit: 'g/dL', min: 1, max: 5, step: 0.1, exampleValue: 2.5, helpText: 'Serum albumin in g/dL. Correction: adjusted level = measured ÷ (0.2 × albumin + 0.1). In ESRD or CrCl under 20 mL/min, the albumin-binding coefficient drops from 0.2 to 0.1 — select the ESRD option below.' }),
      yesNo('esrd', 'ESRD / CrCl <20 (use 0.1 binding factor)', 0, 'Yes for ESRD or creatinine clearance under 20 mL/min; use the renal-failure variant with the lower (0.1) binding factor, which changes the corrected level.', false),
    ],
    calculate(values) {
      const total = num(values.total, 10);
      const alb = num(values.alb, 2.5);
      // Sheiner-Tozer: normal renal f=0.2; severe renal failure/ESRD often uses f=0.1
      const factor = bool(values.esrd) ? 0.1 : 0.2;
      const corr = round(total / (factor * alb + 0.1), 1);
      const r = riskFromThresholds(corr, [
        { max: 9.9, level: 'moderate', label: 'Below usual range', interpretation: 'Corrected level below typical 10–20 µg/mL therapeutic range.' },
        { max: 20, level: 'normal', label: 'Therapeutic range', interpretation: 'Approximately within 10–20 µg/mL (individualize).' },
        { max: 100, level: 'high', label: 'Supratherapeutic', interpretation: 'Elevated — toxicity risk (nystagmus, ataxia, altered MS).' },
      ]);
      return { score: corr, unit: 'µg/mL', ...r };
    },
    evidence: {
      summary: 'Sheiner-Tozer: Corrected = Total / [(0.2 × albumin) + 0.1]; use 0.1 × albumin in ESRD/CrCl <20. Free levels preferred.',
      validation: 'Common clinical approximation with known limitations.',
      references: [{ title: 'Renal function and therapeutic concentrations of phenytoin', citation: 'Liponi DF, Winter ME, Tozer TN. Neurology. 1984', year: 1984, pmid: '6538287',
          doi: '10.1212/wnl.34.3.395', }],
    },
    nextSteps: [
      { condition: 'Toxic range', actions: ['Hold/reduce dose', 'Supportive care', 'Check free phenytoin if available'] },
    ],
  },
  // Note: corrected reticulocyte % + RPI lives at id `corrected-retic` (missing-peds-ob-tox).
  {
    id: 'transferrin-sat',
    name: 'Transferrin Saturation',
    shortName: 'TSAT',
    description: 'Iron / TIBC ratio for iron status.',
    category: 'hematology',
    tags: ['iron', 'anemia', 'hemochromatosis'],
    whenToUse: 'Iron deficiency vs overload assessment.',
    whyUse: 'Quick iron availability metric.',
    inputs: [
      numberInput('iron', 'Serum iron', { unit: 'µg/dL', min: 0, max: 500, exampleValue: 60, helpText: 'Serum iron in µg/dL from a fasting morning draw where possible; iron varies through the day and with recent supplements.' }),
      numberInput('tibc', 'TIBC', { unit: 'µg/dL', min: 50, max: 600, exampleValue: 300, helpText: 'Total iron-binding capacity in µg/dL from the same draw; TSAT = iron ÷ TIBC × 100, and <15–20% with a low ferritin supports iron deficiency.' }),
    ],
    calculate(values) {
      const iron = num(values.iron, 60);
      const tibc = num(values.tibc, 300);
      if (tibc <= 0) {
        return {
          score: '—',
          unit: '%',
          label: 'Invalid TIBC',
          interpretation: 'TIBC must be greater than 0 to calculate transferrin saturation.',
          riskLevel: 'info',
        };
      }
      const tsat = round((iron / tibc) * 100, 1);
      const r = riskFromThresholds(tsat, [
        { max: 15, level: 'moderate', label: 'Low TSAT', interpretation: 'TSAT <15–20% supports iron deficiency (with ferritin).' },
        { max: 45, level: 'normal', label: 'Normal range', interpretation: 'Generally normal TSAT range (lab-dependent).' },
        { max: 100, level: 'high', label: 'High TSAT', interpretation: 'Elevated TSAT — consider iron overload / hemochromatosis workup.' },
      ]);
      return { score: tsat, unit: '%', ...r };
    },
    evidence: {
      summary: 'TSAT = (serum iron / TIBC) × 100%.',
      validation: 'Standard iron studies panel component.',
      references: [{ title: 'British Society of Gastroenterology guidelines for iron deficiency anaemia', citation: 'Snook J et al. Gut. 2021', year: 2021, pmid: '34497146', doi: '10.1136/gutjnl-2021-325210' }],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Ferritin, CBC', 'Find bleeding source if IDA'] },
      { condition: 'High', actions: ['Ferritin, HFE genetic testing as indicated'] },
    ],
  },
  {
    id: 'free-water-sodium-change',
    name: 'Predicted Sodium Change (Adrogue)',
    shortName: 'Na Change (Infusate)',
    description: 'Predicted change in serum Na per liter of infusate (Adrogué-Madias).',
    category: 'nephrology',
    tags: ['hyponatremia', 'fluids', 'sodium'],
    status: 'superseded',
    supersededBy: 'sodium-correction-rate',
    whenToUse: 'Planning correction of hypo/hypernatremia with IV fluids.',
    whyUse: 'Estimates ΔNa per liter to avoid overcorrection.',
    inputs: [
      numberInput('serumNa', 'Serum Na', { unit: 'mEq/L', min: 100, max: 180, exampleValue: 120, helpText: 'Current serum sodium in mEq/L, measured before the planned infusate; it sets the (infusate Na − serum Na) driving term.' }),
      numberInput('infusateNa', 'Infusate Na', { unit: 'mEq/L', min: 0, max: 513, exampleValue: 154, helpText: 'D5W=0, 0.45%NaCl=77, NS=154, 3%=513' }),
      numberInput('infusateK', 'Infusate K (optional)', {
        unit: 'mEq/L',
        min: 0,
        max: 100,
        exampleValue: 0,
        required: false,
        helpText: 'K in the liter of infusate (e.g. 10–40 mEq/L KCl). Published ΔNa uses infusate Na + K. Leave 0 if none.',
      }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 20, max: 200, exampleValue: 70, helpText: 'Body weight in kg used with the TBW factor to estimate the volume of distribution; select lb if your recorded weight is imperial.' }),
      selectInput('tbwFactor', 'TBW factor', [
        { label: 'Young man 0.6', value: 0.6 },
        { label: 'Young woman / elderly man 0.5', value: 0.5 },
        { label: 'Elderly woman 0.45', value: 0.45 },
      ], 0.5, 'TBW as a fraction of body weight: 0.6 young men, 0.5 young women or elderly men, 0.45 elderly women. A smaller fraction means a larger predicted ΔNa per liter.'),
    ],
    calculate(values) {
      const sNa = num(values.serumNa, 120);
      const iNa = num(values.infusateNa, 154);
      const iK = num(values.infusateK, 0);
      const tbw = num(values.weight, 70) * num(values.tbwFactor, 0.5);
      const infusateCation = iNa + iK;
      const delta = round((infusateCation - sNa) / (tbw + 1), 2);
      return {
        score: delta,
        unit: 'mEq/L per L',
        label: 'Predicted ΔNa per liter',
        interpretation: `Each liter of infusate changes Na by ~${delta} mEq/L (Adrogué–Madias, including infusate K). Limit correction (often ≤8–10 mEq/L/day in chronic hyponatremia) to reduce ODS risk.`,
        riskLevel: 'info',
        details: [
          { label: 'TBW used', value: `${round(tbw, 1)} L` },
          { label: 'Infusate Na + K', value: `${infusateCation} mEq/L` },
        ],
      };
    },
    evidence: {
      summary: 'Adrogué-Madias: ΔNa = (infusate Na + infusate K − serum Na) / (TBW + 1).',
      formula: 'ΔNa = (Na_inf + K_inf − Na_serum) / (TBW + 1)',
      validation: 'Widely taught; actual change varies with ongoing losses/ADH.',
      references: [{ title: 'Hyponatremia', citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000', year: 2000, pmid: '10824078',
          doi: '10.1056/NEJM200005253422107', }],
    },
    nextSteps: [
      { condition: 'Severe symptomatic hyponatremia', actions: ['100 mL 3% saline boluses per guidelines', 'Frequent Na monitoring'] },
    ],
  },
];
