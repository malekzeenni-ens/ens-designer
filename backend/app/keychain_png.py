"""Layer-composited PNG fallback without changing Cake Topper rendering."""
from __future__ import annotations

from io import BytesIO
import logging

from PIL import Image

from .png_exporter import render_paths_png

logger = logging.getLogger(__name__)


def render_keychain_png(svg, groups, width_mm, height_mm):
    try:
        import cairosvg
        return cairosvg.svg2png(bytestring=svg.encode("utf-8"), background_color="transparent")
    except Exception:
        logger.warning("CairoSVG unavailable for keychain; using composited Pillow layers.", exc_info=True)
    image = None
    for group in groups:
        # Counter holes erase only their own layer. Compositing reveals the
        # backing beneath text counters instead of erasing that backing too.
        layer = Image.open(BytesIO(render_paths_png([group], width_mm, height_mm))).convert("RGBA")
        image = layer if image is None else Image.alpha_composite(image, layer)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()
