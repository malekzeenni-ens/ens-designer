# Full Implementation Architecture Review

Last updated: 2026-06-15 09:16:40 +01:00

Audience: solution architect, implementation reviewer, technical lead.

Purpose: provide a code-reflected architecture review of the current EnS
Designer implementation across all implemented phases. The README is used as
the phase map, but this document reflects the actual backend, frontend,
configuration, runtime, and test code currently present in the repository.

## Executive Summary

EnS Designer is a local-first SVG/PNG generation application for Etch N Shine
laser-cutting workflows. The implemented system is a React/TypeScript frontend
backed by a FastAPI/Python geometry service. It supports:

- Core text-to-outline generation.
- Canonical geometry modelling.
- Connectivity resolution and validation.
- Bridge override support.
- Material profiles and production presets.
- A separate overlap engine for XCS-style tracking reduction.
- A multi-line cake topper designer with stakes, outline/offset generation,
  per-line configuration, floating component controls, export history, and
  SVG/PNG output.
- Font upload, glyph browsing, font advisor/scoring, and persistent Manual
  Fonts configuration.

The implementation is modular and mostly phase-aligned. Backend services are
thinly exposed through API routers and use shared geometry/data models. The
frontend is tab-based and mostly organized by workflow. The largest architectural
areas requiring review are persistence policy, font metadata strategy, runtime
configuration, production build reliability, and CORS/port consistency.

## Implemented Phase Map

The README lists additional future phases. The following table reflects what is
actually implemented in code today.

| Area | README Phase / Workflow | Code Status | Primary Code |
|---|---|---|---|
| Core text generation | Phase 1A | Implemented | `GenerationService`, `/api/generate` |
| Connectivity resolution and validation | Phase 1B | Implemented | `connectivity_engine.py`, `welding_engine.py`, `material_validator.py` |
| Bridge override and production hardening | Phase 1C | Implemented | `bridge_override.py`, presets/material APIs, tests |
| Overlap engine | Phase X | Implemented | `OverlapService`, `/api/overlap`, `OverlapPanel` |
| Cake topper designer | Phase X / Phase 2-like workflow | Implemented beyond README status | `CakeTopperService`, `/api/cake-topper`, `CakeTopperPanel` |
| Font advisor | Current workflow | Implemented | `FontAdvisorPanel`, `cakeTopperFontRecommendations.ts` |
| Font upload and glyph browsing | Current workflow | Implemented | `fonts.py`, `FontsPanel`, `GlyphBrowserDrawer` |
| Manual Fonts configuration | Latest update | Implemented | `ConfigurationPanel`, `.manual_fonts.json`, `/api/fonts/manual` |
| Export history | Current workflow | Implemented | `HistoryStore`, `/api/cake-topper/history`, `HistoryPanel` |
| SVG import and repair | Future Phase 3 | Not implemented in code reviewed | N/A |
| Decorative library | Future Phase 4 | Not implemented in code reviewed | N/A |
| AI graphic generator | Future Phase 5 | Not implemented in code reviewed | N/A |
| AI design studio | Future Phase 6 | Not implemented in code reviewed | N/A |

## System Context

```text
User
  |
  v
React/Vite frontend
  |
  | HTTP JSON / multipart upload
  v
FastAPI backend
  |
  | project-local files, fonts, manifests, export history
  v
Local filesystem

Backend geometry pipeline dependencies:
  HarfBuzz -> FontTools -> Canonical Geometry -> Shapely/helpers -> SVG/PNG
```

The application is local-first. There is no external database, user
authentication, cloud storage, or queueing layer in the current implementation.

## Runtime Architecture

Current local runtime configuration:

- Backend: `http://127.0.0.1:8010`.
- Frontend: `http://127.0.0.1:5174`.
- Frontend proxy: `/api` -> `http://127.0.0.1:8010`.
- Backend Python environment: `.venv313`.
- Frontend tooling: Vite 7.3.5 with React plugin 5.2.0.
- Launcher: `ens_launch.ps1`.

Code references:

- `ens_launch.ps1`
- `frontend/vite.config.ts`
- `backend/app/main.py`
- `docs/STARTUP.md`

Important review note:

