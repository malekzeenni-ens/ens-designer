import { Download } from "lucide-react";

interface ExportControlsProps {
  svg: string | null;
  pngBase64: string | null;
  svgFilename: string;
  pngFilename: string;
}

export function ExportControls({ svg, pngBase64, svgFilename, pngFilename }: ExportControlsProps) {
  const disabled = !svg || !pngBase64;

  return (
    <div className="export-controls">
      <button type="button" disabled={disabled} onClick={() => svg && downloadText(svg, svgFilename, "image/svg+xml")}>
        <Download size={18} aria-hidden="true" />
        Download SVG
      </button>
      <button type="button" disabled={disabled} onClick={() => pngBase64 && downloadBase64(pngBase64, pngFilename)}>
        <Download size={18} aria-hidden="true" />
        Download PNG
      </button>
    </div>
  );
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

function downloadBase64(content: string, filename: string) {
  triggerDownload(`data:image/png;base64,${content}`, filename);
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
