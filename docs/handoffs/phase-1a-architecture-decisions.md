# phase-1a-architecture-decisions.md

## Purpose

Record the Phase 1A planning position on architecture decisions.

No new architecture decisions are introduced by this plan.

---

# Approved Baseline

The following ADRs remain accepted and frozen:

- ADR-001-FONT-SHAPING.md
- ADR-002-GEOMETRY-KERNEL.md
- ADR-003-EXPORT-FORMAT-STRATEGY.md
- ADR-004-MATERIAL-VALIDATION-STRATEGY.md
- ADR-005-MVP-SCOPE-GUARDRAILS.md

---

# Phase 1A Application Of ADRs

## ADR-001

Phase 1A implements HarfBuzz text shaping.

## ADR-002

Phase 1A creates the minimum Canonical Geometry Model.

## ADR-003

Phase 1A exports SVG as primary output and PNG as supporting output.

## ADR-004

Phase 1A does not implement material validation.

## ADR-005

Phase 1A remains local-first, single-user, one design at a time, and out of cloud/batch/multi-user scope.

---

# Decision Status

No new ADR required before Phase 1A implementation.

If implementation discovers a critical blocker, stop and request architecture review before changing any approved decision.

