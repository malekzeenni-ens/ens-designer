# CAKE_TOPPER_FEATURE_SPECIFICATION.md

## Document Information

Feature: Cake Topper Designer
Phase: X (delivered), Phase 2 (formal phase)
Version: 1.1
Date: 2026-06-01
Owner: Etch 'N' Shine
Status: Implemented — line movement drag resolved and documented

---

# 1. Business Context

## 1.1 The Problem

Etch 'N' Shine produces personalised cake toppers as one of its core laser-cut product lines. A typical cake topper contains:

- A name or occasion phrase (e.g. "Happy Birthday", "Baby Shower")
- Stacked on multiple lines with different fonts for each line
- Each line may be a different size for visual hierarchy (e.g. "Happy" in a smaller script font, "Birthday" in a large bold font)

The current manual workflow:
1. Create each line of text separately in XCS
2. Reduce character spacing until letters in each word overlap and connect
3. Stack the lines manually, adjusting vertical gaps until the composition looks right
4. Set alignment (centred is most common)
5. Export and cut

This process takes several minutes per design, is inconsistent between operators, and cannot be easily repeated for slight variations.

## 1.2 The Solution

The Cake Topper Designer workspace automates this workflow:

1. Type the full phrase once ("Happy Birthday Sarah")
2. System auto-splits by space into separate lines
3. Each line gets independent font, size, overlap, and alignment controls
4. Vertical gaps between lines are adjustable with immediate preview
5. Floating component dots (e.g. on the letter 'i') can be repositioned
6. Each line can be repositioned with numeric X/Y canvas offsets or by dragging its preview overlay
7. Export one combined SVG ready for LightBurn

---

# 2. User Stories

## US-01 — Basic Cake Topper

As a laser business owner,
I want to type "Happy Birthday" and generate a two-line design,
so that I get a LightBurn-compatible composition SVG ready for operator validation before cutting.

**Acceptance Criteria:**
- "Happy" appears on Line 1
- "Birthday" appears on Line 2
- Both lines use the selected font
- Output is a single centred SVG with both lines composed
- SVG contains path outlines, not editable text elements
- SVG uses millimetre dimensions with a matching viewBox

---

## US-02 — Different Font Per Line

As a laser business owner,
I want to use a script font for "Happy" and a bold font for "Birthday",
so that the design has visual hierarchy typical of celebration signage.

**Acceptance Criteria:**
- Each line has its own font selector
- Changing one line's font does not affect the other
- Preview updates immediately

---

## US-03 — Different Size Per Line

As a laser business owner,
I want "Birthday" larger than "Happy" to create a focal point,
so that the main text stands out.

**Acceptance Criteria:**
- Each line has its own size (mm) input
- Sizes are independent
- Canvas accommodates the largest line

---

## US-04 — Vertical Overlap Control

As a laser business owner,
I want to push the two lines closer together until they slightly overlap,
so that the design is one connected piece for structural strength.

**Acceptance Criteria:**
- Vertical gap control between each pair of lines
- Negative value = lines move closer (overlap)
- Positive value = space added
- Preview updates immediately

---

## US-05 — Letter Spacing Control Per Line

As a laser business owner,
I want to control how tightly each word's letters overlap,
so that I can create a connected name-sign style for "Birthday" while keeping "Happy" lightly overlapping.

**Acceptance Criteria:**
- Each line has full Phase X per-gap controls
- Each gap can be toggled on/off independently
- Each gap has its own mm value

---

## US-06 — Dot Repositioning

As a laser business owner,
I want to move the dot on the letter 'i' closer to the stroke,
so that the dot is connected to the rest of the design and doesn't fall out when cut.

**Acceptance Criteria:**
- Floating component (dot) controls appear when detected
- X offset: left/right
- Y offset: up/down (positive = toward stroke)
- Controls remain visible regardless of how far the dot is moved

---

## US-07 — Line Alignment

As a laser business owner,
I want to independently align each line (left, center, right, or manual offset),
so that I can create asymmetric and creative compositions.

