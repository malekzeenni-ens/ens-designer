# Regression Testing — Bug/Gap/Silent-Failure Remediation Plan

## Purpose

This document plans the remediation of the findings raised in the full-codebase audit (backend + frontend) conducted 2026-06-20/21. It defines fix batches, sequencing, and the regression tests required before/after each batch. No fix work starts until this plan is reviewed.

Source: flat audit list delivered in chat (backend + frontend), not duplicated here in full — each item below is referenced by file:line and restated briefly for traceability.

---

# Guiding Principles

- Fix in small, independently revertible batches — one deployment-log entry per batch, matching existing project convention.
- Every batch must keep `npm test` (frontend) and `pytest` (backend, root `tests/`) green before commit.
- High severity items are fixed first and in isolation (not bundled with medium/low items) so a revert doesn't pull back unrelated changes.
- Where a fix changes externally-visible behavior (HTTP status codes, validation limits, manifest formats), add a regression test that pins the new behavior before touching production code (test-first for behavior changes; test-after is acceptable for pure cleanup like leak fixes).
- No speculative refactors — fix only what the audit identified.

---

# Batch 1 — High Severity (Backend)

## B1.1 — `font_loader.py:155` — font_id is a path hash, breaks on project move/clone

- **Risk**: Re-hosting, syncing via Dropbox to a new path, or cloning to another machine silently invalidates every manual/uploaded font reference. Manifests point to dead IDs with no error surfaced to the user — fonts just vanish from "manual" lists.
- **Fix approach (decision confirmed 2026-06-21)**: Switch `font_id` derivation to a path-independent stable key (SHA1 of file **content**, not the resolved absolute path). Ship a one-time migration on top of this rather than accepting a forced re-curation: on manifest load, for each stored ID that doesn't resolve in the live catalog (i.e. it's an old path-hash ID), recompute the new content-hash ID for every font in the catalog and match by **filename** to remap the old ID to the new one in-place, rewriting the manifest once. This is strictly better than "accept redo" — it's a few lines of one-time lookup logic, fully backward compatible with existing manifests, and avoids forcing operators to re-curate manual fonts after the fix ships. Fonts that were renamed *and* moved at the same time as this fix will still need manual re-curation (filename match fails) — acceptable residual gap, log a warning listing any IDs that couldn't be remapped so it's visible rather than silent.
- **Regression tests**:
  - New backend test: build catalog from a fixture directory, simulate a "move" by re-instantiating the loader with a different `cwd`/base path pointing at the same files, assert manual font IDs still resolve.
  - New backend test: seed a manifest with old-style path-hash IDs, load the catalog, assert the manifest is rewritten with new content-hash IDs and the same fonts remain marked manual (the remap-by-filename path).
  - New backend test: seed a manifest with an ID for a font that no longer exists under any filename, assert it is dropped with a logged warning (not silently lost with zero trace).
  - Existing `tests/test_phase_1b_font_regression.py` must still pass unmodified.
- **Manual validation**: Copy the `fonts/` directory to a temp path, point a second backend instance at it, confirm `.manual_fonts.json` still resolves without re-curating fonts.

## B1.2 — `history_store.py:46-48` — one malformed entry crashes the entire history GET

- **Risk**: A single legacy/corrupt row in history storage takes down the whole `/api/cake-topper/history` endpoint for all users, not just the bad entry.
- **Fix approach**: Wrap per-entry `HistoryEntry(**e)` construction in try/except; skip and log (with a count) malformed entries instead of raising. Endpoint should always return whatever valid entries exist.
- **Regression tests**:
  - New backend test: seed history store with one valid + one malformed entry (e.g. missing required field), assert GET returns only the valid entry with HTTP 200, and a log line is recorded for the skipped one.
  - New backend test: all-malformed history file returns an empty list with HTTP 200, not a 500.

---

# Batch 2 — Medium Severity (Backend, error-handling consistency)

Group rationale: all of these are instances of the same systemic gap — exception handling that is either too narrow (misses real errors) or too broad (silently masks them) — so they're fixed together with one shared pattern decision, in one PR/commit.

