# Keychain K5 defect register

Date: 2026-11-09 (Europe/London). Baseline: `dea68fe` (K4 + K5 brief). K5 implementation commit: `57ae14f`.
Environment: Windows 11, `.venv313` Python, Chrome 156 (DPR 1, 1920×945 viewport), isolated QA server `127.0.0.1:8012` with temporary history. PNG renderer: Pillow fallback (Cairo native library absent).

Severity: P0 wrong manufacturing output / corruption · P1 core workflow failure · P2 recoverable usability or edge-case failure · P3 polish.

## Summary

| ID | Title | Class | Sev | Status |
|---|---|---|---|---|
| K5-001 | Production-check Fix controls missing | Confirmed missing feature | P1 | Fixed and verified (automated + Chrome) |
| K5-002 | `highlight_bbox_mm` not wired to canvas | Confirmed missing feature | P2 | Fixed and verified (automated + Chrome) |
| K5-003 | Real browser walkthrough never done | Validation blocker | P1 | Largely verified in Chrome; remaining cases listed below |
| K5-004 | Export dialog had no focus trap/return | Confirmed gap | P2 | Fixed and verified (automated + Chrome keyboard) |
| K5-005 | Export result checks not inspected | Static logic gap | P1 | Fixed; automated regression. Not forceable against the real backend |
| K5-006 | Snapped ring jumps/drifts when dragged | Reproduced defect | P2 | Fixed and verified (engine harness + regression tests) |
| K5-007 | Fixes repeat values or cannot work | Reproduced defect | P2 | Fixed and verified (real-geometry harness + tests) |
| K5-008 | Blur on unchanged cm/inch field alters physical mm | Reproduced defect | P2 | Fixed; regression test |
| K5-009 | No-op commit re-requests preview, briefly disables export | Reproduced defect | P3 | Fixed; regression test |
| K5-010 | "Fixed" message survives Undo | Reproduced defect (Chrome) | P2 | Fixed; automated retest |
| K5-011 | Oversized clipped focus outline on SVG targets | Reproduced defect (Chrome) | P3 | Fixed; Chrome retest |
| K5-012 | Disabled primary export button looks enabled | Reproduced defect (Chrome) | P3 | Fixed; not visually re-screenshotted |
| K5-013 | Export notice shifts the layout under the pointer | Reproduced defect (Chrome) | P3 | Open — documented |
| K5-014 | Chrome download folder is a customer order folder | Environment / validation blocker | — | Pending operator action |

No P0 manufacturing-output defect was found. Exported cut contours, hole diameters, layers and canvas margins all measured correct (see validation report).

## Detailed entries

### K5-001 — Production-check Fix controls
- **Expected:** failing checks offer a safe fix or an explanation; one undo step; result re-checked.
- **Actual (before):** `ProductionCheckPanel` listed messages only.
- **Fix:** `state/checkFixes.ts` plans fixes from an allowlist (`backing.offset_mm`, `backing.smoothing_mm`, `size.target_mm`, `ring.outer_diameter_mm`, `ring.hole_diameter_mm`, `stroke_buffer_mm`, `dots.auto_join`; `snap_ring` keys `auto_snap`/`x_offset_mm`/`y_offset_mm`; `filter_fonts_supporting_text`). It rejects unknown fields, actions, out-of-range values and values equal to the current setting. `KeychainTab.applyFix` only applies fixes from the current accepted result, makes one design edit, shows progress, and reads the outcome from the next current preview: fixed, still failing with the next suggestion/explanation, or preview failed. Fixes are disabled while the checks belong to an older preview. The support-filter fix opens the existing font filter with progress; it makes no design change and no undo step.
- **Files:** `checkFixes.ts`, `ProductionCheckPanel.tsx`, `KeychainTab.tsx`, `FontSection.tsx`, `KeychainControls.tsx`, `Fields.tsx`, `keychain.css`.
- **Regression:** `checkFixes.test.ts` (allowlist, ranges, no-op, snap, explanations); `k5Hardening.test.tsx` (one undo step + re-preview + "Fixed"; ineffective fix reports remaining issue; disabled while stale; font filter opens without edit).
- **Retest (Chrome):** ring dragged into the text → `KC-HOLE-CLEARANCE` warning → "Return ring to its preset and snap" → new preview → "Fixed: Hole-to-text clearance is 4.49 mm…". Ctrl+Z restored the dragged ring in one step.

