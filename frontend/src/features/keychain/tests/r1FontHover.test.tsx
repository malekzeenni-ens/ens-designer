import { Activity, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeychainTab } from "../components/KeychainTab";
import { exportKeychain, fetchKeychainHistory, previewKeychain } from "../services/keychainApi";
import { fetchFontCharacters } from "../../../services/generationApi";
import { result } from "./fixtures";
import type { FontInfo } from "../../../types/design";
import type { ProductionCheck } from "../state/keychainTypes";

vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn(), exportKeychain: vi.fn(), downloadBlob: vi.fn(), downloadPng: vi.fn(), fetchKeychainHistory: vi.fn().mockResolvedValue([]) }));
vi.mock("../../../services/generationApi", () => ({ fetchFontCharacters: vi.fn() }));
const fonts: FontInfo[] = [
  { id: "anton", family: "Anton", full_name: "Anton", style: "Regular", source: "project" },
  { id: "lora", family: "Lora", full_name: "Lora", style: "Regular", source: "project" },
];
const failing: ProductionCheck = { id: "KC-BACKING-SINGLE-PIECE", severity: "error", message: "Backing has disconnected pieces.",
  fix: { action: "set", field: "backing.offset_mm", value: 4.5 }, highlight_bbox_mm: [5, 6, 20, 16] };
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null, checks: [failing] }));
  vi.mocked(exportKeychain).mockImplementation(async payload => result(payload));
  vi.mocked(fetchKeychainHistory).mockResolvedValue([]);
  vi.mocked(fetchFontCharacters).mockResolvedValue({ characters: [] } as never);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
const tick = (ms = 400) => act(async () => vi.advanceTimersByTimeAsync(ms));
const lastPayload = () => vi.mocked(previewKeychain).mock.calls.at(-1)![0];

it("R1 F7: a fix cannot be applied to the result of a hovered (uncommitted) font", async () => {
  await act(async () => root.render(<Activity mode="visible"><KeychainTab active fonts={fonts} manualFonts={fonts} /></Activity>));
  await tick();
  const input = container.querySelector<HTMLInputElement>("#kc-name")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Sarah");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await tick();
  const committed = lastPayload().font_id;
  const picker = container.querySelector<HTMLButtonElement>('[aria-label="Keychain font"]')!;
  await act(async () => picker.click());
  const search = document.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const other = fonts.find(font => font.id !== committed)!;
  // Move the active option until the other font is hovered.
  for (let i = 0; i < 3 && lastPayload().font_id !== other.id; i++) {
    await act(async () => search.dispatchEvent(new KeyboardEvent("keydown", { key: i % 2 ? "ArrowUp" : "ArrowDown", bubbles: true })));
    await tick();
  }
  expect(lastPayload().font_id).toBe(other.id);
  const calls = vi.mocked(previewKeychain).mock.calls.length;
  const fix = [...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.startsWith("Set backing offset"));
  if (fix && !fix.disabled) await act(async () => fix.click());
  await tick();
  expect(vi.mocked(previewKeychain).mock.calls.slice(calls).every(([payload]) => payload.backing.offset_mm !== 4.5)).toBe(true);
  expect(container.querySelector(".kc-fix-status")).toBeNull();
});

it("R1 E3: the window keyboard listener is registered once while active, not on every render", async () => {
  const add = vi.spyOn(window, "addEventListener");
  await act(async () => root.render(<Activity mode="visible"><KeychainTab active fonts={fonts} manualFonts={fonts} /></Activity>));
  await tick();
  const input = container.querySelector<HTMLInputElement>("#kc-name")!;
  for (const value of ["S", "Sa", "Sar"]) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await tick();
  }
  expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
  add.mockRestore();
});

it("keeps the preview before the inspector and switches tabs without changing the design", async () => {
  await act(async () => root.render(<KeychainTab active fonts={fonts} manualFonts={fonts} />));
  await tick();
  const body = container.querySelector(".kc-body")!;
  expect(body.firstElementChild?.className).toBe("kc-stage");
  expect(body.lastElementChild?.className).toBe("kc-controls");
  const count = vi.mocked(previewKeychain).mock.calls.length;
  const tab = container.querySelector<HTMLButtonElement>("#kc-tab-design")!;
  await act(async () => tab.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true})));
  expect(container.querySelector("#kc-tab-letters")?.getAttribute("aria-selected")).toBe("true");
  expect(container.querySelector<HTMLElement>("#kc-panel-design")?.hidden).toBe(true);
  expect(container.querySelector<HTMLElement>("#kc-panel-letters")?.hidden).toBe(false);
  expect(document.activeElement?.id).toBe("kc-tab-letters");
  await act(async () => container.querySelector<HTMLButtonElement>("#kc-tab-structure")!.click());
  expect(container.querySelector<HTMLElement>("#kc-panel-structure")?.hidden).toBe(false);
  await tick();
  expect(vi.mocked(previewKeychain).mock.calls).toHaveLength(count);
});