**Acceptance Criteria:**
- Each line has L / C / R / M alignment buttons
- Manual (M) exposes a numeric X offset input
- All four options visible and selectable

---

## US-08 — Manual Line Repositioning

As a laser business owner,
I want to drag a generated line directly in the preview or type exact X/Y offsets,
so that I can fine-tune the composition without leaving the app.

**Acceptance Criteria:**
- Each generated line exposes numeric canvas position offset controls for X and Y in mm
- Dragging the dashed preview overlay moves the selected line visually during drag
- Releasing the drag accumulates the movement into `manual_x_offset_mm` and `manual_y_offset_mm`
- The regenerated SVG reflects the moved line position
- Reset returns the line's manual canvas offsets to 0mm

---

# 3. Functional Requirements

## FR-CT-01

System accepts a text input of up to 4 space-separated words.
Each word becomes one line in the composition.
Maximum 4 lines.

The cap is enforced by the `MAX_LINES = 4` constant in `backend/app/cake_topper_engine.py`. Words beyond position 4 are silently discarded. The frontend derives the same word list using the same `text.split()[:4]` logic so the UI and backend always agree.

If a phrase produces fewer than 4 words, only those lines are generated. There is no minimum word requirement beyond 1.

---

## FR-CT-02

Each line is independently configurable with:
- Font (selected from the same font catalogue as all other tabs)
- Size in mm (the em-height of the text, default 42mm)
- Alignment: Left / Center / Right / Manual (X offset in mm)
- Manual canvas position offset: X/Y in mm, additive after alignment and stacking
- Letter overlap mode and per-gap controls (identical to Overlap Engine)
- Floating component X/Y controls (if the font has detectable floating components)

---

## FR-CT-03

The default font and size apply to all lines until overridden per-line.

---

## FR-CT-04

Vertical gap controls appear between each pair of consecutive lines.

- Positive value (mm): space between lines
- Negative value (mm): lines overlap (Line N+1 moves up into Line N)
- Default: 3mm space
- Re-generates immediately on change

---

## FR-CT-05

The output is a single combined SVG containing all lines positioned and aligned.

Lines are composited in order from top to bottom using **flat path assembly** — individual path outlines are placed at their computed positions. No boolean union or path welding is performed.

SVG uses `fill-rule="nonzero"` for correct rendering of overlapping paths. Overlapping regions of same-winding paths remain visually solid. Counter holes (inside letters such as O, e, a) are preserved because standard fonts use opposite winding for inner contours.

---

## FR-CT-06

System exports:
- SVG (production — LightBurn-compatible composition output)
- PNG (preview only — not a production cutting file)

PNG generation uses CairoSVG as the primary renderer. CairoSVG requires `libcairo-2.dll` to be installed on Windows. If the native library is absent, the fallback currently produces a blank transparent image. See Section 17 for the dependency and setup details.

---

## FR-CT-07

The system does NOT perform:
- Connectivity analysis
- Bridge generation
- Material validation
- Structural scoring

---

## FR-CT-08

The preview supports direct drag-to-move for generated lines.

- The backend remains the source of truth for final line position.
- The frontend converts pointer movement from pixels to mm using the rendered SVG host dimensions and backend metadata canvas dimensions.
- Drag release adds the mm delta to the line's current manual canvas offsets.
- The frontend immediately calls `POST /api/cake-topper` with updated `manual_x_offset_mm` and `manual_y_offset_mm`.
- The preview overlay is selection/drag UI only; it is not included in exported SVG or PNG output.

---

# 4. UI / UX Specification

## 4.1 Layout

Current UI mode: Cake Topper-only. The older Text Generator and Overlap Engine workflows remain in the repository for possible future reactivation, but their tabs are not shown in the app shell.