- `backend/app/main.py` still configures CORS for `http://localhost:5173` and
  `http://127.0.0.1:5173`. The normal Vite-proxy path avoids CORS, but direct
  frontend-to-backend browser calls from `5174` would be blocked. This should be
  updated or made environment-driven.

## Backend Application Composition

File: `backend/app/main.py`.

The backend is created through `create_app()`:

1. Creates a FastAPI application.
2. Adds CORS middleware.
3. Creates one shared `FontCatalog`.
4. Stores shared service instances in `app.state`:
   - `font_catalog`
   - `generation_service`
   - `overlap_service`
   - `cake_topper_service`
   - `history_store`
5. Includes routers:
   - fonts
   - generation
   - materials
   - overlap
   - presets
   - cake topper
   - history

Architectural assessment:

- The service registry in `app.state` is simple and appropriate for this
  single-process local app.
- The routers stay thin and delegate to service classes, which is clean.
- There is no dependency-injection framework; this is acceptable at current
  scale but may become awkward with user/session concerns later.

## Backend API Surface

| Method | Endpoint | Purpose | Router |
|---|---|---|---|
| `GET` | `/api/fonts` | List available project/system fonts | `fonts.py` |
| `GET` | `/api/fonts/uploaded` | List fonts recorded as uploaded | `fonts.py` |
| `GET` | `/api/fonts/manual` | List persisted Manual Fonts | `fonts.py` |
| `PUT` | `/api/fonts/manual` | Replace persisted Manual Fonts | `fonts.py` |
| `POST` | `/api/fonts/upload` | Validate and save uploaded `.ttf`/`.otf` | `fonts.py` |
| `GET` | `/api/fonts/{font_id}/file` | Serve raw font for browser preview | `fonts.py` |
| `GET` | `/api/fonts/{font_id}/characters` | Return glyph/character map | `fonts.py` |
| `GET` | `/api/materials` | List material profiles | `materials.py` |
| `GET` | `/api/presets` | List production presets | `presets.py` |
| `POST` | `/api/generate` | Core connectivity generation | `generation.py` |
| `POST` | `/api/overlap` | XCS-style overlap generation | `overlap.py` |
| `POST` | `/api/cake-topper` | Multi-line cake topper generation | `cake_topper.py` |
| `GET` | `/api/cake-topper/history` | List export history | `history.py` |
| `POST` | `/api/cake-topper/history` | Add export history entry | `history.py` |

API design observations:

- Pydantic models give solid request/response validation.
- Error handling is primarily `ValueError` -> HTTP 400 in workflow endpoints.
- Upload endpoint validates extension, size, and actual font readability.
- Manual Fonts API uses full-list replacement, which is simple and idempotent.

## Domain Data Model

Primary file: `backend/app/models.py`.

Core model groups:

- Font:
  - `FontInfo`
  - `FontUploadResponse`
  - `ManualFontsRequest`
  - `ManualFontsResponse`
- Geometry:
  - `PathCommand`
  - `GeometryPath`
  - `GlyphGeometry`
  - `Bounds`
  - `Dimensions`
  - `CanonicalGeometry`
- Generation:
  - `GenerateRequest`
  - `GenerateResponse`
  - `BridgeOverride`
- Validation:
  - `MaterialProfile`
  - `WeldingMetadata`
  - `ValidationWarning`
  - `ValidationReport`
- Overlap:
  - `OverlapRequest`
  - `OverlapResponse`
  - `OverlapMetadata`
  - `OverlapGapConfig`
  - `FloatingComponentOffset`
- Cake topper:
  - `CakeTopperRequest`
  - `CakeTopperResponse`
  - `CakeTopperLineConfig`
  - `CakeTopperStakeConfig`
  - `CakeTopperMetadata`
  - `CakeTopperLineMetadata`
  - `CakeTopperStakeMetadata`
  - `CakeTopperOutlineMetadata`
- History:
  - `HistoryEntryCreate`
  - `HistoryEntry`
  - `HistoryLineEntry`

Architectural assessment:

- The central model file makes cross-service contracts easy to inspect.
- As feature count grows, consider splitting model modules by domain while
  keeping stable API schemas exported from one package.

