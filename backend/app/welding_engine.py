from __future__ import annotations

from dataclasses import dataclass

from .canonical_geometry import recalculate_geometry_bounds
from .models import CanonicalGeometry, GeometryPath, MaterialProfile, PathCommand, WeldingMetadata


@dataclass(frozen=True)
class PathBounds:
    path_id: str
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    @property
    def center_y(self) -> float:
        return (self.min_y + self.max_y) / 2

    @property
    def height(self) -> float:
        return self.max_y - self.min_y

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    def vertical_overlap(self, other: "PathBounds") -> float:
        return max(0.0, min(self.max_y, other.max_y) - max(self.min_y, other.min_y))


def apply_welding(geometry: CanonicalGeometry, material: MaterialProfile, enabled: bool) -> CanonicalGeometry:
    bounds = [_path_bounds(path) for path in geometry.paths]
    components_before = _count_components(bounds)
    bridge_paths: list[GeometryPath] = []

    skipped_candidates = 0
    if enabled and len(bounds) > 1:
        for index, (left, right) in enumerate(zip(bounds, bounds[1:]), start=1):
            gap = right.min_x - left.max_x
            if _is_safe_bridge_candidate(left, right, gap, material.recommended_connection_width_mm):
                bridge_paths.append(_create_bridge(index, left, right, material.recommended_connection_width_mm))
            elif gap > 0:
                skipped_candidates += 1

    updated_paths = [*geometry.paths, *bridge_paths]
    components_after = _count_components([_path_bounds(path) for path in updated_paths])
    welded_geometry = geometry.model_copy(
        update={
            "paths": updated_paths,
            "material": material,
            "welding": WeldingMetadata(
                enabled=enabled,
                connected_components_before=components_before,
                connected_components_after=components_after if enabled else components_before,
                bridges_added=len(bridge_paths),
                bridge_path_ids=[path.path_id for path in bridge_paths],
                bridge_candidates_skipped=skipped_candidates,
            ),
        },
        deep=True,
    )
    return recalculate_geometry_bounds(welded_geometry)


def _path_bounds(path: GeometryPath) -> PathBounds:
    xs: list[float] = []
    ys: list[float] = []
    for command in path.commands:
        for x_attr, y_attr in (("x", "y"), ("x1", "y1"), ("x2", "y2")):
            x = getattr(command, x_attr)
            y = getattr(command, y_attr)
            if x is not None and y is not None:
                xs.append(x)
                ys.append(y)
    return PathBounds(path_id=path.path_id, min_x=min(xs), min_y=min(ys), max_x=max(xs), max_y=max(ys))


def _count_components(bounds: list[PathBounds]) -> int:
    if not bounds:
        return 0
    # Sort by min_x so bridges appended after letter paths are seen in sweep order.
    ordered = sorted(bounds, key=lambda b: b.min_x)
    components = 1
    current_max = ordered[0].max_x
    for item in ordered[1:]:
        if item.min_x > current_max:
            components += 1
        current_max = max(current_max, item.max_x)
    return components


_MAX_BRIDGE_GAP_MM = 4.0  # maximum gap a bridge will span


def _is_safe_bridge_candidate(left: PathBounds, right: PathBounds, gap: float, recommended_width: float) -> bool:
    if gap <= 0:
        return False
    if gap > _MAX_BRIDGE_GAP_MM:
        return False

    overlap = left.vertical_overlap(right)
    smaller_height = max(0.001, min(left.height, right.height))
    if overlap / smaller_height < 0.40:
        return False

    height_ratio = max(left.height, right.height) / max(0.001, smaller_height)
    if height_ratio > 2.5:
        return False

    return True


def _create_bridge(index: int, left: PathBounds, right: PathBounds, width: float) -> GeometryPath:
    bridge_height = min(width, max(1.0, min(left.height, right.height) * 0.18))
    center_y = (left.center_y + right.center_y) / 2
    y1 = round(center_y - bridge_height / 2, 3)
    y2 = round(center_y + bridge_height / 2, 3)
    x1 = round(left.max_x, 3)
    x2 = round(right.min_x, 3)
    return GeometryPath(
        path_id=f"bridge-{index:04d}",
        closed=True,
        commands=[
            PathCommand(type="M", x=x1, y=y1),
            PathCommand(type="L", x=x2, y=y1),
            PathCommand(type="L", x=x2, y=y2),
            PathCommand(type="L", x=x1, y=y2),
            PathCommand(type="Z"),
        ],
    )
