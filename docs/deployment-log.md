# Deployment Log

This file records timestamped implementation snapshots for ENS Designer.

Each completed phase or meaningful code change must include:
- Timestamp
- Commit hash
- Branch
- Summary
- Files changed
- Tests run
- Manual validation
- Known issues
- Revert instructions

---

## [2026-07-12 22:26:00 Europe/London] - Configuration: Font Management and Font Library Additions

### Commits
- Font library commit: `861f409`
- Font management feature commit: `7a57330`
- Previous known-good commit: `b5f945b`
- Branch: `main`
- Deployment target: `main`

### Summary
- Converted the Configuration page's Manual Fonts section into an accessible accordion while preserving its add, search, and remove controls.
- Added a Font Management accordion with library search, 12-item pagination, per-font selection, select-current-page, and confirmed multi-select deletion.
- Added a bulk font deletion API. Deletion persists an app-level exclusion instead of deleting project or Windows system font files, removes deleted IDs from manual/upload manifests, and allows a later upload to restore an excluded font.
- Added Clarendon Regular, Old English Text MT, and Snell Roundhand Black/Bold font files; added Clarendon to the saved Manual Fonts list.

### Files Changed
- `backend/app/api/routes/fonts.py`
- `backend/app/font_loader.py`
- `backend/app/models.py`
- `frontend/src/App.tsx`
- `frontend/src/components/ConfigurationPanel.tsx`
- `frontend/src/services/generationApi.ts`
- `frontend/src/styles.css`
- `tests/test_font_management.py`
- `fonts/.manual_fonts.json`
- `fonts/Clarendon Regular.otf`
- `fonts/oldenglishtextmt.ttf`
- `fonts/snellroundhand_black.otf`
- `fonts/snellroundhand_bold.otf`

### Tests Run
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 205 tests, 1 third-party Starlette deprecation warning.
- `npm.cmd run build` (frontend) - Passed: TypeScript and Vite production build.
- `npm.cmd test` (frontend) - Passed: 13 files, 41 tests.

### Manual Validation
- Confirmed the deletion design never removes underlying font binaries, including Windows system font files.
- Confirmed deletion cleans Manual Fonts and uploaded-font manifest references, persists excluded IDs, ignores unknown/duplicate IDs safely, and supports restoring an excluded font through a later upload.

### Revert Instructions
```bash
git revert 7a57330
git revert 861f409
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-26 20:45:00 Europe/London] - Cake Topper: Per-Line Stroke Buffer

### Commit
- Commit hash: `e2675b6`
- Previous commit hash: `4e42cb5`
- Branch: `main`
- Deployment target: `main`

### Summary
- Added a per-line "stroke buffer" control that thickens thin strokes (e.g. script fonts) before cutting, to reduce font fragility. Wired end-to-end: backend model field → engine geometry buffering → frontend line state → API payload → UI control. Also hardened the engine's buffering fallback so failures surface as response warnings instead of failing silently.

### Files Changed
- `backend/app/models.py`
- `backend/app/cake_topper_engine.py`
- `frontend/src/components/CakeTopperPanel.tsx`
- `frontend/src/types/design.ts`
- `tests/test_cake_topper.py`

### Implementation Details
- `CakeTopperLineConfig.stroke_buffer_mm: float` added with `ge=0.0, le=0.6` validation.
- `_buffer_line_paths` unions a line's closed glyph paths and grows them outward by `buffer_mm` via Shapely; applied after floating-offset application and before bounds recalculation, so floating-component detection (dots/accents) runs on the un-buffered geometry as before.
- **Hardening**: `_buffer_line_paths` now returns `(paths, warning | None)` instead of silently falling back to unbuffered paths on failure (no closed shapes, union/buffer exception, empty result, or unconvertible result). The caller appends any warning to the line's `warnings` list (same pattern as missing-glyph warnings) so the user sees it in the response instead of only in server logs.
- Frontend: `LineState.strokeBufferMm` added alongside a `clampStrokeBufferMm` helper (clamps to `[0, 0.6]`, matching the backend range) used both on blur and when building the API payload, so out-of-range or non-numeric input can never reach the backend unclamped.
- Reviewed downstream consumers of `geometry.glyphs[].path_ids` (bridge overrides, connectivity engine) and confirmed they're only used by the separate `generation_service.py` flow, not by `cake_topper_engine.py` — so the buffered geometry's new path IDs (which don't match the original glyph `path_ids`) can't cause stale-reference bugs in this feature.

### Tests Run
- `.\.venv313\Scripts\python.exe -m pytest tests/test_cake_topper.py -q` - Passed: 74 tests (7 stroke-buffer-specific, including a new unit test for the no-closed-paths warning path and a regression test asserting no spurious warning on the normal buffered path).
- `npx tsc --noEmit` (frontend) - Passed.
- `npm run build` (frontend) - Passed.
- `npx vitest run` (frontend) - 31 passed / 10 failed; failures confirmed pre-existing on unmodified `main` (jsdom/`DOMParser`/`document` not configured in those test files) via `git stash` comparison, unrelated to this change.

### Manual Validation
- Verified via code reading that the buffer step runs after manual per-glyph floating offsets and before bounds recalculation, and that no other code path in `cake_topper_engine.py` relies on the pre-buffer glyph `path_ids` once buffering has replaced a line's paths.
- Did not exercise the UI in a browser this session (no dev server launch requested); typecheck, build, and backend tests are the verification basis for the frontend change.

### Known Issues / Follow-Ups
- A sufficiently large stroke buffer can merge separate letterforms or close letter counters (e.g. "o", "e") into a solid blob — this is expected/intended (it's literally what "reinforce thin strokes" requires), but isn't covered by an automated regression test; the 0.6mm cap keeps this within a reasonable range for typical font weights.
- Pre-existing frontend test environment gaps (jsdom not wired up for several test files) remain unaddressed; out of scope for this change.

### Revert Instructions
```bash
git revert e2675b6
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-22 13:30:00 Europe/London] - Sizing Assistant: Cake Preview Prominence and Proportion Fixes

