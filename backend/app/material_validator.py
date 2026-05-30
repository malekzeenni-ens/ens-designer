from __future__ import annotations

from .models import CanonicalGeometry, MaterialProfile, ValidationReport, ValidationWarning

_STRATEGY_LABELS = {
    "natural": "Naturally connected",
    "compression": "Connected via letter compression",
    "bridge": "Connected via structural bridges",
    "disconnected": "Disconnected — manual review required",
}


def validate_geometry(geometry: CanonicalGeometry, material: MaterialProfile) -> CanonicalGeometry:
    warnings: list[ValidationWarning] = []
    welding = geometry.welding
    strategy = welding.strategy if welding else "disconnected"
    bridges_added = welding.bridges_added if welding else 0
    components_after = welding.connected_components_after if welding else len(geometry.paths)
    skipped_candidates = welding.bridge_candidates_skipped if welding else 0

    if components_after > 1:
        warnings.append(ValidationWarning(
            code="DISCONNECTED_GEOMETRY",
            severity="error",
            message="Geometry remains disconnected. Letters cannot be cut as one piece without manual intervention.",
        ))

    if skipped_candidates > 0 and strategy in ("bridge", "disconnected"):
        warnings.append(ValidationWarning(
            code="AUTO_BRIDGE_LOW_CONFIDENCE",
            severity="warning",
            message="Some bridge placements were skipped due to low confidence. Manual review is required.",
        ))

    if strategy == "bridge" and bridges_added > 0 and material.material_id == "mirror-acrylic-3mm":
        warnings.append(ValidationWarning(
            code="MIRROR_ACRYLIC_VISIBILITY",
            severity="info",
            message="Mirror acrylic can make bridges more visible; inspect placement before cutting.",
        ))

    if geometry.dimensions.height < material.minimum_feature_size_mm * 4:
        warnings.append(ValidationWarning(
            code="SMALL_FEATURES",
            severity="warning",
            message="The design height is small for the selected material; inspect fine details before cutting.",
        ))

    # Strategy-aware connectivity scoring.
    if strategy == "natural":
        connectivity_score = 100
    elif strategy == "compression":
        connectivity_score = 95
    elif strategy == "bridge" and components_after <= 1:
        connectivity_score = 80
    elif components_after <= 1:
        connectivity_score = 85
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
