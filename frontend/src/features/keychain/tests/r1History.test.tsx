import { Activity, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeychainTab } from "../components/KeychainTab";
import { downloadBlob, exportKeychain, fetchKeychainHistory, previewKeychain } from "../services/keychainApi";
import { fetchFontCharacters } from "../../../services/generationApi";
import { result } from "./fixtures";
import type { FontInfo } from "../../../types/design";

vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn(), exportKeychain: vi.fn(), downloadBlob: vi.fn(), downloadPng: vi.fn(), fetchKeychainHistory: vi.fn().mockResolvedValue([]) }));
vi.mock("../../../services/generationApi", () => ({ fetchFontCharacters: vi.fn() }));
const fonts: FontInfo[] = [{ id: "anton", family: "Anton", full_name: "Anton", style: "Regular", source: "project" }];
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null }));
  vi.mocked(fetchKeychainHistory).mockResolvedValue([]);
  vi.mocked(fetchFontCharacters).mockResolvedValue({ characters: [] } as never);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
const tick = (ms = 300) => act(async () => vi.advanceTimersByTimeAsync(ms));
async function render() { await act(async () => root.render(<Activity mode="visible"><KeychainTab active fonts={fonts} manualFonts={fonts} /></Activity>)); await tick(); }
async function name(value: string) {
  const input = container.querySelector<HTMLInputElement>("#kc-name")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await tick();
}
const button = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent?.trim() === text)!;

it("R1 F10: an export whose history could not be saved still downloads and says so", async () => {
  vi.mocked(exportKeychain).mockImplementation(async payload => ({ ...result(payload), history_saved: false,
    warnings: ["The file was exported but could not be saved to history."] }));
  await render(); await name("Sarah");
  await act(async () => button("Download SVG").click());
  expect(downloadBlob).toHaveBeenCalledTimes(1);
  const notice = container.querySelector(".kc-notice")!.textContent!;
  expect(notice).toContain("downloaded");
  expect(notice).toContain("could not be saved to Keychain history");
  expect(notice).not.toContain("exported and saved");
});

it("R1 F10: a saved export keeps the normal confirmation", async () => {
  vi.mocked(exportKeychain).mockImplementation(async payload => ({ ...result(payload), history_saved: true, warnings: [] }));
  await render(); await name("Ali");
  await act(async () => button("Download SVG").click());
  expect(container.querySelector(".kc-notice")!.textContent).toContain("Ali exported and saved to Keychain history.");
});
