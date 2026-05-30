# phase-1b-implementation-plan.md

## Phase Information

Phase Number:

1B

Phase Name:

Connectivity Resolution & Validation

Target Release:

v0.2.0

Date:

2026-05-30

Status:

Ready For Approval

---

# 1. Executive Summary

Phase 1B should build directly on the accepted Phase 1A text-to-vector foundation.

The goal is to convert the current per-letter vector output into a more production-aware design workflow by adding connectivity analysis, natural connectivity preservation, intelligent letter compression, structural bridge fallback, material selection, material validation, validation scoring, warnings, and visual feedback.

This phase must stay pragmatic. It should not become a CAD editor, simulation engine, AI repair system, or full production hardening pass.

Recommended Phase 1B decision:

GO WITH CONDITIONS

Conditions:

- Treat bridges as fallback geometry only after natural connectivity and compression fail.
- Do not implement manual bridge override.
- Do not implement golden test corpus automation.
- Do not add DXF, AI, SVG import, cake toppers, decorative assets, batch, cloud, or multi-user features.
- Preserve Phase 1A SVG/PNG export and preview functionality.

---

# 2. Approved Scope

## Included

- Material selection for approved MVP materials.
- Material profile definitions.
- Geometry conversion suitable for connectivity analysis.
- Natural connectivity detection and preservation.
- Intelligent letter compression where spacing adjustment can create natural contact.
- Automatic overlap-based geometry union.
- Structural bridge fallback when letters remain disconnected after compression.
- Connectivity analysis.
- Material validation.
- Minimum feature warnings.
- Minimum connection width warnings.
- Minimum fallback bridge width warnings.
- Production readiness scoring.
- Validation warnings panel.
- Visual feedback for connectivity/compression/bridge-fallback/validation status.
- SVG and PNG export from the connected geometry.
- Automated tests.
- Updated documentation and handoff.

## Explicitly Excluded

- Manual bridge override.
- Golden test corpus automation.
- Cake topper generation.
- SVG import and repair.
- AI features.
- DXF export.
- Decorative asset library.
- Batch processing.
- SaaS, cloud, multi-user, or account features.
- Physics simulation.
- Laser setting automation.
- Broad material database.
- Advanced CAD editing.

---

# 3. Phase 1A Baseline

Phase 1A currently provides:

- Local FastAPI backend.
- React/Vite frontend.
- Text input.
- Font search and selection.
- Duplicate font hiding.
- HarfBuzz shaping.
- FontTools outline extraction.
- Canonical Geometry Model.
- SVG export.
- PNG export.
- Preview.
- LightBurn import manually confirmed by the project owner.

Phase 1B must not regress any Phase 1A workflow.

---

# 4. Dependencies

## Existing Dependencies To Keep

- FastAPI
- Pydantic
- FontTools
- uharfbuzz
- svgwrite
- CairoSVG
- Pillow fallback
- React
- TypeScript
- Vite
- pytest

## Proposed New Dependencies

| Dependency | Version | Purpose | Justification |
|---|---:|---|---|
| Shapely | 2.1.2 | Geometry union, polygon validity, connected component analysis | Approved in architecture docs and suited to welding/validation operations. |
| pyclipper | 1.4.0 | Offset/buffer-style helper operations where polygon offsets are needed | Approved in architecture docs and useful for bridge/feature-width checks. |

## Dependency Guardrails

- Pin versions during implementation.
- Validate installability in the local Python runtime before core implementation.
- Do not replace the Canonical Geometry Model with Shapely objects.
- Use geometry libraries behind service boundaries only.

---

# 5. Repository Structure

Add or extend the existing structure:

```text
backend/
  app/
    engines/
      connectivity/
        geometry_adapter.py
        connectivity_resolution_engine.py
        bridge_fallback_generator.py
        connectivity_analyzer.py
      validation/
        material_profiles.py
        material_validator.py
        validation_report.py
    models.py
    generation_service.py

frontend/
  src/
    components/
      MaterialSelector.tsx
      ValidationPanel.tsx
      ScoreSummary.tsx
    types/
      design.ts

tests/
  test_phase_1b_connectivity_validation.py
```