```
┌────────────────────────────────────────────────────────────┐
│ [Text input]  [Font search] [Font ▾]  [Size mm]  [Generate]│  ← full width
├────────────────────────────────────────────────────────────┤
│ [Line 1: Happy] [Line 2: Birthday]                         │  ← word chips
├────────────────────────────────────────────────────────────┤
│ Letter overlap: [Light 0.5] [Auto 1] [Medium 1.5] [Strong] │  ← global mode
├──────────────────────────┬─────────────────────────────────┤
│                          │ ▼ Line 1 — Happy  |  Font · 42mm│
│      SVG Preview         │   Font: [▾]  Size: []  Align: [] │
│      (sticky)            │   Letter gaps: H→a ✓  a→p ✓     │
│                          │   ↕ Gap 1→2  [ -3.0 ] mm        │
│                          │ ▶ Line 2 — Birthday  (collapsed) │
│                          │   ↕ Gap 2→3  [ +5.0 ] mm        │
│                          │ ▶ Line 3 — Sarah  (collapsed)   │
├──────────────────────────┴─────────────────────────────────┤
│ [filename]          [Download SVG]  [Download PNG]          │  ← full width
└────────────────────────────────────────────────────────────┘
```

## 4.2 Line Accordion Card

Each line is an accordion card. Collapsed header shows:
```
▶  Line 2 — Birthday   Andalus · 42mm · center   [6 gaps]   124.4 × 38.3 mm
```

Expanded body shows:
```
Font: [Andalus ▾]   Size (mm): [42]   Align: [L] [C̲] [R] [M]

Letter gaps:
  [B→i ✓ 1.5mm -3.5]  [i→r ✓ 3.3mm -3.3]  [r→t ✗]  [t→h ✓ 1.5mm -1.5]  ...

(if floating components detected)
Floating dots:
  'i' dot   ↔ X [ 0.0 ] mm    ↕ Y [ 3.0 ] mm   ↓ down
```

## 4.3 Vertical Gap Row

Between each pair of card headers:
```
↕ Gap 1→2   [ -3.0 ] mm        ↑ overlap
```

Hint shows "↑ overlap" for negative values, "↓ space" for positive.

## 4.4 Alignment Buttons

Four compact buttons labelled: **L** / **C** / **R** / **M**

| Button | Label | Behaviour |
|---|---|---|
| L | Left | Line left-aligned to canvas left padding |
| C | Center | Line centred within canvas |
| R | Right | Line right-aligned to canvas right padding |
| M | Manual | Shows X offset (mm) input |

Selecting M reveals:
```
X offset (mm): [ 12.5 ]
```

---

## 4.5 Canvas Position Offset and Preview Drag

Each line accordion includes **Canvas position offset** controls:

```text
Canvas position offset
  X [ 0.0 ] mm   Y [ 0.0 ] mm   [Reset]
```

These offsets are additive after alignment and vertical stacking. They are intended for final composition nudging rather than replacing the alignment buttons.

The SVG preview overlays one dashed draggable rectangle per generated line. Dragging a rectangle:

1. Selects the line when the drag completes.
2. Shows temporary visual movement during drag.
3. Converts the drag distance to mm.
4. Adds the delta to the line's manual canvas offsets.
5. Regenerates the SVG from the backend.

Implementation note: `PreviewPanel.tsx` uses native `document` pointer listeners in capture phase and defers selection state updates until pointer up so React re-renders do not detach the active drag handle mid-gesture.

---

# 5. Technical Architecture

## 5.1 Backend Module

File: `backend/app/cake_topper_engine.py`

Class: `CakeTopperService`

```python
class CakeTopperService:
    project_root: Path
    font_catalog: FontCatalog

    def generate(request: CakeTopperRequest) -> CakeTopperResponse
    def _generate_line(word, cfg, request, line_index) -> (CanonicalGeometry, dict)
```

## 5.2 Processing Pipeline Per Line

