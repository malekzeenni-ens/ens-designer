# phase-1b-revision-plan.md

## Document Information

Phase: 1B Revision
Name: Connectivity Resolution Engine — Natural Connectivity & Letter Compression
Target Release: v0.2.1
Owner: Etch 'N' Shine
Date: 2026-05-30
Status: Ready For Approval

---

# 1. Executive Summary

Phase 1B delivered material profiles, conservative bridge fallback, connectivity metadata, and a validation panel. It did not implement the two higher-priority levels of the approved Connectivity Resolution Engine:

- Level 1 — Natural Connectivity (preserve already-connected fonts unchanged)
- Level 2 — Intelligent Letter Compression (close gaps by adjusting tracking before adding bridges)

This revision adds those two levels upstream of the existing bridge fallback, completing the three-level Connectivity Resolution Engine as approved.

The approved processing order is:

```text
Canonical Geometry
-> Level 1: Natural Connectivity Detection
   -> If connected: return unchanged, mark strategy = natural
-> Level 2: Intelligent Letter Compression
   -> Reduce spacing in steps
   -> Union overlapping geometry
   -> If connected: return result, mark strategy = compression
-> Level 3: Structural Bridge Fallback (existing)
   -> Place bridges at safe candidate locations
   -> mark strategy = bridge
-> If no strategy succeeds: return disconnected with warning
```

No UI controls are added. The existing validation panel will surface the strategy used. Manual bridge override remains in Phase 1C.

---

# 2. Gap Analysis

## 2.1 What Phase 1B Delivered

| Feature | Status |
|---|---|
| Material profiles (3mm Cast Acrylic, Mirror Acrylic, Plywood) | Complete |
| GET /api/materials endpoint | Complete |
| Structural bridge fallback | Complete — conservative, confidence-gated |
| Connectivity metadata (components before/after, bridge count) | Complete |
| Validation report (connectivity score, structural score, production readiness) | Complete |
| Material selector UI | Complete |
| Validation panel UI | Complete |

## 2.2 What Phase 1B Is Missing

| Feature | Gap | Impact |
|---|---|---|
| Natural connectivity detection | Not implemented | Script and connected fonts receive unnecessary processing |
| Intelligent letter compression | Not implemented | Disconnected fonts that could connect through spacing are sent straight to bridge fallback |
| Shapely-based geometric connectivity check | Not implemented | Current `_count_components` uses bounding-box-only heuristic, not real geometry |
| Union of overlapping paths | Not implemented | Even if letters overlap after compression, geometry is not merged |
| Strategy field in connectivity metadata | Not implemented | UI cannot show which strategy was applied |

## 2.3 Observed Symptom

Smoke test for Oliver / Arial / 3mm Cast Acrylic:

```
Components before:    6
Components after:     6
Bridges added:        0
Skipped (low-conf):   5
Connectivity score:   15
Production readiness: 32
```

Six components in, six components out. Disconnected output. No bridges placed because all failed the conservative safety check. No compression attempted.

Arial with moderate tracking should connect through letter compression for most short names. This is the Level 2 gap.

---

# 3. Scope

## 3.1 Included in This Revision

- Natural connectivity detection using Shapely geometric analysis
- Intelligent letter compression (tracking reduction with connectivity recheck)
- Shapely polygon union for overlapping geometry after compression
- Updated `ConnectivityMetadata` model with `strategy` field
- Updated validation scoring to reflect the resolution strategy used
- Updated validation panel to display the strategy (Natural / Compression / Bridge / Disconnected)
- Unit tests for all three levels
- Updated handoff documentation

## 3.2 Excluded From This Revision

- Manual bridge override (Phase 1C)
- Bridge adjustment controls
- Golden test corpus automation (Phase 1C)
- LightBurn layer export
- DXF export
- AI features
- Cake toppers
- Decorative library
- Batch processing
- Cloud functionality

---

# 4. Dependencies

## 4.1 New Backend Dependency

| Package | Version | Purpose |
|---|---|---|
| shapely | >=2.0.0 | Geometric connectivity analysis, polygon intersection, polygon union |

Shapely 2.x uses a C-extension GEOS backend and is available as a pre-compiled wheel on Windows for Python 3.10+. No build toolchain required.

## 4.2 No Frontend Dependencies Added