The exact file split can be simplified during implementation if the code remains clear.

---

# 6. Canonical Geometry Model Changes

Phase 1B should extend the current model minimally.

Add:

```json
{
  "material": {
    "materialId": "cast-acrylic-3mm",
    "materialName": "3mm Cast Acrylic",
    "thicknessMm": 3.0
  },
  "connectivity": {
    "enabled": true,
    "connectedComponentsBefore": 5,
    "connectedComponentsAfter": 1,
    "strategyApplied": "letter_compression",
    "compressionApplied": true,
    "bridgesAdded": 0,
    "connectedPathIds": ["path-merged-001"]
  },
  "validation": {
    "connectivityScore": 100,
    "structuralScore": 82,
    "productionReadinessScore": 88,
    "warnings": [
      {
        "code": "MIN_BRIDGE_WIDTH",
        "severity": "warning",
        "message": "One bridge is below the recommended width for 3mm Mirror Acrylic."
      }
    ]
  }
}
```

Do not add:

- Manual bridge edit metadata.
- Golden corpus metadata.
- DXF metadata.
- AI metadata.
- Multi-layer production metadata beyond what Phase 1B needs.

---

# 7. Connectivity Resolution Strategy

## Processing Pipeline

```text
Phase 1A Geometry
-> Convert paths to analysis geometry
-> Detect connected components
-> Detect natural overlaps
-> Preserve already connected geometry without modification
-> Attempt intelligent letter compression where feasible
-> Union overlapping/connected geometry
-> Add structural bridge fallback only for remaining disconnected components
-> Recalculate connected components
-> Validate against selected material
-> Export SVG/PNG
```

## Strategy Priority

1. Preserve original font appearance.
2. Preserve existing natural connectivity when available.
3. Use intelligent spacing/tracking compression only when it improves natural connection.
4. Add bridges only when natural connectivity and compression fail.
5. Warn when automatic repair is not strong enough.

## Connectivity Strategy Examples

Already connected:

- Pacifico
- Peanut Butter
- Script fonts

Compression required:

- Anton
- Oswald

Bridge required:

- Lobster leading character example
- Happy Birthday
- Multi-word layouts

## Bridge Fallback MVP

Bridge fallback should be simple, conservative, and deterministic:

- Run only after natural connectivity and compression fail.
- Connect adjacent disconnected letter components when placement confidence is high.
- Prefer shortest reasonable connection between bounding boxes or nearest sampled points.
- Use material profile recommended connection width.
- Avoid creating bridges thinner than material minimum.
- Represent bridges as generated fallback geometry, not user-editable controls.

Manual bridge override is Phase 1C and must not be introduced here.

---

# 8. Material Validation Strategy

## Approved Materials

| Material ID | Name | Minimum Bridge Width | Minimum Feature Size | Recommended Connection Width |
|---|---|---:|---:|---:|
| cast-acrylic-3mm | 3mm Cast Acrylic | 2.5mm | 1.5mm | 3.0mm |
| mirror-acrylic-3mm | 3mm Mirror Acrylic | 3.0mm | 1.8mm | 3.5mm |
| plywood-3mm | 3mm Plywood | 2.2mm | 1.3mm | 2.8mm |

These are starting validation defaults, not laser settings.

## Validation Outputs

- Connectivity score.
- Structural score.
- Production readiness score.
- Warning list.
- Material profile used.
- Connectivity strategy applied.
- Compression status.
- Fallback bridge count.
- Connected components before/after.

---

# 9. API Changes

Extend `POST /api/generate` request:

```json
{
  "text": "Oliver",
  "font_id": "font-id",
  "material_id": "cast-acrylic-3mm",
  "connectivity_resolution_enabled": true
}
```

Extend response:

```json
{
  "geometry": {},
  "svg": "...",
  "png_base64": "...",
  "validation": {},
  "materials": []
}
```

