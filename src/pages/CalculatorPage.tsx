import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCalculator } from '../data/calculators';
import { CATEGORIES } from '../types/calculator';
import { CalculatorForm } from '../components/CalculatorForm';
import { LiveResult } from '../components/LiveResult';
import { EvidencePanel } from '../components/EvidencePanel';
import { NextStepsPanel } from '../components/NextStepsPanel';
import {
  getMissingRequiredInputs,
  getRangeViolations,
  getStepViolations,
  incompleteResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../utils/helpers';

function initialValues(calc: ReturnType<typeof getCalculator>) {
  const values: Record<string, number | string | boolean | null> = {};
  if (!calc) return values;
  for (const input of calc.inputs) {
    if (input.defaultValue !== undefined) {
      values[input.id] = input.defaultValue;
    } else if (input.type === 'boolean') {
      values[input.id] = false;
    } else if (input.type === 'select' || input.type === 'segmented') {
      values[input.id] = input.options?.[0]?.value ?? null;
    } else {
      values[input.id] = null;
    }
  }
  return values;
}

export function CalculatorPage() {
  const { id } = useParams();
  const calcId = id ?? '';
  const calc = getCalculator(calcId);
  const [formState, setFormState] = useState(() => ({ calcId, values: initialValues(calc) }));
  const [tab, setTab] = useState<'evidence' | 'next'>('next');

  // Derive-on-render reset: an effect would leave one render (and one
  // calculate() call) pairing the new calculator with the previous values.
  let values = formState.values;
  if (formState.calcId !== calcId) {
    values = initialValues(calc);
    setFormState({ calcId, values });
    setTab('next');
  }

  const missingRequired = useMemo(
    () => (calc ? getMissingRequiredInputs(calc.inputs, values) : []),
    [calc, values]
  );

  const rangeViolations = useMemo(
    () => (calc ? getRangeViolations(calc.inputs, values) : []),
    [calc, values]
  );

  const stepViolations = useMemo(
    () => (calc ? getStepViolations(calc.inputs, values) : []),
    [calc, values]
  );

  const result = useMemo(() => {
    if (!calc) return null;
    if (missingRequired.length > 0) {
      return incompleteResult(missingRequired);
    }
    if (rangeViolations.length > 0) {
      return rangeBlockedResult(rangeViolations);
    }
    if (stepViolations.length > 0) {
      return stepBlockedResult(stepViolations);
    }
    try {
      return calc.calculate(values);
    } catch {
      return {
        score: '—',
        label: 'Incomplete',
        interpretation: 'Adjust inputs to calculate.',
        riskLevel: 'info' as const,
      };
    }
  }, [calc, values, missingRequired, rangeViolations, stepViolations]);

  if (!calc || !result) {
    return (
      <div className="empty-state">
        Calculator not found. <Link to="/">Back to home</Link>
      </div>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === calc.category);

  return (
    <>
      <div className="calc-page-header">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          {' / '}
          <Link to={`/?cat=${calc.category}`}>{cat?.name ?? calc.category}</Link>
          {' / '}
          <span>{calc.shortName}</span>
        </div>
        <h1>{calc.name}</h1>
        <p className="lede">{calc.description}</p>
      </div>

      <div className="when-why">
        <div className="panel">
          <div className="panel-body">
            <h3>When to use</h3>
            <p>{calc.whenToUse}</p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <h3>Why use</h3>
            <p>{calc.whyUse}</p>
          </div>
        </div>
      </div>

      <div className="calc-layout">
        <CalculatorForm
          inputs={calc.inputs}
          values={values}
          onChange={(inputId, value) =>
            setFormState((prev) => ({
              calcId: prev.calcId,
              values: { ...prev.values, [inputId]: value },
            }))
          }
          onReset={() => setFormState({ calcId, values: initialValues(calc) })}
        />
        <LiveResult result={result} />
      </div>

      <div className="info-tabs">
        <button type="button" className={`tab-btn ${tab === 'next' ? 'active' : ''}`} onClick={() => setTab('next')}>
          Next steps
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'evidence' ? 'active' : ''}`}
          onClick={() => setTab('evidence')}
        >
          Evidence
        </button>
      </div>

      {tab === 'next' && <NextStepsPanel calc={calc} />}
      {tab === 'evidence' && <EvidencePanel calc={calc} />}
    </>
  );
}
