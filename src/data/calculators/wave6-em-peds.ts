import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave6EmPedsCalcs: Calculator[] = [
  // ─── 1. Kaiser EOS (simplified educational) ────────────────────────────────
  {
    id: 'neonatal-eos-kaiser',
    name: 'Kaiser Early-Onset Sepsis Calculator (Simplified Educational)',
    shortName: 'Kaiser EOS',
    description:
      'Educational simplification of multivariate early-onset sepsis risk factors (GA, ROM, GBS, intrapartum antibiotics, maternal fever) — not the official KP calculator.',
    category: 'pediatrics',
    tags: ['eos', 'neonatal sepsis', 'kaiser', 'newborn', 'gbs', 'early-onset'],
    whenToUse:
      'Term/late-preterm newborns when structuring EOS risk discussion; teaching risk factors that feed multivariate EOS models.',
    whyUse:
      'Highlights key antecedents of early-onset GBS/E. coli sepsis. This tool does not reproduce the full Kaiser Permanente online algorithm or absolute incidence estimates.',
    inputs: [
      numberInput('gaWeeks', 'Gestational age', { unit: 'weeks', min: 34, max: 43, step: 0.1, defaultValue: 39 }),
      numberInput('romHours', 'Duration of ROM', { unit: 'hours', min: 0, max: 120, step: 0.5, defaultValue: 6 }),
      numberInput('maxTemp', 'Highest maternal intrapartum temperature', {
        unit: '°C',
        min: 36,
        max: 42,
        step: 0.1,
        defaultValue: 37.2,
      }),
      selectInput('gbs', 'Maternal GBS status', [
        { label: 'Negative', value: 'neg' },
        { label: 'Positive', value: 'pos' },
        { label: 'Unknown', value: 'unk' },
      ]),
      selectInput('abx', 'Intrapartum antibiotics', [
        { label: 'Broad-spectrum ≥4 h before birth (GBS/EOS adequate)', value: 'adequate' },
        { label: 'GBS prophylaxis only ≥2–4 h (partial)', value: 'partial' },
        { label: 'None or <2 h before birth', value: 'none' },
      ]),
      yesNo('clinicalIllness', 'Newborn clinical illness (resp distress, hemodynamic instability, encephalopathy)', 3),
    ],
    calculate(values) {
      const ga = num(values.gaWeeks, 39);
      const rom = num(values.romHours, 6);
      const temp = num(values.maxTemp, 37.2);
      const gbs = String(values.gbs ?? 'neg');
      const abx = String(values.abx ?? 'none');
      let score = 0;
      // Educational point weighting approximating direction of KP factors
      if (ga < 37) score += 2;
      else if (ga < 38) score += 1;
      if (rom >= 18) score += 2;
      else if (rom >= 12) score += 1;
      if (temp >= 39) score += 3;
      else if (temp >= 38) score += 2;
      else if (temp >= 37.5) score += 1;
      if (gbs === 'pos') score += 2;
      else if (gbs === 'unk') score += 1;
      if (abx === 'none') score += 2;
      else if (abx === 'partial') score += 1;
      // adequate abx reduces score
      if (abx === 'adequate') score = Math.max(0, score - 2);
      if (bool(values.clinicalIllness)) score += 4;

      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower educational risk band',
          interpretation: `Simplified factor score ${score}. In well-appearing term infants with low multifactorial risk, many pathways use enhanced observation rather than empiric antibiotics — follow AAP/local EOS algorithm and the official Kaiser tool when used at your site.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate educational risk',
          interpretation: `Score ${score}: intermediate risk factors. Strongly consider formal EOS calculator incidence estimate, serial exams, and selective labs. Do not discharge early without a clear observation plan.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'Higher educational risk',
          interpretation: `Score ${score}: multiple risk factors. Evaluate closely; blood culture ± antibiotics per AAP framework and institutional protocol, especially if not fully well-appearing.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Ill newborn / very high concern',
          interpretation: `Score ${score}: clinical illness and/or stacked risk factors. Treat as possible EOS — full evaluation, cultures, and empiric antibiotics without delay for a score.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'GA', value: `${ga} wks` },
          { label: 'ROM', value: `${rom} h` },
          { label: 'Maternal Tmax', value: `${temp} °C` },
          { label: 'GBS', value: gbs },
          { label: 'IAP', value: abx },
          { label: 'Clinical illness', value: bool(values.clinicalIllness) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Use official KP EOS calculator + local incidence when available',
          'Clinical exam trumps numeric risk alone',
          'AAP 2018/2019 frameworks: categorical, EOS calculator, or enhanced observation pathways',
        ],
      };
    },
    evidence: {
      summary:
        'Multivariate EOS models (Kaiser Permanente) estimate early-onset sepsis risk from GA, ROM duration, GBS status, maternal fever, and antibiotic timing. This educational checklist does not output official probabilities.',
      formula: 'Weighted educational points for GA, ROM, Tmax, GBS, IAP, clinical illness',
      validation:
        'Puopolo/Escobar EOS calculator validated for risk stratification; this simplification is teaching-only and must not replace the published tool or institutional policy.',
      references: [
        {
          title: 'Estimating the probability of neonatal early-onset infection',
          citation: 'Puopolo KM et al. Pediatrics. 2011',
          year: 2011,
          pmid: '22025590',
          doi: '10.1542/peds.2010-3464',
        },
        {
          title: 'Management of neonates born at ≥35 weeks with suspected EOS',
          citation: 'Puopolo KM et al. Pediatrics. 2018 (AAP COFN)',
          year: 2018,
          pmid: '30455344',
          doi: '10.1542/peds.2018-2896',
        },
      ],
    },
    nextSteps: [
      { condition: 'Ill-appearing', actions: ['Cultures + empiric antibiotics', 'Supportive care', 'NICU evaluation'] },
      { condition: 'Well + low risk', actions: ['Serial exams', 'Parental education', 'Avoid unnecessary labs/antibiotics'] },
      { condition: 'Intermediate', actions: ['Formal EOS calc', 'Close observation ± limited labs per protocol'] },
    ],
    pearls: [
      'Maternal fever and inadequate IAP dominate risk; GA and ROM contribute continuously in full models.',
      'Never delay antibiotics in a sick neonate to complete a calculator.',
    ],
  },

  // ─── 2. Late-onset sepsis clinical checklist ───────────────────────────────
  {
    id: 'neonatal-los-checklist',
    name: 'Neonatal Late-Onset Sepsis Clinical Checklist',
    shortName: 'Neonatal LOS',
    description:
      'Structured clinical/risk checklist for suspected late-onset neonatal sepsis (LOS, typically >72 h of life) in NICU or nursery settings.',
    category: 'pediatrics',
    tags: ['late-onset sepsis', 'neonate', 'nicu', 'los', 'checklist'],
    whenToUse: 'Infants >72 hours of life with nonspecific signs that may represent LOS (apnea, feeding intolerance, temperature instability, etc.).',
    whyUse: 'LOS presentations are subtle; a checklist supports systematic assessment of clinical and risk domains before cultures/antibiotics.',
    inputs: [
      yesNo('tempInstab', 'Temperature instability (hypo/hyperthermia)', 1),
      yesNo('apneaBrady', 'New/increased apnea, bradycardia, or desaturations', 2),
      yesNo('resp', 'Respiratory distress or increased support need', 1),
      yesNo('feedIntol', 'Feeding intolerance, ileus, or abdominal concerns', 1),
      yesNo('perfusion', 'Poor perfusion, mottling, prolonged CRT, or hypotension', 2),
      yesNo('neuro', 'Lethargy, irritability, or abnormal tone/seizures', 2),
      yesNo('glucose', 'New glucose instability', 1),
      yesNo('clabsiRisk', 'Central line / recent invasive procedure / prolonged parenteral nutrition', 1),
      yesNo('prematurity', 'Very/extremely preterm or very low birth weight', 1),
      yesNo('priorAbx', 'Recent broad antibiotics / known colonization with resistant organisms', 1),
    ],
    calculate(values) {
      const keys = [
        'tempInstab',
        'apneaBrady',
        'resp',
        'feedIntol',
        'perfusion',
        'neuro',
        'glucose',
        'clabsiRisk',
        'prematurity',
        'priorAbx',
      ] as const;
      const weights: Record<string, number> = {
        tempInstab: 1,
        apneaBrady: 2,
        resp: 1,
        feedIntol: 1,
        perfusion: 2,
        neuro: 2,
        glucose: 1,
        clabsiRisk: 1,
        prematurity: 1,
        priorAbx: 1,
      };
      let score = 0;
      for (const k of keys) if (bool(values[k])) score += weights[k];
      const criticalSigns = bool(values.perfusion) || bool(values.neuro) || bool(values.apneaBrady);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Few features',
          interpretation: `Checklist score ${score}. Few LOS features — still reassess frequently; a single progressive sign (e.g., new apnea clusters) can warrant full evaluation.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Possible LOS',
          interpretation: `Score ${score}: concerning constellation. Strongly consider blood culture (± CSF/urine based on age/context), CBC/CRP or procalcitonin trends, and early antibiotics if trajectory worsening.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High clinical suspicion',
          interpretation: `Score ${score}: high suspicion for LOS. Obtain cultures promptly and start empiric antibiotics covering common LOS pathogens (CoNS, GBS, Gram-negatives, etc. per unit antibiogram).`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Severe / multi-domain concern',
          interpretation: `Score ${score}: multi-domain instability. Treat as sepsis/septic shock pathway — cultures, broad antibiotics, fluid/vasoactive support, and source control (line review).`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: criticalSigns && score >= 2 ? `${r.label} (cardiorespiratory/neuro flags)` : r.label,
        interpretation: r.interpretation,
        riskLevel: criticalSigns && score >= 4 ? 'critical' : r.riskLevel,
        details: [{ label: 'Cardiorespiratory/neuro flags', value: criticalSigns ? 'Present' : 'Absent' }],
        recommendations: [
          'Blood culture before antibiotics when feasible without delay',
          'Review lines, NEC, pneumonia, UTI, meningitis differentials',
          'Tailor coverage to local LOS epidemiology',
        ],
      };
    },
    evidence: {
      summary:
        'Late-onset neonatal sepsis is culture-proven or clinically diagnosed infection after ~72 h of life, often related to prematurity, central lines, and NICU exposures. Presentation is nonspecific.',
      formula: 'Weighted clinical + risk checklist (educational)',
      validation: 'Not a validated prediction rule; structured aid only. Culture remains the diagnostic gold standard for proven LOS.',
      references: [
        {
          title: 'Neonatal sepsis',
          citation: 'Shane AL et al. Lancet. 2017',
          year: 2017,
          pmid: '28434651',
          doi: '10.1016/S0140-6736(17)31002-4',
        },
        {
          title: 'Management of neonates with suspected or proven early-onset bacterial sepsis',
          citation: 'Polin RA et al. / AAP COFN guidance context for sepsis frameworks',
          year: 2012,
          pmid: '22547779',
          doi: '10.1542/peds.2012-0541',
        },
      ],
    },
    nextSteps: [
      { condition: 'High suspicion', actions: ['Cultures', 'Empiric antibiotics', 'Supportive care', 'Source search'] },
      { condition: 'Low score but parent/nurse concern', actions: ['Repeat exam', 'Trend vitals', 'Low threshold to escalate'] },
    ],
    pearls: [
      'CoNS is common in VLBW with lines but can be contaminant — interpret with clinical picture.',
      'NEC and LOS overlap; abdominal signs need parallel NEC evaluation.',
    ],
  },

  // ─── 3. Bell NEC staging ───────────────────────────────────────────────────
  {
    id: 'nec-bell-stage',
    name: 'Bell Staging for Necrotizing Enterocolitis',
    shortName: 'Bell NEC',
    description: 'Modified Bell staging (I–III) for suspected or confirmed neonatal necrotizing enterocolitis.',
    category: 'pediatrics',
    tags: ['nec', 'bell stage', 'neonate', 'necrotizing enterocolitis', 'nicu'],
    whenToUse: 'Preterm or at-risk neonates with feeding intolerance, bloody stools, abdominal findings, or radiographic concern for NEC.',
    whyUse: 'Standard communication framework for NEC severity guiding medical vs surgical pathways.',
    inputs: [
      selectInput('systemic', 'Systemic signs', [
        { label: 'None / mild temp or apnea instability only', value: 1 },
        { label: 'Moderate systemic illness (lethargy, apnea, bradycardia)', value: 2 },
        { label: 'Severe (shock, DIC, marked metabolic acidosis)', value: 3 },
      ]),
      selectInput('abdominal', 'Intestinal / abdominal signs', [
        { label: 'Gastric residuals, mild distension, or occult blood', value: 1 },
        { label: 'Marked distension, absent bowel sounds, gross blood', value: 2 },
        { label: 'Peritonitis, tenderness, mass, or discoloration of wall', value: 3 },
      ]),
      selectInput('imaging', 'Radiographic / imaging findings', [
        { label: 'Normal or mild ileus / intestinal dilation', value: 1 },
        { label: 'Pneumatosis intestinalis and/or portal venous gas', value: 2 },
        { label: 'Pneumoperitoneum (free air)', value: 3 },
      ]),
      yesNo('definitePneumatosis', 'Definite pneumatosis or portal gas documented', 1),
      yesNo('freeAir', 'Free intraperitoneal air', 1),
    ],
    calculate(values) {
      const sys = num(values.systemic, 1);
      const abd = num(values.abdominal, 1);
      const img = num(values.imaging, 1);
      const stageNum = Math.max(sys, abd, img);
      let stage = 'I';
      let label = 'Bell Stage I (suspected NEC)';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      let interpretation = '';

      if (bool(values.freeAir) || img === 3) {
        stage = 'IIIB';
        label = 'Bell Stage IIIB (advanced NEC with perforation)';
        riskLevel = 'critical';
        interpretation =
          'Findings consistent with advanced NEC and perforation. Emergent surgical consultation, resuscitation, NPO, NG decompression, broad antibiotics, and operative/percutaneous management per surgeon.';
      } else if (stageNum >= 3 || (bool(values.definitePneumatosis) && sys === 3)) {
        stage = 'IIIA';
        label = 'Bell Stage IIIA (advanced NEC, intact bowel wall)';
        riskLevel = 'critical';
        interpretation =
          'Advanced medical NEC pattern (severe systemic illness ± pneumatosis without free air). ICU-level care, medical NEC protocol, serial exams/films; surgery if deteriorates or perforation develops.';
      } else if (bool(values.definitePneumatosis) || img === 2 || (stageNum === 2 && abd >= 2)) {
        stage = 'II';
        label = 'Bell Stage II (definite NEC)';
        riskLevel = 'high';
        interpretation =
          'Definite NEC (classic pneumatosis/portal gas or clear clinical–radiographic correlation). NPO, decompression, antibiotics, supportive care, serial assessment for progression.';
      } else {
        stage = 'I';
        label = 'Bell Stage I (suspected NEC)';
        riskLevel = 'moderate';
        interpretation =
          'Suspected NEC / feeding intolerance pattern. Hold feeds, evaluate for alternate causes, consider limited workup and close observation; escalate if pneumatosis or clinical worsening.';
      }

      return {
        score: stage,
        unit: 'Bell stage',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Systemic domain', value: String(sys) },
          { label: 'Abdominal domain', value: String(abd) },
          { label: 'Imaging domain', value: String(img) },
        ],
        recommendations: [
          'NPO + gastric decompression for ≥ stage II',
          'Blood culture and broad antibiotics covering bowel flora',
          'Surgical consult early for stage III or fixed loop/portal gas with instability',
        ],
      };
    },
    evidence: {
      summary:
        'Bell staging (modified) classifies NEC from suspected (I) to definite (II) to advanced (III A/B), integrating systemic, intestinal, and radiographic criteria.',
      formula: 'Highest-domain severity + perforation flags → Stage I / II / IIIA / IIIB',
      validation: 'Widely used clinical-radiographic staging; guides communication more than precise prognosis alone.',
      references: [
        {
          title: 'Neonatal necrotizing enterocolitis: therapeutic decisions based upon clinical staging',
          citation: 'Bell MJ et al. Ann Surg. 1978',
          year: 1978,
          pmid: '413500',
          doi: '10.1097/00000658-197801000-00001',
        },
        {
          title: 'Modified Bell staging (Walsh & Kliegman and subsequent refinements)',
          citation: 'Walsh MC, Kliegman RM. Pediatr Clin North Am. 1986',
          year: 1986,
          pmid: '3086933',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage I', actions: ['Hold feeds', 'Close observation', 'Reimage if worsens'] },
      { condition: 'Stage II', actions: ['Medical NEC pathway', 'Antibiotics', 'Serial exams'] },
      { condition: 'Stage III', actions: ['Resuscitate', 'Surgical consult', 'OR/drain as indicated'] },
    ],
    pearls: [
      'Pneumatosis defines definite NEC for most practical purposes.',
      'Free air = IIIB until proven otherwise; do not wait for perfect labs.',
    ],
  },

  // ─── 4. Pediatric SIRS ─────────────────────────────────────────────────────
  {
    id: 'pediatric-sirs',
    name: 'Pediatric SIRS Criteria',
    shortName: 'Peds SIRS',
    description:
      'Age-adjusted systemic inflammatory response syndrome (SIRS) criteria used historically in pediatric sepsis definitions (Goldstein 2005 framework).',
    category: 'pediatrics',
    tags: ['sirs', 'pediatric sepsis', 'fever', 'tachycardia', 'goldstein'],
    whenToUse: 'Children with suspected infection when applying classic SIRS-based sepsis definitions (educational / legacy pathways).',
    whyUse: 'SIRS ≥2 criteria (must include temp or leukocyte abnormality in many pediatric definitions) flagged systemic inflammation; note Phoenix/Sepsis-3 evolution in newer frameworks.',
    inputs: [
      selectInput('ageBand', 'Age band (for vital thresholds)', [
        { label: 'Newborn 0–7 days', value: '0-7d' },
        { label: 'Neonate 8–30 days', value: '8-30d' },
        { label: 'Infant 1–12 months', value: 'infant' },
        { label: 'Toddler 1–5 years', value: 'toddler' },
        { label: 'School age 6–12 years', value: 'school' },
        { label: 'Adolescent 13–18 years', value: 'teen' },
      ]),
      numberInput('temp', 'Core temperature', { unit: '°C', min: 30, max: 43, step: 0.1, defaultValue: 38.5 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 40, max: 280, defaultValue: 140 }),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 5, max: 120, defaultValue: 30 }),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 100, step: 0.1, defaultValue: 14 }),
      yesNo('bands', 'Immature neutrophils (bands) >10%', 1),
      yesNo('mechVent', 'Mechanical ventilation for acute process (counts as respiratory criterion)', 1),
    ],
    calculate(values) {
      const age = String(values.ageBand ?? 'infant');
      const temp = num(values.temp, 38.5);
      const hr = num(values.hr, 140);
      const rr = num(values.rr, 30);
      const wbc = num(values.wbc, 14);
      // Approximate Goldstein age-specific abnormal HR/RR cutoffs (tachycardia / tachypnea upper limits)
      const cut: Record<string, { hr: number; rr: number; wbcLo: number; wbcHi: number }> = {
        '0-7d': { hr: 180, rr: 50, wbcLo: 5, wbcHi: 34 },
        '8-30d': { hr: 180, rr: 40, wbcLo: 5, wbcHi: 19.5 },
        infant: { hr: 180, rr: 34, wbcLo: 5, wbcHi: 17.5 },
        toddler: { hr: 140, rr: 22, wbcLo: 6, wbcHi: 15.5 },
        school: { hr: 130, rr: 18, wbcLo: 4.5, wbcHi: 13.5 },
        teen: { hr: 110, rr: 14, wbcLo: 4.5, wbcHi: 11 },
      };
      const c = cut[age] ?? cut.infant;
      const tempAbn = temp > 38.5 || temp < 36;
      const hrAbn = hr > c.hr; // bradycardia criterion mainly neonates — simplified
      const bradycardia = (age === '0-7d' || age === '8-30d') && hr < 100;
      const rrAbn = rr > c.rr || bool(values.mechVent);
      const wbcAbn = wbc > c.wbcHi || wbc < c.wbcLo || bool(values.bands);
      let criteria = 0;
      if (tempAbn) criteria++;
      if (hrAbn || bradycardia) criteria++;
      if (rrAbn) criteria++;
      if (wbcAbn) criteria++;
      const sirs = criteria >= 2 && (tempAbn || wbcAbn);
      const r = riskFromThresholds(criteria, [
        {
          max: 1,
          level: 'low',
          label: 'SIRS criteria not met',
          interpretation: `${criteria}/4 classic SIRS domains abnormal. Pediatric SIRS typically requires ≥2 criteria with at least abnormal temperature or leukocyte count.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: sirs ? 'SIRS present (2 criteria)' : '2 domains but missing temp/WBC rule',
          interpretation: sirs
            ? `SIRS criteria met (${criteria}/4). With suspected infection this was historically sepsis; evaluate organ dysfunction (SOFA/pSOFA/Phoenix) for severity.`
            : `Two domains abnormal but pediatric definitions often require temperature or WBC abnormality — confirm full criteria.`,
        },
        {
          max: 4,
          level: 'high',
          label: 'SIRS present (≥3 criteria)',
          interpretation: `SIRS with ${criteria}/4 domains. Assess perfusion, lactate, mental status, and infection source; apply modern pediatric sepsis criteria (e.g., Phoenix) for organ dysfunction.`,
        },
      ]);
      return {
        score: criteria,
        unit: 'criteria',
        label: sirs ? `SIRS yes (${criteria}/4)` : `SIRS no (${criteria}/4)`,
        interpretation: r.interpretation,
        riskLevel: sirs ? (criteria >= 3 ? 'high' : 'moderate') : 'low',
        details: [
          { label: 'Temperature abnormal', value: tempAbn ? 'Yes' : 'No' },
          { label: 'HR abnormal', value: hrAbn || bradycardia ? 'Yes' : 'No' },
          { label: 'RR / vent abnormal', value: rrAbn ? 'Yes' : 'No' },
          { label: 'WBC / bands abnormal', value: wbcAbn ? 'Yes' : 'No' },
          { label: 'Age HR cutoff used', value: `>${c.hr} bpm` },
          { label: 'Age RR cutoff used', value: `>${c.rr}/min` },
        ],
        recommendations: [
          'SIRS alone ≠ need for antibiotics — integrate infection likelihood',
          'Prefer organ-dysfunction-based sepsis definitions for severity',
          'Reassess vitals with age-norm tables at your institution',
        ],
      };
    },
    evidence: {
      summary:
        'Goldstein 2005 pediatric sepsis consensus used age-specific SIRS thresholds. Sepsis = SIRS + infection; severe sepsis/septic shock required organ dysfunction. Newer Phoenix criteria shift away from SIRS-centric definitions.',
      formula: '≥2 of: temp, HR, RR/vent, WBC/bands (with temp or WBC required)',
      validation: 'Historical standard; sensitive but nonspecific. Supplemented/superseded in research by organ-dysfunction scores.',
      references: [
        {
          title: 'International pediatric sepsis consensus conference: definitions',
          citation: 'Goldstein B et al. Pediatr Crit Care Med. 2005',
          year: 2005,
          pmid: '15636651',
          doi: '10.1097/01.PCC.0000149131.72248.E6',
        },
      ],
    },
    nextSteps: [
      { condition: 'SIRS + infection concern', actions: ['Cultures as indicated', 'Source control', 'Risk-stratify organ dysfunction'] },
      { condition: 'SIRS without clear infection', actions: ['Broader differential (trauma, inflammation, post-op)'] },
    ],
    pearls: [
      'Fever from viral illness commonly meets SIRS — clinical context is essential.',
      'Neonatal bradycardia can count toward SIRS cardiovascular criterion.',
    ],
  },

  // ─── 5. pSOFA simplified ───────────────────────────────────────────────────
  {
    id: 'psofa-simp',
    name: 'Pediatric SOFA (pSOFA) Simplified Educational',
    shortName: 'pSOFA simp',
    description:
      'Simplified educational pediatric Sequential Organ Failure Assessment-style score across respiratory, coag, liver, CV, CNS, and renal domains.',
    category: 'critical-care',
    tags: ['psofa', 'sofa', 'pediatric', 'organ dysfunction', 'sepsis'],
    whenToUse: 'PICU-style assessment of multi-organ dysfunction severity for teaching or structured documentation.',
    whyUse: 'pSOFA adapts SOFA to pediatric cutoffs; higher totals associate with mortality. This version uses coarse domain bins for education.',
    inputs: [
      selectInput('resp', 'Respiratory (PaO₂/FiO₂ or SpO₂/FiO₂ severity)', [
        { label: 'Normal / mild (0)', value: 0 },
        { label: 'Mild impairment (1)', value: 1 },
        { label: 'Moderate (2)', value: 2 },
        { label: 'Severe on support (3)', value: 3 },
        { label: 'Very severe / high support (4)', value: 4 },
      ]),
      selectInput('coag', 'Coagulation (platelets)', [
        { label: '≥150 (0)', value: 0 },
        { label: '100–149 (1)', value: 1 },
        { label: '50–99 (2)', value: 2 },
        { label: '20–49 (3)', value: 3 },
        { label: '<20 (4)', value: 4 },
      ]),
      selectInput('liver', 'Liver (bilirubin)', [
        { label: '<1.2 mg/dL (0)', value: 0 },
        { label: '1.2–1.9 (1)', value: 1 },
        { label: '2.0–5.9 (2)', value: 2 },
        { label: '6.0–11.9 (3)', value: 3 },
        { label: '≥12.0 (4)', value: 4 },
      ]),
      selectInput('cv', 'Cardiovascular (BP / vasoactives)', [
        { label: 'Normotensive for age, no pressors (0)', value: 0 },
        { label: 'Mild hypotension or fluid-responsive (1)', value: 1 },
        { label: 'Low-dose single vasoactive (2)', value: 2 },
        { label: 'Moderate vasoactive support (3)', value: 3 },
        { label: 'High-dose / multi-agent shock (4)', value: 4 },
      ]),
      selectInput('cns', 'CNS (age-adjusted GCS-style)', [
        { label: 'Normal mentation (0)', value: 0 },
        { label: 'Mildly altered (1)', value: 1 },
        { label: 'Moderately altered (2)', value: 2 },
        { label: 'Severely altered (3)', value: 3 },
        { label: 'Unresponsive / deep coma (4)', value: 4 },
      ]),
      selectInput('renal', 'Renal (creatinine / UOP severity)', [
        { label: 'Normal for age (0)', value: 0 },
        { label: 'Mild elevation / oliguria (1)', value: 1 },
        { label: 'Moderate (2)', value: 2 },
        { label: 'Severe (3)', value: 3 },
        { label: 'Failure / dialysis (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.resp) +
        num(values.coag) +
        num(values.liver) +
        num(values.cv) +
        num(values.cns) +
        num(values.renal);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild organ dysfunction burden (0–3)',
          interpretation: `Simplified pSOFA-style total ${score}/24. Low domain burden — continue monitoring; score trends matter more than a single snapshot.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Moderate dysfunction (4–7)',
          interpretation: `Score ${score}: moderate multi-organ involvement. Ensure source control, organ support, and PICU-level surveillance as indicated.`,
        },
        {
          max: 11,
          level: 'high',
          label: 'High dysfunction (8–11)',
          interpretation: `Score ${score}: high organ failure burden associated with increased mortality risk in pSOFA literature — aggressive supportive care.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Critical (≥12)',
          interpretation: `Score ${score}: critical multi-organ failure pattern. Maximize organ support and address reversible drivers of dysfunction.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Respiratory', value: String(num(values.resp)) },
          { label: 'Coagulation', value: String(num(values.coag)) },
          { label: 'Liver', value: String(num(values.liver)) },
          { label: 'Cardiovascular', value: String(num(values.cv)) },
          { label: 'CNS', value: String(num(values.cns)) },
          { label: 'Renal', value: String(num(values.renal)) },
        ],
        recommendations: [
          'Use published pSOFA tables for research-grade scoring',
          'ΔpSOFA over time informs trajectory',
          'Pair with sepsis recognition pathways',
        ],
      };
    },
    evidence: {
      summary:
        'pSOFA adapts adult SOFA organ domains with pediatric cutoffs; higher scores predict PICU mortality. This tool uses simplified bins rather than exact laboratory breakpoints.',
      formula: 'Sum of 6 domains (0–4 each) → 0–24',
      validation: 'Matics & Sanchez-Pinto and subsequent pSOFA validations; educational simplification here.',
      references: [
        {
          title: 'Adaptation and validation of a pediatric sequential organ failure assessment score',
          citation: 'Matics TJ, Sanchez-Pinto LN. Crit Care Med. 2017',
          year: 2017,
          pmid: '28783810',
          doi: '10.1001/jamapediatrics.2017.2352',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥8', actions: ['PICU-level care', 'Reassess vasopressors/vent/RRT needs'] },
      { condition: 'Rising score', actions: ['Hunt for untreated source', 'Escalate monitoring'] },
    ],
    pearls: [
      'Age-specific creatinine and MAP cutoffs matter for formal pSOFA.',
      'Not a substitute for PELOD/PRISM in some benchmarking systems.',
    ],
  },

  // ─── 6. Phoenix sepsis simplified ──────────────────────────────────────────
  {
    id: 'phoenix-sepsis-simp',
    name: 'Phoenix Sepsis Criteria (Simplified Educational)',
    shortName: 'Phoenix simp',
    description:
      'Educational helper approximating Phoenix pediatric sepsis criteria: infection + life-threatening organ dysfunction across respiratory, CV, coag, and neuro domains.',
    category: 'pediatrics',
    tags: ['phoenix', 'pediatric sepsis', 'organ dysfunction', 'sccm'],
    whenToUse: 'Children with suspected infection when applying modern organ-dysfunction-based sepsis definitions (teaching aid).',
    whyUse: 'Phoenix (2024) redefined pediatric sepsis around organ dysfunction rather than SIRS; this checklist surfaces the major domains.',
    inputs: [
      yesNo('infection', 'Suspected or confirmed infection', 1),
      selectInput('resp', 'Respiratory dysfunction', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild–moderate (high-flow / mild hypoxia) (1)', value: 1 },
        { label: 'Severe (invasive vent / severe gas exchange failure) (2)', value: 2 },
      ]),
      selectInput('cv', 'Cardiovascular dysfunction', [
        { label: 'None (0)', value: 0 },
        { label: 'Vasoactive need or significant lactate/hypotension (1)', value: 1 },
        { label: 'Severe shock (high-dose / multi-agent / profound lactate) (2)', value: 2 },
      ]),
      selectInput('coag', 'Coagulation dysfunction', [
        { label: 'None (0)', value: 0 },
        { label: 'Thrombocytopenia / coagulopathy meeting Phoenix-style thresholds (1)', value: 1 },
        { label: 'Severe consumptive coagulopathy (2)', value: 2 },
      ]),
      selectInput('neuro', 'Neurologic dysfunction', [
        { label: 'None (0)', value: 0 },
        { label: 'Altered mentation / GCS reduction (1)', value: 1 },
        { label: 'Severe encephalopathy / coma (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const organ =
        num(values.resp) + num(values.cv) + num(values.coag) + num(values.neuro);
      const infection = bool(values.infection);
      // Educational: Phoenix sepsis ~ infection + organ score ≥2; septic shock adds CV dysfunction
      const sepsis = infection && organ >= 2;
      const shock = sepsis && num(values.cv) >= 1;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Does not meet simplified Phoenix sepsis pattern';
      if (!infection && organ >= 2) {
        riskLevel = 'moderate';
        label = 'Organ dysfunction without clear infection link';
      } else if (infection && organ === 1) {
        riskLevel = 'moderate';
        label = 'Infection + limited organ dysfunction (below helper threshold)';
      } else if (shock) {
        riskLevel = 'critical';
        label = 'Simplified Phoenix septic shock pattern';
      } else if (sepsis) {
        riskLevel = 'high';
        label = 'Simplified Phoenix sepsis pattern';
      }
      return {
        score: organ,
        unit: 'organ points',
        label,
        interpretation: `Educational organ subtotal ${organ}. ${
          sepsis
            ? 'Infection plus organ dysfunction ≥2 approximates Phoenix sepsis; cardiovascular dysfunction upgrades toward septic shock.'
            : 'Threshold for simplified sepsis not met — continue exams and use full Phoenix tables for research/operational definitions.'
        } Always resuscitate clinically first.`,
        riskLevel,
        details: [
          { label: 'Infection', value: infection ? 'Yes' : 'No' },
          { label: 'Respiratory', value: String(num(values.resp)) },
          { label: 'Cardiovascular', value: String(num(values.cv)) },
          { label: 'Coagulation', value: String(num(values.coag)) },
          { label: 'Neurologic', value: String(num(values.neuro)) },
          { label: 'Shock pattern', value: shock ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Apply published Phoenix scoring tables for formal classification',
          'Hour-1 bundle principles: cultures, antibiotics, fluid/vasoactive support',
          'Do not delay care for scoring',
        ],
      };
    },
    evidence: {
      summary:
        'Phoenix criteria (SCCM 2024) define pediatric sepsis as infection with life-threatening organ dysfunction measured by Phoenix scores; septic shock includes cardiovascular dysfunction.',
      formula: 'Infection + simplified organ points (≥2 educational threshold); CV domain for shock',
      validation:
        'Derived/validated in large international datasets (Schlapbach/Watson et al.). This app version is intentionally simplified for teaching.',
      references: [
        {
          title: 'International Consensus Criteria for Pediatric Sepsis and Septic Shock',
          citation: 'Schlapbach LJ et al. JAMA. 2024',
          year: 2024,
          pmid: '38245889',
          doi: '10.1001/jama.2024.0179',
        },
      ],
    },
    nextSteps: [
      { condition: 'Sepsis/shock pattern', actions: ['Antibiotics', 'Hemodynamic support', 'PICU', 'Source control'] },
      { condition: 'Borderline organ score', actions: ['Serial exams', 'Lactate/perfusion checks', 'Early escalation'] },
    ],
    pearls: [
      'Phoenix deliberately moves beyond SIRS-based definitions.',
      'Implementation details (exact labs/thresholds) require the full publication tables.',
    ],
  },

  // ─── 7. PALS CPR depth/rate ────────────────────────────────────────────────
  {
    id: 'pals-cpr-depth',
    name: 'PALS CPR Depth and Rate Reference',
    shortName: 'PALS CPR',
    description: 'Pediatric advanced life support compression depth, rate, and ratio reference by age group.',
    category: 'emergency',
    tags: ['pals', 'cpr', 'resuscitation', 'pediatric', 'compression'],
    whenToUse: 'During pediatric CPR training or real-time resuscitation as a quick quality reference.',
    whyUse: 'Correct rate/depth/recoil and ventilation ratios improve CPR quality; age changes depth targets.',
    inputs: [
      selectInput('ageGroup', 'Age group', [
        { label: 'Infant (<1 year)', value: 'infant' },
        { label: 'Child (1 year–puberty)', value: 'child' },
        { label: 'Adolescent / adult size', value: 'adolescent' },
      ]),
      selectInput('rescuers', 'Rescuers', [
        { label: 'Single rescuer', value: 'single' },
        { label: 'Two rescuers', value: 'two' },
      ]),
      yesNo('advancedAirway', 'Advanced airway in place', 1),
      numberInput('measuredRate', 'Observed compression rate (optional)', {
        unit: '/min',
        min: 0,
        max: 200,
        defaultValue: 110,
        helpText: 'Enter 0 if not measuring',
      }),
      numberInput('measuredDepthCm', 'Observed depth if known (optional)', {
        unit: 'cm',
        min: 0,
        max: 8,
        step: 0.5,
        defaultValue: 4,
      }),
    ],
    calculate(values) {
      const age = String(values.ageGroup ?? 'child');
      const two = String(values.rescuers ?? 'two') === 'two';
      const aaw = bool(values.advancedAirway);
      const depth =
        age === 'infant' ? '≈4 cm (⅓ AP chest diameter)' : age === 'child' ? '≈5 cm (⅓ AP diameter)' : '5–6 cm (adult)';
      const depthTarget = age === 'infant' ? 4 : age === 'child' ? 5 : 5.5;
      const ratio = aaw ? 'Continuous compressions; ventilate 1 breath every 2–3 s (~20–30/min peds)' : two ? '15:2' : '30:2';
      const rate = num(values.measuredRate, 110);
      const depthM = num(values.measuredDepthCm, depthTarget);
      let rateOk = rate >= 100 && rate <= 120;
      if (rate === 0) rateOk = true;
      const depthOk = Math.abs(depthM - depthTarget) <= 1.2 || depthM === 0;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = 'PALS CPR targets';
      if (rate > 0 || depthM > 0) {
        if (rateOk && depthOk) {
          riskLevel = 'low';
          label = 'Within educational quality targets';
        } else {
          riskLevel = 'moderate';
          label = 'Adjust rate and/or depth';
        }
      }
      return {
        score: depthTarget,
        unit: 'cm target',
        label,
        interpretation: `${age} CPR: rate 100–120/min; depth ${depth}; full chest recoil; minimize interruptions. Compression:ventilation = ${ratio}. Allow complete recoil; switch compressors ~every 2 min.`,
        riskLevel,
        details: [
          { label: 'Target rate', value: '100–120/min' },
          { label: 'Target depth', value: depth },
          { label: 'C:V ratio', value: ratio },
          { label: 'Observed rate', value: rate > 0 ? `${rate}/min` : '—' },
          { label: 'Observed depth', value: depthM > 0 ? `${depthM} cm` : '—' },
        ],
        recommendations: [
          'Push hard, push fast, full recoil',
          'EtCO₂ and pad feedback devices improve quality when available',
          'Coordinate pulse/rhythm checks with minimal pause',
        ],
      };
    },
    evidence: {
      summary: 'AHA PALS emphasizes high-quality CPR: 100–120 compressions/min, age-appropriate depth (~⅓ AP diameter), full recoil, and proper ventilation ratios.',
      formula: 'Infant ~4 cm; child ~5 cm; rate 100–120; 15:2 (2-rescuer child/infant) or 30:2 single; continuous with advanced airway',
      validation: 'AHA Guidelines for CPR and ECC; quality metrics linked to ROSC in observational data.',
      references: [
        {
          title: 'AHA Guidelines for CPR and ECC — Pediatric Basic and Advanced Life Support',
          citation: 'AHA. Circulation. 2020 (and focused updates)',
          year: 2020,
          pmid: '33081526',
          doi: '10.1161/CIR.0000000000000901',
        },
      ],
    },
    nextSteps: [
      { condition: 'Active arrest', actions: ['High-quality CPR', 'Pad placement', 'Epinephrine timing per PALS', 'Reversible Hs/Ts'] },
    ],
    pearls: [
      'Excessive ventilation is harmful — avoid hyperventilation.',
      'Two-thumb encircling technique preferred for infants with two rescuers.',
    ],
  },

  // ─── 8. IO needle size ─────────────────────────────────────────────────────
  {
    id: 'io-needle-size',
    name: 'IO Needle Selection by Age (Educational)',
    shortName: 'IO Needle',
    description: 'Educational guide to intraosseous needle length selection by age/weight and common insertion sites.',
    category: 'emergency',
    tags: ['io', 'intraosseous', 'access', 'pals', 'resuscitation', 'needle'],
    whenToUse: 'Emergent vascular access when IO is chosen; training for EZ-IO / manual needle size selection.',
    whyUse: 'Wrong length risks under-penetration or injury; age/weight-based color systems (e.g., EZ-IO) reduce error.',
    inputs: [
      selectInput('ageBand', 'Age / size band', [
        { label: 'Newborn / small infant (<3–4 kg or very small)', value: 'neonate' },
        { label: 'Infant / toddler (~3–39 kg; pink EZ-IO typical)', value: 'pink' },
        { label: 'Child / adult (~40 kg+; blue EZ-IO typical)', value: 'blue' },
        { label: 'Large adult / excessive tissue (yellow EZ-IO typical)', value: 'yellow' },
      ]),
      selectInput('site', 'Planned site', [
        { label: 'Proximal tibia', value: 'tib' },
        { label: 'Distal tibia', value: 'dtib' },
        { label: 'Proximal humerus', value: 'hum' },
        { label: 'Distal femur (peds option)', value: 'fem' },
      ]),
      yesNo('contraindications', 'Local infection, fracture, prior IO same bone, or osteogenesis imperfecta concern', 1),
    ],
    calculate(values) {
      const band = String(values.ageBand ?? 'pink');
      const map: Record<string, { needle: string; length: string; note: string }> = {
        neonate: {
          needle: 'Manual / shortest pediatric IO or 15 mm class carefully',
          length: '~15 mm class (exercise extreme caution)',
          note: 'Neonatal IO requires experienced operators; confirm landmarking and depth carefully.',
        },
        pink: {
          needle: 'EZ-IO 15 mm (pink) class',
          length: '15 mm',
          note: 'Common for patients ~3–39 kg; confirm black line visibility rule per device IFU.',
        },
        blue: {
          needle: 'EZ-IO 25 mm (blue) class',
          length: '25 mm',
          note: 'Typical ≥~40 kg; still verify adequacy of needle length for tissue depth.',
        },
        yellow: {
          needle: 'EZ-IO 45 mm (yellow) class',
          length: '45 mm',
          note: 'For excessive tissue or humeral insertion in larger patients per device guidance.',
        },
      };
      const m = map[band] ?? map.pink;
      const site = String(values.site ?? 'tib');
      const siteNote: Record<string, string> = {
        tib: 'Proximal tibia: flat medial surface 1–2 cm below tibial tuberosity (peds landmarks age-adjusted).',
        dtib: 'Distal tibia: proximal to medial malleolus.',
        hum: 'Proximal humerus: greater tubercle — often higher flow in older children/adults.',
        fem: 'Distal femur: sometimes used in infants/young children when tibia unavailable.',
      };
      if (bool(values.contraindications)) {
        return {
          score: 0,
          label: 'Choose alternate site / method',
          interpretation: `Contraindication flag present. Avoid IO in fractured/infected bone or prior IO in same bone this episode. Select another site or escalate to central/US-guided IV. Suggested size if alternate site clean: ${m.needle}.`,
          riskLevel: 'high',
          details: [
            { label: 'Suggested needle', value: m.needle },
            { label: 'Site note', value: siteNote[site] ?? '' },
          ],
        };
      }
      return {
        score: parseInt(m.length, 10) || 15,
        unit: 'mm class',
        label: m.needle,
        interpretation: `Educational selection: ${m.needle} (${m.length}). ${m.note} ${siteNote[site] ?? ''} Confirm aspiration/flush and secure device; all PALS drugs/fluids can generally run IO.`,
        riskLevel: 'info',
        details: [
          { label: 'Needle class', value: m.needle },
          { label: 'Site', value: site },
        ],
        recommendations: [
          'Follow device IFU for weight cutoffs and confirmation',
          'Pain: lidocaine IO for awake patients when appropriate',
          'Transition to IV/central access when stabilized',
        ],
      };
    },
    evidence: {
      summary:
        'IO access is standard when IV delayed in resuscitation. Commercial systems color-code needle lengths (e.g., 15/25/45 mm) by weight/tissue depth.',
      formula: 'Age-weight band → needle length class + site landmarks',
      validation: 'AHA/PALS endorse IO; manufacturer weight ranges guide EZ-IO selection. Educational approximation only.',
      references: [
        {
          title: 'AHA Pediatric Advanced Life Support recommendations (vascular access)',
          citation: 'AHA. Circulation. 2020',
          year: 2020,
          pmid: '33081526',
          doi: '10.1161/CIR.0000000000000901',
        },
      ],
    },
    nextSteps: [
      { condition: 'Failed IO or extravasation', actions: ['Stop infusion', 'New bone/site', 'Surgical/vascular backup'] },
      { condition: 'Successful IO', actions: ['Resuscitate', 'Plan definitive access'] },
    ],
    pearls: [
      'If the 5-mm mark is not visible above skin before drilling (EZ-IO rule of thumb), choose longer needle.',
      'Humeral IO can achieve rapid flow in larger patients.',
    ],
  },

  // ─── 9. Umbilical catheter depth ───────────────────────────────────────────
  {
    id: 'umbilical-catheter-depth',
    name: 'Umbilical Catheter Depth (UVC / UAC)',
    shortName: 'UVC/UAC Depth',
    description: 'Estimates insertion depth for umbilical venous and arterial catheters using birth-weight formulas (educational).',
    category: 'pediatrics',
    tags: ['uvc', 'uac', 'umbilical catheter', 'neonate', 'nicu'],
    whenToUse: 'Newborns requiring UVC and/or UAC for resuscitation, infusions, or monitoring.',
    whyUse: 'Formula-based starting depths reduce malposition; always confirm radiographically.',
    inputs: [
      numberInput('weightKg', 'Birth weight', { unit: 'kg', min: 0.4, max: 6, step: 0.01, defaultValue: 1.5 }),
      selectInput('catheter', 'Catheter', [
        { label: 'UVC (umbilical venous)', value: 'uvc' },
        { label: 'UAC (umbilical arterial)', value: 'uac' },
        { label: 'Both estimates', value: 'both' },
      ]),
      selectInput('uacPosition', 'Preferred UAC tip position', [
        { label: 'High (T6–T9)', value: 'high' },
        { label: 'Low (L3–L5)', value: 'low' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weightKg, 1.5);
      const cat = String(values.catheter ?? 'both');
      const uacPos = String(values.uacPosition ?? 'high');
      // Shukla formulas (common educational):
      // UAC (cm) = 3 * BW(kg) + 9
      // UVC (cm) = 0.5 * UAC + 1  → 1.5*BW + 5.5
      const uacHigh = round(3 * w + 9, 1);
      // Low position often shorter — approximate educational reduction
      const uacLow = round(Math.max(5, uacHigh * 0.55), 1);
      const uvc = round(1.5 * w + 5.5, 1);
      const uac = uacPos === 'low' ? uacLow : uacHigh;
      let score = uvc;
      let label = `UVC ~${uvc} cm`;
      let interpretation = '';
      if (cat === 'uac') {
        score = uac;
        label = `UAC (${uacPos}) ~${uac} cm`;
        interpretation = `Estimated UAC insertion depth ≈ ${uac} cm from abdominal wall using weight-based formula (Shukla-style). Preferred tip ${
          uacPos === 'high' ? 'T6–T9' : 'L3–L5'
        }. Confirm on XR; adjust for droop/loop.`;
      } else if (cat === 'uvc') {
        interpretation = `Estimated UVC depth ≈ ${uvc} cm (≈½ UAC + 1). Target tip at IVC–RA junction (≈T8–T9). Confirm radiographically; avoid hepatic wedging.`;
      } else {
        score = uvc;
        label = `UVC ~${uvc} cm; UAC ~${uac} cm`;
        interpretation = `Shukla-style estimates for ${w} kg: UVC ≈ ${uvc} cm; UAC (${uacPos}) ≈ ${uac} cm. Always verify tip position on radiograph/ultrasound before relying on lines.`;
      }
      return {
        score,
        unit: 'cm',
        label,
        interpretation,
        riskLevel: 'info' as const,
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'UVC estimate', value: `${uvc} cm` },
          { label: 'UAC high estimate', value: `${uacHigh} cm` },
          { label: 'UAC low estimate', value: `${uacLow} cm` },
        ],
        recommendations: [
          'XR or POCUS confirmation mandatory',
          'Secure catheter and note cm mark at skin',
          'Watch for malposition, thrombosis, extravasation',
        ],
      };
    },
    evidence: {
      summary:
        'Weight-based formulas (e.g., Shukla) estimate UAC/UVC insertion depth. High UAC lies above diaphragm (T6–T9); low below L3. UVC tip at IVC–RA junction.',
      formula: 'UAC (cm) ≈ 3×BW(kg)+9; UVC (cm) ≈ ½×UAC+1 ≈ 1.5×BW+5.5',
      validation: 'Common NICU starting formulas; individual anatomy varies — imaging confirmation required.',
      references: [
        {
          title: 'Determination of umbilical catheter placement',
          citation: 'Shukla H, Ferrara A. Am J Dis Child. 1986',
          year: 1986,
          pmid: '3728405',
          doi: '10.1001/archpedi.1986.02140220068034',
        },
      ],
    },
    nextSteps: [
      { condition: 'After insertion', actions: ['Confirm tip position', 'Begin infusions only after verification'] },
      { condition: 'Malposition', actions: ['Withdraw/reposition per protocol', 'Never advance after sterile field broken without new procedure'] },
    ],
    pearls: [
      'Dunn and other formulas exist; know your unit standard.',
      'UVC in portal system or too deep in heart is hazardous.',
    ],
  },

  // ─── 10. Crown-rump length → GA ────────────────────────────────────────────
  {
    id: 'crown-rump',
    name: 'Crown-Rump Length to Gestational Age',
    shortName: 'CRL → GA',
    description: 'Educational conversion of first-trimester crown-rump length (CRL) to approximate gestational age.',
    category: 'obstetrics',
    tags: ['crl', 'gestational age', 'ultrasound', 'dating', 'pregnancy'],
    whenToUse: 'First-trimester ultrasound dating when CRL is measured (typically ~6–14 weeks).',
    whyUse: 'Early CRL is the most accurate ultrasound dating method; maps length to GA via standard charts.',
    inputs: [
      numberInput('crlMm', 'Crown-rump length', { unit: 'mm', min: 1, max: 90, step: 0.1, defaultValue: 20 }),
    ],
    calculate(values) {
      const crl = num(values.crlMm, 20);
      // Robinson-style educational approximation:
      // GA (days) ≈ 8.052 × √(CRL mm) + 23.73  (common regression form)
      const gaDays = 8.052 * Math.sqrt(Math.max(crl, 0)) + 23.73;
      const gaWeeks = gaDays / 7;
      const w = Math.floor(gaWeeks);
      const d = Math.round((gaWeeks - w) * 7);
      const gaRounded = round(gaWeeks, 1);
      let riskLevel: 'low' | 'moderate' | 'info' = 'info';
      let label = `${w}w${d}d (≈${gaRounded} wks)`;
      if (crl < 5 || crl > 80) {
        riskLevel = 'moderate';
        label = `${label} — verify CRL range`;
      }
      return {
        score: gaRounded,
        unit: 'weeks',
        label,
        interpretation: `CRL ${crl} mm corresponds to approximately ${w} weeks + ${d} days (educational Robinson-style regression). Use machine/chart nomograms for clinical reporting; earliest accurate US dating usually establishes EDD.`,
        riskLevel,
        details: [
          { label: 'CRL', value: `${crl} mm` },
          { label: 'GA (days)', value: `${round(gaDays, 1)} d` },
          { label: 'GA', value: `${w}w${d}d` },
        ],
        recommendations: [
          'Prefer validated chart used by your ultrasound package',
          'If IVF pregnancy, use embryo age/transfer dating',
          'Reconcile with LMP only if US discrepancy small per guidelines',
        ],
      };
    },
    evidence: {
      summary:
        'First-trimester CRL is the preferred biometric for pregnancy dating. Multiple regressions (Robinson, Hadlock, INTERGROWTH) map CRL to GA.',
      formula: 'GA(days) ≈ 8.052 × √(CRL_mm) + 23.73 (educational)',
      validation: 'Robinson & Fleming classic formula and later charts; local machine software may differ slightly.',
      references: [
        {
          title: 'A critical evaluation of sonar crown-rump length measurements',
          citation: 'Robinson HP, Fleming JEE. BJOG. 1975',
          year: 1975,
          pmid: '1182090',
          doi: '10.1111/j.1471-0528.1975.tb00710.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Dating scan complete', actions: ['Set EDD from earliest reliable CRL', 'Schedule anatomy survey'] },
      { condition: 'CRL outside expected range for LMP', actions: ['Confirm viability', 'Apply redating rules'] },
    ],
    pearls: [
      'After ~14 weeks, biparietal diameter / composite biometry preferred over CRL.',
      'Measure unflexed fetus in midsagittal plane.',
    ],
  },

  // ─── 11. Amniotic fluid index ──────────────────────────────────────────────
  {
    id: 'amniotic-afi',
    name: 'Amniotic Fluid Index (AFI) Interpretation',
    shortName: 'AFI',
    description: 'Interprets amniotic fluid index (sum of four quadrant deepest pockets) for oligohydramnios / normal / polyhydramnios.',
    category: 'obstetrics',
    tags: ['afi', 'amniotic fluid', 'oligohydramnios', 'polyhydramnios', 'ob'],
    whenToUse: 'Third-trimester fluid assessment or anytime AFI is reported on ultrasound.',
    whyUse: 'AFI categories guide surveillance for fetal well-being, membrane rupture, and maternal conditions (diabetes, etc.).',
    inputs: [
      numberInput('afi', 'Amniotic fluid index', { unit: 'cm', min: 0, max: 50, step: 0.1, defaultValue: 12 }),
      yesNo('useMvp', 'Also have maximum vertical pocket (MVP)?', 0),
      numberInput('mvp', 'Maximum vertical pocket (if known)', {
        unit: 'cm',
        min: 0,
        max: 20,
        step: 0.1,
        defaultValue: 4,
      }),
    ],
    calculate(values) {
      const afi = num(values.afi, 12);
      const mvp = num(values.mvp, 4);
      const useMvp = bool(values.useMvp);
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let label = 'Normal AFI';
      let interpretation = '';
      if (afi < 5) {
        riskLevel = 'high';
        label = 'Oligohydramnios (AFI <5 cm)';
        interpretation = `AFI ${afi} cm is in the oligohydramnios range (<5 cm). Evaluate ROM, fetal anomalies/renal agenesis, growth restriction, and maternal contributions; antenatal testing and delivery planning per GA and guidelines.`;
      } else if (afi <= 8) {
        riskLevel = 'moderate';
        label = 'Borderline low / low-normal AFI (5–8 cm)';
        interpretation = `AFI ${afi} cm is borderline low. Correlate with MVP, clinical context, and serial assessment; many protocols emphasize MVP <2 cm for oligohydramnios decisions.`;
      } else if (afi < 24) {
        riskLevel = 'low';
        label = 'Normal AFI';
        interpretation = `AFI ${afi} cm is within a commonly used normal range (~5–24 cm; exact cutoffs vary). Interpret with growth, Doppler, and maternal disease.`;
      } else if (afi < 30) {
        riskLevel = 'moderate';
        label = 'Mild polyhydramnios (AFI ≥24 cm)';
        interpretation = `AFI ${afi} cm suggests polyhydramnios. Consider diabetes, fetal anomalies (GI obstruction, CNS), twin-twin, and idiopathic causes; follow surveillance protocols.`;
      } else {
        riskLevel = 'high';
        label = 'Moderate–severe polyhydramnios';
        interpretation = `AFI ${afi} cm is substantially elevated. Detailed anatomy, GDM screening, and specialist input; watch for preterm labor and malpresentation.`;
      }
      if (useMvp) {
        interpretation += ` MVP ${mvp} cm: ${
          mvp < 2 ? 'MVP oligohydramnios criterion met (<2 cm).' : mvp >= 8 ? 'MVP suggests polyhydramnios (≥8 cm).' : 'MVP not in extreme range.'
        }`;
      }
      return {
        score: afi,
        unit: 'cm',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'AFI', value: `${afi} cm` },
          { label: 'MVP', value: useMvp ? `${mvp} cm` : '—' },
        ],
        recommendations: [
          'Many guidelines prefer MVP for oligohydramnios diagnosis',
          'Confirm measurement technique (perpendicular pocket, no cord/fetal parts)',
          'Pair with NST/BPP/growth as indicated',
        ],
      };
    },
    evidence: {
      summary:
        'AFI sums deepest vertical pockets in four quadrants. Common cutoffs: oligohydramnios AFI <5 cm; polyhydramnios AFI ≥24 cm (some use ≥25). MVP <2 cm is an alternative oligohydramnios definition.',
      formula: 'AFI = Q1+Q2+Q3+Q4 deepest pockets (cm)',
      validation: 'Widely used; MVP may reduce overdiagnosis of oligohydramnios vs AFI alone (RCTs/meta-analyses).',
      references: [
        {
          title: 'Amniotic fluid volume assessment',
          citation: 'Phelan JP et al. classic AFI method / subsequent ACOG practice guidance',
          year: 1987,
          pmid: '3306497',
        },
      ],
    },
    nextSteps: [
      { condition: 'Oligohydramnios', actions: ['Rule out ROM', 'Fetal assessment', 'Growth/Doppler', 'Delivery planning'] },
      { condition: 'Polyhydramnios', actions: ['GDM screen', 'Anatomy review', 'Surveillance'] },
    ],
    pearls: [
      'Maternal hydration can modestly raise AFI in isolated oligohydramnios — not a cure-all.',
      'Document GA; fluid norms evolve across gestation.',
    ],
  },

  // ─── 12. Umbilical artery S/D ratio ─────────────────────────────────────────
  {
    id: 'sd-ratio',
    name: 'Umbilical Artery S/D Ratio Interpretation',
    shortName: 'UA S/D',
    description: 'Educational interpretation of umbilical artery systolic/diastolic (S/D) ratio and end-diastolic flow patterns.',
    category: 'obstetrics',
    tags: ['s/d ratio', 'umbilical artery', 'doppler', 'fgr', 'iugr'],
    whenToUse: 'Fetal growth restriction surveillance or when umbilical artery Doppler indices are reported.',
    whyUse: 'Elevated S/D, absent, or reversed end-diastolic flow stratifies placental insufficiency severity and delivery urgency.',
    inputs: [
      selectInput('flowPattern', 'End-diastolic flow pattern', [
        { label: 'Forward end-diastolic flow present', value: 'present' },
        { label: 'Absent end-diastolic flow (AEDF)', value: 'aedf' },
        { label: 'Reversed end-diastolic flow (REDF)', value: 'redf' },
      ]),
      numberInput('sd', 'S/D ratio (if forward flow)', {
        unit: 'ratio',
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 2.5,
      }),
      numberInput('gaWeeks', 'Gestational age', { unit: 'weeks', min: 20, max: 42, step: 0.1, defaultValue: 32 }),
    ],
    calculate(values) {
      const pattern = String(values.flowPattern ?? 'present');
      const sd = num(values.sd, 2.5);
      const ga = num(values.gaWeeks, 32);
      // Very rough educational upper reference: S/D falls with GA; ~3 at 30 wks, ~2.5 near term (highly chart-dependent)
      const approxUpper = Math.max(2.2, 3.5 - (ga - 28) * 0.08);

      if (pattern === 'redf') {
        return {
          score: sd,
          label: 'Reversed end-diastolic flow (REDF)',
          interpretation: `REDF at ${ga} weeks indicates severe placental insufficiency with high perinatal risk. Urgent fetal medicine/OB review for hospitalization, antenatal corticosteroids/Mg as indicated, and expedited delivery planning per GA and status.`,
          riskLevel: 'critical' as const,
          details: [
            { label: 'Pattern', value: 'REDF' },
            { label: 'GA', value: `${ga} wks` },
          ],
          recommendations: ['Immediate specialist assessment', 'Continuous/high-frequency monitoring', 'Delivery planning'],
        };
      }
      if (pattern === 'aedf') {
        return {
          score: sd,
          label: 'Absent end-diastolic flow (AEDF)',
          interpretation: `AEDF at ${ga} weeks is a severe Doppler abnormality. Inpatient surveillance, steroids/Mg per protocol, and timed delivery after specialist input — do not manage as outpatient without expert pathway.`,
          riskLevel: 'critical' as const,
          details: [
            { label: 'Pattern', value: 'AEDF' },
            { label: 'GA', value: `${ga} wks` },
          ],
        };
      }
      const elevated = sd > approxUpper;
      return {
        score: sd,
        unit: 'S/D',
        label: elevated ? 'Elevated S/D (educational)' : 'S/D not elevated vs rough GA reference',
        interpretation: `UA S/D ${sd} at ${ga} weeks. Educational rough upper reference ≈ ${round(approxUpper, 2)}. ${
          elevated
            ? 'Elevated ratio suggests increased placental resistance — correlate with growth, MCA/DV Dopplers, AFV, and NST/BPP; use percentile charts.'
            : 'Not elevated versus this rough reference — still use formal nomograms and full FGR protocol when growth is restricted.'
        }`,
        riskLevel: elevated ? 'moderate' : 'low',
        details: [
          { label: 'S/D', value: String(sd) },
          { label: 'Rough upper ref', value: String(round(approxUpper, 2)) },
          { label: 'GA', value: `${ga} wks` },
        ],
        recommendations: [
          'Use site-specific Doppler centile charts',
          'PI/RI often preferred over S/D in modern reporting',
          'Integrate TRUFFLE/ISUOG-style FGR pathways',
        ],
      };
    },
    evidence: {
      summary:
        'Umbilical artery Doppler assesses fetoplacental resistance. Progressive abnormality: elevated PI/S/D → AEDF → REDF, correlating with perinatal risk in FGR.',
      formula: 'S/D = peak systolic / end-diastolic velocity; pattern flags AEDF/REDF',
      validation: 'ISUOG/SMFM guidance for FGR surveillance; AEDF/REDF prompt specialist care.',
      references: [
        {
          title: 'ISUOG Practice Guidelines: use of Doppler velocimetry in obstetrics',
          citation: 'Bhide A et al. Ultrasound Obstet Gynecol. 2013 / updates',
          year: 2013,
          pmid: '23371348',
          doi: '10.1002/uog.12371',
        },
      ],
    },
    nextSteps: [
      { condition: 'AEDF/REDF', actions: ['Urgent MFM/OB', 'Inpatient monitoring', 'Delivery timing'] },
      { condition: 'Elevated indices', actions: ['Serial Doppler', 'Growth scans', 'Antenatal testing'] },
    ],
    pearls: [
      'Angle and free-loop sampling technique affect values.',
      'Absent/reversed flow outweighs any numeric S/D.',
    ],
  },

  // ─── 13. Biophysical profile ───────────────────────────────────────────────
  {
    id: 'biophysical-profile',
    name: 'Biophysical Profile (BPP)',
    shortName: 'BPP',
    description: 'Manning biophysical profile score (0–10) with optional NST for antenatal fetal well-being.',
    category: 'obstetrics',
    tags: ['bpp', 'biophysical profile', 'antenatal testing', 'nst', 'fetal'],
    whenToUse: 'Antenatal surveillance when nonstress test and/or ultrasound biophysical components are indicated.',
    whyUse: 'Combines acute (breathing, movement, tone, NST) and chronic (AFV) markers of fetal status.',
    inputs: [
      selectInput('nst', 'Nonstress test (NST)', [
        { label: 'Reactive (2)', value: 2 },
        { label: 'Nonreactive (0)', value: 0 },
        { label: 'Not performed / ultrasound-only modified BPP context', value: -1 },
      ]),
      selectInput('breathing', 'Fetal breathing movements', [
        { label: '≥1 episode ≥30 s in 30 min (2)', value: 2 },
        { label: 'Absent/insufficient (0)', value: 0 },
      ]),
      selectInput('movement', 'Gross body movements', [
        { label: '≥3 discrete body/limb movements (2)', value: 2 },
        { label: '≤2 movements (0)', value: 0 },
      ]),
      selectInput('tone', 'Fetal tone', [
        { label: '≥1 episode active extension→flexion (2)', value: 2 },
        { label: 'Slow/absent tone (0)', value: 0 },
      ]),
      selectInput('afv', 'Amniotic fluid volume', [
        { label: 'MVP >2 cm (or adequate AFI) (2)', value: 2 },
        { label: 'Inadequate fluid (0)', value: 0 },
      ]),
    ],
    calculate(values) {
      const nstRaw = num(values.nst, 2);
      const nstIncluded = nstRaw >= 0;
      const nst = nstIncluded ? nstRaw : 0;
      const score =
        (nstIncluded ? nst : 0) +
        num(values.breathing) +
        num(values.movement) +
        num(values.tone) +
        num(values.afv);
      const max = nstIncluded ? 10 : 8;
      // Interpret on full 10-point scale when NST included; if not, scale messaging
      const interpretScore = nstIncluded ? score : score; // 0-8 without NST
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' | 'normal' = 'low';
      let label = '';
      let interpretation = '';
      if (!nstIncluded) {
        // ultrasound BPP components only /8
        if (score >= 8) {
          label = `Ultrasound components ${score}/8 (NST not scored)`;
          riskLevel = num(values.afv) === 0 ? 'moderate' : 'low';
          interpretation = `Ultrasound BPP components total ${score}/8. Add NST for full 10-point BPP. Oligohydramnios (AFV 0) remains concerning even if acute variables are normal.`;
        } else if (score >= 6) {
          label = `Equivocal ultrasound components ${score}/8`;
          riskLevel = 'moderate';
          interpretation = `Components ${score}/8 without NST. Obtain NST and consider extended observation or repeat testing.`;
        } else {
          label = `Low ultrasound components ${score}/8`;
          riskLevel = 'high';
          interpretation = `Low acute variables (${score}/8). Urgent further testing and obstetric decision-making.`;
        }
      } else {
        const r = riskFromThresholds(score, [
          {
            max: 4,
            level: 'critical',
            label: 'BPP ≤4 — high concern',
            interpretation: `BPP ${score}/10 suggests high risk of fetal acidemia/asphyxia — continuous monitoring and likely delivery depending on GA and clinical context.`,
          },
          {
            max: 6,
            level: 'high',
            label: 'BPP 6 — equivocal',
            interpretation: `BPP ${score}/10 is equivocal. If AFV normal, often repeat within hours; if oligohydramnios (AFV 0), manage as higher risk. Delivery decisions are GA- and context-dependent.`,
          },
          {
            max: 8,
            level: 'moderate',
            label: 'BPP 8 — generally reassuring if AF normal',
            interpretation: `BPP ${score}/10. Score of 8/10 with normal fluid is usually reassuring; 8/10 with oligohydramnios needs careful evaluation. Score 10/10 is normal.`,
          },
          {
            max: 10,
            level: 'low',
            label: 'BPP 10 — normal',
            interpretation: `BPP ${score}/10 is normal. Continue surveillance schedule as indicated by the original testing indication.`,
          },
        ]);
        // Fix riskFromThresholds for score 8 vs 10: max 8 catches 8, max 10 catches 10
        // But score 8 currently gets moderate — good. Score 10 gets low.
        // Score 6 gets high via max 6. Score 4 gets critical. Score 0-4 critical.
        // Wait score 8: max 8 → moderate. Some texts say 8/10 normal if AFV normal.
        riskLevel = r.riskLevel;
        label = r.label;
        interpretation = r.interpretation;
        if (score === 8 && num(values.afv) === 2) {
          riskLevel = 'low';
          label = 'BPP 8/10 with normal fluid — reassuring';
          interpretation = `BPP ${score}/10 with normal AFV is generally considered reassuring (acute variable loss may be sleep cycle). Continue indicated surveillance.`;
        }
        if (score >= 8 && num(values.afv) === 0) {
          riskLevel = 'high';
          label = `BPP ${score}/10 with oligohydramnios`;
          interpretation = `Despite acute variables, AFV component 0 (oligohydramnios) raises concern — evaluate ROM/FGR and manage per obstetric protocol; not fully reassuring.`;
        }
      }
      return {
        score: interpretScore,
        unit: nstIncluded ? '/10' : '/8',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'NST', value: nstIncluded ? String(nst) : 'Not scored' },
          { label: 'Breathing', value: String(num(values.breathing)) },
          { label: 'Movement', value: String(num(values.movement)) },
          { label: 'Tone', value: String(num(values.tone)) },
          { label: 'AFV', value: String(num(values.afv)) },
          { label: 'Max', value: String(max) },
        ],
        recommendations: [
          'Modified BPP = NST + AFV in many protocols',
          'Extend observation if fetus may be in sleep cycle',
          'Delivery decisions integrate GA, Doppler, maternal status',
        ],
      };
    },
    evidence: {
      summary:
        'Biophysical profile assigns 2 points each for NST, breathing, movement, tone, and AFV (max 10). Lower scores correlate with perinatal compromise risk.',
      formula: 'Sum of 5 components × 0 or 2 points each',
      validation: 'Manning et al.; widely adopted antenatal testing modality.',
      references: [
        {
          title: 'Fetal biophysical profile scoring',
          citation: 'Manning FA et al. Am J Obstet Gynecol. 1980',
          year: 1980,
          pmid: '7355965',
          doi: '10.1016/0002-9378(80)90457-3',
        },
      ],
    },
    nextSteps: [
      { condition: 'BPP ≤4', actions: ['Urgent OB evaluation', 'Continuous monitoring', 'Delivery if appropriate'] },
      { condition: 'BPP 6', actions: ['Repeat testing', 'Consider delivery if mature / oligohydramnios'] },
      { condition: 'BPP 8–10 with normal fluid', actions: ['Continue indicated surveillance schedule'] },
    ],
    pearls: [
      'False positives occur with fetal sleep — extend study to 30+ minutes when needed.',
      'Oligohydramnios component is a chronic marker and stands out even if acute scores are good.',
    ],
  },

  // ─── 14. Modified Bishop ───────────────────────────────────────────────────
  {
    id: 'modified-bishop',
    name: 'Modified Bishop Score',
    shortName: 'Mod. Bishop',
    description:
      'Modified Bishop cervical favorability score including dilation, effacement (or length), station, consistency, and position — used before induction.',
    category: 'obstetrics',
    tags: ['bishop', 'modified bishop', 'induction', 'cervix', 'labor'],
    whenToUse: 'Before labor induction to estimate cervical favorability and likelihood of successful vaginal delivery.',
    whyUse: 'Higher scores predict higher induction success; may inform cervical ripening need. Modified versions use % effacement or length options.',
    inputs: [
      selectInput('dilation', 'Dilation', [
        { label: 'Closed (0)', value: 0 },
        { label: '1–2 cm (1)', value: 1 },
        { label: '3–4 cm (2)', value: 2 },
        { label: '≥5 cm (3)', value: 3 },
      ]),
      selectInput('effaceMode', 'Effacement input', [
        { label: 'Percent effacement', value: 'pct' },
        { label: 'Cervical length (modified)', value: 'len' },
      ]),
      selectInput('effacement', 'Effacement %', [
        { label: '0–30% (0)', value: 0 },
        { label: '40–50% (1)', value: 1 },
        { label: '60–70% (2)', value: 2 },
        { label: '≥80% (3)', value: 3 },
      ]),
      selectInput('cervLength', 'Cervical length (if length mode)', [
        { label: '>3 cm (0)', value: 0 },
        { label: '2–3 cm (1)', value: 1 },
        { label: '1–2 cm (2)', value: 2 },
        { label: '<1 cm (3)', value: 3 },
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
      const eff =
        String(values.effaceMode ?? 'pct') === 'len' ? num(values.cervLength) : num(values.effacement);
      const score =
        num(values.dilation) +
        eff +
        num(values.station) +
        num(values.consistency) +
        num(values.position);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'high',
          label: 'Unfavorable cervix (≤5)',
          interpretation: `Modified Bishop ${score}: unfavorable. Cervical ripening (pharmacologic/mechanical) often indicated before oxytocin induction; counsel on longer induction and higher cesarean risk.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate (6–7)',
          interpretation: `Score ${score}: intermediate favorability. Individualize ripening vs oxytocin based on parity, indication, and local protocols.`,
        },
        {
          max: 20,
          level: 'low',
          label: 'Favorable cervix (≥8)',
          interpretation: `Score ${score}: favorable cervix — higher likelihood of successful labor induction and vaginal delivery (still depends on indication, fetus, and pelvis).`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Dilation', value: String(num(values.dilation)) },
          { label: 'Effacement/length points', value: String(eff) },
          { label: 'Station', value: String(num(values.station)) },
          { label: 'Consistency', value: String(num(values.consistency)) },
          { label: 'Position', value: String(num(values.position)) },
        ],
        recommendations: [
          'Document exam carefully before induction',
          'Multiparity improves success at similar scores',
          'Bishop is not the sole determinant of induction method',
        ],
      };
    },
    evidence: {
      summary:
        'Original Bishop score (1964) rates dilation, effacement, station, consistency, and position. Modifications substitute cervical length for effacement. Scores ≥8 generally favorable.',
      formula: 'Dilation + effacement/length + station + consistency + position (0–13)',
      validation: 'Widely used clinical tool; predictive value moderate and parity-dependent.',
      references: [
        {
          title: 'Pelvic scoring for elective induction',
          citation: 'Bishop EH. Obstet Gynecol. 1964',
          year: 1964,
          pmid: '14199536',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤5', actions: ['Cervical ripening', 'Counsel on timeline/CS risk'] },
      { condition: 'Score ≥8', actions: ['Consider oxytocin/amniotomy per protocol'] },
    ],
    pearls: [
      'Distinct from the basic Bishop calculator if your library uses fewer options or different bins.',
      'Membrane sweeping and mechanical ripening are options for unfavorable cervix.',
    ],
  },

  // ─── 15. Arrest of labor (ACOG) ────────────────────────────────────────────
  {
    id: 'arrest-labor',
    name: 'Arrest of Labor (ACOG Definitions Helper)',
    shortName: 'Arrest Labor',
    description:
      'Educational helper applying ACOG/SMFM frameworks for first-stage arrest and second-stage arrest, incorporating modern labor progress concepts.',
    category: 'obstetrics',
    tags: ['arrest of labor', 'acog', 'dystocia', 'failure to progress', 'labor'],
    whenToUse: 'Laboring patients with concern for protracted or arrested progress in first or second stage.',
    whyUse: 'Avoids premature cesarean for “failure to progress” before modern minimums for active labor and second stage are met.',
    inputs: [
      selectInput('stage', 'Labor stage of concern', [
        { label: 'First stage (active phase)', value: 'first' },
        { label: 'Second stage (complete dilation to delivery)', value: 'second' },
      ]),
      selectInput('parity', 'Parity', [
        { label: 'Nulliparous', value: 'nullip' },
        { label: 'Multiparous', value: 'multip' },
      ]),
      yesNo('epidural', 'Epidural anesthesia', 1),
      numberInput('dilationCm', 'Current cervical dilation (first stage)', {
        unit: 'cm',
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 6,
      }),
      yesNo('ruptured', 'Membranes ruptured', 1),
      yesNo('adequateUv', 'Adequate uterine activity (≥200 MVU / clinical adequacy)', 1),
      numberInput('hoursNoChange', 'Hours without cervical change (first) or hours in second stage', {
        unit: 'hours',
        min: 0,
        max: 12,
        step: 0.5,
        defaultValue: 4,
      }),
      yesNo('malpresentation', 'Known malposition/CPD concern or nonreassuring fetal status', 1),
    ],
    calculate(values) {
      const stage = String(values.stage ?? 'first');
      const nullip = String(values.parity ?? 'nullip') === 'nullip';
      const hours = num(values.hoursNoChange, 4);
      const dil = num(values.dilationCm, 6);
      const epidural = bool(values.epidural);
      const adequate = bool(values.adequateUv);
      const rom = bool(values.ruptured);
      const fetalIssue = bool(values.malpresentation);

      if (fetalIssue) {
        return {
          score: hours,
          label: 'Fetal/positional factors override pure time rules',
          interpretation:
            'Nonreassuring fetal status, true CPD, or uncorrectable malpresentation may mandate intervention regardless of time-based arrest definitions. Manage for the fetal/maternal indication.',
          riskLevel: 'high' as const,
        };
      }

      if (stage === 'first') {
        // Active labor often considered from 6 cm in modern ACOG
        if (dil < 6) {
          return {
            score: dil,
            unit: 'cm',
            label: 'Likely latent / before active-phase arrest rules',
            interpretation: `Dilation ${dil} cm is before the common 6 cm active-phase threshold used in contemporary ACOG guidance. Avoid diagnosing active-phase arrest too early; support progress and reassess.`,
            riskLevel: 'moderate' as const,
            recommendations: ['Allow latent labor time', 'Avoid premature CS for FTP', 'Support coping / consider ROM-oxytocin carefully'],
          };
        }
        // Arrest: ≥6 cm + ROM + no change ≥4 h adequate UCs OR ≥6 h inadequate UCs
        const arrest =
          rom && ((adequate && hours >= 4) || (!adequate && hours >= 6));
        return {
          score: hours,
          unit: 'hours',
          label: arrest ? 'Meets simplified active-phase arrest criteria' : 'Does not yet meet arrest minima',
          interpretation: arrest
            ? `At ≥6 cm with ruptured membranes and ${hours} h without change (${adequate ? 'adequate' : 'inadequate'} UCs), simplified ACOG active-phase arrest criteria are met. Discuss cesarean vs further efforts based on full clinical picture.`
            : `Not meeting simplified arrest definition yet (need ≥6 cm, ROM, and ≥4 h with adequate UCs or ≥6 h if inadequate). Current: ${dil} cm, ${hours} h, ROM=${rom ? 'yes' : 'no'}. Continue labor support and optimize contractions if safe.`,
          riskLevel: arrest ? 'high' : 'moderate',
          details: [
            { label: 'Dilation', value: `${dil} cm` },
            { label: 'Hours no change', value: `${hours} h` },
            { label: 'ROM', value: rom ? 'Yes' : 'No' },
            { label: 'Adequate UCs', value: adequate ? 'Yes' : 'No' },
          ],
        };
      }

      // Second stage: nullip ≥3 h (≥4 with epidural); multip ≥2 h (≥3 with epidural) common thresholds for arrest diagnosis allowance
      const limit = nullip ? (epidural ? 4 : 3) : epidural ? 3 : 2;
      const arrest2 = hours >= limit;
      return {
        score: hours,
        unit: 'hours',
        label: arrest2 ? 'Second-stage duration meets common arrest threshold' : 'Second-stage duration below common threshold',
        interpretation: `Second stage ${hours} h (limit often ${limit} h for ${nullip ? 'nullipara' : 'multipara'}${epidural ? ' with epidural' : ''}). ${
          arrest2
            ? 'Duration threshold for diagnosing arrest commonly met — consider operative vaginal delivery vs cesarean based on station, fetus, and progress.'
            : 'Still within commonly allowed second-stage duration if maternal/fetal status reassuring and some progress; continue passive/active second-stage management per protocol.'
        }`,
        riskLevel: arrest2 ? 'high' : 'moderate',
        details: [
          { label: 'Parity', value: nullip ? 'Nulliparous' : 'Multiparous' },
          { label: 'Epidural', value: epidural ? 'Yes' : 'No' },
          { label: 'Common limit', value: `${limit} h` },
        ],
        recommendations: [
          'Manual rotation / position changes for malposition',
          'Operative vaginal delivery if prerequisites met',
          'Do not apply time limits rigidly if progressive descent',
        ],
      };
    },
    evidence: {
      summary:
        'ACOG/SMFM Safe Prevention of Primary Cesarean guidance: active phase often from 6 cm; arrest requires ROM plus ≥4 h adequate or ≥6 h inadequate UCs without change. Second-stage longer allowances with epidural.',
      formula: 'Rule-based ACOG time and dilation criteria (educational)',
      validation: 'Based on Zhang labor curves and ACOG Obstetric Care Consensus; institutional policies may vary.',
      references: [
        {
          title: 'Safe prevention of the primary cesarean delivery',
          citation: 'ACOG/SMFM Obstetric Care Consensus No. 1. Am J Obstet Gynecol. 2014',
          year: 2014,
          pmid: '24565430',
          doi: '10.1016/j.ajog.2014.01.026',
        },
      ],
    },
    nextSteps: [
      { condition: 'Arrest met', actions: ['Counsel CS (1st stage) or OVD/CS if 2nd stage prerequisites met', 'Document adequacy of labor', 'Prepare OR if needed'] },
      { condition: 'Criteria not met', actions: ['Optimize UCs', 'Support, hydration, position', 'Avoid premature FTP label'] },
    ],
    pearls: [
      'Progress in descent can matter as much as clock time in second stage.',
      'Always prioritize fetal heart tracing and maternal status over pure definitions.',
    ],
  },

  // ─── 16. PPH blood loss class ──────────────────────────────────────────────
  {
    id: 'pph-class',
    name: 'Postpartum Hemorrhage Blood Loss Classification',
    shortName: 'PPH Class',
    description: 'Classifies postpartum hemorrhage severity by estimated blood loss and clinical shock features (educational).',
    category: 'obstetrics',
    tags: ['pph', 'postpartum hemorrhage', 'blood loss', 'ob emergency'],
    whenToUse: 'Postpartum bleeding above expected or when staging response to obstetric hemorrhage protocols.',
    whyUse: 'Early recognition of stage/class drives activation of hemorrhage bundles and transfusion strategies.',
    inputs: [
      numberInput('ebl', 'Estimated / quantitative blood loss', {
        unit: 'mL',
        min: 0,
        max: 5000,
        step: 50,
        defaultValue: 600,
      }),
      selectInput('delivery', 'Delivery type', [
        { label: 'Vaginal', value: 'vaginal' },
        { label: 'Cesarean', value: 'cesarean' },
      ]),
      yesNo('tachycardia', 'Tachycardia', 1),
      yesNo('hypotension', 'Hypotension / narrow pulse pressure', 1),
      yesNo('altered', 'Altered mentation / marked distress', 1),
      yesNo('ongoing', 'Ongoing uncontrolled bleeding', 1),
    ],
    calculate(values) {
      const ebl = num(values.ebl, 600);
      const ces = String(values.delivery ?? 'vaginal') === 'cesarean';
      // ACOG: PPH ≥1000 mL or signs of hypovolemia regardless of route (2017 definition)
      // Traditional: ≥500 vaginal / ≥1000 CS still used colloquially
      const classicThreshold = ces ? 1000 : 500;
      const pphModern = ebl >= 1000 || bool(values.hypotension) || bool(values.altered);
      const pphTraditional = ebl >= classicThreshold;
      let stage = 0;
      let label = 'Within expected blood loss (not PPH by volume alone)';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (ebl >= 1500 || (bool(values.hypotension) && bool(values.ongoing)) || bool(values.altered)) {
        stage = 3;
        label = 'Severe PPH / Stage 3-style hemorrhage';
        riskLevel = 'critical';
      } else if (ebl >= 1000 || (pphTraditional && (bool(values.tachycardia) || bool(values.hypotension)))) {
        stage = 2;
        label = 'PPH with significant volume / Stage 2-style';
        riskLevel = 'high';
      } else if (pphModern || pphTraditional) {
        stage = 1;
        label = 'PPH threshold met';
        riskLevel = 'moderate';
      }
      return {
        score: ebl,
        unit: 'mL',
        label,
        interpretation: `EBL/QBL ${ebl} mL after ${ces ? 'cesarean' : 'vaginal'} birth. Modern ACOG PPH definition: ≥1000 mL OR signs of hypovolemia (met: ${pphModern ? 'yes' : 'no'}). Traditional route threshold ${classicThreshold} mL (met: ${pphTraditional ? 'yes' : 'no'}). Stage helper ${stage}. Activate obstetric hemorrhage protocol early — underestimation of EBL is common; prefer quantitative blood loss.`,
        riskLevel,
        details: [
          { label: 'EBL/QBL', value: `${ebl} mL` },
          { label: 'Stage helper', value: String(stage) },
          { label: 'Tachycardia', value: bool(values.tachycardia) ? 'Yes' : 'No' },
          { label: 'Hypotension', value: bool(values.hypotension) ? 'Yes' : 'No' },
        ],
        recommendations: [
          '4 Ts: Tone, Trauma, Tissue, Thrombin',
          'Uterotonics, empty bladder, bimanual massage',
          'Activate MTP/hemorrhage cart per stage',
        ],
      };
    },
    evidence: {
      summary:
        'ACOG defines PPH as cumulative blood loss ≥1000 mL or blood loss with signs of hypovolemia within 24 h of birth, regardless of route. Staged hemorrhage protocols escalate care by volume and physiology.',
      formula: 'Volume thresholds + hypovolemia signs → stage helper',
      validation: 'Definition updates (ACOG 2017 PB) and CMQCC/NPMS staged bundles widely implemented.',
      references: [
        {
          title: 'Postpartum Hemorrhage: ACOG Practice Bulletin No. 183',
          citation: 'ACOG. Obstet Gynecol. 2017',
          year: 2017,
          pmid: '28937571',
          doi: '10.1097/AOG.0000000000002351',
        },
      ],
    },
    nextSteps: [
      { condition: 'PPH', actions: ['Call for help', 'Uterotonics', 'IV access/labs', 'QBL ongoing'] },
      { condition: 'Severe', actions: ['MTP', 'Surgical backup', 'IR/hysterectomy readiness'] },
    ],
    pearls: [
      'Visual EBL underestimates — use quantitative methods.',
      'Vital signs may compensate until large loss, especially in young patients.',
    ],
  },

  // ─── 17. Obstetric shock index ─────────────────────────────────────────────
  {
    id: 'shock-index-ob',
    name: 'Obstetric Shock Index',
    shortName: 'OB Shock Index',
    description: 'Heart rate / systolic BP shock index tailored to pregnant/postpartum interpretation thresholds.',
    category: 'obstetrics',
    tags: ['shock index', 'pph', 'maternal', 'hemorrhage', 'ob'],
    whenToUse: 'Suspected obstetric hemorrhage or hypovolemia when early recognition of shock is needed.',
    whyUse: 'Pregnancy alters baseline HR/BP; shock index can rise before frank hypotension.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 110 }),
      numberInput('sbp', 'Systolic blood pressure', { unit: 'mmHg', min: 50, max: 220, defaultValue: 100 }),
      selectInput('context', 'Context', [
        { label: 'Postpartum / hemorrhage concern', value: 'pph' },
        { label: 'Antepartum', value: 'ante' },
      ]),
    ],
    calculate(values) {
      const hr = num(values.hr, 110);
      const sbp = num(values.sbp, 100);
      if (sbp <= 0) {
        return {
          score: '—',
          label: 'Invalid SBP',
          interpretation: 'Systolic BP must be positive.',
          riskLevel: 'info',
        };
      }
      const si = round(hr / sbp, 2);
      // OB literature often flags SI ≥0.9 as concerning; ≥1.1–1.7 higher morbidity
      const r = riskFromThresholds(si, [
        {
          max: 0.89,
          level: 'low',
          label: 'SI <0.9 — lower concern',
          interpretation: `Obstetric shock index ${si} (HR ${hr} / SBP ${sbp}). Values <0.9 are generally less concerning, but do not ignore ongoing bleeding or symptoms.`,
        },
        {
          max: 1.09,
          level: 'moderate',
          label: 'SI 0.9–1.1 — concerning',
          interpretation: `SI ${si}: at/above thresholds associated with significant bleeding in obstetric studies. Activate heightened surveillance and treat cause (often PPH).`,
        },
        {
          max: 1.69,
          level: 'high',
          label: 'SI 1.1–1.7 — high risk',
          interpretation: `SI ${si}: high risk band for massive hemorrhage / transfusion need. Aggressive resuscitation and hemorrhage protocol.`,
        },
        {
          max: 20,
          level: 'critical',
          label: 'SI ≥1.7 — critical',
          interpretation: `SI ${si}: critical hypovolemia pattern. Concurrent ABC resuscitation, blood products, and definitive hemorrhage control.`,
        },
      ]);
      return {
        score: si,
        unit: 'HR/SBP',
        ...r,
        details: [
          { label: 'HR', value: `${hr} bpm` },
          { label: 'SBP', value: `${sbp} mmHg` },
          { label: 'Context', value: String(values.context ?? 'pph') },
        ],
        recommendations: [
          'Trend SI during resuscitation',
          'Do not wait for hypotension to treat PPH',
          'Pair with QBL and clinical exam',
        ],
      };
    },
    evidence: {
      summary:
        'Shock index = HR/SBP. In obstetrics, SI ≥0.9 has been associated with significant PPH and transfusion; higher cutoffs track ICU/massive transfusion risk.',
      formula: 'SI = HR ÷ SBP',
      validation: 'Multiple obstetric cohorts; cutoffs vary slightly by study. Educational thresholds used here.',
      references: [
        {
          title: 'Shock index and early recognition of maternal hemorrhage',
          citation: 'Nathan HL et al. / related obstetric SI literature; Le Bas et al. observations',
          year: 2013,
          pmid: '17955559',
          doi: '10.1002/chem.200701160',
        },
      ],
    },
    nextSteps: [
      { condition: 'SI ≥0.9', actions: ['Evaluate bleeding', 'IV access', 'Type & cross', 'Uterotonics if PPH'] },
      { condition: 'SI ≥1.1', actions: ['Hemorrhage protocol', 'Blood products readiness'] },
    ],
    pearls: [
      'Beta-blockers and arrhythmias confound SI.',
      'Distinct from general emergency shock-index tools by obstetric cutoffs.',
    ],
  },

  // ─── 18. Eclampsia magnesium dosing ────────────────────────────────────────
  {
    id: 'eclampsia-mag',
    name: 'Magnesium Sulfate for Eclampsia (Educational Dosing)',
    shortName: 'Eclampsia Mg',
    description:
      'Educational reference for magnesium sulfate loading and maintenance regimens used for eclampsia/seizure prophylaxis in preeclampsia.',
    category: 'obstetrics',
    tags: ['magnesium', 'eclampsia', 'preeclampsia', 'seizure', 'ob'],
    whenToUse: 'Severe preeclampsia seizure prophylaxis or eclampsia treatment when selecting a standard MgSO₄ regimen.',
    whyUse: 'Standardized loading/maintenance reduces dosing errors; renal function adjusts maintenance.',
    inputs: [
      selectInput('indication', 'Indication', [
        { label: 'Eclampsia (active/recent seizure)', value: 'eclampsia' },
        { label: 'Severe preeclampsia / prophylaxis', value: 'prophylaxis' },
      ]),
      selectInput('regimen', 'Regimen style', [
        { label: 'IV Zuspan-style (4–6 g load + 1–2 g/h)', value: 'iv' },
        { label: 'IM Pritchard-style (educational overview)', value: 'im' },
      ]),
      selectInput('load', 'IV loading dose choice', [
        { label: '4 g IV over 15–20 min', value: 4 },
        { label: '6 g IV over 15–20 min', value: 6 },
      ]),
      selectInput('maintenance', 'IV maintenance', [
        { label: '1 g/h', value: 1 },
        { label: '2 g/h', value: 2 },
      ]),
      yesNo('renalImpair', 'Significant renal impairment / oliguria', 1),
      numberInput('weightKg', 'Weight (optional, for context)', { unit: 'kg', min: 40, max: 200, defaultValue: 80 }),
    ],
    calculate(values) {
      const ind = String(values.indication ?? 'prophylaxis');
      const regimen = String(values.regimen ?? 'iv');
      const load = num(values.load, 6);
      let maint = num(values.maintenance, 2);
      if (bool(values.renalImpair)) maint = Math.min(maint, 1);
      if (regimen === 'im') {
        return {
          score: load,
          unit: 'g load',
          label: 'Pritchard-style IM overview (educational)',
          interpretation: `Classic Pritchard: 4 g IV + 10 g IM load (5 g each buttock), then 5 g IM every 4 h in alternate buttocks if reflexes present and RR adequate. Prefer IV regimens in high-resource settings. Indication: ${ind}. Monitor for toxicity (loss of reflexes, respiratory depression); calcium gluconate at bedside.`,
          riskLevel: ind === 'eclampsia' ? 'critical' : 'high',
          recommendations: [
            'Airway protection during seizure',
            'BP control with agents safe in pregnancy',
            'Delivery is definitive therapy after stabilization',
          ],
        };
      }
      return {
        score: load,
        unit: 'g load',
        label: `IV load ${load} g → maintain ${maint} g/h`,
        interpretation: `Educational IV plan for ${ind}: load ${load} g MgSO₄ over ~15–20 minutes, then ${maint} g/h continuous infusion${
          bool(values.renalImpair) ? ' (reduced for renal impairment)' : ''
        }. Typical duration 24 h postpartum or from last seizure per protocol. Check q1h reflexes, RR, UOP; hold if toxic. Therapeutic levels often ~4.8–8.4 mg/dL when measured.`,
        riskLevel: ind === 'eclampsia' ? 'critical' : 'high',
        details: [
          { label: 'Load', value: `${load} g IV` },
          { label: 'Maintenance', value: `${maint} g/h` },
          { label: 'Renal adjustment', value: bool(values.renalImpair) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Seizure: protect airway, left lateral, Mag as first-line',
          'If seizure on Mag: additional 2 g IV bolus per many protocols',
          'Have calcium gluconate 1 g IV ready for toxicity',
        ],
      };
    },
    evidence: {
      summary:
        'Magnesium sulfate is first-line for eclamptic seizures and prophylaxis in severe preeclampsia (Magpie trial and ACOG guidance). IV regimens common in the US; IM Pritchard used globally.',
      formula: 'Load 4–6 g IV + maintain 1–2 g/h (adjust for renal function)',
      validation: 'Robust RCT/guideline support for MgSO₄ superiority over other anticonvulsants in eclampsia.',
      references: [
        {
          title: 'Do women with pre-eclampsia, and their babies, benefit from magnesium sulphate? (Magpie)',
          citation: 'Magpie Trial Collaborative Group. Lancet. 2002',
          year: 2002,
          pmid: '12090977',
          doi: '10.1016/s0140-6736(02)09088-8',
        },
        {
          title: 'Gestational Hypertension and Preeclampsia: ACOG Practice Bulletin No. 222',
          citation: 'ACOG. Obstet Gynecol. 2020',
          year: 2020,
          pmid: '32443079',
          doi: '10.1097/AOG.0000000000003891',
        },
      ],
    },
    nextSteps: [
      { condition: 'Eclampsia', actions: ['MagSO₄', 'ABCs', 'BP control', 'Plan delivery'] },
      { condition: 'Toxicity signs', actions: ['Stop Mag', 'Calcium gluconate', 'Support ventilation'] },
    ],
    pearls: [
      'Benzodiazepines are second-line if seizures persist after Mag boluses.',
      'Concurrent nifedipine and Mag is generally acceptable with monitoring — know local policy.',
    ],
  },

  // ─── 19. IADPSG GDM thresholds ─────────────────────────────────────────────
  {
    id: 'iadsps-gdm',
    name: 'IADPSG Gestational Diabetes Thresholds',
    shortName: 'IADPSG GDM',
    description: 'Interprets one-step 75-g OGTT values against IADPSG / WHO diagnostic thresholds for GDM.',
    category: 'obstetrics',
    tags: ['gdm', 'iadpsg', 'ogtt', 'diabetes', 'pregnancy'],
    whenToUse: 'When 75-g 2-hour OGTT results are available and IADPSG one-step criteria are used.',
    whyUse: 'IADPSG diagnoses GDM if any single value meets/exceeds fasting, 1-h, or 2-h cutoffs.',
    inputs: [
      numberInput('fasting', 'Fasting plasma glucose', {
        unit: 'mg/dL',
        min: 40,
        max: 300,
        step: 1,
        defaultValue: 90,
      }),
      numberInput('h1', '1-hour glucose', { unit: 'mg/dL', min: 40, max: 400, step: 1, defaultValue: 175 }),
      numberInput('h2', '2-hour glucose', { unit: 'mg/dL', min: 40, max: 400, step: 1, defaultValue: 140 }),
      yesNo('overtCheck', 'Also flag possible overt diabetes in pregnancy thresholds', 1),
    ],
    calculate(values) {
      const f = num(values.fasting, 90);
      const h1 = num(values.h1, 175);
      const h2 = num(values.h2, 140);
      // IADPSG: fasting ≥92, 1-h ≥180, 2-h ≥153 mg/dL
      const failF = f >= 92;
      const fail1 = h1 >= 180;
      const fail2 = h2 >= 153;
      const fails = [failF, fail1, fail2].filter(Boolean).length;
      const gdm = fails >= 1;
      // Overt diabetes (WHO/IADPSG discussion): fasting ≥126 or 2-h ≥200 (simplified)
      const overt = bool(values.overtCheck) && (f >= 126 || h2 >= 200);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'GDM criteria not met (IADPSG)';
      if (overt) {
        riskLevel = 'high';
        label = 'Possible overt diabetes in pregnancy';
      } else if (gdm) {
        riskLevel = 'high';
        label = `GDM by IADPSG (${fails} abnormal value${fails > 1 ? 's' : ''})`;
      }
      return {
        score: fails,
        unit: 'abnormal values',
        label,
        interpretation: `75-g OGTT: fasting ${f}, 1-h ${h1}, 2-h ${h2} mg/dL. IADPSG cutoffs: ≥92 / ≥180 / ≥153. ${
          gdm ? '≥1 abnormal value diagnoses GDM.' : 'No value meets IADPSG GDM thresholds.'
        } ${overt ? 'Values also suggest possible overt diabetes — confirm and manage as pre-existing DM pathway.' : ''} Note: Carpenter-Coustan two-step criteria differ.`,
        riskLevel,
        details: [
          { label: 'Fasting ≥92', value: failF ? 'Yes' : 'No' },
          { label: '1-h ≥180', value: fail1 ? 'Yes' : 'No' },
          { label: '2-h ≥153', value: fail2 ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Nutrition therapy + glucose monitoring if GDM',
          'Medication if targets unmet',
          'Antepartum fetal surveillance per local GDM protocol',
        ],
      };
    },
    evidence: {
      summary:
        'IADPSG recommends a one-step 75-g OGTT with GDM if fasting ≥92, 1-h ≥180, or 2-h ≥153 mg/dL (any one). Based largely on HAPO associations.',
      formula: 'GDM if any: FPG ≥92 or 1-h ≥180 or 2-h ≥153 mg/dL',
      validation: 'HAPO study informed thresholds; adoption varies by country vs two-step Carpenter-Coustan.',
      references: [
        {
          title: 'International association of diabetes and pregnancy study groups recommendations',
          citation: 'IADPSG. Diabetes Care. 2010',
          year: 2010,
          pmid: '20190296',
          doi: '10.2337/dc09-1848',
        },
        {
          title: 'Hyperglycemia and Adverse Pregnancy Outcomes (HAPO)',
          citation: 'HAPO Study Cooperative Research Group. N Engl J Med. 2008',
          year: 2008,
          pmid: '18463375',
          doi: '10.1056/NEJMoa0707943',
        },
      ],
    },
    nextSteps: [
      { condition: 'GDM', actions: ['Diabetes education', 'Fingersticks', 'Growth scans as indicated'] },
      { condition: 'Overt DM suspicion', actions: ['A1c/retinal exam considerations', 'Endocrine collab'] },
    ],
    pearls: [
      'Units: divide mg/dL by 18 for mmol/L.',
      'Carpenter-Coustan uses different cutoffs and usually requires 2 abnormal values on 100-g OGTT.',
    ],
  },

  // ─── 20. NRP target SpO2 by minute ─────────────────────────────────────────
  {
    id: 'nrp-oxygen',
    name: 'NRP Target SpO₂ by Minute of Life',
    shortName: 'NRP SpO₂',
    description: 'Neonatal Resuscitation Program preductal SpO₂ targets during the first 10 minutes after birth.',
    category: 'pediatrics',
    tags: ['nrp', 'oxygen', 'spo2', 'neonatal resuscitation', 'newborn'],
    whenToUse: 'Delivery room resuscitation when titrating oxygen against minute-specific SpO₂ goals.',
    whyUse: 'Healthy newborns rise gradually to adult SpO₂; over-oxygenation and hypoxia both carry risk.',
    inputs: [
      selectInput('minute', 'Minute of life', [
        { label: '1 minute', value: 1 },
        { label: '2 minutes', value: 2 },
        { label: '3 minutes', value: 3 },
        { label: '4 minutes', value: 4 },
        { label: '5 minutes', value: 5 },
        { label: '10 minutes', value: 10 },
      ]),
      numberInput('spo2', 'Measured preductal SpO₂', { unit: '%', min: 10, max: 100, defaultValue: 70 }),
      selectInput('startFiO2', 'Initial FiO₂ strategy (term vs preterm context)', [
        { label: '≥35 weeks — start air (21%)', value: 'term' },
        { label: '<35 weeks — often 21–30% per NRP', value: 'preterm' },
      ]),
    ],
    calculate(values) {
      const minute = num(values.minute, 1);
      const spo2 = num(values.spo2, 70);
      // NRP approximate interquartile target ranges
      const targets: Record<number, { lo: number; hi: number }> = {
        1: { lo: 60, hi: 65 },
        2: { lo: 65, hi: 70 },
        3: { lo: 70, hi: 75 },
        4: { lo: 75, hi: 80 },
        5: { lo: 80, hi: 85 },
        10: { lo: 85, hi: 95 },
      };
      const t = targets[minute] ?? targets[5];
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let label = 'Within NRP target window';
      if (spo2 < t.lo - 5) {
        riskLevel = 'high';
        label = 'Below target — increase O₂ / support';
      } else if (spo2 < t.lo) {
        riskLevel = 'moderate';
        label = 'Slightly below target';
      } else if (spo2 > t.hi + 5) {
        riskLevel = 'moderate';
        label = 'Above target — wean FiO₂';
      } else if (spo2 > t.hi) {
        riskLevel = 'low';
        label = 'Slightly above target — wean toward range';
      }
      return {
        score: spo2,
        unit: '%',
        label,
        interpretation: `At ${minute} min of life, NRP preductal SpO₂ target ≈ ${t.lo}–${t.hi}%. Measured ${spo2}%. Use pulse oximetry on right hand; titrate free-flow O₂ or blended gas with PPV as indicated. Initial FiO₂: ${
          String(values.startFiO2) === 'preterm' ? '21–30% for many preterms' : '21% for term'
        }. Follow full NRP algorithm for HR-driven decisions.`,
        riskLevel,
        details: [
          { label: 'Minute', value: String(minute) },
          { label: 'Target range', value: `${t.lo}–${t.hi}%` },
          { label: 'Measured SpO₂', value: `${spo2}%` },
        ],
        recommendations: [
          'HR is the most important vital in NRP',
          'Start PPV for HR <100 or ineffective breathing',
          'Avoid 100% O₂ routinely in term infants',
        ],
      };
    },
    evidence: {
      summary:
        'NRP provides minute-specific preductal SpO₂ targets after birth reflecting normal transition. Oxygen is titrated to targets using blended gas when available.',
      formula: 'Compare SpO₂ to minute targets (60–65% at 1 min → 85–95% at 10 min)',
      validation: 'AAP/AHA NRP textbooks and guidelines; targets from transitional physiology studies.',
      references: [
        {
          title: 'Neonatal Resuscitation: AAP/AHA Guideline Part',
          citation: 'Aziz K et al. Circulation / Pediatrics. 2020',
          year: 2020,
          pmid: '33081528',
          doi: '10.1161/CIR.0000000000000902',
        },
      ],
    },
    nextSteps: [
      { condition: 'SpO₂ low + poor effort/HR', actions: ['MR SOPA corrective steps', 'PPV', '↑FiO₂ carefully'] },
      { condition: 'SpO₂ high', actions: ['Wean FiO₂ to target'] },
    ],
    pearls: [
      'Preductal probe = right hand/wrist.',
      'Delayed cord clamping practices may alter early saturations slightly — still use NRP targets.',
    ],
  },

  // ─── 21. TTN vs RDS clinical pattern ───────────────────────────────────────
  {
    id: 'ttn-vs-rds',
    name: 'TTN vs RDS Clinical Pattern Helper',
    shortName: 'TTN vs RDS',
    description:
      'Educational discriminator for transient tachypnea of the newborn (TTN) versus respiratory distress syndrome (RDS) patterns.',
    category: 'pediatrics',
    tags: ['ttn', 'rds', 'neonate', 'respiratory distress', 'newborn'],
    whenToUse: 'Term or preterm newborns with early respiratory distress when TTN and RDS are leading differentials.',
    whyUse: 'Pattern recognition guides expected course, surfactant need, and workup breadth (still exclude pneumonia/PPHN).',
    inputs: [
      numberInput('gaWeeks', 'Gestational age', { unit: 'weeks', min: 23, max: 43, step: 0.1, defaultValue: 36 }),
      selectInput('onset', 'Onset of distress', [
        { label: 'Immediate / first minutes–hours', value: 'early' },
        { label: 'After a period of relative wellness', value: 'delayed' },
      ]),
      yesNo('csection', 'Cesarean without labor', 1),
      yesNo('grunting', 'Prominent grunting / marked retractions', 1),
      yesNo('cyanosisO2', 'Cyanosis or significant O₂ need', 1),
      yesNo('fluidCXR', 'CXR: fluid in fissures / perihilar streaking (TTN-like)', 1),
      yesNo('reticCXR', 'CXR: diffuse reticulogranular / air bronchograms (RDS-like)', 1),
      yesNo('improving6_12', 'Clear improvement by 6–12–24 h', 1),
      yesNo('worsening', 'Progressive worsening over first day', 1),
      yesNo('prematurityRisk', 'No/late antenatal steroids if preterm', 1),
    ],
    calculate(values) {
      let ttn = 0;
      let rds = 0;
      const ga = num(values.gaWeeks, 36);
      if (ga >= 36) ttn += 2;
      if (ga < 34) rds += 3;
      else if (ga < 37) rds += 1;
      if (bool(values.csection)) ttn += 2;
      if (String(values.onset) === 'early') {
        ttn += 1;
        rds += 1;
      }
      if (bool(values.fluidCXR)) ttn += 3;
      if (bool(values.reticCXR)) rds += 3;
      if (bool(values.improving6_12)) ttn += 3;
      if (bool(values.worsening)) rds += 2;
      if (bool(values.grunting) && bool(values.cyanosisO2)) rds += 1;
      if (bool(values.prematurityRisk) && ga < 35) rds += 2;
      const diff = ttn - rds;
      let label = 'Indeterminate — broad differential';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      if (diff >= 3) {
        label = 'Pattern favors TTN';
        riskLevel = 'moderate';
      } else if (diff <= -3) {
        label = 'Pattern favors RDS';
        riskLevel = 'high';
      } else {
        label = 'Mixed / indeterminate pattern';
        riskLevel = 'moderate';
      }
      return {
        score: diff,
        unit: 'TTN−RDS points',
        label,
        interpretation: `Educational scores TTN=${ttn}, RDS=${rds} (difference ${diff}). ${label}. Always exclude congenital pneumonia, meconium aspiration, CHD, and PPHN. TTN typically improves within 24–72 h; RDS may need CPAP/surfactant especially if preterm with classic CXR.`,
        riskLevel,
        details: [
          { label: 'TTN points', value: String(ttn) },
          { label: 'RDS points', value: String(rds) },
          { label: 'GA', value: `${ga} wks` },
        ],
        recommendations: [
          'Supportive O₂/CPAP as needed',
          'Blood culture/antibiotics if infection not excluded',
          'Surfactant for clear RDS with significant support need',
        ],
      };
    },
    evidence: {
      summary:
        'TTN is delayed clearance of fetal lung fluid (term/late preterm, C-section risk) with transient tachypnea. RDS is surfactant deficiency (preterm) with progressive distress and classic CXR.',
      formula: 'Weighted pattern points for TTN vs RDS features',
      validation: 'Clinical teaching aid only — not a validated diagnostic test.',
      references: [
        {
          title: 'Transient tachypnea of the newborn',
          citation: 'Jha K et al. StatPearls / classic Avery literature context',
          year: 2023,
          pmid: '30020667',
        },
      ],
    },
    nextSteps: [
      { condition: 'Favors RDS', actions: ['CPAP', 'Consider surfactant', 'Minimize hypothermia'] },
      { condition: 'Favors TTN', actions: ['Supportive care', 'Expect improvement', 'Feeding plan'] },
      { condition: 'Indeterminate', actions: ['Sepsis workup threshold', 'Echo if PPHN/CHD concern'] },
    ],
    pearls: [
      'GBS pneumonia can mimic both — risk factors matter.',
      'Late preterm “TTN” can still have relative surfactant deficiency.',
    ],
  },

  // ─── 22. Direct bilirubin red flags ────────────────────────────────────────
  {
    id: 'direct-bili',
    name: 'Conjugated (Direct) Hyperbilirubinemia Red Flags',
    shortName: 'Direct Bili',
    description:
      'Flags pathologic conjugated hyperbilirubinemia in neonates/infants and structures cholestasis red-flag checklist.',
    category: 'pediatrics',
    tags: ['direct bilirubin', 'conjugated', 'cholestasis', 'biliary atresia', 'neonate'],
    whenToUse: 'Any neonate/infant with elevated direct/conjugated bilirubin or prolonged jaundice.',
    whyUse: 'Conjugated hyperbilirubinemia is pathologic until proven otherwise; early biliary atresia referral improves outcomes.',
    inputs: [
      numberInput('direct', 'Direct / conjugated bilirubin', {
        unit: 'mg/dL',
        min: 0,
        max: 30,
        step: 0.1,
        defaultValue: 1.5,
      }),
      numberInput('total', 'Total bilirubin', { unit: 'mg/dL', min: 0, max: 50, step: 0.1, defaultValue: 8 }),
      numberInput('ageDays', 'Age', { unit: 'days', min: 0, max: 180, defaultValue: 21 }),
      yesNo('acholic', 'Acholic (pale) stools', 2),
      yesNo('darkUrine', 'Dark urine staining', 1),
      yesNo('hepatomegaly', 'Hepatomegaly or splenomegaly', 1),
      yesNo('failureThrive', 'Failure to thrive / poor feeding', 1),
      yesNo('sick', 'Ill-appearing, coagulopathy, or hypoglycemia', 3),
    ],
    calculate(values) {
      const direct = num(values.direct, 1.5);
      const total = num(values.total, 8);
      const age = num(values.ageDays, 21);
      // Common thresholds: direct >1 mg/dL if total <5, or >20% of total; many use conjugated >1 mg/dL always concerning
      const ratio = total > 0 ? direct / total : 0;
      const labFlag = direct >= 1.0 || (total >= 5 && ratio >= 0.2);
      let score = labFlag ? 2 : 0;
      if (bool(values.acholic)) score += 2;
      if (bool(values.darkUrine)) score += 1;
      if (bool(values.hepatomegaly)) score += 1;
      if (bool(values.failureThrive)) score += 1;
      if (bool(values.sick)) score += 3;
      if (age >= 14 && labFlag) score += 1;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'No strong conjugated red flags',
          interpretation: `Direct ${direct} mg/dL / total ${total} mg/dL at ${age} d. Lab conjugated-flag: ${labFlag ? 'yes' : 'no'}. Continue appropriate unconjugated jaundice pathway if only indirect elevated.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Conjugated hyperbilirubinemia concern',
          interpretation: `Score ${score}: pathologic conjugated pattern likely. Fractionate bilirubin if not already, evaluate cholestasis (LFTs, coags, culture as indicated), and avoid dismissing as “breast milk jaundice.”`,
        },
        {
          max: 5,
          level: 'high',
          label: 'High concern for cholestasis',
          interpretation: `Score ${score}: high concern. Urgent workup for biliary atresia and other cholestatic disorders — stool color card, ultrasound, specialty referral (AAP/NASPGHAN timing).`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Critical — ill infant or stacked red flags',
          interpretation: `Score ${score}: critical features. Stabilize, reverse coagulopathy (vitamin K), evaluate sepsis/metabolic disease, and emergent GI/hepatology involvement.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Direct', value: `${direct} mg/dL` },
          { label: 'Total', value: `${total} mg/dL` },
          { label: 'Direct/total', value: `${round(ratio * 100, 0)}%` },
          { label: 'Lab flag', value: labFlag ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Never start phototherapy alone for predominantly conjugated jaundice without evaluation',
          'Early Kasai window for biliary atresia',
          'Check metabolic newborn screen / red flags for liver failure',
        ],
      };
    },
    evidence: {
      summary:
        'Conjugated hyperbilirubinemia (often direct >1 mg/dL) is abnormal and warrants cholestasis evaluation. Pale stools and prolonged jaundice are classic biliary atresia clues.',
      formula: 'Lab thresholds + clinical red-flag points',
      validation: 'Aligned with AAP jaundice and NASPGHAN cholestasis guidance principles; educational checklist.',
      references: [
        {
          title: 'Evaluating the infant with cholestasis',
          citation: 'Fawaz R et al. NASPGHAN/ESPGHAN guideline. J Pediatr Gastroenterol Nutr. 2017',
          year: 2017,
          pmid: '27429428',
          doi: '10.1097/MPG.0000000000001334',
        },
      ],
    },
    nextSteps: [
      { condition: 'Conjugated elevation', actions: ['Fractionate confirm', 'LFTs/GGT', 'Stool color', 'GI referral'] },
      { condition: 'Ill infant', actions: ['Sepsis workup', 'Coags + vitamin K', 'Glucose', 'Admit'] },
    ],
    pearls: [
      '“Direct” lab methods vary — know your assay.',
      'Breastfed infants can have prolonged unconjugated jaundice — conjugated still needs workup.',
    ],
  },

  // ─── 23. G6PD risk note checklist ──────────────────────────────────────────
  {
    id: 'g6pd',
    name: 'G6PD Deficiency Risk Checklist',
    shortName: 'G6PD',
    description:
      'Educational checklist for G6PD deficiency risk, hemolysis triggers, and neonatal jaundice considerations.',
    category: 'pediatrics',
    tags: ['g6pd', 'hemolysis', 'jaundice', 'neonate', 'enzyme deficiency'],
    whenToUse: 'Neonatal hyperbilirubinemia, acute hemolysis, or before prescribing oxidant drugs in at-risk populations.',
    whyUse: 'G6PD deficiency is common worldwide and a major cause of severe neonatal jaundice and drug-induced hemolysis.',
    inputs: [
      yesNo('male', 'Male sex', 1),
      yesNo('ancestry', 'Ancestry with higher prevalence (African, Mediterranean, Middle Eastern, Asian, etc.)', 1),
      yesNo('fhx', 'Family history of G6PD, favism, or unexplained severe neonatal jaundice', 2),
      yesNo('severeJaundice', 'Severe/early neonatal hyperbilirubinemia or need for exchange concern', 2),
      yesNo('acuteHeme', 'Acute hemolysis (dark urine, ↑indirect bili, ↑LDH, ↓haptoglobin, bite/blister cells)', 2),
      yesNo('trigger', 'Recent oxidant drug, infection, or fava beans', 2),
      yesNo('knownG6pd', 'Known G6PD deficiency diagnosis', 3),
      yesNo('testingPending', 'Enzyme assay/genetics pending or not yet sent', 0),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.male)) score += 1;
      if (bool(values.ancestry)) score += 1;
      if (bool(values.fhx)) score += 2;
      if (bool(values.severeJaundice)) score += 2;
      if (bool(values.acuteHeme)) score += 2;
      if (bool(values.trigger)) score += 2;
      if (bool(values.knownG6pd)) score += 3;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Lower pretest concern',
          interpretation: `Checklist ${score}: fewer G6PD risk features. Still consider testing per local newborn screening and before high-risk drugs in selected patients.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate concern',
          interpretation: `Score ${score}: intermediate concern for G6PD-related risk. Avoid oxidant triggers; send enzyme assay (mind false negatives during acute hemolysis).`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High concern / known disease pattern',
          interpretation: `Score ${score}: high concern or known G6PD deficiency pattern. Strict trigger avoidance, aggressive jaundice management if neonatal, and hematology input for acute hemolysis.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Known G6PD', value: bool(values.knownG6pd) ? 'Yes' : 'No' },
          { label: 'Acute hemolysis features', value: bool(values.acuteHeme) ? 'Yes' : 'No' },
          { label: 'Testing pending', value: bool(values.testingPending) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Avoid primaquine, rasburicase, nitrofurantoin, some sulfa agents, naphthalene, fava beans (list not exhaustive)',
          'Neonatal: low threshold for bili checks and phototherapy escalation',
          'Retest enzyme activity months after acute hemolysis if initially normal',
        ],
      };
    },
    evidence: {
      summary:
        'G6PD deficiency is an X-linked enzymopathy causing oxidative hemolysis and severe neonatal hyperbilirubinemia risk. Diagnosis by enzyme assay/genetics; management is trigger avoidance and supportive care.',
      formula: 'Clinical risk checklist (educational)',
      validation: 'WHO classification and pediatric hematology practice; not a substitute for laboratory diagnosis.',
      references: [
        {
          title: 'G6PD deficiency',
          citation: 'Cappellini MD, Fiorelli G. Lancet. 2008',
          year: 2008,
          pmid: '18177777',
          doi: '10.1016/S0140-6736(08)60073-2',
        },
      ],
    },
    nextSteps: [
      { condition: 'High concern neonate', actions: ['Serial bili', 'Hematocrit', 'G6PD assay', 'Hydration/phototherapy'] },
      { condition: 'Acute hemolysis', actions: ['Stop trigger', 'Support Hb', 'Monitor renal function'] },
    ],
    pearls: [
      'Female heterozygotes can still be symptomatic (lyonization).',
      'Enzyme levels may be falsely normal after reticulocytosis — repeat later.',
    ],
  },

  // ─── 24. PFAPA criteria ────────────────────────────────────────────────────
  {
    id: 'pfapa',
    name: 'PFAPA Criteria Helper',
    shortName: 'PFAPA',
    description:
      'Educational helper for PFAPA syndrome (Periodic Fever, Aphthous stomatitis, Pharyngitis, Adenitis) diagnostic features.',
    category: 'pediatrics',
    tags: ['pfapa', 'periodic fever', 'aphthous', 'pharyngitis', 'adenitis'],
    whenToUse: 'Children with regularly recurring sterile fever episodes when PFAPA is considered.',
    whyUse: 'Structured criteria separate PFAPA from cyclic neutropenia, monogenic autoinflammatory disease, and recurrent infection.',
    inputs: [
      yesNo('recurrentFever', 'Recurrent regularly timed fever episodes', 2),
      numberInput('episodeDays', 'Typical episode duration', { unit: 'days', min: 1, max: 21, defaultValue: 4 }),
      numberInput('intervalWeeks', 'Typical interval between episodes', {
        unit: 'weeks',
        min: 1,
        max: 16,
        defaultValue: 4,
      }),
      yesNo('aphthous', 'Aphthous stomatitis during episodes', 1),
      yesNo('pharyngitis', 'Pharyngitis / exudative tonsillitis (cultures negative)', 1),
      yesNo('adenitis', 'Cervical adenitis', 1),
      yesNo('wellBetween', 'Completely well between episodes with normal growth', 2),
      yesNo('onsetEarly', 'Onset before age 5 years', 1),
      yesNo('steroidAbort', 'Single-dose corticosteroid aborts episodes dramatically', 2),
      yesNo('excludeOther', 'Alternative causes reasonably excluded (cyclic neutropenia, FMF, infection, malignancy)', 2),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.recurrentFever)) score += 2;
      const ep = num(values.episodeDays, 4);
      const interval = num(values.intervalWeeks, 4);
      if (ep >= 2 && ep <= 7) score += 1;
      if (interval >= 2 && interval <= 8) score += 1;
      if (bool(values.aphthous)) score += 1;
      if (bool(values.pharyngitis)) score += 1;
      if (bool(values.adenitis)) score += 1;
      const cardinal = [bool(values.aphthous), bool(values.pharyngitis), bool(values.adenitis)].filter(Boolean).length;
      if (bool(values.wellBetween)) score += 2;
      if (bool(values.onsetEarly)) score += 1;
      if (bool(values.steroidAbort)) score += 2;
      if (bool(values.excludeOther)) score += 2;
      const classic =
        bool(values.recurrentFever) &&
        bool(values.wellBetween) &&
        cardinal >= 1 &&
        bool(values.excludeOther);
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'low';
      let label = 'PFAPA pattern not suggested';
      if (classic && score >= 8) {
        riskLevel = 'high';
        label = 'Meets simplified PFAPA helper pattern';
      } else if (score >= 6) {
        riskLevel = 'moderate';
        label = 'Possible PFAPA — specialist confirmation';
      } else if (score >= 3) {
        riskLevel = 'moderate';
        label = 'Some periodic fever features';
      }
      return {
        score,
        label,
        interpretation: `Helper score ${score}; cardinal A-P-A features present: ${cardinal}/3. ${
          classic
            ? 'Core recurrent fever + wellness between + ≥1 cardinal sign with exclusions aligns with PFAPA teaching criteria.'
            : 'Incomplete core pattern — keep broader autoinflammatory/infectious differential.'
        } Marshall criteria variants exist; rheumatology/ID confirmation advised before tonsillectomy discussions.`,
        riskLevel,
        details: [
          { label: 'Episode length', value: `${ep} d` },
          { label: 'Interval', value: `${interval} wk` },
          { label: 'Cardinal features', value: `${cardinal}/3` },
        ],
        recommendations: [
          'Document fever diaries',
          'Consider CBC between and during attacks',
          'Steroids for episodes vs tonsillectomy in selected refractory cases',
        ],
      };
    },
    evidence: {
      summary:
        'PFAPA is the most common periodic fever syndrome in childhood: clockwork fevers with aphthous ulcers, pharyngitis, and/or adenitis, wellness between flares, and often dramatic steroid response.',
      formula: 'Marshall-style clinical criteria checklist (educational)',
      validation: 'Clinical diagnosis of exclusion; criteria sets vary slightly across publications.',
      references: [
        {
          title: 'Syndrome of periodic fever, pharyngitis, and aphthous stomatitis',
          citation: 'Marshall GS et al. J Pediatr. 1987',
          year: 1987,
          pmid: '3794885',
          doi: '10.1016/s0022-3476(87)80285-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Likely PFAPA', actions: ['Symptomatic care', 'Consider prednisone abortive dose', 'Rheum referral if atypical'] },
      { condition: 'Atypical (growth failure, rash, serositis)', actions: ['Monogenic fever workup', 'Specialty referral'] },
    ],
    pearls: [
      'Cultures are negative; antibiotics do not alter the stereotyped course.',
      'Family history of similar episodes may still fit PFAPA or related syndromes.',
    ],
  },

  // ─── 25. HSP / IgA vasculitis criteria ─────────────────────────────────────
  {
    id: 'hsp-criteria',
    name: 'IgA Vasculitis (HSP) EULAR/PRINTO/PRES Criteria',
    shortName: 'HSP / IgAV',
    description:
      'Simplified EULAR/PRINTO/PRES classification helper for childhood IgA vasculitis (Henoch–Schönlein purpura).',
    category: 'pediatrics',
    tags: ['hsp', 'iga vasculitis', 'purpura', 'vasculitis', 'nephritis'],
    whenToUse: 'Children with purpura when classifying IgA vasculitis / HSP versus other vasculitides or purpuric illness.',
    whyUse: 'Standard criteria require purpura (often lower limb) plus at least one additional domain (abdominal, joint, renal, histology).',
    inputs: [
      yesNo('purpura', 'Purpura or petechiae (commonly lower limb predominant) with neither thrombocytopenia nor coagulopathy', 3),
      yesNo('abdominal', 'Acute abdominal pain (diffuse colicky) or GI bleeding / intussusception concern', 1),
      yesNo('arthritis', 'Arthritis or arthralgia', 1),
      yesNo('renal', 'Renal involvement (proteinuria, hematuria, or renal insufficiency)', 1),
      yesNo('histology', 'Histology: leukocytoclastic vasculitis or proliferative GN with predominant IgA', 2),
      yesNo('scrotal', 'Scrotal edema/orchitis-like involvement (supportive)', 1),
      yesNo('alternate', 'More likely alternate diagnosis (ITP, meningococcemia, other vasculitis)', 0),
    ],
    calculate(values) {
      const purpura = bool(values.purpura);
      const extra =
        (bool(values.abdominal) ? 1 : 0) +
        (bool(values.arthritis) ? 1 : 0) +
        (bool(values.renal) ? 1 : 0) +
        (bool(values.histology) ? 1 : 0);
      // EULAR/PRINTO/PRES: purpura mandatory + ≥1 of abdominal, arthritis/arthralgia, renal, IgA histology
      const meets = purpura && extra >= 1 && !bool(values.alternate);
      let score = (purpura ? 3 : 0) + extra + (bool(values.scrotal) ? 1 : 0);
      if (bool(values.alternate)) score = Math.max(0, score - 3);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Does not meet simplified IgAV classification';
      if (bool(values.alternate)) {
        label = 'Alternate diagnosis more likely — do not classify as IgAV';
        riskLevel = 'high';
      } else if (meets && bool(values.renal)) {
        label = 'Meets IgAV criteria — renal involvement present';
        riskLevel = 'high';
      } else if (meets) {
        label = 'Meets simplified EULAR/PRINTO/PRES IgAV criteria';
        riskLevel = 'moderate';
      } else if (purpura) {
        label = 'Purpura without additional criterion yet';
        riskLevel = 'moderate';
      }
      return {
        score,
        label,
        interpretation: `${meets ? 'Classification criteria met' : 'Criteria not met'}: mandatory purpura (non-thrombocytopenic) ${
          purpura ? 'present' : 'absent'
        } with ${extra} additional domain(s). Educational simplification of EULAR/PRINTO/PRES IgA vasculitis criteria. Monitor BP and urinalysis — nephritis can present late.`,
        riskLevel: bool(values.abdominal) && meets ? 'high' : riskLevel,
        details: [
          { label: 'Purpura mandatory', value: purpura ? 'Yes' : 'No' },
          { label: 'Additional domains', value: String(extra) },
          { label: 'Renal', value: bool(values.renal) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'UA and BP serially (nephritis may lag)',
          'Supportive care; steroids selective for severe pain/orchitis/severe abdominal',
          'Urgent care if surgical abdomen / intussusception signs',
        ],
      };
    },
    evidence: {
      summary:
        'EULAR/PRINTO/PRES classify childhood IgA vasculitis as purpura (usually lower limb) plus at least one of abdominal pain, arthritis/arthralgia, renal involvement, or IgA-dominant histology.',
      formula: 'Purpura (required) + ≥1 additional criterion',
      validation: 'Published Ankara consensus criteria with good sensitivity/specificity in validation cohorts.',
      references: [
        {
          title: 'EULAR/PRINTO/PRES criteria for Henoch–Schönlein purpura',
          citation: 'Ozen S et al. Ann Rheum Dis. 2010',
          year: 2010,
          pmid: '20413568',
          doi: '10.1136/ard.2009.116657',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Supportive care', 'UA/BP schedule', 'Nephrology if significant renal disease'] },
      { condition: 'Severe abdominal pain', actions: ['Surgical eval', 'Imaging for intussusception', 'Pain control'] },
      { condition: 'Not met / toxic', actions: ['Broader purpura differential', 'Cultures/coags/platelets'] },
    ],
    pearls: [
      'Normal platelets help distinguish from ITP and many marrow processes.',
      'Renal disease can appear weeks after the rash — arrange follow-up.',
    ],
  },
];
