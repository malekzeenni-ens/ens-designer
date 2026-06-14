# Manual Fonts and Runtime Update Handoff

Last updated: 2026-06-14 21:59:49 +01:00

## Summary

This update adds persistent Manual Fonts configuration and fixes local server
startup issues found during validation.

## User-Facing Changes

- Added a `Configuration` tab.
- Added Manual Fonts add/remove controls.
- Manual Fonts are persisted in `fonts/.manual_fonts.json`.
- Designer font dropdowns show `Manual Fonts` as the first option group.
- Seeded 25 frequent fonts:
  - Pacifico
  - Satisfy
  - Fraga Script
  - Ayshana Script
  - Ayalisse
  - Dancing Script
  - josephsophia
  - Anton
  - Blusfarmsy
  - Legendday
  - Shalfolk
  - Sweets Delight DEMO
  - Amsterdam
  - Sprinkle Delicious
  - Whimsy Wonder
  - Blisymind
  - Peanut Butter
  - Besley
  - SignPainter Medium
  - Courgette
  - Lobster
  - Jelly Bean Script - DEMO
  - Manda Script
  - Navisha Script
  - Back to Black Bold Demo

## Runtime Changes

- Backend port changed from `8000` to `8001`.
- Frontend port changed from `5173` to `5174`.
- Backend launcher now uses `.venv313`.
- Frontend tooling changed from Vite 8 / React plugin 6 to:
  - `vite@7.3.5`
  - `@vitejs/plugin-react@5.2.0`
- Added `python-multipart==0.0.20` to backend requirements.

## Relevant Files

- `backend/app/font_loader.py`
  - Adds persisted manual-font manifest helpers.
  - Preserves manual font IDs during duplicate de-duping.
  - Uses path-derived metadata for fast catalog scans.
- `backend/app/api/routes/fonts.py`
  - Adds `GET /api/fonts/manual`.
  - Adds `PUT /api/fonts/manual`.
- `backend/app/models.py`
  - Adds manual-font request/response models.
- `frontend/src/App.tsx`
  - Loads manual fonts at startup.
  - Adds the `Configuration` tab.
- `frontend/src/components/ConfigurationPanel.tsx`
  - Adds UI for adding/removing manual fonts.
- `frontend/src/components/CakeTopperPanel.tsx`
  - Adds `Manual Fonts` as the first dropdown group.
- `frontend/src/services/generationApi.ts`
  - Adds manual-font API calls.
- `frontend/src/types/design.ts`
  - Adds manual-font response type.
- `frontend/src/styles.css`
  - Adds Configuration tab styles.
- `frontend/vite.config.ts`
  - Uses frontend port `5174`.
  - Proxies `/api` to `http://127.0.0.1:8001`.
- `ens_launch.ps1`
  - Starts backend from `.venv313`.
  - Opens `http://127.0.0.1:5174`.
- `fonts/.manual_fonts.json`
  - Persistent manual-font seed list.
- `fonts/Courgette,Lobster/`
  - Adds Courgette and Lobster font files and OFL license files.

## Verification

Last verified: 2026-06-14 21:59:49 +01:00

- Backend syntax check passed:
  - `.venv313\Scripts\python.exe -m py_compile backend\app\font_loader.py backend\app\api\routes\fonts.py backend\app\models.py`
- Backend running:
  - `http://127.0.0.1:8001/api/fonts` returned `1141` fonts.
  - `http://127.0.0.1:8001/api/fonts/manual` returned `25` manual fonts.
- Frontend running:
  - Vite served on `http://127.0.0.1:5174`.
  - Frontend proxy `http://127.0.0.1:5174/api/fonts/manual` returned `25` manual fonts.

## Known Follow-Up

- `npm.cmd run build` still timed out in this Dropbox workspace, despite the
  dev server working. Re-test build outside Dropbox or after dependency/cache
  cleanup if a production bundle is needed.
