from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageDraw

from .models import CanonicalGeometry, GeometryPath, PathCommand

PNG_SCALE = 8


def export_png(svg: str, geometry: CanonicalGeometry) -> bytes:
    try:
        import cairosvg

        return cairosvg.svg2png(bytestring=svg.encode("utf-8"), background_color="transparent")
    except OSError:
        return _export_png_with_pillow(geometry)


def _export_png_with_pillow(geometry: CanonicalGeometry) -> bytes:
    width = max(1, int(round(geometry.dimensions.width * PNG_SCALE)))
    height = max(1, int(round(geometry.dimensions.height * PNG_SCALE)))
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)

    for path in geometry.paths:
        points = _flatten_path(path)
        if len(points) >= 3:
            draw.polygon([(x * PNG_SCALE, y * PNG_SCALE) for x, y in points], fill=(0, 0, 0, 255))

    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _flatten_path(path: GeometryPath) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    current = (0.0, 0.0)
    start = (0.0, 0.0)

    for command in path.commands:
        if command.type == "M" and command.x is not None and command.y is not None:
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

    return points


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
