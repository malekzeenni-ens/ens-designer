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

## [2026-06-20 22:21:00 Europe/London] - Update Manual Fonts Manifest

### Commit
- Commit hash: `PENDING`
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
git revert PENDING
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

