import type { GenerateResponse } from "../types/design";

interface ValidationPanelProps {
  result: GenerateResponse | null;
}

export function ValidationPanel({ result }: ValidationPanelProps) {
  if (!result?.geometry.validation || !result.geometry.welding) {
    return null;
  }

  const validation = result.geometry.validation;
  const welding = result.geometry.welding;

  return (
    <section className="validation-panel" aria-label="Validation results">
      <div className="score-grid">
        <Score label="Connectivity" value={validation.connectivity_score} />
        <Score label="Structural" value={validation.structural_score} />
        <Score label="Production" value={validation.production_readiness_score} />
      </div>
      <div className="welding-summary">
        <span>Components: {welding.connected_components_before} to {welding.connected_components_after}</span>
        <span>Bridges: {welding.bridges_added}</span>
        <span>Skipped: {welding.bridge_candidates_skipped}</span>
      </div>
      {validation.warnings.length > 0 && (
        <ul className="warning-list">
          {validation.warnings.map((warning) => (
            <li key={`${warning.code}-${warning.message}`} data-severity={warning.severity}>
              {warning.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="score">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
