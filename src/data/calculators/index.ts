import type { Calculator } from '../../types/calculator';
import { assertUniqueCalculatorIds } from '../../utils/registry';
import { cardiologyCalcs } from './cardiology';
import { criticalCareCalcs } from './critical-care';
import { nephrologyEndoCalcs } from './nephrology-endo';
import { giNeuroPsychCalcs } from './gi-neuro-psych';
import { emergencyMiscCalcs } from './emergency-misc';
import { extraCalcs } from './extra';
import { missingEmergencyCalcs } from './missing-emergency';
import { missingCardioPulmCalcs } from './missing-cardio-pulm';
import { missingGiLiverCalcs } from './missing-gi-liver';
import { missingNeuroPsychCalcs } from './missing-neuro-psych';
import { missingHemeIdNephroCalcs } from './missing-heme-id-nephro';
import { missingPedsObToxCalcs } from './missing-peds-ob-tox';
import { wave2OrthoTraumaCalcs } from './wave2-ortho-trauma';
import { wave2OncologyCalcs } from './wave2-oncology';
import { wave2CardiologyCalcs } from './wave2-cardiology';
import { wave2PulmIdCalcs } from './wave2-pulm-id';
import { wave2NeuroPsychCalcs } from './wave2-neuro-psych';
import { wave2GeneralLabCalcs } from './wave2-general-lab';
import { wave3EmSurgeryCalcs } from './wave3-em-surgery';
import { wave3CardioVascCalcs } from './wave3-cardio-vasc';
import { wave3GiHepCalcs } from './wave3-gi-hep';
import { wave3PedsObCalcs } from './wave3-peds-ob';
import { wave3ToxEndoHemeCalcs } from './wave3-tox-endo-heme';
import { wave3NephroIcuCalcs } from './wave3-nephro-icu';
import { wave4IcuVentCalcs } from './wave4-icu-vent';
import { wave4HemeOncCalcs } from './wave4-heme-onc';
import { wave4NeuroPsychCalcs } from './wave4-neuro-psych';
import { wave4PrimaryEndoCalcs } from './wave4-primary-endo';
import { wave4FormulasCalcs } from './wave4-formulas';
import { wave4EmIdCalcs } from './wave4-em-id';
import { wave5SurgUroEntCalcs } from './wave5-surg-uro-ent';
import { wave5CardioCalcs } from './wave5-cardio';
import { wave5PedsIdCalcs } from './wave5-peds-id';
import { wave5ToxPsychCalcs } from './wave5-tox-psych';
import { wave5NephroGiCalcs } from './wave5-nephro-gi';
import { wave5GeneralMiscCalcs } from './wave5-general-misc';
import { wave6PsychSleepCalcs } from './wave6-psych-sleep';
import { wave6ClinicalResidualCalcs } from './wave6-clinical-residual';
import { wave6ScoresResidualCalcs } from './wave6-scores-residual';
import { wave6EmPedsCalcs } from './wave6-em-peds';
import { wave6HemeOncCalcs } from './wave6-heme-onc';
import { wave6FormulasMiscCalcs } from './wave6-formulas-misc';
import { wave7PreventionCalcs } from './wave7-prevention';
import { wave7RheumClassCalcs } from './wave7-rheum-class';
import { wave7RheumActivityCalcs } from './wave7-rheum-activity';
import { wave7BedsideCalcs } from './wave7-bedside';
import { wave7HighuseCalcs } from './wave7-highuse';
import { wave7FillinsCalcs } from './wave7-fillins';
import { wave8EmStaplesCalcs } from './wave8-em-staples';
import { wave8EmCardioAirwayCalcs } from './wave8-em-cardio-airway';
import { wave8CardiologyCalcs } from './wave8-cardiology';
import { wave8NeuroStrokeCalcs } from './wave8-neuro-stroke';
import { wave8NeuroGeneralCalcs } from './wave8-neuro-general';
import { wave8PsychCalcs } from './wave8-psych';
import { wave8HemeOncCalcs } from './wave8-heme-onc';
import { wave8TransfusionCardioOncCalcs } from './wave8-transfusion-cardioonc';
import { wave8LiverCalcs } from './wave8-liver';
import { wave8GiCalcs } from './wave8-gi';
import { wave8NephroMetabolicCalcs } from './wave8-nephro-metabolic';
import { wave8EndoNutritionCalcs } from './wave8-endo-nutrition';
import { wave8PedsObCalcs } from './wave8-peds-ob';
import { wave8PulmIcuCalcs } from './wave8-pulm-icu';
import { wave8TraumaOrthoCalcs } from './wave8-trauma-ortho';
import { wave8IdGeriCalcs } from './wave8-id-geri';
import { wave8MiscScreeningCalcs } from './wave8-misc-screening';