```text
word (from text.split())
    ↓
normalise_text()           Unicode NFC normalisation
    ↓
shape_text()               HarfBuzz text shaping
    ↓
extract_outlines()         FontTools pen-based outline extraction
                           Uses font_size_mm parameter for scaling
    ↓
build_geometry()           Canonical Geometry Model creation
    ↓
_bbox_gaps()               Bounding-box inter-glyph gap measurement
    ↓
_pair_shifts()             Per-pair shift computation (gap_configs + default)
    ↓
_cumulative()              Cumulative per-glyph shift
    ↓
_shift_paths()             Apply x-shifts to path coordinates
    ↓
detect_floating_components()  Detect floating dots/accents (pre-offset)
    ↓
apply_floating_offsets()   Apply X/Y to floating subpaths only
    ↓
geometry.model_copy()      Update paths, recalculate bounds
```

## 5.3 Canvas Assembly

After all lines are generated:

```text
canvas_width = max(line.ink_width for all lines) + 2 × CANVAS_PADDING_MM

For each line:
  x_offset = _compute_x_offset(alignment, ink_width, canvas_width)
  manual_x = cfg.manual_x_offset_mm
  manual_y = cfg.manual_y_offset_mm
  x_translate = x_offset - geom.bounds.min_x + manual_x
  y_translate = y_cursor - geom.bounds.min_y + manual_y
  translated_paths = _translate_paths(paths, x_translate, y_translate, prefix=f"L{i}-")
  y_cursor += ink_height + inter_line_gap[i]

canvas_height = y_cursor + CANVAS_PADDING_MM

SVG assembled from all translated_paths
```

## 5.4 Path ID Prefixing

Each line's paths are prefixed to avoid ID conflicts in the combined SVG:
- Line 0: `L0-path-0001`, `L0-path-0002`
- Line 1: `L1-path-0001`, `L1-path-0002`

## 5.5 Floating Component Detection

File: `backend/app/floating_component.py`

Detection: subpath whose vertical bounding box does not overlap with the largest subpath.

In SVG y-down coordinates:
- Dot sits above the stroke → `dot.max_y < stroke.min_y`
- This means no vertical overlap → classified as floating

Application: only the floating subpath's command coordinates are modified (dx, dy). The main stroke is unchanged.

**Critical order:** detect → apply offsets → recalculate bounds.

Detection must run on pre-offset paths. If it ran post-offset, moving the dot toward the stroke until it touched would cause re-detection to reclassify the dot as "not floating" and hide the controls.

## 5.6 Font Scaling

The `outline_extractor.py` accepts `font_size_mm` (em-height in mm):

```python
scale = font_size_mm / upem
```

Default: 42mm (used by Text Generator and Overlap Engine).
Cake Topper passes `cfg.font_size_mm` per line.

---

# 6. API Reference

## POST /api/cake-topper

### Request Model

```python
class CakeTopperRequest(BaseModel):
    text: str                          # Full phrase — auto-split by spaces
    default_font_id: str               # Applied to lines without per-line config
    default_font_size_mm: float = 42.0
    default_overlap_mode: str = "medium"
    default_overlap_custom_mm: float | None = None
    line_configs: list[CakeTopperLineConfig] = []  # Per-line overrides by index
    inter_line_gaps_mm: list[float] = []           # N-1 gaps for N lines

class CakeTopperLineConfig(BaseModel):
    font_id: str
    font_size_mm: float = 42.0
    alignment: Literal["left","center","right","manual"] = "center"
    alignment_offset_mm: float = 0.0
    overlap_mode: str = "medium"
    overlap_custom_mm: float | None = None
    gap_configs: list[OverlapGapConfig] = []
    floating_offsets: list[FloatingComponentOffset] = []
    manual_x_offset_mm: float = 0.0
    manual_y_offset_mm: float = 0.0
```

### Response Model

