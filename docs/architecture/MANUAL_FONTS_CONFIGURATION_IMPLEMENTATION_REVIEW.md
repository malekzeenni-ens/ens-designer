# Manual Fonts Configuration Implementation Review

Last updated: 2026-06-15 00:00:00 +01:00

Audience: solution architect, technical reviewer, or implementation owner.

## Executive Summary

This implementation adds a persistent Manual Fonts capability to EnS Designer.
The user can maintain a project-level shortlist of frequently used fonts from a
new `Configuration` tab. The selected fonts are persisted on disk by the backend,
survive server restarts and browser refreshes, and appear as the first font group
in the Cake Topper Designer font dropdowns.

The implementation also includes runtime hardening discovered during validation:
the backend now runs on Python 3.13, the local backend/frontend ports moved to
`8001` and `5174`, the frontend tooling was pinned to a stable Vite 7 stack, and
font catalog scanning was changed to avoid opening more than 1,300 font binaries
on every catalog request.

## Scope

Built:

- Backend persistent manual-font manifest.
- Backend manual-font API endpoints.
- Frontend Configuration tab.
- Manual Fonts add/remove UI.
- Manual Fonts grouping in Designer dropdowns.
- Seeded 25-font manual list.
- Added Courgette and Lobster font files to the project library.
- Runtime documentation and launcher updates.
- Font catalog startup optimisation.

Not built:

- Multi-user preference storage.
- Database-backed configuration.
- Per-user font preferences.
- Drag-and-drop ordering for manual fonts.
- Full production build remediation for the current Dropbox workspace.

## Technology Stack

Backend:

- Python 3.13 via `.venv313`.
- FastAPI for HTTP routing.
- Pydantic for request/response models.
- FontTools for upload validation and glyph-character browsing.
- JSON files for local-first persistence.

Frontend:

- React 19.
- TypeScript.
- Vite 7.3.5.
- `@vitejs/plugin-react` 5.2.0.
- `lucide-react` icons.
- CSS in `frontend/src/styles.css`.

Runtime:

- Backend API: `http://127.0.0.1:8001`.
- Frontend app: `http://127.0.0.1:5174`.
- Vite proxy: `/api` -> `http://127.0.0.1:8001`.
- Launcher: `ens_launch.ps1`.

## Design Goals

1. Persist Manual Fonts across server restarts.
2. Keep the feature local-first and simple.
3. Avoid introducing a database for a small preference set.
4. Reuse the existing font catalog and dropdown grouping model.
5. Preserve existing uploaded-font behavior.
6. Keep the UI operational, not decorative.
7. Make startup reliable with a very large font folder.

## High-Level Architecture

```text
fonts/.manual_fonts.json
        |
        v
Backend FontCatalog
        |
        v
GET /api/fonts/manual        PUT /api/fonts/manual
        |                         ^
        v                         |
Frontend App state -------- Configuration tab
        |
        v
CakeTopperPanel font grouping
        |
        v
Manual Fonts optgroup appears first
```

## Data Model

### Backend Models

Defined in `backend/app/models.py`:

```python
class ManualFontsRequest(BaseModel):
    font_ids: list[str] = Field(default_factory=list)


class ManualFontsResponse(BaseModel):
    font_ids: list[str]
    fonts: list[FontInfo]
```

The request accepts a full replacement list of font IDs. The response returns
both the accepted IDs and hydrated `FontInfo` objects so the frontend can update
state immediately without another lookup.

### Persistent Manifest

File: `fonts/.manual_fonts.json`

Shape:

```json
{
  "manual": ["font_id_1", "font_id_2"]
}
```

Strategy:

- Full-list replacement on save.
- Duplicate IDs are removed.
- Unknown font IDs are dropped.
- Order is preserved.
- The file is committed because it represents project-level configuration, not
  transient browser state.

## Backend Implementation

### FontCatalog

Primary file: `backend/app/font_loader.py`.

Responsibilities:

- Discover project fonts and Windows system fonts.
- Build `FontRecord` objects containing `FontInfo` and the filesystem path.
- De-duplicate fonts by normalized `(full_name, style)`.
- Persist uploaded font IDs in `.uploaded_manifest.json`.
- Persist manual font IDs in `.manual_fonts.json`.
- Preserve manually configured IDs when duplicate font files exist.

