# Keychain Designer K1 — Shared foundations handoff

Date: 2026-11-09 (Europe/London)

## 1. Executive summary

K1 adds reusable performance and geometry foundations before the dedicated Keychain engine. Cake Topper uses cached parsed fonts while retaining byte-identical golden SVGs. Existing ring positioning and warnings remain unchanged. The dedicated Keychain API and UI are not part of K1.

## 2. Objectives completed

- Bounded parsed-font cache with optional `loaded=` shaping and extraction.
- Per-font locking for HarfBuzz, FontTools and outline access; shared cold-insert lock.
- Cache invalidation on upload/delete and file signature changes.
- Reusable bounded raw glyph cache for K2.
- Extracted ring helpers under the same Cake Topper private aliases.
- Configurable history filename and optional adaptive curve tolerance.
- Full regressions and reproducible paired performance comparison.

## 3. Scope delivered

The existing Cake Topper pipeline now reuses font objects. Other callers retain their uncached default behaviour. Raw glyph commands are cached in font units before transforms, but Cake Topper continues its original draw arithmetic for exact parity. New ring snap, Keychain requests, final sizing and routes remain K2.

## 4. Files created

- `backend/app/font_cache.py`
- `backend/app/ring_geometry.py`
- `tests/test_keychain_foundations.py`
- `tests/fixtures/ring_geometry_k0.json`
- `docs/qa/keychain-k1-benchmark.json`
- `docs/adr/ADR-006-KEYCHAIN-ENGINE-AND-PERFORMANCE.md`
- This handoff.

## 5. Files modified

`text_shaper.py`, `outline_extractor.py`, `cake_topper_engine.py`, `shapely_converter.py`, `history_store.py`, font mutation routes, benchmark script, README, architecture overview, Keychain plan, phase index and deployment log.

## 6. Technical decisions

The user confirmed the K1 defaults before implementation: adopt caching in Cake Topper only with exact SVG parity; retain the PNG renderer and ring semantics; assess the 150 ms preview budget in K2; build shared raw glyph support now and connect it in K2.

Parsed fonts use a 32-entry LRU keyed by resolved path, mtime_ns and size. Both font libraries parse one byte snapshot. FontTools parses BytesIO, avoiding persistent OS font handles. Eviction/invalidation drops cache ownership without closing snapshots still used by active requests. Raw glyph outlines are bounded to 512 per font and returned as independent copies. All mutable library access uses the per-font RLock.

No-tolerance conversion preserves the original fixed 8/12 curve steps. A finite positive tolerance uses the control-polygon interpolation error bound with a 4–64 step clamp. At the 64-step cap an extreme curve may exceed the requested tolerance; K2 must validate final physical geometry. Details and alternatives are in ADR-006.

## 7. Architecture changes

Shared font and ring modules are additive. Cake Topper imports the old private helper names from the shared ring module. One-time AST comparison verified all nine extracted function bodies match K0 exactly, including metadata and disabled-ring helpers required by the moved code. No frontend architecture changes.

## 8. Dependencies added

None. Same installed font, geometry and PNG libraries as K0.

## 9. Database changes

No database changes introduced. `HistoryStore` still defaults to `cake_topper_history.json` and its original entry schema. An optional filename isolates future stores; K2 still supplies the Keychain entry schema/store.

## 10. Testing performed

- Full backend suite: 244 passed; one existing Starlette/httpx deprecation warning.
- Final foundation run after adding extreme-tolerance bounds: 28 passed (including two additional cases). No-tolerance callers bypass the changed adaptive branch.
- Frontend suite: 18 files / 63 tests passed, exit 0.
- Early parity run: all 77 Cake Topper and golden tests passed; all three golden SVGs byte-identical.
- New coverage: 28 tests for eight-thread cached/uncached shaping and outline parity across script, display, serif and Arabic fonts; concurrent cold loads; LRU eviction; mtime invalidation; clearing while snapshots remain active; raw command independence; upload/delete invalidation; history isolation; optional curve accuracy, invalid tolerance rejection and 4–64 subdivision limits; nine ring WKT-at-1e-6, metadata and warning comparisons against the original `e3a481e` functions.
- Benchmark checks the golden SVGs before measurements. Standalone paired runs exercise the existing service including SVG and PNG output.
- No browser or LightBurn validation claimed: UI and SVG bytes are unchanged; full product validation remains K5.

## 11. Known issues

Cairo native libraries remain unavailable; Pillow is the actual renderer. Existing disconnected-ring warnings are preserved intentionally for K2 auto-snap work. No dedicated Keychain tab or endpoint yet. Optional tolerance has the documented 64-segment cap. The current SVG/PNG pipeline can still dominate full-generation time.

## 12. Risks

Same-font operations serialize briefly for library safety. Active font snapshots can outlive LRU eviction, temporarily exceeding 32 live objects; future lookups use the current cache. Files replaced without changing mtime or size require explicit invalidation. Upload/delete routes already invalidate explicitly. A changed PNG renderer or machine load changes absolute timing comparisons.

## 13. Performance metrics

`docs/qa/keychain-k1-benchmark.json` records 22 cases, 20 warm cached and 20 warm uncached samples per case. Call order alternates each iteration, after separate warmups, with the same geometry, renderer and font binaries. Uncached calls pass `loaded=None` through the current service to retain the original font path. K0's report is unchanged. Inclusive stage timings are not additive; these measurements include PNG and exclude HTTP/browser time.

Final run completed at 20:13:37 UTC / Europe/London on 2026-11-09, exit 0. There are 440 cached and 440 uncached measured calls; all 22 cases used Pillow. The three golden checks passed before the run.

| Diagnostic: sum of the 22 case p50s | Cached ms | Uncached ms | Reduction |
|---|---:|---:|---:|
| Shaping | 2.032 | 62.022 | 96.7% |
| Outline extraction | 45.736 | 151.406 | 69.8% |
| Full generation including PNG | 4138.001 | 4277.460 | 3.3% |

This sum is a comparison index, not a pooled latency percentile or a measured batch duration. Total p50 improved in 17/22 cases. Five Satisfy cases had slightly worse total medians, despite faster font stages; full-generation noise and SVG/PNG costs can outweigh small font-stage savings. For example, Anton / Sarah was 107.603 ms cached versus 113.458 ms uncached; Satisfy / Sarah was 502.180 versus 494.861 ms. These diagnostic measurements meet K1's warm-path improvement gate but do not establish K2's preview latency target. No promise of faster total generation for every font/name is made.

## 14. Documentation updated

README, architecture overview, phase index, Keychain implementation plan, ADR-006, deployment log and this handoff. No governance documents changed.

## 15. Git information

Branch: `main`. Base: `3000113` (K0 and its deployment log). Milestone commit: `perf(keychain): add cached fonts and shared geometry foundations`. No remote push or release tag.

## 16. Deployment information

Source and local validation only; no production server restart. Roll back by reverting the K1 implementation commit. There is no data migration or dependency installation.

## 17. Recommendations for next phase

K2 builds the Keychain models, geometry/size solver, validation, ring auto-snap, API, history model/store and SVG/PNG exports. Reuse the raw glyph cache before applying transforms. Preserve the existing Cake Topper glyph arithmetic and its default no-tolerance conversion. Evaluate the server preview budget using the new PNG-free endpoint; font caching alone does not address SVG/PNG costs. Stop and report at the milestone boundary.
