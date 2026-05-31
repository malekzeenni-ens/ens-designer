import { Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ExportControls } from "./ExportControls";
import { FontSelector } from "./FontSelector";
import { PreviewPanel } from "./PreviewPanel";
import { TextInput } from "./TextInput";
import { generateOverlap } from "../services/generationApi";
import type { FontInfo, OverlapGapConfig, OverlapMode, OverlapResult } from "../types/design";

interface OverlapPanelProps {
  fonts: FontInfo[];
}

const MODES: { value: OverlapMode; label: string; mm: number | null }[] = [
  { value: "light",  label: "Light",  mm: 0.5 },
  { value: "auto",   label: "Auto",   mm: 1.0 },
  { value: "medium", label: "Medium", mm: 1.5 },
  { value: "strong", label: "Strong", mm: 2.5 },
  { value: "custom", label: "Custom", mm: null },
];

type GapState = { enabled: boolean; overlapMm: string };

function defaultGapStates(count: number, overlapMm: number): GapState[] {
  return Array.from({ length: count }, () => ({
    enabled: true,
    overlapMm: String(overlapMm),
  }));
}

export function OverlapPanel({ fonts }: OverlapPanelProps) {
  const [text, setText] = useState("Oliver");
  const [fontSearch, setFontSearch] = useState("");
  const [fontId, setFontId] = useState(fonts[0]?.id ?? "");
  const [mode, setMode] = useState<OverlapMode>("medium");
  const [customMm, setCustomMm] = useState("1.5");
  const [gapStates, setGapStates] = useState<GapState[]>([]);
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

  // Auto-select first visible font when the current selection is filtered out
  useEffect(() => {
    if (filteredFonts.length > 0 && !filteredFonts.some((f) => f.id === fontId)) {
      setFontId(filteredFonts[0].id);
    }
  }, [filteredFonts]); // eslint-disable-line react-hooks/exhaustive-deps

  const globalMm = useMemo(() => {
    if (mode === "custom") return parseFloat(customMm) || 1.5;
    return MODES.find((m) => m.value === mode)?.mm ?? 1.5;
  }, [mode, customMm]);

  // Build gap_configs from current gapStates to send to the API
  const buildConfigs = useCallback(
    (states: GapState[]): OverlapGapConfig[] =>
      states.map((s, i) => ({
        pair_index: i,
        enabled: s.enabled,
        overlap_mm: parseFloat(s.overlapMm) || globalMm,
      })),
    [globalMm]
  );

  async function callApi(states: GapState[], currentMode: OverlapMode, currentCustom: string) {
    setLoading(true);
    setError(null);
    try {
      const custom = currentMode === "custom" ? parseFloat(currentCustom) || 1.5 : undefined;
      const configs = states.length > 0 ? buildConfigs(states) : [];
      const r = await generateOverlap(text, fontId, currentMode, custom, configs);
      setResult(r);
      // Initialise gap states on first generation
      if (states.length === 0) {
        setGapStates(defaultGapStates(r.overlap_metadata.gaps_before_mm.length, globalMm));
      }
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not generate overlap design.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    // Reset gap states so first generation applies global mode to all gaps
    const newStates: GapState[] = [];
    setGapStates(newStates);
    callApi(newStates, mode, customMm);
  }

  function handleModeChange(m: OverlapMode) {
    setMode(m);
    // Apply mode value to all currently enabled gaps
    if (gapStates.length > 0) {
      const mm = MODES.find((x) => x.value === m)?.mm;
      if (mm !== null && mm !== undefined) {
        const updated = gapStates.map((s) => ({ ...s, overlapMm: String(mm) }));
        setGapStates(updated);
        callApi(updated, m, customMm);
      }
    }
  }

  function handleGapToggle(i: number) {
    const updated = gapStates.map((s, idx) =>
      idx === i ? { ...s, enabled: !s.enabled } : s
    );
    setGapStates(updated);
    callApi(updated, mode, customMm);
  }

  function handleGapMm(i: number, value: string) {
    const updated = gapStates.map((s, idx) =>
      idx === i ? { ...s, overlapMm: value } : s
    );
    setGapStates(updated);
    // Only re-generate when value is a valid number
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      callApi(updated, mode, customMm);
    }
  }

  const meta = result?.overlap_metadata;
  const pairLabels: string[] = meta
    ? meta.glyph_chars.slice(0, -1).map((ch, i) => `${ch} → ${meta.glyph_chars[i + 1]}`)
    : [];

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
        <div />
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

      {/* Global mode — "set all gaps to X" */}
      <div className="overlap-mode-row">
        <span className="overlap-mode-label">
          {gapStates.length > 0 ? "Set all to" : "Overlap"}
        </span>
        <div className="overlap-mode-buttons">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`overlap-mode-btn${mode === m.value ? " overlap-mode-btn--active" : ""}`}
              onClick={() => handleModeChange(m.value)}
            >
              {m.label}{m.mm !== null ? ` (${m.mm}mm)` : ""}
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

      {/* Per-gap controls — appear after first generation */}
      {gapStates.length > 0 && (
        <div className="gap-controls" aria-label="Per-gap overlap controls">
          <span className="gap-controls-heading">Gap controls</span>
          <div className="gap-controls-grid">
            {gapStates.map((state, i) => (
              <div key={i} className={`gap-row${state.enabled ? " gap-row--on" : " gap-row--off"}`}>
                <button
                  type="button"
                  className={`gap-toggle${state.enabled ? " gap-toggle--on" : ""}`}
                  onClick={() => handleGapToggle(i)}
                  aria-pressed={state.enabled}
                  title={state.enabled ? "Click to disable this gap" : "Click to enable this gap"}
                >
                  {state.enabled ? "✓" : "○"}
                </button>
                <span className="gap-label">{pairLabels[i] ?? `Gap ${i + 1}`}</span>
                {state.enabled ? (
                  <label className="gap-mm-input">
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={state.overlapMm}
                      onChange={(e) => handleGapMm(i, e.target.value)}
                      aria-label={`Overlap for gap ${i + 1} in mm`}
                    />
                    <span>mm</span>
                  </label>
                ) : (
                  <span className="gap-disabled-label">disabled</span>
                )}
                {meta && (
                  <span className="gap-result">
                    {state.enabled
                      ? `→ ${meta.gaps_after_mm[i]?.toFixed(2)} mm`
                      : `→ ${meta.gaps_before_mm[i]?.toFixed(2)} mm`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <PreviewPanel svg={result?.svg ?? null} />

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
