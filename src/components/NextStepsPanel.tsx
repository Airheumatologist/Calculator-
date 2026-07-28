import type { Calculator } from '../types/calculator';

export function NextStepsPanel({ calc }: { calc: Calculator }) {
  return (
    <div className="panel info-section">
      <div className="panel-header">Next Steps</div>
      <div className="panel-body">
        <p style={{ marginTop: 0 }}>
          Suggested actions based on score ranges and clinical context. Always individualize care.
        </p>
        {calc.nextSteps.map((step) => (
          <div className="next-step-card" key={step.condition}>
            <h4>When: {step.condition}</h4>
            <ul>
              {step.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
