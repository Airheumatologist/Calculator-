import type { KeyboardEvent } from 'react';
import type { CalcInput, CalcOption } from '../types/calculator';
import {
  getRangeViolations,
  getStepViolations,
  isMissingValue,
  isRequiredInput,
  rangeViolationMessage,
  stepViolationMessage,
} from '../utils/helpers';
import { getCanonicalValue, getUnitOptions, unitInputId } from '../utils/units';

type Values = Record<string, number | string | boolean | null>;

interface Props {
  inputs: CalcInput[];
  values: Values;
  onChange: (id: string, value: number | string | boolean | null, optionIndex?: number) => void;
  onReset: () => void;
  onLoadExample: () => void;
  /** IDs that are relevant to the currently selected questionnaire branch. */
  activeInputIds?: string[];
  /** Active inputs currently missing an explicit answer. */
  missingInputIds?: string[];
  /** Keeps duplicate-valued options visually distinct without changing values. */
  selectedOptionIndices?: Record<string, number>;
}

function numberFieldError(input: CalcInput, values: Values): string | null {
  const value = input.unitKind ? getCanonicalValue(input, values) : (values[input.id] ?? null);
  const [violation] = getRangeViolations([input], { [input.id]: value });
  if (violation) return rangeViolationMessage(violation.direction);
  const [stepViolation] = getStepViolations([input], { [input.id]: value });
  if (stepViolation) return stepViolationMessage(stepViolation);
  return null;
}

/** Stable, unique, CSS/HTML-safe id prefix derived from the input id. */
function domId(inputId: string, suffix: string): string {
  return `calc-${inputId.replace(/[^a-zA-Z0-9_-]/g, '-')}-${suffix}`;
}

const ARROW_NEXT = ['ArrowDown', 'ArrowRight'];
const ARROW_PREV = ['ArrowUp', 'ArrowLeft'];

interface OptionGroupProps {
  className: string;
  labelledBy: string;
  options: { key: string; label: string; description?: string; points?: number; value: CalcOption['value'] }[];
  selectedIndex: number;
  onSelect: (value: CalcOption['value'], index: number) => void;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
}

/**
 * Radio semantics (radiogroup / radio / aria-checked) with a roving tabindex:
 * these controls are mutually exclusive single-choice lists, which aria-pressed
 * toggle buttons cannot express. Native <button> elements are kept so
 * Enter/Space still activate, and arrow keys move selection like real radios.
 */
