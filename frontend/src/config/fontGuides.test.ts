import { describe, expect, it } from "vitest";
import { FONT_GUIDES, fontGuideLabels, resolveGuideFont, type FontGuide } from "./fontGuides";
import type { FontInfo } from "../types/design";

const font = (id: string, family: string, style = "Regular", source: FontInfo["source"] = "project"): FontInfo => ({ id, family, full_name: `${family} ${style}`, style, source });
const guide = (id: string): FontGuide => FONT_GUIDES.find(item => item.id === id)!;

describe("customer font guide identities", () => {
  it("preserves all 18 customer numbers and independent numeral/alphabet options", () => {
    expect(FONT_GUIDES.filter(item => item.group === "names" && item.number).map(item => item.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(guide("names-9").name).toBe("Joseph");
    expect(guide("numbers-1").name).toBe("Josephsophia");
    expect(guide("capitals-1").name).toBe("Crimson Pro");
    expect(guide("ampersands-1").name).toBe("Arbutus Slab");
  });
  it("resolves explicit family aliases while rejecting similar but different fonts", () => {
    const ayshana = font("ayshana", "Ayshana Script");
    expect(resolveGuideFont(guide("names-1"), [ayshana])?.id).toBe("ayshana");
    expect(resolveGuideFont(guide("names-4"), [font("wrong", "Home Town Sans")])).toBeUndefined();
    expect(resolveGuideFont(guide("ampersands-3"), [font("wrong", "Sugar Cookie")])).toBeUndefined();
    expect(resolveGuideFont(guide("names-8"), [font("wrong", "Alexandra")])).toBeUndefined();
  });
  it("requires the requested style and prefers a local project copy deterministically", () => {
    const regular = font("regular", "Dancing Script");
    const bold = font("bold", "Dancing Script", "Bold");
    expect(resolveGuideFont(guide("scripts-6"), [regular])).toBeUndefined();
    expect(resolveGuideFont(guide("scripts-6"), [regular, bold])?.id).toBe("bold");
    expect(resolveGuideFont(guide("names-10"), [font("system", "Pacifico", "Regular", "system"), font("project", "Pacifico")])?.id).toBe("project");
    expect(resolveGuideFont(guide("numbers-5"), [font("sign", "SignPainter", "Medium")])?.id).toBe("sign");
  });
  it("keeps the unidentified ampersand unresolved and matches the seven Happy chart options", () => {
    expect(resolveGuideFont(guide("ampersands-6"), [font("anything", "Unlabelled ampersand")])).toBeUndefined();
    expect(FONT_GUIDES.filter(item => item.group === "happy")).toHaveLength(7);
    expect(FONT_GUIDES.filter(item => item.group === "happy").map(item => [item.number, item.name])).toEqual([
      [1, "Fraga Script"], [2, "Back to Black"], [3, "Amsterdam"], [4, "Pacifico"],
      [5, "Peanut Butter"], [6, "Manda Script"], [7, "Navisha Script"],
    ]);
  });
});

it("maps missing name fonts and keeps customer chart numbers independent", () => {
  const cheery = font("cheery", "Cheery Note");
  const back = font("back", "Back to Black Bold Demo");
  expect(resolveGuideFont(guide("names-14"), [cheery])?.id).toBe("cheery");
  expect(resolveGuideFont(guide("names-back-to-black"), [back])?.id).toBe("back");
  expect(fontGuideLabels(back)).toContain("Happy Option 2");
  expect(fontGuideLabels(font("pacifico", "Pacifico"))).toEqual(["Name Font 10", "Acrylic Font 12", "Happy Option 4"]);
  expect(FONT_GUIDES.filter(item => item.group === "scripts").map(item => item.number)).toEqual(Array.from({length: 13}, (_, i) => i + 1));
});
