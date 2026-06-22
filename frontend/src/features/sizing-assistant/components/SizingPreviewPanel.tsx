import { Lock, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getScaledExportDimensions } from "../engine/calculateSizingRecommendation";
import { cakeSizes } from "../engine/sizingRules";
import { stakeApplies } from "../engine/calculateStakeRecommendation";
import type { SizingProductConfig, SizingRecommendation, UploadedDesignMetadata } from "../engine/sizingTypes";
import type { SizingPreviewSettings } from "./SizingAssistantTab";

const MIN_PREVIEW_CAKE_DIAMETER_MM = cakeSizes["4"].diameterMm;
const MAX_PREVIEW_CAKE_DIAMETER_MM = cakeSizes["10"].diameterMm;
const MIN_CAKE_WIDTH_PERCENT = 60;
const MAX_CAKE_WIDTH_PERCENT = 92;
const CAKE_DEPTH_RATIO = 0.46;

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
  // The scene box isn't square, so a width-based mm-to-percent scalar can't be reused
  // directly for vertical measurements. Track the real width/height ratio so heights
  // derived from physical mm values (design, stake guide) keep their true proportions.
  const [sceneAspect, setSceneAspect] = useState(540 / 420);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setSceneAspect(entry.contentRect.width / entry.contentRect.height);
      }
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  const cakeDiameter = cakeSizes[config.cakeSize].diameterMm;
  const isTopperView = stakeApplies(config.productType);
  const cakeSizeRatio = clamp(
    (cakeDiameter - MIN_PREVIEW_CAKE_DIAMETER_MM) / (MAX_PREVIEW_CAKE_DIAMETER_MM - MIN_PREVIEW_CAKE_DIAMETER_MM),
    0,
    1,
  );
  const cakeWidthPercent = MIN_CAKE_WIDTH_PERCENT + cakeSizeRatio * (MAX_CAKE_WIDTH_PERCENT - MIN_CAKE_WIDTH_PERCENT);
  const cakeHeightPercent = Math.max(22, cakeWidthPercent * CAKE_DEPTH_RATIO);
  const cakeLeftPercent = 50 - cakeWidthPercent / 2;
  const cakeBottomPercent = 7;
  const cakeTopPercent = cakeBottomPercent + cakeHeightPercent;
  const cakeTopperGapPercent = 3;
  // Anchored to the currently rendered cake (not the global max size) so the design/stake
  // overlays stay proportionally accurate to the cake at whatever scale it's drawn.
  const percentPerMm = cakeWidthPercent / cakeDiameter;
  const sourceAspectRatio =
    uploadedFile?.originalWidth && uploadedFile.originalHeight
      ? uploadedFile.originalWidth / uploadedFile.originalHeight
      : null;
  const recommendedPreviewDimensions = getRecommendedPreviewDimensions(uploadedFile, recommendation);
  const sourceWidthPercent = sourceAspectRatio
    ? Math.min(62, Math.max(14, sourceAspectRatio >= 1 ? 38 : 38 * sourceAspectRatio))
    : 34;
  const sourceHeightPercent = sourceAspectRatio
    ? Math.min(48, Math.max(10, (sourceWidthPercent / sourceAspectRatio) * sceneAspect))
    : 22;
  const designWidthPercent = recommendation && previewSettings.previewRecommendedSize
    ? Math.min(88, Math.max(5, recommendedPreviewDimensions.widthMm * percentPerMm))
    : sourceWidthPercent;
  const designHeightPercent = recommendation && previewSettings.previewRecommendedSize
    ? Math.min(68, Math.max(5, recommendedPreviewDimensions.heightMm * percentPerMm * sceneAspect))
    : sourceHeightPercent;
  const designTransform = `translate(-50%, 0) translate(${previewSettings.offsetXPct}%, ${previewSettings.offsetYPct}%) rotate(${previewSettings.rotationDeg}deg)`;

  function patchPreviewSettings(patch: Partial<SizingPreviewSettings>) {
    onPreviewSettingsChange({ ...previewSettings, ...patch });
  }

  function resetPlacement() {
    onPreviewSettingsChange({
      ...previewSettings,
      offsetXPct: 28,
      offsetYPct: -18,
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
          <span>Preview recommended physical size</span>
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
          {uploadedFile ? (
            <div
              className={`sa-design-preview${isTopperView ? " sa-design-preview--topper" : " sa-design-preview--charm"}`}
              style={{
                width: `${designWidthPercent}%`,
                height: `${designHeightPercent}%`,
                left: "50%",
                bottom: isTopperView
                  ? `${cakeTopPercent + cakeTopperGapPercent}%`
                  : `${cakeBottomPercent + cakeHeightPercent * 0.28}%`,
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
            <div
              className="sa-stake-guide"
              style={{
                height: `${Math.min(24, Math.max(6, recommendation.stakeDepthMm * percentPerMm * sceneAspect))}%`,
                left: "50%",
                bottom: `${cakeTopPercent - 3}%`,
              }}
            >
              <span>{recommendation.stakeDepthMm} mm stake</span>
            </div>
          )}
          <div
            className="sa-cake-front"
            style={{
              left: `${cakeLeftPercent}%`,
              width: `${cakeWidthPercent}%`,
              height: `${cakeHeightPercent}%`,
              bottom: `${cakeBottomPercent}%`,
            }}
          >
            <span className="sa-cake-width-label">{cakeDiameter} mm cake width</span>
          </div>
        </div>
      </div>

      <div className="sa-measurements">
        <span>
          {previewSettings.previewRecommendedSize ? "Recommended preview width" : "Uploaded proportions"}
          <strong>
            {recommendation && previewSettings.previewRecommendedSize
              ? `${recommendation.recommendedWidthMm} mm visible`
              : "Original proportions only"}
          </strong>
        </span>
        <span>
          {previewSettings.previewRecommendedSize ? "Recommended preview height" : "Recommended export height"}
          <strong>
            {recommendation
              ? uploadedFile?.sizingAreaMode === "visibleArtwork" && previewSettings.previewRecommendedSize
                ? `${recommendation.recommendedHeightMm} mm visible / ${recommendedPreviewDimensions.heightMm} mm full`
                : `${recommendation.recommendedHeightMm} mm`
              : "-"}
          </strong>
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

function getRecommendedPreviewDimensions(
  uploadedFile: UploadedDesignMetadata | null,
  recommendation: SizingRecommendation | null,
): { widthMm: number; heightMm: number } {
  return getScaledExportDimensions(uploadedFile, recommendation) ?? { widthMm: 0, heightMm: 0 };
}
