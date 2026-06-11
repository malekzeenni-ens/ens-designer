"""Measure structural fragility of fonts for laser-cut cake toppers.

Renders a sample phrase with each font's actual outlines (via Pillow/FreeType)
at the same em-square scale the app uses for export (42mm, see
outline_extractor.FONT_SIZE_MM), then measures what fraction of the glyph ink
is thinner than a minimum safe cut width. Thin swashes, hairline serifs, and
delicate connectors show up directly as a low "structural score" -- no
name-based guessing required.

Usage:
    python backend/scripts/font_fragility_analysis.py [--out results.json] [--limit N]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.font_loader import FontCatalog  # noqa: E402

# Same convention as outline_extractor.FONT_SIZE_MM: the font's em-square is
# scaled to this many "mm" so results are comparable to actual export sizes.
FONT_SIZE_MM = 42.0
# Render resolution: pixels per mm. Higher = more accurate, slower.
RES_PX_PER_MM = 8
# A stroke narrower than this is considered fragile for 3mm acrylic.
MIN_SAFE_WIDTH_MM = 1.0

FONT_PX_SIZE = round(FONT_SIZE_MM * RES_PX_PER_MM)
EROSION_ITERATIONS = max(1, round((MIN_SAFE_WIDTH_MM * RES_PX_PER_MM) / 2))

SAMPLE_TEXT = "Happy Birthday 123"


def render_mask(font_path: Path, text: str = SAMPLE_TEXT) -> np.ndarray | None:
    """Render text with the given font and return a binary ink mask."""
    font = ImageFont.truetype(str(font_path), FONT_PX_SIZE)

    # Measure bbox first using a throwaway image, then render into a
    # correctly sized + padded canvas so nothing clips.
    probe = Image.new("L", (1, 1), 0)
    probe_draw = ImageDraw.Draw(probe)
    bbox = probe_draw.textbbox((0, 0), text, font=font)
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    if width <= 0 or height <= 0:
        return None

    pad = FONT_PX_SIZE // 4
    img = Image.new("L", (width + 2 * pad, height + 2 * pad), 0)
    draw = ImageDraw.Draw(img)
    draw.text((pad - left, pad - top), text, font=font, fill=255)

    arr = np.asarray(img)
    return arr > 127


def erode(mask: np.ndarray, iterations: int) -> np.ndarray:
    """Binary erosion with a 3x3 square structuring element, via min-pooling."""
    out = mask
    for _ in range(iterations):
        padded = np.pad(out, 1, mode="constant", constant_values=False)
        shifted = [
            padded[1:-1, 1:-1],
            padded[:-2, 1:-1],
            padded[2:, 1:-1],
            padded[1:-1, :-2],
            padded[1:-1, 2:],
            padded[:-2, :-2],
            padded[:-2, 2:],
            padded[2:, :-2],
            padded[2:, 2:],
        ]
        out = np.logical_and.reduce(shifted)
    return out


def analyse_font(path: Path) -> dict | None:
    mask = render_mask(path)
    if mask is None:
        return None
    ink_area = int(mask.sum())
    if ink_area == 0:
        return None
    safe_mask = erode(mask, EROSION_ITERATIONS)
    safe_area = int(safe_mask.sum())
    fragile_fraction = 1.0 - (safe_area / ink_area)
    structural_score = round(100.0 * safe_area / ink_area, 1)
    return {
        "ink_area_px": ink_area,
        "safe_area_px": safe_area,
        "fragile_fraction": round(fragile_fraction, 4),
        "structural_score": structural_score,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent / "font_fragility_results.json"))
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    catalog = FontCatalog(PROJECT_ROOT)
    fonts = catalog.list_fonts()
    if args.limit:
        fonts = fonts[: args.limit]

    results = []
    for i, info in enumerate(fonts):
        path = catalog.get_font_path(info.id)
        try:
            metrics = analyse_font(path)
        except Exception as exc:  # noqa: BLE001
            metrics = None
            print(f"[{i + 1}/{len(fonts)}] ERROR {info.full_name} ({path.name}): {exc}", file=sys.stderr)
        if metrics is None:
            continue
        results.append(
            {
                "font_id": info.id,
                "full_name": info.full_name,
                "family": info.family,
                "style": info.style,
                "source": info.source,
                "path": str(path),
                **metrics,
            }
        )
        if (i + 1) % 100 == 0:
            print(f"[{i + 1}/{len(fonts)}] processed...", file=sys.stderr)

    results.sort(key=lambda r: r["structural_score"])

    out_path = Path(args.out)
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {len(results)} results to {out_path}")


if __name__ == "__main__":
    main()
