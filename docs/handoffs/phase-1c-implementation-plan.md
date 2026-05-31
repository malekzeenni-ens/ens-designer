# phase-1c-implementation-plan.md

## Document Information

Phase: 1C
Name: Production Hardening
Target Release: v0.3.0
Owner: Etch 'N' Shine
Date: 2026-05-31
Status: Ready For Approval

---

# 1. Executive Summary

Phase 1C hardens the Phase 1A and Phase 1B foundation into a production-ready tool for daily Etch 'N' Shine use.

The four deliverables are:

1. **Golden Test Corpus** — A documented, automated set of acceptance tests that must pass before every release. Includes specific font categories, name combinations, and expected connectivity outcomes.
2. **LightBurn Validation** — A documented process and evidence record confirming SVG imports correctly into LightBurn with correct dimensions, path quality, and cut behaviour.
3. **Manual Bridge Override** — Lightweight bridge add/remove/adjust capability in the UI. Not a CAD editor. User can correct automatic bridge decisions per letter gap.
4. **Production Presets** — Named presets that pre-fill common product settings (Name Sign, Cake Topper placeholder, Ornament, Nursery Sign). Saves operator time.

Phase 1C does not introduce new geometry engines, new font capabilities, or new connectivity logic. It stabilises and documents what Phases 1A and 1B delivered.

---

# 2. Current State (Baseline for Phase 1C)

## 2.1 What Is Working

| Capability | State |
|---|---|
| Text input + HarfBuzz shaping | Complete |
| Font outline extraction + Canonical Geometry | Complete |
| SVG export with correct mm dimensions | Complete |
| PNG export (CairoSVG primary, Pillow fallback) | Complete with known limitation |
| Natural connectivity detection (Shapely) | Complete |
| Letter compression (≤1.5mm/gap limit) | Complete |
| Structural bridge fallback (≤4mm gap) | Complete |
| Material profiles (Cast Acrylic, Mirror Acrylic, Plywood) | Complete |
| Validation scores + warnings | Complete |
| Material selector UI | Complete |
| Validation panel UI | Complete |
| 58 automated tests | Passing |

## 2.2 Known Open Items Carried From Phase 1B

| Item | Severity | Phase 1C Action |
|---|---|---|
| PNG Pillow fallback on Windows without Cairo DLLs | Medium | Revisit and document final position |
| Arial "Oliver" only partially bridged (3/5 skipped) | Medium | Include in golden corpus with documented expected output |
| Material thresholds are starting defaults | Medium | Tune against real shop tests during Phase 1C validation |
| No documented LightBurn import evidence | High | Deliver in Phase 1C |
| No manual bridge override | High | Deliver in Phase 1C |

---

# 3. Scope

## 3.1 Included

- Golden test corpus (automated + documented)
- LightBurn validation evidence and checklist
- Manual bridge override — add, remove, adjust per gap
- Production presets — Name Sign, Cake Topper placeholder, Ornament, Nursery Sign
- PNG rendering strategy decision
- Material threshold tuning based on real shop testing

## 3.2 Explicitly Excluded

- Cake topper stake geometry (Phase 2)
- Overlap Engine (Phase X)
- SVG import and repair (Phase 3)
- AI features
- DXF export
- Decorative asset library
- Batch processing
- Cloud functionality
- User accounts

---

# 4. Dependencies

## 4.1 No New Backend Dependencies

All required libraries are already installed. Phase 1C does not introduce new Python packages.

## 4.2 No New Frontend Dependencies

All required packages are already installed. No new npm packages required.

## 4.3 Existing Dependency Status

| Package | Current Version | Phase 1C Usage |
|---|---|---|
| fastapi | 0.136.3 | Existing API — two new endpoints added |
| shapely | 2.1.2 | Existing — no change |
| uharfbuzz | 0.54.1 | Existing — no change |
| fonttools | 4.59.0 | Existing — no change |
| svgwrite | 1.4.3 | Existing — no change |
| cairosvg | 2.8.2 | Existing — PNG rendering decision documented |
| pillow | 12.2.0 | Existing — fallback maintained |
| pytest | 8.4.1 | Existing — golden corpus tests added |

