"""Pure production checks over final physical geometry."""
from __future__ import annotations

import math

from shapely.geometry import Point

from .material_profiles import get_material
from .models import KeychainCheck, KeychainRequest, KeychainRingMetadata


def polygon_parts(geometry):
    return list(geometry.geoms) if geometry.geom_type == "MultiPolygon" else [geometry]


def opening_loss(geometry, width: float) -> float:
    opened = geometry.buffer(-width / 2).buffer(width / 2)
    return geometry.difference(opened).area


def ring_snap_fix(cfg):
    """A snap fix that changes something, or None when snapping is already active at the preset."""
    if not cfg.auto_snap:
        return {"action": "snap_ring", "value": {"auto_snap": True}}
    if cfg.x_offset_mm or cfg.y_offset_mm:
        return {"action": "snap_ring", "value": {"auto_snap": True, "x_offset_mm": 0, "y_offset_mm": 0}}
    return None


def validate_keychain(request: KeychainRequest, backing, text, ring: KeychainRingMetadata | None,
                      converged: bool, minimum_mm: float, missing: list[str]) -> list[KeychainCheck]:
    """Production checks whose fixes never repeat the current value.

    A fix is only a suggestion: clients must preview the changed recipe and
    read the resulting check rather than assume success. When no automatic
    change can help, ``fix`` is None and ``fix_note`` explains what to change.
    """
    checks = []

    def check(identifier, passed, severity, message, fix=None, bounds=None, note=None):
        checks.append(KeychainCheck(id=identifier, severity="pass" if passed else severity,
                                    message=message, fix=None if passed else fix,
                                    highlight_bbox_mm=None if passed else bounds,
                                    fix_note=None if passed else note))

    snap = ring_snap_fix(request.ring) if ring is not None else None
    single = len(polygon_parts(backing)) == 1
    merge_fix, merge_note = None, None
    if not single:
        if ring is not None and not ring.touching and snap is not None:
            merge_fix = snap
        else:
            offset = math.floor(request.backing.offset_mm * 2) / 2 + .5
            while offset <= 10:
                if len(polygon_parts(text.buffer(offset))) == 1:
                    merge_fix = {"action": "set", "field": "backing.offset_mm", "value": offset}
                    break
                offset += .5
            if merge_fix is None:
                merge_note = ("No backing offset up to 10 mm joins every piece. Reduce letter spacing, "
                              "use a stronger overlap or move separated letters closer.")
    check("KC-BACKING-SINGLE-PIECE", single, "error",
          "Backing is one piece." if single else "Backing has disconnected pieces. Increase offset or reduce spacing.",
          merge_fix, backing.bounds, merge_note)

    minimum_ok = request.size.target_mm >= minimum_mm - .05
    limit = 200 if request.size.mode == "width" else 100
    minimum_value = math.ceil(minimum_mm * 10) / 10
    minimum_possible = minimum_value <= limit
    check("KC-SIZE-MIN", minimum_ok, "error",
          "Target is above the minimum size." if minimum_ok else f"Minimum size for this name is {minimum_mm:.1f} mm.",
          {"action": "set", "field": "size.target_mm", "value": minimum_value} if minimum_possible else None,
          backing.bounds, None if minimum_possible else
          f"The smallest achievable {request.size.mode} exceeds the {limit} mm limit. "
          "Reduce the ring, backing offset or letter edits.")

    if ring is not None:
        cfg = request.ring
        bounds = (ring.center_x_mm-cfg.outer_diameter_mm/2, ring.center_y_mm-cfg.outer_diameter_mm/2,
                  ring.center_x_mm+cfg.outer_diameter_mm/2, ring.center_y_mm+cfg.outer_diameter_mm/2)
        required_outer = round(cfg.hole_diameter_mm + 2 * cfg.min_wall_thickness_mm, 3)
        allowed_hole = round(cfg.outer_diameter_mm - 2 * cfg.min_wall_thickness_mm, 3)
        wall_fix, wall_note = None, None
        if cfg.outer_diameter_mm < required_outer <= 15:
            wall_fix = {"action": "set", "field": "ring.outer_diameter_mm", "value": required_outer}
        elif 4 <= allowed_hole < cfg.hole_diameter_mm:
            wall_fix = {"action": "set", "field": "ring.hole_diameter_mm", "value": allowed_hole}
        else:
            wall_note = "No allowed outer/hole diameter gives this wall thickness. Use a larger ring or smaller hole."
        check("KC-RING-WALL", ring.wall_thickness_mm >= cfg.min_wall_thickness_mm, "warning",
              f"Ring wall is {ring.wall_thickness_mm:.2f} mm; required {cfg.min_wall_thickness_mm:g} mm.",
              wall_fix, bounds, wall_note)

        neck_note = None
        if snap is None:
            neck_note = ("Auto-snap is already on at the preset position and could not reach the required neck. "
                         "Try another ring position, a larger outer diameter or a larger backing offset.")
            if cfg.min_neck_width_mm > cfg.outer_diameter_mm:
                neck_note = "The required neck is wider than the ring itself. Increase the ring diameter."
        check("KC-RING-NECK", ring.neck_width_mm >= cfg.min_neck_width_mm - .01, "warning",
              f"Ring neck is {ring.neck_width_mm:.2f} mm; required {cfg.min_neck_width_mm:g} mm.", snap, bounds, neck_note)
        check("KC-RING-TOUCH", ring.touching, "error",
              "Ring touches the backing." if ring.touching else "Ring is disconnected from the backing.",
              snap, bounds, None if snap else "Auto-snap is on but could not reach the backing. Choose another ring position.")

        # Snapping alone does not move a ring away from text. Growing the
        # backing moves its edge, and the ring positioned from it, outward.
        # A ring the user dragged into the text is returned to its preset first.
        # Otherwise use signed clearance: an overlapping hole reports 0 mm, so
        # measure how deep the hole reaches into the text before sizing growth.
        clearance_fix, clearance_note = None, None
        centre = Point(ring.center_x_mm, ring.center_y_mm)
        inside = text.covers(centre) if not text.is_empty else False
        signed = (-centre.distance(text.boundary) if inside else centre.distance(text)) - cfg.hole_diameter_mm / 2
        offset = math.ceil((request.backing.offset_mm + max(0, 1 - signed) + .05) * 2) / 2
        if cfg.x_offset_mm or cfg.y_offset_mm:
            clearance_fix = {"action": "snap_ring", "value": {"auto_snap": True, "x_offset_mm": 0, "y_offset_mm": 0}}
        elif offset <= 10:
            clearance_fix = {"action": "set", "field": "backing.offset_mm", "value": offset}
        else:
            clearance_note = "The backing offset is at its maximum. Move the ring away from the text or choose another position."
        check("KC-HOLE-CLEARANCE", ring.hole_clearance_mm >= 1, "warning",
              f"Hole-to-text clearance is {ring.hole_clearance_mm:.2f} mm; recommended 1 mm.",
              clearance_fix, bounds, clearance_note)

    feature = get_material(request.material_id).minimum_feature_size_mm
    smoothing = min(3, request.backing.smoothing_mm + .5)
    can_smooth = smoothing > request.backing.smoothing_mm
    check("KC-BACKING-MIN-FEATURE", opening_loss(backing, feature) <= .5, "warning",
          f"Backing minimum feature check ({feature:g} mm).",
          {"action": "set", "field": "backing.smoothing_mm", "value": smoothing} if can_smooth else None,
          backing.bounds, None if can_smooth else
          "Smoothing is at its maximum. Increase the backing offset or choose a bolder font.")

    if request.style == "layered":
        joined = request.dots.auto_join
        check("KC-TEXT-FLOATING-PARTS", all(part.area >= 4 for part in polygon_parts(text)), "warning",
              "Text pieces should each have at least 4 mm² area.",
              None if joined else {"action": "set", "field": "dots.auto_join", "value": True}, text.bounds,
              "Dots are already joined. Remaining small pieces are independent marks; move them in Letter inspector, "
              "enlarge the design or choose a bolder font." if joined else None)
        stroke = round(min(.6, max(.3, request.stroke_buffer_mm + .1)), 3)
        can_reinforce = stroke > request.stroke_buffer_mm
        check("KC-TEXT-MIN-STROKE", opening_loss(text, feature) <= .5, "warning",
              f"Text minimum stroke check ({feature:g} mm).",
              {"action": "set", "field": "stroke_buffer_mm", "value": stroke} if can_reinforce else None,
              text.bounds, None if can_reinforce else
              "Stroke reinforcement is at its maximum. Enlarge the design or choose a bolder font.")

    check("KC-MISSING-GLYPHS", not missing, "warning",
          "All characters are supported." if not missing else f"Font is missing: {', '.join(missing)}.",
          {"action": "filter_fonts_supporting_text"}, None,
          "Shows only fonts that contain every character. Your name is kept until you choose one.")

    axis = 0 if request.size.mode == "width" else 1
    achieved = backing.bounds[axis+2] - backing.bounds[axis]
    check("KC-SIZE-CONVERGED", converged, "warning",
          "Target size reached." if converged else
          f"Requested {request.size.mode} {request.size.target_mm:g} mm could not be reached; achieved {achieved:.2f} mm.",
          None, None, "Letter edits or the ring limit the achievable size. Reset large letter offsets or change the target.")
    return checks