Key methods:

- `list_fonts()`
- `get_font_path(font_id)`
- `get_font_info(font_id)`
- `get_uploaded_font_ids()`
- `record_upload(font_id)`
- `get_manual_font_ids()`
- `list_manual_fonts()`
- `save_manual_font_ids(font_ids)`
- `_read_manifest_ids(manifest_name, key)`

### Manual Font Persistence

`get_manual_font_ids()` reads the manifest and filters IDs through the live
catalog. This prevents a missing/deleted font file from breaking the app.

`save_manual_font_ids()` validates the incoming IDs, removes duplicates, writes
the manifest, and returns the accepted IDs.

### Duplicate Handling

The catalog de-duplicates by normalized display name and style. If a duplicate
exists and one of the duplicates is explicitly listed in `.manual_fonts.json`,
the manual-listed ID wins. This matters because several fonts exist as both
`.ttf` and `.otf`; without this rule, the catalog could hide the exact ID saved
in the manual manifest.

### Fast Catalog Scanning Strategy

Before this update, catalog scanning opened each font binary with FontTools to
read name metadata. With more than 1,300 font files, this made `/api/fonts` and
startup slow enough to feel broken.

The current implementation uses `_font_names_from_path(path)` to derive display
metadata from the filename:

- Replaces `_` and `-` with spaces.
- Splits camel-case names.
- Extracts common style suffixes such as `Regular`, `Bold`, `Italic`, `Medium`,
  `SemiBold`, `Black`, `Light`, and `DEMO`.
- Builds `family`, `full_name`, and `style` without opening the binary.

Font binaries are still opened where correctness matters:

- Upload validation.
- Glyph browser character extraction.
- SVG/PNG generation pipeline.

Architectural trade-off:

- Startup speed improves significantly.
- Some display names may be less precise than internal font names.
- For this product, fast reliable dropdown loading is preferred over perfect
  catalog naming, because production generation still uses the real font file.

### API Endpoints

Primary file: `backend/app/api/routes/fonts.py`.

Existing:

- `GET /api/fonts`
- `GET /api/fonts/uploaded`
- `POST /api/fonts/upload`
- `GET /api/fonts/{font_id}/file`
- `GET /api/fonts/{font_id}/characters`

Added:

- `GET /api/fonts/manual`
- `PUT /api/fonts/manual`

`GET /api/fonts/manual`:

- Reads validated manual IDs.
- Hydrates each ID to `FontInfo`.
- Returns `ManualFontsResponse`.

`PUT /api/fonts/manual`:

- Accepts a replacement list of font IDs.
- Saves only valid live catalog IDs.
- Returns the accepted IDs and hydrated fonts.

## Frontend Implementation

### App State

Primary file: `frontend/src/App.tsx`.

Added state:

```ts
const [manualFonts, setManualFonts] = useState<FontInfo[]>([]);
```

Startup loading:

```ts
const all = await fetchFonts();
const [uploaded, manual] = await Promise.all([
  fetchUploadedFonts(),
  fetchManualFonts(),
]);
```

The full font catalog loads first. Uploaded and manual fonts load after the
backend catalog cache is warm, reducing repeated expensive scans.

The `Configuration` tab is added to `WorkspaceTab` and rendered from App state.
`manualFonts` is passed to `CakeTopperPanel`.

### API Client

Primary file: `frontend/src/services/generationApi.ts`.

Added:

- `fetchManualFonts(): Promise<FontInfo[]>`
- `saveManualFonts(fontIds: string[]): Promise<FontInfo[]>`

The API client keeps the UI code small and centralises error handling through
the existing `_readError()` helper.

### TypeScript Types

Primary file: `frontend/src/types/design.ts`.

Added:

```ts
export interface ManualFontsResponse {
  font_ids: string[];
  fonts: FontInfo[];
}
```

The current API helpers return `FontInfo[]` to the components, so the response
type is available for future stricter typing but not required by component code.

### Configuration UI

Primary file: `frontend/src/components/ConfigurationPanel.tsx`.

