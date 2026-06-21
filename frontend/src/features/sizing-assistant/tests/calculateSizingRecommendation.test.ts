import { describe, expect, it } from "vitest";

import { calculateSizingRecommendation } from "../engine/calculateSizingRecommendation";
import type { ManualOverrideState, SizingProductConfig, UploadedDesignMetadata } from "../engine/sizingTypes";

const baseConfig: SizingProductConfig = {
  productType: "topCakeTopper",
  cakeSize: "6",
  material: "3mmAcrylic",
  designUse: "subtleCharm",
  fontCategory: "unknown",
  stakeOption: "auto",
};

const noOverride: ManualOverrideState = { enabled: false };

describe("calculateSizingRecommendation", () => {
  it("uses product-specific sizing and cake size conversion", () => {
    const result = calculateSizingRecommendation({
      uploadedFile: svgFile(120, 100),
      productConfig: baseConfig,
      manualOverride: noOverride,
    });

    expect(result.cakeDiameterMm).toBe(152.4);
    expect(result.recommendedWidthMm).toBe(120);
    expect(result.recommendedHeightMm).toBe(100);
    expect(result.acceptableMinWidthMm).toBe(105);
    expect(result.acceptableMaxWidthMm).toBe(130);
  });

  it("applies height-limit adjustment while preserving aspect ratio", () => {
    const result = calculateSizingRecommendation({
      uploadedFile: svgFile(40, 200),
      productConfig: baseConfig,
      manualOverride: noOverride,
    });

    expect(result.heightLimited).toBe(true);
    expect(result.recommendedHeightMm).toBe(120);
    expect(result.recommendedWidthMm).toBe(24);
    expect(result.warnings.some((warning) => warning.code === "HEIGHT_EXCEEDS_GUIDANCE")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "WIDTH_BELOW_RECOMMENDED_RANGE")).toBe(true);
  });

  it("keeps aspect ratio locked when manually overriding width", () => {
    const result = calculateSizingRecommendation({
      uploadedFile: svgFile(200, 100),
      productConfig: baseConfig,
      manualOverride: { enabled: true, widthMm: 100, lastEditedDimension: "width" },
    });

    expect(result.recommendedWidthMm).toBe(100);
    expect(result.recommendedHeightMm).toBe(50);
  });

  it("keeps aspect ratio locked when manually overriding height", () => {
    const result = calculateSizingRecommendation({
      uploadedFile: svgFile(200, 100),
      productConfig: baseConfig,
      manualOverride: { enabled: true, heightMm: 40, lastEditedDimension: "height" },
    });

    expect(result.recommendedWidthMm).toBe(80);
    expect(result.recommendedHeightMm).toBe(40);
  });

  it("warns when cupcake charm is manually overridden above 40mm", () => {
    const result = calculateSizingRecommendation({
      uploadedFile: svgFile(100, 100),
      productConfig: { ...baseConfig, productType: "cupcakeCharm", designUse: "cupcakeDecoration" },
      manualOverride: { enabled: true, widthMm: 45, lastEditedDimension: "width" },
    });

    expect(result.warnings.some((warning) => warning.code === "CUPCAKE_CHARM_TOO_LARGE")).toBe(true);
  });

  it("retains a user-edited override value across a product config change (F5.6)", () => {
    const upload = svgFile(200, 100);
    const editedOverride: ManualOverrideState = { enabled: true, widthMm: 100, lastEditedDimension: "width" };

    const beforeChange = calculateSizingRecommendation({
      uploadedFile: upload,
      productConfig: baseConfig,
      manualOverride: editedOverride,
    });
    expect(beforeChange.recommendedWidthMm).toBe(100);

    const afterProductTypeChange = calculateSizingRecommendation({
      uploadedFile: upload,
      productConfig: { ...baseConfig, productType: "cupcakeCharm", designUse: "cupcakeDecoration" },
      manualOverride: editedOverride,
    });

    expect(afterProductTypeChange.recommendedWidthMm).toBe(100);
    expect(afterProductTypeChange.recommendedHeightMm).toBe(50);
  });

  it("re-syncs to the fresh recommendation once override is disabled", () => {
    const upload = svgFile(200, 100);

    const afterDisable = calculateSizingRecommendation({
      uploadedFile: upload,
      productConfig: { ...baseConfig, productType: "cupcakeCharm", designUse: "cupcakeDecoration" },
      manualOverride: { enabled: false, widthMm: 100, lastEditedDimension: "width" },
    });

    expect(afterDisable.recommendedWidthMm).not.toBe(100);
    expect(afterDisable.isManualOverride).toBe(false);
  });
});

function svgFile(width: number | null, height: number | null): UploadedDesignMetadata {
  return {
    name: "design.svg",
    type: "svg",
    originalWidth: width,
    originalHeight: height,
    originalUnit: "unitless",
    rawSvgText: '<svg viewBox="0 0 100 100"><path d="M0 0" /></svg>',
    dimensionsDetected: width !== null && height !== null,
    errors: [],
  };
}
