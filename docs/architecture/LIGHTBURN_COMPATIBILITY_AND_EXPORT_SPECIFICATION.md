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

Phase 1A to Phase 1C

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

For Phase 1C also verify:

- Golden test corpus exported
- SVG imported into LightBurn
- Dimensions preserved after import
- Validation evidence documented

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
- DXF remains future evaluation only

---

# Keychain Layer Strategy (K2, 2026-11-09)

Keychain SVGs use SVG 1.1, physical mm units, a fitted viewBox and a 2 mm artboard margin per side. Finished dimensions include the ring; canvas dimensions include the margins and are therefore 4 mm larger on each axis. A 60 mm product occupies 60 mm of geometry on a 64 mm wide canvas.

| Style | Groups | Default colours | Files |
|---|---|---|---|
| Engraved | `CUT_BACKING`, `ENGRAVE_TEXT` | Black `#000000`, red `#FF0000` | One SVG |
| Layered | `CUT_BACKING`, `CUT_TEXT` | Black `#000000`, red `#FF0000` | One combined SVG or two aligned SVGs |

Separate files share identical canvas dimensions, viewBox and origin. The backing is a compound path with a real ring hole and optional letter counters. Unbuffered text keeps its original Q/C curves; explicit stroke buffering outputs the reinforced polygon silhouette. Files have a human-readable recipe comment and XML-escaped JSON in `<metadata id="ens-recipe">`. Preview-only hit targets are absent from production files.

Automated K2 validation checks XML, actual cut-contour dimensions, 5 mm hole extents at 30/60/90 mm product widths, colour/group separation and file alignment. Manual LightBurn import, colour-to-layer mapping and manufacturing checks are pending K5; no new LightBurn sign-off is claimed here. See `docs/qa/KEYCHAIN_QA_MATRIX.md`.

# End of Document
