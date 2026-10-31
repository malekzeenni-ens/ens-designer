import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FontPicker } from "./FontPicker";
import { FontNamePreview } from "./FontNamePreview";
import { fontDisplayName } from "../utils/fontIdentity";
import { getFontOptionLabel, getManualFontClassification } from "../config/cakeTopperFontRecommendations";
import type { FontInfo } from "../types/design";

let container: HTMLDivElement;
let root: Root;
let sequence = 0;
let fonts: FontInfo[];
const onChange = vi.fn();
const load = vi.fn();
const add = vi.fn();
const observers: { callback: (entries: { isIntersecting: boolean }[]) => void; element?: Element }[] = [];
beforeEach(() => {
  fonts = ["Regular", "Bold", "Italic"].map((style, i) => ({ id: `test${sequence++}-${i}`, family: "Example Serif", full_name: "Example Serif", style, source: "project", aliases: ["OriginalDownload"] }));
  onChange.mockClear(); load.mockReset().mockImplementation(function (this: unknown) { return Promise.resolve(this); }); add.mockClear(); observers.length = 0;
  vi.stubGlobal("FontFace", class { family: string; constructor(family: string) { this.family = family; } load = load; });
  vi.stubGlobal("IntersectionObserver", class {
    entry: typeof observers[number];
    constructor(callback: typeof observers[number]["callback"]) { this.entry = { callback }; observers.push(this.entry); }
    observe(element: Element) { this.entry.element = element; } disconnect() {}
  });
  Object.defineProperty(document, "fonts", { configurable: true, value: { add, delete: vi.fn() } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const render = async () => act(async () => root.render(<FontPicker groups={[{ label: "Manual Fonts", fonts }]} value={fonts[0].id} onChange={onChange} label="Base font" />));
const trigger = () => container.querySelector<HTMLButtonElement>("button")!;
const search = () => document.querySelector<HTMLInputElement>('[role="combobox"]')!;
const key = async (value: string) => act(async () => search().dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true })));
const type = async (value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search(), value);
  search().dispatchEvent(new Event("input", { bubbles: true }));
});

it("distinguishes style labels without repeating a style already in the full name", () => {
  expect(fontDisplayName(fonts[1])).toBe("Example Serif Bold");
  expect(fontDisplayName({ ...fonts[1], full_name: "Example Serif Bold" })).toBe("Example Serif Bold");
  expect(getFontOptionLabel(fonts[2])).toMatch(/^Example Serif Italic /);
  expect(getManualFontClassification({ ...fonts[0], full_name: "Changed name", family: "Changed", aliases: ["Pacifico"] })?.fontName).toBe("Pacifico");
});

it("opens above clipping containers, navigates by keyboard and restores focus after selection", async () => {
  await render(); await act(async () => trigger().click());
  expect(document.querySelector('[role="dialog"]')?.parentElement).toBe(document.body);
  expect(document.activeElement).toBe(search());
  await key("End");
  expect(search().getAttribute("aria-activedescendant")).toContain(fonts[2].id);
  await key("Home"); await key("ArrowDown"); await key("Enter");
  expect(onChange).toHaveBeenCalledExactlyOnceWith(fonts[1].id);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

it("searches styles and filename aliases without changing the selection, including empty results", async () => {
  await render(); await act(async () => trigger().click());
  await type("bold"); expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
  await type("OriginalDownload"); expect(document.querySelectorAll('[role="option"]')).toHaveLength(3);
  await type("missing"); expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
  expect(document.body.textContent).toContain("No fonts match");
  expect(onChange).not.toHaveBeenCalled(); await key("Escape");
  expect(document.activeElement).toBe(trigger());
});

it("loads only visible previews and shares the exact font file between selected and list previews", async () => {
  await render(); await act(async () => trigger().click());
  expect(load).not.toHaveBeenCalled();
  await act(async () => observers.filter((observer) => observer.element?.textContent?.includes("Example Serif") && !observer.element?.textContent?.includes("Bold") && !observer.element?.textContent?.includes("Italic")).forEach((observer) => observer.callback([{ isIntersecting: true }])));
  expect(load).toHaveBeenCalledTimes(1); expect(add).toHaveBeenCalledTimes(1);
  const previews = document.querySelectorAll<HTMLElement>(".font-name-preview");
  expect(previews[0].style.fontFamily).toContain(`ens-font-${fonts[0].id}`);
  expect(previews[1].style.fontFamily).toContain(`ens-font-${fonts[0].id}`);
  expect(previews[2].style.fontFamily).toBe("");
});

it("reports failed previews and allows choosing the font", async () => {
  load.mockRejectedValue(new Error("network failed"));
  await render(); await act(async () => trigger().click());
  await act(async () => observers.forEach((observer) => observer.callback([{ isIntersecting: true }])));
  expect(document.body.textContent).toContain("Preview unavailable");
  await act(async () => document.querySelector<HTMLElement>('[role="option"]')!.click());
  expect(onChange).toHaveBeenCalledWith(fonts[0].id);
});

it("reuses a preview after scrolling out of view and back", async () => {
  await act(async () => root.render(<FontNamePreview font={fonts[1]} />));
  await act(async () => observers[0].callback([{ isIntersecting: true }]));
  await act(async () => observers[0].callback([{ isIntersecting: false }]));
  await act(async () => observers[0].callback([{ isIntersecting: true }]));
  expect(load).toHaveBeenCalledTimes(1);
  expect(container.querySelector<HTMLElement>(".font-name-preview")!.style.fontFamily).toContain(fonts[1].id);
});

it("dismisses on Tab or outside click without selecting a font", async () => {
  await render(); await act(async () => trigger().click()); await key("Tab");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => trigger().click());
  await act(async () => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(onChange).not.toHaveBeenCalled();
});

it("releases an observer when a preview is removed before intersection", async () => {
  await act(async () => root.render(<FontNamePreview font={fonts[1]} />));
  const observer = observers[0]; await act(async () => root.render(null));
  await act(async () => observer.callback([{ isIntersecting: true }]));
  expect(load).not.toHaveBeenCalled();
});
