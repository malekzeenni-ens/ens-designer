# Coding Agent Prompt

## Cake Topper Feature — Recommendation Planning, Phasing, and Safe Execution

You are acting as a **Senior Software Engineer**, **Solution Architect**, **Technical Product Owner**, and **QA Lead** for a locally running cake topper web application used by Etch 'N' Shine.

Your task is to review the current repository, compare the implemented Cake Topper feature against the attached specification and review recommendations, then plan and execute improvements safely in phases.

This is a local workshop tool, not a SaaS product. Do not over-engineer it. Do not introduce cloud services, accounts, subscriptions, remote storage, or multi-user functionality unless explicitly approved later.

The app is already working. Your role is to refine, document, harden, and improve it without breaking existing behaviour.

---

# 1. Core Context

The Cake Topper feature allows a user to create laser-cut cake topper designs by:

1. Entering a phrase such as `Happy Birthday Sarah`.
2. Splitting the phrase into lines.
3. Applying independent font, size, alignment, overlap, and floating-component controls per line.
4. Adjusting vertical gaps between lines.
5. Exporting a combined SVG and PNG preview.
6. Importing the SVG into LightBurn or similar laser software.

The current implementation is based around:

- A local web frontend.
- A local backend server.
- `backend/app/cake_topper_engine.py`.
- `CakeTopperService`.
- Font shaping through HarfBuzz.
- Outline extraction using FontTools.
- Canonical geometry/path processing.
- Per-line gap/overlap controls.
- Floating component detection and offset handling.
- Combined SVG export.
- PNG preview generation through CairoSVG primary and Pillow fallback.

The feature is currently considered implemented, but it requires formal Phase 2 documentation and refinement.

---

# 2. Critical Product Clarification

The current feature must **not** be treated as a guaranteed fully welded, structurally validated, laser-cut-ready generator unless the implementation actually proves that.

You must explicitly distinguish between:

- Visual overlap.
- SVG path grouping.
- Flat path assembly.
- Boolean path union.
- True vector welding.
- Structural validation.
- LightBurn import compatibility.
- Physical cut-readiness.

The current known limitation is that the app uses flat path assembly and does not perform boolean union, connectivity analysis, bridge generation, material validation, or structural scoring.

Therefore:

- Do **not** claim the app produces a guaranteed single-piece welded cake topper unless you implement and validate that functionality.
- Do **not** add boolean union, structural scoring, material validation, or bridge generation in the first phase.
- Do **not** change the existing geometry/export pipeline unless the change is clearly justified, tested, and low-risk.
- Prioritise documentation clarity, export contract, validation warnings, error handling, and QA coverage first.

---

# 3. Objectives

Your objectives are to:

1. Assess the current codebase and documentation.
2. Identify what is already implemented versus what is only specified.
3. Create a safe phased implementation plan.
4. Execute the approved low-risk improvements first.
5. Preserve existing working behaviour.
6. Improve developer handoff documentation.
7. Improve test coverage and QA confidence.
8. Ensure exported SVG behaviour is clearly documented and testable.
9. Add practical local-app hardening without turning the product into a SaaS app.
10. Flag any higher-risk recommendations before implementation.

---

# 4. Non-Negotiable Constraints

You must follow these constraints:

- Do not redesign the app from scratch.
- Do not replace the working Cake Topper engine unless there is a proven critical flaw.
- Do not introduce cloud dependencies.
- Do not introduce user accounts.
- Do not introduce SaaS architecture.
- Do not add boolean union in the first phase.
- Do not add material-aware structural scoring in the first phase.
- Do not add bridge generation in the first phase.
- Do not remove existing user-facing functionality.
- Do not break existing SVG/PNG export behaviour.
- Do not change the interpretation of existing overlap controls without documenting the impact.
- Do not silently alter units or scaling.
- Do not proceed with high-risk refactoring without documenting the risk and requesting approval.

---

# 5. Required Initial Repository Assessment

