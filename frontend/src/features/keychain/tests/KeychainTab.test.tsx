import { Activity, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeychainTab } from "../components/KeychainTab";
import { exportKeychain, previewKeychain, downloadBlob, fetchKeychainHistory } from "../services/keychainApi";
import { request, result } from "./fixtures";
import type { FontInfo } from "../../../types/design";
vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn(), exportKeychain: vi.fn(), downloadBlob: vi.fn(), downloadPng: vi.fn(), fetchKeychainHistory: vi.fn().mockResolvedValue([]) }));
const fonts: FontInfo[] = [{ id: "anton", family: "Anton", full_name: "Anton", style: "Regular", source: "project" }];
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null }));
  vi.mocked(exportKeychain).mockImplementation(async payload => result(payload));
  vi.mocked(fetchKeychainHistory).mockResolvedValue([]);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
async function render(active = true) { await act(async () => root.render(<Activity mode={active ? "visible" : "hidden"}><KeychainTab active={active} fonts={fonts} manualFonts={fonts} /></Activity>)); await act(async () => vi.advanceTimersByTimeAsync(300)); }
async function name(value: string) {
  const input = container.querySelector<HTMLInputElement>("#kc-name")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => vi.advanceTimersByTimeAsync(150));
}
const button = (text: string) => [...container.querySelectorAll("button")].find(button => button.textContent === text)!;
it("shows a disabled placeholder then exports the current named design", async () => {
  await render(); expect(button("Download SVG").disabled).toBe(true);
  expect(previewKeychain).toHaveBeenCalled();
  await name("Sarah"); expect(button("Download SVG").disabled).toBe(false);
  await act(async () => button("Download SVG").click());
  expect(exportKeychain).toHaveBeenCalledTimes(1);
  expect(vi.mocked(exportKeychain).mock.calls[0][0].text).toBe("Sarah");
  expect(downloadBlob).toHaveBeenCalled();
});
it("preserves the design across hidden/visible workspace switches", async () => {
  await render(); await name("Ali"); await render(false); await render(true);
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Ali");
});
it("requires an explicit Export anyway action when production errors exist", async () => {
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), checks: [{ id: "KC-BACKING-SINGLE-PIECE", severity: "error", message: "Disconnected backing", fix: null, highlight_bbox_mm: null }] }));
  await render(); await name("Sarah"); await act(async () => button("Download SVG").click());
  expect(container.querySelector('[role="dialog"]')).not.toBeNull(); expect(exportKeychain).not.toHaveBeenCalled();
  await act(async () => button("Cancel").click()); expect(exportKeychain).not.toHaveBeenCalled();
  await act(async () => button("Download SVG").click()); await act(async () => button("Export anyway").click());
  expect(exportKeychain).toHaveBeenCalledTimes(1);
});
it("keeps the last good SVG on a failed edit and disables stale export", async () => {
  await render(); await name("Sarah");
  vi.mocked(previewKeychain).mockRejectedValueOnce(new Error("Cannot render this name"));
  await name("Jo");
  expect(container.querySelector(".kc-svg svg")).not.toBeNull();
  expect(container.textContent).toContain("Cannot render this name");
  expect(button("Download SVG").disabled).toBe(true);
});

const tick = () => act(async () => vi.advanceTimersByTimeAsync(300));
async function setNumber(label: string, value: string) {
  const element = [...container.querySelectorAll("label")].find(item => item.textContent === label)!;
  const input = document.getElementById(element.htmlFor) as HTMLInputElement;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await tick();
}
const lastPayload = () => vi.mocked(previewKeychain).mock.calls.at(-1)![0];
it("undoes and redoes a name through buttons and keyboard while preserving font choice", async () => {
  await render(); await name("Sarah");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo keychain change"]')!.click());
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Redo keychain change"]')!.click()); await tick();
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Sarah"); expect(lastPayload().font_id).toBe("anton");
  await act(async () => container.querySelector("#kc-name")!.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })));
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("");
});
it("Next name and Enter after export preserve production settings and can be undone", async () => {
  await render();
  await act(async () => { const select = container.querySelector<HTMLSelectElement>('[aria-label="Product preset"]')!; select.value = "bag"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  await name("Sarah"); await act(async () => button("Download SVG").click());
  await act(async () => container.querySelector("#kc-name")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe(""); await tick();
  expect(lastPayload().size.target_mm).toBe(90); expect(lastPayload().ring.outer_diameter_mm).toBe(15);
  expect(document.activeElement).toBe(container.querySelector("#kc-name"));
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo keychain change"]')!.click());
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Sarah");
});
it("edits a selected cluster as one unit, resets it and coalesces keyboard nudges", async () => {
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), glyphs: [{ glyph_index: 0, cluster_text: "fi", bbox_mm: [10, 7, 40, 17], has_floating_component: true }] }));
  await render(); await name("fi");
  const focusLetter = async () => act(async () => container.querySelector('[aria-label="Select fi, glyph 1"]')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
  await focusLetter(); expect(container.textContent).toContain("Selected: fi");
  await setNumber("Letter scale", "150"); expect(lastPayload().glyph_transforms[0].scale).toBe(1.5);
  await setNumber("Dot / mark Y offset", "-2"); expect(lastPayload().dots.manual_offsets[0].y_offset_mm).toBe(-2); expect(lastPayload().dots.auto_join).toBe(true);
  await act(async () => button("Reset letter").click()); await tick(); expect(lastPayload().glyph_transforms).toEqual([]); expect(lastPayload().dots.manual_offsets).toEqual([]);
  await focusLetter();
  await act(async () => { const target = container.querySelector('[aria-label="Select fi, glyph 1"]')!; target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })); target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })); });
  await tick(); expect(lastPayload().glyph_transforms[0].dx_mm).toBeCloseTo(.2);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo keychain change"]')!.click()); await tick(); expect(lastPayload().glyph_transforms).toEqual([]);
});
it("reloads history as one undoable recipe change without exporting again", async () => {
  vi.mocked(fetchKeychainHistory).mockResolvedValue([{ recipe: result(request("Ali")).recipe, filename: "ali.svg", width_mm: 60, height_mm: 20, timestamp: "2026-11-09T00:00:00Z" }]);
  await render(); await name("Sarah");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Keychain history"]')!.click());
  expect(container.querySelector('[aria-label="Load Ali from history"]')).not.toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Load Ali from history"]')!.click()); await tick();
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Ali"); expect(exportKeychain).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo keychain change"]')!.click());
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Sarah");
});
it("does not silently substitute fonts for an unavailable saved recipe", async () => {
  vi.mocked(fetchKeychainHistory).mockResolvedValue([{ recipe: { ...result(request("Ali")).recipe, font_id: "deleted-font" }, filename: "ali.svg", width_mm: 60, height_mm: 20, timestamp: "bad-date" }]);
  await render(); await name("Sarah"); await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Keychain history"]')!.click());
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Load Ali from history"]')!.click());
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Sarah"); expect(container.textContent).toContain("Restore it in Fonts");
});
