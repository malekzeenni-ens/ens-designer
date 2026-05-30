# phase-1a-implementation-plan.md

## Document Information

Phase: 1A
Name: Core Text Generation
Target Release: v0.1.0
Owner: Etch 'N' Shine
Date: 2026-05-30
Status: Ready For Approval

---

# 1. Executive Summary

Phase 1A delivers the deterministic text-to-vector foundation for the Etch 'N' Shine AI SVG Generator.

The product is a Connectivity Resolution Engine. Phase 1A is the first of three sub-phases that build the foundation before connectivity resolution is applied in Phase 1B. Phase 1A does not perform connectivity analysis, letter compression, or structural bridge fallback. It establishes the geometry pipeline upon which those capabilities depend.

The approved workflow for Phase 1A is:

```text
Text Input
-> Unicode Normalisation
-> HarfBuzz Text Shaping
-> Font Outline Extraction
-> Canonical Geometry Model
-> SVG Export
-> PNG Export
-> Preview
```

The business outcome is a working local application that lets the user enter a name, select a font, generate a shaped SVG of the text, preview it in the browser, and download SVG and PNG files — all within 30 seconds and without a cloud dependency.

This plan documents the full scope of Phase 1A. It supersedes the previous draft planning document and is aligned with all accepted ADRs and the Connectivity Engine Architecture Remediation completed on 2026-05-30.

---

# 2. Phase Context

## 2.1 Approved Phase Sequence

| Phase | Name | Focus |
|---|---|---|
| Phase 1A | Core Text Generation | Text shaping, outline extraction, canonical geometry, SVG/PNG export |
| Phase 1B | Connectivity Resolution & Validation | Natural connectivity, letter compression, geometry union, structural bridge fallback, material validation |
| Phase 1C | Production Hardening | Golden test corpus, LightBurn validation evidence, manual bridge override, production presets |
| Phase 2+ | Future Phases | Cake Topper, SVG Repair, Decorative Library, AI Generation, AI Design Studio |

## 2.2 Connectivity Resolution Order (Approved)

The Connectivity Resolution Engine processes connectivity in this order. Phase 1A does not implement any of these steps. They are recorded here for architectural context only.

1. Natural Connectivity — preserve already-connected fonts unchanged
2. Intelligent Letter Compression — close gaps by adjusting tracking
3. Structural Bridge Fallback — add bridges only when the above fail

Phase 1A outputs individual letter geometry without any connectivity processing. This is correct and expected.

## 2.3 ADRs Governing Phase 1A

| ADR | Decision | Phase 1A Impact |
|---|---|---|
| ADR-001 | Use HarfBuzz for text shaping | Mandatory — uharfbuzz must be used |
| ADR-002 | Use Canonical Geometry Model as internal source of truth | Mandatory — SVG is an export format, not the working model |
| ADR-003 | SVG primary export, PNG supporting, DXF deferred | Mandatory — no DXF implementation |
| ADR-004 | Material validation deferred to Phase 1B | Confirmed — out of Phase 1A scope |
| ADR-005 | MVP scope guardrails — local-first, single-user | Mandatory — no cloud, batch, or multi-user scope |

---

# 3. Scope

## 3.1 Included in Phase 1A

- Name input
- Font selection with search and duplicate hiding
- Recursive font discovery from:
  - `/fonts` repository directory
  - `C:\Users\malek\Dropbox\_Etch_n_Shine\Fonts` (Etch 'N' Shine operational library)
  - Windows system fonts
- Font preview in selector
- Unicode NFC normalisation
- HarfBuzz text shaping via uharfbuzz
- Font outline extraction via FontTools pens
- Canonical Geometry Model creation
- SVG generation with millimetre dimensions
- PNG generation
- SVG preview in browser
- Download SVG
- Download PNG
- Input validation and error handling
- Logging

## 3.2 Explicitly Excluded from Phase 1A

- Connectivity analysis
- Natural connectivity preservation
- Intelligent letter compression
- Geometry union operations
- Structural bridge fallback
- Material validation
- Material profiles
- Production readiness scoring
- Manual bridge override
- Golden test corpus
- Cake topper generation
- SVG import and repair
- Decorative asset library
- AI graphic generation
- DXF export
- Batch processing
- Cloud functionality
- User accounts
- Project sharing
- Multi-user functionality

---

# 4. Dependencies

## 4.1 Runtime Environment

| Item | Specification | Notes |
|---|---|---|
| Python | 3.13 preferred | Python 3.14 requires source build for uharfbuzz; prefer 3.13 |
| Node.js | LTS (>=18) | Required for frontend build |
| npm | Bundled with Node.js | Required for frontend dependency management |

## 4.2 Backend Dependencies

