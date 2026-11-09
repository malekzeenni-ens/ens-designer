import type { FloatingComponentOffset, OverlapGapConfig, OverlapMode } from "../../../types/design";

export type Unit = "mm" | "cm" | "in";
export type BBox = [number, number, number, number];
export interface GlyphTransform { glyph_index: number; dx_mm: number; dy_mm: number; scale: number; rotation_deg: number }
export interface KeychainDesign {
  text: string; font_id: string; style: "engraved" | "layered"; material_id: string;
  size: { mode: "width" | "height"; target_mm: number };
  overlap_mode: OverlapMode; overlap_custom_mm: number | null; gap_configs: OverlapGapConfig[];
  letter_spacing_mm: number; glyph_transforms: GlyphTransform[];
  dots: { auto_join: boolean; overlap_pct: number; manual_offsets: FloatingComponentOffset[] };
  stroke_buffer_mm: number;
  backing: { offset_mm: number; fill_counters: boolean; smoothing_mm: number };
  ring: { enabled: boolean; position: "top-left" | "top-center" | "top-right" | "left-middle" | "right-middle" | "custom";
    outer_diameter_mm: number; hole_diameter_mm: number; x_offset_mm: number; y_offset_mm: number;
    auto_snap: boolean; min_wall_thickness_mm: number; min_neck_width_mm: number };
  colors: { backing: string; text: string }; layered_export: "combined" | "separate";
}
export interface KeychainRequest extends KeychainDesign { quality: "preview" | "export"; request_id: number | null }
export interface ProductionCheck {
  id: string; severity: "error" | "warning" | "info" | "pass"; message: string;
  fix: { action: string; field?: string; value?: unknown } | null; highlight_bbox_mm: BBox | null;
}
export interface KeychainResult {
  request_id: number | null; preview_svg: string; files: { filename: string; svg: string }[]; png_base64: string | null;
  width_mm: number; height_mm: number; canvas_width_mm: number; canvas_height_mm: number;
  scale_applied: number; size_solve_converged: boolean;
  glyphs: { glyph_index: number; cluster_text: string; bbox_mm: BBox; has_floating_component: boolean }[];
  ring: { center_x_mm: number; center_y_mm: number; outer_diameter_mm: number; hole_diameter_mm: number;
    wall_thickness_mm: number; neck_width_mm: number; snapped: boolean; touching: boolean; hole_clearance_mm: number } | null;
  checks: ProductionCheck[]; recipe: KeychainRequest & { app_version: string }; timings_ms: Record<string, number>;
}
export interface KeychainHistoryEntry { recipe: KeychainRequest & { app_version: string }; filename: string; width_mm: number; height_mm: number; timestamp: string }

export const DEFAULT_DESIGN: KeychainDesign = {
  text: "", font_id: "", style: "engraved", material_id: "cast-acrylic-3mm",
  size: { mode: "width", target_mm: 60 }, overlap_mode: "auto", overlap_custom_mm: null,
  gap_configs: [], letter_spacing_mm: 0, glyph_transforms: [],
  dots: { auto_join: true, overlap_pct: 25, manual_offsets: [] }, stroke_buffer_mm: 0,
  backing: { offset_mm: 3, fill_counters: true, smoothing_mm: .5 },
  ring: { enabled: true, position: "top-left", outer_diameter_mm: 12, hole_diameter_mm: 5, x_offset_mm: 0,
    y_offset_mm: 0, auto_snap: true, min_wall_thickness_mm: 3, min_neck_width_mm: 5 },
  colors: { backing: "#000000", text: "#FF0000" }, layered_export: "combined",
};
