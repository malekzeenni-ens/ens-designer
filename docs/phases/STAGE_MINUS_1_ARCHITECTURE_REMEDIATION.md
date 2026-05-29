# STAGE_MINUS_1_ARCHITECTURE_REMEDIATION.md

## Stage Information

Stage: -1

Name: Architecture Remediation

Status: Mandatory Before Phase 00

Target Outcome: Architecture Approved For Development

---

# Purpose

This stage exists to apply the approved findings from the independent Architecture & Product Challenge Review.

No engineering development may begin until this stage has been completed.

This stage is documentation-only.

No application code should be written.

No prototypes should be developed.

No frontend or backend implementation should begin.

---

# Background

An independent architecture review was performed before development.

The review concluded:

**Decision: YES WITH CONDITIONS**

The business problem is valid.

The product vision is valid.

The roadmap is directionally correct.

However, several architectural gaps and roadmap adjustments must be addressed before Phase 00 and before any engineering effort begins.

---

# Objective

Apply the approved architectural recommendations while keeping the solution:

* Simple
* Maintainable
* Realistic for a solo-founder project
* Compatible with Claude Code and Codex development workflows
* Focused on Etch 'N' Shine business needs

Avoid enterprise-level complexity that does not provide meaningful business value.

The goal is not perfection.

The goal is a practical, production-ready architecture.

---

# Business Constraints

The following business decisions have been approved and must be reflected in the updated documentation.

## Approved

* Local-first application
* Single-user workflow
* One design generated at a time
* Primary output is SVG
* LightBurn is the primary production software
* Manufacturing focus:

  * 3mm Cast Acrylic
  * 3mm Mirror Acrylic
  * 3mm Plywood

---

## Explicitly Rejected

Do not introduce:

* SaaS architecture
* Multi-user architecture
* Team collaboration
* Cloud sync
* Marketplace functionality
* Enterprise workflow complexity
* Batch generation in MVP
* Manufacturing simulation
* Physics engines
* Advanced AI features before roadmap phases

---

# Approved Architecture Changes

## Change 1

Introduce HarfBuzz into the text processing pipeline.

Reason:

FontTools alone is insufficient for proper text shaping.

The architecture must support:

* Kerning
* Ligatures
* Accented characters
* Unicode handling

Updated pipeline:

Text
→ Unicode Normalisation
→ HarfBuzz
→ Font Outline Extraction
→ Geometry Engine
→ Welding Engine
→ Validation Engine
→ Export Engine

---

## Change 2

Introduce a Canonical Geometry Model.

Reason:

The system should not operate directly on SVG files.

The system should generate internal geometry objects first and export later.

Supported outputs:

* SVG
* PNG

Future:

* DXF

---

## Change 3

Move Material Validation Earlier.

Material validation is required before production use.

Material validation should be introduced in Phase 1B.

Initial supported materials only:

* 3mm Cast Acrylic
* 3mm Mirror Acrylic
* 3mm Plywood

No additional material complexity should be added.

---

## Change 4

Introduce LightBurn Validation Requirements.

Every release must validate generated SVG files through a documented LightBurn import process.

The application exists to support LightBurn workflows.

---

## Change 5

Introduce Golden Test Corpus.

Create a standard validation dataset including:

Fonts:

* Script
* Serif
* Sans
* Decorative

Names:

* Oliver
* Amelia
* Muhammad
* O'Connor
* Léa

Materials:

* 3mm Cast Acrylic
* 3mm Mirror Acrylic
* 3mm Plywood

This corpus becomes the standard validation benchmark.

---

## Change 6

Introduce Manual Bridge Override.

Bridge generation should remain automatic.

However, users must be able to:

* Add bridge
* Remove bridge
* Adjust bridge

This feature should remain lightweight.

Do not build a complex CAD editor.

---

# Approved Roadmap Changes

Replace the existing Phase 1 structure.

---

## New Phase 1A

Core Text Generation

Scope:

* Text input
* Font selection
* Text shaping
* Outline generation
* SVG export
* PNG export

No welding.

No material validation.

No bridge generation.

---

## New Phase 1B

Welding & Validation

Scope:

* Welding engine
* Bridge generation
* Connectivity validation
* Material validation
* Geometry validation

Materials:

* 3mm Cast Acrylic
* 3mm Mirror Acrylic
* 3mm Plywood

---

## New Phase 1C

Production Hardening

Scope:

* Presets
* LightBurn validation
* Golden test corpus
* Manual bridge overrides
* Production workflow improvements

Presets:

* Name Sign
* Cake Topper
* Ornament
* Nursery Sign

---

## New Phase 2

Cake Topper Generator

---

## New Phase 3

SVG Import & Repair

Purpose:

Allow users to import existing SVG files and:

* Validate
* Repair
* Re-export

This phase moves ahead of Decorative Assets.

---

## New Phase 4

Decorative Asset Library

---

## New Phase 5

AI Graphic Generator

---

## New Phase 6

AI Design Studio

---

# Documents To Update

Update:

* BUSINESS_CONTEXT.md
* PRODUCT_VISION_AND_REQUIREMENTS.md
* PHASED_DELIVERY_PLAN.md
* TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
* TECHNICAL_SOLUTION_DESIGN.md
* DATA_MODEL_AND_API_DESIGN.md
* FONT_PROCESSING_AND_GEOMETRY_ENGINE_DESIGN.md
* WELDING_AND_BRIDGING_ENGINE_DESIGN.md
* MATERIAL_PROFILE_ENGINE_DESIGN.md
* LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md
* TESTING_AND_QA_STRATEGY.md
* PRODUCT_BACKLOG_AND_FUTURE_ENHANCEMENTS.md
* README_ARCHITECTURE_OVERVIEW.md

---

# ADRs To Create

Create:

## ADR-001-FONT-SHAPING.md

Decision:

Use HarfBuzz.

---

## ADR-002-GEOMETRY-KERNEL.md

Decision:

Introduce Canonical Geometry Model.

---

## ADR-003-EXPORT-FORMAT-STRATEGY.md

Decision:

SVG First.

DXF Later.

---

## ADR-004-MATERIAL-VALIDATION-STRATEGY.md

Decision:

Introduce Material Validation In Phase 1B.

---

# Validation Requirements

After documentation updates are complete:

Provide:

## Deliverable 1

List of documents updated.

---

## Deliverable 2

Summary of architecture changes.

---

## Deliverable 3

Summary of roadmap changes.

---

## Deliverable 4

List of ADRs created.

---

## Deliverable 5

Risks remaining.

---

# Critical Rules

Do NOT:

* Write application code
* Build prototypes
* Start frontend development
* Start backend development
* Start Phase 00
* Start Phase 1A

This stage is documentation remediation only.

---

# Completion Criteria

Stage -1 is complete when:

* All approved recommendations have been applied
* Documentation has been updated
* ADRs have been created
* Roadmap has been updated
* Architecture reflects approved decisions
* No code has been written

---

# Stop Condition

After completing Stage -1:

STOP.

Wait for approval.

Do not proceed to Phase 00.

Do not begin development.

Provide a full remediation summary and await further instructions.

# End of Document
