from __future__ import annotations

from uuid import uuid4

from .models import (
    Bounds,
    CanonicalGeometry,
    CoordinateSystem,
    Dimensions,
    ExportMetadata,
    FontInfo,
    GeometryPath,
    GeometrySource,
    GlyphGeometry,
)

PADDING_MM = 3.0


def build_geometry(text: str, font: FontInfo, glyphs: list[GlyphGeometry], paths: list[GeometryPath]) -> CanonicalGeometry:
    if not paths:
        raise ValueError("Selected font cannot render the requested text.")

    min_x, min_y, max_x, max_y = _calculate_bounds(paths)
    offset_x = -min_x + PADDING_MM
    offset_y = -min_y + PADDING_MM
    normalised_paths = _translate_paths(paths, offset_x, offset_y)
    width = (max_x - min_x) + (PADDING_MM * 2)
    height = (max_y - min_y) + (PADDING_MM * 2)

    return CanonicalGeometry(
        geometry_id=str(uuid4()),
        source=GeometrySource(text=text, font_id=font.id, font_name=font.full_name),
        coordinate_system=CoordinateSystem(),
        dimensions=Dimensions(width=round(width, 3), height=round(height, 3)),
        glyphs=glyphs,
        paths=normalised_paths,
        bounds=Bounds(min_x=0.0, min_y=0.0, max_x=round(width, 3), max_y=round(height, 3)),
        export_metadata=ExportMetadata(svg_ready=True, png_ready=True),
    )


def _calculate_bounds(paths: list[GeometryPath]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for path in paths:
        for command in path.commands:
            for x_attr, y_attr in (("x", "y"), ("x1", "y1"), ("x2", "y2")):
                x = getattr(command, x_attr)
                y = getattr(command, y_attr)
                if x is not None and y is not None:
                    xs.append(x)
                    ys.append(y)
    if not xs or not ys:
        raise ValueError("Geometry bounds could not be calculated.")
    return min(xs), min(ys), max(xs), max(ys)


def _translate_paths(paths: list[GeometryPath], offset_x: float, offset_y: float) -> list[GeometryPath]:
    translated: list[GeometryPath] = []
    for path in paths:
        commands = []
        for command in path.commands:
            data = command.model_dump()
            for x_key in ("x", "x1", "x2"):
                if data[x_key] is not None:
                    data[x_key] = round(data[x_key] + offset_x, 3)
            for y_key in ("y", "y1", "y2"):
                if data[y_key] is not None:
                    data[y_key] = round(data[y_key] + offset_y, 3)
            commands.append(type(command)(**data))
        translated.append(GeometryPath(path_id=path.path_id, commands=commands, closed=path.closed))
    return translated
