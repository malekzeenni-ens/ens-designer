import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const fetchFonts = vi.fn();
const fetchUploadedFonts = vi.fn().mockResolvedValue([]);
const fetchManualFonts = vi.fn().mockResolvedValue([]);

vi.mock("./services/generationApi", () => ({
  fetchFonts: (...args: unknown[]) => fetchFonts(...args),
  fetchUploadedFonts: (...args: unknown[]) => fetchUploadedFonts(...args),
  fetchManualFonts: (...args: unknown[]) => fetchManualFonts(...args),
  saveManualFonts: vi.fn().mockResolvedValue([]),
}));

describe("App font-load error retry (F6.2)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    fetchFonts.mockReset();
  });

  afterEach(() => {
    container.remove();
  });

  it("shows a retry button on font-load failure that re-triggers the fetch", async () => {
    fetchFonts.mockRejectedValueOnce(new Error("Could not load fonts."));

    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Could not load fonts.");
    const retryButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Retry",
    ) as HTMLButtonElement;
    expect(retryButton).toBeTruthy();

    fetchFonts.mockResolvedValueOnce([{ id: "a", family: "Alpha", full_name: "Alpha", style: "Regular", source: "project" }]);

    await act(async () => {
      retryButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchFonts).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain("Could not load fonts.");

    await act(async () => {
      root.unmount();
    });
  });
});
