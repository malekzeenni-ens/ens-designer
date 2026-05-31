from __future__ import annotations

import logging

from .canonical_geometry import recalculate_geometry_bounds
from .models import BridgeOverride, CanonicalGeometry, GeometryPath, MaterialProfile, PathCommand
from .shapely_converter import count_connected_components, glyph_to_shapely
from .welding_engine import _create_bridge, _path_bounds

logger = logging.getLogger(__name__)

_MAX_BRIDGE_WIDTH_MM = 5.0


def apply_bridge_overrides(
    geometry: CanonicalGeometry,
    material: MaterialProfile,
    overrides: list[BridgeOverride],
) -> CanonicalGeometry:
    """
    Apply user-specified bridge overrides on top of whatever the automatic
    welding engine produced. Overrides are stateless — sent with every request.

    add:       Force-place a bridge at pair_index even if engine skipped it.
    remove:    Remove the bridge at pair_index even if engine placed it.
    set_width: Recompute the bridge at pair_index with the given width_mm.
    """
    if not overrides or not geometry.welding:
        return geometry

    num_glyphs = len(geometry.glyphs)
    max_pair = num_glyphs - 2  # highest valid pair_index

    paths = list(geometry.paths)
    welding = geometry.welding
    bridge_ids: set[str] = set(welding.bridge_path_ids)

    for override in overrides:
        if override.pair_index < 0 or override.pair_index > max_pair:
            logger.warning(
                "bridge_override: pair_index %d out of range [0, %d] — skipped.",
                override.pair_index, max_pair,
            )
            continue

        bridge_path_id = f"bridge-{override.pair_index + 1:04d}"

        if override.action == "remove":
            paths = [p for p in paths if p.path_id != bridge_path_id]
            bridge_ids.discard(bridge_path_id)
            logger.debug("bridge_override: removed bridge at pair %d.", override.pair_index)

        elif override.action in ("add", "set_width"):
            # Compute the glyph bounds for this pair from non-bridge paths.
            letter_paths = [p for p in paths if not p.path_id.startswith("bridge-")]
            glyph_path_ids = [list(g.path_ids) for g in geometry.glyphs]

            left_paths = [p for p in letter_paths if p.path_id in set(glyph_path_ids[override.pair_index])]
            right_paths = [p for p in letter_paths if p.path_id in set(glyph_path_ids[override.pair_index + 1])]

            if not left_paths or not right_paths:
                logger.warning(
                    "bridge_override: could not find glyph paths for pair %d — skipped.",
                    override.pair_index,
                )
                continue

            left_bounds = _merge_bounds([_path_bounds(p) for p in left_paths])
            right_bounds = _merge_bounds([_path_bounds(p) for p in right_paths])

            if left_bounds is None or right_bounds is None:
                continue

            width = override.width_mm if override.width_mm is not None else material.recommended_connection_width_mm
            width = max(material.minimum_bridge_width_mm, min(width, _MAX_BRIDGE_WIDTH_MM))

            new_bridge = _create_bridge(override.pair_index + 1, left_bounds, right_bounds, width)
            new_bridge = GeometryPath(
                path_id=bridge_path_id,
                commands=new_bridge.commands,
                closed=new_bridge.closed,
            )

            # Replace existing or append new.
            paths = [p for p in paths if p.path_id != bridge_path_id]
            paths.append(new_bridge)
            bridge_ids.add(bridge_path_id)
            logger.debug(
                "bridge_override: %s bridge at pair %d (width=%.2f mm).",
                override.action, override.pair_index, width,
            )

    # Recount connected components after overrides.
    path_map = {p.path_id: p for p in paths}
    geoms = [glyph_to_shapely(g, path_map) for g in geometry.glyphs]
    components_after = count_connected_components(geoms)

    sorted_bridge_ids = sorted(bridge_ids)
    updated_welding = welding.model_copy(
        update={
            "bridges_added": len(sorted_bridge_ids),
            "bridge_path_ids": sorted_bridge_ids,
            "connected_components_after": components_after,
            "strategy": "bridge" if sorted_bridge_ids else (
                "natural" if components_after <= 1 else "disconnected"
            ),
        },
        deep=True,
    )

    updated = geometry.model_copy(
        update={"paths": paths, "welding": updated_welding},
        deep=True,
    )
    return recalculate_geometry_bounds(updated)


def _merge_bounds(bounds_list: list):
    """Compute a single bounding box covering all PathBounds in the list."""
    from .welding_engine import PathBounds

    if not bounds_list:
        return None
    return PathBounds(
        path_id=bounds_list[0].path_id,
        min_x=min(b.min_x for b in bounds_list),
        min_y=min(b.min_y for b in bounds_list),
        max_x=max(b.max_x for b in bounds_list),
        max_y=max(b.max_y for b in bounds_list),
    )
