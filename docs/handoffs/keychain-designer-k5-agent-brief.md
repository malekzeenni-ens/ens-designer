# Keychain Designer K5 — Coding Agent Execution Brief

**Prepared:** 9 November 2026, Europe/London

**Project:** EnS Designer, Etch N Shine

**Purpose:** Give this document to the coding agent that will complete K5, investigate the existing implementation, fix open and newly discovered defects, and provide evidence of the final result.

> This is an execution brief, not a request for another proposal. K0–K4 are implemented. You are authorised to carry out K5, finish its missing implementation, and fix defects you reproduce within the Keychain feature and its necessary integration points. Do not stop after producing a test plan or defect list. Continue through implementation, regression testing, documentation and local commits. Report manual checks that cannot be completed honestly and specifically.

## 1. Objective and scope

Complete the Keychain Designer's testing and hardening milestone so an operator can reliably create, edit, export and reload production designs.

K5 includes implementation as well as testing. In particular, **production-check Fix buttons and canvas problem highlights have not been implemented yet**. They must be completed, not merely listed as failed tests.

Your work covers:

1. Review the actual K0–K4 source and establish a fresh baseline.
2. Create a tracked defect register and prioritise findings.
3. Complete production-check fixes, highlighting and accessible modal behaviour.
4. Exercise the real browser interface, not just the API or JSDOM tests.
5. Investigate geometry, editing, concurrency, persistence, rendering and export defects.
6. Fix confirmed defects and add meaningful regression coverage.
7. Measure current performance and compare it with the agreed budgets.
8. Validate SVG import and dimensions in LightBurn when available.
9. Prepare an operator-run physical-cut validation package; record actual results only when supplied or observed.
10. Update QA evidence, handoff and release/deployment notes; commit the completed changes.

Do not expand into batch generation, nesting, decorative backings, backing-free cut-out names, multiple rings, a new client-side geometry engine or an application-wide redesign. Those are later features. Preserve the existing visual language and application workflows.

### Working authority

- The owner has already approved the Keychain implementation and is now handing you K5 with authority to fix defects. Routine reproduction, local code changes, tests, builds, focused refactors and local commits do not need another approval round.
- If older project instructions say to present a plan and await approval, this brief is the approved K5 scope. Write a short execution plan, then proceed.
- Ask only when a material product decision or genuinely unavailable external input is necessary. Continue independent work while waiting.
- Do not publish, push to remotes, create a public deployment or operate laser hardware merely because local validation is authorised.
- Do not weaken acceptance criteria, suppress failures or regenerate golden files to make a regression disappear.

## 2. Repository and current baseline

The original Windows workspace is:

```text
C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer
```

Use the actual checkout path if your environment differs. Commands below assume the repository root and PowerShell unless stated otherwise.

| Item | Last recorded state |
|---|---|
| Branch | `main`; inspect the current branch before working |
| K0 implementation | `e3a481e` — benchmark and three Cake Topper golden SVGs |
| K1 implementation | `63560b5` — cached fonts and shared geometry foundations |
| K2 implementation | `b22c3f2` — Keychain engine, validation, SVG/PNG and history API |
| K3 implementation | `193764c` — dedicated Keychain workspace |
| K4 implementation | `0ffab50` — letter editing, undo/redo, Next name and history |
| K4 documentation | `d7db661` |
| Backend tests | 325 passed |
| Frontend tests | 22 files / 91 tests passed |
| Production build | TypeScript and Vite passed |
| Added runtime packages | None in K0–K4 |
| Browser verification | Not completed; see section 4 |
| LightBurn/material sign-off | Pending |

These counts are historical evidence, not a substitute for running the current checkout. The HEAD may include the documentation commit that adds this brief or subsequent owner changes. Preserve unrelated work. A higher test count after meaningful additions is expected; do not alter tests to match these numbers.

### Required reading

Read applicable `AGENTS.md` instructions and these files before changing code:

- `docs/phases/KEYCHAIN_DESIGNER_IMPLEMENTATION_PLAN.md`
- `docs/phases/KEYCHAIN_DESIGNER_USER_JOURNEY.md`
- `docs/handoffs/keychain-designer-k2-engine-api-handoff.md`
- `docs/handoffs/keychain-designer-k3-workspace-handoff.md`
- `docs/handoffs/keychain-designer-k4-editing-handoff.md`
- `docs/qa/KEYCHAIN_QA_MATRIX.md`
- `docs/adr/ADR-006-KEYCHAIN-ENGINE-AND-PERFORMANCE.md`
- `docs/architecture/LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md`
- `Etch_N_Shine_Universal_Application_Design_System.md`
- `docs/STARTUP.md`
- `docs/governance/CODING_AGENT_MASTER_PROMPT.md`
- `docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md`

