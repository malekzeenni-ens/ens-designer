import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlyphBrowserDrawer } from "./GlyphBrowserDrawer";

vi.mock("../services/generationApi", () => ({
  fetchFontCharacters: vi.fn().mockResolvedValue({ characters: [] }),
}));

describe("GlyphBrowserDrawer FontFace lifecycle (F4.3)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let addedFaces: Set<unknown>;
  let originalFontFace: unknown;
  let originalDocumentFonts: unknown;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    addedFaces = new Set();
    originalFontFace = (globalThis as Record<string, unknown>).FontFace;
    originalDocumentFonts = (document as unknown as Record<string, unknown>).fonts;

    class FakeFontFace {
      family: string;
      source: string;
      constructor(family: string, source: string) {
        this.family = family;
        this.source = source;
      }
      load() {
        return Promise.resolve(this);
      }
    }
    (globalThis as Record<string, unknown>).FontFace = FakeFontFace;

    (document as unknown as Record<string, unknown>).fonts = {
      add: vi.fn((face: unknown) => addedFaces.add(face)),
      delete: vi.fn((face: unknown) => addedFaces.delete(face)),
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).FontFace = originalFontFace;
    (document as unknown as Record<string, unknown>).fonts = originalDocumentFonts;
    container.remove();
  });

  it("removes the loaded FontFace from document.fonts when the font selection changes and on unmount", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <GlyphBrowserDrawer
          lineIndex={0}
          lineName="Line 1"
          fontId="font-a"
          fontName="Font A"
          currentLineText="Hi"
          onApply={() => {}}
          onClose={() => {}}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const fontsApi = (document as unknown as { fonts: { add: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } }).fonts;

    expect(fontsApi.add).toHaveBeenCalledTimes(1);
    expect(addedFaces.size).toBe(1);

    await act(async () => {
      root.render(
        <GlyphBrowserDrawer
          lineIndex={0}
          lineName="Line 1"
          fontId="font-b"
          fontName="Font B"
          currentLineText="Hi"
          onApply={() => {}}
          onClose={() => {}}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fontsApi.delete).toHaveBeenCalledTimes(1);
    expect(addedFaces.size).toBe(1); // only font-b's face remains

    await act(async () => {
      root.unmount();
    });

    expect(fontsApi.delete).toHaveBeenCalledTimes(2);
    expect(addedFaces.size).toBe(0);
  });

  it("contains keyboard focus, closes on Escape and restores its opener", async () => {
    const opener = document.createElement("button"); document.body.append(opener); opener.focus();
    const close = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<GlyphBrowserDrawer lineIndex={0} lineName="Happy" fontId="font-a" fontName="Font A" currentLineText="Happy" onApply={() => {}} onClose={close} />);
    });
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]'));
    controls[0].focus();
    await act(async () => controls[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(controls[controls.length - 1]);
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
    expect(document.activeElement).toBe(controls[0]);
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(close).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
