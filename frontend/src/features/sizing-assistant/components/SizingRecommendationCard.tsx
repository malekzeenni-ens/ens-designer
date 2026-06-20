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

      <section className="sa-actions-section">
        <h2>Warnings</h2>
        <WarningList warnings={recommendation.warnings} />
      </section>

      <section className="sa-actions-section">
        <h2>Suggested actions</h2>
        <ul className="sa-note-list">
          {recommendation.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="sa-actions-section sa-export-options">
        <h2>Export options</h2>
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

function formatAspect(aspectCategory: string): string {
  return aspectCategory.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function formatStatus(status: string): string {
  return status.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
