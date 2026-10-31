import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CakeTopperPanel } from "./CakeTopperPanel";
import { generateCakeTopper } from "../services/generationApi";

vi.mock("../services/generationApi", () => ({
  generateCakeTopper: vi.fn().mockResolvedValue({
    svg: '<svg viewBox="0 0 100 100"><path d="M0 0h20v20z"/></svg>', png_base64: "AA==", svg_filename: "design.svg", png_filename: "design.png", warnings: ["Check detached components before cutting"],
    metadata: { canvas_width_mm: 100, canvas_height_mm: 100, stakes: [], ring: null, inter_line_gaps_mm: [3], lines: ["Happy", "Birthday"].map((text, index) => ({ text, font_name: "Lato", font_size_mm: 42, x_offset_mm: 0, y_offset_mm: index * 40, width_mm: 80, height_mm: 30, glyph_chars: ["H", "i"], gaps_before_mm: [1.5], gaps_after_mm: [-1.5], floating_components: [] })) },
  }), recordHistoryEntry: vi.fn(),
}));
vi.mock("./PreviewPanel", () => ({ PreviewPanel: ({ onSelectLine, onSelectRing }: { onSelectLine: (index: number) => void; onSelectRing: () => void }) => <div><button onClick={() => onSelectLine(1)}>Select second artwork line</button><button onClick={onSelectRing}>Select artwork ring</button></div> }));
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.mocked(generateCakeTopper).mockClear();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<CakeTopperPanel fonts={[{ id: "lato", family: "Lato", full_name: "Lato", style: "Regular", source: "project" }]} manualFonts={[]} />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const button = (text: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((element) => element.textContent?.includes(text))!;

it("navigates inspector tabs by keyboard without generating or hiding the action", async () => {
  const design = container.querySelector<HTMLButtonElement>('#inspector-tab-design')!;
  expect(container.querySelectorAll('.ct-inspector-tabs [role="tab"]')).toHaveLength(3);
  await act(async () => { design.focus(); design.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
  expect(document.activeElement?.id).toBe("inspector-tab-lines");
  expect(container.querySelector<HTMLElement>("#inspector-lines")!.hidden).toBe(false);
  expect(container.querySelector<HTMLElement>("#inspector-design")!.hidden).toBe(true);
  await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(document.activeElement?.id).toBe("inspector-tab-structure");
  await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  expect(document.activeElement?.id).toBe("inspector-tab-design");
  expect(button("Generate design").closest("footer")).toBeTruthy();
  expect(generateCakeTopper).not.toHaveBeenCalled();
});

it("links artwork selection to one line editor without regenerating or replacing output", async () => {
  await act(async () => button("Generate design").click());
  const calls = vi.mocked(generateCakeTopper).mock.calls.length;
  await act(async () => button("Select second artwork line").click());
  expect(container.querySelector('#inspector-tab-lines')?.getAttribute("aria-selected")).toBe("true");
  expect(container.querySelectorAll(".ct-card-body")).toHaveLength(1);
  expect(container.querySelector(".ct-line-editor-heading")?.textContent).toContain("Birthday");
  expect(container.querySelector<HTMLElement>(".ct-layer-gap")?.hidden).toBe(true);
  expect(container.querySelector("footer")?.textContent).toContain("Check detached components");
  expect(container.querySelector(".ct-final-size")?.textContent).toContain("100.0 × 100.0 mm");
  await act(async () => button("Select artwork ring").click());
  expect(container.querySelector('#inspector-tab-structure')?.getAttribute("aria-selected")).toBe("true");
  expect(container.querySelector<HTMLElement>('#inspector-structure')?.hidden).toBe(false);
  expect(generateCakeTopper).toHaveBeenCalledTimes(calls);
});

it("keeps both lines available inside Lines and retains edits when switching between them", async () => {
  await act(async () => button("Generate design").click());
  await act(async () => container.querySelector<HTMLButtonElement>("#inspector-tab-lines")!.click());
  const switcher = container.querySelector<HTMLElement>('[aria-label="Choose a line to edit"]')!;
  const select = async (index: number) => act(async () => switcher.querySelectorAll<HTMLButtonElement>("button")[index].click());
  expect(switcher.closest("#inspector-lines")).toBeTruthy();
  expect(switcher.querySelectorAll("button")).toHaveLength(2);
  expect(switcher.textContent).toContain("Line 2Birthday");
  const calls = vi.mocked(generateCakeTopper).mock.calls.length;
  await select(1);
  expect(container.querySelector(".ct-line-editor-heading")?.textContent).toContain("Line 2");
  expect(generateCakeTopper).toHaveBeenCalledTimes(calls);
  const size = container.querySelector<HTMLInputElement>('.ct-line-appearance-row input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(size, "55");
    size.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const callsAfterEdit = vi.mocked(generateCakeTopper).mock.calls.length;
  expect(callsAfterEdit).toBe(calls + 1);
  await select(0);
  expect(container.querySelector<HTMLInputElement>('.ct-line-appearance-row input')!.value).toBe("42");
  await select(1);
  expect(container.querySelector<HTMLInputElement>('.ct-line-appearance-row input')!.value).toBe("55");
  expect(generateCakeTopper).toHaveBeenCalledTimes(callsAfterEdit);
});

it("keeps header actions connected to the retained design and removes them from inactive workspaces", async () => {
  const host = document.createElement("div"); document.body.append(host);
  const fonts = [{ id: "lato", family: "Lato", full_name: "Lato", style: "Regular", source: "project" as const }];
  try {
    await act(async () => root.render(<CakeTopperPanel fonts={fonts} manualFonts={[]} toolbarHost={host} active />));
    expect(container.querySelector(".ct-app-header")).toBeNull();
    expect(host.querySelector('[aria-label="Download SVG"]')).toBeTruthy();
    await act(async () => button("Generate design").click());
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Download SVG"]')!.disabled).toBe(false);
    const calls = vi.mocked(generateCakeTopper).mock.calls.length;
    await act(async () => root.render(<CakeTopperPanel fonts={fonts} manualFonts={[]} toolbarHost={host} active={false} />));
    expect(host.children).toHaveLength(0);
    await act(async () => root.render(<CakeTopperPanel fonts={fonts} manualFonts={[]} toolbarHost={host} active />));
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Download SVG"]')!.disabled).toBe(false);
    expect(container.querySelector(".ct-final-size")?.textContent).toContain("100.0");
    expect(generateCakeTopper).toHaveBeenCalledTimes(calls);
  } finally { host.remove(); }
});
