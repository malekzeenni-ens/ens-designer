# Keychain QA matrix

Date: 2026-11-09. Status: K2 backend verified; K3 UI and K5 LightBurn/operator checks pending.

| ID | Scenario | Expected result | Evidence / status |
|---|---|---|---|
| KC-01 | Sarah in script, display and serif; width/height 30/60/90 mm | Finished size within 0.05 mm; uniform text aspect ratio | Automated: `test_keychain_engine.py` |
| KC-02 | Target smaller than ring/backing minimum | `KC-SIZE-MIN`, non-converged result, actionable minimum | Automated |
| KC-03 | Opposing per-letter translations | Find feasible scale rather than falsely treating tiny-text extent as the minimum | Automated |
| KC-04 | O/B/e backing, counters on/off | Solid body when on, actual interior cut-outs when off | Automated |
| KC-05 | Narrow notch with smoothing | Notch closes; convex straight offset stays within 0.02 mm | Automated |
| KC-06 | Six ring positions, ring dragged 30 mm away | Snap to body; actual ring boundary chord neck >= 5 mm; auto-snap off reports disconnected ring | Automated |
| KC-07 | 5 mm hole at finished widths 30/60/90 mm | Actual exported hole contours within 0.01 mm; no ring/hole scaling | Automated: SVG contour measurements |
| KC-08 | Script/display i/j dots | Vertical overlap 25% ± tolerance; actual body/dot intersection; manual offsets still apply after joining | Automated |
| KC-09 | ë and Arabic diacritics | i/j auto-join does not move other diacritics | Automated |
| KC-10 | Glyph scaling/rotation/translation | Control-point types unchanged; final mm offsets stable at different scales | Automated |
| KC-11 | fifi ligatures and Arabic clusters | Correct cluster text in glyph metadata; no character-index guessing | Automated |
| KC-12 | Unsupported symbols | Warning for partial text; clear 400 when nothing can render | Automated |
| KC-13 | Every production check | One passing case and failing case for each of 11 IDs | Automated: `test_keychain_validation.py` |
| KC-14 | Preview request with export quality | Route forces preview; no PNG function call, files or history writes | Automated: `test_keychain_api.py` |
| KC-15 | Engraved export | Valid SVG 1.1; black/red named groups; Q/C text; recipe round-trip | Automated |
| KC-16 | Layered separate exports | Same canvas/viewBox/origin; separate backing/text groups; recipe in both | Automated |
| KC-17 | Canvas dimensions | Finished design 60 mm, artboard 64 mm, 2 mm margin per side | Automated |
| KC-18 | PNG alpha and counters | Transparent exterior/hole; text counters reveal solid backing | Automated pixel checks; local sample visually inspected |
| KC-19 | User text includes XML syntax or control chars | Comments/metadata remain valid XML; illegal control chars rejected with 422 | Automated |
| KC-20 | Export/history append/reload | One automatic entry per export; explicit import endpoint; newest first; Cake Topper file unchanged | Automated |
| KC-21 | Malformed history | Invalid rows skipped; valid recipes returned | Automated |
| KC-22 | Bad ranges, missing font, internal exception | 422 input ranges, clear 400 font/index error, generic 400 unexpected errors | Automated |
| KC-23 | Existing compiled frontend mounted | New API routes take precedence over static mount | Automated |
| KC-24 | Eight concurrent requests | Deterministic SVG and dimensions; shared glyph/font caches remain safe | Automated |
| KC-25 | 22-case preview/export corpus | Preview API p95 <=150 ms, cold <=800 ms, export <=1500 ms; convergence | `keychain-k2-benchmark.json`; 20 warm previews per case, budget gate enforced |
| KC-26 | Existing Cake Topper | Three golden SVGs byte-identical; existing full regression suite passes | Automated: 325 backend tests, 63 frontend tests |
| KC-27 | Keychain tab, state preservation, keyboard, live request ordering | Complete operator journey | Pending K3–K5 |
| KC-28 | LightBurn import and colour mapping | Separate physical layers, selected geometry size within 0.1 mm, no repairs | Pending K5 manual validation |
| KC-29 | Actual material cut | Neck strength, minimum-feature quality and assembled Layered product | Pending manufacturing validation; automated warnings are not physical certification |

Performance evidence is local FastAPI/TestClient and service measurement, not browser/network latency. Cairo native libraries are unavailable; exports use the existing Pillow drawing functions with K2 layer compositing. The HTML UI is unchanged in K2. Samples under `keychain-k2-samples/` are review artifacts, not replacements for the K0 golden fixtures.
