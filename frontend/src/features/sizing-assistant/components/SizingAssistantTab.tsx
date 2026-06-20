import { Ruler } from "lucide-react";
import { useMemo, useState } from "react";

import { calculateSizingRecommendation } from "../engine/calculateSizingRecommendation";
import type {
  ManualOverrideState,
  SizingProductConfig,
  UploadedDesignMetadata,
} from "../engine/sizingTypes";
import { ManualOverrideControls } from "./ManualOverrideControls";
import { SizingInputPanel } from "./SizingInputPanel";
import { SizingPreviewPanel } from "./SizingPreviewPanel";
import { SizingRecommendationCard } from "./SizingRecommendationCard";
import { UploadDesignControl } from "./UploadDesignControl";

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

export function SizingAssistantTab() {
  const [uploadedFile, setUploadedFile] = useState<UploadedDesignMetadata | null>(null);
  const [productConfig, setProductConfig] = useState<SizingProductConfig>(defaultConfig);
  const [manualOverride, setManualOverride] = useState<ManualOverrideState>(defaultManualOverride);

  const recommendation = useMemo(() => {
    if (!uploadedFile) return null;
    return calculateSizingRecommendation({
      uploadedFile,
      productConfig,
      manualOverride,
    });
  }, [manualOverride, productConfig, uploadedFile]);

  const aspectRatio =
    uploadedFile?.originalWidth && uploadedFile.originalHeight
      ? uploadedFile.originalWidth / uploadedFile.originalHeight
      : null;

  function handleUpload(metadata: UploadedDesignMetadata) {
    setUploadedFile((previous) => {
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
      return metadata;
    });
    setManualOverride(defaultManualOverride);
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
        dimensionsDetected,
        errors: dimensionsDetected ? [] : current.errors,
      };
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
          />
          <SizingInputPanel config={productConfig} onChange={setProductConfig} />
          <ManualOverrideControls
            aspectRatio={aspectRatio}
            recommendation={recommendation}
            manualOverride={manualOverride}
            onChange={setManualOverride}
          />
        </div>

        <SizingPreviewPanel
          uploadedFile={uploadedFile}
          config={productConfig}
          recommendation={recommendation}
        />

        <SizingRecommendationCard
          uploadedFile={uploadedFile}
          config={productConfig}
          recommendation={recommendation}
        />
      </div>
    </div>
  );
}
