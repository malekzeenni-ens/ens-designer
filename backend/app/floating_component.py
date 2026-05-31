"""
Floating Component Detector and Offset Applicator

Detects "floating" subpaths within a glyph — dots on 'i' and 'j',
diacritical marks, accent dots — and applies independent X/Y offsets
to them so the user can reposition just the dot without moving the
full letter.

Detection rule: within a multi-subpath GeometryPath, any subpath whose
bounding box does NOT overlap vertically with the largest subpath is
considered a floating component (it floats above or below the main body).
"""
from __future__ import annotations

from .models import GeometryPath, GlyphGeometry, PathCommand


# ---------------------------------------------------------------------------
# Subpath splitting
# ---------------------------------------------------------------------------

def _split_subpaths(commands: list[PathCommand]) -> list[list[PathCommand]]:
    """
    Split a path's command list into individual closed subpaths.
    A new subpath begins when an M command follows a Z command.
    """
    subpaths: list[list[PathCommand]] = []
    current: list[PathCommand] = []
    prev_was_z = False

    for cmd in commands:
        if cmd.type == "M" and prev_was_z and current:
            subpaths.append(current)
            current = [cmd]
            prev_was_z = False
        else:
            if cmd.type == "Z":
                prev_was_z = True
            current.append(cmd)

    if current:
        subpaths.append(current)

    return subpaths


def _bounds(commands: list[PathCommand]) -> tuple[float, float, float, float]:
    """Return (min_x, min_y, max_x, max_y) for a subpath's commands."""
    xs, ys = [], []
    for cmd in commands:
        for xa, ya in (("x", "y"), ("x1", "y1"), ("x2", "y2")):
            x = getattr(cmd, xa, None)
            y = getattr(cmd, ya, None)
            if x is not None and y is not None:
                xs.append(x)
                ys.append(y)
    if not xs:
        return 0.0, 0.0, 0.0, 0.0
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def find_floating_subpath(commands: list[PathCommand]) -> int | None:
    """
    Return the index of a floating subpath (dot/accent) within the path's
    command list, or None if none is detected.

    A subpath is floating if its vertical bounding box does not overlap with
    the largest subpath (the main glyph body).

    In SVG y-down coordinates: the dot sits above the stroke, meaning the
    dot's max_y < stroke's min_y.
    """
    subpaths = _split_subpaths(commands)
    if len(subpaths) < 2:
        return None

    all_bounds = [_bounds(sp) for sp in subpaths]
    areas = [(b[2] - b[0]) * (b[3] - b[1]) for b in all_bounds]
    main_idx = areas.index(max(areas))
    main_min_y, main_max_y = all_bounds[main_idx][1], all_bounds[main_idx][3]

    for i, b in enumerate(all_bounds):
        if i == main_idx:
            continue
        sp_min_y, sp_max_y = b[1], b[3]
        # Floating: no vertical overlap with main body
        if sp_max_y <= main_min_y or sp_min_y >= main_max_y:
            return i

    return None


def detect_floating_components(
    glyphs: list[GlyphGeometry],
    paths: list[GeometryPath],
    glyph_chars: list[str],
) -> list[dict]:
    """
    Return a list of {glyph_index, char, floating_subpath_index} for every
    glyph that has a detectable floating component.
    """
    path_map = {p.path_id: p for p in paths}
    results = []

    for gi, glyph in enumerate(glyphs):
        char = glyph_chars[gi] if gi < len(glyph_chars) else "?"
        for pid in glyph.path_ids:
            path = path_map.get(pid)
            if path is None:
                continue
            idx = find_floating_subpath(path.commands)
            if idx is not None:
                results.append({
                    "glyph_index": gi,
                    "char": char,
                    "floating_subpath_index": idx,
                })
                break  # one floating component per glyph is enough

    return results


# ---------------------------------------------------------------------------
# Offset application
# ---------------------------------------------------------------------------

def apply_floating_offsets(
    paths: list[GeometryPath],
    glyphs: list[GlyphGeometry],
    offsets: list,  # list[FloatingComponentOffset] — avoid circular import
) -> list[GeometryPath]:
    """
    Apply X/Y offsets to the floating subpath of specified glyphs.
    Non-targeted paths are returned unchanged.
    """
    if not offsets:
        return paths

    # Build lookup: glyph_index -> (dx, dy)
    offset_map: dict[int, tuple[float, float]] = {
        o.glyph_index: (o.x_offset_mm, o.y_offset_mm)
        for o in offsets
        if o.x_offset_mm != 0.0 or o.y_offset_mm != 0.0
    }
    if not offset_map:
        return paths

    # Build reverse lookup: path_id -> glyph_index
    pid_to_glyph: dict[str, int] = {}
    for gi, glyph in enumerate(glyphs):
        for pid in glyph.path_ids:
            pid_to_glyph[pid] = gi

    result: list[GeometryPath] = []
    for path in paths:
        gi = pid_to_glyph.get(path.path_id)
        if gi is None or gi not in offset_map:
            result.append(path)
            continue

        dx, dy = offset_map[gi]
        floating_idx = find_floating_subpath(path.commands)
        if floating_idx is None:
            result.append(path)
            continue

        result.append(_apply_to_subpath(path, floating_idx, dx, dy))

    return result


def _apply_to_subpath(path: GeometryPath, floating_idx: int, dx: float, dy: float) -> GeometryPath:
    subpaths = _split_subpaths(path.commands)
    if floating_idx >= len(subpaths):
        return path

    new_commands: list[PathCommand] = []
    for i, sp in enumerate(subpaths):
        if i != floating_idx:
            new_commands.extend(sp)
            continue
        for cmd in sp:
            data = cmd.model_dump()
            for k in ("x", "x1", "x2"):
                if data[k] is not None:
                    data[k] = round(data[k] + dx, 3)
            for k in ("y", "y1", "y2"):
                if data[k] is not None:
                    data[k] = round(data[k] + dy, 3)
            new_commands.append(PathCommand(**data))

    return GeometryPath(path_id=path.path_id, commands=new_commands, closed=path.closed)
