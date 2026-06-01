"""
Shared overlap algorithm helpers.

Used by OverlapService (overlap_engine.py) and CakeTopperService
(cake_topper_engine.py). Extracted here to eliminate duplication.
"""
from __future__ import annotations

import re
import unicodedata

from .models import GeometryPath, GlyphGeometry, OverlapGapConfig, PathCommand


def _bbox_gaps(glyphs: list[GlyphGeometry], paths: list[GeometryPath]) -> list[float]:
    """Bounding-box gap per adjacent glyph pair. Positive = gap, negative = overlap."""
    path_map = {p.path_id: p for p in paths}
    ranges: list[tuple[float, float] | None] = []
    for glyph in glyphs:
        xs: list[float] = []
        for pid in glyph.path_ids:
            path = path_map.get(pid)
            if path:
                for cmd in path.commands:
                    for attr in ("x", "x1", "x2"):
                        v = getattr(cmd, attr, None)
                        if v is not None:
                            xs.append(v)
        ranges.append((min(xs), max(xs)) if xs else None)

    gaps = []
    for i in range(len(ranges) - 1):
        left, right = ranges[i], ranges[i + 1]
        gaps.append((right[0] - left[1]) if left and right else 0.0)
    return gaps


def _pair_shifts(
    gaps: list[float],
    default_overlap: float,
    config_map: dict[int, OverlapGapConfig],
) -> list[float]:
    """
    Per-pair shift amount.

    Priority:
    1. If a gap_config exists for this pair and enabled=False → shift = 0 (skip)
    2. If a gap_config exists and enabled=True → use config.overlap_mm as target
    3. Otherwise → use default_overlap

    Pairs already overlapping more than the target receive no additional compression.
    """
    result = []
    for i, gap in enumerate(gaps):
        cfg = config_map.get(i)
        if cfg is not None and not cfg.enabled:
            result.append(0.0)
            continue
        target = cfg.overlap_mm if cfg is not None else default_overlap
        result.append(0.0 if gap <= -target else gap + target)
    return result


def _cumulative(pair_shifts: list[float], n_glyphs: int) -> list[float]:
    """Convert per-pair shifts to cumulative per-glyph leftward shifts."""
    shifts = [0.0] * n_glyphs
    for i, ps in enumerate(pair_shifts):
        for j in range(i + 1, n_glyphs):
            shifts[j] += ps
    return shifts


def _shift_paths(
    paths: list[GeometryPath],
    glyph_path_ids: list[list[str]],
    shifts: list[float],
) -> list[GeometryPath]:
    """Apply cumulative per-glyph x-shifts to the corresponding path coordinates."""
    pid_to_shift: dict[str, float] = {
        pid: shifts[idx]
        for idx, group in enumerate(glyph_path_ids)
        for pid in group
    }
    result: list[GeometryPath] = []
    for path in paths:
        s = pid_to_shift.get(path.path_id, 0.0)
        if s == 0.0:
            result.append(path)
            continue
        new_cmds: list[PathCommand] = []
        for cmd in path.commands:
            data = cmd.model_dump()
            for k in ("x", "x1", "x2"):
                if data[k] is not None:
                    data[k] = round(data[k] - s, 3)
            new_cmds.append(PathCommand(**data))
        result.append(GeometryPath(path_id=path.path_id, commands=new_cmds, closed=path.closed))
    return result


def _extract_chars(text: str, n_glyphs: int) -> list[str]:
    """
    Return one display character per glyph position.
    Uses NFC-normalised grapheme clusters. Falls back gracefully
    if glyph count differs from character count (ligatures etc.).
    """
    chars = list(unicodedata.normalize("NFC", text))
    if len(chars) == n_glyphs:
        return chars
    if len(chars) < n_glyphs:
        return chars + ["?"] * (n_glyphs - len(chars))
    return chars[:n_glyphs]


def _safe_filename(text: str) -> str:
    """Sanitise text into a safe lowercase filename stem."""
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", text.strip()).strip("-").lower()
    return value or "design"
