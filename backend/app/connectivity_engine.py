from __future__ import annotations

import logging

from shapely.ops import unary_union

from .canonical_geometry import recalculate_geometry_bounds
from .models import CanonicalGeometry, GeometryPath, GlyphGeometry, MaterialProfile, PathCommand, WeldingMetadata
from .shapely_converter import count_connected_components, glyph_to_shapely, shapely_to_paths
from .welding_engine import apply_welding

logger = logging.getLogger(__name__)

_COMPRESSION_STEP_MM = 0.3
_MAX_COMPRESSION_STEPS = 20
# Maximum per-gap shift allowed during compression. Any font whose largest
# inter-glyph gap exceeds this value is rejected immediately and sent to the
# bridge fallback. Keeps compression visually non-destructive.
_MAX_COMPRESSION_PER_GAP_MM = 1.5


def resolve_connectivity(
    geometry: CanonicalGeometry,
    material: MaterialProfile,
    enabled: bool,
) -> CanonicalGeometry:
    """
    Three-level connectivity resolution.

    Level 1 — Natural Connectivity: already one component — return unchanged.
    Level 2 — Letter Compression: close small gaps by shifting glyphs.
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

    # Level 2 — Intelligent Letter Compression.
    compressed, compression_mm = _apply_compression(geometry)
    if compressed is not None:
        logger.debug("Level 2: compression succeeded at %.3f mm/gap.", compression_mm)
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
    Attempt to connect glyphs by uniformly reducing inter-glyph spacing.

    Guard rails:
    1. Bounding-box pre-check: if the largest inter-glyph gap already exceeds
       _MAX_COMPRESSION_PER_GAP_MM, skip all Shapely work and return None.
       This fast-paths bold/wide-spaced fonts (e.g. Anton) to bridge fallback
       without destructive compression.
    2. Shift limit: each compression step shifts glyphs by _COMPRESSION_STEP_MM.
       The loop breaks when shift_per_gap > _MAX_COMPRESSION_PER_GAP_MM.
    3. Geometry is NOT merged after compression — original letter shapes are
       preserved so the SVG preview remains readable.
    """
    glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]

    # --- Step 1: bounding-box gap pre-check (fast, no Shapely) ---------------
    gaps = _bbox_gaps(geometry)
    for i, gap in enumerate(gaps):
        logger.debug(
            "Pre-check gap glyph[%d]->[%d]: %.3f mm  (limit=%.3f mm)",
            i, i + 1, gap, _MAX_COMPRESSION_PER_GAP_MM,
        )

    if not gaps:
        return None, 0.0

    max_gap = max(g for g in gaps if g > 0.0) if any(g > 0.0 for g in gaps) else 0.0

    if max_gap > _MAX_COMPRESSION_PER_GAP_MM:
        logger.debug(
            "Compression rejected: max gap %.3f mm > readability limit %.3f mm. "
            "Font requires bridge fallback.",
            max_gap, _MAX_COMPRESSION_PER_GAP_MM,
        )
        return None, 0.0

    logger.debug(
        "Compression eligible: max gap %.3f mm within limit %.3f mm. "
        "Starting Shapely connectivity loop.",
        max_gap, _MAX_COMPRESSION_PER_GAP_MM,
    )

    # --- Step 2: iterative Shapely connectivity checks -----------------------
    for step in range(1, _MAX_COMPRESSION_STEPS + 1):
        shift_per_gap = step * _COMPRESSION_STEP_MM
        if shift_per_gap > _MAX_COMPRESSION_PER_GAP_MM:
            logger.debug(
                "Compression loop ended at step %d (%.3f mm > limit). "
                "No connectivity achieved — bridge fallback required.",
                step, shift_per_gap,
            )
            break

        compressed_paths = _shift_paths(geometry.paths, glyph_path_ids, shift_per_gap)
        path_map = {p.path_id: p for p in compressed_paths}
        geoms = [glyph_to_shapely(g, path_map) for g in geometry.glyphs]

        if count_connected_components(geoms) <= 1:
            logger.debug(
                "Compression step %d (%.3f mm/gap): all glyphs connected. "
                "Returning shifted paths without geometry merge.",
                step, shift_per_gap,
            )
            # Return shifted paths WITHOUT merging — preserves original letter
            # shapes and keeps the SVG preview readable.
            updated = geometry.model_copy(update={"paths": compressed_paths}, deep=True)
            return updated, shift_per_gap

    return None, 0.0


def _bbox_gaps(geometry: CanonicalGeometry) -> list[float]:
    """
    Compute inter-glyph gaps using bounding-box x-coordinates.
    Returns one gap value per adjacent glyph pair (positive = gap, negative = overlap).
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
            gaps.append(right[0] - left[1])  # right.min_x - left.max_x
    return gaps


def _shift_paths(
    paths: list[GeometryPath],
    glyph_path_ids: list[list[str]],
    shift_per_gap: float,
) -> list[GeometryPath]:
    """Shift each glyph group leftward by glyph_index × shift_per_gap (group 0 stays fixed)."""
    pid_to_shift: dict[str, float] = {}
    for idx, pid_group in enumerate(glyph_path_ids):
        shift = idx * shift_per_gap
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
