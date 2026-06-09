from __future__ import annotations

import logging
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

from .models import GeometryPath, GlyphGeometry, PathCommand
from .text_shaper import ShapedGlyph

logger = logging.getLogger(__name__)

FONT_SIZE_MM = 42.0


class GeometryPen(BasePen):
    def __init__(self, glyph_set, x_offset: float, y_offset: float, scale: float) -> None:
        super().__init__(glyph_set)
        self.x_offset = x_offset
        self.y_offset = y_offset
        self.scale = scale
        self.commands: list[PathCommand] = []
        self.closed = False

    def _transform(self, point: tuple[float, float]) -> tuple[float, float]:
        x, y = point
        return ((self.x_offset + x) * self.scale, -(self.y_offset + y) * self.scale)

    def _moveTo(self, point: tuple[float, float]) -> None:
        x, y = self._transform(point)
        self.commands.append(PathCommand(type="M", x=x, y=y))

    def _lineTo(self, point: tuple[float, float]) -> None:
        x, y = self._transform(point)
        self.commands.append(PathCommand(type="L", x=x, y=y))

    def _qCurveToOne(self, p1: tuple[float, float], p2: tuple[float, float]) -> None:
        x1, y1 = self._transform(p1)
        x, y = self._transform(p2)
        self.commands.append(PathCommand(type="Q", x1=x1, y1=y1, x=x, y=y))

    def _curveToOne(
        self,
        p1: tuple[float, float],
        p2: tuple[float, float],
        p3: tuple[float, float],
    ) -> None:
        x1, y1 = self._transform(p1)
        x2, y2 = self._transform(p2)
        x, y = self._transform(p3)
        self.commands.append(PathCommand(type="C", x1=x1, y1=y1, x2=x2, y2=y2, x=x, y=y))

    def _closePath(self) -> None:
        self.commands.append(PathCommand(type="Z"))
        self.closed = True


def extract_outlines(
    font_path: Path,
    shaped_glyphs: list[ShapedGlyph],
    font_size_mm: float = FONT_SIZE_MM,
) -> tuple[list[GlyphGeometry], list[GeometryPath]]:
    font = TTFont(font_path)
    try:
        glyph_set = font.getGlyphSet()
        upem = float(font["head"].unitsPerEm)
        scale = font_size_mm / upem
        cursor_x = 0.0
        cursor_y = 0.0
        glyphs: list[GlyphGeometry] = []
        paths: list[GeometryPath] = []

        for index, shaped in enumerate(shaped_glyphs):
            path_ids: list[str] = []
            if shaped.glyph_name in glyph_set:
                pen = GeometryPen(
                    glyph_set,
                    x_offset=cursor_x + shaped.offset_x,
                    y_offset=cursor_y + shaped.offset_y,
                    scale=scale,
                )
                try:
                    glyph_set[shaped.glyph_name].draw(pen)
                except Exception:
                    logger.warning(
                        "Could not extract outline for glyph %r (index %d) — skipping.",
                        shaped.glyph_name,
                        index,
                    )
                    pen.commands.clear()
                if pen.commands:
                    path_id = f"path-{index + 1:04d}"
                    path_ids.append(path_id)
                    paths.append(GeometryPath(path_id=path_id, commands=pen.commands, closed=pen.closed))

            glyphs.append(
                GlyphGeometry(
                    glyph_id=shaped.glyph_id,
                    glyph_name=shaped.glyph_name,
                    cluster=shaped.cluster,
                    advance_x=shaped.advance_x * scale,
                    advance_y=shaped.advance_y * scale,
                    offset_x=shaped.offset_x * scale,
                    offset_y=shaped.offset_y * scale,
                    path_ids=path_ids,
                )
            )
            cursor_x += shaped.advance_x
            cursor_y += shaped.advance_y

        return glyphs, paths
    finally:
        font.close()
