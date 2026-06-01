"""
Overlap Engine — Phase X

Replicates the manual XCS tracking-reduction workflow.
Supports both global overlap modes and individual per-gap control.
"""
from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from pathlib import Path

from .canonical_geometry import build_geometry, recalculate_geometry_bounds
from .floating_component import apply_floating_offsets, detect_floating_components
from .font_loader import FontCatalog
from .models import (
    FloatingComponentInfo,
    OverlapGapConfig,
    OverlapMetadata,
    OverlapRequest,
    OverlapResponse,
)
from .outline_extractor import extract_outlines
from .overlap_helpers import (
    _bbox_gaps,
    _cumulative,
    _extract_chars,
    _pair_shifts,
    _safe_filename,
    _shift_paths,
)
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


# Algorithm helpers live in overlap_helpers.py (shared with cake_topper_engine).