## Core Text Generation Pipeline

Implemented by `GenerationService` in `backend/app/generation_service.py`.

Flow:

```text
GenerateRequest
  -> normalise_text()
  -> get material profile
  -> resolve font path/info
  -> shape_text() with HarfBuzz
  -> extract_outlines() with FontTools pens
  -> build_geometry()
  -> resolve_connectivity()
  -> apply_bridge_overrides() if requested
  -> validate_geometry()
  -> export_svg()
  -> export_png()
  -> GenerateResponse
```

### Unicode Normalisation

File: `backend/app/unicode_normalisation.py`.

Purpose:

- Trims and normalises user text before shaping.
- Rejects empty strings.

Review note:

- This is the correct first step in a font-shaping workflow, especially for
  accents and composed/decomposed Unicode forms.

### Text Shaping

File: `backend/app/text_shaper.py`.

Uses:

- `uharfbuzz`
- `fontTools.ttLib.TTFont`

The service shapes text with HarfBuzz and maps glyph IDs to glyph names via
FontTools. Returned `ShapedGlyph` records preserve glyph ID, glyph name,
cluster, advance, and offsets.

Review note:

- This is architecturally sound. HarfBuzz is the right tool for shaping rather
  than assuming one character equals one glyph.

### Outline Extraction

File: `backend/app/outline_extractor.py`.

Uses a custom `GeometryPen` to convert glyph outlines into the internal
`PathCommand` model.

Key behavior:

- Converts font units to millimetres.
- Flips the y-axis into the app coordinate system.
- Generates one path per glyph where outline commands exist.
- Keeps glyph records even if a glyph has no extracted path.

Review note:

- This is a good separation between shaping and geometry extraction.
- Missing glyph handling is more explicit in the Cake Topper service than in
  the base generation service.

### Canonical Geometry

File: `backend/app/canonical_geometry.py`.

Purpose:

- Normalize path coordinates into a padded positive coordinate space.
- Store source metadata and bounds.
- Provide `recalculate_geometry_bounds()` after geometry mutation.

The canonical geometry model is the shared backend representation used by
generation, overlap, export, validation, and Shapely conversion.

Review note:

- This is one of the strongest architectural decisions in the codebase: it
  prevents each engine from inventing its own geometry contract.

## Connectivity And Welding

Implemented in:

- `backend/app/connectivity_engine.py`
- `backend/app/welding_engine.py`
- `backend/app/bridge_override.py`
- `backend/app/shapely_converter.py`
- `backend/app/material_validator.py`

### Connectivity Strategy

The connectivity engine implements a three-level strategy:

1. Natural connectivity:
   - If glyph geometries are already one connected component, preserve them.
2. Per-pair compression:
   - For partially connected script fonts, close specific positive gaps while
     preserving naturally overlapping pairs.
3. Structural bridge fallback:
   - If compression is inappropriate or insufficient, add bridge rectangles
     using material-aware dimensions.

Important constants:

- Touch tolerance: `0.05mm`.
- Max per-pair compression gap: `5.0mm`.
- Max bridge gap: `4.0mm`.

Architectural assessment:

- The strategy is readable and business-aligned.
- Per-pair compression deliberately avoids fully disconnected block fonts,
  preferring bridges because simple contact would be structurally weak.
- Shapely is used for connected-component style geometry reasoning.

### Welding Engine

The welding engine creates simple bridge rectangles between adjacent path bounds
when candidate checks pass:

- Positive gap required.
- Gap must be <= `4.0mm`.
- Vertical overlap ratio must be sufficient.
- Height ratio must be reasonable.

Review note:

- This is a heuristic bridge placement strategy. It is appropriate for an MVP
  and guarded by validation warnings, but it should be treated as production
  assistive logic, not guaranteed manufacturability.

### Bridge Override

Bridge overrides are applied after automatic connectivity resolution and before
validation. The UI exposes add/remove controls for per-gap correction.

Architectural assessment:

- This is a good human-in-the-loop control point.
- It preserves automation while allowing production judgment.

### Validation

File: `backend/app/material_validator.py`.

Validation output:

- Connectivity score.
- Structural score.
- Production readiness score.
- Warnings/errors.

