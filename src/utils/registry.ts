import type { Calculator } from '../types/calculator';
import { CATEGORIES } from '../types/calculator';

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

export function validateCalculator(calc: Calculator): string[] {
  const errors: string[] = [];
  const prefix = calc.id?.trim() || '(missing id)';

  if (!calc.id?.trim()) errors.push('missing calculator id');
  if (!calc.name?.trim()) errors.push(`${prefix}: missing name`);
  if (!calc.shortName?.trim()) errors.push(`${prefix}: missing shortName`);
  if (!calc.description?.trim()) errors.push(`${prefix}: missing description`);
  if (!CATEGORY_IDS.has(calc.category)) errors.push(`${prefix}: invalid category ${String(calc.category)}`);
  if (!Array.isArray(calc.inputs) || calc.inputs.length === 0) {
    errors.push(`${prefix}: calculator must declare at least one input`);
  }
  if (!calc.evidence?.references?.length) {
    errors.push(`${prefix}: at least one evidence reference is required`);
  }
  if (!calc.nextSteps?.length) {
    errors.push(`${prefix}: at least one next-steps block is required`);
  }
  for (const [index, step] of (calc.nextSteps ?? []).entries()) {
    if (!step.condition?.trim()) errors.push(`${prefix}: nextSteps[${index}] missing condition`);
    if (!step.actions?.length || step.actions.some((action) => !action.trim())) {
      errors.push(`${prefix}: nextSteps[${index}] must have non-empty actions`);
    }
  }

  const inputIds = new Set<string>();
  for (const input of calc.inputs ?? []) {
    if (!input.id?.trim()) {
      errors.push(`${prefix}: input missing id`);
      continue;
    }
    if (inputIds.has(input.id)) errors.push(`${prefix}: duplicate input id ${input.id}`);
    inputIds.add(input.id);
    if (!input.label?.trim()) errors.push(`${prefix}: input ${input.id} missing label`);

    if (input.min !== undefined && input.max !== undefined && input.min > input.max) {
      errors.push(`${prefix}: input ${input.id} has min > max`);
    }
    if (input.step !== undefined && !(input.step > 0)) {
      errors.push(`${prefix}: input ${input.id} step must be positive`);
    }
    if (input.defaultValue !== undefined) {
      errors.push(`${prefix}: input ${input.id} defines forbidden patient defaultValue; use exampleValue`);
    }
    if (input.exampleValue !== undefined && input.type === 'number' && typeof input.exampleValue !== 'number') {
      errors.push(`${prefix}: input ${input.id} exampleValue must be a number`);
    }
    if (input.exampleValue !== undefined && input.type === 'boolean' && typeof input.exampleValue !== 'boolean') {
      errors.push(`${prefix}: input ${input.id} exampleValue must be boolean`);
    }
    if (typeof input.exampleValue === 'number') {
      if (!Number.isFinite(input.exampleValue)) errors.push(`${prefix}: input ${input.id} exampleValue must be finite`);
      if (input.min !== undefined && input.exampleValue < input.min) {
        errors.push(`${prefix}: input ${input.id} exampleValue below min`);
      }
      if (input.max !== undefined && input.exampleValue > input.max) {
        errors.push(`${prefix}: input ${input.id} exampleValue above max`);
      }
    }
    if (input.type === 'select' || input.type === 'segmented') {
      if (!input.options?.length) {
        errors.push(`${prefix}: input ${input.id} has no options`);
      } else if (
        input.exampleValue !== undefined &&
        !input.options.some((option) => option.value === input.exampleValue)
      ) {
        errors.push(`${prefix}: input ${input.id} exampleValue is not in options`);
      }
    }
  }

  const questionnaire = calc.questionnaire && typeof calc.questionnaire === 'object' ? calc.questionnaire : undefined;
  if (questionnaire?.modeInputId && !inputIds.has(questionnaire.modeInputId)) {
    errors.push(`${prefix}: questionnaire.modeInputId ${questionnaire.modeInputId} is not an input`);
  }
  const modeInput = questionnaire?.modeInputId
    ? (calc.inputs ?? []).find((input) => input.id === questionnaire.modeInputId)
    : undefined;
  if (questionnaire?.modeInputId && modeInput && modeInput.type !== 'select' && modeInput.type !== 'segmented') {
    errors.push(`${prefix}: questionnaire.modeInputId ${questionnaire.modeInputId} must be a select or segmented input`);
  }
  const directModeValues = (questionnaire?.directModeValues ?? []).map(String);
  if (questionnaire?.modeInputId && directModeValues.length > 0) {
    const covered = (value: string) =>
      Boolean(questionnaire.directInputIds?.length) ||
      Boolean(questionnaire.activeInputIdsByMode?.[value]?.length);
    for (const value of directModeValues) {
      const declaredOption = modeInput?.options?.some((option) => String(option.value) === value);
      if (!declaredOption) {
        errors.push(`${prefix}: questionnaire.directModeValues contains ${value}, which is not an option of ${questionnaire.modeInputId}`);
      }
      if (!covered(value)) {
        errors.push(
          `${prefix}: questionnaire mode ${questionnaire.modeInputId}=${value} must declare directInputIds or activeInputIdsByMode["${value}"]`
        );
      }
    }
  }
  if (!questionnaire?.modeInputId) {
    // A survey/precomputed selector must be declared explicitly; the engine no
    // longer infers the branch from input ids or labels.
    const DIRECT_VALUES = new Set(['direct', 'override', 'precomputed']);
    const implicitMode = (calc.inputs ?? []).find(
      (input) =>
        input.type === 'select' &&
        Boolean(input.options?.some((option) => typeof option.value === 'string' && DIRECT_VALUES.has(option.value.toLowerCase()))) &&
        Boolean(input.options?.some((option) => !(typeof option.value === 'string' && DIRECT_VALUES.has(option.value.toLowerCase()))))
    );
    if (implicitMode) {
      errors.push(
        `${prefix}: input ${implicitMode.id} looks like a survey/precomputed branch selector; declare calculator.questionnaire.modeInputId explicitly`
      );
    }
  }
  for (const id of questionnaire?.directInputIds ?? []) {
    if (!inputIds.has(id)) errors.push(`${prefix}: questionnaire.directInputIds contains unknown id ${id}`);
  }
  for (const [mode, ids] of Object.entries(questionnaire?.activeInputIdsByMode ?? {})) {
    for (const id of ids) {
      if (!inputIds.has(id)) {
        errors.push(`${prefix}: questionnaire.activeInputIdsByMode[${mode}] contains unknown id ${id}`);
      }
    }
  }
  if (calc.supersededBy && !calc.supersededBy.trim()) {
    errors.push(`${prefix}: supersededBy must be a non-empty calculator id`);
  }

  return errors;
}

