# CAKE_TOPPER_FEATURE_SPECIFICATION.md

## Document Information

Feature: Cake Topper Designer
Phase: X (delivered), Phase 2 (formal phase)
Version: 1.1
Date: 2026-06-09
Owner: Etch 'N' Shine
Status: Implemented — Glyph Browser modal popup and SVG recipe visibility documented

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
7. Optional cake stakes can be added, moved in the preview, and exported with the design
8. Export one combined SVG ready for LightBurn

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

## US-09 — Draggable Cake Stakes

As a laser business owner,
I want to add zero, one, or two cake stakes and drag them into position,
so that the exported topper includes practical support stakes without leaving the app.

**Acceptance Criteria:**
- The UI exposes three stake options: 0 stakes, 1 stake, 2 stakes
- Default stake geometry is 3mm wide and 50mm long
- Stake top is flat and overlaps into the design by default
- Stake lower end is rounded/pointed for easier insertion into cake
- Generated stakes appear in the SVG preview
- Dragging a stake overlay persists movement through backend stake offset metadata
- Exported SVG includes stake paths and the canvas expands to fit them

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

## FR-CT-09

The preview supports direct drag-to-move for generated cake stakes.

- Stake count is selected with 0 / 1 / 2 buttons.
- Default stake width is 3mm.
- Default stake length is 50mm.
- Default top overlap into the text design is 2mm.
- One stake is initially centred under the generated design.
- Two stakes are initially placed near the left and right thirds of the generated design.
- Stake manual X/Y offsets are stored independently per stake.
- Stake geometry is generated by the backend as filled SVG paths with a flat top and a rounded/pointed lower end.
- Stake paths are included in exported SVG/PNG output; preview drag handles are not.

---

# 4. UI / UX Specification

## 4.1 Layout

Current UI mode: Cake Topper-only. The older Text Generator and Overlap Engine workflows remain in the repository for possible future reactivation, but their tabs are not shown in the app shell.

```text
+------------------------------------------------------------------------+
| Brand header      Export status        Reset  Download SVG  Download PNG |
+------------------------------+-----------------------------------------+
| SVG Preview                  | v Create design                         |
| Final cut size chip          |   Text, font search/filter, base font   |
|                              |   Base size + Generate                  |
| Cutting note                 |   Letter overlap: Light Auto Medium Strong |
| Detected-line chips          |   Stakes: 0 / 1 / 2                     |
|                              | v Layout                                |
|                              |   Spacing between generated lines       |
|                              | v Lines                                 |
|                              |   Per-line font, position, overlap      |
+------------------------------+-----------------------------------------+
| SVG export size                                Download SVG  Download PNG |
+------------------------------------------------------------------------+
```

The top header keeps the dark branded status/action design. The bottom export
bar shows the SVG export size and uses the same dark action treatment for its
download controls.

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

Optional stakes are generated from final text bounds:
  count = request.stake_config.count
  dimensions = 3mm wide x 50mm long by default
  one stake = centered; two stakes = left/right thirds
  manual stake offsets are additive after auto placement

Canvas is fitted to all line and stake paths so manual drags cannot clip exported geometry.

