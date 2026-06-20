import { describe, expect, it } from "vitest";

import {
  parsePngDimensionsFromArrayBuffer,
  parseSvgDimensions,
} from "../engine/parseDesignDimensions";

describe("parseDesignDimensions", () => {
  it("prefers SVG viewBox dimensions", () => {
    const parsed = parseSvgDimensions('<svg width="10mm" height="20mm" viewBox="0 0 120 80"><path /></svg>');

    expect(parsed.dimensionsDetected).toBe(true);
    expect(parsed.width).toBe(120);
    expect(parsed.height).toBe(80);
    expect(parsed.unit).toBe("unitless");
  });

  it("falls back to SVG width and height in mm", () => {
    const parsed = parseSvgDimensions('<svg width="90mm" height="45mm"><path /></svg>');

    expect(parsed.dimensionsDetected).toBe(true);
    expect(parsed.width).toBe(90);
    expect(parsed.height).toBe(45);
    expect(parsed.unit).toBe("mm");
  });

  it("falls back to SVG width and height in px", () => {
    const parsed = parseSvgDimensions('<svg width="300px" height="150px"><path /></svg>');

    expect(parsed.dimensionsDetected).toBe(true);
    expect(parsed.width).toBe(300);
    expect(parsed.height).toBe(150);
    expect(parsed.unit).toBe("px");
  });

  it("requires manual dimensions for percentage-only SVG dimensions", () => {
    const parsed = parseSvgDimensions('<svg width="100%" height="100%"><path /></svg>');

    expect(parsed.dimensionsDetected).toBe(false);
    expect(parsed.width).toBeNull();
    expect(parsed.height).toBeNull();
  });

  it("reads PNG dimensions from the IHDR chunk", () => {
    const parsed = parsePngDimensionsFromArrayBuffer(makePngHeader(640, 320));

    expect(parsed.dimensionsDetected).toBe(true);
    expect(parsed.width).toBe(640);
    expect(parsed.height).toBe(320);
    expect(parsed.unit).toBe("px");
  });
});

function makePngHeader(width: number, height: number): ArrayBuffer {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes.buffer;
}