Add endpoint:

```text
GET /api/materials
```

Purpose:

Return the approved material profile list.

---

# 10. UI / UX Proposal

Keep one screen.

Add only:

- Material selector.
- Validation score summary.
- Warning panel.
- Connectivity strategy status text.

Do not add:

- Node editing.
- Manual bridge drawing.
- Layer tools.
- Advanced settings.
- AI controls.
- DXF controls.

User workflow:

```text
Text Input
-> Font Search / Font Selection
-> Material Selection
-> Generate
-> Preview Welded Design
-> Review Scores / Warnings
-> Download SVG
-> Download PNG
```

---

# 11. Testing Strategy

## Required Name Cases

- Oliver
- Amelia
- Muhammad
- O'Connor
- Léa

## Additional Phase 1B Cases

- Ava-Rose
- Hannah
- A short single-letter case that should warn rather than over-bridge
- Long name with spaces trimmed or rejected according to current input rules
- Script font from the Dropbox font library
- Bold/block font
- Thin/light font that should warn on material suitability

## Backend Tests

- Material profile list returns exactly approved MVP materials.
- Generate endpoint accepts material ID.
- Unknown material ID is rejected.
- Connectivity-enabled output preserves SVG and PNG export.
- Already connected fonts are preserved without compression or bridges.
- Anton and Oswald attempt compression before bridge fallback.
- Bridge fallback is reported only when natural connectivity and compression fail.
- Connected component count after connectivity resolution is less than or equal to before.
- Validation scores are present and finite.
- Warnings are produced for thin or weak geometry.
- No future-phase metadata appears in the response.

## Frontend Tests / Build

- Frontend production build passes.
- Material selector renders.
- Validation panel renders after generation.
- Download controls remain available.

## Manual Tests

- Generate real customer-like names with script and bold fonts.
- Import welded SVG into LightBurn.
- Confirm dimensions remain correct.
- Confirm separate letters are connected through the least invasive valid strategy or warnings are clear.

---

# 12. Acceptance Criteria

Phase 1B is complete when:

- User can select material profile.
- Generate still works for Phase 1A names.
- Connectivity resolution attempts natural preservation, compression, then bridge fallback in that order.
- Validation reports connected component count.
- Validation scores display in UI.
- Warnings display in UI.
- SVG/PNG download still works.
- Generated SVG imports into LightBurn.
- Tests pass.
- Documentation is updated.
- Handoff is completed.
- No Phase 1C or later scope is introduced.

---

# 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Bezier-to-polygon conversion may reduce font fidelity | High | Keep SVG export based on path geometry where possible and use polygon approximation only for analysis/welding MVP. |
| Structural bridge fallback may look visually awkward | High | Treat bridges as fallback only, prefer compression, and expose warnings; manual bridge editing remains Phase 1C. |
| True geometric union across complex font outlines may be difficult | High | Implement a conservative MVP, test script/bold fonts first, and avoid pretending all fonts are production-perfect. |
| Material thresholds may need shop calibration | Medium | Use documented starting values and keep warnings transparent. |
| Performance may degrade with decorative fonts | Medium | Add limits and timing checks; keep one design at a time. |
| PNG fallback may not reflect welded holes perfectly | Medium | Keep SVG as source of truth and revisit renderer in Phase 1C. |

---

# 14. Recommended Implementation Order

1. Add material profiles and `/api/materials`.
2. Extend request/response models.
3. Add geometry adapter for analysis.
4. Add connected component analysis.
5. Add conservative compression and geometry union implementation.
6. Add structural bridge fallback.
7. Add material validation and scoring.
8. Update SVG/PNG export from post-weld geometry.
9. Add UI material selector and validation panel.
10. Add tests.
11. Update documentation and handoff.
12. Commit and stop for Phase 1B acceptance.

---

# 15. Stop Condition

After this plan is reviewed:

STOP.

Do not begin Phase 1B implementation until the project owner approves this implementation plan.
