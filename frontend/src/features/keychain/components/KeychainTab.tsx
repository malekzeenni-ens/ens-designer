import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock3, Download, KeyRound, LoaderCircle, Redo2, Shapes, Undo2 } from "lucide-react";
import type { FontInfo } from "../../../types/design";
import { designFromRecipe, designReducer, type DesignAction } from "../state/keychainReducer";
import { DEFAULT_DESIGN, type KeychainDesign, type KeychainHistoryEntry, type KeychainRequest, type KeychainResult, type ProductionCheck, type Unit } from "../state/keychainTypes";
import { planFix } from "../state/checkFixes";
import { useUndoRedo } from "../state/useUndoRedo";
import { useKeychainPreview } from "../hooks/useKeychainPreview";
import { downloadBlob, downloadPng, exportKeychain } from "../services/keychainApi";
import { dimension, toRequest } from "../utils/units";
import { KeychainControls, type KeychainInspectorTab } from "./KeychainControls";
import { KeychainPreview, type Selection } from "./KeychainPreview";
import { ProductionCheckPanel, type FixStatus } from "./ProductionCheckPanel";
import { ExportConfirmDialog } from "./ExportConfirmDialog";
import { preferredFont } from "./FontSection";
import { LetterInspector } from "./LetterInspector";
import { KeychainHistoryList } from "./KeychainHistoryList";
import "../keychain.css";

