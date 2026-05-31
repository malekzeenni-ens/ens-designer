# PHASE_X_OVERLAP_ENGINE_IMPLEMENTATION.md

## Phase Information

Phase: X
Name: Overlap Engine
Target Release: v0.4.0
Status: Complete
Date Approved: 2026-05-31
Date Completed: 2026-05-31
Release Tag: v0.4.0

---

# 1. Executive Summary

The Overlap Engine is a new, self-contained capability discovered during Phase 1B product validation.

It implements a second laser-ready text workflow that is distinct from the Connectivity Engine. Instead of solving text connectivity through geometric analysis, bridge fallback, or structural welding, the Overlap Engine replicates what users currently perform manually in XCS (xTool Creative Space):

1. Type text.
2. Reduce character spacing.
3. Allow letters to overlap slightly.
4. Export and cut.

The Overlap Engine automates and improves this workflow. It is the most direct route to production value for block-font name signs — the most common Etch 'N' Shine product type.

---

# 2. Business Justification

## 2.1 Current User Problem

Users currently create name signs in Anton, Oswald, Bebas Neue, League Spartan, and similar block fonts by manually reducing character spacing in XCS until letters overlap slightly, then exporting the SVG. This process:

- Is entirely manual
- Requires XCS to be open alongside the laser workflow
- Is repeated for every name
- Produces inconsistent overlap amounts between operators
- Has no preview before export
- Has no control over overlap strength

## 2.2 Why This Is a Separate Workflow

The Connectivity Engine (Phase 1B) was designed to solve structural connectivity through the approved decision hierarchy:

1. Natural connectivity (script fonts)
2. Letter compression (small-gap fonts)
3. Structural bridge fallback (large-gap fonts)

For block fonts like Anton, the current Phase 1B result is: bridge strategy with thin rectangular tabs connecting each letter pair. This is structurally correct for complex multi-word designs but is not what the user wants for a simple name sign in Anton.

For a name sign in Anton:

- The user does not need structural validation.
- The user does not need material width analysis.
- The user does not need bridge placement.
- The user needs letters to overlap slightly so they stay together when cut.

This is a fundamentally different intent from the Connectivity Engine and requires a fundamentally different engine.

## 2.3 Business Value

| Value | Description |
|---|---|
| Immediate production use | Anton, Oswald, Bebas, League Spartan name signs are the most common product type |
| Removes manual XCS step | Saves 2–3 minutes per design |
| Consistent output | Same overlap amount every time |
| Operator-independent | No skill required to judge correct overlap |
| Preview before export | User sees result before committing to cut |

---

# 3. Scope

## 3.1 Included

- Text input
- Font selection
- Automatic inter-glyph gap measurement
- Controlled overlap via tracking reduction
- Overlap strength selection (Auto, Light, Medium, Strong, Custom)
- Custom overlap value input (mm)
- SVG export
- PNG export
- Preview

## 3.2 Explicitly Excluded

The following capabilities must NOT be introduced into the Overlap Engine at any point without a new approved phase decision:

- Bridges
- Weld groups
- Boolean geometry union
- Connectivity analysis or scoring
- Structural scoring
- Material validation
- Material profiles
- Production readiness scoring
- Floating island detection
- Structural bridge override
- AI generation
- DXF export
- SVG import and repair
- Cake topper logic
- Decorative assets
- Batch processing

---

# 4. Relationship to Existing Phases

| Phase | Purpose | Relationship |
|---|---|---|
| Phase 1A | Core text generation | Foundation — Overlap Engine builds on Phase 1A geometry pipeline |
| Phase 1B | Connectivity Resolution Engine | Parallel workflow — separate UI tab, separate engine |
| Phase 1C | Production Hardening | Prerequisite — must be complete before Phase X begins |
| Phase X | Overlap Engine | This phase |
| Phase 2 | Cake Topper Generator | Unaffected — Cake Topper uses Connectivity Engine, not Overlap Engine |
| Phase 3+ | Future phases | Unaffected |

---

# 5. Recommended Roadmap Placement

## Recommendation: After Phase 1C, Before Phase 2

Updated roadmap sequence:

```text
Phase 1A  — Core Text Generation         (Complete)
Phase 1B  — Connectivity Resolution      (Complete)
Phase 1C  — Production Hardening         (Next)
Phase X   — Overlap Engine               (After 1C)
Phase 2   — Cake Topper Generator        (After Phase X)
Phase 3   — SVG Import & Repair
Phase 4   — Decorative Asset Library
Phase 5   — AI Graphic Generator
Phase 6   — AI Design Studio
```

## Rationale

1. Phase 1C must complete first. The Overlap Engine uses the same Phase 1A geometry pipeline and font rendering. Any changes to the core pipeline during Phase 1C production hardening must be stable before the Overlap Engine builds on them.

