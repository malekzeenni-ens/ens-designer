# phase-1a-png-export-strategy.md

## Purpose

Define the Phase 1A PNG export approach.

PNG is a supporting export format for preview, sharing, and visual inspection. SVG remains the production export format.

---

# Recommended Approach

Generate PNG from the exported SVG using CairoSVG.

Reason:

- Keeps SVG as the source of truth.
- Avoids maintaining a separate raster rendering pipeline.
- Supports local conversion.

---

# Export Rules

- SVG is generated first.
- PNG is generated from SVG.
- PNG should use transparent background unless a preview background is explicitly requested later.
- PNG dimensions should be derived from SVG dimensions and requested scale.
- PNG export failure must not invalidate SVG export.

---

# Out Of Scope

- Raster editing
- Image filters
- AI image generation
- Material previews
- Production cut simulation

---

# Acceptance Criteria

- PNG generated for every valid Phase 1A SVG.
- PNG visually matches SVG preview.
- PNG export is local.
- PNG generation error is reported clearly.

