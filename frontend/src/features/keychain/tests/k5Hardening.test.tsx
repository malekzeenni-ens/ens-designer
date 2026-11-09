import { Activity, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeychainTab } from "../components/KeychainTab";
import { downloadBlob, exportKeychain, fetchKeychainHistory, previewKeychain } from "../services/keychainApi";
import { fetchFontCharacters } from "../../../services/generationApi";
import { result } from "./fixtures";
import type { FontInfo } from "../../../types/design";
import type { KeychainRequest, KeychainResult, ProductionCheck } from "../state/keychainTypes";

vi.mock("../services/keychainApi", () => ({ previewKeychain: vi.fn(), exportKeychain: vi.fn(), downloadBlob: vi.fn(), downloadPng: vi.fn(), fetchKeychainHistory: vi.fn().mockResolvedValue([]) }));
vi.mock("../../../services/generationApi", () => ({ fetchFontCharacters: vi.fn() }));
const fonts: FontInfo[] = [{ id: "anton", family: "Anton", full_name: "Anton", style: "Regular", source: "project" }];
let root: Root, container: HTMLDivElement;
const error = (id: string, fix: ProductionCheck["fix"], extra: Partial<ProductionCheck> = {}): ProductionCheck =>
  ({ id, severity: "error", message: `${id} failed`, fix, highlight_bbox_mm: [5, 6, 20, 16], ...extra });
const pass = (id: string): ProductionCheck => ({ id, severity: "pass", message: `${id} passed`, fix: null, highlight_bbox_mm: null });
function withChecks(checks: (payload: KeychainRequest) => ProductionCheck[]) {
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null, checks: checks(payload) }));
}
beforeEach(() => {
  vi.useFakeTimers();
  withChecks(() => [pass("KC-SIZE-CONVERGED")]);
  vi.mocked(exportKeychain).mockImplementation(async payload => result(payload));
  vi.mocked(fetchKeychainHistory).mockResolvedValue([]);
  vi.mocked(fetchFontCharacters).mockResolvedValue({ characters: [] } as never);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
const tick = (ms = 300) => act(async () => vi.advanceTimersByTimeAsync(ms));
async function render() { await act(async () => root.render(<Activity mode="visible"><KeychainTab active fonts={fonts} manualFonts={fonts} /></Activity>)); await tick(); }
function setValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
async function name(value: string) { await act(async () => setValue(container.querySelector<HTMLInputElement>("#kc-name")!, value)); await tick(); }
const button = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent?.trim() === text);
const buttonStarting = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent?.startsWith(text));
const lastPayload = () => vi.mocked(previewKeychain).mock.calls.at(-1)![0];
const undo = () => act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo keychain change"]')!.click());
const key = (target: EventTarget, init: KeyboardEventInit) => act(async () => { target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })); });

it("K5-001: a Fix applies one undoable edit, re-previews and reports the real outcome", async () => {
  withChecks(payload => payload.backing.offset_mm >= 4.5 ? [pass("KC-BACKING-SINGLE-PIECE")]
    : [error("KC-BACKING-SINGLE-PIECE", { action: "set", field: "backing.offset_mm", value: 4.5 })]);
  await render(); await name("Ali");
  const calls = vi.mocked(previewKeychain).mock.calls.length;
  await act(async () => buttonStarting("Set backing offset to 4.5 mm")!.click());
  expect(container.textContent).toContain("checking the new preview");
  await tick();
  expect(vi.mocked(previewKeychain).mock.calls.length).toBe(calls+1);
  expect(lastPayload().backing.offset_mm).toBe(4.5);
  expect(container.querySelector(".kc-fix-status")!.textContent).toContain("Fixed: KC-BACKING-SINGLE-PIECE passed");
  expect(buttonStarting("Set backing offset")).toBeUndefined();
  await undo(); await tick();
  expect(lastPayload().backing.offset_mm).toBe(3);
  // Browser finding: the outcome message must not survive an undo.
  expect(container.querySelector(".kc-fix-status")).toBeNull();
  expect(lastPayload().text).toBe("Ali");
});

it("K5-001: an ineffective fix says the issue remains instead of claiming success", async () => {
  withChecks(payload => [error("KC-RING-TOUCH", payload.ring.auto_snap ? null : { action: "snap_ring", value: { auto_snap: true } },
    { fix_note: payload.ring.auto_snap ? "Auto-snap is on but could not reach the backing. Choose another ring position." : null })]);
  await render(); await name("Jo");
  await act(async () => { const toggle = [...container.querySelectorAll("label")].find(item => item.textContent === "Snap ring to backing")!.querySelector("input")!; toggle.click(); });
  await tick();
  await act(async () => buttonStarting("Snap ring to backing")!.click()); await tick();
  const status = container.querySelector(".kc-fix-status")!.textContent!;
  expect(status).toContain("still needs attention"); expect(status).toContain("Choose another ring position");
  expect(status).not.toContain("Fixed");
});

