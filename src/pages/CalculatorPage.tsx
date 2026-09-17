import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCalculator } from '../data/calculators';
import { CalculatorForm } from '../components/CalculatorForm';
import { LiveResult } from '../components/LiveResult';
import { EvidencePanel } from '../components/EvidencePanel';
import { NextStepsPanel } from '../components/NextStepsPanel';
import {
  calculatorErrorResult,
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getQuestionnaireModeInput,
  getRangeViolations,
  getStepViolations,
  getInitialFormValues,
  getExampleFormValues,
  incompleteResult,
  invalidSelectResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../utils/helpers';

export function CalculatorPage() {
  const { id } = useParams();
  const calcId = id ?? '';
  const calc = getCalculator(calcId);
  const [formState, setFormState] = useState(() => ({ calcId, values: getInitialFormValues(calc) }));
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'evidence' | 'next'>('next');

  let values = formState.values;
  if (formState.calcId !== calcId) {
    values = getInitialFormValues(calc);
    setFormState({ calcId, values });
    setSelectedOptionIndices({});
    setTab('next');
  }

  const activeInputs = useMemo(
    () => (calc ? getActiveQuestionnaireInputs(calc, values) : []),
    [calc, values]
  );

  const activeFormInputIds = useMemo(() => {
    const ids = new Set(activeInputs.map((input) => input.id));
    const modeInput = calc ? getQuestionnaireModeInput(calc) : undefined;
    if (modeInput) ids.add(modeInput.id);
    return [...ids];
  }, [calc, activeInputs]);

  const missingRequired = useMemo(
    () => (calc ? getMissingQuestionnaireInputs(calc, values) : []),
    [calc, values]
  );

  const rangeViolations = useMemo(
    () => (calc ? getRangeViolations(activeInputs, values) : []),
    [calc, activeInputs, values]
  );

  const stepViolations = useMemo(
    () => (calc ? getStepViolations(activeInputs, values) : []),
    [calc, activeInputs, values]
  );

  const invalidSelects = useMemo(() => {
    if (!calc) return [];
    // The questionnaire mode input is excluded from activeInputs but is still
    // a select — a stale/invalid stored mode must trip this gate too.
    const modeInput = getQuestionnaireModeInput(calc);
    const gateInputs =
      modeInput && !activeInputs.includes(modeInput) ? [...activeInputs, modeInput] : activeInputs;
    return getInvalidSelectValues(gateInputs, values);
  }, [calc, activeInputs, values]);

  const successor = calc?.supersededBy ? getCalculator(calc.supersededBy) : undefined;

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
    if (invalidSelects.length > 0) {
      return invalidSelectResult(invalidSelects);
    }
    try {
      // Unit-aware fields are converted to the canonical unit the formula
      // expects; the form keeps displaying what the user typed.
      return calc.calculate(getCanonicalValues(calc.inputs, values));
    } catch (error) {
      console.error(`Calculator ${calc.id} failed`, error);
      return calculatorErrorResult(calc.id);
    }
  }, [calc, values, missingRequired, rangeViolations, stepViolations, invalidSelects]);

  if (!calc || !result) {
    return (
      <main className="calc-page">
        <div className="empty-state">
          Calculator not found. <Link to="/">Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="calc-page">
      <Link to="/" className="calc-back">
        All calculators
      </Link>
      <h1>
        {calc.name}
        {calc.status && calc.status !== 'current' ? (
          <span className={`status-badge status-${calc.status}`}>{calc.status}</span>
        ) : null}
      </h1>
      <p className="lede">{calc.description}</p>
      {successor ? (
        <p className="status-note">
          Current tool: <Link to={`/calc/${successor.id}`}>{successor.name}</Link>
        </p>
      ) : null}

      <div className="when-why">
        <div className="meta-block">
          <h2>When to use</h2>
          <p>{calc.whenToUse}</p>
        </div>
        <div className="meta-block">
          <h2>Why use</h2>
          <p>{calc.whyUse}</p>
        </div>
      </div>

      <div className="calc-layout">
        <CalculatorForm
          inputs={calc.inputs}
          values={values}
          activeInputIds={activeFormInputIds}
          missingInputIds={missingRequired.map((input) => input.id)}
          selectedOptionIndices={selectedOptionIndices}
          onChange={(inputId, value, optionIndex) => {
            setFormState((prev) => ({
              calcId: prev.calcId,
              values: { ...prev.values, [inputId]: value },
            }));
            if (optionIndex !== undefined) {
              setSelectedOptionIndices((prev) => ({ ...prev, [inputId]: optionIndex }));
            }
          }}
          onReset={() => {
            setFormState({ calcId, values: getInitialFormValues(calc) });
            setSelectedOptionIndices({});
          }}
          onLoadExample={() => {
            setFormState({ calcId, values: getExampleFormValues(calc) });
            setSelectedOptionIndices({});
          }}
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
    </main>
  );
}