Do not edit `docs/governance/*`. The latest implementation plan and handoffs contain corrections to early assumptions; preserve those corrections.

## 3. Product decisions already made

These do not need to be reopened during K5:

| Topic | Decision |
|---|---|
| Workspace | Dedicated Keychain tab immediately after Designer |
| Appearance | Existing Etch N Shine navy/slate/gold system, with dark and bright modes |
| Default style | Engraved |
| Default width | 60 mm finished outer width, including the ring |
| Backing | 3 mm offset, counters filled, 0.5 mm smoothing |
| Ring | Enabled, top-left, 12 mm outer diameter / 5 mm hole, auto-snap on |
| Dots | i/j auto-join on, 25% overlap |
| Material | 3 mm Cast Acrylic |
| Colours | Black backing `#000000`, red text `#FF0000`, configurable |
| Default font | First recommended Manual Font, then first Manual Font, then available library font |
| Presets | Name Keychain 60 mm; Mini Charm 40 mm with 10/4 mm ring; Bag Tag 90 mm with 15/6 mm ring and 4 mm offset |
| Names | Single line, maximum 40 characters; whole-word shaping supports ligatures and Arabic |
| Layered export | One combined SVG by default; two aligned SVGs available |
| Separate downloads | Prepare SVGs, then individually download backing/text files; avoid automatic multi-download blocking |
| Errors | Export requires an explicit Export anyway confirmation; warnings alone do not prevent export |
| Empty name | Greyed placeholder preview; export disabled |
| Units | mm/cm/inches are presentation conversions; physical request values remain mm |
| Undo | 100 steps, typing/control/nudge coalescing; view/zoom/units are presentation preferences |
| Next name | Preserve general production settings; clear name-specific glyph/gap/dot indices and focus the name field |
| Recipe changes | Name/font changes invalidate shaped indices; Undo restores the full previous recipe |
| History | Export endpoint automatically writes one entry; client must not POST a duplicate |
| Missing saved font | Explain why reload cannot proceed; do not silently substitute a different font |

### Critical dimensional contract

- `width_mm` / `height_mm`: finished physical design, including the ring.
- `canvas_width_mm` / `canvas_height_mm`: finished dimensions plus 2 mm margin on every side.
- A 60 mm wide product therefore has a **64 mm SVG canvas**.
- Canvas overlays, pointer mapping and viewBox use canvas dimensions. Product controls, filenames and manufacturing measurements use finished dimensions.
- Ring and hole diameters stay physical; never scale them to achieve the text size target.
- Text scales uniformly. Do not stretch only X or Y.

### Curve and rendering decisions

- Unbuffered text must retain original Q/C Bézier commands in production SVGs.
- Explicit stroke reinforcement intentionally exports a buffered polygon silhouette. Do not file the documented absence of Q/C in that reinforced silhouette as a regression by itself.
- Backing/keyhole output uses compound paths with correct winding and a real hole.
- The Cairo native library was unavailable on the original machine. Keychain PNG export uses Cairo when available, otherwise the **composited Pillow fallback**.
- Keep fallback compositing correct: text counters reveal the solid backing beneath them; they must not erase that backing. The actual ring hole and exterior remain transparent. Auto-joined dots remain filled.
- Do not require installing Cairo merely to finish K5. If testing a different renderer, record it and maintain a valid fallback.

## 4. What has and has not been verified

### Existing evidence

- Backend geometry/API, XML, hole extents, dimensions, isolated history and concurrency have automated coverage.
- Three Cake Topper reference SVGs are byte-identical under date-frozen golden tests.
- Frontend JSDOM tests cover state preservation, stale responses, export confirmation, units, cluster edits, timeline behaviour, Next name and history reload.
- A K2 PNG/SVG sample was inspected visually; samples are in `docs/qa/keychain-k2-samples/`.
- K4's local HTTP smoke returned a 60 mm product / 64 mm canvas, echoed the request ID and returned no PNG/files for preview.

### Missing browser evidence

During K3, the browser access host was unavailable. Native Chrome automation subsequently stopped because Computer Use could not confidently determine the current browser URL. No further browser automation was attempted.

Consequently, **the actual K3/K4 browser UI has not received a visual or interaction sign-off**. Build success and JSDOM tests do not prove layout, pointer capture, drag accuracy, font loading, download behaviour or focus management in Chrome.

Use supported browser automation available in your environment and respect its access/policy constraints. Do not bypass a denied browser action through another input mechanism. If browser access remains unavailable, finish all independent code and automated work, record exactly which browser cases remain unverified, and provide a concise operator checklist. Do not claim K5 fully verified.

LightBurn may have an existing user document open. Use a new test document or isolated copy; do not overwrite or discard the user's work.

