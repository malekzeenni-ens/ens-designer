import { Ruler } from "lucide-react";
import { useMemo, useState } from "react";

import { calculateSizingRecommendation } from "../engine/calculateSizingRecommendation";
import type {
  ManualOverrideState,
  SizingAreaMode,
  SizingProductConfig,
  UploadedDesignMetadata,
} from "../engine/sizingTypes";
import { ManualOverrideControls } from "./ManualOverrideControls";
import { SizingInputPanel } from "./SizingInputPanel";
import { SizingPreviewPanel } from "./SizingPreviewPanel";
import { SizingRecommendationCard } from "./SizingRecommendationCard";
import { UploadDesignControl } from "./UploadDesignControl";

export type SizingPreviewSettings = {
  previewRecommendedSize: boolean;
  offsetXPct: number;
  offsetYPct: number;
  rotationDeg: number;
};

const defaultConfig: SizingProductConfig = {
  productType: "topCakeTopper",
  cakeSize: "6",
  material: "3mmAcrylic",
  designUse: "heroTopper",
  fontCategory: "unknown",
  stakeOption: "auto",
};

const defaultManualOverride: ManualOverrideState = {
  enabled: false,
};

const defaultPreviewSettings: SizingPreviewSettings = {
  previewRecommendedSize: true,
  offsetXPct: 28,
  offsetYPct: -18,
  rotationDeg: 0,
};

const defaultVisibleArtworkHeightPercent = 72;

export function SizingAssistantTab() {
  const [uploadedFile, setUploadedFile] = useState<UploadedDesignMetadata | null>(null);
  const [productConfig, setProductConfig] = useState<SizingProductConfig>(defaultConfig);
  const [manualOverride, setManualOverride] = useState<ManualOverrideState>(defaultManualOverride);
  const [previewSettings, setPreviewSettings] =
    useState<SizingPreviewSettings>(defaultPreviewSettings);

  const recommendationUploadedFile = useMemo(() => {
    if (!uploadedFile) return null;
    return buildRecommendationUploadedFile(uploadedFile);
  }, [uploadedFile]);

  const recommendation = useMemo(() => {
    if (!recommendationUploadedFile) return null;
    return calculateSizingRecommendation({
      uploadedFile: recommendationUploadedFile,
      productConfig,
      manualOverride,
    });
  }, [manualOverride, productConfig, recommendationUploadedFile]);

  const aspectRatio =
    recommendationUploadedFile?.originalWidth && recommendationUploadedFile.originalHeight
      ? recommendationUploadedFile.originalWidth / recommendationUploadedFile.originalHeight
      : null;

  function handleUpload(metadata: UploadedDesignMetadata) {
    setUploadedFile((previous) => {
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
      return normaliseSizingArea(metadata);
    });
    setManualOverride(defaultManualOverride);
    setPreviewSettings(defaultPreviewSettings);
  }

  function handleManualDimensionsChange(width: number | null, height: number | null) {
    setUploadedFile((current) => {
      if (!current) return current;
      const dimensionsDetected = Boolean(width && height && width > 0 && height > 0);
      return {
        ...current,
        originalWidth: width,
        originalHeight: height,
        originalUnit: dimensionsDetected ? "unitless" : current.originalUnit,
        sizingWidth: width,
        sizingHeight:
          current.sizingAreaMode === "visibleArtwork" && height
            ? roundOne(height * ((current.visibleArtworkHeightPercent ?? defaultVisibleArtworkHeightPercent) / 100))
            : height,
        dimensionsDetected,
        errors: dimensionsDetected ? [] : current.errors,
      };
    });
  }

  function handleSizingAreaChange(mode: SizingAreaMode, visibleArtworkHeightPercent?: number) {
    setUploadedFile((current) => {
      if (!current) return current;
      return applySizingAreaMode(current, mode, visibleArtworkHeightPercent);
    });
  }

  return (
    <div className="sa-panel">
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img className="ct-brand-logo" src="/brand/etch-n-shine-logo.png" alt="Etch N Shine" />
          <div>
            <p>Etch N Shine</p>
            <h1>Sizing Assistant</h1>
          </div>
        </div>
        <div className="ct-header-actions">
          <div className="sa-header-chip">
            <Ruler size={17} aria-hidden="true" />
            <span>Production sizing in mm</span>
          </div>
        </div>
      </header>

      <div className="sa-workspace">
        <div className="sa-left-panel">
          <UploadDesignControl
            uploadedFile={uploadedFile}
            onUpload={handleUpload}
            onManualDimensionsChange={handleManualDimensionsChange}
            onSizingAreaChange={handleSizingAreaChange}
          />
          <SizingInputPanel config={productConfig} onChange={setProductConfig} />
          <ManualOverrideControls
            aspectRatio={aspectRatio}
            recommendation={recommendation}
            manualOverride={manualOverride}
            onChange={setManualOverride}
          />
        </div>

        <div className="sa-main-panel">
          <SizingPreviewPanel
            uploadedFile={uploadedFile}
            config={productConfig}
            recommendation={recommendation}
            previewSettings={previewSettings}
            onPreviewSettingsChange={setPreviewSettings}
          />

          <SizingRecommendationCard
            uploadedFile={uploadedFile}
            config={productConfig}
            recommendation={recommendation}
            previewSettings={previewSettings}
          />
        </div>
      </div>
    </div>
  );
}

function normaliseSizingArea(metadata: UploadedDesignMetadata): UploadedDesignMetadata {
  return applySizingAreaMode(
    {
      ...metadata,
      sizingAreaMode: metadata.sizingAreaMode ?? "fullDesign",
      visibleArtworkHeightPercent:
        metadata.visibleArtworkHeightPercent ?? defaultVisibleArtworkHeightPercent,
    },
    metadata.sizingAreaMode ?? "fullDesign",
    metadata.visibleArtworkHeightPercent,
  );
}

function applySizingAreaMode(
  metadata: UploadedDesignMetadata,
  mode: SizingAreaMode,
  visibleArtworkHeightPercent = metadata.visibleArtworkHeightPercent ?? defaultVisibleArtworkHeightPercent,
): UploadedDesignMetadata {
  if (!metadata.originalWidth || !metadata.originalHeight) {
    return {
      ...metadata,
      sizingAreaMode: mode,
      visibleArtworkHeightPercent,
      sizingWidth: metadata.originalWidth,
      sizingHeight: metadata.originalHeight,
    };
  }

  const nextPercent = clamp(visibleArtworkHeightPercent, 40, 100);
  const sizingHeight =
    mode === "visibleArtwork" ? roundOne(metadata.originalHeight * (nextPercent / 100)) : metadata.originalHeight;

  return {
    ...metadata,
    sizingAreaMode: mode,
    visibleArtworkHeightPercent: nextPercent,
    sizingWidth: metadata.originalWidth,
    sizingHeight,
  };
}

function buildRecommendationUploadedFile(metadata: UploadedDesignMetadata): UploadedDesignMetadata {
  if (
    metadata.sizingAreaMode === "visibleArtwork" &&
    metadata.sizingWidth &&
    metadata.sizingHeight &&
    metadata.sizingWidth > 0 &&
    metadata.sizingHeight > 0
  ) {
    return {
      ...metadata,
      originalWidth: metadata.sizingWidth,
      originalHeight: metadata.sizingHeight,
      dimensionsDetected: true,
      errors: [],
    };
  }

  return metadata;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
