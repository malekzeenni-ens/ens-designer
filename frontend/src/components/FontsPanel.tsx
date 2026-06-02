import { useCallback, useRef, useState } from "react";
import { CheckCircle, Info, Upload, XCircle } from "lucide-react";

import { uploadFont } from "../services/generationApi";
import {
  FONT_TYPE_LABELS,
  getFontClassification,
} from "../config/cakeTopperFontRecommendations";
import type { FontInfo, FontUploadResponse } from "../types/design";

interface FontsPanelProps {
  uploadedFonts: FontInfo[];
  onUploadComplete: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "duplicate" | "error";

interface StatusState {
  status: UploadStatus;
  message: string;
}

const ALLOWED = [".ttf", ".otf"];
const MAX_MB = 10;

export function FontsPanel({ uploadedFonts, onUploadComplete }: FontsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [statusState, setStatusState] = useState<StatusState>({ status: "idle", message: "" });
  const [uploading, setUploading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED.includes(ext)) {
        setStatusState({
          status: "error",
          message: `"${file.name}" is not supported. Only .ttf and .otf files can be uploaded.`,
        });
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setStatusState({
          status: "error",
          message: `"${file.name}" exceeds the ${MAX_MB} MB limit. Please use a smaller font file.`,
        });
        return;
      }

      setUploading(true);
      setStatusState({ status: "uploading", message: `Uploading "${file.name}"…` });

      let result: FontUploadResponse;
      try {
        result = await uploadFont(file);
      } catch (err: unknown) {
        setStatusState({
          status: "error",
          message: err instanceof Error ? err.message : "Upload failed — please try again.",
        });
        setUploading(false);
        return;
      }

      setUploading(false);

      if (result.is_duplicate) {
        setStatusState({ status: "duplicate", message: result.message });
        return;
      }

      if (!result.success) {
        setStatusState({ status: "error", message: result.message });
        return;
      }

      setStatusState({ status: "success", message: result.message });
      onUploadComplete();
    },
    [onUploadComplete],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="fonts-panel">
      {/* Header */}
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img className="ct-brand-logo" src="/brand/etch-n-shine-logo.png" alt="Etch N Shine" />
          <div>
            <p>Etch N Shine</p>
            <h1>Font Library</h1>
          </div>
        </div>
        <div className="ct-header-actions">
          <div className="fa-header-stats">
            <span>
              <strong>{uploadedFonts.length}</strong>
              uploaded
            </span>
          </div>
        </div>
      </header>

      {/* Upload card */}
      <section className="fonts-upload-card">
        <p className="fonts-upload-heading">Upload a Font</p>
        <p className="fonts-upload-sub">
          Supports <strong>.ttf</strong> and <strong>.otf</strong> · Max {MAX_MB} MB · Font will be
          permanently added to the library and available in the Designer immediately.
        </p>

        {/* Drop zone */}
        <div
          className={`fonts-drop-zone${dragging ? " fonts-drop-zone--active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="Drop font file here or click to browse"
        >
          <Upload size={28} aria-hidden="true" />
          <p>Drop a font file here</p>
          <span>or click to browse</span>
          <input
            ref={inputRef}
            type="file"
            accept=".ttf,.otf"
            className="fonts-file-input"
            onChange={onFileChange}
            tabIndex={-1}
          />
        </div>

        {/* Status banner */}
        {statusState.status !== "idle" && (
          <div className={`fonts-status fonts-status--${statusState.status}`}>
            {statusState.status === "success" && <CheckCircle size={17} aria-hidden="true" />}
            {statusState.status === "duplicate" && <Info size={17} aria-hidden="true" />}
            {statusState.status === "error" && <XCircle size={17} aria-hidden="true" />}
            {statusState.status === "uploading" && (
              <span className="fonts-spinner" aria-hidden="true" />
            )}
            <span>{statusState.message}</span>
          </div>
        )}
      </section>

      {/* Uploaded fonts table */}
      <section className="fonts-library-card">
        <p className="fonts-upload-heading">Uploaded Fonts</p>
        {uploadedFonts.length === 0 ? (
          <p className="fonts-empty">
            No fonts uploaded yet. Use the drop zone above to add a .ttf or .otf file.
          </p>
        ) : (
          <>
            <p className="fonts-upload-sub">
              These fonts were added via the upload tool. They appear in the Designer dropdowns and
              Font Adviser automatically. To add a font to the Top 20, add a manual override in{" "}
              <code>cakeTopperFontRecommendations.ts</code> after test-cutting it.
            </p>
            <div className="font-table-wrap">
              <table className="font-table">
                <thead>
                  <tr>
                    <th>Font Name</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Category</th>
                    <th>Risk</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFonts.map((font) => {
                    const c = getFontClassification(font);
                    return (
                      <tr key={font.id}>
                        <td>{font.full_name}</td>
                        <td>{FONT_TYPE_LABELS[c.type]}</td>
                        <td>{c.score}</td>
                        <td>{c.category.replace(/_/g, " ")}</td>
                        <td>
                          <span className={`fonts-risk fonts-risk--${c.riskLevel}`}>
                            {c.riskLevel}
                          </span>
                        </td>
                        <td>{c.riskNotes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