### Commit
- Commit hash: `2b6573f`
- Previous commit hash: `947877a`
- Branch: `main`
- Deployment target: `main`

### Summary
- Redesigned the Sizing Assistant cake preview canvas per user feedback ("make the cake more prominent, cleaner, more user-friendly") and fixed two correctness bugs surfaced during that work: a vertical-proportion distortion on non-square canvases, and a sticky-panel scroll overlap.

### Files Changed
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Cake-to-canvas width scaling now interpolates between 60%-92% of the canvas based on cake diameter (was a flat ratio against the largest cake size, 31%-78%), so every cake size from 4in-10in renders as a visually prominent shape instead of shrinking for smaller selections.
- Removed the redundant top-right "X mm diameter" circular chip; the on-cake width label already conveys this and is now more legible (solid border, navy text).
- Richer cake styling: deeper cream/tan gradient, stronger inset/drop shadow, and a new grounding shadow beneath the cake; halved the background grid-line opacity and trimmed canvas height (max 500px to 420px) to reduce dead space.
- **Proportion bug**: the design/stake overlays converted mm to a canvas-height percentage using a width-based mm-to-percent scalar, which silently distorted vertical proportions whenever the canvas wasn't square. Added a `ResizeObserver` on the scene element to track its real width/height ratio and apply that correction to every height-from-mm conversion.
- **Scroll-overlap bug**: `.sa-preview-panel` was `position: sticky`, but it shares a single-column flow with `SizingRecommendationCard` below it (not a separate sidebar), so it was sticking and visually overlapping that card while scrolling. Removed the sticky positioning and the now-redundant mobile media-query override.
- Removed the stake guide's gray fill background per user feedback ("the stake shadow makes no sense") - it's now a dashed outline only.

### Tests Run
- `npx vitest run --environment jsdom` - Passed: 13 files, 41 tests.
- `npm run build` - Passed.

### Manual Validation
- Verified via code inspection (no browser/screenshot tool available in this session) that: the topper-to-cake size ratio across cake sizes matches the `topperSizingRules` bands in `sizingRules.ts` (e.g. monogram topper ~71-79% of cake diameter depending on size), stake depths match `stakeRules.depths`, and the export path (`SizingRecommendationCard.downloadSvg`) is unaffected by these preview-only changes - the user confirmed this via screenshots at all four cake sizes.

### Known Issues
- None outstanding from this change. A possible left-edge clipping of the design box at very small cake sizes was flagged to the user as worth checking live in-browser; not reproduced or fixed since it could not be confirmed as a real bug vs. a screenshot crop.

### Revert Instructions
- `git revert 2b6573f`

### Snapshot Status
Yes

---

## [2026-06-21 23:05:00 Europe/London] - Frontend Remediation: Memory Leaks, State-Sync Gaps, Silent Failures (Batches 4-6)

### Commit
- Commit hash: `0028e73`
- Previous commit hash: `ab5ed05`
- Branch: `main`
- Deployment target: `main`

### Summary
- Implemented Batches 4-6 of `docs/Regression Testing.md`: frontend memory-leak fixes, state-sync/validation gaps, and silent-failure fixes from the 2026-06-20/21 full-codebase audit.

