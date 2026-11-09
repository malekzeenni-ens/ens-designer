# Code review fixes — implementation plan (R1)

**Prepared:** 9 November 2026, Europe/London. **Baseline:** `main` at `303fc3d` (K5 docs) / `57ae14f` (K5 code).
**Source:** independent read-only review of the Designer (Cake Topper) and Keychain code, delivered after K5. Finding IDs F1–F14 come from that review.
**Authority:** the owner asked for these fixes to be implemented. Local code changes, tests, builds and local commits are authorised. Do not push, tag, deploy, restart the owner's 8010/8011 servers, open LightBurn or operate the laser.

## 0. Ground rules

- Read the code before changing it. The review gives line numbers from `303fc3d`; they may drift. Reproduce each defect, or write a failing test, **before** fixing it, and record actual versus expected behaviour.
- Fix at the smallest correct layer. Do not redesign the Designer layout, the Keychain workspace or shared components beyond what a fix needs.
- **Cake Topper golden SVGs** (`tests/fixtures/keychain_baseline/*.svg`) must stay byte-identical. Never regenerate them or their hashes. If a fix would change them, stop and record why rather than updating fixtures.
- Preserve the existing Keychain contracts from K0–K5, especially: finished size includes the ring, a 2 mm canvas margin, physical ring/hole sizes, the export endpoint as the only history writer, and export confirmation for errors. One contract is deliberately changed (decision D1 below).
- Use `.venv313`. Run commands from the repository root in PowerShell. Capture logs with `cmd.exe /d /c "... > logs\<name>.log 2>&1"` and check the real exit code.
- Use generic names in tests and fixtures (Sarah, Ali, Jo, Zoë, Maximilian). Use temporary roots for anything touching history; never touch `backend/data/*.json`.

### Decision D1 — Layered cut text is welded geometry

The K2–K5 rule "unbuffered text keeps original Q/C Béziers in production SVGs" produced F1: overlapping per-letter **cut** contours in Layered exports. A laser cuts every contour, so a joined script name falls apart.

From R1:
- The Layered `CUT_TEXT` layer (combined and separate files) is exported from the **merged (unioned) text geometry** as compound polylines at export tolerance, the same way stroke reinforcement already works.
- Engraved `ENGRAVE_TEXT` keeps the original Q/C Béziers. Overlaps are harmless in a filled engrave.
- Preview hit paths remain per-glyph.

Document this as an intentional contract change in the LightBurn/export specification and the QA matrix.

## 1. Phases and order

Work in this order. Commit after each phase once its tests pass.

| Phase | Findings | Theme | Commit |
|---|---|---|---|
| 1 | F1 | Layered cut file welded + "no overlapping cut contours" guard | `fix(keychain): weld layered cut text into non-overlapping contours` |
| 2 | F5, F10 | Atomic, corruption-safe history; export never fails because of history | `fix(history): atomic corruption-safe history writes` |
| 3 | F2, F3, F4, F12 | Designer preview/export consistency | `fix(designer): discard stale previews and keep export in sync` |
| 4 | F6, F7, F8, F9, F11, F13 | Remaining correctness fixes | `fix: svg comment escaping, font picker preview, marks, filenames` |
| 5 | Efficiency E1–E3 | Performance without behaviour change | `perf: faster cake topper svg assembly and font cache loading` |
| 6 | — | Docs, register, handoff | `docs: record code review fixes R1` |

## 2. Phase 1 — F1: Layered cut text (P0)

**Defect:** `backend/app/keychain_engine.py` (`KeychainService.generate`, around lines 376–385) only replaces `text_paths` with `_compound_paths_from_shapely(text, ...)` when `stroke_buffer_mm` is set. Otherwise the raw per-glyph paths go to `assemble_svg`. In the K5 sample `05-layered-separate-60mm--sarah-keychain-60mm-text.svg`, 3 of 4 neighbouring letter pairs overlap (3.50, 2.83 and 1.46 mm²).

**Implementation:**
1. In `generate`, when `request.style == "layered"`, build the text layer from `text` (the welded shapely geometry already used for checks and PNG): `text_paths = _compound_paths_from_shapely(text, "KC-TEXT")`, then translate it. Keep `hit_paths` per glyph. Engraved keeps the current path.
2. Preview quality may use the same welded path for Layered, so preview and export match. Confirm the preview cost stays within budget.
3. Check the precision of the welded export. `prepare_text` uses `tolerance = .02/…` for export. Confirm that the deviation of the welded contour from the true outline is ≤0.05 mm at 30, 60 and 90 mm. If it isn't, tighten the export tolerance for Layered only and re-benchmark.
4. Add a production guard. In `validate_keychain`, or as a post-assembly check on the exported paths, verify that the cut text layer has no overlapping contours.
   - Failing it is an **error**.
   - With D1 this should always pass. It exists to catch regressions.
   - Prefer checking the actual exported path data over the shapely input.