## 5. Architecture and source map

### Frontend

| Path | Responsibility |
|---|---|
| `frontend/src/App.tsx` | Workspace navigation and React Activity boundaries |
| `frontend/src/features/keychain/state/keychainTypes.ts` | Editable settings, API types and defaults |
| `frontend/src/features/keychain/state/keychainReducer.ts` | Pure design actions, recipe conversion, physical move deltas |
| `frontend/src/features/keychain/state/useUndoRedo.ts` | 100-step timeline, grouping and font hydration |
| `frontend/src/features/keychain/hooks/useKeychainPreview.ts` | Debounce, abort, request IDs, last-good result and export currency |
| `frontend/src/features/keychain/services/keychainApi.ts` | Preview/export/history calls and downloads |
| `frontend/src/features/keychain/utils/units.ts` | Units and request conversion |
| `frontend/src/features/keychain/components/KeychainTab.tsx` | State orchestration, shortcuts, export/confirmation, Next name |
| `frontend/src/features/keychain/components/KeychainControls.tsx` | Production controls, gaps and material settings |
| `frontend/src/features/keychain/components/Fields.tsx` | Draft numeric input, slider/toggle/section primitives |
| `frontend/src/features/keychain/components/FontSection.tsx` | Adviser-derived badges, style/support filtering |
| `frontend/src/features/keychain/components/KeychainPreview.tsx` | SVG display, hit targets, letter/ring ghost, zoom and coordinates |
| `frontend/src/features/keychain/components/LetterInspector.tsx` | Glyph transforms, dots and reset |
| `frontend/src/features/keychain/components/KeychainHistoryList.tsx` | On-demand history and reload controls |
| `frontend/src/features/keychain/components/ProductionCheckPanel.tsx` | Currently read-only check list; primary K5 completion point |
| `frontend/src/features/keychain/keychain.css` | Scoped feature styling |
| `frontend/src/components/FontPicker.tsx` | Shared picker with optional hover/sample callbacks |
| `frontend/src/components/FontNamePreview.tsx` | Shared lazy/cached browser font-face preview |

Keep changes isolated where practical. Do not redesign `CakeTopperPanel.tsx` or `PreviewPanel.tsx` to implement Keychain fixes.

### Backend

| Path | Responsibility |
|---|---|
| `backend/app/models.py`, Keychain section | Validated settings, response/check/ring/history contracts |
| `backend/app/keychain_engine.py` | Cached outlines, shaping/clusters, layout, sizing, ring, fitted output |
| `backend/app/keychain_validation.py` | Eleven production checks and fix/highlight payloads |
| `backend/app/keychain_svg.py` | Valid SVG groups, hit paths, comments and recipe metadata |
| `backend/app/keychain_png.py` | Cairo or independently composited Pillow layers |
| `backend/app/keychain_history.py` | Isolated history model/store |
| `backend/app/api/routes/keychain.py` | Preview/export/history endpoints and automatic export history write |
| `backend/app/font_cache.py` | Bounded parsed-font/raw-glyph caches and locking |
| `backend/app/ring_geometry.py` | Shared legacy-compatible ring and compound-path helpers |
| `backend/app/floating_component.py` | Existing detection/offset functions plus additive dot join |
| `backend/app/shapely_converter.py` | Legacy default conversion and optional tolerance |
| `backend/app/main.py` | Service/router wiring before static frontend mount |

Current engine details to preserve unless a reproduced defect requires a change:

- One 100 mm reference text representation; size evaluations reuse flattened geometry rather than re-flattening every iteration.
- Physical spacing, manual dot offsets and translations apply after scaling, avoiding previous-request scale drift.
- Ordinary size root solve is bounded to six guarded secant iterations.
- Opposing physical translations may make size non-monotonic near zero; a bounded minimum search handles that case before the root solve.
- Ring neck reporting measures a chord across ring-boundary intersection arcs, rather than assuming nominal overlap proves a safe connection.
- Optional flattening currently caps curve subdivision at 64 segments. This is a known precision limitation to evaluate at final physical scale, not permission to silently accept excessive error.

## 6. Seeded work register

Create `docs/qa/KEYCHAIN_K5_DEFECT_REGISTER.md`. Carry the following entries into it, preserving the distinction between confirmed gaps and investigation targets.

### Confirmed K5 completion gaps