it("K5-001: fixes are disabled while checks belong to an older preview", async () => {
  withChecks(() => [error("KC-SIZE-MIN", { action: "set", field: "size.target_mm", value: 70 })]);
  await render(); await name("Sarah");
  expect(buttonStarting("Set target size to 70.0 mm")!.disabled).toBe(false);
  await act(async () => setValue(container.querySelector<HTMLInputElement>("#kc-name")!, "Sarah B"));
  expect(container.textContent).toContain("belong to the previous preview");
  expect(buttonStarting("Set target size")!.disabled).toBe(true);
});

it("K5-001: the missing-glyph fix opens the support filter without changing the design", async () => {
  withChecks(() => [{ ...error("KC-MISSING-GLYPHS", { action: "filter_fonts_supporting_text" }), severity: "warning", highlight_bbox_mm: null }]);
  await render(); await name("Zoë");
  const calls = vi.mocked(previewKeychain).mock.calls.length;
  await act(async () => buttonStarting("Show fonts that support this name")!.click()); await tick();
  const toggle = [...container.querySelectorAll("label")].find(item => item.textContent === "Fonts that support this name")!.querySelector("input")!;
  expect(toggle.checked).toBe(true);
  expect(container.textContent).toContain("Checked 1/1 fonts");
  expect(vi.mocked(previewKeychain).mock.calls.length).toBe(calls);
  await undo(); expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("");
});

it("K5-002: Show draws a problem region in canvas mm, separate from selection, and clears on name change", async () => {
  withChecks(() => [error("KC-RING-TOUCH", null)]);
  await render(); await name("Sarah");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Show KC-RING-TOUCH on canvas"]')!.click());
  const rect = container.querySelector(".kc-overlay .kc-problem rect")!;
  expect(rect).not.toBeNull();
  expect([rect.getAttribute("x"), rect.getAttribute("y"), rect.getAttribute("width")]).toEqual(["4.4", "5.4", "16.2"]);
  expect(container.querySelector(".kc-overlay")!.getAttribute("viewBox")).toBe("0 0 64 24");
  expect(container.querySelector(".kc-selection")).toBeNull();
  expect(container.textContent).toContain("Highlighted: KC-RING-TOUCH failed");
  await name("Ali");
  expect(container.querySelector(".kc-problem")).toBeNull();
});

it("K5-004: the export dialog traps focus, blocks background shortcuts and restores focus", async () => {
  withChecks(() => [error("KC-RING-TOUCH", null)]);
  await render(); await name("Sarah");
  const download = button("Download SVG")!; download.focus();
  await act(async () => download.click());
  const dialog = container.querySelector('[role="dialog"]')!;
  expect(document.activeElement?.textContent).toBe("Cancel");
  expect(container.querySelector(".kc-topbar")!.hasAttribute("inert")).toBe(true);
  // JSDOM does not move focus natively; verify the trap's wrap-around edges.
  await key(document.activeElement!, { key: "Tab", shiftKey: true }); expect(document.activeElement?.textContent).toBe("Export anyway");
  await key(document.activeElement!, { key: "Tab" }); expect(document.activeElement?.textContent).toBe("Cancel");
  await key(document.activeElement!, { key: "z", ctrlKey: true });
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Sarah");
  await key(dialog, { key: "Escape" }); await tick(10);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(exportKeychain).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(button("Download SVG"));
});

it("K5-005: errors returned only by export are held; Download anyway uses that result without exporting again", async () => {
  vi.mocked(exportKeychain).mockImplementation(async payload => ({ ...result(payload), checks: [error("KC-BACKING-SINGLE-PIECE", null)] }));
  await render(); await name("Sarah");
  await act(async () => button("Download SVG")!.click());
  expect(exportKeychain).toHaveBeenCalledTimes(1);
  expect(downloadBlob).not.toHaveBeenCalled();
  expect(container.querySelector('[role="dialog"]')!.textContent).toContain("Export returned production errors");
  await act(async () => button("Download anyway")!.click());
  expect(downloadBlob).toHaveBeenCalledTimes(1);
  expect(exportKeychain).toHaveBeenCalledTimes(1);
});

