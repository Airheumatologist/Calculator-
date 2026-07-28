export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'info' | 'normal';

export type InputType = 'number' | 'select' | 'boolean' | 'segmented';

export interface CalcOption {
  label: string;
  value: string | number | boolean;
  points?: number;
  description?: string;
}

export interface CalcInput {
  id: string;
  label: string;
  type: InputType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number | string | boolean;
  options?: CalcOption[];
  helpText?: string;
  placeholder?: string;
  required?: boolean;
}

export interface CalcResult {
  score: number | string;
  unit?: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details?: { label: string; value: string }[];
  recommendations?: string[];
}

export interface EvidenceRef {
  title: string;
  citation: string;
  year?: number;
  /** PubMed ID — rendered as https://pubmed.ncbi.nlm.nih.gov/{pmid}/ */
  pmid?: string;
  /** DOI without URL prefix — rendered as https://doi.org/{doi} */
  doi?: string;
  /** Optional direct URL for guidelines, monographs, or non-PubMed sources */
  url?: string;
}

export interface NextStep {
  condition: string;
  actions: string[];
}

export interface Calculator {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: CategoryId;
  tags: string[];
  whenToUse: string;
  whyUse: string;
  inputs: CalcInput[];
  calculate: (values: Record<string, number | string | boolean | null>) => CalcResult;
  evidence: {
    summary: string;
    formula?: string;
    validation: string;
    references: EvidenceRef[];
  };
  nextSteps: NextStep[];
  pearls?: string[];
}

export type CategoryId =
  | 'cardiology'
  | 'pulmonary'
  | 'critical-care'
  | 'nephrology'
  | 'gastroenterology'
  | 'neurology'
  | 'hematology'
  | 'infectious-disease'
  | 'endocrinology'
  | 'emergency'
  | 'pediatrics'
  | 'obstetrics'
  | 'psychiatry'
  | 'orthopedics'
  | 'rheumatology'
  | 'dermatology'
  | 'urology'
  | 'surgery'
  | 'otolaryngology'
  | 'ophthalmology'
  | 'geriatrics'
  | 'general'
  | 'toxicology'
  | 'oncology';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'cardiology', name: 'Cardiology', description: 'Risk scores, ACS, heart failure, AF', icon: '❤️', color: '#e11d48' },
  { id: 'pulmonary', name: 'Pulmonary', description: 'PE, pneumonia, COPD, sleep', icon: '🫁', color: '#0ea5e9' },
  { id: 'critical-care', name: 'Critical Care', description: 'Sepsis, severity, ICU scores', icon: '🏥', color: '#dc2626' },
  { id: 'nephrology', name: 'Nephrology', description: 'GFR, electrolytes, AKI', icon: '🫘', color: '#8b5cf6' },
  { id: 'gastroenterology', name: 'GI / Hepatology', description: 'Bleed risk, liver, pancreatitis', icon: '🟠', color: '#f59e0b' },
  { id: 'neurology', name: 'Neurology', description: 'Stroke, GCS, seizure risk', icon: '🧠', color: '#6366f1' },
  { id: 'hematology', name: 'Hematology', description: 'VTE, HIT, bleeding risk', icon: '🩸', color: '#be123c' },
  { id: 'infectious-disease', name: 'Infectious Disease', description: 'Sepsis, pharyngitis, criteria', icon: '🦠', color: '#16a34a' },
  { id: 'endocrinology', name: 'Endocrinology', description: 'Diabetes, thyroid, BMI', icon: '⚗️', color: '#0891b2' },
  { id: 'rheumatology', name: 'Rheumatology', description: 'RA, SpA, lupus, gout, activity scores', icon: '💪', color: '#a16207' },
  { id: 'dermatology', name: 'Dermatology', description: 'Psoriasis, eczema, SJS/TEN severity', icon: '🩹', color: '#db2777' },
  { id: 'emergency', name: 'Emergency Medicine', description: 'Trauma, decision rules, triage', icon: '🚑', color: '#ea580c' },
  { id: 'pediatrics', name: 'Pediatrics', description: 'Pediatric scores and dosing', icon: '👶', color: '#ec4899' },
  { id: 'obstetrics', name: 'OB / GYN', description: 'Pregnancy and labor scores', icon: '🤰', color: '#d946ef' },
  { id: 'psychiatry', name: 'Psychiatry', description: 'Depression, anxiety, substance', icon: '🧘', color: '#7c3aed' },
  { id: 'orthopedics', name: 'Ortho / MSK', description: 'Ottawa rules, fractures', icon: '🦴', color: '#78716c' },
  { id: 'surgery', name: 'Surgery / Anesthesia', description: 'Periop risk, complications, recovery', icon: '🔪', color: '#0f766e' },
  { id: 'urology', name: 'Urology', description: 'Prostate, stones, voiding scores', icon: '🚽', color: '#0284c7' },
  { id: 'otolaryngology', name: 'ENT', description: 'Sinonasal, voice, hearing scores', icon: '👂', color: '#c026d3' },
  { id: 'ophthalmology', name: 'Ophthalmology', description: 'IOP, acuity, vision scoring', icon: '👁️', color: '#4f46e5' },
  { id: 'geriatrics', name: 'Geriatrics', description: 'Frailty, falls, nutrition risk', icon: '🧓', color: '#64748b' },
  { id: 'general', name: 'General / Fluids', description: 'BSA, fluids, conversions, stats', icon: '📐', color: '#475569' },
  { id: 'toxicology', name: 'Toxicology', description: 'Overdose and poisoning', icon: '☠️', color: '#65a30d' },
  { id: 'oncology', name: 'Oncology', description: 'Cancer risk and staging aids', icon: '🎗️', color: '#9333ea' },
];
