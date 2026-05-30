from __future__ import annotations

from .models import CanonicalGeometry, MaterialProfile, ValidationReport, ValidationWarning


def validate_geometry(geometry: CanonicalGeometry, material: MaterialProfile) -> CanonicalGeometry:
    warnings: list[ValidationWarning] = []
    welding = geometry.welding
    bridges_added = welding.bridges_added if welding else 0
    components_after = welding.connected_components_after if welding else len(geometry.paths)

    if components_after > 1:
        warnings.append(
            ValidationWarning(
                code="DISCONNECTED_GEOMETRY",
                severity="warning",
                message="Some geometry may remain disconnected after automatic welding.",
            )
        )

    if bridges_added == 0 and len(geometry.glyphs) > 1:
        warnings.append(
            ValidationWarning(
                code="NO_BRIDGES_ADDED",
                severity="info",
                message="No bridges were required or generated for this font/text combination.",
            )
        )

    if material.material_id == "mirror-acrylic-3mm" and bridges_added > 0:
        warnings.append(
            ValidationWarning(
                code="MIRROR_ACRYLIC_VISIBILITY",
                severity="info",
                message="Mirror acrylic can make bridges more visible; inspect placement before cutting.",
            )
        )

    if geometry.dimensions.height < material.minimum_feature_size_mm * 4:
        warnings.append(
            ValidationWarning(
                code="SMALL_FEATURES",
                severity="warning",
                message="The design height is small for the selected material; inspect fine details before cutting.",
            )
        )

    connectivity_score = 100 if components_after <= 1 else max(0, 100 - ((components_after - 1) * 20))
    structural_score = max(35, 92 - (len([w for w in warnings if w.severity == "warning"]) * 14))
    production_score = round((connectivity_score * 0.45) + (structural_score * 0.45) + (100 * 0.10))

    return geometry.model_copy(
        update={
            "validation": ValidationReport(
                connectivity_score=connectivity_score,
                structural_score=structural_score,
                production_readiness_score=production_score,
                warnings=warnings,
            )
        },
        deep=True,
    )