Responsibilities:

- Search available fonts.
- Exclude fonts already in the manual list.
- Add the selected font to Manual Fonts.
- Remove a font from Manual Fonts.
- Save immediately on add/remove.
- Show saving/error state.

Important behavior:

- `manualIds` is derived from `manualFonts`.
- `availableFonts` is memoized from all fonts, search text, and manual IDs.
- `selectedValue` falls back safely if search changes and the previously
  selected font is no longer available.
- `save(nextIds)` calls the parent callback and resets the selected font.

The UI is intentionally simple: it uses familiar form controls and existing
visual language from the app headers/cards.

### Designer Dropdown Integration

Primary file: `frontend/src/components/CakeTopperPanel.tsx`.

Changed props:

```ts
interface CakeTopperPanelProps {
  fonts: FontInfo[];
  manualFonts: FontInfo[];
}
```

`makeFontGroups()` now accepts `manualFonts` and, when the selected category is
`all`, inserts a `Manual Fonts` optgroup first.

The function uses a `seen` set so manual fonts are not duplicated in later
groups like Top 20, Script, Serif, or All Other Fonts.

The main/default dropdown uses the filtered groups. Per-line dropdowns use all
groups with manual fonts first.

### Styling

Primary file: `frontend/src/styles.css`.

Added classes:

- `.config-panel`
- `.config-card`
- `.config-card-header`
- `.config-save-state`
- `.config-add-row`
- `.config-add-button`
- `.manual-font-list`
- `.manual-font-row`

The layout uses the existing restrained operational design style: compact card,
clear controls, minimal explanatory text, and responsive stacking for narrow
screens.

## Seeded Font Assets

Added project font assets:

- `fonts/Courgette,Lobster/Courgette/Courgette-Regular.ttf`
- `fonts/Courgette,Lobster/Courgette/OFL.txt`
- `fonts/Courgette,Lobster/Lobster/Lobster-Regular.ttf`
- `fonts/Courgette,Lobster/Lobster/OFL.txt`
- Besley family files in `fonts/`.

The seeded manual list contains 25 IDs in `fonts/.manual_fonts.json`.

## Runtime Strategy

### Python Environment

Backend now uses `.venv313`.

Reason:

- The previous `.venv` was created with Python 3.14.
- FastAPI import could hang in that environment.
- Python 3.13 imported the dependency stack reliably.

### Ports

Current ports:

- Backend: `8001`.
- Frontend: `5174`.

Reason:

- Windows held `127.0.0.1:8000` in a stale `Bound` state.
- Another local app occupied `5173`.
- Moving ports avoided cross-project collision and made startup deterministic.

### Frontend Tooling

Current tooling:

- `vite@7.3.5`
- `@vitejs/plugin-react@5.2.0`

Reason:

- Vite 8 startup/imports hung in the current Windows/Node environment.
- Vite 7 started successfully and served the app.

## Operational Validation

Verified behavior:

- Backend Python compile check passed for modified backend files.
- Backend `/api/fonts` returned `1141` fonts.
- Backend `/api/fonts/manual` returned `25` manual fonts.
- Frontend Vite server ran on `http://127.0.0.1:5174`.
- Frontend proxy `http://127.0.0.1:5174/api/fonts/manual` returned `25`
  manual fonts.

Known limitation:

- `npm.cmd run build` timed out in the Dropbox workspace. The dev server is
  functional, but production build performance should be re-tested after
  dependency/cache cleanup or outside Dropbox.

## Consistency With Existing Architecture

This implementation follows existing project patterns:

- Uses FastAPI routers under `backend/app/api/routes`.
- Uses Pydantic models in `backend/app/models.py`.
- Uses the existing `FontCatalog` as the single backend font source.
- Uses frontend API helpers in `generationApi.ts`.
- Keeps global app state in `App.tsx`.
- Adds a dedicated React component for the new tab.
- Uses existing CSS variables and panel/header visual patterns.
- Stores local-first app data in the project tree, similar to existing manifests.

## Design Trade-Offs

### JSON Manifest Instead Of Database

Pros:

- Simple.
- Local-first.
- Easy to inspect and commit.
- No migration or database lifecycle.

Cons:

- Not multi-user aware.
- Concurrent writes are not coordinated.

Assessment:

- Appropriate for the current single-user local desktop workflow.

### Path-Derived Catalog Metadata

Pros:

- Fast catalog startup.
- Avoids blocking on large/slow/corrupt font binaries.
- Keeps `/api/fonts` responsive.

Cons:

- Some font display names may differ from embedded names.
- Upload duplicate checks still compare embedded names against path-derived
  catalog names, which may miss some edge cases.

Assessment:

- Acceptable as a pragmatic performance fix, but worth revisiting with a
  metadata cache if exact names become important.

### Full Replacement PUT

Pros:

- Simple API.
- Idempotent.
- Easy frontend state sync.

Cons:

- Not ideal for concurrent multi-client editing.

Assessment:

- Appropriate for current local single-user usage.

## Risks And Review Points

1. Font metadata accuracy:
   - Review whether path-derived names are sufficient for production UX.
   - Alternative: persistent metadata cache keyed by path + mtime + size.

2. Manifest write safety:
   - Current writes use direct `write_text`.
   - Alternative: write temp file then atomic rename for stronger crash safety.

3. Runtime data files:
   - `backend/data/cake_topper_history.json` and `.uploaded_manifest.json` are
     tracked and can change during app use.
   - Review whether they should remain tracked or move to ignored local state.

4. Frontend build timeout:
   - Dev server works, but production build timeout should be investigated.
   - Potential causes: Dropbox file locking, dependency cache, TypeScript 6,
     Node version, or large dependency scan.

5. Port assumptions:
   - The app now assumes `8001` and `5174`.
   - Review whether these should be environment-configurable.

6. Manual ordering:
   - Add/remove preserves order.
   - No drag/drop or up/down ordering controls yet.

## Suggested Future Improvements

1. Add a font metadata cache:
   - Store embedded names after first successful read.
   - Invalidate by file path, mtime, and size.
   - Keep fast startup while improving display accuracy.

2. Make runtime ports configurable:
   - Environment variables for backend port, frontend port, and proxy target.
   - Keep defaults as `8001` and `5174`.

3. Add atomic manifest writes:
   - Write to temp file.
   - Rename over the existing manifest.

4. Add manual font reordering:
   - Up/down buttons or drag handles.
   - Preserve order in `.manual_fonts.json`.

5. Add focused tests:
   - Manifest validation.
   - Duplicate de-dupe with manual ID preference.
   - `GET/PUT /api/fonts/manual`.
   - `makeFontGroups()` manual-first behavior.

6. Decide policy for app-generated data files:
   - Keep committed seed state only.
   - Move user history/upload manifests to ignored local state.

## File Map

```text
backend/app/models.py
  ManualFontsRequest, ManualFontsResponse

backend/app/font_loader.py
  FontCatalog manual-font persistence and fast catalog scanning

backend/app/api/routes/fonts.py
  /api/fonts/manual GET and PUT endpoints

frontend/src/App.tsx
  App-level manualFonts state and Configuration tab route

frontend/src/components/ConfigurationPanel.tsx
  Manual Fonts management UI

frontend/src/components/CakeTopperPanel.tsx
  Manual Fonts optgroup integration

frontend/src/services/generationApi.ts
  fetchManualFonts, saveManualFonts

frontend/src/types/design.ts
  ManualFontsResponse type

frontend/src/styles.css
  Configuration tab styling

frontend/vite.config.ts
  Frontend port and backend proxy

ens_launch.ps1
  Local startup launcher

fonts/.manual_fonts.json
  Persistent manual-font configuration

docs/STARTUP.md
  Runtime startup and troubleshooting guide
```

## Architect Review Checklist

- Does the local-first JSON persistence align with product needs?
- Is path-derived font metadata acceptable for dropdown/catalog display?
- Should the manual-font manifest be project-shared or local-user-specific?
- Should backend/frontend ports be environment-driven?
- Should runtime data files remain tracked?
- Is the Vite 7 downgrade acceptable as the stable local development baseline?
- Are additional tests required before treating this as production-ready?
