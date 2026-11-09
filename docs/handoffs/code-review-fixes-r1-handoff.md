# Code review fixes R1 handoff

Date: 9 November 2026, Europe/London. Baseline `303fc3d`; implementation HEAD `2fb95a0`, branch `main`.

## 1. Executive summary

The interrupted session had committed all five implementation phases before its API limit. This continuation completed phase 6 evidence recovery, fresh targeted regressions, written-export validation, benchmark remeasurement and documentation. F1–F13 and E1–E3 are implemented with passing correctness coverage. **Performance acceptance remains open:** the final sequential 22-case benchmark fails the unchanged 150 ms warm API p95 budget. LightBurn, physical cuts and the remaining K5 browser/OS-save checks are still pending. This is not manufacturing sign-off or an all-green acceptance report.

The critical correction is F1: Layered script text now cuts the welded silhouette, rather than overlapping individual glyphs. The earlier K5 validator missed that P0 defect. See the [per-finding register](../qa/CODE_REVIEW_R1_REGISTER.md) for reproduction, root cause, files, tests and status.

## 2. Objectives completed

- Recovered the failed session's plan, commits and completed verification logs; no abandoned verification process needed stopping.
- Confirmed implementation of F1–F13 and E1–E3; retained intentional contract changes explicitly.
- Fresh R1 backend regressions: 41 passed. Fresh written-export validator: six sample sets passed, including every cut layer's overlap check.
- Verified three Cake Topper golden SVGs remain byte-identical; regenerated evidence reproduces tracked sample bytes.
- Retained the previously uncommitted plan and benchmark, added a final sequential benchmark and corrected documentation that overstated K5 Layered safety.
- Recorded the failed performance gate as an open item rather than weakening the budget.

## 3. Scope delivered

Layered welding/overlap validation; atomic corruption-safe shared history; exports surviving history failure; Designer request ordering/current-output export gating/base-size preservation; safe SVG comments; font-hover cleanup; multi-mark offsets; drag cancellation; accent-preserving filenames; shared download cleanup; font-handle closure; SVG/cache/listener optimizations. Per-finding status is in the register. No §8 recommendation was implemented as extra scope.

## 4. Files created

Implementation commits created:

- `tests/test_keychain_r1.py`, `tests/test_history_r1.py`, `tests/test_code_review_r1.py`.
- `frontend/src/components/CakeTopperPanel.r1.test.tsx`, `PreviewPanel.drag.test.tsx`.
- `frontend/src/features/keychain/tests/r1History.test.tsx`, `r1FontHover.test.tsx`.
- `frontend/src/services/download.ts`.

This documentation completion adds:

- `docs/handoffs/code-review-fixes-implementation-plan.md` (recovered original plan).
- This handoff and `docs/qa/CODE_REVIEW_R1_REGISTER.md`.
- `docs/qa/keychain-r1-benchmark.json` (recovered final interrupted-session benchmark).
- `docs/qa/keychain-r1-resume-benchmark.json` (fresh sequential measurement).

Local ignored `logs/r1-*` files retain console evidence. They are local evidence, not portable committed artifacts; benchmark JSON and the sample validation report are committed.

## 5. Files modified

Backend: `backend/app/api/routes/{fonts,history,keychain}.py`, `cake_topper_engine.py`, `font_cache.py`, `generation_service.py`, `history_store.py`, `keychain_engine.py`, `keychain_history.py`, `keychain_validation.py`, `models.py`, `overlap_helpers.py`, `svg_exporter.py`.

Frontend: `CakeTopperPanel.tsx`, `ExportControls.tsx`, `FontPicker.tsx`, `PreviewPanel.tsx` and their contract tests under `frontend/src/components/`; Keychain `components/KeychainTab.tsx`, `services/keychainApi.ts`, `state/keychainTypes.ts`; shared `services/generationApi.ts` and `styles.css`.

Other: `scripts/keychain_validate_exports.py`, `tests/test_keychain_api.py`, `tests/test_keychain_foundations.py`, two Layered sample SVGs and `validation-report.json` under `docs/qa/keychain-k5-evidence/samples/`. Documentation changes are listed in section 14. For the exact implementation inventory use `git diff --name-status 303fc3d..2fb95a0`.

## 6. Technical decisions

- **D1:** Layered `CUT_TEXT` exports merged text geometry as compound polylines at export tolerance. Keeping the old per-glyph curves would preserve unsafe internal laser cuts; reconstructing welded Bézier curves was not necessary for this fix. Combined/separate text contours agree. Engraved `ENGRAVE_TEXT` retains original Q/C curves unless reinforced. Per-glyph hit targets remain available for editing. The outline regression allows <=0.05 mm deviation at 30/60/90 mm.
- History writes use a sibling temporary file, fsync and atomic replacement, with short Windows sharing retries. Corrupt files are preserved; unreadable files are not treated as empty. This replaces unsafe truncation in place without a database migration.
- Successful export generation is independent of history persistence. Additive `history_saved` and warnings explain partial success. ValueError remains 400, unexpected engine failures are generic 500, unavailable history endpoints 503.
- Designer exports require a result key matching current inputs; sequence/abort guards discard stale responses. Base changes regenerate inherited values while preserving explicit per-line overrides.
- SVG debug validation is disabled in known generation paths only with golden parity coverage. Font parsing runs outside the global cache lock with per-key deduplication and cache-clear protection.
- Budgets, golden fixtures, existing tests and geometry tolerances were not loosened to manufacture passing results.

