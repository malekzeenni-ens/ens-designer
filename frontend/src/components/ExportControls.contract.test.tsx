import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ExportControls } from "./ExportControls";

it("delivers original SVG and PNG sources with their supplied filenames and export intent", async () => {
  vi.useFakeTimers();
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#800080" d="M0 0h5v5z"/></svg>';
  const png = "iVBORw0KGgoAAAANSUhEUg==";
  const blob = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:original-artwork");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const links: { href: string; filename: string }[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    // R1 F12: the anchor is attached to the document when clicked.
    expect(this.isConnected).toBe(true);
    links.push({ href: this.href, filename: this.download });
  });
  const onExport = vi.fn();
  try {
    await act(async () => root.render(<ExportControls svg={svg} pngBase64={png} svgFilename="Maya.svg" pngFilename="Maya.png" onExport={onExport} />));
    await act(async () => container.querySelectorAll("button").forEach(button => button.click()));
    expect(blob.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((blob.mock.calls[0][0] as Blob).type).toBe("image/svg+xml");
    expect((blob.mock.calls[0][0] as Blob).size).toBe(new Blob([svg]).size);
    expect(links).toEqual([{ href: "blob:original-artwork", filename: "Maya.svg" }, { href: `data:image/png;base64,${png}`, filename: "Maya.png" }]);
    expect(onExport.mock.calls).toEqual([["svg"], ["png"]]);
    // R1 F12: the object URL is revoked only after the download has started.
    expect(revoke).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(revoke).toHaveBeenCalledWith("blob:original-artwork");
  } finally {
    await act(async () => root.unmount()); container.remove();
    click.mockRestore(); blob.mockRestore(); revoke.mockRestore(); vi.useRealTimers();
  }
});

it("R1 F3: export stays disabled while the result is not current", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const onExport = vi.fn();
  try {
    await act(async () => root.render(<ExportControls svg="<svg/>" pngBase64="AA==" svgFilename="a.svg" pngFilename="a.png" current={false} onExport={onExport} />));
    const buttons = container.querySelectorAll("button");
    expect([...buttons].every(button => button.disabled)).toBe(true);
    await act(async () => buttons.forEach(button => button.click()));
    expect(onExport).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); container.remove(); }
});
