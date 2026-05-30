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
    material: MaterialProfile | null;
    welding: {
      enabled: boolean;
      connected_components_before: number;
      connected_components_after: number;
      bridges_added: number;
      bridge_path_ids: string[];
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
