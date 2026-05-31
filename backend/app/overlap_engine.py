"""
Overlap Engine — Phase X

Replicates the manual XCS tracking-reduction workflow:
  enter text → reduce character spacing → letters overlap → export → cut.

This engine does NOT:
  - create bridges
  - run connectivity analysis
  - perform material validation
  - merge geometry (boolean union)

It ONLY shifts glyph x-positions so that adjacent letters overlap by a
controlled amount. The SVG is exported with fill-rule="nonzero" so that
overlapping filled paths render as solid black (not cancelled by evenodd).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path

from .canonical_geometry import build_geometry, recalculate_geometry_bounds
from .font_loader import FontCatalog
from .models import (
    GeometryPath,
    OverlapMetadata,
    OverlapRequest,
    OverlapResponse,
    PathCommand,
)
from .outline_extractor import extract_outlines
from .png_exporter import export_png
from .svg_exporter import export_svg
from .text_shaper import shape_text
from .unicode_normalisation import normalise_text

logger = logging.getLogger(__name__)

# Target overlap in mm for each named mode.
_MODE_OVERLAP_MM: dict[str, float] = {
    "auto":   1.0,
    "light":  0.5,
    "medium": 1.5,
    "strong": 2.5,
}


@dataclass
class OverlapService:
    project_root: Path
    font_catalog: FontCatalog

    def generate(self, request: OverlapRequest) -> OverlapResponse:
        normalised = normalise_text(request.text)
        font_path = self.font_catalog.get_font_path(request.font_id)
        font_info = self.font_catalog.get_font_info(request.font_id)
        shaped = shape_text(normalised, font_path)
        glyphs, paths = extract_outlines(font_path, shaped)
        geometry = build_geometry(normalised, font_info, glyphs, paths)

        # Determine target overlap amount.
        if request.overlap_mode == "custom" and request.overlap_custom_mm is not None:
            target_overlap = float(request.overlap_custom_mm)
        else:
            target_overlap = _MODE_OVERLAP_MM.get(request.overlap_mode, 1.0)

        logger.debug(
            "Overlap engine: text=%r  mode=%s  target_overlap=%.2f mm",
            normalised, request.overlap_mode, target_overlap,
        )

        # Compute per-pair gaps and shifts.
        gaps_before = _bbox_gaps(geometry.glyphs, geometry.paths)
        shifts = _compute_shifts(gaps_before, target_overlap)
        gaps_after = [g - s for g, s in zip(gaps_before, _pair_shifts(gaps_before, target_overlap))]

        logger.debug("Gaps before: %s", [round(g, 3) for g in gaps_before])
        logger.debug("Gaps after:  %s", [round(g, 3) for g in gaps_after])

        # Apply shifts to path coordinates.
        glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]
        shifted_paths = _shift_paths(geometry.paths, glyph_path_ids, shifts)
        geometry = geometry.model_copy(update={"paths": shifted_paths}, deep=True)
        geometry = recalculate_geometry_bounds(geometry)

        # Export — fill-rule="nonzero" so overlapping letters stay solid.
        svg = export_svg(geometry, fill_rule="nonzero")
        png = export_png(svg, geometry)

        import base64
        base_name = _safe_filename(normalised)
        return OverlapResponse(
            svg=svg,
            png_base64=base64.b64encode(png).decode("ascii"),
            svg_filename=f"{base_name}.svg",
            png_filename=f"{base_name}.png",
            overlap_metadata=OverlapMetadata(
                mode=request.overlap_mode,
                target_overlap_mm=round(target_overlap, 3),
                gaps_before_mm=[round(g, 3) for g in gaps_before],
                gaps_after_mm=[round(g, 3) for g in gaps_after],
            ),
            dimensions={
                "width": geometry.dimensions.width,
                "height": geometry.dimensions.height,
                "units": "mm",
            },
        )


# ---------------------------------------------------------------------------
# Algorithm helpers
# ---------------------------------------------------------------------------

def _bbox_gaps(glyphs, paths) -> list[float]:
    """Bounding-box x-gap for each adjacent glyph pair. Positive = gap, negative = overlap."""
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


def _pair_shifts(gaps: list[float], target_overlap: float) -> list[float]:
    """Per-pair shift: close gap and add target_overlap. Leave already-sufficient overlaps alone."""
    result = []
    for gap in gaps:
        # If the current gap is already more overlap than needed, don't compress.
        if gap <= -target_overlap:
            result.append(0.0)
        else:
            result.append(gap + target_overlap)
    return result


def _compute_shifts(gaps: list[float], target_overlap: float) -> list[float]:
    """Cumulative per-glyph leftward shift. Glyph 0 always stays at position 0."""
    pair_s = _pair_shifts(gaps, target_overlap)
    n_glyphs = len(gaps) + 1
    cumulative = [0.0] * n_glyphs
    for i, ps in enumerate(pair_s):
        for j in range(i + 1, n_glyphs):
            cumulative[j] += ps
    return cumulative


def _shift_paths(paths: list[GeometryPath], glyph_path_ids: list[list[str]], shifts: list[float]) -> list[GeometryPath]:
    pid_to_shift: dict[str, float] = {}
    for glyph_index, pid_group in enumerate(glyph_path_ids):
        s = shifts[glyph_index]
        for pid in pid_group:
            pid_to_shift[pid] = s

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


def _safe_filename(text: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", text.strip()).strip("-").lower()
    return value or "design"
