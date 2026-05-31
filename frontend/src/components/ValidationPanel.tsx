import type { BridgeOverride, GenerateResponse } from "../types/design";

interface ValidationPanelProps {
  result: GenerateResponse | null;
  onBridgeOverride?: (override: BridgeOverride) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  natural: "Naturally Connected",
  compression: "Connected via Compression",
  bridge: "Connected via Bridges",
  disconnected: "Disconnected — Manual Review Required",
};

const STRATEGY_CLASSES: Record<string, string> = {
  natural: "strategy-natural",
  compression: "strategy-compression",
  bridge: "strategy-bridge",
  disconnected: "strategy-disconnected",
};

export function ValidationPanel({ result, onBridgeOverride }: ValidationPanelProps) {
  if (!result?.geometry.validation || !result.geometry.welding) {
    return null;
  }

  const validation = result.geometry.validation;
  const welding = result.geometry.welding;
  const strategyLabel = STRATEGY_LABELS[welding.strategy] ?? welding.strategy;
  const strategyClass = STRATEGY_CLASSES[welding.strategy] ?? "";
  const bridgeIds = new Set(welding.bridge_path_ids ?? []);
  const numGlyphs = result.geometry.glyphs?.length ?? 0;
  const numPairs = numGlyphs > 1 ? numGlyphs - 1 : 0;

  return (
    <section className="validation-panel" aria-label="Validation results">
      <div className={`strategy-label ${strategyClass}`} aria-label="Connectivity strategy">
        {strategyLabel}
      </div>

      <div className="score-grid">
        <Score label="Connectivity" value={validation.connectivity_score} />
        <Score label="Structural" value={validation.structural_score} />
        <Score label="Production" value={validation.production_readiness_score} />
      </div>

      <div className="welding-summary">
        <span>Components: {welding.connected_components_before} → {welding.connected_components_after}</span>
        {welding.compression_amount_mm > 0 && (
          <span>Compression: {welding.compression_amount_mm.toFixed(1)} mm/gap</span>
        )}
        {welding.bridges_added > 0 && <span>Bridges: {welding.bridges_added}</span>}
        {welding.bridge_candidates_skipped > 0 && (
          <span>Skipped: {welding.bridge_candidates_skipped}</span>
        )}
      </div>

      {numPairs > 0 && onBridgeOverride && (
        <div className="bridge-override-row" aria-label="Bridge controls">
          <span className="bridge-override-label">Bridges</span>
          <div className="bridge-override-gaps">
            {Array.from({ length: numPairs }, (_, i) => {
              const bridgeId = `bridge-${String(i + 1).padStart(4, "0")}`;
              const hasBridge = bridgeIds.has(bridgeId);
              return (
                <span key={i} className="bridge-gap-control">
                  <span className="bridge-gap-index">Gap {i + 1}</span>
                  {hasBridge ? (
                    <button
                      type="button"
                      className="bridge-btn bridge-btn--remove"
                      title={`Remove bridge at gap ${i + 1}`}
                      onClick={() => onBridgeOverride({ pair_index: i, action: "remove" })}
                    >
                      × Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="bridge-btn bridge-btn--add"
                      title={`Add bridge at gap ${i + 1}`}
                      onClick={() => onBridgeOverride({ pair_index: i, action: "add" })}
                    >
                      + Add
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

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
