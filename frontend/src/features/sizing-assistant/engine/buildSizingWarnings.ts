import { stakeRules, warningThresholds } from "./sizingRules";
import type {
  AspectCategory,
  MaterialType,
  ProductType,
  SizingWarning,
  UploadedDesignMetadata,
  SizingProductConfig,
  StakeRecommendation,
} from "./sizingTypes";

export function buildSizingWarnings(input: {
  uploadedFile: UploadedDesignMetadata;
  productConfig: SizingProductConfig;
  aspectCategory: AspectCategory;
  recommendedWidthMm: number;
  recommendedHeightMm: number;
  acceptableMinWidthMm: number;
  acceptableMaxWidthMm: number;
  maxVisibleHeightMm?: number;
  heightLimited: boolean;
  isManualOverride: boolean;
  stakeRecommendation: StakeRecommendation;
  stakeWarnings?: SizingWarning[];
}): SizingWarning[] {
  const warnings: SizingWarning[] = [];
  const {
    uploadedFile,
    productConfig,
    aspectCategory,
    recommendedWidthMm,
    recommendedHeightMm,
    acceptableMinWidthMm,
    acceptableMaxWidthMm,
    maxVisibleHeightMm,
  } = input;

  if (uploadedFile.type === "png") {
    warnings.push({
      code: "PNG_PREVIEW_ONLY",
      severity: "warning",
      message: "PNG is suitable for preview sizing only. For laser cutting, SVG is recommended.",
    });
    warnings.push({
      code: "EXPORT_UNAVAILABLE_FOR_PNG",
      severity: "info",
      message: "SVG export is only available for SVG uploads.",
      suggestedAction: "Upload the final vector SVG for production export.",
    });
  }

  if (uploadedFile.type === "svg" && !uploadedFile.dimensionsDetected) {
    warnings.push({
      code: "SVG_DIMENSIONS_MISSING",
      severity: "critical",
      message: "The SVG dimensions could not be detected.",
      suggestedAction: "Enter the original design width and height manually before exporting.",
    });
  }

  if (aspectCategory === "veryWide") {
    warnings.push({
      code: "VERY_WIDE_DESIGN",
      severity: "warning",
      message: "This design is very wide. It may look too small when scaled to fit the selected cake size.",
      suggestedAction: "Consider stacking the words into two or three lines.",
    });
  } else if (aspectCategory === "wide") {
    warnings.push({
      code: "WIDE_DESIGN",
      severity: "info",
      message: "This design is wide. Check that the final height remains readable.",
    });
  }

  if (aspectCategory === "veryTall") {
    warnings.push({
      code: "VERY_TALL_DESIGN",
      severity: "warning",
      message: "This design is very tall and may overpower the cake.",
      suggestedAction: "Consider reducing the number of lines or using a wider layout.",
    });
  } else if (aspectCategory === "tall") {
    warnings.push({
      code: "TALL_DESIGN",
      severity: "info",
      message: "This design is tall. Check visual balance against the selected cake size.",
    });
  }

  if (input.heightLimited || (maxVisibleHeightMm && recommendedHeightMm > maxVisibleHeightMm)) {
    warnings.push({
      code: "HEIGHT_EXCEEDS_GUIDANCE",
      severity: "warning",
      message: "The design exceeds the visible height guidance and has been scaled proportionally.",
      suggestedAction: "Do not squash the artwork; consider changing the layout if it feels too small.",
    });
  }

  if (recommendedWidthMm < acceptableMinWidthMm) {
    warnings.push({
      code: "WIDTH_BELOW_RECOMMENDED_RANGE",
      severity: "warning",
      message: "The proportional size falls below the recommended width range.",
      suggestedAction: "Review readability before cutting.",
    });
  }

  if (recommendedWidthMm > acceptableMaxWidthMm) {
    warnings.push({
      code: "WIDTH_ABOVE_RECOMMENDED_RANGE",
      severity: "warning",
      message: "The proportional size is above the recommended width range.",
      suggestedAction: "Check cake fit and customer expectations before cutting.",
    });
  }

  if (
    productConfig.productType === "cupcakeCharm" &&
    recommendedWidthMm > warningThresholds.cupcakeMaxRecommendedWidthMm
  ) {
    warnings.push({
      code: "CUPCAKE_CHARM_TOO_LARGE",
      severity: "warning",
      message: "Cupcake charms are normally kept under 40mm. This size may look too large on cupcakes.",
    });
  }

  if (
    productConfig.productType === "logoCakeCharm" &&
    (recommendedWidthMm < warningThresholds.logoMinReadableWidthMm ||
      aspectCategory === "veryWide" ||
      isFragileFont(productConfig.fontCategory))
  ) {
    warnings.push({
      code: "LOGO_MAY_BE_UNREADABLE",
      severity: "warning",
      message: "This logo charm may become hard to read at the recommended size.",
      suggestedAction: "Check fine detail manually before cutting.",
    });
  }

  if (isFragileFont(productConfig.fontCategory)) {
    warnings.push({
      code: "THIN_FONT_MANUAL_CHECK",
      severity: "warning",
      message: "Thin or script fonts may become fragile when cut small. Please manually check the thinnest parts before cutting.",
    });
  }

  if (input.isManualOverride && isManualOverrideOutsideRange(recommendedWidthMm, acceptableMinWidthMm, acceptableMaxWidthMm)) {
    warnings.push({
      code: "MANUAL_OVERRIDE_OUTSIDE_RANGE",
      severity: "warning",
      message: "This size is outside the recommended range. Proceed only if you have checked the design manually.",
    });
  }

  if (isHeavyMaterial(productConfig.material)) {
    warnings.push({
      code: "MIRROR_OR_LAYERED_ACRYLIC_CAUTION",
      severity: "info",
      message: "Mirror or layered acrylic may need extra support and manual handling checks.",
    });
  }

  if (
    input.stakeRecommendation === "double" ||
    input.stakeWarnings?.some((warning) => warning.code === "DOUBLE_STAKE_RECOMMENDED")
  ) {
    warnings.push(...(input.stakeWarnings ?? []));
  }

  return dedupeWarnings(warnings);
}

function isFragileFont(fontCategory: string): boolean {
  return ["thin", "script", "decorative", "handwritten"].includes(fontCategory);
}

function isHeavyMaterial(material: MaterialType): boolean {
  return (stakeRules.heavyMaterials as readonly MaterialType[]).includes(material);
}

function isManualOverrideOutsideRange(width: number, min: number, max: number): boolean {
  const tolerance = warningThresholds.manualOverrideTolerancePercent / 100;
  return width < min * (1 - tolerance) || width > max * (1 + tolerance);
}

function dedupeWarnings(warnings: SizingWarning[]): SizingWarning[] {
  const byCode = new Map<string, SizingWarning>();
  warnings.forEach((warning) => {
    const existing = byCode.get(warning.code);
    if (!existing || severityRank(warning.severity) > severityRank(existing.severity)) {
      byCode.set(warning.code, warning);
    }
  });
  return [...byCode.values()];
}

function severityRank(severity: SizingWarning["severity"]): number {
  return severity === "critical" ? 3 : severity === "warning" ? 2 : 1;
}
