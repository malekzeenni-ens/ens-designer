import { Wand2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ExportControls } from "./ExportControls";
import { FontSelector } from "./FontSelector";
import { PreviewPanel } from "./PreviewPanel";
import { generateCakeTopper } from "../services/generationApi";
import type {
  AlignmentMode,
  CakeTopperLineConfig,
  CakeTopperResult,
  FontInfo,
  OverlapGapConfig,
  OverlapMode,
} from "../types/design";

interface CakeTopperPanelProps {
  fonts: FontInfo[];
}

const OVERLAP_MODES: { value: OverlapMode; label: string; mm: number | null }[] = [
  { value: "light",  label: "Light",  mm: 0.5 },
  { value: "auto",   label: "Auto",   mm: 1.0 },
  { value: "medium", label: "Medium", mm: 1.5 },
  { value: "strong", label: "Strong", mm: 2.5 },
  { value: "custom", label: "Custom", mm: null },
];

const ALIGNMENTS: { value: AlignmentMode; label: string }[] = [
  { value: "left",   label: "Left"   },
  { value: "center", label: "Center" },
  { value: "right",  label: "Right"  },
  { value: "manual", label: "Manual" },
];

type GapState = { enabled: boolean; overlapMm: string };
type LineState = {
  fontId: string;
  fontSizeMm: string;
  alignment: AlignmentMode;
  alignmentOffsetMm: string;
  overlapMode: OverlapMode;
  overlapCustomMm: string;
  gapStates: GapState[];
};

const DEFAULT_FONT_SIZE = "42";
const DEFAULT_OVERLAP: OverlapMode = "medium";
const DEFAULT_INTER_GAP = "3";

function initLineState(fontId: string): LineState {
  return {
    fontId,
    fontSizeMm: DEFAULT_FONT_SIZE,
    alignment: "center",
    alignmentOffsetMm: "0",
    overlapMode: DEFAULT_OVERLAP,
    overlapCustomMm: "1.5",
    gapStates: [],
  };
}

