import { Lock, RotateCcw } from "lucide-react";
import { useRef } from "react";

import { cakeSizes } from "../engine/sizingRules";
import { stakeApplies } from "../engine/calculateStakeRecommendation";
import type { SizingProductConfig, SizingRecommendation, UploadedDesignMetadata } from "../engine/sizingTypes";
import type { SizingPreviewSettings } from "./SizingAssistantTab";

interface SizingPreviewPanelProps {
  uploadedFile: UploadedDesignMetadata | null;
  config: SizingProductConfig;
  recommendation: SizingRecommendation | null;
  previewSettings: SizingPreviewSettings;
  onPreviewSettingsChange: (settings: SizingPreviewSettings) => void;
}

export function SizingPreviewPanel({
  uploadedFile,
  config,
  recommendation,
  previewSettings,
  onPreviewSettingsChange,
}: SizingPreviewPanelProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cakeDiameter = cakeSizes[config.cakeSize].diameterMm;
  const isTopperView = stakeApplies(config.productType);
  const sourceAspectRatio =
    uploadedFile?.originalWidth && uploadedFile.originalHeight
      ? uploadedFile.originalWidth / uploadedFile.originalHeight
      : null;
  const sourceWidthPercent = sourceAspectRatio
    ? Math.min(62, Math.max(14, sourceAspectRatio >= 1 ? 38 : 38 * sourceAspectRatio))
    : 34;
  const sourceHeightPercent = sourceAspectRatio
    ? Math.min(48, Math.max(10, sourceWidthPercent / sourceAspectRatio))
    : 22;
  const designWidthPercent = recommendation && previewSettings.previewRecommendedSize
    ? Math.min(76, Math.max(10, (recommendation.recommendedWidthMm / cakeDiameter) * 72))
    : sourceWidthPercent;
  const designHeightPercent = recommendation && previewSettings.previewRecommendedSize
    ? Math.min(48, Math.max(8, (recommendation.recommendedHeightMm / cakeDiameter) * 72))
    : sourceHeightPercent;
  const designTransform = `translate(-50%, 0) translate(${previewSettings.offsetXPct}%, ${previewSettings.offsetYPct}%) rotate(${previewSettings.rotationDeg}deg)`;

  function patchPreviewSettings(patch: Partial<SizingPreviewSettings>) {
    onPreviewSettingsChange({ ...previewSettings, ...patch });
  }

  function resetPlacement() {
    onPreviewSettingsChange({
      ...previewSettings,
      offsetXPct: 0,
      offsetYPct: 0,
      rotationDeg: 0,
    });
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!uploadedFile || !sceneRef.current) return;
    event.preventDefault();

    const scene = sceneRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffsetX = previewSettings.offsetXPct;
    const startOffsetY = previewSettings.offsetYPct;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail in older embedded browsers; document listeners still handle the drag.
    }

    function onMove(moveEvent: PointerEvent) {
      const rect = scene.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nextX = clamp(startOffsetX + ((moveEvent.clientX - startX) / rect.width) * 100, -42, 42);
      const nextY = clamp(startOffsetY + ((moveEvent.clientY - startY) / rect.height) * 100, -34, 42);
      onPreviewSettingsChange({
        ...previewSettings,
        offsetXPct: Math.round(nextX * 10) / 10,
        offsetYPct: Math.round(nextY * 10) / 10,
      });
    }

    function onUp() {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
    }

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  }

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

      <div className="sa-preview-controls">
        <label className="sa-preview-toggle">
          <input
            type="checkbox"
            checked={previewSettings.previewRecommendedSize}
            disabled={!recommendation}
            onChange={(event) => patchPreviewSettings({ previewRecommendedSize: event.target.checked })}
          />
          <span>Preview recommended size</span>
        </label>
        <label className="sa-angle-control">
          <span>Angle</span>
          <input
            type="range"
            min="-25"
            max="25"
            step="1"
            value={previewSettings.rotationDeg}
            disabled={!uploadedFile}
            onChange={(event) => patchPreviewSettings({ rotationDeg: Number(event.target.value) })}
          />
          <strong>{previewSettings.rotationDeg}°</strong>
        </label>
        <button
          type="button"
          className="sa-preview-reset"
          disabled={!uploadedFile}
          onClick={resetPlacement}
          title="Reset preview placement"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="sa-cake-stage">
        <div className="sa-front-scene" ref={sceneRef}>
          <span className="sa-view-label">Front view</span>
          <div className="sa-plan-reference" aria-label={`Cake footprint diameter ${cakeDiameter} mm`}>
            <span>{cakeDiameter} mm diameter</span>
          </div>
          {uploadedFile ? (
            <div
              className={`sa-design-preview${isTopperView ? " sa-design-preview--topper" : " sa-design-preview--charm"}`}
              style={{
                width: `${designWidthPercent}%`,
                height: `${designHeightPercent}%`,
                transform: designTransform,
              }}
              onPointerDown={startDrag}
              title="Drag to reposition this preview"
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
          {previewSettings.previewRecommendedSize ? "Preview width" : "Source preview"}
          <strong>{recommendation && previewSettings.previewRecommendedSize ? `${recommendation.recommendedWidthMm} mm` : "Reference only"}</strong>
        </span>
        <span>
          {previewSettings.previewRecommendedSize ? "Preview height" : "Export size"}
          <strong>{recommendation ? `${recommendation.recommendedHeightMm} mm` : "-"}</strong>
        </span>
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatStatus(status: string | undefined): string {
  if (!status) return "Awaiting design";
  return status.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
