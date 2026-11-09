import type { KeychainRequest, KeychainResult } from "../state/keychainTypes";
import { DEFAULT_DESIGN } from "../state/keychainTypes";
import { toRequest } from "../utils/units";
export const request = (text = "Sarah") => toRequest({ ...DEFAULT_DESIGN, text, font_id: "anton" });
export function result(payload: KeychainRequest = request()): KeychainResult {
  return { request_id: payload.request_id, preview_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24"><g id="CUT_BACKING"><path d="M2 2H62V22H2Z"/></g><g id="ENGRAVE_TEXT"><path d="M10 10H40V15H10Z"/></g></svg>`,
    files: [{ filename: "sarah-keychain-60mm.svg", svg: "<svg/>" }], png_base64: "iVBORw==",
    width_mm: 60, height_mm: 20, canvas_width_mm: 64, canvas_height_mm: 24, scale_applied: .5, size_solve_converged: true,
    glyphs: [...payload.text].map((char, index) => ({ glyph_index: index, cluster_text: char, bbox_mm: [10+index*8, 7, 18+index*8, 17], has_floating_component: char === "i" })),
    ring: { center_x_mm: 8, center_y_mm: 8, outer_diameter_mm: 12, hole_diameter_mm: 5, wall_thickness_mm: 3.5, neck_width_mm: 6, snapped: false, touching: true, hole_clearance_mm: 2 },
    checks: [{ id: "KC-SIZE-CONVERGED", severity: "pass", message: "Target size reached.", fix: null, highlight_bbox_mm: null }],
    recipe: { ...payload, app_version: "keychain-1" }, timings_ms: {},
  };
}
