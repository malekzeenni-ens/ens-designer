import { Lock } from "lucide-react";

import { cakeSizes } from "../engine/sizingRules";
import type { SizingProductConfig, SizingRecommendation, UploadedDesignMetadata } from "../engine/sizingTypes";

interface SizingPreviewPanelProps {
  uploadedFile: UploadedDesignMetadata | null;
  config: SizingProductConfig;
  recommendation: SizingRecommendation | null;
}

export function SizingPreviewPanel({ uploadedFile, config, recommendation }: SizingPreviewPanelProps) {
  const cakeDiameter = cakeSizes[config.cakeSize].diameterMm;
  const designWidthPercent = recommendation
    ? Math.min(88, Math.max(8, (recommendation.recommendedWidthMm / cakeDiameter) * 80))
    : 34;
  const designHeightPercent = recommendation
    ? Math.min(88, Math.max(8, (recommendation.recommendedHeightMm / cakeDiameter) * 80))
    : 24;

  return (
    <section className="sa-preview-panel" aria-label="Sizing preview">
      <div className="sa-preview-topbar">
        <span className={`sa-status-badge sa-status-badge--${recommendation?.status ?? "pending"}`}>
          {formatStatus(recommendation?.status)}
        </span>
        <span className="sa-lock-chip">
          <Lock size={14} aria-hidden="true" />
          Aspect ratio locked
        </span>
      </div>

      <div className="sa-cake-stage">
        <div className="sa-cake-footprint">
          <span>{cakeDiameter} mm</span>
          {uploadedFile ? (
            <div
              className="sa-design-preview"
              style={{ width: `${designWidthPercent}%`, height: `${designHeightPercent}%` }}
            >
              {uploadedFile.type === "svg" && uploadedFile.rawSvgText ? (
                <div dangerouslySetInnerHTML={{ __html: uploadedFile.rawSvgText }} />
              ) : uploadedFile.previewUrl ? (
                <img src={uploadedFile.previewUrl} alt={uploadedFile.name} />
              ) : (
                <span>{uploadedFile.name}</span>
              )}
            </div>
          ) : (
            <div className="sa-design-preview sa-design-preview--empty">Upload</div>
          )}
        </div>
      </div>

      <div className="sa-measurements">
        <span>
          Width
          <strong>{recommendation ? `${recommendation.recommendedWidthMm} mm` : "-"}</strong>
        </span>
        <span>
          Height
          <strong>{recommendation ? `${recommendation.recommendedHeightMm} mm` : "-"}</strong>
        </span>
      </div>
    </section>
  );
}

function formatStatus(status: string | undefined): string {
  if (!status) return "Awaiting design";
  return status.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
