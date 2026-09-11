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
      selectInput('zone', 'Injury zone', [
        { label: 'Ankle', value: 'ankle' },
        { label: 'Midfoot', value: 'midfoot' },
      ]),
      yesNo('malleolarPain', 'Pain in malleolar zone', 0),
      yesNo('midfootPain', 'Pain in midfoot zone', 0),
      yesNo('postLat', 'Bone tenderness posterior distal 6 cm lateral malleolus', 0),
      yesNo('postMed', 'Bone tenderness posterior distal 6 cm medial malleolus', 0),
      yesNo('navicular', 'Bone tenderness navicular', 0),
      yesNo('base5', 'Bone tenderness base of 5th metatarsal', 0),
      yesNo('walk', 'Unable to bear weight 4 steps both immediately AND in ED', 0),
    ],
    calculate(values) {
      const ankle = String(values.zone ?? 'ankle') === 'ankle';
      const malleolarPain = bool(values.malleolarPain);
      const midfootPain = bool(values.midfootPain);
      const postLat = bool(values.postLat);
      const postMed = bool(values.postMed);
      const navicular = bool(values.navicular);
      const base5 = bool(values.base5);
      const walk = bool(values.walk);

      // Ankle x-ray: malleolar-zone pain AND (post lat OR post med OR unable 4 steps)
      const ankleXray = malleolarPain && (postLat || postMed || walk);
      // Foot x-ray: midfoot pain AND (navicular OR base 5th OR unable 4 steps)
      const footXray = midfootPain && (navicular || base5 || walk);
      const xray = ankle ? ankleXray : footXray;

      const details = [
        { label: 'Zone assessed', value: ankle ? 'Ankle (malleolar)' : 'Midfoot' },
        { label: 'Malleolar zone pain', value: malleolarPain ? 'Yes' : 'No' },
        { label: 'Midfoot zone pain', value: midfootPain ? 'Yes' : 'No' },
        { label: 'Posterior lateral malleolus tenderness', value: postLat ? 'Yes' : 'No' },
        { label: 'Posterior medial malleolus tenderness', value: postMed ? 'Yes' : 'No' },
        { label: 'Navicular tenderness', value: navicular ? 'Yes' : 'No' },
        { label: 'Base of 5th metatarsal tenderness', value: base5 ? 'Yes' : 'No' },
        { label: 'Unable to walk 4 steps (immediate + ED)', value: walk ? 'Yes' : 'No' },
        { label: 'Ankle x-ray criteria', value: ankleXray ? 'Positive' : 'Negative' },
        { label: 'Foot x-ray criteria', value: footXray ? 'Positive' : 'Negative' },
      ];

      if (xray) {
        return {
          score: 1,
          label: 'X-ray indicated',
          interpretation: ankle
            ? 'Ottawa Ankle Rules positive — obtain ankle radiographs.'
            : 'Ottawa Foot Rules positive — obtain foot radiographs.',
          riskLevel: 'moderate' as const,
          details,
          recommendations: ankle
            ? ['Ankle series radiographs']
            : ['Foot series radiographs'],
        };
      }
      return {
        score: 0,
        label: 'X-ray not required',
        interpretation: ankle
          ? 'Ankle rules negative — malleolar fracture unlikely; radiograph not required if exam reliable.'
          : 'Foot rules negative — midfoot fracture unlikely; radiograph not required if exam reliable.',
        riskLevel: 'low' as const,
        details,
        recommendations: ['RICE', 'Weight bearing as tolerated', 'Follow-up if not improving'],
      };
    },
    evidence: {
      summary: 'Ottawa Ankle Rules highly sensitive for clinically significant fractures.',
      validation: 'Multiple prospective validations; near 100% sensitivity for malleolar/midfoot fractures.',
      references: [{ title: 'Decision rules for use of radiography in acute ankle injuries', citation: 'Stiell IG et al. JAMA. 1993', year: 1993, pmid: '8433468',
          doi: '10.1001/jama.269.9.1127', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Ankle series and/or foot series as indicated'] },
      { condition: 'Negative', actions: ['RICE', 'Early weight bearing as tolerated', 'Follow-up if not improving'] },
    ],
  },
  {
    id: 'ottawa-knee',
    name: 'Ottawa Knee Rules',
    shortName: 'Ottawa Knee',
    description: 'Determines need for knee radiograph after acute injury.',
    category: 'orthopedics',
    tags: ['knee', 'xray', 'trauma'],
    whenToUse: 'Acute knee injury.',
    whyUse: 'Reduces unnecessary knee films with high sensitivity.',
    inputs: [
      yesNo('age55', 'Age ≥ 55 years'),
      yesNo('fibula', 'Isolated tenderness of fibular head'),
      yesNo('patella', 'Isolated tenderness of patella'),
      yesNo('flex90', 'Inability to flex knee to 90°'),
      yesNo('walk', 'Unable to bear weight 4 steps both immediately AND in ED'),
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
      references: [{ title: 'Implementation of the Ottawa Knee Rule', citation: 'Stiell IG et al. JAMA. 1997', year: 1997, pmid: '9403421' }],
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
      yesNo('midline', 'Midline posterior cervical tenderness'),
      yesNo('intox', 'Evidence of intoxication'),
      yesNo('ams', 'Altered level of alertness'),
      yesNo('focal', 'Focal neurologic deficit'),
      yesNo('distracting', 'Painful distracting injury'),
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
      yesNo('highRisk', 'High-risk factor: age≥65 OR dangerous mechanism OR paresthesias', 0),
      yesNo('lowRisk', 'Any low-risk factor allowing assessment: simple rear-end MVC, sitting in ED, ambulatory, delayed neck pain, or absence of midline tenderness', -1),
      yesNo('rotate', 'Unable to actively rotate neck 45° left AND right', 0),
    ],
    calculate(values) {
      const highRisk = bool(values.highRisk);
      const lowRisk = bool(values.lowRisk);
      const rotate = bool(values.rotate);
      const details = [
        { label: 'High-risk factor', value: highRisk ? 'Yes' : 'No' },
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
      summary: 'Canadian C-Spine Rule algorithm: high-risk → image; else low-risk assessment → ROM testing.',
      validation: 'Derived/validated by Stiell et al.; high sensitivity for clinically important C-spine injury.',
      references: [{ title: 'The Canadian C-Spine Rule for radiography', citation: 'Stiell IG et al. JAMA. 2001', year: 2001, pmid: '11597285',
          doi: '10.1001/jama.286.15.1841', }],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['CT C-spine', 'Maintain immobilization'] },
      { condition: 'Negative', actions: ['Clear C-spine clinically'] },
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
      numberInput('weight', 'Weight', { unit: 'kg', min: 5, max: 200, defaultValue: 70 }),
      numberInput('tbsa', 'TBSA burned', { unit: '%', min: 1, max: 100, defaultValue: 20 }),
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
      references: [{ title: 'Fluid volume and electrolyte changes in the early postburn period', citation: 'Baxter CR / Parkland formula literature', year: 1970, pmid: '4609676' }],
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
      yesNo('head', 'Head & neck (9%)', 9),
      yesNo('antTrunk', 'Anterior trunk (18%)', 18),
      yesNo('postTrunk', 'Posterior trunk (18%)', 18),
      yesNo('armR', 'Right arm (9%)', 9),
      yesNo('armL', 'Left arm (9%)', 9),
      yesNo('legR', 'Right leg (18%)', 18),
      yesNo('legL', 'Left leg (18%)', 18),
      yesNo('perineum', 'Perineum (1%)'),
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
        { label: 'Blue/pale (0)', value: 0 },
        { label: 'Acrocyanosis (1)', value: 1 },
        { label: 'Pink (2)', value: 2 },
      ]),
      selectInput('pulse', 'Pulse', [
        { label: 'Absent (0)', value: 0 },
        { label: '<100 (1)', value: 1 },
        { label: '≥100 (2)', value: 2 },
      ]),
      selectInput('grimace', 'Grimace (reflex)', [
        { label: 'None (0)', value: 0 },
        { label: 'Grimace (1)', value: 1 },
        { label: 'Cry/cough/sneeze (2)', value: 2 },
      ]),
      selectInput('activity', 'Activity (tone)', [
        { label: 'Limp (0)', value: 0 },
        { label: 'Some flexion (1)', value: 1 },
        { label: 'Active motion (2)', value: 2 },
      ]),
      selectInput('respiration', 'Respiration', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Slow/irregular (1)', value: 1 },
        { label: 'Good cry (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score = num(values.appearance) + num(values.pulse) + num(values.grimace) + num(values.activity) + num(values.respiration);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'critical', label: 'Critically low', interpretation: '0–3: severely depressed — ongoing NRP resuscitation.' },
        { max: 6, level: 'high', label: 'Moderately abnormal', interpretation: '4–6: moderately depressed — support as needed; reassess frequently.' },
        { max: 10, level: 'low', label: 'Reassuring', interpretation: '7–10: reassuring transition. Continue routine care if stable.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'APGAR: Appearance, Pulse, Grimace, Activity, Respiration (0–2 each).',
      validation: 'Virginia Apgar 1953; universal perinatal standard.',
      references: [{ title: 'A proposal for a new method of evaluation of the newborn infant', citation: 'Apgar V. Curr Res Anesth Analg. 1953', year: 1953, pmid: '13083014' }],
    },
    nextSteps: [
      { condition: 'Score <7 at 5 min', actions: ['Continue NRP', 'Repeat q5 min', 'Investigate etiology'] },
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
        { label: 'Closed (0)', value: 0 },
        { label: '1–2 (1)', value: 1 },
        { label: '3–4 (2)', value: 2 },
        { label: '≥5 (3)', value: 3 },
      ]),
      selectInput('effacement', 'Effacement %', [
        { label: '0–30 (0)', value: 0 },
        { label: '40–50 (1)', value: 1 },
        { label: '60–70 (2)', value: 2 },
        { label: '≥80 (3)', value: 3 },
      ]),
      selectInput('station', 'Station', [
        { label: '−3 (0)', value: 0 },
        { label: '−2 (1)', value: 1 },
        { label: '−1 / 0 (2)', value: 2 },
        { label: '+1 / +2 (3)', value: 3 },
      ]),
      selectInput('consistency', 'Consistency', [
        { label: 'Firm (0)', value: 0 },
        { label: 'Medium (1)', value: 1 },
        { label: 'Soft (2)', value: 2 },
      ]),
      selectInput('position', 'Position', [
        { label: 'Posterior (0)', value: 0 },
        { label: 'Mid (1)', value: 1 },
        { label: 'Anterior (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score = num(values.dilation) + num(values.effacement) + num(values.station) + num(values.consistency) + num(values.position);
      const r = riskFromThresholds(score, [
        { max: 5, level: 'moderate', label: 'Unfavorable cervix', interpretation: 'Bishop ≤5: unfavorable — consider cervical ripening before oxytocin induction.' },
        { max: 13, level: 'low', label: 'Favorable cervix', interpretation: 'Bishop ≥6–8: more favorable for induction success.' },
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
    whenToUse: 'Dating pregnancy when LMP known (ultrasound preferred early).',
    whyUse: 'Naegele’s rule standard estimate.',
    inputs: [
      numberInput('lmpYear', 'LMP year', { min: 2020, max: 2030, defaultValue: 2026 }),
      numberInput('lmpMonth', 'LMP month', { min: 1, max: 12, defaultValue: 1 }),
      numberInput('lmpDay', 'LMP day', { min: 1, max: 31, defaultValue: 1 }),
      numberInput('refYear', 'Reference year (today)', { min: 2020, max: 2030, defaultValue: 2026 }),
      numberInput('refMonth', 'Reference month', { min: 1, max: 12, defaultValue: 7 }),
      numberInput('refDay', 'Reference day', { min: 1, max: 31, defaultValue: 23 }),
    ],
    calculate(values) {
      const lmp = new Date(num(values.lmpYear), num(values.lmpMonth) - 1, num(values.lmpDay));
      const ref = new Date(num(values.refYear), num(values.refMonth) - 1, num(values.refDay));
      const days = Math.round((ref.getTime() - lmp.getTime()) / 86400000);
      const weeks = Math.floor(days / 7);
      const rem = days % 7;
      const edd = new Date(lmp);
      edd.setDate(edd.getDate() + 280);
      const eddStr = edd.toISOString().slice(0, 10);
      return {
        score: `${weeks}+${rem}`,
        label: 'Gestational age',
        interpretation: `Approximately ${weeks} weeks + ${rem} days. EDD (Naegele): ${eddStr}. Confirm with ultrasound dating.`,
        riskLevel: 'info',
        details: [
          { label: 'Days since LMP', value: String(days) },
          { label: 'EDD', value: eddStr },
        ],
      };
    },
    evidence: {
      summary: 'EDD = LMP + 280 days (Naegele: +1 year −3 months +7 days).',
      validation: 'Standard obstetric dating; first-trimester US more accurate if LMP uncertain.',
      references: [{ title: 'Naegele\'s rule and the length of pregnancy - A review', citation: 'Lawson GW. Aust N Z J Obstet Gynaecol. 2021 (review of Naegele\'s rule)', year: 2021, pmid: '33079400',
          doi: '10.1111/ajo.13253', }],
    },
    nextSteps: [{ condition: 'Dating', actions: ['Offer dating ultrasound if uncertain LMP', 'Prenatal care schedule'] }],
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
        { label: 'None (0)', value: 0 },
        { label: 'With agitation (1)', value: 1 },
        { label: 'At rest (2)', value: 2 },
      ]),
      selectInput('retract', 'Retractions', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate (2)', value: 2 },
        { label: 'Severe (3)', value: 3 },
      ]),
      selectInput('airEntry', 'Air entry', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Decreased (1)', value: 1 },
        { label: 'Markedly decreased (2)', value: 2 },
      ]),
      selectInput('cyanosis', 'Cyanosis', [
        { label: 'None (0)', value: 0 },
        { label: 'With agitation (4)', value: 4 },
        { label: 'At rest (5)', value: 5 },
      ]),
      selectInput('consciousness', 'Level of consciousness', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Altered (5)', value: 5 },
      ]),
    ],
    calculate(values) {
      const score = num(values.stridor) + num(values.retract) + num(values.airEntry) + num(values.cyanosis) + num(values.consciousness);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Mild', interpretation: 'Mild croup — outpatient dexamethasone often sufficient.' },
        { max: 5, level: 'moderate', label: 'Moderate', interpretation: 'Moderate — dexamethasone; observe; consider nebulized epinephrine.' },
        { max: 17, level: 'high', label: 'Severe', interpretation: 'Severe — nebulized epinephrine, dexamethasone, close airway monitoring.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Westley score 0–17 used in croup research and clinical severity grading.',
      validation: 'Standard in pediatric emergency literature.',
      references: [{ title: 'A scoring system for croup', citation: 'Westley CR et al. Am J Dis Child. 1978', year: 1978, pmid: '347921',
          doi: '10.1001/archpedi.1978.02120300044008', }],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['Dexamethasone 0.15–0.6 mg/kg', 'Supportive care'] },
      { condition: 'Moderate–severe', actions: ['Dexamethasone', 'Nebulized epinephrine', 'Observe for rebound', 'Airway preparedness'] },
    ],
  },
  {
    id: 'pecarn-head',
    name: 'PECARN Head Injury (Simplified)',
    shortName: 'PECARN',
    description: 'Pediatric head trauma CT decision support (simplified branch).',
    category: 'pediatrics',
    tags: ['head injury', 'ct', 'pecarn'],
    whenToUse: 'Children with minor blunt head trauma (GCS 14–15).',
    whyUse: 'Identifies very low risk for ciTBI who may avoid CT.',
    inputs: [
      selectInput('ageGroup', 'Age group', [
        { label: '<2 years', value: 'young' },
        { label: '≥2 years', value: 'old' },
      ]),
      yesNo('gcs14', 'GCS = 14 or other signs of AMS', 2),
      yesNo('palpable', 'Palpable skull fracture (or basilar signs if ≥2y)', 2),
      yesNo('loc', 'LOC ≥5 sec (<2y) or any LOC/vomiting/severe HA/severe mechanism (≥2y) — risk factors'),
      yesNo('nonfrontal', 'Non-frontal hematoma (<2y) or history of vomiting/severe HA etc.'),
      yesNo('notActing', 'Not acting normally per parent (<2y)'),
    ],
    calculate(values) {
      const ageGroup = String(values.ageGroup ?? 'young');
      const ageLabel = ageGroup === 'young' ? '<2 years' : '≥2 years';
      const details = [
        { label: 'Age group', value: ageLabel },
        { label: 'AMS / GCS 14', value: bool(values.gcs14) ? 'Yes' : 'No' },
        { label: 'Palpable / basilar fracture signs', value: bool(values.palpable) ? 'Yes' : 'No' },
        {
          label: ageGroup === 'young' ? 'LOC ≥5 s / severe mechanism' : 'LOC / vomiting / severe HA / severe mechanism',
          value: bool(values.loc) ? 'Yes' : 'No',
        },
        {
          label: ageGroup === 'young' ? 'Non-frontal hematoma' : 'Vomiting / severe HA (additional)',
          value: bool(values.nonfrontal) ? 'Yes' : 'No',
        },
        { label: 'Not acting normally (parent, <2y)', value: bool(values.notActing) ? 'Yes' : 'No' },
      ];

      if (bool(values.gcs14) || bool(values.palpable)) {
        return {
          score: 2,
          label: 'Higher risk — CT recommended',
          interpretation: `${ageLabel}: AMS or palpable/basilar fracture signs — CT generally recommended per PECARN high-risk branch.`,
          riskLevel: 'high',
          details,
        };
      }
      // Age-specific intermediate features (simplified PECARN branches)
      const intermediate =
        ageGroup === 'young'
          ? bool(values.loc) || bool(values.nonfrontal) || bool(values.notActing)
          : bool(values.loc) || bool(values.nonfrontal);
      // notActing is primarily a <2y criterion; still surface for ≥2y if selected as caregiver concern
      if (intermediate || (ageGroup === 'old' && bool(values.notActing))) {
        return {
          score: 1,
          label: 'Intermediate — observation vs CT',
          interpretation: `${ageLabel}: Intermediate PECARN risk features — observation vs CT with shared decision-making.`,
          riskLevel: 'moderate',
          details,
        };
      }
      return {
        score: 0,
        label: 'Very low risk',
        interpretation: `${ageLabel}: No PECARN predictors — ciTBI risk very low; CT not routinely recommended.`,
        riskLevel: 'low',
        details,
      };
    },
    evidence: {
      summary: 'PECARN rules for children <2 and ≥2 years predict clinically important TBI with very high NPV.',
      validation: 'Large multicenter cohort; widely adopted in pediatric EM.',
      references: [{ title: 'Identification of children at very low risk of ciTBI', citation: 'Kuppermann N et al. Lancet. 2009', year: 2009, pmid: '19758692',
          doi: '10.1016/S0140-6736(09)61558-0', }],
    },
    nextSteps: [
      { condition: 'Very low risk', actions: ['No routine CT', 'Return precautions'] },
      { condition: 'Intermediate', actions: ['Observation vs CT (shared decision-making)'] },
      { condition: 'Higher risk', actions: ['CT head', 'Neurosurgery if positive'] },
    ],
  },
  {
    id: 'wells-hit',
    name: '4Ts Score for HIT',
    shortName: '4Ts HIT',
    description: 'Pretest probability of heparin-induced thrombocytopenia.',
    category: 'hematology',
    tags: ['hit', 'heparin', 'thrombocytopenia'],
    whenToUse: 'Thrombocytopenia in patients receiving heparin.',
    whyUse: 'Guides whether to order HIT antibody testing and stop heparin.',
    inputs: [
      selectInput('thrombocytopenia', 'Thrombocytopenia', [
        { label: 'Platelet fall >50% and nadir ≥20 (2)', value: 2 },
        { label: 'Fall 30–50% or nadir 10–19 (1)', value: 1 },
        { label: 'Fall <30% or nadir <10 (0)', value: 0 },
      ]),
      selectInput('timing', 'Timing of platelet fall', [
        { label: 'Clear day 5–10 or ≤1 day with prior heparin ≤30d (2)', value: 2 },
        { label: 'Consistent but not clear / >10d / ≤1d with heparin 30–100d (1)', value: 1 },
        { label: 'Fall ≤4d without recent heparin (0)', value: 0 },
      ]),
      selectInput('thrombosis', 'Thrombosis or other sequelae', [
        { label: 'New thrombosis / skin necrosis / acute systemic reaction (2)', value: 2 },
        { label: 'Progressive/recurrent thrombosis / suspected (1)', value: 1 },
        { label: 'None (0)', value: 0 },
      ]),
      selectInput('other', 'Other causes of thrombocytopenia', [
        { label: 'None apparent (2)', value: 2 },
        { label: 'Possible (1)', value: 1 },
        { label: 'Definite (0)', value: 0 },
      ]),
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
      yesNo('cancer', 'Active cancer', 3),
      yesNo('priorVte', 'Previous VTE (excluding superficial)', 3),
      yesNo('reducedMob', 'Reduced mobility', 3),
      yesNo('thrombophilia', 'Known thrombophilic condition', 3),
      yesNo('recentTrauma', 'Recent trauma and/or surgery (≤1 month)', 2),
      yesNo('age70', 'Age ≥ 70', 1),
      yesNo('heartLung', 'Heart and/or respiratory failure', 1),
      yesNo('acuteMiStroke', 'Acute MI or ischemic stroke', 1),
      yesNo('infectionRheum', 'Acute infection and/or rheumatologic disorder', 1),
      yesNo('obesity', 'Obesity (BMI ≥30)', 1),
      yesNo('hormone', 'Ongoing hormonal treatment', 1),
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
    description: 'Surgical patient VTE risk stratification (selected items).',
    category: 'hematology',
    tags: ['vte', 'surgery', 'prophylaxis'],
    whenToUse: 'Perioperative VTE risk assessment.',
    whyUse: 'Widely used in surgical pathways for prophylaxis intensity.',
    inputs: [
      yesNo('age41', 'Age 41–60 (1)', 1),
      yesNo('age61', 'Age 61–74 (2)', 2),
      yesNo('age75', 'Age ≥75 (3)', 3),
      yesNo('minorSurg', 'Minor surgery (1)', 1),
      yesNo('majorSurg', 'Major surgery >45 min (2)', 2),
      yesNo('bmi25', 'BMI ≥25 (1)', 1),
      yesNo('swollenLegs', 'Swollen legs (1)', 1),
      yesNo('varicose', 'Varicose veins (1)', 1),
      yesNo('pregnancy', 'Pregnancy/postpartum (1)', 1),
      yesNo('historyIbd', 'History of IBD (1)', 1),
      yesNo('priorVte', 'History of VTE (3)', 3),
      yesNo('familyVte', 'Family history of VTE (3)', 3),
      yesNo('thrombophilia', 'Positive Factor V Leiden / prothrombin / high homocysteine etc. (3)', 3),
      yesNo('cancer', 'Malignancy (2)', 2),
      yesNo('bedrest', 'Medical patient bedrest (1)', 1),
      yesNo('hip', 'Elective major lower extremity arthroplasty (5)', 5),
      yesNo('hipFracture', 'Hip, pelvis, or leg fracture (5)', 5),
      yesNo('stroke', 'Acute spinal cord injury / stroke <1 mo (5)', 5),
    ],
    calculate(values) {
      // Note: age options should be mutually exclusive in practice
      let score = 0;
      const items: [string, number][] = [
        ['age41', 1], ['age61', 2], ['age75', 3], ['minorSurg', 1], ['majorSurg', 2],
        ['bmi25', 1], ['swollenLegs', 1], ['varicose', 1], ['pregnancy', 1], ['historyIbd', 1],
        ['priorVte', 3], ['familyVte', 3], ['thrombophilia', 3], ['cancer', 2], ['bedrest', 1],
        ['hip', 5], ['hipFracture', 5], ['stroke', 5],
      ];
      items.forEach(([k, p]) => {
        if (bool(values[k])) score += p;
      });
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Very low / low', interpretation: 'Early ambulation ± mechanical prophylaxis.' },
        { max: 2, level: 'low', label: 'Low–moderate', interpretation: 'Mechanical ± pharmacologic prophylaxis per procedure.' },
        { max: 4, level: 'moderate', label: 'Moderate', interpretation: 'Pharmacologic prophylaxis typically indicated unless bleeding risk high.' },
        { max: 50, level: 'high', label: 'High', interpretation: 'High risk — pharmacologic + mechanical prophylaxis often recommended.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Caprini risk assessment model assigns points to VTE risk factors for surgical patients.',
      validation: 'Validated across surgical specialties; prophylaxis thresholds protocol-dependent.',
      references: [{ title: 'Thrombosis risk assessment as a guide to quality patient care', citation: 'Caprini JA. Dis Mon. 2005', year: 2005, pmid: '15900257',
          doi: '10.1016/j.disamonth.2005.02.003', }],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['LMWH/heparin + SCDs often', 'Extended prophylaxis after some orthopedic cases'] },
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
      yesNo('snore', 'Snoring loudly', 1),
      yesNo('tired', 'Tired/daytime sleepiness', 1),
      yesNo('observed', 'Observed apnea', 1),
      yesNo('pressure', 'Pressure (treated HTN)', 1),
      yesNo('bmi', 'BMI > 35', 1),
      yesNo('age', 'Age > 50', 1),
      yesNo('neck', 'Neck circumference large (>40 cm / 16 in)', 1),
      yesNo('gender', 'Gender male', 1),
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
      references: [{ title: 'STOP questionnaire', citation: 'Chung F et al. Anesthesiology. 2008', year: 2008, pmid: '18431116',
          doi: '10.1097/ALN.0b013e31816d83e4', }],
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
        'Sitting inactive in public',
        'As a passenger for 1 hour',
        'Lying down to rest in afternoon',
        'Sitting and talking to someone',
        'Sitting quietly after lunch (no alcohol)',
        'In car, stopped in traffic for minutes',
      ].map((label, i) =>
        selectInput(`q${i + 1}`, label, [
          { label: 'Would never doze (0)', value: 0 },
          { label: 'Slight chance (1)', value: 1 },
          { label: 'Moderate chance (2)', value: 2 },
          { label: 'High chance (3)', value: 3 },
        ])
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
      ]),
      selectInput('obstruction', 'FEV1 % predicted', [
        { label: '≥65% (0)', value: 0 },
        { label: '50–64% (1)', value: 1 },
        { label: '36–49% (2)', value: 2 },
        { label: '≤35% (3)', value: 3 },
      ]),
      selectInput(
        'dyspnea',
        'mMRC dyspnea',
        [
          {
            label: '0–1 (0)',
            value: 0,
            description:
              'Grade 0: breathless only with strenuous exercise. Grade 1: short of breath hurrying on the level or walking up a slight hill. Both collapse to 0 BODE points.',
          },
          {
            label: '2 (1)',
            value: 1,
            description:
              'Grade 2: walks slower than same-age peers on the level because of breathlessness, or has to stop for breath when walking at own pace on the level.',
          },
          {
            label: '3 (2)',
            value: 2,
            description:
              'Grade 3: stops for breath after walking about 100 m or after a few minutes on the level.',
          },
          {
            label: '4 (3)',
            value: 3,
            description:
              'Grade 4: too breathless to leave the house, or breathless when dressing or undressing.',
          },
        ],
        0,
        'Modified MRC (mMRC). Pick the worst applicable grade (0–4), then select that grade’s BODE point bin. Grades 0 and 1 are different questions that share 0 BODE points.',
      ),
      selectInput('exercise', '6-minute walk distance', [
        { label: '≥350 m (0)', value: 0 },
        { label: '250–349 m (1)', value: 1 },
        { label: '150–249 m (2)', value: 2 },
        { label: '≤149 m (3)', value: 3 },
      ]),
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
    pearls: [
      'mMRC grade 0 = breathless only with strenuous exercise; grade 1 = SOB hurrying on the level or walking up a slight hill — both are 0 BODE points.',
      'Grade 2 = slower than same-age peers or stops at own pace; grade 3 = stops after ~100 m or a few minutes on the level; grade 4 = too breathless to leave the house or breathless dressing/undressing.',
      'Pick the worst applicable mMRC grade, then the BODE bin: 0–1 → 0 pts, 2 → 1, 3 → 2, 4 → 3.',
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
      numberInput('dose', 'Current dose', { unit: 'mg', min: 0.1, max: 1000, step: 0.5, defaultValue: 20 }),
      // Relative glucocorticoid potency vs hydrocortisone = 1.
      // From classic equivalents: HC 20 = cortisone 25 = pred 5 = methylpred/triamcinolone 4 = dex/beta 0.75 mg.
      // potency = 20 / equivalent_dose_mg  →  dex/beta = 20/0.75 ≈ 26.667 (not the rounded "25" used in some tables).
      selectInput('from', 'From steroid', [
        { label: 'Hydrocortisone', value: 1 },
        { label: 'Cortisone', value: 0.8 },
        { label: 'Prednisone / Prednisolone', value: 4 },
        { label: 'Methylprednisolone', value: 5 },
        { label: 'Triamcinolone', value: 5 },
        { label: 'Dexamethasone', value: 20 / 0.75 },
        { label: 'Betamethasone', value: 20 / 0.75 },
      ]),
      selectInput('to', 'To steroid', [
        { label: 'Hydrocortisone', value: 1 },
        { label: 'Cortisone', value: 0.8 },
        { label: 'Prednisone / Prednisolone', value: 4 },
        { label: 'Methylprednisolone', value: 5 },
        { label: 'Triamcinolone', value: 5 },
        { label: 'Dexamethasone', value: 20 / 0.75 },
        { label: 'Betamethasone', value: 20 / 0.75 },
      ]),
    ],
    calculate(values) {
      const dose = num(values.dose, 20);
      const from = num(values.from, 4);
      const to = num(values.to, 1);
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
    whenToUse: 'Assessing opioid dose intensity and overdose risk.',
    whyUse: 'CDC thresholds (e.g., ≥50 MME/day) flag higher risk.',
    inputs: [
      numberInput('dose', 'Dose per administration', { unit: 'mg', min: 0, max: 1000, step: 0.5, defaultValue: 10 }),
      numberInput('freq', 'Doses per day', { min: 1, max: 24, defaultValue: 3 }),
      selectInput('opioid', 'Opioid', [
        { label: 'Morphine', value: 1 },
        { label: 'Hydrocodone', value: 1 },
        { label: 'Oxycodone', value: 1.5 },
        { label: 'Oxymorphone', value: 3 },
        { label: 'Hydromorphone', value: 4 },
        { label: 'Codeine', value: 0.15 },
        { label: 'Tramadol', value: 0.1 },
        { label: 'Tapentadol', value: 0.4 },
        { label: 'Fentanyl patch (mcg/hr → special)', value: 2.4 },
        { label: 'Methadone (complex — approx 4–12)', value: 4 },
      ]),
    ],
    calculate(values) {
      const daily = num(values.dose, 10) * num(values.freq, 3);
      const factor = num(values.opioid, 1);
      const mme = round(daily * factor, 1);
      const r = riskFromThresholds(mme, [
        { max: 49, level: 'moderate', label: 'Lower CDC threshold band', interpretation: 'Still risk of OD; use caution, naloxone co-prescribing as appropriate.' },
        { max: 89, level: 'high', label: '≥50 MME/day', interpretation: 'Increased overdose risk per CDC — justify benefit, offer naloxone, avoid concurrent benzos.' },
        { max: 10000, level: 'critical', label: '≥90 MME/day', interpretation: 'High-dose opioid therapy — reassess necessity; specialist involvement often warranted.' },
      ]);
      return {
        score: mme,
        unit: 'MME/day',
        ...r,
        details: [{ label: 'Note', value: 'Methadone/fentanyl conversions are complex; verify with CDC table' }],
      };
    },
    evidence: {
      summary: 'MME uses CDC conversion factors to standardize opioid intensity.',
      validation: 'Public health tool for risk; not exact equianalgesia for switching (use caution).',
      references: [{ title: 'CDC Clinical Practice Guideline for Prescribing Opioids', citation: 'Dowell D et al. MMWR. 2022', year: 2022, pmid: '36327391',
          doi: '10.15585/mmwr.rr7103a1', }],
    },
    nextSteps: [
      { condition: '≥50 MME', actions: ['Offer naloxone', 'Avoid benzodiazepines', 'Reassess pain plan', 'Consider taper if harm outweighs benefit'] },
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
      numberInput('total', 'Total phenytoin', { unit: 'µg/mL', min: 0, max: 50, step: 0.1, defaultValue: 10 }),
      numberInput('alb', 'Albumin', { unit: 'g/dL', min: 1, max: 5, step: 0.1, defaultValue: 2.5 }),
      yesNo('esrd', 'ESRD / CrCl <20 (use 0.1 binding factor)', 0),
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
      references: [{ title: 'The clinical pharmacokinetics of phenytoin', citation: 'Sheiner-Tozer equation clinical pharmacy references', year: 1977, pmid: '599408',
          doi: '10.1007/BF01059685', }],
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
      numberInput('iron', 'Serum iron', { unit: 'µg/dL', min: 0, max: 500, defaultValue: 60 }),
      numberInput('tibc', 'TIBC', { unit: 'µg/dL', min: 50, max: 600, defaultValue: 300 }),
    ],
    calculate(values) {
      const iron = num(values.iron, 60);
      const tibc = num(values.tibc, 300);
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
    whenToUse: 'Planning correction of hypo/hypernatremia with IV fluids.',
    whyUse: 'Estimates ΔNa per liter to avoid overcorrection.',
    inputs: [
      numberInput('serumNa', 'Serum Na', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 120 }),
      numberInput('infusateNa', 'Infusate Na', { unit: 'mEq/L', min: 0, max: 513, defaultValue: 154, helpText: 'D5W=0, 0.45%NaCl=77, NS=154, 3%=513' }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 20, max: 200, defaultValue: 70 }),
      selectInput('tbwFactor', 'TBW factor', [
        { label: 'Young man 0.6', value: 0.6 },
        { label: 'Young woman / elderly man 0.5', value: 0.5 },
        { label: 'Elderly woman 0.45', value: 0.45 },
      ]),
    ],
    calculate(values) {
      const sNa = num(values.serumNa, 120);
      const iNa = num(values.infusateNa, 154);
      const tbw = num(values.weight, 70) * num(values.tbwFactor, 0.5);
      const delta = round((iNa - sNa) / (tbw + 1), 2);
      return {
        score: delta,
        unit: 'mEq/L per L',
        label: 'Predicted ΔNa per liter',
        interpretation: `Each liter of infusate changes Na by ~${delta} mEq/L. Limit correction (often ≤8–10 mEq/L/day in chronic hyponatremia) to reduce ODS risk.`,
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Adrogué-Madias: ΔNa = (infusate Na − serum Na) / (TBW + 1).',
      validation: 'Widely taught; actual change varies with ongoing losses/ADH.',
      references: [{ title: 'Hyponatremia', citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000', year: 2000, pmid: '10824078',
          doi: '10.1056/NEJM200005253422107', }],
    },
    nextSteps: [
      { condition: 'Severe symptomatic hyponatremia', actions: ['100 mL 3% saline boluses per guidelines', 'Frequent Na monitoring'] },
    ],
  },
];
