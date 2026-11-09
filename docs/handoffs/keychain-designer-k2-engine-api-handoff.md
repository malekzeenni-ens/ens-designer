# Keychain Designer K2 — Engine and API handoff

Date: 2026-11-09 (Europe/London)

## 1. Executive summary

K2 delivers the dedicated Keychain engine, production checks, SVG/PNG exports and preview/export/history API. The frontend Keychain workspace is K3. Existing Cake Topper SVG bytes and runtime workflow are preserved.

## 2. Objectives completed

- Additive typed, finite-valued request/response/history models and input validation.
- Shared HarfBuzz shaping and cached raw outlines with cluster labels and missing-glyph handling.
- Reference overlap, dot auto-join, manual dot offsets, per-glyph transforms and physical letter spacing.
- Uniform finished-size solve, backing smoothing/counter filling and six-position ring snap.
- Physical ring/hole dimensions and real hole subtraction.
- Eleven production checks with pass/fail results, relevant highlights and fix payloads.
- PNG-free live preview, layered SVG exports, transparent composite PNGs, reloadable recipes and isolated history.
- Backend regressions, frontend regressions, golden parity and benchmark budgets.

## 3. Scope delivered

`POST /api/keychain/preview`, `POST /api/keychain/export`, `GET /api/keychain/history` and `POST /api/keychain/history` are registered before the static mount. Preview echoes request IDs and adds transparent glyph hit targets; it never creates a PNG or history entry. Export returns production SVG(s) and PNG and automatically saves one entry per export, including a two-file Layered export. The explicit history POST is for manual saves/imports, not an additional export call.

## 4. Files created

- `backend/app/keychain_engine.py`
- `backend/app/keychain_validation.py`
- `backend/app/keychain_svg.py`
- `backend/app/keychain_png.py`
- `backend/app/keychain_history.py`
- `backend/app/api/routes/keychain.py`
- `tests/test_keychain_engine.py`, `tests/test_keychain_validation.py`, `tests/test_keychain_api.py`
- `docs/qa/keychain-k2-benchmark.json`, `docs/qa/KEYCHAIN_QA_MATRIX.md`, sample SVG/PNG and this handoff.

## 5. Files modified

Additive Keychain section in `models.py`, additive dot-join helper in `floating_component.py`, app wiring in `main.py`, history ignore rule, benchmark script, README, architecture/export docs, phase plan/index, ADR-006 and deployment log.

## 6. Technical decisions

- Flatten each reference glyph/subpath once; reuse scaled geometry inside the solver. Reference overlap composes the existing helper functions. Cache raw font units before positioning, preserving Bézier output.
- Physical spacing, manual dot offsets and translation occur after uniform scaling in each evaluation, eliminating previous-request/provisional-scale drift. Scale/rotation occurs about the final control-bounds centre. Stable original floating indices let manual offsets work after auto-joining.
- Treat floating contours as unioned components, not counters, after moving dots into their stems. Auto-join applies to i/j-containing clusters only; other diacritics remain in their shaped positions.
- Use a guarded six-step secant solve. Opposing physical translations can make size initially decrease with scale; when the tiny-text bound is too large, an 18-step bounded minimum search precedes the root solve. This prevents false `KC-SIZE-MIN` errors for feasible edited designs.
- Ring auto-snap projects to the backing boundary and steps inward until the actual ring-boundary intersection chord meets the requested neck. Detached rings remain visible and generate explicit errors when auto-snap is off. Wall, neck and text-clearance checks operate in final mm.
- Resolve the plan's dimension conflict explicitly: `width_mm`/`height_mm` describe the finished geometry, and added `canvas_width_mm`/`canvas_height_mm` include 2 mm margins on each side. SVG viewBox/dimensions use the latter. Filename width uses the finished dimension.
- Use svgwrite with debug validation disabled for assembly speed, with generated production XML parsed in tests and benchmark runs. Recipe JSON is XML-escaped; comment dashes are sanitised. Invalid XML control characters are rejected at input.
- Unbuffered text retains Q/C commands. Explicit stroke reinforcement exports the buffered polygon silhouette, as the existing stroke-buffer technique does.
- Visual inspection found the legacy Pillow renderer erases underlying backing when drawing text counters. K2 reuses that drawing function on separate layers, alpha-composites them, and rasterises the unioned text silhouette so joined dots remain filled. Cake Topper rendering is unchanged. Cairo remains the first renderer when available.

## 7. Architecture changes

New dedicated service and feature modules compose K1 foundations. Existing Cake Topper geometry and drawing code are untouched. Keychain history reuses the existing JSON IO/locking foundation with its own validated entry model and filename. No frontend components were modified.

