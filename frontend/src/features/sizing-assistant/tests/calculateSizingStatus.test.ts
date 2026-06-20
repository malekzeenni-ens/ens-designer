import { describe, expect, it } from "vitest";

import { calculateSizingStatus } from "../engine/calculateSizingStatus";
import type { SizingWarning } from "../engine/sizingTypes";

describe("calculateSizingStatus", () => {
  it("uses deterministic status precedence", () => {
    const status = calculateSizingStatus({
      dimensionsValid: false,
      aspectCategory: "veryWide",
      widthMm: 999,
      heightMm: 1,
      acceptableMinWidthMm: 100,
      acceptableMaxWidthMm: 120,
      warnings: [warning("WIDTH_ABOVE_RECOMMENDED_RANGE")],
    });

    expect(status).toBe("notRecommended");
  });

  it("returns good to cut when there are no warnings", () => {
    const status = calculateSizingStatus({
      dimensionsValid: true,
      aspectCategory: "balanced",
      widthMm: 110,
      heightMm: 80,
      acceptableMinWidthMm: 100,
      acceptableMaxWidthMm: 120,
      warnings: [],
    });

    expect(status).toBe("goodToCut");
  });

  it("returns needs review for non-critical warnings", () => {
    const status = calculateSizingStatus({
      dimensionsValid: true,
      aspectCategory: "wide",
      widthMm: 110,
      heightMm: 80,
      acceptableMinWidthMm: 100,
      acceptableMaxWidthMm: 120,
      warnings: [warning("WIDE_DESIGN")],
    });

    expect(status).toBe("needsReview");
  });
});

function warning(code: SizingWarning["code"]): SizingWarning {
  return {
    code,
    severity: "warning",
    message: code,
  };
}