No new frontend packages are required. The existing validation panel is extended with a new strategy field.

---

# 5. Files Affected

## 5.1 New Files

| File | Purpose |
|---|---|
| `backend/app/connectivity_engine.py` | Three-level connectivity resolution orchestrator |
| `backend/app/shapely_converter.py` | Converts Canonical Geometry paths to Shapely Polygon objects |
| `tests/test_phase_1b_connectivity.py` | Unit and integration tests for all three connectivity levels |

## 5.2 Modified Files

| File | Change |
|---|---|
| `backend/app/generation_service.py` | Replace `apply_welding()` call with `resolve_connectivity()` from connectivity engine |
| `backend/app/models.py` | Add `strategy` field to `ConnectivityMetadata`; rename `WeldingMetadata` to `ConnectivityMetadata` |
| `backend/app/welding_engine.py` | Refactor to `bridge_engine.py` or narrow its responsibility to bridge-only fallback |
| `backend/requirements.txt` | Add `shapely>=2.0.0` |
| `frontend/src/components/ValidationPanel.tsx` | Display connectivity strategy label |

## 5.3 No Change

| File | Reason |
|---|---|
| `backend/app/canonical_geometry.py` | No structural change required |
| `backend/app/svg_exporter.py` | No change — exports paths as-is |
| `backend/app/png_exporter.py` | No change |
| `backend/app/font_loader.py` | No change |
| `backend/app/text_shaper.py` | No change |
| `backend/app/outline_extractor.py` | No change |
| `backend/app/material_validator.py` | Minor: update scoring to reference strategy |
| `backend/app/material_profiles.py` | No change |

---

# 6. Technical Design

## 6.1 Shapely Converter (`shapely_converter.py`)

### Purpose

Convert Canonical Geometry Model path command arrays into Shapely `Polygon` or `MultiPolygon` objects for geometric analysis and union operations.

### Approach

Shapely operates on polygons defined by coordinate sequences, not parametric curves. Bezier curve commands (`Q`, `C`) must be approximated by sampling points along the curve.

**Bezier sampling:**
- Quadratic Bezier (`Q`): sample 8 points using the parametric formula at `t = 0, 1/7, 2/7, ..., 1`
- Cubic Bezier (`C`): sample 12 points

**Per-path conversion:**
1. Walk the command list.
2. Accumulate coordinate samples from `M`, `L`, `Q`, `C` commands.
3. On `Z` (close path), close the coordinate ring.
4. Build a Shapely `LinearRing` from the accumulated coordinates.
5. If a path has multiple closed subpaths (e.g. the letter O — outer ring + inner counter ring), the largest ring is the exterior; remaining rings are holes.
6. Return a `Polygon` with exterior and holes.

**Per-glyph conversion:**
- A glyph may contribute multiple paths (e.g. `i` has a dot and a body).
- Union all per-path polygons for the glyph using `shapely.ops.unary_union`.
- Return one `Geometry` object per glyph.

**Tolerance:**
- Use a small buffer (`buffer(0)`) to fix self-touching or self-intersecting rings before use.

### API

```python
def paths_to_shapely(paths: list[GeometryPath]) -> list[Geometry]:
    """Convert a list of canonical paths to Shapely geometries, one per closed subpath group."""

def glyph_to_shapely(glyph: GlyphInfo, all_paths: list[GeometryPath]) -> Geometry:
    """Return a single Shapely geometry for a glyph using its linked paths."""
```

---

## 6.2 Level 1 — Natural Connectivity Detection

### Logic

1. Convert all glyph geometries to Shapely polygons.
2. Build a connectivity graph: two glyphs are connected if their Shapely geometries `.intersects()` or `.touches()`.
3. Run a union-find (connected components) traversal over the graph.
4. If the number of connected components equals 1 → naturally connected.

### Output

- Strategy: `"natural"`
- Geometry: unchanged from Phase 1A output
- Compression amount: 0
- Bridges added: 0

### Expected Fonts

Pacifico, Peanut Butter, and most script fonts where letters share path boundaries will pass Level 1. Many block fonts and sans-serif fonts will not.

---

## 6.3 Level 2 — Intelligent Letter Compression

### Logic

Level 2 runs only if Level 1 fails.

**Step 1 — Compression loop:**