```python
class CakeTopperResponse(BaseModel):
    svg: str
    png_base64: str
    svg_filename: str
    png_filename: str
    metadata: CakeTopperMetadata

class CakeTopperMetadata(BaseModel):
    words: list[str]
    lines: list[CakeTopperLineMetadata]
    inter_line_gaps_mm: list[float]
    canvas_width_mm: float
    canvas_height_mm: float

class CakeTopperLineMetadata(BaseModel):
    text: str
    glyph_chars: list[str]          # For letter label generation
    gaps_before_mm: list[float]
    gaps_after_mm: list[float]
    width_mm: float
    height_mm: float
    x_offset_mm: float              # Horizontal canvas position after alignment
    y_offset_mm: float              # Vertical canvas position after stacking
    manual_x_offset_mm: float       # Additive manual canvas X offset
    manual_y_offset_mm: float       # Additive manual canvas Y offset
    floating_components: list[FloatingComponentInfo]
```

---

# 7. Data Flow Diagram

```text
User Input: "Happy Birthday Sarah"
         ↓
text.split() → ["Happy", "Birthday", "Sarah"]  (max 4)
         ↓
For each word:
  ├── normalise_text()
  ├── shape_text(font_path)           ← HarfBuzz
  ├── extract_outlines(font_path,     ← FontTools
  │       font_size_mm=cfg.font_size_mm)
  ├── build_geometry()                ← Canonical Geometry Model
  ├── _bbox_gaps()                    ← Per-pair gap measurement
  ├── _pair_shifts(gap_configs)       ← Per-gap overlap computation
  ├── _shift_paths()                  ← Apply x-shifts
  ├── detect_floating_components()    ← Pre-offset detection
  ├── apply_floating_offsets()        ← Move dot/accent X/Y
  └── recalculate_geometry_bounds()
         ↓
Compute canvas_width from widest line
         ↓
For each line:
  ├── _compute_x_offset(alignment)    ← L/C/R/Manual
  ├── add manual_x_offset_mm/manual_y_offset_mm
  ├── _translate_paths(x, y)          ← Canvas position
  └── Append to combined paths list
         ↓
_assemble_svg(all_paths, canvas_width, canvas_height)
fill-rule="nonzero"
         ↓
export_png() via CairoSVG or Pillow fallback
         ↓
CakeTopperResponse
```

---

# 8. Performance

| Operation | Target | Notes |
|---|---|---|
| Single-line generation | < 2 seconds | Equivalent to Overlap Engine |
| Two-line generation | < 4 seconds | Two pipeline runs + canvas assembly |
| Three-line generation | < 6 seconds | Three pipeline runs |
| Four-line generation | < 8 seconds | Four pipeline runs |

All pipeline runs are sequential (not parallelised). Parallelisation would reduce multi-line times by ~50% and is a future optimisation.

---

# 9. Acceptance Criteria

| Criterion | Validation |
|---|---|
| "Happy Birthday" splits to Line 1: Happy, Line 2: Birthday | Manual |
| Line 1 header shows "Happy", not "Birthday" (not last-word bug) | Automated + manual |
| Each line uses its selected font and size | Manual |
| Changing Line 1 font does not affect Line 2 | Manual |
| Negative vertical gap pushes lines together | Manual |
| Letters within each line connect via overlap | Manual |
| Floating dot control appears for fonts with detectable dots | Manual |
| Dot Y offset pushes dot toward stroke | Manual |
| Dot controls remain visible after dot touches stroke | Manual |
| Alignment L/C/R/M all visible and selectable | Manual |
| Manual (M) alignment reveals X offset input | Manual |
| Canvas X/Y offset controls move a line and regenerate SVG | Automated + manual |
| Preview line drag moves a selected line and persists to backend offsets | Manual |
| Reset clears manual canvas offsets | Manual |
| SVG imports correctly into LightBurn | Manual (LightBurn validation) |
| Dimensions correct in LightBurn | Manual |
| No connectivity_score or material data in response | Automated |

---

# 10. Known Limitations