**Tests (write first; they must fail on the current code):**
- `tests/test_keychain_k5_fixes.py`, or a new `tests/test_keychain_r1.py`: for Sarah (Satisfy), fifi, Maximilian and an Arabic name, Layered combined and separate:
  - Parse `CUT_TEXT` paths from the export SVG and convert them to polygons. There must be no pairwise intersection with area > 1e-6 mm².
  - The union area must equal the `text` geometry area within 0.5%.
- The combined and separate `CUT_TEXT` must be identical.
- Engraved still has Q/C in `ENGRAVE_TEXT`.
- Update `scripts/keychain_validate_exports.py`:
  - change the Q/C check to engraved-only;
  - add a "no overlapping cut contours" check for every cut layer;
  - regenerate `docs/qa/keychain-k5-evidence/samples/` with the new commit (these are evidence samples, not golden fixtures).
- Update the existing test that asserts Q/C in Layered output, if one exists. Change it consciously to match D1 and say so in the commit message. Do not delete coverage.

**Acceptance:**
- No overlapping cut contours in any Layered export.
- PNG unchanged in appearance.
- Golden Cake Topper SVGs byte-identical.
- Keychain benchmark gate passes.

## 3. Phase 2 — F5, F10: History integrity (P1)

**Defects:**
- `backend/app/history_store.py`: `_read` returns `[]` on `JSONDecodeError`/`OSError`, and `_write` truncates in place. A torn or locked file (Dropbox, antivirus) therefore makes the next `add` replace all history with one entry. `list()` reads without the lock. Used by both Cake Topper and `keychain_history.py`.
- `backend/app/api/routes/keychain.py` `_generate`: the history write happens inside the generation `try`, so a history failure turns a successful export into "Keychain generation failed.". Unexpected exceptions are returned as 400.

**Implementation:**
1. **Atomic write:** write to a sibling temporary file in the same directory, flush, `os.fsync`, then `os.replace`. Retry `os.replace` a few times with a short back-off for Windows sharing violations (PermissionError). Clean up the temporary file on failure.
2. **Corruption-safe read:**
   - Distinguish "file missing" (→ `[]`) from "unreadable/corrupt".
   - On `JSONDecodeError`, move the corrupt file aside to `<name>.corrupt-<UTC timestamp>.json`, log an error, then start a new list. The old data must never be overwritten in place.
   - On `OSError` (locked), retry briefly. If it is still failing, raise a specific `HistoryUnavailableError`; `add` must not write.
3. **Locked reads:** `list()` reads under the lock; this applies to the `KeychainHistoryStore` override too.
4. **Keychain route:**
   - Generate first.
   - Then attempt the history write in its own `try`. On failure, log it, still return the export, and set a response warning that the frontend shows in the notice. The additive `KeychainResponse` field could be `history_saved: bool = True` plus `warnings: list[str]`.
   - Keep `ValueError` → 400. Return **500** with a generic message for unexpected errors.
   - Check the frontend still shows a useful message for 500 (`keychainApi.read`).
5. Apply the same history-failure tolerance to any Cake Topper route that writes history automatically, if one exists. Check the routes first.

**Tests:**
- Corrupt JSON file → `add` preserves a `.corrupt-*` backup containing the original bytes, and the new file is valid.
- Simulated `os.replace` PermissionError (monkeypatch) → the original file is unchanged and an error is raised.
- Concurrent `add` from 8 threads → exactly N entries.
- Keychain export with a history store that raises → 200 with files, `history_saved` false and a warning.
- Unexpected engine exception → 500.
- Frontend: when `history_saved === false`, the notice says the file downloaded but history wasn't saved.

## 4. Phase 3 — Designer preview/export consistency (F2, F3, F4, F12)

Files: `frontend/src/components/CakeTopperPanel.tsx`, `frontend/src/components/ExportControls.tsx`, and any Designer hook/service they use. Follow the Keychain `useKeychainPreview` pattern, but do **not** restructure the whole panel (the reducer migration is out of scope; see §8).

