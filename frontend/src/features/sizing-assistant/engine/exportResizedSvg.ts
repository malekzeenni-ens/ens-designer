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

export function exportPreviewPlacementSvg(input: {
  rawSvgText: string;
  widthMm: number;
  heightMm: number;
  offsetXPct: number;
  offsetYPct: number;
  rotationDeg: number;
}): string {
  validateExportDimensions(input.widthMm, input.heightMm);

  const doc = new DOMParser().parseFromString(input.rawSvgText, "image/svg+xml");
  const sourceSvg = doc.querySelector("svg");
  if (!sourceSvg || doc.querySelector("parsererror")) {
    throw new Error("A valid SVG upload is required for export.");
  }

  const sourceBox = getSourceBox(sourceSvg);
  const canvasWidthMm = roundMm(input.widthMm * 1.8);
  const canvasHeightMm = roundMm(input.heightMm * 1.8);
  const centerX = canvasWidthMm / 2 + (input.offsetXPct / 100) * canvasWidthMm;
  const centerY = canvasHeightMm / 2 + (input.offsetYPct / 100) * canvasHeightMm;
  const scale = input.widthMm / sourceBox.width;
  const translateX = -(sourceBox.x + sourceBox.width / 2);
  const translateY = -(sourceBox.y + sourceBox.height / 2);
  const innerMarkup = sourceSvg.innerHTML;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatMm(canvasWidthMm)}mm" height="${formatMm(canvasHeightMm)}mm" viewBox="0 0 ${formatMm(canvasWidthMm)} ${formatMm(canvasHeightMm)}">`,
    `<g transform="translate(${formatNumber(centerX)} ${formatNumber(centerY)}) rotate(${formatNumber(input.rotationDeg)}) scale(${formatNumber(scale)}) translate(${formatNumber(translateX)} ${formatNumber(translateY)})">`,
    innerMarkup,
    "</g>",
    "</svg>",
  ].join("");
}

function validateExportDimensions(widthMm: number, heightMm: number) {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    throw new Error("Export dimensions must be positive millimetre values.");
  }
}

function getSourceBox(svg: SVGSVGElement): { x: number; y: number; width: number; height: number } {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && isPositive(parts[2]) && isPositive(parts[3])) {
      return { x: parts[0] ?? 0, y: parts[1] ?? 0, width: parts[2], height: parts[3] };
    }
  }

  const width = parseLength(svg.getAttribute("width"));
  const height = parseLength(svg.getAttribute("height"));
  if (isPositive(width) && isPositive(height)) {
    return { x: 0, y: 0, width, height };
  }

  throw new Error("SVG dimensions must be detectable for preview placement export.");
}

function parseLength(value: string | null): number | null {
  const match = value?.match(/^\s*(\d*\.?\d+)(?:mm|px)?\s*$/i);
  if (!match?.[1]) return null;
  const number = Number(match[1]);
  return isPositive(number) ? number : null;
}

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function formatMm(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
