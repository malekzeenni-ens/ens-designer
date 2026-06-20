import { describe, expect, it } from "vitest";

import { buildSizingWarnings } from "../engine/buildSizingWarnings";
import type { SizingProductConfig, UploadedDesignMetadata } from "../engine/sizingTypes";

const uploadedFile: UploadedDesignMetadata = {
  name: "design.svg",
  type: "svg",
  originalWidth: 100,
  originalHeight: 100,
  originalUnit: "unitless",
  dimensionsDetected: true,
  errors: [],
};

const config: SizingProductConfig = {
  productType: "topCakeTopper",
  cakeSize: "6",
  material: "3mmAcrylic",
  designUse: "subtleCharm",
  fontCategory: "unknown",
  stakeOption: "auto",
};

describe("buildSizingWarnings", () => {
  it("generates wide and tall design warnings", () => {
    expect(warningsFor("veryWide")).toContain("VERY_WIDE_DESIGN");
    expect(warningsFor("wide")).toContain("WIDE_DESIGN");
    expect(warningsFor("veryTall")).toContain("VERY_TALL_DESIGN");
    expect(warningsFor("tall")).toContain("TALL_DESIGN");
  });

  it("generates PNG preview-only warnings", () => {
    const warnings = buildSizingWarnings({
      uploadedFile: { ...uploadedFile, type: "png" },
      productConfig: config,
      aspectCategory: "balanced",
      recommendedWidthMm: 120,
      recommendedHeightMm: 80,
      acceptableMinWidthMm: 105,
      acceptableMaxWidthMm: 130,
      heightLimited: false,
      isManualOverride: false,
      stakeRecommendation: "none",
    });

    expect(warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["PNG_PREVIEW_ONLY", "EXPORT_UNAVAILABLE_FOR_PNG"]),
    );
  });

  it("generates thin font and mirror acrylic warnings", () => {
    const warnings = buildSizingWarnings({
      uploadedFile,
      productConfig: { ...config, fontCategory: "thin", material: "mirrorAcrylic" },
      aspectCategory: "balanced",
      recommendedWidthMm: 120,
      recommendedHeightMm: 80,
      acceptableMinWidthMm: 105,
      acceptableMaxWidthMm: 130,
      heightLimited: false,
      isManualOverride: false,
      stakeRecommendation: "none",
    });

    expect(warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["THIN_FONT_MANUAL_CHECK", "MIRROR_OR_LAYERED_ACRYLIC_CAUTION"]),
    );
  });
});

function warningsFor(aspectCategory: "veryWide" | "wide" | "veryTall" | "tall") {
  return buildSizingWarnings({
    uploadedFile,
    productConfig: config,
    aspectCategory,
    recommendedWidthMm: 120,
    recommendedHeightMm: 80,
    acceptableMinWidthMm: 105,
    acceptableMaxWidthMm: 130,
    heightLimited: false,
    isManualOverride: false,
    stakeRecommendation: "none",
  }).map((warning) => warning.code);
}
