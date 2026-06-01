# phase-x-completion-report.md

## Document Information

Phase: X
Name: Overlap Engine
Date: 2026-06-01
Release Tag: v0.4.0
Status: Complete

---

# 1. Executive Summary

Phase X Overlap Engine is complete, delivering significantly more capability than originally planned.

The engine automates the manual XCS tracking-reduction workflow used daily by Etch 'N' Shine for name signs in block fonts and script fonts. Two major extensions were added during delivery based on user feedback:

1. **Per-gap individual controls** — each inter-glyph gap has its own toggle and mm input, allowing selective letter-pair control rather than a single global strength.
2. **Floating component X/Y controls** — dots on 'i', 'j', diacritical marks, and accent dots can be independently repositioned in both X and Y directions.

Additionally, Phase X formed the foundation for the **Cake Topper tab**, a multi-line text composition tool built on top of the overlap algorithm with per-line font, size, alignment, vertical gap controls, floating component controls, and manual line repositioning.

Recommendation: **GO** for Phase 2 (Cake Topper Generator formal phase) planning.

---

# 2. What Was Delivered

## 2.1 Overlap Engine Tab

A second top-level tab "Overlap Engine" alongside "Text Generator".

**Global controls (full width):**
- Text input
- Font selector with search (auto-selects first match when current font filtered out)
- Overlap mode buttons: Light (0.5mm) / Auto (1.0mm) / Medium (1.5mm) / Strong (2.5mm) / Custom

**Two-column layout after generation:**
- Left column: SVG preview (sticky — stays visible while scrolling)
- Right column: settings (scrollable)

**Per-gap controls (right column):**
```
Gap controls
  ✓  O → l    [ 1.5 ] mm    →  −1.50 mm
  ✓  l → i    [ 0.5 ] mm    →  −0.50 mm
  ○  i → v    disabled       →  +1.89 mm
  ✓  v → e    [ 2.5 ] mm    →  −2.50 mm
  ✓  e → r    [ 1.5 ] mm    →  −1.50 mm
```

Each gap: toggle on/off + individual mm input + result gap shown.
Letter labels from HarfBuzz glyph character data (e.g., O→l, l→i).
Any change re-generates immediately.

**Floating component controls (right column, when detected):**
```
Floating dots / accents
  'i' dot    ↔ X  [ 0.0 ] mm    ↕ Y  [ 3.0 ] mm    ↓ down
```

Appears only when the backend detects floating components in the current word.
Detection uses subpath vertical bounding-box non-overlap (dots sit above the stroke).
Detection runs on pre-offset paths so controls never disappear mid-adjustment.

## 2.2 Cake Topper Tab

A third top-level tab built on the Overlap Engine foundation. See the dedicated Cake Topper Feature Specification for full detail.

Summary of Cake Topper capabilities:
- Auto-splits input text by space into up to 4 lines
- Per-line: font, size (mm), alignment (L/C/R/Manual offset)
- Per-line: manual canvas X/Y position offsets
- Per-line: full Phase X letter gap controls
- Per-line: floating component dot X/Y controls
- Vertical gap control between each pair of consecutive lines
- Preview drag overlay for moving generated lines directly on the SVG preview
- Accordion card UI — collapsed summary header, expand to edit
- Two-column layout: preview left, accordion cards right
- Single combined SVG + PNG output

## 2.3 SVG Export

Both Overlap Engine and Cake Topper export SVG with `fill-rule="nonzero"` so overlapping paths render as solid shapes (not cancelled by evenodd).

Counter holes (inside O, e, a, etc.) are preserved because standard fonts use opposite winding for inner contours, which the nonzero rule handles correctly.

## 2.4 API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/overlap | Overlap Engine single-word generation |
| POST | /api/cake-topper | Cake Topper multi-line generation |

---

# 3. Algorithm

## Overlap Algorithm (per pair)

```text
For each adjacent glyph pair i:

  config = gap_configs[pair_index = i]  (if any)

  if config.enabled = False:
    pair_shift = 0

  else:
    target = config.overlap_mm  (if config)
         OR  default_overlap    (from global mode)

  if current_gap <= -target:
    pair_shift = 0   (already has sufficient overlap)
  else:
    pair_shift = current_gap + target
                 (close gap AND create target mm of overlap)

Cumulative glyph shifts:
  glyph[0]:  0
  glyph[N]:  sum(pair_shifts[0..N-1])
```

Naturally overlapping pairs (script fonts) receive no additional compression.

## Floating Component Detection

```text
For each glyph's GeometryPath:
  Split commands on M after Z (multiple closed subpaths)
  Find largest subpath (main body)
  For each other subpath:
    If its vertical bounding box does not overlap with main body:
      → classified as floating component (dot / accent)
      → exposed as controllable element

Detection runs on pre-offset paths so the control never self-hides.
```

## Floating Offset Application

```text
After detection:
  For each FloatingComponentOffset in request:
    Find the glyph's path
    Find the floating subpath index within that path
    Apply dx, dy to ONLY the floating subpath commands
    Leave the main stroke untouched
```

