import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SizingAssistantTab } from "./SizingAssistantTab";

function makePngFile(name: string, width: number, height: number): File {
  const bytes = new Uint8Array(24);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  signature.forEach((b, i) => (bytes[i] = b));
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return new File([bytes], name, { type: "image/png" });
}

async function uploadFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("SizingAssistantTab preview URL lifecycle (F4.1/F4.2)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    let counter = 0;
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:test-${++counter}`);
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    container.remove();
  });

  it("revokes the previous preview URL on re-upload and the last one on unmount", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<SizingAssistantTab />);
    });

    await uploadFile(container, makePngFile("first.png", 100, 50));
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const firstUrl = createObjectURLSpy.mock.results[0]!.value;

    await uploadFile(container, makePngFile("second.png", 200, 80));
    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(firstUrl);
    const secondUrl = createObjectURLSpy.mock.results[1]!.value;

    await act(async () => {
      root.unmount();
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith(secondUrl);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
  });
});
