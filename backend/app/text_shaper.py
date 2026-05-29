from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont


@dataclass(frozen=True)
class ShapedGlyph:
    glyph_id: int
    glyph_name: str
    cluster: int
    advance_x: float
    advance_y: float
    offset_x: float
    offset_y: float


def shape_text(text: str, font_path: Path) -> list[ShapedGlyph]:
    font_data = font_path.read_bytes()
    hb_face = hb.Face(font_data)
    hb_font = hb.Font(hb_face)
    upem = hb_face.upem
    hb_font.scale = (upem, upem)
    hb.ot_font_set_funcs(hb_font)

    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(hb_font, buffer)

    tt_font = TTFont(font_path, lazy=True)
    try:
        shaped = []
        for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
            shaped.append(
                ShapedGlyph(
                    glyph_id=info.codepoint,
                    glyph_name=tt_font.getGlyphName(info.codepoint),
                    cluster=info.cluster,
                    advance_x=float(position.x_advance),
                    advance_y=float(position.y_advance),
                    offset_x=float(position.x_offset),
                    offset_y=float(position.y_offset),
                )
            )
        return shaped
    finally:
        tt_font.close()
