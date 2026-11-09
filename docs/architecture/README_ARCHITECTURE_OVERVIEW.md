# README_ARCHITECTURE_OVERVIEW.md

## Project

AI SVG Generator

Owner: Etch 'N' Shine

Version: 1.0

---

# Overview

Keychain workstream (2026-11-09): K0 supplies benchmarks and byte-for-byte Cake Topper SVG fixtures. K1 adds `font_cache.py` (bounded parsed fonts and raw glyph outlines), optional `loaded=` shaping/extraction used by Cake Topper, shared `ring_geometry.py` helpers, configurable history filenames and optional curve tolerance. Existing SVG geometry and UI are preserved. See [ADR-006](../adr/ADR-006-KEYCHAIN-ENGINE-AND-PERFORMANCE.md) and [the milestone plan](../phases/KEYCHAIN_DESIGNER_IMPLEMENTATION_PLAN.md).

K2 delivers the dedicated `KeychainService`, additive Pydantic models, validation, SVG/PNG assembly and isolated history store. `/api/keychain/{preview,export,history}` routes are registered before the frontend static mount. Raw glyph outlines are positioned once and flattened once; size iterations reuse that geometry. Physical offsets/transforms remain in final mm. A six-step guarded secant solve includes the ring; opposing translations can trigger a bounded preliminary minimum search. PNG fallback composites independent backing/text layers so text counters reveal the backing. Cake Topper runtime logic is unchanged by K2. The frontend Keychain feature module remains K3.

K5 adds `state/checkFixes.ts` (allowlisted production-check fix planning), `ExportConfirmDialog.tsx` (focus-trapped modal over an inert workspace) and additive response fields `KeychainCheck.fix_note` and ring `requested_center_x_mm/y_mm`. K3/K4 deliver `frontend/src/features/keychain/`: typed requests, pure design/timeline reducers, sequenced/cancelled preview requests, scoped controls/canvas, physical glyph editing, local 100-step undo/redo, Next name and history reload. React Activity preserves the workspace across tab changes. Shared FontPicker name samples/hover callbacks are optional; the existing Designer usage keeps its default behaviour. Exports use the K2 history-writing endpoint once. K5 remains the dedicated browser, accessibility, check-fix/highlight and LightBurn testing/hardening pass.

AI SVG Generator is a local-first application designed to generate production-ready SVG and PNG files for laser cutting workflows.

The platform focuses on:

- Connected text generation
- Structural validation
- Laser-ready output
- LightBurn compatibility
- Future AI-assisted design generation

The application is being delivered in phases to reduce risk and ensure production-quality results.

---

# Business Objective

Reduce the time required to create laser-cut-ready artwork from minutes to seconds while improving consistency and reducing production failures.

---

# Core Features

## Phase 1A

Core Text Generation

Inputs:

- Name
- Font

Outputs:

- SVG
- PNG

Capabilities:

- Unicode normalisation
- HarfBuzz text shaping
- Font outline extraction
- Canonical geometry creation
- Export-ready files

---

## Phase 1B

Connectivity Resolution & Validation

Capabilities:

- Natural connectivity detection
- Preservation of already connected script fonts
- Intelligent letter compression for disconnected fonts
- Structural bridge fallback only when required
- Connectivity validation
- Material validation for 3mm Cast Acrylic, 3mm Mirror Acrylic, and 3mm Plywood

---

## Phase 1C

Production Hardening

Capabilities:

- Golden test corpus
- LightBurn validation process
- Manual bridge override
- Production presets

---

## Phase X

Overlap Engine

Purpose:

Automate the manual XCS overlap workflow for block fonts (Anton, Oswald, Bebas, League Spartan). Provides a separate application tab that introduces controlled letter overlap without connectivity analysis, bridge generation, or structural validation.

Capabilities:

- Automatic inter-glyph gap measurement
- Controlled tracking reduction
- Overlap strength modes: Auto, Light, Medium, Strong, Custom
- SVG export with nonzero fill rule
- Counter hole preservation

---

## Future Phases

### Phase 2

Cake Topper Generator

### Phase 3

SVG Import & Repair

### Phase 4

Decorative Asset Library

### Phase 5

AI Graphic Generator

### Phase 6

AI Design Studio

---

# High-Level Architecture

User Input
→ Unicode Normalisation
→ HarfBuzz Text Shaping
→ Font Outline Extraction
→ Canonical Geometry Model
→ Connectivity Analysis
→ Natural Connectivity
→ Letter Compression
→ Structural Bridge Fallback
→ Validation Engine
→ Preview Engine
→ Export Engine

---

# Repository Structure

/docs
    /business
    /architecture
    /handoffs
    /phases

/frontend
/backend

/tests

/assets

/fonts

/exports

---

# Key Documentation

## Business

/docs/business/BUSINESS_CONTEXT.md

/docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md

/docs/business/DISCOVERY_WORKSHOP.md

---

## Product

/docs/business/BUSINESS_REQUIREMENTS_DOCUMENT_TEMPLATE.md

/docs/business/PRODUCT_REQUIREMENTS_DOCUMENT_TEMPLATE.md

/docs/business/FUNCTIONAL_SPECIFICATION_DOCUMENT_TEMPLATE.md

---

## Architecture

/docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md

/docs/architecture/RECOMMENDATION_ENGINE_DESIGN.md

/docs/architecture/UX_UI_SOLUTION_DESIGN.md

---

## Delivery

/docs/governance/PHASED_DELIVERY_PLAN.md

/docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md

/docs/governance/CODING_AGENT_MASTER_PROMPT.md

/docs/governance/TESTING_AND_QA_STRATEGY.md

---

# Recommended Technology Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

Backend

- Python

Geometry

- Shapely
- PyClipper

Fonts

- FontTools
- FreeType
- HarfBuzz

SVG

- svgwrite

Export Strategy

- SVG primary
- PNG supporting export
- DXF future evaluation only

---

# Engineering Principles

1. Production first.
2. SVG quality over speed.
3. Structural integrity over aesthetics.
4. Local-first architecture.
5. AI augmentation rather than AI dependency.
6. Maintainable codebase.
7. Modular design.

---

# Development Workflow

1. Review documentation.
2. Create implementation plan.
3. Obtain approval.
4. Implement phase.
5. Test phase.
6. Update documentation.
7. Update handoff.
8. Commit changes.
9. Tag release.

---

# Quality Standards

Every phase must include:

- Unit testing
- Integration testing
- Manual testing
- Documentation updates
- Handoff updates

---

# Release Philosophy

No phase is complete until:

- Code completed
- Tests passed
- Documentation updated
- Handoff completed
- Release prepared

---

# End of Document
