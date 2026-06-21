from __future__ import annotations

import logging
from io import BytesIO

from PIL import Image, ImageDraw

from .models import CanonicalGeometry, GeometryPath, PathCommand

logger = logging.getLogger(__name__)

PNG_SCALE = 8


def export_png(svg: str, geometry: CanonicalGeometry) -> bytes:
    try:
        import cairosvg

        return cairosvg.svg2png(bytestring=svg.encode("utf-8"), background_color="transparent")
    except Exception:
        logger.warning("cairosvg rendering failed; falling back to Pillow PNG renderer.", exc_info=True)
        return _export_png_with_pillow(geometry)


def render_paths_png(
    groups: list[tuple[list[GeometryPath], str]],
    width_mm: float,
    height_mm: float,
) -> bytes:
    """Render colored groups of GeometryPath objects to PNG using Pillow.

    Used as the Cairo fallback for engines that do not use CanonicalGeometry
    (e.g. the Cake Topper engine). PNG is preview-only; SVG is the production output.
    """
    width = max(1, int(round(width_mm * PNG_SCALE)))
    height = max(1, int(round(height_mm * PNG_SCALE)))
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    for paths, color in groups:
        rgba = _hex_to_rgba(color)
        for path in paths:
            _draw_path(draw, path, rgba)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _hex_to_rgba(color: str) -> tuple[int, int, int, int]:
    value = color.lstrip("#")
    if len(value) == 6:
        try:
            return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), 255)
        except ValueError:
            pass
    return (0, 0, 0, 255)


def _export_png_with_pillow(geometry: CanonicalGeometry) -> bytes:
    width = max(1, int(round(geometry.dimensions.width * PNG_SCALE)))
    height = max(1, int(round(geometry.dimensions.height * PNG_SCALE)))
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)

    for path in geometry.paths:
        _draw_path(draw, path, (0, 0, 0, 255))

    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _draw_path(
    draw: ImageDraw.ImageDraw,
    path: GeometryPath,
    fill: tuple[int, int, int, int],
) -> None:
    """Draw a GeometryPath that may contain multiple subpaths (outer ring + counter-holes).

    A single GeometryPath for glyphs like 0, 6, 8, 9, O, B contains the outer
    ring as one M…Z subpath and each counter-hole as additional M…Z subpaths.
    The old _flatten_path concatenated all subpaths into one list, producing a
    self-intersecting polygon that Pillow rendered incorrectly (holes filled solid).

    This function:
      1. Splits the path at M…Z boundaries into individual subpath point lists.
      2. Identifies the outer ring as the subpath with the largest bounding-box area.
      3. For each remaining subpath, uses a centroid point-in-polygon test:
         - centroid inside the outer ring  → counter-hole → draw transparent (erase)
         - centroid outside the outer ring → separate component (e.g. dot on 'i') → draw filled
    """
    subpaths = _split_to_subpaths(path)
    if not subpaths:
        return

    if len(subpaths) == 1:
        pts = subpaths[0]
        if len(pts) >= 3:
            draw.polygon([(x * PNG_SCALE, y * PNG_SCALE) for x, y in pts], fill=fill)
        return

    # Largest bounding-box area = outer ring.
    def _bbox_area(pts: list[tuple[float, float]]) -> float:
        if not pts:
            return 0.0
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return (max(xs) - min(xs)) * (max(ys) - min(ys))

    subpaths_by_area = sorted(subpaths, key=_bbox_area, reverse=True)
    outer = subpaths_by_area[0]

    if len(outer) >= 3:
        draw.polygon([(x * PNG_SCALE, y * PNG_SCALE) for x, y in outer], fill=fill)

    for subpath in subpaths_by_area[1:]:
        if len(subpath) < 3:
            continue
        cx, cy = _centroid(subpath)
        if _point_in_polygon((cx, cy), outer):
            # Counter-hole: erase by drawing transparent over the filled outer ring.
            draw.polygon([(x * PNG_SCALE, y * PNG_SCALE) for x, y in subpath], fill=(255, 255, 255, 0))
        else:
            # Separate ink component (e.g. dot on 'i', 'j'): draw filled.
            draw.polygon([(x * PNG_SCALE, y * PNG_SCALE) for x, y in subpath], fill=fill)


def _split_to_subpaths(path: GeometryPath) -> list[list[tuple[float, float]]]:
    """Split a GeometryPath (which may contain multiple M…Z subpaths) into individual point lists."""
    all_subpaths: list[list[tuple[float, float]]] = []
    points: list[tuple[float, float]] = []
    current = (0.0, 0.0)
    start = (0.0, 0.0)

    for command in path.commands:
        if command.type == "M" and command.x is not None and command.y is not None:
            # Flush any open subpath before starting a new one.
            if len(points) >= 3:
                all_subpaths.append(points)
            points = []
            current = (command.x, command.y)
            start = current
            points.append(current)
        elif command.type == "L" and command.x is not None and command.y is not None:
            current = (command.x, command.y)
            points.append(current)
        elif command.type == "Q":
            segment = _quadratic_points(current, command)
            points.extend(segment)
            if command.x is not None and command.y is not None:
                current = (command.x, command.y)
        elif command.type == "C":
            segment = _cubic_points(current, command)
            points.extend(segment)
            if command.x is not None and command.y is not None:
                current = (command.x, command.y)
        elif command.type == "Z":
            points.append(start)
            if len(points) >= 3:
                all_subpaths.append(points)
            points = []

    if len(points) >= 3:
        all_subpaths.append(points)

    return all_subpaths


def _centroid(pts: list[tuple[float, float]]) -> tuple[float, float]:
    n = len(pts)
    return (sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n)


def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    x, y = point
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _quadratic_points(start: tuple[float, float], command: PathCommand) -> list[tuple[float, float]]:
    if None in (command.x1, command.y1, command.x, command.y):
        return []
    points = []
    for step in range(1, 17):
        t = step / 16
        x = ((1 - t) ** 2 * start[0]) + (2 * (1 - t) * t * command.x1) + (t**2 * command.x)
        y = ((1 - t) ** 2 * start[1]) + (2 * (1 - t) * t * command.y1) + (t**2 * command.y)
        points.append((x, y))
    return points


def _cubic_points(start: tuple[float, float], command: PathCommand) -> list[tuple[float, float]]:
    if None in (command.x1, command.y1, command.x2, command.y2, command.x, command.y):
        return []
    points = []
    for step in range(1, 21):
        t = step / 20
        x = (
            ((1 - t) ** 3 * start[0])
            + (3 * (1 - t) ** 2 * t * command.x1)
            + (3 * (1 - t) * t**2 * command.x2)
            + (t**3 * command.x)
        )
        y = (
            ((1 - t) ** 3 * start[1])
            + (3 * (1 - t) ** 2 * t * command.y1)
            + (3 * (1 - t) * t**2 * command.y2)
            + (t**3 * command.y)
        )
        points.append((x, y))
    return points
