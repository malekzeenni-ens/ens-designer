import { Download } from "lucide-react";
import { downloadBlob, downloadUrl } from "../services/download";

interface ExportControlsProps {
  compact?: boolean;
  svg: string | null;
  pngBase64: string | null;
  svgFilename: string;
  pngFilename: string;
  /** R1 F3: false while the result is updating or no longer matches the inputs. */
  current?: boolean;
  onExport?: (type: "svg" | "png") => void;
}

export function ExportControls({ svg, pngBase64, svgFilename, pngFilename, onExport, compact = false, current = true }: ExportControlsProps) {
  const disabled = !svg || !pngBase64 || !current;
  const title = (label: string) => (svg && pngBase64 && !current ? `${label} (updating, regenerate to export)` : label);

  return (
    <div className="export-controls">
      <button
        type="button"
        aria-label="Download SVG"
        title={title("Download SVG")}
        disabled={disabled}
        onClick={() => {
          if (!svg || disabled) return;
          downloadBlob(new Blob([svg], { type: "image/svg+xml" }), svgFilename);
          onExport?.("svg");
        }}
      >
        <Download size={18} aria-hidden="true" />
        {compact ? "SVG" : "Download SVG"}
      </button>
      <button
        type="button"
        aria-label="Download PNG"
        title={title("Download PNG")}
        disabled={disabled}
        onClick={() => {
          if (!pngBase64 || disabled) return;
          downloadUrl(`data:image/png;base64,${pngBase64}`, pngFilename);
          onExport?.("png");
        }}
      >
        <Download size={18} aria-hidden="true" />
        {compact ? "PNG" : "Download PNG"}
      </button>
    </div>
  );
}