| Package | Version | Purpose | Justification |
|---|---|---|---|
| fastapi | >=0.110.0 | Local API framework | Implements approved local API architecture |
| uvicorn | >=0.29.0 | ASGI server | Runs FastAPI locally |
| pydantic | >=2.0.0 | Request/response schemas | Enforces Canonical Geometry Model schema |
| fonttools | >=4.50.0 | Font outline extraction | Approved font processing library; pens model supports glyph outline inspection |
| uharfbuzz | >=0.25.0 | HarfBuzz text shaping | Implements ADR-001; current package supports Python >=3.10 |
| freetype-py | >=2.4.0 | Font loading support | Approved supporting library for font loading where needed |
| svgwrite | >=1.4.3 | SVG document assembly | Approved SVG library for SVG export |
| cairosvg | >=2.7.0 | PNG conversion from SVG | Primary SVG-to-PNG renderer |
| pillow | >=10.0.0 | PNG fallback renderer | Fallback when Cairo DLLs are unavailable on Windows |
| pytest | >=8.0.0 | Test runner | Standard Python test runner |
| httpx | >=0.27.0 | HTTP client for tests | Required for FastAPI test client |

### Critical Dependency Notes

**uharfbuzz on Python 3.14:** If no compatible wheel is published for Python 3.14, uharfbuzz must be compiled from source. This requires a C++ build toolchain. Use Python 3.13 on Windows to avoid this. Do not remove uharfbuzz in favour of any other approach — it implements ADR-001.

**CairoSVG on Windows:** CairoSVG requires native Cairo DLLs (`libcairo-2.dll`) which are not installed by default on Windows. When Cairo is unavailable, PNG export falls back to Pillow rendering. This fallback is acceptable for Phase 1A but must be revisited during Phase 1C production hardening.

**shapely and pyclipper:** These geometry libraries are NOT required for Phase 1A. They are planned for Phase 1B connectivity resolution. Do not introduce them in Phase 1A implementation.

## 4.3 Frontend Dependencies

| Package | Version | Purpose | Justification |
|---|---|---|---|
| react | >=18.0.0 | UI rendering | Approved frontend framework |
| react-dom | >=18.0.0 | DOM rendering | Required with React |
| typescript | >=5.0.0 | Type safety | Approved frontend language |
| vite | >=5.0.0 | Development and build tool | Approved frontend build tool |
| @vitejs/plugin-react | >=4.0.0 | React support for Vite | Required by Vite + React |
| tailwindcss | >=3.4.0 | Utility CSS | Approved styling approach |
| lucide-react | >=0.400.0 | Icon library | Lightweight icons for UI |
| @types/react | Matching react version | TypeScript types | Required for TypeScript |
| @types/react-dom | Matching react-dom version | TypeScript types | Required for TypeScript |

## 4.4 Test Dependencies

| Package | Purpose |
|---|---|
| pytest | Backend unit and integration test runner |
| httpx | FastAPI test client |

Playwright is noted for future UI smoke test automation but is not required for Phase 1A initial delivery.

---

# 5. Repository Structure

The following structure defines the Phase 1A repository layout. Directories marked with `[Phase 1A]` are created during this phase.

```text
EnS Designer/
  backend/                          [Phase 1A]
    app/
      __init__.py
      main.py                       FastAPI application entry point
      models.py                     Pydantic request/response models
      unicode_normalisation.py      NFC normalisation and input validation
      font_loader.py                Font discovery and catalogue
      text_shaper.py                HarfBuzz shaping wrapper
      outline_extractor.py          FontTools pen-based outline extraction
      canonical_geometry.py         Canonical Geometry Model construction
      svg_exporter.py               SVG document assembly
      png_exporter.py               PNG generation (CairoSVG + Pillow fallback)
      generation_service.py         Orchestrates full pipeline
      api/
        __init__.py
        routes/
          __init__.py
          fonts.py                  GET /api/fonts endpoint
          generation.py             POST /api/generate endpoint
    requirements.txt                Pinned backend dependencies
    .venv/                          Python virtual environment (gitignored)

  frontend/                         [Phase 1A]
    index.html
    package.json
    package-lock.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    src/
      main.tsx                      Application entry point
      App.tsx                       Root application component
      styles.css                    Global styles and Tailwind setup
      vite-env.d.ts
      types/
        design.ts                   Shared TypeScript types
      services/
        generationApi.ts            API client for backend endpoints
      components/
        TextInput.tsx               Name input component
        FontSelector.tsx            Font search and selection component
        PreviewPanel.tsx            SVG preview display component
        ExportControls.tsx          Download SVG / Download PNG controls
    node_modules/                   (gitignored)
    dist/                           Build output (gitignored)

  tests/                            [Phase 1A]
    conftest.py                     pytest configuration and fixtures
    test_phase_1a_generation.py     Phase 1A integration tests

  fonts/                            [Phase 1A]
    .gitkeep                        Placeholder — fonts not committed

  exports/                          [Phase 1A]
    .gitkeep                        Placeholder — exports not committed

  logs/                             [Phase 1A]
    .gitkeep                        Placeholder — logs not committed

  docs/
    adr/
    architecture/
    business/
    governance/
    handoffs/
      phase-1a-implementation-plan.md     This document
      phase-1a-canonical-geometry-model.md
      phase-1a-test-strategy.md
      phase-1a-implementation-handoff.md  Created at phase completion
      phase-1a-completion-report.md       Created at phase completion
    phases/

  README.md
  .gitignore
```

## 5.1 Repository Changes Summary

