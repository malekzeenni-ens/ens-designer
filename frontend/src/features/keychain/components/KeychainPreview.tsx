import { useRef, useState, type PointerEvent } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { KeychainResult, Unit } from "../state/keychainTypes";
import { clamp, dimension } from "../utils/units";

export type Selection = "ring" | number | null;
export function pointerInMm(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, width: number, height: number) {
  const scale = Math.min(rect.width/width, rect.height/height);
  return { x: (x-rect.left-(rect.width-width*scale)/2)/scale, y: (y-rect.top-(rect.height-height*scale)/2)/scale };
}
export function KeychainPreview({ result, unit, placeholder, current, selection, onSelect, onMove, editableGlyphs = false }: {
  result: KeychainResult | null; unit: Unit; placeholder: boolean; current: boolean;
  selection: Selection; onSelect: (selection: Selection) => void;
  onMove: (selection: Exclude<Selection, null>, dx: number, dy: number) => void; editableGlyphs?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState("both");
  const plane = useRef<HTMLDivElement>(null);
  const ghost = useRef<SVGGElement>(null);
  const drag = useRef<{ id: number; selection: Exclude<Selection, null>; start: { x: number; y: number }; dx: number; dy: number; target: Element } | null>(null);
  function position(event: PointerEvent) {
    return pointerInMm(event.clientX, event.clientY, plane.current!.getBoundingClientRect(), result!.canvas_width_mm, result!.canvas_height_mm);
  }
  function down(event: PointerEvent, selected: Exclude<Selection, null>) {
    if (!current || !result) return;
    event.preventDefault(); event.stopPropagation();
    onSelect(selected);
    (event.currentTarget as HTMLElement | SVGElement).focus();
    drag.current = { id: event.pointerId, selection: selected, start: position(event), dx: 0, dy: 0, target: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (ghost.current) ghost.current.style.display = "block";
  }
  function move(event: PointerEvent) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const point = position(event);
    active.dx = point.x-active.start.x; active.dy = point.y-active.start.y;
    ghost.current?.setAttribute("transform", `translate(${active.dx} ${active.dy})`);
  }
  function end(event: PointerEvent, cancel = false) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    drag.current = null;
    ghost.current?.setAttribute("transform", "");
    if (ghost.current) ghost.current.style.display = "none";
    if (!cancel && Math.hypot(active.dx, active.dy) > .01) onMove(active.selection, active.dx, active.dy);
  }
  const glyph = typeof selection === "number" ? result?.glyphs.find(glyph => glyph.glyph_index === selection) : null;
  const selectedBounds = selection === "ring" && result?.ring
    ? [result.ring.center_x_mm-result.ring.outer_diameter_mm/2, result.ring.center_y_mm-result.ring.outer_diameter_mm/2, result.ring.center_x_mm+result.ring.outer_diameter_mm/2, result.ring.center_y_mm+result.ring.outer_diameter_mm/2]
    : glyph?.bbox_mm;
  return <section className="kc-preview" aria-label="Keychain preview">
    <div className="kc-preview-toolbar"><div className="kc-view-buttons" aria-label="Preview layers">{["both", "backing", "text"].map(value =>
      <button type="button" key={value} aria-pressed={view === value} onClick={() => setView(value)}>{value === "both" ? "Both layers" : value === "backing" ? "Backing" : "Text"}</button>)}</div>
      <div className="kc-zoom"><button type="button" aria-label="Zoom out" onClick={() => setZoom(value => clamp(value-.25, .5, 3))}><Minus size={15} /></button>
        <span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom(value => clamp(value+.25, .5, 3))}><Plus size={15} /></button>
        <button type="button" aria-label="Fit design" onClick={() => setZoom(1)}><Maximize2 size={15} /></button></div>
    </div>
    <div className={`kc-canvas${placeholder ? " kc-placeholder" : ""}`} onClick={event => { if (event.target === event.currentTarget) onSelect(null); }}>
      {result ? <div className="kc-design-plane" ref={plane} tabIndex={-1} style={{ transform: `scale(${zoom})` }}
        onPointerDown={event => {
          const hit = (event.target as Element).closest("[data-glyph-index]");
          if (hit && editableGlyphs && view !== "backing") down(event, Number(hit.getAttribute("data-glyph-index")));
        }} onPointerMove={move} onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)}
        onKeyDown={event => {
          if (event.key === "Escape" && drag.current) {
            const active = drag.current; drag.current = null;
            if (ghost.current) { ghost.current.style.display = "none"; ghost.current.setAttribute("transform", ""); }
            if (active.target.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id);
          }
        }}>
        <div className="kc-svg" data-view={view} dangerouslySetInnerHTML={{ __html: result.preview_svg }} />
        <svg className="kc-overlay" viewBox={`0 0 ${result.canvas_width_mm} ${result.canvas_height_mm}`}>
          {editableGlyphs && view !== "backing" && result.glyphs.filter(g => g.bbox_mm[2] > g.bbox_mm[0]).map(item => <rect key={item.glyph_index}
            className="kc-glyph-target" x={item.bbox_mm[0]} y={item.bbox_mm[1]} width={item.bbox_mm[2]-item.bbox_mm[0]} height={item.bbox_mm[3]-item.bbox_mm[1]}
            tabIndex={current ? 0 : -1} role="button" aria-label={`Select ${item.cluster_text}, glyph ${item.glyph_index+1}`} aria-pressed={selection === item.glyph_index}
            onFocus={() => { if (current) onSelect(item.glyph_index); }} onPointerDown={event => down(event, item.glyph_index)} />)}
          {result.ring && view !== "text" && <circle className="kc-ring-target" cx={result.ring.center_x_mm} cy={result.ring.center_y_mm} r={result.ring.outer_diameter_mm/2}
            tabIndex={current ? 0 : -1} role="button" aria-label="Move ring" aria-pressed={selection === "ring"} onFocus={() => { if (current) onSelect("ring"); }} onPointerDown={event => down(event, "ring")} />}
          {selectedBounds && <rect className="kc-selection" x={selectedBounds[0]} y={selectedBounds[1]} width={selectedBounds[2]-selectedBounds[0]} height={selectedBounds[3]-selectedBounds[1]} />}
          <g ref={ghost} className="kc-ghost" style={{ display: "none" }}>{selectedBounds && <rect x={selectedBounds[0]} y={selectedBounds[1]} width={selectedBounds[2]-selectedBounds[0]} height={selectedBounds[3]-selectedBounds[1]} />}</g>
        </svg>
      </div> : <div className="kc-canvas-empty"><span className="kc-eyebrow">YOUR NEXT PERSONALISED PIECE</span><h2>A name. A finished keychain.</h2><p>Choose a font and type a name to see your design.</p></div>}
      {placeholder && result && <span className="kc-placeholder-note">Type a name to make it yours</span>}
      {!current && result && <span className="kc-updating">Updating preview…</span>}
    </div>
    <div className="kc-preview-caption"><span>{result ? `${dimension(result.width_mm, unit)} × ${dimension(result.height_mm, unit)}` : "Finished dimensions"}</span>
      <div className="kc-layer-legend"><span><i style={{ background: result?.recipe.colors.backing ?? "#000000" }} />Cut backing</span><span><i style={{ background: result?.recipe.colors.text ?? "#FF0000" }} />{result?.recipe.style === "layered" ? "Cut text" : "Engrave text"}</span></div>
    </div>
  </section>;
}
