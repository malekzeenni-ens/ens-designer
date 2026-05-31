# PHASE_INDEX.md

## Purpose

This index maps current repository phase filenames to the approved architecture freeze roadmap.

Some filenames were retained for repository continuity after the Stage -1 architecture remediation. The "Represents" column is the source of truth for current phase meaning.

---

# Approved Phase Mapping

| Current File | Represents | Target Release | Status |
|---|---|---|---|
| STAGE_MINUS_1_ARCHITECTURE_REMEDIATION.md | Stage -1 - Architecture Remediation | Pre-Phase-00 | Complete |
| PHASE_00_REPOSITORY_AND_ARCHITECTURE_ASSESSMENT.md | Phase 00 - Repository & Architecture Assessment | Pre-Development | Complete |
| PHASE_01_WELDED_TEXT_GENERATOR_IMPLEMENTATION.md | Phase 1A - Core Text Generation | v0.1.0 | Complete |
| PHASE_02_ADVANCED_STRUCTURAL_INTELLIGENCE_IMPLEMENTATION.md | Phase 1B - Connectivity Resolution & Validation | v0.2.0 | Complete |
| PHASE_03_CAKE_TOPPER_GENERATOR_IMPLEMENTATION.md | Phase 1C - Production Hardening | v0.3.0 | Ready After Phase 1B Review |
| PHASE_X_OVERLAP_ENGINE_IMPLEMENTATION.md | Phase X - Overlap Engine | v0.4.0 | Approved For Planning — After Phase 1C |
| PHASE_04_DECORATIVE_LIBRARY_IMPLEMENTATION.md | Phase 02 - Cake Topper Generator | v0.5.0 | Ready After Phase X Approval |
| PHASE_05_AI_GRAPHIC_GENERATOR_IMPLEMENTATION.md | Phase 03 - SVG Import & Repair | v0.6.0 | Ready After Phase 02 Approval |
| PHASE_06_AI_DESIGN_STUDIO_IMPLEMENTATION.md | Phase 06 - AI Design Studio | v1.0.0 | Future Phase |

---

# Approved Roadmap

1. Stage -1 - Architecture Remediation
2. Phase 00 - Repository & Architecture Assessment
3. Phase 1A - Core Text Generation
4. Phase 1B - Connectivity Resolution & Validation
5. Phase 1C - Production Hardening
6. Phase X  - Overlap Engine
7. Phase 02 - Cake Topper Generator
8. Phase 03 - SVG Import & Repair
9. Phase 04 - Decorative Asset Library
10. Phase 05 - AI Graphic Generator
11. Phase 06 - AI Design Studio

---

# Architecture Freeze Rules

- SVG is the primary export format.
- DXF remains future evaluation only.
- HarfBuzz is approved for text shaping.
- Canonical Geometry Model is approved as the internal geometry source of truth.
- Material validation begins in Phase 1B.
- Golden Test Corpus is introduced in Phase 1C.
- Manual Bridge Override is introduced in Phase 1C.
- SVG Import & Repair is Phase 03.
- AI Graphic Generation is Phase 05.
- ADR-001 through ADR-005 are accepted decisions.

---

# Stop Rule

Do not start Phase 00, Phase 1A, or any implementation phase from this index alone.

Each phase must still follow the approved planning, review, testing, documentation, handoff, and approval workflow.
