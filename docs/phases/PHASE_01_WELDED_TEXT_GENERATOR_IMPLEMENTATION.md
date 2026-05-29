# PHASE_01_WELDED_TEXT_GENERATOR_IMPLEMENTATION.md

## Phase Information

Phase: 1A

Name: Core Text Generation

Target Release: v0.1.0

Status: Ready For Development

---

# Objective

Deliver the first working version of the AI SVG Generator capable of shaping text, extracting font outlines, creating canonical geometry, and exporting SVG and PNG files.

This phase establishes the deterministic text and export foundation for all future phases.

---

# Business Outcome

Reduce the time required to create initial laser-design text geometry from several minutes to less than 30 seconds.

Welding, bridge generation, material validation, and production hardening are handled in Phase 1B and Phase 1C.

---

# Scope

## Included

- Name input
- Font selection
- Font preview
- Unicode normalisation
- HarfBuzz text shaping
- Font outline extraction
- Canonical Geometry Model
- SVG generation
- PNG generation
- SVG preview
- Export functionality
- Error handling
- Logging

---

## Excluded

- Cake toppers
- Welding
- Bridge generation
- Material validation
- Decorative libraries
- AI-generated graphics
- Cloud deployment
- User accounts
- Project sharing
- Cloud functionality

---

# Functional Requirements

## FR-001

User enters a name.

---

## FR-002

User selects a font.

---

## FR-003

System normalises and shapes text using HarfBuzz.

---

## FR-004

System extracts shaped font outlines.

---

## FR-005

System creates canonical geometry.

---

## FR-006

System generates SVG.

---

## FR-007

System generates PNG.

---

## FR-008

System displays preview.

---

## FR-009

System exports files locally.

---

## FR-010

System does not perform welding or bridge generation in Phase 1A.

---

# Technical Deliverables

## Frontend

Create:

- Text input component
- Font selector
- Preview canvas
- Validation panel
- Export controls

---

## Backend

Create:

- Font engine
- SVG engine
- Export engine

---

# Suggested Folder Structure

/frontend

/backend

/docs

/tests

/fonts

/exports

/logs

---

# Testing Requirements

## Unit Tests

Required Coverage

- Font loading
- SVG generation
- HarfBuzz shaping
- Canonical geometry creation

---

## Integration Tests

Required Coverage

Input
→ Text Shaping
→ Canonical Geometry
→ SVG Generation
→ Export

---

## Manual Tests

Validate against the Phase 1A subset of the golden test corpus.

Verify:

- Text shaping
- SVG quality
- LightBurn compatibility

---

# Acceptance Criteria

The phase is complete when:

- SVG generated successfully
- PNG generated successfully
- SVG imports into LightBurn
- Text shaping functions correctly
- Canonical geometry is created
- Tests pass
- Documentation updated
- Handoff document completed

---

# Documentation Updates Required

Update:

- /docs/architecture/README_ARCHITECTURE_OVERVIEW.md
- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/governance/PHASED_DELIVERY_PLAN.md

Create:

/docs/handoffs/phase-01-welded-text-generator-handoff.md

---

# Commit Message

Recommended:

feat: phase 1a core text generation

---

# Release Tag

Recommended:

v0.1.0

---

# Stop Condition

After completing Phase 1A:

STOP

Do not begin Phase 1B.

Wait for approval and QA review.

---

# End of Document