| ID | State | Required work |
|---|---|---|
| K5-001 | Confirmed missing implementation | ProductionCheckPanel displays messages but has no working Fix controls. Complete them. |
| K5-002 | Confirmed missing implementation | Check `highlight_bbox_mm` is not wired to canvas problem highlights or check-to-canvas interaction. Complete it. |
| K5-003 | Confirmed validation gap | Real browser layout/drag/appearance/download walkthrough has not been completed. Obtain evidence. |
| K5-004 | Confirmed implementation gap | Export confirmation uses a custom aria-modal section without an explicit focus trap/return mechanism. Complete and verify actual modal keyboard behaviour. |
| K5-005 | Static logic gap requiring regression reproduction | Export is gated using preview checks; the returned export result's checks are not separately inspected before download. Test differing preview/export outcomes and require confirmation for newly returned export errors. |

For K5-005, the export endpoint already writes history. If an already-generated export requires confirmation, hold that result and confirm its download rather than calling export again and creating duplicate history. Bind confirmation to the exact request/result snapshot; never authorise a different design accidentally.

### Investigation targets — not yet reproduced defects

For these, reproduce and record actual versus expected behaviour before deciding on a fix:

1. **Ring drag after snapping:** nominal request offsets and actual snapped centre can differ. Test for jumps, wrong direction, accumulated drift and no-op drags across all positions and zoom levels.
2. **Coordinate mapping:** test letterboxing, CSS zoom, page scroll, resized preview, DPI/browser zoom, narrow layouts and a long/tall design. Use canvas dimensions, not finished width.
3. **Pointer lifecycle:** release outside canvas, pointer cancellation, lost capture, Escape, tab switch or resize during drag. No unintended edit or stuck ghost.
4. **Out-of-order work:** delayed previews, ignored aborts, font-hover requests, failed font commits and rapid tab switches must never install stale geometry or a stale font.
5. **Editing during export:** change name/style/settings while export is in flight, then test returned files, notices, history and Enter/Next name. An older export must not clear a newer unexported name or mislabel its files.
6. **Duplicate submission:** double-click, repeated Enter and retry after network failure must not produce unintended duplicate export/history writes. Do not add client-side duplicate history POSTs.
7. **Keyboard during stale/error states:** arrow handling currently tests for an existing result, not exclusively a current result. Preserve responsive same-name edits while preventing use of obsolete glyph indices after name/font changes or failed requests.
8. **Checks during updates:** old checks must not look like approval for a different current recipe. Freshness and export gating must remain clear without blanking the canvas.
9. **Unavailable fonts/backend:** empty or deleted font library, failed font files, an older backend returning 404/HTML, restart while editing, and failed history refresh should show useful recovery actions rather than permanent Updating/Loading states.
10. **Numeric drafts:** empty, negative, fractional, out-of-range and unit-converted drafts; blur, Enter, undo and slider release must not jump unexpectedly or silently change physical settings.
11. **Timeline boundaries:** separate drag gestures, colour changes, typing pauses, numeric commits, font fallback, failed operations and history loads must produce sensible undo/redo steps. No-op focus/blur must not invalidate a valid export or discard redo.
12. **Font selection:** hovering is temporary, selecting the current font is a no-op, failed commits restore appropriate settings, and support-filter failures can retry without blocking the UI.
13. **Glyph/mark edge cases:** ligatures, several glyphs sharing a cluster, Arabic/diacritics, multiple floating contours, below-body marks, dots after auto-join, and rotated/scaled glyphs. Do not move unrelated diacritics automatically.
14. **Geometry precision:** large/small designs and extreme transforms can hit flattening or solver limits. Compare output contours with reported sizes and checks; do not just trust metadata.
15. **Fix effectiveness:** backend suggestions can hit bounds or repeat an existing value. A snap fix may improve neck/touch but not hole clearance; a smoothing/stroke fix may not resolve the warning. Verify the changed geometry and explain unresolved cases instead of falsely claiming success.
16. **Layered/PNG output:** alignment, real hole, winding, text counters over backing, joined dots, different colours and transparent exterior. Exercise both installed renderers where practical.
17. **History integrity:** removed or aliased font IDs, malformed rows, capped history, concurrent exports and interrupted writes. Confirm that saved recipes reload the intended physical design and Cake Topper history remains unchanged.

Add findings outside this list when they fall within Keychain/K5. Do not treat this list as exhaustive.

## 7. Production-check fixes and highlights

### Supported fix contract

Implement typed, explicit handling of known actions. Do not apply arbitrary object paths or arbitrary server-supplied actions blindly.

| Action | Expected UI behaviour |
|---|---|
| `set` | Validate an allowlisted field/value, make one undoable design edit, request a new preview and reassess the originating check |
| `snap_ring` | Apply a meaningful ring re-snap/reposition operation and regenerate; ensure it can actually improve the relevant defect |
| `filter_fonts_supporting_text` | Open/enable the existing support filter with progress; preserve the design until a supporting font is committed |

