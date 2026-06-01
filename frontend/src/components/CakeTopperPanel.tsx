import { ChevronDown, ChevronRight, RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ExportControls } from "./ExportControls";
import { FloatingControls, toFloatingOffsets } from "./FloatingControls";
import type { FloatingOffsetMap } from "./FloatingControls";
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
  { value: "light", label: "Light", mm: 0.5 },
  { value: "auto", label: "Auto", mm: 1.0 },
  { value: "medium", label: "Medium", mm: 1.5 },
  { value: "strong", label: "Strong", mm: 2.5 },
  { value: "custom", label: "Custom", mm: null },
];

const ALIGNMENTS: AlignmentMode[] = ["left", "center", "right", "manual"];

type GapState = { enabled: boolean; overlapMm: string };
type InspectorSectionId = "create" | "detected" | "overlap" | "layout" | "lines";
type LineState = {
  fontId: string;
  fontSizeMm: string;
  alignment: AlignmentMode;
  alignmentOffsetMm: string;
  overlapMode: OverlapMode;
  overlapCustomMm: string;
  gapStates: GapState[];
  floatingOffsets: FloatingOffsetMap;
  manualXOffsetMm: string;
  manualYOffsetMm: string;
  expanded: boolean;
};

const DEFAULT_SIZE = "42";
const DEFAULT_OVERLAP: OverlapMode = "medium";
const DEFAULT_INTER_GAP = "3";

const DEFAULT_OPEN_SECTIONS: Record<InspectorSectionId, boolean> = {
  create: true,
  detected: true,
  overlap: true,
  layout: true,
  lines: true,
};

interface InspectorAccordionProps {
  id: InspectorSectionId;
  title: string;
  description: string;
  open: boolean;
  onToggle: (id: InspectorSectionId) => void;
  className?: string;
  children: ReactNode;
}

function initLine(fontId: string, overlapMm: string, numGaps: number): LineState {
  return {
    fontId,
    fontSizeMm: DEFAULT_SIZE,
    alignment: "center",
    alignmentOffsetMm: "0",
    overlapMode: DEFAULT_OVERLAP,
    overlapCustomMm: "1.5",
    gapStates: Array.from({ length: numGaps }, () => ({ enabled: true, overlapMm })),
    floatingOffsets: {},
    manualXOffsetMm: "0",
    manualYOffsetMm: "0",
    expanded: true,
  };
}

