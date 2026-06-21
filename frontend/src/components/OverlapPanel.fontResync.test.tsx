import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OverlapPanel } from "./OverlapPanel";
import type { FontInfo } from "../types/design";

vi.mock("../services/generationApi", () => ({
  generateOverlap: vi.fn().mockResolvedValue({
    svg: "<svg></svg>",
    png_base64: "",
    svg_filename: "design.svg",
    png_filename: "design.png",
    dimensions: { width: 10, height: 10 },
    overlap_metadata: {
      glyph_chars: ["O", "l"],
      gaps_before_mm: [1],
      gaps_after_mm: [1],
      floating_components: [],
    },
  }),
}));

function makeFont(id: string, full_name: string): FontInfo {
  return { id, family: full_name, full_name, style: "Regular", source: "project" };
}

describe("OverlapPanel auto-select on filter (F5.7)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("re-selects a visible font when the current selection is filtered out", async () => {
    const fonts = [makeFont("a", "Alpha"), makeFont("b", "Beta")];

    await act(async () => {
      root = createRoot(container);
      root.render(<OverlapPanel fonts={fonts} />);
    });

    const select = container.querySelector('select[aria-label="Font selection"]') as HTMLSelectElement;
    expect(select.value).toBe("a");

    const searchInput = container.querySelector('input[aria-label="Search fonts"]') as HTMLInputElement;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      nativeValueSetter.call(searchInput, "Beta");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(select.value).toBe("b");

    await act(async () => {
      root.unmount();
    });
  });
});
