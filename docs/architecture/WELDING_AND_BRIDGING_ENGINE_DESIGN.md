# WELDING_AND_BRIDGING_ENGINE_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Engine Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the Welding and Bridging Engine responsible for transforming disconnected text into a single production-ready structure suitable for laser cutting.

The engine is one of the most critical components of the platform because it determines whether a generated design can physically survive cutting and handling.

---

# Objectives

1. Connect letters into a single structure.
2. Preserve visual quality.
3. Minimise manual editing.
4. Automatically repair disconnected geometry.
5. Support script, serif, and decorative fonts.
6. Produce production-ready SVG geometry.

---

# Processing Workflow

Font Geometry
→ Overlap Analysis
→ Kerning Optimisation
→ Welding Analysis
→ Bridge Placement
→ Structural Validation
→ Geometry Output

---

# Core Responsibilities

## Letter Connectivity

Determine whether adjacent characters are:

- Already connected
- Overlapping
- Nearly connected
- Completely disconnected

---

## Kerning Optimisation

Adjust spacing when minor movement creates a natural connection.

Priority:

Highest

Reason:

Produces the most visually pleasing result.

---

## Welding Operations

When overlap exists:

- Union geometry
- Remove duplicate paths
- Clean intersections

Output:

Single connected structure

---

## Bridge Generation

When welding alone is insufficient:

- Create structural bridges
- Minimise visual impact
- Maximise strength

---

## Manual Bridge Override

Automatic bridge generation remains the default.

Users must also be able to:

- Add a bridge
- Remove a bridge
- Adjust a bridge

This must remain lightweight and must not become a CAD editor.

---

# Connection Strategy Priority

## Strategy 1

Natural Connection

Description:

Existing character overlap.

Preferred:

Yes

---

## Strategy 2

Kerning Adjustment

Description:

Move characters slightly.

Preferred:

Yes

---

## Strategy 3

Geometry Welding

Description:

Merge overlapping geometry.

Preferred:

Yes

---

## Strategy 4

Bridge Creation

Description:

Generate artificial connectors.

Preferred:

Fallback only

---

# Bridge Placement Rules

## Rule 1

Bridges should be visually unobtrusive.

---

## Rule 2

Bridges should maximise structural strength.

---

## Rule 3

Bridges should avoid decorative focal points.

---

## Rule 4

Bridges should be placed where they appear intentional.

---

# Structural Rules

## Rule 1

Final geometry must form a single connected structure.

---

## Rule 2

No floating letters permitted.

---

## Rule 3

No unsupported decorative elements permitted.

---

## Rule 4

Connections must survive normal handling.

---

# Font Categories

## Script Fonts

Priority:

Natural overlap.

Expected Behaviour:

Minimal bridging.

---

## Serif Fonts

Priority:

Kerning optimisation.

Expected Behaviour:

Moderate bridging.

---

## Decorative Fonts

Priority:

Structural stability.

Expected Behaviour:

More aggressive reinforcement may be required.

---

# Validation Requirements

Check:

- Connected geometry
- Bridge width
- Bridge count
- Weak regions
- Unsupported islands
- Material-specific minimum feature rules

---

# Future AI Enhancements

## Phase 1B

Welding, bridge generation, connectivity validation, and material validation.

---

## Phase 1C

Manual bridge override and production hardening.

---

## Future AI Phases

AI-assisted structural optimisation may be evaluated later.

---

# Performance Targets

Overlap Analysis: <2 seconds

Welding: <5 seconds

Bridge Placement: <5 seconds

Validation: <5 seconds

---

# Acceptance Criteria

- Letters connected
- Geometry valid
- SVG exports successfully
- LightBurn import successful
- Minimal manual repair required

---

# End of Document
