import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** Wave 8 — pediatric and obstetric/gynecologic tools. */
export const wave8PedsObCalcs: Calculator[] = [
  // ─── 1. IOTA Simple Rules ─────────────────────────────────────────────────
  {
    id: 'iota-simple-rules',
    name: 'IOTA Simple Rules for Ovarian Tumor Risk',
    shortName: 'IOTA SR',
    description:
      'International Ovarian Tumor Analysis simple ultrasound rules classifying an adnexal mass as benign, malignant, or inconclusive from five B-features and five M-features.',
    category: 'obstetrics',
    tags: ['iota', 'ovarian', 'adnexal mass', 'ultrasound', 'malignancy', 'timmerman'],
    whenToUse:
      'Non-pregnant patients with an adnexal mass selected for surgical removal, assessed by transvaginal ultrasound. Do not use for masses managed conservatively.',
    whyUse:
      'The IOTA Simple Rules conclusively classify ~75–80% of adnexal masses with ~92% sensitivity and ~96% specificity, supporting preoperative triage to generalist vs gynecologic-oncology surgery.',
    inputs: [
      yesNo('b1', 'B1: Unilocular cyst', null, 'Unilocular cyst — a benign (B) feature.', false),
      yesNo('b2', 'B2: Solid components present, but largest solid component <7 mm', null, 'Presence of solid components where the largest measures <7 mm — a B-feature.', false),
      yesNo('b3', 'B3: Acoustic shadows', null, 'Acoustic shadowing (e.g., from a dermoid) — a B-feature.', false),
      yesNo('b4', 'B4: Smooth multilocular tumor, largest diameter <100 mm', null, 'Smooth multilocular tumor whose largest diameter is <100 mm — a B-feature.', false),
      yesNo('b5', 'B5: No blood flow (color score 1)', null, 'No detectable Doppler blood flow (color score 1) — a B-feature.', false),
      yesNo('m1', 'M1: Irregular solid tumor', null, 'Irregular solid tumor — a malignant (M) feature.', true),
      yesNo('m2', 'M2: Ascites', null, 'Ascites — an M-feature.', false),
      yesNo('m3', 'M3: At least 4 papillary structures', null, '≥4 papillary structures — an M-feature.', false),
      yesNo('m4', 'M4: Irregular multilocular solid tumor, largest diameter ≥100 mm', null, 'Irregular multilocular solid tumor ≥100 mm — an M-feature.', false),
      yesNo('m5', 'M5: Very strong blood flow (color score 4)', null, 'Very strong Doppler flow (color score 4) — an M-feature.', false),
      selectInput('center', 'Ultrasound examination setting', [
        { label: 'Oncology center (higher baseline malignancy prevalence ~43%)', value: 'oncology' },
        { label: 'General/referral ultrasound center (~17%)', value: 'general' },
      ], 'general', 'Center type shifts the pretest probability of malignancy (IOTA SRRisk model: 43% in oncology centers vs 17% in other centers).'),
    ],
    calculate(values) {
      const bCount = ['b1', 'b2', 'b3', 'b4', 'b5'].filter((k) => bool(values[k])).length;
      const mCount = ['m1', 'm2', 'm3', 'm4', 'm5'].filter((k) => bool(values[k])).length;
      const oncology = str(values.center, 'general') === 'oncology';
      const prevalence = oncology ? '~43%' : '~17%';
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (mCount >= 1 && bCount === 0) {
        riskLevel = 'high';
        label = 'Classified MALIGNANT by Simple Rules';
        interpretation = `${mCount} M-feature(s) present and no B-features: the mass is classified as malignant (in IOTA validation ~85–90% of such masses were malignant). Refer to gynecologic oncology for surgical planning.`;
      } else if (bCount >= 1 && mCount === 0) {
        riskLevel = 'low';
        label = 'Classified BENIGN by Simple Rules';
        interpretation = `${bCount} B-feature(s) present and no M-features: the mass is classified as benign (~4% of masses classified benign by the rules prove malignant). Surgery can proceed in a generalist setting as clinically indicated.`;
      } else {
        riskLevel = 'moderate';
        label = 'INCONCLUSIVE Simple Rules result';
        interpretation =
          bCount > 0 && mCount > 0
            ? `Both B-features (${bCount}) and M-features (${mCount}) are present — the rules cannot classify the mass (~20–25% of masses are inconclusive). Apply the IOTA Simple Rules Risk logistic model, ADNEX model, or obtain expert ultrasound assessment.`
            : 'Neither B-features nor M-features are present — the rules cannot classify the mass. Apply the IOTA Simple Rules Risk logistic model, ADNEX model, or obtain expert ultrasound assessment.';
      }
      return {
        score: label.startsWith('INCONCLUSIVE') ? 'Inconclusive' : label.includes('MALIGNANT') ? 'Malignant' : 'Benign',
        label,
        interpretation: `${interpretation} Center type sets baseline malignancy prevalence at ${prevalence}.`,
        riskLevel,
        details: [
          { label: 'B-features present', value: `${bCount} of 5` },
          { label: 'M-features present', value: `${mCount} of 5` },
          { label: 'Rule logic', value: 'Only M → malignant; only B → benign; both or neither → inconclusive' },
        ],
        recommendations: [
          'Inconclusive result → expert ultrasound examiner, IOTA SRRisk/ADNEX model, or MRI as second-line imaging.',
          'Classified malignant → gynecologic oncology referral for staging surgery.',
          'Apply only to patients selected for surgery; not validated for expectant management.',
        ],
      };
    },
    evidence: {
      summary:
        'IOTA Simple Rules: 5 B-features (unilocular cyst; solid components <7 mm; acoustic shadows; smooth multilocular tumor <100 mm; no blood flow) and 5 M-features (irregular solid tumor; ascites; ≥4 papillary structures; irregular multilocular solid tumor ≥100 mm; very strong blood flow). Only M-features → malignant; only B-features → benign; both or neither → inconclusive.',
      formula: '≥1 M and 0 B → malignant; ≥1 B and 0 M → benign; otherwise inconclusive',
      validation:
        'Prospective temporal and external validation in 1938 women across 19 centers (Timmerman, BMJ 2010): conclusive result in 77% of masses with sensitivity 92% and specificity 96%. The 2016 SRRisk logistic model refines inconclusive cases using center type (oncology vs other).',
      references: [
        {
          title: 'Simple ultrasound rules to distinguish between benign and malignant adnexal masses before surgery: prospective validation by IOTA group',
          citation: 'Timmerman D et al. BMJ. 2010;341:c6839',
          year: 2010,
          pmid: '21156740',
          doi: '10.1136/bmj.c6839',
        },
        {
          title: 'Predicting the risk of malignancy in adnexal masses based on the Simple Rules from the International Ovarian Tumor Analysis group',
          citation: 'Timmerman D et al. Am J Obstet Gynecol. 2016;215(2):159-169',
          year: 2016,
        },
      ],
    },
    nextSteps: [
      { condition: 'Classified benign', actions: ['Proceed with planned surgery per indication', 'Routine follow-up'] },
      { condition: 'Classified malignant', actions: ['Gynecologic oncology referral', 'Staging imaging (CT chest/abdomen/pelvis)', 'Tumor markers (CA-125, HE4) as adjuncts'] },
      { condition: 'Inconclusive', actions: ['Expert ultrasound or MRI', 'IOTA SRRisk or ADNEX model', 'Multidisciplinary discussion if suspicion persists'] },
    ],
    pearls: [
      'The rules are inconclusive in ~20–25% of masses — an inconclusive result is not reassuring.',
      'M-features dominate B-features only when B-features are absent; any M-feature with ≥1 B-feature is inconclusive, not malignant.',
      'Center type (oncology vs general) roughly triples baseline malignancy prevalence and shifts post-test risk.',
    ],
  },

  // ─── 2. Reid's Colposcopic Index ──────────────────────────────────────────
  {
    id: 'reids-colposcopic-index',
    name: "Reid's Colposcopic Index (RCI)",
    shortName: 'RCI',
    description:
      'Four-sign colposcopic score (margin, color, vessels, iodine staining) predicting the histologic grade of premalignant cervical lesions.',
    category: 'obstetrics',
    tags: ['colposcopy', 'reid', 'cin', 'cervix', 'hpv', 'acetowhite'],
    whenToUse:
      'During colposcopic examination of the cervix after application of 3–5% acetic acid and Lugol iodine, to grade lesion severity and direct biopsy.',
    whyUse:
      'The RCI standardizes colposcopic impressions; score 0–2 suggests low-grade (HPV/CIN 1), 3–5 is an overlap zone, and 6–8 predicts high-grade disease (CIN 2–3).',
    inputs: [
      selectInput('margin', 'Margin (lesion edge and contour)', [
        { label: 'Condylomatous/micropapillary contour, indistinct borders, feathered/jagged edges, or satellite lesions', value: 0, points: 0 },
        { label: 'Regular lesions with smooth straight outlines and sharp peripheral margins', value: 1, points: 1 },
        { label: 'Rolled, peeling edges or internal borders between areas of differing appearance', value: 2, points: 2 },
      ], 1, 'Score the peripheral contour after acetic acid. Rolled/peeling edges and internal demarcation are high-grade features.'),
      selectInput('color', 'Color of acetowhite epithelium', [
        { label: 'Shiny snow-white; indistinct, semi-transparent acetowhitening', value: 0, points: 0 },
        { label: 'Shiny off-white / intermediate white', value: 1, points: 1 },
        { label: 'Dull, oyster gray', value: 2, points: 2 },
      ], 1, 'Assess opacity and shade of the acetowhite reaction; dull oyster-gray is most concerning.'),
      selectInput('vessels', 'Vascular pattern', [
        { label: 'Fine-caliber uniform vessels, poorly formed patterns, nondilated capillary loops, or fine punctation/mosaic', value: 0, points: 0 },
        { label: 'Absence of surface vessels after acetic acid soaking', value: 1, points: 1 },
        { label: 'Definite punctation or mosaic; dilated vessels in sharply demarcated patterns', value: 2, points: 2 },
      ], 1, 'Coarse punctation/mosaic with sharply demarcated dilated vessels scores 2.'),
      selectInput('iodine', 'Iodine staining (Lugol)', [
        { label: 'Positive mahogany-brown uptake, or iodine-negative area scoring ≤2/6 on the first three signs', value: 0, points: 0 },
        { label: 'Partial uptake — variegated, tortoise-shell appearance', value: 1, points: 1 },
        { label: 'Mustard-yellow negative staining in a lesion scoring ≥3/6 on the first three signs', value: 2, points: 2 },
      ], 1, 'Iodine negativity counts only when the lesion already looks significant (≥3 of 6 points on margin/color/vessels).'),
    ],
    calculate(values) {
      const score = num(values.margin) + num(values.color) + num(values.vessels) + num(values.iodine);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score <= 2) {
        riskLevel = 'low';
        label = 'Low-grade pattern (0–2)';
        interpretation = `RCI ${score}/8: lesions in this range usually correspond to HPV change or CIN 1. Biopsy may still be indicated based on cytology, HPV status, and clinical judgment.`;
      } else if (score <= 5) {
        riskLevel = 'moderate';
        label = 'Intermediate/overlap pattern (3–5)';
        interpretation = `RCI ${score}/8: overlap zone between CIN 1 and CIN 2 — biopsy is recommended to establish histology.`;
      } else {
        riskLevel = 'high';
        label = 'High-grade pattern (6–8)';
        interpretation = `RCI ${score}/8: pattern predictive of CIN 2–3 — biopsy (and often excisional evaluation) is recommended.`;
      }
      return {
        score,
        unit: '/8',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Margin', value: String(num(values.margin)) },
          { label: 'Color', value: String(num(values.color)) },
          { label: 'Vessels', value: String(num(values.vessels)) },
          { label: 'Iodine staining', value: String(num(values.iodine)) },
        ],
        recommendations: [
          'Score ≥3 → directed biopsy of the worst-appearing area.',
          'Correlate with cytology and high-risk HPV testing; RCI does not replace histology.',
        ],
      };
    },
    evidence: {
      summary:
        'Reid\'s Colposcopic Index grades margin, color, vessels, and iodine staining 0–2 each (total 0–8). Bands: 0–2 low-grade (HPV/CIN 1), 3–5 intermediate (CIN 1–2 overlap), 6–8 high-grade (CIN 2–3).',
      formula: 'Sum of 4 colposcopic signs, each 0–2 (range 0–8)',
      validation:
        'Derived by Reid and Scalzi (Am J Obstet Gynecol 1985) to differentiate subclinical HPV infection from high-grade CIN; reported ~97% accuracy for grade prediction in the original series. External studies show high correlation with the Swede score (AUC ~0.9 for CIN2+).',
      references: [
        {
          title: 'Genital warts and cervical cancer. VII. An improved colposcopic index for differentiating benign papillomaviral infections from high-grade cervical intraepithelial neoplasia',
          citation: 'Reid R, Scalzi P. Am J Obstet Gynecol. 1985;153(6):611-618',
          year: 1985,
        },
      ],
    },
    nextSteps: [
      { condition: 'RCI 0–2', actions: ['Biopsy if cytology/HPV warrants', 'Follow-up colposcopy per local protocol'] },
      { condition: 'RCI 3–5', actions: ['Directed biopsy', 'Endocervical sampling if transformation zone not fully visualized'] },
      { condition: 'RCI 6–8', actions: ['Directed biopsy or excisional procedure', 'Expedited gynecology follow-up'] },
    ],
    pearls: [
      'The iodine item counts as abnormal only when the lesion already scores ≥3/6 on the first three signs.',
      'RCI and Swede scores correlate strongly (r ≈0.99 in comparative studies); Swede adds lesion size.',
    ],
  },

  // ─── 3. Swede Score ───────────────────────────────────────────────────────
  {
    id: 'swede-score',
    name: 'Swede Score (Colposcopy)',
    shortName: 'Swede Score',
    description:
      'Five-variable colposcopic score (aceto-uptake, margins/surface, vessels, lesion size, iodine staining) predicting high-grade cervical lesions.',
    category: 'obstetrics',
    tags: ['colposcopy', 'swede', 'cin', 'cervix', 'acetowhite', 'strander'],
    whenToUse:
      'During colposcopy after acetic acid and Lugol iodine application, to quantify the likelihood of a high-grade squamous lesion (CIN 2+) and guide biopsy or see-and-treat decisions.',
    whyUse:
      'Score ≥5 identifies essentially all high-grade lesions (sensitivity ~100% in derivation); ≥8 has ~90% specificity and is used in some see-and-treat protocols.',
    inputs: [
      selectInput('aceto', 'Aceto-uptake', [
        { label: 'None or transparent', value: 0, points: 0 },
        { label: 'Shady, milky (not transparent, not opaque)', value: 1, points: 1 },
        { label: 'Distinct, opaque white', value: 2, points: 2 },
      ], 1, 'Degree of acetowhite reaction.'),
      selectInput('margins', 'Margins / surface', [
        { label: 'Diffuse margins', value: 0, points: 0 },
        { label: 'Sharp but irregular, jagged, "geographical" satellites', value: 1, points: 1 },
        { label: 'Sharp and even; difference in surface level including "cuffing"', value: 2, points: 2 },
      ], 1, 'Edge sharpness and surface contour of the lesion.'),
      selectInput('vessels', 'Vessels', [
        { label: 'Fine, regular', value: 0, points: 0 },
        { label: 'Absent', value: 1, points: 1 },
        { label: 'Coarse or atypical', value: 2, points: 2 },
      ], 1, 'Vascular pattern within the lesion.'),
      selectInput('size', 'Lesion size', [
        { label: '<5 mm', value: 0, points: 0 },
        { label: '5–15 mm or 2 quadrants', value: 1, points: 1 },
        { label: '>15 mm or 3–4 quadrants or endocervically undefined', value: 2, points: 2 },
      ], 1, 'Largest diameter / number of cervical quadrants involved.'),
      selectInput('iodine', 'Iodine staining', [
        { label: 'Brown (positive uptake)', value: 0, points: 0 },
        { label: 'Faintly or patchy yellow', value: 1, points: 1 },
        { label: 'Distinct yellow', value: 2, points: 2 },
      ], 1, 'Lugol iodine uptake; distinct mustard-yellow staining scores 2.'),
    ],
    calculate(values) {
      const score =
        num(values.aceto) + num(values.margins) + num(values.vessels) + num(values.size) + num(values.iodine);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score >= 8) {
        riskLevel = 'high';
        label = 'High-grade lesion likely (≥8)';
        interpretation = `Swede score ${score}/10: ~90% specificity for CIN 2+. In see-and-treat protocols, immediate excisional treatment may be considered — factor in the referral cytology result.`;
      } else if (score >= 5) {
        riskLevel = 'moderate';
        label = 'Biopsy recommended (5–7)';
        interpretation = `Swede score ${score}/10: scores ≥5 captured all high-grade lesions in the derivation study — directed biopsy is recommended.`;
      } else {
        riskLevel = 'low';
        label = 'Lower suspicion (<5)';
        interpretation = `Swede score ${score}/10: lower likelihood of high-grade disease, but low scores do not reliably exclude CIN 2+ in all series — biopsy per cytology/HPV risk and clinical judgment.`;
      }
      return {
        score,
        unit: '/10',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Aceto-uptake', value: String(num(values.aceto)) },
          { label: 'Margins/surface', value: String(num(values.margins)) },
          { label: 'Vessels', value: String(num(values.vessels)) },
          { label: 'Lesion size', value: String(num(values.size)) },
          { label: 'Iodine', value: String(num(values.iodine)) },
        ],
        recommendations: [
          '≥8: consider see-and-treat excision if cytology is high-grade and the patient is a suitable candidate.',
          '≥5: directed biopsy; many experts biopsy regardless of score.',
          'Score was designed to standardize reporting, not replace histology.',
        ],
      };
    },
    evidence: {
      summary:
        'Swede score: five colposcopic variables (aceto-uptake, margins/surface, vessels, lesion size, iodine) each 0–2, total 0–10. Score ≥5 detected all high-grade lesions in derivation; ≥8 ~90% specificity.',
      formula: 'Sum of 5 colposcopic signs, each 0–2 (range 0–10)',
      validation:
        'Derived by Strander et al. (Acta Obstet Gynecol Scand 2005); ≥5 sensitivity ~100% for HGL, ≥8 specificity 90%. Validated in non-pregnant and pregnant cohorts (all CIN2+ cases had Swede ≥5); comparative studies show performance equivalent to Reid index (AUC ~0.9).',
      references: [
        {
          title: 'The performance of a new scoring system for colposcopy in detecting high-grade dysplasia in the uterine cervix',
          citation: 'Strander B et al. Acta Obstet Gynecol Scand. 2005;84(1):37-41',
          year: 2005,
          doi: '10.1111/j.0001-6349.2005.00895.x',
        },
        {
          title: 'The Swede score: evaluation of a scoring system designed to improve the predictive value of colposcopy',
          citation: 'Bowring J, Strander B, Young M, Evans H, Walker P. J Low Genit Tract Dis. 2010;14(4):301-305',
          year: 2010,
        },
      ],
    },
    nextSteps: [
      { condition: 'Swede ≥8', actions: ['Consider immediate excisional treatment per protocol', 'Confirm with prior cytology'] },
      { condition: 'Swede 5–7', actions: ['Directed biopsy', 'Colposcopy follow-up per results'] },
      { condition: 'Swede <5', actions: ['Biopsy if cytology/HPV risk warrants', 'Routine surveillance'] },
    ],
    pearls: [
      'Lesion size is the added variable versus Reid\'s index and independently predicts high-grade histology.',
      'A ≥8 score is the see-and-treat threshold in several European protocols.',
    ],
  },

  // ─── 4. FIGO Ovarian 2014 ─────────────────────────────────────────────────
  {
    id: 'figo-ovarian-2014',
    name: 'FIGO Staging for Ovarian Cancer (2014)',
    shortName: 'FIGO Ovary',
    description:
      'FIGO 2014 surgical-pathologic staging for carcinoma of the ovary, fallopian tube, and primary peritoneum.',
    category: 'oncology',
    tags: ['figo', 'ovarian', 'fallopian tube', 'peritoneal', 'staging', 'gyn onc'],
    whenToUse:
      'After surgical-pathologic evaluation of ovarian, tubal, or primary peritoneal carcinoma to assign the FIGO 2014 stage (stages ovary/tube/peritoneum collectively).',
    whyUse:
      'FIGO stage is the dominant prognostic factor and determines adjuvant therapy, trial eligibility, and counseling.',
    inputs: [
      selectInput('substage', 'Extent of disease (select the matching FIGO 2014 substage)', [
        { label: 'IA — one ovary/tube, capsule intact, no surface tumor, negative washings', value: 'IA', description: 'Limited to one ovary or fallopian tube' },
        { label: 'IB — both ovaries/tubes, capsules intact, no surface tumor, negative washings', value: 'IB', description: 'Limited to both ovaries or tubes' },
        { label: 'IC1 — surgical spill intraoperatively', value: 'IC1', description: 'Stage I with intraoperative capsule rupture' },
        { label: 'IC2 — capsule rupture before surgery or tumor on ovarian/tubal surface', value: 'IC2', description: 'Stage I with preoperative rupture or surface tumor' },
        { label: 'IC3 — malignant cells in ascites or peritoneal washings', value: 'IC3', description: 'Stage I with positive cytology' },
        { label: 'IIA — extension/implants on uterus, tubes, or ovaries', value: 'IIA', description: 'Pelvic extension below the brim' },
        { label: 'IIB — extension to other pelvic intraperitoneal tissues', value: 'IIB', description: 'Other pelvic extension' },
        { label: 'IIIA1 — positive retroperitoneal nodes only', value: 'IIIA1', description: 'Nodes only; subdivide (i) ≤10 mm, (ii) >10 mm' },
        { label: 'IIIA2 — microscopic extrapelvic peritoneal spread ± nodes', value: 'IIIA2', description: 'Microscopic peritoneal metastasis beyond pelvis' },
        { label: 'IIIB — macroscopic peritoneal metastasis beyond pelvis ≤2 cm ± nodes', value: 'IIIB', description: 'Visible extrapelvic peritoneal disease ≤2 cm' },
        { label: 'IIIC — peritoneal metastasis beyond pelvis >2 cm ± nodes', value: 'IIIC', description: 'Includes extension to liver/splenic capsule (not parenchyma)' },
        { label: 'IVA — pleural effusion with positive cytology', value: 'IVA', description: 'Distant metastasis' },
        { label: 'IVB — extra-abdominal metastases (inguinal nodes, parenchymal liver/splenic, etc.)', value: 'IVB', description: 'Distant metastasis outside abdomen' },
      ], 'IIIC', 'Choose the substage matching surgical-pathologic findings. Stage IIIA1 covers node-only disease; IVA is malignant pleural effusion; IVB is extra-abdominal metastasis.'),
    ],
    calculate(values) {
      const ss = str(values.substage, 'IIIC');
      const stage = ss.startsWith('III') ? 'III' : ss.startsWith('IV') ? 'IV' : ss.startsWith('II') ? 'II' : 'I';
      const survival: Record<string, string> = { I: '~90%', II: '~70%', III: '~35–40%', IV: '~15–20%' };
      const desc: Record<string, string> = {
        IA: 'Tumor limited to one ovary (capsule intact) or fallopian tube; no surface tumor; no malignant ascites/washings.',
        IB: 'Tumor limited to both ovaries or tubes (capsules intact); no surface tumor; negative cytology.',
        IC1: 'Stage I with intraoperative surgical spill.',
        IC2: 'Stage I with preoperative capsule rupture or tumor on the surface.',
        IC3: 'Stage I with malignant cells in ascites or peritoneal washings.',
        IIA: 'Extension and/or implants on the uterus, fallopian tubes, or ovaries.',
        IIB: 'Extension to other pelvic intraperitoneal tissues.',
        IIIA1: 'Positive retroperitoneal lymph nodes only — (i) metastasis ≤10 mm, (ii) >10 mm.',
        IIIA2: 'Microscopic extrapelvic (above the brim) peritoneal involvement ± positive retroperitoneal nodes.',
        IIIB: 'Macroscopic peritoneal metastasis beyond the pelvis ≤2 cm ± positive retroperitoneal nodes.',
        IIIC: 'Peritoneal metastasis beyond the pelvis >2 cm ± positive nodes; includes extension to liver/splenic capsule.',
        IVA: 'Pleural effusion with positive cytology.',
        IVB: 'Extra-abdominal metastases including inguinal nodes and parenchymal liver or splenic metastases.',
      };
      const riskLevel = stage === 'I' ? 'moderate' : stage === 'II' ? 'high' : 'critical';
      return {
        score: `FIGO ${ss}`,
        label: `Stage ${stage} ovarian/tubal/peritoneal carcinoma`,
        interpretation: `${desc[ss]} Approximate 5-year survival for stage ${stage}: ${survival[stage]} (histology and treatment dependent).`,
        riskLevel,
        details: [
          { label: 'Substage', value: `FIGO ${ss}` },
          { label: 'Stage group', value: `Stage ${stage}` },
          { label: 'Approx. 5-year survival', value: survival[stage] },
        ],
        recommendations: [
          'Document primary site (ovary/tube/peritoneum) where determinable and histologic type — required by FIGO 2014.',
          'Stage directs adjuvant chemotherapy (carboplatin/paclitaxel ± bevacizumab/PARP per biomarkers) and surgical completeness goals.',
        ],
      };
    },
    evidence: {
      summary:
        'FIGO 2014 stages ovary, fallopian tube, and primary peritoneal carcinoma together: I confined to ovaries/tubes (IC = spill/surface/cytology), II pelvic extension, III peritoneal spread beyond pelvis and/or retroperitoneal nodes (IIIA1 node-only), IV distant metastasis (IVA pleural cytology, IVB extra-abdominal).',
      formula: 'Surgical-pathologic stage assignment by anatomic extent',
      validation:
        'Consensus classification by the FIGO Committee on Gynecologic Oncology (Prat 2014), adopted by UICC/AJCC. Stage remains the strongest predictor of survival in epithelial ovarian cancer.',
      references: [
        {
          title: 'Staging classification for cancer of the ovary, fallopian tube, and peritoneum',
          citation: 'Prat J; FIGO Committee on Gynecologic Oncology. Int J Gynaecol Obstet. 2014;124(1):1-5',
          year: 2014,
          pmid: '24219974',
          doi: '10.1016/j.ijgo.2013.10.001',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage I–II', actions: ['Complete surgical staging', 'Adjuvant chemotherapy per grade/histology', 'Genetic counseling (BRCA/HRD)'] },
      { condition: 'Stage III–IV', actions: ['Primary cytoreduction vs neoadjuvant chemotherapy assessment', 'Biomarker testing (BRCA, HRD)', 'Multidisciplinary gyn-onc planning'] },
    ],
    pearls: [
      'Malignant ascites or washings alone in an otherwise stage I tumor upstages to IC3.',
      'Splenic/liver capsule surface metastasis is IIIC; parenchymal metastasis is IVB.',
      'There is no stage I primary peritoneal carcinoma.',
    ],
  },

  // ─── 5. VURx ──────────────────────────────────────────────────────────────
  {
    id: 'vurx',
    name: 'Vesicoureteral Reflux Index (VURx)',
    shortName: 'VURx',
    description:
      'Six-point index predicting spontaneous improvement/resolution of primary vesicoureteral reflux and risk of breakthrough febrile UTI in children.',
    category: 'pediatrics',
    tags: ['vur', 'vurx', 'reflux', 'vcug', 'febrile uti', 'urology', 'kirsch'],
    whenToUse:
      'Children diagnosed with primary vesicoureteral reflux (validated in those diagnosed <24 months, later extended to older children) when discussing likelihood of spontaneous resolution and breakthrough fUTI risk.',
    whyUse:
      'Higher VURx scores predict slower spontaneous resolution and greater breakthrough febrile UTI risk, informing prophylaxis, surveillance VCUG timing, and surgical counseling.',
    inputs: [
      selectInput('gender', 'Gender', [
        { label: 'Male', value: 0, points: 0 },
        { label: 'Female', value: 1, points: 1 },
      ], 0, 'Female sex scores 1 point — boys show higher spontaneous resolution rates.'),
      selectInput('timing', 'VUR timing on VCUG', [
        { label: 'Voiding (only during voiding phase)', value: 1, points: 1 },
        { label: 'Late filling', value: 2, points: 2 },
        { label: 'Early to mid filling', value: 3, points: 3 },
      ], 1, 'Bladder-filling phase at which reflux first appears; earlier reflux predicts lower resolution.'),
      selectInput('anomaly', 'Ureteral anomalies (complete duplication or peri-ureteral diverticulum)', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Present', value: 1, points: 1 },
      ], 0, 'Complete ureteral duplication or peri-ureteral diverticulum.'),
      selectInput('grade', 'VUR grade', [
        { label: 'Low to moderate (grade 1–3)', value: 0, points: 0 },
        { label: 'High (grade 4–5)', value: 1, points: 1 },
      ], 0, 'International Reflux Study grade.'),
    ],
    calculate(values) {
      const score = num(values.gender) + num(values.timing) + num(values.anomaly) + num(values.grade);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score <= 2) {
        riskLevel = 'low';
        label = 'Favorable profile (1–2)';
        interpretation = `VURx ${score}/6: relatively favorable — highest likelihood of spontaneous resolution/improvement and lowest breakthrough fUTI risk.`;
      } else if (score <= 4) {
        riskLevel = 'moderate';
        label = 'Intermediate (3–4)';
        interpretation = `VURx ${score}/6: intermediate — resolution/improvement is slower; scores ≥3 were significantly associated with non-resolution in validation cohorts.`;
      } else {
        riskLevel = 'high';
        label = 'Unfavorable (5–6)';
        interpretation = `VURx ${score}/6: unfavorable — low spontaneous-resolution likelihood and elevated breakthrough febrile UTI risk; discuss prophylaxis and surgical options with pediatric urology.`;
      }
      return {
        score,
        unit: '/6',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Sex points', value: String(num(values.gender)) },
          { label: 'Timing points', value: String(num(values.timing)) },
          { label: 'Anomaly points', value: String(num(values.anomaly)) },
          { label: 'Grade points', value: String(num(values.grade)) },
        ],
        recommendations: [
          'Higher score → discuss continuous antibiotic prophylaxis and closer VCUG surveillance with pediatric urology.',
          'Breakthrough fUTI on prophylaxis or renal scarring → consider endoscopic/surgical correction.',
        ],
      };
    },
    evidence: {
      summary:
        'VURx (1–6 points): female +1; VUR timing voiding +1, late filling +2, early–mid filling +3; ureteral anomaly (duplication/diverticulum) +1; high grade (IV–V) +1. Higher score → lower spontaneous resolution and higher breakthrough fUTI.',
      formula: 'Gender (0–1) + timing (1–3) + ureteral anomaly (0–1) + grade (0–1)',
      validation:
        'Derived and validated by Kirsch\'s group (J Pediatr Urol 2014, children <24 months; multi-institutional validation 2015; extended to children >24 months, J Urol 2017). VURx outperformed grade and ureteral diameter ratio for breakthrough fUTI prediction (AUC 0.77).',
      references: [
        {
          title: 'Vesicoureteral reflux index (VURx): a novel tool to predict primary reflux improvement and resolution in children less than 2 years of age',
          citation: 'Arlen AM et al. J Pediatr Urol. 2014;10(6):1298-1303',
          year: 2014,
          doi: '10.1016/j.jpurol.2014.06.019',
        },
        {
          title: 'Predicting breakthrough urinary tract infection: comparative analysis of vesicoureteral reflux index, reflux grade and ureteral diameter ratio',
          citation: 'Arlen AM et al. J Urol. 2020;204(2):350-355',
          year: 2020,
          doi: '10.1097/JU.0000000000001035',
        },
      ],
    },
    nextSteps: [
      { condition: 'VURx ≤2', actions: ['Shared decision-making on prophylaxis vs surveillance', 'Periodic VCUG/renal-bladder ultrasound per protocol'] },
      { condition: 'VURx 3–4', actions: ['Discuss prophylaxis and urology follow-up interval', 'Renal ultrasound surveillance'] },
      { condition: 'VURx ≥5', actions: ['Pediatric urology referral', 'Consider surgical/endoscopic options if breakthrough infections or scarring'] },
    ],
    pearls: [
      'Reflux appearing early in bladder filling is a stronger adverse marker than grade alone.',
      'High-grade (IV–V) reflux was not associated with resolution at any time point in the >24-month cohort.',
    ],
  },

  // ─── 6. PARADISE criteria ─────────────────────────────────────────────────
  {
    id: 'paradise-tonsillectomy',
    name: 'Paradise Criteria for Tonsillectomy in Children',
    shortName: 'Paradise',
    description:
      'Frequency/severity/documentation criteria (7-5-3 rule) identifying children with recurrent throat infection who benefit from tonsillectomy.',
    category: 'pediatrics',
    tags: ['tonsillectomy', 'paradise', 'recurrent tonsillitis', 'ent', '7-5-3'],
    whenToUse:
      'Children 1–18 years with recurrent throat infection being considered for tonsillectomy. Not intended for diabetes, cardiopulmonary disease, craniofacial disorders, sickle cell disease/coagulopathy, or immunodeficiency.',
    whyUse:
      'The Paradise criteria operationalize the AAO-HNS recommendation that tonsillectomy may be offered for recurrent throat infection when frequency, clinical features, and documentation thresholds are met.',
    inputs: [
      selectInput('episodes', 'Number of documented sore-throat episodes', [
        { label: '≥7 episodes in the past 1 year', value: 'y1', description: 'Meets frequency criterion' },
        { label: '≥5 episodes per year in each of the past 2 years', value: 'y2', description: 'Meets frequency criterion' },
        { label: '≥3 episodes per year in each of the past 3 years', value: 'y3', description: 'Meets frequency criterion' },
        { label: 'Fewer / does not meet any frequency threshold', value: 'none', description: 'Frequency criterion NOT met' },
      ], 'y2', 'Frequency: ≥7 in 1 year, ≥5/yr × 2 years, or ≥3/yr × 3 years.'),
      yesNo('features', 'Episodes are sore throat plus ≥1 qualifying feature', null,
        'Each episode counts if it includes fever >38.3°C, tender/enlarged (>2 cm) cervical nodes, tonsillar/pharyngeal exudate, or positive GAS culture.', true),
      yesNo('treated', 'Streptococcal episodes treated with conventional antibiotic doses', null,
        'Episodes proven or suspected to be streptococcal should have been treated with antibiotics in conventional dosage.', true),
      yesNo('documented', 'Episodes + features documented (or 2 subsequent episodes observed by clinician)', null,
        'Ideally each episode and its features are documented; if not fully documented, the clinician may subsequently observe 2 episodes consistent with the reported pattern.', true),
    ],
    calculate(values) {
      const freqMet = str(values.episodes, 'none') !== 'none';
      const features = bool(values.features);
      const treated = bool(values.treated);
      const documented = bool(values.documented);
      const met = freqMet && features && treated && documented;
      return {
        score: met ? 'Criteria met' : 'Criteria not met',
        label: met ? 'Meets Paradise criteria' : 'Does not meet Paradise criteria',
        interpretation: met
          ? 'Frequency, clinical features, treatment, and documentation criteria are satisfied — tonsillectomy is reasonable to offer; expect modest reductions in frequency/severity of throat infections for ~2 years.'
          : 'Paradise criteria are not fully met — watchful waiting is generally recommended. Tonsillectomy may still be considered for modifying factors (multiple antibiotic allergy, PFAPA, peritonsillar abscess history, tonsillar hypertrophy with sleep-disordered breathing).',
        riskLevel: met ? 'moderate' : 'low',
        details: [
          { label: 'Frequency (7-5-3 rule)', value: freqMet ? 'Met' : 'Not met' },
          { label: 'Episode features', value: features ? 'Met' : 'Not met' },
          { label: 'Antibiotic treatment', value: treated ? 'Met' : 'Not met' },
          { label: 'Documentation', value: documented ? 'Met' : 'Not met' },
        ],
        recommendations: met
          ? ['Shared decision-making: surgical risks vs ~1 fewer sore-throat days/month in severely affected children', 'Perioperative planning with ENT']
          : ['Watchful waiting recommended by AAO-HNS', 'Reassess if pattern intensifies or modifying factors emerge'],
      };
    },
    evidence: {
      summary:
        'Paradise/AAO-HNS criteria: ≥7 episodes in 1 year, ≥5/yr for 2 years, or ≥3/yr for 3 years; each episode = sore throat + ≥1 of fever >38.3°C, cervical adenopathy, tonsillar exudate, or positive GAS test; episodes documented (or clinician observes 2 typical subsequent episodes); strep episodes treated appropriately.',
      formula: 'Frequency AND features AND documentation AND treatment criteria',
      validation:
        'Based on the Paradise randomized trials in severely affected children (NEJM 1984; follow-up Pediatrics 2002) and codified in the AAO-HNS 2019 tonsillectomy guideline. Benefit is modest — most children improve regardless of surgery.',
      references: [
        {
          title: 'Efficacy of tonsillectomy for recurrent throat infection in severely affected children',
          citation: 'Paradise JL et al. N Engl J Med. 1984;310:674-683',
          year: 1984,
          doi: '10.1056/NEJM198403153101202',
        },
        {
          title: 'Clinical Practice Guideline: Tonsillectomy in Children (Update)',
          citation: 'Mitchell RB et al. Otolaryngol Head Neck Surg. 2019;160(1_suppl):S1-S42',
          year: 2019,
          doi: '10.1177/0194599818801757',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Offer tonsillectomy discussion', 'Document shared decision-making', 'ENT referral'] },
      { condition: 'Criteria not met', actions: ['Watchful waiting', 'Consider modifying factors (PFAPA, peritonsillar abscess, antibiotic allergy, SDB)'] },
    ],
    pearls: [
      'Children mildly/moderately affected (less severe criteria) derive less benefit — watchful waiting is reasonable.',
      'Tonsillar hypertrophy with sleep-disordered breathing is a separate indication not covered by these criteria.',
    ],
  },

  // ─── 7. Infant Scalp Score ────────────────────────────────────────────────
  {
    id: 'infant-scalp-score',
    name: 'Infant Scalp Score (ISS)',
    shortName: 'Scalp Score',
    description:
      'Risk stratification for clinically important TBI in infants with isolated scalp hematoma after head trauma, from age, hematoma size, and location.',
    category: 'pediatrics',
    tags: ['scalp hematoma', 'head injury', 'infant', 'tbi', 'ct', 'greenes'],
    whenToUse:
      'Infants ≤12 months (validated ≤24 months) with isolated scalp hematoma after blunt head trauma, GCS 14–15, and no other signs/symptoms of TBI. Not for suspected non-accidental trauma.',
    whyUse:
      'ISS ≥4 had 100% sensitivity for clinically important TBI in the PECARN validation cohort; scores <4 support observation over routine CT.',
    inputs: [
      selectInput('age', 'Patient age', [
        { label: '>12 months', value: 0, points: 0 },
        { label: '6–11 months', value: 1, points: 1 },
        { label: '3–5 months', value: 2, points: 2 },
        { label: '0–2 months', value: 3, points: 3 },
      ], 2, 'Younger age carries higher risk of skull fracture and TBI.'),
      selectInput('size', 'Hematoma size', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Small (barely palpable, <1 cm)', value: 1, points: 1 },
        { label: 'Medium (easily palpable, 1–3 cm)', value: 2, points: 2 },
        { label: 'Large (boggy consistency, >3 cm)', value: 3, points: 3 },
      ], 2, 'Larger/boggy hematomas associate with higher TBI risk.'),
      selectInput('location', 'Hematoma location', [
        { label: 'Frontal', value: 0, points: 0 },
        { label: 'Occipital', value: 1, points: 1 },
        { label: 'Temporal or parietal', value: 2, points: 2 },
      ], 2, 'Temporal/parietal hematomas carry the highest association with skull fracture and TBI.'),
    ],
    calculate(values) {
      const score = num(values.age) + num(values.size) + num(values.location);
      const high = score >= 4;
      return {
        score,
        unit: '/8',
        label: high ? 'Consider head imaging (ISS ≥4)' : 'Lower risk (ISS <4)',
        interpretation: high
          ? `ISS ${score}: above the validated ≥4 threshold (sensitivity ~100% for ciTBI in the PECARN cohort). Head imaging (usually CT) should be considered; some studies suggest ≥5 as a ciTBI cut-off.`
          : `ISS ${score}: below the ≥4 threshold — very low risk of clinically important TBI; observation with caregiver education is reasonable. Clinical judgment still applies.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'Age points', value: String(num(values.age)) },
          { label: 'Size points', value: String(num(values.size)) },
          { label: 'Location points', value: String(num(values.location)) },
        ],
        recommendations: [
          'ISS ≥4 → consider CT; ISS ≥5 → some studies support a higher ciTBI cut-off.',
          'Any concern for non-accidental trauma → do not use this rule; follow institutional NAT protocols.',
          'Evaluate for other injuries even when the chief complaint is head injury.',
        ],
      };
    },
    evidence: {
      summary:
        'ISS = age (>12 mo 0, 6–11 +1, 3–5 +2, 0–2 +3) + hematoma size (none 0, small +1, medium +2, large +3) + location (frontal 0, occipital +1, temporal/parietal +2). Range 0–8; ≥4 prompts consideration of imaging.',
      formula: 'Age (0–3) + hematoma size (0–3) + hematoma location (0–2)',
      validation:
        'Derived by Bin, Schutzman, Greenes (Pediatr Emerg Care 2010) in 203 infants; validated on 1289 PECARN infants with isolated scalp hematoma — ISS ≥4 sensitivity 100% for ciTBI and TBI on CT (specificity 0.49); ISS ≥5 specificity 0.68 but missed 3 TBI on CT (none needing intervention).',
      references: [
        {
          title: 'Validation of a clinical score to predict skull fracture in head-injured infants',
          citation: 'Bin SS, Schutzman SA, Greenes DS. Pediatr Emerg Care. 2010;26(9):633-639',
          year: 2010,
          doi: '10.1097/PEC.0b013e3181ef0440',
        },
        {
          title: 'The Infant Scalp Score: a validated tool to stratify risk of traumatic brain injury in infants with isolated scalp hematoma',
          citation: 'Acad Emerg Med. 2021;28(2):188-196',
          year: 2021,
          pmid: '32673432',
          doi: '10.1111/acem.14087',
        },
      ],
    },
    nextSteps: [
      { condition: 'ISS <4', actions: ['Observation', 'Caregiver education on return precautions'] },
      { condition: 'ISS ≥4', actions: ['Consider CT head', 'Period of observation if imaging deferred', 'Reassess exam'] },
    ],
    pearls: [
      'Applies only to ISOLATED scalp hematoma — any other symptom/sign takes the child out of the rule.',
      'Frontal hematomas are the least concerning location; temporal/parietal the most.',
      'Do not apply when non-accidental trauma is a possibility.',
    ],
  },

  // ─── 8. Pediatric Ins and Outs ────────────────────────────────────────────
  {
    id: 'pediatric-ins-outs',
    name: 'Pediatric Ins and Outs',
    shortName: 'Ins & Outs',
    description:
      'Converts a measured intake/output volume into mL/kg and mL/kg/hr for pediatric patients (e.g., urine output assessment).',
    category: 'pediatrics',
    tags: ['fluids', 'urine output', 'ins and outs', 'dehydration', 'ml/kg/hr'],
    whenToUse:
      'Any pediatric patient where a measured volume (urine, drains, GI losses) needs to be normalized to weight and time.',
    whyUse:
      'Weight- and time-normalized volumes are how pediatric output adequacy is judged — minimum acceptable urine output is typically ~1 mL/kg/hr (higher in neonates/infants).',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 0.5, max: 200, step: 0.1, exampleValue: 15, helpText: 'Patient weight; choose the entry unit that matches the scale reading.' }),
      numberInput('volume', 'Volume to be calculated', { unit: 'mL', min: 0, max: 5000, exampleValue: 300, helpText: 'Total measured volume over the stated period (e.g., urine output in mL).' }),
      numberInput('hours', 'Period of time', { unit: 'hours', min: 0.5, max: 48, step: 0.5, exampleValue: 8, helpText: 'Collection period for the measured volume.' }),
    ],
    calculate(values) {
      const weight = Math.max(num(values.weight, 15), 0.1);
      const volume = num(values.volume, 0);
      const hours = Math.max(num(values.hours, 8), 0.25);
      const mlKg = round(volume / weight, 1);
      const mlKgHr = round(volume / weight / hours, 2);
      const low = mlKgHr < 1;
      return {
        score: mlKgHr,
        unit: 'mL/kg/hr',
        label: low ? 'Below typical minimum urine output' : 'Within typical urine output range',
        interpretation: low
          ? `${mlKgHr} mL/kg/hr (${mlKg} mL/kg over ${hours} h) — below the ~1 mL/kg/hr minimum acceptable urine output for older children; assess hydration, perfusion, and renal function.`
          : `${mlKgHr} mL/kg/hr (${mlKg} mL/kg over ${hours} h) — at or above the typical ~1 mL/kg/hr minimum urine output for children (neonates/infants are often expected to produce ~2 mL/kg/hr).`,
        riskLevel: low ? 'moderate' : 'normal',
        details: [
          { label: 'Volume per weight', value: `${mlKg} mL/kg` },
          { label: 'Rate', value: `${mlKgHr} mL/kg/hr` },
          { label: 'Inputs', value: `${volume} mL / ${weight} kg / ${hours} h` },
        ],
        recommendations: [
          'Volume losses (vomiting, diarrhea, drains) should be replaced — children dehydrate quickly due to low blood volume.',
          'Oliguria thresholds: ~1 mL/kg/hr in children; ~2 mL/kg/hr in infants/neonates (KDIGO <0.5 mL/kg/hr defines pediatric AKI).',
        ],
      };
    },
    evidence: {
      summary:
        'Utility calculation: volume ÷ weight = mL/kg; volume ÷ weight ÷ hours = mL/kg/hr. Minimum acceptable pediatric urine output is typically quoted as ~1 mL/kg/hr (higher in neonates/infants); KDIGO uses <0.5 mL/kg/hr for pediatric AKI.',
      formula: 'mL/kg/hr = volume (mL) ÷ weight (kg) ÷ time (h)',
      validation:
        'Standard pediatric fluid-balance practice; see AAP maintenance IV fluid guideline for the surrounding fluid-management framework.',
      references: [
        {
          title: 'Clinical Practice Guideline: Maintenance Intravenous Fluids in Children',
          citation: 'Feld LG et al. Pediatrics. 2018;142(6):e20183083',
          year: 2018,
          doi: '10.1542/peds.2018-3083',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rate <1 mL/kg/hr', actions: ['Assess hydration status and perfusion', 'Check for ongoing losses and renal function', 'Consider volume repletion or fluid restriction per context'] },
      { condition: 'Rate ≥1 mL/kg/hr', actions: ['Continue monitoring', 'Replace ongoing losses'] },
    ],
    pearls: [
      'Always normalize pediatric outputs to weight — absolute volumes are meaningless across ages.',
      'Neonates and infants are expected to produce more urine per kg than older children.',
    ],
  },

  // ─── 9. Pediatric Trauma BIG Score ────────────────────────────────────────
  {
    id: 'big-score',
    name: 'Pediatric Trauma BIG Score',
    shortName: 'BIG',
    description:
      'Admission severity score for injured children combining base deficit, INR, and GCS to predict in-hospital mortality.',
    category: 'pediatrics',
    tags: ['trauma', 'big score', 'base deficit', 'inr', 'gcs', 'mortality', 'borgman'],
    whenToUse:
      'Children <18 years on admission after blunt or penetrating trauma (including blast injury), using admission labs. Not applicable when chronic disease independently alters INR, base deficit, or GCS.',
    whyUse:
      'BIG ≥16 identifies children with markedly elevated mortality risk (AUC ~0.9–0.97); it is rapid, uses only three admission values, and outperforms PTS for mortality prediction.',
    inputs: [
      numberInput('baseDeficit', 'Base deficit', { unit: 'mmol/L', min: -5, max: 40, step: 0.1, exampleValue: 6, helpText: 'Admission base deficit (positive number = deficit). If the lab reports base excess, use its absolute value when negative (e.g., BE −6 → BD 6).' }),
      numberInput('inr', 'INR', { min: 0.8, max: 10, step: 0.01, exampleValue: 1.1, helpText: 'Admission international normalized ratio.' }),
      numberInput('gcs', 'Glasgow Coma Scale', { unit: 'points', min: 3, max: 15, exampleValue: 14, helpText: 'Admission GCS (3–15); use the pre-intubation score if available.' }),
    ],
    calculate(values) {
      const bd = num(values.baseDeficit, 0);
      const inr = num(values.inr, 1);
      const gcs = num(values.gcs, 15);
      const big = round(bd + 2.5 * inr + (15 - gcs), 1);
      const x = 0.2 * big - 5.208;
      const mort = round((1 / (1 + Math.exp(-x))) * 100, 1);
      const high = big >= 16;
      return {
        score: big,
        label: high ? 'High mortality risk (BIG ≥16)' : 'Lower mortality risk (BIG <16)',
        interpretation: high
          ? `BIG ${big} → estimated in-hospital mortality ~${mort}% (logistic model). BIG ≥16 corresponds to ~38% mortality vs <1% below 16 in the blunt-trauma validation; escalate trauma care.`
          : `BIG ${big} → estimated in-hospital mortality ~${mort}%. BIG <16 (~<1% mortality in validation) identifies a high probability of survival, though injured children still need full trauma evaluation.`,
        riskLevel: high ? 'critical' : big >= 12 ? 'high' : 'low',
        details: [
          { label: 'Base deficit contribution', value: String(round(bd, 1)) },
          { label: 'INR contribution', value: String(round(2.5 * inr, 1)) },
          { label: 'GCS contribution (15 − GCS)', value: String(15 - gcs) },
          { label: 'Predicted mortality', value: `~${mort}%` },
        ],
        recommendations: [
          'BIG ≥16 → highest-level trauma activation, ICU admission, and aggressive resuscitation.',
          'BIG <16 still requires full trauma evaluation — the score does not clear patients of injury.',
        ],
      };
    },
    evidence: {
      summary:
        'BIG = base deficit + 2.5×INR + (15 − GCS). Predicted mortality = 1/(1+e^−x), x = 0.2×BIG − 5.208. Cutoff ≥16: sensitivity ~0.94, specificity ~0.94 for mortality; >26 ≈ >50% mortality.',
      formula: 'BD + 2.5×INR + (15 − GCS)',
      validation:
        'Derived by Borgman/Spinella in a US military pediatric cohort and validated in the German Trauma Registry (AUC 0.89); externally validated in North American blunt trauma (AUC 0.95, optimal cutoff 16; <16 → 0.6% mortality, ≥16 → 38%) and in a 29,204-patient multicenter analysis (AUC 0.97).',
      references: [
        {
          title: 'Pediatric trauma BIG score: predicting mortality in children after military and civilian trauma',
          citation: 'Borgman MA et al. Pediatrics. 2011;127(4):e892-e897',
          year: 2011,
          pmid: '21422095',
          doi: '10.1542/peds.2010-2439',
        },
        {
          title: 'The BIG Score and prediction of mortality in pediatric blunt trauma',
          citation: 'Davis AL et al. J Pediatr. 2015;167(2):487-492',
          year: 2015,
          pmid: '26118931',
          doi: '10.1016/j.jpeds.2015.05.041',
        },
      ],
    },
    nextSteps: [
      { condition: 'BIG ≥16', actions: ['Level-1 pediatric trauma care', 'Blood product resuscitation / MTP as indicated', 'ICU admission'] },
      { condition: 'BIG <16', actions: ['Standard trauma workup', 'Serial reassessment — scores can evolve'] },
    ],
    pearls: [
      'Requires admission labs — it cannot be computed in the field.',
      'GCS term uses 15 − GCS; a GCS of 3 adds 12 points, the maximum neurologic contribution.',
    ],
  },

  // ─── 10. Pediatric Trauma Score ───────────────────────────────────────────
  {
    id: 'pediatric-trauma-score',
    name: 'Pediatric Trauma Score (PTS)',
    shortName: 'PTS',
    description:
      'Six-domain triage score (weight, airway, SBP, CNS, skeletal, cutaneous) stratifying injury severity in children; score ≤8 flags elevated mortality risk.',
    category: 'pediatrics',
    tags: ['trauma', 'pts', 'triage', 'tepas', 'injury severity'],
    whenToUse:
      'Field or ED triage of injured children <18 years; useful where lab/imaging data are unavailable. Poorly validated in isolated blunt abdominal trauma.',
    whyUse:
      'PTS ≤8 correlates with markedly increased mortality and need for pediatric trauma-center care; it is rapid and requires no laboratory data.',
    inputs: [
      selectInput('weight', 'Weight', [
        { label: '>20 kg (>44 lbs)', value: 2, points: 2 },
        { label: '10–20 kg (22–44 lbs)', value: 1, points: 1 },
        { label: '<10 kg (<22 lbs)', value: -1, points: -1 },
      ], 2, 'Small children score worse at the same injury severity.'),
      selectInput('airway', 'Airway status', [
        { label: 'Normal', value: 2, points: 2 },
        { label: 'Maintainable (e.g., with adjuncts/positioning)', value: 1, points: 1 },
        { label: 'Unmaintainable', value: -1, points: -1 },
      ], 2, 'Airway patency at assessment.'),
      selectInput('sbp', 'Systolic blood pressure', [
        { label: '>90 mmHg (or pulse palpable at wrist)', value: 2, points: 2 },
        { label: '50–90 mmHg (or pulse palpable at groin)', value: 1, points: 1 },
        { label: '<50 mmHg (or no pulse palpable)', value: -1, points: -1 },
      ], 2, 'If no properly sized cuff is available, estimate from palpable pulses.'),
      selectInput('cns', 'Central nervous system', [
        { label: 'Awake', value: 2, points: 2 },
        { label: 'Obtunded / loss of consciousness', value: 1, points: 1 },
        { label: 'Coma / decerebrate', value: -1, points: -1 },
      ], 2, 'Level of consciousness.'),
      selectInput('skeletal', 'Skeletal injury', [
        { label: 'None', value: 2, points: 2 },
        { label: 'Closed fracture', value: 1, points: 1 },
        { label: 'Open or multiple fractures', value: -1, points: -1 },
      ], 2, 'Extent of skeletal injury.'),
      selectInput('cutaneous', 'Cutaneous wounds', [
        { label: 'None', value: 2, points: 2 },
        { label: 'Minor', value: 1, points: 1 },
        { label: 'Major or penetrating', value: -1, points: -1 },
      ], 2, 'Extent of soft-tissue injury.'),
    ],
    calculate(values) {
      const score =
        num(values.weight) + num(values.airway) + num(values.sbp) +
        num(values.cns) + num(values.skeletal) + num(values.cutaneous);
      const high = score <= 8;
      return {
        score,
        unit: 'points',
        label: high ? 'High severity (PTS ≤8)' : 'Lower severity (PTS >8)',
        interpretation: high
          ? `PTS ${score} (range −6 to +12): score ≤8 is associated with substantially increased mortality — triage to a pediatric trauma center and anticipate intensive management.`
          : `PTS ${score}: above the ≤8 threshold associated with higher mortality; continued monitoring and complete trauma evaluation are still required.`,
        riskLevel: high ? 'critical' : 'low',
        details: [
          { label: 'Weight / airway / SBP', value: `${num(values.weight)} / ${num(values.airway)} / ${num(values.sbp)}` },
          { label: 'CNS / skeletal / cutaneous', value: `${num(values.cns)} / ${num(values.skeletal)} / ${num(values.cutaneous)}` },
        ],
        recommendations: [
          'PTS ≤8 → pediatric trauma center transport or immediate resuscitation.',
          'Reassess serially — PTS is dynamic and may deteriorate.',
        ],
      };
    },
    evidence: {
      summary:
        'PTS sums six domains scored +2/+1/−1: weight, airway, systolic BP, CNS status, skeletal injury, and cutaneous wounds (range −6 to +12). PTS ≤8 indicates severe injury and elevated mortality.',
      formula: 'Weight + airway + SBP + CNS + skeletal + cutaneous (each +2/+1/−1)',
      validation:
        'Developed by Tepas et al. (J Pediatr Surg 1987) in pediatric trauma patients; scores ≤8 predicted ~100% of mortality in the original series. Subsequently validated as a triage tool, though BIG outperforms it for mortality when labs exist.',
      references: [
        {
          title: 'The pediatric trauma score as a predictor of injury severity in the injured child',
          citation: 'Tepas JJ 3rd et al. J Pediatr Surg. 1987;22(1):14-18',
          year: 1987,
        },
      ],
    },
    nextSteps: [
      { condition: 'PTS ≤8', actions: ['Pediatric trauma center', 'Resuscitation and full trauma survey', 'Serial reassessment'] },
      { condition: 'PTS >8', actions: ['Complete secondary survey', 'Monitoring for evolution of injuries'] },
    ],
    pearls: [
      'No labs needed — designed for field triage.',
      'Each domain can only add +2, +1, or −1 (never 0), so the minimum score is −6.',
    ],
  },

  // ─── 11. BRUE criteria ────────────────────────────────────────────────────
  {
    id: 'brue-criteria',
    name: 'BRUE Criteria for Infants (AAP 2016)',
    shortName: 'BRUE',
    description:
      'Classifies a brief resolved unexplained event in an infant <1 year and determines lower- vs higher-risk status per the 2016 AAP guideline.',
    category: 'pediatrics',
    tags: ['brue', 'alte', 'infant', 'aap', 'apnea', 'tieder'],
    status: 'superseded',
    supersededBy: 'brue-2',
    whenToUse:
      'Infants <1 year presenting after a sudden, brief, now-resolved event with color, breathing, tone, or responsiveness change, who are asymptomatic at evaluation with no explanation after history and exam.',
    whyUse:
      'Distinguishes lower-risk infants — for whom the AAP recommends minimal testing and no routine admission — from higher-risk infants needing individualized evaluation.',
    inputs: [
      yesNo('under1', 'Infant <1 year old', null, 'BRUE applies only to infants younger than 1 year.', true),
      yesNo('asymptomatic', 'Asymptomatic on presentation (back to baseline)', null, 'No fever, URI symptoms, respiratory distress, or ill appearance at evaluation.', true),
      yesNo('unexplained', 'No explanation for the event after history and physical', null, 'Events explained by choking, GER, feeding difficulties, etc. are not BRUEs.', true),
      yesNo('event', 'Sudden, brief, now-resolved episode with ≥1 of: cyanosis/pallor, absent/decreased/irregular breathing, marked tone change, altered responsiveness', null, 'At least one of the four qualifying event features must have occurred.', true),
      yesNo('age60', 'Age >60 days', null, 'Lower-risk criterion: infants >60 days old.', false),
      yesNo('ga', 'Born ≥32 weeks gestation AND corrected gestational age ≥45 weeks', null, 'Both must be true: gestational age at birth ≥32 weeks and corrected gestational age ≥45 weeks.', true),
      yesNo('noCpr', 'No CPR performed by a trained medical provider', null, 'CPR by a trained medical provider removes the infant from the lower-risk group; caregiver CPR attempts do not.', true),
      yesNo('under1min', 'Event lasted <1 minute', null, 'Event duration <1 minute (typically estimated by the caregiver).', true),
      yesNo('firstEvent', 'First event (no prior similar event)', null, 'Any previous BRUE moves the infant to higher risk.', true),
    ],
    calculate(values) {
      const entry =
        bool(values.under1) && bool(values.asymptomatic) && bool(values.unexplained) && bool(values.event);
      if (!entry) {
        return {
          score: 'Not a BRUE',
          label: 'Does not meet BRUE definition',
          interpretation:
            'Entry criteria are not all satisfied — this event does not qualify as a BRUE (symptomatic infant, explainable event, age ≥1 year, or no qualifying event feature). Evaluate the actual presentation.',
          riskLevel: 'info',
          details: [
            { label: '<1 year', value: bool(values.under1) ? 'Yes' : 'No' },
            { label: 'Asymptomatic now', value: bool(values.asymptomatic) ? 'Yes' : 'No' },
            { label: 'Unexplained', value: bool(values.unexplained) ? 'Yes' : 'No' },
            { label: 'Qualifying event', value: bool(values.event) ? 'Yes' : 'No' },
          ],
        };
      }
      const lower =
        bool(values.age60) && bool(values.ga) && bool(values.noCpr) &&
        bool(values.under1min) && bool(values.firstEvent);
      return {
        score: lower ? 'Lower-risk BRUE' : 'Higher-risk BRUE',
        label: lower ? 'Lower-risk BRUE' : 'Higher-risk BRUE',
        interpretation: lower
          ? 'Meets the BRUE definition AND all five lower-risk criteria. Per AAP 2016: clinicians should avoid routine testing (CBC, cultures, CSF, imaging, EEG, echo, metabolic panels), need not admit solely for cardiorespiratory monitoring, and should use shared decision-making.'
          : 'Meets the BRUE definition but fails ≥1 lower-risk criterion — the AAP guideline makes no mandatory recommendations; individualize evaluation and consider a brief observation period, tailored testing, and admission.',
        riskLevel: lower ? 'low' : 'moderate',
        details: [
          { label: 'Age >60 days', value: bool(values.age60) ? 'Yes' : 'No' },
          { label: 'GA ≥32 wk & corrected ≥45 wk', value: bool(values.ga) ? 'Yes' : 'No' },
          { label: 'No CPR by trained provider', value: bool(values.noCpr) ? 'Yes' : 'No' },
          { label: 'Event <1 min', value: bool(values.under1min) ? 'Yes' : 'No' },
          { label: 'First event', value: bool(values.firstEvent) ? 'Yes' : 'No' },
        ],
        recommendations: lower
          ? [
              'Avoid routine labs, imaging, EEG, echo, and admission solely for monitoring',
              'Educate caregivers; offer CPR training resources',
              'Assess social risk factors for child abuse',
              'Shared decision-making for disposition',
            ]
          : [
              'Individualized evaluation guided by history/exam',
              'Consider 1–4 h observation and tailored testing',
              'Screen for abuse and neglect',
            ],
      };
    },
    evidence: {
      summary:
        'BRUE = event in infant <1 y that is brief (<1 min), resolved, unexplained after H&P, and includes ≥1 of cyanosis/pallor, abnormal breathing, marked tone change, or altered responsiveness. Lower-risk requires ALL of: age >60 d, GA ≥32 wk and corrected ≥45 wk, no CPR by trained provider, <1 min, first event.',
      formula: 'BRUE definition (4 entry criteria) + 5 lower-risk criteria',
      validation:
        'AAP clinical practice guideline (Tieder et al., Pediatrics 2016) based on systematic review; replaced ALTE terminology. Later studies found the higher-risk criteria poorly specific (~91% classified higher risk, ~4% serious diagnosis) — see BRUE 2.0.',
      references: [
        {
          title: 'Brief Resolved Unexplained Events (Formerly Apparent Life-Threatening Events) and Evaluation of Lower-Risk Infants',
          citation: 'Tieder JS et al. Pediatrics. 2016;137(5):e20160590',
          year: 2016,
          doi: '10.1542/peds.2016-0590',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower-risk BRUE', actions: ['Minimal/no testing', 'Caregiver education + CPR resources', 'Close follow-up; shared decision-making'] },
      { condition: 'Higher-risk BRUE', actions: ['Individualized workup', 'Consider observation/admission', 'Social assessment for abuse'] },
      { condition: 'Not a BRUE', actions: ['Evaluate the identified cause or active symptoms'] },
    ],
    pearls: [
      'BRUE is a diagnosis of exclusion — a well-appearing infant can still have had a non-BRUE event with an identifiable cause.',
      'Always screen for non-accidental trauma; BRUE presentations can mask abuse.',
    ],
  },

  // ─── 12. BRUE 2.0 ─────────────────────────────────────────────────────────
  {
    id: 'brue-2',
    name: 'BRUE 2.0 Criteria for Infants',
    shortName: 'BRUE 2.0',
    description:
      'Risk-prediction model (Nama/Hall/Tieder) estimating the probability of a serious underlying diagnosis and of event recurrence after a BRUE.',
    category: 'pediatrics',
    tags: ['brue', 'brue 2.0', 'alte', 'infant', 'risk prediction', 'nama', 'tieder'],
    whenToUse:
      'Infants <1 year who meet BRUE criteria — asymptomatic at evaluation, event brief/resolved/unexplained — when quantifying risk to support shared decision-making about testing and admission.',
    whyUse:
      'The AAP higher-risk criteria misclassify ~90% of infants as higher risk while only ~4% have a serious diagnosis; the BRUE 2.0 logistic models give individualized risk percentages with better discrimination.',
    inputs: [
      numberInput('ageDays', 'Age', { unit: 'days', min: 0, max: 364, exampleValue: 30, helpText: 'Chronologic age in days at presentation (must be <1 year).' }),
      yesNo('similarEvent', 'History of a similar event', null, 'Prior event similar to the presenting BRUE.', false),
      yesNo('clusters', 'History of multiple events or event clusters', null, 'Multiple events during the index visit or clustered episodes.', false),
      yesNo('abnormalHx', 'Abnormal medical history', null, 'E.g., prior NICU admission, hospitalization, congenital heart disease, infection requiring antibiotics, tube feeding, or failure to thrive.', false),
      yesNo('premature', 'Prematurity (<32 weeks, or 32–38 weeks with corrected age <45 weeks)', null, 'AAP-defined prematurity criterion.', false),
      yesNo('cyanosis', 'Event included cyanosis or pallor', null, 'Color change during the event.', true),
      yesNo('breathing', 'Event included absent, decreased, or irregular breathing', null, 'Respiratory pattern change during the event.', true),
      yesNo('tone', 'Event included marked change in tone (hyper- or hypotonia)', null, 'Tone change during the event.', false),
    ],
    calculate(values) {
      const ageDays = num(values.ageDays, 30);
      const similar = bool(values.similarEvent) ? 1 : 0;
      const clusters = bool(values.clusters) ? 1 : 0;
      const abnormal = bool(values.abnormalHx) ? 1 : 0;
      const prem = bool(values.premature) ? 1 : 0;
      const cyan = bool(values.cyanosis) ? 1 : 0;
      const breath = bool(values.breathing) ? 1 : 0;
      const tone = bool(values.tone) ? 1 : 0;
      const x = -2.9 - 0.0046 * ageDays + 1.22 * similar + 0.35 * abnormal;
      const w =
        -2.82 + 0.65 * similar + 0.98 * clusters + 0.28 * prem + 0.36 * cyan + 0.16 * breath + 0.23 * tone;
      const pSerious = round(100 / (1 + Math.exp(-x)), 1);
      const pRecur = round(100 / (1 + Math.exp(-w)), 1);
      const highSerious = pSerious >= 10;
      return {
        score: `${pSerious}% serious dx / ${pRecur}% recurrence`,
        label: highSerious ? 'Elevated serious-diagnosis risk' : 'Lower serious-diagnosis risk',
        interpretation:
          `Estimated ~${pSerious}% probability of a serious underlying diagnosis and ~${pRecur}% probability of a recurrent event (BRUE 2.0 logistic models, Nama et al.). ` +
          'There are no validated risk cutoffs — use the percentages for shared decision-making about testing and admission.',
        riskLevel: highSerious ? 'moderate' : 'low',
        details: [
          { label: 'Serious underlying diagnosis risk', value: `~${pSerious}%` },
          { label: 'Event recurrence risk', value: `~${pRecur}%` },
          { label: 'Serious-dx logit', value: `−2.9 − 0.0046×${ageDays} + 1.22×${similar} + 0.35×${abnormal}` },
          { label: 'Recurrence logit', value: `−2.82 + 0.65×${similar} + 0.98×${clusters} + 0.28×${prem} + 0.36×${cyan} + 0.16×${breath} + 0.23×${tone}` },
        ],
        recommendations: [
          'Brief monitoring period (1–4 h) with serial exams is reasonable for most infants.',
          'Tailor testing to history/exam; consider viral panel and pertussis testing in high-risk groups.',
          'Psychosocial assessment / child-abuse screening; CPR resources for caregivers.',
          'Ensure close pediatric follow-up.',
        ],
      };
    },
    evidence: {
      summary:
        'Two logistic models (Nama et al., Hosp Pediatr 2022): serious underlying diagnosis = logistic(−2.9 − 0.0046×age_days + 1.22×similar-event + 0.35×abnormal-medical-history); recurrence = logistic(−2.82 + 0.65×similar-event + 0.98×clusters + 0.28×prematurity + 0.36×cyanosis/pallor + 0.16×abnormal-breathing + 0.23×tone-change).',
      formula: 'Logistic regression on 8 clinical predictors (two outcome models)',
      validation:
        'Derived in a 3283-infant multicenter cohort (AUC 0.64 serious dx, higher for recurrence) and externally validated in 1042 Canadian infants (AUC 0.60 original, 0.71 after model revision), outperforming the AAP higher-risk criteria (AUC ~0.53).',
      references: [
        {
          title: 'Risk Prediction After a Brief Resolved Unexplained Event',
          citation: 'Nama N et al. Hosp Pediatr. 2022;12(9):772-785',
          year: 2022,
          doi: '10.1542/hpeds.2022-006637',
        },
        {
          title: 'External Validation of Brief Resolved Unexplained Events Prediction Rules for Serious Underlying Diagnosis',
          citation: 'Nama N et al. JAMA Pediatr. 2025;179(2):188-196',
          year: 2025,
        },
      ],
    },
    nextSteps: [
      { condition: 'Low estimated risks', actions: ['Shared decision-making re: discharge vs observation', 'CPR resources, follow-up'] },
      { condition: 'Higher estimated risks or worrisome features', actions: ['Consider admission/observation', 'Targeted testing', 'Specialty consultation as indicated'] },
    ],
    pearls: [
      'Paradoxically, in the derivation cohort infants >60 days were slightly MORE likely to have a serious diagnosis — the model uses age in days continuously.',
      'No evidence-based risk cutoffs exist for admission decisions; use the outputs to frame shared decision-making.',
    ],
  },

  // ─── 13. HEADS-ED ─────────────────────────────────────────────────────────
  {
    id: 'heads-ed',
    name: 'HEADS-ED',
    shortName: 'HEADS-ED',
    description:
      'Seven-domain action-oriented mental-health screening tool for pediatric ED patients; total ≥8 or suicidality = 2 prompts mental-health referral.',
    category: 'pediatrics',
    tags: ['heads-ed', 'mental health', 'suicide', 'psychiatry', 'screening', 'cappelli'],
    whenToUse:
      'Children and adolescents presenting to the ED with mental-health concerns, to structure the psychosocial assessment and guide consultation/disposition.',
    whyUse:
      'HEADS-ED predicts psychiatric consultation and admission (AUC ~0.82) and provides a shared action language between ED and crisis teams.',
    inputs: [
      selectInput('home', 'Home', [
        { label: 'Supportive', value: 0, points: 0 },
        { label: 'Conflicts', value: 1, points: 1 },
        { label: 'Chaotic/dysfunctional', value: 2, points: 2 },
      ], 0, 'How does the family get along?'),
      selectInput('education', 'Education / employment', [
        { label: 'On track', value: 0, points: 0 },
        { label: 'Grades dropping or absenteeism', value: 1, points: 1 },
        { label: 'Failing / not attending', value: 2, points: 2 },
      ], 0, 'School attendance, grades, or work function.'),
      selectInput('activities', 'Activities & peers', [
        { label: 'No change', value: 0, points: 0 },
        { label: 'Reduction in activities / increased peer conflicts', value: 1, points: 1 },
        { label: 'Increasingly to fully withdrawn / significant peer conflicts', value: 2, points: 2 },
      ], 0, 'Relationships and engagement with peers and activities.'),
      selectInput('drugs', 'Drugs & alcohol', [
        { label: 'None or infrequent', value: 0, points: 0 },
        { label: 'Occasional', value: 1, points: 1 },
        { label: 'Frequent/daily', value: 2, points: 2 },
      ], 0, 'Substance use frequency.'),
      selectInput('suicidality', 'Suicidality', [
        { label: 'No thoughts', value: 0, points: 0 },
        { label: 'Ideation', value: 1, points: 1 },
        { label: 'Plan or gesture', value: 2, points: 2 },
      ], 0, 'Thoughts of self-harm — a score of 2 alone triggers referral.'),
      selectInput('emotions', 'Emotions, behaviors, thought disturbance', [
        { label: 'Mildly anxious/sad/acting out', value: 0, points: 0 },
        { label: 'Moderately anxious/sad/acting out', value: 1, points: 1 },
        { label: 'Significantly distressed, unable to function, out of control, bizarre thoughts, or marked functional change', value: 2, points: 2 },
      ], 0, 'Current emotional and behavioral state.'),
      selectInput('discharge', 'Discharge / current resources', [
        { label: 'Ongoing / well connected', value: 0, points: 0 },
        { label: 'Some / not meeting needs', value: 1, points: 1 },
        { label: 'None / on waitlist / noncompliant', value: 2, points: 2 },
      ], 0, 'Existing supports and community resources.'),
    ],
    calculate(values) {
      const items: [string, string][] = [
        ['home', 'Home'], ['education', 'Education/employment'], ['activities', 'Activities & peers'],
        ['drugs', 'Drugs & alcohol'], ['suicidality', 'Suicidality'], ['emotions', 'Emotions/behaviors'],
        ['discharge', 'Discharge resources'],
      ];
      const score = items.reduce((s, [k]) => s + num(values[k]), 0);
      const sui = num(values.suicidality);
      const refer = score >= 8 || sui === 2;
      const perItem = items.map(([k, l]) => ({
        label: l,
        value: `${num(values[k])} — ${num(values[k]) === 0 ? 'no action' : num(values[k]) === 1 ? 'non-urgent action + community resources' : 'immediate action/referral'}`,
      }));
      return {
        score,
        unit: '/14',
        label: refer ? 'Mental-health referral recommended' : 'Below referral threshold',
        interpretation: refer
          ? `HEADS-ED ${score}/14${sui === 2 ? ' with suicidality = 2 (plan/gesture)' : ''}: meets the ≥8 and/or suicidality=2 criterion — specialized mental-health assessment is recommended.`
          : `HEADS-ED ${score}/14: below the ≥8 threshold and suicidality <2 — address any item scoring 2 individually and ensure safety netting.`,
        riskLevel: sui === 2 ? 'critical' : refer ? 'high' : score >= 4 ? 'moderate' : 'low',
        details: perItem,
        recommendations: [
          'Item score 2 → immediate action/referral for that domain regardless of total.',
          'Suicidality = 2 → mental-health assessment before discharge.',
          'Provide safety planning and crisis resources for any discharge.',
        ],
      };
    },
    evidence: {
      summary:
        'HEADS-ED scores seven domains (Home, Education/employment, Activities/peers, Drugs/alcohol, Suicidality, Emotions/behaviors, Discharge resources) 0–2 each (total 0–14). Item 0 = no action, 1 = non-urgent action, 2 = immediate action; total ≥8 or suicidality 2 → mental-health referral.',
      formula: 'Sum of 7 items, each 0–2 (range 0–14)',
      validation:
        'Developed by Cappelli et al. (Pediatrics 2012; AUC 0.82 for psychiatric consult/admission, sensitivity 82%, specificity 87%, interrater 0.79). Effectiveness study (Pediatr Emerg Care 2017): score ≥8 + suicidality 2 → 164% increased risk of psychiatry consult request; higher mean scores in admitted patients.',
      references: [
        {
          title: 'The HEADS-ED: a rapid mental health screening tool for pediatric patients in the emergency department',
          citation: 'Cappelli M et al. Pediatrics. 2012;130(2):e321-e327',
          year: 2012,
          doi: '10.1542/peds.2011-3798',
        },
        {
          title: 'The HEADS-ED: evaluating the clinical use of a brief, action-oriented, pediatric mental health screening tool',
          citation: 'Cappelli M et al. Pediatr Emerg Care. 2017;33(7):451-457',
          year: 2017,
          pmid: '28538605',
          doi: '10.1097/pec.0000000000001180',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥8 or suicidality 2', actions: ['Psychiatry/crisis consultation', 'Safety assessment before any discharge'] },
      { condition: 'Any item scored 2', actions: ['Domain-specific immediate referral/action'] },
      { condition: 'Score <8, suicidality <2', actions: ['Community resource education', 'Outpatient follow-up', 'Return precautions'] },
    ],
    pearls: [
      'The suicidality item alone can trigger referral — never let a high total mask it.',
      'HEADS-ED is a screening/triage aid, not a diagnostic interview.',
    ],
  },

  // ─── 14. DHAKA Score ──────────────────────────────────────────────────────
  {
    id: 'dhaka-score',
    name: 'DHAKA Score (Dehydration: Assessing Kids Accurately)',
    shortName: 'DHAKA',
    description:
      'Four-sign dehydration severity score for children <5 years with acute diarrhea in resource-limited settings.',
    category: 'pediatrics',
    tags: ['dehydration', 'dhaka', 'diarrhea', 'gastroenteritis', 'ors', 'levine'],
    whenToUse:
      'Children <5 years with acute diarrhea in resource-limited settings to classify dehydration as none, some, or severe. For ≥5 years (including adults) use NIRUDAK.',
    whyUse:
      'Empirically derived and externally validated — more accurate and reliable than the WHO/IMCI algorithm for grading dehydration severity.',
    inputs: [
      selectInput('appearance', 'General appearance', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Restless/irritable', value: 2, points: 2 },
        { label: 'Lethargic/unconscious', value: 4, points: 4 },
      ], 0, 'Mental status and activity.'),
      selectInput('respirations', 'Respirations', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Deep', value: 2, points: 2 },
      ], 0, 'Deep breathing (acidotic pattern).'),
      selectInput('skinPinch', 'Skin pinch', [
        { label: 'Normal (returns immediately)', value: 0, points: 0 },
        { label: 'Slow', value: 2, points: 2 },
        { label: 'Very slow', value: 4, points: 4 },
      ], 0, 'Skin turgor after abdominal/forearm pinch.'),
      selectInput('tears', 'Tears', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Decreased', value: 1, points: 1 },
        { label: 'Absent', value: 2, points: 2 },
      ], 0, 'Tear production when crying.'),
    ],
    calculate(values) {
      const score = num(values.appearance) + num(values.respirations) + num(values.skinPinch) + num(values.tears);
      let riskLevel: 'normal' | 'moderate' | 'critical' = 'normal';
      let label = '';
      let interpretation = '';
      if (score >= 4) {
        riskLevel = 'critical';
        label = 'Severe dehydration (≥4)';
        interpretation = `DHAKA ${score}: severe dehydration — initiate IV rehydration immediately and hospitalize if resources allow; monitor for electrolyte abnormalities and worsening.`;
      } else if (score >= 2) {
        riskLevel = 'moderate';
        label = 'Some dehydration (2–3)';
        interpretation = `DHAKA ${score}: some dehydration — supervised oral rehydration therapy and short-term observation in a healthcare setting.`;
      } else {
        riskLevel = 'normal';
        label = 'No dehydration (0–1)';
        interpretation = `DHAKA ${score}: no significant dehydration — encourage fluids and normal diet, educate on warning signs.`;
      }
      return {
        score,
        unit: '/12',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Appearance', value: String(num(values.appearance)) },
          { label: 'Respirations', value: String(num(values.respirations)) },
          { label: 'Skin pinch', value: String(num(values.skinPinch)) },
          { label: 'Tears', value: String(num(values.tears)) },
        ],
        recommendations: [
          'Flags (shock, altered mental status) warrant urgent intervention regardless of score.',
          'Continue feeding/breastfeeding during rehydration.',
        ],
      };
    },
    evidence: {
      summary:
        'DHAKA score: appearance (normal 0, restless/irritable 2, lethargic/unconscious 4) + respirations (normal 0, deep 2) + skin pinch (normal 0, slow 2, very slow 4) + tears (normal 0, decreased 1, absent 2). Bands: 0–1 none, 2–3 some, ≥4 severe.',
      formula: 'Appearance (0/2/4) + respirations (0/2) + skin pinch (0/2/4) + tears (0/1/2)',
      validation:
        'Derived by ordinal logistic regression in a prospective Dhaka, Bangladesh cohort (Levine et al., Glob Health Sci Pract 2015; AUC 0.79). External validation (Lancet Glob Health 2016; Acad Emerg Med 2017): each point ↑ ~0.6% dehydration; AUC 0.84 for any dehydration vs 0.62 for WHO algorithm; sensitivity 86%/specificity 54% for severe.',
      references: [
        {
          title: 'Empirically derived dehydration scoring and decision tree models for children with diarrhea: assessment and internal validation in a prospective cohort study in Dhaka, Bangladesh',
          citation: 'Levine AC et al. Glob Health Sci Pract. 2015;3(3):405-418',
          year: 2015,
          doi: '10.9745/GHSP-D-15-00097',
        },
        {
          title: 'External validation of the DHAKA score and comparison with the current IMCI algorithm for the assessment of dehydration in children with diarrhoea: a prospective cohort study',
          citation: 'Levine AC et al. Lancet Glob Health. 2016;4(10):e744-e751',
          year: 2016,
          doi: '10.1016/S2214-109X(16)30150-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–1', actions: ['Encourage fluids and diet', 'Educate on warning signs'] },
      { condition: 'Score 2–3', actions: ['Oral rehydration therapy', 'Short observation', 'Reassess'] },
      { condition: 'Score ≥4', actions: ['IV rehydration', 'Hospitalize if possible', 'Monitor electrolytes'] },
    ],
    pearls: [
      'Validated specifically in low-resource settings with cholera and non-cholera diarrhea.',
      'Each additional point ≈ 0.6% more dehydration by post-rehydration weight change.',
    ],
  },

  // ─── 15. NIRUDAK Score ────────────────────────────────────────────────────
  {
    id: 'nirudak-score',
    name: 'NIRUDAK Score (Dehydration in Patients ≥5 Years)',
    shortName: 'NIRUDAK',
    description:
      'Simplified paper-based dehydration severity score for patients ≥5 years (including adults) with acute diarrhea in resource-limited settings.',
    category: 'general',
    tags: ['dehydration', 'nirudak', 'diarrhea', 'gastroenteritis', 'ors', 'cholera'],
    whenToUse:
      'Patients ≥5 years (children, adults, elderly) with acute diarrhea in resource-limited settings. For children <5 years use the DHAKA score.',
    whyUse:
      'First empirically derived dehydration score for older children and adults — the WHO/IMCI algorithm was validated only in children <5.',
    inputs: [
      selectInput('skinPinch', 'Skin pinch', [
        { label: 'Rapid', value: 0, points: 0 },
        { label: 'Slow', value: 2, points: 2 },
        { label: 'Very slow', value: 4, points: 4 },
      ], 0, 'Skin turgor.'),
      selectInput('eyeLevel', 'Eye level', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Sunken', value: 2, points: 2 },
      ], 0, 'Sunken eyes.'),
      selectInput('respDepth', 'Respiration depth', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Deep', value: 2, points: 2 },
      ], 0, 'Deep (acidotic) breathing.'),
      selectInput('urine', 'Urine output', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Decreased or dark', value: 1, points: 1 },
        { label: 'Minimal or none', value: 2, points: 2 },
      ], 0, 'Reported urine output.'),
      selectInput('pulse', 'Radial pulse', [
        { label: 'Strong', value: 0, points: 0 },
        { label: 'Decreased', value: 1, points: 1 },
        { label: 'Absent', value: 4, points: 4 },
      ], 0, 'Radial pulse strength.'),
    ],
    calculate(values) {
      const score =
        num(values.skinPinch) + num(values.eyeLevel) + num(values.respDepth) +
        num(values.urine) + num(values.pulse);
      let riskLevel: 'normal' | 'moderate' | 'critical' = 'normal';
      let label = '';
      let interpretation = '';
      if (score >= 7) {
        riskLevel = 'critical';
        label = 'Severe dehydration (≥7)';
        interpretation = `NIRUDAK ${score}: severe dehydration — initiate IV rehydration immediately and hospitalize if resources allow.`;
      } else if (score >= 4) {
        riskLevel = 'moderate';
        label = 'Some dehydration (4–6)';
        interpretation = `NIRUDAK ${score}: some dehydration — oral rehydration solution with short-term observation.`;
      } else {
        riskLevel = 'normal';
        label = 'No dehydration (0–3)';
        interpretation = `NIRUDAK ${score}: no significant dehydration — encourage fluids and normal diet, educate on warning signs.`;
      }
      return {
        score,
        unit: '/14',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Skin pinch', value: String(num(values.skinPinch)) },
          { label: 'Eye level', value: String(num(values.eyeLevel)) },
          { label: 'Respiration depth', value: String(num(values.respDepth)) },
          { label: 'Urine output', value: String(num(values.urine)) },
          { label: 'Radial pulse', value: String(num(values.pulse)) },
        ],
        recommendations: [
          'Signs of shock or altered mental status warrant urgent intervention regardless of score.',
          'Severe dehydration → IV fluids (e.g., cholera/Ringer regimen) then transition to ORS.',
        ],
      };
    },
    evidence: {
      summary:
        'Simplified NIRUDAK paper score: skin pinch (rapid 0, slow 2, very slow 4) + eye level (normal 0, sunken 2) + respiration depth (normal 0, deep 2) + urine output (normal 0, decreased/dark 1, minimal/none 2) + radial pulse (strong 0, decreased 1, absent 4). Bands: 0–3 none, 4–6 some, ≥7 severe.',
      formula: 'Skin pinch + eye level + respiration depth + urine output + radial pulse',
      validation:
        'Derived from a 2172-patient prospective Dhaka cohort (PLOS NTD 2021 full/simplified models; AJTMH 2021 paper score — original 13-point version included age, sex, and vomiting episodes; AUC 0.76, ICC 0.88). The simplified 5-item paper score implemented here is used in the NIRUDAK mHealth/CDST tools; externally validated against the WHO algorithm in a subsequent prospective cohort.',
      references: [
        {
          title: 'Derivation of the first clinical diagnostic models for dehydration severity in patients over five years with acute diarrhea',
          citation: 'Levine AC, Glavis-Bloom J et al. PLoS Negl Trop Dis. 2021;15(2):e0009266',
          year: 2021,
          doi: '10.1371/journal.pntd.0009266',
        },
        {
          title: 'Derivation and internal validation of a score to predict dehydration severity in patients over 5 years with acute diarrhea',
          citation: 'Levine AC et al. Am J Trop Med Hyg. 2021;105(4):1063-1070',
          year: 2021,
          doi: '10.4269/ajtmh.21-0143',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–3', actions: ['Encourage fluids and diet', 'Educate on warning signs'] },
      { condition: 'Score 4–6', actions: ['Oral rehydration solution', 'Short observation', 'Reassess'] },
      { condition: 'Score ≥7', actions: ['IV rehydration', 'Hospitalize if possible', 'Monitor electrolytes'] },
    ],
    pearls: [
      'An absent radial pulse is the single heaviest-weighted sign (+4).',
      'The original 13-point NIRUDAK score additionally uses age, sex, and vomiting episodes — this is the simplified paper version.',
    ],
  },

  // ─── 16. Eat, Sleep, Console ──────────────────────────────────────────────
  {
    id: 'eat-sleep-console',
    name: 'Eat, Sleep, Console (ESC) for Neonatal Abstinence Syndrome',
    shortName: 'ESC',
    description:
      'Function-based assessment of opioid-exposed newborns: eating, sleeping, and consolability determine whether nonpharmacologic care suffices or medication is needed.',
    category: 'pediatrics',
    tags: ['esc', 'eat sleep console', 'nas', 'nows', 'opioid withdrawal', 'finnegan', 'grossman'],
    whenToUse:
      'Opioid-exposed newborns (typically ≥36 weeks gestation) being managed for neonatal abstinence/opioid withdrawal syndrome, instead of or alongside Finnegan scoring.',
    whyUse:
      'The ESC approach markedly reduces morphine treatment and length of stay versus Finnegan-based management, without increased adverse events (confirmed in the 26-hospital ESC-NOW cluster-randomized trial).',
    inputs: [
      yesNo('eat', 'Can the infant eat ≥1 oz per feed or breastfeed well?', null, 'Function-based feeding assessment — adequate intake for age.', true),
      yesNo('sleep', 'Can the infant sleep ≥1 hour undisturbed?', null, 'At least one hour of undisturbed sleep.', true),
      yesNo('console', 'Can the infant be consoled within 10 minutes (if crying)?', null, 'Consolable within 10 minutes using routine comforting measures.', true),
    ],
    calculate(values) {
      const eat = bool(values.eat);
      const sleep = bool(values.sleep);
      const con = bool(values.console);
      const managed = eat && sleep && con;
      return {
        score: managed ? 'Well managed' : 'Not well managed',
        label: managed ? 'Well managed — no escalation' : 'Not well managed — escalate care',
        interpretation: managed
          ? 'All three functional criteria are met — the infant is well managed; continue current nonpharmacologic care without additional intervention.'
          : 'One or more functional criteria are not met — maximize nonpharmacologic interventions (on-demand feeding, swaddling/holding, low-stimulation environment, parental presence). If still not well managed, consider starting or increasing morphine (e.g., 0.05 mg/kg/dose q3h, or +0.01 mg/kg/dose escalation) per institutional protocol.',
        riskLevel: managed ? 'low' : 'moderate',
        details: [
          { label: 'Eat ≥1 oz/feed or breastfeeds well', value: eat ? 'Yes' : 'No' },
          { label: 'Sleeps ≥1 h', value: sleep ? 'Yes' : 'No' },
          { label: 'Consoles within 10 min', value: con ? 'Yes' : 'No' },
        ],
        recommendations: managed
          ? ['Continue current care', 'Assess at each care interval']
          : [
              'Augment nonpharmacologic care first',
              'Consider NICU consult if available',
              'Morphine per protocol if function remains impaired',
            ],
      };
    },
    evidence: {
      summary:
        'ESC assesses three functions: eats ≥1 oz/feed or breastfeeds well, sleeps ≥1 h undisturbed, consolable within 10 min. Any "no" → escalate nonpharmacologic care first, then consider morphine; all "yes" → well managed.',
      formula: '3-item functional checklist (no numeric score)',
      validation:
        'Introduced by Grossman et al. (Hosp Pediatr 2017): morphine initiation 12% vs predicted 60% by Finnegan. The ESC-NOW cluster-randomized trial across 26 US hospitals (NEJM 2023) confirmed shorter time to discharge-readiness without excess adverse events.',
      references: [
        {
          title: 'A novel approach to assessing infants with neonatal abstinence syndrome',
          citation: 'Grossman MR et al. Hosp Pediatr. 2017;7(1):1-6',
          year: 2017,
          doi: '10.1542/hpeds.2016-0128',
        },
        {
          title: 'Eat, Sleep, Console approach or usual care for neonatal opioid withdrawal',
          citation: 'Young LW et al. N Engl J Med. 2023;388(25):2326-2336',
          year: 2023,
          doi: '10.1056/NEJMoa2214470',
        },
      ],
    },
    nextSteps: [
      { condition: 'Well managed', actions: ['Continue nonpharmacologic bundle', 'Routine reassessment'] },
      { condition: 'Not well managed', actions: ['Maximize nonpharm interventions', 'Morphine per protocol if persistent', 'NICU consult if available'] },
    ],
    pearls: [
      'ESC measures function, not symptom counts — a yawning, sneezing baby who eats and sleeps is well managed.',
      'Rooming-in and parental presence are core components of the model.',
    ],
  },

  // ─── 17. WAT-1 ────────────────────────────────────────────────────────────
  {
    id: 'wat-1',
    name: 'Withdrawal Assessment Tool-1 (WAT-1)',
    shortName: 'WAT-1',
    description:
      'Eleven-item (12-point) bedside tool monitoring iatrogenic opioid and benzodiazepine withdrawal in children weaning from ≥5 days of analgesia/sedation.',
    category: 'pediatrics',
    tags: ['wat-1', 'withdrawal', 'opioid', 'benzodiazepine', 'picu', 'sedation', 'franck'],
    whenToUse:
      'Children weaning from ≥5 days of continuous or round-the-clock opioids and/or benzodiazepines; score from the first day of weaning and continue twice daily until 72 h after the last dose.',
    whyUse:
      'WAT-1 ≥3 identifies clinically important withdrawal (sensitivity ~0.87, specificity ~0.88 vs nurse NRS), standardizing monitoring and guiding weaning and rescue dosing.',
    inputs: [
      yesNo('stools', 'Any loose or watery stools (previous 12 h)', 1, 'Review the last 12 hours.', false),
      yesNo('vomiting', 'Any vomiting, retching, or gagging (previous 12 h)', 1, 'Review the last 12 hours.', false),
      yesNo('fever', 'Temperature >100.0°F (37.8°C) (previous 12 h)', 1, 'Maximum recorded temperature in the last 12 hours.', false),
      yesNo('sbs', 'SBS ≥1 or awake and distressed (2-min observation before stimulus)', 1, 'During the 2-minute pre-stimulus observation: State Behavioral Scale ≥1, or awake and distressed.', false),
      yesNo('tremor', 'Tremor — moderate to severe', 1, 'Pre-stimulus tremor graded moderate–severe.', false),
      yesNo('sweating', 'Any sweating', 1, 'Visible sweating during pre-stimulus observation.', false),
      yesNo('movement', 'Uncoordinated and/or repetitive movement — moderate to severe', 1, 'E.g., repetitive cycling or thrashing graded moderate–severe.', false),
      yesNo('yawn', 'Yawning or sneezing ≥2 times', 1, 'Two or more yawns/sneezes during observation.', false),
      yesNo('startle', 'Startle to touch — moderate to severe', 1, 'Response during the 1-minute progressive stimulus.', false),
      yesNo('tone', 'Muscle tone increased', 1, 'Increased tone during stimulus handling.', false),
      selectInput('calm', 'Time to gain calm state (SBS ≤0) post-stimulus', [
        { label: '<2 minutes', value: 0, points: 0 },
        { label: '2–5 minutes', value: 1, points: 1 },
        { label: '>5 minutes', value: 2, points: 2 },
      ], 0, 'Recovery time after the progressive stimulus ends.'),
    ],
    calculate(values) {
      const score =
        (bool(values.stools) ? 1 : 0) + (bool(values.vomiting) ? 1 : 0) + (bool(values.fever) ? 1 : 0) +
        (bool(values.sbs) ? 1 : 0) + (bool(values.tremor) ? 1 : 0) + (bool(values.sweating) ? 1 : 0) +
        (bool(values.movement) ? 1 : 0) + (bool(values.yawn) ? 1 : 0) + (bool(values.startle) ? 1 : 0) +
        (bool(values.tone) ? 1 : 0) + num(values.calm);
      const high = score >= 3;
      return {
        score,
        unit: '/12',
        label: high ? 'Significant withdrawal (WAT-1 ≥3)' : 'Below significant-withdrawal threshold',
        interpretation: high
          ? `WAT-1 ${score}/12: suggests clinically important iatrogenic withdrawal — consider slowing the wean, adding withdrawal-preventing medication (e.g., methadone or lorazepam), or rescue dosing per protocol.`
          : `WAT-1 ${score}/12: below the ≥3 threshold associated with clinically important withdrawal — continue current weaning plan and twice-daily monitoring.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: '12-h review items', value: `${(bool(values.stools) ? 1 : 0) + (bool(values.vomiting) ? 1 : 0) + (bool(values.fever) ? 1 : 0)}/3` },
          { label: 'Pre-stimulus items', value: `${(bool(values.sbs) ? 1 : 0) + (bool(values.tremor) ? 1 : 0) + (bool(values.sweating) ? 1 : 0) + (bool(values.movement) ? 1 : 0) + (bool(values.yawn) ? 1 : 0)}/5` },
          { label: 'Stimulus/recovery items', value: `${(bool(values.startle) ? 1 : 0) + (bool(values.tone) ? 1 : 0) + num(values.calm)}/4` },
        ],
        recommendations: [
          'Trend scores — an uptrend may precede overt withdrawal.',
          'Reassess frequently for over-sedation when adding withdrawal-preventing agents.',
        ],
      };
    },
    evidence: {
      summary:
        'WAT-1: 3 items from the prior 12 h (loose stools, vomiting/retching/gagging, T >37.8°C), 5 pre-stimulus items (SBS ≥1/distressed, tremor mod–severe, sweating, uncoordinated/repetitive movement mod–severe, yawning/sneezing ≥2), 2 stimulus items (startle mod–severe, increased tone), and post-stimulus recovery (<2 min 0, 2–5 min 1, >5 min 2). Total 0–12; ≥3 = clinically important withdrawal.',
      formula: 'Sum of 11 items (range 0–12)',
      validation:
        'Developed by Franck et al. (Pediatr Crit Care Med 2008): sensitivity 0.87/specificity 0.88 for NRS >4; generalized in a 21-center cohort (Pain 2012) — WAT-1 ≥3 associated with greater cumulative opioid exposure and longer weaning.',
      references: [
        {
          title: 'The Withdrawal Assessment Tool-1 (WAT-1): an assessment instrument for monitoring opioid and benzodiazepine withdrawal symptoms in pediatric patients',
          citation: 'Franck LS et al. Pediatr Crit Care Med. 2008;9(6):573-580',
          year: 2008,
          doi: '10.1097/PCC.0b013e31818c8328',
        },
        {
          title: 'Validity and generalizability of the Withdrawal Assessment Tool-1 (WAT-1) for monitoring iatrogenic withdrawal syndrome in pediatric patients',
          citation: 'Franck LS et al. Pain. 2012;153(1):142-148',
          year: 2012,
          doi: '10.1016/j.pain.2011.10.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'WAT-1 ≥3', actions: ['Slow or pause the wean', 'Consider methadone/lorazepam or rescue dosing', 'Reassess within hours'] },
      { condition: 'WAT-1 <3', actions: ['Continue wean per protocol', 'Twice-daily scoring until 72 h post-last dose'] },
    ],
    pearls: [
      'Score with the State Behavioral Scale — its stimulus sequence standardizes the observation.',
      'Oversedation can follow withdrawal treatment; monitor respiratory status when escalating.',
    ],
  },

  // ─── 18. CAPD ─────────────────────────────────────────────────────────────
  {
    id: 'capd',
    name: 'Cornell Assessment of Pediatric Delirium (CAPD)',
    shortName: 'CAPD',
    description:
      'Eight-item observational screening for delirium in hospitalized children of all ages; total ≥9 is a positive screen.',
    category: 'pediatrics',
    tags: ['capd', 'delirium', 'picu', 'traube', 'rass', 'encephalopathy'],
    whenToUse:
      'PICU/hospitalized children for routine delirium screening. Do not use when RASS ≤ −4 (deep sedation/unarousable). Use developmental anchor points for infants and developmentally delayed children.',
    whyUse:
      'CAPD ≥9 detects delirium with ~94% sensitivity and ~79% specificity versus psychiatric DSM diagnosis — pediatric delirium is common (~20–25% of PICU patients) and frequently missed.',
    inputs: [
      selectInput('anchorAge', 'Developmental reference age (for anchor points; does not score)', [
        { label: 'Newborn', value: 'newborn' },
        { label: '4 weeks', value: '4w' },
        { label: '6 weeks', value: '6w' },
        { label: '8 weeks', value: '8w' },
        { label: '28 weeks', value: '28w' },
        { label: '1 year', value: '1y' },
        { label: '2 years or older', value: '2y' },
      ], '1y', 'Select the closest developmental age to apply the CAPD developmental anchor points when judging expected behavior.'),
      selectInput('eyeContact', '1. Does the child make eye contact with the caregiver?', [
        { label: 'Never', value: 4, points: 4 },
        { label: 'Rarely', value: 3, points: 3 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 1, points: 1 },
        { label: 'Always', value: 0, points: 0 },
      ], 1, 'Reverse-scored item — less engagement scores higher.'),
      selectInput('purposeful', '2. Are the child\'s actions purposeful?', [
        { label: 'Never', value: 4, points: 4 },
        { label: 'Rarely', value: 3, points: 3 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 1, points: 1 },
        { label: 'Always', value: 0, points: 0 },
      ], 1, 'Reverse-scored item.'),
      selectInput('aware', '3. Is the child aware of his/her surroundings?', [
        { label: 'Never', value: 4, points: 4 },
        { label: 'Rarely', value: 3, points: 3 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 1, points: 1 },
        { label: 'Always', value: 0, points: 0 },
      ], 1, 'Reverse-scored item.'),
      selectInput('communicate', '4. Does the child communicate needs and wants?', [
        { label: 'Never', value: 4, points: 4 },
        { label: 'Rarely', value: 3, points: 3 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 1, points: 1 },
        { label: 'Always', value: 0, points: 0 },
      ], 1, 'Reverse-scored item.'),
      selectInput('restless', '5. Is the child restless?', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Rarely', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
        { label: 'Always', value: 4, points: 4 },
      ], 0, 'Forward-scored item — more restlessness scores higher.'),
      selectInput('inconsolable', '6. Is the child inconsolable?', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Rarely', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
        { label: 'Always', value: 4, points: 4 },
      ], 0, 'Forward-scored item.'),
      selectInput('underactive', '7. Is the child underactive — very little movement while awake?', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Rarely', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
        { label: 'Always', value: 4, points: 4 },
      ], 0, 'Forward-scored item; captures hypoactive delirium.'),
      selectInput('slowRespond', '8. Does it take the child a long time to respond to interactions?', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Rarely', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
        { label: 'Always', value: 4, points: 4 },
      ], 0, 'Forward-scored item.'),
    ],
    calculate(values) {
      const score =
        num(values.eyeContact) + num(values.purposeful) + num(values.aware) + num(values.communicate) +
        num(values.restless) + num(values.inconsolable) + num(values.underactive) + num(values.slowRespond);
      const positive = score >= 9;
      return {
        score,
        unit: '/32',
        label: positive ? 'Positive delirium screen (CAPD ≥9)' : 'Negative delirium screen',
        interpretation: positive
          ? `CAPD ${score}/32 ≥9: positive screen — sensitivity ~94% for DSM delirium. Evaluate for reversible contributors (medications, sleep disruption, hypoxia, metabolic), enhance orientation/environmental measures, and consider child-psychiatry or developmental consultation.`
          : `CAPD ${score}/32 <9: negative screen — continue routine periodic screening, especially in developmentally delayed children (lower specificity) and after clinical change.`,
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'Engagement items (1–4)', value: String(num(values.eyeContact) + num(values.purposeful) + num(values.aware) + num(values.communicate)) },
          { label: 'Behavior items (5–8)', value: String(num(values.restless) + num(values.inconsolable) + num(values.underactive) + num(values.slowRespond)) },
        ],
        recommendations: [
          'Positive screen → search for causes (sedatives, anticholinergics, infection, hypoxia) and escalate nonpharmacologic measures.',
          'Severe/refractory delirium threatening safety may require pharmacologic treatment.',
          'Maintain day/night cycles, minimize nighttime disruptions, reorient with familiar objects/routines.',
        ],
      };
    },
    evidence: {
      summary:
        'CAPD: 8 items scored on frequency — items 1–4 (eye contact, purposeful actions, awareness, communication) reverse-scored (never 4 … always 0); items 5–8 (restless, inconsolable, underactive, slow response) forward-scored (never 0 … always 4). Total 0–32; ≥9 positive.',
      formula: 'Sum of 8 items (range 0–32); cut point ≥9',
      validation:
        'Validated by Traube et al. (Crit Care Med 2014) against blinded psychiatric DSM diagnosis: sensitivity 94.1%, specificity 79.2%, κ 0.94, <2 min to complete. Developmental anchor points (Silver 2015) support scoring in infants; specificity is lower in developmental delay (51%) while sensitivity stays high (96%).',
      references: [
        {
          title: 'Cornell Assessment of Pediatric Delirium: a valid, rapid, observational tool for screening delirium in the PICU',
          citation: 'Traube C et al. Crit Care Med. 2014;42(3):656-663',
          year: 2014,
          pmid: '24145848',
          doi: '10.1097/CCM.0b013e3182a66b76',
        },
        {
          title: 'Delirium screening anchored in child development: the Cornell Assessment for Pediatric Delirium',
          citation: 'Silver G et al. Palliat Support Care. 2015;13(4):1005-1011',
          year: 2015,
        },
      ],
    },
    nextSteps: [
      { condition: 'CAPD ≥9', actions: ['Treat reversible contributors', 'Environmental/behavioral bundle', 'Child psychiatry or child-life consult'] },
      { condition: 'CAPD <9', actions: ['Continue scheduled screening', 'Prevention bundle (sleep, orientation, mobilization)'] },
    ],
    pearls: [
      'Hypoactive delirium (items 7–8) is the most common pediatric subtype and the easiest to miss.',
      'Items 1–4 are reverse-scored — "Never" scores 4, "Always" scores 0.',
      'Do not screen during deep sedation (RASS ≤ −4).',
    ],
  },

  // ─── 19. Palchak rule ─────────────────────────────────────────────────────
  {
    id: 'palchak-head-rule',
    name: 'Palchak (UC Davis) Rule for Pediatric Head Trauma',
    shortName: 'Palchak',
    description:
      'Five-predictor rule identifying children at low risk for traumatic brain injury after blunt head trauma who may safely avoid CT.',
    category: 'pediatrics',
    tags: ['head trauma', 'palchak', 'uc davis', 'ct', 'tbi', 'kuppermann'],
    whenToUse:
      'Children with blunt head trauma being considered for head CT. PECARN is more widely validated and generally preferred; Palchak is an alternative.',
    whyUse:
      'Absence of all five predictors identified 100% of children without TBI requiring acute intervention in the derivation cohort (only 0.3% had any TBI on CT).',
    inputs: [
      yesNo('ams', 'Abnormal mental status', null, 'E.g., GCS <15, agitation, somnolence, slow responses, repetitive questioning.', false),
      yesNo('fracture', 'Clinical signs of skull fracture', null, 'Palpable fracture, hemotympanum, raccoon eyes, Battle sign, or CSF leak.', false),
      yesNo('vomiting', 'History of vomiting', null, 'Any vomiting since the injury.', false),
      yesNo('hematoma', 'Scalp hematoma (child ≤2 years)', null, 'Scores positive only in children ≤2 years old with a scalp hematoma.', false),
      yesNo('headache', 'Headache', null, 'Complaint of headache in a verbal child.', false),
    ],
    calculate(values) {
      const positives = [
        bool(values.ams) && 'Abnormal mental status',
        bool(values.fracture) && 'Signs of skull fracture',
        bool(values.vomiting) && 'Vomiting',
        bool(values.hematoma) && 'Scalp hematoma (≤2 y)',
        bool(values.headache) && 'Headache',
      ].filter(Boolean) as string[];
      const any = positives.length > 0;
      return {
        score: positives.length,
        unit: 'predictors',
        label: any ? 'Not low risk — consider CT' : 'Low risk — CT likely unnecessary',
        interpretation: any
          ? `${positives.length} predictor(s) present (${positives.join(', ')}): head CT should be strongly considered — these criteria identified 99% of TBI on CT and 100% of TBI requiring acute intervention.`
          : 'No predictors present: very low risk — in the derivation cohort only 0.3% of such children had TBI on CT and none required intervention. Observation is reasonable with caregiver education.',
        riskLevel: any ? 'high' : 'low',
        details: positives.map((p) => ({ label: 'Predictor present', value: p })),
        recommendations: any
          ? ['Strongly consider head CT', 'Clinical observation if imaging deferred']
          : ['Observation', 'Caregiver education and return precautions', 'PECARN rule can provide additional reassurance'],
      };
    },
    evidence: {
      summary:
        'Palchak rule predictors: abnormal mental status, clinical signs of skull fracture, history of vomiting, scalp hematoma (≤2 y), headache. Any predictor → elevated risk; none → very low risk.',
      formula: '5 dichotomous predictors (any positive = not low risk)',
      validation:
        'Derived in 2043 children (Palchak/Kuppermann, Ann Emerg Med 2003): identified 97/98 TBI on CT (99%) and 105/105 TBI requiring acute intervention (100%); 0.3% of predictor-free children had TBI on CT and none needed intervention.',
      references: [
        {
          title: 'A decision rule for identifying children at low risk for brain injuries after blunt head trauma',
          citation: 'Palchak MJ et al. Ann Emerg Med. 2003;42(4):492-506',
          year: 2003,
          pmid: '14520320',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any predictor present', actions: ['Consider CT head', 'Observation period', 'Assess for non-accidental trauma and severe mechanism'] },
      { condition: 'No predictors', actions: ['Observation', 'Discharge with precautions if exam remains normal'] },
    ],
    pearls: [
      'Scalp hematoma counts only in children ≤2 years.',
      'High-risk mechanism or suspected abuse overrides a "low-risk" score.',
      'PECARN remains the most validated pediatric head-injury rule.',
    ],
  },

  // ─── 20. PedSRC rule ──────────────────────────────────────────────────────
  {
    id: 'pedsrc-bat-rule',
    name: 'PedSRC Rule for Pediatric Blunt Abdominal Trauma',
    shortName: 'PedSRC',
    description:
      'Five-variable rule identifying children at very low risk for intra-abdominal injury after blunt abdominal trauma in whom abdominal CT can be avoided.',
    category: 'pediatrics',
    tags: ['abdominal trauma', 'pedsrc', 'ct', 'blunt trauma', 'streck', 'iai'],
    whenToUse:
      'Children <16 years evaluated within ~6 hours of blunt abdominal trauma when all five variables (labs, exam, chest X-ray) are available. For exam-only assessment use the PECARN abdominal rule.',
    whyUse:
      'No abnormality on any of the five variables gives NPV ~99.4% for IAI and ~100% for IAI requiring intervention — safely sparing a large minority of children from CT radiation.',
    inputs: [
      yesNo('ast', 'AST >200 U/L', 1, 'Aspartate aminotransferase above 200 U/L.', false),
      yesNo('abdExam', 'Abdominal wall trauma, distension, or tenderness on exam', 1, 'Seatbelt sign, wall contusion, distension, or tenderness.', false),
      yesNo('cxr', 'Abnormal chest X-ray', 1, 'Any abnormality on chest radiograph (e.g., rib fractures, pneumothorax, hemothorax).', false),
      yesNo('pain', 'Complaint of abdominal pain', 1, 'Patient-reported abdominal pain.', false),
      yesNo('pancreatic', 'Abnormal amylase or lipase', 1, 'Elevated amylase and/or lipase.', false),
    ],
    calculate(values) {
      const positives = [
        bool(values.ast) && 'AST >200',
        bool(values.abdExam) && 'Abnormal abdominal exam',
        bool(values.cxr) && 'Abnormal CXR',
        bool(values.pain) && 'Abdominal pain',
        bool(values.pancreatic) && 'Abnormal amylase/lipase',
      ].filter(Boolean) as string[];
      const veryLow = positives.length === 0;
      return {
        score: positives.length,
        unit: 'variables',
        label: veryLow ? 'Very low risk for IAI' : 'Not very low risk',
        interpretation: veryLow
          ? 'All five variables negative: NPV ~99.4% for intra-abdominal injury and ~100% for IAI requiring acute intervention — abdominal CT can generally be avoided; observe and reassess.'
          : `${positives.length} abnormal variable(s) (${positives.join(', ')}): the child does not meet the very-low-risk rule — imaging decisions should follow clinical suspicion (CT, FAST, or observation per institutional protocol).`,
        riskLevel: veryLow ? 'low' : 'moderate',
        details: positives.map((p) => ({ label: 'Abnormal variable', value: p })),
        recommendations: veryLow
          ? ['Observation without routine abdominal CT', 'Serial abdominal exams', 'Return precautions']
          : ['CT abdomen or FAST per suspicion', 'Trauma/pediatric surgery consultation', 'Serial exams and labs'],
      };
    },
    evidence: {
      summary:
        'PedSRC rule variables (in descending importance): AST >200 U/L, abnormal abdominal exam (wall trauma/distension/tenderness), abnormal chest X-ray, complaint of abdominal pain, abnormal amylase or lipase. All absent → very low risk.',
      formula: '5 dichotomous variables; all negative = very low risk',
      validation:
        'Derived across 14 Level-I pediatric trauma centers in 2188 children (Streck, J Trauma Acute Care Surg 2017): NPV 99.4% for IAI and 100% for IAI-I; 34% of the cohort was very low risk. Externally validated in 2435 PECARN patients (sensitivity 97.5% IAI, 100% IAI-I; NPV 99.3%/100%).',
      references: [
        {
          title: 'Identifying children at very low risk for blunt intra-abdominal injury in whom CT of the abdomen can be avoided safely',
          citation: 'Streck CJ et al. J Trauma Acute Care Surg. 2017;82(3):527-532',
          year: 2017,
          pmid: '28130170',
        },
        {
          title: 'External validation of a five-variable clinical prediction rule for identifying children at very low risk for intra-abdominal injury after blunt abdominal trauma',
          citation: 'Streck CJ et al. J Trauma Acute Care Surg. 2018;85(1):71-76',
          year: 2018,
          doi: '10.1097/TA.0000000000001933',
        },
      ],
    },
    nextSteps: [
      { condition: 'Very low risk (all negative)', actions: ['Observe', 'Serial exams', 'Discharge with precautions if stable'] },
      { condition: 'Any abnormal variable', actions: ['CT or FAST per suspicion', 'Trauma surgery consult', 'Serial labs/exams'] },
    ],
    pearls: [
      'Each pediatric abdominal CT carries an estimated ~0.14% lifetime radiation-induced fatal cancer risk — avoidance matters.',
      'Requires labs and a chest X-ray — for history/exam-only triage use the PECARN IAI rule.',
    ],
  },

  // ─── 21. PEDOCS ───────────────────────────────────────────────────────────
  {
    id: 'pedocs',
    name: 'PEDOCS Score for Pediatric ED Overcrowding',
    shortName: 'PEDOCS',
    description:
      'Objective pediatric emergency department crowding score from total registered patients and waiting-room census.',
    category: 'emergency',
    tags: ['pedocs', 'overcrowding', 'emergency department', 'nedocs', 'weiss', 'operations'],
    whenToUse:
      'Point-in-time assessment of pediatric ED crowding, e.g., each shift or during patient surges, to trigger surge plans.',
    whyUse:
      'Two simple census counts correlate better with expert-rated crowding in pediatric EDs (r = 0.80) than the 5-variable NEDOCS.',
    inputs: [
      numberInput('total', 'Total patients registered', { unit: 'patients', min: 0, max: 300, exampleValue: 40, helpText: 'All patients currently registered — in the ED and the waiting room.' }),
      numberInput('waiting', 'Patients in waiting room', { unit: 'patients', min: 0, max: 200, exampleValue: 8, helpText: 'Registered patients who have not yet been roomed.' }),
    ],
    calculate(values) {
      const total = num(values.total, 0);
      const waiting = Math.min(num(values.waiting, 0), total);
      const score = round(33.3 * (0.11 + 0.07 * waiting + 0.04 * total), 1);
      let label = '';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      if (score > 200) { label = 'Dangerously overcrowded'; riskLevel = 'critical'; }
      else if (score > 180) { label = 'Severely/dangerously crowded'; riskLevel = 'critical'; }
      else if (score > 140) { label = 'Severely overcrowded'; riskLevel = 'high'; }
      else if (score > 100) { label = 'Overcrowded'; riskLevel = 'high'; }
      else if (score > 60) { label = 'Extremely busy'; riskLevel = 'moderate'; }
      else if (score > 20) { label = 'Busy'; riskLevel = 'low'; }
      else { label = 'Not busy'; riskLevel = 'normal'; }
      return {
        score,
        label,
        interpretation: `PEDOCS ${score} → "${label}". Perform crowding assessments each shift and during influxes; escalate per institutional surge plan.`,
        riskLevel,
        details: [
          { label: 'Total registered', value: String(total) },
          { label: 'Waiting room', value: String(waiting) },
          { label: 'Formula', value: '33.3 × (0.11 + 0.07×waiting + 0.04×total)' },
        ],
        recommendations: [
          'Above local threshold → activate surge/escalation plan.',
          'Repeat assessment each shift and during influxes.',
        ],
      };
    },
    evidence: {
      summary:
        'PEDOCS = 33.3 × (0.11 + 0.07×[waiting-room patients] + 0.04×[total registered patients]). Levels: 1–20 not busy, 21–60 busy, 61–100 extremely busy, 101–140 overcrowded, 141–180 severely overcrowded, 181–200 dangerously overcrowded (>200 extreme).',
      formula: '33.3 × (0.11 + 0.07W + 0.04T)',
      validation:
        'Derived by Weiss et al. (Pediatr Emerg Care 2007) — the 2-variable model correlated with expert consensus crowding (r = 0.80), outperforming NEDOCS (r = 0.68). A bed-capacity correction (mPEDOCS) has since been proposed for smaller PEDs.',
      references: [
        {
          title: 'Development of a novel measure of overcrowding in a pediatric emergency department',
          citation: 'Weiss SJ et al. Pediatr Emerg Care. 2007;23(9):641-645',
          year: 2007,
          doi: '10.1097/PEC.0b013e31814a69e2',
        },
        {
          title: 'Development and implementation of the modified Pediatric Emergency Department Overcrowding Scale in two large academic pediatric centers',
          citation: 'Timm N et al. J Emerg Nurs. 2026;52(1):72-80',
          year: 2026,
          doi: '10.1016/j.jen.2025.08.008',
        },
      ],
    },
    nextSteps: [
      { condition: 'PEDOCS >100', actions: ['Notify charge/house supervisor', 'Consider surge plan activation', 'Reassess staffing and flow'] },
      { condition: 'PEDOCS ≤100', actions: ['Routine monitoring', 'Repeat next shift'] },
    ],
    pearls: [
      'Only two inputs needed — no ventilator or hospital-census data required.',
      'Original thresholds assume a ~28–40-bed PED; small departments may under-report crowding (see mPEDOCS).',
    ],
  },

  // ─── 22. Flamm VBAC score ─────────────────────────────────────────────────
  {
    id: 'vbac-flamm',
    name: 'VBAC Risk Score for Successful Vaginal Delivery (Flamm Model)',
    shortName: 'Flamm VBAC',
    description:
      'Ten-point admission scoring system predicting vaginal birth after cesarean success from age, obstetric history, prior cesarean indication, and admission cervical exam.',
    category: 'obstetrics',
    tags: ['vbac', 'tolac', 'flamm', 'cesarean', 'admission', 'labor'],
    whenToUse:
      'Patients admitted in labor for a trial of labor after cesarean (TOLAC) — the score uses admission-time cervical findings, unlike the antenatal Grobman/MFMU models.',
    whyUse:
      'Score correlates linearly with VBAC success — ~49% at 0–2 points to ~95% at 8–10 points — supporting bedside counseling when labor begins.',
    inputs: [
      yesNo('age', 'Maternal age <40 years', 2, 'Age under 40 adds 2 points.', true),
      selectInput('vaginalHx', 'Vaginal birth history', [
        { label: 'Vaginal birth before AND after the first cesarean', value: 4, points: 4 },
        { label: 'Vaginal birth after the first cesarean (prior VBAC)', value: 2, points: 2 },
        { label: 'Vaginal birth before the cesarean only', value: 1, points: 1 },
        { label: 'No previous vaginal birth', value: 0, points: 0 },
      ], 0, 'Timing of any prior vaginal delivery relative to the cesarean.'),
      yesNo('otherReason', 'Reason other than failure to progress for the first cesarean', 1, 'Non-recurring indication (e.g., breech, nonreassuring tracing) adds 1 point.', true),
      selectInput('effacement', 'Cervical effacement at admission', [
        { label: '>75%', value: 2, points: 2 },
        { label: '25–75%', value: 1, points: 1 },
        { label: '<25%', value: 0, points: 0 },
      ], 1, 'Effacement on the admission cervical exam.'),
      yesNo('dilation', 'Cervical dilation ≥4 cm at admission', 1, 'Dilation ≥4 cm on admission adds 1 point.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 2 : 0) + num(values.vaginalHx) + (bool(values.otherReason) ? 1 : 0) +
        num(values.effacement) + (bool(values.dilation) ? 1 : 0);
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';
      if (score >= 8) {
        label = 'High predicted success (8–10)';
        interpretation = `Flamm score ${score}/10: predicted VBAC success ~95% in the derivation study — favorable profile for TOLAC.`;
        riskLevel = 'low';
      } else if (score >= 6) {
        label = 'Good predicted success (6–7)';
        interpretation = `Flamm score ${score}/10: intermediate-high predicted success (~75–85% in most validations) — reasonable TOLAC candidate.`;
        riskLevel = 'moderate';
      } else if (score >= 3) {
        label = 'Intermediate predicted success (3–5)';
        interpretation = `Flamm score ${score}/10: intermediate predicted success (~50–70%) — individualize counseling.`;
        riskLevel = 'moderate';
      } else {
        label = 'Lower predicted success (0–2)';
        interpretation = `Flamm score ${score}/10: predicted success ~49% in the derivation study — a low score does not predict failure, but counsel on emergency cesarean risk.`;
        riskLevel = 'high';
      }
      return {
        score,
        unit: '/10',
        label,
        interpretation: `${interpretation} Requires a TOLAC-capable facility with immediate cesarean availability regardless of score.`,
        riskLevel,
        details: [
          { label: 'Age <40', value: bool(values.age) ? '+2' : '0' },
          { label: 'Vaginal birth history', value: `+${num(values.vaginalHx)}` },
          { label: 'Non-FTP indication', value: bool(values.otherReason) ? '+1' : '0' },
          { label: 'Effacement', value: `+${num(values.effacement)}` },
          { label: 'Dilation ≥4 cm', value: bool(values.dilation) ? '+1' : '0' },
        ],
        recommendations: [
          'Confirm facility capability for emergency cesarean before TOLAC.',
          'Discuss uterine rupture risk (~0.5–1% after low-transverse scar) and document consent.',
        ],
      };
    },
    evidence: {
      summary:
        'Flamm admission score: age <40 +2; vaginal birth before AND after first cesarean +4, after only +2, before only +1; non-failure-to-progress indication +1; effacement >75% +2 (25–75% +1); dilation ≥4 cm +1. Success rises linearly: ~49% at 0–2 to ~95% at 8–10.',
      formula: 'Sum of 5 weighted items (range 0–10)',
      validation:
        'Derived and tested by Flamm & Geiger in 5022 TOLAC patients (Obstet Gynecol 1997): linear score–success relationship, 49% (0–2) to 95% (8–10). Multiple external validations confirm the trend; a low score does not predict failure.',
      references: [
        {
          title: 'Vaginal birth after cesarean delivery: an admission scoring system',
          citation: 'Flamm BL, Geiger AM. Obstet Gynecol. 1997;90(6):907-910',
          year: 1997,
          doi: '10.1016/S0029-7844(97)00531-0',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥6', actions: ['Counsel favorably for TOLAC', 'Standard intrapartum monitoring', 'Emergency cesarean capability on standby'] },
      { condition: 'Score ≤5', actions: ['Individualized counseling', 'Consider repeat cesarean vs TOLAC discussion', 'Augmentation caution'] },
    ],
    pearls: [
      'Admission cervical exam dominates the score — it cannot be computed antenatally.',
      'A low Flamm score does not predict failure — ~half of 0–2 scorers still deliver vaginally.',
    ],
  },

  // ─── 23. VBAC MFMU 2021 (race-free) ──────────────────────────────────────
  {
    id: 'vbac-mfmu-2021',
    name: 'Vaginal Birth After Cesarean (MFMU 2021, Race-Free Model)',
    shortName: 'VBAC MFMU',
    description:
      'Updated NICHD MFMU VBAC prediction model using early-pregnancy variables without race/ethnicity: age, pre-pregnancy weight, height, prior cesarean indication, obstetric history, and treated chronic hypertension.',
    category: 'obstetrics',
    tags: ['vbac', 'tolac', 'mfmu', 'grobman', 'cesarean', 'antenatal', 'race-free'],
    whenToUse:
      'Antenatal counseling of term candidates with one prior low-transverse cesarean considering TOLAC — the current recommended MFMU model, replacing the 2007 version that used race/ethnicity terms.',
    whyUse:
      'Provides a race-neutral individualized VBAC probability from data available at the first prenatal visit; discrimination comparable to the legacy model (AUC ~0.75).',
    inputs: [
      numberInput('age', 'Maternal age', { unit: 'years', min: 15, max: 55, exampleValue: 30, helpText: 'Age in years; the model carries a small negative age coefficient.' }),
      numberInput('weight', 'Pre-pregnancy weight', { unit: 'kg', unitKind: 'weight', min: 35, max: 200, step: 0.1, exampleValue: 70, helpText: 'Pre-pregnancy weight in kg (early-pregnancy weight is used as a proxy in the model).' }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 210, exampleValue: 165, helpText: 'Height in centimeters — taller stature is associated with higher VBAC success.' }),
      yesNo('arrest', 'Arrest disorder as indication for the previous cesarean', null, 'Arrest of dilation/descent (cephalopelvic disproportion-type indication) lowers predicted success.', false),
      selectInput('obHx', 'Obstetric history', [
        { label: 'No previous vaginal delivery', value: 'none' },
        { label: 'Previous vaginal delivery only before the cesarean', value: 'before' },
        { label: 'Previous VBAC (vaginal delivery after the cesarean)', value: 'vbac' },
      ], 'none', 'Prior vaginal birth — especially after the cesarean — is the strongest positive predictor.'),
      yesNo('chtn', 'Treated chronic hypertension', null, 'Chronic hypertension on treatment lowers predicted success.', false),
    ],
    calculate(values) {
      const age = num(values.age, 30);
      const wt = num(values.weight, 70);
      const ht = num(values.height, 165);
      const arrest = bool(values.arrest) ? 1 : 0;
      const ob = str(values.obHx, 'none');
      const before = ob === 'before' ? 1 : 0;
      const vbac = ob === 'vbac' ? 1 : 0;
      const chtn = bool(values.chtn) ? 1 : 0;
      const w =
        -5.952 - 0.023 * age - 0.024 * wt + 0.056 * ht - 0.597 * arrest +
        0.868 * before + 1.869 * vbac - 0.966 * chtn;
      const pct = round(100 / (1 + Math.exp(-w)), 0);
      const riskLevel = pct >= 70 ? 'low' : pct >= 50 ? 'moderate' : 'high';
      return {
        score: pct,
        unit: '%',
        label: pct >= 70 ? 'Higher predicted VBAC success' : pct >= 50 ? 'Intermediate predicted success' : 'Lower predicted success',
        interpretation: `Predicted probability of successful VBAC ≈${pct}% (MFMU 2021 race-free antenatal model). Estimates support, not replace, individualized TOLAC counseling; the admission-time model adds cervical exam, station, and induction data.`,
        riskLevel,
        details: [
          { label: 'Linear predictor (w)', value: String(round(w, 3)) },
          { label: 'Model', value: 'Grobman/MFMU 2021 — no race/ethnicity variables' },
        ],
        recommendations: [
          'Use alongside uterine-rupture counseling (~0.5–1% after low-transverse scar) and facility capability assessment.',
          'At admission, the companion MFMU admission model (adds cervical exam, station, gestational age, labor induction, HDP) refines the estimate.',
        ],
      };
    },
    evidence: {
      summary:
        'MFMU 2021 model: w = −5.952 − 0.023×age − 0.024×(pre-pregnancy weight, kg) + 0.056×(height, cm) − 0.597×(arrest indication) + 0.868×(prior vaginal delivery before cesarean) + 1.869×(prior VBAC) − 0.966×(treated chronic HTN); P = e^w/(1+e^w).',
      formula: 'Logistic model on 6 antenatal predictors; P = e^w/(1+e^w)',
      validation:
        'Derived from 11,687 MFMU Cesarean Registry participants with term TOLAC after one low-transverse cesarean (VBAC rate 74%, AUC ~0.75), with internal cross-validation and subsequent external validation showing discrimination comparable to the prior race-based model. An admission-time companion model (2023/2024) achieves AUC ~0.78.',
      references: [
        {
          title: 'Prediction of vaginal birth after cesarean in term gestations: a calculator without race and ethnicity',
          citation: 'Grobman WA et al. Am J Obstet Gynecol. 2021;225(6):664.e1-664.e7',
          year: 2021,
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8611105/',
        },
        {
          title: 'Prediction of vaginal birth after cesarean using information at admission for delivery: a calculator without race or ethnicity',
          citation: 'Grobman WA et al. Am J Obstet Gynecol. 2024;230(3):342.e1-342.e8',
          year: 2024,
          url: 'https://www.ajog.org/article/S0002-9378(23)00088-1/fulltext',
        },
      ],
    },
    nextSteps: [
      { condition: 'Considering TOLAC', actions: ['Facility capable of emergency cesarean', 'Uterine rupture counseling', 'Document informed consent'] },
      { condition: 'At admission for delivery', actions: ['Re-estimate with the admission model (adds cervical exam, station, induction, HDP)'] },
    ],
    pearls: [
      'This 2021 model deliberately removes race/ethnicity — the prior coefficients produced systematically lower estimates for Black and Hispanic patients without improving accuracy.',
      'Prior VBAC (+1.869) is the strongest favorable predictor; arrest-disorder indication (−0.597) and treated chronic hypertension (−0.966) are adverse.',
    ],
  },

  // ─── 24. EFCT ─────────────────────────────────────────────────────────────
  {
    id: 'efct-egg-freezing',
    name: 'BWH Egg Freezing Counseling Tool (EFCT)',
    shortName: 'EFCT',
    description:
      'Estimates the probability of at least one live birth after elective oocyte cryopreservation from age at retrieval and number of mature eggs frozen.',
    category: 'obstetrics',
    tags: ['egg freezing', 'oocyte cryopreservation', 'fertility preservation', 'efct', 'goldman', 'bwh'],
    whenToUse:
      'Fertility counseling of women aged 24–44 considering elective oocyte cryopreservation, to estimate how many mature eggs are needed for a desired probability of live birth. Not externally validated — use with caution.',
    whyUse:
      'Gives an evidence-based, age-by-year probability of ≥1 live birth per number of mature oocytes frozen, helping set expectations about cycles needed.',
    inputs: [
      numberInput('age', 'Age at egg retrieval', { unit: 'years', min: 24, max: 44, exampleValue: 35, helpText: 'Model is valid for ages 24–44; the probability of a blastocyst being euploid falls steeply after ~38.' }),
      numberInput('eggs', 'Number of mature eggs frozen', { unit: 'eggs', min: 1, max: 100, exampleValue: 10, helpText: 'Total mature (MII) oocytes cryopreserved across planned/completed cycles.' }),
    ],
    calculate(values) {
      const age = num(values.age, 35);
      const eggs = Math.max(num(values.eggs, 10), 0);
      const euploidTable: Record<number, number> = {
        36: 0.564, 37: 0.486, 38: 0.466, 39: 0.44, 40: 0.359, 41: 0.327, 42: 0.285, 43: 0.206, 44: 0.127,
      };
      const pEuploid = age <= 35 ? 0.574 : (euploidTable[Math.min(44, Math.round(age))] ?? 0.127);
      const survival = age < 36 ? 0.95 : 0.85;
      const pBlast = survival * Math.exp(2.8043 - 0.1112 * age);
      const perEgg = 0.6 * pEuploid * pBlast;
      const pct = round((1 - Math.pow(1 - perEgg, eggs)) * 100, 0);
      return {
        score: pct,
        unit: '%',
        label: pct >= 80 ? 'High estimated likelihood' : pct >= 50 ? 'Moderate estimated likelihood' : 'Lower estimated likelihood',
        interpretation: `Estimated ~${pct}% probability of at least one live birth from ${eggs} mature egg(s) frozen at age ${age} (EFCT model: 60% live-birth per euploid blastocyst, ${Math.round(survival * 100)}% thaw survival). Not externally validated — counsel with caution.`,
        riskLevel: pct >= 80 ? 'low' : pct >= 50 ? 'moderate' : 'high',
        details: [
          { label: 'Per-egg live-birth probability', value: `${round(perEgg * 100, 1)}%` },
          { label: 'Assumed euploid rate (age-based)', value: String(pEuploid) },
          { label: 'Oocyte survival assumption', value: `${Math.round(survival * 100)}%` },
        ],
        recommendations: [
          'Decisions should be individualized with the reproductive endocrinologist — model assumes uncompromised ovarian reserve.',
          'Additional cycles may be needed to reach a desired probability; diminishing returns at higher egg counts.',
        ],
      };
    },
    evidence: {
      summary:
        'EFCT: P(≥1 live birth) = 1 − [1 − 0.6 × p(euploid) × p(blast)]^n, where p(blast) = survival × exp(2.8043 − 0.1112×age) with thaw survival 95% (<36 y) or 85% (≥36 y), p(euploid) from an age table (0.574 ≤35 → 0.127 at 44), and 60% live birth per transferred euploid blastocyst.',
      formula: '1 − [1 − 0.6 × pEuploid(age) × survival(age) × e^(2.8043−0.1112·age)]^eggs',
      validation:
        'Model built from 520 ICSI cycles in women with uncompromised ovarian reserve plus ~14,500 PGS euploidy results (Goldman, Hum Reprod 2017). Reproduces published examples (e.g., 10 eggs at 35 → ~69%). Explicitly not externally validated — per the authors, use with caution.',
      references: [
        {
          title: 'Predicting the likelihood of live birth for elective oocyte cryopreservation: a counseling tool for physicians and patients',
          citation: 'Goldman RH et al. Hum Reprod. 2017;32(4):853-859',
          year: 2017,
          doi: '10.1093/humrep/dex008',
        },
      ],
    },
    nextSteps: [
      { condition: 'Counseling elective freezing', actions: ['Discuss ovarian reserve testing (AMH, AFC)', 'Set expectations for cycles needed', 'Review costs and timeline'] },
    ],
    pearls: [
      'Euploidy — not retrieval count — is the main age-dependent driver; probabilities fall sharply after ~38–40.',
      'Example check: 10 eggs at age 35 → ~69% ≥1 live birth; 20 eggs → ~90%; 30 eggs → ~97%.',
    ],
  },
];
