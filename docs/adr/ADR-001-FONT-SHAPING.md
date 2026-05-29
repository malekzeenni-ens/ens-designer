# ADR-001-FONT-SHAPING.md

## Status

Accepted

## Decision

Use HarfBuzz as the text shaping layer before font outline extraction.

## Context

The application must generate accurate text geometry for laser-ready SVG output. FontTools and FreeType are useful for font inspection and outline extraction, but they are not sufficient on their own for correct shaping of kerning, ligatures, accented characters, and Unicode text.

## Approved Approach

The text processing pipeline is:

Text input
-> Unicode normalisation
-> HarfBuzz shaping
-> Font outline extraction
-> Canonical Geometry Model
-> Welding and validation
-> Export

## Consequences

- Text layout is more reliable for real customer names.
- FontTools remains useful for font metadata and outline access.
- FreeType may remain useful for font loading and glyph outline handling.
- Phase 1A must include shaping validation before SVG export is considered complete.

## Scope Guardrail

This decision does not introduce advanced typography editing, complex desktop publishing features, or broad multilingual product scope.

