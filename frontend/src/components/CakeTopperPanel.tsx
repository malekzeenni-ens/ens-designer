import { ChevronDown, ChevronRight, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ExportControls } from "./ExportControls";
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

const ALIGNMENTS: AlignmentMode[] = ["left", "center", "right", "manual"];

type GapState = { enabled: boolean; overlapMm: string };
type LineState = {
  fontId: string;
  fontSizeMm: string;
  alignment: AlignmentMode;
  alignmentOffsetMm: string;
  overlapMode: OverlapMode;
  overlapCustomMm: string;
  gapStates: GapState[];
  expanded: boolean;
};

const DEFAULT_SIZE = "42";
const DEFAULT_OVERLAP: OverlapMode = "medium";
const DEFAULT_INTER_GAP = "3";

function initLine(fontId: string, overlapMm: string, numGaps: number): LineState {
  return {
    fontId,
    fontSizeMm: DEFAULT_SIZE,
    alignment: "center",
    alignmentOffsetMm: "0",
    overlapMode: DEFAULT_OVERLAP,
    overlapCustomMm: "1.5",
    gapStates: Array.from({ length: numGaps }, () => ({ enabled: true, overlapMm })),
    expanded: true,
  };
}

export function CakeTopperPanel({ fonts }: CakeTopperPanelProps) {
  const [text, setText] = useState("Happy Birthday");
  const [fontSearch, setFontSearch] = useState("");
  const [defaultFontId, setDefaultFontId] = useState(fonts[0]?.id ?? "");
  const [defaultSize, setDefaultSize] = useState(DEFAULT_SIZE);
  const [defaultOverlap, setDefaultOverlap] = useState<OverlapMode>(DEFAULT_OVERLAP);
  const [lineStates, setLineStates] = useState<LineState[]>([]);
  const [interLineGaps, setInterLineGaps] = useState<string[]>([]);
  const [result, setResult] = useState<CakeTopperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).slice(0, 4),
    [text],
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) =>
      `${f.full_name} ${f.family} ${f.style}`.toLowerCase().includes(q),
    );
  }, [fonts, fontSearch]);

  // Auto-select first visible font when the current selection is filtered out
  useEffect(() => {
    if (filteredFonts.length > 0 && !filteredFonts.some((f) => f.id === defaultFontId)) {
      setDefaultFontId(filteredFonts[0].id);
    }
  }, [filteredFonts]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const gapValues = gaps.slice(0, n - 1).map((g) => parseFloat(g) ?? 3);
    setLoading(true);
    setError(null);
    try {
      const r = await generateCakeTopper(
        text, defaultFontId, parseFloat(defaultSize) || 42,
        defaultOverlap, configs, gapValues,
      );
      setResult(r);
      if (states.length === 0) {
        const mm = String(OVERLAP_MODES.find((m) => m.value === defaultOverlap)?.mm ?? 1.5);
        setLineStates(
          r.metadata.lines.map((lm) => initLine(defaultFontId, mm, lm.gaps_before_mm.length)),
        );
        setInterLineGaps(r.metadata.inter_line_gaps_mm.map(String));
      }
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Could not generate cake topper.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    setLineStates([]);
    setInterLineGaps([]);
    callApi([], []);
  }

  function patchLine(i: number, patch: Partial<LineState>) {
    const updated = lineStates.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    setLineStates(updated);
    if (!("expanded" in patch)) callApi(updated, interLineGaps);
  }

  function toggleGap(li: number, gi: number) {
    const updated = lineStates.map((s, i) =>
      i !== li ? s : {
        ...s,
        gapStates: s.gapStates.map((g, j) => j === gi ? { ...g, enabled: !g.enabled } : g),
      },
    );
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  function setGapMm(li: number, gi: number, value: string) {
    const updated = lineStates.map((s, i) =>
      i !== li ? s : {
        ...s,
        gapStates: s.gapStates.map((g, j) => j === gi ? { ...g, overlapMm: value } : g),
      },
    );
    setLineStates(updated);
    if (!isNaN(parseFloat(value))) callApi(updated, interLineGaps);
  }

  function setInterGap(i: number, value: string) {
    const updated = interLineGaps.map((g, idx) => idx === i ? value : g);
    setInterLineGaps(updated);
    if (!isNaN(parseFloat(value))) callApi(lineStates, updated);
  }

  function applyGlobalOverlap(mode: OverlapMode) {
    setDefaultOverlap(mode);
    if (lineStates.length === 0) return;
    const mm = OVERLAP_MODES.find((m) => m.value === mode)?.mm;
    if (mm == null) return;
    const updated = lineStates.map((s) => ({
      ...s,
      overlapMode: mode,
      gapStates: s.gapStates.map((g) => ({ ...g, overlapMm: String(mm) })),
    }));
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  const meta = result?.metadata;
  const overlapMmForMode = OVERLAP_MODES.find((m) => m.value === defaultOverlap)?.mm ?? 1.5;

  return (
    <div className="ct-panel">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="ct-topbar">
        <div className="ct-topbar-text">
          <label className="ct-label" htmlFor="ct-text">Text</label>
          <input
            id="ct-text"
            type="text"
            className="ct-text-input"
            value={text}
            placeholder="Happy Birthday Sarah"
            onChange={(e) => {
              setText(e.target.value);
              setLineStates([]);
              setInterLineGaps([]);
              setResult(null);
            }}
          />
        </div>

        <div className="ct-topbar-font">
          <label className="ct-label">Font</label>
          <div className="ct-font-combo">
            <input
              type="text"
              placeholder="Search…"
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className="ct-font-search"
            />
            <select
              value={defaultFontId}
              onChange={(e) => setDefaultFontId(e.target.value)}
              aria-label="Default font"
            >
              {filteredFonts.map((f) => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ct-topbar-size">
          <label className="ct-label">Size&nbsp;(mm)</label>
          <input
            type="number" min="5" max="300" step="1"
            value={defaultSize}
            onChange={(e) => setDefaultSize(e.target.value)}
          />
        </div>

        <button
          className="generate-button"
          type="button"
          onClick={handleGenerate}
          disabled={loading || !defaultFontId || words.length === 0}
        >
          <Wand2 size={18} aria-hidden="true" />
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {/* Word chips */}
      {words.length > 0 && (
        <div className="ct-chips">
          {words.map((w, i) => (
            <span key={i} className="ct-chip">Line {i + 1}: {w}</span>
          ))}
        </div>
      )}

      {/* Letter overlap shortcut */}
      <div className="ct-overlap-row">
        <span className="ct-label">{lineStates.length > 0 ? "Set all letter gaps" : "Letter overlap"}</span>
        <div className="ct-overlap-btns">
          {OVERLAP_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`ct-overlap-btn${defaultOverlap === m.value ? " ct-overlap-btn--active" : ""}`}
              onClick={() => applyGlobalOverlap(m.value)}
            >
              {m.label}{m.mm != null ? ` ${m.mm}mm` : ""}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="ct-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Two-column: preview left, accordion cards right */}
      <div className="two-col-main">
        <div className="two-col-preview">
          <PreviewPanel svg={result?.svg ?? null} />
        </div>

        <div className="two-col-settings">
          {lineStates.length === 0 && (
            <div className="two-col-empty">
              Generate a design to see per-line controls.
            </div>
          )}
          {lineStates.length > 0 && meta && lineStates.slice(0, words.length).map((ls, li) => {
        const lineMeta = meta.lines[li];
        if (!lineMeta) return null;
        const fontName = fonts.find((f) => f.id === (ls.fontId || defaultFontId))?.full_name ?? "—";
        const pairLabels = lineMeta.glyph_chars.slice(0, -1).map(
          (ch, i) => `${ch}→${lineMeta.glyph_chars[i + 1]}`,
        );
        const activeGaps = ls.gapStates.filter((g) => g.enabled).length;

        return (
          <div key={li} className="ct-card">
            {/* Card header — always visible, click to expand/collapse */}
            <button
              type="button"
              className="ct-card-header"
              onClick={() => patchLine(li, { expanded: !ls.expanded })}
              aria-expanded={ls.expanded}
            >
              <span className="ct-card-chevron">
                {ls.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <span className="ct-card-word">Line {li + 1} — <em>{lineMeta.text}</em></span>
              <span className="ct-card-meta">
                {fontName} · {ls.fontSizeMm}mm · {ls.alignment}
                {activeGaps > 0 && <span className="ct-card-gaps-badge">{activeGaps} gap{activeGaps !== 1 ? "s" : ""}</span>}
              </span>
              <span className="ct-card-dims">{lineMeta.width_mm.toFixed(1)} × {lineMeta.height_mm.toFixed(1)} mm</span>
            </button>

            {/* Card body — collapsible */}
            {ls.expanded && (
              <div className="ct-card-body">
                {/* Font / size / alignment row */}
                <div className="ct-card-controls">
                  <div className="ct-card-field">
                    <span className="ct-label">Font</span>
                    <select
                      value={ls.fontId || defaultFontId}
                      onChange={(e) => patchLine(li, { fontId: e.target.value })}
                    >
                      {fonts.map((f) => (
                        <option key={f.id} value={f.id}>{f.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ct-card-field ct-card-field--sm">
                    <span className="ct-label">Size (mm)</span>
                    <input
                      type="number" min="5" max="300" step="1"
                      value={ls.fontSizeMm}
                      onChange={(e) => patchLine(li, { fontSizeMm: e.target.value })}
                    />
                  </div>
                  <div className="ct-card-field ct-card-field--sm">
                    <span className="ct-label">Align</span>
                    <div className="ct-align-btns">
                      {ALIGNMENTS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={`ct-align-btn${ls.alignment === a ? " ct-align-btn--active" : ""}`}
                          onClick={() => patchLine(li, { alignment: a })}
                          title={a}
                        >
                          {a === "left" ? "⬛︎←" : a === "center" ? "↔" : a === "right" ? "→⬛︎" : "X"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ls.alignment === "manual" && (
                    <div className="ct-card-field ct-card-field--sm">
                      <span className="ct-label">X offset (mm)</span>
                      <input
                        type="number" min="-500" max="500" step="0.5"
                        value={ls.alignmentOffsetMm}
                        onChange={(e) => patchLine(li, { alignmentOffsetMm: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Letter gaps — compact pill row */}
                {ls.gapStates.length > 0 && (
                  <div className="ct-gaps-section">
                    <span className="ct-label">Letter gaps</span>
                    <div className="ct-gap-pills">
                      {ls.gapStates.map((gs, gi) => (
                        <div
                          key={gi}
                          className={`ct-gap-pill${gs.enabled ? " ct-gap-pill--on" : " ct-gap-pill--off"}`}
                        >
                          <button
                            type="button"
                            className="ct-gap-pill-toggle"
                            onClick={() => toggleGap(li, gi)}
                            title={gs.enabled ? "Click to disable" : "Click to enable"}
                          >
                            {pairLabels[gi] ?? `Gap ${gi + 1}`}
                          </button>
                          {gs.enabled && (
                            <input
                              type="number"
                              min="0.1"
                              max="10"
                              step="0.1"
                              value={gs.overlapMm}
                              className="ct-gap-pill-input"
                              onChange={(e) => setGapMm(li, gi, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          {lineMeta && gs.enabled && (
                            <span className="ct-gap-pill-result">
                              {lineMeta.gaps_after_mm[gi]?.toFixed(1)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vertical gap row — between this card and the next */}
            {li < lineStates.length - 1 && (
              <div className="ct-vgap">
                <span className="ct-vgap-icon">↕</span>
                <span className="ct-vgap-label">Gap {li + 1}→{li + 2}</span>
                <input
                  type="number"
                  min="-200"
                  max="200"
                  step="0.5"
                  value={interLineGaps[li] ?? DEFAULT_INTER_GAP}
                  className="ct-vgap-input"
                  onChange={(e) => setInterGap(li, e.target.value)}
                />
                <span className="ct-vgap-unit">mm</span>
                <span className="ct-vgap-hint">
                  {parseFloat(interLineGaps[li] ?? DEFAULT_INTER_GAP) < 0 ? "↑ overlap" : "↓ space"}
                </span>
              </div>
            )}
          </div>
        );
        })}
        </div>{/* two-col-settings */}
      </div>{/* two-col-main */}

      <div className="footer-bar">
        <div>
          <span>SVG-first export</span>
          <strong>
            {meta ? `${meta.canvas_width_mm}mm × ${meta.canvas_height_mm}mm` : "Ready"}
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
