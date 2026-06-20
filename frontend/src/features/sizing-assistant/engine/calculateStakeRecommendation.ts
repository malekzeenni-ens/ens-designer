import { stakeRules } from "./sizingRules";
import type {
  CakeSize,
  DesignUse,
  MaterialType,
  ProductType,
  SizingWarning,
  StakeOption,
  StakeRecommendation,
} from "./sizingTypes";

export function stakeApplies(productType: ProductType): boolean {
  return (stakeRules.appliesTo as readonly ProductType[]).includes(productType);
}

export function calculateStakeRecommendation(input: {
  productType: ProductType;
  cakeSize: CakeSize;
  material: MaterialType;
  designUse: DesignUse;
  visibleWidthMm: number;
  visibleHeightMm: number;
  stakeOption: StakeOption;
}): {
  stakeDepthMm?: number;
  stakeRecommendation: StakeRecommendation;
  totalCutHeightMm?: number;
  warnings: SizingWarning[];
} {
  if (!stakeApplies(input.productType)) {
    return { stakeRecommendation: "none", warnings: [] };
  }

  const stakeDepthMm = stakeRules.depths[input.cakeSize].preferred;
  const doubleRecommended =
    input.visibleWidthMm > stakeRules.doubleStakeWidthThresholdMm ||
    (stakeRules.heavyMaterials as readonly MaterialType[]).includes(input.material) ||
    input.designUse === "heroTopper";

  let stakeRecommendation: StakeRecommendation;
  if (input.stakeOption === "none") {
    stakeRecommendation = "none";
  } else if (input.stakeOption === "single") {
    stakeRecommendation = "single";
  } else if (input.stakeOption === "double") {
    stakeRecommendation = "double";
  } else {
    stakeRecommendation = doubleRecommended ? "double" : "single";
  }

  const warnings: SizingWarning[] = [];
  if (doubleRecommended && stakeRecommendation !== "double") {
    warnings.push({
      code: "DOUBLE_STAKE_RECOMMENDED",
      severity: "warning",
      message: "Double stake is recommended for this topper size, material, or hero use.",
      suggestedAction: "Use a double stake unless you have checked balance manually.",
    });
  } else if (stakeRecommendation === "double") {
    warnings.push({
      code: "DOUBLE_STAKE_RECOMMENDED",
      severity: "info",
      message: "Double stake is recommended for better support.",
    });
  }

  return {
    stakeDepthMm: stakeRecommendation === "none" ? undefined : stakeDepthMm,
    stakeRecommendation,
    totalCutHeightMm:
      stakeRecommendation === "none" ? undefined : input.visibleHeightMm + stakeDepthMm,
    warnings,
  };
}
