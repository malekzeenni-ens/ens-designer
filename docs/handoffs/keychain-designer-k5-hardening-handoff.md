# Keychain Designer K5 — Testing and hardening

Date: 2026-11-09 (Europe/London). Executed from `docs/handoffs/keychain-designer-k5-agent-brief.md`.

## 1. Executive summary

K5 completes the missing production-check Fix actions and canvas problem highlights. It hardens export confirmation (accessible modal, export-result checks, duplicate guard) and fixes eight further defects, three of which were found in a real Chrome session. No manufacturing-output (P0) defect was found: written SVG/PNG files measure correctly.

**Verdict: Implementation and automated checks complete. Browser validation is largely complete with listed gaps. LightBurn and physical-cut validation are pending.** K5 is not "fully verified".

## 2. Objectives completed

- Fix controls for every check with a safe action, plain explanations otherwise, one undo step, and outcome read from the next accepted preview (K5-001).
- Canvas problem highlights in fitted canvas mm, distinct from selection (K5-002).
- Modal focus trap/return, inert background, blocked shortcuts (K5-004).
- Export-result errors require confirmation of that exact result without a second export (K5-005).
- Defects K5-006…K5-012 fixed with regression coverage; K5-013 documented.
- Chrome walkthrough, written-file validation, K5 benchmark, defect register, validation report and operator package.

## 3. Scope delivered

Keychain feature only, plus additive backend response fields. No Cake Topper, Designer, PreviewPanel or shared font-picker changes. Out-of-scope items (batch, nesting, decorative backings, multiple rings) were not started.

## 4. Files created

- `frontend/src/features/keychain/state/checkFixes.ts`, `components/ExportConfirmDialog.tsx`
- `frontend/src/features/keychain/tests/checkFixes.test.ts`, `tests/k5Hardening.test.tsx`
- `tests/test_keychain_k5_fixes.py`
- `scripts/keychain_qa_server.py` (isolated-history local server), `scripts/keychain_validate_exports.py`
- `docs/qa/KEYCHAIN_K5_DEFECT_REGISTER.md`, `KEYCHAIN_K5_VALIDATION_REPORT.md`, `keychain-k5-benchmark.json`, `keychain-k5-evidence/` (samples, validation JSON, screenshots, operator checklist)
- This handoff.

## 5. Files modified

- **Backend:** `models.py` (`KeychainCheck.fix_note`, ring `requested_center_x_mm/y_mm`), `keychain_engine.py` (populate requested centre), `keychain_validation.py` (non-repeating, effective fixes).
- **Frontend:** `KeychainTab.tsx`, `ProductionCheckPanel.tsx`, `KeychainPreview.tsx`, `KeychainControls.tsx`, `FontSection.tsx`, `Fields.tsx`, `keychainTypes.ts`, `keychain.css`.
- **Docs:** README, implementation plan, phase index, architecture overview, LightBurn export specification, QA matrix, deployment log.

## 6. Technical decisions

- **Fixes:** fixes are suggestions, never trusted blindly. The client allowlists fields, types and ranges, rejects no-ops, and binds each fix to the current accepted result. Success is judged only from the next current preview. The support-font filter makes no design edit until a font is chosen.
- **Backend fixes:**
  - A hole-clearance fix first returns a user-moved ring to its preset. Otherwise it grows the backing by the signed penetration depth, because a snap does not move the ring away from text.
  - Exhausted fixes return `fix_note` instead of repeating a value.
- **Export confirmation:**
  - Preview errors are confirmed before export.
  - Errors first seen in the export result hold that result; **Download anyway** delivers it as-is, so there is still one history row per server export.
  - Cancelling a held result downloads nothing; the server-written history row remains, and the notice says so.
- **Ring rebase:** a move adds `actual − requested` only when the result reflects the current offsets, so coalesced keyboard nudges are never rebased twice.
- **No-op edits** (blur, slider release) only end coalescing. They no longer re-request the preview or invalidate export.

## 7. Architecture changes