1. Set `compression_step = 0.5mm`
2. Set `max_compression = 20%` of the mean letter advance width (configurable)
3. Set `total_compression = 0`
4. While `total_compression < max_compression`:
   a. Shift each glyph's X coordinates leftward by `compression_step × glyph_index` (earlier glyphs stay; later glyphs slide left cumulatively)
   b. Rebuild Shapely geometries from shifted coordinates
   c. Recheck connectivity using the union-find algorithm from Level 1
   d. If connected → proceed to Step 2
   e. Increment `total_compression`

**Step 2 — Geometry union:**

When letters overlap after compression, Shapely polygon union merges them into clean connected output:

1. For each pair of adjacent glyphs that now intersect:
   - Compute `shapely_union = glyph_a.union(glyph_b)`
   - Replace the two glyph path sets with paths derived from the union polygon
2. Convert the union result back to Canonical Geometry path commands (polygon exterior + holes → path commands)
3. Rebuild glyph-to-path linkage in the Canonical Geometry Model

**Step 3 — Final connectivity check:**

Verify the merged geometry forms one connected component. If yes → strategy `"compression"`.

### Compression Limit Rationale

20% of mean advance width is a practical visual boundary. Beyond 20% compression, letter shapes begin visually colliding in ways that harm readability. This limit keeps compression in the range of professional tracking adjustment.

The limit is configurable so it can be tuned during Phase 1C production hardening.

### Shapely-to-Path Conversion (inverse)

After union, a Shapely polygon must be converted back to Canonical Geometry path commands:

1. Extract the exterior ring as a list of coordinate pairs.
2. Emit `M` for the first coordinate, `L` for subsequent coordinates, `Z` to close.
3. For each interior ring (hole), repeat the same process as a separate closed subpath.

This is a simplification: the union result is represented as a polygonal approximation (using straight-line `L` commands), not as Bezier curves. This is acceptable for Phase 1B because:
- Connected geometry that was previously separate letter outlines does not need Bezier precision at the join
- SVG path approximations at this sampling density (every ~0.5mm) are indistinguishable from curves at typical laser cutting scales

---

## 6.4 Level 3 — Structural Bridge Fallback (Existing)

Level 3 runs only if Level 1 and Level 2 both fail.

The existing `welding_engine.py` bridge logic is preserved without modification for Phase 1B revision. It will be called only as a final fallback.

The bridge engine's `_count_components` function will be replaced by the Shapely-based component counter from Level 1 for consistency.

Strategy is set to `"bridge"` if any bridges are added, or `"disconnected"` if bridges were skipped due to low confidence and no connection was achieved.

---

## 6.5 Updated Models

### ConnectivityMetadata

Rename `WeldingMetadata` to `ConnectivityMetadata` and add `strategy`:

```python
class ConnectivityMetadata(BaseModel):
    strategy: Literal["natural", "compression", "bridge", "disconnected"]
    compression_amount_mm: float = 0.0
    connected_components_before: int
    connected_components_after: int
    bridges_added: int = 0
    bridge_path_ids: list[str] = []
    bridge_candidates_skipped: int = 0
```

The rename from `WeldingMetadata` to `ConnectivityMetadata` aligns with the approved Connectivity Engine terminology. A compatibility alias `WeldingMetadata = ConnectivityMetadata` may be kept temporarily if the frontend references the old name.

---

## 6.6 Updated Generation Service

The generation pipeline becomes:

```text
normalise_text()
-> shape_text()
-> extract_outlines()
-> build_geometry()
-> resolve_connectivity()   ← NEW: replaces apply_welding()
   -> Level 1: natural connectivity check
   -> Level 2: letter compression + union
   -> Level 3: bridge fallback
-> validate_geometry()
-> export_svg()
-> export_png()
```

The `resolve_connectivity()` function in `connectivity_engine.py` accepts the Canonical Geometry model and material profile and returns an updated model with connectivity metadata and (if Level 2 ran) modified path geometry.

---

## 6.7 Connectivity Engine Module (`connectivity_engine.py`)

```text
resolve_connectivity(geometry, material, enabled) -> CanonicalGeometry
  -> _check_natural_connectivity(geometry) -> bool, int (components)
     -> uses shapely_converter + union-find
  -> _apply_compression(geometry, material, max_compression_pct) -> CanonicalGeometry | None
     -> compression loop
     -> shapely union
     -> inverse polygon-to-path conversion
  -> _apply_bridge_fallback(geometry, material) -> CanonicalGeometry
     -> existing bridge engine logic (narrowed to bridge-only)
```

