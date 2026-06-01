/**
 * FloatingControls — X/Y offset controls for glyph floating components
 * (dots on 'i', 'j', diacritical marks, accent dots, etc.)
 *
 * Appears only when the backend detects at least one floating component
 * in the current line/word. Each detected glyph gets its own X and Y
 * offset input (left/right and up/down).
 */
import type { FloatingComponentInfo, FloatingComponentOffset } from "../types/design";

export type FloatingOffsetMap = Record<number, { xMm: string; yMm: string }>;

interface FloatingControlsProps {
  floatingComponents: FloatingComponentInfo[];
  offsets: FloatingOffsetMap;
  onChange: (glyphIndex: number, axis: "x" | "y", value: string) => void;
}

export function FloatingControls({ floatingComponents, offsets, onChange }: FloatingControlsProps) {
  if (floatingComponents.length === 0) return null;

  return (
    <div className="floating-controls">
      <div className="ct-subsection-copy">
        <span className="ct-subsection-title">Detached dots & accents</span>
        <p>Move detached dots or accent marks so they visually connect or sit correctly before export.</p>
      </div>
      <div className="floating-controls-grid">
        {floatingComponents.map((fc) => {
          const off = offsets[fc.glyph_index] ?? { xMm: "0", yMm: "0" };
          return (
            <div key={fc.glyph_index} className="floating-row">
              <span className="floating-char" title={`Glyph index ${fc.glyph_index}`}>
                "{fc.char}" dot
              </span>
              <label className="floating-axis-label">
                <span>↔ X</span>
                <input
                  type="number"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={off.xMm}
                  className="floating-input"
                  onChange={(e) => onChange(fc.glyph_index, "x", e.target.value)}
                  aria-label={`'${fc.char}' dot left/right offset`}
                />
                <span>mm</span>
              </label>
              <label className="floating-axis-label">
                <span>↕ Y</span>
                <input
                  type="number"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={off.yMm}
                  className="floating-input"
                  onChange={(e) => onChange(fc.glyph_index, "y", e.target.value)}
                  aria-label={`'${fc.char}' dot up/down offset`}
                />
                <span>mm</span>
              </label>
              <span className="floating-hint">
                {parseFloat(off.yMm) > 0 ? "↓ down" : parseFloat(off.yMm) < 0 ? "↑ up" : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Convert the UI offset map to the API format. */
export function toFloatingOffsets(map: FloatingOffsetMap): FloatingComponentOffset[] {
  return Object.entries(map)
    .map(([gi, v]) => ({
      glyph_index: parseInt(gi),
      x_offset_mm: parseFloat(v.xMm) || 0,
      y_offset_mm: parseFloat(v.yMm) || 0,
    }))
    .filter((o) => o.x_offset_mm !== 0 || o.y_offset_mm !== 0);
}
