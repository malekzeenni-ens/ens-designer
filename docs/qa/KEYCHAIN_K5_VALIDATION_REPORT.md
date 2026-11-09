# Keychain K5 validation report

Date: 2026-11-09 (Europe/London). Implementation commit `57ae14f` on `main` (baseline `dea68fe`). No push or tag.

**Verdict: Implementation and automated checks complete. Browser validation is largely complete with listed gaps. LightBurn and physical-cut validation are pending.** Not "K5 fully verified".

**R1 correction:** This is a historical K5 report. The later review found a missed P0: overlapping Layered per-glyph cut paths. R1 welds `CUT_TEXT` into compound polylines and checks actual cut-contour overlap; engraved `ENGRAVE_TEXT` alone retains the unbuffered Q/C contract. The Layered “Q/C kept” observation below describes the old output, not the accepted R1 contract. All six regenerated sample sets pass the stronger validator. R1 has 374 backend / 134 frontend tests passing, but its warm-preview performance gate remains open. See [R1 register](CODE_REVIEW_R1_REGISTER.md) and [handoff](../handoffs/code-review-fixes-r1-handoff.md). No new LightBurn or physical acceptance is claimed.

## 1. Environment

| Item | Value |
|---|---|
| OS | Windows 11 Home 10.0.26300 |
| Python | `.venv313`; shapely/uharfbuzz/fontTools/fastapi import OK |
| Browser | Chrome 156.0.0.0, DPR 1, 1920×945 viewport; responsive checks in same-origin iframes at 1000 px and 390 px. Window resize was refused because the window is maximised |
| App under test | `scripts/keychain_qa_server.py`, `127.0.0.1:8012`, compiled `frontend/dist` (`index-*.js` rebuilt after the final fixes), history isolated in `%TEMP%\ens-k5-qa-data` |
| PNG renderer | Pillow composited fallback (`libcairo-2` not found) |
| LightBurn | LightBurn Core 2.1.03 installed and running with the owner's unsaved document; not used (see §6) |

The existing 8010 and 8011 processes were not restarted. They now serve the rebuilt frontend from the old backend process. The new frontend tolerates the older response (new fields are optional), but restart 8010 to load the K5 backend fixes.

## 2. Commands and results

| Command | Result |
|---|---|
| `python -m pytest -q` (baseline) | 325 passed, 1 known Starlette/httpx warning |
| `npm.cmd run test` (baseline) | 22 files / 91 tests passed |
| `python -m pytest -q` (final) | **332 passed**, same single warning (`logs/keychain-k5-backend-tests.log`) |
| `npm.cmd run test` (final) | **24 files / 115 tests passed**, exit 0; known JSDOM navigation notice only |
| `npm.cmd run build` | TypeScript + Vite passed; 418.4 kB JS / 127.0 kB gzip, 111.5 kB CSS |
| `bench_keychain.py --check-fixtures --fixtures-only` | Golden SVGs 3/3 byte-identical |
| `bench_keychain.py --keychain --assert-budgets --check-fixtures --iterations 20 --output docs/qa/keychain-k5-benchmark.json` | Budget gate PASS |
| `scripts/keychain_validate_exports.py --out docs/qa/keychain-k5-evidence/samples` | 6/6 cases PASS |
| `git diff --check` | Clean |

## 3. Performance (`keychain-k5-benchmark.json`)

22 cases, 20 warm previews each, cold parsed-font/glyph caches before each case. In-process FastAPI TestClient; no browser or network latency.

| Measure | Budget | K5 worst | K2 worst |
|---|---:|---:|---:|
| Warm preview service p95 | ≤150 ms | 97.9 ms (Maximilian, script) | 79.1 ms |
| Warm API round trip p95 | ≤150 ms | 100.2 ms | 81.3 ms |
| Cold-cache API preview | ≤800 ms | 138.0 ms | 83.5 ms |
| Full SVG + PNG export | ≤1500 ms | 122.9 ms (fifi) | 113.6 ms |

All 22 converged with zero production errors. Every stage slowed by a similar 10–15%, including stages K5 did not change (size solve, SVG assembly). That points to machine load during the run (Chrome, three app servers, Dropbox sync), not to K5 code. The validation stage itself rose by ≈1–2 ms.

**Browser timings were not measured** (tab interactive time, edit-to-current-preview p95, drag frame rate). The ghost still moves by direct DOM transform with no request per pointer move (code unchanged; one preview per release was observed).

## 4. Browser matrix (Chrome 156)

