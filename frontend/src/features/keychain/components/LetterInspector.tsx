import type { KeychainDesign, KeychainResult, Unit } from "../state/keychainTypes";
import { defaultGlyph } from "../state/keychainReducer";
import { fromMm, toMm } from "../utils/units";
import { NumberField, Section } from "./Fields";
import type { ChangeDesign } from "./KeychainControls";

export function LetterInspector({ index, result, design, change, unit }: {
  index: number | null; result: KeychainResult | null; design: KeychainDesign; change: ChangeDesign; unit: Unit;
}) {
  const glyph = result?.glyphs.find(glyph => glyph.glyph_index === index);
  const transform = index !== null ? design.glyph_transforms.find(item => item.glyph_index === index) ?? defaultGlyph(index) : null;
  const dot = design.dots.manual_offsets.find(item => item.glyph_index === index);
  return <Section title="Letter inspector" open>
    {!glyph || !transform || index === null ? <p className="kc-inspector-hint">Select a letter on the canvas to move, scale or rotate it. Joined letters are selected together.</p> : <>
      <div className="kc-inspector-title"><strong>Selected: {glyph.cluster_text}</strong><button type="button" onClick={() => change({ type: "reset-glyph", index })}>Reset letter</button></div>
      <div className="kc-two-col">{(["dx_mm", "dy_mm"] as const).map((field, axis) => <NumberField key={field} label={`Letter ${axis ? "Y" : "X"} offset`} value={fromMm(transform[field], unit)} min={fromMm(-50, unit)} max={fromMm(50, unit)} suffix={unit} step={unit === "in" ? .001 : .1}
        onChange={value => change({ type: "glyph", index, value: { [field]: toMm(value, unit) } }, 120, `letter-${index}-${field}`)} />)}</div>
      <div className="kc-two-col"><NumberField label="Letter scale" value={transform.scale*100} min={50} max={200} step={1} suffix="%" onChange={value => change({ type: "glyph", index, value: { scale: value/100 } }, 120, `letter-${index}-scale`)} />
        <NumberField label="Letter rotation" value={transform.rotation_deg} min={-45} max={45} step={1} suffix="°" onChange={value => change({ type: "glyph", index, value: { rotation_deg: value } }, 120, `letter-${index}-rotation`)} /></div>
      {glyph.has_floating_component && <div className="kc-two-col">{(["x_offset_mm", "y_offset_mm"] as const).map((field, axis) => <NumberField key={field} label={`Dot / mark ${axis ? "Y" : "X"} offset`} value={fromMm(dot?.[field] ?? 0, unit)} min={fromMm(-50, unit)} max={fromMm(50, unit)} suffix={unit} step={unit === "in" ? .001 : .1}
        onChange={value => change({ type: "patch", value: { dots: { ...design.dots, manual_offsets: [...design.dots.manual_offsets.filter(item => item.glyph_index !== index),
          { glyph_index: index, x_offset_mm: dot?.x_offset_mm ?? 0, y_offset_mm: dot?.y_offset_mm ?? 0, [field]: toMm(value, unit) }] } } }, 120, `dot-${index}-${field}`)} />)}</div>}
      <small>Drag to move. Arrow keys nudge 0.1 mm, or 1 mm with Shift. Escape deselects.</small>
    </>}
  </Section>;
}