Warnings include:

- Disconnected geometry.
- Low-confidence bridge placement.
- Mirror acrylic bridge visibility.
- Small design features.

Review note:

- Validation is intentionally simple and score-based.
- Future validation should consider actual minimum stroke/feature analysis
  rather than height-based heuristics alone.

## Material Profiles And Presets

Files:

- `backend/app/material_profiles.py`
- `backend/app/presets.py`
- `backend/app/api/routes/materials.py`
- `backend/app/api/routes/presets.py`

Material profiles are static Python data:

- 3mm Cast Acrylic.
- 3mm Mirror Acrylic.
- 3mm Plywood.

Each profile includes:

- thickness
- minimum bridge width
- minimum feature size
- recommended connection width

Presets provide named default material selections.

Architectural assessment:

- Static configuration is fine for current scope.
- If materials become user-editable, move these into a JSON config or database.

## SVG And PNG Export

Files:

- `backend/app/svg_exporter.py`
- `backend/app/png_exporter.py`

SVG:

- Uses `svgwrite`.
- Emits millimetre dimensions.
- Uses `viewBox`.
- Exports path-only output.
- Base generation defaults to `evenodd`; overlap and cake topper use `nonzero`
  where required for their workflows.

PNG:

- Primary renderer: CairoSVG.
- Fallback renderer: Pillow.
- Pillow fallback approximates Bezier paths into point lists and attempts to
  preserve counter holes.

Review note:

- SVG is the production artifact.
- PNG is preview/support output.
- The fallback renderer is useful operationally but should not be treated as a
  production geometry source.

## Overlap Engine

Implemented by:

- `backend/app/overlap_engine.py`
- `backend/app/overlap_helpers.py`
- `frontend/src/components/OverlapPanel.tsx`

Purpose:

- Reproduce the XCS tracking-reduction workflow.
- Move letters closer by global or per-gap overlap settings.
- Avoid connectivity analysis and bridge generation.

Backend flow:

```text
OverlapRequest
  -> normalise_text()
  -> get font
  -> shape_text()
  -> extract_outlines()
  -> build_geometry()
  -> compute bounding-box gaps
  -> compute per-pair shifts
  -> shift paths cumulatively
  -> detect/apply floating component offsets
  -> export SVG/PNG
  -> OverlapResponse
```

Frontend behavior:

- Text and font selection.
- Global overlap mode buttons: light, auto, medium, strong, custom.
- Per-gap enable/disable and mm controls after generation.
- Floating component controls.
- SVG/PNG export controls.

Architectural assessment:

- The engine is intentionally separate from connectivity generation, which keeps
  its mental model clean.
- Shared overlap helper functions are reused by the cake topper engine, which
  is a good reuse point.

## Cake Topper Engine

Implemented by:

- `backend/app/cake_topper_engine.py`
- `frontend/src/components/CakeTopperPanel.tsx`
- `frontend/src/components/FloatingControls.tsx`
- `frontend/src/components/PreviewPanel.tsx`
- `frontend/src/components/ExportControls.tsx`

Purpose:

- Generate multi-line cake topper text composition with per-line controls,
  stakes, optional combined outline, and export-ready SVG/PNG output.

Backend flow:

```text
CakeTopperRequest
  -> split text into max 4 words/lines
  -> pad missing line configs
  -> generate each line:
       normalise -> shape -> outlines -> canonical geometry
       apply overlap shifts
       detect missing glyphs
       detect/apply floating component offsets
  -> compute canvas width
  -> stack lines vertically
  -> apply alignment/manual offsets
  -> create stakes
  -> optionally create combined outline via Shapely buffer
  -> fit canvas to all paths
  -> assemble colored SVG
  -> render PNG
  -> return metadata/warnings
```

Key constraints:

- Max words/lines: 4.
- Canvas padding: `5mm`.
- Default inter-line gap: `3mm`.
- Default overlap mode: medium.
- Stakes: 0, 1, or 2.

Frontend behavior:

- Main Designer tab.
- Text input.
- Font search/filter/category dropdowns.
- Manual Fonts appear first in the all-font group.
- Base font/size/default overlap controls.
- Stake count and manual stake offset controls.
- Per-line font, size, color, alignment, manual position, overlap, gap, and
  floating component controls.