function InspectorAccordion({
  id,
  title,
  description,
  open,
  onToggle,
  className = "",
  children,
}: InspectorAccordionProps) {
  return (
    <section className={`ct-inspector-section ct-accordion-section${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="ct-inspector-section-header"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <div className="ct-section-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <span className="ct-section-chevron" aria-hidden="true">
          {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </span>
      </button>
      {open && <div className="ct-inspector-section-body">{children}</div>}
    </section>
  );
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
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [openSections, setOpenSections] =
    useState<Record<InspectorSectionId, boolean>>(DEFAULT_OPEN_SECTIONS);

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
      floating_offsets: toFloatingOffsets(s.floatingOffsets),
      manual_x_offset_mm: parseFloat(s.manualXOffsetMm) || 0,
      manual_y_offset_mm: parseFloat(s.manualYOffsetMm) || 0,
    }));
  }

  async function callApi(states: LineState[], gaps: string[]) {
    const n = words.length;
    const configs = states.length >= n ? buildLineConfigs(states.slice(0, n)) : [];
    const gapValues = gaps.slice(0, n - 1).map((g) => {
      const v = parseFloat(g);
      return isNaN(v) ? 3 : v;
    });
    setLoading(true);
    setError(null);
    try {
      const r = await generateCakeTopper(
        text,
        defaultFontId,
        parseFloat(defaultSize) || 42,
        defaultOverlap,
        configs,
        gapValues,
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
    const updated = lineStates.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setLineStates(updated);
    if (!("expanded" in patch)) callApi(updated, interLineGaps);
  }

  function toggleGap(li: number, gi: number) {
    const updated = lineStates.map((s, i) =>
      i !== li
        ? s
        : {
            ...s,
            gapStates: s.gapStates.map((g, j) => (j === gi ? { ...g, enabled: !g.enabled } : g)),
          },
    );
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  function setGapMm(li: number, gi: number, value: string) {
    const updated = lineStates.map((s, i) =>
      i !== li
        ? s
        : {
            ...s,
            gapStates: s.gapStates.map((g, j) => (j === gi ? { ...g, overlapMm: value } : g)),
          },
    );
    setLineStates(updated);
    if (!isNaN(parseFloat(value))) callApi(updated, interLineGaps);
  }

  function setInterGap(i: number, value: string) {
    const updated = interLineGaps.map((g, idx) => (idx === i ? value : g));
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

  function handleLineDrag(lineIndex: number, dxMm: number, dyMm: number) {
    const updated = lineStates.map((s, i) => {
      if (i !== lineIndex) return s;
      const newX = Math.round(((parseFloat(s.manualXOffsetMm) || 0) + dxMm) * 10) / 10;
      const newY = Math.round(((parseFloat(s.manualYOffsetMm) || 0) + dyMm) * 10) / 10;
      return { ...s, manualXOffsetMm: String(newX), manualYOffsetMm: String(newY) };
    });
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  function resetPosition(lineIndex: number) {
    const updated = lineStates.map((s, i) =>
      i !== lineIndex ? s : { ...s, manualXOffsetMm: "0", manualYOffsetMm: "0" },
    );
    setLineStates(updated);
    callApi(updated, interLineGaps);
  }

  function toggleInspectorSection(id: InspectorSectionId) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  function resetDesigner() {
    setText("Happy Birthday");
    setFontSearch("");
    setDefaultFontId(fonts[0]?.id ?? "");
    setDefaultSize(DEFAULT_SIZE);
    setDefaultOverlap(DEFAULT_OVERLAP);
    setLineStates([]);
    setInterLineGaps([]);
    setResult(null);
    setLoading(false);
    setError(null);
    setSelectedLine(null);
    setOpenSections(DEFAULT_OPEN_SECTIONS);
  }

  const meta = result?.metadata;

  return (
    <div className="ct-panel">
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img
            className="ct-brand-logo"
            src="/brand/etch-n-shine-logo.png"
            alt="Etch N Shine"
          />
          <div>
            <p>Etch N Shine</p>
            <h1>Cake Topper Designer</h1>
          </div>
        </div>
        <div className="ct-header-actions">
          <span>{meta ? "Ready to export" : "Create a design to export"}</span>
          <button
            type="button"
            className="ct-reset-action"
            onClick={resetDesigner}
            title="Reset canvas and settings"
          >
            <RotateCcw size={17} aria-hidden="true" />
            Reset
          </button>
          <ExportControls
            svg={result?.svg ?? null}
            pngBase64={result?.png_base64 ?? null}
            svgFilename={result?.svg_filename ?? "cake-topper.svg"}
            pngFilename={result?.png_filename ?? "cake-topper.png"}
          />
        </div>
      </header>

      <div className="ct-workspace">
        <section className="ct-preview-column" aria-label="Preview and export">
          <div className="ct-preview-card">
            <div className="ct-section-heading ct-preview-heading">
              <div>
                <h2>Preview</h2>
                <p>SVG export preview</p>
              </div>
              <div className="ct-size-chip">
                <span>Final cut size</span>
                <strong>
                  {meta ? `${meta.canvas_width_mm} x ${meta.canvas_height_mm} mm` : "Not generated"}
                </strong>
              </div>
            </div>

            <PreviewPanel
              svg={result?.svg ?? null}
              lineBoxes={meta?.lines.map((lm) => ({
                xMm: lm.x_offset_mm,
                yMm: lm.y_offset_mm,
                wMm: lm.width_mm,
                hMm: lm.height_mm,
              }))}
              canvasWidthMm={meta?.canvas_width_mm}
              canvasHeightMm={meta?.canvas_height_mm}
              selectedLine={selectedLine}
              onSelectLine={setSelectedLine}
              onLineDrag={handleLineDrag}
            />
          </div>

          <div className="ct-cutting-note" role="note">
            <strong>Cutting note</strong>
            <span>
              This designer visually overlaps letters for composition. It does not permanently weld or
              boolean-union the paths. Always open the SVG in LightBurn and verify before cutting.
            </span>
          </div>
        </section>

        <aside className="ct-inspector" aria-label="Design controls">
          <InspectorAccordion
            id="create"
            title="Create design"
            description="Enter the topper wording and base text style."
            open={openSections.create}
            onToggle={toggleInspectorSection}
          >
            <label className="ct-field" htmlFor="ct-text">
              <span>Topper text</span>
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
            </label>

            <div className="ct-field">
              <span>Font</span>
              <div className="ct-font-combo">
                <input
                  type="text"
                  placeholder="Search fonts"
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  className="ct-font-search"
                  aria-label="Search fonts"
                />
                <select
                  value={defaultFontId}
                  onChange={(e) => setDefaultFontId(e.target.value)}
                  aria-label="Base font"
                >
                  {filteredFonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ct-create-row">
              <label className="ct-field ct-field--size">
                <span>Base size</span>
                <span className="ct-unit-input">
                  <input
                    type="number"
                    min="5"
                    max="300"
                    step="1"
                    value={defaultSize}
                    onChange={(e) => setDefaultSize(e.target.value)}
                  />
                  <span>mm</span>
                </span>
              </label>

              <button
                className="ct-primary-action"
                type="button"
                onClick={handleGenerate}
                disabled={loading || !defaultFontId || words.length === 0}
              >
                <Wand2 size={18} aria-hidden="true" />
                {loading ? "Generating..." : "Generate design"}
              </button>
            </div>
          </InspectorAccordion>

          <InspectorAccordion
            id="detected"
            title="Detected lines"
            description="Text splits into up to four editable lines."
            open={openSections.detected}
            onToggle={toggleInspectorSection}
          >
            {words.length > 0 ? (
              <div className="ct-chips">
                {words.map((w, i) => (
                  <span key={i} className={`ct-chip${selectedLine === i ? " ct-chip--active" : ""}`}>
                    Line {i + 1} · {w}
                  </span>
                ))}
              </div>
            ) : (
              <p className="ct-muted">Type at least one word to create a line.</p>
            )}
          </InspectorAccordion>

          <InspectorAccordion
            id="overlap"
            title="Default letter overlap"
            description="Applies a default overlap between neighbouring letters to help create a connected cut shape."
            open={openSections.overlap}
            onToggle={toggleInspectorSection}
          >
            <div className="ct-overlap-btns" role="group" aria-label="Default letter overlap">
              {OVERLAP_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`ct-overlap-btn${defaultOverlap === m.value ? " ct-overlap-btn--active" : ""}`}
                  onClick={() => applyGlobalOverlap(m.value)}
                >
                  <span>{m.label}</span>
                  {m.mm != null && <small>{m.mm.toFixed(1)}mm</small>}
                </button>
              ))}
            </div>
          </InspectorAccordion>

          {error && (
            <div className="ct-error" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result?.warnings && result.warnings.length > 0 && (
            <div className="ct-warnings" role="alert">
              <strong>Warning{result.warnings.length > 1 ? "s" : ""}:</strong>
              <ul className="ct-warnings-list">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <InspectorAccordion
            id="layout"
            title="Layout"
            description="Set spacing between generated lines."
            open={openSections.layout}
            onToggle={toggleInspectorSection}
          >
            {lineStates.length > 1 ? (
              <div className="ct-line-spacing-list">
                {lineStates.slice(0, words.length - 1).map((_, li) => (
                  <label key={li} className="ct-spacing-row">
                    <span>Line spacing: Line {li + 1} to Line {li + 2}</span>
                    <span className="ct-unit-input ct-unit-input--compact">
                      <input
                        type="number"
                        min="-200"
                        max="200"
                        step="0.5"
                        value={interLineGaps[li] ?? DEFAULT_INTER_GAP}
                        onChange={(e) => setInterGap(li, e.target.value)}
                      />
                      <span>mm</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="ct-muted">Generate two or more lines to adjust line spacing.</p>
            )}
          </InspectorAccordion>

          <InspectorAccordion
            id="lines"
            title="Lines"
            description="Fine-tune each line's font, position, letter overlap, and detached dots."
            open={openSections.lines}
            onToggle={toggleInspectorSection}
            className="ct-lines-section"
          >
            {lineStates.length === 0 && (
              <div className="two-col-empty">
                Generate a design to see per-line controls.
              </div>
            )}

            {lineStates.length > 0 && meta && lineStates.slice(0, words.length).map((ls, li) => {
              const lineMeta = meta.lines[li];
              if (!lineMeta) return null;
              const fontName = fonts.find((f) => f.id === (ls.fontId || defaultFontId))?.full_name ?? "—";
              const pairLabels = (lineMeta.glyph_chars ?? []).slice(0, -1).map(
                (ch, i) => `${ch} → ${(lineMeta.glyph_chars ?? [])[i + 1]}`,
              );
              const activeGaps = ls.gapStates.filter((g) => g.enabled).length;

              return (
                <article key={li} className={`ct-card${selectedLine === li ? " ct-card--selected" : ""}`}>
                  <button
                    type="button"
                    className="ct-card-header"
                    onClick={() => patchLine(li, { expanded: !ls.expanded })}
                    aria-expanded={ls.expanded}
                  >
                    <span className="ct-card-chevron">
                      {ls.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <span className="ct-card-title">
                      <span>Line {li + 1}</span>
                      <strong>{lineMeta.text}</strong>
                    </span>
                    <span className="ct-card-meta">
                      {fontName} · {ls.fontSizeMm}mm · {ls.alignment}
                      {activeGaps > 0 && <span className="ct-card-gaps-badge">{activeGaps} gaps</span>}
                    </span>
                    <span className="ct-card-dims">{lineMeta.width_mm.toFixed(1)} x {lineMeta.height_mm.toFixed(1)} mm</span>
                  </button>

                  {ls.expanded && (
                    <div className="ct-card-body">
                      <div className="ct-card-controls">
                        <label className="ct-card-field">
                          <span>Line font</span>
                          <select
                            value={ls.fontId || defaultFontId}
                            onChange={(e) => patchLine(li, { fontId: e.target.value })}
                          >
                            {fonts.map((f) => (
                              <option key={f.id} value={f.id}>{f.full_name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="ct-card-field ct-card-field--sm">
                          <span>Size</span>
                          <span className="ct-unit-input ct-unit-input--compact">
                            <input
                              type="number"
                              min="5"
                              max="300"
                              step="1"
                              value={ls.fontSizeMm}
                              onChange={(e) => patchLine(li, { fontSizeMm: e.target.value })}
                            />
                            <span>mm</span>
                          </span>
                        </label>
                      </div>

                      <div className="ct-subsection">
                        <span className="ct-subsection-title">Alignment</span>
                        <div className="ct-align-btns" role="group" aria-label={`Line ${li + 1} alignment`}>
                          {ALIGNMENTS.map((a) => (
                            <button
                              key={a}
                              type="button"
                              className={`ct-align-btn${ls.alignment === a ? " ct-align-btn--active" : ""}`}
                              onClick={() => patchLine(li, { alignment: a })}
                              title={a}
                            >
                              {a === "left" ? "Left" : a === "center" ? "Centre" : a === "right" ? "Right" : "Manual"}
                            </button>
                          ))}
                        </div>
                        {ls.alignment === "manual" && (
                          <label className="ct-card-field ct-card-field--sm">
                            <span>Manual X offset</span>
                            <span className="ct-unit-input ct-unit-input--compact">
                              <input
                                type="number"
                                min="-500"
                                max="500"
                                step="0.5"
                                value={ls.alignmentOffsetMm}
                                onChange={(e) => patchLine(li, { alignmentOffsetMm: e.target.value })}
                              />
                              <span>mm</span>
                            </span>
                          </label>
                        )}
                      </div>

                      <div className="ct-position-section">
                        <div className="ct-subsection-copy">
                          <span className="ct-subsection-title">Move design on canvas</span>
                          <p>Use X/Y offsets to reposition this line inside the exported SVG canvas.</p>
                        </div>
                        <div className="ct-position-row">
                          <label className="ct-position-field">
                            X offset
                            <span className="ct-unit-input ct-unit-input--compact">
                              <input
                                type="number"
                                min="-500"
                                max="500"
                                step="0.5"
                                value={ls.manualXOffsetMm}
                                className="ct-position-input"
                                onChange={(e) => patchLine(li, { manualXOffsetMm: e.target.value })}
                              />
                              <span>mm</span>
                            </span>
                          </label>
                          <label className="ct-position-field">
                            Y offset
                            <span className="ct-unit-input ct-unit-input--compact">
                              <input
                                type="number"
                                min="-500"
                                max="500"
                                step="0.5"
                                value={ls.manualYOffsetMm}
                                className="ct-position-input"
                                onChange={(e) => patchLine(li, { manualYOffsetMm: e.target.value })}
                              />
                              <span>mm</span>
                            </span>
                          </label>
                          {(parseFloat(ls.manualXOffsetMm) !== 0 || parseFloat(ls.manualYOffsetMm) !== 0) && (
                            <button
                              type="button"
                              className="ct-position-reset"
                              onClick={() => resetPosition(li)}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {ls.gapStates.length > 0 && (
                        <div className="ct-gaps-section">
                          <div className="ct-subsection-copy">
                            <span className="ct-subsection-title">Letter overlap</span>
                            <p>Increase overlap to bring letters closer together. Reduce it if letters become unreadable.</p>
                          </div>
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
                                  <>
                                    <input
                                      type="number"
                                      min="0.1"
                                      max="10"
                                      step="0.1"
                                      value={gs.overlapMm}
                                      className="ct-gap-pill-input"
                                      onChange={(e) => setGapMm(li, gi, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Overlap for ${pairLabels[gi] ?? `gap ${gi + 1}`}`}
                                    />
                                    <span className="ct-gap-pill-unit">mm</span>
                                  </>
                                )}
                                {lineMeta && gs.enabled && (
                                  <span className="ct-gap-pill-result">
                                    Actual {lineMeta.gaps_after_mm[gi]?.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(lineMeta.floating_components?.length ?? 0) > 0 && (
                        <FloatingControls
                          floatingComponents={lineMeta.floating_components ?? []}
                          offsets={ls.floatingOffsets}
                          onChange={(glyphIndex, axis, value) => {
                            const updated = lineStates.map((s, i) =>
                              i !== li
                                ? s
                                : {
                                    ...s,
                                    floatingOffsets: {
                                      ...s.floatingOffsets,
                                      [glyphIndex]: {
                                        ...(s.floatingOffsets[glyphIndex] ?? { xMm: "0", yMm: "0" }),
                                        [axis === "x" ? "xMm" : "yMm"]: value,
                                      },
                                    },
                                  },
                            );
                            setLineStates(updated);
                            if (!isNaN(parseFloat(value))) callApi(updated, interLineGaps);
                          }}
                        />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </InspectorAccordion>
        </aside>
      </div>

      <div className="ct-export-bar">
        <div>
          <span>SVG export size</span>
          <strong>
            {meta ? `${meta.canvas_width_mm}mm x ${meta.canvas_height_mm}mm` : "Ready"}
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