---

# 7. Testing Strategy

## 7.1 Level 1 — Natural Connectivity Tests

| Test Case | Font Category | Expected Strategy |
|---|---|---|
| Oliver / Pacifico (if available) | Script | natural |
| Oliver / any connected script font | Script | natural |
| Single letter A / any font | Any | natural (one component) |
| Oliver / Arial | Sans | NOT natural → proceeds to Level 2 |

For each "natural" test:
- Assert `strategy == "natural"`
- Assert `compression_amount_mm == 0`
- Assert `bridges_added == 0`
- Assert `components_before == components_after == 1`
- Assert path geometry is unchanged from Phase 1A output

## 7.2 Level 2 — Letter Compression Tests

| Test Case | Font Category | Expected Strategy |
|---|---|---|
| Oliver / Arial | Sans | compression (moderate tracking) |
| Amelia / Arial | Sans | compression |
| A / any font | Any | natural (skip to Level 1) |
| Hannah / bold sans | Sans | compression |

For each "compression" test:
- Assert `strategy == "compression"`
- Assert `compression_amount_mm > 0`
- Assert `components_after == 1`
- Assert `bridges_added == 0`
- Assert modified paths are present in geometry

## 7.3 Level 3 — Bridge Fallback Tests

| Test Case | Expected Strategy |
|---|---|
| Multi-word text "Happy Birthday" | bridge or disconnected |
| A font with very wide letter spacing that exceeds compression limit | bridge or disconnected |

For bridge tests:
- Assert `strategy == "bridge"` when bridges were placed, or `"disconnected"` when all were skipped
- Assert bridge geometry is present in paths when strategy is "bridge"

## 7.4 Regression Tests

All nine Phase 1A tests must continue to pass after this revision.
All existing Phase 1B material validation tests must continue to pass.

Run full test suite:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Expected: all existing + new tests pass.

## 7.5 Manual Validation Checklist

For each test case in Sections 7.1–7.3:

1. Start the application.
2. Enter the name, select the font, select the material.
3. Click Generate.
4. Confirm the validation panel shows the correct strategy label.
5. Check connectivity score — naturally connected and compression-connected output should score significantly higher than 15/100.
6. Download SVG.
7. Open in browser — confirm text outlines are visible and connected.
8. Import into LightBurn — confirm no floating elements.
9. Confirm dimensions remain correct in millimetres.

---

# 8. UI Changes

## 8.1 ValidationPanel Strategy Label

Add a small strategy label to the existing validation panel:

| Strategy | Label | Colour |
|---|---|---|
| `natural` | Naturally Connected | Green |
| `compression` | Connected via Compression | Blue |
| `bridge` | Connected via Bridges | Amber |
| `disconnected` | Disconnected — Manual Review Required | Red |

No new components are created. The label is added to the existing `ValidationPanel.tsx`.

## 8.2 No New Controls

Manual bridge controls, compression sliders, and override toggles remain out of scope. These belong to Phase 1C.

---

# 9. Risk Assessment

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-001 | Shapely Bezier approximation introduces visible polygon artefacts in merged geometry | Medium | Sample at ≥8 points per curve segment; validate visually in manual tests |
| R-002 | Compression overshoots for narrow fonts, colliding letter bowls | Medium | Enforce 20% advance width limit; add per-iteration visual tolerance check |
| R-003 | Union result polygon contains holes that are incorrectly interpreted as outer shapes | Medium | Use Shapely polygon `.exterior` and `.interiors` explicitly; validate winding |
| R-004 | Script fonts with decorative dots or swashes incorrectly flagged as disconnected | Medium | Use `intersects OR touches` (not just `intersects`) in Level 1 check; add swash-tolerance option |
| R-005 | Shapely union of near-collinear edges produces degenerate geometry | Low | Apply `buffer(0)` cleanup before and after union; log degenerate results |
| R-006 | Renaming `WeldingMetadata` to `ConnectivityMetadata` breaks frontend without alias | Medium | Add `WeldingMetadata = ConnectivityMetadata` alias in models.py during transition |
| R-007 | Compression loop is slow for long names at small step sizes | Low | Set a reasonable step (0.5mm) and cap iterations; measure performance |

