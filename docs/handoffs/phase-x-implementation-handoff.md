# phase-x-implementation-handoff.md

## Document Information

Phase: X
Name: Overlap Engine + Cake Topper Tab
Date: 2026-06-01
Release Tag: v0.4.0

---

# 1. Objectives Completed

- Overlap Engine: per-pair bounding-box shift algorithm, nonzero SVG fill rule.
- Per-gap controls: each inter-glyph gap independently toggleable with its own mm value.
- Floating component X/Y controls: dots and accents repositionable independently of the main stroke.
- Cake Topper tab: multi-line text composition with per-line font/size/alignment/overlap/vertical-gap and manual line positioning.
- Cake Topper preview drag: dashed overlay handles let the operator drag generated lines; release persists the movement as backend manual X/Y offsets.
- Cake Topper stakes: 0/1/2 stake controls generate 3mm x 50mm draggable stakes with flat tops and rounded/pointed lower ends.
- Two-column layout for both tabs: preview left (sticky), settings right (scrollable).
- Friendly error messages across all three generation endpoints.
- Font search auto-select bug fixed in Overlap and Cake Topper panels.

---

# 2. New Files

| File | Purpose |
|---|---|
| `backend/app/overlap_engine.py` | Core overlap algorithm, per-gap shift, floating offset application, SVG export |
| `backend/app/cake_topper_engine.py` | Multi-line text engine, per-line pipeline, canvas assembly, SVG composition |
| `backend/app/floating_component.py` | Detect floating subpaths (dots/accents), apply independent X/Y offsets |
| `backend/app/api/routes/overlap.py` | POST /api/overlap |
| `backend/app/api/routes/cake_topper.py` | POST /api/cake-topper |
| `frontend/src/components/OverlapPanel.tsx` | Full Overlap Engine tab with two-column layout and per-gap controls |
| `frontend/src/components/CakeTopperPanel.tsx` | Cake Topper tab with accordion per-line and vertical gap controls |
| `frontend/src/components/FloatingControls.tsx` | Shared X/Y control for floating components (used in both tabs) |
| `tests/test_phase_x_overlap_engine.py` | 22 Overlap Engine tests |
| `docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md` | Comprehensive Cake Topper feature document |
| `docs/handoffs/canvas-line-movement-drag-bug-handoff.md` | Resolution note for Cake Topper preview drag movement |

---

# 3. Modified Files

| File | Change |
|---|---|
| `backend/app/models.py` | Added: FloatingComponentOffset, FloatingComponentInfo, OverlapGapConfig, OverlapRequest (+floating_offsets), OverlapMetadata (+floating_components, +glyph_chars), CakeTopperLineConfig (+floating_offsets, +manual_x_offset_mm, +manual_y_offset_mm), CakeTopperLineMetadata (+floating_components, +y_offset_mm, +manual offsets), CakeTopperStakeConfig, CakeTopperStakeOffset, CakeTopperStakeMetadata, CakeTopperMetadata, CakeTopperResponse, Preset |
| `backend/app/main.py` | overlap_router, cake_topper_router, OverlapService, CakeTopperService registered |
| `backend/app/outline_extractor.py` | `font_size_mm` parameter added (default 42mm) for per-line size in Cake Topper |
| `backend/app/svg_exporter.py` | `fill_rule` parameter (default "evenodd"; Overlap/Cake Topper use "nonzero") |
| `frontend/src/App.tsx` | Three-tab navigation (Text Generator / Overlap Engine / Cake Topper) |
| `frontend/src/types/design.ts` | OverlapGapConfig, OverlapMode, FloatingComponentOffset, FloatingComponentInfo, OverlapResult, AlignmentMode, CakeTopperLineConfig, CakeTopperLineMetadata, CakeTopperStakeConfig, CakeTopperStakeMetadata, CakeTopperResult |
| `frontend/src/services/generationApi.ts` | _readError() helper, generateOverlap, generateCakeTopper |
| `frontend/src/components/PreviewPanel.tsx` | Shared SVG preview; Cake Topper line/stake box overlays and robust native pointer drag handling |
| `frontend/src/styles.css` | Two-column layout, per-gap pill styles, floating controls, cake topper accordion, alignment buttons, vertical gap row, canvas position controls, stake controls, preview drag overlay |

Post-v0.4.1 UI note: `frontend/src/App.tsx` now renders Cake Topper directly and no longer shows the Text Generator or Overlap Engine tabs. The underlying Text Generator and Overlap Engine components, services, and backend endpoints remain in the repository for possible future reactivation.

Post-v0.4.2 production note: Cake Topper now includes Etch N Shine branding, a full reset action, and backend-generated draggable stakes. Stake paths use IDs `S0-stake` and `S1-stake`, are exported as filled paths, and remain flat path assembly rather than boolean-unioned geometry.

---

# 4. Technical Decisions

