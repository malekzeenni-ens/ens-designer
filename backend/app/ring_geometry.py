"""Shared ring and compound-path helpers, extracted without geometry changes."""
from __future__ import annotations

import logging
import math

from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from .models import CakeTopperRequest, CakeTopperRingMetadata, GeometryPath, PathCommand
from .shapely_converter import path_to_shapely

logger = logging.getLogger(__name__)
MIN_RING_OVERLAP_MM = 4.0


def _buffer_line_paths(
    paths: list[GeometryPath], buffer_mm: float, prefix: str
) -> tuple[list[GeometryPath], str | None]:
    """Union one line's glyph paths and grow them outward by buffer_mm, to reinforce
    thin strokes (e.g. script fonts) before cutting. Falls back to the original
    paths if the geometry can't be combined or the result is empty, returning a
    warning message describing why the buffer had no effect."""
    polygons = []
    for path in paths:
        if not path.closed:
            continue
        poly = path_to_shapely(path)
        if poly is not None and not poly.is_empty and poly.area > 0:
            polygons.append(poly)
    if not polygons:
        return paths, "stroke buffer skipped: no closed shapes to buffer."

    try:
        combined = unary_union(polygons)
        grown = combined.buffer(buffer_mm, join_style="round")
    except Exception:
        logger.warning("Stroke buffer failed for line; keeping unbuffered strokes.", exc_info=True)
        return paths, "stroke buffer skipped: geometry could not be combined."
    if grown.is_empty:
        return paths, "stroke buffer skipped: result was empty."

    buffered = _compound_paths_from_shapely(grown, prefix)
    if not buffered:
        return paths, "stroke buffer skipped: result could not be converted to paths."
    return buffered, None


def _apply_ring_to_base(
    request: CakeTopperRequest,
    base_geometry,
    line_paths: list[GeometryPath],
) -> tuple[object, CakeTopperRingMetadata, list[str]]:
    cfg = request.ring_config
    outer_radius = cfg.outer_diameter_mm / 2.0
    hole_radius = cfg.hole_diameter_mm / 2.0
    wall_thickness = (cfg.outer_diameter_mm - cfg.hole_diameter_mm) / 2.0
    warnings = _ring_validation_warnings(cfg, wall_thickness)

    min_x, min_y, max_x, _ = base_geometry.bounds
    if cfg.position == "top-center":
        center_x = (min_x + max_x) / 2.0
    elif cfg.position == "top-right":
        center_x = max_x - outer_radius
    elif cfg.position == "custom":
        center_x = min_x + outer_radius
    else:
        center_x = min_x + outer_radius
    center_y = min_y + cfg.overlap_mm - outer_radius
    center_x += cfg.x_offset_mm
    center_y += cfg.y_offset_mm

    ring_outer = Point(center_x, center_y).buffer(outer_radius, quad_segs=64)
    ring_hole = Point(center_x, center_y).buffer(hole_radius, quad_segs=64)
    neck_width = _approximate_ring_neck_width(outer_radius, cfg.overlap_mm)

    if neck_width is not None and neck_width < cfg.min_neck_width_mm:
        warnings.append(
            "Ring connection to the backing may be too weak. Increase overlap or move the ring closer to the design body."
        )

    try:
        overlap_area = ring_outer.intersection(base_geometry).area
    except Exception as exc:
        logger.warning("Ring/base overlap-area check failed; treating as no overlap. (%s)", exc)
        overlap_area = 0.0
    if overlap_area <= 0:
        warnings.append(
            "Ring/keyhole is not touching the backing layer. Move it closer to the design body."
        )
        metadata = _ring_metadata(
            cfg.position,
            center_x,
            center_y,
            cfg.outer_diameter_mm,
            cfg.hole_diameter_mm,
            cfg.x_offset_mm,
            cfg.y_offset_mm,
            wall_thickness,
            neck_width,
            warnings,
        )
        return base_geometry, metadata, warnings

    try:
        with_tab = unary_union([base_geometry, ring_outer]).buffer(0)
        with_hole = with_tab.difference(ring_hole).buffer(0)
    except Exception as exc:
        logger.warning("Ring/keyhole geometry generation failed. (%s)", exc)
        warnings.append("Ring/keyhole geometry could not be generated. Try a different position or size.")
        metadata = _ring_metadata(
            cfg.position,
            center_x,
            center_y,
            cfg.outer_diameter_mm,
            cfg.hole_diameter_mm,
            cfg.x_offset_mm,
            cfg.y_offset_mm,
            wall_thickness,
            neck_width,
            warnings,
        )
        return base_geometry, metadata, warnings

    line_geometry = _paths_union(line_paths)
    if line_geometry is not None:
        try:
            if ring_hole.intersects(line_geometry):
                warnings.append("Ring hole may be too close to the text. Move the ring or increase the outline offset.")
        except Exception as exc:
            logger.warning("Ring/text proximity check failed; skipping the check. (%s)", exc)

    metadata = _ring_metadata(
        cfg.position,
        center_x,
        center_y,
        cfg.outer_diameter_mm,
        cfg.hole_diameter_mm,
        cfg.x_offset_mm,
        cfg.y_offset_mm,
        wall_thickness,
        neck_width,
        warnings,
    )
    return with_hole, metadata, warnings