---

# 5. Repository Changes

## 5.1 New Files

```text
backend/app/bridge_override.py          Bridge override application logic
backend/app/presets.py                  Production preset definitions
backend/app/api/routes/presets.py       GET /api/presets endpoint
tests/test_phase_1c_golden_corpus.py    Golden test corpus — automated
tests/test_phase_1c_bridge_override.py  Bridge override tests

docs/handoffs/phase-1c-lightburn-validation.md   LightBurn evidence record
docs/handoffs/phase-1c-implementation-plan.md    This document
docs/handoffs/phase-1c-implementation-handoff.md Created at phase completion
docs/handoffs/phase-1c-completion-report.md      Created at phase completion
```

## 5.2 Modified Files

```text
backend/app/models.py                   Add BridgeOverride, BridgeOverrideRequest, Preset models
backend/app/generation_service.py       Accept bridge_overrides in generate()
backend/app/welding_engine.py           Apply bridge overrides before/after auto placement
backend/app/api/routes/generation.py    Accept bridge_overrides in POST /api/generate
backend/app/main.py                     Register /api/presets route
frontend/src/types/design.ts            Add BridgeOverride, Preset types
frontend/src/App.tsx                    Add preset selector; wire bridge override controls
frontend/src/components/ValidationPanel.tsx  Add bridge override row per gap
frontend/src/services/generationApi.ts  Pass bridge_overrides in generate request
```

## 5.3 No Change

```text
backend/app/connectivity_engine.py      No change
backend/app/shapely_converter.py        No change
backend/app/svg_exporter.py             No change
backend/app/png_exporter.py             No change
backend/app/canonical_geometry.py       No change
backend/app/font_loader.py              No change
backend/app/text_shaper.py              No change
backend/app/outline_extractor.py        No change
backend/app/material_profiles.py        No change — tuned via config not code
backend/app/material_validator.py       No change
frontend/src/components/FontSelector.tsx  No change
frontend/src/components/PreviewPanel.tsx  No change
frontend/src/components/ExportControls.tsx No change
```

---

# 6. Golden Test Corpus

## 6.1 Definition

The golden test corpus is a fixed set of test cases with documented expected outcomes that must pass before any release. It is the authoritative quality gate for Phases 1A and 1B functionality.

The corpus is automated via pytest. Each test case specifies:
- Input text
- Font category
- Material
- Expected strategy (natural / compression / bridge / disconnected)
- Expected components_after
- Expected score range
- Expected bridge count range

## 6.2 Required Name Set

| Name | Purpose |
|---|---|
| Oliver | Standard Latin name, 6 chars |
| Amelia | Standard Latin name, 6 chars |
| Muhammad | Longer name, 8 chars |
| O'Connor | Apostrophe handling |
| Léa | Accented character, NFC normalisation |
| Hannah | Palindrome |
| Ava-Rose | Hyphen |
| A | Single character minimum case |
| Happy Birthday | Multi-word — disconnected expected |

## 6.3 Required Font Categories

Each name in the corpus must be tested against at least one font from each category:

| Category | Example | Expected Behaviour |
|---|---|---|
| Script (connected) | Pacifico, Peanut Butter | Natural or bridge (0 compression) |
| Bold/Condensed | Anton | Bridge strategy, 0 compression |
| Sans-Serif | Arial | Bridge strategy, 0 compression |
| Serif | Georgia or Times | Bridge or natural |
| Decorative | Any available | Test-specific |

## 6.4 Required Material Combinations

Each corpus test must produce a valid result for all three approved materials:

- 3mm Cast Acrylic
- 3mm Mirror Acrylic
- 3mm Plywood

## 6.5 Expected Outcomes Per Strategy

| Strategy | Expected connectivity_score | Expected components_after |
|---|---|---|
| natural | 100 | 1 |
| compression | 95 | 1 |
| bridge (fully connected) | 80 | 1 |
| bridge (partially connected) | 35–65 | 2–5 |
| disconnected | 15–35 | >1 |

