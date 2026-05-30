# TESTING_AND_QA_STRATEGY.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Testing & QA Strategy
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the testing strategy for the AI SVG Generator to ensure all generated SVG files are reliable, structurally sound, and production-ready before release.

---

# QA Objectives

1. Ensure SVG files are valid.
2. Ensure generated designs are laser-cut ready.
3. Ensure all letters remain connected.
4. Minimise manual repair work.
5. Prevent regressions between releases.
6. Ensure compatibility with LightBurn.

---

# Testing Levels

## Level 1

Unit Testing

Purpose:

Validate individual modules in isolation.

Coverage:

- Font processing
- SVG generation
- Connectivity Resolution Engine
- Letter compression
- Structural bridge fallback
- Validation engine
- Export engine

Target Coverage:

Minimum 80%

---

## Level 2

Integration Testing

Purpose:

Validate interaction between modules.

Coverage:

- Input → Unicode Normalisation
- Unicode Normalisation → HarfBuzz Shaping
- HarfBuzz Shaping → Font Processing
- Font Processing → SVG Engine
- SVG Engine → Connectivity Resolution Engine
- Connectivity Resolution Engine → Validation Engine
- Validation Engine → Export Engine

---

## Level 3

End-to-End Testing

Purpose:

Validate complete user workflow.

Coverage:

User enters name
→ Selects font
→ Generates SVG
→ Exports SVG
→ Imports SVG into LightBurn

---

# Functional Test Cases

## FT-001

Generate Simple Name

Input:

Oliver

Expected:

Connected SVG generated.

---

## FT-002

Generate Script Font Name

Input:

Oliver

Font:

Script Font

Expected:

Letters connected.

---

## FT-002A

Already Connected Font

Input:

Oliver

Font:

Pacifico or Peanut Butter

Expected:

Natural connectivity is preserved without compression or bridges.

---

## FT-002B

Compression Required Font

Input:

Oliver

Font:

Anton or Oswald

Expected:

Letter compression is attempted before any bridge fallback.

---

## FT-002C

Bridge Required Layout

Input:

Happy Birthday

Font:

Lobster or equivalent decorative script

Expected:

Structural bridge fallback is used only if natural connectivity and compression fail.

---

## FT-003

Generate Long Name

Input:

MaximilianAlexander

Expected:

SVG generated successfully.

---

## FT-004

Single Character

Input:

A

Expected:

Valid SVG generated.

---

## FT-005

Special Characters

Input:

O'Connor

Expected:

Valid SVG generated.

---

# Validation Test Cases

## VT-001

Disconnected Geometry Detection

Expected:

Warning generated.

---

## VT-002

Weak Connection Or Fallback Bridge Detection

Expected:

Warning generated.

---

## VT-003

Floating Island Detection

Expected:

Failure generated.

---

## VT-004

Production Readiness Validation

Expected:

Pass score returned.

---

# Export Test Cases

## ET-001

SVG Export

Expected:

Valid SVG file.

---

## ET-002

PNG Export

Expected:

Valid PNG file.

---

## ET-003

LightBurn Import

Expected:

No geometry issues.

---

# Performance Testing

## PT-001

SVG Generation Time

Target:

<30 Seconds

---

## PT-002

Preview Render Time

Target:

<5 Seconds

---

## PT-003

Export Time

Target:

<5 Seconds

---

# Regression Testing

Required After:

- New features
- Bug fixes
- Refactoring
- Dependency upgrades

Mandatory Areas:

- SVG generation
- Connectivity Resolution Engine
- Validation engine
- Export engine

---

# Manual Testing Checklist

Before every release:

- Execute the golden test corpus
- Test multiple font categories
- Export SVG
- Import into LightBurn
- Verify connectivity
- Verify scaling
- Verify cut readiness

---

# Golden Test Corpus

The standard validation benchmark must include:

Fonts:

- Script
- Serif
- Sans
- Decorative

Names:

- Oliver
- Amelia
- Muhammad
- O'Connor
- Lea

Materials:

- 3mm Cast Acrylic
- 3mm Mirror Acrylic
- 3mm Plywood

The corpus must be used during Phase 1C and before production release.

---

# Acceptance Criteria

Release may proceed only if:

- All critical tests pass
- No blocking defects exist
- SVG imports correctly into LightBurn
- Documentation updated
- Handoff documentation updated

---

# Defect Severity

## Critical

Blocks SVG generation.

## High

Produces invalid SVG.

## Medium

Produces warning or repairable issue.

## Low

Cosmetic issue only.

---

# Release QA Checklist

- Unit tests passed
- Integration tests passed
- Manual testing completed
- Documentation updated
- Handoff updated
- Release notes created

---

# End of Document
