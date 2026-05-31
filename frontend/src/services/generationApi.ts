import type { BridgeOverride, CakeTopperLineConfig, CakeTopperResult, FontInfo, GenerateResponse, MaterialProfile, OverlapGapConfig, OverlapMode, OverlapResult, Preset } from "../types/design";

export async function fetchFonts(): Promise<FontInfo[]> {
  const response = await fetch("/api/fonts");
  if (!response.ok) {
    throw new Error("Could not load fonts.");
  }
  return response.json();
}

export async function fetchMaterials(): Promise<MaterialProfile[]> {
  const response = await fetch("/api/materials");
  if (!response.ok) {
    throw new Error("Could not load materials.");
  }
  return response.json();
}

export async function generateOverlap(
  text: string,
  fontId: string,
  mode: OverlapMode,
  customMm?: number,
  gapConfigs?: OverlapGapConfig[],
): Promise<OverlapResult> {
  const response = await fetch("/api/overlap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      font_id: fontId,
      overlap_mode: mode,
      overlap_custom_mm: customMm ?? null,
      gap_configs: gapConfigs ?? [],
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Could not generate overlap design.");
  }
  return response.json();
}

export async function generateCakeTopper(
  text: string,
  defaultFontId: string,
  defaultFontSizeMm: number,
  defaultOverlapMode: OverlapMode,
  lineConfigs: CakeTopperLineConfig[],
  interLineGapsMm: number[],
): Promise<CakeTopperResult> {
  const response = await fetch("/api/cake-topper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      default_font_id: defaultFontId,
      default_font_size_mm: defaultFontSizeMm,
      default_overlap_mode: defaultOverlapMode,
      line_configs: lineConfigs,
      inter_line_gaps_mm: interLineGapsMm,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Could not generate cake topper.");
  }
  return response.json();
}

export async function fetchPresets(): Promise<Preset[]> {
  const response = await fetch("/api/presets");
  if (!response.ok) {
    throw new Error("Could not load presets.");
  }
  return response.json();
}

export async function generateDesign(
  text: string,
  fontId: string,
  materialId: string,
  bridgeOverrides: BridgeOverride[] = [],
): Promise<GenerateResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      font_id: fontId,
      material_id: materialId,
      welding_enabled: true,
      bridge_overrides: bridgeOverrides,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Could not generate design.");
  }

  return response.json();
}
