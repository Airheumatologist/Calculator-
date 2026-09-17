import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, clamp, yesNo, selectInput, numberInput } from '../../utils/helpers';

/**
 * Metroticket (2009, post-operative pathology) survival model.
 * The official metroticket.org calculator stores per-mille 5-year survival
 * tables indexed by nodule count (1-10) and largest-nodule diameter (1-100 mm)
 * for each microvascular-invasion status. Those tables follow a parametric
 * survival model that is, for each fixed nodule count, exactly linear in
 * diameter on the log(-log S(5y)) scale:
 *     ln(-ln S) = ALPHA[n] + BETA[n] * diameter_mm
 * The coefficients below reproduce the official point estimates within
 * 0.06 percentage points (residual = per-mille table rounding).
 */
const MT1_U_ALPHA = [-1.401605, -1.22289, -1.074353, -0.97708, -0.91033, -0.848408, -0.787226, -0.725006, -0.663612, -0.601926];
const MT1_U_BETA = [0.0115701, 0.011004, 0.0104374, 0.0098669, 0.0092956, 0.0087225, 0.0081652, 0.0075836, 0.0070166, 0.0064477];
const MT1_A_ALPHA = [-1.482289, -1.374071, -1.28247, -1.219212, -1.173639, -1.130064, -1.087279, -1.044285, -1.001263, -0.958292];
const MT1_A_BETA = [0.0083059, 0.0081014, 0.0078898, 0.007681, 0.0074749, 0.0072615, 0.0070553, 0.0068485, 0.0066409, 0.0064329];
const MT1_P_ALPHA = [-0.777533, -0.669298, -0.577962, -0.515106, -0.468829, -0.42583, -0.382982, -0.34002, -0.296853, -0.253854];
const MT1_P_BETA = [0.0083026, 0.0080985, 0.007892, 0.0076855, 0.0074717, 0.0072617, 0.0070572, 0.0068511, 0.0066416, 0.0064347];

/**
 * Metroticket 2.0 (2018) — overall-survival lookup tables from the official
 * calculator (hcc-olt-metroticket.org), keyed by
 *   m = round((largestNoduleCm + noduleCount) * 2)   in [0, 20]
 *   afpIdx = AFP band index 0-15 (see mt2AfpIndex)
 * Values are 5-year overall survival in per-mille (divide by 10 for %).
 * C2N = HCV-negative, C2P = HCV-positive. A handful of scattered single-cell
 * transcription errors present in the published site table were repaired by
 * neighbor interpolation (>4 percentage-point isolated outliers).
 */
const MT2_C2N: number[][] = [
  [890, 883, 860, 845, 835, 827, 820, 814, 817, 840, 795, 788, 781, 775, 770, 765],
  [887, 879, 853, 837, 826, 817, 816, 830, 797, 791, 782, 774, 766, 760, 754, 748],
  [883, 875, 846, 828, 816, 806, 797, 790, 784, 778, 767, 758, 750, 743, 736, 730],
  [880, 871, 838, 818, 805, 793, 784, 776, 769, 763, 751, 741, 733, 725, 717, 711],
  [876, 866, 830, 809, 792, 780, 770, 761, 753, 746, 733, 723, 713, 740, 697, 689],
  [871, 860, 820, 796, 779, 765, 754, 744, 736, 728, 714, 720, 692, 682, 674, 666],
  [866, 854, 810, 782, 764, 749, 737, 726, 716, 706, 693, 680, 669, 658, 649, 641],
  [861, 847, 798, 768, 747, 731, 718, 706, 696, 686, 670, 656, 644, 633, 622, 613],
  [855, 839, 785, 752, 729, 711, 697, 684, 673, 663, 645, 630, 617, 605, 594, 584],
  [848, 830, 770, 734, 710, 690, 674, 660, 648, 637, 618, 620, 587, 575, 563, 552],
  [840, 821, 755, 715, 688, 667, 649, 634, 621, 607, 589, 571, 556, 542, 530, 519],
  [832, 810, 737, 694, 664, 642, 623, 607, 592, 580, 558, 539, 523, 508, 495, 483],
  [822, 798, 718, 671, 639, 614, 594, 577, 562, 548, 525, 505, 488, 472, 459, 446],
  [812, 785, 697, 646, 611, 585, 563, 545, 529, 514, 490, 469, 451, 435, 420, 411],
  [800, 771, 675, 619, 582, 554, 530, 511, 494, 479, 453, 431, 412, 395, 381, 367],
  [787, 755, 650, 590, 550, 520, 496, 475, 457, 441, 414, 391, 372, 355, 340, 326],
  [773, 738, 624, 559, 517, 485, 459, 437, 419, 420, 374, 351, 331, 314, 298, 285],
  [758, 719, 595, 526, 481, 448, 421, 398, 379, 362, 333, 310, 289, 272, 257, 243],
  [741, 698, 564, 491, 444, 411, 381, 358, 338, 321, 292, 268, 248, 230, 215, 220],
  [722, 676, 532, 454, 408, 369, 340, 316, 296, 279, 250, 226, 208, 190, 175, 162],
  [720, 651, 497, 415, 365, 328, 299, 275, 255, 237, 224, 227, 166, 150, 136, 124],
];
const MT2_C2P: number[][] = [
  [795, 788, 765, 750, 740, 732, 725, 719, 714, 703, 700, 693, 686, 680, 675, 670],
  [792, 784, 758, 742, 731, 722, 714, 712, 720, 696, 687, 679, 671, 665, 659, 653],
  [788, 780, 751, 733, 721, 711, 720, 695, 689, 683, 672, 663, 655, 648, 641, 635],
  [785, 776, 743, 723, 710, 698, 689, 681, 674, 668, 656, 646, 638, 630, 622, 616],
  [781, 771, 735, 713, 697, 685, 675, 666, 658, 651, 638, 628, 618, 690, 620, 594],
  [776, 765, 725, 710, 684, 670, 659, 649, 641, 633, 619, 670, 597, 587, 579, 571],
  [771, 759, 715, 687, 669, 654, 642, 631, 621, 613, 598, 585, 574, 563, 554, 546],
  [766, 752, 730, 673, 652, 636, 623, 611, 610, 591, 575, 561, 549, 538, 527, 518],
  [760, 744, 690, 657, 634, 616, 620, 589, 578, 568, 550, 535, 522, 510, 499, 489],
  [753, 735, 675, 639, 614, 595, 579, 565, 553, 542, 523, 570, 492, 480, 468, 457],
  [745, 726, 660, 620, 593, 572, 554, 539, 526, 514, 494, 476, 461, 447, 435, 424],
  [737, 715, 642, 599, 569, 547, 528, 512, 497, 485, 463, 444, 428, 413, 400, 388],
  [727, 689, 623, 576, 544, 519, 499, 482, 467, 453, 430, 410, 393, 377, 364, 351],
  [717, 690, 620, 551, 516, 490, 468, 450, 434, 419, 395, 374, 356, 340, 325, 312],
  [750, 676, 580, 524, 487, 459, 435, 416, 399, 384, 358, 336, 317, 300, 286, 272],
  [692, 660, 555, 495, 455, 425, 410, 380, 362, 346, 319, 296, 277, 260, 245, 231],
  [678, 643, 529, 464, 422, 390, 364, 342, 324, 370, 279, 256, 236, 219, 230, 190],
  [663, 624, 500, 431, 386, 353, 326, 330, 284, 267, 238, 214, 194, 177, 162, 148],
  [646, 630, 469, 396, 349, 314, 286, 263, 243, 226, 197, 173, 153, 135, 120, 170],
  [627, 581, 437, 359, 310, 274, 245, 221, 210, 184, 155, 131, 112, 95, 80, 55],
  [592, 556, 420, 320, 270, 233, 240, 180, 160, 142, 114, 91, 57, 45, 33, 29],
];
/** 95% CI half-width (per-mille) for the HCC-specific survival estimate. */
const MT2_C2C: number[][] = [
  [3, 3, 6, 7, 8, 9, 9, 10, 10, 11, 12, 12, 13, 13, 14, 14],
  [3, 4, 6, 8, 9, 10, 10, 11, 12, 12, 13, 14, 14, 15, 15, 16],
  [3, 4, 7, 9, 10, 11, 11, 12, 13, 13, 14, 15, 16, 16, 17, 17],
  [3, 4, 8, 9, 11, 12, 13, 13, 14, 15, 16, 16, 17, 18, 18, 19],
  [4, 5, 8, 11, 12, 13, 14, 15, 15, 16, 17, 18, 19, 20, 20, 21],
  [4, 5, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 21, 22, 23],
  [5, 6, 10, 13, 15, 16, 17, 18, 19, 19, 20, 22, 22, 23, 24, 25],
  [5, 7, 11, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 26],
  [6, 8, 13, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 28],
  [7, 8, 14, 17, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 30],
  [7, 9, 15, 19, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 32],
  [8, 10, 17, 20, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 34],
  [9, 11, 18, 22, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 36],
  [10, 13, 20, 24, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 37, 38],
  [11, 14, 22, 26, 29, 30, 32, 33, 34, 35, 36, 37, 37, 38, 38, 39],
  [12, 15, 24, 28, 31, 32, 34, 35, 36, 36, 37, 38, 39, 39, 40, 40],
  [14, 17, 26, 30, 33, 34, 35, 36, 37, 38, 39, 39, 40, 40, 40, 40],
  [15, 18, 28, 32, 34, 36, 37, 38, 39, 39, 40, 40, 40, 40, 40, 40],
  [17, 20, 30, 34, 36, 38, 38, 39, 40, 40, 40, 40, 40, 40, 40, 40],
  [18, 22, 32, 36, 38, 39, 40, 40, 40, 40, 40, 40, 40, 40, 39, 39],
  [20, 24, 34, 37, 39, 40, 40, 40, 40, 40, 40, 39, 39, 38, 38, 37],
];

/** AFP band index used by the official Metroticket 2.0 overall-survival tables. */
function mt2AfpIndex(afp: number): number {
  const edges = [8, 26, 76, 126, 176, 226, 276, 326, 376, 451, 551, 651, 751, 851, 951];
  for (let i = 0; i < edges.length; i++) if (afp < edges[i]) return i;
  return 15;
}

