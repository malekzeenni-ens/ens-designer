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

# Phase 1

## Welded Text Generator (MVP)

### Objectives

Create the first production-ready SVG generator.

### Features

- Name input
- Font selection
- SVG generation
- PNG generation
- Preview engine
- Automatic welding
- Basic bridge generation
- Structural validation

### Out of Scope

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
- Letters remain connected

### Success Metrics

| Metric | Target |
|----------|----------|
| Generation Time | <30 seconds |
| SVG Success Rate | >95% |
| Manual Editing | <20% |

---

# Phase 2

## Advanced Structural Intelligence

### Objectives

Improve production quality.

### Features

- Advanced bridge placement
- Connection scoring
- Structural scoring
- Geometry repair

### Deliverables

- Improved validation engine
- Improved bridge engine

### Acceptance Criteria

- Better handling of decorative fonts
- Reduced failed cuts

---

# Phase 3

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
