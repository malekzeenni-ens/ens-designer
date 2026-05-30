# WELDING_AND_BRIDGING_ENGINE_DESIGN.md

## Document Information

Version: 1.1
Status: Draft
Document Type: Engine Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the Connectivity Resolution Engine.

The previous working name, Welding and Bridging Engine, is retained in the filename for repository continuity, but it is not the preferred architectural term.

The product is not primarily a bridge generation engine. Its purpose is to produce laser-cuttable text and designs where all required elements become a single connected structure whenever appropriate, using the least invasive valid strategy.

---

# Terminology Decision

Approved term:

Connectivity Resolution Engine

Reason:

This term accurately covers analysis, natural connectivity preservation, intelligent letter compression, geometry union, structural bridge fallback, and validation.

Terms to avoid as primary architecture labels:

- Welding Engine
- Bridge Engine
- Bridge Generation Engine

These may still describe internal operations, but they must not imply that welding or bridges are always required.

---

# Objectives

1. Preserve naturally connected fonts without modification.
2. Connect disconnected fonts through intelligent spacing and tracking compression before adding bridges.
3. Use structural bridges only when natural connectivity and compression fail.
4. Preserve visual quality.
5. Minimise manual editing.
6. Produce production-ready SVG geometry for LightBurn workflows.

---

# Processing Workflow

```text
Font Geometry
-> Connectivity Analysis
-> Natural Connectivity
-> Intelligent Letter Compression
-> Geometry Union
-> Structural Bridge Fallback
-> Structural Validation
-> Connected Output
```

---

# Connectivity Strategy Priority

## Level 1 - Natural Connectivity

Use when the selected font is already connected.

Examples:

- Pacifico
- Peanut Butter
- Many script fonts

Action:

- Preserve the original font geometry.
- Do not add bridges.
- Do not compress letters.
- Do not adjust tracking.

Expected result:

The design remains visually faithful and structurally connected.

---

## Level 2 - Intelligent Letter Compression

Use when the selected font is disconnected but can become connected by reducing spacing.

Examples:

- Anton
- Oswald
- Many block fonts

Action:

- Reduce tracking.
- Move adjacent letters closer together.
- Create controlled overlap where visually acceptable.
- Union overlapping geometry.
- Recalculate connected components.

Expected result:

The text becomes one connected structure without artificial bridge geometry.

---

## Level 3 - Structural Bridges

Use only when Levels 1 and 2 fail.

Examples:

- Lobster leading character requiring support
- Happy Birthday layouts
- Multi-word layouts
- Multi-line layouts
- Decorative compositions

Action:

- Add structural bridges at the least intrusive valid locations.
- Validate bridge width against the selected material.
- Surface warnings when bridge placement is low confidence.

Expected result:

The output is connected, or the user receives a clear warning that manual review is required.

---

# Core Responsibilities

## Connectivity Analysis

Determine whether the design is:

- Already connected
- Connected through natural overlap
- Nearly connectable through compression
- Disconnected and requiring bridge fallback
- Not safely resolvable automatically

---

## Letter Compression

Adjust spacing when movement creates a natural connection.

Priority:

High

Reason:

Compression preserves the intended product appearance better than artificial bridges for many block and sans-serif fonts.

---

## Geometry Union

When overlap exists:

- Union geometry
- Remove duplicate paths where practical
- Clean intersections
- Recalculate connected components

Output:

Connected geometry without artificial bridges.

---

## Structural Bridge Fallback

When natural connectivity and compression are insufficient:

- Create structural bridges
- Minimise visual impact
- Maximise strength
- Avoid decorative focal points where possible

Bridges are fallback geometry, not the preferred solution.

---

## Manual Bridge Override

Manual bridge override remains a Phase 1C production hardening capability.

Users must eventually be able to:

- Add a bridge
- Remove a bridge
- Adjust a bridge

This must remain lightweight and must not become a CAD editor.

---

# Structural Rules

## Rule 1

Final geometry should form a single connected structure whenever the design type requires it.

---

## Rule 2

No floating letters should remain without a warning.

---

## Rule 3

No unsupported decorative elements should remain without a warning.

---

## Rule 4

Connections must satisfy the selected material's minimum connection and bridge constraints.

---

# Font Categories

## Already Connected Fonts

Priority:

Natural connectivity.

Examples:

- Pacifico
- Peanut Butter
- Script fonts

Expected Behaviour:

No compression and no bridges.

---

## Compression Required Fonts

Priority:

Intelligent letter compression.

Examples:

- Anton
- Oswald

Expected Behaviour:

Reduce spacing and union overlap before bridge fallback is considered.

---

## Bridge Required Designs

Priority:

Structural bridge fallback.

Examples:

- Lobster leading character example
- Happy Birthday
- Multi-word layouts
- Multi-line layouts

Expected Behaviour:

Use bridges only after analysis confirms that natural connectivity and compression cannot safely produce a connected structure.

---

# Validation Requirements

Check:

- Connected geometry
- Natural connectivity preserved
- Compression amount and visual tolerance
- Bridge width for fallback bridges
- Bridge count
- Weak regions
- Unsupported islands
- Material-specific minimum feature rules

---

# Phase Mapping

## Phase 1A

Core text generation only. No connectivity resolution.

---

## Phase 1B

Connectivity resolution and validation:

- Connectivity analysis
- Natural connectivity preservation
- Intelligent letter compression
- Geometry union
- Structural bridge fallback
- Material validation

---

## Phase 1C

Production hardening:

- Golden test corpus
- LightBurn validation evidence
- Manual bridge override
- Production presets

---

## Future AI Phases

AI-assisted structural optimisation may be evaluated later after deterministic connectivity resolution is proven.

---

# Performance Targets

Connectivity Analysis: <2 seconds

Letter Compression: <5 seconds

Geometry Union: <5 seconds

Bridge Fallback: <5 seconds

Validation: <5 seconds

---

# Acceptance Criteria

- Already connected fonts are preserved without modification.
- Disconnected fonts attempt compression before bridge fallback.
- Bridges are generated only when required.
- Geometry is valid.
- SVG exports successfully.
- LightBurn import is successful.
- Minimal manual repair is required.

---

# End of Document