it("K5-005: cancelling a held export downloads nothing; already-confirmed errors are not asked twice", async () => {
  vi.mocked(exportKeychain).mockImplementation(async payload => ({ ...result(payload), checks: [error("KC-BACKING-SINGLE-PIECE", null)] }));
  await render(); await name("Sarah");
  await act(async () => button("Download SVG")!.click()); await act(async () => button("Cancel")!.click());
  expect(downloadBlob).not.toHaveBeenCalled(); expect(container.textContent).toContain("Nothing was downloaded");
  withChecks(() => [error("KC-BACKING-SINGLE-PIECE", null)]);
  await name("Sara");
  await act(async () => button("Download SVG")!.click()); await act(async () => button("Export anyway")!.click());
  expect(exportKeychain).toHaveBeenCalledTimes(2);
  expect(vi.mocked(exportKeychain).mock.calls[1][0].text).toBe("Sara");
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(downloadBlob).toHaveBeenCalledTimes(1);
});

it("investigation 6: double-click and repeated Enter start one export", async () => {
  let resolve!: (value: KeychainResult) => void;
  vi.mocked(exportKeychain).mockImplementation(payload => new Promise(done => { resolve = () => done(result(payload)); }));
  await render(); await name("Sarah");
  await act(async () => { button("Download SVG")!.click(); button("Download SVG")!.click(); button("Download PNG")!.click(); });
  expect(exportKeychain).toHaveBeenCalledTimes(1);
  await act(async () => resolve(undefined as never));
  expect(downloadBlob).toHaveBeenCalledTimes(1);
});

it("investigation 5: an export finishing after an edit keeps its own name and Enter does not clear the new name", async () => {
  let resolve!: () => void;
  vi.mocked(exportKeychain).mockImplementation(payload => new Promise(done => { resolve = () => done(result(payload)); }));
  await render(); await name("Sarah");
  await act(async () => button("Download SVG")!.click());
  await name("Ali");
  await act(async () => resolve());
  expect(container.textContent).toContain("Sarah exported");
  await key(container.querySelector("#kc-name")!, { key: "Enter" });
  expect(container.querySelector<HTMLInputElement>("#kc-name")!.value).toBe("Ali");
});

it("investigation 10: focusing and leaving an unchanged inch field does not alter the physical size", async () => {
  await render(); await name("Sarah");
  await act(async () => { const select = [...container.querySelectorAll("label")].find(item => item.textContent?.startsWith("Units"))!.querySelector("select")!; select.value = "in"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  const label = [...container.querySelectorAll("label")].find(item => item.textContent === "Target width")!;
  const input = document.getElementById(label.htmlFor) as HTMLInputElement;
  expect(input.value).toBe("2.3622");
  const calls = vi.mocked(previewKeychain).mock.calls.length;
  await act(async () => { input.focus(); input.blur(); }); await tick();
  expect(vi.mocked(previewKeychain).mock.calls.length).toBe(calls);
  expect(lastPayload().size.target_mm).toBe(60);
  expect(button("Download SVG")!.disabled).toBe(false);
});

it("investigation 1: moving a snapped ring is rebased on its actual centre, once per preview", async () => {
  vi.mocked(previewKeychain).mockImplementation(async payload => ({ ...result(payload), files: [], png_base64: null,
    ring: { ...result(payload).ring!, snapped: true, center_x_mm: 30, center_y_mm: 9, requested_center_x_mm: 30, requested_center_y_mm: 5 } }));
  await render(); await name("Sarah");
  const ring = container.querySelector<SVGElement>('[aria-label="Move ring"]')!;
  await act(async () => ring.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
  await key(ring, { key: "ArrowRight" }); await key(ring, { key: "ArrowRight" });
  await tick();
  expect(lastPayload().ring.x_offset_mm).toBeCloseTo(.2);
  expect(lastPayload().ring.y_offset_mm).toBeCloseTo(4);
});

it("investigation 7: arrow keys do nothing for a glyph that is not in the current layout", async () => {
  await render(); await name("Sarah");
  await act(async () => container.querySelector('[aria-label="Select h, glyph 5"]')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
  vi.mocked(previewKeychain).mockRejectedValueOnce(new Error("Backend restarted"));
  await name("Sa");
  const calls = vi.mocked(previewKeychain).mock.calls.length;
  await key(document.body, { key: "ArrowRight" }); await tick();
  expect(vi.mocked(previewKeychain).mock.calls.length).toBe(calls);
  expect(lastPayload().glyph_transforms).toEqual([]);
});
