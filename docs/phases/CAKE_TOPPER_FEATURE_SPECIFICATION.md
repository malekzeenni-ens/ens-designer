# CAKE_TOPPER_FEATURE_SPECIFICATION.md

## Document Information

Feature: Cake Topper Tab
Phase: X (delivered), Phase 2 (formal phase)
Version: 1.0
Date: 2026-06-01
Owner: Etch 'N' Shine
Status: Implemented — awaiting formal Phase 2 documentation

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

The Cake Topper tab automates this workflow:

1. Type the full phrase once ("Happy Birthday Sarah")
2. System auto-splits by space into separate lines
3. Each line gets independent font, size, overlap, and alignment controls
4. Vertical gaps between lines are adjustable with immediate preview
5. Floating component dots (e.g. on the letter 'i') can be repositioned
6. Export one combined SVG ready for LightBurn

---

# 2. User Stories

## US-01 — Basic Cake Topper

As a laser business owner,
I want to type "Happy Birthday" and generate a two-line design,
so that I get a laser-ready SVG without any manual vector editing.

**Acceptance Criteria:**
- "Happy" appears on Line 1
- "Birthday" appears on Line 2
- Both lines use the selected font
- Output is a single centred SVG with both lines composed

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

# 3. Functional Requirements

## FR-CT-01

System accepts a text input of up to 4 space-separated words.
Each word becomes one line in the composition.
Maximum 4 lines.

---

## FR-CT-02

Each line is independently configurable with:
- Font (selected from the same font catalogue as all other tabs)
- Size in mm (the em-height of the text, default 42mm)
- Alignment: Left / Center / Right / Manual (X offset in mm)
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

Lines are composited in order from top to bottom.
SVG uses `fill-rule="nonzero"` for correct rendering of overlapping paths.

---

## FR-CT-06

System exports:
- SVG (production — LightBurn compatible)
- PNG (preview — CairoSVG primary, Pillow fallback)

---

## FR-CT-07

The system does NOT perform:
- Connectivity analysis
- Bridge generation
- Material validation
- Structural scoring

---

# 4. UI / UX Specification

## 4.1 Layout

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
  y_translate = y_cursor - geom.bounds.min_y
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
| SVG imports correctly into LightBurn | Manual (LightBurn validation) |
| Dimensions correct in LightBurn | Manual |
| No connectivity_score or material data in response | Automated |

---

# 10. Known Limitations

| Limitation | Severity | Recommendation |
|---|---|---|
| Maximum 4 lines (hardcoded) | Low | Configurable MAX_LINES in Phase 2 |
| Floating detection is bounding-box vertical only | Low | Shapely-based detection for Phase 2 |
| Canvas uses flat path assembly (no boolean union) | Low | Per-line overlap is visible in LightBurn path-edit mode; LightBurn Optimise handles it |
| PNG Pillow fallback has lower fidelity than CairoSVG | Medium | Install Cairo for Windows in Phase 1C/2 |
| No auto-alignment suggestion | Low | Could suggest alignment based on word length ratios in Phase 2 |
| Per-line pipeline runs sequentially | Low | Parallelise for speed in Phase 2 |

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

---

# End of Document
