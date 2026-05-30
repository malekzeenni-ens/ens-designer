from __future__ import annotations

from shapely.ops import unary_union

from .canonical_geometry import recalculate_geometry_bounds
from .models import CanonicalGeometry, GeometryPath, GlyphGeometry, MaterialProfile, PathCommand, WeldingMetadata
from .shapely_converter import count_connected_components, glyph_to_shapely, shapely_to_paths
from .welding_engine import apply_welding

_COMPRESSION_STEP_MM = 0.3
_MAX_COMPRESSION_STEPS = 20  # up to 6 mm shift per inter-glyph gap


def resolve_connectivity(
    geometry: CanonicalGeometry,
    material: MaterialProfile,
    enabled: bool,
) -> CanonicalGeometry:
    """
    Apply three-level connectivity resolution and return geometry with WeldingMetadata.

    Level 1 — Natural Connectivity: return unchanged if already one component.
    Level 2 — Letter Compression: slide glyphs closer, union overlaps.
    Level 3 — Bridge Fallback: existing conservative bridge engine.
    """
    path_map = {p.path_id: p for p in geometry.paths}
    geoms = [glyph_to_shapely(g, path_map) for g in geometry.glyphs]
    components_before = count_connected_components(geoms)

    # Single glyph or disabled — always natural.
    if not enabled or len(geometry.glyphs) <= 1:
        return _with_metadata(geometry, material, "natural", enabled, components_before, components_before, 0, [], 0, 0.0)

    # Level 1 — Natural Connectivity
    if components_before <= 1:
        return _with_metadata(geometry, material, "natural", True, components_before, components_before, 0, [], 0, 0.0)

    # Level 2 — Intelligent Letter Compression
    compressed, compression_mm = _apply_compression(geometry, geoms, components_before)
    if compressed is not None:
        # Compression succeeded — components_after is definitionally 1 (the condition under which we returned).
        result = _with_metadata(compressed, material, "compression", True, components_before, 1, 0, [], 0, compression_mm)
        return recalculate_geometry_bounds(result)

    # Level 3 — Structural Bridge Fallback
    bridge_result = apply_welding(geometry, material, enabled)
    if bridge_result.welding is not None:
        w = bridge_result.welding
        strategy = "bridge" if w.bridges_added > 0 else "disconnected"
        bridge_result = bridge_result.model_copy(
            update={"welding": w.model_copy(update={"strategy": strategy}, deep=True)},
            deep=True,
        )
    return bridge_result


def _apply_compression(
    geometry: CanonicalGeometry,
    initial_geoms: list,
    components_before: int,
) -> tuple[CanonicalGeometry | None, float]:
    """Try increasing uniform compression steps until all glyphs form one component."""
    glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]

    for step in range(1, _MAX_COMPRESSION_STEPS + 1):
        shift_per_gap = step * _COMPRESSION_STEP_MM
        compressed_paths = _shift_paths(geometry.paths, glyph_path_ids, shift_per_gap)
        path_map = {p.path_id: p for p in compressed_paths}
        geoms = [glyph_to_shapely(g, path_map) for g in geometry.glyphs]

        if count_connected_components(geoms) <= 1:
            merged = _merge_overlapping(compressed_paths, geometry.glyphs, geoms)
            updated = geometry.model_copy(update={"paths": merged}, deep=True)
            return updated, shift_per_gap

    return None, 0.0


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
    """Union paths of glyphs whose Shapely geometries intersect (not merely touch)."""
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

    # Group glyph indices by their root.
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
                # Fallback: keep original paths unmodified.
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
