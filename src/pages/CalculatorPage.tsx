import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCalculator } from '../data/calculators';
import { CalculatorForm } from '../components/CalculatorForm';
import { LiveResult } from '../components/LiveResult';
import { EvidencePanel } from '../components/EvidencePanel';
import { NextStepsPanel } from '../components/NextStepsPanel';
import {
  getActiveQuestionnaireInputs,
  getMissingQuestionnaireInputs,
  getQuestionnaireModeInput,
  getRangeViolations,
  getStepViolations,
  incompleteResult,
  isQuestionnaireCalculator,
  rangeBlockedResult,
  stepBlockedResult,
} from '../utils/helpers';

function initialValues(calc: ReturnType<typeof getCalculator>) {
  const values: Record<string, number | string | boolean | null> = {};
  if (!calc) return values;
  const isQuestionnaire = isQuestionnaireCalculator(calc);
  const modeInput = isQuestionnaire ? getQuestionnaireModeInput(calc) : undefined;
  for (const input of calc.inputs) {
    if (isQuestionnaire && input.id !== modeInput?.id) {
      // Defaults are useful for calculators that intentionally start with a
      // representative clinical value, but they silently answer questionnaire
      // items. Keep only the branch selector preselected; all active answers
      // must come from the user.
      values[input.id] = null;
      continue;
    }
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
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'evidence' | 'next'>('next');

  let values = formState.values;
  if (formState.calcId !== calcId) {
    values = initialValues(calc);
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
      <h1>{calc.name}</h1>
      <p className="lede">{calc.description}</p>

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
            setFormState({ calcId, values: initialValues(calc) });
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
