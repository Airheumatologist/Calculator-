import type { Calculator } from '../../types/calculator';
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
];

// Ensure unique IDs
const seen = new Set<string>();
for (const c of calculators) {
  if (seen.has(c.id)) {
    console.warn(`Duplicate calculator id: ${c.id}`);
  }
  seen.add(c.id);
}

export function getCalculator(id: string): Calculator | undefined {
  return calculators.find((c) => c.id === id);
}

export function searchCalculators(query: string): Calculator[] {
  const q = query.trim().toLowerCase();
  if (!q) return calculators;
  return calculators.filter((c) => {
    const hay = [c.name, c.shortName, c.description, c.category, ...c.tags].join(' ').toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((term) => hay.includes(term));
  });
}

export function getByCategory(categoryId: string): Calculator[] {
  return calculators.filter((c) => c.category === categoryId);
}