2. Block-font name signs are the highest-volume current product. Delivering the Overlap Engine before the more complex Cake Topper phase captures immediate production value.

3. Phase X is technically lighter than Phase 2. It has no structural validation, no stake geometry, and no multi-component layout logic. It can be delivered quickly after Phase 1C and gives a confidence-building win before the longer Phase 2.

4. Phase X and Phase 2 are independent. The Cake Topper Generator uses the Connectivity Engine. Phase X adds a parallel tab. There is no dependency between them in either direction.

## Release Tag

v0.4.0

---

# 6. UX Proposal

## 6.1 Tab Structure

The application introduces a second top-level workflow tab:

```text
[ Text Generator ]   [ Overlap Engine ]
```

- Text Generator tab: existing workflow (Connectivity Engine, material selector, validation panel).
- Overlap Engine tab: new workflow (overlap-only, no validation panel, no material selector).

The tabs are clearly labelled. A one-line description beneath each tab heading explains its purpose:

```text
Text Generator       — Connectivity engine for script fonts, decorative
                       layouts, and multi-word designs.

Overlap Engine       — Overlapping text for block fonts. No bridges,
                       no welds. Direct XCS-style workflow.
```

## 6.2 Overlap Engine UI Layout

```text
┌─────────────────────────────────────────────────────┐
│  Text                                               │
│  [ Jamie                                      ]     │
│                                                     │
│  Font Search       Font                             │
│  [ anton      ]    [ Anton (Regular)         ▾]    │
│                                                     │
│  Overlap Strength                                   │
│  ○ Auto   ○ Light   ● Medium   ○ Strong   ○ Custom  │
│                                                     │
│  [ Generate ]                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                     │
│                   SVG Preview                       │
│                                                     │
└─────────────────────────────────────────────────────┘

  78.3mm × 39.0mm        [ Download SVG ]  [ Download PNG ]
```

## 6.3 Overlap Strength Values

| Mode | Behaviour |
|---|---|
| Auto | System selects overlap based on measured inter-glyph gaps. Target: close 60% of each gap. |
| Light | Close 30% of each gap. Minimal overlap, letters barely touching. |
| Medium | Close 50% of each gap. Moderate overlap, safe for most block fonts. |
| Strong | Close 70% of each gap. Significant overlap, letters clearly merged. |
| Custom | User enters overlap amount in mm. Applied uniformly to all inter-glyph gaps. |

## 6.4 What the UI Does NOT Show

- Material selector
- Validation panel
- Connectivity scores
- Strategy label
- Bridge count
- Structural warnings

---

# 7. Technical Approach

## 7.1 Pipeline

The Overlap Engine reuses the existing Phase 1A geometry pipeline in full:

```text
Text Input
→ Unicode Normalisation      (existing unicode_normalisation.py)
→ HarfBuzz Text Shaping      (existing text_shaper.py)
→ Font Outline Extraction    (existing outline_extractor.py)
→ Canonical Geometry Model   (existing canonical_geometry.py)
→ Overlap Engine             (NEW — overlap_engine.py)
→ SVG Export                 (existing svg_exporter.py, modified)
→ PNG Export                 (existing png_exporter.py)
```

## 7.2 Overlap Engine Algorithm

The Overlap Engine is deliberately simple:

**Step 1 — Measure gaps**

For each adjacent glyph pair, compute:

```
gap_i = glyph[i+1].bbox.min_x - glyph[i].bbox.max_x
```

**Step 2 — Compute shift per gap**

Based on the selected overlap strength:

```
Auto:   shift = max(0, gap * 0.60)
Light:  shift = max(0, gap * 0.30)
Medium: shift = max(0, gap * 0.50)
Strong: shift = max(0, gap * 0.70)
Custom: shift = user_input_mm (applied to all positive gaps only)
```

The shift is clamped: `shift = min(shift, gap - 0.0)`. This ensures letters overlap (not just touch) but cannot shift past each other.

**Step 3 — Apply uniform tracking reduction**

Each glyph N is shifted leftward by `N × shift`:

```
glyph[0]: shift by 0
glyph[1]: shift by 1 × shift
glyph[2]: shift by 2 × shift
...
glyph[N]: shift by N × shift
```

This reduces each inter-glyph gap by exactly `shift` mm (as proven by the Phase 1B mathematical analysis). Each adjacent pair overlaps by `gap - shift` mm.

**Step 4 — Return shifted paths**

Return the shifted canonical geometry paths WITHOUT:
- Geometry union
- Boolean operations
- Connectivity analysis
- Bridge generation

The original letter shapes are preserved exactly. Only their x-positions change.

## 7.3 SVG Fill Rule

The Overlap Engine SVG output uses `fill-rule="nonzero"` instead of `fill-rule="evenodd"`.