Before making changes, inspect the repository and produce a concise assessment covering:

## 5.1 Current Implementation Map

Identify:

- Frontend framework and entry points.
- Backend framework and entry points.
- Cake Topper UI components.
- Cake Topper API endpoint(s).
- `CakeTopperService` implementation.
- Font catalogue implementation.
- Outline extraction implementation.
- Floating component handling.
- SVG assembly logic.
- PNG export logic.
- Existing tests.
- Existing documentation and handoff files.

## 5.2 Behaviour Verification

Run or inspect tests where available.

Verify whether the current implementation already supports:

- Multi-line phrase generation.
- Per-line font selection.
- Per-line size control.
- Per-line alignment.
- Per-gap overlap controls.
- Negative vertical gap controls.
- Floating dot detection.
- Floating dot offset persistence.
- SVG export.
- PNG preview.
- LightBurn-compatible dimensions.
- Error handling.
- Missing glyph handling.
- Backend unavailable messaging.

## 5.3 Gap Classification

Classify gaps into:

- Documentation-only.
- Low-risk UX improvement.
- Low-risk backend validation.
- Export contract clarification.
- Error handling improvement.
- Test coverage improvement.
- Medium-risk implementation change.
- High-risk future enhancement.

Do not start coding until this classification is complete.

---

# 6. Recommended Phased Delivery Plan

Use the following phases unless the repository assessment proves a better order is necessary.

---

## Phase 1 — Specification Clarification and Low-Risk UX/Documentation Improvements

### Objective

Make the feature specification internally consistent and safer for future development without changing the core engine behaviour.

### Scope

Implement documentation and low-risk UI refinements only.

### Required Work

1. Update the Cake Topper feature specification to add:
   - “Visual Overlap vs Boolean Union Behaviour”.
   - “Export Contract”.
   - “Cut-Readiness and Operator Review”.
   - “LightBurn Import Validation Checklist”.
   - “Local Runtime and Startup”.
   - “Frontend vs Backend Responsibilities”.
   - “Error Handling Contract”.
   - “Known Limitations”.

2. Reword misleading claims:
   - Replace any unsupported “laser-ready without manual correction” wording.
   - Use wording such as “LightBurn-compatible composition SVG requiring operator validation”.
   - Clearly state that boolean union and structural validation are not currently performed.

3. Add or improve UI copy where low risk:
   - Show that PNG is preview-only.
   - Show that SVG is the production export.
   - Add note/warning that visual overlap does not guarantee structural validation.
   - Add reminder to verify final SVG in LightBurn before cutting.

4. Add local runtime documentation:
   - Backend start command.
   - Frontend start command.
   - Port configuration.
   - Offline behaviour.
   - Required dependencies.
   - Font location.
   - Export/download behaviour.

5. Add QA checklist documentation:
   - SVG imports into LightBurn.
   - Dimensions match metadata.
   - Counters remain visible.
   - No editable `<text>` elements.
   - No unwanted background rectangle.
   - PNG is preview only.

### Acceptance Criteria

- Documentation clearly distinguishes visual overlap from boolean union.
- Documentation clearly states current limitations.
- No existing generation/export behaviour changes unless explicitly documented.
- Existing tests still pass.
- Existing SVG exports remain compatible with the current workflow.

### Risk Level

Low.

---

## Phase 2 — Export Contract, Validation Warnings, and Error Handling

### Objective

Improve user confidence and reduce failed exports without implementing complex structural validation.

### Scope

Add practical validation and error handling around the existing implementation.

### Required Work

1. Define and enforce an SVG export contract:
   - SVG uses millimetre dimensions.
   - SVG has a matching `viewBox`.
   - SVG contains outline/path geometry, not editable `<text>` elements.
   - SVG excludes hidden guides and background rectangles.
   - SVG output preserves expected physical size.
   - `fill-rule` behaviour is documented and tested.