---

# 4. Acceptance Criteria Results

| Criterion | Result |
|---|---|
| Oliver / Anton: letters overlap, word readable | Passed |
| Script font: O→l gap closes, l-i-v-e-r unchanged | Passed |
| Per-gap toggle enables/disables individual pairs | Passed |
| Per-gap mm input controls individual overlap amounts | Passed |
| Floating dot X offset moves dot left/right | Passed |
| Floating dot Y offset moves dot up/down | Passed |
| Dot controls remain visible when dot moves toward stroke | Passed (detection order fix) |
| Alignment controls fully visible (L/C/R/M) | Passed (width cap fix) |
| Counter holes preserved (O, e, a) | Passed — fill-rule=nonzero |
| SVG uses mm units | Passed |
| No connectivity_score or structural_score in response | Passed |
| All existing tests pass | Passed |
| Font search auto-selects first visible result | Passed |
| Error messages are human-readable | Passed |

---

# 5. Test Results

```
119 passed, 2 skipped, 0 failed
```

22 Overlap Engine tests in `tests/test_phase_x_overlap_engine.py`.

---

# 6. Files Created

```
backend/app/overlap_engine.py
backend/app/cake_topper_engine.py
backend/app/floating_component.py
backend/app/api/routes/overlap.py
backend/app/api/routes/cake_topper.py
frontend/src/components/OverlapPanel.tsx
frontend/src/components/CakeTopperPanel.tsx
frontend/src/components/FloatingControls.tsx
tests/test_phase_x_overlap_engine.py
docs/handoffs/phase-x-completion-report.md
docs/handoffs/phase-x-implementation-handoff.md
docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md
```

---

# 7. Files Modified

```
backend/app/models.py          OverlapGapConfig, FloatingComponentOffset, FloatingComponentInfo,
                               OverlapRequest, OverlapMetadata, CakeTopperLineConfig,
                               CakeTopperLineMetadata, CakeTopperMetadata, CakeTopperResponse
backend/app/main.py            overlap_router, cake_topper_router, OverlapService, CakeTopperService
backend/app/outline_extractor.py  font_size_mm parameter added (default 42mm)
backend/app/svg_exporter.py    fill_rule parameter added (default "evenodd")
frontend/src/App.tsx           Three-tab navigation; Overlap Engine and Cake Topper tabs
frontend/src/types/design.ts   All Overlap and Cake Topper types
frontend/src/services/generationApi.ts  generateOverlap, generateCakeTopper, _readError helper
frontend/src/styles.css        Two-column layout, overlap mode, gap controls, floating controls,
                               cake topper accordion, alignment buttons, vertical gap rows,
                               preview drag overlay, canvas position controls
```

---

# 8. Bugs Fixed During Delivery

| Bug | Root Cause | Fix |
|---|---|---|
| `[object Object]` error message | FastAPI 422 detail is an array, not string | `_readError()` helper handles array detail |
| Font search doesn't auto-select | Missing `useEffect` in OverlapPanel/CakeTopperPanel | Added same effect as App.tsx |
| Cake Topper line titles all show last word | Python loop variable `word` leaked from first loop | Changed `text=word` to `text=words[i]` |
| Alignment buttons cut off — Manual not visible | `ct-card-field--sm` limited to 110px for 4 buttons | Removed width cap, added min-width 148px |
| Floating dot controls disappear mid-adjustment | Detection ran after offset was applied | Detection now runs before offsets are applied |
| Cake Topper crashes on Generate | `floating_components` accessed before API response | Optional chaining `?.` added throughout |
| Cake Topper line drag did not move lines | Selection state re-rendered during drag setup and stale overlay sizing/listeners made the active handle unreliable | Native document pointer listeners, deferred selection until pointer up, stable SVG host sizing, and handle re-query by `data-line-index` |
| Vite blank screen after restart | Stale optimized dependency cache produced `504 (Outdated Optimize Dep)` | Restart frontend with `npm run dev -- --force`, then hard refresh browser |

---

# 9. Known Limitations

| Limitation | Notes |
|---|---|
| LightBurn fill-rule=nonzero not formally validated | Assumed working — manual LightBurn test recommended |
| Counter rendering depends on font winding conventions | Standard fonts correct; non-standard fonts may vary |
| Floating component detection is bounding-box based | May miss floating components in some edge-case fonts |
| Cake Topper SVG is a flat path assembly | No boolean union — overlapping paths at line boundaries are visible in LightBurn path view |
| Cake Topper preview drag is a frontend composition aid | Backend `manual_x_offset_mm` / `manual_y_offset_mm` remain the source of truth for exported SVG position |

---

# 10. Recommendation

**GO** — Phase X is complete. All 119 tests pass. The Overlap Engine and Cake Topper tab are functional and validated.

Next priority: complete the formal Cake Topper phase (Phase 2) documentation and implement any structural improvements needed for production use.
