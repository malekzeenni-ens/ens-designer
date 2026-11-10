import type { ReactNode } from "react";
import type { FontInfo } from "../../../types/design";
import type { DesignAction } from "../state/keychainReducer";
import type { KeychainDesign, KeychainResult, Unit } from "../state/keychainTypes";
import { fromMm, toMm } from "../utils/units";
import { NumberField, Section, Toggle } from "./Fields";
import { FontSection } from "./FontSection";

export type KeychainInspectorTab = "design" | "letters" | "structure";
export type ChangeDesign = (action: DesignAction, delay?: number, group?: string) => void;
export function KeychainControls({ design: d, change, fonts, manualFonts, unit, setUnit, onFont, onFontPreview, result, supportRequest = 0, tab = "design", children }: {
  design: KeychainDesign; change: ChangeDesign; fonts: FontInfo[]; manualFonts: FontInfo[];
  unit: Unit; setUnit: (unit: Unit) => void; onFont: (id: string) => void; onFontPreview: (id: string | null) => void;
  result: KeychainResult | null; supportRequest?: number; tab?: KeychainInspectorTab; children?: ReactNode;
}) {
  function number(label: string, value: number, min: number, max: number, update: (value: number) => Partial<KeychainDesign>, slider = false) {
    return <NumberField label={label} value={fromMm(value, unit)} min={fromMm(min, unit)} max={fromMm(max, unit)}
      step={unit === "in" ? .001 : unit === "cm" ? .01 : .1} suffix={unit} slider={slider}
      onChange={value => change({ type: "patch", value: update(toMm(value, unit)) }, 120, label)}
      commit={() => change({ type: "patch", value: {} }, 0)} />;
  }
  return <>
    <section id="kc-panel-design" role="tabpanel" aria-labelledby="kc-tab-design" hidden={tab !== "design"} tabIndex={0}>
    <Section title="Font" open><FontSection fonts={fonts} manualFonts={manualFonts} value={d.font_id} text={d.text}
      onChange={onFont} onPreview={onFontPreview} supportRequest={supportRequest} /></Section>
    <Section title="Finished size" open>
      <div className="kc-two-col"><label className="kc-field">Measure<select value={d.size.mode} onChange={event => {
        const mode = event.target.value as "width" | "height";
        change({ type: "patch", value: { size: { mode, target_mm: Math.max(mode === "width" ? 25 : 10, Math.min(mode === "width" ? 200 : 100, d.size.target_mm)) } } });
      }}><option value="width">Width</option><option value="height">Height</option></select></label>
      <label className="kc-field">Units<select value={unit} onChange={event => setUnit(event.target.value as Unit)}><option value="mm">Millimetres</option><option value="cm">Centimetres</option><option value="in">Inches</option></select></label></div>
      {number(`Target ${d.size.mode}`, d.size.target_mm, d.size.mode === "width" ? 25 : 10, d.size.mode === "width" ? 200 : 100, value => ({ size: { ...d.size, target_mm: value } }), true)}
      <small>Finished size includes the ring. Letters keep their proportions.</small>
      <label className="kc-field">Material<select value={d.material_id} onChange={event => change({ type: "patch", value: { material_id: event.target.value } })}>
        <option value="cast-acrylic-3mm">3 mm Cast Acrylic</option><option value="mirror-acrylic-3mm">3 mm Mirror Acrylic</option><option value="plywood-3mm">3 mm Plywood</option></select></label>
    </Section>
    <Section title="Layers & colours" open>
      <div className="kc-two-col"><label className="kc-field">Cut backing<input type="color" value={d.colors.backing} onChange={event => change({ type: "patch", value: { colors: { ...d.colors, backing: event.target.value } } }, 120, "backing-color")} /></label>
        <label className="kc-field">{d.style === "layered" ? "Cut text" : "Engrave text"}<input type="color" value={d.colors.text} onChange={event => change({ type: "patch", value: { colors: { ...d.colors, text: event.target.value } } }, 120, "text-color")} /></label></div>
      {d.style === "layered" && <label className="kc-field">SVG files<select value={d.layered_export} onChange={event => change({ type: "patch", value: { layered_export: event.target.value as "combined" | "separate" } })}>
        <option value="combined">One combined SVG</option><option value="separate">Two aligned SVGs</option></select></label>}
    </Section>
    </section>
    <section id="kc-panel-structure" role="tabpanel" aria-labelledby="kc-tab-structure" hidden={tab !== "structure"} tabIndex={0}>
    <Section title="Backing" open>
      {number("Backing offset", d.backing.offset_mm, 1, 10, value => ({ backing: { ...d.backing, offset_mm: value } }), true)}
      <Toggle label="Fill letter counters" checked={d.backing.fill_counters} onChange={checked => change({ type: "patch", value: { backing: { ...d.backing, fill_counters: checked } } })} />
      {number("Smooth outline", d.backing.smoothing_mm, 0, 3, value => ({ backing: { ...d.backing, smoothing_mm: value } }))}
      {number("Reinforce text strokes", d.stroke_buffer_mm, 0, .6, value => ({ stroke_buffer_mm: value }))}
    </Section>
    <Section title="Ring / keyhole" open>
      <Toggle label="Include ring" checked={d.ring.enabled} onChange={enabled => change({ type: "patch", value: { ring: { ...d.ring, enabled } } })} />
      <fieldset disabled={!d.ring.enabled}><label className="kc-field">Position<select value={d.ring.position} onChange={event => change({ type: "patch", value: { ring: { ...d.ring, position: event.target.value as KeychainDesign["ring"]["position"], x_offset_mm: 0, y_offset_mm: 0 } } })}>
        <option value="top-left">Top left</option><option value="top-center">Top centre</option><option value="top-right">Top right</option><option value="left-middle">Left middle</option><option value="right-middle">Right middle</option><option value="custom">Custom</option></select></label>
        <div className="kc-two-col">{number("Outer diameter", d.ring.outer_diameter_mm, 10, 15, value => ({ ring: { ...d.ring, outer_diameter_mm: value } }))}
          {number("Hole diameter", d.ring.hole_diameter_mm, 4, 6, value => ({ ring: { ...d.ring, hole_diameter_mm: value } }))}</div>
        <Toggle label="Snap ring to backing" checked={d.ring.auto_snap} onChange={auto_snap => change({ type: "patch", value: { ring: { ...d.ring, auto_snap } } })} />
        <div className="kc-two-col">{number("Ring X offset", d.ring.x_offset_mm, -100, 100, value => ({ ring: { ...d.ring, x_offset_mm: value } }))}
          {number("Ring Y offset", d.ring.y_offset_mm, -100, 100, value => ({ ring: { ...d.ring, y_offset_mm: value } }))}</div>
        {result?.ring && <p className="kc-readout">Wall {result.ring.wall_thickness_mm.toFixed(1)} mm · Neck {result.ring.neck_width_mm.toFixed(1)} mm{result.ring.snapped ? " · Snapped to body" : ""}</p>}
        <small>Drag the ring on the canvas. Arrow keys nudge 0.1 mm; Shift nudges 1 mm.</small>
      </fieldset>
    </Section>
    </section>
    <section id="kc-panel-letters" role="tabpanel" aria-labelledby="kc-tab-letters" hidden={tab !== "letters"} tabIndex={0}>
    {children}
    <Section title="Letters & spacing" open>
      <label className="kc-field">Overlap<select value={d.overlap_mode} onChange={event => change({ type: "patch", value: { overlap_mode: event.target.value as KeychainDesign["overlap_mode"], overlap_custom_mm: event.target.value === "custom" ? d.overlap_custom_mm ?? 1 : null } })}>
        <option value="light">Light</option><option value="auto">Auto</option><option value="medium">Medium</option><option value="strong">Strong</option><option value="custom">Custom</option></select></label>
      {d.overlap_mode === "custom" && <NumberField label="Custom overlap" value={d.overlap_custom_mm ?? 1} min={.1} max={10} onChange={value => change({ type: "patch", value: { overlap_custom_mm: value } }, 120, "overlap")} />}
      {number("Letter spacing", d.letter_spacing_mm, -10, 20, value => ({ letter_spacing_mm: value }))}
      <Toggle label="Auto-join i / j dots" checked={d.dots.auto_join} onChange={auto_join => change({ type: "patch", value: { dots: { ...d.dots, auto_join } } })} />
      {d.dots.auto_join && <NumberField label="Dot overlap" value={d.dots.overlap_pct} min={10} max={50} step={1} suffix="%" onChange={value => change({ type: "patch", value: { dots: { ...d.dots, overlap_pct: value } } }, 120, "dot-overlap")} />}
      {result && result.glyphs.length > 1 && <details className="kc-gap-list"><summary>Individual gaps</summary>{result.glyphs.slice(0, -1).map((glyph, index) => {
        const gap = d.gap_configs.find(gap => gap.pair_index === index);
        return <div className="kc-gap" key={index}><Toggle label={`${glyph.cluster_text} → ${result.glyphs[index+1].cluster_text}`} checked={gap?.enabled ?? true} onChange={enabled => change({ type: "patch", value: { gap_configs: [...d.gap_configs.filter(item => item.pair_index !== index), { pair_index: index, enabled, overlap_mm: gap?.overlap_mm ?? 1 }] } })} />
          <NumberField label={`Gap ${index+1} overlap`} value={gap?.overlap_mm ?? 1} min={.1} max={30} onChange={overlap_mm => change({ type: "patch", value: { gap_configs: [...d.gap_configs.filter(item => item.pair_index !== index), { pair_index: index, enabled: gap?.enabled ?? true, overlap_mm }] } }, 120, `gap-${index}`)} /></div>;
      })}</details>}
    </Section>
    </section>
  </>;
}