export function KeychainTab({ fonts, manualFonts, active, toolbarHost = null }: { fonts: FontInfo[]; manualFonts: FontInfo[]; active: boolean; toolbarHost?: HTMLElement | null }) {
  const history = useUndoRedo(DEFAULT_DESIGN);
  const { design } = history;
  const designRef = useRef(design);
  designRef.current = design;
  const [delay, setDelay] = useState(0);
  const [hoverFont, setHoverFont] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<KeychainInspectorTab>("design");
  const [unit, setUnit] = useState<Unit>("mm");
  const [selection, setSelection] = useState<Selection>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<KeychainResult | null>(null);
  // Confirmation is bound to one exact request snapshot. "held" is an export
  // result already generated (and saved to history) awaiting confirmation; it
  // is downloaded as-is rather than exporting again.
  const [confirmation, setConfirmation] = useState<{ kind: "svg" | "png"; request: KeychainRequest; errors: ProductionCheck[]; held: KeychainResult | null } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [fixStatus, setFixStatus] = useState<(FixStatus & { expected: string }) | null>(null);
  const [supportRequest, setSupportRequest] = useState(0);
  const exportingRef = useRef(false);
  const exportButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const pendingFont = useRef<KeychainDesign | null>(null);
  const change = useCallback((action: DesignAction, debounce = 0, group?: string) => {
    // A no-op (focus/blur, slider release, unchanged commit) only ends a
    // coalescing group. It must not re-request the preview, which would
    // briefly mark the current result stale and disable a valid export.
    const next = designReducer(designRef.current, action);
    if (JSON.stringify(next) === JSON.stringify(designRef.current)) {
      if (debounce === 0 && !group) history.boundary();
      return;
    }
    // Same-tick edits (e.g. repeated nudges) compare against the pending design.
    designRef.current = next;
    setDelay(debounce); history.edit(action, group);
    if (debounce === 0 && !group) history.boundary();
    setLastExport(null); setExportError(null); setConfirmation(null);
  }, [history.edit, history.boundary]);
  useEffect(() => {
    if (fonts.length && !fonts.some(font => font.id === design.font_id)) {
      const font = preferredFont(fonts, manualFonts);
      if (font) history.ensureFonts(font.id, fonts.map(font => font.id));
    }
    if (!fonts.length && design.font_id) history.ensureFonts("", []);
  }, [fonts, manualFonts, design.font_id, history.ensureFonts]);
  useEffect(() => { if (active) nameInput.current?.focus(); }, [active]);
  // Name/font changes invalidate shaped indices and any problem region.
  useEffect(() => { setSelection(null); setHighlight(null); }, [design.text, design.font_id]);
  const request = useMemo(() => design.font_id ? toRequest(hoverFont && hoverFont !== design.font_id
    ? { ...design, font_id: hoverFont, gap_configs: [], glyph_transforms: [], dots: { ...design.dots, manual_offsets: [] } }
    : design) : null, [design, hoverFont]);
  const preview = useKeychainPreview(request, delay, active);
  const layoutResult = preview.result?.recipe.text === toRequest(design).text && preview.result.recipe.font_id === design.font_id ? preview.result : null;
  const onFontPreview = useCallback((id: string | null) => { setHoverFont(id); setDelay(id ? 250 : 0); }, []);
  // R1 F7: while another font is only being previewed, its result must not be edited or fixed.
  const previewingFont = Boolean(hoverFont && hoverFont !== design.font_id);
  useEffect(() => {
    if (preview.current) pendingFont.current = null;
    if (preview.error && pendingFont.current && hoverFont === null) {
      const previous = pendingFont.current; pendingFont.current = null;
      change({ type: "patch", value: { font_id: previous.font_id, glyph_transforms: previous.glyph_transforms,
        gap_configs: previous.gap_configs, dots: { ...design.dots, manual_offsets: previous.dots.manual_offsets } } });
      setNotice(`${preview.error} The previous font has been restored.`);
    }
  }, [preview.error, preview.current, hoverFont, change, design.dots]);
  function move(selected: Exclude<Selection, null>, dx: number, dy: number, group?: string) {
    if (previewingFont) return;
    const ring = layoutResult?.ring, recipe = layoutResult?.recipe.ring;
    // A snapped ring is not at its nominal offsets. Rebase the move on the
    // actual centre, otherwise re-snapping from nominal+delta jumps or drifts.
    // Only rebase from a result that reflects the current offsets, so
    // coalesced nudges sent before the next preview are not rebased twice.
    if (selected === "ring" && ring?.snapped && ring.requested_center_x_mm != null && ring.requested_center_y_mm != null && recipe
      && recipe.position === design.ring.position && recipe.x_offset_mm === design.ring.x_offset_mm && recipe.y_offset_mm === design.ring.y_offset_mm) {
      dx += ring.center_x_mm-ring.requested_center_x_mm; dy += ring.center_y_mm-ring.requested_center_y_mm;
    }
    change({ type: "move", selection: selected, dx, dy }, 0, group);
  }
  function undoRedo(redo = false) {
    setDelay(0); setHoverFont(null); setLastExport(null); setConfirmation(null); setExportError(null);
    if (redo) history.redo(); else history.undo();
  }
  function nextName() {
    change({ type: "name", value: "" }); setSelection(null); setHoverFont(null);
    setNotice("Ready for the next name. Font, size, style and ring settings kept; letter-specific edits reset.");
    nameInput.current?.focus();
  }
  function loadRecipe(entry: KeychainHistoryEntry) {
    if (!fonts.some(font => font.id === entry.recipe.font_id)) {
      setNotice("This recipe's font is no longer in the library. Restore it in Fonts before reloading the recipe."); return;
    }
    change({ type: "replace", value: designFromRecipe(entry.recipe) });
    setSelection(null); setHoverFont(null); setHighlight(null); setFixStatus(null); setHistoryOpen(false); setNotice(`Loaded ${entry.recipe.text} from history.`); nameInput.current?.focus();
  }
  // R1 E3: the listener is registered once per activation and always calls
  // the latest handler, instead of re-registering on every render.
  const keyboardRef = useRef<(event: KeyboardEvent) => void>(() => {});
  function keyboard(event: KeyboardEvent) {
    const target = event.target instanceof Element ? event.target : document.body;
    if (confirmation) return; // The modal dialog handles its own keys.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !target.closest(".font-picker-popup")) {
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") {
        const redo = key === "y" || event.shiftKey;
        if (redo ? history.canRedo : history.canUndo) { event.preventDefault(); undoRedo(redo); }
        return;
      }
    }
    if (target.closest("input, textarea, select, [contenteditable=true]")) return;
    if (event.key === "Escape") { setSelection(null); setHighlight(null); setHistoryOpen(false); return; }
    // Arrow edits need a layout for the current name/font that contains the target.
    const targetExists = selection === "ring" ? Boolean(layoutResult?.ring) : layoutResult?.glyphs.some(glyph => glyph.glyph_index === selection);
    if (selection !== null && targetExists && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); const step = event.shiftKey ? 1 : .1;
      move(selection, event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0, `nudge-${selection}`);
    }
  }
  // Point at the committed render's handler (cheap; no listener churn).
  useLayoutEffect(() => { keyboardRef.current = keyboard; });
  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => keyboardRef.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active]);
  const canExport = Boolean(design.text.trim() && preview.current && !exporting && !previewingFont);
  function deliver(kind: "svg" | "png", result: KeychainResult) {
    setLastExport(result);
    try {
      if (kind === "png") downloadPng(result);
      else if (result.files.length === 1) downloadBlob(new Blob([result.files[0].svg], { type: "image/svg+xml" }), result.files[0].filename);
      const unsaved = result.history_saved === false;
      setNotice(result.files.length > 1 && kind === "svg"
        ? `${result.recipe.text}: aligned SVGs are ready below. Download each layer.${unsaved ? " They could not be saved to Keychain history." : ""}`
        : unsaved ? `${result.recipe.text} downloaded, but it could not be saved to Keychain history.`
        : `${result.recipe.text} exported and saved to Keychain history.`);
    } catch (caught) { setExportError(caught instanceof Error ? caught.message : "Could not download this keychain."); }
  }
  async function runExport(kind: "svg" | "png", request: KeychainRequest, confirmed: string[]) {
    // Synchronous guard: double-clicks and repeated Enter must not start a
    // second export (each server export writes one history entry).
    if (exportingRef.current) return;
    exportingRef.current = true;
    setConfirmation(null); setExporting(true); setExportError(null); setNotice("");
    try {
      const result = await exportKeychain(request);
      setHistoryVersion(version => version+1);
      const errors = result.checks.filter(check => check.severity === "error");
      // The export result is inspected on its own: errors not already
      // confirmed for this snapshot hold the files for confirmation.
      if (errors.some(check => !confirmed.includes(check.id))) setConfirmation({ kind, request, errors, held: result });
      else deliver(kind, result);
    } catch (caught) { setExportError(caught instanceof Error ? caught.message : "Could not export this keychain."); }
    finally { exportingRef.current = false; setExporting(false); }
  }
  function startExport(kind: "svg" | "png") {
    if (!canExport || exportingRef.current) return;
    const request = toRequest(design);
    const errors = preview.result?.checks.filter(check => check.severity === "error") ?? [];
    if (errors.length) setConfirmation({ kind, request, errors, held: null });
    else void runExport(kind, request, []);
  }
  function confirmExport() {
    if (!confirmation) return;
    const { kind, request, errors, held } = confirmation;
    if (held) { setConfirmation(null); deliver(kind, held); }
    else void runExport(kind, request, errors.map(check => check.id));
  }
  function cancelExport() {
    if (confirmation?.held) setNotice(`Export of ${confirmation.held.recipe.text} cancelled. Nothing was downloaded${confirmation.held.history_saved === false ? "." : "; the export is still listed in Keychain history."}`);
    setConfirmation(null);
  }
  function applyFix(check: ProductionCheck) {
    // Fixes are bound to the current accepted result: never apply a check
    // from an older preview to a different name, font or recipe.
    if (previewingFont || !preview.current || !preview.result?.checks.some(item => item.id === check.id && item.severity !== "pass")) return;
    if (fixStatus?.state === "pending") return;
    const plan = planFix(check, design, unit);
    if (plan.kind === "none") { setFixStatus({ checkId: check.id, state: "remaining", message: plan.reason, expected: JSON.stringify(design) }); return; }
    if (plan.kind === "filter-fonts") {
      setInspectorTab("design");
      setSupportRequest(value => value+1);
      setFixStatus({ checkId: check.id, state: "remaining", expected: JSON.stringify(design),
        message: "Showing fonts that support every character. Your design is unchanged until you choose one of them." });
      return;
    }
    const next = designReducer(design, plan.action);
    change(plan.action);
    setFixStatus({ checkId: check.id, state: "pending", message: `${plan.label}… checking the new preview.`, expected: JSON.stringify(next) });
  }
  useEffect(() => {
    if (!fixStatus) return;
    // Every status describes one design. After another edit, undo or reload
    // it is obsolete: never leave "Fixed" beside a design that is not fixed.
    if (JSON.stringify(design) !== fixStatus.expected) { setFixStatus(null); return; }
    if (fixStatus.state !== "pending") return;
    if (preview.error) { setFixStatus({ ...fixStatus, state: "failed", message: `The fix could not be previewed: ${preview.error}` }); return; }
    if (!preview.current || !preview.result) return;
    const after = preview.result.checks.find(item => item.id === fixStatus.checkId);
    if (!after || after.severity === "pass") {
      setFixStatus({ ...fixStatus, state: "resolved", message: `Fixed: ${after?.message ?? "the check now passes."} Undo restores the previous setting.` });
      return;
    }
    const nextStep = planFix(after, design, unit);
    setFixStatus({ ...fixStatus, state: "remaining", message: `Settings changed, but this still needs attention: ${after.message} `
      + (nextStep.kind === "design" ? `Next suggestion: ${nextStep.label}.` : nextStep.kind === "none" ? nextStep.reason : "") });
  }, [design, preview.current, preview.result, preview.error, fixStatus, unit]);
  const problemCheck = highlight ? preview.result?.checks.find(check => check.id === highlight && check.severity !== "pass" && check.highlight_bbox_mm) : null;
  const problem = problemCheck?.highlight_bbox_mm ? { id: problemCheck.id, label: problemCheck.message, bbox: problemCheck.highlight_bbox_mm } : null;
  const modal = Boolean(confirmation);
  const exportTools = <div className="export-controls kc-export-tools" aria-label="Keychain downloads" inert={modal}>
    <button type="button" ref={exportButton} aria-label={design.style === "layered" && design.layered_export === "separate" ? "Prepare SVGs" : "Download SVG"} disabled={!canExport} onClick={() => startExport("svg")}>
      {exporting ? <LoaderCircle className="kc-spin" size={18} /> : <Download size={18} aria-hidden="true" />}
      {design.style === "layered" && design.layered_export === "separate" ? "Prepare SVGs" : toolbarHost ? "SVG" : "Download SVG"}
    </button>
    <button type="button" aria-label="Download PNG" disabled={!canExport} onClick={() => startExport("png")}><Download size={18} aria-hidden="true" />{toolbarHost ? "PNG" : "Download PNG"}</button>
  </div>;
  return <section className="kc-workspace" aria-label="Keychain designer">
    {toolbarHost && active ? createPortal(exportTools, toolbarHost) : null}
    <header className="kc-topbar" inert={modal}>
      <div className="kc-heading"><KeyRound size={24} /><div><span className="kc-eyebrow">PERSONALISED · READY TO CUT</span><h1>Keychain designer</h1></div></div>
      <div className="kc-name"><label htmlFor="kc-name">Name</label><input id="kc-name" ref={nameInput} value={design.text} maxLength={40} placeholder="Type a name…" autoComplete="off"
        onChange={event => { change({ type: "name", value: event.target.value }, 150, "name"); setSelection(null); setNotice(""); }}
        onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing && lastExport
          && JSON.stringify(designFromRecipe(lastExport.recipe)) === JSON.stringify({ ...design, text: design.text.trim().normalize("NFC") })) { event.preventDefault(); nextName(); } }} /></div>
      <div className="kc-style" aria-label="Keychain style">{(["engraved", "layered"] as const).map(style => <button key={style} type="button" aria-pressed={design.style === style} onClick={() => change({ type: "patch", value: { style } })}>{style === "engraved" ? "Engraved" : "Layered"}</button>)}</div>
      <label className="kc-preset"><Shapes size={16} /><select aria-label="Product preset" value="" onChange={event => { if (event.target.value) change({ type: "preset", value: event.target.value as "name" | "mini" | "bag" }); }}>
        <option value="" disabled>Presets</option><option value="name">Name Keychain · 60 mm</option><option value="mini">Mini Charm · 40 mm</option><option value="bag">Bag Tag · 90 mm</option></select></label>
      <span className={`kc-status kc-status-${preview.status}`} role="status">{preview.status === "updating" ? <LoaderCircle className="kc-spin" size={15} /> : <span aria-hidden="true">●</span>}{preview.error ? "Needs attention" : hoverFont && hoverFont !== design.font_id ? "Font preview" : preview.current ? "Ready" : fonts.length ? "Updating" : "Loading fonts"}</span>
      <div className="kc-edit-actions"><button type="button" aria-label="Undo keychain change" title="Undo · Ctrl+Z" disabled={!history.canUndo} onClick={() => undoRedo()}><Undo2 size={16} /></button>
        <button type="button" aria-label="Redo keychain change" title="Redo · Ctrl+Y" disabled={!history.canRedo} onClick={() => undoRedo(true)}><Redo2 size={16} /></button>
        <button type="button" aria-label="Keychain history" aria-expanded={historyOpen} onClick={() => setHistoryOpen(open => !open)}><Clock3 size={16} /><span>History</span></button></div>
      {!toolbarHost && exportTools}
    </header>
    <div className="kc-modal-scope" inert={modal}>
    {historyOpen && <KeychainHistoryList active={active} version={historyVersion} unit={unit} onClose={() => setHistoryOpen(false)} onLoad={loadRecipe} />}
    {notice && <div className="kc-notice" role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}
    {(preview.error || exportError) && <div className="kc-error" role="alert"><span>{exportError ?? preview.error}</span><button type="button" onClick={() => { setExportError(null); preview.retry(); }}>Retry preview</button></div>}
    <div className="kc-body"><div className="kc-stage"><KeychainPreview result={preview.result} unit={unit} placeholder={!design.text.trim()} current={preview.current && !previewingFont} selection={selection} onSelect={selected => { setSelection(selected); if (typeof selected === "number") setInspectorTab("letters"); else if (selected === "ring") setInspectorTab("structure"); }} onMove={move} editableGlyphs problem={problem} />
      <ProductionCheckPanel result={preview.result} stale={!preview.current || previewingFont} design={design} unit={unit} highlighted={problem ? highlight : null}
        fixStatus={fixStatus} onFix={applyFix} onShow={check => setHighlight(current => current === check.id ? null : check.id)} />
      <footer className="kc-exportbar"><div><strong>{preview.result ? `${dimension(preview.result.width_mm, unit)} × ${dimension(preview.result.height_mm, unit)}` : "Your keychain"}</strong><small>{design.style === "engraved" ? "Cut backing + engraved name" : "Two layers for assembly"}</small></div>
        <button type="button" className="kc-next-name" disabled={!design.text.trim() || exporting} onClick={nextName}>Next name <ArrowRight size={16} /></button>
      </footer>
      {lastExport && lastExport.files.length > 1 && <div className="kc-file-links" aria-label={`Prepared SVG files for ${lastExport.recipe.text}`}><span>{lastExport.recipe.text}</span>{lastExport.files.map(file => <button type="button" key={file.filename} onClick={() => downloadBlob(new Blob([file.svg], { type: "image/svg+xml" }), file.filename)}><Download size={15} />{file.filename.endsWith("-backing.svg") ? "Download backing SVG" : "Download text SVG"}</button>)}</div>}
    </div><aside className="kc-controls" aria-label="Keychain settings">
      <div className="kc-inspector-heading"><strong>Design properties</strong></div>
      <div className="kc-inspector-tabs" role="tablist" aria-label="Keychain properties">
        {(["design", "letters", "structure"] as const).map((tab, index, tabs) => <button key={tab} id={`kc-tab-${tab}`} type="button" role="tab" aria-selected={inspectorTab === tab} aria-controls={`kc-panel-${tab}`} tabIndex={inspectorTab === tab ? 0 : -1}
          onClick={() => setInspectorTab(tab)} onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (next >= 0) { event.preventDefault(); setInspectorTab(tabs[next]); document.getElementById(`kc-tab-${tabs[next]}`)?.focus(); }
          }}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
      <div className="kc-inspector-scroll">
      <KeychainControls tab={inspectorTab} design={design} change={change} fonts={fonts} manualFonts={manualFonts} unit={unit} setUnit={setUnit} result={layoutResult}
        supportRequest={supportRequest}
        onFont={id => { setHoverFont(null); if (id === design.font_id) return; pendingFont.current = design; change({ type: "patch", value: { font_id: id, gap_configs: [], glyph_transforms: [], dots: { ...design.dots, manual_offsets: [] } } }); setSelection(null); }} onFontPreview={onFontPreview}>
      <LetterInspector index={typeof selection === "number" ? selection : null} design={design} result={layoutResult} change={change} unit={unit} />
      </KeychainControls></div>
    </aside></div>

    </div>
    {confirmation && <ExportConfirmDialog name={confirmation.request.text} errors={confirmation.errors} held={Boolean(confirmation.held)}
      onCancel={cancelExport} onConfirm={confirmExport} returnFocus={() => exportButton.current} />}
  </section>;
}