## 6.6 Corpus Invariants

Every corpus test must assert all of the following regardless of outcome:

1. HTTP 200 response
2. SVG response contains `<svg>` and at least one `<path>`
3. SVG `width` and `height` use `mm` units
4. PNG response has valid PNG header (`\x89PNG`)
5. `dimensions.width > 0` and `dimensions.height > 0`
6. `compression_amount_mm <= 1.5` (safety limit never exceeded)
7. No `merged-*` paths in Anton output (geometry not destructively merged)
8. Strategy is a valid value: `natural`, `compression`, `bridge`, or `disconnected`

## 6.7 Corpus Organisation

```python
# tests/test_phase_1c_golden_corpus.py

class TestGoldenCorpusScript:
    # Pacifico / Peanut Butter — natural or bridge, never compression

class TestGoldenCorpusAntón:
    # Anton — bridge only, never compression, never merged paths

class TestGoldenCorpusArial:
    # Arial — bridge, partial or full connection

class TestGoldenCorpusNames:
    # Oliver, Amelia, Muhammad, O'Connor, Léa across all font categories

class TestGoldenCorpusMaterials:
    # Each material produces valid output

class TestGoldenCorpusEdgeCases:
    # Single char, apostrophe, accented, hyphen, multi-word
```

---

# 7. LightBurn Validation Strategy

## 7.1 Purpose

Provide documented evidence that the SVG output from Phase 1A and Phase 1B imports correctly into LightBurn for production laser cutting.

This is a manual validation process. The evidence is documented in a permanent handoff record.

## 7.2 Validation Checklist

For each test case in the checklist, the operator must:

1. Generate the design using the application.
2. Download the SVG.
3. Open LightBurn.
4. File → Import → select the downloaded SVG.
5. Confirm:
   - Width and height match the application output in mm.
   - All letter paths are visible.
   - Bridges (if present) appear as connecting elements between letters.
   - No stray paths or geometry errors.
   - "Optimise" does not produce unexpected results.
6. Record the result: Pass / Fail / Notes.

## 7.3 Required Validation Cases

| Case | Font | Text | Material | Expected LightBurn Result |
|---|---|---|---|---|
| V-01 | Anton | Oliver | Cast Acrylic | Bridges visible between each letter pair |
| V-02 | Anton | Amelia | Cast Acrylic | Bridges visible |
| V-03 | Arial | Oliver | Cast Acrylic | 2+ bridges visible, some gaps remaining |
| V-04 | Pacifico (if available) | oliver | Cast Acrylic | Letters flowing without visible gaps |
| V-05 | Anton | Happy Birthday | Cast Acrylic | Two separate words with bridges in each |
| V-06 | Anton | Oliver | Mirror Acrylic | Same as V-01, confirm dimensions correct |
| V-07 | Anton | Oliver | Plywood | Same as V-01, confirm dimensions correct |

## 7.4 Evidence Record

Results are documented in:

`/docs/handoffs/phase-1c-lightburn-validation.md`

Format:

```markdown
| Case | Date | Operator | Result | LightBurn Version | Notes |
|---|---|---|---|---|---|
| V-01 | 2026-XX-XX | Malek | Pass | 1.6.xx | All 5 bridges visible |
```

## 7.5 PNG Rendering Decision

During Phase 1C validation, the PNG rendering strategy must be decided:

**Option A — Accept Pillow fallback:** Document the limitation clearly. PNG is for preview only, not production. SVG is the production source of truth.

**Option B — Install Cairo on Windows:** Use MSYS2 or pre-packaged DLLs to enable CairoSVG on this Windows machine. Recommended for better PNG quality.

**Option C — Use Inkscape CLI:** If Inkscape is installed, use it as the SVG-to-PNG renderer. Produces high-fidelity output without Cairo installation.

Recommendation: Document Option A as the short-term position and pursue Option B during Phase 1C if Cairo can be installed without complexity.

---

# 8. Manual Bridge Override

## 8.1 Design Principles

