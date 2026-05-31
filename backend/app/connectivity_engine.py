from __future__ import annotations

import logging

from shapely.ops import unary_union

from .canonical_geometry import recalculate_geometry_bounds
from .models import CanonicalGeometry, GeometryPath, GlyphGeometry, MaterialProfile, PathCommand, WeldingMetadata
from .shapely_converter import count_connected_components, glyph_to_shapely, shapely_to_paths
from .welding_engine import apply_welding

logger = logging.getLogger(__name__)

# A gap smaller than this is treated as "touching" — no compression needed for this pair.
_TOUCH_TOLERANCE_MM = 0.05
# Maximum single-pair gap that per-pair compression will attempt to close.
# Wide enough to cover typical script-font uppercase → lowercase gaps (~3 mm).
_MAX_PER_PAIR_GAP_MM = 5.0


def resolve_connectivity(
    geometry: CanonicalGeometry,
    material: MaterialProfile,
    enabled: bool,
) -> CanonicalGeometry:
    """
    Three-level connectivity resolution.

    Level 1 — Natural Connectivity: already one component — return unchanged.
    Level 2 — Per-pair Compression: close specific disconnected gaps while
               leaving naturally-overlapping pairs untouched.
    Level 3 — Bridge Fallback: place structural bridge rectangles.
    """
    path_map = {p.path_id: p for p in geometry.paths}
    geoms = [glyph_to_shapely(g, path_map) for g in geometry.glyphs]
    components_before = count_connected_components(geoms)

    logger.debug(
        "resolve_connectivity: text=%r  glyphs=%d  components_before=%d  enabled=%s",
        geometry.source.text, len(geometry.glyphs), components_before, enabled,
    )

    # Single glyph or disabled — always natural.
    if not enabled or len(geometry.glyphs) <= 1:
        return _with_metadata(
            geometry, material, "natural", enabled,
            components_before, components_before, 0, [], 0, 0.0,
        )

    # Level 1 — Natural Connectivity.
    if components_before <= 1:
        logger.debug("Level 1: naturally connected — no modification needed.")
        return _with_metadata(
            geometry, material, "natural", True,
            components_before, components_before, 0, [], 0, 0.0,
        )

    # Level 2 — Per-pair Compression.
    compressed, compression_mm = _apply_compression(geometry)
    if compressed is not None:
        logger.debug("Level 2: per-pair compression succeeded (max gap closed: %.3f mm).", compression_mm)
        result = _with_metadata(
            compressed, material, "compression", True,
            components_before, 1, 0, [], 0, compression_mm,
        )
        return recalculate_geometry_bounds(result)

    # Level 3 — Structural Bridge Fallback.
    logger.debug("Level 3: falling through to bridge engine.")
    bridge_result = apply_welding(geometry, material, enabled)
    if bridge_result.welding is not None:
        w = bridge_result.welding
        strategy = "bridge" if w.bridges_added > 0 else "disconnected"
        logger.debug(
            "Level 3: strategy=%s  bridges_added=%d  skipped=%d  components_after=%d",
            strategy, w.bridges_added, w.bridge_candidates_skipped,
            w.connected_components_after,
        )
        bridge_result = bridge_result.model_copy(
            update={"welding": w.model_copy(update={"strategy": strategy}, deep=True)},
            deep=True,
        )
    return bridge_result


def _apply_compression(
    geometry: CanonicalGeometry,
) -> tuple[CanonicalGeometry | None, float]:
    """
    Per-pair compression: close only disconnected gaps while leaving
    naturally-overlapping pairs untouched.

    Key distinction:
    - Fully disconnected fonts (Anton, Arial — all gaps positive): return None.
      Bridge fallback is structurally superior; per-pair compression would only
      produce weak single-line contact between every letter pair.
    - Partially connected fonts (script fonts — some gaps negative, some positive):
      only the positive gaps are closed. Each disconnected pair closes to exactly
      _TOUCH_TOLERANCE_MM. Subsequent glyphs accumulate the shift cumulatively,
      preserving relative spacing among naturally-connected letters.

    Example — "Oliver" in a script font:
      O→l gap = +3.1 mm  (disconnected — compress this)
      l→i gap = −3.4 mm  (naturally overlapping — leave untouched)
      i→v gap = −2.9 mm  (naturally overlapping — leave untouched)
      ...
      Result: O slides right to touch l; l-i-v-e-r remain at natural positions.
    """
    glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]
    gaps = _bbox_gaps(geometry)

    if not gaps:
        return None, 0.0

    for i, gap in enumerate(gaps):
        logger.debug("Per-pair gap glyph[%d]->[%d]: %.3f mm", i, i + 1, gap)

    has_naturally_connected_pair = any(g <= _TOUCH_TOLERANCE_MM for g in gaps)
    positive_gaps = [(i, g) for i, g in enumerate(gaps) if g > _TOUCH_TOLERANCE_MM]

    if not positive_gaps:
        # All pairs already touching or overlapping — Level 1 should have caught this.
        return None, 0.0

    if not has_naturally_connected_pair:
        # Every pair is disconnected (Anton/Arial style).
        # Per-pair compression would close every gap to single-line contact —
        # structurally weak. Bridge fallback is the correct strategy.
        logger.debug(
            "All %d pairs positive — fully disconnected font. "
            "Bridge fallback preferred over weak per-pair compression.",
            len(gaps),
        )
        return None, 0.0

    # Validate: each positive gap must be within the per-pair limit.
    for pair_index, gap in positive_gaps:
        if gap > _MAX_PER_PAIR_GAP_MM:
            logger.debug(
                "Pair %d gap %.3f mm exceeds per-pair limit %.3f mm — bridge fallback.",
                pair_index, gap, _MAX_PER_PAIR_GAP_MM,
            )
            return None, 0.0

    # Compute cumulative shifts.
    # Each positive gap contributes a shift to all subsequent glyphs.
    # Negative-gap pairs contribute nothing extra — relative positions preserved.
    cumulative_shifts = [0.0] * len(geometry.glyphs)
    max_closed_gap = 0.0

    for pair_index, gap in positive_gaps:
        pair_shift = gap - _TOUCH_TOLERANCE_MM
        for glyph_index in range(pair_index + 1, len(geometry.glyphs)):
            cumulative_shifts[glyph_index] += pair_shift
        max_closed_gap = max(max_closed_gap, gap)
        logger.debug(
            "Pair %d: closing %.3f mm gap → shift downstream glyphs by %.3f mm.",
            pair_index, gap, pair_shift,
        )

    compressed_paths = _shift_paths_by_cumulative(geometry.paths, glyph_path_ids, cumulative_shifts)
    updated = geometry.model_copy(update={"paths": compressed_paths}, deep=True)
    return updated, max_closed_gap


