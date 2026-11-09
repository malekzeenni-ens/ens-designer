# ADR-006: Keychain engine and performance foundations

## Status

Accepted for the phased Keychain workstream on 2026-11-09. K1 delivers shared foundations; the new engine/API and UI remain K2/K3 work.

## Context

The REA review identified useful live editing behaviour in vectorsfile.com. EnS must preserve whole-word HarfBuzz shaping, Bézier text outlines, physical dimensions and structural validation. K0 captured exact Cake Topper SVGs and measured the existing PNG-inclusive pipeline. Shaping and extraction repeatedly reopen fonts, while SVG assembly and PNG also consume time.

## Decisions

1. Keep geometry on the Python backend. A dedicated Keychain engine will compose existing geometry modules, rather than copying them or implementing another geometry engine in the browser.
2. Cache parsed fonts in a process-local LRU of 32 entries, keyed by resolved path, nanosecond modification time and file size. HarfBuzz and FontTools parse the same byte snapshot. Each font has an RLock covering shaping, FontTools reads and glyph drawing. Cold inserts have a shared lock.
3. Make `loaded=` optional on shaping and extraction, keeping uncached callers unchanged. Cake Topper adopts cached fonts only with exact golden parity. Upload/delete routes invalidate the cache. Eviction drops cache ownership without closing a snapshot still used by an active request; parsing from BytesIO avoids persistent OS file handles.
4. Add a bounded raw glyph cache (512 per loaded font), before scaling/positioning, for K2. Return independent command copies so edits cannot corrupt later requests. Cake Topper continues its original outline draw arithmetic using the parsed-font cache.
5. Extract ring, neck, stroke-buffer and compound-path helpers without changing their function bodies. Cake Topper imports the existing private names as aliases. Its ring positioning and warning behaviour remain unchanged. New auto-snap logic belongs in K2.
6. Make history filenames configurable while retaining the default Cake Topper filename and entry model. K2 supplies its own Keychain history schema/store without changing existing history data.
7. Add optional curve tolerance to `path_to_shapely`. None keeps the exact 8/12-step quadratic/cubic path. A positive finite tolerance uses a conservative control-polygon interpolation bound, clamped to 4–64 steps. The cap bounds work; extreme curves can exceed the requested tolerance at 64 steps and require K2 validation at physical scale.
8. Preserve uniform text scaling in K2; ring and hole dimensions remain physical. Keychain request models are additive. The frontend is an isolated feature module reusing the font picker.

## Measurement and alternatives

Measure cached and uncached calls alternately in the same process, counterbalancing order, with identical geometry and PNG renderer. Save raw samples and p50/p95 stage timings. Keep the K0 report unchanged. Assess K1 by measured font-stage and warm-path improvement; evaluate the 150 ms server-preview target with K2's PNG-free endpoint. Keep the current Pillow fallback during this comparison; installing Cairo is separate environment work.

Rejected for now: browser/WASM geometry, changing ring semantics during extraction, replacing the renderer during benchmarking, and adding pyclipper before measuring the new pipeline. Reconsider the server strategy only if the K2 preview endpoint fails its budget; record that choice in a new ADR.

## Consequences

Existing engine callers remain compatible. Cache memory is bounded but fonts in active requests can temporarily outlive eviction. Concurrent operations on one font serialize briefly for library safety. A 32-entry font working set can churn; benchmark before changing limits. SVG assembly/PNG costs remain outside the font-cache improvement. Golden fixture bytes and existing Cake Topper tests are release gates.

## K2 implementation note (2026-11-09)

The dedicated engine/API is implemented. It reuses raw glyph outlines and flattened reference geometry, applies physical edits after scaling, and exposes finished dimensions separately from the margin-inclusive SVG canvas. A guarded six-step root solve has a bounded minimum-search fallback for opposing physical translations, where size need not be monotonic near zero. Ring snapping verifies an actual ring/backing boundary chord before reporting the neck width. SVG assembly disables svgwrite debug validation and verifies output XML in tests. Production SVGs preserve unbuffered text curves; explicit stroke reinforcement emits the buffered silhouette.

PNG export uses Cairo when available. The Pillow fallback reuses the existing path drawing on independent layers and alpha-composites them so text counters reveal the backing. It rasterises unioned text geometry to preserve auto-joined dots. Existing Cake Topper rendering is unchanged. Export history is saved once by the export route, with an explicit save/import endpoint available separately. The 22-case preview corpus passes the 150 ms p95 gate; no browser/WASM engine change is needed. See the K2 handoff and QA matrix for evidence and pending LightBurn validation.