| Category | Action |
|---|---|
| `/backend/` | Create entire backend module structure |
| `/frontend/` | Create entire frontend module structure |
| `/tests/` | Create test module |
| `/fonts/` | Create with `.gitkeep` placeholder |
| `/exports/` | Create with `.gitkeep` placeholder |
| `/logs/` | Create with `.gitkeep` placeholder |
| `/README.md` | Update with Phase 1A setup and run instructions |
| `/.gitignore` | Add `.venv/`, `node_modules/`, `dist/`, `exports/`, `logs/` |
| `/docs/handoffs/` | Add Phase 1A planning and completion documents |

---

# 6. Canonical Geometry Model Definition

## 6.1 Design Principles

- SVG is an export format, not the internal working model (ADR-002).
- The Canonical Geometry Model is the internal source of truth.
- The model must be serialisable for API responses and tests.
- The model is implementation-neutral — it does not contain SVG, PNG, or DXF artefacts.
- All coordinate values use millimetres.
- The coordinate system origin is top-left with the Y-axis pointing down.

## 6.2 Phase 1A Model Schema

```json
{
  "geometryId": "uuid-string",
  "source": {
    "text": "Oliver",
    "fontId": "font-identifier",
    "fontName": "Font Display Name"
  },
  "units": "mm",
  "coordinateSystem": {
    "origin": "top-left",
    "yAxis": "down"
  },
  "dimensions": {
    "width": 120.0,
    "height": 42.0
  },
  "glyphs": [
    {
      "glyphId": 123,
      "cluster": 0,
      "advanceX": 12.3,
      "advanceY": 0.0,
      "offsetX": 0.0,
      "offsetY": 0.0,
      "pathIds": ["path-001"]
    }
  ],
  "paths": [
    {
      "pathId": "path-001",
      "commands": [
        {"type": "M", "x": 0.0, "y": 0.0},
        {"type": "L", "x": 10.0, "y": 0.0},
        {"type": "Q", "x1": 12.0, "y1": 3.0, "x": 10.0, "y": 6.0},
        {"type": "Z"}
      ],
      "closed": true
    }
  ],
  "bounds": {
    "minX": 0.0,
    "minY": 0.0,
    "maxX": 120.0,
    "maxY": 42.0
  },
  "exportMetadata": {
    "svgReady": true,
    "pngReady": true
  }
}
```

## 6.3 Required Fields

| Field | Description | Constraint |
|---|---|---|
| `geometryId` | Unique identifier for this generation result | UUID |
| `source.text` | Input text that was shaped | Non-empty string |
| `source.fontId` | Internal font identifier | Must match a loaded font |
| `source.fontName` | Display name for the font | Human-readable |
| `units` | Coordinate units | Must be `"mm"` for Phase 1A |
| `coordinateSystem.origin` | Coordinate origin | `"top-left"` |
| `coordinateSystem.yAxis` | Y-axis direction | `"down"` |
| `dimensions.width` | Total design width | Finite positive float |
| `dimensions.height` | Total design height | Finite positive float |
| `glyphs` | HarfBuzz-shaped glyph array | At least one for non-empty text |
| `glyphs[].glyphId` | HarfBuzz glyph ID | Integer |
| `glyphs[].cluster` | HarfBuzz cluster index | Integer >=0 |
| `glyphs[].advanceX` | Horizontal advance in mm | Float |
| `glyphs[].advanceY` | Vertical advance in mm | Float |
| `glyphs[].offsetX` | Horizontal offset in mm | Float |
| `glyphs[].offsetY` | Vertical offset in mm | Float |
| `glyphs[].pathIds` | References to path objects | Array of path ID strings |
| `paths` | Extracted outline path array | At least one for non-empty text |
| `paths[].pathId` | Unique path identifier | String |
| `paths[].commands` | SVG-style path commands | Array of command objects |
| `paths[].closed` | Whether path is a closed shape | Boolean |
| `bounds` | Overall bounding box in mm | All values must be finite |
| `exportMetadata.svgReady` | Whether SVG export can proceed | Boolean — must be true for export |
| `exportMetadata.pngReady` | Whether PNG export can proceed | Boolean |

## 6.4 Supported Path Commands (Phase 1A)

| Command | Fields |
|---|---|
| `M` (Move To) | `x`, `y` |
| `L` (Line To) | `x`, `y` |
| `Q` (Quadratic Bezier) | `x1`, `y1`, `x`, `y` |
| `C` (Cubic Bezier) | `x1`, `y1`, `x2`, `y2`, `x`, `y` |
| `Z` (Close Path) | none |

## 6.5 Validation Rules

The Phase 1A model is valid when all of the following are true:

- `source.text` and `source.fontName` are present and non-empty.
- `units` is `"mm"`.
- `bounds` values are finite numbers.
- At least one `path` exists for non-empty text input.
- All `paths[].commands` use supported command types only.
- `exportMetadata.svgReady` is true.

## 6.6 Explicitly Excluded From Phase 1A Model

The following fields must NOT be present in the Phase 1A model and must not be implemented:

- Welded geometry state
- Bridge objects or bridge metadata
- Material profile metadata
- Structural validation scores
- Connectivity graph
- Cut layer metadata
- Score layer metadata
- Engrave layer metadata
- DXF metadata
- AI prompt metadata

These fields are extension points for Phase 1B and later.

---

# 7. HarfBuzz Integration Strategy

## 7.1 Library Selection