- Lightweight — not a CAD editor.
- Stateless — override specification is sent with each generate request, not stored server-side.
- Per-gap — each override targets one inter-glyph gap by index.
- Three operations only: add, remove, set_width.
- The bridge engine still runs first. Overrides are applied after automatic placement.

## 8.2 Bridge Override Model

```python
class BridgeOverrideAction(str, Enum):
    add    = "add"      # Force-add a bridge to this gap (even if engine skipped it)
    remove = "remove"   # Remove a bridge from this gap (even if engine placed it)
    set_width = "set_width"  # Change the width of the bridge at this gap

class BridgeOverride(BaseModel):
    pair_index: int               # 0 = gap between glyph[0] and glyph[1], etc.
    action: BridgeOverrideAction
    width_mm: float | None = None # Required only for set_width action
```

## 8.3 Updated Generate Request

```json
{
  "text": "Oliver",
  "font_id": "font-identifier",
  "material_id": "cast-acrylic-3mm",
  "welding_enabled": true,
  "bridge_overrides": [
    {"pair_index": 0, "action": "remove"},
    {"pair_index": 3, "action": "add"},
    {"pair_index": 4, "action": "set_width", "width_mm": 2.0}
  ]
}
```

`bridge_overrides` is optional. If empty or absent, the engine behaves as Phase 1B.

## 8.4 Override Processing Logic

In `bridge_override.py`:

```text
After apply_welding() runs automatically:

For each override in bridge_overrides:

  action = "remove":
    Find bridge path with matching pair_index.
    Remove it from geometry.paths.
    Decrement bridges_added.

  action = "add":
    Check whether this gap already has a bridge.
    If not: compute bridge geometry at this pair_index.
    Append to geometry.paths. Increment bridges_added.

  action = "set_width":
    Find bridge path at this pair_index.
    Recompute bridge with the specified width_mm.
    Replace bridge path.

Recount connected_components_after using updated paths.
```

## 8.5 UI Bridge Override Controls

After generation, the validation panel shows a bridge control row:

```
Bridges:
  Gap O→l  [+ Add]       (no bridge placed)
  Gap l→i  [✓ Bridge] [× Remove]
  Gap i→v  [✓ Bridge] [× Remove]
  Gap v→e  [+ Add]       (no bridge placed)
  Gap e→r  [✓ Bridge] [× Remove]
```

Each button click:
- Updates the frontend state (bridge_overrides list)
- Re-calls POST /api/generate with the new overrides
- Updates the preview and validation panel

No drag-and-drop. No resizing handles. No path editing.

Width adjustment: an optional numeric input per gap that appears when a bridge is present:

```
  Gap l→i  [✓ Bridge] [× Remove]  Width: [1.5] mm
```

## 8.6 Validation

Bridge override inputs must be validated:
- `pair_index` must be in range `[0, num_glyphs - 2]`
- `width_mm` for set_width must be `>= material.minimum_bridge_width_mm`
- `width_mm` must be `<= 5.0mm` (maximum practical bridge width)

---

# 9. Production Presets

## 9.1 Purpose

Presets pre-fill common product settings so operators do not need to configure them manually for every job. A preset is a named collection of default values — it does not change the generation engine.

## 9.2 Approved Presets for Phase 1C

| Preset | Material Default | Notes |
|---|---|---|
| Name Sign | 3mm Cast Acrylic | Most common product |
| Cake Topper | 3mm Cast Acrylic | Placeholder — full Cake Topper logic is Phase 2 |
| Ornament | 3mm Mirror Acrylic | Mirror finish common for ornaments |
| Nursery Sign | 3mm Plywood | Plywood common for nursery signs |

## 9.3 Preset Model

```python
class Preset(BaseModel):
    preset_id: str
    preset_name: str
    default_material_id: str
    description: str
```

## 9.4 API Endpoint

```
GET /api/presets
```

Response:

```json
[
  {
    "preset_id": "name-sign",
    "preset_name": "Name Sign",
    "default_material_id": "cast-acrylic-3mm",
    "description": "Standard name sign. 3mm Cast Acrylic."
  },
  ...
]
```

