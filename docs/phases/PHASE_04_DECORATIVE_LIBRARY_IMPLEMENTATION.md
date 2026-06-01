# PHASE_04_DECORATIVE_LIBRARY_IMPLEMENTATION.md

## Phase Information

Phase: 02

Name: Cake Topper Generator

Target Release: v0.5.0

Status: Ready After Phase X / Cake Topper v0.4.1 Approval

Note: Filename retained for repository continuity. This document now represents approved Phase 02 scope.

---

# Objective

Extend the MVP platform to automatically create production-ready cake toppers from generated names and designs.

The cake topper engine must create structurally sound stake systems while preserving the aesthetics of the design.

Baseline entering this formal phase:

- The Cake Topper tab already generates multi-line outline SVGs.
- Per-line font, size, alignment, letter overlap, floating component offsets, and vertical gaps are implemented.
- Per-line manual canvas X/Y offsets are implemented.
- Preview drag-to-move persists movement through `manual_x_offset_mm` and `manual_y_offset_mm`.
- Formal Phase 02 should build stake geometry, structural validation, and production presets on top of that existing baseline rather than re-implementing line composition.

---

# Scope

## Included

- Single stake support
- Double stake support
- Adjustable stake length
- Adjustable stake width
- Automatic stake positioning
- Structural reinforcement
- Topper preview
- Preserve existing manual line X/Y offset and preview drag behavior
- SVG export
- PNG export
- Validation support

---

## Excluded

- Decorative asset library
- AI-generated artwork
- SVG import and repair
- DXF implementation
- Commercial templates marketplace

---

# Functional Requirements

## FR-201

User can select single stake or double stake mode.

---

## FR-202

User can configure stake dimensions.

---

## FR-203

System automatically positions stakes.

---

## FR-204

System merges stakes with canonical geometry.

---

## FR-205

System validates structural integrity.

---

# Acceptance Criteria

The phase is complete when:

- Stakes generated automatically
- Stakes positioned correctly
- Structural validation passes
- SVG exports correctly
- LightBurn import successful
- Tests pass
- Documentation updated
- Handoff completed

---

# Commit Message

Recommended:

feat: phase 02 cake topper generator

---

# Release Tag

Recommended:

v0.5.0

---

# Stop Condition

After completing Phase 02:

STOP

Do not begin Phase 03.

Wait for approval and QA review.

---

# End of Document
