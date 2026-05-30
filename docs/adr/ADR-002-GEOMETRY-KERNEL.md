# ADR-002-GEOMETRY-KERNEL.md

## Status

Accepted

## Decision

Introduce a Canonical Geometry Model as the internal source of truth for generated designs.

## Context

The system must avoid treating SVG as the working geometry model. SVG is an export format. Connectivity analysis, intelligent compression, geometry union, structural bridge fallback, material validation, and production-readiness checks require consistent internal geometry objects before export.

## Approved Approach

The Canonical Geometry Model must represent:

- Design dimensions
- Paths and closed shapes
- Connectivity relationships
- Letter compression metadata
- Fallback bridge geometry
- Material validation metadata
- Export metadata

The model should be converted to SVG only at the export boundary.

## Consequences

- SVG export remains stable and replaceable.
- Future DXF evaluation remains possible without redesign.
- Validation operates on production geometry rather than serialized SVG text.
- Geometry libraries such as Shapely or PyClipper may be used behind the model, but they do not replace the model itself.

## Scope Guardrail

This decision does not require a complex CAD kernel, physics engine, manufacturing simulation engine, or enterprise-grade modelling platform.
