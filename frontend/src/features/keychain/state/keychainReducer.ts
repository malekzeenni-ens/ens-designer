import { DEFAULT_DESIGN, type GlyphTransform, type KeychainDesign } from "./keychainTypes";

export type DesignAction =
  | { type: "patch"; value: Partial<KeychainDesign> }
  | { type: "name"; value: string }
  | { type: "preset"; value: "name" | "mini" | "bag" }
  | { type: "replace"; value: KeychainDesign }
  | { type: "glyph"; index: number; value: Partial<GlyphTransform> }
  | { type: "move"; selection: "ring" | number; dx: number; dy: number }
  | { type: "reset-glyph"; index: number };

export function defaultGlyph(index: number): GlyphTransform {
  return { glyph_index: index, dx_mm: 0, dy_mm: 0, scale: 1, rotation_deg: 0 };
}
export function designReducer(state: KeychainDesign, action: DesignAction): KeychainDesign {
  switch (action.type) {
    case "patch": return { ...state, ...action.value };
    case "name":
      if (state.text === action.value) return state;
      // Glyph indices belong to shaped clusters of this name, not the next one.
      return { ...state, text: action.value, glyph_transforms: [], gap_configs: [], dots: { ...state.dots, manual_offsets: [] } };
    case "replace": return structuredClone(action.value);
    case "preset": return {
      ...state, size: { mode: "width", target_mm: action.value === "mini" ? 40 : action.value === "bag" ? 90 : 60 },
      backing: { ...state.backing, offset_mm: action.value === "bag" ? 4 : 3 },
      ring: { ...state.ring, enabled: true, position: "top-left", x_offset_mm: 0, y_offset_mm: 0,
        outer_diameter_mm: action.value === "mini" ? 10 : action.value === "bag" ? 15 : 12,
        hole_diameter_mm: action.value === "mini" ? 4 : action.value === "bag" ? 6 : 5 },
    };
    case "glyph": {
      const value = { ...(state.glyph_transforms.find(item => item.glyph_index === action.index) ?? defaultGlyph(action.index)), ...action.value, glyph_index: action.index };
      return { ...state, glyph_transforms: [...state.glyph_transforms.filter(item => item.glyph_index !== action.index), value] };
    }
    case "move": {
      const bound = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
      if (action.selection === "ring") return { ...state, ring: { ...state.ring,
        x_offset_mm: bound(state.ring.x_offset_mm+action.dx, 100), y_offset_mm: bound(state.ring.y_offset_mm+action.dy, 100) } };
      const current = state.glyph_transforms.find(item => item.glyph_index === action.selection) ?? defaultGlyph(action.selection);
      return designReducer(state, { type: "glyph", index: action.selection,
        value: { dx_mm: bound(current.dx_mm+action.dx, 50), dy_mm: bound(current.dy_mm+action.dy, 50) } });
    }
    case "reset-glyph": return { ...state, glyph_transforms: state.glyph_transforms.filter(item => item.glyph_index !== action.index),
      dots: { ...state.dots, manual_offsets: state.dots.manual_offsets.filter(item => item.glyph_index !== action.index) } };
  }
}
export function designFromRecipe(recipe: Partial<KeychainDesign>): KeychainDesign {
  // Keep recipe/version/transport fields out of editable state.
  return Object.fromEntries(Object.keys(DEFAULT_DESIGN).map(key => [key,
    structuredClone(recipe[key as keyof KeychainDesign] ?? DEFAULT_DESIGN[key as keyof KeychainDesign])])) as unknown as KeychainDesign;
}
