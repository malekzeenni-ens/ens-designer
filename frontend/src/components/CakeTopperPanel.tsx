import { ChevronDown, ChevronRight, RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ExportControls } from "./ExportControls";
import { FloatingControls, toFloatingOffsets } from "./FloatingControls";
import { GlyphBrowserDrawer } from "./GlyphBrowserDrawer";
import type { FloatingOffsetMap } from "./FloatingControls";
import { PreviewPanel } from "./PreviewPanel";
import {
  FONT_CATEGORY_LABELS,
  fontMatchesCategory,
  getFontClassification,
  getFontOptionLabel,
  sortFontsForCakeTopper,
} from "../config/cakeTopperFontRecommendations";
import type { CakeTopperFontCategory } from "../config/cakeTopperFontRecommendations";
import { generateCakeTopper, recordHistoryEntry } from "../services/generationApi";
import type { CakeTopperOutlineRequest } from "../services/generationApi";
import type {
  AlignmentMode,
  CakeTopperLineConfig,
  CakeTopperResult,
  CakeTopperStakeConfig,
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
];

const ALIGNMENTS: AlignmentMode[] = ["left", "center", "right", "manual"];

export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: "Black", hex: "#000000" },
  { name: "Red", hex: "#FF0000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Green", hex: "#008000" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Pink", hex: "#FF69B4" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Purple", hex: "#800080" },
  { name: "Lilac", hex: "#C8A2C8" },
];
const DEFAULT_COLOR = COLOR_PALETTE[0].hex;
const DEFAULT_OUTLINE_WIDTH_MM = "3";

type GapState = { enabled: boolean; overlapMm: string };
type InspectorSectionId = "create" | "layout" | "lines";
type StakeCount = 0 | 1 | 2;
type StakeOffsetState = { xMm: string; yMm: string };
type FontFilterCategory = CakeTopperFontCategory | "all";
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
  color: string;
  expanded: boolean;
};

const DEFAULT_SIZE = "42";
const DEFAULT_OVERLAP: OverlapMode = "medium";
const DEFAULT_INTER_GAP = "3";
const DEFAULT_STAKE_WIDTH = 3;
const DEFAULT_STAKE_LENGTH = 50;
const DEFAULT_STAKE_OVERLAP = 2;
const FONT_FILTERS: { value: FontFilterCategory; label: string }[] = [
  { value: "all", label: "All fonts" },
  { value: "top_10", label: "Top 20" },
  { value: "next_best_10", label: "Next Best 20" },
  { value: "script", label: "Script" },
  { value: "serif", label: "Serif" },
  { value: "sans_serif", label: "Sans" },
  { value: "supporting_text", label: "Supporting text" },
  { value: "use_with_caution", label: "Caution" },
];

const DEFAULT_OPEN_SECTIONS: Record<InspectorSectionId, boolean> = {
  create: true,
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
    color: DEFAULT_COLOR,
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

function makeFontGroups(fonts: FontInfo[], category: FontFilterCategory) {
  const sorted = sortFontsForCakeTopper(fonts);
  const seen = new Set<string>();
  const groups: { label: string; fonts: FontInfo[] }[] = [];

  function take(label: string, predicate: (font: FontInfo) => boolean, alphabetical = false) {
    const groupFonts = sorted
      .filter((font) => !seen.has(font.id) && predicate(font))
      .sort((a, b) => (alphabetical ? a.full_name.localeCompare(b.full_name) : 0));
    if (groupFonts.length > 0) {
      groupFonts.forEach((font) => seen.add(font.id));
      groups.push({ label, fonts: groupFonts });
    }
  }

  if (category === "all") {
    take("Top 20 Cake Topper Fonts", (font) => getFontClassification(font).category === "top_10");
    take("Next Best 20 Fonts", (font) => getFontClassification(font).category === "next_best_10");
    take("Script Fonts (by suitability)", (font) => {
      const c = getFontClassification(font);
      return c.type === "script" && c.category !== "use_with_caution" && c.category !== "not_recommended";
    });
    take("Serif Fonts (by suitability)", (font) => {
      const c = getFontClassification(font);
      return c.type === "serif" && c.category !== "use_with_caution" && c.category !== "not_recommended";
    });
    take("Sans & Display Fonts (by suitability)", (font) => {
      const c = getFontClassification(font);
      return (
        (c.type === "sans-serif" || c.type === "display") &&
        c.category !== "use_with_caution" &&
        c.category !== "not_recommended"
      );
    });
    take("Other Fonts (by suitability)", (font) => getFontClassification(font).category === "uncategorised");
    take("Use With Caution", (font) => getFontClassification(font).category === "use_with_caution");
    take("Not Recommended / Symbol Fonts", (font) => getFontClassification(font).category === "not_recommended");
    take("All Other Fonts", () => true, true);
    return groups;
  }

  take(FONT_CATEGORY_LABELS[category], (font) => fontMatchesCategory(font, category));
  return groups;
}

function renderFontGroups(groups: { label: string; fonts: FontInfo[] }[]) {
  return groups.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.fonts.map((font) => (
        <option key={font.id} value={font.id}>
          {getFontOptionLabel(font)}
        </option>
      ))}
    </optgroup>
  ));
}