## 9.5 UI Integration

The controls area gains a Preset selector:

```
Preset       Text              Font Search    Font              Material
[ Name Sign ▾]  [ Oliver    ]  [ anton   ]   [ Anton (Regular) ▾]  [ 3mm Cast Acrylic ▾]
```

Selecting a preset pre-fills the Material field. The user can still override it manually.

The Preset field is optional. It is purely a UI convenience and does not affect generation logic.

---

# 10. Testing Strategy

## 10.1 Golden Corpus Tests (New)

File: `tests/test_phase_1c_golden_corpus.py`

Covers: all font categories × required name set × all materials.

Run command:
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_phase_1c_golden_corpus.py -v
```

## 10.2 Bridge Override Tests (New)

File: `tests/test_phase_1c_bridge_override.py`

| Test | Description |
|---|---|
| test_bridge_add_places_bridge_at_gap | Force-add a bridge at a pair that was skipped |
| test_bridge_remove_removes_placed_bridge | Remove a bridge that was auto-placed |
| test_bridge_set_width_adjusts_bridge | Override width of a placed bridge |
| test_bridge_override_out_of_range_rejected | pair_index out of range returns 400 |
| test_bridge_width_below_minimum_rejected | width_mm < min returns 400 |
| test_bridge_width_above_maximum_rejected | width_mm > 5mm returns 400 |
| test_empty_overrides_behaves_as_phase_1b | No override = same result as Phase 1B |
| test_remove_all_bridges_gives_disconnected | Removing all bridges returns "disconnected" |

## 10.3 Preset Tests (New)

| Test | Description |
|---|---|
| test_presets_endpoint_returns_four_presets | GET /api/presets returns all 4 presets |
| test_preset_ids_are_correct | Verify preset_ids match expected values |
| test_preset_material_ids_are_valid | Verify default material_id is a valid material |

## 10.4 Regression Tests (Must Continue Passing)

All 58 existing tests must pass after Phase 1C changes:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/ -q
```

Expected: all tests pass.

## 10.5 Manual LightBurn Validation

Execute the LightBurn validation checklist in Section 7.3 and record results in the evidence document.

---

# 11. Risk Assessment

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-01 | Bridge override creates an infinite regeneration loop in the UI if each click causes a visible layout change | Medium | Debounce the re-generate call; add a manual "Regenerate" step rather than auto-regenerating on every click |
| R-02 | Force-adding a bridge at a gap that is too large produces a visually poor result | Medium | Display a warning if user force-adds at a gap > 4mm; do not block, just warn |
| R-03 | Golden corpus reveals that some font/name combinations produce inconsistent results between runs | Low | Document known inconsistencies in the corpus; add deterministic seed to any random elements |
| R-04 | Pillow PNG fallback produces incorrect counter rendering | Medium | Document clearly that PNG is preview only; do not unblock production on PNG quality |
| R-05 | LightBurn validation reveals dimensional scaling errors for some fonts | High | Test all three materials in LightBurn before accepting Phase 1C |
| R-06 | Production presets create pressure to add Cake Topper stake logic to Phase 1C | High | Cake Topper preset is a PLACEHOLDER only — no stake geometry. Document this boundary explicitly |
| R-07 | Bridge override UI encourages users to add too many bridges, degrading design quality | Low | Add a maximum bridge count warning (e.g., warn if > 6 bridges in one design) |

---

# 12. Development Sequence

## Step 1 — Production Presets (1–2 days)

Deliverable: GET /api/presets endpoint + frontend preset selector.

This is the simplest item and builds confidence before the more complex bridge override work.

Tasks:
- Create `backend/app/presets.py` with four preset definitions
- Create `backend/app/api/routes/presets.py` with GET endpoint
- Register route in `main.py`
- Update `frontend/src/types/design.ts` with Preset type
- Add preset selector to `App.tsx`
- Write preset tests

Exit criterion: GET /api/presets returns 4 presets; selector pre-fills material.

## Step 2 — Bridge Override Backend (2–3 days)

Deliverable: POST /api/generate accepts `bridge_overrides` and applies them.

