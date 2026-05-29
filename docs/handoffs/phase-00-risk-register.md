# phase-00-risk-register.md

## Risk Register

| ID | Risk | Category | Probability | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| P00-R001 | HarfBuzz Python integration may require additional binding/package validation. | Technical | Medium | Medium | Medium | Evaluate integration during Phase 1A planning before implementation. | Engineering | Open |
| P00-R002 | Canonical Geometry Model may be underspecified for implementation. | Architecture | Medium | Medium | Medium | Define minimum Phase 1A geometry contract before coding. | Architecture | Open |
| P00-R003 | LightBurn import behaviour remains unproven until generated SVG fixtures exist. | Manufacturing | Medium | High | High | Validate with exported Phase 1A/1B fixtures and formalise evidence in Phase 1C. | QA | Open |
| P00-R004 | Phase filenames retained for continuity may confuse future agents. | Documentation | Medium | Low | Low | Use PHASE_INDEX.md as source of truth. | Documentation | Mitigated |
| P00-R005 | Scope creep could pull welding, bridges, or material validation into Phase 1A. | Delivery | Medium | High | High | Enforce Phase 1A scope and ADR-005 guardrails. | Product | Open |
| P00-R006 | Geometry libraries may behave differently on complex glyph outlines. | Technical | Medium | High | High | Use golden corpus and focused geometry tests during Phase 1B. | Engineering | Open |
| P00-R007 | SVG export may preserve validity but fail dimensional expectations in LightBurn. | Manufacturing | Medium | High | High | Use mm units, viewBox discipline, and LightBurn import validation. | QA | Open |
| P00-R008 | AI roadmap could distract from deterministic MVP. | Product | Low | Medium | Medium | Keep AI out of Phase 1A, 1B, and 1C. | Product | Mitigated |

---

# Risk Summary

No critical risks block Phase 1A planning.

High risks are implementation-validation risks, not architecture blockers.