### K5-002 — Canvas problem highlights
- **Fix:** Show/Hide per check (`aria-pressed`, labelled). A red, solid region is drawn in the overlay SVG, which shares the canvas-mm viewBox with the hit targets. It is distinct from the gold dashed selection and has a text label, so it doesn't rely on colour alone. It is cleared on name/font changes, history load and Escape, and disappears when the check passes.
- **Retest (Chrome):** the highlight sits exactly 0.6 mm outside the ring target at 100% (7.8 px at 13.0 px/mm) and 200% (15.6 px); size ratio 1.1 = 13.2/12 mm; still shown in Text-only view.

### K5-003 — Browser walkthrough
Verified in Chrome 156 (dark and bright appearance, 1920 px, 1000 px and 390 px layouts). See the validation report for the matrix. **Not verified in a real browser:** pointer cancel/lost capture and Escape or tab switch mid-drag (the automation drag is atomic), 50%/300% zoom drags, browser zoom/DPI ≠ 1, the keyboard font listbox with hover preview and Escape, the supporting-name filter retry, real OS file save (see K5-014), the 100-edit cap in a browser, and backend restart while editing.

### K5-004 — Accessible export modal
- **Fix:** `ExportConfirmDialog.tsx`: initial focus on Cancel, Tab/Shift+Tab wrap, Escape cancels, focus returns to the opener (or the Download SVG button). The rest of the workspace is `inert` and the global shortcut handler ignores keys while the dialog is open.
- **Retest (Chrome, real key events):** focus sequence Cancel → Export anyway → Cancel → Export anyway → (Shift+Tab) Cancel; Ctrl+Z blocked (ring offset unchanged at −40); Escape closed it without exporting; focus returned to Download SVG.

### K5-005 — Export-result checks
- **Fix:** `runExport` inspects the returned checks. Errors not already confirmed for that request snapshot hold the generated result in the dialog ("Export returned production errors"). **Download anyway** downloads that held result without calling export again, so no duplicate history entry. **Cancel** downloads nothing and explains that the server already listed the export in history. Confirmation always binds to the captured request snapshot.
- **Regression:** two tests (held result downloaded once with one export call; cancel downloads nothing; pre-confirmed identical errors are not asked twice).
- **Limitation:** preview and export share the engine, so this case could not be forced against the real backend. It is verified only with a mocked divergent response.

### K5-006 — Ring drag after snapping (investigation 1)
- **Reproduction:** `Sarah`, Satisfy, `top-center` (snapped at rest). Measured ring travel relative to the text for drags of +3/−3/+6 mm: 1.10 / −1.34 / 8.97 mm.
- **Root cause:** the drag delta was added to the nominal (pre-snap) offsets, then re-snapped from a different point.
- **Fix:** ring metadata now carries `requested_center_x_mm/y_mm`. Ring moves are rebased by `actual − requested` when the result reflects the current offsets, so coalesced nudges are not rebased twice.
- **Retest:** rebased drags travel exactly 3.0 / −3.0 / 6.0 mm (`test_rebased_ring_drag_moves_a_snapped_ring_by_the_drag_distance`). Dragging off the body still re-snaps, by design.

### K5-007 — Fix effectiveness (investigation 15)
- **Reproduction (real geometry harness):** with a ring dragged into the text, the backing-offset fix ran 4.5 → 6 → 7.5 → 9 mm and never cleared the clearance warning. Exhausted fixes (stroke 0.6, smoothing 3, dots already joined, snap already on at preset) re-offered the current value.
- **Fix:** `keychain_validation.py`:
  - fixes never repeat current values, and exhausted ones become `fix_note`;
  - clearance resets moved rings, otherwise grows the backing by signed penetration depth;
  - wall falls back to a smaller hole;
  - `KC-SIZE-CONVERGED` reports the achieved size.