export function validateRegistry(calcs: Calculator[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  for (const calc of calcs) {
    errors.push(...validateCalculator(calc));
    seen.set(calc.id, (seen.get(calc.id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) errors.push(`duplicate calculator id: ${id} (${count} copies)`);
  }
  const ids = new Set(calcs.map((calc) => calc.id));
  for (const calc of calcs) {
    if (calc.supersededBy && !ids.has(calc.supersededBy)) {
      errors.push(`${calc.id}: supersededBy ${calc.supersededBy} is not a registered calculator`);
    }
  }
  return errors;
}

const EDUCATIONAL_MARKER = /style|simplified|educational/i;
const UNQUALIFIED_CLAIM = /\b(validated|official|recommended)\b/i;
const CLAIM_QUALIFIER =
  /\b(not|never|unvalidated|educational|approximation|style|simplified|don't|licensed|PediTools|published)\b|\b(do not|not the|the official|run official|open official|use official|prefer validated|use a validated|use a complete validated|for teaching|this simplification|this helper|this module|this educational|full item|confirm)\b|\bofficial\s+\S+|original.{0,80}validated/i;

function educationalMarkerText(calc: Calculator): string {
  return `${calc.id} ${calc.name} ${calc.shortName} ${calc.status ?? ''} ${(calc.tags ?? []).join(' ')}`;
}

export function isEducationalApproximation(calc: Calculator): boolean {
  return calc.status === 'educational' || EDUCATIONAL_MARKER.test(educationalMarkerText(calc));
}

export function educationalClaimIssues(calc: Calculator): string[] {
  if (!isEducationalApproximation(calc)) return [];
  const blobs = [
    calc.name,
    calc.description,
    calc.whenToUse,
    calc.whyUse,
    calc.evidence.summary,
    calc.evidence.validation,
    calc.evidence.formula ?? '',
    ...(calc.pearls ?? []),
    ...calc.nextSteps.flatMap((step) => [step.condition, ...step.actions]),
  ];
  const issues: string[] = [];
  for (const text of blobs) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (UNQUALIFIED_CLAIM.test(sentence) && !CLAIM_QUALIFIER.test(sentence)) {
        issues.push(`${calc.id}: unqualified claim in "${sentence.slice(0, 120)}"`);
      }
    }
  }
  return issues;
}

export function assertUniqueCalculatorIds(calcs: Calculator[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const calc of calcs) {
    if (seen.has(calc.id)) duplicates.add(calc.id);
    seen.add(calc.id);
  }
  if (duplicates.size > 0) {
    throw new Error(`Duplicate calculator id(s): ${[...duplicates].join(', ')}`);
  }
}
