import type {
  BridgeOverride,
  CakeTopperLineConfig,
  CakeTopperResult,
  CakeTopperStakeConfig,
  FloatingComponentOffset,
  FontInfo,
  GenerateResponse,
  MaterialProfile,
  OverlapGapConfig,
  OverlapMode,
  OverlapResult,
  Preset,
} from "../types/design";

// ---------------------------------------------------------------------------
// Shared error helper — converts any FastAPI error body into a readable string
// ---------------------------------------------------------------------------

async function _readError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body?.detail)) {
      // FastAPI 422 validation errors — [{loc, msg, type}, …]
      message = body.detail
        .map((d: { msg?: string; loc?: string[] }) => {
          const field = d.loc?.at(-1) ?? "field";
          return d.msg ? `${field}: ${d.msg}` : "Validation error";
        })
        .join(" · ");
    }
  } catch {
    // JSON parse failed — use fallback
  }
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchFonts(): Promise<FontInfo[]> {
  const r = await fetch("/api/fonts");
  if (!r.ok) throw new Error("Could not load fonts. Is the backend running?");
  return r.json();
}

export async function fetchMaterials(): Promise<MaterialProfile[]> {
  const r = await fetch("/api/materials");
  if (!r.ok) throw new Error("Could not load materials.");
  return r.json();
}

export async function fetchPresets(): Promise<Preset[]> {
  const r = await fetch("/api/presets");
  if (!r.ok) throw new Error("Could not load presets.");
  return r.json();
}

export async function generateDesign(
  text: string,
  fontId: string,
  materialId: string,
  bridgeOverrides: BridgeOverride[] = [],
): Promise<GenerateResponse> {
  const r = await fetch("/api/generate", {
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
  if (!r.ok) return _readError(r, "Could not generate design.");
  return r.json();
}

export async function generateOverlap(
  text: string,
  fontId: string,
  mode: OverlapMode,
  customMm?: number,
  gapConfigs?: OverlapGapConfig[],
  floatingOffsets?: FloatingComponentOffset[],
): Promise<OverlapResult> {
  const r = await fetch("/api/overlap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      font_id: fontId,
      overlap_mode: mode,
      overlap_custom_mm: customMm ?? null,
      gap_configs: gapConfigs ?? [],
      floating_offsets: floatingOffsets ?? [],
    }),
  });
  if (!r.ok) return _readError(r, "Could not generate overlap design.");
  return r.json();
}

export async function generateCakeTopper(
  text: string,
  defaultFontId: string,
  defaultFontSizeMm: number,
  defaultOverlapMode: OverlapMode,
  lineConfigs: CakeTopperLineConfig[],
  interLineGapsMm: number[],
  stakeConfig?: CakeTopperStakeConfig,
): Promise<CakeTopperResult> {
  let r: Response;
  try {
    r = await fetch("/api/cake-topper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        default_font_id: defaultFontId,
        default_font_size_mm: defaultFontSizeMm,
        default_overlap_mode: defaultOverlapMode,
        line_configs: lineConfigs,
        inter_line_gaps_mm: interLineGapsMm,
        stake_config: stakeConfig,
      }),
    });
  } catch {
    throw new Error("Backend is not running. Start the local server and retry.");
  }
  if (!r.ok) return _readError(r, "Could not generate cake topper.");
  return r.json();
}
