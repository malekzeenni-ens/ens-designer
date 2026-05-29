# phase-1a-implementation-plan.md

## Phase Information

Phase Number:

1A

Phase Name:

Core Text Generation

Target Release:

v0.1.0

Owner:

Etch 'N' Shine

Date:

2026-05-30

Status:

Ready For Approval

---

# Executive Summary

Phase 1A will build the deterministic text-to-vector foundation for the AI SVG Generator.

The approved workflow is:

Text Input
-> Font Selection
-> Unicode Normalisation
-> HarfBuzz Text Shaping
-> Font Outline Extraction
-> Canonical Geometry Model
-> SVG Export
-> PNG Export
-> Preview

The business outcome is to prove that Etch 'N' Shine can generate accurate, LightBurn-compatible text outlines from selected fonts without starting welding, bridge generation, material validation, AI, DXF, SVG import, cake topper, batch, cloud, or multi-user scope.

---

# Scope

## Included

- Local web application foundation
- Text input
- Font selection from local font files
- Unicode normalisation
- HarfBuzz text shaping
- Font outline extraction
- Minimum Canonical Geometry Model
- SVG export
- PNG export
- SVG preview
- Basic local file export
- Phase 1A tests
- Phase 1A documentation and handoff

---

## Excluded

- Welding
- Bridge generation
- Material validation
- Structural validation
- Cake topper generation
- SVG import and repair
- AI functionality
- AI graphic generation
- DXF export
- Decorative asset library
- Batch processing
- SaaS functionality
- Multi-user functionality
- Cloud functionality

---

# Requirements Mapping

| Requirement ID | Description | Included |
|---|---|---|
| FR-001 | User enters a name | Yes |
| FR-002 | User selects a font | Yes |
| FR-003 | System normalises and shapes text using HarfBuzz | Yes |
| FR-004 | System extracts shaped font outlines | Yes |
| FR-005 | System creates canonical geometry | Yes |
| FR-006 | System generates SVG | Yes |
| FR-007 | System generates PNG | Yes |
| FR-008 | System displays preview | Yes |
| FR-009 | System exports files locally | Yes |
| FR-010 | System does not perform welding or bridge generation | Yes |

---

# Dependencies

## Frontend Dependencies

| Dependency | Purpose | Justification |
|---|---|---|
| React | UI rendering | Approved frontend framework. Suitable for the lightweight Phase 1A workflow. |
| TypeScript | Type safety | Approved frontend language. Reduces UI/API contract mistakes. |
| Vite | Frontend tooling | Approved development/build tool. Fast local iteration. |
| Tailwind CSS | Styling | Approved styling approach. Keeps UI simple and consistent. |

## Backend Dependencies

| Dependency | Purpose | Justification |
|---|---|---|
| Python | Backend runtime | Approved backend platform. Strong font and geometry ecosystem. |
| FastAPI | Local API layer | Supports the API-first local architecture without cloud or multi-user scope. |
| Uvicorn | Local ASGI server | Runs FastAPI locally during development and production packaging. |
| Pydantic | Request/response schemas | Useful for Canonical Geometry Model and API contract validation. |
| fontTools | Font metadata and outline extraction | Approved supporting library. Its pens model supports glyph outline inspection/manipulation. |
| uharfbuzz | HarfBuzz Python binding | Implements ADR-001 text shaping in Python. Current PyPI package supports Python >=3.10. |
| freetype-py | Font loading and glyph outline support | Approved supporting library for font access where needed. |
| svgwrite | SVG document assembly | Approved SVG library for initial SVG export. |
| CairoSVG | PNG conversion from SVG | Provides SVG-to-PNG conversion for Phase 1A supporting PNG export. |

## Test Dependencies

| Dependency | Purpose | Justification |
|---|---|---|
| pytest | Python unit/integration tests | Standard Python test runner. |
| Playwright | UI smoke tests and preview checks | Useful for validating local UI workflow and SVG preview without manual-only coverage. |

## Dependency Notes

- Exact package versions should be pinned at implementation time.
- No dependency may introduce cloud, user account, SaaS, AI, DXF, welding, bridge, or material validation scope.
- If uharfbuzz integration is blocked, stop and escalate before changing ADR-001.

---

# Repository Structure

Proposed Phase 1A structure:

```text
frontend/
  src/
    components/
      TextInput.tsx
      FontSelector.tsx
      PreviewPanel.tsx
      ExportControls.tsx
    services/
      generationApi.ts
    types/
      design.ts
    App.tsx
    main.tsx

backend/
  api/
    routes/
      fonts.py
      generation.py
  engines/
    font_engine/
      font_loader.py
      text_shaper.py
      outline_extractor.py
    geometry_engine/
      canonical_geometry.py
    export_engine/
      svg_exporter.py
      png_exporter.py
  models/
    requests.py
    responses.py
    geometry.py
  services/
    generation_service.py
  utils/
    unicode_normalisation.py

tests/
  unit/
    backend/
    frontend/
  integration/
  fixtures/
    fonts/
    expected/

fonts/
exports/
logs/
```

This structure is proposed for planning only. No files should be created until implementation approval.

---

# Technical Approach

## Frontend

The frontend should provide one simple workflow:

1. Enter text.
2. Select font.
3. Click Generate.
4. View preview.
5. Download SVG.
6. Download PNG.

No advanced editor, bridge controls, material controls, or AI controls should appear in Phase 1A.

## Backend

The backend should expose local API endpoints for:

- Listing available fonts.
- Generating a design from text and font selection.
- Exporting SVG.
- Exporting PNG.

The backend should orchestrate:

1. Input validation.
2. Unicode normalisation.
3. HarfBuzz shaping.
4. Font outline extraction.
5. Canonical geometry creation.
6. SVG export.
7. PNG export.

## Architecture

No ADR changes are required.

Phase 1A implements the already-approved decisions:

- ADR-001: HarfBuzz text shaping
- ADR-002: Canonical Geometry Model
- ADR-003: SVG-first export
- ADR-005: MVP scope guardrails

ADR-004 remains deferred to Phase 1B because material validation is explicitly out of Phase 1A scope.

---

# Files To Create

Planning approval is required before creating implementation files.

Expected implementation file categories:

- Frontend React components
- Frontend API service
- Backend API routes
- Backend font processing engine
- Backend canonical geometry model
- Backend SVG exporter
- Backend PNG exporter
- Tests and fixtures

---

# Files To Modify

Expected during implementation:

- README.md
- Relevant architecture documents if implementation details require documentation updates
- Phase 1A handoff document
- Test documentation

No approved ADR should be modified unless a critical technical blocker is discovered.

---

# Testing Strategy

See:

/docs/handoffs/phase-1a-test-strategy.md

---

# Risks

See:

/docs/handoffs/phase-1a-risk-assessment.md

---

# Acceptance Criteria

Phase 1A may be considered complete only when:

- User can enter text.
- User can select a font.
- Text is Unicode-normalised.
- Text is shaped through HarfBuzz.
- Font outlines are extracted.
- Canonical geometry is created.
- SVG is generated.
- PNG is generated.
- Preview displays the generated output.
- Outputs are local files.
- Tests pass.
- Documentation is updated.
- Phase 1A handoff is completed.
- No out-of-scope Phase 1B, 1C, or later features are implemented.

---

# Recommended Commit Message

For implementation phase only:

feat: phase 1a core text generation

---

# Recommended Release Tag

v0.1.0

---

# Approval

Approved By:

Pending

Approval Date:

Pending

