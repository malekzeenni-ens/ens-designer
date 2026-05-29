# README_ARCHITECTURE_OVERVIEW.md

## Project

AI SVG Generator

Owner: Etch 'N' Shine

Version: 1.0

---

# Overview

AI SVG Generator is a local-first application designed to generate production-ready SVG and PNG files for laser cutting workflows.

The platform focuses on:

- Welded text generation
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

Welding & Validation

Capabilities:

- Automatic welding
- Automatic bridge generation
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
→ Welding Engine
→ Bridge Engine
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