Use `uharfbuzz` — the official Python binding for HarfBuzz.

Do not use manual glyph placement, naive advance-width accumulation, or any substitute that bypasses HarfBuzz shaping. This would violate ADR-001.

## 7.2 Shaping Pipeline

```text
Input text (Python str)
-> NFC Unicode normalisation
-> uharfbuzz buffer creation
-> Direction and script configuration (LTR, Latin)
-> Font loading into uharfbuzz face and font objects
-> hb.shape() call
-> Extraction of glyph infos (glyph_id, cluster)
-> Extraction of glyph positions (x_advance, y_advance, x_offset, y_offset)
-> Unit conversion: font units -> millimetres using units_per_em and font size
```

## 7.3 Coordinate Conversion

HarfBuzz returns positions in font design units. Convert to millimetres using:

```
mm = (font_units / units_per_em) * font_size_pt * (25.4 / 72)
```

Where:
- `units_per_em` is obtained from the font's head table via FontTools
- `font_size_pt` is the design point size (a reasonable default is 72pt for a 1:1 scale)
- `25.4 / 72` converts points to millimetres

## 7.4 Cluster Tracking

HarfBuzz returns a `cluster` index for each shaped glyph that maps back to the original Unicode input string. This must be captured in the Canonical Geometry Model to support correct glyph-to-character mapping for future Phase 1B connectivity analysis.

## 7.5 Special Character Handling

