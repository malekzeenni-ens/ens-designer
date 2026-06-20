export function exportResizedSvg(input: {
  rawSvgText: string;
  widthMm: number;
  heightMm: number;
}): string {
  if (!Number.isFinite(input.widthMm) || !Number.isFinite(input.heightMm) || input.widthMm <= 0 || input.heightMm <= 0) {
    throw new Error("Export dimensions must be positive millimetre values.");
  }

  const doc = new DOMParser().parseFromString(input.rawSvgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg || doc.querySelector("parsererror")) {
    throw new Error("A valid SVG upload is required for export.");
  }

  svg.setAttribute("width", `${formatMm(input.widthMm)}mm`);
  svg.setAttribute("height", `${formatMm(input.heightMm)}mm`);
  svg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") ?? "xMidYMid meet");

  return new XMLSerializer().serializeToString(doc);
}

function formatMm(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
