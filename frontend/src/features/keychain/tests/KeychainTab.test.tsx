import { Activity, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeychainTab } from "../components/KeychainTab";
import { exportKeychain, previewKeychain, downloadBlob } from "../services/keychainApi";
import { result } from "./fixtures";
import type { FontInfo } from "../../../types/design";
vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn(), exportKeychain: vi.fn(), downloadBlob: vi.fn(), downloadPng: vi.fn(), fetchKeychainHistory: vi.fn().mockResolvedValue([]) }));
const fonts: FontInfo[] = [{ id: "anton", family: "Anton", full_name: "Anton", style: "Regular", source: "project" }];
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null }));
  vi.mocked(exportKeychain).mockImplementation(async payload => result(payload));
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
