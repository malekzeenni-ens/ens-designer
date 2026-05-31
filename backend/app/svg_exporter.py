from __future__ import annotations

import svgwrite

from .models import CanonicalGeometry, GeometryPath, PathCommand


def export_svg(geometry: CanonicalGeometry, fill_rule: str = "evenodd") -> str:
    width = geometry.dimensions.width
    height = geometry.dimensions.height
    min_x = geometry.bounds.min_x
    min_y = geometry.bounds.min_y
    drawing = svgwrite.Drawing(size=(f"{width}mm", f"{height}mm"), profile="tiny")
    drawing.viewbox(min_x, min_y, width, height)
    drawing.attribs["xmlns"] = "http://www.w3.org/2000/svg"
    drawing.attribs["version"] = "1.1"

    for path in geometry.paths:
        drawing.add(drawing.path(d=_path_data(path), fill="#000000", stroke="none", fill_rule=fill_rule))

    return drawing.tostring()


def _path_data(path: GeometryPath) -> str:
    return " ".join(_command_data(command) for command in path.commands)


def _command_data(command: PathCommand) -> str:
    if command.type == "M":
        return f"M {command.x} {command.y}"
    if command.type == "L":
        return f"L {command.x} {command.y}"
    if command.type == "Q":
        return f"Q {command.x1} {command.y1} {command.x} {command.y}"
    if command.type == "C":
        return f"C {command.x1} {command.y1} {command.x2} {command.y2} {command.x} {command.y}"
    return "Z"
