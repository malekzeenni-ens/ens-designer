# Ring / Keyhole + Favicon Deployment Note

Timestamp: 2026-06-17 20:21:10 +01:00

## Scope

This note documents the final state before deploying the Ring / Keyhole feature and favicon work to GitHub `main`.

## Feature Summary

### Ring / Keyhole

Implemented a single keychain ring/keyhole option for the Cake Topper Designer.

The feature:

- Adds a real vector keyhole to the outline/backing layer.
- Uses production-safe defaults:
  - 12 mm reinforced tab diameter.
  - 5 mm hole diameter.
  - 5 mm overlap into the backing layer.
- Subtracts the internal hole as real cut geometry.
- Avoids white-circle preview hacks.
- Supports positions:
  - top-left
  - top-centre
  - top-right
  - custom
- Supports X/Y offsets.
- Supports preview dragging.
- Returns ring metadata and warnings.
- Expands/rebases the SVG canvas when the ring moves beyond the original design bounds.
- Leaves existing outline behavior intact.

### UI Placement Update

Moved the Ring / Keyhole controls from **Create design** to **Layout** because the feature modifies backing/outline layout geometry rather than text creation.

Updated wording:

- `Outer tab` was renamed to `Reinforced tab`.
- UI copy now clarifies that the reinforced tab is only the acrylic around the keychain hole.

### Favicon

Added a vector favicon:

- Location: `frontend/public/brand/favicon.svg`
- Concept: acrylic keychain/tag silhouette with a hole and shine mark.
- Linked from `frontend/index.html`.

## Documentation Added

- `docs/handoffs/ring-keyhole-pre-implementation-checkpoint-2026-06-17.md`
- `docs/handoffs/ring-keyhole-implementation-completion-2026-06-17.md`
- `docs/handoffs/ring-keyhole-and-favicon-deployment-2026-06-17.md`

## Files Included In Deployment

- `backend/app/models.py`
- `backend/app/cake_topper_engine.py`
- `frontend/src/types/design.ts`
- `frontend/src/services/generationApi.ts`
- `frontend/src/components/CakeTopperPanel.tsx`
- `frontend/src/components/PreviewPanel.tsx`
- `frontend/src/styles.css`
- `frontend/index.html`
- `frontend/public/brand/favicon.svg`
- `tests/test_cake_topper.py`
- `docs/handoffs/ring-keyhole-pre-implementation-checkpoint-2026-06-17.md`
- `docs/handoffs/ring-keyhole-implementation-completion-2026-06-17.md`
- `docs/handoffs/ring-keyhole-and-favicon-deployment-2026-06-17.md`

## Files Explicitly Excluded

These files were dirty before this deployment work or are unrelated to this feature and should not be included in the commit:

- `backend/data/cake_topper_history.json`
- `fonts/.uploaded_manifest.json`
- `docs/architecture/FULL_IMPLEMENTATION_ARCHITECTURE_REVIEW.md`
- `docs/architecture/MANUAL_FONTS_CONFIGURATION_IMPLEMENTATION_REVIEW.md`

## Verification

Commands run during implementation:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
npm.cmd run build
```

Results:

- Full backend test suite: `188 passed, 1 warning`
- Frontend production build: passed

Commands run after moving Ring / Keyhole to Layout:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\test_cake_topper.py -q
npm.cmd run build
```

Results:

- Cake Topper tests: `67 passed, 1 warning`
- Frontend production build: passed

The remaining warning is an existing FastAPI/Starlette testclient deprecation warning and is unrelated to this feature.

## Rollback Notes

Use the step-by-step rollback checkpoints in:

- `docs/handoffs/ring-keyhole-pre-implementation-checkpoint-2026-06-17.md`
- `docs/handoffs/ring-keyhole-implementation-completion-2026-06-17.md`

For a full rollback of this deployment, revert the Git commit that includes this note.