Expected set fields currently include `backing.offset_mm`, `size.target_mm`, `ring.outer_diameter_mm`, `backing.smoothing_mm`, `dots.auto_join` and `stroke_buffer_mm`. Reconcile this against the actual backend source before implementation.

Current check IDs:

| Check | Intended response |
|---|---|
| `KC-BACKING-SINGLE-PIECE` | Increase offset/reduce spacing or reconnect ring, based on actual cause |
| `KC-SIZE-MIN` | Set an allowed achievable minimum or explain that current settings cannot fit |
| `KC-RING-WALL` | Increase outer diameter/reduce hole within allowed ranges |
| `KC-RING-NECK` | Re-snap ring or explain an impossible requested neck |
| `KC-RING-TOUCH` | Reconnect ring to backing |
| `KC-HOLE-CLEARANCE` | Move ring sufficiently clear of text; a nominal snap alone is not proof |
| `KC-BACKING-MIN-FEATURE` | Adjust smoothing/offset meaningfully within bounds |
| `KC-TEXT-FLOATING-PARTS` | Enable/join appropriate dots or explain remaining small independent pieces |
| `KC-TEXT-MIN-STROKE` | Reinforce strokes within supported range and reassess |
| `KC-MISSING-GLYPHS` | Help select a font that supports the text; do not silently replace it |
| `KC-SIZE-CONVERGED` | Show achieved/requested size and explain an unresolved solve |

Rules:

- Passing checks have no active Fix button. Unsupported/unavailable fixes must have an understandable explanation, not a dead control.
- Reject invalid or out-of-range fixes without corrupting state.
- Prevent repeated clicks from applying a stale fix to a different name/font/request.
- Geometry fixes create one undo step. Presentation-only filtering need not create a design undo step until a font is selected.
- Display progress and determine success from the latest accepted response. Never assume dispatching a fix means the issue is solved.
- A fix must clear/improve the issue or explain why it remains and what the user can change next. Avoid infinite no-op fix loops.
- Use `highlight_bbox_mm` in fitted canvas coordinates. Show a distinct problem highlight separate from glyph/ring selection; verify it stays aligned through zoom and view filters.
- Clicking/keyboard-activating a check should reveal/highlight the relevant region where supplied. Provide visible focus and plain-language status, not colour alone.
- Clear or appropriately invalidate stale highlights on recipe/name/font/history changes.

## 8. Reproducible environment and commands

### Initial inspection

```powershell
git status --short
git log -8 --oneline
.\.venv313\Scripts\python.exe -c "import shapely, uharfbuzz, fontTools, fastapi; print('backend imports OK')"
```

Use `.venv313`, not the older `.venv`. A historical import hang did not recur in K0, but check your current environment. Do not silently change Python or upgrade the dependency stack to evade a failure.

### Baseline and final checks

```powershell
.\.venv313\Scripts\python.exe -m pytest -q

Push-Location frontend
npm.cmd run test
npm.cmd run build
Pop-Location

.\.venv313\Scripts\python.exe scripts/bench_keychain.py --check-fixtures --fixtures-only
.\.venv313\Scripts\python.exe scripts/bench_keychain.py --keychain --assert-budgets --check-fixtures --iterations 20 --output docs/qa/keychain-k5-benchmark.json

git diff --check
```

If capturing logs on Windows, note that PowerShell native stderr redirection previously yielded a misleading exit 1 even when Vitest reported passing tests. Prefer explicit `cmd.exe` redirection and inspect the true exit code, for example from `frontend`:

```powershell
cmd.exe /d /c "npm.cmd run test > ..\logs\keychain-k5-frontend-tests.log 2>&1"
$LASTEXITCODE
```

Do not dismiss a real test failure as a redirection issue. Preserve the command, exit code and relevant output.

Known previous notices: Starlette/httpx deprecation warning and JSDOM's unimplemented document-navigation notice during download checks. Inspect new warnings; these are not blanket permission to ignore warnings.

### Runtime

- Normal app/API: `http://127.0.0.1:8010`.
- A K3/K4 review server was started at `http://127.0.0.1:8011`; PID was stored in ignored `logs/keychain-k34-server.pid`. It may no longer be running. Verify; do not assume it is current.
- Development Vite address: `http://127.0.0.1:5174`, with API proxy to 8010.
- `ens_launch.ps1` reuses a healthy existing process. Health alone does not prove that process loaded the latest backend source.
- After backend changes, perform a scoped restart of the instance being tested. After frontend changes, rebuild or use the documented development workflow.
- Verify `/healthz`, the actual Keychain routes in `/openapi.json`, the current compiled asset paths and a real preview response before testing the UI.
- Start any local helper/server as a hidden background process. Bind to localhost. Do not stop unrelated Python/Node processes.
- `ens_stop.ps1` targets this project's Uvicorn/Vite processes, but can stop both 8010 and the separate 8011 review process. Inspect before invoking it if preserving another session matters.