## 7. Architecture changes

HistoryStore now centralizes atomic persistence and its unavailable-history error, reused by Keychain. The frontend has a shared download helper. No new service, reducer rewrite or export-manifest subsystem was introduced. Keychain responses add history-save status/warnings; current request/result tracking stays within existing Designer components.

## 8. Dependencies added

None. Native Cairo remains unavailable; existing Pillow fallback generated the PNG evidence. No package or lockfile upgrade was needed.

## 9. Database changes

No database changes introduced. Existing JSON histories keep their format; corrupt-byte backups are additive files created only on corrupt-history recovery. Tests used temporary roots. Owner data was not modified during this continuation.

## 10. Testing performed

### Unit and integration testing

The recovered full runs completed after code HEAD `2fb95a0`, before this documentation-only continuation; there were no intervening source edits:

| Check | Baseline | Final / result | Evidence |
|---|---:|---|---|
| Backend full suite | 332 | 374 passed; existing Starlette/httpx warning; 1129.63 s | `logs/r1-baseline-backend.log`, `logs/r1-backend-tests.log` |
| Frontend full suite | 115 / 24 files | 134 passed / 28 files; 26.48 s | `logs/r1-baseline-frontend.log`, `logs/r1-frontend-tests.log` |
| Frontend build | — | TypeScript + Vite pass; JS 421.34 kB (gzip 127.98), CSS 112.00 kB (gzip 19.66) | `logs/r1-build.log` |
| Fresh targeted backend | — | 41 passed, one existing warning; 61.76 s | `logs/r1-resume-regressions.log` |
| Cake Topper goldens | 3 | 3/3 byte-identical | `logs/r1-golden.log`; fresh `r1-resume-sequential-bench.log` |
| Fresh written export validator | 6 sets | 6/6 pass; each CUT layer overlap 0.0 mm² | `logs/r1-resume-export-validator.log`; sample `validation-report.json` |
| Fresh sequential performance gate | 22 cases × 20 warm calls | FAIL warm preview; all converge, zero production errors | `docs/qa/keychain-r1-resume-benchmark.json` |

Fresh commands:

```powershell
.\.venv313\Scripts\python.exe -m pytest -q -p no:cacheprovider tests/test_keychain_r1.py tests/test_history_r1.py tests/test_code_review_r1.py
.\.venv313\Scripts\python.exe scripts/keychain_validate_exports.py --out docs/qa/keychain-k5-evidence/samples
.\.venv313\Scripts\python.exe scripts/bench_keychain.py --keychain --iterations 20 --assert-budgets --check-fixtures --output logs/r1-resume-sequential-benchmark.json
git diff --check
```

The final benchmark JSON was copied byte-for-byte to `docs/qa/keychain-r1-resume-benchmark.json`. An earlier continuation benchmark overlapped targeted pytest and is retained only in ignored `logs/r1-resume-concurrent-benchmark.json`; it is not the committed final remeasurement. The final run had no other verification job started by this continuation running concurrently. Owner processes were left alone; this is not a controlled-host performance experiment.

Validator measures physical SVG dimensions/viewBox, 2 mm margins, actual hole size/winding, duplicate contours, every cut layer's pairwise overlap, expected groups, engraved curves, separate-file alignment, metadata round-trip and PNG alpha/colors. No real browser download is involved.

Original red-test evidence was not recovered for every finding. The continuation verified existing regression coverage and passing results; it did not retroactively claim test-first execution. The intentional generic 400→500 API assertion and immediate→delayed URL-revocation contract were consciously updated by the implementation. D1 narrows the Q/C validator assertion to engraved text while adding cut-overlap enforcement.

### Manual testing

No new browser, OS-save, LightBurn or physical test was performed. K5's prior Chrome evidence remains historical and partially complete. No real downloads, owner-server restart, laser action or LightBurn interaction occurred. No isolated server was needed.

## 11. Known issues

- **R1-PERF-01, open performance acceptance:** warm API p95 exceeds 150 ms in both the recovered final R1 report and fresh sequential remeasurement. Cause not established. No unmeasured claim of host contention or regression source is made. Profile before expanding optimization scope.
- **F14, deferred validation:** Cairo PNG resolution parity is unverified because native Cairo is absent.
- **K5-013, P3:** export success notice can shift layout under the pointer; documented, outside R1 scope.
- **K5-014 / browser gaps:** real OS save/destination remains unverified. Mid-drag cancel/lost-capture/Escape/tab switch, 50%/300% zoom, OS DPI/browser zoom, font listbox hover/Escape/support retry, 100-edit browser history and backend restart while editing remain pending. Automated R1 coverage does not replace browser acceptance.
- LightBurn imports, layer mapping and physical material cuts remain pending. Earlier Layered exports must be replaced with regenerated D1 samples before acceptance.

