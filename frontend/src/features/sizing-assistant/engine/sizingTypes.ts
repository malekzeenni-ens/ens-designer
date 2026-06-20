export type UploadedDesignType = "svg" | "png";

export type ProductType =
  | "topCakeTopper"
  | "sideCakeCharm"
  | "cupcakeCharm"
  | "logoCakeCharm"
  | "numberTopper"
  | "monogramTopper";

export type CakeSize = "4" | "6" | "8" | "10";

export type MaterialType =
  | "3mmAcrylic"
  | "mirrorAcrylic"
  | "layeredAcrylic"
  | "3mmPlywood"
  | "other";

export type DesignUse =
  | "heroTopper"
  | "subtleCharm"
  | "logoBranding"
  | "cupcakeDecoration"
  | "weddingMonogram"
  | "numberFeature";

export type FontCategory =
  | "unknown"
  | "script"
  | "serif"
  | "sansSerif"
  | "chunky"
  | "thin"
  | "handwritten"
  | "decorative";

export type StakeOption = "auto" | "none" | "single" | "double";
export type AspectCategory = "veryTall" | "tall" | "balanced" | "wide" | "veryWide";
export type SizingStatus =
  | "goodToCut"
  | "needsReview"
  | "tooWide"
  | "tooTall"
  | "tooSmall"
  | "notRecommended";
export type WarningSeverity = "info" | "warning" | "critical";
export type StakeRecommendation = "none" | "single" | "double";
export type DimensionUnit = "px" | "mm" | "unitless" | "unknown";

export type UploadedDesignMetadata = {
  name: string;
  type: UploadedDesignType;
  originalWidth: number | null;
  originalHeight: number | null;
  originalUnit: DimensionUnit;
  viewBox?: string;
  rawSvgText?: string;
  previewUrl?: string;
  dimensionsDetected: boolean;
  errors: string[];
};

export type SizingProductConfig = {
  productType: ProductType;
  cakeSize: CakeSize;
  material: MaterialType;
  designUse: DesignUse;
  numberOfLines?: number;
  fontCategory: FontCategory;
  stakeOption: StakeOption;
  maxAllowedWidthMm?: number;
  maxAllowedHeightMm?: number;
  customerRequestedWidthMm?: number;
};

export type ManualOverrideState = {
  enabled: boolean;
  widthMm?: number;
  heightMm?: number;
  lastEditedDimension?: "width" | "height";
};

export type SizingWarningCode =
  | "VERY_WIDE_DESIGN"
  | "WIDE_DESIGN"
  | "VERY_TALL_DESIGN"
  | "TALL_DESIGN"
  | "HEIGHT_EXCEEDS_GUIDANCE"
  | "WIDTH_BELOW_RECOMMENDED_RANGE"
  | "WIDTH_ABOVE_RECOMMENDED_RANGE"
  | "CUPCAKE_CHARM_TOO_LARGE"
  | "LOGO_MAY_BE_UNREADABLE"
  | "THIN_FONT_MANUAL_CHECK"
  | "PNG_PREVIEW_ONLY"
  | "MANUAL_OVERRIDE_OUTSIDE_RANGE"
  | "MIRROR_OR_LAYERED_ACRYLIC_CAUTION"
  | "DOUBLE_STAKE_RECOMMENDED"
  | "SVG_DIMENSIONS_MISSING"
  | "EXPORT_UNAVAILABLE_FOR_PNG";

export type SizingWarning = {
  code: SizingWarningCode;
  severity: WarningSeverity;
  message: string;
  suggestedAction?: string;
};

export type SizingRecommendation = {
  cakeDiameterMm: number;
  aspectRatio: number;
  aspectCategory: AspectCategory;
  recommendedWidthMm: number;
  recommendedHeightMm: number;
  acceptableMinWidthMm: number;
  acceptableMaxWidthMm: number;
  maxVisibleHeightMm?: number;
  visibleHeightMm: number;
  stakeDepthMm?: number;
  totalCutHeightMm?: number;
  stakeRecommendation: StakeRecommendation;
  scaleFactor: number;
  status: SizingStatus;
  warnings: SizingWarning[];
  notes: string[];
  isManualOverride: boolean;
  exportAvailable: boolean;
  heightLimited: boolean;
};

export type ParsedDesignDimensions = {
  width: number | null;
  height: number | null;
  unit: DimensionUnit;
  viewBox?: string;
  dimensionsDetected: boolean;
  errors: string[];
};

export type SizingAssistantState = {
  uploadedFile: UploadedDesignMetadata | null;
  productConfig: SizingProductConfig;
  manualOverride: ManualOverrideState;
  recommendation: SizingRecommendation | null;
};
