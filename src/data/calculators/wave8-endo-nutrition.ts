import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

const MGDL_PER_MMOL_CHOL = 38.67;

/** DLCN LDL-C points from mmol/L (untreated value preferred). */
function dlcnLdlPoints(mmol: number): number {
  if (mmol >= 8.5) return 8;
  if (mmol >= 6.5) return 5;
  if (mmol >= 5.0) return 3;
  if (mmol >= 4.0) return 1;
  return 0;
}

/** MEDPED total-cholesterol cutoffs (mg/dL) by age band and closest affected relative. */
const MEDPED_CUTOFFS: Record<string, Record<string, number>> = {
  '1st': { '<20': 220, '20-29': 240, '30-39': 270, '>=40': 290 },
  '2nd': { '<20': 230, '20-29': 250, '30-39': 280, '>=40': 300 },
  '3rd': { '<20': 240, '20-29': 260, '30-39': 290, '>=40': 310 },
  'none': { '<20': 270, '20-29': 290, '30-39': 340, '>=40': 360 },
};

/** Wave 8 — endocrinology (lipids, diabetes) and nutrition/perioperative tools. */
export const wave8EndoNutritionCalcs: Calculator[] = [
  // ─── 1. Dutch Lipid Clinic Network (DLCN) criteria for FH ─────────────────
  {
    id: 'dlcn-fh',
    name: 'Dutch Lipid Clinic Network (DLCN) Criteria for Familial Hypercholesterolemia',
    shortName: 'DLCN',
    description:
      'Points-based diagnostic criteria for familial hypercholesterolemia (FH) combining family history, personal history, physical findings, untreated LDL-C, and DNA analysis. Bands: unlikely (<3), possible (3–5), probable (6–8), definite (>8).',
    category: 'endocrinology',
    tags: ['fh', 'familial hypercholesterolemia', 'dlcn', 'dutch', 'ldl', 'cholesterol', 'diagnostic criteria'],
    whenToUse: 'Adults with suspected familial hypercholesterolemia — markedly elevated LDL-C, personal or family history of premature ASCVD, or physical stigmata (tendon xanthomas, arcus cornealis).',
    whyUse:
      'DLCN is the most widely used validated clinical criteria set for FH. Probable/definite scores identify patients for genetic testing, cascade screening of first-degree relatives, and intensive lipid-lowering therapy.',
    inputs: [
      yesNo('entry', 'Elevated cholesterol, family history of FH, and/or family history of premature cardiac death', null, 'Entry criterion: proceed only if the patient has elevated cholesterol, a family history of FH, and/or a family history of premature cardiac death. If none apply, FH assessment by DLCN is not indicated.', true),
      selectInput('familyHx', 'Family history (choose the highest applicable)', [
        { label: 'None of the below', value: 0, points: 0 },
        { label: '1st-degree relative with premature coronary/vascular disease (men <55, women <60) OR known LDL-C >95th percentile', value: 1, points: 1 },
        { label: '1st-degree relative with tendon xanthomas and/or arcus cornealis, OR child <18 years with LDL-C >95th percentile', value: 2, points: 2 },
      ], 0, 'DLCN scores only ONE item per group — take the highest applicable. A first-degree relative is a parent, sibling, or child.'),
      selectInput('clinicalHx', 'Personal history of premature vascular disease (highest applicable)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Premature cerebral or peripheral vascular disease (men <55, women <60)', value: 1, points: 1 },
        { label: 'Premature coronary artery disease (men <55, women <60)', value: 2, points: 2 },
      ], 0, 'Score only one clinical-history item — premature CAD earns 2 points and supersedes the 1-point cerebral/peripheral item.'),
      selectInput('physical', 'Physical examination (highest applicable)', [
        { label: 'Neither', value: 0, points: 0 },
        { label: 'Arcus cornealis before age 45', value: 4, points: 4 },
        { label: 'Tendon xanthomas', value: 6, points: 6 },
      ], 0, 'Score only one physical-exam item. Palpate (not just inspect) the Achilles tendons and finger extensor tendons. If both findings are present, only tendon xanthomas count (6 points).'),
      numberInput('ldl', 'Untreated LDL cholesterol', {
        unit: 'mmol/L',
        unitKind: 'cholesterol',
        min: 1,
        max: 30,
        step: 0.01,
        exampleValue: 6.0,
        helpText: 'Use the untreated (pre-statin) LDL-C when possible. Points: ≥8.5 mmol/L (≥325 mg/dL) = 8; 6.5–8.4 (≈250–325) = 5; 5.0–6.4 (≈190–250) = 3; 4.0–4.9 (≈155–190) = 1; <4.0 = 0.',
      }),
      yesNo('dna', 'Functional mutation in LDLR, APOB, or PCSK9 on DNA analysis', 8, 'A pathogenic variant in LDLR, APOB, or PCSK9 scores 8 points — by itself it does NOT make definite FH; at least one additional criterion must be present for >8 total.', false),
    ],
    calculate(values) {
      if (!bool(values.entry)) {
        return {
          score: '—',
          label: 'Entry criterion not met',
          interpretation:
            'No elevated cholesterol, family history of FH, or family history of premature cardiac death — DLCN assessment is not indicated. Reassess if clinical suspicion changes.',
          riskLevel: 'info',
        };
      }
      const ldl = num(values.ldl, 0);
      const ldlPts = dlcnLdlPoints(ldl);
      const score =
        num(values.familyHx, 0) +
        num(values.clinicalHx, 0) +
        num(values.physical, 0) +
        ldlPts +
        (bool(values.dna) ? 8 : 0);
      const band =
        score > 8
          ? { level: 'high' as const, label: 'Definite FH (>8 points)', note: 'Definite FH — treat as heterozygous FH and offer genetic testing/cascade screening.' }
          : score >= 6
            ? { level: 'high' as const, label: 'Probable FH (6–8 points)', note: 'Probable FH — manage as FH and offer genetic testing/cascade screening.' }
            : score >= 3
              ? { level: 'moderate' as const, label: 'Possible FH (3–5 points)', note: 'Possible FH — consider genetic testing and specialist referral; do not exclude FH clinically.' }
              : { level: 'info' as const, label: 'Unlikely FH (<3 points)', note: 'Unlikely FH by DLCN — a negative score does not fully exclude FH if suspicion is high.' };
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `DLCN ${score} points. ${band.note} Use untreated LDL-C for scoring where possible; measure Lp(a) because elevated Lp(a) can mimic the FH phenotype.`,
        riskLevel: band.level,
        details: [
          { label: 'Family history', value: `${num(values.familyHx, 0)} pt` },
          { label: 'Personal history', value: `${num(values.clinicalHx, 0)} pt` },
          { label: 'Physical examination', value: `${num(values.physical, 0)} pt` },
          { label: 'LDL-C', value: `${ldl} mmol/L → ${ldlPts} pt` },
          { label: 'DNA analysis', value: bool(values.dna) ? '8 pt' : '0 pt' },
        ],
        recommendations: [
          'Exclude secondary causes of hypercholesterolemia (hypothyroidism, nephrotic syndrome, cholestasis) before diagnosing FH',
          'Score ≥3: consider genetic testing; probable/definite FH → screen first-degree relatives (50% will be affected)',
          'Probable/definite FH → high-intensity statin; typical LDL-C goals <70 mg/dL without ASCVD, <55 mg/dL with ASCVD',
        ],
      };
    },
    evidence: {
      summary:
        'DLCN (WHO 1999 consultation report) assigns points across five groups — family history (max 2), personal history (max 2), physical examination (max 6), untreated LDL-C (max 8), and DNA analysis (8). Only the highest item per group counts. Total >8 = definite FH, 6–8 = probable, 3–5 = possible, <3 = unlikely.',
      formula:
        'Family hx 0/1/2 + personal hx 0/1/2 + physical 0/4/6 + LDL-C 0/1/3/5/8 (bands ≥8.5, 6.5, 5.0, 4.0 mmol/L) + DNA mutation 0/8',
      validation:
        'Published in the WHO 1999 FH consultation report; widely adopted (NICE CG71, EAS consensus). LDL-C bands implemented in mmol/L (≥8.5/6.5/5.0/4.0); published mg/dL cutoffs differ slightly between sources (≥325 vs ≥330 mg/dL) — mmol/L thresholds per the criteria table were used. A DNA mutation alone (8 points) requires ≥1 additional criterion for definite FH.',
      references: [
        {
          title: 'Familial hypercholesterolaemia (FH): report of a second WHO consultation',
          citation: 'WHO Human Genetics Programme. WHO/HGN/FH/CONS/99.2. Geneva, 1999',
          year: 1999,
          url: 'https://apps.who.int/iris/handle/10665/66346',
        },
        {
          title: 'Familial hypercholesterolaemia is underdiagnosed and undertreated in the general population: guidance for clinicians to prevent coronary heart disease (EAS consensus)',
          citation: 'Nordestgaard BG et al. Eur Heart J. 2013',
          year: 2013,
          pmid: '23956253',
          doi: '10.1093/eurheartj/eht273',
        },
      ],
    },
    nextSteps: [
      { condition: 'Definite or probable FH (≥6)', actions: ['Offer genetic testing', 'Cascade-screen first-degree relatives', 'High-intensity statin ± ezetimibe ± PCSK9i to LDL-C goal', 'Refer to lipid specialist'] },
      { condition: 'Possible FH (3–5)', actions: ['Repeat fasting lipid panel (untreated)', 'Re-examine for tendon xanthomas', 'Consider genetic testing/lipid clinic referral'] },
      { condition: 'Unlikely FH (<3) but suspicion persists', actions: ['Measure Lp(a)', 'Consider alternative criteria (Simon Broome, MEDPED)', 'Exclude secondary causes'] },
    ],
    pearls: [
      'Score only the HIGHEST item within each group — e.g., tendon xanthomas and arcus do not both count.',
      'Use untreated LDL-C; on-treatment values falsely lower the score.',
      'A pathogenic mutation earns 8 points but definite FH still requires at least one more criterion (>8 total).',
      'Corneal arcus counts only when present before age 45.',
    ],
  },

  // ─── 2. Simon Broome Diagnostic Criteria for FH ────────────────────────────
  {
    id: 'simon-broome-fh',
    name: 'Simon Broome Diagnostic Criteria for Familial Hypercholesterolemia (FH)',
    shortName: 'Simon Broome',
    description:
      'UK Simon Broome Register criteria for definite vs possible FH using cholesterol thresholds, tendon xanthomas, DNA mutation, and family history.',
    category: 'endocrinology',
    tags: ['fh', 'familial hypercholesterolemia', 'simon broome', 'ldl', 'cholesterol', 'xanthoma', 'diagnostic criteria'],
    whenToUse: 'Suspected FH in adults or children when lipid levels, examination findings, DNA results, and family history are available.',
    whyUse:
      'Simple categorical criteria used in UK practice (NICE CG71): definite FH needs cholesterol criteria plus tendon xanthomas (patient or relative) or a causative mutation; possible FH needs cholesterol criteria plus a qualifying family history.',
    inputs: [
      selectInput('ageGroup', 'Patient age', [
        { label: '<16 years', value: 'child' },
        { label: '≥16 years', value: 'adult' },
      ], 'adult', 'Cholesterol thresholds are age-dependent: children <16 use TC >6.7 or LDL >4.0 mmol/L; adults use TC >7.5 or LDL >4.9 mmol/L.'),
      numberInput('tc', 'Total cholesterol', {
        unit: 'mmol/L',
        unitKind: 'cholesterol',
        min: 3,
        max: 30,
        step: 0.01,
        exampleValue: 8.0,
        helpText: 'Untreated value preferred. Cholesterol criteria: adult TC >7.5 mmol/L (≈290 mg/dL); child <16 TC >6.7 mmol/L (≈260 mg/dL).',
      }),
      numberInput('ldl', 'LDL cholesterol', {
        unit: 'mmol/L',
        unitKind: 'cholesterol',
        min: 1,
        max: 25,
        step: 0.01,
        exampleValue: 5.5,
        helpText: 'Untreated value preferred. Cholesterol criteria: adult LDL >4.9 mmol/L (≈190 mg/dL); child <16 LDL >4.0 mmol/L (≈155 mg/dL).',
      }),
      yesNo('xanthomas', 'Tendon xanthomas in patient, 1st-degree, or 2nd-degree relative', null, 'Tendon xanthomas (e.g., Achilles tendon, finger extensors) in the patient or a first- or second-degree relative — combined with cholesterol criteria this makes FH definite.', false),
      yesNo('dna', 'DNA-based evidence of a functional LDLR, PCSK9, or APOB mutation', null, 'A causative mutation is diagnostic of definite FH regardless of the other items.', false),
      yesNo('familyMI', 'Family history of premature MI — <50 y in 2nd-degree relative or <60 y in 1st-degree relative', null, 'MI before age 50 in a second-degree relative, or before age 60 in a first-degree relative — a possible-FH criterion.', false),
      yesNo('familyTC', 'Family history of very high cholesterol — >7.5 mmol/L (290 mg/dL) in adult 1st/2nd-degree relative, or >6.7 (260) in child/sibling <16', null, 'Total cholesterol >290 mg/dL (7.5 mmol/L) in an adult first- or second-degree relative, or >260 mg/dL (6.7 mmol/L) in a child or sibling under 16 — a possible-FH criterion.', false),
    ],
    calculate(values) {
      const child = str(values.ageGroup) === 'child';
      const tc = num(values.tc, 0);
      const ldl = num(values.ldl, 0);
      const cholCriteria = child ? tc > 6.7 || ldl > 4.0 : tc > 7.5 || ldl > 4.9;
      const xanth = bool(values.xanthomas);
      const dna = bool(values.dna);
      const familyMI = bool(values.familyMI);
      const familyTC = bool(values.familyTC);

      if (dna || (cholCriteria && xanth)) {
        return {
          score: 'Definite',
          label: 'Definite FH',
          interpretation: dna
            ? 'Definite FH — a functional LDLR/PCSK9/APOB mutation is diagnostic. Manage as heterozygous FH; cascade-screen relatives.'
            : `Definite FH — cholesterol criteria met (TC ${tc}, LDL ${ldl} mmol/L) plus tendon xanthomas in patient or relative. Manage as FH and cascade-screen first-degree relatives.`,
          riskLevel: 'high',
          details: [
            { label: 'Cholesterol criteria met', value: cholCriteria ? 'Yes' : 'No' },
            { label: 'Tendon xanthomas', value: xanth ? 'Yes' : 'No' },
            { label: 'DNA mutation', value: dna ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Offer genetic testing if not already done',
            'Cascade screening of first-degree relatives using validated LDL-C thresholds',
            'High-intensity statin; consider ezetimibe/PCSK9i to reach LDL-C goals (<70 mg/dL, or <55 mg/dL with ASCVD)',
          ],
        };
      }
      if (cholCriteria && (familyMI || familyTC)) {
        return {
          score: 'Possible',
          label: 'Possible FH',
          interpretation: `Possible FH — cholesterol criteria met plus a qualifying family history (${familyMI ? 'premature MI' : ''}${familyMI && familyTC ? ' and ' : ''}${familyTC ? 'very high cholesterol' : ''}). Examine for tendon xanthomas and consider genetic testing, which could upgrade to definite.`,
          riskLevel: 'moderate',
          details: [
            { label: 'Cholesterol criteria met', value: 'Yes' },
            { label: 'Family history of premature MI', value: familyMI ? 'Yes' : 'No' },
            { label: 'Family history of high cholesterol', value: familyTC ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Careful tendon examination (palpate Achilles and extensor tendons)',
            'Consider genetic testing — a mutation makes the diagnosis definite',
            'Treat as FH clinically; exclude secondary causes (TSH, urinalysis, LFTs)',
          ],
        };
      }
      return {
        score: 'Not met',
        label: 'Criteria not met',
        interpretation: cholCriteria
          ? 'Cholesterol criteria are met but no tendon xanthomas, qualifying family history, or DNA evidence — FH is not confirmed. Clinical suspicion may still warrant lipid-clinic referral.'
          : `Cholesterol criteria not met (TC ${tc}, LDL ${ldl} mmol/L vs adult >7.5/>4.9 or child >6.7/>4.0) — FH unlikely by Simon Broome criteria.`,
        riskLevel: 'info',
        details: [{ label: 'Cholesterol criteria met', value: cholCriteria ? 'Yes' : 'No' }],
        recommendations: [
          'If suspicion persists: repeat fasting lipids, three-generation pedigree, consider DLCN or MEDPED criteria',
          'Do not withhold lipid lowering while pursuing the diagnosis',
        ],
      };
    },
    evidence: {
      summary:
        'Simon Broome Register criteria: definite FH = cholesterol criteria (adult TC >7.5 or LDL >4.9 mmol/L; child <16 TC >6.7 or LDL >4.0) plus tendon xanthomas in the patient or a 1st/2nd-degree relative, OR DNA evidence of a functional LDLR/PCSK9/APOB mutation. Possible FH = cholesterol criteria plus family history of premature MI (<50 in 2nd-degree or <60 in 1st-degree relative) or family history of TC >7.5 (adult) / >6.7 (child <16).',
      formula: 'Categorical criteria — no score; cholesterol gate + xanthomas/DNA → definite; cholesterol gate + family history → possible',
      validation:
        'Developed by the Simon Broome Register Group (UK) and adopted by NICE CG71 for FH diagnosis. Both TC and LDL thresholds are applied as OR criteria per the published criteria.',
      references: [
        {
          title: 'Risk of fatal coronary heart disease in familial hypercholesterolaemia',
          citation: 'Scientific Steering Committee on behalf of the Simon Broome Register Group. BMJ. 1991',
          year: 1991,
          pmid: '1933004',
        },
        {
          title: 'Familial hypercholesterolaemia: identification and management (NICE CG71)',
          citation: 'National Institute for Health and Care Excellence. 2008 (updated)',
          year: 2008,
          url: 'https://www.nice.org.uk/guidance/cg71',
        },
      ],
    },
    nextSteps: [
      { condition: 'Definite FH', actions: ['Genetic confirmation if not done', 'Cascade screening of relatives', 'High-intensity statin therapy; assess ASCVD risk'] },
      { condition: 'Possible FH', actions: ['Re-examine for tendon xanthomas', 'Genetic testing where available', 'Exclude secondary causes (TSH, proteinuria, LFTs)'] },
      { condition: 'Criteria not met, suspicion persists', actions: ['Repeat untreated fasting lipids', 'Consider DLCN/MEDPED criteria', 'Measure Lp(a)'] },
    ],
    pearls: [
      'A causative mutation alone makes FH definite — no other criterion needed (unlike DLCN).',
      'Tendon xanthomas in a RELATIVE (1st or 2nd degree) count toward definite FH.',
      'Children <16 use lower cholesterol cutoffs (TC >6.7, LDL >4.0 mmol/L).',
      'Two lipid measurements are recommended before diagnosing children.',
    ],
  },

  // ─── 3. US MEDPED Diagnostic Criteria for FH ──────────────────────────────
  {
    id: 'medped-fh',
    name: 'US MEDPED Diagnostic Criteria for Familial Hypercholesterolemia (FH)',
    shortName: 'MEDPED',
    description:
      'Age- and family-history–dependent total cholesterol cutoffs for probable heterozygous FH, validated against molecular diagnosis (~98% specificity).',
    category: 'endocrinology',
    tags: ['fh', 'familial hypercholesterolemia', 'medped', 'total cholesterol', 'diagnostic criteria'],
    whenToUse: 'Suspected FH when only total cholesterol and family history are known — designed for screening relatives of confirmed FH cases and the general population.',
    whyUse:
      'Needs only age, total cholesterol, and the closest affected relative degree. Cutoffs were derived to give ~98% specificity; sensitivity rises from ~54% (general population) to ~88% (first-degree relatives).',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '<20 years', value: '<20' },
        { label: '20–29 years', value: '20-29' },
        { label: '30–39 years', value: '30-39' },
        { label: '≥40 years', value: '>=40' },
      ], '30-39', 'MEDPED total-cholesterol cutoffs rise with age — the youngest band is <20 years.'),
      selectInput('relative', 'Closest relative with confirmed FH diagnosis', [
        { label: 'None known (general population)', value: 'none' },
        { label: '1st-degree (parent, sibling, child)', value: '1st' },
        { label: '2nd-degree (grandparent, aunt/uncle, niece/nephew)', value: '2nd' },
        { label: '3rd-degree (first cousin, great-grandparent)', value: '3rd' },
      ], '1st', 'Lower cutoffs apply when FH is confirmed in a closer relative. Use the CLOSEST affected relative.'),
      numberInput('tc', 'Total cholesterol', {
        unit: 'mmol/L',
        unitKind: 'cholesterol',
        min: 3,
        max: 25,
        step: 0.01,
        exampleValue: 7.5,
        helpText: 'Untreated total cholesterol; the published cutoffs are in mg/dL (e.g., 220–360 depending on age and relative) and are applied after conversion.',
      }),
    ],
    calculate(values) {
      const ageBand = str(values.ageBand, '30-39');
      const rel = str(values.relative, 'none');
      const tcMmol = num(values.tc, 0);
      const tcMgdl = round(tcMmol * MGDL_PER_MMOL_CHOL, 0);
      const cutoff = MEDPED_CUTOFFS[rel]?.[ageBand] ?? MEDPED_CUTOFFS.none['>=40'];
      const met = tcMgdl >= cutoff;
      return {
        score: met ? 'Met' : 'Not met',
        label: met ? 'FH criteria met' : 'FH criteria not met',
        interpretation: met
          ? `Total cholesterol ${tcMgdl} mg/dL (${tcMmol} mmol/L) meets/exceeds the MEDPED cutoff of ${cutoff} mg/dL for age ${ageBand} with ${rel === 'none' ? 'no known affected relative (general population)' : `a ${rel}-degree relative with FH`} — consistent with probable heterozygous FH (~98% specificity).`
          : `Total cholesterol ${tcMgdl} mg/dL (${tcMmol} mmol/L) is below the MEDPED cutoff of ${cutoff} mg/dL for age ${ageBand} (${rel === 'none' ? 'general population' : `${rel}-degree relative`}). Criteria not met — MEDPED sensitivity is limited (54–88%), so do not exclude FH if suspicion is high.`,
        riskLevel: met ? 'high' : 'info',
        details: [
          { label: 'Total cholesterol', value: `${tcMgdl} mg/dL (${tcMmol} mmol/L)` },
          { label: 'Age band', value: ageBand === '<20' ? '<20 years' : ageBand === '>=40' ? '≥40 years' : `${ageBand} years` },
          { label: 'Closest affected relative', value: rel === 'none' ? 'None (general population)' : `${rel}-degree` },
          { label: 'MEDPED cutoff', value: `≥${cutoff} mg/dL` },
        ],
        recommendations: met
          ? [
              'Evaluate for secondary causes of hypercholesterolemia',
              'Assess ASCVD history and risk; initiate/intensify lipid-lowering therapy per guidelines',
              'Consider lipid specialist referral and screening of relatives',
              'Genetic testing where available — FH remains a clinical diagnosis',
            ]
          : [
              'Do not rule out FH when clinical suspicion remains high',
              'Consider DLCN or Simon Broome criteria, lipid specialist referral, and/or genetic testing',
            ],
      };
    },
    evidence: {
      summary:
        'MEDPED (Make Early Diagnosis to Prevent Early Death) cutoffs for total cholesterol vary by age (<20, 20–29, 30–39, ≥40) and the closest relative with confirmed FH (1st/2nd/3rd degree or general population): e.g., 1st-degree 220/240/270/290 mg/dL; general population 270/290/340/360 mg/dL.',
      formula: 'FH if total cholesterol ≥ age- and relative-specific cutoff (mg/dL table)',
      validation:
        'Derived by Williams et al. (Am J Cardiol 1993) and validated by molecular genetics — ~98% specificity, sensitivity 54% (general population) to 88% (first-degree relatives). Cutoffs applied on mg/dL after mmol/L conversion.',
      references: [
        {
          title: 'Diagnosing heterozygous familial hypercholesterolemia using new practical criteria validated by molecular genetics',
          citation: 'Williams RR et al. Am J Cardiol. 1993',
          year: 1993,
          pmid: '8328379',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Secondary-cause workup', 'ASCVD risk assessment', 'Lipid-lowering therapy', 'Screen relatives; consider genetic testing'] },
      { condition: 'Criteria not met, suspicion persists', actions: ['Use DLCN or Simon Broome criteria', 'Lipid specialist referral', 'Genetic testing when available'] },
    ],
    pearls: [
      'Requires only age, total cholesterol, and family structure — useful when LDL-C is unavailable.',
      'Cutoffs are stricter (lower) when a close relative has confirmed FH.',
      'Specificity ~98% but limited sensitivity — a negative screen does not exclude FH.',
    ],
  },

  // ─── 4. NAFCS ─────────────────────────────────────────────────────────────
  {
    id: 'nafcs',
    name: 'North American Familial Chylomicronemia Score (NAFCS)',
    shortName: 'NAFCS',
    description:
      'Clinical score to facilitate familial chylomicronemia syndrome (FCS) diagnosis in patients with hypertriglyceridemia — age, BMI, pancreatitis history, secondary factors, and lipid/apoB criteria plus synergy bonuses.',
    category: 'endocrinology',
    tags: ['fcs', 'chylomicronemia', 'hypertriglyceridemia', 'nafcs', 'lipids', 'diagnostic criteria'],
    whenToUse:
      'Patients ≥1 year old with hypertriglyceridemia ≥440 mg/dL; for patients ≥10 years, intended for those not responsive to fibrates and high-dose omega-3 (TG not decreasing ≥20%). Not validated in pregnancy.',
    whyUse:
      'Helps distinguish monogenic FCS from multifactorial chylomicronemia (MCS), identify candidates for genetic testing, and support clinical FCS diagnosis when genetic testing is indeterminate or unavailable.',
    inputs: [
      selectInput('age', 'Current age', [
        { label: '<1 year (score not applicable)', value: 'infant' },
        { label: '≥1–9 years', value: 'young', points: 12 },
        { label: '≥10 years', value: 'older', points: 0 },
      ], 'older', 'Age ≥1–9 years scores 12 points (and a +7 synergy bonus when no secondary factors are present). The tool cannot be used under age 1.'),
      selectInput('bmi', 'BMI', [
        { label: '≥25 kg/m² or ≥85th percentile', value: 'high', points: 0 },
        { label: '<25 kg/m² or <85th percentile', value: 'low', points: 9 },
      ], 'low', 'Low BMI (<25 kg/m², or below the 85th percentile in children) favors FCS over multifactorial chylomicronemia and scores 9 points.'),
      selectInput('pancreatitis', 'History of pancreatitis', [
        { label: 'Neither abdominal pain nor pancreatitis', value: 'none', points: 0 },
        { label: 'Abdominal pain but no pancreatitis', value: 'pain', points: 9 },
        { label: 'Pancreatitis', value: 'pancreatitis', points: 16 },
      ], 'none', 'Documented pancreatitis scores 16 points; recurrent abdominal pain without confirmed pancreatitis scores 9.'),
      selectInput('secondary', 'Secondary factors contributing to hypertriglyceridemia', [
        { label: 'None', value: 'none', points: 11 },
        { label: '≥1 secondary factor present', value: 'present', points: 0 },
      ], 'none', 'Secondary factors include uncontrolled diabetes, obesity/metabolic syndrome, alcohol, pregnancy, and triglyceride-raising medications. Their absence scores 11 points and also unlocks synergy bonuses.'),
      yesNo('tg880', 'All triglycerides >880 mg/dL', 13, 'All documented triglyceride values exceed 880 mg/dL (10 mmol/L) — scores 13 points.', false),
      yesNo('ratio', 'Triglyceride/total cholesterol ratio >8 (mg/dL units)', 8, 'TG/TC ratio >8 when both are measured in mg/dL — scores 8 points and feeds two synergy bonuses.', false),
      yesNo('apob', 'Apolipoprotein B <1.0 g/L', 12, 'apoB <1.0 g/L (100 mg/dL) — scores 12 points; combined with TG/TC >8 adds a +7 synergy bonus.', false),
    ],
    calculate(values) {
      const age = str(values.age);
      if (age === 'infant') {
        return {
          score: '—',
          label: 'Score not applicable under 1 year of age',
          interpretation:
            'NAFCS cannot be used for patients <1 year old. In an infant with severe HTG and no secondary factors, consider FCS directly; with ≥1 secondary factor but 2 triglyceride readings >10 mmol/L, specialist assessment is still warranted.',
          riskLevel: 'info',
        };
      }
      const noSecondary = str(values.secondary) === 'none';
      const ratio = bool(values.ratio);
      const apoB = bool(values.apob);
      let score = 0;
      score += age === 'young' ? 12 : 0;
      score += str(values.bmi) === 'low' ? 9 : 0;
      score += num(str(values.pancreatitis) === 'pancreatitis' ? 16 : str(values.pancreatitis) === 'pain' ? 9 : 0);
      score += noSecondary ? 11 : 0;
      score += bool(values.tg880) ? 13 : 0;
      score += ratio ? 8 : 0;
      score += apoB ? 12 : 0;
      // Synergy bonuses from the published scoring tool
      const bonuses: string[] = [];
      if (age === 'young' && noSecondary) {
        score += 7;
        bonuses.push('age 1–9 + no secondary factors (+7)');
      }
      if (ratio && apoB) {
        score += 7;
        bonuses.push('TG/TC >8 + apoB <1.0 (+7)');
      }
      if (ratio && noSecondary) {
        score += 5;
        bonuses.push('TG/TC >8 + no secondary factors (+5)');
      }
      const band =
        score >= 60
          ? { level: 'high' as const, label: 'Strongly indicates definite FCS', note: 'Strongly indicates definite FCS — pursue FCS-specific therapy and genetic confirmation.' }
          : score >= 45
            ? { level: 'moderate' as const, label: 'Likely FCS (45–59)', note: 'Likely FCS — genetic testing and specialist referral recommended.' }
            : score >= 30
              ? { level: 'moderate' as const, label: 'Genetic testing should be considered (30–44)', note: 'Indeterminate — genetic testing should be considered to distinguish FCS from multifactorial chylomicronemia.' }
              : { level: 'low' as const, label: 'Unlikely FCS (<30)', note: 'Unlikely FCS — multifactorial chylomicronemia more likely; genetic testing may still be needed if suspicion persists.' };
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `NAFCS ${score}. ${band.note} A high score is highly specific but not diagnostic alone — combine with clinical judgment and lipid/genetics expertise.`,
        riskLevel: band.level,
        details: [
          { label: 'Synergy bonuses applied', value: bonuses.length ? bonuses.join('; ') : 'None' },
          { label: 'Band', value: score >= 60 ? '≥60 definite' : score >= 45 ? '45–59 likely' : score >= 30 ? '30–44 test' : '<30 unlikely' },
        ],
        recommendations: [
          'Score ≥30: refer for genetic testing (multigene panel and/or CNV analysis)',
          'Score ≥60: consider FCS-specific therapy while awaiting genetic results',
          'Manage secondary factors (diabetes, alcohol, TG-raising drugs) and repeat fasting lipid profile',
        ],
      };
    },
    evidence: {
      summary:
        'NAFCS (Hegele et al., J Clin Lipidol 2024, RAND/UCLA modified Delphi consensus): age 1–9 (+12), BMI <25 kg/m² or <85th percentile (+9), pancreatitis (+16) or abdominal pain without pancreatitis (+9), no secondary factors (+11), all TG >880 mg/dL (+13), TG/TC ratio >8 (+8), apoB <1.0 g/L (+12), plus synergy bonuses (+7 age 1–9 with no secondary factors; +7 TG/TC >8 with apoB <1.0; +5 TG/TC >8 with no secondary factors). ≥60 definite FCS, 45–59 likely, 30–44 consider genetic testing, <30 unlikely.',
      formula: 'Sum of 7 item scores + up to 3 synergy bonuses',
      validation:
        'Consensus-derived (RAND/UCLA Delphi); validation examined a single Ontario lipid-clinic registry — no prospective multicentre or ethnically diverse external validation yet. Developed under an Ionis Pharmaceuticals contract — conflict-of-interest noted on the source tool. Bonus-point combinations implemented per the NLA-published scoring tool.',
      references: [
        {
          title: 'Development and validation of clinical criteria to identify familial chylomicronemia syndrome (FCS) in North America',
          citation: 'Hegele RA et al. J Clin Lipidol. 2024 (online)',
          year: 2024,
          doi: '10.1016/j.jacl.2024.09.008',
        },
      ],
    },
    nextSteps: [
      { condition: 'NAFCS ≥60', actions: ['Treat as FCS (very-low-fat diet, FCS-specific agents)', 'Genetic testing for confirmation', 'Lipid specialist referral'] },
      { condition: 'NAFCS 30–59', actions: ['Genetic testing', 'Lipid specialist referral', 'Aggressively control secondary factors'] },
      { condition: 'NAFCS <30', actions: ['Manage multifactorial chylomicronemia (fibrates, omega-3, secondary-factor control)', 'Reassess if TG remain severely elevated despite therapy'] },
    ],
    pearls: [
      'Use only for TG ≥440 mg/dL; in patients ≥10 y it assumes non-response to fibrates + high-dose omega-3.',
      'Synergy bonuses reward classic FCS patterns — young age without secondary factors, and TG/TC >8 combined with low apoB or no secondary factors.',
      'Does not apply to pregnancy or infants <1 year.',
      'High score is highly specific but NOT diagnostic — always pair with specialist assessment.',
    ],
  },

  // ─── 5. CANRISK ────────────────────────────────────────────────────────────
  {
    id: 'canrisk',
    name: 'Canadian Diabetes Risk Assessment Questionnaire (CANRISK)',
    shortName: 'CANRISK',
    description:
      'PHAC questionnaire scoring risk of undiagnosed type 2 diabetes/prediabetes from demographics, anthropometrics, lifestyle, history, family history, ethnicity, and education; CTFPHC bands guide A1c screening intervals.',
    category: 'endocrinology',
    tags: ['diabetes', 't2dm', 'canrisk', 'screening', 'risk score', 'prediabetes', 'questionnaire'],
    isQuestionnaire: true,
    whenToUse: 'Adults (derived for ages 40–74) for opportunistic diabetes risk screening in primary care — determines who warrants A1c testing and how often.',
    whyUse:
      'Validated Canadian adaptation of FINDRISC; the CTFPHC anchors its screening recommendations to CANRISK bands (no routine screening below 33, A1c every 3–5 years at 33–42, annually at ≥43).',
    inputs: [
      selectInput('age', 'Age', [
        { label: '18–44 years', value: 0, points: 0 },
        { label: '45–54 years', value: 7, points: 7 },
        { label: '55–64 years', value: 13, points: 13 },
        { label: '65–74 years', value: 15, points: 15 },
        { label: '≥75 years', value: 15, points: 15 },
      ], 0, 'Derived for adults 40–74; the ≥75 band is scored as the maximum age band (15 points) — interpret with caution, validation data above 74 are limited.'),
      selectInput('sex', 'Gender', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 6 },
      ], 'F', 'Male sex adds 6 points; the waist-circumference bands are also sex-specific.'),
      selectInput('bmi', 'BMI', [
        { label: '<25 kg/m²', value: 0, points: 0 },
        { label: '25–29 kg/m²', value: 4, points: 4 },
        { label: '30–34 kg/m²', value: 9, points: 9 },
        { label: '≥35 kg/m²', value: 14, points: 14 },
      ], 0, 'BMI bands: <25 = 0, 25–29 = 4, 30–34 = 9, ≥35 = 14 points.'),
      numberInput('waist', 'Waist circumference at the level of the belly button', {
        unit: 'cm',
        min: 50,
        max: 250,
        exampleValue: 96,
        helpText: 'Measure after breathing out (not pants size). Men: <94 cm = 0, 94–102 = 4, >102 = 6. Women: <80 = 0, 80–88 = 4, >88 = 6.',
      }),
      selectInput('activity', 'Physical activity such as brisk walking for at least 30 minutes each day', [
        { label: 'Yes', value: 0, points: 0 },
        { label: 'No', value: 1, points: 1 },
      ], 0, 'Less than 30 minutes of daily physical activity (e.g., brisk walking) adds 1 point.'),
      selectInput('veg', 'How often do you eat vegetables or fruits?', [
        { label: 'Every day', value: 0, points: 0 },
        { label: 'Not every day', value: 2, points: 2 },
      ], 0, 'Not eating vegetables or fruits every day adds 2 points.'),
      selectInput('htn', 'History of high blood pressure OR prescription for high blood pressure', [
        { label: 'No or don’t know', value: 0, points: 0 },
        { label: 'Yes', value: 4, points: 4 },
      ], 0, 'A history of hypertension or antihypertensive medication adds 4 points.'),
      selectInput('highGlucose', 'History of high blood sugar (blood test, during illness, or during pregnancy)', [
        { label: 'No or don’t know', value: 0, points: 0 },
        { label: 'Yes', value: 14, points: 14 },
      ], 0, 'Any prior documented high blood glucose — including during illness or pregnancy (gestational diabetes) — adds 14 points, the largest single item.'),
      selectInput('macrosomia', 'Given birth to a large baby weighing 9 lb (4.1 kg) or more', [
        { label: 'No, don’t know, or not applicable', value: 0, points: 0 },
        { label: 'Yes', value: 1, points: 1 },
      ], 0, 'Macrosomia history applies to patients who have given birth; choose not applicable otherwise. Adds 1 point.'),
      selectInput('familyHx', 'Family history of diabetes (count mother, father, brothers/sisters, children — do not double-count)', [
        { label: 'No or don’t know', value: 0, points: 0 },
        { label: 'One of: mother, father, brothers/sisters, children', value: 2, points: 2 },
        { label: 'Two of: mother, father, brothers/sisters, children', value: 4, points: 4 },
        { label: 'Three of: mother, father, brothers/sisters, children', value: 6, points: 6 },
        { label: 'All of: mother, father, brothers/sisters, children', value: 8, points: 8 },
      ], 0, 'Count each category (mother, father, siblings, children) once — 0/2/4/6/8 points.'),
      selectInput('ethnicity', 'Ethnic groups of biological (blood) parents (highest applicable)', [
        { label: 'White', value: 0, points: 0 },
        { label: 'Aboriginal', value: 3, points: 3 },
        { label: 'Other non-white (Latin American, Arab, West Asian)', value: 33, points: 3 },
        { label: 'Black (Afro-Caribbean)', value: 5, points: 5 },
        { label: 'East Asian (Chinese, Vietnamese, Filipino, Korean, etc.)', value: 10, points: 10 },
        { label: 'South Asian (East Indian, Pakistani, Sri Lankan, etc.)', value: 11, points: 11 },
      ], 0, 'If more than one group applies, choose the one with the highest score.'),
      selectInput('education', 'Highest level of education completed', [
        { label: 'University or college degree', value: 0, points: 0 },
        { label: 'Some college or university', value: 2, points: 0 },
        { label: 'High school diploma', value: 1, points: 1 },
        { label: 'Some high school or less', value: 5, points: 5 },
      ], 0, 'A socioeconomic proxy item: high school diploma = 1 point, some high school or less = 5 points.'),
    ],
    calculate(values) {
      const male = str(values.sex) === 'M';
      const waist = num(values.waist, 0);
      const waistPts = male ? (waist < 94 ? 0 : waist <= 102 ? 4 : 6) : waist < 80 ? 0 : waist <= 88 ? 4 : 6;
      const ethRaw = num(values.ethnicity, 0);
      const ethPts = ethRaw === 33 ? 3 : ethRaw;
      const eduRaw = num(values.education, 0);
      const eduPts = eduRaw === 2 ? 0 : eduRaw;
      const score =
        num(values.age, 0) +
        (male ? 6 : 0) +
        num(values.bmi, 0) +
        waistPts +
        num(values.activity, 0) +
        num(values.veg, 0) +
        num(values.htn, 0) +
        num(values.highGlucose, 0) +
        num(values.macrosomia, 0) +
        num(values.familyHx, 0) +
        ethPts +
        eduPts;
      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'low',
          label: 'Low risk (<21)',
          interpretation: `CANRISK ${score}: low risk of having prediabetes or undiagnosed type 2 diabetes. CTFPHC: routine screening not recommended; maintain healthy lifestyle.`,
        },
        {
          max: 32,
          level: 'low',
          label: 'Low–moderate risk (21–32)',
          interpretation: `CANRISK ${score}: moderate risk by PHAC bands. CTFPHC still places this in the low–moderate band (0–32) — routine screening not recommended, though clinical judgment may justify testing.`,
        },
        {
          max: 42,
          level: 'high',
          label: 'High risk (33–42)',
          interpretation: `CANRISK ${score}: high risk — CTFPHC recommends A1c screening every 3–5 years. Counsel on lifestyle measures to prevent progression.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high risk (≥43)',
          interpretation: `CANRISK ${score}: very high risk — CTFPHC recommends annual A1c screening. Strongly consider testing now and structured prevention.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Waist points', value: `${waistPts} (${waist} cm, ${male ? 'male' : 'female'} cutoffs)` },
          { label: 'CTFPHC band', value: score < 33 ? '0–32: no routine screening' : score <= 42 ? '33–42: A1c every 3–5 y' : '≥43: A1c annually' },
          { label: 'PHAC band', value: score < 21 ? 'Low' : score <= 32 ? 'Moderate' : 'High' },
        ],
        recommendations: [
          'Score <33: no routine screening recommended (CTFPHC); address lifestyle risk factors',
          'Score 33–42: A1c screening every 3–5 years',
          'Score ≥43: annual A1c screening; consider immediate testing',
          'Adults 18–39 may warrant a lower high-risk cutoff (~19–21 points) — use judgment',
        ],
      };
    },
    evidence: {
      summary:
        'CANRISK (PHAC 2011) scores 12 items: age (0–15), male sex (6), BMI (0–14), sex-specific waist circumference (0/4/6), physical inactivity (1), non-daily fruit/vegetables (2), hypertension (4), prior high blood glucose (14), macrosomia (1), family history count (0–8), parental ethnicity (0–11), and education (0–5). PHAC bands: <21 low, 21–32 moderate, ≥33 high. CTFPHC screening bands: 0–32 no routine screening, 33–42 A1c q3–5y, ≥43 annual A1c.',
      formula: 'Sum of 12 questionnaire items (sex-specific waist bands applied internally)',
      validation:
        'Derived from FINDRISC for Canadian adults 40–74 (PHAC 2011) and adopted by the Canadian Task Force on Preventive Health Care 2012 guideline. Waist points use sex-specific cutoffs (men 94/102 cm, women 80/88 cm). Validation in >74 y is limited; lower cutoffs suggested for ages 18–39.',
      references: [
        {
          title: 'Recommendations on screening for type 2 diabetes in adults (Canadian Task Force on Preventive Health Care)',
          citation: 'Canadian Task Force on Preventive Health Care. CMAJ. 2012',
          year: 2012,
          pmid: '23073674',
        },
        {
          title: 'CANRISK: the Canadian Diabetes Risk Assessment Questionnaire',
          citation: 'Public Health Agency of Canada. 2011',
          year: 2011,
          url: 'https://healthycanadians.gc.ca/apps/canrisk-standalone/pdf/canrisk-en.pdf',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥43', actions: ['Annual A1c', 'Consider immediate A1c/FPG', 'Structured prevention (diet, activity, weight loss 5–7%)'] },
      { condition: 'Score 33–42', actions: ['A1c every 3–5 years', 'Lifestyle counseling'] },
      { condition: 'Score <33', actions: ['No routine screening (CTFPHC)', 'Reassess periodically or if risk factors change'] },
    ],
    pearls: [
      'Waist is measured at the belly button after exhaling — not pants size — and uses sex-specific cutoffs.',
      'Prior high glucose (including gestational or illness-related) is the single largest item (+14).',
      'If multiple ethnicities apply to the biological parents, pick the highest-scoring group.',
      'Designed for ages 40–74; a lower high-risk cutoff (~19–21) performs better in adults 18–39.',
    ],
  },

  // ─── 6. Cambridge Diabetes Risk Score ──────────────────────────────────────
  {
    id: 'cambridge-diabetes-risk',
    name: 'Cambridge Diabetes Risk Score',
    shortName: 'Cambridge DRS',
    description:
      'Logistic model (Griffin 2000) estimating the probability that a patient currently HAS undiagnosed type 2 diabetes — age, sex, BMI, antihypertensive/steroid prescriptions, family and smoking history.',
    category: 'endocrinology',
    tags: ['diabetes', 't2dm', 'cambridge', 'undiagnosed', 'screening', 'risk score'],
    whenToUse: 'Primary-care adults without known diabetes to estimate prevalent (current, undiagnosed) diabetes risk using routinely recorded data — NOT future diabetes risk.',
    whyUse:
      'Uses only routinely collected GP data — no labs or questionnaires needed. ROC AUC ~0.80 in derivation; at 72% specificity gave 77% sensitivity for prevalent undiagnosed diabetes.',
    inputs: [
      selectInput('sex', 'Gender', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ], 'M', 'Female sex carries a −0.879 coefficient (lower predicted risk than male, the reference).'),
      yesNo('antihypertensive', 'Prescribed antihypertensive medication', null, 'Currently prescribed antihypertensive medication adds 1.222 to the linear predictor — a marker of cardiometabolic risk.', true),
      yesNo('steroids', 'Prescribed steroids', null, 'Currently prescribed corticosteroids add 2.191 — the largest single coefficient in the model.', false),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, exampleValue: 55, helpText: 'Age enters continuously at +0.063 per year. The derivation cohort was aged 40–64 — extrapolate cautiously outside that range.' }),
      selectInput('bmi', 'BMI', [
        { label: '<25 kg/m²', value: 0 },
        { label: '≥25 and <27.5 kg/m²', value: 0.699 },
        { label: '≥27.5 and <30 kg/m²', value: 1.97 },
        { label: '≥30 kg/m²', value: 2.518 },
      ], 0, 'BMI coefficients: <25 = 0; 25–<27.5 = +0.699; 27.5–<30 = +1.97; ≥30 = +2.518.'),
      selectInput('familyHx', 'Family history of diabetes', [
        { label: 'No diabetic 1st-degree relative', value: 0 },
        { label: 'Parent or sibling with diabetes', value: 0.728 },
        { label: 'Parent AND sibling with diabetes', value: 0.753 },
      ], 0, 'A parent or sibling with diabetes adds 0.728; both a parent and a sibling adds 0.753.'),
      selectInput('smoking', 'Smoking history', [
        { label: 'Non-smoker', value: 0 },
        { label: 'Ex-smoker', value: -0.218 },
        { label: 'Current smoker', value: 0.855 },
      ], 0, 'Current smoking adds 0.855; ex-smoking slightly lowers the score (−0.218).'),
    ],
    calculate(values) {
      const lp =
        -6.322 +
        (str(values.sex) === 'F' ? -0.879 : 0) +
        (bool(values.antihypertensive) ? 1.222 : 0) +
        (bool(values.steroids) ? 2.191 : 0) +
        0.063 * num(values.age, 0) +
        num(values.bmi, 0) +
        num(values.familyHx, 0) +
        num(values.smoking, 0);
      const p = round((1 / (1 + Math.exp(-lp))) * 100, 1);
      const r = riskFromThresholds(p, [
        {
          max: 5,
          level: 'low',
          label: 'Lower probability of undiagnosed diabetes',
          interpretation: `Cambridge DRS estimated probability ~${p}% that this patient currently has undiagnosed type 2 diabetes. Lower probability — routine guideline-based screening applies.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Intermediate probability',
          interpretation: `Cambridge DRS estimated probability ~${p}% of prevalent undiagnosed type 2 diabetes. Consider targeted A1c/FPG testing — the model is a case-finding aid, not a diagnosis.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High probability',
          interpretation: `Cambridge DRS estimated probability ~${p}% of prevalent undiagnosed type 2 diabetes. Formal diagnostic testing (A1c or fasting glucose) is warranted now.`,
        },
      ]);
      return {
        score: p,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Linear predictor', value: `${round(lp, 3)}` },
          { label: 'Estimated probability', value: `${p}%` },
        ],
        recommendations: [
          'High predicted probability → diagnostic A1c and/or fasting plasma glucose now',
          'Intermediate → targeted testing; the published operating point (72% specificity) retained ~77% sensitivity',
          'Recheck periodically — inputs (BMI, smoking, medications) change risk',
        ],
      };
    },
    evidence: {
      summary:
        'Cambridge Risk Score (Griffin et al. 2000): P = 1/(1+e^−LP), LP = −6.322 −0.879(female) +1.222(antihypertensive) +2.191(steroids) +0.063×age +BMI(0/0.699/1.97/2.518) +family history(0/0.728/0.753) +smoking(0/−0.218/0.855). Predicts prevalent (undiagnosed) diabetes, not incident risk.',
      formula: 'P = 1/(1+e^(−LP)) with LP as above',
      validation:
        'Derived from a pooled English cohort (Ely + Wessex), tested on an independent population sample: AUC 0.80, sensitivity 77% at 72% specificity. Cohort was mostly white English patients aged 40–64 — use caution in other ethnicities and ages. The displayed probability bands are pragmatic; the publication specifies no official bands.',
      references: [
        {
          title: 'Diabetes risk score: towards earlier detection of Type 2 diabetes in general practice',
          citation: 'Griffin SJ, Little PS, Hales CN, Kinmonth AL, Wareham NJ. Diabetes Metab Res Rev. 2000',
          year: 2000,
          pmid: '10867715',
        },
      ],
    },
    nextSteps: [
      { condition: 'High predicted probability', actions: ['Order A1c and/or fasting glucose', 'Confirm abnormal results per diagnostic criteria', 'Initiate management if diabetes confirmed'] },
      { condition: 'Intermediate', actions: ['Targeted A1c testing', 'Address modifiable factors (weight, smoking)'] },
    ],
    pearls: [
      'Estimates CURRENT undiagnosed diabetes — not 5- or 10-year incident risk.',
      'Prescribed steroids carry the largest single coefficient (+2.191).',
      'All inputs are routine GP-record data — designed for automated case finding.',
      'Derived in ages 40–64, predominantly white UK patients — extrapolate carefully.',
    ],
  },

  // ─── 7. Diabetes Distress Scale (DDS-17) ───────────────────────────────────
  {
    id: 'dds-17',
    name: 'Diabetes Distress Scale (DDS-17)',
    shortName: 'DDS-17',
    description:
      '17-item patient-reported measure of diabetes-related emotional distress over the past month; mean item score <2 little/no distress, 2–2.9 moderate, ≥3 high distress, with 4 subscales.',
    category: 'endocrinology',
    tags: ['diabetes', 'distress', 'dds', 'questionnaire', 'psychosocial', 'burnout'],
    isQuestionnaire: true,
    whenToUse: 'Adults with type 1 or type 2 diabetes when diabetes-related emotional distress is suspected or screened — not a psychiatric diagnostic tool.',
    whyUse:
      'Diabetes distress is distinct from depression and is associated with worse glycemic control, self-care, adherence, and quality of life. Subscale means (emotional burden, physician-related, regimen-related, interpersonal) target the source of distress.',
    inputs: [
      selectInput('eb1', 'Feeling that diabetes is taking up too much of my mental and physical energy every day', [
        { label: 'Not a problem', value: 1 },
        { label: 'A slight problem', value: 2 },
        { label: 'A moderate problem', value: 3 },
        { label: 'A somewhat serious problem', value: 4 },
        { label: 'A serious problem', value: 5 },
        { label: 'A very serious problem', value: 6 },
      ], 1, 'Emotional burden item 1 of 5 — rate distress over the PAST MONTH (1–6).'),
      selectInput('eb2', 'Feeling angry, scared, and/or depressed when I think about living with diabetes', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Emotional burden item 2 of 5.'),
      selectInput('eb3', 'Feeling that diabetes controls my life', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Emotional burden item 3 of 5.'),
      selectInput('eb4', 'Feeling that I will end up with serious long-term complications, no matter what I do', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Emotional burden item 4 of 5.'),
      selectInput('eb5', 'Feeling overwhelmed by the demands of living with diabetes', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Emotional burden item 5 of 5.'),
      selectInput('pd1', 'Feeling that my doctor doesn’t know enough about diabetes and diabetes care', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Physician-related distress item 1 of 4.'),
      selectInput('pd2', 'Feeling that my doctor doesn’t give me clear enough directions on how to manage my diabetes', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Physician-related distress item 2 of 4.'),
      selectInput('pd3', 'Feeling that my doctor doesn’t take my concerns seriously enough', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Physician-related distress item 3 of 4.'),
      selectInput('pd4', 'Feeling that I don’t have a doctor who I can see regularly about my diabetes', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Physician-related distress item 4 of 4.'),
      selectInput('rd1', 'Feeling that I am not testing my blood sugars frequently enough', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Regimen-related distress item 1 of 5.'),
      selectInput('rd2', 'Feeling that I am often failing with my diabetes regimen', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Regimen-related distress item 2 of 5.'),
      selectInput('rd3', 'Not feeling confident in my day-to-day ability to manage diabetes', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Regimen-related distress item 3 of 5.'),
      selectInput('rd4', 'Feeling that I am not sticking closely enough to a good meal plan', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Regimen-related distress item 4 of 5.'),
      selectInput('rd5', 'Not feeling motivated to keep up my diabetes self-management', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Regimen-related distress item 5 of 5.'),
      selectInput('id1', 'Feeling that friends or family are not supportive enough of my self-care efforts', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Interpersonal distress item 1 of 3 — e.g., planning activities that conflict with the regimen or encouraging "wrong" foods.'),
      selectInput('id2', 'Feeling that friends or family don’t appreciate how difficult living with diabetes can be', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Interpersonal distress item 2 of 3.'),
      selectInput('id3', 'Feeling that friends or family don’t give me the emotional support that I would like', [
        { label: 'Not a problem', value: 1 }, { label: 'A slight problem', value: 2 }, { label: 'A moderate problem', value: 3 }, { label: 'A somewhat serious problem', value: 4 }, { label: 'A serious problem', value: 5 }, { label: 'A very serious problem', value: 6 },
      ], 1, 'Interpersonal distress item 3 of 3.'),
    ],
    calculate(values) {
      const ebIds = ['eb1', 'eb2', 'eb3', 'eb4', 'eb5'];
      const pdIds = ['pd1', 'pd2', 'pd3', 'pd4'];
      const rdIds = ['rd1', 'rd2', 'rd3', 'rd4', 'rd5'];
      const idIds = ['id1', 'id2', 'id3'];
      const meanOf = (ids: string[]) => round(ids.reduce((a, id) => a + num(values[id], 1), 0) / ids.length, 2);
      const eb = meanOf(ebIds);
      const pd = meanOf(pdIds);
      const rd = meanOf(rdIds);
      const idm = meanOf(idIds);
      const total = [...ebIds, ...pdIds, ...rdIds, ...idIds].reduce((a, id) => a + num(values[id], 1), 0);
      const mean = round(total / 17, 2);
      const band = (m: number) => (m >= 3 ? 'high distress' : m >= 2 ? 'moderate distress' : 'little/no distress');
      const r = riskFromThresholds(mean, [
        {
          max: 1.99,
          level: 'low',
          label: 'Little or no diabetes distress (mean <2)',
          interpretation: `DDS-17 mean ${mean}: little or no diabetes distress. Routine supportive care; rescreen periodically or at regimen changes.`,
        },
        {
          max: 2.99,
          level: 'moderate',
          label: 'Moderate diabetes distress (mean 2.0–2.9)',
          interpretation: `DDS-17 mean ${mean}: moderate diabetes distress — warrants clinical attention. Review the highest subscales and individual items scored ≥3 to target support.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High diabetes distress (mean ≥3)',
          interpretation: `DDS-17 mean ${mean}: high diabetes distress — clinically meaningful and associated with poor glycemic control and adherence. Address the dominant subscale(s) and consider behavioral-health referral.`,
        },
      ]);
      return {
        score: mean,
        unit: 'mean item score',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Emotional burden (5 items)', value: `${eb} — ${band(eb)}` },
          { label: 'Physician-related distress (4 items)', value: `${pd} — ${band(pd)}` },
          { label: 'Regimen-related distress (5 items)', value: `${rd} — ${band(rd)}` },
          { label: 'Interpersonal distress (3 items)', value: `${idm} — ${band(idm)}` },
          { label: 'Total', value: `${total}/102` },
        ],
        recommendations: [
          'Mean ≥3 or any item ≥3: discuss the specific source of distress at the visit',
          'Emotional burden ↑ → acknowledge burden, simplify regimen, diabetes education/support',
          'Physician-related ↑ → strengthen therapeutic alliance or change care team',
          'Regimen-related ↑ → simplify regimen, problem-solving support, consider diabetes educator',
          'Interpersonal ↑ → involve family/caregivers in education; consider peer support',
        ],
      };
    },
    evidence: {
      summary:
        'DDS-17 (Polonsky et al. 1995): 17 items rated 1 (not a problem) to 6 (a very serious problem) for the past month; scored as mean item response overall and for 4 subscales — emotional burden (5), physician-related (4), regimen-related (5), interpersonal (3). Fisher et al. 2012 established cut points: <2 little/no distress, 2.0–2.9 moderate, ≥3 high distress; individual items ≥3 flag specific problem areas.',
      formula: 'Mean of 17 item responses (1–6 each); subscale means likewise',
      validation:
        'Validated in T1D and T2D; correlates with glycemic control and self-management. Cut points established against clinical interview (Fisher 2012). Subscales follow the published DDS structure: EB items 1–5, PD 6–9, RD 10–14, ID 15–17.',
      references: [
        {
          title: 'Assessment of diabetes-related distress',
          citation: 'Polonsky WH et al. Diabetes Care. 1995',
          year: 1995,
          pmid: '7555499',
        },
        {
          title: 'When is diabetes distress clinically meaningful? Establishing cut points for the Diabetes Distress Scale',
          citation: 'Fisher L, Hessler DM, Polonsky WH, Mullan J. Diabetes Care. 2012',
          year: 2012,
          pmid: '22228744',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mean ≥3 (high distress)', actions: ['Discuss specific high-scoring items', 'Targeted intervention by dominant subscale', 'Consider behavioral health / diabetes educator referral', 'Screen for comorbid depression separately (distress ≠ depression)'] },
      { condition: 'Mean 2.0–2.9 (moderate)', actions: ['Review items scored ≥3', 'Supportive counseling and regimen review', 'Rescreen at follow-up'] },
      { condition: 'Mean <2', actions: ['Routine supportive care', 'Rescreen at regimen changes or annually'] },
    ],
    pearls: [
      'Diabetes distress is NOT depression — screen for both separately.',
      'Any single item rated ≥3 flags a specific problem worth addressing even if the mean is low.',
      'The mean item score (not the raw sum) is the reported metric — sum/17.',
      'Distinguish the source: regimen-related distress responds to simplification; interpersonal distress needs family engagement.',
    ],
  },

  // ─── 8. Hypoglycemia Risk Score (Karter) ──────────────────────────────────
  {
    id: 'hypoglycemia-risk-score',
    name: 'Hypoglycemia Risk Score',
    shortName: 'Hypo Risk',
    description:
      'Karter 6-input stratification tool predicting 12-month risk of hypoglycemia-related ED or hospital utilization in T2DM — prior hypoglycemia utilization, insulin, sulfonylurea, ED use, severe CKD, and age.',
    category: 'endocrinology',
    tags: ['hypoglycemia', 'diabetes', 't2dm', 'insulin', 'sulfonylurea', 'risk stratification', 'karter'],
    whenToUse: 'Ambulatory adults with type 2 diabetes — particularly those on insulin or sulfonylureas — to stratify 12-month risk of hypoglycemia requiring ED or hospital care.',
    whyUse:
      'Identifies the ~2% high-risk group (>5% annual risk of hypoglycemia-related utilization) for targeted interventions: regimen simplification/deprescribing, CGM, glucagon prescription, pharmacist outreach.',
    inputs: [
      selectInput('priorHru', 'History of ED visit or hospital admission due to hypoglycemia', [
        { label: '0 episodes', value: 0 },
        { label: '1–2 episodes', value: 1 },
        { label: '≥3 episodes', value: 3 },
      ], 0, 'Count episodes with a primary ED diagnosis of hypoglycemia or a principal hospital diagnosis of hypoglycemia (prebaseline period per the model).'),
      selectInput('edVisits', 'ED encounters for ANY reason in the prior 12 months', [
        { label: '<2', value: 0 },
        { label: '≥2', value: 2 },
      ], 0, 'All-cause emergency department use in the prior year — <2 vs ≥2 encounters.'),
      yesNo('insulin', 'Current insulin use', null, 'Insulin dispensed within the model baseline window — a major driver of severe hypoglycemia risk.', true),
      yesNo('sulfonylurea', 'Current sulfonylurea use', null, 'Sulfonylurea (glipizide, glyburide, glimepiride, gliclazide) dispensed within the baseline window.', false),
      yesNo('severeCkd', 'Severe or end-stage kidney disease (CKD stage 4–5, eGFR ≤29, or dialysis)', null, 'CKD stage 4 or 5 (eGFR ≤29 mL/min/1.73 m²) or dialysis — impairs insulin/sulfonylurea clearance and counterregulation.', false),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 70, helpText: 'Age <77 years is the risk split in the published model (younger age was associated with higher utilization risk in this cohort).' }),
    ],
    calculate(values) {
      const prior = num(values.priorHru, 0); // 0 | 1 (1-2) | 3 (>=3)
      const ed2 = num(values.edVisits, 0) === 2;
      const insulin = bool(values.insulin);
      const su = bool(values.sulfonylurea);
      const ckd = bool(values.severeCkd);
      const young = num(values.age, 80) < 77;

      // Reconstruction of the published classification-tree checklist.
      let level: 'high' | 'intermediate' | 'low';
      let reason = '';
      if (prior >= 3 || (prior >= 1 && insulin)) {
        level = 'high';
        reason = prior >= 3 ? '≥3 prior hypoglycemia-related episodes' : 'prior hypoglycemia-related episodes on insulin';
      } else if (prior >= 1) {
        level = 'intermediate';
        reason = '1–2 prior episodes without insulin';
      } else if (ed2 && (insulin || su || ckd)) {
        level = 'intermediate';
        reason = 'frequent ED use plus medication/renal risk';
      } else if (ed2 && young) {
        level = 'intermediate';
        reason = 'frequent ED use under age 77';
      } else if (insulin && (ckd || young)) {
        level = 'intermediate';
        reason = 'insulin use with additional risk (CKD and/or age <77)';
      } else if (su && ckd) {
        level = 'intermediate';
        reason = 'sulfonylurea with severe kidney disease';
      } else {
        level = 'low';
        reason = 'no significant risk-factor combination';
      }
      const map = {
        high: {
          level: 'high' as const,
          label: 'High risk (>5% predicted 12-mo risk)',
          interpretation: `High risk (${reason}): predicted >5% 12-month risk of hypoglycemia-related ED/hospital use (observed ~6.7% in validation). Candidate for targeted intervention: regimen review/deprescribing, CGM, glucagon prescription, pharmacist or nurse care-manager referral.`,
        },
        intermediate: {
          level: 'moderate' as const,
          label: 'Intermediate risk (1–5%)',
          interpretation: `Intermediate risk (${reason}): predicted 1–5% 12-month risk (observed ~1.4%). Review hypoglycemia history at visits; simplify regimen if recurrent events; ensure patient and family know hypoglycemia treatment.`,
        },
        low: {
          level: 'low' as const,
          label: 'Low risk (<1%)',
          interpretation: `Low risk (${reason}): predicted <1% 12-month risk (observed ~0.2%). Routine hypoglycemia education; reassess if therapy intensifies or renal function declines.`,
        },
      }[level];
      return {
        score: level === 'high' ? 'High' : level === 'intermediate' ? 'Intermediate' : 'Low',
        label: map.label,
        interpretation: map.interpretation,
        riskLevel: map.level,
        details: [
          { label: 'Prior hypoglycemia-related ED/hospital episodes', value: prior >= 3 ? '≥3' : prior >= 1 ? '1–2' : '0' },
          { label: 'All-cause ED visits (12 mo)', value: ed2 ? '≥2' : '<2' },
          { label: 'Insulin / sulfonylurea', value: `${insulin ? 'Yes' : 'No'} / ${su ? 'Yes' : 'No'}` },
          { label: 'Severe CKD (stage 4–5/dialysis)', value: ckd ? 'Yes' : 'No' },
          { label: 'Age <77', value: young ? 'Yes' : 'No' },
        ],
        recommendations: [
          'High risk → simplify/de-intensify regimen where appropriate, prescribe glucagon, consider CGM, pharmacist outreach',
          'Intermediate → review episodes, adjust agents with hypoglycemia risk, patient/family education',
          'Low → routine education; rescreen after regimen changes',
        ],
      };
    },
    evidence: {
      summary:
        'Karter et al. (JAMA Intern Med 2017) recursive-partitioning tool using 6 EMR inputs: prior hypoglycemia-related utilization (0, 1–2, ≥3), all-cause ED visits (<2, ≥2), insulin, sulfonylurea, severe/end-stage kidney disease (CKD 4–5/eGFR ≤29/dialysis), and age <77 — stratifying 12-month hypoglycemia-related utilization as high (>5%), intermediate (1–5%), or low (<1%).',
      formula: 'Classification-tree checklist (10 leaf nodes); high = ≥3 prior episodes OR any prior episode on insulin',
      validation:
        'C statistic 0.83 internal (KPNC), 0.81 VA, 0.79 Group Health; observed rates 6.7%/1.4%/0.2% for high/intermediate/low. Revalidated with ICD-10 codes (Diabetes Care 2019). The published high-risk rule is explicit (≥3 prior episodes; insulin users with any prior episode); intermediate-vs-low leaf assignment here is a faithful reconstruction of the published tree description — verify leaf-level boundaries against the official Kaiser tool for operational use.',
      references: [
        {
          title: 'Development and Validation of a Tool to Identify Patients With Type 2 Diabetes at High Risk of Hypoglycemia-Related Emergency Department or Hospital Use',
          citation: 'Karter AJ, Warton EM, Lipska KJ, et al. JAMA Intern Med. 2017',
          year: 2017,
          pmid: '28828479',
          doi: '10.1001/jamainternmed.2017.3844',
        },
        {
          title: 'Revalidation of the Hypoglycemia Risk Stratification Tool Using ICD-10 Codes',
          citation: 'Karter AJ et al. Diabetes Care. 2019',
          year: 2019,
          doi: '10.2337/dc18-2154',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk', actions: ['Regimen simplification/deprescribing review (especially sulfonylurea and prandial insulin)', 'Prescribe glucagon', 'Consider CGM', 'Clinical pharmacist or care-manager referral', 'Address psychosocial/socioeconomic factors'] },
      { condition: 'Intermediate', actions: ['Review hypoglycemia history at each visit', 'Educate patient and family on recognition and treatment', 'Reassess after medication changes'] },
      { condition: 'Low', actions: ['Routine hypoglycemia education', 'Rescreen periodically'] },
    ],
    pearls: [
      'Predicts hypoglycemia-related ED/hospital USE — most severe hypoglycemia never reaches the ED (>95% of events go undocumented).',
      'Insulin users with ANY prior hypoglycemia-related utilization are automatically high risk.',
      'Age <77 (not older age) was the risk split in this all-comer T2D cohort.',
      'Designed for EMR automation; use clinical judgment at the bedside.',
    ],
  },

  // ─── 9. DKA-MPM ────────────────────────────────────────────────────────────
  {
    id: 'dka-mpm',
    name: 'Diabetic Ketoacidosis Mortality Prediction Model (DKA-MPM) Score',
    shortName: 'DKA-MPM',
    description:
      'Efstathiou 6-item integer score for in-hospital DKA mortality using variables at presentation (severe comorbidities, pH <7.0), 12 h (insulin requirement >50 U, glucose >300 mg/dL), and 24 h (depressed mental state, fever).',
    category: 'endocrinology',
    tags: ['dka', 'diabetes', 'ketoacidosis', 'mortality', 'icu', 'prognosis'],
    whenToUse: 'Hospitalized patients with DKA during the first 24 hours of admission — items accrue at presentation, 12 h, and 24 h.',
    whyUse:
      'Simple bedside prognostic score: 0–14 points carried ~0.9% mortality in derivation vs ~93% at 19–25 points. Helps flag patients needing the highest level of monitoring — though not externally validated; APACHE II may predict mortality better.',
    inputs: [
      yesNo('comorbid', 'Severe comorbidities at presentation (immunosuppression, previous MI, COPD, cirrhosis, CHF, previous stroke)', 6, 'Any of: immunosuppression, prior myocardial infarction, COPD, cirrhosis, congestive heart failure, or previous stroke — the heaviest item (+6).', false),
      yesNo('ph', 'pH <7.0 at presentation', 4, 'Arterial (or venous-equivalent) pH below 7.0 on admission.', true),
      yesNo('insulin50', '>50 units regular insulin required over first 12 hr', 4, 'More than 50 units of regular insulin needed during the first 12 hours of treatment — a marker of severe/resistant ketoacidosis.', false),
      yesNo('glucose12', 'Serum glucose >300 mg/dL (16.7 mmol/L) after 12 hr', 4, 'Failure of glucose to fall below 300 mg/dL (16.7 mmol/L) by 12 hours of treatment.', false),
      yesNo('mental', 'Depressed mental state after 24 hr', 4, 'Depressed level of consciousness at 24 hours as determined by the examiner.', false),
      yesNo('fever', 'Fever after 24 hr (axillary ≥38°C / 100.4°F)', 3, 'Axillary temperature ≥38°C (100.4°F) at 24 hours — suggests superimposed infection.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.comorbid) ? 6 : 0) +
        (bool(values.ph) ? 4 : 0) +
        (bool(values.insulin50) ? 4 : 0) +
        (bool(values.glucose12) ? 4 : 0) +
        (bool(values.mental) ? 4 : 0) +
        (bool(values.fever) ? 3 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 14,
          level: 'low',
          label: 'Low predicted mortality (0–14)',
          interpretation: `DKA-MPM ${score}/25: in the derivation cohort, scores 0–14 carried ~0.86% in-hospital mortality. Continue standard DKA protocol and monitoring; treat the precipitant.`,
        },
        {
          max: 18,
          level: 'moderate',
          label: 'Intermediate predicted mortality (15–18)',
          interpretation: `DKA-MPM ${score}/25: intermediate band between the published extremes (~0.9% at 0–14 and ~93% at 19–25). Escalated monitoring is prudent; reassess trajectory of pH, glucose, and mental status.`,
        },
        {
          max: 25,
          level: 'critical',
          label: 'High predicted mortality (19–25)',
          interpretation: `DKA-MPM ${score}/25: in the derivation cohort, scores 19–25 carried ~93% in-hospital mortality. ICU-level care, aggressive correction, and early goals-of-care discussion as appropriate.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Points at presentation', value: `${(bool(values.comorbid) ? 6 : 0) + (bool(values.ph) ? 4 : 0)}` },
          { label: 'Points at 12 hr', value: `${(bool(values.insulin50) ? 4 : 0) + (bool(values.glucose12) ? 4 : 0)}` },
          { label: 'Points at 24 hr', value: `${(bool(values.mental) ? 4 : 0) + (bool(values.fever) ? 3 : 0)}` },
        ],
        recommendations: [
          'Score ≥15 → ensure ICU-level monitoring; re-evaluate response to therapy',
          'Search for and treat the precipitant (infection, nonadherence, new diabetes, infarction)',
          'Not externally validated — use alongside clinical judgment; APACHE II is an alternative mortality predictor',
        ],
      };
    },
    evidence: {
      summary:
        'DKA-MPM (Efstathiou et al. 2002): 6 (severe coexisting disease at presentation) + 4 (pH <7.0 at presentation) + 4 (regular insulin >50 IU in first 12 h) + 4 (glucose >16.7 mmol/L after 12 h) + 4 (depressed mental state after 24 h) + 3 (fever after 24 h). Range 0–25. Derivation: 0–14 → 0.86% mortality; 19–25 → 93.3%.',
      formula: 'Sum of six weighted items across three time points',
      validation:
        'Retrospective single-center derivation (154 DKA admissions, 13% mortality); stratification correlated with APACHE III (p<0.001). NOT externally validated — the published extremes (0–14 vs 19–25) are reported; the 15–18 band is interpolated as intermediate. Not intended to routinely disposition patients.',
      references: [
        {
          title: 'A mortality prediction model in diabetic ketoacidosis',
          citation: 'Efstathiou SP, Tsioulos DI, Tsiakou AG, et al. Clin Endocrinol (Oxf). 2002',
          year: 2002,
          pmid: '12390332',
          doi: '10.1046/j.1365-2265.2002.01636.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 19–25', actions: ['ICU-level care', 'Aggressive treatment of DKA and precipitant', 'Frequent reassessment; consider goals-of-care discussion'] },
      { condition: 'Score 15–18', actions: ['Escalated monitoring', 'Re-evaluate insulin requirement and glucose trajectory', 'Investigate persistent altered mental status'] },
      { condition: 'Score 0–14', actions: ['Standard DKA protocol', 'Identify/treat precipitant', 'Transition planning once anion gap closes'] },
    ],
    pearls: [
      'Items accrue over time — the score is only complete at 24 h.',
      'Severe comorbidities outweigh any single physiologic item (+6).',
      'Persistent hyperglycemia and high insulin requirement at 12 h are warning signs, not just admission severity.',
      'Derived retrospectively in one center — treat as adjunct, not disposition rule.',
    ],
  },

  // ─── 10. PONS ──────────────────────────────────────────────────────────────
  {
    id: 'pons',
    name: 'Perioperative Nutrition Screen (PONS)',
    shortName: 'PONS',
    description:
      'Quick perioperative malnutrition-risk screen: any ONE of low BMI (age-adjusted), >10% weight loss in 6 months, <50% intake for a week, or albumin <3.0 g/dL identifies high nutrition risk.',
    category: 'surgery',
    tags: ['nutrition', 'perioperative', 'pons', 'malnutrition', 'albumin', 'weight loss', 'poqi', 'aser'],
    whenToUse: 'Preoperative screening before major surgery — a single positive criterion triggers comprehensive nutrition assessment and a perioperative nutrition plan.',
    whyUse:
      'Perioperative malnutrition increases complications, infection, and length of stay. PONS is deliberately simple so every surgical patient can be screened; any positive criterion should prompt dietitian referral.',
    inputs: [
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 10, max: 80, step: 0.1, exampleValue: 19, helpText: 'BMI <18.5 kg/m² is a positive criterion; for patients >65 years the cutoff is raised to <20 kg/m².', required: true }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 70, helpText: 'Age >65 changes the BMI criterion from <18.5 to <20 kg/m² (intentional age adjustment).' }),
      yesNo('wtLoss', 'Unplanned weight loss >10% in past 6 months', null, 'Unintentional loss of more than 10% of body weight within the previous 6 months.', false),
      yesNo('intake', 'Eating <50% of normal diet in the preceding week', null, 'Oral intake reduced below half of normal for at least the past week.', false),
      numberInput('albumin', 'Preoperative serum albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, exampleValue: 3.4, helpText: 'Albumin <3.0 g/dL is a positive criterion (use g/dL; g/L ÷ 10).' }),
    ],
    calculate(values) {
      const bmi = num(values.bmi, 25);
      const age = num(values.age, 60);
      const bmiCut = age > 65 ? 20 : 18.5;
      const positives: string[] = [];
      if (bmi < bmiCut) positives.push(`BMI ${bmi} < ${bmiCut} kg/m²${age > 65 ? ' (age-adjusted)' : ''}`);
      if (bool(values.wtLoss)) positives.push('unplanned weight loss >10% in 6 months');
      if (bool(values.intake)) positives.push('eating <50% of normal diet for a week');
      if (num(values.albumin, 4) < 3.0) positives.push(`albumin ${num(values.albumin, 4)} < 3.0 g/dL`);
      const positive = positives.length > 0;
      return {
        score: positives.length,
        unit: 'positive criteria',
        label: positive ? 'Positive screen — high nutrition risk' : 'Negative screen',
        interpretation: positive
          ? `PONS POSITIVE (${positives.join('; ')}). Any single positive criterion identifies high perioperative nutrition risk — refer to a registered dietitian for comprehensive assessment and a perioperative nutrition plan.`
          : 'PONS negative — no screening criterion met. Continue routine care; rescreen if status changes or for high-risk procedures.',
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'BMI criterion', value: bmi < bmiCut ? `Positive (<${bmiCut})` : 'Negative' },
          { label: 'Weight loss', value: bool(values.wtLoss) ? 'Positive' : 'Negative' },
          { label: 'Reduced intake', value: bool(values.intake) ? 'Positive' : 'Negative' },
          { label: 'Albumin', value: num(values.albumin, 4) < 3.0 ? `Positive (${num(values.albumin, 4)})` : 'Negative' },
        ],
        recommendations: positive
          ? [
              'Registered-dietitian consult for comprehensive assessment',
              'Minimize/avoid preoperative fasting; early postoperative feeding when appropriate',
              'High-protein oral nutritional supplements; enteral nutrition if oral intake inadequate',
              'Parenteral nutrition only if enteral route cannot meet goals',
            ]
          : ['Routine perioperative nutrition care', 'Rescreen if weight or intake changes'],
      };
    },
    evidence: {
      summary:
        'PONS (ASER/POQI joint consensus, Wischmeyer et al. 2018): positive screen if ANY of — BMI <18.5 kg/m² (<20 if age >65), unintentional weight loss >10% in 6 months, intake <50% of normal in the preceding week, or preoperative albumin <3.0 g/dL. Any positive criterion → high nutrition risk → dietitian referral.',
      formula: 'ANY of 4 criteria positive (BMI cutoff 18.5, or 20 if >65 y)',
      validation:
        'Consensus statement recommendation derived from ESPEN/ASPEN malnutrition frameworks; items track with validated malnutrition definitions. The age-adjusted BMI cutoff of 20 kg/m² for patients >65 is intentional.',
      references: [
        {
          title: 'American Society for Enhanced Recovery and Perioperative Quality Initiative Joint Consensus Statement on Nutrition Screening and Therapy Within a Surgical Enhanced Recovery Pathway',
          citation: 'Wischmeyer PE, Carli F, Evans DC, et al. Anesth Analg. 2018',
          year: 2018,
          pmid: '29369092',
          doi: '10.1213/ANE.0000000000002743',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any positive criterion', actions: ['Dietitian referral', 'Perioperative nutrition plan (supplements/enteral/parenteral as needed)', 'Consider delaying elective surgery for optimization when feasible'] },
      { condition: 'Negative screen', actions: ['Routine ERAS nutrition measures', 'Avoid prolonged fasting; carbohydrate loading per protocol where used'] },
    ],
    pearls: [
      'A SINGLE positive criterion is enough — do not wait for multiple flags.',
      'The BMI cutoff is intentionally higher (<20) for patients over 65.',
      'Albumin reflects inflammation as much as nutrition — interpret with the whole picture.',
      'Screen BEFORE surgery so there is time for prehabilitation nutrition.',
    ],
  },

  // ─── 11. Nutritional Risk Index (NRI) ─────────────────────────────────────
  {
    id: 'nutritional-risk-index',
    name: 'Nutritional Risk Index (NRI)',
    shortName: 'NRI',
    description:
      'Quantifies malnutrition severity as NRI = 1.519 × albumin (g/L) + 41.7 × (present/usual weight); >100 no risk, 97.5–100 mild, 83.5–97.5 moderate, <83.5 severe.',
    category: 'general',
    tags: ['nutrition', 'nri', 'malnutrition', 'albumin', 'weight loss', 'surgery', 'geri'],
    whenToUse: 'Hospitalized or surgical patients when serum albumin and current vs usual (6-month stable) weight are available — an objective malnutrition severity measure.',
    whyUse:
      'Simple two-variable index validated across surgical, medical, geriatric, and critical-care populations; correlates with complications, mortality, and length of stay.',
    inputs: [
      numberInput('albumin', 'Serum albumin', {
        unit: 'g/L',
        min: 5,
        max: 60,
        step: 0.1,
        exampleValue: 35,
        helpText: 'Enter albumin in g/L (g/dL × 10 — e.g., 3.5 g/dL = 35 g/L). The published formula uses g/L.',
      }),
      numberInput('presentWeight', 'Present weight', {
        unit: 'kg',
        unitKind: 'weight',
        min: 25,
        max: 300,
        step: 0.1,
        exampleValue: 60,
        helpText: 'Current body weight.',
      }),
      numberInput('usualWeight', 'Usual weight (stable weight over last 6 months)', {
        unit: 'kg',
        unitKind: 'weight',
        min: 25,
        max: 300,
        step: 0.1,
        exampleValue: 70,
        helpText: 'Usual/stable body weight over the past ~6 months. If present weight exceeds usual, the weight ratio is capped at 1 (weight gain does not indicate malnutrition by this tool).',
      }),
    ],
    calculate(values) {
      const alb = num(values.albumin, 40);
      const present = num(values.presentWeight, 70);
      const usual = Math.max(num(values.usualWeight, 70), 1);
      const ratio = Math.min(present / usual, 1); // cap at 1 — weight gain is not malnutrition
      const nri = round(1.519 * alb + 41.7 * ratio, 1);
      const r = riskFromThresholds(nri, [
        {
          max: 83.49,
          level: 'critical',
          label: 'Severe malnutrition risk (<83.5)',
          interpretation: `NRI ${nri}: severe nutritional risk — associated with markedly increased morbidity/mortality. Urgent dietitian assessment and nutritional support indicated.`,
        },
        {
          max: 97.49,
          level: 'high',
          label: 'Moderate malnutrition risk (83.5–97.5)',
          interpretation: `NRI ${nri}: moderate nutritional risk. Dietitian assessment and nutritional optimization recommended, particularly before surgery or during prolonged admission.`,
        },
        {
          max: 99.99,
          level: 'moderate',
          label: 'Mild malnutrition risk (97.5–100)',
          interpretation: `NRI ${nri}: mild nutritional risk — borderline reserve. Consider oral nutritional supplementation and monitoring.`,
        },
        {
          max: 200,
          level: 'low',
          label: 'No malnutrition risk (≥100)',
          interpretation: `NRI ${nri}: no nutritional risk identified by this index. Routine monitoring in at-risk populations.`,
        },
      ]);
      return {
        score: nri,
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Albumin', value: `${alb} g/L` },
          { label: 'Weight ratio (present/usual, capped at 1)', value: `${round(ratio * 100, 1)}%` },
          { label: 'Formula', value: `1.519 × ${alb} + 41.7 × ${round(ratio, 3)}` },
        ],
        recommendations: [
          'NRI <100 → dietitian consultation and nutrient-dense diet/supplements',
          'NRI <97.5 → formal nutrition assessment; consider enteral support if oral intake inadequate',
          'Albumin is also an inflammation marker — combine with clinical assessment (e.g., GLIM criteria)',
        ],
      };
    },
    evidence: {
      summary:
        'NRI (VA TPN Cooperative Study, Buzby et al.): NRI = 1.519 × serum albumin (g/L) + 41.7 × (present weight / usual weight). Bands: ≥100 no risk; 97.5–100 mild; 83.5–97.5 moderate; <83.5 severe malnutrition risk.',
      formula: 'NRI = 1.519 × albumin (g/L) + 41.7 × (present/usual weight)',
      validation:
        'Derived to stratify malnutrition in the VA TPN Cooperative Study and subsequently validated in many surgical and medical cohorts. Note the formula uses albumin in g/L (equivalently 15.19 × g/dL). Present/usual weight ratio is capped at 1 because weight gain is not malnutrition.',
      references: [
        {
          title: 'Perioperative total parenteral nutrition in surgical patients (The Veterans Affairs Total Parenteral Nutrition Cooperative Study Group)',
          citation: 'N Engl J Med. 1991',
          year: 1991,
          pmid: '1906987',
        },
      ],
    },
    nextSteps: [
      { condition: 'NRI <83.5', actions: ['Urgent dietitian/nutrition support team referral', 'Consider enteral or parenteral support if oral intake inadequate', 'Address underlying illness driving inflammation'] },
      { condition: 'NRI 83.5–97.5', actions: ['Dietitian assessment', 'Oral nutritional supplements', 'Weekly weight and intake monitoring'] },
      { condition: 'NRI ≥97.5', actions: ['Routine monitoring', 'Encourage adequate protein intake'] },
    ],
    pearls: [
      'Enter albumin in g/L — 4.0 g/dL = 40 g/L. Using g/dL with the 1.519 coefficient underestimates NRI drastically.',
      'If present weight exceeds usual, the ratio caps at 1 — NRI then reflects albumin alone.',
      'Low albumin in acute illness often reflects inflammation, not pure malnutrition.',
      'Pairs well with GLIM criteria for a formal malnutrition diagnosis.',
    ],
  },

  // ─── 12. OS-MRS ────────────────────────────────────────────────────────────
  {
    id: 'os-mrs',
    name: 'Obesity Surgery Mortality Risk Score (OS-MRS)',
    shortName: 'OS-MRS',
    description:
      '5-point score predicting mortality risk in gastric bypass surgery — BMI ≥50, male sex, hypertension, pulmonary embolism risk factors, and age ≥45; classes A (0–1), B (2–3), C (4–5).',
    category: 'surgery',
    tags: ['bariatric', 'gastric bypass', 'obesity', 'surgery', 'mortality', 'os-mrs', 'demaria'],
    whenToUse: 'Preoperative risk stratification of patients being considered for gastric bypass/bariatric surgery.',
    whyUse:
      'Simple validated score separating patients into low (A), intermediate (B), and high (C) mortality classes — supports informed consent, procedure choice, and preoperative optimization.',
    inputs: [
      yesNo('bmi50', 'BMI ≥50 kg/m²', 1, 'Body mass index at or above 50 kg/m².', true),
      yesNo('male', 'Male gender', 1, 'Male sex is an independent risk factor in the derivation cohort.', true),
      yesNo('htn', 'Hypertension', 1, 'Documented hypertension or antihypertensive treatment.', false),
      yesNo('peRisk', 'Risk of pulmonary embolism (OHS, venous stasis ulcers, previous PE, and/or previous IVC filter)', 1, 'Any of: obesity hypoventilation syndrome, venous stasis ulcers, previous pulmonary embolism, or previous IVC filter — surrogates for thromboembolic risk.', false),
      yesNo('age45', 'Age ≥45 years', 1, 'Age 45 years or older at the time of surgery.', true),
    ],
    calculate(values) {
      const score =
        (bool(values.bmi50) ? 1 : 0) +
        (bool(values.male) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0) +
        (bool(values.peRisk) ? 1 : 0) +
        (bool(values.age45) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Class A — low mortality risk (0–1)',
          interpretation: `OS-MRS ${score}: Class A — lowest mortality band (~0.2–0.3% in derivation/validation cohorts). Standard perioperative pathway appropriate.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Class B — intermediate mortality risk (2–3)',
          interpretation: `OS-MRS ${score}: Class B — intermediate mortality (~1.1–1.9% in published cohorts). Optimize modifiable factors; counsel on elevated risk.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'Class C — highest mortality risk (4–5)',
          interpretation: `OS-MRS ${score}: Class C — highest mortality band (~2.4–4.8% in published cohorts). Consider risk-reduction strategies: lower-risk procedure, staged approach, or preoperative BMI reduction.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Risk class', value: score <= 1 ? 'A' : score <= 3 ? 'B' : 'C' },
          { label: 'Factors present', value: `${score}/5` },
        ],
        recommendations: [
          'Class C → consider lower-risk procedure, staged treatment, or preoperative weight/BMI reduction',
          'Optimize OHS/VTE risk: CPAP adherence, thromboprophylaxis planning, IVC filter review',
          'Use for counseling — not to categorically deny surgery; benefits may outweigh risks case-by-case',
        ],
      };
    },
    evidence: {
      summary:
        'OS-MRS (DeMaria et al. 2007): one point each for BMI ≥50 kg/m², male sex, hypertension, pulmonary embolism risk (OHS, venous stasis ulcers, previous PE, prior IVC filter), and age ≥45. Class A 0–1, B 2–3, C 4–5. Published mortality: A ~0.2–0.3%, B ~1.1–1.9%, C ~2.4–4.8%.',
      formula: 'Sum of five 1-point factors (0–5)',
      validation:
        'Derived in 2,075 gastric bypass patients and validated on a 4,431-patient multi-institutional cohort with preserved class separation. Mortality estimates are from the original era of predominantly open/early-laparoscopic bypass — absolute rates may be lower in contemporary practice.',
      references: [
        {
          title: 'Obesity surgery mortality risk score: proposal for a clinically useful score to predict mortality risk in patients undergoing gastric bypass',
          citation: 'DeMaria EJ, Portenier D, Wolfe L. Surg Obes Relat Dis. 2007',
          year: 2007,
          pmid: '17386341',
          doi: '10.1016/j.soard.2007.01.005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class C (4–5)', actions: ['Discuss elevated mortality explicitly in consent', 'Consider staged/lower-risk procedure or preoperative weight loss', 'Aggressive VTE prophylaxis and OHS management'] },
      { condition: 'Class B (2–3)', actions: ['Optimize hypertension and comorbidities', 'Standard enhanced-recovery bariatric pathway with counseling'] },
      { condition: 'Class A (0–1)', actions: ['Standard perioperative pathway'] },
    ],
    pearls: [
      'The "PE risk" item bundles OHS, venous stasis ulcers, prior PE, and prior IVC filter — any one scores the point.',
      'Originally derived for gastric bypass; absolute mortality rates in modern laparoscopic practice are lower.',
      'A simple score for the consent discussion — not a gatekeeper for surgery.',
    ],
  },

  // ─── 13. Edmonton Obesity Staging System (EOSS) ────────────────────────────
  {
    id: 'eoss',
    name: 'Edmonton Obesity Staging System (EOSS)',
    shortName: 'EOSS',
    description:
      'Functional obesity staging (0–4) from three domains — obesity-related medical risk factors, physical/functional limitations, and psychological symptoms; the stage is the highest domain grade.',
    category: 'endocrinology',
    tags: ['obesity', 'eoss', 'staging', 'bariatric', 'functional status', 'sharma'],
    whenToUse: 'Patients with overweight/obesity to stage health impact beyond BMI — guides treatment intensity, bariatric surgery prioritization, and counseling.',
    whyUse:
      'EOSS predicts mortality better than BMI class alone: stages 2–4 carry progressively higher mortality and postoperative risk, refocusing treatment on health impairment rather than weight alone.',
    inputs: [
      selectInput('medical', 'Obesity-related risk factors', [
        { label: 'None', value: 0, points: 0, description: 'No obesity-related risk factors' },
        { label: 'Subclinical (e.g., borderline hypertension, impaired fasting glucose)', value: 1, points: 1, description: 'Risk factors present but below treatment thresholds' },
        { label: 'Established (risk factors requiring medical intervention — HTN, T2DM, sleep apnea, etc.)', value: 2, points: 2, description: 'Comorbidities needing treatment' },
        { label: 'Significant (end-organ damage — MI, heart failure, diabetes complications)', value: 3, points: 3, description: 'Established end-organ damage' },
        { label: 'Severe (potentially end-stage obesity-related medical conditions)', value: 4, points: 4, description: 'End-stage disease' },
      ], 0, 'Grade the most severe obesity-related medical/risk-factor status (0–4).'),
      selectInput('functional', 'Physical symptoms or functional limitations', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild (some dyspnea on exertion, occasional aches, fatigue)', value: 1, points: 1 },
        { label: 'Moderate (some limitations in daily activity)', value: 2, points: 2 },
        { label: 'Significant (unable to work or complete routine activities)', value: 3, points: 3 },
        { label: 'Severe (disabling functional limitations)', value: 4, points: 4 },
      ], 0, 'Grade functional limitation from weight-related symptoms (0–4).'),
      selectInput('psych', 'Psychological symptoms', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild (impaired sense of well-being, without impact on quality of life)', value: 1, points: 1 },
        { label: 'Moderate (depression, anxiety, eating disorders; quality of life beginning to be impacted)', value: 2, points: 2 },
        { label: 'Significant (major depression, suicidal ideation; quality of life significantly impacted)', value: 3, points: 3 },
        { label: 'Severe (disabling psychological symptoms)', value: 4, points: 4 },
      ], 0, 'Grade weight-related psychological/psychiatric burden (0–4).'),
    ],
    calculate(values) {
      const med = num(values.medical, 0);
      const fun = num(values.functional, 0);
      const psy = num(values.psych, 0);
      const stage = Math.max(med, fun, psy);
      const stageInfo = [
        {
          level: 'low' as const,
          label: 'EOSS Stage 0 — no apparent obesity-related risk',
          interpretation: 'Stage 0: no identifiable obesity-related risk factors, symptoms, or limitations. Identify contributors to weight gain; counsel on healthy eating and physical activity.',
          actions: 'Identify factors contributing to weight gain; lifestyle counseling.',
        },
        {
          level: 'low' as const,
          label: 'EOSS Stage 1 — subclinical risk',
          interpretation: 'Stage 1: subclinical risk factors or mild symptoms. Investigate non-weight contributors; implement more intensive lifestyle intervention and monitor risk factors.',
          actions: 'Intensive lifestyle intervention; monitor risk factors and health status.',
        },
        {
          level: 'moderate' as const,
          label: 'EOSS Stage 2 — established comorbidity',
          interpretation: 'Stage 2: established obesity-related comorbidities requiring intervention or moderate functional/psychological limitations. Initiate obesity treatment — consider behavioral, pharmacologic, and surgical options — and manage comorbidities.',
          actions: 'Initiate obesity treatment (behavioral ± pharmacologic ± surgical); closely manage comorbidities.',
        },
        {
          level: 'high' as const,
          label: 'EOSS Stage 3 — significant/end-organ damage',
          interpretation: 'Stage 3: end-organ damage or significant functional/psychological impairment — associated with increased mortality and postoperative complications. Intensive obesity treatment with aggressive comorbidity management.',
          actions: 'Intensive obesity treatment; aggressive comorbidity management; counsel on higher perioperative risk if surgery planned.',
        },
        {
          level: 'critical' as const,
          label: 'EOSS Stage 4 — severe/end-stage',
          interpretation: 'Stage 4: severe (potentially end-stage) obesity-related conditions or disabling limitations — highest mortality stratum. Aggressive management as feasible plus palliative measures (pain management, occupational therapy, psychosocial support).',
          actions: 'Aggressive obesity management as feasible; pain management, occupational therapy, psychosocial support.',
        },
      ][stage];
      return {
        score: stage,
        unit: 'stage',
        label: stageInfo.label,
        interpretation: `${stageInfo.interpretation} (Stage = highest of the three domains: medical ${med}, functional ${fun}, psychological ${psy}.)`,
        riskLevel: stageInfo.level,
        details: [
          { label: 'Medical/risk factors domain', value: `${med}` },
          { label: 'Physical/functional domain', value: `${fun}` },
          { label: 'Psychological domain', value: `${psy}` },
          { label: 'Proposed management', value: stageInfo.actions },
        ],
        recommendations: [
          'Stage guides treatment intensity — not BMI class alone',
          'Stages 3–4 carry higher postoperative complication and 30-day mortality risk — counsel, but do not use to categorically exclude bariatric surgery',
          'Reassess stage as comorbidities and function change',
        ],
      };
    },
    evidence: {
      summary:
        'EOSS (Sharma & Kushner 2009): three domains — medical risk factors, physical/functional limitations, psychological symptoms — each graded 0–4; the patient’s stage is the highest domain grade. Stage 0 none; 1 subclinical/mild; 2 established/moderate; 3 end-organ damage/significant; 4 severe/end-stage.',
      formula: 'Stage = max(medical, functional, psychological), each 0–4',
      validation:
        'Higher EOSS stages independently predict increased all-cause mortality in NHANES-linked analyses, improving on BMI classification. Stages 3–4 associated with higher postoperative complications and 30-day mortality after bariatric surgery.',
      references: [
        {
          title: 'A proposed clinical staging system for obesity',
          citation: 'Sharma AM, Kushner RF. Int J Obes (Lond). 2009',
          year: 2009,
          pmid: '19188927',
          doi: '10.1038/ijo.2009.2',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage 0–1', actions: ['Lifestyle intervention and monitoring', 'Investigate non-weight contributors to risk factors'] },
      { condition: 'Stage 2', actions: ['Formal obesity treatment — behavioral, pharmacologic, and/or surgical options', 'Manage comorbidities to target'] },
      { condition: 'Stage 3–4', actions: ['Intensive obesity treatment and aggressive comorbidity management', 'Multidisciplinary support (PT/OT, pain, psychosocial)', 'If surgery considered: counsel on higher complication/30-day mortality risk without excluding surgery'] },
    ],
    pearls: [
      'The stage is the WORST of three domains — a disabling psychological burden alone can make a patient stage 4.',
      'EOSS predicts mortality better than BMI class; two patients with identical BMI can be very different stages.',
      'High stage should intensify — not restrict — treatment; benefits of surgery often outweigh risks.',
      'Subclinical findings (borderline HTN, IFG) belong to stage 1, not 2.',
    ],
  },
];