## 12. Risks

Manufacturing safety still depends on material/font/size and physical testing; geometric correctness is not a cut certificate. History durability uses the existing in-process store lock and filesystem replacement, not a new cross-process transactional database. Native browser download behavior remains unverified on the owner's configured destination. Performance targets are currently unmet for warm previews.

## 13. Performance metrics

| Worst across 22 cases | Recovered final R1 | Fresh sequential continuation | Budget |
|---|---:|---:|---:|
| Warm service p95 | See raw report | 286.472 ms | API gate below |
| Warm API p95 | 285.784 ms | 291.972 ms | <=150 ms — FAIL |
| Cold API | 307.602 ms | 315.815 ms | <=800 ms — PASS |
| Export incl. PNG | 494.415 ms | 443.038 ms | <=1500 ms — PASS |
| Validation-stage p95 | See raw report | 66.337 ms | No independent gate |
| Size convergence / production errors | 22/22; zero | 22/22; zero | PASS |

Fresh slow warm API cases: script Sarah 212.354 ms, Maximilian 291.972 ms, Mr Bear 203.606 ms; serif Maximilian 201.226 ms, Mr Bear 168.400 ms, fifi 159.757 ms. The JSON retains font hashes, requests, dependency versions, per-stage timings and individual samples. Times include TestClient/response processing, not browser/network latency. The historical K5 gate passed with worst API p95 100.2 ms; this is not a controlled paired comparison against the current measurements.

**E1 paired measurements recorded in implementation commit `2fb95a0`:** 22 Cake Topper cases, five iterations, outline + ring; sum of SVG-stage p50 values 674.6→36.0 ms; worst SVG p50 89.0→5.3 ms; median total 63.0→42.9 ms. This continuation recovered those numbers from the commit body, not raw paired reports, and did not rerun the before/after experiment. Golden parity is independently retained. E2/E3 have concurrency/registration regression evidence; no separate millisecond speedup is claimed.

## 14. Documentation updated

New register, this handoff, recovered R1 plan and both committed R1 benchmark reports. Updated `README.md`, `docs/deployment-log.md`, `docs/qa/KEYCHAIN_QA_MATRIX.md`, `KEYCHAIN_K5_DEFECT_REGISTER.md`, `KEYCHAIN_K5_VALIDATION_REPORT.md`, `docs/handoffs/keychain-designer-k5-hardening-handoff.md` and `docs/architecture/LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md`. Historical K5 observations are retained with explicit R1 correction. No governance document was edited.

## 15. Git information

Existing implementation commits, oldest first:

1. `2bf7406` — `fix(keychain): weld layered cut text into non-overlapping contours`
2. `eec09d1` — `fix(history): atomic corruption-safe history writes`
3. `b2f5e63` — `fix(designer): discard stale previews and keep export in sync`
4. `2e15880` — `fix: svg comment escaping, font picker preview, marks, filenames`
5. `2fb95a0` — `perf: faster cake topper svg assembly and font cache loading`

Documentation completion commit: `docs: complete R1 verification and handoff` (resolve hash with `git log -1 --format="%h %s"` after commit). Branch `main`; no new merge, release tag, push or PR. Working changes in this continuation are documentation/evidence only.

## 16. Deployment information

Local workspace verification only. No deployment date or production runtime change. Existing owner servers on 8010/8011 were not stopped or restarted; no launch/stop script was run. No owner JSON or golden fixture/hash was changed. Compiled build success is not a claim that the running server loaded the fixes.

Rollback, if later authorized: revert the five implementation commits newest first, keeping the documentation record, then rebuild and run regressions/goldens. Do not regenerate golden output to force parity. No rollback was performed here; no push/tag/deployment is authorized by this handoff.

## 17. Recommendations for next phase

1. Investigate R1-PERF-01 with controlled paired measurements and stage profiling; keep budgets and geometry accuracy unchanged. Do not call performance accepted based on the earlier F1 commit's passing statement.
2. Run remaining browser cases in an isolated server/temp history root; capture downloads without triggering the owner's real download destination, or let the operator set a safe destination before OS-save acceptance.
3. Have the operator import regenerated samples into LightBurn and perform material tests, including Layered welding/assembly, physical dimensions, hole/neck strength and minimum features. Do not drive hardware from this automated session.
4. Schedule plan §8 recommendations separately: Designer reducer rewrite, font-support lookup payload reduction (~53 MB first-load concern), Cairo parity, dead-code cleanup, K5-013 layout shift and Keychain export manifest.