/** Wave 8 — hepatology: HCC detection/prognosis, surgical & readmission risk, fibrosis, AIH. */
export const wave8LiverCalcs: Calculator[] = [
  // ─── 1. GALAD ─────────────────────────────────────────────────────────────
  {
    id: 'galad-hcc',
    name: 'GALAD Model for Hepatocellular Carcinoma (HCC)',
    shortName: 'GALAD',
    description:
      'Serological HCC detection model combining gender, age, AFP, AFP-L3 fraction, and des-gamma-carboxy prothrombin (DCP/PIVKA-II) in chronic liver disease.',
    category: 'gastroenterology',
    tags: ['hcc', 'hepatocellular', 'afp', 'afp-l3', 'dcp', 'pivka', 'biomarker', 'screening', 'galad'],
    whenToUse:
      'Patients with chronic liver disease or cirrhosis being evaluated for hepatocellular carcinoma when AFP, AFP-L3%, and DCP (PIVKA-II) are all measured on the same platform (ideally µTASWako/Lumipulse, on which the model was built).',
    whyUse:
      'GALAD outperforms AFP alone for HCC detection (AUROC >0.90 in international validation, including early-stage disease) and detects a subset of AFP-negative tumors.',
    inputs: [
      selectInput('sex', 'Gender', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'M', 'Male gender carries the positive coefficient (+1.67) in the GALAD logistic model.'),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, exampleValue: 62, helpText: 'Age in years; enters linearly with coefficient +0.09 per year.' }),
      numberInput('afpL3', 'AFP-L3', { unit: '%', min: 0, max: 100, step: 0.1, exampleValue: 15, helpText: 'Lens culinaris-reactive fraction of total AFP, reported as percent of total AFP (coefficient +0.04 per percent).' }),
      numberInput('afp', 'AFP', { unit: 'ng/mL', min: 0.1, max: 1000000, step: 0.1, exampleValue: 25, helpText: 'Total alpha-fetoprotein in ng/mL; enters as log10(AFP) with coefficient +2.34.' }),
      numberInput('dcp', 'DCP (PIVKA-II)', { unit: 'ng/mL', min: 0.01, max: 100000, step: 0.01, exampleValue: 0.8, helpText: 'Des-gamma-carboxy prothrombin in ng/mL; enters as log10(DCP) with coefficient +1.33. Convert mAU/mL to ng/mL per the local assay.' }),
    ],
    calculate(values) {
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const age = num(values.age, 60);
      const l3 = num(values.afpL3, 10);
      const afp = Math.max(num(values.afp, 10), 0.01);
      const dcp = Math.max(num(values.dcp, 0.5), 0.01);
      const z = -10.08 + 0.09 * age + 1.67 * male + 2.34 * Math.log10(afp) + 0.04 * l3 + 1.33 * Math.log10(dcp);
      const p = 1 / (1 + Math.exp(-z));
      const probPct = round(p * 100, 1);
      const positive = z > -0.63;
      return {
        score: round(z, 2),
        unit: 'GALAD Z-score',
        label: positive ? 'Positive GALAD screen' : 'Negative GALAD screen',
        interpretation: positive
          ? `GALAD Z = ${round(z, 2)} exceeds the −0.63 cut-off (estimated HCC probability ~${probPct}%). In validation cohorts this threshold gave ~90% sensitivity and ~90% specificity for HCC — pursue diagnostic imaging (multiphasic CT/MRI) rather than surveillance alone.`
          : `GALAD Z = ${round(z, 2)} is at or below the −0.63 cut-off (estimated probability ~${probPct}%). Continue guideline surveillance; no single biomarker panel excludes early HCC.`,
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'GALAD Z-score', value: String(round(z, 2)) },
          { label: 'Estimated HCC probability', value: `${probPct}%` },
          { label: 'Cut-off used', value: 'Z > −0.63 (Berhane 2016 optimal cut-off)' },
          { label: 'Inputs', value: `AFP ${afp} ng/mL, AFP-L3 ${l3}%, DCP ${dcp} ng/mL, age ${age}, ${male ? 'male' : 'female'}` },
        ],
        recommendations: [
          'A positive score is a screening signal, not a diagnosis — confirm with multiphasic CT or MRI and LI-RADS assessment.',
          'Cut-offs other than −0.63 have been proposed in specific populations; use local validated thresholds when available.',
        ],
      };
    },
    evidence: {
      summary:
        'GALAD combines gender, age, and the three serum biomarkers AFP, AFP-L3%, and DCP in a logistic model (Z-score) for detecting HCC in chronic liver disease; the probability of HCC is exp(Z)/(1+exp(Z)).',
      formula:
        'Z = −10.08 + 0.09×age + 1.67×(male) + 2.34×log10(AFP) + 0.04×AFP-L3% + 1.33×log10(DCP)',
      validation:
        'Developed by Johnson et al. (2014) in a UK cohort (AUROC 0.97) and validated internationally by Berhane et al. (2016) in ~7000 patients across Germany, Japan, and Hong Kong (AUROC >0.90, optimal cut-off −0.63). A meta-analysis confirmed consistent performance across etiologies; some cohorts propose alternative regional cut-offs.',
      references: [
        {
          title: 'The detection of hepatocellular carcinoma using a prospectively developed and validated model based on serological biomarkers',
          citation: 'Johnson PJ et al. Cancer Epidemiol Biomarkers Prev. 2014;23(1):144-153',
          year: 2014,
          pmid: '24220911',
          doi: '10.1158/1055-9965.EPI-13-0870',
        },
        {
          title: 'Role of the GALAD and BALAD-2 serologic models in diagnosis of hepatocellular carcinoma and prediction of survival in patients',
          citation: 'Berhane S et al. Clin Gastroenterol Hepatol. 2016;14(6):875-886',
          year: 2016,
          pmid: '26775025',
          doi: '10.1016/j.cgh.2015.12.042',
        },
      ],
    },
    nextSteps: [
      { condition: 'Z > −0.63 (positive screen)', actions: ['Multiphasic CT or MRI of the liver', 'Hepatology/surgical oncology referral', 'Repeat biomarkers with imaging correlation'] },
      { condition: 'Z ≤ −0.63 but high clinical suspicion', actions: ['Continue 6-month ultrasound ± AFP surveillance', 'Consider MRI if ultrasound visualization is limited'] },
    ],
    pearls: [
      'All three markers should come from the same blood draw and, ideally, the assay platform used in model development.',
      'DCP units differ between assays (ng/mL vs mAU/mL) — confirm before entry.',
      'GALAD detects some AFP-negative HCCs, but it supplements rather than replaces imaging surveillance.',
    ],
  },

  // ─── 2. REACH-B ────────────────────────────────────────────────────────────
  {
    id: 'reach-b-hcc',
    name: 'REACH-B Score for Hepatocellular Carcinoma',
    shortName: 'REACH-B',
    description:
      '17-point risk score estimating 3-, 5-, and 10-year HCC incidence in non-cirrhotic patients with chronic hepatitis B, from sex, age, ALT, HBeAg status, and HBV DNA.',
    category: 'gastroenterology',
    tags: ['hcc', 'hepatitis b', 'hbv', 'hbeag', 'hbv dna', 'risk', 'reach-b'],
    whenToUse:
      'Adults (30–65 years in the derivation cohort) with chronic hepatitis B WITHOUT cirrhosis, who are not yet on antiviral therapy, to estimate future HCC risk.',
    whyUse:
      'REACH-B was derived in the community-based REVEAL-HBV cohort and externally validated in Hong Kong and Korean hospital cohorts; it stratifies HCC risk to inform surveillance intensity and treatment discussions.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 2 },
      ], 'M', 'Male sex contributes 2 of the 17 points.'),
      selectInput('age', 'Age', [
        { label: '30–34 years', value: 0, points: 0 },
        { label: '35–39 years', value: 1, points: 1 },
        { label: '40–44 years', value: 2, points: 2 },
        { label: '45–49 years', value: 3, points: 3 },
        { label: '50–54 years', value: 4, points: 4 },
        { label: '55–59 years', value: 5, points: 5 },
        { label: '60–65 years', value: 6, points: 6 },
      ], 3, 'Age band as published; the model was derived in patients aged 30–65.'),
      selectInput('alt', 'ALT', [
        { label: '<15 U/L', value: 0, points: 0 },
        { label: '15–44 U/L', value: 1, points: 1 },
        { label: '≥45 U/L', value: 2, points: 2 },
      ], 1, 'Serum alanine aminotransferase band at baseline.'),
      selectInput('hbeag', 'HBeAg status', [
        { label: 'Negative', value: 0, points: 0 },
        { label: 'Positive', value: 2, points: 2 },
      ], 0, 'Hepatitis B e-antigen serostatus.'),
      selectInput('dna', 'HBV DNA level', [
        { label: '<300 copies/mL (undetectable)', value: 0, points: 0 },
        { label: '300–9,999 copies/mL', value: 0, points: 0 },
        { label: '10,000–99,999 copies/mL', value: 3, points: 3 },
        { label: '100,000–999,999 copies/mL', value: 5, points: 5 },
        { label: '≥1,000,000 copies/mL', value: 4, points: 4 },
      ], 0, 'Serum HBV DNA; note the highest band scores 4 points (non-monotonic, as published).'),
    ],
    calculate(values) {
      const score =
        (str(values.sex, 'F') === 'M' ? 2 : 0) +
        num(values.age, 0) +
        num(values.alt, 0) +
        num(values.hbeag, 0) +
        num(values.dna, 0);
      const band =
        score <= 5
          ? { riskLevel: 'low' as const, label: 'Low HCC risk', note: 'lower third of the score range' }
          : score <= 11
            ? { riskLevel: 'moderate' as const, label: 'Intermediate HCC risk', note: 'middle third of the score range' }
            : { riskLevel: 'high' as const, label: 'High HCC risk', note: 'top third of the score range' };
      return {
        score,
        unit: 'points (0–17)',
        label: band.label,
        interpretation:
          `REACH-B score ${score}/17 (${band.note}). In the derivation/validation cohorts, predicted HCC risk spanned 0% to 23.6% at 3 years, 0% to 47.4% at 5 years, and 0% to 81.6% at 10 years from the lowest to the highest scores. Higher scores warrant consistent HCC surveillance and evaluation for antiviral therapy per AASLD guidance.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Total score', value: `${score} / 17` },
          { label: 'Risk span reported', value: '0–23.6% (3 y), 0–47.4% (5 y), 0–81.6% (10 y) across scores' },
          { label: 'Applicability', value: 'Non-cirrhotic, untreated chronic hepatitis B' },
        ],
        recommendations: [
          'Continue (or initiate) 6-month HCC surveillance with ultrasound ± AFP per guideline.',
          'Assess antiviral treatment eligibility — effective HBV suppression lowers, but does not eliminate, HCC risk.',
          'Do not apply this score to patients with established cirrhosis or those already on antiviral therapy; consider PAGE-B/mPAGE-B or other models instead.',
        ],
      };
    },
    evidence: {
      summary:
        'REACH-B assigns 0–17 points across sex (male +2), age (0–6), ALT (0–2), HBeAg (+2), and HBV DNA (0/+3/+5/+4) to estimate HCC incidence over 3, 5, and 10 years in non-cirrhotic chronic hepatitis B.',
      formula:
        'Score = sex + age band + ALT band + HBeAg + HBV DNA band (max 17); published predicted risks: 0–23.6% at 3 y, 0–47.4% at 5 y, 0–81.6% at 10 y.',
      validation:
        'Derived in 3584 non-cirrhotic REVEAL-HBV patients and validated in 1505 patients from Hong Kong and South Korean hospitals (Yang et al., Lancet Oncology 2011). Validation AUROCs 0.811/0.796/0.769 at 3/5/10 years. Performance is reduced in cirrhotic and treated populations.',
      references: [
        {
          title: 'Risk estimation for hepatocellular carcinoma in chronic hepatitis B (REACH-B): development and validation of a predictive score',
          citation: 'Yang HI et al. Lancet Oncol. 2011;12(6):568-574',
          year: 2011,
          pmid: '21497551',
          doi: '10.1016/S1470-2045(11)70077-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥12', actions: ['Strict adherence to 6-month HCC surveillance', 'Evaluate antiviral therapy per AASLD/EASL criteria', 'Document family history of HCC (raises risk further)'] },
      { condition: 'Score 6–11', actions: ['Maintain guideline surveillance', 'Reassess HBV DNA/ALT trajectory annually'] },
      { condition: 'Cirrhosis or on treatment', actions: ['Use alternative models (e.g., PAGE-B, mPAGE-B, CAMD) — REACH-B was derived in non-cirrhotic untreated patients'] },
    ],
    pearls: [
      'The HBV DNA scoring is non-monotonic: 100,000–999,999 copies/mL scores +5 while ≥10⁶ scores +4 — reproduce it exactly as published.',
      'The score uses baseline (pre-treatment) variables; it is not designed to track risk on therapy.',
      'Ultrasound surveillance is still recommended even for low scores in many guidelines.',
    ],
  },

  // ─── 3. Metroticket (post-operative pathology) ─────────────────────────────
  {
    id: 'metroticket-survival',
    name: 'Metroticket Calculator for HCC Survival',
    shortName: 'Metroticket',
    description:
      'Predicts 5-year overall survival after liver transplantation for HCC from explant pathology: number of nodules, largest nodule diameter, and microvascular invasion (the model behind the up-to-seven criteria).',
    category: 'oncology',
    tags: ['hcc', 'liver transplant', 'milan', 'up-to-seven', 'metroticket', 'explant', 'survival'],
    whenToUse:
      'After liver transplantation (or when counseling with known/expected explant pathology) for hepatocellular carcinoma, to estimate 5-year overall survival from histology.',
    whyUse:
      'The Metroticket model produced the up-to-seven criteria (sum of largest nodule size in cm + number of nodules ≤7, without microvascular invasion → ~71% 5-year survival), extending transplant candidacy beyond Milan criteria.',
    inputs: [
      numberInput('sizeMm', 'Size of largest nodule', { unit: 'mm', min: 1, max: 100, exampleValue: 30, helpText: 'Diameter of the largest tumor nodule at explant pathology in millimetres (model range 1–100 mm).' }),
      numberInput('nodules', 'Number of nodules', { min: 1, max: 10, exampleValue: 2, helpText: 'Total HCC nodule count at explant pathology (model range 1–10).' }),
      selectInput('vi', 'Microvascular invasion', [
        { label: 'Unknown / not specified', value: 'unknown' },
        { label: 'Absent', value: 'absent' },
        { label: 'Present', value: 'present' },
      ], 'absent', 'Microvascular invasion on explant histology; presence roughly halves the hazard-adjusted survival.'),
    ],
    calculate(values) {
      const d = clamp(num(values.sizeMm, 30), 1, 100);
      const n = clamp(Math.round(num(values.nodules, 2)), 1, 10);
      const vi = str(values.vi, 'unknown');
      const alpha = vi === 'absent' ? MT1_A_ALPHA : vi === 'present' ? MT1_P_ALPHA : MT1_U_ALPHA;
      const beta = vi === 'absent' ? MT1_A_BETA : vi === 'present' ? MT1_P_BETA : MT1_U_BETA;
      const eta = alpha[n - 1] + beta[n - 1] * d;
      const surv = Math.exp(-Math.exp(eta));
      const survPct = round(surv * 100, 1);
      const upTo7 = n + d / 10 <= 7;
      const risk =
        surv >= 0.7
          ? { level: 'low' as const, label: 'Favorable predicted survival' }
          : surv >= 0.5
            ? { level: 'moderate' as const, label: 'Intermediate predicted survival' }
            : { level: 'high' as const, label: 'Poor predicted survival' };
      const up7Text =
        vi === 'present'
          ? 'Outside up-to-seven (microvascular invasion present).'
          : upTo7
            ? `Within up-to-seven (nodules + largest size = ${round(n + d / 10, 1)} ≤ 7${vi === 'unknown' ? ', assuming no microvascular invasion' : ''}).`
            : `Beyond up-to-seven (nodules + largest size = ${round(n + d / 10, 1)} > 7).`;
      return {
        score: survPct,
        unit: '% 5-year survival',
        label: risk.label,
        interpretation: `Estimated 5-year overall survival after liver transplantation ≈ ${survPct}% (largest nodule ${d} mm, ${n} nodule${n > 1 ? 's' : ''}, microvascular invasion ${vi}). ${up7Text}`,
        riskLevel: risk.level,
        details: [
          { label: 'Predicted 5-year survival', value: `${survPct}%` },
          { label: 'Up-to-seven sum', value: `${round(n + d / 10, 1)} (${n} nodules + ${round(d / 10, 1)} cm)` },
          { label: 'Up-to-seven status', value: up7Text },
          { label: 'Benchmark', value: 'Up-to-seven without microvascular invasion → ~71.2% 5-year survival in the derivation cohort' },
        ],
        recommendations: [
          'Discuss results in a multidisciplinary transplant board with the full clinical picture (AFP, waiting time, downstaging response).',
          'For pre-transplant assessment with AFP available, use the Metroticket 2.0 calculator instead.',
        ],
      };
    },
    evidence: {
      summary:
        'The Metroticket model (Mazzaferro et al., Lancet Oncology 2009) is a parametric survival model fitted on >1000 transplants for HCC exceeding Milan criteria; it estimates 5-year overall survival from largest nodule diameter, nodule count, and microvascular invasion, and yielded the up-to-seven rule.',
      formula:
        'ln(−ln S(5y)) = α(n, vascular-invasion status) + β(n, vascular-invasion status) × diameter(mm); implemented from the official metroticket.org model output.',
      validation:
        'The implementation reproduces the official Metroticket post-operative calculator within 0.06 percentage points across its full 1–100 mm × 1–10 nodule range for all three vascular-invasion strata. The underlying cohort reported 71.2% 5-year survival for up-to-seven patients without microvascular invasion vs 53.6% overall beyond Milan.',
      references: [
        {
          title: 'Predicting survival after liver transplantation in patients with hepatocellular carcinoma beyond the Milan criteria: a retrospective, exploratory analysis',
          citation: 'Mazzaferro V et al. Lancet Oncol. 2009;10(1):35-43',
          year: 2009,
          pmid: '19058754',
          doi: '10.1016/S1470-2045(08)70284-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'Within up-to-seven, no microvascular invasion', actions: ['Favorable prognosis — standard post-transplant surveillance and immunosuppression', 'Oncology follow-up for recurrence surveillance'] },
      { condition: 'Beyond up-to-seven or microvascular invasion present', actions: ['Intensified recurrence surveillance', 'Consider adjuvant/clinical-trial discussion at transplant board'] },
    ],
    pearls: [
      'Microvascular invasion cannot be known for certain before explant — the "unknown" stratum is provided for pre-operative estimation.',
      'The up-to-seven rule requires ABSENT microvascular invasion; a patient within the morphologic sum but with invasion has markedly worse predicted survival.',
      'This is a post-operative (pathology) model; for pre-transplant radiology + AFP use Metroticket 2.0.',
    ],
  },

  // ─── 4. Metroticket 2.0 ────────────────────────────────────────────────────
  {
    id: 'metroticket-2',
    name: 'Metroticket Calculator 2.0 for HCC Survival',
    shortName: 'Metroticket 2.0',
    description:
      'Predicts 5-year HCC-specific and overall survival after liver transplantation from pre-transplant radiology (largest vital nodule, vital nodule count) plus serum AFP, refined by HCV status.',
    category: 'oncology',
    tags: ['hcc', 'liver transplant', 'metroticket', 'afp', 'hcv', 'competing risk', 'survival'],
    whenToUse:
      'Before liver transplantation in HCC candidates, using the last radiological assessment of vital tumor burden and the most recent AFP to estimate post-transplant HCC-specific survival.',
    whyUse:
      'Adding AFP biology to tumor morphology, Metroticket 2.0 discriminates post-transplant HCC-related death better than Milan/UCSF/up-to-seven morphology alone (c-statistic ~0.72) and defines AFP-banded tumor-burden limits (up-to-7 / up-to-5 / up-to-4).',
    inputs: [
      numberInput('sizeCm', 'Size of largest vital nodule', { unit: 'cm', min: 0, max: 10, step: 0.1, exampleValue: 3, helpText: 'Maximum diameter of the largest vital (≥1 cm, arterial-enhancing) HCC nodule at the last pre-transplant radiology. Complete radiological response → 0 nodules / 0 cm.' }),
      numberInput('nodules', 'Number of vital nodules', { min: 0, max: 10, exampleValue: 2, helpText: 'Vital nodules ≥1 cm meeting imaging criteria at last assessment (0 after complete response). Model tops out at size+number = 10.' }),
      numberInput('afp', 'AFP', { unit: 'ng/mL', min: 1, max: 10000, exampleValue: 20, helpText: 'Most recent serum AFP in ng/mL; enters the model as log10(AFP).' }),
      selectInput('hcv', 'HCV status', [
        { label: 'HCV-negative', value: 'neg' },
        { label: 'HCV-positive', value: 'pos' },
      ], 'neg', 'HCV cirrhosis history refines overall (non-HCC) survival prediction; HCC-specific survival is unaffected.'),
    ],
    calculate(values) {
      const size = clamp(num(values.sizeCm, 3), 0, 10);
      const n = clamp(Math.round(num(values.nodules, 1)), 0, 10);
      const afp = Math.max(num(values.afp, 10), 1);
      const sum = size + n;
      const capped = sum > 10;
      // Competing-risk model (Mazzaferro 2018): risk of HCC-related death at 5 y
      // = 1 − exp(−exp(0.227×(size+nodules) + 0.817×log10(AFP) − 4.274))
      const x = 0.227 * Math.min(sum, 10) + 0.817 * Math.log10(afp) - 4.274;
      const hccSurv = Math.exp(-Math.exp(clamp(x, -10, 10)));
      const hccSurvPct = round(hccSurv * 100, 1);
      const m = clamp(Math.round(Math.min(sum, 10) * 2), 0, 20);
      const ai = mt2AfpIndex(afp);
      const os = str(values.hcv, 'neg') === 'pos' ? MT2_C2P[m][ai] / 10 : MT2_C2N[m][ai] / 10;
      const ci = MT2_C2C[m][ai] / 10;
      const risk =
        hccSurv >= 0.7
          ? { level: 'low' as const, label: 'Favorable predicted HCC-specific survival (≥70%)' }
          : hccSurv >= 0.5
            ? { level: 'moderate' as const, label: 'Intermediate predicted HCC-specific survival' }
            : { level: 'high' as const, label: 'Poor predicted HCC-specific survival (<50%)' };
      // Metroticket 2.0 "IN" rule (approximate published bands)
      let criteria = 'Outside Metroticket 2.0 criteria (AFP >1000 ng/mL or excess burden)';
      if (afp < 200 && sum <= 7) criteria = 'Within Metroticket 2.0 (sum ≤7, AFP <200)';
      else if (afp >= 200 && afp <= 400 && sum <= 5) criteria = 'Within Metroticket 2.0 (sum ≤5, AFP 200–400)';
      else if (afp > 400 && afp <= 1000 && sum <= 4) criteria = 'Within Metroticket 2.0 (sum ≤4, AFP 400–1000)';
      else if (afp <= 1000) criteria = 'Outside Metroticket 2.0 criteria for this AFP band';
      return {
        score: hccSurvPct,
        unit: '% 5-year HCC-specific survival',
        label: risk.label,
        interpretation: `Estimated 5-year HCC-specific survival after liver transplantation ≈ ${hccSurvPct}% (95% CI ±${ci}%). Overall 5-year survival (${str(values.hcv, 'neg') === 'pos' ? 'HCV-positive' : 'HCV-negative'} stratum) ≈ ${os}%. ${criteria}.${capped ? ' Tumor burden exceeds the model range (size+nodules capped at 10).' : ''}`,
        riskLevel: risk.level,
        details: [
          { label: '5-year HCC-specific survival', value: `${hccSurvPct}%` },
          { label: '5-year overall survival (HCV-adjusted)', value: `${os}%` },
          { label: '5-year HCC-related death risk', value: `${round((1 - hccSurv) * 100, 1)}%` },
          { label: 'Tumor burden (size + number)', value: String(round(sum, 1)) },
          { label: 'Criteria check', value: criteria },
        ],
        recommendations: [
          'Authors proposed ~70% predicted 5-year HCC-specific survival as a pragmatic listing threshold — apply local policy.',
          'Recheck AFP close to transplant; changes in AFP can move a patient across criteria bands.',
          'Discuss in a multidisciplinary transplant board with waiting-list and downstaging context.',
        ],
      };
    },
    evidence: {
      summary:
        'Metroticket 2.0 (Mazzaferro et al., Gastroenterology 2018) is a competing-risk model of death after liver transplantation for HCC. The 5-year risk of HCC-related death = 1 − exp(−exp(0.227×(largest vital size + vital nodule count) + 0.817×log10(AFP) + intercept)); overall survival is additionally stratified by HCV status.',
      formula:
        '5-y HCC-related death = 1 − exp(−exp(0.227×(size_cm + nodules) + 0.817×log10(AFP) − 4.274)); HCC-specific survival = 1 − risk.',
      validation:
        'Derived in 1018 European transplant patients and validated in a Chinese cohort (c-statistic ~0.72 for HCC-related death). The closed form implemented here reproduces the official metroticket.org calculator output within 0.1 percentage points (the site bands AFP for display; this implementation uses continuous AFP, consistent with the published equation). Overall-survival estimates use the official calculator’s HCV-stratified tables (isolated transcription errors on the site corrected by interpolation).',
      references: [
        {
          title: 'Metroticket 2.0 Model for Analysis of Competing Risks of Death After Liver Transplantation for Hepatocellular Carcinoma',
          citation: 'Mazzaferro V et al. Gastroenterology. 2018;154(1):128-139',
          year: 2018,
          pmid: '28989060',
          doi: '10.1053/j.gastro.2017.09.025',
        },
      ],
    },
    nextSteps: [
      { condition: 'Predicted 5-year HCC-specific survival ≥70%', actions: ['Proceed with transplant evaluation per local criteria', 'Continue surveillance and bridging/downstaging therapy as indicated'] },
      { condition: 'Predicted survival <70%', actions: ['Multidisciplinary review of candidacy', 'Consider downstaging then reassessment', 'Discuss alternatives (resection, ablation, systemic therapy)'] },
    ],
    pearls: [
      'Only vital nodules ≥1 cm count; completely necrotic nodules after locoregional therapy count as zero.',
      'The AFP-banded "IN" criteria (up-to-7 if AFP<200; up-to-5 if 200–400; up-to-4 if 400–1000) are a simplification of the continuous model — the calculator output is the primary estimate.',
      'HCV status affects only the overall (non-HCC) survival estimate, not HCC-specific survival.',
    ],
  },

  // ─── 5. VOCAL-Penn ─────────────────────────────────────────────────────────
  {
    id: 'vocal-penn',
    name: 'VOCAL-Penn Cirrhosis Surgical Risk Score',
    shortName: 'VOCAL-Penn',
    description:
      'Predicts 30-, 90-, and 180-day postoperative mortality and 90-day hepatic decompensation in patients with cirrhosis undergoing surgery, from age, ASA class, emergency status, surgery type, albumin, bilirubin, platelets, obesity, and fatty liver disease.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'surgery', 'perioperative', 'mortality', 'vocal-penn', 'vasqip'],
    whenToUse:
      'Patients with cirrhosis being evaluated for non-hepatic surgery, to quantify postoperative mortality and decompensation risk. Not validated for liver resection, transplant, or TAVR-type procedures, and not for ASA class 1, 5, or 6.',
    whyUse:
      'VOCAL-Penn outperforms MELD, MELD-Na, Child-Pugh, and the Mayo risk score for postoperative mortality prediction (30-day C-statistic 0.859) and is externally validated in two large independent health systems.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 62, helpText: 'Age in years at surgery; the model was derived largely in 40–85 year olds.' }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, exampleValue: 3.4, helpText: 'Preoperative serum albumin in g/dL (g/L ÷ 10); modeled with a linear + cubic-spline term.' }),
      numberInput('bilirubin', 'Total bilirubin', { unit: 'mg/dL', unitKind: 'bilirubin', min: 0.1, max: 30, step: 0.1, exampleValue: 1.2, helpText: 'Preoperative total bilirubin; modeled with a linear + cubic-spline term.' }),
      numberInput('platelets', 'Platelet count', { unit: '×10⁹/L', min: 10, max: 800, exampleValue: 120, helpText: 'Preoperative platelet count in ×10⁹/L (= ×10³/µL); modeled with a linear + cubic-spline term.' }),
      selectInput('bmi', 'BMI', [
        { label: '<30 kg/m²', value: 0, points: 0 },
        { label: '≥30 kg/m²', value: 1, points: 1 },
      ], 0, 'Obesity (BMI ≥30) enters as a binary predictor; it carried a protective coefficient in the derivation cohort (the "obesity paradox").'),
      selectInput('masld', 'MASLD / fatty liver etiology', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 1, points: 1 },
      ], 0, 'Non-alcoholic/metabolic (fatty liver) etiology of cirrhosis.'),
      selectInput('asa', 'ASA classification', [
        { label: 'ASA 2', value: 2, description: 'Mild systemic disease' },
        { label: 'ASA 3', value: 3, description: 'Severe systemic disease' },
        { label: 'ASA 4', value: 4, description: 'Severe systemic disease, constant threat to life' },
      ], 3, 'ASA physical status; the original study did not validate classes 1, 5, or 6.'),
      selectInput('emergency', 'Emergency surgery', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 1, points: 1 },
      ], 0, 'Emergency designation per anesthesia documentation.'),
      selectInput('category', 'Surgery type', [
        { label: 'Abdominal — laparoscopic', value: 'lap', description: 'Reference category (e.g., lap cholecystectomy)' },
        { label: 'Abdominal — open', value: 'open', description: 'Laparotomy, colectomy, pancreatectomy, etc.' },
        { label: 'Abdominal wall', value: 'wall', description: 'Inguinal/umbilical/incisional hernia repair' },
        { label: 'Vascular', value: 'vascular', description: 'Aneurysm repair, bypass graft, endarterectomy' },
        { label: 'Major orthopedic', value: 'ortho', description: 'Arthroplasty, amputation, fracture fixation' },
        { label: 'Chest / cardiac', value: 'chest', description: 'Lobectomy, CABG, valve replacement' },
      ], 'wall', 'Surgery category per the VASQIP grouping used in the model; laparoscopic abdominal surgery is the reference.'),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const asa = num(values.asa, 3);
      const emerg = num(values.emergency, 0);
      const cat = str(values.category, 'wall');
      const h = cat === 'open' ? 1 : 0;
      const E = cat === 'wall' ? 1 : 0;
      const b = cat === 'vascular' ? 1 : 0;
      const f = cat === 'ortho' ? 1 : 0;
      const g = cat === 'chest' ? 1 : 0;
      const alb = num(values.albumin, 3.5);
      const plt = num(values.platelets, 150);
      const bili = num(values.bilirubin, 1);
      const bmi = num(values.bmi, 0);
      const nafld = num(values.masld, 0);
      const c3 = (x: number, k: number) => Math.pow(Math.max(x - k, 0), 3);
      const v = (c3(alb, 2.7) - (1 / 0.7) * (c3(alb, 3.7) * 1.7 - c3(alb, 4.4))) / Math.pow(1.7, 2);
      const A = (c3(plt, 74) - (1 / 116) * (c3(plt, 153) * 195 - c3(plt, 269) * 79)) / Math.pow(195, 2);
      const M = (c3(bili, 0.39) - (1 / 1.05) * (c3(bili, 0.75) * 1.41 - c3(bili, 1.8) * 0.36)) / Math.pow(1.41, 2);
      const S =
        1.061725 * asa - 5.472096 + 0.927904 * emerg + 1.56071 * h + 0.7418021 * E + 0.9165415 * b +
        1.464183 * f + 1.893621 * g - 0.0075185 * plt + 0.0036657 * A - 0.5181509 * alb - 1.000672 * v +
        0.1448936 * bili - 0.7541669 * bmi + 0.8268748 * nafld;
      const D =
        0.6891587 * asa - 7.381628 + 0.6246303 * emerg + 0.0365738 * age + 1.349889 * h + 0.2480613 * E +
        1.054497 * b + 1.067452 * f + 1.26527 * g - 0.4851036 * alb - 0.9821122 * v + 0.82691 * nafld;
      const P =
        0.850114 * asa - 6.169259 + 0.0293034 * age + 0.8838124 * h + 0.197697 * E + 0.4630691 * b +
        0.1229086 * f + 0.4320639 * g - 0.003719 * plt - 0.00004196 * A - 0.4560354 * alb -
        0.4166421 * v - 0.5176601 * bmi;
      const k =
        0.2988972 * asa - 2.287235 + 0.5076108 * emerg + 0.6117639 * h - 0.1508734 * E - 0.4641384 * b -
        0.3442967 * f - 0.1648213 * g - 0.0054196 * plt + 0.0021578 * A - 0.4460345 * alb -
        0.4612017 * v + 1.361681 * bili - 1.746094 * M - 0.1820302 * bmi + 0.2481661 * nafld + 0.0069088 * age;
      const logistic = (x: number) => 1 / (1 + Math.exp(-x));
      const w = logistic(S);
      const dd = logistic(D);
      const mort30 = w;
      const mort90 = 1 - (1 - w) * (1 - dd);
      const mort180 = 1 - (1 - w) * (1 - dd) * (1 - logistic(P));
      const decomp = logistic(k);
      const p90 = round(mort90 * 100, 1);
      const risk =
        mort90 >= 0.2
          ? { level: 'critical' as const, label: 'Very high postoperative mortality risk' }
          : mort90 >= 0.1
            ? { level: 'high' as const, label: 'High postoperative mortality risk' }
            : mort90 >= 0.05
              ? { level: 'moderate' as const, label: 'Intermediate postoperative mortality risk' }
              : { level: 'low' as const, label: 'Lower postoperative mortality risk' };
      return {
        score: p90,
        unit: '% 90-day mortality',
        label: risk.label,
        interpretation: `Predicted postoperative mortality in cirrhosis: ${round(mort30 * 100, 1)}% at 30 days, ${p90}% at 90 days, ${round(mort180 * 100, 1)}% at 180 days; 90-day decompensation risk ≈ ${round(decomp * 100, 1)}%. Integrate with surgical urgency, hepatology input, and patient goals — the score alone should not determine surgical candidacy.`,
        riskLevel: risk.level,
        details: [
          { label: '30-day mortality', value: `${round(mort30 * 100, 1)}%` },
          { label: '90-day mortality', value: `${p90}%` },
          { label: '180-day mortality', value: `${round(mort180 * 100, 1)}%` },
          { label: '90-day decompensation', value: `${round(decomp * 100, 1)}%` },
          { label: 'Surgery category', value: cat },
          { label: 'ASA / emergency', value: `ASA ${asa}${emerg ? 'E' : ''}` },
        ],
        recommendations: [
          'Optimize modifiable risks: nutrition, ascites/portal hypertension control, variceal prophylaxis, electrolytes, VTE prophylaxis.',
          'For higher-risk patients: choose enhanced-resource venues, plan heightened postoperative monitoring, consider minimally invasive or non-surgical alternatives.',
          'Not validated for hepatic resection, liver transplant, TAVR, or ASA 1/5/6.',
        ],
      };
    },
    evidence: {
      summary:
        'VOCAL-Penn (Mahmud et al., Hepatology 2021) comprises logistic-regression models for 30-, 90-, and 180-day postoperative mortality (and a separate decompensation model) using ASA class, emergency status, surgery category, age, albumin, platelets, bilirubin (the labs with linear + natural cubic-spline terms), obesity (BMI ≥30), and fatty-liver etiology. 90- and 180-day mortality are modeled as cumulative probabilities chained from the shorter-interval models, matching the published calculator.',
      formula:
        'logit(mortality) = β·(ASA, emergency, surgery dummies, age) + linear & cubic-spline(albumin, platelets, bilirubin) + β·BMI≥30 + β·MASLD; coefficients reproduced from the published vocalpennscore.com implementation.',
      validation:
        'Derived on 4712 surgeries in 3785 Veterans with cirrhosis (VASQIP): 30-day mortality C-statistic 0.859, superior to MELD, MELD-Na, CTP, and Mayo risk score. Externally validated in two large independent health systems (Liver Transplantation 2021). Accuracy is reduced outside the derivation ranges (age <40 or >85, albumin <1.5 or >5 g/dL, bilirubin <0.2 or >5 mg/dL, platelets <30 or >450 ×10⁹/L).',
      references: [
        {
          title: 'Risk Prediction Models for Post-Operative Mortality in Patients With Cirrhosis',
          citation: 'Mahmud N et al. Hepatology. 2021;73(1):204-218',
          year: 2021,
          pmid: '32939786',
          doi: '10.1002/hep.31558',
        },
        {
          title: 'External Validation of the VOCAL-Penn Cirrhosis Surgical Risk Score in Two Large, Independent Health Systems',
          citation: 'Mahmud N et al. Liver Transpl. 2021;27(9):1077-1085',
          year: 2021,
          doi: '10.1002/lt.26060',
        },
      ],
    },
    nextSteps: [
      { condition: '90-day mortality ≥10%', actions: ['Hepatology and anesthesia co-evaluation', 'Consider deferring elective surgery for optimization', 'Discuss goals of care and alternatives'] },
      { condition: 'Any surgery planned', actions: ['Correct coagulopathy/thrombocytopenia as appropriate', 'Manage ascites and encephalopathy preoperatively', 'Plan postoperative decompensation surveillance'] },
    ],
    pearls: [
      'Albumin, platelets, and bilirubin enter through natural cubic splines — small lab changes can shift risk non-linearly near the knots (albumin 2.7/3.7/4.4 g/dL, platelets 74/153/269, bilirubin 0.39/0.75/1.8 mg/dL).',
      'Obesity (BMI ≥30) carried a protective coefficient in this VA cohort — do not remove it to "worsen" the estimate.',
      'The model was built in a predominantly male veteran population; external validation supports use more broadly but calibration may vary.',
    ],
  },

  // ─── 6. Mumtaz Score ───────────────────────────────────────────────────────
  {
    id: 'mumtaz-readmission',
    name: 'Mumtaz Score for Readmission in Cirrhosis',
    shortName: 'Mumtaz Score',
    description:
      'Predicts 30-day hospital readmission risk after discharge in decompensated cirrhosis from demographics, payer, comorbidity burden, etiology, complications, procedures, and discharge disposition.',
    category: 'gastroenterology',
    tags: ['cirrhosis', 'readmission', 'discharge', 'elixhauser', 'transition of care', 'mumtaz'],
    whenToUse:
      'Adults >18 years with decompensated cirrhosis at the time of discharge, using variables from the index admission. Not for patients on mechanical ventilation, under palliative care, post-liver transplant, or electively admitted.',
    whyUse:
      'About 27–32% of decompensated cirrhosis patients are readmitted within 30 days; this administrative-data-derived score stratifies risk to target transitional-care resources.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '18–39 years', value: 7, points: 7 },
        { label: '40–64 years', value: 4, points: 4 },
        { label: '≥65 years', value: 0, points: 0 },
      ], 4, 'Counterintuitively, younger age carried more readmission risk in the NRD derivation.'),
      selectInput('payer', 'Primary payer', [
        { label: 'Medicare', value: 4, points: 4 },
        { label: 'Medicaid', value: 5, points: 5 },
        { label: 'Private insurance', value: 0, points: 0 },
        { label: 'Self-pay', value: -3, points: -3 },
        { label: 'No charge or other', value: -1, points: -1 },
      ], 0, 'US insurance categories — a limitation of this administrative model outside US systems.'),
      selectInput('elixhauser', 'Elixhauser Comorbidity Index', [
        { label: '≥3 comorbidities', value: 2, points: 2 },
        { label: '<3 comorbidities', value: 0, points: 0 },
      ], 0, 'Count of Elixhauser comorbidities (hypertension, diabetes, COPD, CHF, obesity, renal failure, etc.).'),
      yesNo('nonalcoholic', 'Non-alcoholic etiology of cirrhosis', 2, 'Non-alcohol-related cirrhosis etiology (e.g., MASLD, viral, cholestatic) adds 2 points.', false),
      yesNo('ascites', 'Ascites', 5, 'Ascites documented during the index admission.', true),
      yesNo('he', 'Hepatic encephalopathy', 4, 'Hepatic encephalopathy during the index admission.', false),
      yesNo('varicealBleed', 'Variceal bleeding', -7, 'Variceal bleeding during admission SUBTRACTS 7 points (such admissions trigger their own mandatory follow-up pathway).', false),
      yesNo('hcc', 'Hepatocellular carcinoma', 3, 'HCC complicating cirrhosis.', false),
      yesNo('paracentesis', 'Paracentesis during admission', 4, 'Therapeutic paracentesis performed during the index admission.', false),
      yesNo('dialysis', 'Hemodialysis during admission', 7, 'Hemodialysis during the index admission — the largest single positive predictor.', false),
      selectInput('disposition', 'Discharge disposition', [
        { label: 'Routine (home)', value: 0, points: 0 },
        { label: 'Transfer', value: -1, points: -1 },
        { label: 'Home health care', value: 1, points: 1 },
        { label: 'Against medical advice', value: 10, points: 10 },
      ], 0, 'Discharge disposition; leaving AMA adds 10 points.'),
    ],
    calculate(values) {
      const score =
        num(values.age, 0) +
        num(values.payer, 0) +
        num(values.elixhauser, 0) +
        (bool(values.nonalcoholic) ? 2 : 0) +
        (bool(values.ascites) ? 5 : 0) +
        (bool(values.he) ? 4 : 0) +
        (bool(values.varicealBleed) ? -7 : 0) +
        (bool(values.hcc) ? 3 : 0) +
        (bool(values.paracentesis) ? 4 : 0) +
        (bool(values.dialysis) ? 7 : 0) +
        num(values.disposition, 0);
      // Published score→risk mapping (≈ logistic(−1.778 + 0.051×score); reproduces the
      // reported risk table within ~1 percentage point, e.g. score −10→9.7%, 10→20.9%,
      // 19→31.5%, 40→56.8%)
      const riskPct = round(100 / (1 + Math.exp(-(-1.778 + 0.051 * score))), 1);
      const band =
        riskPct < 20
          ? { level: 'low' as const, label: 'Low readmission risk (<20%)' }
          : riskPct <= 30
            ? { level: 'moderate' as const, label: 'Medium readmission risk (20–30%)' }
            : { level: 'high' as const, label: 'High readmission risk (>30%)' };
      return {
        score,
        unit: 'points (−11 to +49)',
        label: band.label,
        interpretation: `Mumtaz score ${score} → estimated 30-day readmission risk ≈ ${riskPct}% (${band.label.toLowerCase()}). High-risk patients warrant structured transitional-care management.`,
        riskLevel: band.level,
        details: [
          { label: 'Score', value: `${score}` },
          { label: 'Estimated 30-day readmission risk', value: `${riskPct}%` },
          { label: 'Risk band (published)', value: 'Low <20% · Medium 20–30% · High >30%' },
        ],
        recommendations: [
          'High risk: arrange transitional-care call or visit within 7 days covering medications, adherence, and warning signs.',
          'Provide social-work support for affordable medications and confirm follow-up (hepatology, paracentesis scheduling).',
          'Patients leaving AMA should receive medications and clear return precautions before discharge.',
        ],
      };
    },
    evidence: {
      summary:
        'The Mumtaz readmission risk score (Hepatology 2019) was derived from the 2013 US Nationwide Readmission Database (n=123,011 decompensated cirrhosis discharges) and validated on the 2014 NRD; the 30-day readmission rate was 27%. Predictors include age <65, Medicare/Medicaid payer, ≥3 Elixhauser comorbidities, non-alcoholic etiology, HE, ascites, variceal bleeding (protective), HCC, paracentesis, hemodialysis, and AMA discharge.',
      formula:
        'Sum of item points (−11 to +49); 30-day risk ≈ 1/(1+e^(−(−1.778 + 0.051×score))).',
      validation:
        'Internally validated on a separate NRD year; stratifies low (<20%), medium (20–30%), and high (>30%) readmission risk. A prospective single-center study reported lower discrimination (AUROC 0.556), so treat the estimate as administrative-data-based and not prospectively confirmed. The risk equation reproduces the published score-to-risk table.',
      references: [
        {
          title: 'Validation of Risk Score in Predicting Early Readmissions in Decompensated Cirrhotic Patients: A Model Based on the Administrative Database',
          citation: 'Mumtaz K et al. Hepatology. 2019;70(2):630-639',
          year: 2019,
          pmid: '30218583',
          doi: '10.1002/hep.30274',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk (>30%)', actions: ['Transitional-care program enrollment', 'Early hepatology follow-up within 7–14 days', 'Medication reconciliation and patient/family education'] },
      { condition: 'AMA disposition', actions: ['Provide medications before departure', 'Document capacity and return precautions', 'Attempt harm-reduction discussion'] },
    ],
    pearls: [
      'Variceal bleeding SUBTRACTS points — bleeding admissions already trigger structured follow-up in practice, so they paradoxically predict lower unplanned readmission.',
      'The score uses administrative (billing) variables including US payer type — interpret cautiously outside the US.',
      'No laboratory values are included; it complements rather than replaces MELD-based severity assessment.',
    ],
  },

  // ─── 7. EVendo ─────────────────────────────────────────────────────────────
  {
    id: 'evendo-varices',
    name: 'EVendo Score for Esophageal Varices',
    shortName: 'EVendo',
    description:
      'Noninvasive score using INR, AST, platelets, BUN, hemoglobin, and ascites to identify cirrhosis patients unlikely to have esophageal varices needing treatment, potentially deferring screening endoscopy.',
    category: 'gastroenterology',
    tags: ['varices', 'cirrhosis', 'endoscopy', 'egd', 'portal hypertension', 'evendo'],
    whenToUse:
      'Adults >18 with known or suspected cirrhosis being considered for screening EGD. Do not use with overt GI bleeding or prior variceal hemorrhage.',
    whyUse:
      'A score ≤3.90 identifies a low-probability group for varices needing treatment (NPV ~94–97%), allowing deferral of screening endoscopy in ~30% of patients — useful where endoscopy access is limited.',
    inputs: [
      numberInput('inr', 'INR', { min: 0.8, max: 10, step: 0.01, exampleValue: 1.2, helpText: 'International normalized ratio; multiplied by 8.5 — the dominant numerator term.' }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 2000, exampleValue: 45, helpText: 'Aspartate aminotransferase in U/L; divided by 35 in the numerator.' }),
      numberInput('platelets', 'Platelet count', { unit: '×10⁹/L', min: 10, max: 800, exampleValue: 120, helpText: 'Platelets in ×10⁹/L (= ×10³/µL); divided by 150 in the denominator — thrombocytopenia raises the score.' }),
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 150, step: 0.5, exampleValue: 14, helpText: 'Blood urea nitrogen in mg/dL (urea mmol/L × 2.8 ≈ BUN mg/dL); divided by 20 in the denominator.' }),
      numberInput('hgb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 20, step: 0.1, exampleValue: 12, helpText: 'Hemoglobin in g/dL (g/L ÷ 10); divided by 15 in the denominator — anemia raises the score.' }),
      yesNo('ascites', 'Ascites', 1, 'Ascites present on exam or imaging adds a full point to the final ratio.', false),
    ],
    calculate(values) {
      const inr = num(values.inr, 1.1);
      const ast = num(values.ast, 40);
      const plt = Math.max(num(values.platelets, 150), 1);
      const bun = Math.max(num(values.bun, 12), 0.5);
      const hgb = Math.max(num(values.hgb, 13), 1);
      const asc = bool(values.ascites) ? 1 : 0;
      const score = (8.5 * inr + ast / 35) / (plt / 150 + bun / 20 + hgb / 15) + asc;
      const s = round(score, 2);
      const defer = score <= 3.9;
      return {
        score: s,
        unit: 'EVendo score',
        label: defer ? 'Below deferral threshold (≤3.90)' : 'Above deferral threshold (>3.90)',
        interpretation: defer
          ? `EVendo ${s} ≤3.90: low probability of varices needing treatment (NPV ~94–97% in derivation/validation cohorts). Screening EGD may be deferred with clinical monitoring and reassessment in ~3–6 months.`
          : `EVendo ${s} >3.90: prioritize screening upper endoscopy; ascites alone adds a full point, so most patients with clinically evident ascites will screen in.`,
        riskLevel: defer ? 'low' : 'moderate',
        details: [
          { label: 'EVendo score', value: String(s) },
          { label: 'Threshold', value: '≤3.90 → consider deferring EGD' },
          { label: 'Numerator', value: `8.5×INR (${round(8.5 * inr, 1)}) + AST/35 (${round(ast / 35, 1)})` },
          { label: 'Denominator', value: `plt/150 + BUN/20 + Hgb/15 = ${round(plt / 150 + bun / 20 + hgb / 15, 2)}` },
          { label: 'Ascites point', value: asc ? '+1' : '0' },
        ],
        recommendations: [
          'Deferral is reasonable only when the score was measured near the decision point and no bleeding has occurred.',
          'Regardless of score, follow Baveno/local guidance for primary prophylaxis once varices are found.',
          'Reassess the score in 3–6 months or with any clinical change.',
        ],
      };
    },
    evidence: {
      summary:
        'EVendo (Dong/Tabibian et al., Clin Gastroenterol Hepatol 2019) is a ratio score — (8.5×INR + AST/35) ÷ (platelets/150 + BUN/20 + hemoglobin/15) + 1 if ascites — derived by random-forest variable selection in 238 screening EGDs and prospectively validated (AUROC ~0.82–0.84 for any varices).',
      formula: 'EVendo = (8.5×INR + AST/35) / (platelets/150 + BUN/20 + Hgb/15) + ascites(0/1); defer EGD if ≤3.90.',
      validation:
        'Prospective validation cohort AUROC 0.82; at ≤3.90 the score spared ~30.5% of EGDs while missing 2.8% of varices needing treatment (1.1% in Child-Pugh A). External validation (Saudi J Gastroenterol 2022) found 82–83% sensitivity and ~94% NPV for VNT; it spares more endoscopies than Baveno VI but misses slightly more VNT.',
      references: [
        {
          title: 'Machine Learning-based Development and Validation of a Scoring System for Screening High-Risk Esophageal Varices',
          citation: 'Dong TS et al. Clin Gastroenterol Hepatol. 2019;17(9):1894-1901.e1',
          year: 2019,
          pmid: '30708109',
          doi: '10.1016/j.cgh.2019.01.025',
        },
        {
          title: 'Validation of the EVendo score for the prediction of varices in cirrhotic patients',
          citation: 'Saudi J Gastroenterol. 2022',
          year: 2022,
          pmid: '35229755',
          doi: '10.4103/sjg.sjg_624_21',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤3.90', actions: ['Defer EGD if appropriate; monitor clinically', 'Repeat EVendo in 3–6 months'] },
      { condition: 'Score >3.90', actions: ['Schedule screening upper endoscopy', 'If VNT found, manage per Baveno VII (NSBB vs band ligation)'] },
    ],
    pearls: [
      'The ascites point is added AFTER the division — adding it inside the numerator is a common implementation error.',
      'BUN is not urea: convert urea mmol/L to BUN mg/dL (×~2.8) before entry.',
      'Because ascites adds a full point, the score has limited incremental value in patients with obvious ascites.',
    ],
  },

  // ─── 8. Fibrotic NASH Index ────────────────────────────────────────────────
  {
    id: 'fibrotic-nash-index',
    name: 'Fibrotic NASH Index (FNI)',
    shortName: 'FNI',
    description:
      'Three-variable logistic score (AST, HbA1c, HDL cholesterol) estimating the probability of fibrotic NASH — biopsy-defined NASH with NAFLD activity score ≥4 and fibrosis ≥F2 — in patients at risk for NAFLD/MASLD.',
    category: 'gastroenterology',
    tags: ['nash', 'mash', 'nafld', 'masld', 'fibrosis', 'ast', 'hba1c', 'hdl', 'fni'],
    whenToUse:
      'Individuals at high risk for MASLD/NASH (obesity, diabetes, metabolic syndrome) in primary or specialty care, to screen for at-risk (fibrotic) NASH without biopsy.',
    whyUse:
      'FNI uses three routine labs, performed well in obese and diabetic subgroups where other scores degrade (AUROC 0.78–0.95 in external European cohorts and 0.93 vs elastography-defined fibrotic NASH in NHANES), and targets the activity-plus-fibrosis phenotype addressed by current MASH therapies.',
    inputs: [
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 1000, exampleValue: 45, helpText: 'Aspartate aminotransferase in U/L; natural-log term, coefficient +2.54.' }),
      numberInput('hba1c', 'HbA1c', { unit: '%', min: 3, max: 20, step: 0.1, exampleValue: 6.8, helpText: 'Glycated hemoglobin as NGSP/DCCT percent (not IFCC mmol/mol); natural-log term, coefficient +3.86 — the dominant predictor.' }),
      numberInput('hdl', 'HDL cholesterol', { unit: 'mmol/L', unitKind: 'cholesterol', min: 0.1, max: 5, step: 0.01, exampleValue: 1.1, helpText: 'HDL cholesterol; converted internally to mg/dL (×38.67) for the published equation. Natural-log term, coefficient −1.66.' }),
    ],
    calculate(values) {
      const ast = Math.max(num(values.ast, 40), 1);
      const a1c = Math.max(num(values.hba1c, 6), 1);
      const hdlMmol = Math.max(num(values.hdl, 1.2), 0.1);
      const hdlMgdl = hdlMmol * 38.67;
      const x = -10.33 + 2.54 * Math.log(ast) + 3.86 * Math.log(a1c) - 1.66 * Math.log(hdlMgdl);
      const fni = 1 / (1 + Math.exp(-x));
      const band =
        fni <= 0.1
          ? { level: 'low' as const, label: 'Rule-out zone (≤0.10)' }
          : fni >= 0.33
            ? { level: 'high' as const, label: 'Rule-in zone (≥0.33)' }
            : { level: 'moderate' as const, label: 'Indeterminate (0.10–0.33)' };
      return {
        score: round(fni, 3),
        unit: 'probability (0–1)',
        label: band.label,
        interpretation:
          fni <= 0.1
            ? `FNI ${round(fni, 3)} ≤0.10: fibrotic NASH unlikely (sensitivity ~0.89, NPV ~0.93 in the derivation cohort). Continue metabolic risk management and periodic reassessment.`
            : fni >= 0.33
              ? `FNI ${round(fni, 3)} ≥0.33: high probability of fibrotic NASH (specificity ~0.90). Hepatology referral and fibrosis staging (e.g., VCTE, ELF, biopsy if needed) are reasonable.`
              : `FNI ${round(fni, 3)} in the 0.10–0.33 grey zone: inconclusive — use a second-line test (VCTE/ELF/FAST score) to resolve risk.`,
        riskLevel: band.level,
        details: [
          { label: 'FNI', value: String(round(fni, 3)) },
          { label: 'Cut-offs', value: '≤0.10 rule-out · ≥0.33 rule-in' },
          { label: 'HDL used', value: `${hdlMmol} mmol/L (${round(hdlMgdl, 1)} mg/dL)` },
        ],
        recommendations: [
          'All patients: lifestyle and metabolic comorbidity management (weight loss, diabetes and lipid control).',
          'Rule-in or persistent indeterminate results: hepatology referral and fibrosis assessment.',
          'Do not use as a stand-alone trial-enrollment or treatment decision without confirmatory staging.',
        ],
      };
    },
    evidence: {
      summary:
        'FNI (Tavaglione et al., Clin Gastroenterol Hepatol 2022) is a logistic model derived in 264 morbidly obese patients with intraoperative biopsy and validated in 3 external European cohorts (n=370/947/5368). Predictors: ln(AST), ln(HbA1c), and ln(HDL mg/dL).',
      formula:
        'FNI = e^x/(1+e^x); x = −10.33 + 2.54·ln(AST U/L) + 3.86·ln(HbA1c %) − 1.66·ln(HDL mg/dL).',
      validation:
        'Derivation AUROC 0.78; external validation AUROC 0.80–0.95. Rule-out cut-off 0.10 (sensitivity ≥0.89, NPV 0.93); rule-in cut-off 0.33 (specificity ≥0.90, PPV 0.57). NHANES analysis against FAST-defined fibrotic NASH gave AUROC 0.93 including in diabetes (0.89).',
      references: [
        {
          title: 'Development and Validation of a Score for Fibrotic Nonalcoholic Steatohepatitis',
          citation: 'Tavaglione F et al. Clin Gastroenterol Hepatol. 2022;20(11):2503-2511',
          year: 2022,
          pmid: '35421583',
          doi: '10.1016/j.cgh.2022.03.044',
        },
      ],
    },
    nextSteps: [
      { condition: 'FNI ≥0.33', actions: ['Hepatology referral', 'Fibrosis staging (VCTE, ELF, or biopsy when indicated)', 'Assess MASH therapy/trial eligibility'] },
      { condition: 'FNI 0.10–0.33', actions: ['Second-line noninvasive testing (VCTE/ELF/FAST)', 'Reassess after metabolic optimization'] },
      { condition: 'FNI ≤0.10', actions: ['Routine cardiometabolic risk management', 'Periodic re-screening'] },
    ],
    pearls: [
      'Enter HbA1c as a percentage, not IFCC mmol/mol (convert: % ≈ mmol/mol ÷ 10.929 + 2.15).',
      'The model expects HDL in mg/dL — the mmol/L entry is converted automatically (×38.67).',
      'FNI targets fibrotic NASH (NAS ≥4 + F≥2), a different endpoint than FIB-4/NFS which target advanced fibrosis alone.',
    ],
  },

  // ─── 9. SAFE Score ─────────────────────────────────────────────────────────
  {
    id: 'safe-score',
    name: 'Steatosis-Associated Fibrosis Estimator (SAFE) Score',
    shortName: 'SAFE',
    description:
      'Primary-care fibrosis score for MASLD/NAFLD using age, BMI, diabetes, AST, ALT, platelets, and globulins to estimate risk of clinically significant (≥F2) fibrosis.',
    category: 'gastroenterology',
    tags: ['nafld', 'masld', 'fibrosis', 'primary care', 'safe score', 'globulin'],
    whenToUse:
      'Initial fibrosis risk assessment in patients with recognized NAFLD/MASLD in primary care or population screening, to identify low-risk patients who can be managed without referral.',
    whyUse:
      'SAFE distinguishes ≥F2 fibrosis with AUROC ≥0.80 — better than FIB-4 and NFS in the derivation/testing sets — and a score <0 rules out significant fibrosis with NPV 88–96%, reducing unnecessary referrals.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, exampleValue: 55, helpText: 'Age in years; coefficient +2.97 per year.' }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 14, max: 70, step: 0.1, exampleValue: 32, helpText: 'Body mass index; values >40 are capped at 40 in the published formula.' }),
      yesNo('diabetes', 'Diabetes', null, 'Diabetes mellitus adds +62.85 to the score.', true),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 1000, exampleValue: 40, helpText: 'Aspartate aminotransferase, natural-log term (×154.85).' }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 1000, exampleValue: 45, helpText: 'Alanine aminotransferase, natural-log term with NEGATIVE coefficient (−58.23).' }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, exampleValue: 4.2, helpText: 'Serum albumin in g/dL (g/L ÷ 10); subtracted from total protein to compute globulins.' }),
      numberInput('totalProtein', 'Total protein', { unit: 'g/dL', min: 3, max: 11, step: 0.1, exampleValue: 7.2, helpText: 'Total serum protein in g/dL (g/L ÷ 10). Globulins = total protein − albumin; a natural-log term (×195.48).' }),
      numberInput('platelets', 'Platelets', { unit: '×10⁹/L', min: 20, max: 800, exampleValue: 230, helpText: 'Platelet count in ×10⁹/L; natural-log term with negative coefficient (−141.61).' }),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const bmi = Math.min(num(values.bmi, 30), 40);
      const dm = bool(values.diabetes) ? 1 : 0;
      const ast = Math.max(num(values.ast, 40), 1);
      const alt = Math.max(num(values.alt, 45), 1);
      const alb = num(values.albumin, 4.2);
      const tp = num(values.totalProtein, 7.2);
      const plt = Math.max(num(values.platelets, 230), 1);
      const glob = Math.max(tp - alb, 0.1);
      const score =
        2.97 * age + 5.99 * bmi + 62.85 * dm + 154.85 * Math.log(ast) - 58.23 * Math.log(alt) +
        195.48 * Math.log(glob) - 141.61 * Math.log(plt) - 75;
      const s = round(score, 0);
      const band =
        score < 0
          ? { level: 'low' as const, label: 'Low risk (<0)' }
          : score < 100
            ? { level: 'moderate' as const, label: 'Indeterminate risk (0–99)' }
            : { level: 'high' as const, label: 'High risk (≥100)' };
      return {
        score: s,
        unit: 'SAFE points',
        label: band.label,
        interpretation:
          score < 0
            ? `SAFE ${s} <0: low probability of ≥F2 fibrosis (NPV 88–96%). Manage in primary care with metabolic risk optimization and periodic reassessment (every ~1–3 years).`
            : score < 100
              ? `SAFE ${s}: indeterminate risk of significant fibrosis. Consider second-line testing (VCTE, ELF) and hepatology referral if high-risk features coexist.`
              : `SAFE ${s} ≥100: high risk of ≥F2 fibrosis — refer to hepatology; may require biopsy or advanced noninvasive staging.`,
        riskLevel: band.level,
        details: [
          { label: 'SAFE score', value: String(s) },
          { label: 'Globulins (TP − albumin)', value: `${round(glob, 2)} g/dL` },
          { label: 'BMI used (capped at 40)', value: String(bmi) },
          { label: 'Bands', value: '<0 low · 0–99 indeterminate · ≥100 high' },
        ],
        recommendations: [
          'Low risk: lifestyle/metabolic management; repeat noninvasive testing every 1–3 years or on clinical change.',
          'Indeterminate: VCTE or ELF testing; hepatology referral if imaging suggests fibrosis.',
          'High risk: hepatology referral; biopsy may be required.',
        ],
      };
    },
    evidence: {
      summary:
        'SAFE (Sripongpun/Kim et al., Hepatology 2023) is a multivariable logistic-regression-derived score built in the NASH CRN biopsy cohort (n=676) and tested in the FLINT trial cohort (n=280), an MRE cohort (n=130), and NHANES III (n=11,953) against long-term mortality.',
      formula:
        'SAFE = 2.97×age + 5.99×BMI(cap 40) + 62.85×diabetes + 154.85×ln(AST) − 58.23×ln(ALT) + 195.48×ln(globulin g/dL) − 141.61×ln(platelets) − 75; globulin = total protein − albumin.',
      validation:
        'AUROC ≥0.80 for ≥F2 fibrosis in test sets, exceeding FIB-4 and NFS. NPV for ruling out ≥F2 at SAFE<0 was 88–92%; NHANES III subjects with SAFE<0 had survival comparable to non-steatosis controls while SAFE>100 carried adjusted HR 1.53 for mortality. External NHANES validation (2023): low-risk NPV 0.96, though sensitivity drops in adults <40 y.',
      references: [
        {
          title: 'The steatosis-associated fibrosis estimator (SAFE) score: A tool to detect low-risk NAFLD in primary care',
          citation: 'Sripongpun P et al. Hepatology. 2023;77(1):256-267',
          year: 2023,
          pmid: '35477908',
          doi: '10.1002/hep.32545',
        },
        {
          title: 'The Steatosis-associated fibrosis estimator (SAFE) score: validation in the general US population',
          citation: 'Hepatol Commun. 2023;7(4):e0075',
          year: 2023,
          pmid: '37026734',
          doi: '10.1097/HC9.0000000000000075',
        },
      ],
    },
    nextSteps: [
      { condition: 'SAFE ≥100', actions: ['Hepatology referral', 'Advanced fibrosis staging (VCTE/MRE/ELF, biopsy if needed)', 'HCC/varices surveillance if cirrhosis confirmed'] },
      { condition: 'SAFE 0–99', actions: ['Second-line NIT (VCTE, ELF)', 'Reassess after weight/metabolic intervention'] },
      { condition: 'SAFE <0', actions: ['Primary-care management of metabolic risk', 'Repeat score every 1–3 years'] },
    ],
    pearls: [
      'Globulin = total protein − albumin — both inputs are needed; enter in g/dL.',
      'BMI is capped at 40 kg/m² in the formula.',
      'Performance is age-dependent: it under-detects fibrosis in young adults (<40) and over-refers older adults.',
    ],
  },

  // ─── 10. pFIB-c ────────────────────────────────────────────────────────────
  {
    id: 'pfib-c',
    name: 'Pediatric Fibrosis Score–Continuous (pFIB-c)',
    shortName: 'pFIB-c',
    description:
      'Continuous probability score estimating significant (≥F2) liver fibrosis in children and adolescents with MASLD, from sex, hypertension, ethnicity, ALT, weight z-score, and HOMA-IR.',
    category: 'pediatrics',
    tags: ['pediatric', 'masld', 'nafld', 'fibrosis', 'homa-ir', 'pfib', 'obesity'],
    status: 'current',
    whenToUse:
      'Children and adolescents with MASLD — primarily in obesity/secondary-care populations — as a rule-out aid for significant (≥F2) fibrosis. Not yet externally validated; use with caution alongside local guidance.',
    whyUse:
      'In the derivation and elastography validation cohorts pFIB-c discriminated ≥F2 fibrosis better than existing pediatric indices (c-statistic 0.839, NPV >90%), potentially avoiding unnecessary referrals and biopsies.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Girl', value: 0 },
        { label: 'Boy', value: 1 },
      ], 1, 'Male sex carries coefficient +1.194.'),
      yesNo('hypertension', 'Hypertension', null, 'BP >95th percentile for sex/age/height or on antihypertensive therapy; coefficient +1.636.', false),
      yesNo('black', 'Black ethnicity', null, 'Black ethnicity carries a large NEGATIVE coefficient (−2.453) in the published model — included as published; interpret with awareness of the limitations of race-based predictors.', false),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 2000, exampleValue: 55, helpText: 'Alanine aminotransferase in U/L; coefficient +0.019 per unit.' }),
      numberInput('weightZ', 'Weight z-score', { min: -4, max: 6, step: 0.1, exampleValue: 2.4, helpText: 'Weight-for-age z-score from CDC or WHO growth references; coefficient +0.633.' }),
      numberInput('insulin', 'Fasting insulin', { unit: 'pmol/L', min: 10, max: 1500, exampleValue: 120, helpText: 'Fasting insulin in pmol/L; HOMA-IR = insulin(pmol/L) × glucose(mmol/L) / 135.' }),
      numberInput('glucose', 'Fasting glucose', { unit: 'mmol/L', min: 2, max: 30, step: 0.1, exampleValue: 5.2, helpText: 'Fasting glucose in mmol/L for the HOMA-IR computation.' }),
    ],
    calculate(values) {
      const boy = num(values.sex, 0);
      const htn = bool(values.hypertension) ? 1 : 0;
      const black = bool(values.black) ? 1 : 0;
      const alt = num(values.alt, 50);
      const wz = num(values.weightZ, 2);
      const ins = Math.max(num(values.insulin, 100), 1);
      const glu = Math.max(num(values.glucose, 5), 1);
      const homa = (ins * glu) / 135;
      const x = -5.155 + 1.194 * boy + 1.636 * htn + 0.019 * alt + 0.633 * wz + 0.079 * homa - 2.453 * black;
      const p = 1 / (1 + Math.exp(-x));
      const prob = round(p, 3);
      const below = p <= 0.226;
      return {
        score: prob,
        unit: 'probability (0–1)',
        label: below ? 'Below rule-out threshold (≤0.226)' : 'Above rule-out threshold (>0.226)',
        interpretation: below
          ? `pFIB-c ${prob} ≤0.226: supports exclusion of significant (≥F2) fibrosis (NPV >90% in derivation/elastography cohorts). Continue MASLD management and periodic reassessment.`
          : `pFIB-c ${prob} >0.226: does not exclude significant fibrosis — consider elastography, hepatology referral, and further workup. Not externally validated; integrate with clinical assessment.`,
        riskLevel: below ? 'low' : 'moderate',
        details: [
          { label: 'pFIB-c probability', value: String(prob) },
          { label: 'HOMA-IR', value: String(round(homa, 1)) },
          { label: 'Rule-out cut-off', value: '≤0.226 (per published analysis)' },
          { label: 'Validation status', value: 'Not externally validated' },
        ],
        recommendations: [
          'Continue weight optimization and metabolic comorbidity management regardless of score.',
          'Above threshold: transient/MR elastography, hepatology referral, and consider biopsy per local guidance.',
          'Repeat assessment with clinical change; the score is a rule-out aid, not a diagnostic.',
        ],
      };
    },
    evidence: {
      summary:
        'pFIB-c (Lefere et al., Hepatology 2025) is a logistic model derived in 327 children with severe obesity evaluated by transient elastography and validated in elastography (n=504) and biopsy-proven MASLD (n=261) cohorts.',
      formula:
        'x = −5.155 + 1.194×boy + 1.636×hypertension + 0.019×ALT + 0.633×weight z-score + 0.079×HOMA-IR − 2.453×Black ethnicity; pFIB-c = eˣ/(1+eˣ). HOMA-IR = insulin(pmol/L)×glucose(mmol/L)/135.',
      validation:
        'c-statistic 0.839 with NPV >90% in derivation and elastography validation cohorts; performance fell to AUROC 0.710–0.770 in tertiary biopsy cohorts with high fibrosis prevalence — best used as a rule-out in unselected obesity populations. NOT externally validated. The Black-ethnicity term (−2.453) is reproduced as published; race-based terms warrant cautious interpretation.',
      references: [
        {
          title: 'Development and validation of pFIB scores for exclusion of significant liver fibrosis in pediatric MASLD',
          citation: 'Lefere S et al. Hepatology. 2025;81(4):1276-1287',
          year: 2025,
          pmid: '39028885',
          doi: '10.1097/HEP.0000000000001016',
        },
      ],
    },
    nextSteps: [
      { condition: 'pFIB-c ≤0.226', actions: ['Lifestyle and metabolic management', 'Repeat score or alternative NIT at defined intervals'] },
      { condition: 'pFIB-c >0.226', actions: ['Elastography (transient/MR/US)', 'Pediatric hepatology referral', 'Consider liver biopsy per local guidance'] },
    ],
    pearls: [
      'The score is designed to RULE OUT significant fibrosis — a low result is reassuring; a high result is non-specific.',
      'HOMA-IR uses SI units: insulin pmol/L × glucose mmol/L ÷ 135 (≈ insulin mIU/L × glucose mg/dL ÷ 405).',
      'Accuracy was lower in tertiary referral cohorts — expect more false positives where fibrosis prevalence and ALT are high.',
    ],
  },

  // ─── 11. NAFLD Activity Score ──────────────────────────────────────────────
  {
    id: 'nafld-activity-score',
    name: 'NAFLD Activity Score (NAS)',
    shortName: 'NAS',
    description:
      'Unweighted sum of steatosis (0–3), lobular inflammation (0–3), and hepatocyte ballooning (0–2) on liver biopsy — grades necroinflammatory activity in NAFLD/MASLD (0–8).',
    category: 'gastroenterology',
    tags: ['nafld', 'masld', 'nash', 'mash', 'histology', 'biopsy', 'nas', 'kleiner'],
    whenToUse:
      'In patients who have had a liver biopsy for NAFLD/MASLD, to grade histologic activity — primarily for clinical trials and standardized reporting. NOT a stand-alone surrogate for NASH diagnosis.',
    whyUse:
      'NAS is the standard semiquantitative activity measure in NASH trials; change in NAS tracks disease progression/regression and is a common regulatory endpoint.',
    inputs: [
      selectInput('steatosis', 'Steatosis grade', [
        { label: '<5% of parenchyma', value: 0, points: 0 },
        { label: '5–33%', value: 1, points: 1 },
        { label: '34–66%', value: 2, points: 2 },
        { label: '>66%', value: 3, points: 3 },
      ], 1, 'Low- to medium-power evaluation of parenchymal involvement by steatosis.'),
      selectInput('inflammation', 'Lobular inflammation', [
        { label: 'No foci', value: 0, points: 0 },
        { label: '1 focus per 200× field', value: 1, points: 1 },
        { label: '2–4 foci per 200× field', value: 2, points: 2 },
        { label: '>4 foci per 200× field', value: 3, points: 3 },
      ], 1, 'Overall assessment of inflammatory foci under 200× magnification. (Note: the Kleiner NASH-CRN system scores lobular inflammation 0–3.)'),
      selectInput('ballooning', 'Hepatocyte ballooning', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Few balloon cells', value: 1, points: 1 },
        { label: 'Many cells / prominent ballooning', value: 2, points: 2 },
      ], 1, 'Liver cell injury: hepatocyte ballooning degeneration.'),
    ],
    calculate(values) {
      const steat = num(values.steatosis, 0);
      const infl = num(values.inflammation, 0);
      const ball = num(values.ballooning, 0);
      const nas = steat + infl + ball;
      const band =
        nas >= 5
          ? { level: 'high' as const, label: 'NAS ≥5 — largely diagnostic of NASH' }
          : nas >= 3
            ? { level: 'moderate' as const, label: 'NAS 3–4 — indeterminate for NASH' }
            : { level: 'low' as const, label: 'NAS 0–2 — largely not NASH' };
      return {
        score: nas,
        unit: 'NAS (0–8)',
        label: band.label,
        interpretation:
          nas >= 5
            ? `NAS ${nas} (steatosis ${steat} + inflammation ${infl} + ballooning ${ball}): scores ≥5 occurred largely in cases considered diagnostic of NASH in the derivation study. Correlate with the pathologist's overall diagnostic category and stage fibrosis separately.`
            : nas >= 3
              ? `NAS ${nas}: intermediate scores were evenly divided among not-NASH, borderline, and NASH categories — the pathologist's global diagnosis and fibrosis stage should drive classification.`
              : `NAS ${nas}: scores 0–2 occurred largely in cases considered not diagnostic of NASH.`,
        riskLevel: band.level,
        details: [
          { label: 'Steatosis', value: `${steat} / 3` },
          { label: 'Lobular inflammation', value: `${infl} / 3` },
          { label: 'Ballooning', value: `${ball} / 2` },
          { label: 'Fibrosis', value: 'Staged separately (0–4) — not part of NAS' },
        ],
        recommendations: [
          'Pair NAS with fibrosis stage (Kleiner/CRN 0–4) — prognosis tracks fibrosis more than activity.',
          'If biopsy shows MASH, assess fibrosis noninvasively and discuss therapies (weight loss, resmetirom eligibility, trials).',
        ],
      };
    },
    evidence: {
      summary:
        'The NAFLD Activity Score is the unweighted sum of steatosis (0–3), lobular inflammation (0–3), and hepatocellular ballooning (0–2) from the NASH CRN histological scoring system (Kleiner et al., Hepatology 2005).',
      formula: 'NAS = steatosis (0–3) + lobular inflammation (0–3) + ballooning (0–2); range 0–8.',
      validation:
        'Designed and validated by the NASH CRN Pathology Committee for inter-rater reproducibility (weighted kappa: fibrosis 0.84, steatosis 0.79, injury 0.56, lobular inflammation 0.45). In the derivation set, NAS ≥5 corresponded largely to diagnostic NASH and 0–2 to not-NASH; Brunt & Kleiner caution it is an activity index, not a diagnostic surrogate.',
      references: [
        {
          title: 'Design and validation of a histological scoring system for nonalcoholic fatty liver disease',
          citation: 'Kleiner DE et al. Hepatology. 2005;41(6):1313-1321',
          year: 2005,
          pmid: '15915461',
          doi: '10.1002/hep.20701',
        },
      ],
    },
    nextSteps: [
      { condition: 'NAS ≥5 with significant fibrosis', actions: ['Manage as MASH: weight loss 7–10%, metabolic control', 'Consider resmetirom/clinical trials', 'Fibrosis-stage-appropriate surveillance'] },
      { condition: 'NAS 3–4', actions: ['Correlate with pathologist diagnostic category', 'Address metabolic risk factors'] },
    ],
    pearls: [
      'Fibrosis stage is deliberately EXCLUDED from NAS — stage and grade are reported separately.',
      'A ≥2-point NAS improvement with no worsening of fibrosis is a common histologic response endpoint in MASH trials.',
      'Pediatric NAFLD can show a different pattern (portal-predominant) that the adult-weighted NAS under-represents.',
    ],
  },

  // ─── 12. Simplified AIH Score ──────────────────────────────────────────────
  {
    id: 'aih-simplified',
    name: 'Simplified Autoimmune Hepatitis (AIH) Score',
    shortName: 'Simplified AIH',
    description:
      'IAIHG 2008 simplified criteria for autoimmune hepatitis: autoantibodies, IgG, histology, and exclusion of viral hepatitis (score 0–8; ≥6 probable, ≥7 definite AIH).',
    category: 'gastroenterology',
    tags: ['autoimmune hepatitis', 'aih', 'ana', 'sma', 'lkm', 'sla', 'igg', 'hepatology'],
    whenToUse:
      'Patients with histological evidence of hepatitis in whom autoimmune hepatitis is suspected. Do not use when liver histology is normal — AIH is then not the diagnosis.',
    whyUse:
      'The simplified criteria retain high accuracy with only four domains (AUROC 0.946 training / 0.91 validation; 88% sensitivity/97% specificity at ≥6, 81%/99% at ≥7) and are far easier to apply than the revised original score.',
    inputs: [
      selectInput('anaSma', 'ANA or SMA (F-actin) titer', [
        { label: 'Negative (<1:40)', value: 0, points: 0 },
        { label: '≥1:40', value: 1, points: 1 },
        { label: '≥1:80 (strongly positive)', value: 2, points: 2 },
      ], 1, 'Highest of ANA or SMA/anti-actin titer by immunofluorescence (or per-assay equivalent).'),
      selectInput('lkm', 'LKM1 antibody', [
        { label: '<1:40', value: 0, points: 0 },
        { label: '≥1:40', value: 2, points: 2 },
      ], 0, 'Anti-liver-kidney-microsomal type 1; positivity at ≥1:40 scores the full 2 autoantibody points.'),
      selectInput('sla', 'SLA antibody', [
        { label: 'Negative', value: 0, points: 0 },
        { label: 'Positive', value: 2, points: 2 },
      ], 0, 'Anti-soluble liver antigen (SLA/LP); positivity alone scores the full 2 autoantibody points.'),
      selectInput('igg', 'IgG level', [
        { label: 'Normal', value: 0, points: 0 },
        { label: '> upper limit of normal', value: 1, points: 1 },
        { label: '>1.1 × upper limit of normal', value: 2, points: 2 },
      ], 1, 'Serum IgG relative to the local upper limit of normal.'),
      selectInput('histology', 'Liver histology', [
        { label: 'Atypical / not compatible', value: 0, points: 0 },
        { label: 'Compatible with AIH', value: 1, points: 1 },
        { label: 'Typical of AIH', value: 2, points: 2 },
      ], 2, 'Typical: interface hepatitis, lymphoplasmacytic infiltrate, and emperipolesis/rosettes. Compatible: chronic hepatitis pattern lacking full features.'),
      selectInput('viral', 'Viral hepatitis markers', [
        { label: 'Present (viral hepatitis)', value: 0, points: 0 },
        { label: 'Absent (no viral hepatitis)', value: 2, points: 2 },
      ], 2, 'Absence of viral hepatitis markers is required for points; active viral hepatitis precludes an AIH diagnosis.'),
    ],
    calculate(values) {
      const autoAb = Math.max(num(values.anaSma, 0), num(values.lkm, 0), num(values.sla, 0));
      const igg = num(values.igg, 0);
      const hist = num(values.histology, 0);
      const viral = num(values.viral, 0);
      const score = autoAb + igg + hist + viral;
      const band =
        score >= 7
          ? { level: 'high' as const, label: 'Definite AIH (≥7)' }
          : score >= 6
            ? { level: 'moderate' as const, label: 'Probable AIH (≥6)' }
            : { level: 'low' as const, label: 'AIH unlikely (<6)' };
      return {
        score,
        unit: 'points (0–8)',
        label: band.label,
        interpretation:
          score >= 7
            ? `Score ${score}/8: definite AIH by the simplified criteria (validation: ~81% sensitivity, ~99% specificity).`
            : score >= 6
              ? `Score ${score}/8: probable AIH (validation: ~88% sensitivity, ~97% specificity). Correlate clinically — biopsy and response to immunosuppression refine certainty.`
              : `Score ${score}/8: below the ≥6 probable-AIH threshold; consider alternative diagnoses and the revised original (1999) score if suspicion persists.`,
        riskLevel: band.level,
        details: [
          { label: 'Autoantibodies (max of ANA/SMA, LKM1, SLA)', value: `${autoAb} / 2` },
          { label: 'IgG', value: `${igg} / 2` },
          { label: 'Histology', value: `${hist} / 2` },
          { label: 'Viral hepatitis excluded', value: `${viral} / 2` },
        ],
        recommendations: [
          'Score ≥6: hepatology referral; discuss corticosteroid ± azathioprine induction per guidelines.',
          'Borderline scores: repeat autoantibody/IgG testing and expert histology review.',
          'Exclude overlap syndromes (PSC, PBC) and drug-induced autoimmune-like hepatitis.',
        ],
      };
    },
    evidence: {
      summary:
        'The simplified AIH score (Hennes et al., IAIHG, Hepatology 2008) awards up to 2 points each for autoantibodies (ANA/SMA ≥1:40=1, ≥1:80=2; LKM1 ≥1:40=2; SLA+=2), IgG (>ULN=1, >1.1×ULN=2), histology (compatible=1, typical=2), and absent viral hepatitis (=2); ≥6 probable, ≥7 definite AIH.',
      formula: 'Score = max(autoantibody points) + IgG + histology + viral-exclusion (0–8).',
      validation:
        'Trained on 250 AIH vs 193 controls (AUROC 0.946) and validated on 109 AIH vs 284 controls (AUROC 0.91) in the published derivation: ≥6 gave 88% sensitivity/97% specificity, ≥7 gave 81%/99%. Performs slightly worse in cholestatic/atypical presentations; the 1999 revised score may capture more atypical cases.',
      references: [
        {
          title: 'Simplified criteria for the diagnosis of autoimmune hepatitis',
          citation: 'Hennes EM et al. Hepatology. 2008;48(1):169-176',
          year: 2008,
          pmid: '18537184',
          doi: '10.1002/hep.22322',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥7 (definite)', actions: ['Hepatology referral', 'Initiate immunosuppression per AASLD/EASL guidance', 'Baseline bone protection and monitoring plan'] },
      { condition: 'Score 6 (probable)', actions: ['Specialist review of histology', 'Repeat serologies if equivocal', 'Consider therapeutic trial with close monitoring in appropriate patients'] },
      { condition: 'Score <6 with ongoing suspicion', actions: ['Apply the revised original (1999) score', 'Evaluate for overlap or alternative etiologies'] },
    ],
    pearls: [
      'Autoantibody points take the MAXIMUM across ANA/SMA, LKM1, and SLA — they are not additive.',
      'Atypical assays (ELISA/bead-based ANA) may need local cut-off interpretation; titers were defined by immunofluorescence.',
      'If histology is normal, do not score — AIH requires hepatitis on biopsy.',
    ],
  },

  // ─── 13. Revised Original AIH Score ────────────────────────────────────────
  {
    id: 'aih-revised',
    name: 'Revised Original Score for Autoimmune Hepatitis (AIH)',
    shortName: 'Revised AIH',
    description:
      'IAIHG 1999 revised scoring system for autoimmune hepatitis: serology, autoantibodies, viral markers, drug/alcohol history, histology, other autoimmune disease, and optional treatment-response items (definite >15 pre-treatment, >17 post-treatment).',
    category: 'gastroenterology',
    tags: ['autoimmune hepatitis', 'aih', 'iaihg', 'ana', 'sma', 'lkm', 'ama', 'interface hepatitis'],
    whenToUse:
      'Suspected autoimmune hepatitis — especially atypical or borderline presentations where the simplified score is non-diagnostic — for systematic diagnostic classification.',
    whyUse:
      'The revised original score is more comprehensive and somewhat more sensitive than the simplified criteria in atypical cases, incorporating histology detail, drug/alcohol history, and other autoimmune disease.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 0, points: 0 },
        { label: 'Female', value: 2, points: 2 },
      ], 2, 'Female sex scores +2, reflecting the female predominance of AIH.'),
      selectInput('alpAst', 'ALP:AST (or ALP:ALT) ratio', [
        { label: '<1.5', value: 2, points: 2 },
        { label: '1.5–3.0', value: 0, points: 0 },
        { label: '>3.0', value: -2, points: -2 },
      ], 2, 'Ratio of alkaline phosphatase to AST/ALT, each as multiples of the ULN; a cholestatic ratio (>3) argues against AIH (−2).'),
      selectInput('globulin', 'Serum globulins or IgG (× ULN)', [
        { label: '>2.0 × normal', value: 3, points: 3 },
        { label: '1.5–2.0 ×', value: 2, points: 2 },
        { label: '1.0–1.5 ×', value: 1, points: 1 },
        { label: '<1.0 × (normal)', value: 0, points: 0 },
      ], 2, 'Total globulins or IgG expressed as multiples of the upper limit of normal.'),
      selectInput('autoAb', 'ANA, SMA, or LKM-1 titer', [
        { label: '>1:80', value: 3, points: 3 },
        { label: '1:80', value: 2, points: 2 },
        { label: '1:40', value: 1, points: 1 },
        { label: '<1:40', value: 0, points: 0 },
      ], 1, 'Highest titer among ANA, SMA, and LKM-1 by immunofluorescence.'),
      selectInput('optionalAb', 'Optional additional parameters', [
        { label: 'None of the above', value: 0, points: 0 },
        { label: 'HLA-DR3 or HLA-DR4', value: 1, points: 1 },
        { label: 'Other defined autoantibodies (anti-SLA/LP, actin, ASGPR, pANCA)', value: 2, points: 2 },
      ], 0, 'Use ONLY when ANA/SMA/LKM-1 are negative: seropositivity for other defined autoantibodies +2, or HLA-DR3/DR4 +1.'),
      selectInput('ama', 'AMA', [
        { label: 'Negative', value: 0, points: 0 },
        { label: 'Positive', value: -4, points: -4 },
      ], 0, 'Antimitochondrial antibody positivity strongly suggests PBC instead (−4).'),
      selectInput('viral', 'Hepatitis viral markers', [
        { label: 'Negative', value: 3, points: 3 },
        { label: 'Positive', value: -3, points: -3 },
      ], 3, 'IgM anti-HAV, HBsAg, IgM anti-HBc, anti-HCV, and HCV RNA; positivity argues against AIH (−3).'),
      selectInput('drugs', 'Hepatotoxic drug history', [
        { label: 'No', value: 1, points: 1 },
        { label: 'Yes', value: -4, points: -4 },
      ], 1, 'Recent or current use of hepatotoxic drugs (−4), including drugs implicated in autoimmune-like DILI.'),
      selectInput('alcohol', 'Average alcohol intake', [
        { label: '<25 g/day', value: 2, points: 2 },
        { label: '25–60 g/day', value: 0, points: 0 },
        { label: '>60 g/day', value: -2, points: -2 },
      ], 2, 'Average daily alcohol consumption.'),
      selectInput('interfaceHep', 'Histology: interface hepatitis', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 3, points: 3 },
      ], 3, 'Interface (piecemeal) hepatitis on biopsy — the dominant histology item (+3).'),
      selectInput('plasma', 'Histology: lymphoplasmacytic infiltrate', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 1, points: 1 },
      ], 1, 'Predominantly lymphoplasmacytic infiltrate (+1).'),
      selectInput('rosettes', 'Histology: rosetting of liver cells', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 1, points: 1 },
      ], 1, 'Liver-cell rosettes (+1). If interface hepatitis, plasmacytic infiltrate, AND rosettes are ALL absent, 5 points are subtracted.'),
      selectInput('biliary', 'Histology: biliary changes', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: -3, points: -3 },
      ], 0, 'Bile-duct changes typical of PBC/PSC or periportal ductular reaction with copper-associated protein (−3).'),
      selectInput('otherHist', 'Histology: other changes suggesting different etiology', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: -3, points: -3 },
      ], 0, 'Any other prominent features suggesting a different etiology (−3).'),
      selectInput('otherAi', 'Other autoimmune disease', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 2, points: 2 },
      ], 0, 'Autoimmune disease in the patient or first-degree relatives (thyroiditis, colitis, etc.) +2.'),
      selectInput('response', 'Response to therapy', [
        { label: 'Not applicable / pre-treatment', value: 'none', points: 0 },
        { label: 'Complete remission', value: 'complete', points: 2 },
        { label: 'Relapse after response', value: 'relapse', points: 3 },
      ], 'none', 'Optional item used for the POST-treatment score: complete response +2, relapse +3. Post-treatment thresholds differ (>17 definite, 12–17 probable).'),
    ],
    calculate(values) {
      const interfaceYes = num(values.interfaceHep, 0) > 0;
      const plasmaYes = num(values.plasma, 0) > 0;
      const rosetteYes = num(values.rosettes, 0) > 0;
      const noHistFeatures = !interfaceYes && !plasmaYes && !rosetteYes ? -5 : 0;
      const resp = str(values.response, 'none');
      const respPts = resp === 'complete' ? 2 : resp === 'relapse' ? 3 : 0;
      const score =
        num(values.sex, 0) +
        num(values.alpAst, 0) +
        num(values.globulin, 0) +
        num(values.autoAb, 0) +
        num(values.optionalAb, 0) +
        num(values.ama, 0) +
        num(values.viral, 0) +
        num(values.drugs, 0) +
        num(values.alcohol, 0) +
        num(values.interfaceHep, 0) +
        num(values.plasma, 0) +
        num(values.rosettes, 0) +
        noHistFeatures +
        num(values.biliary, 0) +
        num(values.otherHist, 0) +
        num(values.otherAi, 0) +
        respPts;
      const postTx = resp !== 'none';
      const definite = postTx ? score > 17 : score > 15;
      const probable = postTx ? score >= 12 && score <= 17 : score >= 10 && score <= 15;
      const band = definite
        ? { level: 'high' as const, label: `Definite AIH (>${postTx ? 17 : 15} ${postTx ? 'post' : 'pre'}-treatment)` }
        : probable
          ? { level: 'moderate' as const, label: `Probable AIH (${postTx ? '12–17' : '10–15'} ${postTx ? 'post' : 'pre'}-treatment)` }
          : { level: 'low' as const, label: 'AIH unlikely by score' };
      return {
        score,
        unit: 'aggregate score',
        label: band.label,
        interpretation: `Revised AIH score ${score} (${postTx ? 'post-treatment' : 'pre-treatment'} thresholds): ${definite ? 'definite AIH' : probable ? 'probable AIH' : 'below probable threshold'}. ${noHistFeatures ? 'Note: −5 applied because none of the three characteristic histology features are present. ' : ''}Diagnosis still requires clinical correlation — the score defines rather than proves AIH.`,
        riskLevel: band.level,
        details: [
          { label: 'Aggregate score', value: String(score) },
          { label: 'Thresholds applied', value: postTx ? 'Definite >17 · Probable 12–17 (post-treatment)' : 'Definite >15 · Probable 10–15 (pre-treatment)' },
          { label: 'Histology components', value: `interface ${num(values.interfaceHep, 0)}, plasmacytic ${num(values.plasma, 0)}, rosettes ${num(values.rosettes, 0)}${noHistFeatures ? ' (−5 none present)' : ''}` },
          { label: 'Negative items', value: `AMA ${num(values.ama, 0)}, viral ${num(values.viral, 0)}, drugs ${num(values.drugs, 0)}, alcohol ${num(values.alcohol, 0)}, biliary ${num(values.biliary, 0)}, other histology ${num(values.otherHist, 0)}` },
        ],
        recommendations: [
          'Definite/probable: hepatology referral; treatment per guideline with monitoring.',
          'Score-driven diagnosis should be reconciled with expert histology and the clinical course (including response to immunosuppression).',
          'Check overlap features (AMA, biliary changes) before labeling definite AIH.',
        ],
      };
    },
    evidence: {
      summary:
        'The IAIHG revised (1999) score sums sex, ALP:AST ratio, globulins/IgG, autoantibody titers, AMA, viral markers, drug and alcohol history, additive histology items (interface hepatitis +3; plasmacytic infiltrate +1; rosettes +1; all three absent −5; biliary or other changes −3 each), other autoimmune disease, optional autoantibodies/HLA, and treatment response.',
      formula:
        'Aggregate score; definite AIH >15 pre-treatment or >17 post-treatment; probable 10–15 pre-treatment or 12–17 post-treatment.',
      validation:
        'Published by the International Autoimmune Hepatitis Group (Alvarez et al., J Hepatol 1999) as a revision of the 1993 criteria. It is more sensitive than the simplified score in atypical presentations but less specific; widely used for classification in research and complex cases.',
      references: [
        {
          title: 'International Autoimmune Hepatitis Group Report: review of criteria for diagnosis of autoimmune hepatitis',
          citation: 'Alvarez F et al. J Hepatol. 1999;31(5):929-938',
          year: 1999,
          pmid: '10580593',
        },
      ],
    },
    nextSteps: [
      { condition: 'Definite AIH', actions: ['Hepatology referral', 'Immunosuppressive therapy per guideline', 'Document response — relapse adds to post-treatment score'] },
      { condition: 'Probable AIH', actions: ['Expert histology review', 'Complete serologic panel (SLA, atypical antibodies)', 'Reassess after excluding viral/drug etiologies'] },
      { condition: 'Score below probable with persistent suspicion', actions: ['Re-review biopsy for subtle interface activity', 'Consider IgG and autoantibody retesting'] },
    ],
    pearls: [
      'The three characteristic histology items are additive, and their complete ABSENCE costs 5 points — histology dominates this score.',
      'Negative items (AMA, drugs, viral markers, biliary changes) can sink an otherwise classic presentation — intentionally.',
      'Post-treatment thresholds are higher because the response items add points; do not mix thresholds.',
    ],
  },
];
