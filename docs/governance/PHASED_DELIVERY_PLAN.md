# PHASED_DELIVERY_PLAN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Phased Delivery Plan
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the phased delivery strategy for the AI SVG Generator.

The goal is to minimise risk, validate assumptions early, and ensure that every phase produces a working, testable outcome.

No phase should begin until the previous phase has been:

- Developed
- Tested
- Documented
- Approved

---

# Delivery Principles

## Principle 1

Deliver working software at the end of every phase.

---

## Principle 2

Maintain complete documentation.

---

## Principle 3

Avoid introducing AI complexity too early.

---

## Principle 4

Prioritise production-ready outputs.

---

# Phase 0

## Discovery & Architecture

### Objectives

- Complete discovery workshop
- Validate requirements
- Confirm technical architecture
- Confirm user workflows

### Deliverables

- BRD
- PRD
- FSD
- Architecture Documentation

### Success Criteria

- Scope approved
- Architecture approved
- Risks documented

---

# Phase 1A

## Core Text Generation

### Objectives

Create the first deterministic text-to-geometry and export foundation.

### Features

- Name input
- Font selection
- Unicode normalisation
- HarfBuzz text shaping
- Font outline extraction
- Canonical Geometry Model
- SVG generation
- PNG generation
- Preview engine

### Out of Scope

- Connectivity resolution
- Letter compression
- Structural bridge fallback
- Material validation
- Cake toppers
- AI generation
- Decorative libraries

### Deliverables

- Working application
- SVG export
- PNG export
- Documentation

### Acceptance Criteria

- User enters name
- User selects font
- SVG generated
- SVG imports into LightBurn
- Text shape and dimensions are preserved

### Success Metrics

| Metric | Target |
|----------|----------|
| Generation Time | <30 seconds |
| SVG Success Rate | >95% |
| Manual Editing | <20% |

---

# Phase 1B

## Connectivity Resolution & Validation

### Objectives

Create connected, manufacturable text geometry using the least invasive valid strategy.

### Features

- Connectivity analysis
- Natural connectivity preservation
- Intelligent letter compression
- Geometry union for overlaps
- Structural bridge fallback
- Connectivity validation
- Geometry validation
- Material validation
- Production readiness scoring

### Deliverables

- Connectivity Resolution Engine
- Validation engine
- Material profiles for 3mm Cast Acrylic, 3mm Mirror Acrylic, and 3mm Plywood

### Acceptance Criteria

- Naturally connected fonts remain unmodified
- Disconnected fonts attempt compression before bridge creation
- Bridges are created only when natural connectivity and compression fail
- Final output is connected or a clear warning is shown
- Material validation is applied
- SVG imports into LightBurn
- Validation reports generated

---

# Phase 1C

## Production Hardening

### Objectives

Harden the MVP for real Etch 'N' Shine production workflows.

### Features

- Golden test corpus
- LightBurn validation process
- Manual bridge override
- Production presets
- Production workflow improvements

### Deliverables

- Golden test corpus
- LightBurn validation evidence
- Manual bridge controls
- Presets for Name Sign, Cake Topper, Ornament, and Nursery Sign

### Acceptance Criteria

- Golden corpus passes
- LightBurn validation documented
- User can add, remove, and adjust bridges
- MVP workflow remains simple

---

# Phase X

## Overlap Engine

### Objectives

Automate the manual XCS overlap workflow for block fonts used in name sign production.

### Background

Users currently create overlapping text manually in XCS by reducing character spacing. This phase automates that workflow as a separate application tab, distinct from the Connectivity Engine.

### Features

- Text input
- Font selection
- Automatic inter-glyph gap measurement
- Controlled tracking reduction (overlap mode)
- Overlap strength selection: Auto, Light, Medium, Strong, Custom
- SVG export with nonzero fill rule
- PNG export
- Preview

### Out of Scope

- Bridges
- Weld groups
- Boolean union
- Connectivity analysis or scoring
- Structural scoring
- Material validation

### Delivered

- `overlap_engine.py` — per-pair bounding-box shift algorithm
- `POST /api/overlap` — accepts text, font, global mode, per-gap config overrides
- Overlap Engine frontend tab alongside Text Generator
- Global modes: Light (0.5mm) / Auto (1.0mm) / Medium (1.5mm) / Strong (2.5mm) / Custom
- Per-gap controls: independent toggle + individual mm per inter-glyph gap
- Letter labels from glyph character sequence (O→l, l→i, etc.)
- SVG with fill-rule="nonzero"
- 22 automated tests

### Acceptance Criteria Results

- Oliver / Anton: letters overlap, word readable — Passed
- Happy Birthday / Anton: visual overlap, no bridges — Passed
- Per-gap individual mm control — Passed (exceeds original plan)
- No connectivity or structural scores in response — Passed
- LightBurn import — Assumed working; formal confirmation pending

### Release Tag

v0.4.0 — Complete

---

# Phase 2

## Cake Topper Generator

### Objectives

Generate production-ready cake toppers.

### Features

- Single stake
- Double stake
- Stake sizing
- Automatic placement
- Structural validation

### Deliverables

- Cake topper module

### Acceptance Criteria

- Stakes generated correctly
- Structural integrity maintained

---

# Phase 3

## SVG Import & Repair

### Objectives

Allow users to validate, repair, and re-export existing SVG files.

### Features

- SVG import
- Geometry validation
- Repair workflow
- Re-export

### Deliverables

- SVG import and repair module

### Acceptance Criteria

- Existing SVG files can be validated
- Repairable issues are reported or fixed
- Re-exported SVG files remain LightBurn compatible

---

# Phase 4

## Decorative Library

### Objectives

Allow decorative enhancements.

### Features

- Hearts
- Stars
- Crowns
- Seasonal icons
- Decorative flourishes

### Deliverables

- Asset library
- Placement engine

### Acceptance Criteria

- Decorations attach correctly
- SVG remains valid

---

# Phase 5

## AI Graphic Generator

### Objectives

Generate artwork from prompts.

### Features

- Prompt input
- AI image generation
- Vectorisation
- Geometry cleanup
- Structural validation

### Workflow

Prompt
→ AI Image
→ Vector Conversion
→ Geometry Repair
→ Validation
→ Export

### Deliverables

- AI generation module

### Acceptance Criteria

- Prompt creates artwork
- Artwork becomes laser-ready SVG

---

# Phase 6

## AI Design Studio

### Objectives

Generate complete production-ready designs.

### Inputs

- Theme
- Occasion
- Material
- Recipient

### Outputs

- SVG
- PNG
- Production recommendations

### Deliverables

- Full design studio

### Acceptance Criteria

- Complete designs generated automatically

---

# Quality Gates

Every phase must include:

## Development

- Source code complete

## Testing

- Unit testing
- Integration testing
- Manual testing

## Documentation

Update:

- README
- Architecture docs
- Phase handoff docs
- Change logs

---

# Handoff Documentation Requirements

At completion of every phase:

Create:

/docs/handoffs/phase-x-handoff.md

Must include:

- Features completed
- Files modified
- Risks identified
- Open issues
- Future recommendations

---

# Release Strategy

Each phase must produce:

- Git commit
- Release tag
- Updated documentation

Suggested Tags

v0.1.0
v0.2.0
v0.3.0
v0.4.0
v0.5.0
v0.6.0
v0.7.0
v1.0.0

---

# Exit Criteria

Project considered complete when:

- AI Design Studio delivered
- Production-ready SVG generation achieved
- Documentation complete
- Acceptance criteria met

---

# End of Document
