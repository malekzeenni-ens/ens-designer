import { calculateAspectRatio, calculateAspectRatioCategory } from "./calculateAspectRatioCategory";
import { buildSizingWarnings } from "./buildSizingWarnings";
import { calculateSizingStatus } from "./calculateSizingStatus";
import { calculateStakeRecommendation } from "./calculateStakeRecommendation";
import { cakeSizes, charmSizingRules, topperSizingRules } from "./sizingRules";
import type {
  ManualOverrideState,
  ProductType,
  SizingProductConfig,
  SizingRecommendation,
  UploadedDesignMetadata,
} from "./sizingTypes";

type ProductRule = {
  minWidth: number;
  preferredWidth: number;
  maxWidth: number;
  maxVisibleHeight?: number;
};

export function calculateSizingRecommendation(input: {
  uploadedFile: UploadedDesignMetadata;
  productConfig: SizingProductConfig;
  manualOverride: ManualOverrideState;
}): SizingRecommendation {
  const { uploadedFile, productConfig, manualOverride } = input;
  const dimensionsValid =
    isPositive(uploadedFile.originalWidth) && isPositive(uploadedFile.originalHeight);

  const originalWidth = uploadedFile.originalWidth ?? 1;
  const originalHeight = uploadedFile.originalHeight ?? 1;
  const aspectRatio = dimensionsValid ? calculateAspectRatio(originalWidth, originalHeight) : 1;
  const aspectCategory = calculateAspectRatioCategory(aspectRatio);
  const rule = getProductRule(productConfig.productType, productConfig.cakeSize);

  let widthMm = adjustedPreferredWidth(rule.preferredWidth, aspectCategory);
  let heightMm = widthMm / aspectRatio;
  let heightLimited = false;

  if (rule.maxVisibleHeight && heightMm > rule.maxVisibleHeight) {
    heightMm = rule.maxVisibleHeight;
    widthMm = heightMm * aspectRatio;
    heightLimited = true;
  }

  if (manualOverride.enabled) {
    const override = applyManualOverride(manualOverride, aspectRatio, widthMm, heightMm);
    widthMm = override.widthMm;
    heightMm = override.heightMm;
  }

  const maxAllowedWidthMm = productConfig.maxAllowedWidthMm;
  const maxAllowedHeightMm = productConfig.maxAllowedHeightMm;
  if (maxAllowedWidthMm && widthMm > maxAllowedWidthMm) {
    widthMm = maxAllowedWidthMm;
    heightMm = widthMm / aspectRatio;
  }
  if (maxAllowedHeightMm && heightMm > maxAllowedHeightMm) {
    heightMm = maxAllowedHeightMm;
    widthMm = heightMm * aspectRatio;
    heightLimited = true;
  }

  const roundedWidth = roundMm(widthMm);
  const roundedHeight = roundMm(heightMm);
  const stake = calculateStakeRecommendation({
    productType: productConfig.productType,
    cakeSize: productConfig.cakeSize,
    material: productConfig.material,
    designUse: productConfig.designUse,
    visibleWidthMm: roundedWidth,
    visibleHeightMm: roundedHeight,
    stakeOption: productConfig.stakeOption,
  });

  const baseRecommendation = {
    cakeDiameterMm: cakeSizes[productConfig.cakeSize].diameterMm,
    aspectRatio,
    aspectCategory,
    recommendedWidthMm: roundedWidth,
    recommendedHeightMm: roundedHeight,
    acceptableMinWidthMm: rule.minWidth,
    acceptableMaxWidthMm: rule.maxWidth,
    maxVisibleHeightMm: rule.maxVisibleHeight,
    visibleHeightMm: roundedHeight,
    stakeDepthMm: stake.stakeDepthMm,
    totalCutHeightMm: stake.totalCutHeightMm ? roundMm(stake.totalCutHeightMm) : undefined,
    stakeRecommendation: stake.stakeRecommendation,
    scaleFactor: roundScale(roundedWidth / originalWidth),
    isManualOverride: manualOverride.enabled,
    exportAvailable: uploadedFile.type === "svg" && dimensionsValid,
    heightLimited,
  };

  const warnings = buildSizingWarnings({
    uploadedFile,
    productConfig,
    aspectCategory,
    recommendedWidthMm: roundedWidth,
    recommendedHeightMm: roundedHeight,
    acceptableMinWidthMm: rule.minWidth,
    acceptableMaxWidthMm: rule.maxWidth,
    maxVisibleHeightMm: rule.maxVisibleHeight,
    heightLimited,
    isManualOverride: manualOverride.enabled,
    stakeRecommendation: stake.stakeRecommendation,
    stakeWarnings: stake.warnings,
  });

  const status = calculateSizingStatus({
    dimensionsValid,
    aspectCategory,
    widthMm: roundedWidth,
    heightMm: roundedHeight,
    acceptableMinWidthMm: rule.minWidth,
    acceptableMaxWidthMm: rule.maxWidth,
    maxVisibleHeightMm: rule.maxVisibleHeight,
    warnings,
  });

  return {
    ...baseRecommendation,
    warnings,
    status,
    notes: buildNotes(aspectCategory, manualOverride.enabled, uploadedFile.type),
  };
}

