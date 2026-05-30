import type { FontInfo, GenerateResponse, MaterialProfile } from "../types/design";

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

export async function generateDesign(text: string, fontId: string, materialId: string): Promise<GenerateResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, font_id: fontId, material_id: materialId, welding_enabled: true })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Could not generate design.");
  }

  return response.json();
}