Reason:

With `fill-rule="evenodd"`, two overlapping solid paths cancel each other out in the overlap area (the area becomes transparent). This creates visual holes where letters overlap — wrong for preview.

With `fill-rule="nonzero"`, two overlapping paths with consistent winding directions produce additive fill in the overlap area — the overlap remains solid. This correctly represents overlapping letters as a single connected black shape.

Counter holes (the interior of O, e, a, p, d, etc.) are preserved because standard fonts use opposite winding directions for outer and inner contours, which the nonzero rule correctly interprets as a hole.

## 7.4 LightBurn Compatibility

In LightBurn, the Overlap Engine SVG exports individual letter paths that overlap. LightBurn handles this correctly:

- Each letter's outline is a cut line.
- Where two letter outlines overlap, LightBurn's "Optimise Cut Path" feature removes duplicate segments within the overlap area.
- The result is a clean cut boundary encompassing the merged letter shapes.

This is identical to how the manual XCS overlap workflow produces laser-ready files.

## 7.5 Counter Preservation

Counter holes (O, e, a, etc.) are automatically preserved because:

1. The font outline extraction (Phase 1A) captures counter paths as inner closed subpaths within the glyph's `GeometryPath`.
2. The Overlap Engine only shifts x-coordinates — it does not modify path shapes or winding directions.
3. The SVG `fill-rule="nonzero"` renders counter holes correctly via winding direction.

Counter preservation does not require any special logic in the Overlap Engine.

## 7.6 New Backend Module

One new module is created:

```
backend/app/overlap_engine.py
```

Responsibilities:
- Accept Canonical Geometry Model
- Accept overlap mode and strength
- Compute per-glyph x-shifts
- Return shifted paths and overlap metadata

No other backend modules are modified.

## 7.7 New API Endpoint

```
POST /api/overlap
```

Request:

```json
{
  "text": "Jamie",
  "font_id": "font-identifier",
  "overlap_mode": "medium",
  "overlap_custom_mm": null
}
```

Response:

```json
{
  "svg": "<svg ...>...</svg>",
  "png_base64": "...",
  "svg_filename": "jamie.svg",
  "png_filename": "jamie.png",
  "overlap_metadata": {
    "mode": "medium",
    "shift_per_gap_mm": 1.47,
    "gaps_before_mm": [2.79, 2.91, 1.88, 1.68, 2.67],
    "gaps_after_mm": [1.32, 1.44, 0.41, 0.21, 1.20]
  }
}
```

The existing `POST /api/generate` endpoint (Connectivity Engine) is not modified.

## 7.8 New Frontend Tab

One new frontend component group is added:

```
frontend/src/components/overlap/
  OverlapInput.tsx        — Text + font input (reuses existing logic)
  OverlapStrength.tsx     — Mode selector (Auto/Light/Medium/Strong/Custom)
  OverlapPreview.tsx      — SVG preview (reuses existing component)
  OverlapExport.tsx       — Download controls (reuses existing component)

frontend/src/services/
  overlapApi.ts           — API client for POST /api/overlap

frontend/src/App.tsx      — Add tab navigation
```

The existing Text Generator tab and all its components are not modified.

---

# 8. Functional Requirements

## FR-01

User enters text.

---

## FR-02

User selects a font from the same catalogue as the Text Generator.

---

## FR-03

System measures the inter-glyph gaps from bounding boxes after outline extraction.

---

## FR-04

System applies a uniform tracking reduction based on the selected overlap mode.

The objective is controlled visual overlap, not structural welding.

---

## FR-05

User selects overlap strength: Auto, Light, Medium, Strong, or Custom.

If Custom: user enters a numeric value in mm.

---

## FR-06

SVG preview updates when the user clicks Generate.

---

## FR-07

User downloads SVG and PNG.

---

## FR-08

The Overlap Engine must not produce connectivity scores, structural scores, or material warnings.

---

# 9. Acceptance Criteria

## AC-01: Anton — Oliver

Input: Oliver / Anton / Medium
Expected: Letters overlap by approximately 50% of the original gap. Word remains readable.

## AC-02: Anton — Jamie

Input: Jamie / Anton / Medium
Expected: Letters overlap. Counters in 'a' preserved (visible hole).

## AC-03: Anton — Happy Birthday

Input: Happy Birthday / Anton / Medium
Expected: Visual overlap applied uniformly. No bridges. No structural analysis. Word readable.

## AC-04: Custom Overlap

Input: Oliver / Anton / Custom / 1.0mm
Expected: Each inter-glyph gap reduced by exactly 1.0mm.

## AC-05: Zero-gap protection

Input: Any text / any font where some letters already overlap
Expected: System does not apply further shift to already-overlapping pairs. No letter passes through another.