**F2 — Base size silently reset to 42 mm:**
- `initLine(fontId, overlapMm, numGaps)` sets `fontSizeMm: DEFAULT_SIZE` and `overlapMode: DEFAULT_OVERLAP`. Pass the current `defaultSize` and `defaultOverlap`, from the values used for that generation (the `callApi` arguments, not stale state).
- Test: set Base size to 60, Generate, then make any line edit. The next request's line configs carry 60 mm.

**F3 — Stale responses and export of stale results:**
1. Add a request sequence ref and an `AbortController` to `callApi`. Ignore any response whose sequence isn't the latest. Clear `loading` only for the latest request.
2. Debounce rapid numeric and drag-driven regenerations (≈150 ms). Keep a single regeneration on discrete actions.
3. Track the inputs of the result: store a key for the request that produced `result`, and compute `current = !loading && resultKey === currentKey`.
4. In `ExportControls`, disable export unless the result is current, and show a short "Updating…" or "Regenerate to export" hint.
5. Text edits that clear the result must not be undone by an in-flight response; the sequence guard covers this. Add a test.

**F4 — Base font/size changes after Generate ignored:** after Generate, changing Base font or Base size must regenerate (re-initialising line states with the new font/size, the same as a fresh Generate) or mark the result stale with export disabled. Prefer regenerating, since it matches the live-preview expectation. Make sure per-line font overrides the user set explicitly are not silently discarded without notice; if they are reset, say so in the UI.

**F12 — Download robustness:** `ExportControls` revokes the object URL immediately and never attaches the anchor. Reuse one shared download helper; move `downloadBlob` from `features/keychain/services/keychainApi.ts` to a shared `frontend/src/services/download.ts` and import it in both places.

**Tests** (Vitest + JSDOM, following `k5Hardening.test.tsx`):
- Out-of-order responses: a slower first response must not replace a faster second one.
- Export is disabled while loading and after any input change until the new result arrives.
- Base size 60 survives line edits.
- A Base font change after Generate updates the request font.
- An in-flight response after a text change is discarded.

**Acceptance:** all existing Designer tests still pass; no Designer layout changes beyond a disabled state or hint.

## 5. Phase 4 — Remaining correctness (F6, F7, F8, F9, F11, F13)

- **F6 — XML comment injection (Cake Topper):**
  - `backend/app/cake_topper_engine.py` around lines 577–593 writes user words into `<!-- ... -->` unescaped. Sanitise as `keychain_svg.py` does: replace `--` (e.g. with `- -` or an en dash), strip a trailing `-`, and remove control characters.
  - Tests: `Anne--Marie` and `x--><g/>` produce SVG that `xml.etree` parses, with no injected element.
  - Verify the golden SVGs stay byte-identical (their words contain no `--`).
- **F7 — Font picker leaves hover preview active:**
  - In `frontend/src/components/FontPicker.tsx`, toggling the trigger closed must go through the same `close()` path that calls `onPreview(null)`.
  - In `KeychainTab`, also require `!hoverFont` (or hover equal to the committed font) before applying fixes and accepting drags, so the hovered-font result can't be edited.
  - Test both. Verify the Designer's default use of `FontPicker` (without `onPreview`) is unchanged.
- **F8 — Only one floating mark moves:**
  - `keychain_engine.py` `text_at` applies a manual offset to `prepared.floats[pid][0]` only. Apply the offset to every floating sub-path of that glyph (all marks move together), in both the path and the shapely geometry.
  - Test with Zoë (Lora): both umlaut dots move by the offset, and the body doesn't.
  - Make sure the auto-join behaviour for i/j is unchanged.
- **F9 — Pointer cancel commits a drag (Designer):** in `frontend/src/components/PreviewPanel.tsx`, `pointercancel` and `lostpointercapture` must discard the drag, not call the move/commit handler. Test: pointerdown, move, pointercancel → no update callback.
- **F11 — Filenames lose accented letters:**
  - `_safe_filename` in `backend/app/overlap_helpers.py` drops non-ASCII. Transliterate with NFKD and remove combining marks, so Zoë becomes `zoe`.
  - For scripts with no ASCII equivalent (Arabic), keep a stable fallback plus a short hash of the text, so different names don't collide.
  - This helper is shared with Cake Topper. Golden fixtures don't depend on filenames, but check every caller and test.
  - Tests: Zoë → `zoe…`; Zoë and Zoé differ only if the hash is used; two different Arabic names produce different filenames.
