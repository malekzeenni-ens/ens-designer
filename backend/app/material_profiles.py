from __future__ import annotations

from .models import MaterialProfile

MATERIAL_PROFILES = {
    "cast-acrylic-3mm": MaterialProfile(
        material_id="cast-acrylic-3mm",
        material_name="3mm Cast Acrylic",
        thickness_mm=3.0,
        minimum_bridge_width_mm=2.5,
        minimum_feature_size_mm=1.5,
        recommended_connection_width_mm=3.0,
    ),
    "mirror-acrylic-3mm": MaterialProfile(
        material_id="mirror-acrylic-3mm",
        material_name="3mm Mirror Acrylic",
        thickness_mm=3.0,
        minimum_bridge_width_mm=3.0,
        minimum_feature_size_mm=1.8,
        recommended_connection_width_mm=3.5,
    ),
    "plywood-3mm": MaterialProfile(
        material_id="plywood-3mm",
        material_name="3mm Plywood",
        thickness_mm=3.0,
        minimum_bridge_width_mm=2.2,
        minimum_feature_size_mm=1.3,
        recommended_connection_width_mm=2.8,
    ),
}


def list_materials() -> list[MaterialProfile]:
    return list(MATERIAL_PROFILES.values())


def get_material(material_id: str) -> MaterialProfile:
    try:
        return MATERIAL_PROFILES[material_id]
    except KeyError as exc:
        raise ValueError("Selected material was not found.") from exc
