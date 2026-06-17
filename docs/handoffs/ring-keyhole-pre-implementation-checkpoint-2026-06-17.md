# Ring / Keyhole Feature - Pre-Implementation Checkpoint

Timestamp: 2026-06-17 19:37:52 +01:00

## Objective

Implement a single Ring / Keyhole option for the Cake Topper Designer so designs can be prepared as keychains, hanging charms, bag tags, or ornaments.

The feature will add a reinforced circular tab with a real circular hole through it. It will follow the existing stake patterns for configuration, metadata, preview overlays, drag movement, canvas fitting, and SVG export.

## Rollback Scope

If rollback is needed, revert only the files listed below unless later documentation says otherwise.

Planned changed files:

- `backend/app/models.py`
- `backend/app/cake_topper_engine.py`
- `frontend/src/types/design.ts`
- `frontend/src/services/generationApi.ts`
- `frontend/src/components/CakeTopperPanel.tsx`
- `frontend/src/components/PreviewPanel.tsx`
- `frontend/src/styles.css`
- `tests/test_cake_topper.py`

Planned new documentation files:

- `docs/handoffs/ring-keyhole-pre-implementation-checkpoint-2026-06-17.md`
- `docs/handoffs/ring-keyhole-implementation-completion-2026-06-17.md`

Existing unrelated dirty files at this checkpoint:

- `backend/data/cake_topper_history.json`
- `fonts/.uploaded_manifest.json`
- `docs/architecture/FULL_IMPLEMENTATION_ARCHITECTURE_REVIEW.md`
- `docs/architecture/MANUAL_FONTS_CONFIGURATION_IMPLEMENTATION_REVIEW.md`

These unrelated files should not be reverted as part of this feature rollback unless explicitly requested.

## Checkpoints

### Checkpoint 1 - Data Model

Add backend and frontend ring config/metadata types.

Rollback target:

- Revert model/type changes in `backend/app/models.py` and `frontend/src/types/design.ts`.

### Checkpoint 2 - Backend Geometry

Add ring validation and geometry generation in `backend/app/cake_topper_engine.py`.

Expected backend behavior:

- Default disabled ring.
- Enabled ring uses 12 mm outer diameter, 5 mm hole diameter, and 5 mm overlap.
- Wall thickness is calculated as `(outer_diameter_mm - hole_diameter_mm) / 2`.
- Unsafe settings produce warnings.
- Ring is integrated with the backing/outline layer when outline is enabled.
- Hole is real vector geometry, not a white preview-only circle.
- Canvas fitting includes ring geometry.

Rollback target:

- Revert `cake_topper_engine.py` to the previous stake/outline-only behavior.

### Checkpoint 3 - Frontend Wiring

Add request payload support, UI controls, metadata display, and drag overlay support.

Rollback target:

- Revert changes in `generationApi.ts`, `CakeTopperPanel.tsx`, `PreviewPanel.tsx`, and `styles.css`.

### Checkpoint 4 - Tests

Add backend regression tests for ring disabled/enabled/defaults, validation, SVG geometry, offsets, canvas fitting, and positions.

Rollback target:

- Remove the ring-specific test class from `tests/test_cake_topper.py`.

## Production Defaults

- `enabled`: `false`
- `position`: `top-left`
- `outer_diameter_mm`: `12`
- `hole_diameter_mm`: `5`
- `min_wall_thickness_mm`: `3`
- `min_neck_width_mm`: `5`
- `overlap_mm`: `5`
- `x_offset_mm`: `0`
- `y_offset_mm`: `0`

## Implementation Notes

- Keep the feature single-ring only.
- Do not refactor unrelated code.
- Do not change existing stake behavior.
- Keep all measurements in millimetres.
- Prefer warning-based validation, matching the current Cake Topper response style.
- Do not create the hole as a visual-only white circle.