- **F13 — TTFont handle leak:** in `backend/app/api/routes/fonts.py` around lines 178–195, use `with TTFont(...)` or `try/finally: font.close()`. Test with a malformed font file in a temporary root: the file can be deleted afterwards on Windows.

## 6. Phase 5 — Efficiency (no behaviour change)

- **E1 — svgwrite debug validation:** `cake_topper_engine.py` creates `svgwrite.Drawing(...)` with default `debug=True`. Set `debug=False`.
  - Measure before and after with `scripts/bench_keychain.py --check-fixtures` (fixtures-only plus a timing sample) or a small timing script. The golden SVGs **must** remain byte-identical.
  - Do the same for `svg_exporter.py` if it is on a hot path.
- **E2 — Font parsing under the global lock:** `backend/app/font_cache.py` `get_loaded_font` parses `TTFont` while holding the global lock. Parse outside the lock with a per-path in-flight guard (a per-key lock or future) so two threads don't parse the same font twice, then insert under the lock. Existing concurrency tests must pass; add one with two different cold fonts loaded in parallel.
- **E3 — Keychain keyboard listener churn:** in `KeychainTab.tsx`, the `useEffect` without dependencies re-registers the window keydown listener on every render. Use a ref to the latest handler and register once per `active`. Existing keyboard tests must pass.

Report before/after numbers. Don't trade correctness for speed.

## 7. Phase 6 — Verification and documentation

Run and record:

```powershell
.\.venv313\Scripts\python.exe -m pytest -q
Push-Location frontend; cmd.exe /d /c "npm.cmd run test > ..\logs\r1-frontend-tests.log 2>&1"; $LASTEXITCODE; cmd.exe /d /c "npm.cmd run build > ..\logs\r1-build.log 2>&1"; $LASTEXITCODE; Pop-Location
.\.venv313\Scripts\python.exe scripts/bench_keychain.py --check-fixtures --fixtures-only
.\.venv313\Scripts\python.exe scripts/bench_keychain.py --keychain --assert-budgets --check-fixtures --iterations 20 --output docs/qa/keychain-r1-benchmark.json
.\.venv313\Scripts\python.exe scripts/keychain_validate_exports.py --out docs/qa/keychain-k5-evidence/samples
git diff --check
```

Optional browser smoke: start an isolated server with `scripts/keychain_qa_server.py --port 8013 --data-root <new temp folder>` (never 8010/8011). Check a Layered export, the Designer's stale-export disabling and the Base size fix. Stop only that process, verifying its PID and command line first. Do not trigger real browser downloads: Chrome's download folder on this machine is a customer order folder.

Documentation:
- Create `docs/qa/CODE_REVIEW_R1_REGISTER.md` with one entry per finding: reproduction, root cause, fix, files, regression test, retest result and status.
- Create the handoff `docs/handoffs/code-review-fixes-r1-handoff.md`, following `docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md`.
- Update `docs/qa/KEYCHAIN_QA_MATRIX.md` (Layered cut-contour row, D1), `docs/architecture/LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md` (D1), `docs/qa/KEYCHAIN_K5_DEFECT_REGISTER.md` (add a note that F1 was a P0 missed by K5 validation, now fixed), `docs/deployment-log.md` and the README changelog line.
- Do not edit `docs/governance/*`.

## 8. Out of scope (recommend only)

- Migrating the Cake Topper panel to a single design reducer with undo/redo.
- A server-side "fonts supporting text" endpoint (about 53 MB is downloaded on the first run of the support filter).
- Cairo PNG resolution parity (F14; Cairo isn't installed).
- Dead-code removal (`OverlapPanel`, `FontSelector`, `TextInput`, `ValidationPanel`, `MaterialSelector`, unused API helpers, `POST /api/keychain/history`).
- K5-013 notice layout shift.
- Keychain export manifest.

List these as recommendations in the handoff.

## 9. Definition of done

- F1–F13 (excluding F14) each fixed with a regression test that failed before the fix, or explicitly documented with a reason if a fix proved unsafe.
- Full backend and frontend suites, the build, golden parity, the Keychain budget gate and the export validator (with the new overlap check) all pass.
- Phase commits, plus a docs commit, are made locally on `main`. No push.
- The final report lists commits, tests and counts, benchmark before/after, anything not fixed and why, and the manual checks still pending (LightBurn, physical cut — the Layered samples need re-cutting after D1).
