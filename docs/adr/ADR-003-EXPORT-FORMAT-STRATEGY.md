# ADR-003-EXPORT-FORMAT-STRATEGY.md

## Status

Accepted

## Decision

SVG remains the primary export format. PNG remains a preview/supporting export. DXF is reserved for future evaluation only.

## Context

Etch 'N' Shine primarily uses LightBurn, and SVG is the core production workflow format for the MVP. The architecture should avoid premature export complexity while keeping the design open to future DXF support.

## Approved Approach

Phase 1A supports:

- SVG export
- PNG export

Future evaluation may assess:

- DXF export
- LightBurn project export
- Multi-layer cut, score, and engrave workflows

## Consequences

- Phase 1 remains focused and achievable.
- SVG compatibility and dimensional accuracy receive priority.
- The Canonical Geometry Model protects the architecture from SVG-specific coupling.

## Scope Guardrail

Do not implement DXF during Phase 1A, Phase 1B, or Phase 1C unless a later approved decision changes the roadmap.