When starting your own instance, record its executable, command line, port, PID and logs. Before stopping it later, verify it is still that instance; PIDs can be reused. Avoid protected PowerShell variables such as `$HOME` or `$PID` for task state.

### Test-data isolation

- Preserve the owner's font library, Manual Fonts, excluded-font manifests, history and existing artwork.
- Use temporary project roots/fixtures or an isolated validation copy for destructive font/history/error tests. Existing API tests demonstrate temporary-root isolation.
- Browser exports on the real local app write real Keychain history. Prefer an isolated harness; otherwise back up history first and clearly identify test records. Do not wipe the user's history to clean up.
- Never delete/regenerate `tests/fixtures/keychain_baseline/*.svg` or their hashes to obtain passing results.
- Preserve `docs/qa/keychain-k0-baseline.json`, `keychain-k1-benchmark.json` and `keychain-k2-benchmark.json` as historical reports. Write a new K5 report.
- Use generic test names and avoid recording customer data in screenshots, fixtures or logs committed to Git.

## 9. Browser validation procedure

Run the full journey at a typical desktop viewport, a narrower desktop viewport and a narrow/mobile-style layout. Test dark and bright appearance. Record browser/version, viewport, browser zoom and screenshots of important states.

### A. Start and defaults

1. Open the current built app and Keychain tab from a fresh session.
2. Confirm visible focus, font default and an empty name with disabled-export placeholder.
3. Type Sarah. Verify the preview updates without a Generate button and exports become available only for the accepted current result.
4. Check 60 mm finished width, default ring, backing/text colours, zero errors and sensible controls/readouts.
5. Switch to Designer, Sizing and back. Verify the Keychain recipe is retained and Designer behaviour is unchanged.

### B. Fonts and names

1. Use Manual Fonts and library search; confirm styles/aliases are distinguishable.
2. Hover/keyboard through options: pause preview is temporary; Escape restores the committed font. A committed choice produces one logical design edit.
3. Confirm the actual name is used in font samples and unknown fonts do not receive invented suitability badges.
4. Test Script, Bold/Display, Serif and Sans filters and the supporting-name filter, including progress, unavailable fonts and retry.
5. Use `Sarah`, `Ali`, `Jo`, `Maximilian`, `Mr Bear`, `Zoë`, `fifi`, `سارة`, `i`, `j`, `O`, `B`, `e`, and a partly/wholly unsupported emoji case with appropriate fonts.
6. Test whitespace, length limits, accents, unsupported characters, deleting the name and changing fonts after per-glyph edits.

### C. Physical settings

1. Test width and height targets at 30/60/90 mm, plus allowed minimum/maximum settings and an infeasible target.
2. Switch mm/cm/inches repeatedly. Confirm values represent the same physical design and offsets remain mm in requests.
3. Test each preset, backing counter fill, smoothing and stroke reinforcement.
4. Test both styles, all materials, colours, ring enable/disable, all positions, diameters, offsets and auto-snap on/off.
5. Confirm controls remain usable and focused during pending previews; drafts do not cause invalid requests or unexpected jumps.

### D. Canvas and letter editing

1. Drag ring and letters at 50%, 100%, 200% and 300% preview zoom where supported, including letterboxed wide/tall designs.
2. Verify ghost movement is smooth, requests do not fire per pointer move, and release makes one logical edit.
3. Release outside the canvas, cancel capture, press Escape mid-drag and switch tabs mid-drag. Verify no stuck ghost or unintended commit.
4. Use Tab, arrow keys and Shift+arrow keys. Ensure glyph clusters/ligatures are selected as units and ring/letter positions follow the intended axes.
5. Test scale 50/100/200%, rotation -45/0/+45°, X/Y offsets, dot offsets with auto-join on, Reset letter and Undo/Redo.
6. Test view Both/Backing/Text, fit-to-view, resize and page scroll. Problem highlights must follow the same geometry mapping as hit targets.

### E. Timeline, repeat names and history

1. Type several characters quickly, pause, then continue. Undo should respect pauses; redo should restore full settings.
2. Test repeated nudges, two separate slider drags, colour edits, numeric blur/no-op, presets, ring drag, resets and history reload.
3. Exceed 100 meaningful edits. Only the latest 100 should be undoable; new edits after Undo should discard Redo.
4. Export Sarah, then Next name. General settings remain; name-specific edits reset; focus returns to the name. Undo restores Sarah and its previous edits.
5. Repeat with Enter after export. Change a setting/name after export and ensure Enter does not advance based on a stale export.
6. Open history, refresh, load an entry, undo it, and export while history is open. Confirm one history record per server export.
7. Check missing fonts, history failures and malformed persisted entries without modifying real user data.