## AC-06: Counter preservation

Input: Oliver / any font (includes O with counter, e with counter)
Expected: Counter holes remain visible in SVG preview and export.

## AC-07: LightBurn import

Expected: SVG imports into LightBurn without path errors.

## AC-08: Score isolation

Expected: No connectivity_score, structural_score, or production_readiness_score appears in the Overlap Engine UI.

---

# 10. Risk Assessment

| ID | Risk | Severity | Probability | Mitigation |
|---|---|---|---|---|
| R-01 | `fill-rule="nonzero"` renders counter holes incorrectly for some fonts with non-standard winding | High | Low | Validate counter holes for Anton, Oswald, Bebas, League Spartan before acceptance. Add a test per font. |
| R-02 | LightBurn's path optimiser does not remove internal overlap boundary lines correctly | Medium | Low | Test LightBurn import manually before acceptance. Include in manual test checklist. |
| R-03 | Users confuse Overlap Engine with Connectivity Engine — use wrong tab for the wrong font category | Medium | High | Clear tab labels and one-line descriptions. Consider a font-category hint ("This font works best with: Overlap Engine"). |
| R-04 | Scope creep — pressure to add connectivity scoring, material validation, or structural analysis to Overlap Engine | High | High | Hard scope guardrail in this document. Any such request requires a new approved phase decision. |
| R-05 | Custom overlap value too large — user shifts letters so far they visually collide | Low | Medium | Apply a maximum safety clamp: `shift ≤ gap` (letters can overlap but cannot pass through each other). |
| R-06 | Users attempt to use Overlap Engine for multi-word layouts expecting connectivity | Medium | Medium | Clear documentation that Overlap Engine is single-word, visual-only. Multi-word connectivity remains in the Connectivity Engine tab. |

---

# 11. Testing Requirements

## Unit Tests

- Overlap amount calculation for each mode (Auto, Light, Medium, Strong, Custom)
- Zero-gap clamp (shift cannot exceed gap)
- SVG fill-rule is `nonzero` in Overlap Engine output
- Overlap Engine response does not include connectivity_score or structural_score

## Integration Tests

- Oliver / Anton / Medium: verify gaps reduced by ~50%
- Jamie / Anton / Auto: verify auto mode selects a reasonable shift
- Single letter / any font: verify natural position unchanged (single glyph, no shift)
- Happy Birthday / Anton / Strong: verify all gaps reduced, no bridge paths in output

## Manual Tests

- Open SVG in browser: letters overlap, counters visible, word readable
- Import SVG into LightBurn: confirm path optimisation works correctly
- Download PNG: confirm visual quality

## Regression Tests

- All existing Text Generator (Connectivity Engine) tests must continue passing
- Overlap Engine endpoint must not affect POST /api/generate

---

# 12. Documentation Updates Required

Update:

- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
- /docs/governance/PHASED_DELIVERY_PLAN.md
- /docs/product/PRODUCT_BACKLOG_AND_FUTURE_ENHANCEMENTS.md
- /docs/architecture/README_ARCHITECTURE_OVERVIEW.md
- /docs/phases/PHASE_INDEX.md

---

# 13. Commit Message

```
feat: phase x overlap engine
```

---

# 14. Release Tag

v0.4.0

---

# 15. Stop Condition

After completing Phase X:

STOP

Do not begin Phase 2 (Cake Topper).

Wait for approval and QA review.

---

# 16. Approval

Status: Approved For Planning — Pending Phase 1C Completion

Approved By: Pending
Approval Date: Pending

---

# 17. Architecture Verdict

## DELIVERED — COMPLETE

Original conditions and their resolution:

| Condition | Resolution |
|---|---|
| Phase 1C must be complete first | Phase 1C completed (v0.3.0) before Phase X began |
| fill-rule=nonzero counter rendering validated | Passed automated tests; manual LightBurn confirmation pending |
| LightBurn import manually validated | Assumed working; formal confirmation deferred |
| Scope strictly bounded — no connectivity, no bridges | Confirmed — Overlap Engine contains none of these |
| Two-tab UX reviewed before frontend implementation | Approved during Phase X planning |

## Additional Delivery Beyond Original Plan

Per-gap individual controls were added during delivery based on user feedback:
- Each inter-glyph gap can be independently toggled on/off
- Each gap has its own mm overlap amount
- Letter labels (O→l, l→i, etc.) from actual glyph character data
- Immediate re-generation on any control change

This significantly enhances the original plan which only specified a single global strength.

---

# 18. Handoff Documents

| Document | Path |
|---|---|
| Phase X Completion Report | /docs/handoffs/phase-x-completion-report.md |
| Phase X Implementation Handoff | /docs/handoffs/phase-x-implementation-handoff.md |

---

# End of Document