export function CakeTopperPanel({ fonts }: CakeTopperPanelProps) {
  const [text, setText] = useState("Happy Birthday");
  const [fontSearch, setFontSearch] = useState("");
  const [fontCategory, setFontCategory] = useState<FontFilterCategory>("all");
  const [defaultFontId, setDefaultFontId] = useState(fonts[0]?.id ?? "");
  const [defaultSize, setDefaultSize] = useState(DEFAULT_SIZE);
  const [defaultOverlap, setDefaultOverlap] = useState<OverlapMode>(DEFAULT_OVERLAP);
  const [lineStates, setLineStates] = useState<LineState[]>([]);
  const [interLineGaps, setInterLineGaps] = useState<string[]>([]);
  const [result, setResult] = useState<CakeTopperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [stakeCount, setStakeCount] = useState<StakeCount>(0);
  const [stakeOffsets, setStakeOffsets] = useState<StakeOffsetState[]>([]);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [outlineEnabled, setOutlineEnabled] = useState(false);
  const [outlineWidthMm, setOutlineWidthMm] = useState(DEFAULT_OUTLINE_WIDTH_MM);
  const [outlineColor, setOutlineColor] = useState(DEFAULT_COLOR);
  const [glyphBrowserLineIndex, setGlyphBrowserLineIndex] = useState<number | null>(null);
  const [openSections, setOpenSections] =
    useState<Record<InspectorSectionId, boolean>>(DEFAULT_OPEN_SECTIONS);

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).slice(0, 4),
    [text],
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    return sortFontsForCakeTopper(fonts).filter((f) => {
      const searchMatches = !q || `${f.full_name} ${f.family} ${f.style}`.toLowerCase().includes(q);
      return searchMatches && fontMatchesCategory(f, fontCategory);
    });
  }, [fonts, fontCategory, fontSearch]);

  const fontGroups = useMemo(
    () => makeFontGroups(filteredFonts, fontCategory),
    [filteredFonts, fontCategory],
  );

  const allFontGroups = useMemo(
    () => makeFontGroups(fonts, "all"),
    [fonts],
  );

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
      color: s.color || DEFAULT_COLOR,
    }));
  }

  function buildStakeConfig(count: StakeCount, offsets: StakeOffsetState[]): CakeTopperStakeConfig {
    return {
      count,
      width_mm: DEFAULT_STAKE_WIDTH,
      length_mm: DEFAULT_STAKE_LENGTH,
      overlap_mm: DEFAULT_STAKE_OVERLAP,
      offsets: offsets.slice(0, count).map((offset, index) => ({
        stake_index: index,
        x_offset_mm: parseFloat(offset.xMm) || 0,
        y_offset_mm: parseFloat(offset.yMm) || 0,
      })),
    };
  }

  async function callApi(
    states: LineState[],
    gaps: string[],
    count: StakeCount = stakeCount,
    offsets: StakeOffsetState[] = stakeOffsets,
    outline: CakeTopperOutlineRequest = {
      enabled: outlineEnabled,
      widthMm: parseFloat(outlineWidthMm) || 3,
      color: outlineColor,
    },
    preserveCanvas = true,
    textOverride?: string,
  ) {
    const activeText = textOverride ?? text;
    const n = activeText.trim().split(/\s+/).filter(Boolean).slice(0, 4).length;
    const configs = states.length >= n ? buildLineConfigs(states.slice(0, n)) : [];
    const gapValues = gaps.slice(0, n - 1).map((g) => {
      const v = parseFloat(g);
      return isNaN(v) ? 3 : v;
    });
    setLoading(true);
    setError(null);
    try {
      const r = await generateCakeTopper(
        activeText,
        defaultFontId,
        parseFloat(defaultSize) || 42,
        defaultOverlap,
        configs,
        gapValues,
        buildStakeConfig(count, offsets),
        outline,
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
      if (!preserveCanvas) setResult(null);
      setError(e instanceof Error ? e.message : "Could not generate cake topper.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    setLineStates([]);
    setInterLineGaps([]);
    callApi([], [], stakeCount, stakeOffsets, undefined, false);
  }

  function patchLine(i: number, patch: Partial<LineState>) {
    const updated = lineStates.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setLineStates(updated);
    if (!("expanded" in patch)) callApi(updated, interLineGaps, stakeCount, stakeOffsets);
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
    callApi(updated, interLineGaps, stakeCount, stakeOffsets);
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
    if (!isNaN(parseFloat(value))) callApi(updated, interLineGaps, stakeCount, stakeOffsets);
  }

  function setInterGap(i: number, value: string) {
    const updated = interLineGaps.map((g, idx) => (idx === i ? value : g));
    setInterLineGaps(updated);
    if (!isNaN(parseFloat(value))) callApi(lineStates, updated, stakeCount, stakeOffsets);
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
    callApi(updated, interLineGaps, stakeCount, stakeOffsets);
  }

  function handleLineDrag(lineIndex: number, dxMm: number, dyMm: number) {
    const updated = lineStates.map((s, i) => {
      if (i !== lineIndex) return s;
      const newX = Math.round(((parseFloat(s.manualXOffsetMm) || 0) + dxMm) * 10) / 10;
      const newY = Math.round(((parseFloat(s.manualYOffsetMm) || 0) + dyMm) * 10) / 10;
      return { ...s, manualXOffsetMm: String(newX), manualYOffsetMm: String(newY) };
    });
    setLineStates(updated);
    callApi(updated, interLineGaps, stakeCount, stakeOffsets);
  }

  function resetPosition(lineIndex: number) {
    const updated = lineStates.map((s, i) =>
      i !== lineIndex ? s : { ...s, manualXOffsetMm: "0", manualYOffsetMm: "0" },
    );
    setLineStates(updated);
    callApi(updated, interLineGaps, stakeCount, stakeOffsets);
  }

  function handleStakeCountChange(count: StakeCount) {
    const nextOffsets = Array.from({ length: count }, (_, index) => (
      stakeOffsets[index] ?? { xMm: "0", yMm: "0" }
    ));
    setStakeCount(count);
    setStakeOffsets(nextOffsets);
    setSelectedStake(null);
    if (result) {
      callApi(lineStates, interLineGaps, count, nextOffsets);
    }
  }

  function handleStakeDrag(stakeIndex: number, dxMm: number, dyMm: number) {
    const nextOffsets = Array.from({ length: stakeCount }, (_, index) => {
      const offset = stakeOffsets[index] ?? { xMm: "0", yMm: "0" };
      if (index !== stakeIndex) return offset;
      const newX = Math.round(((parseFloat(offset.xMm) || 0) + dxMm) * 10) / 10;
      const newY = Math.round(((parseFloat(offset.yMm) || 0) + dyMm) * 10) / 10;
      return { xMm: String(newX), yMm: String(newY) };
    });
    setStakeOffsets(nextOffsets);
    setSelectedLine(null);
    setSelectedStake(stakeIndex);
    callApi(lineStates, interLineGaps, stakeCount, nextOffsets);
  }

  function toggleOutline(enabled: boolean) {
    setOutlineEnabled(enabled);
    callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, {
      enabled,
      widthMm: parseFloat(outlineWidthMm) || 3,
      color: outlineColor,
    });
  }

  function setOutlineWidth(value: string) {
    setOutlineWidthMm(value);
    if (!isNaN(parseFloat(value))) {
      callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, {
        enabled: outlineEnabled,
        widthMm: parseFloat(value) || 3,
        color: outlineColor,
      });
    }
  }

  function setOutlineColorAndRegenerate(hex: string) {
    setOutlineColor(hex);
    callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, {
      enabled: outlineEnabled,
      widthMm: parseFloat(outlineWidthMm) || 3,
      color: hex,
    });
  }

  function selectLine(lineIndex: number) {
    setSelectedLine(lineIndex);
    setSelectedStake(null);
  }

  function selectStake(stakeIndex: number) {
    setSelectedStake(stakeIndex);
    setSelectedLine(null);
  }

  function toggleInspectorSection(id: InspectorSectionId) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  function resetDesigner() {
    setText("Happy Birthday");
    setFontSearch("");
    setFontCategory("all");
    setDefaultFontId(fonts[0]?.id ?? "");
    setDefaultSize(DEFAULT_SIZE);
    setDefaultOverlap(DEFAULT_OVERLAP);
    setLineStates([]);
    setInterLineGaps([]);
    setResult(null);
    setLoading(false);
    setError(null);
    setSelectedLine(null);
    setStakeCount(0);
    setStakeOffsets([]);
    setSelectedStake(null);
    setOpenSections(DEFAULT_OPEN_SECTIONS);
  }

  function applyGlyphBrowserText(lineIndex: number, newLineText: string) {
    const currentWords = text.trim().split(/\s+/).filter(Boolean);
    if (lineIndex >= currentWords.length) return;
    currentWords[lineIndex] = newLineText;
    const newFullText = currentWords.join(" ");
    setText(newFullText);
    callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, undefined, true, newFullText);
  }

  function handleExport(type: "svg" | "png") {
    if (!result) return;
    const filename = type === "svg" ? result.svg_filename : result.png_filename;
    recordHistoryEntry({
      export_type: type,
      filename,
      full_text: words.join(" "),
      lines: result.metadata.lines.map((line) => ({
        text: line.text,
        font_name: line.font_name,
        font_size_mm: line.font_size_mm,
      })),
    }).catch(() => {
      // Non-critical: history logging failure should not interrupt the download.
    });
  }

  const meta = result?.metadata;
  const exportSizeText = meta ? `${meta.canvas_width_mm}mm x ${meta.canvas_height_mm}mm` : "Ready";

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
            onExport={handleExport}
          />
        </div>
      </header>

      <div className="ct-workspace">
        <section className="ct-preview-column" aria-label="Preview and export">
          <div className={`ct-preview-card${loading && result ? " ct-preview-card--updating" : ""}`}>
            <div className="ct-section-heading ct-preview-heading">
              <div>
                <h2>Preview</h2>
                <p>SVG export preview</p>
              </div>
              {loading && result && (
                <span className="ct-updating-chip" aria-live="polite">Updating…</span>
              )}
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
              stakeBoxes={meta?.stakes.map((stake) => ({
                xMm: stake.x_offset_mm,
                yMm: stake.y_offset_mm,
                wMm: stake.width_mm,
                hMm: stake.length_mm,
              }))}
              canvasWidthMm={meta?.canvas_width_mm}
              canvasHeightMm={meta?.canvas_height_mm}
              selectedLine={selectedLine}
              selectedStake={selectedStake}
              onSelectLine={selectLine}
              onSelectStake={selectStake}
              onLineDrag={handleLineDrag}
              onStakeDrag={handleStakeDrag}
            />
          </div>

          <div className="ct-cutting-note" role="note">
            <div className="ct-note-item">
              <strong>Cutting note</strong>
              <span>
                This designer visually overlaps letters for composition. It does not permanently weld or
                boolean-union the paths. Always open the SVG in LightBurn and verify before cutting.
              </span>
            </div>
            <div className="ct-note-item">
              <strong>Detected lines</strong>
              {words.length > 0 ? (
                <span className="ct-note-chips">
                  {words.map((w, i) => (
                    <span key={i} className={`ct-chip${selectedLine === i ? " ct-chip--active" : ""}`}>
                      Line {i + 1}: {w}
                    </span>
                  ))}
                </span>
              ) : (
                <span>Type at least one word to create a line.</span>
              )}
            </div>
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
                  value={fontCategory}
                  onChange={(e) => setFontCategory(e.target.value as FontFilterCategory)}
                  aria-label="Filter fonts by recommendation category"
                >
                  {FONT_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
                <select
                  value={defaultFontId}
                  onChange={(e) => setDefaultFontId(e.target.value)}
                  aria-label="Base font"
                >
                  {renderFontGroups(fontGroups)}
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

            <div className="ct-create-subsection">
              <span className="ct-subsection-title">Default letter overlap</span>
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
            </div>

            <div className="ct-create-subsection">
              <span className="ct-subsection-title">Stakes</span>
              <div className="ct-stake-count-btns" role="group" aria-label="Stake count">
                {([0, 1, 2] as StakeCount[]).map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`ct-stake-btn${stakeCount === count ? " ct-stake-btn--active" : ""}`}
                    onClick={() => handleStakeCountChange(count)}
                  >
                    {count} {count === 1 ? "stake" : "stakes"}
                  </button>
                ))}
              </div>
              <div className="ct-stake-summary">
                <span>Width {DEFAULT_STAKE_WIDTH}mm</span>
                <span>Length {DEFAULT_STAKE_LENGTH}mm</span>
                <span>Top overlap {DEFAULT_STAKE_OVERLAP}mm</span>
              </div>
              {stakeCount > 0 && (
                <div className="ct-stake-offset-list">
                  {Array.from({ length: stakeCount }, (_, index) => {
                    const offset = stakeOffsets[index] ?? { xMm: "0", yMm: "0" };
                    return (
                      <div key={index} className="ct-stake-offset-row">
                        <span>Stake {index + 1}</span>
                        <span className="ct-unit-input ct-unit-input--compact">
                          <input
                            type="number"
                            min="-500"
                            max="500"
                            step="0.5"
                            value={offset.xMm}
                            aria-label={`Stake ${index + 1} X offset`}
                            onChange={(e) => {
                              const nextOffsets = Array.from({ length: stakeCount }, (_, i) => (
                                i === index
                                  ? { ...(stakeOffsets[i] ?? { xMm: "0", yMm: "0" }), xMm: e.target.value }
                                  : stakeOffsets[i] ?? { xMm: "0", yMm: "0" }
                              ));
                              setStakeOffsets(nextOffsets);
                              if (!isNaN(parseFloat(e.target.value))) {
                                callApi(lineStates, interLineGaps, stakeCount, nextOffsets);
                              }
                            }}
                          />
                          <span>X</span>
                        </span>
                        <span className="ct-unit-input ct-unit-input--compact">
                          <input
                            type="number"
                            min="-500"
                            max="500"
                            step="0.5"
                            value={offset.yMm}
                            aria-label={`Stake ${index + 1} Y offset`}
                            onChange={(e) => {
                              const nextOffsets = Array.from({ length: stakeCount }, (_, i) => (
                                i === index
                                  ? { ...(stakeOffsets[i] ?? { xMm: "0", yMm: "0" }), yMm: e.target.value }
                                  : stakeOffsets[i] ?? { xMm: "0", yMm: "0" }
                              ));
                              setStakeOffsets(nextOffsets);
                              if (!isNaN(parseFloat(e.target.value))) {
                                callApi(lineStates, interLineGaps, stakeCount, nextOffsets);
                              }
                            }}
                          />
                          <span>Y</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </InspectorAccordion>

          {error && (
            <div className="ct-error" role="alert">
              <span><strong>Error:</strong> {error}</span>
              <button
                type="button"
                className="ct-error-dismiss"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
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

            <div className="ct-position-section">
              <div className="ct-subsection-copy">
                <span className="ct-subsection-title">Combined outline / offset</span>
                <p>
                  Union all lines into a single silhouette and grow it outward by a fixed width —
                  useful as a backing plate or as an offset cut path for your laser.
                </p>
              </div>
              <label className="ct-outline-toggle">
                <input
                  type="checkbox"
                  checked={outlineEnabled}
                  onChange={(e) => toggleOutline(e.target.checked)}
                />
                <span>Enable combined outline</span>
              </label>
              {outlineEnabled && (
                <>
                  <label className="ct-card-field ct-card-field--sm">
                    <span>Outline width</span>
                    <span className="ct-unit-input ct-unit-input--compact">
                      <input
                        type="number"
                        min="0.5"
                        max="50"
                        step="0.5"
                        value={outlineWidthMm}
                        onChange={(e) => setOutlineWidth(e.target.value)}
                      />
                      <span>mm</span>
                    </span>
                  </label>
                  <div className="ct-color-swatches" role="group" aria-label="Outline colour">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`ct-color-swatch${outlineColor === c.hex ? " ct-color-swatch--active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={outlineColor === c.hex}
                        onClick={() => setOutlineColorAndRegenerate(c.hex)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
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
                        <div className="ct-card-field">
                          <span>Line font</span>
                          <div className="ct-font-select-row">
                            <select
                              value={ls.fontId || defaultFontId}
                              onChange={(e) => patchLine(li, { fontId: e.target.value })}
                            >
                              {renderFontGroups(allFontGroups)}
                            </select>
                            <button
                              type="button"
                              className="ct-browse-btn"
                              onClick={() => setGlyphBrowserLineIndex(li)}
                              title="Browse special characters for this font"
                            >
                              Browse
                            </button>
                          </div>
                        </div>
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

                      <div className="ct-subsection">
                        <span className="ct-subsection-title">Colour</span>
                        <div className="ct-color-swatches" role="group" aria-label={`Line ${li + 1} colour`}>
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              className={`ct-color-swatch${ls.color === c.hex ? " ct-color-swatch--active" : ""}`}
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                              aria-label={c.name}
                              aria-pressed={ls.color === c.hex}
                              onClick={() => patchLine(li, { color: c.hex })}
                            />
                          ))}
                        </div>
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
        <div className="ct-export-summary">
          <span>SVG export size</span>
          <strong>{exportSizeText}</strong>
        </div>
        <ExportControls
          svg={result?.svg ?? null}
          pngBase64={result?.png_base64 ?? null}
          svgFilename={result?.svg_filename ?? "cake-topper.svg"}
          pngFilename={result?.png_filename ?? "cake-topper.png"}
          onExport={handleExport}
        />
      </div>


      {glyphBrowserLineIndex !== null && (
        <GlyphBrowserDrawer
          lineIndex={glyphBrowserLineIndex}
          lineName={words[glyphBrowserLineIndex] ?? ""}
          fontId={lineStates[glyphBrowserLineIndex]?.fontId || defaultFontId}
          fontName={
            fonts.find(
              (f) => f.id === (lineStates[glyphBrowserLineIndex]?.fontId || defaultFontId),
            )?.full_name ?? ""
          }
          currentLineText={words[glyphBrowserLineIndex] ?? ""}
          onApply={applyGlyphBrowserText}
          onClose={() => setGlyphBrowserLineIndex(null)}
        />
      )}
    </div>
  );
}
