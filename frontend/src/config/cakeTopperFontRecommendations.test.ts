import { describe, expect, it } from "vitest";
import type { FontInfo } from "../types/design";
import { getFontClassification, getStructuralScore } from "./cakeTopperFontRecommendations";

function makeFont(full_name: string, family = full_name): FontInfo {
  return { id: "test-id", family, full_name, style: "Regular", source: "project" };
}

describe("structural score integration (B3.8)", () => {
  it("applies a measured structural score for a font present in fontStructuralScores.json", () => {
    const font = makeFont("Agency FB");
    expect(getStructuralScore(font)).toBeCloseTo(59.1, 1);

    const classification = getFontClassification(font);
    expect(classification.score).toBe(59);
    expect(classification.riskLevel).toBe("medium");
  });

  it("falls back to the heuristic classification for a font missing from fontStructuralScores.json", () => {
    const font = makeFont("Totally Unmeasured Font Name");
    expect(getStructuralScore(font)).toBeUndefined();

    expect(() => getFontClassification(font)).not.toThrow();
    const classification = getFontClassification(font);
    expect(classification.category).toBe("uncategorised");
  });
});
