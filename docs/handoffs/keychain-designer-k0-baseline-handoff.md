# Keychain Designer K0 — Baseline handoff

Date: 2026-11-09 (Europe/London)

## 1. Executive summary

K0 establishes reproducible measurements and regression references before introducing the dedicated Keychain engine. The Python environment is healthy. Application runtime code and UI are unchanged.

## 2. Objectives completed

- Verified `.venv313` imports Shapely, uharfbuzz and FontTools successfully; the earlier import hang did not recur.
- Added a standalone benchmark with raw samples and stage p50/p95 timings.
- Captured and verified three Cake Topper SVG recipes for K1 parity.

## 3. Scope delivered

The benchmark runs the current Cake Topper outline + ring service, including PNG generation, for seven Latin names in Satisfy Regular, Anton Regular and Lora Regular, plus Arabic `سارة` in Cairo Regular: 22 cases. Arabic is not measured using unsupported Latin faces. `Mr Bear` retains the current word-per-line behaviour. This baseline does not provide the proposed final-size solver or new preview endpoint.

## 4. Files created

- `scripts/bench_keychain.py`
- `.gitattributes` (disables line-ending conversion for golden SVGs)
- `tests/test_keychain_baseline.py`
- `tests/fixtures/keychain_baseline/{defaults,outline-ring,two-stakes}.svg`
- `tests/fixtures/keychain_baseline/manifest.json`
- `docs/qa/keychain-k0-baseline.json`
- This handoff; the pre-existing uncommitted journey and implementation plan are included in the K0 commit.

## 5. Files modified

README, architecture overview, phase index, deployment log and the Keychain planning document statuses.

## 6. Technical decisions

- Pin bundled font files and SHA-256 hashes rather than relying on system font names. The golden manifest stores complete resolved requests.
- Compare UTF-8 SVG bytes without normalising geometry or formatting. The harness freezes the SVG recipe date to 2026-11-09 so future days do not cause false regressions.
- Keep golden SVG line endings unchanged by Git, including on Windows checkouts with `core.autocrlf` enabled.
- Refuse to overwrite an existing fixture directory. Checking fixtures also checks their stored hashes.
- Wrap existing service functions only inside the standalone benchmark. No production instrumentation or dependencies added.
- Measure service time, excluding catalog setup, HTTP and browser latency. Stage times are inclusive and cannot be added together; stages not called for a case record zero. The first observed call is recorded separately and does not guarantee a cold font or OS cache.

## 7. Architecture changes

None to runtime architecture. Standalone tooling and three parametrised regression tests prepare for the K1 shared-code changes.

## 8. Dependencies added

None. Baseline versions: Python 3.13.12, Shapely 2.1.2, uharfbuzz 0.54.1, FontTools 4.59.0, CairoSVG 2.8.2 and Pillow 12.2.0.

## 9. Database changes

No database changes introduced.

## 10. Testing performed

- Full backend suite: 218 passed; one existing Starlette/httpx deprecation warning.
- Date-frozen golden tests rerun after harness adjustment: 3 passed.
- Frontend runner: 18 files / 63 tests passed, exit 0. Reran with cmd.exe after PowerShell stderr redirection produced a misleading exit 1 despite passing tests.
- Standalone fixture check: three byte-identical SVGs; XML parse checked during capture.
- Fixture overwrite guard: an attempted second capture exits with the expected refusal and preserves the references.
- No browser or LightBurn validation claimed: K0 changes tooling only, and LightBurn acceptance remains K5 work.

## 11. Known issues

- Cairo native libraries are unavailable on this Windows machine. The unchanged service falls back to Pillow for PNG output; the benchmark records the actual renderer. Installing Cairo later changes the performance environment and requires a fresh timing report, not rewritten golden SVGs.
- Seven corpus cases warn that the ring does not touch the backing. These are existing baseline results, not new failures. Preserve them in K1; address auto-snap in K2.
- No dedicated Keychain tab, API or engine exists at K0.

## 12. Risks

Golden references depend on the exact font binaries and current SVG formatting, intentionally. A font change or intended output change requires explicit review rather than regenerating fixtures to make tests pass. Short benchmark runs and background machine activity affect tail timings.

## 13. Performance metrics

See `docs/qa/keychain-k0-baseline.json` for all 22 cases, 20 warm samples per case, dependency and font provenance, first-observed timings, response warnings and inclusive stage breakdowns. Final measurements are recorded after the test processes finish. The future 150 ms server-preview budget excludes PNG and is not directly equivalent to this current full-generation baseline.

Final run completed at 19:59:36 UTC / Europe/London on 2026-11-09. All 22 cases used Pillow. Per-case total p50 ranges from 123.722 to 527.828 ms; p95 from 150.191 to 759.178 ms. Selected totals:

| Font / name | p50 ms | p95 ms |
|---|---:|---:|
| Satisfy / Sarah | 476.588 | 573.054 |
| Anton / Sarah | 214.441 | 260.374 |
| Lora / Sarah | 362.270 | 426.079 |
| Cairo / سارة | 223.966 | 260.893 |

The highest p95 is Satisfy / Maximilian. These are diagnostic local measurements, not a guarantee of production latency. None of the measured full-generation case p95s meets the future preview-only 150 ms budget.

## 14. Documentation updated

README, architecture overview, phase index, Keychain plan and journey statuses, deployment log and this handoff. No governance documents modified.

## 15. Git information

Branch: `main`. Base: `582e9d1`. Milestone commit: `e3a481e518f51bfdc9f2fbbbd6cc29cc7e5649ee` (`chore(keychain): add baseline benchmark and cake topper golden fixtures`). Internal K0 milestone; no release tag or remote push.

## 16. Deployment information

Local tooling only; application servers were not restarted or redeployed. Rollback: revert the K0 commit. Runtime services are unchanged.

## 17. Recommendations for next phase

K1: introduce the font cache, optional loaded-font parameters, ring helper extraction, configurable history filename and optional geometry tolerance. Run all existing tests and these golden tests; require all three SVGs to remain byte-identical. Compare timings with the same bundled fonts, sample count and PNG renderer. Do not infer that font caching alone will resolve the live-preview budget: SVG assembly and PNG also consume substantial time. Stop and report at each milestone per the implementation plan.
