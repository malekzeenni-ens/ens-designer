"""
Overlap Engine — Phase X

Replicates the manual XCS tracking-reduction workflow.
Supports both global overlap modes and individual per-gap control.
"""
from __future__ import annotations

import base64
import logging
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .canonical_geometry import build_geometry, recalculate_geometry_bounds
from .floating_component import apply_floating_offsets, detect_floating_components
from .font_loader import FontCatalog
from .models import (
    FloatingComponentInfo,
    GeometryPath,
    OverlapGapConfig,
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

        # Global default overlap
        if request.overlap_mode == "custom" and request.overlap_custom_mm is not None:
            default_overlap = float(request.overlap_custom_mm)
        else:
            default_overlap = _MODE_OVERLAP_MM.get(request.overlap_mode, 1.0)

        # Build per-pair config map from request
        config_map: dict[int, OverlapGapConfig] = {
            cfg.pair_index: cfg for cfg in request.gap_configs
        }

        gaps_before = _bbox_gaps(geometry.glyphs, geometry.paths)
        pair_s = _pair_shifts(gaps_before, default_overlap, config_map)
        shifts = _cumulative(pair_s, len(geometry.glyphs))
        gaps_after = [g - ps for g, ps in zip(gaps_before, pair_s)]

        logger.debug("Overlap mode=%s default=%.2f mm", request.overlap_mode, default_overlap)
        logger.debug("Gaps before: %s", [round(g, 3) for g in gaps_before])
        logger.debug("Gaps after:  %s", [round(g, 3) for g in gaps_after])

        glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]
        shifted_paths = _shift_paths(geometry.paths, glyph_path_ids, shifts)

        glyph_chars = _extract_chars(normalised, len(geometry.glyphs))

        # Detect floating components BEFORE applying offsets so that moving
        # the dot toward the stroke does not cause it to disappear from detection.
        floating_info = detect_floating_components(geometry.glyphs, shifted_paths, glyph_chars)

        # Apply floating component X/Y offsets (dot on 'i', accents, etc.)
        if request.floating_offsets:
            shifted_paths = apply_floating_offsets(
                shifted_paths, geometry.glyphs, request.floating_offsets
            )

        geometry = geometry.model_copy(update={"paths": shifted_paths}, deep=True)
        geometry = recalculate_geometry_bounds(geometry)
        floating_components = [
            FloatingComponentInfo(glyph_index=f["glyph_index"], char=f["char"])
            for f in floating_info
        ]

        svg = export_svg(geometry, fill_rule="nonzero")
        png = export_png(svg, geometry)
        base_name = _safe_filename(normalised)

        return OverlapResponse(
            svg=svg,
            png_base64=base64.b64encode(png).decode("ascii"),
            svg_filename=f"{base_name}.svg",
            png_filename=f"{base_name}.png",
            overlap_metadata=OverlapMetadata(
                mode=request.overlap_mode,
                target_overlap_mm=round(default_overlap, 3),
                glyph_chars=glyph_chars,
                gaps_before_mm=[round(g, 3) for g in gaps_before],
                gaps_after_mm=[round(g, 3) for g in gaps_after],
                floating_components=floating_components,
            ),
            dimensions={
                "width": geometry.dimensions.width,
                "height": geometry.dimensions.height,
                "units": "mm",
            },
        )


# ---------------------------------------------------------------------------
# Algorithm
# ---------------------------------------------------------------------------

def _bbox_gaps(glyphs, paths) -> list[float]:
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
        # If already more overlap than target, don't compress further
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
    # Mismatch (ligatures / combining marks): pad or truncate
    if len(chars) < n_glyphs:
        return chars + ["?"] * (n_glyphs - len(chars))
    return chars[:n_glyphs]


def _safe_filename(text: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", text.strip()).strip("-").lower()
    return value or "design"
