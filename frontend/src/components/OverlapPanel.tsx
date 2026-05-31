import { Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ExportControls } from "./ExportControls";
import { FontSelector } from "./FontSelector";
import { PreviewPanel } from "./PreviewPanel";
import { TextInput } from "./TextInput";
import { generateOverlap } from "../services/generationApi";
import type { FontInfo, OverlapMode, OverlapResult } from "../types/design";

interface OverlapPanelProps {
  fonts: FontInfo[];
}

const MODES: { value: OverlapMode; label: string; description: string }[] = [
  { value: "auto",   label: "Auto",   description: "1.0 mm overlap — sensible default" },
  { value: "light",  label: "Light",  description: "0.5 mm overlap — letters barely touching" },
  { value: "medium", label: "Medium", description: "1.5 mm overlap — clean connection" },
  { value: "strong", label: "Strong", description: "2.5 mm overlap — letters clearly merged" },
  { value: "custom", label: "Custom", description: "Enter your own overlap in mm" },
];

export function OverlapPanel({ fonts }: OverlapPanelProps) {
  const [text, setText] = useState("Oliver");
  const [fontSearch, setFontSearch] = useState("");
  const [fontId, setFontId] = useState(fonts[0]?.id ?? "");
  const [mode, setMode] = useState<OverlapMode>("medium");
  const [customMm, setCustomMm] = useState("1.5");
  const [result, setResult] = useState<OverlapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) =>
      `${f.full_name} ${f.family} ${f.style}`.toLowerCase().includes(q)
    );
  }, [fonts, fontSearch]);

  const selectedFont = useMemo(() => fonts.find((f) => f.id === fontId), [fonts, fontId]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const custom = mode === "custom" ? parseFloat(customMm) || 1.5 : undefined;
      setResult(await generateOverlap(text, fontId, mode, custom));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not generate overlap design.");
    } finally {
      setLoading(false);
    }
  }

  const meta = result?.overlap_metadata;

  return (
    <div className="overlap-panel">
      <div className="overlap-description">
        <p>
          Moves letters closer until they overlap by a controlled amount.
          No bridges · No connectivity analysis · Pure XCS-style tracking reduction.
        </p>
      </div>

      <div className="controls">
        <TextInput value={text} onChange={setText} />
        <FontSelector
          fonts={filteredFonts}
          value={fontId}
          onChange={setFontId}
          search={fontSearch}
          onSearchChange={setFontSearch}
        />
        <div /> {/* spacer — no material selector */}
        <button
          className="generate-button"
          type="button"
          onClick={handleGenerate}
          disabled={loading || !fontId || filteredFonts.length === 0}
        >
          <Wand2 size={18} aria-hidden="true" />
          {loading ? "Generating" : "Generate"}
        </button>
      </div>

      {selectedFont && <p className="font-note">Selected: {selectedFont.full_name}</p>}

      <div className="overlap-mode-row">
        <span className="overlap-mode-label">Overlap</span>
        <div className="overlap-mode-buttons">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              title={m.description}
              className={`overlap-mode-btn${mode === m.value ? " overlap-mode-btn--active" : ""}`}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === "custom" && (
          <label className="overlap-custom-input">
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={customMm}
              onChange={(e) => setCustomMm(e.target.value)}
              aria-label="Custom overlap in mm"
            />
            <span>mm</span>
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <PreviewPanel svg={result?.svg ?? null} />

      {meta && (
        <div className="overlap-meta">
          <span>Overlap: {meta.target_overlap_mm} mm</span>
          <span>
            Gaps: [{meta.gaps_before_mm.map((g) => g.toFixed(1)).join(", ")}] →
            [{meta.gaps_after_mm.map((g) => g.toFixed(1)).join(", ")}] mm
          </span>
        </div>
      )}

      <div className="footer-bar">
        <div>
          <span>SVG-first export</span>
          <strong>
            {result
              ? `${result.dimensions.width}mm x ${result.dimensions.height}mm`
              : "Ready"}
          </strong>
        </div>
        <ExportControls
          svg={result?.svg ?? null}
          pngBase64={result?.png_base64 ?? null}
          svgFilename={result?.svg_filename ?? "design.svg"}
          pngFilename={result?.png_filename ?? "design.png"}
        />
      </div>
    </div>
  );
}
