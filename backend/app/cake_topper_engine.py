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
import math
from dataclasses import dataclass
from pathlib import Path

from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from .canonical_geometry import build_geometry, recalculate_geometry_bounds
from .floating_component import apply_floating_offsets, detect_floating_components
from .font_loader import FontCatalog
from .models import (
    CakeTopperLineConfig,
    CakeTopperLineMetadata,
    CakeTopperMetadata,
    CakeTopperOutlineMetadata,
    CakeTopperRingMetadata,
    CakeTopperRequest,
    CakeTopperResponse,
    CakeTopperStakeMetadata,
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
from .shapely_converter import path_to_shapely, shapely_to_paths
from .svg_exporter import export_svg
from .text_shaper import shape_text
from .unicode_normalisation import normalise_text

DEFAULT_PATH_COLOR = "#000000"

logger = logging.getLogger(__name__)

MAX_LINES = 4
CANVAS_PADDING_MM = 5.0
DEFAULT_INTER_LINE_GAP_MM = 3.0
DEFAULT_STAKE_COUNT = 0
MIN_RING_OVERLAP_MM = 4.0

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
        translated_path_groups: list[tuple[list[GeometryPath], str]] = []
        line_metadata: list[CakeTopperLineMetadata] = []

        for i, ((geom, meta), cfg) in enumerate(zip(line_results, line_configs)):
            ink_width = geom.bounds.max_x - geom.bounds.min_x
            ink_height = geom.bounds.max_y - geom.bounds.min_y

            # Horizontal alignment
            x_offset = _compute_x_offset(cfg, ink_width, canvas_width)

            # Manual canvas offset — additive after alignment and stacking
            manual_x = cfg.manual_x_offset_mm
            manual_y = cfg.manual_y_offset_mm

            # Translate paths to canvas position (including manual offset)
            x_translate = x_offset - geom.bounds.min_x + manual_x
            y_translate = y_cursor - geom.bounds.min_y + manual_y
            translated = _translate_paths(geom.paths, x_translate, y_translate, prefix=f"L{i}-")
            translated_path_groups.append((translated, cfg.color))

            line_metadata.append(CakeTopperLineMetadata(
                text=words[i],
                glyph_chars=meta["glyph_chars"],
                gaps_before_mm=meta["gaps_before_mm"],
                gaps_after_mm=meta["gaps_after_mm"],
                width_mm=round(ink_width, 3),
                height_mm=round(ink_height, 3),
                x_offset_mm=round(x_offset + manual_x, 3),
                y_offset_mm=round(y_cursor + manual_y, 3),
                manual_x_offset_mm=round(manual_x, 3),
                manual_y_offset_mm=round(manual_y, 3),
                floating_components=meta.get("floating_components", []),
                color=cfg.color,
                font_name=meta.get("font_name", ""),
                font_size_mm=meta.get("font_size_mm", 42.0),
            ))

            y_cursor += ink_height
            if i < len(inter_gaps):
                y_cursor += inter_gaps[i]

        canvas_height = y_cursor + CANVAS_PADDING_MM

        # Capture line-only paths before stakes/outline are appended — both
        # stake placement and outline scope are defined relative to the text
        # lines alone, not to each other.
        line_only_paths = [p for group, _ in translated_path_groups for p in group]

        outline_metadata: CakeTopperOutlineMetadata | None = None
        ring_metadata: CakeTopperRingMetadata | None = None
        ring_warnings: list[str] = []
        if request.outline_enabled:
            outline_geometry = _generate_outline_geometry(line_only_paths, request.outline_width_mm)
            if request.ring_config.enabled and outline_geometry is not None:
                outline_geometry, ring_metadata, ring_warnings = _apply_ring_to_base(
                    request,
                    outline_geometry,
                    line_only_paths,
                )
            outline_paths = _compound_paths_from_shapely(
                outline_geometry,
                "R0-backing-with-ring" if request.ring_config.enabled else "OUTLINE",
            )
            if outline_paths:
                # Inserted at the front so it renders behind the lines/stakes.
                translated_path_groups.insert(0, (outline_paths, request.outline_color))
                outline_metadata = CakeTopperOutlineMetadata(
                    width_mm=round(request.outline_width_mm, 3),
                    color=request.outline_color,
                )
        elif request.ring_config.enabled:
            ring_metadata, ring_warnings = _disabled_ring_metadata(request)
            ring_warnings.append(
                "Ring/keyhole is intended for designs with an outline/backing layer. "
                "Enable outline to create a structurally safe keychain body."
            )

        stake_paths, stake_metadata = _build_stakes(request, line_only_paths)
        if stake_paths:
            translated_path_groups.append((stake_paths, DEFAULT_PATH_COLOR))

        translated_path_groups, line_metadata, stake_metadata, ring_metadata, canvas_width, canvas_height = _fit_canvas_to_paths(
            translated_path_groups,
            line_metadata,
            stake_metadata,
            ring_metadata,
            canvas_width,
            canvas_height,
        )

        # 5. Assemble combined SVG
        svg = _assemble_svg(translated_path_groups, canvas_width, canvas_height, line_metadata)
        png_bytes = _render_png(svg, translated_path_groups, canvas_width, canvas_height)

        all_warnings: list[str] = []
        if dropped_words:
            all_warnings.append(
                f"Input has {len(all_words)} words but the maximum is {MAX_LINES}. "
                f"Dropped: {', '.join(repr(w) for w in dropped_words)}."
            )
            logger.warning("Text truncated: dropped %d word(s): %s", len(dropped_words), dropped_words)
        for _, meta in line_results:
            all_warnings.extend(meta.get("warnings", []))
        all_warnings.extend(ring_warnings)

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
                stakes=stake_metadata,
                ring=ring_metadata,
                inter_line_gaps_mm=[round(g, 3) for g in inter_gaps[:n - 1]],
                canvas_width_mm=round(canvas_width, 3),
                canvas_height_mm=round(canvas_height, 3),
                outline=outline_metadata,
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

        if not paths:
            early_chars = _extract_chars(normalised, len(glyphs))
            notdef_chars = sorted({
                early_chars[i]
                for i, g in enumerate(glyphs)
                if g.glyph_name == ".notdef" and i < len(early_chars) and early_chars[i].strip()
            })
            font_display = font_info.full_name
            if notdef_chars:
                chars_display = ", ".join(repr(c) for c in notdef_chars)
                raise ValueError(
                    f'Line {line_index + 1} ("{word}"): font "{font_display}" has no glyphs for '
                    f'{chars_display}. This font does not support these characters — '
                    f'choose a different font for this line.'
                )
            raise ValueError(
                f'Line {line_index + 1} ("{word}"): font "{font_display}" cannot render this text.'
            )

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
            "font_name": font_info.full_name,
            "font_size_mm": cfg.font_size_mm,
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


def _build_stakes(
    request: CakeTopperRequest,
    content_paths: list[GeometryPath],
) -> tuple[list[GeometryPath], list[CakeTopperStakeMetadata]]:
    cfg = request.stake_config
    if cfg.count == DEFAULT_STAKE_COUNT:
        return [], []

    bounds = _paths_bounds(content_paths)
    if bounds is None:
        return [], []

    min_x, _, max_x, max_y = bounds
    content_width = max_x - min_x
    fractions = [0.5] if cfg.count == 1 else [0.28, 0.72]
    offset_map = {offset.stake_index: offset for offset in cfg.offsets}
    stake_paths: list[GeometryPath] = []
    stake_metadata: list[CakeTopperStakeMetadata] = []

    for index, fraction in enumerate(fractions):
        offset = offset_map.get(index)
        manual_x = offset.x_offset_mm if offset else 0.0
        manual_y = offset.y_offset_mm if offset else 0.0
        x = min_x + (content_width * fraction) - (cfg.width_mm / 2.0) + manual_x
        y = max_y - cfg.overlap_mm + manual_y

        stake_paths.append(_create_stake_path(
            path_id=f"S{index}-stake",
            x=x,
            y=y,
            width=cfg.width_mm,
            length=cfg.length_mm,
        ))
        stake_metadata.append(CakeTopperStakeMetadata(
            stake_index=index,
            width_mm=round(cfg.width_mm, 3),
            length_mm=round(cfg.length_mm, 3),
            x_offset_mm=round(x, 3),
            y_offset_mm=round(y, 3),
            manual_x_offset_mm=round(manual_x, 3),
            manual_y_offset_mm=round(manual_y, 3),
        ))

    return stake_paths, stake_metadata


def _create_stake_path(path_id: str, x: float, y: float, width: float, length: float) -> GeometryPath:
    shoulder_y = y + max(length - width * 1.8, length * 0.82)
    point_y = y + length
    mid_x = x + width / 2.0
    return GeometryPath(
        path_id=path_id,
        closed=True,
        commands=[
            PathCommand(type="M", x=round(x, 3), y=round(y, 3)),
            PathCommand(type="L", x=round(x + width, 3), y=round(y, 3)),
            PathCommand(type="L", x=round(x + width, 3), y=round(shoulder_y, 3)),
            PathCommand(
                type="Q",
                x1=round(x + width, 3),
                y1=round(point_y - width * 0.35, 3),
                x=round(mid_x, 3),
                y=round(point_y, 3),
            ),
            PathCommand(
                type="Q",
                x1=round(x, 3),
                y1=round(point_y - width * 0.35, 3),
                x=round(x, 3),
                y=round(shoulder_y, 3),
            ),
            PathCommand(type="L", x=round(x, 3), y=round(y, 3)),
            PathCommand(type="Z"),
        ],
    )


def _fit_canvas_to_paths(
    path_groups: list[tuple[list[GeometryPath], str]],
    line_metadata: list[CakeTopperLineMetadata],
    stake_metadata: list[CakeTopperStakeMetadata],
    ring_metadata: CakeTopperRingMetadata | None,
    width: float,
    height: float,
) -> tuple[
    list[tuple[list[GeometryPath], str]],
    list[CakeTopperLineMetadata],
    list[CakeTopperStakeMetadata],
    CakeTopperRingMetadata | None,
    float,
    float,
]:
    """Grow and, when needed, rebase the canvas so dragged lines are not clipped."""
    all_paths = [p for group, _ in path_groups for p in group]
    bounds = _paths_bounds(all_paths)
    if bounds is None:
        return path_groups, line_metadata, stake_metadata, ring_metadata, width, height

    min_x, min_y, max_x, max_y = bounds
    canvas_min_x = min(0.0, min_x - CANVAS_PADDING_MM)
    canvas_min_y = min(0.0, min_y - CANVAS_PADDING_MM)
    canvas_max_x = max(width, max_x + CANVAS_PADDING_MM)
    canvas_max_y = max(height, max_y + CANVAS_PADDING_MM)

    shift_x = -canvas_min_x
    shift_y = -canvas_min_y
    fitted_width = canvas_max_x - canvas_min_x
    fitted_height = canvas_max_y - canvas_min_y

    if shift_x or shift_y:
        path_groups = [
            (_translate_paths(group, shift_x, shift_y), color)
            for group, color in path_groups
        ]
        line_metadata = [
            meta.model_copy(update={
                "x_offset_mm": round(meta.x_offset_mm + shift_x, 3),
                "y_offset_mm": round(meta.y_offset_mm + shift_y, 3),
            })
            for meta in line_metadata
        ]
        stake_metadata = [
            meta.model_copy(update={
                "x_offset_mm": round(meta.x_offset_mm + shift_x, 3),
                "y_offset_mm": round(meta.y_offset_mm + shift_y, 3),
            })
            for meta in stake_metadata
        ]
        if ring_metadata is not None:
            ring_metadata = ring_metadata.model_copy(update={
                "center_x_mm": round(ring_metadata.center_x_mm + shift_x, 3),
                "center_y_mm": round(ring_metadata.center_y_mm + shift_y, 3),
            })

    return path_groups, line_metadata, stake_metadata, ring_metadata, fitted_width, fitted_height


def _paths_bounds(paths: list[GeometryPath]) -> tuple[float, float, float, float] | None:
    xs: list[float] = []
    ys: list[float] = []
    for path in paths:
        for cmd in path.commands:
            for x in (cmd.x, cmd.x1, cmd.x2):
                if x is not None:
                    xs.append(x)
            for y in (cmd.y, cmd.y1, cmd.y2):
                if y is not None:
                    ys.append(y)

    if not xs or not ys:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def _assemble_svg(
    groups: list[tuple[list[GeometryPath], str]],
    width: float,
    height: float,
    line_metadata: list[CakeTopperLineMetadata] | None = None,
) -> str:
    import svgwrite
    from datetime import date
    drawing = svgwrite.Drawing(
        size=(f"{round(width, 3)}mm", f"{round(height, 3)}mm"),
        profile="tiny",
    )
    drawing.viewbox(0, 0, round(width, 3), round(height, 3))
    drawing.attribs["xmlns"] = "http://www.w3.org/2000/svg"
    drawing.attribs["version"] = "1.1"
    for paths, color in groups:
        for path in paths:
            d = " ".join(_cmd_str(c) for c in path.commands)
            drawing.add(drawing.path(
                d=d,
                id=path.path_id,
                fill=color,
                stroke="none",
                fill_rule="nonzero",
            ))
    svg_str = drawing.tostring()
    if line_metadata:
        today = date.today().isoformat()
        recipe_lines = [
            f'  Line {i + 1}  "{m.text}"  —  {m.font_name or "Unknown"} · {m.font_size_mm}mm · {m.color}'
            for i, m in enumerate(line_metadata)
        ]
        comment = (
            "<!--\n"
            "EnS Designer — Cake Topper Recipe\n"
            f"Generated: {today}\n\n"
            + "\n".join(recipe_lines)
            + "\n-->"
        )
        tag_start = svg_str.find("<svg")
        if tag_start != -1:
            tag_end = svg_str.find(">", tag_start) + 1
            svg_str = svg_str[:tag_end] + "\n" + comment + svg_str[tag_end:]
    return svg_str


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


def _render_png(
    svg: str,
    groups: list[tuple[list[GeometryPath], str]],
    width_mm: float,
    height_mm: float,
) -> bytes:
    try:
        import cairosvg
        return cairosvg.svg2png(bytestring=svg.encode("utf-8"), background_color="transparent")
    except (ImportError, OSError):
        # Cairo native library not available — fall back to Pillow polygon renderer.
        return render_paths_png(groups, width_mm, height_mm)


def _generate_outline(paths: list[GeometryPath], width_mm: float) -> list[GeometryPath]:
    """Union all closed line paths into one silhouette, then grow it outward by width_mm."""
    grown = _generate_outline_geometry(paths, width_mm)
    return shapely_to_paths(grown, "OUTLINE")


def _generate_outline_geometry(paths: list[GeometryPath], width_mm: float):
    """Union all closed line paths into one silhouette, then grow it outward by width_mm."""
    polygons = []
    for path in paths:
        if not path.closed:
            continue
        poly = path_to_shapely(path)
        if poly is not None and not poly.is_empty and poly.area > 0:
            polygons.append(poly)
    if not polygons:
        return None

    try:
        combined = unary_union(polygons)
        grown = combined.buffer(width_mm, join_style="round")
    except Exception:
        logger.warning("Outline generation failed; skipping combined outline.")
        return None
    if grown.is_empty:
        return None

    return grown


def _apply_ring_to_base(
    request: CakeTopperRequest,
    base_geometry,
    line_paths: list[GeometryPath],
) -> tuple[object, CakeTopperRingMetadata, list[str]]:
    cfg = request.ring_config
    outer_radius = cfg.outer_diameter_mm / 2.0
    hole_radius = cfg.hole_diameter_mm / 2.0
    wall_thickness = (cfg.outer_diameter_mm - cfg.hole_diameter_mm) / 2.0
    warnings = _ring_validation_warnings(cfg, wall_thickness)

    min_x, min_y, max_x, _ = base_geometry.bounds
    if cfg.position == "top-center":
        center_x = (min_x + max_x) / 2.0
    elif cfg.position == "top-right":
        center_x = max_x - outer_radius
    elif cfg.position == "custom":
        center_x = min_x + outer_radius
    else:
        center_x = min_x + outer_radius
    center_y = min_y + cfg.overlap_mm - outer_radius
    center_x += cfg.x_offset_mm
    center_y += cfg.y_offset_mm

    ring_outer = Point(center_x, center_y).buffer(outer_radius, quad_segs=64)
    ring_hole = Point(center_x, center_y).buffer(hole_radius, quad_segs=64)
    neck_width = _approximate_ring_neck_width(outer_radius, cfg.overlap_mm)

    if neck_width is not None and neck_width < cfg.min_neck_width_mm:
        warnings.append(
            "Ring connection to the backing may be too weak. Increase overlap or move the ring closer to the design body."
        )

    try:
        overlap_area = ring_outer.intersection(base_geometry).area
    except Exception:
        overlap_area = 0.0
    if overlap_area <= 0:
        warnings.append(
            "Ring/keyhole is not touching the backing layer. Move it closer to the design body."
        )
        metadata = _ring_metadata(
            cfg.position,
            center_x,
            center_y,
            cfg.outer_diameter_mm,
            cfg.hole_diameter_mm,
            cfg.x_offset_mm,
            cfg.y_offset_mm,
            wall_thickness,
            neck_width,
            warnings,
        )
        return base_geometry, metadata, warnings

    try:
        with_tab = unary_union([base_geometry, ring_outer]).buffer(0)
        with_hole = with_tab.difference(ring_hole).buffer(0)
    except Exception:
        warnings.append("Ring/keyhole geometry could not be generated. Try a different position or size.")
        metadata = _ring_metadata(
            cfg.position,
            center_x,
            center_y,
            cfg.outer_diameter_mm,
            cfg.hole_diameter_mm,
            cfg.x_offset_mm,
            cfg.y_offset_mm,
            wall_thickness,
            neck_width,
            warnings,
        )
        return base_geometry, metadata, warnings

    line_geometry = _paths_union(line_paths)
    if line_geometry is not None:
        try:
            if ring_hole.intersects(line_geometry):
                warnings.append("Ring hole may be too close to the text. Move the ring or increase the outline offset.")
        except Exception:
            pass

    metadata = _ring_metadata(
        cfg.position,
        center_x,
        center_y,
        cfg.outer_diameter_mm,
        cfg.hole_diameter_mm,
        cfg.x_offset_mm,
        cfg.y_offset_mm,
        wall_thickness,
        neck_width,
        warnings,
    )
    return with_hole, metadata, warnings


def _disabled_ring_metadata(request: CakeTopperRequest) -> tuple[CakeTopperRingMetadata, list[str]]:
    cfg = request.ring_config
    wall_thickness = (cfg.outer_diameter_mm - cfg.hole_diameter_mm) / 2.0
    warnings = _ring_validation_warnings(cfg, wall_thickness)
    metadata = _ring_metadata(
        cfg.position,
        0.0,
        0.0,
        cfg.outer_diameter_mm,
        cfg.hole_diameter_mm,
        cfg.x_offset_mm,
        cfg.y_offset_mm,
        wall_thickness,
        _approximate_ring_neck_width(cfg.outer_diameter_mm / 2.0, cfg.overlap_mm),
        warnings,
    )
    return metadata, warnings


def _ring_validation_warnings(cfg, wall_thickness: float) -> list[str]:
    warnings: list[str] = []
    if wall_thickness < cfg.min_wall_thickness_mm:
        warnings.append(
            "Ring wall thickness is below 3 mm. Increase the outer diameter or reduce the hole diameter."
        )
    if cfg.overlap_mm < MIN_RING_OVERLAP_MM:
        warnings.append(
            "Ring connection to the backing may be too weak. Increase overlap or move the ring closer to the design body."
        )
    return warnings


def _ring_metadata(
    position: str,
    center_x: float,
    center_y: float,
    outer_diameter: float,
    hole_diameter: float,
    x_offset: float,
    y_offset: float,
    wall_thickness: float,
    neck_width: float | None,
    warnings: list[str],
) -> CakeTopperRingMetadata:
    return CakeTopperRingMetadata(
        enabled=True,
        position=position,
        center_x_mm=round(center_x, 3),
        center_y_mm=round(center_y, 3),
        outer_diameter_mm=round(outer_diameter, 3),
        hole_diameter_mm=round(hole_diameter, 3),
        outer_radius_mm=round(outer_diameter / 2.0, 3),
        hole_radius_mm=round(hole_diameter / 2.0, 3),
        x_offset_mm=round(x_offset, 3),
        y_offset_mm=round(y_offset, 3),
        wall_thickness_mm=round(wall_thickness, 3),
        neck_width_mm=round(neck_width, 3) if neck_width is not None else None,
        is_valid=len(warnings) == 0,
        warnings=warnings,
    )


def _approximate_ring_neck_width(outer_radius: float, overlap: float) -> float | None:
    if overlap <= 0 or outer_radius <= 0:
        return None
    clamped_overlap = min(overlap, outer_radius * 2.0)
    distance_from_center = outer_radius - clamped_overlap
    value = outer_radius**2 - distance_from_center**2
    if value < 0:
        return None
    return 2.0 * math.sqrt(value)


def _paths_union(paths: list[GeometryPath]):
    polygons = []
    for path in paths:
        if not path.closed:
            continue
        poly = path_to_shapely(path)
        if poly is not None and not poly.is_empty and poly.area > 0:
            polygons.append(poly)
    if not polygons:
        return None
    try:
        return unary_union(polygons).buffer(0)
    except Exception:
        return None


def _compound_paths_from_shapely(geometry, path_id_prefix: str) -> list[GeometryPath]:
    if geometry is None or geometry.is_empty:
        return []
    if isinstance(geometry, Polygon):
        polygons = [geometry]
    elif isinstance(geometry, MultiPolygon):
        polygons = list(geometry.geoms)
    else:
        return []

    paths: list[GeometryPath] = []
    for poly_idx, poly in enumerate(polygons):
        if poly.is_empty:
            continue
        oriented = orient(poly, sign=1.0)
        commands: list[PathCommand] = []
        _append_ring_commands(commands, list(oriented.exterior.coords))
        for interior in oriented.interiors:
            _append_ring_commands(commands, list(interior.coords))
        if commands:
            paths.append(GeometryPath(
                path_id=f"{path_id_prefix}-{poly_idx:04d}",
                commands=commands,
                closed=True,
            ))
    return paths


def _append_ring_commands(commands: list[PathCommand], coords: list[tuple[float, float]]) -> None:
    if len(coords) < 3:
        return
    commands.append(PathCommand(type="M", x=round(coords[0][0], 3), y=round(coords[0][1], 3)))
    for x, y in coords[1:]:
        commands.append(PathCommand(type="L", x=round(x, 3), y=round(y, 3)))
    commands.append(PathCommand(type="Z"))