export const calculators: Calculator[] = [
  ...cardiologyCalcs,
  ...criticalCareCalcs,
  ...nephrologyEndoCalcs,
  ...giNeuroPsychCalcs,
  ...emergencyMiscCalcs,
  ...extraCalcs,
  ...missingEmergencyCalcs,
  ...missingCardioPulmCalcs,
  ...missingGiLiverCalcs,
  ...missingNeuroPsychCalcs,
  ...missingHemeIdNephroCalcs,
  ...missingPedsObToxCalcs,
  ...wave2OrthoTraumaCalcs,
  ...wave2OncologyCalcs,
  ...wave2CardiologyCalcs,
  ...wave2PulmIdCalcs,
  ...wave2NeuroPsychCalcs,
  ...wave2GeneralLabCalcs,
  ...wave3EmSurgeryCalcs,
  ...wave3CardioVascCalcs,
  ...wave3GiHepCalcs,
  ...wave3PedsObCalcs,
  ...wave3ToxEndoHemeCalcs,
  ...wave3NephroIcuCalcs,
  ...wave4IcuVentCalcs,
  ...wave4HemeOncCalcs,
  ...wave4NeuroPsychCalcs,
  ...wave4PrimaryEndoCalcs,
  ...wave4FormulasCalcs,
  ...wave4EmIdCalcs,
  ...wave5SurgUroEntCalcs,
  ...wave5CardioCalcs,
  ...wave5PedsIdCalcs,
  ...wave5ToxPsychCalcs,
  ...wave5NephroGiCalcs,
  ...wave5GeneralMiscCalcs,
  ...wave6PsychSleepCalcs,
  ...wave6ClinicalResidualCalcs,
  ...wave6ScoresResidualCalcs,
  ...wave6EmPedsCalcs,
  ...wave6HemeOncCalcs,
  ...wave6FormulasMiscCalcs,
  ...wave7PreventionCalcs,
  ...wave7RheumClassCalcs,
  ...wave7RheumActivityCalcs,
  ...wave7BedsideCalcs,
  ...wave7HighuseCalcs,
  ...wave7FillinsCalcs,
  ...wave8EmStaplesCalcs,
  ...wave8EmCardioAirwayCalcs,
  ...wave8CardiologyCalcs,
  ...wave8NeuroStrokeCalcs,
  ...wave8NeuroGeneralCalcs,
  ...wave8PsychCalcs,
  ...wave8HemeOncCalcs,
  ...wave8TransfusionCardioOncCalcs,
  ...wave8LiverCalcs,
  ...wave8GiCalcs,
  ...wave8NephroMetabolicCalcs,
  ...wave8EndoNutritionCalcs,
  ...wave8PedsObCalcs,
  ...wave8PulmIcuCalcs,
  ...wave8TraumaOrthoCalcs,
  ...wave8IdGeriCalcs,
  ...wave8MiscScreeningCalcs,
];

assertUniqueCalculatorIds(calculators);

export function getCalculator(id: string): Calculator | undefined {
  return calculators.find((c) => c.id === id);
}

function scoreTerm(c: Calculator, term: string): number {
  const name = c.name.toLowerCase();
  const short = c.shortName.toLowerCase();
  if (name === term || short === term) return 100;
  if (name.startsWith(term) || short.startsWith(term)) return 60;
  if (name.includes(term) || short.includes(term)) return 40;
  const tags = c.tags.map((t) => t.toLowerCase());
  if (tags.some((t) => t === term)) return 30;
  if (tags.some((t) => t.startsWith(term))) return 20;
  if (tags.some((t) => t.includes(term))) return 15;
  if (c.description.toLowerCase().includes(term) || c.category.includes(term)) return 5;
  return 0;
}

export function searchCalculators(query: string): Calculator[] {
  const q = query.trim().toLowerCase();
  if (!q) return calculators;
  const terms = q.split(/\s+/);
  return calculators
    .map((c) => {
      const hay = [c.name, c.shortName, c.description, c.category, ...c.tags].join(' ').toLowerCase();
      if (!hay.includes(q) && !terms.every((term) => hay.includes(term))) return null;
      let score = terms.reduce((sum, term) => sum + scoreTerm(c, term), 0);
      if (hay.includes(q)) score += 10;
      if (c.status && c.status !== 'current') score -= 50;
      return { c, score };
    })
    .filter((entry): entry is { c: Calculator; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.c);
}

export function getByCategory(categoryId: string): Calculator[] {
  return calculators.filter((c) => c.category === categoryId);
}