SVG assembled from all translated line and stake paths
```

## 5.4 Path ID Prefixing

Each line's paths are prefixed to avoid ID conflicts in the combined SVG:
- Line 0: `L0-path-0001`, `L0-path-0002`
- Line 1: `L1-path-0001`, `L1-path-0002`
- Stake 0: `S0-stake`
- Stake 1: `S1-stake`

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
    stake_config: CakeTopperStakeConfig = CakeTopperStakeConfig()

class CakeTopperStakeConfig(BaseModel):
    count: Literal[0, 1, 2] = 0
    width_mm: float = 3.0
    length_mm: float = 50.0
    overlap_mm: float = 2.0
    offsets: list[CakeTopperStakeOffset] = []

class CakeTopperStakeOffset(BaseModel):
    stake_index: int
    x_offset_mm: float = 0.0
    y_offset_mm: float = 0.0

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
    stakes: list[CakeTopperStakeMetadata]
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

class CakeTopperStakeMetadata(BaseModel):
    stake_index: int
    width_mm: float
    length_mm: float
    x_offset_mm: float
    y_offset_mm: float
    manual_x_offset_mm: float
    manual_y_offset_mm: float
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
| 0/1/2 stake buttons update generated stake count | Automated + manual |
| Stake drag moves the selected stake and persists to backend offsets | Automated + manual |
| Stake output is 3mm wide, 50mm long by default, flat-topped, and rounded/pointed at the lower end | Automated + manual |
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
| Stake paths are not boolean-unioned with text paths | Medium | Visual overlap is correct; use LightBurn Optimise/Weld if a single welded outline is required. |
| No auto-alignment suggestion | Low | Could suggest alignment based on word length ratios in a future phase |
| Per-line pipeline runs sequentially | Low | Parallelise for speed in a future phase |

---

# 11. Future Enhancements (Phase 2)

The formal Phase 2 (Cake Topper Generator) will build on this foundation with:

- Automatic structural validation (minimum feature sizes for stakes)
- Material-aware stake width recommendations
- Advanced stake presets and material-aware stake placement
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
| Fill colour | Per-line `fill="#RRGGBB"` (default `#000000`/black; selectable from a fixed palette — see §19) |
| Background rectangle | Not present |
| Path ID prefixing | Line 0 paths: `L0-…`, Line 1 paths: `L1-…`, etc. (avoids ID conflicts) |
| Stake path ID prefixing | Stake paths: `S0-stake`, `S1-stake` |
| Outline path ID prefixing | Combined outline paths (when enabled): `OUTLINE-…` (inserted first, rendered behind all lines/stakes — see §19) |
| Canvas padding | 5mm padding on all sides (`CANVAS_PADDING_MM = 5.0`) |
| Minimum canvas width | `max(line ink widths) + 10mm` |
| Boolean union performed | Only for the optional combined outline (see §19) — line/stake paths are not unioned |
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

Errors are displayed in a `<div class="ct-error">` block in the right-side control stack after the Create design section. The message is extracted from the API response and shown verbatim for 400 errors, or as a formatted field-level summary for 422 errors.

### Currently unhandled (planned for Improvement Phase 2A)

- Backend server not running — currently shows "Could not generate cake topper." Should detect network failure and show "Backend is not running. Start the local server and retry."
- Missing glyph in selected font — currently silently produces a `?` path with no warning.
- Font size or gap value produces zero-width geometry — no guard currently.

---

# 17. Local Runtime and Startup

This is a local web application. No internet connection is required after initial dependency installation.

### Backend and Frontend (background — no terminal windows)

Both servers must always be started as hidden background processes. Run this block from the repo root:

```powershell
$root = "C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer"
New-Item -ItemType Directory -Force "$root\logs" | Out-Null

# Backend — module path is app.main:app (NOT main:app)
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\backend'; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 *> '$root\logs\backend.log'"

# Frontend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\frontend'; npm.cmd run dev *> '$root\logs\frontend.log'"
```

Verify startup (wait ~5 seconds):

```powershell
Get-Content logs\backend.log -Tail 5   # expect: Application startup complete.
Get-Content logs\frontend.log -Tail 5  # expect: VITE vX.x.x  ready in Xms
```

Stop both servers:

```powershell
Stop-Process -Name "python","node" -Force -ErrorAction SilentlyContinue
```

> **Critical:** The uvicorn module path is `app.main:app` — NOT `main:app`. `main.py` lives at `backend/app/main.py`. Using `main:app` causes "Error loading ASGI app".

The backend binds to `127.0.0.1` only (not `0.0.0.0`) — accessible from the local machine only.

### Vite cache

Vite stores optimized dependencies at `C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer`
(outside Dropbox). This avoids Windows/Dropbox file-locking (`EBUSY`) errors that previously
caused React chunks to return `504 (Outdated Optimize Dep)`.

If Vite still shows EBUSY or 504 errors, delete the cache folder and restart the frontend:

```powershell
Remove-Item -Recurse -Force "C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer" -ErrorAction SilentlyContinue
```

Then hard-refresh the browser with `Ctrl+Shift+R`.

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

SVG and PNG downloads use browser-based blob download initiated by the `ExportControls` component. Files are not written to disk by the backend; they are streamed via the API response and downloaded by the browser. The top header keeps the export status action area, while the bottom export bar shows the SVG export size and uses the same dark action treatment for its download controls.

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

# 19. Per-Line Colour and Combined Outline (Offset)

