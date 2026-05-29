from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from pathlib import Path

from .canonical_geometry import build_geometry
from .font_loader import FontCatalog
from .models import GenerateResponse
from .outline_extractor import extract_outlines
from .png_exporter import export_png
from .svg_exporter import export_svg
from .text_shaper import shape_text
from .unicode_normalisation import normalise_text


@dataclass
class GenerationService:
    project_root: Path
    font_catalog: FontCatalog

    def generate(self, text: str, font_id: str) -> GenerateResponse:
        normalised = normalise_text(text)
        font_path = self.font_catalog.get_font_path(font_id)
        font_info = self.font_catalog.get_font_info(font_id)
        shaped = shape_text(normalised, font_path)
        glyphs, paths = extract_outlines(font_path, shaped)
        geometry = build_geometry(normalised, font_info, glyphs, paths)
        svg = export_svg(geometry)
        png = export_png(svg, geometry)
        base_name = _safe_filename(normalised)
        return GenerateResponse(
            geometry=geometry,
            svg=svg,
            png_base64=base64.b64encode(png).decode("ascii"),
            svg_filename=f"{base_name}.svg",
            png_filename=f"{base_name}.png",
        )


def _safe_filename(text: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", text.strip()).strip("-").lower()
    return value or "design"