| Limitation | Severity | Recommendation |
|---|---|---|
| Maximum 4 lines (hardcoded via `MAX_LINES = 4`) | Low | Configurable MAX_LINES in a future phase if needed |
| Floating detection is bounding-box vertical only | Low | Shapely-based detection for a future phase |
| Canvas uses flat path assembly — no boolean union | Medium | Visual overlap is correct; overlapping outlines are visible in LightBurn path-edit mode. LightBurn's Optimise/Weld function can merge paths if required by the operator. |
| CairoSVG requires `libcairo-2.dll` on Windows — if absent, PNG fallback is a blank transparent image | High | Install GTK3 runtime (includes libcairo-2.dll) for Windows. PNG is preview only — SVG export is unaffected. See Section 17. |
| No auto-alignment suggestion | Low | Could suggest alignment based on word length ratios in a future phase |
| Per-line pipeline runs sequentially | Low | Parallelise for speed in a future phase |

---

# 11. Future Enhancements (Phase 2)

The formal Phase 2 (Cake Topper Generator) will build on this foundation with:

- Cake topper stake geometry (single stake, double stake, stake sizing)
- Automatic structural validation (minimum feature sizes for stakes)
- Material-aware stake width recommendations
- Auto-positioning of stakes relative to text
- Preset compositions (Name + Date, Happy Birthday + Name, etc.)
- LightBurn layer assignment (cut layer for outline, engrave layer for decoration)

---

# 12. Related Documents

| Document | Path |
|---|---|
| Phase X Overlap Engine plan | /docs/phases/PHASE_X_OVERLAP_ENGINE_IMPLEMENTATION.md |
| Phase X Completion Report | /docs/handoffs/phase-x-completion-report.md |
| Phase X Implementation Handoff | /docs/handoffs/phase-x-implementation-handoff.md |
| Phase 2 Cake Topper (formal) | /docs/phases/PHASE_04_DECORATIVE_LIBRARY_IMPLEMENTATION.md |
| Phase Index | /docs/phases/PHASE_INDEX.md |
| Cake Topper QA Matrix | /docs/qa/CAKE_TOPPER_QA_MATRIX.md |
| Improvement Phase 1 Handoff | /docs/handoffs/cake-topper-improvement-phase1-handoff.md |
| Canvas Line Movement Drag Resolution | /docs/handoffs/canvas-line-movement-drag-bug-handoff.md |
| Spec Review | /docs/reviews/cake_topper_spec_review.md |
| Coding Agent Prompt | /docs/prompts/cake_topper_recommendations_coding_agent_prompt.md |

---

# 13. Visual Overlap vs Boolean Union Behaviour

## What the app does

The Cake Topper engine places letter paths and line paths at computed canvas positions. When two letters overlap (via the per-gap overlap controls) or two lines overlap (via negative vertical gap), the SVG contains the individual path outlines positioned so they visually share the same region.

SVG rendering uses `fill-rule="nonzero"`, which means:

- Where two same-winding paths overlap, the region renders as solid black (visually connected).
- Counter holes inside letters (O, e, a, b, d, p, 0, 6, 8, 9) use opposite winding in standard fonts and remain visible as holes.

## What the app does NOT do

The engine does **not** perform:

- Boolean path union — individual path outlines remain separate objects in the SVG file.
- Path welding — no SVG path element merges the shapes into a single continuous outline.
- Connectivity analysis — the engine does not check whether all shapes form one connected piece.
- Structural validation — no check for minimum feature size, thin bridges, or isolated floating pieces.

## Practical consequence

When imported into LightBurn in path-edit mode, you will see individual letter outlines that may overlap but are not merged. LightBurn's **Optimise** function (or manually applying **Weld** in LightBurn) can merge overlapping same-winding paths into a true single outline if required.

For most operator workflows, visual overlap at `fill-rule="nonzero"` is sufficient to produce a correct cut. However, the operator should verify the design in LightBurn before cutting, particularly if the font or phrase produces unusual glyph boundaries.

## Recommended user guidance

> The Cake Topper tab produces a composed, outline-based SVG intended for import into LightBurn. It visually overlaps letters and lines according to your spacing controls. In the current phase the system does not guarantee a boolean-unioned single continuous path, does not perform structural validation, and does not certify the design as cut-ready without operator review.

---

# 14. Export Contract

The SVG produced by the Cake Topper engine must satisfy the following invariants on every generation:

| Invariant | Value |
|---|---|
| Width unit | `mm` (e.g., `width="134.4mm"`) |
| Height unit | `mm` (e.g., `height="92.5mm"`) |
| viewBox | `0 0 <width_mm> <height_mm>` — zero-origin, matches physical dimensions |
| SVG namespace | `xmlns="http://www.w3.org/2000/svg"` |
| Contains `<text>` elements | No — all text is converted to path outlines before export |
| Contains editable font references | No — output is independent of installed fonts |
| Fill rule | `fill-rule="nonzero"` on every path element |
| Stroke | `stroke="none"` on every path element |
| Fill colour | `fill="#000000"` (solid black) |
| Background rectangle | Not present |
| Path ID prefixing | Line 0 paths: `L0-…`, Line 1 paths: `L1-…`, etc. (avoids ID conflicts) |
| Canvas padding | 5mm padding on all sides (`CANVAS_PADDING_MM = 5.0`) |
| Minimum canvas width | `max(line ink widths) + 10mm` |
| Boolean union performed | No |
| Structural validation performed | No |

### PNG export note

PNG output is **preview only**. It must not be used as the production cutting file.

The PNG is generated from the SVG using CairoSVG. If CairoSVG's native library (`libcairo-2.dll` on Windows) is not installed, a blank transparent PNG is returned. The SVG export is unaffected by CairoSVG availability.

---

# 15. Cut-Readiness Disclaimer

The Cake Topper tab **does not** produce a guaranteed single-piece, structurally validated, laser-cut-ready file.

What it does produce:

- A correctly dimensioned, outline-based, LightBurn-compatible SVG.
- Visual letter-level overlap where configured.
- Visual line-level overlap where configured via negative vertical gap.
- Font counter holes preserved via `fill-rule="nonzero"` and standard font winding conventions.

What requires operator verification before cutting:

1. Import the SVG into LightBurn and check the displayed dimensions match the expected physical size.
2. Visually confirm all letters are visible and no glyphs are missing.
3. Confirm counter holes (O, e, a, b, d, p, 0, 6, 8, 9) are open, not filled.
4. Confirm the design appears connected — lines and letters should visually overlap where intended.
5. If LightBurn shows disconnected path segments, use LightBurn's **Optimise** or **Weld** function.
6. Perform a test cut before cutting production material.

If any of these checks fail, do not proceed to cutting.

---

# 16. Error Handling Contract

### Backend error responses

The backend returns HTTP 400 with a plain-text `detail` field for the following conditions:

| Condition | HTTP Status | Message |
|---|---|---|
| Text produces zero words after stripping whitespace | 400 | `Text must contain at least one word.` |
| Font ID not found in catalogue | 400 | Font-loader error message |
| Any internal generation failure | 400 | Error message from the exception |

Pydantic validation errors (e.g., `font_size_mm` out of range, `overlap_mm` invalid) return HTTP 422 with a structured detail array. The frontend `_readError()` helper handles both 400 and 422 formats.

### Frontend error display

Errors are displayed in a `<div class="ct-error">` block between the overlap shortcut row and the canvas. The message is extracted from the API response and shown verbatim for 400 errors, or as a formatted field-level summary for 422 errors.

### Currently unhandled (planned for Improvement Phase 2A)

- Backend server not running — currently shows "Could not generate cake topper." Should detect network failure and show "Backend is not running. Start the local server and retry."
- Missing glyph in selected font — currently silently produces a `?` path with no warning.
- Font size or gap value produces zero-width geometry — no guard currently.

---

# 17. Local Runtime and Startup

This is a local web application. No internet connection is required after initial dependency installation.

### Backend

```powershell
# From the repository root
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload
```

The active local repository uses the Python virtual environment at the repository root (`.venv`), not `backend/.venv`.

The backend binds to `127.0.0.1` only (not `0.0.0.0`) — accessible from the local machine only.

### Frontend

```bash
# From the repository root
cd frontend
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. The frontend proxies API calls to `http://localhost:8000`.