Tasks:
- Add `BridgeOverride` model to `models.py`
- Create `backend/app/bridge_override.py` with override application logic
- Update `generation_service.py` to call override logic after `apply_welding()`
- Update `api/routes/generation.py` to accept and validate `bridge_overrides`
- Write bridge override backend tests

Exit criterion: force-add and remove bridge operations produce correct SVG output.

## Step 3 — Bridge Override UI (2–3 days)

Deliverable: User can add/remove/adjust bridges from the validation panel.

Tasks:
- Update `ValidationPanel.tsx` to show bridge state per gap
- Add add/remove buttons per gap
- Add width input for placed bridges
- Wire buttons to update frontend override state and re-call generate
- Update `generationApi.ts` to pass `bridge_overrides`

Exit criterion: clicking "Remove" on a bridge removes it from the preview and SVG.

## Step 4 — Golden Test Corpus (2–3 days)

Deliverable: Automated corpus covering all required combinations.

Tasks:
- Create `tests/test_phase_1c_golden_corpus.py`
- Define expected outcomes for each font category and name
- Run corpus against all three materials
- Document any known expected failures (e.g., Arial partial connectivity)
- Run full test suite to confirm no regressions

Exit criterion: corpus tests pass for Anton, Arial, and all required names.

## Step 5 — LightBurn Validation (1–2 days)

Deliverable: Evidence document with all validation cases recorded.

Tasks:
- Execute all 7 LightBurn validation cases in Section 7.3
- Record results in `phase-1c-lightburn-validation.md`
- Document PNG rendering decision
- Note any dimensional discrepancies found and whether they are acceptable
- Tune material thresholds if real shop test results justify changes

Exit criterion: all 7 cases recorded; Pass/Fail documented; dimensional accuracy confirmed.

## Step 6 — Documentation and Handoff (1 day)

Tasks:
- Update `docs/phases/PHASE_03_CAKE_TOPPER_GENERATOR_IMPLEMENTATION.md` status to Completed
- Create `docs/handoffs/phase-1c-implementation-handoff.md`
- Create `docs/handoffs/phase-1c-completion-report.md`
- Update `README.md` with Phase 1C status
- Create git commit: `feat: phase 1c production hardening`
- Tag: `v0.3.0`

Exit criterion: all documentation complete; commit and tag created.

---

# 13. Acceptance Criteria

Phase 1C is complete when ALL of the following are true:

| Criterion | Validation Method |
|---|---|
| Golden corpus passes for Anton, Arial, and required names | Automated — pytest |
| Golden corpus passes for all 3 materials | Automated — pytest |
| All 58 existing Phase 1A/1B tests still pass | Automated — pytest |
| Bridge override — add places a bridge | Automated + manual |
| Bridge override — remove removes a bridge | Automated + manual |
| Bridge override — set_width changes bridge width | Automated + manual |
| Bridge override — invalid inputs return 400 | Automated |
| Production presets — 4 presets available in UI | Manual |
| Preset selector pre-fills material | Manual |
| LightBurn validation — all 7 cases recorded | Manual (documented) |
| LightBurn import — SVG dimensions correct in LightBurn | Manual (documented) |
| PNG rendering strategy decision documented | Document review |
| No cake topper stake geometry implemented | Scope review |
| No Phase X overlap engine features implemented | Scope review |
| `phase-1c-implementation-handoff.md` complete | Document review |
| `phase-1c-completion-report.md` complete | Document review |

---

# 14. Handoff Documents

| Document | Created When |
|---|---|
| `phase-1c-implementation-plan.md` | This document — created during planning |
| `phase-1c-lightburn-validation.md` | Created during Step 5 |
| `phase-1c-implementation-handoff.md` | Created at phase completion |
| `phase-1c-completion-report.md` | Created at phase completion |

---

# 15. Stop Condition

After Phase 1C is complete:

STOP.

Do not begin Phase X (Overlap Engine) or Phase 2 (Cake Topper).

Wait for approval and QA review.

---

# 16. Approval

Approved By: Pending

Approval Date: Pending
