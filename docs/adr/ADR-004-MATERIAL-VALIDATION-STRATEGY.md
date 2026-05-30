# ADR-004-MATERIAL-VALIDATION-STRATEGY.md

## Status

Accepted

## Decision

Introduce material validation in Phase 1B.

## Context

The application exists to produce laser-ready files, not just visually valid SVGs. Material-specific constraints affect connection width, fallback bridge width, minimum feature size, structural warnings, and production-readiness scoring.

## Approved Initial Materials

- 3mm Cast Acrylic
- 3mm Mirror Acrylic
- 3mm Plywood

## Approved Approach

Phase 1B must validate generated connected designs against the approved initial material profiles.

Validation must consider:

- Minimum connection width
- Minimum fallback bridge width
- Minimum feature size
- Recommended connection width
- Material-specific warnings

## Consequences

- Material awareness is available before production hardening.
- The system remains focused on Etch 'N' Shine's current manufacturing workflow.
- Additional materials remain out of MVP scope.

## Scope Guardrail

Do not introduce broad material databases, laser setting automation, manufacturing simulation, or physics-based strength modelling.
