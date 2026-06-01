# CAKE_TOPPER_QA_MATRIX.md

## Document Information

Feature: Cake Topper Tab
Phase: Phase X plus Cake Topper improvements
Version: 1.1
Date: 2026-06-01
Status: Active

---

# Purpose

This matrix defines the test scenarios, expected outcomes, priority levels, and automation status for the Cake Topper tab.

Use this matrix during:
- Regression testing after any change to `cake_topper_engine.py`, `CakeTopperPanel.tsx`, `floating_component.py`, or `models.py`.
- Regression testing after any change to `PreviewPanel.tsx` preview overlays or drag handling.
- Manual LightBurn validation before production use.
- QA sign-off before any phase is marked complete.

---

# QA Matrix

## 1. Functional Generation

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| F-01 | Basic split | Generate "Happy Birthday" | Two lines: Line 1 = "Happy", Line 2 = "Birthday" | P0 | Automated |
| F-02 | Line title correctness | Generate "Happy Birthday" | Line 1 header shows "Happy", NOT "Birthday" (regression: last-word bug) | P0 | Automated |
| F-03 | Three-line split | Generate "Happy Birthday Sarah" | Three lines, each word on its own line | P0 | Automated |
| F-04 | Four-line cap | Generate "Happy Birthday Dear Sarah" | Four lines — all four words | P0 | Automated |
| F-05 | Five-word truncation | Generate "One Two Three Four Five" | Four lines — "Five" is silently dropped | P0 | Automated |
| F-06 | Single word | Generate "Sarah" | One line, no gap row shown | P1 | Automated |
| F-07 | Per-line font isolation | Change Line 1 font, regenerate | Line 2 paths unchanged; only Line 1 paths differ | P0 | Automated |
| F-08 | Per-line size isolation | Set Line 2 size to 60mm | Line 2 larger than Line 1; metadata `height_mm` matches | P0 | Automated + Manual |
| F-09 | Negative vertical gap | Set inter-line gap to −5mm | Line 2 positioned closer to Line 1; metadata `inter_line_gaps_mm = [-5.0]` | P0 | Automated |
| F-10 | Positive vertical gap | Set inter-line gap to +8mm | Line 2 positioned further from Line 1 | P1 | Manual |
| F-11 | Default gap | Generate without specifying gaps | `inter_line_gaps_mm = [3.0]` per gap | P1 | Automated |
| F-12 | Alignment — center | Generate with center alignment | `x_offset_mm` positions line centrally | P0 | Automated |
| F-13 | Alignment — left | Set alignment to left | `x_offset_mm == CANVAS_PADDING_MM (5.0)` | P1 | Automated |
| F-14 | Alignment — right | Set alignment to right | `x_offset_mm == canvas_width - padding - ink_width` | P1 | Automated |
| F-15 | Alignment — manual | Set manual offset to 12.5mm | `x_offset_mm == 5.0 + 12.5 = 17.5` | P1 | Automated |
| F-16 | Manual canvas X offset | Set line canvas X offset to 10mm | Line metadata and SVG position shift by 10mm | P0 | Automated |
| F-17 | Manual canvas Y offset | Set line canvas Y offset to 8mm | Line metadata and SVG position shift by 8mm | P0 | Automated |
| F-18 | Offset reset | Move a line, then reset | Manual X/Y offsets return to 0 and SVG regenerates at aligned/stacked position | P0 | Automated + Manual |

---

## 2. Font and Glyph Handling

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| G-01 | Script font | Generate with a connected script font | Smooth outlines, counters visible, no missing glyphs | P0 | Manual |
| G-02 | Block/bold font | Generate "Sarah" with Anton or similar bold font | Letters at overlap setting; no crash | P0 | Automated |
| G-03 | Missing font ID | Send `font_id = "not-a-real-font"` | HTTP 400 response; clear error in UI | P0 | Automated |
| G-04 | Unsupported character | Use a character the font doesn't support | No crash; `?` placeholder or empty glyph; no user warning currently (known limitation) | P1 | Manual |
| G-05 | Special character | Use apostrophe: "O'Connor" | Generates without crash | P1 | Automated |
| G-06 | Numbers | Include digits: "Sarah 2025" | Numbers render correctly | P1 | Manual |

---

## 3. Letter Overlap Controls

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| O-01 | Default overlap mode | Generate with default "medium" | All gaps have 1.5mm overlap applied; `gaps_after_mm` values are negative | P0 | Automated |
| O-02 | Light mode | Switch to Light (0.5mm) | Gaps narrower than medium | P0 | Automated |
| O-03 | Strong mode | Switch to Strong (2.5mm) | Gaps wider than medium | P0 | Automated |
| O-04 | Per-gap toggle off | Disable one gap | That gap shows `gaps_after_mm` equal to original pre-overlap value | P0 | Automated |
| O-05 | Per-gap custom mm | Set one gap to 3.0mm | That gap shows `gaps_after_mm` = original - 3.0 | P0 | Automated |
| O-06 | Natural script gap | Script font with natural negative gaps | Pairs that already have sufficient overlap receive no additional shift | P1 | Automated |
| O-07 | All gaps disabled | Disable every gap | Letters at natural font spacing; no shifts | P1 | Automated |