- **Retest:** dragged-in ring resolves in one step; forced 12 mm neck resolves in two; `test_keychain_k5_fixes.py` (7 tests) passes.
- **Remaining:** stroke reinforcement advances 0.1 mm per click (0.3 → 0.4 → 0.5 resolved `fifi` at 30 mm). Each step reports "still needs attention" with the next suggestion.

### K5-008 — Unit-converted draft (investigation 10)
- **Reproduction:** the 60 mm width shows as `2.3622` in. Blurring without editing committed 2.3622 in = 59.99988 mm, which changed the recipe, discarded redo and cleared the export state.
- **Fix:** blur commits only when the draft differs from the displayed value. Regression test asserts no new request and `target_mm` stays 60.

### K5-009 — No-op commits
No-op focus/blur/slider-release still reset the debounce, which re-ran the preview and briefly made the current result stale (export disabled). No-op edits now only end the coalescing group. The pending design is used for same-tick comparisons.

### K5-010 — Stale fix status after Undo
Found in Chrome. Every status now records the design it describes and is cleared when the design differs. Regression assertion added.

### K5-011 / K5-012 — Visual focus and disabled state
- **K5-011:** the global `:focus-visible` outline on the SVG `<circle>` was scaled by the viewBox into a thick clipped bar. It is now a stroke in canvas units for ring and glyph targets. The Chrome narrow-layout retest showed no oversized outline.
- **K5-012:** disabled `.kc-primary` kept its gold fill (opacity 0.72 only). It now uses the neutral surface.

### K5-013 — Layout shift after export (open, P3)
The success notice is inserted above the workspace and pushes the export bar down by one row. A second quick click can land on a different control. Suggested fix: reserve the notice row or show it as an overlay. Left open to avoid layout redesign within K5.

### K5-014 — Download destination (environment)
Chrome's default download folder on this machine is a customer order folder. To avoid writing test files there, browser downloads were captured in-page: the Blob and filename the real code path would save, intercepted at `URL.createObjectURL` and the anchor click. Nothing was written into the customer folder (verified). Operator action: confirm a real download in a browser profile whose download folder is safe.

## Investigation targets (brief §6)

| # | Target | Result |
|---|---|---|
| 1 | Ring drag after snap | Defect K5-006, fixed |
| 2 | Coordinate mapping | Chrome drags: 390 px letterboxed ring drag 7.64 mm vs 7.58 expected; 200% letter drag 1.364 vs 1.392 mm (within one screenshot pixel); highlight alignment at 100/200%. Browser zoom/DPI ≠ 1 not tested |
| 3 | Pointer lifecycle | Code paths reviewed (cancel/lost capture discard; Escape on plane); ghost hidden after real release. Mid-drag cancel/tab switch **not** browser-verified |
| 4 | Out-of-order work | Existing stale/abort tests pass; fixes bound to current result. No new defect |
| 5 | Editing during export | Not a defect; test confirms an old export keeps its name and Enter does not clear the new name |
| 6 | Duplicate submission | Synchronous guard added; test: double SVG + PNG click → one export. Chrome: 3 exports → 3 history rows |
| 7 | Keyboard on stale state | Not reproduced (name/font changes already clear selection); defensive guard added and tested |
| 8 | Checks during updates | Panel marks stale results and disables fixes; canvas unchanged |
| 9 | Unavailable fonts/backend | Existing messages retained; failed preview shows Retry. Old-backend/restart not re-tested in browser |
| 10 | Numeric drafts | Defect K5-008 fixed |
| 11 | Timeline boundaries | Defect K5-009 fixed; one undo step per fix verified |
| 12 | Font selection | Existing tests pass; real listbox hover/Escape not browser-verified |
| 13 | Glyph/mark edge cases | Existing automated coverage passes; no new browser testing |
| 14 | Geometry precision | Six written-file cases measured correct; extreme transforms not newly explored |
| 15 | Fix effectiveness | Defect K5-007 fixed |
| 16 | Layered/PNG output | Validator: alignment, holes, winding, groups, curves, transparency, custom colours. Pillow only (Cairo absent) |
| 17 | History integrity | Chrome: one row per export, none for a cancelled pre-export dialog; existing malformed/concurrency tests pass |
