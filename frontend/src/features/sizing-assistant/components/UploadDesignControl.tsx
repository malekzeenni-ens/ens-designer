import { FileImage, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { parsePngDimensions, parseSvgDimensions } from "../engine/parseDesignDimensions";
import type { UploadedDesignMetadata } from "../engine/sizingTypes";

interface UploadDesignControlProps {
  uploadedFile: UploadedDesignMetadata | null;
  onUpload: (metadata: UploadedDesignMetadata) => void;
  onManualDimensionsChange: (width: number | null, height: number | null) => void;
}

export function UploadDesignControl({
  uploadedFile,
  onUpload,
  onManualDimensionsChange,
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
