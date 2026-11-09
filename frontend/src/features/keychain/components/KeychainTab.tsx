import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Download, KeyRound, LoaderCircle, Shapes } from "lucide-react";
import type { FontInfo } from "../../../types/design";
import { designReducer, type DesignAction } from "../state/keychainReducer";
import { DEFAULT_DESIGN, type KeychainResult, type Unit } from "../state/keychainTypes";
import { useKeychainPreview } from "../hooks/useKeychainPreview";
import { downloadBlob, downloadPng, exportKeychain } from "../services/keychainApi";
import { clamp, dimension, toRequest } from "../utils/units";
import { KeychainControls } from "./KeychainControls";
import { KeychainPreview, type Selection } from "./KeychainPreview";
import { ProductionCheckPanel } from "./ProductionCheckPanel";
import { preferredFont } from "./FontSection";
import "../keychain.css";

export function KeychainTab({ fonts, manualFonts, active }: { fonts: FontInfo[]; manualFonts: FontInfo[]; active: boolean }) {
  const [design, dispatch] = useReducer(designReducer, DEFAULT_DESIGN);
  const [delay, setDelay] = useState(0);
  const [hoverFont, setHoverFont] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("mm");
  const [selection, setSelection] = useState<Selection>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<KeychainResult | null>(null);
  const [confirmation, setConfirmation] = useState<"svg" | "png" | null>(null);
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const pendingFont = useRef<string | null>(null);
  const change = useCallback((action: DesignAction, debounce = 0, _group?: string) => {
    setDelay(debounce); dispatch(action); setLastExport(null); setExportError(null); setConfirmation(null);
  }, []);
  useEffect(() => {
    if (fonts.length && !fonts.some(font => font.id === design.font_id)) {
      const font = preferredFont(fonts, manualFonts);
      if (font) dispatch({ type: "patch", value: { font_id: font.id } });
    }
  }, [fonts, manualFonts, design.font_id]);
  useEffect(() => { if (active) nameInput.current?.focus(); }, [active]);
  const request = useMemo(() => design.font_id ? toRequest(hoverFont && hoverFont !== design.font_id
    ? { ...design, font_id: hoverFont, gap_configs: [], glyph_transforms: [], dots: { ...design.dots, manual_offsets: [] } }
    : design) : null, [design, hoverFont]);
  const preview = useKeychainPreview(request, delay, active);
  const onFontPreview = useCallback((id: string | null) => { setHoverFont(id); setDelay(id ? 250 : 0); }, []);
  useEffect(() => {
    if (preview.current) pendingFont.current = null;
    if (preview.error && pendingFont.current && hoverFont === null) {
      const previous = pendingFont.current; pendingFont.current = null;
      change({ type: "patch", value: { font_id: previous } });
      setNotice(`${preview.error} The previous font has been restored.`);
    }
  }, [preview.error, preview.current, hoverFont, change]);
  function move(selected: Exclude<Selection, null>, dx: number, dy: number) {
    if (selected === "ring") change({ type: "patch", value: { ring: { ...design.ring,
      x_offset_mm: clamp(design.ring.x_offset_mm+dx, -100, 100), y_offset_mm: clamp(design.ring.y_offset_mm+dy, -100, 100) } } });
  }
  useEffect(() => {
    if (!active) return;
    function keyboard(event: KeyboardEvent) {
      const target = event.target as Element;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape") { setSelection(null); return; }
      if (selection === "ring" && preview.current && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault(); const step = event.shiftKey ? 1 : .1;
        move("ring", event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
          event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0);
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
  const canExport = Boolean(design.text.trim() && preview.current && !exporting && (!hoverFont || hoverFont === design.font_id));
  async function performExport(kind: "svg" | "png") {
    setConfirmation(null); setExporting(true); setExportError(null); setNotice("");
    try {
      const result = await exportKeychain(toRequest(design));
      setLastExport(result);
      if (kind === "png") downloadPng(result);
      else if (result.files.length === 1) downloadBlob(new Blob([result.files[0].svg], { type: "image/svg+xml" }), result.files[0].filename);
      setNotice(result.files.length > 1 && kind === "svg" ? "Your aligned SVGs are ready below. Download each layer." : "Exported and saved to Keychain history.");
    } catch (caught) { setExportError(caught instanceof Error ? caught.message : "Could not export this keychain."); }
    finally { setExporting(false); }
  }
  function startExport(kind: "svg" | "png") {
    if (!canExport) return;
    if (preview.result?.checks.some(check => check.severity === "error")) setConfirmation(kind);
    else void performExport(kind);
  }
  return <section className="kc-workspace" aria-label="Keychain designer">
    <header className="kc-topbar">
      <div className="kc-heading"><KeyRound size={24} /><div><span className="kc-eyebrow">PERSONALISED · READY TO CUT</span><h1>Keychain designer</h1></div></div>
      <div className="kc-name"><label htmlFor="kc-name">Name</label><input id="kc-name" ref={nameInput} value={design.text} maxLength={40} placeholder="Type a name…" autoComplete="off"
        onChange={event => { change({ type: "name", value: event.target.value }, 150, "name"); setSelection(null); setNotice(""); }} /></div>
      <div className="kc-style" aria-label="Keychain style">{(["engraved", "layered"] as const).map(style => <button key={style} type="button" aria-pressed={design.style === style} onClick={() => change({ type: "patch", value: { style } })}>{style === "engraved" ? "Engraved" : "Layered"}</button>)}</div>
      <label className="kc-preset"><Shapes size={16} /><select aria-label="Product preset" value="" onChange={event => { if (event.target.value) change({ type: "preset", value: event.target.value as "name" | "mini" | "bag" }); }}>
        <option value="" disabled>Presets</option><option value="name">Name Keychain · 60 mm</option><option value="mini">Mini Charm · 40 mm</option><option value="bag">Bag Tag · 90 mm</option></select></label>
      <span className={`kc-status kc-status-${preview.status}`} role="status">{preview.status === "updating" ? <LoaderCircle className="kc-spin" size={15} /> : <span aria-hidden="true">●</span>}{preview.error ? "Needs attention" : hoverFont && hoverFont !== design.font_id ? "Font preview" : preview.current ? "Ready" : fonts.length ? "Updating" : "Loading fonts"}</span>
    </header>
    {notice && <div className="kc-notice" role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}
    {(preview.error || exportError) && <div className="kc-error" role="alert"><span>{exportError ?? preview.error}</span><button type="button" onClick={() => { setExportError(null); preview.retry(); }}>Retry preview</button></div>}
    <div className="kc-body"><aside className="kc-controls" aria-label="Keychain settings">
      <KeychainControls design={design} change={change} fonts={fonts} manualFonts={manualFonts} unit={unit} setUnit={setUnit} result={preview.current ? preview.result : null}
        onFont={id => { pendingFont.current = design.font_id; setHoverFont(null); change({ type: "patch", value: { font_id: id, gap_configs: [], glyph_transforms: [], dots: { ...design.dots, manual_offsets: [] } } }); setSelection(null); }} onFontPreview={onFontPreview} />
    </aside><div className="kc-stage"><KeychainPreview result={preview.result} unit={unit} placeholder={!design.text.trim()} current={preview.current} selection={selection} onSelect={setSelection} onMove={move} />
      <ProductionCheckPanel result={preview.result} />
      <footer className="kc-exportbar"><div><strong>{preview.result ? `${dimension(preview.result.width_mm, unit)} × ${dimension(preview.result.height_mm, unit)}` : "Your keychain"}</strong><small>{design.style === "engraved" ? "Cut backing + engraved name" : "Two layers for assembly"}</small></div>
        <button type="button" disabled={!canExport} onClick={() => startExport("png")}>Download PNG</button>
        <button type="button" className="kc-primary" disabled={!canExport} onClick={() => startExport("svg")}>{exporting ? <LoaderCircle className="kc-spin" size={17} /> : <Download size={17} />}{design.style === "layered" && design.layered_export === "separate" ? "Prepare SVGs" : "Download SVG"}</button>
      </footer>
      {lastExport && lastExport.files.length > 1 && <div className="kc-file-links" aria-label="Prepared SVG files">{lastExport.files.map(file => <button type="button" key={file.filename} onClick={() => downloadBlob(new Blob([file.svg], { type: "image/svg+xml" }), file.filename)}><Download size={15} />{file.filename.endsWith("-backing.svg") ? "Download backing SVG" : "Download text SVG"}</button>)}</div>}
    </div></div>
    {confirmation && <div className="kc-dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="kc-export-warning" className="kc-dialog"><h2 id="kc-export-warning">Export with production errors?</h2><p>This design has unresolved production errors. Review them before cutting.</p><ul>{preview.result?.checks.filter(check => check.severity === "error").map(check => <li key={check.id}>{check.message}</li>)}</ul><div><button type="button" autoFocus onClick={() => setConfirmation(null)}>Cancel</button><button type="button" className="kc-primary" onClick={() => void performExport(confirmation)}>Export anyway</button></div></section></div>}
  </section>;
}
