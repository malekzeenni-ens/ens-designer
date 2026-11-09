"""Pure production checks over final physical geometry."""
from __future__ import annotations

import math

from .material_profiles import get_material
from .models import KeychainCheck, KeychainRequest, KeychainRingMetadata


def polygon_parts(geometry):
    return list(geometry.geoms) if geometry.geom_type == "MultiPolygon" else [geometry]


def opening_loss(geometry, width: float) -> float:
    opened = geometry.buffer(-width / 2).buffer(width / 2)
    return geometry.difference(opened).area


def validate_keychain(request: KeychainRequest, backing, text, ring: KeychainRingMetadata | None,
                      converged: bool, minimum_mm: float, missing: list[str]) -> list[KeychainCheck]:
    checks = []

    def check(identifier, passed, severity, message, fix=None, bounds=None):
        checks.append(KeychainCheck(id=identifier, severity="pass" if passed else severity,
                                    message=message, fix=None if passed else fix,
                                    highlight_bbox_mm=None if passed else bounds))

    single = len(polygon_parts(backing)) == 1
    merge_fix = None
    if not single:
        if ring is not None and not ring.touching:
            merge_fix = {"action": "snap_ring"}
        else:
            offset = math.ceil(request.backing.offset_mm * 2) / 2
            while offset <= 10:
                if len(polygon_parts(text.buffer(offset))) == 1:
                    merge_fix = {"action": "set", "field": "backing.offset_mm", "value": offset}
                    break
                offset += .5
    check("KC-BACKING-SINGLE-PIECE", single, "error",
          "Backing is one piece." if single else "Backing has disconnected pieces. Increase offset or reduce spacing.",
          merge_fix, backing.bounds)
    minimum_ok = request.size.target_mm >= minimum_mm - .05
    minimum_fix = {"action": "set", "field": "size.target_mm", "value": math.ceil(minimum_mm * 10) / 10}
    limit = 200 if request.size.mode == "width" else 100
    check("KC-SIZE-MIN", minimum_ok, "error",
          "Target is above the minimum size." if minimum_ok else f"Minimum size for this name is {minimum_mm:.1f} mm.",
          minimum_fix if minimum_fix["value"] <= limit else None, backing.bounds)
    if ring is not None:
        cfg = request.ring
        bounds = (ring.center_x_mm-cfg.outer_diameter_mm/2, ring.center_y_mm-cfg.outer_diameter_mm/2,
                  ring.center_x_mm+cfg.outer_diameter_mm/2, ring.center_y_mm+cfg.outer_diameter_mm/2)
        required_outer = cfg.hole_diameter_mm + 2 * cfg.min_wall_thickness_mm
        wall_fix = ({"action": "set", "field": "ring.outer_diameter_mm", "value": required_outer}
                    if required_outer <= 15 else None)
        check("KC-RING-WALL", ring.wall_thickness_mm >= cfg.min_wall_thickness_mm, "warning",
              f"Ring wall is {ring.wall_thickness_mm:.2f} mm; required {cfg.min_wall_thickness_mm:g} mm.", wall_fix, bounds)
        check("KC-RING-NECK", ring.neck_width_mm >= cfg.min_neck_width_mm - .01, "warning",
              f"Ring neck is {ring.neck_width_mm:.2f} mm; required {cfg.min_neck_width_mm:g} mm.", {"action": "snap_ring"}, bounds)
        check("KC-RING-TOUCH", ring.touching, "error",
              "Ring touches the backing." if ring.touching else "Ring is disconnected from the backing.",
              {"action": "snap_ring"}, bounds)
        check("KC-HOLE-CLEARANCE", ring.hole_clearance_mm >= 1, "warning",
              f"Hole-to-text clearance is {ring.hole_clearance_mm:.2f} mm; recommended 1 mm.", {"action": "snap_ring"}, bounds)
    feature = get_material(request.material_id).minimum_feature_size_mm
    check("KC-BACKING-MIN-FEATURE", opening_loss(backing, feature) <= .5, "warning",
          f"Backing minimum feature check ({feature:g} mm).",
          {"action": "set", "field": "backing.smoothing_mm", "value": min(3, request.backing.smoothing_mm + .5)}, backing.bounds)
    if request.style == "layered":
        check("KC-TEXT-FLOATING-PARTS", all(part.area >= 4 for part in polygon_parts(text)), "warning",
              "Text pieces should each have at least 4 mm² area.",
              {"action": "set", "field": "dots.auto_join", "value": True}, text.bounds)
        check("KC-TEXT-MIN-STROKE", opening_loss(text, feature) <= .5, "warning",
              f"Text minimum stroke check ({feature:g} mm).",
              {"action": "set", "field": "stroke_buffer_mm", "value": max(.3, request.stroke_buffer_mm)}, text.bounds)
    check("KC-MISSING-GLYPHS", not missing, "warning",
          "All characters are supported." if not missing else f"Font is missing: {', '.join(missing)}.",
          {"action": "filter_fonts_supporting_text"})
    check("KC-SIZE-CONVERGED", converged, "warning", "Target size reached." if converged else "Requested size could not be reached within 0.05 mm.")
    return checks
