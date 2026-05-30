# phase-1b-revision-handoff.md

## Document Information

Phase: 1B Revision
Name: Connectivity Resolution Engine — Natural Connectivity & Letter Compression
Date: 2026-05-30
Status: Complete

---

# 1. Executive Summary

Phase 1B Revision adds the two missing levels of the approved Connectivity Resolution Engine:

- Level 1 — Natural Connectivity detection using real Shapely geometric analysis
- Level 2 — Intelligent Letter Compression with Shapely union of overlapping geometry

The previous Phase 1B implementation went straight to bridge fallback (Level 3) and skipped all bridges as low-confidence, producing a connectivity score of 15/100 for common names like Oliver in Arial.

After this revision, Oliver in Arial connects via letter compression and returns:

```
strategy:              compression
components_before:     6
components_after:      1
compression_amount_mm: varies by font (typically 0.3–2.1 mm per gap)
connectivity_score:    95
production_score:      ~91
```

All 44 automated tests pass. Frontend build passes.

---

# 2. Scope Delivered

## New Backend Modules

- `backend/app/shapely_converter.py` — converts Canonical Geometry paths to Shapely polygons and back; Bezier curve approximation; connected component counting; inverse polygon-to-path conversion
- `backend/app/connectivity_engine.py` — three-level connectivity resolution orchestrator

## Modified Backend Modules

- `backend/app/models.py` — added `strategy` and `compression_amount_mm` to `WeldingMetadata`
- `backend/app/generation_service.py` — replaced `apply_welding()` with `resolve_connectivity()`
- `backend/app/material_validator.py` — strategy-aware connectivity scoring and warning messages

## Modified Frontend

- `frontend/src/types/design.ts` — added `strategy` and `compression_amount_mm` to welding interface
- `frontend/src/components/ValidationPanel.tsx` — displays strategy label (Naturally Connected / Connected via Compression / Connected via Bridges / Disconnected)

## New Tests

- `tests/test_phase_1b_connectivity.py` — 27 new tests covering shapely converter unit tests, connectivity component counting, and all three API-level strategy levels

---

# 3. Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Bezier approximation | 8 samples for Q, 12 for C | Sufficient accuracy for mm-scale connectivity detection |
| Connectivity tolerance | 0.1mm | Catches genuinely touching paths; avoids false positives for near-neighbours |
| Compression step | 0.3mm per iteration | Fine enough to find the minimum needed compression without overshooting |
| Max compression steps | 20 (= 6mm max per gap) | Covers wide-spaced fonts while preventing extreme compression |
| Merge trigger | `intersects AND NOT touches` | Only unions geometry with actual interior overlap, not just boundary contact |
| `components_after` after merge | Hardcoded to 1 | Compression only returns when count_connected_components == 1; recalculating via stale glyph path IDs was causing a spurious 0 result |
| `enabled=False` handling | Strategy set to "natural", enabled passed through | Matches original behaviour; no compression or bridges when disabled |

---

# 4. Known Limitations

| Limitation | Severity | Notes |
|---|---|---|
| Merged path geometry uses L-commands only (no Bezier curves) | Medium | The merged area between compressed letters is polygonal. Non-merged letter interiors retain original Bezier curves. Acceptable for laser cutting. |
| Glyph metadata (`path_ids`) is not updated after merge | Low | The `CanonicalGeometry.glyphs` still reference original path IDs which no longer exist in merged output. SVG and PNG export are unaffected (they iterate `geometry.paths` directly). Phase 1C may clean this up. |
| Compression is uniform across all inter-glyph gaps | Low | All gaps close by the same absolute amount per step. Variable-gap fonts may over-compress narrow pairs before wide pairs connect. Acceptable for Phase 1B. |
| Level 3 bridge fallback Shapely component counter not yet updated | Low | `welding_engine.py` still uses bounding-box `_count_components`. This is the fallback path only. Phase 1C may refactor to use Shapely throughout. |

---

# 5. Test Results

## Automated Tests

```
44 passed, 0 failed
```

All Phase 1A regression tests: passed
All Phase 1B material validation tests: passed
New Phase 1B connectivity tests: passed

## Frontend Build

```
Build passed
```

---

# 6. Acceptance Criteria Results

| Criterion | Result |
|---|---|
| Connected script fonts return strategy = natural and unchanged geometry | Passed (single character tests) |
| Short names in standard fonts connect via compression | Passed (Oliver, Amelia, Hannah) |
| Bridge fallback only runs when Levels 1 and 2 have failed | Passed (disabled test confirms no bridge when welding off) |
| Connectivity score for compression-connected output ≥ 95 | Passed |
| All Phase 1A tests pass | Passed |
| All Phase 1B material validation tests pass | Passed |
| New connectivity level tests pass | Passed |
| Validation panel shows strategy label | Implemented |
| No out-of-scope features implemented | Confirmed |

---

# 7. Phase 1C Prerequisites

Phase 1C planning may begin when:

1. Manual LightBurn import validation is performed by the project owner for at least one compression-connected SVG
2. Visual quality of the compression output is accepted (letter overlap area is polygonal, not curved)
3. A Phase 1C Implementation Plan is produced and approved

---

# 8. Recommendations For Phase 1C

- Validate that merged (polygonal) geometry at letter junctions imports correctly into LightBurn
- Consider tuning `_COMPRESSION_STEP_MM` and `_MAX_COMPRESSION_STEPS` based on real shop testing
- Update `welding_engine.py` bridge component counter to use Shapely instead of bounding-box heuristic
- Clean up `CanonicalGeometry.glyphs.path_ids` after merge to remove stale references
- Add golden test corpus with known strategy expectations per font category
