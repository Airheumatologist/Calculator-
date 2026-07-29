import type { CalcInput } from '../types/calculator';
import { getRangeViolations, rangeViolationMessage } from '../utils/helpers';

type Values = Record<string, number | string | boolean | null>;

interface Props {
  inputs: CalcInput[];
  values: Values;
  onChange: (id: string, value: number | string | boolean | null) => void;
  onReset: () => void;
}

function numberRangeError(
  input: CalcInput,
  value: number | string | boolean | null
): string | null {
  const [violation] = getRangeViolations([input], { [input.id]: value });
  if (!violation) return null;
  return rangeViolationMessage(violation.direction);
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
          const rangeError =
            input.type === 'number' ? numberRangeError(input, values[input.id] ?? null) : null;

          return (
            <div className={`input-group${rangeError ? ' has-error' : ''}`} key={input.id}>
              <div className="input-label">
                <strong>{input.label}</strong>
                {input.helpText && <small>{input.helpText}</small>}
              </div>

              {input.type === 'number' && (
                <>
                  <div className="number-row">
                    <input
                      type="number"
                      className={rangeError ? 'input-invalid' : undefined}
                      value={
                        values[input.id] === null || values[input.id] === undefined
                          ? ''
                          : String(values[input.id])
                      }
                      min={input.min}
                      max={input.max}
                      step={input.step ?? 1}
                      placeholder={input.placeholder}
                      aria-invalid={rangeError ? true : undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(input.id, v === '' ? null : Number(v));
                      }}
                    />
                    {input.unit && <span className="unit">{input.unit}</span>}
                  </div>
                  {rangeError && <p className="input-error">{rangeError}</p>}
                </>
              )}

              {input.type === 'boolean' && (
                <div className="bool-toggle">
                  {[false, true].map((val) => {
                    const opt = input.options?.find((o) => o.value === val);
                    const selected = values[input.id] === val;
                    return (
                      <button
                        key={String(val)}
                        type="button"
                        className={`option-btn ${selected ? 'selected' : ''}`}
                        onClick={() => onChange(input.id, val)}
                      >
                        <span className="option-radio" />
                        <span className="option-text">
                          <strong>{opt?.label ?? (val ? 'Yes' : 'No')}</strong>
                        </span>
                        {opt?.points !== undefined && val && (
                          <span className="points-chip">+{opt.points}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {(input.type === 'select' || input.type === 'segmented') && input.options && (
                <div className="option-list">
                  {input.options.map((opt) => {
                    const selected = values[input.id] === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        className={`option-btn ${selected ? 'selected' : ''}`}
                        onClick={() => onChange(input.id, opt.value)}
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