- Combined outline/offset controls.
- Preview and export.
- Export history recording on download.

Architectural assessment:

- The cake topper engine is feature-rich and intentionally specialized.
- It duplicates some SVG assembly logic rather than forcing everything through
  the canonical SVG exporter because it needs per-group colors, outlines, and
  line metadata comments. This is acceptable, but it should remain isolated.
- The service is large; future maintenance would benefit from extracting line
  generation, stacking/layout, stake generation, and outline generation into
  smaller collaborators.

## Font Management

Implemented by:

- `backend/app/font_loader.py`
- `backend/app/api/routes/fonts.py`
- `frontend/src/components/FontsPanel.tsx`
- `frontend/src/components/GlyphBrowserDrawer.tsx`
- `frontend/src/components/ConfigurationPanel.tsx`

### Font Catalog

Discovery order:

1. Project fonts: `fonts/`.
2. Windows system fonts: `C:/Windows/Fonts`.

Font IDs:

- SHA-1 hash prefix of resolved font path.
- Stable while the file path remains stable.

Duplicate strategy:

- De-duplicate by normalized `(full_name, style)`.
- Preserve manually configured IDs when duplicate candidates exist.

Startup performance strategy:

- Catalog metadata is derived from file paths rather than opening every binary.
- Font binaries are opened lazily when needed for upload validation, glyph
  browsing, and generation.

Review note:

- This is a pragmatic performance trade-off.
- A future metadata cache would be more accurate while preserving startup speed.

### Upload Flow

Font upload endpoint:

- Accepts `.ttf` and `.otf`.
- Max size: `10MB`.
- Validates with FontTools using a temp file.
- Checks duplicates by embedded full name + style.
- Saves to `fonts/`.
- Hot-adds to the live catalog.
- Records uploaded ID in `fonts/.uploaded_manifest.json`.

Frontend:

- Drag/drop upload UI.
- Duplicate/error/success status.
- Uploaded font table with advisory classification.

Review note:

- Upload validation is strong for local use.
- Manifest writes are direct writes, not atomic writes.

### Manual Fonts

Manual Fonts are project-level frequent fonts:

- Config file: `fonts/.manual_fonts.json`.
- API: `GET /api/fonts/manual`, `PUT /api/fonts/manual`.
- UI: `Configuration` tab.
- Designer: first optgroup in font dropdowns.

Review note:

- Full-list replacement is simple and suitable for single-user local usage.
- For multi-user usage, this would need concurrency control or user scoping.

## Font Advisor

Implemented by:

- `frontend/src/components/FontAdvisorPanel.tsx`
- `frontend/src/config/cakeTopperFontRecommendations.ts`
- `frontend/src/config/fontStructuralScores.json`

Purpose:

- Provide production-aware font rankings and categories.
- Combine manual recommendation rules with heuristic fallback classification.
- Surface top fonts, next-best fonts, caution fonts, not-recommended fonts, and
  pairing guidance.

Architectural assessment:

- This is frontend-only advisory logic.
- It does not affect backend manufacturability checks.
- It is appropriate as UX guidance, but should not be confused with the backend
  production validation pipeline.

## Export History

Implemented by:

- `backend/app/history_store.py`
- `backend/app/api/routes/history.py`
- `frontend/src/components/HistoryPanel.tsx`

Persistence:

- JSON file: `backend/data/cake_topper_history.json`.
- Append-only model capped at 500 entries.
- New entries are timestamped in UTC.
- UI displays newest first.

Review note:

- This is local state, but the file is currently tracked in git. Decide whether
  export history should be versioned, seeded, or ignored.

## Frontend Architecture

Primary composition:

- `frontend/src/App.tsx` owns global font state and active tab.
- Tab components own workflow-specific state.
- `frontend/src/services/generationApi.ts` centralizes backend calls.
- `frontend/src/types/design.ts` mirrors backend API contracts.
- `frontend/src/styles.css` contains shared styling.

Current tabs:

- Designer.
- Font Advisor.
- Fonts.
- Configuration.
- History.