### Files Changed
- `frontend/src/App.tsx`, `frontend/src/App.retry.test.tsx`
- `frontend/src/components/CakeTopperPanel.tsx`, `frontend/src/components/CakeTopperPanel.historyError.test.tsx`
- `frontend/src/components/GlyphBrowserDrawer.tsx`, `frontend/src/components/GlyphBrowserDrawer.fontFace.test.tsx`
- `frontend/src/components/OverlapPanel.tsx`, `frontend/src/components/OverlapPanel.fontResync.test.tsx`
- `frontend/src/components/PreviewPanel.tsx`
- `frontend/src/config/cakeTopperFontRecommendations.test.ts`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`, `frontend/src/features/sizing-assistant/components/SizingAssistantTab.previewUrl.test.tsx`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/features/sizing-assistant/components/UploadDesignControl.tsx`
- `frontend/src/features/sizing-assistant/engine/calculateSizingRecommendation.ts`
- `frontend/src/features/sizing-assistant/tests/calculateSizingRecommendation.test.ts`

### Implementation Details
- **F4.1/F4.2**: `UploadDesignControl`/`SizingAssistantTab` now revoke the previous preview blob URL whenever it changes and on unmount, instead of leaking it on re-upload or tab navigation.
- **F4.3**: `GlyphBrowserDrawer` now calls `document.fonts.delete()` for a loaded `FontFace` when the font selection changes or the drawer unmounts, instead of accumulating faces in `document.fonts` indefinitely.
- **F4.4**: documented (comment-only) that `PreviewPanel`'s direct DOM mutation during drag is an intentional 60fps perf optimization, per the confirmed decision — no behavior change.
- **F5.1/F5.2**: `CakeTopperPanel`'s default font selection now re-syncs via a dedicated effect once `fonts`/`manualFonts` arrive asynchronously, instead of locking in whichever list happened to be loaded at mount; `resetDesigner` now reuses the same shared `pickDefaultFontId` helper instead of duplicating the fallback expression.
- **F5.3**: extracted the duplicated scale-back-out formula from `SizingPreviewPanel` and `SizingRecommendationCard` into one exported `getScaledExportDimensions` function in `engine/calculateSizingRecommendation.ts`, so preview and export can no longer silently desync.
- **F5.4**: `UploadDesignControl.processFile` now wraps its body in try/catch, surfacing a file-read failure as the existing upload-error UI instead of an unhandled promise rejection.
- **F5.6**: confirmed (no code change needed) that manual override fields already lock to the user-edited value once set, independent of later recommendation recalculation, since `manualOverride` state is only mutated by this component's own handlers or reset on a new upload — matches the existing "Locked" UI affordance. Added a regression test pinning this behavior.
- **F5.7**: fixed `OverlapPanel`'s auto-select-first-visible-font effect to include `fontId` in its dependency array and removed the `eslint-disable`.
- **F6.1**: `CakeTopperPanel`'s fire-and-forget history-record call now logs the failure via `console.error` with the export filename and error, instead of silently swallowing it.
- **F6.2**: `App.tsx`'s font-load error screen now includes a "Retry" button that re-triggers `reloadFonts` instead of leaving a dead end.
- **F6.3/F6.4**: documentation-only comments added (no behavior change) noting `callApi`'s internal-error-handling contract and the intentional extensionless-filename fallthrough.
- **Deferred (documented in `docs/Regression Testing.md`)**: F5.5 (mismatched-unit dimension parsing) was deferred per explicit instruction, since it would newly block currently-working uploaded files.

### Tests Run
- `npx vitest run --environment jsdom` - Passed: 13 files, 41 tests (up from 32).
- `npm run build` - Passed.

### Manual Validation
- Reviewed each new test to confirm it exercises the real cleanup/lock/retry path (blob URL revoke counts, `document.fonts.delete` counts, override-value persistence across a product-type change, retry button re-invoking `fetchFonts`) rather than asserting only on mocked internals.

### Known Issues / Follow-Ups
- F5.5 remains deferred; see "Deferred Items" section of `docs/Regression Testing.md`.
- Memory-leak fixes (F4) were verified via the new revoke/delete-count regression tests, not a live Chrome DevTools heap snapshot.

