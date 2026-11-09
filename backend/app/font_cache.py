"""Bounded parsed-font and raw-outline caches shared by designer engines."""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
import threading
from typing import Any

from fontTools.ttLib import TTFont
import uharfbuzz as hb

from .models import PathCommand

MAX_FONTS = 32
MAX_GLYPHS_PER_FONT = 512
_cache_lock = threading.RLock()


@dataclass(frozen=True)
class LoadedFont:
    path: Path
    data: bytes
    hb_face: hb.Face
    hb_font: hb.Font
    tt_font: TTFont
    glyph_set: Any
    upem: float
    lock: Any = field(default_factory=threading.RLock)
    _outlines: OrderedDict[str, tuple[tuple[PathCommand, ...], bool]] = field(default_factory=OrderedDict, repr=False)


_fonts: OrderedDict[tuple[Path, int, int], LoadedFont] = OrderedDict()
_generation = 0  # bumped by clear_font_cache; stale in-flight parses are not cached


class _InFlight:
    """One cold parse per font key; other callers wait for its result (R1 E2)."""

    def __init__(self) -> None:
        self.done = threading.Event()
        self.value: LoadedFont | None = None
        self.error: BaseException | None = None


_in_flight: dict[tuple[Path, int, int], _InFlight] = {}


def _parse(path: Path) -> LoadedFont:
    data = path.read_bytes()
    # Parse the same immutable snapshot in both libraries. No OS font handle
    # remains open; eviction must not close objects held by active requests.
    face = hb.Face(data)
    font = hb.Font(face)
    font.scale = (face.upem, face.upem)
    hb.ot_font_set_funcs(font)
    tt_font = TTFont(BytesIO(data), lazy=False)
    try:
        return LoadedFont(path, data, face, font, tt_font,
                          tt_font.getGlyphSet(), float(tt_font["head"].unitsPerEm))
    except Exception:
        tt_font.close()
        raise


def get_loaded_font(path: Path) -> LoadedFont:
    """Return the cached parse of ``path``, parsing it at most once per version.

    Parsing runs outside the global lock so different cold fonts load in
    parallel; concurrent callers for the same font wait for one parse.
    """
    path = path.resolve()
    with _cache_lock:
        stat = path.stat()
        key = (path, stat.st_mtime_ns, stat.st_size)
        if key in _fonts:
            _fonts.move_to_end(key)
            return _fonts[key]
        pending = _in_flight.get(key)
        owner = pending is None
        if owner:
            pending = _in_flight[key] = _InFlight()
        generation = _generation
    if not owner:
        pending.done.wait()
        if pending.error is not None:
            raise pending.error
        return pending.value
    try:
        loaded = _parse(path)
    except BaseException as exc:
        with _cache_lock:
            _in_flight.pop(key, None)
        pending.error = exc
        pending.done.set()
        raise
    with _cache_lock:
        _in_flight.pop(key, None)
        if generation == _generation:
            for stale in [candidate for candidate in _fonts if candidate[0] == path]:
                del _fonts[stale]
            _fonts[key] = loaded
            while len(_fonts) > MAX_FONTS:
                _fonts.popitem(last=False)
    pending.value = loaded
    pending.done.set()
    return loaded


def clear_font_cache() -> None:
    global _generation
    with _cache_lock:
        # An in-flight request may still hold a LoadedFont. Its immutable font
        # snapshot remains usable until that request releases its reference.
        _fonts.clear()
        _generation += 1


def get_glyph_outline(loaded: LoadedFont, glyph_name: str) -> tuple[list[PathCommand], bool]:
    """Return independent commands in raw font units (Y up), before positioning.

    The cache belongs to the loaded font snapshot, so replacing or evicting a
    font also removes its glyph cache from future lookups.
    """
    from .outline_extractor import GeometryPen

    class FontUnitPen(GeometryPen):
        def _transform(self, point):
            return point

    with loaded.lock:
        if glyph_name not in loaded._outlines:
            pen = FontUnitPen(loaded.glyph_set, 0, 0, 1)
            loaded.glyph_set[glyph_name].draw(pen)
            loaded._outlines[glyph_name] = (tuple(pen.commands), pen.closed)
            while len(loaded._outlines) > MAX_GLYPHS_PER_FONT:
                loaded._outlines.popitem(last=False)
        loaded._outlines.move_to_end(glyph_name)
        commands, closed = loaded._outlines[glyph_name]
        return [command.model_copy(deep=True) for command in commands], closed
