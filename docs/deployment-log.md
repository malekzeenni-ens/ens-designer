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
