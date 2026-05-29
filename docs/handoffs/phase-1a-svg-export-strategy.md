# phase-1a-svg-export-strategy.md

## Purpose

Define the Phase 1A SVG export approach.

SVG is the primary export format under ADR-003.

---

# SVG Export Principles

- Export from Canonical Geometry Model only.
- Use millimetres as default units.
- Preserve dimensions.
- Preserve shaped text outline fidelity.
- Keep output simple and LightBurn-friendly.
- Avoid unsupported or unnecessary SVG features.

---

# SVG Structure

Minimum Phase 1A SVG structure:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="42mm" viewBox="0 0 120 42">
  <g id="design">
    <path d="..." fill="black" />
  </g>
</svg>
```

---

# Export Rules

- Include `xmlns`.
- Include `width` and `height` in mm.
- Include `viewBox`.
- Convert canonical paths into SVG path `d` commands.
- Use simple fill paths.
- Avoid filters, scripts, animation, external references, embedded rasters, and unsupported attributes.
- Do not include LightBurn layer settings in Phase 1A.

---

# Out Of Scope

- Cut/score/engrave layers
- Material metadata
- DXF export
- LightBurn project export
- Welding or bridge paths
- Structural validation annotations

---

# Acceptance Criteria

- SVG opens in a browser.
- SVG imports into LightBurn.
- SVG dimensions remain stable.
- SVG visually matches preview.
- SVG is generated from Canonical Geometry Model.

