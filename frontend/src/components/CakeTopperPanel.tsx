import { RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { FontPicker } from "./FontPicker";
import { fontSearchText } from "../utils/fontIdentity";
import { ExportControls } from "./ExportControls";
import { FloatingControls, toFloatingOffsets } from "./FloatingControls";
import { GlyphBrowserDrawer } from "./GlyphBrowserDrawer";
import type { FloatingOffsetMap } from "./FloatingControls";
import { PreviewPanel } from "./PreviewPanel";
import {
  FONT_CATEGORY_LABELS,
  fontMatchesCategory,
  getFontClassification,
  sortFontsForCakeTopper,
} from "../config/cakeTopperFontRecommendations";
import type { CakeTopperFontCategory } from "../config/cakeTopperFontRecommendations";
import { generateCakeTopper, recordHistoryEntry } from "../services/generationApi";
import type { CakeTopperOutlineRequest } from "../services/generationApi";
import type {
  AlignmentMode,
  CakeTopperLineConfig,
  CakeTopperRingConfig,
  CakeTopperRingPosition,
  CakeTopperResult,
  CakeTopperStakeConfig,
  FontInfo,
  OverlapGapConfig,
  OverlapMode,
} from "../types/design";

interface CakeTopperPanelProps {
  toolbarHost?: HTMLElement | null;
  active?: boolean;
  fonts: FontInfo[];
  manualFonts: FontInfo[];
}

const OVERLAP_MODES: { value: OverlapMode; label: string; mm: number | null }[] = [
  { value: "light", label: "Light", mm: 0.5 },
  { value: "auto", label: "Auto", mm: 1.0 },
  { value: "medium", label: "Medium", mm: 1.5 },
  { value: "strong", label: "Strong", mm: 2.5 },
];

const ALIGNMENTS: AlignmentMode[] = ["left", "center", "right", "manual"];

function pickDefaultFontId(fonts: FontInfo[], manualFonts: FontInfo[]): string {
  return manualFonts[0]?.id ?? fonts[0]?.id ?? "";
}

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
const STROKE_BUFFER_MIN_MM = 0;
const STROKE_BUFFER_MAX_MM = 0.6;

function clampStrokeBufferMm(value: number): number {
  if (!Number.isFinite(value)) return STROKE_BUFFER_MIN_MM;
  return Math.min(STROKE_BUFFER_MAX_MM, Math.max(STROKE_BUFFER_MIN_MM, value));
}

type GapState = { enabled: boolean; overlapMm: string };
type InspectorTab = "design" | "lines" | "structure";
type StakeCount = 0 | 1 | 2;
type StakeOffsetState = { xMm: string; yMm: string };
type RingOffsetState = { xMm: string; yMm: string };
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
  strokeBufferMm: string;
};

const DEFAULT_SIZE = "42";
const DEFAULT_OVERLAP: OverlapMode = "medium";
const DEFAULT_INTER_GAP = "3";
const DEFAULT_STAKE_WIDTH = 3;
const DEFAULT_STAKE_LENGTH = 50;
const DEFAULT_STAKE_OVERLAP = 2;
const DEFAULT_RING_OUTER_DIAMETER = "12";
const DEFAULT_RING_HOLE_DIAMETER = "5";
const DEFAULT_RING_OVERLAP = 5;
const RING_POSITIONS: { value: CakeTopperRingPosition; label: string }[] = [
  { value: "top-left", label: "Top-left" },
  { value: "top-center", label: "Top-centre" },
  { value: "top-right", label: "Top-right" },
  { value: "custom", label: "Custom" },
];
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

// R1 F3: rapid numeric/drag regenerations are coalesced (leading + trailing).
const REGENERATE_COALESCE_MS = 150;

interface BaseSettings {
  fontId: string;
  sizeMm: string;
  overlap: OverlapMode;
}

function initLine(fontId: string, overlapMm: string, numGaps: number, sizeMm = DEFAULT_SIZE, overlap = DEFAULT_OVERLAP): LineState {
  // R1 F2: lines start from the base size/overlap that produced them, not the defaults.
  return {
    fontId,
    fontSizeMm: sizeMm,
    alignment: "center",
    alignmentOffsetMm: "0",
    overlapMode: overlap,
    overlapCustomMm: "1.5",
    gapStates: Array.from({ length: numGaps }, () => ({ enabled: true, overlapMm })),
    floatingOffsets: {},
    manualXOffsetMm: "0",
    manualYOffsetMm: "0",
    color: DEFAULT_COLOR,
    strokeBufferMm: "0",
  };
}

function InspectorPage({ id, active, children }: { id: InspectorTab; active: InspectorTab; children: ReactNode }) {
  return (
    <section id={`inspector-${id}`} role="tabpanel" aria-labelledby={`inspector-tab-${id}`}
      hidden={active !== id} tabIndex={0} className="ct-inspector-page">
      {children}
    </section>
  );
}

function ColourPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const colour = COLOR_PALETTE.find((item) => item.hex === value);
  return (
    <details className="ct-colour-picker">
      <summary aria-label={`${label}: ${colour?.name ?? value}`}>
        <i style={{ background: value }} aria-hidden="true" />
        {colour?.name ?? value}<span>Change</span>
      </summary>
      <div className="ct-color-swatches" role="group" aria-label={label}>
        {COLOR_PALETTE.map((item) => (
          <button type="button" key={item.hex} aria-label={item.name} aria-pressed={value === item.hex}
            title={item.name} style={{ backgroundColor: item.hex }} className="ct-color-swatch"
            onClick={(event) => {
              onChange(item.hex);
              const details = event.currentTarget.closest("details");
              if (details) { details.open = false; details.querySelector("summary")?.focus(); }
            }} />
        ))}
      </div>
    </details>
  );
}

function makeFontGroups(fonts: FontInfo[], category: FontFilterCategory, manualFonts: FontInfo[] = []) {
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
    const availableIds = new Set(sorted.map((font) => font.id));
    const manualGroupFonts = manualFonts.filter((font) => availableIds.has(font.id));
    if (manualGroupFonts.length > 0) {
      manualGroupFonts.forEach((font) => seen.add(font.id));
      groups.push({ label: "Manual Fonts", fonts: manualGroupFonts });
    }
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

export function CakeTopperPanel({ fonts, manualFonts, toolbarHost = null, active = true }: CakeTopperPanelProps) {
  const [text, setText] = useState("Happy Birthday");
  const [fontSearch, setFontSearch] = useState("");
  const [fontCategory, setFontCategory] = useState<FontFilterCategory>("all");
  const [defaultFontId, setDefaultFontId] = useState(() => pickDefaultFontId(fonts, manualFonts));
  const hasUserPickedFontRef = useRef(false);
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
  const [ringEnabled, setRingEnabled] = useState(false);
  const [ringPosition, setRingPosition] = useState<CakeTopperRingPosition>("top-left");
  const [ringOuterDiameterMm, setRingOuterDiameterMm] = useState(DEFAULT_RING_OUTER_DIAMETER);
  const [ringHoleDiameterMm, setRingHoleDiameterMm] = useState(DEFAULT_RING_HOLE_DIAMETER);
  const [ringOffset, setRingOffset] = useState<RingOffsetState>({ xMm: "0", yMm: "0" });
  const [selectedRing, setSelectedRing] = useState(false);
  const [glyphBrowserLineIndex, setGlyphBrowserLineIndex] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("design");
  // R1 F3: only the latest request may update the canvas, and export is only
  // offered for a result produced from the current inputs.
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRegenerateRef = useRef(0);
  // Last valid Base size the line states were synced to (survives an empty field).
  const baseSizeAppliedRef = useRef(parseFloat(DEFAULT_SIZE));
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [baseNotice, setBaseNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultFontId || typeof FontFace === "undefined") return;
    const face = new FontFace("ens-base-specimen", `url(/api/fonts/${encodeURIComponent(defaultFontId)}/file)`);
    let cancelled = false;
    face.load().then((loaded) => { if (!cancelled) document.fonts.add(loaded); }).catch(() => {});
    return () => { cancelled = true; document.fonts.delete(face); };
  }, [defaultFontId]);

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).slice(0, 4),
    [text],
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    return sortFontsForCakeTopper(fonts).filter((f) => {
      const searchMatches = !q || fontSearchText(f).includes(q);
      return searchMatches && fontMatchesCategory(f, fontCategory);
    });
  }, [fonts, fontCategory, fontSearch]);

  const fontGroups = useMemo(
    () => makeFontGroups(filteredFonts, fontCategory, manualFonts),
    [filteredFonts, fontCategory, manualFonts],
  );

  const allFontGroups = useMemo(
    () => makeFontGroups(fonts, "all", manualFonts),
    [fonts, manualFonts],
  );

  // fonts/manualFonts can arrive asynchronously after mount (App.tsx fetches them
  // separately) — re-derive the preferred default once they load, unless the user
  // has already made an explicit choice.
  useEffect(() => {
    if (hasUserPickedFontRef.current && fonts.some((font) => font.id === defaultFontId)) return;
    const preferredId = pickDefaultFontId(fonts, manualFonts);
    if (preferredId && preferredId !== defaultFontId) {
      setDefaultFontId(preferredId);
    }
  }, [fonts, manualFonts, defaultFontId]);

  function buildLineConfigs(states: LineState[], baseFontId = defaultFontId): CakeTopperLineConfig[] {
    return states.map((s) => ({
      font_id: s.fontId || baseFontId,
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
      stroke_buffer_mm: clampStrokeBufferMm(parseFloat(s.strokeBufferMm)),
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

  function buildRingConfig(
    enabled = ringEnabled,
    position = ringPosition,
    outerDiameterMm = ringOuterDiameterMm,
    holeDiameterMm = ringHoleDiameterMm,
    offset = ringOffset,
  ): CakeTopperRingConfig {
    return {
      enabled,
      position,
      outer_diameter_mm: parseFloat(outerDiameterMm) || 12,
      hole_diameter_mm: parseFloat(holeDiameterMm) || 5,
      overlap_mm: DEFAULT_RING_OVERLAP,
      x_offset_mm: parseFloat(offset.xMm) || 0,
      y_offset_mm: parseFloat(offset.yMm) || 0,
    };
  }

  // All callers below rely on this function's internal try/catch (sets `error`/`loading`
  // state) and intentionally don't await or catch it themselves — keep that contract if
  // refactoring call sites.
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
    ringConfig: CakeTopperRingConfig = buildRingConfig(),
    base: BaseSettings = { fontId: defaultFontId, sizeMm: defaultSize, overlap: defaultOverlap },
  ) {
    cancelCoalesced();
    const activeText = textOverride ?? text;
    const args = requestArgs(activeText, states, gaps, count, offsets, outline, ringConfig, base);
    const seq = ++requestSeqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const r = await generateCakeTopper(...args, controller.signal);
      if (seq !== requestSeqRef.current) return; // a newer request owns the canvas
      setResult(r);
      if (states.length === 0) {
        baseSizeAppliedRef.current = parseFloat(base.sizeMm) || 42;
        const mm = String(OVERLAP_MODES.find((m) => m.value === base.overlap)?.mm ?? 1.5);
        const initialised = r.metadata.lines.map((lm) => initLine(base.fontId, mm, lm.gaps_before_mm.length, base.sizeMm, base.overlap));
        const initialGaps = r.metadata.inter_line_gaps_mm.map(String);
        setLineStates(initialised);
        setInterLineGaps(initialGaps);
        // The explicit per-line state now describes this same result.
        setResultKey(JSON.stringify(requestArgs(activeText, initialised, initialGaps, count, offsets, outline, ringConfig, base)));
      } else {
        setResultKey(JSON.stringify(args));
      }
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      if (!preserveCanvas) { setResult(null); setResultKey(null); }
      setError(e instanceof Error ? e.message : "Could not generate cake topper.");
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }

  function requestArgs(
    activeText: string,
    states: LineState[],
    gaps: string[],
    count: StakeCount,
    offsets: StakeOffsetState[],
    outline: CakeTopperOutlineRequest,
    ringConfig: CakeTopperRingConfig,
    base: BaseSettings,
  ) {
    const n = activeText.trim().split(/\s+/).filter(Boolean).slice(0, 4).length;
    const configs = states.length >= n ? buildLineConfigs(states.slice(0, n), base.fontId) : [];
    const gapValues = gaps.slice(0, n - 1).map((g) => {
      const v = parseFloat(g);
      return isNaN(v) ? 3 : v;
    });
    return [
      activeText,
      base.fontId,
      parseFloat(base.sizeMm) || 42,
      base.overlap,
      configs,
      gapValues,
      buildStakeConfig(count, offsets),
      ringConfig,
      outline,
    ] as const;
  }

  function cancelCoalesced() {
    if (coalesceTimerRef.current !== null) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  }

  /** Regenerate now, or (for rapid numeric/drag edits) once the burst settles. */
  function regenerateCoalesced(run: () => void) {
    const elapsed = Date.now() - lastRegenerateRef.current;
    cancelCoalesced();
    if (elapsed >= REGENERATE_COALESCE_MS) { lastRegenerateRef.current = Date.now(); run(); return; }
    coalesceTimerRef.current = setTimeout(() => {
      coalesceTimerRef.current = null; lastRegenerateRef.current = Date.now(); run();
    }, REGENERATE_COALESCE_MS - elapsed);
  }

  /** Discard any in-flight or pending regeneration (e.g. the text changed). */
  function invalidatePending() {
    cancelCoalesced();
    requestSeqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  useEffect(() => () => { cancelCoalesced(); abortRef.current?.abort(); }, []);

  function changeBaseFont(fontId: string) {
    hasUserPickedFontRef.current = true;
    const previous = defaultFontId;
    setDefaultFontId(fontId);
    if (!result || lineStates.length === 0 || fontId === previous) return;
    // R1 F4: lines that used the base font follow it; explicit overrides stay.
    const kept: number[] = [];
    const updated = lineStates.map((s, i) => {
      if (!s.fontId || s.fontId === previous) return { ...s, fontId };
      kept.push(i + 1);
      return s;
    });
    setBaseNotice(kept.length ? `${kept.map((i) => `Line ${i}`).join(", ")} ${kept.length === 1 ? "keeps its" : "keep their"} own font.` : null);
    setLineStates(updated);
    callApi(updated, interLineGaps, stakeCount, stakeOffsets, undefined, true, undefined, buildRingConfig(),
      { fontId, sizeMm: defaultSize, overlap: defaultOverlap });
  }

  function changeBaseSize(value: string) {
    const previous = baseSizeAppliedRef.current;
    setDefaultSize(value);
    const next = parseFloat(value);
    if (isNaN(next)) return;
    baseSizeAppliedRef.current = next;
    if (!result || lineStates.length === 0) return;
    const kept: number[] = [];
    const updated = lineStates.map((s, i) => {
      const size = parseFloat(s.fontSizeMm);
      if (isNaN(size) || size === previous) return { ...s, fontSizeMm: value };
      // Explicit per-line sizes are kept and reported below.
      kept.push(i + 1);
      return s;
    });
    setBaseNotice(kept.length ? `${kept.map((i) => `Line ${i}`).join(", ")} ${kept.length === 1 ? "keeps its" : "keep their"} own size.` : null);
    setLineStates(updated);
    regenerateCoalesced(() => callApi(updated, interLineGaps, stakeCount, stakeOffsets, undefined, true, undefined, buildRingConfig(),
      { fontId: defaultFontId, sizeMm: value, overlap: defaultOverlap }));
  }

  function handleGenerate() {
    setBaseNotice(null);
    setSelectedLine(null);
    setLineStates([]);
    setInterLineGaps([]);
    callApi([], [], stakeCount, stakeOffsets, undefined, false);
  }

  function patchLine(i: number, patch: Partial<LineState>, coalesce = false) {
    const updated = lineStates.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setLineStates(updated);
    if (coalesce) regenerateCoalesced(() => callApi(updated, interLineGaps, stakeCount, stakeOffsets));
    else callApi(updated, interLineGaps, stakeCount, stakeOffsets);
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
    if (!isNaN(parseFloat(value))) regenerateCoalesced(() => callApi(updated, interLineGaps, stakeCount, stakeOffsets));
  }

  function setInterGap(i: number, value: string) {
    const updated = interLineGaps.map((g, idx) => (idx === i ? value : g));
    setInterLineGaps(updated);
    if (!isNaN(parseFloat(value))) regenerateCoalesced(() => callApi(lineStates, updated, stakeCount, stakeOffsets));
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
    callApi(updated, interLineGaps, stakeCount, stakeOffsets, undefined, true, undefined, buildRingConfig(),
      { fontId: defaultFontId, sizeMm: defaultSize, overlap: mode });
  }

  function handleLineDrag(lineIndex: number, dxMm: number, dyMm: number) {
    const updated = lineStates.map((s, i) => {
      if (i !== lineIndex) return s;
      const newX = Math.round(((parseFloat(s.manualXOffsetMm) || 0) + dxMm) * 10) / 10;
      const newY = Math.round(((parseFloat(s.manualYOffsetMm) || 0) + dyMm) * 10) / 10;
      return { ...s, manualXOffsetMm: String(newX), manualYOffsetMm: String(newY) };
    });
    setLineStates(updated);
    regenerateCoalesced(() => callApi(updated, interLineGaps, stakeCount, stakeOffsets));
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
    setInspectorTab("structure");
    regenerateCoalesced(() => callApi(lineStates, interLineGaps, stakeCount, nextOffsets));
  }

  function handleRingEnabledChange(enabled: boolean) {
    setRingEnabled(enabled);
    setSelectedRing(enabled);
    if (enabled) {
      setSelectedLine(null);
      setSelectedStake(null);
    }
    const nextOutlineEnabled = enabled ? true : outlineEnabled;
    if (enabled && !outlineEnabled) {
      setOutlineEnabled(true);
    }
    if (result) {
      callApi(
        lineStates,
        interLineGaps,
        stakeCount,
        stakeOffsets,
        {
          enabled: nextOutlineEnabled,
          widthMm: parseFloat(outlineWidthMm) || 3,
          color: outlineColor,
        },
        true,
        undefined,
        buildRingConfig(enabled),
      );
    }
  }

  function setRingPositionAndRegenerate(position: CakeTopperRingPosition) {
    setRingPosition(position);
    if (result) {
      callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, undefined, true, undefined, buildRingConfig(ringEnabled, position));
    }
  }

  function setRingOuterAndRegenerate(value: string) {
    setRingOuterDiameterMm(value);
    if (result && !isNaN(parseFloat(value))) {
      regenerateCoalesced(() => callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, undefined, true, undefined, buildRingConfig(ringEnabled, ringPosition, value)));
    }
  }

  function setRingHoleAndRegenerate(value: string) {
    setRingHoleDiameterMm(value);
    if (result && !isNaN(parseFloat(value))) {
      regenerateCoalesced(() => callApi(
        lineStates,
        interLineGaps,
        stakeCount,
        stakeOffsets,
        undefined,
        true,
        undefined,
        buildRingConfig(ringEnabled, ringPosition, ringOuterDiameterMm, value),
      ));
    }
  }

  function setRingOffsetAndRegenerate(nextOffset: RingOffsetState) {
    setRingOffset(nextOffset);
    if (result && !isNaN(parseFloat(nextOffset.xMm)) && !isNaN(parseFloat(nextOffset.yMm))) {
      regenerateCoalesced(() => callApi(
        lineStates,
        interLineGaps,
        stakeCount,
        stakeOffsets,
        undefined,
        true,
        undefined,
        buildRingConfig(ringEnabled, ringPosition, ringOuterDiameterMm, ringHoleDiameterMm, nextOffset),
      ));
    }
  }

  function handleRingDrag(dxMm: number, dyMm: number) {
    const nextOffset = {
      xMm: String(Math.round(((parseFloat(ringOffset.xMm) || 0) + dxMm) * 10) / 10),
      yMm: String(Math.round(((parseFloat(ringOffset.yMm) || 0) + dyMm) * 10) / 10),
    };
    setSelectedLine(null);
    setSelectedStake(null);
    setSelectedRing(true);
    setInspectorTab("structure");
    setRingOffsetAndRegenerate(nextOffset);
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
      regenerateCoalesced(() => callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, {
        enabled: outlineEnabled,
        widthMm: parseFloat(value) || 3,
        color: outlineColor,
      }));
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
    setInspectorTab("lines");
    setSelectedStake(null);
    setSelectedRing(false);
  }

  function selectStake(stakeIndex: number) {
    setSelectedStake(stakeIndex);
    setInspectorTab("structure");
    setSelectedLine(null);
    setSelectedRing(false);
  }

  function selectRing() {
    setSelectedRing(true);
    setInspectorTab("structure");
    setSelectedLine(null);
    setSelectedStake(null);
  }

  function resetDesigner() {
    hasUserPickedFontRef.current = false;
    setText("Happy Birthday");
    setFontSearch("");
    setFontCategory("all");
    setDefaultFontId(pickDefaultFontId(fonts, manualFonts));
    setDefaultSize(DEFAULT_SIZE);
    baseSizeAppliedRef.current = parseFloat(DEFAULT_SIZE);
    setDefaultOverlap(DEFAULT_OVERLAP);
    setLineStates([]);
    setInterLineGaps([]);
    invalidatePending();
    setResult(null);
    setResultKey(null);
    setBaseNotice(null);
    setLoading(false);
    setError(null);
    setSelectedLine(null);
    setStakeCount(0);
    setStakeOffsets([]);
    setSelectedStake(null);
    setRingEnabled(false);
    setRingPosition("top-left");
    setRingOuterDiameterMm(DEFAULT_RING_OUTER_DIAMETER);
    setRingHoleDiameterMm(DEFAULT_RING_HOLE_DIAMETER);
    setRingOffset({ xMm: "0", yMm: "0" });
    setSelectedRing(false);
    setOutlineEnabled(false);
    setOutlineWidthMm(DEFAULT_OUTLINE_WIDTH_MM);
    setOutlineColor(DEFAULT_COLOR);
    setInspectorTab("design");
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
    }).catch((caught) => {
      // Non-critical: history logging failure should not interrupt the download.
      console.error("Failed to record history entry for export:", filename, caught);
    });
  }

  const meta = result?.metadata;
  const currentKey = JSON.stringify(requestArgs(
    text, lineStates, interLineGaps, stakeCount, stakeOffsets,
    { enabled: outlineEnabled, widthMm: parseFloat(outlineWidthMm) || 3, color: outlineColor },
    buildRingConfig(), { fontId: defaultFontId, sizeMm: defaultSize, overlap: defaultOverlap },
  ));
  const resultCurrent = Boolean(result) && !loading && resultKey === currentKey;
  const exportStatus = !meta ? "Create a design to export"
    : resultCurrent ? "Ready to export"
    : loading || coalesceTimerRef.current !== null ? "Updating…" : "Regenerate to export";
  const exportSizeText = meta ? `${meta.canvas_width_mm.toFixed(1)} × ${meta.canvas_height_mm.toFixed(1)} mm` : "Not generated";
  const ringMeta = meta?.ring ?? null;
  const ringStatus = !ringEnabled
    ? "Off"
    : ringMeta?.is_valid
      ? "Safe"
      : ringMeta
        ? "Warning"
        : "Pending";

  const toolbar = (
      <div className="ct-studio-toolbar">
        <div className="ct-document-heading">
          <h1>Design Studio</h1>
          <div className="ct-composition-summary" aria-label="Composition">
            <span>Composition</span>
            <div className="ct-composition-lines" aria-label="Design lines">
              {words.map((word, index) => (
                <div key={index}>
                  <button type="button" className="ct-composition-line"
                    aria-label={`Edit line ${index + 1}: ${word}`}
                    aria-pressed={selectedLine === index}
                    disabled={!meta?.lines[index]}
                    title={meta?.lines[index] ? `Edit line ${index + 1}: ${word}` : "Generate to edit this line"}
                    onClick={() => selectLine(index)}>
                    <span>{String(index + 1).padStart(2, "0")}</span><strong>{word}</strong>
                  </button>
                  {index < words.length - 1 && <label className="ct-layer-gap ct-legacy-controls" hidden>Gap to line {index + 2}<input type="number" value={interLineGaps[index] ?? DEFAULT_INTER_GAP} onChange={(event) => setInterGap(index, event.target.value)} /></label>}
                </div>
              ))}
              {words.length === 0 && <span className="ct-composition-empty">Add wording to create lines</span>}
            </div>
          </div>
        </div>
        <div className="ct-header-actions">
          <span className="ct-export-status" aria-live="polite">{exportStatus}</span>
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
            compact={Boolean(toolbarHost)}
            svg={result?.svg ?? null}
            pngBase64={result?.png_base64 ?? null}
            current={resultCurrent}
            svgFilename={result?.svg_filename ?? "cake-topper.svg"}
            pngFilename={result?.png_filename ?? "cake-topper.png"}
            onExport={handleExport}
          />
        </div>
      </div>
  );

  return (
    <div className={`ct-panel${toolbarHost ? " ct-panel--header-integrated" : ""}`}>
      {toolbarHost ? (active ? createPortal(toolbar, toolbarHost) : null) : <header className="ct-app-header">{toolbar}</header>}

      <div className="ct-workspace">
        <section className="ct-preview-column" aria-label="Preview and export">
          <div className={`ct-preview-card${loading && result ? " ct-preview-card--updating" : ""}`}>
            <div className="ct-section-heading ct-preview-heading">
              <div>
                <h2>Preview</h2>
                <p>SVG export preview</p>
              </div>
              {result && !resultCurrent && (
                <span className="ct-updating-chip" aria-live="polite">{exportStatus}</span>
              )}
              <div className="ct-size-chip">
                <span>Final cut size</span>
                <strong>
                  {exportSizeText}
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
              ringBox={meta?.ring ? {
                xMm: meta.ring.center_x_mm - meta.ring.outer_radius_mm,
                yMm: meta.ring.center_y_mm - meta.ring.outer_radius_mm,
                wMm: meta.ring.outer_diameter_mm,
                hMm: meta.ring.outer_diameter_mm,
              } : null}
              canvasWidthMm={meta?.canvas_width_mm}
              canvasHeightMm={meta?.canvas_height_mm}
              selectedLine={selectedLine}
              selectedStake={selectedStake}
              selectedRing={selectedRing}
              onSelectLine={selectLine}
              onSelectStake={selectStake}
              onSelectRing={selectRing}
              onLineDrag={handleLineDrag}
              onStakeDrag={handleStakeDrag}
              onRingDrag={handleRingDrag}
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
          <div className="ct-inspector-heading"><strong>Design properties</strong><span>{words.length} / 4 lines</span></div>
          <div className="ct-inspector-tabs" role="tablist" aria-label="Design properties">
            {(["design", "lines", "structure"] as InspectorTab[]).map((tab, index, tabs) => <button key={tab} id={`inspector-tab-${tab}`} type="button" role="tab" aria-selected={inspectorTab === tab} aria-controls={`inspector-${tab}`} tabIndex={inspectorTab === tab ? 0 : -1} onClick={() => setInspectorTab(tab)} onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (next >= 0) { event.preventDefault(); setInspectorTab(tabs[next]); document.getElementById(`inspector-tab-${tabs[next]}`)?.focus(); }
            }}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
          </div>
          <div className="ct-inspector-scroll">
          <InspectorPage id="design" active={inspectorTab}>
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
                  invalidatePending();
                  setLineStates([]);
                  setInterLineGaps([]);
                  setResult(null);
                  setResultKey(null);
                  setBaseNotice(null);
                  setSelectedLine(null);
                }}
              />
            </label>

            <div className="ct-font-specimen" aria-hidden="true">{words.join(" ") || "Your design"}</div>
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
                <FontPicker groups={fontGroups} value={defaultFontId}
                  selectedFont={fonts.find((font) => font.id === defaultFontId)} label="Base font"
                  onChange={changeBaseFont} />
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
                    onChange={(e) => changeBaseSize(e.target.value)}
                  />
                  <span>mm</span>
                </span>
              </label>
              {baseNotice && <p className="ct-field-note" role="status">{baseNotice}</p>}


            </div>

          </InspectorPage>


          <InspectorPage id="structure" active={inspectorTab}>
            <div className="ct-create-subsection">
              <span className="ct-subsection-title">Stakes</span>
              <div className="ct-stake-count-btns" role="group" aria-label="Stake count">
                {([0, 1, 2] as StakeCount[]).map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`ct-stake-btn${stakeCount === count ? " ct-stake-btn--active" : ""}`}
                    aria-pressed={stakeCount === count}
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
                                regenerateCoalesced(() => callApi(lineStates, interLineGaps, stakeCount, nextOffsets));
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
                                regenerateCoalesced(() => callApi(lineStates, interLineGaps, stakeCount, nextOffsets));
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
                  <ColourPicker label="Outline colour" value={outlineColor} onChange={setOutlineColorAndRegenerate} />
                </>
              )}
            </div>

            <div className="ct-position-section ct-ring-section">
              <div className="ct-ring-title-row">
                <div className="ct-subsection-copy">
                  <span className="ct-subsection-title">Ring / Keyhole</span>
                  <p>
                    Add a keychain hole to the outline/backing. The reinforced tab is only the acrylic around the hole.
                  </p>
                </div>
                <span className={`ct-ring-status ct-ring-status--${ringStatus.toLowerCase()}`}>
                  {ringStatus}
                </span>
              </div>
              <label className="ct-outline-toggle">
                <input
                  type="checkbox"
                  checked={ringEnabled}
                  onChange={(e) => handleRingEnabledChange(e.target.checked)}
                />
                <span>Add ring / keyhole</span>
              </label>
              {ringEnabled && (
                <div className="ct-ring-controls">
                  <label className="ct-card-field">
                    <span>Position</span>
                    <select
                      value={ringPosition}
                      onChange={(e) => setRingPositionAndRegenerate(e.target.value as CakeTopperRingPosition)}
                    >
                      {RING_POSITIONS.map((position) => (
                        <option key={position.value} value={position.value}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ct-ring-size-row">
                    <label className="ct-card-field ct-card-field--sm">
                      <span>Hole diameter</span>
                      <span className="ct-unit-input ct-unit-input--compact">
                        <input
                          type="number"
                          min="4"
                          max="6"
                          step="0.5"
                          value={ringHoleDiameterMm}
                          onChange={(e) => setRingHoleAndRegenerate(e.target.value)}
                        />
                        <span>mm</span>
                      </span>
                    </label>
                    <label className="ct-card-field ct-card-field--sm">
                      <span>Reinforced tab</span>
                      <span className="ct-unit-input ct-unit-input--compact">
                        <input
                          type="number"
                          min="10"
                          max="15"
                          step="0.5"
                          value={ringOuterDiameterMm}
                          onChange={(e) => setRingOuterAndRegenerate(e.target.value)}
                        />
                        <span>mm</span>
                      </span>
                    </label>
                  </div>
                  <div className="ct-stake-offset-row">
                    <span>Ring offset</span>
                    <span className="ct-unit-input ct-unit-input--compact">
                      <input
                        type="number"
                        min="-500"
                        max="500"
                        step="0.5"
                        value={ringOffset.xMm}
                        aria-label="Ring X offset"
                        onChange={(e) => setRingOffsetAndRegenerate({ ...ringOffset, xMm: e.target.value })}
                      />
                      <span>X</span>
                    </span>
                    <span className="ct-unit-input ct-unit-input--compact">
                      <input
                        type="number"
                        min="-500"
                        max="500"
                        step="0.5"
                        value={ringOffset.yMm}
                        aria-label="Ring Y offset"
                        onChange={(e) => setRingOffsetAndRegenerate({ ...ringOffset, yMm: e.target.value })}
                      />
                      <span>Y</span>
                    </span>
                  </div>
                  {ringMeta && (
                    <div className="ct-ring-summary">
                      <span>Wall {ringMeta.wall_thickness_mm.toFixed(1)}mm</span>
                      {ringMeta.neck_width_mm !== null && <span>Neck {ringMeta.neck_width_mm.toFixed(1)}mm</span>}
                      <span>Hole {ringMeta.hole_diameter_mm.toFixed(1)}mm</span>
                    </div>
                  )}
                  {ringMeta?.warnings && ringMeta.warnings.length > 0 && (
                    <ul className="ct-ring-warnings">
                      {ringMeta.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </InspectorPage>

          <InspectorPage id="lines" active={inspectorTab}>
            <div className="ct-create-subsection">
              <span className="ct-subsection-title">Default letter overlap</span>
              <div className="ct-overlap-btns" role="group" aria-label="Default letter overlap">
                {OVERLAP_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`ct-overlap-btn${defaultOverlap === m.value ? " ct-overlap-btn--active" : ""}`}
                    aria-pressed={defaultOverlap === m.value}
                    onClick={() => applyGlobalOverlap(m.value)}
                  >
                    <span>{m.label}</span>
                    {m.mm != null && <small>{m.mm.toFixed(1)}mm</small>}
                  </button>
                ))}
              </div>
            </div>


            {lineStates.length > 0 && meta && (
              <div className="ct-line-switcher" role="group" aria-label="Choose a line to edit">
                {meta.lines.slice(0, words.length).map((line, index) => (
                  <button key={index} type="button"
                    aria-label={`Select line ${index + 1}: ${line.text}`}
                    title={`Select line ${index + 1}: ${line.text}`}
                    aria-pressed={(selectedLine ?? 0) === index}
                    onClick={() => selectLine(index)}>
                    <span>Line {index + 1}</span><strong>{line.text}</strong>
                  </button>
                ))}
              </div>
            )}

            {lineStates.length === 0 && (
              <div className="two-col-empty">
                Generate a design to see per-line controls.
              </div>
            )}

            {lineStates.length > 0 && meta && lineStates.slice(0, words.length).map((ls, li) => {
              if (li !== (selectedLine ?? 0)) return null;
              const lineMeta = meta.lines[li];
              if (!lineMeta) return null;
              const fontName = fonts.find((f) => f.id === (ls.fontId || defaultFontId))?.full_name ?? "—";
              const pairLabels = (lineMeta.glyph_chars ?? []).slice(0, -1).map(
                (ch, i) => `${ch} → ${(lineMeta.glyph_chars ?? [])[i + 1]}`,
              );

              return (
                <article key={li} className={`ct-card${selectedLine === li ? " ct-card--selected" : ""}`}>
                  <div className="ct-line-editor-heading"><strong>Line {li + 1} · {lineMeta.text}</strong><span>{fontName}</span><small>{lineMeta.width_mm.toFixed(1)} × {lineMeta.height_mm.toFixed(1)} mm</small></div>
                  <div className="ct-card-body">
                      <div className="ct-card-controls">
                        <div className="ct-card-field">
                          <span>Line font</span>
                          <div className="ct-font-select-row">
                            <FontPicker groups={allFontGroups} value={ls.fontId || defaultFontId}
                              label={`Line ${li + 1} font`} onChange={(fontId) => patchLine(li, { fontId })} />
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

                      </div>

                      {/* Legacy settings stay in the recipe; canvas dragging remains available. */}
                      <div className="ct-subsection ct-legacy-controls" hidden>
                        <span className="ct-subsection-title">Alignment</span>
                        <div className="ct-align-btns" role="group" aria-label={`Line ${li + 1} alignment`}>
                          {ALIGNMENTS.map((a) => (
                            <button
                              key={a}
                              type="button"
                              className={`ct-align-btn${ls.alignment === a ? " ct-align-btn--active" : ""}`}
                              aria-pressed={ls.alignment === a}
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
                                onChange={(e) => patchLine(li, { alignmentOffsetMm: e.target.value }, true)}
                              />
                              <span>mm</span>
                            </span>
                          </label>
                        )}
                      </div>

                      <div className="ct-line-appearance-row">
                        <label className="ct-card-field ct-card-field--sm">
                          <span>Size</span>
                          <span className="ct-unit-input ct-unit-input--compact">
                            <input
                              type="number"
                              min="5"
                              max="300"
                              step="1"
                              value={ls.fontSizeMm}
                              onChange={(e) => patchLine(li, { fontSizeMm: e.target.value }, true)}
                            />
                            <span>mm</span>
                          </span>
                        </label>
                      <div className="ct-subsection">
                        <span className="ct-subsection-title">Colour</span>
                        <ColourPicker label={`Line ${li + 1} colour`} value={ls.color} onChange={(hex) => patchLine(li, { color: hex })} />
                      </div>
                        <label className="ct-card-field ct-card-field--sm">
                          <span title="Thickens thin strokes before cutting to reduce fragility.">Stroke buffer</span>
                          <span className="ct-unit-input ct-unit-input--compact">
                            <input
                              aria-label="Stroke buffer width"
                              title="Thickens thin strokes before cutting to reduce fragility."
                              type="number"
                              min={STROKE_BUFFER_MIN_MM}
                              max={STROKE_BUFFER_MAX_MM}
                              step="0.05"
                              value={ls.strokeBufferMm}
                              onChange={(e) => patchLine(li, { strokeBufferMm: e.target.value }, true)}
                              onBlur={(e) =>
                                patchLine(li, {
                                  strokeBufferMm: String(clampStrokeBufferMm(parseFloat(e.target.value))),
                                })
                              }
                            />
                            <span>mm</span>
                          </span>
                        </label>
                      </div>

                      <div className="ct-position-section ct-legacy-controls" hidden>
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
                                onChange={(e) => patchLine(li, { manualXOffsetMm: e.target.value }, true)}
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
                                onChange={(e) => patchLine(li, { manualYOffsetMm: e.target.value }, true)}
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
                            <p>“Natural” pairs already overlap in the font.</p>
                          </div>
                          <table className="ct-gap-table" aria-label={`Line ${li + 1} letter overlap`}>
                            <thead><tr><th scope="col">Pair</th><th scope="col">Overlap (mm)</th><th scope="col">Actual (mm)</th></tr></thead>
                            <tbody>{ls.gapStates.map((gs, gi) => (
                              <tr
                                key={gi}
                                className={`ct-gap-pill${gs.enabled ? " ct-gap-pill--on" : " ct-gap-pill--off"}`}
                              >
                                <th scope="row"><button
                                  type="button"
                                  className="ct-gap-pill-toggle"
                                  aria-pressed={gs.enabled}
                                  onClick={() => toggleGap(li, gi)}
                                  title={gs.enabled ? "Click to disable" : "Click to enable"}
                                >
                                  {pairLabels[gi] ?? `Gap ${gi + 1}`}
                                </button></th>
                                <td>
                                    <input
                                      type="number"
                                      min="0.1"
                                      max="30"
                                      step="0.1"
                                      value={gs.overlapMm}
                                      disabled={!gs.enabled}
                                      className="ct-gap-pill-input"
                                      onChange={(e) => setGapMm(li, gi, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Overlap for ${pairLabels[gi] ?? `gap ${gi + 1}`}`}
                                    />
                                </td>
                                <td>
                                {lineMeta && gs.enabled && (() => {
                                  const actual = lineMeta.gaps_after_mm[gi];
                                  const requested = parseFloat(gs.overlapMm) || 0;
                                  const isNatural = actual !== undefined && actual < -requested - 0.05;
                                  return (
                                    <span
                                      className={`ct-gap-pill-result${isNatural ? " ct-gap-pill-result--natural" : ""}`}
                                      title={
                                        isNatural
                                          ? "These letters already overlap more than the requested amount due to the font's connected strokes. The overlap setting has no further effect here."
                                          : undefined
                                      }
                                    >
                                      <span>{actual?.toFixed(1) ?? "—"}</span>{isNatural && <small>Natural</small>}
                                    </span>
                                  );
                                })()}
                                {!gs.enabled && <span className="ct-gap-pill-result">—</span>}
                                </td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      )}

                      {(lineMeta.floating_components?.length ?? 0) > 0 && (
                        <FloatingControls
                          compact
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
                            if (!isNaN(parseFloat(value))) regenerateCoalesced(() => callApi(updated, interLineGaps));
                          }}
                        />
                      )}
                    </div>
                </article>
              );
            })}
          </InspectorPage>
          </div>
          <footer className="ct-inspector-footer">
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

            <div className="ct-final-size"><span>Final cut size</span><strong>{exportSizeText}</strong></div>
              <button
                className="ct-primary-action"
                type="button"
                onClick={handleGenerate}
                disabled={loading || !defaultFontId || words.length === 0}
              >
                <Wand2 size={18} aria-hidden="true" />
                {loading ? "Generating..." : "Generate design"}
              </button>
          </footer>
        </aside>
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
