import { Lock } from "lucide-react";

import { cakeSizes } from "../engine/sizingRules";
import { stakeApplies } from "../engine/calculateStakeRecommendation";
import type { SizingProductConfig, SizingRecommendation, UploadedDesignMetadata } from "../engine/sizingTypes";

interface SizingPreviewPanelProps {
  uploadedFile: UploadedDesignMetadata | null;
  config: SizingProductConfig;
  recommendation: SizingRecommendation | null;
}

export function SizingPreviewPanel({ uploadedFile, config, recommendation }: SizingPreviewPanelProps) {
  const cakeDiameter = cakeSizes[config.cakeSize].diameterMm;
  const isTopperView = stakeApplies(config.productType);
  const designWidthPercent = recommendation
    ? Math.min(76, Math.max(10, (recommendation.recommendedWidthMm / cakeDiameter) * 72))
    : 34;
  const designHeightPercent = recommendation
    ? Math.min(48, Math.max(8, (recommendation.recommendedHeightMm / cakeDiameter) * 72))
    : 22;

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
        <div className="sa-front-scene">
          <span className="sa-view-label">Front view</span>
          <div className="sa-plan-reference" aria-label={`Cake footprint diameter ${cakeDiameter} mm`}>
            <span>{cakeDiameter} mm diameter</span>
          </div>
          {uploadedFile ? (
            <div
              className={`sa-design-preview${isTopperView ? " sa-design-preview--topper" : " sa-design-preview--charm"}`}
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
          {isTopperView && recommendation?.stakeDepthMm && (
            <div className="sa-stake-guide" style={{ height: `${Math.min(22, Math.max(10, (recommendation.stakeDepthMm / cakeDiameter) * 72))}%` }}>
              <span>{recommendation.stakeDepthMm} mm stake</span>
            </div>
          )}
          <div className="sa-cake-front">
            <span className="sa-cake-width-label">{cakeDiameter} mm cake width</span>
          </div>
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
