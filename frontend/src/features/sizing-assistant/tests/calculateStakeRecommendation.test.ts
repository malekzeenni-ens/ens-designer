import { describe, expect, it } from "vitest";

import { calculateStakeRecommendation, stakeApplies } from "../engine/calculateStakeRecommendation";

describe("calculateStakeRecommendation", () => {
  it("applies only to topper product types", () => {
    expect(stakeApplies("topCakeTopper")).toBe(true);
    expect(stakeApplies("numberTopper")).toBe(true);
    expect(stakeApplies("monogramTopper")).toBe(true);
    expect(stakeApplies("cupcakeCharm")).toBe(false);
  });

  it("recommends double stake above 120mm", () => {
    const result = calculateStakeRecommendation({
      productType: "topCakeTopper",
      cakeSize: "6",
      material: "3mmAcrylic",
      designUse: "subtleCharm",
      visibleWidthMm: 121,
      visibleHeightMm: 80,
      stakeOption: "auto",
    });

    expect(result.stakeRecommendation).toBe("double");
    expect(result.stakeDepthMm).toBe(45);
    expect(result.totalCutHeightMm).toBe(125);
  });

  it("recommends double stake for mirror acrylic", () => {
    const result = calculateStakeRecommendation({
      productType: "topCakeTopper",
      cakeSize: "4",
      material: "mirrorAcrylic",
      designUse: "subtleCharm",
      visibleWidthMm: 90,
      visibleHeightMm: 60,
      stakeOption: "auto",
    });

    expect(result.stakeRecommendation).toBe("double");
  });

  it("allows manual single stake but warns when risky", () => {
    const result = calculateStakeRecommendation({
      productType: "topCakeTopper",
      cakeSize: "8",
      material: "layeredAcrylic",
      designUse: "heroTopper",
      visibleWidthMm: 150,
      visibleHeightMm: 100,
      stakeOption: "single",
    });

    expect(result.stakeRecommendation).toBe("single");
    expect(result.warnings.some((warning) => warning.code === "DOUBLE_STAKE_RECOMMENDED")).toBe(true);
  });
});
