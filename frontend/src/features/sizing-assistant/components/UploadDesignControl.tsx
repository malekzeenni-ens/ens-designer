import { FileImage, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { parsePngDimensions, parseSvgDimensions } from "../engine/parseDesignDimensions";
import type { SizingAreaMode, UploadedDesignMetadata } from "../engine/sizingTypes";

interface UploadDesignControlProps {
  uploadedFile: UploadedDesignMetadata | null;
  onUpload: (metadata: UploadedDesignMetadata) => void;
  onManualDimensionsChange: (width: number | null, height: number | null) => void;
  onSizingAreaChange: (mode: SizingAreaMode, visibleArtworkHeightPercent?: number) => void;
}

export function UploadDesignControl({
  uploadedFile,
  onUpload,
  onManualDimensionsChange,
  onSizingAreaChange,
}: UploadDesignControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setError(null);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "svg" || file.type === "image/svg+xml") {
      const rawSvgText = await file.text();
      const parsed = parseSvgDimensions(rawSvgText);
      onUpload({
        name: file.name,
        type: "svg",
        originalWidth: parsed.width,
        originalHeight: parsed.height,
        originalUnit: parsed.unit,
        viewBox: parsed.viewBox,
        rawSvgText,
        dimensionsDetected: parsed.dimensionsDetected,
        errors: parsed.errors,
      });
      return;
    }

    if (extension === "png" || file.type === "image/png") {
      const parsed = await parsePngDimensions(file);
      onUpload({
        name: file.name,
        type: "png",
        originalWidth: parsed.width,
        originalHeight: parsed.height,
        originalUnit: parsed.unit,
        previewUrl: URL.createObjectURL(file),
        dimensionsDetected: parsed.dimensionsDetected,
        errors: parsed.errors,
      });
      return;
    }

    setError("Unsupported file type. Please upload an SVG or PNG file.");
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  const needsManualDimensions = uploadedFile && !uploadedFile.dimensionsDetected;

  return (
    <section className="sa-card">
      <div className="sa-card-heading">
        <div>
          <h2>Upload design</h2>
          <p>SVG is preferred. PNG is preview sizing only.</p>
        </div>
        <FileImage size={20} aria-hidden="true" />
      </div>

      <div
        className={`sa-drop-zone${dragging ? " sa-drop-zone--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
      >
        <Upload size={26} aria-hidden="true" />
        <strong>{uploadedFile ? uploadedFile.name : "Drop SVG or PNG here"}</strong>
        <span>{uploadedFile ? `${uploadedFile.type.toUpperCase()} upload` : "or click to browse"}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          className="fonts-file-input"
          onChange={onFileChange}
          tabIndex={-1}
        />
      </div>

      {uploadedFile?.dimensionsDetected && (
        <p className="sa-dimensions-note">
          Detected {uploadedFile.originalWidth} x {uploadedFile.originalHeight} {uploadedFile.originalUnit}
        </p>
      )}

      {uploadedFile?.dimensionsDetected && (
        <div className="sa-sizing-area-control">
          <div className="sa-field-heading">
            <strong>Sizing area</strong>
            <span>Use full upload unless the SVG already includes a stake.</span>
          </div>
          <label className="sa-preview-toggle">
            <input
              type="checkbox"
              checked={uploadedFile.sizingAreaMode === "visibleArtwork"}
              onChange={(event) =>
                onSizingAreaChange(
                  event.target.checked ? "visibleArtwork" : "fullDesign",
                  uploadedFile.visibleArtworkHeightPercent,
                )
              }
            />
            <span>Ignore uploaded stake for sizing</span>
          </label>
          {uploadedFile.sizingAreaMode === "visibleArtwork" && (
            <label className="sa-visible-artwork-control">
              <span>Visible artwork height</span>
              <input
                type="range"
                min="40"
                max="100"
                step="1"
                value={uploadedFile.visibleArtworkHeightPercent ?? 72}
                onChange={(event) => onSizingAreaChange("visibleArtwork", Number(event.target.value))}
              />
              <strong>{uploadedFile.visibleArtworkHeightPercent ?? 72}%</strong>
            </label>
          )}
          <p className="sa-sizing-area-note">
            Recommendations use{" "}
            <strong>
              {formatDimension(uploadedFile.sizingWidth ?? uploadedFile.originalWidth)} x{" "}
              {formatDimension(uploadedFile.sizingHeight ?? uploadedFile.originalHeight)} {uploadedFile.originalUnit}
            </strong>
            . Export keeps the full SVG and scales it proportionally.
          </p>
        </div>
      )}

      {needsManualDimensions && (
        <div className="sa-manual-dimensions">
          <p>The SVG dimensions could not be detected. Please enter the original design width and height manually.</p>
          <div className="sa-inline-fields">
            <label className="ct-card-field">
              <span>Original width</span>
              <span className="ct-unit-input ct-unit-input--compact">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  onChange={(event) =>
                    onManualDimensionsChange(parseManual(event.target.value), uploadedFile.originalHeight)
                  }
                />
                <span>units</span>
              </span>
            </label>
            <label className="ct-card-field">
              <span>Original height</span>
              <span className="ct-unit-input ct-unit-input--compact">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  onChange={(event) =>
                    onManualDimensionsChange(uploadedFile.originalWidth, parseManual(event.target.value))
                  }
                />
                <span>units</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {error && <p className="ct-error">{error}</p>}
    </section>
  );
}

function parseManual(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDimension(value: number | null | undefined): string {
  if (!value) return "-";
  return String(Math.round(value * 10) / 10);
}