---

## 4. Counters and Closed Paths

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| C-01 | Counter letters | Generate phrase containing a, e, o | Inner holes remain visible in SVG preview | P0 | Manual + SVG inspection |
| C-02 | Counter letters | Generate phrase containing b, d, p | Inner holes remain visible | P0 | Manual + SVG inspection |
| C-03 | Counter numbers | Generate phrase containing 0, 6, 8, 9 | Inner holes remain visible | P0 | Manual + SVG inspection |
| C-04 | fill-rule in SVG | Inspect raw SVG output | `fill-rule="nonzero"` present on every `<path>` element | P0 | Automated |
| C-05 | Overlapping counter regions | Two overlapping letters with counters | Both counters remain visible in preview | P1 | Manual |

---

## 5. Floating Components (Dots and Accents)

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| FL-01 | Dot detection | Generate word with letter 'i' in a font with detectable dot | `floating_components` list contains `{glyph_index, char: "i"}` | P0 | Automated |
| FL-02 | Dot controls visible | Dot detected | X and Y offset controls appear in the line accordion | P0 | Manual |
| FL-03 | Y offset — move toward stroke | Set Y offset to 3.0mm | Dot moves toward the main stroke body | P0 | Manual |
| FL-04 | Controls persist after move | Move dot close to stroke | Controls remain visible — detection does not hide them (regression: pre-offset detection) | P0 | Automated + Manual |
| FL-05 | X offset | Set X offset to −1.0mm | Dot moves left | P1 | Manual |
| FL-06 | No floating components | Generate word without 'i' or accent | `floating_components` list is empty; no controls shown | P1 | Automated |
| FL-07 | Offset reset | Generate new design after changing offsets | Previous offsets do not persist into new generation | P1 | Manual |

---

## 6. SVG Export Invariants

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| E-01 | No text elements | Download SVG | No `<text>` or `<tspan>` elements anywhere in the file | P0 | Automated |
| E-02 | MM units | Download SVG | `width="…mm"` and `height="…mm"` present | P0 | Automated |
| E-03 | viewBox | Download SVG | `viewBox="0 0 <width> <height>"` present | P0 | Automated |
| E-04 | fill-rule | Download SVG | `fill-rule="nonzero"` on all path elements | P0 | Automated |
| E-05 | No background rect | Download SVG | No `<rect>` element with full canvas dimensions | P1 | Automated |
| E-06 | Dimensions match metadata | Download SVG and compare to API response | SVG width/height match `canvas_width_mm` and `canvas_height_mm` from metadata | P0 | Automated |
| E-07 | Path ID prefixing | Inspect SVG paths | Line 0 paths have `L0-` prefix; Line 1 paths have `L1-` prefix | P1 | Automated |
| E-08 | No font references | Download SVG | No `font-family`, `font-name`, or `@font-face` in the SVG | P0 | Automated |

---

## 7. PNG Export

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| P-01 | PNG header | Download PNG / inspect `png_base64` | Decoded bytes start with `\x89PNG` | P0 | Automated |
| P-02 | CairoSVG present | CairoSVG + libcairo-2.dll available | PNG is a real rasterisation of the SVG | P0 | Manual (when Cairo installed) |
| P-03 | CairoSVG absent | libcairo-2.dll not installed (current Windows machine) | PNG is returned (blank transparent) — no crash, SVG export unaffected | P0 | Automated (confirms no crash) |
| P-04 | PNG is preview only | Operator instruction | Do not use PNG as the production cutting file | P0 | Documentation |

---

## 8. API Behaviour

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| A-01 | Success response | Valid request | HTTP 200 with `svg`, `png_base64`, `metadata` fields | P0 | Automated |
| A-02 | Empty text | `text = ""` | HTTP 422 (Pydantic min_length=1 fails) | P0 | Automated |
| A-03 | Whitespace-only text | `text = "   "` (3 spaces) | HTTP 422 (Pydantic min_length passes, ValueError from engine → HTTP 400) | P0 | Automated |
| A-04 | Missing font ID | `default_font_id = "not-real"` | HTTP 400 | P0 | Automated |
| A-05 | No welding fields | Inspect response | `welding`, `connectivity_score`, `structural_score` are absent | P0 | Automated |
| A-06 | Line count in response | Generate "Happy Birthday" | `metadata.words` has 2 items; `metadata.lines` has 2 items | P0 | Automated |

---