| Case | Handling |
|---|---|
| Apostrophes (O'Connor) | Pass through as-is; HarfBuzz shapes correctly |
| Accented characters (Léa) | Apply NFC normalisation before shaping |
| Missing glyphs | Detect via zero advance or explicit fallback glyph; log warning |
| Ligatures | Accept shaped output; HarfBuzz handles automatically when font supports them |

## 7.6 Error Conditions

| Condition | Action |
|---|---|
| Font file not found | Reject with clear error; do not fall back to system font silently |
| Font cannot be loaded by uharfbuzz | Reject with logged error |
| HarfBuzz produces zero glyphs for non-empty input | Reject with logged error |
| Unsupported character produces no glyph | Log warning; continue generation with available glyphs |

---

# 8. Font Processing Pipeline

## 8.1 Font Discovery

Font discovery runs at application startup and on demand. The discovery process scans three sources in priority order:

1. `/fonts` — repository-local fonts committed with the project
2. `C:\Users\malek\Dropbox\_Etch_n_Shine\Fonts` — Etch 'N' Shine operational font library (machine-specific path)
3. Windows system fonts — `C:\Windows\Fonts`

Discovery rules:
- Scan recursively for `.ttf` and `.otf` files
- Extract family name and style from font metadata via FontTools
- Remove duplicates by normalised `{family_name} {style}` key — keep the first discovered instance
- Return a sorted, deduplicated font catalogue

Font paths are held in memory at runtime. No fonts are committed to the repository except fixtures placed in `/fonts` for testing.

## 8.2 Font Loading

For each shaping request:

1. Resolve the `fontId` to a file path from the in-memory catalogue.
2. Load the font file into both:
   - A FontTools `TTFont` object — for outline extraction and metadata
   - A `uharfbuzz` face/font object — for HarfBuzz shaping
3. Extract `units_per_em` from the font's `head` table.

## 8.3 Text Shaping

1. Apply NFC Unicode normalisation to the input text.
2. Create a HarfBuzz buffer.
3. Add the normalised text to the buffer.
4. Configure direction (`LTR`) and script (`Latn`).
5. Call `hb.shape()` with the loaded font.
6. Extract `glyph_infos` and `glyph_positions`.
7. Convert positions from font units to millimetres.

## 8.4 Outline Extraction

For each shaped glyph:

1. Use the `glyphId` returned by HarfBuzz to access the glyph in the FontTools `TTFont`.
2. Create a FontTools `PointToSegmentPen` or `RecordingPen` to capture path commands.
3. Draw the glyph into the pen using the TTFont's `glyf` or CFF table.
4. Convert captured pen commands to Canonical Geometry Model path objects.
5. Apply the glyph's positional offset from HarfBuzz to translate the extracted outline into the correct position within the overall design layout.

## 8.5 Layout Assembly

After extracting all glyph outlines:

1. Accumulate x-advance values across glyphs to compute the full text width.
2. Identify the maximum ascender from the font metrics for the design height.
3. Compute the overall bounding box.
4. Store the complete glyph and path arrays in the Canonical Geometry Model.
5. Set `exportMetadata.svgReady` and `pngReady` to `true` if the model is valid.

---

# 9. SVG Export Strategy

## 9.1 Design Principles

- SVG is the primary and production-format export (ADR-003).
- The SVG is generated from the Canonical Geometry Model, not from the raw font data.
- SVG must be dimensionally accurate in millimetres for LightBurn compatibility.
- The SVG must contain only path geometry — no raster embeds, no JavaScript, no animations.

## 9.2 SVG Document Requirements

| Attribute | Value |
|---|---|
| Root element | `<svg>` |
| `xmlns` | `http://www.w3.org/2000/svg` |
| `width` | Millimetre value with `mm` unit (e.g. `114.22mm`) |
| `height` | Millimetre value with `mm` unit |
| `viewBox` | `0 0 {width_mm} {height_mm}` |
| Content | `<path>` elements only |

## 9.3 Path Generation

For each path in the Canonical Geometry Model:

1. Convert the array of command objects to SVG path `d` attribute string format.
2. Emit a `<path>` element with the `d` attribute.
3. Apply `fill="black"` and `stroke="none"` as defaults.
4. Apply even-odd fill rule (`fill-rule="evenodd"`) to correctly render counter shapes (e.g. holes in letters such as O, A, D).

## 9.4 LightBurn Compatibility

LightBurn reads SVG path data reliably when:
- The SVG root has explicit `width` and `height` in millimetres.
- A `viewBox` is present.
- Paths use standard SVG path commands.
- No unsupported SVG features are present.

The Phase 1A SVG exporter must satisfy all of the above conditions.

## 9.5 SVG Assembly Library

Use `svgwrite` for SVG document assembly in Phase 1A. `svgwrite` provides a Python-native SVG builder without requiring a browser runtime.

---

# 10. PNG Export Strategy

## 10.1 Design Principles

- PNG is a supporting export format, not the production format (ADR-003).
- The PNG is derived from the generated SVG, not from the font data directly.
- PNG must be visually accurate enough for preview and design review purposes.
- Production laser cutting is performed from the SVG, not the PNG.

## 10.2 Primary Renderer: CairoSVG

CairoSVG converts SVG documents to PNG using the Cairo rendering library.

Advantages:
- High fidelity SVG rendering including Bezier curves, fills, and even-odd rule
- Accurate colour rendering

Limitation on Windows:
- Requires native Cairo DLLs (`libcairo-2.dll`)
- Cairo is not installed by default on Windows
- CairoSVG may fail with an import error on clean Windows machines

## 10.3 Fallback Renderer: Pillow

When CairoSVG fails due to missing Cairo DLLs, the PNG exporter falls back to Pillow-based rendering.

Pillow does not natively render SVG paths. The fallback approach renders the SVG outline geometry by converting paths to an image representation using basic rasterisation.

Limitations of Pillow fallback:
- May not accurately render complex counter shapes (holes in letters)
- Visual quality is lower than CairoSVG for decorative fonts
- Acceptable for Phase 1A preview purposes only

## 10.4 Fallback Detection

```python
try:
    import cairosvg
    # Use CairoSVG
except ImportError:
    # Use Pillow fallback
```

The fallback must be logged clearly so the operator is aware.

## 10.5 PNG Resolution

Default PNG export resolution: 150 DPI minimum for preview quality.

Recommended production PNG resolution for Phase 1C: 300 DPI.

## 10.6 Phase 1C Action Required

The PNG rendering strategy must be revisited during Phase 1C production hardening. Options include:
- Installing Cairo for Windows via MSYS2 or pre-packaged DLLs
- Using Inkscape command-line rendering
- Evaluating alternative SVG-to-PNG libraries

---

# 11. Testing Strategy

## 11.1 Overview

Phase 1A testing must prove the deterministic text-to-vector pipeline without testing any out-of-scope features. Tests must not reference connectivity resolution, bridge fallback, material validation, welding, or AI functionality.

Minimum test coverage target: 80% for backend modules.

## 11.2 Required Name Test Corpus

| Name | Purpose |
|---|---|
| Oliver | Standard Latin name |
| Amelia | Standard Latin name |
| Muhammad | Common name with uncommon letter sequence |
| O'Connor | Apostrophe handling |
| Léa | Accented character; NFC normalisation |
| Lea | Same word pre-normalisation; must match Léa output when normalised |
| A | Single character minimum case |
| Hannah | Palindromic name |
| Ava-Rose | Hyphen handling |

## 11.3 Font Test Fixture

A small set of fixture fonts must be committed to `/tests/fixtures/fonts/`. These must be freely distributable fonts that cover the following categories:

| Category | Example | Purpose |
|---|---|---|
| Sans-serif | Arial or equivalent free font | Standard block letter shaping |
| Script | Any freely licensed script font | Curved, connected glyph shaping |
| Serif | Any freely licensed serif font | Serif glyph outline complexity |
| Decorative | Any freely licensed decorative font | Complex outline edge cases |

Do not commit commercial Etch 'N' Shine fonts to the repository. Use freely licensed fonts (OFL or equivalent) as fixtures.

## 11.4 Unit Tests

### Unicode Normalisation Module

| Test | Expected Result |
|---|---|
| Empty string | Rejection |
| Whitespace-only string | Rejection |
| `"Léa"` (pre-composed) | Accepted, returned as NFC |
| `"Leá"` (decomposed) | Normalised to `"Léa"` NFC and accepted |
| `"Oliver"` | Accepted unchanged |
| `"O'Connor"` with apostrophe | Accepted unchanged |

### Font Loader Module

| Test | Expected Result |
|---|---|
| Fixture font directory scanned | At least one font returned |
| Duplicate fonts by name+style | Only one entry returned per unique name+style |
| Invalid path | No crash; empty catalogue returned with log warning |

### Text Shaper Module

| Test | Expected Result |
|---|---|
| `"Oliver"` with fixture sans font | Returns six glyph infos and positions |
| `"O'Connor"` | Returns glyph info including apostrophe |
| `"Léa"` | Returns correct glyph count after NFC normalisation |
| Advances in mm | All advances are non-negative floats |

### Outline Extractor Module

| Test | Expected Result |
|---|---|
| Non-empty text with valid font | At least one path returned |
| Path commands | Use only supported command types (M, L, Q, C, Z) |
| Closed paths | All letter outlines produce at least one closed path |

### Canonical Geometry Module

| Test | Expected Result |
|---|---|
| Generated model units | Must equal `"mm"` |
| Bounds values | All four must be finite numbers |
| Glyph-to-path linkage | All pathIds in glyphs reference existing paths |
| Required fields | All required fields present and non-null |

### SVG Exporter Module

| Test | Expected Result |
|---|---|
| SVG root element | Contains `xmlns`, `width`, `height`, `viewBox` attributes |
| Width and height format | Values include `mm` unit suffix |
| SVG content | Contains at least one `<path>` element |
| `d` attribute | Non-empty for each path |

### PNG Exporter Module

| Test | Expected Result |
|---|---|
| PNG output from valid SVG | Returns bytes; first two bytes are `\x89P` (PNG header) |
| Error handling | PNG failure returns clear error, not silent empty bytes |

## 11.5 Integration Tests

Test the full pipeline end-to-end for each name in the required test corpus:

```text
POST /api/generate
  Input: text + fontId
  -> Unicode normalisation
  -> HarfBuzz shaping
  -> Outline extraction
  -> Canonical Geometry Model creation
  -> SVG generation
  -> PNG generation
  Response: SVG bytes and PNG bytes
```

For each test case, validate:
- HTTP 200 response
- SVG response is non-empty and contains `<path>` elements
- PNG response is non-empty and has a valid PNG header
- Dimensions are positive finite numbers in mm

## 11.6 Manual Tests

For each name in the required corpus, perform manually:

1. Start the local application (backend + frontend).
2. Enter the name in the text input.
3. Select a font from each of the four font categories (sans, script, serif, decorative).
4. Click Generate.
5. Confirm the SVG preview appears in the browser.
6. Download the SVG.
7. Open the SVG in a browser and confirm text outlines are visible.
8. Import the SVG into LightBurn.
9. Confirm dimensions appear reasonable (approximately 100mm–200mm wide depending on name length).
10. Download the PNG.
11. Confirm the PNG renders the text correctly.

## 11.7 Performance Validation

| Metric | Target | Measurement |
|---|---|---|
| SVG generation end-to-end | <30 seconds | Measure from API call to response |
| Preview render in browser | <5 seconds | Visual observation |
| Export download | <5 seconds | Visual observation |

## 11.8 Tests That Must NOT Be Written in Phase 1A

- Any test referencing connectivity, welding, bridging, or letter compression
- Any test referencing material validation or material profiles
- Any test referencing structural scores
- Any test referencing bridge width or bridge placement
- Any test referencing cake toppers, SVG import, DXF, or AI

---

# 12. UI Workflow

## 12.1 Design Principles

- The Phase 1A UI is a single-screen local web application.
- The workflow must be linear and minimal.
- No advanced controls, multiple screens, or configuration panels should appear in Phase 1A.
- All styling uses Tailwind CSS utility classes.

## 12.2 User Workflow

```text
1. User opens browser at http://localhost:5173
2. User types a name into the text input
3. User selects a font using the font selector
   - Font selector includes a search input
   - Font selector shows a readable list of available fonts
   - Duplicate fonts are hidden — only one entry per unique family+style is shown
4. User clicks the Generate button
5. Application sends POST /api/generate with text and fontId
6. Backend runs the full Phase 1A pipeline
7. Application displays the SVG preview in the browser
8. User downloads SVG by clicking Download SVG
9. User downloads PNG by clicking Download PNG
```

## 12.3 Components

| Component | File | Responsibility |
|---|---|---|
| `TextInput` | `TextInput.tsx` | Name text field and validation |
| `FontSelector` | `FontSelector.tsx` | Searchable font list; loads fonts from GET /api/fonts |
| `PreviewPanel` | `PreviewPanel.tsx` | Renders the SVG response inline in the browser |
| `ExportControls` | `ExportControls.tsx` | Download SVG and Download PNG buttons |
| `App` | `App.tsx` | Root component; orchestrates state and API calls |

## 12.4 API Client

The frontend API client (`generationApi.ts`) calls:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/fonts` | GET | Retrieve the available font catalogue |
| `/api/generate` | POST | Generate design from text and fontId |

## 12.5 Error States

| Error | UI Behaviour |
|---|---|
| Empty text | Show inline validation message; disable Generate |
| No font selected | Show inline validation message; disable Generate |
| Backend generation error | Show clear error message in the UI |
| Preview load error | Show error message in preview area |

## 12.6 Loading States

| State | UI Behaviour |
|---|---|
| Fonts loading | Show loading indicator in font selector |
| Generation in progress | Disable Generate button; show loading indicator |

## 12.7 Phase 1A UI Constraints

The following must NOT appear in Phase 1A UI:

- Material selector
- Connectivity settings or controls
- Bridge controls
- Structural validation panel
- Validation score display
- Font recommendation controls
- AI controls
- Batch input

These are Phase 1B and later scope items.

---

# 13. Risk Assessment

## 13.1 Risk Register

| ID | Risk | Severity | Probability | Impact | Mitigation |
|---|---|---|---|---|---|
| R-001 | uharfbuzz wheel unavailable for Python 3.14 | High | High | Build failure on clean install | Use Python 3.13; document build steps for 3.14 |
| R-002 | Cairo DLLs unavailable on Windows causing CairoSVG failure | High | High | PNG export unavailable | Implement Pillow fallback; log clearly; revisit in Phase 1C |
| R-003 | Decorative fonts produce outline edge cases (self-intersections, open paths) | Medium | Medium | Invalid or malformed SVG output | Add outline validation in outline extractor; log and skip malformed paths |
| R-004 | Font missing a required glyph for user input | Medium | High | Partial or empty SVG output | Detect missing glyphs; show user-visible warning |
| R-005 | Dropbox font path is machine-specific | Low | High | New contributors cannot discover Etch 'N' Shine font library | Document the path; keep `/fonts` as the portable project source |
| R-006 | FontTools pen model produces unexpected path command types for some CFF fonts | Medium | Low | Path conversion fails silently | Validate command types; log unrecognised commands |
| R-007 | Scope creep — implementing Phase 1B features in Phase 1A | High | Medium | Over-engineered Phase 1A; delayed delivery | Strictly enforce scope checklist in acceptance testing |
| R-008 | SVG dimensions incorrect causing LightBurn scaling errors | High | Low | Unusable production output | Validate mm units in SVG output tests; confirm in manual LightBurn test |
| R-009 | HarfBuzz cluster tracking not preserved causing glyph-to-character misalignment | Medium | Low | Phase 1B connectivity analysis cannot work correctly | Capture cluster index in Canonical Geometry Model from day one |
| R-010 | Node.js version conflict causing frontend build failure | Low | Low | Frontend build fails | Lock Node.js version in `.nvmrc` or document minimum version |

## 13.2 Phase 1A Risk Acceptance

Phase 1A may proceed accepting R-002 (Pillow PNG fallback) and R-005 (machine-specific font path) as known and documented limitations. All other risks must be mitigated before the phase completion report is accepted.

---

# 14. Development Phases Within Phase 1A

Phase 1A is delivered as a single cohesive implementation but can be sequenced internally in five development steps for practical execution:

## Step 1 — Backend Foundation

Deliverable: FastAPI application starts locally and returns a health response.

Tasks:
- Create `/backend/app/main.py` with FastAPI application
- Create `/backend/requirements.txt` with pinned dependencies
- Install dependencies into virtual environment
- Add `/backend/app/api/routes/fonts.py` with `GET /api/fonts` stub
- Add `/backend/app/api/routes/generation.py` with `POST /api/generate` stub
- Verify application starts with `uvicorn`

Exit criterion: `GET /api/fonts` returns an empty list without error.

## Step 2 — Font Processing Engine

Deliverable: Fonts are discovered, catalogued, and available via the fonts API.

Tasks:
- Implement `font_loader.py` — font discovery and deduplication
- Implement `unicode_normalisation.py` — NFC normalisation and rejection logic
- Implement `text_shaper.py` — HarfBuzz shaping with `uharfbuzz`
- Implement `outline_extractor.py` — FontTools pen-based outline extraction
- Wire font discovery into `GET /api/fonts`
- Write unit tests for normalisation and shaping modules

Exit criterion: `GET /api/fonts` returns real fonts; unit tests for normalisation pass.

## Step 3 — Canonical Geometry and Export Engines

Deliverable: The full generation pipeline produces SVG and PNG from text input.

Tasks:
- Implement `canonical_geometry.py` — Canonical Geometry Model construction
- Implement `svg_exporter.py` — SVG document assembly with `svgwrite`
- Implement `png_exporter.py` — PNG generation with CairoSVG and Pillow fallback
- Implement `generation_service.py` — orchestrate full pipeline
- Wire generation into `POST /api/generate`
- Write unit tests for canonical geometry, SVG exporter, and PNG exporter

Exit criterion: `POST /api/generate` returns valid SVG and PNG bytes for "Oliver".

## Step 4 — Frontend Application

Deliverable: The local browser UI allows end-to-end workflow.

Tasks:
- Set up Vite + React + TypeScript + Tailwind project
- Implement `generationApi.ts` — API client
- Implement `TextInput.tsx`, `FontSelector.tsx`, `PreviewPanel.tsx`, `ExportControls.tsx`
- Implement `App.tsx` — root component with state management
- Configure Vite dev proxy to backend at `localhost:8000`
- Validate frontend production build

Exit criterion: User can enter text, select font, click Generate, see preview, download SVG and PNG.

## Step 5 — Integration Testing, Manual Testing, and Documentation

Deliverable: Phase 1A passes all acceptance criteria.

Tasks:
- Write and run integration tests for all names in the required corpus
- Run the manual test checklist for each name category
- Perform LightBurn import validation
- Confirm performance targets are met
- Update README.md with setup and run instructions
- Complete `phase-1a-implementation-handoff.md`
- Complete `phase-1a-completion-report.md`
- Create git commit with message `feat: phase 1a core text generation`

Exit criterion: All acceptance criteria pass; documentation is complete.

---

# 15. Acceptance Criteria

Phase 1A is considered complete when ALL of the following are true:

| Criterion | Validation Method |
|---|---|
| User can enter text | Manual test |
| User can select a font from discovered fonts | Manual test |
| Text is Unicode-normalised | Unit test |
| Text is shaped through HarfBuzz (uharfbuzz) | Unit test |
| Font outlines are extracted | Unit test |
| Canonical Geometry Model is created | Unit test |
| SVG is generated with mm dimensions and path geometry | Unit test + manual |
| PNG is generated | Unit test |
| SVG preview displays in browser | Manual test |
| Download SVG is available | Manual test |
| Download PNG is available | Manual test |
| SVG imports successfully into LightBurn | Manual test by project owner |
| All integration tests pass for required name corpus | Automated test |
| No Phase 1B or later features are implemented | Scope review |
| README.md is updated with setup instructions | Manual review |
| `phase-1a-implementation-handoff.md` is complete | Document review |
| `phase-1a-completion-report.md` is complete | Document review |

---

# 16. Handoff Strategy

## 16.1 Documents To Create at Phase Completion

| Document | Path | Content |
|---|---|---|
| Implementation Handoff | `/docs/handoffs/phase-1a-implementation-handoff.md` | Objectives completed, files created, files modified, technical decisions, architecture changes, dependencies, testing performed, known issues, risks, performance metrics, documentation updates, git information |
| Completion Report | `/docs/handoffs/phase-1a-completion-report.md` | Scope delivered, acceptance criteria results, testing performed, known issues, Phase 1B readiness assessment, final recommendation |

## 16.2 Documents To Update at Phase Completion

| Document | Update Required |
|---|---|
| `/README.md` | Add Phase 1A setup instructions, run commands, and Phase 1A status |
| `/docs/phases/PHASE_01_WELDED_TEXT_GENERATOR_IMPLEMENTATION.md` | Update status to Completed |

## 16.3 Git Commit

A single meaningful commit must be made at phase completion:

```
feat: phase 1a core text generation
```

## 16.4 Release Tag

Apply release tag `v0.1.0` at phase acceptance.

## 16.5 Phase 1B Prerequisites

Phase 1B must not begin until:

1. Phase 1A completion report is accepted by the project owner.
2. LightBurn import validation is confirmed by the project owner.
3. The PNG rendering limitation (Pillow fallback) is accepted or escalated.
4. Python runtime version guidance is confirmed for development machines.
5. A Phase 1B Implementation Plan is produced and approved.

---

# 17. API Specification

## 17.1 GET /api/fonts

Response:

```json
{
  "fonts": [
    {
      "id": "font-identifier",
      "name": "Font Family Name",
      "style": "Regular",
      "path": "/absolute/path/to/font.ttf"
    }
  ]
}
```

Notes:
- Fonts are sorted alphabetically by name.
- Duplicates are hidden — only one entry per unique `{name} {style}`.
- The `id` field is stable for a given session and is used in generation requests.

## 17.2 POST /api/generate

Request:

```json
{
  "text": "Oliver",
  "fontId": "font-identifier"
}
```

Validation:
- `text` must not be empty or whitespace-only.
- `fontId` must match a font from the catalogue.

Response:

```json
{
  "svgContent": "<svg ...>...</svg>",
  "pngBase64": "base64-encoded-png-bytes",
  "geometry": { /* Canonical Geometry Model */ },
  "dimensions": {
    "width": 114.22,
    "height": 37.11,
    "units": "mm"
  }
}
```

Error response:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

# 18. Configuration

## 18.1 Backend Configuration

The backend is configured through environment variables or a local config file (no secrets committed to the repository):

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `127.0.0.1` | Backend listen address |
| `PORT` | `8000` | Backend listen port |
| `FONT_PATHS` | `/fonts` | Additional font search paths (comma-separated) |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

## 18.2 Frontend Configuration

The Vite dev server proxies `/api` requests to the backend at `http://localhost:8000`.

---

# 19. Security Considerations

Phase 1A is a local-only application. The following apply:

- No hardcoded credentials or API keys.
- No external network requests in Phase 1A.
- Input text is validated and sanitised before processing.
- Font file paths are resolved from the trusted catalogue — user input cannot specify arbitrary file paths.
- No user-uploaded files in Phase 1A.

---

# 20. Performance Targets

| Metric | Target |
|---|---|
| Font discovery at startup | <2 seconds |
| Font shaping per request | <5 seconds |
| SVG generation end-to-end | <30 seconds |
| Browser preview render | <5 seconds |
| Export download | <5 seconds |

---

# 21. Stop Condition

This document represents the complete Phase 1A Implementation Plan.

No Phase 1A development may begin until this plan is reviewed and approved.

After approval:

- Proceed to Phase 1A Step 1 — Backend Foundation.
- Follow the development sequence in Section 14.
- Do not expand scope beyond what is documented here.
- Stop at Phase 1A completion and present the Completion Report before beginning Phase 1B planning.

---

# 22. Approval

Approved By:

Pending

Approval Date:

Pending

---

# End of Document
