# TECHNICAL_SOLUTION_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Technical Solution Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document converts the approved business and product requirements into an implementable engineering solution.

The objective is to define how the application will be built, how components interact, and how future phases can be added without major redesign.

---

# Solution Overview

The AI SVG Generator is a local-first web application that transforms text and fonts into production-ready laser cutting files.

Primary outputs:

- SVG
- PNG

Primary goals:

- Accurate text shaping
- Canonical geometry generation
- Automatic text connectivity resolution
- Structural validation
- LightBurn compatibility
- Future AI extensibility

---

# Solution Architecture

Frontend
→ API Layer
→ Generation Engine
→ Validation Engine
→ Export Engine

---

# Frontend Responsibilities

Technology:

- React
- TypeScript
- Vite
- Tailwind

Responsibilities:

- User inputs
- Font selection
- Preview rendering
- Validation display
- Export controls

---

# Backend Responsibilities

Technology:

- Python

Responsibilities:

- Font processing
- SVG generation
- Geometry operations
- Validation
- Export management

---

# Core Modules

## Font Processing Module

Responsibilities:

- Load fonts
- Normalise Unicode text
- Shape text using HarfBuzz
- Parse shaped glyphs
- Create vector outlines

Suggested Libraries:

- fontTools
- freetype-py
- HarfBuzz

---

## Geometry Module

Responsibilities:

- Convert shaped glyph outlines into the Canonical Geometry Model
- Union operations
- Cleanup geometry

Suggested Libraries:

- shapely
- pyclipper

---

## Connectivity Resolution Module

Responsibilities:

- Connectivity analysis
- Natural connectivity preservation
- Intelligent tracking and spacing compression
- Overlap detection and geometry union
- Structural bridge fallback only when required

Outputs:

- Connected geometry

---

## Validation Module

Responsibilities:

- Connectivity validation
- Structural validation
- Production readiness scoring

Outputs:

- PASS
- WARNING
- FAIL

---

## Export Module

Responsibilities:

- SVG generation
- PNG generation
- Scaling accuracy

---

# Phase 1A Workflow

1. User enters text.
2. User selects font.
3. Text is normalised.
4. HarfBuzz shapes text.
5. Font outlines are extracted.
6. Canonical geometry is created.
7. Preview generated.
8. User exports SVG or PNG.

---

# Phase 1B Workflow

1. Canonical geometry is analysed.
2. Connectivity analysis determines whether the design is already connected.
3. Naturally connected designs are preserved without modification.
4. Disconnected designs attempt intelligent letter compression and overlap union.
5. Structural bridges are generated only if compression cannot resolve connectivity.
6. Material validation runs.
7. Validation results are returned.

---

# Phase 1C Workflow

1. Golden test corpus is executed.
2. LightBurn validation is documented.
3. Manual bridge override is available.
4. Production presets are available.

---

# Error Handling Strategy

Invalid Font
→ Display error
→ Prevent generation

Invalid Geometry
→ Attempt repair
→ Warn user

Export Failure
→ Log error
→ Retry export

---

# Logging Strategy

Capture:

- Requests
- Errors
- Validation failures
- Export failures

Location:

/logs

---

# Future Extension Points

Phase 2

- Cake topper engine

Phase 3

- SVG import and repair engine

Phase 4

- Decorative asset library

Phase 5

- AI artwork generation

Phase 6

- AI design studio

---

# Non-Functional Targets

SVG Generation: <30 seconds

Preview Render: <5 seconds

Export: <5 seconds

Validation: <10 seconds

---

# End of Document