Legacy components still present:

- `TextInput`
- `FontSelector`
- `MaterialSelector`
- `ValidationPanel`
- `OverlapPanel`

Review note:

- `OverlapPanel` exists but is not currently mounted in `App.tsx`.
- The README still documents the legacy overlap workflow. If the UI should
  expose it, add a tab or route. If not, update docs to classify it as API-only
  or deprecated UI.

State strategy:

- Component-local state for forms and controls.
- App-level state for font catalog, uploaded fonts, and manual fonts.
- No global state library.

Architectural assessment:

- This is appropriate for the current app size.
- `CakeTopperPanel` is large and carries many responsibilities; it is a future
  refactor candidate.

## Persistence Strategy

Current persisted files:

| File | Purpose | Tracked? | Review Note |
|---|---|---:|---|
| `fonts/.manual_fonts.json` | Project-level Manual Fonts | Yes | Appropriate if shared across machines |
| `fonts/.uploaded_manifest.json` | Uploaded font IDs | Yes today | Review whether this is local runtime state |
| `backend/data/cake_topper_history.json` | Export history | Yes today | Likely local runtime state |
| `fonts/` | Project font assets | Yes | Source of truth for production fonts |

Architectural issue:

- Runtime/user activity mutates tracked files. This creates recurring dirty git
  state and unclear ownership.

Suggested decision:

- Treat curated font assets and `.manual_fonts.json` as project config.
- Move export history and uploaded manifests to ignored local state unless they
  are intended as shared fixtures.

## Testing Architecture

Test suite uses Pytest and FastAPI `TestClient`.

Coverage areas observed:

- Phase 1A generation endpoint and font catalog.
- Unicode normalisation.
- Connectivity and Shapely conversion.
- Welding validation and bridge behavior.
- Bridge override.
- Golden corpus.
- Font regression.
- Phase X overlap engine.
- Cake topper response shape, line splitting, SVG invariants, PNG output,
  alignment, inter-line gap behavior, missing glyph warnings, overlap controls,
  and truncation warnings.

Review notes:

- Backend/domain behavior has meaningful automated tests.
- Frontend behavior appears not to have automated tests.
- Manual Fonts API and dropdown grouping should receive targeted tests.
- Runtime/tooling changes are documented but not automated.

## Security And Safety Review

Current strengths:

- Upload extension allow-list.
- Upload max file size.
- FontTools validation before saving uploaded fonts.
- Sanitized upload filenames.
- Backend rejects unknown fonts and materials.
- Pydantic validation constrains many numeric fields.

Review concerns:

- Uploaded fonts are still complex binary inputs. FontTools validation lowers
  risk but does not eliminate parser risk.
- `/api/fonts/{font_id}/file` serves font binaries by catalog ID. This is safe
  because IDs resolve through the catalog rather than arbitrary paths.
- Direct JSON writes are not atomic.
- CORS origins are stale relative to current frontend port.
- No authentication, which is acceptable for local-only use but not for network
  exposure.

## Architecture Strengths

- Clear separation between API routers and service logic.
- Central Pydantic model layer.
- Shared canonical geometry model.
- HarfBuzz and FontTools used for real shaping/extraction rather than naive text
  rendering.
- Distinct engines for connectivity generation and overlap generation.
- Human override support for bridge placement.
- Local-first persistence is simple and inspectable.
- Frontend tabs map well to user workflows.
- Backend tests cover core geometry and generation behavior.

## Architecture Gaps And Risks

1. Runtime config is hard-coded:
   - Ports and CORS origins should be configurable.

2. Tracked runtime files:
   - Export history and uploaded manifest dirty the git tree during normal use.

3. Font metadata accuracy:
   - Path-derived metadata is fast but less authoritative than embedded font
     names.

4. Large frontend components:
   - `CakeTopperPanel` and `CakeTopperService` are large and should be split as
     feature complexity grows.

5. Frontend build timeout:
   - Dev server works, but production build reliability is unresolved.

6. Manual Fonts tests missing:
   - Add tests for persistence, validation, de-dupe preference, and dropdown
     grouping.

7. Overlap UI mounting ambiguity:
   - `OverlapPanel` is implemented but not mounted in `App.tsx`.