def _bbox_gaps(geometry: CanonicalGeometry) -> list[float]:
    """
    Compute inter-glyph gaps using bounding-box x-coordinates.
    Positive = gap, negative = overlap.
    """
    path_map = {p.path_id: p for p in geometry.paths}
    glyph_ranges: list[tuple[float, float] | None] = []

    for glyph in geometry.glyphs:
        xs: list[float] = []
        for pid in glyph.path_ids:
            path = path_map.get(pid)
            if path:
                for cmd in path.commands:
                    for attr in ("x", "x1", "x2"):
                        v = getattr(cmd, attr, None)
                        if v is not None:
                            xs.append(v)
        glyph_ranges.append((min(xs), max(xs)) if xs else None)

    gaps: list[float] = []
    for i in range(len(glyph_ranges) - 1):
        left = glyph_ranges[i]
        right = glyph_ranges[i + 1]
        if left is None or right is None:
            gaps.append(0.0)
        else:
            gaps.append(right[0] - left[1])
    return gaps


def _shift_paths_by_cumulative(
    paths: list[GeometryPath],
    glyph_path_ids: list[list[str]],
    cumulative_shifts: list[float],
) -> list[GeometryPath]:
    """Shift each glyph leftward by its individually computed cumulative shift."""
    pid_to_shift: dict[str, float] = {}
    for glyph_index, pid_group in enumerate(glyph_path_ids):
        shift = cumulative_shifts[glyph_index]
        for pid in pid_group:
            pid_to_shift[pid] = shift

    result: list[GeometryPath] = []
    for path in paths:
        shift = pid_to_shift.get(path.path_id, 0.0)
        if shift == 0.0:
            result.append(path)
            continue
        new_cmds: list[PathCommand] = []
        for cmd in path.commands:
            data = cmd.model_dump()
            for k in ("x", "x1", "x2"):
                if data[k] is not None:
                    data[k] = round(data[k] - shift, 3)
            new_cmds.append(PathCommand(**data))
        result.append(GeometryPath(path_id=path.path_id, commands=new_cmds, closed=path.closed))
    return result


def _merge_overlapping(
    paths: list[GeometryPath],
    glyphs: list[GlyphGeometry],
    geoms: list,
) -> list[GeometryPath]:
    """Union paths of glyphs whose Shapely geometries have interior overlap (not merely touch)."""
    n = len(glyphs)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def merge(x: int, y: int) -> None:
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for i in range(n):
        for j in range(i + 1, n):
            gi, gj = geoms[i], geoms[j]
            if gi is None or gj is None or gi.is_empty or gj.is_empty:
                continue
            try:
                if gi.intersects(gj) and not gi.touches(gj):
                    merge(i, j)
            except Exception:
                pass

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    path_map = {p.path_id: p for p in paths}
    result: list[GeometryPath] = []

    for members in groups.values():
        if len(members) == 1:
            g = glyphs[members[0]]
            for pid in g.path_ids:
                p = path_map.get(pid)
                if p is not None:
                    result.append(p)
        else:
            group_geoms = [geoms[i] for i in members if geoms[i] is not None and not geoms[i].is_empty]
            if not group_geoms:
                continue
            try:
                merged_geom = unary_union(group_geoms).buffer(0)
                prefix = "merged-" + "_".join(str(i) for i in sorted(members))
                result.extend(shapely_to_paths(merged_geom, prefix))
            except Exception:
                for idx in members:
                    for pid in glyphs[idx].path_ids:
                        p = path_map.get(pid)
                        if p is not None:
                            result.append(p)

    return result


def _with_metadata(
    geometry: CanonicalGeometry,
    material: MaterialProfile,
    strategy: str,
    enabled: bool,
    components_before: int,
    components_after: int,
    bridges_added: int,
    bridge_path_ids: list[str],
    bridge_candidates_skipped: int,
    compression_amount_mm: float,
) -> CanonicalGeometry:
    return geometry.model_copy(
        update={
            "material": material,
            "welding": WeldingMetadata(
                strategy=strategy,
                enabled=enabled,
                connected_components_before=components_before,
                connected_components_after=components_after,
                bridges_added=bridges_added,
                bridge_path_ids=bridge_path_ids,
                bridge_candidates_skipped=bridge_candidates_skipped,
                compression_amount_mm=round(compression_amount_mm, 3),
            ),
        },
        deep=True,
    )