### F. Requests, failures and exports

1. Throttle/delay responses and deliberately reverse response order. Only the latest current request may update the accepted geometry.
2. Simulate a server that ignores abort, a dropped request, an old/missing route and backend restart while editing.
3. Keep last-good geometry visible but clearly stale; disable export until an appropriate current result exists.
4. Verify warnings allow export. Errors require explicit confirmation; Cancel must not download or generate an extra export.
5. Force export-only errors after a clean preview and verify the returned result is not downloaded without confirmation.
6. Test double-clicks and in-flight edits; ensure files/notices/history correspond to the requested snapshot and Enter never clears a new unexported name.
7. Download combined SVG, PNG and both separate Layered SVGs. Open the actual downloaded files; do not treat an anchor click or a mocked Blob as proof.
8. Check modal focus trapping, initial focus, Escape/Cancel and focus restoration. Keyboard shortcuts must not operate on background controls while a modal is active.

## 10. Export, LightBurn and physical validation

### Automated file checks

- Parse every exported SVG as XML; one root SVG, physical mm dimensions and valid viewBox.
- Measure actual cut contours, not just response metadata. Confirm 60 mm selected design geometry on a 64 mm canvas with margins.
- Measure the actual ring hole at different product widths/heights: 5 mm ±0.01 mm for the default hole.
- Confirm correct outer/interior winding, a real hole, no self-intersections introduced by edits, and no duplicate cut geometry.
- Engraved: `CUT_BACKING` and `ENGRAVE_TEXT`; Layered: `CUT_BACKING` and `CUT_TEXT`.
- Separate SVGs share exactly the same canvas, viewBox and origin; they align when imported together.
- Production SVGs have no transparent preview hit paths. Unbuffered curved text retains Q/C commands.
- XML-escaped recipe metadata round-trips to an equivalent design, including transforms and units-independent physical values.
- PNG exterior/keyhole are transparent; text counters over a filled backing are opaque backing colour; joined dots and custom colours render correctly.
- Check PNG fallback explicitly when native Cairo is absent. If Cairo is available, compare representative output while preserving fallback coverage.

### LightBurn

Use fresh test documents and record application/version. For engraved, combined Layered and separate Layered cases:

1. Import the actual generated SVG(s).
2. Confirm black/red/custom colours arrive as distinct intended layers and groups make sense.
3. Select the product geometry and measure width/height within 0.1 mm of the requested result; do not confuse page margins with product size.
4. Confirm the ring hole is a real inner cut contour, with no accidental fill, duplicate cuts or repaired/broken paths.
5. Import separate files into a common origin and verify alignment.
6. Record screenshots and any import warnings or manual repairs. Required manual repair is a defect to investigate, not a passing import.

If LightBurn is unavailable, complete XML/geometry validation and leave manual import acceptance explicitly pending. Do not invent a pass from the SVG parser result.

### Operator-run material check

Prepare labelled sample files for default 3 mm Cast Acrylic and representative Mini Charm/Bag Tag/Layered cases. Provide the operator a checklist for ring neck/wall, hole fit, fragile strokes, floating pieces, clean contours, true size and layer alignment/assembly. Do not select machine power/speed settings arbitrarily or fire equipment as part of unattended coding work. Mark physical validation pending until an operator supplies or you observe actual results.

## 11. Performance targets and measurement

| Interaction | Target |
|---|---:|
| Keychain tab interactive with shared catalogue available | <300 ms |
| First preview with cold parsed-font/glyph caches | <=800 ms |
| Warm server preview, names <=12 glyphs | p95 <=150 ms |
| Warm browser edit-to-current-preview | p95 <=250 ms |
| Ghost movement during canvas drag | Aim for 60 fps; no geometry request per pointer move |
| Full SVG + PNG export | <=1.5 s |

Historical K2 worst observations over 22 cases, 20 warm API requests each:

- Preview service p95: 79.081 ms.
- In-process API round-trip p95: 81.299 ms.
- Cold parsed-font/glyph-cache API preview: 83.489 ms.
- Full service export: 113.569 ms.
- All 22 default cases converged and had zero production-check errors.

Those are not browser measurements. Rerun the benchmark after final fixes, outside concurrent build/test load where practical. Keep the same pinned fonts and report the actual PNG renderer.

For browser measurements, define the start/end points, include debounce in user-visible edit-to-preview measurements, use real changes rather than repeated no-op values, and observe the accepted current SVG after rendering. Record sample count and p50/p95. Separate initial catalogue/font load from a warm edit, and report long/extreme edited recipes separately without hiding failures.