---

# 10. Performance Targets

| Operation | Target |
|---|---|
| Level 1 natural connectivity check | <1 second |
| Level 2 compression loop (short name) | <5 seconds |
| Level 2 compression loop (long name) | <10 seconds |
| Level 3 bridge fallback | <2 seconds |
| Full generation end-to-end | <30 seconds (unchanged) |

---

# 11. Acceptance Criteria

This revision is complete when ALL of the following are true:

| Criterion | Validation |
|---|---|
| Connected script fonts return strategy = natural and unchanged geometry | Unit test |
| Short names in sans fonts connect through compression | Unit test + manual |
| Bridge fallback only runs when Levels 1 and 2 have failed | Unit test |
| Connectivity score for compression-connected output is >50 | Manual observation |
| All existing Phase 1A tests pass | Automated |
| All existing Phase 1B material validation tests pass | Automated |
| New connectivity level tests pass | Automated |
| Validation panel shows strategy label | Manual |
| SVG imports into LightBurn without floating elements (for connected output) | Manual |
| No out-of-scope features implemented | Scope review |

---

# 12. Development Sequence

## Step 1 — Add Shapely and Converter

- Add `shapely>=2.0.0` to `requirements.txt`
- Create `shapely_converter.py` with Bezier sampling and path-to-polygon conversion
- Write unit tests for the converter (verify polygon area, point containment, hole detection)

Exit criterion: a simple path (square + inner square) converts to a Shapely Polygon with one hole.

## Step 2 — Level 1 Natural Connectivity

- Implement Shapely-based connected-components check in `connectivity_engine.py`
- Add `_check_natural_connectivity()` returning component count and connected bool
- Wire into `resolve_connectivity()` as the first check
- Write Level 1 tests

Exit criterion: single-letter input returns strategy = natural; a serif script font sample returns strategy = natural.

## Step 3 — Level 2 Letter Compression

- Implement compression loop in `connectivity_engine.py`
- Implement Shapely-based union and inverse polygon-to-path conversion
- Wire into `resolve_connectivity()` as Level 2 after Level 1 fails
- Write Level 2 tests

Exit criterion: Oliver / Arial returns strategy = compression with components_after = 1.

## Step 4 — Level 3 Integration

- Refactor `welding_engine.py` bridge logic to call Shapely component counter instead of bounding-box counter
- Wire existing bridge logic as Level 3 in `resolve_connectivity()`
- Write Level 3 test with a multi-word input

Exit criterion: "Hello World" (two words, always disconnected at word boundary) returns strategy = bridge or disconnected.

## Step 5 — Model Updates and UI

- Update `models.py`: rename `WeldingMetadata` to `ConnectivityMetadata`, add `strategy` field, keep alias
- Update `frontend/src/components/ValidationPanel.tsx`: add strategy label row
- Update generation API response to include strategy

Exit criterion: UI shows strategy label; full test suite passes.

## Step 6 — Testing, Manual Validation, Documentation

- Run full automated test suite
- Execute manual validation checklist for all three strategy levels
- Perform LightBurn import for at least one design per strategy type
- Update `phase-1b-completion-report.md`
- Create `phase-1b-revision-handoff.md`
- Commit with message `feat: phase 1b connectivity resolution engine`

Exit criterion: all acceptance criteria in Section 11 are met.

---

# 13. Handoff Documents

| Document | Action |
|---|---|
| `docs/handoffs/phase-1b-revision-plan.md` | This document — created |
| `docs/handoffs/phase-1b-revision-handoff.md` | Create at phase completion |
| `docs/handoffs/phase-1b-completion-report.md` | Update at phase completion — supersede current draft |

---

# 14. Git Commit

Recommended commit message at revision completion:

```
feat: phase 1b connectivity resolution engine
```

---

# 15. Stop Condition

This plan is complete.

No implementation may begin until this plan is approved.

After approval, proceed to Step 1 of the development sequence in Section 12.

After revision completion, STOP. Present the updated Phase 1B completion report before beginning Phase 1C planning.

---

# 16. Approval

Approved By:

Pending

Approval Date:

Pending

---

# End of Document
