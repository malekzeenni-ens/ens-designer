import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CakeTopperPanel } from "./CakeTopperPanel";
import type { FontInfo } from "../types/design";

vi.mock("../services/generationApi", () => ({
  generateCakeTopper: vi.fn().mockResolvedValue({
    svg: "<svg></svg>",
    png_base64: "AA==",
    svg_filename: "design.svg",
    png_filename: "design.png",
    warnings: [],
    metadata: {
      words: ["Hi"],
      lines: [
        {
          text: "Hi",
          glyph_chars: ["H", "i"],
          gaps_before_mm: [1],
          gaps_after_mm: [1],
          width_mm: 30,
          height_mm: 10,
          x_offset_mm: 0,
          y_offset_mm: 0,
          manual_x_offset_mm: 0,
          manual_y_offset_mm: 0,
          floating_components: [],
          color: "#000000",
          font_name: "Font A",
          font_size_mm: 20,
        },
      ],
      stakes: [],
      ring: null,
      inter_line_gaps_mm: [],
      canvas_width_mm: 100,
      canvas_height_mm: 50,
      outline: null,
    },
  }),
  recordHistoryEntry: vi.fn().mockRejectedValue(new Error("history store unavailable")),
  fetchFontCharacters: vi.fn().mockResolvedValue({ characters: [] }),
}));

function makeFont(id: string, full_name: string): FontInfo {
  return { id, family: full_name, full_name, style: "Regular", source: "project" };
}

describe("CakeTopperPanel history logging failure (F6.1)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    container.remove();
  });

  it("logs a console error with context when history recording fails after export", async () => {
    const fonts = [makeFont("a", "Alpha")];

    await act(async () => {
      root = createRoot(container);
      root.render(<CakeTopperPanel fonts={fonts} manualFonts={[]} />);
    });

    const generateButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Generate design"),
    ) as HTMLButtonElement;
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const downloadSvgButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Download SVG"),
    ) as HTMLButtonElement;
    expect(downloadSvgButton).toBeTruthy();
    expect(downloadSvgButton.disabled).toBe(false);

    await act(async () => {
      downloadSvgButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to record history entry for export:",
      "design.svg",
      expect.any(Error),
    );

    await act(async () => {
      root.unmount();
    });
  });
});
