import { describe, expect, it } from "vitest";

import { exportPreviewPlacementSvg, exportResizedSvg } from "../engine/exportResizedSvg";
import { buildSizedSvgFilename } from "../engine/filenameUtils";

describe("exportResizedSvg", () => {
  it("sets SVG export dimensions in mm and preserves viewBox/content", () => {
    const exported = exportResizedSvg({
      rawSvgText: '<svg viewBox="0 0 120 80"><path id="shape" d="M0 0h120v80z" /></svg>',
      widthMm: 120,
      heightMm: 80,
    });

    expect(exported).toContain('width="120mm"');
    expect(exported).toContain('height="80mm"');
    expect(exported).toContain('viewBox="0 0 120 80"');
    expect(exported).toContain('id="shape"');
  });

  it("generates the recommended production filename", () => {
    expect(
      buildSizedSvgFilename({
        productType: "topCakeTopper",
        cakeSize: "6",
        widthMm: 120,
        heightMm: 89,
      }),
    ).toBe("ens-sized-top-cake-topper-6inch-120x89mm.svg");
  });

  it("exports preview placement with a larger millimetre canvas and transform", () => {
    const exported = exportPreviewPlacementSvg({
      rawSvgText: '<svg viewBox="0 0 100 50"><path id="shape" d="M0 0h100v50z" /></svg>',
      widthMm: 120,
      heightMm: 60,
      offsetXPct: 10,
      offsetYPct: -5,
      rotationDeg: 12,
    });

    expect(exported).toContain('width="216mm"');
    expect(exported).toContain('height="108mm"');
    expect(exported).toContain('viewBox="0 0 216 108"');
    expect(exported).toContain("rotate(12)");
    expect(exported).toContain('id="shape"');
  });
});
