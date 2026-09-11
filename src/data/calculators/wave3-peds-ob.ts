import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave3PedsObCalcs: Calculator[] = [
  {
    id: 'new-ballard',
    name: 'New Ballard Score (Gestational Age)',
    shortName: 'New Ballard',
    description:
      'Estimates gestational age from neuromuscular and physical maturity domains, or interprets a pre-summed total score.',
    category: 'pediatrics',
    tags: ['neonate', 'gestational age', 'ballard', 'maturity', 'newborn'],
    whenToUse: 'Newborns when menstrual dating is uncertain and physical/neuromuscular maturity assessment is used.',
    whyUse: 'Standard bedside maturity score mapping total points to approximate weeks of gestation.',
    inputs: [
      selectInput('mode', 'Input mode', [
        { label: 'Enter total score only', value: 'total' },
        { label: 'Sum simplified domains', value: 'domains' },
      ], 'total', 'Use domain sum to score each item at the bedside. Use total if you already summed an official illustrated New Ballard sheet (including tightly fused lids = −2).'),
      numberInput('totalScore', 'Total New Ballard score (if known)', {
        min: -10,
        max: 50,
        defaultValue: 30,
        helpText: 'Used when mode = total. Typical range −10 to 50. Prefer the official pictorial sheet when available.',
        required: false,
      }),
      selectInput('posture', 'Posture (preferred rest posture)', [
        { label: 'Fully extended (0)', value: 0, description: 'Arms and legs completely extended at rest' },
        { label: 'Slight flexion (1)', value: 1, description: 'Beginning flexion of hips/knees; arms still relatively extended' },
        { label: 'Moderate flexion (2)', value: 2, description: 'Moderate hip/knee flexion; some arm flexion' },
        { label: 'Flexion arms/hips (3)', value: 3, description: 'Arms flexed; hips and knees well flexed' },
        { label: 'Full flexion (4)', value: 4, description: 'Full flexion of arms and legs (term frog-leg posture); does not relax from this posture' },
      ], 0, 'Infant supine, head midline. Wait for the preferred rest posture (do not force). Score total-body flexor tone at rest.'),
      selectInput('squareWindow', 'Square window (wrist angle)', [
        { label: '>90° (−1)', value: -1, description: 'Palm-to-forearm angle >90°' },
        { label: '90° (0)', value: 0, description: 'Palm-to-forearm angle 90°' },
        { label: '60° (1)', value: 1, description: 'Palm-to-forearm angle ~60°' },
        { label: '45° (2)', value: 2, description: 'Palm-to-forearm angle ~45°' },
        { label: '30° (3)', value: 3, description: 'Palm-to-forearm angle ~30°' },
        { label: '0° (4)', value: 4, description: 'Palm flat against forearm (0°)' },
      ], -1, 'Straighten the fingers. Apply gentle pressure on the dorsum of the hand toward the forearm. Measure the angle between the palm and the ventral forearm (not the fingers).'),
      selectInput('armRecoil', 'Arm recoil (elbow angle after release)', [
        { label: '180° (0)', value: 0, description: 'No recoil; arms stay fully extended' },
        { label: '140–180° (1)', value: 1, description: 'Recoil to 140–180° at the elbow' },
        { label: '110–140° (2)', value: 2, description: 'Recoil to 110–140°' },
        { label: '90–110° (3)', value: 3, description: 'Recoil to 90–110° (official exclusive bin; not overlapping <90°)' },
        { label: '<90° (4)', value: 4, description: 'Brisk recoil to <90°' },
      ], 0, 'Supine. Flex both arms for ~5 s, then fully extend and immediately release. Score the angle of elbow recoil (passive biceps tone). Use the more mature (more flexed) arm if asymmetric.'),
      selectInput('popliteal', 'Popliteal angle', [
        { label: '180° (−1)', value: -1, description: 'Knee fully extendable; no resistance' },
        { label: '160° (0)', value: 0, description: 'Angle behind the knee ~160°' },
        { label: '140° (1)', value: 1, description: 'Angle behind the knee ~140°' },
        { label: '120° (2)', value: 2, description: 'Angle behind the knee ~120°' },
        { label: '100° (3)', value: 3, description: 'Angle behind the knee ~100°' },
        { label: '90° (4)', value: 4, description: 'Angle behind the knee ~90°' },
        { label: '<90° (5)', value: 5, description: 'Cannot extend to 90°' },
      ], -1, 'Thigh flexed beside the abdomen (knee to chest). Hold the thigh and extend the lower leg until resistance. Measure the angle behind the knee (popliteal angle). Do not force past resistance.'),
      selectInput('scarf', 'Scarf sign (elbow vs chest landmarks)', [
        { label: 'Elbow past midline (−1)', value: -1, description: 'Elbow crosses the midline (very little resistance)' },
        { label: 'Elbow to midline (0)', value: 0, description: 'Elbow reaches the midline' },
        { label: 'Elbow to contralateral nipple (1)', value: 1, description: 'Elbow reaches the opposite nipple' },
        { label: 'Elbow to ipsilateral nipple (2)', value: 2, description: 'Elbow reaches the same-side nipple' },
        { label: 'Elbow does not reach midline (3)', value: 3, description: 'Elbow falls short of the midline' },
        { label: 'Elbow does not reach axillary line (4)', value: 4, description: 'Elbow does not reach the ipsilateral axillary line' },
      ], -1, 'Draw the infant’s hand around the neck toward the opposite shoulder (scarf). Note where the elbow lands relative to midline, nipples, and axillary line. Do not force past resistance.'),
      selectInput('heelToEar', 'Heel to ear (foot toward ipsilateral ear)', [
        { label: 'Toes to ear (−1)', value: -1, description: 'Foot reaches the ear; little or no resistance' },
        { label: 'Near ear (0)', value: 0, description: 'Heel approaches the ear' },
        { label: 'Heel toward chin/neck; moderate resistance (1)', value: 1, description: 'Heel reaches face/chin/neck region; noticeable resistance' },
        { label: 'Heel near chest (2)', value: 2, description: 'Heel reaches the chest / nipple line' },
        { label: 'Heel near umbilicus (3)', value: 3, description: 'Heel reaches about the umbilicus' },
        { label: 'Heel near pubis (4)', value: 4, description: 'Significant resistance; heel only to pubis / does not reach far' },
      ], -1, 'Draw the foot toward the ipsilateral ear without forcing. Keep the pelvis on the bed. Score by heel position plus resistance — do not tear tissues or lift the hips off the mattress.'),
      selectInput('skin', 'Skin (physical)', [
        { label: 'Sticky/transparent (−1)', value: -1, description: 'Sticky, friable, transparent' },
        { label: 'Gelatinous/red (0)', value: 0, description: 'Gelatinous, red, translucent' },
        { label: 'Smooth/pink, visible veins (1)', value: 1, description: 'Smooth pink; veins visible' },
        { label: 'Superficial peeling (2)', value: 2, description: 'Superficial peeling and/or rash; few veins' },
        { label: 'Cracking/pale areas (3)', value: 3, description: 'Cracking; pale areas; rare veins' },
        { label: 'Parchment/deep cracking (4)', value: 4, description: 'Parchment; deep cracking; no vessels' },
        { label: 'Leathery/cracked/wrinkled (5)', value: 5, description: 'Leathery, cracked, wrinkled' },
      ], -1, 'Inspect the trunk (abdomen/chest), not just the extremities. IUGR and maternal diabetes can alter skin maturity.'),
      selectInput('lanugo', 'Lanugo', [
        { label: 'None (−1)', value: -1, description: 'No lanugo (extremely premature)' },
        { label: 'Sparse (0)', value: 0, description: 'Sparse lanugo' },
        { label: 'Abundant (1)', value: 1, description: 'Abundant lanugo over the back' },
        { label: 'Thinning (2)', value: 2, description: 'Thinning lanugo' },
        { label: 'Bald areas (3)', value: 3, description: 'Bald areas appear' },
        { label: 'Mostly bald (4)', value: 4, description: 'Mostly bald' },
      ], -1, 'Score lanugo on the back. Very premature infants may have none; mature infants are mostly bald.'),
      selectInput('plantar', 'Plantar surface', [
        { label: 'Heel-toe <40 mm (−2)', value: -2, description: 'Heel–toe length <40 mm (no creases needed)' },
        { label: 'Heel-toe 40–50 mm (−1)', value: -1, description: 'Heel–toe 40–50 mm' },
        { label: '>50 mm no crease (0)', value: 0, description: 'Heel–toe >50 mm; no crease' },
        { label: 'Faint red marks (1)', value: 1, description: 'Faint red marks only' },
        { label: 'Anterior transverse crease only (2)', value: 2, description: 'Anterior transverse crease only' },
        { label: 'Creases anterior 2/3 (3)', value: 3, description: 'Creases on the anterior two-thirds of the sole' },
        { label: 'Creases over entire sole (4)', value: 4, description: 'Creases over the entire sole' },
      ], -2, 'If the foot is small, measure heel-to-toe length first (<40 mm = −2; 40–50 mm = −1). Otherwise score plantar creases.'),
      selectInput('breast', 'Breast', [
        { label: 'Imperceptible (−1)', value: -1, description: 'No breast tissue palpable' },
        { label: 'Barely perceptible (0)', value: 0, description: 'Barely perceptible breast tissue' },
        { label: 'Flat areola, no bud (1)', value: 1, description: 'Flat areola; no bud' },
        { label: 'Stippled areola, 1–2 mm bud (2)', value: 2, description: 'Stippled areola; 1–2 mm bud' },
        { label: 'Raised areola, 3–4 mm bud (3)', value: 3, description: 'Raised areola; 3–4 mm bud' },
        { label: 'Full areola, 5–10 mm bud (4)', value: 4, description: 'Full areola; 5–10 mm bud' },
      ], -1, 'Palpate the breast bud between finger and thumb and estimate diameter (mm). Note whether the areola is flat, stippled, raised, or full.'),
      selectInput('eyeEar', 'Eye / ear (lids and pinna recoil)', [
        { label: 'Lids fused loosely (−1) / tightly (−2)', value: -1, description: 'Lids fused. Official New Ballard: tightly fused = −2, loosely fused = −1. This simplified choice scores −1 for any fused lids — if lids are tightly fused, enter the official total instead.' },
        { label: 'Lids open; pinna flat stays folded (0)', value: 0, description: 'Lids open; pinna flat and stays folded' },
        { label: 'Slightly curved pinna; soft; slow recoil (1)', value: 1, description: 'Slightly curved pinna; soft; slow recoil after folding' },
        { label: 'Well-curved pinna; soft but ready recoil (2)', value: 2, description: 'Well-curved pinna; soft but ready recoil' },
        { label: 'Formed & firm; instant recoil (3)', value: 3, description: 'Formed and firm; instant recoil' },
        { label: 'Thick cartilage; ear stiff (4)', value: 4, description: 'Thick cartilage; ear stiff' },
      ], -1, 'Fold the pinna toward the face and release; time recoil. Tightly fused lids officially score −2 (not a separate value here). If lids are tightly fused, use “Enter total score only” from the official sheet.'),
      selectInput('genitals', 'Genitals (score male or female findings for the same point)', [
        { label: '−1 — Very premature', value: -1, description: 'Male: scrotum flat, smooth. Female: clitoris prominent, labia flat' },
        { label: '0 — Early', value: 0, description: 'Male: scrotum empty, faint rugae. Female: prominent clitoris, small labia minora' },
        { label: '1 — Developing', value: 1, description: 'Male: testes in upper canal, rare rugae. Female: prominent clitoris, enlarging minora' },
        { label: '2 — Maturing', value: 2, description: 'Male: testes descending, few rugae. Female: majora and minora equally prominent' },
        { label: '3 — Near term', value: 3, description: 'Male: testes down, good rugae. Female: majora large, minora small' },
        { label: '4 — Term', value: 4, description: 'Male: testes pendulous, deep rugae. Female: majora cover clitoris and minora' },
      ], -1, 'Use the sex-specific official pair for the same point. Male: scrotum/testes/rugae (if true cryptorchidism, score the normal side or match other maturity items). Female: clitoris vs labia minora/majora. Do not mix male and female descriptors across points.'),
    ],
    calculate(values) {
      const mode = String(values.mode ?? 'total');
      let score: number;
      if (mode === 'domains') {
        score =
          num(values.posture) +
          num(values.squareWindow) +
          num(values.armRecoil) +
          num(values.popliteal) +
          num(values.scarf) +
          num(values.heelToEar) +
          num(values.skin) +
          num(values.lanugo) +
          num(values.plantar) +
          num(values.breast) +
          num(values.eyeEar) +
          num(values.genitals);
      } else {
        if (isMissingValue(values.totalScore, true)) {
          return {
            score: '—',
            label: 'Total New Ballard score not entered',
            interpretation:
              'No gestational age estimated: input mode is “total score only” but the total New Ballard score is blank. Enter the total, or switch to “Sum simplified domains” and score each domain.',
            riskLevel: 'info',
            details: [{ label: 'Mode', value: 'Total entered' }],
          };
        }
        score = num(values.totalScore, 0);
      }

      // Approximate Ballard mapping (published tables; educational interpolation).
      const map: [number, number][] = [
        [-10, 20],
        [-5, 22],
        [0, 24],
        [5, 26],
        [10, 28],
        [15, 30],
        [20, 32],
        [25, 34],
        [30, 36],
        [35, 38],
        [40, 40],
        [45, 42],
        [50, 44],
      ];
      let weeks = map[0][1];
      for (let i = 0; i < map.length - 1; i++) {
        const [s0, w0] = map[i];
        const [s1, w1] = map[i + 1];
        if (score >= s0 && score <= s1) {
          const t = (score - s0) / (s1 - s0 || 1);
          weeks = round(w0 + t * (w1 - w0), 1);
          break;
        }
        if (score > s1) weeks = w1;
      }

      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = `${weeks} weeks (approx)`;
      if (weeks < 28) {
        riskLevel = 'high';
        label = `Extremely preterm (~${weeks} wks)`;
      } else if (weeks < 32) {
        riskLevel = 'high';
        label = `Very preterm (~${weeks} wks)`;
      } else if (weeks < 37) {
        riskLevel = 'moderate';
        label = `Preterm (~${weeks} wks)`;
      } else if (weeks <= 42) {
        riskLevel = 'low';
        label = `Term range (~${weeks} wks)`;
      } else {
        riskLevel = 'moderate';
        label = `Post-term range (~${weeks} wks)`;
      }

      return {
        score,
        unit: 'points',
        label,
        interpretation: `New Ballard total ${score} maps approximately to ${weeks} weeks gestation (educational interpolation of standard charts). Correlate with LMP, early ultrasound, and clinical course.`,
        riskLevel,
        details: [
          { label: 'Mode', value: mode === 'domains' ? 'Domain sum' : 'Total entered' },
          { label: 'Estimated GA', value: `${weeks} weeks` },
        ],
        recommendations: [
          'Use full illustrated Ballard chart for formal scoring when possible',
          'Document LMP and earliest reliable ultrasound dating',
        ],
      };
    },
    evidence: {
      summary:
        'New Ballard Score sums neuromuscular and physical maturity items; published tables convert total to gestational age from ~20–44 weeks.',
      formula: 'Sum domains (−10 to 50) → GA chart; this tool interpolates standard score→weeks mapping',
      validation: 'Ballard et al. 1991; widely used in NICUs. Accuracy ±2 weeks classically; best with trained examiners.',
      references: [
        { title: 'New Ballard Score, expanded to include extremely premature infants', citation: 'Ballard JL et al. J Pediatr. 1991', year: 1991, pmid: '1880657',
          doi: '10.1016/s0022-3476(05)82056-6', },
      ],
    },
    nextSteps: [
      { condition: 'Preterm estimate', actions: ['Neonatal resuscitation readiness', 'Thermoregulation, glucose, respiratory support as indicated'] },
      { condition: 'Dating conflict', actions: ['Prefer earliest US dating when reliable', 'Reassess maturity if clinical picture discordant'] },
    ],
    pearls: [
      'Score should be performed ideally within 12–24 h of birth (timing nuances for extreme prematurity).',
      'IUGR and maternal diabetes can alter physical maturity appearance.',
    ],
  },

  {
    id: 'silverman-anderson',
    name: 'Silverman-Anderson Respiratory Distress Score',
    shortName: 'Silverman',
    description: 'Five-sign neonatal respiratory distress score (0–10) for severity of work of breathing.',
    category: 'pediatrics',
    tags: ['neonate', 'respiratory distress', 'silverman', 'RDS', 'work of breathing'],
    whenToUse: 'Newborns with signs of respiratory distress to grade severity and trend response to support.',
    whyUse: 'Simple reproducible bedside score for upper/lower chest movement, xiphoid retraction, nares, and grunting.',
    inputs: [
      selectInput('upperChest', 'Upper chest movement', [
        { label: 'Synchronized (0)', value: 0, description: 'Chest and abdomen rise together' },
        { label: 'Lag on inspiration (1)', value: 1, description: 'Upper chest lags behind abdomen on inspiration' },
        { label: 'See-saw (2)', value: 2, description: 'Paradoxical see-saw: abdomen up while chest sinks' },
      ], 0, 'Score at rest, not while crying. Observe from the side: upper chest vs abdomen.'),
      selectInput('lowerChest', 'Lower chest retractions', [
        { label: 'None (0)', value: 0, description: 'No intercostal or subcostal recession' },
        { label: 'Just visible (1)', value: 1, description: 'Slight intercostal/subcostal recession, visible on close inspection' },
        { label: 'Marked (2)', value: 2, description: 'Obvious deep intercostal and/or subcostal recession' },
      ], 0, 'Score intercostal/subcostal retractions at rest, not while crying. Just visible = slight recession on close look; marked = obvious deep recession.'),
      selectInput('xiphoid', 'Xiphoid retractions', [
        { label: 'None (0)', value: 0, description: 'No sternal or xiphoid tug' },
        { label: 'Just visible (1)', value: 1, description: 'Slight xiphoid/sternal recession' },
        { label: 'Marked (2)', value: 2, description: 'Obvious xiphoid/sternal retraction (tug) with each breath' },
      ], 0, 'Look for sternal/xiphoid tug at rest. Just visible = slight recession; marked = obvious tug each breath.'),
      selectInput('nares', 'Nasal flaring', [
        { label: 'None (0)', value: 0, description: 'No dilatation of the alae nasi' },
        { label: 'Minimal (1)', value: 1, description: 'Slight flaring of the alae nasi on inspiration' },
        { label: 'Marked (2)', value: 2, description: 'Obvious dilatation of the alae nasi with each breath' },
      ], 0, 'Observe alae nasi at rest, not while crying. Minimal = slight inspiratory flare; marked = obvious dilatation each breath.'),
      selectInput('grunt', 'Expiratory grunting', [
        { label: 'None (0)', value: 0, description: 'No expiratory grunt' },
        { label: 'Audible with stethoscope (1)', value: 1, description: 'Grunt heard only with a stethoscope over the chest or airway' },
        { label: 'Audible without stethoscope (2)', value: 2, description: 'Grunt heard at the bedside without a stethoscope' },
      ], 0, '1 = grunt heard only with a stethoscope; 2 = grunt heard at the bedside without a stethoscope.'),
    ],
    calculate(values) {
      const score =
        num(values.upperChest) +
        num(values.lowerChest) +
        num(values.xiphoid) +
        num(values.nares) +
        num(values.grunt);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild distress (0–3)',
          interpretation: `Score ${score}/10: mild respiratory distress. Close observation; support as needed.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate distress (4–6)',
          interpretation: `Score ${score}/10: moderate distress. Consider oxygen, CPAP/escalation per protocol, evaluate cause (RDS, TTN, infection, cardiac).`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe distress (7–10)',
          interpretation: `Score ${score}/10: severe distress. Urgent escalation of respiratory support and full diagnostic workup.`,
        },
      ]);
      return { score, unit: '/10', ...r };
    },
    evidence: {
      summary: 'Silverman-Anderson: 5 signs × 0–2 points (total 0–10). Higher scores indicate greater respiratory effort/distress.',
      formula: 'Upper chest + lower chest + xiphoid + nares + grunt (each 0–2)',
      validation: 'Classic neonatal scoring tool for RDS severity and monitoring; educational use alongside modern SpO₂/ABG/support algorithms.',
      references: [
        { title: 'Silverman-Andersen respiratory severity score (historical)', citation: 'Silverman WA, Andersen DH. Pediatrics. 1956 (historical scoring tradition)', year: 1956, url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Silverman+Andersen+respiratory+distress+score' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Continuous monitoring', 'Consider CPAP/NIV', 'Rule out sepsis, pneumothorax, CHD'] },
      { condition: 'Score ≥7 or rising', actions: ['Escalate support', 'NICU-level care', 'ABG / imaging as indicated'] },
    ],
    pearls: ['Score is dynamic — reassess after interventions.', 'Cyanosis and SpO₂ are not part of classic Silverman but remain essential.'],
  },

  {
    id: 'downs-score',
    name: "Downes' Score (Neonatal Respiratory Distress)",
    shortName: 'Downes',
    description: "Five-component Downes' score (0–10) for neonatal respiratory distress severity.",
    category: 'pediatrics',
    tags: ['neonate', 'downes', 'respiratory distress', 'RDS'],
    whenToUse: 'Neonates with respiratory distress when a simple multi-parameter clinical score is desired.',
    whyUse: 'Incorporates RR, cyanosis, air entry, grunting, and retractions — practical for serial assessment.',
    inputs: [
      selectInput('rr', 'Respiratory rate', [
        { label: '<60 (0)', value: 0, description: 'RR <60 breaths/min, counted for 60 s at rest' },
        { label: '60–80 (1)', value: 1, description: 'RR 60–80 breaths/min at rest' },
        { label: '>80 (2)', value: 2, description: 'RR >80 breaths/min at rest' },
      ], 0, 'Count for a full minute at rest, not while crying. Official Downes bins: <60 / 60–80 / >80.'),
      selectInput('cyanosis', 'Cyanosis', [
        { label: 'None in room air (0)', value: 0, description: 'Pink in room air; no central cyanosis of lips/tongue' },
        { label: 'In room air, relieved by O₂ (1)', value: 1, description: 'Central cyanosis in room air that clears with supplemental oxygen' },
        { label: 'In FiO₂ ≥0.4 / not relieved (2)', value: 2, description: 'Central cyanosis persists at FiO₂ ≥0.40' },
      ], 0, 'Score central cyanosis (lips/tongue), not acrocyanosis. Official Downes: none / in room air relieved by O₂ / requiring FiO₂ ≥0.40.'),
      selectInput('airEntry', 'Air entry (auscultation)', [
        { label: 'Clear (0)', value: 0, description: 'Official Downes: clear / easily heard' },
        { label: 'Delayed or decreased (1)', value: 1, description: 'Official: delayed or decreased air entry' },
        { label: 'Barely audible (2)', value: 2, description: 'Official: barely audible breath sounds' },
      ], 0, 'Auscultate both axillae. Official Downes wording is clear / delayed or decreased / barely audible.'),
      selectInput('grunting', 'Grunting', [
        { label: 'None (0)', value: 0, description: 'No expiratory grunt' },
        { label: 'Audible with stethoscope (1)', value: 1, description: 'Grunt heard only with a stethoscope' },
        { label: 'Audible without stethoscope (2)', value: 2, description: 'Grunt heard at the bedside without a stethoscope' },
      ], 0, '1 = grunt heard only with a stethoscope; 2 = heard without a stethoscope. Score at rest, not while crying.'),
      selectInput('retractions', 'Retractions', [
        { label: 'None (0)', value: 0, description: 'No intercostal, subcostal, or sternal tug' },
        { label: 'Mild (1)', value: 1, description: 'Just-visible intercostal or subcostal retractions' },
        { label: 'Moderate–severe (2)', value: 2, description: 'Marked retractions including xiphoid and/or suprasternal' },
      ], 0, 'Score visual work of breathing at rest. Mild = just visible intercostal; 2 = marked including xiphoid/suprasternal.'),
    ],
    calculate(values) {
      const score =
        num(values.rr) +
        num(values.cyanosis) +
        num(values.airEntry) +
        num(values.grunting) +
        num(values.retractions);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild (≤3)',
          interpretation: `Downes ${score}/10: mild distress — observation and supportive care.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate (4–5)',
          interpretation: `Downes ${score}/10: moderate distress — supplemental O₂ / non-invasive support as indicated; evaluate etiology.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe (≥6)',
          interpretation: `Downes ${score}/10: severe distress — often warrants intensive respiratory support and urgent workup.`,
        },
      ]);
      return { score, unit: '/10', ...r };
    },
    evidence: {
      summary: "Downes' score: RR, cyanosis, air entry, grunting, retractions (0–2 each). ≤3 mild; 4–5 moderate; ≥6 severe (common teaching bands).",
      formula: 'Sum of 5 items (0–10)',
      validation: 'Widely used teaching/clinical score for neonatal RDS severity; thresholds vary slightly by protocol.',
      references: [
        { title: "Respiratory distress syndrome of newborn infants. I. New clinical scoring system (RDS score) with acid-base and blood-gas correlations", citation: 'Downes JJ, Vidyasagar D, Boggs TR, Morrow GM. Clin Pediatr (Phila). 1970;9(6):325-331', year: 1970, pmid: '5419441', doi: '10.1177/000992287000900607' },
      ],
    },
    nextSteps: [
      { condition: 'Moderate–severe', actions: ['Escalate respiratory support', 'CXR, labs, sepsis evaluation as indicated'] },
    ],
    pearls: ['Combine with SpO₂ targets and blood gas when available.', 'Serial scores track response better than a single value.'],
  },

  {
    id: 'bedsides-pews',
    name: 'Bedside PEWS (Pediatric Early Warning)',
    shortName: 'Bedside PEWS',
    description: 'Simplified Bedside Pediatric Early Warning System using key vital-sign and clinical domains.',
    category: 'pediatrics',
    tags: ['pews', 'early warning', 'pediatric', 'deterioration', 'rapid response'],
    whenToUse: 'Hospitalized children for early recognition of clinical deterioration.',
    whyUse: 'Structures vital signs and work-of-breathing into an actionable early-warning total.',
    inputs: [
      selectInput('hr', 'Heart rate (age-appropriate abnormal)', [
        { label: 'Normal for age (0)', value: 0, description: 'Use Parshuram age-band table in help text (educational 0 maps to official 0)' },
        { label: 'Mildly abnormal (1)', value: 1, description: 'Official Bedside PEWS column 1 (see age table)' },
        { label: 'Moderately abnormal (2)', value: 2, description: 'Official Bedside PEWS column 2' },
        { label: 'Severely abnormal (3)', value: 3, description: 'Official Bedside PEWS column 4 mapped onto this 3-point item — do not change the value' },
      ], 0, 'Parshuram Bedside PEWS HR (bpm), educational 0/1/2/3 (official last column is 4 points, mapped here to 3). <3 mo: 110–149 = 0; ≥150 or ≤110 = 1; ≥180 or ≤90 = 2; ≥190 or ≤80 = 3. 3–12 mo: 100–149 = 0; ≥150 or ≤100 = 1; ≥170 or ≤80 = 2; ≥180 or ≤70 = 3. 1–4 y: 90–119 = 0; ≥120 or ≤90 = 1; ≥150 or ≤70 = 2; ≥170 or ≤60 = 3. 5–12 y: 70–109 = 0; ≥110 or ≤70 = 1; ≥130 or ≤60 = 2; ≥150 or ≤50 = 3. ≥12 y: 60–99 = 0; ≥100 or ≤60 = 1; ≥120 or ≤50 = 2; ≥140 or ≤40 = 3. Use hospital PEWS chart if it differs.'),
      selectInput('rr', 'Respiratory rate', [
        { label: 'Normal for age (0)', value: 0, description: 'Use Parshuram RR age-band table in help text' },
        { label: 'Mildly abnormal (1)', value: 1, description: 'Official column 1' },
        { label: 'Moderately abnormal (2)', value: 2, description: 'Official column 2' },
        { label: 'Severely abnormal (3)', value: 3, description: 'Official column 4 mapped to 3' },
      ], 0, 'Parshuram Bedside PEWS RR (breaths/min); last official column (4 pts) mapped to 3. <3 mo: 30–60 = 0; ≥61 or ≤29 = 1; ≥81 or ≤19 = 2; ≥91 or ≤15 = 3. 3–12 mo: 25–50 = 0; ≥51 or ≤24 = 1; ≥71 or ≤19 = 2; ≥81 or ≤15 = 3. 1–4 y: 20–40 = 0; ≥41 or ≤19 = 1; ≥61 or ≤15 = 2; ≥71 or ≤12 = 3. 5–12 y: 20–30 = 0; ≥31 or ≤19 = 1; ≥41 or ≤14 = 2; ≥51 or ≤10 = 3. ≥12 y: 12–16 = 0; ≥17 or ≤11 = 1; ≥23 or ≤10 = 2; ≥30 or ≤9 = 3.'),
      selectInput('sbp', 'Systolic BP', [
        { label: 'Normal for age (0)', value: 0, description: 'Use Parshuram SBP age-band table in help text' },
        { label: 'Mildly abnormal (1)', value: 1, description: 'Official column 1' },
        { label: 'Moderately abnormal (2)', value: 2, description: 'Official column 2' },
        { label: 'Severely abnormal (3)', value: 3, description: 'Official column 4 mapped to 3' },
      ], 0, 'Parshuram Bedside PEWS SBP (mmHg); last official column mapped to 3. <3 mo: 60–80 = 0; ≥80 or ≤60 = 1; ≥100 or ≤50 = 2; ≥130 or ≤45 = 3. 3–12 mo: 80–100 = 0; ≥100 or ≤80 = 1; ≥120 or ≤70 = 2; ≥150 or ≤60 = 3. 1–4 y: 90–110 = 0; ≥110 or ≤90 = 1; ≥125 or ≤75 = 2; ≥160 or ≤65 = 3. 5–12 y: 90–120 = 0; ≥120 or ≤90 = 1; ≥140 or ≤80 = 2; ≥170 or ≤70 = 3. ≥12 y: 100–130 = 0; ≥130 or ≤100 = 1; ≥150 or ≤85 = 2; ≥190 or ≤75 = 3.'),
      selectInput('capRefill', 'Capillary refill', [
        { label: '<2 s (0)', value: 0, description: 'Brisk refill <2 s' },
        { label: '2–3 s (1)', value: 1, description: '2–3 s (this tool’s middle split)' },
        { label: '>3 s (2)', value: 2, description: '>3 s delayed refill' },
      ], 0, 'Score at the bedside (finger or sternum). Official Bedside PEWS is binary <3 s = 0 vs ≥3 s = 4; this tool keeps a 0/1/2 split. Use the institutional age table if it differs.'),
      selectInput('o2Therapy', 'Oxygen therapy', [
        { label: 'Room air (0)', value: 0, description: 'No supplemental oxygen' },
        { label: 'Any O₂ ≤2 L or low-flow (1)', value: 1, description: 'Nasal cannula ≤2 L/min or equivalent low-flow' },
        { label: 'Higher O₂ / high-flow (2)', value: 2, description: 'Simple mask, >2 L/min, or high-flow nasal cannula' },
        { label: 'Non-invasive / invasive vent (3)', value: 3, description: 'CPAP/BiPAP or invasive mechanical ventilation' },
      ], 0, 'Score the current oxygen delivery device, not the SpO₂ (that is a separate item).'),
      selectInput('spo2', 'Oxygen saturation', [
        { label: '≥94% (or at baseline) (0)', value: 0, description: 'SpO₂ ≥94% or at the child’s known baseline' },
        { label: '91–93% (1)', value: 1, description: 'SpO₂ 91–93%' },
        { label: '≤90% (2)', value: 2, description: 'SpO₂ ≤90%' },
      ], 0, 'Use the current saturation on whatever oxygen is in place. Cyanotic heart-disease patients: score vs their known baseline, not 94%.'),
      selectInput('respEffort', 'Respiratory effort / distress', [
        { label: 'Normal (0)', value: 0, description: 'Official: normal effort' },
        { label: 'Mild increase (1)', value: 1, description: 'Official: mild increase in effort (mild retractions)' },
        { label: 'Moderate increase (2)', value: 2, description: 'Official: moderate increase (moderate retractions ± flaring)' },
        { label: 'Severe increase or any apnea (3)', value: 3, description: 'Official: severe increase or any apnea (maps official 4-point band to 3)' },
      ], 0, 'Official Bedside PEWS respiratory effort: Normal; Mild increase; Moderate increase; Severe increase or any apnea.'),
      selectInput('behavior', 'Behavior / consciousness', [
        { label: 'Playing / appropriate (0)', value: 0, description: 'Playing or interacting appropriately for age/situation' },
        { label: 'Sleeping / irritable (1)', value: 1, description: 'Sleeping more than usual, or irritable but arousable' },
        { label: 'Lethargic / confused (2)', value: 2, description: 'Lethargic or confused; decreased interaction' },
        { label: 'Reduced response to pain (3)', value: 3, description: 'Reduced or no response to pain' },
      ], 0, 'Score the best interaction during this assessment. Reduced response to pain is a critical finding.'),
    ],
    calculate(values) {
      const score =
        num(values.hr) +
        num(values.rr) +
        num(values.sbp) +
        num(values.capRefill) +
        num(values.o2Therapy) +
        num(values.spo2) +
        num(values.respEffort) +
        num(values.behavior);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low (0–2)',
          interpretation: `Bedside PEWS-style total ${score}. Routine monitoring; continue age-specific vitals.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Increased (3–4)',
          interpretation: `Score ${score}: increased concern — increase observation frequency and notify covering clinician per local PEWS protocol.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High (5–6)',
          interpretation: `Score ${score}: high concern — urgent bedside assessment; consider senior review / rapid response.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Critical (≥7)',
          interpretation: `Score ${score}: critical early-warning band — activate rapid response / ICU review per institutional pathway.`,
        },
      ]);
      return {
        score,
        ...r,
        recommendations: [
          'Use institutional PEWS cutoffs and age-specific vital tables when available',
          'Any single extreme vital or clinician concern overrides the score',
        ],
      };
    },
    evidence: {
      summary:
        'Bedside PEWS aggregates cardiopulmonary and behavioral domains. This is a simplified educational version — local PEWS charts define exact age cutoffs and escalation thresholds.',
      formula: 'Sum of HR + RR + SBP + cap refill + O₂ therapy + SpO₂ + effort + behavior (simplified points)',
      validation: 'PEWS systems reduce unrecognized deterioration in pediatric wards when paired with response algorithms; thresholds are institution-specific.',
      references: [
        { title: 'Bedside PEWS and unplanned PICU transfers', citation: 'Parshuram CS et al. related PEWS literature / CMAJ implementations', year: 2011, pmid: '29486493',
          doi: '10.1001/jama.2018.0948', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5 or rising trend', actions: ['Bedside evaluation', 'Senior review', 'Consider ICU consult'] },
      { condition: 'Score 0–2 stable', actions: ['Routine monitoring'] },
    ],
    pearls: [
      'Trend and clinical gestalt matter more than a single total.',
      'Apply age-band vital norms from your hospital PEWS chart.',
    ],
  },

  {
    id: 'snappe-ii',
    name: 'SNAPPE-II (Simplified Educational)',
    shortName: 'SNAPPE-II',
    description: 'Educational simplification of SNAPPE-II neonatal illness severity using major physiologic domains.',
    category: 'pediatrics',
    tags: ['nicu', 'severity', 'snappe', 'neonate', 'mortality'],
    whenToUse: 'NICU teaching on illness severity in the first 12 hours of life (not a substitute for full SNAPPE-II software).',
    whyUse: 'Illustrates how physiology + perinatal factors stratify neonatal mortality risk.',
    inputs: [
      numberInput('map', 'Lowest mean arterial pressure', { unit: 'mmHg', min: 10, max: 80, defaultValue: 35, helpText: 'Worst (lowest) MAP in the first 12 hours of life (SNAP-II epoch).' }),
      numberInput('temp', 'Lowest temperature', { unit: '°C', min: 30, max: 40, step: 0.1, defaultValue: 36.5, helpText: 'Worst (lowest) temperature in the first 12 hours of life.' }),
      numberInput('po2fio2', 'Lowest PaO₂/FiO₂ ratio', { unit: 'mmHg', min: 20, max: 500, defaultValue: 200, helpText: 'Worst (lowest) PaO₂/FiO₂ in the first 12 hours of life.' }),
      numberInput('ph', 'Lowest serum pH', { min: 6.5, max: 7.6, step: 0.01, defaultValue: 7.25, helpText: 'Worst (lowest) pH in the first 12 hours of life.' }),
      numberInput('seizures', 'Multiple seizures (count as yes if ≥1 multiple episode cluster)', {
        min: 0,
        max: 1,
        defaultValue: 0,
        helpText: '1 = multiple seizures in the first 12 h of life; 0 = none or a single seizure. Official SNAP-II item is multiple seizures (yes/no) in that 12 h window.',
      }),
      numberInput('uop', 'Urine output', { unit: 'mL/kg/h', min: 0, max: 5, step: 0.1, defaultValue: 1, helpText: 'Urine output over the first 12 hours of life (mL/kg/h).' }),
      numberInput('birthWeight', 'Birth weight', { unit: 'g', min: 300, max: 6000, defaultValue: 1500 }),
      numberInput('sga', 'SGA (birth weight <3rd–5th %ile)', { min: 0, max: 1, defaultValue: 0, helpText: '1 = yes, 0 = no. Official SNAPPE-II SGA is <3rd percentile.' }),
      numberInput('apgar5', '5-minute Apgar', { min: 0, max: 10, defaultValue: 7, helpText: 'Official SNAPPE-II adds points if 5-minute Apgar <7. Enter the 5-minute score (0–10).' }),
    ],
    calculate(values) {
      // Educational point approximation inspired by SNAPPE-II component scoring (not official table).
      let pts = 0;
      const map = num(values.map, 35);
      const temp = num(values.temp, 36.5);
      const pf = num(values.po2fio2, 200);
      const ph = num(values.ph, 7.25);
      const seiz = num(values.seizures, 0) >= 1;
      const uop = num(values.uop, 1);
      const bw = num(values.birthWeight, 1500);
      const sga = num(values.sga, 0) >= 1;
      const apgar5 = num(values.apgar5, 7);

      if (map < 20) pts += 19;
      else if (map < 30) pts += 9;

      if (temp < 35) pts += 15;
      else if (temp < 36) pts += 8;

      if (pf < 49) pts += 28;
      else if (pf < 100) pts += 16;
      else if (pf < 250) pts += 5;

      if (ph < 7.1) pts += 16;
      else if (ph < 7.2) pts += 7;

      if (seiz) pts += 19;
      if (uop < 0.1) pts += 18;
      else if (uop < 1) pts += 5;

      if (bw < 750) pts += 17;
      else if (bw < 1000) pts += 10;
      else if (bw < 1500) pts += 5;

      if (sga) pts += 12;
      if (apgar5 < 7) pts += 18;

      const r = riskFromThresholds(pts, [
        {
          max: 20,
          level: 'low',
          label: 'Lower educational severity',
          interpretation: `Simplified SNAPPE-II-style points ≈${pts}. Lower-range educational severity — still manage by clinical course.`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Intermediate educational severity',
          interpretation: `Simplified points ≈${pts}. Intermediate illness severity in teaching models; higher mortality risk than low band.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'High educational severity',
          interpretation: `Simplified points ≈${pts}. High severity band in educational SNAPPE-style mapping — intensive support expected.`,
        },
      ]);

      return {
        score: pts,
        label: r.label,
        interpretation:
          r.interpretation +
          ' Educational approximation of SNAPPE-II domains only — not the validated official calculator.',
        riskLevel: r.riskLevel,
        details: [
          { label: 'MAP / temp / P/F', value: `${map} / ${temp}°C / ${pf}` },
          { label: 'pH / UOP', value: `${ph} / ${uop} mL/kg/h` },
          { label: 'BW / Apgar5 / SGA', value: `${bw} g / ${apgar5} / ${sga ? 'yes' : 'no'}` },
        ],
      };
    },
    evidence: {
      summary:
        'SNAPPE-II combines SNAP-II physiology (first 12 h) with birth weight, SGA, and low 5-min Apgar. This app uses simplified educational points only.',
      formula: 'Approximate points from MAP, temp, PaO₂/FiO₂, pH, seizures, UOP, BW, SGA, Apgar5',
      validation: 'Original SNAPPE-II validated for NICU mortality prediction; use research/clinical software for formal scoring.',
      references: [
        { title: 'SNAP-II and SNAPPE-II: Simplified newborn illness severity and mortality risk scores', citation: 'Richardson DK et al. J Pediatr. 2001', year: 2001, pmid: '11148519',
          doi: '10.1067/mpd.2001.109608', },
      ],
    },
    nextSteps: [
      { condition: 'High points', actions: ['Full intensive care support', 'Counsel family using local outcomes data', 'Do not rely solely on educational score'] },
    ],
    pearls: ['Official SNAPPE-II uses precise look-up tables for each physiologic band.', 'Intended for teaching, not billing or research endpoints.'],
  },

  {
    id: 'crib-ii',
    name: 'CRIB-II (Simplified Educational)',
    shortName: 'CRIB-II',
    description: 'Educational simplification of CRIB-II using gestation, birth weight, sex, admission temperature, and base excess.',
    category: 'pediatrics',
    tags: ['crib', 'nicu', 'severity', 'neonate', 'mortality'],
    whenToUse: 'Teaching mortality risk stratification for infants ≤32 weeks at admission (educational).',
    whyUse: 'Highlights major CRIB-II predictors in a bedside-friendly form.',
    inputs: [
      numberInput('ga', 'Gestational age', { unit: 'weeks', min: 22, max: 32, step: 0.1, defaultValue: 28, helpText: 'Official CRIB-II is for infants ≤32 weeks at admission.' }),
      numberInput('bw', 'Birth weight', { unit: 'g', min: 300, max: 2500, defaultValue: 1000 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('temp', 'Admission temperature', { unit: '°C', min: 30, max: 40, step: 0.1, defaultValue: 36.5, helpText: 'Temperature on admission to the NICU (not later nadir).' }),
      numberInput('be', 'Base excess (most negative first 12 h)', { unit: 'mEq/L', min: -30, max: 10, step: 0.1, defaultValue: -4, helpText: 'Most negative base excess in the first 12 hours of life.' }),
    ],
    calculate(values) {
      const ga = num(values.ga, 28);
      const bw = num(values.bw, 1000);
      const sex = String(values.sex ?? 'F');
      const temp = num(values.temp, 36.5);
      const be = num(values.be, -4);

      // Educational point approximation (not official CRIB-II tables)
      let pts = 0;
      if (ga < 24) pts += 15;
      else if (ga < 26) pts += 11;
      else if (ga < 28) pts += 8;
      else if (ga < 30) pts += 5;
      else if (ga < 32) pts += 2;

      if (bw < 500) pts += 13;
      else if (bw < 750) pts += 10;
      else if (bw < 1000) pts += 7;
      else if (bw < 1250) pts += 4;
      else if (bw < 1500) pts += 2;

      if (sex === 'M') pts += 1;

      if (temp < 35) pts += 5;
      else if (temp < 36) pts += 3;
      else if (temp < 36.5) pts += 1;

      if (be <= -15) pts += 8;
      else if (be <= -10) pts += 5;
      else if (be <= -7) pts += 3;
      else if (be <= -5) pts += 1;

      const r = riskFromThresholds(pts, [
        {
          max: 5,
          level: 'low',
          label: 'Lower educational risk',
          interpretation: `Simplified CRIB-II-style points ≈${pts}. Lower teaching-band mortality risk.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Intermediate educational risk',
          interpretation: `Simplified points ≈${pts}. Intermediate teaching-band severity.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Higher educational risk',
          interpretation: `Simplified points ≈${pts}. Higher teaching-band mortality risk — not official CRIB-II.`,
        },
      ]);

      return {
        score: pts,
        label: r.label,
        interpretation:
          r.interpretation +
          ' Educational tool only; official CRIB-II uses published coefficient/table methods.',
        riskLevel: r.riskLevel,
        details: [
          { label: 'GA / BW', value: `${ga} wks / ${bw} g` },
          { label: 'Sex / Temp / BE', value: `${sex} / ${temp}°C / ${be}` },
        ],
      };
    },
    evidence: {
      summary: 'CRIB-II predicts mortality in infants ≤32 weeks using GA, birth weight, sex, admission temp, and base excess.',
      formula: 'Educational point sum approximating CRIB-II domains',
      validation: 'Original CRIB-II derived from UK neonatal network data; use official methods for research/audit.',
      references: [
        { title: 'CRIB II: an update of the clinical risk index for babies score', citation: 'Parry G et al. Lancet. 2003', year: 2003, pmid: '12781540',
          doi: '10.1016/S0140-6736(03)13397-1', },
      ],
    },
    nextSteps: [
      { condition: 'High points', actions: ['Maximize thermoregulation and cardiorespiratory support', 'Counsel using unit-specific outcomes'] },
    ],
    pearls: ['Applies to very preterm admissions, not term infants.', 'Temperature and base excess capture early physiologic instability.'],
  },

  {
    id: 'npass',
    name: 'N-PASS (Pain / Agitation / Sedation) Simplified',
    shortName: 'N-PASS',
    description: 'Simplified Neonatal Pain, Agitation, and Sedation Scale helper for pain/agitation vs sedation.',
    category: 'pediatrics',
    tags: ['pain', 'neonate', 'npass', 'sedation', 'agitation'],
    whenToUse: 'NICU neonates for ongoing pain/agitation assessment or sedation depth monitoring.',
    whyUse: 'Combines behavioral and physiologic cues with sedation scoring (−2 to +2 style domains).',
    inputs: [
      selectInput('crying', 'Crying / irritability', [
        { label: 'No cry with painful stimuli (−2 sedation)', value: -2, description: 'No cry even with needle, ETT/nares suction, or caregiving' },
        { label: 'Moans / minimal (−1)', value: -1, description: 'Moans or cries minimally with painful stimuli; if intubated — minimal silent cry' },
        { label: 'Appropriate / consolable (0)', value: 0, description: 'Appropriate crying; consolable' },
        { label: 'Irritable / consoling difficult (+1)', value: 1, description: 'Irritable or crying at intervals; consolable with difficulty. If intubated — intermittent silent cry' },
        { label: 'High-pitched / inconsolable (+2)', value: 2, description: 'High-pitched or inconsolable; if intubated — silent continuous cry' },
      ], 0, 'Assess over a care interval, not a single glance. Painful stimuli examples: needle stick, ETT/nares suction, caregiving. If intubated, silent cry with mouth/face movement counts. If <30 weeks corrected, add +1 to the pain subtotal after scoring (Hummel) — do not change these domain values.'),
      selectInput('behavior', 'Behavior state', [
        { label: 'No arousal to stimuli (−2)', value: -2, description: 'No arousal to any stimuli; no spontaneous movement' },
        { label: 'Lethargic (−1)', value: -1, description: 'Arouses minimally to stimuli; little spontaneous movement; lethargic' },
        { label: 'Appropriate (0)', value: 0, description: 'Behavior appropriate for gestational age' },
        { label: 'Restless / fidgety (+1)', value: 1, description: 'Restless, squirming; awakens frequently' },
        { label: 'Arching / kicking (+2)', value: 2, description: 'Arching, kicking; constantly awake or little/no sleep between cares' },
      ], 0, 'Score spontaneous movement and arousability over the care interval, not a single glance.'),
      selectInput('facial', 'Facial expression', [
        { label: 'Mouth slack / no expression (−2)', value: -2, description: 'Mouth is lax; no facial expression even with stimuli' },
        { label: 'Minimal expression (−1)', value: -1, description: 'Minimal expression with stimuli (not a full grimace)' },
        { label: 'Relaxed / appropriate (0)', value: 0, description: 'Relaxed face; appropriate for state' },
        { label: 'Any pain expression intermittent (+1)', value: 1, description: 'Intermittent grimace, brow furrow, chin quiver, or nasolabial furrow' },
        { label: 'Any pain expression continual (+2)', value: 2, description: 'Continual grimace or brow furrow' },
      ], 0, 'Pain face = grimace, brow furrow, chin quiver, or nasolabial furrow. Intermittent vs continual over the care interval.'),
      selectInput('extremities', 'Extremities / tone', [
        { label: 'No grasp / limp (−2)', value: -2, description: 'No palmar or plantar grasp; limp/flaccid' },
        { label: 'Weak grasp / ↓ tone (−1)', value: -1, description: 'Weak grasp; decreased muscle tone' },
        { label: 'Relaxed hands/feet (0)', value: 0, description: 'Relaxed hands and feet; normal palmar/plantar grasp' },
        { label: 'Intermittent clenched / digits splay (+1)', value: 1, description: 'Intermittent clenched fists, finger splay, or rigid tone' },
        { label: 'Continual clenched toes/fists / stiff (+2)', value: 2, description: 'Continual clenched toes/fists, finger splay, or stiff extremities' },
      ], 0, 'Palpate grasp and watch digits over the care interval. Continual clenched fists/splay/stiff = +2.'),
      selectInput('vitals', 'Vital signs (HR, RR, BP, SpO₂)', [
        { label: 'No variability with stimuli / apneas (−2)', value: -2, description: 'No HR/RR/BP/SpO₂ change with stimuli, or frequent apneas' },
        { label: '↓ 10–20% from baseline (−1)', value: -1, description: 'HR, RR, or BP 10–20% below this infant’s baseline' },
        { label: 'Baseline / normal variability (0)', value: 0, description: 'At this infant’s baseline with normal variability' },
        { label: '↑ 10–20% from baseline (+1)', value: 1, description: 'HR, RR, or BP 10–20% above baseline' },
        { label: '↑ >20% / desats / vent asynchrony (+2)', value: 2, description: '>20% above baseline, desaturations, or ventilator asynchrony' },
      ], 0, 'Compare HR, RR, BP, and SpO₂ to this infant’s baseline. +2 includes desaturations or ventilator asynchrony.'),
    ],
    calculate(values) {
      const domains = [
        num(values.crying),
        num(values.behavior),
        num(values.facial),
        num(values.extremities),
        num(values.vitals),
      ];
      const painSum = domains.reduce((s, v) => s + Math.max(0, v), 0);
      const sedSum = domains.reduce((s, v) => s + Math.min(0, v), 0);
      const net = domains.reduce((s, v) => s + v, 0);

      let label = 'Comfortable / appropriate';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let interpretation = '';

      if (sedSum <= -4) {
        label = 'Deep sedation pattern';
        riskLevel = 'high';
        interpretation = `Sedation-domain sum ${sedSum}, pain-domain sum ${painSum} (net ${net}). Pattern suggests deep sedation — assess airway, perfusion, and whether sedation can be lightened.`;
      } else if (sedSum <= -2) {
        label = 'Sedated pattern';
        riskLevel = 'moderate';
        interpretation = `Sedation-domain sum ${sedSum}, pain sum ${painSum} (net ${net}). Mild–moderate sedation cues — titrate to goal.`;
      } else if (painSum >= 4) {
        label = 'Significant pain / agitation';
        riskLevel = 'high';
        interpretation = `Pain/agitation sum ${painSum} (net ${net}). Consider non-pharmacologic measures and analgesia/sedation per protocol.`;
      } else if (painSum >= 1) {
        label = 'Mild pain / agitation';
        riskLevel = 'moderate';
        interpretation = `Pain/agitation sum ${painSum} (net ${net}). Mild cues — comfort measures and reassess.`;
      } else {
        interpretation = `Domains near baseline (pain ${painSum}, sedation ${sedSum}, net ${net}). Continue routine comfort care.`;
      }

      return {
        score: net,
        label,
        interpretation: interpretation + ' Simplified N-PASS-style helper; full N-PASS includes prematurity adjustment (+1 to pain for <30 weeks in some implementations).',
        riskLevel,
        details: [
          { label: 'Pain / agitation subtotal (≥0 items)', value: String(painSum) },
          { label: 'Sedation subtotal (≤0 items)', value: String(sedSum) },
          { label: 'Net', value: String(net) },
        ],
      };
    },
    evidence: {
      summary:
        'N-PASS rates crying, behavior, face, extremities, and vitals from −2 (sedation) to +2 (pain/agitation). Positive totals guide analgesia; negative totals guide sedation depth.',
      formula: 'Five domains −2 to +2; interpret positive vs negative subtotals',
      validation: 'Validated in neonatal intensive care for pain and sedation assessment.',
      references: [
        { title: 'Neonatal Pain, Agitation, and Sedation Scale', citation: 'Hummel P et al. J Perinatol / related N-PASS validations', year: 2008, pmid: '18165830',
          doi: '10.1038/sj.jp.7211861', },
      ],
    },
    nextSteps: [
      { condition: 'Pain sum ≥4', actions: ['Comfort measures', 'Analgesia per unit protocol', 'Treat underlying cause'] },
      { condition: 'Deep sedation pattern', actions: ['Airway monitoring', 'Reassess infusion rates', 'Neurologic exam'] },
    ],
    pearls: ['Premature infants may show subtler cues.', 'Compare to the infant’s own baseline when chronically ventilated.'],
  },

  {
    id: 'flacc',
    name: 'FLACC Pain Scale',
    shortName: 'FLACC',
    description: 'Behavioral pain assessment: Face, Legs, Activity, Cry, Consolability (0–10).',
    category: 'pediatrics',
    tags: ['pain', 'flacc', 'pediatric', 'behavioral'],
    whenToUse: 'Children who cannot self-report pain (typically 2 months–7 years, also nonverbal patients).',
    whyUse: 'Widely used observational scale for acute pain intensity.',
    inputs: [
      selectInput('face', 'Face', [
        { label: 'No particular expression / smile (0)', value: 0, description: 'No particular expression or smile; face relaxed' },
        { label: 'Occasional grimace / withdrawn (1)', value: 1, description: 'Occasional grimace or frown, withdrawn, disinterested' },
        { label: 'Frequent–constant quivering chin / clenched jaw (2)', value: 2, description: 'Frequent to constant frown, clenched jaw, quivering chin' },
      ], 0, 'Observe 1–5 minutes (or the duration of a procedure). Score each domain 0–2 from what you see, not from history. Sedation and paralysis invalidate behavioral scores.'),
      selectInput('legs', 'Legs', [
        { label: 'Normal position / relaxed (0)', value: 0, description: 'Normal position or relaxed' },
        { label: 'Uneasy / restless / tense (1)', value: 1, description: 'Uneasy, restless, tense (increased tone, not kicking)' },
        { label: 'Kicking / legs drawn up (2)', value: 2, description: 'Kicking, or legs drawn up' },
      ], 0, 'Watch legs over 1–5 min. Tense/restless = 1; kicking or drawn-up = 2.'),
      selectInput('activity', 'Activity', [
        { label: 'Lying quietly / normal position / moves easily (0)', value: 0, description: 'Lying quietly, normal position, moves easily' },
        { label: 'Squirming / shifting / tense (1)', value: 1, description: 'Squirming, shifting back and forth, tense' },
        { label: 'Arched / rigid / jerking (2)', value: 2, description: 'Arched, rigid, or jerking' },
      ], 0, 'Tense shifting = 1; arched/rigid/jerking = 2.'),
      selectInput('cry', 'Cry', [
        { label: 'No cry (0)', value: 0, description: 'No cry (awake or asleep)' },
        { label: 'Moans / whimpers / occasional complaint (1)', value: 1, description: 'Moans or whimpers; occasional complaint' },
        { label: 'Crying steadily / screams / sobs / frequent complaints (2)', value: 2, description: 'Crying steadily, screams or sobs, frequent complaints' },
      ], 0, 'Intubated: silent cry with obvious facial movement scores analogously (moan vs continuous).'),
      selectInput('consolability', 'Consolability', [
        { label: 'Content / relaxed (0)', value: 0, description: 'Content, relaxed' },
        { label: 'Reassured by occasional touching / hugging / distractible (1)', value: 1, description: 'Reassured by occasional touching, hugging, or being talked to; distractible' },
        { label: 'Difficult to console or comfort (2)', value: 2, description: 'Difficult to console or comfort' },
      ], 0, 'Try touching, hugging, talking, or distraction. If that works only briefly = 1; if not consolable = 2.'),
    ],
    calculate(values) {
      const score =
        num(values.face) +
        num(values.legs) +
        num(values.activity) +
        num(values.cry) +
        num(values.consolability);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No pain behaviors (0)',
          interpretation: 'FLACC 0: no observable pain behaviors at assessment.',
        },
        {
          max: 3,
          level: 'low',
          label: 'Mild (1–3)',
          interpretation: `FLACC ${score}/10: mild pain behaviors — non-pharmacologic measures; reassess.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate (4–6)',
          interpretation: `FLACC ${score}/10: moderate pain — consider analgesia and comfort measures.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe (7–10)',
          interpretation: `FLACC ${score}/10: severe pain behaviors — prompt analgesia and treat cause.`,
        },
      ]);
      return { score, unit: '/10', ...r };
    },
    evidence: {
      summary: 'FLACC: five behavioral domains scored 0–2 (total 0–10). Common cutoffs: 0 none, 1–3 mild, 4–6 moderate, 7–10 severe.',
      formula: 'Face + Legs + Activity + Cry + Consolability',
      validation: 'Widely validated observational tool for pediatric acute pain.',
      references: [
        { title: 'The FLACC: a behavioral scale for scoring postoperative pain in young children', citation: 'Merkel SI et al. Pediatr Nurs. 1997', year: 1997, pmid: '9220806' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Analgesia per protocol', 'Reassess within 30–60 min', 'Non-pharm comfort'] },
    ],
    pearls: ['Revised FLACC exists for cognitively impaired children.', 'Sedation and paralysis invalidate behavioral scores.'],
  },

  {
    id: 'wong-baker',
    name: 'Wong-Baker FACES Pain Rating Scale',
    shortName: 'FACES',
    description: 'Self-reported pain intensity using Wong-Baker FACES (0–10 even numbers).',
    category: 'pediatrics',
    tags: ['pain', 'wong-baker', 'faces', 'self-report', 'pediatric'],
    whenToUse: 'Verbal children who can match faces to how they feel (often ≥3 years).',
    whyUse: 'Simple self-report tool validated across ages and cultures.',
    inputs: [
      selectInput('faces', 'Which face matches how you feel?', [
        { label: '0 — No hurt', value: 0 },
        { label: '2 — Hurts a little bit', value: 2 },
        { label: '4 — Hurts a little more', value: 4 },
        { label: '6 — Hurts even more', value: 6 },
        { label: '8 — Hurts a whole lot', value: 8 },
        { label: '10 — Hurts worst', value: 10 },
      ], 0, 'Teach that the faces show how much something hurts, not how the child looks. Point to each face and use the official wording, then let the child choose.'),
    ],
    calculate(values) {
      const score = num(values.faces, 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No pain (0)',
          interpretation: 'Self-report 0: no hurt.',
        },
        {
          max: 3,
          level: 'low',
          label: 'Mild (2)',
          interpretation: `FACES ${score}: mild pain — comfort measures; consider mild analgesia if needed.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate (4–6)',
          interpretation: `FACES ${score}: moderate pain — analgesia and non-pharmacologic strategies.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe (8–10)',
          interpretation: `FACES ${score}: severe pain — prompt multimodal analgesia and reassess.`,
        },
      ]);
      return { score, unit: '/10', ...r };
    },
    evidence: {
      summary: 'Wong-Baker FACES: six faces scored 0,2,4,6,8,10 corresponding to increasing pain intensity.',
      formula: 'Patient selects face → score 0–10',
      validation: 'Extensively used self-report scale in pediatrics.',
      references: [
        { title: 'Wong-Baker FACES Pain Rating Scale', citation: 'Wong DL, Baker CM. Pediatr Nurs. 1988', year: 1988, url: 'https://wongbakerfaces.org/' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Treat pain', 'Reassess after intervention', 'Address fear/anxiety components'] },
    ],
    pearls: ['Explain that faces show how much something hurts, not how the child looks.', 'Some children confuse emotion faces with pain faces — teach the scale first.'],
  },

  {
    id: 'nips',
    name: 'Neonatal Infant Pain Scale (NIPS)',
    shortName: 'NIPS',
    description: 'Behavioral pain scale for neonates and young infants (typically 0–7).',
    category: 'pediatrics',
    tags: ['pain', 'neonate', 'nips', 'infant'],
    whenToUse: 'Term and preterm neonates for procedural or postoperative pain assessment.',
    whyUse: 'Quick bedside behavioral score used widely in nurseries and NICUs.',
    inputs: [
      selectInput('facial', 'Facial expression', [
        { label: 'Relaxed (0)', value: 0, description: 'Restful/neutral face; no tightness' },
        { label: 'Grimace (1)', value: 1, description: 'Tight facial muscles; furrowed brow, chin, or jaw' },
      ], 0, 'Lawrence NIPS: 0 = restful/neutral; 1 = grimace (tight muscles, furrowed brow/chin/jaw).'),
      selectInput('cry', 'Cry', [
        { label: 'No cry (0)', value: 0, description: 'Quiet, not crying' },
        { label: 'Whimper (1)', value: 1, description: 'Mild intermittent moan' },
        { label: 'Vigorous cry (2)', value: 2, description: 'Loud, shrill, continuous cry' },
      ], 0, 'If intubated, silent cry with obvious mouth/face movement scores as vigorous cry (2).'),
      selectInput('breathing', 'Breathing patterns', [
        { label: 'Relaxed (0)', value: 0, description: 'Usual pattern for this infant' },
        { label: 'Change in breathing (1)', value: 1, description: 'Indrawing, irregular, faster than usual, gagging, or breath-holding' },
      ], 0, 'Score vs this infant’s usual pattern. 1 = indrawing, irregular, faster, gagging, or breath-holding.'),
      selectInput('arms', 'Arms', [
        { label: 'Restrained / relaxed (0)', value: 0, description: 'No rigidity; occasional random movement (restrained OK)' },
        { label: 'Flexed / extended (1)', value: 1, description: 'Tense, straight, rigid; rapid flexion–extension' },
      ], 0, '0 is no rigidity (including restrained). 1 is tense/rigid or rapid flex–extend — not ordinary flexion.'),
      selectInput('legs', 'Legs', [
        { label: 'Restrained / relaxed (0)', value: 0, description: 'No rigidity; occasional random movement (restrained OK)' },
        { label: 'Flexed / extended (1)', value: 1, description: 'Tense, straight, rigid; rapid flexion–extension' },
      ], 0, 'Same rule as arms: restrained without rigidity scores 0.'),
      selectInput('state', 'State of arousal', [
        { label: 'Sleeping / awake quiet (0)', value: 0, description: 'Quiet sleep or settled alert' },
        { label: 'Fussy (1)', value: 1, description: 'Alert, restless, or thrashing' },
      ], 0, '0 = quiet sleep or settled alert; 1 = restless/thrashing.'),
    ],
    calculate(values) {
      const score =
        num(values.facial) +
        num(values.cry) +
        num(values.breathing) +
        num(values.arms) +
        num(values.legs) +
        num(values.state);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Minimal / no pain (≤2)',
          interpretation: `NIPS ${score}/7: generally considered no-to-minimal pain; continue comfort care.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Mild–moderate (3–4)',
          interpretation: `NIPS ${score}/7: pain likely — non-pharm measures ± analgesia for procedures.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'Significant pain (≥5)',
          interpretation: `NIPS ${score}/7: significant pain behaviors — treat promptly and reassess.`,
        },
      ]);
      return { score, unit: '/7', ...r };
    },
    evidence: {
      summary: 'NIPS scores face (0–1), cry (0–2), breathing (0–1), arms (0–1), legs (0–1), arousal (0–1); total 0–7. Scores >3 often treated as pain.',
      formula: 'Sum of 6 behavioral items',
      validation: 'Common neonatal procedural pain scale with good inter-rater reliability when trained.',
      references: [
        { title: 'Neonatal Infant Pain Scale', citation: 'Lawrence J et al. Neonatal Netw. 1993', year: 1993, pmid: '8413140' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3', actions: ['Swaddling, sucrose, non-nutritive sucking', 'Analgesia for painful procedures', 'Reassess'] },
    ],
    pearls: ['Intubated infants cannot cry — weight other cues more heavily.', 'Baseline temperament and illness alter scores.'],
  },

  {
    id: 'avpu',
    name: 'AVPU Responsiveness Scale',
    shortName: 'AVPU',
    description: 'Rapid consciousness scale: Alert, Voice, Pain, Unresponsive.',
    category: 'emergency',
    tags: ['avpu', 'consciousness', 'triage', 'pediatric', 'neuro'],
    whenToUse: 'Rapid assessment of responsiveness in emergency, prehospital, or ward deterioration.',
    whyUse: 'Faster than full GCS for triage; maps roughly to GCS bands.',
    inputs: [
      selectInput('level', 'Best response', [
        { label: 'A — Alert', value: 'A', description: 'Eyes open, interacting (a crying infant can be Alert)' },
        { label: 'V — Responds to voice', value: 'V', description: 'Any response to spoken or shouted voice' },
        { label: 'P — Responds to pain only', value: 'P', description: 'Response only to pain (record trapezius squeeze or nail-bed stimulus)' },
        { label: 'U — Unresponsive', value: 'U', description: 'No response to voice or pain' },
      ], 'A', 'A = eyes open, interacting (crying infant can be Alert). V = any response to spoken/shouted voice. P = response only to pain (record trapezius or nail-bed stimulus). U = no response to voice or pain.'),
    ],
    calculate(values) {
      const level = String(values.level ?? 'A');
      const map: Record<string, { score: string; label: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; gcs: string; interpretation: string }> = {
        A: {
          score: 'A',
          label: 'Alert',
          riskLevel: 'low',
          gcs: '~GCS 15',
          interpretation: 'Alert: eyes open, interacts. Continue focused exam; full GCS if head injury or evolving neuro concern.',
        },
        V: {
          score: 'V',
          label: 'Voice',
          riskLevel: 'moderate',
          gcs: '~GCS 12–13',
          interpretation: 'Responds to voice only. Altered mentation — evaluate ABCs, glucose, toxins, infection, intracranial process; obtain full GCS.',
        },
        P: {
          score: 'P',
          label: 'Pain',
          riskLevel: 'high',
          gcs: '~GCS 8–10',
          interpretation: 'Responds to pain only. Serious impairment of consciousness — protect airway, urgent workup, often needs advanced support.',
        },
        U: {
          score: 'U',
          label: 'Unresponsive',
          riskLevel: 'critical',
          gcs: '~GCS 3–6',
          interpretation: 'Unresponsive to voice and pain. Critical — immediate airway management and emergency resuscitation pathway.',
        },
      };
      const r = map[level] ?? map.A;
      return {
        score: r.score,
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [{ label: 'Approximate GCS band', value: r.gcs }],
      };
    },
    evidence: {
      summary: 'AVPU is a four-level responsiveness scale used in PALS/APLS/triage. Rough GCS mapping: A≈15, V≈12–13, P≈8–10, U≈3–6.',
      formula: 'Categorical: A / V / P / U',
      validation: 'Standard emergency teaching tool; not a substitute for serial full GCS in head injury.',
      references: [
        { title: 'Pediatric emergency dosing teaching (PALS context)', citation: 'Emergency medicine / PALS teaching literature', year: 2020, url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric' },
      ],
    },
    nextSteps: [
      { condition: 'V or worse', actions: ['Check glucose', 'Airway positioning / support', 'Full GCS and neuro exam', 'Urgent diagnostics'] },
      { condition: 'P or U', actions: ['Resuscitation bay', 'Airway protection', 'Treat reversible causes'] },
    ],
    pearls: ['Record stimulus used for P (trapezius, nail bed).', 'AVPU is snapshot — document trends.'],
  },

  {
    id: 'broselow-band',
    name: 'Broselow Color Zone (Educational)',
    shortName: 'Broselow',
    description: 'Educational length/weight-based Broselow color zone for pediatric emergency dosing reference.',
    category: 'emergency',
    tags: ['broselow', 'pediatric', 'dosing', 'resuscitation', 'weight'],
    whenToUse: 'Pediatric emergencies when length-based tape or estimated weight guides drug/equipment sizing.',
    whyUse: 'Color zones reduce cognitive load for weight-based dosing during resuscitation.',
    inputs: [
      selectInput('method', 'Estimate by', [
        { label: 'Weight (kg)', value: 'weight' },
        { label: 'Length (cm)', value: 'length' },
      ], 'weight', 'Measured length with a validated tape is preferred in true emergencies. Weight is a fallback. Educational color bands — confirm with the current Broselow edition.'),
      numberInput('weight', 'Weight', { unit: 'kg', min: 3, max: 40, step: 0.1, defaultValue: 12, helpText: 'Use measured or estimated weight in kg. Length-based zone is preferred when a tape is available.' }),
      numberInput('length', 'Length / height', { unit: 'cm', min: 45, max: 150, defaultValue: 85, helpText: 'Crown-to-heel length in cm, supine. Educational zones: Grey 46–60, Pink 60–68, Red 68–75, Purple 75–85, Yellow 85–97, White 97–110, Blue 110–122, Orange 122–137, Green 137–150.' }),
    ],
    calculate(values) {
      const method = String(values.method ?? 'weight');
      const w = num(values.weight, 12);
      const len = num(values.length, 85);

      // Approximate Broselow zones by weight (educational; tape uses length primarily)
      type Zone = { color: string; kg: string; minW: number; maxW: number; minL: number; maxL: number };
      const zones: Zone[] = [
        { color: 'Grey', kg: '3–5 kg', minW: 3, maxW: 5, minL: 46, maxL: 60 },
        { color: 'Pink', kg: '6–7 kg', minW: 6, maxW: 7, minL: 60, maxL: 68 },
        { color: 'Red', kg: '8–9 kg', minW: 8, maxW: 9, minL: 68, maxL: 75 },
        { color: 'Purple', kg: '10–11 kg', minW: 10, maxW: 11, minL: 75, maxL: 85 },
        { color: 'Yellow', kg: '12–14 kg', minW: 12, maxW: 14, minL: 85, maxL: 97 },
        { color: 'White', kg: '15–18 kg', minW: 15, maxW: 18, minL: 97, maxL: 110 },
        { color: 'Blue', kg: '19–23 kg', minW: 19, maxW: 23, minL: 110, maxL: 122 },
        { color: 'Orange', kg: '24–29 kg', minW: 24, maxW: 29, minL: 122, maxL: 137 },
        { color: 'Green', kg: '30–36 kg', minW: 30, maxW: 36, minL: 137, maxL: 150 },
      ];

      let zone: Zone | undefined;
      if (method === 'length') {
        zone = zones.find((z) => len >= z.minL && len < z.maxL) ?? (len >= 150 ? zones[zones.length - 1] : zones[0]);
      } else {
        zone = zones.find((z) => w >= z.minW && w <= z.maxW);
        if (!zone) {
          if (w < 3) zone = zones[0];
          else if (w > 36) zone = zones[zones.length - 1];
          else zone = zones.reduce((best, z) => (Math.abs((z.minW + z.maxW) / 2 - w) < Math.abs((best.minW + best.maxW) / 2 - w) ? z : best));
        }
      }

      const color = zone!.color;
      const midKg = method === 'length' ? `${zone!.minW}–${zone!.maxW}` : String(w);

      return {
        score: color,
        label: `${color} zone`,
        interpretation: `Educational Broselow-style zone: ${color} (${zone!.kg}). Use zone-specific drug and equipment references. Measured length with a validated tape is preferred over weight alone in true emergencies.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Method', value: method === 'length' ? `Length ${len} cm` : `Weight ${w} kg` },
          { label: 'Zone weight band', value: zone!.kg },
          { label: 'Estimated weight used', value: `${midKg} kg` },
        ],
        recommendations: [
          'Confirm with physical Broselow or equivalent length-based system when available',
          'Obese children: length-based may underestimate ideal emergency dosing — follow local policy',
        ],
      };
    },
    evidence: {
      summary: 'Broselow tape assigns color zones by length corresponding to approximate weight bands for emergency dosing and equipment.',
      formula: 'Length (preferred) or weight → color zone table',
      validation: 'Widely used in pediatric emergency care; updated editions revise color–dose cards.',
      references: [
        { title: 'Broselow-Luten pediatric emergency tape system', citation: 'Luten R et al. / Broselow-Luten system literature', year: 2007, url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Broselow+Luten+pediatric+resuscitation' },
      ],
    },
    nextSteps: [
      { condition: 'Resuscitation', actions: ['Open color-coded drug card', 'Prepare airway equipment for zone', 'Use ideal body weight policies per institution when indicated'] },
    ],
    pearls: [
      'This is educational — always verify with your current tape edition.',
      'Grey/pink zones = infants; green approaches adult dosing transition.',
    ],
  },

  {
    id: 'pediatric-ett-size',
    name: 'Pediatric Uncuffed ETT Size',
    shortName: 'ETT Size',
    description: 'Uncuffed endotracheal tube internal diameter estimate: age/4 + 4 (and common cuffed adjustment).',
    category: 'pediatrics',
    tags: ['airway', 'ett', 'intubation', 'pediatric', 'dosing'],
    whenToUse: 'Children ≥1–2 years when estimating oral ETT size for intubation (not neonates).',
    whyUse: 'Classic Cole formula for uncuffed tubes; cuffed tubes often ~0.5 mm smaller.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0.5, max: 16, step: 0.5, defaultValue: 4, helpText: 'Cole uncuffed ID (mm) ≈ age(years)/4 + 4. Not for neonates (use weight-based sizing). Have tubes 0.5 mm larger and smaller ready.' }),
      selectInput('tubeType', 'Tube type', [
        { label: 'Uncuffed', value: 'uncuffed' },
        { label: 'Cuffed (≈ uncuffed − 0.5)', value: 'cuffed' },
      ], 'uncuffed', 'Cuffed tubes commonly sized ~0.5 mm smaller than the uncuffed Cole estimate. Confirm leak and ventilation after placement.'),
    ],
    calculate(values) {
      const age = num(values.age, 4);
      const type = String(values.tubeType ?? 'uncuffed');
      const uncuffed = age / 4 + 4;
      const cuffed = uncuffed - 0.5;
      const size = type === 'cuffed' ? cuffed : uncuffed;
      const rounded = round(size * 2, 0) / 2; // nearest 0.5

      const depth = round(age / 2 + 12, 1); // lip depth cm educational

      return {
        score: rounded,
        unit: 'mm ID',
        label: `${type === 'cuffed' ? 'Cuffed' : 'Uncuffed'} ≈ ${rounded} mm`,
        interpretation: `Estimated ${type} ETT internal diameter ≈ ${rounded} mm (raw ${round(size, 2)}). Have tubes 0.5 mm larger and smaller available. Approximate oral depth mark ≈ ${depth} cm at lips (age/2+12) — confirm clinically.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Uncuffed formula', value: `age/4+4 = ${round(uncuffed, 2)}` },
          { label: 'Cuffed estimate', value: `${round(cuffed, 2)} mm` },
          { label: 'Approx depth (oral)', value: `${depth} cm` },
        ],
        recommendations: [
          'Confirm with Broselow / manufacturer guidance',
          'Neonates use different sizing (weight-based), not this formula',
          'Ensure leak and ventilation adequacy after placement',
        ],
      };
    },
    evidence: {
      summary: 'Uncuffed ETT ID (mm) ≈ age(years)/4 + 4. Cuffed tubes commonly sized ~0.5 mm smaller. Depth often age/2 + 12 cm orally.',
      formula: 'Uncuffed = age/4 + 4; Cuffed ≈ formula − 0.5',
      validation: 'Classic teaching formulas; individual anatomy and cuffed-tube practice vary — clinical confirmation required.',
      references: [
        { title: 'AHA Pediatric Advanced Life Support (PALS)', citation: 'American Heart Association PALS provider materials', year: 2020, url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric' },
      ],
    },
    nextSteps: [
      { condition: 'Before RSI', actions: ['Prepare 3 sizes', 'Confirm suction and backup airway', 'ETCO₂ confirmation plan'] },
    ],
    pearls: ['Formula less accurate at extremes of age/size.', 'Cuffed tubes are now common in many pediatric EDs when used carefully.'],
  },

  {
    id: 'pediatric-bp-threshold',
    name: 'Pediatric Hypotension SBP Threshold (PALS-style)',
    shortName: 'Peds SBP',
    description: 'Minimum systolic BP thresholds by age band using PALS-style cutoffs for hypotension.',
    category: 'pediatrics',
    tags: ['pals', 'hypotension', 'blood pressure', 'shock', 'pediatric'],
    whenToUse: 'Ill children when interpreting whether SBP is below age-based hypotension threshold.',
    whyUse: 'PALS defines hypotension cutoffs that differ markedly by age; adults thresholds mislead.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: 'Term neonate (0–28 days)', value: 'neonate' },
        { label: 'Infant (1–12 months)', value: 'infant' },
        { label: '1–10 years (use age in formula)', value: 'child' },
        { label: '>10 years', value: 'teen' },
      ], 'neonate', 'PALS hypotension if SBP <60 (term neonate), <70 (infant 1–12 mo), <70+2×age(years) for 1–10 y, <90 if >10 y. The years field only applies to the 1–10 y band.'),
      numberInput('ageYears', 'Age in years (if 1–10)', { min: 1, max: 10, step: 0.5, defaultValue: 4, helpText: 'Used only when age band is 1–10 years. Threshold = 70 + 2×age. Ignored for neonate/infant/teen bands.' }),
      numberInput('sbp', 'Measured systolic BP', { unit: 'mmHg', min: 30, max: 200, defaultValue: 85, helpText: 'Use a correctly sized cuff. Hypotension is a late finding — also assess HR, CRT, and mentation for compensated shock.' }),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'child');
      const ageY = num(values.ageYears, 4);
      const sbp = num(values.sbp, 85);

      let threshold: number;
      let bandLabel: string;
      if (band === 'neonate') {
        threshold = 60;
        bandLabel = 'Neonate';
      } else if (band === 'infant') {
        threshold = 70;
        bandLabel = 'Infant';
      } else if (band === 'teen') {
        threshold = 90;
        bandLabel = '>10 years';
      } else {
        threshold = 70 + 2 * ageY;
        bandLabel = `${ageY} years`;
      }

      const low = sbp < threshold;
      const delta = sbp - threshold;

      return {
        score: threshold,
        unit: 'mmHg min',
        label: low ? 'Below hypotension threshold' : 'At or above threshold',
        interpretation: low
          ? `SBP ${sbp} is below PALS-style minimum for ${bandLabel} (<${threshold} mmHg). Treat as hypotension / shock until proven otherwise — evaluate perfusion, not BP alone.`
          : `SBP ${sbp} is ≥ ${threshold} mmHg threshold for ${bandLabel} (${delta >= 0 ? '+' : ''}${round(delta, 0)} mmHg). Normal BP does not exclude compensated shock.`,
        riskLevel: low ? 'critical' : 'low',
        details: [
          { label: 'Age band', value: bandLabel },
          { label: 'Hypotension if SBP <', value: `${threshold} mmHg` },
          { label: 'Measured SBP', value: `${sbp} mmHg` },
        ],
        recommendations: low
          ? ['ABCs / oxygen', 'Fluid bolus unless cardiogenic concern', 'Identify shock type', 'PALS algorithms']
          : ['Assess HR, CRT, mentation, urine output for compensated shock'],
      };
    },
    evidence: {
      summary:
        'PALS: hypotension if SBP <60 (term neonate), <70 (infants), <70+2×age(years) for 1–10 y, <90 for >10 y.',
      formula: 'Neonate <60; infant <70; 1–10 y: <70+2×age; >10 y: <90',
      validation: 'Standard PALS teaching thresholds for decompensated hypotension.',
      references: [
        { title: 'AHA Pediatric Advanced Life Support (PALS)', citation: 'American Heart Association PALS provider materials', year: 2020, url: 'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/pediatric' },
      ],
    },
    nextSteps: [
      { condition: 'Hypotensive', actions: ['Resuscitate per PALS', 'IV/IO access', '20 mL/kg crystalloid (or 10 mL/kg if cardiac)'] },
      { condition: 'Normotensive but poor perfusion', actions: ['Treat compensated shock', 'Do not be reassured by “normal” BP alone'] },
    ],
    pearls: [
      'Hypotension is a late finding in children — earlier signs are tachycardia and delayed CRT.',
      'Use proper cuff size; wrong cuff distorts SBP.',
    ],
  },

  {
    id: 'holliday-segar',
    name: 'Holliday-Segar Daily Maintenance Fluids',
    shortName: 'Holliday-Segar',
    description: 'Daily and hourly IV maintenance fluid volume by weight (100/50/20 and 4/2/1 rules).',
    category: 'pediatrics',
    tags: ['fluids', 'maintenance', 'holliday-segar', 'iv fluids', 'pediatric'],
    whenToUse: 'Children needing maintenance IV fluids when calculating daily/hourly volume.',
    whyUse: 'Classic weight-based maintenance estimate used worldwide.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 100, step: 0.1, defaultValue: 15, helpText: 'Holliday-Segar daily: first 10 kg → 100 mL/kg; next 10 kg → 50 mL/kg; each kg >20 → 20 mL/kg. Hourly 4/2/1 is the same math. Deficit replacement is separate.' }),
    ],
    calculate(values) {
      const w = num(values.weight, 15);
      let daily: number;
      if (w <= 10) daily = 100 * w;
      else if (w <= 20) daily = 1000 + 50 * (w - 10);
      else daily = 1500 + 20 * (w - 20);

      // Hourly 4-2-1
      let hourly: number;
      if (w <= 10) hourly = 4 * w;
      else if (w <= 20) hourly = 40 + 2 * (w - 10);
      else hourly = 60 + 1 * (w - 20);

      const dailyFromHourly = hourly * 24;

      return {
        score: round(daily, 0),
        unit: 'mL/day',
        label: `${round(daily, 0)} mL/day (${round(hourly, 1)} mL/h)`,
        interpretation: `Holliday-Segar maintenance ≈ ${round(daily, 0)} mL/day or ${round(hourly, 1)} mL/h (4-2-1). Adjust for fever, losses, SIADH risk, cardiac/renal disease, and isotonic fluid policies.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'Daily (100/50/20)', value: `${round(daily, 0)} mL` },
          { label: 'Hourly (4/2/1)', value: `${round(hourly, 1)} mL/h` },
          { label: '24× hourly check', value: `${round(dailyFromHourly, 0)} mL` },
        ],
        recommendations: [
          'Prefer isotonic maintenance fluids in many hospitalized children per modern guidelines',
          'Include K+ when urine output established and renal function allows',
          'Deficit replacement is separate from maintenance',
        ],
      };
    },
    evidence: {
      summary: 'Holliday-Segar: first 10 kg → 100 mL/kg/day; next 10 kg → 50 mL/kg/day; each kg >20 → 20 mL/kg/day. Hourly: 4/2/1 mL/kg/h.',
      formula: 'Daily: 100×min(w,10)+50×min(max(w-10,0),10)+20×max(w-20,0); Hourly: 4/2/1',
      validation: 'Classic 1957 method; still foundational though fluid composition guidance has evolved.',
      references: [
        { title: 'The maintenance need for water in parenteral fluid therapy', citation: 'Holliday MA, Segar WE. Pediatrics. 1957', year: 1957, pmid: '13431307' },
      ],
    },
    nextSteps: [
      { condition: 'Calculating IV fluids', actions: ['Separate deficit / ongoing losses', 'Choose fluid type per guidelines', 'Monitor Na and volume status'] },
    ],
    pearls: [
      'Obese children: consider ideal body weight for maintenance in some protocols.',
      'Never blindly apply full maintenance in SIADH, meningitis, or severe pneumonia without Na monitoring.',
    ],
  },

  {
    id: 'kdigo-peds-aki',
    name: 'Pediatric KDIGO AKI Stage (Creatinine)',
    shortName: 'KDIGO AKI Peds',
    description: 'Stages acute kidney injury by creatinine rise using KDIGO criteria (pediatric-applicable).',
    category: 'pediatrics',
    tags: ['aki', 'kdigo', 'creatinine', 'nephrology', 'pediatric'],
    whenToUse: 'Children with rising creatinine when staging AKI severity.',
    whyUse: 'KDIGO stages guide monitoring intensity and nephrology involvement; same fold-change stages apply in pediatrics.',
    inputs: [
      numberInput('baselineCr', 'Baseline creatinine', { unit: 'mg/dL', min: 0.1, max: 10, step: 0.01, defaultValue: 0.4, helpText: 'Prior nadir or documented baseline from the relevant window — not an unrelated historical value.' }),
      numberInput('currentCr', 'Current creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 0.6, helpText: 'KDIGO Stage 1: ≥0.3 mg/dL rise within 48 h, or ≥1.5× baseline within 7 days. Use a creatinine from that window as baseline/current. A 0.3 rise over weeks is not AKI.' }),
      yesNo('dialysis', 'Renal replacement therapy initiated', 3, 'Any RRT (HD, PD, CRRT) for this AKI episode is KDIGO Stage 3 regardless of creatinine.'),
      yesNo('egfr35', 'eGFR <35 mL/min/1.73m² (for patients <18 y) — stage 3 criterion', 3, 'Pediatric KDIGO Stage 3 criterion: eGFR <35 in patients <18 years. Adult Stage 3 also includes Cr ≥4.0 mg/dL (applied automatically from current Cr).'),
    ],
    calculate(values) {
      const base = num(values.baselineCr, 0.4);
      const cur = num(values.currentCr, 0.6);
      const dialysis = bool(values.dialysis);
      const egfr35 = bool(values.egfr35);

      if (base <= 0) {
        return {
          score: '—',
          label: 'Invalid baseline',
          interpretation: 'Baseline creatinine must be >0.',
          riskLevel: 'info',
        };
      }

      const ratio = cur / base;
      const absRise = cur - base;

      let stage = 0;
      if (dialysis || egfr35 || ratio >= 3 || cur >= 4) stage = 3;
      else if (ratio >= 2) stage = 2;
      else if (ratio >= 1.5 || absRise >= 0.3) stage = 1;

      // Absolute ≥0.3 within 48h is stage 1 even if ratio <1.5
      const label = stage === 0 ? 'No AKI by Cr criteria' : `AKI Stage ${stage}`;
      const riskLevel = stage === 0 ? 'low' : stage === 1 ? 'moderate' : stage === 2 ? 'high' : 'critical';

      const interpretation =
        stage === 0
          ? `Current Cr ${cur} vs baseline ${base} (×${round(ratio, 2)}). Does not meet KDIGO creatinine criteria for AKI (needs ≥1.5× baseline or +0.3 mg/dL). Still consider UOP criteria.`
          : `KDIGO creatinine stage ${stage}: current ${cur} mg/dL vs baseline ${base} (×${round(ratio, 2)}${absRise >= 0.3 ? `; Δ+${round(absRise, 2)}` : ''})${dialysis ? '; RRT' : ''}${egfr35 ? '; eGFR <35' : ''}. Integrate urine output staging if available.`;

      return {
        score: stage,
        label,
        interpretation,
        riskLevel: riskLevel as 'low' | 'moderate' | 'high' | 'critical',
        details: [
          { label: 'Fold change', value: `×${round(ratio, 2)}` },
          { label: 'Absolute rise', value: `${round(absRise, 2)} mg/dL` },
        ],
        recommendations:
          stage >= 2
            ? ['Nephrology consult', 'Stop nephrotoxins', 'Careful fluid/electrolyte management', 'Monitor UOP and electrolytes']
            : stage === 1
              ? ['Serial Cr and UOP', 'Review meds', 'Avoid further renal insults']
              : ['Continue monitoring if clinically at risk'],
      };
    },
    evidence: {
      summary:
        'KDIGO Cr: Stage 1 = ≥1.5–1.9× baseline or ≥0.3 mg/dL rise; Stage 2 = 2.0–2.9×; Stage 3 = ≥3×, Cr ≥4.0, RRT, or eGFR <35 in <18 y.',
      formula: 'Stage by max of fold-change, absolute rise, RRT, pediatric eGFR criterion',
      validation: 'KDIGO 2012 criteria used in pediatric nephrology; UOP criteria are parallel (not fully entered here).',
      references: [
        { title: 'KDIGO Clinical Practice Guideline for Acute Kidney Injury', citation: 'Kidney Int Suppl. 2012 (KDIGO AKI)', year: 2012,
          url: 'https://kdigo.org/guidelines/acute-kidney-injury/' },
      ],
    },
    nextSteps: [
      { condition: 'Stage ≥2', actions: ['Nephrology', 'Hemodynamic optimization', 'Renal dosing of meds'] },
      { condition: 'Stage 1', actions: ['Monitor closely', 'Prevent progression'] },
    ],
    pearls: [
      'Baseline Cr may be unknown in children — use prior nadir or age-expected values carefully.',
      'Urine output criteria can stage AKI even when Cr has not yet risen.',
    ],
  },

  {
    id: 'urine-output-peds',
    name: 'Pediatric Urine Output / Oliguria',
    shortName: 'Peds UOP',
    description: 'Interprets urine output in mL/kg/h against pediatric oliguria thresholds.',
    category: 'pediatrics',
    tags: ['urine output', 'oliguria', 'aki', 'pediatric', 'fluids'],
    whenToUse: 'Hospitalized children when assessing oliguria or AKI by urine volume.',
    whyUse: 'Weight-normalized UOP is more meaningful than absolute mL/h in pediatrics.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 100, step: 0.1, defaultValue: 12 }),
      numberInput('urineMl', 'Urine volume', { unit: 'mL', min: 0, max: 5000, defaultValue: 120 }),
      numberInput('hours', 'Collection period', { unit: 'hours', min: 0.5, max: 48, step: 0.5, defaultValue: 6, helpText: 'UOP (mL/kg/h) = volume ÷ weight ÷ hours. KDIGO stage 1 oliguria is <0.5 mL/kg/h for ≥6–12 h; neonates/young infants often use <1 mL/kg/h.' }),
      selectInput('ageGroup', 'Age group (threshold context)', [
        { label: 'Neonate / young infant (oliguria often <1 mL/kg/h)', value: 'neonate' },
        { label: 'Child (KDIGO-style <0.5 mL/kg/h)', value: 'child' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 12);
      const vol = num(values.urineMl, 120);
      const hrs = num(values.hours, 6);
      const ageG = String(values.ageGroup ?? 'child');

      if (w <= 0 || hrs <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Weight and hours must be >0.',
          riskLevel: 'info',
        };
      }

      const uop = round(vol / w / hrs, 2);
      const neoCut = 1.0;
      const childCut = 0.5;
      const cut = ageG === 'neonate' ? neoCut : childCut;
      const oliguria = uop < cut;
      const anuria = uop < 0.1;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Adequate UOP';
      if (anuria) {
        riskLevel = 'critical';
        label = 'Severe oliguria / near-anuria';
      } else if (oliguria) {
        riskLevel = 'high';
        label = 'Oliguria';
      } else if (uop < cut + 0.2) {
        riskLevel = 'moderate';
        label = 'Low-normal UOP';
      }

      return {
        score: uop,
        unit: 'mL/kg/h',
        label,
        interpretation: anuria
          ? `UOP ${uop} mL/kg/h over ${hrs} h — near-anuric. Urgent evaluation for obstruction, severe hypovolemia/shock, or intrinsic renal failure.`
          : oliguria
            ? `UOP ${uop} mL/kg/h is below ${cut} mL/kg/h threshold for ${ageG === 'neonate' ? 'neonates/young infants' : 'children (KDIGO-style)'}. Assess volume status, perfusion, nephrotoxins, and AKI stage.`
            : `UOP ${uop} mL/kg/h is at or above ${cut} mL/kg/h threshold used here. Interpret with fluid intake, diuretics, and clinical context.`,
        riskLevel,
        details: [
          { label: 'Volume / time / weight', value: `${vol} mL / ${hrs} h / ${w} kg` },
          { label: 'Threshold used', value: `<${cut} mL/kg/h` },
        ],
      };
    },
    evidence: {
      summary:
        'Pediatric oliguria commonly taught as <1 mL/kg/h in neonates/infants; KDIGO AKI uses <0.5 mL/kg/h for ≥6–12 h (stage 1) with longer/deeper cuts for higher stages.',
      formula: 'UOP (mL/kg/h) = volume ÷ weight ÷ hours',
      validation: 'Standard pediatric critical care / KDIGO urine criteria.',
      references: [
        { title: 'KDIGO Clinical Practice Guideline for Acute Kidney Injury', citation: 'Kidney Int Suppl. 2012 (KDIGO AKI)', year: 2012,
          url: 'https://kdigo.org/guidelines/acute-kidney-injury/' },
      ],
    },
    nextSteps: [
      { condition: 'Oliguria', actions: ['Assess shock/hypovolemia', 'Bladder scan / catheter flush', 'Labs (Cr, lytes)', 'Fluid challenge if hypovolemic'] },
    ],
    pearls: [
      'Post-obstructive and diuretic phases can produce high UOP with ongoing AKI.',
      'Document exact start/stop times for timed collections.',
    ],
  },

  {
    id: 'pecarn-abd',
    name: 'PECARN Blunt Abdominal Trauma (Simplified)',
    shortName: 'PECARN Abd',
    description: 'Simplified PECARN prediction rule helper for clinically important intra-abdominal injury after blunt trauma.',
    category: 'emergency',
    tags: ['pecarn', 'trauma', 'abdomen', 'pediatric', 'ct'],
    whenToUse: 'Children with blunt torso trauma when deciding need for abdominal CT.',
    whyUse: 'Identifies very low-risk children who may avoid CT radiation if no predictors present.',
    inputs: [
      yesNo('abdominalWall', 'Evidence of abdominal wall trauma / seat-belt or handlebar injury or abdominal tenderness', 1, 'Yes if ANY: abdominal wall trauma, seat-belt sign, handlebar mark, OR abdominal tenderness (Holmes treats wall trauma and tenderness as separate predictors; either fails very-low-risk).'),
      yesNo('peritoneal', 'Peritoneal irritation (rebound, guarding, rigidity)', 1, 'Not one of the published 7-variable Holmes predictors — extra clinical flag.'),
      yesNo('thoracic', 'Thoracic wall trauma', 1, 'Chest wall trauma (contusion, crepitus, or seat-belt sign on the thorax).'),
      yesNo('complainsPain', 'Complains of abdominal pain', 1, 'Child verbalizes abdominal pain, or a preverbal child has clear abdominal pain behavior.'),
      yesNo('decreasedBreath', 'Decreased breath sounds', 1, 'Asymmetric or decreased breath sounds on auscultation.'),
      yesNo('vomiting', 'Vomiting', 1, 'Vomiting after the injury (not lifetime or unrelated vomiting).'),
      yesNo('gcsLow', 'GCS ≤13 or altered mentation', 1, 'GCS ≤13 (rule uses GCS <14). GCS 14–15 is the low-risk mental-status band.'),
      yesNo('distracting', 'Distracting painful injury (optional clinical judgment)', 0, 'Not in the published 7-variable rule — extra clinical flag.'),
    ],
    calculate(values) {
      const predictors = [
        { k: 'abdominalWall', l: 'Abdominal wall trauma / seat belt / tenderness' },
        { k: 'peritoneal', l: 'Peritoneal signs' },
        { k: 'thoracic', l: 'Thoracic wall trauma' },
        { k: 'complainsPain', l: 'Abdominal pain' },
        { k: 'decreasedBreath', l: 'Decreased breath sounds' },
        { k: 'vomiting', l: 'Vomiting' },
        { k: 'gcsLow', l: 'GCS ≤13 / altered' },
      ];
      const present = predictors.filter((p) => bool(values[p.k])).map((p) => p.l);
      const n = present.length;
      const lowRisk = n === 0 && !bool(values.distracting);

      return {
        score: n,
        label: lowRisk ? 'Very low risk pattern' : 'Not very low risk',
        interpretation: lowRisk
          ? 'No listed PECARN-style predictors: very low risk of clinically important intra-abdominal injury in derivation/validation cohorts — CT often unnecessary if reliable exam and observation feasible. Clinical judgment still required.'
          : `Predictor(s) present: ${present.join('; ') || 'clinical concern'}. Not in very-low-risk group — consider labs, observation, or CT per clinical suspicion and institutional pathway.`,
        riskLevel: lowRisk ? 'low' : n >= 2 || bool(values.peritoneal) || bool(values.gcsLow) ? 'high' : 'moderate',
        details: [
          { label: 'Positive predictors', value: present.length ? present.join(', ') : 'None' },
          { label: 'Count', value: String(n) },
        ],
        recommendations: lowRisk
          ? ['Consider observation without CT', 'Return precautions / serial exams', 'Shared decision-making']
          : ['Do not discharge solely as “low risk”', 'Imaging / labs based on exam', 'Trauma team as indicated'],
      };
    },
    evidence: {
      summary:
        'PECARN blunt abdominal trauma rules identify children at very low risk of clinically important IAI when history/exam predictors are absent; presence of predictors does not mandate CT but raises concern.',
      formula: 'Very low risk if no rule predictors; otherwise not very low risk',
      validation: 'Multicenter PECARN networks; apply only to appropriate blunt trauma populations.',
      references: [
        {
          title: 'Identifying children at very low risk of clinically important blunt abdominal injuries',
          citation: 'Holmes JF et al. Ann Emerg Med. 2013 (PECARN)',
          year: 2013,
          pmid: '23375510',
          doi: '10.1016/j.annemergmed.2012.11.009',
        },
      ],
    },
    nextSteps: [
      { condition: 'Very low risk', actions: ['Observation vs discharge with reliable follow-up'] },
      { condition: 'Predictors present', actions: ['Serial exam', 'AST/ALT, CBC often used', 'CT if high concern'] },
    ],
    pearls: [
      'This is a simplified educational checklist — use full published rule variables as implemented locally.',
      'Laboratory prediction rules (e.g., AST) may complement history/exam.',
    ],
  },

  {
    id: 'bronchiolitis-severity',
    name: 'Bronchiolitis Clinical Severity Bands',
    shortName: 'Bronchiolitis',
    description: 'Clinical mild / moderate / severe banding for viral bronchiolitis based on respiratory status.',
    category: 'pediatrics',
    tags: ['bronchiolitis', 'rsv', 'wheeze', 'pediatric', 'respiratory'],
    whenToUse: 'Infants and young children with bronchiolitis for severity-based disposition and support.',
    whyUse: 'Structures work of breathing, feeding, and oxygen need into actionable severity bands.',
    inputs: [
      selectInput('wob', 'Work of breathing', [
        { label: 'Mild / minimal retractions', value: 0, description: 'None or barely visible intercostal retractions; no nasal flaring, grunting, or head bobbing' },
        { label: 'Moderate retractions / nasal flaring', value: 1, description: 'Obvious intercostal ± subcostal retractions and/or nasal flaring; no grunting or head bobbing' },
        { label: 'Severe retractions / grunting / head bobbing', value: 2, description: 'Deep retractions (including suprasternal/tracheal tug) with grunting and/or head bobbing' },
      ], 0, 'Score at rest, not while crying. Mild = minimal/no retractions; moderate = obvious retractions ± flaring; severe = grunting, head bobbing, or tracheal tug.'),
      selectInput('rr', 'Respiratory rate', [
        { label: 'Normal–mildly elevated for age', value: 0, description: 'Within or slightly above PALS normal for age' },
        { label: 'Moderately elevated', value: 1, description: 'Clearly above PALS normal (see help text)' },
        { label: 'Markedly elevated or irregular / apneas', value: 2, description: 'Markedly high, irregular, or any apnea' },
      ], 0, 'PALS/AAP-style RR reminder (breaths/min): infant <1 y ~30–53; 1–2 y ~22–37; 3–5 y ~20–28; 6–12 y ~18–25. Educational mapping: 0 = within or slightly above those ranges; 1 = clearly above (e.g. infant >60, toddler >50, preschool >40); 2 = markedly high/irregular or any apnea. Use local bronchiolitis pathway RR cutoffs by age; this item is not a validated numeric scale.'),
      selectInput('feeding', 'Feeding / hydration', [
        { label: 'Normal feeding', value: 0, description: 'Takes usual volumes; no extra effort or prolonged feeds' },
        { label: 'Decreased feeding; may need NG/IV support', value: 1, description: 'Takes less than usual or tiring/prolonged feeds; may need NG or IV fluids' },
        { label: 'Unable to feed / dehydrated', value: 2, description: 'Cannot feed due to distress, or clinical dehydration' },
      ], 0, 'Compare to this infant’s usual intake. Unable to feed or dehydrated is a severe-band driver.'),
      selectInput('o2', 'Oxygen requirement / SpO₂', [
        { label: 'SpO₂ ≥92–94% in room air (local target)', value: 0, description: 'Meets local target on room air (many pathways use ≥90–92% or ≥92–94%)' },
        { label: 'Needs low-flow O₂', value: 1, description: 'Supplemental O₂ via nasal cannula to meet target' },
        { label: 'High O₂ need / HFNC / impending failure', value: 2, description: 'High-flow, high FiO₂, or signs of respiratory failure' },
      ], 0, 'Use your pathway’s SpO₂ target. High-flow or impending failure maps to severe.'),
      selectInput('behavior', 'Appearance / behavior', [
        { label: 'Alert, interactive', value: 0, description: 'Age-appropriate interaction' },
        { label: 'Irritable or mildly lethargic', value: 1, description: 'Difficult to console or less interactive than usual but still arousable' },
        { label: 'Lethargic, poorly responsive', value: 2, description: 'Difficult to arouse; poor eye contact; not interacting' },
      ], 0, 'Poorly responsive / lethargic is a severe-band finding even if WOB looks moderate.'),
      yesNo('apnea', 'Apnea observed', 0, 'Cessation of breathing ≥15–20 s, or a shorter pause with bradycardia or cyanosis (AAP bronchiolitis).'),
      yesNo('highRisk', 'High-risk host (prematurity, hemodynamically significant CHD, immunodeficiency, etc.)', 0, 'Prematurity (especially <12 weeks postnatal or ex-preemie), hemodynamically significant CHD, immunodeficiency, chronic lung disease, or neuromuscular disease — lower admission threshold even if the exam is mild.'),
    ],
    calculate(values) {
      const sum =
        num(values.wob) +
        num(values.rr) +
        num(values.feeding) +
        num(values.o2) +
        num(values.behavior);
      const apnea = bool(values.apnea);
      const highRisk = bool(values.highRisk);

      let band = 'Mild';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (apnea || num(values.o2) >= 2 || num(values.behavior) >= 2 || sum >= 8) {
        band = 'Severe';
        riskLevel = 'critical';
      } else if (sum >= 4 || num(values.o2) >= 1 || num(values.feeding) >= 1) {
        band = 'Moderate';
        riskLevel = 'moderate';
      }

      if (highRisk && band === 'Mild') {
        band = 'Mild–moderate (high-risk host)';
        riskLevel = 'moderate';
      }

      return {
        score: sum,
        label: band,
        interpretation:
          band.startsWith('Severe') || band === 'Severe'
            ? `Severity band: Severe (domain sum ${sum}${apnea ? '; apnea' : ''}). Hospitalize; escalate O₂/HFNC/ICU as needed; supportive care is mainstay.`
            : band.startsWith('Moderate') || band === 'Moderate'
              ? `Severity band: Moderate (sum ${sum}). Often observe/admit for feeding support and oxygen; minimize unnecessary therapies.`
              : `Severity band: Mild (sum ${sum}). Many can be managed as outpatients with feeding/hydration teaching and return precautions${highRisk ? ' — lower threshold to admit high-risk hosts' : ''}.`,
        riskLevel,
        details: [
          { label: 'Domain sum (0–10)', value: String(sum) },
          { label: 'Apnea', value: apnea ? 'Yes' : 'No' },
          { label: 'High-risk host', value: highRisk ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Supportive care: hydration, oxygen to target SpO₂, nasal suctioning',
          'Routine bronchodilators, steroids, CXR not indicated for typical bronchiolitis',
        ],
      };
    },
    evidence: {
      summary:
        'Bronchiolitis severity is clinical (WOB, RR, feeding, hypoxia, apnea). AAP guidelines emphasize supportive care and risk-based disposition.',
      formula: 'Educational sum of WOB+RR+feeding+O₂+behavior; apnea or high O₂ → severe',
      validation: 'Aligned with common clinical pathways; not a single validated numeric score.',
      references: [
        { title: 'Clinical practice guideline: the diagnosis, management, and prevention of bronchiolitis', citation: 'Ralston SL et al. Pediatrics. 2014', year: 2014, pmid: '25349312',
          doi: '10.1542/peds.2014-2742', },
      ],
    },
    nextSteps: [
      { condition: 'Severe / apnea', actions: ['Admit', 'Cardiorespiratory monitoring', 'Escalate respiratory support'] },
      { condition: 'Mild, reliable caregivers', actions: ['Discharge teaching', 'Hydration plan', 'Return if worse WOB/poor feeding'] },
    ],
    pearls: ['Peak illness often day 3–5 of symptoms.', 'Youngest infants (<12 weeks) and ex-preemies warrant lower admission threshold.'],
  },

  {
    id: 'asthma-exacerbation-peds',
    name: 'Pediatric Asthma Exacerbation Severity',
    shortName: 'Peds Asthma Exac',
    description: 'Clinical severity grading of acute asthma exacerbation in children (mild–life-threatening).',
    category: 'pediatrics',
    tags: ['asthma', 'exacerbation', 'pediatric', 'wheeze', 'respiratory'],
    whenToUse: 'Children with acute asthma flare for severity-based treatment intensity.',
    whyUse: 'Aligns exam findings with stepwise acute asthma therapy and disposition.',
    inputs: [
      selectInput('speech', 'Speech / activity', [
        { label: 'Sentences; normal activity', value: 0, description: 'Speaks in full sentences; can lie down; walks normally' },
        { label: 'Phrases; prefers sitting', value: 1, description: 'Speaks in phrases; prefers sitting; activity limited' },
        { label: 'Words; hunched forward', value: 2, description: 'Speaks in single words; hunched; accessory muscles' },
        { label: 'Unable to speak / drowsy', value: 3, description: 'Too dyspneic to speak, or drowsy/confused (life-threatening)' },
      ], 0, 'GINA/NAEPP speech bands: sentences (mild) → phrases (moderate) → words (severe) → unable/drowsy (life-threatening).'),
      selectInput('wob', 'Work of breathing / accessory muscles', [
        { label: 'Minimal', value: 0, description: 'Little or no accessory-muscle use' },
        { label: 'Moderate', value: 1, description: 'Moderate retractions (intercostal ± subcostal)' },
        { label: 'Severe retractions', value: 2, description: 'Severe: suprasternal, tracheal tug, and/or nasal flaring' },
        { label: 'Silent exhaustion / poor effort', value: 3, description: 'Silent chest, poor respiratory effort, or exhaustion (life-threatening)' },
      ], 0, 'GINA/NAEPP-style accessory-muscle grading. Silent chest / poor effort / exhaustion is a life-threatening red flag.'),
      selectInput('wheeze', 'Wheeze', [
        { label: 'Moderate end-expiratory', value: 0, description: 'Wheeze only at end-expiration, or moderate intensity; air entry preserved' },
        { label: 'Loud throughout expiration', value: 1, description: 'Loud expiratory wheeze throughout expiration' },
        { label: 'Inspiratory + expiratory', value: 2, description: 'Biphasic wheeze (inspiration and expiration)' },
        { label: 'Silent chest', value: 3, description: 'Little or no wheeze because of critically reduced air entry (life-threatening)' },
      ], 0, 'Auscultate both lungs. Silent chest is absent wheeze with poor air entry — a life-threatening finding, not “mild.”'),
      selectInput('hr', 'Heart rate (age-relative)', [
        { label: 'Normal–mildly elevated', value: 0, description: 'Near age-expected resting HR' },
        { label: 'Moderately elevated', value: 1, description: 'Age-relative tachycardia (see help text)' },
        { label: 'Markedly elevated', value: 2, description: 'Marked age-relative tachycardia' },
      ], 0, 'GINA/NAEPP-style age-relative tachycardia: 0–3 y: ~160–180 moderate, >180–200 severe; 4–5 y: ~140–160 moderate, >160–180 severe; ≥6 y: >110–120 moderate, >120–140 severe. Bradycardia with poor effort is life-threatening (use the altered/exhaustion flag). Use the hospital table if it differs.'),
      selectInput('spo2', 'SpO₂ on air', [
        { label: '≥94%', value: 0, description: 'Room-air SpO₂ ≥94% (GINA mild band)' },
        { label: '90–93%', value: 1, description: 'Room-air SpO₂ 90–93% (moderate–severe band)' },
        { label: '<90%', value: 2, description: 'Room-air SpO₂ <90% (severe / life-threatening hypoxia)' },
      ], 0, 'Score on room air when safe. Cyanosis, SpO₂ <90%, or exhaustion maps to life-threatening features via the next item.'),
      yesNo('altered', 'Altered consciousness / exhaustion / cyanosis', 0, 'Any of: drowsy/confused, exhaustion, or central cyanosis — GINA life-threatening features. Forces the life-threatening band regardless of domain sum.'),
    ],
    calculate(values) {
      const sum =
        num(values.speech) +
        num(values.wob) +
        num(values.wheeze) +
        num(values.hr) +
        num(values.spo2);
      const altered = bool(values.altered);

      let band = 'Mild';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (altered || num(values.speech) >= 3 || num(values.wheeze) >= 3 || num(values.wob) >= 3) {
        band = 'Life-threatening features';
        riskLevel = 'critical';
      } else if (sum >= 8 || num(values.spo2) >= 2) {
        band = 'Severe';
        riskLevel = 'high';
      } else if (sum >= 4) {
        band = 'Moderate';
        riskLevel = 'moderate';
      }

      return {
        score: sum,
        label: band,
        interpretation:
          band === 'Life-threatening features'
            ? `Life-threatening features present (sum ${sum}). Continuous bronchodilators, O₂, systemic steroids, early magnesium/ICU involvement; prepare for respiratory failure.`
            : band === 'Severe'
              ? `Severe exacerbation (sum ${sum}). Frequent nebulized SABA ± ipratropium, O₂ to target, systemic corticosteroids; observe closely for ICU needs.`
              : band === 'Moderate'
                ? `Moderate exacerbation (sum ${sum}). SABA, early steroids, oxygen if needed; reassess after first hour.`
                : `Mild exacerbation (sum ${sum}). SABA, consider steroids if incomplete response; may discharge if sustained improvement.`,
        riskLevel,
        recommendations: [
          'Reassess after each bronchodilator round',
          'Systemic corticosteroids for all but the mildest quickly-resolving cases',
          'Silent chest and altered mentation are emergencies',
        ],
      };
    },
    evidence: {
      summary:
        'Pediatric acute asthma severity uses speech, accessory use, air entry/wheeze, HR, SpO₂, and consciousness. Life-threatening signs include silent chest, cyanosis, poor effort, altered consciousness.',
      formula: 'Educational domain sum + life-threatening red flags',
      validation: 'Consistent with NAEPP/GINA and pediatric emergency pathways.',
      references: [
        { title: 'Expert Panel Report 3: Guidelines for the Diagnosis and Management of Asthma', citation: 'NHLBI EPR-3', year: 2007, url: 'https://www.nhlbi.nih.gov/health-topics/guidelines-for-diagnosis-management-of-asthma' },
        { title: 'Global Initiative for Asthma (GINA) Report', citation: 'GINA Report', year: 2024, url: 'https://ginasthma.org/reports/' },
      ],
    },
    nextSteps: [
      { condition: 'Life-threatening / severe', actions: ['Continuous SABA', 'Ipratropium', 'Steroids', 'MgSO₄', 'ICU consult'] },
      { condition: 'Mild–moderate improving', actions: ['Space treatments', 'Discharge plan / controller review'] },
    ],
    pearls: ['SpO₂ can look acceptable until late — watch work of breathing.', 'Anxious quiet child may be more severe than noisy wheezer.'],
  },

  {
    id: 'pas-asthma',
    name: 'Pediatric Asthma Score (PAS)',
    shortName: 'PAS',
    description: 'Pediatric Asthma Score components (respiratory rate, O₂, auscultation, retractions, dyspnea) total 5–15 style.',
    category: 'pediatrics',
    tags: ['asthma', 'pas', 'pediatric', 'severity'],
    whenToUse: 'Pediatric ED/inpatient pathways that use PAS for escalation and discharge readiness.',
    whyUse: 'Standardized scoring used in many children’s hospital asthma pathways.',
    inputs: [
      selectInput('rr', 'Respiratory rate (age-adjusted severity)', [
        { label: 'Normal for age (1)', value: 1, description: 'Within the age-band “1” column in help text' },
        { label: 'Mildly elevated (2)', value: 2, description: 'Age-band middle column' },
        { label: 'Markedly elevated (3)', value: 3, description: 'Age-band highest column' },
      ], 1, 'Common PAS pathway RR (breaths/min; Kelly / Children’s Mercy style). 2–12 mo: ≤50 = 1, 51–59 = 2, ≥60 = 3. 1–2 y: ≤40 = 1, 41–44 = 2, ≥45 = 3. 2–3 y: ≤34 = 1, 35–39 = 2, ≥40 = 3. 4–5 y: ≤30 / 31–35 / ≥36. 6–12 y: ≤26 / 27–30 / ≥31. >12 y: ≤23 / 24–27 / ≥28. Use the hospital PAS chart if it differs.'),
      selectInput('o2', 'Oxygen requirement', [
        { label: 'SpO₂ >95% on RA (1)', value: 1, description: 'Room-air saturation >95%' },
        { label: 'SpO₂ 90–95% on RA (2)', value: 2, description: 'Room-air saturation 90–95%' },
        { label: 'SpO₂ <90% on RA or any O₂ (3)', value: 3, description: 'Room air <90% OR any supplemental oxygen' },
      ], 1, 'Any supplemental oxygen scores 3 in common PAS pathways, even if SpO₂ is now normal.'),
      selectInput('auscultation', 'Auscultation', [
        { label: 'Normal breath sounds / end-exp wheeze (1)', value: 1, description: 'Normal or end-expiratory wheeze only; good air entry' },
        { label: 'Expiratory wheeze (2)', value: 2, description: 'Expiratory wheeze throughout expiration' },
        { label: 'Inspiratory+expiratory / diminished (3)', value: 3, description: 'Inspiratory and expiratory wheeze, or diminished/absent breath sounds' },
      ], 1, 'Auscultate both lungs. Diminished or silent air entry scores 3, not “no wheeze.”'),
      selectInput('retractions', 'Retractions', [
        { label: 'None / intercostal (1)', value: 1, description: 'No retractions, or intercostal only' },
        { label: 'Intercostal + substernal (2)', value: 2, description: 'Intercostal AND substernal/subcostal retractions' },
        { label: 'Suprasternal / nasal flaring + severe (3)', value: 3, description: 'Suprasternal retractions and/or nasal flaring, with severe work of breathing (often plus the above)' },
      ], 1, 'PAS retractions: 1 = none or intercostal only; 2 = intercostal + substernal; 3 = suprasternal and/or nasal flaring.'),
      selectInput('dyspnea', 'Dyspnea', [
        { label: 'Speaks in sentences; playful (1)', value: 1, description: 'Speaks in complete sentences (or playful infant/toddler)' },
        { label: 'Speaks in partial sentences / short cry (2)', value: 2, description: 'Speaks in partial sentences or short phrases; infant with short/interrupted cry' },
        { label: 'Speaks in single words / grunting / short soft cry (3)', value: 3, description: 'Single words, grunting, or infant with short, soft cry' },
      ], 1, 'If the child cannot speak or the infant’s cry is short and soft, score 3.'),
    ],
    calculate(values) {
      const score =
        num(values.rr, 1) +
        num(values.o2, 1) +
        num(values.auscultation, 1) +
        num(values.retractions, 1) +
        num(values.dyspnea, 1);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Mild (≤7)',
          interpretation: `PAS ${score}: mild pathway band in many protocols — space albuterol, consider discharge if stable.`,
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Moderate (8–11)',
          interpretation: `PAS ${score}: moderate — continue frequent bronchodilators and steroids; reassess for admission.`,
        },
        {
          max: 15,
          level: 'high',
          label: 'Severe (12–15)',
          interpretation: `PAS ${score}: severe pathway band — intensive therapy, continuous nebs, consider adjuncts and higher-level care.`,
        },
      ]);
      return { score, unit: 'points', ...r };
    },
    evidence: {
      summary: 'PAS typically scores RR, oxygen, auscultation, retractions, and dyspnea from 1–3 each (total 5–15). Pathways map totals to treatment intensity.',
      formula: 'RR + O₂ + auscultation + retractions + dyspnea (each 1–3)',
      validation: 'Used in multiple pediatric hospital QI pathways; exact RR age tables vary by institution.',
      references: [
        { title: 'Pediatric asthma pathway literature', citation: 'Children’s hospital asthma pathway literature', year: 2015, url: 'https://www.nhlbi.nih.gov/health-topics/guidelines-for-diagnosis-management-of-asthma' },
      ],
    },
    nextSteps: [
      { condition: 'PAS ≥12', actions: ['Intensify therapy', 'Consider ICU if not improving'] },
      { condition: 'PAS ≤7 sustained', actions: ['Space treatments', 'Discharge teaching'] },
    ],
    pearls: ['Use your hospital’s PAS age-specific RR cutoffs when available.', 'Score after standardized treatment intervals for pathway decisions.'],
  },

  {
    id: 'philadelphia-criteria',
    name: 'Philadelphia Criteria (Febrile Infant)',
    shortName: 'Philadelphia',
    description: 'Low-risk lab and clinical criteria for febrile infants (classic Philadelphia pathway).',
    category: 'pediatrics',
    tags: ['fever', 'infant', 'philadelphia', 'sbi', 'low risk'],
    whenToUse: 'Febrile infants (classically 29–56 days) when applying Philadelphia low-risk criteria.',
    whyUse: 'Historical well-validated set of low-risk criteria including LP in the original pathway.',
    inputs: [
      yesNo('wellAppearing', 'Well-appearing', 1, 'Apply only in the intended age band (classic Philadelphia 29–56 days). Ill-appearing infants are never low-risk. Well = interacting, normal work of breathing and circulation (Pediatric Assessment Triangle).'),
      yesNo('noFocus', 'No focal infection on exam', 1, 'No otitis, soft-tissue infection, bone/joint infection, or other focal bacterial source on exam. Focal infection fails low-risk.'),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0, max: 50, step: 0.1, defaultValue: 8, helpText: 'Low-risk if WBC 5–15 ×10³/µL (tool applies this automatically).' }),
      numberInput('bands', 'Band-to-neutrophil ratio (or enter bands %/100)', {
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.1,
        helpText: 'Enter immature:total neutrophil ratio (bands + other immature / total neutrophils). Example: 8 bands and 40 segs → 8/48 = 0.17. Do not enter band % as 0.xx unless that equals the I:T ratio. Low-risk if <0.2.',
      }),
      numberInput('uaWbc', 'UA WBC', { unit: '/hpf', min: 0, max: 100, defaultValue: 2, helpText: 'Low-risk if UA <10 WBC/hpf (tool applies this automatically).' }),
      numberInput('csfWbc', 'CSF WBC', { unit: '/µL', min: 0, max: 5000, defaultValue: 2, helpText: 'Low-risk if CSF <8 WBC/µL (Philadelphia). Tool applies this automatically.' }),
      yesNo('csfGramPos', 'CSF Gram stain positive', 1, 'Any organisms on CSF Gram stain fails low-risk (Philadelphia).'),
      yesNo('cxrAbn', 'Abnormal CXR (if obtained)', 1, 'Any infiltrate or other abnormal CXR, if a film was obtained, fails low-risk. If CXR not obtained, leave No.'),
      yesNo('stoolWbc', 'Stool WBC positive if diarrhea (if applicable)', 1, 'If diarrhea is present, stool WBC positive fails low-risk. If no diarrhea, leave No.'),
    ],
    calculate(values) {
      const reasons: string[] = [];
      if (!bool(values.wellAppearing)) reasons.push('Not well-appearing');
      if (!bool(values.noFocus)) reasons.push('Focal infection');
      const wbc = num(values.wbc, 8);
      if (wbc < 5 || wbc > 15) reasons.push('WBC outside 5–15k');
      if (num(values.bands, 0.1) >= 0.2) reasons.push('Band:neutrophil ≥0.2');
      if (num(values.uaWbc, 2) >= 10) reasons.push('UA WBC ≥10/hpf');
      if (num(values.csfWbc, 2) >= 8) reasons.push('CSF WBC elevated');
      if (bool(values.csfGramPos)) reasons.push('CSF Gram stain +');
      if (bool(values.cxrAbn)) reasons.push('Abnormal CXR');
      if (bool(values.stoolWbc)) reasons.push('Stool WBC +');

      const lowRisk = reasons.length === 0;
      return {
        score: lowRisk ? 'Low risk' : 'Not low risk',
        label: lowRisk ? 'Meets Philadelphia low-risk' : 'Fails Philadelphia low-risk',
        interpretation: lowRisk
          ? 'Meets classic Philadelphia low-risk criteria (educational checklist). Original pathway often still used observation; modern practice may differ on LP and antibiotics. Apply only in intended age group with full lab set.'
          : `Not low risk: ${reasons.join('; ')}. Full evaluation and management for possible SBI/IBI.`,
        riskLevel: lowRisk ? 'low' : 'high',
        details: [{ label: 'Failed items', value: reasons.length ? reasons.join(', ') : 'None' }],
      };
    },
    evidence: {
      summary:
        'Philadelphia criteria: well-appearing, no focal infection, WBC 5–15k, BNR <0.2, UA <10 WBC/hpf, CSF <8 WBC (and negative Gram stain), normal CXR/stool if done.',
      formula: 'All low-risk gates must pass',
      validation: 'Baker et al.; historical standard. Age bands and practice have evolved with newer pathways (Step-by-Step, PECARN).',
      references: [
        { title: 'Outpatient management without antibiotics of fever in selected infants', citation: 'Baker MD et al. N Engl J Med. 1993', year: 1993, pmid: '8413453',
          doi: '10.1056/NEJM199311113292001', },
      ],
    },
    nextSteps: [
      { condition: 'Not low risk', actions: ['Cultures ± LP', 'Antibiotics', 'Admit'] },
      { condition: 'Low risk', actions: ['Follow institutional infant fever pathway', 'Reliable follow-up'] },
    ],
    pearls: ['Original Philadelphia includes LP — confirm local practice.', 'Not for ill-appearing infants or those with immune compromise.'],
  },

  {
    id: 'boston-criteria',
    name: 'Boston Criteria (Febrile Infant)',
    shortName: 'Boston',
    description: 'Boston low-risk criteria for febrile infants including laboratory thresholds.',
    category: 'pediatrics',
    tags: ['fever', 'infant', 'boston', 'sbi', 'low risk'],
    whenToUse: 'Febrile infants (classically 28–89 days) when applying Boston low-risk laboratory criteria.',
    whyUse: 'Another classic low-risk rule set still referenced in teaching and comparisons.',
    inputs: [
      yesNo('wellAppearing', 'Well-appearing / nontoxic', 1, 'Classic Boston 28–89 days. Well/nontoxic on Pediatric Assessment Triangle; ill-appearing infants are never low-risk.'),
      yesNo('noFocus', 'No ear, soft tissue, or bone infection on exam', 1, 'Boston: no otitis, soft-tissue, or bone/joint infection. Focal bacterial source fails low-risk.'),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0, max: 50, step: 0.1, defaultValue: 10, helpText: 'Low-risk if WBC <20 ×10³/µL (tool applies this automatically).' }),
      numberInput('uaWbc', 'UA WBC', { unit: '/hpf', min: 0, max: 100, defaultValue: 2, helpText: 'Low-risk if UA <10 WBC/hpf (Boston). Tool applies this automatically.' }),
      numberInput('csfWbc', 'CSF WBC', { unit: '/µL', min: 0, max: 5000, defaultValue: 2, helpText: 'Low-risk if CSF <10 WBC/µL (Boston). Tool applies this automatically.' }),
      yesNo('cxrAbn', 'Infiltrate on CXR (if obtained)', 1, 'Any infiltrate on CXR, if obtained, fails low-risk. If CXR not obtained, leave No.'),
      numberInput('stoolWbc', 'Stool WBC /hpf if diarrhea (0 if N/A)', { min: 0, max: 100, defaultValue: 0, required: false, helpText: 'If diarrhea present, stool ≥5 WBC/hpf fails Boston low-risk. Enter 0 if no diarrhea / not applicable.' }),
    ],
    calculate(values) {
      const reasons: string[] = [];
      if (!bool(values.wellAppearing)) reasons.push('Not well-appearing');
      if (!bool(values.noFocus)) reasons.push('Focal bacterial infection on exam');
      if (num(values.wbc, 10) >= 20) reasons.push('WBC ≥20k');
      if (num(values.uaWbc, 2) >= 10) reasons.push('UA ≥10 WBC/hpf');
      if (num(values.csfWbc, 2) >= 10) reasons.push('CSF ≥10 WBC');
      if (bool(values.cxrAbn)) reasons.push('CXR infiltrate');
      if (num(values.stoolWbc, 0) >= 5) reasons.push('Stool WBC ≥5/hpf');

      const lowRisk = reasons.length === 0;
      return {
        score: lowRisk ? 'Low risk' : 'Not low risk',
        label: lowRisk ? 'Meets Boston low-risk' : 'Fails Boston low-risk',
        interpretation: lowRisk
          ? 'Meets classic Boston low-risk lab/exam criteria (educational). Original strategy often included empiric antibiotics and follow-up — modern pathways differ. Use only for appropriate ages.'
          : `Not low risk: ${reasons.join('; ')}. Manage as higher risk for SBI.`,
        riskLevel: lowRisk ? 'low' : 'high',
        details: [{ label: 'Failed items', value: reasons.length ? reasons.join(', ') : 'None' }],
      };
    },
    evidence: {
      summary:
        'Boston criteria (classic): nontoxic, no focal infection, WBC <20k, UA <10 WBC/hpf, CSF <10 WBC, no CXR infiltrate, stool <5 WBC/hpf if diarrhea.',
      formula: 'All low-risk laboratory and exam gates',
      validation: 'Baskin et al.; historical outpatient febrile infant strategy with ceftriaxone in original studies.',
      references: [
        {
          title: 'Outpatient treatment of febrile infants 28 to 89 days of age with intramuscular ceftriaxone',
          citation: 'Baskin MN et al. J Pediatr. 1992',
          year: 1992,
          pmid: '1731019',
          doi: '10.1016/s0022-3476(05)80591-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Not low risk', actions: ['Full septic workup as indicated', 'Antibiotics', 'Admission'] },
      { condition: 'Low risk', actions: ['Follow local protocol (may differ from 1990s Boston strategy)'] },
    ],
    pearls: ['Do not mix criteria sets mid-evaluation.', 'Viral testing and modern biomarkers (PCT) are not part of classic Boston.'],
  },

  {
    id: 'pecarn-fever',
    name: 'PECARN Febrile Infant Rule (Simplified Age Bands)',
    shortName: 'PECARN Fever',
    description: 'Simplified PECARN rule helper for febrile infants using age band, urinalysis, ANC, and procalcitonin.',
    category: 'pediatrics',
    tags: ['fever', 'pecarn', 'infant', 'procalcitonin', 'ibi'],
    whenToUse: 'Febrile infants ≤60 days when applying PECARN prediction rules for serious bacterial infection (SBI) risk.',
    whyUse: 'Multicenter PECARN rules identify low-risk infants using UA, ANC, and PCT; age band guides disposition.',
    inputs: [
      selectInput('ageBand', 'Age band', [
        { label: '≤28 days', value: '0-28', description: '≤28 days: higher baseline IBI risk — this helper never labels this band “low-risk discharge”' },
        { label: '29–60 days', value: '29-60', description: '29–60 days: PECARN low-risk pathway eligible if well-appearing with negative labs' },
      ], '0-28', 'Kuppermann/PECARN febrile infant ≤60 days. ≤28 days is never “low-risk discharge” here even if labs are negative.'),
      yesNo('illAppearing', 'Ill-appearing', 1, 'Ill/toxic on Pediatric Assessment Triangle (appearance, work of breathing, circulation). Ill-appearing infants are never low-risk.'),
      yesNo('uaPos', 'Positive urinalysis (LE, nitrite, or WBC per rule definition)', 1, 'Positive UA: any leukocyte esterase (including trace), any nitrite, or >5 WBC/HPF (Kuppermann/PECARN).'),
      numberInput('anc', 'Absolute neutrophil count', { unit: 'cells/µL', min: 0, max: 30000, defaultValue: 4000, helpText: 'Tool applies ANC >4090 as a fail automatically.' }),
      numberInput('pct', 'Procalcitonin', { unit: 'ng/mL', min: 0, max: 100, step: 0.01, defaultValue: 0.2, helpText: 'Tool applies PCT >1.71 ng/mL as a fail automatically.' }),
    ],
    calculate(values) {
      const age = String(values.ageBand ?? '29-60');
      const ill = bool(values.illAppearing);
      const ua = bool(values.uaPos);
      const anc = num(values.anc, 4000);
      const pct = num(values.pct, 0.2);

      // Simplified educational thresholds from PECARN febrile infant literature
      // Common teaching: low risk if well-appearing, negative UA, ANC ≤4090, PCT ≤1.71 (rule-dependent)
      const ancHigh = anc > 4090;
      const pctHigh = pct > 1.71;
      const reasons: string[] = [];
      if (ill) reasons.push('Ill-appearing');
      if (ua) reasons.push('Positive UA');
      if (ancHigh) reasons.push('ANC >4090');
      if (pctHigh) reasons.push('PCT >1.71');
      if (age === '0-28') reasons.push('Age ≤28 days (higher baseline risk — many pathways not “low risk discharge”)');

      const labLow = !ua && !ancHigh && !pctHigh && !ill;
      const lowRisk = labLow && age === '29-60';

      return {
        score: lowRisk ? 'Low risk' : 'Not low risk',
        label: lowRisk ? 'PECARN-style low risk (29–60 d)' : 'Not low risk / higher vigilance',
        interpretation: lowRisk
          ? 'Well-appearing 29–60 day infant with negative UA, ANC ≤4090, PCT ≤1.71: low risk of IBI in PECARN derivation/validation (educational thresholds). Disposition still per local protocol.'
          : `Not in simplified low-risk group: ${reasons.join('; ') || 'criteria incomplete'}. For ≤28 days, invasive evaluation thresholds are higher regardless of labs. Follow full PECARN publication and institutional pathway.`,
        riskLevel: lowRisk ? 'low' : age === '0-28' || ill ? 'high' : 'moderate',
        details: [
          { label: 'Age band', value: age },
          { label: 'ANC', value: `${anc} /µL` },
          { label: 'PCT', value: `${pct} ng/mL` },
          { label: 'UA positive', value: ua ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'PECARN febrile infant rules use age, clinical appearance, UA, ANC, and procalcitonin to estimate IBI risk. Exact cutoffs and decision trees differ by ≤28 vs 29–60 days.',
      formula: 'Educational: low risk if 29–60 d, well, UA−, ANC ≤4090, PCT ≤1.71',
      validation: 'Kuppermann et al. PECARN multicenter studies; use full published algorithms for care decisions.',
      references: [
        {
          title: 'A Clinical Prediction Rule to Identify Febrile Infants ≤60 Days at Low Risk for Serious Bacterial Infections',
          citation: 'Kuppermann N et al. JAMA Pediatr. 2019',
          year: 2019,
          pmid: '30776077',
          doi: '10.1001/jamapediatrics.2018.5501',
        },
      ],
    },
    nextSteps: [
      { condition: '≤28 days or ill-appearing', actions: ['Full evaluation per pathway', 'Do not use outpatient low-risk discharge'] },
      { condition: 'Low risk 29–60 d', actions: ['Shared decision / local protocol', 'Reliable follow-up', 'UA/culture as indicated'] },
    ],
    pearls: [
      'This helper simplifies published rules — verify numeric cutoffs against the paper your hospital uses.',
      'HSV evaluation considerations in young neonates are separate from bacterial IBI rules.',
    ],
  },

  {
    id: 'incomplete-kawasaki',
    name: 'Incomplete Kawasaki Disease Lab Helper',
    shortName: 'Incomplete KD',
    description: 'AHA incomplete Kawasaki lab criteria helper when fever ≥5 days and <4 classic clinical signs.',
    category: 'pediatrics',
    tags: ['kawasaki', 'incomplete', 'vasculitis', 'coronary', 'pediatric'],
    whenToUse: 'Children with ≥5 days of fever and 2–3 clinical KD features when applying supplemental lab criteria.',
    whyUse: 'Incomplete KD needs lab + echo algorithm to avoid missed coronary risk.',
    inputs: [
      numberInput('feverDays', 'Days of fever', { min: 1, max: 30, defaultValue: 5 }),
      numberInput('clinicalFeatures', 'Number of classic KD clinical features (besides fever)', {
        min: 0,
        max: 5,
        defaultValue: 2,
        helpText: 'AHA principal features: (1) nonexudative bulbar conjunctival injection; (2) oral — cracked lips, strawberry tongue, or injected pharynx; (3) rash (not vesicular); (4) extremity erythema/edema or periungual peeling; (5) cervical lymphadenopathy ≥1.5 cm, usually unilateral.',
      }),
      yesNo('crpHigh', 'CRP ≥3.0 mg/dL (30 mg/L)'),
      yesNo('esrHigh', 'ESR ≥40 mm/h'),
      yesNo('anemia', 'Anemia for age', 1, 'Yes if Hb below the lab age-specific lower limit of normal (AHA “anemia for age”).'),
      yesNo('pltHigh', 'Platelets ≥450,000 after day 7 of fever'),
      yesNo('albuminLow', 'Albumin ≤3.0 g/dL'),
      yesNo('altHigh', 'ALT elevated for age/lab'),
      yesNo('wbcHigh', 'WBC ≥15,000/µL'),
      yesNo('uaWbc', 'Urine ≥10 WBC/hpf (sterile pyuria)'),
      yesNo('echoPos', 'Echo positive (coronary Z-score criteria / other KD echo findings)', 1, 'Yes if LAD or RCA Z ≥2.5, coronary aneurysm, or ≥3 supportive findings (LV dysfunction, mitral regurgitation, pericardial effusion, or Z 2–2.5).'),
    ],
    calculate(values) {
      const feverDays = num(values.feverDays, 5);
      const features = num(values.clinicalFeatures, 2);
      const inflam = bool(values.crpHigh) || bool(values.esrHigh);
      // AHA: six supplemental lab criteria (albumin and ALT are separate)
      const labs = [
        bool(values.anemia),
        bool(values.pltHigh),
        bool(values.albuminLow),
        bool(values.altHigh),
        bool(values.wbcHigh),
        bool(values.uaWbc),
      ].filter(Boolean).length;
      const echo = bool(values.echoPos);

      const labDetails = [
        { label: 'CRP ≥3.0 mg/dL', value: bool(values.crpHigh) ? 'Yes' : 'No' },
        { label: 'ESR ≥40 mm/h', value: bool(values.esrHigh) ? 'Yes' : 'No' },
        { label: 'Anemia for age', value: bool(values.anemia) ? 'Yes' : 'No' },
        { label: 'Platelets ≥450k after d7', value: bool(values.pltHigh) ? 'Yes' : 'No' },
        { label: 'Albumin ≤3.0 g/dL', value: bool(values.albuminLow) ? 'Yes' : 'No' },
        { label: 'ALT elevated', value: bool(values.altHigh) ? 'Yes' : 'No' },
        { label: 'WBC ≥15,000', value: bool(values.wbcHigh) ? 'Yes' : 'No' },
        { label: 'Urine ≥10 WBC/hpf', value: bool(values.uaWbc) ? 'Yes' : 'No' },
        { label: 'Echo positive', value: echo ? 'Yes' : 'No' },
        { label: 'Supplemental labs', value: `${labs}/6 (≥3 treats if inflam gate passed)` },
      ];

      if (feverDays < 5) {
        return {
          score: 'Fever <5 days',
          label: 'Too early for standard incomplete algorithm',
          interpretation: 'Classic incomplete KD algorithm usually requires ≥5 days of fever (or shorter with coronary changes). Continue evaluation if high suspicion.',
          riskLevel: 'info',
          details: [
            { label: 'Fever days', value: String(feverDays) },
            { label: 'Clinical features', value: String(features) },
            ...labDetails,
          ],
        };
      }

      if (features >= 4) {
        return {
          score: 'Complete KD pattern',
          label: 'Treat as complete KD if fever criteria met',
          interpretation: `≥4 clinical features with fever — this is complete KD territory; treat with IVIG/ASA per AHA if diagnostic criteria met. Incomplete lab helper not required.`,
          riskLevel: 'high',
          details: [
            { label: 'Fever days', value: String(feverDays) },
            { label: 'Clinical features', value: String(features) },
            ...labDetails,
          ],
        };
      }

      let label = 'Incomplete KD not supported by labs yet';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'moderate';
      let interpretation = '';

      if (echo) {
        label = 'Treat — positive echo';
        riskLevel = 'high';
        interpretation =
          'Positive echo findings in febrile child with suspected incomplete KD: treat as KD (IVIG + ASA) per AHA regardless of incomplete clinical count.';
      } else if (!inflam) {
        label = 'CRP/ESR not elevated';
        riskLevel = 'low';
        interpretation =
          'Without CRP ≥3.0 or ESR ≥40, incomplete KD lab algorithm is less supportive — consider alternative diagnoses; serial labs if fever persists.';
      } else if (labs >= 3) {
        label = 'Labs support incomplete KD';
        riskLevel = 'high';
        interpretation = `Inflammatory markers elevated and ${labs}/6 supplemental lab criteria positive (≥3 of 6 needed). Treat as incomplete KD (IVIG + ASA) and obtain/repeat echo per AHA.`;
      } else {
        label = 'Obtain / follow echo';
        riskLevel = 'moderate';
        interpretation = `Inflammation present but only ${labs}/6 supplemental labs positive (<3). AHA: obtain echo; if positive treat; if negative, serial clinical/lab follow-up while fever evaluated.`;
      }

      return {
        score: `${labs}/6 labs`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Fever days', value: String(feverDays) },
          { label: 'Clinical features', value: String(features) },
          { label: 'CRP/ESR gate', value: inflam ? 'Passed' : 'Not elevated' },
          ...labDetails,
        ],
        recommendations: [
          'Cardiology / echo as algorithm indicates',
          'IVIG 2 g/kg + moderate–high dose ASA when treating',
          'ID or rheumatology involvement for atypical cases',
        ],
      };
    },
    evidence: {
      summary:
        'AHA incomplete KD: fever ≥5 d + 2–3 features → if CRP ≥3.0 or ESR ≥40 and ≥3 of 6 labs (anemia, plt≥450k after d7, alb≤3.0, ↑ALT, WBC≥15k, urine≥10 WBC) → treat. Echo positive → treat.',
      formula: 'Fever + features → inflam gate → ≥3 supplemental labs or +echo',
      validation: 'AHA scientific statement algorithm widely used in pediatrics.',
      references: [
        {
          title: 'Diagnosis, Treatment, and Long-Term Management of Kawasaki Disease',
          citation: 'McCrindle BW et al. Circulation. 2017',
          year: 2017,
          pmid: '28356445',
          doi: '10.1161/CIR.0000000000000484',
        },
      ],
    },
    nextSteps: [
      { condition: 'Treat criteria met', actions: ['IVIG', 'ASA', 'Echo', 'Cardiology follow-up'] },
      { condition: 'Inflamed but <3 labs', actions: ['Echo', 'Serial exams/labs', 'Reassess diagnosis'] },
    ],
    pearls: [
      'Infants <6 months may have incomplete features yet high coronary risk.',
      'Platelet criterion is more useful after day 7 of illness.',
    ],
  },

  {
    id: 'dehydration-who',
    name: 'WHO Dehydration Classification',
    shortName: 'WHO Dehydration',
    description: 'WHO plan A/B/C style classification: no dehydration, some, or severe dehydration.',
    category: 'pediatrics',
    tags: ['dehydration', 'who', 'ors', 'diarrhea', 'pediatric'],
    whenToUse: 'Children with diarrhea/gastroenteritis when classifying dehydration for fluid plans.',
    whyUse: 'Global standard linking clinical signs to ORS vs IV rehydration strategy.',
    inputs: [
      selectInput('condition', 'General condition', [
        { label: 'Well, alert', value: 0, description: 'Normal activity and interaction for age; not restless' },
        { label: 'Restless, irritable', value: 1, description: 'Restless or irritable (cannot be fully consoled) — WHO “some dehydration” sign' },
        { label: 'Lethargic or unconscious', value: 2, description: 'Lethargic (not fully awake) or unconscious — WHO “severe” sign; does not respond normally to voice' },
      ], 0, 'WHO IMCI general-condition sign. Severe dehydration if ≥2 of: lethargic/unconscious, sunken eyes, drinks poorly, skin pinch ≥2 s. Some dehydration if ≥2 of: restless/irritable, sunken eyes, drinks eagerly, skin pinch slow.'),
      selectInput('eyes', 'Eyes', [
        { label: 'Normal', value: 0, description: 'Eyes not sunken (tear presence is not required)' },
        { label: 'Sunken', value: 1, description: 'Eyes appear sunken in the orbits (WHO sign; more reliable than tears)' },
      ], 0, 'Look from the side at the orbital fullness. Sunken eyes count toward both “some” and “severe” WHO counts.'),
      selectInput('thirst', 'Thirst', [
        { label: 'Drinks normally / not thirsty', value: 0, description: 'Takes fluids normally when offered; not eager' },
        { label: 'Thirsty, drinks eagerly', value: 1, description: 'Reaches for cup/breast and drinks avidly — WHO “some” sign' },
        { label: 'Drinks poorly or not able to drink', value: 2, description: 'Unable to drink, or drinks poorly (spits, not interested) — WHO “severe” sign' },
      ], 0, 'Offer fluid and watch. Eager drinking = some dehydration; poor/unable = severe. Do not force fluids if unconscious.'),
      selectInput('skin', 'Skin pinch', [
        { label: 'Goes back quickly', value: 0, description: 'Skin returns immediately' },
        { label: 'Goes back slowly', value: 1, description: 'Returns slowly but <2 s' },
        { label: 'Goes back very slowly (≥2 s)', value: 2, description: 'Skin fold remains ≥2 s' },
      ], 0, 'Pinch abdominal skin halfway between umbilicus and flank; release and watch. Very slow = ≥2 s (WHO). Unreliable in severe wasting — interpret with other signs.'),
    ],
    calculate(values) {
      // WHO: severe if ≥2 of: lethargic/unconscious, sunken eyes, drinks poorly, skin very slow
      // some if ≥2 of: restless/irritable, sunken eyes, thirsty, skin slow
      const condition = num(values.condition);
      const eyes = num(values.eyes);
      const thirst = num(values.thirst);
      const skin = num(values.skin);

      const severeCount =
        (condition >= 2 ? 1 : 0) +
        (eyes >= 1 ? 1 : 0) +
        (thirst >= 2 ? 1 : 0) +
        (skin >= 2 ? 1 : 0);

      const someCount =
        (condition === 1 ? 1 : 0) +
        (eyes >= 1 ? 1 : 0) +
        (thirst === 1 ? 1 : 0) +
        (skin === 1 ? 1 : 0);

      let plan = 'A';
      let label = 'No dehydration';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = '';

      if (severeCount >= 2) {
        plan = 'C';
        label = 'Severe dehydration';
        riskLevel = 'critical';
        interpretation =
          '≥2 severe signs: WHO severe dehydration — urgent IV rehydration (Plan C), then ORS; treat shock if present.';
      } else if (someCount >= 2 || (severeCount === 1 && someCount >= 1)) {
        plan = 'B';
        label = 'Some dehydration';
        riskLevel = 'moderate';
        interpretation =
          'Some dehydration (Plan B): ORS over 4 hours (typically 75 mL/kg), continue breastfeeding/feeding, reassess.';
      } else {
        interpretation =
          'No signs of dehydration (Plan A): extra fluids, ORS after each stool, continue feeding, zinc where indicated, return precautions.';
      }

      return {
        score: plan,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'WHO plan', value: plan },
          { label: 'Severe signs count', value: String(severeCount) },
          { label: 'Some signs count', value: String(someCount) },
        ],
      };
    },
    evidence: {
      summary:
        'WHO IMCI: classify dehydration by general condition, eyes, thirst, skin pinch. Severe (≥2 severe signs) → Plan C; some dehydration (≥2 some signs) → Plan B; else Plan A.',
      formula: 'Count severe vs some clinical signs (≥2)',
      validation: 'WHO diarrheal disease management standard worldwide.',
      references: [
        { title: 'World Health Organization clinical / growth standards resources', citation: 'World Health Organization', year: 2006, url: 'https://www.who.int/' },
      ],
    },
    nextSteps: [
      { condition: 'Plan C', actions: ['IV fluids per WHO', 'Reassess frequently', 'ORS when able'] },
      { condition: 'Plan B', actions: ['ORS 75 mL/kg over 4 h', 'Reclassify after'] },
      { condition: 'Plan A', actions: ['Home ORS teaching', 'Continue nutrition'] },
    ],
    pearls: ['Malnutrition alters skin pinch interpretation.', 'Capillary refill and cool extremities add shock assessment beyond classic four signs.'],
  },

  {
    id: 'ors-volume',
    name: 'ORS Volume by Weight & Dehydration %',
    shortName: 'ORS Volume',
    description: 'Estimates oral rehydration solution volume from weight and percent dehydration (or WHO some-dehydration plan).',
    category: 'pediatrics',
    tags: ['ors', 'dehydration', 'fluids', 'pediatric', 'diarrhea'],
    whenToUse: 'Calculating deficit replacement volume for oral rehydration.',
    whyUse: 'Deficit (mL) ≈ weight(kg) × % dehydration × 10; WHO Plan B uses ~75 mL/kg over 4 h for some dehydration.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 2, max: 80, step: 0.1, defaultValue: 12 }),
      selectInput('mode', 'Method', [
        { label: 'Percent dehydration (deficit)', value: 'percent' },
        { label: 'WHO Plan B (some dehydration ~75 mL/kg)', value: 'who-b' },
      ]),
      numberInput('percent', 'Estimated dehydration', {
        unit: '%',
        min: 1,
        max: 15,
        step: 0.5,
        defaultValue: 5,
        helpText: 'Mild ~3–5%, moderate ~6–9%, severe ≥10%',
      }),
      numberInput('hours', 'Replacement period', { unit: 'hours', min: 1, max: 24, defaultValue: 4 }),
    ],
    calculate(values) {
      const w = num(values.weight, 12);
      const mode = String(values.mode ?? 'percent');
      const pct = num(values.percent, 5);
      const hours = num(values.hours, 4);

      let deficit: number;
      if (mode === 'who-b') deficit = 75 * w;
      else deficit = w * pct * 10; // mL = kg × % × 10

      const rate = deficit / hours;

      return {
        score: round(deficit, 0),
        unit: 'mL',
        label: `${round(deficit, 0)} mL over ${hours} h`,
        interpretation:
          mode === 'who-b'
            ? `WHO Plan B–style volume ≈ ${round(deficit, 0)} mL (${round(75, 0)} mL/kg × ${w} kg) over ${hours} h (~${round(rate, 0)} mL/h). Give small frequent amounts; continue losses replacement.`
            : `Deficit ≈ ${round(deficit, 0)} mL from ${pct}% dehydration × ${w} kg × 10 (~${round(rate, 0)} mL/h over ${hours} h). Add ongoing stool/vomit losses and maintenance separately. Severe dehydration usually needs IV first.`,
        riskLevel: pct >= 10 && mode === 'percent' ? 'high' : 'info',
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'Method', value: mode === 'who-b' ? 'WHO Plan B 75 mL/kg' : `${pct}% × kg × 10` },
          { label: 'Average rate', value: `${round(rate, 0)} mL/h` },
        ],
        recommendations: [
          'Use low-osmolality ORS',
          'Replace ongoing losses ~10 mL/kg per watery stool (common teaching)',
          'IV fluids if severe dehydration, shock, or intractable vomiting',
        ],
      };
    },
    evidence: {
      summary: 'Fluid deficit (mL) ≈ body weight (kg) × % dehydration × 10. WHO Plan B for some dehydration: ~75 mL/kg ORS over 4 hours.',
      formula: 'Deficit mL = wt × % × 10; or Plan B = 75 mL/kg',
      validation: 'Standard pediatric emergency and WHO rehydration teaching.',
      references: [
        { title: 'World Health Organization clinical / growth standards resources', citation: 'World Health Organization', year: 2006, url: 'https://www.who.int/' },
      ],
    },
    nextSteps: [
      { condition: 'Some dehydration', actions: ['ORS over 4 h', 'Reassess WHO class', 'Continue feeding'] },
      { condition: 'Severe', actions: ['IV Plan C first', 'ORS when improved'] },
    ],
    pearls: ['Percent dehydration is clinical estimate, not lab-derived.', 'Breastfed infants continue nursing during ORS.'],
  },

  {
    id: 'partogram-alert',
    name: 'Partogram Progress Alert (Educational)',
    shortName: 'Partogram',
    description: 'Simple educational labor progress check: cervical dilation vs time from active labor reference.',
    category: 'obstetrics',
    tags: ['labor', 'partogram', 'cervix', 'protraction', 'arrest'],
    whenToUse: 'Active labor teaching when comparing dilation progress to time expectations (not a full WHO partograph).',
    whyUse: 'Flags slower-than-expected progress for closer evaluation of power/passenger/passage.',
    inputs: [
      numberInput('dilationStart', 'Cervix at reference time', { unit: 'cm', min: 0, max: 10, step: 0.5, defaultValue: 6, helpText: 'Contemporary ACOG active phase is often ≥6 cm. Enter the dilation from the reference exam you are comparing against.' }),
      numberInput('dilationNow', 'Current cervix', { unit: 'cm', min: 0, max: 10, step: 0.5, defaultValue: 7, helpText: 'Most recent sterile digital exam. Complete (10 cm) ends first-stage partogram tracking.' }),
      numberInput('hours', 'Hours since reference exam', { min: 0.5, max: 24, step: 0.5, defaultValue: 2, helpText: 'Time between the two exams. Educational arrest alert: no change ≥4 h in active phase (≥6 cm).' }),
      selectInput('parity', 'Parity context', [
        { label: 'Nulliparous', value: 'nullip' },
        { label: 'Multiparous', value: 'multip' },
      ]),
      yesNo('ruptured', 'Membranes ruptured', 0),
      yesNo('adequateMvus', 'Adequate contractions (if IUPC; ≥200 MVU)', 0),
    ],
    calculate(values) {
      const start = num(values.dilationStart, 6);
      const now = num(values.dilationNow, 7);
      const hours = num(values.hours, 2);
      const parity = String(values.parity ?? 'nullip');
      const change = now - start;
      const rate = hours > 0 ? change / hours : 0;

      // Educational: contemporary labor often slower than classic Friedman 1 cm/h
      // Alert if no change over ≥4 h in active phase (≥6 cm) with adequate MUs, etc.
      const active = start >= 6 || now >= 6;
      const expectedMinRate = parity === 'multip' ? 0.5 : 0.3; // cm/h educational

      let label = 'Progress acceptable (educational)';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let interpretation = '';

      if (now >= 10) {
        label = 'Complete dilation';
        interpretation = 'Cervix complete — second-stage management per obstetric standards; partogram first-stage progress no longer applies.';
        riskLevel = 'info';
      } else if (change < 0) {
        label = 'Check exam consistency';
        riskLevel = 'moderate';
        interpretation = 'Reported dilation decreased — verify exam consistency/examiner differences before acting.';
      } else if (active && change === 0 && hours >= 4) {
        label = 'Arrest pattern concern';
        riskLevel = 'high';
        interpretation = `No cervical change over ${hours} h from ${start} cm in active-phase range. Educational arrest alert — assess contractions (MVUs), malposition, CPD, and ACOG arrest definitions before cesarean.`;
      } else if (active && rate < expectedMinRate && hours >= 2) {
        label = 'Protracted progress (educational)';
        riskLevel = 'moderate';
        interpretation = `Dilation rate ≈ ${round(rate, 2)} cm/h (${change} cm in ${hours} h). Below simplified educational minimum (~${expectedMinRate} cm/h for ${parity}). Consider augmentation if appropriate; modern labor curves allow slower progress than Friedman.`;
      } else {
        interpretation = `Change ${change} cm over ${hours} h (≈ ${round(rate, 2)} cm/h). Educational partogram check does not flag delay. Continue supportive labor care and standard fetal monitoring.`;
      }

      return {
        score: round(rate, 2),
        unit: 'cm/h',
        label,
        interpretation:
          interpretation +
          ' Not a full WHO partograph (alert/action lines) and not a substitute for ACOG labor management guidelines.',
        riskLevel,
        details: [
          { label: 'Start → now', value: `${start} → ${now} cm` },
          { label: 'Rate', value: `${round(rate, 2)} cm/h` },
          { label: 'Parity', value: parity === 'multip' ? 'Multiparous' : 'Nulliparous' },
          { label: 'Educational min rate', value: `${expectedMinRate} cm/h` },
          { label: 'Membranes / adequate MVU', value: `${bool(values.ruptured) ? 'ROM' : 'intact'} / ${bool(values.adequateMvus) ? 'yes' : 'no/unknown'}` },
        ],
      };
    },
    evidence: {
      summary:
        'Labor progress tools compare dilation vs time. Contemporary data (Zhang/Consortium) show slower active labor than Friedman; ACOG defines arrest with time + adequate MVUs.',
      formula: 'Rate = Δdilation / hours; educational alerts for no change ≥4 h active or very slow rate',
      validation: 'Educational only — use institutional partograph and ACOG definitions for decisions.',
      references: [
        { title: 'ACOG/SMFM Obstetric Care Consensus', citation: 'ACOG/SMFM Obstetric Care Consensus documents', year: 2019, url: 'https://www.acog.org/clinical/clinical-guidance/obstetric-care-consensus' },
        { title: 'Contemporary labor patterns', citation: 'Zhang J et al. Obstet Gynecol. 2010', year: 2010, pmid: '21099592',
          doi: '10.1097/AOG.0b013e3181fdef6e', },
      ],
    },
    nextSteps: [
      { condition: 'Arrest concern', actions: ['Confirm adequate MVUs ≥4 h (or ≥6 h oxytocin)', 'Assess fetal position', 'Shared decision on cesarean if true arrest'] },
      { condition: 'Protraction', actions: ['Supportive care', 'Oxytocin if indicated', 'Reassess frequently'] },
    ],
    pearls: [
      'Active phase often defined at ≥6 cm in contemporary guidance.',
      'Never act on a single exam alone — trend matters.',
    ],
  },

  {
    id: 'gestational-htn',
    name: 'Gestational Hypertension Diagnostic Helper',
    shortName: 'Gestational HTN',
    description: 'Distinguishes gestational hypertension pattern from preeclampsia using BP timing and end-organ/protein criteria.',
    category: 'obstetrics',
    tags: ['hypertension', 'gestational', 'preeclampsia', 'pregnancy'],
    whenToUse: 'New hypertension after 20 weeks without clear chronic HTN history.',
    whyUse: 'Gestational HTN vs preeclampsia drives monitoring intensity and delivery timing.',
    inputs: [
      yesNo('after20', 'New BP ≥140/90 after 20 weeks on ≥2 occasions', 1, 'SBP ≥140 or DBP ≥90 on two occasions ≥4 hours apart after 20 weeks, previously normal BP (ACOG).'),
      yesNo('severeBp', 'Severe-range BP ≥160/110 confirmed', 1, 'SBP ≥160 or DBP ≥110 confirmed within ~15 minutes; do not wait 4 hours to treat.'),
      yesNo('chronicHtn', 'Known chronic hypertension before 20 weeks / pre-pregnancy'),
      yesNo('proteinuria', 'Proteinuria (≥300 mg/24h or PCR ≥0.3)'),
      yesNo('endOrgan', 'End-organ criteria (plt <100k, Cr >1.1 or doubling, LFTs ≥2× ULN, pulmonary edema, neuro/visual symptoms)'),
      yesNo('resolvedPostpartum', 'BP normalized by 12 weeks postpartum (if known)'),
    ],
    calculate(values) {
      const after20 = bool(values.after20);
      const chronic = bool(values.chronicHtn);
      const protein = bool(values.proteinuria);
      const endOrg = bool(values.endOrgan);
      const severe = bool(values.severeBp);
      const resolved = bool(values.resolvedPostpartum);
      const ghtnDetails = [
        { label: 'Severe-range BP', value: severe ? 'Yes' : 'No' },
        { label: 'Proteinuria', value: protein ? 'Yes' : 'No' },
        { label: 'End-organ', value: endOrg ? 'Yes' : 'No' },
        { label: 'Postpartum resolution by 12 weeks', value: resolved ? 'Yes' : 'No / not known' },
      ];

      if (!after20 && !chronic) {
        return {
          score: 'No HTN criterion',
          label: 'Criteria not entered',
          interpretation: 'No diagnostic hypertension flag selected.',
          riskLevel: 'info',
          details: ghtnDetails,
        };
      }

      if (chronic && !after20) {
        return {
          score: 'Chronic HTN',
          label: 'Chronic hypertension pattern',
          interpretation: 'Known HTN before 20 weeks suggests chronic hypertension. Watch for superimposed preeclampsia if protein or end-organ findings develop.',
          riskLevel: 'moderate',
          details: ghtnDetails,
        };
      }

      if (after20 && (protein || endOrg)) {
        return {
          score: severe || endOrg ? 'Preeclampsia ± severe features' : 'Preeclampsia',
          label: 'Preeclampsia pattern (not gestational HTN alone)',
          interpretation:
            'HTN after 20 weeks with proteinuria and/or end-organ criteria = preeclampsia spectrum — manage accordingly (not isolated gestational HTN).' +
            (severe ? ' Severe-range BP present — manage as preeclampsia with severe features pathway as indicated.' : ''),
          riskLevel: 'high',
          details: ghtnDetails,
        };
      }

      if (after20 && !protein && !endOrg) {
        return {
          score: 'Gestational HTN',
          label: severe ? 'Gestational HTN (severe-range BP)' : 'Gestational hypertension',
          interpretation: severe
            ? 'New HTN after 20 weeks without protein/end-organ but with severe-range BP — treat BP, evaluate closely for evolving preeclampsia, and manage per obstetric protocol (often similar vigilance to severe-feature pathways).'
            : 'New HTN ≥140/90 after 20 weeks without proteinuria or end-organ criteria suggests gestational hypertension. Serial labs/BP and fetal surveillance; many progress to preeclampsia.' +
              (resolved
                ? ' Postpartum resolution by 12 weeks supports gestational (not chronic) HTN retrospectively.'
                : ''),
          riskLevel: severe ? 'high' : 'moderate',
          details: ghtnDetails,
        };
      }

      return {
        score: 'Mixed / reassess',
        label: 'Reassess classification',
        interpretation: 'Mixed chronic and gestational features — consider chronic HTN with superimposed preeclampsia if protein/end-organ present after 20 weeks.',
        riskLevel: 'moderate',
        details: ghtnDetails,
      };
    },
    evidence: {
      summary:
        'Gestational HTN: new BP ≥140/90 after 20 weeks without proteinuria or severe features/end-organ dysfunction. Preeclampsia if protein or end-organ present. Chronic HTN antedates 20 weeks.',
      formula: 'Classify by timing + protein/end-organ checklist',
      validation: 'ACOG diagnostic framework for hypertensive disorders of pregnancy.',
      references: [
        { title: 'Gestational Hypertension and Preeclampsia: ACOG Practice Bulletin No. 222', citation: 'ACOG. Obstet Gynecol. 2020', year: 2020, pmid: '32443079', doi: '10.1097/AOG.0000000000003891' },
      ],
    },
    nextSteps: [
      { condition: 'Gestational HTN', actions: ['Serial BP and labs', 'Fetal monitoring per GA', 'Precautions for severe features'] },
      { condition: 'Preeclampsia pattern', actions: ['Use full preeclampsia pathway'] },
    ],
    pearls: [
      'Up to half of gestational HTN may progress to preeclampsia.',
      'Final chronic vs gestational distinction may require postpartum follow-up.',
    ],
  },

  {
    id: 'gdm-carpenter',
    name: 'Carpenter-Coustan GDM Thresholds',
    shortName: 'GDM CC',
    description: 'Interprets 100-g 3-hour OGTT (or fasting) against Carpenter-Coustan gestational diabetes thresholds.',
    category: 'endocrinology',
    tags: ['gdm', 'diabetes', 'carpenter-coustan', 'ogtt', 'pregnancy'],
    whenToUse: 'After abnormal 1-hour glucose challenge when interpreting 3-hour 100-g OGTT by Carpenter-Coustan criteria.',
    whyUse: 'Common US diagnostic thresholds for GDM on 3-hour OGTT (2 or more elevations).',
    inputs: [
      numberInput('fasting', 'Fasting glucose', { unit: 'mg/dL', min: 40, max: 300, defaultValue: 90, helpText: 'Carpenter-Coustan 100-g 3-h OGTT: fasting ≥95, 1 h ≥180, 2 h ≥155, 3 h ≥140 mg/dL. GDM if ≥2 values meet/exceed. Do not mix with NDDG cutoffs.' }),
      numberInput('h1', '1-hour glucose', { unit: 'mg/dL', min: 40, max: 400, defaultValue: 170 }),
      numberInput('h2', '2-hour glucose', { unit: 'mg/dL', min: 40, max: 400, defaultValue: 150 }),
      numberInput('h3', '3-hour glucose', { unit: 'mg/dL', min: 40, max: 400, defaultValue: 130 }),
    ],
    calculate(values) {
      const fasting = num(values.fasting, 90);
      const h1 = num(values.h1, 170);
      const h2 = num(values.h2, 150);
      const h3 = num(values.h3, 130);

      // Carpenter-Coustan: 95 / 180 / 155 / 140
      const thr = { fasting: 95, h1: 180, h2: 155, h3: 140 };
      const flags = [
        { label: 'Fasting', v: fasting, t: thr.fasting, high: fasting >= thr.fasting },
        { label: '1-hour', v: h1, t: thr.h1, high: h1 >= thr.h1 },
        { label: '2-hour', v: h2, t: thr.h2, high: h2 >= thr.h2 },
        { label: '3-hour', v: h3, t: thr.h3, high: h3 >= thr.h3 },
      ];
      const nHigh = flags.filter((f) => f.high).length;
      const gdm = nHigh >= 2;

      return {
        score: nHigh,
        unit: 'elevated values',
        label: gdm ? 'GDM by Carpenter-Coustan' : nHigh === 1 ? 'One elevated — not GDM by CC' : 'Normal OGTT by CC',
        interpretation: gdm
          ? `${nHigh} values at/above Carpenter-Coustan thresholds (≥2 required): meets GDM criteria. Initiate nutrition therapy, glucose monitoring, and meds if targets unmet.`
          : nHigh === 1
            ? 'Exactly one elevated value — does not meet Carpenter-Coustan GDM (≥2). Some centers increase surveillance for single abnormal values.'
            : 'No values at/above Carpenter-Coustan cutoffs (95 / 180 / 155 / 140 mg/dL).',
        riskLevel: gdm ? 'high' : nHigh === 1 ? 'moderate' : 'low',
        details: flags.map((f) => ({
          label: f.label,
          value: `${f.v} mg/dL (cut ≥${f.t}) ${f.high ? '↑' : 'OK'}`,
        })),
      };
    },
    evidence: {
      summary:
        'Carpenter-Coustan 100-g 3-h OGTT thresholds: fasting ≥95, 1h ≥180, 2h ≥155, 3h ≥140 mg/dL. GDM if ≥2 values meet/exceed.',
      formula: 'Count of values ≥ CC thresholds; diagnosis if ≥2',
      validation: 'Common ACOG-accepted diagnostic criteria (alternative: NDDG thresholds; one-step IADPSG uses different test).',
      references: [
        { title: 'Criteria for screening tests for gestational diabetes', citation: 'Carpenter MW, Coustan DR. Am J Obstet Gynecol. 1982', year: 1982, pmid: '7148898',
          doi: '10.1016/0002-9378(82)90349-0', },
        { title: 'Gestational Hypertension and Preeclampsia: ACOG Practice Bulletin No. 222', citation: 'ACOG. Obstet Gynecol. 2020', year: 2020, pmid: '32443079', doi: '10.1097/AOG.0000000000003891' },
      ],
    },
    nextSteps: [
      { condition: 'GDM diagnosed', actions: ['Medical nutrition therapy', 'Glucose log', 'Insulin/metformin per protocol', 'Antenatal fetal surveillance as indicated'] },
    ],
    pearls: [
      'NDDG cutoffs are higher (105/190/165/145) — do not mix systems.',
      'Units: if labs report mmol/L, convert (mg/dL ÷ 18).',
    ],
  },

  {
    id: 'umbilical-ph',
    name: 'Umbilical Cord Gas Interpretation',
    shortName: 'Cord Gas',
    description: 'Interprets umbilical artery pH and base deficit bands for perinatal acidemia risk.',
    category: 'obstetrics',
    tags: ['cord gas', 'ph', 'base excess', 'neonate', 'acidemia'],
    whenToUse: 'After delivery when umbilical artery (or vein) blood gas results are available.',
    whyUse: 'pH and base deficit help classify severity of fetal acidemia and guide neonatal concern.',
    inputs: [
      selectInput('vessel', 'Sample', [
        { label: 'Umbilical artery (preferred for fetal status)', value: 'artery' },
        { label: 'Umbilical vein', value: 'vein' },
      ], 'artery', 'Artery better reflects fetal acid–base status; vein reflects placental/maternal side. Paired samples are ideal.'),
      numberInput('ph', 'pH', { min: 6.5, max: 7.6, step: 0.01, defaultValue: 7.2, helpText: 'Umbilical artery pH <7.0 is a commonly cited severe-acidemia threshold (with base deficit ≥12) linked to encephalopathy risk.' }),
      numberInput('be', 'Base excess (enter negative for deficit)', {
        unit: 'mEq/L',
        min: -30,
        max: 10,
        step: 0.1,
        defaultValue: -6,
        helpText: 'e.g. −12 means base deficit 12',
      }),
      numberInput('pco2', 'PCO₂ (optional)', { unit: 'mmHg', min: 10, max: 120, defaultValue: 55, required: false }),
    ],
    calculate(values) {
      const vessel = String(values.vessel ?? 'artery');
      const ph = num(values.ph, 7.2);
      const be = num(values.be, -6);
      const deficit = Math.abs(Math.min(be, 0));
      const pco2Provided = !isMissingValue(values.pco2, true);
      const pco2 = num(values.pco2, 0);

      let band = 'Normal / near-normal';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';

      if (ph < 7.0 || deficit >= 16) {
        band = 'Severe acidemia';
        riskLevel = 'critical';
      } else if (ph < 7.1 || deficit >= 12) {
        band = 'Significant acidemia';
        riskLevel = 'high';
      } else if (ph < 7.2 || deficit >= 8) {
        band = 'Mild–moderate acidemia';
        riskLevel = 'moderate';
      }

      let respNote = '';
      if (pco2Provided) {
        if (pco2 >= 70 && deficit < 8) respNote = ' Pattern suggests larger respiratory component (high PCO₂).';
        else if (deficit >= 12 && pco2 < 60) respNote = ' Pattern suggests larger metabolic component (base deficit).';
      }

      return {
        score: ph,
        label: band,
        interpretation: `${vessel === 'artery' ? 'Arterial' : 'Venous'} cord pH ${ph} with base excess ${be} (deficit ${round(deficit, 1)}). ${band}.${respNote} pH <7.0 and base deficit ≥12–16 are associated with increased risk of neonatal encephalopathy — correlate with Apgar, resuscitation, and clinical course.`,
        riskLevel,
        details: [
          { label: 'Vessel', value: vessel },
          { label: 'pH', value: String(ph) },
          { label: 'Base deficit', value: String(round(deficit, 1)) },
          { label: 'PCO₂', value: pco2Provided ? `${pco2} mmHg` : 'Not entered' },
        ],
      };
    },
    evidence: {
      summary:
        'Umbilical artery pH <7.0 and base deficit ≥12 mmol/L are often cited thresholds linking acidemia to increased risk of adverse neurologic outcome; milder reductions are common and less specific.',
      formula: 'Interpret pH bands + base deficit magnitude (+ optional PCO₂ for respiratory vs metabolic)',
      validation: 'Standard obstetric/neonatal cord gas interpretation teaching; ACOG criteria for acute intrapartum event include pH <7.0 and BD ≥12 among other elements.',
      references: [
        { title: 'ACOG Task Force on Hypertension in Pregnancy / related obstetric guidance', citation: 'ACOG Task Force reports', year: 2013, url: 'https://www.acog.org/clinical' },
      ],
    },
    nextSteps: [
      { condition: 'pH <7.0 or BD ≥12', actions: ['Neonatal evaluation', 'Consider HIE pathway / cooling criteria', 'Document resuscitation timeline'] },
      { condition: 'Mild changes', actions: ['Routine neonatal care with observation as indicated'] },
    ],
    pearls: [
      'Artery better reflects fetal status; vein reflects placental/maternal side.',
      'Delayed sampling and air bubbles alter results.',
    ],
  },

  {
    id: 'sfh',
    name: 'Symphysis-Fundal Height vs Weeks',
    shortName: 'SFH',
    description: 'Compares fundal height (cm) to gestational age (weeks) for size-date discrepancy screening.',
    category: 'obstetrics',
    tags: ['fundal height', 'sfh', 'iugr', 'growth', 'pregnancy'],
    whenToUse: 'Antenatal visits after ~20–24 weeks when measuring SFH for growth surveillance.',
    whyUse: 'Simple screen: SFH (cm) roughly equals weeks ±2–3 cm; larger deviations prompt ultrasound.',
    inputs: [
      numberInput('weeks', 'Gestational age', { unit: 'weeks', min: 20, max: 42, step: 0.1, defaultValue: 28, helpText: 'Use best obstetric dates. SFH screening is typically after 20–24 weeks.' }),
      numberInput('sfh', 'Symphysis-fundal height', { unit: 'cm', min: 15, max: 50, step: 0.5, defaultValue: 28, helpText: 'Empty bladder. Measure from the superior border of the pubic symphysis to the uterine fundus along the abdominal curve. Teaching band: SFH (cm) ≈ weeks ±2–3 cm.' }),
    ],
    calculate(values) {
      const weeks = num(values.weeks, 28);
      const sfh = num(values.sfh, 28);
      const diff = round(sfh - weeks, 1);
      const abs = Math.abs(diff);

      let label = 'Size = dates (within ±2 cm)';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      if (abs > 3) {
        label = diff > 0 ? 'Large for dates (SFH)' : 'Small for dates (SFH)';
        riskLevel = 'high';
      } else if (abs > 2) {
        label = diff > 0 ? 'Borderline large' : 'Borderline small';
        riskLevel = 'moderate';
      }

      return {
        score: diff,
        unit: 'cm vs weeks',
        label,
        interpretation:
          abs <= 2
            ? `SFH ${sfh} cm at ${weeks} weeks (Δ ${diff >= 0 ? '+' : ''}${diff} cm). Within common ±2 cm teaching band of weeks — continue routine surveillance.`
            : `SFH ${sfh} cm at ${weeks} weeks (Δ ${diff >= 0 ? '+' : ''}${diff} cm). Size-date discrepancy — consider growth ultrasound, fluid assessment, and review dating. Maternal habitus, fibroids, multiples, and measurement technique affect SFH.`,
        riskLevel,
        details: [
          { label: 'SFH', value: `${sfh} cm` },
          { label: 'GA', value: `${weeks} weeks` },
          { label: 'Difference', value: `${diff >= 0 ? '+' : ''}${diff} cm` },
        ],
      };
    },
    evidence: {
      summary: 'After mid-pregnancy, fundal height in cm approximates gestational age in weeks; discrepancy >2–3 cm often triggers ultrasound for growth/fluid.',
      formula: 'Δ = SFH(cm) − GA(weeks)',
      validation: 'Common prenatal care screen with limited sensitivity/specificity; ultrasound confirms growth concerns.',
      references: [
        { title: 'ACOG antepartum care guidance', citation: 'Prenatal care guidelines / ACOG antepartum care teaching', year: 2010, url: 'https://www.acog.org/clinical' },
      ],
    },
    nextSteps: [
      { condition: 'Δ >2–3 cm', actions: ['Growth US', 'Confirm dates', 'Assess amniotic fluid'] },
      { condition: 'Within band', actions: ['Continue serial SFH each visit'] },
    ],
    pearls: [
      'Empty bladder and consistent technique improve reliability.',
      'Obesity reduces SFH accuracy — lower threshold for US.',
    ],
  },

  {
    id: 'estimated-fetal-weight',
    name: 'Estimated Fetal Weight (Hadlock Simplified)',
    shortName: 'EFW Hadlock',
    description: 'Hadlock-style EFW from biparietal diameter, head circumference, abdominal circumference, and femur length when available.',
    category: 'obstetrics',
    tags: ['efw', 'hadlock', 'ultrasound', 'fetal weight', 'biometry'],
    whenToUse: 'Interpreting ultrasound biometrics to estimate fetal weight (educational calculation).',
    whyUse: 'Hadlock formulas are widely used in obstetric ultrasound for EFW.',
    inputs: [
      selectInput('formula', 'Biometry set', [
        { label: 'AC + FL (Hadlock)', value: 'acfl' },
        { label: 'BPD + AC + FL (Hadlock)', value: 'bpdacfl' },
        { label: 'HC + AC + FL (Hadlock)', value: 'hcacfl' },
        { label: 'BPD + HC + AC + FL (Hadlock)', value: 'full' },
      ]),
      numberInput('bpd', 'BPD', { unit: 'cm', min: 2, max: 12, step: 0.01, defaultValue: 8.5, helpText: 'Centimeters, not millimeters (divide machine mm by 10: 85 mm → 8.5 cm). Hadlock coefficients expect cm.' }),
      numberInput('hc', 'HC', { unit: 'cm', min: 10, max: 40, step: 0.1, defaultValue: 30, helpText: 'Centimeters, not millimeters (divide machine mm by 10).' }),
      numberInput('ac', 'AC', { unit: 'cm', min: 10, max: 45, step: 0.1, defaultValue: 28, helpText: 'Centimeters, not millimeters (divide machine mm by 10). AC carries the most weight in most Hadlock formulas.' }),
      numberInput('fl', 'FL', { unit: 'cm', min: 1, max: 10, step: 0.01, defaultValue: 6.2, helpText: 'Centimeters, not millimeters (divide machine mm by 10: 62 mm → 6.2 cm).' }),
    ],
    calculate(values) {
      const formula = String(values.formula ?? 'hcacfl');
      const bpd = num(values.bpd, 8.5);
      const hc = num(values.hc, 30);
      const ac = num(values.ac, 28);
      const fl = num(values.fl, 6.2);

      // Hadlock 1985 log10(EFW) formulas (EFW in grams; measurements in cm)
      let log10w: number;
      if (formula === 'acfl') {
        // log10(EFW) = 1.304 + 0.05281*AC + 0.1938*FL − 0.004*AC*FL
        log10w = 1.304 + 0.05281 * ac + 0.1938 * fl - 0.004 * ac * fl;
      } else if (formula === 'bpdacfl') {
        // log10(EFW) = 1.335 − 0.0034*AC*FL + 0.0316*BPD + 0.0457*AC + 0.1623*FL
        log10w = 1.335 - 0.0034 * ac * fl + 0.0316 * bpd + 0.0457 * ac + 0.1623 * fl;
      } else if (formula === 'full') {
        // log10(EFW) = 1.3596 + 0.0064*HC + 0.0424*AC + 0.174*FL + 0.00061*BPD*AC − 0.00386*AC*FL
        log10w =
          1.3596 + 0.0064 * hc + 0.0424 * ac + 0.174 * fl + 0.00061 * bpd * ac - 0.00386 * ac * fl;
      } else {
        // HC AC FL: log10(EFW) = 1.326 − 0.00326*AC*FL + 0.0107*HC + 0.0438*AC + 0.158*FL
        log10w = 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl;
      }

      const efw = round(10 ** log10w, 0);
      const lbs = round(efw / 453.592, 2);

      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = `EFW ≈ ${efw} g`;
      if (efw < 1500) {
        riskLevel = 'high';
        label = `EFW ≈ ${efw} g (very low)`;
      } else if (efw < 2500) {
        riskLevel = 'moderate';
        label = `EFW ≈ ${efw} g (<2500 g)`;
      } else if (efw > 4000) {
        riskLevel = 'moderate';
        label = `EFW ≈ ${efw} g (macrosomia range)`;
      }

      return {
        score: efw,
        unit: 'g',
        label,
        interpretation: `Hadlock-style estimated fetal weight ≈ ${efw} g (${lbs} lb) using ${formula} biometry set. Ultrasound EFW has inherent error (~±10–15%); use percentiles for GA and clinical context for delivery planning.`,
        riskLevel,
        details: [
          { label: 'Formula', value: formula },
          { label: 'Biometrics (cm)', value: `BPD ${bpd}, HC ${hc}, AC ${ac}, FL ${fl}` },
          { label: 'log10(EFW)', value: String(round(log10w, 4)) },
        ],
        recommendations: [
          'Plot on GA-specific growth chart',
          'Do not make delivery decisions on a single EFW alone',
        ],
      };
    },
    evidence: {
      summary:
        'Hadlock equations estimate fetal weight from combinations of BPD, HC, AC, and FL using log10 regression formulas (EFW in grams).',
      formula: 'log10(EFW) = Hadlock coefficients f(BPD, HC, AC, FL); EFW = 10^log10w',
      validation: 'Hadlock 1984–1985 formulas remain standard in many ultrasound packages; random error remains clinically significant near extremes.',
      references: [
        {
          title: 'Estimation of fetal weight with the use of head, body, and femur measurements',
          citation: 'Hadlock FP et al. Am J Obstet Gynecol. 1985',
          year: 1985,
          pmid: '3881966',
          doi: '10.1016/0002-9378(85)90298-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'Growth concern', actions: ['Serial US', 'Doppler if IUGR suspected', 'Antenatal testing as indicated'] },
      { condition: 'Macrosomia range', actions: ['Counsel on delivery risks', 'Clinical pelvimetry / induction policies per local protocol'] },
    ],
    pearls: [
      'AC carries the most weight in most formulas — measurement quality matters.',
      'Different software packages may use slightly different Hadlock variants.',
    ],
  },
];