- B2.1 `cake_topper_engine.py:597-602` (`_render_png` AttributeError not caught)
- B2.2 `png_exporter.py:13-18` (same narrow except)
- B2.3 `api/routes/cake_topper.py:15-19` (route only catches `ValueError`)
- B2.4 `api/routes/generation.py:12-21` (same)
- B2.5 `api/routes/overlap.py:12-15` (same)
- B2.6 `font_loader.py:100-108` (silently drops unknown manifest IDs, no logging)
- B2.7 `font_loader.py:125-140` (manifest read swallows all exceptions → masks corruption as "no manual fonts")
- B2.8 `shapely_converter.py:68-73, 84-90, 116-126` (silent polygon drops / fallback union)
- B2.9 `shapely_converter.py:155-161` (component-count swallows exceptions, can misreport connectivity)
- B2.10 `models.py:222 / :231 / :304` (three inconsistent `overlap_mm` constraint definitions)
- B2.11 `cake_topper_engine.py:757` (4.0mm ring-overlap minimum enforced only as a warning, not a Pydantic constraint — returns HTTP 200 with `is_valid=False` instead of rejecting)

**Fix approach**:
1. Introduce one shared exception-handling convention for route handlers: catch a defined `DesignerError` (or similar) base class raised intentionally by the engine layer for expected domain failures (bad geometry, invalid config) → 422 with a clear message; let truly unexpected exceptions propagate as 500 (do NOT blanket-catch `Exception` in routes — that hides bugs). This directly fixes B2.1–B2.5.
2. `font_loader.py`: replace `except Exception: return []` with explicit `except (json.JSONDecodeError, OSError)`, log a warning with the manifest path and original error, and surface skipped-ID counts in B2.6/B2.7.
3. `shapely_converter.py`: replace bare `except Exception` with `except (ShapelyError, ValueError)` (or the specific Shapely exception types actually raised), and increment/log a "geometry dropped" counter rather than silently discarding (B2.8/B2.9).
4. `models.py`: consolidate the three `overlap_mm` field definitions into one shared `Annotated` type/constant (single source of min/max), and promote the 4.0mm ring minimum from a runtime-only warning into the actual Pydantic field constraint so invalid configs fail validation (422) instead of returning 200 with `is_valid=False` (B2.10/B2.11).
- **Regression tests**:
  - New test per route asserting a deliberately-triggered engine failure now returns 422 with a structured error body (not a raw 500 traceback, not a silent 200).
  - New test: malformed manifest file logs a warning and the API still starts/serves with manual fonts treated as empty (pin the message format so future refactors don't silently change it).
  - New test: ring `overlap_mm` below 4.0 is rejected at the API boundary (422) instead of round-tripping to `is_valid=False` in a 200 response. **Decision confirmed 2026-06-21: proceed with the breaking change — no client depends on the current 200/`is_valid=False` contract.**
  - Run full existing suite (`pytest -q`, currently 188 passing) — must stay green, paying particular attention to `test_phase_1b_welding_validation.py`, `test_phase_x_overlap_engine.py`, and `test_phase_1c_*` since they exercise the geometry/validation paths being touched.

---

# Batch 3 — Low Severity (Backend cleanup)

- B3.1 `api/routes/fonts.py:122-129` (duplicate-upload race can return `None`, misleading message)
- B3.2 `history_store.py:28-31` (no file locking on writes — concurrent POST race)
- B3.3 `connectivity_engine.py:226-286` (`_merge_overlapping` dead code, bare except)
- B3.4 `cake_topper_engine.py:668-671` (bare except → `overlap_area = 0.0`)
- B3.5 `cake_topper_engine.py:690-707` (bare except around union/difference/buffer)
- B3.6 `cake_topper_engine.py:710-715` (bare except, silently skips ring/text proximity check)
- B3.7 `outline_extractor.py:83-91` (glyph draw failure indistinguishable from intentional empty glyph)
- B3.8 `fontStructuralScores.json` orphaned / not wired into any consumer

**Fix approach**:
- B3.1: add a simple in-process lock (or rely on filesystem rename atomicity) around duplicate-check + write; return an explicit "duplicate detected" vs. "write failed" distinction.
- B3.2: add a file lock (e.g. `filelock` or an OS-level advisory lock) around `_write`.
- B3.3: delete `_merge_overlapping` if confirmed dead (verify via repo-wide grep for call sites first — do not delete speculatively without confirming zero references).
- B3.4–B3.6: narrow the except clauses to actual Shapely exception types, log when triggered (these are in a hot path — logging must not be spammy, so log once per request with aggregate counts, not per-operation).
- B3.7: log when a glyph draw failure occurs so it's distinguishable from an intentional empty glyph in support/debugging, without changing returned geometry.
- B3.8 (decision confirmed 2026-06-21: font fragility scoring is a **live** feature direction): wire `fontStructuralScores.json` into the font picker/scoring consumer it was built for. Identify the intended consumer (frontend font ranking display referenced in prior session work) and connect the existing generated scores rather than leaving them orphaned. If the consumer-side code already expects this data under a different key/shape, reconcile the export format in `font_fragility_analysis.py` to match rather than duplicating a second scoring path.
- **Regression tests**: targeted unit tests per item where behavior changes (B3.1, B3.3 if deleted); the rest are logging-only changes validated by manual log inspection plus full suite green. B3.8 additionally needs a new test asserting the font picker/consumer renders scores for a font present in `fontStructuralScores.json`, and degrades gracefully (no crash, falls back to "Other"/unranked) for a font missing from it.

---

# Batch 4 — Frontend Memory Leaks & Cleanup

- F4.1 `UploadDesignControl.tsx:53` — object URL leaked, not revoked on unmount
- F4.2 `SizingAssistantTab.tsx:74` — `previewUrl` blob not revoked on tab navigation away
- F4.3 `GlyphBrowserDrawer.tsx:64-69` — `FontFace` added to `document.fonts`, never removed
- F4.4 `PreviewPanel.tsx:50-54` — drag cleanup mutates DOM directly outside React's render cycle (decision confirmed 2026-06-21: intentional perf optimization, no fix — comment only, see below)

**Fix approach**:
- F4.1/F4.2: add `useEffect` cleanup functions that call `URL.revokeObjectURL` on unmount and whenever the tracked URL value changes (not just on the next upload).
- F4.3: track loaded `FontFace` objects in a ref/map keyed by font id; call `document.fonts.delete()` for any font no longer needed when the drawer closes or the font selection changes.
- F4.4: no behavior change. Add a one-line comment at `PreviewPanel.tsx:50-54` stating the direct DOM mutation is intentional (avoids React re-render cost for 60fps drag responsiveness) so a future contributor doesn't "fix" it into state-driven updates and reintroduce jank.
- **Regression tests**:
  - Frontend test: mount/unmount `UploadDesignControl` repeatedly with PNG uploads, spy on `URL.revokeObjectURL` and assert call count matches `createObjectURL` call count.
  - Frontend test: mount `GlyphBrowserDrawer`, open/close with different fonts repeatedly, assert `document.fonts.size` does not grow unbounded (or spy on `document.fonts.delete`).
  - Manual validation: Chrome DevTools Memory tab — heap snapshot before/after 20 upload+navigate-away cycles on Sizing Assistant, confirm blob URLs aren't retained.
  - Run `npm test` (currently 32 passing) — must stay green.

---

# Batch 5 — Frontend State & Validation Gaps

- F5.1 `CakeTopperPanel.tsx:240` — `defaultFontId` captured once at mount, no re-sync once fonts load
- F5.2 `CakeTopperPanel.tsx:638-664` — `resetDesigner` repeats the same fragile fallback
- F5.3 `SizingPreviewPanel.tsx:262-266` / `SizingRecommendationCard.tsx:280-284` — duplicated scale formula, can desync preview vs. export
- F5.4 `UploadDesignControl.tsx:24-61` — `processFile` has no try/catch around File API calls → unhandled rejection
- F5.5 `parseDesignDimensions.ts:42-55` — mismatched width/height units silently marked `dimensionsDetected: true` with `unit: "unknown"`
- F5.6 `ManualOverrideControls.tsx:18-23` — override fields silently adopt recommended values once populated
- F5.7 `OverlapPanel.tsx:57-61` — auto-select-first-font effect dependency gap (eslint-disabled)

**Fix approach**:
- F5.1/F5.2: derive default font id with a `useEffect` keyed on the fonts list becoming available (rather than computing once at mount), so the UI re-syncs once fonts finish loading. Extract the repeated fallback logic in F5.2 into one shared helper.
- F5.3: move the scale-back-out formula into the shared `engine/` module (alongside `calculateSizingRecommendation`) and import it in both components — single source of truth.
- F5.4: wrap `processFile` body in try/catch; on failure, set an error state surfaced in the UI (consistent with existing upload-error UI already used for unsupported file types).
- F5.5: when width/height units don't match, set `dimensionsDetected: false` and add a structured warning instead of silently guessing — this is a behavior change, confirm against existing warning UX patterns in `buildSizingWarnings.ts`.
- F5.6 (decision confirmed 2026-06-21): manual override values **lock once the user edits them** and stay independent of later recommendation changes — this matches the existing "Locked" aspect-ratio affordance already shown in the UI (`Manual override … Locked`), so the fix makes override-field behavior consistent with what the UI already implies. Concretely: once `manualOverride.enabled` is true and the user has touched a field, recommendation updates must not overwrite that field's value; only an explicit "reset to recommended" action (or disabling override) re-syncs it.
- F5.7: fix the dependency array to include `fontId` (or restructure the effect with an explicit guard) and remove the eslint-disable.
- **Regression tests**:
  - Frontend test: fonts load asynchronously after mount, assert the default font selection updates once data arrives (F5.1).
  - Frontend test: feed mismatched-unit SVG into `parseDesignDimensions`, assert it now returns `dimensionsDetected: false` plus a warning (F5.5) — add fixture SVG with `width="100mm" height="50px"`.
  - Frontend test: trigger a `file.text()` rejection (mock), assert UI shows an error state rather than an unhandled rejection in test output (F5.4).
  - Frontend test: scale formula in `SizingPreviewPanel` and `SizingRecommendationCard` both call the same exported engine function — assert via import, not just behavior (prevents re-duplication regressing silently).
  - Frontend test (F5.6): enable manual override, edit a field, trigger a recommendation recalculation (e.g. change product type), assert the edited field retains the user's value; assert disabling override or pressing reset re-syncs it to the recommendation.
  - Run `npm test` (32 passing) — must stay green; expect the count to grow with new fixtures.

---

# Batch 6 — Frontend Low-Severity / Logging-Only

- F6.1 `CakeTopperPanel.tsx:687-689` — `recordHistoryEntry(...).catch(() => {})` swallows errors with zero feedback
- F6.2 `App.tsx:45-46` — font-load error replaces whole workspace with no retry button
- F6.3 `CakeTopperPanel.tsx:404-408` + ~10 call sites — fire-and-forget reliance on `callApi`'s internal handling
- F6.4 `UploadDesignControl.tsx:26` — extensionless filename edge case (already falls through correctly, just undocumented)

**Fix approach**:
- F6.1: at minimum add `console.error` with context in the catch; consider a non-blocking toast since history logging failure shouldn't interrupt the main flow but should be visible to an operator debugging missing history rows.
- F6.2: add a "Retry" button that re-triggers the font-load fetch instead of a dead-end error message.
- F6.3: no code change — document the contract (every `callApi` caller relies on its internal try/catch) so a future refactor doesn't remove it silently. This is a documentation-only fix, tracked here for completeness.
- F6.4: no code change — add a one-line comment noting the fallthrough is intentional.
- **Regression tests**: F6.1/F6.2 get lightweight component tests (error path renders retry button; failed history call still logs). F6.3/F6.4 require no new tests (no behavior change).

---

# Sequencing & Dependencies

1. Batch 1 (high severity) — independent fixes, no ordering constraint between B1.1 and B1.2. Ship separately.
2. Batch 2 (medium, backend error handling) — depends on Batch 1 being merged first only for B2.10/B2.11, since both touch `models.py` validation near the font/ring config path exercised by the same test fixtures; otherwise independent.
3. Batch 3 (low, backend cleanup) — can run in parallel with Batch 2; no shared files.
4. Batch 4 (frontend leaks) — fully independent of all backend batches.
5. Batch 5 (frontend state/validation) — should follow Batch 4 only because F5.3's shared-engine extraction touches the same components as F4.1/F4.2 cleanup; do Batch 4 first to avoid merge conflicts, not because of a functional dependency.
6. Batch 6 (frontend low-severity) — independent, can be done anytime, last for priority reasons only.

Each batch gets its own commit(s) and its own `docs/deployment-log.md` entry, per existing project convention. No batch is bundled with another in a single commit.

---

# Test Matrix Summary

| Batch | New backend tests | New frontend tests | Existing suites that must stay green |
|---|---|---|---|
| 1 | 3 | 0 | `pytest -q` full suite (188) |
| 2 | 5+ | 0 | `pytest -q` full suite, esp. welding/overlap/golden-corpus |
| 3 | 1-2 | 0 | `pytest -q` full suite |
| 4 | 0 | 2+ | `npm test` full suite (32) |
| 5 | 0 | 4+ | `npm test` full suite |
| 6 | 0 | 2 | `npm test` full suite |

Every batch additionally requires:
- `npm run build` passes (frontend batches)
- Manual smoke test of the directly affected feature (Sizing Assistant tab, Cake Topper tab, or font picker) per existing deployment-log "Manual Validation" convention

---

# Decisions Log

All open questions from the initial plan were resolved 2026-06-21. No item below blocks the start of coding.

1. **B2.11 / B2.10 behavior change** — Confirmed: proceed with rejecting ring `overlap_mm` < 4.0mm at the API boundary (422) instead of returning `is_valid=False` in a 200. No existing client depends on the current contract.
2. **B1.1 font_id migration** — Confirmed: ship the one-time migration (remap old path-hash IDs to new content-hash IDs by filename match on manifest load) rather than accepting forced re-curation. See B1.1 fix approach for the residual gap (simultaneous rename+move still requires manual re-curation).
3. **F5.6 manual override semantics** — Confirmed: lock override values once user-edited; they stay independent of later recommendation changes until the user disables override or explicitly resets. Matches the existing "Locked" UI affordance.
4. **B3.8 fontStructuralScores.json** — Confirmed: font fragility scoring is a live feature direction. Wire the existing generated scores into the font picker/scoring consumer rather than leaving them orphaned.
5. **F4.4 PreviewPanel drag** — Confirmed: direct DOM mutation during drag is an intentional performance optimization. No behavior change; document with a code comment only.

---

# Deferred Items (2026-06-21)

Per explicit user instruction, the following items are **deferred** from this implementation pass because they change behavior against real, currently-working data/designs and the user's current solution "works perfectly" as-is. They remain documented here as known gaps, to be revisited deliberately later rather than rolled into this batch of fixes:

- **B2.10 / B2.11** (ring `overlap_mm` minimum promoted to a hard 422 rejection) — deferred. Existing saved/uploaded designs with ring overlap below 4.0mm would start failing outright instead of round-tripping with `is_valid=False`. The rest of Batch 2 (B2.1–B2.9) proceeds as planned; only the `models.py` constraint-promotion + ring-rejection test is held back.
- **F5.5** (mismatched-unit dimension parsing now blocks instead of silently guessing) — deferred. Risk of newly blocking real uploaded files that currently parse successfully under the silent-guess path. Rest of Batch 5 proceeds as planned.

All other items (B1.1, B1.2, B2.1–B2.9, B3.1–B3.8, F4.1–F4.4, F5.1–F5.4, F5.6, F5.7, F6.1–F6.4) proceed in this implementation pass.

---

# Acceptance Criteria (for this remediation effort as a whole)

- All Batch 1 (high severity) items fixed, tested, and deployed to `main` with deployment-log entries.
- All Batch 2/3 (backend medium/low) items fixed or explicitly deferred with a documented reason in this file.
- All Batch 4 (frontend leaks) items fixed and verified via DevTools memory snapshot.
- All Batch 5/6 (frontend medium/low) items fixed or explicitly deferred with a documented reason.
- Full backend (`pytest -q`) and frontend (`npm test`) suites green after every batch, with test counts increasing (not just staying flat) to reflect new regression coverage.
- All five Decisions Log items implemented as specified (no re-litigating during implementation).

---

# End of Document
