import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PreviewPanel } from "./PreviewPanel";

let container: HTMLDivElement, root: Root;
const onLineDrag = vi.fn();
const onSelectLine = vi.fn();
function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 7 });
  return event;
}
beforeEach(async () => {
  onLineDrag.mockClear(); onSelectLine.mockClear();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<PreviewPanel svg="<svg/>" lineBoxes={[{ xMm: 0, yMm: 0, wMm: 50, hMm: 20 }]}
    canvasWidthMm={100} canvasHeightMm={50} onLineDrag={onLineDrag} onSelectLine={onSelectLine} />));
  vi.spyOn(container.querySelector<HTMLElement>(".preview-svg-host")!, "getBoundingClientRect")
    .mockReturnValue({ width: 200, height: 100, left: 0, top: 0, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
const handle = () => container.querySelector<HTMLElement>('[data-line-index="0"]')!;

it("R1 F9: pointercancel discards the drag instead of committing it", async () => {
  await act(async () => { handle().dispatchEvent(pointer("pointerdown", 10, 10)); });
  await act(async () => { document.dispatchEvent(pointer("pointermove", 60, 30)); });
  await act(async () => { document.dispatchEvent(pointer("pointercancel", 60, 30)); });
  expect(onLineDrag).not.toHaveBeenCalled();
  expect(handle().style.transform).toBe("");
  // A later pointerup for the same pointer must not commit either.
  await act(async () => { document.dispatchEvent(pointer("pointerup", 80, 40)); });
  expect(onLineDrag).not.toHaveBeenCalled();
});

it("R1 F9: losing pointer capture discards the drag", async () => {
  await act(async () => { handle().dispatchEvent(pointer("pointerdown", 10, 10)); });
  await act(async () => { document.dispatchEvent(pointer("pointermove", 60, 30)); });
  await act(async () => { handle().dispatchEvent(pointer("lostpointercapture", 60, 30)); });
  await act(async () => { document.dispatchEvent(pointer("pointerup", 60, 30)); });
  expect(onLineDrag).not.toHaveBeenCalled();
});

it("R1 F9: a normal pointerup still commits the drag", async () => {
  await act(async () => { handle().dispatchEvent(pointer("pointerdown", 10, 10)); });
  await act(async () => { document.dispatchEvent(pointer("pointermove", 60, 30)); });
  await act(async () => { document.dispatchEvent(pointer("pointerup", 60, 30)); });
  expect(onLineDrag).toHaveBeenCalledTimes(1);
  expect(onLineDrag.mock.calls[0][1]).toBeCloseTo(25);
  expect(onLineDrag.mock.calls[0][2]).toBeCloseTo(10);
});
