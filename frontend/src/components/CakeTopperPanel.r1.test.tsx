import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CakeTopperPanel } from "./CakeTopperPanel";
import { generateCakeTopper } from "../services/generationApi";
import type { CakeTopperResult, FontInfo } from "../types/design";

vi.mock("../services/generationApi", () => ({ generateCakeTopper: vi.fn(), recordHistoryEntry: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./PreviewPanel", () => ({ PreviewPanel: ({ svg }: { svg: string | null }) => <div data-testid="preview">{svg ?? "empty"}</div> }));
vi.mock("./FontPicker", () => ({
  FontPicker: ({ label, onChange }: { label: string; onChange: (id: string) => void }) =>
    <button type="button" aria-label={label} onClick={() => onChange("lora")}>{label}</button>,
}));

const fonts: FontInfo[] = [
  { id: "lato", family: "Lato", full_name: "Lato", style: "Regular", source: "project" },
  { id: "lora", family: "Lora", full_name: "Lora", style: "Regular", source: "project" },
];
function make(width: number): CakeTopperResult {
  return {
    svg: `<svg data-width="${width}"/>`, png_base64: "AA==", svg_filename: "sarah.svg", png_filename: "sarah.png", warnings: [],
    metadata: { canvas_width_mm: width, canvas_height_mm: 50, stakes: [], ring: null, inter_line_gaps_mm: [3],
      lines: ["Happy", "Birthday"].map((text, index) => ({ text, font_name: "Lato", font_size_mm: 42, x_offset_mm: 0,
        y_offset_mm: index * 40, width_mm: 80, height_mm: 30, glyph_chars: ["H", "i"], gaps_before_mm: [1.5],
        gaps_after_mm: [-1.5], floating_components: [] })) },
  } as unknown as CakeTopperResult;
}
type Deferred = { resolve: (value: CakeTopperResult) => void; reject: (error: Error) => void };
let pending: Deferred[] = [];
let container: HTMLDivElement, root: Root;
beforeEach(async () => {
  vi.useFakeTimers();
  pending = [];
  vi.mocked(generateCakeTopper).mockReset();
  vi.mocked(generateCakeTopper).mockImplementation(() => new Promise((resolve, reject) => { pending.push({ resolve, reject }); }));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<CakeTopperPanel fonts={fonts} manualFonts={[]} />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });

const button = (text: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((element) => element.textContent?.includes(text))!;
const svgButton = () => container.querySelector<HTMLButtonElement>('[aria-label="Download SVG"]')!;
const finalSize = () => container.querySelector(".ct-final-size")!.textContent!;
const calls = () => vi.mocked(generateCakeTopper).mock.calls;
async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function settle(index: number, width: number) { await act(async () => { pending[index].resolve(make(width)); }); }
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
async function generate(width = 100) {
  await act(async () => button("Generate design").click());
  await settle(pending.length - 1, width);
}
async function openLines() { await act(async () => container.querySelector<HTMLButtonElement>("#inspector-tab-lines")!.click()); }
const positionX = () => container.querySelector<HTMLInputElement>(".ct-position-input")!;

it("F3: a slower earlier response never replaces a newer one", async () => {
  await generate(100);
  await openLines();
  await type(positionX(), "4");
  await tick(200);
  await type(positionX(), "8");
  await tick(200);
  expect(calls()).toHaveLength(3);
  await settle(2, 300);
  expect(finalSize()).toContain("300.0");
  await settle(1, 200);
  expect(finalSize()).toContain("300.0");
  expect(container.querySelector('[data-testid="preview"]')!.textContent).toContain('data-width="300"');
  expect(svgButton().disabled).toBe(false);
});

it("F3: export is disabled while loading and after an input change until the new result arrives", async () => {
  await generate(100);
  expect(svgButton().disabled).toBe(false);
  await openLines();
  await type(positionX(), "5");
  expect(svgButton().disabled).toBe(true);
  expect(container.textContent).toContain("Updating");
  await settle(1, 120);
  expect(svgButton().disabled).toBe(false);
  expect(container.textContent).toContain("Ready to export");
});

it("F3: an edit that cannot regenerate leaves export disabled with a hint", async () => {
  const base = () => container.querySelector<HTMLInputElement>(".ct-field--size input")!;
  await type(base(), "60");
  await generate(100);
  expect(svgButton().disabled).toBe(false);
  const before = calls().length;
  await type(base(), ""); // incomplete number: no request is sent
  expect(calls().length).toBe(before);
  expect(svgButton().disabled).toBe(true);
  expect(container.textContent).toContain("Regenerate to export");
});

it("F3: rapid numeric edits are coalesced into one trailing regeneration", async () => {
  await generate(100);
  await openLines();
  await type(positionX(), "1");
  await type(positionX(), "12");
  await type(positionX(), "123");
  expect(calls()).toHaveLength(2); // the first edit regenerates at once
  await tick(200);
  expect(calls()).toHaveLength(3);
  expect(calls().at(-1)![4][0].manual_x_offset_mm).toBe(123);
});

it("F2: a Base size of 60 mm survives line edits", async () => {
  await type(container.querySelector<HTMLInputElement>(".ct-field--size input")!, "60");
  await generate(100);
  expect(calls()[0][2]).toBe(60);
  await openLines();
  await type(positionX(), "3");
  const lines = calls().at(-1)![4];
  expect(lines).toHaveLength(2);
  expect(lines.every((line) => line.font_size_mm === 60)).toBe(true);
});

it("F4: changing Base font or Base size after Generate regenerates with the new values", async () => {
  await generate(100);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Base font"]')!.click());
  let request = calls().at(-1)!;
  expect(calls()).toHaveLength(2);
  expect(request[1]).toBe("lora");
  expect(request[4].every((line) => line.font_id === "lora")).toBe(true);
  expect(svgButton().disabled).toBe(true);
  await settle(1, 110);
  expect(svgButton().disabled).toBe(false);
  await type(container.querySelector<HTMLInputElement>(".ct-field--size input")!, "55");
  await tick(200);
  request = calls().at(-1)!;
  expect(request[2]).toBe(55);
  expect(request[4].every((line) => line.font_size_mm === 55)).toBe(true);
});

it("F4: a line that has its own font keeps it and the user is told", async () => {
  await generate(100);
  await openLines();
  await type(container.querySelector<HTMLInputElement>(".ct-line-appearance-row input")!, "30");
  await settle(1, 100);
  await act(async () => container.querySelector<HTMLButtonElement>("#inspector-tab-design")!.click());
  await type(container.querySelector<HTMLInputElement>(".ct-field--size input")!, "50");
  await tick(200);
  const lines = calls().at(-1)![4];
  expect(lines[0].font_size_mm).toBe(30);
  expect(lines[1].font_size_mm).toBe(50);
  expect(container.textContent).toContain("Line 1 keeps its own size");
});

it("F3: an in-flight response is discarded after the text changes", async () => {
  await act(async () => button("Generate design").click());
  await type(container.querySelector<HTMLInputElement>("#ct-text")!, "Happy Birthday Sarah");
  await settle(0, 100);
  expect(finalSize()).toContain("Not generated");
  expect(svgButton().disabled).toBe(true);
  expect(button("Generate design").disabled).toBe(false);
});

it("F4: an emptied Base size field does not detach lines from the base", async () => {
  await generate(100);
  const base = () => container.querySelector<HTMLInputElement>(".ct-field--size input")!;
  await type(base(), "");
  await type(base(), "60");
  await tick(200);
  expect(calls().at(-1)![4].every((line) => line.font_size_mm === 60)).toBe(true);
  expect(container.textContent).not.toContain("own size");
});

it("F3: changing the default overlap regenerates a result that can be exported", async () => {
  await generate(100);
  await act(async () => button("Strong").click());
  expect(calls().at(-1)![3]).toBe("strong");
  await settle(1, 100);
  expect(svgButton().disabled).toBe(false);
});
