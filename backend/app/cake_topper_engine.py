"""
Cake Topper Engine — Phase 2

Multi-line text composition with per-line font, size, alignment,
Phase X overlap controls, and vertical inter-line gap control.

Workflow:
  "Happy Birthday Sarah"
  → split by spaces → ["Happy", "Birthday", "Sarah"]
  → each word becomes one line with its own font, size, overlap
  → lines stacked vertically with configurable gaps
  → horizontal alignment per line: left / center / right / manual offset
  → single SVG + PNG output
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
    CakeTopperLineConfig,
    CakeTopperLineMetadata,
    CakeTopperMetadata,
    CakeTopperRequest,
    CakeTopperResponse,
    FloatingComponentInfo,
    GeometryPath,
    OverlapGapConfig,
    PathCommand,
)
from .outline_extractor import FONT_SIZE_MM, extract_outlines
from .overlap_helpers import (
    _bbox_gaps,
    _cumulative,
    _extract_chars,
    _pair_shifts,
    _safe_filename,
    _shift_paths,
)
from .png_exporter import export_png, render_paths_png
from .svg_exporter import export_svg
from .text_shaper import shape_text
from .unicode_normalisation import normalise_text

logger = logging.getLogger(__name__)

MAX_LINES = 4
CANVAS_PADDING_MM = 5.0
DEFAULT_INTER_LINE_GAP_MM = 3.0

_MODE_OVERLAP_MM: dict[str, float] = {
    "auto":   1.0,
    "light":  0.5,
    "medium": 1.5,
    "strong": 2.5,
}


@dataclass
class CakeTopperService:
    project_root: Path
    font_catalog: FontCatalog

    def generate(self, request: CakeTopperRequest) -> CakeTopperResponse:
        # 1. Split text into words (up to MAX_LINES)
        all_words = request.text.strip().split()
        if not all_words:
            raise ValueError("Text must contain at least one word.")
        words = all_words[:MAX_LINES]
        dropped_words = all_words[MAX_LINES:]

        n = len(words)
        line_configs = list(request.line_configs)
        # Pad missing configs with defaults
        while len(line_configs) < n:
            line_configs.append(CakeTopperLineConfig(
                font_id=request.default_font_id,
                font_size_mm=request.default_font_size_mm,
            ))

        inter_gaps = list(request.inter_line_gaps_mm)
        while len(inter_gaps) < n - 1:
            inter_gaps.append(DEFAULT_INTER_LINE_GAP_MM)

        # 2. Generate each line's geometry
        line_results = []
        for i, (word, cfg) in enumerate(zip(words, line_configs)):
            geom, meta = self._generate_line(word, cfg, request, i)
            line_results.append((geom, meta))

        # 3. Compute canvas width (widest line determines width)
        ink_widths = [
            geom.bounds.max_x - geom.bounds.min_x
            for geom, _ in line_results
        ]
        canvas_width = max(ink_widths) + 2 * CANVAS_PADDING_MM

        # 4. Stack lines, compute offsets
        y_cursor = CANVAS_PADDING_MM
        translated_path_groups: list[list[GeometryPath]] = []
        line_metadata: list[CakeTopperLineMetadata] = []

        for i, ((geom, meta), cfg) in enumerate(zip(line_results, line_configs)):
            ink_width = geom.bounds.max_x - geom.bounds.min_x
            ink_height = geom.bounds.max_y - geom.bounds.min_y

            # Horizontal alignment
            x_offset = _compute_x_offset(cfg, ink_width, canvas_width)

            # Translate paths to canvas position
            x_translate = x_offset - geom.bounds.min_x
            y_translate = y_cursor - geom.bounds.min_y
            translated = _translate_paths(geom.paths, x_translate, y_translate, prefix=f"L{i}-")
            translated_path_groups.append(translated)

            line_metadata.append(CakeTopperLineMetadata(
                text=words[i],
                glyph_chars=meta["glyph_chars"],
                gaps_before_mm=meta["gaps_before_mm"],
                gaps_after_mm=meta["gaps_after_mm"],
                width_mm=round(ink_width, 3),
                height_mm=round(ink_height, 3),
                x_offset_mm=round(x_offset, 3),
                floating_components=meta.get("floating_components", []),
            ))

            y_cursor += ink_height
            if i < len(inter_gaps):
                y_cursor += inter_gaps[i]

        canvas_height = y_cursor + CANVAS_PADDING_MM

        # 5. Assemble combined SVG
        all_paths = [p for group in translated_path_groups for p in group]
        svg = _assemble_svg(all_paths, canvas_width, canvas_height)
        png_bytes = _render_png(svg, all_paths, canvas_width, canvas_height)

        all_warnings: list[str] = []
        if dropped_words:
            all_warnings.append(
                f"Input has {len(all_words)} words but the maximum is {MAX_LINES}. "
                f"Dropped: {', '.join(repr(w) for w in dropped_words)}."
            )
            logger.warning("Text truncated: dropped %d word(s): %s", len(dropped_words), dropped_words)
        for _, meta in line_results:
            all_warnings.extend(meta.get("warnings", []))

        base_name = _safe_filename("_".join(words))
        return CakeTopperResponse(
            svg=svg,
            png_base64=base64.b64encode(png_bytes).decode("ascii"),
            svg_filename=f"{base_name}.svg",
            png_filename=f"{base_name}.png",
            warnings=all_warnings,
            metadata=CakeTopperMetadata(
                words=words,
                lines=line_metadata,
                inter_line_gaps_mm=[round(g, 3) for g in inter_gaps[:n - 1]],
                canvas_width_mm=round(canvas_width, 3),
                canvas_height_mm=round(canvas_height, 3),
            ),
        )

    def _generate_line(
        self,
        word: str,
        cfg: CakeTopperLineConfig,
        request: CakeTopperRequest,
        line_index: int,
    ) -> tuple:
        normalised = normalise_text(word)
        font_path = self.font_catalog.get_font_path(cfg.font_id)
        font_info = self.font_catalog.get_font_info(cfg.font_id)
        shaped = shape_text(normalised, font_path)
        glyphs, paths = extract_outlines(font_path, shaped, font_size_mm=cfg.font_size_mm)
        geometry = build_geometry(normalised, font_info, glyphs, paths)

        # Determine overlap target
        if cfg.overlap_mode == "custom" and cfg.overlap_custom_mm is not None:
            default_overlap = float(cfg.overlap_custom_mm)
        else:
            default_overlap = _MODE_OVERLAP_MM.get(cfg.overlap_mode, 1.0)

        config_map: dict[int, OverlapGapConfig] = {
            c.pair_index: c for c in cfg.gap_configs
        }

        gaps_before = _bbox_gaps(geometry.glyphs, geometry.paths)
        pair_s = _pair_shifts(gaps_before, default_overlap, config_map)
        shifts = _cumulative(pair_s, len(geometry.glyphs))
        gaps_after = [g - ps for g, ps in zip(gaps_before, pair_s)]

        glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]
        shifted_paths = _shift_paths(geometry.paths, glyph_path_ids, shifts)

        glyph_chars = _extract_chars(normalised, len(geometry.glyphs))

        # Detect missing glyphs: .notdef means the font has no glyph for that character.
        notdef_chars = sorted({
            glyph_chars[i]
            for i, g in enumerate(geometry.glyphs)
            if g.glyph_name == ".notdef" and i < len(glyph_chars) and glyph_chars[i].strip()
        })
        line_warnings: list[str] = []
        if notdef_chars:
            chars_display = ", ".join(repr(c) for c in notdef_chars)
            line_warnings.append(
                f"Line {line_index + 1} (\"{word}\"): character(s) {chars_display} "
                f"not found in the selected font. The output may have missing letters."
            )
            logger.warning("Missing glyphs on line %d (%r): %s", line_index + 1, word, notdef_chars)

        # Detect BEFORE applying offsets — dot moving toward the stroke must not
        # cause it to drop out of detection and hide the controls.
        floating_info = detect_floating_components(geometry.glyphs, shifted_paths, glyph_chars)

        # Apply floating component X/Y offsets per glyph (dot on 'i', accents, etc.)
        if cfg.floating_offsets:
            shifted_paths = apply_floating_offsets(
                shifted_paths, geometry.glyphs, cfg.floating_offsets
            )

        geometry = geometry.model_copy(update={"paths": shifted_paths}, deep=True)
        geometry = recalculate_geometry_bounds(geometry)
        floating_components = [
            FloatingComponentInfo(glyph_index=f["glyph_index"], char=f["char"])
            for f in floating_info
        ]

        meta = {
            "glyph_chars": glyph_chars,
            "gaps_before_mm": [round(g, 3) for g in gaps_before],
            "gaps_after_mm": [round(g, 3) for g in gaps_after],
            "floating_components": floating_components,
            "warnings": line_warnings,
        }
        return geometry, meta


# Overlap algorithm helpers (_bbox_gaps, _pair_shifts, _cumulative,
# _shift_paths, _extract_chars, _safe_filename) live in overlap_helpers.py.

# ---------------------------------------------------------------------------
# Canvas assembly helpers
# ---------------------------------------------------------------------------

def _compute_x_offset(cfg: CakeTopperLineConfig, ink_width: float, canvas_width: float) -> float:
    if cfg.alignment == "left":
        return CANVAS_PADDING_MM
    if cfg.alignment == "right":
        return canvas_width - CANVAS_PADDING_MM - ink_width
    if cfg.alignment == "manual":
        return CANVAS_PADDING_MM + cfg.alignment_offset_mm
    # center (default)
    return (canvas_width - ink_width) / 2.0


def _translate_paths(paths: list[GeometryPath], dx: float, dy: float, prefix: str = "") -> list[GeometryPath]:
    result = []
    for path in paths:
        new_cmds = []
        for cmd in path.commands:
            data = cmd.model_dump()
            for k in ("x", "x1", "x2"):
                if data[k] is not None:
                    data[k] = round(data[k] + dx, 3)
            for k in ("y", "y1", "y2"):
                if data[k] is not None:
                    data[k] = round(data[k] + dy, 3)
            new_cmds.append(PathCommand(**data))
        result.append(GeometryPath(
            path_id=f"{prefix}{path.path_id}",
            commands=new_cmds,
            closed=path.closed,
        ))
    return result


def _assemble_svg(paths: list[GeometryPath], width: float, height: float) -> str:
    import svgwrite
    drawing = svgwrite.Drawing(
        size=(f"{round(width, 3)}mm", f"{round(height, 3)}mm"),
        profile="tiny",
    )
    drawing.viewbox(0, 0, round(width, 3), round(height, 3))
    drawing.attribs["xmlns"] = "http://www.w3.org/2000/svg"
    drawing.attribs["version"] = "1.1"
    for path in paths:
        d = " ".join(_cmd_str(c) for c in path.commands)
        drawing.add(drawing.path(d=d, fill="#000000", stroke="none", fill_rule="nonzero"))
    return drawing.tostring()


def _cmd_str(cmd: PathCommand) -> str:
    if cmd.type == "M":
        return f"M {cmd.x} {cmd.y}"
    if cmd.type == "L":
        return f"L {cmd.x} {cmd.y}"
    if cmd.type == "Q":
        return f"Q {cmd.x1} {cmd.y1} {cmd.x} {cmd.y}"
    if cmd.type == "C":
        return f"C {cmd.x1} {cmd.y1} {cmd.x2} {cmd.y2} {cmd.x} {cmd.y}"
    return "Z"


def _render_png(svg: str, paths: list[GeometryPath], width_mm: float, height_mm: float) -> bytes:
    try:
        import cairosvg
        return cairosvg.svg2png(bytestring=svg.encode("utf-8"), background_color="transparent")
    except (ImportError, OSError):
        # Cairo native library not available — fall back to Pillow polygon renderer.
        return render_paths_png(paths, width_mm, height_mm)


