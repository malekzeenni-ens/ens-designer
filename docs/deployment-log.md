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
- Phase 1 MVP complete: Yes
