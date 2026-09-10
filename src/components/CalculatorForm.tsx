import type { KeyboardEvent } from 'react';
import type { CalcInput, CalcOption } from '../types/calculator';
import {
  getRangeViolations,
  getStepViolations,
  isMissingValue,
  rangeViolationMessage,
  stepViolationMessage,
} from '../utils/helpers';

type Values = Record<string, number | string | boolean | null>;

interface Props {
  inputs: CalcInput[];
  values: Values;
  onChange: (id: string, value: number | string | boolean | null) => void;
  onReset: () => void;
}

function numberFieldError(
  input: CalcInput,
  value: number | string | boolean | null
): string | null {
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
  onSelect: (value: CalcOption['value']) => void;
}

/**
 * Radio semantics (radiogroup / radio / aria-checked) with a roving tabindex:
 * these controls are mutually exclusive single-choice lists, which aria-pressed
 * toggle buttons cannot express. Native <button> elements are kept so
 * Enter/Space still activate, and arrow keys move selection like real radios.
 */
function OptionGroup({ className, labelledBy, options, selectedIndex, onSelect }: OptionGroupProps) {
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = ARROW_NEXT.includes(e.key);
    const backward = ARROW_PREV.includes(e.key);
    if (!forward && !backward) return;
    e.preventDefault();
    const next =
      (focusIndex + (forward ? 1 : -1) + options.length) % options.length;
    onSelect(options[next].value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[next]?.focus();
  }

  return (
    <div className={className} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={handleKeyDown}>
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
            onClick={() => onSelect(opt.value)}
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

export function CalculatorForm({ inputs, values, onChange, onReset }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        Inputs
        <button type="button" className="reset-btn" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="panel-body">
        {inputs.map((input) => {
          const value = values[input.id] ?? null;
          const fieldError = input.type === 'number' ? numberFieldError(input, value) : null;
          const incomplete =
            input.type === 'number' && !fieldError && input.required === true && isMissingValue(value, true);

          const labelId = domId(input.id, 'label');
          const fieldId = domId(input.id, 'field');
          const helpId = domId(input.id, 'help');
          const errorId = domId(input.id, 'error');
          const describedBy = [input.helpText ? helpId : null, fieldError || incomplete ? errorId : null]
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
                      required={input.required}
                      aria-invalid={fieldError ? true : incomplete ? true : undefined}
                      aria-describedby={describedBy || undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(input.id, v === '' ? null : Number(v));
                      }}
                    />
                    {input.unit && <span className="unit">{input.unit}</span>}
                  </div>
                  {fieldError && (
                    <p className="input-error" id={errorId}>
                      {fieldError}
                    </p>
                  )}
                  {incomplete && (
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
                  selectedIndex={value === true ? 1 : value === false ? 0 : -1}
                  onSelect={(v) => onChange(input.id, v as boolean)}
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
                  selectedIndex={input.options.findIndex((o) => o.value === value)}
                  onSelect={(v) => onChange(input.id, v as number | string | boolean)}
                  options={input.options.map((opt) => ({
                    key: String(opt.value),
                    label: opt.label,
                    description: opt.description,
                    points: opt.points,
                    value: opt.value,
                  }))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