### Revert Instructions
```bash
git revert 0028e73
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-21 23:00:00 Europe/London] - Backend Remediation: Font ID Stability, History Crash, Exception Handling (Batches 1-3)

### Commit
- Commit hash: `cd24ccd`
- Previous commit hash: `e0f1985`
- Branch: `main`
- Deployment target: `main`

### Summary
- Implemented Batches 1-3 of `docs/Regression Testing.md`, the remediation plan from the 2026-06-20/21 full-codebase audit: backend `font_id` stability, a history-store crash fix, and consistent exception handling across routes and the geometry/font-loading layers.

### Files Changed
- `backend/app/api/routes/cake_topper.py`
- `backend/app/api/routes/fonts.py`
- `backend/app/api/routes/generation.py`
- `backend/app/api/routes/overlap.py`
- `backend/app/cake_topper_engine.py`
- `backend/app/connectivity_engine.py`
- `backend/app/font_loader.py`
- `backend/app/history_store.py`
- `backend/app/png_exporter.py`
- `backend/app/shapely_converter.py`
- `docs/Regression Testing.md`
- `fonts/.manual_fonts.json`
- `tests/test_font_id_migration.py`
- `tests/test_history_store_malformed.py`
- `tests/test_route_error_handling.py`

### Implementation Details
- **B1.1**: `font_id` now derives from a SHA1 hash of file content instead of the resolved absolute path, so re-hosting/cloning/syncing the project no longer invalidates every manual/uploaded font reference. A one-time migration on manifest load remaps any old path-hash IDs to the new content-hash IDs by filename match, rewriting `fonts/.manual_fonts.json` in place (visible in this commit's diff) and logging a warning for any ID that can't be remapped.
- **B1.2**: `history_store.py` now wraps per-entry `HistoryEntry(**e)` construction in try/except, skipping and logging malformed entries (with a count) instead of letting one bad row 500 the whole `/api/cake-topper/history` endpoint.
- **B2.1-B2.5**: route handlers (`cake_topper`, `fonts`, `generation`, `overlap`) and engine call sites now use a consistent exception-handling convention instead of narrow or overly-broad catches.
- **B2.6-B2.7**: `font_loader.py` manifest reads now catch specific `(json.JSONDecodeError, OSError)` exceptions with a logged warning instead of swallowing all exceptions as "no manual fonts."
- **B2.8-B2.9**: `shapely_converter.py` geometry operations now catch specific Shapely/value exceptions and log when geometry is dropped, instead of silently discarding it.
- **B3.1-B3.7**: `fonts.py` duplicate-upload race, `history_store.py` write locking, `connectivity_engine.py` dead-code review, and `cake_topper_engine.py`/`outline_extractor.py` bare-except narrowing and logging were addressed per the plan's low-severity cleanup items.
- **B3.8**: confirmed `fontStructuralScores.json` is wired into `cakeTopperFontRecommendations.ts` on the frontend (font fragility scoring is a live feature) and added a regression test pinning the integration.
- **Deferred (documented in `docs/Regression Testing.md`)**: B2.10/B2.11 (promoting the ring `overlap_mm` 4.0mm minimum from a warning to a hard 422 rejection) was deferred per explicit instruction, since it would newly reject currently-working saved/uploaded designs.

### Tests Run
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 196 tests (up from 188), 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Reviewed the `fonts/.manual_fonts.json` diff to confirm the B1.1 migration remapped every existing manual font ID by filename match with no entries dropped.
- Reviewed route/engine diffs to confirm no behavior change beyond exception specificity and logging (no new 422/500 status changes introduced, consistent with B2.10/B2.11 being deferred).

### Known Issues / Follow-Ups
- B2.10/B2.11 and F5.5 remain deferred; see "Deferred Items" section of `docs/Regression Testing.md`.
- Fonts renamed *and* moved simultaneously with this fix still require manual re-curation (filename match fails) — documented residual gap.

### Revert Instructions
```bash
git revert cd24ccd
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 22:21:00 Europe/London] - Update Manual Fonts Manifest

### Commit
- Commit hash: `ff1542f`
- Previous commit hash: `2232496`
- Branch: `main`
- Deployment target: `main`

### Summary
- Committed `fonts/.manual_fonts.json` manifest update to clean the worktree; 5 additional font IDs were added to the manually-curated font list.

### Files Changed
- `fonts/.manual_fonts.json`

### Implementation Details
- `fonts/.manual_fonts.json` is the persisted manifest read/written by `backend/app/font_loader.py` (`MANUAL_FONTS_MANIFEST`) to track manually-curated font IDs surfaced in the font picker.
- The file had drifted from a prior local session (manual font curation via the running app) and was left uncommitted; no code change was made, only the data file is being checked in.
- No application code was changed in this commit.

### Tests Run
- `npm test` (frontend) - Passed: 7 files, 32 tests.
- `.\.venv313\Scripts\python.exe -m pytest -q` (backend) - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Confirmed `fonts/.manual_fonts.json` is tracked in git (not in `.gitignore`) and the diff only adds 5 new font ID entries.

### Known Issues / Follow-Ups
- None.

