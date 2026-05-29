# LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Compatibility Specification
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the requirements necessary to ensure all generated SVG files import correctly into LightBurn and are suitable for production laser workflows.

---

# Objectives

1. Ensure 100% SVG import compatibility.
2. Preserve dimensions accurately.
3. Preserve connected geometry.
4. Prevent common LightBurn import issues.
5. Support future cut, score, and engrave workflows.

---

# Supported LightBurn Workflows

## Workflow 1

Generate SVG
→ Import into LightBurn
→ Assign Layer Settings
→ Cut

---

## Workflow 2

Generate SVG
→ Import into LightBurn
→ Resize
→ Cut

---

## Workflow 3

Generate SVG
→ Import into LightBurn
→ Add Additional Artwork
→ Cut

---

# SVG Requirements

## Requirement 1

Use millimetres as default unit.

---

## Requirement 2

Export valid SVG.

---

## Requirement 3

All paths must be closed where appropriate.

---

## Requirement 4

Avoid unsupported SVG features.

Examples:

- Filters
- Animations
- Scripts

---

# Geometry Requirements

## Connected Geometry

All welded designs must remain connected after import.

---

## Clean Geometry

No:

- Duplicate paths
- Self intersections
- Broken polygons

---

## Dimension Accuracy

Dimensions must remain accurate within 0.1mm.

---

# Layer Strategy (Future)

Phase 1

Single layer output.

---

Future

Support:

- Cut layer
- Score layer
- Engrave layer

---

# Validation Checklist

Before export verify:

- Geometry valid
- SVG valid
- Dimensions valid
- Paths optimised

---

# Known LightBurn Risks

## Risk 1

Unexpected scaling.

Mitigation:

Embed units correctly.

---

## Risk 2

Broken geometry.

Mitigation:

Run geometry validation.

---

## Risk 3

Disconnected lettering.

Mitigation:

Run connectivity validation.

---

# Acceptance Criteria

- SVG imports successfully into LightBurn
- Dimensions remain correct
- Geometry remains connected
- No manual repair required

---

# End of Document
