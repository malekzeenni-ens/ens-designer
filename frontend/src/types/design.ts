export type OverlapMode = "auto" | "light" | "medium" | "strong" | "custom";

export interface OverlapGapConfig {
  pair_index: number;
  enabled: boolean;
  overlap_mm: number;
}

export interface OverlapResult {
  svg: string;
  png_base64: string;
  svg_filename: string;
  png_filename: string;
  overlap_metadata: {
    mode: string;
    target_overlap_mm: number;
    glyph_chars: string[];
    gaps_before_mm: number[];
    gaps_after_mm: number[];
  };
  dimensions: {
    width: number;
    height: number;
    units: string;
  };
}

export interface BridgeOverride {
  pair_index: number;
  action: "add" | "remove" | "set_width";
  width_mm?: number | null;
}

export interface Preset {
  preset_id: string;
  preset_name: string;
  default_material_id: string;
  description: string;
}

export interface FontInfo {
  id: string;
  family: string;
  full_name: string;
  style: string;
  source: "project" | "system" | "external";
}

export interface MaterialProfile {
  material_id: string;
  material_name: string;
  thickness_mm: number;
  minimum_bridge_width_mm: number;
  minimum_feature_size_mm: number;
  recommended_connection_width_mm: number;
}

export interface GenerateResponse {
  geometry: {
    geometry_id: string;
    source: {
      text: string;
      font_id: string;
      font_name: string;
    };
    dimensions: {
      width: number;
      height: number;
    };
    glyphs: Array<{
      glyph_id: number;
      glyph_name: string;
      cluster: number;
      advance_x: number;
      advance_y: number;
      offset_x: number;
      offset_y: number;
      path_ids: string[];
    }>;
    paths: Array<{ path_id: string; closed: boolean }>;
    material: MaterialProfile | null;
    welding: {
      strategy: "natural" | "compression" | "bridge" | "disconnected";
      enabled: boolean;
      connected_components_before: number;
      connected_components_after: number;
      bridges_added: number;
      bridge_path_ids: string[];
      bridge_candidates_skipped: number;
      compression_amount_mm: number;
    } | null;
    validation: {
      connectivity_score: number;
      structural_score: number;
      production_readiness_score: number;
      warnings: Array<{
        code: string;
        severity: "info" | "warning" | "error";
        message: string;
      }>;
    } | null;
  };
  svg: string;
  png_base64: string;
  svg_filename: string;
  png_filename: string;
}