If the browser shows a blank screen with Vite `504 (Outdated Optimize Dep)` errors, restart the frontend with forced dependency re-optimisation:

```powershell
Start-Process -FilePath "cmd" -ArgumentList "/c","cd frontend && npm run dev -- --force" -WindowStyle Hidden
```

Then hard refresh Chrome with `Ctrl + Shift + R`, or enable DevTools Network `Disable cache` and refresh once.

### Required Python dependencies

Key dependencies for Cake Topper functionality:

| Package | Purpose | Required |
|---|---|---|
| `fastapi` | API framework | Yes |
| `uvicorn` | ASGI server | Yes |
| `pydantic` | Data validation | Yes |
| `uharfbuzz` | Text shaping | Yes |
| `fonttools` | Outline extraction | Yes |
| `svgwrite` | SVG generation | Yes |
| `Pillow` | PNG fallback renderer | Yes |
| `cairosvg` | PNG renderer (primary) | Optional — see note |
| `cairocffi` | Cairo Python bindings | Optional — see note |

### CairoSVG on Windows

CairoSVG requires the native Cairo graphics library (`libcairo-2.dll`) to be installed as a system dependency, separate from the Python package. On Windows:

- The Python package `cairosvg` can be `pip install`ed without error.
- The import will succeed, but calling `cairosvg.svg2png()` will raise `OSError: no library called "cairo-2" was found` if the native DLL is absent.
- The cake topper engine catches this and falls back to a **blank transparent PNG**.

**To enable proper PNG preview on Windows:**

Install the [GTK3 runtime for Windows](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer). This provides `libcairo-2.dll`. After installation, restart the backend server.

**Current machine status (confirmed 2026-06-01):** CairoSVG Python package installed, `libcairo-2.dll` NOT present. PNG previews are blank. SVG export is unaffected.

### Ports

| Service | Host | Port |
|---|---|---|
| Backend | 127.0.0.1 | 8000 |
| Frontend dev server | localhost | 5173 |

### Offline behaviour

Once all dependencies are installed and fonts are present in the project font directory, the application runs with no internet access required. No external API calls are made during generation or export.

### Font location

Fonts are loaded from the project font directory by `backend/app/font_loader.py`. The exact path is configured in the font catalogue. Fonts must be present before the backend starts — there is no dynamic font download.

### Export and download

SVG and PNG downloads use browser-based blob download initiated by the `ExportControls` component. Files are not written to disk by the backend; they are streamed via the API response and downloaded by the browser.

---

# 18. Font Handling Rules

### Supported font formats

The font loader accepts font files compatible with HarfBuzz and FontTools. TrueType (`.ttf`) and OpenType (`.otf`) fonts are supported. Web font formats (`.woff`, `.woff2`) are not supported without prior conversion.

### Font catalogue

Fonts are catalogued at startup by `backend/app/font_loader.py`. Each font is assigned a stable `font_id` derived from its filename. Fonts added to the font directory are available after a backend restart.

### Missing font handling

If a `font_id` in the request does not correspond to a catalogued font, `font_catalog.get_font_path()` raises a `ValueError`. The route handler converts this to an HTTP 400 response.

### Missing glyph handling (current limitation)

If the selected font does not contain a glyph for a character in the input text, HarfBuzz and FontTools will produce either:

- A `.notdef` glyph (empty box or zero-width path), or
- No path commands for that character.

The `_extract_chars()` function pads or truncates the character list with `?` if the glyph count does not match the text character count. No user warning is currently shown.

**Impact:** A phrase using characters not supported by the selected font may produce missing letters in the output without any error or warning. The operator should visually inspect the SVG preview before cutting.

**Planned fix:** Improvement Phase 2A will add explicit missing glyph detection and a warning in the API response.

### Font licensing

The font catalogue contains fonts made available for the Etch 'N' Shine production workflow. Font licensing is the responsibility of the operator. Do not add fonts to the catalogue that are not licensed for commercial production use.

---

# End of Document
