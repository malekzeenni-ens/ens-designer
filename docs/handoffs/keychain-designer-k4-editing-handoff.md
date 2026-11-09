# Keychain Designer K4 — Editing and repeat-order workflow

Date: 2026-11-09 (Europe/London). K3 and K4 were authorised together; the user reserved K5 testing for later.

## 1. Executive summary

K4 adds the Letter Inspector, physical glyph/mark edits, canvas glyph drag/nudge, 100-step undo/redo, Next name and Keychain history reload. The implementation builds on K3 and the existing K2 API. K5 remains pending; this is not a browser, LightBurn or manufacturing sign-off.

## 2. Objectives completed

- Select backend glyph clusters, including ligatures, from actual SVG hit paths or keyboard focus targets.
- Move, scale 50–200%, rotate ±45°, adjust dots/marks and reset individual letters.
- Ghost drag commits once on release; Escape/pointer cancellation discards it.
- Keyboard 0.1 mm nudges, or 1 mm with Shift, for letters and ring.
- Undo/redo with a bounded 100-step history and typing/control/nudge coalescing.
- Next name preserves production settings and focuses the empty name field. Enter after an unchanged exported design does the same.
- Browse, refresh and reload saved recipes as one undoable action, without duplicate export/history writes.

## 3. Scope delivered

The Keychain workspace is available next to Designer. New K4 controls are in the top toolbar, Letter Inspector and export bar. Local history loads only when opened, refreshes after successful export and cancels obsolete reads. Missing saved fonts are reported rather than silently replaced. The selected name and recipe are retained across tab changes.

## 4. Files created

- `frontend/src/features/keychain/state/useUndoRedo.ts`
- `frontend/src/features/keychain/components/LetterInspector.tsx`
- `frontend/src/features/keychain/components/KeychainHistoryList.tsx`
- `frontend/src/features/keychain/tests/undoRedo.test.ts`
- This handoff.

## 5. Files modified

Keychain reducer, tab, preview, font style filter, scoped CSS, history API helper and interaction tests. README, architecture overview, plan/index, QA matrix and deployment log updated. Backend services and existing Designer panels are unchanged.

## 6. Technical decisions

The timeline stores complete immutable design snapshots. Typing coalesces within a 150 ms pause, control/nudge edits within 400 ms; slider release provides an explicit group boundary. New edits discard redo, no-op edits do not add history, and initial font hydration updates snapshots without becoming an undo step. Moves are reducer deltas, so repeated same-frame keyboard events accumulate correctly.

Name/font changes reset name-specific glyph/gap/dot indices; general size, font/style, material, backing, ring and colour settings remain. Next name explains this reset. Full previous recipes, including per-letter edits, remain undoable. Selecting the same font does not reset edits.

Canvas pointer mapping uses the SVG canvas, letterboxing and the transformed plane rectangle. Actual backend hit paths select glyphs; transparent overlay rectangles provide keyboard targets rather than intercepting letter clicks. During updates, controls retain glyph metadata for the same text/font so active inputs do not disappear. Stale geometry is not selectable or exportable.

History recipes are loaded only if the saved font ID is available. Metadata/version/transport fields are removed before editing. Entry dates display in Europe/London. Separate exports identify the saved name and expose two independent file buttons, avoiding browser automatic multi-download blocking. The server export is still the sole automatic history writer.

## 7. Architecture changes

Feature-local timeline and inspector/history components. Shared font preview extensions introduced in K3 remain optional. No backend or existing Cake Topper component changes.

## 8. Dependencies added

None.

## 9. Database changes

None. Existing isolated K2 Keychain history API/file used unchanged.

## 10. Testing performed

- Final frontend suite: 22 files / 91 tests passed (28 additional tests across K3/K4 compared with K2).
- Final backend regression: 325 tests passed, including three byte-identical Cake Topper golden SVGs; one existing Starlette/httpx deprecation warning.
- TypeScript and Vite production build passed. Current output: ~408 kB JS / ~124 kB gzip; no added runtime package.
- Automated interactions cover cluster editing/reset, manual dots with auto-join retained, same-frame nudge accumulation, coalescing and 100-step cap, branching redo, Ctrl+Z in the name input, Next name/Enter focus and preset retention, Activity state, recipe reload/undo and missing-font handling.
- Preview service HTTP smoke on 127.0.0.1:8011 returned 60 mm product / 64 mm canvas, echoed request ID, no export files and no PNG. HTML serves the latest compiled assets.
- Browser UI walkthrough was attempted in K3 but Computer Use stopped because it could not confidently verify Chrome's current URL. No further browser automation was attempted. Real browser/drag/appearance verification remains K5.

## 11. Known issues

K5 still owns the formal browser journey, production-check Fix actions/highlights, wider accessibility/focus/edge-case audit, LightBurn import/colour mapping and manufacturing checks. Those are not marked complete. No browser end-to-end latency or visual sign-off is claimed. Existing JSDOM tests emit the known unimplemented navigation notice during download checks.

## 12. Risks

Canvas drag and responsive layout need actual browser verification in K5. The configured finished size remains fixed as individual letters are transformed, so the backend may uniformly rescale the rest of the text. A saved recipe with a removed font requires restoring that font before reload. The preview API/backend must include K2 routes; restarting an older normal backend may be needed after updating source.

## 13. Performance metrics

Backend timing evidence remains K2's budget-enforced 22-case report (81.299 ms worst local API p95). K3/K4 add debounce, cancellation, current-result export gating and direct DOM ghost movement. Browser latency and frame-rate measurements remain K5 work.

## 14. Documentation updated

README, architecture overview, phase plan/index, QA matrix, K3/K4 handoffs and deployment log. No governance files edited.

## 15. Git information

Branch: main. K3 commit: `193764c7f621519780df85a26c8d138a6d1a05a3`. K4 commit: `0ffab508079ad58aa8fe96b5479ac89c15cbcf3f` (`feat(keychain): add letter editing undo and recipe history`). No remote push or release tag.

## 16. Deployment information

Compiled frontend is built. A hidden local review server is available at `http://127.0.0.1:8011`, using this workspace's backend and compiled frontend, with PID recorded in ignored `logs/keychain-k34-server.pid`. Normal production port 8010 and existing processes were not restarted. Rollback: revert K4 (and K3 if desired) and rebuild. Stop only the recorded project preview process when no longer needed.

## 17. Recommendations for next phase

Keep K5 pending until the user starts the testing pass. Begin with the actual browser walkthrough in dark/bright and narrow layouts, ring/letter drag and keyboard focus, stale request/export scenarios and history reload. Complete check fixes/highlights and audit error confirmations before final acceptance. Then verify selected geometry dimensions/layers in LightBurn and actual material cuts. Do not infer manufacturing readiness from automated geometry checks alone.
