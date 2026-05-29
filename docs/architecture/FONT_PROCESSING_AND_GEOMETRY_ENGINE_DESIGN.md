# FONT_PROCESSING_AND_GEOMETRY_ENGINE_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Engine Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines how fonts are converted into production-ready vector geometry for laser cutting.

The engine is responsible for transforming text into reliable SVG paths while maintaining aesthetics and structural integrity.

---

# Objectives

1. Load commercial and system fonts.
2. Convert glyphs into vector paths.
3. Preserve font appearance.
4. Enable automatic welding.
5. Support future cake topper generation.
6. Produce geometry suitable for LightBurn.

---

# Processing Pipeline

User Input
→ Font Selection
→ Unicode Normalisation
→ HarfBuzz Text Shaping
→ Shaped Glyph Extraction
→ Canonical Geometry Generation
→ Geometry Cleanup
→ Welding Preparation
→ Validation
→ SVG Output

---

# Font Engine Responsibilities

## Font Loading

Support:

- TTF
- OTF

Future:

- User uploaded fonts
- Font collections

---

## Glyph Extraction

Extract:

- Curves
- Shapes
- Shaped glyph outlines

Requirements:

- Preserve fidelity
- Maintain scalability
- Preserve kerning, ligatures, accents, and Unicode shaping

---

## Path Conversion

Convert:

Shaped Glyphs → Canonical Geometry Model

Output:

- Polygons
- Bezier curves
- Internal geometry objects

---

# Geometry Engine Responsibilities

## Geometry Cleanup

Remove:

- Duplicate nodes
- Invalid paths
- Self intersections

---

## Geometry Normalisation

Ensure:

- Consistent winding
- Closed paths
- Valid polygons

---

## Geometry Analysis

Calculate:

- Bounding boxes
- Intersections
- Connectivity candidates

---

# Welding Preparation

Before welding:

- Analyse spacing
- Analyse overlap
- Detect disconnected letters

Output:

Geometry suitable for welding engine.

---

# Recommended Libraries

## Font Processing

- fontTools
- freetype-py
- HarfBuzz

## Geometry

- shapely
- pyclipper

## SVG

- svgwrite

## Export Strategy

SVG is the primary export format.

PNG is a supporting export format.

DXF remains future evaluation only.

---

# Error Handling

Invalid Font
→ Reject

Corrupt Glyph
→ Log & Warn

Invalid Geometry
→ Attempt Repair

---

# Performance Targets

Font Load: <2 seconds

Path Generation: <5 seconds

Geometry Cleanup: <5 seconds

---

# Future Enhancements

- Font upload support
- Font scoring
- Font suitability recommendations
- AI font recommendations

---

# End of Document