### Revert Instructions
```bash
git revert ff1542f
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 21:22:00 Europe/London] - Move Sizing Preview Above Recommendation

### Commit
- Commit hash: `a6dd114`
- Previous commit hash: `6923cc7`
- Branch: `main`
- Deployment target: `main`

### Summary
- Swapped the Sizing Assistant main-column order so the preview canvas renders above the Recommendation card.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`

### Implementation Details
- Reordered `SizingPreviewPanel` before `SizingRecommendationCard` inside the `sa-main-panel` column.
- No CSS changes required since the column already stacks children vertically.
- Sizing calculations, warnings, status logic, and export behavior were intentionally unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 32 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.

### Manual Validation
- Reviewed the diff to confirm the change is scoped to component render order in `sa-main-panel`.

### Known Issues / Follow-Ups
- Browser screenshot verification was not automated for this layout adjustment.

### Revert Instructions
```bash
git revert a6dd114
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 20:40:03 Europe/London] - Clarify Uploaded Stake Sizing Preview

### Commit
- Commit hash: `1f63d776cccadcb6d660b1fe4f91e5812802d326`
- Previous commit hash: `1e331cd595257d218a98317b8024642f193cf448`
- Branch: `main`
- Deployment target: `main`

### Summary
- Added explicit controls for uploaded SVGs that already include stake geometry, improved transparent preview rendering, and shifted the default topper placement higher/right on the cake preview.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/features/sizing-assistant/components/UploadDesignControl.tsx`
- `frontend/src/features/sizing-assistant/engine/sizingTypes.ts`
- `frontend/src/styles.css`

### Implementation Details
- Added a sizing-area mode so operators can keep the full uploaded SVG, or size from visible artwork when the uploaded file already contains a stake.
- Added a visible artwork height percentage slider for stake-included uploads.
- Recommendations now use the selected sizing area, while export scales the full SVG proportionally so existing stake geometry remains intact.
- Updated the size comparison card to distinguish uploaded design, sizing area, recommended visible cut size, and exported SVG size.
- Updated the recommended preview dimensions to show the full exported SVG size when uploaded stake geometry is being ignored for recommendation.
- Made the SVG preview wrapper transparent and moved the default preview placement higher/right.
- Intentionally did not add automatic stake or geometry detection.

### Tests Run
- `npm test` - Passed: 7 files, 32 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Confirmed `http://127.0.0.1:5174` returned HTTP 200 from the local Vite server.
- Reviewed the Sizing Assistant diff to confirm the change is scoped to upload sizing, preview placement, recommendation labels, and SVG export dimensions.
- Checked that Phase 1 geometry exclusions are preserved; stake handling remains operator-controlled.

### Known Issues / Follow-Ups
- The app does not automatically detect where the uploaded stake begins; operators must enable "Ignore uploaded stake for sizing" and adjust visible artwork height manually.
- Browser screenshot verification was not automated for this visual adjustment.

### Revert Instructions
```bash
git revert 1f63d776cccadcb6d660b1fe4f91e5812802d326
```

### Snapshot Status
- Known-good snapshot: Yes
- Phase 1 MVP complete: Yes

---

## [2026-06-20 18:20:53 Europe/London] - Phase 1 Complete: Sizing Assistant MVP

### Commit
- Commit hash: `b28575ce02f63445a0a7946e8435b9150655edbf`
- Previous commit hash: `ef79d4c306ffcfdb9a8ca8f71c25fcf93bb35b75`
- Branch: `main`
- Deployment target: `main`

### Summary
- Implemented the ENS Designer Sizing Assistant Phase 1 MVP as an isolated frontend feature.

