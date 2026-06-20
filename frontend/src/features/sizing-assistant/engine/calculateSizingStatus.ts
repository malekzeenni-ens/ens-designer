import { warningThresholds } from "./sizingRules";
import type { AspectCategory, SizingStatus, SizingWarning } from "./sizingTypes";

export function calculateSizingStatus(input: {
  dimensionsValid: boolean;
  aspectCategory: AspectCategory;
  widthMm: number;
  heightMm: number;
  acceptableMinWidthMm: number;
  acceptableMaxWidthMm: number;
  maxVisibleHeightMm?: number;
  warnings: SizingWarning[];
}): SizingStatus {
  const codes = new Set(input.warnings.map((warning) => warning.code));

  if (!input.dimensionsValid || codes.has("SVG_DIMENSIONS_MISSING")) {
    return "notRecommended";
  }

  if (
    codes.has("WIDTH_ABOVE_RECOMMENDED_RANGE") ||
    input.widthMm > input.acceptableMaxWidthMm ||
    (input.aspectCategory === "veryWide" && input.heightMm < warningThresholds.verySmallHeightMm)
  ) {
    return "tooWide";
  }

  if (
    codes.has("HEIGHT_EXCEEDS_GUIDANCE") &&
    input.widthMm < input.acceptableMinWidthMm
  ) {
    return "tooTall";
  }

  if (
    codes.has("WIDTH_BELOW_RECOMMENDED_RANGE") ||
    input.widthMm < warningThresholds.verySmallWidthMm ||
    input.heightMm < warningThresholds.verySmallHeightMm ||
    codes.has("LOGO_MAY_BE_UNREADABLE")
  ) {
    return "tooSmall";
  }

  if (input.warnings.length > 0) {
    return "needsReview";
  }

  return "goodToCut";
}