**Added:** 2026-06-07 11:27 +0100 · **Commit:** [`3ecb65d`](https://github.com/malekzeenni-ens/ens-designer/commit/3ecb65daf361018a508f60137f8c56c664db9389) — `feat: add per-line colour palette and combined outline/offset to cake topper`

These two controls were delivered together as a single change set (per-line fill colour assignment, plus an optional combined silhouette/outline shape) and are documented here as one feature.

## 19.1 Per-line colour

Each generated line (word) can be assigned a fill colour from a fixed palette, independent of every other line. This is intended primarily to support **LightBurn layer assignment by colour** — operators can map each colour to a different cut/engrave layer after import.

- **Palette:** Black (default), Red, Blue, Green, Yellow, Pink, Gold, Silver, Purple, Lilac — fixed hex values defined in `COLOR_PALETTE` (`frontend/src/components/CakeTopperPanel.tsx`).
- **Request field:** `CakeTopperLineConfig.color` — `str`, hex pattern `^#[0-9A-Fa-f]{6}$`, default `#000000`.
- **Response field:** `CakeTopperLineMetadata.color` echoes the resolved colour for that line.
- **Rendering:** Each line's paths are grouped with their colour and rendered with `fill="<hex>"` in the SVG (and the Pillow PNG fallback via `_hex_to_rgba`). No other export invariants change — `stroke="none"` and `fill-rule="nonzero"` still apply per path.
- **UI:** A "Colour" subsection with circular swatch buttons appears in each line's accordion card (Lines section). Selecting a swatch regenerates the design immediately.

## 19.2 Combined outline / offset

An optional global shape that unions **all text-line geometry** (stakes excluded) into a single silhouette and grows it outward by an operator-chosen distance — conceptually equivalent to the "Offset" feature in xTool Studio / LightBurn, producing a filled backing-plate / silhouette shape behind the design.

- **Scope:** Text lines only. Stakes are placed relative to the original (un-grown) line geometry and are unaffected by the outline; the outline does not affect stake position.
- **Geometry:** `shapely.ops.unary_union()` combines each closed line path (converted via `path_to_shapely`), then `Polygon.buffer(width_mm, join_style="round")` grows the union outward. The result is converted back to `GeometryPath` objects via `shapely_to_paths()` with ID prefix `OUTLINE-`.
- **Render order:** The outline path group is inserted at index 0 of the path-group list so it renders **behind** every line and stake (SVG/PNG z-order follows list order).
- **Request fields:**
  - `outline_enabled: bool` (default `false`)
  - `outline_width_mm: float` — growth distance in mm, `0 < width ≤ 50`, default `3.0`
  - `outline_color: str` — hex colour, default `#000000`
- **Response field:** `CakeTopperMetadata.outline` — `CakeTopperOutlineMetadata { width_mm, color }` or `null` when disabled or when no closed line geometry exists to union.
- **Canvas fitting:** `_fit_canvas_to_paths` runs after the outline is generated, so the canvas grows (and re-bases its origin if necessary) to fit the larger silhouette without clipping.
- **UI:** A "Combined outline / offset" subsection lives in the **Layout** accordion — an enable checkbox, a width (mm) input, and the same colour-swatch picker used for lines. Toggling, resizing, or recolouring regenerates the design immediately.

## 19.3 Files touched

| File | Change |
|---|---|
| `backend/app/models.py` | `HEX_COLOR_PATTERN`; `color` on `CakeTopperLineConfig`/`CakeTopperLineMetadata`; `outline_enabled`/`outline_width_mm`/`outline_color` on `CakeTopperRequest`; new `CakeTopperOutlineMetadata`; `outline` on `CakeTopperMetadata` |
| `backend/app/cake_topper_engine.py` | Per-group colour plumbing (`list[tuple[list[GeometryPath], str]]`); new `_generate_outline()`; outline insertion ordered after stake placement using a captured line-only path snapshot |
| `backend/app/png_exporter.py` | `render_paths_png` accepts colour groups; new `_hex_to_rgba()` helper |
| `frontend/src/types/design.ts` | `color` fields; `CakeTopperOutlineMetadata`; `outline` on result metadata |
| `frontend/src/services/generationApi.ts` | `CakeTopperOutlineRequest`; `generateCakeTopper` accepts an optional `outline` argument |
| `frontend/src/components/CakeTopperPanel.tsx` | `COLOR_PALETTE`; per-line colour swatch UI; outline toggle/width/colour controls and state |
| `frontend/src/styles.css` | `.ct-color-swatches`, `.ct-color-swatch`, `.ct-color-swatch--active`, `.ct-outline-toggle` |

## 19.4 Verification

- Backend test suite: 58 passed, no regressions (`pytest tests/test_cake_topper.py -q`)
- Frontend type-check: `npx tsc -b` — clean, zero errors
- Live API verification against the running backend confirmed per-line `fill=` colours, outline metadata, outline z-order (renders behind lines), and correct null/omission when the outline is disabled
- Manually verified in the browser by the operator — confirmed working as expected

---

# 20. Number Rendering Bug Fixes

**Fixed:** 2026-06-09 18:49 GMT+1

Two bugs were identified and fixed that caused incorrect or crashed rendering when digit characters (0–9) were entered in the cake topper, particularly with decorative or script fonts.

## 20.1 Bug 1 — Uncaught glyph draw exception (crash / HTTP 500)

**File:** `backend/app/outline_extractor.py`

**Root cause:** `glyph_set[shaped.glyph_name].draw(pen)` had no try/except guard. In specific decorative and OTF/CFF fonts, digit glyphs can be stored as composite glyphs that reference sub-components, or contain CFF charstring structures, that raise non-`ValueError` exceptions during FontTools outline extraction (`struct.error`, `KeyError`, `OverflowError`, etc.). Because the FastAPI route handler only catches `ValueError`, any other exception from `draw()` escaped as an HTTP 500 — the frontend received an "unexpected error" rather than a graceful message.

**Fix:** Wrapped `glyph_set[shaped.glyph_name].draw(pen)` in a `try/except Exception` block. On failure, a warning is logged and `pen.commands` is cleared. The glyph is treated as having no geometry (same behaviour as a `.notdef` glyph with empty outlines) — it contributes no path and no gap, and the remaining glyphs in the word continue rendering normally.

**Behaviour after fix:**
- Fonts that previously crashed on digits now silently skip the problematic glyph and continue.
- If ALL digits in a word fail to draw, `build_geometry` raises `ValueError("Selected font cannot render the requested text.")` which is returned as an HTTP 400 with a clear message.
- Logger emits `WARNING outline_extractor: Could not extract outline for glyph 'zero' (index 0) — skipping.` for each skipped glyph.

## 20.2 Bug 2 — Incorrect PNG preview for digits with counter-holes (visual defect)

**File:** `backend/app/png_exporter.py`

**Root cause:** `_flatten_path` accumulated all subpaths (M…Z segments) within a single `GeometryPath` into one flat point list. A single `GeometryPath` per glyph may contain multiple subpaths: the outer ring followed by counter-hole subpaths (e.g. `0` has outer ring + inner circle; `8` has outer figure-eight + two inner loops). When the Z command closed the outer ring and the next M started the hole, `_flatten_path` continued appending to the same point list, creating a "bridge" chord between the outer ring and the hole. Pillow's `draw.polygon` received a self-intersecting polygon and rendered the hole as solid fill — digits like `0`, `6`, `8`, `9` appeared as filled blobs with no visible counter-holes.

**Fix:** Replaced `_flatten_path` with:
- `_split_to_subpaths(path)` — splits the path at M…Z boundaries, returning one point list per subpath.
- `_draw_path(draw, path, fill)` — the new rendering entry point:
  1. If only one subpath → draw directly (unchanged behaviour for most letters).
  2. If multiple subpaths → sort by bounding-box area (largest = outer ring).
  3. For each smaller subpath, apply a **centroid point-in-polygon test** (`_point_in_polygon`):
     - Centroid inside the outer ring → counter-hole → draw `fill=(255,255,255,0)` (transparent) to erase the previously drawn outer ring in that area.
     - Centroid outside the outer ring → separate ink component (e.g. the dot on `i`, `j`) → draw filled with the path colour.
- Added `_centroid` and `_point_in_polygon` (ray-casting) helpers.

**Behaviour after fix:**
- Digits `0`, `6`, `8`, `9` and letters with counter-holes (`O`, `B`, `D`, `e`, etc.) render with correct transparent holes in the PNG preview.
- The dot on `i`, `j` and other floating components render correctly as separate filled shapes (not erased as holes).
- SVG export is unaffected — SVG uses `fill-rule="nonzero"` and was always correct.
- PNG is preview-only; the fix improves preview fidelity, not production output.

## 20.3 Files changed

| File | Change |
|---|---|
| `backend/app/outline_extractor.py` | Added `import logging` / `logger`; wrapped `draw(pen)` in `try/except Exception` with `pen.commands.clear()` on failure |
| `backend/app/png_exporter.py` | Replaced `_flatten_path` with `_split_to_subpaths`; added `_draw_path`, `_centroid`, `_point_in_polygon`; updated `render_paths_png` and `_export_png_with_pillow` to call `_draw_path` |

---

# 21. Font Character-Support Error Message (2026-06-09 19:20 GMT+1)

## 21.1 Problem

When a user chose a decorative script font (e.g. "One Day Swash") for a line containing digits or other characters the font does not support, the system raised a generic HTTP 400 error: `"Selected font cannot render the requested text."` — with no indication of which font was at fault or which characters were missing.

Root cause: decorative/calligraphic fonts commonly omit digit glyphs (0–9) entirely from their cmap. HarfBuzz maps all unmapped codepoints to `.notdef`. If every shaped glyph is `.notdef` and `.notdef` itself has no outline, `extract_outlines` returns an empty `paths` list. `build_geometry` then raises the generic `ValueError` before the per-character notdef analysis runs.

## 21.2 Fix

Added an early guard in `CakeTopperService._generate_line` immediately after `extract_outlines`, before `build_geometry` is called:

```python
if not paths:
    early_chars = _extract_chars(normalised, len(glyphs))
    notdef_chars = sorted({
        early_chars[i]
        for i, g in enumerate(glyphs)
        if g.glyph_name == ".notdef" and i < len(early_chars) and early_chars[i].strip()
    })
    font_display = font_info.full_name
    if notdef_chars:
        chars_display = ", ".join(repr(c) for c in notdef_chars)
        raise ValueError(
            f'Line {line_index + 1} ("{word}"): font "{font_display}" has no glyphs for '
            f'{chars_display}. This font does not support these characters — '
            f'choose a different font for this line.'
        )
    raise ValueError(
        f'Line {line_index + 1} ("{word}"): font "{font_display}" cannot render this text.'
    )
```

## 21.3 Example user-facing message

```
Line 2 ("2025"): font "One Day Swash" has no glyphs for '0', '2', '5'.
This font does not support these characters — choose a different font for this line.
```

The error is returned as HTTP 400 to the frontend (unchanged behaviour; only the message content improves).

## 21.4 Files changed

| File | Change |
|---|---|
| `backend/app/cake_topper_engine.py` | Added early `if not paths:` guard with notdef character identification and descriptive `ValueError` before `build_geometry` call in `_generate_line` |

---

# 22. Design Recipe Embedded in SVG Export (2026-06-09 19:20 GMT+1)

## 22.1 Feature

Every SVG exported by the Cake Topper engine now contains an XML comment immediately after the opening `<svg>` tag. This comment records the complete font recipe for the design: which font and size was used on each line, and what colour each line was assigned.

This allows the operator to reproduce or revert a design by looking at the file itself — no external record is needed.

## 22.2 Format

```xml
<svg xmlns="http://www.w3.org/2000/svg" ...>
<!--
EnS Designer — Cake Topper Recipe
Generated: 2026-06-09

  Line 1  "Happy"     —  Great Vibes · 42.0mm · #000000
  Line 2  "Birthday"  —  Anton · 60.0mm · #ff0000
  Line 3  "Sarah"     —  Dancing Script Bold · 42.0mm · #000000
-->
<path .../>
```

The comment is injected via string manipulation on `drawing.tostring()` output, targeting the first `>` after the `<svg` tag open — compatible with both SVG-only output (no XML declaration) and output that begins with `<?xml ...?>`.

## 22.3 Data flow

| Step | Location |
|---|---|
| `font_info.full_name` and `cfg.font_size_mm` captured | `_generate_line` → added to `meta` dict |
| `font_name` and `font_size_mm` stored per line | `CakeTopperLineMetadata.font_name` / `.font_size_mm` (new fields) |
| Line metadata passed to SVG assembler | `generate()` → `_assemble_svg(..., line_metadata)` |
| Comment injected into SVG string | `_assemble_svg` post-`tostring()` injection |

## 22.4 Model changes

### `backend/app/models.py` — `CakeTopperLineMetadata`
Two new optional fields with defaults (backwards-compatible):
```python
font_name: str = ""
font_size_mm: float = 42.0
```

### `frontend/src/types/design.ts` — `CakeTopperLineMetadata`
Two new fields added to the TypeScript interface:
```typescript
font_name: string;
font_size_mm: number;
```

## 22.5 Files changed

| File | Change |
|---|---|
| `backend/app/models.py` | Added `font_name: str = ""` and `font_size_mm: float = 42.0` to `CakeTopperLineMetadata` |
| `backend/app/cake_topper_engine.py` | `_generate_line` adds `font_name` / `font_size_mm` to meta dict; `generate()` passes them to `CakeTopperLineMetadata` and passes `line_metadata` to `_assemble_svg`; `_assemble_svg` updated to accept `line_metadata` and inject design recipe comment |
| `frontend/src/types/design.ts` | Added `font_name: string` and `font_size_mm: number` to `CakeTopperLineMetadata` interface |

---

# 23. Non-Destructive Font Error Handling (2026-06-09 19:35 GMT+1)

## 23.1 Problem

When a font-related API error occurred during an incremental design update (e.g. changing the font for a single line), the `callApi` catch block called `setResult(null)` unconditionally. This wiped the entire preview canvas and forced the user to click "Generate design" from scratch to recover — even though the rest of the design was unchanged.

## 23.2 Fix

Two targeted changes to `CakeTopperPanel.tsx`:

**1. Canvas-preserving error path (`preserveCanvas` flag)**

`callApi` receives a new optional boolean parameter `preserveCanvas` (default `true`). When `true`, a caught error updates the error banner but leaves `result` intact so the preview, line states, gaps, and all controls remain usable. Only `handleGenerate` passes `preserveCanvas = false`, meaning a fresh "Generate design" click on an initial error (no previous result) still clears to a clean slate.

```typescript
async function callApi(
  ...,
  preserveCanvas = true,   // NEW
) {
  ...
  } catch (e) {
    if (!preserveCanvas) setResult(null);   // only fresh-generate clears canvas
    setError(e instanceof Error ? e.message : "Could not generate cake topper.");
  }
}

function handleGenerate() {
  setLineStates([]);
  setInterLineGaps([]);
  callApi([], [], stakeCount, stakeOffsets, undefined, false);  // preserveCanvas = false
}
```

**2. Dismissable error banner**

The error `<div>` is now laid out with flexbox and includes a `×` dismiss button. Clicking it calls `setError(null)` so the user can clear the message once they have read it. The error also auto-clears on the next successful API call (existing behaviour via `setError(null)` at the start of `callApi`).

## 23.3 User experience

| Scenario | Before | After |
|---|---|---|
| Change font on Line 2 to one that cannot render the text | Canvas wiped — user must regenerate from scratch | Canvas preserved; error banner appears with "×" dismiss; user changes font and the next call clears the error automatically |
| Click "Generate design" with an unsupported font | Canvas wiped — correct behaviour | Canvas wiped — unchanged |
| Dismiss error manually | Not possible | Click "×" to hide banner |

## 23.4 Files changed

| File | Change |
|---|---|
| `frontend/src/components/CakeTopperPanel.tsx` | Added `preserveCanvas = true` param to `callApi`; `handleGenerate` passes `false`; error banner gets dismiss `×` button |
| `frontend/src/styles.css` | `.ct-error` changed to `display: flex`; added `.ct-error-dismiss` button styles |

---

# 24. Incremental Update Loading Indicator (2026-06-09 19:45 GMT+1)

## 24.1 Problem

After fixing canvas preservation on font errors (§23), incremental updates (font changes, size changes, gap adjustments) no longer blanked the canvas while the API call ran. Although the actual API round-trip time was unchanged, the user perceived the app as slower because there was no immediate visual feedback when a change was made — the old design simply stayed on screen with no indication that a new render was in progress.

## 24.2 Fix

Two visual indicators added for the duration of any background API call when a canvas already exists (`loading && result`):

**1. Preview card dims**
The `.ct-preview-card` gains the `ct-preview-card--updating` class, reducing opacity to 55% and disabling pointer events. This immediately signals that the canvas is stale.

**2. Pulsing "Updating…" chip**
A gold pill chip with a 1 s pulse animation appears in the preview heading (`aria-live="polite"`). It disappears as soon as the new result arrives or an error is shown.

Neither indicator applies during a fresh "Generate design" invocation (where `result` is null and the canvas is already blank).

## 24.3 Files changed

| File | Change |
|---|---|
| `frontend/src/components/CakeTopperPanel.tsx` | Added `ct-preview-card--updating` class and `ct-updating-chip` span conditionally rendered when `loading && result` |
| `frontend/src/styles.css` | Added `.ct-preview-card--updating` (opacity + pointer-events), `.ct-updating-chip` (pill style + pulse animation), `@keyframes ct-pulse` |

---

# 25. Glyph Browser Drawer (2026-06-09 21:15 GMT+1)

## 25.1 Feature

A Glyph Browser drawer that exposes every character in the selected font — including Private Use Area (PUA) ligatures, alternates, and ornaments that are only visible in Windows Character Map — directly within the Cake Topper designer. Each line card gains a **Browse** button next to the font selector. Clicking it opens a right-side drawer panel without interrupting the rest of the design.

## 25.2 How it works

### Opening
Clicking **Browse** on a line card opens the drawer for that specific line. The drawer shows the currently selected font for that line and pre-fills the compose area with the line's current text.

### Font preview rendering
The drawer fetches the font binary from a new backend endpoint (`GET /api/fonts/{font_id}/file`) and loads it into the browser using the Web Font Loading API (`new FontFace(...)`). Once loaded, every glyph cell and the compose input render in the actual font — including PUA characters that would otherwise appear as empty boxes.

### Character list
`GET /api/fonts/{font_id}/characters` returns every codepoint in the font's `cmap` (sorted, control chars excluded) with:
- `char` — the Unicode character string
- `glyph_name` — internal font glyph name (e.g. `"aa"`, `"heart.orn"`)
- `category` — auto-detected: `uppercase`, `lowercase`, `digits`, `punctuation`, `ligature`, `alternate`, `ornament`, `special`, `other_letter`, `other`
- `label` — display label (glyph name base for PUA; char itself for standard Unicode)

PUA categorisation uses the glyph name: letter-pair names (`aa`, `ar`, `ct`, etc.) → `ligature`; names containing `orn`, `heart`, etc. → `ornament`; `swsh`, `alt`, `ss0`–`ss3` → `alternate`; others → `special`.

### Filtering
Category tabs show only the categories present in the font, with character counts. A search box filters by label or glyph name.

### Composing text
Clicking a glyph appends the character to the **Line text** input at the top of the drawer. The input is also directly editable. A **Reset** button reverts to the original line text. **Apply to Line N** replaces that word in the full design text and immediately re-renders — the canvas stays intact throughout (uses `preserveCanvas = true`).

## 25.3 Architecture

### Backend — new endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/fonts/{font_id}/file` | Serve raw font binary (TTF/OTF) for browser-side font loading |
| `GET /api/fonts/{font_id}/characters` | Return categorised character list from font cmap |

### Frontend — new/changed files

| File | Change |
|---|---|
| `frontend/src/components/GlyphBrowserDrawer.tsx` | New component — drawer, compose area, category tabs, glyph grid, font preview loading |
| `frontend/src/components/CakeTopperPanel.tsx` | Added `glyphBrowserLineIndex` state; Browse button in each line card; `applyGlyphBrowserText` function; `textOverride` parameter in `callApi` so text update fires immediately without waiting for React state flush |
| `frontend/src/types/design.ts` | Added `CharacterInfo` and `FontCharacterMap` interfaces |
| `frontend/src/services/generationApi.ts` | Added `fetchFontCharacters(fontId)` API function |
| `frontend/src/styles.css` | Added full drawer stylesheet (~180 lines): overlay, backdrop, panel, compose bar, category tabs, glyph grid, footer, Browse button |
| `backend/app/api/routes/fonts.py` | Added `get_font_file`, `get_font_characters`, `_categorise_codepoint`, `_glyph_label` |

---

# 26. Glyph Browser Modal + SVG Recipe Visibility (2026-06-09 23:55 GMT+1)

## 26.1 Problem 1 — Glyph Browser appeared off-screen

The Glyph Browser drawer (§25) used `position: fixed; inset: 0` with `justify-content: flex-end` and `height: 100vh`, which should have rendered as a full-height right-side panel. In practice the panel content appeared below the visible viewport, requiring the user to scroll down to reach the character grid — the backdrop dimmed the page correctly, but the panel itself was not usable as a popup.

## 26.2 Fix 1 — Centred modal dialog

`.ct-glyph-overlay` and `.ct-glyph-drawer` were converted from a full-height side drawer to a centred modal dialog:

- `.ct-glyph-overlay`: `align-items: center; justify-content: center; padding: 24px` (was `justify-content: flex-end` only)
- `.ct-glyph-drawer`: `width: 680px; max-height: 88vh; border-radius: 14px; overflow: hidden` (was `width: 480px; height: 100vh`, square corners)
- Entrance animation changed from a horizontal slide-in (`translateX`) to a scale/fade-in (`scale(0.96) → scale(1)`)
- The internal `.ct-glyph-grid-wrap` (`flex: 1; overflow-y: auto`) already scrolls independently, so the modal body scrolls within `max-height: 88vh` without affecting the page.

## 26.3 Fix 2 — Larger "Line text" compose input

`.ct-glyph-compose-input` font size increased from `1.15rem` to `1.7rem` with more generous padding (`12px 14px`) and `line-height: 1.3`, making the live preview of composed glyphs (especially script/ligature fonts) easier to read at a glance.

## 26.4 SVG recipe metadata — confirmed working, visibility clarified

The design-recipe XML comment added in §22 is correctly embedded in every exported SVG (verified directly against the `/api/cake-topper` response — the `<!-- EnS Designer — Cake Topper Recipe ... -->` block appears immediately after the opening `<svg ...>` tag, listing each line's text, font name, size, and colour).

This comment is **invisible when the SVG is opened in a browser or LightBurn** — XML comments are never rendered visually, by design, and do not affect the cut geometry. To view the recipe, open the downloaded `.svg` file in a text editor (Notepad, VS Code, etc.) or use "View Source" — the recipe block is the first thing in the file after the opening tag. No code change was needed; this section documents the expected access method.

## 26.5 Files changed

| File | Change |
|---|---|
| `frontend/src/styles.css` | `.ct-glyph-overlay` centred via flexbox; `.ct-glyph-drawer` converted to a centred modal (`680px`, `max-height: 88vh`, rounded corners); `@keyframes ct-drawer-in` changed to scale/fade; `.ct-glyph-compose-input` font size increased to `1.7rem` with larger padding |

---

# 27. Glyph Browser Portal + On-Screen Design Recipe (2026-06-10 00:20 GMT+1)

## 27.1 Problem

After §26, the modal CSS was correct but the drawer could still render in the wrong place depending on where it sits in the component tree relative to the rest of the page (any future ancestor with `transform`/`filter`/`contain` would silently break `position: fixed`). Separately, the SVG recipe comment from §22 — while present in the export — was invisible inside the app itself; users had no way to confirm what font/size/colour was used per line without opening the downloaded file in a text editor.

## 27.2 Fix 1 — Render the Glyph Browser via a React portal

`GlyphBrowserDrawer` now renders through `createPortal(..., document.body)` instead of inline in `CakeTopperPanel`'s tree. This guarantees the modal's `position: fixed` overlay is always positioned relative to the viewport, completely independent of any styling on its logical parent components.

## 27.3 Fix 2 — On-screen "Design recipe" table

A new **Design recipe** card is rendered directly below the export bar whenever a result exists. It lists, per line: line number, text, font name, font size (mm), and colour (with a swatch). This is the same information embedded as a comment in the exported SVG (§22), now visible at a glance in the app without opening any file.

## 27.4 Files changed

| File | Change |
|---|---|
| `frontend/src/components/GlyphBrowserDrawer.tsx` | Wrapped returned JSX in `createPortal(..., document.body)`; added `react-dom` import |
| `frontend/src/components/CakeTopperPanel.tsx` | Added "Design recipe" table below the export bar, rendered from `result.metadata.lines` |
| `frontend/src/styles.css` | Added `.ct-recipe`, `.ct-recipe-title`, `.ct-recipe-hint`, `.ct-recipe-table`, `.ct-recipe-swatch` |

---

# End of Document
