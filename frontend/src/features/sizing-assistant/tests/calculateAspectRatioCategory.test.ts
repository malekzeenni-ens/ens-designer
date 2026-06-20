import { describe, expect, it } from "vitest";

import { calculateAspectRatio, calculateAspectRatioCategory } from "../engine/calculateAspectRatioCategory";

describe("calculateAspectRatioCategory", () => {
  it.each([
    [0.49, "veryTall"],
    [0.5, "tall"],
    [0.79, "tall"],
    [0.8, "balanced"],
    [1.4, "balanced"],
    [1.41, "wide"],
    [2.2, "wide"],
    [2.21, "veryWide"],
  ] as const)("categorises %s as %s", (ratio, category) => {
    expect(calculateAspectRatioCategory(ratio)).toBe(category);
  });

  it("calculates aspect ratio from width and height", () => {
    expect(calculateAspectRatio(120, 80)).toBe(1.5);
  });
});
