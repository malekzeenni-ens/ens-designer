# cake-topper-improvement-phase1-handoff.md

## Document Information

Feature: Cake Topper Tab
Phase: Improvement Phase 1 — Documentation Clarification and Low-Risk UX Copy
Date: 2026-06-01
Status: Complete

---

# 1. Phase Summary

Improvement Phase 1 addressed documentation accuracy and low-risk UX copy changes for the Cake Topper tab. No engine behaviour was modified, no API contracts were changed, and no new tests were added. All 119 existing tests continue to pass.

This phase was preceded by a full repository assessment (see planning output in session context) which identified the gaps addressed here.

---

# 2. Pre-Flight Checks

## TypeScript Build

```
npx tsc --noEmit
Exit code: 0 — clean, zero errors
```

The `floating_offsets` excess property in `buildLineConfigs()` is not caught by the TypeScript compiler in this context. This is documented as a Known Limitation and is a planned fix for Improvement Phase 2A.

## CairoSVG Status

CairoSVG Python package: **installed**.
Native library `libcairo-2.dll`: **NOT present on this Windows 11 machine**.

Consequence: All Cake Topper PNG previews are currently blank transparent images. SVG export is fully functional and unaffected.

This is documented in Section 17 of the updated feature specification and the QA matrix. It is a Phase 2A priority fix.

---

# 3. Files Changed

## Documentation

| File | Change |
|------|--------|
| `docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md` | US-01 wording updated; FR-CT-01 documents `MAX_LINES`; FR-CT-05 notes flat path assembly; FR-CT-06 notes PNG dependency; Known Limitations table expanded; Sections 13–18 added; Related Documents updated |
| `docs/qa/CAKE_TOPPER_QA_MATRIX.md` | Created — full QA matrix with 12 test areas, 65 test cases, LightBurn checklist |
| `docs/handoffs/cake-topper-improvement-phase1-handoff.md` | This file — created |

## Previously Untracked Files Committed

| File/Directory | Action |
|----------------|--------|
| `docs/prompts/cake_topper_recommendations_coding_agent_prompt.md` | Added to repository |
| `docs/reviews/cake_topper_spec_review.md` | Added to repository |

## Frontend

| File | Change |
|------|--------|
| `frontend/src/components/CakeTopperPanel.tsx` | Added permanent info banner above accordion cards — static text only, no logic change |
| `frontend/src/styles.css` | Added `.ct-info-notice` CSS rule for the info banner |

---

# 4. Behaviour Changed

| Change | Impact |
|--------|--------|
| Info banner added to Cake Topper UI | Visual only — a one-line notice now appears above the accordion cards informing the operator that visual overlap does not equal boolean union and LightBurn verification is required before cutting |
| Documentation reworded | No code impact. "Laser-ready SVG without any manual vector editing" in US-01 replaced with "LightBurn-compatible composition SVG requiring operator validation before cutting" |

---

# 5. Behaviour Intentionally Preserved

The following were explicitly not changed:

- Cake Topper engine algorithm (`cake_topper_engine.py`) — unchanged
- Floating component detection and offset logic (`floating_component.py`) — unchanged
- API request/response contract (`/api/cake-topper`) — unchanged
- Models (`models.py`) — unchanged
- SVG output structure — unchanged
- PNG export logic — unchanged (blank PNG issue documented but not fixed in this phase)
- Overlap Engine tab — unchanged
- Text Generator tab — unchanged
- All other endpoints — unchanged

---

# 6. New Documentation Added to Specification

| Section | Title | Content Summary |
|---------|-------|-----------------|
| 13 | Visual Overlap vs Boolean Union Behaviour | Explains flat path assembly, fill-rule=nonzero, what the engine does and does not do |
| 14 | Export Contract | SVG invariant table: units, viewBox, no text elements, fill-rule, no background, path ID prefixing, canvas padding |
| 15 | Cut-Readiness Disclaimer | Operator checklist before cutting; LightBurn verification steps |
| 16 | Error Handling Contract | HTTP 400/422 behaviour; frontend error display; known unhandled cases |
| 17 | Local Runtime and Startup | Backend and frontend start commands, ports, Python dependency table, CairoSVG on Windows, offline behaviour, font location, export download mechanism |
| 18 | Font Handling Rules | Supported formats, catalogue, missing font handling, missing glyph limitation, licensing note |

---

# 7. Tests Run

```
pytest tests/ -v
```

All 119 existing tests passed. No new tests were added in this phase.

No new tests were added in Phase 1. Cake Topper-specific automated tests are scoped to Improvement Phase 3.

---

# 8. Manual Checks Required After This Phase

Before committing, verify:

1. The frontend builds without TypeScript errors: `npx tsc --noEmit` → exit 0.
2. The info banner renders correctly in the Cake Topper tab — visible above the accordion cards, styled as a calm informational notice.
3. The banner does not appear in the Overlap Engine tab or Text Generator tab.
4. All existing generation behaviour is unchanged — generate "Happy Birthday" and confirm the preview renders normally.
5. The QA matrix document reads correctly and all links to referenced sections in the spec resolve.

---

# 9. Known Limitations Remaining After This Phase

| Limitation | Severity | Planned Phase |
|------------|----------|---------------|
| PNG preview is blank (libcairo-2.dll missing on Windows) | High | Improvement Phase 2A |
| Backend unavailable shows generic error, not "Start the local server" message | Medium | Improvement Phase 2A |
| Missing glyph produces no user warning | Medium | Improvement Phase 2A |
| TypeScript `CakeTopperLineConfig` missing `floating_offsets` field | Low | Improvement Phase 2A |
| Inter-line gap NaN guard missing (NaN propagates to backend) | Low | Improvement Phase 2A |
| No Cake Topper automated tests | High | Improvement Phase 3 |
| No LightBurn import formally validated on this machine | High | Manual — operator to perform |

---

# 10. Risks Introduced

None. All changes are documentation-only or static UI text. No logic was modified.

---

# 11. Recommended Next Phase

**Improvement Phase 2A — Export Contract, Validation, and Error Handling**

Priority items:
1. Fix PNG Pillow fallback in `cake_topper_engine.py` — blank image is not useful as a preview fallback.
2. Differentiate "backend not running" from other errors in the frontend.
3. Add missing glyph detection and user warning.
4. Fix TypeScript `CakeTopperLineConfig` type to include `floating_offsets`.
5. Add NaN guard for inter-line gap parsing.

Risk level: Low to Medium.

Before starting Phase 2A, run `pytest tests/ -v` to confirm baseline.