export function CakeTopperPanel({ fonts }: CakeTopperPanelProps) {
  const [text, setText] = useState("Happy Birthday");
  const [defaultFontId, setDefaultFontId] = useState(fonts[0]?.id ?? "");
  const [fontSearch, setFontSearch] = useState("");
  const [defaultFontSize, setDefaultFontSize] = useState(DEFAULT_FONT_SIZE);
  const [defaultOverlap, setDefaultOverlap] = useState<OverlapMode>(DEFAULT_OVERLAP);
  const [lineStates, setLineStates] = useState<LineState[]>([]);
  const [interLineGaps, setInterLineGaps] = useState<string[]>([]);
  const [result, setResult] = useState<CakeTopperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).slice(0, 4),
    [text]
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) =>
      `${f.full_name} ${f.family} ${f.style}`.toLowerCase().includes(q)
    );
  }, [fonts, fontSearch]);

  function buildLineConfigs(states: LineState[]): CakeTopperLineConfig[] {
    return states.map((s) => ({
      font_id: s.fontId || defaultFontId,
      font_size_mm: parseFloat(s.fontSizeMm) || 42,
      alignment: s.alignment,
      alignment_offset_mm: parseFloat(s.alignmentOffsetMm) || 0,
      overlap_mode: s.overlapMode,
      overlap_custom_mm: s.overlapMode === "custom" ? (parseFloat(s.overlapCustomMm) || null) : null,
      gap_configs: s.gapStates.map((g, i): OverlapGapConfig => ({
        pair_index: i,
        enabled: g.enabled,
        overlap_mm: parseFloat(g.overlapMm) || 1.5,
      })),
    }));
  }

  async function callApi(states: LineState[], gaps: string[]) {
    const n = words.length;
    const configs = states.length >= n ? buildLineConfigs(states.slice(0, n)) : [];
    const gapValues = gaps.slice(0, n - 1).map((g) => parseFloat(g) || 3);

    setLoading(true);
    setError(null);
    try {
      const r = await generateCakeTopper(
        text,
        defaultFontId,
        parseFloat(defaultFontSize) || 42,
        defaultOverlap,
        configs,
        gapValues,
      );
      setResult(r);

      // Initialise line/gap states from first generation
      if (states.length === 0) {
        const overlapMm = String(
          OVERLAP_MODES.find((m) => m.value === defaultOverlap)?.mm ?? 1.5
        );
        const newStates = r.metadata.lines.map((lineMeta) => ({
          ...initLineState(defaultFontId),
          gapStates: lineMeta.gaps_before_mm.map(() => ({
            enabled: true,
            overlapMm,
          })),
        }));
        setLineStates(newStates);
        setInterLineGaps(r.metadata.inter_line_gaps_mm.map(String));
      }
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not generate cake topper.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    setLineStates([]);
    setInterLineGaps([]);
    callApi([], []);
  }

  function updateLine(i: number, patch: Partial<LineState>, regen = true) {
    const updated = lineStates.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    setLineStates(updated);
    if (regen) callApi(updated, interLineGaps);
  }

  function updateGap(i: number, value: string) {
    const updated = interLineGaps.map((g, idx) => idx === i ? value : g);
    setInterLineGaps(updated);
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) callApi(lineStates, updated);
  }

  function toggleGap(lineIdx: number, gapIdx: number) {
    const updated = lineStates.map((s, i) =>
      i !== lineIdx ? s : {
        ...s,
        gapStates: s.gapStates.map((g, j) =>
          j === gapIdx ? { ...g, enabled: !g.enabled } : g
        ),
      }
    );
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  function updateGapMm(lineIdx: number, gapIdx: number, value: string) {
    const updated = lineStates.map((s, i) =>
      i !== lineIdx ? s : {
        ...s,
        gapStates: s.gapStates.map((g, j) =>
          j === gapIdx ? { ...g, overlapMm: value } : g
        ),
      }
    );
    setLineStates(updated);
    if (!isNaN(parseFloat(value))) callApi(updated, interLineGaps);
  }

  function applyGlobalOverlap(mode: OverlapMode) {
    setDefaultOverlap(mode);
    const mm = OVERLAP_MODES.find((m) => m.value === mode)?.mm;
    if (mm === null || mm === undefined || lineStates.length === 0) return;
    const updated = lineStates.map((s) => ({
      ...s,
      overlapMode: mode,
      gapStates: s.gapStates.map((g) => ({ ...g, overlapMm: String(mm) })),
    }));
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  const meta = result?.metadata;

  return (
    <div className="ct-panel">
      <div className="ct-description">
        <p>
          Multi-line text for cake toppers. Each line has its own font, size, alignment,
          and letter-spacing controls. Vertical gaps between lines are independently adjustable.
        </p>
      </div>

      {/* Global controls */}
      <div className="ct-global-row">
        <label className="ct-global-field">
          <span>Text</span>
          <input
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); setLineStates([]); setInterLineGaps([]); setResult(null); }}
            placeholder="Happy Birthday Sarah"
            className="ct-text-input"
          />
        </label>
        <label className="ct-global-field">
          <span>Default Font</span>
          <div className="ct-font-row">
            <input
              type="text"
              placeholder="search…"
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className="ct-font-search"
            />
            <select
              value={defaultFontId}
              onChange={(e) => { setDefaultFontId(e.target.value); setLineStates([]); }}
              aria-label="Default font"
            >
              {filteredFonts.map((f) => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="ct-global-field ct-global-field--narrow">
          <span>Size (mm)</span>
          <input
            type="number"
            min="5"
            max="300"
            step="1"
            value={defaultFontSize}
            onChange={(e) => setDefaultFontSize(e.target.value)}
          />
        </label>
        <button
          className="generate-button"
          type="button"
          onClick={handleGenerate}
          disabled={loading || !defaultFontId || words.length === 0}
        >
          <Wand2 size={18} aria-hidden="true" />
          {loading ? "Generating" : "Generate"}
        </button>
      </div>

      {/* Word preview chips */}
      {words.length > 0 && (
        <div className="ct-word-chips">
          {words.map((w, i) => (
            <span key={i} className="ct-word-chip">Line {i + 1}: {w}</span>
          ))}
        </div>
      )}

      {/* Global overlap shortcut */}
      <div className="overlap-mode-row">
        <span className="overlap-mode-label">
          {lineStates.length > 0 ? "Set all letter gaps to" : "Letter overlap"}
        </span>
        <div className="overlap-mode-buttons">
          {OVERLAP_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`overlap-mode-btn${defaultOverlap === m.value ? " overlap-mode-btn--active" : ""}`}
              onClick={() => applyGlobalOverlap(m.value)}
            >
              {m.label}{m.mm !== null ? ` (${m.mm}mm)` : ""}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Per-line controls — appear after first generation */}
      {lineStates.length > 0 && meta && meta.lines.map((lineMeta, li) => {
        const ls = lineStates[li];
        if (!ls) return null;
        const pairLabels = lineMeta.glyph_chars.slice(0, -1).map(
          (ch, i) => `${ch}→${lineMeta.glyph_chars[i + 1]}`
        );

        return (
          <div key={li} className="ct-line-block">
            <div className="ct-line-header">
              <span className="ct-line-title">Line {li + 1} — {lineMeta.text}</span>
              <span className="ct-line-dims">{lineMeta.width_mm.toFixed(1)} × {lineMeta.height_mm.toFixed(1)} mm</span>
            </div>

            {/* Per-line font, size, alignment */}
            <div className="ct-line-controls">
              <label className="ct-line-field">
                <span>Font</span>
                <select
                  value={ls.fontId || defaultFontId}
                  onChange={(e) => updateLine(li, { fontId: e.target.value })}
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>{f.full_name}</option>
                  ))}
                </select>
              </label>

              <label className="ct-line-field ct-line-field--narrow">
                <span>Size (mm)</span>
                <input
                  type="number" min="5" max="300" step="1"
                  value={ls.fontSizeMm}
                  onChange={(e) => updateLine(li, { fontSizeMm: e.target.value })}
                />
              </label>

              <label className="ct-line-field ct-line-field--narrow">
                <span>Align</span>
                <select
                  value={ls.alignment}
                  onChange={(e) => updateLine(li, { alignment: e.target.value as AlignmentMode })}
                >
                  {ALIGNMENTS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </label>

              {ls.alignment === "manual" && (
                <label className="ct-line-field ct-line-field--narrow">
                  <span>X offset (mm)</span>
                  <input
                    type="number" min="-500" max="500" step="0.5"
                    value={ls.alignmentOffsetMm}
                    onChange={(e) => updateLine(li, { alignmentOffsetMm: e.target.value })}
                  />
                </label>
              )}
            </div>

            {/* Per-letter gap controls */}
            {ls.gapStates.length > 0 && (
              <div className="gap-controls">
                <span className="gap-controls-heading">Letter gaps</span>
                <div className="gap-controls-grid">
                  {ls.gapStates.map((gs, gi) => (
                    <div key={gi} className={`gap-row${gs.enabled ? " gap-row--on" : " gap-row--off"}`}>
                      <button
                        type="button"
                        className={`gap-toggle${gs.enabled ? " gap-toggle--on" : ""}`}
                        onClick={() => toggleGap(li, gi)}
                        aria-pressed={gs.enabled}
                      >
                        {gs.enabled ? "✓" : "○"}
                      </button>
                      <span className="gap-label">{pairLabels[gi] ?? `Gap ${gi + 1}`}</span>
                      {gs.enabled ? (
                        <label className="gap-mm-input">
                          <input
                            type="number" min="0.1" max="10" step="0.1"
                            value={gs.overlapMm}
                            onChange={(e) => updateGapMm(li, gi, e.target.value)}
                          />
                          <span>mm</span>
                        </label>
                      ) : (
                        <span className="gap-disabled-label">disabled</span>
                      )}
                      {lineMeta && (
                        <span className="gap-result">
                          → {lineMeta.gaps_after_mm[gi]?.toFixed(2)} mm
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vertical gap below this line (not after last) */}
            {li < lineStates.length - 1 && (
              <div className="ct-vgap-row">
                <span className="ct-vgap-label">↕ Line {li + 1} → {li + 2} vertical gap</span>
                <label className="ct-vgap-input">
                  <input
                    type="number" min="-200" max="200" step="0.5"
                    value={interLineGaps[li] ?? DEFAULT_INTER_GAP}
                    onChange={(e) => updateGap(li, e.target.value)}
                  />
                  <span>mm</span>
                </label>
                <span className="ct-vgap-hint">
                  {parseFloat(interLineGaps[li] ?? DEFAULT_INTER_GAP) < 0 ? "overlap ↑" : "space ↓"}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Preview */}
      <PreviewPanel svg={result?.svg ?? null} />

      <div className="footer-bar">
        <div>
          <span>SVG-first export</span>
          <strong>
            {meta
              ? `${meta.canvas_width_mm}mm × ${meta.canvas_height_mm}mm`
              : "Ready"}
          </strong>
        </div>
        <ExportControls
          svg={result?.svg ?? null}
          pngBase64={result?.png_base64 ?? null}
          svgFilename={result?.svg_filename ?? "cake-topper.svg"}
          pngFilename={result?.png_filename ?? "cake-topper.png"}
        />
      </div>
    </div>
  );
}
