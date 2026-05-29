export interface FontInfo {
  id: string;
  family: string;
  full_name: string;
  style: string;
  source: "project" | "system";
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
  };
  svg: string;
  png_base64: string;
  svg_filename: string;
  png_filename: string;
}