| Brief § | Case | Result |
|---|---|---|
| A1–A2 | Fresh Keychain tab, focus on name, default font, greyed placeholder, exports disabled | Pass: recommended Manual Font, visible focus ring, all three export buttons `disabled` |
| A3–A4 | Type Sarah: live preview, exports enabled only when current; 60 mm width, ring, black/red, 0 errors | Pass (60.0 × 35.0 mm, 9 passed) |
| B | Font hover/keyboard listbox, style/support filters, name corpus | **Not browser-verified** (JSDOM only) |
| C | Physical settings | Partial: unit change, ring snap toggle, X offset −40 mm via keyboard, Layered + separate. Other C cases JSDOM only |
| D1–D2 | Real ring drag 100%; real ring drag in 390 px letterboxed layout; letter drag at 200% | Pass. Measured 7.64 vs 7.58 mm and 1.364 vs 1.392 mm (within one screenshot pixel); orthogonal axis unchanged; ghost hidden after release |
| D3 | Release outside / cancel / Escape / tab switch mid-drag | **Not browser-verified** |
| D6 | View filters, zoom, highlight alignment | Pass at 100%/200% and Text view |
| E | Undo of a fix (Ctrl+Z) | Pass; found K5-010 (fixed) |
| F4 | Errors require confirmation, Cancel → no export | Pass (history unchanged) |
| F5 | Export-only errors | Automated only (cannot force divergence on the real backend) |
| F6 | Double export | Chrome: 3 exports → 3 history rows; JSDOM double-click test |
| F7 | Downloads | Real code path captured in page (Blob + filename): PNG 512×312 with transparent corner; separate SVGs share 64.000 × 38.956 mm canvas/viewBox, `CUT_BACKING` / `CUT_TEXT`, Q/C kept, no hit paths. **OS file save not verified** (K5-014) |
| F8 | Modal focus trap, Escape, focus return, shortcuts blocked | Pass with real key events |
| — | Dark and bright appearance; 1000 px and 390 px layouts | Pass: no horizontal scroll or overflowing element; stage stacks above controls |
| — | Narrow DPI/browser zoom, 50%/300% preview zoom | **Not tested** |

Screenshots: `docs/qa/keychain-k5-evidence/browser-*.jpg`. Two earlier screenshots, dark desktop with the problem highlight and the modal, were viewed during testing, but the saves failed.

## 5. Export file validation (written files)

`scripts/keychain_validate_exports.py` writes and re-reads each file. Report: `keychain-k5-evidence/samples/validation-report.json`.

| Case | Measured finished size | Canvas | Hole | Layers |
|---|---|---|---|---|
| 01 engraved default Sarah | 60.000 × 34.601 | 64 × 38.601 | 5.0 mm | CUT_BACKING / ENGRAVE_TEXT |
| 02 Mini Charm Ali | 40.000 wide | 44 × 38.793 | 4.0 mm | engraved |
| 03 Bag Tag Maximilian (offset 4) | 90.000 wide | 94 × 41.137 | 6.0 mm | engraved |
| 04 Layered combined Jo, #1E3A8A / #F59E0B | 60.000 wide | 64 × 69.402 | 5.0 mm | CUT_BACKING / CUT_TEXT, custom colours present in PNG |
| 05 Layered separate Sarah | 60.000 wide | 64 × 38.601 (both files) | 5.0 mm | backing file + text file |
| 06 Height 30 mm Bee | 30.000 high | 34.764 × 34 | 5.0 mm | engraved |

Each case checks:
* size within 0.05 mm, 2 mm margin on every side, and mm width/height equal to the viewBox;
* exactly one circular inner contour of the hole diameter (±0.01 mm), one outer contour and no duplicate contours;
* nonzero fill with opposite winding, groups and Q/C curves;
* no preview hit paths;
* recipe metadata round-trips to the same request;
* PNG exterior and hole centre alpha 0.

## 6. LightBurn — pending

LightBurn Core 2.1.03 is open with the owner's unsaved document (`random-stuff *`, K40+ profile). LightBurn holds one document at a time, so importing would modify unsaved work, and opening a new document risks discarding it. Nothing was done in LightBurn. No pass is inferred from the SVG parser.

Operator steps: `keychain-k5-evidence/OPERATOR_CHECKLIST.md`.

## 7. Physical cut — pending

Sample files and the checklist are prepared. No machine settings were chosen and no laser was operated. Manufacturing acceptance requires operator results.
