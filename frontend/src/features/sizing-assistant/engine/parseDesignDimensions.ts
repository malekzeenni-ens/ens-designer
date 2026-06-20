import type { DimensionUnit, ParsedDesignDimensions } from "./sizingTypes";

const SVG_DIMENSION_PATTERN = /^\s*([+-]?\d*\.?\d+)(mm|px)?\s*$/i;

export function parseSvgDimensions(svgText: string): ParsedDesignDimensions {
  const errors: string[] = [];
  let doc: Document;

  try {
    doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  } catch {
    return missing("The SVG could not be parsed.");
  }

  if (doc.querySelector("parsererror")) {
    return missing("The SVG could not be parsed.");
  }

  const svg = doc.querySelector("svg");
  if (!svg) {
    return missing("No root SVG element was found.");
  }

  const viewBox = svg.getAttribute("viewBox") ?? svg.getAttribute("viewbox") ?? undefined;
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    const width = parts[2];
    const height = parts[3];
    if (parts.length === 4 && isPositive(width) && isPositive(height)) {
      return {
        width,
        height,
        unit: "unitless",
        viewBox,
        dimensionsDetected: true,
        errors: [],
      };
    }
    errors.push("The SVG viewBox is invalid.");
  }

  const widthAttr = svg.getAttribute("width");
  const heightAttr = svg.getAttribute("height");
  const width = parseLength(widthAttr);
  const height = parseLength(heightAttr);
  if (width.value !== null && height.value !== null) {
    return {
      width: width.value,
      height: height.value,
      unit: width.unit === height.unit ? width.unit : "unknown",
      viewBox,
      dimensionsDetected: true,
      errors,
    };
  }

  if (widthAttr?.includes("%") || heightAttr?.includes("%")) {
    errors.push("Percentage SVG dimensions require a viewBox.");
  }

  return {
    width: null,
    height: null,
    unit: "unknown",
    viewBox,
    dimensionsDetected: false,
    errors: errors.length ? errors : ["The SVG dimensions could not be detected."],
  };
}

export async function parsePngDimensions(file: File): Promise<ParsedDesignDimensions> {
  return parsePngDimensionsFromArrayBuffer(await file.arrayBuffer());
}

export function parsePngDimensionsFromArrayBuffer(buffer: ArrayBuffer): ParsedDesignDimensions {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const validSignature = signature.every((value, index) => bytes[index] === value);
  if (!validSignature || bytes.length < 24) {
    return missing("The PNG dimensions could not be detected.");
  }

  const view = new DataView(buffer);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!isPositive(width) || !isPositive(height)) {
    return missing("The PNG dimensions could not be detected.");
  }

  return {
    width,
    height,
    unit: "px",
    dimensionsDetected: true,
    errors: [],
  };
}

function parseLength(value: string | null): { value: number | null; unit: DimensionUnit } {
  if (!value) return { value: null, unit: "unknown" };
  if (value.trim().endsWith("%")) return { value: null, unit: "unknown" };

  const match = value.match(SVG_DIMENSION_PATTERN);
  if (!match) return { value: null, unit: "unknown" };

  const rawNumber = match[1];
  if (!rawNumber) return { value: null, unit: "unknown" };

  const number = Number(rawNumber);
  if (!isPositive(number)) return { value: null, unit: "unknown" };

  const unit = (match[2]?.toLowerCase() as "mm" | "px" | undefined) ?? "unitless";
  return { value: number, unit };
}

function missing(error: string): ParsedDesignDimensions {
  return {
    width: null,
    height: null,
    unit: "unknown",
    dimensionsDetected: false,
    errors: [error],
  };
}

function isPositive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