/**
 * Scales the full uploaded artwork to match the recommended width derived from
 * its (possibly cropped) sizing area, so the export/preview reflects the same
 * proportions used to calculate the recommendation. Shared by SizingPreviewPanel
 * and SizingRecommendationCard so the two can't silently desync.
 */
export function getScaledExportDimensions(
  uploadedFile: UploadedDesignMetadata | null,
  recommendation: SizingRecommendation | null,
): { widthMm: number; heightMm: number } | null {
  if (!uploadedFile || !recommendation) return null;
  if (
    uploadedFile.sizingAreaMode === "visibleArtwork" &&
    uploadedFile.originalWidth &&
    uploadedFile.originalHeight &&
    uploadedFile.sizingWidth &&
    uploadedFile.sizingHeight
  ) {
    const scaleFromVisibleWidth = recommendation.recommendedWidthMm / uploadedFile.sizingWidth;
    return {
      widthMm: roundMm(uploadedFile.originalWidth * scaleFromVisibleWidth),
      heightMm: roundMm(uploadedFile.originalHeight * scaleFromVisibleWidth),
    };
  }

  return {
    widthMm: recommendation.recommendedWidthMm,
    heightMm: recommendation.recommendedHeightMm,
  };
}

function getProductRule(productType: ProductType, cakeSize: keyof typeof cakeSizes): ProductRule {
  if (productType in topperSizingRules) {
    const rule = topperSizingRules[productType as keyof typeof topperSizingRules][cakeSize];
    return {
      minWidth: rule.minWidth,
      preferredWidth: rule.preferredWidth,
      maxWidth: rule.maxWidth,
      maxVisibleHeight: rule.maxVisibleHeight,
    };
  }

  const charmRule = charmSizingRules[productType as keyof typeof charmSizingRules];
  return {
    minWidth: charmRule.minWidth,
    preferredWidth: charmRule.defaultWidth,
    maxWidth: charmRule.maxWidth,
    maxVisibleHeight: charmRule.maxVisibleHeight,
  };
}

function adjustedPreferredWidth(preferredWidth: number, aspectCategory: string): number {
  if (aspectCategory === "veryWide") return preferredWidth * 0.92;
  if (aspectCategory === "wide") return preferredWidth * 0.96;
  return preferredWidth;
}

function applyManualOverride(
  manualOverride: ManualOverrideState,
  aspectRatio: number,
  fallbackWidth: number,
  fallbackHeight: number,
): { widthMm: number; heightMm: number } {
  if (manualOverride.lastEditedDimension === "height" && isPositive(manualOverride.heightMm)) {
    const heightMm = manualOverride.heightMm;
    return { widthMm: heightMm * aspectRatio, heightMm };
  }
  if (isPositive(manualOverride.widthMm)) {
    const widthMm = manualOverride.widthMm;
    return { widthMm, heightMm: widthMm / aspectRatio };
  }
  return { widthMm: fallbackWidth, heightMm: fallbackHeight };
}

function buildNotes(aspectCategory: string, isManualOverride: boolean, type: string): string[] {
  const notes = ["Keep aspect ratio locked. Do not stretch the artwork."];
  if (aspectCategory === "balanced") notes.push("Aspect ratio is balanced for visual sizing.");
  if (isManualOverride) notes.push("Manual override is active; final dimensions remain proportional.");
  if (type === "png") notes.push("PNG is preview-only for sizing reference.");
  return notes;
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundScale(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
