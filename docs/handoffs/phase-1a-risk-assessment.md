# phase-1a-risk-assessment.md

## Risk Assessment

| ID | Risk | Probability | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| P1A-R001 | uharfbuzz installation or runtime issue on Windows | Medium | High | High | Validate dependency before implementing the shaping pipeline. |
| P1A-R002 | HarfBuzz glyph IDs do not map cleanly to fontTools outline extraction | Medium | High | High | Create a small font fixture and validate glyph mapping before UI work. |
| P1A-R003 | Canonical Geometry Model becomes too complex in Phase 1A | Medium | Medium | Medium | Use the minimum model defined for Phase 1A only. |
| P1A-R004 | PNG export adds unexpected native dependencies | Medium | Medium | Medium | Validate CairoSVG locally before relying on it. |
| P1A-R005 | SVG imports into browser but scales incorrectly in LightBurn | Medium | High | High | Use mm units, viewBox, and manual LightBurn import checks. |
| P1A-R006 | Scope creep pulls welding or validation into Phase 1A | Medium | High | High | Enforce approved out-of-scope list and ADR-005. |
| P1A-R007 | Font fixture licensing blocks repository inclusion | Medium | Medium | Medium | Use open-license test fonts only. |
| P1A-R008 | Apostrophes or accented characters fail in selected fonts | Medium | Medium | Medium | Include O'Connor and Léa in required tests with clear font support errors. |

---

# Risk Decision

No critical risk blocks approval of the Phase 1A implementation plan.

High risks must be addressed before or during early implementation setup.

