# PRODUCT_VISION_AND_REQUIREMENTS.md

## Document Information

Version: 1.0
Status: Draft
Owner: Etch 'N' Shine
Project: AI SVG Generator

---

# Product Vision

Create the most efficient laser-design generation platform for personalised products, enabling production-ready SVG files in seconds rather than minutes.

The application should remove the need for repetitive vector editing while maintaining structural integrity for laser cutting.

---

# Product Goals

## Goal 1

Generate welded laser-ready text automatically.

## Goal 2

Reduce design preparation time by at least 70%.

## Goal 3

Minimise manual editing before importing into LightBurn.

## Goal 4

Create a foundation for future AI-generated artwork.

---

# Target Users

## Primary User

Laser Business Owner

Characteristics:

- Uses LightBurn
- Creates personalised products
- Requires fast turnaround
- Limited time for artwork preparation

## Secondary User

Production Operator

Characteristics:

- Runs the laser
- Requires reliable files
- Wants predictable results

## Tertiary User

Designer

Characteristics:

- Wants a starting point
- May perform further modifications

---

# User Problems

## Current Challenges

- Manual text welding
- Manual bridge creation
- Font compatibility issues
- Floating islands
- Weak connections
- Time-consuming vector cleanup
- Inconsistent outputs

---

# Phase 1 Product Scope

Phase 1 is split into Phase 1A, Phase 1B, and Phase 1C to keep the MVP achievable for a solo-founder project.

## Phase 1A Feature

Core Text Generation

### Inputs

- Name
- Font

### Outputs

- SVG
- PNG

### Functional Requirements

FR-001

User can enter any name.

FR-002

User can select a font.

FR-003

System normalises text and shapes it using HarfBuzz.

FR-004

System extracts font outlines and creates canonical geometry.

FR-005

System exports SVG.

FR-006

System exports PNG.

---

## Phase 1B Feature

Welding & Validation

FR-101

System generates connected lettering.

FR-102

System automatically adjusts spacing.

FR-103

System automatically creates bridges when required.

FR-104

System validates cutability.

FR-105

System applies material validation for 3mm Cast Acrylic, 3mm Mirror Acrylic, and 3mm Plywood.

---

## Phase 1C Feature

Production Hardening

FR-201

System previews generated design.

FR-202

System warns users of structural issues.

FR-203

System supports golden test corpus validation.

FR-204

User can add, remove, and adjust bridges.

---

# User Stories

## Story 1

As a laser business owner,

I want to enter a name and select a font,

So that I can immediately generate a laser-ready design.

### Acceptance Criteria

- Name entered successfully
- Font selected successfully
- Output generated in under 30 seconds

---

## Story 2

As a production operator,

I want all letters connected,

So that the design cuts as a single piece.

### Acceptance Criteria

- No disconnected letters
- No floating elements
- Structural validation passed

---

## Story 3

As a designer,

I want SVG export,

So that I can modify designs when required.

### Acceptance Criteria

- SVG imports successfully
- SVG remains editable

---

# Non-Functional Requirements

## Performance

NFR-001

Generation time under 30 seconds.

NFR-002

Preview generated under 5 seconds.

---

## Reliability

NFR-003

System must generate valid SVG files.

NFR-004

System must preserve font quality.

---

## Usability

NFR-005

No design expertise required.

NFR-006

User workflow should require minimal clicks.

---

## Compatibility

NFR-007

Support Windows.

NFR-008

Support LightBurn workflows.

NFR-009

Support XCS workflows.

---

# Assumptions

- User owns a laser cutter.
- User understands basic SVG workflows.
- User has access to fonts.
- User intends commercial production use.

---

# Risks

## Risk 1

Certain fonts may not weld correctly.

Mitigation:

Automatic bridge creation.

## Risk 2

Thin connections may fail during cutting.

Mitigation:

Structural validation engine.

## Risk 3

Complex script fonts may create geometry errors.

Mitigation:

Geometry repair workflow.

---

# Success Metrics

| Metric | Target |
|----------|----------|
| SVG Generation Time | <30 Seconds |
| First-Time Cut Success | >95% |
| Manual Editing Required | <20% |
| User Satisfaction | >90% |

---

# Future Requirements

## Phase 2

Cake Topper Generator

## Phase 3

SVG Import & Repair

## Phase 4

Decorative Library

## Phase 5

AI Graphic Generation

## Phase 6

AI Design Studio

---

# End of Document
