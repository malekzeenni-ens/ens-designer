import { describe, expect, it } from "vitest";
import { designFromRecipe, designReducer } from "../state/keychainReducer";
import { DEFAULT_DESIGN } from "../state/keychainTypes";
import { fromMm, toMm, toRequest } from "../utils/units";
import { pointerInMm } from "../components/KeychainPreview";
import { matchesFontStyle, suitability } from "../components/FontSection";

describe("Keychain design and physical units", () => {
  it("sends a disabled-export placeholder without changing empty UI text", () => {
    expect(toRequest(DEFAULT_DESIGN).text).toBe("Name");
    expect(DEFAULT_DESIGN.text).toBe("");
    expect(toRequest({ ...DEFAULT_DESIGN, text: " Zoe\u0308 " }).text).toBe("Zoë");
  });
  it("keeps styling and ring settings but removes name-specific cluster indices", () => {
    const design = { ...DEFAULT_DESIGN, text: "Sarah", font_id: "custom", colors: { backing: "#123456", text: "#654321" }, glyph_transforms: [{ glyph_index: 4, dx_mm: 1, dy_mm: 0, scale: 1, rotation_deg: 0 }] };
    const next = designReducer(design, { type: "name", value: "Jo" });
    expect(next.font_id).toBe("custom"); expect(next.colors).toEqual(design.colors);
    expect(next.ring).toEqual(design.ring); expect(next.glyph_transforms).toEqual([]);
  });
  it.each([["name", 60, 12, 5], ["mini", 40, 10, 4], ["bag", 90, 15, 6]] as const)("applies %s preset dimensions", (preset, width, outer, hole) => {
    const design = designReducer(DEFAULT_DESIGN, { type: "preset", value: preset });
    expect(design.size.target_mm).toBe(width); expect(design.ring.outer_diameter_mm).toBe(outer); expect(design.ring.hole_diameter_mm).toBe(hole);
  });
  it("converts display units without scaling the physical request", () => {
    expect(fromMm(60, "cm")).toBe(6); expect(toMm(1, "in")).toBe(25.4);
    expect(toMm(fromMm(60, "in"), "in")).toBeCloseTo(60, 8);
  });
  it("loads only editable recipe fields and does not retain transport metadata", () => {
    const design = designFromRecipe({ ...DEFAULT_DESIGN, text: "Jo", request_id: 100, app_version: "keychain-1" } as never);
    expect(design.text).toBe("Jo"); expect(design).not.toHaveProperty("request_id"); expect(design).not.toHaveProperty("app_version");
    design.ring.enabled = false; expect(DEFAULT_DESIGN.ring.enabled).toBe(true);
  });
  it("maps canvas pointer coordinates through letterboxing and zoom", () => {
    expect(pointerInMm(500, 200, { left: 100, top: 100, width: 800, height: 200 }, 100, 100)).toEqual({ x: 50, y: 50 });
    expect(pointerInMm(520, 200, { left: 100, top: 100, width: 800, height: 200 }, 100, 100)).toEqual({ x: 60, y: 50 });
  });
  it("includes bold faces in Bold / Display without inventing unknown font badges", () => {
    const font = { id: "unknown", family: "Example", full_name: "Example", style: "Bold", source: "project" as const };
    expect(matchesFontStyle(font, "display")).toBe(true);
    expect(suitability({ ...font, style: "Regular", full_name: "Unclassified123" })).toBeNull();
  });
});
