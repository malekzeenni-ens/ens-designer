import { Lock } from "lucide-react";

import type { ManualOverrideState, SizingRecommendation } from "../engine/sizingTypes";

interface ManualOverrideControlsProps {
  aspectRatio: number | null;
  recommendation: SizingRecommendation | null;
  manualOverride: ManualOverrideState;
  onChange: (manualOverride: ManualOverrideState) => void;
}

export function ManualOverrideControls({
  aspectRatio,
  recommendation,
  manualOverride,
  onChange,
}: ManualOverrideControlsProps) {
  const width = manualOverride.enabled
    ? manualOverride.widthMm ?? recommendation?.recommendedWidthMm ?? ""
    : recommendation?.recommendedWidthMm ?? "";
  const height = manualOverride.enabled
    ? manualOverride.heightMm ?? recommendation?.recommendedHeightMm ?? ""
    : recommendation?.recommendedHeightMm ?? "";

  function setWidth(value: string) {
    const widthMm = parsePositive(value);
    onChange({
      enabled: true,
      widthMm,
      heightMm: widthMm && aspectRatio ? round(widthMm / aspectRatio) : undefined,
      lastEditedDimension: "width",
    });
  }

  function setHeight(value: string) {
    const heightMm = parsePositive(value);
    onChange({
      enabled: true,
      heightMm,
      widthMm: heightMm && aspectRatio ? round(heightMm * aspectRatio) : undefined,
      lastEditedDimension: "height",
    });
  }

  return (
    <section className="sa-card sa-manual-controls">
      <div className="sa-card-heading">
        <div>
          <h2>Manual override</h2>
          <p>Aspect ratio remains locked.</p>
        </div>
        <span className="sa-lock-chip">
          <Lock size={14} aria-hidden="true" />
          Locked
        </span>
      </div>

      <label className="ct-outline-toggle">
        <input
          type="checkbox"
          checked={manualOverride.enabled}
          disabled={!recommendation}
          onChange={(event) =>
            onChange({
              enabled: event.target.checked,
              widthMm: event.target.checked ? recommendation?.recommendedWidthMm : undefined,
              heightMm: event.target.checked ? recommendation?.recommendedHeightMm : undefined,
              lastEditedDimension: "width",
            })
          }
        />
        <span>Override recommendation</span>
      </label>

      <div className="sa-inline-fields">
        <label className="ct-card-field">
          <span>Visible width</span>
          <span className="ct-unit-input ct-unit-input--compact">
            <input
              type="number"
              min="1"
              step="0.1"
              disabled={!manualOverride.enabled || !recommendation}
              value={width}
              onChange={(event) => setWidth(event.target.value)}
            />
            <span>mm</span>
          </span>
        </label>
        <label className="ct-card-field">
          <span>Visible height</span>
          <span className="ct-unit-input ct-unit-input--compact">
            <input
              type="number"
              min="1"
              step="0.1"
              disabled={!manualOverride.enabled || !recommendation}
              value={height}
              onChange={(event) => setHeight(event.target.value)}
            />
            <span>mm</span>
          </span>
        </label>
      </div>
    </section>
  );
}

function parsePositive(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
