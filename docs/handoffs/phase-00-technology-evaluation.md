# phase-00-technology-evaluation.md

## Executive Summary

Technology Evaluation Result: PASS WITH CONDITIONS

The approved technology direction is suitable for Phase 1A planning.

No approved ADR decision needs to change.

---

# Sources Reviewed

Official or primary project documentation reviewed:

- HarfBuzz Manual: https://harfbuzz.github.io/
- fontTools Documentation: https://fonttools.readthedocs.io/en/stable/index.html
- Shapely Documentation: https://shapely.readthedocs.io/en/stable/
- pyclipper package information: https://pypi.org/project/pyclipper/

---

# Approved Technology Baseline

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

Assessment:

Suitable for local-first UI development.

## Backend

- Python

Assessment:

Suitable for font processing, geometry processing, export workflows, and local tooling.

## Text Shaping

- HarfBuzz

Assessment:

Required by ADR-001. Suitable for shaping Unicode text into positioned glyphs before outline extraction.

Condition:

Select and validate Python integration approach during Phase 1A planning.

## Font Processing

- FontTools
- FreeType/freetype-py

Assessment:

Suitable supporting tools for font metadata, font access, and outline extraction workflows.

## Geometry

- Canonical Geometry Model
- Shapely
- PyClipper

Assessment:

Canonical Geometry Model remains the architectural source of truth. Shapely and PyClipper remain implementation candidates behind that model.

Condition:

Validate behaviour against glyph-derived geometry during Phase 1B.

## Export

- SVG primary
- PNG supporting
- DXF future evaluation only

Assessment:

Aligned with ADR-003 and LightBurn-first workflow.

---

# Technology Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| TECH-001 | HarfBuzz binding/package selection may affect implementation complexity. | Medium | Validate in Phase 1A planning. |
| TECH-002 | Geometry libraries may require path normalisation before boolean operations. | High | Use Canonical Geometry Model and golden corpus. |
| TECH-003 | SVG export may require strict unit/viewBox rules for LightBurn import. | High | Validate with simple fixture exports. |
| TECH-004 | PNG export library not yet selected. | Medium | Select during Phase 1A planning without changing export strategy. |

---

# Decision

No technology architecture blocker prevents Phase 1A planning.

Proceed with the approved baseline.