function OptionGroup({
  className,
  labelledBy,
  options,
  selectedIndex,
  onSelect,
  describedBy,
  invalid,
  required,
}: OptionGroupProps) {
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = ARROW_NEXT.includes(e.key);
    const backward = ARROW_PREV.includes(e.key);
    if (!forward && !backward) return;
    if (options.length === 0) return;
    e.preventDefault();
    const next =
      (focusIndex + (forward ? 1 : -1) + options.length) % options.length;
    onSelect(options[next].value, next);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[next]?.focus();
  }

  return (
    <div
      className={className}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy || undefined}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt, i) => {
        const selected = i === selectedIndex;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === focusIndex ? 0 : -1}
            className={`option-btn ${selected ? 'selected' : ''}`}
            onClick={() => onSelect(opt.value, i)}
          >
            <span className="option-radio" />
            <span className="option-text">
              <strong>{opt.label}</strong>
              {opt.description && <small>{opt.description}</small>}
            </span>
            {opt.points !== undefined && (
              <span className="points-chip">
                {opt.points > 0 ? `+${opt.points}` : opt.points}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface UnitToggleProps {
  inputId: string;
  label: string;
  options: { value: string; label: string; description: string }[];
  selected?: string;
  invalid?: boolean;
  onSelect: (value: string) => void;
}

/**
 * Inline unit selector for unit-aware number fields. Same radio semantics as
 * `OptionGroup`, sized to sit inside the number row.
 */
function UnitToggle({ inputId, label, options, selected, invalid, onSelect }: UnitToggleProps) {
  const ids = options.map((option) => domId(inputId, `unit-${option.value.replace(/[^a-zA-Z0-9]/g, '-')}`));
  const focusIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected)
  );

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = ARROW_NEXT.includes(e.key);
    const backward = ARROW_PREV.includes(e.key);
    if ((!forward && !backward) || options.length === 0) return;
    e.preventDefault();
    const next = (focusIndex + (forward ? 1 : -1) + options.length) % options.length;
    onSelect(options[next].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      className="unit-toggle"
      role="radiogroup"
      aria-label={`${label} units`}
      aria-invalid={invalid || undefined}
      aria-required
      onKeyDown={handleKeyDown}
    >
      {options.map((option, i) => {
        const isSelected = option.value === selected;
        return (
          <button
            key={option.value}
            id={ids[i]}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.description}
            tabIndex={i === focusIndex ? 0 : -1}
            className={`unit-btn ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CalculatorForm({
  inputs,
  values,
  onChange,
  onReset,
  onLoadExample,
  activeInputIds,
  missingInputIds,
  selectedOptionIndices,
}: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        Inputs
        <div className="form-actions">
          <button type="button" className="example-btn" onClick={onLoadExample}>
            Load example
          </button>
          <button type="button" className="reset-btn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
      <div className="panel-body">
        {inputs.map((input) => {
          const value = values[input.id] ?? null;
          const isActive = activeInputIds ? activeInputIds.includes(input.id) : true;
          const fieldError = isActive && input.type === 'number' ? numberFieldError(input, values) : null;
          const unitOptions = input.unitKind ? getUnitOptions(input.unitKind) : [];
          const unitChoice = input.unitKind ? String(values[unitInputId(input.id)] ?? '') : '';
          const unitSelected = unitOptions.find((option) => option.value === unitChoice);
          const unitIncomplete = Boolean(
            isActive &&
              input.unitKind &&
              !isMissingValue(value, true) &&
              !unitSelected &&
              (missingInputIds
                ? missingInputIds.includes(unitInputId(input.id))
                : isRequiredInput(input))
          );
          const incomplete = isActive && !fieldError && (
            missingInputIds
              ? missingInputIds.includes(input.id)
              : isRequiredInput(input) && isMissingValue(value, input.type === 'number')
          );

          const labelId = domId(input.id, 'label');
          const fieldId = domId(input.id, 'field');
          const helpId = domId(input.id, 'help');
          const errorId = domId(input.id, 'error');
          const describedBy = [
            input.helpText ? helpId : null,
            fieldError || incomplete || unitIncomplete ? errorId : null,
          ]
            .filter(Boolean)
            .join(' ');

          const labelContent = (
            <>
              <strong>{input.label}</strong>
              {input.helpText && <small id={helpId}>{input.helpText}</small>}
            </>
          );

          return (
            <div
              className={`input-group${fieldError ? ' has-error' : ''}${incomplete ? ' is-incomplete' : ''}`}
              key={input.id}
            >
              {input.type === 'number' ? (
                <label className="input-label" id={labelId} htmlFor={fieldId}>
                  {labelContent}
                </label>
              ) : (
                <div className="input-label" id={labelId}>
                  {labelContent}
                </div>
              )}

              {input.type === 'number' && (
                <>
                  <div className="number-row">
                    <input
                      id={fieldId}
                      type="number"
                      className={fieldError ? 'input-invalid' : incomplete ? 'input-incomplete' : undefined}
                      value={value === null ? '' : String(value)}
                      min={input.min}
                      max={input.max}
                      step={input.step ?? 1}
                      placeholder={input.placeholder}
                      required={input.required || incomplete}
                      aria-invalid={fieldError ? true : incomplete ? true : undefined}
                      aria-describedby={describedBy || undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(input.id, v === '' ? null : Number(v));
                      }}
                    />
                    {input.unitKind ? (
                      <UnitToggle
                        inputId={input.id}
                        label={input.label}
                        options={unitOptions.map(({ value: optionValue, label, description }) => ({
                          value: optionValue,
                          label,
                          description,
                        }))}
                        selected={unitSelected?.value}
                        invalid={unitIncomplete}
                        onSelect={(optionValue) => onChange(unitInputId(input.id), optionValue)}
                      />
                    ) : (
                      input.unit && <span className="unit">{input.unit}</span>
                    )}
                  </div>
                  {fieldError && (
                    <p className="input-error" id={errorId}>
                      {fieldError}
                    </p>
                  )}
                  {unitIncomplete && (
                    <p className="input-hint-required" id={errorId}>
                      Select units for {input.label}
                    </p>
                  )}
                  {incomplete && !unitIncomplete && (
                    <p className="input-hint-required" id={errorId}>
                      Required
                    </p>
                  )}
                </>
              )}

              {input.type === 'boolean' && (
                <OptionGroup
                  className="bool-toggle"
                  labelledBy={labelId}
                  describedBy={describedBy}
                  invalid={Boolean(fieldError || incomplete)}
                  required={Boolean(input.required === true || incomplete)}
                  selectedIndex={(() => {
                    const preferred = selectedOptionIndices?.[input.id];
                    const options = [false, true];
                    return preferred !== undefined && options[preferred] === value
                      ? preferred
                      : value === true
                        ? 1
                        : value === false
                          ? 0
                          : -1;
                  })()}
                  onSelect={(v, index) => onChange(input.id, v as boolean, index)}
                  options={[false, true].map((val) => {
                    const opt = input.options?.find((o) => o.value === val);
                    return {
                      key: String(val),
                      label: opt?.label ?? (val ? 'Yes' : 'No'),
                      points: val ? opt?.points : undefined,
                      value: val,
                    };
                  })}
                />
              )}

              {(input.type === 'select' || input.type === 'segmented') && input.options && (
                <OptionGroup
                  className="option-list"
                  labelledBy={labelId}
                  describedBy={describedBy}
                  invalid={Boolean(fieldError || incomplete)}
                  required={Boolean(input.required === true || incomplete)}
                  selectedIndex={(() => {
                    const preferred = selectedOptionIndices?.[input.id];
                    return preferred !== undefined && input.options?.[preferred]?.value === value
                      ? preferred
                      : input.options.findIndex((o) => o.value === value);
                  })()}
                  onSelect={(v, index) => onChange(input.id, v as number | string | boolean, index)}
                  options={input.options.map((opt, i) => ({
                    key: `${input.id}-${i}`,
                    label: opt.label,
                    description: opt.description,
                    points: opt.points,
                    value: opt.value,
                  }))}
                />
              )}
              {incomplete && input.type !== 'number' && (
                <p className="input-hint-required" id={errorId}>
                  Required
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
