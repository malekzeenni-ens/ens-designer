import type { FontInfo, GenerateResponse } from "../types/design";

export async function fetchFonts(): Promise<FontInfo[]> {
  const response = await fetch("/api/fonts");
  if (!response.ok) {
    throw new Error("Could not load fonts.");
  }
  return response.json();
}

export async function generateDesign(text: string, fontId: string): Promise<GenerateResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, font_id: fontId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Could not generate design.");
  }

  return response.json();
}
