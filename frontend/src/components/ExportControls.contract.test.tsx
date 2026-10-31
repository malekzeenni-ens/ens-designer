import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ExportControls } from "./ExportControls";

it("delivers original SVG and PNG sources with their supplied filenames and export intent", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#800080" d="M0 0h5v5z"/></svg>';
  const png = "iVBORw0KGgoAAAANSUhEUg==";
  const blob = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:original-artwork");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const links: { href: string; filename: string }[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { links.push({ href: this.href, filename: this.download }); });
  const onExport = vi.fn();
  try {
    await act(async () => root.render(<ExportControls svg={svg} pngBase64={png} svgFilename="Maya.svg" pngFilename="Maya.png" onExport={onExport} />));
    await act(async () => container.querySelectorAll("button").forEach(button => button.click()));
    expect(blob.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((blob.mock.calls[0][0] as Blob).type).toBe("image/svg+xml");
    expect((blob.mock.calls[0][0] as Blob).size).toBe(new Blob([svg]).size);
    expect(links).toEqual([{ href: "blob:original-artwork", filename: "Maya.svg" }, { href: `data:image/png;base64,${png}`, filename: "Maya.png" }]);
    expect(onExport.mock.calls).toEqual([["svg"], ["png"]]);
    expect(revoke).toHaveBeenCalledWith("blob:original-artwork");
  } finally {
    await act(async () => root.unmount()); container.remove();
    click.mockRestore(); blob.mockRestore(); revoke.mockRestore();
  }
});