8. Atomicity:
   - JSON manifest/history writes should use temp-write then rename.

9. CORS mismatch:
   - Backend CORS still lists `5173` while the frontend currently runs on
     `5174`.

## Recommended Remediation Roadmap

Priority 1:

- Update CORS configuration for `5174` or move origins to environment config.
- Decide whether `backend/data/cake_topper_history.json` and
  `fonts/.uploaded_manifest.json` are tracked artifacts or local state.
- Add Manual Fonts backend tests.
- Add a small unit test for manual-first font grouping.

Priority 2:

- Add atomic JSON write helper for manifests and history.
- Split `CakeTopperService` into line generation, layout, stakes, outline, and
  rendering modules.
- Split `CakeTopperPanel` into smaller control panels.
- Add a font metadata cache keyed by path, mtime, size.

Priority 3:

- Make runtime ports and proxy target configurable.
- Investigate `npm.cmd run build` timeout outside Dropbox.
- Add frontend/component tests for Configuration and Designer font grouping.
- Clarify whether Overlap should be a visible tab again, API-only, or legacy.

## Code Ownership Map

```text
backend/app/main.py
  FastAPI app factory and service/router composition

backend/app/models.py
  API and domain data contracts

backend/app/font_loader.py
  Font discovery, IDs, manifests, upload/manual catalog state

backend/app/generation_service.py
  Core text generation pipeline

backend/app/text_shaper.py
  HarfBuzz shaping

backend/app/outline_extractor.py
  FontTools outline extraction

backend/app/canonical_geometry.py
  Shared geometry representation and bounds

backend/app/connectivity_engine.py
  Natural/compression/bridge strategy selection

backend/app/welding_engine.py
  Bridge candidate heuristics and bridge path creation

backend/app/bridge_override.py
  Human bridge correction actions

backend/app/material_profiles.py
  Static material configuration

backend/app/material_validator.py
  Production readiness scoring and warnings

backend/app/overlap_engine.py
  XCS-style overlap generation

backend/app/cake_topper_engine.py
  Multi-line cake topper composition

backend/app/svg_exporter.py
  Canonical SVG output

backend/app/png_exporter.py
  PNG preview output

backend/app/history_store.py
  JSON export history persistence

frontend/src/App.tsx
  Tab shell and shared font state

frontend/src/services/generationApi.ts
  HTTP API client

frontend/src/types/design.ts
  Frontend API/domain types

frontend/src/components/CakeTopperPanel.tsx
  Main Designer workflow

frontend/src/components/ConfigurationPanel.tsx
  Manual Fonts workflow

frontend/src/components/FontsPanel.tsx
  Upload and uploaded-font library

frontend/src/components/FontAdvisorPanel.tsx
  Advisory ranking and categorisation UI

frontend/src/components/HistoryPanel.tsx
  Export history UI

frontend/src/components/OverlapPanel.tsx
  Implemented overlap UI, currently not mounted in App

frontend/src/styles.css
  Shared visual system and component styling
```

## Solution Architect Review Checklist

- Confirm the phase/status terminology in README matches mounted UI and API
  reality.
- Confirm CORS and runtime ports are aligned.
- Decide the tracking policy for runtime JSON files.
- Review whether path-derived font metadata is acceptable or whether a metadata
  cache is required.
- Review whether the Cake Topper service/component should be split before more
  features are added.
- Confirm Vite 7 is the desired baseline or whether Node/Vite should be
  upgraded in a controlled tooling pass.
- Confirm local-only/no-auth assumptions.
- Confirm whether the Overlap UI should be mounted.
- Require tests for Manual Fonts before production sign-off.
- Decide whether manifest/history writes need atomic file operations now.

## Conclusion

The implemented system is coherent for a local-first production-assist tool. The
core geometry pipeline is sensibly layered, the API surface is straightforward,
and the frontend maps well to operational workflows. The main architectural
cleanup needed before further expansion is not a rewrite; it is tightening the
runtime/configuration edges, clarifying persistence ownership, adding tests for
the newest Manual Fonts behavior, and decomposing the largest cake-topper
modules as feature pressure grows.