### Files Changed
- `docs/deployment-log.md`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `frontend/src/features/sizing-assistant/components/ManualOverrideControls.tsx`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`
- `frontend/src/features/sizing-assistant/components/SizingInputPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/features/sizing-assistant/components/UploadDesignControl.tsx`
- `frontend/src/features/sizing-assistant/components/WarningList.tsx`
- `frontend/src/features/sizing-assistant/engine/buildSizingWarnings.ts`
- `frontend/src/features/sizing-assistant/engine/calculateAspectRatioCategory.ts`
- `frontend/src/features/sizing-assistant/engine/calculateSizingRecommendation.ts`
- `frontend/src/features/sizing-assistant/engine/calculateSizingStatus.ts`
- `frontend/src/features/sizing-assistant/engine/calculateStakeRecommendation.ts`
- `frontend/src/features/sizing-assistant/engine/exportResizedSvg.ts`
- `frontend/src/features/sizing-assistant/engine/filenameUtils.ts`
- `frontend/src/features/sizing-assistant/engine/parseDesignDimensions.ts`
- `frontend/src/features/sizing-assistant/engine/sizingRules.ts`
- `frontend/src/features/sizing-assistant/engine/sizingTypes.ts`
- `frontend/src/features/sizing-assistant/tests/buildSizingWarnings.test.ts`
- `frontend/src/features/sizing-assistant/tests/calculateAspectRatioCategory.test.ts`
- `frontend/src/features/sizing-assistant/tests/calculateSizingRecommendation.test.ts`
- `frontend/src/features/sizing-assistant/tests/calculateSizingStatus.test.ts`
- `frontend/src/features/sizing-assistant/tests/calculateStakeRecommendation.test.ts`
- `frontend/src/features/sizing-assistant/tests/exportResizedSvg.test.ts`
- `frontend/src/features/sizing-assistant/tests/parseDesignDimensions.test.ts`

### Implementation Details
- Added a new Sizing Assistant tab to the existing React workspace navigation.
- Added SVG and PNG upload handling, including SVG viewBox parsing, width/height fallback parsing, PNG IHDR dimension parsing, manual dimension entry, and PNG preview-only warnings.
- Added configurable sizing rules for cake sizes, product types, materials, design uses, font categories, aspect ratio categories, height limits, warning thresholds, and stake depth guidance.
- Added pure sizing engine modules for aspect ratio calculation, category detection, product-specific recommendation, height-limited scaling, manual override with locked aspect ratio, structured warnings, deterministic status, stake recommendation, filename generation, and resized SVG export.
- Added a three-panel UI: inputs, visual cake-fit preview, and recommendation/export card.
- Added Vitest and jsdom for frontend engine tests.
- Added tests for aspect ratio boundaries, cake size conversion, SVG/PNG dimension parsing, product sizing, height-limit adjustment, manual override proportional scaling, warning generation, status precedence, stake recommendation, and SVG export dimensions.
- Intentionally did not add geometry safety analysis, weld validation, stroke detection, bridge detection, text recognition, AI suggestions, batch sizing, Shopify integration, or customer-facing preview.
- Existing Designer generation/export behavior was not modified beyond adding a new workspace tab.

### Tests Run
- `npm test` - Passed: 7 files, 31 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Confirmed the new tab is isolated from the existing Designer API flow.
- LightBurn validation not performed in this environment.

### Known Issues / Follow-Ups
- `npm install` reported 1 low severity advisory in the frontend dependency tree.
- LightBurn import validation still needs to be performed with a real exported SVG.

### Revert Instructions
```bash
git revert b28575ce02f63445a0a7946e8435b9150655edbf
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 19:52:23 Europe/London] - Rework Sizing Assistant Canvas Layout

### Commit
- Commit hash: `d3a8a2da0223a69f04359fc2183422af8cc7e427`
- Previous commit hash: `2346f5b5a8b2ed84a601d9916d049b4bb278256d`
- Branch: `main`
- Deployment target: `main`

### Summary
- Moved the recommendation panel into the main top row and expanded the preview/canvas area.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Changed Sizing Assistant from a three-column layout to a left input column plus a wider main column.
- Moved the recommendation card above the preview canvas inside the main column.
- Added collapsible accordions for size comparison, recommendation details, warnings, suggested actions, and export options.
- Kept the size comparison accordion open by default and warnings open when warnings exist.
- Updated responsive layout so the assistant stacks cleanly on narrower screens.
- Sizing rules, export logic, preview controls, and Designer generation behavior were intentionally unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 32 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed changed files and confirmed the update is scoped to Sizing Assistant UX layout.

### Known Issues / Follow-Ups
- Browser screenshot verification was not automated for this layout adjustment.

### Revert Instructions
```bash
git revert d3a8a2da0223a69f04359fc2183422af8cc7e427
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 19:43:13 Europe/London] - Clarify Current And Recommended Sizes

### Commit
- Commit hash: `213469eadbd4a2215f424fe1cf40fd286813ddcb`
- Previous commit hash: `5ed4a94fa0320f82c7d6cfc2e24fa6fff15962e9`
- Branch: `main`
- Deployment target: `main`

### Summary
- Added an explicit size comparison section so uploaded dimensions, recommended cut size, and export size are visible together.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Added a `Size comparison` panel to the recommendation card.
- Shows uploaded design dimensions and whether they represent physical size or proportions only.
- Shows recommended cut size in millimetres.
- Shows actual export size, including larger canvas dimensions when preview-placement export is enabled.
- Added explanatory copy for unitless SVGs: detected dimensions define proportions only, while final cut size comes from recommendation or manual override.
- Updated preview labels to `Recommended preview width`, `Recommended preview height`, `Uploaded proportions`, and `Original proportions only`.
- Sizing calculations and export logic were intentionally unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 32 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed changed files and confirmed the update is scoped to Sizing Assistant sizing clarity.

### Known Issues / Follow-Ups
- None.

### Revert Instructions
```bash
git revert 213469eadbd4a2215f424fe1cf40fd286813ddcb
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 19:31:38 Europe/London] - Add Sizing Assistant Export Mode Clarity