2. Add practical validation warnings:
   - Empty input.
   - Too many lines/words.
   - Unsupported characters or missing glyphs.
   - Font load failure.
   - Export generation failure.
   - PNG preview fallback warning if CairoSVG is unavailable.
   - “Visual overlap only — not boolean unioned” warning where relevant.

3. Add structured backend error responses:
   - Error code.
   - User-facing message.
   - Developer/debug message.
   - Affected field or line index where applicable.

4. Add frontend handling for:
   - Backend unavailable.
   - Font cannot load.
   - SVG export fails.
   - PNG preview fails.
   - Unsupported characters.

5. Add minimal logging:
   - Generation failures.
   - Font load failures.
   - Export failures.
   - Request validation failures.

### Acceptance Criteria

- Invalid requests fail gracefully.
- Export errors are visible to the user.
- Missing fonts/glyphs are reported clearly.
- SVG export invariants are testable.
- No boolean union or structural scoring is introduced.
- Existing successful generation paths continue to work.

### Risk Level

Low to medium.

---

## Phase 3 — Test Coverage and QA Hardening

### Objective

Add confidence that the feature behaves correctly across fonts, words, counters, export, and local runtime failures.

### Scope

Add tests and QA artefacts without major architecture changes.

### Required Work

Create or update tests for:

1. Functional generation:
   - `Happy Birthday` splits correctly.
   - Per-line font changes remain isolated.
   - Per-line size changes remain isolated.
   - Negative vertical gaps move lines upward.

2. Font and glyph handling:
   - Supported script fonts.
   - Supported non-script fonts.
   - Missing font.
   - Unsupported glyph.

3. Counters and floating components:
   - Letters: `a`, `e`, `o`, `b`, `d`, `p`.
   - Numbers: `0`, `6`, `8`, `9`.
   - Floating dot controls for `i` and `j`.
   - Dot controls remain visible after moving dot toward stroke.

4. Export:
   - SVG contains no `<text>` elements.
   - SVG uses mm dimensions.
   - SVG viewBox matches metadata.
   - PNG preview generation works or fails gracefully.

5. API and local runtime:
   - `/api/cake-topper` success response.
   - Validation error response.
   - Backend unavailable frontend handling where practical.

6. Regression tests:
   - Existing known-good examples continue to export successfully.

### Acceptance Criteria

- Tests cover critical paths and failure paths.
- All existing tests pass.
- New tests pass.
- QA checklist is documented.
- Any manual LightBurn validation steps are listed separately.

### Risk Level

Low.

---

## Phase 4 — Internal Architecture and Maintainability Improvements

### Objective

Improve maintainability while avoiding unnecessary refactoring.

### Scope

Small modular improvements only where clearly beneficial.

### Required Work

1. Document module responsibilities:
   - Frontend components.
   - Backend service.
   - Font catalogue.
   - Outline extraction.
   - Geometry model.
   - Floating component module.
   - Export module.
   - Validation module.

2. If useful and low risk, separate validation logic from generation logic.

3. If useful and low risk, centralise export constants:
   - Units.
   - Padding.
   - Fill/stroke conventions.
   - ViewBox generation.
   - File naming.

4. Add developer handoff notes:
   - Files changed.
   - Why changed.
   - Tests run.
   - Known limitations.
   - Next recommended phase.

### Acceptance Criteria

- Code remains easy to understand.
- Existing engine behaviour is preserved.
- Documentation reflects the actual implementation.
- No unnecessary abstraction is added.

### Risk Level

Low to medium.

---

## Phase 5 — Optional Future Enhancements Only After Approval

Do not implement these unless explicitly approved.

Potential future enhancements:

- Boolean path union/welding.
- Connectivity analysis.
- Minimum bridge/feature thickness checks.
- Material-aware structural validation.
- Stake geometry generation.
- Preset topper layouts.
- Manual line-break mode.
- LightBurn layer assignment.
- Physical test-cut logging.

For each future enhancement, produce a separate proposal first including:

- Business value.
- Technical approach.
- Risks.
- Dependencies.
- Test strategy.
- Impact on current behaviour.
- Rollback plan.

---

# 7. Required Documentation Updates

Before and after each phase, update the relevant documentation.

At minimum, inspect and update where applicable:

- Cake Topper feature specification.
- Phase documentation.
- Handoff documentation.
- Architecture overview.
- API reference.
- Testing/QA notes.
- Known limitations.
- Local setup instructions.

If documentation files do not exist, create appropriately named files under the existing documentation structure. Do not create a confusing new structure if one already exists.

Recommended document names if missing:

- `docs/features/CAKE_TOPPER_FEATURE_SPECIFICATION.md`
- `docs/features/CAKE_TOPPER_EXPORT_CONTRACT.md`
- `docs/features/CAKE_TOPPER_LIGHTBURN_QA_CHECKLIST.md`
- `docs/handoffs/cake-topper-recommendations-implementation-handoff.md`
- `docs/testing/CAKE_TOPPER_QA_MATRIX.md`

Use the repository’s existing naming conventions if they differ.

---

# 8. Required QA Matrix

Create or update a QA matrix covering:

| Test Area | Scenario | Expected Result | Priority | Automated / Manual |
| --------- | -------- | --------------- | -------- | ------------------ |
| Script fonts | Generate `Happy Birthday` using script font | Smooth outlines, counters preserved | P0 | Manual + automated where possible |
| Non-script fonts | Generate `Sarah` using bold font | Overlap controls work | P0 | Automated where possible |
| Short names | Generate `Mia` | Correct layout | P1 | Manual |
| Long names | Generate long phrase | Graceful line limit handling | P0 | Automated |
| Counter letters | Test `a e o b d p` | Counters visible | P0 | Manual + SVG inspection |
| Counter numbers | Test `0 6 8 9` | Counters visible | P0 | Manual + SVG inspection |
| Floating dots | Test `i` and `j` | Dot controls appear and persist | P0 | Automated where possible |
| Vertical overlap | Negative inter-line gap | Lines overlap visually | P0 | Automated + manual |
| SVG export | Download SVG | Paths only, mm dimensions, valid viewBox | P0 | Automated |
| PNG export | Download PNG | Preview generated or graceful fallback | P1 | Automated |
| LightBurn import | Import SVG manually | Correct dimensions and visible paths | P0 | Manual |
| Backend unavailable | Stop backend | User sees clear error | P0 | Manual |
| Missing font | Use unavailable font | Clear error and export blocked | P0 | Automated |
| Unsupported glyph | Use unsupported character | Clear warning | P1 | Automated |

---

# 9. Required Output From You Before Coding

Before making code changes, produce:

1. Repository assessment summary.
2. Current implementation map.
3. Gap classification.
4. Proposed phase plan.
5. Files you expect to modify.
6. Tests you expect to add or run.
7. Risks and mitigations.
8. Confirmation of what will not be changed.

Do not proceed to implementation until this planning output is complete.

---

# 10. Required Output After Each Phase

After each phase, produce a handoff summary including:

1. Phase completed.
2. Files changed.
3. Behaviour changed.
4. Behaviour intentionally preserved.
5. Tests run.
6. Test results.
7. Manual QA required.
8. Known limitations remaining.
9. Risks introduced, if any.
10. Recommended next phase.

---

# 11. Acceptance Rules

A phase is not complete unless:

- Code compiles/builds where applicable.
- Existing tests pass.
- New tests pass where added.
- Documentation is updated.
- Behaviour changes are explicitly listed.
- Any user-facing wording is accurate and not misleading.
- The implementation does not overclaim cut-readiness.
- The handoff document is updated.

---

# 12. Final Instruction

Start by assessing the repository and documentation only.

Do not immediately refactor.
Do not immediately implement boolean union.
Do not immediately add material scoring.
Do not redesign the UX.

First, prove what currently exists, then plan the safest phased path to implement the recommendations.
