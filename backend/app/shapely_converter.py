from __future__ import annotations

import logging

from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

from .models import GeometryPath, GlyphGeometry, PathCommand

logger = logging.getLogger(__name__)

_QUAD_STEPS = 8
_CUBIC_STEPS = 12
_CONNECTIVITY_TOLERANCE_MM = 0.1


def path_to_shapely(path: GeometryPath) -> Polygon | MultiPolygon | None:
    """
    Convert one canonical path to Shapely geometry.

    A single GeometryPath may contain multiple closed subpaths (M…Z M…Z) —
    for example the outer ring and counter hole of the letter O. Each subpath
    is built as a separate Polygon, then combined via the same outer/hole logic
    used by glyph_to_shapely.
    """
    subpath_coords: list[list[tuple[float, float]]] = []
    current_coords: list[tuple[float, float]] = []
    current = (0.0, 0.0)

    for cmd in path.commands:
        if cmd.type == "M":
            if len(current_coords) >= 3:
                subpath_coords.append(current_coords)
            current_coords = [(cmd.x, cmd.y)]
            current = (cmd.x, cmd.y)
        elif cmd.type == "L":
            current = (cmd.x, cmd.y)
            current_coords.append(current)
        elif cmd.type == "Q":
            p0, p1, p2 = current, (cmd.x1, cmd.y1), (cmd.x, cmd.y)
            for i in range(1, _QUAD_STEPS + 1):
                t = i / _QUAD_STEPS
                current_coords.append((
                    (1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t ** 2 * p2[0],
                    (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t ** 2 * p2[1],
                ))
            current = p2
        elif cmd.type == "C":
            p0, p1, p2, p3 = current, (cmd.x1, cmd.y1), (cmd.x2, cmd.y2), (cmd.x, cmd.y)
            for i in range(1, _CUBIC_STEPS + 1):
                t = i / _CUBIC_STEPS
                current_coords.append((
                    (1 - t) ** 3 * p0[0] + 3 * t * (1 - t) ** 2 * p1[0]
                    + 3 * t ** 2 * (1 - t) * p2[0] + t ** 3 * p3[0],
                    (1 - t) ** 3 * p0[1] + 3 * t * (1 - t) ** 2 * p1[1]
                    + 3 * t ** 2 * (1 - t) * p2[1] + t ** 3 * p3[1],
                ))
            current = p3
        elif cmd.type == "Z":
            if len(current_coords) >= 3:
                subpath_coords.append(current_coords)
            current_coords = []

    if len(current_coords) >= 3:
        subpath_coords.append(current_coords)

    if not subpath_coords:
        return None

    polys: list[Polygon] = []
    for coords in subpath_coords:
        try:
            poly = Polygon(coords).buffer(0)
            if not poly.is_empty and poly.area > 0:
                polys.append(poly)
        except Exception as exc:
            logger.debug("path_to_shapely: dropped one subpath (%s)", exc)

    if not polys:
        return None
    if len(polys) == 1:
        return polys[0]

    # Largest polygon is the outer shell; smaller ones whose centroid lies inside are holes.
    polys_sorted = sorted(polys, key=lambda p: p.area, reverse=True)
    result: Polygon | MultiPolygon = polys_sorted[0]
    for candidate in polys_sorted[1:]:
        try:
            if result.contains(candidate.centroid):
                result = result.difference(candidate)
            else:
                result = result.union(candidate)
        except Exception as exc:
            logger.debug("path_to_shapely: dropped one hole/union candidate (%s)", exc)
    try:
        return result.buffer(0)
    except Exception as exc:
        logger.debug("path_to_shapely: final buffer(0) failed, returning unbuffered result (%s)", exc)
        return result


def glyph_to_shapely(glyph: GlyphGeometry, path_map: dict[str, GeometryPath]) -> Polygon | MultiPolygon | None:
    """Build one Shapely geometry for a glyph, correctly subtracting counter holes (O, e, B…)."""
    polys: list[Polygon] = []
    for pid in glyph.path_ids:
        path = path_map.get(pid)
        if path and path.closed:
            poly = path_to_shapely(path)
            if poly is not None and not poly.is_empty and poly.area > 0:
                polys.append(poly)
    if not polys:
        return None
    if len(polys) == 1:
        return polys[0]

    # Largest area polygon is the outer shell; smaller polygons whose centroid
    # lies inside the shell are counter holes (subtract); others are separate
    # ink components (union — e.g. the dot on 'i').
    polys_sorted = sorted(polys, key=lambda p: p.area, reverse=True)
    result: Polygon | MultiPolygon = polys_sorted[0]
    for candidate in polys_sorted[1:]:
        try:
            if result.contains(candidate.centroid):
                result = result.difference(candidate)
            else:
                result = result.union(candidate)
        except Exception as exc:
            logger.debug("glyph_to_shapely: difference failed (%s), retrying as union", exc)
            try:
                result = result.union(candidate)
            except Exception as union_exc:
                logger.debug("glyph_to_shapely: dropped one candidate (%s)", union_exc)
    try:
        return result.buffer(0)
    except Exception as exc:
        logger.debug("glyph_to_shapely: final buffer(0) failed, returning unbuffered result (%s)", exc)
        return result


def count_connected_components(geometries: list, tolerance: float = _CONNECTIVITY_TOLERANCE_MM) -> int:
    """Count connected glyph groups using union-find over Shapely distance checks."""
    valid = [(i, g) for i, g in enumerate(geometries) if g is not None and not g.is_empty]
    if not valid:
        return 0
    n = len(valid)
    if n == 1:
        return 1

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def merge(x: int, y: int) -> None:
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for a in range(n):
        for b in range(a + 1, n):
            try:
                if valid[a][1].distance(valid[b][1]) <= tolerance:
                    merge(a, b)
            except Exception as exc:
                logger.debug("count_connected_components: distance check failed for a pair (%s)", exc)

    return len({find(i) for i in range(n)})


def shapely_to_paths(geometry: Polygon | MultiPolygon | None, path_id_prefix: str) -> list[GeometryPath]:
    """Convert a Shapely Polygon or MultiPolygon back to canonical GeometryPath objects (L-commands only)."""
    if geometry is None or geometry.is_empty:
        return []

    polygons: list[Polygon]
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
        ext_coords = list(poly.exterior.coords)
        if len(ext_coords) >= 3:
            paths.append(_coords_to_path(ext_coords, f"{path_id_prefix}-{poly_idx:04d}-ext"))
        for hole_idx, interior in enumerate(poly.interiors):
            hole_coords = list(interior.coords)
            if len(hole_coords) >= 3:
                paths.append(_coords_to_path(hole_coords, f"{path_id_prefix}-{poly_idx:04d}-hole-{hole_idx:04d}"))
    return paths


def _coords_to_path(coords: list[tuple[float, float]], path_id: str) -> GeometryPath:
    commands: list[PathCommand] = [PathCommand(type="M", x=round(coords[0][0], 3), y=round(coords[0][1], 3))]
    for x, y in coords[1:]:
        commands.append(PathCommand(type="L", x=round(x, 3), y=round(y, 3)))
    commands.append(PathCommand(type="Z"))
    return GeometryPath(path_id=path_id, commands=commands, closed=True)
