import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { APPEARANCE_KEY, applyAppearance } from "./appearance";

const fetchFonts = vi.fn().mockResolvedValue([]);
vi.mock("./services/generationApi", () => ({
  fetchFonts: (...args: unknown[]) => fetchFonts(...args),
  fetchUploadedFonts: vi.fn().mockResolvedValue([]),
  fetchManualFonts: vi.fn().mockResolvedValue([]),
  saveManualFonts: vi.fn().mockResolvedValue([]),
  deleteFonts: vi.fn().mockResolvedValue([]),
}));

// An editable child catches accidental remounts caused by changing appearance.
vi.mock("./components/CakeTopperPanel", async () => {
  const { useState } = await import("react");
  return { CakeTopperPanel: function EditableDesign() {
    const [text, setText] = useState("Happy Birthday");
    return <input aria-label="Design draft" value={text} onChange={(event) => setText(event.target.value)} />;
  } };
});

describe("Designer shared header and Settings appearance", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    window.localStorage.clear();
    applyAppearance("dark");
    fetchFonts.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("switches by keyboard without replacing the editable view or fetching fonts again", async () => {
    const draft = container.querySelector<HTMLInputElement>('[aria-label="Design draft"]')!;
    const dark = container.querySelector<HTMLButtonElement>('[aria-label="Dark theme"]')!;
    const calls = fetchFonts.mock.calls.length;
    await act(async () => {
      dark.focus();
      dark.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(container.querySelector('[aria-label="Design draft"]')).toBe(draft);
    expect(document.documentElement.dataset.theme).toBe("bright");
    expect(window.localStorage.getItem(APPEARANCE_KEY)).toBe("bright");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Bright theme");
    expect(fetchFonts).toHaveBeenCalledTimes(calls);
  });

  it("keeps the header and Settings selectors synchronized", async () => {
    const settings = container.querySelector<HTMLButtonElement>('[aria-current="page"]');
    expect(settings?.textContent).toContain("Designer");
    const config = Array.from(container.querySelectorAll<HTMLButtonElement>("nav button")).find((button) => button.title === "Configuration")!;
    await act(async () => config.click());
    expect(container.querySelectorAll('[role="radiogroup"][aria-label="Appearance"]')).toHaveLength(2);
    const brightButtons = container.querySelectorAll<HTMLButtonElement>('[aria-label="Bright theme"]');
    await act(async () => brightButtons[1].click());
    expect(Array.from(container.querySelectorAll('[aria-label="Bright theme"]')).every((button) => button.getAttribute("aria-checked") === "true")).toBe(true);
    const darkButtons = container.querySelectorAll<HTMLButtonElement>('[aria-label="Dark theme"]');
    await act(async () => darkButtons[0].click());
    expect(Array.from(container.querySelectorAll('[aria-label="Dark theme"]')).every((button) => button.getAttribute("aria-checked") === "true")).toBe(true);
  });

  it("retains an unsaved draft through utility navigation without refetching fonts", async () => {
    const draft = container.querySelector<HTMLInputElement>('[aria-label="Design draft"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(draft, "Maya turns seven");
      draft.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const calls = fetchFonts.mock.calls.length;
    const navigate = async (title: string) => act(async () => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("nav button")).find((button) => button.title === title)!.click();
    });
    await navigate("Configuration");
    expect(draft.closest('[style*="display: none"]')).toBeTruthy();
    await navigate("Designer");
    expect(container.querySelector('[aria-label="Design draft"]')).toBe(draft);
    expect(draft.value).toBe("Maya turns seven");
    expect(fetchFonts).toHaveBeenCalledTimes(calls);
  });
});
