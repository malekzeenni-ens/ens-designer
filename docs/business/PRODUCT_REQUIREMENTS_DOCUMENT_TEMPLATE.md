# PRODUCT_REQUIREMENTS_DOCUMENT_TEMPLATE.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Product Requirements Document (PRD)
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Product Overview

The AI SVG Generator is a local-first application designed to generate laser-ready SVG and PNG files for personalised products.

The primary objective is to eliminate repetitive vector editing tasks and automate the creation of structurally sound laser-cut designs.

---

# Product Vision

Enable users to generate production-ready laser cutting designs in seconds through a simple workflow while maintaining structural integrity and manufacturing reliability.

---

# Product Goals

## Goal 1

Generate welded text designs automatically.

## Goal 2

Minimise manual design work.

## Goal 3

Improve manufacturing consistency.

## Goal 4

Create a scalable foundation for future AI-powered design generation.

---

# User Personas

## Persona 1

### Small Business Owner

Examples:

- Laser engraving businesses
- Etsy sellers
- Personalisation businesses

Goals:

- Fast turnaround
- Consistent quality
- Reduced design effort

Pain Points:

- Manual welding
- Manual bridge creation
- Time-consuming artwork preparation

---

## Persona 2

### Production Operator

Goals:

- Reliable files
- Consistent outputs
- Fewer cutting failures

Pain Points:

- Weak structures
- Broken lettering
- Inconsistent designs

---

## Persona 3

### Designer

Goals:

- Editable SVG output
- High-quality vector files

Pain Points:

- Repetitive production work

---

# User Journey

## Phase 1A User Flow

Step 1

User enters name.

Step 2

User selects font.

Step 3

System normalises and shapes text using HarfBuzz.

Step 4

System creates canonical geometry.

Step 5

System generates preview.

Step 6

User exports SVG or PNG.

---

## Phase 1B User Flow

Step 1

System analyses canonical geometry.

Step 2

System welds and bridges geometry.

Step 3

System validates material suitability.

Step 4

System displays validation results.

---

## Phase 1C User Flow

Step 1

System validates against the golden test corpus.

Step 2

User may add, remove, or adjust bridges.

Step 3

User validates output in LightBurn.

---

# User Stories

## US-001

As a laser business owner,

I want to enter a name and select a font,

So that I can generate a laser-ready design automatically.

### Acceptance Criteria

- Name accepted
- Font selected
- Design generated

---

## US-002

As a production operator,

I want all lettering connected,

So that the design cuts as one piece.

### Acceptance Criteria

- No disconnected letters
- No floating geometry

---

## US-003

As a designer,

I want SVG export,

So that I can edit designs if needed.

### Acceptance Criteria

- SVG editable
- SVG imports correctly

---

# Functional Requirements

## Text Generation

FR-001

System accepts user-entered text.

FR-002

System loads available fonts.

FR-003

System converts text into vector geometry.

FR-004

System supports script fonts.

FR-005

System supports decorative fonts.

---

## Connectivity Resolution Engine

FR-006

System automatically welds letters.

FR-007

System automatically adjusts kerning.

FR-008

System creates bridges only when natural connectivity and compression fail.

FR-009

System validates connected geometry.

---

## Validation Engine

FR-010

System checks disconnected geometry.

FR-011

System checks structural integrity.

FR-012

System checks bridge adequacy.

FR-013

System warns users of issues.

---

## Export Engine

FR-014

System exports SVG.

FR-015

System exports PNG.

FR-016

System preserves geometry accuracy.

---

## Preview Engine

FR-017

System displays preview.

FR-018

System updates preview after generation.

---

# Non-Functional Requirements

## Performance

NFR-001

Generation time less than 30 seconds.

NFR-002

Preview generation less than 5 seconds.

---

## Reliability

NFR-003

Generated SVG files must be valid.

NFR-004

Geometry must remain intact.

---

## Compatibility

NFR-005

Windows support.

NFR-006

LightBurn compatibility.

NFR-007

XCS compatibility.

---

## Usability

NFR-008

Minimal training required.

NFR-009

Simple workflow.

---

# Future Requirements

## Phase 2

Cake Topper Generator

## Phase 3

SVG Import & Repair

## Phase 4

Decorative Library

## Phase 5

AI Graphic Generator

## Phase 6

AI Design Studio

---

# Risks

- Unsupported fonts
- Invalid vector geometry
- Structural weaknesses
- Future AI complexity

---

# Success Criteria

| Requirement | Success Target |
|-------------|----------------|
| Generation Time | <30 Seconds |
| Cut Success Rate | >95% |
| SVG Accuracy | >99% |
| Manual Editing | <20% |

---

# End of Document
