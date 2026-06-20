import type { AspectCategory } from "./sizingTypes";

export function calculateAspectRatio(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Aspect ratio requires positive width and height.");
  }
  return width / height;
}

export function calculateAspectRatioCategory(aspectRatio: number): AspectCategory {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error("Aspect ratio must be a positive number.");
  }
  if (aspectRatio < 0.5) return "veryTall";
  if (aspectRatio >= 0.5 && aspectRatio < 0.8) return "tall";
  if (aspectRatio >= 0.8 && aspectRatio <= 1.4) return "balanced";
  if (aspectRatio > 1.4 && aspectRatio <= 2.2) return "wide";
  return "veryWide";
}
