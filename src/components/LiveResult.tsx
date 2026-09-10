import type { CalcResult } from '../types/calculator';

export function LiveResult({ result }: { result: CalcResult }) {
  return (
    <div
      className="panel live-panel"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Calculator result"
    >
      <div className="panel-header">
        Result
        <span className="live-hint">
          <span className="live-dot" /> Live
        </span>
      </div>
      <div className="score-display">
        <div className="score-value">{result.score}</div>
        {result.unit && <div className="score-unit">{result.unit}</div>}
        <div className="score-label">{result.label}</div>
        <div className={`risk-badge risk-${result.riskLevel}`}>{result.riskLevel}</div>
      </div>
      <div className="interpretation">{result.interpretation}</div>
      {result.details && result.details.length > 0 && (
        <ul className="detail-list">
          {result.details.map((d) => (
            <li key={d.label}>
              <span>{d.label}</span>
              <span>{d.value}</span>
            </li>
          ))}
        </ul>
      )}
      {result.recommendations && result.recommendations.length > 0 && (
        <ul className="reco-list">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