## 9. Local Runtime

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| R-01 | Backend start | Start backend with uvicorn | `/api/cake-topper` returns 200 for a valid request | P0 | Manual |
| R-02 | Backend unavailable | Stop backend, use UI | Error displayed in UI ("Could not generate cake topper.") | P0 | Manual |
| R-03 | Frontend start | Start Vite dev server | UI loads at http://localhost:5173 | P0 | Manual |
| R-04 | Offline operation | Disconnect from internet | App functions normally — no external network calls | P1 | Manual |
| R-05 | Font directory empty | Remove all fonts | Backend starts but requests return 400 for all font IDs | P1 | Manual |
| R-06 | Vite stale optimize cache | Browser shows `504 (Outdated Optimize Dep)` for optimized deps | Restart frontend with `npm run dev -- --force`, then hard refresh; app loads | P0 | Manual |

---

## 10. Preview Drag and Manual Positioning

| ID | Test Area | Scenario | Expected Result | Priority | Method |
|----|-----------|----------|-----------------|----------|--------|
| D-01 | Overlay render | Generate "Happy Birthday" | One dashed overlay handle exists per generated line and covers that line's ink bounds | P0 | Manual |
| D-02 | Select line | Click or drag a line overlay | The selected line overlay becomes visibly selected | P0 | Manual |
| D-03 | Drag visual feedback | Drag Line 1 overlay before release | Overlay follows pointer with temporary movement | P0 | Manual |
| D-04 | Drag persistence | Release after dragging Line 1 | Canvas position X/Y inputs update and regenerated SVG moves Line 1 | P0 | Manual |
| D-05 | Drag accumulation | Drag the same line twice | Second drag adds to the existing manual X/Y offsets | P0 | Manual |
| D-06 | Drag no-op threshold | Press and release without meaningful movement | No unwanted offset change or regeneration loop | P1 | Manual |
| D-07 | Export after drag | Drag a line, download SVG | Exported SVG contains the moved line position; overlay elements are not included | P0 | Manual + SVG inspection |
| D-08 | Stake count controls | Toggle 0 / 1 / 2 stakes | Preview and metadata show matching stake count | P0 | Automated + manual |
| D-09 | Stake drag persistence | Drag Stake 1 and release | Stake X/Y offsets persist through backend regeneration and SVG moves the stake | P0 | Automated + manual |
| D-10 | Stake shape | Generate one stake | Stake has flat top and rounded/pointed lower end; default dimensions are 3mm x 50mm | P0 | Automated + manual |
| D-11 | Export after stake drag | Drag a stake, download SVG | Exported SVG includes `S0-stake`/`S1-stake` paths; overlay elements are not included | P0 | Manual + SVG inspection |

---

## 11. LightBurn Manual Validation Checklist

Run this checklist on a generated SVG **before committing to production material cuts**.

| Step | Check | Pass Condition |
|------|-------|----------------|
| LB-01 | Import SVG into LightBurn | No import errors; design visible on canvas |
| LB-02 | Check dimensions | Displayed width and height match the `canvas_width_mm` and `canvas_height_mm` from the app |
| LB-03 | Check paths visible | All letters and lines are visible as black-filled shapes |
| LB-04 | Check counters | Counter holes (O, e, a, b, d, p, 0, 6, 8, 9) appear open, not filled |
| LB-05 | Check no missing glyphs | All expected letters are present; no blank or placeholder shapes |
| LB-06 | Check no background | No unwanted rectangle covering the canvas |
| LB-07 | Check no text elements | LightBurn path-edit mode shows no text items requiring installed fonts |
| LB-08 | Check connectivity | Lines and letters visually overlap as intended; no unexpected gaps |
| LB-09 | Check floating dots | Any letter with a dot (i, j) shows the dot positioned as expected |
| LB-10 | Check stakes | Stakes are visible, correctly positioned, and overlap the design before cutting |
| LB-11 | Weld if needed | If paths need to be merged, use LightBurn Optimise or Weld before cutting |
| LB-12 | Test cut | Perform a test cut on scrap material before cutting production acrylic/wood |

---

## 12. Regression Tests (Existing Suite)

All automated tests must pass before any change to Cake Topper code is committed.

```
cd backend
..\.venv\Scripts\python.exe -m pytest ../tests/ -q
```

Current automated Cake Topper coverage lives in `tests/test_cake_topper.py`, including manual line offset and stake geometry tests.

---

## 13. Test Status Summary

| Phase | Status |
|-------|--------|
| Automated Cake Topper tests | Created and passing in `tests/test_cake_topper.py` |
| Manual LightBurn validation | Pending — to be done before production use |
| Current automated suite | 169 passed, 2 skipped as of Cake Topper manual offset implementation |
| CairoSVG / PNG validation | Blocked — libcairo-2.dll not installed on current machine |
| Preview drag validation | User-confirmed working on 2026-06-01; keep D-series manual checks for regressions |
