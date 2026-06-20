import { Download } from "lucide-react";
import { useState } from "react";

import { exportPreviewPlacementSvg, exportResizedSvg } from "../engine/exportResizedSvg";
import { buildSizedSvgFilename } from "../engine/filenameUtils";
import { cakeSizes, productTypeLabel } from "../engine/sizingRules";
import type { SizingProductConfig, SizingRecommendation, UploadedDesignMetadata } from "../engine/sizingTypes";
import type { SizingPreviewSettings } from "./SizingAssistantTab";
import { WarningList } from "./WarningList";

interface SizingRecommendationCardProps {
  uploadedFile: UploadedDesignMetadata | null;
  config: SizingProductConfig;
  recommendation: SizingRecommendation | null;
  previewSettings: SizingPreviewSettings;
}

export function SizingRecommendationCard({
  uploadedFile,
  config,
  recommendation,
  previewSettings,
}: SizingRecommendationCardProps) {
  const [includePreviewPlacement, setIncludePreviewPlacement] = useState(false);

  function downloadSvg() {
    if (!uploadedFile?.rawSvgText || !recommendation?.exportAvailable) return;
    const svg = includePreviewPlacement
      ? exportPreviewPlacementSvg({
          rawSvgText: uploadedFile.rawSvgText,
          widthMm: recommendation.recommendedWidthMm,
          heightMm: recommendation.recommendedHeightMm,
          offsetXPct: previewSettings.offsetXPct,
          offsetYPct: previewSettings.offsetYPct,
          rotationDeg: previewSettings.rotationDeg,
        })
      : exportResizedSvg({
          rawSvgText: uploadedFile.rawSvgText,
          widthMm: recommendation.recommendedWidthMm,
          heightMm: recommendation.recommendedHeightMm,
        });
    const filename = buildSizedSvgFilename({
      productType: config.productType,
      cakeSize: config.cakeSize,
      widthMm: recommendation.recommendedWidthMm,
      heightMm: recommendation.recommendedHeightMm,
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!recommendation) {
    return (
      <aside className="sa-card sa-recommendation-card">
        <div className="sa-card-heading">
          <div>
            <h2>Recommendation</h2>
            <p>A recommendation appears after upload.</p>
          </div>
        </div>
        <p className="sa-empty-note">A recommendation cannot be generated until a design is uploaded.</p>
      </aside>
    );
  }

  return (
    <aside className="sa-card sa-recommendation-card">
      <div className="sa-card-heading">
        <div>
          <h2>Recommendation</h2>
          <p>{formatStatus(recommendation.status)}</p>
        </div>
        <span className={`sa-status-badge sa-status-badge--${recommendation.status}`}>
          {formatStatus(recommendation.status)}
        </span>
      </div>

      <div className="sa-recommendation-accordions">
        <details className="sa-accordion" open>
          <summary>
            <span>Size comparison</span>
            <strong>{recommendation.recommendedWidthMm} x {recommendation.recommendedHeightMm} mm</strong>
          </summary>
          <section className="sa-size-comparison" aria-label="Uploaded and recommended size comparison">
            <div className="sa-size-comparison-grid">
              <SizeComparisonItem
                label="Uploaded design"
                value={formatUploadedSize(uploadedFile)}
                note={uploadedFile?.originalUnit === "mm" ? "Physical source size detected." : "Used for proportions only."}
              />
              <SizeComparisonItem
                label="Recommended cut size"
                value={`${recommendation.recommendedWidthMm} x ${recommendation.recommendedHeightMm} mm`}
                note="Based on cake size, product type, height guidance, and aspect ratio."
              />
              <SizeComparisonItem
                label="Export size"
                value={
                  includePreviewPlacement
                    ? `${roundOne(recommendation.recommendedWidthMm * 1.8)} x ${roundOne(recommendation.recommendedHeightMm * 1.8)} mm canvas`
                    : `${recommendation.recommendedWidthMm} x ${recommendation.recommendedHeightMm} mm`
                }
                note={
                  includePreviewPlacement
                    ? "Larger placement canvas with moved/rotated design."
                    : "Resized original SVG dimensions."
                }
              />
            </div>
            {uploadedFile?.originalUnit !== "mm" && (
              <p className="sa-size-comparison-note">
                This upload has no reliable physical millimetre size. The detected dimensions define proportions; final cut size comes from the recommendation or manual override.
              </p>
            )}
          </section>
        </details>

        <details className="sa-accordion">
          <summary>
            <span>Recommendation details</span>
            <strong>{formatAspect(recommendation.aspectCategory)}</strong>
          </summary>
          <dl className="sa-metric-list">
            <Metric label="Product type" value={productTypeLabel(config.productType)} />
            <Metric label="Cake size" value={cakeSizes[config.cakeSize].label} />
            <Metric label="Cake diameter" value={`${recommendation.cakeDiameterMm} mm`} />
            <Metric label="Aspect ratio" value={recommendation.aspectRatio.toFixed(2)} />
            <Metric label="Aspect category" value={formatAspect(recommendation.aspectCategory)} />
            <Metric label="Visible width" value={`${recommendation.recommendedWidthMm} mm`} />
            <Metric label="Visible height" value={`${recommendation.recommendedHeightMm} mm`} />
            <Metric
              label="Acceptable width"
              value={`${recommendation.acceptableMinWidthMm}-${recommendation.acceptableMaxWidthMm} mm`}
            />
            <Metric label="Stake depth" value={recommendation.stakeDepthMm ? `${recommendation.stakeDepthMm} mm` : "N/A"} />
            <Metric
              label="Total cut height"
              value={recommendation.totalCutHeightMm ? `${recommendation.totalCutHeightMm} mm` : "N/A"}
            />
            <Metric label="Stake recommendation" value={recommendation.stakeRecommendation} />
            <Metric label="Scale factor" value={`${recommendation.scaleFactor}x`} />
            <Metric label="Export geometry" value={includePreviewPlacement ? "Includes preview placement" : "Resized original SVG"} />
          </dl>
        </details>

        <details className="sa-accordion" open={recommendation.warnings.length > 0}>
          <summary>
            <span>Warnings</span>
            <strong>{recommendation.warnings.length}</strong>
          </summary>
          <section className="sa-actions-section">
            <WarningList warnings={recommendation.warnings} />
          </section>
        </details>

        <details className="sa-accordion">
          <summary>
            <span>Suggested actions</span>
            <strong>{recommendation.notes.length}</strong>
          </summary>
          <section className="sa-actions-section">
            <ul className="sa-note-list">
              {recommendation.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </details>

        <details className="sa-accordion">
          <summary>
            <span>Export options</span>
            <strong>{includePreviewPlacement ? "Placed" : "Resized"}</strong>
          </summary>
          <section className="sa-actions-section sa-export-options">
            <label className="sa-preview-toggle">
              <input
                type="checkbox"
                checked={includePreviewPlacement}
                disabled={!recommendation.exportAvailable}
                onChange={(event) => setIncludePreviewPlacement(event.target.checked)}
              />
              <span>Include preview placement and angle in SVG</span>
            </label>
            <p className="sa-export-note">
              Default export keeps the resized original SVG. Placement export uses a larger layout canvas and applies the preview move/angle. Stake guides are advisory unless the uploaded SVG already contains the stake geometry.
            </p>
          </section>
        </details>
      </div>

      <button
        type="button"
        className="ct-primary-action"
        disabled={!recommendation.exportAvailable}
        onClick={downloadSvg}
        title={uploadedFile?.type === "png" ? "SVG export is not available for PNG uploads" : undefined}
      >
        <Download size={18} aria-hidden="true" />
        {includePreviewPlacement ? "Export placed SVG" : "Export resized SVG"}
      </button>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SizeComparisonItem({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function formatUploadedSize(uploadedFile: UploadedDesignMetadata | null): string {
  if (!uploadedFile?.originalWidth || !uploadedFile.originalHeight) return "Not detected";
  return `${roundOne(uploadedFile.originalWidth)} x ${roundOne(uploadedFile.originalHeight)} ${uploadedFile.originalUnit}`;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatAspect(aspectCategory: string): string {
  return aspectCategory.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function formatStatus(status: string): string {
  return status.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