### Commit
- Commit hash: `188a5f752ae216189d24c8b35afdec8e3138bff9`
- Previous commit hash: `6de812d9b24ddab532ea87007a705e5cb9eb3515`
- Branch: `main`
- Deployment target: `main`

### Summary
- Clarified Sizing Assistant preview/export behavior and added an optional preview-placement SVG export mode.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/features/sizing-assistant/components/SizingRecommendationCard.tsx`
- `frontend/src/features/sizing-assistant/engine/exportResizedSvg.ts`
- `frontend/src/features/sizing-assistant/tests/exportResizedSvg.test.ts`
- `frontend/src/styles.css`

### Implementation Details
- Added an explicit export option to include preview placement and angle in the exported SVG.
- Kept the default export as the resized original SVG for production-safe continuity.
- Added explanatory copy that placement export uses a larger layout canvas and that stake guides are advisory unless the uploaded SVG already includes stake geometry.
- Updated preview labels from `Reference only` to `Original proportions only`.
- Added `exportPreviewPlacementSvg` to preserve original vector content inside a transformed group on a millimetre canvas.
- Added test coverage for preview-placement export dimensions, transform, and content preservation.

### Tests Run
- `npm test` - Passed: 7 files, 32 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed changed files and confirmed sizing calculations, status logic, and standard resized export behavior remain available.

### Known Issues / Follow-Ups
- Preview-placement export uses a layout canvas and should be validated in LightBurn/current laser workflow before relying on placement offsets for production.
- Stake guide generation remains advisory; this update does not generate new stake geometry.

### Revert Instructions
```bash
git revert 188a5f752ae216189d24c8b35afdec8e3138bff9
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 18:46:43 Europe/London] - Scale Sizing Preview By Cake Diameter

### Commit
- Commit hash: `91696f93b875b07f69bfa7bcf238c15f7e0aa5d2`
- Previous commit hash: `57838976b47227c94c75621f78dd03298907fbfd`
- Branch: `main`
- Deployment target: `main`

### Summary
- Updated the Sizing Assistant preview so cake size changes are reflected visually on the canvas.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Added a shared visual scale model using 10 inch / 254mm as the maximum preview reference.
- Scaled 4, 6, 8, and 10 inch cake drawings proportionally instead of drawing every cake at the same visual size.
- Scaled recommended topper/charm preview dimensions against the same visual reference as the cake.
- Scaled stake guide height using the same preview scale.
- Renamed the preview toggle to `Preview recommended physical size` for clarity.
- Sizing calculations, warnings, status, manual override dimensions, and SVG export behavior were intentionally unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 31 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed the changed files and confirmed the update is scoped to Sizing Assistant preview presentation.

### Known Issues / Follow-Ups
- Browser screenshot verification was not automated for the visual scale change.

### Revert Instructions
```bash
git revert 91696f93b875b07f69bfa7bcf238c15f7e0aa5d2
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 18:37:16 Europe/London] - Add Interactive Sizing Preview Controls

### Commit
- Commit hash: `17a31b112ca5a492e90abb34014b763d7b4c6810`
- Previous commit hash: `8d57717395c343512c979943f83c8c53bdc4799f`
- Branch: `main`
- Deployment target: `main`

### Summary
- Added draggable/rotatable preview controls and an explicit recommended-size preview toggle for the Sizing Assistant.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingAssistantTab.tsx`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Added preview-only state for recommended-size preview, X/Y placement offset, and rotation angle.
- Reset preview placement when a new design is uploaded.
- Added a `Preview recommended size` toggle so the operator can switch between the recommended physical size preview and a source/reference preview.
- Made the uploaded design draggable inside the front cake preview with bounded placement.
- Added an angle slider and reset button for previewing how the design sits visually on the topper/cake.
- Kept sizing calculations, aspect-ratio locking, warning/status logic, and SVG export dimensions unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 31 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed the changed files and confirmed the update is scoped to Sizing Assistant preview behavior.

### Known Issues / Follow-Ups
- Drag/rotation was not verified with browser screenshot automation.
- Preview placement is visual-only and intentionally does not alter exported SVG dimensions or artwork geometry.

