from __future__ import annotations

from .models import CanonicalGeometry, MaterialProfile, ValidationReport, ValidationWarning


def validate_geometry(geometry: CanonicalGeometry, material: MaterialProfile) -> CanonicalGeometry:
    warnings: list[ValidationWarning] = []
    welding = geometry.welding
    bridges_added = welding.bridges_added if welding else 0
    components_after = welding.connected_components_after if welding else len(geometry.paths)
    skipped_candidates = welding.bridge_candidates_skipped if welding else 0

    if components_after > 1:
        warnings.append(
            ValidationWarning(
                code="DISCONNECTED_GEOMETRY",
                severity="warning",
                message="Some geometry may remain disconnected after automatic welding.",
            )
        )

    if skipped_candidates > 0:
        warnings.append(
            ValidationWarning(
                code="AUTO_BRIDGE_LOW_CONFIDENCE",
                severity="warning",
                message="Automatic bridges were skipped because placement confidence was low. Manual review is required.",
            )
        )

    if bridges_added == 0 and len(geometry.glyphs) > 1:
        warnings.append(
            ValidationWarning(
                code="NO_SAFE_BRIDGES_ADDED",
                severity="warning" if components_after > 1 else "info",
                message="No safe automatic bridges were added for this font/text combination.",
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

    if components_after <= 1:
        connectivity_score = 88 if bridges_added == 0 and len(geometry.glyphs) > 1 else 100
    else:
        connectivity_score = max(15, 65 - ((components_after - 1) * 10))

    structural_score = max(25, 88 - (len([w for w in warnings if w.severity == "warning"]) * 18))
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
