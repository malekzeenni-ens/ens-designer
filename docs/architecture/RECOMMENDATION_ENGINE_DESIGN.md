# RECOMMENDATION_ENGINE_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Engine Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the core design generation engine responsible for transforming user input into production-ready laser-cut SVG files.

The engine must prioritise:

- Structural integrity
- Manufacturing reliability
- Minimal manual editing
- Consistent outputs

---

# Engine Overview

The Recommendation Engine determines the optimal approach for generating a laser-ready design.

Input:

- Name
- Font
- User settings

Output:

- Connected geometry
- Validation results
- SVG export
- PNG export

---

# Processing Pipeline

## Step 1

Input Validation

Checks:

- Empty text
- Unsupported characters
- Invalid configuration

Output:

Validated request

---

## Step 2

Font Processing

Actions:

- Load font
- Parse glyphs
- Generate outlines

Output:

Raw vector geometry

---

## Step 3

Geometry Analysis

Actions:

- Detect disconnected letters
- Detect floating elements
- Detect weak regions

Output:

Geometry report

---

## Step 4

Connectivity Strategy Selection

The engine chooses the most suitable approach.

Priority Order:

1. Natural connectivity
2. Intelligent letter compression
3. Geometry union
4. Structural bridge fallback

---

## Step 5

Structural Enhancement

Actions:

- Reinforce weak areas
- Improve support regions
- Increase cut reliability

Output:

Enhanced geometry

---

## Step 6

Validation

Checks:

- Connectivity
- Minimum connection width
- Minimum fallback bridge width
- Minimum feature size
- Floating islands

Output:

Pass
Warning
Fail

---

## Step 7

Export Preparation

Actions:

- SVG optimisation
- Geometry cleanup
- Export packaging

Output:

Production-ready files

---

# Decision Logic

## Strategy 1

Natural Connectivity

Used When:

Letters or decorative elements are already connected.

Priority:

Highest

Reason:

Best visual result and no unnecessary modification.

---

## Strategy 2

Intelligent Letter Compression

Used When:

Minor spacing adjustments create connectivity.

Priority:

High

Reason:

Minimal geometry modification and preferred over bridges.

---

## Strategy 3

Geometry Union

Used When:

Compression or natural overlap creates intersecting geometry that should become one connected structure.

Priority:

Medium

Reason:

Preserves aesthetics while resolving overlapping shapes into production geometry.

---

## Strategy 4

Structural Bridge Fallback

Used When:

Natural connectivity, compression, and geometry union cannot produce a reliable connection.

Priority:

Fallback

Reason:

Provides a last-resort connection strategy while surfacing warnings when confidence is low.

---

# Structural Rules

## Rule 1

Every design must form a single connected structure.

---

## Rule 2

No unsupported islands permitted.

---

## Rule 3

Weak connections must be reinforced.

---

## Rule 4

Visual quality should be preserved whenever possible.

---

# Validation Scoring

## Connectivity Score

Measures:

Connected geometry quality

Range:

0-100

---

## Structural Score

Measures:

Physical durability

Range:

0-100

---

## Production Score

Measures:

Overall manufacturing readiness

Range:

0-100

---

# Future AI Enhancements

## Phase 5

AI-generated graphics

---

## Phase 6

Full AI design generation

---

## Future Evaluation

AI structural optimisation may be evaluated after deterministic welding, validation, and production hardening are complete.

---

# Success Criteria

- Connected output generated
- SVG remains editable
- LightBurn compatible
- Structural validation passes
- Minimal manual repair required

---

# End of Document