### Revert Instructions
```bash
git revert 17a31b112ca5a492e90abb34014b763d7b4c6810
```

### Snapshot Status
- Known-good snapshot: Yes

---

## [2026-06-20 18:30:47 Europe/London] - Improve Sizing Assistant Preview Perspective

### Commit
- Commit hash: `03446d4e5d48dd7ba77c4ab77d6e69776efa3465`
- Previous commit hash: `faca6912d85f77091b306cda7dd92ad82670873a`
- Branch: `main`
- Deployment target: `main`

### Summary
- Changed the Sizing Assistant visual guide from a dominant top-down cake footprint to a front/elevation cake view.

### Files Changed
- `docs/deployment-log.md`
- `frontend/src/features/sizing-assistant/components/SizingPreviewPanel.tsx`
- `frontend/src/styles.css`

### Implementation Details
- Reworked the centre preview to show a front-facing cake body with top ellipse, cake width label, and smaller plan-reference diameter chip.
- Topper-style products now render the uploaded design above the cake top with a stake depth guide when stake depth applies.
- Charm-style products render the uploaded design on the front cake face.
- Sizing calculations, aspect-ratio locking, warning/status logic, export logic, and existing Designer behavior were intentionally unchanged.

### Tests Run
- `npm test` - Passed: 7 files, 31 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Started the Vite dev server and confirmed `http://127.0.0.1:5174` returned HTTP 200.
- Reviewed the changed files and confirmed the update is scoped to Sizing Assistant preview presentation.

### Known Issues / Follow-Ups
- Browser screenshot verification was not automated for this visual adjustment.
- LightBurn validation is unaffected and still applies to SVG export workflow.

### Revert Instructions
```bash
git revert 03446d4e5d48dd7ba77c4ab77d6e69776efa3465
```

### Snapshot Status
- Known-good snapshot: Yes
- Phase 1 MVP complete: Yes

---

## [2026-06-20 18:27:15 Europe/London] - Add Sizing Source Docs And Font Assets

### Commit
- Commit hash: `03eaa4a26b534b908b1523f2ac0b1ac8b6bed36e`
- Previous commit hash: `37a57fe00947311eca346e273ff86b326127b8e5`
- Branch: `main`
- Deployment target: `main`

### Summary
- Added the Sizing Assistant Phase 1 source-of-truth documents and newly pending font assets.

### Files Changed
- `docs/architecture/ENS_Sizing_Assistant_Phase_1_Implementation_Approach.md`
- `docs/business/ENS_Sizing_Assistant_Phase_1_PSD_FSD.md`
- `fonts/CrimsonPro-Black.ttf`
- `fonts/CrimsonPro-BlackItalic.ttf`
- `fonts/CrimsonPro-Bold.ttf`
- `fonts/CrimsonPro-Bold_1.ttf`
- `fonts/CrimsonPro-Light.ttf`
- `fonts/CrimsonPro-Medium.ttf`
- `fonts/CrimsonPro-Regular.ttf`
- `fonts/CrimsonPro-SemiBold.ttf`
- `fonts/Gabriela-Regular.ttf`
- `fonts/Inika-Bold.ttf`
- `fonts/Inika-Regular.ttf`
- `fonts/Parisienne-Regular.ttf`
- `fonts/Sedan-Italic.ttf`
- `fonts/Sedan-Regular.ttf`

### Implementation Details
- Added the product/functional specification and implementation approach documents used for Sizing Assistant Phase 1.
- Added 14 TTF font files under `fonts/`.
- Verified the pending TTF files can be opened by FontTools and expose family/style metadata.
- Noted that `CrimsonPro-Bold.ttf` and `CrimsonPro-Bold_1.ttf` report the same family/style and byte size, but both were committed because the request was to commit all pending files.
- No application code was changed in this commit.

### Tests Run
- `npm test` - Passed: 7 files, 31 tests.
- `npm run build` - Passed.
- `npm run lint` - Not available: no lint script in `frontend/package.json`.
- `.\.venv313\Scripts\python.exe -m pytest -q` - Passed: 188 tests, 1 existing Starlette/httpx deprecation warning.

### Manual Validation
- Reviewed pending file list before staging.
- Checked the two Markdown source documents open and contain the expected Sizing Assistant Phase 1 headings.
- Checked all 14 pending TTF files with FontTools.

### Known Issues / Follow-Ups
- `CrimsonPro-Bold.ttf` and `CrimsonPro-Bold_1.ttf` appear to be duplicate font assets.

### Revert Instructions
```bash
git revert 03eaa4a26b534b908b1523f2ac0b1ac8b6bed36e
```

### Snapshot Status
- Known-good snapshot: Yes