def _disabled_ring_metadata(request: CakeTopperRequest) -> tuple[CakeTopperRingMetadata, list[str]]:
    cfg = request.ring_config
    wall_thickness = (cfg.outer_diameter_mm - cfg.hole_diameter_mm) / 2.0
    warnings = _ring_validation_warnings(cfg, wall_thickness)
    metadata = _ring_metadata(
        cfg.position,
        0.0,
        0.0,
        cfg.outer_diameter_mm,
        cfg.hole_diameter_mm,
        cfg.x_offset_mm,
        cfg.y_offset_mm,
        wall_thickness,
        _approximate_ring_neck_width(cfg.outer_diameter_mm / 2.0, cfg.overlap_mm),
        warnings,
    )
    return metadata, warnings


def _ring_validation_warnings(cfg, wall_thickness: float) -> list[str]:
    warnings: list[str] = []
    if wall_thickness < cfg.min_wall_thickness_mm:
        warnings.append(
            "Ring wall thickness is below 3 mm. Increase the outer diameter or reduce the hole diameter."
        )
    if cfg.overlap_mm < MIN_RING_OVERLAP_MM:
        warnings.append(
            "Ring connection to the backing may be too weak. Increase overlap or move the ring closer to the design body."
        )
    return warnings


def _ring_metadata(
    position: str,
    center_x: float,
    center_y: float,
    outer_diameter: float,
    hole_diameter: float,
    x_offset: float,
    y_offset: float,
    wall_thickness: float,
    neck_width: float | None,
    warnings: list[str],
) -> CakeTopperRingMetadata:
    return CakeTopperRingMetadata(
        enabled=True,
        position=position,
        center_x_mm=round(center_x, 3),
        center_y_mm=round(center_y, 3),
        outer_diameter_mm=round(outer_diameter, 3),
        hole_diameter_mm=round(hole_diameter, 3),
        outer_radius_mm=round(outer_diameter / 2.0, 3),
        hole_radius_mm=round(hole_diameter / 2.0, 3),
        x_offset_mm=round(x_offset, 3),
        y_offset_mm=round(y_offset, 3),
        wall_thickness_mm=round(wall_thickness, 3),
        neck_width_mm=round(neck_width, 3) if neck_width is not None else None,
        is_valid=len(warnings) == 0,
        warnings=warnings,
    )


def _approximate_ring_neck_width(outer_radius: float, overlap: float) -> float | None:
    if overlap <= 0 or outer_radius <= 0:
        return None
    clamped_overlap = min(overlap, outer_radius * 2.0)
    distance_from_center = outer_radius - clamped_overlap
    value = outer_radius**2 - distance_from_center**2
    if value < 0:
        return None
    return 2.0 * math.sqrt(value)


def _paths_union(paths: list[GeometryPath]):
    polygons = []
    for path in paths:
        if not path.closed:
            continue
        poly = path_to_shapely(path)
        if poly is not None and not poly.is_empty and poly.area > 0:
            polygons.append(poly)
    if not polygons:
        return None
    try:
        return unary_union(polygons).buffer(0)
    except Exception:
        return None


def _compound_paths_from_shapely(geometry, path_id_prefix: str) -> list[GeometryPath]:
    if geometry is None or geometry.is_empty:
        return []
    if isinstance(geometry, Polygon):
        polygons = [geometry]
    elif isinstance(geometry, MultiPolygon):
        polygons = list(geometry.geoms)
    else:
        return []

    paths: list[GeometryPath] = []
    for poly_idx, poly in enumerate(polygons):
        if poly.is_empty:
            continue
        oriented = orient(poly, sign=1.0)
        commands: list[PathCommand] = []
        _append_ring_commands(commands, list(oriented.exterior.coords))
        for interior in oriented.interiors:
            _append_ring_commands(commands, list(interior.coords))
        if commands:
            paths.append(GeometryPath(
                path_id=f"{path_id_prefix}-{poly_idx:04d}",
                commands=commands,
                closed=True,
            ))
    return paths


def _append_ring_commands(commands: list[PathCommand], coords: list[tuple[float, float]]) -> None:
    if len(coords) < 3:
        return
    commands.append(PathCommand(type="M", x=round(coords[0][0], 3), y=round(coords[0][1], 3)))
    for x, y in coords[1:]:
        commands.append(PathCommand(type="L", x=round(x, 3), y=round(y, 3)))
    commands.append(PathCommand(type="Z"))
