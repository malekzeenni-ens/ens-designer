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


def apply_welding(geometry: CanonicalGeometry, material: MaterialProfile, enabled: bool) -> CanonicalGeometry:
    bounds = [_path_bounds(path) for path in geometry.paths]
    components_before = _count_components(bounds)
    bridge_paths: list[GeometryPath] = []

    if enabled and len(bounds) > 1:
        for index, (left, right) in enumerate(zip(bounds, bounds[1:]), start=1):
            gap = right.min_x - left.max_x
            if gap > 0:
                bridge_paths.append(_create_bridge(index, left, right, material.recommended_connection_width_mm))

    updated_paths = [*geometry.paths, *bridge_paths]
    welded_geometry = geometry.model_copy(
        update={
            "paths": updated_paths,
            "material": material,
            "welding": WeldingMetadata(
                enabled=enabled,
                connected_components_before=components_before,
                connected_components_after=max(1, components_before - len(bridge_paths)) if enabled else components_before,
                bridges_added=len(bridge_paths),
                bridge_path_ids=[path.path_id for path in bridge_paths],
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
    components = 1
    current_max = bounds[0].max_x
    for item in bounds[1:]:
        if item.min_x > current_max:
            components += 1
        current_max = max(current_max, item.max_x)
    return components


def _create_bridge(index: int, left: PathBounds, right: PathBounds, width: float) -> GeometryPath:
    bridge_height = min(width, max(1.0, left.height * 0.32, right.height * 0.32))
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