Two additive response fields; older clients ignore them, and the new client tolerates their absence (no rebase, generic explanation). Fix planning is a pure module; the dialog is a self-contained component.

## 8. Dependencies added

None.

## 9. Database changes

None. Keychain history format unchanged.

## 10. Testing performed

**Unit testing**
- Backend: 332 passed (+7 K5), Cake Topper golden SVGs 3/3 byte-identical.
- Frontend: 24 files / 115 tests (+24 K5).
- Build: TypeScript/Vite passed (418.4 kB JS).

**Integration testing**
- Real-geometry fix harness: fixes resolve or explain.
- `keychain_validate_exports.py`: 6/6 written-file cases pass. Holes measure exactly 5/4/6 mm, finished sizes are within 0.05 mm, margins 2 mm.
- Benchmark gate PASS. Worst warm API p95 100.2 ms (K2 81.3 ms; whole-pipeline slowdown attributed to machine load), cold 138.0 ms, export 122.9 ms; Pillow renderer.

**Manual testing (Chrome 156)**
- Defaults and live preview.
- Real ring/letter drags, measured within one screenshot pixel at 100% (390 px letterboxed) and 200%.
- Fix and highlight, including alignment.
- Modal keyboard trap, Escape and focus return.
- Layered separate files and PNG content captured from the real download path.
- One history row per export.
- Dark/bright, 1000 px and 390 px layouts without horizontal scroll.
- Details: validation report §4.

## 11. Known issues

- **K5-013 (P3, open):** the export notice shifts the layout; a quick second click can miss.
- **Not browser-verified:** mid-drag cancel/Escape/tab switch, 50%/300% zoom drags, browser zoom/DPI ≠ 1, font listbox hover and Escape, support-filter retry, 100-edit cap, backend restart while editing, and the real OS file save. Chrome's download folder here is a customer order folder, so downloads were captured in-page.
- **Export-only errors** (K5-005) are verified only with a mocked divergent response.
- **Stroke reinforcement** fix advances 0.1 mm per click (explained in the UI).
- **Not measured:** browser performance (tab-interactive time, edit-to-preview p95, frame rate).

## 12. Risks

- LightBurn import and actual cuts are unverified. Software geometry checks are not manufacturing certification.
- The running 8010 app was not restarted: it serves the new frontend on the old backend until restarted, so fix notes and ring rebase are inactive there.

## 13. Performance metrics

See §10 and `docs/qa/keychain-k5-benchmark.json` (22 cases × 20 warm previews, budget gate PASS).

## 14. Documentation updated

README, `KEYCHAIN_DESIGNER_IMPLEMENTATION_PLAN.md`, `PHASE_INDEX.md`, `README_ARCHITECTURE_OVERVIEW.md`, `LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md`, `KEYCHAIN_QA_MATRIX.md` (KC-27…KC-36), deployment log, plus the new K5 QA documents. Governance files untouched.

## 15. Git information

Branch `main`. Implementation commit `57ae14feea84bd64ee299902fec0490fc1b9c449` (`feat(keychain): production check fixes, highlights and export hardening`). Documentation/evidence: the following `docs(keychain)` commit. No push or tag.

## 16. Deployment information

- **Frontend:** `frontend/dist` rebuilt.
- **Review server:** start an isolated one with `.venv313\Scripts\python.exe scripts\keychain_qa_server.py --port 8012 --data-root <empty temp folder>`. Its history is separate from real data.
- **Normal app:** restart 8010 with `ens_stop.ps1` then `ens_launch.ps1` to load the K5 backend. Note that `ens_stop.ps1` also stops the 8011 review process.
- **Rollback:** `git revert 57ae14f` and rebuild. No data migration.

## 17. Recommendations for next phase

1. Run `keychain-k5-evidence/OPERATOR_CHECKLIST.md` in LightBurn (new document after saving current work), then cut the samples. Record the results in the validation report and QA matrix (KC-28/KC-29).
2. Close the browser gaps in §11 manually, ideally with a safe Chrome download folder.
3. Fix K5-013 by reserving the notice row.
4. Optionally measure browser edit-to-preview latency with the Performance panel.