## 8. Dependencies added

None. Existing Shapely, HarfBuzz, FontTools, svgwrite, Pillow and optional CairoSVG suffice.

## 9. Database changes

New local `backend/data/keychain_history.json` is created on first save/export, capped at 500 entries and ignored by Git. Cake Topper history filename/schema/data are unchanged. No migration required.

## 10. Testing performed

- Full final backend suite: 325 passed; one existing Starlette/httpx deprecation warning.
- Frontend: 18 files / 63 tests passed, exit 0.
- Three K0 golden Cake Topper SVGs byte-identical, checked in pytest and before the benchmark.
- K2 adds 79 tests covering the sizing/geometry, checks, API, actual SVG hole/extent measurements, transparent PNG pixels, XML/recipe round trips, file alignment, history isolation, bad inputs, static mount precedence and concurrent previews.
- Local PNG/SVG example inspected visually; text counters show the backing and the ring hole remains transparent. No LightBurn or manufacturing validation claimed.
- See `docs/qa/KEYCHAIN_QA_MATRIX.md` for scenario coverage and pending K3/K5 checks.

## 11. Known issues

- The Keychain tab and operator controls are K3/K4. Check fixes/highlights and export-with-errors confirmation are data contracts here; K3/K5 supply the UI.
- Manual LightBurn colour mapping, import and manufacturing strength checks remain K5 work.
- Optional adaptive flattening retains the K1 64-segment cap. Extreme shapes may exceed requested tolerance at that cap.
- Extreme edited layouts can be infeasible or not converge within the bounded solve; the API returns explicit checks rather than silently distorting text or ring dimensions.
- The current Windows environment lacks Cairo native libraries. K2 uses the composited Pillow fallback; its renderer is recorded in benchmark metadata.

## 12. Risks

Automated structural checks are geometric indicators, not material testing. Future UI consumers must use finished dimensions for product sizing and canvas dimensions for SVG viewport mapping. Do not double-save export history. Browser request ordering/cancellation and the full export confirmation flow are frontend work. K2 helpers are independent of the legacy Cake Topper path.

## 13. Performance metrics

`scripts/bench_keychain.py --keychain --assert-budgets --check-fixtures --iterations 20 --output docs/qa/keychain-k2-benchmark.json` enforces convergence, warm preview API p95 <=150 ms, cold cache <=800 ms and export <=1500 ms across 22 recipes. The API metric includes routing, response validation, JSON and in-process TestClient overhead; it excludes actual browser/network latency. Before each recipe parsed-font/raw glyph caches are cleared, followed by 20 warm previews and one full service export. Export measurements include PNG. Final post-PNG-fix numbers are recorded below.

Final post-PNG-fix run completed at 20:44:15 UTC / Europe/London, exit 0, budget gate PASS. All 22 recipes converged at 60 mm and returned zero production-check errors. All PNGs used composited Pillow layers.

| Metric | Worst observed | Budget |
|---|---:|---:|
| Warm preview service p95 | 79.081 ms | 150 ms |
| Warm preview API round-trip p95 | 81.299 ms | 150 ms (stricter in-process check) |
| Cold parsed-font/glyph-cache API preview | 83.489 ms | 800 ms |
| One full SVG + PNG service export per case | 113.569 ms | 1500 ms |

Satisfy / Maximilian is the slowest warm preview case. There are 440 measured warm API requests and 22 export samples. This is a local diagnostic corpus, not a browser latency or manufacturing guarantee. The first timing run was replaced after correcting PNG composition so the stored report represents the final implementation.

## 14. Documentation updated

README, architecture overview, LightBurn export specification, Keychain implementation plan, phase index, ADR-006, QA matrix, benchmark evidence, deployment log and this handoff. No governance files changed.

## 15. Git information

Branch: `main`. Base: `869599e` (K1 and its deployment log). Milestone commit: `feat(keychain): add keychain engine validation and API`. No remote push or release tag.

## 16. Deployment information

Source and local validation only; no production server restart. New routes become available when the backend next loads this source. Rollback: revert the K2 implementation commit. Keychain history is separate and can remain as data; no existing data migration occurred.

## 17. Recommendations for next phase

K3 builds the Keychain tab using these API models, request IDs, glyph metadata and checks. Preserve state on tab changes, debounce/cancel stale previews and keep the last good result visible. Display finished size, but map overlays using canvas dimensions/viewBox. Export already persists history. Keep the Cake Topper feature unchanged. K4 supplies advanced editing/history UX; K5 completes interactive fixes, accessibility, LightBurn and manufacturing QA. Stop and report at the milestone boundary.