Do not lower curve fidelity, disable checks or loosen budgets solely to obtain a green report. Profile first. Keep the legacy no-tolerance Cake Topper path unchanged.

## 12. Defect handling and regression discipline

For each defect, record:

```text
ID / short title:
Classification: confirmed missing feature / reproduced defect / validation blocker
Severity: P0 critical corruption or wrong manufacturing output / P1 core workflow failure / P2 recoverable usability or edge-case failure / P3 minor polish
Environment and source commit:
Reproduction steps and exact settings:
Expected result:
Actual result:
Evidence: screenshot, request/response, exported file, logs or failing test
Root cause:
Fix and affected files:
Regression coverage:
Retest result and evidence:
Status: open / in progress / fixed and verified / pending external validation
```

Workflow:

1. Reproduce or identify the explicit missing requirement.
2. Add a focused regression test where it can verify meaningful behaviour.
3. Fix the root cause at the smallest appropriate layer.
4. Run targeted tests, then required broader regression/build checks.
5. Retest the actual workflow/file output. A passing mock alone does not close a browser or manufacturing defect.
6. Update the register and QA evidence.
7. Repeat until the agreed scope is complete or a specific external dependency blocks validation.

Protect existing behaviour:

- Run the complete existing backend/frontend suites before final delivery.
- Keep all three Cake Topper golden SVGs byte-identical. `.gitattributes` protects their line endings; the harness freezes their recipe date.
- Preserve existing Designer layout, controls, export behaviour, font management and history.
- If changing shared helpers or the font picker, verify their default callers as well as Keychain-specific options.
- Do not remove assertions, skip tests, overwrite reference hashes or substitute snapshots of known-bad output.
- Add tests that fail for the actual bug, not tests that merely restate the implementation.

## 13. Acceptance and completion status

K5 is **fully verified** only when:

1. Required Fix actions and highlights work, are undoable where appropriate, and reassess real results.
2. Confirmed P0/P1 defects are resolved and retested; remaining lower-severity items are explicitly documented with impact.
3. The real browser journey, dark/bright/narrow layouts, drag and keyboard/modal workflows have evidence.
4. Stale data cannot be exported or confused with the current recipe, and export errors require confirmation for the exact result.
5. Backend/frontend regressions, production build, golden parity and performance gates pass.
6. SVG/PNG output and recipe/history behaviour meet the dimensional and rendering contracts.
7. Manual LightBurn acceptance has evidence.
8. Manufacturing checks have actual operator evidence for full manufacturing acceptance. If they remain pending, use a qualified software-completion verdict below rather than an unqualified fully-verified claim.
9. Documentation, evidence, defect register, handoff and local commits are complete.

Use separate verdicts if external checks cannot be completed:

- **Implementation and automated checks complete; browser validation pending**, or
- **Software/browser validation complete; LightBurn or physical validation pending**, or
- **K5 fully verified**, only when the required evidence actually exists.

Do not mark the whole phase green while leaving missing Fix controls, untested browser interactions or failed core workflows hidden in footnotes. If manufacturing remains pending, distinguish software completion from manufacturing acceptance in the final verdict.

## 14. Required deliverables

Create/update:

1. `docs/qa/KEYCHAIN_K5_DEFECT_REGISTER.md` — seeded entries, new discoveries, fixes and retests.
2. `docs/qa/KEYCHAIN_K5_VALIDATION_REPORT.md` — environment, commands/results, browser matrix, measurements, file/LightBurn evidence and explicit pending checks.
3. `docs/qa/KEYCHAIN_QA_MATRIX.md` — actual verified status per scenario, not blanket pass labels.
4. `docs/qa/keychain-k5-benchmark.json` — final machine-readable performance evidence.
5. `docs/qa/keychain-k5-evidence/` — concise generic sample exports/screenshots or links to reproducible evidence, without customer data.
6. `docs/handoffs/keychain-designer-k5-hardening-handoff.md` — follow the repository handoff standard, covering delivered work, tests, defects, limitations, Git/deployment state and next steps.
7. README, phase plan/index, relevant architecture/export docs and `docs/deployment-log.md` — accurate final implementation and validation status.
8. Focused code/test changes and meaningful Conventional Commits. Log exact implementation commit hashes; do not push or tag a release without owner instruction.

In the final response to the owner, state:

- What was completed and the implementation commit(s).
- Which defects were fixed, especially manufacturing-output and export-confirmation issues.
- Actual test/build counts and benchmark results.
- Whether the browser, LightBurn and physical-cut checks were really verified.
- Any remaining defects/blockers, their impact and the exact external action needed.
- How to run/review the current application and where to find the handoff/evidence.

Keep working through the authorised K5 fixes; do not return only this brief rewritten as a plan.