| Decision | Rationale |
|---|---|
| fill-rule="nonzero" for Overlap + Cake Topper | Overlapping same-winding paths stay solid; evenodd cancels them. Counters preserved via font winding convention. |
| Per-gap config overrides (stateless, per-request) | No server session needed; complete state sent every request |
| Detection before applying floating offsets | Moving the dot toward the stroke would cause re-detection to classify it as non-floating, hiding the controls. Pre-offset detection is stable. |
| Floating component control in shared FloatingControls.tsx | Identical UI needed in both Overlap Engine and Cake Topper |
| Cake Topper detects words from text.split() (max 4) | Simple, predictable for short phrases; user controls word assignment via what they type |
| Canvas width = max line width + 2×PADDING | Gives room for all alignment modes without clipping |
| Lines centered by default | Most natural for cake toppers and decorative text |
| Accordion per-line (expanded by default) | After generation user wants to edit; expand/collapse available for space management |
| Detection order: detect → floating offset → geometry recalc | Ensures floating_components metadata is always present even after the dot is moved |
| Manual line offsets are additive after alignment/stacking | Keeps alignment modes predictable while allowing final composition nudges |
| Preview drag uses native `document` pointer listeners in capture phase | Avoids React pointer-capture/delegation issues and survives selection re-render during drag |
| Stake geometry generated in backend | Stakes must appear in production SVG/PNG output, not just as frontend preview decoration |
| Stake top overlaps the design by default | Provides a practical connection area while preserving manual LightBurn verification workflow |

---

# 5. API Reference

## POST /api/overlap

**Request:**
```json
{
  "text": "Oliver",
  "font_id": "font-id",
  "overlap_mode": "medium",
  "overlap_custom_mm": null,
  "gap_configs": [
    { "pair_index": 0, "enabled": true, "overlap_mm": 2.0 },
    { "pair_index": 2, "enabled": false, "overlap_mm": 1.5 }
  ],
  "floating_offsets": [
    { "glyph_index": 2, "x_offset_mm": 0.0, "y_offset_mm": 3.0 }
  ]
}
```

**Response:**
```json
{
  "svg": "...",
  "png_base64": "...",
  "svg_filename": "oliver.svg",
  "png_filename": "oliver.png",
  "overlap_metadata": {
    "mode": "medium",
    "target_overlap_mm": 1.5,
    "glyph_chars": ["O","l","i","v","e","r"],
    "gaps_before_mm": [2.79, 2.91, 1.89, 1.68, 2.67],
    "gaps_after_mm": [-1.5, -1.5, 1.89, -1.5, -1.5],
    "floating_components": [
      { "glyph_index": 2, "char": "i" }
    ]
  },
  "dimensions": { "width": 78.3, "height": 39.1, "units": "mm" }
}
```

## POST /api/cake-topper

**Request:**
```json
{
  "text": "Happy Birthday",
  "default_font_id": "font-id",
  "default_font_size_mm": 42.0,
  "default_overlap_mode": "medium",
  "line_configs": [
    {
      "font_id": "script-font-id",
      "font_size_mm": 35.0,
      "alignment": "center",
      "alignment_offset_mm": 0.0,
      "manual_x_offset_mm": 0.0,
      "manual_y_offset_mm": 0.0,
      "overlap_mode": "light",
      "gap_configs": [],
      "floating_offsets": []
    },
    {
      "font_id": "bold-font-id",
      "font_size_mm": 42.0,
      "alignment": "center",
      "alignment_offset_mm": 0.0,
      "overlap_mode": "medium",
      "gap_configs": [],
      "floating_offsets": []
    }
  ],
  "inter_line_gaps_mm": [-5.0]
}
```

**Response:**
```json
{
  "svg": "...",
  "png_base64": "...",
  "svg_filename": "happy_birthday.svg",
  "metadata": {
    "words": ["Happy", "Birthday"],
    "lines": [
      {
        "text": "Happy",
        "glyph_chars": ["H","a","p","p","y"],
        "gaps_before_mm": [...],
        "gaps_after_mm": [...],
        "width_mm": 86.8,
        "height_mm": 41.2,
        "x_offset_mm": 18.8,
        "y_offset_mm": 5.0,
        "manual_x_offset_mm": 0.0,
        "manual_y_offset_mm": 0.0,
        "floating_components": []
      },
      { "text": "Birthday", ... }
    ],
    "inter_line_gaps_mm": [-5.0],
    "canvas_width_mm": 134.4,
    "canvas_height_mm": 92.5
  }
}
```

---

# 6. Overlap Modes

| Mode | Target Overlap | Use Case |
|---|---|---|
| light | 0.5mm | Letters barely touching |
| auto | 1.0mm | Sensible default |
| medium | 1.5mm | Clean name-sign connection |
| strong | 2.5mm | Letters clearly merged |
| custom | User mm | Precise per-design control |

---

# 7. Alignment Modes (Cake Topper)

| Mode | Behaviour |
|---|---|
| left | Line left edge aligned to canvas left padding |
| center | Line centered within canvas width |
| right | Line right edge aligned to canvas right padding |
| manual | Line positioned at `PADDING + alignment_offset_mm` |

Manual canvas offsets are separate from alignment. `manual_x_offset_mm` and `manual_y_offset_mm` are added after the selected alignment and vertical stacking have been computed. These fields are controlled by the line card's **Canvas position offset** inputs and by preview drag release.

---

# 8. Tests

```
22 passed (Overlap Engine)
169 passed, 2 skipped (all phases after Cake Topper automated coverage)
```

---

# 9. Known Limitations

| Limitation | Severity | Notes |
|---|---|---|
| LightBurn fill-rule=nonzero not formally validated | Medium | Manual import test recommended before production use |
| Floating detection is bounding-box vertical only | Low | May miss accents that partially overlap the base glyph |
| Cake Topper canvas uses flat path assembly | Low | Not a boolean union; overlapping outlines at line borders visible in path-edit mode |
| Preview drag is not path editing | Low | Drag updates per-line backend offsets; it does not edit individual letters or SVG path commands |

---

# 10. Recommendations

- Formally validate Cake Topper SVG in LightBurn before production use.
- Consider adding a "Center all" shortcut for Cake Topper alignment.
- Consider a max-word-count selector (currently hardcoded to 4).
